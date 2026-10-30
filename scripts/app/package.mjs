// Embalagem do vídeo (fase 6): capítulos, descrição, SRT, prompt e validação de títulos/thumbs, ffmpeg da thumbnail e exportação (puro, exceto exportPackage).
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chunks, wordTimes } from '../episode-lib.mjs';
import { oneLine } from './llm.mjs';
import { norm } from './modeling.mjs';

const BAD_FORMAT = 'Resposta do Claude fora do formato';
const two = n => String(n).padStart(2, '0');

// MM:SS (ou H:MM:SS) de cada capítulo do timing; o primeiro vai para 0:00. O YouTube só aceita 3 capítulos ou mais, de 10 s ou mais.
export function chaptersText(timing) {
  const cs = timing.chapters.map((c, i) => ({ t: i ? Math.floor(c.start) : 0, title: c.title }));
  if (cs.length >= 3 && cs.every((c, i) => (cs[i + 1]?.t ?? timing.duration) - c.t >= 10)) {
    const mmss = t => (t >= 3600 ? `${Math.floor(t / 3600)}:${two(Math.floor(t / 60) % 60)}` : String(Math.floor(t / 60))) + ':' + two(t % 60);
    return { text: cs.map(c => `${mmss(c.t)} ${c.title}`).join('\n'), ok: true };
  }
  return { text: '', ok: false, warning: 'Capítulos fora da descrição: o YouTube exige pelo menos 3 capítulos de 10 s cada' };
}

export const sourcesList = sources => sources.map((s, i) => `${i + 1}. ${s.title} - ${s.url} (acessado em ${s.accessed})`).join('\n');

// Molde do perfil com {fontes} e {capitulos}; sem molde: resumo, capítulos e fontes. `chapters` é o texto (vazio se não valeu).
export function descriptionText({ template, summary, chapters, sources }) {
  const fontes = sourcesList(sources);
  const text = template.trim() ? template.replace(/\{fontes\}/g, () => fontes).replace(/\{capitulos\}/g, () => chapters)
    : [summary, chapters, fontes && `Fontes:\n${fontes}`].filter(Boolean).join('\n\n');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

// Um bloco por quebra de chunks(words, 44) de cada frase falada.
export function srtFrom(timing) {
  const ts = t => { const ms = Math.round(t * 1000); return `${two(Math.floor(ms / 36e5))}:${two(Math.floor(ms / 6e4) % 60)}:${two(Math.floor(ms / 1e3) % 60)},${String(ms % 1000).padStart(3, '0')}`; };
  const blocks = timing.shots.flatMap(sh => sh.speech.flatMap(sent => chunks(wordTimes(sent), 44)));
  return blocks.map((b, i) => `${i + 1}\n${ts(b.start)} --> ${ts(b.end)}\n${b.words.map(w => w.w).join(' ')}\n`).join('\n');
}

// shots: [{ id, chapter, text }]. Tudo que veio de terceiros (tema, fontes, narração, títulos) fica entre <<<DADOS e DADOS>>>.
export function packagingPrompt(template, { theme, lang, shots, templates, competitorTitles, sources }) {
  const vals = {
    tema: oneLine(theme ?? ''),
    planos: shots.map(s => `${s.id} | ${oneLine(s.chapter)} | ${oneLine(s.text).slice(0, 100)}`).join('\n'),
    fontes: sources.map(s => `- ${oneLine(s.title)}`).join('\n'),
    concorrentes: competitorTitles.slice(0, 40).map(t => `- ${oneLine(t)}`).join('\n'),
    moldes: templates.length ? templates.map(t => `- ${oneLine(t)}`).join('\n') : '(nenhum: use "molde": null)',
    idioma: lang === 'en' ? 'inglês' : 'português do Brasil',
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vals)) throw new Error(`Placeholder desconhecido: ${k}`);
    return vals[k];
  });
}

// shots: ids dos planos do episódio. Título igual a um de concorrente (sem acento e caixa) é cópia.
export function validatePackaging(o, { shots, templates, competitorTitles }) {
  const str = (s, n) => typeof s === 'string' && s.trim() && s.length <= n;
  const arr = (a, min, max) => Array.isArray(a) && a.length >= min && a.length <= max;
  const ok = o && typeof o === 'object'
    && arr(o.titulos, 15, 15) && o.titulos.every(t => t && str(t.titulo, 100) && (t.molde == null || templates.includes(t.molde)) && str(t.porque, 200))
    && arr(o.thumbs, 5, 5) && o.thumbs.every(t => t && shots.includes(t.plano) && str(t.texto, 28) && t.texto.trim().split(/\s+/).length <= 4
      && /^#[0-9a-fA-F]{6}$/.test(t.cor) && str(t.composicao, 200) && str(t.porque, 200))
    && arr(o.tags, 5, 15) && o.tags.every(t => str(t, 30));
  if (!ok) throw new Error(BAD_FORMAT);
  const seen = new Set(competitorTitles.map(norm));
  if (o.titulos.some(t => seen.has(norm(t.titulo)))) throw new Error('Embalagem copiou um título');
  return {
    titulos: o.titulos.map(t => ({ titulo: t.titulo.trim(), molde: t.molde ?? null, porque: t.porque })),
    thumbs: o.thumbs.map(t => ({ plano: t.plano, texto: t.texto.trim(), cor: t.cor, composicao: t.composicao, porque: t.porque })),
    tags: o.tags.map(t => t.trim()),
  };
}

export const thumbFont = style => `assets/fonts/${style === 'pixel' ? 'PressStart2P-Regular' : 'AtkinsonHyperlegible-Bold'}.ttf`;

// Still 1280x720 com o texto no terço inferior: altura de 12% da imagem, borda preta de 6 px, na cor do conceito.
// Texto largo demais (a Press Start 2P é quadrada) quebra em duas linhas e, se preciso, encolhe para caber em 1160 px.
export function thumbArgs({ still, text, color, font, out }) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('Cor inválida');
  const k = font.includes('PressStart') ? 1 : .7, full = Math.round(720 * .12), ws = text.trim().split(/\s+/);
  let lines = [ws.join(' ')];
  if (lines[0].length * k * full > 1160 && ws.length > 1) {
    const cuts = ws.slice(1).map((_, i) => [ws.slice(0, i + 1).join(' '), ws.slice(i + 1).join(' ')]);
    lines = cuts.reduce((a, b) => Math.max(...b.map(l => l.length)) < Math.max(...a.map(l => l.length)) ? b : a);
  }
  const size = Math.min(full, Math.floor(1160 / (Math.max(...lines.map(l => l.length)) * k)));
  const esc = s => s.replace(/\\/g, ' ').replace(/'/g, '’').replace(/:/g, '\\:').replace(/%/g, '\\\\%'); // ' fecharia a aspa; % precisa de \\ (o filtro tira uma barra, o drawtext lê a outra)
  // uma drawtext por linha (a quebra de linha do drawtext desenha um glifo faltando); bloco centrado no terço inferior (y de 480 a 720)
  const lh = Math.round(size * 1.2), draw = (l, i) => `drawtext=fontfile=${font.replace(/:/g, '\\:')}:text='${esc(l)}':fontcolor=0x${color.slice(1)}:fontsize=${size}:borderw=6:bordercolor=black:x=(w-text_w)/2:y=${Math.round(480 + (240 - lines.length * lh) / 2 + i * lh)}`;
  const vf = ['scale=1280:720', ...lines.map(draw)].join(',');
  return ['-y', '-v', 'error', '-i', still, '-vf', vf, '-frames:v', '1', out];
}

// export/ com os 7 arquivos; exportar de novo sobrescreve. video e thumb são caminhos de origem, o resto é texto.
export async function exportPackage(dir, { video, thumb, titulo, descricao, tags, srt, fontes }) {
  const out = join(dir, 'export'), text = { 'titulo.txt': titulo + '\n', 'descricao.txt': descricao + '\n', 'tags.txt': tags.join(', ') + '\n', 'legendas.srt': srt, 'fontes.md': fontes };
  await mkdir(out, { recursive: true });
  await copyFile(video, join(out, 'video.mp4')); await copyFile(thumb, join(out, 'thumb.png')); // falta de arquivo falha antes de gravar os textos
  await Promise.all(Object.entries(text).map(([f, t]) => writeFile(join(out, f), t)));
  return { files: ['video.mp4', ...Object.keys(text), 'thumb.png'] };
}
