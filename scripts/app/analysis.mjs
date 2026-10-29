// Análise de títulos, duração, horários e canais semelhantes (puro: sem banco, sem rede).
const norm = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const set = (s) => new Set(s.split(/\s+/));
const STOP = new Set([
  ...set('the and for with you your this that what how why from are was were have has had not but all can will just about into over than then they them their its our out who when where which while more most some any one two new best top'),
  ...set('que para com uma por como mais dos das seu sua nos nas aos isso esta este estas estes essa esse foi ser sao tem ele ela eles elas mas ate sem sobre entre depois antes quando onde qual quem muito pelo pela pelos pelas numa num'),
  ...set('los las del una por con para como que mas sus este esta estos estas ese esa eso fue ser son tiene pero hasta sin sobre entre despues antes cuando donde cual quien muy todo todos'),
]);

export const titleWords = (title) => norm(title).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP.has(w));

export function topicName(url) {
  const seg = String(url).split('/').pop();
  try { return decodeURIComponent(seg).replace(/_/g, ' '); } catch { return seg.replace(/_/g, ' '); }
}

const mean = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null);
const frac = (n, d) => (d ? Math.round((n / d) * 100) / 100 : 0);
const argmax = (a) => (a.some((x) => x > 0) ? a.indexOf(Math.max(...a)) : null);

function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function analyzeChannel(videos, snaps) {
  const count = videos.length;
  const counts = new Map();
  for (const v of videos) for (const w of titleWords(v.title)) counts.set(w, (counts.get(w) || 0) + 1);
  const topWords = [...counts].filter(([, c]) => c >= 2).map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : 1)).slice(0, 10);
  const durs = videos.map((v) => v.durationS).filter(Number.isFinite);
  const weekday = Array(7).fill(0), hour = Array(24).fill(0);
  for (const v of videos) {
    const d = new Date(v.publishedAt);
    if (Number.isNaN(d.getTime())) continue;
    weekday[d.getUTCDay()]++; hour[d.getUTCHours()]++;
  }
  const points = [...snaps].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).map(({ at, subs, views }) => ({ at, subs, views }));
  return {
    count,
    titles: {
      avgChars: mean(videos.map((v) => String(v.title).length)),
      avgWords: mean(videos.map((v) => String(v.title).split(' ').filter(Boolean).length)),
      withNumber: frac(videos.filter((v) => /\d/.test(v.title)).length, count),
      withQuestion: frac(videos.filter((v) => /[?¿]/.test(v.title)).length, count),
      topWords,
    },
    duration: {
      medianS: median(durs),
      short: durs.filter((s) => s < 240).length,
      medium: durs.filter((s) => s >= 240 && s <= 1200).length,
      long: durs.filter((s) => s > 1200).length,
    },
    publish: { weekday, hour, topWeekday: argmax(weekday), topHour: argmax(hour) },
    growth: { points, since: points[0]?.at ?? null, enough: points.length >= 2 },
  };
}

export const jaccard = (a, b) => {
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  const u = a.size + b.size - i;
  return u ? i / u : 0;
};

export function similarChannels(target, others, k = 10) {
  const words = (c) => new Set(c.titles.flatMap(titleWords));
  const topics = (c) => new Set((c.topics || []).map(topicName));
  const tw = words(target), tt = topics(target);
  const freq = new Map();
  for (const w of target.titles.flatMap(titleWords)) freq.set(w, (freq.get(w) || 0) + 1);
  const out = [];
  for (const o of others) {
    if (o.id === target.id) continue;
    const ow = words(o), ot = topics(o);
    const jw = jaccard(tw, ow);
    const score = Math.round(100 * (tt.size || ot.size ? 0.7 * jw + 0.3 * jaccard(tt, ot) : jw));
    if (!score) continue;
    const sharedWords = [...tw].filter((w) => ow.has(w)).sort((a, b) => freq.get(b) - freq.get(a) || (a < b ? -1 : 1)).slice(0, 5);
    out.push({ id: o.id, title: o.title, score, sharedWords, sharedTopics: [...tt].filter((t) => ot.has(t)) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, k);
}
