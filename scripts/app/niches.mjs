// Nichos sem LLM: etiqueta manual, agrupamento por semelhança entre os sem etiqueta e vizinhos (puro).
import { similarChannels, titleWords, topicName } from './analysis.mjs';

const DAY = 86400000;
const tally = (items) => { const m = new Map(); for (const x of items) m.set(x, (m.get(x) || 0) + 1); return m; };
const top = (m, k) => [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, k);

export function buildNiches({ texts, rows, videos, now, cfg }) {
  if (!texts.length) return { niches: [], total: 0 };
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  const tagOf = (c) => String(rowOf.get(c.id)?.tag ?? '').trim();
  const groups = new Map(); // id -> { id, name, source, members }
  const add = (id, name, source, c) => { if (!groups.has(id)) groups.set(id, { id, name, source, members: [] }); groups.get(id).members.push(c); };
  const untagged = [];
  for (const c of texts) { const tag = tagOf(c); if (tag) add(`tag:${tag.toLowerCase()}`, tag, 'etiqueta', c); else untagged.push(c); }

  // União por ligação simples entre os sem etiqueta.
  // ponytail: similarChannels é O(n²) entre os sem etiqueta; índice invertido por palavra se passar de ~3 000 canais.
  const parent = new Map(untagged.map((c) => [c.id, c.id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const min = cfg.nicheMin ?? 25;
  for (const c of untagged) for (const o of similarChannels(c, untagged, Infinity)) if (o.score >= min) parent.set(find(o.id), find(c.id));
  const comps = new Map();
  for (const c of untagged) { const r = find(c.id); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(c); }
  const solo = [];
  for (const m of comps.values()) {
    if (m.length < 2) { solo.push(...m); continue; }
    const id = m.map((c) => c.id).sort()[0];
    groups.set(`c:${id}`, { id: `c:${id}`, name: '', source: 'automático', members: m });
  }

  const list = [...groups.values()];
  if (solo.length) list.push({ id: 'solo', name: 'Sem grupo', source: 'solo', members: solo });
  const niches = list.map((g) => {
    const ids = g.members.map((c) => c.id), idSet = new Set(ids);
    const words = tally(g.members.flatMap((c) => c.titles.flatMap(titleWords)));
    const topWords = top(words, 10).map(([word, count]) => ({ word, count }));
    const scores = ids.map((i) => rowOf.get(i)?.score).filter(Number.isFinite);
    const outliers = videos.filter((v) => idSet.has(v.channelId) && v.multiple >= (cfg.outlierMin ?? 2) && now - Date.parse(v.publishedAt) <= 30 * DAY).length;
    const name = g.source === 'automático' ? topWords.slice(0, 3).map((w) => w.word).join(' · ') || g.id : g.name;
    return {
      id: g.id, name, source: g.source, channelIds: ids, count: ids.length,
      avgScore: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null,
      outliers, topWords,
      topTopics: top(tally(g.members.flatMap((c) => (c.topics || []).map(topicName))), 3).map(([t]) => t),
      suggestedTag: g.source === 'automático' ? topWords[0]?.word ?? null : null,
      neighbors: [], _words: words,
    };
  });

  // Vizinhos: Jaccard das 20 palavras mais frequentes de cada nicho.
  const real = niches.filter((n) => n.source !== 'solo');
  const top20 = new Map(real.map((n) => [n.id, top(n._words, 20).map(([w]) => w)]));
  for (const n of real) {
    const a = new Set(top20.get(n.id));
    n.neighbors = real.filter((o) => o.id !== n.id).map((o) => {
      const b = new Set(top20.get(o.id)), shared = top20.get(n.id).filter((w) => b.has(w));
      const u = a.size + b.size - shared.length;
      return { id: o.id, name: o.name, j: u ? shared.length / u : 0, sharedWords: shared.slice(0, 5) };
    }).filter((x) => x.j >= 0.1).sort((x, y) => y.j - x.j || x.name.localeCompare(y.name, 'pt')).slice(0, 3)
      .map(({ id, name, j, sharedWords }) => ({ id, name, score: Math.round(100 * j), sharedWords }));
  }
  for (const n of niches) delete n._words;
  niches.sort((a, b) => (a.source === 'solo') - (b.source === 'solo') || b.count - a.count || a.name.localeCompare(b.name, 'pt'));
  return { niches, total: niches.length };
}
