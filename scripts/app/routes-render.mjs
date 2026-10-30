// Rotas de narração, cenas, render e revisão (fase 6, Task 5).
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { kitCatalog } from '../episode-lib.mjs';
import { prodDir, invalidateAfter } from './production.mjs';
import { narrationStep, scenesStep, renderStep, swapScene } from './render-steps.mjs';

const P = s => new RegExp(`^/api/productions/([^/]+)/${s}$`);

export default function ({ db, no, nf, fail, readJson, outDir, prod, active, step, inject }) {
  const go = (name, fn) => m => ({ jobId: step(prod(m[1]).id, name, x => fn({ ...x, inject })) });
  const idle = p => { if (Object.keys(active(p.id)).length) throw fail(409, 'Produção com etapa em andamento'); return p; };
  const epFile = p => join(prodDir(outDir, p.id), 'episode.json');
  const episode = p => readFile(epFile(p), 'utf8').then(JSON.parse, () => nf('Sem episode.json: termine o roteiro'));
  // Marca stale as etapas done depois de `after`, como o runStep faz ao refazer.
  const stale = (id, after) => { const st = db.production(id).steps; for (const [k, v] of Object.entries(invalidateAfter(st, after))) if (v !== st[k]) db.setStep(id, k, { status: 'stale' }); };
  const out = id => ({ ...db.production(id), active: active(id) });
  return [
    ['POST', P('narracao'), go('narracao', narrationStep)],
    ['POST', P('cenas'), go('cenas', scenesStep)],
    // O render usa o projeto do último build (src/episodes.js): ctx.step exige as cenas feitas.
    ['POST', P('render'), go('render', renderStep)],
    // Planos para a folha de contato e o formulário de troca: cena, atores e narração; elenco e catálogo do estilo.
    ['GET', P('cenas'), async m => {
      const ep = await episode(prod(m[1]));
      return { shots: ep.chapters.flatMap(c => c.shots.map(s => ({ id: s.id, chapter: c.title, narration: s.narration ?? null, scene: s.scene, actors: s.actors ?? [] }))),
        cast: (ep.cast ?? []).map(c => c.id), catalog: kitCatalog(ep.style) };
    }],
    // Trocar a cena: o texto não muda, então narracao fica done; cenas e o que vem depois ficam stale.
    ['POST', P('cenas/trocar'), async (m, req) => {
      const p = idle(prod(m[1])), { shot, ...patch } = await readJson(req), ep = await episode(p);
      let next; try { next = swapScene(ep, shot, patch, kitCatalog(ep.style)); } catch (e) { no(e.message); }
      await writeFile(epFile(p), JSON.stringify(next, null, 2) + '\n');
      stale(p.id, 'narracao');
      return out(p.id);
    }],
    ['POST', P('revisao'), async (m, req) => {
      const p = idle(prod(m[1]));
      if ((await readJson(req)).aprovado !== true) no('Envie aprovado: true');
      if (p.steps.render.status !== 'done') no('Render ainda não terminou');
      const t = new Date().toISOString();
      db.setStep(p.id, 'revisao', { status: 'done', startedAt: t, finishedAt: t, ms: 0, result: { aprovado: true }, error: null });
      return out(p.id);
    }],
    // Trocar plano: a revisão volta a pendente (a embalagem feita fica stale) e a tela vai para as cenas.
    ['POST', P('revisao/voltar'), m => {
      const p = idle(prod(m[1]));
      stale(p.id, 'revisao');
      db.setStep(p.id, 'revisao', { status: 'pending', startedAt: null, finishedAt: null, ms: null, result: null, error: null });
      return out(p.id);
    }],
  ];
}
