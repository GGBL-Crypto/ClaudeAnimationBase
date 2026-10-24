import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMotion } from '../scripts/check-motion.mjs';

// Verificador físico: um caso limpo e um caso que viola cada regra.
const cam = { pos: [0, 1, 10], tgt: [0, 0, 0] };
// Ser andando em x(t) (unidades do mundo, S = 1), pé de apoio plantado em foot(t) (null = no ar).
const agent = (id, x, o = {}) => ({
  id, S: 1, air: !!o.air, hidden: !!o.hidden, p: [x, 0, o.z ?? 0], f: o.f || [1, 0, 0],
  parts: [{ c: [x, .2 + (o.dy || 0), o.z ?? 0], r: .1, bottom: .1 + (o.dy || 0) }],
  feet: [{ name: 'L1', pos: [o.foot ?? Math.floor(x * 4) / 4, o.fh || 0, o.z ?? 0], stance: o.stance ?? true, k: o.k ?? Math.floor(x * 4), h: o.fh || 0, reach: o.reach || 0 }],
});
const run = (n, make) => checkMotion(Array.from({ length: n }, (_, i) => ({ t: i / 30, shot: 0, cam, agents: make(i / 30, i) })));
const types = v => [...new Set(v.map(x => x.type))].sort();

test('clean walk passes', () => {
  assert.deepEqual(run(60, t => [agent('a', -1 + t), agent('b', -1 + t, { z: -1 })]), []);
});
test('each rule fails its own case', () => {
  assert.deepEqual(types(run(10, t => [agent('a', -1 + t), agent('b', -.95 + t)])), ['atravessamento']);
  assert.deepEqual(types(run(10, t => [agent('a', -1 + 6 * t)])), ['velocidade']);
  assert.deepEqual(types(run(10, (t, i) => [agent('a', -1 + .02 * (i % 2))])), ['aceleração']);
  assert.deepEqual(types(run(10, (t, i) => [agent('a', 0, { f: [Math.cos(i * .3), 0, Math.sin(i * .3)] })])), ['giro']);
  assert.deepEqual(types(run(10, (t, i) => [agent('a', -1 + t, { foot: -1 + .01 * i, k: 0 })])), ['pé deslizando']);
  assert.deepEqual(types(run(4, () => [agent('a', 0, { dy: -.15 })])), ['abaixo do chão']);
  assert.deepEqual(types(run(4, () => [agent('a', 0, { stance: false })])), ['solto no ar']);
  assert.deepEqual(types(run(4, () => [agent('a', 0, { reach: .05 })])), ['solto no ar'], 'perna que não alcança o chão');
  assert.ok(run(4, () => [agent('a', 0, { stance: false, air: true })]).length === 0, 'quem voa pode ficar no ar');
  assert.deepEqual(types(run(10, (t, i) => i < 5 ? [] : [agent('a', 0)])), ['aparece no quadro']);
  assert.deepEqual(types(run(10, (t, i) => i < 5 ? [agent('a', 0)] : [])), ['some no quadro']);
  assert.deepEqual(run(10, (t, i) => i < 5 ? [] : [agent('a', 0, { hidden: i === 5 })]), [], 'nascer escondido (túnel) vale');
  assert.deepEqual(run(10, (t, i) => i < 5 ? [] : [agent('a', 40)]), [], 'nascer fora do quadro vale');
  assert.deepEqual(types(run(10, (t, i) => [agent('a', i < 5 ? -1 : 1)])), ['salto']);
});
