// Etapa Embalagem: 15 títulos, 5 thumbnails, descrição editável e tags; "Exportar" copia tudo para a pasta final.
import { h } from '../../dom.js';
import { api } from '../../api.js';
import { follow } from '../channel.js';

const enc = encodeURIComponent;

export async function render(root, prod, { reload }) {
  const base = `/api/productions/${enc(prod.id)}/embalagem`, s = prod.steps.embalagem, r = s.result, busy = Object.keys(prod.active ?? {}).length > 0;
  const status = h('p', { class: 'status' }), go = h('button', { type: 'button', class: 'primary', disabled: busy }, r ? 'Gerar de novo (Claude)' : 'Gerar embalagem (Claude)');
  const bar = h('progress', { max: '6', value: '0', hidden: true });
  function watch(jobId) {
    go.disabled = true; bar.hidden = false;
    follow(jobId, root, (ev, d) => {
      if (ev === 'progress') { if (d.total) { bar.max = d.total; bar.value = d.done; } status.textContent = d.message ?? ''; return; }
      if (d.status === 'done') reload(); else { status.className = 'status err'; status.textContent = d.status === 'canceled' ? 'Cancelada' : d.error ?? 'Erro ao gerar a embalagem'; bar.hidden = true; go.disabled = false; }
    });
  }
  go.addEventListener('click', async () => {
    status.className = 'status'; status.textContent = 'Iniciando…';
    try { watch((await api.post(base, {})).jobId); } catch (e) { status.className = 'status err'; status.textContent = e.message; }
  });
  root.append(h('p', { class: 'dim' }, 'Usa o roteiro, a narração e os stills das cenas. Não gasta cota do YouTube. Pode levar alguns minutos.'), h('div', { class: 'row' }, go, bar), status);
  if (prod.active?.embalagem) watch(prod.active.embalagem);
  if (!r) return;

  const pick = h('input', { type: 'text', maxlength: '100', value: r.titulos[0].titulo, 'aria-label': 'Título escolhido' });
  let thumb = 1;
  const titles = r.titulos.map((t, i) => h('li', {}, h('label', { class: 'ch check' },
    h('input', { type: 'radio', name: 'titulo', checked: i === 0, onChange: () => { pick.value = t.titulo; } }),
    h('span', {}, h('strong', {}, t.titulo), ' ', h('small', { class: 'dim' }, `${t.molde ? 'molde: ' + t.molde + ' · ' : ''}${t.porque}`)))));
  const thumbs = r.thumbs.map(t => h('figure', {},
    h('img', { src: `${base.replace('/embalagem', '')}/files/thumb-${t.n}.png`, alt: t.texto, loading: 'lazy' }),
    h('label', { class: 'ch check' }, h('input', { type: 'radio', name: 'thumb', checked: t.n === 1, onChange: () => { thumb = t.n; } }), h('strong', {}, `${t.n}. ${t.texto}`)),
    h('div', {}, `${t.cor} · plano ${t.plano} · ${t.composicao}`), h('div', {}, t.porque)));
  const desc = h('textarea', { class: 'copy', rows: '14', maxlength: '5000', 'aria-label': 'Descrição', value: r.descricao });
  const review = prod.steps.revisao.status === 'done', out = h('div', { class: 'col' }), exp = h('button', { type: 'button', class: 'primary', disabled: !review }, 'Exportar');
  exp.addEventListener('click', async () => {
    exp.disabled = true; out.replaceChildren(h('span', {}, 'Exportando…'));
    try {
      const x = await api.post(`${base}/exportar`, { titulo: pick.value.trim(), thumb, descricao: desc.value });
      out.replaceChildren(h('p', {}, 'Exportado em ', h('code', {}, x.dir)), h('ul', { class: 'hist' }, x.files.map(f => h('li', {}, f))));
    } catch (e) { out.replaceChildren(h('p', { class: 'err' }, e.message)); }
    exp.disabled = !review;
  });
  root.append(
    h('p', { class: 'err', hidden: !r.aviso }, r.aviso ?? ''),
    h('h3', {}, 'Títulos (escolha um; pode editar)'), h('ul', { class: 'hist' }, titles), h('label', {}, 'Título escolhido', pick),
    h('h3', {}, 'Thumbnails (escolha uma)'), h('div', { class: 'thumbs' }, thumbs),
    h('h3', {}, 'Descrição (editável)'), desc,
    h('h3', {}, 'Tags'), h('p', {}, r.tags.join(', ')),
    h('div', { class: 'row' }, exp, h('small', { class: 'dim' }, review ? 'Copia vídeo, título, descrição, legendas, tags, thumbnail e fontes para a pasta de exportação.' : 'Aprove a revisão para exportar.')), out);
}
