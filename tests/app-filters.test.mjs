import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, applyFilters, sortRows, runPreset, parseFilters, VIDEO_SORTS, applyVideoFilters, parseVideoFilters } from '../scripts/app/filters.mjs';

const rows = [
  { id: 'a', title: 'História Antiga', handle: '@hist', lang: 'pt', subs: 1000, avgViews: 5000, disparity: 5, ageDays: 40, videoCount: 12, frequency: 2, score: 85, daysSinceLast: 3, lastPublished: '2026-10-24', tag: 'historia' },
  { id: 'b', title: 'Sleep Facts', handle: '@sleep', lang: null, subs: null, avgViews: 800, disparity: null, ageDays: 400, videoCount: 300, frequency: 7, score: 30, daysSinceLast: 20, lastPublished: '2026-10-07', tag: null },
];
const ids = (r) => r.map((x) => x.id);

test('presets have the eight fixed ids', () => { assert.deepEqual(Object.keys(PRESETS), ['espelhar', 'novos', 'muitaView', 'fabrica', 'enxuto', 'semana', 'categoria', 'tudo']); });
test('null fields fail a filter unless includeUnknown', () => {
  assert.deepEqual(ids(applyFilters(rows, { lang: 'pt' })), ['a']);
  assert.deepEqual(ids(applyFilters(rows, { lang: 'pt', includeUnknown: true })), ['a', 'b']);
});
test('text search ignores accents and case', () => { assert.deepEqual(ids(applyFilters(rows, { q: 'historia' })), ['a']); assert.deepEqual(ids(applyFilters(rows, { q: '@SLEEP' })), ['b']); });
test('range and boolean filters', () => {
  assert.deepEqual(ids(applyFilters(rows, { subsMin: 500, subsMax: 1000 })), ['a']);
  assert.deepEqual(ids(applyFilters(rows, { ageMax: 90, videosMax: 12, scoreMin: 80, daysSinceLastMax: 7 })), ['a']);
  assert.deepEqual(ids(applyFilters([{ id: 'x', faceless: true }, { id: 'y', faceless: false }], { faceless: false })), ['y']);
  assert.deepEqual(ids(applyFilters([{ id: 'x', createdAt: '2026-05-01' }, { id: 'y', createdAt: '2025-01-01' }], { createdAfter: '2026-01-01' })), ['x']);
});
test('presets', () => {
  assert.deepEqual(ids(runPreset(rows, 'muitaView')), ['a']);
  assert.deepEqual(ids(runPreset(rows, 'fabrica')), ['b']);
  assert.deepEqual(ids(runPreset(rows, 'tudo')), ['a', 'b']);
  assert.deepEqual(ids(runPreset(rows, 'tudo', { scoreMin: 50 })), ['a']);
  assert.deepEqual(ids(runPreset(rows, 'semana')), ['a']);
});
test('categoria sorts by tag asc then score desc, nulls last', () => {
  const r = [{ id: '1', tag: 'b', score: 1 }, { id: '2', tag: 'a', score: 1 }, { id: '3', tag: 'a', score: 9 }, { id: '4', tag: null, score: 99 }];
  assert.deepEqual(ids(runPreset(r, 'categoria')), ['3', '2', '1', '4']);
});
test('sortRows puts nulls last both ways, copies', () => {
  assert.deepEqual(ids(sortRows(rows, 'subs', 'asc')), ['a', 'b']);
  assert.deepEqual(ids(sortRows(rows, 'subs', 'desc')), ['a', 'b']);
  assert.deepEqual(ids(sortRows(rows, 'score', 'asc')), ['b', 'a']);
  assert.deepEqual(ids(rows), ['a', 'b']);
});
test('parseFilters', () => {
  assert.deepEqual(parseFilters(new URLSearchParams('subsMin=100&includeUnknown=1&evil=x')), { subsMin: 100, includeUnknown: true });
  assert.deepEqual(parseFilters(new URLSearchParams('q=oi&faceless=false&lang=pt&subsMax=abc')), { q: 'oi', faceless: false, lang: 'pt' });
});

const now = Date.parse('2026-10-28T00:00:00Z');
const vids = [
  { id: 'v1', title: 'Roma Antiga', channelTitle: 'Hist', channelId: 'UCa', tag: 'historia', lang: 'pt-BR', channelLang: 'pt', publishedAt: '2026-10-25T00:00:00Z', durationS: 1500, views: 9000, viewsPerDay: 4500, multiple: 3 },
  { id: 'v2', title: 'Sleep', channelTitle: 'Zz', channelId: 'UCb', tag: null, lang: null, channelLang: 'en', publishedAt: '2026-06-01T00:00:00Z', durationS: 120, views: 100, viewsPerDay: 1, multiple: null },
];
test('video filters', () => {
  const vi = (f) => applyVideoFilters(vids, f, now).map((v) => v.id);
  assert.deepEqual(vi({ q: 'roma' }), ['v1']); assert.deepEqual(vi({ lang: 'en' }), ['v2']); assert.deepEqual(vi({ lang: 'pt' }), ['v1']);
  assert.deepEqual(vi({ multipleMin: 2 }), ['v1']); assert.deepEqual(vi({ maxAgeDays: 7 }), ['v1']); assert.deepEqual(vi({ durationMax: 239 }), ['v2']);
  assert.deepEqual(vi({ publishedAfter: '2026-10-01' }), ['v1']); assert.deepEqual(vi({ ids: ['v2'] }), ['v2']); assert.deepEqual(vi({ tag: 'historia' }), ['v1']); assert.deepEqual(vi({ channelId: 'UCb' }), ['v2']);
  assert.deepEqual(vi({ viewsMin: 1000, durationMin: 600 }), ['v1']);
});
test('parseVideoFilters', () => {
  assert.deepEqual(parseVideoFilters(new URLSearchParams('multipleMin=2&ids=vidfixture1,bad,vidfixture2&evil=1')), { multipleMin: 2, ids: ['vidfixture1', 'vidfixture2'] });
  assert.deepEqual(parseVideoFilters(new URLSearchParams('ids=bad')), {});
});
test('video sorts', () => { assert.deepEqual(VIDEO_SORTS, ['viewsPerDay', 'multiple', 'views', 'publishedAt']); assert.deepEqual(sortRows(vids, 'multiple', 'desc').map((v) => v.id), ['v1', 'v2']); });
