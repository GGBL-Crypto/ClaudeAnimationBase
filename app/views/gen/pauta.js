// Etapa Pauta: tema (escolhido das sugestões ou escrito), duração alvo ± tolerância e estilo.
import { h, fmt } from '../../dom.js';
import { api } from '../../api.js';

const enc = encodeURIComponent;
const num = (n, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
// De onde veio a sugestão: números coletados com data ou o dia do plano.
const refText = s => s.origem === 'outlier' ? `outlier de concorrente: ${num(s.ref.multiple)}× a mediana, ${num(s.ref.views, 0)} views em ${fmt.date(s.ref.capturedAt)}` : `plano de 30 dias, dia ${s.ref.dia}`;

export async function render(root, prod, { reload }) {
  const g = await api.get(`/api/productions/${enc(prod.id)}/pauta`);
  if (!root.isConnected) return;
  const busy = Object.keys(prod.active ?? {}).length > 0, status = h('p', { class: 'status' });
  const theme = h('input', { type: 'text', maxlength: '200', value: g.theme ?? '', 'aria-label': 'Tema' });
  const target = h('input', { type: 'number', min: '10', max: '120', step: '1', value: String(g.targetMin), 'aria-label': 'Duração alvo (min)' });
  const tol = h('input', { type: 'number', min: '1', max: '15', step: '1', value: String(g.toleranceMin), 'aria-label': 'Tolerância (min)' });
  const style = h('select', { 'aria-label': 'Estilo' }, g.styles.map(s => h('option', { value: s.id, selected: s.id === g.style }, s.name ?? s.id)));
  style.value = g.style;
  const save = h('button', { type: 'submit', class: 'primary', disabled: busy }, 'Salvar pauta');
  async function submit() {
    save.disabled = true; status.className = 'status'; status.textContent = 'Salvando…';
    try {
      await api.post(`/api/productions/${enc(prod.id)}/pauta`, { theme: theme.value.trim(), targetMin: Number(target.value), toleranceMin: Number(tol.value), style: style.value });
      await reload();
    } catch (e) { status.className = 'status err'; status.textContent = e.message; save.disabled = busy; }
  }
  root.append(
    h('form', { novalidate: true, onSubmit: e => { e.preventDefault(); submit(); } },
      h('label', {}, 'Tema (3 a 200 caracteres)', theme),
      h('div', { class: 'row' }, h('label', {}, 'Duração alvo (min, 10 a 120)', target), h('label', {}, '± tolerância (min, 1 a 15)', tol), h('label', {}, 'Estilo', style)),
      h('div', { class: 'row' }, save, g.theme ? h('a', { href: `#/gerar?id=${enc(prod.id)}&passo=fontes` }, 'Próximo: Fontes →') : null), status),
    h('h3', {}, 'Sugestões'),
    g.suggestions.length ? h('ul', { class: 'hist' }, g.suggestions.map(s => h('li', { class: 'row' },
      h('span', {}, h('strong', {}, s.tema), ' ', h('small', { class: 'dim' }, refText(s))),
      h('button', { type: 'button', onClick: () => { theme.value = s.tema; theme.focus(); } }, 'Usar'))))
      : h('p', { class: 'empty' }, 'Sem sugestões: colete vídeos dos concorrentes do canal ou use uma modelagem com plano de 30 dias. Escreva o tema acima.'));
}
