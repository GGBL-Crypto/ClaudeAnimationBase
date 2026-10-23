import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { splitSentences, layoutTimeline, readWav, writeWav, composeNarration } from './narration-lib.mjs';

// Piper roda como subprocesso (GPL): `python -m piper`; sem pip, troque pelo binário de release.
const PIPER = ['python', '-X', 'utf8', '-m', 'piper'], VOICES = 'tools/piper-voices';
try {
  if (!process.argv[2]) throw new Error('Uso: node scripts/narrate.mjs episodes/<id>');
  const dir = resolve(process.argv[2]), ep = JSON.parse(readFileSync(join(dir, 'episode.json'), 'utf8'));
  const voice = ep.voice || 'pt_BR-faber-medium', model = join(VOICES, voice + '.onnx'), ls = ep.lengthScale ?? 1;
  if (!existsSync(model)) throw new Error(`Voz não encontrada: ${model}. Rode: python -m piper.download_voices --download-dir ${VOICES} ${voice}`);
  const outDir = resolve('out/episodes', ep.id), ttsDir = join(outDir, 'tts'); mkdirSync(ttsDir, { recursive: true });
  const durations = new Map(), clips = new Map(); let sampleRate = 0;
  for (const sh of ep.chapters.flatMap(c => c.shots)) {
    if (!sh.narration) continue;
    const ds = [];
    splitSentences(sh.narration).forEach((text, j) => {
      const file = join(ttsDir, createHash('sha1').update(`${voice}|${ls}|${text}`).digest('hex') + '.wav');
      if (!existsSync(file)) {
        const r = spawnSync(PIPER[0], [...PIPER.slice(1), '-m', model, '--length-scale', String(ls), '-f', file], { input: text, encoding: 'utf8' });
        if (r.status !== 0 || !existsSync(file)) throw new Error(`Piper falhou em "${text}": ${r.stderr || r.error?.message}`);
      }
      const wav = readWav(readFileSync(file));
      if (wav.channels !== 1 || (sampleRate && wav.sampleRate !== sampleRate)) throw new Error('Os clipes precisam ser mono e ter a mesma taxa');
      sampleRate = wav.sampleRate; ds.push(wav.samples.length / sampleRate); clips.set(`${sh.id}#${j}`, wav.samples);
    });
    durations.set(sh.id, ds);
  }
  const timing = layoutTimeline(ep, durations);
  writeFileSync(join(dir, 'timing.json'), JSON.stringify(timing, null, 2) + '\n');
  writeFileSync(join(outDir, 'narration.wav'), writeWav({ sampleRate: sampleRate || 22050, samples: composeNarration(timing, clips, sampleRate || 22050) }));
  console.log(`${ep.id}: ${timing.duration.toFixed(2)} s, ${clips.size} frases -> ${join(outDir, 'narration.wav')}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
