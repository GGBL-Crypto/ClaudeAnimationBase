// Rotas da embalagem (fase 6): títulos, thumbnails, tags e descrição pelo Claude; exportar a pasta final.
import { access, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { prodDir, epDir, runCancellable } from './production.mjs';
import { chaptersText, descriptionText, packagingPrompt, validatePackaging, thumbArgs, thumbFont, srtFrom, sourcesList, exportPackage } from './package.mjs';

export default function ({ db, no, fail, readJson, now, outDir, ROOT, prod, step, inject }) {
  const json = async (dir, name, hint) => JSON.parse(await readFile(join(dir, name), 'utf8').catch(() => { throw new Error(hint); }));

  async function build({ report, signal, prod: p, dir }) {
    const ep = await json(dir, 'episode.json', 'Rode a etapa Roteiro'), timing = await json(dir, 'timing.json', 'Rode a etapa Narração');
    const outline = await readFile(join(dir, 'outline.json'), 'utf8').then(JSON.parse, () => null);
    const shots = ep.chapters.flatMap(c => c.shots.map(s => ({ id: s.id, chapter: c.title, text: s.narration ?? '' })));
    for (const s of shots) await access(join(dir, 'cenas', s.id + '.png')).catch(() => { throw new Error('Rode a etapa Cenas'); }); // a thumb sai do still do plano (R2)
    const my = db.myChannel(p.myId), ids = new Set([...my.competitors, my.anchorId].filter(Boolean));
    const rows = db.videoRowsAll(now()).filter(v => v.title && ids.has(v.channelId)).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)), competitorTitles = rows.map(v => v.title);
    const prompt = packagingPrompt(await readFile(join(ROOT, 'prompts', 'embalagem.md'), 'utf8'), { theme: p.theme ?? ep.title, lang: my.lang, shots, templates: my.titleTemplates ?? [], competitorTitles, sources: ep.sources ?? [] });
    report('Pedindo títulos e thumbnails ao Claude', 0, 6);
    let v, feedback = '';
    for (let i = 0; ; i++) { // até 3 tentativas, a segunda em diante com o motivo da rejeição
      const o = await inject.claudeLong(prompt + feedback, { signal });
      try { v = validatePackaging(o, { shots: shots.map(s => s.id), templates: my.titleTemplates ?? [], competitorTitles }); break; }
      catch (e) { if (i === 2) throw e; feedback = `\n\nA resposta anterior foi rejeitada: ${e.message}. Corrija e responda de novo no mesmo formato.`; }
    }
    const run = runCancellable(signal, { spawn: inject.spawnProc }), font = thumbFont(ep.style);
    await mkdir(join(dir, 'thumbs'), { recursive: true });
    for (const [i, t] of v.thumbs.entries()) {
      report(`Thumbnail ${i + 1} de 5`, i + 1, 6);
      await run('ffmpeg', thumbArgs({ still: join(dir, 'cenas', t.plano + '.png'), text: t.texto, color: t.cor, font, out: join(dir, 'thumbs', `thumb-${i + 1}.png`) }));
    }
    const chapters = chaptersText(timing), resumo = (outline?.capitulos ?? []).map(c => c.resumo).filter(Boolean).reduce((a, r) => (a + ' ' + r).length <= 1500 ? (a + ' ' + r).trim() : a, '') || ep.title;
    return {
      titulos: v.titulos, thumbs: v.thumbs.map((t, i) => ({ n: i + 1, ...t })), tags: v.tags,
      descricao: descriptionText({ template: my.descriptionTemplate ?? '', summary: resumo, chapters: chapters.text, sources: ep.sources ?? [] }),
      ...(chapters.warning && { aviso: chapters.warning }),
    };
  }

  return [
    ['POST', /^\/api\/productions\/([^/]+)\/embalagem$/, m => ({ jobId: step(prod(m[1]).id, 'embalagem', build) })],
    ['GET', /^\/api\/productions\/([^/]+)\/embalagem$/, m => { const { status, result, error } = prod(m[1]).steps.embalagem; return { status, result, error }; }],
    // Só com a revisão aprovada. titulo e descrição podem ter sido editados na tela; thumb é o número de 1 a 5.
    ['POST', /^\/api\/productions\/([^/]+)\/embalagem\/exportar$/, async (m, req) => {
      const p = prod(m[1]), b = await readJson(req), e = p.steps.embalagem;
      if (p.steps.revisao.status !== 'done') throw fail(409, 'Aprove a revisão antes de exportar');
      if (e.status !== 'done' || !e.result) throw fail(409, 'Gere a embalagem antes de exportar');
      const titulo = typeof b.titulo === 'string' && b.titulo.trim() && b.titulo.trim().length <= 100 ? b.titulo.trim() : no('Título de 1 a 100 caracteres');
      const n = Number.isInteger(b.thumb) && b.thumb >= 1 && b.thumb <= e.result.thumbs.length ? b.thumb : no('Thumbnail inválida');
      const descricao = b.descricao == null ? e.result.descricao : typeof b.descricao === 'string' && b.descricao.length <= 5000 ? b.descricao : no('Descrição até 5000 caracteres');
      const dir = prodDir(outDir, p.id), ep = await json(dir, 'episode.json', 'Roteiro não encontrado'), timing = await json(dir, 'timing.json', 'Narração não encontrada');
      const { files } = await exportPackage(dir, {
        video: join(epDir(outDir, p.id), 'video.mp4'), thumb: join(dir, 'thumbs', `thumb-${n}.png`), titulo, descricao, tags: e.result.tags,
        srt: srtFrom(timing), fontes: '# Fontes\n\n' + sourcesList(ep.sources ?? []) + '\n',
      }).catch(err => { throw err.code === 'ENOENT' ? fail(409, 'Arquivo da produção não encontrado: refaça o Render ou a Embalagem') : err; });
      return { dir: join(dir, 'export'), files };
    }],
  ];
}
