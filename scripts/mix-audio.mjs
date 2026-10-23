import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Narração + cama de ruído marrom (−30 dB) + música opcional (−20 dB, abaixa sob a voz) -> AAC, −14 LUFS.
export function mixArgs({ narration, duration, music, out }) {
  const bed = '[1:a]lowpass=f=900,volume=-30dB[bed]';
  const f = music
    ? `${bed};[0:a]asplit=2[n][sc];[2:a]volume=-20dB[m0];[m0][sc]sidechaincompress[m];[n][bed][m]amix=inputs=3:duration=longest:normalize=0`
    : `${bed};[0:a][bed]amix=inputs=2:duration=longest:normalize=0`;
  return ['-y', '-hide_banner', '-i', narration, '-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.04:sample_rate=48000',
    ...(music ? ['-stream_loop', '-1', '-i', music] : []),
    '-filter_complex', `${f},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[mix]`,
    '-map', '[mix]', '-t', String(duration), '-c:a', 'aac', '-b:a', '192k', out];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try {
  if (!process.argv[2]) throw new Error('Uso: node scripts/mix-audio.mjs episodes/<id> [--music=assets/music/<arquivo>]');
  const dir = resolve(process.argv[2]), id = JSON.parse(readFileSync(join(dir, 'episode.json'), 'utf8')).id, { duration } = JSON.parse(readFileSync(join(dir, 'timing.json'), 'utf8'));
  const music = process.argv.find(a => a.startsWith('--music='))?.slice(8), outDir = resolve('out/episodes', id), out = join(outDir, 'mix.m4a'); mkdirSync(outDir, { recursive: true });
  const r = spawnSync('ffmpeg', mixArgs({ narration: join(outDir, 'narration.wav'), duration, music, out }), { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`FFmpeg falhou na mixagem: ${(r.stderr || r.error?.message || '').slice(-600)}`);
  console.log(`${id}: ${duration.toFixed(2)} s -> ${out}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
