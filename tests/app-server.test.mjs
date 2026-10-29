import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { startAppServer, errorStatus } from '../scripts/app-server.mjs';
import { saveConfig, DEFAULTS } from '../scripts/app/config.mjs';
import { openDb } from '../scripts/app/db.mjs';
import { writeWav } from '../scripts/narration-lib.mjs';

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

// Fase 4: thumbnail, Claude com imagens e Kokoro falsos.
const thumbCalls = [];
const fakeThumb = async url => { thumbCalls.push(url); return { ok: true, headers: new Headers({ 'content-type': 'image/jpeg', 'content-length': '3' }), arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; };
const modelImages = [];
// Modelo válido com os ids do prompt (linhas "id | views | ...").
const fakeModeler = async (prompt, images) => {
  modelImages.push(images.length);
  const ids = [...prompt.matchAll(/^([\w-]{11}) \| /gm)].map(m => m[1]);
  const c = i => ({ nome: 'Conceito ' + i, subtema: 's', videoIds: ids.slice(0, 2), moldesTitulo: ['O fim de [x]', 'A queda de [y]', 'Por que [z]'], estiloThumbnail: 'e', promptsImagem: ['a', 'b', 'c'], estiloVisual: 'flat', plano30: Array.from({ length: 8 }, (_, k) => ({ dia: k + 1, tema: 't' })) });
  return { resumo: 'r', conceitos: [0, 1, 2].map(c) };
};
// Filho falso do Kokoro: stdin.end(json) grava 20 s de WAV no `out` pedido.
const fakeVoiceSpawn = () => {
  const c = new EventEmitter(); c.stderr = new PassThrough();
  c.stdin = { end(s) { setImmediate(() => { writeFileSync(JSON.parse(s)[0].out, writeWav({ sampleRate: 24000, samples: new Float32Array(24000 * 20) })); c.emit('close', 0); }); } };
  return c;
};

let s, temp, dataDir, ok, opts, subFail = false;
before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'app-server-')); dataDir = join(temp, 'data');
  const appDir = join(temp, 'app'); await mkdir(join(appDir, 'views'), { recursive: true });
  await writeFile(join(appDir, 'index.html'), '<meta name="app-token" content="%APP_TOKEN%"><p>app</p>');
  await writeFile(join(appDir, 'other.html'), '<p>%APP_TOKEN%</p>');
  await writeFile(join(appDir, 'app.css'), 'body{}'); await writeFile(join(appDir, 'views', 'x.js'), 'export const x = 1;');
  await writeFile(join(temp, 'secret.js'), 'private');
  saveConfig(dataDir, { apiKey: 'AIzaTESTKEY1234' });
  opts = {
    dataDir, appDir, outDir: join(temp, 'out'), fetch: fakeFetch, now: () => Date.parse('2026-10-27T12:00:00Z'), claude: async () => ({ resumo: 'r', pontos: ['p'] }),
    subniches: async () => { if (subFail) throw new Error('claude terminou com código 1'); return { subnichos: [{ nome: 'n', porque: 'p', exemplos: [] }] }; },
    thumbFetch: fakeThumb, modeler: fakeModeler, voiceSpawn: fakeVoiceSpawn, voiceExists: () => true,
  };
  s = await startAppServer(opts);
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
  const t = JSON.parse((await post(`/api/channels/${C1}/tag`, { tag: 'curiosidades', faceless: true }, ok)).body); assert.equal(t.tag, 'curiosidades'); assert.equal(t.faceless, true); assert.deepEqual(Object.keys(t.watch).sort(), ['competitor', 'lastRun', 'monitor', 'since']);
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
  // canal parecido (mesmo tópico) com uma captura: a aba mostra inscritos e média com a data da coleta
  const C3 = 'UCfixture' + '0'.repeat(13) + 'zz', db = openDb(join(dataDir, 'app.db'));
  db.upsertChannel({ id: C3, title: 'Parecido', topics: ['https://en.wikipedia.org/wiki/Knowledge'] }); db.addChannelSnapshot(C3, '2026-10-26T00:00:00.000Z', { subs: 10, views: 5, videos: 0 }); db.close();
  const near = JSON.parse((await get(`/api/channels/${C1}/similar`)).body).find(x => x.id === C3);
  assert.equal(near.updatedAt, '2026-10-26T00:00:00.000Z');
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
// Fase 3. Servidor novo com C1 seguido (semeado no banco) e `used` unidades já gastas hoje.
const NOW = () => Date.parse('2026-10-27T12:00:00Z');
const watched = async (used, fetch = fakeFetch) => {
  const t = await mkdtemp(join(tmpdir(), 'app-mon-')), d = join(t, 'd'); saveConfig(d, { apiKey: 'AIzaTESTKEY1234' });
  const db = openDb(join(d, 'app.db')); db.upsertChannel({ id: C1, title: 'Fixture One' }); db.setWatch(C1, { monitor: true }); if (used) db.logQuota('2026-10-27', used, 'x'); db.close();
  const sv = await startAppServer({ dataDir: d, appDir: join(t, 'none'), fetch, now: NOW });
  return { sv, a: { token: sv.token, origin: sv.origin, server: sv }, done: async () => { await sv.close(); await rm(t, { recursive: true, force: true }); } };
};
const waitMonitor = async sv => { for (let i = 0; i < 40; i++) { if (JSON.parse((await get('/api/monitor', {}, sv)).body).lastAt) return; await new Promise(r => setTimeout(r, 50)); } assert.fail('job do monitor não terminou'); };
test('watch toggles and channel detail shows it', async () => {
  const r = JSON.parse((await post(`/api/channels/${C1}/watch`, { monitor: true }, ok)).body); assert.equal(r.monitor, true); assert.equal(r.competitor, false);
  assert.equal(JSON.parse((await get(`/api/channels/${C1}`)).body).watch.monitor, true);
  for (const b of [{ monitor: 'sim' }, { competitor: null }, { monitor: 1 }]) assert.equal((await post(`/api/channels/${C1}/watch`, b, ok)).status, 400, JSON.stringify(b));
  const nf = await post('/api/channels/UCnope000000000000000000/watch', { monitor: true }, ok); assert.equal(nf.status, 404); assert.deepEqual(JSON.parse(nf.body), { error: 'Canal não encontrado' });
  assert.equal((await post('/api/channels/UCbad/watch', { monitor: true }, ok)).status, 400);
  const c = JSON.parse((await post(`/api/channels/${C1}/watch`, { competitor: true }, ok)).body); assert.deepEqual([c.monitor, c.competitor], [true, true]); // omitido não muda
});
test('monitor run streams end and alerts endpoint answers', async () => {
  const st = JSON.parse((await get('/api/monitor')).body); assert.deepEqual(st.channels.map(c => c.id), [C1]); assert.equal(st.estimate, 3); assert.equal(st.auto, true);
  for (let i = 0; i < 2; i++) { // a 1ª é linha de base; a 2ª acha o outlier vidfixture1
    const { jobId, estimate } = JSON.parse((await post('/api/monitor/run', {}, ok)).body); assert.equal(estimate, 3);
    assert.equal((await readSse(`/api/jobs/${jobId}/events`)).at(-1).data.status, 'done');
  }
  const m = JSON.parse((await get('/api/monitor')).body); assert.equal(Date.parse(m.nextAt) - Date.parse(m.lastAt), 864e5); assert.equal(m.channels[0].lastRun, '2026-10-27T12:00:00.000Z');
  const h = JSON.parse((await get('/api/history')).body).entries.find(e => e.kind === 'monitor'); assert.deepEqual([h.payload.count, h.payload.auto, h.payload.status], [1, false, 'done']);
  const a = JSON.parse((await get('/api/alerts')).body); assert.equal(typeof a.unseen, 'number'); assert.ok(a.unseen >= 1);
  const o = a.alerts.find(x => x.kind === 'outlier'); assert.equal(o.payload.title, 'Sleep facts one'); assert.equal(o.channelTitle, 'Fixture One');  assert.equal(o.videoId, 'vidfixture1');
  assert.equal(JSON.parse((await post('/api/alerts/seen', { ids: [o.id] }, ok)).body).unseen, a.unseen - 1);
  assert.equal(JSON.parse((await post('/api/alerts/seen', { all: true }, ok)).body).unseen, 0);
  for (const b of [{}, { all: false }, { ids: '1' }, { ids: [1.5] }, { ids: ['1'] }, { ids: [null] }]) assert.equal((await post('/api/alerts/seen', b, ok)).status, 400, JSON.stringify(b));
  for (const l of ['0', '201', 'abc', '1.5']) assert.equal((await get('/api/alerts?limit=' + l)).status, 400, l);
  assert.equal(JSON.parse((await get('/api/alerts?limit=1')).body).alerts.length, 1);
});
test('competitors lists marked channels and their recent videos, newest first', async () => {
  const r = JSON.parse((await get('/api/competitors')).body); assert.deepEqual(r.rows.map(x => x.id), [C1]);
  assert.deepEqual(r.videos.map(v => v.id), ['vidfixture3', 'vidfixture2', 'vidfixture1']);
});
test('monitor run without followed channels is 400', async () => {
  const t = await mkdtemp(join(tmpdir(), 'app-none-')), sv = await startAppServer({ dataDir: join(t, 'd'), appDir: join(t, 'none'), fetch: fakeFetch, now: NOW });
  try {
    const r = await post('/api/monitor/run', {}, { token: sv.token, origin: sv.origin, server: sv }); assert.equal(r.status, 400); assert.deepEqual(JSON.parse(r.body), { error: 'Nenhum canal seguido' });
    assert.equal(await sv.tick(), 'none');
    const m = JSON.parse((await get('/api/monitor', {}, sv)).body); assert.deepEqual([m.channels, m.lastAt, m.nextAt, m.estimate], [[], null, null, 0]);
  } finally { await sv.close(); await rm(t, { recursive: true, force: true }); }
});
test('tick: runs once, then recent; quota skip is logged once', async () => {
  assert.equal(await s.tick(), 'recent'); // já rodou à mão
  const w = await watched(0);
  try {
    assert.equal(await w.sv.tick(), 'run'); await waitMonitor(w.sv); assert.equal(await w.sv.tick(), 'recent');
    const h = JSON.parse((await get('/api/history', {}, w.sv)).body).entries.filter(e => e.kind === 'monitor');
    assert.equal(h.length, 1); assert.deepEqual([h[0].payload.count, h[0].payload.auto, h[0].payload.status], [1, true, 'done']);
  } finally { await w.done(); }
  let n = 0; const q = await watched(9999, async (...x) => { n++; return fakeFetch(...x); });
  try {
    assert.equal(await q.sv.tick(), 'quota'); assert.equal(await q.sv.tick(), 'recent'); // o skip conta como última entrada
    const [e] = JSON.parse((await get('/api/history', {}, q.sv)).body).entries; assert.deepEqual(e.payload, { status: 'skipped', reason: 'quota', auto: true, estimate: 3, remaining: 1 });
    // manual com cota insuficiente: o job falha antes de qualquer fetch
    const { jobId } = JSON.parse((await post('/api/monitor/run', {}, q.a)).body);
    assert.equal((await readSse(`/api/jobs/${jobId}/events`, q.sv)).at(-1).data.error, 'Cota insuficiente: monitorar 1 canais custa ~3 unidades, restam 1');
    assert.equal(n, 0);
    await post('/api/config', { monitorAuto: false }, q.a); assert.equal(await q.sv.tick(), 'off');
  } finally { await q.done(); }
});
test('failed monitor run does not block auto; skipped counts but is not lastAt', async () => {
  const q = await watched(9999);
  try {
    const { jobId } = JSON.parse((await post('/api/monitor/run', {}, q.a)).body); // sem cota: job termina em erro
    assert.equal((await readSse(`/api/jobs/${jobId}/events`, q.sv)).at(-1).data.status, 'error');
    assert.equal(await q.sv.tick(), 'quota'); // erro não conta como recente
    const m = JSON.parse((await get('/api/monitor', {}, q.sv)).body); assert.equal(m.lastAt, null); assert.ok(m.nextAt); // skip dá o próximo, não a última
    assert.equal(await q.sv.tick(), 'recent');
  } finally { await q.done(); }
});
test('monitor run refuses while one is queued or running', async () => {
  const w = await watched(0, () => new Promise(() => {}));
  try {
    assert.equal((await post('/api/monitor/run', {}, w.a)).status, 200);
    const r = await post('/api/monitor/run', {}, w.a); assert.equal(r.status, 409); assert.deepEqual(JSON.parse(r.body), { error: 'Monitoramento já em andamento' });
  } finally { await w.done(); }
});
test('niches routes', async () => {
  const n = JSON.parse((await get('/api/niches')).body); assert.ok(Array.isArray(n.niches)); assert.ok(n.niches.some(x => x.id === 'tag:curiosidades'));
  for (const id of ['<x>', 'tag:', 'c:UCbad', 'tag:' + 'x'.repeat(61), '', 'solo2']) assert.equal((await get('/api/niches/detail?id=' + encodeURIComponent(id))).status, 400, id);
  assert.equal((await get('/api/niches/detail')).status, 400);
  assert.equal((await get('/api/niches/detail?id=c:UCnope000000000000000000')).status, 404);
  assert.equal((await get('/api/niches/detail?id=tag:nada')).status, 404);
  const d = JSON.parse((await get('/api/niches/detail?id=' + encodeURIComponent('tag:curiosidades'))).body);
  assert.equal(d.niche.id, 'tag:curiosidades'); assert.deepEqual(d.rows.map(r => r.id), [C1]); assert.deepEqual(d.outliers.map(v => v.id), ['vidfixture1']);
  assert.equal(JSON.parse((await post('/api/niches/subniches', { id: 'tag:curiosidades' }, ok)).body).subnichos[0].nome, 'n');
  subFail = true;
  try { const e = JSON.parse((await post('/api/niches/subniches', { id: 'tag:curiosidades' }, ok)).body); assert.equal(e.error, 'claude terminou com código 1'); assert.ok(e.prompt.includes('Sleep facts one')); } finally { subFail = false; }
  const solo = await post('/api/niches/subniches', { id: 'solo' }, ok); assert.equal(solo.status, 400); assert.deepEqual(JSON.parse(solo.body), { error: 'Nicho sem outliers recentes' });
  assert.equal((await post('/api/niches/tag', { id: 'tag:curiosidades', tag: 'x' }, ok)).status, 400); // só grupo automático
  assert.equal((await post('/api/niches/subniches', { id: 5 }, ok)).status, 400);
});
test('niches on empty and tiny bases; tagging an automatic group keeps faceless', async () => {
  const t = await mkdtemp(join(tmpdir(), 'app-niche-')), d = join(t, 'd'), sv = await startAppServer({ dataDir: d, appDir: join(t, 'none'), fetch: fakeFetch, now: NOW }), a = { token: sv.token, origin: sv.origin, server: sv };
  const A = 'UC' + 'a'.repeat(22), B = 'UC' + 'b'.repeat(22), X = 'UC' + 'x'.repeat(22), EVIL = '<img src=x onerror=alert(1)>';
  try {
    assert.deepEqual(JSON.parse((await get('/api/niches', {}, sv)).body), { niches: [], total: 0 });
    let db = openDb(join(d, 'app.db')); db.upsertChannel({ id: X, title: 'Vazio' }); db.close(); // canal sem títulos nem tópicos
    const one = JSON.parse((await get('/api/niches', {}, sv)).body); assert.deepEqual(one.niches.map(x => [x.id, x.count, x.outliers, x.topWords]), [['solo', 1, 0, []]]); assert.ok(Number.isFinite(one.niches[0].avgScore));
    db = openDb(join(d, 'app.db'));
    for (const id of [A, B]) {
      db.upsertChannel({ id, title: 'Roma ' + id.at(-1), topics: ['https://en.wikipedia.org/wiki/History'] });
      for (const k of [1, 2]) db.upsertVideo({ id: id.slice(2, 12) + k, channelId: id, title: `Roman empire legions story ${k}`, publishedAt: '2026-10-01T00:00:00Z' });
    }
    db.setChannelTag(A, { tag: null, faceless: true }); db.setChannelTag(X, { tag: EVIL, faceless: null }); db.close();
    const r = await get('/api/niches', {}, sv); assert.match(r.headers['content-type'], /application\/json/);
    const ns = JSON.parse(r.body).niches; assert.equal(ns.find(x => x.id === 'tag:' + EVIL).name, EVIL);
    const auto = ns.find(x => x.source === 'automático'); assert.equal(auto.id, 'c:' + A);
    assert.equal((await get('/api/niches/detail?id=' + encodeURIComponent('tag:' + EVIL), {}, sv)).status, 200);
    for (const tag of ['', '  ', 'x'.repeat(41), 5]) assert.equal((await post('/api/niches/tag', { id: auto.id, tag }, a)).status, 400, String(tag));
    assert.deepEqual(JSON.parse((await post('/api/niches/tag', { id: auto.id, tag: ' Roma ' }, a)).body), { tagged: 2 });
    const ca = JSON.parse((await get(`/api/channels/${A}`, {}, sv)).body); assert.deepEqual([ca.tag, ca.faceless], ['Roma', true]);
    assert.equal(JSON.parse((await get(`/api/channels/${B}`, {}, sv)).body).faceless, null);
    assert.equal((await post('/api/niches/tag', { id: auto.id, tag: 'y' }, a)).status, 404); // o grupo virou tag:roma
  } finally { await sv.close(); await rm(t, { recursive: true, force: true }); }
});
test('config accepts new fields and rejects bad ones', async () => {
  const r = JSON.parse((await post('/api/config', { subsJumpPct: 15, nicheMin: 30, monitorAuto: false }, ok)).body); assert.deepEqual([r.subsJumpPct, r.nicheMin, r.monitorAuto], [15, 30, false]);
  for (const b of [{ monitorAuto: 'yes' }, { monitorAuto: null }, { subsJumpPct: 0.5 }, { subsJumpPct: 1001 }, { subsJumpPct: '10' }, { nicheMin: 2.5 }, { nicheMin: 0 }, { nicheMin: 101 }]) assert.equal((await post('/api/config', b, ok)).status, 400, JSON.stringify(b));
  await post('/api/config', { subsJumpPct: 10, nicheMin: 25, monitorAuto: true }, ok);
});
// Fase 4: modelagem, meus canais e vozes (antes do config corrompido).
const CH = C1;
test('model prepare: anchor, groups, similar and saved models', async () => {
  const p = JSON.parse((await get('/api/model/prepare?anchor=' + CH)).body);
  assert.equal(p.anchor.id, CH); assert.ok(!('snapshots' in p.anchor)); assert.ok(p.groups.length >= 1); assert.ok(Array.isArray(p.similar) && p.similar.length <= 8); assert.ok(Array.isArray(p.models));
  assert.equal((await get('/api/model/prepare?anchor=UCbad')).status, 400); assert.equal((await get('/api/model/prepare')).status, 400);
  assert.equal((await get('/api/model/prepare?anchor=UCnope000000000000000000')).status, 404);
});
test('model job: thumbs, claude, validation, saved with app views', async () => {
  const { jobId } = JSON.parse((await post('/api/model', { anchor: CH }, ok)).body);
  const ev = await readSse(`/api/jobs/${jobId}/events`), end = ev.at(-1).data; assert.equal(end.status, 'done');
  assert.ok(ev.some(e => e.event === 'progress' && e.data.message === 'Gravando')); // o SSE dá o progresso atual e os seguintes
  assert.ok(thumbCalls.length >= 1 && thumbCalls.every(u => /^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/mqdefault\.jpg$/.test(u))); assert.ok(modelImages.at(-1) >= 1);
  const m = JSON.parse((await get('/api/models/' + end.result.modelId)).body);
  assert.equal(m.output.conceitos.length, 3); assert.equal(m.views.length, 3); assert.ok(m.views.every(Number.isFinite));
  assert.equal(m.anchor.id, CH); assert.equal(m.input.semImagens, false); assert.ok(m.input.prompt.includes('DADOS')); assert.equal(typeof m.videos[m.output.conceitos[0].videoIds[0]].views, 'number');
  assert.equal(JSON.parse((await get(`/api/models/${end.result.modelId}/profile/1`)).body).modelId, end.result.modelId);
  assert.equal((await get(`/api/models/${end.result.modelId}/profile/3`)).status, 400); assert.equal((await get('/api/models/abc')).status, 400); assert.equal((await get('/api/models/999999')).status, 404);
  assert.deepEqual(JSON.parse((await get('/api/model/prepare?anchor=' + CH)).body).models.map(x => x.id), [end.result.modelId]);
});
test('model errors are readable and prompt is copyable', async () => {
  const seen = [], s3 = await startAppServer({ ...opts, outDir: join(temp, 'secret.js'), modeler: async (p, images) => { seen.push(images.length); return { resumo: 'r', conceitos: [] }; } }); // outDir num arquivo: thumbs falham
  try {
    const { jobId } = JSON.parse((await post('/api/model', { anchor: CH }, { token: s3.token, origin: s3.origin, server: s3 })).body);
    assert.deepEqual((await readSse(`/api/jobs/${jobId}/events`, s3)).at(-1).data, { status: 'error', error: 'Resposta do Claude fora do formato' });
    assert.deepEqual(seen, [0]); // sem imagens, o job segue até o Claude
  } finally { await s3.close(); }
  assert.equal((await post('/api/model', { anchor: 'UCnope000000000000000000' }, ok)).status, 404);
  assert.equal((await post('/api/model', { anchor: 'UCbad' }, ok)).status, 400);
  assert.equal((await post('/api/model', { anchor: CH, extras: Array(5).fill(CH) }, ok)).status, 400);
  assert.equal((await post('/api/model', { anchor: CH, extras: ['x'] }, ok)).status, 400);
  const A = 'UC' + 'a'.repeat(22), db = openDb(join(dataDir, 'app.db')); db.upsertChannel({ id: A, title: 'Sem vídeos' }); db.close();
  const empty = await post('/api/model', { anchor: A }, ok); assert.equal(empty.status, 400); assert.deepEqual(JSON.parse(empty.body), { error: 'Âncora sem vídeos' });
  assert.match((await get('/api/model/prompt?anchor=' + CH)).body, /DADOS/);
  assert.match((await get(`/api/model/prompt?anchor=${CH}&extras=${A}`)).body, /Sem vídeos/);
});
test('my channels CRUD with validation and competitors filter', async () => {
  const p = { name: 'Roma à Noite', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex' };
  const c = JSON.parse((await post('/api/mychannels', p, ok)).body); assert.equal(c.targetMin, 30); assert.deepEqual(c.titleTemplates, []); assert.deepEqual(c.competitors, []);
  assert.equal((await post('/api/mychannels', { ...p, name: 'roma à noite' }, ok)).status, 409);
  assert.equal((await post('/api/mychannels', { ...p, style: 'pixel' }, ok)).status, 400);
  for (const b of [{ ...p, name: 'x', lang: 'es' }, { ...p, name: 'x', voice: 'kokoro:af_heart' }, { ...p, name: 'x', targetMin: 5 }, { ...p, name: 'x', modelId: 999999 }, { lang: 'pt' }]) assert.equal((await post('/api/mychannels', b, ok)).status, 400, JSON.stringify(b));
  assert.equal((await post(`/api/mychannels/${c.id}/competitors`, { ids: [CH] }, ok)).status, 200);
  assert.deepEqual(JSON.parse((await get('/api/competitors?my=' + c.id)).body).rows.map(r => r.id), [CH]);
  assert.deepEqual(JSON.parse((await get(`/api/mychannels/${c.id}`)).body).competitors.map(r => r.id), [CH]);
  const bad = await post(`/api/mychannels/${c.id}/competitors`, { ids: ['UCnope000000000000000000'] }, ok); assert.equal(bad.status, 400); assert.deepEqual(JSON.parse(bad.body), { error: 'Canal fora da base: UCnope000000000000000000' });
  for (const b of [{ ids: 'x' }, { ids: ['UCbad'] }, { ids: Array(51).fill(CH) }]) assert.equal((await post(`/api/mychannels/${c.id}/competitors`, b, ok)).status, 400, JSON.stringify(b));
  const d = JSON.parse((await post('/api/mychannels', { ...p, name: 'Grécia' }, ok)).body);
  assert.equal((await post(`/api/mychannels/${d.id}`, { ...p, name: 'ROMA à NOITE' }, ok)).status, 409);
  const up = JSON.parse((await post(`/api/mychannels/${c.id}`, { ...p, targetMin: 45, titleTemplates: ['O fim de [x]'] }, ok)).body); assert.equal(up.targetMin, 45); assert.deepEqual(up.titleTemplates, ['O fim de [x]']);
  assert.deepEqual(JSON.parse((await get('/api/mychannels')).body).map(x => x.name), ['Grécia', 'Roma à Noite']);
  assert.equal((await post(`/api/mychannels/${d.id}/delete`, {}, ok)).status, 200); assert.equal((await get(`/api/mychannels/${d.id}`)).status, 404);
  assert.equal((await get('/api/mychannels/abc')).status, 400); assert.equal((await post('/api/mychannels/999999', p, ok)).status, 404);
  assert.equal((await get('/api/competitors?my=999999')).status, 404); assert.equal((await get('/api/competitors?my=x')).status, 400);
  assert.deepEqual(JSON.parse((await get('/api/competitors')).body).rows.map(r => r.id), [CH]); // sem my: todos
});
test('voice sample saves wpm and serves wav', async () => {
  const r = JSON.parse((await post('/api/voices/sample', { voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, ok)).body);
  assert.ok(r.wpm > 0); assert.equal(r.seconds, 20); assert.match(r.url, /^\/api\/samples\/[0-9a-f]{40}\.wav$/);
  const v = JSON.parse((await get('/api/voices')).body); assert.equal(v.wpm['kokoro:pm_alex|1'], r.wpm); assert.deepEqual(v.voices.pt, ['pm_alex', 'pf_dora', 'pm_santa']);
  const w = await get(r.url); assert.equal(w.status, 200); assert.match(w.headers['content-type'], /audio\/wav/); assert.equal(w.headers['x-content-type-options'], 'nosniff'); assert.equal(w.headers['cache-control'], 'no-store');
  assert.equal((await get('/api/samples/../../data/config.json')).status, 403); assert.equal((await get('/api/samples/abc.wav')).status, 400);
  assert.equal((await get('/api/samples/' + '0'.repeat(40) + '.wav')).status, 404);
  assert.equal((await post('/api/voices/sample', { voice: 'kokoro:af_heart', speed: 1, lang: 'pt' }, ok)).status, 400);
  for (const b of [{ voice: 'pm_alex', speed: 1, lang: 'pt' }, { voice: 'kokoro:pm_alex', speed: 2, lang: 'pt' }, { voice: 'kokoro:pm_alex', speed: '1', lang: 'pt' }, { voice: 'kokoro:pm_alex', speed: 1, lang: 'es' }]) assert.equal((await post('/api/voices/sample', b, ok)).status, 400, JSON.stringify(b));
  assert.ok(!(await get('/api/voices')).body.includes('AIza'));
  const s4 = await startAppServer({ ...opts, voiceExists: () => false });
  try {
    const m = await post('/api/voices/sample', { voice: 'kokoro:pm_alex', speed: 1.1, lang: 'pt' }, { token: s4.token, origin: s4.origin, server: s4 });
    assert.equal(m.status, 200); assert.deepEqual(JSON.parse(m.body), { error: 'Kokoro não instalado: veja docs/VOICE.md' });
  } finally { await s4.close(); }
});
test('corrupted config.json falls back to defaults', async () => {
  await writeFile(join(dataDir, 'config.json'), '{oops');
  const r = await get('/api/config'); assert.equal(r.status, 200); assert.deepEqual(JSON.parse(r.body).weights, DEFAULTS.weights);
});
