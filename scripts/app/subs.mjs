// Análise de roteiro de outlier (fase 6): legenda automática do yt-dlp -> texto -> padrão devolvido pelo Claude. Puro: sem rede nem banco.
import { join } from 'node:path';
import { oneLine } from './llm.mjs';

const BAD_FORMAT = 'Resposta do Claude fora do formato';
const ID = /^[A-Za-z0-9_-]{11}$/;
const norm = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();

// Só legenda: --skip-download, sem formato de vídeo nem áudio. Id e idioma validados antes de virar argumento.
export function ytdlpArgs(id, lang, dir) {
  if (!ID.test(id ?? '')) throw new Error('Vídeo inválido');
  if (!/^[a-z]{2,3}$/.test(lang ?? '')) throw new Error('Idioma inválido');
  return ['--ignore-config', '--skip-download', '--write-auto-subs', '--write-subs', '--sub-langs', `${lang}.*,${lang}`, '--sub-format', 'vtt', '-o', join(dir, '%(id)s'), `https://www.youtube.com/watch?v=${id}`];
}

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

// VTT -> uma linha de texto. A legenda automática repete a última linha de cada bloco no seguinte: linha igual à anterior cai.
export function vttToText(vtt) {
  const out = [];
  for (const raw of vtt.split(/\r?\n/)) {
    if (/-->|^(WEBVTT|Kind:|Language:|NOTE(\s|$))/.test(raw)) continue;
    const l = raw.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, e => ENT[e]).replace(/\s+/g, ' ').trim();
    if (l && l !== out.at(-1)) out.push(l);
  }
  return out.join(' ');
}

// Título e transcrição entram uma linha só, sem 3+ < ou >, entre os marcadores do molde.
// ponytail: transcrição cortada em 60 000 caracteres (~1 h de fala); tamanho maior pede trechos amostrados.
export function analysisPrompt(template, { video, transcript }) {
  const vals = { titulo: oneLine(video.title), transcricao: oneLine(transcript).slice(0, 60000) };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vals)) throw new Error(`Placeholder desconhecido: ${k}`);
    return vals[k];
  });
}

// Saída do Claude -> padrão só com os campos do formato. 8 palavras seguidas da transcrição em qualquer campo = cópia.
export function validateScriptAnalysis(o, transcript) {
  const str = (s, n) => typeof s === 'string' && s.trim() && s.length <= n;
  const arr = (a, min, max) => Array.isArray(a) && a.length >= min && a.length <= max;
  if (!(o && typeof o === 'object' && str(o.gancho, 400) && str(o.ritmo, 400)
    && arr(o.estrutura, 3, 12) && o.estrutura.every(e => e && str(e.parte, 60) && str(e.funcao, 200) && typeof e.proporcao === 'number' && e.proporcao >= 0 && e.proporcao <= 1)
    && arr(o.tecnicas, 3, 10) && o.tecnicas.every(t => str(t, 200)))) throw new Error(BAD_FORMAT);
  const grams = (s, n = 8) => { const w = norm(s).split(' '); return Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) => w.slice(i, i + n).join(' ')); };
  const seen = new Set(grams(transcript));
  const texts = [o.gancho, o.ritmo, ...o.estrutura.flatMap(e => [e.parte, e.funcao]), ...o.tecnicas];
  if (texts.some(t => grams(t).some(g => seen.has(g)))) throw new Error('Análise copiou trecho do vídeo');
  return { gancho: o.gancho, estrutura: o.estrutura.map(e => ({ parte: e.parte, funcao: e.funcao, proporcao: e.proporcao })), ritmo: o.ritmo, tecnicas: [...o.tecnicas] };
}
