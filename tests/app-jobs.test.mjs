import test from 'node:test';
import assert from 'node:assert/strict';
import {openDb} from '../scripts/app/db.mjs';
import {createJobs, sseWrite} from '../scripts/app/jobs.mjs';

test('jobs run one at a time and report progress then end', async () => {
  const jobs = createJobs(openDb(':memory:')), seen = []; let go;
  const gate = new Promise(ok => (go = ok));
  const a = jobs.start('mine', async r => { await gate; r('a', 1, 2); return { n: 1 }; });
  const b = jobs.start('mine', async () => 2);
  assert.equal(jobs.get(b).status, 'queued');
  const fin = new Promise(ok => jobs.subscribe(a, (e, d) => { seen.push([e, d]); if (e === 'end') ok(); }));
  go(); await fin;
  assert.deepEqual(seen, [['progress', { done: 0, total: 0, message: '' }], ['progress', { done: 1, total: 2, message: 'a' }], ['end', { status: 'done', result: { n: 1 } }]]);
  assert.deepEqual(jobs.get(a).result, { n: 1 });
  assert.deepEqual(jobs.get(a).progress, { done: 1, total: 2, message: 'a' });
});
test('a failing job ends with message only', async () => {
  const jobs = createJobs(openDb(':memory:')), id = jobs.start('mine', async () => { throw new Error('Cota do YouTube esgotada hoje'); });
  const d = await new Promise(ok => jobs.subscribe(id, (e, d) => e === 'end' && ok(d)));
  assert.deepEqual(d, { status: 'error', error: 'Cota do YouTube esgotada hoje' });
});
test('late subscriber gets end immediately', async () => {
  const jobs = createJobs(openDb(':memory:')), id = jobs.start('mine', async () => 7);
  await new Promise(ok => jobs.subscribe(id, e => e === 'end' && ok()));
  const seen = []; jobs.subscribe(id, (e, d) => seen.push([e, d]));
  assert.deepEqual(seen.at(-1), ['end', { status: 'done', result: 7 }]);
});
test('queued job runs after the first, list shows both, jobs persist', async () => {
  const db = openDb(':memory:'), jobs = createJobs(db);
  const a = jobs.start('mine', async () => 1), b = jobs.start('mine', async () => 2);
  await new Promise(ok => jobs.subscribe(b, e => e === 'end' && ok()));
  assert.equal(jobs.get(a).status, 'done');
  assert.deepEqual(jobs.list().map(x => x.id), [a, b]);
  assert.deepEqual(db.raw.prepare('SELECT status FROM jobs ORDER BY created_at, id').all().map(r => r.status).sort(), ['done', 'done']);
  assert.equal(jobs.get('nope'), null);
});
test('sseWrite formats an event', () => {
  let out = ''; sseWrite({ write: s => (out += s) }, 'end', { status: 'done' });
  assert.equal(out, 'event: end\ndata: {"status":"done"}\n\n');
});
const end = (jobs, id) => new Promise(ok => jobs.subscribe(id, (e, d) => e === 'end' && ok(d)));
test('a failed job does not block the queued one', async () => {
  const jobs = createJobs(openDb(':memory:')), a = jobs.start('x', async () => { throw new Error('boom'); }), b = jobs.start('x', async () => 5);
  assert.equal((await end(jobs, a)).status, 'error');
  assert.deepEqual(await end(jobs, b), { status: 'done', result: 5 });
});
test('synchronous throw in fn ends as error and queue continues', async () => {
  const jobs = createJobs(openDb(':memory:')), a = jobs.start('x', () => { throw new Error('sync'); }), b = jobs.start('x', async () => 1);
  assert.deepEqual(await end(jobs, a), { status: 'error', error: 'sync' });
  assert.equal((await end(jobs, b)).status, 'done');
});
test('unsubscribe stops delivery', async () => {
  const jobs = createJobs(openDb(':memory:')); let go; const gate = new Promise(ok => (go = ok));
  const a = jobs.start('x', async r => { await gate; r('m', 1, 1); });
  const seen = [], off = jobs.subscribe(a, e => seen.push(e));
  off(); go(); await end(jobs, a);
  assert.deepEqual(seen, ['progress']); // só o estado inicial
});
test('subscribe while running gets progress then end', async () => {
  const jobs = createJobs(openDb(':memory:')); let go; const gate = new Promise(ok => (go = ok));
  const a = jobs.start('x', async r => { r('p', 1, 2); await gate; return 3; });
  await new Promise(ok => setTimeout(ok, 5));
  assert.equal(jobs.get(a).status, 'running');
  const seen = [], fin = new Promise(ok => jobs.subscribe(a, (e, d) => { seen.push([e, d]); if (e === 'end') ok(); }));
  go(); await fin;
  assert.deepEqual(seen, [['progress', { done: 1, total: 2, message: 'p' }], ['end', { status: 'done', result: 3 }]]);
});
test('throwing listeners and failing saves do not block the queue', async () => {
  const db = openDb(':memory:'), save = db.saveJob; let fail = false;
  db.saveJob = x => { if (fail) throw new Error('disk'); save(x); };
  const jobs = createJobs(db); let go; const gate = new Promise(ok => (go = ok));
  const a = jobs.start('x', async r => { await gate; r('p', 1, 1); }), b = jobs.start('x', async () => 9);
  jobs.subscribe(a, e => { if (e === 'end') throw new Error('listener'); });
  fail = true; go();
  assert.deepEqual(await end(jobs, b), { status: 'done', result: 9 });
  assert.equal(jobs.get(a).status, 'done');
});
