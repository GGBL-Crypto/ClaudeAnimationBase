import assert from 'node:assert/strict';import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {sourceSnapshot,run} from './render-lib.mjs';
const mode=process.argv[2];if(!['preview','final'].includes(mode))throw Error('Use preview or final');
const source=sourceSnapshot(),height=mode==='preview'?720:1080,fps=height===720?12:24,root=`out/watercolor-actor/revisions/${source.hash.slice(0,12)}`,results=[];
const backends=process.argv[3]?[process.argv[3]]:['hardware','swiftshader'];if(backends.some(b=>!['hardware','swiftshader'].includes(b)))throw Error('hardware or swiftshader');
for(const backend of backends)for(const variant of ['procedural','assets']){
 const dir=`${root}/${height}p/${backend}/${variant}`,out=dir+'/video.mp4';if(existsSync(out))throw Error('Refusing to overwrite '+out);mkdirSync(dir,{recursive:true});
 const args=['render.mjs',`--project=watercolor-actor-${variant}-${height}`,'--clip',`--fps=${fps}`,'--out='+out,...(backend==='swiftshader'?['--soft-gl']:[])],start=performance.now();
 const log=await run(process.execPath,args,{capture:true});writeFileSync(dir+'/render.log',log);const ms=performance.now()-start,report=JSON.parse(readFileSync(out+'.review/report.json'));
 assert.equal(report.sourceHash,source.hash);assert.equal(report.width,height*16/9);assert.equal(report.height,height);assert.equal(report.frames,2.5*fps);assert.equal(report.fps,fps);assert.equal(report.audio,false);
 results.push({backend,variant,out,totalMs:ms,report});writeFileSync(`${root}/${height}p/benchmark-${backends.join('-')}.json`,JSON.stringify({sourceHash:source.hash,results},null,2));console.log('VERIFIED '+height+' '+backend+' '+variant+' '+Math.round(ms)+'ms');
}
assert.equal(sourceSnapshot().hash,source.hash);
