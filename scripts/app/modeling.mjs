// Subtemas do âncora, prompt e validação da modelagem (puro: sem banco, sem rede). Números vêm sempre do app.
import { titleWords } from './analysis.mjs';
import { oneLine } from './llm.mjs';

const BAD_FORMAT = 'Resposta do Claude fora do formato';
const median = a => { const s = a.map(v => v.views).sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const sum = a => a.reduce((s, v) => s + (Number.isFinite(v.views) ? v.views : 0), 0);
export const norm = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

// Vídeo vai para a palavra mais frequente do canal (>= 2 vídeos, top 15) que ele contém; sem palavra: "outros". Até 8 subtemas.
export function subtopics(videos) {
  const words = videos.map(v => new Set(titleWords(v.title)));
  const freq = new Map();
  for (const ws of words) for (const w of ws) freq.set(w, (freq.get(w) || 0) + 1);
  const cands = [...freq].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 15).map(([w]) => w);
  const by = new Map(), rest = [];
  videos.forEach((v, i) => { const w = cands.find(c => words[i].has(c)); if (w) by.set(w, [...(by.get(w) || []), v]); else rest.push(v); });
  const mk = (word, vs) => { const videos = [...vs].sort((a, b) => b.views - a.views); return { word, label: word ?? 'outros', count: vs.length, medianViews: median(vs), totalViews: sum(vs), videos }; };
  const groups = [...by].map(([w, vs]) => mk(w, vs)).sort((a, b) => b.totalViews - a.totalViews);
  const others = [...rest, ...groups.slice(8).flatMap(g => g.videos)];
  return [...groups.slice(0, 8), ...(others.length ? [mk(null, others)] : [])];
}

// Até 5 vídeos por subtema e 40 no total; `videoIds` são os que entraram no prompt.
export function modelPrompt(template, { anchor, groups, extras, styles }) {
  const videoIds = [];
  const blocks = groups.map(g => {
    const take = g.videos.slice(0, Math.min(5, 40 - videoIds.length));
    videoIds.push(...take.map(v => v.id));
    return take.length && `${oneLine(g.label)} (${g.count} vídeos, mediana ${g.medianViews} views)\n${take.map(v => `${v.id} | ${v.views} | ${Math.round(v.durationS / 6) / 10} | ${oneLine(v.title)}`).join('\n')}`;
  }).filter(Boolean);
  const vals = {
    ancora: oneLine(anchor.title),
    subtemas: blocks.join('\n\n'),
    extras: extras.map(e => `${oneLine(e.title)}\n${e.titles.map(t => `- ${oneLine(t)}`).join('\n')}`).join('\n\n'),
    estilos: styles.map(oneLine).join(', '),
  };
  const prompt = template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vals)) throw new Error(`Placeholder desconhecido: ${k}`);
    return vals[k];
  });
  return { prompt, videoIds };
}

// Saída do Claude -> modelo só com os campos do formato (qualquer número extra some). Molde igual a título enviado é rejeitado.
export function validateModel(o, { videoIds, titles, styles }) {
  const str = (s, n) => typeof s === 'string' && s.trim() && s.length <= n;
  const arr = (a, min, max) => Array.isArray(a) && a.length >= min && a.length <= max;
  const conceptOk = c => c && typeof c === 'object' && str(c.nome, 80) && str(c.subtema, 80)
    && arr(c.videoIds, 1, 5) && new Set(c.videoIds).size === c.videoIds.length && c.videoIds.every(id => videoIds.includes(id))
    && arr(c.moldesTitulo, 3, 5) && c.moldesTitulo.every(m => str(m, 120))
    && str(c.estiloThumbnail, 400) && arr(c.promptsImagem, 3, 3) && c.promptsImagem.every(p => str(p, 400))
    && styles.includes(c.estiloVisual)
    && arr(c.plano30, 8, 15) && c.plano30.every((p, i) => p && Number.isInteger(p.dia) && p.dia >= 1 && p.dia <= 30 && str(p.tema, 120) && (!i || p.dia > c.plano30[i - 1].dia));
  if (!(o && typeof o === 'object' && str(o.resumo, 1500) && arr(o.conceitos, 3, 3) && o.conceitos.every(conceptOk))) throw new Error(BAD_FORMAT);
  const seen = new Set(titles.map(norm));
  if (o.conceitos.some(c => c.moldesTitulo.some(m => seen.has(norm(m))))) throw new Error('Modelagem copiou um título');
  if (o.conceitos.some(c => c.moldesTitulo.some(m => !/\[[^\]]+\]/.test(m)))) throw new Error(BAD_FORMAT); // lacuna [...] só depois: molde copiado sem lacuna é "copiou"
  return {
    resumo: o.resumo,
    conceitos: o.conceitos.map(c => ({
      nome: c.nome, subtema: c.subtema, videoIds: [...c.videoIds], moldesTitulo: [...c.moldesTitulo], estiloThumbnail: c.estiloThumbnail,
      promptsImagem: [...c.promptsImagem], estiloVisual: c.estiloVisual, plano30: c.plano30.map(p => ({ dia: p.dia, tema: p.tema })),
    })),
  };
}

// Views no âncora: soma dos vídeos de base, das linhas do app.
export function modelViews(model, videoRows) {
  const views = new Map(videoRows.map(v => [v.id, v.views]));
  return model.conceitos.map(c => c.videoIds.reduce((s, id) => s + (Number.isFinite(views.get(id)) ? views.get(id) : 0), 0));
}
