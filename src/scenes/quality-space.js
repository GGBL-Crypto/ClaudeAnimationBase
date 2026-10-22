// Same choreography/camera for P0/P1/P2. No Mars/Ocean story dependency.
(() => {
 let actor,art;
 window.buildLowpolyScene=a=>{
  art=a;const {THREE,scene,config:c}=a,{createKit}=LowpolyComponents,kit=createKit(a);
  scene.fog=new THREE.Fog(c.palette.sky,14,32);
  const pedestal=a.mesh(a.geometry(new THREE.CylinderGeometry(1.8,1.92,.28,48)),a.material('#243E4B'),scene);pedestal.position.y=.14;
  const ring=a.mesh(a.geometry(new THREE.TorusGeometry(1.77,.015,4,64)),a.material('#62CABB',{emissive:'#62CABB',emissiveIntensity:.4}),scene);ring.rotation.x=Math.PI/2;ring.position.y=.29;
  const ground=a.mesh(a.geometry(new THREE.PlaneGeometry(80,80)),a.material('#101D29'),scene);ground.rotation.x=-Math.PI/2;ground.position.y=-.015;
  actor=a.group();actor.name='quality-vehicle';
  if(PROJECT.assetRefs?.length){
   const item=assetSession.items.get('kenney-space-speeder'),model=item.adopt(a),size=item.bounds.getSize(new THREE.Vector3()),center=item.bounds.getCenter(new THREE.Vector3()),scale=2.4/Math.max(size.x,size.y,size.z);
   model.position.set(-center.x*scale,-item.bounds.min.y*scale,-center.z*scale);model.scale.setScalar(scale);actor.add(model);
  }else{
   const box=(color,p,s)=>kit.mesh(kit.box,a.material(color),actor,p,s);
   box('#E3E9F0',[0,.34,0],[1.05,.5,2.4]);box('#E5A14A',[0,.7,.04],[.66,.428,1]);
   box('#354957',[0,.92,-.05],[.55,.08,.8]);
   for(const x of [-.97,.97]){box('#B6C7D7',[x,.23,0],[.346,.3,1.45]);box('#5C6D78',[x,.22,.8],[.346,.28,.25]);}
  }
  if(PROJECT.id==='quality-space-p2'){
   a.environment(makeAssetRoom());scene.environmentIntensity=.55;
   const key=scene.children.find(o=>o.isDirectionalLight);key.intensity=1.6;
   const rim=new THREE.DirectionalLight('#8CCFE8',1.2);rim.position.set(-4,3,-3);scene.add(rim);
   const fill=new THREE.DirectionalLight('#FFBE78',.6);fill.position.set(3,2,4);scene.add(fill);
  }
  window.assetPilotDiagnostics={variant:PROJECT.id,model:PROJECT.assetRefs?.length?'kenney-space-speeder':'procedural',camera:[3.8,2.9,4.8],normalizedMaxExtent:2.4};
 };
 function pose(t){
  const amount=ease(seg(t,0,2));actor.position.set(0,.48+.045*Math.sin(Math.PI*amount),0);actor.rotation.set(0,-.24+.48*amount,0);actor.scale.set(1,1,1);
  art.cameraPose([3.8,2.9,4.8],[0,.9,0]);
 }
 window.disposeLowpolyScene=()=>{actor=null;art=null;};
 shots([[0,pose]]);
})();
