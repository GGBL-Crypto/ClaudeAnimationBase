import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { suggestThemes } from '../scripts/app/pauta.mjs';
import { startAppServer } from '../scripts/app-server.mjs';

const DAY = 864e5, NOW = Date.parse('2026-10-30T12:00:00Z');
const ago = d => new Date(NOW - d * DAY).toISOString();
const row = (id, multiple, days, over = {}) => ({ id, title: 'Título ' + id, multiple, publishedAt: ago(days), views: 1000 * multiple, capturedAt: '2026-10-29T10:00:00Z', ...over });
const model = { output: { conceitos: [{ plano30: [{ dia: 1, tema: 'Tema A' }, { dia: 5, tema: 'Tema B' }] }, { plano30: [{ dia: 2, tema: 'Outro' }] }] } };

test('suggestThemes mixes outliers and plano30 with collected numbers', () => {
  const rows = [row('a', 5, 10), row('b', 2, 89), row('velho', 9, 91), row('baixo', 1.9, 3), row('semMult', null, 3), row('c', 8, 1)];
  const r = suggestThemes({ my: { conceptIndex: 0 }, competitorRows: rows, model, cfg: { outlierMin: 2 }, now: NOW });
  assert.deepEqual(r.map(x => [x.tema, x.origem]), [['Título c', 'outlier'], ['Título a', 'outlier'], ['Título b', 'outlier'], ['Tema A', 'plano30'], ['Tema B', 'plano30']]);
  assert.deepEqual(r[0].ref, { videoId: 'c', views: 8000, capturedAt: '2026-10-29T10:00:00Z', multiple: 8 });
  assert.deepEqual(r[3].ref, { dia: 1 });
  // sem modelagem ou sem conceito: só os outliers; no máximo 15
  assert.deepEqual(suggestThemes({ my: { conceptIndex: null }, competitorRows: rows, model: null, cfg: { outlierMin: 2 }, now: NOW }).map(x => x.origem), ['outlier', 'outlier', 'outlier']);
  assert.equal(suggestThemes({ my: { conceptIndex: 9 }, competitorRows: rows, model, cfg: { outlierMin: 2 }, now: NOW }).filter(x => x.origem === 'plano30').length, 0);
  const many = Array.from({ length: 20 }, (_, i) => row('v' + i, 3 + i, 5));
  const top = suggestThemes({ my: {}, competitorRows: many, model: null, cfg: { outlierMin: 2 }, now: NOW });
  assert.equal(top.length, 15); assert.equal(top[0].ref.videoId, 'v19');
  assert.equal(suggestThemes({ my: {}, competitorRows: [row('t', 5, 1, { title: 'x'.repeat(300) })], model: null, cfg: { outlierMin: 2 }, now: NOW })[0].tema.length, 200);
});

let s, temp, outDir;
const send = (method, path, body) => new Promise((done, bad) => {
  const req = request(s.origin, { path, method, headers: { Host: new URL(s.origin).host, 'Content-Type': 'application/json', ...(method === 'POST' && { 'X-App-Token': s.token, Origin: s.origin }) } }, r => {
    let b = ''; r.setEncoding('utf8'); r.on('data', x => b += x); r.on('end', () => done({ status: r.statusCode, body: b ? JSON.parse(b) : null }));
  });
  req.on('error', bad); req.end(body && JSON.stringify(body));
});
before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'app-pauta-')); outDir = join(temp, 'out', 'app');
  s = await startAppServer({ dataDir: join(temp, 'data'), outDir, now: () => NOW });
});
after(async () => { await s.close(); await rm(temp, { recursive: true, force: true }); });

test('pauta validates theme length, target and tolerance ranges', async () => {
  const my = (await send('POST', '/api/mychannels', { name: 'Pauta', lang: 'pt', style: 'pixel', voice: 'kokoro:pm_alex', targetMin: 40, toleranceMin: 5 })).body.id;
  const p = (await send('POST', '/api/productions', { myId: my })).body, url = `/api/productions/${p.id}/pauta`;
  const g = (await send('GET', url)).body;
  assert.deepEqual([g.theme, g.targetMin, g.toleranceMin, g.style, g.lang], [null, 40, 5, 'pixel', 'pt']);
  assert.ok(Array.isArray(g.suggestions) && Array.isArray(g.styles) && g.styles.some(x => x.id === 'flat'));
  for (const b of [{}, { theme: 'ab' }, { theme: '  ' }, { theme: 'x'.repeat(201) }, { theme: 7 }, { theme: 'Roma', targetMin: 9 }, { theme: 'Roma', targetMin: 121 }, { theme: 'Roma', targetMin: 30.5 },
    { theme: 'Roma', toleranceMin: 0 }, { theme: 'Roma', toleranceMin: 16 }, { theme: 'Roma', style: 'stick' }]) {
    assert.equal((await send('POST', url, b)).status, 400, JSON.stringify(b));
  }
  assert.equal((await send('GET', '/api/productions/999999/pauta')).status, 404);
  assert.equal((await send('POST', '/api/productions/abc/pauta', { theme: 'Roma' })).status, 404);
  assert.equal((await send('GET', url)).body.theme, null, 'pauta inválida não grava');
  const r = await send('POST', url, { theme: '  Queda de Roma ', targetMin: 20, toleranceMin: 2, style: 'flat' });
  assert.equal(r.status, 200); assert.deepEqual([r.body.theme, r.body.targetMin, r.body.toleranceMin, r.body.style], ['Queda de Roma', 20, 2, 'flat']);
  assert.equal(r.body.steps.pauta.status, 'done');
  assert.deepEqual(JSON.parse(await readFile(join(outDir, 'prod', String(p.id), 'production.json'), 'utf8')), { theme: 'Queda de Roma', targetMin: 20, toleranceMin: 2, style: 'flat', lang: 'pt' });
  // sem os campos opcionais, mantém os valores da produção
  const k = await send('POST', url, { theme: 'Outro tema' });
  assert.deepEqual([k.body.targetMin, k.body.toleranceMin, k.body.style], [20, 2, 'flat']);
});
