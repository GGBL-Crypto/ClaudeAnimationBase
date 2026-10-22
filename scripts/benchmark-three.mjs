// Sequential full movies. Invoke 720p, inspect it, then invoke 1080p.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, run, ROOT, sourceHash } from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),resolution=args.resolution;
if(!['720p','1080p'].includes(resolution)||Object.keys(args).some(k=>k!=='resolution'))throw new Error('Use --resolution=720p ou 1080p');
const stamp=sourceHash(),base=join('out','mars-discovery','revisions',stamp.slice(0,12),resolution),results=[];
for(const software of [false,true]) {
  const backend=software?'swiftshader':'hardware',out=join(base,backend,'video.mp4');
  if(existsSync(out))throw new Error('Render já existe; preserve a evidência: '+out);
  const cli=['--project=mars-discovery','--resolution='+resolution,'--clip','--out='+out,...(software?['--soft-gl']:[])];
  const started=performance.now();await run(process.execPath,[join(ROOT,'render.mjs'),...cli],{capture:true});
  const externalProcessMs=Math.round(performance.now()-started),path=out+'.review/report.json',report=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(report.sourceHash,stamp);assert.equal(report.frames,36);assert.equal(report.fps,12);assert.equal(report.duration,3);
  assert.equal(report.height,resolution==='720p'?720:1080);assert.equal(report.environment.engine.profile,'final');
  report.performance={externalProcessMs,scope:'Node child process start through exit, including browser/server cleanup; one job at a time',backend};
  writeFileSync(path,JSON.stringify(report,null,2)+'\n');
  results.push({backend,file:out,externalProcessMs,timing:report.timing,bytes:report.bytes,engine:report.environment.engine});
  console.log(backend+' '+resolution+': '+externalProcessMs+' ms (processo completo) · '+out);
}
mkdirSync(base,{recursive:true});writeFileSync(join(base,'performance.json'),JSON.stringify({sourceHash:stamp,at:new Date().toISOString(),resolution,results},null,2)+'\n');
