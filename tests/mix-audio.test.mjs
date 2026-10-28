import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mix, TARGET, PEAK } from '../scripts/mix-audio.mjs';

// Fala sintética: vogais de 0,4 s com harmônicos e pausas, baixa (−25 dBFS) e com picos altos, como a narração crua.
test('mix-audio delivers −14 LUFS ± 0.5 with true peak ≤ −1 dBTP', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mix-')), narration = join(dir, 'n.wav'), out = join(dir, 'mix.m4a');
  try {
    const voice = "0.06*(sin(2*PI*140*t)+0.6*sin(2*PI*280*t)+0.3*sin(2*PI*560*t)+0.15*sin(2*PI*1120*t))*gt(mod(t,0.55),0.15)*(1+0.5*sin(2*PI*0.7*t))+0.5*lt(mod(t,3.1),0.002)";
    const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-f', 'lavfi', '-i', `aevalsrc=exprs='${voice}':s=24000:d=20`, narration], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const m = mix({ narration, duration: 20, out });
    assert.ok(Math.abs(m.I - TARGET) <= .5, `${m.I} LUFS`);
    assert.ok(m.TP <= PEAK, `${m.TP} dBTP`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
