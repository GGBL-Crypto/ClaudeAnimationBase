import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {phaseAt} from '../src/styles/lowpoly-3d/components/core.js';
import {sourceSnapshot} from '../scripts/render-lib.mjs';
test('absolute propeller phase integrates speed changes without jumps',()=>{
  const segments=[[0,15],[3,5],[3.8,-6],[4.8,0],[5.5,12]];
  assert.equal(phaseAt(0,segments),0);assert.equal(phaseAt(3,segments),45);
  for(const [t]of segments)assert.ok(Math.abs(phaseAt(t+1e-7,segments)-phaseAt(t-1e-7,segments))<1e-5);
  const first=phaseAt(4,segments);phaseAt(8,segments);phaseAt(0,segments);assert.equal(first,phaseAt(4,segments));
});
test('lowpoly components are story-free and part of the source snapshot',()=>{
  const snapshot=sourceSnapshot();for(const file of ['actors','core','sets','index'])assert.ok(snapshot.files[`src/styles/lowpoly-3d/components/${file}.js`]);
  assert.doesNotMatch(readFileSync('src/styles/lowpoly-3d/components/actors.js','utf8'),/ts*[<>]=?s*d/,'Story clocks belong to films');
});
