// Etapa Fontes: busca na Wikipedia (prévia do trecho e marcação) ou link colado com trecho; de 1 a 12 fontes.
import { h } from '../../dom.js';
import { api } from '../../api.js';
import { follow } from '../channel.js';

const enc = encodeURIComponent, MAX = 12;

export async function render(root, prod, { reload }) {
  const g = await api.get(`/api/productions/${enc(prod.id)}/pauta`);
  if (!root.isConnected) return;
  const busy = Object.keys(prod.active ?? {}).length > 0, picked = [], status = h('p', { class: 'status' });
  const saved = prod.steps.fontes.result?.sources ?? [];

  // Escolhidas: wikipedia { kind, title } ou link { kind, url, title, excerpt }.
  const list = h('ul', { class: 'hist' }), count = h('small', { class: 'dim' }), save = h('button', { type: 'button', class: 'primary', disabled: true }, 'Salvar fontes');
  function paint() {
    list.replaceChildren(...picked.map((f, i) => h('li', { class: 'row' }, h('span', {}, h('strong', {}, f.title), ' ', h('small', { class: 'dim' }, f.kind === 'wikipedia' ? 'Wikipedia' : f.url)),
      h('button', { type: 'button', onClick: () => { picked.splice(i, 1); paint(); } }, 'Tirar'))));
    count.textContent = `${picked.length} de ${MAX}`; save.disabled = busy || !picked.length;
  }
  function add(f) {
    if (picked.length >= MAX) { status.className = 'status err'; status.textContent = 'No máximo 12 fontes'; return false; }
    if (picked.some(p => p.kind === f.kind && (f.kind === 'wikipedia' ? p.title === f.title : p.url === f.url))) return false;
    status.textContent = ''; picked.push(f); paint(); return true;
  }

  const q = h('input', { type: 'text', maxlength: '200', value: g.theme ?? '', 'aria-label': 'Buscar na Wikipedia' });
  const found = h('div');
  async function search() {
    if (!q.value.trim()) return;
    found.replaceChildren(h('p', { class: 'status' }, 'Buscando…'));
    try {
      const rs = await api.get(`/api/wiki/search?lang=${enc(g.lang)}&q=${enc(q.value.trim())}`);
      found.replaceChildren(rs.length ? h('ul', { class: 'hist' }, rs.map(r => h('li', { class: 'row' },
        h('span', {}, h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.title), h('br'), h('small', { class: 'dim' }, r.snippet)),
        h('button', { type: 'button', onClick: () => add({ kind: 'wikipedia', title: r.title }) }, 'Marcar')))) : h('p', { class: 'empty' }, 'Nada encontrado.'));
    } catch (e) { found.replaceChildren(h('p', { class: 'status err' }, e.message + '. Cole links abaixo.')); }
  }

  const url = h('input', { type: 'url', maxlength: '2000', placeholder: 'https://…', 'aria-label': 'Link' });
  const title = h('input', { type: 'text', maxlength: '200', placeholder: 'Título da fonte', 'aria-label': 'Título' });
  const excerpt = h('textarea', { maxlength: '5000', rows: '4', placeholder: 'Trecho colado da fonte (até 5000 caracteres)', 'aria-label': 'Trecho' });
  const addLink = () => {
    if (!/^https:\/\//i.test(url.value.trim()) || !title.value.trim() || !excerpt.value.trim()) { status.className = 'status err'; status.textContent = 'Link https://, título e trecho são obrigatórios'; return; }
    if (add({ kind: 'link', url: url.value.trim(), title: title.value.trim(), excerpt: excerpt.value.trim() })) url.value = title.value = excerpt.value = '';
  };

  save.addEventListener('click', async () => {
    save.disabled = true; status.className = 'status'; status.textContent = 'Salvando…';
    try {
      const { jobId } = await api.post(`/api/productions/${enc(prod.id)}/fontes`, { fontes: picked });
      follow(jobId, root, (ev, d) => {
        if (ev === 'progress') status.textContent = d.message ?? 'Salvando…';
        else if (d.status === 'done') reload();
        else { status.className = 'status err'; status.textContent = d.error ?? 'Falha ao salvar as fontes'; paint(); }
      });
    } catch (e) { status.className = 'status err'; status.textContent = e.message; paint(); }
  });
  paint();

  root.append(
    ...(saved.length ? [h('section', {}, h('h3', {}, `Fontes salvas (${saved.length})`), h('ul', { class: 'hist' }, saved.map(s => h('li', {}, h('strong', {}, s.title), ' ',
      h('small', { class: 'dim' }, `${s.kind === 'wikipedia' ? 'Wikipedia' : 'link'} · acessada em ${s.accessed.split('-').reverse().join('/')} · ${s.chars} caracteres`)))),
      h('small', { class: 'dim' }, 'Salvar de novo troca todas as fontes.'))] : []),
    h('h3', {}, 'Wikipedia'),
    h('form', { class: 'row', novalidate: true, onSubmit: e => { e.preventDefault(); search(); } }, q, h('button', { type: 'submit' }, 'Buscar')), found,
    h('h3', {}, 'Link colado'), h('p', { class: 'dim' }, 'O app não abre o link: cole o endereço, o título e o trecho que vale como fonte.'),
    h('div', { class: 'col' }, url, title, excerpt, h('div', { class: 'row' }, h('button', { type: 'button', onClick: addLink }, 'Adicionar link'))),
    h('h3', {}, 'Marcadas ', count), list, h('div', { class: 'row' }, save), status);
}
