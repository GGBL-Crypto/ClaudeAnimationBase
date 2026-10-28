// Banco local do webapp (node:sqlite). Colunas snake_case, objetos camelCase.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { channelRow, videoRow } from './metrics.mjs';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS channels(id TEXT PRIMARY KEY, title, handle, country, lang, avatar, created_at, uploads, topics, hidden_subs INT, tag, faceless INT, added_at);
CREATE TABLE IF NOT EXISTS channel_snapshots(channel_id TEXT NOT NULL REFERENCES channels(id), at TEXT NOT NULL, subs INT, views INT, videos INT, PRIMARY KEY(channel_id, at));
CREATE TABLE IF NOT EXISTS videos(id TEXT PRIMARY KEY, channel_id TEXT NOT NULL REFERENCES channels(id), title, published_at, duration, thumb, tags, lang);
CREATE TABLE IF NOT EXISTS video_snapshots(video_id TEXT NOT NULL REFERENCES videos(id), at TEXT NOT NULL, views INT, likes INT, comments INT, PRIMARY KEY(video_id, at));
CREATE TABLE IF NOT EXISTS quota_log(day TEXT, units INT, method TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS cache(url TEXT PRIMARY KEY, body TEXT, expires INT);
CREATE TABLE IF NOT EXISTS history(at TEXT, kind TEXT, payload TEXT);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, kind, status, created_at, finished_at, result TEXT, error);
`;
const n = x => x ?? null; // node:sqlite não aceita undefined
const j = x => (x == null ? null : JSON.stringify(x));
const p = s => (s == null ? null : JSON.parse(s));

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  raw.exec(SCHEMA);
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
    job: q('INSERT OR REPLACE INTO jobs(id,kind,status,created_at,finished_at,result,error) VALUES(?,?,?,?,?,?,?)'),
  };
  const channelSnapshots = id => s.snaps.all(id).map(r => ({ ...r }));
  const channelVideos = id => s.vids.all(id).map(r => ({ id: r.id, channelId: r.channel_id, title: r.title, publishedAt: r.published_at, duration: r.duration, thumb: r.thumb, tags: p(r.tags), lang: r.lang, views: r.views }));
  const row = (r, now, cfg) => channelRow(chRow(r), channelSnapshots(r.id), channelVideos(r.id), now, cfg);
  return {
    raw,
    upsertChannel: c => void s.upCh.run(c.id, n(c.title), n(c.handle), n(c.country), n(c.lang), n(c.avatar), n(c.createdAt), n(c.uploads), j(c.topics), c.hiddenSubs == null ? null : +!!c.hiddenSubs, c.addedAt ?? new Date().toISOString()), // tag/faceless/added_at só mudam por setChannelTag/insert
    addChannelSnapshot: (id, at, x) => void s.chSnap.run(id, at, n(x.subs), n(x.views), n(x.videos)),
    upsertVideo: v => void s.upVid.run(v.id, v.channelId, n(v.title), n(v.publishedAt), n(v.duration), n(v.thumb), j(v.tags), n(v.lang)),
    addVideoSnapshot: (id, at, x) => void s.vidSnap.run(id, at, n(x.views), n(x.likes), n(x.comments)),
    setChannelTag: (id, { tag, faceless }) => void s.tag.run(n(tag), faceless == null ? null : +!!faceless, id),
    channelSnapshots,
    channelVideos,
    channelRows: (now, cfg) => s.chAll.all().map(r => row(r, now, cfg)),
    channel(id, now, cfg) { const r = s.chOne.get(id); return r ? { ...row(r, now, cfg), snapshots: channelSnapshots(id) } : null; },
    videoRows(id, now) { const vs = channelVideos(id); return vs.map(v => videoRow(v, vs, now)); },
    logQuota: (day, units, method) => void s.quotaIn.run(day, units, method, new Date().toISOString()),
    quotaUsed: day => s.quotaSum.get(day).u,
    cacheGet: (url, now) => s.cacheGet.get(url, now)?.body ?? null,
    cacheSet: (url, body, expires) => void s.cacheSet.run(url, body, expires),
    addHistory: (kind, payload) => void s.hist.run(new Date().toISOString(), kind, j(payload)),
    saveJob: x => void s.job.run(x.id, x.kind, x.status, n(x.createdAt), n(x.finishedAt), j(x.result), n(x.error)),
    close: () => raw.close(),
  };
}
