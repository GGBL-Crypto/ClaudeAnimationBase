// A bounded software sample supplements the exhaustive hardware permutations.
import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
import {launchBrowser,closeBrowser,openPage,frameOf,sourceHash} from './render-lib.mjs';import {startStudioServer} from './studio-server.mjs';
import {sha256} from './asset-catalog.mjs';
const server=await startStudioServer(),browser=await launchBrowser({'soft-gl':true}),out=`out/watercolor-actor/revisions/${sourceHash().slice(0,12)}/qa-software-sample`;mkdirSync(out,{recursive:true});
try{
 const opts={project:'watercolor-actor-assets-720',origin:server.origin},page=await openPage(browser,opts),times=[0,.5,.75,1.75],frames=[],wholeFrameMismatches=[];
 const isolate=page=>page.evaluate(()=>{window.LOOP=t=>{camBegin(960,650,1.10+.015*t/2.5);assetSession.items.get('iara-watercolor-fixture').draw(960,910,1.12,watercolorActorPose(t));camEnd();};});
 await isolate(page);
 const sample=async(page,t)=>{const png=await frameOf(page,t),actorHash=await page.evaluate(async()=>{const data=animationEngine.canvas.getContext('2d').getImageData(500,150,450,500).data;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('');});return {png,hash:sha256(png),actorHash};};
 for(const t of times){frames.push(await sample(page,t));console.log('ascending '+t);}
 const same=(actual,expected,label)=>{
  if(actual.hash!==expected.hash){writeFileSync(out+'/isolated-mismatch-actual.png',actual.png);writeFileSync(out+'/isolated-mismatch-expected.png',expected.png);wholeFrameMismatches.push({label,actual:actual.hash,expected:expected.hash});}
  assert.equal(actual.hash,expected.hash,'Isolated PNG actor + camera + static paper/grain: '+label);
 };
 for(const i of [3,2,1,0,2,0,3,1]){same(await sample(page,times[i]),frames[i],'same-page '+times[i]);console.log('repeat '+times[i]);}
 const worker=await openPage(browser,opts);await isolate(worker);for(const i of [0,3]){same(await sample(worker,times[i]),frames[i],'worker '+times[i]);console.log('worker '+times[i]);}await worker.close();
 const engine=await page.evaluate(()=>projectInfo().engine);writeFileSync(out+'/gesture.png',frames[3].png);const disposal=await page.evaluate(()=>{const item=assetSession.items.get('iara-watercolor-fixture');disposeAnimation();disposeAnimation();return item.info();});assert.equal(disposal.images,0);assert.equal(disposal.releasedTextures,11); // three visible faces; blinkSmile is not sampled
 writeFileSync(out+'/report.json',JSON.stringify({status:'passed-with-limitations',isolatedComponentDeterminism:'passed',productionSceneDeterminism:'failed',sceneFailureEvidence:out+'/mismatch-analysis.json',baselineProbe:'../software-baseline/report.json',sourceHash:sourceHash(),backend:'swiftshader',times,renderedSamples:14,workers:2,engine,disposal,scope:'Isolated PNG layers + camera + static paper/grain only: four times, reverse/shuffle and two cross-worker frames. No pixel tolerance. Full brush scene failed strict comparison and is not approved as byte-deterministic.'},null,2));await page.close();console.log('Isolated PNG component PASS; full painted scene remains FAILED for strict software determinism');
}finally{await closeBrowser(browser);await server.close();}
