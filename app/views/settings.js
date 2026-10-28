// Configurações: chave, cache, pesos do score e tabela RPM.
import { h } from '../dom.js';
import { api } from '../api.js';

const WEIGHTS = [['disparidade', 'Disparidade'], ['novo', 'Canal novo'], ['enxuto', 'Poucos vídeos'], ['ativo', 'Ativo']];
const COLS = ['Etiqueta', 'Idioma', 'RPM mín', 'RPM máx'];

export async function render(root) {
  root.append(h('h1', {}, 'Configurações'));
  const save_ = h('button', { type: 'submit', class: 'primary' }, 'Salvar');
  const status = h('p', { class: 'status' });
  let cfg;
  try { cfg = await api.get('/api/config'); } catch (e) { if (root.isConnected) root.append(h('p', { class: 'err' }, e.message)); return; }

  if (!root.isConnected) return; // trocou de tela durante o fetch
  const key = h('input', { type: 'password', autocomplete: 'new-password', placeholder: cfg.apiKeyHint ? 'Deixe vazio para manter a chave salva' : 'Cole a chave da YouTube Data API' });
  const hours = h('input', { type: 'number', min: '1', step: '1', value: String(cfg.cacheHours) });
  const w = Object.fromEntries(WEIGHTS.map(([k]) => [k, h('input', { type: 'number', min: '0', step: '1', value: String(cfg.weights[k] ?? 0) })]));
  const rows = h('tbody');
  const addRow = (...vals) => rows.append(h('tr', {},
    COLS.map((c, i) => h('td', {}, h('input', { type: i > 1 ? 'number' : 'text', min: i > 1 ? '0' : null, step: i > 1 ? 'any' : null, value: String(vals[i] ?? ''), 'aria-label': c }))),
    h('td', {}, h('button', { type: 'button', onClick: e => e.target.closest('tr').remove() }, 'Remover'))));
  for (const [k, [lo, hi]] of Object.entries(cfg.rpm ?? {})) { const [t, l = ''] = k.split('|'); addRow(t, l, lo, hi); }

  async function save() {
    const rpm = {};
    for (const tr of rows.children) {
      const [t, l, lo, hi] = [...tr.querySelectorAll('input')].map(i => i.value.trim());
      if (t || l || lo || hi) rpm[`${t}|${l}`] = [Number(lo), Number(hi)];
    }
    const body = { cacheHours: Number(hours.value), weights: Object.fromEntries(Object.entries(w).map(([k, i]) => [k, Number(i.value)])), rpm };
    if (key.value.trim()) body.apiKey = key.value.trim();
    save_.disabled = true; status.className = 'status'; status.textContent = 'Salvando…';
    try {
      const saved = await api.post('/api/config', body);
      status.textContent = 'Salvo.'; key.value = ''; hint.textContent = saved.apiKeyHint ? `Chave atual termina em ${saved.apiKeyHint}` : 'Nenhuma chave salva';
    } catch (e) { status.className = 'status err'; status.textContent = e.message; }
    finally { save_.disabled = false; }
  }

  const hint = h('small', { class: 'hint' }, cfg.apiKeyHint ? `Chave atual termina em ${cfg.apiKeyHint}` : 'Nenhuma chave salva');
  root.append(h('form', { class: 'settings', onSubmit: e => { e.preventDefault(); save(); } },
    h('label', {}, 'Chave da YouTube Data API', key, hint),
    h('label', {}, 'Validade do cache (horas)', hours),
    h('fieldset', {}, h('legend', {}, 'Pesos do score'), WEIGHTS.map(([k, label]) => h('label', {}, label, w[k]))),
    h('fieldset', {}, h('legend', {}, 'Tabela RPM (US$ por mil views)'),
      h('table', {}, h('thead', {}, h('tr', {}, [...COLS, ''].map(t => h('th', {}, t)))), rows),
      h('button', { type: 'button', onClick: () => addRow() }, 'Adicionar linha')),
    save_, status));
}
