import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
import {startStudioServer} from './studio-server.mjs';import {assetSnapshot} from './asset-catalog.mjs';
import {catalog,launchBrowser,closeBrowser,openPage,frameOf,sourceSnapshot,parseArgs} from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),backend=args['soft-gl']?'swiftshader':'hardware',out='out/assets-stage/checks-'+backend;mkdirSync(out,{recursive:true});
const server=await startStudioServer(),browser=await launchBrowser(args),results=[];
try{
 for(const variant of ['p1','p2']){
  const project='quality-space-'+variant,options={...args,project,resolution:'720p',origin:server.origin},snapshot=assetSnapshot(catalog().resolveProject(project).assetRefs);
  const page=await browser.newPage();let barrier;
  await page.setRequestInterception(true);page.on('request',async r=>{
   if(r.url().endsWith('.glb')){barrier=await page.evaluate(()=>({ready:!!window.ready,canvasWidth:animationEngine.canvas.width}));await new Promise(ok=>setTimeout(ok,200));}await r.continue();
  });
  await page.goto(server.origin+'/studio.html?render=&project='+project+'&resolution=720p',{waitUntil:'networkidle0'});await page.waitForFunction('window.ready||window.bootError');
  assert.equal(await page.evaluate(()=>window.bootError),undefined);assert.equal(barrier.ready,false);page.renderErrors=[];
  const first=await frameOf(page,1);for(const t of [23/12,0,2,.25])await frameOf(page,t);assert.deepEqual(first,await frameOf(page,1));
  const other=await openPage(browser,options);assert.deepEqual(first,await frameOf(other,1));await other.close();
  await page.evaluate(()=>renderAt(1,'image/png',1,{preview:true}));assert.deepEqual(first,await frameOf(page,1));
  const before=await page.evaluate(async()=>{const c=await import('three');const buffers=new Set();animationEngine.scene.traverse(o=>{if(o.geometry){for(const a of Object.values(o.geometry.attributes))buffers.add(a.array.buffer);if(o.geometry.index)buffers.add(o.geometry.index.array.buffer);}});return {info:projectInfo(),materials:assetSession.items.get('kenney-space-speeder').info,estimatedGeometryBytes:[...buffers].reduce((n,b)=>n+b.byteLength,0),metrics:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize}:null};});
  assert.equal(before.info.assets.assetHash,snapshot.hash);assert.equal(before.materials.materials.length,4);assert.ok(before.materials.materials.every(m=>m.type==='MeshStandardMaterial'&&m.metalness===1&&m.roughness===1));
  writeFileSync(out+'/'+variant+'-middle.png',first);
  const disposal=await page.evaluate(()=>{
   const resources=new Set();animationEngine.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])resources.add(m);});if(animationEngine.scene.environment)resources.add(animationEngine.scene.environment);
   const events=[...resources].map(r=>{const e={kind:r.type||'geometry',count:0};r.addEventListener('dispose',()=>e.count++);return e;});
   // Ownership must also cover imports removed from the scene before shutdown.
   assetSession.items.get('kenney-space-speeder').root.removeFromParent();disposeAnimation();disposeAnimation();return {events,engine:animationEngine.info(),session:assetSession.info()};
  });writeFileSync(out+'/'+variant+'-disposal.json',JSON.stringify({before,disposal},null,2));assert.ok(disposal.events.every(e=>e.count===1),JSON.stringify(disposal.events));assert.equal(disposal.engine.released.renderer,1);assert.equal(disposal.session.count,0);assert.equal(disposal.engine.memory.geometries,0);
  // Three uploads an internal fallback depth texture; its counter survives renderer.dispose.
  // Managed maps are asserted by individual dispose events; forceContextLoss releases the context.
  assert.ok(disposal.engine.memory.textures<=1,'Unexpected residual texture count');
  results.push({variant,status:'passed',readinessBarrier:barrier,orderIndependent:true,workers:true,previewFinalEqual:true,before,disposal});await page.close();
 }
 // A tiny original technical glTF proves external BIN/PNG closure, image maps and detached ownership.
 const fixturePage=await openPage(browser,{...args,project:'quality-space-p1',resolution:'720p',origin:server.origin});
 const fixture=await fixturePage.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;const ctx=canvas.getContext('2d');ctx.fillStyle='#4179B5';ctx.fillRect(0,0,2,2);
  const image=new Uint8Array(await(await fetch(canvas.toDataURL('image/png'))).arrayBuffer()),bin=new Uint8Array(new Float32Array([0,0,0,1,0,0,0,1,0]).buffer);
  const {imageInfo}=await import('/src/assets/format.js');const jpeg=new Uint8Array(await(await fetch(canvas.toDataURL('image/jpeg'))).arrayBuffer()),rasterInfo={png:imageInfo(image,'png'),jpg:imageInfo(jpeg,'jpg')};
  const json={asset:{version:'2.0'},buffers:[{uri:'mesh.bin',byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],images:[{uri:'map.png'}],textures:[{source:0}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.7}}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
  const buffers=new Map([['model.gltf',new TextEncoder().encode(JSON.stringify(json))],['mesh.bin',bin],['map.png',image]]),base=new URL('/fixture/',location.origin).href,blobs=new Map([...buffers].map(([p,b])=>[base+p,URL.createObjectURL(new Blob([b]))]));
  const meta={entry:'model.gltf',files:[...buffers].map(([path,b])=>({path,bytes:b.length}))};
  buffers.set('map.png',new Uint8Array([0,1,2]));let corruptRejected=false;
  try{await prepareStyleAsset({meta,buffers,blobs,base,signal:new AbortController().signal});}catch{corruptRejected=true;}buffers.set('map.png',image);
  const item=await prepareStyleAsset({meta,buffers,blobs,base,signal:new AbortController().signal});const model=item.adopt(animationEngine.art),material=model.children[0].material,map=material.map;let events=0,closes=0;const bitmap=map.image,originalClose=bitmap.close.bind(bitmap);bitmap.close=()=>{closes++;originalClose();};map.addEventListener('dispose',()=>events++);
  const info={type:material.type,hasMap:!!map,roughness:material.roughness,metalness:material.metalness,width:map.image.width,height:map.image.height};
  animationEngine.scene.add(model);await renderAt(.5);model.removeFromParent();disposeAnimation();item.dispose();item.dispose();for(const u of blobs.values())URL.revokeObjectURL(u);
  return {info,rasterInfo,corruptRejected,events,closes,released:animationEngine.info().released};
 });assert.equal(fixture.corruptRejected,true);assert.equal(fixture.info.type,'MeshStandardMaterial');assert.equal(fixture.info.hasMap,true);assert.equal(fixture.info.roughness,.7);assert.equal(fixture.events,1);assert.equal(fixture.closes,1);assert.equal(fixture.rasterInfo.jpg.width,2);assert.equal(fixture.rasterInfo.jpg.alphaChannel,false);await fixturePage.close();
 // A network failure is surfaced; the canvas cannot silently fall back to a procedural actor.
 const broken=await browser.newPage();await broken.setRequestInterception(true);broken.on('request',r=>r.url().endsWith('.glb')?r.abort():r.continue());
 await broken.goto(server.origin+'/studio.html?render=&project=quality-space-p1&resolution=720p');await broken.waitForFunction('window.bootError');assert.equal(await broken.evaluate(()=>!!window.ready),false);const failure=await broken.evaluate(()=>({error:bootError,session:assetSession.info(),engine:animationEngine.info()}));assert.equal(failure.session.disposed,true);assert.equal(failure.engine.disposed,true);await broken.close();
 const studio=await openPage(browser,{...args,project:'quality-space-p2',resolution:'720p',origin:server.origin},{preview:true});await studio.waitForFunction("!document.getElementById('save').disabled");await studio.click('#play');await studio.waitForFunction("Number(document.getElementById('scrub').value)>.5");await studio.click('#play');await studio.screenshot({path:out+'/studio.png',fullPage:true});await studio.select('#project','visit');await studio.waitForFunction("window.ready&&projectConfig.id==='visit'");assert.equal(await studio.evaluate(()=>!!window.assetSession),false);await studio.close();
 writeFileSync(out+'/report.json',JSON.stringify({status:'passed',source:sourceSnapshot(),backend,results,fixture,explicitFailure:failure,studio:true},null,2));console.log('PASS assets '+backend+': pins, readiness, material/maps, order/workers, preview, detached disposal, failed load and studio');
}finally{await closeBrowser(browser);await server.close();}
