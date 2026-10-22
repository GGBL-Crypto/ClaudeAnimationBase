# Validação da plataforma — 21/10/2026

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
