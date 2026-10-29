// Meus canais: lista, formulário do perfil (voz, duração, moldes), amostra de voz e concorrentes do canal.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { avatar, subsText } from './channel.js';

const enc = encodeURIComponent;
const STYLES = [['flat', 'Flat'], ['watercolor', 'Aquarela']]; // espelha EPISODE_STYLES do servidor
const LANGS = [['pt', 'Português'], ['en', 'Inglês']];
const BLANK = { name: '', tag: '', lang: 'pt', style: 'flat', speed: 1, targetMin: 30, toleranceMin: 3, titleTemplates: [], descriptionTemplate: '' };
const short = v => String(v ?? '').replace(/^kokoro:/, '');
const panelLink = id => h('a', { href: '#/minerar?canal=' + enc(id) }, 'abrir o canal âncora no painel');
const fail = (el, text) => { el.className = 'status err'; el.textContent = text; };
const ok = (el, text) => { el.className = 'status'; el.textContent = text; };

export async function render(root, params) {
  try {
    const id = params.get('id'), novo = params.get('novo');
    if (id == null && novo == null) return await list(root);
    const { voices } = await api.get('/api/voices');
    let p;
    if (id != null) p = await api.get('/api/mychannels/' + enc(id));
    else if (/^\d+:[012]$/.test(novo)) { const [m, i] = novo.split(':'); p = await api.get(`/api/models/${m}/profile/${i}`); }
    else p = { ...BLANK, voice: 'kokoro:' + voices.pt[0] };
    if (root.isConnected) form(root, p, voices, id != null);
  } catch (e) { if (root.isConnected) root.append(h('p', { class: 'err' }, e.message)); }
}

async function list(root) {
  const rows = await api.get('/api/mychannels');
  if (!root.isConnected) return;
  root.append(h('h1', {}, 'Meus canais'),
    h('p', {}, h('button', { type: 'button', class: 'primary', onClick: () => { location.hash = '#/meus?novo=1'; } }, 'Novo canal')),
    rows.length ? h('div', { class: 'cards' }, rows.map(r => h('article', { class: 'card' },
      h('strong', {}, r.name),
      h('small', { class: 'dim' }, `${r.tag ?? 'sem etiqueta'} · ${r.lang} · ${r.style}`),
      h('span', {}, `Voz ${short(r.voice)} · ${Number(r.speed).toLocaleString('pt-BR')}×`),
      h('span', {}, `${fmt.num(r.targetMin)} ± ${fmt.num(r.toleranceMin)} min`),
      h('span', {}, `${r.competitorCount ?? 0} ${r.competitorCount === 1 ? 'concorrente' : 'concorrentes'}`),
      r.anchorId ? h('span', {}, 'Âncora: ', panelLink(r.anchorId)) : null,
      h('a', { href: '#/meus?id=' + enc(r.id) }, 'Editar')))) : h('p', { class: 'empty' }, 'Nenhum canal ainda. Crie um do zero ou a partir de uma modelagem.'));
}

function form(root, p, voices, saved) {
  const id = saved ? p.id : null;
  const status = h('p', { class: 'status' });
  const name = h('input', { type: 'text', maxlength: '60', value: p.name ?? '' }), tag = h('input', { type: 'text', maxlength: '40', value: p.tag ?? '' });
  const lang = h('select', {}, LANGS.map(([v, t]) => h('option', { value: v }, t))), style = h('select', {}, STYLES.map(([v, t]) => h('option', { value: v }, t)));
  const voice = h('select', {});
  lang.value = p.lang; style.value = p.style;
  const fillVoices = keep => {
    voice.replaceChildren(...(voices[lang.value] ?? []).map(v => h('option', { value: 'kokoro:' + v }, v)));
    voice.value = keep; if (voice.selectedIndex < 0) voice.selectedIndex = 0; // voz de outro idioma: cai na primeira
  };
  fillVoices(p.voice); lang.addEventListener('change', () => fillVoices(''));
  const speed = h('input', { type: 'number', min: '0.8', max: '1.3', step: '0.05', value: String(p.speed ?? 1) });
  const target = h('input', { type: 'number', min: '10', max: '120', step: '1', value: String(p.targetMin ?? 30) });
  const tol = h('input', { type: 'number', min: '1', max: '15', step: '1', value: String(p.toleranceMin ?? 3) });
  const desc = h('textarea', { rows: '4', maxlength: '2000' }); desc.value = p.descriptionTemplate ?? '';

  const tpl = h('div', { class: 'col' }), addTpl = h('button', { type: 'button', onClick: () => row() }, 'Adicionar molde');
  const sync = () => { addTpl.disabled = tpl.children.length >= 10; };
  const row = (v = '') => { tpl.append(h('div', { class: 'row' }, h('input', { type: 'text', maxlength: '120', value: v, 'aria-label': 'Molde de título' }), h('button', { type: 'button', onClick: e => { e.target.closest('.row').remove(); sync(); } }, 'Remover'))); sync(); };
  (p.titleTemplates ?? []).forEach(t => row(t));

  const audio = h('audio', { controls: true, hidden: true }), sampleMsg = h('p', { class: 'status' });
  const sample = h('button', { type: 'button', onClick: async () => {
    sample.disabled = true; ok(sampleMsg, 'Gerando amostra…');
    try {
      const r = await api.post('/api/voices/sample', { voice: voice.value, speed: Number(speed.value), lang: lang.value });
      if (r.error) { audio.hidden = true; return fail(sampleMsg, r.error); } // ex.: Kokoro não instalado
      audio.src = r.url; audio.hidden = false; audio.play().catch(() => {});
      ok(sampleMsg, Number.isFinite(r.wpm) ? `≈ ${fmt.num(r.wpm)} palavras por minuto nesta voz e velocidade` : '');
    } catch (e) { audio.hidden = true; fail(sampleMsg, e.message); }
    finally { sample.disabled = false; }
  } }, 'Ouvir amostra');

  const title = h('h1', {}, saved ? p.name : 'Novo canal'), save_ = h('button', { type: 'submit', class: 'primary' }, 'Salvar');
  async function save() {
    save_.disabled = true; ok(status, 'Salvando…');
    const body = { name: name.value, tag: tag.value, lang: lang.value, style: style.value, voice: voice.value, speed: Number(speed.value), targetMin: Number(target.value), toleranceMin: Number(tol.value),
      titleTemplates: [...tpl.querySelectorAll('input')].map(i => i.value), descriptionTemplate: desc.value, anchorId: p.anchorId, modelId: p.modelId, conceptIndex: p.conceptIndex };
    try {
      const r = await api.post(id == null ? '/api/mychannels' : '/api/mychannels/' + enc(id), body);
      if (id == null) location.hash = '#/meus?id=' + enc(r.id); else { title.textContent = r.name; ok(status, 'Salvo.'); }
    } catch (e) { fail(status, e.message); }
    finally { save_.disabled = false; }
  }

  // Apagar em dois passos, sem dialog.
  const del = h('span', { class: 'row' });
  const askDel = () => del.replaceChildren(h('span', {}, 'Apagar este canal?'), h('button', { type: 'button', class: 'primary', onClick: doDel }, 'Sim, apagar'), h('button', { type: 'button', onClick: resetDel }, 'Cancelar'));
  const resetDel = () => del.replaceChildren(h('button', { type: 'button', onClick: askDel }, 'Apagar'));
  async function doDel() {
    try { await api.post(`/api/mychannels/${enc(id)}/delete`, {}); location.hash = '#/meus'; }
    catch (e) { fail(status, e.message); resetDel(); }
  }
  resetDel();

  root.append(h('p', {}, h('a', { href: '#/meus' }, '← Meus canais')), title,
    h('form', { class: 'settings', novalidate: true, onSubmit: e => { e.preventDefault(); save(); } },
      p.modelId != null && p.conceptIndex != null ? h('p', { class: 'dim' }, `Origem: modelagem #${p.modelId}, conceito ${p.conceptIndex + 1}`) : null,
      p.anchorId ? h('p', {}, 'Âncora: ', panelLink(p.anchorId)) : null,
      h('label', {}, 'Nome', name), h('label', {}, 'Etiqueta (nicho)', tag),
      h('div', { class: 'filters' }, h('label', {}, 'Idioma', lang), h('label', {}, 'Estilo', style), h('label', {}, 'Voz', voice), h('label', {}, 'Velocidade (0,8 a 1,3)', speed),
        h('label', {}, 'Duração alvo (min)', target), h('label', {}, 'Tolerância (± min)', tol)),
      h('div', { class: 'col' }, sample, audio, sampleMsg),
      h('fieldset', {}, h('legend', {}, 'Moldes de título (até 10)'), tpl, addTpl),
      h('label', {}, 'Modelo de descrição', desc, h('small', { class: 'dim' }, 'Use {fontes} e {capitulos}')),
      h('div', { class: 'row' }, save_, saved ? del : null), status));
  if (saved) root.append(competitors(id, p.competitors ?? []));
}

// Concorrentes ligados a este canal; cada mudança grava a lista inteira.
function competitors(id, rows) {
  let comps = rows.filter(Boolean), results = [], seq = 0;
  const list = h('ul', { class: 'hist' }), found = h('ul', { class: 'hist' }), msg = h('p', { class: 'status' });
  const who = c => h('div', { class: 'ch' }, avatar(c.avatar), h('div', {}, h('strong', {}, c.title ?? c.id), h('small', { class: 'dim block' }, subsText(c.subs) + ' inscritos')));
  function draw() {
    list.replaceChildren(...(comps.length ? comps.map(c => h('li', { class: 'row' }, who(c), h('button', { type: 'button', onClick: () => setAll(comps.filter(x => x.id !== c.id).map(x => x.id), 'Removido.') }, 'Remover')))
      : [h('li', { class: 'dim' }, 'Nenhum concorrente ligado.')]));
    const have = new Set(comps.map(c => c.id));
    found.replaceChildren(...results.map(r => h('li', { class: 'row' }, who(r), h('button', { type: 'button', disabled: have.has(r.id), onClick: () => setAll([...have, r.id], 'Adicionado.') }, 'Adicionar'))));
  }
  async function setAll(ids, done) {
    ok(msg, 'Salvando…');
    try { comps = (await api.post(`/api/mychannels/${enc(id)}/competitors`, { ids })).competitors.filter(Boolean); draw(); ok(msg, done); }
    catch (e) { fail(msg, e.message); }
  }
  const q = h('input', { type: 'search', placeholder: 'Buscar canal da base pelo título', 'aria-label': 'Buscar concorrente' });
  q.addEventListener('input', async () => {
    const my = ++seq, s = q.value.trim();
    if (!s) { results = []; return draw(); }
    try { const got = await api.get('/api/channels?preset=tudo&q=' + enc(s)); if (my === seq) { results = got.rows.slice(0, 10); draw(); } }
    catch (e) { if (my === seq) fail(msg, e.message); }
  });
  const marked = h('button', { type: 'button', onClick: async () => {
    try {
      const got = await api.get('/api/competitors'), ids = [...new Set([...comps.map(c => c.id), ...got.rows.filter(Boolean).map(r => r.id)])], added = ids.length - comps.length;
      if (added) await setAll(ids, `${added} ${added === 1 ? 'adicionado' : 'adicionados'}.`); else ok(msg, 'Nenhum concorrente novo marcado na tela Concorrentes.');
    } catch (e) { fail(msg, e.message); }
  } }, 'Usar os concorrentes marcados');
  draw();
  return h('section', { class: 'comp' }, h('h2', {}, 'Concorrentes deste canal'), list, h('label', {}, 'Adicionar da base', q), found, h('p', {}, marked), msg);
}
