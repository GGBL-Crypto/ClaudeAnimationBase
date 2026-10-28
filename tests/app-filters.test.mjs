import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, applyFilters, sortRows, runPreset, parseFilters } from '../scripts/app/filters.mjs';

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
