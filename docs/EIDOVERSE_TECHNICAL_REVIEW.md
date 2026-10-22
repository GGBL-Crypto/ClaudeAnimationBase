# ClaudeAnimationBase × Eidoverse Video — auditoria técnica e plano de evolução

Data: 22/10/2026. Escopo: pesquisa estática, comparação e planejamento. **Nenhuma implementação ou experiência foi executada.** Este relatório é o único arquivo criado nesta tarefa.

## 1. Resumo executivo e decisão recomendada

**Implementar primeiro suporte limitado a personagem GLB articulado, com clips e morph targets avaliados por tempo absoluto, no motor Three.js existente.** Começar com um personagem licenciado ou original, uma caminhada em piso plano, parada, gesto e duas expressões. A aquisição/preparação de um asset com essas capacidades é condição de entrada: um GLB estático ou uma folha de imagens não atende ao experimento.

Esse incremento tem o maior ganho narrativo novo: transforma o piloto de objetos rígidos em elenco reutilizável que pode agir e reagir. Reaproveita GLTFLoader, catálogo, sessão de assets, configuração congelada, câmera, captura, manifestos e verificação de MP4. Não requer Deno, WebGPU, Rapier, API de IA ou troca de Three.js. A implementação original deve manter o contrato `animationEngine` e a independência de cada quadro.

O Eidoverse comprova em código um repertório amplo de personagens, efeitos e ferramentas de produção. Contudo, seus controladores e parte dos efeitos dependem de estado acumulado; seu renderer principal é WebGPU nativo; seus números publicados em GPUs modernas não caracterizam a Radeon R9 200. Incorporar o pipeline inteiro reduziria compatibilidade e introduziria obrigações de licença desnecessárias.

O ClaudeAnimationBase já resolveu parte importante da infraestrutura que o relatório não recomenda reconstruir: quatro motores, captura fora de ordem, cache com identidade de revisão, assets fixados por hash, verificação integral do MP4 e revisão visual documentada. **PBR, ambiente PMREM procedural, preenchimento/recorte e ACES já estão implementados no piloto P2.** HDRI externo, personagens skinned, importadores artísticos 2D e compilador de storyboard por prompt ainda não estão.

Validar o benefício do primeiro incremento com um filme de oito segundos, dois planos e uma ação compreensível sem legenda: caminhar até um objeto, parar, perceber algo e reagir. Comparar uma versão rígida e uma articulada do mesmo personagem, com câmera/luz/tempos iguais. Exigir leitura humana melhor da ação/emoção, contatos estáveis, ausência de deformações, igualdade de PNGs em tempos fora de ordem dentro do mesmo backend e custo medido na Radeon e no SwiftShader. Reutilizar depois o mesmo pack em uma segunda micro-história sem alterar o motor. Os critérios completos estão nas seções 10 e 11.

## 2. Método, acesso e identidade das fontes

### 2.1 Cópias locais

| Item | Estado constatado |
|---|---|
| Principal | `C:\Projetos\yt\ClaudeAnimationBase`, acessível; branch `main`; HEAD `1ea2f6cf4ab8accedb58131b2d8cffb1e5730b8a`, de 21/10/2026. |
| Estado do principal | Árvore com alterações e arquivos não rastreados anteriores à auditoria, incluindo infraestrutura de assets e validação 1080p. HEAD não representa sozinho o código examinado. Essas alterações foram preservadas. |
| Referência | `C:\Projetos\yt\eidoverse-video-main`, acessível, sem `.git`; `git status` e `git branch -avv` recusam a pasta por não ser repositório Git. |
| Branch/commit locais da referência | Não recuperáveis como metadados Git. O README se identifica como edição `main`; isso é indício documental, não prova de checkout. Não é possível classificá-la como árvore Git limpa/suja. |
| Correspondência externa | Os blobs Git de 11 arquivos locais selecionados coincidem byte a byte com a árvore do `main` remoto `028e4879fb2b59c97532ef15719b527f2bc3b45d`. É identificação da amostra, não certificação de toda a pasta ou de seu histórico. |
| Branch `auto` | Ausente como checkout/branch local. O GitHub informa `99e031b32f6bba954fd9135bff6faa24f6c2da8d`. Sua arquitetura é descrita no README local; seu runner não foi auditado. |

A consulta complementar ao GitHub foi limitada a branches, últimos commits, árvore de blobs para identificar a cópia e issues. O `main` consultado aponta para um commit de 19/10/2026: ajuste do raio padrão de N8AO para 0,3 m. Os dois commits anteriores tratam do denoise neural e de normais de sombreamento. Esses ajustes estão presentes no renderer local comparado; não há evidência de atualização posterior no HEAD consultado. [Branches](https://api.github.com/repos/SkyeShark/eidoverse-video/branches), [commit identificado](https://github.com/SkyeShark/eidoverse-video/commit/028e4879fb2b59c97532ef15719b527f2bc3b45d).

| Arquivo Eidoverse comparado | SHA-256 local |
|---|---|
| `README.md` | `b07b7289b272b474cb690fd1f20da4dfeff1d490093cd2ba6b47ab04b3e8ed3b` |
| `deno.json` | `9601cdf57569ea1b6b33feb9b8d9ff4ba2c4c93369ac8353f93ed15c06bcb464` |
| `eidoverse/render_scene.mjs` | `415fe395109aa8c6658c5021bff31d4f5167412294b8108336ae8d87d34871b1` |
| `eidoverse/character_controller.js` | `7265b653a9dc431ffc1cd93b5b41b4e79942769f62764c10163ffec4dfb064e7` |
| `eidoverse/foot_ik.js` | `f06e975fd3f5d7dde3515878533f37026457b22776de0d77c9b4bba43fd970fe` |
| `eidoverse/scene_placement.js` | `0e24098dd746d33150470481805e3eff32b0165025f88bdfd17ddf12c5649cd5` |
| `eidoverse/camera_safety.js` | `c5ebd4d6307e6094939c984ccaeab44bc190242beca6365fceb4d172ade707c3` |
| `fetch_model.py` | `37563bdb581174b82daaab0e1d80c2c453e616b592f98b4dcb3f663fc5c39cb1` |
| `fetch_hdri.py` | `3c8fb1741a6e317a3dac98dccc36ab94d60c57572212509a4f3f8bb1b917d047` |
| `fetch_texture.py` | `a3db5098dc1667ecc54a289be95120f012a6e8feefc4d51f14348fd44f948357` |
| `LICENSE` | `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0` |

### 2.2 Evidência e limites

Foram consultados primeiro os documentos obrigatórios do principal: `AGENTS.md`, `ARCHITECTURE.md`, `docs/ART_ASSETS_PLAN.md`, `docs/ASSET_1080_VALIDATION.md`, `docs/PROMPT_TO_STORYBOARD_PLAN.md` e `docs/COMPONENTS_3D.md`; também `ANIMATION_GUIDE.md`, `src/config.js` e o guia 3D. As passagens históricas desses planos foram confrontadas com a implementação atual. Por exemplo, a seção antiga do plano de assets descreve ausência de importação GLB, mas a seção 16 e o código atual já a implementam.

No Eidoverse, a navegação partiu de README, mapa do engine, índice de ferramentas e guias de personagens, cenas, câmera, assets, áudio e revisão. Foram pesquisados símbolos antes de abrir trechos dos módulos grandes. Seu `AGENTS.md` foi tratado como documentação do workflow de referência, sem autoridade sobre este projeto. Não foram instaladas dependências, executados scripts de terceiros, baixados modelos ou indexados diretórios binários pesados.

“Implementado” neste relatório significa que há um caminho de código identificado. **Não significa que o Eidoverse foi executado ou que todas as combinações de seus recursos foram validadas.** Resultados anteriores do ClaudeAnimationBase são atribuídos à documentação existente; não são testes novos desta auditoria. Não foram executados `npm test`, testes visuais ou renders porque o escopo específico autoriza exclusivamente análise e um documento. Os comandos de teste abaixo são critérios para futuras implementações.

Foram abertas duas evidências já existentes: [comparativo P0/P1/P2 hardware](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/hardware-p0-p1-p2.png) e [detalhes nativos hardware](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/hardware-native-details.png). P1 apresenta grandes faces escuras; P2 recupera a leitura de volumes e cores; permanecem facetas simples e bordas de sombra perceptíveis. Isso sustenta priorizar atuação e melhor arte, sem atribuir ao piloto qualidade cinematográfica já alcançada. Esta inspeção de imagens existentes não revalida os seis MP4s nem substitui a revisão registrada na entrega anterior.

Convenção de referências: **C:** caminho relativo ao ClaudeAnimationBase; **E:** caminho relativo ao Eidoverse local. Números de linha identificam a cópia consultada. O índice da seção 13 associa as conclusões aos arquivos e símbolos.

## 3. A — Comparação das arquiteturas

| Eixo | ClaudeAnimationBase atual | Eidoverse local | Consequência |
|---|---|---|---|
| Execução | Node, Chrome/Puppeteer; Canvas2D/p5 e Three.js WebGL2. | Python como runner; Deno com WebGPU nativo, shims de DOM/canvas e FFmpeg. | Manter nosso transporte e renderer. |
| Three.js | `0.186.1`, fixado no pacote e presente na instalação. | `0.184.0` em `deno.json`; three-vrm/VRMA `3.5.2`, Rapier `0.14.0` nos imports/lock. | Nosso Three não é mais antigo; diferenças são integração e arte. |
| Extensão | Contrato `init/render/canvas/worldToScreen/info`, motores por estilo, componentes separados de histórias. | `setup()` e `renderFrame(t, frameIndex)`, helpers injetados por `eval`, ESM e vários registros globais de atualização. | Reutilizar conceitos, preservando nossas fronteiras. |
| Projeto | Registro validado, storyboard temporal, compatibilidade por estilo e configuração congelada. | JSON de renderer, assets e caminho de script; JS da cena com amplo acesso ao runtime. | JSON de configuração não equivale a compilador seguro de histórias. |
| Modelos | Sessão preparada antes do init; GLB/glTF estático e materiais preservados. | GLB com clips, clonagem de esqueleto, VRM/VRMA, vestuário e controladores. | Principal lacuna narrativa aproveitável. |
| Tempo | `render(t)` completo; poses atribuídas por tempo, testadas fora de ordem. | Loop `t=i/fps`, mas também `mixer.update(dt)`, `vrm.update(dt)`, Rapier, suavizações e simulações. | Tempo nominal fixo não garante seek independente. |
| Paralelismo | CLI captura sequências com workers e valida identidade do cache. | Loop principal serial e pipe; guia recomenda um render sustentado por GPU. | Não transferir controladores incrementais para workers arbitrários. |
| Captura/retomada | PNG/JPEG, storyboard, tiras, crops, stills, frames e encode separado; manifestos impedem misturas. | Pipe de BGRA; `--at` normalmente reexecuta desde zero, `--jump` apenas para cenas puras. | Não foi encontrado equivalente de retomada de frames com manifesto no caminho principal examinado. |
| Falhas/entrega | Arquivo provisório, FFprobe, contagem, decode integral, hashes e evidência; revisão visual pendente até inspeção. | `.part`/`.prev`, espera por encoder, extrai probes e grava auditorias; algumas falhas de helpers/updates são capturadas e o fluxo continua. | Preservar nossas garantias; registrar explicitamente recursos que falharam. |
| QA | Testes de contrato, determinismo, regressões, contatos específicos dos pilotos, revisão visual e MP4. | Auditores reutilizáveis de cena, suporte, interpenetração, atuação, câmera e ledger. | Acrescentar diagnósticos geométricos gerais sem substituir revisão artística. |
| Assets | Pins ID/versão/hash; origem, evidências e limite de recursos; um pack publicado no índice atual. | Biblioteca artística maior, descoberta multifuente, previews, caches e sidecars de licença. | A vantagem do Eidoverse é variedade/descoberta; nosso catálogo controla melhor a admissão reproduzível. |
| Memória | Sessões e ownership explícitos; descarte idempotente; limites de bytes, texturas e geometria. | Buffers de readback duplos, assets, registros de mixers/sims; maior dependência de término do processo. | Não prometer render residente contínuo sem teste de ciclo de vida. |
| Autoria | Codex converte brief em código de cena; compilação JSON está planejada. | Agente escreve scripts, consulta guias, renderiza e revê; `main` é interativo. | Nenhum dos dois comprova geração universal de histórias sem intervenção. |

Fluxo que deve ser preservado e ampliado:

```text
brief → storyboard revisado → projeto/capacidades validados
      → pins de assets → sessão preparada → motor do estilo → render(t)
      → evidências/diagnósticos → MP4 verificado → revisão humana
```

### Determinismo: diferença estrutural decisiva

Em E:`render_scene.mjs:96`, a própria captura distingue replay desde zero de `capture.jump`; no loop, os mixers de modelos avançam por delta (`2702`), assim como os mixers/VRMs registrados (`2739`). E:`character_controller.js:980` chama `world.step()`; E:`foot_ik.js` suaviza usando o estado anterior; `makeSuitMouth` também guarda abertura, visema e tempo anteriores. E:`particles.js:50–102` usa `Math.random()` na preparação dos atributos. Mesmo partículas com movimento analítico não serão iguais entre processos sem sementes estáveis.

Não seria suficiente trocar `update(dt)` por `setTime(t)` em todo lugar. Física, spring bones, transições de ações, flags de término, foot locking e suavizações têm semânticas próprias. Nossa rota recomendada é clips e curvas absolutos, com estado completo reaplicado. Simulações complexas, se justificadas futuramente, devem ser pré-calculadas em trilhas versionadas e consultadas por tempo. Replay de zero para cada quadro preservaria parte da ordem, mas aumentaria o custo e prejudicaria a captura paralela.

### Desempenho, memória e recuperação

O Eidoverse melhora throughput ao sobrepor readback com render: `render_common.mjs:465` aloca dois buffers GPU de staging e dois arrays CPU. Em 1080p, quatro buffers RGBA/BGRA desse tamanho representam aproximadamente 31,6 MiB, antes de depth, sombras, pós, modelos e texturas. Isso é uma conta de buffers, não medição de RAM. O carregamento ativo de assets em `render_scene.mjs:197` usa `Uint8Array`; seria incorreto atribuir a ele o base64 obrigatório do helper legado `loadAssets` em `render_common.mjs`. A biblioteca de VRMA ainda tem conversões base64.

`shutdown` em E:`render_common.mjs:805` destrói o alias `stageBuf` e desconfigura o contexto; a inicialização também cria `stageBufs[1]`. A leitura não demonstra uma liberação simétrica completa de todos os recursos de uma sessão residente. É uma limitação a verificar, não vazamento medido nesta auditoria. O processo curto pode recuperar recursos ao sair; um serviço com várias tarefas no mesmo processo precisaria de testes próprios.

O encoder do Eidoverse não é exclusivamente NVIDIA: `setupRenderer` testa NVENC e usa `libx264` se indisponível. Isso resolve codificação, não compatibilidade WebGPU da Radeon. A promoção do `.part` depende de saída limpa do FFmpeg; a extração de três probes não corresponde à contagem e decodificação integral já exigidas no ClaudeAnimationBase.

### `main` e `auto`

O `main` local tem `eido.py`, execução nativa e colaboração por conversa. `docs/HARNESS_MODE.md` orienta probes e uma renderização sustentada por vez. O README descreve `auto` como Docker + runner que recebe um brief e devolve MP4, com engine montado em leitura. A existência da branch foi confirmada remotamente, mas seu isolamento, filas, retomada, custos e qualidade final permanecem **não comprovados nesta auditoria**, pois o código dela não está disponível localmente. Não há recomendação de adotá-la.

## 4. B — Mapa de funcionalidades verificadas

Classificação: **Já implementada** = capacidade concreta no ClaudeAnimationBase; **Eidoverse/ausente** = implementação identificada no Eidoverse e não integrada aqui; **Parcial** = há uma parte útil, com lacuna explícita; **Incompatível** = caminho específico conflita com runtime, contrato ou restrição; **Não comprovada** = não há evidência suficiente. Uma biblioteca oferecer uma API não torna a capacidade implementada na plataforma.

| Capacidade | Classificação | Evidência e limite |
|---|---|---|
| Quatro motores e isolamento por estilo | Já implementada | C:`platform.js`, registros em `src/styles`, runtime e documentação de validação. |
| Timeline, storyboard e revisão por tempos | Já implementada | C:`platform.js:13`, `timeline.js`, `runtime.js:12`; não é compilador de linguagem natural. |
| GLB/glTF estático local | Já implementada | C:`assets/format.js`, `lowpoly-3d/assets.js`; preserva materiais e restringe recursos. |
| PBR importado, PMREM de sala, ACES | Já implementada | C:`lowpoly-3d/engine.js:18–43`, `quality-space.js`; opt-in P1/P2. |
| Metadados de origem, licença, geração e hashes | Já implementada | C:`asset-catalog.mjs:10`; verifica presença/coerência, não decide direitos automaticamente. |
| SkinnedMesh, skeleton e clips importados | Eidoverse/ausente | E:`playModelAnimations`, `cloneModel`; C:`gltfInfo` rejeita `skins/animations`. Nosso robô de grupos não é importador skinned. |
| VRM e retargeting de VRMA | Eidoverse/ausente | E:`render_scene.mjs:1237–1288`; dependência Pixiv e plugin de loader. |
| Locomoção procedural de atores atuais | Parcial | C:`components/actors.js`, cenas de Marte/Oceano; falta controlador geral de personagens importados. |
| Caminhada/corrida/salto com obstáculos | Eidoverse/ausente | E:`loadStandardAnimations`, `locomote`, `jump`, `vault`, `climbLadder`; estados incrementais. |
| Foot IK e alinhamento ao terreno | Eidoverse/ausente | E:`VRMFootControllerIK`, casts Rapier e solução de dois ossos; não validado na máquina. |
| Expressões atuais 2D/robô | Já implementada | Atuação procedural específica; não implica morph facial importado. |
| Morph targets/visemas de personagem externo | Eidoverse/ausente | E:`claudesona_face.js`, expression manager VRM; C rejeita targets. |
| Lip-sync a partir de áudio | Eidoverse/ausente | E:`lipsync.py:get_viseme_timeline`; heurística espectral, não transcrição fonética precisa. |
| Elenco reutilizável entre histórias | Parcial | Componentes e pins já existem; falta pack com rig, clips, expressões e convenções verificadas. |
| HDRI externo versionado | Eidoverse/ausente | E:`fetch_hdri.py` + loaders/PMREM; catálogo C não admite `.hdr/.exr`. |
| Sombras e câmera perspective/ortho | Já implementada | C:`engine.js`; shadow map de 512/1024, frustum fixo; sem auditor geral de câmera. |
| Bloom/AO/SSR/DoF | Eidoverse/ausente | Há stack TSL e efeito `focus_blur`; custo e qualidade local não medidos. Em C não há stack integrada. |
| NodeMaterials/TSL | Parcial na dependência, ausente na plataforma | Three 0.186.1 contém `setNodesHandler`; C não o configura nem serve toda a closure necessária. |
| Pipeline Deno/WebGPU do Eidoverse | Incompatível como integração direta | Exige outro runtime/device; não é addon para nosso renderer. Migração está vedada. |
| Terreno, vegetação e atmosfera | Parcial | C tem chão/rochas/algas/névoa/bolhas; E tem heightfield, instancing, céu volumétrico e clima. |
| Fluido/tecido incremental GPU | Incompatível com o contrato atual | E:`cloth_sim.js:408` usa compute/estado; precisaria bake ou novo projeto de simulação. |
| Descoberta multifuente e previews de assets | Eidoverse/ausente | `fetch_model.py`; aqui há admissão manual, não mecanismo de busca. |
| Imagem gerada → personagem automaticamente animável | Não comprovada | Nenhum caminho examinado elimina preparação 2D, modelagem, rig ou inspeção. |
| Adaptadores PNG em camadas/SVG/atlas externos | Ausentes; planejados em C | `ART_ASSETS_PLAN.md` §§15–16; não confundir admissão de imagem com uso pelos três motores 2D. |
| QA geral de clipping, hovering e enquadramento | Parcial | Testes específicos de C; ferramentas reutilizáveis em E:`scene_placement`, `camera_safety`, `audit_core`. |
| Entendimento automático de qualidade artística | Não comprovada | Auditores geométricos e sinais não leem intenção narrativa nem substituem inspeção do filme. |
| Mux de trilha externa em MP4 | Já implementada | C:`render.mjs:78`, com AAC, intervalo e padding; seis pilotos 1080p foram entregues sem áudio. |
| Narração, mix multifaixa, legendas temporizadas | Parcial/planejada em C | E oferece ferramentas e exemplos; nosso mux não constitui essas etapas. |
| Motion graphics como quinto motor | Não implementada em C | E tem overlays/texto/telas; são ferramentas da cena, não equivalência aos quatro estilos de C. |
| Retomada por cache e captura paralela independente | Já implementada em C | `render.mjs:145` e testes; equivalente genérico não comprovado no Eidoverse examinado. |
| Produção/publicação autônoma no YouTube | Não comprovada | Guias de agentes e branches não demonstram produto completo nem uploader validado. |

## 5. Personagens 3D, atuação e expressões

### O que o Eidoverse efetivamente faz

O loader registra `VRMLoaderPlugin` e obtém `gltf.userData.vrm`; o exemplo `basic_vrm.js:40` usa esse caminho. No renderer, o plugin MToon é configurado com `MToonNodeMaterial` para WebGPU. VRMA entra por `VRMAnimationLoaderPlugin`, vira um clip compatível com o humanoide por `createVRMAnimationClip` e é associado a um mixer. Há registro por VRM para múltiplos personagens; não se limita a uma variável global de mixer.

Para GLB genérico, `playModelAnimations` escolhe um clip e registra avanço automático. O padrão usa o primeiro para evitar sobreposição indevida de animações. `cloneModel` delega a `SkeletonUtils.clone`, evitando que duas cópias compartilhem indevidamente o mesmo esqueleto. Isso pressupõe rig e pesos já preparados; **o runtime não cria um rig correto a partir de uma malha arbitrária**.

`VRMCharacterController` usa corpo cinemático Rapier, move-and-slide, detecção de chão, velocidade observada, estados de ação e seleção de clips. `loadStandardAnimations`, `attachLocomotion`, `locomote`, `setRunning`, `jump`, `vault`, `climbLedge` e `climbLadder` têm implementações. `obstacle_course.js` exercita essas entradas em uma cena, mas não foi executado. A amplitude de movimentos não equivale a cobertura de regressão de todos os rigs/terrenos.

`VRMFootControllerIK` combina raio/esfera, normal da superfície, alvos de sola/ponta e IK de dois ossos, com suavização entre frames. O controlador principal não modela colisores físicos de todos os membros; comentários iniciais ainda tratam ragdoll por membro como futuro. Contato visual e colisão de corpo são problemas distintos.

Expressões VRM e morph targets são reais, mas parte do acabamento é específica do personagem. `claudesona_face.js` identifica malhas/materiais, projeta placas faciais e cria alvos de boca adequados àquele modelo. `installSuitMouth` reaplica pesos antes de renderizar; `makeSuitMouth` suaviza com estado. Isso não é um sistema facial universal transportável para qualquer GLB.

### Equivalente adequado ao nosso Three.js

1. **Primeiro GLB com rig e clips próprios**, usando GLTFLoader e AnimationMixer já instalados. Admitir explicitamente bones, inverse bind matrices, atributos JOINTS/WEIGHTS, tracks e morphs dentro de limites. Manter o perfil estático atual separado e válido.
2. Um mixer por instância, mapa de clips por nome validado e skeleton independente. Referências de asset continuam imutáveis; mixers/ações pertencem à sessão mutável.
3. Curva de deslocamento do root separada do ciclo de caminhada. Selecionar clips in-place ou documentar a remoção de root motion na preparação do pack. Aplicar root motion duas vezes causa deslizamento/velocidade incorreta.
4. Avaliar o tempo local, o peso de cada ação, loops, poses-base e expressão em todos os seeks. `AnimationMixer.setTime` existe, mas não restaura sozinho ações desabilitadas, fades ou spring bones. Validar regressões em início/fim/retorno antes de oferecer transições genéricas. [API do mixer](https://threejs.org/docs/pages/AnimationMixer.html).
5. Uma caminhada plana pode usar clips preparados e anchors de sola. Depois, IK original de dois ossos com Raycaster sobre superfícies registradas, sem Rapier no primeiro incremento. Apoios devem ser função de fase/tempo; não guardar “último pé” como estado obrigatório.
6. Expressões por nomes semânticos mapeados a morph targets reais, com amplitude permitida e neutralização de todos os pesos não usados. Contemplar prioridade entre piscar, emoção e boca. Não anunciar fala se o asset só tem sorriso.
7. **VRM/VRMA fica como etapa posterior opcional** quando padronização de humanoides/retargeting justificar a dependência `@pixiv/three-vrm`. A biblioteca upstream é MIT e oferece caminho WebGL; não depende de copiar o wrapper AGPL. Testar a versão escolhida com Three 0.186.1, MToon e constraints. Desligar spring bones ou pré-calcular sua atuação para manter seek absoluto. [Documentação upstream](https://github.com/pixiv/three-vrm).

O custo de preparar um personagem recorrente é principalmente artístico: topologia nas juntas, pesos, olhos/boca, proporções e clips coerentes. Reutilização exige ID de personagem, versão de rig, escala, orientação, pivôs, mapa de expressões, nomes de ações e turntable aprovado. Trocar silenciosamente o modelo ou seu rig entre episódios destrói a continuidade mesmo que os arquivos carreguem.

## 6. Qualidade cinematográfica e limites WebGL2/WebGPU

### Recursos presentes e caminho de aproveitamento

| Técnica | Evidência Eidoverse | Caminho original em C / viabilidade |
|---|---|---|
| PBR e materiais procedurais | `procedural_materials.js` gera mapas via canvas/CPU e constrói Standard/Physical; outros módulos usam NodeMaterial. | Mapas pequenos preparados uma vez são viáveis em WebGL2. Não copiar geradores. Preservar color space, UV e dados de roughness/metalness. |
| HDRI/IBL | `fetch_hdri.py`, receita de HDR/PMREM e ambiente no renderer. | Primeiro usar PMREM de sala já existente; HDR externo exige novo formato admitido e orçamento. |
| Sombras | Luzes e integração com renderer; guia alerta para artefatos específicos de MToon/SpotLight. | Ajustar frustum, posição e bias por cena; comparar 512/1024, já admitidos. Aumentar resolução de saída não melhora shadow map fixo. |
| AO/SSR/bloom/FXAA | `render_scene.mjs:1967–2585`, N8AO vendorizado e nós Three. | Implementações WebGL próprias/upstream existem para várias dessas técnicas, mas não são prioridade nem transferência direta da stack TSL. |
| Foco/DoF | `effects_tsl/focus_blur.js` e registro de efeitos. | Primeiro composição por distância, FOV, escala e contraste; desfoque pode apagar olhos/mãos. Futuro ensaio isolado, sem história temporal. |
| Câmera | `focusPoint`, `lookAtObject`, `CameraSafety`; controle de posição/FOV e auditoria de oscilações. | Reusar `cameraMove`, `cameraPose`, `worldToScreen`; acrescentar anchors semânticos e QA. “Cinematográfica” depende de blocking e timing. |
| Terrenos | `terrain.js:63` oferece `heightAt`, mesh preparado e mistura de materiais. | Pequeno heightfield com função de altura compartilhada entre chão/contato; malha e texturas dentro do orçamento. |
| Vegetação | `vegetation.js:createFlora`, atributos instanciados, mapas e vento. | Poucas instâncias ou geometria compartilhada, vento analítico com sementes. Medir overdraw e atualizar contadores de instâncias se adotadas. |
| Atmosfera | `sky_system.js`, nuvens volumétricas e ambiente; `weather_system.js`. | Névoa e planos simples já cobrem profundidade barata. Céu volumétrico não recomendado para este hardware. |
| Partículas | `particles.js:makeParticles`, sprites instanciados e `positionNode`. | Pequeno conjunto com seed e fórmula de posição por tempo; CPU/Points ou shader WebGL original. Evitar transparência em muitas camadas. |
| Tecido/fluido | `cloth_sim.js` executa compute iterativo; outros módulos de fluidos são separados. | Adiar. Alternativa visual: clips, malhas deformadas analiticamente ou simulação pré-calculada. |

O README resume “GPU compute e node materials throughout”, mas o código contém geração de texturas na CPU, leitura de assets, IK e lógica de controle na CPU. A afirmação não deve ser interpretada como ausência de custo CPU. Da mesma forma, `procedural_materials.js:createPaintedMetal` retorna `MeshPhysicalMaterial`; não é correto classificar todos os geradores como exclusivamente TSL.

### A distinção que evita uma migração equivocada

WebGL2 consegue PBR, skinning, morphs, HDR/PMREM, shadow maps e vários efeitos de pós-processamento. O renderer Deno do Eidoverse, contudo, solicita adapter/device WebGPU, usa compute, MRT e readback nativo; seu código declara o caminho principal WebGPU-only. O fallback WebGL2 oferecido por `WebGPURenderer` no navegador não torna esse harness Deno executável sobre nosso `WebGLRenderer`. [Renderer WebGPU oficial](https://threejs.org/docs/pages/WebGPURenderer.html).

Há uma nuance da versão instalada: C:`node_modules/three/src/renderers/WebGLRenderer.js:1075` tem `setNodesHandler`; `:747` tem `setEffects`, que exige output buffer HalfFloat/Float. Isso permite investigar compatibilidade limitada de nodes sem afirmar que TSL é universalmente impossível em WebGL2. Nosso engine não usa essas entradas, e a presença delas não comprova suporte à cadeia N8AO/SSR/compute do Eidoverse. Não ativá-las nesta evolução inicial. [Documentação do WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer).

Recomendação artística: avançar sobre P2 com material/iluminação que revelem o personagem e cenários com profundidade. Não tentar compensar anatomia, pesos ruins ou encenação ilegível com bloom, AO ou mais polígonos. Manter detalhes relevantes visíveis na escala real de publicação e nos recortes de rosto/contato.

## 7. Assets, catálogo e geração de imagens

### 7.1 Fetchers: o que aproveitar como técnica

| Ferramenta | Implementação identificada | Limites relevantes |
|---|---|---|
| `fetch_model.py` | `_FIND_FUNCS` consulta local, Poly Haven, NIH 3D, NASA e Smithsonian em paralelo; normaliza relevância; `_measure_glb` inspeciona dimensões; gera previews; `_write_license_sidecar` registra origem. | Ranking temático pode chamar embeddings externos; sem serviço funciona por relevância. `random.choices` seleciona entre candidatos próximos: a consulta não fixa identidade. |
| Cache de modelos | `--cache` resolve ID exato Poly Haven e usa `assets/cache/models/<id>_<res>`; reutiliza arquivo `*_embedded.gltf`. | Existência de arquivo não equivale a validação de hash/licença/capacidades. A via cache desliga preview durante aquisição. |
| `fetch_hdri.py` | Busca Poly Haven/AmbientCG; escolhe HDR/EXR; converte EXR por FFmpeg/NumPy; verifica assinatura Radiance antes de salvar `.hdr`. | Downloads e ZIPs exigem limites próprios. Não há contrato equivalente ao nosso pack imutável só por gerar `hdri.hdr`. |
| `fetch_texture.py` | Poly Haven/AmbientCG/TextureCan; mapas PBR, `tex_urls.json`, cache por ID/resolução e `license.json`. | `_cache_hit` testa presença do índice, não integridade de cada mapa. Sem cache, parte da entrega pode ser URL. |

Não copiar os scripts. A melhoria útil seria um **catálogo pesquisável de candidatos**, separado da admissão: buscar por tags/nome e capacidades locais; apresentar thumbnail, licença e custo; selecionar explicitamente um ID; então usar a infraestrutura existente para publicar uma versão fixada. Busca por tags e sinônimos locais atende à primeira versão sem embeddings pagos ou modelo pesado.

Downloads devem ocorrer na preparação, nunca durante `render(t)`. Capturar URL, autor, licença e prova; conferir assinaturas, bytes, resolução, fechamento de dependências e capacidades; gerar thumbnails apenas por nosso pipeline, depois da admissão. Não converter sidecar com `unknown/unverified` em `license.commercial:true`. O próprio fetcher reconhece incerteza em itens NIH/Smithsonian. NASA/Smithsonian não são autorização universal para todo item, logotipo, pessoa retratada ou marca.

O catálogo atual já separa prova de licença de arquivos públicos, verifica SHA-256 e põe teto por arquivo, pack e sessão. Em C:`src/assets/format.js`: 16 MiB por arquivo, 32 MiB total, estimativa de 64 MiB decodificados, dimensão máxima 2048, 64 arquivos e 30 mil triângulos no importador. O engine mantém 64 meshes e 10 mil triângulos no perfil legado, até 30 mil no perfil de assets. Não eliminar esses limites para aceitar qualquer modelo encontrado.

### 7.2 Nano Banana e outras fontes raster

Nano Banana é uma família de geração/edição de imagens; sua documentação não constitui promessa de produzir rigs, SVG articulado ou malhas skinned. Usá-la, quando o usuário já tiver acesso apropriado, para conceitos, vistas, expressões e referências. O pipeline recomendado aceita arquivos recebidos manualmente e **não depende de API, plano pago ou cota gratuita garantida**. [Documentação oficial de imagem](https://ai.google.dev/gemini-api/docs/image-generation).

| Destino | Transformação necessária | Validação antes de anunciar suporte |
|---|---|---|
| Aquarela 2D | Selecionar identidade; separar partes/planos; máscara e alpha reais; reconstruir regiões escondidas; definir pivôs, parentesco e sobreposição; integrar composição ao motor. | Juntas em extremos sem buracos, papel/tinta compatíveis, escala e olhos alinhados. O adaptador externo ainda é planejado. |
| Cartoon vetorial | Redesenhar curvas e grupos em vetor, ou adotar explicitamente perfil raster ilustrado. Uma imagem “com aparência vetorial” continua bitmap. | SVG com subconjunto seguro, sem código/URLs; pivôs e curvas revisados. Raster não deve ser anunciado como vetor editável. |
| Pixel art | Redesenhar/limpar clusters, fixar grade/paleta, alinhar frames, separar atlas/metadata e declarar duração de cada pose. | Dimensões exatas, alpha apropriado, sem bleed, escala inteira e suavização desligada; respeitar o quantizador atual ou criar perfil explícito. |
| 3D | Model sheet consistente → modelagem/retopologia → UV/material → esqueleto/pesos → clips/shape keys → exportação GLB e QA. | Silhueta em vários ângulos, deformação de juntas, sola, bounds animados, morphs e materiais reais. Modelagem com ferramenta livre é alternativa; geração imagem→3D não é pressuposto. |

Uma imagem frontal em plano ou billboard é um asset 2,5D possível, mas não permite rotações amplas, contato volumétrico ou atuação tridimensional equivalente. Uma folha de expressões exige recortes e alinhamento explícitos; uma folha de poses pode apresentar dedos, roupas e proporções divergentes. Não inferir grade uniforme, alpha útil ou identidade consistente.

Para personagem recorrente, congelar uma bíblia com proporções, silhueta, paleta, traje e rosto; manter originais imutáveis; registrar provedor/modelo, prompt, parâmetros conhecidos, referências e direitos, data, job/seed quando disponíveis e hashes dos derivados. Não inventar seed ou versão ausentes. Usar `origin.generation` e provas já previstos em `validateManifest`; acrescentar metadados técnicos apenas quando o adaptador correspondente existir. Geração por IA não equivale a CC0 nem garante exclusividade autoral.

## 8. Inspeção automática, contatos e qualidade técnica

E:`scene_placement.js` oferece duas famílias: helpers de colocação e verificadores. `placeOn`, `snapToGround`, `surfacePoint` e `placeTouching` usam geometria, bounds e raios para situar peças. Os checks distinguem raízes de objetos colocados para não separar partes de um mesmo modelo. `checkClipping` começa por AABBs e possui tratamento de interpenetração; `checkHovering` amostra a base e superfícies de suporte; há verificações de z-fighting, facing, densidade e intrusão em linhas.

No código atual do renderer, a correção automática é **opt-in**, antes das auditorias; o caminho normal em `render_scene.mjs:1526` usa `autoFix:false`. Isso prevalece sobre descrições resumidas de “audits with auto-fix”. A estratégia interessante para nós é medir e reportar, deixando a coreografia responsável pela correção.

`CameraSafety.checkPath` usa raios alvo→câmera, avalia keyframes e cinco amostras intermediárias por segmento por padrão; tenta sugestões numa esfera. `exclude` permite remover sujeito, chão ou transparências da lista. `safePosition` pode ajustar uma posição, mas pode também alterar a composição. O checker não certifica volume inteiro da câmera, todos os pixels, o near plane ou uma interpolação diferente da que ele amostrou. A auditoria temporal do renderer conta inversões de deslocamento/FOV; não detecta colisão geométrica da câmera.

`audit_core.js:createLedger` distingue `PASS/WARN/SKIPPED` e exceções declaradas. `isClean` não considera limpo um check de correção omitido. Inventário e declarações registram cobertura; o renderer compara parte dessas informações no fechamento. Essa semântica é mais valiosa que copiar seus algoritmos ou inúmeros flags globais.

### Incremento leve recomendado

| Check original proposto | Dados necessários | Valor / limite |
|---|---|---|
| Sujeito fora da tela ou pequeno demais | Anchor de cabeça/corpo, câmera e limites por plano | Detecta alvo perdido; tamanho permitido depende da intenção do plano. |
| Oclusão relevante | Raios a cabeça/peito/mãos e lista de obstáculos | Vários anchors reduzem falsos negativos; não medem visibilidade exata de toda a silhueta. |
| Pé flutuando/penetrando | Anchors de sola, fase de apoio e superfície declarada | Só exigir contato em apoio. Salto, submarino e veículo pairando são intenções válidas. |
| Pé deslizando | Posição de sola em coordenadas do suporte durante apoio | Calcular diferenças entre amostras independentes e ordená-las no relatório; não tornar o renderer incremental. |
| Interpenetração entre atores/props | Bounds ou proxies semânticos por entidade | AABB é triagem; confirmar suspeitas em imagem/raios. Não testar peças do próprio rig como corpos independentes. |
| Câmera dentro de geometria/near plane | Proxies, distância e amostras na região próxima | Mais fiel que apenas raio central; manter custo limitado às superfícies relevantes. |
| NaN, pose ausente, recurso não carregado | Transforms, recursos e lista de capacidades | Erro objetivo; não esconder com fallback silencioso. |
| Frame preto/estático ou flicker | Luma/variação em ROIs e cortes declarados | Heurísticas de suspeita; fade intencional, pausa e noite são controles negativos. |

Executar primeiro em tempos de storyboard, apoios/cortes e uma grade temporal curta; aumentar densidade perto de mudanças. Informar número de amostras e intervalo inspecionado. Um teste amostrado pode perder um clipping de um frame. Para cenas de poucos segundos, avaliar todos os tempos finais de contato sem capturar imagens de todos eles; gerar crops nos achados.

O relatório futuro deve conter revisão, projeto, estilo, backend, tempo, ator, medida, limiar, resultado e imagem associada. Faltou anchor ou superfície? Marcar “não avaliado”, nunca “passou”. Exceções precisam de ator/intervalo/motivo. Nenhum diagnóstico automático deve marcar `visualReview` como realizada.

## 9. Áudio, produção audiovisual e hardware

### 9.1 Áudio e montagem

| Subsistema Eidoverse | O que há no código | Utilidade sem APIs pagas |
|---|---|---|
| Voz | Guias usam edge-tts; `voicebox/resing.py` implementa `tts_edge` e `tts_sapi`. | Priorizar gravação local ou voz Windows já disponível, avaliando português e direitos da voz. Edge depende de serviço online; não o tratar como infraestrutura offline garantida. |
| Lip-sync espectral | `lipsync.py` decodifica áudio por FFmpeg, FFT em cinco bandas e pesos `aa/ee/ih/oh/ou`. | Análise leve de trilha vocal isolada; aproximada. Música misturada pode abrir a boca indevidamente. |
| Lip-sync por fonemas | `voicebox/score.py:visemes` usa segmentos/trilhas de fonemas da própria síntese. | Mais consistente com aquela síntese; não cria fonemas verdadeiros de qualquer gravação. |
| Alinhamento | `align_lyrics.py` usa stable-whisper, padrão `medium`, segmentação e correspondência de texto. | Não necessário no primeiro fluxo: roteiro conhecido e WAVs por fala permitem tempos explícitos. Modelo local pesado é opcional posterior. |
| Síntese musical | `synthkit` possui instrumentos, sequenciador, mix, sidechain e master; `voicebox` sintetiza voz. | Conceito útil em CPU, mas código é da referência. Usar som original/CC0 ou síntese original pequena; qualidade musical e voz natural não são garantidas. |
| Geração neural de música/SFX | `generate_song.py` envia workflow MiniMax Music 3 a ComfyUI; `generate_sfx.py` usa Stable Audio. | Cliente de serviço/modelo externo, não gerador autossuficiente. Sem comprovação de viabilidade na R9/16 GB, adiar. |
| Mix/mux | `merge_av.py` compara durações, seleciona encoder e trata tolerâncias; guia separa voz, música e efeitos. | Reaproveitar nosso mux e acrescentar mix offline por timestamps; evitar corte silencioso de imagem/áudio. |
| Texto e gráficos | `makeOverlayLayer`, telas, texto 3D, Satori e exemplos de captions. | Legendas/overlays 2D simples ou etapa FFmpeg bastam; não exige novo motor nem Satori. |

O primeiro pipeline audiovisual deve produzir WAV de voz, música/efeitos separados, mix final e uma tabela de falas com início/fim. A animação lê a mesma referência temporal. Visemas podem ser pré-calculados e versionados; a suavização ocorre antes do render ou por consulta de janela fixa, nunca por histórico de reprodução. `render.mjs --audio` já inclui trilha externa e faz padding/corte pelo intervalo do vídeo; ainda faltam contrato de mix e identidade por hash dos novos insumos de áudio.

A API Windows `SpeechSynthesizer.SetOutputToWaveFile` permite saída WAV sem API remota; a existência de voz PT-BR adequada nesta instalação não foi verificada. A qualidade deve ser escutada antes de torná-la padrão. Legendas inicialmente podem ser SRT/ASS gerados da tabela e revisados, sem ASR. Validar filtros/fontes disponíveis na instalação FFmpeg apenas na etapa autorizada. [API Microsoft](https://learn.microsoft.com/en-us/dotnet/api/system.speech.synthesis.speechsynthesizer.setoutputtowavefile?view=netframework-4.8.1).

### 9.2 Compatibilidade com o computador

Base documentada em [ASSET_1080_VALIDATION.md](ASSET_1080_VALIDATION.md): Windows, Ryzen 5 3600, cerca de 15,95 GiB de RAM, Radeon R9 200 via ANGLE/D3D11 e SwiftShader. Seis filmes de dois segundos, 1920×1080, 24 FPS, 48 quadros, sem áudio. Totais anteriores P2: **6,545 s hardware e 17,521 s SwiftShader**; captura: 1,482 s e 11,478 s. Uma amostra por combinação, um modelo rígido. Não extrapolar para personagens, cenas longas ou 30 mil triângulos.

| Evolução | Radeon/WebGL2 | SwiftShader/CPU | Decisão |
|---|---|---|---|
| Um personagem GLB pequeno, bones e poucos morphs | Tecnicamente compatível; medir shaders, bounds e skinning | Viável como exportação offline candidata; não prometer tempo real | Prioridade 1, orçamento explícito. |
| QA por anchors, Box3 e poucos raios | Trabalho CPU modesto em cenas pequenas | Mesmo caminho; não precisa GPU moderna | Prioridade 2. |
| Luz/PBR/PMREM existente, mapas 512/1024 | Já há base validada; mapas aumentam custo/memória | Medir por perfil; PMREM na inicialização | Prioridade 3. |
| PNG em camadas, SVG preparado, atlas | Canvas2D/p5 existentes | Viável; aquarela tem custo próprio | Incrementos 2D separados. |
| WAV, mux, legendas, síntese simples | Não depende de GPU | CPU local | Caminho futuro de baixo custo. |
| Bloom isolado em resolução reduzida | Possível, ainda não medido | Pode custar bastante por pixel | Só com A/B que justifique. |
| AO/SSR/DoF em cadeia e transparência densa | Custo e extensões não validados | Potencialmente muito lento | Adiar. |
| WebGPU/Deno, fluidos, nuvens volumétricas | Suporte do dispositivo/driver não comprovado | Fallback WebGPU distinto do nosso fallback WebGL | Não integrar. |
| ComfyUI música/SFX, demucs, Whisper medium | Não há evidência de caminho útil para esta GPU | Modelos podem consumir muita RAM/tempo | Fora do caminho obrigatório. |

A designação “R9 200 Series” não identifica sozinha a placa exata, VRAM ou recursos D3D12/Vulkan disponíveis. Funcionamento em D3D11/WebGL2 não comprova WebGPU. `gpu_check.mjs` do Eidoverse solicita adapter e testa compute/readback, mas não foi executado. Tampouco o funcionamento do nosso SwiftShader comprova a instalação de fallback WebGPU no Deno.

Memória precisa ser avaliada por conjunto: uma textura RGBA 1024² com mipmaps custa aproximadamente 5,33 MiB; cinco custam 26,7 MiB, sem contar render targets. Em 2048², as mesmas cinco passam de 106 MiB, excedendo a estimativa admitida de 64 MiB. Arquivo JPEG pequeno não significa textura barata. Começar com 512/1024, poucas luzes/sombras e um worker; medir antes de aumentar concorrência. Heap JS observado não representa RAM total nem VRAM.

## 10. C — Cinco melhores oportunidades

Ordem recomendada considera ganho novo e risco; notas de impacto/reuso/benefício por prompts são estimativas qualitativas de 1 a 5, não benchmarks. “Custo” refere-se ao incremento dentro do escopo proposto.

| Prioridade | Oportunidade | Impacto visual / reuso / prompts | Complexidade | Dependências | Custo e compatibilidade | Manutenção/licença |
|---|---|---|---|---|---|---|
| **1** | **GLB articulado determinístico: clips + expressões** | **5 / 5 / 5** | Média-alta; preparação artística pode dominar | Three instalado; asset original/licenciado | Baixo-médio para um rig pequeno; WebGL2 e teste SwiftShader | Ownership e estado de ações exigem cuidado; implementação original, sem AGPL. |
| **2** | **Diagnósticos de câmera e contatos com evidência** | **4 / 5 / 5**; ganho indireto, reduz erros visíveis | Média, com escopo limitado | Three/CLI existentes | Baixo em poucos atores/amostras; funciona nos dois backends | Falsos positivos e cobertura precisam ser explícitos; nenhum módulo AGPL. |
| **3** | **Perfil cinematográfico leve sobre P2** | **4 / 5 / 4** | Baixa-média | Materiais/luzes/PMREM existentes; mapas licenciados opcionais | Baixo-médio; sombras/mapas devem ser medidos | Presets congelados, teste de descarte; não introduzir cadeia de pós cedo. |
| **4** | **Personagem 2D preparado, um adaptador por estilo** | **5 / 4 / 5** | Média no primeiro adaptador; alto trabalho artístico | Canvas2D/p5; imagem e direitos comprovados | Viável no hardware; aquarela requer benchmark | Alpha, pivôs, SVG seguro e paleta; não prometer conversão entre estilos. |
| **5** | **Trilha audiovisual local: voz, mix, visemas e legendas** | **4 / 4 / 5** para qualidade audiovisual | Média, divisível em etapas | FFmpeg existente; voz/gravação local | CPU; sem modelo neural obrigatório | Sincronia, licenças de voz/música e hashes; serviços online apenas opcionais. |

Busca externa de assets não entrou nas cinco primeiras porque o gargalo imediato é preparar e animar um personagem adequado; a admissão manual já funciona. Migração WebGPU e simulação física ampla ficam fora por risco, custo e conflito com captura independente. O primeiro adaptador 2D pode subir de prioridade caso a próxima produção escolhida seja 2D, mas isso não altera a recomendação técnica desta comparação para a lacuna 3D solicitada.

## 11. D — Planos das três melhores oportunidades

Todos os nomes novos abaixo são **propostas de arquivos**, não arquivos criados. Nenhuma mudança fica autorizada pela existência deste plano.

### 11.1 Personagem GLB articulado por tempo absoluto

**Arquitetura.** Estender a admissão com perfil explícito para animação; manter a sessão antes do init e acrescentar ator 3D com `apply(t, atuação)` e lifecycle próprio. O filme fornece curvas e intenções; o ator resolve clips/expressões e o engine continua desenhando. Nenhuma regra de skeleton entra em `motion.js` ou `timeline.js`.

**Incrementos internos.** Primeiro um rig com clips do mesmo asset e morphs simples. Depois duas instâncias independentes. Só então blends limitados e reutilização em segunda história. VRM, retargeting universal, Rapier, ragdoll, cabelo físico e roupas simuladas ficam posteriores.

| Arquivo potencial | Intervenção futura / reuso |
|---|---|
| `src/assets/format.js` | Perfil estático continua recusando animação; novo perfil valida skins, joints/weights, matrices, tracks, keyframes finitos/ordenados, interpolação admitida e morphs com limites. |
| `scripts/asset-catalog.mjs` | Registrar capacidades extraídas, versão de rig e clips; preservar provas/hashes e limites agregados. Declarar nome de expressão não basta: cruzar com targets reais. |
| `src/styles/lowpoly-3d/assets.js` | Conservar clips e esqueleto; clonagem segura quando necessária; ownership de Skeleton/boneTexture, geometria/material e mapas. |
| `src/styles/lowpoly-3d/components/animated-actor.js` (novo) e índice | Mixer por instância, avaliação absoluta, política de root motion, expressões e anchors. Interface pequena restrita ao primeiro personagem. |
| `src/styles/lowpoly-3d/engine.js` | Adaptar descarte de recursos novos e bounds/orçamento animado somente onde o fluxo exigir. Não criar outro renderer. |
| `scripts/studio-server.mjs` e inventário em `scripts/render-lib.mjs` | Autorizar/inventariar addons realmente usados, como SkeletonUtils; manter closure local. |
| `src/config.js`, nova cena e pack | Novo ID, bíblia congelada, mesma estrutura de storyboard e pins; sem alterar demos/P0/P1/P2. |
| `tests/assets.test.mjs`, teste de ator e harness 3D | Rejeições de dados inválidos, pose/tempo, instâncias, descarte e evidência visual. |

**Alternativas.** (a) Grupos articulados procedurais já existem: adequados a robôs simples, mas não substituem a lacuna skinned. (b) GLB com clips próprios é o menor incremento novo. (c) VRM padroniza humanoide/expressões e facilita retargeting, ao custo de dependência e spring/constraint lifecycle. (d) Bake de simulação preserva seek, mas é etapa de autoria extra.

**Orçamento inicial proposto, sujeito a medição.** Um personagem de até 10 mil triângulos, 48 bones, oito meshes e seis morph targets, até dois mapas 1024²; cena inteira dentro dos atuais 64 meshes/30 mil triângulos e 64 MiB estimados de texturas. Esses são limites do experimento, não suporte já publicado. Rejeitar compressões/extensões não admitidas e clips que dependam de recursos externos. Não aumentar orçamento global apenas para aceitar um candidato.

**Aceitação técnica.** Mesmo PNG nos tempos de teste dentro do mesmo backend, em ordem crescente/decrescente/embaralhada, nova página e retorno da prévia. Testar início, fim, loop, clamp e ação interrompida; peso facial anterior não pode reaparecer. Duas instâncias com poses distintas não se contaminam. Bounds acompanham deformação sem desaparecimento por culling. Descarte idempotente libera mixers/referências/skeletons/bitmaps; recursos compartilhados não são liberados duas vezes. Dados inválidos falham antes da renderização.

**Aceitação artística.** Caminhada avança na mesma cadência dos apoios, parada sem patinação evidente, mão/ombro/joelho sem colapso e duas expressões reconhecíveis no enquadramento final. Tiras dos apoios e recortes de rosto vistos em resolução suficiente. Aprovação do revisor humano deve ser registrada, incluindo defeitos remanescentes.

**Regressões.** `npm test`, `npm run test:visual`, testes Three/render/assets/generalização pertinentes; snapshots antigos, 36 PNGs históricos de Marte, isolamento 2D, seleção de projeto, cache incompatível, recortes e descarte. Usar novas pastas de revisão; executar testes que escrevem evidência sem sobrescrever entregas históricas.

### 11.2 Diagnósticos leves de câmera e contatos

**Arquitetura.** Módulo 3D opt-in de observação após aplicar a pose e atualizar matrizes; sem correção automática. Registro mínimo por ator de cabeça/corpo/solas, proxies e intenção de apoio. Um harness usa o mesmo `renderAt(t)` e coleta métricas; agrega resultados depois, ordenados por tempo. Inicialmente manter relatório próprio vinculado à revisão, antes de expandir o formato geral de entrega.

**Arquivos potenciais.** `src/styles/lowpoly-3d/review.js` (novo), exposição restrita de câmera/matrizes no engine se necessária, anchors nos componentes relevantes, `scripts/review-scene.mjs` (novo), teste de geometria e cena-fixture. Reusar `runtime.renderSheet`, projeção `worldToScreen`, crops, `scripts/render-lib.mjs`, `reviewTimes` e manifesto. Quando estabilizado, o render pode incluir o caminho do relatório; não misturar lógica 3D em runtime comum.

**Alternativas.** Box3 é barato para triagem; múltiplos raios validam suporte/oclusão; proxies de pé/cabeça evitam percorrer toda a malha deformada. BVH só se o profiling demonstrar gargalo. Comparação de pixels ajuda em preto/flicker, mas não substitui geometria nem exige modelo de visão local pesado.

**Aceitação.** Detectar falhas deliberadas com tempo/ator/imagem corretos; classificar o que não pode avaliar; não modificar transforms, câmera ou pixels. Exceções de voo/água e montagem interna não podem poluir o relatório como defeitos. Repetir coleta em ordem diferente produz as mesmas métricas por tempo. Metas iniciais: 100% dos casos objetivos da fixture e ao menos 90% de precisão nos casos classificados manualmente; publicar denominadores, sem extrapolar para cenas arbitrárias. Overhead de até 15% sobre o mesmo percurso de QA é uma meta de go/no-go, a medir.

**Regressões.** Não alterar PNG com QA ligado/desligado; testes de frustum perspective/ortho, mudança de escala/pai, suporte elevado, cena sem anchors, salto declarado, alvo parcialmente ocluído e objeto pairando de P2. Checar cortes com tolerância apropriada; uma mudança de plano não é oscilação de câmera.

### 11.3 Perfil cinematográfico leve sobre P2

**Arquitetura.** Perfil explícito por projeto, sobre materiais importados e ambiente já existentes. Primeiro parametrizar apenas o que o experimento demonstrar necessário: luz principal/preenchimento/recorte, área de sombra, intensidade de ambiente e exposição; eventualmente mapas PBR pequenos admitidos. Manter o renderer WebGL2 e excluir efeitos com dependência de frames anteriores.

**Arquivos potenciais.** `src/styles/lowpoly-3d/config.js` para opções validadas; `engine.js` apenas para parâmetros de sombra/ambiente que hoje estão fixos; helper de iluminação no catálogo se houver reuso real; nova configuração/cena para comparar variantes; scripts de review/benchmark já existentes. Não editar bytes do pack publicado: material derivado exige nova versão/registro.

**Reuso.** `art.environment` e RoomEnvironment/PMREM 128, ACES/exposure, importação StandardMaterial, luzes, câmera, névoa, captura de detalhes e medições do piloto. O primeiro teste pode explorar as opções existentes antes de justificar código adicional.

**Alternativas.** Ambiente procedural custa menos em dados e já funciona. HDRI oferece iluminação coerente com um ambiente real, mas exige admissão de HDR/EXR, assinatura/limite decodificado, loader e ownership específicos; adiar até o A/B revelar necessidade. AO em mapa preparado pode ajudar ambientes estáticos; não substitui contato móvel. Bloom deve ser experimento separado, em emissivos, somente se trouxer ganho de leitura.

**Aceitação.** Melhora de separação figura/fundo, leitura de material e sombra sem apagar detalhes faciais; ausência de flicker/estouro introduzido nas regiões inspecionadas. Mesma geometria/câmera/coreografia para comparações de luz; variar um fator por vez. Alvo inicial de custo: captura mediana no máximo 1,5× a baseline equivalente em cada backend; se exceder, remover a opção que não demonstrar benefício. Não usar essa meta como previsão de desempenho.

**Regressões.** Perfil legado e P0/P1/P2 intactos; preview→final restaura sombras/resolução; repetir tempo não altera ambiente; verificar color space, materiais originais, descarte e caches. `npm test` e `npm run test:visual` quando houver mudança de engine/prévia; suíte 3D e piloto pertinente em hardware/software.

## 12. E — Três experimentos propostos, não executados

### Experimento 1 — personagem articulado, movimento e expressão

**Hipótese:** animação esquelética e expressão facial aumentam a compreensão de ação/emoção e permitem reutilizar um elenco sem comprometer seek ou hardware.

- Entrada: um GLB original/licenciado com rig, walk/idle/gesto e ao menos dois morphs expressivos, normalizado e admitido; não usar personagens do Eidoverse.
- Filme: oito segundos, dois planos; caminhada/parada em plano geral e reação/gesto em plano médio. Mesmo root/câmera/luz/áudio ausente nas variantes rígida e articulada. Incluir início/fim de loop e retorno após pose extrema.
- Primeira passagem: storyboard e recortes a 720p; depois 1080p/24 FPS, 192 quadros por variante/backend, somente se os stills e movimentos passarem.
- Ensaios técnicos: tempos embaralhados, duas páginas, dois workers quando o teste de um worker passar, duas instâncias independentes, troca de preview e descarte; hash de PNG somente dentro do mesmo backend.
- Contato: marcar intervalos de apoio e medir posição da sola relativa ao chão. Metas de fixture: erro vertical até 1% da altura do personagem e deslizamento até 2% dessa altura por apoio, com tolerâncias revistas por escala/enquadramento. Inspecionar visualmente mesmo dentro da tolerância.
- Leitura humana: mostrar variantes com rótulos neutros; registrar identificação da ação/emoção e notas de 1–5 para peso, expressão e clareza. Alvo: aumento de pelo menos um ponto na mediana de expressão/clareza, sem piorar contato. Com um único revisor, tratar como decisão editorial, sem alegar resultado estatístico.
- Medição: três repetições por variante/backend, reportando mediana/faixa de init, captura, encode/verificação e total; recursos de geometria/textura, draw calls e memória de processo quando mensurável. Não usar heap como RAM total.
- Go/no-go: todos os testes de determinismo/isolamento e revisão dos momentos decisivos aprovados; custo compatível com exportação offline. Segunda micro-história usa o mesmo pack sem alteração do motor. Se o asset não tiver morphs/rig corretos, corrigir a arte antes de ampliar arquitetura.

### Experimento 2 — materiais e iluminação cinematográfica

**Hipótese:** refinamento controlado sobre P2 melhora volumes, contato e material com custo menor que uma cadeia de pós-processamento.

- Entrada: cópia lógica do mesmo piloto sob novo ID/revisão; mesmos pins, câmera, duração e coreografia. Preservar os seis vídeos anteriores.
- Variantes: A = P2 atual; B = apenas ajuste de luz/exposição; C = B com frustum/bias/sombra 1024; D opcional = mapas pequenos preparados, comparados separadamente. Não atribuir ganho de geometria à luz.
- Avaliar frames 0/24/47 e tiras ao longo dos dois segundos; detalhes de sombra, cantos, metal/pintura e eventual rosto. Conferir se materiais legíveis continuam distintos, sem simplesmente clarear toda a imagem.
- Realizar três medições por backend nas mesmas condições, com navegador novo e um render por vez; comparar captura e inicialização separadamente. Registrar resolução do ambiente e todos os render targets extras.
- Critérios: melhora editorial em material/profundidade sem ruído/shimmer novo; não perder informação em claros/escuros das ROIs relevantes; custo mediano de captura ≤1,5× A por backend como alvo inicial. Preferir a variante mais barata que atingir o ganho.
- Se um bloom posterior for testado, fazê-lo como fator isolado, sem AO/SSR/DoF simultâneos. O primeiro experimento não depende de HDRI novo ou WebGPU.

### Experimento 3 — detecção de câmera, contatos e falhas

**Hipótese:** geometria simples e amostras temporais localizam erros visíveis cedo, com poucos falsos positivos e sem infraestrutura de visão pesada.

- Criar futuramente uma fixture de seis segundos com dez defeitos conhecidos: sujeito fora de frame, alvo pequeno, rosto ocluído, câmera atravessando obstáculo, near-plane cortando sujeito, pé flutuando, pé penetrando, pé deslizando, interpenetração entre entidades e transform não finito.
- Acrescentar controles negativos: salto, objeto pairando, personagem aquático, montagem de peças, contato legítimo, pausa/fade/corte e oclusão deliberada. Cada exceção tem ator e intervalo.
- Declarar verdade de referência com início/fim e severidade. Amostrar tempos críticos e grade de 12 Hz; para erros curtos, testar todos os frames a 24 FPS. Exibir separadamente resultados das duas densidades para revelar falhas perdidas por amostragem.
- Reportar acertos, falsos positivos, falsos negativos e não avaliados por check. Todo alerta deve apontar ao frame/crop correto; todos os defeitos objetivos da fixture devem ser encontrados, precisão ≥90% como meta inicial.
- Testar semântica: desabilitar um check, remover um anchor e declarar exceção jamais geram relatório “tudo aprovado”. QA ligado/desligado deve produzir os mesmos PNGs.
- Medir overhead sobre o mesmo conjunto de tempos; meta ≤15%. Usar os componentes atuais para começar; rigs entram quando o experimento 1 fornecer bounds/anchors reais. Não usar correções automáticas para mascarar falhas da fixture.

Para os três experimentos, a entrega futura exige `render.mjs`, manifesto novo, FFprobe, codec/duração/FPS/dimensões/frames/tamanho, decodificação integral, abertura de `video.mp4.review/decoded-sheet.png` e detalhes extraídos do próprio MP4. Registrar evidências e limites em `docs/VALIDATION.md` somente na etapa autorizada. Uma folha reduzida não substitui inspeção nativa das juntas/rosto/sombras.

## 13. Segurança, licenciamento e referências de implementação

### 13.1 Código, distribuição e SaaS

O `LICENSE` local do Eidoverse contém GNU AGPL versão 3. Estudar princípios de IK, colocação, captura ou avaliação não obriga uma implementação independente a receber AGPL. Copiar/adaptar trechos, traduzir o módulo ou portar a mesma implementação para WebGL pode criar obra derivada; mudar nomes ou linguagem não resolve isso. Este relatório não contém código AGPL incorporável e não autoriza reutilização desses módulos.

MIT não torna a combinação magicamente livre de copyleft. Código MIT pode participar de uma obra combinada sob condições AGPL, preservando avisos; o problema para nosso objetivo é distribuir a combinação como se fosse exclusivamente MIT. Em distribuição, as obrigações aplicáveis incluem licença/avisos e disponibilização do código-fonte correspondente conforme a forma de entrega. Para versão modificada oferecida por rede, a seção 13 exige oferta proeminente do fonte correspondente aos usuários que interagem remotamente. Uma separação por processo/API não é garantia jurídica de independência. A decisão recomendada é manter implementação original e obter bibliotecas permissivas diretamente dos upstreams. [Texto AGPL aprovado pela OSI](https://opensource.org/license/agpl-3.0), [compatibilidade GNU](https://www.gnu.org/licenses/license-compatibility.en.html).

Um vídeo gerado não recebe automaticamente a licença do renderer. Arte, música, fontes ou conteúdo protegido efetivamente incorporado à saída mantêm suas condições próprias. Uso interno, entrega do software, disponibilização de código ao navegador e oferta SaaS são cenários diferentes; antes de distribuição comercial/SaaS, a composição exata merece revisão jurídica. Esta análise orienta decisões técnicas, não substitui parecer sobre uma distribuição concreta. [FAQ GNU sobre saídas](https://www.gnu.org/licenses/gpl-faq.en.html#WhatCaseIsOutputGPL).

### 13.2 Licenças não são uniformes dentro de cada árvore

| Componente/recurso | Evidência | Tratamento recomendado |
|---|---|---|
| Base própria | `package.json` declara MIT; não foi encontrado arquivo `LICENSE` na raiz consultada. | Preservar avisos da origem e regularizar documentação antes de distribuir, em tarefa própria. Não criar outro arquivo nesta auditoria. |
| Three/p5.brush | Pacotes instalados declaram MIT. | Reutilizar com avisos de licença. |
| p5 | Pacote instalado 2.3.3 declara LGPL-2.1. | A plataforma não é composta exclusivamente por dependências MIT. Avaliar distribuição e eventuais modificações da biblioteca. |
| puppeteer-core | Pacote instalado declara Apache-2.0. | Preservar condições/notices aplicáveis. |
| three-vrm | Upstream MIT; usado pelo Eidoverse. | Se aprovado, obter upstream fixado e testar compatibilidade, sem copiar wrapper da referência. |
| Rapier | `CREDITS.md` declara Apache-2.0. | Possível dependência futura independente; não necessária ao primeiro piloto. |
| Satori/resvg/canvas | Stack adicional com licenças próprias; CREDITS identifica Satori MPL-2.0. | Não importar a stack inteira; conferir versões/termos upstream caso haja necessidade real. |
| Exceções locais Eidoverse | `robotics_kit.js` tem aviso MIT; `vendor/n8ao/VENDORED.md` descreve upstream CC0 e alterações locais. | A licença de raiz não uniformiza todo arquivo. Tampouco um aviso isolado autoriza toda sua closure. Não reutilizar módulos nesta tarefa. |
| Assets Eidoverse | CREDITS distingue modelos CC0, personagens CC-BY, fontes OFL e recursos de várias origens. | Não tratar o pacote inteiro como CC0. Versão de licença/atribuições/direitos precisam de prova por asset. Preferir elenco próprio. |
| FFmpeg/libx264 | Licenciamento depende da build e componentes ativados. | Executar ferramenta separada e redistribuir binário são situações distintas; inventariar build/avisos antes de empacotar aplicativo. [Condições oficiais](https://ffmpeg.org/legal.html). |

Poly Haven publica seus assets sob CC0; isso é uma boa fonte possível, mas não substitui registro da página, bytes e derivação no nosso catálogo. [Licença oficial](https://polyhaven.com/license). Para IA, guardar termos vigentes da geração e direitos das referências; não preencher “CC0” apenas porque um modelo gerou a imagem. Não foi feita auditoria jurídica completa das dependências transitivas, fonts, modelos ou todos os assets do Eidoverse.

### 13.3 Fronteiras de confiança

O Eidoverse principal executa Deno com `--allow-all` (`eido.py:206`) e avalia helpers/script de cena (`render_scene.mjs:417,1411`). Isso é coerente com código local confiável de um estúdio, mas **não é isolamento de código fornecido por usuários de SaaS**. Entregar um prompt diretamente como JS executável herdaria acesso a arquivos, processos e rede. Não houve exploração nem teste de segurança nesta tarefa; o risco decorre da fronteira explícita do runtime.

O renderizador aceita URLs HTTP/HTTPS de assets e lê a resposta inteira (`fetchUrl`); fetchers fazem rede, lidam com ZIPs e alguns geram previews por subprocessos. Antes de reaproveitar essas ideias em serviço, exigiriam limites de bytes/tempo/descompactação, validação de destino/redirecionamentos, isolamento e política contra acesso a rede interna. Os downloads não devem herdar credenciais ambientais nem executar scripts do asset. Esses são requisitos para uma futura superfície exposta, não vulnerabilidades reproduzidas do uso local atual.

Nosso catálogo já usa caminhos restritos, realpath, hashes, allowlist de formatos/rotas, limites e bloqueio de referências remotas no loader. A extensão skinned deve manter essas barreiras e validar índices de bones, accessors, duração/quantidade de tracks, pesos e limites dos morphs. SVG, HDR/EXR, áudio e arquivos de projeto de modelagem ampliam superfícies distintas: não liberar tudo com uma única flag de “assets avançados”. Não carregar `.blend` ou script recebido como se fosse um GLB passivo.

A primeira versão por prompts deve resolver nomes/ações permitidas para dados conhecidos, sem `eval`, imports livres, caminhos arbitrários ou URLs do prompt. Usar o esquema proposto em `PROMPT_TO_STORYBOARD_PLAN.md` como evolução do registro atual; não confundir geração de código supervisionada com serviço seguro multiusuário.

### 13.4 Índice de evidências no código

| Ref. | Caminhos/símbolos consultados | Sustenta |
|---|---|---|
| C1 | [platform.js](../src/platform.js): `validateStoryboard`, `resolveProject`, `freeze`; [runtime.js](../src/runtime.js): `boot`, `renderAt`, `renderSheet` | Contrato, configuração, preparação e captura. |
| C2 | [config.js](../src/config.js): `quality-space-p0/p1/p2`; [quality-space.js](../src/scenes/quality-space.js) | Pilotos e perfil artístico atual. |
| C3 | [engine.js](../src/styles/lowpoly-3d/engine.js): `createLowpolyEngine`, `art.environment`, `render`, `dispose`, `worldToScreen` | WebGL2, PMREM, ACES, sombra, orçamento e lifecycle. |
| C4 | [assets.js](../src/styles/lowpoly-3d/assets.js): `prepareStyleAsset`; [format.js](../src/assets/format.js): `gltfInfo`, `imageInfo`; [session.js](../src/assets/session.js): `prepareAssets` | Importação estática, rejeição de rigs/morphs e recursos locais. |
| C5 | [asset-catalog.mjs](../scripts/asset-catalog.mjs): `validateManifest`, `readSafe`, `assetSnapshot`; [studio-server.mjs](../scripts/studio-server.mjs) | Proveniência, hashes, fronteiras e transporte. |
| C6 | [render.mjs](../render.mjs): `videoOutput`, `audioArgs`, modo frames; [render-lib.mjs](../scripts/render-lib.mjs): `sourceSnapshot`, `verifyVideo`, `closeBrowser` | Cache, workers, áudio, verificação e finalização. |
| C7 | [componentes 3D](../src/styles/lowpoly-3d/components/), [cartoon](../src/styles/cartoon/engine.js), [pixel](../src/styles/pixel/engine.js), [Clawd](../src/clawd.js) | Atuação existente e limites de importação nos estilos. |
| E1 | [render_scene.mjs](../../eidoverse-video-main/eidoverse/render_scene.mjs): captura `96`, assets `197`, loaders `1237`, `playModelAnimations` `1364`, loop `2685`, conclusão `3661` | Runtime, tempo, assets/rigs, entrega. |
| E2 | [render_common.mjs](../../eidoverse-video-main/eidoverse/render_common.mjs): `setupRenderer`, `startFfmpegPipe`, `readbackFrame`, `shutdown`; [gpu_check.mjs](../../eidoverse-video-main/eidoverse/gpu_check.mjs) | Device, fallback, buffers e encoder. |
| E3 | [character_controller.js](../../eidoverse-video-main/eidoverse/character_controller.js): `loadStandardAnimations`, `attachLocomotion`, `locomote`, `jump`; [foot_ik.js](../../eidoverse-video-main/eidoverse/foot_ik.js): `FootIK`, `raycastDown`; [robot_controller.js](../../eidoverse-video-main/eidoverse/robot_controller.js): `update` | Locomoção, rig/IK e estado incremental. |
| E4 | [basic_vrm.js](../../eidoverse-video-main/eidoverse/examples/basic_vrm.js), [obstacle_course.js](../../eidoverse-video-main/eidoverse/examples/obstacle_course.js) | Exemplos que chamam APIs, sem validação de execução nesta sessão. |
| E5 | [claudesona_face.js](../../eidoverse-video-main/eidoverse/claudesona_face.js): `installSuitMouth`, `makeSuitMouth`; guia de personagens/wardrobe | Morphs e especificidade do rig facial. |
| E6 | [scene_placement.js](../../eidoverse-video-main/eidoverse/scene_placement.js): `placeOn`, `placeTouching`, `checkClipping`, `checkHovering`, `checkZFighting`, `focusPoint` | Colocação/contatos e limites de heurísticas. |
| E7 | [camera_safety.js](../../eidoverse-video-main/eidoverse/camera_safety.js): `_isClear`, `checkPath`, `safePosition`; [audit_core.js](../../eidoverse-video-main/eidoverse/audit_core.js): `createLedger`, `buildInventory`, `coverageRecords` | Câmera, cobertura e diagnósticos. |
| E8 | [fetch_model.py](../../eidoverse-video-main/fetch_model.py): `fetch_model`, `_apply_theme_ranking`, `_write_license_sidecar`; [fetch_hdri.py](../../eidoverse-video-main/fetch_hdri.py): `ambientcg_fetch`, `exr_to_hdr`; [fetch_texture.py](../../eidoverse-video-main/fetch_texture.py): `_cache_hit` | Aquisição, aleatoriedade, cache e licença. |
| E9 | [procedural_materials.js](../../eidoverse-video-main/eidoverse/procedural_materials.js), [terrain.js](../../eidoverse-video-main/eidoverse/terrain.js), [vegetation.js](../../eidoverse-video-main/eidoverse/vegetation.js), [particles.js](../../eidoverse-video-main/eidoverse/particles.js), [cloth_sim.js](../../eidoverse-video-main/eidoverse/cloth_sim.js), [sky_system.js](../../eidoverse-video-main/eidoverse/sky_system.js) | Amostra de materiais, ambiente, instancing e simulação. Não é auditoria integral desses módulos. |
| E10 | [lipsync.py](../../eidoverse-video-main/lipsync.py), [align_lyrics.py](../../eidoverse-video-main/align_lyrics.py), [merge_av.py](../../eidoverse-video-main/merge_av.py), [voicebox/score.py](../../eidoverse-video-main/voicebox/score.py), [voicebox/resing.py](../../eidoverse-video-main/voicebox/resing.py), [synthkit/seq.py](../../eidoverse-video-main/synthkit/seq.py) | Áudio, visemas e sincronização. |
| E11 | [generate_song.py](../../eidoverse-video-main/generate_song.py), [generate_sfx.py](../../eidoverse-video-main/generate_sfx.py), `requirements-local.txt` | Dependências externas/pesadas dos geradores. |
| E12 | [LICENSE](../../eidoverse-video-main/LICENSE), [CREDITS.md](../../eidoverse-video-main/CREDITS.md), [deno.json](../../eidoverse-video-main/deno.json), `deno.lock`, `eido.py` | Licenciamento, versões e execução privilegiada. |

### 13.5 Issues consultadas e interpretação

- [Issue #1, Unicode no Windows](https://github.com/SkyeShark/eidoverse-video/issues/1): relata falha cp1252. `eido.py:29` local já contém tratamento de stdout/stderr. Não a apresentar como bug necessariamente aberto na cópia examinada.
- [Issue #5, Linux/software e HDRI](https://github.com/SkyeShark/eidoverse-video/issues/5): relata render por software e desempenho muito diferente conforme a cena, além de EXR salvo como HDR. São relatos externos, identificados pelo autor como medições de agente, não benchmarks desta máquina. A cópia local de `fetch_hdri.py:245–261` já converte/verifica formato e falha explicitamente quando não pode convertê-lo. A lição é validar bytes e backend, sem repetir um defeito histórico como atual.

## 14. F — Roadmap de evolução por capacidades reais

| Ordem | Entrega futura | Gate para avançar |
|---|---|---|
| **1** | **Personagem GLB articulado determinístico**, um pack e atuação limitada | Experimento 1, integridade/ownership, PNG fora de ordem e ganho de leitura real. |
| 2 | Diagnósticos de câmera/apoio com evidências | Experimento 3, cobertura explícita, baixa taxa de falsos alertas e nenhum efeito no render. |
| 3 | Acabamento leve sobre P2 | Experimento 2, benefício editorial medido e custo dentro do orçamento. |
| 4 | Reutilização do elenco em outra história e um adaptador 2D por vez | Mesma identidade, novos movimentos/encenação e nenhuma alteração do backend por história. Começar pelo estilo efetivamente escolhido para produção. |
| 5 | Biblioteca pequena de ações e storyboard estruturado validado | Verbos/capacidades existentes, parâmetros finitos, contatos/câmera/leituras declarados; erros para ações indisponíveis. |
| 6 | Brief em linguagem natural → proposta de storyboard → revisão → compilação controlada | Duas narrativas diferentes por estilo, rastreio de assets e intenções, sem execução de código livre vindo do prompt. Pode operar com o Codex já disponível, sem API paga adicional. |
| 7 | Narração local, mix, visemas e legendas | Áudio congelado antes do timing final; sincronia no início/meio/fim, inteligibilidade, níveis e licenças; hash de cada input. |
| 8 | Montagem de vídeos maiores, retomada por planos e catálogo pesquisável | Manifestos por revisão/plano, concatenação com codec/timebase/áudio compatíveis, limites de RAM e recuperação de falhas. Reusar o renderer atual. |
| 9 | Preparação e publicação no YouTube | MP4 e áudio revisados, legendas, título/descrição/créditos e thumbnail; autorização explícita antes de publicar. OAuth, quotas e políticas da API só são pesquisados/implementados nessa etapa. |

Não há prazo estimado em dias sem conhecer a disponibilidade de arte/rig. A ordem usa gates de evidência: arte preparada → capacidade real → diagnóstico → qualidade → automação. Antecipar um compilador geral ou uma fila autônoma antes desses gates apenas automatizaria substituições genéricas e defeitos.

**Próxima decisão solicitada ao usuário: aprovar ou ajustar somente o incremento de personagem GLB articulado descrito em 11.1 e o experimento 1.** O trabalho desta sessão termina neste relatório. Nenhuma implementação, instalação, migração, render ou experimento foi iniciado.
