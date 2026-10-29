// Orquestrador do episódio (decisão 12). Uso: node scripts/episode.mjs <pasta> [--steps=narrate,build,loops,segments,mix,assemble,verify] [--workers=2]
// Cada etapa é idempotente; uma linha JSON por evento no stdout ({step, done, total, message}); em falha, {step, error} e código 1.
// Os filhos rodam com cwd na raiz e recebem caminhos relativos com / (o filtro subtitles do FFmpeg não lida com "C:").
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, catalog, sourceSnapshot, parseArgs, number, run as spawnRun } from './render-lib.mjs';
import { episodeProject } from './build-episode.mjs';
import { validateEpisode, acervoKey, segmentArgs, concatList, assembleArgs, buildAss } from './episode-lib.mjs';

export const STEPS = ['narrate', 'build', 'loops', 'segments', 'mix', 'assemble', 'verify'];
const FPS = 24;

// out: raiz das saídas, só para testes (narrate.mjs e mix-audio.mjs gravam sempre em out/episodes/<id>).
export async function runEpisode(dir, { steps = STEPS, workers = 2, out = 'out', run = (cmd, args) => spawnRun(cmd, args, { capture: true, cwd: ROOT }), log = line => console.log(line) } = {}) {
  const emit = o => log(JSON.stringify(o)), at = p => join(ROOT, p);
  const writeIfChanged = (f, text) => { if (!existsSync(at(f)) || readFileSync(at(f), 'utf8') !== text) writeFileSync(at(f), text); };
  let step = 'validate';
  try {
    const d = relative(ROOT, resolve(dir)).replace(/\\/g, '/'), read = f => JSON.parse(readFileSync(at(`${d}/${f}`), 'utf8')), ep = read('episode.json');
    for (const message of validateEpisode(ep).warnings) emit({ step, message });
    const E = `${out}/episodes/${ep.id}`, A = `${out}/acervo`;
    // Lido depois da narração (timing.json novo). shot.key é o id do loop no projeto (R5); shot.acervo, a chave entre episódios (decisão 9).
    let plan;
    const planOf = () => plan ??= (() => {
      const timing = read('timing.json'), p = episodeProject(ep, timing), styleConfig = catalog().styles[ep.style].config, sourceHash = sourceSnapshot().hash;
      const shots = p.episode.shots.map(s => ({ ...s, acervo: acervoKey({ style: ep.style, styleConfig, scene: s.scene, params: s.params,
        castUsed: (ep.cast || []).filter(m => s.actors.some(a => a.cast === m.id)), actors: s.actors, L: s.loopLen, fps: p.fps, sourceHash }) }));
      return { timing, p, byId: new Map(shots.map(s => [s.id, s])), shots };
    })();

    const tasks = {
      narrate: async () => ({ message: (await run('node', ['scripts/narrate.mjs', d])).trim() }),
      build: async () => ({ message: (await run('node', ['scripts/build-episode.mjs', d])).trim() }),
      // Só as chaves que faltam no acervo, em série (um Chrome por vez). Render em tmp e só então movido para o acervo.
      async loops() {
        const unique = [...new Map(planOf().shots.map(s => [s.acervo, s])).values()], todo = unique.filter(s => !existsSync(at(`${A}/${s.acervo}.mp4`)));
        const indexFile = at(`${A}/index.json`), index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : {};
        for (const [i, s] of todo.entries()) {
          emit({ step, done: i, total: todo.length, message: `${s.scene} (${s.key})` });
          const tmp = `${A}/tmp/${s.acervo}.mp4`, file = `${A}/${s.acervo}.mp4`;
          await run('node', ['render.mjs', `--project=ep-${ep.id}`, `--loop=${s.key}`, '--clip', `--workers=${workers}`, `--out=${tmp}`]);
          renameSync(at(tmp), at(file)); rmSync(at(tmp + '.review'), { recursive: true, force: true });
          index[s.acervo] = { style: ep.style, scene: s.scene, params: s.params, L: s.loopLen, createdAt: new Date().toISOString(), bytes: statSync(at(file)).size };
          writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
        }
        return { done: todo.length, total: todo.length, message: `${todo.length} renderizados, ${unique.length - todo.length} já no acervo` };
      },
      // Um segmento por plano, em quadros inteiros (a soma dá a duração do timing); cache por chave e duração.
      async segments() {
        const { p, byId } = planOf(), files = [];
        let made = 0;
        mkdirSync(at(`${E}/seg`), { recursive: true });
        for (const sb of p.storyboard) {
          const s = byId.get(sb.id), dur = (Math.round(sb.end * FPS) - Math.round(sb.start * FPS)) / FPS, loop = `${A}/${s.acervo}.mp4`, base = `${E}/seg/${s.acervo}-${+dur.toFixed(3)}`;
          if (!existsSync(at(loop))) throw new Error(`Plano ${sb.id}: loop ausente no acervo; rode a etapa loops`);
          if (!existsSync(at(base + '.mp4'))) { await run('ffmpeg', segmentArgs(loop, dur, base + '.partial.mp4')); renameSync(at(base + '.partial.mp4'), at(base + '.mp4')); made++; }
          files.push(base.slice(E.length + 1) + '.mp4');
        }
        writeIfChanged(`${E}/concat.txt`, concatList(files));
        return { done: files.length, total: files.length, message: `${made} cortados, ${files.length - made} em cache` };
      },
      // narrate.mjs regrava narration.wav a cada execução (mesmo com o TTS em cache): a guarda é pelo conteúdo, não pela data.
      async mix() {
        const keyFile = at(`${E}/mix.key`), key = createHash('sha256').update(readFileSync(at(`${E}/narration.wav`))).update(String(planOf().timing.duration)).update(readFileSync(at('scripts/mix-audio.mjs'))).digest('hex');
        if (existsSync(at(`${E}/mix.m4a`)) && existsSync(keyFile) && readFileSync(keyFile, 'utf8') === key) return { message: 'mix.m4a em dia (narração igual)' };
        rmSync(keyFile, { force: true });
        const message = (await run('node', ['scripts/mix-audio.mjs', d])).trim();
        writeFileSync(keyFile, key);
        return { message };
      },
      // Refaz só se lista, legenda ou mix forem mais novos que o vídeo (os dois primeiros só são gravados quando o conteúdo muda).
      async assemble() {
        const list = `${E}/concat.txt`, ass = `${E}/subs.ass`, audio = `${E}/mix.m4a`, video = `${E}/video.mp4`, mtime = f => statSync(at(f)).mtimeMs;
        writeIfChanged(ass, buildAss({ timing: planOf().timing, episode: ep, style: ep.style }));
        if (existsSync(at(video)) && [list, ass, audio].every(f => mtime(video) >= mtime(f))) return { message: `${video} em dia` };
        await run('ffmpeg', assembleArgs({ list, ass, audio, out: `${E}/video.partial.mp4` }));
        renameSync(at(`${E}/video.partial.mp4`), at(video));
        return { message: video };
      },
      // Sempre roda: é a porta de saída.
      async verify() {
        const { timing } = planOf(), r = JSON.parse(await run('node', ['scripts/verify-video.mjs', `${E}/video.mp4`]));
        const acodec = (await run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', `${E}/video.mp4`])).trim();
        const found = `${r.width}x${r.height}, ${r.fps} fps, ${r.frames} quadros, ${r.duration} s, áudio ${acodec || r.audio}`;
        if (Math.abs(r.duration - timing.duration) > 1 / FPS + 1e-3 || Math.abs(r.fps - FPS) > 1e-3 || r.width !== 1920 || r.height !== 1080 || !r.audio || acodec !== 'aac')
          throw new Error(`Vídeo fora do esperado (${timing.duration} s, 1920x1080, ${FPS} fps, áudio aac): ${found}`);
        return { message: found };
      },
    };
    for (step of STEPS.filter(s => steps.includes(s))) {
      const started = performance.now(), r = await tasks[step]();
      emit({ step, done: r.done ?? 1, total: r.total ?? 1, message: r.message, ms: Math.round(performance.now() - started) });
    }
  } catch (error) { emit({ step, error: error.message }); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [dir, ...rest] = process.argv.slice(2);
  let opts;
  try {
    if (!dir || dir.startsWith('--')) throw new Error('Uso: node scripts/episode.mjs <pasta> [--steps=narrate,build,loops,segments,mix,assemble,verify] [--workers=2]');
    const a = parseArgs(rest), steps = a.steps ? String(a.steps).split(',') : STEPS;
    for (const k of Object.keys(a)) if (!['steps', 'workers'].includes(k)) throw new Error(`Opção desconhecida: --${k}`);
    for (const s of steps) if (!STEPS.includes(s)) throw new Error(`Etapa desconhecida: ${s} (etapas: ${STEPS.join(', ')})`);
    opts = { steps, workers: number(a.workers ?? 2, 'workers', { min: 1, max: 8, integer: true }) };
  } catch (error) { console.log(JSON.stringify({ step: 'args', error: error.message })); process.exitCode = 1; }
  if (opts) await runEpisode(dir, opts).catch(() => { process.exitCode = 1; });
}
