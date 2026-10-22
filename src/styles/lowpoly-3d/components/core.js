// Resource ownership remains with art/the engine; factories never own a renderer.
export function createKit(art){
    const {THREE,scene,config:c}=art,P=c.palette;
    const materials=Object.fromEntries(Object.entries(P).filter(([key])=>key!=='sky').map(([key,color])=>[key,art.material(color)]));
    materials.glow.emissive.set(P.glow);materials.glow.emissiveIntensity=c.effects.emission;
    const eyeMaterial=art.material(P.glow,{emissive:P.glow,emissiveIntensity:.65});
    const box=art.geometry(new THREE.BoxGeometry(1,1,1)),rock=art.geometry(new THREE.IcosahedronGeometry(1,0)),limb=art.geometry(new THREE.CylinderGeometry(.07,.07,1,5));
    function mesh(g,m,parent,position=[0,0,0],scale=[1,1,1]){const o=art.mesh(g,m,parent);o.position.fromArray(position);o.scale.fromArray(scale);return o;}

    return {art,THREE,scene,c,P,materials,eyeMaterial,box,rock,limb,mesh};
}
export function pointLight(kit,color,intensity,distance,position,parent=kit.scene){
  const light=new kit.THREE.PointLight(color,intensity,distance,2);light.position.fromArray(position);parent.add(light);return light;
}
export function cameraMove(art,from,to,target,amount){
  art.cameraPose(from.map((v,i)=>v+(to[i]-v)*amount),target);
}
// Integrate piecewise-constant angular speeds. Sampling order never affects phase.
export function phaseAt(t,segments){
  let phase=0;for(let i=0;i<segments.length;i++)phase+=Math.max(0,Math.min(t,segments[i+1]?.[0]??t)-segments[i][0])*segments[i][1];return phase;
}
