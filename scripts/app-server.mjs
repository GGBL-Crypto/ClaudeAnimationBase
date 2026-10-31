// Servidor local do webapp: estáticos de app/ e API JSON. Só 127.0.0.1, Host exato, POST com Origin + X-App-Token.
import { createServer } from 'node:http';
import { spawn as nodeSpawn } from 'node:child_process';
import { readFile, readdir, realpath, mkdir } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { DEFAULTS, loadConfig, saveConfig, publicConfig } from './app/config.mjs';
import { PRESETS, runPreset, sortRows, parseFilters, VIDEO_SORTS, applyVideoFilters, parseVideoFilters } from './app/filters.mjs';
import { openDb, FAV } from './app/db.mjs';
import { createYouTube, quotaDay, estimateMine, estimateMineVideos } from './app/youtube.mjs';
import { mineKeyword, mineVideos, importChannels, refreshChannel } from './app/mine.mjs';
import { createJobs, sseWrite } from './app/jobs.mjs';
import { overviewKpis } from './app/metrics.mjs';
import { analyzeChannel, similarChannels } from './app/analysis.mjs';
import { runClaude, runClaudeImages, validateSummary, summaryPrompt, validateSubniches, subnichePrompt } from './app/llm.mjs';
import { estimateMonitor, autoRunDecision, runMonitor } from './app/monitor.mjs';
import { buildNiches } from './app/niches.mjs';
import { subtopics, modelPrompt, validateModel, modelViews } from './app/modeling.mjs';
import { EPISODE_STYLES, styleNames, VOICES, validateProfile, profileFromConcept } from './app/profiles.mjs';
import { fetchThumbs } from './app/thumbs.mjs';
import { sampleVoice } from './app/voice.mjs';
import { STEPS, prodDir, runStep, runCancellable } from './app/production.mjs';
import routesProduction from './app/routes-production.mjs';
import routesSources from './app/routes-sources.mjs';
import routesAnalysis from './app/routes-analysis.mjs';
import routesRoteiro from './app/routes-roteiro.mjs';
import routesRender from './app/routes-render.mjs';
import routesPackage from './app/routes-package.mjs';

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
const no = m => { throw fail(400, m); }, nf = m => { throw fail(404, m); };

// Corpo JSON até 64 KB; acima disso para de acumular e responde 413.
const readJson = req => new Promise((ok, bad) => {
  if (+req.headers['content-length'] > LIMIT) return bad(fail(413, 'Corpo grande demais'));
  const parts = []; let size = 0;
  req.on('data', b => { size += b.length; if (size <= LIMIT) return void parts.push(b); req.removeAllListeners('data'); req.resume(); bad(fail(413, 'Corpo grande demais')); });
  req.on('error', bad);
  req.on('end', () => { try { const b = JSON.parse(Buffer.concat(parts).toString('utf8')); isObj(b) ? ok(b) : bad(fail(400, 'Corpo inválido')); } catch { bad(fail(400, 'JSON inválido')); } });
});

// Só apiKey, cacheHours, weights, rpm e limiares; pesos parciais caem sobre os atuais (que já têm os padrões).
function configPatch(b, cur) {
  const p = {};
  if (b.apiKey !== undefined) { if (typeof b.apiKey !== 'string' || !/^[A-Za-z0-9_-]{0,100}$/.test(b.apiKey)) no('Chave inválida'); p.apiKey = b.apiKey; }
  if (b.cacheHours !== undefined) { if (!fin(b.cacheHours) || b.cacheHours <= 0) no('Validade do cache inválida'); p.cacheHours = b.cacheHours; }
  if (b.weights !== undefined) {
    if (!isObj(b.weights) || Object.entries(b.weights).some(([k, v]) => !Object.hasOwn(DEFAULTS.weights, k) || !fin(v) || v < 0)) no('Pesos inválidos');
    p.weights = { ...DEFAULTS.weights, ...cur.weights, ...b.weights };
  }
  if (b.rpm !== undefined) { if (!isObj(b.rpm) || Object.values(b.rpm).some(r => !Array.isArray(r) || r.length !== 2 || !r.every(x => fin(x) && x >= 0) || r[0] > r[1])) no('Tabela RPM inválida'); p.rpm = b.rpm; }
  if (b.outlierMin !== undefined) { if (!fin(b.outlierMin) || b.outlierMin < 1 || b.outlierMin > 100) no('Múltiplo mínimo inválido'); p.outlierMin = b.outlierMin; }
  if (b.opportunityMin !== undefined) { if (!Number.isInteger(b.opportunityMin) || b.opportunityMin < 0 || b.opportunityMin > 100) no('Score mínimo inválido'); p.opportunityMin = b.opportunityMin; }
  if (b.subsJumpPct !== undefined) { if (!fin(b.subsJumpPct) || b.subsJumpPct < 1 || b.subsJumpPct > 1000) no('Salto de inscritos inválido'); p.subsJumpPct = b.subsJumpPct; }
  if (b.nicheMin !== undefined) { if (!Number.isInteger(b.nicheMin) || b.nicheMin < 1 || b.nicheMin > 100) no('Semelhança mínima inválida'); p.nicheMin = b.nicheMin; }
  if (b.monitorAuto !== undefined) { if (typeof b.monitorAuto !== 'boolean') no('Automático inválido'); p.monitorAuto = b.monitorAuto; }
  return p;
}

const text = (x, max) => typeof x === 'string' && x.trim().length >= 1 && x.trim().length <= max;
const query = q => text(q, 200) ? q.trim() : no('Informe o que buscar (até 200 caracteres)');
// Busca de vídeos: data, duração e idioma vão para a API; vazio = sem filtro.
function videoSearch(b) {
  const filters = {}, opt = (k, re, m) => { const v = b[k]; if (v == null || v === '') return; if (typeof v !== 'string' || !re.test(v)) no(m); filters[k] = v; };
  opt('publishedAfter', /^\d{4}-\d{2}-\d{2}$/, 'Data inválida'); opt('videoDuration', /^(any|short|medium|long)$/, 'Duração inválida'); opt('relevanceLanguage', /^[a-z]{2}$/, 'Idioma inválido');
  return { q: query(b.q), filters };
}
const DUP = 'Já existe uma coleção com esse nome', ITEM = { channel: ID, video: /^[A-Za-z0-9_-]{11}$/ };
const colId = m => /^\d{1,9}$/.test(m[1]) ? Number(m[1]) : no('Coleção inválida');
const colName = x => text(x, 60) ? x.trim() : no('Nome inválido (1 a 60 caracteres)');
const item = (kind, id) => Object.hasOwn(ITEM, kind) && typeof id === 'string' && ITEM[kind].test(id) ? { kind, id } : no('Item inválido');
// Id de nicho por query ou corpo: solo, c:<canal> ou tag:<etiqueta>.
const NICHE = /^(solo|c:UC[A-Za-z0-9_-]{22}|tag:[^]{1,60})$/, DAY = 864e5, RAN = ['done', 'skipped']; // monitor que conta para a regra de 24 h; erro não conta
const num = (s, msg) => /^\d{1,9}$/.test(s) ? Number(s) : no(msg);
const myOut = r => ({ ...r, titleTemplates: r.titleTemplates ?? [] });

export async function startAppServer({ port = 0, dataDir = 'data', appDir = 'app', outDir = 'out/app', fetch, now = Date.now, claude = prompt => runClaude(prompt).then(validateSummary), subniches = prompt => runClaude(prompt).then(validateSubniches), monitorEveryMs = 3600e3,
  modeler = (prompt, images) => runClaudeImages(prompt, images), thumbFetch = globalThis.fetch, voiceSpawn, voiceExists,
  claudeLong = (prompt, { signal } = {}) => runClaude(prompt, { timeoutMs: 600e3, signal }), claudeImages = (prompt, images, { signal } = {}) => runClaudeImages(prompt, images, { timeoutMs: 600e3, signal }), spawnProc = nodeSpawn,
  runEpisodeFn = (dir, o) => import('./episode.mjs').then(m => m.runEpisode(dir, o)), ytdlp = (args, { signal } = {}) => runCancellable(signal, { spawn: spawnProc })('yt-dlp', args) } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Porta inválida');
  dataDir = resolve(ROOT, dataDir); appDir = resolve(ROOT, appDir); outDir = resolve(ROOT, outDir);
  const thumbsDir = join(outDir, 'thumbs'), samplesDir = join(outDir, 'samples');
  const token = randomBytes(24).toString('hex'), tokenBuf = Buffer.from(token);
  const db = openDb(join(dataDir, 'app.db')), jobs = createJobs(db);
  db.interruptRunning(); // etapa que estava rodando quando o servidor caiu
  const cfg = () => loadConfig(dataDir);
  const at = () => new Date(now()).toISOString();
  const template = await readFile(join(ROOT, 'prompts', 'analise-canal.md'), 'utf8'), subTemplate = await readFile(join(ROOT, 'prompts', 'subnichos.md'), 'utf8');
  const modelTemplate = await readFile(join(ROOT, 'prompts', 'modelagem.md'), 'utf8');
  // Chave lida a cada job: uma chave nova vale sem reiniciar. Com log, grava o histórico com as unidades gastas, também em erro.
  const job = (kind, fn, { fresh = false, log = null } = {}) => jobs.start(kind, async report => {
    const c = cfg(), day = quotaDay(now()), before = log && db.quotaUsed(day); let result, status = 'error';
    try { result = await fn(createYouTube({ key: c.apiKey, db, cfg: c, fetch, now, fresh }), report, at()); status = 'done'; return result; }
    finally { if (log) db.addHistory(kind, { ...log, ok: result?.ok?.length ?? null, failed: result?.failed?.length ?? null, units: db.quotaUsed(day) - before, status }); }
  });
  const chId = m => { if (!ID.test(m[1])) throw fail(400, 'Canal inválido'); return m[1]; };
  const channel = id => db.channel(id, now(), cfg()) ?? nf('Canal não encontrado');
  const col = id => db.collection(id) ?? nf('Coleção não encontrada');
  const colOut = id => db.collections().find(c => c.id === id);
  const chRow = (id, t, c) => { const r = db.channel(id, t, c); if (!r) return null; const { snapshots, ...row } = r; return row; };
  const followed = () => db.watchList().filter(w => w.monitor);
  const monitorJob = (count, auto) => job('monitor', (yt, report, t) => runMonitor(yt, db, cfg(), report, t, now()), { fresh: true, log: { count, auto } });
  // Checagem automática: o histórico (feito ou pulado) marca a última vez; job do monitor na fila conta como recente.
  const monitorBusy = () => jobs.list().some(j => j.kind === 'monitor' && (j.status === 'queued' || j.status === 'running'));
  const tick = async () => {
    const c = cfg(), t = now(), count = followed().length, estimate = estimateMonitor(count), remaining = c.quotaLimit - db.quotaUsed(quotaDay(t));
    const d = autoRunDecision({ auto: c.monitorAuto, monitored: count, lastAt: db.lastHistoryOf('monitor', RAN)?.at ?? null, now: t, remaining, estimate });
    if (d === 'run' && monitorBusy()) return 'recent';
    if (d === 'run') monitorJob(count, true);
    if (d === 'quota') db.addHistory('monitor', { status: 'skipped', reason: 'quota', auto: true, estimate, remaining });
    return d;
  };
  const nicheList = (t, c, videos) => buildNiches({ texts: db.channelTexts(), rows: db.channelRows(t, c), videos, now: t, cfg: c });
  const niche = id => {
    if (typeof id !== 'string' || !NICHE.test(id)) no('Nicho inválido');
    const t = now(), c = cfg(), videos = db.videoRowsAll(t), n = nicheList(t, c, videos).niches.find(x => x.id === id) ?? nf('Nicho não encontrado'), ids = new Set(n.channelIds);
    const outliers = videos.filter(v => ids.has(v.channelId) && v.multiple >= c.outlierMin && t - Date.parse(v.publishedAt) <= 30 * DAY).sort((a, b) => b.multiple - a.multiple).slice(0, 50);
    return { niche: n, rows: n.channelIds.map(i => chRow(i, t, c)), outliers };
  };
  // Fase 4. Vídeos do app com views/duração numéricas (o prompt e as somas não veem null).
  const vidsOf = (id, t) => db.videoRows(id, t).map(v => ({ ...v, views: v.views ?? 0, durationS: v.durationS ?? 0 }));
  const anchorOf = id => channel(typeof id === 'string' && ID.test(id) ? id : no('Canal inválido'));
  // Entrada da modelagem, conferida antes do job; a rota de copiar monta o mesmo prompt.
  const modelInput = (anchorId, extras = []) => {
    const a = anchorOf(anchorId), t = now(), vids = vidsOf(a.id, t);
    if (!Array.isArray(extras) || extras.length > 4 || !extras.every(x => typeof x === 'string' && ID.test(x))) no('Até 4 canais extras válidos');
    if (!vids.length) no('Âncora sem vídeos');
    const ids = [...new Set(extras)], ex = ids.map(id => ({ title: channel(id).title, titles: vidsOf(id, t).sort((x, y) => y.views - x.views).slice(0, 10).map(v => v.title) }));
    return { a, vids, ids, ex };
  };
  const promptOf = ({ a, vids, ex }) => modelPrompt(modelTemplate, { anchor: a, groups: subtopics(vids), extras: ex, styles: EPISODE_STYLES });
  const model = n => db.model(n) ?? nf('Modelagem não encontrada');
  const my = n => db.myChannel(n) ?? nf('Canal próprio não encontrado');
  const myFull = n => { const t = now(), c = cfg(), r = my(n); return { ...myOut(r), competitors: r.competitors.map(id => chRow(id, t, c)) }; };
  // Perfil validado; modelId precisa existir (o banco lançaria em FK).
  const profile = b => { const p = validateProfile(b); if (p.modelId != null && !db.model(p.modelId)) no('Modelagem não encontrada'); return p; };
  const fail409 = () => { throw fail(409, 'Já existe um canal com esse nome'); };
  // Fase 6: cada routes-*.mjs recebe este ctx. step roda runStep num job (kind prod:<id>:<etapa>); uma etapa por produção de cada vez.
  const prod = id => (/^\d{1,9}$/.test(String(id)) && db.production(Number(id))) || nf('Produção não encontrada');
  const active = id => Object.fromEntries(jobs.list().filter(j => j.kind.startsWith(`prod:${id}:`) && (j.status === 'queued' || j.status === 'running')).map(j => [j.kind.split(':')[2], j.id]));
  const step = (id, name, fn) => {
    if (!STEPS.includes(name)) throw new Error('Etapa desconhecida: ' + name);
    if (Object.keys(active(id)).length) throw fail(409, 'Produção com etapa em andamento');
    // Ordem: narração, cenas e render só com a etapa anterior feita (roteiro editado deixa a narração stale).
    const prev = { narracao: ['roteiro', 'Roteiro'], cenas: ['narracao', 'Narração'], render: ['cenas', 'Cenas'] }[name];
    if (prev && db.production(id).steps[prev[0]].status !== 'done') throw fail(409, `Etapa ${prev[1]} precisa estar feita`);
    const dir = prodDir(outDir, id);
    return jobs.start(`prod:${id}:${name}`, (report, signal) => runStep({ db, id, step: name, signal, report }, async x => { await mkdir(dir, { recursive: true }); return fn({ ...x, dir }); }));
  };
  // saveWpm: a narração grava o ritmo real da voz; o config inteiro não sai daqui.
  const saveWpm = (key, wpm) => { saveConfig(dataDir, { voiceWpm: { ...cfg().voiceWpm, [key]: wpm } }); };
  const ctx = { db, cfg, now, no, nf, fail, readJson, job, jobs, outDir, ROOT, prod, active, step, saveWpm, inject: { claudeLong, claudeImages, spawnProc, runEpisodeFn, ytdlp, fetch: fetch ?? globalThis.fetch } };

  const ROUTES = [
    ['GET', /^\/api\/config$/, () => publicConfig(cfg())],
    ['POST', /^\/api\/config$/, async (m, req) => publicConfig(saveConfig(dataDir, configPatch(await readJson(req), cfg())))],
    ['GET', /^\/api\/quota$/, () => { const day = quotaDay(now()); return { day, used: db.quotaUsed(day), limit: cfg().quotaLimit, costs: { mine: estimateMine(), videos: estimateMineVideos() } }; }],
    ['GET', /^\/api\/overview$/, () => {
      const c = cfg(), t = now();
      return { ...overviewKpis(db.channelRows(t, c), db.videoRowsAll(t), t, c), outlierMin: c.outlierMin, opportunityMin: c.opportunityMin, recent: db.history(10) };
    }],
    ['POST', /^\/api\/mine$/, async (m, req) => {
      const q = query((await readJson(req)).q);
      return { jobId: job('mine', (yt, report, t) => mineKeyword(yt, db, q, report, t), { log: { q } }), estimate: estimateMine() };
    }],
    ['POST', /^\/api\/import$/, async (m, req) => {
      const { text } = await readJson(req);
      if (typeof text !== 'string' || !text.trim()) throw fail(400, 'Cole ao menos um canal');
      return { jobId: job('import', (yt, report, t) => importChannels(yt, db, text, report, t), { log: {} }) };
    }],
    ['GET', /^\/api\/videos$/, (m, req, res, u) => {
      const sp = u.searchParams, sort = sp.get('sort') || 'viewsPerDay', f = parseVideoFilters(sp), t = now();
      if (!VIDEO_SORTS.includes(sort)) throw fail(400, 'Ordenação desconhecida');
      if (f.lang) f.lang = f.lang.toLowerCase();
      const rows = sortRows(applyVideoFilters(db.videoRowsAll(t), f, t), sort, sp.get('dir') === 'asc' ? 'asc' : 'desc');
      return { rows: rows.slice(0, 500), total: rows.length };
    }],
    ['POST', /^\/api\/videos\/mine$/, async (m, req) => {
      const { q, filters } = videoSearch(await readJson(req)), api = { ...filters, ...(filters.publishedAfter && { publishedAfter: filters.publishedAfter + 'T00:00:00Z' }) };
      return { jobId: job('videos', (yt, report, t) => mineVideos(yt, db, q, api, report, t), { log: { q, filters } }), estimate: estimateMineVideos() }; // log com a data como veio: "Refazer" reenvia
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
      let rows = db.channelRows(now(), cfg());
      if (sp.get('fav') === '1') { const fav = new Set(db.collectionItems(FAV).filter(i => i.kind === 'channel').map(i => i.id)); rows = rows.filter(r => fav.has(r.id)); }
      rows = runPreset(rows, preset, parseFilters(sp));
      if (sp.get('sort')) rows = sortRows(rows, sp.get('sort'), sp.get('dir') === 'asc' ? 'asc' : 'desc');
      return { rows, total: rows.length }; // ponytail: sem paginação, todas as linhas; paginar se a base passar de alguns milhares
    }],
    ['GET', /^\/api\/channels\/([^/]+)$/, m => {
      const c = channel(chId(m)), last = db.lastHistory();
      if (!(last?.kind === 'open' && last.payload?.id === c.id)) db.addHistory('open', { id: c.id, title: c.title }); // visita repetida não duplica
      return { ...c, watch: db.watch(c.id) };
    }],
    ['POST', /^\/api\/channels\/([^/]+)\/watch$/, async (m, req) => {
      const id = chId(m), { monitor, competitor } = await readJson(req);
      if ([monitor, competitor].some(x => x !== undefined && typeof x !== 'boolean')) no('Valor inválido');
      channel(id); return db.setWatch(id, { monitor, competitor }); // existência antes: o banco lançaria em FK
    }],
    ['GET', /^\/api\/channels\/([^/]+)\/videos$/, m => db.videoRows(chId(m), now())],
    ['GET', /^\/api\/channels\/([^/]+)\/analysis$/, m => { const id = channel(chId(m)).id; return analyzeChannel(db.videoRows(id, now()), db.channelSnapshots(id)); }],
    ['GET', /^\/api\/channels\/([^/]+)\/similar$/, m => {
      const id = chId(m), texts = db.channelTexts(), target = texts.find(x => x.id === id) ?? nf('Canal não encontrado');
      const rows = new Map(db.channelRows(now(), cfg()).map(r => [r.id, r]));
      // score = semelhança (a aba mostra "semelhança N%"); o score de oportunidade do canal vai em channelScore.
      return similarChannels(target, texts).map(x => { const r = rows.get(x.id); return { ...x, avatar: r?.avatar ?? null, subs: r?.subs ?? null, avgViews: r?.avgViews ?? null, updatedAt: r?.updatedAt ?? null, channelScore: r?.score ?? null }; });
    }],
    ['POST', /^\/api\/channels\/([^/]+)\/summary$/, m => {
      const c = channel(chId(m)), vids = db.videoRows(c.id, now()).map(v => ({ ...v, views: v.views ?? 0, durationS: v.durationS ?? 0 }));
      const prompt = summaryPrompt(template, c, vids, analyzeChannel(vids, c.snapshots));
      return { jobId: jobs.start('summary', () => claude(prompt)), prompt }; // sem cota e sem histórico; o prompt volta para copiar se o claude falhar
    }],
    ['POST', /^\/api\/channels\/([^/]+)\/refresh$/, m => { const id = chId(m); return { jobId: job('refresh', (yt, report, t) => refreshChannel(yt, db, id, report, t), { fresh: true, log: { id } }) }; }],
    ['POST', /^\/api\/channels\/([^/]+)\/tag$/, async (m, req) => {
      const id = chId(m), { tag = null, faceless = null } = await readJson(req);
      if (tag !== null && (typeof tag !== 'string' || tag.length > 60) || faceless !== null && typeof faceless !== 'boolean') throw fail(400, 'Etiqueta inválida');
      channel(id); db.setChannelTag(id, { tag: tag?.trim() || null, faceless });
      return { ...channel(id), watch: db.watch(id) };
    }],
    // Coleções: tipo, id e existência conferidos aqui (o banco lançaria em CHECK/FK, e aceitaria id fora da base).
    ['GET', /^\/api\/collections$/, () => db.collections()],
    ['POST', /^\/api\/collections$/, async (m, req) => colOut(db.createCollection(colName((await readJson(req)).name)) ?? no(DUP))],
    ['GET', /^\/api\/collections\/([^/]+)$/, m => {
      const c = col(colId(m)), items = db.collectionItems(c.id), t = now(), k = cfg();
      const vids = new Map(items.some(i => i.kind === 'video') ? db.videoRowsAll(t).map(v => [v.id, v]) : []);
      return { ...c, items: items.map(i => ({ ...i, row: i.kind === 'channel' ? chRow(i.id, t, k) : vids.get(i.id) ?? null })) };
    }],
    ['POST', /^\/api\/collections\/([^/]+)\/rename$/, async (m, req) => {
      const c = col(colId(m)); if (c.fixed) no('Favoritos não pode ser renomeada');
      if (!db.renameCollection(c.id, colName((await readJson(req)).name))) no(DUP);
      return colOut(c.id);
    }],
    ['POST', /^\/api\/collections\/([^/]+)\/delete$/, m => { const c = col(colId(m)); if (c.fixed) no('Favoritos não pode ser apagada'); db.deleteCollection(c.id); return { ok: true }; }],
    ['POST', /^\/api\/collections\/([^/]+)\/items$/, async (m, req) => {
      const c = col(colId(m)), b = await readJson(req), it = item(b.kind, b.id);
      if (b.note != null && (typeof b.note !== 'string' || b.note.length > 500)) no('Nota inválida');
      if (it.kind === 'channel' ? !db.channel(it.id, now(), cfg()) : !db.video(it.id, now())) nf(it.kind === 'channel' ? 'Canal não encontrado' : 'Vídeo não encontrado');
      db.addItem(c.id, it.kind, it.id, b.note ?? null); return { ok: true };
    }],
    ['POST', /^\/api\/collections\/([^/]+)\/items\/remove$/, async (m, req) => { const c = col(colId(m)), b = await readJson(req), it = item(b.kind, b.id); db.removeItem(c.id, it.kind, it.id); return { ok: true }; }],
    ['GET', /^\/api\/memberships$/, (m, req, res, u) => { const it = item(u.searchParams.get('kind'), u.searchParams.get('id')); return { ids: db.memberships(it.kind, it.id) }; }],
    ['GET', /^\/api\/history$/, () => ({ entries: db.history(200), jobs: db.jobsList(50) })],
    // Fase 3: monitoramento, alertas, concorrentes e nichos.
    ['GET', /^\/api\/monitor$/, () => {
      const t = now(), c = cfg(), list = followed(), lastAt = db.lastHistoryOf('monitor', ['done'])?.at ?? null, ranAt = db.lastHistoryOf('monitor', RAN)?.at ?? null;
      return { channels: list.map(w => ({ ...chRow(w.channelId, t, c), lastRun: w.lastRun })), lastAt, nextAt: ranAt && new Date(Date.parse(ranAt) + DAY).toISOString(), auto: c.monitorAuto, estimate: estimateMonitor(list.length) };
    }],
    ['POST', /^\/api\/monitor\/run$/, () => {
      const count = followed().length; if (!count) no('Nenhum canal seguido');
      if (monitorBusy()) throw fail(409, 'Monitoramento já em andamento');
      return { jobId: monitorJob(count, false), estimate: estimateMonitor(count) };
    }],
    ['GET', /^\/api\/alerts$/, (m, req, res, u) => {
      const l = u.searchParams.get('limit') ?? '50', limit = /^\d{1,3}$/.test(l) ? Number(l) : 0;
      if (limit < 1 || limit > 200) no('Limite inválido (1 a 200)');
      return { alerts: db.alerts(limit), unseen: db.unseenAlerts() };
    }],
    ['POST', /^\/api\/alerts\/seen$/, async (m, req) => {
      const { ids, all } = await readJson(req);
      if (all === true) db.markAlertsSeen('all');
      else if (Array.isArray(ids) && ids.every(Number.isInteger)) db.markAlertsSeen(ids);
      else no('Informe os alertas');
      return { unseen: db.unseenAlerts() };
    }],
    ['GET', /^\/api\/competitors$/, (m, req, res, u) => {
      const t = now(), c = cfg(), mine = u.searchParams.get('my');
      const ids = new Set(mine != null ? my(num(mine, 'Canal próprio inválido')).competitors : db.watchList().filter(w => w.competitor).map(w => w.channelId)); // com my: só os ligados a ele
      const videos = db.videoRowsAll(t).filter(v => ids.has(v.channelId) && t - Date.parse(v.publishedAt) <= 30 * DAY).sort((a, b) => (a.publishedAt < b.publishedAt) - (a.publishedAt > b.publishedAt)).slice(0, 200);
      return { rows: [...ids].map(id => chRow(id, t, c)), videos };
    }],
    ['GET', /^\/api\/niches$/, () => { const t = now(); return nicheList(t, cfg(), db.videoRowsAll(t)); }],
    ['GET', /^\/api\/niches\/detail$/, (m, req, res, u) => niche(u.searchParams.get('id'))],
    ['POST', /^\/api\/niches\/tag$/, async (m, req) => {
      const b = await readJson(req), tag = text(b.tag, 40) ? b.tag.trim() : no('Etiqueta inválida (1 a 40 caracteres)'), { niche: n, rows } = niche(b.id);
      if (n.source !== 'automático') no('Só grupos automáticos recebem etiqueta');
      const free = rows.filter(r => r.tag == null); for (const r of free) db.setChannelTag(r.id, { tag, faceless: r.faceless });
      return { tagged: free.length };
    }],
    ['POST', /^\/api\/niches\/subniches$/, async (m, req) => {
      const { niche: n, outliers } = niche((await readJson(req)).id);
      if (!outliers.length) no('Nicho sem outliers recentes');
      const prompt = subnichePrompt(subTemplate, n, outliers);
      try { return await subniches(prompt); } catch (e) { return { error: e?.message ?? 'Falha do Claude', prompt }; } // o prompt volta para copiar
    }],
    // Fase 4: modelagem, meus canais e vozes.
    ['GET', /^\/api\/model\/prepare$/, (m, req, res, u) => {
      const a = anchorOf(u.searchParams.get('anchor')), t = now(), texts = db.channelTexts(), { snapshots, ...anchor } = a;
      return { anchor, groups: subtopics(vidsOf(a.id, t)), similar: similarChannels(texts.find(x => x.id === a.id), texts).slice(0, 8), models: db.modelsOf(a.id) };
    }],
    ['GET', /^\/api\/model\/prompt$/, (m, req, res, u) => {
      const sp = u.searchParams; return { prompt: promptOf(modelInput(sp.get('anchor'), sp.get('extras') ? sp.get('extras').split(',') : [])).prompt };
    }],
    ['POST', /^\/api\/model$/, async (m, req) => {
      const b = await readJson(req), input = modelInput(b.anchor, b.extras ?? []);
      // Sem cota e sem histórico. Falha de thumbnail não derruba: segue só com texto (semImagens).
      return { jobId: jobs.start('model', async report => {
        report('Baixando thumbnails', 0, 4);
        const top = [...input.vids].sort((x, y) => y.views - x.views).slice(0, 6).map(v => v.id);
        const images = await fetchThumbs(top, thumbsDir, { fetch: thumbFetch }).catch(() => []);
        report('Montando prompt', 1, 4); const { prompt, videoIds } = promptOf(input);
        report('Gerando com o Claude', 2, 4);
        const output = validateModel(await modeler(prompt, images), { videoIds, titles: [...input.vids.map(v => v.title), ...input.ex.flatMap(e => e.titles)], styles: EPISODE_STYLES });
        report('Gravando', 3, 4);
        return { modelId: db.addModel({ anchorId: input.a.id, input: { extras: input.ids, videoIds, semImagens: images.length === 0, prompt }, output }) };
      }) };
    }],
    ['GET', /^\/api\/models\/([^/]+)$/, m => {
      const md = model(num(m[1], 'Modelagem inválida')), t = now(), vids = vidsOf(md.anchorId, t), byId = new Map(vids.map(v => [v.id, v]));
      const videos = Object.fromEntries(md.output.conceitos.flatMap(c => c.videoIds).filter(id => byId.has(id)).map(id => { const v = byId.get(id); return [id, { title: v.title, views: v.views, thumb: v.thumb }]; }));
      return { ...md, anchor: chRow(md.anchorId, t, cfg()), views: modelViews(md.output, vids), videos };
    }],
    ['GET', /^\/api\/models\/([^/]+)\/profile\/([^/]+)$/, m => {
      const md = model(num(m[1], 'Modelagem inválida')); if (!/^[012]$/.test(m[2])) no('Conceito inválido (0, 1 ou 2)');
      return profileFromConcept(md, Number(m[2]), chRow(md.anchorId, now(), cfg()));
    }],
    ['GET', /^\/api\/mychannels$/, () => db.myChannels().map(myOut)],
    ['POST', /^\/api\/mychannels$/, async (m, req) => myFull(db.createMyChannel(profile(await readJson(req))) ?? fail409())],
    ['GET', /^\/api\/mychannels\/([^/]+)$/, m => myFull(num(m[1], 'Canal próprio inválido'))],
    ['POST', /^\/api\/mychannels\/([^/]+)$/, async (m, req) => {
      const n = my(num(m[1], 'Canal próprio inválido')).id;
      if (!db.updateMyChannel(n, profile(await readJson(req)))) fail409(); // existe: 0 mudanças = nome repetido
      return myFull(n);
    }],
    ['POST', /^\/api\/mychannels\/([^/]+)\/delete$/, m => { db.deleteMyChannel(my(num(m[1], 'Canal próprio inválido')).id); return { ok: true }; }],
    ['POST', /^\/api\/mychannels\/([^/]+)\/competitors$/, async (m, req) => {
      const n = my(num(m[1], 'Canal próprio inválido')).id, { ids } = await readJson(req), t = now(), c = cfg();
      if (!Array.isArray(ids) || ids.length > 50 || !ids.every(x => typeof x === 'string' && ID.test(x))) no('Até 50 canais válidos');
      const uniq = [...new Set(ids)], rows = uniq.map(id => chRow(id, t, c) ?? no('Canal fora da base: ' + id)); // antes de gravar: o banco lançaria em FK
      db.setMyCompetitors(n, uniq); return { competitors: rows };
    }],
    ['GET', /^\/api\/styles$/, () => styleNames()],
    ['GET', /^\/api\/voices$/, () => ({ voices: VOICES, wpm: cfg().voiceWpm })],
    ['POST', /^\/api\/voices\/sample$/, async (m, req) => {
      const { voice, speed, lang } = await readJson(req);
      if (!Object.hasOwn(VOICES, lang)) no('Idioma deve ser pt ou en');
      if (!VOICES[lang].some(v => `kokoro:${v}` === voice)) no('Voz não é do idioma escolhido');
      if (!fin(speed) || speed < 0.8 || speed > 1.3) no('Velocidade entre 0,8 e 1,3');
      let r; // curto: fora da fila de jobs
      try { r = await sampleVoice({ voice, speed, lang }, samplesDir, { spawn: voiceSpawn, exists: voiceExists, root: ROOT }); }
      catch (e) { if (/^Kokoro não instalado/.test(e?.message)) return { error: e.message }; throw fail(502, 'Kokoro falhou ao gerar a amostra'); } // outras mensagens podem ter caminhos
      saveWpm(`${voice}|${speed}`, r.wpm);
      return { url: '/api/samples/' + r.name, seconds: r.seconds, wpm: r.wpm };
    }],
    // Rota de /api/ que não responde JSON (como a de arquivos da produção): nome estrito, sem caminho vindo de fora.
    ['GET', /^\/api\/samples\/([^/]+)$/, async (m, req, res) => {
      if (!/^[0-9a-f]{40}\.wav$/.test(m[1])) no('Amostra inválida');
      const bytes = await readFile(join(samplesDir, m[1])).catch(e => { throw e.code === 'ENOENT' ? fail(404, 'Amostra não encontrada') : e; });
      res.writeHead(200, { ...BASE, 'Content-Type': 'audio/wav', 'Content-Length': bytes.length }); res.end(bytes);
    }],
    ...[routesProduction, routesSources, routesAnalysis, routesRoteiro, routesRender, routesPackage].flatMap(r => r(ctx)),
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
      if (ext === 'html') head['Content-Security-Policy'] = CSP;
      if (raw === '/' || raw === '/index.html') bytes = Buffer.from(bytes.toString('utf8').replaceAll('%APP_TOKEN%', token));
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
  const autoTick = () => void tick().catch(() => {}); // falha do automático não derruba o servidor
  const first = setTimeout(autoTick, 5000).unref(), every = setInterval(autoTick, monitorEveryMs).unref();
  return {
    origin, token, address: server.address(), tick,
    close: () => new Promise((ok, bad) => { clearTimeout(first); clearInterval(every); server.close(e => { try { db.close(); } catch {} e ? bad(e) : ok(); }); server.closeAllConnections(); }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const arg = process.argv.slice(2);
  if (arg.length > 1 || arg[0] && !/^--port=\d+$/.test(arg[0])) throw new Error('Uso: node scripts/app-server.mjs [--port=8090]');
  const app = await startAppServer({ port: arg[0] ? Number(arg[0].split('=')[1]) : 8090 });
  console.log('App: ' + app.origin + '/');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
