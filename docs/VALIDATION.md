# Validação da plataforma — 21/10/2026

## POV papel `exp-pov` (experimento, exp/estilos) — 27/10/2026

[MP4](../out/exp/pov/pov-papel.mp4), [SRT](../out/exp/pov/pov-papel.srt), [roteiro](../out/exp/pov/roteiro-pov.md). ffprobe: 1920x1080, 30 fps, 2200 quadros, 73,33 s, AAC presente. Loudness do MP4: −14,1 LUFS, pico −1,5 dBTP. `check-motion --2d --style=exp-papel`: 0 violações (movimento e esqueleto). Abertos: `sheet-pov.jpg` (16 quadros) e `pov-papel.mp4.review/decoded-sheet.png`. `npm test`: 122/127; as 5 falhas são as mesmas do commit base (d8efde7).

## Piloto da personagem fornecida — 22/10/2026

Revisão final `ae28d4f0c361e12098a4e3b705ecd8bfbd8397fda7ab0c6df2e0915b3b0e416b`. [Relatório](PERSONAGEM_PILOT_REPORT.md), [inventário](PERSONAGEM_INVENTORY.md), [MP4](../out/personagem-pilot/revisions/ae28d4f0c361/final/video.mp4). H.264, 876.284 bytes, 1280×720, 12 FPS, 4,5 s, 54 quadros, sem áudio. FFprobe com contagem e FFmpeg com decodificação integral passaram. Somente arquivos locais e ferramentas existentes.

Inspeção real: abertos `out/personagem-pilot/revisions/ae28d4f0c361/final/video.mp4.review/decoded-sheet.png`, `detail-1.png`, `detail-2.png`, `detail-3.png`, `decoded-start.png` (quadro 0), `decoded-middle.png` (26), `decoded-reaction.png` (33), `decoded-end.png` (53), `decoded-expression.png`, `decoded-establish-cut.png`, `decoded-reaction-cut.png`. Na mesma revisão foram abertas as folhas decodificadas de `samples/camera` e `samples/surpresa`, mais `samples/surpresa/video.mp4.review/detail-1.png`. Da cena foram abertos `storyboard.jpg`, `push.jpg`, `observe-cut.jpg`, `reaction-cut.jpg`, `expression.jpg`, `hair-paper.jpg`. A folha de contato das seis fontes e os originais também foram abertos. Revisão do agente por quadros/tiras estáticos; não aprovação humana ou inspeção visual contínua de todos os quadros reproduzidos.

Escolha C: corpo inteiro completo e corte para busto surpreso completo, com câmera sutil. A câmera na imagem calma preserva arte mas não expressa surpresa; partes separadas não oferecem encaixes para rig. Sem substituição facial ou máscara por branco. Corrigidos papel esticado, fragmentos de cabelo repetidos na extensão, frestas alpha e faixa lisa superior do plano médio. A faixa lisa pertencia à revisão `d9519c8e33be`; a câmera foi corrigida e as regiões afetadas e o MP4 novo foram abertos. Nos quadros finais não observei buracos, halos acrescentados ou membros deformados. Permanecem repetição do papel lateral, suavidade do plano médio ampliado e pequenas diferenças de proporção entre desenhos. Olhar fixo; sem piscada, braço independente, caminhada ou morph. Sem teste 1080p/software nesta etapa.

26/26 unitários e seis grupos de regressão passaram na revisão final estável: visual (`npm run test:visual`), file/HTTP, 3D, 36 PNGs de Marte e lifecycle da aquarela em camadas, além dos unitários. [Resultados/logs](../out/personagem-pilot/revisions/ae28d4f0c361/regressions/report.json). QA: 54 quadros repetidos em ordem inversa e embaralhada, oito tempos em outra página, retorno preview/final, descarte e cobertura da composição nos 54 quadros. [QA](../out/personagem-pilot/revisions/ae28d4f0c361/qa.json). A execução intermediária invalidada por mudança de sourceHash foi repetida após congelar a revisão; o resultado final tem `sourceStable:true`.

[Preservação](../out/personagem-pilot/revisions/ae28d4f0c361/preservation.json): dos 1.946 registros iniciais, 1.945 arquivos idênticos; só o índice do catálogo foi estendido, mantendo os sete pins anteriores. Originais, vídeos e engines preservados; evidências de caminhos fixos restauradas e conferidas após corrigir um erro inicial de caminho na restauração. Registro posterior à inspeção: `out/personagem-pilot/revisions/ae28d4f0c361/visual-review.json`. Pack `menina-aquarela@1.0.1`, origem de geração desconhecida e direitos comerciais/publicação não verificados; base para histórias locais com ilustrações e cortes, sem articulação independente.

Generalização 3D: [relatório do filme submarino](GENERALIZATION_REPORT.md). Nova revisão `66fd1e989802`: 8 s, 720p/12 FPS e 1080p/24 FPS, ambos em hardware e SwiftShader. O histórico abaixo é preservado; a seção antiga de limitações descreve o estado da primeira entrega, anterior ao quarto motor.

Quarto motor: [relatório de implementação e validação 3D](LOWPOLY_3D_REPORT.md). Filmes de 3 s/12 fps/36 quadros foram produzidos e inspecionados em 720p antes de 1080p, com hardware e SwiftShader. As três implementações artísticas anteriores permanecem sem alterações; o relatório reúne regressões, hashes e tempos.

Atualização posterior: [auditoria anterior ao 3D](AUDIT_STAGE1.md) registra a correção de rastreabilidade, remoção de `eval`, regressões e entregas regeneradas na revisão `8085d0383acb`. O histórico abaixo foi preservado; seus caminhos de vídeos referem-se às entregas anteriores. [Plano Three.js](LOWPOLY_3D_PLAN.md), aguardando aprovação.

Ambiente: Windows, Node 24.15, Chrome headless, FFmpeg/FFprobe. Aquarela: ANGLE / AMD Radeon R9 200 Series / D3D11. Nenhuma dependência npm foi adicionada; a alteração prévia do usuário no package-lock foi preservada.

## Regressão original

Antes da implementação foram capturados `out/baseline/demo.jpg` e dois PNGs da demo. Após a extração e a integração, os quadros em **0,5 s e 5,7 s são idênticos byte a byte** na mesma GPU:

| Tempo | SHA-256 do PNG, antes e depois |
|---|---|
| 0,5 s | `a46540292578c59641cf523dc6ca465c8b48fcb5c07aaddef4bf6ea4f744e5be` |
| 5,7 s | `00e15c77db1a5ecf626eda59d4bd3b36735ab2898e77985d4e733ceab87a960c` |

As folhas antes/depois em 0,5 / 2,5 / 4,4 / 5,7 / 7,6 / 10,6 s foram abertas e comparadas. O loop de vistas original também foi renderizado. A demo, Clawd e suas expressões não foram redesenhados.

## Testes executados

- `npm test`: 6 testes aprovados. Configuração imutável, compatibilidade, storyboard sem lacunas/sobreposição, overrides isolados, antecipação/arcos, contato, continuidade das asas, CLI e falhas de subprocessos.
- `npm run test:visual`: aprovado. PNGs repetidos após renderizar outro tempo e em páginas diferentes são iguais nos três estilos. Não há bibliotecas p5 nos estilos cartoon/pixel. Contato calculado da borboleta com a cabeça: erro zero.
- Pixel art: framebuffer 320×180, zero cores externas à paleta e zero divergências na ampliação por blocos 6×6. Esse teste usa PNG/canvas sem perdas, não cores comprimidas do MP4.
- Prévia: screenshots em 1440 px e 390 px, sem overflow horizontal; navegação pelo storyboard, reprodução/pausa e troca de estilo exercitadas. Screenshots abertos e inspecionados em `out/checks/preview-*.png`.
- `node scripts/check-render.mjs`: aprovado. Retomada sem reescrever quadros válidos, rejeição de cache incompatível e sequência incompleta, intervalo não zero, JPEG e PNG codificados, stills, recorte por câmera, parâmetros inválidos e áudio curto preenchido até a duração do vídeo. Evidências em `out/checks/render/7e4581573e13/`.
- `git diff --check`: sem erros após a limpeza de whitespace.
- Detector mecânico da interface: nenhuma ocorrência no passe executado. A inspeção visual subsequente corrigiu a abertura da prévia.

## Defeitos encontrados e corrigidos

| Achado | Correção | Confirmação |
|---|---|---|
| O renderer antigo anunciava saída sem checar o código de retorno do FFmpeg | Pipeline propaga erros; saída provisória só vira final após FFprobe e decodificação | Testes de subprocessos, sequência incompleta e MP4s válidos |
| P5 instalava `window.PROJECT = 'square'`, apagando metadados do filme | Projeto e estilo passaram a constantes lexicais; duração retornada pelo motor é validada | Regressão dos metadados no teste visual |
| Contorno pesado e pétalas pouco legíveis na aquarela de teste | Override de peso 0,65 somente em “Uma visita”; pétalas rosa | Folhas, recortes e quadros finais; demo original permanece idêntica |
| Sombra encobria parte do contorno inferior do cartoon | Contorno recomposto após a sombra | Detalhe extraído do MP4 final |
| Brilho do olho escapava durante a piscada do cartoon | Highlight acompanha a escala de fechamento | Recortes e quadros corrigidos |
| Trocar velocidade das asas podia trocar a fase abruptamente | Fase contínua calculada analiticamente na coreografia | Teste nos dois pontos de mudança e tiras de movimento |
| Expressão alegre dos motores nativos ignorava parte do fechamento dos olhos | Fechamento tem prioridade e abertura é gradual | Tiras da mudança de expressão |
| Prévia abria na íris totalmente fechada e parecia vazia | Abertura da prévia em 0,8 s, mantendo acesso explícito a `?t=0` | Screenshots desktop/celular |

## Evidência visual

`node scripts/review.mjs` gera, para cada estilo, 12 imagens de storyboard cobrindo os dois planos, 20 quadros do pouso, 22 da partida, 7 da continuidade entre planos, 26 das íris e 6 recortes de expressão/contato. Arquivos em `out/visit/<estilo>/review/`.

Foram abertas as folhas e tiras, verificando trajetória, contato, expressão, contraste, continuidade do corte e transições. A revisão é de imagens e sequências de quadros; não equivale a assistir aos 144 quadros em reprodução audiovisual contínua. O MP4 inteiro é decodificado automaticamente, e suas amostras extraídas são inspecionadas visualmente.

As bordas escuras no primeiro/último quadro são as íris planejadas. Células vazias ao final de folhas não retangulares são preenchimento da folha de revisão e não pertencem ao vídeo.

## Entregas verificadas e inspecionadas

| Estilo | Arquivo | Tamanho | Resultado |
|---|---|---|---|
| Aquarela | [video.mp4](../out/visit/watercolor/video.mp4) | 4.086.881 bytes | H.264, 1920×1080, 24 fps, 144 quadros, 6 s |
| Cartoon | [video.mp4](../out/visit/cartoon/video.mp4) | 377.143 bytes | H.264, 1920×1080, 24 fps, 144 quadros, 6 s |
| Pixel art | [video.mp4](../out/visit/pixel/video.mp4) | 87.072 bytes | H.264, 1920×1080, 24 fps, 144 quadros, 6 s |

Para cada arquivo final, a folha `decoded-sheet.png` contém os quadros 0, 17, 35, 57, 78, 97, 117, 134 e 143, extraídos do próprio MP4. Essas folhas e `detail-2.png` foram abertas e inspecionadas após o último encode. Os relatórios em `<vídeo>.review/report.json` registram `visualReview: inspected-sampled-frames`, a data, as evidências e SHA-256 do vídeo. A decodificação automática percorreu todos os quadros.

## Limites conhecidos

- Os três testes são silenciosos. Áudio opcional foi validado separadamente com sinal sintético.
- Aquarela usa GPU/WebGL e pode demorar segundos por quadro. A prévia avança por quadro concluído, podendo tocar abaixo do tempo real. O MP4 mantém 24 fps.
- H.264/yuv420p introduz compressão e alterações de cor, perceptíveis sobretudo em pixels. Use sequências PNG para uma matriz/paleta exata.
- Anime, motion graphics e 3D têm ponto de extensão documentado, mas ainda não têm implementação.
- A história em linguagem natural é desenvolvida pelo Codex; a interface revisa projetos implementados. Não há um serviço remoto de geração automática.
- Artefatos em `out/` não entram no Git. São entregues neste workspace e podem ser regenerados.
# Revisão de assets estáticos — 21/10/2026

Produção `b2ed8e03fa7cb14c31338d64a8c3eca102b6c8d537561279b0f0948169134e84`; commit de referência `1ea2f6c`. [Relatório completo](ASSET_PILOT_REPORT.md), [comparação P0/P1/P2](../out/asset-pilot/revisions/b2ed8e03fa7c/comparison/p0-p1-p2.png) e [fechamento](../out/asset-pilot/revisions/b2ed8e03fa7c/completion.json).

Seis MP4s de 2 s/720p/12 FPS/24 quadros foram tecnicamente verificados e decodificados: P0/P1/P2 em AMD/D3D11 e SwiftShader. Foram abertas as seis folhas decodificadas, a folha com todos os 24 quadros de P2/hardware, comparação dos PNGs em 1 s, começo/fim nativos e detalhe extraído do MP4 principal. Foram abertas novamente as quatro referências apenas para avaliar a distância de acabamento. Nenhuma entrou no catálogo. A revisão é de folhas e detalhes; não equivale a ver todos os quadros dos seis vídeos individualmente em tamanho nativo.

P2 corrige a falta de leitura de faces metálicas sem ambiente de P1. A primeira luz ficou clara demais; reduzir ambiente/key/fill recuperou tons. Névoa local removeu a borda poligonal do solo. Giro/altura e identidade permanecem coerentes nas amostras; sombras 512 e geometria de 280 triângulos ainda são simples. O padrão cinematográfico da referência **não foi atingido**. Somente o adaptador 3D estático foi implementado; 2D/rig/morph/compilador continuam futuros. 1080p/24 FPS aguarda aprovação do usuário.

18/18 unitários e 13/13 grupos passaram. Aquarela/cartoon/pixel preservados; 36 PNGs históricos de Marte e três de Oceano iguais no mesmo backend. Os 23 MP4s anteriores têm hashes preservados. O novo inventário inclui servidor, loaders e dependências reais, assetHash, origem/licença/hash do GLB e provas privadas. Sem novas dependências ou APIs. Hardware/software medidos separadamente; sem promessa binária entre GPUs.

## Validação do piloto em 1080p/24 FPS — 22/10/2026

Após aprovação explícita do 720p, P0/P1/P2 foram renderizados em hardware e SwiftShader: seis MP4s H.264, 1920×1080, 2 s, 24 FPS e 48 quadros cada, sem áudio. Contagem, dimensões, duração/FPS, decodificação integral e hashes foram verificados. Código de produção `b2ed8e03fa7cb14c31338d64a8c3eca102b6c8d537561279b0f0948169134e84` e assetHash `d8a523f4b4b605a40c4c34d214ca42e559c240501b64671c5ba9ebf77f1bc95d` permanecem iguais aos do piloto (P0: assetHash null).

Foram abertas as seis folhas decodificadas, os comparativos P0/P1/P2 de começo/meio/fim, detalhes nativos de ambos os backends, comparação hardware/software e 720p/1080p, folhas com os 48 quadros dos dois P2 e detalhes nativos extraídos de ambos os MP4s P2. Sem desaparecimentos/clarões observados nas folhas; ROI estático manteve luma média constante em todos os quadros. Sombras de 512 pixels continuam discretas/serrilhadas e P1 continua com faces escuras sem ambiente. Essas limitações aprovadas foram preservadas. Não se reivindica ausência de shimmer subpixel nem revisão de todos os quadros em tamanho nativo ou igualdade entre GPUs.

18 unitários e 13 grupos de regressão passaram novamente, mais os seis casos específicos 1080p com ordem/páginas/prévia/materiais/descarte. Os 29 MP4s anteriores e as evidências de 720p estão fixados por hash. Nenhum engine, cena, perfil, asset, dependência ou pipeline precisou ser alterado. P2: 6,545 s no hardware e 17,521 s no SwiftShader, totais externos de uma execução por caso. Não extrapolar para outros filmes.

[Relatório e seis MP4s](ASSET_1080_VALIDATION.md) · [comparativo](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/comparison/hardware-p0-p1-p2.png) · [fechamento](../out/asset-pilot/revisions/b2ed8e03fa7c/1080p-24fps/completion.json). Etapa encerrada nesta entrega, sem avanço artístico automático.


## 22/10/2026 — ator GLB articulado

Incremento encerrado: [relatório](ARTICULATED_ACTOR_REPORT.md), revisão `a17b0c286aa6c407f563433d57d343f09cea9fe49226b5c1242c7d8fcce8e02b`. 22 testes unitários e 13 grupos de regressão passaram; 36 PNGs históricos de Marte iguais e hashes dos 72 MP4s anteriores preservados. QA em 720p e 1080p, Radeon/D3D11 e SwiftShader: 192 tempos crescentes/decrescentes/embaralhados, 12 em página nova, preview→final, skeletons independentes, neutralização e descarte. FFprobe e decodificação integral dos quatro MP4s 720p e 12 renders 1080p (quatro primários e oito medições auxiliares), H.264/24 FPS/oito segundos/192 frames/sem áudio.

Foram realmente abertas as oito folhas dos MP4s **primários**, os comparativos faciais nativos, detalhes B dos dois backends em 1080p e as tiras de contatos/parada/loop/gesto/corte e fixtures listadas em [visual-review.json](../out/articulated/revisions/a17b0c286aa6/visual-review.json). Só esses primários têm revisão visual marcada como realizada. Limite: amostragem por folhas/tiras/recortes; não reprodução humana dos filmes nem inspeção nativa de todos os quadros; repetições auxiliares não inspecionadas visualmente. Ganho editorial de expressão/caminhada em B; sombras de 512 pixels, olhos simples e contato por anchors continuam limitações documentadas. Não há aprovação humana atribuída ao usuário nem equivalência às referências.
# 22/10/2026 — Aquarela com PNGs em camadas

Limitação de determinismo por software registrada no fechamento: a cena completa falhou em igualdade de pixels no SwiftShader. Foram abertos `qa-software-sample/mismatch-{actual,expected}.png`; a análise do par retido mede sete pixels diferentes na flor (máximo 2/255 por canal). O projeto legado `visit` sem assets e o piloto procedural também falharam ao repetir o mesmo tempo. O teste isolado de PNGs + câmera + papel/grain estáticos passou nas 14 comparações, incluindo uma segunda página, sem tolerância de pixels. Esse resultado não promove a cena pintada inteira a determinística no software. A validação principal usa Radeon/D3D11, com as permutações completas aprovadas. As seis revisões visuais permanecem válidas como inspeção dos arquivos decodificados, sem significar aprovação de todo teste automatizado em todo backend.

Fechamento visual da revisão `70bc9346f90d`: abertos os dois `1080p/hardware/*/video.mp4.review/decoded-sheet.png`, `detail-1.png` de ambos e `detail-3.png` de assets. Também abertos `1080p/comparison/hardware-{face,gesture,breath,hair}-ab.png`, extraídos dos MP4s: face/piscada, juntas em gesto, respiração e atraso do cabelo. As formas mantêm identidade; não apareceu buraco nas juntas amostradas. Contornos dos braços/colar e mechas rígidas seguem aparentes; respiração discreta, sem demonstração de deformação contínua ou acabamento profissional. Na comparação, o procedural perde alguns pequenos traços retos, incluindo a boca neutra; a variante PNG conserva essas marcas com maior clareza. Esse é um resultado concreto desta fixture, sem uma alegação de superioridade artística geral.

Software 720p: abertos os dois `720p/swiftshader/*/video.mp4.review/decoded-sheet.png`, `detail-1.png` de ambos, `detail-2.png` e `detail-3.png` de assets; comparações `720p/comparison/swiftshader-{face,gesture}-ab.png`. Mesmas ações legíveis, sem franja clara forte ou retângulo de fundo. Hardware 720p: também abertos `detail-1.png` de procedural, `detail-3.png` de assets e `720p/comparison/hardware-{face,gesture,hair}-ab.png`. Na QA 1080p foram abertos `assets-storyboard.jpg`, `assets-gesture.jpg`, `assets-head-hair.jpg` e `alpha-composition.png`.

As seis entregas são MP4 H.264 de 2,5 s, sem áudio: quatro em 720p/12 (hardware/software × procedural/assets) e duas em 1080p/24 (hardware). Todas passaram FFprobe e decodificação integral FFmpeg. Inspeção visual do agente: folhas amostradas e recortes nativos, sem reprodução humana em tempo real, sem revisão nativa individual de todos os quadros e sem aprovação do usuário atribuída. Células pretas nos mosaicos comparativos são preenchimento de grade quando sobram células ou tempos caem no mesmo frame a 12 FPS; não são quadros pretos no vídeo.

O ledger `out/watercolor-actor/revisions/70bc9346f90d/visual-review.json` registra os arquivos efetivamente abertos. Somente após este registro documental os seis relatórios individuais serão marcados como revisados pelo agente. A aceitação de qualidade artística profissional continua pendente; os renders exploratórios anteriores não recebem aprovação final por consequência.

Revisão de produção `70bc9346f90de301b9707b2baa48735c35826304a338fd82e3f8696182bc2981`, pack `iara-watercolor-fixture@1.0.2`. [Relatório](WATERCOLOR_ASSET_ACTOR_REPORT.md). Checkpoint `checkpoints/watercolor-before-20261022-090502/` preserva o trabalho não commitado e inventaria as saídas anteriores.

Inspeção efetiva inicial: storyboard de trabalho; tiras `assets-gesture.jpg`, `assets-face.jpg` e `assets-head-hair.jpg` da revisão exploratória `f3e8c1d147c2`. Defeito concreto: retângulo do pescoço visível sobre o queixo. Pintar pescoço antes da cabeça e remover alpha interno semitransparente das formas eliminou o quadrado; `work/neck-corrected.jpg` foi aberto novamente. Packs 1.0.0 e 1.0.1 e tentativas exploratórias foram preservados; seus renders não compõem as entregas finais.

Revisão 720p em hardware da versão corrigida: abertos `out/watercolor-actor/revisions/70bc9346f90d/qa-720/hardware/assets-face.jpg`, `assets-breath.jpg` e `alpha-composition.png`. Fundo escuro não revela retângulo opaco ou franja clara marcante; a faixa de pigmento cobre a personagem central e fica atrás da personagem à direita, confirmando a ordem imagem → tinta → imagem. Piscada encobre a troca da boca e os demais traços mantêm identidade. Respiração é discreta; os braços continuam segmentados e suas linhas de junção são aparentes, sem abertura observada nas amostras.

MP4s corrigidos 720p: abertas as folhas `720p/hardware/{procedural,assets}/video.mp4.review/decoded-sheet.png` e o `detail-1.png` de assets. A troca de desenho mantém a câmera e a coreografia; a versão PNG tem contorno facial mais limpo, enquanto a procedural conserva o traço quebrado do brush. Não é evidência de qualidade de ilustração profissional. Essa revisão amostrada permite avançar à validação 1080p/24. FFprobe e decodificação integral já passaram para ambos os MP4s; a inspeção visual não cobre individualmente todos os quadros nem equivale a aprovação humana do usuário.


## Revisão de prioridades — 22/10/2026

Análise registrada em [NEXT_STEPS_REVIEW.md](NEXT_STEPS_REVIEW.md). Nenhum novo filme produzido. Nesta revisão: npm test 26/26; npm run test:visual aprovado, com restauração dos sete arquivos históricos sobrescritos pelo harness e cópia nova em tmp/repository-review-20261022; sintaxe de 100 arquivos verificada. Os 59 inputs de código do relatório da menina coincidem com o disco; hash do MP4 coincide. Nova verificação FFprobe: H.264, 1280x720, 12 FPS, 4,5 s, 54 quadros; FFmpeg decodificou integralmente sem erro.

Evidências realmente abertas: out/personagem-pilot/revisions/ae28d4f0c361/final/video.mp4.review/decoded-sheet.png e decoded-expression.png; out/personagem-pilot/preparation-v2/contact-sheet.png; out/watercolor-actor/revisions/70bc9346f90d/1080p/comparison/hardware-gesture-ab.png. A menina mantém pose interna e muda enquadramento/desenho; as fontes têm fundo opaco e diferenças de escala/desenho. O comparativo Iara mostra articulação relativa, com juntas e formas segmentadas. Confirma-se suporte técnico a camadas, sem comprovar acabamento profissional para a menina.

Limites: revisão de imagens estáticas selecionadas e leitura de código, sem reprodução audiovisual contínua, sem inspeção de todos os quadros de todos os pilotos e sem nova regressão completa 3D/software. Relatórios históricos e seus estados de aprovação não foram reescritos.

## 27/10/2026 — base de estilos

- `npm test`: 107/107. `npm run test:visual`: PASS em 12 pares estilo × cena de fumaça (determinismo, workers, isolamento p5, paleta pixel, prévia).
- `check-motion`: 0 violações em smoke-2d (cartoon, stick, watercolor, flat, paper, ink; debug e silhouette só pelo esqueleto, sem `ExpStyle.parts`) e em smoke-3d.
- Folhas de contato das 12 combinações abertas e conferidas.
- `mix-audio`: narração real de 573 s saiu com −14,2 LUFS e −1,8 dBTP (antes −15,6 LUFS).

## 28/10/2026 — webapp fase 1 (base e minerar)

- `npm test`: 182/182. Aceite com dados reais da YouTube Data API v3, chave salva pela tela Configurações (fora do repositório; `git status --porcelain data/` vazio e `git grep AIza` só encontra as chaves falsas dos testes).
- Busca "sleep history documentary": 64 canais gravados, 330 unidades gastas (2 buscas de 100, 2 de channels, 66 de playlistItems, 62 de videos), em linha com `estimateMine`; o aviso da tela mostra ~301 por ser a estimativa para 50 canais.
- Mesma busca repetida: só +2 unidades. A resposta 404 de dois canais sem playlist de uploads não entra no cache, então esses dois pedidos se repetem; o resto veio do cache.
- Importação de `@TED` mais uma linha de lixo: 1 canal gravado (4 unidades) e a linha inválida listada em "Não reconhecidos". Cota do dia ao final: 334 de 10.000.
- Predefinições "Canais novos" (9 de 65) e "Muita view, pouco inscrito" (39 de 65) filtram a tabela. Painel do canal aberto nas abas Visão geral e Vídeos.
- Conferência no YouTube: Sleepy Mystery Channel mostra 20 mil inscritos e 62 vídeos, igual ao painel.

## 28/10/2026 — webapp fase 2 (resto da pesquisa)

- `npm test`: 225/225. Aceite com dados reais da YouTube Data API v3. A chave continuou só em `data/config.json` (`git status --porcelain data/` vazio, nenhum arquivo do repositório nem log contém a chave; `git grep AIza` só encontra chaves falsas dos testes).
- Visão geral: 65 canais, 3 outliers nos últimos 7 dias, 9 canais novos, 17 oportunidades. Outliers: 292 vídeos com "Dados de 28/10/2026", sem `NaN` nem `Infinity`.
- Minerar vídeos, "roman empire documentary" com duração Longo: 50 vídeos de 28 canais, 154 unidades (medidor 334 → 488, igual ao `units` do histórico; o aviso da tela mostra o teto de ~202). Ordenar por Múltiplo funciona. Conferência no YouTube: o primeiro vídeo tem 13.938.081 views e o app mostra 13,9 mi.
- Painel de dois canais: Análise (padrões de título, duração, publicação em UTC, "histórico começa em…") e Concorrentes (canais parecidos, com palavras e tópicos em comum que fazem sentido, e a data da coleta).
- Resumo pelo Claude: gerado de verdade pelo `claude -p` no canal Small Hours Documentary. Com um `claude` falso e títulos hostis em teste, o texto aparece como texto, sem executar nada; sem `claude`, a tela mostra "claude não encontrado no PATH" e o prompt para copiar.
- Coleções e Favoritos: coleção criada com 1 canal e 1 vídeo, nota do vídeo mantida após recarregar, "Só favoritos" filtra 1 canal. Histórico: Refazer mostra "sem custo (cache)" e registra 0 unidades (medidor parado em 488).

## 28/10/2026 — webapp fase 3 (monitoramento, concorrentes e nichos)

- `npm test`: 253/253. Aceite com dados reais da YouTube Data API v3 e a `data/` real, pelo servidor (`startAppServer`) dirigido por script. `git status --porcelain data/` vazio; `git grep AIzaSy` só acha o texto do próprio plano (sem chave).
- Monitoramento: 5 canais seguidos, "Atualizar agora" previu 11 unidades e gastou 10 (o medidor foi de 488 para 498; o teto inclui um pedido que não aconteceu). Os 5 ficaram com `lastRun`, linha de base, 0 alertas. Segunda atualização: mais 10 unidades (498 para 508, `fresh` gasta cota de novo), 0 alertas, nenhum duplicado.
- Reinício do app: o `tick` da partida devolveu `recent` e não rodou de novo. O Histórico tem as 2 entradas `monitor` (5 ok, 0 falhas, 10 unidades cada).
- Concorrentes: 3 canais marcados e a rota devolveu as 3 linhas. Nenhum vídeo dos últimos 30 dias (a base é antiga). O comparativo lado a lado não foi conferido canal a canal contra o painel nesta rodada; só no navegador com dados falsos (tasks 9).
- Nichos: 4 nichos em 91 canais (3 automáticos de 44, 28 e 2 canais, mais "Sem grupo" com 17), vizinhos com palavras em comum (history, sleep, documentary), sem `NaN`, 1,5 s para montar. "Sugerir subnichos" gerou de verdade pelo `claude -p` 8 subnichos com exemplos em molde (`[lugar]`, `[número]`), em 27 s.
- Não conferido: a tela no navegador com os dados reais (as telas foram verificadas com Playwright e dados falsos); alertas de vídeo novo e outlier com dados reais (a base ainda é linha de base).

## 28/10/2026 — webapp fase 4 (modelar e meus canais)

- `npm test`: 292/292. Aceite com a `data/` real pelo servidor (`startAppServer`) dirigido por script. `git status --porcelain data/ out/` vazio; `git grep AIzaSy` só acha o texto dos planos (sem chave). Kokoro instalado em `out/tmp/kokoro-venv` (fora do git).
- Modelagem do âncora Timeline - World History Documentaries (34 vídeos) com 2 canais extras do mesmo nicho: job `done` em 43 s, `claude -p` com thumbnails de verdade (`semImagens: false`), 3 conceitos, moldes com lacunas e nenhum igual a título enviado. Views de cada conceito iguais à soma dos vídeos no painel (2.448.257, 1.997.920, 553.039). Medidor de cota 508 antes e depois.
- Perfil a partir do conceito 1 (idioma `en` herdado do âncora, voz `kokoro:af_heart`). Amostras de voz pelo Kokoro: `pm_alex` 1,0 = 176 palavras por minuto (20,5 s), `af_heart` 1,0 = 153 (22,8 s); WAV servido com status 200 e gravado em `voiceWpm`. O pt ficou acima da faixa de 130 a 170 esperada no plano; a fase 6 usa o valor medido.
- Concorrentes: 3 canais ligados ao perfil; `?my=<n>` devolve 3 linhas e "Todos" 6. O perfil de teste foi apagado depois; as marcas de concorrente ficaram na base.
- Não conferido: as telas no navegador com os dados reais (Playwright/Chrome só com dados falsos, nas tasks 7 a 9); ouvir o áudio (só status, tamanho e wpm).

## 29/10/2026 — webapp fase 5 (motor de episódio)

- `npm test`: 367/367. `npm run test:visual`: PASS, 16 estilo×cena (smoke-kit em debug, flat, watercolor e pixel). `git status --porcelain data/ out/ src/episodes.js`: vazio.
- Demo (`fixtures/episodes/demo`, 8 planos, 3 capítulos, 2 pessoas) por `node scripts/episode.mjs`, uma cópia por estilo em `out/tmp/demo-<estilo>/`. ffprobe nos 3: h264 1920×1080, 24 fps, 1883 quadros, 78,458 s (igual ao `timing.json`), AAC 48 kHz. `decoded-sheet.png` aberto nos 3: legenda com a palavra destacada, HUD nos planos s2, s5 e s7, etiqueta "Leitor" sobre o ator, as 8 cenas no idioma de cada estilo.
- Tempo por etapa na primeira execução (s): pixel: loops 165, segmentos 12, montagem 10, verificação 13 (narração e mix já em cache). flat: narração 64, loops 187, segmentos 15, mix 19, montagem 12, verificação 17. watercolor: narração 57, loops 962, segmentos 14, mix 13, montagem 10, verificação 16. Segunda execução: 0 loops renderizados, mix e montagem pulados, cerca de 13 s (só a verificação).
- Acervo: 8 loops de 12 s por estilo; pixel cerca de 6 MB, flat 6,7 MB, watercolor 29,5 MB. Vídeo da demo: pixel 7,4 MB, flat 7,5 MB, watercolor 19 MB.
- Episódio longo em pixel (`out/tmp/long-pixel`, 18 capítulos, 48 planos, narração descritiva sem fatos, 3 696 palavras): 1536,4 s (25,6 min), 36 874 quadros, AAC, −14,2 LUFS e −1,8 dBTP, 119 MB. `verify` aprovado e `decoded-sheet.png` aberto. Etapas (s): narração 735, build 0,1, loops 0 (8 já no acervo), segmentos 45, mix 349, montagem 198, verificação 294; total 1621 s (27 min). Escalado para 30 min: cerca de 32 min.
- Pixel × story de 28/10 (folha `out/check/story/compare.png`): céu pontilhado, estrelas e lua em faixas iguais ou melhores; luz de janelas e fogueira melhor; mais cenas e climas. Pior: a cena `ceu-noturno` é vazia perto da composição do story, e os bonecos são mais finos e menos icônicos que os de cabeça grande.
- Não conferido: ouvir o áudio inteiro; o estúdio no navegador com o `ep-demo`.

## 29/10/2026 — acabamento visual do kit (pixel primeiro)

- O que mudou:
  - Kit: primeiro plano por cena (`fence`, `bush`, `post`, `cart`, `boat`, `tuft`), fora dos `spots` com margem de 130 px.
  - `ceu-noturno` composto: pinheiros perto, casa de 180×140 com 1 ou 2 janelas acesas, cerca, céu em cerca de 57% da altura.
  - Mapa com ondas, rosa dos ventos, picos, matas e moldura dupla.
  - Cabeça maior por estilo (`headScale`: pixel 1.7, flat 1.25, watercolor 1.15).
  - No pixel: tronco +2, nuvens com degrau e sombra, chão em faixas, braço que aponta sem tampar a cabeça, idoso legível à noite.
  - ASS: textos maiores; legenda quebrada por largura (34 caracteres no pixel, 44 nos outros).
  - `--prune-acervo`.
- `npm test`: 385/385. `npm run test:visual`: PASS, 16 estilo×cena. `check-motion` em smoke-kit: 0 violações em debug, pixel, flat e watercolor. `git status --porcelain data/ out/ src/episodes.js`: vazio.
- Acervo: `node scripts/episode.mjs --prune-acervo` removeu 48 arquivos, 58 MB (de 59 MB para 32 KB).
- Demo nos 3 estilos (`fixtures/episodes/demo`, `out/tmp/demo-flat`, `out/tmp/demo-watercolor`). `verify` aprovado nos 3: 1920×1080, 24 fps, 1883 quadros, 78,458 s, AAC. `decoded-sheet.png` aberto nos 3.
  - Loops renderizados do zero: pixel 167 s, flat 187 s, watercolor 965 s.
  - Vídeos: pixel 8,3 MB, flat 8,2 MB, watercolor 21 MB.
- Pixel × story (folha `out/check/story/compare-acabamento.png`, demo s1 noite e s2 pôr do sol contra `story-1.5.png` e `story-7.png`):
  - Igual ou melhor: céu, estrelas e lua; pinheiros, cerca e casa com janela acesa; sol em faixas e reflexo no mar; chão com detalhe; cabeça grande na proporção do story.
  - Volta à Task 2 uma vez: o idoso olhando para cima era um bloco claro (cabelo branco igual à pele, contorno sumindo no escuro). Depois do conserto (`3c52fec`), lê-se tão bem quanto o menino do story.
  - Ainda pior:
    - a casa da noite é menor e mais distante que a casa grande em primeiro plano do story;
    - o olhar para cima depende do olho, da boca e do chapéu, sem inclinar a cabeça;
    - as nuvens do entardecer ainda parecem almofadas lisas de longe.
- Revisão final do ramo: no pixel, a etiqueta do ator ("Leitor" / "relê os registros") cobria o alto da cabeça e o chapéu inteiro, porque ficava 16 px acima do `headTop` do esqueleto e o pixel desenha a cabeça 1,7× maior e o chapéu ~30 px acima. Conserto: a etiqueta sobe até o alto da cabeça escalada pelo `headScale` do estilo, mais 40 px no pixel (arredondamento e chapéu). Teste em `tests/episode-lib.test.mjs`. O giro do braço do pixel (`reach`) ficou limitado a 1,3 rad, o menor teto que ainda tira a mão do point do idoso do rosto (0,8 rad deixava a mão sobre o rosto no elenco e na demo s5).
- Não conferido:
  - corpos `heavy` e `thin`, capuz e capacete: não renderizados em nenhum estilo, nem no pixel;
  - corpo `child`: visto só no pixel (interior da smoke-kit), não no flat nem na aquarela;
  - ouvir o áudio inteiro.

## 30/10/2026 — webapp fase 6 (gerar vídeo e embalagem)

- Aceite no app, banco real. Meu canal criado para o aceite (não havia nenhum): "Roma Sem Limites em Pixel" (pt, pixel, `kokoro:pm_alex`, 10 ± 2 min), do conceito 0 da modelagem 1, com 8 concorrentes de história.
- Tema: "A caçada ao couraçado Bismarck em 1941", reescrito do outlier "Hunting The Bismarck" (12,1×). 4 fontes da Wikipedia pt.
- Tempo por etapa (o que a tela mostra):
  - pauta 0,02 s; fontes 1,9 s;
  - análise: pulada. O yt-dlp tomou HTTP 429 nas legendas (`pt` e `en`) e avisou que falta alvo de impersonation (`curl_cffi`);
  - roteiro 299,5 s (7 chamadas do Claude, 5 capítulos, 10 planos, 1647 palavras na meta 1408–2112);
  - narração 550,2 s na primeira vez (733,5 s de áudio, fora da tolerância), 22,3 s na segunda;
  - cenas 3,7 s (refeita depois da troca: 3,6 s);
  - render 534 s na primeira tentativa, com falha na mixagem (loops: 10 novos em ~277 s); 475 s na segunda (loops 0,06 s, segmentos 0,004 s, mix 218 s, montagem 103 s, verify 154 s);
  - revisão aprovada; embalagem 45,3 s; exportar: na hora.
- Duração: 733,5 s na primeira narração (alvo 600 ± 120). O ritmo medido da voz (176 ppm) ficou acima do real (~135 ppm). Enxuguei 2 planos (~70 palavras) pela edição de plano do app: 695,6 s, dentro da tolerância.
- Troca de cena: `c4-s1` de `mar` para `mapa`. A narração continuou `done`.
- Mixagem: −0,4 dBTP na primeira tentativa (limite −1). O AAC passou 1,6 dB acima do teto de −2 dBFS. Conserto em `scripts/mix-audio.mjs` (`00709c2`): o laço baixa o teto pelo excesso medido. Resultado: −14,2 LUFS, −2,6 dBTP.
- `verify`: 1920×1080, 24 fps, 16694 quadros, 695,58 s, AAC. Abertos: `decoded-sheet.png`, `detail-2.png` e 2 thumbs (2 e 4), legíveis.
- `roteiro.md` lido inteiro. Toda frase com fato tem `[n]`. Os números conferem com a fonte citada (112 t de cordite, 1 419 homens, 2 091 tripulantes, 600 km, 764 t, 1 000 t, 12 500 m, 251 m, 2 200 homens, 10h36, 19h22, 1989, 2001).
- `export/`: os 7 arquivos. A descrição traz capítulos de 0:00 a 9:24 e as 4 fontes. A legenda tem 289 blocos, lida pelo FFmpeg, e os tempos batem com `timing.json`.
- `npm test`: 443/443. `npm run test:visual`: PASS. `git status --porcelain data/ out/ src/episodes.js`: vazio. Chave da API e e-mail: ausentes do repositório e do histórico da branch.
- Limites vistos:
  - o kit não tem navio de guerra (o mar mostra um veleiro);
  - os moldes de título do perfil (Roma) não serviram ao tema, então os 15 títulos vieram sem molde;
  - a tela mostra só o tempo da última execução de cada etapa (o roteiro mostra 0 s depois de uma edição de plano).
- Não conferido: ouvir o áudio inteiro; a análise de outlier com legenda real.

## 31/10/2026 — pixel figura v5 (aceite)

- Plano `docs/superpowers/plans/2026-10-30-pixel-figura-v5.md`, commits `d2b0e60..e592a72` mais este. Boneco do `pixel` em volumes sombreados (rampas de 5 tons), cabelo em mechas desenhadas, mãos, bota e rosto em sprite, luz de borda, contorno seletivo; elenco inteiro, ações novas do kit (`run`, `cheer`, `talk`, `kneel`, `cower`, `lie`), cachecol e capa com mola, poeira da corrida; copas e arbustos em tufos.
- Demo (`fixtures/episodes/demo`) com `talk` (s2), `cheer` (s4, segundo ator), `run` (s6) e `walk`. `scripts/episode.mjs`: `verify` 1920×1080, 24 fps, 1883 quadros, 78,46 s, AAC; −14,2 LUFS, −1,9 dBTP. `decoded-sheet.png` aberto e uma tira de s5/s6: o corredor aparece em cerca de 6 dos 10 s do plano.
- Etapa `loops` da demo com acervo vazio (8 loops, um Chrome): antes 197 s (boneco antigo, 3 min 17 s); depois 303 s (boneco novo com memo do `figureOf`), 1,54×, abaixo do teto de 2×.
- Render por quadro: cerca de 125 ms antes; 240 ms com o boneco novo sem memo; 137 ms com o memo (`--loop=cast`); copas em tufos +15% na folha da smoke-kit.
- `out/check/fig/compare.png`: protótipo v5, `images.jpg` e `m8ehkzge45361.png` em cima; elenco real em `point`, `cheer`, `run` e `lie` embaixo, ampliados sem suavizar.
  - Igual: volumes, rampas, contorno seletivo, luz de borda, mechas, bota, cachecol.
  - Melhor: 6 cabelos e 5 corpos, cor do elenco com o valor preservado, mãos e botas espelhadas, olho sem "E", dedo do `point`, sprites que escalam no `mid`, ações novas, paleta em 122 cores.
  - Pior: o boneco ocupa menos tela que no protótipo (grade 480 contra 320); deitado com rosto fraco e chapéu em pé; copa atrás da cabeça confunde a silhueta; pernas mais longas e menos "chibi" que as referências.
- `npm test`: 476/476. `npm run test:visual`: PASS. `check-motion` pixel na smoke-kit: 0 violações. `git status --porcelain data/ out/ src/episodes.js`: vazio.
- `node scripts/episode.mjs --prune-acervo` depois do último commit de `src/` (`47a8587`): 64 arquivos, 71,7 MB removidos (o acervo inteiro, inclusive os 8 loops da demo feitos antes das limpezas da revisão final).
- Não conferido: ouvir o áudio inteiro; ações novas (run, cheer, talk, kneel, cower, lie) conferidas em `flat` e `watercolor` (out/check/fig/final-*.jpg); capa e cachecol só no pixel.
