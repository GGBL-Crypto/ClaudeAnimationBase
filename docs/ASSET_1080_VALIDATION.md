# Validação de produção — piloto de assets em 1080p/24 FPS

Etapa autorizada em 22/10/2026 após aprovação explícita do piloto 720p/12 FPS. Escopo: validar a implementação existente; nenhuma evolução artística ou novo adaptador.

**Resultado: seis MP4s 1080p/24 FPS verificados e inspecionados; regressões aprovadas. Nenhuma correção de produção foi necessária.** [Fechamento e inventário](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/completion.json).

## Preservação e método

Revisão de produção mantida: `b2ed8e03fa7cb14c31338d64a8c3eca102b6c8d537561279b0f0948169134e84`. AssetHash de P1/P2 mantido: `d8a523f4b4b605a40c4c34d214ca42e559c240501b64671c5ba9ebf77f1bc95d`; P0 usa `null`. Modelo GLB, materiais, câmera, storyboard, coreografia, ambiente de reflexão, sombras e perfis são os mesmos aprovados. A mudança de resolução/FPS foi feita somente pelos argumentos existentes `--resolution=1080p --fps=24`.

O harness novo `scripts/validate-assets-1080.mjs` reaproveita render.mjs, servidor, captura, contratos e verificador existentes. Nenhum arquivo de produção, dependência ou asset precisa ser alterado para executar esta etapa. O inventário anterior, os seis MP4s 720p e os 23 filmes anteriores são fixados por hash antes da renderização. Todas as evidências dentro da revisão 720p também são inventariadas; o relatório antigo permanece histórico, inclusive sua condição de aprovação pendente na data da entrega anterior.

Saídas novas em `out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/`, sem sobrescrever 720p. Cada perfil é renderizado separadamente pelo CLI; primeiro hardware, depois SwiftShader, um processo de render por vez. A nova baseline copia os logs da regressão anterior para preservá-los.

Medições distintas:

- Inicialização, captura, pipeline de encode, verificação e limpeza: temporizadores do CLI atual.
- Total completo: relógio do processo pai, incluindo criação e término do processo filho.
- Encoder isolado: uma segunda execução FFmpeg com os mesmos parâmetros de codificação, lendo 48 PNGs locais. Não inclui WebGL/captura, mas inclui abertura do FFmpeg, leitura/decode PNG, compressão e escrita MP4. É uma medição de QA separada; não se soma ao total do render principal.
- Recursos: métricas JS/DOM observáveis pelo Puppeteer, buffers únicos de geometria, contagens do renderer, dimensões do ambiente e descarte. Não são pico de RAM do sistema nem medição direta de VRAM.

Captura e codificação do render principal se sobrepõem. `encodePipelineMs` é o intervalo do pipeline, incluindo espera por quadros; não representa tempo exclusivo de CPU do encoder. Comparações com 720p usam as mesmas métricas do CLI e do processo pai; o ensaio isolado do encoder existe apenas nesta etapa.

## Renderizações e desempenho

Os seis renders principais terminaram e passaram na verificação técnica do CLI. Todos: H.264, 1920×1080, 24 FPS, 2 segundos, **48 quadros**, sem áudio. Os seis navegadores encerraram sem fechamento forçado.

| Backend | Perfil | Inicialização | Captura | Encode em pipeline | Verificação | Limpeza | Total do processo pai | Bytes |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| AMD/D3D11 | P0 | 1,579 s | 1,412 s | 1,961 s | 1,183 s | 0,204 s | **5,341 s** | 153.625 |
| AMD/D3D11 | P1 | 1,557 s | 1,460 s | 1,987 s | 1,322 s | 0,349 s | **5,649 s** | 195.332 |
| AMD/D3D11 | P2 | 2,670 s | 1,482 s | 2,012 s | 1,170 s | 0,215 s | **6,545 s** | 146.289 |
| SwiftShader | P0 | 2,426 s | 6,482 s | 6,940 s | 1,120 s | 0,179 s | **11,129 s** | 154.782 |
| SwiftShader | P1 | 2,388 s | 6,599 s | 7,067 s | 1,247 s | 0,172 s | **11,287 s** | 195.148 |
| SwiftShader | P2 | 3,783 s | 11,478 s | 11,949 s | 1,222 s | 0,153 s | **17,521 s** | 146.618 |

Os componentes não são aditivos: captura está contida no pipeline de encode. O total externo também inclui criação/término do processo Node e seus custos fixos. Cada combinação foi medida uma vez, com navegador novo; não houve outros renders desta tarefa em paralelo. A inicialização inclui servidor, browser, carga/preparo do modelo e, em P2, reflexão PMREM.

### Comparação com o piloto 720p

| Backend | Perfil | Total 720p/12 | Total 1080p/24 | Fator total | Captura 720p → 1080p | Fator captura |
|---|---|---:|---:|---:|---|---:|
| AMD/D3D11 | P0 | 3,880 s | 5,341 s | 1,38× | 0,476 → 1,412 s | 2,97× |
| AMD/D3D11 | P1 | 4,141 s | 5,649 s | 1,36× | 0,439 → 1,460 s | 3,33× |
| AMD/D3D11 | P2 | 5,528 s | 6,545 s | 1,18× | 0,455 → 1,482 s | 3,26× |
| SwiftShader | P0 | 5,893 s | 11,129 s | 1,89× | 1,732 → 6,482 s | 3,74× |
| SwiftShader | P1 | 6,520 s | 11,287 s | 1,73× | 1,742 → 6,599 s | 3,79× |
| SwiftShader | P2 | 8,061 s | 17,521 s | 2,17× | 2,943 → 11,478 s | 3,90× |

O número de pixels amostrados no filme aumenta 4,5× (2,25× por quadro e 2× em quadros). Isso não obriga o tempo completo a crescer 4,5×: há custos fixos e sobreposição de captura/encoder. A inicialização de P2/hardware ficou menor nesta execução que na medição anterior; isso é variação observada de uma amostra, não ganho de algoritmo. Nenhum código foi otimizado. Resolução e FPS mudaram juntos, portanto este teste não isola seus impactos individuais.

Ambiente: Windows 10 Pro build 19045, AMD Ryzen 5 3600/12 threads e cerca de 15,95 GiB de RAM; Node 24.15.0, Chrome headless 155.0.8059.85, Three.js 0.186.1. Hardware: ANGLE/AMD Radeon R9 200 Series/Direct3D11. Software: ANGLE/Vulkan SwiftShader Subzero. Isso comprova execução deste piloto por software; não promete reprodução em tempo real.

FFmpeg e FFprobe observados: 8.0.1 essentials build (gyan.dev). A codificação usa libx264/CPU, preset medium, CRF 18, yuv420p e faststart em ambos os backends; “hardware” identifica o renderer WebGL, não um encoder NVENC.

### Encoder isolado e recursos observáveis

| Backend | Perfil | Encoder isolado, 48 PNGs locais | Heap JS inicial → após QA | Buffers únicos de geometria | Draw calls / triângulos reportados |
|---|---|---:|---:|---:|---:|
| AMD/D3D11 | P0 | 1,166 s | 3.277.948 → 5.063.616 bytes | 24.948 bytes | 20 / 1.580 |
| AMD/D3D11 | P1 | 1,091 s | 3.520.148 → 5.108.552 bytes | 41.868 bytes | 14 / 1.972 |
| AMD/D3D11 | P2 | 1,042 s | 4.219.972 → 5.658.208 bytes | 41.868 bytes | 14 / 1.972 |
| SwiftShader | P0 | 1,036 s | 3.532.392 → 5.318.528 bytes | 24.948 bytes | 20 / 1.580 |
| SwiftShader | P1 | 1,025 s | 3.761.788 → 5.353.504 bytes | 41.868 bytes | 14 / 1.972 |
| SwiftShader | P2 | 1,411 s | 4.213.096 → 4.824.772 bytes | 41.868 bytes | 14 / 1.972 |

Heap é `JSHeapUsedSize` do Puppeteer em duas amostras; não é pico nem RAM total do Chrome/Node, e não inclui toda memória externa/GPU. A variação entre amostras também depende de coleta de lixo. A captura de QA grava os 48 PNGs em disco e faz repetições/segunda página: seus tempos ficam separados dos renders principais.

Os buffers de geometria e as contagens de desenho são os mesmos do piloto 720p. O ambiente de P2 continua com atlas 384×512, intensidade 0,55, gerado a partir da configuração PMREM de 128 pixels; não foi aumentado para acompanhar a saída. P1/P2 registram sete geometrias no renderer; texturas contadas são três/quatro, incluindo alvos internos/sombras, embora o GLB não tenha mapas. P0 mantém a API antiga sem campo de contagem de memória GPU.

Descarte observado nos dois backends: P0 libera seis geometrias, vinte materiais e um renderer; P1 libera dez geometrias, dezessete materiais e um renderer; P2 libera dez geometrias, dezessete materiais, a textura de ambiente e um renderer. Os eventos monitorados ocorrem uma vez por recurso; um segundo dispose não repete a liberação. A árvore fica vazia, sessões são encerradas e render após descarte rejeita. Em P1/P2, geometrias chegam a zero no contador; a textura de fallback interna do Three permanece como contador residual após alternar prévia/sombras, com o contexto encerrado, conforme já documentado em 720p.

## Evidências e verificações

Para cada um dos seis MP4s: H.264, 1920×1080, 24 FPS, 2 s, 48 quadros, sem áudio, contagem FFprobe e decodificação integral fatal em erros. Conferir sourceHash, assetHash e SHA-256 real do arquivo.

Comparativos são extraídos dos próprios MP4s em quadros 0, 24 e 47 (0 s, 1 s e 47/24 s). P0/P1/P2 mantêm a mesma ampliação/enquadramento. Os detalhes de materiais/sombras usam recortes em pixels nativos; folhas reduzidas servem para composição e continuidade. Folhas de 48 quadros dos dois P2 permitem revisar o arco completo. Não confundir uma folha reduzida com inspeção nativa de serrilhamento.

O teste adicional 1080p captura os 48 tempos de cada perfil/backend em PNG, repete tempos fora de ordem e entre páginas, volta da prévia para o quadro final e observa descarte. Para os materiais importados, confirmar quatro MeshStandardMaterial com metalness/roughness originais; para luz/câmera/escala, registrar os valores reais da cena. A suíte existente é executada novamente sem modificar suas regras.

### Avaliação visual realizada

Foram abertas as seis folhas `video.mp4.review/decoded-sheet.png`; comparativos com começo/meio/fim dos seis filmes; os dois comparativos de detalhes nativos; a comparação entre backends; o comparativo 720p/1080p em 1 s; as folhas dos 48 quadros de P2/hardware e P2/SwiftShader; e o detalhe nativo do MP4 P2/hardware. As folhas de 48 quadros mostram o arco inteiro em miniaturas. Não equivalem à revisão individual, em resolução nativa, de todos os 288 quadros dos seis vídeos, nem à reprodução humana em tempo real de cada arquivo.

| Item | Resultado e limite |
|---|---|
| Materiais | Os quatro materiais PBR de P1/P2 permanecem MeshStandardMaterial, metalness 1 e roughness 1. Cores e identidade são estáveis nas amostras. P1 continua com faces quase pretas sem ambiente; isso é a comparação aprovada, sem conversão ou correção artística nesta etapa. |
| Iluminação | P2 mantém amarelo/cinza separados e as faces visíveis sob o mesmo ambiente/luzes. Não observei mudança de exposição ou clarões entre os quadros inspecionados. |
| Sombras | Contato e movimento acompanham o veículo; bordas discretas/serrilhadas e pequenas irregularidades ficam claras no recorte nativo, especialmente em P0/P1. O mapa de 512 pixels permaneceu fixo. Aumentar a saída não aumenta a qualidade espacial desse mapa. |
| Nitidez e serrilhamento | 1080p preserva mais amostras dos contornos/aberturas; no comparativo com a mesma dimensão de exibição, a diferença é discreta. Facetas da malha e costuras de sombra continuam. Não foram acrescentados detalhes de modelagem, texturas ou antialiasing temporal. |
| Flicker | Não observei flashes globais, desaparecimentos ou troca de material nas folhas reais. No fundo estático, o ROI 128×128 em (64,64) manteve média de luma 39 nos 48 quadros dos seis MP4s, amplitude zero. Isso testa somente essa região; não exclui shimmer subpixel nas bordas móveis das sombras. |
| Continuidade | Giro e elevação desaceleram sem cortes/popping nas amostras. 24 FPS oferece passos temporais menores que 12 FPS, com os mesmos movimentos absolutos. Ordem, outra página e retorno da prévia produzem PNGs iguais dentro do mesmo backend. |
| Backends | A composição e a leitura são equivalentes nas imagens abertas. Há diferenças numéricas em bordas/tons e na compressão. Não foi exigida igualdade binária hardware/SwiftShader. |

Diagnóstico numérico complementar dos PNGs extraídos dos MP4s nos quadros 0/24/47: diferença RGB absoluta média hardware/software entre **0,105 e 0,203** numa escala de 0–255 por canal; cerca de 8,1%–14,2% dos pixels diferem em pelo menos um canal. Alguns pixels isolados de borda chegam a 95 níveis de diferença. O fundo ocupa muita área, portanto a média global pequena não é uma garantia perceptual nem elimina diferenças localizadas. O cálculo inclui renderização **e compressão H.264**, não isola a GPU. Dados completos em `image-metrics.json`.

Não foi encontrada falha que exigisse mudança de código ou perfil. As limitações de sombra, P1 sem ambiente e modelagem simples foram preservadas e registradas. O nível da referência cinematográfica não é reivindicado por esta validação de resolução/FPS.

## Entregas

Todos os vídeos abaixo têm dois segundos, 48 quadros, 24 FPS, 1920×1080 e nenhum áudio.

| Perfil | Hardware / AMD-D3D11 | SwiftShader |
|---|---|---|
| P0, procedural | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/hardware/p0/video.mp4) · [quadros](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/hardware/p0/video.mp4.review/decoded-sheet.png) | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/swiftshader/p0/video.mp4) · [quadros](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/swiftshader/p0/video.mp4.review/decoded-sheet.png) |
| P1, importado | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/hardware/p1/video.mp4) · [quadros](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/hardware/p1/video.mp4.review/decoded-sheet.png) | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/swiftshader/p1/video.mp4) · [quadros](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/swiftshader/p1/video.mp4.review/decoded-sheet.png) |
| P2, luz refinada | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/hardware/p2/video.mp4) · [quadros](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/hardware/p2/video.mp4.review/decoded-sheet.png) | [MP4](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/swiftshader/p2/video.mp4) · [quadros](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/swiftshader/p2/video.mp4.review/decoded-sheet.png) |

Comparativos extraídos dos MP4s: [P0/P1/P2 hardware, começo/meio/fim](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/hardware-p0-p1-p2.png), [SwiftShader](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/swiftshader-p0-p1-p2.png), [backends em 1 s](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/backends-middle.png), [detalhes nativos hardware](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/hardware-native-details.png), [detalhes nativos SwiftShader](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/swiftshader-native-details.png), [720p versus 1080p](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/720-vs-1080-p2.png). [48 quadros P2/hardware](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/hardware-p2-all-48.png) · [48 quadros P2/SwiftShader](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/swiftshader-p2-all-48.png).

Dados reproduzíveis: [benchmark principal](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/benchmark.json), [QA/encoder/recursos](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/qa.json), [métricas das imagens](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/image-metrics.json), [regressões](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/regressions/report.json) e [baseline](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/baseline.json). Cada pasta de vídeo contém o log do render e o relatório com hashes, argumentos, ambiente e evidências visuais. Os MP4s `qa/encoder-only.mp4` são medições auxiliares, separados dos seis vídeos de entrega.

## Regressões e preservação

**18/18 testes unitários e 13/13 grupos da suíte passaram novamente.** A execução integral durou 234,592 s nesta máquina. O relatório individual registra os comandos e tempos. A suíte cobre aquarela original/loops, cartoon/pixel, integração file/HTTP e estúdio, CLI 2D, 3D normal/software, cache/encode, erros de WebGL2, Oceano, os 36 PNGs históricos de Marte, assets e suas fronteiras de segurança.

Além da suíte, os seis testes específicos de 1080p passaram: 48 PNGs por perfil/backend, repetições fora de ordem, igualdade entre páginas no mesmo backend, volta da prévia para captura final, materiais importados, câmera/escala, contagem de recursos e descarte idempotente. O teste não impõe igualdade entre GPUs.

O fechamento confere novamente os hashes de **29 vídeos anteriores** (23 históricos e seis do piloto 720p), todas as evidências inventariadas da revisão 720p, os arquivos de produção/dependências do sourceHash e os assets do assetHash. Os 30 arquivos anteriores de QA também permanecem idênticos; os logs anteriores da suíte foram copiados antes de sua repetição. Não se atribuiu a revisão atual a um vídeo histórico nem se alterou seu relatório.

Arquivos desta etapa: adicionado somente `scripts/validate-assets-1080.mjs` para orquestração/asserções de QA, este relatório e uma entrada em `docs/VALIDATION.md`; os artefatos ficam na nova pasta de saída. Não houve instalação, download, alteração de configuração artística, engine, cena, render.mjs, servidor ou pacote aprovado. O `sourceHash` permanece exatamente o do piloto 720p, com o harness de validação inventariado separadamente por SHA-256 no fechamento.

Para reprodução do procedimento, as fases do harness são `--baseline`, `--render`, `--qa`, `--comparison`, `--metrics`, `--regressions` e `--finish`. As fases de produção/medição recusam sobrescrever saídas existentes; não execute todas indiscriminadamente sobre esta entrega. O fechamento requer o registro explícito das imagens realmente abertas e a documentação da inspeção. Não usa API externa ou outra plataforma.

## Limites desta etapa

Este é um único modelo rígido, uma cena de dois segundos e uma execução medida de cada combinação. Não extrapolar os tempos para filmes longos, outros modelos, rigs, mapas pesados ou outras GPUs. Hardware e SwiftShader podem produzir PNGs/MP4s diferentes; igualdade binária é testada apenas dentro do mesmo backend/perfil.

Não foram autorizados rigging, personagens articulados, motores novos, APIs de IA, adaptadores 2D, pós-processamento pesado ou compilador JSON. A tarefa termina com esta validação; não há avanço automático para outra fase artística.
