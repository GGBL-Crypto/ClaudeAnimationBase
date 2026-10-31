// Monta o projeto de um episódio (ep-<id>) a partir de episode.json + timing.json e o grava em src/episodes.js,
// que o catalog() de render-lib.mjs já carrega. Uso: node scripts/build-episode.mjs <pasta>
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const NATURE = ['noise', 'path', 'gait', 'creature', 'specs', 'skeleton', 'env', 'crowd', 'actors'].map(f => `src/nature/${f}.js`);
const HEADER = '// Gerado por scripts/build-episode.mjs (um projeto por linha). Fora do git: não edite.\n';
const PREFIX = 'AnimationPlatform.registerProject(';

// Forma canônica de params, atores e elenco usado: chaves em ordem e padrões do kit preenchidos, para que a mesma cena escrita
// de outro jeito ({} ou os padrões explícitos, extras em outra ordem) dê a mesma chave. Usada pela chave do projeto e pela do acervo.
const DEFAULTS = { time: 'day', weather: 'clear', seed: 0, framing: 'wide', extras: [] };  // espelha DEFAULTS de src/episode/kit.js (teste confere)
export const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
export const canonParams = p => canon({ ...DEFAULTS, ...p, extras: [...(p?.extras ?? [])].sort() });
export const canonShot = (params, actors = [], cast = []) => {
  const used = actors.map(a => a.cast);
  return [canonParams(params),
    actors.map(a => canon({ ...a, at: a.action === 'walk' || a.action === 'run' ? undefined : a.at ?? .5, dir: a.dir ?? 1 })),  // walk e run ignoram at
    cast.filter(m => used.includes(m.id)).sort((a, b) => a.id < b.id ? -1 : 1).map(m => canon({ ...m, gear: [...(m.gear ?? [])].sort(), colors: m.colors ?? null }))];
};

// Id estável da cena no projeto: cena + sha1 curto de params, atores, elenco usado e L (mesma cena nas mesmas condições = mesma chave).
export function loopKeyOf(shot, cast = []) {
  const sha = createHash('sha1').update(JSON.stringify([...canonShot(shot.params, shot.actors, cast), shot.loopLen ?? 12])).digest('hex').slice(0, 8);
  return `${shot.scene}-${sha}`;
}

export function episodeProject(ep, timing) {
  const L = ep.loopLen ?? 12, shots = ep.chapters.flatMap(c => c.shots), byId = new Map(shots.map(s => [s.id, s]));
  if (timing.shots.length !== shots.length || timing.shots.some(t => !byId.has(t.id))) throw new Error('timing.json e episode.json têm planos diferentes; rode a narração de novo');
  const storyboard = timing.shots.map((t, i) => {
    const s = byId.get(t.id), start = i ? t.start : 0;  // a abertura (intro) pertence ao primeiro plano
    const reads = t.speech.length ? t.speech.map(({ start, end, text }) => ({ start, end, text })) : [{ start, end: t.end, text: `Cena ${s.scene.id}` }];
    return { id: t.id, chapter: t.chapter, start, end: t.end, event: s.narration || `Cena ${s.scene.id}`, transition: 'fade', reads };
  });
  const list = shots.map(s => { const x = { id: s.id, scene: s.scene.id, params: s.scene.params, actors: s.actors || [], loopLen: L }; return { ...x, key: loopKeyOf(x, ep.cast) }; });
  return {
    id: `ep-${ep.id}`, title: ep.title || ep.id, story: `Episódio ${ep.title || ep.id}: cenas do kit com narração.`,
    duration: timing.duration, fps: timing.fps ?? 24, bpm: 60, offset: 0, style: ep.style, compatibleStyles: [ep.style],
    scripts: [...NATURE, 'src/episode/kit.js', 'src/episode/player.js'],
    reviewTimes: storyboard.map(s => Math.min(timing.duration - 1 / 24, (s.start + s.end) / 2)),
    storyboard, episode: { cast: ep.cast, shots: list },
  };
}

// Mantém os episódios que já estão no arquivo; o do mesmo id é trocado.
export function writeEpisodes(projects, file = 'src/episodes.js') {
  const path = resolve(ROOT, file), keep = existsSync(path)
    ? readFileSync(path, 'utf8').split('\n').filter(l => l.startsWith(PREFIX)).map(l => JSON.parse(l.slice(PREFIX.length, -2))).filter(p => !projects.some(n => n.id === p.id)) : [];
  writeFileSync(`${path}.tmp`, HEADER + [...keep, ...projects].map(p => `${PREFIX}${JSON.stringify(p)});\n`).join(''));
  renameSync(`${path}.tmp`, path);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error('Uso: node scripts/build-episode.mjs <pasta com episode.json e timing.json>');
    const dir = resolve(process.argv[2]), read = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const p = episodeProject(read('episode.json'), read('timing.json'));
    writeEpisodes([p]);
    console.log(`${p.id}: ${p.duration.toFixed(2)} s, ${p.storyboard.length} planos, ${new Set(p.episode.shots.map(s => s.key)).size} loops -> src/episodes.js`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
