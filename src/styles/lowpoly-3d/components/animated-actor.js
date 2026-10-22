import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// Independent skeleton, mixer and property bindings; geometry/materials remain pack-owned.
export function createAnimatedActor(template,clips,{expressions={}}={}){
 const root=clone(template),mixer=new THREE.AnimationMixer(root),nodes=[],skeletons=new Set(),morphs=[];
 root.traverse(o=>{
  nodes.push({node:o,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});
  if(o.isSkinnedMesh){skeletons.add(o.skeleton);o.frustumCulled=false;} // Animated bounds are not the rest-pose bounds.
  if(o.morphTargetInfluences)morphs.push(o);
 });
 const actions=new Map(clips.map(clip=>[clip.name,mixer.clipAction(clip)])),mapping=new Map();let disposed=false;
 for(const [name,target]of Object.entries(expressions)){
  const bindings=morphs.filter(o=>Object.hasOwn(o.morphTargetDictionary,target)).map(o=>[o,o.morphTargetDictionary[target]]);
  if(!bindings.length)throw Error('Unknown expression target: '+target);mapping.set(name,bindings);
 }
 const controller={root,
  apply(t,{actions:requested=[],expressions:face={}}={}){
   if(disposed)throw Error('Actor disposed');if(!Number.isFinite(t)||!Array.isArray(requested)||requested.length>4)throw Error('Invalid actor time/actions');
   const selected=new Map();let sum=0;
   for(const state of requested){
    const {clip,start=0,speed=1,weight=1,loop=true}=state;
    if(!actions.has(clip)||selected.has(clip)||![start,speed,weight].every(Number.isFinite)||speed<0||speed>4||weight<0||weight>1||typeof loop!=='boolean')throw Error('Invalid actor action: '+clip);
    if(t>=start){selected.set(clip,{time:(t-start)*speed,weight,loop});sum+=weight;}
   }
   if(sum>1.000001)throw Error('Actor weights exceed one');
   for(const [name,weight]of Object.entries(face))if(!mapping.has(name)||!Number.isFinite(weight)||weight<0||weight>1)throw Error('Invalid expression: '+name);
   // Clear schedules, fades, warps, loop counters and original-state bindings on every seek.
   mixer.stopAllAction();mixer.time=0;mixer.timeScale=1;
   for(const {node,position,quaternion,scale}of nodes){node.position.copy(position);node.quaternion.copy(quaternion);node.scale.copy(scale);}
   for(const mesh of morphs)mesh.morphTargetInfluences.fill(0);
   for(const [name,action]of actions){
    const state=selected.get(name);if(!state||state.weight===0)continue;
    action.reset();action.stopFading();action.stopWarping();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
    action.enabled=true;action.setEffectiveWeight(state.weight);action.setEffectiveTimeScale(1);
    const duration=action.getClip().duration;action.time=state.loop?state.time%duration:Math.min(state.time,duration);action.play();action.paused=true;
   }
   // update(0) samples assigned local times; no elapsed delta or accumulated mixer clock.
   mixer.update(0);
   for(const bindings of mapping.values())for(const [mesh,index]of bindings)mesh.morphTargetInfluences[index]=0;
   for(const [name,weight]of Object.entries(face))for(const [mesh,index]of mapping.get(name))mesh.morphTargetInfluences[index]=weight;
   root.updateMatrixWorld(true);for(const skeleton of skeletons)skeleton.update();return root;
  },
  info(){return {disposed,bones:new Set([...skeletons].flatMap(s=>s.bones)).size,skeletons:skeletons.size,clips:[...actions.keys()],expressions:[...mapping.keys()]};},
  dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(root);for(const skeleton of skeletons)skeleton.dispose();skeletons.clear();actions.clear();mapping.clear();nodes.length=0;morphs.length=0;root.removeFromParent();root.clear();}
 };
 return controller;
}
