// Explicit offline admission. Input directory contains the acquired, pinned upstream files.
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {sha256} from './asset-catalog.mjs';
import {importAsset} from './import-assets.mjs';
const inbox=process.argv[2];if(!inbox)throw Error('Provide local inbox');
for(const [name,id,entry,author,license,url,expressions]of [
 ['RobotExpressive','expressive-robot','actor.glb','Tomás Laulhé; modifications Don McCurdy; consolidation ClaudeAnimationBase','CC0-1.0','https://creativecommons.org/publicdomain/zero/1.0/',['Angry','Surprised','Sad']],
 ['RiggedSimple','khronos-rigged-simple','RiggedSimple.glb','Cesium','CC-BY-4.0','https://creativecommons.org/licenses/by/4.0/',[]],
 ['AnimatedMorphCube','khronos-morph-cube','AnimatedMorphCube.glb','Microsoft','CC0-1.0','https://creativecommons.org/publicdomain/zero/1.0/',[]]
]){
 const version=name==='RobotExpressive'?'1.0.1':'1.0.0';if(existsSync('assets/packs/'+id+'/'+version))continue;
 const dir=resolve(inbox,name),acquisition=JSON.parse(readFileSync(dir+'/acquisition.json','utf8'));
 const file=path=>{const bytes=readFileSync(dir+'/'+path);return {path,bytes:bytes.length,sha256:sha256(bytes)};};
 const evidence=['README.md','acquisition.json'];
 if(name==='RobotExpressive'){evidence.push('RobotExpressive.glb','prepare-actor-asset.mjs');copyFileSync('scripts/prepare-actor-asset.mjs',dir+'/prepare-actor-asset.mjs');}
 const manifest={schemaVersion:1,id,version,profile:'articulated',origin:{kind:license==='CC0-1.0'?'cc0':'licensed',source:acquisition.records[1].url,author,commit:acquisition.commit},license:{identifier:license,url,commercial:true,reviewedBy:'Codex: individual upstream README, pinned bytes',reviewedAt:'2026-10-22',evidence:['README.md','acquisition.json'],attribution:author},entry,style:'lowpoly-3d',identity:{name,rigVersion:version,units:'metres in imported hierarchy',front:'+Z'},available:{views:['3d'],expressions,poses:[]},files:[file(entry)],evidence:evidence.map(file)};
 const path=dir+'/manifest.json';writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log(importAsset(path));
}
