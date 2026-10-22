import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,existsSync,readdirSync,copyFileSync} from 'node:fs';import {dirname,relative,resolve} from 'node:path';
import {startStudioServer} from './studio-server.mjs';import {sha256} from './asset-catalog.mjs';
import {launchBrowser,closeBrowser,openPage,frameOf,sourceSnapshot,run} from './render-lib.mjs';
const source=sourceSnapshot(),root=`out/personagem-pilot/revisions/${source.hash.slice(0,12)}`,mode=process.argv[2]||'qa';mkdirSync(root,{recursive:true});
const json=(p,o)=>writeFileSync(p,JSON.stringify(o,null,2)+'\n');
if(mode==='preservation'){
 const before=JSON.parse(readFileSync('checkpoints/personagem-before-20261022/preservation.json'));
 const changed=before.files.filter(f=>f.path!=='assets/catalog.json'&&(!existsSync(f.path)||sha256(readFileSync(f.path))!==f.sha256));
 const oldIndex=JSON.parse(readFileSync('checkpoints/personagem-before-20261022/workspace/assets/catalog.json')),index=JSON.parse(readFileSync('assets/catalog.json'));
 for(const pin of oldIndex.entries)assert.ok(index.entries.some(p=>JSON.stringify(p)===JSON.stringify(pin)),'Prior catalog pin removed or changed');
 const untouched=['src/core.js','src/clawd.js','src/motion.js','src/timeline.js','src/runtime.js','src/styles/watercolor/engine.js','src/styles/cartoon/engine.js','src/styles/pixel/engine.js','src/styles/lowpoly-3d/engine.js','scripts/render-lib.mjs'];
 for(const p of untouched)assert.equal(sha256(readFileSync(p)),sha256(readFileSync('checkpoints/personagem-before-20261022/workspace/'+p)),p+' changed');
 json(root+'/preservation.json',{checked:before.files.length,changed,priorCatalogPins:oldIndex.entries.length,untouched});assert.equal(changed.length,0,JSON.stringify(changed));console.log('PASS preserved '+before.files.length+' prior files; catalog only extended');
}else if(mode==='regressions'){
 const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
 const checkpoint='checkpoints/personagem-before-20261022/qa/',out=root+'/regressions';mkdirSync(out,{recursive:true});
 const cases=[['unit',['--test',...readdirSync('tests').filter(p=>p.endsWith('.test.mjs')).map(p=>'tests/'+p)]],['visual',['scripts/check-visuals.mjs']],['integration',['scripts/check-integration.mjs']],['three',['scripts/check-three.mjs']],['mars-baseline',['scripts/check-mars-baseline.mjs']],['watercolor-layered',['scripts/check-watercolor-lifecycle.mjs']]];
 const results=[];
 try{
  for(const [name,args]of cases){const start=performance.now();try{
   const log=await run(name==='visual'?'rtk':process.execPath,name==='visual'?['npm','run','test:visual']:args,{capture:true});
   writeFileSync(out+'/'+name+'.log',log);results.push({name,status:'passed',ms:Math.round(performance.now()-start)});console.log('PASS '+name);
  }catch(error){writeFileSync(out+'/'+name+'.log',error.stack);results.push({name,status:'failed',error:error.message});throw error;}}
 }finally{
  // Keep new fixed-path QA evidence under this revision, then restore previous delivery bytes.
  for(const p of walk(checkpoint)){const dest=relative(resolve(checkpoint),resolve(p)).replaceAll('\\','/');assert.ok(dest.startsWith('out/checks/')||dest.startsWith('out/generalization/mars-regression/'),'Restore outside QA directories');if(existsSync(dest)){const keep=out+'/captured/'+dest;mkdirSync(dirname(keep),{recursive:true});copyFileSync(dest,keep);}copyFileSync(p,dest);}
  const sourceStable=sourceSnapshot().hash===source.hash;
  json(out+'/report.json',{sourceHash:source.hash,sourceStable,results,status:sourceStable&&results.length===cases.length&&results.every(r=>r.status==='passed')?'passed':'incomplete',restoredHistoricalQA:true});
 }
}else if(mode==='qa'){
 const server=await startStudioServer(),browser=await launchBrowser();
 try{
  const args={project:'personagem-surpresa',origin:server.origin},page=await openPage(browser,args),frames=[];
  for(let i=0;i<54;i++){
   frames.push(await frameOf(page,i/12));
   const bounds=await page.evaluate(()=>[...animationEngine.worldToScreen(0,0),...animationEngine.worldToScreen(1920,1080)]);
   assert.ok(bounds[0]<=1e-6&&bounds[1]<=1e-6&&bounds[2]>=1280-1e-6&&bounds[3]>=720-1e-6,'Camera exposes plate border at '+i+': '+bounds);
  }
  for(let i=53;i>=0;i--)assert.ok(frames[i].equals(await frameOf(page,i/12)),'descending '+i);
  for(const i of Array.from({length:54},(_,i)=>i).sort((a,b)=>(a*17%54)-(b*17%54)))assert.ok(frames[i].equals(await frameOf(page,i/12)),'shuffled '+i);
  const other=await openPage(browser,args);for(const i of [0,17,18,26,32,33,40,53])assert.ok(frames[i].equals(await frameOf(other,i/12)),'worker '+i);await other.close();
  await page.evaluate(()=>renderAt(3,'image/png',1,{preview:true}));assert.ok(frames[0].equals(await frameOf(page,0)),'preview state leak');
  const info=await page.evaluate(()=>({project:projectInfo(),item:assetSession.items.get('menina-aquarela').info()}));assert.equal(info.item.images,2);assert.equal(info.item.bitmaps,0);
  for(const [name,times,cols,width,crop]of [
   ['storyboard',[0,.75,17/12,1.5,2.25,32/12,2.75,3.5,53/12],3,640,null],
   ['push',[0,.25,.5,.75,1,17/12],3,480,null],
   ['observe-cut',[16/12,17/12,18/12,19/12,25/12,32/12],3,480,null],
   ['reaction-cut',[31/12,32/12,33/12,34/12,36/12,42/12],3,480,null],
   ['expression',[2.75,3,3.5,53/12],2,560,[390,230,390,350]],
   ['hair-paper',[2.75,3.5],2,640,[180,0,720,720]]]){
   const sheet=await page.evaluate((ts,c,w,cr)=>renderSheet(ts,c,w,cr),times,cols,width,crop);writeFileSync(root+'/'+name+'.jpg',Buffer.from(sheet.url.split(',')[1],'base64'));
  }
  for(const i of [0,26,33,53])writeFileSync(root+'/frame-'+i+'.png',frames[i]);
  const disposed=await page.evaluate(()=>{const item=assetSession.items.get('menina-aquarela');disposeAnimation();disposeAnimation();return item.info();});assert.equal(disposed.images,0);assert.equal(disposed.estimatedResidentBytes,0);assert.equal(disposed.releasedTextures,2);
  json(root+'/qa.json',{status:'passed',sourceHash:source.hash,ascending:54,descending:54,shuffled:54,plateCoverageFrames:54,workerSamples:8,previewReturnsToFinal:true,info,disposed});console.log('PASS personagem: 54 frames, descending, shuffled, 8 worker samples, preview, disposal. '+root);
 }finally{await closeBrowser(browser);await server.close();}
}else throw Error('Use qa, regressions or preservation');
assert.equal(sourceSnapshot().hash,source.hash,'Source changed during validation');
