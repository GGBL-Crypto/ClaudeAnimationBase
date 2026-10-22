import {inspectArticulated} from './articulated.js';
// Shared admission checks. No decoder, provider or rendering library lives here.
export const ASSET_LIMITS=Object.freeze({fileBytes:16*1024*1024,totalBytes:32*1024*1024,decodedBytes:64*1024*1024,maxDimension:2048,maxFiles:64,triangles:30000});
export const safePath=p=>typeof p==='string'&&/^[a-zA-Z0-9_-]+(?:[./][a-zA-Z0-9_-]+)*$/.test(p)&&!p.split('/').some(s=>s==='.'||s==='..')&&!p.includes('..');
const fail=message=>{throw Error('Asset: '+message);};
export function imageInfo(bytes,extension){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width,height,alpha=false;
 if(extension==='png'){
  if(bytes.length<45||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n)||v.getUint32(8)!==13||v.getUint32(12)!==0x49484452||v.getUint32(bytes.length-8)!==0x49454e44)fail('PNG inválido');
  width=v.getUint32(16);height=v.getUint32(20);alpha=[4,6].includes(bytes[25]);
 }else{
  if(bytes.length<4||v.getUint16(0)!==0xffd8||v.getUint16(bytes.length-2)!==0xffd9)fail('JPEG inválido');
  let i=2;while(i+4<bytes.length){if(bytes[i++]!==255)fail('JPEG marker inválido');const marker=bytes[i++];if(marker===0xda)break;const length=v.getUint16(i);if(length<2||i+length>bytes.length)fail('JPEG truncado');if([0xc0,0xc1,0xc2].includes(marker)){height=v.getUint16(i+3);width=v.getUint16(i+5);break;}i+=length;}
 }
 if(!width||!height||Math.max(width,height)>ASSET_LIMITS.maxDimension)fail('dimensões de imagem inválidas/excedidas');
 return {width,height,alphaChannel:alpha,decodedBytes:width*height*4*4/3}; // RGBA + mip chain, conservative for RGB too
}
export function gltfInfo(bytes,extension,files,entryPath,profile='static'){
 if(!['static','articulated'].includes(profile)||profile==='articulated'&&extension!=='glb')fail('perfil GLTF inválido');
 let json,binBytes=0;
 if(extension==='glb'){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.length||v.getUint32(16,true)!==0x4e4f534a)fail('GLB inválido');
  const n=v.getUint32(12,true);if(n%4||20+n>bytes.length)fail('GLB truncado');json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n)).trim());
  if(20+n<bytes.length){if(28+n>bytes.length||v.getUint32(24+n,true)!==0x004e4942||28+n+v.getUint32(20+n,true)!==bytes.length)fail('GLB BIN inválido');binBytes=v.getUint32(20+n,true);}
 }else json=JSON.parse(new TextDecoder().decode(bytes));
 if(json.asset?.version!=='2.0'||json.asset.minVersion&&json.asset.minVersion!=='2.0')fail('glTF 2.0 obrigatório');
 for(const [key,max]of Object.entries({nodes:512,meshes:128,accessors:2048,bufferViews:4096,buffers:64,materials:64,textures:16,images:16,scenes:8}))if(json[key]&&(!Array.isArray(json[key])||json[key].length>max))fail('limite estrutural glTF: '+key);
 const parents=new Map();for(const [i,node]of(json.nodes||[]).entries()){
  for(const [key,length]of Object.entries({translation:3,rotation:4,scale:3,matrix:16}))if(node[key]&&(!Array.isArray(node[key])||node[key].length!==length||node[key].some(n=>!Number.isFinite(n)||Math.abs(n)>10000)))fail('transform glTF inválido');
  for(const child of node.children||[]){if(!Number.isInteger(child)||!json.nodes[child]||parents.has(child))fail('hierarquia glTF inválida');parents.set(child,i);}
 }
 for(let i=0;i<(json.nodes?.length||0);i++){const seen=new Set();for(let n=i;n!==undefined;n=parents.get(n)){if(seen.has(n))fail('ciclo na hierarquia glTF');seen.add(n);}}
 if([...(json.extensionsUsed||[]),...(json.extensionsRequired||[])].some(e=>!['KHR_texture_transform','KHR_materials_unlit'].includes(e)))fail('extensões glTF não admitidas neste piloto');
 if(profile==='static'&&(json.skins?.length||json.animations?.length||(json.meshes||[]).some(m=>m.primitives.some(p=>p.targets?.length))))fail('skins, clips e morphs exigem perfil articulado');
 const prefix=entryPath.includes('/')?entryPath.slice(0,entryPath.lastIndexOf('/')+1):'';
 const resolveUri=uri=>{if(!safePath(uri)||!files.has(prefix+uri))fail('referência externa/ausente: '+uri);return files.get(prefix+uri);};
 for(const [i,b]of(json.buffers||[]).entries()){if(!Number.isInteger(b.byteLength)||b.byteLength<0)fail('buffer inválido');const size=b.uri?resolveUri(b.uri).bytes:i===0?binBytes:0;if(b.byteLength>size)fail('buffer truncado');}
 for(const view of json.bufferViews||[]){const size=json.buffers?.[view.buffer]?.byteLength;if(size===undefined||!Number.isInteger(view.byteLength)||view.byteLength<0||(view.byteOffset||0)<0||(view.byteOffset||0)+view.byteLength>size)fail('bufferView fora do buffer');}
 const counts={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
 for(const a of json.accessors||[]){const view=json.bufferViews?.[a.bufferView],element=counts[a.type]*sizes[a.componentType];if(!view||!element||a.sparse||!Number.isInteger(a.count)||a.count<0||(a.byteOffset||0)<0||(a.byteOffset||0)+Math.max(0,a.count-1)*(view.byteStride||element)+(a.count?element:0)>view.byteLength)fail('accessor inválido/excedido');}
 let decodedBytes=0;
 for(const im of json.images||[]){if(im.uri){const f=resolveUri(im.uri);if(!['png','jpg','jpeg'].includes(f.path.split('.').pop()))fail('textura inválida');}else{const view=json.bufferViews?.[im.bufferView];if(!view||json.buffers[view.buffer].uri||!['image/png','image/jpeg'].includes(im.mimeType))fail('imagem embutida inválida');const start=bytes.length-binBytes+(view.byteOffset||0);decodedBytes+=imageInfo(bytes.subarray(start,start+view.byteLength),im.mimeType==='image/png'?'png':'jpg').decodedBytes;}}
 let triangles=0;for(const m of json.meshes||[])for(const p of m.primitives){if(p.mode!==undefined&&p.mode!==4)fail('somente triângulos');const a=json.accessors?.[p.indices??p.attributes?.POSITION];if(!a)fail('primitiva sem accessor');triangles+=a.count/3;}
 if(triangles>ASSET_LIMITS.triangles||decodedBytes>ASSET_LIMITS.decodedBytes)fail('orçamento GLTF excedido');
 const articulated=profile==='articulated'?inspectArticulated(json,bytes,bytes.length-binBytes):{};
 return {json,triangles,decodedBytes,meshes:json.meshes?.length||0,materials:json.materials?.length||0,textures:json.textures?.length||0,skins:0,clips:0,morphs:0,...articulated};
}
