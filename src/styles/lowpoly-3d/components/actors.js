import {pointLight} from './core.js';

export function createRobot(kit){
    const {art,THREE,c,materials,eyeMaterial,box,rock,limb,mesh}=kit;
    const robot=art.group();robot.name='robot';robot.rotation.y=Math.PI/2;robot.scale.set(c.character.width/.66*c.character.unit,c.character.height/1.55*c.character.unit,c.character.width/.66*c.character.unit);
    const upper=art.group(robot);upper.position.y=.78;
    mesh(box,materials.body,upper,[0,.26,0],[.64,.56,.42]);
    mesh(box,materials.accent,upper,[0,.35,.221],[.2,.13,.025]);
    mesh(box,materials.joint,upper,[0,.62,0],[.19,.16,.19]);
    const head=art.group(upper);head.position.y=.88;
    mesh(box,materials.body,head,[0,0,0],[.75,.45,.5]);
    mesh(box,materials.visor,head,[0,0,.256],[.64,.29,.035]);
    const eyes=[-.17,.17].map(x=>mesh(box,eyeMaterial,head,[x,.02,.28],[.07,.13,.025]));
    const antenna=mesh(limb,materials.joint,head,[0,.34,0],[.45,.22,.45]);
    mesh(rock,materials.accent,head,[0,.48,0],[.075,.075,.075]);
    const arms=[-1,1].map(side=>{
      const pivot=art.group(upper);pivot.position.set(side*.42,.39,0);
      mesh(box,materials.body,pivot,[0,-.23,0],[.17,.43,.2]);mesh(box,materials.joint,pivot,[0,-.49,.015],[.22,.14,.23]);return pivot;
    });
    const legs=[-1,1].map(side=>{
      const foot=mesh(box,materials.joint,robot,[side*.2,.07,0],[.25,.14,.43]);
      const thigh=mesh(limb,materials.body,robot),shin=mesh(limb,materials.accent,robot);return{foot,thigh,shin,side};
    });
    const up=new THREE.Vector3(0,1,0),a=new THREE.Vector3(),b=new THREE.Vector3(),delta=new THREE.Vector3();
    function bone(o,p0,p1){a.fromArray(p0);b.fromArray(p1);delta.subVectors(b,a);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,delta.clone().normalize());o.scale.set(1,delta.length(),1);}

    return {root:robot,legs,apply(p){
      robot.position.set(p.x,0,0);upper.position.set(0,.78+p.bob,0);upper.rotation.set(p.lean,0,0);upper.scale.set(1,1,1);
      head.rotation.set(p.headPitch,p.headYaw,p.headTilt);head.position.set(0,.88+Math.max(0,p.surprise)*.08,0);
      eyes.forEach(eye=>eye.scale.set(.07,.13*p.eye,.025));
      arms.forEach((arm,i)=>arm.rotation.set(Math.sin(p.travel/c.character.stepCycle*Math.PI*2+(i?Math.PI:0))*.18*(p.strideWeight??0)-p.arms*.5,0,(i?1:-1)*p.arms));
      legs.forEach((leg,i)=>{
        const f=p.feet[i],x=leg.side*.2,y=f.y/robot.scale.y,z=f.z/robot.scale.z;leg.foot.position.set(x,.07+y,z);
        bone(leg.thigh,[x,.79+p.bob,0],[x,.43+y*.45,z*.4+.12]);bone(leg.shin,[x,.43+y*.45,z*.4+.12],[x,.15+y,z]);
      });

      antenna.rotation.set(0,0,p.surprise*.08);
    }};
}

// All actors face local +Z. The film supplies world poses and narrative timing.
export function createSubmarine(kit){
  const {art,THREE,materials:m,mesh,box,limb}=kit,root=art.group();root.name='submarine';
  const hull=art.material(kit.P.body,{emissive:kit.P.body,emissiveIntensity:.12});
  const sphere=art.geometry(new THREE.SphereGeometry(1,10,6));
  mesh(sphere,hull,root,[0,0,0],[.49,.49,1.06]);
  mesh(sphere,m.visor,root,[0,.02,.82],[.37,.34,.39]);
  const rim=art.geometry(new THREE.CylinderGeometry(.24,.24,.07,10));
  const port=mesh(rim,m.accent,root,[-.475,.03,.08]);port.rotation.z=Math.PI/2;
  const glass=mesh(rim,m.visor,root,[-.516,.03,.08],[.78,.5,.78]);glass.rotation.z=Math.PI/2;
  mesh(box,hull,root,[0,.52,-.2],[.38,.34,.48]);
  mesh(limb,m.joint,root,[0,.83,-.18],[1,.36,1]);
  mesh(box,m.joint,root,[0,1.01,-.1],[.14,.13,.27]);
  for(const x of [-1,1])mesh(box,m.accent,root,[x*.57,-.12,-.42],[.51,.07,.45]);
  mesh(box,m.accent,root,[0,.32,-.84],[.07,.5,.42]);
  const propeller=art.group(root);propeller.position.z=-1.14;
  mesh(sphere,m.joint,propeller,[0,0,0],[.14,.14,.16]);
  for(let i=0;i<3;i++){const blade=art.group(propeller);blade.rotation.z=i*Math.PI*2/3;mesh(box,m.accent,blade,[0,.21,0],[.13,.38,.06]);}
  const lamp=art.material('#FFE7AE',{emissive:'#FFE7AE',emissiveIntensity:.7});
  for(const x of [-.27,.27])mesh(sphere,lamp,root,[x,-.19,.84],[.08,.08,.09]);
  const light=pointLight(kit,'#B9E5CF',2.4,4,[0,-.12,1.2],root);
  return {root,apply({position,rotation,propellerPhase,lampIntensity=2.4}){
    root.position.fromArray(position);root.rotation.set(...rotation);propeller.rotation.set(0,0,propellerPhase);light.intensity=lampIntensity;
  }};
}

export function createJellyfish(kit){
  const {art,THREE,mesh,materials:m}=kit,root=art.group();root.name='jellyfish';
  const glow=art.material(kit.P.glow,{emissive:kit.P.glow,emissiveIntensity:.6});
  const dome=art.geometry(new THREE.SphereGeometry(.47,8,4,0,Math.PI*2,0,Math.PI/2));
  const bell=mesh(dome,glow,root,[0,0,0],[1,.8,1]);
  const core=mesh(kit.rock,m.accent,root,[0,.12,0],[.13,.13,.13]);
  const tentacle=art.geometry(new THREE.CylinderGeometry(.045,.012,.78,4));
  const legs=Array.from({length:6},(_,i)=>{
    const angle=i*Math.PI/3,pivot=art.group(root);pivot.position.set(Math.cos(angle)*.28,-.02,Math.sin(angle)*.28);
    mesh(tentacle,glow,pivot,[0,-.39,0]);return pivot;
  });
  const light=pointLight(kit,kit.P.glow,1.3,3.8,[0,.12,0],root);
  return {root,apply({position,rotation=[0,0,0],phase,brightness=1}){
    root.position.fromArray(position);root.rotation.set(...rotation);
    const pulse=Math.sin(phase);bell.scale.set(1+.09*pulse,.8-.08*pulse,1+.09*pulse);
    core.rotation.set(0,phase*.25,0);
    legs.forEach((leg,i)=>leg.rotation.set(.12*Math.sin(phase+i),0,.15*Math.sin(phase+i*.9)));
    glow.emissiveIntensity=.6*brightness;light.intensity=1.3*brightness;
  }};
}
