import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAnimatedActor} from '../src/styles/lowpoly-3d/components/animated-actor.js';
import {gltfInfo} from '../src/assets/format.js';
import {validateManifest} from '../scripts/asset-catalog.mjs';
const pack='assets/packs/expressive-robot/1.0.1/',bytes=readFileSync(pack+'actor.glb');
const inspect=b=>gltfInfo(b,'glb',new Map(),'actor.glb','articulated');
const parse=async b=>new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
function mutate(change){
 const n=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+n)),bin=Buffer.from(bytes.subarray(28+n));change(j,bin);
 const data=Buffer.from(JSON.stringify(j)),json=Buffer.alloc(Math.ceil(data.length/4)*4,32);data.copy(json);
 const head=Buffer.from(bytes.subarray(0,20));head.writeUInt32LE(28+json.length+bin.length,8);head.writeUInt32LE(json.length,12);const h=Buffer.alloc(8);h.writeUInt32LE(bin.length);h.writeUInt32LE(0x004e4942,4);return Buffer.concat([head,json,h,bin]);
}
const snapshot=actor=>{const out=[];actor.root.traverse(o=>out.push([o.name,...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray(),...(o.morphTargetInfluences||[])]));return out;};
test('bounded articulated admission checks real skins, expressions, clips and malformed bytes',()=>{
 const info=inspect(bytes);assert.equal(info.bones,43);assert.equal(info.meshes,7);assert.equal(info.triangles,3237);assert.equal(info.clips,14);assert.deepEqual(info.expressions,['Angry','Surprised','Sad']);
 assert.throws(()=>gltfInfo(bytes,'glb',new Map(),'actor.glb'),/perfil articulado/);
 const cases=[
  j=>j.skins[0].joints.push(j.skins[0].joints[0]),
  j=>j.skins[0].joints[0]=999,
  j=>j.animations[0].channels.push(j.animations[0].channels[0]),
  j=>j.animations[0].samplers[0].interpolation='invalid',
  j=>j.meshes[0].primitives[0].targets=[{POSITION:999}],
  j=>j.nodes.push(...Array.from({length:9},()=>({mesh:0,skin:0}))),
  (j,b)=>{const a=j.accessors[j.skins[0].inverseBindMatrices],v=j.bufferViews[a.bufferView];b.fill(0,v.byteOffset||0,(v.byteOffset||0)+64);},
  (j,b)=>{const a=j.accessors[j.animations[0].samplers[0].input],v=j.bufferViews[a.bufferView],off=(v.byteOffset||0)+(a.byteOffset||0);b.writeFloatLE(0,off+4);},
  (j,b)=>{const p=j.meshes.find(m=>m.primitives[0].attributes.WEIGHTS_0!==undefined).primitives[0],a=j.accessors[p.attributes.WEIGHTS_0],v=j.bufferViews[a.bufferView];b.fill(0,(v.byteOffset||0)+(a.byteOffset||0),(v.byteOffset||0)+(a.byteOffset||0)+16);},
  (j,b)=>{const a=j.accessors[0],v=j.bufferViews[a.bufferView];b.writeFloatLE(NaN,(v.byteOffset||0)+(a.byteOffset||0));}
 ];for(const change of cases)assert.throws(()=>inspect(mutate(change)));
 const manifest=JSON.parse(readFileSync(pack+'manifest.json'));manifest.available.expressions.push('Invented');assert.throws(()=>validateManifest(manifest,p=>readFileSync(pack+p)),/morph real/);
});
test('absolute samples reset actions, blend weights, loop endpoints, morphs and independent skeletons',async()=>{
 const gltf=await parse(bytes),options={expressions:{surprise:'Surprised',sad:'Sad'}},a=createAnimatedActor(gltf.scene,gltf.animations,options),b=createAnimatedActor(gltf.scene,gltf.animations,options);
 const state=t=>({actions:t<2?[{clip:'Walking',weight:1}]:t<4?[{clip:'Walking',weight:.4},{clip:'Idle',weight:.6}]:t<6?[{clip:'Wave',start:4,loop:false}]:[],expressions:t>4&&t<5?{surprise:1}:t>5&&t<6?{sad:.8}:{}});
 const times=[0,.01,.958333313465118,1.916666626930236,2,3.9,4,4.5,5,5.9,6,8];const expected=new Map(times.map(t=>{a.apply(t,state(t));return [t,snapshot(a)];}));
 for(const t of [...times].reverse().concat([4.5,0,5.9,6,2,8,4])){a.apply(t,state(t));assert.deepEqual(snapshot(a),expected.get(t));}
 b.apply(4.5,state(4.5));const before=snapshot(b);a.apply(0,state(0));assert.deepEqual(snapshot(b),before);
 const sa=[],sb=[];a.root.traverse(o=>{if(o.isSkinnedMesh)sa.push(o.skeleton);});b.root.traverse(o=>{if(o.isSkinnedMesh)sb.push(o.skeleton);});assert.notEqual(sa[0],sb[0]);assert.notEqual(sa[0].bones[0],sb[0].bones[0]);
 a.apply(6,state(6));a.root.traverse(o=>{if(o.morphTargetInfluences)assert.ok(o.morphTargetInfluences.every(v=>v===0));});
 for(const clip of gltf.animations){
  const oneShot={actions:[{clip:clip.name,loop:false}]};a.apply(clip.duration,oneShot);const end=snapshot(a);a.apply(clip.duration+5,oneShot);assert.deepEqual(snapshot(a),end,clip.name+' clamp endpoint');
  const repeat={actions:[{clip:clip.name,loop:true}]};a.apply(0,repeat);const first=snapshot(a);a.apply(clip.duration,repeat);assert.deepEqual(snapshot(a),first,clip.name+' loop endpoint');
 }
 assert.throws(()=>a.apply(NaN));assert.throws(()=>a.apply(1,{actions:[{clip:'bad'}]}));assert.throws(()=>a.apply(1,{expressions:{sad:2}}));
 let disposed=0;for(const s of new Set(sa)){s.computeBoneTexture();s.boneTexture.addEventListener('dispose',()=>disposed++);}a.dispose();a.dispose();assert.equal(disposed,new Set(sa).size);assert.throws(()=>a.apply(0),/disposed/);b.dispose();
});
test('consolidated licensed model preserves sampled source deformation and facial targets',async()=>{
 const source=await parse(readFileSync(pack+'RobotExpressive.glb')),derived=await parse(bytes);
 const a=createAnimatedActor(source.scene,source.animations,{expressions:{face:'Surprised'}}),b=createAnimatedActor(derived.scene,derived.animations,{expressions:{face:'Surprised'}});
 const vertices=root=>{const points=[];root.traverse(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i++)points.push(o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld));});return points;};
 for(const [clip,t,face]of [['Idle',0,0],['Walking',.32,0],['Walking',.72,0],['Wave',1,1],['No',.5,1]]){
  const state={actions:[{clip}],expressions:{face}};a.apply(t,state);b.apply(t,state);const original=vertices(a.root),packed=vertices(b.root);
  for(let i=0;i<original.length;i+=5){const p=original[i];let min=Infinity;for(const q of packed)min=Math.min(min,p.distanceToSquared(q));assert.ok(min<1e-8,clip+' deformation error '+Math.sqrt(min));}
 }a.dispose();b.dispose();
});
test('Khronos fixtures exercise authored skinning and morph animation separately',async()=>{
 for(const [id,file]of [['khronos-rigged-simple','RiggedSimple.glb'],['khronos-morph-cube','AnimatedMorphCube.glb']]){
  const data=readFileSync('assets/packs/'+id+'/1.0.0/'+file),gltf=await parse(data),actor=createAnimatedActor(gltf.scene,gltf.animations),clip=gltf.animations[0].name;
  actor.apply(.3,{actions:[{clip}]});const first=snapshot(actor);actor.apply(1.2,{actions:[{clip,loop:false}]});actor.apply(.3,{actions:[{clip}]});assert.deepEqual(snapshot(actor),first);actor.apply(0);actor.root.traverse(o=>{if(o.morphTargetInfluences)assert.ok(o.morphTargetInfluences.every(v=>v===0));});actor.dispose();
 }
});
