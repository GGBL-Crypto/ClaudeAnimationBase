# Guia do episódio `sauva-operaria`

Referência de trabalho para quem pinta um capítulo. Leia antes: `CLAUDE.md`, `ANIMATION_GUIDE.md`, `src/styles/cartoon/GUIDE.md`, `src/scenes/AGENTS.md` e o seu capítulo em `roteiro.md` (narração e visual de cada plano). Tempos exatos em `timing.json`. Exemplos que funcionam: `src/scenes/teste-movimento.js` (mundo, câmera, multidão, chuva, poeira) e `src/scenes/modelos.js` a partir de t = 4 (todos os elementos novos da saúva).

## Arquivos e contrato

Cada subagente edita **só** o próprio arquivo:

| cap. | arquivo | planos | início–fim (s) |
|---|---|---|---|
| c1 A revoada | `src/episodes/sauva-operaria/c01_revoada.js` | c1s01–c1s09 | 0 (1,00)–91,33 |
| c2 A cidade | `c02_cidade.js` | c2s01–c2s05 | 91,33–148,00 |
| c3 Do ovo à operária | `c03_crescimento.js` | c3s01–c3s07 | 148,00–223,60 |
| c4 Os primeiros trabalhos | `c04_trabalhos.js` | c4s01–c4s05 | 223,60–285,47 |
| c5 A trilha | `c05_trilha.js` | c5s01–c5s05 | 285,47–352,03 |
| c6 O ataque | `c06_ataque.js` | c6s01–c6s08 | 352,03–444,67 |
| c7 Dentes gastos | `c07_dentes.js` | c7s01–c7s05 | 444,67–507,13 |
| c8 O fim | `c08_fim.js` | c8s01–c8s06 | 507,13–573,53 |

Como o arquivo entra no vídeo (`scripts/build-episodes.mjs`): todo `src/episodes/sauva-operaria/c*.js` vira script do projeto, em ordem alfabética, depois de `src/nature/*.js` e antes de `src/episodes/placeholder.js`. O placeholder pinta céu + texto em todo plano cujo início ainda não tem cena; por isso um capítulo pode ser entregue plano a plano. Depois de **criar** o arquivo, rode `node scripts/build-episodes.mjs` (regera `src/episodes.js`; não edite esse arquivo à mão nem o inclua no seu commit se só ele mudou por causa do build de outro capítulo).

Regras do contrato:
- Arquivo envolto em IIFE; registre os planos com `shotsById({ c1s01: fn, ... })` (`src/timeline.js`). O início vem do storyboard pelo ID, então nunca escreva tempos de corte à mão. ID desconhecido ou plano registrado duas vezes lança erro.
- `fn(t, lt, dur)`: `t` = tempo do vídeo, `lt` = tempo desde o corte, `dur` = duração do plano. Pinta o quadro inteiro, fundo incluso. Função pura de `t`: sem `Math.random()`, relógio ou estado entre quadros; use `hash`, `noise1`, `frac` e sementes fixas por objeto.
- O primeiro plano do vídeo (c1s01) começa em 0, não em 1,00: o storyboard estica o primeiro plano sobre o segundo de introdução.
- Nada global: tudo dentro da IIFE. Nunca `window.PROJECT`; use `PROJECT`, `STYLE`, `W`, `H`.

Esqueleto mínimo que funciona (`c01_revoada.js`):

```js
// c01_revoada.js: capítulo 1 de sauva-operaria (A revoada), planos c1s01–c1s09.
(() => {
  const P = STYLE.palette, A = () => NatureArt;
  // Protagonista: mesmas constantes em todos os capítulos (copie sem mudar).
  const at = id => PROJECT.storyboard.find(s => s.id === id).start;
  const SEED = 7, LOOK = { color: P.hero, dark: mixCol(P.hero, P.ink, .35) };
  const BORN = at('c3s04'), DIES = at('c8s01'), age = t => clamp((t - BORN) / (DIES - BORN));
  const her = o => creaturePose(SPECS.ant, { seed: SEED, age: age(o.t), ...o });

  const gy = x => 820 + 14 * Math.sin(x * .004 + 1);
  const TRAIL = makePath([[-200, 820], [2200, 820]]);
  function c1s01(t, lt, dur) {
    Kit.gradient();
    A().cloud(380 + 6 * t, 140, .8, 1);
    A().ground(gy, 0, W);
    for (const a of crowd(TRAIL, t, 12, 3, { speed: 60, spacing: 200, sizeVar: .1 })) {
      const sz = 40 * a.size;
      A().creature(creaturePose(SPECS.ant, { path: TRAIL, s: a.s / sz, size: sz, ground: gy, t, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null }));
    }
  }
  function c1s02(t, lt) {
    Kit.gradient();
    A().ground(gy, 0, W);
    const m = travel(lt, [[0, 0], [3, 2]], { start: .5, stop: .8, seed: SEED });
    A().creature(her({ path: TRAIL, s: 4 + m.s, size: 300, ground: gy, t, moving: m.moving, lean: m.lean, antennae: 'explore' }), LOOK);
  }
  shotsById({ c1s01, c1s02 });
})();
```

## Protagonista e continuidade

- **Uma operária só**, sempre `SPECS.ant`, `seed: 7` e `LOOK = { color: P.hero, dark: mixCol(P.hero, P.ink, .35) }` (bloco do esqueleto, copiado igual em todo capítulo). O vermelho `P.hero` aparece só nela: irmãs, rainha, soldada, caroneira e mosca usam o `look` padrão do `decor` (sem segundo argumento).
- Antes de nascer (c2s05–c3s04) ela é o ovo, a larva e a pupa de `seed: 7`, no centro do quadro e com a câmera nela; esses desenhos não têm `look`.
- **Idade derivada de t:** `age(t)` = 0 no nascimento (início de c3s04) e 1 no último dia (início de c8s01). Passe sempre por `her({...})`: `creaturePose` usa `age` para encurtar passada, levantar menos os pés e acalmar antenas (`ageK = 1 − .5·age`). Outros estados contínuos seguem o mesmo padrão, por ID de plano e nunca por constante solta: o ovo eclode em `hatch = clamp((t − at('c3s01')) / 3)`; a vida acaba com `alive: 1 − ease(seg(t, at('c8s01') + 3, at('c8s01') + 6))`.
- Leitura de tamanho: operária média = 1 BL; jardineira/mínima ≈ .45 BL (`SPECS.minima`), soldada ≈ 1,4 BL (`SPECS.soldier`), rainha ≈ 2 BL (`SPECS.queen`), mosca ≈ .5 BL (`SPECS.fly`). Num plano em que ela é o assunto, ela ocupa ao menos 1/3 da altura do quadro.
- Direção: a trilha vai da esquerda para a direita na ida (folha nova) e da direita para a esquerda na volta ao ninho; no corte do solo, a superfície fica em cima e o ninho cresce para baixo.

## API disponível (toda conferida no código)

Matemática (`src/motion.js`): `clamp lerp seg kf ease easeIn easeOut backOut hash frac spring springMove springTrack SPRING anticipate mixCol arcPt`. Natureza (`src/nature/`): `makePath(pts)` → `{length, at(d)}`; `noise1 fbm1 wind bladeBend`; `travel(t, keys, {start, stop, seed})` → `{s, speed, moving, lean, drag}`; `crowd(path, t, n, seed, {speed, spacing, carryEvery, sizeVar})` → `[{s, size, carry, seed}]` (s em px se speed/spacing em px); `rain(t, area, rate, seed)`; `stepEvents(sOf, t0, t1, offset, stride, duty, vary, seed)` (pegadas → `NatureArt.dust`, ver `dust()` em teste-movimento); `flutter(t, t0, [x, y], groundY, seed)` → `{x, y, angle, landed}`; `chain(base, angle0, lengths, t, seed, o)`; `mood(t, keys, seed)` (`{expression, blink, emote, sq}`); `smear(poseAt, t)` para ação rápida; `blink`, `talk`, `ik2`, `GAITS`.

`creaturePose(spec, o)`: `path, s (BL), size (px/BL), ground(x), t, seed, view ('side'|'top'), moving 0..1, gait ('fly' para alados, rainha e mosca), age 0..1, alive 0..1, flinch 0..1 (susto), lean, drag, sq, facing, carry {w, h}, antennae ('explore'|'tap'), emote ('!', '?', 'sweat', 'zzz', 'note'; normalmente via `mood`)`.

`SPECS`: `ant queen alate soldier minima fly bird` (+ `human dog spider fish`, fora deste episódio).

`NatureArt` (`A()` no esqueleto): `creature(pose, look)` com `look.wings` (false = sem asas), `look.jaws` 0..1 (mandíbulas abertas), `look.eyes` (false); cenário `sky(chuva) grade(chuva) ground(perfil, x0, x1, cor) props tuft blade rock tree cloud leafPiece drop ripple dust water`; ninho `soil(x, y, w, h, seed) tunnel(path, largura) chamber(x, y, w, h, seed, waste) roots(x, y, len, grow, seed) fungus(x, y, w, h, t, seed, grow, parasite)`; cria `egg(x, y, r, t, seed, hatch) larva(x, y, size, t, seed, facing) pupa(x, y, size, t, seed, facing)`; `rider(carrierPose, t, seed, k)`; `wing(x, y, len, angle)`.

`Kit`: `cam(cx, cy, zoom, rot, shake)`/`camEnd()`, `poly ellipse line gradient text(str, x, y, size, cor, {k}) iris(x, y, r) wipe flash(k, cor) vignette(k)`. Contexto nativo: `animationEngine.context` (sempre `save`/`restore`).

Notas da Task 13b:
- Com caroneira em cima, a folha carregada é `carry: { w: 1, h: .4 }`; depois `A().creature(pose)` chame `A().rider(pose, t, seed)`. O padrão `{ w: 1.1, h: .7 }` cobre a cabeça da carregadora.
- Asas a 9–12 Hz (alados 9, mosca 12) viram zumbido a 30 fps. Em close, baixe a frequência só naquele plano: `const FLY = { ...SPECS.fly, flyer: { ...SPECS.fly.flyer, freq: 4 } }` e use `FLY` em `creaturePose`.
- Pairar: `flyer.hover` faz a mosca derivar com `s` fixo. Mergulho: caminho que desce e `s` com `easeIn` (`episode()` de `modelos.js`).
- Câmaras e túneis são colocados à mão: primeiro `soil`, depois todos os `tunnel`, depois as `chamber`, depois `roots`, `fungus` e os seres. Guarde o mapa do ninho como constante do capítulo.
- Vibração do corte: `for (let i = 0; i < 3; i++) A().ripple(x, y, frac(t * 1.2 + i / 3))`.
- Asas que caem: `flutter` + `A().wing(f.x, f.y, len, f.landed ? 0 : f.angle)`.

## Regras de direção

- Algo novo a cada 2 a 4 s: movimento, revelação, corte ou reação. Plano parado só com vida (antenas, respiração, capim ao vento, fundo andando).
- 3 ou mais detalhes de vida de fundo por quadro que não carregam o enredo: irmãs passando ao fundo, capim (`blade` + `wind`), nuvem andando, grão de terra caindo, fungo respirando.
- Câmera com intenção: cada plano diz por que a câmera se move (seguir, revelar, aproximar). Movimento por `springMove`/`ease` sobre `Kit.cam`; nenhum plano totalmente parado nem câmera tremendo à toa.
- Mostre a ideia em vez de rotular: "noite" é céu escuro com lua e silhuetas, não um texto. Os textos de tela do roteiro (nomes, números) entram com `Kit.text(..., { k })` (k de 0 a 1 em ~.4 s) perto do assunto, nunca centralizados sobre gradiente nem como rótulo de canto.
- Escala variada: geral, médio e ao menos um close extremo por capítulo.
- Causa antes da reação: a mosca mergulha, depois ela se assusta (`flinch` com `anticipate`, emote `!`).
- Transição de saída motivada: corte seco na continuidade da ação, match cut (forma ou movimento igual dos dois lados) ou íris onde o roteiro marca (c1s09 fecha, c2s01 abre, c8s01 abre, c8s06 fecha). Íris: `Kit.iris(x, y, r)` centrada na protagonista ou no assunto, r de ~2300 a 0.
- A virada do capítulo cai numa pausa da narração (há 1,6 s entre capítulos): segure a imagem com vida, sem ação nova, nesse respiro.
- O fim (c8s06) retoma a abertura (c1s01): o mesmo gramado e a mesma trilha, agora ao entardecer.
- Proibido: título centralizado sobre gradiente, tudo entrando por fade, partículas genéricas, molduras e rótulos nos cantos.

## Paleta e luz por capítulo

Só chaves de `STYLE.palette` e `mixCol`; nada de cor hexadecimal nova.

| cap. | lugar | luz e cor |
|---|---|---|
| c1 | gramado de dia → céu de fim de tarde → câmara da rainha | dia: `Kit.gradient()` padrão; fim de tarde: `gradient(mixCol(P.skyTop, P.wingAccent, .35), mixCol(P.skyLow, P.sun, .5))`; câmara: `soil` e escurecer em c1s08 com `Kit.flash(k, P.shade)` (k até .45) |
| c2 | corte largo do ninho, câmara real, câmara de fungo | terra quente, fungo claro como ponto de luz; `Kit.vignette(.3)` nos closes |
| c3 | câmara de cria e fungo | o mais claro do subsolo: fungo e cria em creme, vinheta leve |
| c4 | câmara de lixo funda, jardim no escuro | mais escuro: `Kit.flash(.25, P.shade)` sobre o subsolo; lixo nos tons de `chamber(..., waste)`; jardim "luz baixa e quente" com `Kit.flash(.12, P.sun)` |
| c5 | saída do ninho, trilha ao sol, noite | primeira luz forte: céu saturado, verdes vivos; c5s04b escurece o céu (`mixCol(P.skyTop, P.shade, k)`); c5s04c noite: `Kit.flash(.55, P.shade)`, lua em `Kit.ellipse` com `P.sun`, carregadoras com `{ color: P.ink, dark: P.line }` |
| c6 | trilha de dia, tensa | dia mais frio: `gradient(mixCol(P.skyTop, P.stone, .3), P.skyLow)`; c6s07b anoitece, c6s07c noite como c5s04c |
| c7 | trilha nublada e chuva; ninho seco | `A().sky(rk)` + `A().grade(rk)` e `rain()` com rk subindo em c7s04 (padrão `showers()` de teste-movimento); subsolo sem chuva, quente |
| c8 | câmara em luz baixa, raízes, copa, gramado ao entardecer | câmara como c4; a subida pela raiz clareia até o céu de fim de tarde de c1 |

## Orçamento e revisão

- ≤ 80 ms por quadro (mediana, Chrome; descarte os 2 primeiros valores de `ms/quadro`, que são aquecimento). Seres com `size < 28` px já saem na forma simplificada: use isso nas multidões distantes. Evite `clip` (custa ~6× um preenchimento), limite seres detalhados a ~12 por quadro e corte com `x0/x1` o que está fora da câmera.
- Folha por plano (início +.05, meio, fim −.05); a saída imprime `ms/quadro` de cada quadro:
  `node render.mjs --project=sauva-operaria --sheet=1.05,7.5,14 --cols=3 --w=640 --out=out/check/sauva/c1s01.jpg`
- Tira de 1 s numa ação (antecipação, contato, pouso, corte):
  `node render.mjs --project=sauva-operaria --strip=10:11 --cols=6 --w=320 --out=out/check/sauva/c1s01-strip.jpg`
- Prévia: `npm run studio` e `http://127.0.0.1:8080/studio.html?project=sauva-operaria`.
- Antes de entregar: `npm test` passa, cada plano tem a folha aberta com Read e olhada de verdade, e a mediana de `ms/quadro` do capítulo fica ≤ 80. Commit só do seu arquivo: `feat: <capítulo> chapter of the pilot`.
