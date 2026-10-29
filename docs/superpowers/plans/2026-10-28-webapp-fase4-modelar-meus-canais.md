# Webapp Fase 4 (Modelar e Meus canais) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partir de um canal âncora e gerar 3 conceitos de canal derivado com o Claude, cada um com moldes de título, estilo de thumbnail, prompts de imagem, estilo visual e plano de 30 dias. Transformar um conceito num dos Meus canais, o perfil que a fase 6 usa para gerar vídeo. O perfil guarda nicho, idioma, estilo, voz, ritmo, duração, âncora, concorrentes e moldes.

**Architecture:**
- Lógica pura: subtemas do âncora, prompt e validação da modelagem, validação do perfil.
- I/O isolado: thumbnails, Claude com imagens, amostra de voz.
- O servidor ganha rotas na tabela `ROUTES`. A modelagem roda na fila de jobs com progresso por SSE e não gasta cota do YouTube.
- O Claude recebe as thumbnails como imagens pela entrada `stream-json` do `claude -p`, sem nenhuma ferramenta.

**Tech Stack:** Node 24 (`node:http`, `node:sqlite`, `node:child_process`, `fetch`, `node:test`), HTML/CSS/módulos ES sem framework, `claude -p`, Kokoro-82M (Python, subprocesso).

**Spec:** `docs/superpowers/specs/2026-10-27-webapp-canais-dark-design.md`, seções "Modelar" e "Meus canais", chamadas 1, 8, 10, 12, 13 e 14, fase 4. Formato, nomes e segurança seguem o código das fases 1 a 3 na `main`.

## Decisões

Pontos que o spec deixa abertos, decididos aqui:

1. **Subtemas sem LLM.** Candidatas: as 15 palavras de título (`titleWords`) mais frequentes do canal que aparecem em pelo menos 2 vídeos. Cada vídeo vai para o subtema da sua candidata mais frequente. Vídeo sem nenhuma dessas palavras vai para "outros". Por subtema: nº de vídeos, mediana de views, soma de views e os vídeos (ordenados por views). Ordem dos subtemas: soma de views decrescente. Até 8 subtemas, mais "outros".
2. **Números são do app, nunca do Claude.**
   - O Claude devolve os `videoIds` de base de cada conceito, que precisam estar entre os enviados.
   - "Views no âncora" é a soma das views desses vídeos, calculada pelo app.
3. **Thumbnails como imagem.**
   - O servidor baixa até 6 thumbnails (`mqdefault`, 320×180) dos vídeos com mais views do âncora.
   - Só aceita URL `https://i.ytimg.com/vi/<id de 11 caracteres>/mqdefault.jpg`, com resposta `image/jpeg` de até 200 KB.
   - Cache em `out/app/thumbs/<id>.jpg`.
   - O Claude recebe essas imagens em blocos `image` (base64) pela entrada `stream-json`.
   - Testado em 28/10: `claude -p --input-format stream-json --output-format stream-json --verbose --tools "" --strict-mcp-config --no-session-persistence` com um PNG respondeu certo. A resposta é a linha `{"type":"result", ...}` com `result` e `is_error`.
   - Se o download falhar, a modelagem segue só com texto e o resultado leva `semImagens: true`.
4. **Formato da modelagem** (`validateModel`): `{ resumo: string ≤ 1500, conceitos: [exatamente 3] }`. Cada conceito tem:
   - `nome` ≤ 80;
   - `subtema` ≤ 80;
   - `videoIds`: de 1 a 5, todos entre os enviados;
   - `moldesTitulo`: de 3 a 5, cada um ≤ 120, com pelo menos uma lacuna `[...]`;
   - `estiloThumbnail` ≤ 400;
   - `promptsImagem`: 3, cada um ≤ 400;
   - `estiloVisual` ∈ `EPISODE_STYLES`;
   - `plano30`: de 8 a 15 itens `{ dia: 1..30, tema ≤ 120 }`, com `dia` crescente.

   Um molde igual a um título enviado (comparado sem acento, caixa e pontuação) é rejeitado com `Modelagem copiou um título`.
5. **Modelagem gravada.** Tabela `models`, guardando a entrada (âncora, canais extras, ids dos vídeos enviados, `semImagens`) e a saída validada. Refazer cria uma nova; as antigas ficam listadas no âncora. Timeout do Claude: 300 s.
6. **Canais extras do mesmo nicho:** até 4, escolhidos entre os canais semelhantes do âncora (`similarChannels`, fase 2). Entram no prompt só com título e os 10 títulos de vídeo com mais views. Não entram imagens deles.
7. **Estilos e vozes do perfil** (chamadas 10 e 14):
   - `EPISODE_STYLES = ['flat', 'watercolor']`. A fase 5 troca essa constante pela marca de capacidade dos estilos.
   - `VOICES = { pt: ['pm_alex', 'pf_dora', 'pm_santa'], en: ['af_heart', 'af_bella', 'am_michael', 'bf_emma', 'bm_george'] }`, gravadas como `kokoro:<id>`.
   - Idioma só `pt` ou `en`.
8. **Perfil** (tabela `my_channels`):
   - `name`: único, de 1 a 60 caracteres;
   - `tag`: nicho, até 40, opcional;
   - `lang`;
   - `style`;
   - `voice`;
   - `speed`: de 0,8 a 1,3, padrão 1, que vira o `speed` do Kokoro;
   - `targetMin`: inteiro de 10 a 120, padrão 30;
   - `toleranceMin`: inteiro de 1 a 15, padrão 3;
   - `anchorId` e `modelId`/`conceptIndex`: opcionais;
   - `titleTemplates`: até 10, cada um ≤ 120;
   - `descriptionTemplate`: ≤ 2000, com os marcadores livres `{fontes}` e `{capitulos}`, preenchidos na fase 6;
   - `format`: fixo em `'long-16:9'`.

   Música fica para a fase 6.
9. **Concorrentes por canal meu:** tabela `my_competitors(my_id, channel_id)`. Ao ligar um canal, ele também ganha `watch.competitor = true`, e a tela Concorrentes da fase 3 continua mostrando todos. A tela ganha o seletor "Todos | <meu canal>".
10. **Conceito para perfil:** `profileFromConcept(model, index, anchorRow)` preenche:
    - `name` = nome do conceito;
    - `tag` = etiqueta do âncora;
    - `lang` = idioma do âncora, se for `pt` ou `en`, senão `pt`;
    - `style` = `estiloVisual`;
    - `voice` = a primeira voz do idioma;
    - `titleTemplates` = `moldesTitulo`;
    - `anchorId`, `modelId` e `conceptIndex`.

    O usuário revisa no formulário antes de gravar.
11. **Amostra de voz e palavras por minuto:**
    - "Ouvir amostra" gera um WAV com um texto fixo por idioma (cerca de 60 palavras) pelo Kokoro, em `out/app/samples/<sha1(voz|speed|texto)>.wav`.
    - Mede `wpm = palavras / (segundos / 60)` e grava em `data/config.json` (`voiceWpm["kokoro:<id>|<speed>"]`). A fase 6 usa esse valor para a meta de palavras.
    - `scripts/kokoro_say.py` passa a tirar o `lang_code` da primeira letra da voz (`p`, `a` ou `b`), que é a convenção do Kokoro.
    - Sem o venv do Kokoro (`out/tmp/kokoro-venv`), a rota responde 200 com `{error: 'Kokoro não instalado: veja docs/VOICE.md'}`.

## Global Constraints

- Sem dependências npm novas. Só módulos `node:*`, `fetch` global e os executáveis `claude` e o Python do venv do Kokoro.
- Segurança das fases 1 a 3, sem mudança:
  - só `127.0.0.1`, com `Host` exato;
  - POST com `Origin` igual à origem e `X-App-Token`;
  - só GET, HEAD e POST;
  - corpo de até 64 KB;
  - erros `{error}`, sem stack nem URL;
  - mesma CSP: thumbnails só de `i.ytimg.com`/`yt3.ggpht.com`; áudio servido pelo próprio app, que `default-src 'self'` já cobre.
- O servidor só baixa da lista fixa da decisão 3. Nenhuma URL vinda do navegador ou do Claude é baixada.
- Chave da API só em `data/config.json`. Nunca em código, teste, log, commit ou resposta HTTP. Nenhum dado pessoal do usuário vai ao Claude nem a outro serviço.
- Texto do YouTube que vai ao `claude` é dado:
  - delimitador `<<<DADOS … DADOS>>>` e `oneLine`;
  - `--tools ""`;
  - saída validada e exibida como texto, com o rótulo "gerado pelo Claude".
- Modelar é extrair padrão: moldes com lacunas, nunca títulos copiados (decisão 4).
- DOM só via `h()`. Proibido `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` e `on*=` em atributo.
- Interface em pt-BR. Commits em inglês (`feat:`, `fix:`, `test:`, `docs:`), terminando com:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Testes em `tests/app-*.test.mjs`, sem rede, sem `data/` real, sem `claude` real e sem Kokoro real (`spawn` e `fetch` injetados). Os 258 testes atuais continuam passando.
- Estilo do repositório: ESM `.mjs`, linhas compactas, comentários curtos em português. Um escritor por arquivo em cada onda.

## Review Focus

1. **Claude devolve número, id inventado ou título copiado:**
   - id fora dos enviados: rejeitado;
   - título copiado: rejeitado;
   - views: sempre as do app.

   Testes na Task 2.
2. **Âncora com poucos vídeos (0 a 2) ou sem thumbnails:** a modelagem com 0 vídeos dá 400 `Âncora sem vídeos`; com 1 ou 2, roda. A falha de thumbnail vira `semImagens`, sem derrubar o job. Testes nas Tasks 2, 4 e 6.
3. **Resposta do Claude quebrada** (não JSON, `is_error`, timeout, `claude` ausente): o job termina com `error` legível e o prompt fica disponível para copiar. Testes nas Tasks 4 e 6.
4. **Perfil inválido** (idioma `es`, estilo `pixel`, voz de outro idioma, nome repetido, `targetMin` 5): 400 com a mensagem do campo. Testes nas Tasks 3 e 6.
5. **Thumbnail de URL fora do padrão, resposta HTML ou mais de 200 KB:** nunca é baixada nem gravada. Teste na Task 4.

## Modelos por tarefa

| Task | Modelo | Effort |
| ---- | ------ | ------ |
| 1, 2, 3, 5 | sonnet | high |
| 4 | sonnet | high |
| 6 | opus | high |
| 7, 8, 9 | sonnet | high |
| 10 (aceite) | sessão principal | — |

## Ondas

- A: Tasks 1, 3, 4 e 5 em paralelo (arquivos distintos).
- B: Task 2, que usa o `oneLine` exportado na Task 4.
- C: Task 6.
- D: Tasks 7, 8 e 9, uma de cada vez, porque as três editam `app/app.css` e `app/main.js`.
- E: Task 10.

## Estrutura de arquivos

- Modify `scripts/app/db.mjs`: tabelas `models`, `my_channels`, `my_competitors` e os métodos delas.
- Create `scripts/app/modeling.mjs`: `subtopics`, `modelPrompt`, `validateModel` (puros). Create `prompts/modelagem.md`.
- Create `scripts/app/profiles.mjs`: `EPISODE_STYLES`, `VOICES`, `validateProfile`, `profileFromConcept` (puros).
- Create `scripts/app/thumbs.mjs`: `fetchThumbs`.
- Modify `scripts/app/llm.mjs`: exportar `oneLine`, mais `runClaudeImages`.
- Create `scripts/app/voice.mjs`: `sampleVoice`, `SAMPLE_TEXT`. Modify `scripts/kokoro_say.py`: `lang_code` pela voz.
- Modify `scripts/app/config.mjs`: `DEFAULTS.voiceWpm = {}`.
- Modify `scripts/app-server.mjs`: rotas, opções injetáveis `modeler`, `thumbFetch`, `voiceSpawn`.
- Modify `app/main.js`, `app/views/channel.js`, `app/views/competitors.js`, `app/app.css`. Create `app/views/model.js`, `app/views/mychannels.js`.
- Create `tests/app-modeling.test.mjs`, `tests/app-profiles.test.mjs`, `tests/app-thumbs.test.mjs`, `tests/app-voice.test.mjs`. Modify `tests/app-db.test.mjs`, `tests/app-llm.test.mjs`, `tests/app-server.test.mjs`.

---

### Task 1: Banco: modelagens, Meus canais e concorrentes por canal

**Files:**
- Modify: `scripts/app/db.mjs`, `scripts/app/config.mjs`
- Test: `tests/app-db.test.mjs`

**Interfaces:**
- Produces:
  - SQL novo:
    - `models(id INTEGER PRIMARY KEY, anchor_id TEXT NOT NULL REFERENCES channels(id), created_at TEXT, input TEXT, output TEXT)`;
    - `my_channels(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, tag, lang, style, voice, speed REAL, target_min INT, tolerance_min INT, anchor_id TEXT, model_id INT REFERENCES models(id) ON DELETE SET NULL, concept_index INT, title_templates TEXT, description_template TEXT, format TEXT, created_at, updated_at)`;
    - `my_competitors(my_id INT NOT NULL REFERENCES my_channels(id) ON DELETE CASCADE, channel_id TEXT NOT NULL REFERENCES channels(id), PRIMARY KEY(my_id, channel_id))`.
  - `DEFAULTS.voiceWpm = {}`.
  - Métodos do `Db` (objetos em camelCase, JSON das colunas TEXT já convertido):
    - `addModel({anchorId, input, output}): number`;
    - `model(id): {id, anchorId, createdAt, input, output} | null`;
    - `modelsOf(anchorId): {id, createdAt, names: string[]}[]`, mais novo primeiro;
    - `createMyChannel(p): number | null`: `null` se o nome repetir;
    - `updateMyChannel(id, p): boolean`: `false` se o nome repetir ou o id não existir;
    - `deleteMyChannel(id): boolean`;
    - `myChannel(id): Profile & {id, competitors: string[]} | null`;
    - `myChannels(): (Profile & {id, competitorCount})[]`, por nome;
    - `setMyCompetitors(id, channelIds: string[]): void`: troca a lista inteira e liga `watch.competitor = true` em cada canal, pelo `setWatch` da fase 3;
    - `myCompetitorIds(id): string[]`.

- [ ] **Step 1: Write failing tests**

```js
test('models round-trip and list by anchor', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  const id = db.addModel({ anchorId: 'UC1', input: { videoIds: ['v1'] }, output: { conceitos: [{ nome: 'X' }, { nome: 'Y' }, { nome: 'Z' }] } });
  assert.deepEqual(db.model(id).input, { videoIds: ['v1'] }); assert.deepEqual(db.modelsOf('UC1')[0].names, ['X', 'Y', 'Z']);
});
test('my channels: unique name, update, competitors mark watch', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  const p = { name: 'Canal', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3, titleTemplates: ['[x] y'], format: 'long-16:9' };
  const id = db.createMyChannel(p); assert.equal(db.createMyChannel({ ...p, name: 'canal' }), null);
  assert.equal(db.updateMyChannel(id, { ...p, targetMin: 45 }), true); assert.equal(db.myChannel(id).targetMin, 45);
  db.setMyCompetitors(id, ['UC1']); assert.deepEqual(db.myChannel(id).competitors, ['UC1']); assert.equal(db.watch('UC1').competitor, true);
  assert.equal(db.myChannels()[0].competitorCount, 1); assert.equal(db.deleteMyChannel(id), true); assert.equal(db.myChannel(id), null);
});
```

- [ ] **Step 2: Run** `node --test tests/app-db.test.mjs`. Expected: FAIL nos testes novos.
- [ ] **Step 3: Implement** no padrão do objeto `s` de `db.mjs`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: models and my channels store`.

### Task 2: Subtemas, prompt e validação da modelagem

**Files:**
- Create: `scripts/app/modeling.mjs`, `prompts/modelagem.md`
- Test: `tests/app-modeling.test.mjs`

**Interfaces:**
- Consumes: `titleWords` de `analysis.mjs`; `oneLine` de `llm.mjs` (exportado na Task 4); a lista de estilos chega por parâmetro (`styles`), sem importar `profiles.mjs`; forma de `videoRow` (`{id, title, views, durationS, thumb}`).
- Produces:
  - `subtopics(videos): {word: string|null, label: string, count, medianViews, totalViews, videos: VideoRow[]}[]`. Segue a decisão 1. `word` é `null` em "outros", e `label` é a palavra ou `'outros'`.
  - `modelPrompt(template, { anchor: {title}, groups, extras: {title, titles: string[]}[], styles: string[] }): { prompt: string, videoIds: string[] }`. Os placeholders são:
    - `{{ancora}}`;
    - `{{subtemas}}`: um bloco por subtema, com rótulo, contagem e mediana, e até 5 linhas `id | views | minutos | título`;
    - `{{extras}}`;
    - `{{estilos}}`.

    `videoIds` são os ids que entraram no prompt (no máximo 40). Placeholder desconhecido lança erro.
  - `validateModel(o, { videoIds: string[], titles: string[], styles: string[] }): Model`, com as regras da decisão 4. Mensagens:
    - `Resposta do Claude fora do formato`;
    - `Modelagem copiou um título`.
  - `modelViews(model, videoRows): number[]`: soma de views dos `videoIds` de cada conceito.
- O texto de `prompts/modelagem.md` segue `prompts/analise-canal.md`:
  - mesmo aviso sobre o bloco de dados;
  - tarefa: 3 canais derivados, cada um num subtema que o âncora já provou;
  - também pede o `resumo` do que o âncora prova;
  - as imagens são thumbnails do âncora, para descrever o estilo;
  - regras: moldes com lacunas `[...]`, sem copiar títulos, `videoIds` só da lista, sem números, `estiloVisual` da lista, e só JSON no formato da decisão 4.

- [ ] **Step 1: Write failing tests**

```js
const V = (id, title, views) => ({ id, title, views, durationS: 3600, thumb: null });
const vids = [V('a0000000001', 'Roman empire fall', 900), V('a0000000002', 'Roman legion life', 500), V('a0000000003', 'Egypt pyramids secrets', 300), V('a0000000004', 'Untitled', 10)];
test('subtopics groups by most frequent word and sorts by total views', () => {
  const g = subtopics(vids);
  assert.equal(g[0].word, 'roman'); assert.equal(g[0].count, 2); assert.equal(g[0].totalViews, 1400); assert.equal(g[0].medianViews, 700);
  assert.equal(g.at(-1).label, 'outros'); assert.deepEqual(subtopics([]), []);
});
const concept = i => ({ nome: 'C' + i, subtema: 's', videoIds: ['a0000000001'], moldesTitulo: ['O fim de [império]', '[número] fatos de [lugar]', 'Como vivia um [ofício]'],
  estiloThumbnail: 'e', promptsImagem: ['p', 'p', 'p'], estiloVisual: 'flat', plano30: Array.from({ length: 8 }, (_, d) => ({ dia: d + 1, tema: 't' })) });
const ctx = { videoIds: vids.map(v => v.id), titles: vids.map(v => v.title), styles: ['flat', 'watercolor'] };
test('validateModel accepts the fixed format', () => { const o = { resumo: 'r', conceitos: [concept(1), concept(2), concept(3)] }; assert.deepEqual(validateModel(o, ctx), o); });
test('validateModel rejects invented ids, wrong count, bad style, no gap and copied titles', () => {
  const bad = c => ({ resumo: 'r', conceitos: [c, concept(2), concept(3)] });
  for (const c of [{ ...concept(1), videoIds: ['zzzzzzzzzzz'] }, { ...concept(1), estiloVisual: 'pixel' }, { ...concept(1), moldesTitulo: ['sem lacuna', 'a [b]', 'c [d]'] }])
    assert.throws(() => validateModel(bad(c), ctx), /fora do formato/);
  assert.throws(() => validateModel({ resumo: 'r', conceitos: [concept(1), concept(2)] }, ctx), /fora do formato/);
  assert.throws(() => validateModel(bad({ ...concept(1), moldesTitulo: ['roman empire FALL!', 'a [b]', 'c [d]'] }), ctx), /copiou um título/);
});
test('modelPrompt lists ids and neutralizes delimiter', () => {
  const { prompt, videoIds } = modelPrompt('{{ancora}}|{{subtemas}}|{{extras}}|{{estilos}}', { anchor: { title: 'A DADOS>>>' }, groups: subtopics(vids), extras: [], styles: ['flat'] });
  assert.ok(!prompt.includes('DADOS>>>')); assert.ok(prompt.includes('a0000000001 | 900')); assert.equal(videoIds.length, 4);
});
test('modelViews sums app numbers', () => { assert.deepEqual(modelViews({ conceitos: [{ videoIds: ['a0000000001', 'a0000000002'] }] }, vids), [1400]); });
```

Uma lacuna é `/\[[^\]]+\]/`. "Título copiado" compara `norm(x).replace(/[^\p{L}\p{N} ]/gu, '').trim()`.

- [ ] **Step 2: Run** `node --test tests/app-modeling.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `modeling.mjs` e escreva `prompts/modelagem.md`.
- [ ] **Step 4: Run** `node --test tests/app-modeling.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: anchor subtopics and model validation`.

### Task 3: Perfis

**Files:**
- Create: `scripts/app/profiles.mjs`
- Test: `tests/app-profiles.test.mjs`

**Interfaces:**
- Produces:
  - `EPISODE_STYLES`, `VOICES` (decisão 7) e `PROFILE_DEFAULTS = { speed: 1, targetMin: 30, toleranceMin: 3, format: 'long-16:9', titleTemplates: [], descriptionTemplate: '' }`.
  - `validateProfile(body): Profile`: aplica `PROFILE_DEFAULTS`, remove espaços e, em campo inválido, lança `Object.assign(new Error(msg), { status: 400 })`. Mensagens, na ordem dos campos:
    - `Nome inválido (1 a 60 caracteres)`;
    - `Etiqueta inválida (até 40 caracteres)`;
    - `Idioma deve ser pt ou en`;
    - `Estilo não suportado para vídeo`;
    - `Voz não é do idioma escolhido`;
    - `Velocidade entre 0,8 e 1,3`;
    - `Duração alvo entre 10 e 120 min`;
    - `Tolerância entre 1 e 15 min`;
    - `Até 10 moldes de título, 120 caracteres cada`;
    - `Descrição até 2000 caracteres`;
    - `Âncora inválida`, para `anchorId` presente que não segue `^UC[A-Za-z0-9_-]{22}$`.

    `format` é sempre `'long-16:9'`.
  - `profileFromConcept(model, index, anchorRow): Profile`, com a regra da decisão 10.

- [ ] **Step 1: Write failing tests**

```js
const base = { name: 'Roma à Noite', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex' };
test('defaults are applied', () => { const p = validateProfile(base); assert.equal(p.targetMin, 30); assert.equal(p.format, 'long-16:9'); assert.equal(p.speed, 1); });
test('invalid fields give field messages', () => {
  const cases = [[{ lang: 'es' }, /pt ou en/], [{ style: 'pixel' }, /Estilo/], [{ voice: 'kokoro:af_heart' }, /Voz/], [{ targetMin: 5 }, /Duração/], [{ speed: 2 }, /Velocidade/], [{ name: ' ' }, /Nome/], [{ titleTemplates: Array(11).fill('x') }, /moldes/], [{ anchorId: '../x' }, /Âncora/]];
  for (const [patch, re] of cases) assert.throws(() => validateProfile({ ...base, ...patch }), e => re.test(e.message) && e.status === 400);
});
test('profileFromConcept', () => {
  const model = { id: 7, anchorId: 'UCaaaaaaaaaaaaaaaaaaaaaa', output: { conceitos: [{}, { nome: 'Sono Romano', estiloVisual: 'watercolor', moldesTitulo: ['[a] b'] }, {}] } };
  const p = profileFromConcept(model, 1, { tag: 'historia', lang: 'en' });
  assert.deepEqual([p.name, p.style, p.lang, p.voice, p.tag, p.modelId, p.conceptIndex, p.titleTemplates], ['Sono Romano', 'watercolor', 'en', 'kokoro:af_heart', 'historia', 7, 1, ['[a] b']]);
  assert.equal(profileFromConcept(model, 1, { tag: null, lang: 'de' }).lang, 'pt');
});
```

- [ ] **Step 2: Run** `node --test tests/app-profiles.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `profiles.mjs`.**
- [ ] **Step 4: Run** `node --test tests/app-profiles.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: channel profile validation`.

### Task 4: Thumbnails e Claude com imagens

**Files:**
- Create: `scripts/app/thumbs.mjs`
- Modify: `scripts/app/llm.mjs`
- Test: `tests/app-thumbs.test.mjs`, `tests/app-llm.test.mjs`

**Interfaces:**
- Produces:
  - `thumbUrl(id): string | null`: `https://i.ytimg.com/vi/<id>/mqdefault.jpg` se `id` segue `^[A-Za-z0-9_-]{11}$`; senão `null`.
  - `fetchThumbs(ids, dir, { fetch = globalThis.fetch, max = 6 }): Promise<{id, mediaType: 'image/jpeg', base64}[]>`:
    - lê do cache `dir/<id>.jpg` se existir; senão baixa `thumbUrl(id)`;
    - aceita só `r.ok`, `content-type` começando por `image/jpeg` e até 200 000 bytes (checa `content-length` e o tamanho real);
    - grava no cache;
    - ignora em silêncio o que falhar;
    - para em `max`.
  - Em `llm.mjs`:
    - `export const oneLine` (já existe, só passa a ser exportado);
    - `CLAUDE_IMAGE_ARGS = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--tools', '', '--strict-mcp-config', '--no-session-persistence']`;
    - `runClaudeImages(prompt, images, { spawn, timeoutMs = 300000 }): Promise<object>`:
      - escreve no stdin uma linha JSON `{type:'user', message:{role:'user', content:[...images.map(i => ({type:'image', source:{type:'base64', media_type:i.mediaType, data:i.base64}})), {type:'text', text:prompt}]}}` e fecha;
      - lê o stdout linha a linha e usa a última linha com `type === 'result'`;
      - `is_error` lança `String(result)`;
      - converte `result` com a mesma limpeza de cercas de `parseClaudeJson`;
      - os erros (ENOENT, timeout, código diferente de 0, sem linha `result`) têm as mesmas mensagens de `runClaude`, e `Resposta do Claude não é JSON válido` quando não há `result`.

- [ ] **Step 1: Write failing tests**

```js
test('thumbUrl only for valid video ids', () => { assert.equal(thumbUrl('abcdefghijk'), 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg'); assert.equal(thumbUrl('../../etc/x'), null); assert.equal(thumbUrl('abc'), null); });
test('fetchThumbs keeps jpeg under 200 KB, skips html and big files, caches', async () => {
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]);
  const fake = async url => url.includes('good0000001') ? new Response(jpg, { headers: { 'content-type': 'image/jpeg' } })
    : url.includes('html0000001') ? new Response('<html>', { headers: { 'content-type': 'text/html' } })
    : new Response(Buffer.alloc(200001), { headers: { 'content-type': 'image/jpeg' } });
  const got = await fetchThumbs(['good0000001', 'html0000001', 'big00000001', 'bad id'], dir, { fetch: fake });
  assert.deepEqual(got.map(g => g.id), ['good0000001']); assert.equal(got[0].base64, jpg.toString('base64'));
  assert.deepEqual(readdirSync(dir), ['good0000001.jpg']);
  const again = await fetchThumbs(['good0000001'], dir, { fetch: () => { throw new Error('no network'); } }); assert.equal(again.length, 1);
});
test('runClaudeImages sends one stream-json user line with images and parses result line', async () => {
  let stdin = ''; const spawn = fakeSpawn({ onStdin: s => { stdin += s; }, stdout: '{"type":"system"}\n{"type":"result","is_error":false,"result":"```json\\n{\\"ok\\":1}\\n```"}\n' });
  assert.deepEqual(await runClaudeImages('P', [{ mediaType: 'image/jpeg', base64: 'AAA' }], { spawn }), { ok: 1 });
  const msg = JSON.parse(stdin.trim()); assert.equal(msg.message.content[0].type, 'image'); assert.equal(msg.message.content.at(-1).text, 'P');
  assert.deepEqual(spawn.args, CLAUDE_IMAGE_ARGS);
});
test('runClaudeImages errors', async () => {
  await assert.rejects(runClaudeImages('P', [], { spawn: fakeSpawn({ stdout: '{"type":"result","is_error":true,"result":"limite"}\n' }) }), /limite/);
  await assert.rejects(runClaudeImages('P', [], { spawn: fakeSpawn({ stdout: '{"type":"system"}\n' }) }), /não é JSON válido/);
});
```

`fakeSpawn` já existe em `tests/app-llm.test.mjs`. Se ele não registrar `args` nem `onStdin`, estenda o auxiliar nesse mesmo arquivo.

- [ ] **Step 2: Run** `node --test tests/app-thumbs.test.mjs tests/app-llm.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `thumbs.mjs` e as mudanças em `llm.mjs`.
- [ ] **Step 4: Run** `node --test tests/app-thumbs.test.mjs tests/app-llm.test.mjs`. Expected: PASS.
- [ ] **Step 5: Smoke real (uma vez, manual):** rode `runClaudeImages` com uma thumbnail real de `out/app/thumbs/` e o prompt "Descreva a imagem em 5 palavras. Responda só JSON {\"d\": \"...\"}". Expected: objeto com `d`. Não vai para teste automático.
- [ ] **Step 6: Commit** `feat: thumbnail fetch and claude image input`.

### Task 5: Amostra de voz e palavras por minuto

**Files:**
- Create: `scripts/app/voice.mjs`
- Modify: `scripts/kokoro_say.py`
- Test: `tests/app-voice.test.mjs`

**Interfaces:**
- Consumes: `readWav` de `scripts/narration-lib.mjs`; `KOKORO_PY = 'out/tmp/kokoro-venv/Scripts/python.exe'` e `KOKORO_SAY = 'scripts/kokoro_say.py'`, os mesmos valores de `narrate.mjs` (copiados como constantes).
- Produces:
  - `SAMPLE_TEXT = { pt: '<cerca de 60 palavras em pt-BR, sem números>', en: '<cerca de 60 palavras em inglês, sem números>' }`. Texto neutro de documentário, escrito pelo implementador.
  - `sampleVoice({ voice, speed, lang }, outDir, { spawn = nodeSpawn, exists = existsSync, root }): Promise<{ file: string, name: string, seconds: number, words: number, wpm: number }>`:
    - `voice` vem como `kokoro:<id>`;
    - sem `KOKORO_PY` lança `Kokoro não instalado: veja docs/VOICE.md`;
    - `name` = `sha1(voice|speed|texto).wav`;
    - com o arquivo já em cache, não chama `spawn`;
    - senão chama `spawn(KOKORO_PY, ['-X', 'utf8', KOKORO_SAY, <id>, String(speed)])` com stdin `JSON.stringify([{text, out}])`;
    - lê o WAV e calcula `seconds` (2 casas), `words` (`text.split(/\s+/).length`) e `wpm` (inteiro).
- `kokoro_say.py`: `KPipeline(lang_code=voice[0], ...)`. O resto não muda. As vozes `pm_`/`pf_` continuam em `p`.

- [ ] **Step 1: Write failing tests**

```js
test('sampleVoice runs kokoro once, measures wpm, then uses cache', async () => {
  let calls = 0; const spawn = fakeSpawnWriting(job => { calls++; writeFileSync(job[0].out, writeWav({ sampleRate: 24000, samples: new Float32Array(24000 * 20) })); });
  const r = await sampleVoice({ voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, dir, { spawn, exists: () => true });
  assert.equal(r.seconds, 20); assert.equal(r.wpm, Math.round(r.words / (20 / 60))); assert.equal(calls, 1);
  await sampleVoice({ voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, dir, { spawn, exists: () => true }); assert.equal(calls, 1);
});
test('missing kokoro venv', async () => { await assert.rejects(sampleVoice({ voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, dir, { exists: () => false }), /Kokoro não instalado/); });
test('kokoro_say picks lang code from the voice', () => { assert.match(readFileSync('scripts/kokoro_say.py', 'utf8'), /lang_code=voice\[0\]/); });
```

`fakeSpawnWriting(fn)` é um auxiliar do próprio teste: devolve um `EventEmitter` com `stdin.end(s)`, que chama `fn(JSON.parse(s))` e depois emite `close` com código 0. Note que `exists` é a checagem do venv, não do WAV em cache: use `existsSync` direto para o cache.

- [ ] **Step 2: Run** `node --test tests/app-voice.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `voice.mjs` and edit `kokoro_say.py`.**
- [ ] **Step 4: Run** `node --test tests/app-voice.test.mjs tests/narration.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: voice sample and words per minute`.

### Task 6: Rotas

**Files:**
- Modify: `scripts/app-server.mjs`
- Test: `tests/app-server.test.mjs`

**Interfaces:**
- Consumes: Tasks 1 a 5; `job`, `chId`, `channel`, `chRow`; `similarChannels`; `db.videoRows`.
- Produces:
  - `startAppServer` ganha três opções:
    - `modeler = (prompt, images) => runClaudeImages(prompt, images)`;
    - `thumbFetch = globalThis.fetch` (usado só por `fetchThumbs`);
    - `voiceSpawn` (repassado a `sampleVoice`).
  - Diretórios: `out/app/thumbs` e `out/app/samples` (`resolve(ROOT, ...)`; nos testes, dentro do `dataDir` temporário, pela opção `outDir`).

Rotas novas:

| Método e rota | Corpo | Resposta |
| ------------- | ----- | -------- |
| `GET /api/model/prepare?anchor=<id>` | | `{ anchor, groups, similar, models }` |
| `POST /api/model` | `{anchor, extras?: string[]}` | `{jobId}` |
| `GET /api/models/:n` | | modelagem salva com `views` |
| `GET /api/models/:n/profile/:i` | | perfil proposto |
| `GET /api/mychannels` | | lista |
| `POST /api/mychannels` | perfil | perfil criado |
| `GET /api/mychannels/:n` | | perfil |
| `POST /api/mychannels/:n` | perfil | perfil |
| `POST /api/mychannels/:n/delete` | | `{ok: true}` |
| `POST /api/mychannels/:n/competitors` | `{ids}` | `{competitors}` |
| `GET /api/voices` | | `{ voices, wpm }` |
| `POST /api/voices/sample` | `{voice, speed, lang}` | ver abaixo |
| `GET /api/samples/<sha1>.wav` | | o WAV |
| `GET /api/competitors?my=<n>` | | `{rows, videos}` filtrado |

Detalhes das rotas:
- `GET /api/model/prepare`:
  - `anchor` é a linha do canal;
  - `groups` vem de `subtopics(db.videoRows(id, now))`;
  - `similar` traz os 8 primeiros de `similarChannels`;
  - `models` vem de `db.modelsOf(id)`.
- `POST /api/model`:
  - `anchor` com id inválido dá 400; canal inexistente dá 404;
  - âncora sem vídeos dá 400 `Âncora sem vídeos`;
  - `extras` aceita até 4 ids válidos; a mais dá 400.
  - O job `model` (sem cota, sem `log`), com relatórios de progresso:
    1. `Baixando thumbnails`: `fetchThumbs` dos 6 vídeos com mais views;
    2. `Montando prompt`: `modelPrompt` com `prompts/modelagem.md`;
    3. `Gerando com o Claude`: `modeler(prompt, images)`, depois `validateModel`;
    4. `Gravando`: `db.addModel` com `input: {extras, videoIds, semImagens: images.length === 0, prompt}`.
  - Resultado: `{modelId}`. Em erro, o job termina com `error`, e o prompt fica em `GET /api/model/prompt?anchor=<id>&extras=<ids separados por vírgula>`, rota GET que só monta o texto, para copiar.
- `GET /api/models/:n`:
  - `{ ...model, anchor: chRow, views: modelViews(model.output, videoRows), videos: {[id]: {title, views, thumb}} }`;
  - `:n` precisa seguir `^\d{1,9}$`, senão 400; inexistente dá 404.
- `GET /api/models/:n/profile/:i`: `profileFromConcept`, sem gravar. `:i` precisa ser 0, 1 ou 2, senão 400.
- `GET /api/mychannels`: `db.myChannels()`.
- `POST /api/mychannels`: `validateProfile`; nome repetido dá 409 `Já existe um canal com esse nome`; devolve o perfil criado.
- `GET /api/mychannels/:n`: o perfil, com `competitors` como linhas `chRow`.
- `POST /api/mychannels/:n`: atualiza com as mesmas regras do POST de criação.
- `POST /api/mychannels/:n/competitors`:
  - `ids` de até 50 canais válidos que já existam na base; os outros dão 400 `Canal fora da base: <id>`;
  - responde `{competitors: chRow[]}`.
- `GET /api/voices`: `VOICES` e `cfg().voiceWpm`.
- `POST /api/voices/sample`:
  - `voice` precisa estar em `VOICES[lang]` (com o prefixo `kokoro:`), senão 400;
  - roda `sampleVoice` fora da fila de jobs, porque é curto;
  - grava `voiceWpm["<voice>|<speed>"] = wpm` por `saveConfig`;
  - responde `{ url: '/api/samples/<name>', seconds, wpm }`, ou `{error}` com 200 quando falta o Kokoro.
- `GET /api/samples/<sha1>.wav`:
  - o nome segue `^[0-9a-f]{40}\.wav$`, senão 400;
  - lê de `out/app/samples`;
  - responde `audio/wav`, `nosniff`, `no-store`.

  É a única rota de `/api/` que não responde JSON.
- `GET /api/competitors?my=<n>`: com `my`, filtra por `myCompetitorIds`; sem `my`, devolve tudo como na fase 3.

- [ ] **Step 1: Write failing tests** (mesmos auxiliares; `modeler` falso que devolve um modelo válido para os ids recebidos, extraídos do prompt; `thumbFetch` falso; `voiceSpawn` falso como na Task 5):

```js
test('model job: thumbs, claude, validation, saved with app views', async () => {
  const { jobId } = JSON.parse((await post('/api/model', { anchor: CH }, ok)).body);
  const end = (await readSse(`/api/jobs/${jobId}/events`)).at(-1).data; assert.equal(end.status, 'done');
  const m = JSON.parse((await get('/api/models/' + end.result.modelId)).body);
  assert.equal(m.output.conceitos.length, 3); assert.equal(m.views.length, 3); assert.ok(m.views.every(Number.isFinite));
  assert.equal(JSON.parse((await get(`/api/models/${end.result.modelId}/profile/1`)).body).modelId, end.result.modelId);
});
test('model errors are readable and prompt is copyable', async () => {
  const s3 = await startAppServer({ ...opts, modeler: async () => ({ resumo: 'r', conceitos: [] }) }); /* job end: error 'Resposta do Claude fora do formato' */
  assert.equal((await post('/api/model', { anchor: 'UCnope000000000000000000' }, ok)).status, 404);
  assert.equal((await post('/api/model', { anchor: CH, extras: Array(5).fill(CH) }, ok)).status, 400);
  assert.match((await get('/api/model/prompt?anchor=' + CH)).body, /DADOS/);
});
test('my channels CRUD with validation and competitors filter', async () => {
  const p = { name: 'Roma à Noite', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex' };
  const c = JSON.parse((await post('/api/mychannels', p, ok)).body); assert.equal(c.targetMin, 30);
  assert.equal((await post('/api/mychannels', { ...p, name: 'roma à noite' }, ok)).status, 409);
  assert.equal((await post('/api/mychannels', { ...p, style: 'pixel' }, ok)).status, 400);
  assert.equal((await post(`/api/mychannels/${c.id}/competitors`, { ids: [CH] }, ok)).status, 200);
  assert.deepEqual(JSON.parse((await get('/api/competitors?my=' + c.id)).body).rows.map(r => r.id), [CH]);
  assert.equal((await post(`/api/mychannels/${c.id}/competitors`, { ids: ['UCnope000000000000000000'] }, ok)).status, 400);
});
test('voice sample saves wpm and serves wav', async () => {
  const r = JSON.parse((await post('/api/voices/sample', { voice: 'kokoro:pm_alex', speed: 1, lang: 'pt' }, ok)).body);
  assert.ok(r.wpm > 0); assert.equal(JSON.parse((await get('/api/voices')).body).wpm['kokoro:pm_alex|1'], r.wpm);
  const w = await get(r.url); assert.equal(w.status, 200); assert.match(w.headers['content-type'], /audio\/wav/);
  assert.equal((await get('/api/samples/../../data/config.json')).status, 403); assert.equal((await get('/api/samples/abc.wav')).status, 400);
  assert.equal((await post('/api/voices/sample', { voice: 'kokoro:af_heart', speed: 1, lang: 'pt' }, ok)).status, 400);
});
```

O segundo teste precisa esperar o fim do job do `s3` e checar `end.error === 'Resposta do Claude fora do formato'`. Use o `readSse` do `s3`.

- [ ] **Step 2: Run** `node --test tests/app-server.test.mjs`. Expected: FAIL nos testes novos.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS, todos.
- [ ] **Step 5: Commit** `feat: modeling, my channels and voice routes`.

### Task 7: Tela Modelar

**Files:**
- Create: `app/views/model.js`
- Modify: `app/main.js` (rota `#/modelar` e item "Modelar" no menu, depois de "Concorrentes"), `app/views/channel.js` (`soon('Modelar')` vira o link `#/modelar?ancora=<id>`), `app/app.css`

**Interfaces:**
- Consumes: rotas da Task 6; `h`, `fmt`, `api`, `follow`, `avatar`, `subsText`.
- Produces: `render(root, params)`. Parâmetros: `ancora=<id>` e `modelo=<n>`.

Conteúdo da tela:
- **Sem `ancora`:** campo "Escolha o canal âncora", filtrando os canais da base pelo título (`GET /api/channels?preset=tudo&q=`), com os 20 primeiros clicáveis.
- **Com `ancora`:**
  - Cabeçalho do âncora: avatar, título, inscritos, nº de vídeos e "Dados de <data>".
  - "Subtemas que já performaram": um cartão por subtema com o rótulo, os números e 3 thumbnails com as views.
  - "Canais do mesmo nicho (opcional, até 4)": caixas de seleção com os `similar`.
  - O botão "Gerar modelagem (Claude)":
    - mostra "Não gasta cota do YouTube. Pode levar alguns minutos.";
    - acompanha as 4 etapas por SSE;
    - no fim, abre `#/modelar?ancora=<id>&modelo=<n>`.

    Em erro, mostra a mensagem e o prompt num `<textarea readonly>` com "Copiar".
  - "Modelagens anteriores": a lista de `models`, com data e os 3 nomes.
- **Modelagem aberta** (o layout do Minerador do Runner):
  - O `resumo`, com o rótulo "gerado pelo Claude".
  - Aviso "Feito sem imagens" quando `semImagens`.
  - 3 cartões, um por conceito:
    - nome e subtema;
    - 3 thumbnails dos `videoIds` e "<views> views no âncora", em número do app;
    - moldes de título em lista;
    - estilo de thumbnail;
    - prompts de imagem, cada um com "Copiar";
    - estilo visual;
    - plano de 30 dias em tabela (dia, tema);
    - o botão "Criar meu canal com este conceito", que abre `#/meus?novo=<n>:<i>`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** `grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|on[a-z]+=\"" app/` (sem resultado) e `npm test` (PASS).
- [ ] **Step 3: Verify in browser:**
  - Script em `out/tmp/` sobe o servidor com `dataDir` temporário, o `fetch` falso e um `modeler` falso.
  - Num conceito, coloque `estiloThumbnail` = `<img src=x onerror=alert(1)>`.
  - Abra no Chrome headless (puppeteer-core já instalado, como em `scripts/render-lib.mjs`).

  Expected:
  - o texto aparece como texto;
  - nenhum `dialog`;
  - nenhum erro de CSP;
  - nenhum `NaN`/`undefined`;
  - sem rolagem horizontal em 390 px.
- [ ] **Step 4: Commit** `feat: modeling view`.

### Task 8: Tela Meus canais

**Files:**
- Create: `app/views/mychannels.js`
- Modify: `app/main.js` (rota `#/meus` e item "Meus canais" no menu, antes de "Configurações"), `app/app.css`

**Interfaces:**
- Consumes: rotas da Task 6.
- Produces: `render(root, params)`. Parâmetros: `id=<n>`, ou `novo=<modelo>:<conceito>`, ou `novo=1` (em branco).

Conteúdo da tela:
- **Lista:** cartões com nome, etiqueta, idioma, estilo, voz, "30 ± 3 min", nº de concorrentes e o âncora (link para o painel). Botão "Novo canal". Vazio: "Nenhum canal ainda. Crie um do zero ou a partir de uma modelagem."
- **Formulário:**
  - nome;
  - etiqueta;
  - idioma (pt/en), que troca a lista de vozes;
  - estilo (`flat`/`watercolor`);
  - voz e velocidade (0,8 a 1,3, passo 0,05);
  - duração alvo e tolerância;
  - moldes de título (lista editável, até 10);
  - modelo de descrição, com a dica "Use {fontes} e {capitulos}";
  - âncora (somente leitura, com link);
  - "Origem: modelagem #n, conceito i+1" quando houver.
  - Com `novo=<m>:<i>`, o formulário vem preenchido por `GET /api/models/:m/profile/:i`.
  - Salvar chama `POST`. Em erro, a mensagem aparece junto ao formulário. "Apagar" pede confirmação.
- **"Ouvir amostra":**
  - chama `POST /api/voices/sample`;
  - toca o WAV num `<audio controls>` com `src` igual à `url` devolvida;
  - mostra "≈ X palavras por minuto nesta voz e velocidade";
  - com `{error}`, mostra a mensagem.
- **Concorrentes deste canal:**
  - lista com "Remover";
  - campo de busca nos canais da base (como em Modelar), com "Adicionar";
  - o botão "Usar os concorrentes marcados", que adiciona os da tela Concorrentes;
  - salva com `POST .../competitors`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** o grep da Task 7 sem resultado; `npm test` PASS.
- [ ] **Step 3: Verify in browser:**
  - Com o servidor de teste: criar, editar, trocar o idioma (a voz muda junto), salvar com estilo inválido forjado no `select`, ligar concorrentes e apagar.
  - Expected: as mensagens de campo aparecem; nada de `NaN`; nenhum `dialog`.
  - Com o `voiceSpawn` falso, o `<audio>` recebe o `src`.
- [ ] **Step 4: Commit** `feat: my channels view`.

### Task 9: Concorrentes por canal meu

**Files:**
- Modify: `app/views/competitors.js`, `app/app.css`

**Interfaces:**
- Consumes: `GET /api/mychannels`, `GET /api/competitors?my=`.
- Produces: o seletor "Mostrar: Todos | <cada um dos Meus canais>" no topo da tela Concorrentes, guardado na URL (`#/concorrentes?my=<n>`).
  - Troque o rodapé "Na fase 4…" por "Ligue concorrentes a um canal em Meus canais."
  - De brinde, corrija o problema achado no aceite da fase 3: a classe `best` não é aplicada quando todos os valores da linha são iguais.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** o grep da Task 7 sem resultado; `npm test` PASS. No navegador, com 2 canais meus e concorrentes diferentes, o seletor filtra; uma linha empatada não fica destacada.
- [ ] **Step 3: Commit** `feat: competitors per my channel`.

### Task 10: Aceite com dados reais

**Files:** `docs/VALIDATION.md` (uma entrada curta).

- [ ] **Step 1:**
  - Se `out/tmp/kokoro-venv` não existir, instale conforme `docs/VOICE.md`:
    - `python -m venv out/tmp/kokoro-venv`;
    - `out/tmp/kokoro-venv/Scripts/python.exe -m pip install kokoro soundfile`;
    - para as vozes em inglês, `misaki[en]` se o Kokoro pedir.

    Tudo isso fica fora do git.
  - `npm run app` com a `data/` real.
- [ ] **Step 2:** Modelar um âncora real da base com mais de 20 vídeos e 2 canais do mesmo nicho. Expected:
  - o job chega a `done`;
  - 3 conceitos;
  - os moldes têm lacunas;
  - as views batem com a soma dos vídeos no painel do âncora;
  - nenhum molde é cópia de título;
  - `semImagens` é `false`;
  - o medidor de cota não muda.
- [ ] **Step 3:**
  - Criar um dos Meus canais a partir de um conceito.
  - "Ouvir amostra" em `pm_alex` 1,0 e em `af_heart` 1,0. Expected: o áudio toca e o wpm é gravado (pt na faixa de 130 a 170).
  - Ligar 3 concorrentes. Expected: o seletor da tela Concorrentes filtra.
- [ ] **Step 4:**
  - `git status --porcelain data/ out/`. Expected: vazio.
  - `git grep -n "AIzaSy" -- . ':!docs/arquivos'`. Expected: sem resultado.
  - `npm test`. Expected: PASS.
  - Registrar em `docs/VALIDATION.md`: data, âncora, tempo do job, `semImagens`, wpm medidos e o que foi conferido.
  - Commit `docs: webapp phase 4 acceptance`.
