# Vídeos longos animados e narrados — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task, with the model and effort declared per task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pipeline gratuito e local que transforma um tema em vídeo de 8–10 min narrado em pt-BR, com seres de qualquer espécie (humanos, quadrúpedes, insetos, aranhas, aves, peixes) em movimento realista e ambiente que reage, em cartoon e aquarela.

**Architecture:** A geometria do movimento vive em `src/nature/`: funções puras de `t`, sem desenho. Um único `creaturePose(spec, o)` anima qualquer ser descrito por uma especificação de dados (coluna, membros, marcha, apêndices, rosto). Cada estilo implementa duas portas com os mesmos nomes: `Kit` (primitivas, câmera, texto, transições) e `NatureArt` (seres e ambiente). A narração é sintetizada frase a frase com Piper, o que fixa os tempos. Um gerador transforma `episode.json` + `timing.json` em projeto registrado, SRT e texto de publicação.

**Tech Stack:** Node 24 (`node --test`, `node:vm`), Canvas2D (cartoon), p5.brush (aquarela, existente), Piper TTS (`python -m piper`, Python 3.11), FFmpeg/FFprobe, puppeteer-core (existente via `render.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-22-documentarios-animados-design.md`

## Execução: modelos e esforço

Sessão coordenadora: **Opus 5.5, effort medium**. Ela não escreve código de tarefa: despacha cada tarefa para um subagente com o modelo e o effort da tabela, confere testes e evidências, faz commit e para nos pontos de aprovação.

| Task | Implementador | Revisão |
|---|---|---|
| 1 Base | Sonnet 5.5 · low | coordenador roda `npm test` |
| 2 Ruído e caminhos | Sonnet 5.5 · medium | coordenador |
| 3 Marchas e IK | Opus 5.5 · high | Sonnet 5.5 · medium (só leitura) |
| 4 Seres (`creaturePose` + specs) | Opus 5.5 · high | Opus 5.5 · medium (só leitura) |
| 5 Ambiente | Sonnet 5.5 · medium | coordenador |
| 6 Kit cartoon | Sonnet 5.5 · medium | coordenador |
| 7 NatureArt cartoon | Opus 5.5 · high | coordenador abre as folhas |
| 8 Filme de teste | Opus 5.5 · high | coordenador abre as tiras + usuário |
| 8b Direção de arte do cartoon | Opus 5.5 · high | coordenador abre as folhas + usuário |
| 9 Narração | Sonnet 5.5 · medium | coordenador |
| 10 Gerador de episódios | Sonnet 5.5 · medium | coordenador |
| 11 Mixagem | Sonnet 5.5 · low | coordenador |
| 12 Tema, pesquisa e roteiro | Opus 5.5 · high | usuário |
| 13 Narração do piloto | Sonnet 5.5 · low | coordenador ouve trechos |
| 14 Guia do episódio | Opus 5.5 · medium | coordenador |
| 15 Capítulos (paralelo, no máximo 3 ao mesmo tempo) | Opus 5.5 · medium cada | coordenador abre as folhas |
| 16 Montagem e entrega | Sonnet 5.5 · medium | coordenador + usuário |
| 17 Aquarela | Opus 5.5 · high | coordenador abre as folhas |
| 18 Piloto em aquarela | Sonnet 5.5 · low (render em segundo plano) | coordenador + usuário |
| 19 Rotina e bíblia do canal | Sonnet 5.5 · medium | coordenador |
| Revisão final do branch | Opus 5.5 · high (só leitura) | — |

Regras de economia: o subagente recebe só o texto da sua tarefa, as Global Constraints e os blocos Interfaces de que depende, nunca o plano inteiro. Um escritor por arquivo. Revisores não editam. Ao retomar, confira arquivos e `git log`, não resumos. Se uma tarefa falhar duas vezes no mesmo ponto, pare e reporte ao usuário.

## Global Constraints

- Cada quadro é função pura de `t`: sem `Math.random()`, `Date`, `performance.now()` em cena, sem estado entre quadros. Use `hash()` (`src/motion.js`) e `noise1()` (`src/nature/noise.js`).
- `src/nature/*.js` são scripts clássicos (funções globais, como `src/motion.js`), carregáveis no navegador e em `vm`. Nada de desenho neles.
- Coordenadas 2D: 1920×1080, origem no canto superior esquerdo, Y para baixo. Ângulos em radianos.
- Unidade de ser: BL (comprimento de referência da especificação: corpo para animais, altura para humanos). `creaturePose` recebe `size` = BL em pixels.
- Saída: 1920×1080, 24 fps, H.264, áudio AAC; −14 LUFS integrados, pico −1,5 dBTP.
- Voz `pt_BR-faber-medium`. Pausas: 0,25 s antes da primeira frase do plano, 0,35 s entre frases, 0,8 s depois do plano, 1,6 s entre capítulos. Plano sem narração: `hold` (padrão 3 s).
- Limites de plano na grade de quadros: `Math.round(t * fps) / fps`.
- Legenda: no máximo 42 caracteres por linha e 2 linhas por cue; UTF-8.
- Desempenho: cartoon ≤ 80 ms por quadro; aquarela ≤ 1,5 s por quadro.
- Não copie código do PDoomVideo (sem licença) nem do Eidoverse (AGPLv3).
- Mensagens de erro em português. Commits `feat:`/`fix:`/`test:`/`docs:`/`chore:` com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Tempos longos (t ≈ 600 s, s ≈ 5.000 BL):** marcha e ruído contínuos. Teste em `tests/nature-gait.test.mjs` (`gait stays continuous at large distances`).
2. **Render fora de ordem:** `creaturePose`, `rain`, `crowd` iguais em qualquer ordem de chamada. Testes em `tests/nature-creature.test.mjs` e `tests/nature-env.test.mjs`.
3. **Texto com acentos, números e aspas:** narração e SRT preservam UTF-8. Teste em `tests/episodes.test.mjs` (`srt keeps accents and wraps lines`).
4. **Plano sem narração e virada de capítulo:** duração positiva e storyboard válido. Teste em `tests/narration.test.mjs` (`silent shots and chapter pauses produce a valid timeline`).
5. **Ser parado ou no fim do caminho:** todos os pés no chão. Teste em `tests/nature-creature.test.mjs` (`stopped creatures keep every foot on the ground`), para todas as especificações com pernas.

---

## Fase A — Base

### Task 1: Ponto de partida e carregamento de episódios

**Files:**
- Modify: `src/styles/cartoon/config.js`, `src/styles/watercolor/config.js` (paleta)
- Modify: `src/timeline.js` (`shotsById`)
- Modify: `scripts/render-lib.mjs:12-16` (`catalog()` carrega `src/episodes.js` se existir)
- Modify: `studio.html` (`src/episodes.js` depois de `src/config.js`)
- Create: `src/episodes.js` (gerado; por enquanto só o cabeçalho), `src/episodes/placeholder.js`
- Modify: `.gitignore` (`tools/piper-voices/`)
- Test: `tests/episodes.test.mjs`

**Interfaces:**
- Produces: chaves de paleta nos dois estilos: `ground, groundDk, grass, grassDk, leaf, leafDk, water, sky, skyTop, skyLow, skin, skinDk, hair, cloth, clothDk, fur, furDk, chitin, chitinDk, wood, stone`.
- Produces: `shotsById(map: {[shotId]: (t, lt, dur) => void}): void` em `src/timeline.js`. Busca cada ID em `PROJECT.storyboard` e chama `shots([[start, fn]])`. ID desconhecido lança `Error('Plano desconhecido: <id>')`.
- Produces: `src/episodes/placeholder.js`, último script de todo episódio, registra para cada plano sem função uma função que desenha `Kit.gradient(STYLE.palette.skyTop, STYLE.palette.skyLow)` e `Kit.text(shot.event, 960, 540, 40, STYLE.palette.ink, {k: 1})`. Funciona a partir do Task 6.

- [ ] **Step 1:** O coordenador pergunta ao usuário se pode commitar o estado atual não commitado. Com autorização: `git add -A && git commit -m "chore: snapshot before narrated video pipeline"`.
- [ ] **Step 2: Write the failing tests** em `tests/episodes.test.mjs`:

```js
test('both 2D styles expose the shared palette keys', () => {
  const p = catalog();
  for (const style of ['cartoon', 'watercolor']) for (const key of ['ground','groundDk','grass','grassDk','leaf','leafDk','water','sky','skyTop','skyLow','skin','skinDk','hair','cloth','clothDk','fur','furDk','chitin','chitinDk','wood','stone'])
    assert.match(p.styles[style].config.palette[key], /^#[\da-f]{6}$/i, `${style}.${key}`);
});
test('shotsById maps storyboard ids to start times and rejects unknown ids', () => {
  // contexto vm: projectConfig = catalog().resolveProject('visit','cartoon'); carrega motion.js e timeline.js
  vm.runInContext("shotsById({ goodbye: () => {} })", ctx);
  assert.equal(vm.runInContext('SHOTS[0][0]', ctx), 3);
  assert.throws(() => vm.runInContext("shotsById({ nope: () => {} })", ctx), /Plano desconhecido/);
});
```

- [ ] **Step 3:** `node --test tests/episodes.test.mjs` → FAIL.
- [ ] **Step 4:** Implementar. A aquarela já tem `sky`; mantenha o valor existente.
- [ ] **Step 5:** `npm test` e `npm run test:visual` → PASS.
- [ ] **Step 6: Commit** `feat: shared palette keys, shotsById and episode loading`.

---

## Fase B — Geometria do movimento (`src/nature/`)

Helper de teste (criado no Task 2): `tests/nature-helpers.mjs` exporta `natureContext(files)`, que monta um contexto `vm` com `projectConfig = catalog().resolveProject('visit','cartoon')` e `window: {}`, e carrega `src/motion.js` e os arquivos pedidos.

### Task 2: Ruído e caminhos

**Files:** Create `src/nature/noise.js`, `src/nature/path.js`, `tests/nature-helpers.mjs`. Test `tests/nature-path.test.mjs`.

**Interfaces:**
- Produces: `noise1(seed, x): number` em [−1, 1], contínuo; interpolação cosseno entre `hash(seed * 1013 + i) * 2 - 1` nos inteiros. `fbm1(seed, x, octaves = 3)`.
- Produces: `makePath(points: [x, y][]): {length, at(d): {x, y, angle}}`. Catmull-Rom, tabela de arco com 64 amostras por segmento, `d` limitado a `[0, length]`.
- Produces: `travel(t, keys: [t, s][]): {s, speed, moving}`. `s = kf(t, keys)`, `speed` por diferença central com `h = 1/48`, `moving = clamp(|speed| / .3)`.

- [ ] **Step 1: Write the failing tests:**

```js
test('noise1 is continuous, bounded and order independent', () => {
  for (let x = 0; x < 50; x += .37) { const v = ctx.noise1(7, x); assert.ok(v >= -1 && v <= 1); assert.ok(Math.abs(ctx.noise1(7, x + 1e-4) - v) < 1e-2); }
  const a = ctx.noise1(3, 12.5); ctx.noise1(3, 900); assert.equal(ctx.noise1(3, 12.5), a);
});
test('makePath walks by arc length and clamps the ends', () => {
  const p = ctx.makePath([[0, 0], [100, 0], [200, 0]]);
  assert.ok(Math.abs(p.length - 200) < .5); assert.ok(Math.abs(p.at(50).x - 50) < .5);
  assert.equal(p.at(-10).x, p.at(0).x); assert.equal(p.at(1e6).x, p.at(p.length).x); assert.ok(Math.abs(p.at(100).angle) < 1e-3);
});
test('travel reports zero motion while holding', () => {
  const r = ctx.travel(5, [[0, 0], [2, 4], [6, 4]]); assert.equal(r.s, 4); assert.equal(r.moving, 0);
  assert.ok(ctx.travel(1, [[0, 0], [2, 4]]).moving > 0);
});
```

- [ ] **Step 2:** `node --test tests/nature-path.test.mjs` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5: Commit** `feat: deterministic noise, arc-length paths and travel helper`.

### Task 3: Marchas e cinemática inversa

**Files:** Create `src/nature/gait.js`. Test `tests/nature-gait.test.mjs`.

**Interfaces:**
- Consumes: `lerp`, `clamp`, `ease`.
- Produces: `GAITS = {bipedWalk, bipedRun, quadWalk, trot, tripod, spider}`, cada um `{duty, offsets: {[limb]: phase}}` com os valores do spec (bípede `L: 0, R: .5`; quadrúpede passo `RH: 0, RF: .25, LH: .5, LF: .75`; trote `LF: 0, RH: 0, RF: .5, LH: .5`; trípode `L1, R2, L3: 0` e `R1, L2, R3: .5`; aranha `L1, R2, L3, R4: 0` e `R1, L2, R3, L4: .5`; duty 0,6 / 0,35 / 0,7 / 0,5 / 0,6 / 0,6).
- Produces: `limbCycle(s, offset, stride, duty): {k, f, stance, u}`.
- Produces: `footAt(s, offset, o: {stride, duty, lift, moving, plant: (sAnchor) => [x, y]}): {pos, stance, lift}`.
- Produces: `ik2(root, end, l1, l2, bend: 1 | -1): {mid, end}`. Fora do alcance, o ponto final é trazido para `0,999 × (l1 + l2)`.

Algoritmo (decide o pé sem deslizar):

```text
c = s / stride + offset;  k = floor(c);  f = c - k
stance = f < duty;  u = stance ? f / duty : (f - duty) / (1 - duty)
âncora do apoio k:  aK(k) = (k - offset) * stride + duty * stride / 2
apoio:   pos = plant(aK(k)), lift = 0
balanço: pos = lerp(plant(aK(k)), plant(aK(k + 1)), ease(u)) e lift = o.lift * sin(PI * u) * o.moving
```

- [ ] **Step 1: Write the failing tests:**

```js
const plant = a => [a * 100 + 7, 300], O = { stride: 1, duty: .6, lift: 12, moving: 1, plant };
test('gait tables match the spec', () => {
  assert.equal(ctx.GAITS.tripod.offsets.L1, ctx.GAITS.tripod.offsets.R2); assert.notEqual(ctx.GAITS.tripod.offsets.L1, ctx.GAITS.tripod.offsets.R1);
  assert.equal(ctx.GAITS.trot.offsets.LF, ctx.GAITS.trot.offsets.RH); assert.equal(ctx.GAITS.quadWalk.offsets.RF, .25);
});
test('a planted foot does not slide during stance', () => {
  let first = null;
  for (let s = 2; s < 2.59; s += .05) { const r = ctx.footAt(s, 0, O); if (!r.stance) continue; first ??= r.pos; assert.deepEqual(r.pos, first); }
  assert.ok(first);
});
test('feet are continuous across stance and swing boundaries', () => {
  for (const s of [2.6, 3, 3.1, 3.5]) { const a = ctx.footAt(s - 1e-6, .5, O).pos, b = ctx.footAt(s + 1e-6, .5, O).pos; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < .01, `salto em ${s}`); }
});
test('gait stays continuous at large distances', () => {
  const a = ctx.footAt(5000.3, .25, O).pos, b = ctx.footAt(5000.3 + 1e-5, .25, O).pos; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < .05);
});
test('ik2 keeps bone lengths and clamps unreachable targets', () => {
  const r = ctx.ik2([0, 0], [30, 40], 35, 38, 1);
  assert.ok(Math.abs(Math.hypot(...r.mid) - 35) < 1e-6); assert.ok(Math.abs(Math.hypot(r.end[0] - r.mid[0], r.end[1] - r.mid[1]) - 38) < 1e-6);
  assert.ok(Math.hypot(...ctx.ik2([0, 0], [500, 0], 35, 38, 1).end) <= 73);
});
```

- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar (IK pela lei dos cossenos).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5: Commit** `feat: gait tables with planted feet and two-bone IK`.

### Task 4: Seres — `creaturePose` e especificações

**Files:** Create `src/nature/creature.js`, `src/nature/specs.js`. Test `tests/nature-creature.test.mjs`.

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces: `chain(base: [x, y], angle0, lengths: number[], t, seed, o = {lag: .15, amp: .35, freq: 1.5, gravity: 0}): [x, y][]`. Cada segmento segue o anterior com atraso de fase e ruído `noise1`; `gravity` puxa para baixo (cabelo, orelhas caídas).
- Produces: `creaturePose(spec, o): Pose`, com
  - `o = {path, s, size, view: 'side' | 'top', ground?: (x) => y, t, seed, moving = 1, gait?: string, facing?: 1 | -1, age = 0, alive = 1, flinch = 0, expression = 'neutral', gesture = null | {limb, target: [x, y], k}, carry = null | {w, h}}`;
  - `Pose = {spec: spec.id, size, view, spine: [{x, y, angle, r}], limbs: {[name]: {root, mid, end, stance, far, foot}}, appendages: {[name]: [x, y][]}, head: {x, y, angle}, face: {expression}, wings?: {phase}, carry: null | {x, y, angle, w, h}}` (pontos em pixels).
- Produces: `SPECS` em `specs.js`, cada um com `{id, gait, views, spine: [{offset, r}], limbs: [{name, attach, along, side, l1, l2, rest: [dx, dy], bend}], appendages: [{name, attach, angle, lengths, motion}], head, flyer?, swimmer?}`:
  - `human` (BL = altura; bípede; braços com balanço oposto à perna do mesmo lado; cabelo como `chain` com gravidade);
  - `dog` (quadrúpede; cauda e orelhas como `chain`);
  - `ant` (hexápode trípode; antenas geniculadas em modo `'explore'` ou `'tap'`);
  - `spider` (octópode);
  - `bird` (bípede em saltos curtos; asas com `wings.phase` para voo);
  - `fish` (sem pernas; coluna ondulando em onda viajante; nadadeira caudal).
- Regras: segmentos da coluna em `s − offset` do mesmo caminho (efeito vagão); na vista lateral, o corpo fica em `ground(x) − altura de quadril` e o pé de apoio em `ground(x)`; `age` reduz `lift` e amplitude em até 50%; `alive` → 0 dobra os membros sob o corpo e para os apêndices; `flinch` recua 0,1 BL e ergue cabeça e apêndices; `gesture` sobrepõe um alvo de IK a um membro com peso `k`.

- [ ] **Step 1: Write the failing tests:**

```js
const flat = () => 600, P = ctx.makePath([[0, 600], [4000, 600]]);
const pose = (id, s, extra = {}) => ctx.creaturePose(ctx.SPECS[id], { path: P, s, size: 120, view: 'side', ground: flat, t: s, seed: 1, ...extra });
const legged = ['human', 'dog', 'ant', 'spider', 'bird'];
test('poses are deterministic and order independent', () => { for (const id of Object.keys(ctx.SPECS)) { const a = JSON.stringify(pose(id, 3.3)); pose(id, 40); assert.equal(JSON.stringify(pose(id, 3.3)), a); } });
test('stance feet touch the ground', () => { for (const id of legged) for (const l of Object.values(pose(id, 2.2).limbs)) if (l.stance) assert.ok(Math.abs(l.end[1] - 600) < .5, id); });
test('stopped creatures keep every foot on the ground', () => { for (const id of legged) for (const s of [1.13, 1.47, 2.81]) for (const l of Object.values(pose(id, s, { moving: 0 }).limbs)) if (l.foot) assert.ok(Math.abs(l.end[1] - 600) < .5, `${id} ${s}`); });
test('spine segments trail behind the head', () => { for (const id of ['dog', 'ant', 'fish']) { const sp = pose(id, 3).spine; for (let i = 1; i < sp.length; i++) assert.ok(sp[i - 1].x > sp[i].x, id); } });
test('ant uses tripod, dog uses its gait, human swings arms against legs', () => {
  const a = pose('ant', 1.2).limbs; assert.equal(a.L1.stance, a.R2.stance); assert.notEqual(a.L1.stance, a.R1.stance);
  const h = pose('human', 1.2); assert.ok(Math.sign(h.limbs.armL.end[0] - h.limbs.armL.root[0]) !== Math.sign(h.limbs.legL.end[0] - h.limbs.legL.root[0]));
});
test('dead creature folds limbs under the body', () => { const p = pose('dog', 3, { alive: 0 }); for (const l of Object.values(p.limbs)) assert.ok(Math.abs(l.end[0] - l.root[0]) < .3 * 120); });
test('fish spine waves over time', () => { assert.notEqual(pose('fish', 2, { t: 0 }).spine.at(-1).y, pose('fish', 2, { t: .25 }).spine.at(-1).y); });
```

(`foot` vem da especificação: `true` para pernas, `false` para braços e asas, que ficam fora do teste de pés.)

- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `creature.js` (genérico) e `specs.js` (só dados e, quando preciso, pequenas funções de apêndice).
- [ ] **Step 4:** Rodar → PASS. Rodar também `tests/nature-gait.test.mjs`.
- [ ] **Step 5: Commit** `feat: generic creature poses with human, dog, ant, spider, bird and fish specs`.

### Task 5: Ambiente e multidões

**Files:** Create `src/nature/env.js`. Test `tests/nature-env.test.mjs`.

**Interfaces:**
- Produces: `wind(t, x, seed = 0)` = `fbm1(seed, t * .4 − x * .0015)`.
- Produces: `bladeBend(t, x, baseY, pushers: [x, y][], radius, seed = 0)`: `.35 * wind` + afastamento de até `.9` rad de cada `pusher` dentro do raio, com queda suave.
- Produces: `rain(t, area: {x, y, w, h}, rate, seed): {id, x, y, k, splash}[]`. A gota `i` nasce em `(i + hash(seed + i)) / rate`, cai em 0,6 s até `area.y + area.h * hash(seed + i + 77)` e respinga por 0,35 s; só as ativas.
- Produces: `stepEvents(sOf: (t) => s, t0, t1, offset, stride, duty): number[]`: tempos de início de apoio, amostrando a 1/120 s.
- Produces: `flutter(t, t0, from, groundY, seed): {x, y, angle, landed}`.
- Produces: `crowd(path, t, n, seed, o = {speed: 1.1, spacing: 1.6, carryEvery: 3, sizeVar: .25}): {s, size, carry, seed}[]`, com `s` em módulo do comprimento do caminho.

- [ ] **Step 1: Write the failing tests:**

```js
test('rain is order independent and drops end inside the area', () => { const A = { x: 0, y: 0, w: 1920, h: 900 }; const a = JSON.stringify(ctx.rain(4.2, A, 20, 9)); ctx.rain(80, A, 20, 9); assert.equal(JSON.stringify(ctx.rain(4.2, A, 20, 9)), a); for (const d of ctx.rain(4.2, A, 20, 9)) assert.ok(d.y <= 900); });
test('grass bends away from someone passing', () => { assert.ok(ctx.bladeBend(0, 500, 800, [[480, 790]], 60) > ctx.bladeBend(0, 500, 800, [], 60)); });
test('stepEvents finds one stance start per stride', () => { const ev = ctx.stepEvents(t => t * 2, 0, 5, 0, 1, .6); assert.ok(ev.length >= 9 && ev.length <= 11); });
test('crowd keeps everyone on the path', () => { const p = ctx.makePath([[0, 0], [3000, 0]]); const c = ctx.crowd(p, 7, 20, 3); assert.equal(c.length, 20); for (const a of c) assert.ok(a.s >= 0 && a.s <= p.length); });
```

- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5: Commit** `feat: wind, rain, footstep events and crowds`.

---

## Fase C — Cartoon

### Task 6: Kit de desenho do cartoon

**Files:** Create `src/styles/cartoon/kit.js` (nos `scripts` do estilo, depois de `engine.js`). Modify `src/styles/cartoon/GUIDE.md` (seção curta "Kit"). Test `tests/kit.test.mjs`.

**Interfaces:**
- Consumes: `animationEngine.context`, `STYLE.palette`, `STYLE.outline.weight`.
- Produces `window.Kit` (os mesmos 11 nomes no Task 17): `cam(cx, cy, zoom = 1, rot = 0)`, `camEnd()`, `poly(pts, fill, o = {stroke: true, weight, alpha: 1, smooth: false})`, `ellipse(x, y, rx, ry, fill, o = {stroke: false, rot: 0, alpha: 1})`, `line(pts, color, width, o = {alpha: 1, smooth: true})`, `gradient(top, bottom)`, `text(str, x, y, size, color, o = {k: 1, align: 'center'})` (fonte `700 <size>px "Trebuchet MS", sans-serif`; `k` 0–1 com `backOut`), `wipe(p)`, `iris(x, y, r)`, `flash(k, color)`, `vignette(k)`. `VisitArt` não muda.

- [ ] **Step 1:** Teste: carrega `kit.js` em `vm` com um contexto Canvas2D falso que registra chamadas; verifica os 11 nomes e que `cam`/`camEnd` fazem `save`/`restore` balanceados.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` e `npm run test:visual` → PASS (a "Uma visita" em cartoon fica idêntica).
- [ ] **Step 5: Commit** `feat: general Canvas2D kit for the cartoon style`.

### Task 7: NatureArt do cartoon e folha de modelos

**Files:** Create `src/styles/cartoon/nature.js` (nos `scripts` do estilo, depois de `kit.js`), `src/scenes/modelos.js`. Modify `src/config.js` (projeto `modelos`).

**Interfaces:**
- Consumes: `Pose`, `SPECS`, `Kit`.
- Produces `window.NatureArt` (mesmos nomes no Task 17):
  - `creature(pose, look = {})`: desenho genérico (segmentos da coluna como elipses, membros como traços afinando, apêndices como linhas suaves, membros `far` mais escuros e atrás) mais um decorador por espécie em `NatureArt.decor[spec]`: rosto humano (olhos, sobrancelhas e boca por `expression`: `neutral, happy, sad, scared, angry, surprised, tired, dead`), roupa e cabelo; focinho, orelhas e pelagem do cão; cabeça, mandíbulas e espinhos da formiga; olhos da aranha; bico e asas da ave; nadadeiras do peixe. Abaixo de `size < 28` px usa forma simplificada para multidões.
  - Ambiente: `ground(profile, x0, x1)`, `blade(x, y, h, bend, color)`, `rock(x, y, r, seed)`, `tree(x, y, h, bend, seed)`, `leafPiece(x, y, w, h, angle, color, cut = 0)`, `drop(x, y, r)`, `ripple(x, y, k)`, `dust(x, y, k, seed)`, `water(x0, y, x1, t)`, `cloud(x, y, s, seed)`, `soil(x, y, w, h, seed)`, `tunnel(path, width)`.
- Projeto `modelos`: 8 s, cartoon, scripts `src/nature/{noise,path,gait,creature,specs,env}.js` + `src/scenes/modelos.js`. Um plano: todas as especificações andando no lugar (caminho rolando) em vista lateral, a formiga e o cão em vista superior, humano mostrando as 8 expressões.

- [ ] **Step 1:** Implementar `nature.js` e a cena.
- [ ] **Step 2:** `node render.mjs --project=modelos --strip=1:2 --cols=12 --w=320 --out=out/check/modelos-gait.jpg`; abrir. Conferir para cada espécie: marcha correta, pés de apoio parados em relação ao chão, joelhos e cotovelos dobrando para o lado certo, apêndices com atraso.
- [ ] **Step 3:** `node render.mjs --project=modelos --sheet=0.5,4 --cols=2 --w=960 --out=out/check/modelos.jpg`; abrir. Conferir silhuetas, expressões legíveis e contraste. Anotar ms por quadro (≤ 80).
- [ ] **Step 4:** Corrigir e repetir os Steps 2–3.
- [ ] **Step 5:** `npm test`. **Commit** `feat: cartoon NatureArt with creature decorators and model sheet`.

### Task 8: Filme de teste de movimento (30 s)

**Files:** Create `src/scenes/teste-movimento.js`. Modify `src/config.js` (projeto `teste-movimento`, 30 s, 24 fps, cartoon).

Storyboard (6 planos de 5 s):

| Plano | Conteúdo | Prova |
|---|---|---|
| `parque` 0–5 | Lateral, solo irregular; pessoa caminha com o cão; grama se curva quando passam; poeira nos passos | Bípede e quadrúpede juntos, sem deslizar |
| `pausa` 5–10 | A pessoa para, olha para baixo (expressão `surprised`), aponta (`gesture`); o cão fareja | Parada sem pé no ar; gesto sobreposto |
| `macro` 10–15 | Zoom para o chão: formigas em trilha (`crowd`), uma carrega folha; aranha cruza | Mudança de escala, hexápode e octópode |
| `ave` 15–20 | Pássaro pousa, dá saltinhos, levanta voo assustado quando o cão se aproxima | Voo, pouso, reação causal |
| `chuva` 20–25 | Chuva começa: gotas acertam o chão, formigas recuam (`flinch`), a pessoa cobre a cabeça, vegetação sacode | Ambiente reagindo |
| `lago` 25–30 | Peixe nada sob a superfície, ondas da chuva na água; íris de saída | Nado, água |

- [ ] **Step 1:** Registrar o projeto e escrever a cena.
- [ ] **Step 2:** Tiras de 1 s do meio de cada plano (`--strip=<a>:<a+1> --cols=12 --w=320`, `a` = 2, 7, 12, 17, 22, 27); abrir cada uma. Critérios: pé de apoio parado em quadros consecutivos; marcha correta por espécie; nada parado por mais de 1 s sem movimento secundário; reação começa depois da causa.
- [ ] **Step 3:** Corrigir e repetir.
- [ ] **Step 4:** `node render.mjs --project=teste-movimento --clip --out=out/teste-movimento/cartoon/video.mp4`; abrir `video.mp4.review/decoded-sheet.png`. **Ponto de aprovação do usuário** antes da Fase D.
- [ ] **Step 5: Commit** `feat: 30 s multi-creature motion test film`.

### Task 8b: Direção de arte do cartoon

Adicionado após a aprovação do Task 8 (22/10/2026): o usuário aprovou o movimento, mas achou o visual feio. O movimento não muda; muda só o desenho.

**Files:** Modify `src/styles/cartoon/nature.js`, `src/styles/cartoon/kit.js` (pode ganhar funções novas; os 11 nomes do Task 6 continuam iguais), paleta do cartoon em `src/config.js`, `src/scenes/teste-movimento.js` (só enquadramento e camadas de fundo), `src/styles/cartoon/GUIDE.md` (seção curta "Direção de arte"). Pode corrigir `src/nature/` só para a pose parada do cão.

Referências: se `refs/estilo/` tiver imagens do usuário, use-as para paleta, formas e traço, sem copiar nada. `refs/` vai para o `.gitignore`. Sem referências, use a direção padrão: vetor plano com sombreamento em dois tons, luz lateral quente e silhuetas fortes.

Critérios:
1. **Volume:** cada forma tem cor base, lado de sombra e um brilho pequeno. Cada ser projeta uma sombra de contato no chão.
2. **Traço:** contorno externo mais grosso que as linhas internas. Cor do traço é o tom escuro do preenchimento, não preto.
3. **Profundidade:** fundo em 3–4 camadas com perspectiva atmosférica (o distante mais claro e menos saturado), paralaxe com `cam` e plantas escuras em primeiro plano emoldurando.
4. **Luz e clima:** céu com brilho do sol e nuvens sombreadas. Correção de cor por clima (a chuva fica mais fria e escura). Grão de papel sutil e determinístico, com o padrão gerado uma vez e reutilizado.
5. **Seres:**
   - Humano: proporções e rosto de perfil corretos (hoje os dois olhos aparecem na lateral da cabeça), cabelo com volume, dobras de roupa.
   - Formiga e aranha: cabeça, tórax e abdômen bem definidos, com brilho de quitina. As pernas `far` ficam mais finas e claras, para a vista lateral não embolar.
   - Árvores variadas por semente, com galhos e copa sombreada.
6. **Enquadramento:** em planos principais, o protagonista ocupa ao menos 1/3 da altura do quadro. A ave do plano `ave` fica maior. No plano `macro`, a perna humana gigante ganha forma (sapato, barra da calça).
7. **Pendência do Task 8:** o cão parado apoia as quatro patas no chão.
8. **Desempenho:** no máximo 80 ms por quadro.

- [ ] **Step 1:** Implementar os critérios 1–7.
- [ ] **Step 2:** Renderizar `modelos.jpg` e `teste-movimento.jpg` (os mesmos comandos dos Tasks 7 e 8). Abrir as duas folhas e comparar com as versões anteriores. Corrigir e repetir.
- [ ] **Step 3:** `npm test` e `npm run test:visual` → PASS. Renderizar o MP4 do teste de novo e conferir com `ffprobe`. Anotar ms por quadro.
- [ ] **Step 4: Commit** `feat: cartoon art direction with shading, depth and lighting`. **Ponto de aprovação do usuário.**

---

## Fase D — Áudio e episódio

### Task 9: Narração com Piper e linha do tempo

**Files:** Create `scripts/narration-lib.mjs`, `scripts/narrate.mjs`. Test `tests/narration.test.mjs`.

**Interfaces:**
- Produces (`narration-lib.mjs`):
  - `splitSentences(text): string[]`: divide após `.`, `!`, `?`, `…` seguidos de espaço.
  - `layoutTimeline(episode, durations: Map<shotId, number[]>): Timing`, com `Timing = {id, fps, duration, chapters: [{id, title, start, end}], shots: [{id, chapter, start, end, visual, transition, speech: [{start, end, text}]}]}`.
  - `readWav(buf): {sampleRate, channels, samples: Int16Array}` (só PCM 16 bits); `writeWav({sampleRate, samples}): Buffer` (mono, 16 bits).
  - `composeNarration(timing, clips: Map<'<shotId>#<j>', Int16Array>, sampleRate): Int16Array`: cada clipe em `Math.round(speech.start * sampleRate)`.
- Produces (`narrate.mjs`): `node scripts/narrate.mjs episodes/<id>`. Uma chamada Piper por frase, com cache em `out/episodes/<id>/tts/<sha1(voice|lengthScale|text)>.wav`. Escreve `out/episodes/<id>/narration.wav` e `episodes/<id>/timing.json`.
- Formato de `episode.json`: `{id, title, story, style, compatibleStyles, fps, voice, lengthScale, intro, outro, chapters: [{id, title, shots: [{id, narration?, visual, transition?, hold?}]}]}`.

Algoritmo de `layoutTimeline`:

```text
cursor = intro
para cada capítulo (i > 0: cursor += 1.6):
  para cada plano:
    start = q(cursor)                                   q(x) = Math.round(x * fps) / fps
    para j, d em durations[id]: cursor += (j == 0 ? .25 : .35); speech = {start: cursor, end: cursor + d}; cursor += d
    se houver frases: cursor += .8;   cursor += hold ?? (sem frases ? 3 : 0)
    end = q(cursor); cursor = end
último plano: end = q(cursor + outro); duration = end
```

- [ ] **Step 1: Write the failing tests:**

```js
test('splitSentences handles ellipsis, questions and accents', () => {
  assert.deepEqual(splitSentences('Ela nasceu. Será que sobrevive? Talvez… Não sabemos!'), ['Ela nasceu.', 'Será que sobrevive?', 'Talvez…', 'Não sabemos!']);
});
test('silent shots and chapter pauses produce a valid timeline', () => {
  const ep = { id: 'x', fps: 24, intro: 1, outro: 2, chapters: [{ id: 'a', title: 'A', shots: [{ id: 'a1', narration: 'Um. Dois.', visual: 'v' }, { id: 'a2', visual: 'silêncio' }] }, { id: 'b', title: 'B', shots: [{ id: 'b1', narration: 'Três.', visual: 'v' }] }] };
  const tm = layoutTimeline(ep, new Map([['a1', [1, 2]], ['b1', [1.5]]]));
  assert.ok(tm.shots[1].end - tm.shots[1].start >= 3 - 1 / 24); assert.equal(tm.shots[0].speech[0].start, 1.25);
  for (let i = 1; i < tm.shots.length; i++) assert.equal(tm.shots[i].start, tm.shots[i - 1].end);
  assert.equal(tm.duration, tm.shots.at(-1).end); assert.ok(tm.shots[2].speech[0].start - tm.shots[1].end >= 1.6);
});
test('wav round trip and composition place clips at exact samples', () => {
  assert.deepEqual(Array.from(readWav(writeWav({ sampleRate: 22050, samples: Int16Array.from([1, 2, 3]) })).samples), [1, 2, 3]);
  const out = composeNarration({ duration: 1, shots: [{ id: 's', speech: [{ start: .5, end: .5001, text: 'x' }] }] }, new Map([['s#0', Int16Array.from([9])]]), 100);
  assert.equal(out[50], 9); assert.equal(out.length, 100);
});
```

- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `narration-lib.mjs`.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** `python -m pip install piper-tts`; `python -m piper.download_voices --download-dir tools/piper-voices pt_BR-faber-medium`; conferir as opções com `python -m piper --help` (modelo, arquivo de saída, `--length-scale`, texto pelo stdin). Se o pip falhar no Windows, usar o binário de release do Piper com o mesmo `.onnx` (constante `PIPER` em `narrate.mjs`). Registrar a licença da voz (model card) em `episodes/README.md`.
- [ ] **Step 6:** Implementar `narrate.mjs`. Teste manual com um `episode.json` de 2 planos em `tmp/`: `narration.wav` audível e `timing.json` coerente.
- [ ] **Step 7: Commit** `feat: sentence-level Piper narration and timeline layout`.

### Task 10: Gerador de episódios, legendas e texto de publicação

**Files:** Create `scripts/build-episodes.mjs`. Modify `src/episodes.js` (gerado). Test `tests/episodes.test.mjs`.

**Interfaces:**
- Produces: `NATURE_SCRIPTS = ['src/nature/noise.js','src/nature/path.js','src/nature/gait.js','src/nature/creature.js','src/nature/specs.js','src/nature/env.js']`.
- Produces: `episodeProject(episode, timing, chapterFiles): object`, com `bpm: 60`, `offset: 0`, `audio: 'out/episodes/<id>/mix.m4a'`, `chapters`, `scripts = [...NATURE_SCRIPTS, ...chapterFiles, 'src/episodes/placeholder.js']`, `reviewTimes` = ponto médio de cada plano e `storyboard = [{id, chapter, start, end, event: visual, transition: transition ?? 'corte', reads}]`. Plano sem frase recebe uma leitura com o texto `visual`.
- Produces: `toSrt(timing): string`. Uma cue por frase; frase com mais de 84 caracteres dividida em limite de palavra, com tempo proporcional; linhas de no máximo 42 caracteres.
- Produces: `youtubeText(episode, timing): string`. Título, descrição, capítulos `MM:SS Título` começando em `00:00` e créditos da voz.
- CLI `node scripts/build-episodes.mjs`: para cada `episodes/*/episode.json` com `timing.json`, gera `src/episodes.js`, `out/episodes/<id>/<id>.srt` e `out/episodes/<id>/youtube.md`. Os capítulos são `src/episodes/<id>/c*.js` em ordem.

- [ ] **Step 1: Write the failing tests** (`sampleEpisode`/`sampleTiming` no arquivo: 2 capítulos, 3 planos, um sem narração):

```js
test('episodeProject registers a valid storyboard covering the timeline', () => {
  const p = catalog(), proj = episodeProject(sampleEpisode, sampleTiming, []);
  p.registerProject(proj); assert.equal(p.resolveProject(proj.id, 'cartoon').duration, sampleTiming.duration);
  assert.equal(proj.scripts.at(-1), 'src/episodes/placeholder.js');
});
test('srt keeps accents and wraps lines', () => {
  const srt = toSrt({ shots: [{ speech: [{ start: 1, end: 4.5, text: 'A operária não descansa: “ela trabalha até o último dia”, dizem os biólogos que a estudam há décadas.' }] }] });
  assert.match(srt, /^1\n00:00:01,000 --> /); assert.match(srt, /operária/); assert.match(srt, /“ela/);
  for (const line of srt.split('\n')) assert.ok(line.length <= 42 || /-->/.test(line));
});
test('youtube chapters start at 00:00', () => { assert.match(youtubeText(sampleEpisode, sampleTiming), /\n00:00 /); });
```

- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: episode builder with SRT and YouTube description`.

### Task 11: Mixagem de áudio

**Files:** Create `scripts/mix-audio.mjs`. Test em `tests/episodes.test.mjs`.

**Interfaces:**
- Produces: `mixArgs({narration, duration, music?, out}): string[]`. Cama de ambiente `anoisesrc=color=brown:amplitude=0.04`, `lowpass=f=900`, −30 dB. Música opcional com `-stream_loop -1`, −20 dB, `sidechaincompress` pela narração. `amix`, `loudnorm=I=-14:TP=-1.5:LRA=11`, AAC 192k, `-t <duration>`.
- CLI: `node scripts/mix-audio.mjs episodes/<id> [--music=assets/music/<arquivo>]` → `out/episodes/<id>/mix.m4a`.

- [ ] **Step 1:** Teste: sem música não há `sidechaincompress`; com música há `sidechaincompress` e `-stream_loop`; sempre há `loudnorm=I=-14:TP=-1.5:LRA=11` e `-t`.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASS. Rodar o CLI no episódio de teste do Task 9: `ffprobe` confirma duração = `timing.duration` (±0,05 s).
- [ ] **Step 5: Commit** `feat: narration mix with ambience bed and loudness target`.

### Task 12: Tema, pesquisa e roteiro do piloto

**Files:** Create `episodes/<id>/roteiro.md`, `episodes/<id>/episode.json`, `episodes/README.md`.

- [ ] **Step 1:** O coordenador pergunta ao usuário o tema e o nicho do canal. Se o usuário pedir sugestão, propor 3 temas viáveis com os seres e ambientes já disponíveis, com uma linha de justificativa cada. **Ponto de decisão do usuário.**
- [ ] **Step 2:** Pesquisar com WebSearch/WebFetch fontes confiáveis para cada fato. Registrar fato + URL em `roteiro.md`. Fato sem fonte sai.
- [ ] **Step 3:** Escrever ~1.100–1.400 palavras (8–10 min): gancho ≤ 20 s, capítulos com arco, fechamento. Frases ≤ 25 palavras, números por extenso quando o Piper ler mal. Cada plano com 1–3 frases e uma descrição visual em que algo acontece, usando só seres e ambientes que existem ou uma especificação nova pequena (listar qual).
- [ ] **Step 4:** Converter para `episode.json` (`style: 'cartoon'`, `compatibleStyles: ['cartoon', 'watercolor']`).
- [ ] **Step 5:** **Ponto de aprovação do usuário** sobre o roteiro. Incorporar correções.
- [ ] **Step 6: Commit** `docs: pilot episode script with sources`.

Se o roteiro pedir um ser que ainda não existe, criar uma especificação nova em `src/nature/specs.js` e um decorador em `NatureArt.decor`, com o teste de pés do Task 4 estendido a ela (Opus 5.5 · high).

### Task 13: Narração do piloto

- [ ] **Step 1:** `node scripts/narrate.mjs episodes/<id>`. `timing.duration` entre 480 e 600 s; se não, ajustar roteiro ou `lengthScale` (0,95–1,1).
- [ ] **Step 2:** Ouvir 5 trechos com `ffplay -ss <t> -t 20 out/episodes/<id>/narration.wav`. Reescrever palavras mal pronunciadas e repetir.
- [ ] **Step 3:** `node scripts/build-episodes.mjs`. Abrir `studio.html?project=<id>` (via `npm run studio`) e confirmar planos com placeholders.
- [ ] **Step 4: Commit** `feat: pilot narration timing and registration`.

---

## Fase E — Cenas do piloto

### Task 14: Guia do episódio

**Files:** Create `episodes/<id>/GUIA.md`.

Conteúdo para subagentes que pintam um capítulo cada: API disponível (`Kit`, `NatureArt`, `creaturePose`, `SPECS`, `travel`, `crowd`, `rain`, `stepEvents`, `chain`, `shotsById`); regras (algo acontece em todo plano; câmera com intenção; transição motivada na saída; protagonista com a mesma `seed` e o mesmo `look` em todos os capítulos; estados contínuos como `age` acompanham a história); paleta e luz por capítulo; orçamento ≤ 80 ms por quadro; comandos de revisão; cada subagente edita só `src/episodes/<id>/c<NN>_<capitulo>.js`.

- [ ] **Step 1:** Escrever. **Commit** `docs: art and motion guide for the pilot`.

### Task 15: Capítulos (subagentes em paralelo, no máximo 3 por vez)

**Files:** Create `src/episodes/<id>/c<NN>_<capitulo>.js` (um por subagente).

Para cada capítulo:

- [ ] **Step 1:** Ler `GUIA.md` e os planos do capítulo em `timing.json`. Escrever as cenas com momentos visuais-chave em `reads[j].start`.
- [ ] **Step 2:** O coordenador roda `node scripts/build-episodes.mjs` depois de cada lote (o subagente não edita `src/episodes.js`).
- [ ] **Step 3:** Folha por plano: `node render.mjs --project=<id> --sheet=<início+.1>,<meio>,<fim−.1> --cols=3 --w=640 --out=out/check/<id>-<plano>.jpg`; abrir. Conferir evento legível, protagonista reconhecível, ambiente em movimento, nada essencial em y > 960.
- [ ] **Step 4:** Tira de 1 s no pico de ação de cada plano; conferir pés e causalidade.
- [ ] **Step 5:** Corrigir e repetir; anotar ms por quadro.
- [ ] **Step 6:** `npm test`. **Commit** `feat: pilot chapter <NN> <capitulo>`.

### Task 16: Montagem, render e entrega

**Files:** Modify capítulos (transições, abertura, encerramento, `LOOPS.thumbnail` com `LOOPS.thumbnail.len = 1`). Modify `docs/VALIDATION.md`.

- [ ] **Step 1:** Tiras de 2 s em cada `chapters[i].start`; transição motivada.
- [ ] **Step 2:** `node scripts/mix-audio.mjs episodes/<id>` (com `--music=...` se houver faixa livre do usuário).
- [ ] **Step 3:** `node render.mjs --project=<id> --frames --workers=4`, depois `node render.mjs --project=<id> --encode --audio=out/episodes/<id>/mix.m4a --out=out/episodes/<id>/cartoon/video.mp4`.
- [ ] **Step 4:** Conferir H.264 1920×1080, 24 fps, quadros = `round(duration × 24)`, AAC presente, duração do áudio = duração do vídeo (±0,1 s). Abrir `video.mp4.review/decoded-sheet.png`.
- [ ] **Step 5:** Miniatura: `node render.mjs --project=<id> --loop=thumbnail --stills=0 --out=out/episodes/<id>/thumb`; JPEG 1280×720 < 2 MB via FFmpeg.
- [ ] **Step 6:** Entregar MP4, SRT, `youtube.md` e miniatura. **Ponto de aprovação do usuário.**
- [ ] **Step 7:** Entrada curta em `docs/VALIDATION.md`. **Commit** `feat: pilot cartoon release`.

---

## Fase F — Aquarela

### Task 17: Kit e NatureArt da aquarela

**Files:** Create `src/styles/watercolor/kit.js`, `src/styles/watercolor/nature.js` (nos `scripts` do estilo, depois de `engine.js`). Test `tests/kit.test.mjs` (paridade estática de nomes entre os dois estilos).

**Interfaces:** mesmos nomes e assinaturas dos Tasks 6–7, implementados com `paint`, `inkLine`, `camBegin`, `camEnd`, `letter`, `brushWipe`, `iris`, `flash`, `boilSeed` (um `boilSeed` por objeto). Seres < 28 px com forma simplificada.

- [ ] **Step 1:** Teste de paridade → FAIL.
- [ ] **Step 2:** Implementar.
- [ ] **Step 3:** `npm test`, `npm run test:visual`; stills da demo em 0,5 s e 5,7 s iguais a `out/baseline/stills/`.
- [ ] **Step 4:** `node render.mjs --project=modelos --style=watercolor --strip=1:2 --cols=12 --w=320 --out=out/check/aquarela-gait.jpg` e uma folha por capítulo do piloto em aquarela; abrir. Meta ≤ 1,5 s por quadro.
- [ ] **Step 5: Commit** `feat: watercolor Kit and NatureArt`.

### Task 18: Piloto em aquarela

- [ ] **Step 1:** `node render.mjs --project=<id> --style=watercolor --frames --workers=2` em segundo plano (estimativa de 3–6 h; retomável).
- [ ] **Step 2:** Encode com a mesma mixagem em `out/episodes/<id>/watercolor/video.mp4`; verificações do Task 16, Step 4.
- [ ] **Step 3:** **Ponto de aprovação:** o usuário compara os dois estilos e escolhe o do canal.
- [ ] **Step 4:** `docs/VALIDATION.md`. **Commit** `feat: pilot watercolor release`.

---

## Fase G — Canal

### Task 19: Rotina de produção e bíblia do canal

**Files:** Modify `CLAUDE.md` (seção "Produzir um episódio": roteiro → `narrate.mjs` → `build-episodes.mjs` → capítulos → `mix-audio.mjs` → `--frames` → `--encode` → revisão). Create `episodes/CANAL.md` (identidade: nicho, tom do narrador, estilo visual, regras de continuidade, formato de título e miniatura, lista de 10 próximos temas compatíveis com os seres disponíveis e quais especificações novas cada um exigiria).

- [ ] **Step 1:** Escrever.
- [ ] **Step 2:** Validar a rotina com um `episode.json` de 3 planos de outro tema, rodando `narrate.mjs` e `build-episodes.mjs` sem mudar código. Projeto registrado com placeholders.
- [ ] **Step 3:** Manter ou apagar o rascunho, conforme o usuário. **Commit** `docs: production routine and channel bible`.

---

## Futuro (fora deste plano)

3D low poly para planos específicos; upload pela API do YouTube; música gerada localmente; vista frontal e 3/4 de humanos.
