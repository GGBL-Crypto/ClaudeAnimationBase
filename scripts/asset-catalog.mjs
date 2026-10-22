import {readFileSync,realpathSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {safePath,ASSET_LIMITS,imageInfo,gltfInfo} from '../src/assets/format.js';
import {validateLayered} from '../src/assets/layered.js';
import {decodeRgba} from './png-rgba.mjs';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=s=>{throw Error('Catálogo: '+s);};
const hashOK=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const within=(root,path)=>{const r=relative(root,path);return r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r);};
export function readSafe(root,path){if(!safePath(path))fail('caminho inválido');root=realpathSync(root);const actual=realpathSync(resolve(root,path));if(!within(root,actual))fail('arquivo fora do pack');return readFileSync(actual);}
export function validateManifest(m,read){
 if(m.schemaVersion!==1||!/^[a-z][a-z0-9-]*$/.test(m.id)||!/^\d+\.\d+\.\d+$/.test(m.version))fail('ID/versão inválidos');
 if(!['cc0','licensed','original','generated'].includes(m.origin?.kind)||!m.origin.source||!m.origin.author)fail('origem ausente');
 // User-supplied opaque illustrations may be inspected locally with unknown rights.
 // This explicit exception never asserts commercial clearance or admits rigs/3D.
 const localPilot=m.profile==='illustration-2d'&&m.style==='watercolor'&&m.usage?.scope==='local-pilot'&&m.usage.publication==='unverified'&&m.origin?.kind==='generated'&&m.origin.userProvided===true&&m.license?.status==='unverified'&&m.license.commercial===null&&m.license.identifier==='unknown';
 if((!localPilot&&m.license?.commercial!==true)||!m.license?.reviewedBy||!m.license.reviewedAt||!m.license.identifier||!m.license.url)fail('licença/condições não verificadas');
 if(m.origin.kind==='cc0'&&m.license.identifier!=='CC0-1.0')fail('CC0 inconsistente');
 const g=m.origin.generation;
 if(m.origin.kind==='generated'&&(!g?.provider||!g.model||!(typeof g.prompt==='string'&&g.prompt.trim()||localPilot&&g.prompt===null&&g.unknownFields?.includes('prompt'))||!Object.hasOwn(g,'parameters')||!Object.hasOwn(g,'seed')||!Object.hasOwn(g,'jobId')||!Array.isArray(g.references)))fail('proveniência de geração incompleta');
 if(!Array.isArray(m.files)||!m.files.length||m.files.length>ASSET_LIMITS.maxFiles||!Array.isArray(m.evidence)||!m.evidence.length)fail('inventário/provas ausentes');
 const all=[...m.files,...m.evidence],seen=new Set(),buffers=new Map();let total=0,decoded=0;
 for(const f of all){if(!safePath(f.path)||seen.has(f.path)||!hashOK(f.sha256)||!Number.isInteger(f.bytes)||f.bytes<1||f.bytes>ASSET_LIMITS.fileBytes)fail('arquivo/hash inválido');seen.add(f.path);const bytes=read(f.path);if(bytes.length!==f.bytes||sha256(bytes)!==f.sha256)fail('hash/tamanho divergente: '+f.path);total+=bytes.length;if(total>ASSET_LIMITS.totalBytes)fail('limite de pack excedido');buffers.set(f.path,bytes);}
 for(const r of g?.references||[])if(!m.evidence.some(f=>f.path===r.path&&f.sha256===r.sha256)||!r.purpose||!r.source||r.usageReviewed!==true)fail('referência sem comprovação');
 if(!m.license.evidence?.length||m.license.evidence.some(path=>!m.evidence.some(f=>f.path===path)))fail('prova de licença ausente');
 const profile=m.profile||'static';if(!['static','articulated','layered-2d','illustration-2d'].includes(profile))fail('perfil desconhecido');
 if(profile==='articulated'&&(!m.identity.rigVersion||m.style!=='lowpoly-3d'))fail('identidade de rig ausente');
 const fileMap=new Map(m.files.map(f=>[f.path,f])),capabilities={};
 for(const f of m.files){const extension=f.path.split('.').pop().toLowerCase();if(!['png','jpg','jpeg','glb','gltf','bin'].includes(extension))fail('formato não suportado: '+extension);if(['png','jpg','jpeg'].includes(extension)){const info=imageInfo(buffers.get(f.path),extension);decoded+=info.decodedBytes;capabilities[f.path]=info;}else if(['glb','gltf'].includes(extension)){const {json,...info}=gltfInfo(buffers.get(f.path),extension,fileMap,f.path,profile);decoded+=info.decodedBytes;capabilities[f.path]=info;}}
 if(profile==='articulated')for(const expression of m.available?.expressions||[])if(!capabilities[m.entry]?.expressions.includes(expression))fail('expressão sem morph real');
 if(['layered-2d','illustration-2d'].includes(profile)){
  const rig=validateLayered(m,capabilities);
  for(const path of rig.partsFiles){const {rgba,...alpha}=decodeRgba(buffers.get(path),{requireTransparency:profile==='layered-2d'});if(profile==='illustration-2d'&&(alpha.transparent||alpha.soft))fail('ilustração deve preservar papel opaco');Object.assign(capabilities[path],alpha);}
  if(m.files.some(f=>!rig.partsFiles.includes(f.path)))fail('perfil em camadas só publica PNGs usados pelo rig');
  for(const f of m.files){const d=m.derivations?.find(d=>d.path===f.path);let sourceKnown=m.evidence.some(e=>e.path===d?.source&&e.sha256===d?.sourceSha256);
   if(profile==='illustration-2d'&&buffers.has('source-records.json')){const records=JSON.parse(buffers.get('source-records.json'));sourceKnown=Array.isArray(records)&&records.some(e=>e.path===d?.source&&e.sha256===d?.sourceSha256&&hashOK(e.sha256));}
   if(!d?.tool||!d.operation||!d.operator||!d.parameters||!sourceKnown)fail('derivação sem fonte/hash/operação');}
  decoded=m.files.reduce((n,f)=>n+capabilities[f.path].width*capabilities[f.path].height*8,0); // canvas RGBA + GPU texture
 }
 if(decoded>ASSET_LIMITS.decodedBytes)fail('memória de texturas excedida');
 if(!fileMap.has(m.entry)||!m.style||!m.identity||!Array.isArray(m.available?.views)||!Array.isArray(m.available?.expressions)||!Array.isArray(m.available?.poses))fail('identidade/capacidades/entrada ausentes');
 return {capabilities,totalBytes:total,estimatedTextureBytes:Math.ceil(decoded)};
}
export function loadCatalog(root=process.cwd()){
 const path=resolve(root,'assets/catalog.json');if(!existsSync(path))return [];
 const catalog=JSON.parse(readFileSync(path,'utf8'));if(catalog.schemaVersion!==1||!Array.isArray(catalog.entries))fail('índice inválido');
 const seen=new Set();return catalog.entries.map(pin=>{
  if(!/^[a-z][a-z0-9-]*$/.test(pin.id)||!/^\d+\.\d+\.\d+$/.test(pin.version)||!hashOK(pin.manifestSha256)||seen.has(pin.id+'@'+pin.version))fail('pin inválido/duplicado');seen.add(pin.id+'@'+pin.version);
  const prefix='assets/packs/'+pin.id+'/'+pin.version,packRoot=realpathSync(resolve(root,prefix));if(!within(realpathSync(root),packRoot)||!within(realpathSync(resolve(root,'assets/packs')),packRoot))fail('pack externo');
  const bytes=readSafe(packRoot,'manifest.json');if(sha256(bytes)!==pin.manifestSha256)fail('manifesto alterado');const m=JSON.parse(bytes);if(m.id!==pin.id||m.version!==pin.version)fail('identidade divergente');
  const validation=validateManifest(m,p=>readSafe(packRoot,p));
  const snapshotFiles={[prefix+'/manifest.json']:pin.manifestSha256,...Object.fromEntries([...m.files,...m.evidence].map(f=>[prefix+'/'+f.path,f.sha256]))};
  return {pin,manifest:m,validation,packRoot,prefix,public:{...pin,profile:m.profile||'static',entry:m.entry,files:m.files,capabilities:validation.capabilities,estimatedTextureBytes:validation.estimatedTextureBytes,snapshotFiles,...(['layered-2d','illustration-2d'].includes(m.profile)?{actor:m.actor,identity:m.identity,available:m.available,usage:m.usage}:{})}};
 });
}
export function assetSnapshot(refs=[],root=process.cwd()){
 if(!refs.length)return {hash:null,files:{},assets:[]};
 const entries=loadCatalog(root),files={},assets=[];const used=new Set();
 for(const ref of refs){const item=entries.find(e=>e.pin.id===ref.id&&e.pin.version===ref.version&&e.pin.manifestSha256===ref.manifestSha256);if(!item||used.has(ref.id+'@'+ref.version))fail('referência ausente/não fixada/duplicada');used.add(ref.id+'@'+ref.version);
  files[item.prefix+'/manifest.json']=item.pin.manifestSha256;for(const f of [...item.manifest.files,...item.manifest.evidence])files[item.prefix+'/'+f.path]=f.sha256;assets.push(item.public);
 }
 if(assets.reduce((n,a)=>n+a.files.reduce((s,f)=>s+f.bytes,0),0)>ASSET_LIMITS.totalBytes||assets.reduce((n,a)=>n+a.estimatedTextureBytes,0)>ASSET_LIMITS.decodedBytes)fail('orçamento agregado de sessão excedido');
 const ordered=Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));return {hash:sha256(JSON.stringify(ordered)),files:ordered,assets};
}
