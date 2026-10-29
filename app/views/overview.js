// Visão geral: KPIs com link para o recorte, recortes e atividade recente.
import { h, fmt } from '../dom.js';
import { api } from '../api.js';
import { mult } from './channel.js';

// Mesmos ids e rótulos de PRESETS em scripts/app/filters.mjs (e em mine.js).
const PRESETS = [['espelhar', 'Pra você espelhar'], ['novos', 'Canais novos'], ['muitaView', 'Muita view, pouco inscrito'], ['fabrica', 'Fábrica de vídeo'],
  ['enxuto', 'Catálogo enxuto'], ['semana', 'Postou esta semana'], ['categoria', 'Por categoria'], ['tudo', 'Tudo']];

// Frase de uma entrada do histórico (a Task 12 reusa na tela Histórico).
export function describeEntry(e) {
  const p = e.payload ?? {}, units = `${p.units ?? 0} unidades`, ch = `${p.ok ?? 0} canais, ${units}`;
  const text = {
    mine: `Busca de canais "${p.q}": ${ch}`, videos: `Busca de vídeos "${p.q}": ${ch}`, import: `Importação: ${ch}`,
    refresh: `Atualização de canal, ${units}`, open: `Abriu ${p.title ?? p.id}`,
    monitor: p.status === 'skipped' ? 'Monitoramento automático pulado (cota)' : `Monitoramento${p.auto ? ' automático' : ''}: ${ch}`,
  }[e.kind] ?? String(e.kind);
  return text + (p.status === 'error' ? ' (erro)' : '');
}

// Frase de um alerta (sino e Visão geral); título e canal vêm do YouTube e só viram texto.
export function alertText(a) {
  const p = a.payload ?? {}, ch = a.channelTitle ?? a.channelId;
  return a.kind === 'newVideo' ? `Vídeo novo em ${ch}: ${p.title ?? ''}`
    : a.kind === 'outlier' ? `Outlier em ${ch}: ${p.title ?? ''} (${mult(p.multiple)})`
    : a.kind === 'subsJump' ? `${ch} ganhou ${p.pct}% de inscritos (de ${fmt.num(p.from)} para ${fmt.num(p.to)})` : String(a.kind);
}
export const alertLink = a => h('a', { href: '#/minerar?canal=' + encodeURIComponent(a.channelId) }, alertText(a));

const kpi = (href, value, label) => h('a', { class: 'kpi', href }, h('strong', {}, fmt.num(value)), h('small', {}, label));

export async function render(root) {
  root.append(h('h1', {}, 'Visão geral'));
  let o, al = [];
  try { o = await api.get('/api/overview'); } catch (e) { if (root.isConnected) root.append(h('p', { class: 'err' }, e.message)); return; }
  try { al = (await api.get('/api/alerts?limit=10')).alerts; } catch { /* sem alertas, o resto da tela segue */ }
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
    h('h2', {}, 'Alertas do monitoramento'),
    al.length ? h('ul', { class: 'hist' }, al.map(a => h('li', {}, alertLink(a), ' ', h('small', { class: 'dim' }, fmt.ago(a.at))))) : h('p', { class: 'empty' }, 'Nenhum alerta ainda.'));
}
