// Manual local admission only. Never downloads or calls image providers.
import {readFileSync,mkdirSync,writeFileSync,renameSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateManifest,readSafe,sha256,loadCatalog} from './asset-catalog.mjs';
export function importAsset(candidate,root=process.cwd()){
 const candidateRoot=dirname(resolve(candidate)),bytes=readFileSync(candidate),m=JSON.parse(bytes);
 validateManifest(m,p=>readSafe(candidateRoot,p));loadCatalog(root);
 const catalogPath=resolve(root,'assets/catalog.json'),index=existsSync(catalogPath)?JSON.parse(readFileSync(catalogPath,'utf8')):{schemaVersion:1,entries:[]};
 const target=resolve(root,'assets/packs',m.id,m.version);
 if(existsSync(target)||index.entries.some(p=>p.id===m.id&&p.version===m.version))throw Error('ID/versão imutável já publicado; use outra versão');
 mkdirSync(dirname(target),{recursive:true});const staging=mkdtempSync(join(dirname(target),'.pending-'));
 try{
  for(const f of [...m.files,...m.evidence]){const dest=join(staging,f.path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,readSafe(candidateRoot,f.path),{flag:'wx'});}
  writeFileSync(join(staging,'manifest.json'),bytes,{flag:'wx'});validateManifest(m,p=>readSafe(staging,p));
  const pin={id:m.id,version:m.version,manifestSha256:sha256(bytes)};
  renameSync(staging,target);index.entries.push(pin);
  const pending=catalogPath+'.pending-'+process.pid;writeFileSync(pending,JSON.stringify(index,null,2)+'\n',{flag:'wx'});renameSync(pending,catalogPath);return pin;
 }finally{if(existsSync(staging))rmSync(staging,{recursive:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)throw Error('Uso: node scripts/import-assets.mjs caminho/local/manifest.json');
 console.log(JSON.stringify(importAsset(process.argv[2]),null,2));
}
