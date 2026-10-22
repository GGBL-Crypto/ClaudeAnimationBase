import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {sourceSnapshot,run} from './render-lib.mjs';
const mode=process.argv[2];if(!['preview','final'].includes(mode))throw Error('Use preview or final');
const source=sourceSnapshot(),root='out/articulated/revisions/'+source.hash.slice(0,12),resolution=mode==='preview'?'720p':'1080p',results=[];
for(const backend of ['hardware','swiftshader'])for(const variant of ['a','b'])for(let repetition=1;repetition<=(mode==='final'?3:1);repetition++){
 const dir=root+'/'+resolution+'/'+backend+'/'+variant+(repetition===1?'':'-repeat-'+repetition),out=dir+'/video.mp4';if(existsSync(out))throw Error('Refusing to replace '+out);mkdirSync(dir,{recursive:true});
 const args=['render.mjs','--project=articulated-delivery-'+variant,'--resolution='+resolution,'--fps=24','--clip','--out='+out,...(backend==='swiftshader'?['--soft-gl']:[])],start=performance.now();
 const log=await run(process.execPath,args,{capture:true});writeFileSync(dir+'/render.log',log);const totalMs=performance.now()-start,report=JSON.parse(readFileSync(out+'.review/report.json'));
 assert.equal(report.sourceHash,source.hash);assert.equal(report.frames,192);assert.equal(report.fps,24);assert.equal(report.duration,8);assert.equal(report.width,resolution==='720p'?1280:1920);assert.equal(report.height,resolution==='720p'?720:1080);assert.equal(report.audio,false);
 results.push({backend,variant,repetition,out,totalMs,bytes:report.bytes,videoSha256:report.videoSha256,timing:report.timing,engine:report.environment.engine});console.log('VERIFIED '+backend+' '+variant+' '+resolution+' #'+repetition+' '+Math.round(totalMs)+'ms');
 writeFileSync(root+'/'+resolution+'/benchmark.json',JSON.stringify({sourceHash:source.hash,results},null,2));
}
assert.equal(sourceSnapshot().hash,source.hash);
