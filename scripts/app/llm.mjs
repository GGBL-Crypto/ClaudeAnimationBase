// Resumo do canal pelo `claude -p` (assinatura do usuário, sem cota de API). O texto do YouTube é dado: o processo roda sem ferramentas.
import { spawn as nodeSpawn } from 'node:child_process';
import os from 'node:os';

export const CLAUDE_ARGS = ['-p', '--output-format', 'json', '--tools', '', '--strict-mcp-config', '--no-session-persistence'];
const BAD_JSON = 'Resposta do Claude não é JSON válido', BAD_FORMAT = 'Resposta do Claude fora do formato';

export const CLAUDE_IMAGE_ARGS = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--tools', '', '--strict-mcp-config', '--no-session-persistence'];

// `result` do Claude -> objeto, sem as cercas ```json.
const parseResult = result => {
  try { return JSON.parse(String(result).trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1')); } catch { throw new Error(BAD_JSON); }
};

export function parseClaudeJson(stdout) {
  let result; try { ({ result } = JSON.parse(stdout)); } catch { throw new Error(BAD_JSON); }
  return parseResult(result);
}

// Roda o claude, manda `input` no stdin e entrega o stdout inteiro a `parse(out)`.
// signal (opcional): o aborto mata o claude e rejeita com "Cancelada".
function spawnClaude(args, input, parse, { spawn, timeoutMs, signal }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Cancelada'));
    let out = '', done = false;
    const end = (fn, v) => { if (done) return; done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(v); };
    const child = spawn('claude', args, { cwd: os.tmpdir(), windowsHide: true });
    const timer = setTimeout(() => { child.kill(); end(reject, new Error('claude demorou demais')); }, timeoutMs);
    const abort = () => { child.kill(); end(reject, new Error('Cancelada')); };
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', e => end(reject, new Error(e.code === 'ENOENT' ? 'claude não encontrado no PATH' : e.message)));
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', () => {}); // ponytail: stderr descartado (pode ter caminhos); mostrar só o código
    child.on('close', code => {
      if (code !== 0) return end(reject, new Error(`claude terminou com código ${code}`));
      try { end(resolve, parse(out)); } catch (e) { end(reject, e); }
    });
    child.stdin.on('error', () => {}); // EPIPE se o claude morrer antes de ler
    child.stdin.end(input);
  });
}

export function runClaude(prompt, { spawn = nodeSpawn, timeoutMs = 180000, signal } = {}) {
  return spawnClaude(CLAUDE_ARGS, prompt, out => {
    let env; try { env = JSON.parse(out); } catch { throw new Error(BAD_JSON); }
    if (env?.is_error) throw new Error(String(env.result));
    return parseClaudeJson(out);
  }, { spawn, timeoutMs, signal });
}

// images: { mediaType, base64 }[]. Entrada stream-json: uma mensagem de usuário com imagens + texto; saída: última linha `result`.
export function runClaudeImages(prompt, images, { spawn = nodeSpawn, timeoutMs = 300000, signal } = {}) {
  const content = [...images.map(i => ({ type: 'image', source: { type: 'base64', media_type: i.mediaType, data: i.base64 } })), { type: 'text', text: prompt }];
  const input = JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n';
  return spawnClaude(CLAUDE_IMAGE_ARGS, input, out => {
    let last; for (const l of out.split('\n')) { try { const o = JSON.parse(l); if (o?.type === 'result') last = o; } catch { /* linha não JSON */ } }
    if (!last) throw new Error(BAD_JSON);
    if (last.is_error) throw new Error(String(last.result));
    return parseResult(last.result);
  }, { spawn, timeoutMs, signal });
}

export function validateSummary(o) {
  const ok = o && typeof o === 'object' && typeof o.resumo === 'string' && o.resumo && o.resumo.length <= 2000
    && Array.isArray(o.pontos) && o.pontos.length >= 1 && o.pontos.length <= 10
    && o.pontos.every(p => typeof p === 'string' && p.length <= 300);
  if (!ok) throw new Error(BAD_FORMAT);
  return { resumo: o.resumo, pontos: o.pontos };
}

// Título vira uma linha só e perde sequências de 3+ < ou > (nenhum título fecha o bloco <<<DADOS … DADOS>>>).
export const oneLine = s => String(s).replace(/\s+/g, ' ').replace(/[<>]{3,}/g, '');

// videoRows: { title, views, durationS }; uma linha por vídeo.
export function summaryPrompt(template, channel, videoRows, analysis) {
  const vals = {
    titulo: oneLine(channel.title),
    videos: videoRows.slice(0, 30).map(v => `${v.views} | ${Math.round(v.durationS / 6) / 10} | ${oneLine(v.title)}`).join('\n'),
    analise: JSON.stringify(analysis),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vals)) throw new Error(`Placeholder desconhecido: ${k}`);
    return vals[k];
  });
}

export function validateSubniches(o) {
  const str = (s, n) => typeof s === 'string' && s && s.length <= n;
  const ok = o && typeof o === 'object' && Array.isArray(o.subnichos) && o.subnichos.length >= 1 && o.subnichos.length <= 8
    && o.subnichos.every(s => s && typeof s === 'object' && str(s.nome, 80) && str(s.porque, 300)
      && Array.isArray(s.exemplos) && s.exemplos.length <= 3 && s.exemplos.every(e => str(e, 120)));
  if (!ok) throw new Error(BAD_FORMAT);
  return { subnichos: o.subnichos.map(s => ({ nome: s.nome, porque: s.porque, exemplos: s.exemplos })) };
}

// outliers: { views, multiple, title }; até 30 linhas.
export function subnichePrompt(template, niche, outliers) {
  const vals = {
    nicho: oneLine(niche.name),
    palavras: niche.topWords.map(w => oneLine(w.word)).join(', '),
    titulos: outliers.slice(0, 30).map(v => `${v.views} | ${v.multiple} | ${oneLine(v.title)}`).join('\n'),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vals)) throw new Error(`Placeholder desconhecido: ${k}`);
    return vals[k];
  });
}
