# Plano de arquitetura — 21/10/2026

Continuação: [auditoria e correções anteriores ao 3D](docs/AUDIT_STAGE1.md) e [plano Three.js low poly](docs/LOWPOLY_3D_PLAN.md). O documento abaixo preserva o plano original; a integração 3D ainda depende de aprovação.

Registrado antes da implementação. Objetivo: descrever uma história ao Codex, escolher um estilo, desenvolver cenas, revisar e produzir PNGs e MP4 verificáveis.

## Diagnóstico

O projeto original tem 11 segundos, dois planos e três dependências (p5, p5.brush e puppeteer-core). `core.js` mistura matemática, arte, WebGL, composição e prévia. `clawd.js` contém o modelo, 31 emoções, vistas e acessórios; preservá-lo evita reimplementar atuação. `timeline.js` une seleção de planos e uma transição específica de pincel. `render.mjs` já oferece folhas, tiras, recortes, stills, loops e workers, mas não verifica o status do encoder no modo clip, não isola caches e não valida o vídeo resultante.

Referência consultada: [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo), commit `fa546a38092e75f2b079e6a86d6abc54dd525d17`, especialmente README, storyboard e timeline. Referência técnica/artística somente: planos puros por tempo, continuidade, atuação e transições motivadas. Nenhuma cena, música ou código dessa referência será copiado.

## Contratos e responsabilidade

- **Projeto**: ID, título, descrição da história, duração, fps, ritmo, estilo único, estilos compatíveis, scripts de cenas e storyboard com leituras e pontos de revisão. Configuração resolvida e congelada antes do primeiro quadro.
- **Estilo**: registro independente com scripts e configuração própria de paleta, textura, contornos, personagem e efeitos. Apenas o estilo selecionado é carregado. Cena declara compatibilidade; a demo original é exclusiva da aquarela.
- **Motor**: `init()`, `render(t)`, `canvas`, `worldToScreen(x,y)`, `info()`. Render retorna o quadro completo e determinístico. Um futuro motor WebGL/3D implementa esse contrato; não precisa imitar primitivas de tinta. Recursos incompatíveis devem falhar explicitamente.
- **Animação universal**: easing, arcos, antecipação, peso, timing, continuidade e leituras. Não contém decisões de tinta, pixel, contorno, fontes ou proibição de 3D.
- **Cena**: função do tempo absoluto/local e duração; separação entre coreografia e desenho quando a história for portável. O pequeno filme de teste utiliza o mesmo estado de atuação e portas de desenho implementadas pelos três estilos. Cenas específicas podem usar diretamente os recursos do seu motor.
- **Entrega**: frames individuais, folhas, tiras, recortes e MP4. Manifestos vinculam sequências à revisão de código, projeto, estilo, intervalo e fps. Vídeos são gravados provisoriamente, verificados e então promovidos ao destino. Relatório automático não substitui inspeção humana/visual.

## Arquivos

| Arquivo | Intervenção |
|---|---|
| `src/core.js` | Preservar pintura, geometria, câmera e composição da aquarela; extrair matemática e ferramentas de prévia comuns. |
| `src/motion.js` | Matemática original compartilhada, sem dependência de p5. |
| `src/timeline.js` | Seleção de planos/loops validada; retirar a transição de pincel para o módulo de aquarela. |
| `src/config.js` | Catálogo de projetos e storyboards; manter a demo como padrão. |
| `src/platform.js`, `src/runtime.js` | Registro, validação, configuração imutável, carregamento e captura comum. |
| `src/styles/*/` | Configurações, motores/adaptadores, guias e instruções independentes. |
| `src/clawd.js`, `src/sheets.js`, `src/scenes/demo.js` | Manter arte e demo originais. |
| `src/scenes/visit.js` | Coreografia do teste compartilhada pelos três estilos. |
| `studio.html`, `src/preview.js` | Ampliar prévia existente: seleção, play/pause, scrub, planos, erros. |
| `render.mjs`, `scripts/` | Render robusto, cache isolado, verificação do MP4, testes e evidência de revisão. |
| `AGENTS.md`, `ANIMATION_GUIDE.md`, `docs/`, `README.md` | Workflow permanente, guia universal, referência original preservada, instruções de extensão e uso. |

## Etapas e critérios

1. **Referência original**: capturar demo antes da mudança, verificar imagens, registrar GPU. Referências em `out/baseline/`.
2. **Separação**: extrair movimento e registrar aquarela; comparar PNGs nos mesmos tempos com a referência original. Preservar API de cenas, loops, recortes e CLI.
3. **Três estilos**: implementar cartoon e pixel; configurar e congelar cada estilo; executar testes de isolamento, determinismo, storyboard e grade/paleta de pixel art.
4. **Produção**: renderizar seis segundos em cada estilo; gerar folhas de planos, tiras de pouso/saída e recortes de contato. Corrigir defeitos encontrados.
5. **Entrega**: validar container, codec, tamanho, fps, duração e quantidade de quadros com FFprobe; decodificar os vídeos completos; extrair e inspecionar quadros de cada MP4. Registrar achados reais em `docs/VALIDATION.md`.

Sem novas dependências npm, serviço remoto, UI de IA fictícia ou framework de plugins. O Codex traduz a descrição em projeto/storyboard/cenas. O estúdio revisa projetos já implementados. Anime, motion graphics e 3D são extensões documentadas, não motores já disponíveis.
