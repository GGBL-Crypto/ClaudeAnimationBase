import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {run,sourceSnapshot} from './render-lib.mjs';
const out='out/generalization/regressions';mkdirSync(out,{recursive:true});
const before=JSON.parse(readFileSync('out/generalization/baseline/source.json','utf8')),after=sourceSnapshot();
const changed=new Set(['src/config.js','src/scenes/mars-discovery.js','src/styles/lowpoly-3d/config.js','package.json']);
for(const [file,hash]of Object.entries(before.files))if(!changed.has(file))assert.equal(after.files[file],hash,'Input existing before this task changed: '+file);
const cases=[
  ['unit',['--test',...readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)]],
  ['visual',['scripts/check-visuals.mjs']],
  ['integration',['scripts/check-integration.mjs']],
  ['render-2d',['scripts/check-render.mjs']],
  ['three-hardware',['scripts/check-three.mjs']],
  ['three-software',['scripts/check-three.mjs','--soft-gl']],
  ['render-three',['scripts/check-render-three.mjs']],
  ['ocean-hardware',['scripts/check-generalization.mjs']],
  ['ocean-software',['scripts/check-generalization.mjs','--soft-gl']],
  ['mars-baseline',['scripts/check-mars-baseline.mjs']]
];
const results=[];
for(const [name,args]of cases){
  const start=performance.now();
  try{
    const output=await run(process.execPath,args,{capture:true});writeFileSync(out+'/'+name+'.log',output);
    results.push({name,status:'passed',ms:Math.round(performance.now()-start),args});console.log('PASS '+name+' '+results.at(-1).ms+'ms');
  }catch(error){
    writeFileSync(out+'/'+name+'.log',error.stack);results.push({name,status:'failed',ms:Math.round(performance.now()-start),args,error:error.message});
    writeFileSync(out+'/report.json',JSON.stringify({status:'failed',sourceHash:after.hash,at:new Date().toISOString(),results},null,2)+'\n');throw error;
  }
}
assert.equal(sourceSnapshot().hash,after.hash,'Source changed during regressions');
writeFileSync(out+'/report.json',JSON.stringify({status:'passed',sourceHash:after.hash,at:new Date().toISOString(),preservedInputs:Object.keys(before.files).filter(f=>!changed.has(f)),results},null,2)+'\n');
