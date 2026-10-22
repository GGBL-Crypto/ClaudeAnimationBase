# Infraestrutura de assets e primeiro piloto importado

Referência preservada antes das mudanças: commit `1ea2f6cf4ab8accedb58131b2d8cffb1e5730b8a`. O [plano aprovado](ART_ASSETS_PLAN.md) recebeu primeiro as seções de geração externa manual e a ordem incremental solicitada. A arquitetura foi apresentada antes do código. O estado prévio tinha alterações e a remoção já existente de `ClaudeAnimationBase.zip`; o commit preserva esse estado, sem uma nova exclusão desta tarefa.

**Entrega técnica validada em 720p; aprovação do usuário pendente para 1080p/24 FPS.** Revisão de produção: `b2ed8e03fa7cb14c31338d64a8c3eca102b6c8d537561279b0f0948169134e84`. AssetHash de P1/P2: `d8a523f4b4b605a40c4c34d214ca42e559c240501b64671c5ba9ebf77f1bc95d`. P0 não usa assets. [Fechamento/inventário](../out/asset-pilot/revisions/b2ed8e03fa7c/completion.json).

## Arquitetura implementada

`assets/catalog.json` fixa ID/versão/SHA do manifesto. Um candidato local passa pela admissão e gera um pack versionado; produção e provas têm hashes separados no inventário. O projeto fixa seus pins. O servidor publica somente arquivos de produção explicitamente registrados, e a sessão verifica os bytes antes de preparar o adaptador. `init()`/primeiro quadro/`ready` aguardam todo o preparo. O contrato `animationEngine`, timeline e captura/FFmpeg atuais continuam.

`sourceHash` agora inclui catálogo/importador, novo servidor/módulos e addon RoomEnvironment existente. `assetHash` cobre somente a closure do projeto, incluindo manifesto e evidências; aparece no manifesto de sequência e relatório MP4, é verificado no navegador, workers, retomada, encode e promoção. Projetos sem assets mantêm `null`, sem carregar o adaptador novo. Alterar código invalida o cache; isso não reatribui a revisão dos vídeos históricos.

O [catálogo documentado](ASSET_CATALOG.md) admite fontes PNG/JPG manuais, folhas, poses e expressões com proveniência. Para geração externa: autor/operador, provedor/modelo informado, prompt, parâmetros/IDs desconhecidos explícitos, referências com hashes e direitos revistos, condições de uso e evidências. Não há API nem automação de provedor, geração de imagens ou atribuição automática de CC0. Nenhum asset gerado de produção foi fornecido/importado; as fontes de teste são fixtures originais mínimas.

A preparação 2D permanece planejada: recortes revisados, máscaras/alpha, retoque e reconstrução das regiões escondidas, pivôs/parentesco/anchors, amplitudes e revisão temporal. Imagem não vira SVG, sprite ou 3D por aparência. Conceito 3D, modelagem/conversão, UV/material, rigging e clips são etapas distintas com lineage próprio. Nenhum dos três adaptadores 2D foi implementado.

## Modelo e piloto

[Fontes e capacidades verificadas](ASSET_SOURCES.md). Produção usa apenas `craft_speederA.glb` de Kenney Space Kit, CC0: 20.496 bytes, 280 triângulos, quatro materiais PBR, sem texturas, rig, clips ou morph. O arquivo não foi editado. Mini Characters foi inspecionado em quarentena; seu personagem com skins/clips fica para a próxima etapa. Poly Haven foi avaliado sem incorporar mapas desnecessários. Nenhuma das quatro imagens de referência virou asset.

[Storyboard](storyboards/quality-space.md): veículo rígido apresenta seus volumes sobre uma bancada, em um giro suave de 28 graus e leve elevação. 2 s, 720p, 12 FPS, 24 quadros, sem áudio. Câmera fixa, escala máxima 2,4 unidades, mesmos transforms e enquadramento nos três projetos.

- P0: bloqueio com primitivas do backend atual; envelope aproximado do novo modelo, sem afirmar identidade de silhueta.
- P1: substituição pelo modelo importado, preservando os quatro materiais MeshStandardMaterial e parâmetros de metal/roughness.
- P2: modelo idêntico, ambiente RoomEnvironment/PMREM local de 128 pixels, preenchimento/recorte e ACES; sem alterar material ou geometria.

RoomEnvironment usa código da dependência já instalada. O ambiente é preparado uma vez, não por quadro. Não foi instalada dependência; `package.json` e lock continuam intactos. O addon adicional entrou nas rotas explícitas e no inventário de código.

## Testes e recursos

Os 10 grupos da suíte anterior passaram antes da implementação, com logs preservados em `out/assets-stage/baseline/regressions/`. Foram registrados hashes de 23 vídeos anteriores e amostras PNG de Oceano antes de alterar produção.

O novo teste de assets verifica pin/hash entre Node e navegador, prontidão durante atraso da rede, busca fora de ordem/fim/início, duas páginas/workers, prévia leve seguida de captura final, quatro materiais PBR intactos, troca no estúdio e falha explícita de carga. Uma fixture glTF original com BIN e PNG externos comprova mapa, material, decode e ImageBitmap; imagem corrompida deve falhar antes do loader. A fixture técnica não é evidência de qualidade artística.

Cada sessão tem recursos próprios. Adoção transfere geometria/material/textura ao engine, inclusive se o root sair da árvore antes de dispose. Descarte é idempotente; bitmaps são fechados, URLs revogadas, targets/renderer/contexto liberados. Os testes observam um único evento por recurso gerenciado e um único fechamento do bitmap. P2 também libera seu target de ambiente.

Observação de memória: o modelo tem 20.496 bytes transferidos e zero mapas; os buffers únicos de geometria da cena somam 41.868 bytes no teste. `performance.memory` registra heap JS observado, não pico nem memória GPU. `renderer.info.memory` registra contagens, não bytes. Após descarte, geometria chega a zero; há um contador residual de uma textura interna de fallback do Three, usada na alternância de sombras/prévia. Esse objeto interno não representa um mapa importado sobrevivente; o renderer é descartado e o contexto encerrado. Não é prometido consumo zero do processo do navegador após uma página.

O servidor continua ligado apenas a 127.0.0.1; testes recusam Host incorreto, escrita HTTP, caminhos codificados/dobrados, travessia, junction externa, manifestos privados, provas, inbox e arquivos adulterados. Limites iniciais e verificações estão no guia do catálogo. Isso não substitui revisão de direitos, arte nem validação completa da especificação glTF.

## Avaliação visual e limites

Foram abertos os primeiros PNGs P0/P1/P2 e as quatro referências. O modelo P1 revelou sombras pretas/volumes mal lidos por ser inteiramente metálico e não ter ambiente de reflexão. P2 introduziu reflexão/luzes; a primeira tentativa ficou muito clara. Redução de ambiente e luz recuperou o amarelo e a separação das faces. Uma borda distante do plano gerava horizonte poligonal; névoa local ao piloto removeu essa quebra. Os projetos legados não receberam essas alterações artísticas.

| Categoria | Avaliação das stills P0 → P1 → P2 |
|---|---|
| Modelagem | P1 acrescenta asas chanfradas, aberturas e volumes próprios, frente aos blocos P0. Continua um asset simples de 280 triângulos. P2 não muda modelagem. |
| Materiais | P1 preserva os parâmetros PBR originais, porém o metal sem ambiente perde leitura. P2 melhora a iluminação desses mesmos materiais; não há mapas de detalhe/desgaste. |
| Iluminação | P2 recupera faces escuras, separa amarelo/cinza e suaviza a leitura. Ainda é uma bancada simples; não há acabamento cinematográfico comprovado. |
| Profundidade | Pedestal, sombra, oclusão, perspectiva e névoa estabelecem volume. Ambiente narrativo permanece mínimo. |
| Composição | Enquadramento fixo e comparável; objeto/pedestal separados do fundo, com bastante área vazia. Sem comparação favorecida por outro ângulo. |
| Consistência temporal | Ordem/workers comprovados no mesmo backend; nas folhas reais, giro/altura/cores permanecem coerentes e sem desaparecimentos. Os 24 quadros de P2 foram vistos em folha. Sem rig/deformação, não há prova de atuação de personagem. |

A referência 3D tem superfícies curvas, juntas mecânicas detalhadas, reflexos localizados, desgaste, olhos luminosos e cenário com profundidade seletiva. O piloto não alcança esse padrão. A diferença restante depende de modelagem/arte, materiais/mapas, direção de luz e atuação; um loader isolado não produz esses insumos. Os outros três motores ainda não receberam melhoria artística: apenas tiveram compatibilidade preservada.

## MP4s, inspeção e desempenho real

Todos os seis arquivos: H.264, 1280×720, 2 s, 12 FPS e 24 quadros, sem áudio. O renderizador contou quadros com FFprobe, decodificou o fluxo inteiro com erro fatal e extraiu folhas/detalhes do próprio MP4 antes de promover cada saída. As seis folhas de nove amostras foram abertas; adicionalmente foram abertas a comparação P0/P1/P2 em 1 s, a folha de **todos os 24 quadros** de P2/hardware, um detalhe nativo extraído do MP4 e PNGs nativos de começo/fim. Essa inspeção não afirma reprodução humana em tempo real de todos os seis arquivos nem revisão individual em tamanho nativo de todos os 144 quadros.

| Versão | Backend | Inicialização | Captura de 24 quadros | Processo completo | Bytes | Vídeo |
|---|---|---:|---:|---:|---:|---|
| P0 | AMD/D3D11 | 1,646 s | 0,476 s | **3,880 s** | 80.976 | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/hardware/p0/video.mp4) |
| P1 | AMD/D3D11 | 1,899 s | 0,439 s | **4,141 s** | 94.147 | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/hardware/p1/video.mp4) |
| P2 | AMD/D3D11 | 3,182 s | 0,455 s | **5,528 s** | 75.893 | [MP4 principal](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/hardware/p2/video.mp4) |
| P0 | SwiftShader | 2,420 s | 1,732 s | **5,893 s** | 80.984 | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/swiftshader/p0/video.mp4) |
| P1 | SwiftShader | 2,419 s | 1,742 s | **6,520 s** | 94.430 | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/swiftshader/p1/video.mp4) |
| P2 | SwiftShader | 3,381 s | 2,943 s | **8,061 s** | 75.989 | [MP4 por software](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/swiftshader/p2/video.mp4) |

Cada valor é uma execução sequencial, sem jobs de render desta tarefa concorrentes. “Processo completo” foi medido pelo processo pai, incluindo abertura, preparo, captura/encode em pipeline, verificação e fechamento; inicialização/captura vêm dos temporizadores internos. Não somar captura ao encode em pipeline. O mapa de ambiente aumenta principalmente o preparo; a captura em software também cresce. Não é benchmark estatístico nem promessa de tempo real.

Ambiente observado: Windows 10 Pro build 19045, Ryzen 5 3600/12 threads, 15,95 GiB RAM; Node 24.15.0, Chrome headless 155.0.8059.85, Three.js 0.186.1 e FFmpeg/FFprobe 8.0.1. Normal: ANGLE/AMD Radeon R9 200 Series/Direct3D11. Software: ANGLE/Vulkan SwiftShader Subzero. Os seis navegadores fecharam sem encerramento forçado. Não se exige GPU dedicada: o caminho SwiftShader foi executado, não apenas proposto.

Evidências abertas: [comparação P0/P1/P2](../out/asset-pilot/revisions/b2ed8e03fa7c/comparison/p0-p1-p2.png), [24 quadros reais P2](../out/asset-pilot/revisions/b2ed8e03fa7c/comparison/p2-all-24-frames.png), [folha do MP4 principal](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/hardware/p2/video.mp4.review/decoded-sheet.png), [detalhe decodificado](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/hardware/p2/video.mp4.review/detail-2.png), [começo](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/hardware/p2/inspection/t0_00.png), [fim](../out/asset-pilot/revisions/b2ed8e03fa7c/720p-12fps/hardware/p2/inspection/t1_92.png). As sombras de 512 pixels ainda mostram bordas discretas e o asset permanece facetado; não foram introduzidos mapas de detalhe ou efeitos para esconder esses limites.

Resultado final: **18/18 testes unitários e 13/13 grupos aprovados** em [regressions/report.json](../out/assets-stage/regressions/report.json). Inclui aquarela original/loops, cartoon/pixel, file/HTTP, estúdio, CLI 2D, 3D normal/software com projeções/sombras/erros WebGL2, Marte 36/36 PNGs, Oceano sem dependência da primeira história, assets/PNG/JPG/mapas/ownership e CLI com assetHash/cache/encode. Nenhuma comparação exige igualdade entre GPUs. Os hashes dos 23 vídeos anteriores são conferidos no fechamento. `git diff --check` sem erros.

## Arquivos desta entrega

Criados: `assets/catalog.json`, pack `assets/packs/kenney-space-speeder/1.0.0/` e `assets/AGENTS.md`; `scripts/asset-catalog.mjs`, `import-assets.mjs`, `check-assets.mjs`, `check-render-assets.mjs`, `benchmark-assets.mjs`, `review-assets.mjs`; `src/assets/format.js`, `session.js`; `src/styles/lowpoly-3d/assets.js`; `src/scenes/quality-space.js`; `tests/assets.test.mjs`; os guias de catálogo/fontes, este relatório e storyboard.

Modificados: `src/platform.js`/`runtime.js` para pins/barreira/sessão; configuração/engine 3D para adaptador opcional, ownership, ambiente e perfil; `src/config.js` para os três projetos; `scripts/studio-server.mjs` para rotas/MIME/hash; `scripts/render-lib.mjs`/`render.mjs` para inventário/assetHash; três scripts de regressão histórica para explicitar os hooks autorizados e preservar a prova dos PNGs; arquitetura, plano, instruções e guias. Os motores/arte 2D, cenas antigas, motion/timeline, preview e studio.html permanecem intactos.

Os antigos testes de generalização exigiam bytes idênticos do backend, condição específica da extração anterior. Agora registram a extensão autorizada e mantêm a comparação dos 36 PNGs históricos de Marte, três PNGs de Oceano e as verificações visuais 2D. O inventário antigo não foi apagado nem atualizado para fingir igualdade de código.

## Próximas etapas

Revisar o piloto 720p antes de autorizar 1080p/24 FPS. Depois, desenvolver um adaptador 2D por vez e só então suporte 3D com esqueleto/clips reais, conforme [plano atualizado](ART_ASSETS_PLAN.md) e [sequência concreta](ASSET_CATALOG.md#extensões-seguintes-sem-implementar-agora). Não há compilador JSON, rig/morph, API paga, Blender, Remotion, efeitos pesados ou interface de prompt nesta entrega. Determinismo binário é testado dentro do mesmo backend/perfil; não é prometido entre GPUs.
