# Webapp Fase 5 (motor de episódio) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De um `episode.json` (capítulos, planos com narração, cena e atores) sair um MP4 verificado, todo pela CLI e sem custo:
- narração Kokoro;
- cenas de um kit em `flat`, `watercolor` ou `pixel`;
- loops reaproveitados de um acervo;
- legenda com destaque palavra a palavra e textos de tela em ASS;
- mixagem a −14 LUFS e verificação automática.

Inclui uma ficha de personagens (4 bonecos × 4 poses), como a do Rhaj, e o pixel art no nível do story de 28/10 ou acima.

**Architecture:**
- **Kit:** o catálogo de cenas (`src/episode/kit.js`) é matemática pura. Uma cena e o tempo viram um quadro F com `scene: 'K'` e `world.kit`: primitivas como céu, astros, camadas, interior, mapa, clima e luzes.
- **Desenho:** cada estilo 2D desenha as primitivas do kit uma vez (`drawK`). O `pixel` passa a desenhar o quadro F na grade de 320×180.
- **Episódio na plataforma:** um gerador transforma `episode.json` e `timing.json` num projeto registrado (`src/episodes.js`, fora do git). Cada plano usa uma cena em loop de L s, registrada em `LOOPS`.
- **Montagem:**
  1. cada loop é renderizado uma vez para o acervo (`out/acervo/<hash>.mp4`);
  2. cada plano vira um segmento estendido com escurecer e clarear;
  3. o concat junta os segmentos, o libass queima o ASS e o áudio mixado entra;
  4. `verify-video` confere o resultado.

**Tech Stack:** Node 24, Canvas2D, Puppeteer-core e Chrome (já instalados), FFmpeg 8 com libass, p5.brush (só na aquarela), Kokoro-82M (subprocesso), `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-27-webapp-canais-dark-design.md`: chamadas 1, 2 e 11, e a seção "Atualização de 29/10/2026", que tem prioridade. Contratos do motor: `src/styles/AGENTS.md` (quadro F), `ANIMATION_GUIDE.md`, `src/styles/pixel/GUIDE.md` e `docs/VOICE.md`. Leia também `CLAUDE.md` (regras de código e validação).

## Decisões

1. **Quadro F do kit.** Mundo em px de 1920×1080, y para baixo, como em `src/styles/AGENTS.md`. Os campos:

```
F = { scene: 'K', shot: <id da cena>, t, lt, cam: {cx, cy, z}, under: null, world: { ground: x => y, kit }, actors, texts: [] }
kit = {
  mood: 'dawn' | 'day' | 'dusk' | 'night' | 'interior',  // rampa de cores do estilo
  seed, phase,                                            // phase = (lt mod L) / L
  sky: { stars: [{x, y, r, tw}], celestial: {kind: 'sun'|'moon', x, y, r, glow} | null, clouds: [{x, y, w, h, seed}] },
  layers: [ // de trás para a frente; f = paralaxe (0 longe .. 1 chão)
    {kind: 'ridge', f, prof: x => y}, {kind: 'dunes', f, prof},
    {kind: 'treeline', f, trees: [{x, y, h, kind: 'pine'|'broad'|'palm', seed}]},
    {kind: 'buildings', f, items: [{x, y, w, h, roof: 'flat'|'gable'|'dome'|'temple'|'tower', windows: [{x, y, w, h, lit}]}]},
    {kind: 'sea', f, y, waves: [{x, y, len, k}]}, {kind: 'ground', f, prof, surface: 'grass'|'sand'|'stone'|'snow'} ],
  interior: { wall: {y0, y1}, window: {x, y, w, h}, floorY, props: [{kind: 'table'|'candle'|'book'|'scroll'|'chair'|'shelf', x, y, s, flame?: {h, flick}}] } | null,
  map: { paper: {x, y, w, h}, coasts: [[[x, y], ...]], route: {pts: [[x, y], ...], k}, marks: [{x, y}] } | null,
  weather: { kind: 'clear'|'rain'|'snow'|'fog', drops: [{x, y, k}], fog },
  lights: [{x, y, r, k}]  // janelas, vela, fogueira, vaga-lumes; k = intensidade 0..1
}
```

   Os atores são `kind: 'human'`, no formato atual do quadro F (`creaturePose`, `seated`, `holds`, `gear`). Nenhum texto entra no quadro: todo texto vai no ASS.

2. **Catálogo de 8 cenas:**
   - `campo`;
   - `ceu-noturno`;
   - `mar`;
   - `floresta`;
   - `deserto`;
   - `cidade-antiga`;
   - `interior-vela`;
   - `mapa`.

   Parâmetros (`params`):
   - `time`: `dawn|day|dusk|night`; o interior usa `night`/`day` só para a janela;
   - `weather`: `clear|rain|snow|fog`;
   - `seed`: inteiro de 0 a 9999;
   - `framing`: `wide|mid`;
   - `extras`: lista fechada por cena:
     - `campo`: `fireflies`, `farm`;
     - `ceu-noturno`: `moon`, `meteor`;
     - `mar`: `lighthouse`, `ship`;
     - `floresta`: `mist`, `campfire`;
     - `deserto`: `ruins`, `caravan`;
     - `cidade-antiga`: `temple`, `wall`;
     - `interior-vela`: `book`, `scroll`;
     - `mapa`: `route`.

   Valor fora da lista lança `Parâmetro inválido em <cena>: <chave>`.
3. **Loop perfeito.**
   - Cada cena é função de `phase` com período L (padrão 12 s; aceito de 10 a 20).
   - Tudo que se move tem frequência múltipla inteira de 1/L:
     - estrelas cintilam;
     - nuvens dão a volta no quadro;
     - a câmera balança devagar (`cx += A·sin 2πφ`, A ≤ 12 px; no `pixel`, alinhada à grade);
     - janelas e vela tremulam;
     - chuva e neve usam partículas com tempo módulo L e índice cíclico;
     - a rota do mapa vai e volta (`k = .5 - .5 cos 2πφ`).
   - Quem anda atravessa a tela: começa fora dela em φ = 0 e termina fora em φ = 1.
   - Teste obrigatório: `F(t)` igual a `F(t + L)` (números com tolerância de 1e-6), para todas as cenas e ações.
4. **Elenco e ações.**
   - O `cast` do episódio é `[{id, body: adult|child|elder|heavy|thin, colors?: {skin, hair, shirt, pants}, gear?: ['hat'|'backpack'|'hood'|'helmet']}]`, até 6 pessoas.
   - Cada plano tem `actors: [{cast, action, at: 0..1, dir: 1|-1}]`, até 3 por plano. As ações são `stand`, `walk`, `sit`, `read` (sentado com livro), `point` e `look-up`.
   - O `walk` ignora `at`, segue a decisão 3 e só existe em cenas de exterior. Usar `walk` em `interior-vela` ou `mapa` lança erro.
   - `mapa` não tem atores.
5. **Paletas por clima de luz.** Cada estilo ganha em `config.js` uma rampa por `mood` (céu de cima, céu de baixo, longe, meio, perto, chão, luz, sombra, brilho).
   - O `pixel` tem uma paleta fechada única de até 48 cores, com todas as rampas. O quantizador e o teste de paleta de `check-visuals` continuam valendo.
   - Degradê no `pixel` só por pontilhado ordenado (Bayer 4×4) entre duas cores da paleta, nunca por mistura.
6. **Pixel no quadro F.**
   - O `src/styles/pixel/draw.js` define `ExpStyle.draw(F)` e desenha no `animationEngine.context`, com o mundo dividido por `texture.scale`.
   - O `engine.js` e o `VisitArt` continuam como estão, para o `smoke-visit`.
   - Bonecos em pixel a partir de `pose.joints`/`pose.bones`:
     - membros de 2 a 3 px, cabeça em bloco, contorno de 1 px na cor `ink`;
     - olhos de 1 px;
     - roupa pelas cores do elenco quantizadas;
     - pose desenhada a 12 por segundo (`onTwos`).
   - Personagem de pé tem de 26 a 34 px de altura na grade (o do story tem cerca de 28).
   - O `pixel` entra em `compatibleStyles` das cenas de fumaça 2D só onde o kit estiver desenhado. O `smoke-2d` não muda.
7. **Projeto do episódio** (`scripts/build-episode.mjs`):
   - lê `<pasta>/episode.json` e `<pasta>/timing.json`;
   - escreve `src/episodes.js` (no `.gitignore`), que o `catalog()` de `render-lib.mjs` já carrega, com um `registerProject` por episódio:
     - id `ep-<id>`;
     - `style` do episódio e `compatibleStyles: [style]`;
     - `duration` e `fps: 24`;
     - `storyboard`: um plano por plano do `timing.json`, com `reads` tirados de `speech`; plano sem fala recebe uma leitura com a `scene`;
     - `scripts`: natureza + `src/episode/kit.js` + `src/episode/player.js`;
     - `episode`: `{ cast, shots: [{id, scene, params, actors, loopLen}] }`.
   - Episódios anteriores no arquivo são mantidos, e a entrada do mesmo id é trocada.
8. **Player** (`src/episode/player.js`):
   - registra `shotsById`, que desenha a cena do plano com `lt mod L`, para a prévia no estúdio e o `--storyboard`;
   - registra `LOOPS[<chave>]`, um por cena distinta do episódio, com `len = L`;
   - registra `LOOPS.elenco`: a ficha do elenco, uma coluna por pessoa (até 4) e uma linha por pose (`stand`, `walk` em 4 tempos, `point`, `sit`), sobre fundo neutro do estilo, com `len = 2`.
9. **Acervo.**
   - Chave = `sha256` de `JSON.stringify([style, styleConfig resolvido, scene, params, cast usado na cena com as ações, L, fps, sourceHash])`. O `sourceHash` é o mesmo que o `render.mjs` grava no manifesto (`sourceSnapshot().hash` em `render-lib.mjs`).
   - Arquivo: `out/acervo/<chave>.mp4`, renderizado por `node render.mjs --project=ep-<id> --loop=<chave> --clip --out=<tmp>` e só então movido para o acervo.
   - `out/acervo/index.json` registra chave, estilo, cena, params, L, criado em e tamanho.
10. **Segmentos e montagem:**
    - Segmento de cada plano: `ffmpeg -stream_loop -1 -i <loop> -t <dur> -vf "fade=t=in:st=0:d=.75,fade=t=out:st=<dur-.75>:d=.75" -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -r 24`. Cache em `out/episodes/<id>/seg/<chave>-<dur>.mp4`.
    - Plano com menos de 2 s não tem fade.
    - Montagem final: concat demuxer → `subtitles=<ass>:fontsdir=assets/fonts` → `-map` do `mix.m4a` → `-c:v libx264 -preset veryfast -crf 20 -c:a copy -movflags +faststart`. Saída em `out/episodes/<id>/video.mp4`, depois `verify-video`.
    - O FFmpeg roda com `cwd` na raiz do repositório e caminhos relativos com `/`, para fugir do escape de `C:` no filtro.
11. **Texto em ASS** (`scripts/episode-lib.mjs`), 1920×1080:
    - **Legenda:** frases de `speech` em blocos de até 7 palavras (sem quebrar no meio de uma palavra). O tempo de cada palavra é proporcional ao número de caracteres + 1 dentro da frase. Um evento por palavra, com o bloco inteiro e a palavra atual na cor de destaque. Fica embaixo, centralizado, com contorno de 3 px.
    - **Título de capítulo:** no centro, 3 s a partir do início do capítulo, com fade de 400 ms.
    - **HUD do plano** (`shot.hud`, opcional):
      - `year` e `sub` (caixa no canto superior esquerdo);
      - `place` (topo, centro);
      - `tag: {text, sub, actor}`: etiqueta com linha sublinhada, posta acima do ator indicado, na posição `at` do ator.
    - Estilos ASS por estilo de vídeo:
      - `pixel`: Press Start 2P (OFL), destaque `#F4C542`, sem sombra;
      - `flat` e `watercolor`: Atkinson Hyperlegible (OFL), destaque `#FFD166`.
    - As fontes ficam em `assets/fonts/`, com o `OFL.txt` de cada uma e entrada em `docs/CREDITS.md`.
12. **Orquestrador** `node scripts/episode.mjs <pasta> [--steps=narrate,build,loops,segments,mix,assemble,verify] [--workers=2]`:
    - cada etapa é idempotente e só refaz o que mudou;
    - imprime uma linha JSON por evento (`{"step","done","total","message"}`), que a fase 6 lê como progresso do job;
    - em falha, código 1 e uma linha `{"step","error"}`.
    - `narrate` e `mix` chamam `scripts/narrate.mjs` e `scripts/mix-audio.mjs` como estão.
13. **Estilos expostos ao app:**
    - Os estilos com `episodeScenes` (lista das 8 cenas) em `config.js` são os de vídeo.
    - `scripts/app/profiles.mjs` calcula `EPISODE_STYLES` pelo `catalog()` de `render-lib.mjs`.
    - A rota `GET /api/styles` devolve `[{id, name}]`, e `app/views/mychannels.js` usa essa rota em vez da lista fixa.
14. **Formato do `episode.json`:** o atual de `narrate.mjs` (`id`, `title`, `voice`, `lengthScale`, `fps`, `intro`, `outro`, `chapters[].shots[].narration`, `pronunciations`) mais estes campos:
    - `style`;
    - `loopLen?`;
    - `cast`;
    - `sources: [{url, title, accessed}]`, obrigatório se houver narração;
    - em cada plano: `scene: {id, params}`, `actors?`, `hud?`.

    `validateEpisode(ep)`, em `scripts/episode-lib.mjs`, recusa formato inválido com a mensagem do campo.

## Global Constraints

- Regras de código do `CLAUDE.md`:
  - cada quadro é função pura de `t`;
  - proibido `Math.random()`, relógio, estado entre quadros e física incremental;
  - use `hash()`, `noise1()` e sementes estáveis;
  - `src/motion.js`, `src/timeline.js`, `src/nature/` e `src/episode/kit.js` não desenham;
  - o desenho fica em `src/styles/<estilo>/`;
  - nunca leia `window.PROJECT`.
- Sem dependências npm novas. As fontes OFL são arquivos, com licença registrada.
- Licenças: não copie código, cena ou música de PDoomVideo nem de Eidoverse. Nada de personagens, nomes ou universos de terceiros (Halo, Spartan e afins) em fixture, teste ou exemplo.
- Fatos de roteiro precisam de fonte (`sources`). O episódio de demonstração usa fatos com fonte ou texto descritivo sem fatos.
- `src/episodes.js`, `out/` e `data/` ficam fora do git.
- Validação por mudança de estilo ou motor:
  - `npm test`;
  - `npm run test:visual`;
  - folha de contato aberta e olhada de verdade (Read);
  - `node scripts/check-motion.mjs --project=smoke-kit --2d --style=<id>` com 0 violações.
- Entrega de vídeo: `verify-video` mais a inspeção de `<vídeo>.review/decoded-sheet.png`. Nunca diga que um vídeo terminou só porque o processo imprimiu uma mensagem.
- Commits em inglês (`feat:`, `fix:`, `test:`, `docs:`), terminando com:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Um escritor por arquivo em cada onda. Os testes atuais (295) continuam passando.

## Review Focus

1. **Emenda do loop:** um salto visível em φ = 0/1 (estrela que some, nuvem que pula, gota que corta, câmera que estala). Teste de periodicidade do quadro F na Task 1; folha `--strip` em torno da emenda nas Tasks 3 a 5.
2. **Cor fora da paleta no `pixel`:** pontilhado, bonecos com as cores do elenco e brilho das luzes, todos quantizados. É o teste de paleta e de blocos do `check-visuals` no `smoke-kit`. Teste na Task 3.
3. **Texto com caracteres especiais no ASS** (`{`, `}`, `\`, quebra de linha, acentos): são escapados e aparecem como texto. Teste na Task 7.
4. **Episódio com plano curto (< 2 s), plano sem fala, capítulo de um plano só ou cena repetida em planos seguidos:**
   - a montagem sai com a duração certa (± 1 quadro);
   - o acervo renderiza a cena uma vez só;
   - repetir em sequência é permitido, mas o `validateEpisode` avisa.

   Testes nas Tasks 7 e 8.
5. **Caminho do Windows no filtro do FFmpeg:** os argumentos montados não contêm `\` nem `C:`. Teste na Task 8.

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1 (kit e contrato) | opus | high |
| 2 (fontes e ASS) | sonnet | high |
| 3 (pixel) | opus | high |
| 4 (flat) | opus | medium |
| 5 (aquarela) | opus | medium |
| 6 (player e projeto) | sonnet | high |
| 7 (validação do episódio) | sonnet | high |
| 8 (acervo e montagem) | opus | high |
| 9 (estilos no app) | sonnet | medium |
| 10 (aceite) | sessão principal | — |

## Ondas

- A: Task 1. Ela define o contrato e o `smoke-kit` que as outras usam.
- B: Tasks 2, 3, 4, 5, 6 e 7 em paralelo. As pastas de estilo são distintas. A marca `episodeScenes` só entra no `config.js` de um estilo junto com o `drawK` dele, porque ela liga o `smoke-kit` no `test:visual`. As Tasks 2 e 7 escrevem em `scripts/episode-lib.mjs`, então a 7 só começa depois da 2, dentro da mesma onda.
- C: Tasks 8 e 9 em paralelo.
- D: Task 10.

## Estrutura de arquivos

- Create `src/episode/kit.js`: `KIT_SCENES`, `kitFrame`, `castActor`. Create `fixtures/smoke/kit.js`; modify `src/config.js` (projeto `smoke-kit`).
- Create `src/styles/pixel/draw.js`; modify `src/styles/pixel/config.js` (paleta, rampas, `episodeScenes`, `scripts`).
- Modify `src/styles/flat/draw.js`, `src/styles/flat/config.js`, `src/styles/watercolor/draw.js`, `src/styles/watercolor/config.js`.
- Create `src/episode/player.js`, `scripts/build-episode.mjs`. Modify `.gitignore` (+`src/episodes.js`).
- Create `scripts/episode-lib.mjs` (ASS, timing das palavras, `validateEpisode`, chaves e planos de montagem), `scripts/episode.mjs`. Create `assets/fonts/` (2 fontes e `OFL.txt`). Modify `docs/CREDITS.md`.
- Modify `scripts/check-visuals.mjs` (Task 1: `smoke-kit` em `debug` e em todo estilo com `episodeScenes`).
- Modify `scripts/app/profiles.mjs`, `scripts/app-server.mjs` (`GET /api/styles`), `app/views/mychannels.js`.
- Create `fixtures/episodes/demo/episode.json` (cerca de 2 min, 8 planos, as 8 cenas, 2 pessoas, com fontes).
- Tests: `tests/episode-kit.test.mjs`, `tests/episode-lib.test.mjs`, `tests/episode-build.test.mjs`, `tests/episode-assemble.test.mjs`. Modify `tests/app-profiles.test.mjs`, `tests/app-server.test.mjs`.

---

### Task 1: Kit de cenas e contrato

**Files:**
- Create: `src/episode/kit.js`, `fixtures/smoke/kit.js`
- Modify: `src/config.js`, `src/styles/debug/draw.js` (`drawK`), `scripts/check-visuals.mjs` (inclui `smoke-kit` em `debug` e em todo estilo com `episodeScenes`, lido do `catalog()`, para que as Tasks 3 a 5 não editem este arquivo), `src/styles/AGENTS.md` (seção "Cena K (kit de episódio)", com o formato da decisão 1)
- Test: `tests/episode-kit.test.mjs`

**Interfaces:**
- Consumes: `src/motion.js` (`hash`, `lerp`, `ease`, `clamp`, `onTwos`), `src/nature/*` (`noise1`/`fbm1`, `makePath`, `creaturePose`, `humanSpec`, `person` de `actors.js`).
- Produces (scripts de navegador, globais como no resto de `src/`; nos testes, carregados por `vm`, como faz `scripts/check-motion.mjs`):
  - `KIT_SCENES`: `{ [id]: { extras: string[], exterior: boolean, build(params, phase, L) => { kit, ground, cam, spots } } }`. `spots` são as posições de chão para atores (`at` 0..1 vira x pelo `ground`).
  - `kitFrame({ scene, params, actors = [], cast = [] }, t, L = 12): F`, conforme a decisão 1. Valida os params (decisão 2) e as ações (decisão 4).
  - `castActor(member, action, at, dir, phase, L, ground, t): actor`, com `kind: 'human'`. As cores do elenco vão em `actor.colors`, e os estilos as usam no lugar da roupa padrão.
- `fixtures/smoke/kit.js` e o projeto `smoke-kit` em `src/config.js`:
  - 8 planos de 1 s, um por cena, com params variados (as 4 horas, chuva, neve e névoa em pelo menos um plano cada) e 2 atores (um `walk`, um `read` ou `sit`);
  - `duration: 8`, `fps: 24`;
  - `compatibleStyles: ['debug', 'flat', 'watercolor', 'pixel']`, estilo padrão `debug`;
  - `LOOPS.kit` com uma cena fixa e `len = 12`, para o teste de emenda.

  O estilo `debug` desenha o kit em contornos simples (adicione `drawK` em `src/styles/debug/draw.js`), para revisar a geometria sem estilo.

- [ ] **Step 1: Write failing tests** (`vm` com `motion`, `nature` e `kit` carregados):

```js
test('every scene and action is periodic in L', () => {
  for (const id of Object.keys(KIT_SCENES)) for (const action of KIT_SCENES[id].exterior ? ['walk', 'stand', 'point'] : ['read', 'sit']) {
    const spec = { scene: id, params: { time: 'night', weather: 'rain', seed: 7, framing: 'wide', extras: [] }, cast: [{ id: 'a', body: 'adult' }], actors: id === 'mapa' ? [] : [{ cast: 'a', action, at: .4, dir: 1 }] };
    for (const t of [0, 3.1, 11.99]) assert.ok(close(strip(kitFrame(spec, t, 12)), strip(kitFrame(spec, t + 12, 12)), 1e-6), `${id}/${action}@${t}`);
  }
});
test('walkers start and end off screen', () => {
  const f = t => kitFrame({ scene: 'campo', params: P, cast: [{ id: 'a', body: 'adult' }], actors: [{ cast: 'a', action: 'walk', dir: 1 }] }, t, 12).actors[0].track.x;
  assert.ok(f(0) < -100 && f(11.999) > 2020);
});
test('invalid params and actions throw readable errors', () => {
  assert.throws(() => kitFrame({ scene: 'mar', params: { ...P, extras: ['temple'] } }, 0), /Parâmetro inválido em mar: extras/);
  assert.throws(() => kitFrame({ scene: 'interior-vela', params: P, cast: [{ id: 'a', body: 'adult' }], actors: [{ cast: 'a', action: 'walk' }] }, 0), /walk/);
  assert.throws(() => kitFrame({ scene: 'nada', params: P }, 0), /Cena desconhecida/);
});
test('frame shape follows the K contract', () => {
  const F = kitFrame({ scene: 'cidade-antiga', params: { ...P, extras: ['temple'] } }, 1, 12);
  assert.equal(F.scene, 'K'); assert.deepEqual(F.texts, []); assert.ok(F.world.kit.layers.some(l => l.kind === 'buildings')); assert.equal(typeof F.world.ground, 'function');
  assert.ok(F.world.kit.layers.every((l, i, a) => i === 0 || a[i - 1].f <= l.f));
});
test('no Math.random or Date in kit', () => { assert.doesNotMatch(readFileSync('src/episode/kit.js', 'utf8'), /Math\.random|Date\.now|new Date|performance\.now/); });
```

`strip(F)` troca funções (`ground`, `prof`) pelos seus valores em x = 0, 480, …, 1920; `close` compara números com tolerância. `P = { time: 'night', weather: 'clear', seed: 1, framing: 'wide', extras: [] }`.

- [ ] **Step 2: Run** `node --test tests/episode-kit.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `kit.js`, `fixtures/smoke/kit.js`, o projeto `smoke-kit` e o `drawK` do `debug`.
- [ ] **Step 4: Run** `node --test tests/episode-kit.test.mjs` (PASS) e `node render.mjs --project=smoke-kit --style=debug --storyboard --out=out/check/kit-debug.jpg`. Abra a folha. Expected: as 8 cenas são legíveis em contorno, os atores estão no chão e o interior e o mapa se distinguem.
- [ ] **Step 5: Run** `node scripts/check-motion.mjs --project=smoke-kit --2d --style=debug`. Expected: 0 violações. Depois `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: episode scene kit and K frame contract`.

### Task 2: Fontes e legenda ASS

**Files:**
- Create: `scripts/episode-lib.mjs` (parte ASS), `assets/fonts/PressStart2P-Regular.ttf`, `assets/fonts/AtkinsonHyperlegible-Regular.ttf`, `assets/fonts/AtkinsonHyperlegible-Bold.ttf`, `assets/fonts/OFL-PressStart2P.txt`, `assets/fonts/OFL-AtkinsonHyperlegible.txt`
- Modify: `docs/CREDITS.md`
- Test: `tests/episode-lib.test.mjs`

**Interfaces:**
- Produces:
  - `wordTimes(sentence: {start, end, text}): {w, start, end}[]`: decisão 11; o primeiro começa em `start` e o último termina em `end`.
  - `chunks(words, max = 7): {words, start, end}[]`.
  - `assEscape(s): string`: troca `\` por `＼`, `{` por `｛`, `}` por `｝` e quebra de linha por espaço.
  - `buildAss({ timing, episode, style }): string`:
    - cabeçalho `[Script Info]` com `PlayResX: 1920` e `PlayResY: 1080`;
    - `[V4+ Styles]`: `Caption`, `Chapter`, `Hud`, `Place` e `Tag`, com fonte e cor por estilo (decisão 11);
    - `[Events]`;
    - tempos no formato `H:MM:SS.cc`.
- Fontes: baixe do repositório `google/fonts`, de `ofl/pressstart2p` e `ofl/atkinsonhyperlegible`, os `.ttf` e o `OFL.txt` de cada uma. É download público; nenhum dado pessoal vai junto. Em `docs/CREDITS.md`: nome, autor, licença SIL OFL 1.1 e URL.

- [ ] **Step 1: Write failing tests**

```js
test('wordTimes is proportional and covers the sentence', () => {
  const w = wordTimes({ start: 10, end: 13, text: 'O céu se move.' });
  assert.equal(w[0].start, 10); assert.equal(w.at(-1).end, 13); assert.ok(w[0].end - w[0].start < w[1].end - w[1].start);
});
test('chunks of up to 7 words', () => { assert.deepEqual(chunks(wordTimes({ start: 0, end: 9, text: 'um dois três quatro cinco seis sete oito nove' })).map(c => c.words.length), [7, 2]); });
test('ass escapes override braces and backslashes', () => {
  const ass = buildAss({ style: 'pixel', episode: { chapters: [{ id: 'c', title: 'A {\\b1} B' }], shots: [] }, timing: { chapters: [{ id: 'c', title: 'A {\\b1} B', start: 0, end: 5 }], shots: [{ id: 's', start: 0, end: 5, speech: [{ start: 1, end: 2, text: 'Olá {x}\\n mundo' }] }] } });
  assert.ok(!/\{\\b1\}/.test(ass)); assert.match(ass, /Olá ｛x｝/); assert.match(ass, /PlayResX: 1920/); assert.match(ass, /Press Start 2P/);
});
test('one caption event per word with the current word highlighted', () => {
  const ass = buildAss({ style: 'flat', episode: { chapters: [], shots: [] }, timing: { chapters: [], shots: [{ id: 's', start: 0, end: 4, speech: [{ start: 0, end: 3, text: 'três palavras aqui' }] }] } });
  assert.equal((ass.match(/^Dialogue: .*,Caption,/gm) || []).length, 3); assert.match(ass, /Atkinson Hyperlegible/);
});
test('hud and tag events come from shot.hud', () => {
  const episode = { chapters: [{ id: 'c', title: 'C', shots: [{ id: 's', hud: { year: '1811', sub: 'Inverno', place: 'Vilarejo', tag: { text: 'Ana', sub: 'agricultora', actor: 0 } }, actors: [{ cast: 'a', action: 'stand', at: .3 }] }] }] };
  const ass = buildAss({ style: 'pixel', episode, timing: { chapters: [{ id: 'c', title: 'C', start: 0, end: 6 }], shots: [{ id: 's', start: 0, end: 6, speech: [] }] } });
  for (const s of ['Hud', 'Place', 'Tag']) assert.match(ass, new RegExp(`,${s},`)); assert.match(ass, /1811/);
});
```

- [ ] **Step 2: Run** `node --test tests/episode-lib.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement**, baixe as fontes e atualize os créditos.
- [ ] **Step 4: Verify ASS real:** gere um ASS de 10 s e rode `ffmpeg -f lavfi -i color=c=0x202030:s=1920x1080:d=10 -vf "subtitles=out/check/t.ass:fontsdir=assets/fonts" -frames:v 1 -ss 2 out/check/ass.png` com `cwd` na raiz. Abra a imagem. Expected: a fonte pixel aparece, a palavra está destacada e a caixa de HUD está no canto.
- [ ] **Step 5: Run** `node --test tests/episode-lib.test.mjs`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: episode captions and screen text in ASS`.

### Task 3: Pixel art no quadro F com o kit

**Files:**
- Create: `src/styles/pixel/draw.js`
- Modify: `src/styles/pixel/config.js` (paleta de até 48 cores com as rampas, `episodeScenes`, scripts `['src/styles/pixel/engine.js', 'src/styles/pixel/draw.js']`), `src/styles/pixel/GUIDE.md` (seção do kit)

**Interfaces:**
- Consumes: contrato K e `smoke-kit` (Task 1); `animationEngine.context`, `buffer`, `quantize` do `engine.js`.
- Produces: `ExpStyle.draw(F)` para `F.scene === 'K'`, desenhando todas as primitivas e os atores `human` (decisão 6). As cenas que não são `K` não são obrigatórias no `pixel`.
- Referência visual: extraia quadros do story para `refs/pixel-story/` (fora do git) com `ffmpeg -ss <t> -i docs/arquivos/video_2026-10-28_22-17-07.mp4 -frames:v 1`, nos tempos 1,5 s e 7 s.

O que reproduzir e superar:
- céu em degradê pontilhado;
- estrelas de 1 px com cintilação;
- lua em disco com faixas horizontais;
- montanhas em 2 ou 3 camadas, cada uma mais fria com a distância;
- pinheiros em silhueta serrilhada;
- casas com telhado e janelas acesas (com brilho de 1 px em volta);
- chão com textura de pontilhado estático;
- bonecos com silhueta clara.

- [ ] **Step 1: Implement** `draw.js` e a paleta. A quantização continua no `engine.js`. A câmera é arredondada à grade antes do desenho.
- [ ] **Step 2: Render and look:**
  - `node render.mjs --project=smoke-kit --style=pixel --storyboard --out=out/check/kit-pixel.jpg`;
  - `node render.mjs --project=smoke-kit --style=pixel --stills=0.5,3.5,5.5 --out=out/check/kit-pixel-stills` (PNG sem perdas).

  Abra os dois e compare lado a lado com `refs/pixel-story/`. Expected: as 8 cenas são legíveis, a paleta e o pontilhado aparecem, não há pixel isolado acidental, os pés tocam o chão e cada boneco tem de 26 a 34 px.
- [ ] **Step 3: Emenda do loop:** `node render.mjs --project=smoke-kit --style=pixel --loop=kit --strip=11.75:12 --cols=6 --w=320 --out=out/check/kit-pixel-seam.jpg` e o mesmo de 0 a 0.25. Expected: continuidade sem salto entre o último e o primeiro quadro.
- [ ] **Step 4: Run** `npm run test:visual` (paleta, blocos, determinismo e workers do `smoke-kit` em `pixel`: PASS) e `node scripts/check-motion.mjs --project=smoke-kit --2d --style=pixel` (0 violações).
- [ ] **Step 5: Commit** `feat: pixel style draws the episode kit`.

### Task 4: Flat com o kit

**Files:**
- Modify: `src/styles/flat/draw.js` (ramo `if (F.scene === 'K') return drawK(F)`, junto do ramo `P`/`N`), `src/styles/flat/config.js` (rampas por `mood`, `episodeScenes`)

**Interfaces:**
- Consumes: contrato K e `smoke-kit` (Task 1). Reaproveite `sky`, `band`, `vgrad`, `clouds` e `motes`, e o desenho de `human` que o `flat` já tem.
- Produces: `drawK(F)`: todas as primitivas no estilo do `flat`: sem contorno, gradientes suaves, brilho aditivo nas luzes, sombras longas do sol e camadas mais frias com a distância.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Render and look:** `--storyboard` e `--stills=0.5,3.5,5.5` do `smoke-kit` em `flat`, e a tira da emenda, como na Task 3. Abra as imagens. Expected: as 8 cenas legíveis no idioma do `flat`, sem salto na emenda.
- [ ] **Step 3: Run** `npm run test:visual` e `node scripts/check-motion.mjs --project=smoke-kit --2d --style=flat`. Expected: PASS e 0 violações.
- [ ] **Step 4: Commit** `feat: flat style draws the episode kit`.

### Task 5: Aquarela com o kit

**Files:**
- Modify: `src/styles/watercolor/draw.js` (o mapa de `F.shot` ganha as 8 cenas K, ou um ramo `F.scene === 'K'` antes dele), `src/styles/watercolor/config.js` (rampas, `episodeScenes`)

**Interfaces:**
- Consumes: contrato K e `smoke-kit` (Task 1). Reaproveite `still(...)` para fundos parados: céu, camadas longe, papel. Cache por `scene + params + mood`, nunca por quadro. O que se move é desenhado por quadro.
- Produces: `drawK(F)` no idioma da aquarela: aguada, borda de pigmento, nanquim leve e papel em multiply.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Render and look:** igual à Task 4, em `watercolor`. Anote o ms por quadro que o `render.mjs` imprime. Expected: ≤ 400 ms por quadro depois do cache.
- [ ] **Step 3: Run** `npm run test:visual` e `node scripts/check-motion.mjs --project=smoke-kit --2d --style=watercolor`. Expected: PASS e 0 violações.
- [ ] **Step 4: Commit** `feat: watercolor style draws the episode kit`.

### Task 6: Player e projeto do episódio

**Files:**
- Create: `src/episode/player.js`, `scripts/build-episode.mjs`, `fixtures/episodes/demo/episode.json`
- Modify: `.gitignore` (+`src/episodes.js`)
- Test: `tests/episode-build.test.mjs`

**Interfaces:**
- Consumes: `kitFrame` (Task 1); `catalog()` de `render-lib.mjs`; formato de `timing.json` (`layoutTimeline` de `narration-lib.mjs`).
- Produces:
  - `episodeProject(ep, timing): object`, com as regras da decisão 7, exportada de `build-episode.mjs` para teste;
  - `loopKeyOf(shot): string`: o id estável da cena no projeto (`<scene>-<sha1 curto de params, actors e cast usado>`). A chave do acervo (Task 8) é outra coisa;
  - `writeEpisodes(projects, file = 'src/episodes.js')`;
  - CLI `node scripts/build-episode.mjs <pasta>`.
- `player.js`, as regras da decisão 8:
  - lê `PROJECT.episode`;
  - registra `shotsById` e `LOOPS[loopKeyOf(shot)]` (via `LOOPS[k] = t => ExpStyle.draw(kitFrame(spec, t, L)); LOOPS[k].len = L`);
  - registra `LOOPS.elenco`.
- `fixtures/episodes/demo/episode.json`:
  - `style: 'pixel'`;
  - 3 capítulos e 8 planos, um por cena;
  - narração curta em pt-BR (2 ou 3 frases por plano) sobre um tema real com `sources` (por exemplo, a história dos faróis, com 2 fontes da Wikipedia e data de acesso);
  - 2 pessoas no elenco;
  - `hud` em 3 planos;
  - um plano sem fala de 3 s.

- [ ] **Step 1: Write failing tests**

```js
const timing = { id: 'demo', fps: 24, duration: 20, chapters: [{ id: 'c1', title: 'Um', start: 0, end: 20 }],
  shots: [{ id: 's1', chapter: 'c1', start: 0, end: 12, speech: [{ start: .25, end: 3, text: 'Olá.' }] }, { id: 's2', chapter: 'c1', start: 12, end: 20, speech: [] }] };
const ep = { id: 'demo', style: 'pixel', cast: [{ id: 'a', body: 'adult' }], sources: [{ url: 'https://pt.wikipedia.org/wiki/Farol', title: 'Farol', accessed: '2026-10-29' }],
  chapters: [{ id: 'c1', title: 'Um', shots: [{ id: 's1', narration: 'Olá.', scene: { id: 'mar', params: { time: 'night', weather: 'clear', seed: 1, framing: 'wide', extras: ['lighthouse'] } } }, { id: 's2', scene: { id: 'mar', params: { time: 'night', weather: 'clear', seed: 1, framing: 'wide', extras: ['lighthouse'] } } }] }] };
test('episode project passes platform validation and covers the duration', () => {
  const p = episodeProject(ep, timing), ctx = vmWithPlatform(); ctx.AnimationPlatform.registerProject(p);
  assert.equal(p.id, 'ep-demo'); assert.equal(p.duration, 20); assert.deepEqual(p.storyboard.map(s => [s.start, s.end]), [[0, 12], [12, 20]]);
  assert.ok(p.storyboard[1].reads[0].text);
});
test('same scene in two shots shares one loop key', () => { const p = episodeProject(ep, timing); assert.equal(loopKeyOf(p.episode.shots[0]), loopKeyOf(p.episode.shots[1])); });
test('writeEpisodes replaces the same id and keeps others', () => {
  writeEpisodes([episodeProject(ep, timing)], f); writeEpisodes([{ ...episodeProject(ep, timing), id: 'ep-outro' }], f); writeEpisodes([episodeProject(ep, timing)], f);
  assert.equal((readFileSync(f, 'utf8').match(/registerProject/g) || []).length, 2);
});
```

`vmWithPlatform()` carrega `src/platform.js` e os `config.js` dos estilos num `vm`, como faz `catalog()`. `writeEpisodes` precisa aceitar `file` para o teste usar um diretório temporário.

- [ ] **Step 2: Run** `node --test tests/episode-build.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` (PASS). Depois, com um `timing.json` de mentira escrito à mão para a demo, rode `node scripts/build-episode.mjs fixtures/episodes/demo` e `node render.mjs --project=ep-demo --loop=elenco --stills=0.5 --out=out/check/elenco`. Abra a ficha. Expected: 2 pessoas, as poses legíveis e identidade consistente entre as poses.
- [ ] **Step 5: Commit** `feat: episode player and project builder`.

### Task 7: Validação do episódio

**Files:**
- Modify: `scripts/episode-lib.mjs` (depois da Task 2, na mesma onda)
- Test: `tests/episode-lib.test.mjs`

**Interfaces:**
- Consumes: `KIT_SCENES` (lista de ids, extras e `exterior`). Como `kit.js` é script de navegador, leia por `vm`, como nos testes, ou exporte uma cópia JSON dos ids e extras gerada a partir de `kit.js`. Mantenha uma fonte só: carregue `kit.js` num `vm` dentro de `episode-lib.mjs`.
- Produces: `validateEpisode(ep): { ok: true, warnings: string[] }` ou lança `Error` com a mensagem do campo. Regras:
  - campos da decisão 14;
  - `style` com `episodeScenes`;
  - ids de plano únicos e no formato `^[a-z][a-z0-9-]*$`;
  - cena e params válidos;
  - atores do elenco que existem;
  - `walk` só em exterior;
  - `sources` obrigatório se houver narração;
  - `loopLen` entre 10 e 20;
  - aviso (não erro) para a mesma cena com os mesmos params em planos seguidos.

- [ ] **Step 1: Write failing tests** com casos para cada regra (uma asserção por mensagem). Inclua a demo da Task 6, que precisa passar sem avisos.
- [ ] **Step 2: Run** `node --test tests/episode-lib.test.mjs`. Expected: FAIL nos casos novos.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: episode validation`.

### Task 8: Acervo, segmentos e montagem

**Files:**
- Create: `scripts/episode.mjs`
- Modify: `scripts/episode-lib.mjs`, acrescentando as funções puras de planejamento abaixo
- Test: `tests/episode-assemble.test.mjs`

**Interfaces:**
- Consumes: Tasks 2, 6 e 7; `scripts/narrate.mjs`, `scripts/mix-audio.mjs`, `render.mjs` (`--loop --clip`), `scripts/verify-video.mjs`; `sourceSnapshot` de `render-lib.mjs`.
- Produces (puras, em `episode-lib.mjs`):
  - `acervoKey({ style, styleConfig, scene, params, castUsed, actors, L, fps, sourceHash }): string`, sha256 hex (decisão 9);
  - `segmentArgs(loopFile, dur, out): string[]` (decisão 10, sem fade se `dur < 2`);
  - `concatList(files): string`, com caminhos relativos e `'` escapado;
  - `assembleArgs({ list, ass, audio, out }): string[]`.
- Produces (I/O, `scripts/episode.mjs`):
  - `runEpisode(dir, { steps, workers, run = spawn wrapper, log = line => stdout })`, com as etapas da decisão 12;
  - `loops`: renderiza só as chaves que faltam no acervo, em série (um Chrome por vez; `--workers` repassado ao `render.mjs`);
  - `segments` e `assemble` com `cwd` na raiz;
  - `verify`: `verify-video` mais a checagem da duração contra `timing.duration` (± 1/24 s).

- [ ] **Step 1: Write failing tests**

```js
test('acervo key changes with style, params, L and source; not with episode id', () => {
  const base = { style: 'pixel', styleConfig: {}, scene: 'mar', params: { time: 'night' }, castUsed: [], actors: [], L: 12, fps: 24, sourceHash: 'h' };
  const k = acervoKey(base); assert.match(k, /^[0-9a-f]{64}$/);
  for (const patch of [{ style: 'flat' }, { params: { time: 'day' } }, { L: 14 }, { sourceHash: 'h2' }]) assert.notEqual(acervoKey({ ...base, ...patch }), k);
});
test('segment args: fades, loop, no windows paths', () => {
  const a = segmentArgs('out/acervo/k.mp4', 30, 'out/episodes/x/seg/k-30.mp4').join(' ');
  assert.match(a, /-stream_loop -1/); assert.match(a, /fade=t=out:st=29\.25:d=\.75/); assert.ok(!/\\|C:/.test(a));
  assert.ok(!/fade/.test(segmentArgs('a.mp4', 1.5, 'b.mp4').join(' ')));
});
test('assemble args burn subtitles with relative fontsdir and copy audio', () => {
  const a = assembleArgs({ list: 'out/episodes/x/concat.txt', ass: 'out/episodes/x/subs.ass', audio: 'out/episodes/x/mix.m4a', out: 'out/episodes/x/video.mp4' }).join(' ');
  assert.match(a, /subtitles=out\/episodes\/x\/subs\.ass:fontsdir=assets\/fonts/); assert.match(a, /-c:a copy/); assert.match(a, /-f concat/);
});
test('runEpisode renders each acervo key once and skips existing', async () => { /* run falso registra os comandos; dois planos com a mesma cena geram 1 render; segunda execução gera 0 */ });
test('runEpisode reports a failing step as JSON and exit code', async () => { /* run falso falha no render: log tem {"step":"loops","error":...} e a promessa rejeita */ });
```

Escreva os dois últimos testes de fato, com um `run` falso que grava os comandos e cria os arquivos de saída esperados. Não deixe comentário no lugar.

- [ ] **Step 2: Run** `node --test tests/episode-assemble.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Smoke real:**
  - `node scripts/episode.mjs fixtures/episodes/demo`, com o Kokoro do venv. Sem o venv, instale-o conforme `docs/VOICE.md`, fora do git.
  - Abra `out/episodes/demo/video.mp4.review/decoded-sheet.png`.

  Expected:
  - MP4 com a duração do `timing.json` (± 1 quadro), 24 fps, 1920×1080 e áudio AAC;
  - a legenda destaca palavra a palavra;
  - o HUD aparece nos 3 planos;
  - a ficha da demo (`--loop=elenco`) está coerente com os bonecos do vídeo.

  Rodando de novo, a etapa `loops` não renderiza nada.
- [ ] **Step 6: Commit** `feat: episode acervo, segments and assembly`.

### Task 9: Estilos de vídeo no app

**Files:**
- Modify: `scripts/app/profiles.mjs`, `scripts/app-server.mjs`, `app/views/mychannels.js`
- Test: `tests/app-profiles.test.mjs`, `tests/app-server.test.mjs`

**Interfaces:**
- Consumes: `catalog()` de `scripts/render-lib.mjs`; `episodeScenes` nos `config.js` (Tasks 3 a 5).
- Produces:
  - `EPISODE_STYLES`, calculado na importação: os ids dos estilos com `episodeScenes?.length`, em ordem alfabética;
  - `styleNames(): {id, name}[]`;
  - `GET /api/styles` responde `styleNames()`;
  - o formulário de Meus canais carrega os estilos dessa rota.

  Ajuste os testes que fixavam `['flat', 'watercolor']`.

- [ ] **Step 1: Write failing tests:**
  - `assert.deepEqual(EPISODE_STYLES, ['flat', 'pixel', 'watercolor'])`;
  - `GET /api/styles` responde 200 com os 3, com `name`.
- [ ] **Step 2: Run** os dois arquivos de teste. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS. Faça também o grep de `innerHTML|outerHTML|insertAdjacentHTML|document\.write|on[a-z]+="` em `app/`. Expected: vazio.
- [ ] **Step 5: Commit** `feat: video styles from style capabilities`.

### Task 10: Aceite

**Files:** `docs/VALIDATION.md` (uma entrada curta).

- [ ] **Step 1:** Rode `node scripts/episode.mjs fixtures/episodes/demo` nos 3 estilos, trocando `style` numa cópia da demo em `out/tmp/demo-<estilo>/`. Para cada um:
  - `verify-video` aprovado;
  - `decoded-sheet.png` aberto e olhado;
  - tempo por etapa anotado.
- [ ] **Step 2: Comparação com o story:** monte uma folha lado a lado com 2 quadros da demo em `pixel` e `refs/pixel-story/`, e abra. Anote o que ficou igual, melhor e pior. Se algo do pixel ficou pior que o story (silhueta, céu, luz), corrija na Task 3 antes de seguir.
- [ ] **Step 3: Longa duração:** um episódio de cerca de 30 min. Duplique os capítulos da demo com narração nova, de texto descritivo sem fatos, até lá, em `pixel`. Expected:
  - o acervo reusa as 8 cenas (0 renders novos depois da demo);
  - `verify-video` aprovado;
  - tempos registrados (narração, segmentos, montagem).

  Esses números dimensionam a fase 6.
- [ ] **Step 4:**
  - `git status --porcelain data/ out/ src/episodes.js`. Expected: vazio.
  - `npm test` e `npm run test:visual`. Expected: PASS.
  - Registre em `docs/VALIDATION.md`: por estilo, a duração, o tempo das etapas, o tamanho do acervo e a revisão visual de fato.
  - Commit `docs: episode engine acceptance`.
