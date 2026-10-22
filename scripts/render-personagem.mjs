import assert from 'node:assert/strict';import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {sourceSnapshot,run} from './render-lib.mjs';
const source=sourceSnapshot(),root=`out/personagem-pilot/revisions/${source.hash.slice(0,12)}`,mode=process.argv[2];
if(!['samples','final'].includes(mode))throw Error('Use samples or final');
for(const variant of mode==='samples'?['camera','surpresa']:['surpresa']){
 const dir=root+'/'+(mode==='samples'?'samples/'+variant:'final'),out=dir+'/video.mp4';if(existsSync(out))throw Error('Refusing to overwrite '+out);mkdirSync(dir,{recursive:true});
 const args=['render.mjs','--project=personagem-'+variant,'--clip','--fps=12','--out='+out,...(mode==='samples'?['--range=2.25:3.75']:[])];
 const log=await run(process.execPath,args,{capture:true});writeFileSync(dir+'/render.log',log);
 const report=JSON.parse(readFileSync(out+'.review/report.json'));assert.equal(report.width,1280);assert.equal(report.height,720);assert.equal(report.fps,12);assert.equal(report.frames,mode==='samples'?18:54);assert.equal(report.audio,false);assert.equal(report.sourceHash,source.hash);console.log('VERIFIED '+out);
}
assert.equal(sourceSnapshot().hash,source.hash);
