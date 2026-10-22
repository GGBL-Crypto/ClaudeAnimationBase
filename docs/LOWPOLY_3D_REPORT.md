# Motor 3D low poly — relatório técnico e validação

21/10/2026. Etapas 3–5 do [plano aprovado](LOWPOLY_3D_PLAN.md). Commit de referência anterior a qualquer implementação: **`5c91708`**. Projeto experimental: `mars-discovery`, **“Um sinal na poeira”**. [Storyboard](storyboards/mars-discovery.md).

## Entregas

Todos os filmes abaixo são **H.264/yuv420p, 3 segundos, 12 fps, 36 quadros e sem áudio**. Os quatro arquivos passaram por FFprobe e decodificação completa FFmpeg. Foram abertos os quatro `decoded-sheet.png` e os quatro `detail-2.png`, extraídos dos próprios MP4s, após os renders finais. Primeiro foi validado o 720p; só então foram produzidos os dois 1080p.

| Resolução | Backend | Arquivo | Bytes | Processo completo |
|---|---|---|---:|---:|
| 1280×720 | Radeon/ANGLE D3D11 | [MP4](../out/mars-discovery/revisions/3e985d01ffc0/720p/hardware/video.mp4) | 208.810 | **4,425 s** |
| 1280×720 | SwiftShader | [MP4](../out/mars-discovery/revisions/3e985d01ffc0/720p/swiftshader/video.mp4) | 210.374 | **7,027 s** |
| 1920×1080 | Radeon/ANGLE D3D11 | [MP4 final](../out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/video.mp4) | 345.510 | **6,403 s** |
| 1920×1080 | SwiftShader | [MP4 final por software](../out/mars-discovery/revisions/3e985d01ffc0/1080p/swiftshader/video.mp4) | 346.374 | **10,383 s** |

Imagens finais: [começo](../out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/review/begin.png), [meio](../out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/review/middle.png), [fim](../out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/review/end.png), [contato dos pés](../out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/review/feet.jpg), [expressão](../out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/review/face.jpg) e [amostras do MP4](../out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/video.mp4.review/decoded-sheet.png).

A sequência sem perdas contém [36 PNGs e manifesto](../out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/frames/manifest.json), de `f00000.png` a `f00035.png`. O último tempo é `35/12`, não 3,0 s. Artefatos `out/` são locais e não entram no Git; todos os geradores estão no repositório.

## Arquitetura implementada

O novo módulo implementa `init`, `render(t)`, `canvas`, `worldToScreen(x,y,z=0)` e `info`, mais `dispose`. `src/motion.js` e `src/timeline.js` foram reutilizados sem alterações. O motor não conhece o robô ou Marte: oferece Three.js, cena, materiais, grupos, geometria e pose de câmera. `src/scenes/mars-discovery.js` constrói o cenário/elenco uma vez e registra a função de plano que aplica a pose absoluta.

- **Carregamento:** strings continuam scripts clássicos; descritores `type:module` usam import assíncrono e aguardam dependências. O import map aponta para arquivos locais do npm. Three.js só é carregado pelo estilo selecionado.
- **Mundo:** Y para cima, frente local +Z, unidades próprias e radianos. Não houve conversão global de helpers/coordenadas dos estilos 2D. `marsPose(t)` calcula deslocamento, apoios, balanço, inclinação, emissão e aproximação da câmera a partir de `t`.
- **Câmera:** perspectiva por padrão e ortográfica selecionável, configuradas para a sessão inteira. Projeção de recorte usa a câmera do último quadro. Quatro valores de `crop-at` continuam válidos; cinco incluem Z e exigem motor 3D.
- **Arte:** caixas, cilindros de cinco segmentos, icosaedros e solo plano. Materiais Lambert, cores sólidas, facetas e emissão; hemisférica, direcional e point light de curto alcance na pedra. Sombra direcional PCF de 512 px, opcional. Nenhum bitmap de produção.
- **Captura:** canvas público estável. Final em 720p ou 1080p; prévia leve usa metade da dimensão interna e desliga sombras. Em 1080p, isso significa 960×540 ampliado para o canvas 1920×1080. O botão PNG pede um quadro final antes de salvar.
- **Exportação:** mesmo `render.mjs`, PNG, workers, manifestos, FFmpeg e FFprobe. Opções 3D são recusadas nos motores 2D. O padrão de workers 2D continua dois; o 3D começa com um.

Na cena experimental foram observadas 31 chamadas e 508 triângulos no passe visível em perspectiva sem sombras; com sombras, 66 chamadas e 1.096 triângulos somando os passes. A ortográfica inclui mais objetos no enquadramento e foi exercitada separadamente. Essas são estatísticas de um quadro, não um benchmark genérico do motor.

## Servidor e segurança de caminhos

`scripts/studio-server.mjs` usa somente `node:http`, com bind explícito em **127.0.0.1**. A lista de rotas contém `studio.html`, os arquivos `.js` de `src/` e arquivos específicos de p5/p5.brush/Three.js; não existe listagem de diretórios ou exposição geral do workspace/node_modules. Git, ZIPs, documentos, lockfiles e `out/` não são rotas públicas.

O caminho bruto é examinado antes de qualquer normalização. Caminhos com codificação percentual, codificação dupla, separadores codificados, barras invertidas, segmentos `.`/`..`, segmentos vazios, NUL e nomes de streams são recusados. Somente GET/HEAD e o Host da origem local são aceitos. Antes de ler uma rota permitida, `realpath` verifica que o destino continua dentro da raiz. O teste inclui uma rota Three.js permitida cujo diretório é uma junction para fora da raiz: ela recebe 403.

O CLI inicia uma origem por job e a compartilha com os workers; encerra conexões e servidor ao terminar. `npm run studio` inicia a mesma implementação para revisão manual. Motores 2D também foram exercitados sob HTTP, mantendo os mesmos PNGs do acesso por arquivo. Ao abrir o motor ES via arquivo, o erro instrui executar `npm run studio`.

## Ciclo de vida e falhas

Geometrias, materiais e texturas pertencentes ao motor são rastreados. O descarte também percorre a cena para descobrir recursos adicionados depois, mapas e uniforms, libera bitmaps quando aplicável e descarta shadow maps, listas, renderer e contexto WebGL. A segunda chamada não duplica descartes. A troca de projeto e a saída da página acionam esse caminho; falha em `init` também faz limpeza.

O teste de navegador adiciona uma geometria, um material e uma textura, renderiza e observa eventos reais de `dispose`. Os recursos usados na cena são liberados uma vez; materiais rastreados que não chegaram a ser usados também são descartados. O teste confirma que a troca para `visit` descartou o motor 3D.

WebGL2 ausente, shader inválido e perda real de contexto foram induzidos nos testes. Todos produzem erro explícito; não existe substituição por desenho 2D. Um render após descarte é recusado.

Durante regressões, dois Chromes de teste permaneceram vivos após a solicitação de fechamento. O encerramento agora tem limite de cinco segundos: primeiro descarta os motores e pede fechamento normal; se necessário, encerra **somente a árvore do processo filho criado pelo Puppeteer**. Há teste para o limite e o relatório registra `forcedBrowserShutdown`. Nos quatro renders medidos, esse campo foi **false**: todos encerraram normalmente.

Referências oficiais consultadas: [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [gerenciamento de recursos](https://threejs.org/manual/pages/cleanup.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). GLTFLoader permanece uma possibilidade do mesmo pacote, sem ser importado pelo filme procedural.

## Regressões e testes

| Comando / verificação | Evidência |
|---|---|
| `npm test` | **13 testes**: configuração, storyboard, movimento, parser seguro, proveniência, servidor e encerramento limitado. |
| `npm run test:integration` | [Relatório](../out/checks/integration.json): aquarela/cartoon/pixel com PNGs iguais via file/HTTP e à referência auditada, sem carregar Three.js; interoperabilidade clássico/ES e rejeição de falha de módulo. |
| `npm run test:visual` | [Relatório](../out/checks/checks.json): três motores anteriores, determinismo/workers, contato, paleta/grade pixel, snapshots da demo, loops e controles desktop/celular. |
| `npm run test:three` | [Hardware](../out/checks/three-hardware/checks.json): duas câmeras × dois estados de sombra; ordem, workers, projeção, PNG não vazio, prévia/final, descarte, shader/contexto/WebGL2 e estúdio. |
| `npm run test:three -- --soft-gl` | [SwiftShader](../out/checks/three-software/checks.json): mesmos critérios; baselines separados por backend. |
| `node scripts/check-render.mjs` | [CLI anterior](../out/checks/render/3e985d01ffc0/checks.json): retomada, caches/incompletos, JPEG/PNG, recortes, stills, áudio e proveniência após revalidar. |
| `npm run test:render-three` | [CLI 3D](../out/checks/three-cli/3e985d01ffc0/checks.json): dois workers, PNG/encode, retomada, recorte XYZ e isolamento entre GPU/resolução/projeção/sombras. |
| Comparação com `5c91708` | Core/matemática/timeline/Clawd/sheets, cenas antigas e três diretórios de estilos 2D permanecem sem diff. |
| `git diff --check` | Sem erros de whitespace ao concluir. |

A integração e a regressão dos três motores passaram **antes** de criar o motor 3D. Os relatórios de [integração anterior](../out/checks/pre-3d-integration.json) e [regressão anterior](../out/checks/pre-3d-regression.json) foram preservados. Ao concluir, as verificações foram executadas novamente na revisão final. Nenhum vídeo anterior foi sobrescrito.

## Inspeção e correções visuais

O storyboard e as tiras de caminhada, parada e reação foram abertos em 720p. A inspeção separou o pulso da pedra do material dos olhos: o visor mantém intensidade própria. O topo do chão passou de -0,005 para Y=0, alinhado ao contato dos pés. As regiões afetadas foram revistas.

Em 1080p foram abertos começo/meio/fim em PNG, tira dos pés, recortes de expressão e amostras/detalhes dos dois MP4s. Conferidos enquadramento, separação do fundo, apoio, direção, pedra localizável e reação posterior ao brilho. Não se observou novo defeito impeditivo nas imagens abertas. As folhas possuem células pretas excedentes quando a contagem não fecha a grade; elas não são quadros do vídeo.

A inspeção dos MP4s cobre quadros **0, 4, 8, 14, 19, 23, 28, 32 e 35**, além do detalhe de contato extraído. O decode automatizado cobre todos os 36 quadros. Isso não equivale a uma alegação de assistir à reprodução audiovisual contínua.

## Desempenho e ambiente

Windows 10 Pro, build 19045; AMD Ryzen 5 3600, 6 núcleos/12 threads, aproximadamente 16 GiB de RAM. Hardware: Radeon R9 200, driver 27.20.1034.6, ANGLE D3D11. Software: ANGLE/SwiftShader Device Subzero. Node 24.15.0, Chrome 155.0.8059.85, Three.js 0.186.1 e FFmpeg/FFprobe 8.0.1. Encoder `libx264`, preset medium, CRF 18; perspectiva, sombras ligadas e qualidade final em todos os filmes medidos.

`scripts/benchmark-three.mjs` roda um processo completo por vez, sem outros renders/testes nossos concorrentes. O relógio externo inclui startup do Node, navegador/HTTP, captura, encode, verificação, fechamento e término do processo. São execuções individuais neste ambiente, não uma média estatística nem promessa de desempenho em outra máquina.

| Caso | Inicialização | Captura dos 36 quadros | Pipeline captura+encode | Verificação | Limpeza | Processo externo |
|---|---:|---:|---:|---:|---:|---:|
| Hardware 720p | 1,625 s | 0,706 s | 1,156 s | 0,949 s | 0,219 s | 4,425 s |
| SwiftShader 720p | 2,428 s | 2,458 s | 2,953 s | 0,982 s | 0,188 s | 7,027 s |
| Hardware 1080p | 1,653 s | 1,401 s | 2,143 s | 1,391 s | 0,728 s | 6,403 s |
| SwiftShader 1080p | 2,454 s | 5,086 s | 5,778 s | 1,491 s | 0,175 s | 10,383 s |

Captura e encode se sobrepõem no pipe; **não somar a coluna de captura à coluna do pipeline**. A medição externa inclui overheads além dessas fases. [Medições 720p](../out/mars-discovery/revisions/3e985d01ffc0/720p/performance.json), [1080p](../out/mars-discovery/revisions/3e985d01ffc0/1080p/performance.json).

## Proveniência e dependências

Revisão de entradas de produção dos quatro filmes e dos PNGs:

`3e985d01ffc02e108874e81fb79409c42178f7fd541c5e55e2ba88dd1a669c45`

O inventário inclui `src/**/*.js`, studio, renderer, render-lib, **novo servidor**, package/lock e os bytes efetivos dos arquivos de dependências servidos (incluindo Three core/module e addons explicitamente permitidos). Cada relatório inclui hashes individuais, SHA-256 do MP4, argumentos, backend, dimensões, horário e tempos. Caches separam configurações e dispositivo 3D; não se misturam quadros de hardware e software. Uma mudança persistente de fonte durante o job impede promoção da saída.

| Arquivo | SHA-256 |
|---|---|
| Hardware 720p | `8381939b21d0fb252ddf6522a16aac419143a15006ffc6fa0f599e691763b6f3` |
| SwiftShader 720p | `214ec4da5abdf0147342f55d21c46e216b7aa64191a4bf2224ccbca88075df9d` |
| Hardware 1080p | `7976a10548d3df939c080d9d83d60048beacdf2036a4ea78107cbdd4b48503f4` |
| SwiftShader 1080p | `d3dd69d972ce0b6716c556f4821341452900d0a72151dbfb61efe09bc7b316ed` |

Única dependência adicionada: **`three@0.186.1`**, MIT, exata e com integridade no lockfile. `npm ls --depth=0` confirma p5 2.3.3, p5.brush 2.2.3 e puppeteer-core 25.11.0 preservados. Sem API paga ou serviço de render externo. Documentos/testes/scripts auxiliares de revisão não entram no hash de produção; seus resultados ficam vinculados à revisão nos relatórios.

## Arquivos criados e modificados

Criados:

- `src/loader.js` — carregamento clássico/ES aguardado.
- `src/styles/lowpoly-3d/config.js`, `engine.js`, `GUIDE.md`, `AGENTS.md` — quarto estilo, contrato, configuração e instruções.
- `src/scenes/mars-discovery.js` — cenário, rig e coreografia original.
- `scripts/studio-server.mjs` — servidor local de rotas permitidas.
- `scripts/check-integration.mjs`, `check-three.mjs`, `check-render-three.mjs` — testes de integração, backend e CLI.
- `scripts/review-three.mjs`, `benchmark-three.mjs` — evidência visual e medições sequenciais.
- `tests/server.test.mjs`, `lowpoly.test.mjs`, `cleanup.test.mjs` — fronteiras de HTTP, configuração/movimento e encerramento.
- `docs/storyboards/mars-discovery.md`, `docs/LOWPOLY_3D_REPORT.md` — storyboard e esta entrega técnica.

Modificados:

- `package.json`, `package-lock.json` — versão fixa de Three.js e comandos locais.
- `studio.html`, `src/runtime.js`, `src/preview.js` — import map, novo registro, captura, XYZ, lifecycle e prévia opt-in.
- `src/config.js` — novo filme; entradas existentes preservadas.
- `render.mjs`, `scripts/render-lib.mjs` — HTTP/ES, opções 3D, proveniência, resolução, timing, caches e limpeza.
- `scripts/check-visuals.mjs` — mesmo teste visual com encerramento limitado do browser.
- `scripts/verify-video.mjs` — preservação dos tempos ao revalidar bytes idênticos.
- `README.md`, `ANIMATION_GUIDE.md`, `ARCHITECTURE.md`, `docs/ADDING_STYLES.md`, `docs/LOWPOLY_3D_PLAN.md`, `docs/VALIDATION.md` — instruções e referências atualizadas.

Os vídeos, PNGs, folhas e relatórios locais foram **adicionados em novas pastas**; não alteram os MP4s anteriores. Nenhuma implementação de anime, motion graphics, física complexa, prompt UI ou modelos de IA local foi incluída.

## Limitações e próximos passos

- O filme experimental demonstra uma cena procedural e um rig pequeno; não é um editor 3D ou importador geral de modelos. A marcha tem pivôs e segmentos calculados, sem IK/colisões físicas.
- O brilho usa emissão e luz local, sem bloom. A prévia leve perde sombras e resolução interna deliberadamente; não deve ser usada como entrega final.
- WebGL2 continua obrigatório, podendo ser provido por software. SwiftShader é mais lento neste ambiente; outros navegadores/políticas podem restringi-lo. Falhas são expostas.
- Determinismo foi confirmado dentro de cada backend/perfil; **não se promete identidade binária entre GPUs, drivers ou versões de navegador**. Os hashes diferentes de hardware/software são esperados.
- H.264/yuv420p modifica cores/bordas em relação ao PNG. Use a sequência sem perdas quando precisar da imagem original.
- Próximo passo recomendado: ampliar poses e expressões do robô em outro storyboard curto antes de vídeos longos. Introduzir GLTFLoader somente quando um asset concreto justificar, inventariando também suas dependências/bytes e seu descarte.

Para reproduzir: `npm run studio`, `npm run test:three`, `npm run test:three -- --soft-gl`, `npm run review:three`, e `npm run benchmark:three -- --resolution=720p`. Inspecione o 720p antes de executar o mesmo benchmark com `1080p`. O benchmark preserva entregas existentes e recusa sobrescrever um caso já registrado na mesma revisão.
