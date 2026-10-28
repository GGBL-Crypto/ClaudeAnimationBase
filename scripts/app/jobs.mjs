// Fila de jobs do webapp: um por vez, eventos progress/end (SSE).
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

const endData = j => j.status === 'error' ? { status: 'error', error: j.error } : { status: 'done', result: j.result };

export function createJobs(db) {
  const all = new Map(), queue = [];
  let busy = false;
  const view = ({ ev, fn, ...j }) => j;
  const save = j => { try { db.saveJob({ id: j.id, kind: j.kind, status: j.status, createdAt: j.createdAt, finishedAt: j.finishedAt, result: j.result, error: j.error }); } catch {} }; // falha de gravação não trava a fila
  const emit = (j, ...a) => { try { j.ev.emit('e', ...a); } catch {} }; // listener que lança não trava a fila
  async function pump() {
    if (busy) return;
    const j = queue.shift(); if (!j) return;
    busy = true;
    try {
      j.status = 'running'; save(j);
      try {
        j.result = await j.fn((message, done, total) => { j.progress = { done, total, message }; emit(j, 'progress', j.progress); });
        j.status = 'done';
      } catch (e) { j.status = 'error'; j.error = e?.message ?? String(e); } // só a mensagem, nunca stack
      j.finishedAt = new Date().toISOString(); save(j);
      emit(j, 'end', endData(j)); j.ev.removeAllListeners();
    } finally { busy = false; pump().catch(() => {}); }
  }
  return {
    start(kind, fn) {
      const j = { id: randomUUID(), kind, status: 'queued', progress: { done: 0, total: 0, message: '' }, result: null, error: null, createdAt: new Date().toISOString(), finishedAt: null, fn, ev: new EventEmitter().setMaxListeners(0) };
      all.set(j.id, j); queue.push(j); save(j); pump().catch(() => {});
      return j.id;
    },
    get: id => all.has(id) ? view(all.get(id)) : null,
    list: () => [...all.values()].map(view),
    subscribe(id, listener) {
      const j = all.get(id); if (!j) return () => {};
      listener('progress', j.progress);
      if (j.status === 'done' || j.status === 'error') { listener('end', endData(j)); return () => {}; }
      j.ev.on('e', listener);
      return () => j.ev.off('e', listener);
    },
  };
}

export const sseWrite = (res, event, data) => void res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
