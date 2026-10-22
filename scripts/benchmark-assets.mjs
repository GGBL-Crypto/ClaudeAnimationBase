import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {sourceSnapshot,run} from './render-lib.mjs';
const source=sourceSnapshot(),out='out/asset-pilot/revisions/'+source.hash.slice(0,12);mkdirSync(out,{recursive:true});
const measurements=[];
for(const backend of ['hardware','swiftshader'])for(const variant of ['p0','p1','p2']){
 const dir=out+'/720p-12fps/'+backend+'/'+variant;mkdirSync(dir,{recursive:true});
 if(existsSync(dir+'/video.mp4'))throw Error('Vídeo desta revisão já existe; preserve-o e use outra saída/revisão para nova medição');
 const common=['--project=quality-space-'+variant,'--resolution=720p',...(backend==='swiftshader'?['--soft-gl']:[])];
 // Inspect the PNGs generated here before marking a later MP4 review as complete.
 await run(process.execPath,['render.mjs',...common,'--stills=0,1,1.9166666666666667','--out='+dir+'/inspection'],{capture:true});
 const start=performance.now(),log=await run(process.execPath,['render.mjs',...common,'--clip','--fps=12','--out='+dir+'/video.mp4'],{capture:true}),wallMs=Math.round(performance.now()-start);
 writeFileSync(dir+'/render.log',log);const report=JSON.parse(readFileSync(dir+'/video.mp4.review/report.json'));
 measurements.push({variant,backend,wallMs,timing:report.timing,bytes:report.bytes,engine:report.environment.engine,video:dir+'/video.mp4',sourceHash:report.sourceHash,assetHash:report.assetHash});
 writeFileSync(out+'/benchmark.json',JSON.stringify({source,measurements},null,2));console.log(backend+' '+variant+' '+wallMs+' ms');
}
