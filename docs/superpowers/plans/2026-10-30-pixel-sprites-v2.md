# Pixel sprites v2 (bonecos de pixel art por código) Implementation Plan

> **Substituído (30/10/2026):** a Task 1 (spike) foi feita; as Tasks 2 a 5 saem e dão lugar a `docs/superpowers/plans/2026-10-30-pixel-figura-v5.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Os bonecos do `pixel` chegam perto da qualidade de `docs/arquivos/pixel_exemplos/Robert vs pixel art AI Video.mp4`:
- de 40 a 44 px de altura;
- cabeça grande com rosto de verdade;
- cabelo e roupa recortados;
- 3 tons por material e contorno de 1 px;
- poses fortes.

O desenho continua por código, quadro a quadro, e cada quadro continua função pura de `t`.

**Architecture:**
- **Pixel art como dado em código:** cabeça, tronco, mãos e botas são bitmaps em texto num arquivo novo, `src/styles/pixel/sprites.js`. Cada caractere é um material e um tom.
- **Esqueleto:** o de sempre (`creaturePose`). Ele posiciona os sprites pelas juntas, e os membros continuam traços com 2 tons.
- **Ações novas:** entram no kit (`src/episode/kit.js`), que é independente de estilo; `flat`, `watercolor` e `debug` as desenham pela pose.
- **Portão:** a Task 1 é um spike com go/no-go do usuário. Nada depois dela começa sem aprovação.

**Tech Stack:** Canvas2D, `node:test` com `vm` (padrão de `tests/cartoon-parts.test.mjs`), Puppeteer-core e FFmpeg.

**Spec:** este plano é o spec. A conversa de 29/10/2026 está resumida em "Contexto". Contratos: `src/styles/AGENTS.md` ("Cena K") e `src/styles/pixel/GUIDE.md`. Plano anterior: `docs/superpowers/plans/2026-10-29-acabamento-pixel.md`.

## Contexto (análise do vídeo de referência)

- **Formato:** 720×1280, 24 fps, 10 s. É gerado por IA, não é pixel art de verdade:
  - grade de 4 a 5 px borrada;
  - letras das teclas mudando entre quadros;
  - espada que some.

  Copie o que é bom (a forma dos bonecos), não os defeitos. O nosso tem de sair mais limpo.
- **Personagens:**
  - cerca de 40 px de arte de altura, com a cabeça entre 35% e 40% dela;
  - 3 a 4 tons por material, com luz de cima;
  - contorno escuro de 1 px;
  - rosto com branco do olho, pupila, sobrancelha e boca;
  - mechas de cabelo, casaco aberto com camiseta, cinto e botas;
  - poses: corrida inclinada, braço amplo, comemoração com braços para cima, cair deitado.
- **Nosso estado depois do acabamento:**
  - boneco de 35 px na grade 320×180 (`texture.scale` 6), cabeça em bloco (`headBox`) com olho de 1×2 px;
  - um tom mais uma sombra de 1 px;
  - ações `stand`, `walk`, `sit`, `read`, `point` e `look-up`;
  - a cabeça não inclina (pendência do acabamento);
  - os corpos `heavy` e `thin`, o capuz e o capacete nunca foram olhados numa folha (pendência);
  - há um salto de cerca de 1 px na cabeça na emenda do loop (pendência; ver o comentário `ponytail:` em `castActor`).
- **Rota descartada:** 3D com shader de pixel (relatório do Gemini em `docs/RELATORIO_PIXEL_ART_VIABILIDADE_2026-10-29.md`). A GPU R9 200 é fraca para WebGL, e malha de primitivas em 40 px fica embolada e sem rosto.

## Decisões

1. **Formato do sprite** (`sprites.js`):
   - `{ w, h, ax, ay, rows: string[] }`, com `rows.length === h` e cada linha com `w` caracteres.
   - `(ax, ay)` é o ponto do sprite que cai sobre a junta âncora.
   - Todo sprite é desenhado de frente para a direita. `facing < 0` espelha em x em torno de `ax`.
2. **Legenda fixa** (`PIXEL_SPRITES.LEGEND`). O tom 0 é o escuro, 1 o médio e 2 o claro.

   | Caractere | Significado |
   | --------- | ----------- |
   | `.` | transparente |
   | `o` | contorno |
   | `1` `2` `3` | pele |
   | `4` `5` `6` | cabelo |
   | `a` `b` `c` | roupa de cima |
   | `d` `e` `f` | calça ou saia |
   | `g` `h` | calçado |
   | `x` `y` | detalhe (cinto, fivela, botão; tons da cor `accent`, por padrão `wing`) |
   | `w` | branco do olho (`eye`) |
   | `#` | pupila e traço do rosto (`black`) |
   | `m` | boca (o tom escuro da pele) |

3. **Rampas:**
   - `rampOf(hex, colors)` devolve `[escuro, médio, claro]`, todas da paleta. O médio é a cor mais próxima; o escuro é a mais próxima da versão escurecida (35% para `#000010`) e mais escura que o médio; o claro é a mais próxima da versão clareada (30% para `#FFF4E0`) e mais clara que o médio. Os dois extremos são diferentes do médio quando a paleta permite.
   - Se faltar tom, o spike pode subir o limite da paleta de 48 para 64 cores (`config.js` e `GUIDE.md`), registrando por quê.
   - O contorno segue a regra atual: `ink` de dia e `stoneDk` à noite.
4. **O que é sprite e o que é traço:**
   - **Sprites:**
     - cabeça com cabelo, por estilo de cabelo e variante de inclinação;
     - rosto por cima da cabeça;
     - tronco por corpo;
     - mão de 3×3 (`open`, `point` com dedo, `fist`);
     - bota.
   - **Traços:** braço, antebraço, coxa e canela continuam traços. Com 2 tons: o lado da luz no médio, o outro no escuro. Contorno de 1 px, como hoje. Nada gira bitmap: sem RotSprite.
5. **Variantes da cabeça:** `headVariant(tilt)` devolve `'up'` se `tilt < -.25`, `'down'` se `tilt > .25` e `'level'` no resto.
   - `up` desenha o rosto 1 px acima, com o queixo à mostra, e o cabelo de trás desce 1 px.
   - Resolve "a cabeça não inclina" do acabamento.
6. **Estilos de cabelo:** `short`, `long`, `bald`, `bun` e `spiky`.
   - `hairOf(actor)` usa `actor.hair` quando existe. Senão, sorteia por `hash` do `id` entre `short`, `long` e `spiky`; o idoso sorteia entre `bald` e `short`.
   - O capuz (`hood`) e o capacete (`helmet`) são cabeças próprias: trocam o cabelo.
   - O chapéu (`hat`) é um sprite por cima de qualquer cabeça.
7. **Rostos:**
   - Olhos por `pose.face.expression`: `neutral`, `curious`, `surprised` (olho maior) e `happy` (arco). Com `blink >= .5`, um traço.
   - Boca por `pose.face.mouth`: `null` (sprite `none`), `m`, `e`, `a` e `o`.
   - O rosto é um sprite de 7×5 no máximo, posto na cabeça pela âncora `face` do sprite da cabeça.
8. **Grade:** o spike renderiza com `texture.scale` 6 (320×180) e 5 (384×216). Na escala 5 o adulto fica com cerca de 42 px, perto da referência.
   - O usuário escolhe no portão.
   - Se escolher 5, a Task 1 deixa `config.js` em 5. As cenas já escalam pela grade (`GW = W / S`), e o `test:visual` confere paleta e grade com `STYLE.texture.scale`.
9. **Ações novas no kit** (Task 3, `ACTIONS` em `kit.js`), todas periódicas em L:
   - `run`: passada mais longa e mais rápida, com o tronco inclinado .15 rad para a frente;
   - `cheer`: os dois braços para cima, pulsando;
   - `talk`: um braço gesticula e a boca cicla entre `a`, `o` e `m`;
   - `kneel`: um joelho no chão;
   - `cower`: agachado, com os braços cobrindo a cabeça;
   - `lie`: deitado no chão, só respirando.

   Os nomes atuais ficam como estão.
10. **Movimento secundário** (Task 4, só `pixel`):
    - **Gear `cape`:** a ponta da capa e do capuz longo balança por função analítica da fase da passada: `sin(2π·fase)` com atraso. É periódica e sem estado.
    - **Poeira:** de 2 a 4 px na troca de pé do `run`, por `hash` da passada.
11. **`parts()`:** continua o contrato do `check-motion`. A cabeça vira o retângulo do sprite desenhado, e as mãos e o tronco, os retângulos deles. Continua com 0 violações.
12. **Personagens originais.** Nada copiado do vídeo nem de terceiros: nem o "Robert", nem o mago encapuzado, nem a armadura laranja. O kit ganha o próprio elenco.

## Global Constraints

- As regras do `CLAUDE.md` continuam valendo:
  - função pura de `t`, sem `Math.random()`, relógio ou estado entre quadros;
  - `src/episode/kit.js` e `src/nature/` não desenham;
  - no `pixel`, só cores da paleta, sem mistura nem transparência intermediária.
- O quadro K continua periódico em L; o teste `every scene and action is periodic in L` vale para as ações novas.
- O `pixel` continua desenhando a pose em 12/s (`onTwos`).
- Sem dependências npm novas. Nada de personagens, nomes ou universos de terceiros.
- Validação de cada tarefa de estilo:
  - `npm test`;
  - `npm run test:visual`;
  - `node scripts/check-motion.mjs --project=smoke-kit --2d --style=<id>` com 0 violações;
  - folhas ampliadas abertas com Read pelo implementador e pelo revisor.
- `out/`, `data/` e `src/episodes.js` ficam fora do git.
- Commits em inglês, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Um escritor por arquivo em cada onda. Os 386 testes atuais continuam passando.

## Review Focus

1. **Espelhamento:** um boneco virado para a esquerda (`dir: -1`) tem o mesmo desenho, espelhado e sem deslocar 1 px do pescoço. Teste `mirrors around the anchor` na Task 1 e folha com os dois sentidos.
2. **Cor do elenco que a paleta não cobre** (pele muito escura, cabelo branco, roupa preta): a rampa sai com 3 tons distintos, ou com o fallback documentado, e o contorno noturno não some. Teste `ramps stay ordered for extreme cast colors` na Task 1 e folha noturna na Task 2.
3. **Emenda do loop com sprites:** a troca de variante de cabeça ou de quadro de rosto não pisca na emenda. Tira de 11.75 a 12 e de 0 a 0.25 em `--loop=kit` e `--loop=cast` nas Tasks 2 e 4.
4. **Ações novas em `flat` e `watercolor`:** `lie` e `cower` não quebram a cabeça escalada nem o chapéu. Folha `--loop=cast` nos 3 estilos na Task 3.
5. **Ator sentado ou deitado perto do primeiro plano:** a margem de 120 px dos `spots` continua valendo para `kneel` e `lie`, que são mais largos. O teste existente da Task 1 do acabamento é estendido na Task 3.

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1 (spike) | opus | high |
| 2 (elenco completo no pixel) | opus | high |
| 3 (ações novas e emenda) | opus | medium |
| 4 (movimento secundário) | opus | medium |
| 5 (aceite) | sessão principal | — |

## Ondas

- A: Task 1, depois **PORTÃO**: pare e mostre ao usuário `out/check/sprites/spike-compare.png`. Ele escolhe entre continuar ou não e entre a escala 6 ou 5.
- B: Tasks 2 e 3 em paralelo. Arquivos distintos: a 2 fica em `src/styles/pixel/`; a 3, em `src/episode/`, `src/nature/`, `fixtures/smoke/kit.js` e testes.
- C: Task 4.
- D: Task 5.

---

### Task 1: Spike: um personagem em sprites (com portão)

**Files:**
- Create: `src/styles/pixel/sprites.js`, `tests/pixel-sprites.test.mjs`
- Modify:
  - `src/styles/pixel/config.js`: `scripts` com `sprites.js` antes de `draw.js`; `texture.scale` só depois do portão;
  - `src/styles/pixel/draw.js`: `doll` e `parts` usam os sprites;
  - `fixtures/smoke/kit.js`: `LOOPS.cast`;
  - `src/styles/pixel/GUIDE.md`.

**Interfaces:**
- Produces, em `sprites.js` (script clássico, sem `import`, como `cartoon/parts.js`):
  - `PIXEL_SPRITES = { LEGEND, heads: { [hair]: { level, up, down, lie? } }, hats, faces: { eyes: {...}, mouths: {...} }, torsos: { [body]: sprite }, hands: { open, point, fist }, boots }`;
  - `spriteCells(sprite, flip: boolean) -> [{ x, y, ch }]`, em coordenadas relativas à âncora, sem `.`;
  - `rampOf(hex: string, colors: string[]) -> [dark, mid, light]`;
  - `headVariant(tilt: number) -> 'up' | 'level' | 'down'`;
  - `hairOf(actor) -> 'short' | 'long' | 'bald' | 'bun' | 'spiky'`.
- Produces, em `fixtures/smoke/kit.js`, `LOOPS.cast`:
  - uma prova de elenco de `L = 12` s;
  - o campo de dia, 3 atores por plano de 2 s;
  - os 5 corpos e o gear `hat`, `backpack`, `hood` e `helmet`;
  - as ações atuais.
  - A lista de planos é `EST.CAST` (array), para a Task 3 estender.

No spike, só o necessário para um personagem adulto original (`short`, as 3 variantes, rosto completo, `adult`, mãos e bota). A Task 2 completa o resto.

- [ ] **Step 1: Write failing tests** em `tests/pixel-sprites.test.mjs`:

```js
const ctx = vm.createContext({});
vm.runInContext(readFileSync('src/styles/pixel/sprites.js', 'utf8') + '\nthis.S = { PIXEL_SPRITES, spriteCells, rampOf, headVariant, hairOf };', ctx);
const { PIXEL_SPRITES: PS, spriteCells, rampOf, headVariant, hairOf } = ctx.S;
const all = (o, out = []) => { if (o && Array.isArray(o.rows)) out.push(o); else if (o && typeof o === 'object') Object.values(o).forEach(v => all(v, out)); return out; };
test('every sprite is well formed', () => {
  for (const s of all(PS)) {
    assert.equal(s.rows.length, s.h);
    for (const r of s.rows) { assert.equal(r.length, s.w); for (const ch of r) assert.ok(ch in PS.LEGEND, ch); }
    assert.ok(s.ax >= 0 && s.ax < s.w && s.ay >= 0 && s.ay < s.h);
  }
});
test('mirrors around the anchor', () => {
  const h = PS.heads.short.level, a = spriteCells(h, false), b = spriteCells(h, true);
  assert.equal(a.length, b.length);
  for (const c of a) assert.ok(b.some(d => d.x === -c.x && d.y === c.y && d.ch === c.ch));
});
test('ramps stay ordered for extreme cast colors', () => {
  const pal = ['#000000', '#29304A', '#3A2A1E', '#6B4A33', '#C68A62', '#E0B48E', '#F6E8C3', '#D8D4CC', '#8A8F9C', '#3F6E9A', '#B1D9E8'];
  const lum = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).reduce((s, v, i) => s + v * [.3, .59, .11][i], 0);
  for (const c of ['#3A2A1E', '#D8D4CC', '#111111', '#C68A62']) {
    const [d, m, l] = rampOf(c, pal);
    assert.ok([d, m, l].every(x => pal.includes(x)));
    assert.ok(lum(d) <= lum(m) && lum(m) <= lum(l));
  }
});
test('head variant and hair are stable', () => {
  assert.equal(headVariant(-.6), 'up'); assert.equal(headVariant(0), 'level'); assert.equal(headVariant(.4), 'down');
  assert.equal(hairOf({ id: 'x', hair: 'bun' }), 'bun');
  assert.equal(hairOf({ id: 'viajante', pose: { body: 'adult' } }), hairOf({ id: 'viajante', pose: { body: 'adult' } }));
});
```

- [ ] **Step 2: Run** `node --test tests/pixel-sprites.test.mjs`. Expected: FAIL (o arquivo não existe).
- [ ] **Step 3: Implement** `sprites.js` com o mínimo do spike.
  - Desenhe as linhas olhando a referência ampliada. Para extrair os quadros:
    - `ffmpeg -ss 3.3 -i "docs/arquivos/pixel_exemplos/Robert vs pixel art AI Video.mp4" -frames:v 1 -vf "crop=300:200:130:760,scale=1200:800:flags=neighbor" out/check/sprites/ref-chars.png`;
    - o mesmo comando com `-ss 8.2` (comemoração) e `-ss 9.3` (deitados).
  - A cabeça adulta fica entre 13 e 15 px de largura e entre 13 e 16 de altura na escala 5, e cerca de 2 px menor na escala 6. Cada uma é uma variante desenhada, não ampliada.
- [ ] **Step 4: Implement** `doll` em `draw.js`:
  - membros com 2 tons (decisão 4), da rampa de `rampOf` sobre `COLORS`;
  - tronco, cabeça, rosto, mãos e bota via `spriteCells` nas juntas;
  - `pieces`, `headBox` e `reach` continuam, com `headBox` medindo o sprite;
  - `parts()` segue a decisão 11.
- [ ] **Step 5: Implement** `LOOPS.cast` em `fixtures/smoke/kit.js`, com `EST.CAST`.
- [ ] **Step 6: Run** `node --test tests/pixel-sprites.test.mjs` (PASS), `npm test` (PASS) e `node scripts/check-motion.mjs --project=smoke-kit --2d --style=pixel` (0 violações).
- [ ] **Step 7: Spike sheet:**
  - Renderize `node render.mjs --project=smoke-kit --style=pixel --loop=cast --stills=0.5,2.5,4.5,6.5,8.5,10.5 --out=out/check/sprites/s6`.
  - Repita com `texture.scale` 5, via a mudança temporária em `config.js` que só fica se o usuário escolher, e saída em `out/check/sprites/s5`.
  - Monte `out/check/sprites/spike-compare.png`:
    - em cima, `ref-chars.png`;
    - no meio, o adulto em `stand`, `walk`, `point` e `look-up` na escala 6, cortado e ampliado 4× com `flags=neighbor`;
    - embaixo, o mesmo na escala 5;
    - montagem com `ffmpeg ... hstack/vstack`.
  - Abra e compare.
  - Expected: rosto legível (olhos, boca), cabelo com mechas, 3 tons visíveis, contorno fechado, `look-up` com a cabeça visivelmente para cima, e nenhum pixel solto.
- [ ] **Step 8: Commit** `feat: pixel sprite spike (one character)`.
- [ ] **Step 9: PORTÃO.** Pare. Mostre ao usuário o caminho da folha, numa frase o que ficou perto e o que ficou longe da referência, e a pergunta: "segue? escala 6 ou 5?". Se for 5, faça um commit `feat: pixel grid scale 5` com o `config.js`. Se não seguir, a branch fica sem merge.

### Task 2: Elenco completo no pixel

**Files:**
- Modify: `src/styles/pixel/sprites.js`, `src/styles/pixel/draw.js`, `src/styles/pixel/GUIDE.md`
- Test: `tests/pixel-sprites.test.mjs`

**Interfaces:**
- Consumes: os nomes da Task 1. O campo `actor.hair` (string ou `undefined`) vem do kit pela Task 3; até lá, `hairOf` sorteia.
- Produces:
  - todos os sprites das decisões 4 a 7: 5 cabelos × 3 variantes, `hood`, `helmet`, `hat`, 5 troncos, as 3 mãos e o rosto completo;
  - o desenho de `kneel` e `cower` sai das juntas, sem sprite próprio;
  - `lie` usa a variante `lie`, uma cabeça deitada desenhada para cada cabelo, escolhida quando `actor.lying === 1`. Nada gira bitmap.

- [ ] **Step 1: Test:**

```js
test('cast set is complete', () => {
  for (const h of ['short', 'long', 'bald', 'bun', 'spiky', 'hood', 'helmet']) for (const v of ['level', 'up', 'down', 'lie']) assert.ok(PS.heads[h][v], h + v);
  for (const b of ['adult', 'child', 'elder', 'heavy', 'thin']) assert.ok(PS.torsos[b], b);
  for (const e of ['neutral', 'curious', 'surprised', 'happy', 'blink']) assert.ok(PS.faces.eyes[e], e);
  for (const m of ['none', 'm', 'e', 'a', 'o']) assert.ok(PS.faces.mouths[m], m);
});
```

- [ ] **Step 2: Run** `node --test tests/pixel-sprites.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** os sprites e o uso em `draw.js`.
- [ ] **Step 4: Render and look:**
  - `--loop=cast` de dia e à noite (o plano noturno do `EST.CAST`);
  - a folha de `smoke-kit` com `--stills` por cena;
  - folha com os dois sentidos (`dir` ±1).

  Expected:
  - os 5 corpos distintos de longe;
  - capuz e capacete ajustados;
  - cabelo branco do idoso legível à noite;
  - rosto sem "focinho";
  - nenhum braço atravessando a cabeça.
- [ ] **Step 5: Emenda:** a tira de 11.75 a 12 e de 0 a 0.25 em `--loop=kit` e `--loop=cast`. Expected: sem pisca de variante.
- [ ] **Step 6: Run** `npm test`, `npm run test:visual` e `check-motion` (0 violações).
- [ ] **Step 7: Commit** `feat: pixel sprite cast (bodies, hair, faces, gear)`.

### Task 3: Ações novas no kit e emenda sem salto

**Files:**
- Modify:
  - `src/episode/kit.js`: `ACTIONS`, `castActor`, e `hair` passado do membro do elenco (`member.hair`, validado contra os 5 nomes);
  - `src/nature/creature.js`: tempo periódico `o.loop` no micro-ajuste da cabeça e do cabelo;
  - `fixtures/smoke/kit.js`: planos novos no `EST.CAST`;
  - `src/styles/AGENTS.md`: ações e campo `hair`.
- Test: `tests/episode-kit.test.mjs`, `tests/nature-creature.test.mjs`

**Interfaces:**
- Consumes: `turnHead`, `handTo`, `stepTo` e `lowered` de `src/nature/skeleton.js`, e `creaturePose` de `creature.js`.
- Produces:
  - `ACTIONS` com `run`, `cheer`, `talk`, `kneel`, `cower` e `lie`;
  - `actor.role` com esses nomes;
  - `actor.hair`;
  - em `lie`, `actor.lying = 1`, com as juntas giradas em torno da pelve até o corpo ficar no chão.
  - `creaturePose(spec, { ..., loop })`: com `loop` (em s), todo `noise1(t)` interno usa tempo periódico em `loop`.

- [ ] **Step 1: Write failing tests:**
  - estenda `every scene and action is periodic in L` para iterar sobre `['walk', 'stand', 'point', 'run', 'cheer', 'talk', 'kneel', 'cower', 'lie']` nas exteriores;
  - adicione os testes abaixo.

```js
test('new actions have their shape', () => {
  const one = (action, t = 3) => kitFrame({ scene: 'campo', params: P, cast: [{ id: 'a', body: 'adult' }], actors: [{ cast: 'a', action, at: .5, dir: 1 }] }, t, 12).actors[0];
  const run = one('run'), J = run.pose.joints; assert.ok(J.neck[0] - J.pelvis[0] > 0, 'tronco inclinado para a frente');
  const ch = one('cheer').pose.joints; assert.ok(ch.handL[1] < ch.headTop[1] && ch.handR[1] < ch.headTop[1], 'mãos acima da cabeça');
  const lie = one('lie'); assert.equal(lie.lying, 1); assert.ok(Math.abs(lie.pose.joints.headTop[1] - lie.pose.joints.pelvis[1]) < 40, 'deitado');
  const k = one('kneel').pose.joints; assert.ok(Math.min(k.kneeL[1], k.kneeR[1]) > k.pelvis[1] + 30);
  assert.ok(['a', 'o', 'm'].includes(one('talk', 1.2).pose.face.mouth));
});
test('head is seamless at the loop seam', () => {
  const head = t => kitFrame({ scene: 'campo', params: P, cast: [{ id: 'a', body: 'adult' }], actors: [{ cast: 'a', action: 'stand', at: .5, dir: 1 }] }, t, 12).actors[0].pose.joints.headTop;
  const [a, b] = [head(0), head(12 - 1e-6)]; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < .5);
});
test('hair passes through and is validated', () => {
  const a = kitFrame({ scene: 'campo', params: P, cast: [{ id: 'a', body: 'adult', hair: 'bun' }], actors: [{ cast: 'a', action: 'stand', at: .5, dir: 1 }] }, 1, 12).actors[0];
  assert.equal(a.hair, 'bun');
  assert.throws(() => kitFrame({ scene: 'campo', params: P, cast: [{ id: 'a', body: 'adult', hair: 'mohawk' }], actors: [{ cast: 'a', action: 'stand', at: .5, dir: 1 }] }, 1, 12));
});
```

  - Adicione `kneel` e `lie` ao teste do primeiro plano de 120 px, com a meia largura do corpo de `.5 * size`.

  `P` é o mesmo do arquivo. Ajuste o formato de chamada de `kitFrame` ao que o arquivo já usa.
- [ ] **Step 2: Run** `node --test tests/episode-kit.test.mjs tests/nature-creature.test.mjs`. Expected: FAIL nos novos.
- [ ] **Step 3: Implement** as ações:
  - `run`: `moving: 1`, com stride e período próprios e inclinação .15 rad;
  - `cheer` e `talk`: gestos com `handTo`, pulsando com `cyc(phase, per(L, ...))`;
  - `kneel` e `cower`: `lowered` mais `stepTo`;
  - `lie`: rotação pura das juntas em torno da pelve, mais a respiração.

  Depois, `o.loop` em `creaturePose`, e remova o comentário `ponytail:` de `castActor`.
- [ ] **Step 4: Run** os testes do Step 2 (PASS) e `npm test` (PASS).
- [ ] **Step 5: Render** `--loop=cast` em `debug`, `flat` e `watercolor`, e abra. Expected: as 6 ações legíveis nos 3 estilos; cabeça, chapéu e capuz no lugar em `lie` e `cower`.
- [ ] **Step 6: Run** `check-motion` em `debug`, `flat` e `watercolor` (0 violações) e `npm run test:visual`.
- [ ] **Step 7: Commit** `feat: kit run, cheer, talk, kneel, cower and lie actions`.

### Task 4: Movimento secundário e poeira no pixel

**Files:**
- Modify:
  - `src/episode/kit.js`: só `GEAR` ganha `cape`, uma linha;
  - `src/styles/pixel/sprites.js`: sprite de capa em 3 quadros de balanço;
  - `src/styles/pixel/draw.js`, `src/styles/pixel/GUIDE.md`;
  - `fixtures/smoke/kit.js`: um plano com `cape` e `run` no `EST.CAST`.
- Test: `tests/pixel-sprites.test.mjs`

**Interfaces:**
- Consumes: `run` e `actor.role` da Task 3, e os sprites da Task 2.
- Produces: `capeFrame(phase: number) -> 0 | 1 | 2`, puro e periódico em 1.

- [ ] **Step 1: Test** `capeFrame` periódico: `capeFrame(0) === capeFrame(1)`, e assume os 3 valores em [0, 1).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement:**
  - a capa atrás do tronco, com o quadro escolhido por `capeFrame` da fase da passada, atrasada .15;
  - a poeira de 2 a 4 px na troca de pé do `run`, por `hash`;
  - a capa também em `flat` e `watercolor`? Não: nesses estilos o `cape` é ignorado, e isso fica registrado em `AGENTS.md`.
- [ ] **Step 4: Render** `--loop=cast` e a tira da emenda. Expected: a capa balança sem pular na emenda e a poeira não fica parada no ar.
- [ ] **Step 5: Run** `npm test`, `npm run test:visual` e `check-motion` (0 violações).
- [ ] **Step 6: Commit** `feat: pixel cape sway and run dust`.

### Task 5: Aceite

**Files:** `docs/VALIDATION.md` (uma entrada curta).

- [ ] **Step 1:**
  - Na `fixtures/episodes/demo` em `pixel`, troque uma das ações por `talk` e outra por `run`, se a demo não tiver.
  - `node scripts/episode.mjs fixtures/episodes/demo`.
  - `verify-video` aprovado e `decoded-sheet.png` aberto.
- [ ] **Step 2:**
  - Monte `out/check/sprites/compare-v2.png`: a referência (`ref-chars.png` e o quadro da comemoração) contra o nosso elenco em `cheer`, `run` e `lie`, ampliado 4× sem suavizar.
  - Monte também a folha `--loop=cast` completa: a ficha do elenco que ficou faltando no acabamento.
  - Anote o que ficou igual, melhor e pior.
- [ ] **Step 3:**
  - `npm test` e `npm run test:visual`. Expected: PASS.
  - `git status --porcelain data/ out/ src/episodes.js`. Expected: vazio.
  - Registre em `docs/VALIDATION.md`.
  - Commit `docs: pixel sprites v2 acceptance`.

## Fora deste plano

- A casa da cena noturna maior e mais perto (pendência do acabamento): um ajuste de kit sem relação com sprites.
- Limpeza de `tmp/` e `.review` do acervo.
- Espada, rastro de golpe e brilho de arma: só quando um roteiro pedir.
- Formato vertical 9:16 (Shorts).
