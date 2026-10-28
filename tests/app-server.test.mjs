import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { startAppServer, errorStatus } from '../scripts/app-server.mjs';
import { saveConfig, DEFAULTS } from '../scripts/app/config.mjs';

// Fixtures do YouTube com UCfixture1 trocado por um id válido (22 caracteres) para alcançar as rotas /api/channels/:id.
const C1 = 'UCfixture' + '0'.repeat(14) + '1';
const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/youtube/${n}.json`, import.meta.url), 'utf8').replace(/"UCfixture1"/g, JSON.stringify(C1)));
const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
const calls = [];
const fakeFetch = async (url, init) => {
  const u = new URL(url), m = u.pathname.split('/').pop(), p = k => u.searchParams.get(k);
  calls.push({ url, key: init.headers['x-goog-api-key'] });
  if (m === 'search') return res(200, fx(p('type') === 'video' ? 'search-video' : 'search-channel'));
  if (m === 'channels') return res(200, { items: fx('channels').items.filter(c => p('id')?.split(',').includes(c.id)) });
  if (m === 'playlistItems') return res(200, p('playlistId') === 'UUfixture1' ? fx('playlistItems') : { items: [] });
  return res(200, { items: fx('videos').items.filter(v => p('id').split(',').includes(v.id)) });
};

let s, temp, dataDir, ok;
before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'app-server-')); dataDir = join(temp, 'data');
  const appDir = join(temp, 'app'); await mkdir(join(appDir, 'views'), { recursive: true });
  await writeFile(join(appDir, 'index.html'), '<meta name="app-token" content="%APP_TOKEN%"><p>app</p>');
  await writeFile(join(appDir, 'other.html'), '<p>%APP_TOKEN%</p>');
  await writeFile(join(appDir, 'app.css'), 'body{}'); await writeFile(join(appDir, 'views', 'x.js'), 'export const x = 1;');
  await writeFile(join(temp, 'secret.js'), 'private');
  saveConfig(dataDir, { apiKey: 'AIzaTESTKEY1234' });
  s = await startAppServer({ dataDir, appDir, fetch: fakeFetch, now: () => Date.parse('2026-10-27T12:00:00Z') });
  ok = { token: s.token, origin: s.origin };
});
after(async () => { await s.close(); await rm(temp, { recursive: true, force: true }); });

const send = (method, path, { headers = {}, body } = {}) => new Promise((done, bad) => {
  const req = request(s.origin, { path, method, headers: { Host: new URL(s.origin).host, ...headers } }, r => {
    let b = ''; r.setEncoding('utf8'); r.on('data', x => b += x); r.on('end', () => done({ status: r.statusCode, body: b, headers: r.headers }));
  });
  req.on('error', bad); req.end(body);
});
const get = (path, headers) => send('GET', path, { headers });
const post = (path, body, { token, origin } = {}) => send('POST', path, { body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(token && { 'X-App-Token': token }), ...(origin && { Origin: origin }) } });
const readSse = async path => {
  const r = await get(path); assert.match(r.headers['content-type'], /text\/event-stream/);
  return r.body.split('\n\n').filter(Boolean).map(b => ({ event: /^event: (.*)$/m.exec(b)[1], data: JSON.parse(/^data: (.*)$/m.exec(b)[1]) }));
};

test('binds loopback, injects token, sets CSP', async () => {
  assert.equal(s.address.address, '127.0.0.1'); assert.match(s.token, /^[0-9a-f]{48}$/);
  const r = await get('/'); assert.equal(r.status, 200); assert.ok(r.body.includes(s.token)); assert.ok(!r.body.includes('%APP_TOKEN%'));
  assert.match(r.headers['content-security-policy'], /script-src 'self'/); assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff'); assert.equal(r.headers['cache-control'], 'no-store');
  const css = await get('/app.css'); assert.equal(css.status, 200); assert.match(css.headers['content-type'], /text\/css/);
  assert.equal((await get('/views/x.js')).status, 200);
});
test('token is injected only in index.html', async () => {
  const r = await get('/other.html'); assert.equal(r.status, 200); assert.equal(r.body, '<p>%APP_TOKEN%</p>'); assert.ok(!r.body.includes(s.token));
});
test('errorStatus keeps only 400..599 integers', () => {
  for (const [st, want] of [[0, 500], [200, 500], [600, 500], [404.5, 500], ['404', 500], [NaN, 500], [undefined, 500], [403, 403], [599, 599]]) assert.equal(errorStatus({ status: st }), want, String(st));
});
test('rejects wrong host, missing origin and missing token', async () => {
  assert.equal((await get('/api/config', { Host: 'evil.test' })).status, 403);
  assert.equal((await get('/api/config', { Host: 'localhost:' + s.address.port })).status, 403);
  assert.equal((await post('/api/config', { cacheHours: 1 }, { token: s.token, origin: 'http://evil.test' })).status, 403);
  assert.equal((await post('/api/config', { cacheHours: 1 }, { origin: s.origin })).status, 403);
  assert.equal((await post('/api/config', { cacheHours: 1 }, { token: s.token.slice(0, -1) + 'x', origin: s.origin })).status, 403);
  assert.equal((await send('DELETE', '/api/config')).status, 405);
  assert.equal((await send('PUT', '/')).status, 405);
  assert.equal((await get('/api/mine')).status, 405);
});
test('api key is stored but never returned', async () => {
  const r = await post('/api/config', { apiKey: 'AIzaTESTKEY1234' }, ok);
  assert.equal(JSON.parse(r.body).apiKeyHint, '…1234'); assert.ok(!r.body.includes('AIzaTEST')); assert.ok(!(await get('/api/config')).body.includes('AIzaTEST'));
});
test('config accepts only known keys, validates types and merges partial weights', async () => {
  const r = JSON.parse((await post('/api/config', { weights: { novo: 5 }, cacheHours: 2, rpm: { 'curiosidades|pt': [1, 3] }, quotaLimit: 1, evil: 1 }, ok)).body);
  assert.deepEqual(r.weights, { ...DEFAULTS.weights, novo: 5 }); assert.equal(r.cacheHours, 2); assert.equal(r.quotaLimit, 10000); assert.equal(r.evil, undefined);
  assert.deepEqual(JSON.parse(await readFile(join(dataDir, 'config.json'), 'utf8')).weights, { ...DEFAULTS.weights, novo: 5 });
  for (const b of [{ cacheHours: 0 }, { cacheHours: '5' }, { weights: { novo: -1 } }, { weights: { outro: 1 } }, { weights: [1, 2] }, { rpm: { x: [1] } }, { rpm: { x: ['1', 2] } }, { apiKey: 5 }, { apiKey: 'a\r\nb' }, [1], 'nojson'])
    assert.equal((await post('/api/config', b, ok)).status, 400, JSON.stringify(b));
  assert.equal((await post('/api/config', { weights: DEFAULTS.weights, cacheHours: 24, rpm: {} }, ok)).status, 200);
});
test('quota reports the Pacific day', async () => {
  const q = JSON.parse((await get('/api/quota')).body); assert.equal(q.day, '2026-10-27'); assert.equal(q.limit, 10000); assert.equal(typeof q.used, 'number');
});
test('mine job streams progress and end, then channels list shows rows', async () => {
  const { jobId, estimate } = JSON.parse((await post('/api/mine', { q: 'sleep' }, ok)).body); assert.equal(estimate, 301);
  const events = await readSse(`/api/jobs/${jobId}/events`); assert.equal(events.at(-1).event, 'end'); assert.equal(events.at(-1).data.status, 'done');
  assert.ok(events.some(e => e.event === 'progress'));
  const list = JSON.parse((await get('/api/channels?preset=tudo')).body); assert.ok(list.total >= 2); assert.equal(list.rows.length, list.total);
  assert.ok(list.rows.every(r => r.updatedAt === '2026-10-27T12:00:00.000Z')); // `at` vem do now() injetado
  assert.ok(calls.every(c => c.key === 'AIzaTESTKEY1234' && !c.url.includes('AIza')));
  const asc = JSON.parse((await get('/api/channels?preset=tudo&sort=avgViews&dir=asc')).body).rows.map(r => r.avgViews).filter(x => x != null);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.equal(JSON.parse((await get('/api/channels?preset=tudo&country=BR')).body).total, 1);
});
test('channel detail, tag and refresh', async () => {
  const c = JSON.parse((await get(`/api/channels/${C1}`)).body); assert.equal(c.title, 'Fixture One'); assert.ok(Array.isArray(c.snapshots));
  assert.equal((await get('/api/channels/UCzzzzzzzzzzzzzzzzzzzzzz')).status, 404);
  const t = JSON.parse((await post(`/api/channels/${C1}/tag`, { tag: 'curiosidades', faceless: true }, ok)).body); assert.equal(t.tag, 'curiosidades'); assert.equal(t.faceless, true);
  assert.equal((await post(`/api/channels/${C1}/tag`, { tag: 5 }, ok)).status, 400);
  const n = calls.length;
  const { jobId } = JSON.parse((await post(`/api/channels/${C1}/refresh`, {}, ok)).body);
  assert.equal((await readSse(`/api/jobs/${jobId}/events`)).at(-1).data.status, 'done');
  assert.ok(calls.length > n); // refresh ignora o cache
  const { jobId: imp } = JSON.parse((await post('/api/import', { text: `${C1}\nlixo` }, ok)).body);
  assert.deepEqual((await readSse(`/api/jobs/${imp}/events`)).at(-1).data.result.invalid, ['lixo']);
  assert.equal((await get('/api/jobs/00000000-0000-0000-0000-000000000000/events')).status, 404);
});
test('bad inputs', async () => {
  assert.equal((await post('/api/mine', { q: ' ' }, ok)).status, 400);
  assert.equal((await post('/api/mine', { q: 5 }, ok)).status, 400);
  assert.equal((await post('/api/import', {}, ok)).status, 400);
  assert.equal((await get('/api/channels?preset=nada')).status, 400);
  assert.equal((await get('/api/channels?preset=toString')).status, 400);
  assert.equal((await get('/api/channels/..%2f')).status, 403);
  assert.equal((await get('/api/channels/notanid/videos')).status, 400);
  const big = await post('/api/import', { text: 'x'.repeat(70000) }, ok); assert.equal(big.status, 413); assert.deepEqual(Object.keys(JSON.parse(big.body)), ['error']);
  const chunked = await send('POST', '/api/import', { body: JSON.stringify({ text: 'x'.repeat(70000) }), headers: { 'Transfer-Encoding': 'chunked', 'X-App-Token': s.token, Origin: s.origin } });
  assert.equal(chunked.status, 413); // sem Content-Length: corta na leitura
});
test('responses with hostile titles are JSON, never HTML', async () => {
  const r = await get('/api/channels/UCfixture00000000000000a/videos'); assert.match(r.headers['content-type'], /application\/json/);
  const v = await get(`/api/channels/${C1}/videos`); assert.match(v.headers['content-type'], /application\/json/); assert.equal(v.headers['x-content-type-options'], 'nosniff');
  assert.ok(JSON.parse(v.body).some(x => x.title === '<img src=x onerror=alert(1)>'));
});
test('static traversal is rejected', async () => { for (const p of ['/../package.json', '/app/../data/config.json', '/%2e%2e/x', '/data/config.json', '/../secret.js', '/views/../index.html', '//app.css', '/app.css%00']) { const r = await get(p); assert.ok([403, 404].includes(r.status), p); assert.ok(!r.body.includes('private'), p); } });
test('corrupted config.json falls back to defaults', async () => {
  await writeFile(join(dataDir, 'config.json'), '{oops');
  const r = await get('/api/config'); assert.equal(r.status, 200); assert.deepEqual(JSON.parse(r.body).weights, DEFAULTS.weights);
});
