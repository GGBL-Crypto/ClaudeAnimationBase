# Estilos e motores

Leia o `GUIDE.md` e `AGENTS.md` do estilo antes de trabalhar nele. Cada diretório tem configuração e motor próprios. O registro adiciona scripts; o runtime não deve ganhar uma cadeia de condições por estilo.

O contrato comum é `init()`, `render(t)`, `canvas`, `worldToScreen(x,y)` e `info()`. A inicialização deve concluir antes de `ready`; erros devem rejeitar. Render devolve um canvas completo e limpo para qualquer tempo válido. Renderização 3D futura deve aguardar assets e convergência necessária, mantendo resultados determinísticos.

Defina paleta, textura, contornos, personagem e efeitos em `config.js`. Os valores resolvidos são imutáveis durante um vídeo. Não modifique a configuração de outro estilo nem carregue bibliotecas de um motor no outro.

## Quadro F (estilos 2D)

Os estilos `cartoon`, `watercolor`, `stick`, `flat`, `paper`, `ink`, `silhouette` e `debug` definem `window.ExpStyle = { draw(F), parts? }` em `draw.js` e desenham só o que vem no quadro F. A cena define `EST = { frame(scene, t), times, specs }` (função pura de t, sem desenho; exemplo: `fixtures/smoke/walker-2d.js`) e chama `ExpStyle.draw(EST.frame(cena, t))`. Alguns estilos chamam `EST.frame` de novo (`paper` em 2 quadros, `stick` para o rastro). `ExpStyle.parts` serve ao `check-motion --2d --style=<id>`.

Mundo em px, y para baixo; tela: X = (x − cx)·z + 960, Y = (y − cy)·z + 540. Camada de paralaxe f: cx vira lerp(960, cx, f).

F = {scene, shot, t, lt (t no plano), cam: {cx, cy, z}, under?, world, actors, texts}. actors em ordem de desenho: layer (paralaxe) e depth (maior = mais à frente). texts = [{text, x, y (tela), size, k (0..1 entra e sai)}].

actor = {id, kind, role, layer, depth, pose (creaturePose: joints, bones, limbs, spine, head, appendages, face, wings?, carry?), track, ground (x → y do chão sob o ator), hidden?, alpha?, flip? (escala x em torno do meio do corpo), air? (no ar: voando, peixe, voo da passada ou do salto), ...campos por kind}. Desenhe todo ser só por pose.joints/bones (pose.spec pode ser variante da cena em EST.specs).

kind:
- ant: formiga (`crowdActors` em `src/nature/actors.js`); pose.carry = folha {x, y, w, h, angle}. fly: forídea, voa (pose.wings).
- human: pose.body = adult | child | elder | heavy | thin; rosto em pose.face {expression: neutral | curious | surprised | happy, blink 0..1, mouth: null | m | e | a | o} e pose.emote; pose.limbs.armX.hand = open | point | fist. gear? (hat, backpack). actor.front = membros desenhados depois dos outros corpos; actor.seated 0..1; actor.holds = 'item'.
- dog: cão ou raposa (pescoço longo, pose.limits); pose.face.expression neutral | surprised.
- fish: salta (air sempre; hidden = corpo todo sob a água). Desenhe a água por cima da parte abaixo de lake.waterY.
- bird: voa (air, pose.wings.open = 1, phase 0..1) e pousa; no chão saltita (wings.open = 0).
- butterfly: tórax, abdome, cabeça, antenas antennaL/R; sem pernas; air sempre; asas por pose.wings.
- beetle: spine[0] pronoto, spine[1] élitros; pode andar sobre world.log (actor.ground = log.top).

world (além de ground: x → y do chão), por cena:
- H (trilha, a da fumaça): antGround.
- A (superfície e subsolo): nest, tunnels, chambers, fungus, tree, roots, clouds, far, hill, mist, back, front, rock.
- P (praça): bench {x, seatY, w, back, backH, depth}; item {kind: 'flower', x, y, r, held, by?, limb?}; fountain {x, y, r, depth}; trees e lamps [{x, y, h, seed, depth}].
- N (lago): lake {waterY, x0, x1}; nest {x, y, r, depth}; log {x0, x1, h, depth, top}; splashes [{x, y, t0, r}] (vivo 1,2 s); ripples [{x, y, t0, r}] (vivo 3 s); plants [{x, y, kind: tree | flower | grass | reed, h, seed, depth}].

## Cena K (kit de episódio)

`src/episode/kit.js` monta o quadro com `kitFrame({scene, params, actors, cast}, t, L = 12)` (sem desenho; cena de fumaça: `smoke-kit`, com `LOOPS.kit` para a emenda). Os estilos de vídeo ganham `episodeScenes` (lista das 8 cenas) em `config.js` junto com o `drawK` deles; com a marca, o `test:visual` passa a testar o `smoke-kit` no estilo. O `debug` desenha tudo em contorno.

```
F = { scene: 'K', shot: <id da cena>, t, lt, cam: {cx, cy, z}, under: null, world: { ground: x => y, kit }, actors, texts: [] }
kit = {
  mood: 'dawn' | 'day' | 'dusk' | 'night' | 'interior',  // rampa de cores do estilo
  time: 'dawn' | 'day' | 'dusk' | 'night',                // o param time da cena; no interior (mood 'interior') é a hora da janela: use a rampa STYLE.moods[time] nela, sem adivinhar pelo astro
  seed, phase,                                            // phase = (lt mod L) / L
  sky: { stars: [{x, y, r, tw}], celestial: {kind: 'sun'|'moon', x, y, r, glow} | null, clouds: [{x, y, w, h, seed}], meteor?: {x0, y0, x1, y1, k} | null },
  layers: [ // de trás para a frente; f = paralaxe (0 longe .. 1 chão)
    {kind: 'ridge', f, prof: x => y}, {kind: 'dunes', f, prof},
    {kind: 'treeline', f, trees: [{x, y, h, kind: 'pine'|'broad'|'palm', seed}]},
    {kind: 'buildings', f, items: [{x, y, w, h, roof: 'flat'|'gable'|'dome'|'temple'|'tower', windows: [{x, y, w, h, lit}]}]},
    {kind: 'sea', f, y, waves: [{x, y, len, k}]}, {kind: 'ground', f, prof, surface: 'grass'|'sand'|'stone'|'snow'},
    {kind: 'props', f, items: [{kind: 'ship'|'camel'|'column'|'fire'|'rock', x, y, s, k, seed}]} ],
  interior: { wall: {y0, y1}, window: {x, y, w, h}, floorY, props: [{kind: 'table'|'candle'|'book'|'scroll'|'chair'|'shelf', x, y, s, w?, dir?, flame?: {h, flick}}] } | null,
  map: { paper: {x, y, w, h}, coasts: [[[x, y], ...]], route: {pts: [[x, y], ...], k} | null, marks: [{x, y}] } | null,
  weather: { kind: 'clear'|'rain'|'snow'|'fog', drops: [{x, y, k}], fog },
  lights: [{x, y, r, k, f}]  // janelas, vela, fogueira, vaga-lumes, farol; k = intensidade 0..1; f = camada do que ilumina
}
```

- Mundo em px de 1920×1080, y para baixo, câmera como acima. O céu não tem paralaxe (f = 0); as camadas usam a câmera do seu f. `wide`: cx = 960 + balanço de até 8 px, cy = 540, z = 1 (o ator em `at` fica em x = at · 1920 na tela). `mid`: cy = 610, z = 1,35.
- Prédio: x = meio da base, y = base, h até o beiral (o telhado vai acima). Janela: canto de cima à esquerda; `lit` 0..1 (0 = apagada; tremula). Prop de camada e de interior: x = meio, y = base, s = altura (cadeira: altura do assento; mesa: do tampo; livro e rolo: largura), `k` = 0..1 do movimento próprio, contínuo na emenda (balanço do barco, cabeça do camelo, tremor do fogo). A cadeira tem `dir` (para onde olha quem senta; o encosto fica atrás). `fire` e `candle` acompanham uma luz em `lights`.
- Meteoro: desenhe só com 0 < k < 1, a cabeça em lerp((x0, y0), (x1, y1), k). Rota do mapa: desenhe a fração k do comprimento. No interior, céu e clima seguem a janela: câmera de f = 1 (não f = 0) e recorte pelo retângulo `interior.window`. O mapa não tem céu, clima nem atores.
- Nuvens balançam no lugar: x = x0 + até 40 px · sen(2πφ + fase da nuvem); não dão a volta no quadro.
- `fog` 0..1: névoa (clima `fog`) ou neblina baixa (extra `mist`). Gotas e flocos: a posição já se move; a chuva cai na vertical (o estilo escolhe o traço).
- Tudo é periódico em L: F(t) = F(t + L). Não acrescente movimento que não feche no loop (sem ruído de t no desenho; use `phase` com frequência inteira).
- Atores: `kind: 'human'` pelo quadro F de sempre, mais `colors: {skin, hair, shirt, pants} | null` (as cores do elenco, no lugar da roupa padrão do estilo), `gear` (hat, backpack, hood, helmet), `seated` 0..1 e `holds: 'book'` (entre as mãos, `joints.handL/handR`). Quem senta ganha assento no kit (cadeira no interior, pedra `rock` fora). Adulto de pé: 180 px; criança 160, idoso 174, pesado 178, magro 186.
