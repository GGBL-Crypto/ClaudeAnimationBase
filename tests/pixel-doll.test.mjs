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
