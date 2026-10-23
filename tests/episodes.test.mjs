import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { catalog } from '../scripts/render-lib.mjs';
import { episodeProject, toSrt, youtubeText } from '../scripts/build-episodes.mjs';
import { mixArgs } from '../scripts/mix-audio.mjs';

test('both 2D styles expose the shared palette keys', () => {
  const p = catalog();
  for (const style of ['cartoon', 'watercolor']) for (const key of ['ground','groundDk','grass','grassDk','leaf','leafDk','water','sky','skyTop','skyLow','skin','skinDk','hair','cloth','clothDk','fur','furDk','chitin','chitinDk','wood','stone'])
    assert.match(p.styles[style].config.palette[key], /^#[\da-f]{6}$/i, `${style}.${key}`);
});
test('shotsById maps storyboard ids to start times and rejects unknown ids', () => {
  const ctx = vm.createContext({ projectConfig: catalog().resolveProject('visit', 'cartoon'), window: {} });
  for (const file of ['src/motion.js', 'src/timeline.js']) vm.runInContext(readFileSync(file, 'utf8'), ctx, { filename: file });
  vm.runInContext("shotsById({ goodbye: () => {} })", ctx);
  assert.equal(vm.runInContext('SHOTS[0][0]', ctx), 3);
  assert.throws(() => vm.runInContext("shotsById({ nope: () => {} })", ctx), /Plano desconhecido/);
});

const sampleEpisode = { id: 'amostra', title: 'Amostra', story: 'Uma história.', style: 'cartoon', compatibleStyles: ['cartoon'], fps: 24, voice: 'pt_BR-faber-medium', chapters: [{ id: 'c1', title: 'Um' }, { id: 'c2', title: 'Dois' }] };
const sampleTiming = { id: 'amostra', fps: 24, duration: 20, chapters: [{ id: 'c1', title: 'Um', start: 1, end: 10 }, { id: 'c2', title: 'Dois', start: 10, end: 20 }], shots: [
  { id: 'a', chapter: 'c1', start: 1, end: 6, visual: 'Plano a', transition: null, speech: [{ start: 1.25, end: 4, text: 'Olá, mundo.' }] },
  { id: 'b', chapter: 'c1', start: 6, end: 10, visual: 'Plano b', speech: [] },
  { id: 'c', chapter: 'c2', start: 10, end: 20, visual: 'Plano c', transition: 'fusão', speech: [{ start: 10.25, end: 15, text: 'Fim.' }] }] };
test('episodeProject registers a valid storyboard covering the timeline', () => {
  const p = catalog(), proj = episodeProject(sampleEpisode, sampleTiming, []);
  p.registerProject(proj); assert.equal(p.resolveProject(proj.id, 'cartoon').duration, sampleTiming.duration);
  assert.equal(proj.scripts.at(-1), 'src/episodes/placeholder.js');
  assert.equal(proj.storyboard[1].reads[0].text, 'Plano b'); assert.equal(proj.storyboard[0].transition, 'corte');
});
test('srt keeps accents and wraps lines', () => {
  const srt = toSrt({ shots: [{ speech: [{ start: 1, end: 4.5, text: 'A operária não descansa: “ela trabalha até o último dia”, dizem os biólogos que a estudam há décadas.' }] }] });
  assert.match(srt, /^1\n00:00:01,000 --> /); assert.match(srt, /operária/); assert.match(srt, /“ela/);
  for (const line of srt.split('\n')) assert.ok(line.length <= 42 || /-->/.test(line));
});
test('youtube chapters start at 00:00', () => { assert.match(youtubeText(sampleEpisode, sampleTiming), /\n00:00 /); });
test('mixArgs: bed always, sidechain and loop only with music, loudnorm and -t always', () => {
  const base = { narration: 'n.wav', duration: 14.375, out: 'm.m4a' }, a = mixArgs(base).join(' '), b = mixArgs({ ...base, music: 'x.mp3' }).join(' ');
  assert.ok(!/sidechaincompress|stream_loop/.test(a)); assert.match(a, /anoisesrc=color=brown:amplitude=0\.04/);
  assert.match(b, /sidechaincompress/); assert.match(b, /-stream_loop -1 -i x\.mp3/);
  for (const s of [a, b]) { assert.match(s, /loudnorm=I=-14:TP=-1\.5:LRA=11/); assert.match(s, /-t 14\.375/); }
});
