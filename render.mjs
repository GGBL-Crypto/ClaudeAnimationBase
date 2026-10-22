// All operations share the same locked project/style and renderAt(t) contract.
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { startStudioServer } from './scripts/studio-server.mjs';
import { catalog, sourceSnapshot, assertSourceHash, parseArgs, number, interval, run, launchBrowser, closeBrowser, openPage, frameOf, verifyVideo } from './scripts/render-lib.mjs';

const HELP = `
node render.mjs --project=<id> --style=watercolor|cartoon|pixel|lowpoly-3d <operação>
  --storyboard                  folha dos tempos de revisão do projeto
  --sheet=0.5,2.5 --cols=3 --w=480
  --strip=1.9:2.7 --crop=600,340,400,300
  --stills=2.5,3.4               PNGs individuais
  --clip [--range=0:6]           MP4 verificado + quadros extraídos
  --frames [--workers=2]         JPEGs retomáveis e isolados por projeto/estilo
  --png                         sequência PNG sem perdas
  --encode                      codificar uma sequência já renderizada
  --frames-dir=out/pasta         diretório explícito de sequência
  --out=out/arquivo.mp4 --fps=24 --audio=assets/musica.mp3
  --loop=emotions|views          folhas originais da aquarela
  --chrome=caminho --soft-gl --gpu-angle=vulkan|gl-egl
  --resolution=720p|1080p        somente 3D; padrão 1080p
  --projection=perspective|orthographic --shadows=on|off  (3D)
  --crop-at=x,y,z,w,h            recorte XYZ; formato x,y,w,h preservado
A prévia funciona ao abrir studio.html. Sem --project, preserva a demo original.
`;
let browser, studio, activePage;
const jobStarted = performance.now(), timing = { initializationMs: 0, captureMs: 0, encodePipelineMs: 0, verificationMs: 0 }, reports = [];
async function main() {
  const startedAt = new Date().toISOString(), started = performance.now();
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !Object.keys(args).length) { console.log(HELP); return; }
  const allowed = new Set(['help','project','style','storyboard','sheet','strip','stills','clip','frames','png','encode','frames-dir','range','workers','fps','out','audio','loop','crop','crop-at','cols','w','chrome','soft-gl','gpu-angle','resolution','projection','shadows']);
  for (const key of Object.keys(args)) if (!allowed.has(key)) throw new Error('Opção desconhecida: --' + key);
  const operations = ['storyboard','sheet','strip','stills','clip','frames','png','encode'].filter(key => args[key] !== undefined);
  if (operations.length !== 1) throw new Error('Escolha exatamente uma operação. Use --help.');
  const mode = operations[0], project = catalog().resolveProject(args.project || 'demo', args.style);
  args.project = project.id; args.style = project.style;
  const style = catalog().styles[project.style];
  if (style.dimensions !== 3 && ['resolution','projection','shadows'].some(key => args[key] !== undefined)) throw new Error('Opções de resolução/projeção/sombras exigem motor 3D');
  const base = join('out', project.id, project.style, ...(args.loop ? [String(args.loop)] : []));
  const framesDir = args['frames-dir'] || (mode === 'png' && args.out ? args.out : join(base, 'frames'));
  const manifestPath = join(framesDir, 'manifest.json');
  let fps = number(args.fps ?? project.fps, 'fps', { min: 1, max: 120, integer: true });
  let info = { ...project, width: 1920, height: 1080 };
  const source = sourceSnapshot(), stamp = source.hash;

  async function videoOutput(out, encode, expected) {
    mkdirSync(dirname(out), { recursive: true });
    // Keep any prior final output intact if rendering, encoding or verification fails.
    const pending = out.replace(/\.mp4$/i, '') + '.partial-' + process.pid + '.mp4';
    const encodeStarted = performance.now(); await encode(pending); timing.encodePipelineMs = performance.now() - encodeStarted;
    if(activePage&&!activePage.isClosed())info.engine=await activePage.evaluate(()=>animationEngine.info());
    const reviewDir = out + '.review';
    const verifyStarted = performance.now();
    const report = await verifyVideo(pending, expected, reviewDir);
    timing.verificationMs = performance.now() - verifyStarted;
    assertSourceHash(stamp);
    renameSync(pending, out);
    report.file = resolve(out); report.project = project.id; report.style = project.style; report.sourceHash = stamp;
    report.sourceFiles = source.files;
    report.videoSha256 = createHash('sha256').update(readFileSync(out)).digest('hex');
    report.startedAt = startedAt; report.elapsedMs = Math.round(performance.now() - started);
    report.environment = { platform: process.platform, arch: process.arch, node: process.version, browser: browser ? await browser.version() : null, engine: info.engine || null };
    report.arguments = process.argv.slice(2);
    reports.push({ path: join(reviewDir, 'report.json'), report });
    writeFileSync(join(reviewDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('MP4 verificado: ' + out + ' (' + report.frames + ' quadros, ' + report.duration + ' s). Inspeção visual pendente: ' + join(reviewDir, 'decoded-sheet.png'));
  }
  function audioArgs(audio, start, duration) {
    if (!audio) return [];
    if (typeof audio !== 'string' || !existsSync(audio)) throw new Error('Arquivo de áudio não encontrado: ' + audio);
    return ['-ss', String(start), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-af', 'apad', '-t', String(duration), '-c:a', 'aac', '-b:a', '192k'];
  }
  const codec = ['-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart'];
  if (mode === 'encode') {
    if (!existsSync(manifestPath)) throw new Error('Sequência sem manifesto. Execute --frames ou --png primeiro.');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.sourceHash !== stamp || manifest.project.id !== project.id || manifest.project.style !== project.style || (manifest.loop || '') !== (args.loop || '')) throw new Error('Sequência de outra revisão/projeto/estilo/loop. Renderize em um novo --frames-dir.');
    if (args.fps !== undefined && fps !== manifest.fps) throw new Error('FPS diverge da sequência');
    fps = manifest.fps;
    const { count, extension, range, project: saved } = manifest;
    info = saved;
    for (const key of ['resolution','projection','shadows']) if (args[key] !== undefined && args[key] !== saved.engine?.settings?.[key]) throw new Error('Opção diverge da sequência: ' + key);
    const files = readdirSync(framesDir).filter(name => /^f\d+\.(jpg|png)$/.test(name));
    if (files.length !== count) throw new Error('Sequência incompleta ou com quadros excedentes');
    for (let i=0;i<count;i++) if (!existsSync(join(framesDir, filename(i,extension))) || statSync(join(framesDir, filename(i,extension))).size < 100) throw new Error('Quadro ausente ou vazio: ' + i);
    const audio = args.audio || saved.audio;
    await videoOutput(args.out || join(base,'video.mp4'), pending => run('ffmpeg', ['-y','-v','error','-xerror','-framerate',String(fps),'-i',join(framesDir,'f%05d.'+extension),...audioArgs(audio,range[0],count/fps),...codec,'-frames:v',String(count),pending]),
      { width: saved.width, height: saved.height, fps, frames: count, duration: count/fps });
    return;
  }
  const initStarted = performance.now();
  if (style.scripts.some(item => typeof item === 'object' && item.type === 'module')) { studio = await startStudioServer(); args.origin = studio.origin; }
  browser = await launchBrowser(args);
  const page = await openPage(browser,args);
  activePage = page;
  info = await page.evaluate(() => projectInfo());
  timing.initializationMs = performance.now() - initStarted;
  async function capture(page, t, type) { const started = performance.now(); const bytes = await frameOf(page, t, type); timing.captureMs += performance.now() - started; return bytes; }
  const duration = info.duration;
  number(duration, 'duração retornada pelo motor', { min: .001 });
  const range = interval(args.range ?? (typeof args.clip === 'string' ? args.clip : undefined), duration);
  const count = Math.round((range[1]-range[0])*fps);
  if (['clip','frames','png'].includes(mode) && count < 1) throw new Error('Intervalo menor que um quadro');
  const parseTimes = value => {
    const values = String(value).split(',').map(v=>number(v,'tempo',{max:duration}));
    if (!values.length) throw new Error('Nenhum tempo informado');
    return values;
  };
  if (['sheet','strip','storyboard'].includes(mode)) {
    const cols = number(args.cols ?? (mode==='strip'?6:3),'cols',{min:1,max:24,integer:true});
    const width = number(args.w ?? (mode==='strip'?320:480),'w',{min:16,max:3840,integer:true});
    let times;
    if(mode==='strip'){const [a,b]=interval(args.strip,duration);times=Array.from({length:Math.floor((b-a)*fps+1e-6)+1},(_,i)=>a+i/fps);}
    else times=mode==='storyboard' ? (args.loop ? [0,duration*.25,duration*.5,duration*.75] : project.reviewTimes || project.storyboard.flatMap(s=>[s.start+.05,(s.start+s.end)/2,s.end-.05])) : parseTimes(args.sheet);
    if(times.length*cols*width>5000000) throw new Error('Folha muito grande; divida em intervalos menores');
    let crop=null,at=null;
    if(args.crop){crop=String(args.crop).split(',').map(v=>number(v,'crop'));if(crop.length!==4||crop[2]<=0||crop[3]<=0)throw new Error('Use --crop=x,y,largura,altura');}
    if(args['crop-at']){
      at=String(args['crop-at']).split(',');
      if(![4,5].includes(at.length))throw new Error('Use --crop-at=x,y[,z],largura,altura');
    }
    if(crop&&at)throw new Error('Escolha crop ou crop-at');
    const sheet=await page.evaluate((ts,c,w,crop,at)=>renderSheet(ts,c,w,crop,at),times,cols,width,crop,at);
    if(page.renderErrors.length)throw new Error(page.renderErrors.join('\n'));
    const out=args.out||join(base,'storyboard.jpg');mkdirSync(dirname(out),{recursive:true});
    writeFileSync(out,Buffer.from(sheet.url.split(',')[1],'base64'));
    console.log(out+' · '+times.length+' quadros · ms/quadro: '+sheet.ms.join(' '));
  } else if(mode==='stills') {
    const out=args.out||join(base,'stills');mkdirSync(out,{recursive:true});
    for(const t of parseTimes(args.stills)){const file=join(out,'t'+t.toFixed(2).replace('.','_')+'.png');writeFileSync(file,await capture(page,t));console.log(file);}
  } else if(mode==='frames'||mode==='png') {
    const extension=mode==='png'?'png':'jpg';
    const workers=number(args.workers??(style.dimensions===3?1:2),'workers',{min:1,max:8,integer:true});
    const manifest={version:1,sourceHash:stamp,sourceFiles:source.files,project:info,loop:args.loop||'',fps,range,count,extension};
    if(existsSync(manifestPath)) {
      const saved=JSON.parse(readFileSync(manifestPath,'utf8'));
      // GPU strings can differ between workers; only configuration and provenance define the cache.
      const identity=m=>JSON.stringify([m.sourceHash,m.project.id,m.project.style,m.project.styleConfig,m.project.width,m.project.height,m.project.engine?.settings,m.project.engine?.device,m.loop,m.fps,m.range,m.count,m.extension]);
      if(identity(saved)!==identity(manifest))throw new Error('Cache incompatível. Escolha um novo --frames-dir.');
    } else if(existsSync(framesDir)&&readdirSync(framesDir).some(name=>/^f\d+\.(jpg|png)$/.test(name)))throw new Error('Quadros sem manifesto; escolha um novo --frames-dir.');
    mkdirSync(framesDir,{recursive:true});writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
    const todo=Array.from({length:count},(_,i)=>i).filter(i=>{const file=join(framesDir,filename(i,extension));return !existsSync(file)||statSync(file).size<100;});
    let next=0,done=0;console.log(todo.length+' quadros pendentes; '+workers+' workers');
    await page.close();
    await Promise.all(Array.from({length:workers},async()=>{
      const worker=await openPage(browser,args);
      try {while(next<todo.length){const i=todo[next++],file=join(framesDir,filename(i,extension));writeFileSync(file+'.tmp',await capture(worker,range[0]+i/fps,extension==='png'?'image/png':'image/jpeg'));renameSync(file+'.tmp',file);if(++done%24===0||done===todo.length)console.log('quadro '+done+'/'+todo.length);}}
      finally {await worker.close();}
    }));
    assertSourceHash(stamp);
    console.log('Sequência: '+framesDir);
  } else if(mode==='clip') {
    const audio=args.audio||info.audio;
    await videoOutput(args.out||join(base,'video.mp4'),async pending=>{
      const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-',...audioArgs(audio,range[0],count/fps),...codec,'-frames:v',String(count),pending],{windowsHide:true,stdio:['pipe','inherit','inherit']});
      const exited=new Promise((ok,bad)=>{ff.on('error',bad);ff.on('close',code=>code===0?ok():bad(new Error('FFmpeg terminou com código '+code)));});
      async function* frames(){for(let i=0;i<count;i++){yield await capture(page,range[0]+i/fps);if(i%24===0||i===count-1)console.log('quadro '+(i+1)+'/'+count);}}
      try {await Promise.all([pipeline(Readable.from(frames()),ff.stdin),exited]);}
      catch(error){ff.kill();throw error;}
    },{width:info.width,height:info.height,fps,frames:count,duration:count/fps});
  }
}
function filename(i,extension){return 'f'+String(i).padStart(5,'0')+'.'+extension;}
try {await main();} catch(error){console.error('Render falhou: '+error.message);process.exitCode=1;}
finally {
  const cleanupStarted=performance.now();
  const shutdown = await closeBrowser(browser);
  await studio?.close();
  timing.cleanupMs=performance.now()-cleanupStarted;timing.totalMs=performance.now()-jobStarted;
  for(const {path,report} of reports){report.environment.forcedBrowserShutdown=shutdown.forced;report.timing=Object.fromEntries(Object.entries(timing).map(([key,value])=>[key,Math.round(value)]));writeFileSync(path,JSON.stringify(report,null,2)+'\n');}
}
