# Base de estilos de animação

Motor e estilos para vídeos animados em código: cada quadro é função pura do tempo, desenhado por um estilo à escolha, com prévia, revisão por quadros e MP4 verificado. Não há filmes no repositório; cada estilo tem só uma cena de fumaça de 2 s (`fixtures/smoke/`) para testes. Próximo passo: um webapp interativo sobre esta base.

| Estilo | Técnica | Cena de fumaça |
|---|---|---|
| `cartoon` | Vetor Canvas2D, kit e peças de recorte ([guia](src/styles/cartoon/GUIDE.md)) | `smoke-2d`, `smoke-visit` |
| `watercolor` | Aquarela de livro ilustrado: fundos em p5.brush, seres em Canvas2D ([guia](src/styles/watercolor/GUIDE.md)) | `smoke-2d` |
| `watercolor-classic` | Motor original de aquarela (p5.brush, Clawd, folhas) | `smoke-visit` |
| `stick` · `flat` · `paper` · `ink` · `silhouette` | Palito, flat vetorial, recorte de papel, nanquim, teatro de sombras (`STYLE.md` de cada pasta) | `smoke-2d` |
| `debug` | Arame: chão, câmera e ossos, sem estilo | `smoke-2d` |
| `pixel` | Sprites em 320×180, paleta limitada ([guia](src/styles/pixel/GUIDE.md)) | `smoke-visit` |
| `lowpoly-3d` + kit `toon3d` | Three.js 0.186.1, WebGL2 ([guia](src/styles/lowpoly-3d/GUIDE.md)) | `smoke-3d` |

Movimento sem desenho em `src/motion.js`, `src/timeline.js` e `src/nature/` (caminhos, marcha com `footAt`, esqueleto, seres, multidões, atores). Os estilos 2D desenham o quadro F (`ExpStyle.draw`, contrato em [src/styles/AGENTS.md](src/styles/AGENTS.md)). Voz e mixagem: [docs/VOICE.md](docs/VOICE.md).

## Começar

Requisitos: Node.js, Chrome/Chromium, FFmpeg e FFprobe no PATH.

```sh
npm install
npm test
npm run studio   # http://127.0.0.1:8080/studio.html?project=smoke-2d&style=paper
```

## Render e revisão

```sh
node render.mjs --project=smoke-2d --style=ink --sheet=0,1,1.9 --cols=3 --w=640 --out=out/check/ink.jpg
node render.mjs --project=smoke-2d --style=cartoon --strip=0.5:1.3 --cols=6 --w=320 --out=out/check/strip.jpg
node render.mjs --project=smoke-visit --style=pixel --frames --workers=2
node render.mjs --project=smoke-visit --style=pixel --encode --out=out/smoke/pixel.mp4
node render.mjs --project=smoke-3d --clip --out=out/smoke/3d.mp4
node render.mjs --project=smoke-visit --style=watercolor-classic --loop=emotions --sheet=1 --cols=1 --w=1920 --out=out/emotions.jpg
node scripts/check-motion.mjs --project=smoke-2d --2d --style=paper
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
```

- [Arquitetura](ARCHITECTURE.md)
- [Validação e evidências](docs/VALIDATION.md)
- [Adicionar estilos](docs/ADDING_STYLES.md)
- [Instruções para agentes](AGENTS.md)
- [Guia original de aquarela preservado](docs/WATERCOLOR_ORIGINAL.md)

Base original: Claude Animation Base de John Heibel, licença MIT mantida em [LICENSE](LICENSE). [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) foi consultado apenas como referência técnica e artística.
