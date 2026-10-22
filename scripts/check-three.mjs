// Real-browser contract, determinism, projection, capture, disposal and failure checks.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startStudioServer } from './studio-server.mjs';
import { launchBrowser, closeBrowser, openPage, frameOf, parseArgs, sourceHash } from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),studio=await startStudioServer(),browser=await launchBrowser(args);
const out='out/checks/three-'+(args['soft-gl']?'software':'hardware');mkdirSync(out,{recursive:true});const checks=[];
const options={...args,project:'mars-discovery',style:'lowpoly-3d',resolution:'720p',origin:studio.origin};
try {
  for(const projection of ['perspective','orthographic'])for(const shadows of ['on','off']) {
    const settings={...options,projection,shadows},page=await openPage(browser,settings);
    const first=await frameOf(page,1.5);for(const t of [35/12,0,.5,2.5,1])await frameOf(page,t);
    assert.ok(first.equals(await frameOf(page,1.5)),projection+'/'+shadows+': ordem alterou o PNG');
    const other=await openPage(browser,settings);assert.ok(first.equals(await frameOf(other,1.5)),'Outro worker alterou o PNG');await other.close();
    const info=await page.evaluate(()=>projectInfo());assert.equal(info.width,1280);assert.equal(info.height,720);assert.equal(info.engine.revision,'186');
    const center=await page.evaluate(()=>{const c=STYLE.camera.target;return animationEngine.worldToScreen(c.x,c.y,c.z);});assert.ok(Math.abs(center[0]-640)<1e-5);assert.ok(Math.abs(center[1]-360)<1e-5);
    await assert.rejects(page.evaluate(()=>animationEngine.worldToScreen(100,100,100)),/profundidade/);
    const content=await page.evaluate(()=>{const c=animationEngine.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const colors=new Set();for(let i=0;i<d.length;i+=64)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return {colors:colors.size,p5:typeof window.p5};});assert.ok(content.colors>20);assert.equal(content.p5,'undefined');
    await page.evaluate(()=>renderAt(1.5,'image/png',1,{preview:true}));const light=await page.evaluate(()=>animationEngine.info());assert.equal(light.internalWidth,640);assert.equal(light.internalHeight,360);
    assert.ok(first.equals(await frameOf(page,1.5)),'Alternar preview alterou o quadro final');
    writeFileSync(out+'/'+projection+'-'+shadows+'.png',first);
    const disposal=await page.evaluate(async()=>{
      const {THREE,scene}=animationEngine.art;
      const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;
      const material=new THREE.MeshBasicMaterial({map:texture}),geometry=new THREE.BoxGeometry(.1,.1,.1),mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
      const events={geometries:0,materials:0,textures:0},seen=new Set();
      scene.traverse(o=>{for(const r of [o.geometry,...(Array.isArray(o.material)?o.material:o.material?[o.material]:[])])if(r&&!seen.has(r)){seen.add(r);r.addEventListener('dispose',()=>events[r.isMaterial?'materials':'geometries']++);}});
      texture.addEventListener('dispose',()=>events.textures++);
      const expected={geometries:[...seen].filter(r=>r.isBufferGeometry).length,materials:[...seen].filter(r=>r.isMaterial).length};
      await renderAt(1.5);
      disposeAnimation();const first=animationEngine.info();disposeAnimation();const second=animationEngine.info();
      return {events,expected,first,second,children:scene.children.length,ready:window.ready};
    });
    assert.equal(disposal.ready,false);assert.equal(disposal.children,0);assert.equal(disposal.first.disposed,true);
    assert.equal(disposal.events.textures,1);assert.equal(disposal.events.geometries,disposal.expected.geometries);assert.equal(disposal.events.materials,disposal.expected.materials);
    assert.ok(disposal.first.released.geometries>=disposal.expected.geometries);assert.ok(disposal.first.released.materials>=disposal.expected.materials);
    assert.equal(disposal.first.released.renderer,1);assert.deepEqual(disposal.first.released,disposal.second.released);
    await assert.rejects(page.evaluate(()=>renderAt(1)),/descartado/);await page.close();checks.push({projection,shadows,deterministic:true,workersAgree:true,previewReturnsToFinal:true,disposal:disposal.first.released,engine:info.engine});
  }
  const preview=await openPage(browser,options,{preview:true});await preview.waitForFunction("!document.getElementById('save').disabled");
  assert.equal(await preview.$eval('#quality-label',e=>e.hidden),false);assert.equal((await preview.evaluate(()=>animationEngine.info())).profile,'light');
  await preview.select('#quality','final');await preview.waitForFunction("animationEngine.info().profile==='final' && !document.getElementById('save').disabled");
  await preview.select('#quality','light');await preview.waitForFunction("animationEngine.info().profile==='light' && !document.getElementById('save').disabled");
  await preview.evaluate(()=>{HTMLAnchorElement.prototype.click=function(){window.savedTestPNG=this.href;};});await preview.click('#save');await preview.waitForFunction('window.savedTestPNG');
  const saved=Buffer.from((await preview.evaluate(()=>window.savedTestPNG)).split(',')[1],'base64');assert.equal(saved.readUInt32BE(16),1280);assert.equal(saved.readUInt32BE(20),720);assert.equal((await preview.evaluate(()=>animationEngine.info())).profile,'final');
  await preview.click('#play');await preview.waitForFunction("Number(document.getElementById('scrub').value)>1");await preview.click('#play');
  await preview.setViewport({width:1440,height:1100});await preview.screenshot({path:out+'/studio.png',fullPage:true});
  await preview.setViewport({width:390,height:844});assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await preview.screenshot({path:out+'/studio-mobile.png',fullPage:true});
  await preview.evaluate(()=>{const dispose=animationEngine.dispose;animationEngine.dispose=()=>{dispose();sessionStorage.setItem('releasedEngine',JSON.stringify(animationEngine.info()));};});
  await preview.select('#project','visit');await preview.waitForFunction("window.ready && PROJECT.id==='visit'");assert.equal(await preview.$eval('#quality-label',e=>e.hidden),true);assert.equal(await preview.evaluate(()=>JSON.parse(sessionStorage.getItem('releasedEngine')).disposed),true);await preview.close();
  await assert.rejects(openPage(browser,{project:'mars-discovery'}),/npm run studio/);
  // Simulate WebGL2 absence before boot. It must not produce a ready 2D canvas.
  const failed=await browser.newPage();await failed.evaluateOnNewDocument(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return type==='webgl2'?null:get.call(this,type,...rest);};});
  await failed.goto(studio.origin+'/studio.html?project=mars-discovery&render');await failed.waitForFunction('window.bootError');assert.match(await failed.evaluate(()=>window.bootError),/WebGL2 indisponível/);assert.equal(await failed.evaluate(()=>window.ready),false);assert.equal(await failed.evaluate(()=>animationEngine.info().disposed),true);await failed.close();
  const lost=await browser.newPage();await lost.evaluateOnNewDocument(()=>{
    const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){const gl=get.call(this,type,...rest);if(type==='webgl2')window.testGL=gl;return gl;};
  });
  await lost.goto(studio.origin+'/studio.html?project=mars-discovery&resolution=720p&render');await lost.waitForFunction('window.ready');
  await lost.evaluate(()=>{testGL.canvas.addEventListener('webglcontextlost',()=>window.testLost=true);testGL.getExtension('WEBGL_lose_context').loseContext();});
  await lost.waitForFunction('window.testLost');await assert.rejects(lost.evaluate(()=>renderAt(1)),/Contexto WebGL2 perdido/);assert.equal(await lost.evaluate(()=>window.ready),false);assert.match(await lost.$eval('#error',e=>e.textContent),/Contexto WebGL2 perdido/);await lost.close();
  const shader=await openPage(browser,options);await assert.rejects(shader.evaluate(async()=>{
    const {THREE}=animationEngine.art,material=new THREE.MeshBasicMaterial({color:'#ffffff'});
    material.onBeforeCompile=shader=>{shader.vertexShader='THIS_IS_AN_INVALID_SHADER;\n'+shader.vertexShader;};
    animationEngine.scene.add(new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),material));await renderAt(1);
  }),/shader WebGL2/);await shader.evaluate(()=>disposeAnimation());await shader.close();
  writeFileSync(out+'/checks.json',JSON.stringify({status:'passed',at:new Date().toISOString(),sourceHash:sourceHash(),backend:args['soft-gl']?'SwiftShader':'normal',checks,studio:true,webgl2FailureExplicit:true,contextLossExplicit:true,shaderFailureExplicit:true},null,2)+'\n');
  console.log('PASS: 3D '+(args['soft-gl']?'SwiftShader':'normal')+' · projeções, sombras, ordem, workers, preview, descarte e erro WebGL2. '+out);
}finally{await closeBrowser(browser);await studio.close();}
