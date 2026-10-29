import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { episodeProject, loopKeyOf, writeEpisodes } from '../scripts/build-episode.mjs';

// Só a plataforma e a config dos estilos (sem src/config.js nem src/episodes.js).
function vmWithPlatform() {
  const ctx = vm.createContext({});
  for (const f of ['src/platform.js', ...readdirSync('src/styles').filter(n => existsSync(`src/styles/${n}/config.js`)).map(n => `src/styles/${n}/config.js`)]) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx;
}
const timing = { id: 'demo', fps: 24, duration: 20, chapters: [{ id: 'c1', title: 'Um', start: 0, end: 20 }],
  shots: [{ id: 's1', chapter: 'c1', start: 0, end: 12, speech: [{ start: .25, end: 3, text: 'Olá.' }] }, { id: 's2', chapter: 'c1', start: 12, end: 20, speech: [] }] };
const scene = { id: 'mar', params: { time: 'night', weather: 'clear', seed: 1, framing: 'wide', extras: ['lighthouse'] } };
const ep = { id: 'demo', style: 'pixel', cast: [{ id: 'a', body: 'adult' }], sources: [{ url: 'https://pt.wikipedia.org/wiki/Farol', title: 'Farol', accessed: '2026-10-29' }],
  chapters: [{ id: 'c1', title: 'Um', shots: [{ id: 's1', narration: 'Olá.', scene }, { id: 's2', scene }] }] };

test('episode project passes platform validation and covers the duration', () => {
  const p = episodeProject(ep, timing), ctx = vmWithPlatform(); ctx.AnimationPlatform.registerProject(p);
  assert.equal(p.id, 'ep-demo'); assert.equal(p.duration, 20); assert.deepEqual(p.storyboard.map(s => [s.start, s.end]), [[0, 12], [12, 20]]);
  assert.ok(p.storyboard[1].reads[0].text);
});
test('the intro belongs to the first shot', () => {
  const t = { ...timing, shots: [{ ...timing.shots[0], start: 1.5 }, timing.shots[1]] };
  assert.equal(episodeProject(ep, t).storyboard[0].start, 0);
});
test('same scene in two shots shares one loop key', () => {
  const p = episodeProject(ep, timing); assert.equal(loopKeyOf(p.episode.shots[0]), loopKeyOf(p.episode.shots[1]));
  assert.equal(p.episode.shots[0].key, p.episode.shots[1].key);
  assert.notEqual(loopKeyOf({ ...p.episode.shots[0], params: { ...scene.params, seed: 2 } }), p.episode.shots[0].key);
});
test('writeEpisodes replaces the same id and keeps others', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'ep-')), 'episodes.js');
  writeEpisodes([episodeProject(ep, timing)], f); writeEpisodes([{ ...episodeProject(ep, timing), id: 'ep-outro' }], f); writeEpisodes([episodeProject(ep, timing)], f);
  assert.equal((readFileSync(f, 'utf8').match(/registerProject/g) || []).length, 2);
});
