import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

const ctx = natureContext();

test('springMove: parado antes de t0, chega ao alvo e só o bouncy passa dele', () => {
  const { springMove, SPRING } = ctx;
  for (const p of Object.values(SPRING)) { assert.equal(springMove(.99, 1, 10, 20, p), 10); assert.ok(Math.abs(springMove(4, 1, 10, 20, p) - 20) < 1e-3); }
  const peak = p => { let m = -Infinity; for (let t = 1; t < 3; t += 1 / 240) m = Math.max(m, springMove(t, 1, 10, 20, p)); return m; };
  assert.ok(peak(SPRING.bouncy) > 21, 'bouncy passa do alvo');
  assert.ok(peak(SPRING.smooth) <= 20 + 1e-9, 'smooth não passa do alvo');
  assert.ok(springMove(1.05, 1, 10, 20, SPRING.snappy) > springMove(1.05, 1, 10, 20, SPRING.smooth), 'snappy sai mais rápido');
});

test('springTrack: contínuo quando o alvo muda no meio do movimento e termina no último valor', () => {
  const { springTrack, SPRING } = ctx, keys = [[0, 0], [1, 100], [1.2, 40]];
  assert.equal(springTrack(.5, keys), 0);
  for (const t of [1, 1.2]) assert.ok(Math.abs(springTrack(t - 1e-6, keys, SPRING.bouncy) - springTrack(t + 1e-6, keys, SPRING.bouncy)) < 1e-2, `salto em ${t}`);
  assert.ok(Math.abs(springTrack(5, keys) - 40) < 1e-3);
});

test('twosTime: quadros 2k e 2k+1 iguais, 2k+1 e 2k+2 diferentes, na grade de quadros', () => {
  const { twosTime } = ctx;
  for (const fps of [24, 30]) for (let k = 0; k < 60; k++) {
    assert.equal(twosTime(2 * k / fps, fps), twosTime((2 * k + 1) / fps, fps));
    assert.notEqual(twosTime((2 * k + 1) / fps, fps), twosTime((2 * k + 2) / fps, fps));
    assert.equal(twosTime((2 * k + 1) / fps, fps), 2 * k / fps);
  }
});

test('anticipate: recua antes da ação, passa do alvo e assenta em 1', () => {
  const { anticipate } = ctx;
  assert.equal(anticipate(.99, 1), 0);
  assert.ok(Math.min(...[1.02, 1.05, 1.08, 1.1].map(t => anticipate(t, 1))) < -.1, 'contra-pose');
  assert.ok(Math.max(...Array.from({ length: 60 }, (_, i) => anticipate(1.12 + i / 120, 1))) > 1, 'passa do alvo');
  assert.ok(Math.abs(anticipate(2.5, 1) - 1) < 1e-3, 'assenta');
  for (const t of [1, 1.12]) assert.ok(Math.abs(anticipate(t - 1e-6, 1) - anticipate(t + 1e-6, 1)) < 1e-3, `contínuo em ${t}`);
});
