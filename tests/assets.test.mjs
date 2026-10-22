import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,readFileSync,existsSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {request} from 'node:http';
import {sha256,validateManifest,assetSnapshot,loadCatalog} from '../scripts/asset-catalog.mjs';import {importAsset} from '../scripts/import-assets.mjs';import {startStudioServer} from '../scripts/studio-server.mjs';
import {gltfInfo} from '../src/assets/format.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8T8AAAAASUVORK5CYII=','base64');
const evidence=Buffer.from('Fixture original authored for technical test; commercial use authorized by fixture author.');
const descriptor=(path,b)=>({path,bytes:b.length,sha256:sha256(b)});
const manifest=()=>({schemaVersion:1,id:'original-pose',version:'1.0.0',identity:'Fixture',style:'watercolor',entry:'pose.png',origin:{kind:'original',source:'local test',author:'test author'},license:{identifier:'original-authorization',url:'local:terms.txt',commercial:true,reviewedBy:'test author',reviewedAt:'2026-10-22',evidence:['terms.txt']},available:{views:['front'],poses:['still'],expressions:[]},files:[descriptor('pose.png',png)],evidence:[descriptor('terms.txt',evidence)]});
const read=p=>p==='pose.png'?png:evidence;
test('manual original/generated admission requires provenance, licenses, valid formats and real hashes',()=>{
 const m=manifest();assert.equal(validateManifest(m,read).capabilities['pose.png'].width,1);
 for(const change of [x=>delete x.license.reviewedBy,x=>x.files[0].sha256='a'.repeat(64),x=>x.files[0].path='../pose.png',x=>x.entry='absent.png',x=>x.origin.kind='generated',x=>x.files[0].path='script.svg']){const x=structuredClone(m);change(x);assert.throws(()=>validateManifest(x,read));}
 const g=structuredClone(m);g.origin={kind:'generated',author:'operator',source:'manual PNG import',generation:{provider:'example provider',model:'reported model',prompt:'Original character concept',parameters:null,seed:null,jobId:null,references:[]}};
 assert.doesNotThrow(()=>validateManifest(g,read));g.origin.generation.references=[{path:'missing.png',sha256:'a'.repeat(64),purpose:'identity',source:'user',usageReviewed:true}];assert.throws(()=>validateManifest(g,read),/referência/);
 const bad=Buffer.from(png);bad[0]=0;const invalid=manifest();invalid.files=[descriptor('pose.png',bad)];assert.throws(()=>validateManifest(invalid,p=>p==='pose.png'?bad:evidence),/PNG/);
 const giant=Buffer.from(png);giant.writeUInt32BE(9000,16);invalid.files=[descriptor('pose.png',giant)];assert.throws(()=>validateManifest(invalid,p=>p==='pose.png'?giant:evidence),/dimensões/);
});
test('immutable pins, private evidence, HTTP allowlist and changed bytes fail closed',async()=>{
 const root=mkdtempSync(join(tmpdir(),'assets-test-')),inbox=join(root,'inbox');mkdirSync(inbox);mkdirSync(join(root,'src'));writeFileSync(join(root,'studio.html'),'studio');
 writeFileSync(join(inbox,'pose.png'),png);writeFileSync(join(inbox,'terms.txt'),evidence);const path=join(inbox,'manifest.json');writeFileSync(path,JSON.stringify(manifest()));
 let server;try{
  const pin=importAsset(path,root);assert.throws(()=>importAsset(path,root),/imutável/);assert.equal(loadCatalog(root).length,1);
  const snap=assetSnapshot([pin],root);assert.ok(snap.hash);assert.equal(assetSnapshot([],root).hash,null);assert.throws(()=>assetSnapshot([{...pin,manifestSha256:'a'.repeat(64)}],root));
  server=await startStudioServer({root});const get=path=>new Promise((ok,bad)=>{request(server.origin,{path},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>ok({status:res.statusCode,type:res.headers['content-type'],body}));}).on('error',bad).end();});
  const base='/assets/packs/original-pose/1.0.0/';assert.equal((await get(base+'pose.png')).type,'image/png');
  for(const p of ['terms.txt','manifest.json','../pose.png','%2e%2e/pose.png','%2570ose.png'])assert.ok([403,404].includes((await get(base+p)).status),p);
  const index=await get('/assets/index.json');assert.equal(index.status,200);assert.ok(!index.body.includes('commercial use authorized'));assert.equal((await get('/inbox/pose.png')).status,404);
  writeFileSync(join(root,'assets/packs/original-pose/1.0.0/pose.png'),'corrupted');assert.equal((await get(base+'pose.png')).status,409);assert.throws(()=>assetSnapshot([pin],root),/divergente/);
 }finally{await server?.close();if(existsSync(root))rmSync(root,{recursive:true,force:true});}
});
test('GLB/glTF rejects truncation, external references, unsupported rigs/decoders and cycles',()=>{
 const bytes=readFileSync('assets/packs/kenney-space-speeder/1.0.0/craft_speederA.glb');assert.equal(gltfInfo(bytes,'glb',new Map(),'model.glb').triangles,280);assert.throws(()=>gltfInfo(bytes.subarray(0,50),'glb',new Map(),'model.glb'));
 const check=j=>gltfInfo(Buffer.from(JSON.stringify({asset:{version:'2.0'},...j})),'gltf',new Map(),'model.gltf');
 for(const json of [{buffers:[{uri:'https://evil.test/b.bin',byteLength:1}]},{buffers:[{uri:'../b.bin',byteLength:1}]},{images:[{uri:'missing.png'}]},{skins:[{}]},{animations:[{}]},{meshes:[{primitives:[{targets:[{}]}]}]},{extensionsRequired:['KHR_draco_mesh_compression']},{nodes:[{children:[1]},{children:[0]}]},{nodes:[{translation:[null,1,2]}]},{accessors:[{bufferView:0,count:999999999,type:'VEC3',componentType:5126}]}])assert.throws(()=>check(json));
});
