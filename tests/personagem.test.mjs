import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validateManifest,assetSnapshot} from '../scripts/asset-catalog.mjs';
import {layeredPose} from '../src/assets/layered.js';
const base='assets/packs/menina-aquarela/1.0.1/',m=JSON.parse(readFileSync(base+'manifest.json')),read=p=>readFileSync(base+p);
test('opaque supplied illustration admits only explicit local unknown-rights usage, real lineage and a single intact layer',()=>{
 const v=validateManifest(m,read);assert.equal(v.capabilities['calm.png'].transparent,0);assert.equal(v.capabilities['surprised.png'].soft,0);assert.ok(v.estimatedTextureBytes<64*1024*1024);
 assert.equal(m.license.commercial,null);assert.equal(m.origin.generation.prompt,null);
 for(const mutate of [x=>delete x.usage,x=>x.usage.scope='commercial',x=>x.license.status='verified',x=>x.origin.userProvided=false,x=>x.style='cartoon',x=>x.profile='layered-2d',x=>x.actor.views.illustration.poses.plate.parts.push({...x.actor.views.illustration.poses.plate.parts[0],id:'head',parent:'illustration'}),x=>x.derivations[0].sourceSha256='0'.repeat(64),x=>x.available.expressions.push('blink')]){
  const bad=structuredClone(m);mutate(bad);assert.throws(()=>validateManifest(bad,read));
 }
 const opts={view:'illustration',pose:'plate',expression:'calm'},a=layeredPose(m.actor,opts),b=layeredPose(m.actor,{...opts,expression:'surprised'});assert.equal(a.length,1);assert.deepEqual(a[0].matrix,b[0].matrix);assert.notEqual(a[0].file,b[0].file);
 assert.throws(()=>layeredPose(m.actor,{...opts,expression:'blink'}));assert.throws(()=>layeredPose(m.actor,{...opts,transforms:{arm:{rotation:.1}}}));
 const pin={id:m.id,version:m.version,manifestSha256:'c8a5471b9260d22aa2f6d128d043c7bb595a5975390e4e6667afe05ccdd803d2'};assert.ok(assetSnapshot([pin]).hash);
});
