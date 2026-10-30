// Etapa render: loops → verify do motor, com progresso, subetapas com tempo e cancelar.
// runPanel também serve à narração e às cenas: botão rodar/refazer, barra, log das linhas e cancelar.
import { h } from '../../dom.js';
import { api } from '../../api.js';
import { follow } from '../channel.js';
import { msText } from '../generate.js';

const enc = encodeURIComponent;
export const SUB = [['loops', 'Loops'], ['segments', 'Segmentos'], ['mix', 'Mixagem'], ['assemble', 'Montagem'], ['verify', 'Verificação']];

export function runPanel(root, prod, name, label, reload) {
  const s = prod.steps[name], other = Object.keys(prod.active).find(k => k !== name);
  const btn = h('button', { type: 'button', class: 'primary', disabled: !!other }, s.status === 'pending' ? label : 'Refazer');
  const cancel = h('button', { type: 'button', hidden: true }, 'Cancelar'), bar = h('progress', { max: '1', value: '0' });
  const msg = h('p', { class: 'status' }, other ? `Outra etapa em andamento: ${other}` : ''), log = h('ol', { class: 'dim time' });
  const job = h('div', { class: 'job', hidden: true }, bar, msg, log);
  function watch(jobId) {
    btn.disabled = true; cancel.hidden = false; job.hidden = false;
    cancel.onclick = async () => { cancel.disabled = true; try { await api.post(`/api/jobs/${enc(jobId)}/cancel`, {}); } catch (e) { msg.className = 'status err'; msg.textContent = e.message; } };
    follow(jobId, root, (ev, d) => {
      if (ev === 'progress') {
        if (d.total) { bar.max = String(d.total); bar.value = String(d.done); } else bar.removeAttribute('value');
        if (d.message && d.message !== msg.textContent) { msg.textContent = d.message; log.append(h('li', {}, d.message)); }
      } else reload();
    });
  }
  btn.onclick = async () => {
    btn.disabled = true; msg.className = 'status'; msg.textContent = 'Começando…';
    try { await api.post(`/api/productions/${enc(prod.id)}/${name}`, {}); reload(); } // a tela nova já mostra a etapa rodando e segue o job
    catch (e) { msg.className = 'status err'; msg.textContent = e.message; btn.disabled = false; job.hidden = false; }
  };
  root.append(h('div', { class: 'row' }, btn, cancel), job);
  if (prod.active[name]) watch(prod.active[name]);
}

export async function render(root, prod, { reload }) {
  root.append(h('p', { class: 'dim' }, 'Renderiza os loops que faltam no acervo (um Chrome por vez), corta os segmentos, mixa, monta e verifica o vídeo.'));
  runPanel(root, prod, 'render', 'Renderizar', reload);
  const r = prod.steps.render.result;
  if (!r) return;
  root.append(h('p', {}, 'Verificado: ', h('strong', {}, r.verify)),
    h('div', { class: 'times' }, SUB.flatMap(([k, l]) => [h('span', { class: 'dim' }, l), h('span', {}, msText(r.subSteps?.[k]))])),
    h('p', {}, h('a', { href: `#/gerar?id=${enc(prod.id)}&passo=revisao` }, 'Assistir na revisão →')));
}
