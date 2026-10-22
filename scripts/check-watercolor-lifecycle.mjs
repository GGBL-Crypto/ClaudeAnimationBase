import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
import {launchBrowser,closeBrowser,openPage,sourceHash,parseArgs} from './render-lib.mjs';import {startStudioServer} from './studio-server.mjs';
const args=parseArgs(process.argv.slice(2)),server=await startStudioServer(),browser=await launchBrowser(args),backend=args['soft-gl']?'swiftshader':'hardware',out=`out/watercolor-actor/revisions/${sourceHash().slice(0,12)}/lifecycle-${backend}`;mkdirSync(out,{recursive:true});
try{
 const page=await openPage(browser,{...args,project:'watercolor-actor-assets-720',origin:server.origin});
 const failures=await page.evaluate(async()=>{
  const meta=(await(await fetch('/assets/index.json')).json()).entries.find(e=>e.id==='iara-watercolor-fixture'&&e.version==='1.0.2'),buffers=new Map();
  for(const f of meta.files)buffers.set(f.path,new Uint8Array(await(await fetch(`/assets/packs/${meta.id}/${meta.version}/${f.path}`)).arrayBuffer()));
  const native=createImageBitmap,results=[];
  for(const mode of ['bad-last-png','cancel-after-first','over-budget']){
   const ac=new AbortController(),local=new Map(buffers),copy=structuredClone(meta);let opened=0,closed=0,error;
   if(mode==='bad-last-png')local.set('blinkSmile.png',new Uint8Array([1,2,3]));
   if(mode==='over-budget')for(const c of Object.values(copy.capabilities)){c.width=c.height=2048;}
   window.createImageBitmap=async(...args)=>{const b=await native(...args),close=b.close.bind(b);opened++;b.close=()=>{closed++;close();};if(mode==='cancel-after-first')ac.abort();return b;};
   try{const item=await prepareStyleAsset({meta:copy,buffers:local,signal:ac.signal});item.dispose();}catch(e){error=e.message;}finally{window.createImageBitmap=native;}
   results.push({mode,opened,closed,error});
  }return results;
 });
 assert.ok(failures.every(f=>f.error&&f.opened===f.closed));assert.ok(failures[0].opened>1);assert.equal(failures[1].opened,1);assert.equal(failures[2].opened,0);await page.close();
 const preview=await openPage(browser,{...args,project:'watercolor-actor-assets-720',origin:server.origin},{preview:true});await preview.waitForFunction("!document.getElementById('save').disabled");await preview.click('#play');await preview.waitForFunction("Number(document.getElementById('scrub').value)>.5");await preview.click('#play');await preview.screenshot({path:out+'/preview.png',fullPage:true});
 await preview.select('#project','visit');await preview.waitForFunction("window.ready&&projectConfig.id==='visit'");assert.equal(await preview.evaluate(()=>!!window.assetSession),false);await preview.close();
 writeFileSync(out+'/report.json',JSON.stringify({status:'passed',backend,sourceHash:sourceHash(),failures,preview:'play/pause and switch to legacy visit'},null,2));console.log('PASS watercolor lifecycle '+backend);
}finally{await closeBrowser(browser);await server.close();}
