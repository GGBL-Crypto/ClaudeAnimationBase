// Painel do canal: cabeçalho, etiqueta, ações, visão geral (score, receita, capturas), vídeos, análise e concorrentes.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { loadFavs, favButton, collectButton } from './collect.js';
import { analysisTab, similarTab } from './analysis.js';

// Formatos comuns à lista e ao painel; nunca NaN/Infinity/null na tela.
const EST = 'estimativa por vídeos dos últimos 30 dias';
export const dec = n => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export const subsText = n => n == null ? 'oculto' : fmt.num(n);
export const views30 = r => r.views30d != null && r.views30dSource === 'videos' ? h('span', { title: EST }, '≈ ' + fmt.num(r.views30d)) : h('span', {}, fmt.num(r.views30d));
export const freq = n => n == null || !Number.isFinite(n) ? '—' : dec(n) + '/sem';
export const money = rev => rev ? h('span', { title: 'estimativa' }, `≈ US$ ${fmt.num(rev[0])}–${fmt.num(rev[1])}`) : h('span', { class: 'dim' }, 'defina RPM');
export const avatar = (src, cls = 'avatar') => src ? h('img', { src, alt: '', class: cls, loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span', { class: cls });
export const isNew = r => r.ageDays != null && r.ageDays <= 90 ? h('span', { class: 'badge' }, 'NOVA') : null;
export const tagText = r => (r.tag ?? 'sem etiqueta') + (r.faceless == null ? '' : r.faceless ? ' · sem rosto' : ' · com rosto');

// Segue um job por SSE; fecha ao trocar de tela (hashchange) ou se o elemento saiu do DOM.
export function follow(jobId, el, onEvent) {
  const es = api.events(jobId, (ev, d) => { if (!el.isConnected) return es.close(); onEvent(ev, d); });
  window.addEventListener('hashchange', () => es.close(), { once: true });
  return es;
}

const PARTS = [['disparidade', 'Disparidade'], ['novo', 'Canal novo'], ['enxuto', 'Poucos vídeos'], ['ativo', 'Ativo']];
const enc = encodeURIComponent;
const dur = s => !s ? '—' : (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + String(Math.floor(s % 3600 / 60)).padStart(s >= 3600 ? 2 : 1, '0') + ':' + String(s % 60).padStart(2, '0');
export const mult = m => m == null || !Number.isFinite(m) ? '—' : m >= 1 ? `+${dec(Math.round((m - 1) * 100))}% acima da média` : `${dec(Math.round((1 - m) * 100))}% abaixo da média`;
const when = iso => fmt.date(iso) === '—' ? '—' : new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const stat = (k, v) => h('div', {}, h('dt', {}, k), h('dd', {}, v));

// Alterna Seguir/Concorrente (POST /watch) com o estado devolvido pelo servidor.
function watchBtn(c, field, off, on, msg, changed) {
  const btn = h('button', { type: 'button', class: c.watch?.[field] ? 'on' : null, onClick: async () => {
    btn.disabled = true;
    try { c.watch = await api.post(`/api/channels/${enc(c.id)}/watch`, { [field]: !c.watch?.[field] }); btn.classList.toggle('on', c.watch[field]); btn.textContent = c.watch[field] ? on : off; msg.className = 'status'; msg.textContent = ''; changed(); }
    catch (e) { msg.className = 'status err'; msg.textContent = e.message; }
    finally { btn.disabled = false; }
  } }, c.watch?.[field] ? on : off);
  return btn;
}

const soon = label => h('button', { type: 'button', disabled: true }, label + ' ', h('small', { class: 'soon' }, 'em breve'));

function closeBtn(panel) {
  return h('button', { type: 'button', class: 'close', onClick: () => { panel.hidden = true; delete panel.dataset.id; panel.dispatchEvent(new Event('panel-close')); } }, 'Fechar');
}

// Abre o painel; resposta de um canal anterior é descartada (panel.dataset.id mudou).
export async function openChannel(panel, id) {
  panel.hidden = false; panel.dataset.id = id;
  panel.replaceChildren(h('p', { class: 'dim' }, 'Carregando…'));
  let c, cfg;
  try { [c, cfg] = await Promise.all([api.get('/api/channels/' + enc(id)), api.get('/api/config')]); }
  catch (e) { if (panel.dataset.id === id) panel.replaceChildren(closeBtn(panel), h('p', { class: 'err' }, e.message)); return; }
  if (panel.dataset.id === id && panel.isConnected) draw(panel, c, cfg.weights ?? {});
}

function draw(panel, c, weights, tab = 'o') {
  const changed = () => panel.dispatchEvent(new Event('channel-changed'));
  const msg = h('p', { class: 'status' });
  const fail = text => { msg.className = 'status err'; msg.textContent = text; };
  const tag = h('input', { type: 'text', value: c.tag ?? '', maxlength: '60', placeholder: 'Etiqueta', 'aria-label': 'Etiqueta' });
  const face = h('select', { 'aria-label': 'Rosto' }, h('option', { value: '' }, 'Rosto: não definido'), h('option', { value: '1' }, 'Sem rosto'), h('option', { value: '0' }, 'Com rosto'));
  face.value = c.faceless == null ? '' : c.faceless ? '1' : '0';
  // tag e faceless vão sempre juntos: o servidor limpa o lado ausente
  async function saveTag() {
    msg.className = 'status'; msg.textContent = 'Salvando…';
    try {
      const n = await api.post(`/api/channels/${enc(c.id)}/tag`, { tag: tag.value.trim() || null, faceless: face.value === '' ? null : face.value === '1' });
      changed(); if (panel.dataset.id === c.id && panel.isConnected) draw(panel, n, weights, body.dataset.tab); // mantém a aba
    } catch (e) { fail(e.message); }
  }
  const refresh = h('button', { type: 'button', onClick: async () => {
    refresh.disabled = true; msg.className = 'status'; msg.textContent = 'Atualizando…';
    try {
      const { jobId } = await api.post(`/api/channels/${enc(c.id)}/refresh`);
      follow(jobId, panel, (ev, d) => {
        if (ev !== 'end') return;
        changed();
        if (d.status === 'error' || d.result?.failed?.length) { refresh.disabled = false; fail(d.error ?? d.result.failed[0].error); }
        else if (panel.dataset.id === c.id) openChannel(panel, c.id);
      });
    } catch (e) { refresh.disabled = false; fail(e.message); }
  } }, 'Atualizar');

  const body = h('div', { class: 'tab' });
  // body.dataset.tab diz a aba ativa; resposta de aba antiga não sobrescreve a atual
  const pick = t => {
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.t === t); body.dataset.tab = t; body.replaceChildren();
    t === 'v' ? videos(body, c) : t === 'a' ? analysisTab(body, c) : t === 'c' ? similarTab(body, c, id => openChannel(panel, id)) : overview();
  };
  const tabs = h('nav', { class: 'tabs' },
    h('button', { type: 'button', dataset: { t: 'o' }, onClick: () => pick('o') }, 'Visão geral'),
    h('button', { type: 'button', dataset: { t: 'v' }, onClick: () => pick('v') }, 'Vídeos'),
    h('button', { type: 'button', dataset: { t: 'a' }, onClick: () => pick('a') }, 'Análise'),
    h('button', { type: 'button', dataset: { t: 'c' }, onClick: () => pick('c') }, 'Concorrentes'));
  // estrela entra quando Favoritos carrega; falha deixa só o resto das ações
  const star = h('span');
  loadFavs().then(f => star.replaceChildren(favButton('channel', c.id, f))).catch(() => {});

  function overview() {
    const tot = Object.values(weights).reduce((a, x) => a + x, 0) || 1, snaps = c.snapshots ?? [];
    body.append(h('div', {}, // h achata listas e ignora null
      h('p', { class: 'dim' }, 'Dados de ' + fmt.date(c.updatedAt)),
      h('dl', { class: 'stats' }, stat('Inscritos', subsText(c.subs)), stat('Views 30d', views30(c)), stat('Média por vídeo', fmt.num(c.avgViews)),
        stat('Vídeos', fmt.num(c.videoCount)), stat('Idade', c.ageDays == null ? '—' : c.ageDays + ' d'), stat('Frequência', freq(c.frequency))),
      h('h3', {}, 'Score ' + fmt.num(c.score)),
      PARTS.map(([k, label]) => {
        const p = c.scoreParts?.[k] ?? 0, w = weights[k] ?? 0;
        return h('div', { class: 'part' }, h('span', {}, `${label}: ${p.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} × peso ${dec(w)} = ${dec(Math.round(p * w * 100 / tot))} pts`), h('progress', { max: '1', value: String(p) }));
      }),
      h('h3', {}, 'Receita estimada'),
      h('p', {}, money(c.revenue), c.revenue ? ' por mês (estimativa, views 30d × RPM)' : ' em Configurações'),
      h('h3', {}, 'Capturas'),
      snaps.length === 1 ? h('p', { class: 'dim' }, 'histórico começa em ' + fmt.date(snaps[0].at)) : snaps.length ? null : h('p', { class: 'dim' }, 'Sem capturas.'),
      h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, ['Data', 'Inscritos', 'Views'].map(t => h('th', {}, t)))),
        h('tbody', {}, [...snaps].reverse().map(s => h('tr', {}, h('td', {}, when(s.at)), h('td', {}, subsText(s.subs)), h('td', {}, fmt.num(s.views))))))));
  }

  panel.replaceChildren(
    h('header', { class: 'ph' }, avatar(c.avatar, 'avatar big'),
      h('div', { class: 'grow' }, h('h2', {}, c.title ?? c.id), h('div', { class: 'dim' }, c.handle ?? ''),
        h('a', { href: 'https://www.youtube.com/channel/' + enc(c.id), rel: 'noopener noreferrer', target: '_blank' }, 'Visitar canal')),
      closeBtn(panel)),
    h('div', { class: 'row' }, refresh, tag, face, h('button', { type: 'button', onClick: saveTag }, 'Salvar etiqueta')),
    h('div', { class: 'row' }, star, collectButton('channel', c.id), watchBtn(c, 'monitor', 'Seguir', 'Seguindo', msg, changed), watchBtn(c, 'competitor', 'Concorrente', 'É concorrente', msg, changed), soon('Modelar')),
    msg, tabs, body);
  pick(tab);
}

const VCOLS = [['', null], ['Título', 'title'], ['Publicado', 'publishedAt'], ['Duração', 'durationS'], ['Views', 'views'], ['Views/dia', 'viewsPerDay'], ['Múltiplo', 'multiple'], ['Nota', 'nota']];
async function videos(body, c) {
  body.append(h('p', { class: 'dim' }, 'Carregando…'));
  const live = () => body.isConnected && body.dataset.tab === 'v';
  let vs; try { vs = await api.get(`/api/channels/${enc(c.id)}/videos`); } catch (e) { if (live()) body.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
  if (!live()) return;
  if (!vs.length) return body.replaceChildren(h('p', { class: 'dim' }, 'Sem vídeos.'));
  let key = 'viewsPerDay', dir = -1;
  const by = k => { dir = key === k ? -dir : -1; key = k; draw(); };
  function draw() {
    const s = [...vs].sort((a, b) => a[key] == null || b[key] == null ? (a[key] == null) - (b[key] == null) : (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * dir); // null no fim
    body.replaceChildren(h('p', { class: 'dim' }, 'Dados de ' + fmt.date(c.updatedAt)),
      h('table', { class: 'grid videos' },
        h('thead', {}, h('tr', {}, VCOLS.map(([t, k]) => h('th', {}, k ? h('button', { type: 'button', class: 'link', onClick: () => by(k) }, t + (key === k ? (dir > 0 ? ' ▲' : ' ▼') : '')) : t)))),
        h('tbody', {}, s.map(v => h('tr', {},
          h('td', {}, v.thumb ? h('img', { src: v.thumb, alt: '', class: 'thumb', loading: 'lazy' }) : null),
          h('td', {}, v.title ?? v.id), h('td', {}, fmt.date(v.publishedAt)), h('td', {}, dur(v.durationS)), h('td', {}, fmt.num(v.views)),
          h('td', {}, fmt.num(v.viewsPerDay)), h('td', {}, mult(v.multiple)), h('td', {}, v.nota == null ? '—' : v.nota + '/100'))))));
  }
  draw();
}
