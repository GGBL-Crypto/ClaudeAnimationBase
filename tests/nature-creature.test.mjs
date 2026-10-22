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
test('fish spine waves over time', () => { assert.notEqual(pose('fish', 2, { t: 0 }).spine.at(-1).y, pose('fish', 2, { t: .25 }).spine.at(-1).y); });
