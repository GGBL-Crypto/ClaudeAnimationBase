import test from 'node:test';
import assert from 'node:assert/strict';
import { wordTimes, chunks, buildAss } from '../scripts/episode-lib.mjs';

test('wordTimes is proportional and covers the sentence', () => {
  const w = wordTimes({ start: 10, end: 13, text: 'O céu se move.' });
  assert.equal(w[0].start, 10); assert.equal(w.at(-1).end, 13); assert.ok(w[0].end - w[0].start < w[1].end - w[1].start);
});
test('chunks of up to 7 words', () => { assert.deepEqual(chunks(wordTimes({ start: 0, end: 9, text: 'um dois três quatro cinco seis sete oito nove' })).map(c => c.words.length), [7, 2]); });
test('ass escapes override braces and backslashes', () => {
  const ass = buildAss({ style: 'pixel', episode: { chapters: [{ id: 'c', title: 'A {\\b1} B' }], shots: [] }, timing: { chapters: [{ id: 'c', title: 'A {\\b1} B', start: 0, end: 5 }], shots: [{ id: 's', start: 0, end: 5, speech: [{ start: 1, end: 2, text: 'Olá {x}\\n mundo' }] }] } });
  assert.ok(!/\{\\b1\}/.test(ass)); assert.match(ass, /Olá ｛x｝/); assert.match(ass, /PlayResX: 1920/); assert.match(ass, /Press Start 2P/);
});
test('one caption event per word with the current word highlighted', () => {
  const ass = buildAss({ style: 'flat', episode: { chapters: [], shots: [] }, timing: { chapters: [], shots: [{ id: 's', start: 0, end: 4, speech: [{ start: 0, end: 3, text: 'três palavras aqui' }] }] } });
  assert.equal((ass.match(/^Dialogue: .*,Caption,/gm) || []).length, 3); assert.match(ass, /Atkinson Hyperlegible/);
});
test('hud and tag events come from shot.hud', () => {
  const episode = { chapters: [{ id: 'c', title: 'C', shots: [{ id: 's', hud: { year: '1811', sub: 'Inverno', place: 'Vilarejo', tag: { text: 'Ana', sub: 'agricultora', actor: 0 } }, actors: [{ cast: 'a', action: 'stand', at: .3 }] }] }] };
  const ass = buildAss({ style: 'pixel', episode, timing: { chapters: [{ id: 'c', title: 'C', start: 0, end: 6 }], shots: [{ id: 's', start: 0, end: 6, speech: [] }] } });
  for (const s of ['Hud', 'Place', 'Tag']) assert.match(ass, new RegExp(`,${s},`)); assert.match(ass, /1811/);
});
