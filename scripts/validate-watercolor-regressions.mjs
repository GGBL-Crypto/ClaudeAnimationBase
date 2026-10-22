import assert from 'node:assert/strict';import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {run,sourceSnapshot} from './render-lib.mjs';
const source=sourceSnapshot(),out=`out/watercolor-actor/revisions/${source.hash.slice(0,12)}/regressions`;mkdirSync(out,{recursive:true});
const cases=[['unit',['--test',...readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)]],['visual',['scripts/check-visuals.mjs']],['integration',['scripts/check-integration.mjs']],['three-hardware',['scripts/check-three.mjs']],['three-software',['scripts/check-three.mjs','--soft-gl']],['mars-baseline',['scripts/check-mars-baseline.mjs']],['ocean-hardware',['scripts/check-generalization.mjs']],['ocean-software',['scripts/check-generalization.mjs','--soft-gl']],['assets-hardware',['scripts/check-assets.mjs']],['assets-software',['scripts/check-assets.mjs','--soft-gl']]];
const results=[];
try{for(const [name,args]of cases){const start=performance.now();const log=await run(process.execPath,args,{capture:true});writeFileSync(out+'/'+name+'.log',log);results.push({name,status:'passed',ms:performance.now()-start});console.log('PASS '+name);}
 assert.equal(sourceSnapshot().hash,source.hash);
}finally{writeFileSync(out+'/report.json',JSON.stringify({status:results.length===cases.length?'passed':'incomplete',sourceHash:source.hash,results,note:'Fixed-path historical QA evidence restored separately from pre-task zip; no legacy video render invoked.'},null,2));}
