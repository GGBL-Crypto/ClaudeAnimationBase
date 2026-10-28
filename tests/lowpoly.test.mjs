import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, sourceSnapshot } from '../scripts/render-lib.mjs';
test('3D configuration is frozen, scoped and rejects invalid or excessive options',()=>{
  const p=catalog(),film=p.resolveProject('smoke-3d');assert.equal(film.fps,24);assert.equal(film.duration,2);assert.equal(film.style,'lowpoly-3d');
  assert.ok(Object.isFrozen(film.styleConfig.camera.position));assert.throws(()=>p.resolveProject('smoke-visit','lowpoly-3d'),/compatível/);
  const invalid=[{camera:{near:0}},{camera:{far:.01}},{camera:{fov:180}},{camera:{type:'unknown'}},{texture:{meshBudget:999}},{texture:{bitmaps:true}},{outline:{enabled:true}},{effects:{shadowSize:4096}},{preview:{scale:.1}},{character:{stepCycle:0}}];
  for(const [i,overrides]of invalid.entries()){
    const id='invalid-'+i;p.registerProject({...JSON.parse(JSON.stringify(p.projects['smoke-3d'])),id,styleOptions:{'lowpoly-3d':overrides}});assert.throws(()=>p.resolveProject(id));
  }
  const source=sourceSnapshot();for(const file of ['scripts/studio-server.mjs','src/loader.js','src/styles/lowpoly-3d/engine.js','node_modules/three/build/three.core.js','node_modules/three/build/three.module.js','node_modules/three/package.json','package-lock.json'])assert.ok(source.files[file],file);
});
