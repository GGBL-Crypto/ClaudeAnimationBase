# Auditoria anterior ao motor 3D — 21/10/2026

Escopo autorizado: Etapa 1 (auditoria, correções e regressões) e planejamento da Etapa 2. A implementação do motor 3D aguarda aprovação conforme a solicitação do usuário. [Plano técnico completo](LOWPOLY_3D_PLAN.md).

## Arquitetura e preservação

Lidos todos os arquivos solicitados: `AGENTS.md`, `ARCHITECTURE.md`, `docs/ADDING_STYLES.md`, `src/platform.js`, `src/runtime.js`, `src/motion.js`, `src/timeline.js`, `src/config.js`, `studio.html`, `render.mjs`; também guia universal, motores atuais, CLI compartilhada e testes.

O workspace já tinha alterações e arquivos não rastreados da etapa anterior. Nenhum reset, limpeza ou remoção foi executado. Nesta etapa não houve alterações em `package.json`, `package-lock.json`, motores artísticos, coreografia, timeline, matemática, configuração dos filmes ou nos MP4s anteriores. Nenhuma dependência foi instalada. O pacote Three.js foi apenas baixado em `out/audit/` para uma prova isolada de compatibilidade.

O contrato de canvas, a seleção de planos e os storyboards podem ser reutilizados por 3D. As lacunas são carregamento ES, origem HTTP, coordenada Z nos recortes e prévia reduzida opt-in. O esquema de configuração aceita grupos adicionais, mas faz merge de arrays como objetos: configurações XYZ devem usar `{x,y,z}` ou exigir correção explícita do merge quando arrays forem realmente necessários. Não há razão para alterar a timeline nesta etapa.

## Rastreabilidade: causa comprovada

No início da auditoria, o hash dos arquivos de produção era:

`7e4581573e13f0444a11b64df41212f71744224484117242f78e0cc58337c3ba`

Os relatórios de cartoon/pixel tinham esse hash. A aquarela tinha:

`5faa9d01a6a6ae7673999d9bea10f788bd93b6373926d113efd9fc4a96d7ddc7`

**Causa:** retirada de uma linha em branco final de `src/timeline.js` durante a produção anterior. A função calcula bytes exatos, incluindo whitespace e CRLF. Recalculando o hash do workspace inicial, mas acrescentando **somente `\r\n` ao final desse arquivo em memória**, o resultado é exatamente o hash antigo da aquarela. Nenhum arquivo foi editado para fazer essa investigação.

[Evidência inicial](../out/audit/provenance-7e4581573e13.json), gerada por [scripts/audit-provenance.mjs](../scripts/audit-provenance.mjs), inclui hashes individuais e comprova que os três vídeos antigos mantêm o SHA-256 registrado na entrega anterior. O script pode ser repetido, mas a correspondência com a revisão inicial só vale para aquela revisão; não é um teste que deva forçar código futuro a ter o hash antigo.

O renderizador registrava o hash no começo e não comparava a revisão ao terminar. Agora calcula inventário de hashes por arquivo, confere novamente antes de promover o MP4 e ao concluir uma sequência, e recusa finalização se a revisão mudou. Os relatórios também registram SHA-256 do vídeo, argumentos, ambiente, horário e tempo decorrido. O algoritmo agregado continua sensível a whitespace: não escondemos mudanças normalizando os bytes.

Também foi corrigido `scripts/verify-video.mjs`: uma nova verificação preserva a proveniência anterior **somente se o SHA-256 do MP4 coincidir**. Nunca atribui o hash do código atual a um arquivo antigo apenas por revalidá-lo. A revisão visual continua sendo reiniciada como pendente.

## `eval` removido e recortes preservados

`src/runtime.js` usava `(0, eval)(value)` para cada coordenada de `crop-at`, permitindo executar JavaScript da string. Foi substituído por [src/crop.js](../src/crop.js), um parser aritmético sem avaliação de código e sem biblioteca adicional.

Aceita números finitos (inclusive negativos/decimais/notação científica), `W`, `H`, `+ - * /` e parênteses, com precedência normal. Comprimento máximo 256 caracteres e profundidade 32. Exige exatamente quatro valores e largura/altura positivas. Números, recortes de tela e projeção pelo `worldToScreen` existente são mantidos.

Exemplo que produz bytes idênticos ao recorte numérico `950,760,500,400` da demo:

```sh
node render.mjs --project=demo --sheet=5.7 "--crop-at=W/2-10,(H+440)/2,5e2,400" --out=out/tracked-expression.jpg
```

Chamadas de função (`Math.min`, `window.close` etc.), propriedades, assignments, templates, statements, divisão por zero e entradas malformadas são recusadas. **Compatibilidade intencionalmente restrita:** expressões JavaScript arbitrárias antigas precisam ser convertidas para números ou essa aritmética. Nenhum recorte executado/documentado pelo projeto exigia esse poder. O guia original arquivado foi mantido como documento histórico; a regra atual está no README e no guia universal.

## Testes executados

| Teste | Resultado / evidência |
|---|---|
| `npm test` | 9 testes passaram: seis existentes + parser/casos hostis + guarda de revisão. |
| `npm run test:visual` | Aquarela/cartoon/pixel determinísticos fora de ordem e em páginas separadas; metadados e configurações preservados; contato zero; p5 isolado; paleta/grade pixel corretas. [Relatório](../out/checks/checks.json). |
| Demo original | Comparação real com os PNGs locais de baseline em 0,5 e 5,7 s, sem diferença de bytes; loop de vistas preservado. |
| Estúdio | Controles, navegação de planos, play/pause, troca de estilo e viewport desktop/celular aprovados pelo teste visual. |
| `node scripts/check-render.mjs` | CLI, retomada, cache incompatível, sequência incompleta, JPEG/PNG→MP4, stills, áudio/padding, expressão de recorte idêntica à numérica e rejeição de execução de código. Revalidação mantém proveniência. [Relatório](../out/checks/render/8085d0383acb/checks.json). |
| `git diff --check` | Verificado ao concluir a auditoria. |

O recorte por expressão foi aberto e inspecionado: rosto, corpo e estrela aparecem na área esperada. O preenchimento preto das outras duas células da folha de uma única imagem é o layout do contato, não um quadro de vídeo.

## Novas entregas e conservação das anteriores

A correção de captura altera o código compartilhado. Foram renderizados novamente os três filmes completos em caminhos novos, sem sobrescrever as entregas anteriores. Todos os novos relatórios têm:

`sourceHash: 8085d0383acbe70a54c027bcf9508866ef149dae1aefdfe341fc5179b5666082`

| Estilo | MP4 da revisão auditada | Bytes | Tempo registrado pelo CLI |
|---|---|---:|---:|
| Aquarela | [video.mp4](../out/visit/watercolor/revisions/8085d0383acb/video.mp4) | 4.086.881 | 153,256 s |
| Cartoon | [video.mp4](../out/visit/cartoon/revisions/8085d0383acb/video.mp4) | 377.143 | 13,222 s |
| Pixel | [video.mp4](../out/visit/pixel/revisions/8085d0383acb/video.mp4) | 87.072 | 14,035 s |

São H.264, 1920×1080, 24 fps, 144 quadros, 6 segundos, sem áudio. FFprobe confirmou esses campos; FFmpeg decodificou os arquivos inteiros. **Os três MP4s novos são idênticos byte a byte aos respectivos antigos**, confirmando que as correções de segurança/rastreabilidade não mudaram a imagem ou o vídeo.

| Estilo | SHA-256 antigo = novo |
|---|---|
| Aquarela | `70507657aedf6d31f7ac3598ea5de723d5c0a6a75bc2a61fe35884fdc9f9f8b2` |
| Cartoon | `ab22b481e2db6619b77a3e3ff7cc98e4f5a5095d8f0e38d77d13f32335550566` |
| Pixel | `721625f3e38e9c25db9c719eeebe4af582133b7ae68a803771af11242f925a83` |

Foram abertas as três novas folhas `decoded-sheet.png` e os três `detail-2.png` extraídos dos MP4s. Conferidos início, aproximação, contato, expressão, partida, aceno e fim. A abertura/fechamento escuros são íris já planejadas. Não se observou defeito novo nessas amostras. A evidência abrange os quadros 0, 17, 35, 57, 78, 97, 117, 134 e 143 e o detalhe de contato; não é alegação de reprodução audiovisual contínua.

Cada relatório `video.mp4.review/report.json` registra o inventário, ambiente e evidências realmente abertas. [Aquarela](../out/visit/watercolor/revisions/8085d0383acb/video.mp4.review/report.json), [cartoon](../out/visit/cartoon/revisions/8085d0383acb/video.mp4.review/report.json), [pixel](../out/visit/pixel/revisions/8085d0383acb/video.mp4.review/report.json).

## Ambiente, tempos e limites

Windows 10 Pro 10.0.19045; AMD Ryzen 5 3600 (6 núcleos/12 threads); 17.128.939.520 bytes de RAM física reportados (~16 GiB); AMD Radeon R9 200, driver 27.20.1034.6. Node 24.15.0, Chrome 155.0.8059.85, FFmpeg 8.0.1 essentials. Aquarela usa ANGLE/D3D11; cartoon/pixel usam Canvas2D.

Os tempos da tabela são medidos por `performance.now()` no CLI, do começo de `main` até terminar a verificação do MP4. Incluem abertura do navegador, quadros, encode e verificação; excluem imports iniciais do Node e fechamento final do browser. Os três jobs foram iniciados em paralelo, portanto não são benchmarks isolados. **Nenhum tempo do filme 3D foi medido, pois ele ainda não foi implementado.**

O `sourceHash` identifica os arquivos usados no pipeline atual (`src/**/*.js`, studio, lockfile, renderer e render-lib), não é o hash de todo o repositório nem de um commit. Documentação, scripts de teste/verificação auxiliar e `out/` ficam fora. Os relatórios registram precisamente esse escopo. O guard de fim protege contra mudanças persistentes durante o job; não é um filesystem imutável contra editar-e-reverter durante uma execução. Mantenha as entradas congeladas durante produção. Assets externos futuros e servidor HTTP entrarão no inventário quando implementados.

`out/` é local e ignorado pelo Git. Não se apagou o histórico para resolver divergências, e não se alterou o hash dos relatórios antigos para aparentar correspondência com código novo.

## Arquivos alterados nesta etapa

- `src/crop.js` (novo), `src/runtime.js`, `studio.html`: parser e captura sem `eval`.
- `render.mjs`, `scripts/render-lib.mjs`: inventário, guarda de revisão e metadados.
- `scripts/verify-video.mjs`: revalidação conserva proveniência de bytes idênticos.
- `scripts/audit-provenance.mjs`, `tests/crop.test.mjs`, `tests/platform.test.mjs`, `scripts/check-render.mjs`: investigação reproduzível e regressões.
- README, guia universal e documentos de auditoria/plano: uso, evidências, compatibilidade e próximos passos.

**Etapa 1 concluída; Etapa 2 planejada e com carregamento verificado. Aguardando aprovação do usuário para iniciar a Etapa 3.**
