// Casca: menu lateral, sino de alertas, medidor de cota e roteador por hash.
import { h, fmt } from './dom.js';
import { api } from './api.js';
import { alertLink } from './views/overview.js';

const VIEWS = {
  '#/geral': () => import('./views/overview.js'), '#/minerar': () => import('./views/mine.js'), '#/videos': () => import('./views/videos.js'),
  '#/outliers': () => import('./views/outliers.js'), '#/colecoes': () => import('./views/collections.js'),
  '#/favoritos': () => import('./views/collections.js').then(m => ({ render: m.renderFavorites })),
  '#/historico': () => import('./views/history.js'), '#/config': () => import('./views/settings.js'),
  '#/nichos': () => import('./views/niches.js'), '#/concorrentes': () => import('./views/competitors.js'), '#/monitor': () => import('./views/monitor.js'),
};
const MENU = [
  ['Visão geral', '#/geral'], ['Minerar canais', '#/minerar'], ['Minerar vídeos', '#/videos'], ['Outliers', '#/outliers'], ['Nichos', '#/nichos'], ['Concorrentes', '#/concorrentes'],
  ['Coleções', '#/colecoes'], ['Monitoramento', '#/monitor'], ['Favoritos', '#/favoritos'], ['Histórico', '#/historico'], ['Configurações', '#/config'],
];

const meter = h('span', { class: 'quota' }, 'cota …');
const count = h('span', { class: 'badge', hidden: true }), list = h('div', { class: 'alerts', hidden: true });
const bell = h('button', { type: 'button', class: 'bell', onClick: toggleAlerts }, 'Alertas ', count);
const content = h('main', { class: 'content' });
const nav = h('nav', { class: 'menu' }, MENU.map(([label, href]) => href
  ? h('a', { href, class: 'item', dataset: { href } }, label)
  : h('span', { class: 'item off' }, label, h('small', { class: 'soon' }, 'em breve'))));
document.getElementById('app').append(
  nav, h('div', { class: 'main' }, h('header', { class: 'top' }, h('strong', {}, 'Runner de canais'), h('div', { class: 'tools' }, h('span', { class: 'pick' }, bell, list), meter)), content));

async function refreshQuota() {
  try { const q = await api.get('/api/quota'); meter.textContent = `${q.used.toLocaleString('pt-BR')} / ${q.limit.toLocaleString('pt-BR')} hoje`; meter.classList.toggle('low', q.limit - q.used < q.limit * 0.1); }
  catch { meter.textContent = 'cota indisponível'; }
}
async function refreshAlerts() {
  try { const { unseen } = await api.get('/api/alerts?limit=1'); count.textContent = String(unseen); count.hidden = !unseen; }
  catch { count.hidden = true; }
}
// Abre as 20 últimas e marca todas como vistas; a contagem zera ao abrir.
async function toggleAlerts() {
  if (!list.hidden) return void (list.hidden = true);
  list.replaceChildren(h('p', { class: 'dim' }, 'Carregando…')); list.hidden = false;
  try {
    const { alerts } = await api.get('/api/alerts?limit=20');
    list.replaceChildren(alerts.length
      ? h('ul', { class: 'hist' }, alerts.map(a => h('li', { class: a.seen ? 'dim' : null }, alertLink(a), ' ', h('small', { class: 'dim' }, fmt.ago(a.at)))))
      : h('p', { class: 'empty' }, 'Nenhum alerta ainda.'));
    await api.post('/api/alerts/seen', { all: true }); refreshAlerts();
  } catch (e) { list.replaceChildren(h('p', { class: 'err' }, e.message)); }
}
list.addEventListener('click', e => { if (e.target.closest('a')) list.hidden = true; });
window.addEventListener('quota-refresh', () => { refreshQuota(); refreshAlerts(); });
setInterval(refreshAlerts, 300e3);

let seq = 0;
// Cada navegação ganha um root novo; resultado de navegação velha é descartado (root fica fora do DOM).
export async function route(hash) {
  const my = ++seq, [path, query] = (hash || '').split('?');
  const key = VIEWS[path] ? path : '#/geral', root = h('div');
  for (const a of nav.querySelectorAll('a')) a.classList.toggle('on', a.dataset.href === key);
  content.replaceChildren(root);
  try { await (await VIEWS[key]()).render(root, new URLSearchParams(query)); }
  catch (e) { if (my === seq) root.append(h('p', { class: 'err' }, 'Erro ao abrir a tela: ' + e.message)); }
}
window.addEventListener('hashchange', () => route(location.hash));
refreshQuota(); refreshAlerts();
route(location.hash);
