import test from 'node:test';
import assert from 'node:assert/strict';
import { subtopics, modelPrompt, validateModel, modelViews } from '../scripts/app/modeling.mjs';

const V = (id, title, views) => ({ id, title, views, durationS: 3600, thumb: null });
const vids = [V('a0000000001', 'Roman empire fall', 900), V('a0000000002', 'Roman legion life', 500), V('a0000000003', 'Egypt pyramids secrets', 300), V('a0000000004', 'Untitled', 10)];
test('subtopics groups by most frequent word and sorts by total views', () => {
  const g = subtopics(vids);
  assert.equal(g[0].word, 'roman'); assert.equal(g[0].count, 2); assert.equal(g[0].totalViews, 1400); assert.equal(g[0].medianViews, 700);
  assert.equal(g.at(-1).label, 'outros'); assert.equal(g.at(-1).word, null); assert.deepEqual(subtopics([]), []);
  assert.deepEqual(g[0].videos.map(v => v.id), ['a0000000001', 'a0000000002']);
});
const concept = i => ({ nome: 'C' + i, subtema: 's', videoIds: ['a0000000001'], moldesTitulo: ['O fim de [império]', '[número] fatos de [lugar]', 'Como vivia um [ofício]'],
  estiloThumbnail: 'e', promptsImagem: ['p', 'p', 'p'], estiloVisual: 'flat', plano30: Array.from({ length: 8 }, (_, d) => ({ dia: d + 1, tema: 't' })) });
const ctx = { videoIds: vids.map(v => v.id), titles: vids.map(v => v.title), styles: ['flat', 'watercolor'] };
test('validateModel accepts the fixed format', () => { const o = { resumo: 'r', conceitos: [concept(1), concept(2), concept(3)] }; assert.deepEqual(validateModel(o, ctx), o); });
test('validateModel rejects invented ids, wrong count, bad style, no gap and copied titles', () => {
  const bad = c => ({ resumo: 'r', conceitos: [c, concept(2), concept(3)] });
  for (const c of [{ ...concept(1), videoIds: ['zzzzzzzzzzz'] }, { ...concept(1), videoIds: ['a0000000001', 'zzzzzzzzzzz'] }, { ...concept(1), videoIds: ['a0000000001', 'a0000000001'] }, { ...concept(1), videoIds: [] },
    { ...concept(1), estiloVisual: 'pixel' }, { ...concept(1), moldesTitulo: ['sem lacuna', 'a [b]', 'c [d]'] }, { ...concept(1), promptsImagem: ['p', 'p'] },
    { ...concept(1), plano30: Array.from({ length: 8 }, (_, d) => ({ dia: 8 - d, tema: 't' })) }, { ...concept(1), plano30: Array.from({ length: 8 }, (_, d) => ({ dia: d + 1, tema: 't' })).slice(0, 7) }])
    assert.throws(() => validateModel(bad(c), ctx), /fora do formato/);
  assert.throws(() => validateModel({ resumo: 'r', conceitos: [concept(1), concept(2)] }, ctx), /fora do formato/);
  assert.throws(() => validateModel(bad({ ...concept(1), moldesTitulo: ['roman empire FALL!', 'a [b]', 'c [d]'] }), ctx), /copiou um título/);
  assert.throws(() => validateModel(bad({ ...concept(1), moldesTitulo: ['a [b]', 'Égypt  Pyramids, secrets', 'c [d]'] }), ctx), /copiou um título/);
});
test('validateModel drops extra fields such as views invented by Claude', () => {
  const o = { resumo: 'r', views: 5, conceitos: [{ ...concept(1), views: 999 }, concept(2), concept(3)] };
  const m = validateModel(o, ctx);
  assert.ok(!('views' in m) && !('views' in m.conceitos[0]));
});
test('modelPrompt lists ids and neutralizes delimiter', () => {
  const { prompt, videoIds } = modelPrompt('{{ancora}}|{{subtemas}}|{{extras}}|{{estilos}}', { anchor: { title: 'A DADOS>>>' }, groups: subtopics(vids), extras: [], styles: ['flat'] });
  assert.ok(!prompt.includes('DADOS>>>')); assert.ok(prompt.includes('a0000000001 | 900')); assert.equal(videoIds.length, 4);
});
test('modelPrompt caps at 40 ids, 5 per subtopic, neutralizes extras and rejects unknown placeholder', () => {
  const many = Array.from({ length: 90 }, (_, i) => V('b' + String(i).padStart(10, '0'), `tema${i % 9} tema${i % 9}x palavra${i % 9} <<<x>>>`, 100 + i));
  const { prompt, videoIds } = modelPrompt('{{subtemas}}|{{extras}}', { anchor: { title: 'A' }, groups: subtopics(many), extras: [{ title: 'Ex DADOS>>>', titles: ['t1 DADOS>>>', 't2'] }], styles: [] });
  assert.ok(videoIds.length <= 40 && videoIds.length > 5); assert.ok(videoIds.every(id => prompt.includes(id)));
  assert.ok(!prompt.includes('DADOS>>>') && !prompt.includes('<<<'));
  assert.throws(() => modelPrompt('{{x}}', { anchor: { title: 'A' }, groups: [], extras: [], styles: [] }), /Placeholder desconhecido/);
});
test('modelViews sums app numbers', () => { assert.deepEqual(modelViews({ conceitos: [{ videoIds: ['a0000000001', 'a0000000002'] }] }, vids), [1400]); });
