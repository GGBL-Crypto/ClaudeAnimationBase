import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

// Contatos das cenas P (praça) e N (lago) de src/scenes/exp-estilos.js: mãos no aperto, pelve no banco, flor na ponta da
// mão, focinho na água, tamanhos mínimos na tela e ossos de comprimento fixo ao longo da cena.
const ctx = natureContext(['src/nature/noise.js', 'src/nature/path.js', 'src/nature/gait.js', 'src/nature/creature.js', 'src/nature/specs.js', 'src/nature/skeleton.js', 'src/nature/crowd.js', 'src/scenes/exp-estilos.js']);
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), T = ctx.EST.times, frame = (s, t) => ctx.EST.frame(s, t), by = (F, id) => F.actors.find(a => a.id === id);
const range = (a, b, fps) => Array.from({ length: Math.floor((b - a) * fps) + 1 }, (_, i) => a + i / fps).filter(t => t <= b);
const onScreen = (F, [x, y]) => { const { cx, cy, z } = F.cam, X = (x - cx) * z + 960, Y = (y - cy) * z + 540; return X > 0 && X < 1920 && Y > 0 && Y < 1080; };

const ptSeg = (p, a, b) => { const L = d(a, b) ** 2, k = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / L)); return d(p, [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); };

test('P handshake: right hands side by side (tip at the other wrist, parallel, <= 2 px apart) with a pump', () => {
  const ys = [];
  for (const t of range(T.P.shake[1], T.P.shake[2], 30)) {
    const F = frame('P', t), A = by(F, 'joao').pose.joints, B = by(F, 'marta').pose.joints, ua = [A.handR[0] - A.wristR[0], A.handR[1] - A.wristR[1]], ub = [B.handR[0] - B.wristR[0], B.handR[1] - B.wristR[1]];
    const far = Math.max(...[A.wristR, A.handR].map(p => ptSeg(p, B.wristR, B.handR)), ...[B.wristR, B.handR].map(p => ptSeg(p, A.wristR, A.handR)));
    assert.ok(far <= 2, `t=${t.toFixed(2)} mãos a ${far.toFixed(2)} px uma da outra`);
    assert.ok(d(A.handR, B.wristR) <= 3 && d(B.handR, A.wristR) <= 3, `t=${t.toFixed(2)} ponta no pulso do outro`);
    assert.ok((ua[0] * ub[0] + ua[1] * ub[1]) / (Math.hypot(...ua) * Math.hypot(...ub)) < -.998, `t=${t.toFixed(2)} mãos paralelas`);
    ys.push(A.handR[1]);
  }
  assert.ok(Math.max(...ys) - Math.min(...ys) > 8, 'sacode para cima e para baixo');
});

test('P hug: the two heads do not touch', () => {
  for (const t of range(T.P.hug[0], T.P.hug[3], 15)) {
    const F = frame('P', t), [a, b] = ['joao', 'marta'].map(id => by(F, id).pose.joints), r = J => d(J.headBase, J.headTop) / 2;
    assert.ok(d(a.head, b.head) > r(a) + r(b), `t=${t.toFixed(2)} cabeças a ${d(a.head, b.head).toFixed(1)} px`);
  }
});

test('P bench: pelvis on the seat, thighs on it, toes on the ground while seated', () => {
  for (const t of range(T.P.seated[0], T.P.seated[1], 10)) {
    const F = frame('P', t), b = F.world.bench, a = by(F, 'lia'), J = a.pose.joints, S = a.pose.size;
    assert.ok(Math.abs(J.pelvis[1] - (b.seatY - .05 * S)) <= 1, `t=${t.toFixed(1)} pelve ${J.pelvis[1].toFixed(1)} assento ${b.seatY.toFixed(1)}`);
    assert.ok(Math.abs(J.pelvis[0] - b.x) <= b.w / 2, `t=${t.toFixed(1)} pelve fora do assento`);
    for (const s of ['L', 'R']) {
      assert.ok(Math.abs(J['knee' + s][1] - J['hip' + s][1]) < .08 * S, `t=${t.toFixed(1)} coxa ${s} não está deitada no assento`);
      assert.ok(Math.abs(J['toe' + s][1] - F.world.ground(J['toe' + s][0])) < 1.5 && a.pose.limbs['leg' + s].stance, `t=${t.toFixed(1)} pé ${s} no chão`);
    }
  }
});

test('P flower: rests on the ground, then sits exactly at the child hand tip from the grab on', () => {
  let prev = null;
  for (const t of range(17, 24, 30)) {
    const F = frame('P', t), it = F.world.item, h = by(F, 'bia').pose.joints.handL;
    if (t < T.P.grab) assert.ok(!it.held && Math.abs(it.y - (F.world.ground(it.x) - it.r)) < 1e-9, `t=${t.toFixed(2)} flor no chão`);
    else assert.ok(it.held && it.by === 'bia' && d([it.x, it.y], h) < 1e-6, `t=${t.toFixed(2)} flor na ponta da mão`);
    if (prev) assert.ok(d(prev, [it.x, it.y]) < 25, `t=${t.toFixed(2)} flor pula ${d(prev, [it.x, it.y]).toFixed(1)} px`);
    prev = [it.x, it.y];
  }
});

test('P faces read: humans >= 250 px tall in the medium shots; talkers move their mouths', () => {
  const mouths = {};
  for (const t of range(T.P.encontro, 30, 5)) {
    const F = frame('P', t);
    for (const a of F.actors.filter(a => a.kind === 'human')) {
      if (onScreen(F, a.pose.joints.head)) assert.ok(a.pose.size * F.cam.z >= 250, `t=${t.toFixed(1)} ${a.id} ${(a.pose.size * F.cam.z).toFixed(0)} px`);
      assert.ok(a.pose.face.expression, `${a.id} sem expressão`);
      if (a.pose.face.mouth) mouths[a.id] = true;
    }
  }
  for (const id of ['joao', 'marta', 'avo', 'bia']) assert.ok(mouths[id], `${id} não fala`);
});

test('N: animals >= 40 px on screen (background ants excepted); the fox snout reaches the water while drinking', () => {
  for (const t of range(0, 30, 4)) {
    const F = frame('N', t);
    for (const a of F.actors.filter(a => a.kind !== 'ant' && !a.hidden)) if (onScreen(F, a.pose.joints.head)) assert.ok(a.pose.size * F.cam.z >= 40, `t=${t.toFixed(2)} ${a.id} ${(a.pose.size * F.cam.z).toFixed(0)} px`);
  }
  let low = -Infinity;
  for (const t of range(T.N.drink[0], T.N.drink[1], 30)) {
    const F = frame('N', t), q = by(F, 'raposa').pose.joints.headTop;
    assert.ok(q[1] >= F.world.lake.waterY - 8 && q[1] <= F.world.lake.waterY + 1 && q[0] > F.world.lake.x0, `t=${t.toFixed(2)} focinho ${q.map(v => v.toFixed(1))}`);
    low = Math.max(low, q[1]);
  }
  assert.ok(Math.abs(low - frame('N', 12).world.lake.waterY) < 1, `o focinho toca a água (${low.toFixed(1)})`);
});

test('P and N: every bone keeps one length for the whole scene (per actor)', () => {
  for (const [scene, fps] of [['P', 4], ['N', 4]]) {
    const len = new Map();
    for (const t of range(0, 30, fps)) for (const a of frame(scene, t).actors) for (const b of a.pose.bones) {
      const k = `${a.id}/${b.name}`, L = len.get(k) ?? b.len; len.set(k, L);
      assert.ok(Math.abs(b.len - L) < 1e-6, `${scene} t=${t.toFixed(2)} ${k} ${b.len} ≠ ${L}`);
      assert.ok(Math.abs(d(a.pose.joints[b.a], a.pose.joints[b.b]) - L) <= .01 * L + 1e-6, `${scene} t=${t.toFixed(2)} ${k} esticou`);
    }
  }
});

test('N fox: paws stay on the dry bank while drinking, tail hangs low, the head lifts smoothly', () => {
  let prev = null;
  for (const t of range(10, 17, 30)) {
    const F = frame('N', t), p = by(F, 'raposa').pose, J = p.joints, tail = p.appendages.tail;
    if (t >= T.N.drink[0] && t <= T.N.drink[1]) for (const l of ['LF', 'RF']) assert.ok(J[l + '.toe'][0] < F.world.lake.x0, `t=${t.toFixed(2)} pata ${l} na água`);
    assert.ok(tail.at(-1)[1] > tail[0][1] - .05 * p.size, `t=${t.toFixed(2)} cauda erguida`);
    const a = Math.atan2(J.headTop[1] - J.headBase[1], J.headTop[0] - J.headBase[0]);
    if (prev !== null) assert.ok(Math.abs(a - prev) < .08, `t=${t.toFixed(2)} cabeça gira ${(a - prev).toFixed(2)} rad num quadro`);
    if (t > 15.5) assert.ok(a > -.7, `t=${t.toFixed(2)} focinho erguido demais (${a.toFixed(2)})`);
    prev = a;
  }
});

test('P bench is a park bench: seat at least .9 BL of the sitter, backrest along the full width', () => {
  const F = frame('P', 10), b = F.world.bench, S = by(F, 'lia').pose.size;
  assert.ok(b.w >= .9 * S && b.back === 0 && b.backH > 0);
});

