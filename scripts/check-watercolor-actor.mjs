import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
import {startStudioServer} from './studio-server.mjs';import {launchBrowser,closeBrowser,openPage,frameOf,parseArgs,sourceSnapshot} from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),backend=args['soft-gl']?'swiftshader':'hardware',height=Number(args.height||720),fps=height===720?12:24;
const source=sourceSnapshot(),out=`out/watercolor-actor/revisions/${source.hash.slice(0,12)}/qa-${height}/${backend}`;mkdirSync(out,{recursive:true});
const server=await startStudioServer(),browser=await launchBrowser(args),results=[];
try{
 for(const variant of ['procedural','assets']){
  const options={...args,project:`watercolor-actor-${variant}-${height}`,origin:server.origin},start=performance.now(),page=await openPage(browser,options),initMs=performance.now()-start;
  const refs=await page.evaluate(()=>({info:projectInfo(),item:window.assetSession?.items.get('iara-watercolor-fixture').info(),heap:performance.memory?.usedJSHeapSize}));
  if(variant==='assets'){assert.equal(refs.item.bitmaps,0);assert.equal(refs.item.images,12);assert.equal(refs.item.closedBitmaps,12);}
  const times=Array.from({length:2.5*fps},(_,i)=>i/fps),frames=[];const capture=performance.now();
  for(const t of times)frames.push(await frameOf(page,t));
  const captureMs=performance.now()-capture;
  for(const i of [...times.keys()].reverse())assert.deepEqual(await frameOf(page,times[i]),frames[i],'descending '+variant+' '+times[i]);
  const shuffled=[...times.keys()].sort((a,b)=>(a*17%times.length)-(b*17%times.length));
  for(const i of shuffled)assert.deepEqual(await frameOf(page,times[i]),frames[i],'shuffled '+variant+' '+times[i]);
  const other=await openPage(browser,options);for(const i of [0,6,Math.floor(times.length*.7),times.length-1])assert.deepEqual(await frameOf(other,times[i]),frames[i]);await other.close();
  const sheet=await page.evaluate(()=>renderSheet([0,.25,.5,.625,.75,1.1,1.4,1.75,2,2.25,2.4583333333333335],3,480));writeFileSync(out+'/'+variant+'-storyboard.jpg',Buffer.from(sheet.url.split(',')[1],'base64'));
  for(const [name,ts,crop]of [['breath',[0,.1667,.3333,.4167],[520,180,300,430]],['face',[.4167,.5,.5833,.6667,.75,.9],[555,205,180,210]],['head-hair',[.75,1,1.25,1.5,1.75,2],[520,190,280,270]],['gesture',[1.2,1.4,1.6,1.8,2.1,2.4],[520,340,450,300]]]){
   const factor=height/720,rect=crop.map(n=>n*factor),s=await page.evaluate((ts,rect)=>renderSheet(ts,3,360,rect),ts,rect);writeFileSync(out+'/'+variant+'-'+name+'.jpg',Buffer.from(s.url.split(',')[1],'base64'));
  }
  const overlaps=await page.evaluate(async times=>{
   const {layeredPose}=await import('/src/assets/layered.js');const fixture=WatercolorFixture,meta=(await(await fetch('/assets/index.json')).json()).entries.find(e=>e.id==='iara-watercolor-fixture'&&e.version==='1.0.2'),images={};
   for(const f of meta.files){const im=new Image();im.src='/assets/packs/'+meta.id+'/'+meta.version+'/'+f.path;await im.decode();images[f.path]=im;}
   const c=document.createElement('canvas');c.width=c.height=120;const x=c.getContext('2d',{willReadFrequently:true}),min={},poses=times.map(t=>watercolorActorPose(t));
   for(const part of fixture.actor.views.front.poses.greeting.parts.filter(p=>/^(head|upper|lower|hand)/.test(p.id)))for(const rotation of part.rotation){const p=watercolorActorPose(0);p.transforms[part.id]={rotation};poses.push(p);}
   for(const pose of poses){const parts=layeredPose(fixture.actor,pose);for(const p of parts.filter(p=>/^(head|upper|lower|hand)/.test(p.id))){const parent=parts.find(q=>q.id===p.parent);if(!parent)continue;
    const mask=q=>{x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,120,120);const m=[...q.matrix];m[4]+=60-p.matrix[4];m[5]+=60-p.matrix[5];x.setTransform(...m);x.drawImage(images[q.file],-q.pivot[0],-q.pivot[1]);return x.getImageData(0,0,120,120).data;};
    const a=mask(p),b=mask(parent);let area=0;for(let i=3;i<a.length;i+=4)if(a[i]>=128&&b[i]>=128)area++;min[p.id]=Math.min(min[p.id]??Infinity,area);
   }}return min;
  },times);
  assert.ok(Object.values(overlaps).every(n=>n>=12),'joint alpha intersection '+JSON.stringify(overlaps));
  writeFileSync(out+'/'+variant+'-middle.png',frames[Math.floor(times.length*.7)]);
  if(variant==='assets'){
   await page.evaluate(()=>{
    window.LOOP=()=>{
     boilSeed('composition test');paint(rectPts(0,0,1920,1080),{wash:'#263F4A',ink:null});
     const item=assetSession.items.get('iara-watercolor-fixture'),pose=watercolorActorPose(1.75);
     item.draw(490,900,1.15,pose);item.draw(960,900,1.15,pose);
     boilSeed('foreground test');paint(rectPts(850,730,760,115),{wash:PAL.rose,ink:null});
     item.draw(1430,900,1.15,pose);
    };
   });
   writeFileSync(out+'/alpha-composition.png',await frameOf(page,1.75));
   await page.evaluate(()=>{window.LOOP=null;});assert.deepEqual(await frameOf(page,times[0]),frames[0],'composition state leaks');
   await page.evaluate(()=>renderAt(.5,'image/png',1,{preview:true}));assert.deepEqual(await frameOf(page,times[0]),frames[0],'preview state leaks');
   const cycles=await page.evaluate(async()=>{
    const {prepareAssets}=await import('/src/assets/session.js'),results=[];
    for(let i=0;i<3;i++){const old=assetSession.items.get('iara-watercolor-fixture');assetSession.dispose();const prior=old.info();const session=await prepareAssets(PROJECT.assetRefs,prepareStyleAsset);session.items.get('iara-watercolor-fixture').prepare();await renderAt(1.75);results.push({prior,current:session.items.get('iara-watercolor-fixture').info()});}return results;
   });
   assert.ok(cycles.every((c,i)=>c.prior.images===0&&c.prior.releasedTextures===(i===0?12:9)&&c.current.images===12&&c.current.bitmaps===0),JSON.stringify(cycles));refs.repeatedSessions=cycles;
  }
  const disposed=await page.evaluate(()=>{const item=window.assetSession?.items.get('iara-watercolor-fixture');disposeAnimation();disposeAnimation();return {session:window.assetSession?.info(),item:item?.info()};});
  if(variant==='assets'){assert.equal(disposed.item.images,0);assert.equal(disposed.item.estimatedResidentBytes,0);assert.equal(disposed.item.releasedTextures,9);assert.equal(disposed.session.count,0);}
  results.push({variant,initMs,captureMs,frameMs:captureMs/times.length,refs,frames:times.length,descending:true,shuffled:true,workers:2,workerSamples:4,overlaps,disposed});await page.close();console.log('PASS '+variant+' '+backend+' '+height);
 }
 // Delay production PNG: p5 must not auto-start and no first-frame fallback is allowed.
 const barrier=await browser.newPage();let observed;
 await barrier.setRequestInterception(true);barrier.on('request',async r=>{if(r.url().endsWith('/torso.png')){observed=await barrier.evaluate(()=>({ready:!!window.ready,p5Canvas:!!document.querySelector('.p5Canvas')}));await new Promise(ok=>setTimeout(ok,150));}await r.continue();});
 await barrier.goto(server.origin+'/studio.html?render=&project=watercolor-actor-assets-'+height);await barrier.waitForFunction('window.ready||window.bootError');assert.equal(await barrier.evaluate(()=>window.bootError),undefined);assert.deepEqual(observed,{ready:false,p5Canvas:false});await barrier.close();
 const broken=await browser.newPage();await broken.setRequestInterception(true);broken.on('request',r=>r.url().endsWith('/head.png')?r.abort():r.continue());await broken.goto(server.origin+'/studio.html?render=&project=watercolor-actor-assets-'+height);await broken.waitForFunction('window.bootError');const failure=await broken.evaluate(()=>({error:bootError,ready:!!window.ready,session:assetSession.info()}));assert.equal(failure.ready,false);assert.equal(failure.session.disposed,true);assert.equal(failure.session.count,0);await broken.close();
 writeFileSync(out+'/report.json',JSON.stringify({status:'passed',sourceHash:source.hash,backend,height,fps,results,barrier:observed,failure},null,2));
}finally{await closeBrowser(browser);await server.close();}
