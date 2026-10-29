// Biblioteca do motor de episódio. Parte ASS: legenda, título de capítulo e texto de tela (1920x1080); parte validação.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, catalog } from './render-lib.mjs';

export const TAG_Y = 680; // y do pé da etiqueta: chão ~900 menos 220 (cabeça de um adulto de ~180 px mais folga). Ver globals R2.
const SCREEN_W = 1920;

// Fonte, cor de destaque (RGB) e tamanhos por estilo de vídeo (decisão 11). watercolor usa o mesmo que flat.
const FACES = {
  pixel: { font: 'Press Start 2P', hl: 'F4C542', bold: 0, cap: 32, chapter: 56, hud: 28, place: 26, tag: 26 },
  flat: { font: 'Atkinson Hyperlegible', hl: 'FFD166', bold: -1, cap: 54, chapter: 96, hud: 46, place: 42, tag: 42 },
};

export const assEscape = s => String(s).replace(/\\/g, '＼').replace(/\{/g, '｛').replace(/\}/g, '｝').replace(/\r?\n|\r/g, ' ');

// Tempo de cada palavra proporcional a (caracteres + 1) dentro da frase.
export function wordTimes({ start, end, text }) {
  const ws = String(text).split(/\s+/).filter(Boolean), tot = ws.reduce((a, w) => a + w.length + 1, 0);
  let acc = 0;
  return ws.map((w, i) => {
    const s = start + (end - start) * acc / tot; acc += w.length + 1;
    return { w, start: s, end: i === ws.length - 1 ? end : start + (end - start) * acc / tot };
  });
}

export function chunks(words, max = 7) {
  const out = [];
  for (let i = 0; i < words.length; i += max) { const g = words.slice(i, i + max); out.push({ words: g, start: g[0].start, end: g.at(-1).end }); }
  return out;
}

// hud.tag.actor: índice em shot.actors ou id de elenco de um ator do plano.
export const tagActorIndex = (shot, ref) => typeof ref === 'string' ? (shot.actors || []).findIndex(a => a.cast === ref) : ref;

const cs = t => Math.round(Math.max(0, t) * 100);
export const assTime = t => { const c = cs(t); return `${Math.floor(c / 360000)}:${String(Math.floor(c / 6000) % 60).padStart(2, '0')}:${String(Math.floor(c / 100) % 60).padStart(2, '0')}.${String(c % 100).padStart(2, '0')}`; };
const bgr = rgb => `&H${rgb.slice(4, 6)}${rgb.slice(2, 4)}${rgb.slice(0, 2)}&`;

function header(f) {
  // Name, Font, Size, Primary, Secondary, Outline, Back, Bold, Italic, Underline, Strike, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Align, ML, MR, MV, Encoding
  const st = (name, size, align, o = {}) => `Style: ${name},${f.font},${size},${o.c || '&H00FFFFFF'},&H00FFFFFF,${o.oc || '&H00000000'},&H00000000,${f.bold},0,0,0,100,100,0,0,${o.bs || 1},${o.ol ?? 3},0,${align},${o.ml || 40},40,${o.mv || 40},1`;
  const box = { bs: 3, ol: 14, oc: '&H40201010' };
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${st('Caption', f.cap, 2, { mv: 70 })}
${st('Chapter', f.chapter, 5, { ol: 4 })}
${st('Hud', f.hud, 7, { ...box, ml: 50, mv: 50 })}
${st('Place', f.place, 8, { ...box, mv: 50 })}
${st('Tag', f.tag, 2, { ol: 4 })}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

// timing: { chapters: [{id, title, start, end}], shots: [{id, start, end, speech: [{start, end, text}]}] }
// episode: { chapters: [{id, title, shots: [{id, hud?, actors?}]}] }
export function buildAss({ timing, episode, style }) {
  const f = FACES[style] || FACES.flat, hl = bgr(f.hl), ev = [];
  const line = (a, b, st, text) => ev.push(`Dialogue: 0,${assTime(a)},${assTime(b)},${st},,0,0,0,,${text}`);

  for (const c of timing.chapters || []) {
    const title = c.title ?? episode.chapters?.find(e => e.id === c.id)?.title;
    if (title) line(c.start, c.start + 3, 'Chapter', `{\\fad(400,400)}${assEscape(title)}`);
  }

  const shotsEp = Object.fromEntries((episode.chapters || []).flatMap(c => c.shots || []).map(s => [s.id, s]));
  for (const sh of timing.shots || []) {
    for (const sent of sh.speech || []) {
      for (const ch of chunks(wordTimes(sent))) {
        for (const [i, cur] of ch.words.entries())
          line(cur.start, cur.end, 'Caption', ch.words.map((x, j) => j === i ? `{\\1c${hl}}${assEscape(x.w)}{\\r}` : assEscape(x.w)).join(' '));
      }
    }
    const hud = shotsEp[sh.id]?.hud;
    if (!hud) continue;
    if (hud.year || hud.sub) line(sh.start, sh.end, 'Hud', [hud.year, hud.sub].filter(Boolean).map(assEscape).join(' - ')); // uma linha só: BorderStyle 3 desenha uma caixa por linha
    if (hud.place) line(sh.start, sh.end, 'Place', assEscape(hud.place));
    if (hud.tag) {
      const x = Math.round((shotsEp[sh.id].actors?.[tagActorIndex(shotsEp[sh.id], hud.tag.actor)]?.at ?? .5) * SCREEN_W);
      const sub = hud.tag.sub ? `\\N{\\u0\\fs${Math.round(f.tag * .75)}}${assEscape(hud.tag.sub)}` : '';
      line(sh.start, sh.end, 'Tag', `{\\pos(${x},${TAG_Y})\\u1}${assEscape(hud.tag.text)}${sub}`);
    }
  }
  return header(f) + ev.join('\n') + '\n';
}

// --- Validação do episódio (decisão 14) ---
// kit.js é a única fonte de cenas, extras e regras de atores: roda num vm, como nos testes (kitFrame lança com a mensagem do campo).
const NATURE = ['noise', 'path', 'gait', 'creature', 'specs', 'skeleton', 'env', 'crowd', 'actors'].map(f => `src/nature/${f}.js`);
let kitCache;
function kit() {
  if (kitCache) return kitCache;
  const ctx = vm.createContext({ projectConfig: catalog().resolveProject('smoke-2d', 'cartoon'), window: {} });
  for (const file of ['src/motion.js', ...NATURE, 'src/episode/kit.js']) vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), ctx, { filename: file });
  return kitCache = ctx;
}

const ID = { test: v => typeof v === 'string' && /^[a-z][a-z0-9-]*$/.test(v) }, str = v => typeof v === 'string' && v.trim() !== '';
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const fail = (field, why) => { throw new Error(`${field}: ${why}`); };

// Devolve { ok: true, warnings } ou lança Error com a mensagem do campo (pt-BR).
export function validateEpisode(ep) {
  if (!ep || typeof ep !== 'object') fail('episode', 'objeto esperado');
  if (!ID.test(ep.id)) fail('id', 'obrigatório, no formato a-z, 0-9 e hífen, começando por letra');
  if (!str(ep.title)) fail('title', 'obrigatório');
  const styles = catalog().styles, scenes = styles[ep.style]?.config.episodeScenes;
  if (!scenes) fail('style', `"${ep.style}" não existe ou não tem episodeScenes (estilos de vídeo: ${Object.keys(styles).filter(k => styles[k].config.episodeScenes).join(', ')})`);
  if (ep.loopLen !== undefined && !(ep.loopLen >= 10 && ep.loopLen <= 20)) fail('loopLen', 'de 10 a 20 s');
  if (ep.lengthScale !== undefined && !(ep.lengthScale > 0)) fail('lengthScale', 'número maior que 0');
  if (ep.fps !== undefined && !(Number.isInteger(ep.fps) && ep.fps > 0)) fail('fps', 'inteiro maior que 0');
  for (const k of ['intro', 'outro']) if (ep[k] !== undefined && !(ep[k] >= 0)) fail(k, 'número em segundos, 0 ou mais');
  if (ep.voice !== undefined && !str(ep.voice)) fail('voice', 'texto, como kokoro:pm_alex');
  const { kitFrame } = kit(), L = ep.loopLen ?? 12, cast = ep.cast ?? [];
  kitFrame({ scene: 'campo', params: {}, cast }, 0, L);  // só o elenco
  if (!Array.isArray(ep.chapters) || !ep.chapters.length) fail('chapters', 'lista com pelo menos um capítulo');

  const chapterIds = new Set(), shotIds = new Set(), shots = [];
  ep.chapters.forEach((c, i) => {
    if (!ID.test(c?.id)) fail(`chapters[${i}].id`, 'obrigatório, no formato a-z, 0-9 e hífen');
    if (chapterIds.has(c.id)) throw new Error(`Capítulo repetido: ${c.id}`);
    chapterIds.add(c.id);
    if (!str(c.title)) fail(`chapters[${i}].title`, 'obrigatório');
    if (!Array.isArray(c.shots) || !c.shots.length) fail(`chapters[${i}].shots`, 'lista com pelo menos um plano');
    for (const s of c.shots) {
      if (!ID.test(s?.id)) throw new Error(`Plano inválido: id "${s?.id}" (a-z, 0-9 e hífen, começando por letra)`);
      if (shotIds.has(s.id)) throw new Error(`Plano repetido: ${s.id}`);
      shotIds.add(s.id); shots.push(s);
    }
  });

  for (const s of shots) {
    const at = msg => { throw new Error(`Plano ${s.id}: ${msg}`); };
    if (s.narration !== undefined && !str(s.narration)) at('narration: texto');
    if (s.hold !== undefined && !(s.hold > 0)) at('hold: segundos, maior que 0');
    if (!s.scene || !str(s.scene.id)) at('scene.id obrigatório');
    try { kitFrame({ scene: s.scene.id, params: s.scene.params, actors: s.actors, cast }, 0, L); } catch (e) { at(e.message); }
    if (!scenes.includes(s.scene.id)) at(`o estilo ${ep.style} não desenha a cena ${s.scene.id}`);
    const hud = s.hud;
    if (!hud) continue;
    for (const k of ['year', 'sub', 'place']) if (hud[k] !== undefined && !str(hud[k])) at(`hud.${k}: texto`);
    if (hud.tag) {
      if (!str(hud.tag.text)) at('hud.tag.text: obrigatório');
      if (hud.tag.sub !== undefined && !str(hud.tag.sub)) at('hud.tag.sub: texto');
      const a = (s.actors || [])[tagActorIndex(s, hud.tag.actor)];
      if (!a) at('hud.tag.actor: índice ou id de elenco de um ator do plano');
      if (a.action === 'walk') at('hud.tag.actor: ator com walk anda pela tela, a etiqueta não o acompanha');
    }
  }

  if (shots.some(s => s.narration)) {
    if (!Array.isArray(ep.sources) || !ep.sources.length) fail('sources', 'obrigatório quando há narração (lista de {url, title, accessed})');
    ep.sources.forEach((src, i) => { for (const k of ['url', 'title', 'accessed']) if (!str(src?.[k])) fail(`sources[${i}].${k}`, 'obrigatório'); });
  }

  const warnings = [];
  for (let i = 1; i < shots.length; i++) {
    const [a, b] = [shots[i - 1], shots[i]];
    if (a.scene.id === b.scene.id && JSON.stringify(canon(a.scene.params ?? {})) === JSON.stringify(canon(b.scene.params ?? {})))
      warnings.push(`Planos ${a.id} e ${b.id} seguidos repetem a cena ${a.scene.id} com os mesmos params`);
  }
  return { ok: true, warnings };
}
