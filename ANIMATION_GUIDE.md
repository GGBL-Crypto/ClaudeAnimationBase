# Guia universal de animação

Este guia vale para todos os estilos. A referência original completa está em [docs/WATERCOLOR_ORIGINAL.md](docs/WATERCOLOR_ORIGINAL.md); suas regras artísticas pertencem à aquarela. As instruções do usuário têm prioridade.

## Escolha do meio

| Estilo disponível | Guia | Motor |
|---|---|---|
| Aquarela | [guia artístico](src/styles/watercolor/GUIDE.md) | p5.brush e motor original |
| Cartoon vetorial | [guia artístico](src/styles/cartoon/GUIDE.md) | paths Canvas2D |
| Pixel art | [guia artístico](src/styles/pixel/GUIDE.md) | sprites, grade e paleta limitada |
| 3D low poly | [guia artístico](src/styles/lowpoly-3d/GUIDE.md) | Three.js/WebGL2, geometria procedural |

Não há uma regra universal proibindo 3D, texto, preto, branco ou formas geométricas. Essas decisões dependem do meio e do pedido. Texto deve ajudar a história; não substitua uma ação por uma legenda sem necessidade.

## Princípios universais

- **Leituras e timing:** liste o que o espectador precisa perceber, em ordem. Dê tempo para localizar, entender e registrar. Ação rápida precisa de antecipação e pausa para leitura.
- **Causa antes da reação:** um evento muda o plano; a resposta do personagem vem depois e tem tempo próprio. Resolva o que foi apresentado.
- **Encenação:** uma ação principal por vez, silhueta clara, tamanho suficiente e separação do fundo. Poses-chave precisam funcionar como imagens paradas.
- **Antecipação e peso:** preparação na direção contrária antes do impulso; inércia e amortecimento coerentes com o objeto.
- **Squash e stretch:** deformação deve preservar a leitura do volume, respeitando as limitações do meio e o modelo do personagem.
- **Curvas e arcos:** aceleração/desaceleração para movimentos orgânicos; trajetórias curvas para mãos, saltos, voos e arremessos.
- **Sobreposição:** olhos lideram; corpo acompanha; braços/acessórios terminam depois. Evite movimentos espelhados sem intenção.
- **Exagero e pensamento:** poses claras mostram perceber, pensar e agir. Movimento secundário apoia a ação central sem disputar atenção.
- **Continuidade:** personagens, paleta, escala, direção, cenário e objetos mantêm identidade entre planos. Entrada, cortes e saída precisam de intenção; match cut e corte por continuidade também são transições válidas.
- **Vida e pausas:** sustentações podem ser deliberadas. Movimento secundário e ritmo ajudam, mas não imponha tremor de tinta ou câmera móvel a todo meio, especialmente pixel art.

## Da descrição à produção

1. Leia a história do usuário. Registre logline, mundo, motivo e arco emocional em `STORYBOARD.md` ou documento próprio do filme. Escolha um estilo para o vídeo inteiro.
2. Registre o projeto em `src/config.js`: ID, título, história, estilo, compatibilidades, duração, fps, bpm/offset, scripts, `styleOptions`, `reviewTimes` e storyboard. Cada plano tem ID, start/end, evento, transição e leituras com start/end/text. A validação recusa lacunas de planos, leituras sobrepostas e estilo por plano.
3. Defina paleta, modelo e regras visuais pelo guia do estilo. Overrides pertencem ao projeto; não altere os padrões globais para um filme específico.
4. Crie cenas em `src/scenes/`, envoltas em IIFE. Registre `shots([[0, primeiroPlano], [3, segundoPlano]])`. A função de plano recebe `(t, lt, dur)`. Cada quadro deve estar completo; não dependa do quadro anterior.
5. Abra `studio.html?project=<id>&style=<estilo>`. Navegue pelos planos e revise o filme. Reprodução da aquarela pode ficar abaixo do tempo real; o MP4 é a referência de velocidade final.
6. Renderize e inspecione as evidências abaixo; corrija problemas. Só então produza a entrega completa.

## Matemática compartilhada

`src/motion.js` preserva as funções originais: `clamp`, `lerp`, `seg`, `kf`, `ease/easeIn/easeOut/backOut/elasticOut`, `hash`, `wob`, `spring`, `ring`, `jump`, `take`, `stroll`, `arcPt`, `onTwos`, `pulse`, `beatN` e `mixCol`, mais as molas em forma fechada (`springMove`, `springTrack`) e `anticipate` (contra-pose, passa do alvo e assenta). O desenho é responsabilidade do motor. As opções de pose retornadas pelos helpers são dados; outros personagens podem interpretá-las por adaptadores.

Os motores 2D usam coordenadas 1920×1080, origem no canto superior esquerdo e Y para baixo. O motor 3D usa unidades de mundo e Y para cima; não reinterpretar helpers 2D como movimentos 3D. Para renderizações fora de ordem, compute movimentos a partir de `t`. Sem `Math.random()`, relógio de parede ou integração de física acumulada. No motor aquarela, sementes estáveis por elemento impedem reboil acidental.

## Revisão por quadros

```sh
node render.mjs --project=visit --style=cartoon --storyboard --out=out/check/storyboard.jpg
node render.mjs --project=visit --style=cartoon --strip=1.9:2.7 --cols=6 --w=320 --out=out/check/landing.jpg
node render.mjs --project=visit --style=cartoon --sheet=2.5,3.4 --crop=550,440,530,430 --out=out/check/contact.jpg
node render.mjs --project=demo --sheet=5.7 --crop-at=950,760,500,400 --out=out/check/tracked.jpg
node render.mjs --project=visit --style=pixel --stills=2.5 --out=out/check/stills
npm run review
```

Abra as imagens; um arquivo gerado não equivale a uma imagem revisada. Confira por plano: evento, tamanho, olhos, expressão e contraste. Nas tiras: antecipação, pausas, arcos, pouso e partida, corte e íris. Nos recortes: pés, mãos, acessórios, contatos e deformações. No pixel art, julgue fontes sem perdas: JPEG e MP4 introduzem cores de compressão.

Recortes `--crop-at` aceitam números ou aritmética segura com `W`, `H`, `+ - * /` e parênteses. Por exemplo, `"--crop-at=W/2-10,(H+440)/2,500,400"`. Não aceitam execução de JavaScript, chamadas de função ou propriedades; a menção a expressões livres no guia original arquivado descreve apenas o comportamento histórico.

No 3D, use também cinco valores `x,y,z,largura,altura`; o motor projeta o ponto pela câmera do quadro. Largura/altura são pixels, mesmo quando XYZ são unidades de mundo. O estúdio 3D usa HTTP local por `npm run studio`; a captura CLI cuida desse transporte. Para detalhes de projeção, prévia e descarte, consulte o guia do estilo.

Documente defeito → causa → correção → evidência. Os testes automáticos verificam determinismo, workers, grade, paleta, configuração, alinhamento de cortes e controles da prévia; não entendem a história nem substituem inspeção visual.

`node scripts/check-render.mjs` verifica a CLI completa: retomada, caches incompatíveis, sequências incompletas, encode de JPEG/PNG, recorte pela câmera, stills e mux de áudio.

## Render final

```sh
node render.mjs --project=visit --style=watercolor --clip --out=out/visit/watercolor/video.mp4
node render.mjs --project=visit --style=pixel --frames --workers=2
node render.mjs --project=visit --style=pixel --encode --out=out/visit/pixel/video.mp4
node scripts/verify-video.mjs out/visit/pixel/video.mp4
```

`--frames` gera JPEGs; `--png` gera sequência sem perdas. Ambos usam manifesto e podem ser codificados com `--encode --frames-dir=<pasta>`. Cada sequência começa em f00000, inclusive para um intervalo que começa depois de zero. O manifesto preserva tempo inicial, fps e áudio. Um cache incompatível é recusado; use outro diretório. Não junte quadros de estilos ou revisões diferentes.

Vídeos passam por verificação FFprobe (resolução, codec, fps, duração e contagem) e decodificação completa FFmpeg. Quadros extraídos e relatório ficam em `<vídeo>.review/`. O relatório começa com `visualReview: pending`. Abra a folha extraída do MP4 e os detalhes, registre sua revisão real e somente então declare o vídeo concluído. O teste inicial é silencioso; áudio opcional vem de `PROJECT.audio` ou `--audio`.
