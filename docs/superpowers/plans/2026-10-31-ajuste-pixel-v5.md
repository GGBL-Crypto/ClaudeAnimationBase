# Ajuste do pixel v5 (enquadramento, deitado, capa, deserto) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o boneco v5 aparecer no vídeo, porque hoje ele fica pequeno nos planos abertos. Também fechar os defeitos que o aceite do v5 apontou: deitado, capa, copa atrás da cabeça e deserto escuro. De quebra, a descrição da embalagem passa a ter resumo próprio.

**Architecture:**
- **Kit** (`src/episode/kit.js`, sem desenho):
  - ganha o enquadramento `close`;
  - passa a afastar as árvores de copa dos atores.
- **Pixel** (`src/styles/pixel/`): corrige o deitado e a capa, e escala os sprites até o `close`.
- **App:** o roteiro pede mais `mid` e `close`, e a descrição aceita `{resumo}`.

**Tech Stack:** a mesma do v5 (Canvas2D, `node:test` com `vm`, Puppeteer-core, FFmpeg).

**Spec:**
- Aceite do v5 em `docs/VALIDATION.md` e `out/check/fig/compare.png`.
- Folha da demo, `out/episodes/demo/video.mp4.review/decoded-sheet.png`.
- Contratos: `src/styles/AGENTS.md` ("Cena K") e `src/styles/pixel/GUIDE.md`.
- Plano anterior: `docs/superpowers/plans/2026-10-30-pixel-figura-v5.md`.

## O que o aceite do v5 apontou

1. Na grade 480×270, o adulto ocupa cerca de 15% da altura do quadro no `wide` (`cam.z` 1). O detalhe novo quase não aparece no vídeo.
2. No `lie`, o rosto fica fraco e o chapéu fica em pé, ou seja, não gira com a cabeça.
3. A capa aparece como uma cunha amarela.
4. A copa de uma árvore `broad` da camada de f ≥ .45 fica atrás da cabeça e confunde a silhueta.
5. O deserto de dia sai escuro e apagado (plano `s5` da demo). O defeito já existia antes do v5.
6. **Fase 6:** a descrição exportada usa o molde do perfil ao pé da letra. O molde de um canal de Roma escreveu "Uma história da Roma antiga" num vídeo sobre o Bismarck.

## Decisões

1. **Enquadramento `close`:** `FRAMINGS = ['wide', 'mid', 'close']`.
   - `camOf` com `close`: `z: 1.8` e `cy` tal que o chão fique a 85% da altura da tela, ou seja, `cy = g(960) − (.85·1080 − 540)/1.8`. Conta: `(g − cy)·z + 540 = .85·1080`.
   - O `wide` e o `mid` não mudam.
   - Todas as cenas de exterior aceitam `close`. `interior-vela` aceita `close` com o mesmo cálculo pelo chão do interior. `mapa` ignora o enquadramento, como hoje.
   - O `KIT_CATALOG.framings` já é lido pelo app, então o `close` aparece sozinho no roteiro.
2. **Árvores longe dos atores:** nas camadas de `treeline` com f ≥ .45, nenhuma árvore `broad` com `|x − spot.x| < 140` px do mundo. Ela é empurrada para fora da faixa, com o mesmo `inGap` do primeiro plano. Os pinheiros não mudam, porque a silhueta fina não confunde.
3. **Sprites até o `close`:** a regra de escala de `scaleRows` (decisão 6 do v5) cobre `k` até `1.8 / 1.25 = 1.44`. Confira que o cabelo de mechas continua limpo nessa escala. Se não estiver, use mapas desenhados em 2× para `k > 1.3`.
4. **Deitado:**
   - Chapéu, capacete e capuz entram na grade do boneco antes do giro de 90°, porque hoje são desenhados depois.
   - O rosto deitado usa o olho `blink` (fechado) quando a ação é `lie`. Deitado = descansando ou ferido, e um olho aberto de lado lê mal.
   - A bochecha `blush` sai.
5. **Capa:**
   - Polígono de tecido dos ombros ao meio da canela, com 2 dobras verticais no tom 1 e a barra no tom 0.
   - A borda balança pelo `sway` (decisão 13 do v5).
   - **Cor:** `accent` do elenco. Sem `accent`, a família `red`, nunca `yellow`. A cunha amarela vinha do padrão.
6. **Deserto:** primeiro a causa, com `superpowers:systematic-debugging`: rampa do `mood` `day`, névoa, `lightPass` ou a camada `dunes`. Conserte a causa, não ponha um clarão por cima. Confira também no `flat` e no `watercolor` se o defeito existe lá; se existir, o conserto vale para o kit inteiro.
7. **Roteiro:** `prompts/roteiro-capitulo.md` passa a pedir pelo menos 1 plano `mid` ou `close` a cada 3, e `close` quando a narração fala de uma pessoa. Fica só no prompt, sem validação nova.
8. **Descrição:**
   - O molde aceita `{resumo}`, que vira o resumo do esboço.
   - Sem `{resumo}` no molde, a descrição começa com o resumo e depois o molde.
   - Assim o texto fixo de um canal nunca é a única descrição do vídeo.

## Global Constraints

- As regras do `CLAUDE.md` continuam valendo:
  - função pura de `t`, sem `Math.random()`, relógio ou estado entre quadros;
  - `src/episode/kit.js` e `src/nature/` não desenham;
  - no `pixel`, só cores da paleta.
- O quadro K continua periódico em L. Sem dependências npm novas. Só personagens originais.
- Validação de cada tarefa de estilo:
  - `npm test`;
  - `npm run test:visual`;
  - `node scripts/check-motion.mjs --project=smoke-kit --2d --style=<id>` com 0 violações;
  - folhas ampliadas abertas com Read pelo implementador e pelo revisor.
- `out/`, `data/` e `src/episodes.js` ficam fora do git.
- Commits em inglês, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Um escritor por arquivo em cada onda. Os 476 testes atuais continuam passando.

## Review Focus

1. **`close` com ator andando:** quem anda atravessa a tela inteira no `close` e não pode sumir por mais de metade do loop. O plano de `walk` em `close` continua legível. Teste `close framing keeps a walker on screen half the loop` na Task 1.
2. **`close` no `flat` e no `watercolor`:** a cabeça escalada e os adereços de primeiro plano não estouram. Folha nas Tasks 1 e 2.
3. **`lie` em todos os corpos e com cada gear de cabeça:** o chapéu deita junto. Folha `--loop=cast` na Task 2.
4. **Árvore empurrada para fora da tela** quando todas as faixas livres são estreitas: fica na borda, sem sumir nem sobrepor. Teste `broad trees keep clear of actor spots` na Task 1.
5. **Molde de descrição com `{resumo}` duas vezes, ou sem nenhum marcador:** sem repetição e sem perder o resumo. Teste na Task 3.

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1 Kit: `close` e árvores | opus | medium |
| 2 Pixel: deitado, capa, `close` e deserto | opus | high |
| 3 App: prompt e descrição | sonnet | high |
| 4 Aceite | sessão principal | — |

## Ondas

- A: Task 1.
- B: Tasks 2 e 3 em paralelo, com arquivos distintos.
- C: Task 4.

---

### Task 1: Kit: enquadramento `close` e árvores longe dos atores

**Files:**
- Modify:
  - `src/episode/kit.js`;
  - `fixtures/smoke/kit.js`: o plano de `cidade-antiga` passa a `close` e o `LOOPS.cast` ganha um plano `close`;
  - `src/styles/AGENTS.md`: `close` e a regra das árvores.
- Test: `tests/episode-kit.test.mjs`

**Interfaces:**
- Produces: `params.framing: 'wide' | 'mid' | 'close'`, `cam` do `close` (decisão 1) e as árvores `broad` fora das faixas dos atores (decisão 2).

- [ ] **Step 1: Write failing tests:**

```js
test('close framing puts the ground at 85% and zooms 1.8', () => {
  const F = kitFrame({ scene: 'campo', params: { ...P, framing: 'close' } }, 1, 12), g = F.world.ground(960);
  assert.equal(F.cam.z, 1.8); assert.ok(Math.abs((g - F.cam.cy) * F.cam.z + 540 - .85 * 1080) < 2);
});
test('close framing keeps a walker on screen half the loop', () => {
  let on = 0;
  for (let i = 0; i < 48; i++) {
    const F = kitFrame({ scene: 'campo', params: { ...P, framing: 'close' }, cast: [{ id: 'a', body: 'adult' }], actors: [{ cast: 'a', action: 'walk', dir: 1 }] }, i / 4, 12);
    const x = (F.actors[0].pose.joints.pelvis[0] - F.cam.cx) * F.cam.z + 960; if (x > 0 && x < 1920) on++;
  }
  assert.ok(on >= 24, `na tela em ${on} de 48`);
});
test('broad trees keep clear of actor spots', () => {
  for (const id of ['campo', 'floresta', 'cidade-antiga']) for (const seed of [1, 2, 3, 4, 5]) {
    const k = kitFrame({ scene: id, params: { ...P, seed } }, 1, 12).world.kit, spots = KIT_SCENES[id].build({ ...KIT_DEFAULTS, ...P, seed }, 0, 12).spots;
    for (const l of k.layers.filter(l => l.kind === 'treeline' && l.f >= .45)) for (const t of l.trees.filter(t => t.kind === 'broad'))
      for (const sp of spots) assert.ok(Math.abs(t.x - sp.x) >= 140, `${id}/${seed}: copa em ${t.x} perto do ator em ${sp.x}`);
  }
});
```

  Estenda também o teste de periodicidade para `framing: 'close'`.

  Ajuste os nomes dos campos (`t.kind`, `t.x`, `KIT_DEFAULTS`) ao que o arquivo já usa.
- [ ] **Step 2: Run** `node --test tests/episode-kit.test.mjs`. Expected: FAIL nos novos.
- [ ] **Step 3: Implement** as decisões 1 e 2.
  - Se o `walk` no `close` sair da tela por mais de metade do loop, encurte o trajeto do `walk` só no `close`: de `lerp(-200, 2120)` para a faixa visível com a câmera do `close`. Registre no `AGENTS.md`.
- [ ] **Step 4: Run** os testes (PASS), `npm test`, e `check-motion` em `debug`, `flat`, `watercolor` e `pixel` (0 violações).
- [ ] **Step 5: Look:** `node render.mjs --project=smoke-kit --style=debug --stills=5.5 --out=out/check/ajuste/close-debug` e o mesmo still em `flat` e `watercolor`, abertos. Expected: chão a 85%, ator grande e inteiro, sem adereço estourando.
- [ ] **Step 6: Commit** `feat: kit close framing and broad trees clear of actors`.

### Task 2: Pixel: deitado, capa, `close` e deserto

**Files:**
- Modify: `src/styles/pixel/draw.js`, `src/styles/pixel/sprites.js` (só se a decisão 3 pedir mapas em 2×), `src/styles/pixel/GUIDE.md`
- Test: `tests/pixel-doll.test.mjs`

**Interfaces:**
- Consumes: o `close` da Task 1.
- Produces: as decisões 3 a 6 no `pixel`.

- [ ] **Step 1: Write failing tests:**
  - `cape defaults to the red family`: o `figureOf` de um ator com `gear: ['cape']` e sem `accent` só usa tons de `red` na capa;
  - `lying hat rotates with the head`: no `lie`, os pixels do chapéu ficam à esquerda ou à direita da cabeça, não acima dela.

  Se medir o chapéu no `figureOf` não for limpo, use a folha do Step 4 e registre no `GUIDE.md`.
- [ ] **Step 2: Run** `node --test tests/pixel-doll.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement:**
  - decisões 3, 4 e 5;
  - para o deserto (decisão 6), ache a causa antes, com o `superpowers:systematic-debugging`:
    1. render do plano `s5` da demo em `pixel`, `flat` e `watercolor`;
    2. compare;
    3. conserte onde está a causa. Se a causa for o kit (`src/episode/kit.js`), **pare e reporte**, porque a Task 1 é dona dele nesta onda.
- [ ] **Step 4: Render and look:**
  - `--loop=cast` (com o plano `close` da Task 1);
  - recortes ampliados 4× do `lie` com chapéu, capacete e capuz, da capa andando e do adulto no `close`;
  - o deserto de dia nos 3 estilos.

  Expected:
  - chapéu deitado junto, olho fechado;
  - capa de tecido com dobras, em vermelho;
  - mechas limpas no `close`;
  - deserto claro, quente e legível.
- [ ] **Step 5: Run:**
  - `node --test tests/pixel-doll.test.mjs` (PASS);
  - `npm test`;
  - `npm run test:visual`;
  - `check-motion` (0 violações).
- [ ] **Step 6: Commit** `fix: pixel lying gear, cloth cape, close-up sprites and desert light`.

### Task 3: App: prompt do roteiro e descrição com resumo

**Files:**
- Modify: `prompts/roteiro-capitulo.md`, `scripts/app/package.mjs`, `app/views/mychannels.js` (dica do marcador `{resumo}` no campo do molde)
- Test: `tests/app-package.test.mjs`

**Interfaces:**
- Produces: `descriptionText({ template, summary, chapters, sources })` com o marcador `{resumo}` (decisão 8). A assinatura não muda.

- [ ] **Step 1: Write failing tests:**

```js
test('description uses {resumo} or prepends the summary', () => {
  const base = { summary: 'Resumo do vídeo.', chapters: '0:00 A', sources: [{ title: 'T', url: 'https://x', accessed: '2026-10-31' }] };
  assert.match(descriptionText({ ...base, template: '{resumo}\n\n{capitulos}' }), /^Resumo do vídeo\./);
  const t = descriptionText({ ...base, template: 'Canal de história.\n{capitulos}' });
  assert.ok(t.startsWith('Resumo do vídeo.') && t.includes('Canal de história.'));
  assert.equal(descriptionText({ ...base, template: '{resumo} {resumo}' }).split('Resumo do vídeo.').length, 3);
});
```

  O último caso confirma que dois marcadores escritos pelo usuário viram duas cópias, sem invenção.
- [ ] **Step 2: Run** `node --test tests/app-package.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** a decisão 8, a dica na tela de Meus canais e a decisão 7 no prompt.
- [ ] **Step 4: Run** `node --test tests/app-package.test.mjs tests/app-roteiro.test.mjs` (PASS) e `npm test`.
- [ ] **Step 5: Commit** `fix: description summary marker and closer shots in script prompt`.

### Task 4: Aceite

**Files:** `docs/VALIDATION.md` (uma entrada curta)

- [ ] **Step 1:**
  - Na `fixtures/episodes/demo`, troque 2 planos por `close` (um com `talk`, outro com `cheer`) e 1 por `mid`.
  - `node scripts/episode.mjs fixtures/episodes/demo`.
  - `verify-video` aprovado e `decoded-sheet.png` aberto.
- [ ] **Step 2:**
  - Meça a altura do adulto em pé, em % da altura do quadro, no `wide`, no `mid` e no `close`.
  - Expected: `close` ≥ 25%.
  - Monte `out/check/ajuste/compare.png`: os 3 enquadramentos, o `lie`, a capa e o deserto, antes e depois.
- [ ] **Step 3:**
  - `npm test` e `npm run test:visual`. Expected: PASS.
  - `git status --porcelain data/ out/ src/episodes.js`. Expected: vazio.
  - Registre em `docs/VALIDATION.md`.
  - Commit `docs: pixel v5 tune-up acceptance`.
