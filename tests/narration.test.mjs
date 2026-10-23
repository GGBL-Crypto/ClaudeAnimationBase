import test from 'node:test';
import assert from 'node:assert/strict';
import { splitSentences, layoutTimeline, readWav, writeWav, composeNarration, ttsCacheKey } from '../scripts/narration-lib.mjs';

test('splitSentences handles ellipsis, questions and accents', () => {
  assert.deepEqual(splitSentences('Ela nasceu. Será que sobrevive? Talvez… Não sabemos!'), ['Ela nasceu.', 'Será que sobrevive?', 'Talvez…', 'Não sabemos!']);
});
test('silent shots and chapter pauses produce a valid timeline', () => {
  const ep = { id: 'x', fps: 24, intro: 1, outro: 2, chapters: [{ id: 'a', title: 'A', shots: [{ id: 'a1', narration: 'Um. Dois.', visual: 'v' }, { id: 'a2', visual: 'silêncio' }] }, { id: 'b', title: 'B', shots: [{ id: 'b1', narration: 'Três.', visual: 'v' }] }] };
  const tm = layoutTimeline(ep, new Map([['a1', [1, 2]], ['b1', [1.5]]]));
  assert.ok(tm.shots[1].end - tm.shots[1].start >= 3 - 1 / 24); assert.equal(tm.shots[0].speech[0].start, 1.25);
  for (let i = 1; i < tm.shots.length; i++) assert.equal(tm.shots[i].start, tm.shots[i - 1].end);
  assert.equal(tm.duration, tm.shots.at(-1).end); assert.ok(tm.shots[2].speech[0].start - tm.shots[1].end >= 1.6);
});
test('wav round trip and composition place clips at exact samples', () => {
  assert.deepEqual(Array.from(readWav(writeWav({ sampleRate: 22050, samples: Int16Array.from([1, 2, 3]) })).samples), [1, 2, 3]);
  const out = composeNarration({ duration: 1, shots: [{ id: 's', speech: [{ start: .5, end: .5001, text: 'x' }] }] }, new Map([['s#0', Int16Array.from([9])]]), 100);
  assert.equal(out[50], 9); assert.equal(out.length, 100);
});
test('composeNarration works at 24000 Hz', () => {
  const out = composeNarration({ duration: 2, shots: [{ id: 's', speech: [{ start: 1.5, end: 1.6, text: 'x' }] }] }, new Map([['s#0', Int16Array.from([7])]]), 24000);
  assert.equal(out.length, 48000); assert.equal(out[36000], 7);
});
test('tts cache key separates voices, speed and text', () => {
  const k = ttsCacheKey('kokoro:pm_alex', 1, 'Olá.');
  assert.match(k, /^[0-9a-f]{40}$/);
  assert.notEqual(k, ttsCacheKey('pt_BR-faber-medium', 1, 'Olá.'));
  assert.notEqual(k, ttsCacheKey('kokoro:pf_dora', 1, 'Olá.'));
  assert.notEqual(k, ttsCacheKey('kokoro:pm_alex', 1.1, 'Olá.'));
  assert.equal(k, ttsCacheKey('kokoro:pm_alex', 1, 'Olá.'));
});
