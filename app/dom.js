// Helpers de DOM: só createElement/textContent, nunca HTML em string.
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (/^on[A-Z]/.test(k)) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (['title', 'src', 'href', 'value', 'disabled', 'checked'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

const nf = (n, d) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
export const fmt = {
  num: n => n == null || !Number.isFinite(n) ? '—' : n >= 1e6 ? nf(n / 1e6, 1) + ' mi' : n >= 1e3 ? nf(n / 1e3, 1) + ' mil' : nf(n, 0),
  ago(iso) {
    if (!iso) return '—';
    const d = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 864e5));
    return d < 1 ? 'hoje' : d < 30 ? `há ${d} d` : d < 365 ? `há ${Math.floor(d / 30)} m` : `há ${Math.floor(d / 365)} a`;
  },
  date: iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—',
};
