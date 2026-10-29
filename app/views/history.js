// Histórico: buscas (com Refazer), canais abertos e jobs.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { describeEntry } from './overview.js';
import { follow } from './channel.js';

const when = iso => fmt.date(iso) === '—' ? '—' : new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const section = (title, rows) => [h('h2', {}, title), rows.length ? h('ul', { class: 'hist' }, rows) : h('p', { class: 'empty' }, 'Nada ainda.')];

export async function render(root) {
  root.append(h('h1', {}, 'Histórico'));
  let hist, cfg, quota;
  try { [hist, cfg, quota] = await Promise.all([api.get('/api/history'), api.get('/api/config'), api.get('/api/quota')]); }
  catch (e) { if (root.isConnected) root.append(h('p', { class: 'err' }, e.message)); return; }
  if (!root.isConnected) return;
  const status = h('p', { class: 'dim' });
  let busy = false;

  // Dentro da validade do cache a repetição não gasta cota.
  async function redo(e) {
    if (busy) return;
    busy = true;
    const p = e.payload ?? {}, isVideos = e.kind === 'videos';
    const cached = p.status !== 'error' && Date.now() - Date.parse(e.at) < cfg.cacheHours * 36e5;
    const cost = cached ? 'sem custo (cache)' : `${quota.costs[isVideos ? 'videos' : 'mine']} unidades de cota`;
    if (!confirm(`Refazer a busca "${p.q}"? Custo estimado: ${cost}.`)) { busy = false; return; }
    status.className = 'dim'; status.textContent = 'Iniciando…';
    try {
      const { jobId } = await api.post(isVideos ? '/api/videos/mine' : '/api/mine', isVideos ? { q: p.q, ...(p.filters ?? {}) } : { q: p.q });
      follow(jobId, root, (ev, d) => {
        if (ev !== 'end') return;
        busy = false;
        root.replaceChildren(); render(root);
        if (d.status === 'error') root.append(h('p', { class: 'err' }, d.error ?? 'Erro no job'));
      });
    } catch (err) { busy = false; status.className = 'err'; status.textContent = err.message; }
  }

  const searches = hist.entries.filter(e => ['mine', 'videos', 'import', 'refresh', 'monitor'].includes(e.kind)).map(e => {
    const p = e.payload ?? {}, redoable = e.kind === 'mine' || e.kind === 'videos';
    return h('li', {}, describeEntry(e),
      e.kind === 'videos' && p.filters && Object.keys(p.filters).length ? h('small', { class: 'dim' }, ' [' + Object.entries(p.filters).map(([k, v]) => `${k}=${v}`).join(', ') + ']') : null,
      ' ', h('small', { class: 'dim' }, when(e.at)),
      redoable ? [' ', h('button', { type: 'button', onClick: () => redo(e) }, 'Refazer')] : null);
  });
  const opened = hist.entries.filter(e => e.kind === 'open').map(e => h('li', {},
    h('a', { href: '#/minerar?canal=' + encodeURIComponent(e.payload?.id ?? '') }, e.payload?.title ?? e.payload?.id ?? '—'), ' ', h('small', { class: 'dim' }, when(e.at))));
  const jobs = hist.jobs.map(j => h('li', {}, `${j.kind} · ${j.status} · criado ${when(j.createdAt)} · terminado ${when(j.finishedAt)}`,
    j.error ? [' ', h('span', { class: 'err' }, j.error)] : null));

  root.append(status, ...section('Buscas', searches), ...section('Canais abertos', opened), ...section('Jobs', jobs));
}
