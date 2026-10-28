// Minerar canais: busca, importação, recortes, filtros locais (URL) e lista em tabela ou cartões.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { loadFavs, favButton } from './collect.js';
import { openChannel, follow, freq, subsText, views30, money, avatar, isNew, tagText } from './channel.js';

// Mesmos ids e rótulos de PRESETS em scripts/app/filters.mjs.
const PRESETS = [['espelhar', 'Pra você espelhar'], ['novos', 'Canais novos'], ['muitaView', 'Muita view, pouco inscrito'], ['fabrica', 'Fábrica de vídeo'],
  ['enxuto', 'Catálogo enxuto'], ['semana', 'Postou esta semana'], ['categoria', 'Por categoria'], ['tudo', 'Tudo']];
const MINE_COST = 301; // estimateMine() de scripts/app/youtube.mjs
// [parâmetro da URL, rótulo, tipo do input]
const FILTERS = [['lang', 'Idioma', 'text'], ['country', 'País', 'text'], ['tag', 'Etiqueta', 'text'], ['subsMin', 'Inscritos mín.', 'number'], ['subsMax', 'Inscritos máx.', 'number'],
  ['views30dMin', 'Views 30d mín.', 'number'], ['views30dMax', 'Views 30d máx.', 'number'], ['createdAfter', 'Criado depois de', 'date'],
  ['frequencyMin', 'Frequência mín. (/sem)', 'number'], ['videosMax', 'Máximo de vídeos', 'number']];
const COLS = [['#'], ['★'], ['Canal', 'title'], ['Etiqueta', 'tag'], ['Inscritos', 'subs'], ['Views 30d', 'views30d'], ['Média/vídeo', 'avgViews'], ['Frequência', 'frequency'], ['Score', 'score'], ['']];
const VIEW_KEY = 'mine.view';
const flag = cc => /^[A-Z]{2}$/i.test(cc ?? '') ? h('span', { title: cc }, String.fromCodePoint(...[...cc.toUpperCase()].map(ch => 0x1F1A5 + ch.charCodeAt(0)))) : null;
const stat = (k, v) => h('div', {}, h('dt', {}, k), h('dd', {}, v));

export async function render(root, params) {
  const st = new URLSearchParams(params);
  // replaceState não dispara hashchange: a tela fica, e voltar/recarregar mantém os filtros
  const sync = () => history.replaceState(null, '', '#/minerar' + (String(st) ? '?' + st : ''));
  let view = 'table'; try { if (localStorage.getItem(VIEW_KEY) === 'cards') view = 'cards'; } catch {}
  let rows = [], seq = 0, busy = false, favs = new Set(); // favs: carregado uma vez por render
  const list = h('div', { class: 'list' }), panel = h('aside', { class: 'panel', hidden: true }), job = h('div', { class: 'job' });

  // Topo: busca com confirmação de custo, importação e progresso do job.
  const q = h('input', { type: 'search', placeholder: 'Buscar canal, nicho ou palavra-chave', 'aria-label': 'Buscar' });
  const confirmBox = h('div', { class: 'confirm', hidden: true });
  const askMine = () => {
    if (busy) return;
    if (!q.value.trim()) return void q.focus();
    confirmBox.replaceChildren(h('span', {}, `Custa ~${MINE_COST} unidades da cota. Continuar?`),
      h('button', { type: 'button', class: 'primary', onClick: () => { confirmBox.hidden = true; start(() => api.post('/api/mine', { q: q.value.trim() })); } }, 'Continuar'),
      h('button', { type: 'button', onClick: () => { confirmBox.hidden = true; } }, 'Cancelar'));
    confirmBox.hidden = false;
  };
  const paste = h('textarea', { rows: '5', placeholder: 'Um por linha: https://www.youtube.com/@canal, @canal ou UC…', 'aria-label': 'Canais para importar' });
  const importBtn = h('button', { type: 'button', class: 'primary', onClick: () => { if (paste.value.trim()) start(() => api.post('/api/import', { text: paste.value })); } }, 'Importar');
  const importBox = h('div', { class: 'import', hidden: true }, paste, importBtn);
  const mineBtn = h('button', { type: 'submit', class: 'primary' }, 'Buscar');
  // um job por vez nesta tela: Buscar/Importar desligados até o fim
  const setBusy = on => { busy = on; mineBtn.disabled = importBtn.disabled = on; if (on) confirmBox.hidden = true; };

  // req é função: o POST só sai depois da guarda (sem job fantasma gastando cota)
  async function start(req) {
    if (busy) return;
    setBusy(true);
    const bar = h('progress', { max: '1', value: '0' }), msg = h('span', {}, 'Iniciando…'), out = h('div', { class: 'result' });
    job.replaceChildren(bar, msg, out);
    let jobId;
    try { ({ jobId } = await req()); } catch (e) { setBusy(false); bar.remove(); msg.className = 'err'; msg.textContent = e.message; return; }
    follow(jobId, root, (ev, d) => {
      if (ev === 'progress') { if (d.total) { bar.max = d.total; bar.value = d.done; msg.textContent = `${d.message ?? ''} (${d.done}/${d.total})`; } return; }
      setBusy(false);
      if (d.status === 'error') { msg.className = 'err'; msg.textContent = d.error ?? 'Erro no job'; }
      else {
        bar.value = bar.max;
        const r = d.result ?? {};
        msg.textContent = `Concluído: ${(r.ok ?? []).length} canais gravados.`;
        if (r.failed?.length) out.append(h('p', { class: 'err' }, 'Falharam:'), h('ul', {}, r.failed.map(f => h('li', {}, `${f.id}: ${f.error}`))));
        if (r.invalid?.length) out.append(h('p', { class: 'err' }, 'Não reconhecidos:'), h('ul', {}, r.invalid.map(s => h('li', {}, String(s)))));
        paste.value = '';
      }
      load(); // mesmo com erro: o que já foi gravado aparece
    });
  }

  // Recortes e filtros locais (sem cota); estado na URL.
  const presetBar = h('div', { class: 'presets' }, PRESETS.map(([id, label]) => h('button', { type: 'button', class: 'chip', dataset: { id },
    onClick: () => { st.set('preset', id); st.delete('sort'); st.delete('dir'); sync(); load(); } }, label)));
  const inputs = Object.fromEntries(FILTERS.map(([k, , type]) => [k, h('input', { type, value: st.get(k) ?? '', min: type === 'number' ? '0' : null, step: type === 'number' ? 'any' : null })]));
  const face = h('select', {}, h('option', { value: '' }, 'Com ou sem rosto'), h('option', { value: '1' }, 'Sem rosto'), h('option', { value: '0' }, 'Com rosto'));
  face.value = st.get('faceless') ?? '';
  const unknown = h('input', { type: 'checkbox', checked: st.get('includeUnknown') === '1' });
  const onlyFav = h('input', { type: 'checkbox', checked: st.get('fav') === '1' });
  function applyForm() {
    inputs.lang.value = inputs.lang.value.trim().toLowerCase(); inputs.country.value = inputs.country.value.trim().toUpperCase(); // como gravado: 'en', 'US'
    for (const [k, el] of [...Object.entries(inputs), ['faceless', face]]) { const v = el.value.trim(); if (v) st.set(k, v); else st.delete(k); }
    if (unknown.checked) st.set('includeUnknown', '1'); else st.delete('includeUnknown');
    if (onlyFav.checked) st.set('fav', '1'); else st.delete('fav');
    sync(); load();
  }
  const clear = () => { for (const el of Object.values(inputs)) el.value = ''; face.value = ''; unknown.checked = false; onlyFav.checked = false; applyForm(); };
  const form = h('form', { class: 'filters', onChange: applyForm, onSubmit: e => { e.preventDefault(); applyForm(); } },
    FILTERS.map(([k, label]) => h('label', {}, label, inputs[k])), h('label', {}, 'Rosto', face),
    h('label', { class: 'check' }, unknown, 'Incluir indefinidos'), h('label', { class: 'check' }, onlyFav, 'Só favoritos'), h('button', { type: 'button', onClick: clear }, 'Limpar filtros'));

  const toggle = h('div', { class: 'seg' }, [['table', 'Tabela'], ['cards', 'Cartões']].map(([v, label]) => h('button', { type: 'button', dataset: { v },
    onClick: () => { view = v; try { localStorage.setItem(VIEW_KEY, v); } catch {} draw(); } }, label)));

  const show = id => { st.set('canal', id); sync(); openChannel(panel, id); };
  panel.addEventListener('panel-close', () => { st.delete('canal'); sync(); });
  panel.addEventListener('channel-changed', () => load());
  const sortBy = key => {
    const asc = st.get('sort') === key ? st.get('dir') !== 'asc' : key === 'title' || key === 'tag';
    st.set('sort', key); st.set('dir', asc ? 'asc' : 'desc'); sync(); load();
  };

  async function load() {
    const my = ++seq, qs = new URLSearchParams(st);
    qs.delete('canal');
    for (const b of presetBar.children) b.classList.toggle('on', b.dataset.id === (st.get('preset') || 'tudo'));
    let got;
    try { got = await api.get('/api/channels?' + qs); }
    catch (e) { if (my === seq) list.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
    if (my !== seq || !root.isConnected) return;
    rows = got.rows; draw();
  }

  function draw() {
    for (const b of toggle.children) b.classList.toggle('on', b.dataset.v === view);
    const filtered = [...st.keys()].some(k => !['canal', 'sort', 'dir', 'preset'].includes(k)) || (st.get('preset') || 'tudo') !== 'tudo';
    if (!rows.length) return void list.replaceChildren(h('p', { class: 'empty' }, filtered ? 'Nenhum canal neste recorte com estes filtros.' : 'Nenhum canal ainda. Busque uma palavra-chave ou importe canais.'));
    list.replaceChildren(view === 'cards' ? cards() : table());
  }

  const name = r => h('div', { class: 'ch' }, avatar(r.avatar),
    h('div', {}, h('strong', {}, r.title ?? r.id), ' ', flag(r.country), ' ', isNew(r), h('small', { class: 'dim block' }, 'dados de ' + fmt.date(r.updatedAt))));
  function table() {
    const sort = st.get('sort'), arrow = st.get('dir') === 'asc' ? ' ▲' : ' ▼';
    return h('table', { class: 'grid' },
      h('thead', {}, h('tr', {}, COLS.map(([label, key]) => h('th', {}, key ? h('button', { type: 'button', class: 'link', onClick: () => sortBy(key) }, label + (sort === key ? arrow : '')) : label)))),
      h('tbody', {}, rows.map((r, i) => h('tr', {},
        h('td', {}, String(i + 1)), h('td', {}, favButton('channel', r.id, favs)), h('td', {}, name(r)), h('td', {}, tagText(r)), h('td', {}, subsText(r.subs)), h('td', {}, views30(r)),
        h('td', {}, fmt.num(r.avgViews)), h('td', {}, freq(r.frequency)), h('td', {}, fmt.num(r.score)),
        h('td', {}, h('button', { type: 'button', onClick: () => show(r.id) }, 'Analisar'))))));
  }
  function cards() {
    return h('div', { class: 'cards' }, rows.map(r => h('article', { class: 'card' },
      h('div', { class: 'row' }, favButton('channel', r.id, favs), name(r)), h('small', { class: 'dim' }, tagText(r)),
      h('div', { class: 'thumbs' }, (r.topThumbs ?? []).map(t => h('figure', {}, t.thumb ? h('img', { src: t.thumb, alt: '', loading: 'lazy' }) : h('span', { class: 'noimg' }), t.views == null ? null : h('figcaption', {}, fmt.num(t.views) + ' views')))),
      h('dl', { class: 'stats' }, stat('Média/vídeo', fmt.num(r.avgViews)), stat('US$/mês (estimativa)', money(r.revenue)), stat('Inscritos', subsText(r.subs)),
        stat('Views/mês', views30(r)), stat('Vídeos', fmt.num(r.videoCount))),
      h('small', { class: 'dim' }, (r.daysSinceLast == null ? 'Sem vídeos' : `Último vídeo há ${r.daysSinceLast} d`) + ' · Atualizado ' + fmt.ago(r.updatedAt)),
      h('button', { type: 'button', onClick: () => show(r.id) }, 'Analisar'))));
  }

  root.append(h('h1', {}, 'Minerar canais'),
    h('form', { class: 'bar', onSubmit: e => { e.preventDefault(); askMine(); } }, q, mineBtn,
      h('button', { type: 'button', onClick: () => { importBox.hidden = !importBox.hidden; } }, 'Importar canais')),
    confirmBox, importBox, job, presetBar, form, toggle, h('div', { class: 'split' }, list, panel));
  if (st.get('canal')) openChannel(panel, st.get('canal'));
  try { favs = await loadFavs(); } catch {} // sem estrelas marcadas se falhar; a lista abre igual
  await load();
}
