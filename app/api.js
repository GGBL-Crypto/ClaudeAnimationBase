// Cliente da API local. POST leva o token lido do <meta>.
const token = () => document.querySelector('meta[name="app-token"]')?.content ?? '';

async function call(path, opt) {
  const r = await fetch(path, opt).catch(() => { throw new Error('Sem conexão com o app local'); });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Erro ' + r.status);
  return body;
}

export const api = {
  get: path => call(path),
  post: (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Token': token() }, body: JSON.stringify(body ?? {}) }),
  // onEvent(nome, dados) com 'progress' e 'end'; ao fim fecha e avisa o medidor de cota.
  events(jobId, onEvent) {
    const es = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/events`);
    for (const name of ['progress', 'end']) es.addEventListener(name, e => {
      let data; try { data = JSON.parse(e.data); } catch { data = name === 'end' ? { status: 'error', error: 'Resposta inválida do app local' } : {}; }
      onEvent(name, data);
      if (name === 'end') { es.close(); window.dispatchEvent(new Event('quota-refresh')); }
    });
    es.onerror = () => { if (es.readyState === EventSource.CLOSED) onEvent('end', { status: 'error', error: 'Conexão perdida' }); };
    return es;
  },
};
