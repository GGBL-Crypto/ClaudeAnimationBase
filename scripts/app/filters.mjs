// Filtros, recortes prontos e ordenação sobre linhas de channelRow.
const norm = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// sort: lista de [campo, direção], aplicada em ordem de prioridade
export const PRESETS = {
  espelhar: { label: 'Pra você espelhar', filters: { scoreMin: 70, videosMax: 60, daysSinceLastMax: 14 }, sort: [['score', 'desc']] },
  novos: { label: 'Canais novos', filters: { ageMax: 90 }, sort: [['avgViews', 'desc']] },
  muitaView: { label: 'Muita view, pouco inscrito', filters: { disparityMin: 1 }, sort: [['disparity', 'desc']] },
  fabrica: { label: 'Fábrica de vídeo', filters: { frequencyMin: 5 }, sort: [['frequency', 'desc']] },
  enxuto: { label: 'Catálogo enxuto', filters: { videosMax: 29 }, sort: [['avgViews', 'desc']] },
  semana: { label: 'Postou esta semana', filters: { daysSinceLastMax: 7 }, sort: [['lastPublished', 'desc']] },
  categoria: { label: 'Por categoria', filters: {}, sort: [['tag', 'asc'], ['score', 'desc']] },
  tudo: { label: 'Tudo', filters: {}, sort: [['score', 'desc']] },
};

// [chave do filtro, campo da linha, teste(valor, filtro)]
const eq = (v, f) => v === f;
const RULES = [
  ['lang', 'lang', eq], ['country', 'country', eq], ['tag', 'tag', eq], ['faceless', 'faceless', eq],
  ['subsMin', 'subs', (v, f) => v >= f], ['subsMax', 'subs', (v, f) => v <= f],
  ['views30dMin', 'views30d', (v, f) => v >= f], ['views30dMax', 'views30d', (v, f) => v <= f],
  ['createdAfter', 'createdAt', (v, f) => v >= f],
  ['frequencyMin', 'frequency', (v, f) => v >= f], ['videosMax', 'videoCount', (v, f) => v <= f],
  ['ageMax', 'ageDays', (v, f) => v <= f], ['scoreMin', 'score', (v, f) => v >= f],
  ['disparityMin', 'disparity', (v, f) => v >= f], ['daysSinceLastMax', 'daysSinceLast', (v, f) => v <= f],
];

export function applyFilters(rows, f = {}) {
  const q = f.q ? norm(f.q) : '';
  return rows.filter((r) => {
    if (q && !norm(r.title).includes(q) && !norm(r.handle).includes(q)) return false;
    return RULES.every(([k, field, ok]) => {
      if (f[k] == null) return true;
      const v = r[field];
      return v == null ? !!f.includeUnknown : ok(v, f[k]);
    });
  });
}

export function sortRows(rows, key, dir = 'desc') {
  const s = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; // null sempre no fim
    return s * (key === 'tag' ? String(x).localeCompare(String(y), 'pt') : x < y ? -1 : x > y ? 1 : 0);
  });
}

export function runPreset(rows, presetId, extra = {}) {
  const p = PRESETS[presetId];
  let out = applyFilters(rows, { ...p.filters, ...extra });
  for (const [k, d] of [...p.sort].reverse()) out = sortRows(out, k, d); // sort estável: menos prioritário primeiro
  return out;
}

const NUM = ['subsMin', 'subsMax', 'views30dMin', 'views30dMax', 'frequencyMin', 'videosMax', 'ageMax', 'scoreMin', 'disparityMin', 'daysSinceLastMax'];
const BOOL = ['faceless', 'includeUnknown'];
const STR = ['q', 'lang', 'country', 'tag', 'createdAfter'];
export function parseFilters(params) {
  const f = {};
  for (const k of STR) if (params.get(k)) f[k] = params.get(k);
  for (const k of NUM) { const v = params.get(k); if (v != null && v !== '' && Number.isFinite(Number(v))) f[k] = Number(v); }
  for (const k of BOOL) { const v = params.get(k); if (v != null) f[k] = v === '1' || v === 'true'; }
  return f;
}
