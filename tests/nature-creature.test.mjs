import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

const ctx = natureContext(['src/nature/noise.js', 'src/nature/path.js', 'src/nature/gait.js', 'src/nature/creature.js', 'src/nature/specs.js']);
const flat = () => 600, P = ctx.makePath([[0, 600], [4000, 600]]);
const pose = (id, s, extra = {}) => ctx.creaturePose(ctx.SPECS[id], { path: P, s, size: 120, view: 'side', ground: flat, t: s, seed: 1, ...extra });
const legged = ['human', 'dog', 'ant', 'spider', 'bird', 'queen', 'alate', 'soldier', 'minima'];

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
test('mood changes expression with a take: blink, squash released by a spring and an emote that springs in', () => {
  const K = [[0, 'neutral'], [2, 'scared', '!']], m = t => ctx.mood(t, K, 1);
  assert.equal(m(1.5).expression, 'neutral'); assert.equal(m(2.01).expression, 'scared');
  assert.ok(m(2).blink > .9 && m(1.95).sq > 0, 'fecha os olhos e achata');
  assert.ok(Math.min(...[2.2, 2.25, 2.3, 2.35].map(t => m(t).sq)) < 0 && Math.abs(m(3).sq) < .005, 'solta numa mola e assenta');
  assert.equal(m(1.5).emote, null); assert.equal(m(2.5).emote.sym, '!');
  assert.ok(Math.max(...[2.15, 2.2, 2.25, 2.3].map(t => m(t).emote.k)) > 1.2 && Math.abs(m(3).emote.k - 1) < .03, 'emote passa de 1 e assenta'); assert.equal(m(4).emote, null);
  let n = 0; for (let t = 0; t < 20; t += 1 / 24) n += ctx.blink(t, 5) > .5; assert.ok(n >= 4, `piscadas ${n}`);
});

test('planted feet do not slide at 24 and 30 fps, on ones and on twos: a stance foot keeps its x', () => {
  for (const [fps, twos] of [[24, true], [24, false], [30, true], [30, false]]) for (const id of ['human', 'dog']) {
    const last = {};
    for (let F = 0; F < 4 * fps; F++) {
      const TT = twos ? ctx.twosTime(F / fps, fps) : F / fps, p = ctx.creaturePose(ctx.SPECS[id], { path: P, s: 1 + .9 * TT, size: 120, view: 'side', ground: flat, t: TT, seed: 1 });
      for (const [name, l] of Object.entries(p.limbs)) {
        if (!l.foot) continue;
        if (l.stance && last[name]) assert.ok(Math.abs(l.end[0] - last[name][0]) < .5, `${id} ${name} ${fps} fps ${twos ? '2s' : '1s'} quadro ${F}`);
        last[name] = l.stance ? l.end : null;
      }
    }
  }
});

test('walk key poses: the pelvis is lowest in the recoil just after contact, highest after passing, and the head lags it', () => {
  const H = { ...ctx.SPECS.human, organic: { vary: 0 } }, at = c => ctx.creaturePose(H, { path: P, s: 2.25 + .75 * c, size: 120, view: 'side', ground: flat, t: 0, seed: 1 });
  const y = c => at(c).spine[1].y;  // c in cycles after the left contact (s = 2.25)
  assert.ok(y(.07) > y(0) + .05 && y(.07) > y(.25) + .3, `recuo ${y(0)} ${y(.07)} ${y(.25)}`);
  assert.ok(y(.33) < y(.25) && y(.33) < y(0), `alto ${y(.25)} ${y(.33)}`);
  const N = 48, ys = [], hs = []; for (let i = 0; i < N; i++) { const p = at(i / N); ys.push(p.spine[1].y); hs.push(p.head.y); }
  assert.ok(hs.indexOf(Math.min(...hs)) % 24 > ys.indexOf(Math.min(...ys)) % 24, 'a cabeça chega ao alto depois da pelve');
  const xs = Array.from({ length: N }, (_, i) => at(i / N).head.x - at(i / N).spine[1].x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > .005 * 120, 'a cabeça faz um arco, não só sobe e desce');
});
test('arms swing in an arc: the hand rises and the elbow bends on the forward swing', () => {
  const H = { ...ctx.SPECS.human, organic: { vary: 0 } }, ends = [];
  for (let i = 0; i < 48; i++) { const a = ctx.creaturePose(H, { path: P, s: 2.25 + .75 * i / 48, size: 120, view: 'side', ground: flat, t: 0, seed: 1 }).limbs.armL; ends.push([a.end[0] - a.root[0], a.end[1] - a.root[1]]); }
  const front = ends.reduce((a, b) => b[0] > a[0] ? b : a), back = ends.reduce((a, b) => b[0] < a[0] ? b : a);
  assert.ok(front[1] < back[1] - 2, `mão da frente mais alta ${front} ${back}`);
  assert.ok(Math.hypot(...front) < Math.hypot(...back) - 2, 'cotovelo dobra à frente');
});
test('spring overlap: appendages lag behind a stop, then swing past rest and settle', () => {
  const keys = [[0, 0], [3, 3]], o = { start: .5, stop: .6, seed: 1 }, d = t => ctx.travel(t, keys, o).drag;
  const ts = Array.from({ length: 200 }, (_, i) => 2 + i / 50), ds = ts.map(d), hi = Math.max(...ds), after = ds.filter((_, i) => ts[i] > 3);
  assert.ok(hi > .3, `atraso ${hi}`);
  assert.ok(Math.min(...after) < -.4 * hi, `passa do ponto ${Math.min(...after)}`);
  assert.ok(Math.abs(d(9)) < .02, 'assenta');
  const tip = drag => pose('dog', 3, { moving: 0, drag }).appendages.tail.at(-1)[0];
  assert.ok(tip(1) > tip(0) + 1 && tip(-1) < tip(0) - 1, 'a cauda segue o drag para os dois lados');
});
test('smear: a fast move draws the earlier poses under it; a slow one does not', () => {
  const walkAt = v => t => pose('human', 1 + v * t, { t });
  assert.equal(ctx.smear(walkAt(1), 1).smear, undefined);
  const fast = ctx.smear(walkAt(12), 1);
  assert.equal(fast.smear.length, 2); assert.ok(fast.smear[1].head.x < fast.smear[0].head.x && fast.smear[0].head.x < fast.head.x);
});
test('hands take a pose from the gesture (point) or o.hands (fist), open by default; o.mouth reaches the face', () => {
  const p = pose('human', 2, { moving: 0, gesture: { limb: 'armL', target: [400, 500], k: 1, hand: 'point' }, hands: { armR: 'fist' }, mouth: 'a' });
  assert.equal(p.limbs.armL.hand, 'point'); assert.equal(p.limbs.armR.hand, 'fist'); assert.equal(p.face.mouth, 'a');
  assert.equal(pose('human', 2).limbs.armL.hand, 'open');
});
test('talk: mouth shapes from a stable seed, several per second, closed outside the line', () => {
  const ms = Array.from({ length: 48 }, (_, i) => ctx.talk(3 + i / 24, 1, 3, 7));
  assert.ok(new Set(ms).size >= 3, ms.join()); assert.equal(ctx.talk(.5, 1, 3, 7), null); assert.equal(ctx.talk(4.2, 1, 3, 7), ctx.talk(4.2, 1, 3, 7));
});
test('ant variants: the queen walks on the tripod gait with feet on the ground; alates fly with the bird flight', () => {
  const q = pose('queen', 1.2, { size: 240 }).limbs; assert.equal(q.L1.stance, q.R2.stance); assert.notEqual(q.L1.stance, q.R1.stance);
  for (const l of Object.values(q)) if (l.stance) assert.ok(Math.abs(l.end[1] - 600) < .5);
  assert.equal(pose('queen', 1.2).wings.open, 0);
  const a = pose('alate', 2, { gait: 'fly' }); assert.equal(a.wings.open, 1); assert.ok(Object.values(a.limbs).every(l => !l.stance));
  assert.ok(pose('soldier', 2).spine[0].x - pose('soldier', 2).head.x < pose('ant', 2).spine[0].x - pose('ant', 2).head.x, 'cabeça do soldado mais à frente');
});
test('the fly hovers without a gait: no feet, wings beating, the body drifts at a fixed s', () => {
  const ps = [0, .4, .8, 1.2, 1.6].map(t => pose('fly', 2, { t }));
  assert.equal(Object.keys(ps[0].limbs).length, 0); assert.equal(ps[0].wings.open, 1);
  const xs = ps.map(p => p.head.x), ys = ps.map(p => p.head.y), range = a => Math.max(...a) - Math.min(...a);
  assert.ok(range(ys) > 2 && range(xs) > 2 && range(ys) < .7 * 120, `deriva ${range(xs)} ${range(ys)}`);
  assert.ok(new Set(ps.map(p => p.wings.phase.toFixed(3))).size > 2, 'asas batendo');
});
