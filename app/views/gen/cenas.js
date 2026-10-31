// Etapa cenas: monta o projeto, tira o still do meio de cada plano (folha de contato) e troca a cena de um plano dentro do catálogo.
// Trocar não mexe na narração: só cenas e o que vem depois ficam desatualizados.
import { h } from '../../dom.js';
import { api } from '../../api.js';
import { runPanel } from './render.js';

const enc = encodeURIComponent;
const sel = (label, opts, value) => h('label', {}, label + ' ', h('select', {}, opts.map(([v, t]) => h('option', { value: v, ...(v === value && { selected: true }) }, t))));
const pick = el => el.querySelector('select, input').value;
const actorsText = a => a.length ? a.map(x => `${x.cast} ${x.action}`).join(', ') : 'sem atores';

export async function render(root, prod, { reload }) {
  root.append(h('p', { class: 'dim' }, 'Um still no meio de cada plano. Trocar a cena de um plano não refaz a narração.'));
  runPanel(root, prod, 'cenas', 'Gerar cenas', reload);
  const data = await api.get(`/api/productions/${enc(prod.id)}/cenas`).catch(e => ({ error: e.message }));
  if (!root.isConnected) return;
  if (data.error) return void root.append(h('p', { class: 'err' }, data.error));
  const busy = Object.keys(prod.active).length > 0, v = enc(prod.steps.cenas.finishedAt ?? ''), host = h('div');
  root.append(host, h('div', { class: 'imgs' }, data.shots.map(s => {
    const img = h('img', { src: `/api/productions/${enc(prod.id)}/files/cena-${enc(s.id)}.png?v=${v}`, alt: `Plano ${s.id}`, loading: 'lazy', onError: () => img.replaceWith(h('div', { class: 'noimg' })) });
    const fig = h('figure', {}, img, h('figcaption', {}, h('strong', {}, s.id), ` · ${s.scene.id} · ${actorsText(s.actors)}`, h('br'), h('span', {}, s.narration ?? '(sem narração)')));
    fig.append(h('button', { type: 'button', disabled: busy, onClick: () => { host.replaceChildren(h('h3', {}, `Trocar a cena do plano ${s.id}`), swapForm(prod, s, data, reload)); host.scrollIntoView(); } }, 'Trocar cena'));
    return fig;
  })));
}

// Formulário da troca: cena, parâmetros e até 3 atores, tudo do catálogo do estilo. O servidor revalida o episódio.
function swapForm(prod, shot, { catalog, cast }, reload) {
  const p = shot.scene.params ?? {}, msg = h('p', { class: 'status' }), extras = h('div', { class: 'row' });
  const scene = sel('Cena', Object.keys(catalog.scenes).map(k => [k, k]), shot.scene.id);
  const opt = list => list.map(x => [x, x]);
  const time = sel('Hora', opt(catalog.times), p.time ?? 'day'), weather = sel('Tempo', opt(catalog.weathers), p.weather ?? 'clear'), framing = sel('Enquadramento', opt(catalog.framings), p.framing ?? 'wide');
  const seed = h('label', {}, 'Semente ', h('input', { type: 'number', min: '0', max: '9999', step: '1', value: String(p.seed ?? 0) }));
  const fillExtras = (keep = []) => extras.replaceChildren(...catalog.scenes[pick(scene)].extras.map(x => h('label', {}, h('input', { type: 'checkbox', value: x, checked: keep.includes(x) }), ' ' + x)));
  fillExtras(p.extras ?? []); scene.querySelector('select').addEventListener('change', () => fillExtras());
  const actors = [0, 1, 2].map(i => { const a = shot.actors[i] ?? {};
    return h('div', { class: 'row' }, sel('Ator', [['', '(nenhum)'], ...opt(cast)], a.cast ?? ''), sel('Ação', opt(catalog.actions), a.action ?? 'stand'),
      h('label', {}, 'Posição ', h('input', { type: 'number', min: '0', max: '1', step: '0.05', value: String(a.at ?? 0.5) })), sel('Lado', [['1', '→'], ['-1', '←']], String(a.dir ?? 1))); });
  async function submit() {
    msg.className = 'status'; msg.textContent = 'Salvando…';
    const act = actors.map(r => r.querySelectorAll('select, input')).filter(f => f[0].value).map(f => ({ cast: f[0].value, action: f[1].value, ...(f[1].value !== 'walk' && { at: Number(f[2].value) }), dir: Number(f[3].value) }));
    const body = { shot: shot.id, scene: { id: pick(scene), params: { time: pick(time), weather: pick(weather), framing: pick(framing), seed: Number(pick(seed)), extras: [...extras.querySelectorAll('input:checked')].map(x => x.value) } }, actors: act };
    try { await api.post(`/api/productions/${enc(prod.id)}/cenas/trocar`, body); reload(); }
    catch (e) { msg.className = 'status err'; msg.textContent = e.message; }
  }
  return h('form', { class: 'col', novalidate: true, onSubmit: e => { e.preventDefault(); submit(); } },
    h('div', { class: 'row' }, scene, time, weather, framing, seed), extras, ...actors,
    h('div', { class: 'row' }, h('button', { type: 'submit', class: 'primary' }, 'Salvar troca'), h('button', { type: 'button', onClick: reload }, 'Cancelar')), msg);
}
