import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

const ctx = natureContext(['src/nature/noise.js', 'src/nature/path.js']);

test('noise1 is continuous, bounded and order independent', () => {
  for (let x = 0; x < 50; x += .37) { const v = ctx.noise1(7, x); assert.ok(v >= -1 && v <= 1); assert.ok(Math.abs(ctx.noise1(7, x + 1e-4) - v) < 1e-2); }
  const a = ctx.noise1(3, 12.5); ctx.noise1(3, 900); assert.equal(ctx.noise1(3, 12.5), a);
});
test('fbm1 stays bounded', () => {
  for (let x = 0; x < 50; x += .41) { const v = ctx.fbm1(5, x); assert.ok(v >= -1 && v <= 1); }
});
test('makePath walks by arc length and clamps the ends', () => {
  const p = ctx.makePath([[0, 0], [100, 0], [200, 0]]);
  assert.ok(Math.abs(p.length - 200) < .5); assert.ok(Math.abs(p.at(50).x - 50) < .5);
  assert.equal(p.at(-10).x, p.at(0).x); assert.equal(p.at(1e6).x, p.at(p.length).x); assert.ok(Math.abs(p.at(100).angle) < 1e-3);
});
test('makePath rejects fewer than two points', () => {
  assert.throws(() => ctx.makePath([[0, 0]]), /ao menos 2 pontos/);
});
test('travel reports zero motion while holding', () => {
  const r = ctx.travel(5, [[0, 0], [2, 4], [6, 4]]); assert.equal(r.s, 4); assert.equal(r.moving, 0);
  assert.ok(ctx.travel(1, [[0, 0], [2, 4]]).moving > 0);
});
