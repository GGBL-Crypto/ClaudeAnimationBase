import test from 'node:test';
import assert from 'node:assert/strict';
import {openDb} from '../scripts/app/db.mjs';
import {createJobs, sseWrite} from '../scripts/app/jobs.mjs';

test('jobs run one at a time and report progress then end', async () => {
  const jobs = createJobs(openDb(':memory:')), seen = [];
  const a = jobs.start('mine', async r => { r('a', 1, 2); await new Promise(ok => setTimeout(ok, 20)); return { n: 1 }; });
  const b = jobs.start('mine', async () => 2);
  assert.equal(jobs.get(b).status, 'queued');
  await new Promise(ok => jobs.subscribe(a, (e, d) => { seen.push(e); if (e === 'end') ok(); }));
  assert.deepEqual(jobs.get(a).result, { n: 1 }); assert.ok(seen.includes('progress'));
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
