// Etapa revisão: player do vídeo final, "Aprovar" (libera a embalagem) e "Trocar plano" (volta às cenas).
import { h } from '../../dom.js';
import { api } from '../../api.js';

const enc = encodeURIComponent;

export async function render(root, prod, { reload }) {
  const r = prod.steps.render;
  if (r.status !== 'done') return void root.append(h('p', { class: 'empty' }, 'Renderize o vídeo antes da revisão.'));
  const msg = h('p', { class: 'status' }), busy = Object.keys(prod.active).length > 0;
  const act = (path, body, then) => async () => {
    msg.className = 'status'; msg.textContent = '…';
    try { await api.post(`/api/productions/${enc(prod.id)}/${path}`, body); then(); } catch (e) { msg.className = 'status err'; msg.textContent = e.message; }
  };
  const ok = prod.steps.revisao.status === 'done';
  root.append(h('video', { class: 'player', controls: true, preload: 'metadata', src: `/api/productions/${enc(prod.id)}/files/video.mp4?v=${enc(r.finishedAt ?? '')}` }),
    h('p', { class: 'dim' }, `Verificado: ${r.result?.verify ?? '—'}`),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'primary', disabled: ok || busy, onClick: act('revisao', { aprovado: true }, reload) }, ok ? 'Aprovado' : 'Aprovar'),
      h('button', { type: 'button', disabled: busy, onClick: act('revisao/voltar', {}, () => { location.hash = `#/gerar?id=${enc(prod.id)}&passo=cenas`; }) }, 'Trocar plano')),
    msg);
}
