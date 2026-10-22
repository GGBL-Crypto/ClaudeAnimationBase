import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {validateManifest,sha256} from '../scripts/asset-catalog.mjs';import {decodeRgba} from '../scripts/png-rgba.mjs';import {layeredPose} from '../src/assets/layered.js';
const base='assets/packs/iara-watercolor-fixture/1.0.2/',m=JSON.parse(readFileSync(base+'manifest.json')),read=p=>readFileSync(base+p);
test('layered admission validates real RGBA, immutable lineage, identity and authored hierarchy',()=>{
 const result=validateManifest(m,read);assert.ok(result.estimatedTextureBytes<64*1024*1024);assert.equal(result.capabilities['head.png'].transparent>0,true);
 for(const change of [x=>delete x.identity.paletteVersion,x=>x.actor.views.side={},x=>x.actor.views.front.poses.greeting.parts[1].parent='missing',x=>x.actor.views.front.poses.greeting.parts[1].parent='face',x=>x.actor.views.front.poses.greeting.parts[1].pivot=[999,0],x=>x.actor.views.front.poses.greeting.parts[0].rotation=[1,-1],x=>x.available.expressions.push('angry'),x=>x.actor.views.front.poses.greeting.parts[9].variants.smile='head.png',x=>x.derivations[0].sourceSha256='a'.repeat(64)]){
  const copy=structuredClone(m);change(copy);assert.throws(()=>validateManifest(copy,read));
 }
 const generated=structuredClone(m);generated.origin={kind:'generated',author:'external operator',source:'manual external PNG delivery',generation:{provider:'reported external provider',model:'unknown (operator did not record version)',prompt:'Original authored layered character',parameters:null,seed:null,jobId:null,references:[]}};assert.doesNotThrow(()=>validateManifest(generated,read));
});
test('PNG decoder rejects opaque RGBA, bad CRC, painted checks without alpha and invalid compressed data',()=>{
 const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const t=Buffer.from(type),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);t.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([t,data])),8+data.length);return b;};
 const png=(colorType,compressed)=>{const h=Buffer.alloc(13);h.writeUInt32BE(2);h.writeUInt32BE(1,4);h[8]=8;h[9]=colorType;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',compressed),chunk('IEND',Buffer.alloc(0))]);};
 const pixels=Buffer.from([0,255,255,255,0,30,60,90,255]);assert.equal(decodeRgba(png(6,deflateSync(pixels))).transparent,1);
 const opaque=Buffer.from(pixels);opaque[4]=255;assert.throws(()=>decodeRgba(png(6,deflateSync(opaque))),/transparência/);
 assert.throws(()=>decodeRgba(png(2,deflateSync(pixels))),/RGBA8/);assert.throws(()=>decodeRgba(png(6,Buffer.from('bad'))));
 const corrupt=png(6,deflateSync(pixels));corrupt[40]^=1;assert.throws(()=>decodeRgba(corrupt),/CRC/);
});
test('absolute hierarchy refuses absent views/poses/expressions and preserves facial identity',()=>{
 const sample=(expression='neutral',transforms={})=>layeredPose(m.actor,{view:'front',pose:'greeting',expression,transforms});
 const a=sample();sample('smile',{head:{rotation:.1},lowerRight:{rotation:-1}});assert.deepEqual(a,sample());
 for(const options of [{view:'side',pose:'greeting',expression:'neutral'},{view:'front',pose:'run',expression:'neutral'},{view:'front',pose:'greeting',expression:'angry'},{view:'front',pose:'greeting',expression:'neutral',transforms:{head:{rotation:2}}},{view:'front',pose:'greeting',expression:'neutral',transforms:{invented:{}}}])assert.throws(()=>layeredPose(m.actor,options));
 assert.deepEqual(a.map(p=>p.matrix),sample('smile').map(p=>p.matrix));assert.equal(a.filter((p,i)=>p.file!==sample('smile')[i].file).length,1);
 const neutral=decodeRgba(read('neutral.png')),smile=decodeRgba(read('smile.png'));assert.equal(sha256(neutral.rgba.subarray(0,140*60*4)),sha256(smile.rgba.subarray(0,140*60*4)),'eyes/nose change with smile');
});
