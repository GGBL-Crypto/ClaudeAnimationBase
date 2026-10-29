import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDb } from '../scripts/app/db.mjs';
import { DEFAULTS } from '../scripts/app/config.mjs';
import { createYouTube, quotaDay } from '../scripts/app/youtube.mjs';
import { estimateMonitor, detectAlerts, autoRunDecision, runMonitor } from '../scripts/app/monitor.mjs';

const now = Date.parse('2026-10-28T12:00:00Z');
const cfg = { outlierMin: 2, subsJumpPct: 10 };

test('estimateMonitor', () => { assert.equal(estimateMonitor(0), 0); assert.equal(estimateMonitor(50), 101); assert.equal(estimateMonitor(51), 104); });
test('new recent video and outlier alerts', () => {
  const videos = [{ id: 'new00000001', title: 'N', publishedAt: '2026-10-27T00:00:00Z', multiple: 3 }, { id: 'old00000001', title: 'O', publishedAt: '2026-09-01T00:00:00Z', multiple: 5 }];
  const a = detectAlerts({ channelId: 'UC1', at: 'T', now, cfg, before: { videoIds: ['old00000001'], subs: 1000 }, after: { subs: 1000, videos } });
  assert.deepEqual(a.map(x => [x.kind, x.ref]), [['newVideo', 'new00000001'], ['outlier', 'new00000001']]);
  assert.deepEqual(a.map(x => x.videoId), ['new00000001', 'new00000001']);
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

// runMonitor: fixtures de tests/fixtures/youtube; extra = um vídeo novo (ontem, muito visto) em UCfixture1
const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/youtube/${n}.json`, import.meta.url), 'utf8'));
const res = body => ({ ok: true, status: 200, json: async () => body });
const NEW = { kind: 'youtube#video', id: 'vidfixture9', snippet: { publishedAt: '2026-10-27T10:00:00Z', channelId: 'UCfixture1', title: 'Fresh', thumbnails: {} }, contentDetails: { duration: 'PT5M' }, statistics: { viewCount: '90000' } };
function fake(extra) {
  const f = async url => {
    const u = new URL(url), m = u.pathname.split('/').pop(), p = k => u.searchParams.get(k); f.calls++;
    if (m === 'channels') return res({ items: fx('channels').items.filter(c => p('id').split(',').includes(c.id)) });
    if (m === 'playlistItems') { const it = p('playlistId') === 'UUfixture1' ? fx('playlistItems') : { items: [] }; return res(extra && it.items.length ? { items: [...it.items, { contentDetails: { videoId: NEW.id } }] } : it); }
    const ids = p('id').split(','); return res({ items: [...fx('videos').items, ...(extra ? [NEW] : [])].filter(v => ids.includes(v.id)) });
  };
  f.calls = 0; return f;
}
const mk = extra => { const db = openDb(':memory:'), f = fake(extra); return { db, f, yt: createYouTube({ key: 'K', db, cfg: DEFAULTS, fetch: f, now: () => now, fresh: true }) }; };
const report = () => {};

test('first run is baseline: no alerts; second run alerts once', async () => {
  const a = mk(true), b = mk(false); // a serve o vídeo novo; b não
  const db = a.db; db.upsertChannel({ id: 'UCfixture1', title: 'x' }); db.setWatch('UCfixture1', { monitor: true });
  const r1 = await runMonitor(a.yt, db, DEFAULTS, report, '2026-10-28T10:00:00Z', now); // baseline mesmo com vídeo recente e outlier
  assert.deepEqual(r1.baseline, ['UCfixture1']); assert.equal(r1.alerts, 0); assert.equal(db.alerts().length, 0); assert.equal(db.watch('UCfixture1').lastRun, '2026-10-28T10:00:00Z');
  const db2 = b.db; db2.upsertChannel({ id: 'UCfixture1', title: 'x' }); db2.setWatch('UCfixture1', { monitor: true });
  await runMonitor(b.yt, db2, DEFAULTS, report, '2026-10-28T10:00:00Z', now);
  const yt2 = createYouTube({ key: 'K', db: db2, cfg: DEFAULTS, fetch: fake(true), now: () => now, fresh: true });
  const r2 = await runMonitor(yt2, db2, DEFAULTS, report, '2026-10-28T11:00:00Z', now);
  assert.deepEqual(r2.baseline, []); assert.deepEqual(db2.alerts().map(x => x.kind).sort(), ['newVideo', 'outlier']); assert.equal(r2.alerts, 2);
  const r3 = await runMonitor(yt2, db2, DEFAULTS, report, '2026-10-28T12:00:00Z', now); assert.equal(r3.alerts, 0); assert.equal(db2.alerts().length, 2);
});
test('quota guard fails before any request', async () => {
  const { db, f, yt } = mk(); db.upsertChannel({ id: 'UCfixture1', title: 'x' }); db.setWatch('UCfixture1', { monitor: true });
  db.logQuota(quotaDay(now), 9999, 'search');
  await assert.rejects(runMonitor(yt, db, DEFAULTS, report, 'T', now), { message: 'Cota insuficiente: monitorar 1 canais custa ~3 unidades, restam 1' });
  assert.equal(f.calls, 0); assert.equal(db.watch('UCfixture1').lastRun, null);
});
test('vanished channel goes to failed, others continue, no alert for it', async () => {
  const { db, yt } = mk(); for (const id of ['UCfixture1', 'UCgone0000000000000000']) { db.upsertChannel({ id, title: id }); db.setWatch(id, { monitor: true }); }
  const r = await runMonitor(yt, db, DEFAULTS, report, '2026-10-28T10:00:00Z', now);
  assert.deepEqual(r.failed, [{ id: 'UCgone0000000000000000', error: 'Canal não encontrado' }]); assert.deepEqual(r.ok, ['UCfixture1']);
  assert.equal(db.watch('UCgone0000000000000000').lastRun, null); assert.equal(db.watch('UCfixture1').lastRun, '2026-10-28T10:00:00Z');
  assert.equal(db.alerts().filter(a => a.channelId === 'UCgone0000000000000000').length, 0);
});
test('nothing monitored', async () => { const { db, yt } = mk(); await assert.rejects(runMonitor(yt, db, DEFAULTS, report, 'T', now), /Nenhum canal seguido/); });
