# Cartoon vetorial

Backend: Canvas2D. A arte é construída por formas vetoriais e rasterizada no canvas final a 1920×1080. A exportação atual é PNG/JPEG/MP4; não há exportação SVG.

Configuração independente em `config.js`: `palette` (céu, chão, personagem, sombras, asas e olhos), `texture.speckles` (pontilhado opcional do cenário), `outline.weight` (pixels de contorno), `character` (unidade, largura, altura e raio dos cantos), `effects.shadow` e `effects.transition`.

Use silhuetas limpas, cores planas, curvas deliberadas, contornos pretos de espessura consistente e nenhuma sombra além da de contato. Não acrescente pigmento, fervura ou pixelização. O personagem do teste tem quatro pernas, duas pequenas hastes de braços e olhos bem espaçados. Preserve esse modelo entre planos.

Animação em 2s, como a TV dos anos 2000: o motor desenha o quadro F no tempo `twosTime(t)` (B = floor(F / 2), TT = B · 2 / fps), então os quadros 2k e 2k + 1 são iguais; `onTwos: false` no projeto desliga. A aquarela não muda. Tudo o que tem massa anda em molas de `motion.js` (`springMove`, `springTrack`, `SPRING.smooth/snappy/bouncy`): câmera que assenta, take da troca de expressão, entrada dos emotes.

Movimento é calculado no tempo contínuo. Antecipe mudanças de expressão com fechamento dos olhos; aceno e asas têm frequências diferentes. Contatos usam a mesma transformação de squash do personagem. Desenhe planos completos e restaure estado do contexto após cada transformação.

`animationEngine.context` expõe o contexto nativo para novas cenas. `VisitArt` é apenas a porta artística da história de demonstração: acrescente os objetos que uma nova história realmente precisa. Não tente traduzir chamadas de p5.brush para cartoon implicitamente.

Validação: ausência de bibliotecas p5 na página, curvas sem serrilhado indevido, olhos legíveis, contornos uniformes, determinismo e dimensões estáveis.

## Kit

`kit.js` (carregado depois de `engine.js`) expõe `window.Kit` com primitivas gerais para cenas de natureza e criaturas: `cam`/`camEnd` (câmera com save/restore), `poly`, `ellipse`, `line` (opção `smooth`), `gradient`, `text` (`k` 0–1 com `backOut`), `wipe`, `iris`, `flash`, `vignette`. Todas são funções puras dos argumentos e usam `STYLE.palette` e `STYLE.outline.weight`. `VisitArt` não usa o Kit.

## Direção de arte

- Idioma de desenho de TV dos anos 2000 (referências só de estilo; personagens sempre originais): cor chapada, sem gradiente, sem luz e sombra e sem grão de papel. Formas geométricas e exageradas; olhos grandes, brancos, com pupila pequena.
- Contorno preto uniforme (`palette.line`): `outline.weight` px (6 em 1080p) num ser principal, mais fino em seres pequenos (`size * .03`); linhas internas com metade disso. Cada grupo de peças (`cut`) é uma silhueta só; um grupo por cima de outro mostra o contorno entre eles.
- No máximo uma sombra dura: a sombra de contato sob cada ser.
- Fundos em cores planas e poucas camadas com paralaxe: céu liso, morros distantes claros com contorno fino, árvores com o mesmo contorno (esmaecido pela névoa nas camadas distantes), chão com borda escura e tufos escuros no primeiro plano.
- `NatureArt.sky(chuva)` pinta o céu liso; `NatureArt.grade(chuva)` só esfria e escurece a chuva.
- Ser principal com pelo menos 1/3 da altura do quadro nos planos principais.

## Peças recortadas (`parts.js`)

Os seres são bonecos de recorte: cada peça de `CARTOON_PARTS` é um caminho SVG (`Path2D`, criado uma vez) preso a um osso da pose por `NatureArt.decor[spec].build`, desenhada chapada com contorno preto. Linguagem de forma, não anatomia: 2 ou 3 formas geométricas grandes por ser, cabeça humana de 1/3 a 1/2 da altura (Lia: 0,47 até o queixo, com o chapéu; a cabeça cobre os ombros e fica acima dos braços, só as mãos passam por cima dela), membros em macarrão (tubo de largura quase constante), mãos-luva de 4 dedos, pés grandes, olhos enormes, brancos e encostados (cerca de 1/3 da altura da cabeça), com pupila pequena e um detalhe marcante por personagem. Personagens recorrentes têm nome e paleta fixa (`look`, cores em `config.js`):

- Lia, exploradora: cabeça redonda, cabelo castanho curto com franja recortada, chapéu de explorador verde-oliva (`olive`), camisa mostarda (`mustard`), lenço vermelho, short verde (`shorts`), botas marrons grandes (`boot`).
- Bento, vira-lata: corpo em feijão creme (`cream`), mancha marrom num olho e orelhas longas caídas (`patch`), focinho comprido com nariz preto grande, pernas curtas e finas (em `specs.js`) saindo de baixo do corpo com patas redondas; pernas do lado de longe em creme mais escuro e quente, coleira vermelha com plaquinha dourada (`gold`).
- O vermelho `hero` é a cor-herói: só no lenço da Lia e na coleira do Bento, nunca decorativo.

Na vista lateral os dois mostram os dois olhos: o de longe menor, junto ao nariz (Lia) ou espiando por cima do focinho (Bento).

Para criar ou alterar uma peça:

1. Desenhe em unidades de BL/100 (humano: altura/100), com y para baixo e o ser virado para a direita (+x é a frente). Use só `M`, `L`, `C`, `Q` e `Z` absolutos, em sentido horário (`tests/cartoon-parts.test.mjs` confere).
2. `pivot` é a junta de onde a peça pende; `angle` é a direção do osso em repouso (0 à frente, π/2 para baixo); `len` é o comprimento do osso. A peça estica ao longo do osso até a junta seguinte, então desenhe as pontas arredondadas passando do pivô e da junta: as peças vizinhas se sobrepõem e a costura some.
3. `layer` fixa a ordem; na vista lateral os membros do lado de longe descem 10 camadas. Peças do mesmo grupo (mesma chamada de `cut`) formam uma silhueta só: contornos primeiro, depois os tons. Peças que precisam de contorno próprio por cima de outras (orelha, cabelo, lenço, coleira) ficam em grupo separado.
4. `fill` é a chave da cor no `look`; `spots` são manchas planas dentro da peça (sela do cão, barriga, faixas); `lines` são traços internos pretos.
5. Rosto humano: `face` tem os olhos (`dot`, `wide`, `arc`, `x`) e, por expressão, olho, pálpebra (`lid`), inclinação, sobrancelha e boca, em unidades da cabeça. `eye.far` = [dx, dy, escala] do olho de longe em relação ao de perto; cada olho leva a sua sobrancelha. `decor.human.emoteAt` põe o emote ao lado da copa do chapéu.

Compare com a referência de estilo em números (proporção da cabeça, espessura do contorno, saturação) com `scripts/compare-ref.mjs` (uso no cabeçalho do script); a folha `modelos` tem Lia e Bento em pé num fundo liso para isso.

Evite `clip` no desenho por quadro: custa ~6× um preenchimento nesta GPU. Fundos usam o mesmo mecanismo: copas (`round`, `tall`, `pine`), troncos, arbustos nas bordas dos morros e folhas dos tufos, escolhidos e espelhados por semente.

## Personagens importados (`assets/characters/<nome>/`)

Peças vindas de uma folha de imagem substituem as desenhadas pelo nome; o que faltar continua vindo de `parts.js`.

1. Folha PNG de fundo branco, uma peça separada da outra, contorno preto fechado. Importe com o venv fora do npm:
   `out/tmp/venv/Scripts/python scripts/import-parts.py <folha.png> <nome> --spec=human --bl=<altura do ser na folha, px>`
   (`--self-test` confere o importador numa folha sintética em `out/tmp/`). Saem `partNN.png` (recorte com alfa; o branco cercado pela peça fica nela), `partNN.svg` (se o `vtracer` estiver instalado) e `rig.json`.
2. Em `rig.json`, renomeie cada `partNN` para o nome da peça desenhada que ela substitui (`thigh`, `head`...) e ajuste `pivot` (px na imagem da peça), `len` (px até a junta seguinte) e `angle`; `layer: null` herda a camada da peça desenhada; `view: "top"` para a vista superior. Variantes de rosto: `head@happy`, `head@sad`, ..., `head@blink`. Uma cabeça importada traz o próprio rosto: os olhos e a boca desenhados não são feitos.
3. Na cena, ao carregar: `NatureArt.load('<nome>')` (o motor espera o carregamento antes do primeiro quadro); depois `NatureArt.creature(pose, { rig: '<nome>' })`. Com SVG a peça é desenhada por `Path2D` (nítida em qualquer escala); sem SVG, o PNG por `drawImage`. Membros do lado de longe escurecem só com SVG.
