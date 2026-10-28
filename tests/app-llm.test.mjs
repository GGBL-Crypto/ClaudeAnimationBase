import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { CLAUDE_ARGS, runClaude, validateSummary, summaryPrompt } from '../scripts/app/llm.mjs';

// Filho falso: grava chamada e stdin; responde ou trava conforme as opções.
function fakeSpawn({ stdout = '', code = 0, error, hang } = {}) {
  const sp = (cmd, args, opts) => {
    const c = new EventEmitter();
    c.stdin = new PassThrough(); c.stdout = new PassThrough(); c.stderr = new PassThrough();
    let stdin = ''; c.stdin.on('data', d => { stdin += d; });
    const call = { cmd, args, opts, get stdin() { return stdin; } };
    sp.calls.push(call);
    c.kill = () => { sp.killed = true; };
    if (!hang) setImmediate(() => {
      if (error) return c.emit('error', error);
      c.stdout.end(stdout);
      setImmediate(() => c.emit('close', code));
    });
    return c;
  };
  sp.calls = []; sp.killed = false;
  return sp;
}

test('runClaude sends the prompt on stdin with tools disabled and parses the inner JSON', async () => {
  const sp = fakeSpawn({ stdout: JSON.stringify({ type: 'result', is_error: false, result: '```json\n{"resumo":"ok","pontos":["a"]}\n```' }) });
  assert.deepEqual(await runClaude('PROMPT', { spawn: sp }), { resumo: 'ok', pontos: ['a'] });
  assert.equal(sp.calls[0].cmd, 'claude'); assert.deepEqual(sp.calls[0].args, CLAUDE_ARGS); assert.equal(sp.calls[0].stdin, 'PROMPT');
});
test('missing claude, bad exit, error result and invalid JSON become readable errors', async () => {
  await assert.rejects(runClaude('x', { spawn: fakeSpawn({ error: Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' }) }) }), /claude não encontrado no PATH/);
  await assert.rejects(runClaude('x', { spawn: fakeSpawn({ code: 1 }) }), /código 1/);
  await assert.rejects(runClaude('x', { spawn: fakeSpawn({ stdout: JSON.stringify({ is_error: true, result: 'limite atingido' }) }) }), /limite atingido/);
  await assert.rejects(runClaude('x', { spawn: fakeSpawn({ stdout: JSON.stringify({ result: 'não é json' }) }) }), /não é JSON válido/);
});
test('timeout kills the process', async () => { const sp = fakeSpawn({ hang: true }); await assert.rejects(runClaude('x', { spawn: sp, timeoutMs: 20 }), /demorou demais/); assert.ok(sp.killed); });
test('validateSummary', () => {
  assert.deepEqual(validateSummary({ resumo: 'r', pontos: ['<img src=x>'], extra: 1 }), { resumo: 'r', pontos: ['<img src=x>'] });
  for (const o of [null, { resumo: '', pontos: ['a'] }, { resumo: 'r', pontos: [] }, { resumo: 'r', pontos: [1] }, { resumo: 'r'.repeat(2001), pontos: ['a'] }]) assert.throws(() => validateSummary(o), /fora do formato/);
});
test('summaryPrompt fills placeholders and keeps hostile titles as data', () => {
  const p = summaryPrompt('T={{titulo}}\n{{videos}}\n{{analise}}', { title: 'Canal' }, [{ title: '<img src=x>', views: 10, durationS: 60 }], { count: 1 });
  assert.match(p, /^T=Canal/); assert.ok(p.includes('<img src=x>')); assert.ok(!p.includes('{{'));
  assert.throws(() => summaryPrompt('{{outro}}', { title: 'c' }, [], {}));
});
test('prompt file has the three placeholders', () => {
  const t = readFileSync(new URL('../prompts/analise-canal.md', import.meta.url), 'utf8');
  for (const k of ['{{titulo}}', '{{videos}}', '{{analise}}']) assert.ok(t.includes(k), k);
});
