// Coleções: lista (criar, renomear, apagar) e detalhe (canais e vídeos com nota editável). Favoritos é a coleção 1.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { openChannel, subsText, avatar, dec } from './channel.js';

const FAV = 1;
const EMPTY = 'Coleção vazia. Use ★ ou "Coleção…" nas listas e no painel.';
const cell = (...c) => h('td', {}, ...c);
const mult = m => m == null || !Number.isFinite(m) ? '—' : dec(m) + 'x';

export async function render(root, params) {
  const id = params.get('id');
  if (id != null) return detail(root, id);
  const status = h('p', { class: 'status' }), list = h('div', { class: 'list' });
  const fail = e => { status.className = 'status err'; status.textContent = e.message; };
  const name = h('input', { type: 'text', maxlength: '60', placeholder: 'Nome da coleção', 'aria-label': 'Nome da nova coleção' });
  const create = async ev => {
    ev.preventDefault(); if (!name.value.trim()) return;
    try { await api.post('/api/collections', { name: name.value.trim() }); name.value = ''; status.textContent = ''; await load(); } catch (e) { fail(e); }
  };

  // Renomear e apagar trocam as células da linha por um campo ou pela confirmação.
  function renameRow(c, nameCell, actions) {
    const input = h('input', { type: 'text', value: c.name, maxlength: '60', 'aria-label': 'Novo nome' });
    nameCell.replaceChildren(input); input.focus();
    actions.replaceChildren(
      h('button', { type: 'button', class: 'primary', onClick: async () => { try { await api.post(`/api/collections/${c.id}/rename`, { name: input.value.trim() }); status.textContent = ''; await load(); } catch (e) { fail(e); } } }, 'Salvar'),
      h('button', { type: 'button', onClick: () => load() }, 'Cancelar'));
  }
  function deleteRow(c, actions) {
    actions.replaceChildren(h('span', { class: 'err' }, `Apagar a coleção e os ${c.count} itens?`),
      h('button', { type: 'button', class: 'primary', onClick: async () => { try { await api.post(`/api/collections/${c.id}/delete`); status.textContent = ''; await load(); } catch (e) { fail(e); } } }, 'Apagar'),
      h('button', { type: 'button', onClick: () => load() }, 'Cancelar'));
  }
  function draw(cols) {
    list.replaceChildren(h('table', { class: 'grid' },
      h('thead', {}, h('tr', {}, ['Coleção', 'Itens', ''].map(t => h('th', {}, t)))),
      h('tbody', {}, cols.map(c => {
        const nameCell = cell(h('strong', {}, c.name)), actions = cell();
        actions.append(h('a', { href: c.id === FAV ? '#/favoritos' : '#/colecoes?id=' + c.id }, 'Abrir'),
          ...(c.fixed ? [] : [h('button', { type: 'button', onClick: () => renameRow(c, nameCell, actions) }, 'Renomear'), h('button', { type: 'button', onClick: () => deleteRow(c, actions) }, 'Apagar')]));
        return h('tr', {}, nameCell, cell(String(c.count)), actions);
      }))));
  }
  async function load() {
    let cols; try { cols = await api.get('/api/collections'); } catch (e) { if (root.isConnected) list.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
    if (root.isConnected) draw(cols);
  }

  root.append(h('h1', {}, 'Coleções'), h('form', { class: 'bar', onSubmit: create }, name, h('button', { type: 'submit', class: 'primary' }, 'Criar')), status, list);
  await load();
}

export const renderFavorites = root => detail(root, FAV);

async function detail(root, id) {
  const panel = h('aside', { class: 'panel', hidden: true }), body = h('div', { class: 'list' }), status = h('p', { class: 'status' });
  const fail = e => { status.className = 'status err'; status.textContent = e.message; };
  const base = `/api/collections/${encodeURIComponent(id)}`;
  let title = h('h1', {}, 'Coleção');

  const remove = it => async () => { try { await api.post(base + '/items/remove', { kind: it.kind, id: it.id }); status.textContent = ''; await load(); } catch (e) { fail(e); } };
  const note = it => {
    const input = h('input', { type: 'text', class: 'note', value: it.note ?? '', maxlength: '500', placeholder: 'Nota', 'aria-label': 'Nota' });
    input.addEventListener('change', async () => { try { await api.post(base + '/items', { kind: it.kind, id: it.id, note: input.value }); status.textContent = ''; } catch (e) { fail(e); } });
    return input;
  };
  const gone = it => [cell(h('code', {}, it.id), ' ', h('small', { class: 'dim' }, 'fora da base'))];

  function channels(items) {
    return [h('h2', {}, 'Canais'), h('table', { class: 'grid' },
      h('thead', {}, h('tr', {}, ['Canal', 'Inscritos', 'Média/vídeo', 'Score', 'Nota', ''].map(t => h('th', {}, t)))),
      h('tbody', {}, items.map(it => {
        const r = it.row, rest = [cell(note(it)), cell(...(r ? [h('button', { type: 'button', onClick: () => { openChannel(panel, it.id); } }, 'Analisar')] : []), h('button', { type: 'button', onClick: remove(it) }, 'Remover'))];
        return h('tr', {}, ...(r ? [cell(h('div', { class: 'ch' }, avatar(r.avatar), h('div', {}, h('strong', {}, r.title ?? r.id), h('small', { class: 'dim block' }, 'dados de ' + fmt.date(r.updatedAt))))), cell(subsText(r.subs)), cell(fmt.num(r.avgViews)), cell(fmt.num(r.score))] : [...gone(it), cell(), cell(), cell()]), ...rest);
      })))];
  }
  function videos(items) {
    return [h('h2', {}, 'Vídeos'), h('table', { class: 'grid' },
      h('thead', {}, h('tr', {}, ['', 'Vídeo', 'Canal', 'Views', 'Múltiplo', 'Nota', ''].map(t => h('th', {}, t)))),
      h('tbody', {}, items.map(it => {
        const r = it.row, rest = [cell(note(it)), cell(h('button', { type: 'button', onClick: remove(it) }, 'Remover'))];
        return h('tr', {}, ...(r
          ? [cell(r.thumb ? h('img', { src: r.thumb, alt: '', class: 'thumb', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null),
            cell(h('a', { href: 'https://www.youtube.com/watch?v=' + encodeURIComponent(r.id), rel: 'noopener noreferrer', target: '_blank' }, r.title ?? r.id), h('small', { class: 'dim block' }, 'dados de ' + fmt.date(r.capturedAt))),
            cell(r.channelTitle ?? '—'), cell(fmt.num(r.views)), cell(mult(r.multiple))]
          : [cell(), ...gone(it), cell(), cell(), cell()]), ...rest);
      })))];
  }

  async function load() {
    let c; try { c = await api.get(base); } catch (e) { if (root.isConnected) body.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
    if (!root.isConnected) return;
    const next = h('h1', {}, c.name); title.replaceWith(next); title = next;
    const ch = c.items.filter(i => i.kind === 'channel'), vd = c.items.filter(i => i.kind === 'video');
    body.replaceChildren(...(c.items.length ? [...(ch.length ? channels(ch) : []), ...(vd.length ? videos(vd) : [])] : [h('p', { class: 'empty' }, EMPTY)]));
  }

  root.append(h('a', { href: '#/colecoes' }, '← Voltar'), title, status, h('div', { class: 'split' }, body, panel));
  await load();
}
