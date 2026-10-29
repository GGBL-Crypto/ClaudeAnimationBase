import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { natureContext } from './nature-helpers.mjs';
import { episodeProject, loopKeyOf, writeEpisodes, canonParams } from '../scripts/build-episode.mjs';

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
  const p = episodeProject(ep, timing), [a, b] = p.episode.shots;
  assert.equal(loopKeyOf(a, ep.cast), a.key); assert.equal(loopKeyOf(b, ep.cast), b.key); assert.equal(a.key, b.key);
  assert.ok(a.key.startsWith('mar-'));
});
test('loop key changes with params, actors, cast used and loop length', () => {
  const [a] = episodeProject(ep, timing).episode.shots, k = (o, cast = ep.cast) => loopKeyOf({ ...a, ...o }, cast);
  assert.equal(k({}), a.key);
  assert.notEqual(k({ params: { ...a.params, seed: 2 } }), a.key);
  assert.notEqual(k({ actors: [{ cast: 'a', action: 'stand', at: .5, dir: 1 }] }), a.key);
  assert.notEqual(k({ actors: [{ cast: 'a', action: 'stand', at: .5, dir: 1 }] }, [{ ...ep.cast[0], body: 'child' }]), k({ actors: [{ cast: 'a', action: 'stand', at: .5, dir: 1 }] }));
  assert.notEqual(k({ loopLen: 14 }), a.key);
});
test('writeEpisodes replaces the same id and keeps others', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'ep-')), 'episodes.js');
  writeEpisodes([episodeProject(ep, timing)], f); writeEpisodes([{ ...episodeProject(ep, timing), id: 'ep-outro' }], f); writeEpisodes([episodeProject(ep, timing)], f);
  assert.equal((readFileSync(f, 'utf8').match(/registerProject/g) || []).length, 2);
});
test('loop key ignores key order, omitted defaults and extras order', () => {
  const shot = { scene: 'mar', params: { time: 'night', extras: ['ship', 'lighthouse'] }, actors: [{ cast: 'a', action: 'stand', at: .5, dir: 1 }], loopLen: 12 };
  const same = { ...shot, params: { extras: ['lighthouse', 'ship'], time: 'night', seed: 0, weather: 'clear', framing: 'wide' }, actors: [{ dir: 1, action: 'stand', cast: 'a' }] };
  assert.equal(loopKeyOf(same, ep.cast), loopKeyOf(shot, ep.cast));
  assert.equal(loopKeyOf({ ...shot, params: {} }, ep.cast), loopKeyOf({ ...shot, params: canonParams({}) }, ep.cast));
  assert.notEqual(loopKeyOf({ ...shot, params: { time: 'day' } }, ep.cast), loopKeyOf(shot, ep.cast));
});
test('canonParams defaults match the kit DEFAULTS', () => {
  const NATURE = ['noise', 'path', 'gait', 'creature', 'specs', 'skeleton', 'env', 'crowd', 'actors'].map(f => `src/nature/${f}.js`);
  const { KIT_DEFAULTS } = natureContext([...NATURE, 'src/episode/kit.js']);
  assert.deepEqual(JSON.parse(JSON.stringify(KIT_DEFAULTS)), canonParams({}));
});
test('writeEpisodes leaves no temp file behind', () => {
  const d = mkdtempSync(join(tmpdir(), 'ep-')), f = join(d, 'episodes.js');
  writeEpisodes([episodeProject(ep, timing)], f);
  assert.deepEqual(readdirSync(d), ['episodes.js']);
});
