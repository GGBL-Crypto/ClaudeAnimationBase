import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync,copyFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {run,sourceSnapshot} from './render-lib.mjs';
const checkpoint='../ClaudeAnimationBase-checkpoints/articulated-20261022-1792665889787',source=sourceSnapshot(),out='out/articulated/revisions/'+source.hash.slice(0,12)+'/regressions';mkdirSync(out,{recursive:true});
const baseline=JSON.parse(readFileSync(checkpoint+'/output-manifest.json')),videos=JSON.parse(readFileSync(checkpoint+'/videos.json'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),results=[];
const cases=[
 ['unit',['--test',...readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)]],
 ['visual',['scripts/check-visuals.mjs']],['integration',['scripts/check-integration.mjs']],['render-2d',['scripts/check-render.mjs']],
 ['three-hardware',['scripts/check-three.mjs']],['three-software',['scripts/check-three.mjs','--soft-gl']],['render-three',['scripts/check-render-three.mjs']],
 ['ocean-hardware',['scripts/check-generalization.mjs']],['ocean-software',['scripts/check-generalization.mjs','--soft-gl']],['mars-baseline',['scripts/check-mars-baseline.mjs']],
 ['assets-hardware',['scripts/check-assets.mjs']],['assets-software',['scripts/check-assets.mjs','--soft-gl']],['assets-cli',['scripts/check-render-assets.mjs']]
];
try{
 for(const [name,args]of cases){const start=performance.now();try{const log=await run(process.execPath,args,{capture:true});writeFileSync(out+'/'+name+'.log',log);results.push({name,status:'passed',ms:Math.round(performance.now()-start),args});console.log('PASS '+name);}catch(error){writeFileSync(out+'/'+name+'.log',error.stack);results.push({name,status:'failed',ms:Math.round(performance.now()-start),error:error.message});throw error;}}
 assert.equal(sourceSnapshot().hash,source.hash);for(const file of videos)assert.equal(hash(file.path),file.sha256,'Historical MP4 changed: '+file.path);
}finally{
 // Fixed-path legacy harnesses overwrite QA reports. Retain this execution separately,
 // then restore the pre-task evidence byte for byte. Production videos must never change.
 const restored=[];for(const file of baseline){if(existsSync(file.path)&&hash(file.path)!==file.sha256){assert.ok(!file.path.endsWith('.mp4'),'Historical video overwritten');const evidence=join(out,'evidence',file.path);mkdirSync(dirname(evidence),{recursive:true});copyFileSync(file.path,evidence);copyFileSync(join(checkpoint,'ignored-output',file.path),file.path);restored.push(file.path);}}
 writeFileSync(out+'/report.json',JSON.stringify({status:results.length===cases.length&&results.every(r=>r.status==='passed')?'passed':'failed',sourceHash:source.hash,results,historicalVideos:videos.length,restoredPriorEvidence:restored},null,2));
}
