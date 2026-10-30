// Rotas da análise de roteiro de outlier (fase 6): candidatos, resultados e o job legenda -> Claude -> banco.
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { suggestThemes } from './pauta.mjs';
import { ytdlpArgs, vttToText, analysisPrompt, validateScriptAnalysis } from './subs.mjs';

const ID = /^[A-Za-z0-9_-]{11}$/;

export default function ({ db, cfg, now, no, nf, readJson, prod, step, inject, ROOT }) {
  const title = id => db.video(id, now())?.title ?? null;
  // Etapa já com a lista; a análise de cada vídeo vem do banco. Sem análise gravada = "Vídeo sem legenda".
  const resultados = p => (p.steps.analise.result?.videoIds ?? []).map(videoId => ({ videoId, title: title(videoId), output: db.scriptAnalysis(videoId)?.output ?? null }));

  // Um vídeo: legenda -> texto -> Claude -> grava. Sem legenda: nada grava (a tela mostra "Vídeo sem legenda"). Já analisado não baixa de novo.
  async function analyze(id, { lang, dir, signal, template }) {
    if (db.scriptAnalysis(id)) return;
    await inject.ytdlp(ytdlpArgs(id, lang, dir), { signal });
    const files = (await readdir(dir)).filter(f => f.startsWith(id + '.') && f.endsWith('.vtt')).sort();
    const file = files.find(f => f === `${id}.${lang}.vtt`) ?? files[0];
    const transcript = file ? vttToText(await readFile(join(dir, file), 'utf8')) : '';
    if (!transcript) return;
    const out = await inject.claudeLong(analysisPrompt(template, { video: { title: title(id) ?? '' }, transcript }), { signal });
    db.saveScriptAnalysis(id, { lang, output: validateScriptAnalysis(out, transcript) });
  }

  return [
    // Outliers da pauta (os mesmos de suggestThemes) com a marca de já analisado.
    ['GET', /^\/api\/productions\/([^/]+)\/analise$/, m => {
      const p = prod(m[1]), my = db.myChannel(p.myId), t = now(), comp = new Set(my.competitors);
      const rows = db.videoRowsAll(t).filter(v => comp.has(v.channelId)), by = new Map(rows.map(v => [v.id, v]));
      return suggestThemes({ my, competitorRows: rows, model: my.modelId == null ? null : db.model(my.modelId), cfg: cfg(), now: t })
        .filter(s => s.origem === 'outlier')
        .map(({ tema, ref }) => ({ videoId: ref.videoId, title: tema, channelTitle: by.get(ref.videoId)?.channelTitle ?? null, views: ref.views, multiple: ref.multiple, capturedAt: ref.capturedAt, analisado: !!db.scriptAnalysis(ref.videoId) }));
    }],
    ['GET', /^\/api\/productions\/([^/]+)\/analise\/resultados$/, m => resultados(prod(m[1]))],
    // videoIds vazio = pular a etapa (0 a 3 análises entram no roteiro).
    ['POST', /^\/api\/productions\/([^/]+)\/analise$/, async (m, req) => {
      const p = prod(m[1]), { videoIds: ids } = await readJson(req);
      if (!Array.isArray(ids) || ids.length > 3 || !ids.every(i => typeof i === 'string' && ID.test(i)) || new Set(ids).size !== ids.length) no('Até 3 vídeos válidos');
      if (ids.some(i => title(i) == null)) nf('Vídeo não encontrado');
      const lang = db.myChannel(p.myId).lang;
      const jobId = step(p.id, 'analise', async ({ report, signal, dir }) => {
        const sub = join(dir, 'legendas'), template = await readFile(join(ROOT, 'prompts', 'analise-roteiro.md'), 'utf8');
        await mkdir(sub, { recursive: true });
        for (const [i, id] of ids.entries()) { report(`Vídeo ${i + 1} de ${ids.length}`, i, ids.length); await analyze(id, { lang, dir: sub, signal, template }); }
        return { videoIds: ids };
      });
      return { jobId };
    }],
  ];
}
