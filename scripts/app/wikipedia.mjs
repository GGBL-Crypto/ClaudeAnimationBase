// Fontes do roteiro: Wikipedia REST (sem chave, sem e-mail) e links colados pelo usuário (nunca buscados).
export const UA = 'ClaudeAnimationBase-app/1.0 (local; sem contato)';
const MAX_TEXT = 20000, MAX_EXCERPT = 5000;
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
const LANGS = ['pt', 'en'];
const enc = encodeURIComponent;

// GET JSON na Wikipedia; rede ou HTTP com erro viram "Wikipedia indisponível" (a causa fica de fora, sem URL nem caminho).
async function getJson(fetch, url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } }).catch(() => null);
  if (!r?.ok) throw bad('Wikipedia indisponível', 502);
  return r.json().catch(() => { throw bad('Wikipedia indisponível', 502); });
}
const lang = l => { if (!LANGS.includes(l)) throw bad('Idioma deve ser pt ou en'); };
// Trecho da busca vem com <span> e entidades; vira texto puro.
const plain = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const pageUrl = (l, title) => `https://${l}.wikipedia.org/wiki/${enc(title.replace(/ /g, '_'))}`;

export async function wikiSearch(l, q, { fetch }) {
  lang(l);
  const j = await getJson(fetch, `https://${l}.wikipedia.org/w/rest.php/v1/search/page?q=${enc(q)}&limit=10`);
  return (Array.isArray(j.pages) ? j.pages : []).map(p => ({ title: String(p.title), url: `https://${l}.wikipedia.org/wiki/${enc(p.key ?? String(p.title).replace(/ /g, '_'))}`, snippet: plain(p.excerpt) }));
}

export async function wikiText(l, title, { fetch, now = Date.now }) {
  lang(l);
  const j = await getJson(fetch, `https://${l}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=${enc(title)}`);
  const page = Object.values(j.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined || !page.extract) throw bad('Página da Wikipedia não encontrada', 404);
  return { url: pageUrl(l, page.title), title: page.title, accessed: new Date(now()).toISOString().slice(0, 10), text: page.extract.slice(0, MAX_TEXT), kind: 'wikipedia' };
}

// Link colado: só https, sem credencial; o trecho é o que o usuário colou. Lança com status 400.
export function validateLink({ url, title, excerpt }, now) {
  let u; try { u = new URL(url); } catch { throw bad('Link inválido'); }
  if (typeof url !== 'string' || u.protocol !== 'https:' || u.username || u.password || url.length > 2000) throw bad('Link deve ser https:// com até 2000 caracteres');
  const t = typeof title === 'string' ? title.trim() : '', x = typeof excerpt === 'string' ? excerpt.trim() : '';
  if (!t || t.length > 200) throw bad('Título de 1 a 200 caracteres');
  if (!x || x.length > MAX_EXCERPT) throw bad('Trecho de 1 a 5000 caracteres');
  return { url, title: t, accessed: new Date(now).toISOString().slice(0, 10), text: x, kind: 'link' };
}
