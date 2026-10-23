// Narração: divisão em frases, linha do tempo e WAV PCM 16 bits. Funções puras.
export const splitSentences = text => text.trim().split(/(?<=[.!?…])\s+/).filter(Boolean);

export function layoutTimeline(ep, durations) {
  const fps = ep.fps, q = x => Math.round(x * fps) / fps;
  let cursor = ep.intro; const chapters = [], shots = [];
  ep.chapters.forEach((ch, i) => {
    const gap = i ? 1.6 : 0; // a pausa entre capítulos fica no início do primeiro plano (sem lacunas)
    const first = shots.length;
    for (const sh of ch.shots) {
      const start = q(cursor), ds = durations.get(sh.id) || [], speech = [];
      if (sh === ch.shots[0]) cursor += gap;
      if (sh.narration && ds.length !== splitSentences(sh.narration).length) throw new Error(`Plano ${sh.id}: durações não batem com as frases`);
      ds.forEach((d, j) => { cursor += j ? .35 : .25; speech.push({ start: cursor, end: cursor + d, text: splitSentences(sh.narration)[j] }); cursor += d; });
      if (speech.length) cursor += .8;
      cursor += sh.hold ?? (speech.length ? 0 : 3);
      const end = q(cursor); cursor = end;
      shots.push({ id: sh.id, chapter: ch.id, start, end, visual: sh.visual, transition: sh.transition, speech });
    }
    chapters.push({ id: ch.id, title: ch.title, start: shots[first].start, end: shots.at(-1).end });
  });
  const last = shots.at(-1), end = q(cursor + ep.outro);
  last.end = end; chapters.at(-1).end = end;
  return { id: ep.id, fps, duration: end, chapters, shots };
}

export function readWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') throw new Error('WAV inválido');
  let pos = 12, fmt = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('latin1', pos, pos + 4), size = buf.readUInt32LE(pos + 4), body = pos + 8;
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), sampleRate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    else if (id === 'data') {
      if (!fmt || fmt.format !== 1 || fmt.bits !== 16) throw new Error('WAV precisa ser PCM de 16 bits');
      const n = Math.min(size, buf.length - body) >> 1, samples = new Int16Array(n);
      for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(body + 2 * i);
      return { sampleRate: fmt.sampleRate, channels: fmt.channels, samples };
    }
    pos = body + size + (size & 1);
  }
  throw new Error('WAV sem bloco de dados');
}

export function writeWav({ sampleRate, samples }) {
  const n = samples.length, buf = Buffer.alloc(44 + 2 * n);
  buf.write('RIFF', 0, 'latin1'); buf.writeUInt32LE(36 + 2 * n, 4); buf.write('WAVEfmt ', 8, 'latin1');
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'latin1'); buf.writeUInt32LE(2 * n, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(samples[i], 44 + 2 * i);
  return buf;
}

export function composeNarration(timing, clips, sampleRate) {
  const out = new Int16Array(Math.round(timing.duration * sampleRate));
  for (const sh of timing.shots) sh.speech.forEach((sp, j) => {
    const clip = clips.get(`${sh.id}#${j}`), at = Math.round(sp.start * sampleRate);
    if (!clip) throw new Error(`Falta o clipe ${sh.id}#${j}`);
    out.set(clip.subarray(0, Math.max(0, out.length - at)), at);
  });
  return out;
}
