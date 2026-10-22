// Save this execution's QA results, then restore only files inventoried before this task.
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';import {dirname} from 'node:path';
import {run,sourceSnapshot} from './render-lib.mjs';import {sha256} from './asset-catalog.mjs';
const checkpoint='checkpoints/watercolor-before-20261022-090502',inventory=JSON.parse(readFileSync(checkpoint+'/artifacts.json')),out=`out/watercolor-actor/revisions/${sourceSnapshot().hash.slice(0,12)}/preservation`;mkdirSync(out,{recursive:true});
const changed=inventory.filter(f=>!existsSync(f.path)||sha256(readFileSync(f.path))!==f.sha256),restore=[],metadataChanges=new Set(['assets/catalog.json','assets/AGENTS.md']);
for(const f of changed){
 if(metadataChanges.has(f.path))continue;assert.ok(f.path.startsWith('out/')&&!f.path.endsWith('.mp4'),'Historical asset/video changed: '+f.path);assert.ok(existsSync(f.path),'Historical file removed');
 const target=out+'/current-evidence/'+f.path;mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(f.path));restore.push(f.path);
}
// Python's zip extractor restores exact pre-task bytes, using explicit known archive member paths only.
if(restore.length)await run('python',['-c','import zipfile,sys,json; z=zipfile.ZipFile(sys.argv[1]); paths=json.loads(sys.argv[2]); [z.extract(p,".") for p in paths]',checkpoint+'/prior-evidence.zip',JSON.stringify(restore)],{capture:true});
for(const f of inventory)if(!metadataChanges.has(f.path))assert.equal(sha256(readFileSync(f.path)),f.sha256,'Preservation '+f.path);
// Catalog naturally gains entries; every old pin must retain exactly its original values.
const oldCatalog=JSON.parse(await run('python',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(z.read("assets/catalog.json").decode())',checkpoint+'/workspace.zip'],{capture:true})),current=JSON.parse(readFileSync('assets/catalog.json'));
for(const pin of oldCatalog.entries)assert.deepEqual(current.entries.find(p=>p.id===pin.id&&p.version===pin.version),pin);
const codeComparison=JSON.parse(await run('python',['-c','import zipfile,pathlib,hashlib,json,sys; z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); changed=[n for n in names if not pathlib.Path(n).is_file() or hashlib.sha256(z.read(n)).digest()!=hashlib.sha256(pathlib.Path(n).read_bytes()).digest()]; print(json.dumps({"files":len(names),"changed":changed}))',checkpoint+'/workspace.zip'],{capture:true}));
const authorized=new Set(['.gitignore','ARCHITECTURE.md','render.mjs','assets/AGENTS.md','assets/catalog.json','docs/ART_ASSETS_PLAN.md','docs/ASSET_CATALOG.md','docs/VALIDATION.md','scripts/asset-catalog.mjs','scripts/render-lib.mjs','src/config.js','src/styles/watercolor/config.js','src/styles/watercolor/engine.js','src/styles/watercolor/GUIDE.md']);
assert.ok(codeComparison.changed.every(f=>authorized.has(f)),'Unintended edits '+JSON.stringify(codeComparison.changed));
writeFileSync(out+'/report.json',JSON.stringify({status:'passed',inventoried:inventory.length,unchanged:inventory.length-metadataChanges.size,authorizedMetadataChanges:[...metadataChanges],historicalVideos:inventory.filter(f=>f.path.endsWith('.mp4')).length,restoredEvidence:restore,previousPins:oldCatalog.entries.length,catalog:'old entries preserved; new watercolor versions appended',checkpointFiles:codeComparison.files,changedExistingFiles:codeComparison.changed,preservedExistingFiles:codeComparison.files-codeComparison.changed.length},null,2));console.log('Preserved '+(inventory.length-metadataChanges.size)+' files including all historical MP4s');
