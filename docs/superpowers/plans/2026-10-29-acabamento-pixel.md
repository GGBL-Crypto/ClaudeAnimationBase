# Acabamento visual do kit (pixel primeiro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a distância visual entre o `pixel` da fase 5 e o story do Rhaj, e superá-lo.
- Bonecos com cabeça grande (proporção do story).
- Cenas com primeiro plano cheio.
- Céu noturno composto.
- Nuvens com volume.
- Chão com detalhe.
- Mapa de verdade.
- Legenda e HUD legíveis no celular.

O kit continua um contrato só: o que entra nele, `flat` e `watercolor` também desenham.

**Architecture:**
- **Kit:** ganha tipos de adereço de primeiro plano e o detalhe do mapa, em `src/episode/kit.js`. É dado puro e continua periódico em L.
- **Estilos:** cada um desenha os tipos novos. A cabeça maior é escolha de estilo (`character.headScale` no `config.js`), não muda o esqueleto de `src/nature/`.
- **Texto:** o ASS ganha tamanhos maiores e quebra por largura.
- **Acervo:** ganha a limpeza das entradas órfãs.

**Tech Stack:** a mesma da fase 5 (Canvas2D, Puppeteer-core, FFmpeg com libass, `node:test`).

**Spec:** `docs/superpowers/specs/2026-10-27-webapp-canais-dark-design.md`, seção "Atualização de 29/10/2026". Plano anterior: `docs/superpowers/plans/2026-10-29-webapp-fase5-motor-episodio.md`, com o formato do quadro K na decisão 1. Contratos: `src/styles/AGENTS.md` ("Cena K") e `src/styles/pixel/GUIDE.md`.

Referências visuais:
- `out/check/story/story-1.5.png`;
- `out/check/story/story-7.png`;
- `out/check/story/compare-final.png`, a comparação do fim da fase 5.

Se faltarem, extraia os quadros de `docs/arquivos/video_2026-10-28_22-17-07.mp4` (1,5 s e 7 s) com `ffmpeg -ss <t> -i ... -frames:v 1`.

## O que o aceite da fase 5 apontou (base deste plano)

1. A cena `ceu-noturno` fica vazia: só horizonte e boneco, e o chão ocupa muito espaço sem detalhe. O story tem cerca, pinheiros e casa com janela acesa no primeiro plano.
2. Os bonecos são magros e de cabeça pequena. O story usa a cabeça em cerca de 1/3 da altura, com tronco largo; o pior caso é o idoso olhando para cima.
3. As nuvens são bolhas lisas, sem sombra de pixel embaixo.
4. O mapa tem só blocos lisos: sem pergaminho, mar desenhado, rosa dos ventos ou ícones.
5. A legenda e o HUD estão pequenos para 1080p.
6. O `out/acervo` acumula entradas órfãs de revisões antigas.

## Decisões

1. **Novos tipos em `props` (decisão 1 da fase 5):**
   - `fence {x0, x1, y, h}`;
   - `bush {x, y, s, seed}`;
   - `post {x, y, h}`, poste com lanterna; acende à noite e entra em `lights`;
   - `cart {x, y, s}`;
   - `boat {x, y, s}`, barco na areia;
   - `tuft {x, y, s, seed}`, tufo de capim ou flor, em quantidade.

   Os tipos atuais ficam como estão.
2. **Primeiro plano por cena,** sempre presente, escolhido pela `seed` e sem novo `extras`:
   - `campo`: cerca e tufos;
   - `ceu-noturno`:
     - linha de pinheiros perto (f = .7);
     - casa com 1 a 2 janelas acesas;
     - cerca;
     - tufos;
     - o horizonte desce para que o céu ocupe cerca de 60% da altura;
   - `floresta`: arbustos e tufos;
   - `mar`: barco na areia e pedras;
   - `deserto`: pedras e tufos secos;
   - `cidade-antiga`: postes e carroça;
   - `interior-vela` e `mapa`: sem primeiro plano.

   O primeiro plano não cobre o espaço reservado aos atores (`spots`), com margem de 120 px.
3. **Detalhe do mapa** em `kit.map`, além do que já existe:
   - `waves: [{x, y}]`, de 12 a 20 marcas de onda no mar;
   - `compass {x, y, r}`, num canto livre;
   - `peaks: [{x, y, s}]`, de 3 a 6, e `woods: [{x, y, s}]`, de 3 a 8, dentro das terras;
   - `border: true`, a moldura dupla.

   A rota continua indo e voltando. As marcas de onda oscilam ±4 px com período L.
4. **Cabeça grande por estilo:**
   - `config.character.headScale`: `pixel` 1.7, `flat` 1.25, `watercolor` 1.15.
   - O estilo desenha a cabeça escalada em torno de `headBase`, crescendo para cima, de modo que o pescoço continua ligado. O chapéu, o capuz e o capacete acompanham.
   - No `pixel`, o tronco ganha 1 px de cada lado (`TORSO + 2`), com sombra de 1 px do lado longe da luz.
   - O boneco de pé fica de 30 a 36 px de altura na grade, em enquadramento `wide`.
5. **Nuvens no `pixel`:** base com degrau de pixel. Uma linha de sombra (`cloudDk`) embaixo e uma de luz em cima. Borda serrilhada por `hash` estável, sem disco perfeito. Nas outras horas, a cor vem da rampa do `mood`.
6. **Chão no `pixel`:** de 2 a 3 faixas de tom; pedrinhas e tufos de 1 a 2 px pela `seed`; caminho de terra opcional quando houver ator andando.
7. **Texto (ASS):**
   - Tamanhos:
     - `pixel`: legenda 40, capítulo 64, HUD 30, lugar 34, etiqueta 26;
     - `flat` e `watercolor`: legenda 60, capítulo 96, HUD 46, lugar 48, etiqueta 40.
   - A quebra da legenda passa a ser por largura: no máximo 34 caracteres por bloco no `pixel` e 44 nos outros. Nenhuma palavra é cortada, e uma palavra maior que o limite fica sozinha no bloco.
   - O contorno da legenda no `pixel` passa a 4.
8. **Acervo limpo:**
   - O `index.json` passa a guardar o `sourceHash` de cada entrada.
   - `node scripts/episode.mjs --prune-acervo` apaga as entradas cujo `sourceHash` difere do atual, mais os arquivos de `out/acervo/` que não estão no índice.
   - Imprime quantos arquivos e MB saíram. Não roda sozinho.

## Global Constraints

- As regras do `CLAUDE.md` e da fase 5 continuam valendo:
  - função pura de `t`, sem `Math.random()` nem relógio;
  - `src/episode/kit.js` não desenha;
  - cada desenho fica no seu estilo;
  - no `pixel`, só cores da paleta, com pontilhado ordenado e sem mistura.
- O quadro K continua periódico em L. Todo adereço novo que se mexe usa frequência múltipla inteira de 1/L.
- Sem dependências npm novas. Nada de personagens nem universos de terceiros.
- Validação de cada tarefa de estilo:
  - `npm test`;
  - `npm run test:visual`;
  - `node scripts/check-motion.mjs --project=smoke-kit --2d --style=<id>` com 0 violações;
  - folhas abertas com Read pelo implementador e pelo revisor.
- `out/`, `data/` e `src/episodes.js` ficam fora do git.
- Commits em inglês, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Um escritor por arquivo em cada onda. Os 380 testes atuais continuam passando.

## Review Focus

1. **Primeiro plano tampando o ator ou o HUD:** o ator nos `spots` e a etiqueta acima dele continuam visíveis. Teste na Task 1 (sobreposição com `spots`) e conferência na folha nas Tasks 2 a 4.
2. **Cabeça escalada solta do pescoço,** ou chapéu e capuz desalinhados, nas 5 poses e nos 5 corpos. Ficha `--loop=elenco` nas Tasks 2 a 4.
3. **Emenda do loop** com os adereços e as ondas do mapa novos. Teste de periodicidade na Task 1 e tira da emenda nas Tasks 2 a 4.
4. **Legenda de palavra longa** (por exemplo, "inconstitucionalissimamente"): fica sozinha no bloco, sem corte. Teste na Task 5.
5. **`--prune-acervo` com acervo vazio ou sem `index.json`:** não falha e informa 0. Teste na Task 5.

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1 (kit) | opus | high |
| 2 (pixel) | opus | high |
| 3 (flat) | opus | medium |
| 4 (aquarela) | opus | medium |
| 5 (texto e acervo) | sonnet | high |
| 6 (aceite) | sessão principal | — |

## Ondas

- A: Task 1.
- B: Tasks 2, 3, 4 e 5 em paralelo (arquivos distintos).
- C: Task 6.

---

### Task 1: Kit: primeiro plano, céu noturno e mapa

**Files:**
- Modify: `src/episode/kit.js`, `src/styles/debug/draw.js` (contornos dos tipos novos), `src/styles/AGENTS.md` (os tipos novos na seção "Cena K")
- Test: `tests/episode-kit.test.mjs`

**Interfaces:**
- Produces: os tipos e campos das decisões 1 a 3 no quadro K. Nenhuma função muda de assinatura (`kitFrame`, `KIT_SCENES`, `castActor`).

- [ ] **Step 1: Write failing tests**

```js
test('every exterior scene has a foreground that keeps actor spots clear', () => {
  for (const id of ['campo', 'ceu-noturno', 'floresta', 'mar', 'deserto', 'cidade-antiga']) {
    const F = kitFrame({ scene: id, params: P }, 1, 12), fg = F.world.kit.layers.filter(l => l.kind === 'props' && l.f >= .7).flatMap(l => l.items);
    assert.ok(fg.length >= 2, id);
    const spots = KIT_SCENES[id].build(P, 0, 12).spots.map(sp => sp.x);
    for (const it of fg) for (const x of spots) assert.ok(Math.abs((it.x ?? (it.x0 + it.x1) / 2) - x) > 120 || it.kind === 'tuft', `${id}: ${it.kind} sobre o ator`);
  }
});
test('night sky is composed: near trees, a lit house, sky about 60% of height', () => {
  const k = kitFrame({ scene: 'ceu-noturno', params: P }, 1, 12).world.kit;
  assert.ok(k.layers.some(l => l.kind === 'treeline' && l.f >= .7));
  assert.ok(k.layers.some(l => l.kind === 'buildings' && l.items.some(b => b.windows.some(w => w.lit > .5))));
  const horizon = Math.min(...[0, 480, 960, 1440, 1920].map(x => k.layers.find(l => l.kind === 'ridge').prof(x)));
  assert.ok(horizon > .5 * 1080 && horizon < .7 * 1080);
});
test('map carries waves, compass, peaks and woods', () => {
  const M = kitFrame({ scene: 'mapa', params: { ...P, extras: ['route'] } }, 1, 12).world.kit.map;
  assert.ok(M.waves.length >= 12 && M.compass.r > 0 && M.peaks.length >= 3 && M.woods.length >= 3 && M.border === true);
});
```

`P` e o teste de periodicidade já existem no arquivo. Ele cobre os campos novos sem mudança, porque compara o quadro inteiro.

- [ ] **Step 2: Run** `node --test tests/episode-kit.test.mjs`. Expected: FAIL nos testes novos.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test tests/episode-kit.test.mjs` (PASS, inclusive a periodicidade). Depois rode `node render.mjs --project=smoke-kit --style=debug --storyboard --out=out/check/kit-debug-2.jpg` e abra a folha. Expected: primeiro plano nas 6 cenas de exterior, sem tampar os atores; mapa com os ícones.
- [ ] **Step 5: Run** `node scripts/check-motion.mjs --project=smoke-kit --2d --style=debug` (0 violações) e `npm test` (PASS).
- [ ] **Step 6: Commit** `feat: kit foreground, composed night sky and detailed map`.

### Task 2: Pixel: bonecos, nuvens, chão, primeiro plano e mapa

**Files:**
- Modify: `src/styles/pixel/draw.js`, `src/styles/pixel/config.js` (`character.headScale: 1.7`; novas cores só se o limite de 48 da paleta permitir), `src/styles/pixel/GUIDE.md`

**Interfaces:**
- Consumes: os campos da Task 1.
- Produces: o desenho das decisões 1 a 6 no `pixel`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Render and look:**
  - `node render.mjs --project=smoke-kit --style=pixel --stills=0.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5 --out=out/check/acab-pixel` (PNG sem perdas, uma por cena);
  - `node render.mjs --project=ep-demo --loop=elenco --stills=0.5 --out=out/check/acab-elenco` (depois de `node scripts/build-episode.mjs fixtures/episodes/demo`; o `timing.json` da demo precisa existir);
  - uma folha lado a lado com `ceu-noturno` e `campo` (pôr do sol) contra `story-1.5.png` e `story-7.png`, montada com `ffmpeg -i a -i b -filter_complex hstack`.

  Abra tudo. Expected:
  - cabeça em cerca de 1/3 da altura, pescoço ligado, e o idoso olhando para cima legível;
  - bonecos de 30 a 36 px;
  - nuvens com degrau e sombra;
  - chão com detalhe;
  - céu noturno pelo menos tão cheio quanto o do story;
  - mapa com pergaminho, ondas, rosa dos ventos e ícones;
  - nenhum pixel isolado acidental.
- [ ] **Step 3: Emenda:** a tira de 11.75 a 12 e de 0 a 0.25 em `--loop=kit`, como na fase 5. Expected: sem salto.
- [ ] **Step 4: Run** `npm run test:visual` (paleta e blocos: PASS) e `node scripts/check-motion.mjs --project=smoke-kit --2d --style=pixel` (0 violações).
- [ ] **Step 5: Commit** `feat: pixel finish pass (chibi cast, clouds, ground, foreground, map)`.

### Task 3: Flat: tipos novos e cabeça

**Files:**
- Modify: `src/styles/flat/draw.js`, `src/styles/flat/config.js` (`character.headScale: 1.25`)

**Interfaces:**
- Consumes: os campos da Task 1.
- Produces: o desenho dos tipos novos e da cabeça no idioma do `flat`: sem contorno, gradiente suave e brilho aditivo no poste.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Render and look:** os `--stills` das 8 cenas e a ficha do elenco, como na Task 2, em `flat`. Abra tudo. Expected: primeiro plano integrado sem tampar atores, cabeça ligada nas poses, mapa detalhado.
- [ ] **Step 3: Run** `npm run test:visual` e `node scripts/check-motion.mjs --project=smoke-kit --2d --style=flat`. Expected: PASS e 0 violações.
- [ ] **Step 4: Commit** `feat: flat draws kit foreground and detailed map`.

### Task 4: Aquarela: tipos novos e cabeça

**Files:**
- Modify: `src/styles/watercolor/draw.js`, `src/styles/watercolor/config.js` (`character.headScale: 1.15`)

**Interfaces:**
- Consumes: os campos da Task 1. Fundos parados continuam em `still(...)`. O primeiro plano parado também pode ir para o cache, se não se mexer.
- Produces: o mesmo da Task 3, no idioma da aquarela.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Render and look:** igual à Task 3, em `watercolor`. Anote o ms por quadro. Expected: ≤ 400 ms depois do cache.
- [ ] **Step 3: Run** `npm run test:visual` e `node scripts/check-motion.mjs --project=smoke-kit --2d --style=watercolor`. Expected: PASS e 0 violações.
- [ ] **Step 4: Commit** `feat: watercolor draws kit foreground and detailed map`.

### Task 5: Texto maior e limpeza do acervo

**Files:**
- Modify: `scripts/episode-lib.mjs` (tamanhos, `chunks` por largura), `scripts/episode.mjs` (`sourceHash` no índice, `--prune-acervo`)
- Test: `tests/episode-lib.test.mjs`, `tests/episode-assemble.test.mjs`

**Interfaces:**
- Produces:
  - `chunks(words, maxChars = 44)`. O `buildAss` passa 34 no `pixel` e 44 nos outros. Os chamadores atuais que passam `max = 7` mudam para o novo parâmetro.
  - Os tamanhos da decisão 7 nos estilos ASS.
  - `pruneAcervo(dir, sourceHash, { rm = rmSync }): { files: number, bytes: number }`, exportada de `scripts/episode.mjs` para teste.
  - A CLI `--prune-acervo` imprime `{"step":"prune","files":N,"mb":X}`.

- [ ] **Step 1: Write failing tests**

```js
test('chunks break by width and never split words', () => {
  const w = wordTimes({ start: 0, end: 10, text: 'O farol de Alexandria era uma das sete maravilhas do mundo antigo' });
  for (const c of chunks(w, 34)) assert.ok(c.words.map(x => x.w).join(' ').length <= 34);
  const long = chunks(wordTimes({ start: 0, end: 2, text: 'inconstitucionalissimamente sim' }), 20);
  assert.deepEqual(long.map(c => c.words.map(x => x.w).join(' ')), ['inconstitucionalissimamente', 'sim']);
});
test('pixel captions use the new sizes', () => { const ass = buildAss({ style: 'pixel', episode: { chapters: [], shots: [] }, timing: { chapters: [], shots: [] } }); assert.match(ass, /Style: Caption,Press Start 2P,40,/); });
test('pruneAcervo removes stale and unindexed files, tolerates empty dir', () => {
  // dir temporário com a.mp4 (sourceHash atual), b.mp4 (antigo), c.mp4 (fora do índice) e index.json; depois, um dir vazio
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'))), ['a']);
});
```

Escreva o terceiro teste por inteiro: o comentário descreve o arranjo, não fica no código. Ele confere que sobra só `a.mp4`, que `files === 2`, e que num dir vazio o resultado é `{files: 0, bytes: 0}`.

- [ ] **Step 2: Run** os dois arquivos de teste. Expected: FAIL nos casos novos.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify ASS real:** o mesmo quadro de teste da fase 5 (`ffmpeg -f lavfi -i color=...` com `subtitles=`), em `pixel` e `flat`. Abra as imagens e reduza-as a 640 px de largura, para simular o celular. Expected: a legenda é legível a 640 px, cabe em uma linha e o HUD não encosta na legenda.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: larger screen text, width-based captions and acervo prune`.

### Task 6: Aceite

**Files:** `docs/VALIDATION.md` (uma entrada curta).

- [ ] **Step 1:**
  - `node scripts/episode.mjs --prune-acervo`, com o número de arquivos e MB anotados.
  - `node scripts/episode.mjs fixtures/episodes/demo` nos 3 estilos, como no aceite da fase 5 (cópias em `out/tmp/demo-<estilo>/`).
  - Para cada um: `verify-video` aprovado e `decoded-sheet.png` aberto.
- [ ] **Step 2:**
  - Nova folha lado a lado com a demo em `pixel` (céu noturno e pôr do sol) contra `story-1.5.png` e `story-7.png`, em `out/check/story/compare-acabamento.png`.
  - Anote o que ficou igual, melhor e pior.
  - Se algo continuar pior que o story, volte à Task 2 uma vez. Se ainda ficar pior, registre e pare.
- [ ] **Step 3:**
  - `npm test` e `npm run test:visual`. Expected: PASS.
  - `git status --porcelain data/ out/ src/episodes.js`. Expected: vazio.
  - Registre em `docs/VALIDATION.md` o que mudou, a comparação e o resultado da limpeza do acervo.
  - Commit `docs: kit finish pass acceptance`.
