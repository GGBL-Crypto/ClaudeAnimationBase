import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { splitSentences, layoutTimeline, readWav, writeWav, composeNarration, ttsCacheKey } from './narration-lib.mjs';

// Piper roda como subprocesso (GPL): `python -m piper`; sem pip, troque pelo binário de release.
const PIPER = ['python', '-X', 'utf8', '-m', 'piper'], VOICES = 'tools/piper-voices';
// Kokoro (Apache-2.0) também é subprocesso: venv fora do git, um processo por execução com todas as frases.
const KOKORO_PY = 'out/tmp/kokoro-venv/Scripts/python.exe', KOKORO_SAY = 'scripts/kokoro_say.py';
try {
  if (!process.argv[2]) throw new Error('Uso: node scripts/narrate.mjs episodes/<id>');
  const dir = resolve(process.argv[2]), ep = JSON.parse(readFileSync(join(dir, 'episode.json'), 'utf8'));
  const voice = ep.voice || 'kokoro:pm_alex', kokoro = voice.startsWith('kokoro:'), model = join(VOICES, voice + '.onnx'), ls = ep.lengthScale ?? 1;
  if (kokoro && !existsSync(KOKORO_PY)) throw new Error(`Kokoro não instalado: falta ${KOKORO_PY}. Veja episodes/README.md`);
  if (!kokoro && !existsSync(model)) throw new Error(`Voz não encontrada: ${model}. Rode: python -m piper.download_voices --download-dir ${VOICES} ${voice}`);
  const outDir = resolve('out/episodes', ep.id), ttsDir = join(outDir, 'tts'); mkdirSync(ttsDir, { recursive: true });
  const durations = new Map(), clips = new Map(); let sampleRate = 0;
  const jobs = [], shots = ep.chapters.flatMap(c => c.shots).filter(sh => sh.narration);
  for (const sh of shots) splitSentences(sh.narration).forEach((text, j) => {
    const file = join(ttsDir, ttsCacheKey(voice, ls, text) + '.wav');
    if (!existsSync(file)) jobs.push({ text, out: file });
  });
  if (kokoro && jobs.length) {
    const r = spawnSync(KOKORO_PY, ['-X', 'utf8', KOKORO_SAY, voice.slice(7), String(1 / ls)], { input: JSON.stringify(jobs), encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`Kokoro falhou: ${r.stderr || r.error?.message}`);
  } else for (const { text, out } of jobs) {
    const r = spawnSync(PIPER[0], [...PIPER.slice(1), '-m', model, '--length-scale', String(ls), '-f', out], { input: text, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`Piper falhou em "${text}": ${r.stderr || r.error?.message}`);
  }
  for (const sh of shots) {
    const ds = [];
    splitSentences(sh.narration).forEach((text, j) => {
      const file = join(ttsDir, ttsCacheKey(voice, ls, text) + '.wav');
      if (!existsSync(file)) throw new Error(`Sem áudio para "${text}"`);
      const wav = readWav(readFileSync(file));
      if (wav.channels !== 1 || (sampleRate && wav.sampleRate !== sampleRate)) throw new Error('Os clipes precisam ser mono e ter a mesma taxa');
      sampleRate = wav.sampleRate; ds.push(wav.samples.length / sampleRate); clips.set(`${sh.id}#${j}`, wav.samples);
    });
    durations.set(sh.id, ds);
  }
  const timing = layoutTimeline(ep, durations);
  writeFileSync(join(dir, 'timing.json'), JSON.stringify(timing, null, 2) + '\n');
  writeFileSync(join(outDir, 'narration.wav'), writeWav({ sampleRate: sampleRate || (kokoro ? 24000 : 22050), samples: composeNarration(timing, clips, sampleRate || (kokoro ? 24000 : 22050)) }));
  console.log(`${ep.id}: ${timing.duration.toFixed(2)} s, ${clips.size} frases -> ${join(outDir, 'narration.wav')}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
