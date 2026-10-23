import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

const ctx = natureContext(['src/nature/noise.js', 'src/nature/path.js', 'src/nature/gait.js', 'src/nature/creature.js', 'src/nature/specs.js']);
const flat = () => 600, P = ctx.makePath([[0, 600], [4000, 600]]);
const pose = (id, s, extra = {}) => ctx.creaturePose(ctx.SPECS[id], { path: P, s, size: 120, view: 'side', ground: flat, t: s, seed: 1, ...extra });
const legged = ['human', 'dog', 'ant', 'spider', 'bird'];

test('poses are deterministic and order independent', () => { for (const id of Object.keys(ctx.SPECS)) { const a = JSON.stringify(pose(id, 3.3)); pose(id, 40); assert.equal(JSON.stringify(pose(id, 3.3)), a); } });
test('stance feet touch the ground', () => { for (const id of legged) for (const l of Object.values(pose(id, 2.2).limbs)) if (l.stance) assert.ok(Math.abs(l.end[1] - 600) < .5, id); });
test('stopped creatures keep every foot on the ground', () => { for (const id of legged) for (const s of [1.13, 1.47, 2.81]) for (const l of Object.values(pose(id, s, { moving: 0 }).limbs)) if (l.foot) assert.ok(Math.abs(l.end[1] - 600) < .5, `${id} ${s}`); });
test('spine segments trail behind the head', () => { for (const id of ['dog', 'ant', 'fish']) { const sp = pose(id, 3).spine; for (let i = 1; i < sp.length; i++) assert.ok(sp[i - 1].x > sp[i].x, id); } });
test('ant uses tripod, dog uses its gait, human swings arms against legs', () => {
  const a = pose('ant', 1.2).limbs; assert.equal(a.L1.stance, a.R2.stance); assert.notEqual(a.L1.stance, a.R1.stance);
  const h = pose('human', 1.2); assert.ok(Math.sign(h.limbs.armL.end[0] - h.limbs.armL.root[0]) !== Math.sign(h.limbs.legL.end[0] - h.limbs.legL.root[0]));
});
test('dead creature folds limbs under the body', () => { const p = pose('dog', 3, { alive: 0 }); for (const l of Object.values(p.limbs)) assert.ok(Math.abs(l.end[0] - l.root[0]) < .3 * 120); });
test('creatures keep their shape at both ends of a short path', () => {
  const S = ctx.makePath([[0, 600], [1200, 600]]);
  for (const id of ['dog', 'ant', 'bird', 'fish']) for (const s of [0, 10]) {
    const p = ctx.creaturePose(ctx.SPECS[id], { path: S, s, size: 120, view: 'side', ground: flat, t: s, seed: 1, moving: 0 });
    assert.ok(p.head.x > p.spine[0].x, `${id} ${s} cabeça`);
    for (let i = 1; i < p.spine.length; i++) assert.ok(p.spine[i - 1].x > p.spine[i].x, `${id} ${s} coluna`);
    for (const l of Object.values(p.limbs)) if (l.foot) assert.ok(Math.abs(l.end[1] - 600) < .5, `${id} ${s} pé`);
  }
});
test('fish waves laterally from above; from the side the body barely moves and the caudal fin beats', () => {
  const ts = [0, .1, .2, .3, .4], range = a => Math.max(...a) - Math.min(...a);
  const side = ts.map(t => pose('fish', 2, { t })), top = ts.map(t => pose('fish', 2, { t, view: 'top' }));
  const sideTail = range(side.map(p => p.spine.at(-1).y)), topTail = range(top.map(p => p.spine.at(-1).y));
  assert.ok(sideTail > 0 && sideTail <= .05 * 120, `lateral ${sideTail}`);
  assert.ok(topTail > 2 * sideTail, `superior ${topTail}`);
  assert.ok(range(side.map(p => p.appendages.caudal.at(-1)[1])) > .05 * 120, 'nadadeira caudal');
});
test('stopped dog stands on all four paws, each near its shoulder or hip', () => {
  for (const s of [1.13, 1.47, 2.05, 2.81]) for (const [name, l] of Object.entries(pose('dog', s, { moving: 0 }).limbs)) {
    assert.ok(l.stance && Math.abs(l.end[1] - 600) < .5, `${s} ${name} apoio`);
    assert.ok(Math.abs(l.end[0] - l.root[0]) < .22 * 120, `${s} ${name} sob o corpo`);
  }
});
test('the human pelvis dips twice per gait cycle, lowest near each contact, and the head moves less', () => {
  const H = { ...ctx.SPECS.human, organic: { vary: 0 } }, N = 48, ys = [], hs = [], range = a => Math.max(...a) - Math.min(...a);
  for (let i = 0; i < N; i++) { const p = ctx.creaturePose(H, { path: P, s: 2.25 + .75 * i / N, size: 120, view: 'side', ground: flat, t: 0, seed: 1 }); ys.push(p.spine[1].y); hs.push(p.head.y); }
  const amp = k => Math.hypot(...[Math.cos, Math.sin].map(f => ys.reduce((a, y, i) => a + y * f(2 * Math.PI * k * i / N), 0)));
  for (const k of [1, 3, 4]) assert.ok(amp(2) > amp(k), `harmônico ${k}`);
  const lo = ys.indexOf(Math.max(...ys));  // contatos (s = 2.25: pé L, c = 3) em i = 0 e 24
  assert.ok([0, 24, 48].some(c => Math.abs(lo - c) <= 6), `mais baixo em ${lo}`);
  assert.ok(range(hs) < .75 * range(ys), 'cabeça estabilizada');
});
test('stopped creatures still breathe: the chest moves over 4 s', () => {
  for (const id of ['human', 'dog']) { const ys = []; for (let t = 0; t <= 4; t += .25) ys.push(pose(id, 2, { t, moving: 0 }).spine[0].y); assert.ok(Math.max(...ys) - Math.min(...ys) > .5, id); }
});
test('mood changes expression with a take: blink, squash released by backOut and an emote', () => {
  const K = [[0, 'neutral'], [2, 'scared', '!']], m = t => ctx.mood(t, K, 1);
  assert.equal(m(1.5).expression, 'neutral'); assert.equal(m(2.01).expression, 'scared');
  assert.ok(m(2).blink > .9 && m(1.95).sq > 0, 'fecha os olhos e achata');
  assert.ok(Math.min(...[2.2, 2.25, 2.3, 2.35].map(t => m(t).sq)) < 0 && m(3).sq === 0, 'solta com backOut e assenta');
  assert.equal(m(1.5).emote, null); assert.equal(m(2.5).emote.sym, '!'); assert.equal(m(2.5).emote.k, 1); assert.equal(m(4).emote, null);
  let n = 0; for (let t = 0; t < 20; t += 1 / 24) n += ctx.blink(t, 5) > .5; assert.ok(n >= 4, `piscadas ${n}`);
});
