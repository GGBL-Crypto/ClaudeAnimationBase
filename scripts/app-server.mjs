// Servidor local do webapp: estáticos de app/ e API JSON. Só 127.0.0.1, Host exato, POST com Origin + X-App-Token.
import { createServer } from 'node:http';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { DEFAULTS, loadConfig, saveConfig, publicConfig } from './app/config.mjs';
import { PRESETS, runPreset, sortRows, parseFilters } from './app/filters.mjs';
import { openDb } from './app/db.mjs';
import { createYouTube, quotaDay, estimateMine } from './app/youtube.mjs';
import { mineKeyword, importChannels, refreshChannel } from './app/mine.mjs';
import { createJobs, sseWrite } from './app/jobs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 64 * 1024, ID = /^UC[A-Za-z0-9_-]{22}$/;
const CSP = "default-src 'self'; img-src 'self' https://i.ytimg.com https://yt3.ggpht.com; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'";
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
const BASE = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
const within = (root, file) => { const rel = relative(root, file); return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel); };
const fail = (status, message) => Object.assign(new Error(message), { status });
export const errorStatus = e => (Number.isInteger(e?.status) && e.status >= 400 && e.status <= 599 ? e.status : 500);
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const fin = x => typeof x === 'number' && Number.isFinite(x);

// Corpo JSON até 64 KB; acima disso para de acumular e responde 413.
const readJson = req => new Promise((ok, bad) => {
  if (+req.headers['content-length'] > LIMIT) return bad(fail(413, 'Corpo grande demais'));
  const parts = []; let size = 0;
  req.on('data', b => { size += b.length; if (size <= LIMIT) return void parts.push(b); req.removeAllListeners('data'); req.resume(); bad(fail(413, 'Corpo grande demais')); });
  req.on('error', bad);
  req.on('end', () => { try { const b = JSON.parse(Buffer.concat(parts).toString('utf8')); isObj(b) ? ok(b) : bad(fail(400, 'Corpo inválido')); } catch { bad(fail(400, 'JSON inválido')); } });
});

// Só apiKey, cacheHours, weights e rpm; pesos parciais caem sobre os atuais (que já têm os padrões).
function configPatch(b, cur) {
  const p = {}, no = m => { throw fail(400, m); };
  if (b.apiKey !== undefined) { if (typeof b.apiKey !== 'string' || !/^[A-Za-z0-9_-]{0,100}$/.test(b.apiKey)) no('Chave inválida'); p.apiKey = b.apiKey; }
  if (b.cacheHours !== undefined) { if (!fin(b.cacheHours) || b.cacheHours <= 0) no('Validade do cache inválida'); p.cacheHours = b.cacheHours; }
  if (b.weights !== undefined) {
    if (!isObj(b.weights) || Object.entries(b.weights).some(([k, v]) => !Object.hasOwn(DEFAULTS.weights, k) || !fin(v) || v < 0)) no('Pesos inválidos');
    p.weights = { ...DEFAULTS.weights, ...cur.weights, ...b.weights };
  }
  if (b.rpm !== undefined) { if (!isObj(b.rpm) || Object.values(b.rpm).some(r => !Array.isArray(r) || r.length !== 2 || !r.every(x => fin(x) && x >= 0) || r[0] > r[1])) no('Tabela RPM inválida'); p.rpm = b.rpm; }
  return p;
}

export async function startAppServer({ port = 0, dataDir = 'data', appDir = 'app', fetch, now = Date.now } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Porta inválida');
  dataDir = resolve(ROOT, dataDir); appDir = resolve(ROOT, appDir);
  const token = randomBytes(24).toString('hex'), tokenBuf = Buffer.from(token);
  const db = openDb(join(dataDir, 'app.db')), jobs = createJobs(db);
  const cfg = () => loadConfig(dataDir);
  const at = () => new Date(now()).toISOString();
  // Chave lida a cada job: uma chave nova vale sem reiniciar.
  const job = (kind, fn, fresh = false) => jobs.start(kind, report => { const c = cfg(); return fn(createYouTube({ key: c.apiKey, db, cfg: c, fetch, now, fresh }), report, at()); });
  const chId = m => { if (!ID.test(m[1])) throw fail(400, 'Canal inválido'); return m[1]; };
  const channel = id => db.channel(id, now(), cfg()) ?? (() => { throw fail(404, 'Canal não encontrado'); })();

  const ROUTES = [
    ['GET', /^\/api\/config$/, () => publicConfig(cfg())],
    ['POST', /^\/api\/config$/, async (m, req) => publicConfig(saveConfig(dataDir, configPatch(await readJson(req), cfg())))],
    ['GET', /^\/api\/quota$/, () => { const day = quotaDay(now()); return { day, used: db.quotaUsed(day), limit: cfg().quotaLimit }; }],
    ['POST', /^\/api\/mine$/, async (m, req) => {
      const { q } = await readJson(req);
      if (typeof q !== 'string' || !q.trim()) throw fail(400, 'Informe o que buscar');
      return { jobId: job('mine', (yt, report, t) => mineKeyword(yt, db, q.trim(), report, t)), estimate: estimateMine() };
    }],
    ['POST', /^\/api\/import$/, async (m, req) => {
      const { text } = await readJson(req);
      if (typeof text !== 'string' || !text.trim()) throw fail(400, 'Cole ao menos um canal');
      return { jobId: job('import', (yt, report, t) => importChannels(yt, db, text, report, t)) };
    }],
    ['GET', /^\/api\/jobs\/([\w-]+)\/events$/, (m, req, res) => {
      if (!jobs.get(m[1])) throw fail(404, 'Job não encontrado');
      res.writeHead(200, { ...BASE, 'Content-Type': 'text/event-stream; charset=utf-8' });
      const off = jobs.subscribe(m[1], (ev, data) => { sseWrite(res, ev, data); if (ev === 'end') res.end(); });
      res.on('close', off);
    }],
    ['GET', /^\/api\/channels$/, (m, req, res, u) => {
      const sp = u.searchParams, preset = sp.get('preset') || 'tudo';
      if (!Object.hasOwn(PRESETS, preset)) throw fail(400, 'Recorte desconhecido');
      let rows = runPreset(db.channelRows(now(), cfg()), preset, parseFilters(sp));
      if (sp.get('sort')) rows = sortRows(rows, sp.get('sort'), sp.get('dir') === 'asc' ? 'asc' : 'desc');
      return { rows, total: rows.length }; // ponytail: sem paginação, todas as linhas; paginar se a base passar de alguns milhares
    }],
    ['GET', /^\/api\/channels\/([^/]+)$/, m => channel(chId(m))],
    ['GET', /^\/api\/channels\/([^/]+)\/videos$/, m => db.videoRows(chId(m), now())],
    ['POST', /^\/api\/channels\/([^/]+)\/refresh$/, m => { const id = chId(m); return { jobId: job('refresh', (yt, report, t) => refreshChannel(yt, db, id, report, t), true) }; }],
    ['POST', /^\/api\/channels\/([^/]+)\/tag$/, async (m, req) => {
      const id = chId(m), { tag = null, faceless = null } = await readJson(req);
      if (tag !== null && (typeof tag !== 'string' || tag.length > 60) || faceless !== null && typeof faceless !== 'boolean') throw fail(400, 'Etiqueta inválida');
      channel(id); db.setChannelTag(id, { tag: tag?.trim() || null, faceless });
      return channel(id);
    }],
  ];

  // Inventário fixo de app/ na partida (como walk no estúdio); arquivo novo pede reinício.
  const statics = new Map();
  async function walk(dir) {
    for (const e of await readdir(join(appDir, dir), { withFileTypes: true })) {
      const name = dir ? dir + '/' + e.name : e.name;
      if (e.isDirectory()) await walk(name);
      else if (/\.(html|css|js)$/.test(name)) statics.set('/' + name, join(appDir, name));
    }
  }
  await walk('').catch(e => { if (e.code !== 'ENOENT') throw e; });
  if (statics.has('/index.html')) statics.set('/', statics.get('/index.html'));
  const appRoot = await realpath(appDir).catch(() => appDir);

  const json = (res, status, data, extra) => { const b = JSON.stringify(data); res.writeHead(status, { ...BASE, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(b), ...extra }); res.end(b); };
  const tokenOk = t => { const b = Buffer.from(String(t ?? '')); return b.length === tokenBuf.length && timingSafeEqual(b, tokenBuf); };
  let authority, origin;
  const server = createServer(async (req, res) => {
    try {
      if (req.headers.host !== authority) throw fail(403, 'Host não permitido');
      if (!['GET', 'HEAD', 'POST'].includes(req.method)) throw fail(405, 'Método não permitido');
      const raw = (req.url || '').split('?')[0];
      // Mesma regra do estúdio: sem % (nada codificado), sem segmentos vazios, . ou ..
      if (raw !== '/' && (!/^\/[A-Za-z0-9_./-]+$/.test(raw) || raw.split('/').slice(1).some(p => !p || p === '.' || p === '..'))) throw fail(403, 'Caminho inválido');
      if (req.method === 'POST' && (req.headers.origin !== origin || !tokenOk(req.headers['x-app-token']))) throw fail(403, 'Origem ou token inválido');
      const method = req.method === 'HEAD' ? 'GET' : req.method;
      if (raw.startsWith('/api/')) {
        for (const [mt, re, fn] of ROUTES) {
          const m = mt === method && re.exec(raw);
          if (!m) continue;
          const out = await fn(m, req, res, new URL(req.url, origin));
          if (out !== undefined) json(res, 200, out);
          return;
        }
        throw ROUTES.some(r => r[1].test(raw)) ? fail(405, 'Método não permitido') : fail(404, 'Rota não encontrada');
      }
      const file = statics.get(raw);
      if (!file) throw fail(404, 'Recurso indisponível');
      if (method !== 'GET') throw fail(405, 'Método não permitido');
      const actual = await realpath(file);
      if (!within(appRoot, actual)) throw fail(403, 'Caminho inválido');
      const ext = actual.split('.').pop(), head = { ...BASE, 'Content-Type': MIME[ext] };
      let bytes = await readFile(actual);
      if (raw === '/' || raw === '/index.html') { bytes = Buffer.from(bytes.toString('utf8').replaceAll('%APP_TOKEN%', token)); head['Content-Security-Policy'] = CSP; }
      res.writeHead(200, { ...head, 'Content-Length': bytes.length }); res.end(bytes);
    } catch (e) {
      if (res.headersSent) return void res.destroy();
      // Só a mensagem dos erros previstos; o resto vira genérico (sem stack, caminho ou URL).
      const status = errorStatus(e);
      json(res, status, { error: e.status === status ? e.message : 'Erro interno' }, status === 413 ? { Connection: 'close' } : undefined);
    }
  });
  await new Promise((ok, bad) => { server.once('error', bad); server.listen(port, '127.0.0.1', ok); });
  authority = '127.0.0.1:' + server.address().port; origin = 'http://' + authority;
  return {
    origin, token, address: server.address(),
    close: () => new Promise((ok, bad) => { server.close(e => { try { db.close(); } catch {} e ? bad(e) : ok(); }); server.closeAllConnections(); }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const arg = process.argv.slice(2);
  if (arg.length > 1 || arg[0] && !/^--port=\d+$/.test(arg[0])) throw new Error('Uso: node scripts/app-server.mjs [--port=8090]');
  const app = await startAppServer({ port: arg[0] ? Number(arg[0].split('=')[1]) : 8090 });
  console.log('App: ' + app.origin + '/');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
