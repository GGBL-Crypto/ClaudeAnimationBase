// Etapa Análise (opcional): até 3 outliers dos concorrentes, o padrão de roteiro de cada um (legenda + Claude) ou pular.
import { h, fmt } from '../../dom.js';
import { api } from '../../api.js';
import { follow } from '../channel.js';

const enc = encodeURIComponent, MAX = 3;

// Padrão de um vídeo; sem análise gravada, a legenda não existia.
const pattern = r => h('article', { class: 'card' }, h('strong', {}, r.title ?? r.videoId),
  !r.output ? h('p', { class: 'dim' }, 'Vídeo sem legenda') : h('div', {},
    h('p', {}, h('strong', {}, 'Gancho: '), r.output.gancho),
    h('ol', {}, r.output.estrutura.map(e => h('li', {}, h('strong', {}, e.parte), ` (${Math.round(e.proporcao * 100)}%) `, e.funcao))),
    h('p', {}, h('strong', {}, 'Ritmo: '), r.output.ritmo),
    h('ul', {}, r.output.tecnicas.map(t => h('li', {}, t))),
    h('small', { class: 'dim' }, 'gerado pelo Claude; confira antes de usar')));

export async function render(root, prod, { reload }) {
  const url = `/api/productions/${enc(prod.id)}/analise`;
  const [cands, done] = await Promise.all([api.get(url), api.get(url + '/resultados')]);
  if (!root.isConnected) return;
  const busy = Object.keys(prod.active ?? {}).length > 0, picked = new Set(), status = h('p', { class: 'status' });
  const go = h('button', { type: 'button', class: 'primary', disabled: true }, 'Analisar'), skip = h('button', { type: 'button', disabled: busy }, 'Pular etapa');
  const boxes = cands.map(c => {
    const box = h('input', { type: 'checkbox', 'aria-label': c.title, onChange: () => {
      box.checked ? picked.add(c.videoId) : picked.delete(c.videoId);
      for (const b of boxes) b.disabled = busy || (!b.checked && picked.size >= MAX);
      go.disabled = busy || !picked.size;
    } });
    box.disabled = busy; return box;
  });

  async function send(videoIds) {
    go.disabled = skip.disabled = true; status.className = 'status'; status.textContent = videoIds.length ? 'Baixando a legenda…' : 'Pulando…';
    try {
      const { jobId } = await api.post(url, { videoIds });
      follow(jobId, root, (ev, d) => {
        if (ev === 'progress') status.textContent = d.message ?? '';
        else if (d.status === 'done') reload();
        else { status.className = 'status err'; status.textContent = d.error ?? 'Falha na análise'; skip.disabled = busy; go.disabled = !picked.size; }
      });
    } catch (e) { status.className = 'status err'; status.textContent = e.message; skip.disabled = busy; go.disabled = !picked.size; }
  }
  go.addEventListener('click', () => send([...picked]));
  skip.addEventListener('click', () => send([]));

  root.append(
    h('p', { class: 'dim' }, 'Opcional. O app baixa só a legenda de até 3 vídeos de sucesso dos concorrentes e extrai o padrão de roteiro (gancho, estrutura, ritmo). O roteiro usa o padrão, nunca o texto.'),
    done.length ? h('section', {}, h('h3', {}, 'Padrões desta produção'), h('div', { class: 'cards' }, done.map(pattern))) : prod.steps.analise.status === 'done' ? h('p', { class: 'dim' }, 'Etapa pulada.') : '',
    h('h3', {}, 'Outliers dos concorrentes'),
    cands.length ? h('div', { class: 'sim' }, cands.map((c, i) => h('label', { class: 'check' }, boxes[i], h('span', {}, h('strong', {}, c.title), ' ',
      h('small', { class: 'dim' }, [c.channelTitle, `${fmt.num(c.views)} views`, c.multiple != null && `${c.multiple}× a média`, c.analisado && 'já analisado'].filter(Boolean).join(' · ')))))) 
      : h('p', { class: 'empty' }, 'Nenhum outlier recente nos concorrentes deste canal. Você pode pular a etapa.'),
    h('div', { class: 'row' }, go, skip), status);
}
