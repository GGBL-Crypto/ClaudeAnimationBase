// Nichos: cartões dos grupos (etiqueta, automático, sem grupo) e detalhe com canais, outliers, etiquetar grupo e subnichos pelo Claude.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { openChannel, subsText, views30, avatar, mult, tagText } from './channel.js';

const enc = encodeURIComponent;
const SOURCE = { etiqueta: 'etiqueta', 'automático': 'automático', solo: 'sem grupo' };
// O id vai na URL (pode ter acento e ':'); nunca no caminho da API.
const href = id => '#/nichos?id=' + enc(id);
const badge = n => h('span', { class: 'badge' }, SOURCE[n.source] ?? n.source);
const words = (n, k) => h('ul', { class: 'words' }, (n.topWords ?? []).slice(0, k).map(w => h('li', { class: 'word' }, `${w.word} (${w.count})`)));
const stats = n => `${fmt.num(n.count)} ${n.count === 1 ? 'canal' : 'canais'} · score médio ${fmt.num(n.avgScore)} · ${fmt.num(n.outliers)} outliers (30 dias)`;

function neighbors(n) {
  const ns = n.neighbors ?? [];
  if (!ns.length) return null;
  return h('div', { class: 'nb' }, h('span', { class: 'dim' }, 'Vizinhos:'),
    ns.map(x => h('span', {}, h('a', { href: href(x.id) }, x.name), x.sharedWords?.length ? h('small', { class: 'dim' }, ` (${x.sharedWords.join(', ')})`) : null)));
}

function card(n) {
  return h('article', { class: 'card niche' },
    h('div', { class: 'row' }, h('a', { href: href(n.id), class: 'strong' }, n.name), badge(n)),
    h('p', { class: 'dim' }, stats(n)), words(n, 5),
    n.topTopics?.length ? h('small', { class: 'dim' }, 'Tópicos: ' + n.topTopics.join(', ')) : null,
    neighbors(n));
}

// Etiquetar grupo automático: confirma o número de canais sem etiqueta e abre o grupo já como etiqueta.
function tagBox(n, rows) {
  const free = rows.filter(r => r.tag == null).length;
  const input = h('input', { type: 'text', value: n.suggestedTag ?? '', maxlength: '40', placeholder: 'Etiqueta', 'aria-label': 'Etiqueta do grupo' });
  const msg = h('p', { class: 'status' }), box = h('div', { class: 'confirm', hidden: true });
  const ask = () => {
    const tag = input.value.trim(); if (!tag) return void input.focus();
    const ok = h('button', { type: 'button', class: 'primary', onClick: async () => {
      ok.disabled = true; msg.className = 'status'; msg.textContent = 'Gravando…';
      try { await api.post('/api/niches/tag', { id: n.id, tag }); location.hash = href('tag:' + tag.toLowerCase()); }
      catch (e) { ok.disabled = false; input.disabled = false; box.hidden = true; msg.className = 'status err'; msg.textContent = e.message; }
    } }, 'Gravar');
    box.replaceChildren(h('span', {}, `Gravar a etiqueta em ${free} canais sem etiqueta?`), ok, h('button', { type: 'button', onClick: () => { box.hidden = true; input.disabled = false; } }, 'Cancelar'));
    box.hidden = false; input.disabled = true; // o texto confirmado é o que será gravado
  };
  return h('div', {}, h('div', { class: 'row' }, input, h('button', { type: 'button', onClick: ask }, 'Etiquetar grupo como…')), box, msg);
}

// Subnichos: POST direto (até 180 s). Botão desligado enquanto espera; erro do Claude devolve o prompt para copiar.
function subBox(n, hasOutliers) {
  const out = h('div'), btn = h('button', { type: 'button', disabled: !hasOutliers, onClick: async () => {
    btn.disabled = true; out.replaceChildren(h('p', { class: 'status' }, 'Gerando…'));
    let r;
    try { r = await api.post('/api/niches/subniches', { id: n.id }); }
    catch (e) { btn.disabled = false; return void out.replaceChildren(h('p', { class: 'status err' }, e.message)); }
    btn.disabled = false;
    if (r.error || !Array.isArray(r.subnichos)) {
      const copy = h('textarea', { class: 'copy', readonly: true, 'aria-label': 'Prompt' }); copy.value = r.prompt ?? '';
      return void out.replaceChildren(h('p', { class: 'status err' }, r.error ?? 'Resposta inválida do Claude'),
        h('details', { open: true }, h('summary', {}, 'Prompt para copiar'), copy,
          h('button', { type: 'button', onClick: () => navigator.clipboard?.writeText(copy.value).catch(() => {}) }, 'Copiar')));
    }
    out.replaceChildren(h('div', { class: 'cards' }, r.subnichos.map(s => h('article', { class: 'card niche' },
      h('strong', {}, String(s.nome ?? '')), h('p', {}, String(s.porque ?? '')),
      h('small', { class: 'dim' }, 'Moldes de título:'), h('ul', {}, (Array.isArray(s.exemplos) ? s.exemplos : []).map(x => h('li', {}, String(x)))),
      h('small', { class: 'dim' }, 'gerado pelo Claude; confira antes de usar')))));
  } }, 'Sugerir subnichos (Claude)');
  return h('div', {}, h('div', { class: 'row' }, btn, hasOutliers ? null : h('small', { class: 'dim' }, 'Sem outliers recentes neste nicho.')), out);
}

const COLS = ['Canal', 'Etiqueta', 'Inscritos', 'Views 30d', 'Média/vídeo', 'Score', ''];
function channels(rows, panel) {
  return h('div', { class: 'tbl' }, h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, COLS.map(t => h('th', {}, t)))),
    h('tbody', {}, rows.map(r => h('tr', {},
      h('td', {}, h('div', { class: 'ch' }, avatar(r.avatar), h('div', {}, h('strong', {}, r.title ?? r.id), h('small', { class: 'dim block' }, 'dados de ' + fmt.date(r.updatedAt))))),
      h('td', {}, tagText(r)), h('td', {}, subsText(r.subs)), h('td', {}, views30(r)), h('td', {}, fmt.num(r.avgViews)), h('td', {}, fmt.num(r.score)),
      h('td', {}, h('button', { type: 'button', onClick: () => openChannel(panel, r.id) }, 'Analisar')))))));
}

function outliers(vs) {
  if (!vs.length) return h('p', { class: 'empty' }, 'Nenhum outlier recente neste nicho.');
  return h('ul', { class: 'cmp-vids' }, vs.map(v => h('li', {},
    v.thumb ? h('img', { src: v.thumb, alt: '', class: 'thumb', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span', { class: 'thumb' }),
    h('div', {}, h('a', { href: 'https://www.youtube.com/watch?v=' + enc(v.id), target: '_blank', rel: 'noopener noreferrer' }, v.title ?? v.id),
      h('div', { class: 'dim' }, `${v.channelTitle ?? v.channelId} · publicado ${fmt.ago(v.publishedAt)} · dados de ${fmt.date(v.capturedAt)}`),
      h('div', {}, `${fmt.num(v.views)} views · ${fmt.num(v.viewsPerDay)}/dia · ${mult(v.multiple)}`)))));
}

export async function render(root, params) {
  const id = params.get('id'), box = h('div'), panel = h('aside', { class: 'panel', hidden: true });
  const fail = e => { if (root.isConnected) box.replaceChildren(h('p', { class: 'err' }, e.message)); };
  panel.addEventListener('channel-changed', () => load());
  root.append(h('h1', {}, 'Nichos'), h('div', { class: 'split' }, h('div', { class: 'list' }, box), panel));
  let seq = 0;

  async function load() {
    const my = ++seq; let got;
    try { got = await api.get(id ? '/api/niches/detail?id=' + enc(id) : '/api/niches'); } catch (e) { if (my === seq) fail(e); return; }
    if (my !== seq || !root.isConnected) return;
    id ? detail(got) : list(got.niches ?? []);
  }

  function list(niches) {
    if (!niches.length) return void box.replaceChildren(h('p', { class: 'empty' }, 'Nada ainda. Minere canais para formar nichos.'));
    box.replaceChildren(h('div', { class: 'cards' }, niches.map(card)));
  }

  function detail({ niche: n, rows, outliers: vs }) {
    rows = rows.filter(Boolean);
    box.replaceChildren(...[h('p', {}, h('a', { href: '#/nichos' }, '← Todos os nichos')),
      h('div', { class: 'row' }, h('h2', { class: 'niche-h' }, n.name), badge(n)),
      h('p', { class: 'dim' }, stats(n)), words(n, 10), neighbors(n), // replaceChildren(null) escreve "null"
      n.source === 'automático' ? tagBox(n, rows) : null,
      subBox(n, vs.length > 0),
      h('h3', {}, 'Canais'), channels(rows, panel),
      h('h3', {}, 'Outliers recentes (30 dias)'), outliers(vs)].filter(Boolean));
  }

  await load();
}
