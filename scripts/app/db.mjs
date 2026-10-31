// Banco local do webapp (node:sqlite). Colunas snake_case, objetos camelCase.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { channelRow, videoRow } from './metrics.mjs';
import { STEPS } from './production.mjs';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS channels(id TEXT PRIMARY KEY, title, handle, country, lang, avatar, created_at, uploads, topics, hidden_subs INT, tag, faceless INT, added_at);
CREATE TABLE IF NOT EXISTS channel_snapshots(channel_id TEXT NOT NULL REFERENCES channels(id), at TEXT NOT NULL, subs INT, views INT, videos INT, PRIMARY KEY(channel_id, at));
CREATE TABLE IF NOT EXISTS videos(id TEXT PRIMARY KEY, channel_id TEXT NOT NULL REFERENCES channels(id), title, published_at, duration, thumb, tags, lang);
CREATE INDEX IF NOT EXISTS videos_channel ON videos(channel_id, published_at);
CREATE TABLE IF NOT EXISTS video_snapshots(video_id TEXT NOT NULL REFERENCES videos(id), at TEXT NOT NULL, views INT, likes INT, comments INT, PRIMARY KEY(video_id, at));
CREATE TABLE IF NOT EXISTS quota_log(day TEXT, units INT, method TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS cache(url TEXT PRIMARY KEY, body TEXT, expires INT);
CREATE TABLE IF NOT EXISTS history(at TEXT, kind TEXT, payload TEXT);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, kind, status, created_at, finished_at, result TEXT, error);
CREATE TABLE IF NOT EXISTS collections(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at);
CREATE TABLE IF NOT EXISTS collection_items(collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('channel','video')), item_id TEXT NOT NULL, note TEXT, added_at, PRIMARY KEY(collection_id, kind, item_id));
CREATE TABLE IF NOT EXISTS watch(channel_id TEXT PRIMARY KEY REFERENCES channels(id), monitor INT NOT NULL DEFAULT 0, competitor INT NOT NULL DEFAULT 0, since TEXT, last_run TEXT);
CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY, at TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('newVideo','outlier','subsJump')), ref TEXT NOT NULL, channel_id TEXT NOT NULL REFERENCES channels(id), video_id TEXT, payload TEXT, seen INT NOT NULL DEFAULT 0, UNIQUE(kind, ref));
CREATE TABLE IF NOT EXISTS models(id INTEGER PRIMARY KEY, anchor_id TEXT NOT NULL REFERENCES channels(id), created_at TEXT, input TEXT, output TEXT);
CREATE TABLE IF NOT EXISTS my_channels(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, tag, lang, style, voice, speed REAL, target_min INT, tolerance_min INT, anchor_id TEXT, model_id INT REFERENCES models(id) ON DELETE SET NULL, concept_index INT, title_templates TEXT, description_template TEXT, format TEXT, created_at, updated_at);
CREATE TABLE IF NOT EXISTS my_competitors(my_id INT NOT NULL REFERENCES my_channels(id) ON DELETE CASCADE, channel_id TEXT NOT NULL REFERENCES channels(id), PRIMARY KEY(my_id, channel_id));
CREATE TABLE IF NOT EXISTS productions(id INTEGER PRIMARY KEY, my_id INT NOT NULL REFERENCES my_channels(id) ON DELETE CASCADE, theme, target_min, tolerance_min, style, created_at);
CREATE TABLE IF NOT EXISTS production_steps(prod_id INT NOT NULL REFERENCES productions(id) ON DELETE CASCADE, step TEXT NOT NULL, status, started_at, finished_at, ms INT, result TEXT, error, PRIMARY KEY(prod_id, step));
CREATE TABLE IF NOT EXISTS script_analyses(video_id TEXT PRIMARY KEY, at, lang, output TEXT);
`;
export const FAV = 1; // coleção fixa Favoritos
const n = x => x ?? null; // node:sqlite não aceita undefined
const j = x => (x == null ? null : JSON.stringify(x));
const MY_COLS = ['name', 'tag', 'lang', 'style', 'voice', 'speed', 'target_min', 'tolerance_min', 'anchor_id', 'model_id', 'concept_index', 'title_templates', 'description_template', 'format'];
const myArgs = x => [x.name, n(x.tag), n(x.lang), n(x.style), n(x.voice), n(x.speed), n(x.targetMin), n(x.toleranceMin), n(x.anchorId), n(x.modelId), n(x.conceptIndex), j(x.titleTemplates), n(x.descriptionTemplate), n(x.format)];
const myRow = r => ({ id: r.id, name: r.name, tag: r.tag, lang: r.lang, style: r.style, voice: r.voice, speed: r.speed, targetMin: r.target_min, toleranceMin: r.tolerance_min, anchorId: r.anchor_id, modelId: r.model_id, conceptIndex: r.concept_index, titleTemplates: p(r.title_templates), descriptionTemplate: r.description_template, format: r.format });
const p = s => (s == null ? null : JSON.parse(s));
// Etapa sem linha no banco vale pending; result só no detalhe da produção.
const PENDING = { status: 'pending', startedAt: null, finishedAt: null, ms: null, result: null, error: null };
const stepRow = r => ({ status: r.status, startedAt: r.started_at, finishedAt: r.finished_at, ms: r.ms, result: p(r.result), error: r.error });
const prodRow = (r, rows, full) => ({ id: r.id, myId: r.my_id, theme: r.theme, targetMin: r.target_min, toleranceMin: r.tolerance_min, style: r.style, createdAt: r.created_at,
  steps: Object.fromEntries(STEPS.map(k => { const x = rows.find(y => y.step === k), v = x ? stepRow(x) : { ...PENDING }; if (!full) delete v.result; return [k, v]; })) });

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  raw.exec(SCHEMA);
  raw.prepare("INSERT OR IGNORE INTO collections(id,name,created_at) VALUES(?,'Favoritos',?)").run(FAV, new Date().toISOString());
  const q = s => raw.prepare(s);
  const chRow = r => ({ id: r.id, title: r.title, handle: r.handle, country: r.country, lang: r.lang, avatar: r.avatar, createdAt: r.created_at, uploads: r.uploads, topics: p(r.topics), hiddenSubs: r.hidden_subs, tag: r.tag, faceless: r.faceless == null ? null : !!r.faceless, addedAt: r.added_at });
  const s = {
    upCh: q(`INSERT INTO channels(id,title,handle,country,lang,avatar,created_at,uploads,topics,hidden_subs,added_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET title=COALESCE(excluded.title,title),handle=COALESCE(excluded.handle,handle),country=COALESCE(excluded.country,country),lang=COALESCE(excluded.lang,lang),avatar=COALESCE(excluded.avatar,avatar),
      created_at=COALESCE(excluded.created_at,created_at),uploads=COALESCE(excluded.uploads,uploads),topics=COALESCE(excluded.topics,topics),hidden_subs=COALESCE(excluded.hidden_subs,hidden_subs)`),
    chSnap: q('INSERT OR REPLACE INTO channel_snapshots(channel_id,at,subs,views,videos) VALUES(?,?,?,?,?)'),
    upVid: q(`INSERT INTO videos(id,channel_id,title,published_at,duration,thumb,tags,lang) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET title=COALESCE(excluded.title,title),published_at=COALESCE(excluded.published_at,published_at),duration=COALESCE(excluded.duration,duration),thumb=COALESCE(excluded.thumb,thumb),tags=COALESCE(excluded.tags,tags),lang=COALESCE(excluded.lang,lang)`),
    vidSnap: q('INSERT OR REPLACE INTO video_snapshots(video_id,at,views,likes,comments) VALUES(?,?,?,?,?)'),
    lastVidSnap: q('SELECT views,likes,comments FROM video_snapshots WHERE video_id=? ORDER BY at DESC LIMIT 1'),
    tag: q('UPDATE channels SET tag=?, faceless=? WHERE id=?'),
    snaps: q('SELECT at,subs,views,videos FROM channel_snapshots WHERE channel_id=? ORDER BY at'),
    vids: q(`SELECT v.id,v.channel_id,v.title,v.published_at,v.duration,v.thumb,v.tags,v.lang,
      COALESCE((SELECT views FROM video_snapshots WHERE video_id=v.id ORDER BY at DESC LIMIT 1),0) views
      FROM videos v WHERE v.channel_id=? ORDER BY v.published_at DESC`),
    chAll: q('SELECT * FROM channels ORDER BY added_at, id'),
    chOne: q('SELECT * FROM channels WHERE id=?'),
    quotaIn: q('INSERT INTO quota_log(day,units,method,at) VALUES(?,?,?,?)'),
    quotaSum: q('SELECT COALESCE(SUM(units),0) u FROM quota_log WHERE day=?'),
    cacheGet: q('SELECT body FROM cache WHERE url=? AND expires>?'),
    cacheSet: q('INSERT OR REPLACE INTO cache(url,body,expires) VALUES(?,?,?)'),
    hist: q('INSERT INTO history(at,kind,payload) VALUES(?,?,?)'),
    vidAll: q(`SELECT v.id,v.channel_id,v.title,v.published_at,v.duration,v.thumb,v.tags,v.lang,
      COALESCE((SELECT views FROM video_snapshots WHERE video_id=v.id ORDER BY at DESC LIMIT 1),0) views,
      (SELECT at FROM video_snapshots WHERE video_id=v.id ORDER BY at DESC LIMIT 1) captured_at,
      c.title channel_title,c.avatar channel_avatar,c.tag,c.lang channel_lang
      FROM videos v JOIN channels c ON c.id=v.channel_id ORDER BY v.channel_id, v.published_at DESC`),
    chTexts: q('SELECT id,title,topics FROM channels ORDER BY added_at, id'),
    vidTitles: q('SELECT channel_id,title FROM videos ORDER BY published_at DESC'),
    colAll: q(`SELECT c.id,c.name,(SELECT COUNT(*) FROM collection_items WHERE collection_id=c.id) n FROM collections c ORDER BY c.id<>${FAV}, c.name COLLATE NOCASE`),
    colOne: q('SELECT id,name FROM collections WHERE id=?'),
    colNew: q('INSERT OR IGNORE INTO collections(name,created_at) VALUES(?,?)'),
    colRename: q(`UPDATE OR IGNORE collections SET name=? WHERE id=? AND id<>${FAV}`),
    colDel: q(`DELETE FROM collections WHERE id=? AND id<>${FAV}`),
    itemsOf: q('SELECT kind,item_id,note,added_at FROM collection_items WHERE collection_id=? ORDER BY rowid DESC'),
    itemSet: q('INSERT INTO collection_items(collection_id,kind,item_id,note,added_at) VALUES(?,?,?,?,?) ON CONFLICT(collection_id,kind,item_id) DO UPDATE SET note=COALESCE(excluded.note,note)'),
    itemDel: q('DELETE FROM collection_items WHERE collection_id=? AND kind=? AND item_id=?'),
    member: q('SELECT collection_id FROM collection_items WHERE kind=? AND item_id=? ORDER BY collection_id'),
    histAll: q('SELECT at,kind,payload FROM history ORDER BY rowid DESC LIMIT ?'),
    jobsAll: q('SELECT id,kind,status,created_at,finished_at,error FROM jobs ORDER BY created_at DESC, rowid DESC LIMIT ?'),
    watchOne: q('SELECT monitor,competitor,since,last_run FROM watch WHERE channel_id=?'),
    watchSet: q('INSERT OR REPLACE INTO watch(channel_id,monitor,competitor,since,last_run) VALUES(?,?,?,?,?)'),
    watchAll: q('SELECT channel_id,monitor,competitor,since,last_run FROM watch WHERE monitor=1 OR competitor=1 ORDER BY since, channel_id'),
    watchRun: q('UPDATE watch SET last_run=? WHERE channel_id=?'),
    alertIn: q('INSERT OR IGNORE INTO alerts(at,kind,ref,channel_id,video_id,payload) VALUES(?,?,?,?,?,?)'),
    alertAll: q('SELECT a.id,a.at,a.kind,a.channel_id,c.title channel_title,a.video_id,a.payload,a.seen FROM alerts a JOIN channels c ON c.id=a.channel_id ORDER BY a.at DESC, a.id DESC LIMIT ?'),
    alertUnseen: q('SELECT COUNT(*) u FROM alerts WHERE seen=0'),
    alertSeen: q('UPDATE alerts SET seen=1 WHERE id=?'),
    histOf: q('SELECT at,kind,payload FROM history WHERE kind=? ORDER BY rowid DESC LIMIT 1'),
    modelIn: q('INSERT INTO models(anchor_id,created_at,input,output) VALUES(?,?,?,?)'),
    modelOne: q('SELECT id,anchor_id,created_at,input,output FROM models WHERE id=?'),
    modelsBy: q('SELECT id,created_at,output FROM models WHERE anchor_id=? ORDER BY id DESC'),
    myNew: q(`INSERT OR IGNORE INTO my_channels(${MY_COLS},created_at,updated_at) VALUES(${MY_COLS.map(() => '?')},?,?)`),
    myUp: q(`UPDATE OR IGNORE my_channels SET ${MY_COLS.map(c => c + '=?')},updated_at=? WHERE id=?`),
    myDel: q('DELETE FROM my_channels WHERE id=?'),
    myOne: q('SELECT * FROM my_channels WHERE id=?'),
    myAll: q('SELECT m.*,(SELECT COUNT(*) FROM my_competitors WHERE my_id=m.id) n FROM my_channels m ORDER BY m.name COLLATE NOCASE'),
    compOf: q('SELECT channel_id FROM my_competitors WHERE my_id=? ORDER BY rowid'),
    compClr: q('DELETE FROM my_competitors WHERE my_id=?'),
    compOff: q('DELETE FROM my_competitors WHERE channel_id=?'),
    compIn: q('INSERT OR IGNORE INTO my_competitors(my_id,channel_id) VALUES(?,?)'),
    job: q('INSERT OR REPLACE INTO jobs(id,kind,status,created_at,finished_at,result,error) VALUES(?,?,?,?,?,?,?)'),
    prodNew: q('INSERT INTO productions(my_id,theme,target_min,tolerance_min,style,created_at) VALUES(?,?,?,?,?,?)'),
    prodUp: q('UPDATE productions SET theme=?,target_min=?,tolerance_min=?,style=? WHERE id=?'),
    prodOne: q('SELECT * FROM productions WHERE id=?'),
    prodAll: q('SELECT * FROM productions ORDER BY id DESC'),
    prodOf: q('SELECT * FROM productions WHERE my_id=? ORDER BY id DESC'),
    prodDel: q('DELETE FROM productions WHERE id=?'),
    stepsOf: q('SELECT * FROM production_steps WHERE prod_id=?'),
    stepsAll: q('SELECT prod_id,step,status,started_at,finished_at,ms,error FROM production_steps'),
    stepSet: q('INSERT OR REPLACE INTO production_steps(prod_id,step,status,started_at,finished_at,ms,result,error) VALUES(?,?,?,?,?,?,?,?)'),
    stepsStop: q("UPDATE production_steps SET status='error',error='Interrompida (servidor reiniciado)',finished_at=? WHERE status='running'"),
    anSet: q('INSERT OR REPLACE INTO script_analyses(video_id,at,lang,output) VALUES(?,?,?,?)'),
    anOne: q('SELECT * FROM script_analyses WHERE video_id=?'),
  };
  const watchOf = r => ({ monitor: !!r?.monitor, competitor: !!r?.competitor, since: r?.since ?? null, lastRun: r?.last_run ?? null });
  const channelSnapshots = id => s.snaps.all(id).map(r => ({ ...r }));
  
  const vidFields = r => ({ id: r.id, channelId: r.channel_id, title: r.title, publishedAt: r.published_at, duration: r.duration, thumb: r.thumb, tags: p(r.tags), lang: r.lang, views: r.views });
  const vidExtra = r => ({ channelTitle: r.channel_title, channelAvatar: r.channel_avatar, tag: r.tag, channelLang: r.channel_lang, capturedAt: r.captured_at });
  const videoRowsAll = now => { // uma consulta; agrupa por canal em JS para o múltiplo
    const rs = s.vidAll.all(), by = new Map();
    for (const r of rs) (by.get(r.channel_id) ?? by.set(r.channel_id, []).get(r.channel_id)).push(vidFields(r));
    return rs.map(r => ({ ...videoRow(vidFields(r), by.get(r.channel_id), now), ...vidExtra(r) }));
  };
  const channelVideos = id => s.vids.all(id).map(vidFields);
  const row = (r, now, cfg) => channelRow(chRow(r), channelSnapshots(r.id), channelVideos(r.id), now, cfg);
  return {
    raw,
    upsertChannel: c => void s.upCh.run(c.id, n(c.title), n(c.handle), n(c.country), n(c.lang), n(c.avatar), n(c.createdAt), n(c.uploads), j(c.topics), c.hiddenSubs == null ? null : +!!c.hiddenSubs, c.addedAt ?? new Date().toISOString()), // tag/faceless/added_at só mudam por setChannelTag/insert
    addChannelSnapshot: (id, at, x) => void s.chSnap.run(id, at, n(x.subs), n(x.views), n(x.videos)),
    upsertVideo: v => void s.upVid.run(v.id, v.channelId, n(v.title), n(v.publishedAt), n(v.duration), n(v.thumb), j(v.tags), n(v.lang)),
    addVideoSnapshot: (id, at, x) => void s.vidSnap.run(id, at, n(x.views), n(x.likes), n(x.comments)),
    latestVideoSnapshot: id => ({ ...s.lastVidSnap.get(id) }),
    setChannelTag: (id, { tag, faceless }) => void s.tag.run(n(tag), faceless == null ? null : +!!faceless, id),
    channelSnapshots,
    channelVideos,
    channelRows: (now, cfg) => s.chAll.all().map(r => row(r, now, cfg)),
    channel(id, now, cfg) { const r = s.chOne.get(id); return r ? { ...row(r, now, cfg), snapshots: channelSnapshots(id) } : null; },
    videoRows(id, now) { const vs = channelVideos(id); return vs.map(v => videoRow(v, vs, now)); },
    videoRowsAll,
    video: (id, now) => videoRowsAll(now).find(v => v.id === id) ?? null, // ponytail: varre a base toda; indexar por id se passar de ~100 mil vídeos
    channelTexts() {
      const titles = new Map();
      for (const r of s.vidTitles.all()) (titles.get(r.channel_id) ?? titles.set(r.channel_id, []).get(r.channel_id)).push(r.title);
      return s.chTexts.all().map(r => ({ id: r.id, title: r.title, topics: p(r.topics), titles: titles.get(r.id) ?? [] }));
    },
    collections: () => s.colAll.all().map(r => ({ id: r.id, name: r.name, fixed: r.id === FAV, count: r.n })),
    collection(id) { const r = s.colOne.get(id); return r ? { id: r.id, name: r.name, fixed: r.id === FAV } : null; },
    createCollection(name) { const r = s.colNew.run(name, new Date().toISOString()); return r.changes ? Number(r.lastInsertRowid) : null; },
    renameCollection: (id, name) => s.colRename.run(name, id).changes > 0,
    deleteCollection: id => s.colDel.run(id).changes > 0,
    collectionItems: id => s.itemsOf.all(id).map(r => ({ kind: r.kind, id: r.item_id, note: r.note, addedAt: r.added_at })),
    addItem: (cid, kind, itemId, note = null) => void s.itemSet.run(cid, kind, itemId, n(note), new Date().toISOString()),
    removeItem: (cid, kind, itemId) => void s.itemDel.run(cid, kind, itemId),
    memberships: (kind, itemId) => s.member.all(kind, itemId).map(r => r.collection_id),
    history: (limit = 200) => s.histAll.all(limit).map(r => ({ at: r.at, kind: r.kind, payload: p(r.payload) })),
    lastHistory() { return this.history(1)[0] ?? null; },
    jobsList: (limit = 50) => s.jobsAll.all(limit).map(r => ({ id: r.id, kind: r.kind, status: r.status, createdAt: r.created_at, finishedAt: r.finished_at, error: r.error })),
    logQuota: (day, units, method) => void s.quotaIn.run(day, units, method, new Date().toISOString()),
    quotaUsed: day => s.quotaSum.get(day).u,
    cacheGet: (url, now) => s.cacheGet.get(url, now)?.body ?? null,
    cacheSet: (url, body, expires) => void s.cacheSet.run(url, body, expires),
    addHistory: (kind, payload) => void s.hist.run(new Date().toISOString(), kind, j(payload)),
    saveJob: x => void s.job.run(x.id, x.kind, x.status, n(x.createdAt), n(x.finishedAt), j(x.result), n(x.error)),
    watch: id => watchOf(s.watchOne.get(id)),
    setWatch(id, { monitor, competitor }) { // campo omitido não muda; since grava na primeira vez que algo liga
      const w = watchOf(s.watchOne.get(id)), m = monitor ?? w.monitor, c = competitor ?? w.competitor;
      s.watchSet.run(id, +m, +c, w.since ?? ((m || c) ? new Date().toISOString() : null), w.lastRun);
      if (competitor === false) s.compOff.run(id); // desmarcado: some dos Meus canais (vinculado => marcado)
      return this.watch(id);
    },
    watchList: () => s.watchAll.all().map(r => ({ channelId: r.channel_id, ...watchOf(r) })),
    setWatchRun: (id, at) => void s.watchRun.run(at, id),
    addAlerts(list) { let k = 0; for (const a of list) k += s.alertIn.run(a.at, a.kind, a.ref, a.channelId, n(a.videoId), j(a.payload)).changes; return k; },
    alerts: (limit = 50) => s.alertAll.all(limit).map(r => ({ id: r.id, at: r.at, kind: r.kind, channelId: r.channel_id, channelTitle: r.channel_title, videoId: r.video_id, payload: p(r.payload), seen: !!r.seen })),
    unseenAlerts: () => s.alertUnseen.get().u,
    markAlertsSeen(ids) { if (ids === 'all') raw.exec('UPDATE alerts SET seen=1'); else for (const id of ids) s.alertSeen.run(id); },
    // statuses opcional: só entradas cujo payload.status está na lista
    lastHistoryOf(kind, statuses) { const r = statuses ? q(`SELECT at,kind,payload FROM history WHERE kind=? AND json_extract(payload,'$.status') IN (${statuses.map(() => '?')}) ORDER BY rowid DESC LIMIT 1`).get(kind, ...statuses) : s.histOf.get(kind); return r ? { at: r.at, kind: r.kind, payload: p(r.payload) } : null; },
    addModel: m => Number(s.modelIn.run(m.anchorId, new Date().toISOString(), j(m.input), j(m.output)).lastInsertRowid),
    model(id) { const r = s.modelOne.get(id); return r ? { id: r.id, anchorId: r.anchor_id, createdAt: r.created_at, input: p(r.input), output: p(r.output) } : null; },
    modelsOf: anchorId => s.modelsBy.all(anchorId).map(r => ({ id: r.id, createdAt: r.created_at, names: (p(r.output)?.conceitos ?? []).map(c => c.nome) })),
    createMyChannel(x) { const at = new Date().toISOString(), r = s.myNew.run(...myArgs(x), at, at); return r.changes ? Number(r.lastInsertRowid) : null; },
    updateMyChannel: (id, x) => s.myUp.run(...myArgs(x), new Date().toISOString(), id).changes > 0, // nome repetido: OR IGNORE, 0 mudanças
    deleteMyChannel: id => s.myDel.run(id).changes > 0,
    myChannel(id) { const r = s.myOne.get(id); return r ? { ...myRow(r), competitors: this.myCompetitorIds(id) } : null; },
    myChannels: () => s.myAll.all().map(r => ({ ...myRow(r), competitorCount: r.n })),
    myCompetitorIds: id => s.compOf.all(id).map(r => r.channel_id),
    setMyCompetitors(id, ids) {
      raw.exec('BEGIN');
      try { s.compClr.run(id); for (const c of ids) { s.compIn.run(id, c); this.setWatch(c, { competitor: true }); } raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
    // Fase 6: produções (pauta mínima na criação; etapas em production_steps) e análises de roteiro por vídeo.
    createProduction: x => Number(s.prodNew.run(x.myId, n(x.theme), n(x.targetMin), n(x.toleranceMin), n(x.style), new Date().toISOString()).lastInsertRowid),
    updateProduction: (id, x) => s.prodUp.run(n(x.theme), n(x.targetMin), n(x.toleranceMin), n(x.style), id).changes > 0,
    production(id) { const r = s.prodOne.get(id); return r ? prodRow(r, s.stepsOf.all(id), true) : null; },
    productions({ myId } = {}) {
      const by = Map.groupBy(s.stepsAll.all(), r => r.prod_id);
      return (myId == null ? s.prodAll.all() : s.prodOf.all(myId)).map(r => prodRow(r, by.get(r.id) ?? [], false));
    },
    // patch só com os campos que mudam; o resto fica como estava.
    setStep(id, step, patch) {
      const r = s.stepsOf.all(id).find(x => x.step === step), v = { ...(r ? stepRow(r) : PENDING), ...patch };
      s.stepSet.run(id, step, v.status, n(v.startedAt), n(v.finishedAt), n(v.ms), j(v.result), n(v.error));
    },
    deleteProduction: id => s.prodDel.run(id).changes > 0,
    interruptRunning: () => Number(s.stepsStop.run(new Date().toISOString()).changes),
    saveScriptAnalysis: (videoId, { lang, output }) => void s.anSet.run(videoId, new Date().toISOString(), n(lang), j(output)),
    scriptAnalysis(videoId) { const r = s.anOne.get(videoId); return r ? { videoId: r.video_id, at: r.at, lang: r.lang, output: p(r.output) } : null; },
    close: () => raw.close(),
  };
}
