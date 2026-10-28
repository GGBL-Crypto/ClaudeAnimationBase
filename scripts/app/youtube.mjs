// Cliente da YouTube Data API v3: cache por URL (sem a chave) e registro de cota.
export const COSTS = { search: 100, channels: 1, playlistItems: 1, videos: 1 };
const BASE = 'https://www.googleapis.com/youtube/v3/';
const MSG = { quotaExceeded: 'Cota do YouTube esgotada hoje', keyInvalid: 'Chave da API inválida' };

// Dia da cota = data no Pacífico (o YouTube zera à meia-noite de lá).
export const quotaDay = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);
export const estimateMine = (channelCount = 50) => 2 * COSTS.search + Math.ceil(channelCount / 50) + channelCount * 2;

export class YouTubeError extends Error {
  constructor(message, reason, status) { super(message); this.name = 'YouTubeError'; this.reason = reason; this.status = status; }
}
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));

export function createYouTube({ key, db, cfg, fetch = globalThis.fetch, now = Date.now }) {
  async function call(method, params) {
    if (!key) throw new YouTubeError('Configure a chave da API', 'noKey', 0);
    const u = new URL(method, BASE);
    for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
    const url = u.toString(); // chave vai no cabeçalho: nunca na URL, no cache ou em erro
    const hit = db.cacheGet(url, now());
    if (hit) return JSON.parse(hit);
    const r = await fetch(url, { headers: { 'x-goog-api-key': key } });
    db.logQuota(quotaDay(now()), COSTS[method], method); // a cota é gasta mesmo com erro HTTP
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const reason = body.error?.errors?.[0]?.reason ?? null;
      throw new YouTubeError(MSG[reason] ?? body.error?.message ?? `YouTube HTTP ${r.status}`, reason, r.status);
    }
    db.cacheSet(url, JSON.stringify(body), now() + cfg.cacheHours * 36e5);
    return body;
  }
  const batched = async (method, ids, part) => (await Promise.all(chunks(ids, 50).map(c => call(method, { part, id: c.join(',') })))).flatMap(b => b.items ?? []);
  return {
    call,
    async searchIds(q, type, max = 50) {
      const b = await call('search', { part: 'snippet', q, type, maxResults: Math.min(max, 50) });
      return [...new Set((b.items ?? []).map(i => type === 'video' ? i.snippet?.channelId : i.id?.channelId).filter(Boolean))];
    },
    async channels({ ids, forHandle, forUsername } = {}) {
      const part = 'snippet,statistics,contentDetails,topicDetails';
      if (ids) return batched('channels', ids, part);
      return (await call('channels', { part, forHandle, forUsername })).items ?? [];
    },
    async uploads(playlistId, max = 30) {
      const out = []; let pageToken;
      do {
        const b = await call('playlistItems', { part: 'contentDetails', playlistId, maxResults: Math.min(max - out.length, 50), pageToken });
        out.push(...(b.items ?? []).map(i => i.contentDetails?.videoId).filter(Boolean)); pageToken = b.nextPageToken;
      } while (pageToken && out.length < max);
      return out.slice(0, max);
    },
    videos: ids => batched('videos', ids, 'snippet,statistics,contentDetails'),
  };
}
