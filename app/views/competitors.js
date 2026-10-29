// Concorrentes: comparativo lado a lado dos canais marcados e os vídeos novos deles.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { openChannel, subsText, views30, avatar, mult, freq } from './channel.js';

// [rótulo, valor p/ comparar (null = sem destaque), célula, melhor = maior]
const ROWS = [
  ['Inscritos', r => r.subs, r => subsText(r.subs)],
  ['Views 30d', r => r.views30d, r => views30(r)],
  ['Média/vídeo', r => r.avgViews, r => fmt.num(r.avgViews)],
  ['Frequência', r => r.frequency, r => freq(r.frequency)],
  ['Score', r => r.score, r => fmt.num(r.score)],
  ['Vídeos', r => r.videoCount, r => fmt.num(r.videoCount)],
  ['Idade', null, r => r.ageDays == null ? '—' : r.ageDays + ' d'],
  ['Último vídeo', null, r => r.daysSinceLast == null ? '—' : `há ${r.daysSinceLast} d`],
];

export async function render(root, params) {
  let seq = 0;
  const sel = params?.get('my'); // canal meu escolhido (hash ?my=<n>); sem ele, todos
  const box = h('div'), panel = h('aside', { class: 'panel', hidden: true }), msg = h('p', { class: 'status' });
  panel.addEventListener('channel-changed', () => load());

  async function remove(id, btn) {
    btn.disabled = true; msg.className = 'status'; msg.textContent = '';
    try { await api.post(`/api/channels/${encodeURIComponent(id)}/watch`, { competitor: false }); if (panel.dataset.id === id) { panel.hidden = true; delete panel.dataset.id; } await load(); }
    catch (e) { btn.disabled = false; msg.className = 'status err'; msg.textContent = e.message; }
  }

  async function load() {
    const my = ++seq; let got;
    try { got = await api.get('/api/competitors' + (sel != null ? '?my=' + encodeURIComponent(sel) : '')); }
    catch (e) { if (my === seq && root.isConnected) box.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
    if (my !== seq || !root.isConnected) return;
    draw(got.rows.filter(Boolean).sort((a, b) => (b.subs ?? -1) - (a.subs ?? -1)), got.videos ?? []);
  }

  function compare(rows) {
    // melhor = maior valor finito; só destaca se houver mais de um canal com valor e eles diferirem
    const best = ROWS.map(([, val]) => {
      const v = val ? rows.map(val).filter(x => x != null && Number.isFinite(x)) : [];
      return v.length > 1 && Math.min(...v) !== Math.max(...v) ? Math.max(...v) : null; // empate geral não destaca
    });
    const cell = (td, i, r) => { const v = ROWS[i][1]?.(r); return h(td, { class: best[i] != null && v === best[i] ? 'best' : null }, ROWS[i][2](r)); };
    return h('div', { class: 'cmp' }, h('table', { class: 'grid cmp-table' },
      h('thead', {}, h('tr', {}, h('th', {}), rows.map(r => h('th', {}, h('div', { class: 'ch' }, avatar(r.avatar),
        h('button', { type: 'button', class: 'link strong', onClick: () => openChannel(panel, r.id) }, r.title ?? r.id)))))),
      h('tbody', {},
        ROWS.map(([label], i) => h('tr', {}, h('th', { scope: 'row' }, label), rows.map(r => cell('td', i, r)))),
        h('tr', {}, h('th', { scope: 'row' }, 'Dados'), rows.map(r => h('td', { class: 'dim' }, 'Dados de ' + fmt.date(r.updatedAt)))),
        h('tr', {}, h('th', {}), rows.map(r => { const b = h('button', { type: 'button', onClick: () => remove(r.id, b) }, 'Remover'); return h('td', {}, b); })))));
  }

  function vids(videos) {
    if (!videos.length) return h('p', { class: 'empty' }, 'Nenhum vídeo novo nos últimos 30 dias.');
    return h('ul', { class: 'cmp-vids' }, videos.map(v => h('li', {},
      v.thumb ? h('img', { src: v.thumb, alt: '', class: 'thumb', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span', { class: 'thumb' }),
      h('div', {}, h('a', { href: 'https://www.youtube.com/watch?v=' + encodeURIComponent(v.id), target: '_blank', rel: 'noopener noreferrer' }, v.title ?? v.id),
        h('div', { class: 'dim' }, `${v.channelTitle ?? v.channelId} · publicado ${fmt.ago(v.publishedAt)}`),
        h('div', {}, `${fmt.num(v.views)} views · ${fmt.num(v.viewsPerDay)}/dia · ${mult(v.multiple)} · dados de ${fmt.date(v.capturedAt)}`)))));
  }

  function draw(rows, videos) {
    const foot = h('p', { class: 'dim' }, 'Ligue concorrentes a um canal em Meus canais.');
    if (!rows.length) return void box.replaceChildren(h('p', { class: 'empty' }, sel != null ? 'Nenhum concorrente ligado a este canal.' : "Nenhum concorrente marcado. Use 'Concorrente' no painel do canal ou na aba Concorrentes."), foot);
    box.replaceChildren(compare(rows), h('h2', {}, 'Vídeos novos dos concorrentes'), vids(videos), foot);
  }

  let mine = [];
  try { mine = await api.get('/api/mychannels'); } catch { /* sem seletor; a lista segue */ }
  const pick = v => { location.hash = '#/concorrentes' + (v == null ? '' : '?my=' + encodeURIComponent(v)); };
  const chips = mine.length ? h('div', { class: 'seg' }, h('span', { class: 'dim' }, 'Mostrar:'),
    [[null, 'Todos'], ...mine.map(c => [String(c.id), c.name])].map(([v, label]) => h('button', { type: 'button', class: v === (sel ?? null) ? 'on' : null, onClick: () => pick(v) }, label))) : null;

  root.append(h('h1', {}, 'Concorrentes'), chips, msg, h('div', { class: 'split' }, h('div', { class: 'list' }, box), panel));
  await load();
}
