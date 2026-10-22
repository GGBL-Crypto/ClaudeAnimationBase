// Deliberately bounded GLB profile. Static admission retains its original policy.
export const ACTOR_LIMITS=Object.freeze({bones:48,skins:4,meshes:8,triangles:10000,morphs:6,clips:24,tracks:256,seconds:30,values:500000,geometryBytes:16*1024*1024});
export function inspectArticulated(json,bytes,binStart){
 const fail=s=>{throw Error('Articulated GLB: '+s);},lim=ACTOR_LIMITS;
 if(json.buffers?.length!==1||json.buffers[0].uri)fail('one embedded buffer required');
 if((json.textures?.length||0)>2||(json.images?.length||0)>2)fail('texture budget');
 const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},types={5121:[1,'getUint8'],5123:[2,'getUint16'],5125:[4,'getUint32'],5126:[4,'getFloat32']};
 const cache=new Map();let values=0,geometryBytes=0;
 const accessor=index=>{
  if(cache.has(index))return cache.get(index);
  const a=json.accessors?.[index],view=json.bufferViews?.[a?.bufferView],type=types[a?.componentType],width=components[a?.type];
  if(!a||!view||!type||!width||a.sparse||a.count<1||a.count>30000)fail('unsupported accessor');
  const [size,get]=type,stride=view.byteStride||width*size,offset=(view.byteOffset||0)+(a.byteOffset||0);
  if(stride<width*size||stride%size||offset%size||!Number.isInteger(offset)||!Number.isInteger(stride)||view.byteStride&&stride>252||offset+(a.count-1)*stride+width*size>json.buffers[0].byteLength)fail('accessor layout');
  values+=a.count*width;geometryBytes+=a.count*width*size;if(values>lim.values||geometryBytes>lim.geometryBytes)fail('accessor budget');
  const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out=[];
  for(let i=0;i<a.count;i++)for(let k=0;k<width;k++){let v=data[get](binStart+offset+i*stride+k*size,true);if(!Number.isFinite(v))fail('non-finite accessor');if(a.normalized){if(a.componentType===5126)fail('normalized floats');v/=a.componentType===5121?255:65535;}out.push(v);}
  const result={...a,width,data:out};cache.set(index,result);return result;
 };
 for(let i=0;i<(json.accessors?.length||0);i++)accessor(i);
 const nodes=json.nodes||[],skins=json.skins||[],bones=new Set();
 const parents=new Map();for(const [i,node]of nodes.entries())for(const child of node.children||[])parents.set(child,i);
 if(json.scenes?.length!==1||!json.scenes[json.scene||0])fail('one scene required');
 const reachable=new Set(),visit=index=>{if(!nodes[index])fail('scene node');if(reachable.has(index))fail('duplicate scene node');reachable.add(index);for(const child of nodes[index].children||[])visit(child);};for(const index of json.scenes[json.scene||0].nodes||[])visit(index);
 if(skins.length>lim.skins)fail('skin budget');
 for(const skin of skins){
  if(!Array.isArray(skin.joints)||!skin.joints.length||skin.joints.length>lim.bones||new Set(skin.joints).size!==skin.joints.length)fail('invalid joints');
  for(const joint of skin.joints){if(!Number.isInteger(joint)||!nodes[joint]||!reachable.has(joint))fail('missing bone');bones.add(joint);if(skin.skeleton!==undefined){let n=joint;while(n!==undefined&&n!==skin.skeleton)n=parents.get(n);if(n===undefined)fail('bone outside skeleton');}}
  if(skin.skeleton!==undefined&&!nodes[skin.skeleton])fail('missing skeleton root');
  const matrices=accessor(skin.inverseBindMatrices);if(matrices.type!=='MAT4'||matrices.componentType!==5126||matrices.count!==skin.joints.length)fail('inverse bind matrices');
  for(let i=0;i<matrices.count;i++){
   const m=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>matrices.data[i*16+c*4+r]));
   for(let c=0;c<4;c++){let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(m[r][c])>Math.abs(m[pivot][c]))pivot=r;[m[c],m[pivot]]=[m[pivot],m[c]];if(Math.abs(m[c][c])<1e-12)fail('singular bind matrix');for(let r=c+1;r<4;r++){const f=m[r][c]/m[c][c];for(let k=c;k<4;k++)m[r][k]-=f*m[c][k];}}
  }
 }
 if(bones.size>lim.bones)fail('bone budget');
 let meshes=0,triangles=0,morphs=0,skinnedMeshes=0;const expressions=new Set();
 for(const node of nodes){
  if(node.rotation&&Math.abs(Math.hypot(...node.rotation)-1)>.02||node.scale?.some(v=>Math.abs(v)<1e-8))fail('invalid bone transform');
  if(node.mesh===undefined){if(node.skin!==undefined)fail('skin without mesh');continue;}
  if(!reachable.has(nodes.indexOf(node)))fail('mesh outside scene');
  const mesh=json.meshes?.[node.mesh],skin=node.skin===undefined?null:skins[node.skin];if(!mesh||node.skin!==undefined&&!skin)fail('missing mesh/skin');
  if(mesh.primitives.length<1)fail('empty mesh');const targetCount=mesh.primitives[0].targets?.length||0;
  if(targetCount>lim.morphs||mesh.primitives.some(p=>(p.targets?.length||0)!==targetCount))fail('inconsistent morph count');morphs=Math.max(morphs,targetCount);
  const names=mesh.extras?.targetNames;if(names&&(names.length!==targetCount||new Set(names).size!==names.length||names.some(n=>typeof n!=='string'||!n)))fail('morph names');for(const name of names||[])expressions.add(name);
  for(const weights of [mesh.weights,node.weights])if(weights&&(weights.length!==targetCount||weights.some(v=>!Number.isFinite(v)||v<0||v>1)))fail('default morph weights');
  for(const p of mesh.primitives){
   meshes++;const position=accessor(p.attributes?.POSITION);if(position.type!=='VEC3'||position.componentType!==5126||position.data.some(v=>Math.abs(v)>10000))fail('position');
   for(const index of Object.values(p.attributes||{}))if(accessor(index).count!==position.count)fail('attribute count');
   if(p.indices!==undefined){const indices=accessor(p.indices);if(indices.type!=='SCALAR'||![5121,5123,5125].includes(indices.componentType)||indices.normalized||indices.data.some(v=>v>=position.count))fail('indices');triangles+=indices.count/3;}else triangles+=position.count/3;
   if(p.attributes.JOINTS_1!==undefined||p.attributes.WEIGHTS_1!==undefined)fail('only four influences supported');
   if(skin){
    skinnedMeshes++;const joints=accessor(p.attributes.JOINTS_0),weights=accessor(p.attributes.WEIGHTS_0);
    if(joints.type!=='VEC4'||![5121,5123].includes(joints.componentType)||joints.normalized||weights.type!=='VEC4'||!([5126].includes(weights.componentType)||[5121,5123].includes(weights.componentType)&&weights.normalized))fail('joints/weights types');
    if(joints.data.some(v=>v>=skin.joints.length)||weights.data.some(v=>v<0||v>1))fail('invalid skin influences');
    for(let i=0;i<weights.count;i++)if(Math.abs(weights.data.slice(i*4,i*4+4).reduce((a,b)=>a+b,0)-1)>.015)fail('unnormalized skin weights');
   }else if(p.attributes.JOINTS_0!==undefined||p.attributes.WEIGHTS_0!==undefined)fail('influences without skin');
   for(const target of p.targets||[]){if(!Object.hasOwn(target,'POSITION'))fail('position morph required');for(const [key,index]of Object.entries(target)){const a=accessor(index);if(!['POSITION','NORMAL','TANGENT'].includes(key)||a.type!=='VEC3'||a.componentType!==5126||a.count!==position.count)fail('invalid morph');}}
  }
 }
 if(meshes>lim.meshes||triangles>lim.triangles||triangles%1)fail('geometry budget');
 const clips=[];let tracks=0;
 for(const [i,clip]of(json.animations||[]).entries()){
  if(!clip.channels?.length||!clip.samplers?.length)fail('empty clip');const targets=new Set();let duration=0;
  for(const channel of clip.channels){
   tracks++;const target=channel.target,sampler=clip.samplers[channel.sampler],node=nodes[target?.node];
   if(!node||!['translation','rotation','scale','weights'].includes(target.path)||!sampler||node.matrix)fail('invalid track target');
   const key=target.node+':'+target.path;if(targets.has(key))fail('duplicate track');targets.add(key);
   const times=accessor(sampler.input),out=accessor(sampler.output),interpolation=sampler.interpolation||'LINEAR';
   if(!['LINEAR','STEP','CUBICSPLINE'].includes(interpolation)||times.type!=='SCALAR'||times.componentType!==5126||times.normalized||out.componentType!==5126)fail('track format');
   if(times.data.some((v,k)=>v<0||k>0&&v<=times.data[k-1]))fail('unordered keyframes');duration=Math.max(duration,times.data.at(-1));
   const count=target.path==='weights'?(json.meshes[node.mesh]?.primitives[0].targets?.length||0):target.path==='rotation'?4:3;
   if(!count||out.data.length!==times.count*count*(interpolation==='CUBICSPLINE'?3:1)||out.type!==(target.path==='weights'?'SCALAR':target.path==='rotation'?'VEC4':'VEC3'))fail('track dimensions');
   // glTF permits negative/overshooting morph weights (the official cube uses them).
   if(target.path==='weights'&&out.data.some(v=>Math.abs(v)>2))fail('morph keyframe range');
   if(target.path==='rotation')for(let k=interpolation==='CUBICSPLINE'?4:0;k<out.data.length;k+=interpolation==='CUBICSPLINE'?12:4)if(Math.abs(Math.hypot(...out.data.slice(k,k+4))-1)>.02)fail('rotation keyframe');
  }
  if(duration<=0||duration>lim.seconds)fail('clip duration');clips.push({name:clip.name||'animation_'+i,duration,tracks:clip.channels.length});
 }
 if(clips.length>lim.clips||tracks>lim.tracks||new Set(clips.map(c=>c.name)).size!==clips.length)fail('clip/track budget');
 if(!clips.length||!skinnedMeshes&&!morphs)fail('no articulated capabilities');
 return {bones:bones.size,skins:skins.length,clips:clips.length,clipInfo:clips,tracks,morphs,expressions:[...expressions],meshes,triangles,geometryBytes};
}
