// Thumbnails do YouTube para o Claude ver. Só baixa i.ytimg.com/vi/<id de 11 caracteres>/mqdefault.jpg, jpeg até 200 KB, com cache em disco.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ID = /^[A-Za-z0-9_-]{11}$/, MAX_BYTES = 200000;
const isJpeg = b => b.length > 0 && b[0] === 0xff && b[1] === 0xd8;
export const thumbUrl = id => typeof id === 'string' && ID.test(id) ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;

export async function fetchThumbs(ids, dir, { fetch = globalThis.fetch, max = 6 } = {}) {
  const got = [];
  mkdirSync(dir, { recursive: true });
  for (const id of ids) {
    if (got.length >= max) break;
    const url = thumbUrl(id); if (!url) continue;
    const file = path.join(dir, `${id}.jpg`);
    try {
      let buf; try { buf = readFileSync(file); } catch { /* sem cache */ }
      if (buf && !isJpeg(buf)) buf = null; // cache ruim: baixa de novo
      if (!buf) {
        const r = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' }); // sem redirect: fica na URL fixa do ytimg
        if (!r.ok || !String(r.headers.get('content-type')).startsWith('image/jpeg') || Number(r.headers.get('content-length')) > MAX_BYTES) continue;
        buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > MAX_BYTES || !isJpeg(buf)) continue;
        writeFileSync(file, buf);
      }
      got.push({ id, mediaType: 'image/jpeg', base64: buf.toString('base64') });
    } catch { /* falha de rede ou disco: ignora */ }
  }
  return got;
}
