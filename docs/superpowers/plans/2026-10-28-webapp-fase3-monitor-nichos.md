# Webapp Fase 3 (Monitoramento, Concorrentes e Nichos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seguir canais, atualizar todo dia com o app aberto e alertar (sino), comparar concorrentes marcados à mão e agrupar a base em nichos com os nichos vizinhos ("dobras").

**Architecture:**
- **Lógica pura:** detecção de alertas, decisão de rodar o monitoramento automático e agrupamento em nichos, nos novos `monitor.mjs` e `niches.mjs`.
- **Coleta:** o monitoramento reaproveita `ingestChannels` (fase 1) com `fresh: true`, sem cache.
- **Servidor:** ganha rotas na tabela `ROUTES`, um temporizador de hora em hora (o "automático com o app aberto") e uma validação nova para o LLM de subnichos.
- **Interface:** abre as três telas e o sino.

**Tech Stack:** Node 24 (`node:http`, `node:sqlite`, `node:child_process`, `fetch`, `node:test`), HTML/CSS/módulos ES sem framework, YouTube Data API v3, `claude -p`.

**Spec:** `docs/superpowers/specs/2026-10-27-webapp-canais-dark-design.md`: seções "Nichos", "Concorrentes" e "Monitoramento", a "Visão geral" (alertas) e a fase 3. Formato, nomes e segurança seguem o código das fases 1 e 2, já na `main`.

## Decisões

Pontos que o spec deixa abertos, decididos aqui:

1. **Concorrente marcado à mão por enquanto.** A tabela `watch` guarda `competitor`, sem ligar a um canal do usuário. Na fase 4, Meus canais liga cada concorrente a um perfil. A tela Concorrentes da fase 3 compara todos os marcados.
2. **Seguir e concorrente ficam numa tabela nova `watch`.** Assim `channels` não muda e não precisa de migração.
3. **Monitoramento usa `ingestChannels` com `fresh: true`.** A busca ignora o cache, mas grava nele. O custo é `estimateMonitor(n) = ceil(n/50) + 2n` unidades (50 canais: 101).
4. **Trava de cota:** se `estimateMonitor` passar do que resta no dia, o job falha antes de qualquer chamada, com `Cota insuficiente: monitorar N canais custa ~X unidades, restam Y`.
5. **Primeira coleta de um canal seguido é a linha de base.** Ela grava `last_run` e não gera alerta.
6. **Alertas** (sem duplicar: `UNIQUE(kind, ref)`):
   - `newVideo`: id de vídeo novo desde a coleta anterior, publicado há no máximo 7 dias. `ref` = id do vídeo.
   - `outlier`: vídeo publicado há no máximo 30 dias com `multiple >= cfg.outlierMin`. `ref` = id do vídeo.
   - `subsJump`: inscritos subiram pelo menos `cfg.subsJumpPct` % (padrão 10) e pelo menos 100 desde a coleta anterior. Os dois valores precisam existir e o anterior precisa ser maior que 0. `ref` = `<canal>@<at>`.
7. **Automático com o app aberto:**
   - O servidor checa na partida e depois a cada 60 min (`setInterval(...).unref()`).
   - Roda se `cfg.monitorAuto` (padrão `true`), se há canal seguido e se a última entrada `monitor` do histórico (feita ou pulada) tem 24 h ou mais.
   - Sem cota, grava uma entrada `monitor` com `status: 'skipped'` e só tenta de novo 24 h depois, sem repetir a cada hora.
8. **Nichos sem LLM:**
   - Canal com etiqueta manual entra no nicho da etiqueta (`tag:<etiqueta em minúsculas>`).
   - Os sem etiqueta se agrupam por ligação simples (union-find) quando a semelhança de `similarChannels` (70% palavras, 30% tópicos) é ≥ `cfg.nicheMin` (padrão 25).
   - Grupo de 2 ou mais canais: id `c:<menor id>`, nome com as 3 palavras mais frequentes ligadas por " · ".
   - Canal sozinho vai para "Sem grupo" (`solo`).
   - Vizinhos: Jaccard das 20 palavras mais frequentes de cada nicho ≥ 0,1. Mostra os 3 maiores, com até 5 palavras em comum.
9. **Etiquetar um grupo automático:** um botão grava a etiqueta em todos os canais do grupo que ainda não têm etiqueta. É a confirmação que o design pede (chamada 13).
10. **Subnichos pelo Claude:**
    - O botão do nicho manda os títulos outliers do nicho para o Claude (até 30, no formato `views | múltiplo | título`).
    - A resposta esperada é `{ subnichos: [{ nome, porque, exemplos[] }] }`: de 1 a 8 subnichos, `nome` com até 80 caracteres, `porque` com até 300 e até 3 `exemplos` de até 120 caracteres cada.
    - A resposta é validada e não é gravada.
    - O prompt proíbe copiar títulos, e os exemplos são moldes.
11. **Id de nicho passa por query ou corpo, nunca no caminho.** O caminho só aceita `[A-Za-z0-9_./-]`, e a etiqueta pode ter acento ou `:`.

## Global Constraints

- Sem dependências npm novas. Só módulos `node:*`, `fetch` global e o executável `claude` do PATH.
- Segurança das fases 1 e 2 sem mudança:
  - só `127.0.0.1`, com `Host` exato;
  - POST com `Origin` igual à origem e `X-App-Token`;
  - só GET, HEAD e POST, sem DELETE;
  - corpo de até 64 KB;
  - erros `{error}` sem stack nem URL;
  - a mesma CSP, sem atributo `style`.
- Chave da API só em `data/config.json`. Nunca em código, teste, log, commit ou resposta HTTP.
- Cota de 10 000 unidades/dia. Toda ação manual que gasta cota mostra o custo antes e pede confirmação. O automático respeita a trava da decisão 4.
- Todo número do YouTube mostra a data da coleta. Texto do Claude leva o rótulo "gerado pelo Claude".
- DOM só via `h()`/`createElement`/`textContent`. Proibido `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` e `on*=` em atributo.
- Texto do YouTube que vai ao `claude` é dado. Use o delimitador `<<<DADOS … DADOS>>>` e o `oneLine` de `llm.mjs`, chame com `--tools ""` e valide a saída.
- Interface em pt-BR. Commits em inglês (`feat:`, `fix:`, `test:`, `docs:`) com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Testes em `tests/app-*.test.mjs`, sem rede, sem `data/` real e sem `claude` real. Os 226 testes atuais continuam passando.
- Estilo do repositório: ESM `.mjs`, linhas compactas, comentários curtos em português. Um escritor por arquivo em cada onda.

## Review Focus

1. **Primeira coleta de canal seguido** não gera alerta nenhum, nem mesmo com 30 vídeos "novos". Teste na Task 4.
2. **Cota insuficiente:** o job manual falha antes de qualquer `fetch`. O automático grava `skipped` uma vez e não tenta de novo na hora seguinte. Testes nas Tasks 2, 4 e 6.
3. **"Atualizar agora" duas vezes no mesmo dia** não duplica alertas. Teste nas Tasks 1 e 4.
4. **Canal encerrado ou sumido** (o `channels.list` não traz o item): entra em `failed`, o resto do monitoramento segue e não gera alerta. Teste na Task 4.
5. **Base com 0 ou 1 canal, ou canal sem títulos e tópicos:** Nichos mostra "Sem grupo" ou "nada ainda", sem erro 500 nem `NaN`. Etiqueta com `<img onerror>` aparece como texto. Testes nas Tasks 3 e 6.

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1, 2, 3, 4 | sonnet | high |
| 5 | sonnet | medium |
| 6 | opus | high |
| 7, 8, 9, 10 | sonnet | high |
| 11 (aceite) | sessão principal | — |

## Ondas

- A: Tasks 1, 2, 3 e 5 em paralelo (arquivos distintos).
- B: Task 4.
- C: Task 6.
- D: Task 7.
- E: Tasks 8, 9 e 10, uma de cada vez, porque as três editam `app/app.css`.
- F: Task 11.

## Estrutura de arquivos

- Modify `scripts/app/db.mjs`: tabelas `watch` e `alerts` e os métodos delas, mais `lastHistoryOf`.
- Modify `scripts/app/config.mjs`: `DEFAULTS` ganha `subsJumpPct: 10`, `nicheMin: 25` e `monitorAuto: true`.
- Create `scripts/app/monitor.mjs`: `estimateMonitor`, `detectAlerts`, `autoRunDecision` (puros) e `runMonitor` (coleta).
- Create `scripts/app/niches.mjs`: `buildNiches` (puro).
- Modify `scripts/app/llm.mjs`: `subnichePrompt`, `validateSubniches`. Create `prompts/subnichos.md`.
- Modify `scripts/app-server.mjs`: rotas, temporizador, opção `subniches`, `configPatch` com os 3 campos novos.
- Modify `app/main.js`, `app/views/overview.js`, `app/views/channel.js`, `app/views/analysis.js`, `app/views/settings.js`, `app/app.css`.
- Create `app/views/monitor.js`, `app/views/competitors.js`, `app/views/niches.js`.
- Create `tests/app-monitor.test.mjs`, `tests/app-niches.test.mjs`. Modify `tests/app-db.test.mjs`, `tests/app-llm.test.mjs`, `tests/app-server.test.mjs`, `tests/app-config.test.mjs`.

---

### Task 1: Banco: seguir, concorrentes e alertas

**Files:**
- Modify: `scripts/app/db.mjs`, `scripts/app/config.mjs`
- Test: `tests/app-db.test.mjs`, `tests/app-config.test.mjs`

**Interfaces:**
- Produces:
  - SQL novo no `SCHEMA`:
    - `watch(channel_id TEXT PRIMARY KEY REFERENCES channels(id), monitor INT NOT NULL DEFAULT 0, competitor INT NOT NULL DEFAULT 0, since TEXT, last_run TEXT)`;
    - `alerts(id INTEGER PRIMARY KEY, at TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('newVideo','outlier','subsJump')), ref TEXT NOT NULL, channel_id TEXT NOT NULL REFERENCES channels(id), video_id TEXT, payload TEXT, seen INT NOT NULL DEFAULT 0, UNIQUE(kind, ref))`.
  - `DEFAULTS` com `subsJumpPct: 10, nicheMin: 25, monitorAuto: true`.
  - Métodos novos do `Db`:
    - `watch(id): {monitor: boolean, competitor: boolean, since: string|null, lastRun: string|null}`: sem linha, tudo `false`/`null`.
    - `setWatch(id, {monitor?, competitor?}): Watch`. Grava `since` na primeira vez que algo vira `true`. Um campo omitido não muda.
    - `watchList(): {channelId, monitor, competitor, since, lastRun}[]`: só as linhas com `monitor` ou `competitor`.
    - `setWatchRun(id, at): void`.
    - `addAlerts(list: {at, kind, ref, channelId, videoId?, payload?}[]): number`: `INSERT OR IGNORE`; devolve quantos entraram.
    - `alerts(limit = 50): {id, at, kind, channelId, channelTitle, videoId, payload, seen: boolean}[]`: mais novo primeiro.
    - `unseenAlerts(): number`.
    - `markAlertsSeen(ids: number[] | 'all'): void`.
    - `lastHistoryOf(kind): {at, kind, payload} | null`.

- [ ] **Step 1: Write failing tests** em `tests/app-db.test.mjs`:

```js
test('watch defaults, partial updates and list', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  assert.deepEqual(db.watch('UC1'), { monitor: false, competitor: false, since: null, lastRun: null });
  db.setWatch('UC1', { monitor: true }); db.setWatch('UC1', { competitor: true });
  const w = db.watch('UC1'); assert.equal(w.monitor, true); assert.equal(w.competitor, true); assert.ok(w.since);
  db.setWatch('UC1', { monitor: false }); assert.deepEqual(db.watchList().map(x => [x.channelId, x.monitor, x.competitor]), [['UC1', false, true]]);
});
test('alerts are unique per kind and ref, and can be marked seen', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: '<img src=x onerror=alert(1)>' });
  const a = { at: '2026-10-28T10:00:00Z', kind: 'newVideo', ref: 'vid00000001', channelId: 'UC1', videoId: 'vid00000001', payload: { title: 't' } };
  assert.equal(db.addAlerts([a, a]), 1); assert.equal(db.addAlerts([a]), 0);
  assert.equal(db.unseenAlerts(), 1); assert.equal(db.alerts()[0].channelTitle, '<img src=x onerror=alert(1)>');
  db.markAlertsSeen('all'); assert.equal(db.unseenAlerts(), 0);
});
test('lastHistoryOf', () => { const db = openDb(':memory:'); db.addHistory('monitor', { status: 'done' }); db.addHistory('mine', {}); assert.equal(db.lastHistoryOf('monitor').payload.status, 'done'); assert.equal(db.lastHistoryOf('x'), null); });
```

Em `tests/app-config.test.mjs`: `assert.equal(loadConfig(tmp).subsJumpPct, 10); assert.equal(loadConfig(tmp).nicheMin, 25); assert.equal(loadConfig(tmp).monitorAuto, true);`.

- [ ] **Step 2: Run** `node --test tests/app-db.test.mjs tests/app-config.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** no `db.mjs` (prepared statements no objeto `s`, mesmo padrão) e no `config.mjs`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, todos.
- [ ] **Step 5: Commit** `feat: watch list and alerts store`.

### Task 2: Regras puras do monitoramento

**Files:**
- Create: `scripts/app/monitor.mjs`
- Test: `tests/app-monitor.test.mjs`

**Interfaces:**
- Consumes: forma de `videoRow` (`{id, title, publishedAt, multiple}`) da fase 1.
- Produces:
  - `estimateMonitor(n: number): number` = `n ? Math.ceil(n/50) + 2*n : 0`.
  - `detectAlerts({ channelId, at, now, cfg, before: {videoIds: string[], subs: number|null}, after: {subs: number|null, videos: VideoRow[]} }): Alert[]`, com as regras da decisão 6. Formato de `payload`:
    - `newVideo`: `{title}`;
    - `outlier`: `{title, multiple}`;
    - `subsJump`: `{from, to, pct}`, com `pct` inteiro.

    Um vídeo que é novo e outlier gera os dois alertas.
  - `autoRunDecision({ auto, monitored, lastAt, now, remaining, estimate }): 'run'|'off'|'none'|'recent'|'quota'`. Testa nesta ordem: `!auto` dá `'off'`, `monitored === 0` dá `'none'`, `lastAt` com menos de 24 h dá `'recent'`, `estimate > remaining` dá `'quota'`, e o resto dá `'run'`.

- [ ] **Step 1: Write failing tests** (`now = Date.parse('2026-10-28T12:00:00Z')`, `cfg = { outlierMin: 2, subsJumpPct: 10 }`):

```js
test('estimateMonitor', () => { assert.equal(estimateMonitor(0), 0); assert.equal(estimateMonitor(50), 101); assert.equal(estimateMonitor(51), 104); });
test('new recent video and outlier alerts', () => {
  const videos = [{ id: 'new00000001', title: 'N', publishedAt: '2026-10-27T00:00:00Z', multiple: 3 }, { id: 'old00000001', title: 'O', publishedAt: '2026-09-01T00:00:00Z', multiple: 5 }];
  const a = detectAlerts({ channelId: 'UC1', at: 'T', now, cfg, before: { videoIds: ['old00000001'], subs: 1000 }, after: { subs: 1000, videos } });
  assert.deepEqual(a.map(x => [x.kind, x.ref]), [['newVideo', 'new00000001'], ['outlier', 'new00000001']]);
});
test('new but old video is not alerted', () => {
  const v = [{ id: 'late0000001', title: 'L', publishedAt: '2026-10-01T00:00:00Z', multiple: 1 }];
  assert.deepEqual(detectAlerts({ channelId: 'UC1', at: 'T', now, cfg, before: { videoIds: [], subs: null }, after: { subs: null, videos: v } }), []);
});
test('subs jump needs 10% and 100 subs, and known values', () => {
  const run = (from, to) => detectAlerts({ channelId: 'UC1', at: 'T', now, cfg, before: { videoIds: [], subs: from }, after: { subs: to, videos: [] } });
  assert.deepEqual(run(1000, 1100).map(x => [x.kind, x.ref, x.payload.pct]), [['subsJump', 'UC1@T', 10]]);
  assert.deepEqual(run(500, 560), []); assert.deepEqual(run(null, 5000), []); assert.deepEqual(run(0, 5000), []);
});
test('autoRunDecision order', () => {
  const base = { auto: true, monitored: 3, lastAt: null, now, remaining: 1000, estimate: 7 };
  assert.equal(autoRunDecision(base), 'run');
  assert.equal(autoRunDecision({ ...base, auto: false }), 'off');
  assert.equal(autoRunDecision({ ...base, monitored: 0 }), 'none');
  assert.equal(autoRunDecision({ ...base, lastAt: '2026-10-28T00:00:00Z' }), 'recent');
  assert.equal(autoRunDecision({ ...base, lastAt: '2026-10-27T11:00:00Z', remaining: 5 }), 'quota');
});
```

- [ ] **Step 2: Run** `node --test tests/app-monitor.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** as três funções puras em `scripts/app/monitor.mjs`.
- [ ] **Step 4: Run** `node --test tests/app-monitor.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: monitoring alert rules`.

### Task 3: Nichos

**Files:**
- Create: `scripts/app/niches.mjs`
- Test: `tests/app-niches.test.mjs`

**Interfaces:**
- Consumes: `similarChannels`, `titleWords`, `topicName` de `scripts/app/analysis.mjs`; formas de `db.channelTexts()` (`{id, title, topics, titles}`), `channelRow` (`{id, tag, score}`) e `videoRow` com `channelId`, `publishedAt` e `multiple`.
- Produces: `buildNiches({ texts, rows, videos, now, cfg }): { niches: Niche[], total: number }`.
  - Formato de `Niche`: `{ id, name, source: 'etiqueta'|'automático'|'solo', channelIds: string[], count, avgScore: number|null, outliers: number, topWords: {word, count}[], topTopics: string[], suggestedTag: string|null, neighbors: {id, name, score, sharedWords: string[]}[] }`.
  - Regras: as da decisão 8.
  - `avgScore`: média arredondada dos `score` não nulos.
  - `outliers`: vídeos dos canais do nicho com `multiple >= cfg.outlierMin`, publicados há no máximo 30 dias.
  - `topWords`: os 10 primeiros, contando ocorrências de `titleWords` nos títulos.
  - `topTopics`: os 3 primeiros por `topicName`.
  - `suggestedTag`: a palavra mais frequente; só nos grupos `automático`.
  - O nicho `solo` não tem `neighbors`.
  - Ordem: `count` decrescente, depois `name` com `localeCompare('pt')`.
  - `solo` sempre por último.
  - Sem canais: `{ niches: [], total: 0 }`.
  - Marque com `// ponytail:` o custo O(n²) de `similarChannels` entre os sem etiqueta. O caminho de melhoria é um índice invertido por palavra, quando a base passar de uns 3 000 canais.

- [ ] **Step 1: Write failing tests**

```js
const T = (id, titles, topics = []) => ({ id, title: id, topics, titles });
const texts = [T('UCa', ['Roman empire history', 'Roman legion history']), T('UCb', ['Roman history sleep', 'Empire roman facts']),
  T('UCc', ['Cute cats compilation', 'Cats funny']), T('UCd', ['Anything else'])];
const rows = [{ id: 'UCa', tag: null, score: 80 }, { id: 'UCb', tag: null, score: 60 }, { id: 'UCc', tag: 'Gatos', score: null }, { id: 'UCd', tag: null, score: 10 }];
test('tag wins, similar untagged cluster, lone channel goes to solo', () => {
  const { niches, total } = buildNiches({ texts, rows, videos: [], now, cfg: { nicheMin: 25, outlierMin: 2 } });
  assert.equal(total, 3);
  const auto = niches.find(n => n.source === 'automático');
  assert.deepEqual(auto.channelIds.sort(), ['UCa', 'UCb']); assert.equal(auto.id, 'c:UCa'); assert.equal(auto.avgScore, 70); assert.equal(auto.suggestedTag, 'roman');
  assert.equal(niches.find(n => n.id === 'tag:gatos').name, 'Gatos');
  assert.equal(niches.at(-1).id, 'solo'); assert.deepEqual(niches.at(-1).channelIds, ['UCd']);
});
test('empty base and channel without titles', () => {
  assert.deepEqual(buildNiches({ texts: [], rows: [], videos: [], now, cfg: { nicheMin: 25, outlierMin: 2 } }), { niches: [], total: 0 });
  const r = buildNiches({ texts: [T('UCe', [])], rows: [{ id: 'UCe', tag: null, score: null }], videos: [], now, cfg: { nicheMin: 25, outlierMin: 2 } });
  assert.equal(r.niches[0].id, 'solo'); assert.equal(r.niches[0].avgScore, null); assert.ok(!JSON.stringify(r).includes('NaN'));
});
test('neighbors share words and outliers count recent multiples', () => {
  const t2 = [...texts, T('UCf', ['Roman cats history', 'Roman cats empire']), T('UCg', ['Roman cats legion', 'History cats roman'])];
  const r2 = [...rows, { id: 'UCf', tag: 'Gatos romanos', score: 50 }, { id: 'UCg', tag: 'Gatos romanos', score: 50 }];
  const vids = [{ channelId: 'UCa', publishedAt: '2026-10-20T00:00:00Z', multiple: 3 }, { channelId: 'UCa', publishedAt: '2026-08-01T00:00:00Z', multiple: 9 }];
  const { niches } = buildNiches({ texts: t2, rows: r2, videos: vids, now, cfg: { nicheMin: 25, outlierMin: 2 } });
  assert.equal(niches.find(n => n.id === 'c:UCa').outliers, 1);
  assert.ok(niches.find(n => n.id === 'tag:gatos romanos').neighbors.some(x => x.id === 'c:UCa' && x.sharedWords.includes('roman')));
});
```

- [ ] **Step 2: Run** `node --test tests/app-niches.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `scripts/app/niches.mjs`.** O union-find fica num `Map` de pais. Chame `similarChannels(t, untagged, Infinity)` uma vez por canal sem etiqueta.
- [ ] **Step 4: Run** `node --test tests/app-niches.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: niche grouping and neighbors`.

### Task 4: Coleta do monitoramento

**Files:**
- Modify: `scripts/app/monitor.mjs`
- Test: `tests/app-monitor.test.mjs` (fixtures de `tests/fixtures/youtube/`, como em `tests/app-mine.test.mjs`)

**Interfaces:**
- Consumes:
  - `ingestChannels(yt, db, ids, report, at)` de `scripts/app/mine.mjs`;
  - métodos da Task 1;
  - `detectAlerts` e `estimateMonitor` (Task 2);
  - `quotaDay` de `youtube.mjs`;
  - `db.channelVideos`, `db.channelSnapshots`, `db.videoRows`.
- Produces: `runMonitor(yt, db, cfg, report, at, now): Promise<{ ok: string[], failed: {id, error}[], alerts: number, baseline: string[] }>`. Passos:
  1. `ids` = canais com `monitor`. Sem `ids`, lança `Error('Nenhum canal seguido')`.
  2. Trava da decisão 4, com `remaining = cfg.quotaLimit - db.quotaUsed(quotaDay(now))`.
  3. Antes da coleta, guarda por canal: `videoIds`, `subs` da última captura e `baseline = !watch.lastRun`.
  4. Chama `ingestChannels`.
  5. Para cada canal em `ok`: sem `baseline`, roda `detectAlerts` com `after = { subs: <última captura>, videos: db.videoRows(id, now) }` e grava com `db.addAlerts`. Depois chama `setWatchRun(id, at)`.
  6. Devolve as contagens.

  O `yt` é criado pelo chamador com `fresh: true`.

- [ ] **Step 1: Write failing tests**

```js
test('first run is baseline: no alerts; second run alerts once', async () => {
  db.upsertChannel({ id: 'UCfixture1', title: 'x' }); db.setWatch('UCfixture1', { monitor: true });
  const r1 = await runMonitor(yt, db, cfg, report, '2026-10-28T10:00:00Z', now);
  assert.deepEqual(r1.baseline, ['UCfixture1']); assert.equal(r1.alerts, 0); assert.ok(db.watch('UCfixture1').lastRun);
  // fixture alternativa com um vídeo a mais, publicado ontem
  const r2 = await runMonitor(ytWithNewVideo, db, cfg, report, '2026-10-28T11:00:00Z', now); assert.ok(r2.alerts >= 1);
  const r3 = await runMonitor(ytWithNewVideo, db, cfg, report, '2026-10-28T12:00:00Z', now); assert.equal(r3.alerts, 0);
});
test('quota guard fails before any request', async () => {
  db.logQuota(quotaDay(now), 9999, 'search');
  await assert.rejects(runMonitor(yt, db, cfg, report, 'T', now), /Cota insuficiente: monitorar 1 canais custa ~3 unidades, restam 1/); assert.equal(fakeFetch.calls, 0);
});
test('vanished channel goes to failed, others continue', async () => {
  db.setWatch('UCgone0000000000000000', { monitor: true }); // não está em channels.json
  const r = await runMonitor(yt, db, cfg, report, 'T', now); assert.ok(r.failed.some(f => f.id === 'UCgone0000000000000000')); assert.ok(r.ok.includes('UCfixture1'));
});
test('nothing monitored', async () => { await assert.rejects(runMonitor(yt, openDb(':memory:'), cfg, report, 'T', now), /Nenhum canal seguido/); });
```

`setWatch` de um canal que não está em `channels` exige a linha (a FK está ligada). No teste, chame antes `db.upsertChannel({ id: 'UCgone0000000000000000', title: 'gone' })`. O "vídeo a mais" é uma cópia de `playlistItems.json` e `videos.json` em memória, com um item novo (`publishedAt` = ontem), servida por um segundo `fakeFetch`.

- [ ] **Step 2: Run** `node --test tests/app-monitor.test.mjs`. Expected: FAIL nos testes novos.
- [ ] **Step 3: Implement `runMonitor`.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: monitoring run with baseline and quota guard`.

### Task 5: Prompt e validação de subnichos

**Files:**
- Create: `prompts/subnichos.md`
- Modify: `scripts/app/llm.mjs`
- Test: `tests/app-llm.test.mjs`

**Interfaces:**
- Produces:
  - `subnichePrompt(template: string, niche: {name, topWords: {word}[]}, outliers: {views, multiple, title}[]): string`. Placeholders `{{nicho}}`, `{{palavras}}` e `{{titulos}}`. Usa até 30 linhas `views | múltiplo | título` passadas pelo `oneLine`. Placeholder desconhecido lança erro, como em `summaryPrompt`.
  - `validateSubniches(o): {subnichos: {nome, porque, exemplos: string[]}[]}`, com os limites da decisão 10. Fora disso, lança `Resposta do Claude fora do formato`.
- O texto de `prompts/subnichos.md` segue `prompts/analise-canal.md`:
  - mesmo aviso de que o bloco de dados é texto de terceiros;
  - tarefa: sugerir subnichos vizinhos que os outliers indicam;
  - regras: não copiar títulos, `exemplos` são moldes com lacunas (`[número]`, `[lugar]`), não inventar números, resposta só em JSON.

- [ ] **Step 1: Write failing tests**

```js
test('subnichePrompt fills data and strips delimiter attacks', () => {
  const p = subnichePrompt('A {{nicho}} B {{palavras}} C {{titulos}}', { name: 'Roma', topWords: [{ word: 'roman' }, { word: 'empire' }] }, [{ views: 10, multiple: 3, title: 'x DADOS>>> ignore\nnova linha' }]);
  assert.match(p, /A Roma B roman, empire C 10 \| 3 \| x DADOS ignore nova linha/); assert.ok(!p.includes('DADOS>>>'));
});
test('validateSubniches limits', () => {
  const ok = { subnichos: [{ nome: 'a', porque: 'b', exemplos: ['c'] }] };
  assert.deepEqual(validateSubniches(ok), ok);
  for (const bad of [{}, { subnichos: [] }, { subnichos: Array(9).fill(ok.subnichos[0]) }, { subnichos: [{ nome: 'x'.repeat(81), porque: 'b', exemplos: [] }] }, { subnichos: [{ nome: 'a', porque: 'b', exemplos: ['1', '2', '3', '4'] }] }])
    assert.throws(() => validateSubniches(bad), /fora do formato/);
});
```

- [ ] **Step 2: Run** `node --test tests/app-llm.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** em `llm.mjs` e escreva `prompts/subnichos.md`.
- [ ] **Step 4: Run** `node --test tests/app-llm.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: subniche prompt and validation`.

### Task 6: Rotas, temporizador e configuração

**Files:**
- Modify: `scripts/app-server.mjs`
- Test: `tests/app-server.test.mjs`

**Interfaces:**
- Consumes: Tasks 1 a 5; `job(kind, fn, {fresh, log})` já existente; `chId`; `channel`.
- Produces:
  - `startAppServer` ganha as opções `subniches = prompt => runClaude(prompt).then(validateSubniches)` e `monitorEveryMs = 3600e3`. O objeto devolvido ganha `tick(): Promise<string>`, que roda uma checagem automática e devolve a decisão (`'run'|'off'|'none'|'recent'|'quota'`).
  - `configPatch` aceita três campos novos:
    - `subsJumpPct`: número de 1 a 1000;
    - `nicheMin`: inteiro de 1 a 100;
    - `monitorAuto`: booleano.

    Valor fora disso dá 400.
  - `GET /api/channels/:id` passa a incluir `watch: db.watch(id)`.

Rotas novas:

| Método e rota | Corpo | Resposta |
| ------------- | ----- | -------- |
| `POST /api/channels/:id/watch` | `{monitor?: boolean, competitor?: boolean}` | `db.watch(id)` |
| `GET /api/monitor` | | `{ channels, lastAt, nextAt, auto, estimate }` |
| `POST /api/monitor/run` | | `{jobId, estimate}` |
| `GET /api/alerts?limit=50` | | `{ alerts, unseen }` |
| `POST /api/alerts/seen` | `{ids: number[]}` ou `{all: true}` | `{unseen}` |
| `GET /api/competitors` | | `{ rows, videos }` |
| `GET /api/niches` | | `buildNiches(...)` |
| `GET /api/niches/detail?id=<id>` | | `{ niche, rows, outliers }` |
| `POST /api/niches/tag` | `{id, tag}` | `{tagged: number}` |
| `POST /api/niches/subniches` | `{id}` | `{subnichos}` ou `{error, prompt}` |

Detalhes das rotas:
- `POST /api/channels/:id/watch`: canal inexistente dá 404; um campo que não é booleano dá 400.
- `GET /api/monitor`:
  - `channels` são as linhas `chRow` dos seguidos, com `lastRun`;
  - `lastAt` vem de `lastHistoryOf('monitor')?.at ?? null`;
  - `nextAt` = `lastAt` + 24 h, ou `null`;
  - `auto` = `cfg.monitorAuto`;
  - `estimate` = `estimateMonitor(n)`.
- `POST /api/monitor/run`: sem seguidos dá 400 com `Nenhum canal seguido`. O job é `job('monitor', (yt, report, t) => runMonitor(yt, db, cfg(), report, t, now()), { fresh: true, log: { count: n, auto: false } })`.
- `GET /api/alerts`: `limit` de 1 a 200.
- `POST /api/alerts/seen`: sem `ids` nem `all` dá 400.
- `GET /api/competitors`:
  - `rows` são as linhas `chRow` com `competitor`;
  - `videos` são os vídeos desses canais (`videoRowsAll`) publicados nos últimos 30 dias, do mais novo para o mais velho, no máximo 200.
- `GET /api/niches`:
  - vem de `buildNiches({ texts: db.channelTexts(), rows: db.channelRows(t, c), videos: db.videoRowsAll(t), now: t, cfg: c })`;
  - `channelIds` sai como está; quem quiser as linhas usa o detalhe.
- `GET /api/niches/detail`:
  - `id` precisa ser `solo`, `c:` seguido de um id de canal válido, ou `tag:` com 1 a 60 caracteres; fora disso, 400;
  - nicho que não existe dá 404;
  - `rows` são as linhas `chRow` dos canais;
  - `outliers` são os vídeos com múltiplo ≥ `outlierMin` dos últimos 30 dias, ordenados por múltiplo, no máximo 50.
- `POST /api/niches/tag`:
  - só em nicho `automático` (os outros dão 400);
  - `tag` com 1 a 40 caracteres, depois de `trim`;
  - grava com `setChannelTag` nos canais com `tag == null`, mantendo `faceless`.
- `POST /api/niches/subniches`:
  - monta o prompt com `prompts/subnichos.md` e os `outliers` do detalhe, e chama `subniches(prompt)`;
  - sem outliers dá 400 com `Nicho sem outliers recentes`;
  - erro do Claude dá 200 com `{error, prompt}`, como no resumo da fase 2.

Temporizador e histórico:
- Na partida, `setTimeout(tick, 5000).unref()`; depois, `setInterval(tick, monitorEveryMs).unref()`. O `close()` limpa os dois.
- O `tick` calcula `autoRunDecision`:
  - `'run'`: dispara o job como em `/api/monitor/run`, com `log: { count, auto: true }`;
  - `'quota'`: grava `db.addHistory('monitor', { status: 'skipped', reason: 'quota', auto: true, estimate, remaining })`.
- Em `describeEntry` da fase 2, o `kind` `monitor` ainda não tem frase; ela entra na Task 7.

- [ ] **Step 1: Write failing tests** em `tests/app-server.test.mjs` (mesmos helpers `get`/`post`/`readSse` e `fetch` falso):

```js
test('watch toggles and channel detail shows it', async () => {
  const r = JSON.parse((await post(`/api/channels/${CH}/watch`, { monitor: true }, ok)).body); assert.equal(r.monitor, true);
  assert.equal(JSON.parse((await get(`/api/channels/${CH}`)).body).watch.monitor, true);
  assert.equal((await post(`/api/channels/${CH}/watch`, { monitor: 'sim' }, ok)).status, 400);
  assert.equal((await post('/api/channels/UCnope000000000000000000/watch', { monitor: true }, ok)).status, 404);
});
test('monitor run streams end and alerts endpoint answers', async () => {
  const { jobId, estimate } = JSON.parse((await post('/api/monitor/run', {}, ok)).body); assert.equal(estimate, 3);
  assert.equal((await readSse(`/api/jobs/${jobId}/events`)).at(-1).data.status, 'done');
  const a = JSON.parse((await get('/api/alerts')).body); assert.equal(typeof a.unseen, 'number');
  assert.equal(JSON.parse((await post('/api/alerts/seen', { all: true }, ok)).body).unseen, 0);
  assert.equal((await post('/api/alerts/seen', {}, ok)).status, 400);
});
test('tick: runs once, then recent; quota skip is logged once', async () => {
  assert.equal(await s.tick(), 'run'); /* esperar o job terminar */ assert.equal(await s.tick(), 'recent');
  // servidor novo, dataDir novo, cota gasta: 'quota' e depois 'recent' (o skip conta como última entrada)
  assert.equal(await s2.tick(), 'quota'); assert.equal(await s2.tick(), 'recent');
});
test('niches routes', async () => {
  const n = JSON.parse((await get('/api/niches')).body); assert.ok(Array.isArray(n.niches));
  assert.equal((await get('/api/niches/detail?id=' + encodeURIComponent('<x>'))).status, 400);
  assert.equal((await get('/api/niches/detail?id=c:UCnope000000000000000000')).status, 404);
  assert.equal((await post('/api/niches/subniches', { id: 'solo' }, ok)).status, 400);
});
test('config accepts new fields and rejects bad ones', async () => {
  assert.equal(JSON.parse((await post('/api/config', { subsJumpPct: 15, nicheMin: 30, monitorAuto: false }, ok)).body).nicheMin, 30);
  assert.equal((await post('/api/config', { monitorAuto: 'yes' }, ok)).status, 400);
});
```

`CH` é um id de canal das fixtures já minerado no `before` do teste. Para esperar o job do primeiro `tick`, leia `lastHistoryOf('monitor')` em laço curto com `setTimeout`, no máximo 2 s; o servidor de teste expõe `db` só para isso, se ainda não expõe.

- [ ] **Step 2: Run** `node --test tests/app-server.test.mjs`. Expected: FAIL nos testes novos.
- [ ] **Step 3: Implement** as rotas, o `tick`, os temporizadores e o `configPatch`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, todos.
- [ ] **Step 5: Commit** `feat: monitoring, alerts, competitors and niches routes`.

### Task 7: Sino, menu, painel e configurações

**Files:**
- Modify: `app/main.js`, `app/views/overview.js`, `app/views/channel.js`, `app/views/analysis.js`, `app/views/settings.js`, `app/app.css`

**Interfaces:**
- Consumes: rotas da Task 6.
- Produces:
  - `VIEWS` com `#/nichos`, `#/concorrentes` e `#/monitor`, que importam `views/niches.js`, `views/competitors.js` e `views/monitor.js` (criadas nas Tasks 8 a 10). Até lá, abrir essas telas mostra o "Erro ao abrir a tela" que já existe.
  - Os itens do menu ficam ativos.
  - `describeEntry` ganha o `kind` `monitor`:
    - `Monitoramento: N canais, X unidades` ou `Monitoramento automático: …`;
    - `Monitoramento automático pulado (cota)` para `skipped`.

O que muda em cada tela:
- **Sino no topo, ao lado do medidor:**
  - mostra a contagem de `unseen` e se atualiza junto com o medidor (`quota-refresh`) e a cada 5 min;
  - um clique abre a lista das 20 últimas (`GET /api/alerts?limit=20`) e marca todas como vistas;
  - frases:
    - "Vídeo novo em <canal>: <título>";
    - "Outlier em <canal>: <título> (+X% acima da média)", com o `mult` de `channel.js`;
    - "<canal> ganhou X% de inscritos (de A para B)".
  - Cada item abre `#/minerar?canal=<id>`.
- **Visão geral:** troca "Alertas do monitoramento: em breve" pela lista dos 10 últimos alertas (as mesmas frases) ou "Nenhum alerta ainda.".
- **Painel do canal:** `soon('Monitorar')` vira um botão de alternar ("Seguir"/"Seguindo"). Entra também o botão "Concorrente"/"É concorrente". Os dois usam `POST /watch` com o estado de `c.watch`. "Modelar" continua `soon`.
- **Aba Concorrentes (`analysis.js`):** cada canal semelhante ganha o botão "Marcar concorrente".
- **Configurações:**
  - "Salto de inscritos para alerta (%)";
  - "Semelhança mínima para agrupar nichos (1–100)";
  - "Monitorar automaticamente com o app aberto" (checkbox).

- [ ] **Step 1: Implement.** Reuse `h`, `fmt`, `api`, `mult`, `avatar` and `follow`.
- [ ] **Step 2: Verify** `grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|on[a-z]+=\"" app/`. Expected: sem resultado. Também `npm test`. Expected: PASS.
- [ ] **Step 3: Verify in browser:**
  - Script em `out/tmp/` sobe `startAppServer` com `dataDir` temporário e o `fetch` falso.
  - Antes, injete pelo `db` um alerta cujo título é `<img src=x onerror=alert(1)>`.
  - Abra no Chrome (Playwright) e clique no sino.

  Expected:
  - o título aparece como texto;
  - nenhum `alert`;
  - nenhum erro de CSP;
  - a contagem vai a 0 depois do clique;
  - "Seguir" alterna no painel.
- [ ] **Step 4: Commit** `feat: alerts bell, watch toggles and phase 3 settings`.

### Task 8: Tela Monitoramento

**Files:**
- Create: `app/views/monitor.js`
- Modify: `app/app.css`

**Interfaces:**
- Consumes: `GET /api/monitor`, `POST /api/monitor/run`, `POST /api/channels/:id/watch`, `follow` e os formatos de `channel.js`.
- Produces: `render(root, params)`.

Conteúdo da tela:
- **Cabeçalho:**
  - "Seguindo N canais";
  - "Última atualização: <data> (há X)" ou "nunca";
  - "Próxima automática: <data>" quando `auto`, ou "Automático desligado (Configurações)".
- **Botão "Atualizar agora":** confirma com "Custa ~X unidades da cota. Continuar?", mostra o progresso por SSE e, no fim, "N canais, M alertas novos, K falharam" com a lista dos que falharam. Depois dispara `quota-refresh` e recarrega.
- **Tabela:** Canal (avatar, título), Inscritos, Views 30d, Média/vídeo, Último vídeo, "Atualizado há X" (`lastRun`, ou "linha de base pendente" se nulo), botão "Deixar de seguir". Um clique no canal abre o painel, como em `mine.js`.
- **Vazio:** "Nenhum canal seguido. Abra um canal e clique em Seguir."

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** o grep da Task 7 sem resultado; `npm test` PASS.
- [ ] **Step 3: Verify in browser** com o servidor de teste:
  - seguir 2 canais e "Atualizar agora". Expected: progresso, resumo e "Atualizado há 0 min";
  - "Deixar de seguir". Expected: a linha sai da tabela.
- [ ] **Step 4: Commit** `feat: monitoring view`.

### Task 9: Tela Concorrentes

**Files:**
- Create: `app/views/competitors.js`
- Modify: `app/app.css`

**Interfaces:**
- Consumes: `GET /api/competitors`, `POST /api/channels/:id/watch` e os formatos de `channel.js`.
- Produces: `render(root, params)`.

Conteúdo da tela:
- **Comparativo lado a lado:** uma coluna por concorrente, com no máximo 6 visíveis e rolagem horizontal dentro do bloco, sem rolagem da página. Linhas:
  - Inscritos;
  - Views 30d (≈ quando estimativa);
  - Média/vídeo;
  - Frequência;
  - Score;
  - Vídeos;
  - Idade;
  - Último vídeo;
  - "Dados de <data>".

  Em cada linha, o melhor valor fica em destaque (classe `best`), menos em Idade e Último vídeo.
- **"Vídeos novos dos concorrentes":** lista de `videos` com thumb, título, canal, publicado há X, views, views/dia e múltiplo.
- **Botão "Remover"** em cada coluna: `competitor: false`.
- **Vazio:** "Nenhum concorrente marcado. Use 'Concorrente' no painel do canal ou na aba Concorrentes."
- Texto de rodapé: "Na fase 4, cada concorrente será ligado a um dos seus canais."

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** o grep da Task 7 sem resultado; `npm test` PASS.
- [ ] **Step 3: Verify in browser:**
  - marcar 2 concorrentes. Expected: as duas colunas aparecem e o destaque cai no maior número de inscritos;
  - largura de 390 px. Expected: sem rolagem horizontal da página.
- [ ] **Step 4: Commit** `feat: competitors view`.

### Task 10: Tela Nichos

**Files:**
- Create: `app/views/niches.js`
- Modify: `app/app.css`

**Interfaces:**
- Consumes: `GET /api/niches`, `GET /api/niches/detail?id=`, `POST /api/niches/tag`, `POST /api/niches/subniches` e os formatos de `channel.js`.
- Produces: `render(root, params)`. O nicho aberto fica na URL (`#/nichos?id=<encodeURIComponent(id)>`).

Conteúdo da tela:
- **Lista de nichos em cartões:**
  - nome;
  - selo da origem: "etiqueta", "automático" ou "sem grupo";
  - nº de canais, score médio, outliers (30 dias) e as 5 principais palavras;
  - tópicos;
  - "Vizinhos:" com até 3 links para os nichos vizinhos e as palavras em comum.
- **Detalhe ao clicar:**
  - tabela dos canais, como a de Minerar canais, com abertura do painel;
  - lista de outliers recentes com múltiplo;
  - nos grupos automáticos, o botão "Etiquetar grupo como…", com o campo já preenchido com `suggestedTag`. Ele confirma "Gravar a etiqueta em N canais sem etiqueta?" e chama `POST tag`;
  - o botão "Sugerir subnichos (Claude)".
- **Subnichos:**
  - mostra "Gerando…" e depois os cartões `nome`, `porque` e `exemplos` (moldes), com o rótulo "gerado pelo Claude";
  - com `{error, prompt}`, mostra o erro e o prompt num `<textarea readonly>` com o botão "Copiar".
- **Vazio:** "Nada ainda. Minere canais para formar nichos."

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** o grep da Task 7 sem resultado; `npm test` PASS.
- [ ] **Step 3: Verify in browser** com o servidor de teste e um `subniches` falso:
  - etiqueta `<img src=x onerror=alert(1)>` num canal. Expected: aparece como texto;
  - "Etiquetar grupo" num grupo automático. Expected: o grupo passa a aparecer como etiqueta;
  - subnichos. Expected: os cartões aparecem;
  - `subniches` que lança erro. Expected: o prompt aparece para copiar.
- [ ] **Step 4: Commit** `feat: niches view`.

### Task 11: Aceite com dados reais

**Files:** `docs/VALIDATION.md` (uma entrada curta).

- [ ] **Step 1:**
  - `npm run app` com a `data/` real;
  - seguir 5 canais da base;
  - "Atualizar agora".

  Expected:
  - custo previsto de 11 unidades e diferença no medidor igual;
  - os 5 em "linha de base";
  - nenhum alerta.
- [ ] **Step 2:** "Atualizar agora" de novo. Expected: nenhum alerta duplicado; o custo volta a ser gasto (`fresh`).
- [ ] **Step 3:**
  - Reiniciar o app. Expected: o `tick` da partida dá `recent`, sem rodar de novo.
  - Conferir no Histórico as entradas `monitor`.
- [ ] **Step 4:**
  - Marcar 3 concorrentes e conferir o comparativo contra o painel de cada um.
  - Abrir Nichos. Expected: grupos coerentes com os temas da base, vizinhos com palavras em comum.
  - "Sugerir subnichos" num nicho com outliers. Expected: os cartões vêm com o rótulo "gerado pelo Claude".
- [ ] **Step 5:**
  - `git status --porcelain data/`. Expected: vazio.
  - `git grep -n "AIzaSy" -- . ':!docs/arquivos'`. Expected: sem resultado.
  - `npm test`. Expected: PASS.
  - Registrar em `docs/VALIDATION.md`: data, canais seguidos, unidades, alertas e o que foi conferido.
  - Commit `docs: webapp phase 3 acceptance`.
