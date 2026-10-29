// Biblioteca do motor de episódio. Parte ASS: legenda, título de capítulo e texto de tela (1920x1080).

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
      const x = Math.round((shotsEp[sh.id].actors?.[hud.tag.actor]?.at ?? .5) * SCREEN_W);
      const sub = hud.tag.sub ? `\\N{\\u0\\fs${Math.round(f.tag * .75)}}${assEscape(hud.tag.sub)}` : '';
      line(sh.start, sh.end, 'Tag', `{\\pos(${x},${TAG_Y})\\u1}${assEscape(hud.tag.text)}${sub}`);
    }
  }
  return header(f) + ev.join('\n') + '\n';
}
