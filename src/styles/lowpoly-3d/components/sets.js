export function ground(kit,size=30,depth=.35){
  return kit.mesh(kit.box,kit.materials.ground,kit.scene,[0,-depth/2,0],[size,depth,size]);
}
export function rockField(kit,placements,material='rock'){
  return placements.map(({position,scale,rotation=[0,0,0]})=>{const o=kit.mesh(kit.rock,kit.materials[material],kit.scene,position,scale);o.rotation.set(...rotation);return o;});
}

export function underwaterLight(kit,{fogNear=6,fogFar=24,key='#92DCD0',groundColor='#123D49'}={}){
  kit.scene.fog=new kit.THREE.Fog(kit.P.sky,fogNear,fogFar);
  for(const light of kit.scene.children){
    if(light.isHemisphereLight){light.color.set('#8CC4D0');light.groundColor.set(groundColor);}
    if(light.isDirectionalLight)light.color.set(key);
  }
}

export function createKelp(kit,placements){
  const {art,mesh,limb,rock,materials:m}=kit;
  const plants=placements.map(({position,height,phase=0})=>{
    const root=art.group();root.position.fromArray(position);
    mesh(limb,m.ridge,root,[0,height/2,0],[.55,height,.55]);
    for(const side of [-1,1]){const leaf=mesh(rock,m.sand,root,[side*.17,height*(side<0?.5:.8),0],[.1,height*.3,.07]);leaf.rotation.z=side*-.5;}
    return {root,phase};
  });
  return {apply(t){plants.forEach(({root,phase})=>root.rotation.set(.06*Math.sin(t*1.3+phase),0,.08*Math.sin(t+phase)));}};
}

export function createBubbles(kit,placements,{height=4,speed=.3}={}){
  const material=kit.art.material('#619FAD'),bubbles=placements.map(p=>({mesh:kit.mesh(kit.rock,material,kit.scene,p.position,[p.size,p.size,p.size]),...p}));
  return {apply(t){for(const b of bubbles)b.mesh.position.set(b.position[0]+.06*Math.sin(t+b.position[1]),(b.position[1]+t*speed)%height,b.position[2]);}};
}
