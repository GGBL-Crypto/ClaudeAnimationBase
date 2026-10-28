// Resumo do canal pelo `claude -p` (assinatura do usuário, sem cota de API). O texto do YouTube é dado: o processo roda sem ferramentas.
import { spawn as nodeSpawn } from 'node:child_process';
import os from 'node:os';

export const CLAUDE_ARGS = ['-p', '--output-format', 'json', '--tools', '', '--strict-mcp-config', '--no-session-persistence'];
const BAD_JSON = 'Resposta do Claude não é JSON válido', BAD_FORMAT = 'Resposta do Claude fora do formato';

export function parseClaudeJson(stdout) {
  try {
    const { result } = JSON.parse(stdout);
    return JSON.parse(String(result).trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1'));
  } catch { throw new Error(BAD_JSON); }
}

export function runClaude(prompt, { spawn = nodeSpawn, timeoutMs = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    let out = '', done = false;
    const end = (fn, v) => { if (done) return; done = true; clearTimeout(timer); fn(v); };
    const child = spawn('claude', CLAUDE_ARGS, { cwd: os.tmpdir(), windowsHide: true });
    const timer = setTimeout(() => { child.kill(); end(reject, new Error('claude demorou demais')); }, timeoutMs);
    child.on('error', e => end(reject, new Error(e.code === 'ENOENT' ? 'claude não encontrado no PATH' : e.message)));
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', () => {}); // ponytail: stderr descartado (pode ter caminhos); mostrar só o código
    child.on('close', code => {
      if (code !== 0) return end(reject, new Error(`claude terminou com código ${code}`));
      try {
        let env; try { env = JSON.parse(out); } catch { throw new Error(BAD_JSON); }
        if (env?.is_error) throw new Error(String(env.result));
        end(resolve, parseClaudeJson(out));
      } catch (e) { end(reject, e); }
    });
    child.stdin.on('error', () => {}); // EPIPE se o claude morrer antes de ler
    child.stdin.end(prompt);
  });
}

export function validateSummary(o) {
  const ok = o && typeof o === 'object' && typeof o.resumo === 'string' && o.resumo && o.resumo.length <= 2000
    && Array.isArray(o.pontos) && o.pontos.length >= 1 && o.pontos.length <= 10
    && o.pontos.every(p => typeof p === 'string' && p.length <= 300);
  if (!ok) throw new Error(BAD_FORMAT);
  return { resumo: o.resumo, pontos: o.pontos };
}

// Título vira uma linha só e perde sequências de 3+ < ou > (nenhum título fecha o bloco <<<DADOS … DADOS>>>).
const oneLine = s => String(s).replace(/\s+/g, ' ').replace(/[<>]{3,}/g, '');

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
