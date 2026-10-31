// Sugestões de tema da pauta: outliers recentes dos concorrentes e o plano de 30 dias da modelagem de origem.
const DAY = 864e5;

// competitorRows = vídeos (de videoRowsAll) dos concorrentes do canal; model = modelagem do perfil ou null.
// Devolve [{ tema, origem: 'outlier' | 'plano30', ref }]; ref traz o número coletado com data (outlier) ou o dia do plano.
export function suggestThemes({ my, competitorRows, model, cfg, now }) {
  const outliers = competitorRows
    .filter(v => v.multiple != null && v.multiple >= cfg.outlierMin && now - Date.parse(v.publishedAt) <= 90 * DAY)
    .sort((a, b) => b.multiple - a.multiple).slice(0, 15)
    .map(v => ({ tema: String(v.title ?? '').slice(0, 200), origem: 'outlier', ref: { videoId: v.id, views: v.views, capturedAt: v.capturedAt, multiple: v.multiple } }));
  const plano = model?.output?.conceitos?.[my.conceptIndex]?.plano30 ?? [];
  return [...outliers, ...plano.map(p => ({ tema: p.tema, origem: 'plano30', ref: { dia: p.dia } }))];
}
