// Modelar: escolhe o canal âncora, gera a modelagem pelo Claude (sem cota) e mostra os 3 conceitos.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { follow, avatar, subsText } from './channel.js';

const enc = encodeURIComponent;
const BY_CLAUDE = 'gerado pelo Claude; confira antes de usar';
const href = (a, n) => `#/modelar?ancora=${enc(a)}` + (n == null ? '' : `&modelo=${enc(n)}`);
const txt = x => String(x ?? '');
const label = () => h('small', { class: 'dim' }, BY_CLAUDE);
const copyBtn = get => h('button', { type: 'button', onClick: e => { navigator.clipboard?.writeText(get()).then(() => { e.target.textContent = 'Copiado'; }, () => {}); } }, 'Copiar');
// Até 3 thumbnails com as views do app; sem thumb, o espaço fica vazio.
const thumbs = vs => h('div', { class: 'thumbs' }, vs.slice(0, 3).map(v => h('figure', {},
  v.thumb ? h('img', { src: v.thumb, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span', { class: 'noimg' }), h('figcaption', {}, fmt.num(v.views) + ' views'))));

export async function render(root, params) {
  const anchor = params.get('ancora'), model = params.get('modelo');
  try { await (model ? show(root, model) : anchor ? prepare(root, anchor) : pick(root)); }
  catch (e) { root.append(h('p', { class: 'err' }, e.message)); }
}

// Sem âncora: busca na base pelo título, 20 primeiros.
function pick(root) {
  const list = h('div'), q = h('input', { type: 'search', placeholder: 'Buscar pelo título', 'aria-label': 'Escolha o canal âncora' });
  let seq = 0;
  async function load() {
    const my = ++seq;
    let got; try { got = await api.get('/api/channels?preset=tudo&q=' + enc(q.value.trim())); } catch (e) { if (my === seq) list.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
    if (my !== seq || !root.isConnected) return;
    list.replaceChildren(got.rows.length ? h('ul', { class: 'hist' }, got.rows.slice(0, 20).map(r => h('li', {},
      h('a', { class: 'ch', href: href(r.id) }, avatar(r.avatar), h('div', {}, h('strong', {}, r.title ?? r.id), h('small', { class: 'dim block' }, subsText(r.subs) + ' inscritos')))))) : h('p', { class: 'empty' }, 'Nenhum canal na base.'));
  }
  q.addEventListener('input', load);
  root.append(h('h1', {}, 'Modelar'), h('label', {}, 'Escolha o canal âncora', q), list);
  return load();
}

// Com âncora: subtemas, canais do mesmo nicho, geração e modelagens anteriores.
async function prepare(root, id) {
  const p = await api.get('/api/model/prepare?anchor=' + enc(id)), a = p.anchor, picked = new Set();
  const boxes = (p.similar ?? []).map(s => {
    const box = h('input', { type: 'checkbox', onChange: () => { box.checked ? picked.add(s.id) : picked.delete(s.id); for (const b of boxes) b.disabled = !b.checked && picked.size >= 4; } });
    s.box = box; return box;
  });
  const out = h('div', { class: 'job col' }), go = h('button', { type: 'button', class: 'primary' }, 'Gerar modelagem (Claude)');
  go.addEventListener('click', async () => {
    const extras = [...picked];
    go.disabled = true; out.replaceChildren(h('span', {}, 'Iniciando…'));
    const fail = async message => {
      go.disabled = false;
      const copy = h('textarea', { class: 'copy', readonly: true, 'aria-label': 'Prompt' });
      try { copy.value = (await api.get(`/api/model/prompt?anchor=${enc(a.id)}&extras=${enc(extras.join(','))}`)).prompt ?? ''; } catch { copy.value = ''; }
      out.replaceChildren(h('p', { class: 'err' }, message), h('details', { open: true }, h('summary', {}, 'Prompt para copiar'), copy, copyBtn(() => copy.value)));
    };
    let jobId; try { ({ jobId } = await api.post('/api/model', { anchor: a.id, extras })); } catch (e) { return fail(e.message); }
    const bar = h('progress', { max: '4', value: '0' }), msg = h('span', {}, 'Iniciando…'); out.replaceChildren(bar, msg);
    follow(jobId, root, (ev, d) => {
      if (ev === 'progress') { if (d.total) { bar.max = d.total; bar.value = d.done; } msg.textContent = `${txt(d.message)} (${d.done ?? 0}/${d.total ?? 4})`; return; }
      if (d.status === 'done' && d.result?.modelId != null) location.hash = href(a.id, d.result.modelId);
      else fail(d.error ?? 'Erro ao gerar a modelagem');
    });
  });
  root.append(h('h1', {}, 'Modelar'),
    h('header', { class: 'ph' }, avatar(a.avatar, 'avatar big'), h('div', { class: 'grow' }, h('h2', {}, a.title ?? a.id),
      h('div', { class: 'dim' }, `${subsText(a.subs)} inscritos · ${fmt.num(a.videoCount)} vídeos · Dados de ${fmt.date(a.updatedAt)}`))),
    h('h3', {}, 'Subtemas que já performaram'),
    p.groups?.length ? h('div', { class: 'cards' }, p.groups.map(g => h('article', { class: 'card' }, h('strong', {}, g.label),
      h('small', { class: 'dim' }, `${fmt.num(g.count)} ${g.count === 1 ? 'vídeo' : 'vídeos'} · mediana ${fmt.num(g.medianViews)} views · total ${fmt.num(g.totalViews)} views`), thumbs(g.videos ?? [])))) : h('p', { class: 'empty' }, 'Sem vídeos.'),
    h('h3', {}, 'Canais do mesmo nicho (opcional, até 4)'),
    p.similar?.length ? h('div', { class: 'sim' }, p.similar.map(s => h('label', { class: 'check' }, s.box, avatar(s.avatar), s.title ?? s.id))) : h('p', { class: 'dim' }, 'Nenhum canal parecido na base.'),
    h('p', { class: 'dim' }, 'Não gasta cota do YouTube. Pode levar alguns minutos.'), go, out,
    h('h3', {}, 'Modelagens anteriores'),
    p.models?.length ? h('ul', { class: 'hist' }, p.models.map(m => h('li', {}, h('a', { href: href(a.id, m.id) }, fmt.date(m.createdAt)), ' · ' + (m.names ?? []).map(txt).join(' · '), ' ', label()))) : h('p', { class: 'dim' }, 'Nenhuma ainda.'));
}

// Modelagem aberta: resumo e 3 conceitos; views são as do app (`views`/`videos`), nunca do Claude.
async function show(root, n) {
  const m = await api.get('/api/models/' + enc(n)), o = m.output ?? {}, a = m.anchor ?? {};
  root.append(h('div', {}, h('p', {}, h('a', { href: href(m.anchorId) }, '← Voltar ao âncora')), h('h1', {}, 'Modelagem de ' + txt(a.title ?? m.anchorId)),
    h('p', { class: 'dim' }, 'Gerada em ' + fmt.date(m.createdAt)),
    m.input?.semImagens ? h('p', { class: 'status err' }, 'Feito sem imagens') : null,
    h('div', { class: 'summary' }, h('p', {}, txt(o.resumo)), label()),
    h('div', { class: 'cards' }, (o.conceitos ?? []).map((c, i) => concept(m, c, i)))));
}

function concept(m, c, i) {
  const vs = (c.videoIds ?? []).map(id => m.videos?.[id]).filter(Boolean), prompts = c.promptsImagem ?? [];
  return h('article', { class: 'card concept' },
    h('h2', { class: 'niche-h' }, txt(c.nome)), h('small', { class: 'dim' }, 'Subtema: ' + txt(c.subtema)), label(),
    thumbs(vs), h('p', {}, h('strong', {}, fmt.num(m.views?.[i]) + ' views no âncora')),
    h('h3', {}, 'Moldes de título'), h('ul', {}, (c.moldesTitulo ?? []).map(t => h('li', {}, txt(t)))),
    h('h3', {}, 'Estilo de thumbnail'), h('p', {}, txt(c.estiloThumbnail)),
    h('h3', {}, 'Prompts de imagem'), h('ul', { class: 'hist' }, prompts.map(t => h('li', {}, h('span', {}, txt(t)), ' ', copyBtn(() => txt(t))))),
    h('h3', {}, 'Estilo visual'), h('p', {}, txt(c.estiloVisual)),
    h('h3', {}, 'Plano de 30 dias'),
    h('div', { class: 'tbl' }, h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, h('th', {}, 'Dia'), h('th', {}, 'Tema'))),
      h('tbody', {}, (c.plano30 ?? []).map(d => h('tr', {}, h('td', {}, txt(d.dia)), h('td', {}, txt(d.tema))))))),
    h('button', { type: 'button', class: 'primary', onClick: () => { location.hash = `#/meus?novo=${m.id}:${i}`; } }, 'Criar meu canal com este conceito'));
}
