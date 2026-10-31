import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Narração + cama de ruído marrom (−30 dB) + música opcional (−20 dB, abaixa sob a voz) -> AAC, −14 LUFS, pico ≤ −1 dBTP.
// O loudnorm de uma passada (modo dinâmico) ficava em −15,6 LUFS na fala; aqui o ganho é medido e corrigido até o alvo
// e um limitador a 192 kHz (aproxima o pico verdadeiro) segura o pico abaixo de −2 dBFS, com folga para o AAC (que passa até ~0,8 dB;
// numa narração de 11 min passou 1,6 dB, então mix() baixa o teto pelo excesso medido e mixa de novo).
export const TARGET = -14, PEAK = -1, CEIL = -2;
export function mixArgs({ narration, duration, music, out, gain = 0, ceil = CEIL }) {
  const bed = '[1:a]lowpass=f=900,volume=-30dB[bed]';
  const f = music
    ? `${bed};[0:a]asplit=2[n][sc];[2:a]volume=-20dB[m0];[m0][sc]sidechaincompress[m];[n][bed][m]amix=inputs=3:duration=longest:normalize=0`
    : `${bed};[0:a][bed]amix=inputs=2:duration=longest:normalize=0`;
  return ['-y', '-hide_banner', '-i', narration, '-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.04:sample_rate=48000:seed=1',
    ...(music ? ['-stream_loop', '-1', '-i', music] : []),
    '-filter_complex', `${f},volume=${gain.toFixed(3)}dB,aresample=192000,alimiter=limit=${(10 ** (ceil / 20)).toFixed(4)}:attack=1:release=50:level=false,aresample=48000[mix]`,
    '-map', '[mix]', '-t', String(duration), '-c:a', 'aac', '-b:a', '192k', out];
}
// Loudness integrada (LUFS) e pico verdadeiro (dBTP) pelo ebur128 do FFmpeg.
export function loudness(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' });
  const I = r.stderr.match(/I:\s+(-?[\d.]+) LUFS/g)?.at(-1), TP = r.stderr.match(/True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS/);
  if (r.status !== 0 || !I || !TP) throw new Error(`FFmpeg falhou na medição: ${(r.stderr || r.error?.message || '').slice(-600)}`);
  return { I: parseFloat(I.match(/-?[\d.]+/)[0]), TP: TP[1] === '-inf' ? -Infinity : parseFloat(TP[1]) };
}
// Mixa, mede e corrige o ganho até ±0,2 LU do alvo (o limitador tira um pouco a cada ganho; converge em 2–3 passadas)
// e o teto do limitador quando o pico do AAC passa de PEAK.
export function mix(o) {
  let gain = 0, ceil = CEIL, m;
  for (let i = 0; i < 6; i++) {
    const r = spawnSync('ffmpeg', mixArgs({ ...o, gain, ceil }), { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`FFmpeg falhou na mixagem: ${(r.stderr || r.error?.message || '').slice(-600)}`);
    m = loudness(o.out);
    if (Math.abs(m.I - TARGET) <= .2 && m.TP <= PEAK) break;
    gain += TARGET - m.I;
    if (m.TP > PEAK) ceil -= m.TP - PEAK + .2;
  }
  if (Math.abs(m.I - TARGET) > .5 || m.TP > PEAK) throw new Error(`Mixagem fora do alvo: ${m.I} LUFS, ${m.TP} dBTP`);
  return { ...m, gain };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try {
  if (!process.argv[2]) throw new Error('Uso: node scripts/mix-audio.mjs <pasta com episode.json e timing.json> [--music=assets/music/<arquivo>]');
  const dir = resolve(process.argv[2]), id = JSON.parse(readFileSync(join(dir, 'episode.json'), 'utf8')).id, { duration } = JSON.parse(readFileSync(join(dir, 'timing.json'), 'utf8'));
  const music = process.argv.find(a => a.startsWith('--music='))?.slice(8), outDir = resolve('out/episodes', id), out = join(outDir, 'mix.m4a'); mkdirSync(outDir, { recursive: true });
  const m = mix({ narration: join(outDir, 'narration.wav'), duration, music, out });
  console.log(`${id}: ${duration.toFixed(2)} s, ${m.I} LUFS, ${m.TP} dBTP -> ${out}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
