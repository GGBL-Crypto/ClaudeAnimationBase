// Validation harness only: no changes to engines, projects, assets or the render pipeline.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,cpSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {sourceSnapshot,catalog,run,launchBrowser,closeBrowser,openPage,frameOf} from './render-lib.mjs';
import {assetSnapshot} from './asset-catalog.mjs';
import {startStudioServer} from './studio-server.mjs';

const approved='out/asset-pilot/revisions/b2ed8e03fa7c',root=approved+'/1080p-24fps';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(p,value)=>writeFileSync(p,JSON.stringify(value,null,2)+'\n');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const variants=['p0','p1','p2'],backends=['hardware','swiftshader'];
const original=json(approved+'/completion.json'),source=sourceSnapshot();
assert.equal(source.hash,original.source.hash,'Approved production code changed');
const assets=assetSnapshot(catalog().resolveProject('quality-space-p2').assetRefs);
assert.equal(assets.hash,original.assetSnapshot.hash,'Approved assets changed');
const baselinePath=root+'/baseline.json';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const previousVideos={...original.previousVideosVerified,...Object.fromEntries(original.videos.map(v=>[v.file,v.videoSha256]))};
function preserve(){for(const [p,hash]of Object.entries(previousVideos))assert.equal(sha(readFileSync(p)),hash,'Previous MP4 changed: '+p);for(const [p,hash]of Object.entries({...assets.files,...original.qaFiles}))assert.equal(sha(readFileSync(p)),hash,'Approved asset/QA code changed: '+p);assert.deepEqual(sourceSnapshot(),source);}
function oldEvidence(){return Object.fromEntries(walk(approved).filter(p=>!p.startsWith(root+'/')).map(p=>[p,sha(readFileSync(p))]));}
async function baseline(){
 assert.ok(!existsSync(baselinePath),'Baseline already exists; do not overwrite');mkdirSync(root,{recursive:true});preserve();
 const production={...source.files,...assets.files};
 const existingQA=Object.fromEntries(readdirSync('scripts').filter(f=>f.endsWith('.mjs')&&f!=='validate-assets-1080.mjs').map(f=>['scripts/'+f,sha(readFileSync('scripts/'+f))]));
 const evidence720=oldEvidence();cpSync('out/assets-stage/regressions',root+'/baseline-regressions',{recursive:true});
 save(baselinePath,{at:new Date().toISOString(),source,assets,production,existingQA,previousVideos,evidence720,authorization:'User approved 720p/12 and explicitly authorized only 1080p/24 validation.',environment:{cpu:os.cpus()[0].model.trim(),threads:os.cpus().length,ramBytes:os.totalmem(),os:os.version(),node:process.version}});console.log('Baseline: '+Object.keys(previousVideos).length+' previous MP4s; production/assets and all 720p evidence pinned');
}
async function render(){
 assert.ok(existsSync(baselinePath));const path=root+'/benchmark.json',measurements=existsSync(path)?json(path).measurements:[];
 for(const backend of backends)for(const variant of variants){
  const dir=root+'/'+backend+'/'+variant,video=dir+'/video.mp4';mkdirSync(dir,{recursive:true});
  if(measurements.some(m=>m.backend===backend&&m.variant===variant)){assert.equal(json(video+'.review/report.json').videoSha256,sha(readFileSync(video)));console.log('Preserved existing measurement '+backend+' '+variant);continue;}
  assert.ok(!existsSync(video),'Refusing to overwrite video: '+video);preserve();
  const args=['render.mjs','--project=quality-space-'+variant,'--resolution=1080p','--fps=24','--clip','--out='+video,...(backend==='swiftshader'?['--soft-gl']:[])];
  const start=performance.now(),log=await run(process.execPath,args,{capture:true}),wallMs=Math.round(performance.now()-start);
  writeFileSync(dir+'/render.log',log);const report=json(video+'.review/report.json');
  assert.equal(report.sourceHash,source.hash);assert.equal(report.assetHash,variant==='p0'?null:assets.hash);
  for(const [k,v]of Object.entries({width:1920,height:1080,fps:24,frames:48,duration:2,audio:false,status:'decoded-and-verified'}))assert.equal(report[k],v,k);
  const old=json(approved+'/720p-12fps/'+backend+'/'+variant+'/video.mp4.review/report.json');
  assert.equal(report.environment.engine.settings.projection,old.environment.engine.settings.projection);assert.equal(report.environment.engine.settings.shadows,old.environment.engine.settings.shadows);
  measurements.push({backend,variant,video,wallMs,timing:report.timing,bytes:report.bytes,videoSha256:report.videoSha256,sourceHash:report.sourceHash,assetHash:report.assetHash,environment:report.environment});
  save(path,{source,assets,measurements});console.log(backend+' '+variant+': '+wallMs+' ms; '+report.frames+' frames verified');
 }
 preserve();
}
async function qa(){
 const server=await startStudioServer(),results=[];
 try{for(const backend of backends){const browser=await launchBrowser(backend==='swiftshader'?{'soft-gl':true}:{});
  try{for(const variant of variants){
   const dir=root+'/'+backend+'/'+variant+'/qa',frames=dir+'/frames';mkdirSync(frames,{recursive:true});
   assert.ok(!existsSync(dir+'/encoder-only.mp4'),'Do not overwrite an encoding measurement');
   const options={project:'quality-space-'+variant,resolution:'1080p',origin:server.origin};
   const page=await openPage(browser,options),initialMetrics=await page.metrics(),info=await page.evaluate(()=>projectInfo());
   assert.equal(info.width,1920);assert.equal(info.height,1080);assert.equal(info.duration,2);assert.equal(info.assets?.assetHash||null,variant==='p0'?null:assets.hash);
   assert.deepEqual(info.styleConfig,JSON.parse(JSON.stringify(catalog().resolveProject(options.project).styleConfig)));
   const samples=new Map(),captureStart=performance.now();
   for(let i=0;i<48;i++){const png=await frameOf(page,i/24);writeFileSync(frames+'/f'+String(i).padStart(5,'0')+'.png',png);if([0,24,47].includes(i))samples.set(i,png);}
   const captureWithDiskMs=Math.round(performance.now()-captureStart);
   for(const i of [47,0,24,0])assert.deepEqual(await frameOf(page,i/24),samples.get(i),'Out-of-order frame '+i);
   const worker=await openPage(browser,options);assert.deepEqual(await frameOf(worker,1),samples.get(24),'Worker mismatch');await worker.close();
   await page.evaluate(()=>renderAt(1,'image/png',1,{preview:true}));assert.deepEqual(await frameOf(page,1),samples.get(24),'Preview/final mismatch');
   const observations=await page.evaluate(()=>{
    const buffers=new Set(),materials=new Set(),lights=[];animationEngine.scene.traverse(o=>{if(o.geometry){for(const a of Object.values(o.geometry.attributes))buffers.add(a.array.buffer);if(o.geometry.index)buffers.add(o.geometry.index.array.buffer);}for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);if(o.isLight)lights.push({type:o.type,intensity:o.intensity,color:o.color.getHexString(),position:o.position.toArray(),shadowSize:o.shadow?o.shadow.mapSize.toArray():null});});
    const env=animationEngine.scene.environment;return {engine:animationEngine.info(),diagnostics:assetPilotDiagnostics,actor:{position:animationEngine.scene.getObjectByName('quality-vehicle').position.toArray(),rotation:animationEngine.scene.getObjectByName('quality-vehicle').rotation.toArray(),scale:animationEngine.scene.getObjectByName('quality-vehicle').scale.toArray()},materials:[...materials].map(m=>({type:m.type,color:m.color?.getHexString(),metalness:m.metalness,roughness:m.roughness})),imported:window.assetSession?[...assetSession.items.values()].map(i=>i.info):[],lights,geometryArrayBytes:[...buffers].reduce((n,b)=>n+b.byteLength,0),environment:env?{width:env.image.width,height:env.image.height,type:env.type,intensity:animationEngine.scene.environmentIntensity}:null};
   });
   assert.deepEqual(observations.diagnostics.camera,[3.8,2.9,4.8]);assert.equal(observations.diagnostics.normalizedMaxExtent,2.4);
   if(variant!=='p0'){assert.equal(observations.imported[0].materials.length,4);assert.ok(observations.imported[0].materials.every(m=>m.type==='MeshStandardMaterial'&&m.metalness===1&&m.roughness===1));}
   const finalMetrics=await page.metrics(),disposal=await page.evaluate(()=>{const watched=new Set();animationEngine.scene.traverse(o=>{if(o.geometry)watched.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])watched.add(m);});if(animationEngine.scene.environment)watched.add(animationEngine.scene.environment);const events=[...watched].map(r=>{const item={type:r.type||'geometry',count:0};r.addEventListener('dispose',()=>item.count++);return item;});disposeAnimation();disposeAnimation();return {events,engine:animationEngine.info(),assets:window.assetSession?.info()||null,sceneChildren:animationEngine.scene.children.length};});
   assert.ok(disposal.events.every(e=>e.count===1));assert.equal(disposal.engine.released.renderer,1);assert.equal(disposal.sceneChildren,0);if(disposal.engine.memory){assert.equal(disposal.engine.memory.geometries,0);assert.ok(disposal.engine.memory.textures<=1);}
   await assert.rejects(frameOf(page,1),/descartado/);await page.close();
   // Separate measurement: identical encoder settings, PNGs on disk, no WebGL or capture overlap.
   const encodingStart=performance.now();await run('ffmpeg',['-y','-v','error','-xerror','-framerate','24','-i',frames+'/f%05d.png','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-frames:v','48',dir+'/encoder-only.mp4'],{capture:true});const encoderOnlyMs=Math.round(performance.now()-encodingStart);
   const probe=JSON.parse(await run('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,nb_read_frames,avg_frame_rate,duration','-of','json',dir+'/encoder-only.mp4'],{capture:true}));assert.equal(Number(probe.streams[0].nb_read_frames),48);
   results.push({backend,variant,checks:{frames:48,outOfOrder:true,workersAgree:true,previewFinalEqual:true,materialsPreserved:true,disposeOnce:true},captureWithDiskMs,encoderOnlyMs,initialMetrics,finalMetrics,observations,disposal});save(root+'/qa.json',{sourceHash:source.hash,results});console.log('QA '+backend+' '+variant+': 48 frames, seek/workers/dispose; encoder-only '+encoderOnlyMs+' ms');
  }}finally{await closeBrowser(browser);}
 }}finally{await server.close();}preserve();
}
async function comparison(){
 const dir=root+'/comparison';mkdirSync(dir,{recursive:true});
 for(const backend of backends)for(const variant of variants){
  const base=root+'/'+backend+'/'+variant,video=base+'/video.mp4';mkdirSync(base+'/inspection',{recursive:true});
  for(const [name,i]of [['begin',0],['middle',24],['end',47]])await run('ffmpeg',['-y','-v','error','-i',video,'-vf',`select=eq(n\\,${i})`,'-frames:v','1','-update','1',base+'/inspection/'+name+'.png'],{capture:true});
  if(variant==='p2')await run('ffmpeg',['-y','-v','error','-i',video,'-vf','scale=480:-1:flags=neighbor,tile=8x6','-frames:v','1','-update','1',dir+'/'+backend+'-p2-all-48.png'],{capture:true});
 }
 const browser=await launchBrowser({});try{
  const page=await browser.newPage();
  async function sheet(path,rows,{w=640,h=360,crop=null}={}){
   const data=rows.map(row=>row.map(c=>({...c,url:'data:image/png;base64,'+readFileSync(c.file).toString('base64')})));
   const url=await page.evaluate(async({data,w,h,crop})=>{const canvas=document.createElement('canvas');canvas.width=data[0].length*w;canvas.height=data.length*(h+32);const ctx=canvas.getContext('2d');ctx.fillStyle='#141b24';ctx.fillRect(0,0,canvas.width,canvas.height);for(let y=0;y<data.length;y++)for(let x=0;x<data[y].length;x++){const c=data[y][x],im=new Image();im.src=c.url;await im.decode();if(crop)ctx.drawImage(im,...crop,x*w,y*(h+32)+32,w,h);else ctx.drawImage(im,x*w,y*(h+32)+32,w,h);ctx.fillStyle='white';ctx.font='17px sans-serif';ctx.fillText(c.label,x*w+12,y*(h+32)+23);}return canvas.toDataURL();},{data,w,h,crop});writeFileSync(path,Buffer.from(url.split(',')[1],'base64'));
  }
  for(const backend of backends){
   await sheet(dir+'/'+backend+'-p0-p1-p2.png',['begin','middle','end'].map((name,i)=>variants.map(v=>({file:root+'/'+backend+'/'+v+'/inspection/'+name+'.png',label:backend+' · '+v.toUpperCase()+' · frame '+[0,24,47][i]}))));
   await sheet(dir+'/'+backend+'-native-details.png',[variants.map(v=>({file:root+'/'+backend+'/'+v+'/inspection/middle.png',label:backend+' · '+v.toUpperCase()+' · native crop / frame 24'}))],{w:800,h:590,crop:[570,390,800,590]});
  }
  await sheet(dir+'/backends-middle.png',backends.map(backend=>variants.map(v=>({file:root+'/'+backend+'/'+v+'/inspection/middle.png',label:backend+' · '+v.toUpperCase()+' · 1.00 s'}))));
  const older=[];for(const backend of backends){const file=dir+'/'+backend+'-720-middle.png';await run('ffmpeg',['-y','-v','error','-i',approved+'/720p-12fps/'+backend+'/p2/video.mp4','-vf','select=eq(n\\,12)','-frames:v','1','-update','1',file],{capture:true});older.push([{file,label:backend+' · 720p/12 · 1.00 s'},{file:root+'/'+backend+'/p2/inspection/middle.png',label:backend+' · 1080p/24 · 1.00 s · same display size'}]);}
  await sheet(dir+'/720-vs-1080-p2.png',older,{w:960,h:540});
 }finally{await closeBrowser(browser);}console.log('MP4 comparisons: '+dir);preserve();
}
async function regressions(){
 const start=performance.now(),log=await run(process.execPath,['scripts/check-generalization-suite.mjs'],{capture:true});writeFileSync(root+'/regressions.log',log);cpSync('out/assets-stage/regressions',root+'/regressions',{recursive:true});const report=json(root+'/regressions/report.json');assert.equal(report.status,'passed');assert.equal(report.sourceHash,source.hash);console.log('Regressions '+report.results.length+' groups, '+Math.round(performance.now()-start)+' ms');preserve();
}
async function metrics(){
 const staticBackground=[],backendDifferences=[];
 for(const backend of backends)for(const variant of variants){
  const text=await run('ffmpeg',['-v','error','-i',root+'/'+backend+'/'+variant+'/video.mp4','-vf','crop=128:128:64:64,signalstats,metadata=print:file=-','-f','null','-'],{capture:true});
  const values=[...text.matchAll(/lavfi.signalstats.YAVG=([\d.]+)/g)].map(m=>Number(m[1]));assert.equal(values.length,48);
  staticBackground.push({backend,variant,roi:[64,64,128,128],frames:values.length,minMeanLuma:Math.min(...values),maxMeanLuma:Math.max(...values),rangeMeanLuma:Math.max(...values)-Math.min(...values),frameMeanLuma:values});
 }
 function rgb(file){const r=spawnSync('ffmpeg',['-v','error','-i',file,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{windowsHide:true,maxBuffer:16*1024*1024});assert.equal(r.status,0,r.stderr?.toString());assert.equal(r.stdout.length,1920*1080*3);return r.stdout;}
 for(const variant of variants)for(const frame of ['begin','middle','end']){
  const a=rgb(root+'/hardware/'+variant+'/inspection/'+frame+'.png'),b=rgb(root+'/swiftshader/'+variant+'/inspection/'+frame+'.png');let sum=0,max=0,changedPixels=0;
  for(let i=0;i<a.length;i+=3){let different=false;for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);sum+=d;max=Math.max(max,d);if(d)different=true;}if(different)changedPixels++;}
  backendDifferences.push({variant,frame,meanAbsoluteRGBDifference:sum/a.length,maxChannelDifference:max,differentPixels:changedPixels,pixelCount:a.length/3,percentDifferentPixels:changedPixels/(a.length/3)*100});
 }
 save(root+'/image-metrics.json',{method:'Decoded MP4 PNGs, RGB24 absolute differences at frames 0/24/47; fixed static background ROI luma across all 48 decoded frames. Metrics are local diagnostics, not perceptual scores or cross-GPU determinism guarantees.',staticBackground,backendDifferences});console.log(JSON.stringify({staticBackground:staticBackground.map(({frameMeanLuma,...r})=>r),backendDifferences},null,2));
}
async function finish(){
 preserve();const baseline=json(baselinePath);for(const [p,h]of Object.entries({...baseline.existingQA,...baseline.evidence720}))assert.equal(sha(readFileSync(p)),h,'Historical source/evidence changed: '+p);
 const renders=json(root+'/benchmark.json'),qaReport=json(root+'/qa.json'),reg=json(root+'/regressions/report.json');assert.equal(renders.measurements.length,6);assert.equal(qaReport.results.length,6);assert.equal(reg.status,'passed');
 const review=json(root+'/visual-review.json');assert.equal(review.status,'inspected');for(const file of review.openedFiles)assert.ok(readFileSync(file).length>1000);
 for(const m of renders.measurements){const p=m.video+'.review/report.json',report=json(p);assert.equal(sha(readFileSync(m.video)),report.videoSha256);assert.equal(report.sourceHash,source.hash);assert.equal(report.assetHash,m.variant==='p0'?null:assets.hash);report.visualReview='inspected-sampled-frames';report.visualEvidence=review.openedFiles.filter(f=>f.includes('/'+m.backend+'/')||f.includes('/comparison/'));report.visualNotes=review.notes;save(p,report);}
 const bench720=json(approved+'/benchmark.json');
 const comparisons=renders.measurements.map(m=>{const old=bench720.measurements.find(o=>o.backend===m.backend&&o.variant===m.variant),test=qaReport.results.find(o=>o.backend===m.backend&&o.variant===m.variant);return {backend:m.backend,variant:m.variant,wall720Ms:old.wallMs,wall1080Ms:m.wallMs,wallRatio:m.wallMs/old.wallMs,capture720Ms:old.timing.captureMs,capture1080Ms:m.timing.captureMs,captureRatio:m.timing.captureMs/old.timing.captureMs,encoderOnly1080Ms:test.encoderOnlyMs};});
 const qaFiles=Object.fromEntries(['scripts/validate-assets-1080.mjs',...readdirSync('tests').filter(f=>f.endsWith('.mjs')).map(f=>'tests/'+f)].map(p=>[p,sha(readFileSync(p))]));
 save(root+'/completion.json',{status:'1080p-24fps-six-videos-verified-and-inspected',at:new Date().toISOString(),source,assets,baseline:baselinePath,previousVideosVerified:previousVideos,evidence720Verified:Object.keys(baseline.evidence720).length,productionCodeUnchanged:true,qaFiles,measurements:renders.measurements,comparisons,qa:qaReport,regressions:reg,imageMetrics:json(root+'/image-metrics.json'),visualReview:review,environment:baseline.environment,nextPhase:'not-started; stop after this delivery'});console.log(JSON.stringify({status:'validated',sourceHash:source.hash,assetHash:assets.hash,videos:6,previousVideos:Object.keys(previousVideos).length,regressionGroups:reg.results.length,comparisons},null,2));
}
const mode=process.argv[2];if(process.argv.length!==3||!['--baseline','--render','--qa','--comparison','--metrics','--regressions','--finish'].includes(mode))throw Error('Use one validation phase: --baseline|--render|--qa|--comparison|--metrics|--regressions|--finish');
await ({'--baseline':baseline,'--render':render,'--qa':qa,'--comparison':comparison,'--metrics':metrics,'--regressions':regressions,'--finish':finish}[mode])();
