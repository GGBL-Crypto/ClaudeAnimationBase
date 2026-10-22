import assert from 'node:assert/strict';import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {sourceHash,run,catalog} from './render-lib.mjs';import {assetSnapshot} from './asset-catalog.mjs';
const out='out/assets-stage/cli-'+sourceHash().slice(0,12),frames=out+'/frames';mkdirSync(out,{recursive:true});
const args=['render.mjs','--project=quality-space-p1','--resolution=720p','--range=0:0.16666666666666666','--png','--workers=2','--frames-dir='+frames];
await run(process.execPath,args,{capture:true});const first=readFileSync(frames+'/f00000.png'),manifest=JSON.parse(readFileSync(frames+'/manifest.json'));
assert.equal(manifest.assetHash,assetSnapshot(catalog().resolveProject('quality-space-p1').assetRefs).hash);assert.ok(manifest.assetFiles);assert.ok(manifest.sourceFiles['scripts/asset-catalog.mjs']);assert.ok(manifest.sourceFiles['node_modules/three/examples/jsm/environments/RoomEnvironment.js']);
await run(process.execPath,args,{capture:true});assert.deepEqual(first,readFileSync(frames+'/f00000.png'));
const original=JSON.stringify(manifest);manifest.assetHash='0'.repeat(64);writeFileSync(frames+'/manifest.json',JSON.stringify(manifest));
try{await assert.rejects(run(process.execPath,args,{capture:true}),/Cache incompatível/);await assert.rejects(run(process.execPath,['render.mjs','--project=quality-space-p1','--encode','--frames-dir='+frames,'--out='+out+'/rejected.mp4'],{capture:true}),/assets\/projeto/);}finally{writeFileSync(frames+'/manifest.json',original);}
writeFileSync(out+'/report.json',JSON.stringify({status:'passed',sourceHash:sourceHash(),assetHash:manifest.assetHash,workers:2,resume:true,cacheRejectsChangedAssetHash:true,encodeRejectsChangedAssetHash:true}));console.log('PASS asset CLI: workers, resume, assetHash and cache/encode rejection');
