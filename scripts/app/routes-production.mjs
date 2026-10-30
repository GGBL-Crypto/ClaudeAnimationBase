// Rotas da produção (fase 6): lista, criação com a pauta mínima, detalhe, apagar, cancelar job e arquivos da produção.
import { createReadStream } from 'node:fs';
import { readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { EPISODE_STYLES } from './profiles.mjs';
import { prodDir, epDir } from './production.mjs';

const FILE = /^(video\.mp4|mix\.m4a|narration\.wav|roteiro\.md|legendas\.srt|descricao\.txt|tags\.txt|titulo\.txt|(cena|thumb)-[a-z0-9-]+\.png)$/;
const TYPE = { mp4: 'video/mp4', m4a: 'audio/mp4', wav: 'audio/wav', md: 'text/markdown; charset=utf-8', srt: 'text/plain; charset=utf-8', txt: 'text/plain; charset=utf-8', png: 'image/png' };
const HEAD = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

// Pauta mínima: tema opcional (3 a 200), duração e estilo com o padrão do perfil. Lança com status 400.
export function validatePauta(b, my, no) {
  const theme = b.theme == null || (typeof b.theme === 'string' && !b.theme.trim()) ? null : typeof b.theme === 'string' && b.theme.trim().length >= 3 && b.theme.trim().length <= 200 ? b.theme.trim() : no('Tema de 3 a 200 caracteres');
  const targetMin = b.targetMin ?? my.targetMin, toleranceMin = b.toleranceMin ?? my.toleranceMin, style = b.style ?? my.style;
  if (!int(targetMin, 10, 120)) no('Duração alvo entre 10 e 120 min');
  if (!int(toleranceMin, 1, 15)) no('Tolerância entre 1 e 15 min');
  if (!EPISODE_STYLES.includes(style)) no('Estilo não suportado para vídeo');
  return { theme, targetMin, toleranceMin, style };
}

// Range de um só intervalo (bytes=a-b, a- ou -n); null sem cabeçalho, false se inválido ou fora do tamanho.
function range(h, size) {
  if (h == null) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(h); if (!m || (!m[1] && !m[2])) return false;
  const [a, b] = m[1] ? [Number(m[1]), m[2] ? Math.min(Number(m[2]), size - 1) : size - 1] : [Math.max(0, size - Number(m[2])), size - 1];
  return a <= b && a < size ? [a, b] : false;
}

export default function ({ db, no, nf, fail, readJson, jobs, outDir, prod, active }) {
  const my = n => db.myChannel(n) ?? nf('Canal próprio não encontrado');
  const wipe = id => Promise.all([prodDir(outDir, id), epDir(outDir, id)].map(d => rm(d, { recursive: true, force: true })));
  const fileOf = (id, name) => /^(video\.mp4|mix\.m4a|narration\.wav)$/.test(name) ? join(epDir(outDir, id), name)
    : name.startsWith('cena-') ? join(prodDir(outDir, id), 'cenas', name.slice(5))
    : name.startsWith('thumb-') ? join(prodDir(outDir, id), 'thumbs', name) : join(prodDir(outDir, id), name);
  return [
    ['GET', /^\/api\/productions$/, (m, req, res, u) => {
      const q = u.searchParams.get('my');
      return db.productions(q == null ? {} : { myId: /^\d{1,9}$/.test(q) ? Number(q) : no('Canal próprio inválido') });
    }],
    ['POST', /^\/api\/productions$/, async (m, req) => {
      const b = await readJson(req);
      if (!Number.isInteger(b.myId)) no('Canal próprio inválido');
      const id = db.createProduction({ myId: b.myId, ...validatePauta(b, my(b.myId), no) });
      await wipe(id); // id reaproveitado depois de apagar a última: nada de arquivo velho
      return { ...db.production(id), active: {} };
    }],
    ['GET', /^\/api\/productions\/([^/]+)$/, m => { const p = prod(m[1]); return { ...p, active: active(p.id) }; }],
    ['POST', /^\/api\/productions\/([^/]+)\/delete$/, async m => {
      const p = prod(m[1]);
      if (Object.keys(active(p.id)).length) throw fail(409, 'Produção com etapa em andamento');
      db.deleteProduction(p.id); await wipe(p.id);
      return { ok: true };
    }],
    ['POST', /^\/api\/jobs\/([\w-]+)\/cancel$/, m => { if (!jobs.get(m[1])) nf('Job não encontrado'); return { canceled: jobs.cancel(m[1]) }; }],
    // Nome da lista fixa, sem caminho vindo de fora; mp4, m4a e wav com Range para o player.
    ['GET', /^\/api\/productions\/([^/]+)\/files\/([^/]+)$/, async (m, req, res) => {
      const p = prod(m[1]); if (!FILE.test(m[2])) nf('Arquivo não encontrado');
      const file = fileOf(p.id, m[2]), ext = m[2].split('.').pop(), missing = e => { throw e.code === 'ENOENT' ? fail(404, 'Arquivo não encontrado') : e; };
      if (!['mp4', 'm4a', 'wav'].includes(ext)) {
        const bytes = await readFile(file).catch(missing);
        res.writeHead(200, { ...HEAD, 'Content-Type': TYPE[ext], 'Content-Length': bytes.length }); return void res.end(bytes);
      }
      const { size } = await stat(file).catch(missing), r = range(req.headers.range, size);
      if (r === false) { res.writeHead(416, { ...HEAD, 'Content-Range': `bytes */${size}` }); return void res.end(); }
      const [a, b] = r ?? [0, size - 1];
      res.writeHead(r ? 206 : 200, { ...HEAD, 'Content-Type': TYPE[ext], 'Accept-Ranges': 'bytes', 'Content-Length': size ? b - a + 1 : 0, ...(r && { 'Content-Range': `bytes ${a}-${b}/${size}` }) });
      if (!size) return void res.end();
      await pipeline(createReadStream(file, { start: a, end: b }), res);
    }],
  ];
}
