# Webapp Fase 1 (base e Minerar canais) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App local em `http://127.0.0.1:8090` que minera canais do YouTube por palavra-chave ou colagem, guarda tudo em SQLite com capturas datadas, e mostra a tela Minerar canais (filtros, recortes, tabela/cartões) com o painel do canal (abas Visão geral e Vídeos).

**Architecture:** Lógica pura (`metrics`, `filters`) separada do I/O (`db`, `youtube`, `mine`, `jobs`). Um servidor `node:http` serve a interface estática de `app/` e uma API JSON; mineração roda como job assíncrono com progresso por SSE. O cliente do YouTube recebe `fetch` injetado, então os testes usam respostas escritas à mão no formato oficial, sem rede.

**Tech Stack:** Node 24 (`node:http`, `node:sqlite`, `fetch`, `node:test`), HTML/CSS/módulos ES sem framework, YouTube Data API v3.

**Spec:** `docs/superpowers/specs/2026-10-27-webapp-canais-dark-design.md` (seções "Dados e métricas", "Minerar canais", "Painel do canal", chamadas 3 a 7, 13 e 15, fase 1).

## Global Constraints

- Sem dependências npm novas. Só módulos `node:*` e `fetch` global.
- Servidor só em `127.0.0.1`. Checar `Host` igual a `127.0.0.1:<porta>`. POST exige `Origin` igual à origem do servidor e cabeçalho `X-App-Token` igual ao token gerado na partida (`crypto.randomBytes(24).toString('hex')`).
- `data/` no `.gitignore` antes de qualquer gravação. Chave em `data/config.json`; nunca em código, teste, log, commit, resposta HTTP (só `apiKeyHint`: os 4 últimos caracteres).
- Banco em `data/app.db` (`node:sqlite`, `DatabaseSync`).
- Cota: 10 000 unidades/dia. Custos: `search` 100, `channels` 1, `playlistItems` 1, `videos` 1 por chamada. O dia da cota é a data em `America/Los_Angeles` (o YouTube zera à meia-noite do Pacífico).
- Cache de resposta por URL sem a chave, validade padrão 24 h (`cacheHours` em config).
- Todo número do YouTube mostra a data da coleta. Receita e views 30d calculadas por vídeos levam o rótulo "estimativa".
- DOM só com `createElement`/`textContent`. Proibido `innerHTML`, `insertAdjacentHTML`, `onclick` em atributo.
- Interface em pt-BR. Mensagens de commit em inglês (`feat:`, `fix:`, `test:`, `docs:`).
- Testes em `tests/app-*.test.mjs` (o glob de `npm test` é `tests/*.test.mjs`), sem rede, sem `data/` real (usar `mkdtemp`).
- Código no estilo do repositório: ESM `.mjs`, linhas compactas, comentários curtos em português.

## Review Focus

1. Canal com `hiddenSubscriberCount: true` ou 0 inscritos: disparidade e score de disparidade `null`/0, nunca `Infinity` ou `NaN` na tela. Teste em Task 2.
2. Cota esgotada (HTTP 403, `reason: "quotaExceeded"`): job termina com status `error` e mensagem "Cota do YouTube esgotada hoje", mantém o que já gravou, não repete a chamada. Teste em Task 5 e Task 6.
3. Título ou descrição com `<img src=x onerror=alert(1)>`: aparece como texto. Teste em Task 8 (servidor nunca devolve HTML com dados) e checagem em Task 10 (grep sem `innerHTML`).
4. Canal sem vídeos ou com playlist de uploads inexistente (404 `playlistNotFound`): a linha aparece com métricas `null` e "sem vídeos". Teste em Task 6.
5. Colagem mista (`https://www.youtube.com/@x`, `/channel/UC…`, `@x`, `UC…`, lixo): os válidos são minerados, os inválidos voltam listados. Teste em Task 6.

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1, 3, 9 | sonnet | medium |
| 2, 4, 5, 6, 7 | sonnet | high |
| 8 | opus | high |
| 10 | opus | medium |
| 11 (aceite) | sessão principal | — |

## Estrutura de arquivos

- Create `scripts/app/config.mjs`: ler, gravar e mascarar `data/config.json`.
- Create `scripts/app/metrics.mjs`: métricas puras por canal e vídeo.
- Create `scripts/app/filters.mjs`: filtros, recortes e ordenação puros.
- Create `scripts/app/db.mjs`: esquema e consultas SQLite.
- Create `scripts/app/youtube.mjs`: cliente da API com cache e cota.
- Create `scripts/app/mine.mjs`: mineração por palavra-chave, importação e atualização de canal.
- Create `scripts/app/jobs.mjs`: fila de jobs e eventos.
- Create `scripts/app-server.mjs`: servidor HTTP, rotas, SSE.
- Create `app/index.html`, `app/app.css`, `app/dom.js`, `app/api.js`, `app/main.js`, `app/views/settings.js`, `app/views/mine.js`, `app/views/channel.js`.
- Create `tests/app-config.test.mjs`, `tests/app-metrics.test.mjs`, `tests/app-filters.test.mjs`, `tests/app-db.test.mjs`, `tests/app-youtube.test.mjs`, `tests/app-mine.test.mjs`, `tests/app-jobs.test.mjs`, `tests/app-server.test.mjs`, `tests/fixtures/youtube/*.json`.
- Modify `.gitignore` (+`data/`), `package.json` (+`"app": "node scripts/app-server.mjs"`).

---

### Task 1: Configuração local

**Files:**
- Modify: `.gitignore`, `package.json`
- Create: `scripts/app/config.mjs`
- Test: `tests/app-config.test.mjs`

**Interfaces:**
- Produces:
  - `DEFAULTS = { apiKey: '', cacheHours: 24, quotaLimit: 10000, weights: { disparidade: 40, novo: 20, enxuto: 20, ativo: 20 }, rpm: {} }` (`rpm` mapeia `"<etiqueta>|<idioma>"` para `[min, max]` em US$ por 1000 views).
  - `loadConfig(dir: string): Config`: `DEFAULTS` mesclado com `dir/config.json` se existir.
  - `saveConfig(dir: string, patch: Partial<Config>): Config`: mescla, grava com 2 espaços, cria `dir`. `apiKey` vazio no patch não apaga a chave existente.
  - `publicConfig(cfg: Config): object`: tudo menos `apiKey`, mais `apiKeyHint` (`'…' + 4 últimos`, ou `''`).

- [ ] **Step 1: Add `data/` to `.gitignore`, `"app": "node scripts/app-server.mjs"` to `package.json` scripts.** Run `git check-ignore data/config.json`. Expected: imprime `data/config.json`.
- [ ] **Step 2: Write failing tests**

```js
test('loadConfig returns defaults without file', () => { assert.deepEqual(loadConfig(tmp), DEFAULTS); });
test('saveConfig merges and keeps key when patch key is empty', () => {
  saveConfig(tmp, { apiKey: 'AIzaTESTKEY1234' }); const c = saveConfig(tmp, { apiKey: '', cacheHours: 12 });
  assert.equal(c.apiKey, 'AIzaTESTKEY1234'); assert.equal(c.cacheHours, 12); assert.equal(loadConfig(tmp).cacheHours, 12);
});
test('publicConfig never exposes the key', () => {
  const p = publicConfig({ ...DEFAULTS, apiKey: 'AIzaTESTKEY1234' });
  assert.equal(p.apiKey, undefined); assert.equal(p.apiKeyHint, '…1234'); assert.ok(!JSON.stringify(p).includes('AIzaTEST'));
});
```

- [ ] **Step 3: Run** `node --test tests/app-config.test.mjs`. Expected: FAIL (módulo inexistente).
- [ ] **Step 4: Implement `scripts/app/config.mjs`** com `node:fs` síncrono.
- [ ] **Step 5: Run** `node --test tests/app-config.test.mjs`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: app local config`.

### Task 2: Métricas puras

**Files:**
- Create: `scripts/app/metrics.mjs`
- Test: `tests/app-metrics.test.mjs`

**Interfaces:**
- Consumes: `Config.weights`, `Config.rpm` (Task 1).
- Produces (datas em ISO string, `now` em ms; `DAY = 864e5`):
  - `isoDuration(s: string): number` segundos (`'PT1H2M3S'` → 3723, `'P1DT1S'` → 86401, inválido → 0).
  - `avgViews(videos: {views:number}[], n = 30): number|null`: média dos `n` mais recentes (array já vem do mais novo para o mais velho); vazio → `null`.
  - `views30d(snaps: {at:string,views:number}[], videos: {publishedAt,views}[], now): {value:number|null, source:'snapshots'|'videos'|null}`: se existe captura com `at <= now-30d`, usa a mais recente delas e a última captura: diferença das views totais, `source:'snapshots'`. Senão soma das views dos vídeos publicados nos últimos 30 dias, `source:'videos'`. Sem vídeos nem capturas → `{value:null, source:null}`.
  - `frequency(videos, now): number`: vídeos publicados nos últimos 90 dias ÷ (90/7), 2 casas.
  - `ageDays(createdAt, now): number` inteiro.
  - `disparity(avg: number|null, subs: number|null): number|null`: `null` se `avg` nulo ou `subs` nulo/0.
  - `scoreParts({disparity, ageDays, videoCount, daysSinceLast}): {disparidade, novo, enxuto, ativo}` cada uma em [0,1]:
    - disparidade = `disparity == null ? 0 : min(1, disparity)`;
    - novo = `ageDays <= 90 ? 1 : max(0, 1 - (ageDays-90)/275)`;
    - enxuto = `videoCount <= 30 ? 1 : max(0, 1 - (videoCount-30)/70)`;
    - ativo = `daysSinceLast == null ? 0 : daysSinceLast <= 7 ? 1 : max(0, 1 - (daysSinceLast-7)/23)`.
  - `score(parts, weights): number`: `round(Σ parts[k]*weights[k] * 100 / Σ weights)`, 0–100.
  - `revenue(views30d: number|null, tag: string|null, lang: string|null, rpm): [number,number]|null`: `rpm[tag+'|'+lang]` × views/1000, arredondado; sem RPM ou views → `null`.
  - `outlierMultiple(views: number, channelVideos: {views}[]): number|null`: views ÷ mediana dos 30 mais recentes; mediana 0 ou vazio → `null`. 2 casas.
  - `videoRow(v, channelVideos, now)`: `{...v, durationS, viewsPerDay: round(views / max(1, dias desde publicação)), multiple, nota: multiple==null ? null : min(100, round(50*multiple))}`.
  - `channelRow(ch, snaps, videos, now, cfg)`: objeto com `id,title,handle,country,lang,avatar,tag,faceless,createdAt,updatedAt` (data da última captura), `subs` (`null` se escondido), `totalViews, videoCount, avgViews, views30d, views30dSource, frequency, ageDays, disparity, scoreParts, score, revenue, lastPublished, daysSinceLast, topThumbs` (3 vídeos com mais views: `{id, thumb, views}`).

- [ ] **Step 1: Write failing tests** (`now = Date.parse('2026-10-27T12:00:00Z')`):

```js
test('isoDuration', () => { assert.equal(isoDuration('PT1H2M3S'), 3723); assert.equal(isoDuration('P1DT1S'), 86401); assert.equal(isoDuration('x'), 0); });
test('disparity is null for hidden or zero subs', () => { assert.equal(disparity(500, null), null); assert.equal(disparity(500, 0), null); assert.equal(disparity(null, 10), null); assert.equal(disparity(500, 1000), .5); });
test('views30d prefers snapshots 30+ days apart, else sums recent videos', () => {
  const vids = [{ publishedAt: '2026-10-20T00:00:00Z', views: 100 }, { publishedAt: '2026-08-01T00:00:00Z', views: 900 }];
  assert.deepEqual(views30d([{ at: '2026-10-26T00:00:00Z', views: 5000 }], vids, now), { value: 100, source: 'videos' });
  assert.deepEqual(views30d([{ at: '2026-09-20T00:00:00Z', views: 4000 }, { at: '2026-10-26T00:00:00Z', views: 5000 }], vids, now), { value: 1000, source: 'snapshots' });
  assert.deepEqual(views30d([], [], now), { value: null, source: null });
});
test('score of a hidden-subs channel is finite', () => {
  const p = scoreParts({ disparity: null, ageDays: 30, videoCount: 10, daysSinceLast: 2 });
  assert.deepEqual(p, { disparidade: 0, novo: 1, enxuto: 1, ativo: 1 });
  assert.equal(score(p, { disparidade: 40, novo: 20, enxuto: 20, ativo: 20 }), 60);
});
test('outlier multiple and nota', () => {
  const vids = [{ views: 100 }, { views: 200 }, { views: 300 }];
  assert.equal(outlierMultiple(600, vids), 3); assert.equal(outlierMultiple(5, [{ views: 0 }]), null);
  assert.equal(videoRow({ views: 400, publishedAt: '2026-10-23T12:00:00Z', duration: 'PT10M' }, vids, now).nota, 100);
});
test('revenue needs rpm for tag and language', () => {
  assert.equal(revenue(100000, 'historia', 'en', {}), null);
  assert.deepEqual(revenue(100000, 'historia', 'en', { 'historia|en': [2, 5] }), [200, 500]);
});
test('channelRow with no videos has null metrics and no NaN', () => {
  const r = channelRow({ id: 'UC1', title: 't', createdAt: '2026-10-01T00:00:00Z', hiddenSubs: 0 }, [{ at: '2026-10-26T00:00:00Z', subs: 10, views: 0, videos: 0 }], [], now, DEFAULTS);
  assert.equal(r.avgViews, null); assert.equal(r.lastPublished, null); assert.ok(!JSON.stringify(r).includes('NaN'));
});
```

- [ ] **Step 2: Run** `node --test tests/app-metrics.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `scripts/app/metrics.mjs`** com as fórmulas acima. A mediana dos 30 mais recentes ordena uma cópia.
- [ ] **Step 4: Run** `node --test tests/app-metrics.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: app channel metrics`.

### Task 3: Filtros e recortes

**Files:**
- Create: `scripts/app/filters.mjs`
- Test: `tests/app-filters.test.mjs`

**Interfaces:**
- Consumes: linhas de `channelRow` (Task 2).
- Produces:
  - `PRESETS`: objeto `id → { label, filters, sort }`, com exatamente estes ids e valores:
    - `espelhar` "Pra você espelhar": `{ scoreMin: 70, videosMax: 60, daysSinceLastMax: 14 }`, sort `score` desc;
    - `novos` "Canais novos": `{ ageMax: 90 }`, sort `avgViews` desc;
    - `muitaView` "Muita view, pouco inscrito": `{ disparityMin: 1 }`, sort `disparity` desc;
    - `fabrica` "Fábrica de vídeo": `{ frequencyMin: 5 }`, sort `frequency` desc;
    - `enxuto` "Catálogo enxuto": `{ videosMax: 29 }`, sort `avgViews` desc;
    - `semana` "Postou esta semana": `{ daysSinceLastMax: 7 }`, sort `lastPublished` desc;
    - `categoria` "Por categoria": `{}`, sort `tag` asc e depois `score` desc;
    - `tudo` "Tudo": `{}`, sort `score` desc.
  - `applyFilters(rows, f): rows`. Chaves de `f`: `q` (texto em título ou handle, sem acento e sem caixa), `lang`, `country`, `tag`, `faceless` (`true|false`), `subsMin/subsMax`, `views30dMin/views30dMax`, `createdAfter` (ISO), `frequencyMin`, `videosMax`, `ageMax`, `scoreMin`, `disparityMin`, `daysSinceLastMax`, `includeUnknown` (padrão `false`). Um campo `null` na linha reprova o filtro daquele campo, exceto com `includeUnknown: true`, quando passa.
  - `sortRows(rows, key, dir: 'asc'|'desc'): rows` (cópia; `null` sempre no fim; `tag` compara com `localeCompare('pt')`).
  - `runPreset(rows, presetId, extra = {}): rows`: aplica filtros do preset mesclados com `extra`, depois ordena.
  - `parseFilters(params: URLSearchParams): object`: converte números e booleanos (`'1'`/`'true'`); ignora chaves desconhecidas.

- [ ] **Step 1: Write failing tests**

```js
const rows = [
  { id: 'a', title: 'História Antiga', handle: '@hist', lang: 'pt', subs: 1000, avgViews: 5000, disparity: 5, ageDays: 40, videoCount: 12, frequency: 2, score: 85, daysSinceLast: 3, lastPublished: '2026-10-24', tag: 'historia' },
  { id: 'b', title: 'Sleep Facts', handle: '@sleep', lang: null, subs: null, avgViews: 800, disparity: null, ageDays: 400, videoCount: 300, frequency: 7, score: 30, daysSinceLast: 20, lastPublished: '2026-10-07', tag: null },
];
test('presets have the eight fixed ids', () => { assert.deepEqual(Object.keys(PRESETS), ['espelhar', 'novos', 'muitaView', 'fabrica', 'enxuto', 'semana', 'categoria', 'tudo']); });
test('null fields fail a filter unless includeUnknown', () => {
  assert.deepEqual(applyFilters(rows, { lang: 'pt' }).map(r => r.id), ['a']);
  assert.deepEqual(applyFilters(rows, { lang: 'pt', includeUnknown: true }).map(r => r.id), ['a', 'b']);
});
test('text search ignores accents and case', () => { assert.deepEqual(applyFilters(rows, { q: 'historia' }).map(r => r.id), ['a']); });
test('presets', () => {
  assert.deepEqual(runPreset(rows, 'muitaView').map(r => r.id), ['a']);
  assert.deepEqual(runPreset(rows, 'fabrica').map(r => r.id), ['b']);
  assert.deepEqual(runPreset(rows, 'tudo').map(r => r.id), ['a', 'b']);
});
test('sortRows puts nulls last both ways', () => { assert.deepEqual(sortRows(rows, 'subs', 'asc').map(r => r.id), ['a', 'b']); assert.deepEqual(sortRows(rows, 'subs', 'desc').map(r => r.id), ['a', 'b']); });
test('parseFilters', () => { assert.deepEqual(parseFilters(new URLSearchParams('subsMin=100&includeUnknown=1&evil=x')), { subsMin: 100, includeUnknown: true }); });
```

- [ ] **Step 2: Run** `node --test tests/app-filters.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `scripts/app/filters.mjs`.** Sem acento: `s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()`.
- [ ] **Step 4: Run** `node --test tests/app-filters.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: app filters and presets`.

### Task 4: Banco SQLite

**Files:**
- Create: `scripts/app/db.mjs`
- Test: `tests/app-db.test.mjs`

**Interfaces:**
- Consumes: `channelRow`, `videoRow` (Task 2).
- Produces:
  - `openDb(file: string): Db`. Cria as tabelas se faltarem. `':memory:'` vale nos testes. Liga `PRAGMA journal_mode=WAL` e `foreign_keys=ON`. Tabelas da fase 1:
    - `channels(id PK, title, handle, country, lang, avatar, created_at, uploads, topics JSON, hidden_subs INT, tag, faceless INT NULL, added_at)`;
    - `channel_snapshots(channel_id, at, subs, views, videos, PK(channel_id, at))`;
    - `videos(id PK, channel_id, title, published_at, duration, thumb, tags JSON, lang)`;
    - `video_snapshots(video_id, at, views, likes, comments, PK(video_id, at))`;
    - `quota_log(day, units, method, at)`;
    - `cache(url PK, body, expires)`;
    - `history(at, kind, payload JSON)`;
    - `jobs(id PK, kind, status, created_at, finished_at, result JSON, error)`.
  - Métodos de `Db` (todos síncronos):
    - `upsertChannel(c)` (não sobrescreve `tag` e `faceless`);
    - `addChannelSnapshot(id, at, {subs, views, videos})`;
    - `upsertVideo(v)`;
    - `addVideoSnapshot(id, at, {views, likes, comments})`;
    - `setChannelTag(id, {tag, faceless})`;
    - `channelSnapshots(id)`;
    - `channelVideos(id)`: mais novo primeiro, cada um com as views da última captura;
    - `channelRows(now, cfg)`: `channelRow` para todos;
    - `channel(id, now, cfg)`: a linha + `snapshots`, ou `null`;
    - `videoRows(id, now)`;
    - `logQuota(day, units, method)`;
    - `quotaUsed(day)`;
    - `cacheGet(url, now)`;
    - `cacheSet(url, body, expires)`;
    - `addHistory(kind, payload)`;
    - `saveJob(job)`;
    - `close()`.

- [ ] **Step 1: Write failing tests**

```js
test('snapshots accumulate and channelRows computes metrics', () => {
  const db = openDb(':memory:');
  db.upsertChannel({ id: 'UC1', title: 'A', createdAt: '2026-09-01T00:00:00Z', hiddenSubs: 0 });
  db.addChannelSnapshot('UC1', '2026-10-26T00:00:00Z', { subs: 100, views: 1000, videos: 2 });
  db.upsertVideo({ id: 'v1', channelId: 'UC1', title: '<img src=x onerror=alert(1)>', publishedAt: '2026-10-20T00:00:00Z', duration: 'PT5M' });
  db.addVideoSnapshot('v1', '2026-10-26T00:00:00Z', { views: 500 });
  const [r] = db.channelRows(now, DEFAULTS);
  assert.equal(r.subs, 100); assert.equal(r.avgViews, 500); assert.equal(r.views30dSource, 'videos');
  assert.equal(db.videoRows('UC1', now)[0].title, '<img src=x onerror=alert(1)>');
});
test('upsertChannel keeps manual tag', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' }); db.setChannelTag('UC1', { tag: 'historia', faceless: true });
  db.upsertChannel({ id: 'UC1', title: 'A2' }); assert.equal(db.channel('UC1', now, DEFAULTS).tag, 'historia');
});
test('quota and cache', () => {
  const db = openDb(':memory:'); db.logQuota('2026-10-27', 100, 'search'); db.logQuota('2026-10-27', 1, 'channels');
  assert.equal(db.quotaUsed('2026-10-27'), 101); assert.equal(db.quotaUsed('2026-10-26'), 0);
  db.cacheSet('u', '{"a":1}', now + 1000); assert.equal(db.cacheGet('u', now), '{"a":1}'); assert.equal(db.cacheGet('u', now + 2000), null);
});
```

- [ ] **Step 2: Run** `node --test tests/app-db.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `scripts/app/db.mjs`** com `DatabaseSync` e `prepare(...)` guardados. Colunas em snake_case, objetos em camelCase.
- [ ] **Step 4: Run** `node --test tests/app-db.test.mjs`. Expected: PASS. (Um `ExperimentalWarning` do `node:sqlite` é aceitável.)
- [ ] **Step 5: Commit** `feat: app sqlite store`.

### Task 5: Cliente da YouTube Data API

**Files:**
- Create: `scripts/app/youtube.mjs`, `tests/fixtures/youtube/search-video.json`, `search-channel.json`, `channels.json`, `playlistItems.json`, `videos.json`, `quota-exceeded.json`
- Test: `tests/app-youtube.test.mjs`

As fixtures são escritas à mão no formato oficial (`kind`, `items`, `nextPageToken`), com IDs fictícios `UCfixture…`. Não são dados reais.

**Interfaces:**
- Consumes: `Db.logQuota`, `quotaUsed`, `cacheGet`, `cacheSet` (Task 4); `Config` (Task 1).
- Produces:
  - `COSTS = { search: 100, channels: 1, playlistItems: 1, videos: 1 }`.
  - `quotaDay(now: number): string`: `YYYY-MM-DD` em `America/Los_Angeles` (`Intl.DateTimeFormat('en-CA', { timeZone })`).
  - `class YouTubeError extends Error { reason; status }`. `reason` vem de `error.errors[0].reason`. Mensagem `'Cota do YouTube esgotada hoje'` para `quotaExceeded` e `'Chave da API inválida'` para `keyInvalid`.
  - `createYouTube({ key, db, cfg, fetch = globalThis.fetch, now = Date.now }): YouTube`. Métodos assíncronos:
    - `call(method, params)`: base `https://www.googleapis.com/youtube/v3/`. A chave de cache é a URL sem `key`. Com cache válido, não chama `fetch` e não gasta cota. Sem cache, faz `fetch`, registra a cota mesmo em erro HTTP, grava o cache só se ok e lança `YouTubeError` se `!ok`. Sem chave lança `YouTubeError('Configure a chave da API')` antes de qualquer `fetch`;
    - `searchIds(q, type: 'video'|'channel', max = 50)`: devolve IDs de canal (`snippet.channelId` para `type=video`, `id.channelId` para `type=channel`), sem repetir;
    - `channels({ ids?: string[], forHandle?, forUsername? })`: lotes de 50, `part=snippet,statistics,contentDetails,topicDetails`;
    - `uploads(playlistId, max = 30)`: IDs de vídeo, `part=contentDetails`;
    - `videos(ids)`: lotes de 50, `part=snippet,statistics,contentDetails`.
  - `estimateMine(channelCount = 50): number` = `2*COSTS.search + Math.ceil(channelCount/50) + channelCount*2` (para 50 → 301).

- [ ] **Step 1: Write failing tests** (com `fakeFetch` que conta chamadas e devolve as fixtures pelo método da URL):

```js
test('cache hit spends no quota and makes no request', async () => {
  const yt = createYouTube({ key: 'K', db, cfg: DEFAULTS, fetch: fakeFetch, now: () => now });
  await yt.channels({ ids: ['UCfixture1'] }); await yt.channels({ ids: ['UCfixture1'] });
  assert.equal(fakeFetch.calls, 1); assert.equal(db.quotaUsed(quotaDay(now)), 1);
});
test('cache key never contains the api key', async () => {
  await yt.searchIds('sleep', 'video');
  assert.ok(db.raw.prepare('SELECT url FROM cache').all().every(r => !r.url.includes('key=')));
});
test('quotaExceeded raises a readable error and logs the cost', async () => {
  await assert.rejects(ytQuota.searchIds('x', 'video'), e => e instanceof YouTubeError && e.reason === 'quotaExceeded' && e.message === 'Cota do YouTube esgotada hoje');
  assert.equal(db.quotaUsed(quotaDay(now)), 100);
});
test('missing key fails before fetch', async () => { await assert.rejects(createYouTube({ key: '', db, cfg: DEFAULTS, fetch: fakeFetch }).videos(['a']), /Configure a chave/); assert.equal(fakeFetch.calls, 0); });
test('quotaDay uses Pacific time', () => { assert.equal(quotaDay(Date.parse('2026-10-27T05:00:00Z')), '2026-10-26'); });
test('estimateMine', () => { assert.equal(estimateMine(50), 301); });
```

O `Db` expõe `raw` (o `DatabaseSync`) só para testes: acrescente `raw` ao `Db` da Task 4.

- [ ] **Step 2: Run** `node --test tests/app-youtube.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `scripts/app/youtube.mjs`.** Expiração do cache = `now + cfg.cacheHours * 36e5`.
- [ ] **Step 4: Run** `node --test tests/app-youtube.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: youtube api client with cache and quota`.

### Task 6: Mineração, importação e atualização

**Files:**
- Create: `scripts/app/mine.mjs`, `tests/fixtures/youtube/playlist-not-found.json`
- Test: `tests/app-mine.test.mjs`

**Interfaces:**
- Consumes: `YouTube` (Task 5), `Db` (Task 4).
- Produces:
  - `parseChannelInput(text: string): { items: ({id}|{handle}|{username})[], invalid: string[] }`, uma entrada por linha ou vírgula. Aceita:
    - `UC` seguido de 22 caracteres `[A-Za-z0-9_-]`;
    - `@handle`;
    - URL `youtube.com/@x`, `/channel/UC…`, `/user/x`.

    `/c/x` e o resto vão para `invalid`.
  - `ingestChannels(yt, db, ids: string[], report: (msg, done, total) => void, at: string): Promise<{ok: string[], failed: {id, error}[]}>`. Para cada lote:
    - `channels.list`, depois `upsertChannel` e `addChannelSnapshot`;
    - por canal, `uploads` e `videos`, depois `upsertVideo` e `addVideoSnapshot`.

    `playlistNotFound` deixa o canal sem vídeos, sem erro. `quotaExceeded` interrompe tudo e relança (o que já foi gravado fica). O idioma do canal é `snippet.defaultLanguage` ou, sem ele, o prefixo de 2 letras mais comum de `defaultAudioLanguage` dos vídeos, ou `null`. `hiddenSubscriberCount` vira `subs: null`.
  - `mineKeyword(yt, db, q, report, at)`: `searchIds(q,'video')` e `searchIds(q,'channel')` unidos, depois `ingestChannels`, depois `addHistory('mine', {q, found})`.
  - `importChannels(yt, db, text, report, at)`: resolve `handle` e `username` com `channels({forHandle})` e `channels({forUsername})`. Os não achados vão para `invalid`. Depois chama `ingestChannels`. Devolve `{ok, failed, invalid}`.
  - `refreshChannel(yt, db, id, report, at)` = `ingestChannels` de um id.

- [ ] **Step 1: Write failing tests**

```js
test('parseChannelInput accepts urls, handles and ids', () => {
  const r = parseChannelInput('https://www.youtube.com/@sleepfacts\nUCfixture00000000000000a, @hist\nhttps://youtube.com/channel/UCfixture00000000000000b\n/c/old\nlixo');
  assert.deepEqual(r.items, [{ handle: '@sleepfacts' }, { id: 'UCfixture00000000000000a' }, { handle: '@hist' }, { id: 'UCfixture00000000000000b' }]);
  assert.deepEqual(r.invalid, ['/c/old', 'lixo']);
});
test('mineKeyword stores channels, videos and snapshots', async () => {
  await mineKeyword(yt, db, 'sleep history', report, '2026-10-27T12:00:00Z');
  const rows = db.channelRows(now, DEFAULTS); assert.ok(rows.length >= 2); assert.ok(rows.every(r => r.updatedAt === '2026-10-27T12:00:00Z'));
});
test('channel with missing uploads playlist is kept without videos', async () => {
  await ingestChannels(ytNoUploads, db, ['UCfixture1'], report, at); assert.equal(db.channel('UCfixture1', now, DEFAULTS).avgViews, null);
});
test('quota exhaustion mid-run keeps saved channels and rethrows', async () => {
  await assert.rejects(ingestChannels(ytQuotaAfterFirst, db, ['UCfixture1', 'UCfixture2'], report, at), /Cota do YouTube esgotada hoje/);
  assert.ok(db.channel('UCfixture1', now, DEFAULTS));
});
// channels.json tem UCfixture2 com statistics.hiddenSubscriberCount: true
test('hidden subscribers become null', async () => {
  await ingestChannels(yt, db, ['UCfixture2'], report, at);
  const r = db.channel('UCfixture2', now, DEFAULTS); assert.equal(r.subs, null); assert.equal(r.disparity, null);
});
```

- [ ] **Step 2: Run** `node --test tests/app-mine.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `scripts/app/mine.mjs`.**
- [ ] **Step 4: Run** `node --test tests/app-mine.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: channel mining and import`.

### Task 7: Jobs com eventos

**Files:**
- Create: `scripts/app/jobs.mjs`
- Test: `tests/app-jobs.test.mjs`

**Interfaces:**
- Consumes: `Db.saveJob` (Task 4).
- Produces:
  - `createJobs(db): Jobs`, com:
    - `start(kind: string, fn: (report) => Promise<any>): string`: id `crypto.randomUUID()`. Uma fila: um job por vez, os outros ficam `queued`;
    - `get(id)`: `{id, kind, status: 'queued'|'running'|'done'|'error', progress: {done, total, message}, result, error}`;
    - `subscribe(id, listener: (event, data) => void): () => void`: entrega o estado atual na hora (`progress` e, se já acabou, `end`);
    - `list()`.
  - Eventos: `progress` com `{done, total, message}`; `end` com `{status, result?, error?}`. `error` é sempre `e.message` (nunca stack, nunca URL).
  - `sseWrite(res, event, data)`: escreve `event: <e>\ndata: <json>\n\n`.

- [ ] **Step 1: Write failing tests**

```js
test('jobs run one at a time and report progress then end', async () => {
  const jobs = createJobs(openDb(':memory:')), seen = [];
  const a = jobs.start('mine', async r => { r('a', 1, 2); await new Promise(ok => setTimeout(ok, 20)); return { n: 1 }; });
  const b = jobs.start('mine', async () => 2);
  assert.equal(jobs.get(b).status, 'queued');
  await new Promise(ok => jobs.subscribe(a, (e, d) => { seen.push(e); if (e === 'end') ok(); }));
  assert.deepEqual(jobs.get(a).result, { n: 1 }); assert.ok(seen.includes('progress'));
});
test('a failing job ends with message only', async () => {
  const jobs = createJobs(openDb(':memory:')), id = jobs.start('mine', async () => { throw new Error('Cota do YouTube esgotada hoje'); });
  const d = await new Promise(ok => jobs.subscribe(id, (e, d) => e === 'end' && ok(d)));
  assert.deepEqual(d, { status: 'error', error: 'Cota do YouTube esgotada hoje' });
});
test('late subscriber gets end immediately', async () => {
  const jobs = createJobs(openDb(':memory:')), id = jobs.start('mine', async () => 7);
  await new Promise(ok => jobs.subscribe(id, e => e === 'end' && ok()));
  const seen = []; jobs.subscribe(id, (e, d) => seen.push([e, d]));
  assert.deepEqual(seen.at(-1), ['end', { status: 'done', result: 7 }]);
});
```

- [ ] **Step 2: Run** `node --test tests/app-jobs.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `scripts/app/jobs.mjs`** com `node:events` `EventEmitter` por job.
- [ ] **Step 4: Run** `node --test tests/app-jobs.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: app job queue with sse`.

### Task 8: Servidor do app

**Files:**
- Create: `scripts/app-server.mjs`
- Test: `tests/app-server.test.mjs`

**Interfaces:**
- Consumes: Tasks 1 a 7.
- Produces: `startAppServer({ port = 0, dataDir = 'data', appDir = 'app', fetch, now }): Promise<{ origin, token, address, close }>`. A CLI `node scripts/app-server.mjs [--port=8090]` imprime `App: http://127.0.0.1:8090/`.

Rotas estáticas:
- `/` serve `app/index.html` trocando `%APP_TOKEN%` pelo token.
- Os outros arquivos de `app/` (`.html`, `.css`, `.js`) são listados na partida, como `walk` no `studio-server.mjs`.
- Mesma validação de caminho do estúdio: regex `^\/[A-Za-z0-9_./-]+$`, sem `.`/`..` e sem `%`.
- Cabeçalhos: `nosniff`, `Cache-Control: no-store`.
- No HTML vai também `Content-Security-Policy: default-src 'self'; img-src 'self' https://i.ytimg.com https://yt3.ggpht.com; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'`.

Rotas da API (JSON, `application/json; charset=utf-8`):

| Método e rota | Corpo | Resposta |
| ------------- | ----- | -------- |
| `GET /api/config` | | `publicConfig` |
| `POST /api/config` | `{apiKey?, cacheHours?, weights?, rpm?}` | `publicConfig` |
| `GET /api/quota` | | `{day, used, limit}` |
| `POST /api/mine` | `{q}` | `{jobId, estimate}` |
| `POST /api/import` | `{text}` | `{jobId}` |
| `GET /api/jobs/:id/events` | | SSE |
| `GET /api/channels?preset=<id>&<filtros>&sort=<k>&dir=<asc|desc>` | | `{rows, total}` |
| `GET /api/channels/:id` | | linha + `snapshots`, ou 404 |
| `GET /api/channels/:id/videos` | | `videoRows` |
| `POST /api/channels/:id/refresh` | | `{jobId}` |
| `POST /api/channels/:id/tag` | `{tag, faceless}` | linha |

Regras da API:
- `POST /api/mine` rejeita `q` vazio com 400.
- Na listagem de canais, `preset` desconhecido dá 400.
- `:id` aceita só `^UC[A-Za-z0-9_-]{22}$`; fora disso, 400.
- Corpo de POST limitado a 64 KB; acima disso, 413.
- Erros saem como `{error: message}`.

Segurança:
- `Host` errado dá 403.
- POST sem `Origin` igual à origem, ou sem o token, dá 403.
- Métodos diferentes de GET, HEAD e POST dão 405.

- [ ] **Step 1: Write failing tests** (servidor com `dataDir` em `mkdtemp`, `fetch` falso das fixtures, `appDir` com um `index.html` mínimo contendo `%APP_TOKEN%`):

```js
test('binds loopback, injects token, sets CSP', async () => { assert.equal(s.address.address, '127.0.0.1'); const r = await get('/'); assert.ok(r.body.includes(s.token)); assert.match(r.headers['content-security-policy'], /script-src 'self'/); });
test('rejects wrong host, missing origin and missing token', async () => {
  assert.equal((await get('/api/config', { Host: 'evil.test' })).status, 403);
  assert.equal((await post('/api/config', { cacheHours: 1 }, { token: s.token, origin: 'http://evil.test' })).status, 403);
  assert.equal((await post('/api/config', { cacheHours: 1 }, { origin: s.origin })).status, 403);
});
test('api key is stored but never returned', async () => {
  const r = await post('/api/config', { apiKey: 'AIzaTESTKEY1234' }, ok);
  assert.equal(JSON.parse(r.body).apiKeyHint, '…1234'); assert.ok(!r.body.includes('AIzaTEST')); assert.ok(!(await get('/api/config')).body.includes('AIzaTEST'));
});
test('mine job streams progress and end, then channels list shows rows', async () => {
  const { jobId, estimate } = JSON.parse((await post('/api/mine', { q: 'sleep' }, ok)).body); assert.equal(estimate, 301);
  const events = await readSse(`/api/jobs/${jobId}/events`); assert.equal(events.at(-1).event, 'end');
  const list = JSON.parse((await get('/api/channels?preset=tudo')).body); assert.ok(list.total >= 2);
});
test('bad inputs', async () => {
  assert.equal((await post('/api/mine', { q: ' ' }, ok)).status, 400);
  assert.equal((await get('/api/channels?preset=nada')).status, 400);
  assert.equal((await get('/api/channels/..%2f')).status, 403);
  assert.equal((await get('/api/channels/notanid/videos')).status, 400);
  assert.equal((await post('/api/import', { text: 'x'.repeat(70000) }, ok)).status, 413);
});
test('responses with hostile titles are JSON, never HTML', async () => { const r = await get('/api/channels/UCfixture00000000000000a/videos'); assert.match(r.headers['content-type'], /application\/json/); });
test('static traversal is rejected', async () => { for (const p of ['/../package.json', '/app/../data/config.json', '/%2e%2e/x', '/data/config.json']) assert.ok([403, 404].includes((await get(p)).status), p); });
```

- [ ] **Step 2: Run** `node --test tests/app-server.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `scripts/app-server.mjs`.** Rotas em uma tabela `[método, regex, handler]`. `now` e `fetch` são injetáveis. O `Db` é aberto em `dataDir/app.db`. A chave é lida de `loadConfig(dataDir)` a cada criação do cliente, assim uma chave nova vale sem reiniciar.
- [ ] **Step 4: Run** `node --test tests/app-server.test.mjs`, then `npm test`. Expected: PASS; os testes antigos continuam passando.
- [ ] **Step 5: Commit** `feat: local app server`.

### Task 9: Casca da interface e Configurações

**Files:**
- Create: `app/index.html`, `app/app.css`, `app/dom.js`, `app/api.js`, `app/main.js`, `app/views/settings.js`

**Interfaces:**
- Consumes: API da Task 8.
- Produces:
  - `h(tag, attrs?, ...children): Element` em `app/dom.js`. `attrs.on<Evento>` vira `addEventListener`, `attrs.class`/`dataset`/`title`/`src`/`href` viram propriedades, e o resto vira `setAttribute`. Filhos `string` viram `TextNode`, e `null`/`false` são ignorados. Também `fmt.num(n)` (`'1,2 mil'`, `'3,4 mi'`, `'—'` para null), `fmt.ago(iso)` (`'há 3 d'`) e `fmt.date(iso)`.
  - `api.get(path)`, `api.post(path, body)` (envia `X-App-Token` lido de `<meta name="app-token">`), `api.events(jobId, onEvent): EventSource`, todos em `app/api.js`.
  - `route(hash)` em `app/main.js`. Mapa `#/minerar` → `views/mine.js`, `#/config` → `views/settings.js`, e o padrão é `#/minerar`. Cada view exporta `render(root: Element, params: URLSearchParams): void`.

Layout: tema escuro, menu lateral com todos os itens do print do Runner.
- Ficam ativos só "Minerar canais" e "Configurações".
- Visão geral, Minerar vídeos, Outliers, Nichos, Concorrentes, Coleções, Monitoramento, Favoritos e Histórico aparecem desabilitados, com o selo "em breve".
- A barra do topo mostra o medidor de cota (`GET /api/quota`, "312 / 10 000 hoje"), que se atualiza ao fim de cada job.

Configurações:
- campo de senha para a chave, com a dica `apiKeyHint`;
- validade do cache;
- pesos do score (4 números);
- tabela RPM (etiqueta, idioma, mín, máx).

- [ ] **Step 1: Write `app/index.html`** com `<meta name="app-token" content="%APP_TOKEN%">`, `<link rel="stylesheet" href="/app.css">` e `<script type="module" src="/main.js">`. Sem script inline (a CSP bloqueia).
- [ ] **Step 2: Implement `dom.js`, `api.js`, `main.js`, `views/settings.js`, `app.css`.**
- [ ] **Step 3: Verify** com `node --test tests/app-server.test.mjs` (as rotas estáticas reais de `app/` são servidas) e `grep -rnE "innerHTML|insertAdjacentHTML|on[a-z]+=\"" app/`. Expected: testes PASS, grep sem resultado.
- [ ] **Step 4: Verify in browser:**
  - `npm run app`;
  - abrir `http://127.0.0.1:8090/#/config`;
  - salvar uma chave de teste `AIzaFAKE0000`, recarregar e ver a dica `…0000`.

  Expected: o console do navegador não mostra erros de CSP. Depois apague `data/config.json` ou grave a chave real.
- [ ] **Step 5: Commit** `feat: app shell and settings`.

### Task 10: Minerar canais e painel do canal

**Files:**
- Create: `app/views/mine.js`, `app/views/channel.js`
- Modify: `app/app.css`

**Interfaces:**
- Consumes: `h`, `fmt`, `api` (Task 9); rotas da Task 8; ids e rótulos de `PRESETS` (Task 3), repetidos como constante em `mine.js`.
- Produces: `render(root, params)` em `mine.js`; `openChannel(panel: Element, id: string)` em `channel.js`.

Tela Minerar canais:
- **Topo:**
  - campo "Buscar canal, nicho ou palavra-chave" e botão Buscar, que mostra a confirmação "Custa ~301 unidades da cota. Continuar?" e então faz `POST /api/mine`;
  - botão "Importar canais", que abre uma área de colagem e faz `POST /api/import`;
  - barra de progresso pelo SSE. No fim do job, mostra os `invalid`/`failed` e recarrega a lista.
- **Recortes:** os 8 recortes em botões, do mesmo jeito que o "Pra você espelhar" do Minerador.
- **Filtros (locais, sem cota):** idioma, país, etiqueta, com/sem rosto, faixas de inscritos e views 30d, criado depois de, frequência mínima, máximo de vídeos, "Incluir indefinidos", "Limpar filtros". O estado fica na URL (`#/minerar?preset=novos&subsMin=1000`), assim voltar e recarregar mantêm a busca.
- **Tabela:** #, Canal (avatar, título, bandeira por `country`, selo NOVA se `ageDays <= 90`), Etiqueta, Inscritos ("oculto" se null), Views 30d (com "≈" e o título "estimativa por vídeos dos últimos 30 dias" quando `views30dSource === 'videos'`), Média/vídeo, Frequência (/sem), Score, Analisar. Clicar no cabeçalho ordena.
- **Cartões:**
  - avatar, título, NOVA, etiqueta;
  - 3 thumbs (`topThumbs`) com views;
  - Média/vídeo, US$/mês ("estimativa", ou "defina RPM" se null), Inscritos, Views/mês, Vídeos;
  - "Último vídeo há X d" e "Atualizado há X".
- Alternância tabela/cartões. A escolha fica em `localStorage` dentro de `try/catch`.
- **Lista vazia:** "Nenhum canal ainda. Busque uma palavra-chave ou importe canais."

Painel do canal (à direita, abre em "Analisar" e por `#/minerar?canal=<id>`):
- **Cabeçalho:** avatar, título, handle, link "Visitar canal" (`https://www.youtube.com/channel/<id>`, `rel="noopener noreferrer"`, `target="_blank"`), botão "Atualizar" (`POST refresh`), etiqueta editável e com/sem rosto (`POST tag`).
- **Aba Visão geral:**
  - Inscritos, Views 30d, Média por vídeo, Vídeos, Idade, Frequência;
  - Score com a decomposição (4 barras: parte × peso);
  - Receita estimada;
  - "Dados de <data da última captura>";
  - lista das capturas (data, inscritos, views). Abaixo de 2 capturas: "histórico começa em <data>".
- **Aba Vídeos:** tabela com thumb, título, publicado, duração, views, views/dia, múltiplo ("+X% acima da média" = `(multiple-1)*100`) e nota/100. Ordena por views/dia por padrão.
- As abas Análise e Concorrentes aparecem desabilitadas, com "em breve".

- [ ] **Step 1: Implement `views/mine.js`.**
- [ ] **Step 2: Implement `views/channel.js`.**
- [ ] **Step 3: Verify** com `grep -rnE "innerHTML|insertAdjacentHTML|on[a-z]+=\"" app/` (sem resultado) e `npm test` (PASS).
- [ ] **Step 4: Verify in browser with hostile data:**
  - Com `dataDir` temporário, rode um script de verificação de uma vez em `out/tmp/`. Ele inicia `startAppServer` com o `fetch` falso das fixtures e um vídeo de título `<img src=x onerror=alert(1)>`.
  - Abra a página no Chrome (Playwright), rode "sleep", troque entre tabela e cartões, abra o painel e a aba Vídeos.

  Expected:
  - o título aparece como texto;
  - nenhum `alert`;
  - nenhum erro de CSP no console;
  - "oculto" no canal com inscritos escondidos;
  - nenhum `NaN` ou `Infinity` na página (`document.body.innerText`).
- [ ] **Step 5: Commit** `feat: mine channels view and channel panel`.

### Task 11: Aceite com dados reais

**Files:** none (a chave vai só em `data/config.json`, fora do git).

- [ ] **Step 1:**
  - Grave a chave do usuário pela tela Configurações. Ela foi dada na conversa; não a escreva em nenhum arquivo do repositório.
  - Run `git status --porcelain data/`. Expected: sem saída.
- [ ] **Step 2:**
  - `npm run app`;
  - buscar "sleep history documentary";
  - aceitar o custo.

  Expected:
  - o job chega a `end` com `done`;
  - o medidor mostra cerca de 301 unidades;
  - a tabela tem linhas com dados de hoje.
- [ ] **Step 3:**
  - Repetir a mesma busca. Expected: a cota não aumenta (cache).
  - Importar `@` de um canal conhecido mais uma linha de lixo. Expected: o lixo aparece listado como inválido.
- [ ] **Step 4:**
  - Abrir 2 canais, conferir as abas Visão geral e Vídeos e testar os recortes "Canais novos" e "Muita view, pouco inscrito".
  - Conferir 1 canal no YouTube: inscritos e nº de vídeos batem com o painel (com a tolerância do arredondamento que o YouTube aplica aos inscritos).
- [ ] **Step 5:**
  - Run `git grep -n "AIza" -- . ':!docs/arquivos'`. Expected: só as chaves falsas dos testes (`AIzaTEST…`, `AIzaFAKE…`).
  - Registre uma entrada curta em `docs/VALIDATION.md`: data, busca, unidades gastas, nº de canais, o que foi conferido.
  - Commit `docs: webapp phase 1 acceptance`.
