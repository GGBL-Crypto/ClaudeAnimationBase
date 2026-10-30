// Etapa Roteiro: esboço e capítulos pelo Claude, palavras por capítulo contra a meta, editar a narração de um plano e refazer um capítulo.
import { h } from '../../dom.js';
import { api } from '../../api.js';
import { follow } from '../channel.js';

const enc = encodeURIComponent, num = n => n.toLocaleString('pt-BR');

export async function render(root, prod, { reload }) {
  const base = `/api/productions/${enc(prod.id)}/roteiro`, busy = Object.keys(prod.active ?? {}).length > 0;
  const { result: r, episode } = await api.get(base);
  if (!root.isConnected) return;
  const status = h('p', { class: 'status' }), bar = h('progress', { max: '1', value: '0', hidden: true });
  const go = h('button', { type: 'button', class: 'primary', disabled: busy }, r ? 'Gerar de novo (Claude)' : 'Gerar roteiro (Claude)');
  const redo = [];
  function watch(jobId) {
    go.disabled = true; bar.hidden = false; for (const b of redo) b.disabled = true;
    follow(jobId, root, (ev, d) => {
      if (ev === 'progress') { if (d.total) { bar.max = d.total; bar.value = d.done; } status.textContent = d.message ?? ''; return; }
      if (d.status === 'done') reload(); else { status.className = 'status err'; status.textContent = d.status === 'canceled' ? 'Cancelada' : d.error ?? 'Erro ao gerar o roteiro'; bar.hidden = true; go.disabled = false; for (const b of redo) b.disabled = false; }
    });
  }
  async function start(path, body) {
    status.className = 'status'; status.textContent = 'Iniciando…';
    try { watch((await api.post(path, body)).jobId); } catch (e) { status.className = 'status err'; status.textContent = e.message; }
  }
  go.addEventListener('click', () => start(base, {}));
  root.append(h('p', { class: 'dim' }, 'O Claude escreve o esboço e depois cada capítulo só com os fatos das fontes, com [n] da fonte em cada frase. Pode levar vários minutos por capítulo.'),
    h('div', { class: 'row' }, go, bar), status);
  if (prod.active?.roteiro) watch(prod.active.roteiro);
  if (!r || !episode) return;

  const m = r.meta;
  root.append(
    h('p', {}, h('strong', {}, r.titulo), ' · ', `${num(r.palavras)} palavras · meta ${num(m.target)} (de ${num(m.min)} a ${num(m.max)}, ${m.wpm} palavras/min) · `,
      h('a', { href: `/api/productions/${enc(prod.id)}/files/roteiro.md`, target: '_blank', rel: 'noopener' }, 'roteiro.md')),
    r.avisos.length ? h('ul', { class: 'err' }, r.avisos.map(a => h('li', {}, a))) : '');
  for (const [i, ch] of episode.chapters.entries()) {
    const c = r.capitulos[i] ?? {}, off = c.meta && Math.abs(c.palavras - c.meta) > c.meta * .15;
    const again = h('button', { type: 'button', disabled: busy, onClick: () => start(base + '/capitulo', { id: ch.id }) }, 'Refazer capítulo (Claude)');
    redo.push(again);
    root.append(h('section', {},
      h('h3', {}, `${i + 1}. ${ch.title} `, h('small', { class: off ? 'err' : 'dim' }, `${num(c.palavras ?? 0)} de ${num(c.meta ?? 0)} palavras · ${ch.shots.length} planos`)),
      h('div', { class: 'row' }, again),
      ch.shots.map(s => plan(s))));
  }

  // Um plano: narração com [n] editável; salvar revalida no servidor (30 a 120 s de fala, fontes e números).
  function plan(s) {
    const text = h('textarea', { rows: '6', maxlength: '5000', 'aria-label': `Narração do plano ${s.id}`, value: s.narrationCited ?? s.narration ?? '' });
    const msg = h('small', { class: 'status' }), save = h('button', { type: 'button', disabled: busy }, 'Salvar');
    save.addEventListener('click', async () => {
      save.disabled = true; msg.className = 'status'; msg.textContent = 'Salvando…';
      try { await api.post(base + '/plano', { id: s.id, narracao: text.value }); reload(); }
      catch (e) { msg.className = 'status err'; msg.textContent = e.message; save.disabled = false; }
    });
    const hud = s.hud ? ' · ' + Object.entries(s.hud).filter(([, v]) => typeof v === 'string').map(([, v]) => v).join(' / ') : '';
    return h('div', { class: 'col' },
      h('small', { class: 'dim' }, `${s.id} · ${s.scene.id}${s.actors?.length ? ' · ' + s.actors.map(a => `${a.cast} ${a.action}`).join(', ') : ''}${hud} · fontes ${s.cites?.join(', ') ?? '—'}`),
      text, h('div', { class: 'row' }, save, msg));
  }
}
