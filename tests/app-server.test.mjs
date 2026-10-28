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
  s = await startAppServer({ dataDir, appDir, fetch: fakeFetch, now: () => Date.parse('2026-10-27T12:00:00Z'), claude: async () => ({ resumo: 'r', pontos: ['p'] }) });
  ok = { token: s.token, origin: s.origin };
});
after(async () => { await s.close(); await rm(temp, { recursive: true, force: true }); });

const send = (method, path, { server = s, headers = {}, body } = {}) => new Promise((done, bad) => {
  const req = request(server.origin, { path, method, headers: { Host: new URL(server.origin).host, ...headers } }, r => {
    let b = ''; r.setEncoding('utf8'); r.on('data', x => b += x); r.on('end', () => done({ status: r.statusCode, body: b, headers: r.headers }));
  });
  req.on('error', bad); req.end(body);
});
const get = (path, headers, server) => send('GET', path, { headers, server });
const post = (path, body, { token, origin, server } = {}) => send('POST', path, { server, body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(token && { 'X-App-Token': token }), ...(origin && { Origin: origin }) } });
const readSse = async (path, server) => {
  const r = await get(path, {}, server); assert.match(r.headers['content-type'], /text\/event-stream/);
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
// Fase 2: depois dos testes acima, que já mineraram a base.
test('empty base overview is all zeros', async () => {
  const t = await mkdtemp(join(tmpdir(), 'app-empty-')), s2 = await startAppServer({ dataDir: join(t, 'd'), appDir: join(t, 'none'), fetch: fakeFetch, now: () => Date.parse('2026-10-27T12:00:00Z') });
  try {
    assert.deepEqual(JSON.parse((await get('/api/overview', {}, s2)).body), { channels: 0, newChannels: 0, opportunities: 0, outliers7d: 0, outlierMin: 2, opportunityMin: 70, recent: [] });
  } finally { await s2.close(); await rm(t, { recursive: true, force: true }); }
});
test('quota reports search costs', async () => { assert.deepEqual(JSON.parse((await get('/api/quota')).body).costs, { mine: 301, videos: 202 }); });
test('videos list, filters and sort', async () => {
  const r = JSON.parse((await get('/api/videos?sort=multiple')).body); assert.ok(r.total >= 3); assert.ok(r.rows.every(v => 'channelTitle' in v && 'multiple' in v));
  assert.equal((await get('/api/videos?sort=evil')).status, 400);
  assert.deepEqual(JSON.parse((await get('/api/videos?ids=vidfixture2')).body).rows.map(v => v.id), ['vidfixture2']);
});
test('video mining validates input, estimates 202 and logs history with units', async () => {
  for (const b of [{ q: '' }, { q: 'x', videoDuration: 'huge' }, { q: 'x', publishedAfter: '2026/10/01' }, { q: 'x', relevanceLanguage: 'eng' }]) assert.equal((await post('/api/videos/mine', b, ok)).status, 400, JSON.stringify(b));
  const { jobId, estimate } = JSON.parse((await post('/api/videos/mine', { q: 'sleep', videoDuration: 'long' }, ok)).body); assert.equal(estimate, 202);
  const end = (await readSse(`/api/jobs/${jobId}/events`)).at(-1).data; assert.equal(end.status, 'done'); assert.ok(end.result.videoIds.length);
  const h = JSON.parse((await get('/api/history')).body).entries.find(e => e.kind === 'videos');
  assert.equal(h.payload.q, 'sleep'); assert.equal(h.payload.filters.videoDuration, 'long'); assert.ok(h.payload.units > 0); assert.equal(h.payload.status, 'done');
});
test('repeating a cached channel search costs 0 units', async () => {
  const { jobId } = JSON.parse((await post('/api/mine', { q: 'sleep' }, ok)).body); await readSse(`/api/jobs/${jobId}/events`);
  const h = JSON.parse((await get('/api/history')).body).entries.find(e => e.kind === 'mine'); assert.equal(h.payload.units, 0);
});
test('analysis, similar and summary', async () => {
  assert.equal(JSON.parse((await get(`/api/channels/${C1}/analysis`)).body).count, 3);
  const sim = JSON.parse((await get(`/api/channels/${C1}/similar`)).body); assert.ok(Array.isArray(sim)); assert.ok(sim.every(x => x.id !== C1));
  const { jobId, prompt } = JSON.parse((await post(`/api/channels/${C1}/summary`, {}, ok)).body); assert.ok(prompt.includes('Fixture One'));
  assert.deepEqual((await readSse(`/api/jobs/${jobId}/events`)).at(-1).data.result, { resumo: 'r', pontos: ['p'] });
});
test('collections: fixed favorites, duplicates, items, memberships, fav filter, delete', async () => {
  assert.deepEqual(JSON.parse((await get('/api/collections')).body)[0], { id: 1, name: 'Favoritos', fixed: true, count: 0 });
  const c = JSON.parse((await post('/api/collections', { name: 'Roma' }, ok)).body);
  assert.equal((await post('/api/collections', { name: 'roma' }, ok)).status, 400);
  assert.equal((await post('/api/collections/1/items', { kind: 'channel', id: C1, note: 'ver' }, ok)).status, 200);
  assert.equal((await post(`/api/collections/${c.id}/items`, { kind: 'video', id: 'vidfixture1' }, ok)).status, 200);
  assert.equal((await post(`/api/collections/${c.id}/items`, { kind: 'playlist', id: 'x' }, ok)).status, 400);
  assert.equal((await post(`/api/collections/${c.id}/items`, { kind: 'video', id: 'zzzzzzzzzzz' }, ok)).status, 404);
  assert.deepEqual(JSON.parse((await get(`/api/memberships?kind=channel&id=${C1}`)).body).ids, [1]);
  const fav = JSON.parse((await get('/api/collections/1')).body); assert.equal(fav.items[0].note, 'ver'); assert.equal(fav.items[0].row.title, 'Fixture One');
  assert.equal(JSON.parse((await get('/api/channels?preset=tudo&fav=1')).body).total, 1);
  assert.equal((await post('/api/collections/1/delete', {}, ok)).status, 400); assert.equal((await post('/api/collections/1/rename', { name: 'x' }, ok)).status, 400);
  assert.equal((await post(`/api/collections/${c.id}/delete`, {}, ok)).status, 200); assert.equal((await get(`/api/collections/${c.id}`)).status, 404);
  assert.equal((await get('/api/collections/abc')).status, 400); assert.equal((await post('/api/collections/999/items', { kind: 'channel', id: C1 }, ok)).status, 404);
});
test('collections reject bad names, notes and ids without 500', async () => {
  const c = JSON.parse((await post('/api/collections', { name: ' Grécia ' }, ok)).body); assert.equal(c.name, 'Grécia'); assert.equal(c.count, 0);
  for (const b of [{ name: '  ' }, { name: 'x'.repeat(61) }, { name: 5 }, {}]) assert.equal((await post('/api/collections', b, ok)).status, 400, JSON.stringify(b));
  assert.equal((await post(`/api/collections/${c.id}/rename`, { name: 'favoritos' }, ok)).status, 400);
  assert.equal(JSON.parse((await post(`/api/collections/${c.id}/rename`, { name: 'Egito' }, ok)).body).name, 'Egito');
  assert.equal((await post('/api/collections/999/rename', { name: 'y' }, ok)).status, 404); assert.equal((await post('/api/collections/999/delete', {}, ok)).status, 404);
  for (const b of [{ kind: 'channel', id: 'UCbad' }, { kind: 'video', id: C1 }, { kind: 'channel', id: C1, note: 5 }, { kind: 'channel', id: C1, note: 'x'.repeat(501) }]) assert.equal((await post(`/api/collections/${c.id}/items`, b, ok)).status, 400, JSON.stringify(b));
  assert.equal((await post(`/api/collections/${c.id}/items`, { kind: 'channel', id: 'UCzzzzzzzzzzzzzzzzzzzzzz' }, ok)).status, 404);
  assert.equal((await post(`/api/collections/${c.id}/items`, { kind: 'video', id: 'vidfixture1', note: null }, ok)).status, 200);
  assert.equal((await post(`/api/collections/${c.id}/items/remove`, { kind: 'video', id: 'vidfixture1' }, ok)).status, 200);
  assert.deepEqual(JSON.parse((await get(`/api/collections/${c.id}`)).body).items, []);
  assert.equal((await get('/api/memberships?kind=playlist&id=x')).status, 400); assert.equal((await get('/api/collections/1234567890')).status, 400);
});
test('history logs one open per consecutive visit and lists jobs', async () => {
  await get(`/api/channels/${C1}`); await get(`/api/channels/${C1}`);
  const h = JSON.parse((await get('/api/history')).body);
  assert.equal(h.entries[0].kind, 'open'); assert.notDeepEqual(h.entries[1]?.payload, h.entries[0].payload);
  assert.ok(h.jobs.some(j => j.kind === 'mine' && j.status === 'done')); assert.ok(h.jobs.every(j => !('result' in j)));
});
test('failed search still logs history with units and error status', async () => {
  const t = await mkdtemp(join(tmpdir(), 'app-quota-')), d = join(t, 'd'); saveConfig(d, { apiKey: 'AIzaTESTKEY1234' });
  const quota = async () => ({ ok: false, status: 403, json: async () => fx('quota-exceeded') });
  const s3 = await startAppServer({ dataDir: d, appDir: join(t, 'none'), fetch: quota, now: () => Date.parse('2026-10-27T12:00:00Z') });
  try {
    const { jobId } = JSON.parse((await post('/api/videos/mine', { q: 'x' }, { token: s3.token, origin: s3.origin, server: s3 })).body);
    assert.deepEqual((await readSse(`/api/jobs/${jobId}/events`, s3)).at(-1).data, { status: 'error', error: 'Cota do YouTube esgotada hoje' });
    const [e] = JSON.parse((await get('/api/history', {}, s3)).body).entries; assert.equal(e.payload.units, 100); assert.equal(e.payload.status, 'error');
  } finally { await s3.close(); await rm(t, { recursive: true, force: true }); }
});
test('config accepts thresholds', async () => {
  const r = JSON.parse((await post('/api/config', { outlierMin: 3, opportunityMin: 60 }, ok)).body); assert.equal(r.outlierMin, 3); assert.equal(r.opportunityMin, 60);
  for (const b of [{ outlierMin: 0.5 }, { opportunityMin: 101 }, { opportunityMin: 1.5 }, { outlierMin: '2' }]) assert.equal((await post('/api/config', b, ok)).status, 400, JSON.stringify(b));
  await post('/api/config', { outlierMin: 2, opportunityMin: 70 }, ok);
});
test('corrupted config.json falls back to defaults', async () => {
  await writeFile(join(dataDir, 'config.json'), '{oops');
  const r = await get('/api/config'); assert.equal(r.status, 200); assert.deepEqual(JSON.parse(r.body).weights, DEFAULTS.weights);
});
