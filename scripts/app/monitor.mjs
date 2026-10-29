// Monitoramento: custo, alertas, decisão do automático e a coleta.
import { ingestChannels } from './mine.mjs';
import { quotaDay } from './youtube.mjs';
const DAY = 864e5;

// unidades de cota: 1 por lote de 50 canais + 2 por canal (playlist + vídeos)
export const estimateMonitor = n => n ? Math.ceil(n / 50) + 2 * n : 0;

export function detectAlerts({ channelId, at, now, cfg, before, after }) {
  const out = [], seen = new Set(before.videoIds), mk = (kind, ref, payload, videoId = null) => out.push({ channelId, at, kind, ref, videoId, payload });
  for (const v of after.videos) {
    const age = now - Date.parse(v.publishedAt);
    if (!seen.has(v.id) && age <= 7 * DAY) mk('newVideo', v.id, { title: v.title }, v.id);
    if (age <= 30 * DAY && v.multiple >= cfg.outlierMin) mk('outlier', v.id, { title: v.title, multiple: v.multiple }, v.id);
  }
  const from = before.subs, to = after.subs;
  if (from > 0 && to != null && to - from >= 100 && (to - from) * 100 >= from * cfg.subsJumpPct) mk('subsJump', `${channelId}@${at}`, { from, to, pct: Math.round((to - from) * 100 / from) });
  return out;
}

export function autoRunDecision({ auto, monitored, lastAt, now, remaining, estimate }) {
  if (!auto) return 'off';
  if (monitored === 0) return 'none';
  if (lastAt && now - Date.parse(lastAt) < DAY) return 'recent';
  return estimate > remaining ? 'quota' : 'run';
}

// Coleta dos canais seguidos. O yt vem com fresh: true. Primeira coleta de um canal = linha de base, sem alerta.
export async function runMonitor(yt, db, cfg, report, at, now) {
  const ids = db.watchList().filter(w => w.monitor).map(w => w.channelId);
  if (!ids.length) throw new Error('Nenhum canal seguido');
  const cost = estimateMonitor(ids.length), remaining = cfg.quotaLimit - db.quotaUsed(quotaDay(now));
  if (cost > remaining) throw new Error(`Cota insuficiente: monitorar ${ids.length} canais custa ~${cost} unidades, restam ${remaining}`);
  const last = id => db.channelSnapshots(id).at(-1)?.subs ?? null;
  const prev = new Map(ids.map(id => [id, { videoIds: db.channelVideos(id).map(v => v.id), subs: last(id), baseline: !db.watch(id).lastRun }]));
  const { ok: got, failed } = await ingestChannels(yt, db, ids, report, at);
  const ok = [], baseline = []; let alerts = 0;
  for (const id of got) {
    const { baseline: first, ...before } = prev.get(id);
    try { // falha de um canal não derruba os outros
      if (first) baseline.push(id);
      else alerts += db.addAlerts(detectAlerts({ channelId: id, at, now, cfg, before, after: { subs: last(id), videos: db.videoRows(id, now) } }));
      db.setWatchRun(id, at); ok.push(id);
    } catch (e) { failed.push({ id, error: e.message }); }
  }
  return { ok, failed, alerts, baseline };
}
