# Estúdio modular de animação

Crie histórias com Codex, escolha um estilo e produza animações com storyboard, prévia, revisão por quadros e MP4 verificado. O motor original de aquarela e sua demo continuam disponíveis.

| Estilo | Técnica | Guia |
|---|---|---|
| `watercolor` | Aquarela e tinta, p5.brush original | [Aquarela](src/styles/watercolor/GUIDE.md) |
| `cartoon` | Formas vetoriais, contornos limpos, Canvas2D | [Cartoon](src/styles/cartoon/GUIDE.md) |
| `pixel` | Sprites em 320×180, paleta limitada, ampliação 6× | [Pixel art](src/styles/pixel/GUIDE.md) |

## Começar

Requisitos: Node.js, Chrome/Chromium, FFmpeg e FFprobe no PATH.

```sh
npm install
npm test
node render.mjs --project=visit --style=cartoon --clip --out=out/visit/cartoon/video.mp4
```

Abra [studio.html](studio.html) no navegador: selecione projeto e estilo, reproduza, navegue pelo tempo ou pelos planos e salve PNGs. A seleção recarrega o projeto inteiro com a configuração congelada. Na aquarela, a prévia pode ser mais lenta que a reprodução final.

A entrada em linguagem natural é feita com o Codex. Exemplo de pedido:

> Leia AGENTS.md e ANIMATION_GUIDE.md. Crie um vídeo de 12 segundos em pixel art sobre um robô que protege uma muda da chuva. Faça o storyboard, implemente as cenas, revise e renderize.

O estúdio pré-visualiza histórias implementadas em código; não contém um serviço de geração por IA embutido. Para novos filmes, registre um projeto em `src/config.js` e cenas em `src/scenes/`. O [guia universal](ANIMATION_GUIDE.md) descreve o fluxo completo.

## Projetos incluídos

- **`demo`**: “A estrela caída”, 11 s, somente aquarela. É o padrão para preservar o uso original.
- **`visit`**: “Uma visita”, 6 s, nos três estilos. Uma borboleta chega, pousa na cabeça de Clawd e parte; ele se despede. [Storyboard](STORYBOARD.md).

Vídeos de teste locais:

- [Aquarela](out/visit/watercolor/video.mp4) · [quadros do MP4](out/visit/watercolor/video.mp4.review/decoded-sheet.png)
- [Cartoon](out/visit/cartoon/video.mp4) · [quadros do MP4](out/visit/cartoon/video.mp4.review/decoded-sheet.png)
- [Pixel art](out/visit/pixel/video.mp4) · [quadros do MP4](out/visit/pixel/video.mp4.review/decoded-sheet.png)

`out/` é ignorado pelo Git. Os arquivos acima são artefatos locais, regeneráveis pelos comandos abaixo; não estarão em um clone novo.

Entregas regeneradas após a auditoria de rastreabilidade e recortes: [aquarela](out/visit/watercolor/revisions/8085d0383acb/video.mp4), [cartoon](out/visit/cartoon/revisions/8085d0383acb/video.mp4), [pixel art](out/visit/pixel/revisions/8085d0383acb/video.mp4). Os vídeos anteriores foram preservados. Veja [a auditoria](docs/AUDIT_STAGE1.md) para hashes e evidências.

## Render e revisão

```sh
# Demo original
npm run video
# Um quadro PNG / storyboard
node render.mjs --project=visit --style=pixel --stills=2.5 --out=out/stills
node render.mjs --project=visit --style=cartoon --storyboard --out=out/storyboard.jpg
# Movimento e detalhes
node render.mjs --project=visit --style=watercolor --strip=1.9:2.7 --cols=6 --w=320 --out=out/landing.jpg
node render.mjs --project=visit --style=cartoon --sheet=2.5,3.4 --crop=550,440,530,430 --out=out/contact.jpg
# Um vídeo por estilo
node render.mjs --project=visit --style=watercolor --clip --out=out/visit/watercolor/video.mp4
node render.mjs --project=visit --style=cartoon --clip --out=out/visit/cartoon/video.mp4
node render.mjs --project=visit --style=pixel --clip --out=out/visit/pixel/video.mp4
# Sequência retomável + encode; diretório padrão out/<projeto>/<estilo>/frames
node render.mjs --project=visit --style=pixel --frames --workers=2
node render.mjs --project=visit --style=pixel --encode --out=out/visit/pixel/video.mp4
# PNG sem perdas, intervalo e diretório próprios
node render.mjs --project=visit --style=pixel --png --range=1:2 --out=out/pixel-png
node render.mjs --project=visit --style=pixel --encode --frames-dir=out/pixel-png --out=out/pixel-trecho.mp4
# Folhas originais, câmera e áudio continuam disponíveis
node render.mjs --loop=emotions --sheet=1 --cols=1 --w=1920 --out=out/emotions.jpg
node render.mjs --sheet=5.7 --crop-at=950,760,500,400 --out=out/tracked.jpg
node render.mjs --project=visit --style=cartoon --clip --audio=assets/song.mp3 --out=out/music.mp4
```

Para Chrome fora do caminho padrão: `--chrome=<caminho>` ou `CHROME_PATH`. Para WebGL sem GPU: `--soft-gl`; para Linux/NVIDIA: `--gpu-angle=gl-egl` ou `vulkan`. `gpu_probe.mjs` continua disponível. Não há downloads de fontes ou imagens durante o render. Lettering original usa fontes locais como fallback.

O cache recusa alterações no código, configuração, fps, intervalo, projeto, estilo ou loop. Use um novo `--frames-dir` após mudanças. O encoder não precisa de Chrome quando a sequência já existe. Não apaga quadros antigos para resolver incompatibilidades.

`--crop-at` aceita quatro valores: x, y, largura e altura. Podem ser números ou expressões aritméticas com `W`, `H`, `+ - * /` e parênteses, por exemplo `"--crop-at=W/2-10,(H+440)/2,500,400"`. Não executa JavaScript, funções ou propriedades. A largura e a altura precisam ser positivas; todos os valores precisam ser finitos.

Todo MP4 é gravado primeiro em arquivo provisório. O CLI só promove a saída após verificar H.264, resolução, fps, quantidade, duração e decodificação completa. A pasta `<vídeo>.review` contém quadros extraídos do próprio MP4 e um relatório que exige revisão visual separada. `npm run verify -- caminho/video.mp4` repete a verificação técnica e reinicia o estado visual como pendente.

O relatório inclui hashes por arquivo, SHA-256 do vídeo e ambiente. A revisão do código é conferida novamente antes de promover o MP4; não edite fontes durante o render. A verificação avulsa preserva proveniência já registrada apenas quando os bytes do vídeo coincidem, sem atribuir a revisão atual a um vídeo antigo.

## Testes e extensão

```sh
npm test
npm run test:visual
npm run review
node scripts/check-render.mjs
```

- [Arquitetura e etapas](ARCHITECTURE.md)
- [Validação e evidências](docs/VALIDATION.md)
- [Auditoria anterior ao 3D](docs/AUDIT_STAGE1.md)
- [Plano Three.js low poly — aguardando aprovação](docs/LOWPOLY_3D_PLAN.md)
- [Adicionar estilos; preparar anime, motion graphics e 3D](docs/ADDING_STYLES.md)
- [Instruções permanentes para Codex](AGENTS.md)
- [Guia original de aquarela preservado](docs/WATERCOLOR_ORIGINAL.md)

A API original de Clawd, emoções, vistas, pintura e câmera permanece na aquarela. Os outros motores têm APIs de desenho próprias; a coreografia de “Uma visita” exemplifica uma história portável. Não há conversão automática de qualquer cena entre meios. Anime, motion graphics e 3D são extensões previstas pelo contrato, ainda não implementadas.

Base original: Claude Animation Base de John Heibel, licença MIT mantida em [LICENSE](LICENSE). [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) foi consultado apenas como referência técnica e artística.
