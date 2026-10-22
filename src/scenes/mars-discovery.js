// One original film. Static construction is separate from the pure pose/choreography.
(() => {
  let world;
  window.marsPose=t=>{
    const travel=STYLE.character.stepCycle*ease(seg(t,0,1)), phase=travel/STYLE.character.stepCycle;
    const feet=[0,.5].map(offset=>{
      const q=phase+offset,n=Math.floor(q+1e-10),f=q-n,swing=seg(f,.6,1);
      return {z:n*STYLE.character.stepCycle-offset*STYLE.character.stepCycle+STYLE.character.stepCycle/4+STYLE.character.stepCycle*ease(swing)-travel,y:STYLE.character.stepHeight*Math.sin(swing*Math.PI),stance:f<.6};
    });
    const surprise=spring(t,1.78,7,16),lean=kf(t,[[0,0],[1,0],[1.65,.22],[1.86,-.12],[2.25,.04],[3,.04]]);
    return {x:-1.85+travel,feet,bob:.025*(1-Math.cos(phase*TAU*2)),lean,
      headPitch:kf(t,[[0,0],[1,0],[1.55,.28],[1.9,-.12],[2.3,.04],[3,.04]]),
      headYaw:kf(t,[[0,0],[1.8,0],[2.4,-.28],[3,-.28]]),headTilt:kf(t,[[0,0],[2.1,0],[2.6,-.16],[3,-.16]]),
      arms:kf(t,[[0,0],[1.5,0],[1.95,.5],[2.5,.32],[3,.32]]),surprise,
      eye:1+.45*ease(seg(t,1.78,1.95)),glow:.28+.72*ease(seg(t,.9,1.4))+.08*Math.sin(t*TAU*1.5),camera:ease(seg(t,0,3)),travel,strideWeight:t<1?1:0};
  };
  window.buildLowpolyScene=art=>{
    const {createKit,createRobot,ground,rockField,pointLight,cameraMove}=LowpolyComponents;
    const kit=createKit(art),{THREE,scene,c,P,materials,box,rock,mesh}=kit;
    ground(kit);
    rockField(kit,Array.from({length:5},(_,i)=>{
      const h=.7+hash(i+c.texture.seed)*1.5;
      return {position:[-7+i*3.4,h*.35,-5-hash(i+93)*3],scale:[2.9,h,1.6],rotation:[0,hash(i+77)*2,0]};
    }),'ridge');
    rockField(kit,Array.from({length:9},(_,i)=>{
      const x=-4+hash(i+c.texture.seed+21)*8,z=(i%2?1:-1)*(1.3+hash(i+8)*2.3),s=.08+hash(i+28)*.18;
      return {position:[x,s*.3,z],scale:[s,s*.65,s],rotation:[.2,hash(i+52)*TAU,.15]};
    }));
    const stoneRoot=art.group();stoneRoot.position.set(.95,.19,0);
    const stone=mesh(rock,materials.glow,stoneRoot,[0,0,0],[.24,.3,.22]);stone.rotation.set(.3,.5,.22);
    mesh(rock,materials.rock,scene,[.95,.06,0],[.4,.12,.34]);
    const stoneLight=pointLight(kit,P.glow,c.lighting.stone,2.6,[.95,.4,.15]);
    const actor=createRobot(kit),robot=actor.root,legs=actor.legs;
    world={pose(p,t){
      actor.apply(p);
      materials.glow.emissiveIntensity=c.effects.emission*p.glow;stoneLight.intensity=c.lighting.stone*p.glow;
      stone.scale.set(.24,.3,.22);stoneRoot.rotation.set(0,0,0);
      const cp=c.camera.position,ep=c.camera.endPosition,target=c.camera.target;
      cameraMove(art,[cp.x,cp.y,cp.z],[ep.x,ep.y,ep.z],[target.x,target.y,target.z],p.camera);
      window.marsDiagnostics={t,feet:legs.map(leg=>{const v=leg.foot.getWorldPosition(new THREE.Vector3());return{x:v.x,y:v.y-.07*robot.scale.y,z:v.z};}),stone:[.95,.19,0],pose:p};
    }};
  };
  window.disposeLowpolyScene=()=>{world=null;};
  shots([[0,t=>world.pose(marsPose(t),t)]]);
})();
