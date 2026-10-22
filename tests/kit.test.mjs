import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { natureContext } from './nature-helpers.mjs';

// Contexto Canvas2D falso: registra o nome de cada chamada; propriedades são atribuíveis.
function load() {
  const calls = [], c = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...a) => { calls.push(k); return k === 'createLinearGradient' || k === 'createRadialGradient' ? { addColorStop() {} } : undefined; }, set: (o, k, v) => (o[k] = v, true) });
  const ctx = natureContext();
  ctx.window.animationEngine = { context: c };
  vm.runInContext(readFileSync('src/styles/cartoon/kit.js', 'utf8'), ctx, { filename: 'kit.js' });
  return { Kit: ctx.window.Kit, calls };
}

test('Kit expõe os 11 nomes', () => {
  const { Kit } = load();
  assert.deepEqual(Object.keys(Kit).sort(), ['cam', 'camEnd', 'ellipse', 'flash', 'gradient', 'iris', 'line', 'poly', 'text', 'vignette', 'wipe']);
});

test('cam/camEnd fazem save/restore balanceados', () => {
  const { Kit, calls } = load();
  Kit.cam(960, 540, 1.5, .1); Kit.camEnd();
  assert.equal(calls.filter(k => k === 'save').length, 1);
  assert.equal(calls.filter(k => k === 'restore').length, 1);
});

test('primitivas desenham sem lançar e sem sobrar estado', () => {
  const { Kit, calls } = load();
  Kit.poly([[0, 0], [10, 0], [5, 8]], '#fff'); Kit.poly([[0, 0], [10, 0], [5, 8]], '#fff', { smooth: true, alpha: .5 });
  Kit.ellipse(5, 5, 4, 2, '#f00', { stroke: true, rot: .3, alpha: .5 });
  Kit.line([[0, 0], [5, 5], [9, 2]], '#000', 4); Kit.line([[0, 0], [5, 5]], '#000', 4, { smooth: false });
  Kit.gradient('#fff', '#000'); Kit.text('oi', 100, 100, 40, '#fff', { k: .5 }); Kit.wipe(.5); Kit.iris(100, 100, 50); Kit.flash(.5, '#fff'); Kit.vignette(.5);
  assert.equal(calls.filter(k => k === 'save').length, calls.filter(k => k === 'restore').length);
});
