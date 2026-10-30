// Gerar vídeo: lista das produções e, com ?id=N&passo=<etapa>, a barra de etapas que carrega ./gen/<etapa>.js.
// Contrato de cada etapa: export async function render(root, prod, { reload }).
import { h, fmt } from '../dom.js';
import { api } from '../api.js';

const enc = encodeURIComponent;
export const STEPS = [['pauta', 'Pauta'], ['fontes', 'Fontes'], ['analise', 'Análise'], ['roteiro', 'Roteiro'], ['narracao', 'Narração'], ['cenas', 'Cenas'], ['render', 'Render'], ['revisao', 'Revisão'], ['embalagem', 'Embalagem']];
export const STATUS = { pending: 'pendente', running: 'rodando', done: 'feita', error: 'erro', canceled: 'cancelada', stale: 'desatualizada' };
const NAME = Object.fromEntries(STEPS);
// 850 ms → "0,9 s"; 125 s → "2 min 05 s"; 3725 s → "1 h 02 min".
export function msText(ms) {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.round(ms / 1000), p = n => String(n).padStart(2, '0');
  return ms < 60e3 ? (ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' s' : s < 3600 ? `${Math.floor(s / 60)} min ${p(s % 60)} s` : `${Math.floor(s / 3600)} h ${p(Math.floor(s / 60) % 60)} min`;
}
// Etapa atual: a que roda; senão a primeira que não está feita; tudo feito, a última.
export const current = prod => STEPS.map(([k]) => k).find(k => prod.steps[k].status === 'running') ?? STEPS.map(([k]) => k).find(k => prod.steps[k].status !== 'done') ?? 'embalagem';
const total = prod => Object.values(prod.steps).reduce((a, s) => a + (s.ms ?? 0), 0);

export async function render(root, params) {
  try {
    const id = params.get('id');
    if (id == null) return await list(root);
    await detail(root, id, params.get('passo'));
  } catch (e) { if (root.isConnected) root.append(h('p', { class: 'err' }, e.message)); }
}

// Linha de uma produção, também usada em Meus canais.
export const prodItem = (p, channel) => {
  const k = current(p);
  return h('li', { class: 'row' }, h('a', { href: '#/gerar?id=' + enc(p.id) }, p.theme ?? '(sem tema)'),
    h('small', { class: 'dim' }, [channel, `${NAME[k]}: ${STATUS[p.steps[k].status]}`, msText(total(p)), fmt.date(p.createdAt)].filter(Boolean).join(' · ')));
};

async function list(root) {
  const [rows, mine] = await Promise.all([api.get('/api/productions'), api.get('/api/mychannels')]);
  if (!root.isConnected) return;
  const names = new Map(mine.map(m => [m.id, m.name])), status = h('p', { class: 'status' });
  const my = h('select', { 'aria-label': 'Canal' }, mine.map(m => h('option', { value: String(m.id) }, m.name)));
  const theme = h('input', { type: 'text', maxlength: '200', placeholder: 'Tema (opcional: escolha na pauta)', 'aria-label': 'Tema' });
  const create = h('button', { type: 'submit', class: 'primary' }, 'Nova produção');
  async function submit() {
    create.disabled = true; status.className = 'status'; status.textContent = 'Criando…';
    try { const p = await api.post('/api/productions', { myId: Number(my.value), theme: theme.value.trim() || null }); location.hash = '#/gerar?id=' + enc(p.id); }
    catch (e) { status.className = 'status err'; status.textContent = e.message; create.disabled = false; }
  }
  root.append(h('h1', {}, 'Gerar vídeo'),
    mine.length ? h('form', { class: 'row', novalidate: true, onSubmit: e => { e.preventDefault(); submit(); } }, my, theme, create)
      : h('p', { class: 'empty' }, 'Crie um canal em ', h('a', { href: '#/meus?novo=1' }, 'Meus canais'), ' antes de produzir.'),
    status,
    rows.length ? h('ul', { class: 'hist prods' }, rows.map(p => prodItem(p, names.get(p.myId)))) : h('p', { class: 'empty' }, 'Nenhuma produção ainda.'));
}

async function detail(root, id, passo) {
  const p = await api.get('/api/productions/' + enc(id));
  if (!root.isConnected) return;
  const step = NAME[passo] ? passo : current(p), s = p.steps[step];
  const reload = () => { const fresh = h('div'); root.replaceWith(fresh); return detail(fresh, id, step).catch(e => fresh.append(h('p', { class: 'err' }, e.message))); };
  const bar = h('nav', { class: 'steps' }, STEPS.map(([k, label]) => h('a', { href: `#/gerar?id=${enc(p.id)}&passo=${k}`, class: `step ${p.steps[k].status}${k === step ? ' on' : ''}`, title: STATUS[p.steps[k].status] },
    h('strong', {}, label), h('small', {}, STATUS[p.steps[k].status]), h('small', { class: 'time' }, msText(p.steps[k].ms)))));
  const del = h('span', { class: 'row' }), msg = h('p', { class: 'status' });
  const resetDel = () => del.replaceChildren(h('button', { type: 'button', onClick: () => del.replaceChildren(h('span', {}, 'Apagar esta produção e os arquivos?'),
    h('button', { type: 'button', class: 'primary', onClick: doDel }, 'Sim, apagar'), h('button', { type: 'button', onClick: resetDel }, 'Cancelar')) }, 'Apagar'));
  async function doDel() {
    try { await api.post(`/api/productions/${enc(p.id)}/delete`, {}); location.hash = '#/gerar'; }
    catch (e) { msg.className = 'status err'; msg.textContent = e.message; resetDel(); }
  }
  resetDel();
  const panel = h('section', { class: 'stage' });
  root.append(h('p', {}, h('a', { href: '#/gerar' }, '← Produções')), h('h1', {}, p.theme ?? '(sem tema)'),
    h('p', { class: 'dim' }, `${p.style} · ${p.targetMin} ± ${p.toleranceMin} min · tempo total ${msText(total(p))}`),
    bar, h('h2', {}, NAME[step], ' ', h('small', { class: 'dim' }, `${STATUS[s.status]} · ${msText(s.ms)}`)),
    h('p', { class: 'err', hidden: !s.error }, s.error ?? ''), panel, h('div', { class: 'row' }, del), msg);
  const mod = await import(`./gen/${step}.js`);
  if (root.isConnected) await mod.render(panel, p, { reload });
}
