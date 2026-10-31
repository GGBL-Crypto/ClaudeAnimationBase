// Roteiro do vídeo (fase 6): meta de palavras, prompts e validação do esboço e dos capítulos, montagem do episode.json e do roteiro.md (puro, exceto writeRoteiro).
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonParams } from '../build-episode.mjs';
import { validateEpisode } from '../episode-lib.mjs';
import { oneLine } from './llm.mjs';
import { sourcesList } from './package.mjs';
import { epId } from './production.mjs';

const BAD_FORMAT = 'Resposta do Claude fora do formato';
const ID = /^[a-z][a-z0-9-]*$/, HEX = /^#[0-9a-fA-F]{6}$/;
const COLORS = ['skin', 'hair', 'shirt', 'pants']; // ponytail: chaves de cor do elenco copiadas de src/episode/kit.js (o KIT_CATALOG não as exporta)
const LANG = { pt: 'português do Brasil', en: 'inglês' };
const MAX_CHARS = 100000; // ponytail: trechos das fontes cortados para caber em ~100 mil caracteres por prompt; subir se o Claude pedir mais contexto
const str = (s, n) => typeof s === 'string' && s.trim() !== '' && s.length <= n;
const arr = (a, min, max) => Array.isArray(a) && a.length >= min && a.length <= max;

// [n] ou [n, m] de fonte na narração. A voz lê o texto sem eles.
const MARK = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
// "a.C. [2]." vira "a.C." (o ponto duplo some; reticências ficam).
export const stripMarks = s => String(s).replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, '').replace(/(?<!\.)\.\.(?!\.)/g, '.').replace(/\s+/g, ' ').trim();
export const words = s => { const t = String(s).trim(); return t ? t.split(/\s+/).length : 0; }; // como a medição da voz (voice.mjs)

// Números: só os algarismos ("1.500", "1 500" e "1500" dão o mesmo). As fontes também valem com espaço entre milhares.
const NUM = /\d(?:[\d.,]*\d)?/g, NUM_SPACED = /\d(?:[\d.,\s ]*\d)?/g;
const digits = s => s.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
export const sourceNumbers = sources => new Set(sources.flatMap(s => [s.title, s.text ?? ''].flatMap(t => [...String(t).match(NUM) ?? [], ...String(t).match(NUM_SPACED) ?? []].map(digits))));
function checkNumbers(s, numbers) {
  if (!numbers) return;
  const bad = [...new Set((String(s).match(NUM) ?? []).filter(n => !numbers.has(digits(n))))];
  if (bad.length) throw new Error(`número fora das fontes: ${bad.join(', ')}`);
}

// Meta de palavras da narração: wpm medido da voz, ou 150 com aviso.
export function wordBudget({ targetMin, toleranceMin, wpm }) {
  const w = Number.isFinite(wpm) && wpm > 0 ? wpm : 150;
  return { wpm: w, min: Math.round((targetMin - toleranceMin) * w), target: Math.round(targetMin * w), max: Math.round((targetMin + toleranceMin) * w),
    ...(w !== wpm && { warning: 'Ritmo da voz não medido: meta calculada com 150 palavras por minuto (meça a voz em Meus canais)' }) };
}

// numbers (opcional): números das fontes; o resumo não traz outros (títulos podem numerar partes). Os ids dos capítulos são do app (c1, c2…).
export function validateOutline(o, { catalog, budget, numbers }) {
  if (!o || typeof o !== 'object' || !str(o.titulo, 100) || !arr(o.elenco, 1, 4) || !arr(o.capitulos, 3, 30)) throw new Error(`${BAD_FORMAT}: titulo até 100 caracteres, elenco de 1 a 4 e capitulos de 3 a 30`);
  o.elenco.forEach((m, i) => {
    const fail = msg => { throw new Error(`Elenco ${i + 1}: ${msg}`); };
    if (!m || !ID.test(m.id) || o.elenco.filter(x => x?.id === m.id).length > 1) fail('id único em minúsculas (a-z, 0-9 e hífen)');
    if (!catalog.bodies.includes(m.body)) fail(`body fora do catálogo (${catalog.bodies.join(', ')})`);
    if (m.gear != null && (!Array.isArray(m.gear) || m.gear.some(g => !catalog.gear.includes(g)))) fail(`gear fora do catálogo (${catalog.gear.join(', ')})`);
    if (m.colors != null && (typeof m.colors !== 'object' || Object.entries(m.colors).some(([k, v]) => !COLORS.includes(k) || !HEX.test(v)))) fail(`colors com ${COLORS.join(', ')} em #RRGGBB`);
  });
  o.capitulos.forEach((c, i) => {
    if (!c || !str(c.titulo, 80) || !str(c.resumo, 400) || !Number.isInteger(c.palavras) || c.palavras < 1) throw new Error(`Capítulo ${i + 1}: titulo até 80 caracteres, resumo até 400 e palavras inteiro`);
    try { checkNumbers(c.resumo, numbers); } catch (e) { throw new Error(`Capítulo ${i + 1}: ${e.message}`); }
  });
  const sum = o.capitulos.reduce((a, c) => a + c.palavras, 0);
  if (sum < budget.min || sum > budget.max) throw new Error(`Soma das palavras dos capítulos (${sum}) fora da meta de ${budget.min} a ${budget.max}`);
  return {
    titulo: o.titulo.trim(),
    elenco: o.elenco.map(m => ({ id: m.id, body: m.body, colors: m.colors ?? {}, gear: m.gear ?? [] })),
    capitulos: o.capitulos.map((c, i) => ({ id: `c${i + 1}`, titulo: c.titulo.trim(), resumo: c.resumo.trim(), palavras: c.palavras })),
  };
}

// Narração de um plano: [n] das fontes, 30 a 120 s de fala, frase com número tem [n] e o número está nas fontes.
// Devolve o texto da voz (sem [n]), o marcado (roteiro.md) e as fontes citadas (1 a nSources).
export function checkNarration(text, { nSources, wpm, numbers }, fontes = []) {
  if (!str(text, 5000)) throw new Error('narração de 1 a 5000 caracteres');
  const marks = [...text.matchAll(MARK)].flatMap(m => m[1].split(',').map(Number));
  if (!marks.length) throw new Error('narração sem [n] de fonte');
  const cites = [...new Set([...marks, ...fontes])].sort((a, b) => a - b);
  if (cites.some(n => !Number.isInteger(n) || n < 1 || n > nSources)) throw new Error(`fonte fora da lista (use de 1 a ${nSources})`);
  const narration = stripMarks(text), n = words(narration);
  if (n < wpm / 2 || n > 2 * wpm) throw new Error(`${n} palavras; cada plano tem de 30 a 120 s de fala (${Math.ceil(wpm / 2)} a ${Math.floor(2 * wpm)} palavras)`);
  const loose = text.split(/(?<=[.!?…])\s+(?=[\p{Lu}"“«(])/u).find(s => /\d/.test(s.replace(MARK, '')) && !/\[\d/.test(s));
  if (loose) throw new Error(`frase com número sem [n]: "${loose.slice(0, 80)}"`);
  checkNumbers(narration, numbers);
  return { narration, narrationCited: text.trim(), cites };
}

// Um capítulo do Claude -> planos no formato do episode.json (sem id). cast: ids do elenco do esboço; words: meta do capítulo (±15%).
// Aqui só as listas do catálogo (com as opções na mensagem); o resto (chaves de params, seed, at, dir, hud.tag, mapa sem atores) fica para o validateEpisode.
export function validateChapter(o, { catalog, cast, nSources, words: meta, wpm, numbers }) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.planos) || !o.planos.length) throw new Error(`${BAD_FORMAT}: planos é uma lista de planos`);
  const shots = o.planos.map((p, i) => {
    const fail = msg => { throw new Error(`Plano ${i + 1}: ${msg}`); };
    if (!p || typeof p !== 'object') fail('objeto esperado');
    if (!Array.isArray(p.fontes) || !p.fontes.length) fail('fontes: lista com pelo menos 1 número de fonte');
    let nar; try { nar = checkNarration(p.narracao, { nSources, wpm, numbers }, p.fontes); } catch (e) { fail(e.message); }
    const K = catalog.scenes[p.cena?.id], params = p.cena?.params ?? {};
    if (!K) fail(`cena ${p.cena?.id} fora do catálogo (${Object.keys(catalog.scenes).join(', ')})`);
    if (typeof params !== 'object' || Array.isArray(params)) fail('cena.params é um objeto');
    for (const [k, list] of [['time', catalog.times], ['weather', catalog.weathers], ['framing', catalog.framings]])
      if (params[k] !== undefined && !list.includes(params[k])) fail(`${k} ${params[k]} fora do catálogo (${list.join(', ')})`);
    if (params.extras !== undefined && (!Array.isArray(params.extras) || params.extras.some((x, j) => !K.extras.includes(x) || params.extras.indexOf(x) !== j))) fail(`extras da cena ${p.cena.id}: só ${K.extras.join(', ')}, sem repetir`);
    const actors = p.atores ?? [];
    if (!arr(actors, 0, 3)) fail('atores: lista de até 3');
    for (const a of actors) {
      if (!a || typeof a !== 'object' || Object.keys(a).some(k => !['cast', 'action', 'at', 'dir'].includes(k))) fail('ator só com cast, action, at e dir');
      if (!cast.includes(a.cast)) fail(`ator ${a.cast} fora do elenco (${cast.join(', ')})`);
      if (actors.filter(b => b.cast === a.cast).length > 1) fail(`ator ${a.cast} repetido`);
      if (!catalog.actions.includes(a.action)) fail(`ação ${a.action} fora do catálogo (${catalog.actions.join(', ')})`);
      if (a.action === 'walk' && !K.exterior) fail(`walk só em cena de exterior, não em ${p.cena.id}`);
    }
    const hud = p.hud == null ? null : p.hud;
    if (hud) {
      if (typeof hud !== 'object' || Object.keys(hud).some(k => !catalog.hud.includes(k))) fail(`hud só com ${catalog.hud.join(', ')}`);
      for (const k of ['year', 'sub', 'place']) if (hud[k] !== undefined && !str(hud[k], 40)) fail(`hud.${k}: texto até 40 caracteres`);
      const t = hud.tag;
      try { checkNumbers([hud.year, hud.sub, hud.place, t?.text, t?.sub].filter(Boolean).join(' '), numbers); } catch (e) { fail('hud: ' + e.message); }
    }
    return { ...nar, scene: { id: p.cena.id, params }, actors, ...(hud && Object.keys(hud).length && { hud }) };
  });
  const total = shots.reduce((a, s) => a + words(s.narration), 0), lo = Math.ceil(meta * .85), hi = Math.floor(meta * 1.15);
  if (total < lo || total > hi) throw new Error(`Capítulo com ${total} palavras; a meta é ${meta} (de ${lo} a ${hi})`);
  return shots;
}

// Planos seguidos com a mesma cena e os mesmos params ganham seed + 1 (comparação do validateEpisode). Puro.
export function dedupeShots(shots) {
  const out = shots.map(s => ({ ...s, scene: { ...s.scene, params: { ...s.scene.params } } }));
  const key = s => s.scene.id + JSON.stringify(canonParams(s.scene.params));
  for (let i = 1; i < out.length; i++) if (key(out[i]) === key(out[i - 1])) out[i].scene.params.seed = ((out[i].scene.params.seed ?? 0) + 1) % 10000;
  return out;
}

// episode.json do motor. chapters[i]: planos do capítulo i do esboço; ids dos planos <capítulo>-s<n>. Pelo menos 12 planos por hora.
export function buildEpisode({ id, outline, chapters, sources, profile, style, targetMin = 0 }) {
  const all = dedupeShots(chapters.flat()), need = Math.ceil(12 * targetMin / 60);
  if (all.length < need) throw new Error(`Roteiro com ${all.length} planos; ${targetMin} min pedem pelo menos ${need} (12 por hora)`);
  let k = 0;
  return {
    id: epId(id), title: outline.titulo, style, voice: profile.voice, lengthScale: 1 / profile.speed, intro: 1.5, outro: 2,
    sources: sources.map(({ text, ...s }) => s), cast: outline.elenco,
    chapters: outline.capitulos.map((c, i) => ({ id: c.id, title: c.titulo, shots: chapters[i].map((_, j) => { const { id: _old, ...s } = all[k++]; return { id: `${c.id}-s${j + 1}`, ...s }; }) })),
  };
}

export const roteiroMd = (episode, sources) => [`# ${episode.title}`,
  ...episode.chapters.flatMap(c => [`## ${c.title}`, ...c.shots.map(s => s.narrationCited ?? s.narration ?? '')]),
  '## Fontes', sourcesList(sources)].join('\n\n') + '\n';

// Resultado da etapa: palavras por capítulo contra a meta do esboço e avisos. Valida o episódio inteiro (lança se inválido).
export function roteiroResult(episode, outline, budget) {
  const capitulos = episode.chapters.map((c, i) => ({ id: c.id, titulo: c.title, meta: outline.capitulos[i]?.palavras ?? null, palavras: c.shots.reduce((a, s) => a + words(s.narration ?? ''), 0), planos: c.shots.length }));
  const palavras = capitulos.reduce((a, c) => a + c.palavras, 0), { wpm, min, target, max } = budget;
  const avisos = [budget.warning, (palavras < min || palavras > max) && `Roteiro com ${palavras} palavras, fora da meta de ${min} a ${max}`, ...validateEpisode(episode).warnings].filter(Boolean);
  return { titulo: episode.title, palavras, meta: { wpm, min, target, max }, capitulos, avisos };
}

export async function writeRoteiro(dir, { outline, episode, sources }) {
  await writeFile(join(dir, 'outline.json'), JSON.stringify(outline, null, 2));
  await writeFile(join(dir, 'episode.json'), JSON.stringify(episode, null, 2));
  await writeFile(join(dir, 'roteiro.md'), roteiroMd(episode, sources));
}

// --- prompts: tudo que veio de terceiros (tema, fontes, padrões, e o esboço que saiu deles) fica entre <<<DADOS e DADOS>>> ---
const fill = (template, vals) => template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (!(k in vals)) throw new Error(`Placeholder desconhecido: ${k}`);
  return vals[k];
});
const sourcesBlock = sources => {
  const per = Math.min(20000, Math.floor(MAX_CHARS / sources.length));
  return sources.map((s, i) => `[${i + 1}] ${oneLine(s.title)}\n${oneLine(s.text ?? '').slice(0, per)}`).join('\n\n');
};
const analysesBlock = analyses => analyses.length ? analyses.map((a, i) => `Padrão ${i + 1}: ${oneLine(JSON.stringify(a))}`).join('\n') : '(nenhum)';
const common = ({ theme, lang, sources, analyses }) => ({ tema: oneLine(theme), idioma: LANG[lang] ?? LANG.pt, fontes: sourcesBlock(sources), nfontes: String(sources.length), analises: analysesBlock(analyses) });

export function outlinePrompt(template, { theme, lang, targetMin, budget, sources, analyses, catalog }) {
  const capMin = Math.max(3, Math.round(targetMin / 5)), capMax = Math.min(30, Math.max(capMin + 1, Math.round(targetMin / 2)));
  return fill(template, { ...common({ theme, lang, sources, analyses }), minutos: String(targetMin), min: String(budget.min), max: String(budget.max), alvo: String(budget.target),
    capMin: String(capMin), capMax: String(capMax), corpos: catalog.bodies.join(', '), gear: catalog.gear.join(', '), cores: COLORS.join(', ') });
}

// index: capítulo a escrever (0…); prev: fim da narração do capítulo anterior (continuidade).
export function chapterPrompt(template, { theme, lang, outline, index, prev, budget, sources, analyses, catalog }) {
  const c = outline.capitulos[index], wpm = budget.wpm;
  return fill(template, { ...common({ theme, lang, sources, analyses }),
    titulo: oneLine(outline.titulo),
    esboco: outline.capitulos.map((x, i) => `${i + 1}. ${oneLine(x.titulo)} (${x.palavras} palavras): ${oneLine(x.resumo)}`).join('\n'),
    elenco: outline.elenco.map(m => `${m.id} (${m.body})`).join(', '),
    anterior: prev ? oneLine(prev).slice(-600) : '(início do vídeo)',
    n: String(index + 1), total: String(outline.capitulos.length), palavras: String(c.palavras),
    pmin: String(Math.ceil(wpm / 2)), pmax: String(Math.floor(2 * wpm)), planos: String(Math.max(1, Math.round(c.palavras / wpm))),
    cenas: Object.entries(catalog.scenes).map(([id, s]) => `${id} (${s.exterior ? 'exterior' : 'interior'}; extras: ${s.extras.join(', ') || 'nenhum'})`).join('\n'),
    times: catalog.times.join(', '), weathers: catalog.weathers.join(', '), framings: catalog.framings.join(', '), acoes: catalog.actions.join(', '),
  });
}
