import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalog, ROOT, sourceSnapshot } from '../scripts/render-lib.mjs';
test('3D configuration is frozen, scoped and rejects invalid or excessive options',()=>{
  const p=catalog(),film=p.resolveProject('mars-discovery');assert.equal(film.fps,12);assert.equal(film.duration,3);assert.equal(film.style,'lowpoly-3d');
  assert.ok(Object.isFrozen(film.styleConfig.camera.position));assert.throws(()=>p.resolveProject('visit','lowpoly-3d'),/compatível/);
  const invalid=[{camera:{near:0}},{camera:{far:.01}},{camera:{fov:180}},{camera:{type:'unknown'}},{texture:{meshBudget:999}},{texture:{bitmaps:true}},{outline:{enabled:true}},{effects:{shadowSize:4096}},{preview:{scale:.1}},{character:{stepCycle:0}}];
  for(const [i,overrides]of invalid.entries()){
    const id='invalid-'+i;p.registerProject({...JSON.parse(JSON.stringify(p.projects['mars-discovery'])),id,styleOptions:{'lowpoly-3d':overrides}});assert.throws(()=>p.resolveProject(id));
  }
  const source=sourceSnapshot();for(const file of ['scripts/studio-server.mjs','src/loader.js','src/styles/lowpoly-3d/engine.js','node_modules/three/build/three.core.js','node_modules/three/build/three.module.js','node_modules/three/package.json','package-lock.json'])assert.ok(source.files[file],file);
});
test('Mars choreography has non-sliding support feet and is independent of evaluation order',()=>{
  const film=catalog().resolveProject('mars-discovery'),context=vm.createContext({projectConfig:film,window:{}});
  for(const file of ['src/motion.js','src/timeline.js','src/scenes/mars-discovery.js'])vm.runInContext(readFileSync(join(ROOT,file),'utf8'),context);
  const pose=context.window.marsPose, expected=JSON.stringify(pose(1.6));pose(2.99);pose(0);assert.equal(JSON.stringify(pose(1.6)),expected);
  let previous;
  for(let frame=0;frame<=120;frame++){
    const p=pose(frame/120);for(let i=0;i<2;i++){
      const f=p.feet[i];assert.ok(f.y>=-1e-9);if(f.stance)assert.ok(Math.abs(f.y)<1e-9);
      if(previous&&f.stance&&previous.feet[i].stance)assert.ok(Math.abs(p.x+f.z-previous.x-previous.feet[i].z)<1e-8,'Pé de apoio deslizou');
    }previous=p;
  }
  assert.equal(pose(0).arms,0);assert.ok(pose(2.5).arms>0);assert.equal(pose(0).x,-1.85);assert.ok(Math.abs(pose(3).x+.55)<1e-9);
});
