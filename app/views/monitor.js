// Monitoramento: canais seguidos, atualização manual com confirmação de custo e progresso por SSE.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { openChannel, follow, subsText, views30, avatar } from './channel.js';

const when = iso => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
// "há 0 min" / "há 5 h"; de um dia em diante usa o formato dos outros pontos da tela
const since = iso => {
  const t = iso ? Date.parse(iso) : NaN; if (!Number.isFinite(t)) return '—';
  const m = Math.max(0, Math.floor((Date.now() - t) / 6e4));
  return m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.floor(m / 60)} h` : fmt.ago(iso);
};
const COLS = ['Canal', 'Inscritos', 'Views 30d', 'Média/vídeo', 'Último vídeo', 'Atualizado', ''];

export async function render(root) {
  let data = null, seq = 0, busy = false;
  const head = h('div', { class: 'mon-head' }), list = h('div', { class: 'list' }), panel = h('aside', { class: 'panel', hidden: true });
  const job = h('div', { class: 'job' }), confirmBox = h('div', { class: 'confirm', hidden: true }), msg = h('p', { class: 'status' });
  const runBtn = h('button', { type: 'button', class: 'primary', onClick: ask }, 'Atualizar agora');
  panel.addEventListener('channel-changed', () => load());

  function ask() {
    if (busy || !data?.channels.length) return;
    confirmBox.replaceChildren(h('span', {}, `Custa ~${data.estimate} unidades da cota. Continuar?`),
      h('button', { type: 'button', class: 'primary', onClick: () => { confirmBox.hidden = true; start(); } }, 'Continuar'),
      h('button', { type: 'button', onClick: () => { confirmBox.hidden = true; } }, 'Cancelar'));
    confirmBox.hidden = false;
  }

  async function start() {
    busy = true; runBtn.disabled = true;
    const bar = h('progress', { max: '1', value: '0' }), text = h('span', {}, 'Iniciando…'), out = h('div', { class: 'result' });
    job.replaceChildren(bar, text, out);
    const done = () => { busy = false; runBtn.disabled = false; };
    let jobId;
    try { ({ jobId } = await api.post('/api/monitor/run')); } catch (e) { done(); bar.remove(); text.className = 'err'; text.textContent = e.message; return; }
    follow(jobId, root, (ev, d) => {
      if (ev === 'progress') { if (d.total) { bar.max = d.total; bar.value = d.done; text.textContent = `${d.message ?? ''} (${d.done}/${d.total})`; } return; }
      done();
      if (d.status === 'error') { text.className = 'err'; text.textContent = d.error ?? 'Erro no job'; }
      else {
        bar.value = bar.max;
        const r = d.result ?? {}, failed = r.failed ?? [];
        text.textContent = `${(r.ok ?? []).length} canais, ${r.alerts ?? 0} alertas novos, ${failed.length} falharam`;
        if (failed.length) out.append(h('p', { class: 'err' }, 'Falharam:'), h('ul', {}, failed.map(f => h('li', {}, `${f.id}: ${f.error}`))));
      }
      load(); // mesmo com erro: o que já foi gravado aparece
    });
  }

  async function unfollow(id, btn) {
    btn.disabled = true; msg.className = 'status'; msg.textContent = '';
    try { await api.post(`/api/channels/${encodeURIComponent(id)}/watch`, { monitor: false }); if (panel.dataset.id === id) { panel.hidden = true; delete panel.dataset.id; } await load(); }
    catch (e) { btn.disabled = false; msg.className = 'status err'; msg.textContent = e.message; }
  }

  async function load() {
    const my = ++seq; let got;
    try { got = await api.get('/api/monitor'); }
    catch (e) { if (my === seq && root.isConnected) list.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
    if (my !== seq || !root.isConnected) return;
    data = got; draw();
  }

  const name = r => h('div', { class: 'ch' }, avatar(r.avatar),
    h('div', {}, h('button', { type: 'button', class: 'link strong', onClick: () => openChannel(panel, r.id) }, r.title ?? r.id), h('small', { class: 'dim block' }, 'dados de ' + fmt.date(r.updatedAt))));
  function draw() {
    const { channels, lastAt, nextAt, auto } = data, n = channels.length;
    head.replaceChildren(h('p', {}, h('strong', {}, `Seguindo ${n} ${n === 1 ? 'canal' : 'canais'}`)),
      h('p', { class: 'dim' }, lastAt ? `Última atualização: ${when(lastAt)} (${since(lastAt)})` : 'Última atualização: nunca'),
      h('p', { class: 'dim' }, auto ? `Próxima automática: ${nextAt ? when(nextAt) : 'na próxima checagem com o app aberto'}` : h('span', {}, 'Automático desligado (', h('a', { href: '#/config' }, 'Configurações'), ')')));
    runBtn.disabled = busy || !n;
    if (!n) return void list.replaceChildren(h('p', { class: 'empty' }, 'Nenhum canal seguido. Abra um canal e clique em Seguir.'));
    list.replaceChildren(h('table', { class: 'grid' },
      h('thead', {}, h('tr', {}, COLS.map(t => h('th', {}, t)))),
      h('tbody', {}, channels.map(r => {
        const btn = h('button', { type: 'button', onClick: () => unfollow(r.id, btn) }, 'Deixar de seguir');
        return h('tr', {}, h('td', {}, name(r)), h('td', {}, subsText(r.subs)), h('td', {}, views30(r)), h('td', {}, fmt.num(r.avgViews)),
          h('td', {}, r.daysSinceLast == null ? '—' : `há ${r.daysSinceLast} d`),
          h('td', {}, r.lastRun ? since(r.lastRun) : h('span', { class: 'dim' }, 'linha de base pendente')), h('td', {}, btn));
      }))));
  }

  root.append(h('h1', {}, 'Monitoramento'), head, h('div', { class: 'row' }, runBtn), confirmBox, job, msg, h('div', { class: 'split' }, list, panel));
  await load();
}
