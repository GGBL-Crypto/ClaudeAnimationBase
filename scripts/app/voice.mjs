// Amostra de voz pelo Kokoro (subprocesso) e medida de palavras por minuto. Sem rede; spawn/exists injetáveis nos testes.
import { spawn as nodeSpawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readWav } from '../narration-lib.mjs';

// Mesmos valores de scripts/narrate.mjs.
const KOKORO_PY = 'out/tmp/kokoro-venv/Scripts/python.exe', KOKORO_SAY = 'scripts/kokoro_say.py';

// Texto neutro de documentário, sem números (cerca de 60 palavras por idioma).
export const SAMPLE_TEXT = {
  pt: 'Durante séculos, as pessoas olharam para o céu à noite e tentaram entender o que viam. Algumas acreditavam que as estrelas eram fogueiras distantes, outras imaginavam que fossem janelas para outro mundo. Com o tempo, a observação paciente e o cálculo cuidadoso mostraram que o universo é muito maior, mais antigo e mais estranho do que qualquer lenda havia sugerido.',
  en: 'For centuries, people looked up at the night sky and tried to understand what they were seeing. Some believed the stars were distant campfires, while others imagined they were windows into another world. Over time, patient observation and careful calculation revealed that the universe is far larger, far older, and far stranger than any legend had ever suggested.',
};

// voice: `kokoro:<id>`. Gera (ou reaproveita) o WAV em outDir e mede as palavras por minuto.
export async function sampleVoice({ voice, speed, lang }, outDir, { spawn = nodeSpawn, exists = existsSync, root = process.cwd() } = {}) {
  const py = join(root, KOKORO_PY);
  if (!exists(py)) throw new Error('Kokoro não instalado: veja docs/VOICE.md');
  const text = SAMPLE_TEXT[lang], id = String(voice).replace(/^kokoro:/, '');
  if (!text || id === voice) throw new Error('Voz ou idioma inválido');
  const name = createHash('sha1').update(`${voice}|${speed}|${text}`).digest('hex') + '.wav', file = join(outDir, name);
  if (!existsSync(file)) { // o cache é checado no disco de verdade; `exists` só vale para o venv
    mkdirSync(outDir, { recursive: true });
    await new Promise((resolve, reject) => {
      const child = spawn(py, ['-X', 'utf8', join(root, KOKORO_SAY), id, String(speed)], { windowsHide: true });
      child.on('error', e => reject(new Error(`Kokoro falhou: ${e.message}`)));
      child.stderr?.on('data', () => {}); // descartado (pode ter caminhos)
      child.on('close', code => code === 0 ? resolve() : reject(new Error(`Kokoro falhou (código ${code})`)));
      child.stdin.on?.('error', () => {});
      child.stdin.end(JSON.stringify([{ text, out: file }]));
    });
  }
  const wav = readWav(readFileSync(file)), seconds = Math.round(wav.samples.length / wav.sampleRate * 100) / 100, words = text.split(/\s+/).length;
  return { file, name, seconds, words, wpm: Math.round(words / (seconds / 60)) };
}
