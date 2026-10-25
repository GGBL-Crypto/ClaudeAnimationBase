import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMotion, checkSkeleton, legacySkeleton } from '../scripts/check-motion.mjs';

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

// Esqueleto 2D (y para baixo), humano de lado voltado para a direita: joelho à frente, cotovelo atrás. Ossos com o
// comprimento das juntas-base; partes desenhadas = o próprio osso, ponta reta ('butt'). o.j troca juntas, o.len troca
// comprimentos, o.part(nome, parte) troca partes.
const BASE = {
  pelvis: [0, 0], chest: [0, -100], neck: [0, -120], headBase: [0, -150], head: [0, -180], headTop: [0, -210],
  hipL: [0, 0], kneeL: [20, 97.98], ankleL: [0, 195.96], toeL: [30, 195.96],
  shoulderL: [0, -90], elbowL: [-10, -10.63], wristL: [10, 68.74], handL: [14, 88],
};
const BONES = [['spine', 'pelvis', 'chest'], ['neck', 'neck', 'headBase'], ['head', 'headBase', 'headTop'], ['thighL', 'hipL', 'kneeL'], ['shinL', 'kneeL', 'ankleL'],
  ['footL', 'ankleL', 'toeL'], ['upperArmL', 'shoulderL', 'elbowL'], ['forearmL', 'elbowL', 'wristL'], ['handL', 'wristL', 'handL']];
const TERMINAL = { footL: 1, handL: 1, head: 1 };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function man(o = {}) {
  const joints = { ...BASE, ...o.j };
  const bones = BONES.map(([name, a, b]) => ({ name, a, b, len: o.len?.[name] ?? dist(BASE[a], BASE[b]) }));
  const parts = BONES.map(([name, a, b]) => ({ actor: 'm', name, from: a, to: TERMINAL[name] ? null : b, pts: [joints[a], joints[b]], r: name === 'head' ? 25 : 4, cap: 'butt' }))
    .map(p => o.part?.(p.name, p) || p);
  return { id: 'm', facing: 1, joints, bones, ...(o.noParts ? {} : { parts }) };
}
const skel = (n, make) => checkSkeleton(Array.from({ length: n }, (_, i) => ({ t: i / 30, actors: [make(i)] })));
const rot = (c, p, a) => [c[0] + (p[0] - c[0]) * Math.cos(a) - (p[1] - c[1]) * Math.sin(a), c[1] + (p[0] - c[0]) * Math.sin(a) + (p[1] - c[1]) * Math.cos(a)];

test('clean skeleton passes, with and without parts', () => {
  assert.deepEqual(skel(3, () => man()), []);
  assert.deepEqual(skel(3, () => man({ noParts: true })), []);
});
test('each skeleton rule fails its own case', () => {
  const v = skel(3, () => man({ len: { shinL: 1.05 * dist(BASE.kneeL, BASE.ankleL) } }));
  assert.deepEqual(types(v), ['osso varia']);
  assert.equal(v.length, 3, 'uma entrada por quadro e ser');
  assert.deepEqual(types(skel(2, () => man({ part: (n, p) => n === 'footL' && { ...p, pts: [[0, 190], BASE.toeL] } }))), ['parte solta']);
  assert.deepEqual(types(skel(2, () => man({ part: (n, p) => n === 'head' && { ...p, pts: [BASE.head, BASE.headTop] } }))), ['parte solta'], 'cabeça que não começa na base');
  assert.deepEqual(types(skel(2, () => man({ j: { kneeL: [-20, 97.98] } }))), ['ângulo'], 'joelho dobrado ao contrário');
  const j = Object.fromEntries(['headBase', 'head', 'headTop'].map(k => [k, rot(BASE.neck, BASE[k], .8)]));
  assert.deepEqual(types(skel(2, () => man({ j }))), ['ângulo'], 'pescoço torcido demais');
  assert.deepEqual(types(skel(2, () => man({ part: (n, p) => n === 'shinL' && { ...p, pts: [BASE.kneeL, [-1, 200.9]] } }))), ['passa da junta'], 'canela além do tornozelo');
  assert.deepEqual(types(skel(2, () => man({ part: (n, p) => n === 'shinL' && { ...p, cap: 'round' } }))), ['passa da junta'], 'ponta redonda: o traço passa r além do tornozelo');
  assert.deepEqual(types(skel(2, () => man({ part: (n, p) => n === 'neck' && { ...p, pts: [BASE.neck, [0, -156]] } }))), ['passa da junta'], 'pescoço acima da base da cabeça');
});
test('legacy pose without joints: neck length comes from the first frame', () => {
  const spec = { head: { r: .1 }, limbs: [{ name: 'legL', l1: .5, l2: .5 }] };
  const pose = dy => ({ spec: 'human', size: 100, facing: 1, spine: [{ x: 0, y: -100 }, { x: 0, y: 0 }], head: { x: 0, y: -140 + dy, angle: 0 },
    limbs: { legL: { root: [0, 0], mid: [20, 45.83], end: [0, 91.65] } } });
  const f0 = legacySkeleton(pose(0), spec), f1 = legacySkeleton(pose(-10), spec, f0.bones);
  assert.deepEqual(f0.joints.headBase, [0, -130]);
  assert.deepEqual(checkSkeleton([{ t: 0, actors: [{ id: 'h', ...f0 }] }, { t: 1 / 30, actors: [{ id: 'h', ...f1 }] }]).map(x => [x.type, x.t]), [['osso varia', .033]]);
});
