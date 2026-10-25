import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

// Esqueleto de ossos fixos (src/nature/skeleton.js + creaturePose): todo osso mede sempre o seu comprimento, joelho e
// cotovelo dobram para um lado só, pescoço e cabeça só giram dentro de JOINT_LIMITS; pé começa no tornozelo, mão no pulso.
const ctx = natureContext(['src/nature/noise.js', 'src/nature/path.js', 'src/nature/gait.js', 'src/nature/creature.js', 'src/nature/specs.js', 'src/nature/skeleton.js', 'src/nature/crowd.js', 'src/scenes/exp-estilos.js']);
const flat = () => 600, P = ctx.makePath([[0, 600], [4000, 600]]), TYPES = ['child', 'adult', 'elder', 'heavy', 'thin'];
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const specOf = id => TYPES.includes(id) ? ctx.humanSpec(id) : ctx.SPECS[id];
const walk = (id, F, fps = 30, o = {}) => ctx.creaturePose(specOf(id), { path: P, s: 1 + .9 * F / fps, size: 120, view: 'side', ground: flat, t: F / fps, seed: 1, ...o });

function checkSkeleton(p, label) {
  const L = ctx.JOINT_LIMITS, J = p.joints;
  for (const b of p.bones) {
    assert.ok(J[b.a] && J[b.b], `${label} osso ${b.name} sem juntas`);
    assert.ok(Math.abs(d(J[b.a], J[b.b]) - b.len) <= .01 * b.len + 1e-9, `${label} osso ${b.name}: ${d(J[b.a], J[b.b]).toFixed(2)} ≠ ${b.len.toFixed(2)}`);
  }
  assert.ok(Math.abs(p.angles.neck) <= L.neck + 1e-9, `${label} pescoço ${p.angles.neck}`);
  assert.ok(Math.abs(p.angles.head) <= L.head + 1e-9, `${label} cabeça ${p.angles.head}`);
  const neck = p.bones.find(b => b.name === 'neck'), head = p.bones.find(b => b.name === 'head');
  assert.equal(neck.b, 'headBase'); assert.equal(head.a, 'headBase');
  assert.ok(d(J.head, [p.head.x, p.head.y]) < 1e-9 && d(J.head, J.headBase) - head.len / 2 < 1e-6 && d(J.head, J.headTop) - head.len / 2 < 1e-6, `${label} cabeça no osso`);
  for (const [name, l] of Object.entries(p.limbs)) {
    if (!l.toe) continue;
    const tip = p.bones.find(b => b.b === Object.keys(J).find(k => J[k] === l.toe));
    assert.ok(tip && J[tip.a] === l.end, `${label} ${name}: pé/mão começa na ponta do membro`);
  }
  if (p.spec !== 'human') return;
  for (const s of ['L', 'R']) {
    const bend = (r, m, e) => Math.acos(Math.max(-1, Math.min(1, ((m[0] - r[0]) * (e[0] - m[0]) + (m[1] - r[1]) * (e[1] - m[1])) / (d(r, m) * d(m, e)))));  // 0 = reto
    // joelho à frente da linha quadril → tornozelo; cotovelo atrás da linha ombro → pulso (vista lateral, voltado para facing)
    assert.ok(cross(J['hip' + s], J['ankle' + s], J['knee' + s]) * p.facing <= 1e-6, `${label} joelho ${s} para trás`);
    assert.ok(cross(J['shoulder' + s], J['wrist' + s], J['elbow' + s]) * p.facing >= -1e-6, `${label} cotovelo ${s} para a frente`);
    assert.ok(bend(J['hip' + s], J['knee' + s], J['ankle' + s]) <= L.knee[1] + 1e-6, `${label} joelho ${s} dobra demais`);
    assert.ok(bend(J['shoulder' + s], J['elbow' + s], J['wrist' + s]) <= L.elbow[1] + 1e-6, `${label} cotovelo ${s} dobra demais`);
  }
}

test('humanSpec: every body type has fixed bones, a big head on the child, girth heavy > adult > thin', () => {
  for (const type of TYPES) { const s = ctx.humanSpec(type); assert.equal(s.id, 'human'); assert.equal(s.body, type); assert.ok(ctx.BODY[type]); }
  const B = ctx.BODY;
  assert.ok(B.child.r > 1.3 * B.adult.r, 'cabeça da criança');
  assert.ok(B.child.thigh + B.child.shin < B.adult.thigh + B.adult.shin, 'pernas da criança');
  assert.ok(B.heavy.girth > B.adult.girth && B.adult.girth > B.thin.girth, 'girth');
  assert.ok(B.elder.stoop > 0, 'idoso curvado');
});

test('standing humans: toes on the ground, head top at 1 BL (elder a little lower)', () => {
  for (const type of TYPES) {  // parado no meio do apoio do pé L (o R desce sob o quadril): pés sob o corpo
    const sp = { ...ctx.humanSpec(type), organic: { vary: 0 } }, p = ctx.creaturePose(sp, { path: P, s: 2.3 * sp.stride, size: 120, ground: flat, t: 1, seed: 1, moving: 0 }), J = p.joints, top = (600 - J.headTop[1]) / 120;
    assert.equal(p.body, type);
    for (const s of ['L', 'R']) assert.ok(Math.abs(J['toe' + s][1] - 600) < .5, `${type} dedo ${s} ${J['toe' + s][1]}`);
    if (type === 'elder') assert.ok(top > .93 && top < 1, `${type} altura ${top}`); else assert.ok(Math.abs(top - 1) < .005, `${type} altura ${top}`);
    checkSkeleton(p, `${type} parado`);
  }
});

test('walking humans, dog and bird: bones keep their length, joints stay in limits, stance toes on the ground', () => {
  for (const id of [...TYPES, 'dog', 'bird']) for (let F = 0; F < 120; F++) {
    const p = walk(id, F); checkSkeleton(p, `${id} quadro ${F}`);
    for (const [name, l] of Object.entries(p.limbs)) if (l.stance && l.toe) assert.ok(Math.abs(l.toe[1] - 600) < .5, `${id} ${name} quadro ${F} dedo no chão`);
  }
});

test('every creature exposes joints and bones; dead and flinching poses keep the bones', () => {
  for (const id of Object.keys(ctx.SPECS)) {
    const p = walk(id, 20); assert.ok(p.joints.neck && p.joints.headBase && p.joints.head && p.joints.headTop, id); checkSkeleton(p, id);
    if (ctx.SPECS[id].views.includes('top')) checkSkeleton(walk(id, 20, 30, { view: 'top' }), id + ' superior');
  }
  for (const id of ['adult', 'dog']) { checkSkeleton(walk(id, 20, 30, { alive: 0 }), id + ' morto'); checkSkeleton(walk(id, 20, 30, { flinch: 1 }), id + ' susto'); }
});

test('scene H: the explorer keeps every bone through walk, crouch, hand on knee and nod', () => {
  for (let i = 0; i <= 240; i++) {
    const t = i / 30, p = ctx.EST.frame('H', t).actors.find(a => a.kind === 'human').pose; checkSkeleton(p, `H t=${t.toFixed(2)}`);
    if (t > 4.7) assert.ok(d(p.joints.wristL, p.joints.kneeL) < .02 * p.size, `H t=${t.toFixed(2)} pulso no joelho`);
  }
});

test('scene A: the hero ant keeps its neck through the head turn (nod)', () => {
  for (let t = ctx.EST.times.T2; t < 20; t += .25) checkSkeleton(ctx.EST.frame('A', t).actors.find(a => a.id === 'hero').pose, `A t=${t.toFixed(2)}`);
});

test('handTo puts the hand tip exactly on the target; lowered keeps the bones; stepTo plants the ankle', () => {
  const sp = ctx.humanSpec('adult'), o = { path: P, s: 3, size: 300, ground: flat, t: 1, seed: 1, moving: 0 }, p0 = ctx.creaturePose(sp, o);
  for (const [limb, M] of [['armL', [p0.joints.shoulderL[0] + 80, p0.joints.shoulderL[1] + 40]], ['armR', [p0.joints.shoulderR[0] + 20, p0.joints.shoulderR[1] - 70]]]) {
    const p = ctx.creaturePose(sp, { ...o, gesture: [{ limb, target: ctx.handTo(p0, sp, limb, M), k: 1 }] }), tip = p.joints['hand' + limb.slice(-1)];
    assert.ok(d(tip, M) < 1e-6, `${limb} ponta da mão a ${d(tip, M)} px`); checkSkeleton(p, `handTo ${limb}`);
  }
  const low = ctx.creaturePose(ctx.lowered(sp, .1), o);
  assert.ok(Math.abs(low.joints.pelvis[1] - (600 - (sp.spine[1].h - .1) * 300)) < .5, `pelve .1 BL abaixo do quadril de pé: ${low.joints.pelvis[1]}`); checkSkeleton(low, 'lowered');
  assert.deepEqual(low.bones.map(b => b.len), p0.bones.map(b => b.len));
  const g = ctx.stepTo(p0, sp, 'legR', 1000, flat, 1), q = ctx.creaturePose(sp, { ...o, gesture: [g] });
  assert.ok(Math.abs(q.joints.toeR[1] - 600) < .5 && q.limbs.legR.stance, 'pé apoiado no fim do passo');
  assert.equal(ctx.creaturePose(sp, { ...o, gesture: [ctx.stepTo(p0, sp, 'legR', 1000, flat, .5)] }).limbs.legR.stance, false, 'no ar no meio');
});

test('turnHead uses per-spec limits (spec.limits), still clamped', () => {
  const dog = { ...ctx.SPECS.dog, limits: { neck: 1.5 } }, p = walk('dog', 10), q = ctx.creaturePose(dog, { path: P, s: 1 + .3, size: 120, ground: flat, t: 1 / 3, seed: 1 });
  assert.ok(Math.abs(ctx.turnHead(p, 1.2).angles.neck) <= .6 + 1e-9, 'padrão limita a .6');
  const r = ctx.turnHead(q, 1.2, 0, dog); assert.ok(r.angles.neck > .8 && r.angles.neck <= 1.5 + 1e-9, `pescoço ${r.angles.neck}`);
  assert.ok(Math.abs(ctx.turnHead(q, 3, 0, dog).angles.neck) <= 1.5 + 1e-9, 'ainda limitado');
});
