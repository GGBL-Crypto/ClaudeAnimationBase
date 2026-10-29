import test from 'node:test';
import assert from 'node:assert/strict';
import { EPISODE_STYLES, styleNames, VOICES, PROFILE_DEFAULTS, validateProfile, profileFromConcept } from '../scripts/app/profiles.mjs';

const base = { name: 'Roma à Noite', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex' };

test('constants', () => {
  assert.deepEqual(EPISODE_STYLES, ['flat', 'pixel', 'watercolor']);
  assert.deepEqual(styleNames().map((s) => s.id), EPISODE_STYLES); assert.ok(styleNames().every((s) => s.name));
  assert.deepEqual(VOICES.pt, ['pm_alex', 'pf_dora', 'pm_santa']);
  assert.equal(VOICES.en.length, 5);
  assert.deepEqual(PROFILE_DEFAULTS, { speed: 1, targetMin: 30, toleranceMin: 3, format: 'long-16:9', titleTemplates: [], descriptionTemplate: '' });
});

test('defaults are applied', () => {
  const p = validateProfile(base);
  assert.equal(p.targetMin, 30);
  assert.equal(p.toleranceMin, 3);
  assert.equal(p.format, 'long-16:9');
  assert.equal(p.speed, 1);
  assert.deepEqual(p.titleTemplates, []);
  assert.equal(p.descriptionTemplate, '');
});

test('trims and keeps valid values; format is forced', () => {
  const p = validateProfile({ ...base, name: '  Roma  ', tag: ' historia ', speed: 0.8, targetMin: 120, toleranceMin: 15, format: 'short', titleTemplates: [' [a] b '], descriptionTemplate: ' {fontes} ', anchorId: 'UCaaaaaaaaaaaaaaaaaaaaaa' });
  assert.deepEqual([p.name, p.tag, p.speed, p.targetMin, p.toleranceMin, p.format, p.titleTemplates, p.descriptionTemplate, p.anchorId],
    ['Roma', 'historia', 0.8, 120, 15, 'long-16:9', ['[a] b'], '{fontes}', 'UCaaaaaaaaaaaaaaaaaaaaaa']);
});

test('invalid fields give field messages', () => {
  const cases = [[{ lang: 'es' }, /pt ou en/], [{ lang: 'constructor' }, /pt ou en/], [{ style: 'stick' }, /Estilo/], [{ voice: 'kokoro:af_heart' }, /Voz/], [{ targetMin: 5 }, /Duração/], [{ speed: 2 }, /Velocidade/], [{ name: ' ' }, /Nome/], [{ titleTemplates: Array(11).fill('x') }, /moldes/], [{ anchorId: '../x' }, /Âncora/],
    [{ tag: 'x'.repeat(41) }, /Etiqueta/], [{ toleranceMin: 16 }, /Tolerância/], [{ targetMin: 30.5 }, /Duração/], [{ titleTemplates: ['x'.repeat(121)] }, /moldes/], [{ descriptionTemplate: 'x'.repeat(2001) }, /Descrição/], [{ speed: 'rápido' }, /Velocidade/]];
  for (const [patch, re] of cases) assert.throws(() => validateProfile({ ...base, ...patch }), (e) => re.test(e.message) && e.status === 400);
  assert.throws(() => validateProfile(null), (e) => e.status === 400);
});

test('profileFromConcept', () => {
  const model = { id: 7, anchorId: 'UCaaaaaaaaaaaaaaaaaaaaaa', output: { conceitos: [{}, { nome: 'Sono Romano', estiloVisual: 'watercolor', moldesTitulo: ['[a] b'] }, {}] } };
  const p = profileFromConcept(model, 1, { tag: 'historia', lang: 'en' });
  assert.deepEqual([p.name, p.style, p.lang, p.voice, p.tag, p.modelId, p.conceptIndex, p.titleTemplates], ['Sono Romano', 'watercolor', 'en', 'kokoro:af_heart', 'historia', 7, 1, ['[a] b']]);
  assert.equal(p.anchorId, 'UCaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(profileFromConcept(model, 1, { tag: null, lang: 'de' }).lang, 'pt');
  assert.doesNotThrow(() => validateProfile(profileFromConcept(model, 1, { tag: null, lang: 'pt' })));
});
