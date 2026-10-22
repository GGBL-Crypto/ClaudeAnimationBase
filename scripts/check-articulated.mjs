import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {startStudioServer} from './studio-server.mjs';
import {launchBrowser,closeBrowser,openPage,frameOf,sourceSnapshot,parseArgs} from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),backend=args['soft-gl']?'swiftshader':'hardware',source=sourceSnapshot(),out='out/articulated/revisions/'+source.hash.slice(0,12)+'/qa'+(args.resolution?'-'+args.resolution:'')+'/'+backend;
mkdirSync(out,{recursive:true});const server=await startStudioServer(),browser=await launchBrowser(args);const result={backend,sourceHash:source.hash};
function samePNG(actual,expected,label){if(!actual.equals(expected)){writeFileSync(out+'/mismatch-expected.png',expected);writeFileSync(out+'/mismatch-actual.png',actual);}const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(actual),hash(expected),label);}
try{
 const options={...args,project:'articulated-delivery-b',resolution:args.resolution||'720p',origin:server.origin},page=await openPage(browser,options);
 const duration=8,fps=24,times=Array.from({length:duration*fps},(_,i)=>i/fps),frames=[];
 console.log('ready '+backend);
 for(const [i,t]of times.entries()){frames.push(await frameOf(page,t));if(i%48===0)console.log('ascending '+i);}
 console.log('ascending complete');
 for(const i of times.map((_,i)=>i).reverse())samePNG(await frameOf(page,times[i]),frames[i],'descending '+i);
 console.log('descending complete');
 for(const i of times.map((_,i)=>(i*73)%times.length))samePNG(await frameOf(page,times[i]),frames[i],'shuffled '+i);
 console.log('shuffled complete');
 const other=await openPage(browser,options);for(const i of [0,23,24,68,69,70,95,96,110,125,168,191])samePNG(await frameOf(other,times[i]),frames[i],'new page '+i);await other.close();console.log('new page complete');
 await page.evaluate(()=>renderAt(4.5,'image/png',1,{preview:true}));samePNG(await frameOf(page,4.5),frames[108],'preview to final');console.log('preview complete');
 result.pngComparisons={ascending:192,descending:192,shuffled:192,newPage:12,previewFinal:true};
 result.engine=await page.evaluate(()=>animationEngine.info());result.metrics=await page.metrics();
 const contacts=await page.evaluate(async()=>{
  const out=[];for(let i=0;i<192;i++){
   const t=i/24;await animationEngine.render(t);const {footBones,soles,actor,wrapper,scale}=actorExperiment;
   out.push({t,root:wrapper.position.toArray(),feet:footBones.map((bone,k)=>bone.localToWorld(soles[k].clone()).toArray()),morphs:actor.info().expressions});
  }return out;
 });result.contacts=contacts;writeFileSync(out+'/contact-samples.json',JSON.stringify(contacts,null,2));console.log('contact sampling complete');
 // Two authored supports. The transition itself is reviewed separately, not counted as a planted foot.
 result.supports=[[.12,.85,0],[1.25,1.65,1],[2.3,3.3,0]].map(([start,end,foot])=>{const points=contacts.filter(s=>s.t>=start&&s.t<=end).map(s=>s.feet[foot]),height=Math.max(...points.map(p=>Math.abs(p[1]))),sliding=Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]));assert.ok(height<=.022,'support height '+height);assert.ok(sliding<=.044,'support slide '+sliding);return {start,end,foot,samples:points.length,maxHeight:height,sliding};});
 await frameOf(page,7.9);assert.equal(await page.evaluate(()=>{let sum=0;actorExperiment.actor.root.traverse(o=>{for(const n of o.morphTargetInfluences||[])sum+=Math.abs(n);});return sum;}),0);
 const independent=await page.evaluate(async()=>{
  const {actor,wrapper}=actorExperiment,item=assetSession.items.get('expressive-robot'),second=item.createActor(Lowpoly,{expressions:{surprise:'Surprised',angry:'Angry'}}),group=Lowpoly.group();group.scale.copy(wrapper.scale);group.position.set(-2.7,wrapper.position.y,-.25);group.rotation.copy(wrapper.rotation);group.add(second.root);
  const snapshot=a=>{const values=[];a.root.traverse(o=>values.push([...o.position.toArray(),...o.quaternion.toArray(),...(o.morphTargetInfluences||[])]));return JSON.stringify(values);};
  await renderAt(1.1);const first=snapshot(actor);second.apply(.6,{actions:[{clip:'Wave',loop:false}],expressions:{angry:1}});const isolated=first===snapshot(actor);const png=await renderAt(1.1);const still=snapshot(second);actor.apply(4.5,actorExperiment.performanceAt(4.5));const reverse=still===snapshot(second);
  const bones=a=>{const set=new Set();a.root.traverse(o=>{if(o.isBone)set.add(o);});return set;};const aa=bones(actor),bb=bones(second),different=[...aa].every(b=>!bb.has(b));second.dispose();group.removeFromParent();return {isolated,reverse,different,png};
 });writeFileSync(out+'/two-instances.png',Buffer.from(independent.png.split(',')[1],'base64'));delete independent.png;assert.deepEqual(independent,{isolated:true,reverse:true,different:true});result.independent=independent;
 const fixtureResults=[];
 for(const [id,label]of [['khronos-rigged-simple','skinning'],['khronos-morph-cube','morphs']]){
  const fixture=await page.evaluate(async id=>{
   const index=await(await fetch('/assets/index.json')).json(),meta=index.entries.find(e=>e.id===id),base=new URL('/assets/packs/'+id+'/'+meta.version+'/',location.origin).href,buffers=new Map(),blobs=new Map();
   for(const f of meta.files){const b=new Uint8Array(await(await fetch(base+f.path)).arrayBuffer());buffers.set(f.path,b);blobs.set(base+f.path,URL.createObjectURL(new Blob([b])));}
   const item=await prepareStyleAsset({meta,buffers,blobs,base,signal:new AbortController().signal}),actor=item.createActor(Lowpoly),group=Lowpoly.group(),size=item.bounds.getSize(new Lowpoly.THREE.Vector3()),scale=2/Math.max(...size.toArray());group.scale.setScalar(scale);group.position.set(-.8,-item.bounds.min.y*scale,0);group.add(actor.root);actorExperiment.wrapper.visible=false;
   const clip=actor.info().clips[0];actor.apply(.25,{actions:[{clip}]});const png=await renderAt(0),before=[];actor.root.traverse(o=>{if(o.morphTargetInfluences)before.push([...o.morphTargetInfluences]);});actor.apply(1.2,{actions:[{clip}]});actor.apply(.25,{actions:[{clip}]});const same=png===await renderAt(0);actor.apply(0);const neutral=[];actor.root.traverse(o=>{if(o.morphTargetInfluences)neutral.push([...o.morphTargetInfluences]);});const info=actor.info();group.removeFromParent();actor.dispose();item.dispose();for(const url of blobs.values())URL.revokeObjectURL(url);actorExperiment.wrapper.visible=true;return {same,png,info,before,neutral};
  },id);assert.equal(fixture.same,true);assert.ok(fixture.neutral.flat().every(v=>v===0));writeFileSync(out+'/'+label+'.png',Buffer.from(fixture.png.split(',')[1],'base64'));delete fixture.png;fixtureResults.push({id,...fixture});
 }result.fixtures=fixtureResults;
 // Native-size crops and motion strips from actual PNGs, with the same captured frame data.
 const evidence=await page.evaluate(async data=>{
  async function sheet(indices,crop){const factor=animationEngine.canvas.width/1280,w=crop==='face'?340*factor:crop==='feet'?440*factor:480,h=crop==='face'?300*factor:crop==='feet'?240*factor:270,cols=3,canvas=document.createElement('canvas');canvas.width=cols*w;canvas.height=Math.ceil(indices.length/cols)*(h+24);const ctx=canvas.getContext('2d');ctx.fillStyle='#18232e';ctx.fillRect(0,0,canvas.width,canvas.height);
   for(let n=0;n<indices.length;n++){const i=indices[n],t=i/24,img=new Image();img.src=data[i];await img.decode();await animationEngine.render(t);let sx=0,sy=0,sw=img.width,sh=img.height;
    if(crop){const {wrapper}=actorExperiment,point=crop==='face'?[wrapper.position.x,1.85,0]:[wrapper.position.x,.2,0],p=animationEngine.worldToScreen(...point);sw=w;sh=h;sx=Math.max(0,Math.min(img.width-w,p[0]-w/2));sy=Math.max(0,Math.min(img.height-h,p[1]-h/2));}
    const x=n%cols*w,y=Math.floor(n/cols)*(h+24);ctx.drawImage(img,sx,sy,sw,sh,x,y+24,w,h);ctx.fillStyle='white';ctx.font='16px sans-serif';ctx.fillText(t.toFixed(3)+' s',x+8,y+18);
   }return canvas.toDataURL();}
  return {storyboard:await sheet([0,20,40,60,70,86,96,108,125,140,168,191]),feet:await sheet([3,12,24,32,38,48,60,65,69],'feet'),loop:await sheet([49,50,51,52,53,54],'feet'),stop:await sheet([64,66,68,69,71,73,75,78,80],'feet'),discovery:await sheet([78,81,84,87,90,93]),cut:await sheet([94,95,96,97,99,101]),faces:await sheet([96,108,120,130,144,155,168,180,191],'face'),gesture:await sheet([122,124,125,126,128,132,166,168,169,170,174,180],'face')};
 },frames.map(b=>'data:image/png;base64,'+b.toString('base64')));
 for(const [name,png]of Object.entries(evidence))writeFileSync(out+'/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));
 result.disposal=await page.evaluate(()=>{
  const resources=new Set();animationEngine.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])resources.add(m);if(o.isSkinnedMesh&&o.skeleton.boneTexture)resources.add(o.skeleton.boneTexture);});
  const events=[...resources].map(resource=>{const e={kind:resource.type||'geometry',count:0};resource.addEventListener('dispose',()=>e.count++);return e;});
  disposeAnimation();disposeAnimation();return {events,engine:animationEngine.info(),session:assetSession.info()};
 });assert.ok(result.disposal.events.every(e=>e.count===1));assert.equal(result.disposal.session.count,0);assert.equal(result.disposal.engine.memory.geometries,0);
 result.status='passed';writeFileSync(out+'/report.json',JSON.stringify(result,null,2));console.log('PASS articulated '+backend+' '+out);await page.close();
}finally{await closeBrowser(browser);await server.close();}
