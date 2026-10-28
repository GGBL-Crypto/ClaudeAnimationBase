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
