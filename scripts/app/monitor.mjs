// Regras puras do monitoramento: custo, alertas e decisão do automático.
const DAY = 864e5;

// unidades de cota: 1 por lote de 50 canais + 2 por canal (playlist + vídeos)
export const estimateMonitor = n => n ? Math.ceil(n / 50) + 2 * n : 0;

export function detectAlerts({ channelId, at, now, cfg, before, after }) {
  const out = [], seen = new Set(before.videoIds), mk = (kind, ref, payload) => out.push({ channelId, at, kind, ref, payload });
  for (const v of after.videos) {
    const age = now - Date.parse(v.publishedAt);
    if (!seen.has(v.id) && age <= 7 * DAY) mk('newVideo', v.id, { title: v.title });
    if (age <= 30 * DAY && v.multiple >= cfg.outlierMin) mk('outlier', v.id, { title: v.title, multiple: v.multiple });
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
