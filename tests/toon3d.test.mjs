import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { catalog } from '../scripts/render-lib.mjs';

// Kit toon3d (exp/visual-rico): a lógica pura do espalhamento, do piscar e do ser 3D gerado das SPECS.
const platform = catalog(), ctx = vm.createContext({ AnimationPlatform: platform, projectConfig: platform.resolveProject('sauva-exp-e'), window: {} });
for (const file of ['src/motion.js', 'src/timeline.js', 'src/nature/noise.js', 'src/nature/path.js', 'src/nature/gait.js', 'src/nature/creature.js', 'src/nature/specs.js', 'src/nature/env.js',
  'src/styles/toon3d/creature.js', 'src/styles/toon3d/face.js', 'src/styles/toon3d/flora.js'])
  vm.runInContext(readFileSync(file, 'utf8'), ctx, { filename: file });
const { scatter, zoneDist, faceState, creature3d, drawCreature3d, track3d } = vm.runInContext('({ scatter, zoneDist, faceState, creature3d, drawCreature3d, track3d })', ctx);

test('scatter keeps out of free zones and repeats with the same seed', () => {
  const area = { x0: -5, x1: 5, z0: -6, z1: 0 }, free = [{ a: [-5, -2], b: [5, -2], r: .6 }, { a: [1, -4], r: 1 }];
  const a = scatter(800, 4, area, { free }), b = scatter(800, 4, area, { free });
  assert.equal(a.length, 800);
  assert.deepEqual(a, b);
  for (const p of a) {
    assert.ok(p.x >= -5 && p.x <= 5 && p.z >= -6 && p.z <= 0);
    assert.ok(zoneDist(p.x, p.z, free) > 0 && Math.abs(p.d - zoneDist(p.x, p.z, free)) < 1e-12);
  }
  assert.notDeepEqual(scatter(50, 5, area, { free }), a.slice(0, 50));
});

test('blink is deterministic, closes once per window and depends on the seed', () => {
  const closedAt = seed => Array.from({ length: 36 * 60 }, (_, i) => faceState(i / 60, { seed }).close);
  const a = closedAt(3);
  assert.deepEqual(a, closedAt(3));
  for (let w = 0; w < 10; w++) assert.ok(a.slice(w * 216, (w + 1) * 216).filter(k => k > .5).length >= 1, `janela ${w} sem piscar`);
  assert.notDeepEqual(a, closedAt(4));
  assert.equal(faceState(1, { mood: { expression: 'susto', blink: 0 } }).lid, 80);
});

test('ant, fly and beetle come out of the same builder, with faces', () => {
  const ground = track3d([[-5, 0], [5, 0]], (x, z) => .05 * Math.sin(x + z));
  const count = () => { const n = {}, rec = pool => () => { n[pool] = (n[pool] || 0) + 1; }; return { n, E: {
    ovoid: (p, f, u, a, b, c, hex, pool = 'sph') => rec(pool)(), ball: (p, r, hex, pool = 'sph') => rec(pool)(), rod: (a, b, r, hex, pool = 'cyl') => rec(pool)(), quad: pool => rec(pool)(),
  } }; };
  for (const [name, legs, wings] of [['ant', 6, 0], ['fly', 6, 2], ['beetle', 6, 0], ['ladybug', 6, 0]]) {
    const P = creature3d(name, ground, 10, .4, 1.3, { seed: 2 }), { n, E } = count();
    drawCreature3d(E, P);
    assert.equal(P.legs.length, legs, name);
    assert.equal(P.wings.length, wings, name);
    assert.ok(n.eye + (n.facet || 0) >= 4 && n.glint >= 2 && n.lid === 2, `${name} sem rosto`);
    assert.ok(n.shell >= P.segs.length + 1);
    if (name === 'fly') assert.equal(n.facet, 2);
    assert.deepEqual(creature3d(name, ground, 10, .4, 1.3, { seed: 2 }).legs, P.legs);
  }
  // Pés de apoio do besouro presos ao chão (track.h) e parados entre quadros.
  let held = 0;
  for (let i = 0; i < 240; i++) {
    const t = i / 60, a = creature3d('beetle', ground, 2 + .3 * t / .4, .4, t, { seed: 1 }), b = creature3d('beetle', ground, 2 + .3 * (t + 1 / 60) / .4, .4, t + 1 / 60, { seed: 1 });
    a.legs.forEach((l, j) => {
      assert.ok(Math.hypot(...l.end.map((v, k) => v - l.foot[k])) < 1e-6);
      if (l.stance && b.legs[j].stance) { held++; assert.ok(Math.hypot(...l.foot.map((v, k) => v - b.legs[j].foot[k])) < 1e-9); }
    });
  }
  assert.ok(held > 500);
});
