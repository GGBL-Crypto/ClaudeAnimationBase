import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sampleVoice, SAMPLE_TEXT } from '../scripts/app/voice.mjs';
import { writeWav } from '../scripts/narration-lib.mjs';

// Filho falso: stdin.end(json) roda fn(jobs) e emite close com o código dado.
function fakeSpawnWriting(fn, code = 0) {
  const sp = (cmd, args) => {
    const c = new EventEmitter(); c.stderr = new PassThrough(); sp.calls.push({ cmd, args });
    c.stdin = { end(s) { setImmediate(() => { if (code === 0) fn(JSON.parse(s)); c.emit('close', code); }); } };
    return c;
  };
  sp.calls = []; return sp;
}
const dir = () => mkdtempSync(join(tmpdir(), 'voice-'));
const wav20 = job => writeFileSync(job[0].out, writeWav({ sampleRate: 24000, samples: new Float32Array(24000 * 20) }));

test('sample texts have about 60 words and no digits', () => {
  for (const t of Object.values(SAMPLE_TEXT)) { const n = t.split(/\s+/).length; assert.ok(n >= 50 && n <= 70, String(n)); assert.doesNotMatch(t, /\d/); }
});
test('sampleVoice runs kokoro once, measures wpm, then uses cache', async () => {
  let calls = 0; const d = dir(), spawn = fakeSpawnWriting(job => { calls++; wav20(job); });
  const r = await sampleVoice({ voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, d, { spawn, exists: () => true, root: '/r' });
  assert.equal(r.seconds, 20); assert.equal(r.wpm, Math.round(r.words / (20 / 60))); assert.equal(calls, 1);
  assert.equal(r.words, SAMPLE_TEXT.pt.split(/\s+/).length); assert.match(r.name, /^[0-9a-f]{40}\.wav$/); assert.equal(r.file, join(d, r.name));
  assert.deepEqual(spawn.calls[0].args.slice(0, 2), ['-X', 'utf8']); assert.deepEqual(spawn.calls[0].args.slice(3), ['pm_alex', '1']);
  assert.match(spawn.calls[0].cmd.replace(/\\/g, '/'), /out\/tmp\/kokoro-venv\/Scripts\/python\.exe$/);
  assert.match(spawn.calls[0].args[2].replace(/\\/g, '/'), /scripts\/kokoro_say\.py$/);
  const r2 = await sampleVoice({ voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, d, { spawn, exists: () => true, root: '/r' });
  assert.equal(calls, 1); assert.equal(r2.name, r.name); assert.equal(r2.wpm, r.wpm);
});
test('cache key depends on voice, speed and language text', async () => {
  const d = dir(), spawn = fakeSpawnWriting(wav20), o = { spawn, exists: () => true, root: '/r' };
  const a = await sampleVoice({ voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, d, o), b = await sampleVoice({ voice: 'kokoro:pm_alex', speed: 1.2, lang: 'pt' }, d, o);
  const c = await sampleVoice({ voice: 'kokoro:af_heart', speed: 1, lang: 'en' }, d, o);
  assert.equal(new Set([a.name, b.name, c.name]).size, 3); assert.equal(spawn.calls.length, 3);
});
test('missing kokoro venv', async () => {
  await assert.rejects(sampleVoice({ voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, dir(), { exists: () => false }), /Kokoro não instalado: veja docs\/VOICE\.md/);
});
test('kokoro failure becomes a readable error', async () => {
  await assert.rejects(sampleVoice({ voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, dir(), { spawn: fakeSpawnWriting(() => {}, 1), exists: () => true, root: '/r' }), /Kokoro falhou/);
});
test('kokoro_say picks lang code from the voice', () => { assert.match(readFileSync('scripts/kokoro_say.py', 'utf8'), /lang_code=voice\[0\]/); });
