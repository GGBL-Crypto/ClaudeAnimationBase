# Personagens GLB articulados por tempo absoluto

Implementação original da primeira oportunidade aprovada na auditoria, em 22/10/2026. **Implementado e validado** na Radeon e no SwiftShader; filmes A/B 1080p/24 e prévias 720p verificados e inspecionados.

## Preservação

Estado inicial: `main`, HEAD `1ea2f6cf4ab8accedb58131b2d8cffb1e5730b8a`, dois commits à frente de origin, com alterações anteriores de assets, render e documentação. Essas alterações foram preservadas. O índice normal e a branch não foram alterados para criar o checkpoint.

Checkpoint recuperável: commit `3537d467e125b93f7357644d79681b7d160b2dfd`, referência `refs/checkpoints/pre-articulated-20261022-1792665890439`. Bundle e inventários em `C:/Projetos/yt/ClaudeAnimationBase-checkpoints/articulated-20261022-1792665889787/`. Pode-se criar outro worktree com `git worktree add ../ClaudeAnimationBase-before-actors 3537d467e125b93f7357644d79681b7d160b2dfd`. O checkpoint inclui arquivos previamente não rastreados; não é um commit na branch do usuário.

Antes de editar: 18/18 testes unitários e `npm run test:visual` passaram. Foram registrados hashes de 72 MP4s existentes. Depois dos testes de referência, uma cópia externa adicional preservou 1.306 arquivos de saídas anteriores, 190.668.698 bytes. O harness de regressão retém as novas evidências de testes e restaura relatórios antigos que os scripts de caminhos fixos substituem. Os MP4s antigos não são alvos de renderização desta entrega.

## Seleção, fontes e licenças

| Asset | Constatação no arquivo | Licença individual / utilização |
|---|---|---|
| RobotExpressive, Tomás Laulhé; modificações Don McCurdy | 463.988 bytes, 3.237 triângulos, 43 joints únicos, duas skins de 43 joints, 19 primitivas renderizáveis; 14 clips; morphs `Angry`, `Surprised`, `Sad`; três materiais PBR, zero mapas | [README upstream](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive), CC0 1.0. Fonte e commit exatos nos `acquisition.json` dos packs. Narrativa original; personagem licenciado. |
| RiggedSimple, Cesium | 15.104 bytes, 188 triângulos, dois joints, uma skin, um clip, zero morphs | [README individual](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/RiggedSimple/README.md), CC BY 4.0. Crédito: Cesium, 2017. Fixture técnica de skinning; sem alteração de bytes. |
| AnimatedMorphCube, Microsoft | 6.752 bytes, 12 triângulos, dois morphs, um clip `Square`, nenhuma skin | [README individual](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/AnimatedMorphCube/README.md), CC0 1.0. Fixture técnica de morphs; sem alteração de bytes. O GLB não fornece os nomes semânticos das expressões de um rosto. |

Cada pack preserva README e registro de aquisição com commit, URL, tamanho e SHA-256. As provas são privadas para o servidor; somente os GLBs declarados em `files` são públicos. Nenhum asset ou código do Eidoverse foi utilizado. Nenhuma dependência foi instalada. Three.js permanece em 0.186.1/MIT, inclusive GLTFLoader, AnimationMixer, SkeletonUtils e as ferramentas offline GLTFExporter/BufferGeometryUtils.

O RobotExpressive original excedia o orçamento inicial de oito malhas. `scripts/prepare-actor-asset.mjs` consolida as peças rígidas por material em uma skin com os mesmos joints; preserva as skins e bind matrices das mãos. Preserva a hierarquia, animações e os três morphs reais, preenche deltas nulos nas peças sem rosto e elimina skins duplicadas na exportação. Não há redução de triângulos, substituição de material ou aumento de limites globais. Resultado selecionado: **expressive-robot@1.0.1**, 847.004 bytes, **sete malhas renderizáveis**, 43 bones, duas definições de skin, três materiais, 14 clips, três morphs e zero mapas. O pin é `c70805c1f8f2a0f24e045bc4d2af60890a1af8430ebdeb506bf3cbf2d3f4e244`.

A primeira preparação, 1.0.0, falhou no teste de deformação facial: a união da geometria não preservou a flag de deltas relativos. Seus bytes foram preservados, mas a entrada foi retirada do índice ativo e não é servida nem usada nos projetos. A correção recebeu 1.0.1. O teste compara vértices da preparação com o original, em cinco poses de caminhada, repouso, gesto e rosto, amostrando um vértice a cada cinco e exigindo distância inferior a 0,0001 unidade de origem. Isso não equivale a comparar todos os vértices em todos os tempos possíveis.

## Arquitetura e interface

O importador estático mantém sua política: skins, clips e morphs são recusados quando o perfil não é explicitamente `articulated`. O novo perfil recebe apenas GLB com um buffer embutido e uma cena. O catálogo extrai capacidades dos bytes e cruza as expressões declaradas com morph targets reais; `identity.rigVersion` e estilo 3D são obrigatórios. Pins, readiness assíncrona, provas, limites agregados e allowlist HTTP existentes continuam sendo utilizados.

Limites do perfil articulado: 10 mil triângulos, oito primitivas renderizáveis, 48 bones únicos, até quatro skins, seis morphs por malha, dois mapas, 24 clips, 256 tracks, quatro ações simultâneas no controlador, 30 segundos por clip, 500 mil valores de accessors e 16 MiB de buffers estimados. Permanecem os limites globais anteriores de arquivos/texturas/sessão e da cena (64 meshes/30 mil triângulos). O personagem selecionado não usa texturas; portanto não depende do teto global de 2048 pixels para mapas.

A admissão verifica fechamento da cena e dos joints, hierarquia sem ciclos, matrizes inversas finitas e não singulares, quatro influências por vértice, índices válidos, pesos normalizados, formatos e contagens de accessors, layout/stride, morphs compatíveis, targets existentes, ausência de tracks duplicadas, keyframes finitos e estritamente crescentes, dimensões e interpolações LINEAR/STEP/CUBICSPLINE. Não aceita compressões, extensões ou referências externas novas. Morphs animados podem ter pesos em [-2,2], pois o fixture Khronos utiliza valores negativos; a API de expressão semântica usa [0,1].

```js
const item = assetSession.items.get('expressive-robot');
const actor = item.createActor(Lowpoly, {
  expressions: { surprise: 'Surprised', angry: 'Angry' }
});
parent.add(actor.root);
actor.apply(t, {
  actions: [{ clip: 'Walking', start: 0, speed: 1, loop: true, weight: 1 }],
  expressions: { surprise: 0 }
});
actor.dispose(); // idempotente; também registrado no ownership do engine
```

Interface: `root`, `apply(t, atuação)`, `info()`, `dispose()`. Cada instância tem seu mixer e clones de skeletons/bones. Geometrias, materiais e mapas são compartilhados dentro do pack e tratados como imutáveis pelo controlador. O parent deve conter escala/posicionamento da história: `apply` restaura os transforms importados do root.

A avaliação absoluta não depende de `AnimationMixer.setTime`. Cada seek valida o estado, interrompe todas as ações, remove fades/warps, restaura TRS e morphs, zera o relógio do mixer, reinicia as ações escolhidas e atribui explicitamente os tempos locais. Loop usa módulo; one-shot usa clamp. Ações ficam pausadas e `mixer.update(0)` apenas avalia os tempos atribuídos. A ordem de mistura é a do catálogo de clips, estável. Pesos somam no máximo um; o restante mistura com a pose original. Não há blend aditivo, transição acumulada ou root motion universal.

Os morphs semânticos mapeados são neutralizados depois da amostragem dos clips e recebem os pesos da atuação corrente, com prioridade explícita sobre as tracks faciais do clip. Alvos não mapeados podem seguir o clip; antes da avaliação seus pesos são zerados. Sem ações e sem expressão o ator volta à pose original e a morphs neutros. Não há visemas ou promessa de fala.

Skinned meshes não usam culling por bounds da pose de repouso. O orçamento da cena agora conta triângulos por instância, evitando que clones escapem do teto por compartilharem geometrias. No descarte: ações param, bindings do mixer são removidos, skeletons/bone textures são descartados por instância e o root é retirado da cena; o engine libera geometrias, materiais, morph textures internas do Three e mapas uma vez. Templates da sessão também têm descarte. O contador residual de uma textura interna de profundidade, após preview, é observado junto com o encerramento do contexto; não é anunciado como VRAM medida.

## Filme e inspeção em 720p

[Storyboard e bíblia](storyboards/articulated-delivery.md). IDs novos: `articulated-delivery-a` e `articulated-delivery-b`; oito segundos, dois planos, 24 FPS, sem áudio. Mesmos pins, escala, trajetória global, câmera, luz, cenário e tempos. A segura `Idle` no tempo zero; B usa `Walking`, `Idle`, gesto `No`, `Surprised` e `Angry`. A ainda usa a infraestrutura de importação articulada para permitir o mesmo modelo e materiais; seu custo não representa o antigo renderer sem skeletons.

A caminhada usa 1⅓ ciclos a 4/9 da velocidade original. A história prepara uma curva fixa a 48 Hz com amostras absolutas do próprio rig; não integra física nem o frame anterior. Cada sola é medida em sua própria fase plana. A parada sai do clip enquanto o pé direito está no ar e mantém o apoio esquerdo durante a mistura com repouso. As duas versões usam a mesma curva. Esse ajuste é específico deste personagem e do piso plano; não é retargeting ou IK geral.

Defeitos observados e correções: (1) rosto escuro e ângulo lateral: luz existente reposicionada e câmera aproximada; (2) consolidação com morph incorreto: flag de morph relativo e nova versão; (3) deslocamento linear causava patinação: curva com apoios reais; (4) primeira medição da sola direita era durante swing: referência na própria fase plana; (5) blend de parada arrastava o pé: saída antecipada com apoio esquerdo fixo; (6) primeiro frame final depois de preview diferia em 234 pixels na região do pé: invalidação dos materiais ao mudar perfil, com teste de igualdade do primeiro retorno. As folhas afetadas foram abertas novamente após as correções.

As folhas decodificadas e comparativos nativos dos quatro MP4s 720p foram abertos. B apresenta mudanças de pernas/braços na caminhada, negação de cabeça e olhos/sobrancelhas distintos entre surpresa e reprovação; A mantém a pose e o rosto. A inspeção editorial permite continuar para 1080p. Ela é do agente, não uma aprovação inventada do usuário nem um estudo de percepção. Não foram atribuídas notas humanas 1–5 ou ganho estatístico.

Limites artísticos observados: sombras de 512 pixels serrilham e deixam manchas fortes sob as sobrancelhas; os olhos são volumes pretos simples e não têm olhar/pupilas independentes; a passada é estilizada e lenta, com pés grandes e amplitude marcada; a parada preserva o ponto de apoio testado, mas a orientação/toe roll da sola não é um contato físico completo. A caixa oculta parte da mão direita no plano médio; a reação principal é facial/cabeça, e o teste separado de Wave confirma deformação das mãos. Nenhum desses itens foi escondido com pós-processamento ou nova infraestrutura gráfica. Não se reivindica equivalência às referências cinematográficas.

## Reutilização e limites

O mesmo pin e mapa semântico podem ser usados em outra história sem alterar o motor: trocar a coreografia, o parent global e escolher os clips existentes. `Wave` foi usado no teste de duas instâncias; `Sad` foi testado no controlador, sem ser apresentado como emoção deste filme. Contatos de outra trajetória/piso exigem autoria e nova inspeção. Não se implementou física, Rapier, retargeting universal, VRM/VRMA, cabelo, WebGPU, Deno, geração de assets, efeitos cinematográficos ou compilador JSON.

## Arquivos desta implementação

Alterados sobre o checkpoint: `assets/catalog.json`, `src/assets/format.js`, `scripts/asset-catalog.mjs`, `src/styles/lowpoly-3d/assets.js`, `src/styles/lowpoly-3d/components/index.js`, `src/styles/lowpoly-3d/engine.js`, `src/config.js`; documentação de arquitetura/catálogo/guia/validação recebe a descrição deste incremento. Vários desses arquivos já eram alterações não commitadas do usuário: o diff contra HEAD também inclui trabalho anterior, que não deve ser atribuído a esta implementação.

Adicionados: `src/assets/articulated.js`, `src/styles/lowpoly-3d/components/animated-actor.js`, `src/scenes/articulated-delivery.js`, `tests/articulated.test.mjs`, packs e provas, storyboard, este relatório e scripts `prepare-actor-asset.mjs`, `admit-actor-assets.mjs`, `inspect-actor-feet.mjs`, `check-articulated.mjs`, `render-articulated.mjs`, `review-articulated.mjs`, `validate-articulated-regressions.mjs` e fechamento. `motion.js`, `timeline.js`, motores 2D, dependências e filmes existentes não receberam regras de skeleton.


## Resultados finais e entregas

Revisão congelada: `a17b0c286aa6c407f563433d57d343f09cea9fe49226b5c1242c7d8fcce8e02b`; assetHash: `cb314e8acc802007387292fa9751722488bcc3c9a6054db69cb861c9766aa373`. **Implementação e validação concluídas**, com as limitações artísticas descritas acima. Não há aprovação humana atribuída ao usuário.

22/22 testes unitários passaram; o teste de endpoints foi estendido para início/fim/clamp/loop dos 14 clips e passou novamente. Os 13 grupos de regressão passaram, incluindo os quatro motores, Marte (36 PNGs históricos), Oceano, assets, CLI, cache e erros explícitos. Os 72 MP4s anteriores e os 1.306 arquivos do inventário de saídas continuam byte a byte iguais no fechamento. [Regressões](../out/articulated/revisions/a17b0c286aa6/regressions/report.json).

Em 720p e 1080p, em cada backend: 192 PNGs em ordem crescente, repetição decrescente e embaralhada, mais 12 tempos em página nova e retorno preview→final com igualdade do primeiro PNG. Também passaram neutralização, duas instâncias, descarte, skinning e morphs Khronos. São comparações dentro do mesmo backend; não é exigida igualdade Radeon/SwiftShader. [QA 720p Radeon](../out/articulated/revisions/a17b0c286aa6/qa/hardware/report.json), [720p SwiftShader](../out/articulated/revisions/a17b0c286aa6/qa/swiftshader/report.json), [1080p Radeon](../out/articulated/revisions/a17b0c286aa6/qa-1080p/hardware/report.json), [1080p SwiftShader](../out/articulated/revisions/a17b0c286aa6/qa-1080p/swiftshader/report.json).

Amostras de contato a 24 Hz: apoio esquerdo 0,12–0,85 s (18 amostras), direito 1,25–1,65 s (10), esquerdo/parada 2,3–3,3 s (24). Desvio vertical e deslizamento dos **pontos de sola declarados** ficaram abaixo de 1e-12 unidade nos tempos amostrados, frente aos limites de 0,022 m/0,044 m. Esses números medem anchors usados pela própria coreografia; não certificam toda a superfície da sola, toe roll, intervalos omitidos ou tempos entre amostras. A inspeção das tiras continua necessária e foi feita.

| Versão | Radeon/D3D11 — 1080p/24 | SwiftShader — 1080p/24 |
|---|---|---|
| A — atuação rígida | [MP4](../out/articulated/revisions/a17b0c286aa6/1080p/hardware/a/video.mp4) · [quadros](../out/articulated/revisions/a17b0c286aa6/1080p/hardware/a/video.mp4.review/decoded-sheet.png) | [MP4](../out/articulated/revisions/a17b0c286aa6/1080p/swiftshader/a/video.mp4) · [quadros](../out/articulated/revisions/a17b0c286aa6/1080p/swiftshader/a/video.mp4.review/decoded-sheet.png) |
| B — articulada | [MP4](../out/articulated/revisions/a17b0c286aa6/1080p/hardware/b/video.mp4) · [quadros](../out/articulated/revisions/a17b0c286aa6/1080p/hardware/b/video.mp4.review/decoded-sheet.png) | [MP4](../out/articulated/revisions/a17b0c286aa6/1080p/swiftshader/b/video.mp4) · [quadros](../out/articulated/revisions/a17b0c286aa6/1080p/swiftshader/b/video.mp4.review/decoded-sheet.png) |

Todos: H.264, 1920×1080, 24 FPS, oito segundos, 192 quadros, sem áudio; FFprobe e decodificação integral FFmpeg com erro fatal. Cada relatório individual contém tamanho, SHA-256, sourceHash, assetHash, ambiente, argumentos, tempos e evidências. São quatro entregas principais mais oito repetições auxiliares, também verificadas tecnicamente. Não foram abertas as folhas das oito repetições: seus relatórios permanecem com revisão visual pendente, e não são entregas artísticas adicionais.

Prévias 720p: [A Radeon](../out/articulated/revisions/a17b0c286aa6/720p/hardware/a/video.mp4), [B Radeon](../out/articulated/revisions/a17b0c286aa6/720p/hardware/b/video.mp4), [A SwiftShader](../out/articulated/revisions/a17b0c286aa6/720p/swiftshader/a/video.mp4), [B SwiftShader](../out/articulated/revisions/a17b0c286aa6/720p/swiftshader/b/video.mp4). Todos têm 1280×720/24 FPS, oito segundos e 192 quadros.

Comparativos reais dos MP4s 1080p: [movimento A/B Radeon](../out/articulated/revisions/a17b0c286aa6/1080p/comparison/hardware-action-ab.png), [expressões A/B Radeon](../out/articulated/revisions/a17b0c286aa6/1080p/comparison/hardware-face-ab.png), [movimento SwiftShader](../out/articulated/revisions/a17b0c286aa6/1080p/comparison/swiftshader-action-ab.png), [expressões SwiftShader](../out/articulated/revisions/a17b0c286aa6/1080p/comparison/swiftshader-face-ab.png). Evidências PNG da cena: [storyboard](../out/articulated/revisions/a17b0c286aa6/qa/hardware/storyboard.png), [apoios](../out/articulated/revisions/a17b0c286aa6/qa/hardware/feet.png), [parada corrigida 1080p](../out/articulated/revisions/a17b0c286aa6/qa-1080p/hardware/stop.png), [loop](../out/articulated/revisions/a17b0c286aa6/qa-1080p/hardware/loop.png), [gesto/retorno](../out/articulated/revisions/a17b0c286aa6/qa-1080p/hardware/gesture.png), [duas instâncias](../out/articulated/revisions/a17b0c286aa6/qa-1080p/hardware/two-instances.png).

## Custos observados

Três renders por combinação em 1080p, um render por vez, navegador novo; mediana em segundos. A máquina não é um laboratório isolado de processos do sistema. “Hardware” descreve o WebGL, não o encoder: libx264 é CPU, medium, CRF 18, yuv420p.

| Backend | Versão | Init | Captura | Encode em pipeline | Verificação | Total externo: mediana (mín–máx) |
|---|---|---:|---:|---:|---:|---:|
| hardware | A | 1.624 | 4.991 | 5.261 | 1.638 | 9.184 (9.070–9.906) |
| hardware | B | 2.367 | 4.988 | 5.347 | 1.755 | 10.105 (9.382–10.141) |
| swiftshader | A | 2.388 | 19.997 | 20.248 | 1.659 | 24.890 (24.792–25.938) |
| swiftshader | B | 2.396 | 20.338 | 20.660 | 1.737 | 26.099 (25.444–27.122) |

O encode em pipeline inclui espera pelos frames: sobrepõe captura/codificação e **não é tempo exclusivo de CPU do encoder**. Não se somam essas colunas. O total externo inclui lançamento/encerramento do processo. Não houve medição isolada de encoder nesta entrega; as amostras não permitem atribuir cada milissegundo a GPU ou CPU. [Dados 720p](../out/articulated/revisions/a17b0c286aa6/720p/benchmark.json), [três repetições 1080p](../out/articulated/revisions/a17b0c286aa6/1080p/benchmark.json).

Render final observado: 24 draw calls e 7.070 triângulos incluindo o passe de sombra; 12 geometrias e 13 texturas internas antes do descarte. Zero mapas no GLB; as texturas incluem bones/morphs e alvos de sombra. Heap JS amostrado no QA (não pico/RAM/VRAM): qa/hardware 6068120 bytes; qa/swiftshader 6304128 bytes; qa-1080p/hardware 6137956 bytes; qa-1080p/swiftshader 6382936 bytes. O descarte chegou a zero geometrias e uma textura interna residual após preview, com renderer/contexto encerrados. [Métricas e inventário do fechamento](../out/articulated/revisions/a17b0c286aa6/completion.json).

Inspeção efetiva: quatro folhas de MP4 em 720p e quatro em 1080p, recortes A/B de expressões nos dois backends/resoluções, detalhes nativos B de ambos os MP4s 1080p e tiras/recortes registrados no [ledger](../out/articulated/revisions/a17b0c286aa6/visual-review.json). As folhas são amostradas: não houve reprodução humana em tempo real nem revisão nativa individual dos 192 quadros de cada vídeo. A comparação editorial constata ganho de atuação/expressão de B e conserva as limitações de sombra/modelagem; não atribui equivalência à referência nem resultado estatístico.
