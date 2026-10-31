# Pixel figura v5 (boneco em volumes sombreados + sprites desenhados) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Os bonecos do `pixel` chegam ao nível do protótipo v5 (`out/check/sprites/v4-v5-demo.mp4`, faixa de baixo) e passam dele:
- volumes sombreados em 5 tons com variação de matiz;
- cabelo, mãos, botas, orelha e rosto desenhados à mão;
- linhas internas, contorno seletivo e luz de borda;
- todo o elenco do kit, as ações novas e movimento secundário;
- o mesmo método na folhagem do cenário.

**Architecture:**
- **Núcleo puro:** `src/styles/pixel/figure.js`, script clássico portado de `scripts/pixel-demo.mjs`. Rasteriza uma lista de formas (elipse, cápsula, quadrilátero, polígono com bisel, sprite) numa grade de células; depois faz a limpeza de tom isolado, as linhas internas, a luz de borda e o contorno seletivo.
- **Dados:** `src/styles/pixel/sprites.js` guarda os mapas desenhados à mão:
  - cabelo como mapa de mechas (cada letra é uma mecha que se sombreia sozinha);
  - mãos, bota e orelha em tons 0–4;
  - padrões de olho e boca.
- **Montagem:** `draw.js` monta a lista de formas a partir das juntas da pose em coordenadas locais (sempre olhando para a direita), chama o núcleo, espelha a grade quando `facing < 0` e a copia para o framebuffer.
- **Paleta:** ganha 15 famílias de rampa de 5 tons. A cor de cada membro do elenco escolhe a família mais próxima pelo papel (pele, cabelo, roupa).
- **Grade:** passa para 480×270 (`texture.scale` 4). O adulto fica com cerca de 55 px, o tamanho do protótipo.

**Tech Stack:** Canvas2D, `node:test` com `vm` (padrão de `tests/pixel-sprites.test.mjs`), Puppeteer-core e FFmpeg. Sem dependências novas.

**Spec:** este plano e o protótipo `scripts/pixel-demo.mjs`, que é a referência executável. As versões 3, 4 e 5 ficam no mesmo arquivo; `node scripts/pixel-demo.mjs --top=4 --bottom=5 --video=out/check/sprites/v4-v5-demo.mp4` reproduz o vídeo aprovado. Contratos: `src/styles/AGENTS.md` ("Cena K") e `src/styles/pixel/GUIDE.md`. Este plano substitui as Tasks 2 a 5 de `docs/superpowers/plans/2026-10-30-pixel-sprites-v2.md`; a Task 1 dele, o spike (41e56b2), fica como histórico.

## Contexto

- **Aprovado pelo usuário em 30/10/2026:** o protótipo v5, ou seja:
  - formas com bisel no tronco e nos membros (planos duros, não cilindros);
  - cabelo em 9 mechas desenhadas;
  - mãos `fist`, `relax`, `point` e `open`, mais bota e orelha desenhadas;
  - olho de 4 linhas com branco e brilho, bochecha rosada;
  - cachecol e cabelo com mola, luz de borda;
  - cenário com copa em tufos e serra com neve.
- **Fraquezas vistas no protótipo, que este plano corrige:**
  - o olho `happy` parece sonolento;
  - só um cabelo;
  - mãos e botas não espelham;
  - a paleta passa de 48 cores;
  - sprites não escalam no enquadramento `mid` (`cam.z` 1,35).
- **O motor hoje:**
  - `engine.js` quantiza o framebuffer para `STYLE.palette` a cada quadro;
  - `test:visual` (`scripts/check-visuals.mjs`) reprova qualquer RGB fora da paleta;
  - `doll(F, a)` desenha traços de 3 px e sprites de 3 tons; `reach()` tira o braço de perto de dentro da cabeça;
  - `parts(a, F)` alimenta o `check-motion`.

## Decisões

1. **Grade 480×270:** `texture.scale` passa para 4, e as cenas escalam por `GW = W / S`.
2. **Paleta:**
   - `config.ramps` traz 15 famílias de 5 tons, do escuro ao claro, e todas entram em `palette`, com os nomes `<família><0..4>` (ex.: `blue2`). O limite do `validate` sobe de 48 para 128.
   - Valores, copiados do protótipo onde já existem:

| Família | Tons 0 → 4 |
| ------- | ---------- |
| `skinL` | `#6a3a4a #b06a62 #e8a882 #f8cca4 #fff0d8` |
| `skinM` | `#5a2f45 #9a5450 #d08a65 #f0b48a #ffdcb0` |
| `skinD` | `#2a1420 #4a2630 #6e3e36 #925a44 #b47a58` |
| `hairBrown` | `#24142a #45202e #6e3a30 #9a5a38 #c8864a` |
| `hairBlack` | `#0e0a16 #1c1628 #2c2440 #3e3a5c #5a5a80` |
| `hairBlond` | `#6a4020 #a8702c #d8a848 #f0d070 #fff0b0` |
| `grey` | `#3a3848 #6a6878 #9a98a4 #c8c8d0 #f0f0f4` |
| `blue` | `#1a1a48 #22388a #2c62b8 #4896d8 #8cd0f0` |
| `red` | `#3a0e26 #781a2e #b82e30 #e45a3a #ff9a64` |
| `green` | `#122a26 #1e4a30 #2e6e36 #58963c #9cc452` |
| `yellow` | `#5a341c #9a6a1e #d8a830 #ffe070 #fff8c0` |
| `purple` | `#1e1236 #3a2058 #5a3480 #8058a8 #a888d0` |
| `cream` | `#5a4a6a #9a8aa0 #cfc3b8 #ece2cc #fff8e8` |
| `brown` | `#24162e #43263a #643a3c #8a5644 #ad7650` |
| `leather` | `#1c1022 #3a1e28 #5c3230 #80503a #a66e48` |

   - Mais `blush: '#f08878'`.
   - O contorno do boneco é `P.black` de dia e `P.stoneDk` à noite, como hoje. O branco do olho é `P.eye`.

3. **Família por papel:** `familyOf(hex, role, ramps) -> nome`, com `role` em `'skin' | 'hair' | 'cloth'`.
   - `skin` escolhe só entre `skinL`, `skinM` e `skinD`.
   - `hair` escolhe entre `hairBrown`, `hairBlack`, `hairBlond` e `grey`.
   - `cloth` escolhe entre todas as que não são de pele nem de cabelo, mais `grey`.
   - A distância é RGB euclidiana até o tom mais próximo da família.
4. **Núcleo de rasterização** (`figure.js`):
   - **Formas:**
     - `E` (elipse = esfera achatada);
     - `C` (cápsula afinada = cilindro);
     - `Q` (quadrilátero ao longo de um segmento, estendido .6·r nas pontas, bisel .9·min(ra, rb));
     - `P` (polígono com bisel; normal plana no meio e inclinada na borda, fator .85);
     - `S` (sprite).
   - **Tom:** luz padrão `L = normalize(-.55, -.7, .5)`. O tom sai de `band(n·L + bias)` com os cortes `.8 / .5 / .15 / -.25`.
   - **Ordem dos passes:** limpeza de tom isolado; linha interna (a peça de trás encosta numa da frente de outro grupo: mesmo material −2 tons, outro material tom 0); luz de borda; contorno seletivo (vizinho aceso por baixo ou pela direita → tom 0 do material; senão, a tinta).
   - **Luz de borda:** o pixel de tom ≤ 1 cujo vizinho do lado oposto à luz (sinal de −L.x) está vazio, com o outro vizinho cheio, vira tom 2.
   - Tudo como em `layer()` do protótipo.
5. **Mechas** (`lockTone`, do protótipo), com um brilho a mais:
   - o pixel 2 linhas abaixo do topo da mecha, com pelo menos 3 linhas da mecha abaixo dele e `hash(c * 5 + r * 11) > .5`, sobe de 2 para 4;
   - cada mecha tem `i` próprio (ordem de `locks`) e grupo `'lock' + letra`.
6. **Escala do sprite:**
   - `scaleRows(rows, k)` amplia por vizinho mais próximo para `round(w·k) × round(h·k)`, antes do sombreamento.
   - Com `k = s / 1.25` (decisão 7) e |k − 1| > .1, cabelo, mãos, bota e orelha usam `scaleRows`. O mapa de mechas sombreia depois da escala (fica limpo); os sprites de tom ficam aceitáveis.
7. **Unidade do boneco:** `s = |p(neck) − p(pelvis)| / 11` em px da grade, onde `p` é `view(F, a.layer).p`. Medidas do protótipo (ramo v5 de `figure()`) multiplicadas por `s`:

| Peça | Medidas |
| ---- | ------- |
| braço | 2,4 → 2,1 |
| antebraço | 2,1 → 1,8 |
| cotovelo | 2 |
| punho | 1,7, a 80% do antebraço |
| coxa | 2,9 → 2,5 |
| canela | 2,5 → 2,2 |
| joelho | 2,4 |
| tronco | polígono `[[-4.6,-28],[5.2,-28],[6.6,-24.6],[5.8,-17.5],[6.2,-12],[-5.2,-12],[-5.4,-17.5],[-6.2,-24.6]]` relativo à pelve em `(0, -14)`, bisel 2,2 |
| cabeça | elipse 7,8 × 7,6 mais queixo 6,2 × 4,7 em (+1,6, +3,4), nariz 1,2 × 1,1 em (+7,4, +1,8) |
| centro da cabeça | `neck + n̂·9·s`, com `n̂` = unidade de `headTop − headBase` |

   - Corpos: `heavy` soma 1,6 na largura do tronco e 0,4 nos raios dos membros; `thin` tira 1 e 0,3; `child` e `adult` iguais (o esqueleto já é menor); `elder` ganha casaco longo, um quadrilátero de cada quadril ao joelho na família da camisa, com barra de 1 px no tom 1.
8. **Espaço local:**
   - O boneco é montado olhando para a direita, com `x' = (x − O.x)·facing` e `O` = `p(pelvis)` arredondado.
   - A luz local é `L` com `x` multiplicado por `side·facing`. `side` sai da regra atual de `doll`: o astro, ou a primeira luz no interior.
   - Com `facing < 0`, `flipCells` espelha a grade em torno de `O`.
9. **Clima:** `night` e `interior` descem 1 tom em todas as células do boneco (mínimo 0) antes do contorno. O resto não muda.
10. **Mãos por ação:**
    - `walk` e `run`: `fist`;
    - `stand`, `sit`, `look-up`, `kneel` e `lie`: `relax`;
    - `point`: `point` na mão de perto, `relax` na outra;
    - `read`: `hold` nas duas;
    - `cheer`: `open` nas duas;
    - `talk`: `open` na mão que gesticula, `relax` na outra;
    - `cower`: `fist`.

    `reach()` continua ajustando o braço de perto antes da montagem.
11. **Cabelo por estilo:** `short`, `long`, `spiky`, `bun`, `bald` (sem mapa) e os de gear `hood` e `helmet` (substituem o cabelo); `hat` é um mapa por cima do cabelo. `hairOf` e `headVariant` continuam; `up` sobe o rosto 1 px.
12. **Deitado:** com `actor.lying === 1`, monta o boneco de pé pela pose girada de volta em torno da pelve e gira a grade 90° com `rotateCells`, que é exato, sem reamostrar.
13. **Movimento secundário:** gear `scarf` e `cape`, com a cor do `colors.accent` do elenco (padrão: `red`).
    - **Ondulação:** `sway(phase) = sin(2π(phase − .15))`, onde `phase` = fase da passada quando anda; senão `t/L·round(L/1.6)`, periódico em L.
    - **Cachecol:** duas cápsulas da nuca para trás, como no protótipo.
    - **Capa:** polígono dos ombros aos joelhos, com os dois pontos de baixo deslocados `1.5·s·sway`.
14. **Cenário:** as árvores `broad` das camadas com f ≥ .45 e os `bush` do primeiro plano viram copas em tufos pelo núcleo (`canopy()` do protótipo):
    - família `green`, com a descida de clima da decisão 9;
    - sem luz de borda à noite;
    - camadas de f < .45 continuam silhueta de uma cor.

## Global Constraints

- **Regras do `CLAUDE.md`:**
  - função pura de `t`, sem `Math.random()`, relógio ou estado entre quadros;
  - `src/episode/kit.js` e `src/nature/` não desenham;
  - no `pixel`, só cores da paleta.
- O quadro K continua periódico em L. O `pixel` desenha a pose em 12/s (`onTwos`).
- Sem dependências npm novas. Só personagens originais.
- **Validação de cada tarefa de estilo:**
  - `npm test`;
  - `npm run test:visual`;
  - `node scripts/check-motion.mjs --project=smoke-kit --2d --style=pixel` com 0 violações;
  - folhas ampliadas abertas com Read pelo implementador e pelo revisor.
- `out/`, `data/` e `src/episodes.js` ficam fora do git.
- Commits em inglês, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Um escritor por arquivo em cada onda.

## Review Focus

1. **Boneco virado para a esquerda:** o mesmo desenho espelhado, com cabelo, mão e bota invertidos, sem deslocar 1 px no pescoço. Teste `flip mirrors around the origin` na Task 2 e folha nos dois sentidos na Task 4.
2. **Enquadramento `mid` (`cam.z` 1,35):** cabelo, mãos e botas acompanham a cabeça e os membros maiores (decisão 6). Folha de `floresta`, que é `mid`, na Task 4.
3. **Cores extremas do elenco** (pele `#5a3a28`, cabelo `#111111` e `#d8d4cc`): família certa e legível à noite. Teste `familyOf maps cast colors` na Task 1 e plano noturno de `--loop=cast` na Task 4.
4. **Emenda do loop:** cachecol, capa e respiração sem salto entre 11,75 e 0,25 s. Teste `secondary motion is periodic in L` na Task 6 e tira da emenda.
5. **Braço de perto na frente do rosto:** `point` e `cheer` não tapam olho nem boca. A mão `open` do `cheer` fica fora da caixa do rosto (teste na Task 4).

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1 Paleta, quantizador e grade | opus | medium |
| 2 Núcleo `figure.js` | opus | high |
| 3 Sprites desenhados | opus | high |
| 4 Boneco no `draw.js` | opus | high |
| 5 Ações no kit | opus | medium |
| 6 Deitado e movimento secundário | opus | medium |
| 7 Copas e arbustos em tufos | opus | medium |
| 8 Aceite | sessão principal | — |

## Ondas

- A: Task 1.
- B: Tasks 2 e 5 em paralelo. Arquivos distintos: a 2 em `src/styles/pixel/figure.js` e no teste dela; a 5 em `src/episode/`, `src/nature/` e nos testes deles.
- C: Task 3. Depende do `figure.js` para a folha de conferência.
- D: Task 4. E: Task 6. F: Task 7. G: Task 8.

---

### Task 1: Paleta em famílias, quantizador com cache e grade 480×270

**Files:**
- Modify:
  - `src/styles/pixel/config.js`: `ramps`, `palette` com os 75 tons mais `blush`, limite 128, `texture.scale: 4`;
  - `src/styles/pixel/engine.js`: cache do quantizador;
  - `src/styles/pixel/sprites.js`: `familyOf`;
  - `src/styles/pixel/GUIDE.md`.
- Test: `tests/pixel-sprites.test.mjs`

**Interfaces:**
- Produces:
  - `STYLE.ramps: { [family]: string[5] }`;
  - `STYLE.palette[family + i]`, para `i` de 0 a 4;
  - `familyOf(hex: string, role: 'skin'|'hair'|'cloth', ramps) -> string`, global em `sprites.js`.

- [ ] **Step 1: Write failing tests** em `tests/pixel-sprites.test.mjs`. Carregue `config.js` num `vm` com `AnimationPlatform = { registerStyle: s => (ctx.style = s) }`.

```js
test('palette carries 15 five-tone ramps, dark to light', () => {
  const { ramps, palette } = style.config, lum = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).reduce((s, v, i) => s + v * [.3, .59, .11][i], 0);
  assert.equal(Object.keys(ramps).length, 15);
  for (const [f, r] of Object.entries(ramps)) { assert.equal(r.length, 5); r.forEach((h, i) => { assert.equal(palette[f + i], h); if (i) assert.ok(lum(h) > lum(r[i - 1]), f + i); }); }
  assert.doesNotThrow(() => style.validate(style.config));
  assert.equal(style.config.texture.scale, 4);
});
test('validate caps the palette at 128 colors', () => {
  const big = { ...style.config, palette: { ...style.config.palette } };
  for (let i = 0; i < 80; i++) big.palette['x' + i] = '#' + (0x100000 + i * 997).toString(16).slice(-6);
  assert.throws(() => style.validate(big), /128/);
});
test('familyOf maps cast colors', () => {
  const R = style.config.ramps;
  assert.equal(familyOf('#5a3a28', 'skin', R), 'skinD'); assert.equal(familyOf('#c68a62', 'skin', R), 'skinM');
  assert.equal(familyOf('#111111', 'hair', R), 'hairBlack'); assert.equal(familyOf('#d8d4cc', 'hair', R), 'grey'); assert.equal(familyOf('#3a2a1e', 'hair', R), 'hairBrown');
  assert.equal(familyOf('#3f6e9a', 'cloth', R), 'blue'); assert.equal(familyOf('#e0b040', 'cloth', R), 'yellow'); assert.equal(familyOf('#2e5a46', 'cloth', R), 'green');
});
```

- [ ] **Step 2: Run** `node --test tests/pixel-sprites.test.mjs`. Expected: FAIL nos três.
- [ ] **Step 3: Implement** a decisão 2 em `config.js` (o `validate` diz `Paleta de pixel passa de 128 cores`), a decisão 3 em `sprites.js` e `texture.scale: 4`.
- [ ] **Step 4: Implement** o cache em `quantize()` de `engine.js`: um `Map` de `(r << 16 | g << 8 | b)` para a cor da paleta, que persiste entre quadros. É memoização de função pura, então vale.
- [ ] **Step 5: Run** `npm test` (PASS) e `npm run test:visual` (PASS; confere que a grade 4 não deixa bloco inconsistente). Corrija só o que a troca de escala quebrar.
- [ ] **Step 6: Look:** `node render.mjs --project=smoke-kit --style=pixel --sheet=0.5,3.5,6.5 --cols=3 --w=640 --out=out/check/fig/t1.jpg`, aberto com Read. Expected: o cenário igual, em pixels menores; os bonecos ainda são os antigos.
- [ ] **Step 7: Commit** `feat: pixel 5-tone ramp families and 480x270 grid`.

### Task 2: Núcleo de rasterização `figure.js`

**Files:**
- Create: `src/styles/pixel/figure.js` (script clássico, sem `import`), `tests/pixel-figure.test.mjs`
- Modify: `src/styles/pixel/config.js`: `scripts` com `figure.js` depois de `sprites.js`.

**Interfaces:**
- Produces (globais):
  - **Formas:**
    - `ellipsePart(c, rx, ry, mat, o?)`;
    - `capsulePart(a, b, ra, rb, mat, o?)`;
    - `quadPart(a, b, ra, rb, mat, o?)`;
    - `polyPart(pts, bev, mat, o?)`;
    - `spritePart(at, sprite, mat, o?)`, onde `sprite = { ax, ay, rows, locks?, lockBias? }`;
    - `o` aceita `{ g, bias, tn(x, y, t) }`, e `mat` pode ser uma função `(x, y) -> nome`.
  - `figureLayer(parts, box: { W, H, OX, OY }, opts: { ramps, light?: [x, y, z], rim?: boolean, outline?: boolean, ink: string, shift?: number }) -> { W, H, OX, OY, cells: (string|null)[] }`. `shift` desce tons (decisão 9).
  - `lockTone(rows, c, r, ch) -> 0..4` (decisão 5).
  - `scaleRows(rows: string[], k: number) -> string[]`.
  - `flipCells(layer) -> layer`: espelha em torno de `OX`, com `x' = 2·OX − 1 − x`.
  - `rotateCells(layer, dir: 1|-1) -> layer`: 90° horário com `dir = 1`; a origem `(OX, OY)` fica no mesmo pixel.

- [ ] **Step 1: Write failing tests** em `tests/pixel-figure.test.mjs` (`vm` como em `pixel-sprites.test.mjs`). Rampa de teste: `R = { m: ['#000001', '#000002', '#000003', '#000004', '#000005'] }`; `tone = c => R.m.indexOf(c)`.

```js
const box = { W: 24, H: 24, OX: 12, OY: 12 }, ink = '#ffffff', at = (L, x, y) => L.cells[y * L.W + x];
test('layer is deterministic', () => {
  const p = [ellipsePart([0, 0], 6, 6, 'm')];
  assert.deepEqual(figureLayer(p, box, { ramps: R, ink }).cells, figureLayer(p, box, { ramps: R, ink }).cells);
});
test('light comes from the top left', () => {
  const L = figureLayer([ellipsePart([0, 0], 8, 8, 'm')], box, { ramps: R, ink });
  assert.ok(tone(at(L, 8, 8)) > tone(at(L, 16, 16)));
});
test('outline closes the silhouette', () => {
  const L = figureLayer([ellipsePart([0, 0], 6, 6, 'm')], box, { ramps: R, ink });
  for (let k = 0; k < L.cells.length; k++) {
    const x = k % L.W, y = k / L.W | 0, c = L.cells[k]; if (!c || c === ink || c === R.m[0]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.ok(at(L, x + dx, y + dy), 'recheio encosta no vazio');
  }
});
test('inner line darkens the back part where the front part touches', () => {
  const L = figureLayer([ellipsePart([-3, 0], 5, 5, 'm', { g: 'a' }), ellipsePart([3, 0], 5, 5, 'm', { g: 'b' })], box, { ramps: R, ink });
  assert.ok(tone(at(L, 12 + 3 - 5 - 1, 12)) <= 1);  // a coluna da peça de trás logo à esquerda da borda da da frente
});
test('rim lights the edge away from the light', () => {
  const a = figureLayer([quadPart([0, -8], [0, 8], 3, 3, 'm')], box, { ramps: R, ink, rim: true });
  const b = figureLayer([quadPart([0, -8], [0, 8], 3, 3, 'm')], box, { ramps: R, ink, rim: true, light: [.55, -.7, .5] });
  assert.equal(tone(at(a, 14, 12)), 2); assert.equal(tone(at(b, 9, 12)), 2);
});
test('lock shading lights the top of each lock', () => {
  const s = { ax: 0, ay: 0, locks: 'ab', rows: ['aaab', 'aaab', 'aabb', 'abbb'] };
  assert.equal(lockTone(s.rows, 0, 0, 'a'), 4); assert.equal(lockTone(s.rows, 3, 3, 'b'), 0);
});
test('flip mirrors around the origin and rotate is lossless', () => {
  const L = figureLayer([ellipsePart([3, -2], 2, 2, 'm')], box, { ramps: R, ink }), F = flipCells(L);
  for (let k = 0; k < L.cells.length; k++) { const x = k % L.W, y = k / L.W | 0; assert.equal(F.cells[y * L.W + (2 * L.OX - 1 - x)], L.cells[k]); }
  let Q = L; for (let i = 0; i < 4; i++) Q = rotateCells(Q, 1); assert.deepEqual(Q.cells, L.cells);
});
test('scaleRows is nearest neighbour', () => {
  assert.deepEqual(scaleRows(['ab', 'cd'], 2), ['aabb', 'aabb', 'ccdd', 'ccdd']);
  assert.equal(scaleRows(['abc'], 1.35)[0].length, 4);
});
test('shift lowers every tone by one', () => {
  const p = [ellipsePart([0, 0], 6, 6, 'm')], a = figureLayer(p, box, { ramps: R, ink }), b = figureLayer(p, box, { ramps: R, ink, shift: 1 });
  assert.equal(tone(b.cells[12 * 24 + 12]), Math.max(0, tone(a.cells[12 * 24 + 12]) - 1));
});
```

  Use o tamanho de `box` nas coordenadas. Se `rotateCells` exigir grade quadrada, valide e documente isso; o boneco usa grade quadrada.
- [ ] **Step 2: Run** `node --test tests/pixel-figure.test.mjs`. Expected: FAIL (o arquivo não existe).
- [ ] **Step 3: Implement** `figure.js`, portando `sample`, `layer`, `spriteCells`, `lockTone` e `quad` do protótipo, com a borda pela luz (decisão 4), o brilho da mecha (decisão 5) e `shift`. A grade guarda `{i, g, mat, t}` e devolve cores de `opts.ramps[mat][t]`.
- [ ] **Step 4: Run** `node --test tests/pixel-figure.test.mjs` (PASS) e `npm test` (PASS).
- [ ] **Step 5: Commit** `feat: pixel figure rasterizer (shaded volumes, locks, outline)`.

### Task 3: Sprites desenhados à mão

**Files:**
- Modify:
  - `src/styles/pixel/sprites.js`: troca `PIXEL_SPRITES` pelo conjunto novo; `rampOf`, `LEGEND`, `heads` e `torsos` saem quando a Task 4 deixar de usá-los, então aqui ficam, marcados `// legado: sai na Task 4`;
  - `scripts/png-rgba.mjs`: `encodeRgb(w, h, rgb: Uint8Array) -> Buffer`.
- Create: `scripts/pixel-sheet.mjs`
- Test: `tests/pixel-sprites.test.mjs`

**Interfaces:**
- Consumes: `figureLayer`, `spritePart` e `ellipsePart` da Task 2.
- Produces, `PIXEL_SPRITES5 = { hair: { short, long, spiky, bun, hood, helmet }, hat, hands: { fist, relax, point, open, hold }, boot, ear, eyes: { neutral, curious, surprised, happy, blink }, mouths: { none, m, e, a, o, grin } }`:
  - **Cabelo e chapéu:** mapas de mechas `{ ax, ay, locks, lockBias?, rows }` com a âncora no centro da cabeça.
  - **Mãos, bota e orelha:** `{ ax, ay, rows }` com dígitos 0–4.
  - **Olho:** `{ near: rows, far: rows, brow: dy, dy?, blush?: true }`.
  - **Boca:** `rows`. Glifos do rosto: `K` tinta, `W` olho, `B` sobrancelha (tom 0 do cabelo), `S` boca fechada (tom 1 da pele), `T` língua (`red3`), `P` `blush`, `.` vazio.
  - **Posição do rosto,** relativa ao centro da cabeça em px (com `k = s/1.25`):
    - olho de perto em (+2,4k, 0);
    - olho de longe em (+7,2k, 0);
    - sobrancelhas 2 linhas acima;
    - bochechas em (+1,6k, +5) e (+8,2k, +5);
    - boca em (+4,5k + .6, +4,5k + .5); a boca de 3 ou mais colunas começa 1k antes.
- `scripts/pixel-sheet.mjs --out=out/check/sprites/sheet.png` desenha em 8×:
  - cada cabelo numa cabeça neutra, olhando para a direita e para a esquerda;
  - cada mão;
  - a bota;
  - cada olho e cada boca num rosto.

- [ ] **Step 1: Write failing tests:**

```js
const S5 = ctx.S.PIXEL_SPRITES5, tonal = /^[.0-4]+$/;
test('sprite set is complete and well formed', () => {
  for (const h of ['short', 'long', 'spiky', 'bun', 'hood', 'helmet']) assert.ok(S5.hair[h], h);
  for (const k of ['fist', 'relax', 'point', 'open', 'hold']) assert.ok(S5.hands[k], k);
  for (const e of ['neutral', 'curious', 'surprised', 'happy', 'blink']) assert.ok(S5.eyes[e], e);
  for (const m of ['none', 'm', 'e', 'a', 'o', 'grin']) assert.ok(S5.mouths[m], m);
  const maps = [...Object.values(S5.hair), S5.hat], tones = [...Object.values(S5.hands), S5.boot, S5.ear];
  for (const s of [...maps, ...tones]) { const w = s.rows[0].length; for (const r of s.rows) assert.equal(r.length, w); assert.ok(s.ax >= 0 && s.ax < w && s.ay >= 0 && s.ay < s.rows.length); }
  for (const s of maps) for (const r of s.rows) for (const ch of r) assert.ok(ch === '.' || s.locks.includes(ch), ch);
  for (const s of tones) for (const r of s.rows) assert.match(r, tonal);
});
test('hair leaves the face free', () => {
  for (const [name, s] of Object.entries(S5.hair)) for (let y = 0; y <= 6; y++) for (let x = 2; x <= 9; x++)
    assert.equal((s.rows[s.ay + y] || '')[s.ax + x] || '.', '.', `${name} cobre o rosto em ${x},${y}`);
});
test('happy eyes read as arcs, not as a closed line', () => {
  const n = S5.eyes.happy.near; assert.ok(n.length >= 2 && n[0].includes('K') && /K.*\.+.*K/.test(n[n.length - 1]));
});
```

- [ ] **Step 2: Run** `node --test tests/pixel-sprites.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** os sprites:
  - **Copiados do protótipo como estão:**
    - `spiky` = `HAIR5`;
    - `fist`, `relax`, `point` e `open` = `HANDS5`;
    - `boot` = `BOOT5`;
    - `ear` = o da v5;
    - olhos `neutral` e `blink` e as bocas = os do conjunto `v4` do protótipo.
  - **Desenhados novos,** olhando a folha a cada rodada:
    - `short` (topo arredondado em 4 a 5 mechas);
    - `long` (mechas até a linha 22, atrás do pescoço);
    - `bun` (coque de 6×6 atrás do topo);
    - `hood` (capuz que emoldura o rosto; mechas grandes, família da camisa na Task 4);
    - `helmet` (calota com aba e 1 rebite; família `grey`);
    - `hat` (copa e aba sobre o cabelo);
    - `hold` (mão em C, de lado);
    - olhos `curious` (pupila em cima), `surprised` (olho de 4 × 4 com branco em volta) e `happy` em arco: `near: ['.KK.', 'K..K']`, `far: ['K.', '.K']` e `dy: 1`.
  - **Regras de desenho:**
    - mecha de no mínimo 2 px de largura;
    - pontas para trás e para cima;
    - franja que não entra na caixa do rosto (teste);
    - nenhum pixel solto;
    - silhueta que leia sozinha em preto.
- [ ] **Step 4: Implement** `encodeRgb` (o escritor de PNG do protótipo) e `scripts/pixel-sheet.mjs`, que carrega `sprites.js` e `figure.js` por `vm`.
- [ ] **Step 5: Run** `node scripts/pixel-sheet.mjs --out=out/check/sprites/sheet.png` e abra com Read. Expected:
  - os 6 cabelos distintos de longe;
  - rosto livre;
  - `happy` sorrindo;
  - mão `hold` legível;
  - nada embolado no espelho.

  Refaça o desenho até ficar assim; no máximo 3 rodadas, e então reporte.
- [ ] **Step 6: Run** `node --test tests/pixel-sprites.test.mjs` e `npm test`. Expected: PASS.
- [ ] **Step 7: Commit** `feat: hand-drawn pixel hair, hands, boot and faces`.

### Task 4: Boneco novo no `draw.js`

**Files:**
- Modify:
  - `src/styles/pixel/draw.js`: `doll`, `parts`, `pieces`, `headBox` (`reach` fica);
  - `src/styles/pixel/sprites.js`: remove o legado;
  - `src/styles/pixel/GUIDE.md`: a seção Bonecos reescrita.
- Test: `tests/pixel-sprites.test.mjs` (remove os testes do legado: `every sprite is well formed`, `mirrors around the anchor` e `ramps stay ordered`)

**Interfaces:**
- Consumes: Tasks 1 a 3. `actor.role` e `actor.gear` como hoje. `actor.hair` e as ações novas chegam pela Task 5; até lá, `hairOf` sorteia e as ações novas caem nas regras de mão da decisão 10.
- Produces:
  - `facePlan(P: { face, mouth, hands: [x, y][] }, s: number) -> { eyeNear, eyeFar, mouth, hands: rect[] }` em `sprites.js`, pura. Os retângulos `{x0, y0, x1, y1}` estão em px locais relativos ao centro da cabeça, e as mãos vêm do tamanho do sprite delas.
  - `figureOf(a, F) -> { layer, O: [x, y], k }`: monta, rasteriza, aplica clima e espelho. A Task 6 a estende.
  - `ExpStyle.parts(a, F)`: os traços do boneco com os raios da decisão 7 em px do mundo, `r = raio·s·S/z`. A cabeça vai de `headBase` ao alto do mapa de cabelo. As regras de `reach` continuam.

- [ ] **Step 1: Write failing test** num arquivo novo, `tests/pixel-doll.test.mjs`. Carregue `sprites.js`, `figure.js` e a função pura `facePlan(P, s)` que a Task 4 exporta de `sprites.js`; ela devolve os retângulos de olho, boca e mãos em px locais.

```js
test('open hands stay out of the face box in cheer', () => {
  const plan = facePlan({ face: 'happy', mouth: 'grin', hands: [[-15, -36], [16, -35]] }, 1.25);
  for (const h of plan.hands) for (const f of [plan.eyeNear, plan.eyeFar, plan.mouth]) assert.ok(h.x1 < f.x0 || h.x0 > f.x1 || h.y1 < f.y0 || h.y0 > f.y1);
});
```

  Se `facePlan` não couber limpo, troque este teste pela folha do Step 5 e anote a decisão no `GUIDE.md`.
- [ ] **Step 2: Run** `node --test tests/pixel-doll.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `figureOf` com as decisões 6 a 11:
  - **Ordem das formas,** como o protótipo: cachecol (Task 6), braço de longe, perna de longe, tronco, perna de perto, cabeça e queixo, cabelo, orelha, braço de perto.
  - **Viés:** −.55 nas peças de longe.
  - **Detalhes do tronco** (`tn`): barra, lapela e bolso da v4, mais o cinto com fivela `yellow`.
  - **Famílias:** pele, cabelo, camisa e calça por `familyOf` sobre `a.colors` (padrões de hoje); bota `leather`; capacete `grey`; capuz na família da camisa.
  - **Rosto** depois da rasterização, pelo `facePlan`.
- [ ] **Step 4: Implement** em `doll`:
  - blit de `layer.cells` em `px`, com o clipe atual;
  - sombra de contato: 2 linhas de `P.ink` em pontilhado de 50% sob a pelve, com largura de 14·s, menos com `seated` ou `lying`;
  - o livro do `read` por cima, como hoje;
  - por fim, remova o legado de `sprites.js`.
- [ ] **Step 5: Render and look:**
  - `node render.mjs --project=smoke-kit --style=pixel --loop=cast --sheet=0.5,2.5,4.5,6.5,8.5,10.5 --cols=3 --w=960 --out=out/check/fig/cast.jpg`;
  - `--sheet` de `smoke-kit` nas 8 cenas;
  - recortes ampliados 4× (`ffmpeg ... crop, scale ... flags=neighbor`) de um adulto nos dois sentidos, do `heavy` com capacete, do `thin` com capuz, do `elder` com chapéu e do plano noturno.

  Expected:
  - nível do protótipo v5;
  - corpos distintos de longe;
  - rosto legível;
  - nada atravessando a cabeça;
  - mão e bota espelhadas;
  - no `mid` (floresta), cabelo e mãos do tamanho certo.
- [ ] **Step 6: Run:**
  - `node --test tests/pixel-doll.test.mjs tests/pixel-sprites.test.mjs` (PASS);
  - `npm test` (PASS);
  - `npm run test:visual` (PASS);
  - `check-motion` (0 violações).
- [ ] **Step 7: Commit** `feat: pixel doll from shaded volumes and drawn sprites`.

### Task 5: Ações novas no kit e emenda sem salto

**Files:**
- Modify:
  - `src/episode/kit.js`:
    - `ACTIONS` com `run`, `cheer`, `talk`, `kneel`, `cower` e `lie`;
    - `GEAR` com `scarf` e `cape`;
    - `COLORS` com `accent`;
    - `member.hair` validado contra `short`, `long`, `spiky`, `bun` e `bald`;
  - `src/nature/creature.js`: `o.loop`;
  - `fixtures/smoke/kit.js`: planos novos no `EST.CAST`;
  - `src/styles/AGENTS.md`: ações, gear, `hair` e `accent`.
- Test: `tests/episode-kit.test.mjs`, `tests/nature-creature.test.mjs`

**Interfaces:**
- Consumes: `turnHead`, `handTo`, `stepTo` e `lowered` de `src/nature/skeleton.js`, e `creaturePose`.
- Produces:
  - `actor.role` com os nomes novos;
  - `actor.hair`;
  - `actor.colors.accent`;
  - `actor.lying = 1` em `lie`, com as juntas giradas em torno da pelve até o chão;
  - `actor.phase`, a fase da passada em [0, 1) quando anda ou corre;
  - `creaturePose(spec, { ..., loop })`: com `loop`, todo `noise1(t)` interno usa tempo periódico em `loop`.

- [ ] **Step 1: Write failing tests:**
  - estenda `every scene and action is periodic in L` para `['walk', 'stand', 'point', 'run', 'cheer', 'talk', 'kneel', 'cower', 'lie']`;
  - adicione os testes abaixo;
  - adicione `kneel` e `lie` ao teste do primeiro plano de 120 px, com a meia largura do corpo de `.5 * size`.

```js
const one = (action, t = 3, extra = {}) => kitFrame({ scene: 'campo', params: P, cast: [{ id: 'a', body: 'adult', ...extra }], actors: [{ cast: 'a', action, at: .5, dir: 1 }] }, t, 12).actors[0];
test('new actions have their shape', () => {
  const J = one('run').pose.joints; assert.ok(J.neck[0] - J.pelvis[0] > 0, 'tronco inclinado para a frente');
  const ch = one('cheer').pose.joints; assert.ok(ch.handL[1] < ch.headBase[1] && ch.handR[1] < ch.headBase[1], 'mãos acima do pescoço');
  const lie = one('lie'); assert.equal(lie.lying, 1); assert.ok(Math.abs(lie.pose.joints.headTop[1] - lie.pose.joints.pelvis[1]) < 40);
  const k = one('kneel').pose.joints; assert.ok(Math.min(k.kneeL[1], k.kneeR[1]) > k.pelvis[1] + 30);
  assert.ok(['a', 'o', 'm'].includes(one('talk', 1.2).pose.face.mouth));
  const ph = one('walk').phase; assert.ok(ph >= 0 && ph < 1);
});
test('head is seamless at the loop seam', () => {
  const [a, b] = [one('stand', 0), one('stand', 12 - 1e-6)].map(x => x.pose.joints.headTop);
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < .5);
});
test('hair, accent and new gear pass through and are validated', () => {
  const a = one('stand', 1, { hair: 'bun', gear: ['scarf'], colors: { accent: '#b82e30' } });
  assert.equal(a.hair, 'bun'); assert.deepEqual(a.gear, ['scarf']); assert.equal(a.colors.accent, '#b82e30');
  assert.throws(() => one('stand', 1, { hair: 'mohawk' }));
});
```

  `P` e a forma de chamar `kitFrame` seguem o que o arquivo já usa.
- [ ] **Step 2: Run** `node --test tests/episode-kit.test.mjs tests/nature-creature.test.mjs`. Expected: FAIL nos novos.
- [ ] **Step 3: Implement:**
  - `run`: `moving: 1`, passada de 1,4× e período de .7×, inclinação de .15 rad;
  - `cheer`: mãos para cima e para fora (fora da largura da cabeça, como no protótipo), pulando com `h = 7·|sin(π·u)|` px do mundo por 0,7 s ajustado a `per(L, .7)`;
  - `talk`: gesto com `handTo` e boca em `['a', 'm', 'o', 'e', 'm']` a 6/s;
  - `kneel` e `cower`: `lowered` mais `stepTo`;
  - `lie`: rotação pura em torno da pelve mais a respiração;
  - depois, `o.loop` em `creaturePose`, e remova o comentário `ponytail:` de `castActor`.
- [ ] **Step 4: Run** os testes do Step 2 (PASS) e `npm test` (PASS).
- [ ] **Step 5: Render** `--loop=cast` em `debug`, `flat` e `watercolor`, e abra. Expected: as 6 ações legíveis; `lie` e `cower` sem quebrar cabeça nem chapéu.
- [ ] **Step 6: Run** `check-motion` em `debug`, `flat` e `watercolor` (0 violações) e `npm run test:visual`.
- [ ] **Step 7: Commit** `feat: kit run, cheer, talk, kneel, cower and lie actions`.

### Task 6: Deitado, cachecol, capa e poeira no pixel

**Files:**
- Modify: `src/styles/pixel/draw.js` (`figureOf`, `doll`), `src/styles/pixel/GUIDE.md`, `fixtures/smoke/kit.js` (um plano do `EST.CAST` com `scarf`, `cape`, `run`, `cheer` e `lie`)
- Test: `tests/pixel-doll.test.mjs`

**Interfaces:**
- Consumes: Task 5 (`lying`, `phase`, `gear`, `colors.accent`) e `rotateCells` da Task 2.
- Produces: `sway(phase: number) -> number` em `sprites.js` (decisão 13), periódico em 1.

- [ ] **Step 1: Write failing test:**

```js
test('secondary motion is periodic in L', () => {
  assert.ok(Math.abs(sway(0) - sway(1)) < 1e-9);
  const ph = t => t / 12 * Math.round(12 / 1.6);
  assert.ok(Math.abs(sway(ph(0)) - sway(ph(12))) < 1e-9);
});
```

- [ ] **Step 2: Run** `node --test tests/pixel-doll.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement:**
  - `lie` pela decisão 12;
  - `scarf` e `cape` pela decisão 13;
  - na troca de pé do `run` (`phase` perto de 0 e de .5), 2 a 4 px de poeira em `P.sand` (`P.snowShade` na neve), presos ao chão por `hash` da passada, sumindo em 3 desenhos.
- [ ] **Step 4: Render:**
  - `--loop=cast` com o plano novo;
  - tira da emenda: `node render.mjs --project=smoke-kit --style=pixel --loop=cast --strip=11.5:12 --cols=6 --w=320` e o mesmo de 0 a 0.5.

  Expected:
  - deitado sem pixel faltando;
  - cachecol e capa ondulando sem salto na emenda;
  - poeira que não flutua.
- [ ] **Step 5: Run** `npm test`, `npm run test:visual` e `check-motion` (0 violações).
- [ ] **Step 6: Commit** `feat: pixel lying pose, scarf, cape and run dust`.

### Task 7: Copas e arbustos em tufos

**Files:**
- Modify: `src/styles/pixel/draw.js` (`tree` com `kind === 'broad'` nas camadas de f ≥ .45, `prop` com `kind === 'bush'`), `src/styles/pixel/GUIDE.md`

**Interfaces:**
- Consumes: `figureLayer` e `ellipsePart`.
- Produces: `canopyParts(n, seed, rx, ry, cy) -> parts[]` em `figure.js`, como `canopy()` do protótipo, com as elipses ordenadas por y.

- [ ] **Step 1: Write failing test** em `tests/pixel-figure.test.mjs`:

```js
test('canopy is stable per seed', () => {
  assert.deepEqual(canopyParts(9, 5, 9, 7, -9), canopyParts(9, 5, 9, 7, -9));
  assert.notDeepEqual(canopyParts(9, 5, 9, 7, -9), canopyParts(9, 6, 9, 7, -9));
});
```

- [ ] **Step 2: Run** `node --test tests/pixel-figure.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement:**
  - **Árvore `broad`:** tronco em `capsulePart`, na família `leather`, mais `canopyParts(round(h/5), seed, h·.3, h·.18, -h·.62)`, em `green`.
  - **Arbusto:** `canopyParts(9, seed, 9·k, 7·k, -9·k)`.
  - **Luz e clima:**
    - o mesmo `shift` de clima;
    - `rim` só de dia;
    - luz pelo astro.
  - **Cache:** grade rasterizada por `(seed, h, mood)` dentro do quadro; nada guardado entre quadros.
- [ ] **Step 4: Render** `smoke-kit` (campo, floresta, cidade) e abra. Expected:
  - copas com tufos e contorno como no protótipo;
  - camadas de longe ainda em silhueta;
  - à noite, escuras sem borda clara.
- [ ] **Step 5: Run** `node --test tests/pixel-figure.test.mjs`, `npm test` e `npm run test:visual`. Expected: PASS. Meça o tempo de `--sheet` antes e depois: no máximo +30%.
- [ ] **Step 6: Commit** `feat: pixel tufted canopies and bushes`.

### Task 8: Aceite

**Files:** `docs/VALIDATION.md` (uma entrada curta)

- [ ] **Step 1:**
  - Na `fixtures/episodes/demo` em `pixel`, use pelo menos `walk`, `talk`, `cheer` e `run`.
  - `node scripts/episode.mjs fixtures/episodes/demo`.
  - `verify-video` aprovado e `decoded-sheet.png` aberto.
- [ ] **Step 2:** Monte `out/check/fig/compare.png` com:
  - a v5 do protótipo (`node scripts/pixel-demo.mjs --top=4 --bottom=5 --at=6 --scale=4`);
  - o elenco real em `cheer`, `run`, `point` e `lie`;
  - recortes de `docs/arquivos/pixel_exemplos/images.jpg` e `m8ehkzge45361.png`;
  - tudo ampliado sem suavizar.

  Anote o que ficou igual, melhor e pior.
- [ ] **Step 3:**
  - `npm test` e `npm run test:visual`. Expected: PASS.
  - `git status --porcelain data/ out/ src/episodes.js`. Expected: vazio.
  - Registre em `docs/VALIDATION.md`.
  - Commit `docs: pixel figure v5 acceptance`.

## Fora deste plano

- Rosto de frente e de costas: o boneco é sempre de três quartos.
- Armas, golpes e efeitos de impacto.
- Serra com face clara e neve e nuvens em tufos do protótipo v4: as nuvens do kit já têm forma própria; voltam se a Task 8 mostrar que destoam.
- Formato vertical 9:16.
- Capuz em mapa melhor: o `hood` atual emoldura o rosto em 3 mechas grandes; um mapa mais desenhado fica para depois (pedido em 31/10/2026).
