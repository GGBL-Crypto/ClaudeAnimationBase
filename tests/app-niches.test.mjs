import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNiches } from '../scripts/app/niches.mjs';
import { similarChannels } from '../scripts/app/analysis.mjs';

const now = Date.parse('2026-10-28T12:00:00Z');
const T = (id, titles, topics = []) => ({ id, title: id, topics, titles });
const texts = [T('UCa', ['Roman empire history', 'Roman legion history']), T('UCb', ['Roman history sleep', 'Empire roman facts']),
  T('UCc', ['Cute cats compilation', 'Cats funny']), T('UCd', ['Anything else'])];
const rows = [{ id: 'UCa', tag: null, score: 80 }, { id: 'UCb', tag: null, score: 60 }, { id: 'UCc', tag: 'Gatos', score: null }, { id: 'UCd', tag: null, score: 10 }];
test('tag wins, similar untagged cluster, lone channel goes to solo', () => {
  const { niches, total } = buildNiches({ texts, rows, videos: [], now, cfg: { nicheMin: 25, outlierMin: 2 } });
  assert.equal(total, 3);
  const auto = niches.find(n => n.source === 'automático');
  assert.deepEqual(auto.channelIds.sort(), ['UCa', 'UCb']); assert.equal(auto.id, 'c:UCa'); assert.equal(auto.avgScore, 70); assert.equal(auto.suggestedTag, 'roman');
  assert.equal(niches.find(n => n.id === 'tag:gatos').name, 'Gatos');
  assert.equal(niches.at(-1).id, 'solo'); assert.deepEqual(niches.at(-1).channelIds, ['UCd']);
});
test('empty base and channel without titles', () => {
  assert.deepEqual(buildNiches({ texts: [], rows: [], videos: [], now, cfg: { nicheMin: 25, outlierMin: 2 } }), { niches: [], total: 0 });
  const r = buildNiches({ texts: [T('UCe', [])], rows: [{ id: 'UCe', tag: null, score: null }], videos: [], now, cfg: { nicheMin: 25, outlierMin: 2 } });
  assert.equal(r.niches[0].id, 'solo'); assert.equal(r.niches[0].avgScore, null); assert.ok(!JSON.stringify(r).includes('NaN'));
});
test('neighbors share words and outliers count recent multiples', () => {
  const t2 = [...texts, T('UCf', ['Roman cats history', 'Roman cats empire']), T('UCg', ['Roman cats legion', 'History cats roman'])];
  const r2 = [...rows, { id: 'UCf', tag: 'Gatos romanos', score: 50 }, { id: 'UCg', tag: 'Gatos romanos', score: 50 }];
  const vids = [{ channelId: 'UCa', publishedAt: '2026-10-20T00:00:00Z', multiple: 3 }, { channelId: 'UCa', publishedAt: '2026-08-01T00:00:00Z', multiple: 9 }];
  const { niches } = buildNiches({ texts: t2, rows: r2, videos: vids, now, cfg: { nicheMin: 25, outlierMin: 2 } });
  assert.equal(niches.find(n => n.id === 'c:UCa').outliers, 1);
  assert.ok(niches.find(n => n.id === 'tag:gatos romanos').neighbors.some(x => x.id === 'c:UCa' && x.sharedWords.includes('roman')));
});
// Canais sintéticos: vocabulário por "tema" com ruído, sementes fixas.
const synth = (n, nt = 20) => Array.from({ length: n }, (_, i) => {
  const theme = i % 7, w = (k) => `w${theme}x${(i * 31 + k * 17) % 9}`, noise = (k) => `n${(i * 13 + k * 7) % 40}`;
  return T(`UC${String(i).padStart(4, '0')}`, Array.from({ length: nt }, (_, k) => `${w(k)} ${w(k + 3)} ${noise(k)} ${noise(k + 5)}`), i % 3 ? [`https://x/wiki/Tema_${theme}`] : []);
});
test('grouping equals the old similarChannels-based union', () => {
  const ts = [...texts, ...synth(60, 4)], rs = ts.map(c => ({ id: c.id, tag: null, score: 1 })), min = 25;
  const parent = new Map(ts.map(c => [c.id, c.id])), find = x => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  for (const c of ts) for (const o of similarChannels(c, ts, Infinity)) if (o.score >= min) parent.set(find(o.id), find(c.id));
  const ref = new Map(); for (const c of ts) { const r = find(c.id); (ref.get(r) ?? ref.set(r, []).get(r)).push(c.id); }
  const want = [...ref.values()].filter(m => m.length > 1).map(m => m.sort().join()).sort();
  const { niches } = buildNiches({ texts: ts, rows: rs, videos: [], now, cfg: { nicheMin: min, outlierMin: 2 } });
  const got = niches.filter(n => n.source === 'automático').map(n => [...n.channelIds].sort().join()).sort();
  assert.ok(want.length > 0); assert.deepEqual(got, want);
});
test('300 channels x 20 titles build in under 3 s', () => {
  const ts = synth(300), t0 = performance.now();
  buildNiches({ texts: ts, rows: ts.map(c => ({ id: c.id, tag: null, score: 1 })), videos: [], now, cfg: { nicheMin: 25, outlierMin: 2 } });
  assert.ok(performance.now() - t0 < 3000);
});
