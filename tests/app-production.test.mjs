import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { openDb } from '../scripts/app/db.mjs';
import { createJobs } from '../scripts/app/jobs.mjs';
import { STEPS, prodDir, epId, epDir, invalidateAfter, runStep, runCancellable } from '../scripts/app/production.mjs';
import { kitCatalog } from '../scripts/episode-lib.mjs';

const setup = () => {
  const db = openDb(':memory:'), my = db.createMyChannel({ name: 'c', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3 });
  return { db, id: db.createProduction({ myId: my, theme: 'Roma', targetMin: 30, toleranceMin: 3, style: 'flat' }) };
};
const end = (jobs, id) => new Promise(ok => jobs.subscribe(id, (e, d) => e === 'end' && ok(d)));

test('steps, ids and folders', () => {
  assert.deepEqual(STEPS, ['pauta', 'fontes', 'analise', 'roteiro', 'narracao', 'cenas', 'render', 'revisao', 'embalagem']);
  assert.equal(epId(7), 'p7');
  assert.match(prodDir('/x/out/app', 7).replace(/\\/g, '/'), /\/x\/out\/app\/prod\/7$/);
  assert.match(epDir('/x/out/app', 7).replace(/\\/g, '/'), /\/x\/out\/episodes\/p7$/);
});
test('invalidateAfter is pure', () => {
  const steps = Object.fromEntries(STEPS.map(s => [s, { status: 'done', ms: 1 }])); steps.analise = { status: 'pending' }; steps.render = { status: 'error' };
  const copy = structuredClone(steps), out = invalidateAfter(steps, 'roteiro');
  assert.deepEqual(steps, copy);
  assert.deepEqual(STEPS.map(s => out[s].status), ['done', 'done', 'pending', 'done', 'stale', 'stale', 'error', 'stale', 'stale']);
  assert.equal(out.narracao.ms, 1); assert.equal(out.pauta, steps.pauta);
});
test('runStep records ms and marks later done steps stale', async () => {
  const { db, id } = setup(); let t = 1000; const now = () => t;
  const r = await runStep({ db, id, step: 'roteiro', now }, async ({ prod, report }) => { assert.equal(prod.steps.roteiro.status, 'running'); assert.equal(report, undefined); t += 250; return { words: 10 }; });
  assert.deepEqual(r, { words: 10 });
  let s = db.production(id).steps.roteiro; assert.deepEqual([s.status, s.ms, s.result, s.startedAt, s.finishedAt], ['done', 250, { words: 10 }, new Date(1000).toISOString(), new Date(1250).toISOString()]);
  for (const k of ['narracao', 'cenas']) db.setStep(id, k, { status: 'done' });
  db.setStep(id, 'fontes', { status: 'done' });
  await assert.rejects(runStep({ db, id, step: 'roteiro', now }, async () => { t += 5; throw new Error('Capítulo c2: cena fora do catálogo'); }), /c2/);
  const st = db.production(id).steps;
  assert.deepEqual([st.roteiro.status, st.roteiro.error, st.roteiro.ms, st.roteiro.result], ['error', 'Capítulo c2: cena fora do catálogo', 5, null]);
  assert.deepEqual([st.fontes.status, st.narracao.status, st.cenas.status, st.render.status], ['done', 'stale', 'stale', 'pending']);
  db.setStep(id, 'narracao', { status: 'done' });
  await runStep({ db, id, step: 'roteiro', now }, async () => 1); // estava error: invalida também (a entrada pode ter mudado)
  assert.equal(db.production(id).steps.narracao.status, 'stale');
  db.setStep(id, 'roteiro', { status: 'done' }); db.setStep(id, 'narracao', { status: 'done' });
  await runStep({ db, id, step: 'pauta', now }, async () => 0); // pauta pendente refeita: tudo done depois fica stale
  assert.deepEqual(['roteiro', 'narracao'].map(k => db.production(id).steps[k].status), ['stale', 'stale']);
  db.setStep(id, 'cenas', { status: 'stale' }); db.setStep(id, 'render', { status: 'done' });
  await runStep({ db, id, step: 'cenas', now }, async () => 2); // stale refeita: invalida como done
  assert.deepEqual(['cenas', 'render'].map(k => db.production(id).steps[k].status), ['done', 'stale']);
});

// stderr com caminho absoluto e frame de stack: nada disso pode chegar à mensagem.
const STACK = "Error: Cannot find module 'C:\\x\\y.js' in /home/u/app/z.mjs\n    at foo (C:\\x\\y.js:1:1)\n    at bar (node:internal/x:2:3)\n";
// Spawn falso: cada filho registra o comando; taskkill fecha o filho vivo com código 1.
function fakeSpawn() {
  const calls = [], live = [];
  const spawn = (cmd, args) => {
    const c = new EventEmitter(); c.pid = 4242 + calls.length; c.stdout = new PassThrough(); c.stderr = new PassThrough(); c.kill = () => calls.push(['kill', c.pid]);
    calls.push([cmd, ...args]);
    if (cmd === 'taskkill') { for (const x of live.splice(0)) setImmediate(() => x.emit('close', 1)); setImmediate(() => c.emit('close', 0)); }
    else if (args[0] === 'ok') setImmediate(() => { c.stdout.write('saída\n'); setImmediate(() => c.emit('close', 0)); });
    else if (args[0] === 'bad') setImmediate(() => { c.stderr.write('falhou'); setImmediate(() => c.emit('close', 2)); });
    else if (args[0] === 'stack') setImmediate(() => { c.stderr.write(STACK); setImmediate(() => c.emit('close', 1)); });
    else live.push(c);
    return c;
  };
  return { spawn, calls };
}
test('runCancellable returns stdout and readable errors', async () => {
  const { spawn } = fakeSpawn(), run = runCancellable(new AbortController().signal, { spawn, platform: 'win32' });
  assert.equal(await run('node', ['ok']), 'saída\n');
  await assert.rejects(run('ffmpeg', ['bad']), { message: 'ffmpeg terminou com código 2: falhou' });
  const e = await run('node', ['stack']).catch(e => e);
  assert.equal(e.message, "node terminou com código 1: Error: Cannot find module '…' in …");
  for (const x of ['C:\\x', 'y.js', 'at foo', '/home/u']) assert.ok(!e.message.includes(x), x);
  const ac = new AbortController(); ac.abort();
  await assert.rejects(runCancellable(ac.signal, { spawn, platform: 'win32' })('node', ['ok']), { message: 'Cancelada' });
});
test('cancel kills the process tree and marks canceled', async () => {
  const { db, id } = setup(), jobs = createJobs(db), { spawn, calls } = fakeSpawn();
  db.setStep(id, 'render', { status: 'done' }); db.setStep(id, 'revisao', { status: 'done' });
  const jobId = jobs.start('prod', (report, signal) => runStep({ db, id, step: 'render', signal, report }, ({ signal }) => runCancellable(signal, { spawn, platform: 'win32' })('node', ['render.mjs'])));
  await new Promise(ok => setTimeout(ok, 10));
  assert.equal(db.production(id).steps.render.status, 'running');
  assert.equal(jobs.cancel(jobId), true);
  assert.deepEqual(await end(jobs, jobId), { status: 'canceled' });
  assert.deepEqual(calls.find(c => c[0] === 'taskkill'), ['taskkill', '/PID', '4242', '/T', '/F']);
  const s = db.production(id).steps; assert.deepEqual([s.render.status, s.render.error, s.revisao.status], ['canceled', 'Cancelada', 'stale']); assert.ok(Number.isInteger(s.render.ms));
  assert.equal(jobs.get(jobId).status, 'canceled');
});
test('kitCatalog lists scenes of the style and actions from the kit', () => {
  const k = kitCatalog('pixel');
  assert.ok(k.actions.includes('walk')); assert.ok(k.times.includes('night')); assert.ok(k.bodies.includes('adult')); assert.ok(k.gear.includes('hat'));
  assert.deepEqual(k.weathers, ['clear', 'rain', 'snow', 'fog']); assert.deepEqual(k.framings, ['wide', 'mid']); assert.deepEqual(k.hud, ['year', 'sub', 'place', 'tag']);
  assert.equal(Object.keys(k.scenes).length, 8); assert.ok(Object.values(k.scenes).every(s => Array.isArray(s.extras) && typeof s.exterior === 'boolean'));
  assert.deepEqual(k.scenes.mar, { extras: ['lighthouse', 'ship'], exterior: true }); assert.equal(k.scenes['interior-vela'].exterior, false);
  assert.throws(() => kitCatalog('cartoon'), /Estilo/);
});
