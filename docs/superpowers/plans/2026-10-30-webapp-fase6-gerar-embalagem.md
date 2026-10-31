# Webapp Fase 6 (Gerar vídeo e Embalagem) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No app, do canal e do tema até a pasta pronta para upload manual: pauta, fontes, análise de roteiro de outlier, roteiro com fontes, narração, cenas, render, revisão e embalagem. Cada etapa grava o seu resultado, mostra quanto tempo levou e pode ser refeita sozinha.

**Architecture:**
- **Produção:** cada vídeo do app é uma produção, gravada no banco (tabelas `productions` e `production_steps`) com uma pasta em `out/app/prod/<id>/`.
- **Etapas:** cada etapa é um job da fila atual (um pesado por vez, progresso por SSE), com cancelamento.
- **Motor:** as etapas pesadas chamam o motor da fase 5 sem mudá-lo: `runEpisode` de `scripts/episode.mjs`, `render.mjs --stills`, `narrate.mjs`. O app não reimplementa render.
- **Rotas:** cada tarefa tem o seu módulo de rotas (`scripts/app/routes-*.mjs`), ligado pela Task 1 no `app-server.mjs`. Assim as tarefas da onda B não escrevem no mesmo arquivo.
- **Interface:** uma tela `#/gerar`, com um módulo por etapa em `app/views/gen/`.

**Tech Stack:** Node 24 (`node:http`, `node:sqlite`, `node:child_process`, `fetch`, `node:test`), HTML/CSS/módulos ES sem framework, `claude -p`, yt-dlp 2026.03.17, Kokoro (subprocesso), FFmpeg com libass e drawtext, motor de episódio da fase 5.

**Spec:** `docs/superpowers/specs/2026-10-27-webapp-canais-dark-design.md`, seção "Gerar vídeo" (etapas 1 a 9) e "Atualização de 29/10/2026" (Revisão, tempo por etapa, análise de roteiro, 5 conceitos de thumbnail e 15 títulos). A atualização vale sobre o texto antigo. Formato, nomes e segurança seguem o código das fases 1 a 5 na `main`.

## Decisões

1. **Etapas da produção** (`STEPS`, em ordem): `pauta`, `fontes`, `analise` (opcional), `roteiro`, `narracao`, `cenas`, `render`, `revisao`, `embalagem`.
   - Estados: `pending`, `running`, `done`, `error`, `canceled`, `stale`.
   - Refazer uma etapa `done` marca as seguintes que estão `done` como `stale`. Uma etapa `stale` pode ser refeita.
   - Exceção: trocar a cena de um plano marca `cenas` como `stale` sem tocar em `narracao`, porque o texto não mudou (regra na Task 5).
   - Na partida do servidor, etapa `running` vira `error` com a mensagem "Interrompida (servidor reiniciado)".
2. **Tempo por etapa:** `startedAt`, `finishedAt` e `ms` de cada execução. O `render` também guarda o `ms` de cada subetapa do `runEpisode`, tirado das linhas JSON que ele emite (`loops`, `segments`, `mix`, `assemble`, `verify`). A tela mostra todos.
3. **Pastas:**
   - `out/app/prod/<id>/`: `production.json` (a pauta), `sources.json`, `outline.json`, `episode.json`, `roteiro.md`, `timing.json`, `cenas/<shot>.png`, `thumbs/thumb-<n>.png` e `export/`.
   - O id do episódio é `p<id>`, então o motor grava o vídeo em `out/episodes/p<id>/video.mp4`, como na fase 5.
   - Tudo isso fica fora do git, porque `out/` já é ignorado.
4. **Cancelar:** `jobs.cancel(id)` aborta um `AbortSignal` passado à função do job.
   - O executor de processos das etapas (`runCancellable`, Task 1) mata a árvore no aborto: `taskkill /PID <pid> /T /F` no Windows e `kill` nos outros sistemas.
   - O job termina com o status `canceled`. Os arquivos `.partial` do motor ficam, e o motor já ignora e refaz.
5. **Pauta** (Task 2):
   - **Sugestões:**
     - os vídeos outliers dos concorrentes do canal (`my_competitors`) dos últimos 90 dias (`multiple >= cfg.outlierMin`), no máximo 15;
     - mais os temas do `plano30` da modelagem de origem do perfil (`modelId`/`conceptIndex`), se houver.
   - Cada sugestão traz `{ tema, origem: 'outlier' | 'plano30', ref }`: o id do vídeo e o número de views coletado com data, ou o dia do plano.
   - O usuário escolhe ou escreve o tema (de 3 a 200 caracteres), a duração alvo ± tolerância (padrão do perfil; de 10 a 120 e de 1 a 15 min) e o estilo (`EPISODE_STYLES`, padrão do perfil).
6. **Fontes** (Task 2):
   - **Wikipedia REST, sem chave e sem e-mail:**
     - busca: `https://<lang>.wikipedia.org/w/rest.php/v1/search/page?q=<q>&limit=10`;
     - texto: `https://<lang>.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=<título>`.
   - O `lang` vem do perfil (`pt` ou `en`).
   - Cabeçalho `User-Agent: ClaudeAnimationBase-app/1.0 (local; sem contato)`. Nenhum dado pessoal vai no cabeçalho, conforme o `CLAUDE.md`.
   - O texto é cortado em 20 000 caracteres por fonte.
   - **Link colado:** o app **não busca** a URL (sem SSRF). O usuário cola URL `https://`, título e um trecho de até 5000 caracteres.
   - Cada fonte marcada é gravada em `sources.json` como `{ url, title, accessed (AAAA-MM-DD), text, kind: 'wikipedia' | 'link' }`. São de 1 a 12 fontes.
7. **Análise de roteiro de outlier** (Task 3):
   - O yt-dlp baixa só a legenda: `yt-dlp --skip-download --write-auto-subs --write-subs --sub-langs "<lang>.*,<lang>" --sub-format vtt -o <dir>/%(id)s https://www.youtube.com/watch?v=<id>`, com o `id` validado em `^[A-Za-z0-9_-]{11}$`.
   - O VTT vira texto: as linhas repetidas da legenda automática caem, e a tag `<c>` e os tempos saem.
   - O prompt `prompts/analise-roteiro.md` devolve o padrão:
     - `gancho` ≤ 400;
     - `estrutura`: de 3 a 12 itens `{ parte ≤ 60, funcao ≤ 200, proporcao 0..1 }`;
     - `ritmo` ≤ 400;
     - `tecnicas`: de 3 a 10, cada uma ≤ 200.
   - Rejeita com "Análise copiou trecho do vídeo" se algum campo tiver 8 palavras seguidas iguais às da transcrição (normalizadas sem acento e sem caixa).
   - Grava na tabela `script_analyses` por vídeo. De 0 a 3 análises entram no roteiro só como padrão.
   - Vídeo sem legenda mostra "Vídeo sem legenda", e a etapa segue.
8. **Roteiro** (Task 4), em duas fases de `claude -p` (timeout de 600 s por chamada):
   - **Meta de palavras:** `wpm` = `cfg.voiceWpm["<voz>|<speed>"]`, ou 150 se não medido (avisa "ritmo da voz não medido").
     - alvo = `targetMin × wpm`;
     - mínimo = `(targetMin − toleranceMin) × wpm`;
     - máximo = `(targetMin + toleranceMin) × wpm`.
     - Narração e `hold` fora do texto não contam.
   - **Esboço** (`prompts/roteiro-esboco.md` → `validateOutline`):
     - `titulo` ≤ 100;
     - `elenco`: de 1 a 4 `{ id, body, colors, gear }` dentro do catálogo;
     - `capitulos`: de 3 a 30 `{ id, titulo ≤ 80, resumo ≤ 400, palavras }`, cuja soma fica entre o mínimo e o máximo.
   - **Capítulo** (`prompts/roteiro-capitulo.md` → `validateChapter`), um por capítulo:
     - `planos`: `[{ id, narracao, fontes: [índices de sources], cena: { id, params }, atores, hud? }]`.
     - Cada plano narrado tem de **30 a 120 s de fala** (palavras entre `wpm/2` e `2·wpm`).
     - Cada plano narrado cita pelo menos 1 fonte válida.
     - Cena, `extras`, ações, `gear` e `hud` vêm do catálogo (`kitCatalog`, Task 1) e do `episodeScenes` do estilo.
     - O capítulo fica dentro de ±15% das `palavras` do esboço.
   - Capítulo fora da regra é refeito até 2 vezes, com a mensagem de erro no prompt. Na terceira falha, a etapa termina em `error` com o capítulo e o motivo.
   - **Os fatos vêm só das fontes:** o prompt manda os trechos numerados de `sources.json` e proíbe fato que não esteja neles. As análises de outlier entram como "padrão de estrutura, não copie".
   - **Montagem:** `episode.json` com:
     - `id: p<id>`, `title`, `style`;
     - `voice` e `lengthScale = 1 / speed` do perfil;
     - `intro: 1.5`, `outro: 2`;
     - `sources` (sem o campo `text`), `cast` e `chapters`;
     - `cites` por plano, com os índices das fontes.

     Ela precisa passar em `validateEpisode`.
   - **Repetição:** planos seguidos com a mesma cena e os mesmos parâmetros ganham `seed + 1` (`dedupeShots`, puro). O roteiro tem pelo menos 12 planos por hora (`ceil(12 · targetMin / 60)`).
   - `roteiro.md` traz o título, os capítulos e a narração com `[n]` das fontes, e no fim a lista numerada das fontes com data de acesso.
   - A tela mostra as palavras por capítulo contra a meta. O usuário pode editar a narração de um plano (revalida) ou refazer um capítulo.
9. **Narração, cenas, render e revisão** (Task 5):
   - **`narracao`:** `runEpisode(dir, { steps: ['narrate'] })`, depois a duração real (`timing.json`) contra a alvo. Fora da tolerância, mostra aviso, sem bloquear.
   - **`cenas`:**
     - `runEpisode(dir, { steps: ['build'] })`;
     - um still por plano, `node render.mjs --project=ep-p<id> --stills=<meio do plano no storyboard> --out=<dir>/cenas-tmp`, renomeado para `cenas/<shot>.png`;
     - folha de contato na tela;
     - **trocar cena** de um plano: edita `scene` e `atores` dentro do catálogo, revalida `episode.json` e marca `cenas` e o que vem depois como `stale`. A narração não muda.
   - **`render`:** `runEpisode(dir, { steps: ['loops', 'segments', 'mix', 'assemble', 'verify'] })`, com progresso das linhas JSON e cancelamento. Só fica `done` com a mensagem de `verify`.
   - **`revisao`:** player do `video.mp4` (rota com Range). Dois botões:
     - "Aprovar" (`done`);
     - "Trocar plano", que volta para `cenas`.

     A `embalagem` não exporta sem a `revisao` aprovada.
10. **Embalagem** (Task 6):
    - **`prompts/embalagem.md` → `validatePackaging`:**
      - `titulos`: **15** `{ titulo ≤ 100, molde (um dos moldes do perfil ou null), porque ≤ 200 }`;
      - `thumbs`: **5** conceitos `{ plano (id de plano do episódio), texto (≤ 4 palavras, ≤ 28 caracteres), cor (#RRGGBB), composicao ≤ 200, porque ≤ 200 }`;
      - `tags`: de 5 a 15, cada uma ≤ 30.
    - Título igual a um título de concorrente (normalizado como na modelagem) é rejeitado com "Embalagem copiou um título".
    - **Capítulos** (puro): `MM:SS Título` (ou `H:MM:SS`) com os inícios do `timing.json`. O primeiro vai para `0:00`. Exige pelo menos 3 capítulos de no mínimo 10 s; sem isso, os capítulos saem da descrição e aparece um aviso.
    - **Descrição:** `descriptionTemplate` do perfil com `{fontes}` (lista numerada com URL e data) e `{capitulos}`. Sem molde: resumo do esboço + capítulos + fontes.
    - **SRT** (puro): de `timing.shots[].speech[]`, um bloco por frase, quebrado como `chunks(words, 44)`.
    - **Thumbnail:**
      - still do meio do plano, em 1280×720;
      - `ffmpeg` com `drawtext`: fonte `assets/fonts/PressStart2P-Regular.ttf` no `pixel` e `AtkinsonHyperlegible-Bold.ttf` nos outros; texto do conceito na cor dele, borda preta de 6 px, altura de 12% da imagem, terço inferior;
      - um PNG por conceito, `thumbs/thumb-<n>.png`.
    - **Exportar:** `export/` com:
      - `video.mp4` (cópia);
      - `titulo.txt` (o escolhido);
      - `descricao.txt`, `legendas.srt` e `tags.txt`;
      - `thumb.png` (a escolhida);
      - `fontes.md`.

      Exportar de novo sobrescreve.
11. **Catálogo do kit** (Task 1):
    - `src/episode/kit.js` passa a exportar `KIT_CATALOG = { times, weathers, framings, actions, gear, bodies }`, com as constantes que já existem.
    - `scripts/episode-lib.mjs` ganha `kitCatalog(style)`, que devolve:
      - `{ scenes: { [id]: { extras, exterior } }`, filtrado pelo `episodeScenes` do estilo;
      - mais o resto do `KIT_CATALOG` e `hud: ['year', 'sub', 'place', 'tag']`.
    - O app nunca fixa a lista de ações, porque a branch `feat/pixel-sprites-v2` acrescenta ações ao kit.
12. **Ligação no servidor:** `startAppServer` ganha os injetáveis `claudeLong` (`runClaude` com 600 s), `spawnProc` (para `runCancellable`), `runEpisodeFn` (padrão `runEpisode`) e `ytdlp`. Cada `routes-*.mjs` exporta `default (ctx) => ROUTES[]`, e o `ctx` é descrito na Task 1.

## Global Constraints

- **Ambiente:**
  - Windows 10, Node 24, FFmpeg/FFprobe, yt-dlp, Kokoro em `out/tmp/kokoro-venv`, `claude` no PATH.
  - Sem dependências npm novas.
- **Segurança das fases anteriores:**
  - 127.0.0.1;
  - checagem de `Host`;
  - em POST, `Origin` igual ao servidor e `X-App-Token`;
  - CSP;
  - DOM só com `createElement`/`textContent`, nunca `innerHTML`;
  - mensagens de erro sem caminho ou stack.
- **Dados sensíveis:**
  - A chave da API nunca aparece em código, teste, log, prompt ou commit.
  - Nenhum e-mail ou nome do usuário vai a serviço externo (Wikipedia, yt-dlp).
- **Fontes e cópia:**
  - Fato de roteiro só com fonte registrada (`url`, `title`, `accessed`). Números vêm das fontes, nunca do modelo.
  - Não copiar títulos, roteiros nem thumbnails de concorrentes. A análise de outlier é padrão, não texto.
  - O yt-dlp só baixa legenda. Nunca baixa vídeo nem áudio.
  - Texto de terceiros (títulos, legendas, trechos de fonte) entra nos prompts entre `<<<DADOS` e `DADOS>>>`, como em `prompts/modelagem.md`.
- **Fronteiras do código:**
  - **Não mexa** em `src/styles/`, `src/nature/` nem em `fixtures/smoke/`. Uma branch paralela (`feat/pixel-sprites-v2`) mexe neles.
  - Em `src/episode/kit.js`, só a exportação do `KIT_CATALOG` (Task 1), como mudança mínima na linha do `var {...}` e na do `return`.
  - Mudanças no motor (`scripts/episode*.mjs`, `render.mjs`) só onde o plano diz: `kitCatalog` na Task 1.
- **Testes:** usam falsos injetados, sem rede, `claude`, Kokoro, Chrome ou yt-dlp de verdade. As respostas da Wikipedia e o VTT ficam gravados em `tests/fixtures/`.
- **Execução:** em git worktree próprio, porque a pasta principal está com outra sessão na branch `feat/pixel-sprites-v2`. Branch `feat/webapp-fase6` a partir da `main`.
- Commits em inglês, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Os testes atuais continuam passando.

## Review Focus

1. **Cancelar no meio do render:** o Chrome e o FFmpeg morrem (árvore toda), o job fica `canceled`, e "refazer" retoma pelo acervo sem arquivo corrompido. Teste `cancel kills the process tree and marks canceled` na Task 1 (spawn falso que registra o `taskkill`) e passo manual no aceite.
2. **O Claude devolve cena, ação ou fonte fora do catálogo:** o capítulo é refeito com o erro no prompt, e na terceira vez a etapa termina em `error` legível, sem travar a fila. Teste `chapter retries with the validation error then fails readable` na Task 4.
3. **Servidor reiniciado com etapa `running`:** vira `error` "Interrompida (servidor reiniciado)" e pode ser refeita. Teste `running steps become interrupted on start` na Task 1.
4. **Nome de arquivo forjado na rota de arquivos** (`..`, `%2e`, `video.mp4/../x`, id não numérico): 403 ou 404 sem ler fora da pasta. Teste `file route serves only whitelisted names with Range` na Task 1.
5. **Tema ou trecho de fonte com instrução** ("ignore as regras..."): entra entre os marcadores de dados, e a saída continua validada pelo formato. Teste `prompts wrap third-party text as data` nas Tasks 3, 4 e 6.

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1 (base de produção) | opus | high |
| 2 (pauta e fontes) | sonnet | high |
| 3 (análise de roteiro) | sonnet | high |
| 4 (roteiro) | opus | high |
| 5 (narração, cenas, render, revisão) | opus | medium |
| 6 (embalagem) | sonnet | high |
| 7 (aceite real) | sessão principal | — |

## Ondas

- A: Task 1.
- B: Tasks 2, 3, 5 e 6 em paralelo. Cada uma escreve só os seus arquivos; as Tasks 5 e 6 testam com `fixtures/episodes/demo`.
- C: Task 4 (usa `sources.json` da 2 e `script_analyses` da 3).
- D: Task 7.

## Estrutura de arquivos

| Arquivo | Dono |
| ------- | ---- |
| `scripts/app/db.mjs`, `scripts/app/jobs.mjs`, `scripts/app/production.mjs` (novo), `scripts/app/routes-production.mjs` (novo), `scripts/app-server.mjs`, `src/episode/kit.js`, `scripts/episode-lib.mjs`, `app/main.js`, `app/app.css`, `app/views/generate.js` (novo), `app/views/mychannels.js` | Task 1 |
| `scripts/app/pauta.mjs`, `scripts/app/wikipedia.mjs`, `scripts/app/routes-sources.mjs`, `app/views/gen/pauta.js`, `app/views/gen/fontes.js` | Task 2 |
| `scripts/app/subs.mjs`, `prompts/analise-roteiro.md`, `scripts/app/routes-analysis.mjs`, `app/views/gen/analise.js` | Task 3 |
| `scripts/app/roteiro.mjs`, `prompts/roteiro-esboco.md`, `prompts/roteiro-capitulo.md`, `scripts/app/routes-roteiro.mjs`, `app/views/gen/roteiro.js` | Task 4 |
| `scripts/app/render-steps.mjs`, `scripts/app/routes-render.mjs`, `app/views/gen/narracao.js`, `app/views/gen/cenas.js`, `app/views/gen/render.js`, `app/views/gen/revisao.js` | Task 5 |
| `scripts/app/package.mjs`, `prompts/embalagem.md`, `scripts/app/routes-package.mjs`, `app/views/gen/embalagem.js` | Task 6 |

A Task 1 cria os arquivos `routes-*.mjs` e `app/views/gen/*.js` como stubs: `export default () => []` e uma função `render` que escreve "Etapa em construção". Cada dono substitui o stub inteiro. Os testes são `tests/app-<módulo>.test.mjs`, um por dono.

---

### Task 1: Base de produção

**Files:** os da tabela acima, mais `tests/app-production.test.mjs`. Estende `tests/app-jobs.test.mjs`, `tests/app-db.test.mjs` e `tests/app-server.test.mjs`.

**Interfaces:**
- **Produces, em `db.mjs`:**
  - `createProduction({ myId, theme, targetMin, toleranceMin, style }) -> id`;
  - `production(id) -> { id, myId, theme, targetMin, toleranceMin, style, createdAt, steps: { [step]: { status, startedAt, finishedAt, ms, result, error } } } | null`;
  - `productions({ myId } = {}) -> [...]`, do mais novo ao mais antigo, sem `result`;
  - `setStep(id, step, patch)`;
  - `deleteProduction(id)`;
  - `interruptRunning() -> n`;
  - `saveScriptAnalysis(videoId, { lang, output }) / scriptAnalysis(videoId)`.
  - Tabelas:
    - `productions(id INTEGER PRIMARY KEY, my_id INT NOT NULL REFERENCES my_channels(id) ON DELETE CASCADE, theme, target_min, tolerance_min, style, created_at)`;
    - `production_steps(prod_id INT NOT NULL REFERENCES productions(id) ON DELETE CASCADE, step TEXT NOT NULL, status, started_at, finished_at, ms INT, result TEXT, error, PRIMARY KEY(prod_id, step))`;
    - `script_analyses(video_id TEXT PRIMARY KEY, at, lang, output TEXT)`.
- **Produces, em `jobs.mjs`:** `start(kind, fn)`, com `fn(report, signal)`, e `cancel(id) -> boolean`, com o status `canceled` e o evento `end { status: 'canceled' }`.
- **Produces, em `production.mjs`:**
  - `STEPS` (decisão 1);
  - `prodDir(outDir, id)`, `epId(id) = 'p' + id`, `invalidateAfter(steps, step) -> steps` (puro);
  - `runStep({ db, id, step, signal, report }, fn) -> result`, que grava `running` → `done`/`error`/`canceled` com `ms` e marca as seguintes `stale` quando a etapa já estava `done`;
  - `runCancellable(signal, { spawn }) -> (cmd, args) => Promise<stdout>`, compatível com o `run` de `runEpisode`.
- **Produces, em `episode-lib.mjs`:** `kitCatalog(style)` (decisão 11).
- **Produces, contrato de `routes-*.mjs`:**
  - `export default function (ctx) -> [[method, regex, fn], ...]`;
  - `ctx = { db, cfg, now, no, nf, fail, readJson, job, jobs, outDir, ROOT, prod(id) /* production ou 404 */, step: (id, name, fn) => jobId /* runStep dentro de um job */, inject: { claudeLong, claudeImages, spawnProc, runEpisodeFn, ytdlp, fetch } }`.
- **Produces, rotas em `routes-production.mjs`:**
  - `GET /api/productions?my=<id>`;
  - `POST /api/productions` (cria com a pauta mínima);
  - `GET /api/productions/:id`;
  - `POST /api/productions/:id/delete`;
  - `POST /api/jobs/:id/cancel`;
  - `GET /api/productions/:id/files/:name`, com `name` em `^(video\.mp4|mix\.m4a|roteiro\.md|legendas\.srt|descricao\.txt|tags\.txt|titulo\.txt|(cena|thumb)-[a-z0-9-]+\.png)$`, Range (206) para mp4 e m4a e `Content-Type` por extensão. `video.mp4` e `mix.m4a` vêm de `out/episodes/p<id>/`, `cena-<shot>.png` de `cenas/<shot>.png`, `thumb-<n>.png` de `thumbs/`, e o resto da pasta da produção.
- **Produces, interface:**
  - `#/gerar`: lista das produções, com etapa atual, status e tempo total, e botão "Nova produção";
  - `#/gerar?id=N&passo=<step>`: barra de etapas com status e `ms`, que carrega `./gen/<step>.js`;
  - contrato de cada etapa: `export async function render(root, prod, { reload })`;
  - em Meus canais, a lista das produções do canal.

- [ ] **Step 1: Write failing tests:**
  - `runStep records ms and marks later done steps stale`;
  - `invalidateAfter is pure`;
  - `running steps become interrupted on start`;
  - `cancel kills the process tree and marks canceled` (spawn falso; no Windows espera `taskkill /PID <pid> /T /F`);
  - `file route serves only whitelisted names with Range` (`Range: bytes=0-9` → 206 e 10 bytes; `../`, `%2e`, `video.mp4x` e id `abc` → 403/404);
  - `kitCatalog lists scenes of the style and actions from the kit` (`kitCatalog('pixel').actions` contém `walk`, e `scenes` tem as 8 cenas com `extras`);
  - `deleting a my channel cascades productions`.
- [ ] **Step 2: Run** `node --test tests/app-production.test.mjs tests/app-jobs.test.mjs tests/app-db.test.mjs tests/app-server.test.mjs`. Expected: FAIL nos novos.
- [ ] **Step 3: Implement** banco, jobs, `production.mjs`, `kitCatalog`, `KIT_CATALOG`, rotas, stubs, `generate.js`, menu "Gerar vídeo" depois de "Meus canais" e os estilos genéricos em `app.css` (barra de etapas, tempos, grade de imagens, player).
- [ ] **Step 4: Run** os testes do Step 2 (PASS) e `npm test` (PASS).
- [ ] **Step 5: Smoke:** `node scripts/app-server.mjs`, abra `#/gerar` e crie uma produção num dos Meus canais. Expected: a barra mostra as 9 etapas `pending`.
- [ ] **Step 6: Commit** `feat: app productions, steps, cancel and file route`.

### Task 2: Pauta e fontes

**Files:** os da tabela, `tests/app-pauta.test.mjs`, `tests/app-wikipedia.test.mjs`, `tests/fixtures/wikipedia/*.json`.

**Interfaces:**
- **Consumes:** `ctx` da Task 1; `db.videoRowsAll(t)` e `db.myChannel(id)`; `db.model(id).output.conceitos[i].plano30`.
- **Produces:**
  - `suggestThemes({ my, competitorRows, model, cfg, now }) -> [{ tema, origem, ref }]`, puro;
  - `wikiSearch(lang, q, { fetch }) -> [{ title, url, snippet }]`;
  - `wikiText(lang, title, { fetch, now }) -> { url, title, accessed, text, kind: 'wikipedia' }`;
  - `validateLink({ url, title, excerpt }, now) -> source`;
  - grava `production.json` e `sources.json`;
  - rotas `GET /api/productions/:id/pauta`, `POST .../pauta`, `GET /api/wiki/search?lang&q`, `POST .../fontes`.

- [ ] **Step 1: Tests:**
  - `suggestThemes mixes outliers and plano30 with collected numbers`;
  - `wikiSearch builds the REST url without personal data` (o `fetch` falso confere URL e cabeçalhos: só `User-Agent` da decisão 6);
  - `wikiText caps text at 20000 chars and sets accessed`;
  - `validateLink rejects non-https and long excerpts`;
  - `fontes needs 1 to 12 sources`;
  - `pauta validates theme length, target and tolerance ranges`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** os módulos, as rotas e as telas `gen/pauta.js` e `gen/fontes.js`.
  - `fontes.js` mostra a busca, a prévia do trecho e a marcação.
  - Wikipedia fora do ar mostra "Wikipedia indisponível" e deixa colar links.
- [ ] **Step 4: Run** os testes (PASS) e `npm test`.
- [ ] **Step 5: Commit** `feat: production theme suggestions and wikipedia sources`.

### Task 3: Análise de roteiro de outlier

**Files:** os da tabela, `tests/app-subs.test.mjs`, `tests/fixtures/subs/sample.pt.vtt`.

**Interfaces:**
- **Consumes:** `ctx` (`inject.ytdlp`, `inject.claudeLong`), `db.saveScriptAnalysis` e `db.scriptAnalysis`.
- **Produces:**
  - `ytdlpArgs(id, lang, dir) -> string[]` (decisão 7);
  - `vttToText(vtt) -> string`;
  - `analysisPrompt(template, { video, transcript }) -> string`;
  - `validateScriptAnalysis(o, transcript) -> output`;
  - rotas `GET /api/productions/:id/analise` (outliers candidatos: os mesmos da pauta, com a marca "já analisado") e `POST .../analise { videoIds: [≤ 3] }` (job: legenda → Claude → grava);
  - a etapa `analise` fica com `result: { videoIds }`.

- [ ] **Step 1: Tests:**
  - `ytdlpArgs only downloads subtitles` (contém `--skip-download` e nenhum formato de vídeo; id inválido lança);
  - `vttToText drops rolling duplicates and tags`;
  - `validateScriptAnalysis rejects 8-word copies`;
  - `prompts wrap third-party text as data`;
  - `video without subtitles is reported, not fatal`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** os módulos, o prompt e a tela `gen/analise.js`: escolher até 3 outliers, ver o padrão de cada um e pular a etapa.
- [ ] **Step 4: Run** os testes (PASS) e `npm test`.
- [ ] **Step 5: Commit** `feat: outlier script pattern analysis from auto subtitles`.

### Task 4: Roteiro

**Files:** os da tabela, `tests/app-roteiro.test.mjs`.

**Interfaces:**
- **Consumes:**
  - `kitCatalog(style)` e `validateEpisode` de `scripts/episode-lib.mjs`;
  - `sources.json` da Task 2 e `db.scriptAnalysis` da Task 3;
  - o perfil (`voice`, `speed`, `lang`, `titleTemplates`) e `cfg.voiceWpm`.
- **Produces:**
  - `wordBudget({ targetMin, toleranceMin, wpm }) -> { min, target, max }`;
  - `outlinePrompt / validateOutline(o, { catalog, budget })`;
  - `chapterPrompt / validateChapter(o, { catalog, scenes, nSources, words, wpm })`;
  - `dedupeShots(shots) -> shots`;
  - `buildEpisode({ id, outline, chapters, sources, profile, style }) -> episode`;
  - `roteiroMd(episode, sources) -> string`;
  - `writeRoteiro(dir, ...)`, que grava `outline.json`, `episode.json` e `roteiro.md`;
  - rotas:
    - `POST /api/productions/:id/roteiro` (job: esboço, depois capítulos, com progresso "capítulo n de N");
    - `POST .../roteiro/capitulo { id }` (refaz um);
    - `POST .../roteiro/plano { id, narracao }` (edita e revalida);
    - `GET .../roteiro`, com as palavras por capítulo contra a meta e os avisos.

- [ ] **Step 1: Tests:**
  - `wordBudget uses measured wpm or 150 with warning`;
  - `validateOutline sums words within budget`;
  - `validateChapter enforces catalog, cites and 30-120 s shots`;
  - `chapter retries with the validation error then fails readable` (o Claude falso responde inválido 3 vezes; a 2ª e a 3ª chamadas contêm a mensagem de erro);
  - `dedupeShots bumps seed of consecutive equal shots`;
  - `buildEpisode passes validateEpisode and keeps sources without text`;
  - `at least 12 shots per hour`;
  - `prompts wrap third-party text as data`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** os módulos, os 2 prompts e a tela `gen/roteiro.js`: esboço, capítulos com contagem contra a meta, editar plano e refazer capítulo.
- [ ] **Step 4: Run** os testes (PASS) e `npm test`.
- [ ] **Step 5: Real smoke:** com `claude` de verdade, gere o roteiro de 10 min numa produção de teste, abra `roteiro.md` e confira:
  - toda frase com fato tem `[n]`;
  - nenhum número aparece fora das fontes;
  - a contagem está dentro da meta.
- [ ] **Step 6: Commit** `feat: sourced script generation by chapters`.

### Task 5: Narração, cenas, render e revisão

**Files:** os da tabela, `tests/app-render-steps.test.mjs`.

**Interfaces:**
- **Consumes:**
  - `ctx.step`, `inject.runEpisodeFn` e `runCancellable` da Task 1;
  - `episodeProject` de `scripts/build-episode.mjs`, para o storyboard;
  - `kitCatalog` e `validateEpisode`.
- **Produces:**
  - `stillTimes(storyboard) -> [{ shot, t }]`, com o meio de cada plano;
  - `swapScene(episode, shotId, { scene, actors }, catalog) -> episode`, que lança se mudar a narração ou sair do catálogo;
  - `renderProgress(line) -> { message, done, total, sub?: { step, ms } }`, que lê uma linha JSON do `runEpisode`;
  - rotas:
    - `POST /api/productions/:id/narracao`;
    - `POST .../cenas`;
    - `POST .../cenas/trocar { shot, scene, actors }`;
    - `POST .../render`;
    - `POST .../revisao { aprovado: true }`;
    - `POST .../revisao/voltar`.
  - a etapa `render` fica com `result: { verify, subSteps: { loops: ms, ... } }`;
  - a etapa `narracao` fica com `result: { duration, targetS, within }`.

- [ ] **Step 1: Tests:**
  - `stillTimes picks the middle of each shot`;
  - `swapScene keeps narration and validates catalog`;
  - `render step records sub-step ms from runEpisode lines`;
  - `render done only with verify message`;
  - `narration warns outside tolerance without failing`;
  - `swap marks cenas and later stale, not narracao`.

  Use `runEpisodeFn` falso que emite as linhas da demo.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** os módulos e as telas:
  - `gen/narracao.js`: duração contra a alvo e player do `mix`;
  - `gen/cenas.js`: grade com o still e a cena de cada plano, e o formulário de troca dentro do catálogo;
  - `gen/render.js`: progresso, subetapas com tempo e cancelar;
  - `gen/revisao.js`: player, aprovar e trocar plano.
- [ ] **Step 4: Run** os testes (PASS) e `npm test`.
- [ ] **Step 5: Real smoke com a demo:**
  - copie `fixtures/episodes/demo` para uma produção de teste;
  - rode `cenas` e `render` pela tela;
  - cancele uma vez no meio dos `loops` e refaça;
  - aprove na revisão.

  Expected: o Chrome some do Gerenciador de Tarefas ao cancelar, e o vídeo final passa no `verify`.
- [ ] **Step 6: Commit** `feat: app narration, scenes contact sheet, render and review`.

### Task 6: Embalagem

**Files:** os da tabela, `tests/app-package.test.mjs`.

**Interfaces:**
- **Consumes:**
  - `timing.json`, `episode.json`, `sources.json` e o perfil;
  - `chunks` de `scripts/episode-lib.mjs`;
  - os títulos dos concorrentes (`db.videoRowsAll`);
  - a etapa `revisao` `done`, para exportar.
- **Produces:**
  - `chaptersText(timing) -> { text, ok, warning? }`;
  - `descriptionText({ template, summary, chapters, sources }) -> string`;
  - `srtFrom(timing) -> string`;
  - `packagingPrompt / validatePackaging(o, { shots, templates, competitorTitles })`;
  - `thumbArgs({ still, text, color, font, out }) -> string[]` (ffmpeg);
  - `exportPackage(dir, choice) -> { files }`;
  - rotas:
    - `POST /api/productions/:id/embalagem` (job: Claude → thumbs);
    - `GET .../embalagem`;
    - `POST .../embalagem/exportar { titulo, thumb }`.

- [ ] **Step 1: Tests:**
  - `chaptersText starts at 0:00 and needs 3 chapters of 10 s`;
  - `descriptionText fills {fontes} and {capitulos}`;
  - `srtFrom matches speech timings`;
  - `validatePackaging needs 15 titles and 5 thumbs on real shots`;
  - `packaging rejects copied competitor title`;
  - `thumbArgs uses the style font and escapes text`;
  - `export refuses without approved review`;
  - `prompts wrap third-party text as data`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** os módulos, o prompt e a tela `gen/embalagem.js`:
  - 15 títulos com o porquê e escolha;
  - 5 thumbs com o porquê e escolha;
  - descrição editável antes de exportar;
  - botão "Exportar" com o caminho da pasta.
- [ ] **Step 4: Run** os testes (PASS) e `npm test`.
- [ ] **Step 5: Smoke com a demo:**
  - gere a embalagem e abra as 5 thumbs com Read;
  - exporte e confira os arquivos.

  Expected: o texto da thumb é legível em 320 px de largura.
- [ ] **Step 6: Commit** `feat: packaging with 15 titles, 5 thumbnails, chapters, srt and export`.

### Task 7: Aceite real

**Files:** `docs/VALIDATION.md` (uma entrada curta).

- [ ] **Step 1:** No app, num dos Meus canais (`pt`, estilo `pixel`), faça uma produção de **10 min ± 2**:
  - pauta sugerida de um outlier;
  - de 3 a 5 fontes da Wikipedia;
  - análise de 1 outlier;
  - roteiro, narração, cenas (troque 1 plano), render, revisão e embalagem.
- [ ] **Step 2:** Anote o tempo de cada etapa, que a tela mostra, e a duração final contra a alvo. Rode `verify-video`, abra o `decoded-sheet.png` e 2 thumbs, e leia o `roteiro.md` inteiro conferindo as fontes.
- [ ] **Step 3:** `export/`:
  - os 7 arquivos presentes;
  - descrição com capítulos que começam em 0:00;
  - SRT abrindo no player com tempos certos.
- [ ] **Step 4:**
  - `npm test` e `npm run test:visual`. Expected: PASS.
  - `git status --porcelain data/ out/ src/episodes.js`. Expected: vazio.
  - `git grep` pela chave da API e pelo e-mail do usuário. Expected: nada.
- [ ] **Step 5:** Registre em `docs/VALIDATION.md` o tema, as durações, os tempos por etapa e o que foi trocado. Commit `docs: webapp phase 6 acceptance`.
