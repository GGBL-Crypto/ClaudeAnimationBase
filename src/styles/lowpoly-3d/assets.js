import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {gltfInfo} from '../../assets/format.js';
import {createAnimatedActor} from './components/animated-actor.js';
window.makeAssetRoom=()=>new RoomEnvironment();

// Each project session owns its import; no cross-project GPU cache or silent material conversion.
window.prepareStyleAsset=async({meta,buffers,blobs,base,signal})=>{
 const extension=meta.entry.split('.').pop();if(!['glb','gltf'].includes(extension))throw Error('O adaptador 3D estático exige GLB/glTF');
 if(!STYLE.assets.enabled)throw Error('Assets 3D exigem perfil explícito');
 const bytes=buffers.get(meta.entry),verified=gltfInfo(bytes,extension,new Map(meta.files.map(f=>[f.path,f])),meta.entry,meta.profile||'static');
 if(verified.textures&&!STYLE.texture.bitmaps)throw Error('Mapas bitmap exigem texture.bitmaps neste projeto');
 // GLTFLoader can log a decode error and substitute a null map. Reject it before parsing instead.
 const prefix=meta.entry.includes('/')?meta.entry.slice(0,meta.entry.lastIndexOf('/')+1):'';
 for(const image of verified.json.images||[]){
  let data;if(image.uri)data=buffers.get(prefix+image.uri);
  else {const v=verified.json.bufferViews[image.bufferView],view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),start=28+view.getUint32(12,true)+(v.byteOffset||0);data=bytes.subarray(start,start+v.byteLength);}
  const bitmap=await createImageBitmap(new Blob([data]));bitmap.close();if(signal.aborted)throw Error('Importação cancelada');
 }
 const resources=new Set(),bitmaps=new Set(),actors=new Set(),skeletons=new Set();let adopted=false,disposed=false,parser,root;
 const collect=object=>{
  if(!object)return;
  if(object.isBufferGeometry||object.isMaterial||object.isTexture)resources.add(object);
  if(object.isMesh){resources.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])collect(m);}
  if(object.isSkinnedMesh)skeletons.add(object.skeleton);
  if(object.isMaterial)for(const value of Object.values(object))if(value?.isTexture)collect(value);
  if(object.isTexture)for(const image of Array.isArray(object.image)?object.image:[object.image])if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap)bitmaps.add(image);
 };
 const dispose=()=>{if(disposed)return;disposed=true;for(const actor of actors)actor.dispose();actors.clear();for(const skeleton of skeletons)skeleton.dispose();skeletons.clear();if(!adopted){for(const resource of resources)resource.dispose();for(const image of bitmaps)image.close();}resources.clear();bitmaps.clear();root?.removeFromParent();root=null;parser=null;};
 try{
  const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{
   if(blobs.has(url))return blobs.get(url);
   // Embedded images get object URLs inside GLTFLoader; JSON itself cannot supply blob/data/network URIs.
   if(url.startsWith('blob:'+location.origin+'/'))return url;
   throw Error('Referência não autorizada no modelo: '+url);
  });
  const loader=new GLTFLoader(manager);loader.register(p=>{parser=p;return {name:'LOCAL_RESOURCE_OWNER',afterRoot(gltf){for(const scene of gltf.scenes)scene.traverse(collect);}};});
  const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),directory=new URL(meta.entry.includes('/')?meta.entry.slice(0,meta.entry.lastIndexOf('/')+1):'./',base).href;
  const gltf=await loader.parseAsync(data,directory);root=gltf.scene;
  if(signal.aborted)throw Error('Importação cancelada');
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  if(bounds.isEmpty()||![...size.toArray()].every(Number.isFinite)||Math.max(...size.toArray())<=0)throw Error('Modelo sem volume válido');
  const item={root,bounds,adopt(art){if(disposed||adopted)throw Error('Asset já adotado/descartado');for(const r of resources)art.own(r);adopted=true;return root;},dispose,
   info:{materials:[...resources].filter(r=>r.isMaterial).map(m=>({type:m.type,color:m.color?.getHexString(),metalness:m.metalness,roughness:m.roughness,maps:Object.entries(m).filter(([,v])=>v?.isTexture).map(([k])=>k)})),resources:resources.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}}};
  if(meta.profile==='articulated'){
   item.createActor=(art,options)=>{if(disposed)throw Error('Asset descartado');if(!adopted){for(const r of resources)art.own(r);adopted=true;}const actor=createAnimatedActor(root,gltf.animations,options);actors.add(actor);art.own(actor);return actor;};
   item.info.articulated={...verified,json:undefined};
  }
  parser=null;return item;
 }catch(error){if(parser)for(const object of parser.associations.keys()){collect(object);object.traverse?.(collect);}dispose();throw error;}
};
