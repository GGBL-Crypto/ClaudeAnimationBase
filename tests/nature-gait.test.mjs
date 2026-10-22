import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

const ctx = natureContext(['src/nature/gait.js']);
const plant = a => [a * 100 + 7, 300], O = { stride: 1, duty: .6, lift: 12, moving: 1, plant };

test('gait tables match the spec', () => {
  assert.equal(ctx.GAITS.tripod.offsets.L1, ctx.GAITS.tripod.offsets.R2); assert.notEqual(ctx.GAITS.tripod.offsets.L1, ctx.GAITS.tripod.offsets.R1);
  assert.equal(ctx.GAITS.trot.offsets.LF, ctx.GAITS.trot.offsets.RH); assert.equal(ctx.GAITS.quadWalk.offsets.RF, .25);
});
test('a planted foot does not slide during stance', () => {
  let first = null;
  for (let s = 2; s < 2.59; s += .05) { const r = ctx.footAt(s, 0, O); if (!r.stance) continue; first ??= r.pos; assert.deepEqual(r.pos, first); }
  assert.ok(first);
});
test('feet are continuous across stance and swing boundaries', () => {
  for (const s of [2.6, 3, 3.1, 3.5]) { const a = ctx.footAt(s - 1e-6, .5, O).pos, b = ctx.footAt(s + 1e-6, .5, O).pos; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < .01, `salto em ${s}`); }
});
test('gait stays continuous at large distances', () => {
  const a = ctx.footAt(5000.3, .25, O).pos, b = ctx.footAt(5000.3 + 1e-5, .25, O).pos; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < .05);
});
test('ik2 keeps bone lengths and clamps unreachable targets', () => {
  const r = ctx.ik2([0, 0], [30, 40], 35, 38, 1);
  assert.ok(Math.abs(Math.hypot(...r.mid) - 35) < 1e-6); assert.ok(Math.abs(Math.hypot(r.end[0] - r.mid[0], r.end[1] - r.mid[1]) - 38) < 1e-6);
  assert.ok(Math.hypot(...ctx.ik2([0, 0], [500, 0], 35, 38, 1).end) <= 73);
});
