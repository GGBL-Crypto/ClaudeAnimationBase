// Rotas da pauta e das fontes (fase 6): tema, duração e estilo; busca na Wikipedia e gravação de sources.json.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { prodDir, runStep } from './production.mjs';
import { styleNames } from './profiles.mjs';
import { validatePauta } from './routes-production.mjs';
import { suggestThemes } from './pauta.mjs';
import { wikiSearch, wikiText, validateLink } from './wikipedia.mjs';

const MAX_SOURCES = 12;

export default function ({ db, cfg, now, no, nf, fail, readJson, prod, active, step, outDir, inject }) {
  const my = p => db.myChannel(p.myId) ?? nf('Canal próprio não encontrado');
  const busy = id => { if (Object.keys(active(id)).length) throw fail(409, 'Produção com etapa em andamento'); };
  return [
    ['GET', /^\/api\/productions\/([^/]+)\/pauta$/, m => {
      const p = prod(m[1]), c = my(p), ids = new Set(c.competitors);
      const suggestions = suggestThemes({ my: c, competitorRows: db.videoRowsAll(now()).filter(v => ids.has(v.channelId)), model: c.modelId == null ? null : db.model(c.modelId), cfg: cfg(), now: now() });
      return { theme: p.theme, targetMin: p.targetMin, toleranceMin: p.toleranceMin, style: p.style, lang: c.lang, styles: styleNames(), suggestions };
    }],
    // Gravar a pauta é rápido e local: roda runStep direto (sem job) para marcar a etapa e invalidar as seguintes.
    ['POST', /^\/api\/productions\/([^/]+)\/pauta$/, async (m, req) => {
      const p = prod(m[1]), c = my(p), b = await readJson(req);
      const x = validatePauta(b, p, no); if (!x.theme) no('Tema de 3 a 200 caracteres');
      busy(p.id);
      await runStep({ db, id: p.id, step: 'pauta' }, async () => {
        db.updateProduction(p.id, x);
        const dir = prodDir(outDir, p.id); await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'production.json'), JSON.stringify({ ...x, lang: c.lang }, null, 2));
        return x;
      });
      return { ...db.production(p.id), active: {} };
    }],
    ['GET', /^\/api\/wiki\/search$/, (m, req, res, u) => {
      const q = (u.searchParams.get('q') ?? '').trim();
      if (!q || q.length > 200) no('Busca de 1 a 200 caracteres');
      return wikiSearch(u.searchParams.get('lang'), q, { fetch: inject.fetch });
    }],
    // Wikipedia: o app baixa o texto agora (job); link colado: só o que o usuário colou. Grava tudo ou nada.
    ['POST', /^\/api\/productions\/([^/]+)\/fontes$/, async (m, req) => {
      const p = prod(m[1]), c = my(p), { fontes } = await readJson(req), t = now();
      if (!Array.isArray(fontes) || fontes.length < 1 || fontes.length > MAX_SOURCES) no('De 1 a 12 fontes');
      const items = fontes.map(f => f?.kind === 'wikipedia' ? (typeof f.title === 'string' && f.title.trim() && f.title.length <= 200 ? { wiki: f.title.trim() } : no('Título da Wikipedia de 1 a 200 caracteres'))
        : f?.kind === 'link' ? { source: validateLink(f, t) } : no('Fonte deve ser wikipedia ou link'));
      return { jobId: step(p.id, 'fontes', async ({ report, signal, dir }) => {
        const sources = [];
        for (const [i, it] of items.entries()) {
          report(it.wiki ? `Baixando ${it.wiki}` : 'Conferindo links', i, items.length);
          sources.push(it.source ?? await wikiText(c.lang, it.wiki, { fetch: inject.fetch, now, signal }));
        }
        await writeFile(join(dir, 'sources.json'), JSON.stringify(sources, null, 2));
        return { count: sources.length, sources: sources.map(({ text, ...s }) => ({ ...s, chars: text.length })) }; // o texto fica só no sources.json
      }) };
    }],
  ];
}
