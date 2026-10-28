// Abas Análise e Concorrentes do painel do canal (banco local e `claude`, sem cota).
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { follow, avatar, subsText, dec } from './channel.js';

const enc = encodeURIComponent;
const SVG = 'http://www.w3.org/2000/svg';
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const pct = x => x == null || !Number.isFinite(x) ? '—' : Math.round(x * 100) + '%';
const mins = s => s == null || !Number.isFinite(s) ? '—' : dec(Math.round(s / 6) / 10) + ' min';
const svg = (tag, attrs) => { const el = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

// Linhas rótulo + progress + contagem; `top` destaca o maior.
function bars(rows, top) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return h('div', { class: 'bars' }, rows.map(([label, n], i) =>
    h('div', {}, i === top ? h('strong', {}, label) : h('span', {}, label), h('progress', { max: String(max), value: String(n) }), h('span', {}, fmt.num(n)))));
}

// Linha do tempo de uma série; capturas sem valor (inscritos ocultos) ficam de fora.
function chart(points, key, label) {
  const ps = points.filter(p => Number.isFinite(p[key]) && Number.isFinite(new Date(p.at).getTime()));
  if (ps.length < 2) return null;
  const ts = ps.map(p => new Date(p.at).getTime()), vs = ps.map(p => p[key]);
  const t0 = Math.min(...ts), dt = Math.max(...ts) - t0 || 1, v0 = Math.min(...vs), dv = Math.max(...vs) - v0 || 1;
  const pts = ps.map((p, i) => `${(((ts[i] - t0) / dt) * 100).toFixed(1)},${(38 - ((vs[i] - v0) / dv) * 36).toFixed(1)}`).join(' ');
  const s = svg('svg', { class: 'chart', viewBox: '0 0 100 40', preserveAspectRatio: 'none', role: 'img', 'aria-label': label });
  s.append(svg('polyline', { points: pts, 'vector-effect': 'non-scaling-stroke' }));
  return h('div', {}, h('p', {}, `${label}: ${fmt.num(vs[0])} → ${fmt.num(vs[vs.length - 1])}`), s,
    h('p', { class: 'dim' }, `${fmt.date(ps[0].at)} a ${fmt.date(ps[ps.length - 1].at)}`));
}

// Resumo pelo Claude: resposta é texto não confiável (só textContent via h()).
function summaryBox(c) {
  const out = h('div');
  const btn = h('button', { type: 'button', onClick: async () => {
    btn.disabled = true; out.replaceChildren(h('p', { class: 'status' }, 'Gerando… (sem custo de cota)'));
    let r; try { r = await api.post(`/api/channels/${enc(c.id)}/summary`); }
    catch (e) { btn.disabled = false; return out.replaceChildren(h('p', { class: 'status err' }, e.message)); }
    follow(r.jobId, out, (ev, d) => {
      if (ev !== 'end') return;
      btn.disabled = false;
      if (d.status === 'done') {
        const res = d.result ?? {};
        return out.replaceChildren(h('div', { class: 'summary' }, h('p', {}, String(res.resumo ?? '')),
          h('ul', {}, (Array.isArray(res.pontos) ? res.pontos : []).map(p => h('li', {}, String(p)))),
          h('small', { class: 'dim' }, 'gerado pelo Claude; confira antes de usar')));
      }
      const copy = h('textarea', { class: 'copy', readonly: true, 'aria-label': 'Prompt' }); copy.value = r.prompt ?? '';
      out.replaceChildren(h('p', { class: 'status err' }, d.error ?? 'Falha ao gerar o resumo'),
        h('details', {}, h('summary', {}, 'Prompt para copiar'), copy,
          h('button', { type: 'button', onClick: () => navigator.clipboard?.writeText(copy.value).catch(() => {}) }, 'Copiar')));
    });
  } }, 'Resumo pelo Claude');
  return h('div', {}, btn, out);
}

export async function analysisTab(body, c) {
  body.append(h('p', { class: 'dim' }, 'Carregando…'));
  const live = () => body.isConnected && body.dataset.tab === 'a';
  let a; try { a = await api.get(`/api/channels/${enc(c.id)}/analysis`); } catch (e) { if (live()) body.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
  if (!live()) return;
  const g = a.growth ?? {}, t = a.titles ?? {}, d = a.duration ?? {}, p = a.publish ?? {};
  // lista plana: h() só achata um nível e append não aceita null
  const growth = [h('h3', {}, 'Crescimento'), ...(g.enough ? [chart(g.points, 'subs', 'Inscritos'), chart(g.points, 'views', 'Views')]
    : [h('p', { class: 'dim' }, g.since ? 'histórico começa em ' + fmt.date(g.since) : 'Sem capturas.')])].filter(Boolean);
  if (!a.count) return body.replaceChildren(h('p', { class: 'dim' }, 'Sem vídeos para analisar.'), ...growth);
  body.replaceChildren(h('div', {}, // h achata listas e ignora null
    h('p', { class: 'dim' }, `${fmt.num(a.count)} vídeos na base · dados de ${fmt.date(c.updatedAt)}`),
    h('h3', {}, 'Títulos'),
    h('p', {}, `Média de ${fmt.num(t.avgChars)} caracteres e ${fmt.num(t.avgWords)} palavras · ${pct(t.withNumber)} com número · ${pct(t.withQuestion)} com pergunta`),
    t.topWords?.length ? h('ul', { class: 'words' }, t.topWords.map(w => h('li', { class: 'word' }, `${w.word} (${w.count})`))) : h('p', { class: 'dim' }, 'Nenhuma palavra recorrente.'),
    h('h3', {}, 'Duração'),
    h('p', {}, 'Mediana: ' + mins(d.medianS)),
    bars([['Até 4 min', d.short ?? 0], ['4 a 20 min', d.medium ?? 0], ['Mais de 20 min', d.long ?? 0]]),
    h('h3', {}, 'Publicação (UTC)'),
    bars(DAYS.map((x, i) => [x, p.weekday?.[i] ?? 0]), p.topWeekday),
    bars(Array.from({ length: 24 }, (_, i) => [i + 'h', p.hour?.[i] ?? 0]), p.topHour),
    growth,
    h('h3', {}, 'Resumo'),
    summaryBox(c)));
}

export async function similarTab(body, c, open) {
  body.append(h('p', { class: 'dim' }, 'Carregando…'));
  const live = () => body.isConnected && body.dataset.tab === 'c';
  let rs; try { rs = await api.get(`/api/channels/${enc(c.id)}/similar`); } catch (e) { if (live()) body.replaceChildren(h('p', { class: 'err' }, e.message)); return; }
  if (!live()) return;
  const note = h('p', { class: 'dim' }, 'Semelhança por palavras de título e tópicos do YouTube. Concorrentes escolhidos por você chegam com Meus canais.');
  if (!rs.length) return body.replaceChildren(h('p', { class: 'dim' }, 'Nenhum canal parecido na base.'), note);
  body.replaceChildren(note, h('table', { class: 'grid' },
    h('thead', {}, h('tr', {}, ['', 'Canal', 'Em comum', 'Inscritos', 'Média por vídeo', ''].map(x => h('th', {}, x)))),
    h('tbody', {}, rs.map(r => h('tr', {},
      h('td', {}, avatar(r.avatar)),
      h('td', {}, h('div', {}, r.title ?? r.id), h('small', { class: 'dim' }, `semelhança ${fmt.num(r.score)}%`)),
      h('td', {}, r.sharedWords?.length ? h('div', {}, 'Palavras: ' + r.sharedWords.join(', ')) : null,
        r.sharedTopics?.length ? h('div', {}, 'Tópicos: ' + r.sharedTopics.join(', ')) : null),
      h('td', {}, subsText(r.subs), h('br'), h('small', { class: 'dim' }, 'dados de ' + fmt.date(r.updatedAt))), h('td', {}, fmt.num(r.avgViews)),
      h('td', {}, h('button', { type: 'button', onClick: () => open(r.id) }, 'Analisar')))))));
}
