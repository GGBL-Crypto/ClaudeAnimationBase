// Visão geral: KPIs com link para o recorte, recortes e atividade recente.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';

// Mesmos ids e rótulos de PRESETS em scripts/app/filters.mjs (e em mine.js).
const PRESETS = [['espelhar', 'Pra você espelhar'], ['novos', 'Canais novos'], ['muitaView', 'Muita view, pouco inscrito'], ['fabrica', 'Fábrica de vídeo'],
  ['enxuto', 'Catálogo enxuto'], ['semana', 'Postou esta semana'], ['categoria', 'Por categoria'], ['tudo', 'Tudo']];

// Frase de uma entrada do histórico (a Task 12 reusa na tela Histórico).
export function describeEntry(e) {
  const p = e.payload ?? {}, units = `${p.units ?? 0} unidades`, ch = `${p.ok ?? 0} canais, ${units}`;
  const text = {
    mine: `Busca de canais "${p.q}": ${ch}`, videos: `Busca de vídeos "${p.q}": ${ch}`, import: `Importação: ${ch}`,
    refresh: `Atualização de canal, ${units}`, open: `Abriu ${p.title ?? p.id}`,
  }[e.kind] ?? String(e.kind);
  return text + (p.status === 'error' ? ' (erro)' : '');
}

const kpi = (href, value, label) => h('a', { class: 'kpi', href }, h('strong', {}, fmt.num(value)), h('small', {}, label));

export async function render(root) {
  root.append(h('h1', {}, 'Visão geral'));
  let o;
  try { o = await api.get('/api/overview'); } catch (e) { if (root.isConnected) root.append(h('p', { class: 'err' }, e.message)); return; }
  if (!root.isConnected) return;
  root.append(
    ...(o.channels ? [] : [h('p', { class: 'empty' }, 'Nenhum canal ainda. Comece em Minerar canais.')]),
    h('div', { class: 'kpis' },
      kpi('#/minerar?preset=tudo', o.channels, 'Canais na base'),
      kpi('#/outliers?maxAgeDays=7', o.outliers7d, `Outliers (7 dias, múltiplo ≥ ${o.outlierMin}×)`),
      kpi('#/minerar?preset=novos', o.newChannels, 'Canais novos (< 90 dias)'),
      kpi(`#/minerar?preset=tudo&scoreMin=${o.opportunityMin}`, o.opportunities, `Oportunidades (score ≥ ${o.opportunityMin})`)),
    h('h2', {}, 'Recortes'),
    h('div', { class: 'presets' }, PRESETS.map(([id, label]) => h('a', { class: 'chip', href: '#/minerar?preset=' + id }, label))),
    h('h2', {}, 'Atividade recente'),
    o.recent.length ? h('ul', { class: 'hist' }, o.recent.map(e => h('li', {}, describeEntry(e), ' ', h('small', { class: 'dim' }, fmt.ago(e.at))))) : h('p', { class: 'empty' }, 'Nada ainda.'),
    h('p', { class: 'dim' }, 'Alertas do monitoramento: em breve'));
}
