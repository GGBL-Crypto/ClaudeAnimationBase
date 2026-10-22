// Offline preparation of the individually licensed RobotExpressive. No downloads.
import {readFileSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// GLTFExporter uses the browser FileReader API, supplied by Blob on Node.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});} readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result='data:'+blob.type+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.();});}};
const input=process.argv[2],output=process.argv[3];if(!input||!output)throw Error('Usage: node scripts/prepare-actor-asset.mjs input.glb output.glb');
const bytes=readFileSync(input),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene;root.updateMatrixWorld(true);
const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
const source=meshes.find(o=>o.isSkinnedMesh).skeleton,bones=source.bones;
const inverse=bones.map(b=>b.matrixWorld.clone().invert()),materials=[],geometries=[];
for(const mesh of meshes){
 if(mesh.isSkinnedMesh)continue; // Preserve the two authored hand skins and bind matrices verbatim.
 let geometry=mesh.geometry.clone(),joints,weights;
 {
  geometry.applyMatrix4(mesh.matrixWorld);let bone=mesh.parent;while(bone&&!bones.includes(bone))bone=bone.parent;
  if(!bone)throw Error('Rigid part has no joint');const index=bones.indexOf(bone),count=geometry.attributes.position.count;
  joints=new THREE.Uint16BufferAttribute(new Uint16Array(count*4),4);weights=new THREE.Float32BufferAttribute(new Float32Array(count*4),4);
  for(let i=0;i<count;i++){joints.setX(i,index);weights.setX(i,1);}
 }
 geometry.setAttribute('skinIndex',joints);geometry.setAttribute('skinWeight',weights);
 // Three transforms relative morph deltas with applyMatrix4; translation must be excluded.
 if(geometry.morphAttributes.position?.length){
  const matrix=mesh.matrixWorld.clone();matrix.setPosition(0,0,0);
  geometry.morphAttributes.position=mesh.geometry.morphAttributes.position.map(a=>a.clone().applyMatrix4(matrix));
 }else geometry.morphAttributes.position=Array.from({length:3},()=>new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3),3));
 geometry.morphTargetsRelative=true;
 for(const key of Object.keys(geometry.attributes))if(!['position','normal','skinIndex','skinWeight'].includes(key))geometry.deleteAttribute(key);
 if(!geometry.index)geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
 const material=mesh.material;if(Array.isArray(material))throw Error('Expected loader primitive meshes');
 let index=materials.indexOf(material);if(index<0){index=materials.length;materials.push(material);}geometry.userData.materialIndex=index;
 geometries.push(geometry);mesh.removeFromParent();
}
// Keep bone hierarchy intact: loader primitive children have been detached, not their joints.
geometries.sort((a,b)=>a.userData.materialIndex-b.userData.materialIndex);
const merged=mergeGeometries(geometries,true);if(!merged)throw Error('Merge failed');
merged.groups.forEach((group,i)=>group.materialIndex=geometries[i].userData.materialIndex);
const groups=[];for(const group of merged.groups){const previous=groups.at(-1);if(previous?.materialIndex===group.materialIndex)previous.count+=group.count;else groups.push({...group});}merged.groups=groups;
const actor=new THREE.SkinnedMesh(merged,materials);actor.name='ExpressiveActor';actor.morphTargetDictionary={Angry:0,Surprised:1,Sad:2};actor.morphTargetInfluences=[0,0,0];
actor.bind(new THREE.Skeleton(bones,inverse),new THREE.Matrix4());root.add(actor);root.updateMatrixWorld(true);
for(const clip of gltf.animations){
 const facial=clip.tracks.filter(t=>t.name.endsWith('.morphTargetInfluences'));
 if(facial.length){const first=facial[0];if(facial.some(t=>t.times.length!==first.times.length||t.values.length!==first.values.length||t.values.some((v,i)=>v!==first.values[i])))throw Error('Incompatible facial tracks');const track=first.clone();track.name='ExpressiveActor.morphTargetInfluences';clip.tracks=clip.tracks.filter(t=>!t.name.endsWith('.morphTargetInfluences'));clip.tracks.push(track);}
}
const result=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,animations:gltf.animations,onlyVisible:false}));
// Loader expands material groups into meshes; exporter consequently duplicates identical skins.
const jsonLength=result.readUInt32LE(12),json=JSON.parse(result.subarray(20,20+jsonLength)),bin=result.subarray(28+jsonLength),unique=[],remap=[];
for(const skin of json.skins){const a=json.accessors[skin.inverseBindMatrices],v=json.bufferViews[a.bufferView],start=(v.byteOffset||0)+(a.byteOffset||0),key=JSON.stringify(skin.joints)+bin.subarray(start,start+a.count*64).toString('hex');let index=unique.findIndex(x=>x.key===key);if(index<0){index=unique.length;unique.push({key,skin});}remap.push(index);}
for(const node of json.nodes)if(node.skin!==undefined)node.skin=remap[node.skin];json.skins=unique.map(x=>x.skin);
const raw=Buffer.from(JSON.stringify(json)),chunk=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(chunk);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+chunk.length+bin.length,8);header.writeUInt32LE(chunk.length,12);header.writeUInt32LE(0x4e4f534a,16);const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);const packed=Buffer.concat([header,chunk,binHeader,bin]);writeFileSync(output,packed);
console.log(JSON.stringify({input,output,rigidTriangles:merged.index.count/3,bones:bones.length,rigidPrimitives:merged.groups.length,skins:unique.length,bytes:packed.length}));
