// Mineração, importação e atualização de canais: YouTube -> banco.
const ID = /^UC[\w-]{22}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const FATAL = new Set(['quotaExceeded', 'keyInvalid']); // erros que valem para a rodada toda
const num = x => (x == null ? null : Number(x));
const same = (a, b) => !!a && Object.keys(b).every(k => (a[k] ?? null) === b[k]); // snapshot igual ao último: não grava de novo
const dec = s => { try { return decodeURIComponent(s); } catch { return s; } };

function parseOne(s) {
  if (ID.test(s)) return { id: s };
  if (/^@[\w.-]+$/.test(s)) return { handle: s };
  let u; try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
  if (!HOSTS.has(u.hostname)) return null;
  const [a, b] = u.pathname.split('/').filter(Boolean).map(dec);
  if (a?.startsWith('@') && /^@[\w.-]+$/.test(a)) return { handle: a };
  if (a === 'channel' && ID.test(b)) return { id: b };
  if (a === 'user' && b) return { username: b };
  return null; // /c/x e o resto
}
export function parseChannelInput(text) {
  const items = [], invalid = [], seen = new Set();
  for (const raw of String(text).split(/[\n,]+/)) {
    const s = raw.trim(); if (!s) continue;
    const it = parseOne(s);
    if (!it) invalid.push(s);
    else if (!seen.has(JSON.stringify(it))) { seen.add(JSON.stringify(it)); items.push(it); }
  }
  return { items, invalid };
}

// Idioma: defaultLanguage do canal; senão o prefixo de 2 letras mais comum do áudio dos vídeos.
function channelLang(c, vids) {
  const d = /^[a-z]{2}/i.exec(c.snippet?.defaultLanguage ?? '')?.[0].toLowerCase();
  if (d) return d;
  const n = new Map();
  for (const v of vids) { const l = /^[a-z]{2}/i.exec(v.snippet?.defaultAudioLanguage ?? '')?.[0].toLowerCase(); if (l) n.set(l, (n.get(l) ?? 0) + 1); }
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function ingestChannels(yt, db, ids, report, at) {
  ids = [...new Set(ids)];
  const ok = [], failed = []; let done = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const got = new Map((await yt.channels({ ids: batch })).filter(c => batch.includes(c.id)).map(c => [c.id, c]));
    for (const id of batch) {
      const c = got.get(id);
      if (!c) failed.push({ id, error: 'Canal não encontrado' });
      else try {
        const uploads = c.contentDetails?.relatedPlaylists?.uploads ?? null;
        let vids = [];
        if (uploads) try { vids = await yt.videos(await yt.uploads(uploads)); } catch (e) { if (e.reason !== 'playlistNotFound') throw e; } // sem playlist: canal fica sem vídeos
        vids = vids.filter(v => v.snippet?.channelId === id);
        const st = c.statistics ?? {}, hidden = !!st.hiddenSubscriberCount;
        db.upsertChannel({ id, title: c.snippet?.title, handle: c.snippet?.customUrl, country: c.snippet?.country, lang: channelLang(c, vids), avatar: c.snippet?.thumbnails?.default?.url, createdAt: c.snippet?.publishedAt, uploads, topics: c.topicDetails?.topicCategories, hiddenSubs: hidden });
        const cs = { subs: hidden ? null : num(st.subscriberCount), views: num(st.viewCount), videos: num(st.videoCount) };
        if (!same(db.channelSnapshots(id).at(-1), cs)) db.addChannelSnapshot(id, at, cs);
        for (const v of vids) {
          db.upsertVideo({ id: v.id, channelId: id, title: v.snippet.title, publishedAt: v.snippet.publishedAt, duration: v.contentDetails?.duration, thumb: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url, tags: v.snippet.tags, lang: v.snippet.defaultAudioLanguage });
          const vs = { views: num(v.statistics?.viewCount), likes: num(v.statistics?.likeCount), comments: num(v.statistics?.commentCount) };
          if (!same(db.latestVideoSnapshot(v.id), vs)) db.addVideoSnapshot(v.id, at, vs);
        }
        ok.push(id);
      } catch (e) {
        if (FATAL.has(e.reason)) throw e; // o que já foi gravado fica
        failed.push({ id, error: e.message });
      }
      report(`Canal ${c?.snippet?.title ?? id}`, ++done, ids.length);
    }
  }
  return { ok, failed };
}

export async function mineKeyword(yt, db, q, report, at) {
  const ids = [...new Set([...await yt.searchIds(q, 'video'), ...await yt.searchIds(q, 'channel')])]; // em série: cota esgotada não gasta a 2ª busca
  const r = await ingestChannels(yt, db, ids, report, at);
  db.addHistory('mine', { q, found: ids.length });
  return r;
}

export async function importChannels(yt, db, text, report, at) {
  const { items, invalid } = parseChannelInput(text), ids = [];
  for (const it of items) {
    if (it.id) { ids.push(it.id); continue; }
    const [c] = await yt.channels(it.handle ? { forHandle: it.handle } : { forUsername: it.username });
    if (c) ids.push(c.id); else invalid.push(it.handle ?? it.username);
  }
  return { ...await ingestChannels(yt, db, ids, report, at), invalid };
}

export const refreshChannel = (yt, db, id, report, at) => ingestChannels(yt, db, [id], report, at);
