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
  const episode = { cast: [{ id: 'a', body: 'adult' }], chapters: [{ id: 'c', title: 'C', shots: [{ id: 's', scene: { id: 'campo' }, hud: { year: '1811', sub: 'Inverno', place: 'Vilarejo', tag: { text: 'Ana', sub: 'agricultora', actor: 0 } }, actors: [{ cast: 'a', action: 'stand', at: .3 }] }] }] };
  const ass = buildAss({ style: 'pixel', episode, timing: { chapters: [{ id: 'c', title: 'C', start: 0, end: 6 }], shots: [{ id: 's', start: 0, end: 6, speech: [] }] } });
  for (const s of ['Hud', 'Place', 'Tag']) assert.match(ass, new RegExp(`,${s},`)); assert.match(ass, /1811/);
});
test('the tag sits above the head through the real camera (wide and mid framing)', () => {
  const pos = (framing, at) => {
    const episode = { cast: [{ id: 'a', body: 'adult' }], chapters: [{ id: 'c', title: 'C', shots: [{ id: 's', scene: { id: 'campo', params: { framing } }, actors: [{ cast: 'a', action: 'stand', at }], hud: { tag: { text: 'Ana', actor: 'a' } } }] }] };
    const ass = buildAss({ style: 'pixel', episode, timing: { chapters: [], shots: [{ id: 's', start: 0, end: 6, speech: [] }] } });
    return ass.match(/\\pos\((\d+),(\d+)\)/).slice(1).map(Number);
  };
  const [wx, wy] = pos('wide', .3), [mx, my] = pos('mid', .3);
  // wide: z 1, cx ~960, cabeça de adulto a ~180 px do chão (~885): x perto de .3 * 1920, y perto de 700 - 16
  assert.ok(Math.abs(wx - 576) < 40, `wide x ${wx}`); assert.ok(wy > 640 && wy < 720, `wide y ${wy}`);
  // mid: z 1.35, cy 610: (576 - 960) * 1.35 + 960 = 442; a cabeça sobe na tela (o centro da câmera desce)
  assert.ok(Math.abs(mx - 442) < 40, `mid x ${mx}`); assert.ok(my < wy - 20, `mid y ${my} vs wide ${wy}`);
});
test('a chapter title lasts at most the chapter length', () => {
  const ass = buildAss({ style: 'flat', episode: { chapters: [] }, timing: { chapters: [{ id: 'c', title: 'Curto', start: 10, end: 11 }], shots: [] } });
  assert.match(ass, /Dialogue: 0,0:00:10\.00,0:00:11\.00,Chapter/);
});

// --- validateEpisode ---
import { readFileSync } from 'node:fs';
import { validateEpisode } from '../scripts/episode-lib.mjs';
const demo = () => JSON.parse(readFileSync('fixtures/episodes/demo/episode.json', 'utf8'));
const shotOf = (ep, id) => ep.chapters.flatMap(c => c.shots).find(s => s.id === id);
const bad = (name, mut, re) => test(`validateEpisode rejects ${name}`, () => { const ep = demo(); mut(ep); assert.throws(() => validateEpisode(ep), re); });

test('validateEpisode accepts the demo with no warnings', () => { assert.deepEqual(validateEpisode(demo()), { ok: true, warnings: [] }); });
bad('missing id', ep => { delete ep.id; }, /id:/);
bad('a bad id', ep => { ep.id = 'Demo 1'; }, /id:/);
bad('missing title', ep => { delete ep.title; }, /title:/);
bad('an unknown style', ep => { ep.style = 'nope'; }, /style:/);
bad('a style without episodeScenes', ep => { ep.style = 'debug'; }, /style:/);
bad('loopLen below 10', ep => { ep.loopLen = 9; }, /loopLen:/);
bad('loopLen above 20', ep => { ep.loopLen = 21; }, /loopLen:/);
bad('a non-numeric lengthScale', ep => { ep.lengthScale = 'x'; }, /lengthScale:/);
bad('a bad intro', ep => { ep.intro = -1; }, /intro:/);
bad('a bad fps', ep => { ep.fps = 0; }, /fps:/);
bad('an fps other than 24', ep => { ep.fps = 30; }, /fps: só 24/);
bad('a non-numeric outro', ep => { ep.outro = '2'; }, /outro:/);
bad('a bad voice', ep => { ep.voice = 3; }, /voice:/);
bad('a cast over 6', ep => { ep.cast = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, body: 'adult' })); ep.chapters = [{ id: 'c', title: 'C', shots: [{ id: 's', scene: { id: 'campo', params: {} } }] }]; }, /Elenco/);
bad('a bad body', ep => { ep.cast[0].body = 'giant'; }, /Elenco inválido/);
bad('no chapters', ep => { ep.chapters = []; }, /chapters:/);
bad('a chapter without title', ep => { delete ep.chapters[0].title; }, /chapters\[0\]\.title:/);
bad('a chapter without shots', ep => { ep.chapters[0].shots = []; }, /chapters\[0\]\.shots:/);
bad('a duplicate chapter id', ep => { ep.chapters[1].id = 'c1'; }, /Capítulo repetido: c1/);
bad('a duplicate shot id', ep => { shotOf(ep, 's2').id = 's1'; }, /Plano repetido: s1/);
bad('a shot id outside the pattern', ep => { shotOf(ep, 's1').id = 'S 1'; }, /Plano inválido: id/);
bad('a shot without scene', ep => { delete shotOf(ep, 's1').scene; }, /s1: scene/);
bad('an unknown scene', ep => { shotOf(ep, 's1').scene.id = 'lua'; }, /Cena desconhecida: lua/);
bad('an invalid param', ep => { shotOf(ep, 's1').scene.params.weather = 'hail'; }, /Parâmetro inválido em ceu-noturno: weather/);
bad('an extra outside the scene list', ep => { shotOf(ep, 's1').scene.params.extras = ['lighthouse']; }, /Parâmetro inválido em ceu-noturno: extras/);
bad('an actor outside the cast', ep => { shotOf(ep, 's1').actors[0].cast = 'ninguem'; }, /Elenco sem ninguem/);
bad('an invalid action', ep => { shotOf(ep, 's1').actors[0].action = 'dance'; }, /Ação inválida/);
bad('walk indoors', ep => { shotOf(ep, 's7').actors[0].action = 'walk'; }, /walk só vale em cena de exterior/);
bad('actors on the map', ep => { shotOf(ep, 's8').actors = [{ cast: 'leitor', action: 'stand' }]; }, /não tem atores/);
bad('more than 3 actors', ep => { shotOf(ep, 's1').actors = Array(4).fill({ cast: 'leitor', action: 'stand' }); }, /Até 3 atores/);
bad('narration without sources', ep => { delete ep.sources; }, /sources:/);
bad('a source without url', ep => { delete ep.sources[0].url; }, /sources\[0\]\.url:/);
bad('a source without accessed', ep => { delete ep.sources[1].accessed; }, /sources\[1\]\.accessed:/);
bad('a non-string narration', ep => { shotOf(ep, 's1').narration = 5; }, /narration:/);
bad('a bad hold', ep => { shotOf(ep, 's3').hold = 0; }, /hold:/);
bad('a hud field of the wrong type', ep => { shotOf(ep, 's2').hud.place = 4; }, /hud\.place:/);
bad('a tag without text', ep => { delete shotOf(ep, 's7').hud.tag.text; }, /hud\.tag\.text:/);
bad('a tag actor out of range', ep => { shotOf(ep, 's7').hud.tag.actor = 3; }, /hud\.tag\.actor:/);
bad('a tag actor not in the shot', ep => { shotOf(ep, 's7').hud.tag.actor = 'viajante'; }, /hud\.tag\.actor:/);
bad('a tag on a walker', ep => { const s = shotOf(ep, 's6'); s.hud = { tag: { text: 'x', actor: 0 } }; }, /hud\.tag\.actor:.*walk/);

test('validateEpisode accepts narration-free episodes without sources', () => {
  const ep = demo(); delete ep.sources; for (const c of ep.chapters) for (const s of c.shots) delete s.narration;
  assert.equal(validateEpisode(ep).ok, true);
});
test('validateEpisode accepts missing fps, intro and outro, and the timeline then has no NaN', async () => {
  const ep = demo(); delete ep.fps; delete ep.intro; delete ep.outro; for (const c of ep.chapters) for (const s of c.shots) delete s.narration; assert.equal(validateEpisode(ep).ok, true);
  const { layoutTimeline } = await import('../scripts/narration-lib.mjs'), t = layoutTimeline(ep, new Map());
  assert.equal(t.fps, 24); assert.ok(Number.isFinite(t.duration) && t.shots.every(s => Number.isFinite(s.start) && Number.isFinite(s.end)));
});
test('validateEpisode accepts a tag actor by index or by cast id', () => {
  const ep = demo(); shotOf(ep, 's7').hud.tag.actor = 0; assert.equal(validateEpisode(ep).ok, true);
});
test('validateEpisode warns (does not throw) on the same scene and params in consecutive shots', () => {
  const ep = demo(), a = shotOf(ep, 's1'), b = shotOf(ep, 's2'); b.scene = JSON.parse(JSON.stringify(a.scene));
  const { ok, warnings } = validateEpisode(ep);
  assert.equal(ok, true); assert.equal(warnings.length, 1); assert.match(warnings[0], /s1.*s2.*ceu-noturno/);
});
test('validateEpisode warns when one shot omits the defaults the other spells out', () => {
  const ep = demo(), a = shotOf(ep, 's1'), b = shotOf(ep, 's2'); a.scene = { id: 'campo', params: {} };
  b.scene = { id: 'campo', params: { extras: [], framing: 'wide', seed: 0, weather: 'clear', time: 'day' } };
  assert.equal(validateEpisode(ep).warnings.length, 1);
});
test('validateEpisode does not warn when params differ', () => {
  const ep = demo(), a = shotOf(ep, 's1'), b = shotOf(ep, 's2'); b.scene = { id: a.scene.id, params: { ...a.scene.params, seed: 5 } };
  assert.deepEqual(validateEpisode(ep).warnings, []);
});
