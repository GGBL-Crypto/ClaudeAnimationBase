import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {startStudioServer} from './studio-server.mjs';
import {launchBrowser,closeBrowser,openPage,frameOf,sourceHash,parseArgs} from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),backend=args['soft-gl']?'software':'hardware',out='out/generalization/checks-'+backend;mkdirSync(out,{recursive:true});
assert.equal(JSON.parse(readFileSync('out/generalization/baseline/source.json','utf8')).files['src/styles/lowpoly-3d/engine.js'],'bd48003f9c8817de8e7c544536ba2b80c28e3922d25c09e7995ef491f7962b4f');
const server=await startStudioServer(),browser=await launchBrowser(args),options={...args,project:'ocean-encounter',resolution:'720p',origin:server.origin};
try{
  // A request for the first film would be aborted. This is stronger than a filename scan.
  const requests=[],newPage=browser.newPage.bind(browser);
  browser.newPage=async()=>{const page=await newPage();await page.setRequestInterception(true);page.on('request',r=>{requests.push(r.url());if(r.url().includes('/scenes/mars-discovery.js'))r.abort();else r.continue();});return page;};
  const page=await openPage(browser,options),png=await frameOf(page,4);
  if(backend==='hardware')for(const t of [0,4,7.9])assert.deepEqual(await frameOf(page,t),readFileSync('out/assets-stage/baseline/ocean-'+t+'.png'),'Ocean legacy pixels changed at '+t);
  for(const t of [7.95,0,3,5.4,1.8,6.2])await frameOf(page,t);
  assert.deepEqual(png,await frameOf(page,4),'Out-of-order rendering differs');
  const other=await openPage(browser,options);assert.deepEqual(png,await frameOf(other,4),'Workers differ');await other.close();
  const globals=await page.evaluate(()=>({mars:typeof window.marsPose,robot:animationEngine.scene.getObjectByName('robot')?.name,sub:!!animationEngine.scene.getObjectByName('submarine'),jelly:!!animationEngine.scene.getObjectByName('jellyfish'),loaded:performance.getEntriesByType('resource').map(r=>r.name)}));
  assert.equal(globals.mars,'undefined');assert.equal(globals.robot,undefined);assert.ok(globals.sub&&globals.jelly);assert.ok(!requests.some(r=>r.includes('/scenes/mars-discovery.js')));assert.ok(!globals.loaded.some(r=>r.includes('/scenes/mars-discovery.js')));
  // Both actors stay readable, separated and within frame throughout all 96 export samples.
  const bounds=await page.evaluate(async()=>{
    const result=[];
    for(let i=0;i<96;i++){
      await renderAt(i/12);const p=oceanDiagnostics;
      const points=[p.submarine.position,p.creature.position].map(v=>animationEngine.worldToScreen(...v));
      const d=Math.hypot(...p.submarine.position.map((v,j)=>v-p.creature.position[j]));
      result.push({frame:i,points,distance:d});
    }return result;
  });
  for(const b of bounds){assert.ok(b.distance>1.6,'Actors overlap at '+b.frame);for(const [x,y]of b.points)assert.ok(x>120&&x<1160&&y>100&&y<620,'Actor leaves safe frame '+b.frame);}
  await page.evaluate(()=>renderAt(4,'image/png',1,{preview:true}));assert.equal((await page.evaluate(()=>animationEngine.info())).internalWidth,640);assert.deepEqual(png,await frameOf(page,4));
  const info=await page.evaluate(()=>animationEngine.info());assert.ok(info.drawCalls<=64&&info.triangles<=10000);
  writeFileSync(out+'/middle.png',png);
  const disposal=await page.evaluate(()=>{disposeAnimation();return animationEngine.info();});assert.ok(disposal.disposed);assert.equal(disposal.released.renderer,1);await page.close();
  browser.newPage=newPage;
  const studio=await openPage(browser,options,{preview:true});await studio.waitForFunction("!document.getElementById('save').disabled");
  await studio.click('#play');await studio.waitForFunction("Number(document.getElementById('scrub').value)>1");await studio.click('#play');
  await studio.setViewport({width:1440,height:1100});await studio.screenshot({path:out+'/studio.png',fullPage:true});
  await studio.select('#project','mars-discovery');await studio.waitForFunction("window.ready && PROJECT.id==='mars-discovery'");await frameOf(studio,1.5);await studio.close();
  writeFileSync(out+'/report.json',JSON.stringify({status:'passed',sourceHash:sourceHash(),backend,engineExtendedForAssets:true,legacySamplesCompared:backend==='hardware'?3:0,noFirstStoryDependency:true,orderIndependent:true,workersAgree:true,previewFinalEqual:true,studio:true,bounds,engine:info,disposal:disposal.released,loaded:globals.loaded},null,2)+'\n');
  console.log('PASS ocean '+backend+': sem dependência de Marte, ordem/workers, 96 posições, preview, estúdio e descarte');
}finally{await closeBrowser(browser);await server.close();}
