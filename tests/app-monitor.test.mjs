import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMonitor, detectAlerts, autoRunDecision } from '../scripts/app/monitor.mjs';

const now = Date.parse('2026-10-28T12:00:00Z');
const cfg = { outlierMin: 2, subsJumpPct: 10 };

test('estimateMonitor', () => { assert.equal(estimateMonitor(0), 0); assert.equal(estimateMonitor(50), 101); assert.equal(estimateMonitor(51), 104); });
test('new recent video and outlier alerts', () => {
  const videos = [{ id: 'new00000001', title: 'N', publishedAt: '2026-10-27T00:00:00Z', multiple: 3 }, { id: 'old00000001', title: 'O', publishedAt: '2026-09-01T00:00:00Z', multiple: 5 }];
  const a = detectAlerts({ channelId: 'UC1', at: 'T', now, cfg, before: { videoIds: ['old00000001'], subs: 1000 }, after: { subs: 1000, videos } });
  assert.deepEqual(a.map(x => [x.kind, x.ref]), [['newVideo', 'new00000001'], ['outlier', 'new00000001']]);
});
test('new but old video is not alerted', () => {
  const v = [{ id: 'late0000001', title: 'L', publishedAt: '2026-10-01T00:00:00Z', multiple: 1 }];
  assert.deepEqual(detectAlerts({ channelId: 'UC1', at: 'T', now, cfg, before: { videoIds: [], subs: null }, after: { subs: null, videos: v } }), []);
});
test('subs jump needs 10% and 100 subs, and known values', () => {
  const run = (from, to) => detectAlerts({ channelId: 'UC1', at: 'T', now, cfg, before: { videoIds: [], subs: from }, after: { subs: to, videos: [] } });
  assert.deepEqual(run(1000, 1100).map(x => [x.kind, x.ref, x.payload.pct]), [['subsJump', 'UC1@T', 10]]);
  assert.deepEqual(run(500, 560), []); assert.deepEqual(run(null, 5000), []); assert.deepEqual(run(0, 5000), []);
});
test('autoRunDecision order', () => {
  const base = { auto: true, monitored: 3, lastAt: null, now, remaining: 1000, estimate: 7 };
  assert.equal(autoRunDecision(base), 'run');
  assert.equal(autoRunDecision({ ...base, auto: false }), 'off');
  assert.equal(autoRunDecision({ ...base, monitored: 0 }), 'none');
  assert.equal(autoRunDecision({ ...base, lastAt: '2026-10-28T00:00:00Z' }), 'recent');
  assert.equal(autoRunDecision({ ...base, lastAt: '2026-10-27T11:00:00Z', remaining: 5 }), 'quota');
});
