// Minerar vídeos: busca com cota, filtros locais (URL), tabela de vídeos e painel do canal.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { openChannel, follow, avatar, mult } from './channel.js';
import { loadFavs, favButton, collectButton } from './collect.js';

// [valor, rótulo, durationMin, durationMax]: mesmos cortes do videoDuration do YouTube (< 4 min, 4–20 min, > 20 min)
const DURS = [['', 'Qualquer'], ['short', 'Curto < 4 min', null, 239], ['medium', 'Médio 4–20 min', 240, 1200], ['long', 'Longo > 20 min', 1201, null]];
const COLS = [[''], ['Título'], ['Canal'], ['Publicado', 'publishedAt'], ['Duração'], ['Views', 'views'], ['Views/dia', 'viewsPerDay'], ['Múltiplo', 'multiple'], ['Nota'], ['★'], ['']];
const dur = s => !s ? '—' : (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + String(Math.floor(s % 3600 / 60)).padStart(s >= 3600 ? 2 : 1, '0') + ':' + String(s % 60).padStart(2, '0');
const durSelect = () => h('select', {}, DURS.map(([v, label]) => h('option', { value: v }, label)));

// sort = { key, dir }; onSort(key) troca a ordem. "Dados de" mostra a faixa de capturas das linhas (ISO, ordena como texto).
export function videoTable(rows, { favs, onChannel, sort = {}, onSort }) {
  const caps = rows.map(r => r.capturedAt).filter(Boolean).sort(), arrow = sort.dir === 'asc' ? ' ▲' : ' ▼';
  const [a, b] = [fmt.date(caps[0]), fmt.date(caps.at(-1))];
  return h('table', { class: 'grid' }, h('caption', { class: 'dim' }, 'Dados de ' + (a === b ? a : a + ' a ' + b)),
    h('thead', {}, h('tr', {}, COLS.map(([label, key]) => h('th', {}, key && onSort ? h('button', { type: 'button', class: 'link', onClick: () => onSort(key) }, label + (sort.key === key ? arrow : '')) : label)))),
    h('tbody', {}, rows.map(r => h('tr', {},
      h('td', {}, r.thumb ? h('img', { src: r.thumb, alt: '', class: 'thumb', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null),
      h('td', {}, h('a', { href: 'https://www.youtube.com/watch?v=' + encodeURIComponent(r.id), target: '_blank', rel: 'noopener noreferrer' }, r.title ?? r.id)),
      h('td', {}, h('button', { type: 'button', class: 'link ch', onClick: () => onChannel(r.channelId) }, avatar(r.channelAvatar), r.channelTitle ?? r.channelId)),
      h('td', {}, fmt.date(r.publishedAt)), h('td', {}, dur(r.durationS)), h('td', {}, fmt.num(r.views)), h('td', {}, fmt.num(r.viewsPerDay)),
      h('td', {}, mult(r.multiple)), h('td', {}, fmt.num(r.nota)), h('td', {}, favButton('video', r.id, favs)), h('td', {}, collectButton('video', r.id))))));
}

// Lista + painel do canal, compartilhados com Outliers. st é o estado da URL; sync() grava; extra(qs) roda a cada carga e completa a consulta.
export function videoList(root, st, sync, { empty, extra = () => {} }) {
  let favs = new Set(), seq = 0, cur = {};
  const list = h('div', { class: 'list' }), panel = h('aside', { class: 'panel', hidden: true }), note = h('p', { class: 'dim', hidden: true });
  const show = id => { st.set('canal', id); sync(); openChannel(panel, id); };
  panel.addEventListener('panel-close', () => { st.delete('canal'); sync(); });
  panel.addEventListener('channel-changed', () => load());
  const onSort = key => { const asc = cur.key === key && cur.dir !== 'asc'; st.set('sort', key); st.set('dir', asc ? 'asc' : 'desc'); sync(); load(); };
  async function load() {
    const my = ++seq, qs = new URLSearchParams(st);
    for (const k of ['canal', 'busca']) qs.delete(k);
    extra(qs);
    let got;
    try { got = await api.get('/api/videos?' + qs); }
    catch (e) { if (my === seq) list.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
    if (my !== seq || !root.isConnected) return;
    cur = { key: qs.get('sort') || 'viewsPerDay', dir: qs.get('dir') || 'desc' };
    note.hidden = got.total <= 500; note.textContent = `Mostrando 500 de ${fmt.num(got.total)}; refine os filtros.`;
    list.replaceChildren(got.rows.length ? videoTable(got.rows, { favs, onChannel: show, sort: cur, onSort }) : h('p', { class: 'empty' }, empty()));
  }
  if (st.get('canal')) openChannel(panel, st.get('canal'));
  const ready = loadFavs().then(s => { favs = s; }, () => {}); // sem favoritos carregados, a estrela começa apagada
  return { el: h('div', {}, note, h('div', { class: 'split' }, list, panel)), load: () => ready.then(load) };
}

export async function render(root, params) {
  const st = new URLSearchParams(params);
  const sync = () => history.replaceState(null, '', '#/videos' + (String(st) ? '?' + st : ''));
  const local = ['q', 'tag', 'lang', 'publishedAfter', 'durationMin', 'durationMax', 'viewsMin', 'multipleMin'];
  const vl = videoList(root, st, sync, { empty: () => local.some(k => st.get(k)) || st.get('ids') ? 'Nenhum vídeo com estes filtros.' : 'Nenhum vídeo na base. Busque uma palavra-chave.', extra: () => drawChips() });
  const load = vl.load;
  let busy = false;

  // Busca no YouTube (gasta cota): confirmação com o custo de /api/quota antes do POST.
  const sq = h('input', { type: 'search', placeholder: 'Palavra-chave', 'aria-label': 'Buscar vídeos' }), sDate = h('input', { type: 'date', 'aria-label': 'Publicado depois de' });
  const sDur = durSelect(), sLang = h('input', { type: 'text', maxlength: '2', placeholder: 'en', 'aria-label': 'Idioma', size: '3' });
  const btn = h('button', { type: 'submit', class: 'primary' }, 'Buscar'), confirmBox = h('div', { class: 'confirm', hidden: true }), job = h('div', { class: 'job' });
  const setBusy = on => { busy = on; btn.disabled = on; if (on) confirmBox.hidden = true; };
  async function ask() {
    if (busy) return;
    if (!sq.value.trim()) return void sq.focus();
    let cost; try { cost = (await api.get('/api/quota')).costs.videos; } catch (e) { confirmBox.replaceChildren(h('span', { class: 'err' }, e.message)); confirmBox.hidden = false; return; }
    confirmBox.replaceChildren(h('span', {}, `Custa ~${cost} unidades da cota. Continuar?`),
      h('button', { type: 'button', class: 'primary', onClick: () => { confirmBox.hidden = true; start(); } }, 'Continuar'),
      h('button', { type: 'button', onClick: () => { confirmBox.hidden = true; } }, 'Cancelar'));
    confirmBox.hidden = false;
  }
  async function start() {
    if (busy) return;
    const q = sq.value.trim(), lang = sLang.value.trim().toLowerCase();
    const body = { q, ...(sDate.value && { publishedAfter: sDate.value }), ...(sDur.value && { videoDuration: sDur.value }), ...(lang && { relevanceLanguage: lang }) };
    setBusy(true);
    const bar = h('progress', { max: '1', value: '0' }), msg = h('span', {}, 'Iniciando…');
    job.replaceChildren(bar, msg);
    let jobId;
    try { ({ jobId } = await api.post('/api/videos/mine', body)); } catch (e) { setBusy(false); bar.remove(); msg.className = 'err'; msg.textContent = e.message; return; }
    follow(jobId, root, (ev, d) => {
      if (ev === 'progress') { if (d.total) { bar.max = d.total; bar.value = d.done; msg.textContent = `${d.message ?? ''} (${d.done}/${d.total})`; } return; }
      setBusy(false);
      if (d.status === 'error') { msg.className = 'err'; msg.textContent = d.error ?? 'Erro no job'; }
      else {
        bar.value = bar.max;
        const ids = d.result?.videoIds ?? [];
        msg.textContent = `Concluído: ${ids.length} vídeos encontrados.`;
        if (ids.length) { st.set('ids', ids.join(',')); st.set('busca', q); sync(); }
      }
      load(); // mesmo com erro: o que já foi gravado aparece
    });
  }

  // Filtros locais (sem cota); estado na URL.
  const inputs = { q: h('input', { type: 'search', 'aria-label': 'Texto' }), tag: h('input', { type: 'text' }), lang: h('input', { type: 'text', maxlength: '2', size: '3' }),
    publishedAfter: h('input', { type: 'date' }), viewsMin: h('input', { type: 'number', min: '0', step: 'any' }), multipleMin: h('input', { type: 'number', min: '0', step: 'any' }) };
  for (const [k, el] of Object.entries(inputs)) el.value = st.get(k) ?? '';
  const fDur = durSelect();
  fDur.value = DURS.find(([, , mn, mx]) => String(mn ?? '') === (st.get('durationMin') ?? '') && String(mx ?? '') === (st.get('durationMax') ?? ''))?.[0] ?? '';
  function applyForm() {
    inputs.lang.value = inputs.lang.value.trim().toLowerCase();
    for (const [k, el] of Object.entries(inputs)) { const v = el.value.trim(); if (v) st.set(k, v); else st.delete(k); }
    const [, , mn, mx] = DURS.find(([v]) => v === fDur.value);
    if (mn != null) st.set('durationMin', mn); else st.delete('durationMin');
    if (mx != null) st.set('durationMax', mx); else st.delete('durationMax');
    sync(); load();
  }
  const clear = () => { for (const el of Object.values(inputs)) el.value = ''; fDur.value = ''; applyForm(); };
  const form = h('form', { class: 'filters', onChange: applyForm, onSubmit: e => { e.preventDefault(); applyForm(); } },
    h('label', {}, 'Texto', inputs.q), h('label', {}, 'Etiqueta', inputs.tag), h('label', {}, 'Idioma', inputs.lang), h('label', {}, 'Publicado depois de', inputs.publishedAfter),
    h('label', {}, 'Duração', fDur), h('label', {}, 'Views mín.', inputs.viewsMin), h('label', {}, 'Múltiplo mín.', inputs.multipleMin),
    h('button', { type: 'button', onClick: clear }, 'Limpar filtros'));

  // Chips: resultado da busca e ordem.
  const chips = h('div', { class: 'presets' });
  const order = key => { st.set('sort', key); st.set('dir', 'desc'); sync(); load(); };
  function drawChips() {
    const sort = st.get('sort') || 'viewsPerDay';
    chips.replaceChildren(
      ...(st.get('ids') ? [h('button', { type: 'button', class: 'chip on', onClick: () => { st.delete('ids'); st.delete('busca'); sync(); load(); } }, `Resultado da busca "${st.get('busca') ?? ''}" · Ver toda a base`)] : []),
      ...[['viewsPerDay', 'Views/dia'], ['multiple', 'Múltiplo']].map(([k, label]) => h('button', { type: 'button', class: 'chip' + (sort === k ? ' on' : ''), onClick: () => order(k) }, label)));
  }

  root.append(h('h1', {}, 'Minerar vídeos'),
    h('form', { class: 'bar', onSubmit: e => { e.preventDefault(); ask(); } }, sq, h('label', {}, 'Publicado depois de', sDate), h('label', {}, 'Duração', sDur), h('label', {}, 'Idioma', sLang), btn),
    confirmBox, job, form, chips, vl.el);
  await load();
}
