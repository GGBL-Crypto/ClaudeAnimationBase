import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// hash vem de motion.js no navegador; aqui vai a mesma fórmula.
const ctx = vm.createContext({ hash: i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); } });
for (const f of ['sprites', 'figure']) vm.runInContext(readFileSync(`src/styles/pixel/${f}.js`, 'utf8'), ctx);
const facePlan = vm.runInContext('typeof facePlan === "function" ? facePlan : null', ctx);

test('open hands stay out of the face box in cheer', () => {
  const plan = facePlan({ face: 'happy', mouth: 'grin', hands: [[-15, -36], [16, -35]] }, 1.25);
  for (const h of plan.hands) for (const f of [plan.eyeNear, plan.eyeFar, plan.mouth]) assert.ok(h.x1 < f.x0 || h.x0 > f.x1 || h.y1 < f.y0 || h.y0 > f.y1);
});

const cfg = vm.createContext({ AnimationPlatform: { registerStyle: s => (cfg.style = s) } });
vm.runInContext(readFileSync('src/styles/pixel/config.js', 'utf8'), cfg);
test('cast ramps keep the value of the cast colour', () => {
  const R = cfg.style.config.ramps, rampFor = vm.runInContext('typeof rampFor === "function" ? rampFor : null', ctx);
  assert.equal(rampFor('#3a3a44', 'cloth', R)[3], R.grey[1]); assert.equal(rampFor('#c8c8d0', 'cloth', R)[3], R.grey[4]);
  assert.deepEqual([...rampFor('#d08a65', 'skin', R)], [...R.skinM]);
});
test('face glyphs paint only on the head, never on the near arm in front of it', () => {
  const [ellipsePart, quadPart, figureLayer, paintFace] = vm.runInContext('[ellipsePart, quadPart, figureLayer, typeof paintFace === "function" ? paintFace : null]', ctx);
  const R = { m: ['#000001', '#000002', '#000003', '#000004', '#000005'] }, box = { W: 40, H: 40, OX: 20, OY: 20 };
  const L = figureLayer([ellipsePart([0, 0], 9.75, 9.5, 'm', { g: 'head' }), quadPart([1, -6], [5, 6], 1.5, 1.5, 'm', { g: 'armF' })], box, { ramps: R, ink: '#ffffff' });
  const plan = facePlan({ face: 'neutral', mouth: 'm' }, 1.25), col = { K: '#k00000', W: '#w00000', B: '#b00000', S: '#s00000', P: '#p00000', T: '#t00000' }, before = [...L.cells];
  paintFace(L, plan, [0, 0], col);
  const onArm = k => L.groups[k] === 'armF';
  assert.ok(before.some((c, k) => onArm(k) && plan.eyeNear.x0 <= k % 40 - 20 && k % 40 - 20 <= plan.eyeNear.x1 && plan.eyeNear.y0 <= (k / 40 | 0) - 20 && (k / 40 | 0) - 20 <= plan.eyeNear.y1), 'o braço cobre o olho de perto');
  L.cells.forEach((c, k) => { if (onArm(k)) assert.equal(c, before[k]); });
  assert.ok(L.cells.includes('#k00000'));
});
test('secondary motion is periodic in L', () => {
  const sway = vm.runInContext('typeof sway === "function" ? sway : null', ctx);
  assert.ok(Math.abs(sway(0) - sway(1)) < 1e-9);
  const ph = t => t / 12 * Math.round(12 / 1.6);
  assert.ok(Math.abs(sway(ph(0)) - sway(ph(12))) < 1e-9);
});
