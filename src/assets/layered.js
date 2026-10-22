// Authored 2D rigs only. No inferred limbs, mirrored views, IK or incremental state.
const fail=s=>{throw Error('Ator 2D: '+s);};
const pair=v=>Array.isArray(v)&&v.length===2&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=4096);
export function validateLayered(m,images){
 const a=m.actor,illustration=m.profile==='illustration-2d';
 if(m.style!=='watercolor'||!a||a.schemaVersion!==1||!m.identity?.modelVersion||!m.identity?.paletteVersion||!m.identity?.proportionsVersion||!Array.isArray(m.identity.palette)||!m.identity.palette.length||m.identity.palette.some(c=>!/^#[\da-f]{6}$/i.test(c)))fail('identidade versionada obrigatória');
 if(a.composition!=='scene-order-paper-grain'||!pair(a.size)||a.size.some(n=>n<=0)||!a.views||Object.keys(a.views).length>8)fail('composição/dimensões inválidas');
 if(!m.available?.views?.length||!m.available?.poses?.length||!m.available?.expressions?.length||JSON.stringify(Object.keys(a.views).sort())!==JSON.stringify([...m.available.views].sort()))fail('vistas declaradas divergentes');
 const used=new Set(),poses=new Set();
 for(const view of Object.values(a.views)){
  if(!view.poses||!Object.keys(view.poses).length||Object.keys(view.poses).length>16)fail('poses ausentes/excedidas');
  for(const [pose,rig]of Object.entries(view.poses)){
   poses.add(pose);if(!Array.isArray(rig.parts)||!rig.parts.length||rig.parts.length>32)fail('partes ausentes/excedidas');
   const parts=new Map();
   for(const p of rig.parts){
    if(!/^[a-z][a-zA-Z0-9-]*$/.test(p.id)||parts.has(p.id)||!pair(p.pivot)||!pair(p.offset)||!Number.isInteger(p.z)||!pair(p.rotation)||p.rotation[0]>p.rotation[1]||p.rotation.some(n=>Math.abs(n)>Math.PI)||!p.image)fail('parte/pivô/limite inválido');
    if(p.parent!==null&&typeof p.parent!=='string')fail('parent inválido');
    if(p.anchors&&Object.values(p.anchors).some(v=>!pair(v)))fail('anchor inválido');
    const variants=[p.image,...Object.values(p.variants||{})],base=images[p.image];
    for(const path of variants){const info=images[path];if(!info||!illustration&&!info.alphaChannel||path.split('.').pop()!=='png'||info.width!==base?.width||info.height!==base?.height||p.pivot[0]<0||p.pivot[1]<0||p.pivot[0]>=info.width||p.pivot[1]>=info.height)fail('PNG RGBA/alinhamento/pivô inválido');used.add(path);}
    parts.set(p.id,p);
   }
   if(rig.parts.filter(p=>p.parent===null).length!==1)fail('uma raiz obrigatória');
   if(illustration&&(rig.parts.length!==1||rig.parts[0].rotation.some(n=>n!==0)))fail('ilustração exige uma camada inteira sem articulações');
   for(const p of rig.parts){const seen=new Set();for(let q=p;q;q=q.parent===null?null:parts.get(q.parent)){if(seen.has(q.id))fail('ciclo de partes');seen.add(q.id);if(q.parent!==null&&!parts.has(q.parent))fail('parent ausente');}}
   for(const e of m.available.expressions)if(!rig.parts.some(p=>p.variants?.[e]))fail('expressão sem desenho');
  }
 }
 if(JSON.stringify([...poses].sort())!==JSON.stringify([...m.available.poses].sort()))fail('poses declaradas divergentes');
 return {partsFiles:[...used],views:m.available.views,poses:m.available.poses,expressions:m.available.expressions};
}
export function layeredPose(actor,{view,pose,expression,transforms={}}){
 const rig=actor.views[view]?.poses[pose];if(!rig)fail('vista/pose indisponível: '+view+'/'+pose);
 if(typeof expression!=='string')fail('expressão obrigatória');
 for(const id of Object.keys(transforms))if(!rig.parts.some(p=>p.id===id))fail('transform de parte ausente');
 const matrices=new Map(),result=[];
 function world(p){
  if(matrices.has(p.id))return matrices.get(p.id);
  const o=transforms[p.id]||{},r=o.rotation??0,sx=o.sx??1,sy=o.sy??1,dx=o.x??0,dy=o.y??0;
  if(![r,sx,sy,dx,dy].every(Number.isFinite)||r<p.rotation[0]||r>p.rotation[1]||sx<.9||sx>1.1||sy<.9||sy>1.1||Math.abs(dx)>10||Math.abs(dy)>10)fail('transform fora dos limites: '+p.id);
  const c=Math.cos(r),s=Math.sin(r),local=[c*sx,s*sx,-s*sy,c*sy,p.offset[0]+dx,p.offset[1]+dy];
  const parent=p.parent===null?[1,0,0,1,0,0]:world(rig.parts.find(q=>q.id===p.parent)),[a,b,c0,d,e,f]=parent,[g,h,i,j,k,l]=local;
  const matrix=[a*g+c0*h,b*g+d*h,a*i+c0*j,b*i+d*j,a*k+c0*l+e,b*k+d*l+f];matrices.set(p.id,matrix);return matrix;
 }
 const supported=rig.parts.some(p=>p.variants?.[expression]);if(!supported)fail('expressão indisponível: '+expression);
 for(const p of rig.parts)result.push({...p,matrix:world(p),file:p.variants?.[expression]||p.image});
 return result.sort((a,b)=>a.z-b.z||a.id.localeCompare(b.id));
}
