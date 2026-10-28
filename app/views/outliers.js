// Outliers: vídeos bem acima da mediana do próprio canal, com filtros na URL.
import { h } from '../dom.js';
import { api } from '../api.js';
import { videoList } from './videos.js';
import { dec } from './channel.js';

const AGES = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['365', '365 dias'], ['', 'Tudo']];

export async function render(root, params) {
  const st = new URLSearchParams(params);
  const sync = () => history.replaceState(null, '', '#/outliers' + (String(st) ? '?' + st : ''));
  let min = 2; try { min = (await api.get('/api/config')).outlierMin ?? 2; } catch {}
  if (!root.isConnected) return;
  // padrão: múltiplo mínimo da configuração e ordem por múltiplo
  const extra = qs => { if (!qs.get('multipleMin')) qs.set('multipleMin', min); if (!qs.get('sort')) qs.set('sort', 'multiple'); };
  const vl = videoList(root, st, sync, { extra, empty: () => `Nenhum vídeo acima de ${dec(Number(st.get('multipleMin') || min))}× a mediana do canal.` });

  const tag = h('input', { type: 'text', value: st.get('tag') ?? '' }), multipleMin = h('input', { type: 'number', min: '0', step: 'any', value: st.get('multipleMin') ?? '', placeholder: String(min) });
  const age = h('select', {}, AGES.map(([v, label]) => h('option', { value: v }, label)));
  age.value = st.get('maxAgeDays') ?? '';
  function applyForm() {
    for (const [k, el] of [['tag', tag], ['maxAgeDays', age], ['multipleMin', multipleMin]]) { const v = el.value.trim(); if (v) st.set(k, v); else st.delete(k); }
    sync(); vl.load();
  }
  const form = h('form', { class: 'filters', onChange: applyForm, onSubmit: e => { e.preventDefault(); applyForm(); } },
    h('label', {}, 'Etiqueta', tag), h('label', {}, 'Idade do vídeo', age), h('label', {}, 'Múltiplo mín.', multipleMin));

  root.append(h('h1', {}, 'Outliers'), form, vl.el);
  await vl.load();
}
