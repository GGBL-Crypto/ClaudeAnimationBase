import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

const ctx = natureContext(['src/nature/noise.js', 'src/nature/path.js', 'src/nature/gait.js', 'src/nature/env.js']);

test('rain is order independent and drops end inside the area', () => { const A = { x: 0, y: 0, w: 1920, h: 900 }; const a = JSON.stringify(ctx.rain(4.2, A, 20, 9)); ctx.rain(80, A, 20, 9); assert.equal(JSON.stringify(ctx.rain(4.2, A, 20, 9)), a); for (const d of ctx.rain(4.2, A, 20, 9)) assert.ok(d.y <= 900); });
test('rain at t = 600 s returns only active drops', () => { const n = ctx.rain(600, { x: 0, y: 0, w: 1920, h: 900 }, 20, 9).length; assert.ok(n > 0 && n <= 20 * 0.95 + 2); });
test('grass bends away from someone passing', () => { assert.ok(ctx.bladeBend(0, 500, 800, [[480, 790]], 60) > ctx.bladeBend(0, 500, 800, [], 60)); });
test('stepEvents finds one stance start per stride', () => { const ev = ctx.stepEvents(t => t * 2, 0, 5, 0, 1, .6); assert.ok(ev.length >= 9 && ev.length <= 11); });
test('crowd keeps everyone on the path', () => { const p = ctx.makePath([[0, 0], [3000, 0]]); const c = ctx.crowd(p, 7, 20, 3); assert.equal(c.length, 20); for (const a of c) assert.ok(a.s >= 0 && a.s <= p.length); });
test('flutter falls, sways and lands on the ground', () => {
  const a = ctx.flutter(0, 0, [100, 50], 800, 2), b = ctx.flutter(3, 0, [100, 50], 800, 2);
  assert.equal(a.y, 50); assert.ok(b.y > a.y && !b.landed);
  const c = ctx.flutter(1e3, 0, [100, 50], 800, 2); assert.equal(c.y, 800); assert.equal(c.landed, true);
});
