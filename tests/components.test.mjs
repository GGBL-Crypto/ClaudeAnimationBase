import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {phaseAt} from '../src/styles/lowpoly-3d/components/core.js';
import {catalog,sourceSnapshot} from '../scripts/render-lib.mjs';
test('absolute propeller phase integrates speed changes without jumps',()=>{
  const segments=[[0,15],[3,5],[3.8,-6],[4.8,0],[5.5,12]];
  assert.equal(phaseAt(0,segments),0);assert.equal(phaseAt(3,segments),45);
  for(const [t]of segments)assert.ok(Math.abs(phaseAt(t+1e-7,segments)-phaseAt(t-1e-7,segments))<1e-5);
  const first=phaseAt(4,segments);phaseAt(8,segments);phaseAt(0,segments);assert.equal(first,phaseAt(4,segments));
});
test('ocean story is distinct, frozen, order independent and continuous across cuts',()=>{
  const film=catalog().resolveProject('ocean-encounter');assert.equal(film.duration,8);assert.equal(film.fps,12);
  assert.deepEqual(Array.from(film.scripts),['src/scenes/ocean-encounter.js']);assert.ok(Object.isFrozen(film.styleConfig.palette));
  assert.notEqual(film.styleConfig.palette.sky,catalog().resolveProject('mars-discovery').styleConfig.palette.sky);
  const context=vm.createContext({projectConfig:film,window:{},LowpolyComponents:{phaseAt}});
  for(const file of ['src/motion.js','src/timeline.js','src/scenes/ocean-encounter.js'])vm.runInContext(readFileSync(file,'utf8'),context);
  const pose=context.window.oceanPose,first=JSON.stringify(pose(4.2));pose(7.99);pose(0);assert.equal(JSON.stringify(pose(4.2)),first);
  for(const t of [3,5.4])for(const actor of ['submarine','creature']){
    const a=pose(t-1e-6)[actor],b=pose(t+1e-6)[actor];
    for(const key of ['position','rotation'])a[key].forEach((v,i)=>assert.ok(Math.abs(v-b[key][i])<1e-4));
  }
  assert.ok(pose(4.7).submarine.position[0]<pose(3.8).submarine.position[0],'Submarine must recoil');
  assert.ok(pose(7.9).submarine.position[0]>pose(5.5).submarine.position[0],'Submarine must follow');
  assert.ok(pose(4.35).creature.position[1]>pose(3.6).creature.position[1]+.6,'Creature triggers the reaction');
  const snapshot=sourceSnapshot();for(const file of ['actors','core','sets','index'])assert.ok(snapshot.files[`src/styles/lowpoly-3d/components/${file}.js`]);
  for(const file of ['src/scenes/ocean-encounter.js',...Object.keys(snapshot.files).filter(f=>f.includes('/components/'))])assert.doesNotMatch(readFileSync(file,'utf8'),/mars-discovery|marsPose|marsDiagnostics/);
  assert.doesNotMatch(readFileSync('src/scenes/ocean-encounter.js','utf8'),/createRobot/);
  assert.doesNotMatch(readFileSync('src/styles/lowpoly-3d/components/actors.js','utf8'),/t\s*[<>]=?\s*\d/,'Story clocks belong to films');
});
