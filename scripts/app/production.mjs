// Produção de vídeo do webapp (fase 6): etapas, pastas, execução de uma etapa com tempo e processos canceláveis.
import { spawn as nodeSpawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const STEPS = ['pauta', 'fontes', 'analise', 'roteiro', 'narracao', 'cenas', 'render', 'revisao', 'embalagem'];
export const prodDir = (outDir, id) => join(outDir, 'prod', String(id));
export const epId = id => 'p' + id;
// Pasta do vídeo: o motor grava em <out>/episodes/<epId>, e outDir do app é <out>/app.
export const epDir = (outDir, id) => join(dirname(outDir), 'episodes', epId(id));

// Refazer uma etapa: as seguintes que estavam done viram stale. Não muda a entrada.
export function invalidateAfter(steps, step) {
  const i = STEPS.indexOf(step);
  return Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, STEPS.indexOf(k) > i && v.status === 'done' ? { ...v, status: 'stale' } : v]));
}

// Roda fn({ report, signal, prod }) gravando running → done | error | canceled, com startedAt, finishedAt e ms.
// prod é a produção já com a etapa em running. Devolve o resultado de fn (gravado em result) ou relança o erro.
export async function runStep({ db, id, step, signal, report, now = Date.now }, fn) {
  const before = db.production(id).steps, t0 = now(), iso = t => new Date(t).toISOString();
  if (before[step].status === 'done') for (const [k, v] of Object.entries(invalidateAfter(before, step))) if (v !== before[k]) db.setStep(id, k, { status: 'stale' });
  db.setStep(id, step, { status: 'running', startedAt: iso(t0), finishedAt: null, ms: null, result: null, error: null });
  const finish = (status, x) => { const t = now(); db.setStep(id, step, { status, finishedAt: iso(t), ms: t - t0, ...x }); };
  try {
    const result = await fn({ report, signal, prod: db.production(id) });
    if (signal?.aborted) throw new Error('Cancelada');
    finish('done', { result }); return result;
  } catch (e) {
    finish(signal?.aborted ? 'canceled' : 'error', { error: signal?.aborted ? 'Cancelada' : e?.message ?? String(e) }); // só a mensagem
    throw e;
  }
}

// Executor de processos das etapas, com a assinatura do run de runEpisode: (cmd, args) => stdout.
// No aborto mata a árvore inteira (Chrome e FFmpeg filhos do node): taskkill /T no Windows, grupo de processos nos outros.
export const runCancellable = (signal, { spawn = nodeSpawn, platform = process.platform, cwd = ROOT } = {}) => (cmd, args) => new Promise((ok, bad) => {
  if (signal?.aborted) return bad(new Error('Cancelada'));
  const win = platform === 'win32', child = spawn(cmd, args, { cwd, windowsHide: true, detached: !win, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  const kill = () => { try { if (win) spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {}); else process.kill(-child.pid, 'SIGKILL'); } catch {} };
  signal?.addEventListener('abort', kill, { once: true });
  const off = () => signal?.removeEventListener('abort', kill);
  child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { err += d; });
  child.on('error', e => { off(); bad(e); });
  child.on('close', code => { off(); signal?.aborted ? bad(new Error('Cancelada')) : code === 0 ? ok(out) : bad(new Error(`${cmd} terminou com código ${code}: ${err.trim()}`)); });
});
