import test from 'node:test';
import assert from 'node:assert/strict';
import { describeEntry } from '../app/views/overview.js';

test('describeEntry phrases per kind and error suffix', () => {
  const e = (kind, payload) => describeEntry({ at: 'x', kind, payload });
  assert.equal(e('mine', { q: 'sleep', ok: 3, units: 301, status: 'done' }), 'Busca de canais "sleep": 3 canais, 301 unidades');
  assert.equal(e('videos', { q: 'roma', ok: 2, units: 202 }), 'Busca de vídeos "roma": 2 canais, 202 unidades');
  assert.equal(e('import', { ok: null, units: 2 }), 'Importação: 0 canais, 2 unidades');
  assert.equal(e('refresh', { id: 'UC', units: 3 }), 'Atualização de canal, 3 unidades');
  assert.equal(e('open', { id: 'UC', title: 'Fixture One' }), 'Abriu Fixture One');
  assert.equal(e('mine', { q: 'x', ok: 0, units: 100, status: 'error' }), 'Busca de canais "x": 0 canais, 100 unidades (erro)');
});
