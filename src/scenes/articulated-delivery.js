(() => {
 let art,actor,wrapper,lid,signal,rootSamples;
 const walkEnd=3*.958333313465118;
 const walkSpeed=4/9,walkDuration=.958333313465118;
 const ramp=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
 function performanceAt(t){
  const stop=ramp(t,walkEnd,walkEnd+.3);
  const actions=t<walkEnd+.3?[{clip:'Walking',start:Math.max(0,t-walkEnd),speed:walkSpeed,weight:1-stop},{clip:'Idle',weight:stop}]:t<5.2?[{clip:'Idle'}]:t<7?[{clip:'No',start:5.2,loop:false}]:[{clip:'Idle'}];
  const surprise=ramp(t,3.65,4.05)*(1-ramp(t,4.85,5.2)),angry=ramp(t,5.2,5.5)*(1-ramp(t,7,7.7));
  return {actions,expressions:{surprise,angry}};
 }
 window.buildLowpolyScene=a=>{
  art=a;const {THREE,scene}=a,item=assetSession.items.get('expressive-robot');
  actor=item.createActor(a,{expressions:{surprise:'Surprised',angry:'Angry',sad:'Sad'}});wrapper=a.group();wrapper.add(actor.root);
  const height=item.bounds.max.y-item.bounds.min.y,scale=2.2/height;
  // Scaling belongs to the outer group: the controller restores imported transforms on seek.
  actor.root.scale.setScalar(1);
  // Film-specific authored contact anchors, not an IK/physics or retargeting system.
  actor.apply(0,{actions:[{clip:'Walking'}]});
  const footBones=['FootL','FootR'].map(name=>actor.root.getObjectByName(name));
  const soles=footBones.map((bone,side)=>{
   // Measure each sole in its flat stance, rather than the other foot's swing pose.
   actor.apply(walkDuration*(side?.65:.2),{actions:[{clip:'Walking',loop:false}]});
   const points=[];actor.root.traverse(mesh=>{if(mesh.isSkinnedMesh){const joint=mesh.skeleton.bones.indexOf(bone),joints=mesh.geometry.attributes.skinIndex;for(let i=0;i<joints.count;i++)if(joints.getX(i)===joint)points.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));}});
   const min=Math.min(...points.map(p=>p.y)),bottom=points.filter(p=>p.y<min+.005),point=bottom.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/bottom.length);return bone.worldToLocal(point);
  });
  const feet=()=>footBones.map((bone,i)=>wrapper.worldToLocal(bone.localToWorld(soles[i].clone())));
  const sample=phase=>{actor.apply(phase,{actions:[{clip:'Walking',loop:false}]});return feet();};
  const first=sample(0),mid=sample(walkDuration/2),last=sample(walkDuration),stride=first[0].z-mid[0].z+mid[1].z-last[1].z;
  const endPhase=(walkEnd*walkSpeed)%walkDuration,endFeet=sample(endPhase),endDistance=stride+first[0].z-endFeet[0].z;
  actor.apply(walkEnd+.31,performanceAt(walkEnd+.31));const finalDistance=endDistance+endFeet[0].z-feet()[0].z;
  rootSamples=[];
  for(let i=0;i<=8*48;i++){
   const t=i/48;actor.apply(t,performanceAt(t));const p=feet(),elapsed=Math.min(t,walkEnd)*walkSpeed,phase=elapsed%walkDuration,cycles=Math.floor(elapsed/walkDuration);
   // Finish while the right foot is airborne, then keep the left support fixed through the blend.
   const distance=t>=walkEnd?endDistance+endFeet[0].z-p[0].z:cycles*stride+(phase<walkDuration/2?first[0].z-p[0].z:first[0].z-mid[0].z+mid[1].z-p[1].z);
   rootSamples.push([.3+(distance-finalDistance)*scale,-(t>=walkEnd?p[0].y:Math.min(p[0].y,p[1].y))*scale,0]);
  }
  wrapper.scale.setScalar(scale);wrapper.rotation.y=Math.PI/2;
  const floor=a.mesh(a.geometry(new THREE.PlaneGeometry(50,50)),a.material('#263F50'),scene);floor.rotation.x=-Math.PI/2;floor.position.y=-.025;
  const box=a.mesh(a.geometry(new THREE.BoxGeometry(.65,.5,.65)),a.material('#D5D9CB'),scene);box.position.set(1.65,.25,0);
  lid=a.group();lid.position.set(1.65,.52,-.325);const plate=a.mesh(a.geometry(new THREE.BoxGeometry(.72,.07,.72)),a.material('#F0B65A'),lid);plate.position.z=.325;
  signal=a.mesh(a.geometry(new THREE.IcosahedronGeometry(.15,1)),a.material('#68E3CF',{emissive:'#68E3CF',emissiveIntensity:.65}),scene);
  const ring=a.mesh(a.geometry(new THREE.TorusGeometry(.24,.018,4,24)),a.material('#68E3CF'),scene);ring.position.set(1.65,.02,0);ring.rotation.x=-Math.PI/2;
  scene.fog=new THREE.Fog('#182C3B',15,40);
  window.actorExperiment={actor,wrapper,performanceAt,walkEnd,scale,footBones,soles,rootSamples};
 };
 function pose(t){
  const b=PROJECT.id.endsWith('-b'),state=performanceAt(t);
  actor.apply(t,b?state:{actions:[{clip:'Idle',speed:0}]});
  const index=Math.min(rootSamples.length-2,Math.floor(Math.max(0,t)*48)),amount=Math.min(1,Math.max(0,t)*48-index);wrapper.position.fromArray(rootSamples[index].map((v,k)=>v+(rootSamples[index+1][k]-v)*amount));wrapper.rotation.set(0,Math.PI/2,0);
  lid.rotation.x=-1.4*ease(ramp(t,3.3,3.75));signal.position.set(1.65,.37+1.3*ease(ramp(t,3.45,3.95)),0);signal.scale.setScalar(.001+.999*ramp(t,3.4,3.65));
  if(t<4)art.cameraPose([4.7,2.8,6.4],[0,1.05,0]);else art.cameraPose([4.8,2.3,2.4],[.55,1.4,0]);
 }
 window.disposeLowpolyScene=()=>{actor?.dispose();actor=null;wrapper=null;art=null;lid=null;signal=null;rootSamples=null;window.actorExperiment=null;};
 shots([[0,pose],[4,pose]]);
})();
