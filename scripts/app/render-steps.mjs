// Etapas narracao, cenas e render da produção (fase 6): chamam o runEpisode do motor com o executor cancelável.
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { episodeProject } from '../build-episode.mjs';
import { validateEpisode } from '../episode-lib.mjs';
import { runCancellable, scrub } from './production.mjs';
import { words } from './roteiro.mjs';

export const RENDER = ['loops', 'segments', 'mix', 'assemble', 'verify'];
const sec = ms => +(ms / 1000).toFixed(1) + ' s';

// Meio de cada plano do storyboard, com 2 casas (o render.mjs nomeia o still por t.toFixed(2)).
export const stillTimes = storyboard => storyboard.map(s => ({ shot: s.id, t: +((s.start + s.end) / 2).toFixed(2) }));

// Linha JSON do runEpisode → progresso do job; a linha final de cada etapa (com ms) vira subetapa.
export function renderProgress(line) {
  const o = JSON.parse(line), message = scrub(`${o.step}: ${o.error ?? o.message ?? ''}`);  // o motor lança ENOENT com caminho absoluto
  if (o.ms == null || o.error) return { message, done: o.done ?? 0, total: o.total ?? 0 };
  return { message: `${message} (${sec(o.ms)})`, done: o.done, total: o.total, sub: { step: o.step, ms: o.ms } };
}

// Troca cena e atores de um plano; o resto (narração, hud) fica. Cena do estilo pelo catálogo, o resto pelo validateEpisode.
export function swapScene(ep, shotId, patch, catalog) {
  if (Object.keys(patch).some(k => k !== 'scene' && k !== 'actors')) throw new Error('Só cena e atores mudam; a narração fica');
  const out = structuredClone(ep), shot = out.chapters.flatMap(c => c.shots).find(s => s.id === shotId);
  if (!shot) throw new Error('Plano não encontrado');
  const { scene, actors = [] } = patch;
  if (!catalog.scenes[scene?.id]) throw new Error(`Plano ${shotId}: cena fora do catálogo do estilo`);
  if (!Array.isArray(actors) || actors.some(a => !a || Object.keys(a).some(k => !['cast', 'action', 'at', 'dir'].includes(k)))) throw new Error(`Plano ${shotId}: atores com cast, action, at e dir`);
  shot.scene = { id: scene.id, params: scene.params ?? {} }; shot.actors = actors;
  validateEpisode(out);
  return out;
}

const json = async (dir, f, missing) => { if (!existsSync(join(dir, f))) throw new Error(missing); return JSON.parse(await readFile(join(dir, f), 'utf8')); };
const EP = 'Sem episode.json: termine o roteiro', TIMING = 'Sem timing.json: rode a narração';
const runOf = (inject, signal) => runCancellable(signal, { spawn: inject.spawnProc });

// narracao: Kokoro pelo motor; duração real contra a alvo. Fora da tolerância só avisa (within: false).
// Mede o ritmo real (palavras narradas / minutos de fala, sem intro, outro e holds) e grava pelo saveWpm para a meta do próximo roteiro.
export async function narrationStep({ inject, saveWpm, prod, dir, signal, report }) {
  const ep = await json(dir, 'episode.json', EP);
  report('Narrando', 0, 1);
  await inject.runEpisodeFn(dir, { steps: ['narrate'], run: runOf(inject, signal), log: l => { const p = renderProgress(l); report(p.message, p.done, p.total); } });
  const { duration, shots = [] } = await json(dir, 'timing.json', TIMING), targetS = prod.targetMin * 60;
  const speechS = shots.flatMap(s => s.speech ?? []).reduce((a, x) => a + x.end - x.start, 0);
  const wpm = speechS > 0 ? Math.round(ep.chapters.flatMap(c => c.shots).reduce((a, s) => a + words(s.narration ?? ''), 0) / (speechS / 60)) : null;
  if (wpm) saveWpm?.(wpm);
  return { duration, targetS, within: Math.abs(duration - targetS) <= prod.toleranceMin * 60, wpm };
}

// cenas: monta o projeto (build) e tira um still no meio de cada plano, num Chrome só; grava cenas/<plano>.png.
export async function scenesStep({ inject, dir, signal, report }) {
  const ep = await json(dir, 'episode.json', EP), timing = await json(dir, 'timing.json', TIMING), run = runOf(inject, signal);
  report('Montando o projeto', 0, 1);
  await inject.runEpisodeFn(dir, { steps: ['build'], run, log: () => {} });
  const times = stillTimes(episodeProject(ep, timing).storyboard), tmp = join(dir, 'cenas-tmp'), out = join(dir, 'cenas');
  report(`Tirando ${times.length} stills`, 0, times.length);
  await rm(tmp, { recursive: true, force: true });
  await run('node', ['render.mjs', `--project=ep-${ep.id}`, `--stills=${times.map(x => x.t).join(',')}`, `--out=${tmp}`]);
  await rm(out, { recursive: true, force: true }); await mkdir(out);
  for (const { shot, t } of times) await rename(join(tmp, 't' + t.toFixed(2).replace('.', '_') + '.png'), join(out, shot + '.png'));
  await rm(tmp, { recursive: true, force: true });
  return { shots: times.length };
}

// render: loops → verify com o tempo de cada subetapa. Só termina bem com a mensagem do verify.
export async function renderStep({ inject, dir, signal, report }) {
  await json(dir, 'timing.json', TIMING);
  const subSteps = {}; let verify = null;
  await inject.runEpisodeFn(dir, { steps: RENDER, run: runOf(inject, signal), log: l => {
    const p = renderProgress(l);
    if (p.sub) { subSteps[p.sub.step] = p.sub.ms; if (p.sub.step === 'verify') verify = JSON.parse(l).message; }
    report(p.message, p.done, p.total);
  } });
  if (!verify) throw new Error('Vídeo sem verificação: o verify não rodou');
  return { verify, subSteps };
}
