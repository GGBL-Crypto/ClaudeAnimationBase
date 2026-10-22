# Generalização do motor low poly — 21/10/2026

Estado: **validado e inspecionado**. Revisão de produção: `66fd1e9898025395092effec18fb8db9c0bb838e7fc7eb7eec8b323923ffa701`. [Fechamento e inventário](../out/ocean-encounter/revisions/66fd1e989802/completion.json) · [regressões completas](../out/generalization/regressions/report.json).

## Resultado arquitetural

Duas histórias usam o mesmo `animationEngine` 3D, sem mudar uma linha de `engine.js`: “Um sinal na poeira” e “O farol que nadava”. O segundo filme tem veículo, criatura, cenário, paleta, iluminação, atuação e câmera próprios. Não importa a cena de Marte, não usa `marsPose/marsDiagnostics` e não instancia o robô. O módulo de atores inclui a fábrica genérica do robô; apenas Marte a utiliza.

O [plano anterior à implementação](GENERALIZATION_PLAN.md) separou o código de Marte em três responsabilidades:

| Parte | Destino |
|---|---|
| Materiais, primitivas, montagem de volumes, personagens | Catálogo `components/`, sem horários de acontecimentos. |
| Solo, rochas, luz local e interpolação da câmera | Funções reutilizadas nos dois filmes. |
| Caminhada, apoio dos pés, percepção da pedra, surpresa, tempos e composição | Permanecem em `mars-discovery.js`. Até a intensidade do balanço dos braços vem da pose, não de um limite temporal no componente. |

O catálogo é formado por quatro módulos pequenos, sem ECS, hierarquia de cenas, outra timeline, renderer ou framework. Uma nova história cadastra projeto/configuração e escreve sua construção/coreografia. O [catálogo documentado](COMPONENTS_3D.md) descreve entradas e saídas das fábricas, convenções XYZ e responsabilidade de descarte.

## Preservação

A baseline foi capturada antes das edições em `out/generalization/baseline/`. A comparação de **todos os 36 PNGs de Marte em 1080p**, com o mesmo backend/D3D11, foi repetida depois da extração e do ajuste de atuação: igualdade byte a byte com a revisão `3e985d01ffc0`. Evidência: `out/generalization/mars-regression/report.json` e três PNGs de controle.

O backend 3D continua com SHA-256 `bd48003f9c8817de8e7c544536ba2b80c28e3922d25c09e7995ef491f7962b4f`. A suíte compara todos os inputs existentes da baseline, permitindo mudanças somente no cadastro de projetos, cena de Marte, lista de módulos do estilo e comandos de package.json. Assim verifica que os três motores 2D, core/pintura, runtime, timeline, motion, prévia, estúdio, renderizador, servidor e dependências permanecem idênticos ao início desta tarefa.

Os MP4s anteriores permanecem em seus caminhos. A verificação de fechamento confere os hashes dos quatro vídeos anteriores de Marte e dos seis vídeos 2D (originais e revisão da auditoria). O `sourceHash` histórico desses vídeos não é reatribuído ao código atual. A remoção de `ClaudeAnimationBase.zip` já existia no workspace; foi preservada.

## Filme experimental

**“O farol que nadava” — `ocean-encounter`, 8 segundos, sem áudio.** Lume explora um fundo marinho entre rochas e algas. Uma luz parece um farol fixo, mas sobe: é uma água-viva. O veículo freia, recua e depois inclina a proa para acompanhá-la. [Storyboard](storyboards/ocean-encounter.md).

- 0–3 s: avanço e aproximação da câmera; aumento do brilho da criatura.
- 3–5,4 s: corte para o encontro, subida da água-viva, freada e ré.
- 5,4–8 s: abertura e deslocamento da câmera, arco da criatura e acompanhamento.

Paleta: água azul profunda, rochas/algas verdes, casco dourado, cabine azul e criatura ciano. Névoa linear, hemisférica/direcional recoloridas e duas luzes locais; sombras desligadas neste projeto. Emissão baixa no casco mantém sua cor sob a luz azul. Sem texturas bitmap, transparência pesada, pós-processamento, modelos externos ou física.

Os três atores do catálogo são procedurais. Hélice, campânula, seis tentáculos, algas, bolhas, movimentos de veículo/criatura e câmera dependem exclusivamente do tempo. A hélice integra analiticamente velocidades por segmentos, preservando a fase ao frear/inverter. Recursos são construídos uma vez, registrados em `art` e descartados pelo proprietário já existente. Oceano libera 7 geometrias, 14 materiais e um renderer no teste; não usa texturas.

## Entregas e desempenho

Primeiro foi produzido e inspecionado 720p/12 FPS; só depois 1080p/24 FPS. Após retirar o horário da atuação do componente do robô, os quatro renders foram regenerados na revisão final, novamente com 720p validado antes de 1080p. As saídas preliminares `819996d9ca06` foram preservadas e não são as entregas atuais.

| Configuração | Backend | Quadros | Captura | Processo completo | Tamanho |
|---|---|---:|---:|---:|---:|
| 1280×720 / 12 FPS | AMD/D3D11 | 96 | 1,746 s | **5,209 s** | 547.813 bytes |
| 1280×720 / 12 FPS | SwiftShader | 96 | 5,274 s | **9,541 s** | 538.873 bytes |
| 1920×1080 / 24 FPS | AMD/D3D11 | 192 | 6,392 s | **11,436 s** | 1.150.488 bytes |
| 1920×1080 / 24 FPS | SwiftShader | 192 | 21,718 s | **27,557 s** | 1.154.055 bytes |

Cada medição é uma execução, sequencial, sem outros jobs de render desta tarefa em paralelo. “Processo completo” vai da criação à saída do processo Node filho, incluindo servidor, navegador, captura, encode, FFprobe, decodificação, amostras e limpeza. Captura e encoder trabalham em pipeline: não some `captureMs` e `encodePipelineMs`. São medições locais, não média estatística nem promessa de throughput.

O aumento conjunto de resolução e FPS multiplica o número de pixels amostrados por 4,5; o tempo total aumentou cerca de **2,20× no hardware** e **2,89× no software**. Essa comparação não isola resolução e FPS individualmente e inclui custos fixos de inicialização/verificação. A captura aumentou 3,66× e 4,12×, respectivamente.

Ambiente: Windows 10 Pro build 19045, Ryzen 5 3600 (6 núcleos/12 threads), cerca de 16 GiB RAM; Node 24.15.0; Chrome headless 155.0.8059.85; FFmpeg/FFprobe 8.0.1; Three.js exato 0.186.1. Hardware: ANGLE, AMD Radeon R9 200 Series, Direct3D11. Software: ANGLE/Vulkan, SwiftShader Device (Subzero). Todos os quatro processos fecharam sem encerramento forçado do navegador. Não foi instalada dependência alguma.

O filme usa 51 chamadas de desenho, 1.400 triângulos submetidos por quadro e respeita os limites de 64 meshes/10.000 triângulos únicos. O modo leve do estúdio mantém o canvas público e reduz somente a resolução interna; não muda os motores 2D.

| Entrega | Vídeo e evidência |
|---|---|
| 720p / hardware | [MP4](../out/ocean-encounter/revisions/66fd1e989802/720p-12fps/hardware/video.mp4) · [quadros decodificados](../out/ocean-encounter/revisions/66fd1e989802/720p-12fps/hardware/video.mp4.review/decoded-sheet.png) |
| 720p / software | [MP4](../out/ocean-encounter/revisions/66fd1e989802/720p-12fps/swiftshader/video.mp4) · [quadros](../out/ocean-encounter/revisions/66fd1e989802/720p-12fps/swiftshader/video.mp4.review/decoded-sheet.png) |
| 1080p / hardware | [MP4 final](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/video.mp4) · [quadros](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/video.mp4.review/decoded-sheet.png) |
| 1080p / software | [MP4](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/swiftshader/video.mp4) · [quadros](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/swiftshader/video.mp4.review/decoded-sheet.png) |

PNGs finais: [começo](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/inspection/begin.png), [meio](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/inspection/middle.png), [fim](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/inspection/end.png). [Descoberta/recuo](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/inspection/discovery.jpg), [acompanhamento](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/inspection/follow.jpg), [veículo](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/inspection/vehicle.jpg), [criatura](../out/ocean-encounter/revisions/66fd1e989802/1080p-24fps/hardware/inspection/creature.jpg).

## Validação

O renderizador verificou os quatro MP4s: H.264, dimensões, 8 s, FPS e contagens exatas, bytes não vazios e decodificação completa com erros tratados. Foram abertas as folhas de nove amostras de cada MP4 e detalhes extraídos dos próprios vídeos. Em 1080p, também foram abertos PNGs de começo/meio/fim, tiras da descoberta e acompanhamento e recortes móveis dos dois atores. A revisão visual é de amostras e movimentos importantes; não significa revisão visual individual de todos os 576 quadros dos quatro arquivos.

| Verificação | Evidência |
|---|---|
| 15 testes unitários | `out/generalization/regressions/unit.log`: contratos, storyboard, imutabilidade, crop seguro, fases, reação causal, continuidade, proveniência e fronteira HTTP. |
| Aquarela, cartoon e pixel | `visual.log`, `integration.log`: demo original byte a byte, ordem/páginas, paleta/grade pixel, contato, estúdio desktop/mobile e igualdade file/HTTP. |
| Renderizador 2D | `render-2d.log`: cache/retomada, frames faltantes, encode PNG/JPEG, stills, recortes, erros e áudio opcional. |
| 3D em hardware e software | `three-*.log`: duas projeções × duas opções de sombra, ordem/páginas, PNG final após preview, descarte idempotente, WebGL2 ausente, perda de contexto e erro de shader. |
| CLI 3D | `render-three.log`: resolução/projeção/sombra/GPU no cache, workers, encode e recortes XYZ; opções 3D rejeitadas nos motores 2D. |
| Generalização oceânica | `ocean-*.log` e `checks-*/report.json`: sem carregamento da história de Marte nem instância do robô; PNGs iguais fora de ordem e entre páginas no mesmo backend; centros dos atores dentro do enquadramento nos 96 tempos de 12 FPS, separação, preview/final, estúdio e descarte. |
| Marte preservado | `mars-baseline.log`: 36/36 PNGs iguais à entrega anterior. |

Execução integral: `node scripts/check-generalization-suite.mjs`. O relatório único registra cada comando, resultado, tempo e `sourceHash`, além dos inputs preservados. Não se promete igualdade binária entre AMD/D3D11 e SwiftShader ou entre GPUs distintas.

Resultado final: **15/15 testes unitários e 10/10 grupos da suíte aprovados**, na revisão de produção. `git diff --check` sem erros. O fechamento repetiu FFprobe e decodificação dos quatro MP4s, conferiu seus SHA-256 e inventários com o código atual, registrou as evidências realmente abertas como `inspected-sampled-frames` e confirmou os hashes de dez MP4s anteriores. Inclui hashes do código novo, servidor, dependências e dos scripts de QA. Também foram abertos os quadros de contato dos três estilos 2D e o quadro de Marte após a regressão.

## Problemas encontrados e correções

| Problema observado | Correção/verificação |
|---|---|
| Casco ficava excessivamente oliva sob luz azul | Pequena emissão na cor da bíblia visual, sem alterar o material do robô. PNGs e MP4 revisados. |
| Recorte fixo cortava o veículo que se deslocava | Recorte segue a posição real de cada ator; origem limitada ao canvas, removendo faixa vazia na borda. Recortes finais abertos novamente. |
| Fábrica extraída ainda sabia que a caminhada de Marte terminava em 1 s | `strideWeight` calculado no filme e recebido na pose; teste impede comparação de relógio com duração no módulo de atores; 36 PNGs permaneceram iguais. |
| Primeiro teste bloqueava Marte inclusive ao trocar de projeto de propósito | Interceptação fica restrita às páginas do teste de independência; navegação do estúdio usa página sem esse bloqueio. A falha era do teste, não do motor. |

O Node emite aviso de detecção de ES module ao importar `components/core.js` no teste unitário: o projeto mantém seu package.json sem `type:module` para preservar os scripts clássicos. O navegador usa módulos ES explícitos, sem esse aviso. Não foi alterada a configuração global de módulos só para remover um aviso de desenvolvimento.

## Arquivos desta evolução

Criados:

- `src/styles/lowpoly-3d/components/{index,core,actors,sets}.js`: catálogo, personagens, cenário, luz/câmera e movimento.
- `src/scenes/ocean-encounter.js`: construção e atuação exclusivas do novo filme.
- `tests/components.test.mjs`: fase, continuidade, reação, independência e inventário.
- `scripts/check-mars-baseline.mjs`, `check-generalization.mjs`, `check-generalization-suite.mjs`, `review-ocean.mjs`, `benchmark-ocean.mjs`: comparação, regressão, inspeção e medição.
- `docs/GENERALIZATION_PLAN.md`, este relatório, `COMPONENTS_3D.md`, `PROMPT_TO_STORYBOARD_PLAN.md` e `docs/storyboards/ocean-encounter.md`.

Modificados:

- `src/config.js`: novo projeto e overrides visuais, preservando as entradas anteriores.
- `src/scenes/mars-discovery.js`: consome o catálogo; acontecimentos e matemática de atuação preservados.
- `src/styles/lowpoly-3d/config.js`: carrega o catálogo ES antes do backend, sem alterar defaults.
- `package.json`: quatro comandos de revisão/teste/benchmark, sem mudanças de dependências ou instalação.
- `src/styles/lowpoly-3d/{AGENTS,GUIDE}.md`, `ARCHITECTURE.md`, `README.md`, `docs/VALIDATION.md`: instruções e navegação atualizadas.

Artefatos em `out/` são locais e ignorados pelo Git. Incluem baseline, relatórios, logs, vídeos, imagens, script de fechamento e inventário de proveniência. O estado já continha alterações do trabalho anterior; esta lista descreve apenas esta evolução, não todo o `git status` do workspace.

## Limitações e próximos passos

O catálogo comprova reuso em duas produções, não cobertura ilimitada. Proporções dos modelos ainda são fixas; os parâmetros úteis virão de demandas concretas. Há margem de apenas 13 meshes no orçamento atual. Nenhum mecanismo de batching, física, colisão, volumetria, caustics, refração ou animação esquelética foi introduzido. A água é sugerida por paleta/névoa/vegetação; não existe superfície simulada. Os atores mantêm continuidade no espaço; os cortes de câmera em 3 s e 5,4 s são intencionais.

12 FPS simplifica testes e pode acentuar movimento estroboscópico da hélice; 24 FPS melhora a leitura, mas não adiciona motion blur. A reação é encenada por ré e inclinação, sem rosto/piloto. O enquadramento aberto reserva bastante espaço de água; futuras produções podem pedir mais variedade de planos. O filme é silencioso. A compressão H.264/yuv420p não preserva exatamente a paleta dos PNGs.

Prioridades: uma terceira narrativa que exija outro tipo de ação, perfis de proporção quando houver necessidade real, planejamento de oclusão/contato e eventual batching se o orçamento se tornar impeditivo. A [proposta para converter prompts em storyboards e animação nos quatro motores](PROMPT_TO_STORYBOARD_PLAN.md) prioriza causalidade, detalhes de mundo, bíblia visual por projeto, capacidades declaradas e checkpoints visuais. A interface de geração continua fora desta entrega.
