import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { catalog } from '../scripts/render-lib.mjs';

test('both 2D styles expose the shared palette keys', () => {
  const p = catalog();
  for (const style of ['cartoon', 'watercolor']) for (const key of ['ground','groundDk','grass','grassDk','leaf','leafDk','water','sky','skyTop','skyLow','skin','skinDk','hair','cloth','clothDk','fur','furDk','chitin','chitinDk','wood','stone'])
    assert.match(p.styles[style].config.palette[key], /^#[\da-f]{6}$/i, `${style}.${key}`);
});
test('shotsById maps storyboard ids to start times and rejects unknown ids', () => {
  const ctx = vm.createContext({ projectConfig: catalog().resolveProject('visit', 'cartoon'), window: {} });
  for (const file of ['src/motion.js', 'src/timeline.js']) vm.runInContext(readFileSync(file, 'utf8'), ctx, { filename: file });
  vm.runInContext("shotsById({ goodbye: () => {} })", ctx);
  assert.equal(vm.runInContext('SHOTS[0][0]', ctx), 3);
  assert.throws(() => vm.runInContext("shotsById({ nope: () => {} })", ctx), /Plano desconhecido/);
});
