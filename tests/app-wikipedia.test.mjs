import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { wikiSearch, wikiText, validateLink, UA } from '../scripts/app/wikipedia.mjs';
import { startAppServer } from '../scripts/app-server.mjs';

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/wikipedia/${n}.json`, import.meta.url), 'utf8'));
const NOW = Date.parse('2026-10-30T15:00:00Z');
const calls = [];
// Wikipedia falsa: grava URL e cabeçalhos; "Fora" e q=fora dão 503, "Nao existe" volta página ausente.
const fakeFetch = async (url, init = {}) => {
  calls.push({ url, headers: init.headers });
  const u = new URL(url), t = u.searchParams.get('titles');
  if (t === 'Fora' || u.searchParams.get('q') === 'fora') return { ok: false, status: 503, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => (u.pathname.endsWith('rest.php/v1/search/page') ? fx('search') : t === 'Nao existe' ? fx('missing') : fx('extract')) };
};

test('wikiSearch builds the REST url without personal data', async () => {
  calls.length = 0;
  const r = await wikiSearch('pt', 'Roma & César', { fetch: fakeFetch });
  assert.equal(calls[0].url, 'https://pt.wikipedia.org/w/rest.php/v1/search/page?q=Roma%20%26%20C%C3%A9sar&limit=10');
  assert.deepEqual(calls[0].headers, { 'User-Agent': UA });
  assert.equal(UA, 'ClaudeAnimationBase-app/1.0 (local; sem contato)');
  assert.deepEqual(r[0], { title: 'Roma Antiga', url: 'https://pt.wikipedia.org/wiki/Roma_Antiga', snippet: 'A Roma Antiga foi uma civilização & cidade-estado' });
  assert.equal(r[1].url, 'https://pt.wikipedia.org/wiki/Imp%C3%A9rio_Romano');
  await assert.rejects(wikiSearch('fr', 'x', { fetch: fakeFetch }), /Idioma/);
  await assert.rejects(wikiSearch('pt', 'fora', { fetch: fakeFetch }), /Wikipedia indisponível/);
  await assert.rejects(wikiSearch('pt', 'x', { fetch: async () => { throw new Error('ECONNREFUSED C:\\x'); } }), e => e.message === 'Wikipedia indisponível' && e.status === 502);
});
test('wikiText caps text at 20000 chars and sets accessed', async () => {
  calls.length = 0;
  const s = await wikiText('pt', 'Roma Antiga', { fetch: fakeFetch, now: () => NOW });
  assert.equal(calls[0].url, 'https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=Roma%20Antiga');
  assert.deepEqual(calls[0].headers, { 'User-Agent': UA });
  assert.deepEqual([s.url, s.title, s.accessed, s.kind], ['https://pt.wikipedia.org/wiki/Roma_Antiga', 'Roma Antiga', '2026-10-30', 'wikipedia']);
  assert.match(s.text, /^Roma Antiga foi/);
  const big = await wikiText('en', 'Roma Antiga', { fetch: async () => ({ ok: true, json: async () => ({ query: { pages: { 1: { title: 'Roma', extract: 'x'.repeat(30000) } } } }) }), now: () => NOW });
  assert.equal(big.text.length, 20000);
  await assert.rejects(wikiText('pt', 'Nao existe', { fetch: fakeFetch, now: () => NOW }), e => e.status === 404 && /não encontrada/.test(e.message));
  await assert.rejects(wikiText('pt', 'Fora', { fetch: fakeFetch, now: () => NOW }), /Wikipedia indisponível/);
});
test('wiki fetch has a timeout and follows the step signal', async () => {
  const got = [], f = async (url, init) => { got.push(init.signal); return { ok: true, json: async () => fx(url.includes('rest.php') ? 'search' : 'extract') }; };
  await wikiSearch('pt', 'Roma', { fetch: f });
  assert.ok(got[0] instanceof AbortSignal && !got[0].aborted); // sem signal da etapa: só o timeout de 30 s
  const ac = new AbortController();
  await wikiText('pt', 'Roma Antiga', { fetch: f, now: () => NOW, signal: ac.signal });
  ac.abort(); assert.equal(got[1].aborted, true);
});
test('accessed is the local date', () => {
  // 00:30 e 23:30 locais do mesmo dia: em qualquer fuso fora do UTC, uma das duas cai em outro dia UTC.
  for (const h of [0, 23]) {
    const t = new Date(2026, 9, 30, h, 30).getTime();
    assert.equal(validateLink({ url: 'https://x.org/', title: 't', excerpt: 'e' }, t).accessed, '2026-10-30');
  }
});
test('validateLink rejects non-https and long excerpts', () => {
  const ok = { url: 'https://exemplo.org/a?b=1', title: ' Título ', excerpt: ' trecho ' };
  assert.deepEqual(validateLink(ok, NOW), { url: 'https://exemplo.org/a?b=1', title: 'Título', accessed: '2026-10-30', text: 'trecho', kind: 'link' });
  for (const bad of [{ url: 'http://exemplo.org' }, { url: 'ftp://x.org' }, { url: 'javascript:alert(1)' }, { url: 'nao é url' }, { url: 'https://user:senha@x.org/' }, { url: 'https://x.org/' + 'a'.repeat(2000) },
    { title: '' }, { title: 'x'.repeat(201) }, { excerpt: '' }, { excerpt: 'x'.repeat(5001) }, { title: 7 }]) {
    assert.throws(() => validateLink({ ...ok, ...bad }, NOW), e => e.status === 400, JSON.stringify(bad).slice(0, 60));
  }
  assert.equal(validateLink({ ...ok, excerpt: 'x'.repeat(5000) }, NOW).text.length, 5000);
});

// Rotas: busca e gravação das fontes, com a Wikipedia falsa.
let s, temp, outDir;
const send = (method, path, body) => new Promise((done, bad) => {
  const req = request(s.origin, { path, method, headers: { Host: new URL(s.origin).host, 'Content-Type': 'application/json', ...(method === 'POST' && { 'X-App-Token': s.token, Origin: s.origin }) } }, r => {
    let b = ''; r.setEncoding('utf8'); r.on('data', x => b += x); r.on('end', () => done({ status: r.statusCode, body: b ? JSON.parse(b) : null }));
  });
  req.on('error', bad); req.end(body && JSON.stringify(body));
});
// Espera a produção ficar sem etapa ativa.
const idle = async id => { for (let i = 0; i < 200; i++) { const p = (await send('GET', '/api/productions/' + id)).body; if (!Object.keys(p.active).length) return p; await new Promise(r => setTimeout(r, 20)); } throw new Error('etapa não terminou'); };
before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'app-wiki-')); outDir = join(temp, 'out', 'app');
  s = await startAppServer({ dataDir: join(temp, 'data'), outDir, fetch: fakeFetch, now: () => NOW });
});
after(async () => { await s.close(); await rm(temp, { recursive: true, force: true }); });

test('wiki search route validates lang and q', async () => {
  const r = await send('GET', '/api/wiki/search?lang=pt&q=Roma');
  assert.equal(r.status, 200); assert.equal(r.body[0].title, 'Roma Antiga');
  for (const q of ['lang=fr&q=x', 'lang=pt', 'lang=pt&q=', 'lang=pt&q=' + 'x'.repeat(201)]) assert.equal((await send('GET', '/api/wiki/search?' + q)).status, 400, q);
  const down = await send('GET', '/api/wiki/search?lang=pt&q=fora');
  assert.deepEqual([down.status, down.body], [502, { error: 'Wikipedia indisponível' }]);
});
test('fontes needs 1 to 12 sources', async () => {
  const my = (await send('POST', '/api/mychannels', { name: 'Fontes', lang: 'pt', style: 'pixel', voice: 'kokoro:pm_alex', targetMin: 40, toleranceMin: 5 })).body.id;
  const p = (await send('POST', '/api/productions', { myId: my, theme: 'Roma antiga' })).body, url = `/api/productions/${p.id}/fontes`;
  const link = i => ({ kind: 'link', url: `https://exemplo.org/${i}`, title: 'T' + i, excerpt: 'trecho ' + i });
  for (const fontes of [undefined, [], Array.from({ length: 13 }, (_, i) => link(i)), [{ kind: 'x' }], [{ kind: 'link', url: 'http://x.org', title: 't', excerpt: 'e' }], [{ kind: 'wikipedia', title: '' }], ['x']]) {
    assert.equal((await send('POST', url, { fontes })).status, 400, JSON.stringify(fontes)?.slice(0, 50));
  }
  assert.equal((await send('POST', '/api/productions/999999/fontes', { fontes: [link(1)] })).status, 404);
  assert.equal((await send('POST', url, { fontes: Array.from({ length: 12 }, (_, i) => link(i)) })).status, 200); await idle(p.id);
  const r = await send('POST', url, { fontes: [{ kind: 'wikipedia', title: 'Roma Antiga' }, link(2)] });
  assert.equal(r.status, 200); assert.ok(r.body.jobId);
  const d = await idle(p.id), dir = join(outDir, 'prod', String(p.id));
  const saved = JSON.parse(await readFile(join(dir, 'sources.json'), 'utf8'));
  assert.deepEqual(saved.map(x => [x.kind, x.title, x.accessed]), [['wikipedia', 'Roma Antiga', '2026-10-30'], ['link', 'T2', '2026-10-30']]);
  assert.match(saved[0].text, /^Roma Antiga foi/);
  assert.equal(d.steps.fontes.status, 'done'); assert.deepEqual(d.steps.fontes.result.sources.map(x => x.title), ['Roma Antiga', 'T2']);
  assert.ok(!JSON.stringify(d.steps.fontes.result).includes('Roma Antiga foi'), 'o texto fica só no sources.json');
  // Wikipedia fora do ar: a etapa vira erro legível e não regrava.
  await send('POST', url, { fontes: [{ kind: 'wikipedia', title: 'Fora' }] });
  const bad = await idle(p.id);
  assert.deepEqual([bad.steps.fontes.status, bad.steps.fontes.error], ['error', 'Wikipedia indisponível']);
  assert.equal(JSON.parse(await readFile(join(dir, 'sources.json'), 'utf8')).length, 2);
});
