// Controles de coleção compartilhados: estrela de Favoritos (coleção 1) e seletor de coleções.
import { h } from '../dom.js';
import { api } from '../api.js';

const key = (kind, id) => kind + ':' + id;
const enc = encodeURIComponent;

// Itens de Favoritos como "channel:UC…" / "video:…".
export async function loadFavs() {
  const fav = await api.get('/api/collections/1');
  return new Set(fav.items.map(i => key(i.kind, i.id)));
}

export function favButton(kind, id, favs) {
  const b = h('button', { type: 'button', class: 'star link' });
  const paint = () => { const on = favs.has(key(kind, id)); b.textContent = on ? '★' : '☆'; b.title = on ? 'Tirar dos favoritos' : 'Favoritar'; b.classList.toggle('on', on); };
  paint();
  b.addEventListener('click', async () => {
    const on = favs.has(key(kind, id));
    b.disabled = true;
    try { await api.post(`/api/collections/1/items${on ? '/remove' : ''}`, { kind, id }); on ? favs.delete(key(kind, id)) : favs.add(key(kind, id)); paint(); }
    catch (e) { b.title = e.message; }
    finally { b.disabled = false; }
  });
  return b;
}

export function collectButton(kind, id) {
  const status = h('p', { class: 'status err' }), list = h('div'), picker = h('div', { class: 'picker', hidden: true });
  const set = (c, on) => api.post(`/api/collections/${c}/items${on ? '' : '/remove'}`, { kind, id });
  const row = (c, on) => {
    const box = h('input', { type: 'checkbox', checked: on });
    box.addEventListener('change', async () => {
      status.textContent = '';
      try { await set(c.id, box.checked); } catch (e) { box.checked = !box.checked; status.textContent = e.message; }
    });
    return h('label', {}, box, c.name);
  };
  const name = h('input', { type: 'text', maxlength: '60', placeholder: 'Nova coleção', 'aria-label': 'Nova coleção' });
  const create = h('button', { type: 'button', onClick: async () => {
    if (!name.value.trim()) return;
    status.textContent = '';
    try { const c = await api.post('/api/collections', { name: name.value.trim() }); await set(c.id, true); list.append(row(c, true)); name.value = ''; }
    catch (e) { status.textContent = e.message; }
  } }, 'Criar');
  async function open() {
    status.textContent = ''; list.replaceChildren(h('small', { class: 'dim' }, 'Carregando…'));
    try {
      const [cols, mem] = await Promise.all([api.get('/api/collections'), api.get(`/api/memberships?kind=${enc(kind)}&id=${enc(id)}`)]);
      list.replaceChildren(...cols.map(c => row(c, mem.ids.includes(c.id))));
    } catch (e) { list.replaceChildren(); status.textContent = e.message; }
  }
  picker.append(list, h('div', { class: 'row' }, name, create), status);
  return h('span', { class: 'pick' }, h('button', { type: 'button', onClick: () => { picker.hidden = !picker.hidden; if (!picker.hidden) open(); } }, 'Coleção…'), picker);
}
