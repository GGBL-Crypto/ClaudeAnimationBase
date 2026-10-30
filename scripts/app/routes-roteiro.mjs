// Rotas do roteiro (fase 6): esboço e capítulos pelo Claude a partir das fontes numeradas; refazer um capítulo; editar a narração de um plano.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { kitCatalog, validateEpisode } from '../episode-lib.mjs';
import { oneLine } from './llm.mjs';
import { prodDir, invalidateAfter } from './production.mjs';
import { wordBudget, sourceNumbers, outlinePrompt, validateOutline, chapterPrompt, validateChapter, checkNarration, buildEpisode, roteiroResult, writeRoteiro } from './roteiro.mjs';

const BAD_JSON = 'Resposta do Claude não é JSON válido', NEED = 'Gere o roteiro antes';

export default function ({ db, cfg, no, nf, fail, readJson, prod, active, step, outDir, ROOT, inject }) {
  const json = (dir, name, hint) => readFile(join(dir, name), 'utf8').then(JSON.parse, () => { throw fail(409, hint); });
  const template = name => readFile(join(ROOT, 'prompts', name), 'utf8');
  // As citações [n] do episode.json valem para as fontes com que foi gerado; fontes trocadas pedem roteiro novo.
  const sameSources = (ep, sources) => { if (JSON.stringify(ep.sources) !== JSON.stringify(sources.map(({ text, ...s }) => s))) throw fail(409, 'Fontes mudaram: gere o roteiro de novo'); };

  // Tudo que o roteiro usa: fontes, perfil, meta de palavras, catálogo do estilo e os padrões de outlier (0 a 3).
  async function inputs(p, dir) {
    if (!p.theme) throw fail(409, 'Defina o tema na Pauta');
    const sources = await json(dir, 'sources.json', 'Rode a etapa Fontes'), my = db.myChannel(p.myId) ?? nf('Canal próprio não encontrado');
    return {
      p, my, sources, theme: p.theme, lang: my.lang, targetMin: p.targetMin, catalog: kitCatalog(p.style), numbers: sourceNumbers(sources),
      budget: wordBudget({ targetMin: p.targetMin, toleranceMin: p.toleranceMin, wpm: cfg().voiceWpm?.[`${my.voice}|${my.speed}`] }),
      analyses: (p.steps.analise.result?.videoIds ?? []).map(v => db.scriptAnalysis(v)?.output).filter(Boolean),
    };
  }

  // Até 3 perguntas ao Claude; a 2ª e a 3ª levam o motivo da rejeição. JSON quebrado também é refeito; cancelar e timeout não.
  async function ask(prompt, check, signal) {
    let feedback = '';
    const again = e => `\n\nA resposta anterior foi rejeitada: ${oneLine(e.message)}. Corrija e responda de novo no mesmo formato.`;
    for (let i = 0; ; i++) {
      let o;
      try { o = await inject.claudeLong(prompt + feedback, { signal }); } catch (e) { if (e.message !== BAD_JSON || i === 2) throw e; feedback = again(e); continue; }
      try { return check(o); } catch (e) { if (i === 2) throw e; feedback = again(e); }
    }
  }

  // Capítulo i: catálogo e fontes pelo validateChapter; o resto das regras do kit pelo validateEpisode de um episódio só com ele.
  async function chapter(c, outline, i, prev, signal) {
    const cap = outline.capitulos[i], N = outline.capitulos.length;
    const prompt = chapterPrompt(await template('roteiro-capitulo.md'), { ...c, outline, index: i, prev });
    try {
      return await ask(prompt, o => {
        const shots = validateChapter(o, { catalog: c.catalog, cast: outline.elenco.map(m => m.id), nSources: c.sources.length, words: cap.palavras, wpm: c.budget.wpm, numbers: c.numbers });
        validateEpisode(buildEpisode({ id: c.p.id, outline: { ...outline, capitulos: [cap] }, chapters: [shots], sources: c.sources, profile: c.my, style: c.p.style }));
        return shots;
      }, signal);
    } catch (e) { throw signal?.aborted ? e : new Error(`Capítulo ${i + 1} de ${N} (${cap.titulo}): ${e.message}`); }
  }

  async function save(dir, c, outline, chapters) {
    const episode = buildEpisode({ id: c.p.id, outline, chapters, sources: c.sources, profile: c.my, style: c.p.style, targetMin: c.targetMin });
    const result = roteiroResult(episode, outline, c.budget);
    await writeRoteiro(dir, { outline, episode, sources: c.sources });
    return result;
  }

  async function generate({ report, signal, prod: p, dir }) {
    const c = await inputs(p, dir);
    report('Esboço do roteiro', 0, 1);
    const outline = await ask(outlinePrompt(await template('roteiro-esboco.md'), c), o => validateOutline(o, c), signal)
      .catch(e => { throw signal?.aborted ? e : new Error('Esboço: ' + e.message); });
    const N = outline.capitulos.length, chapters = [];
    for (let i = 0; i < N; i++) {
      report(`Capítulo ${i + 1} de ${N}`, i, N);
      chapters.push(await chapter(c, outline, i, chapters[i - 1]?.at(-1)?.narration, signal));
    }
    return save(dir, c, outline, chapters);
  }

  return [
    ['POST', /^\/api\/productions\/([^/]+)\/roteiro$/, m => ({ jobId: step(prod(m[1]).id, 'roteiro', generate) })],
    ['GET', /^\/api\/productions\/([^/]+)\/roteiro$/, async m => {
      const p = prod(m[1]), { status, result, error } = p.steps.roteiro, dir = prodDir(outDir, p.id);
      const [episode, outline] = await Promise.all(['episode.json', 'outline.json'].map(f => readFile(join(dir, f), 'utf8').then(JSON.parse, () => null)));
      // Refazer capítulo que falhou ou foi cancelado zera o result, mas os arquivos continuam válidos: recalcula deles.
      const fromDisk = async () => { try { return roteiroResult(episode, outline, (await inputs(p, dir)).budget); } catch { return null; } };
      return { status, result: result ?? (episode && outline ? await fromDisk() : null), error, episode };
    }],
    // Refaz um capítulo pelo Claude; os outros ficam. Roda como a etapa roteiro (as seguintes ficam desatualizadas).
    ['POST', /^\/api\/productions\/([^/]+)\/roteiro\/capitulo$/, async (m, req) => {
      const p = prod(m[1]), { id } = await readJson(req), dir = prodDir(outDir, p.id);
      if (!(await json(dir, 'outline.json', NEED)).capitulos.some(c => c.id === id)) nf('Capítulo não encontrado');
      sameSources(await json(dir, 'episode.json', NEED), await json(dir, 'sources.json', 'Rode a etapa Fontes'));
      return { jobId: step(p.id, 'roteiro', async ({ report, signal, prod: q }) => {
        const [c, outline, ep] = await Promise.all([inputs(q, dir), json(dir, 'outline.json', NEED), json(dir, 'episode.json', NEED)]);
        const i = outline.capitulos.findIndex(x => x.id === id), chapters = ep.chapters.map(x => x.shots);
        report(`Refazendo o capítulo ${i + 1} de ${chapters.length}`, 0, 1);
        chapters[i] = await chapter(c, outline, i, chapters[i - 1]?.at(-1)?.narration, signal);
        return save(dir, c, outline, chapters);
      }) };
    }],
    // Edita a narração de um plano (com [n]); revalida antes de gravar, então erro de edição não muda a etapa.
    ['POST', /^\/api\/productions\/([^/]+)\/roteiro\/plano$/, async (m, req) => {
      const p = prod(m[1]), b = await readJson(req), dir = prodDir(outDir, p.id);
      if (typeof b.narracao !== 'string' || typeof b.id !== 'string') no('Plano e narração obrigatórios');
      if (Object.keys(active(p.id)).length) throw fail(409, 'Produção com etapa em andamento');
      const [c, outline, ep] = await Promise.all([inputs(p, dir), json(dir, 'outline.json', NEED), json(dir, 'episode.json', NEED)]);
      sameSources(ep, c.sources);
      const shot = ep.chapters.flatMap(x => x.shots).find(s => s.id === b.id) ?? nf('Plano não encontrado');
      try { Object.assign(shot, checkNarration(b.narracao, { nSources: c.sources.length, wpm: c.budget.wpm, numbers: c.numbers })); validateEpisode(ep); }
      catch (e) { no(`Plano ${shot.id}: ${e.message}`); }
      // Grava o resultado sem mexer no tempo da geração; as etapas done seguintes ficam stale, como ao refazer.
      const result = roteiroResult(ep, outline, c.budget);
      await writeRoteiro(dir, { outline, episode: ep, sources: c.sources });
      const st = db.production(p.id).steps;
      for (const [k, v] of Object.entries(invalidateAfter(st, 'roteiro'))) if (v !== st[k]) db.setStep(p.id, k, { status: 'stale' });
      db.setStep(p.id, 'roteiro', { status: 'done', result, error: null });
      return { result };
    }],
  ];
}
