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

export async function render(root) {
  let seq = 0;
  const box = h('div'), panel = h('aside', { class: 'panel', hidden: true }), msg = h('p', { class: 'status' });
  panel.addEventListener('channel-changed', () => load());

  async function remove(id, btn) {
    btn.disabled = true; msg.className = 'status'; msg.textContent = '';
    try { await api.post(`/api/channels/${encodeURIComponent(id)}/watch`, { competitor: false }); if (panel.dataset.id === id) { panel.hidden = true; delete panel.dataset.id; } await load(); }
    catch (e) { btn.disabled = false; msg.className = 'status err'; msg.textContent = e.message; }
  }

  async function load() {
    const my = ++seq; let got;
    try { got = await api.get('/api/competitors'); }
    catch (e) { if (my === seq && root.isConnected) box.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
    if (my !== seq || !root.isConnected) return;
    draw(got.rows.filter(Boolean).sort((a, b) => (b.subs ?? -1) - (a.subs ?? -1)), got.videos ?? []);
  }

  function compare(rows) {
    // melhor = maior valor finito; só destaca se houver mais de um canal com valor
    const best = ROWS.map(([, val]) => {
      const v = val ? rows.map(val).filter(x => x != null && Number.isFinite(x)) : [];
      return v.length > 1 ? Math.max(...v) : null;
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
    const foot = h('p', { class: 'dim' }, 'Na fase 4, cada concorrente será ligado a um dos seus canais.');
    if (!rows.length) return void box.replaceChildren(h('p', { class: 'empty' }, "Nenhum concorrente marcado. Use 'Concorrente' no painel do canal ou na aba Concorrentes."), foot);
    box.replaceChildren(compare(rows), h('h2', {}, 'Vídeos novos dos concorrentes'), vids(videos), foot);
  }

  root.append(h('h1', {}, 'Concorrentes'), msg, h('div', { class: 'split' }, h('div', { class: 'list' }, box), panel));
  await load();
}
