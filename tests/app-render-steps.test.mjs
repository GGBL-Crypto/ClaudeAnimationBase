import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { startAppServer } from '../scripts/app-server.mjs';
import { saveConfig } from '../scripts/app/config.mjs';
import { prodDir, runStep } from '../scripts/app/production.mjs';
import { openDb } from '../scripts/app/db.mjs';
import { createJobs } from '../scripts/app/jobs.mjs';
import { kitCatalog } from '../scripts/episode-lib.mjs';
import { stillTimes, swapScene, renderProgress, narrationStep, renderStep } from '../scripts/app/render-steps.mjs';

const DEMO = JSON.parse(readFileSync(new URL('../fixtures/episodes/demo/episode.json', import.meta.url), 'utf8'));
// Timing mínimo da demo: 8 planos de 10 s, com fala nos narrados.
const TIMING = { duration: 80, fps: 24, shots: DEMO.chapters.flatMap(c => c.shots.map(s => ({ id: s.id, chapter: c.id }))).map((s, i) => ({ ...s, start: i * 10, end: i * 10 + 10, speech: [] })) };
// Linhas que o runEpisode da demo emite (validate, loops com progresso e uma linha final com ms por etapa).
const LINES = {
  narrate: [{ step: 'narrate', done: 1, total: 1, message: 'p1: 80.00 s', ms: 4000 }],
  build: [{ step: 'build', done: 1, total: 1, message: 'ep-p1: 80.00 s', ms: 300 }],
  loops: [{ step: 'loops', done: 0, total: 2, message: 'mar (mar-1a2b3c4d)' }, { step: 'loops', done: 1, total: 2, message: 'deserto (deserto-5e6f7a8b)' }, { step: 'loops', done: 2, total: 2, message: '2 renderizados, 6 já no acervo', ms: 61000 }],
  segments: [{ step: 'segments', done: 8, total: 8, message: '8 cortados, 0 em cache', ms: 9000 }],
  mix: [{ step: 'mix', done: 1, total: 1, message: 'mix ok', ms: 2000 }],
  assemble: [{ step: 'assemble', done: 1, total: 1, message: 'out/episodes/p1/video.mp4', ms: 5000 }],
  verify: [{ step: 'verify', done: 1, total: 1, message: '1920x1080, 24 fps, 1920 quadros, 80 s, áudio aac', ms: 700 }],
};
const fakeEpisode = ({ skip = [], timing = TIMING } = {}) => async (dir, { steps, run, log }) => {
  assert.equal(typeof run, 'function');
  log(JSON.stringify({ step: 'validate', message: 'Planos s1 e s2 seguidos repetem a cena' }));
  for (const s of steps) {
    if (skip.includes(s)) continue;
    if (s === 'narrate') await writeFile(join(dir, 'timing.json'), JSON.stringify(timing));
    for (const l of LINES[s]) log(JSON.stringify(l));
  }
};
// Pasta com timing.json: o render recusa sem narração.
const tdir = async () => { const d = await mkdtemp(join(tmpdir(), 'app-render-t-')); await writeFile(join(d, 'timing.json'), '{}'); return d; };
const io = () => { const rep = []; return { rep, report: (...a) => rep.push(a), signal: new AbortController().signal }; };

test('stillTimes picks the middle of each shot', () => {
  assert.deepEqual(stillTimes([{ id: 's1', start: 0, end: 11.5 }, { id: 's2', start: 11.5, end: 20 }, { id: 's3', start: 20, end: 20.333 }]),
    [{ shot: 's1', t: 5.75 }, { shot: 's2', t: 15.75 }, { shot: 's3', t: 20.17 }]);
});

test('swapScene keeps narration and validates catalog', () => {
  const ep = { ...structuredClone(DEMO), id: 'p1' }, before = structuredClone(ep), cat = kitCatalog('pixel');
  const out = swapScene(ep, 's2', { scene: { id: 'floresta', params: { time: 'night', extras: ['campfire'] } }, actors: [{ cast: 'leitor', action: 'sit', at: 0.4, dir: -1 }] }, cat);
  assert.deepEqual(ep, before);
  const s2 = out.chapters[0].shots[1];
  assert.deepEqual(s2.scene, { id: 'floresta', params: { time: 'night', extras: ['campfire'] } });
  assert.deepEqual(s2.actors, [{ cast: 'leitor', action: 'sit', at: 0.4, dir: -1 }]);
  assert.equal(s2.narration, before.chapters[0].shots[1].narration); assert.deepEqual(s2.hud, before.chapters[0].shots[1].hud);
  const bad = [
    ['s2', { scene: { id: 'espaco', params: {} }, actors: [] }, /fora do catálogo/],
    ['s2', { scene: { id: 'mar', params: { extras: ['campfire'] } }, actors: [] }, /extras/],
    ['s2', { scene: { id: 'mar', params: {} }, actors: [{ cast: 'leitor', action: 'voar' }] }, /Ação inválida/],
    ['s2', { scene: { id: 'mar', params: {} }, actors: [{ cast: 'ninguem', action: 'stand' }] }, /Elenco sem/],
    ['s2', { scene: { id: 'mar', params: {} }, actors: [], narration: 'outra' }, /narração/],
    ['s9', { scene: { id: 'mar', params: {} }, actors: [] }, /Plano não encontrado/],
  ];
  for (const [shot, patch, re] of bad) assert.throws(() => swapScene(ep, shot, patch, cat), re, JSON.stringify(patch));
});

test('render step records sub-step ms from runEpisode lines', async () => {
  assert.deepEqual(renderProgress(JSON.stringify(LINES.loops[1])), { message: 'loops: deserto (deserto-5e6f7a8b)', done: 1, total: 2 });
  assert.deepEqual(renderProgress(JSON.stringify(LINES.loops[2])), { message: 'loops: 2 renderizados, 6 já no acervo (61 s)', done: 2, total: 2, sub: { step: 'loops', ms: 61000 } });
  assert.deepEqual(renderProgress(JSON.stringify({ step: 'segments', error: 'ffmpeg terminou com código 1' })), { message: 'segments: ffmpeg terminou com código 1', done: 0, total: 0 });
  const { rep, report, signal } = io(), steps = [];
  const r = await renderStep({ inject: { runEpisodeFn: (d, o) => { steps.push(...o.steps); return fakeEpisode()(d, o); }, spawnProc: () => { throw new Error('não chama'); } }, dir: await tdir(), signal, report });
  assert.deepEqual(steps, ['loops', 'segments', 'mix', 'assemble', 'verify']);
  assert.deepEqual(r, { verify: '1920x1080, 24 fps, 1920 quadros, 80 s, áudio aac', subSteps: { loops: 61000, segments: 9000, mix: 2000, assemble: 5000, verify: 700 } });
  assert.deepEqual(rep[2], ['loops: deserto (deserto-5e6f7a8b)', 1, 2]);
});

test('render done only with verify message', async () => {
  const { report, signal } = io();
  await assert.rejects(renderStep({ inject: { runEpisodeFn: fakeEpisode({ skip: ['verify'] }) }, dir: await tdir(), signal, report }), /verifica/i);
});

// Spawn falso do render.mjs --stills: grava um PNG por tempo, com o nome que o render.mjs usa.
const stills = [];
const fakeStills = (cmd, args) => {
  stills.push([cmd, ...args]);
  const c = new EventEmitter(); c.pid = 1; c.stdout = new PassThrough(); c.stderr = new PassThrough();
  const out = args.find(a => a.startsWith('--out=')).slice(6), times = args.find(a => a.startsWith('--stills=')).slice(9).split(',').map(Number);
  mkdirSync(out, { recursive: true }); for (const t of times) writeFileSync(join(out, 't' + t.toFixed(2).replace('.', '_') + '.png'), 'png');
  setImmediate(() => c.emit('close', 0));
  return c;
};
test('step errors and progress never carry absolute paths', async () => {
  const db = openDb(':memory:'), myc = db.createMyChannel({ name: 'c', lang: 'pt', style: 'pixel', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3 });
  const id = db.createProduction({ myId: myc, theme: 'Faróis', targetMin: 30, toleranceMin: 3, style: 'pixel' }), dir = await mkdtemp(join(tmpdir(), 'app-render-path-')), rep = [];
  const { signal } = io(), report = (...a) => rep.push(a);
  await assert.rejects(renderStep({ inject: { runEpisodeFn: fakeEpisode() }, dir, signal, report }), { message: 'Sem timing.json: rode a narração' });  // render antes da narração
  await writeFile(join(dir, 'timing.json'), '{}');
  const msg = "ENOENT: no such file, open 'C:\\x\\timing.json'", runEpisodeFn = async (d, { log }) => { log(JSON.stringify({ step: 'mix', error: msg })); throw new Error(msg); };
  // Pelo job, como no servidor: o fim do job (SSE) e a linha da tabela jobs também saem sem caminho.
  const jobs = createJobs(db), jobId = jobs.start(`prod:${id}:render`, (r, sig) => runStep({ db, id, step: 'render', signal: sig, report: r }, x => renderStep({ ...x, inject: { runEpisodeFn }, dir })));
  const events = []; await new Promise(ok => jobs.subscribe(jobId, (e, d) => { events.push([e, d]); if (e === 'end') ok(); }));
  const clean = "ENOENT: no such file, open '…'";
  assert.equal(db.production(id).steps.render.error, clean);
  assert.deepEqual(events.at(-1), ['end', { status: 'error', error: clean }]);
  assert.equal(db.jobsList().find(j => j.id === jobId).error, clean);
  assert.ok(!JSON.stringify(events).includes('C:\\'));
  assert.deepEqual(rep, []);  // o report do job foi para events
  assert.ok(events.some(([e, d]) => e === 'progress' && d.message === 'mix: ' + clean));
  await rm(dir, { recursive: true, force: true });
});

let s, temp, my, db2;
const send = (method, path, body) => new Promise((done, bad) => {
  const req = request(s.origin, { path, method, headers: { Host: new URL(s.origin).host, 'Content-Type': 'application/json', 'X-App-Token': s.token, Origin: s.origin } }, r => {
    let b = ''; r.setEncoding('utf8'); r.on('data', x => b += x); r.on('end', () => done({ status: r.statusCode, body: b ? JSON.parse(b) : null }));
  });
  req.on('error', bad); req.end(body && JSON.stringify(body));
});
const settle = async id => { for (let i = 0; i < 200; i++) { const p = (await send('GET', '/api/productions/' + id)).body; if (!Object.keys(p.active).length) return p; await new Promise(r => setTimeout(r, 10)); } throw new Error('etapa não terminou'); };
before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'app-render-')); const dataDir = join(temp, 'data');
  saveConfig(dataDir, {});
  s = await startAppServer({ dataDir, outDir: join(temp, 'out', 'app'), runEpisodeFn: fakeEpisode({ timing: { ...TIMING, duration: 40 * 60 } }), spawnProc: fakeStills });
  db2 = openDb(join(dataDir, 'app.db')); // segunda conexão: o teste prepara o estado das etapas
  my = (await send('POST', '/api/mychannels', { name: 'Render', lang: 'pt', style: 'pixel', voice: 'kokoro:pm_alex', targetMin: 30, toleranceMin: 3 })).body.id;
});
after(async () => { db2.close(); await s.close(); await rm(temp, { recursive: true, force: true }); });
const newProd = async () => {
  const p = (await send('POST', '/api/productions', { myId: my })).body, dir = prodDir(join(temp, 'out', 'app'), p.id);
  await mkdir(dir, { recursive: true }); await writeFile(join(dir, 'episode.json'), JSON.stringify({ ...DEMO, id: 'p' + p.id }));
  db2.setStep(p.id, 'roteiro', { status: 'done' });
  return { id: p.id, dir };
};

test('narration warns outside tolerance without failing', async () => {
  const { id } = await newProd();
  const r = await send('POST', `/api/productions/${id}/narracao`, {}); assert.equal(r.status, 200); assert.ok(r.body.jobId);
  const st = (await settle(id)).steps.narracao;
  assert.equal(st.status, 'done'); assert.deepEqual(st.result, { duration: 2400, targetS: 1800, within: false });
  const { report, signal } = io();
  const ok = await narrationStep({ inject: { runEpisodeFn: fakeEpisode({ timing: { ...TIMING, duration: 1900 } }) }, prod: { targetMin: 30, toleranceMin: 3 }, dir: join(temp, 'out', 'app', 'prod', String(id)), signal, report });
  assert.deepEqual(ok, { duration: 1900, targetS: 1800, within: true });
});

test('steps run only after the previous one is done', async () => {
  const { id } = await newProd();
  db2.setStep(id, 'roteiro', { status: 'stale' }); // roteiro editado: narração e cenas esperam
  for (const [k, prev] of [['narracao', 'Roteiro'], ['cenas', 'Narração'], ['render', 'Cenas']]) {
    const r = await send('POST', `/api/productions/${id}/${k}`, {}); assert.equal(r.status, 409); assert.equal(r.body.error, `Etapa ${prev} precisa estar feita`);
  }
});

test('swap marks cenas and later stale, not narracao', async () => {
  const { id, dir } = await newProd();
  for (const k of ['narracao', 'cenas', 'render']) { await send('POST', `/api/productions/${id}/${k}`, {}); await settle(id); }
  assert.deepEqual(stills.at(-1).slice(0, 2), ['node', 'render.mjs']); assert.equal(stills.at(-1)[2], `--project=ep-p${id}`); assert.equal(stills.at(-1)[3], '--stills=5,15,25,35,45,55,65,75');
  assert.deepEqual((await readdir(join(dir, 'cenas'))).sort(), ['s1.png', 's2.png', 's3.png', 's4.png', 's5.png', 's6.png', 's7.png', 's8.png']);
  assert.equal((await send('POST', `/api/productions/${id}/revisao`, { aprovado: false })).status, 400);
  await send('POST', `/api/productions/${id}/revisao`, { aprovado: true });
  let p = (await send('GET', '/api/productions/' + id)).body;
  assert.deepEqual(['narracao', 'cenas', 'render', 'revisao'].map(k => p.steps[k].status), ['done', 'done', 'done', 'done']); assert.deepEqual(p.steps.revisao.result, { aprovado: true });
  const bad = await send('POST', `/api/productions/${id}/cenas/trocar`, { shot: 's2', scene: { id: 'espaco', params: {} }, actors: [] });
  assert.equal(bad.status, 400); assert.match(bad.body.error, /catálogo/);
  const r = await send('POST', `/api/productions/${id}/cenas/trocar`, { shot: 's2', scene: { id: 'floresta', params: { time: 'night' } }, actors: [{ cast: 'leitor', action: 'sit' }] });
  assert.equal(r.status, 200);
  p = (await send('GET', '/api/productions/' + id)).body;
  assert.equal(p.steps.narracao.status, 'done');
  assert.equal(p.steps.cenas.status, 'stale'); assert.equal(p.steps.render.status, 'stale');
  const r409 = await send('POST', `/api/productions/${id}/render`, {}); assert.equal(r409.status, 409); assert.equal(r409.body.error, 'Etapa Cenas precisa estar feita'); assert.equal(p.steps.revisao.status, 'stale');
  const ep = JSON.parse(await readFile(join(dir, 'episode.json'), 'utf8'));
  assert.equal(ep.chapters[0].shots[1].scene.id, 'floresta'); assert.equal(ep.chapters[0].shots[1].narration, DEMO.chapters[0].shots[1].narration);
  const g = (await send('GET', `/api/productions/${id}/cenas`)).body;
  assert.equal(g.shots.length, 8); assert.deepEqual(g.cast, ['viajante', 'leitor']); assert.ok(g.catalog.scenes.mar);
  await send('POST', `/api/productions/${id}/revisao/voltar`, {});
  assert.equal((await send('GET', '/api/productions/' + id)).body.steps.revisao.status, 'pending');
});
