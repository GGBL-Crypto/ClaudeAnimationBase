import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const NATURE_SCRIPTS = ['src/nature/noise.js', 'src/nature/path.js', 'src/nature/gait.js', 'src/nature/creature.js', 'src/nature/specs.js', 'src/nature/env.js'];
const HEADER = '// episodes.js: gerado; registra os episódios narrados. Não edite à mão.\n';

export function episodeProject(episode, timing, chapterFiles) {
  // A plataforma exige cobertura desde t=0: o primeiro plano ocupa também a introdução.
  const storyboard = timing.shots.map((s, i) => {
    const start = i ? s.start : 0;
    return { id: s.id, chapter: s.chapter, start, end: s.end, event: s.visual, transition: s.transition ?? 'corte',
      reads: s.speech.length ? s.speech.map(({ start, end, text }) => ({ start, end, text })) : [{ start, end: s.end, text: s.visual }] };
  });
  return { id: episode.id, title: episode.title, story: episode.story, duration: timing.duration, fps: timing.fps, bpm: 60, offset: 0,
    style: episode.style, compatibleStyles: episode.compatibleStyles, audio: `out/episodes/${episode.id}/mix.m4a`,
    chapters: timing.chapters.map(({ id, title, start, end }) => ({ id, title, start, end })),
    scripts: [...NATURE_SCRIPTS, ...chapterFiles, 'src/episodes/placeholder.js'],
    reviewTimes: storyboard.map(s => (s.start + s.end) / 2), storyboard };
}

const stamp = t => { const ms = Math.round(t * 1000), p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
function wrap(text, max = 42) {
  const lines = [];
  for (const w of text.split(/\s+/).filter(Boolean)) lines.length && lines.at(-1).length + 1 + w.length <= max ? lines[lines.length - 1] += ` ${w}` : lines.push(w);
  return lines;
}

export function toSrt(timing) {
  const cues = [];
  for (const { start, end, text } of timing.shots.flatMap(s => s.speech)) {
    const lines = wrap(text), groups = [];
    for (let i = 0; i < lines.length; i += 2) groups.push(lines.slice(i, i + 2));
    // Frase longa vira várias cues; o tempo é proporcional ao tamanho de cada uma.
    const total = groups.reduce((n, g) => n + g.join(' ').length, 0); let t = start;
    for (const g of groups) { const e = t + (end - start) * g.join(' ').length / total; cues.push([t, e, g.join('\n')]); t = e; }
  }
  return cues.map(([a, b, body], i) => `${i + 1}\n${stamp(a)} --> ${stamp(b)}\n${body}\n`).join('\n');
}

const clock = t => { const s = Math.floor(t), p = n => String(n).padStart(2, '0'); return s >= 3600 ? `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}` : `${p(Math.floor(s / 60))}:${p(s % 60)}`; };

export function youtubeText(episode, timing) {
  const chapters = timing.chapters.map((c, i) => `${i ? clock(c.start) : '00:00'} ${c.title}`).join('\n');
  return `${episode.title}\n\n${episode.story}\n\nCapítulos\n${chapters}\n\nCréditos\nNarração: voz ${episode.voice} (Piper TTS).\nAnimação gerada por código (ClaudeAnimationBase, MIT).\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(import.meta.url), '../..'), dir = join(root, 'episodes');
  let out = HEADER;
  for (const id of existsSync(dir) ? readdirSync(dir).sort() : []) {
    const ep = join(dir, id, 'episode.json'), tm = join(dir, id, 'timing.json');
    if (!existsSync(ep) || !existsSync(tm)) continue;
    const episode = JSON.parse(readFileSync(ep, 'utf8')), timing = JSON.parse(readFileSync(tm, 'utf8')), cdir = join(root, 'src/episodes', id);
    if (episode.id !== id || timing.id !== id) throw new Error(`ID do episódio difere da pasta: ${id}`);
    const files = existsSync(cdir) ? readdirSync(cdir).filter(f => /^c.*\.js$/.test(f)).sort().map(f => `src/episodes/${id}/${f}`) : [];
    out += `AnimationPlatform.registerProject(${JSON.stringify(episodeProject(episode, timing, files), null, 2)});\n`;
    const od = join(root, 'out/episodes', id); mkdirSync(od, { recursive: true });
    writeFileSync(join(od, `${id}.srt`), toSrt(timing)); writeFileSync(join(od, 'youtube.md'), youtubeText(episode, timing));
    console.log(`episódio ${id}: ${files.length} capítulos`);
  }
  writeFileSync(join(root, 'src/episodes.js'), out);
}
