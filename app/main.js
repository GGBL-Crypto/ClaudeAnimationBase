// Casca: menu lateral, medidor de cota e roteador por hash.
import { h } from './dom.js';
import { api } from './api.js';

const VIEWS = { '#/minerar': () => import('./views/mine.js'), '#/config': () => import('./views/settings.js') };
const MENU = [
  ['Visão geral'], ['Minerar canais', '#/minerar'], ['Minerar vídeos'], ['Outliers'], ['Nichos'], ['Concorrentes'],
  ['Coleções'], ['Monitoramento'], ['Favoritos'], ['Histórico'], ['Configurações', '#/config'],
];

const meter = h('span', { class: 'quota' }, 'cota …');
const content = h('main', { class: 'content' });
const nav = h('nav', { class: 'menu' }, MENU.map(([label, href]) => href
  ? h('a', { href, class: 'item', dataset: { href } }, label)
  : h('span', { class: 'item off' }, label, h('small', { class: 'soon' }, 'em breve'))));
document.getElementById('app').append(
  nav, h('div', { class: 'main' }, h('header', { class: 'top' }, h('strong', {}, 'Runner de canais'), meter), content));

async function refreshQuota() {
  try { const q = await api.get('/api/quota'); meter.textContent = `${q.used.toLocaleString('pt-BR')} / ${q.limit.toLocaleString('pt-BR')} hoje`; meter.classList.toggle('low', q.limit - q.used < q.limit * 0.1); }
  catch { meter.textContent = 'cota indisponível'; }
}
window.addEventListener('quota-refresh', refreshQuota);

let seq = 0;
// Cada navegação ganha um root novo; resultado de navegação velha é descartado (root fica fora do DOM).
export async function route(hash) {
  const my = ++seq, [path, query] = (hash || '').split('?');
  const key = VIEWS[path] ? path : '#/minerar', root = h('div');
  for (const a of nav.querySelectorAll('a')) a.classList.toggle('on', a.dataset.href === key);
  content.replaceChildren(root);
  try { await (await VIEWS[key]()).render(root, new URLSearchParams(query)); }
  catch (e) { if (my === seq) root.append(h('p', { class: 'err' }, 'Erro ao abrir a tela: ' + e.message)); }
}
window.addEventListener('hashchange', () => route(location.hash));
refreshQuota();
route(location.hash);
