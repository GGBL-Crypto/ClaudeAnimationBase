# Cartoon vetorial

Backend: Canvas2D. A arte é construída por formas vetoriais e rasterizada no canvas final a 1920×1080. A exportação atual é PNG/JPEG/MP4; não há exportação SVG.

Configuração independente em `config.js`: `palette` (céu, chão, personagem, sombras, asas e olhos), `texture.speckles` (pontilhado opcional do cenário), `outline.weight` (pixels de contorno), `character` (unidade, largura, altura e raio dos cantos), `effects.shadow` e `effects.transition`.

Use silhuetas limpas, cores planas, curvas deliberadas, contornos de espessura consistente e sombras em blocos. Não acrescente pigmento, fervura ou pixelização. O personagem do teste tem quatro pernas, duas pequenas hastes de braços e olhos bem espaçados. Preserve esse modelo entre planos.

Movimento é calculado no tempo contínuo. Antecipe mudanças de expressão com fechamento dos olhos; aceno e asas têm frequências diferentes. Contatos usam a mesma transformação de squash do personagem. Desenhe planos completos e restaure estado do contexto após cada transformação.

`animationEngine.context` expõe o contexto nativo para novas cenas. `VisitArt` é apenas a porta artística da história de demonstração: acrescente os objetos que uma nova história realmente precisa. Não tente traduzir chamadas de p5.brush para cartoon implicitamente.

Validação: ausência de bibliotecas p5 na página, curvas sem serrilhado indevido, olhos legíveis, contornos uniformes, determinismo e dimensões estáveis.

## Kit

`kit.js` (carregado depois de `engine.js`) expõe `window.Kit` com primitivas gerais para cenas de natureza e criaturas: `cam`/`camEnd` (câmera com save/restore), `poly`, `ellipse`, `line` (opção `smooth`), `gradient`, `text` (`k` 0–1 com `backOut`), `wipe`, `iris`, `flash`, `vignette`. Todas são funções puras dos argumentos e usam `STYLE.palette` e `STYLE.outline.weight`. `VisitArt` não usa o Kit.

## Direção de arte

- Vetor plano em dois tons com luz lateral quente vinda do alto à esquerda: cada forma de `NatureArt` tem borda iluminada, cor base e faixa de sombra (`cut` para peças, `parts` para rochas e nuvens), e cada ser projeta sombra de contato.
- Contorno externo mais grosso que as linhas internas; o traço é o tom escuro do próprio preenchimento, nunca preto.
- Profundidade em camadas com paralaxe (céu, morros distantes claros e dessaturados, linha de árvores, ação, tufos escuros no primeiro plano emoldurando).
- `NatureArt.sky(chuva)` dá o brilho do sol; `NatureArt.grade(chuva)` esfria e escurece a chuva e aplica o grão de papel, gerado uma vez e reutilizado.
- Ser principal com pelo menos 1/3 da altura do quadro nos planos principais.

## Peças recortadas (`parts.js`)

Os seres são bonecos de recorte: cada peça de `CARTOON_PARTS` é um caminho SVG (`Path2D`, criado uma vez) preso a um osso da pose por `NatureArt.decor[spec].build`. Apelo antes de realismo: livro ilustrado, formas grandes, poucas peças, cabeça humana com cerca de 1/4 da altura, olhos grandes e um detalhe marcante por personagem. Personagens recorrentes têm nome e paleta fixa (`look`): Lia (humana, lenço vermelho e rabo de cavalo) e Bento (cão, coleira vermelha com medalha).

Para criar ou alterar uma peça:

1. Desenhe em unidades de BL/100 (humano: altura/100), com y para baixo e o ser virado para a direita (+x é a frente). Use só `M`, `L`, `C`, `Q` e `Z` absolutos, em sentido horário (`tests/cartoon-parts.test.mjs` confere).
2. `pivot` é a junta de onde a peça pende; `angle` é a direção do osso em repouso (0 à frente, π/2 para baixo); `len` é o comprimento do osso. A peça estica ao longo do osso até a junta seguinte, então desenhe as pontas arredondadas passando do pivô e da junta: as peças vizinhas se sobrepõem e a costura some.
3. `layer` fixa a ordem; na vista lateral os membros do lado de longe descem 10 camadas. Peças do mesmo grupo (mesma chamada de `cut`) formam uma silhueta só: contornos primeiro, depois os tons. Peças que precisam de contorno próprio por cima de outras (orelha, cabelo, lenço, coleira) ficam em grupo separado.
4. `fill` é a chave da cor no `look`; `spots` são manchas planas dentro da peça (sela do cão, barriga, faixas); `lines` são traços internos finos; `clip: true` para peças côncavas (o sombreamento é recortado pela própria peça); `band` estreita a faixa de sombra (rostos).
5. Rosto humano: `face` tem os olhos (`dot`, `wide`, `arc`, `x`) e, por expressão, olho, pálpebra (`lid`), inclinação, sobrancelha e boca, em unidades da cabeça.

O sombreamento sem clip (peça encolhida e deslocada para longe da luz e para ela) custa ~1/6 de um clip nesta GPU; use `clip` só onde a peça é côncava. Fundos usam o mesmo mecanismo: copas (`round`, `tall`, `pine`), troncos, arbustos nas bordas dos morros e folhas dos tufos, escolhidos e espelhados por semente.
