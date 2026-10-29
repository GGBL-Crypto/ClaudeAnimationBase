# Webapp de canais dark: design

Data: 27/10/2026. Status: aguardando aprovação.

## Intenção

Um app local, de um usuário só, que leva do nicho ao MP4 pronto para publicar, sem serviço pago. Ele junta duas coisas:

1. A pesquisa do Runner (Dark Educação, do Rhaj): minerar canais e vídeos faceless, achar outliers, nichos e concorrentes, monitorar, modelar a partir de um canal âncora.
2. A fábrica de vídeos deste repositório: roteiro com fontes, narração Kokoro, cenas nos estilos de `src/styles/`, mixagem a −14 LUFS e verificação.

O usuário escolhe um dos seus canais, o tema e a duração. O app puxa o perfil do canal (nicho, idioma, estilo, voz) e os dados minerados dos concorrentes, e gera o vídeo completo.

Referências lidas: `docs/RELATORIO_WEBAPP_CANAIS_DARK_2026-10-27.md` (método do Rhaj, crítica ao clone do Gemini, o que não construir), darkeducacao.com e o print do Runner no carrossel `DexGbj-oHEW` slide 3.

## Objetivos

- Todas as telas do print do Runner: Visão geral, Minerar canais, Minerar vídeos, Outliers, Nichos, Concorrentes, Coleções, Monitoramento, Favoritos, Histórico. Painel lateral do canal com as abas Visão geral, Vídeos, Análise e Concorrentes.
- Os recortes do Minerador real: "Pra você espelhar", "Canais novos", "Muita view, pouco inscrito", "Fábrica de vídeo", "Catálogo enxuto", "Postou esta semana", "Por categoria", "Tudo".
- Modelar: do canal âncora para 3 conceitos derivados, com estrutura de título, estilo de thumbnail, prompts de imagem e plano dos primeiros 30 dias.
- Meus canais: um perfil por canal do usuário.
- Gerar vídeo: canal, tema, duração alvo ± tolerância e estilo. Uma fila de jobs com progresso ao vivo e o MP4 verificado no fim.
- Embalagem: título, descrição com fontes, capítulos, SRT e thumbnail.
- Custo zero: API oficial do YouTube na cota gratuita, ferramentas locais, LLM pela assinatura existente (`claude -p`).

## Não objetivos

- Upload automático para o YouTube. O usuário publica à mão.
- Multiusuário, login, hospedagem na internet.
- Base curada de 500 canais como a do Runner. A base nasce das buscas e importações do próprio usuário.
- Clonagem de voz e vozes pagas.
- Edição manual quadro a quadro (o app gera, o usuário aprova ou regenera partes).

## Anti-objetivos (falha mesmo que funcione)

- Números inventados. Tudo que vem do YouTube mostra a data da coleta. Tudo que é estimado (receita, views/mês antes de haver histórico) leva o rótulo "estimativa" e a fórmula.
- Fato de roteiro sem fonte registrada.
- Copiar títulos, roteiros ou thumbnails de concorrentes. Modelar é extrair padrão, não reproduzir.
- Vídeo de referência baixado e republicado. yt-dlp só para análise privada.
- Seed falso (como o `INITIAL_CHANNELS` do clone do Gemini) ou análise "hardcoded".
- Chave de API no navegador (`localStorage`) ou no git.
- HTML montado com `innerHTML` a partir de dados do YouTube (XSS do clone do Gemini).
- Dado pessoal do usuário (e-mail, nome) enviado a qualquer serviço.

## Restrições

- Windows 10, Ryzen 5 3600, 16 GB, GPU antiga. Node 24, Python, FFmpeg, Chrome, yt-dlp e `claude` no PATH. `faster-whisper` não instalado.
- Sem dependências npm novas. Node 24 traz `node:sqlite` (SQLite 3.51), `node:http`, `fetch` e `node:test`.
- Regras do `CLAUDE.md`: render determinístico em `t`, licenças (PDoomVideo e Eidoverse só como referência), fontes registradas, commits pequenos com TDD para a lógica pura.
- Cota da YouTube Data API v3: 10 000 unidades por dia. `search.list` custa 100. `channels.list`, `videos.list`, `playlistItems.list` e `commentThreads.list` custam 1 por chamada (até 50 IDs).
- O YouTube não dá histórico. Views em 30 dias e crescimento de inscritos só existem a partir das capturas que o próprio app guarda.

## Decisões já tomadas com o usuário

- Escopo: todas as telas do print do Runner, mais Modelar, Meus canais, Gerar vídeo e Embalagem (confirmado em 27/10).
- App local em Node no repositório, servidor em 127.0.0.1, dados da API oficial do YouTube com cache, yt-dlp só para referências, texto pelo `claude -p` (proposto e aceito: "Está correto pode prosseguir").
- O tipo de vídeo ficou a cargo do Claude (ver "Chamadas do Claude").
- O usuário já tem uma chave da YouTube Data API. A fase 1 é aceita com dados reais. A chave vai para `data/config.json` (com `data/` no `.gitignore` antes de qualquer gravação) e nunca aparece em código, teste, log ou commit. Testes automáticos usam respostas gravadas, sem rede.

## Chamadas do Claude (o usuário pode trocar)

1. **Formato padrão do vídeo:** narrativa longa e calma (história, ciência, "para dormir"), de 10 a 120 min, voz Kokoro, cenas 2D lentas com câmera suave e letreiros dos capítulos. É o formato que o método do Rhaj aponta como menor custo de produção e mais retenção, e o que o motor atual faz bem. Outros formatos (lista curta, Shorts 9:16) ficam para depois, mas o perfil do canal já guarda formato e proporção.
2. **Vídeo longo por loops:** renderizar 2 h quadro a quadro a 30 fps (216 000 quadros) não cabe nesta máquina. Cada plano vira um clipe curto em loop perfeito (por exemplo 8 a 20 s, com `seek(t)` periódico) e o FFmpeg estende e concatena (`-stream_loop`, concat demuxer) até a duração da narração. Transições entre planos por crossfade no FFmpeg.
3. **Armazenamento:** `node:sqlite` em `data/app.db` (fora do git). Arquivos grandes (thumbnails baixadas, roteiros, áudio, MP4) em `out/app/`.
4. **Frontend:** HTML, CSS e módulos ES puros, sem framework e sem build. Roteador por hash. DOM criado com `textContent`/`createElement`.
5. **Servidor novo** `scripts/app-server.mjs`, separado do `studio-server.mjs` (que é só GET). Ele reaproveita as regras de segurança do estúdio: 127.0.0.1, checagem do cabeçalho `Host`, rotas explícitas, `nosniff`. Em POST também exige o cabeçalho `Origin` igual ao próprio servidor e um token de sessão gerado na partida.
6. **Configuração:** chave da API e preferências em `data/config.json` (fora do git), editável na tela Configurações; a chave nunca volta ao navegador inteira (só os 4 últimos caracteres).
7. **Jobs:** um processo filho por etapa (narrate, render, mix, verify, yt-dlp, `claude -p`), fila com 1 job pesado por vez, progresso por SSE (`text/event-stream`), log por job em disco, cancelar mata o processo.
8. **LLM:** `claude -p` com o prompt e a saída em JSON (`--output-format json`); o app valida o JSON contra um formato esperado e mostra erro se falhar. Os prompts ficam em arquivos `prompts/*.md` versionados. Sem `claude` disponível, a tela mostra o prompt pronto para copiar.
9. **Pesquisa de fontes:** Wikipedia REST API (sem e-mail) e links colados pelo usuário. Cada fato do roteiro guarda URL, título e data de acesso.
10. **Estilos do motor de episódio (fase 5):** as cenas de episódio são tipos de mundo novos no quadro F (`src/styles/AGENTS.md`). A fase 5 entrega o catálogo em 2 estilos 2D primeiro (`flat` e `watercolor`), com uma marca de capacidade por estilo (`episodeScenes: [...]`). O perfil do canal só oferece estilos com essa marca. Os outros estilos entram depois, um por vez.
11. **Barra visual do vídeo longo:** loop de 10 a 20 s por plano. Cada plano dura um bloco de narração (30 a 120 s) com câmera lenta contínua. No mínimo 12 planos distintos por hora (cena ou parâmetros diferentes: hora do dia, clima, enquadramento), sem repetir o mesmo plano em sequência. Crossfade de 1,5 s entre planos. Um plano reprovado na folha de contato é trocado sem refazer os outros.
12. **yt-dlp:** só legendas automáticas (`--write-auto-subs --skip-download`) e thumbnails dos vídeos outliers e do âncora, para alimentar Análise e Modelar. Não baixa vídeo na v1. Sem `faster-whisper`, vídeo sem legenda fica sem transcrição.
13. **Nicho/categoria:** etiqueta manual do usuário por canal (lista livre, com autocompletar das já usadas). O app sugere a etiqueta a partir de `topicDetails` e das palavras de título, mas só grava com confirmação. A faixa de RPM é por etiqueta e idioma.
14. **Idiomas:** interface em pt-BR. Canais analisados em qualquer idioma; palavras vazias para pt, en e es (as outras passam sem filtro). Vídeo gerado só nos idiomas das vozes Kokoro instaladas (pt-BR e en no início); o perfil bloqueia outros idiomas. Piper fica fora (licença das vozes, `docs/VOICE.md`).
15. **Branch e conflitos:** branch `feat/webapp` a partir do estado atual. Fases 1 a 4 só criam arquivos novos (`app/`, `scripts/app/`, `prompts/`, `data/` fora do git) e não tocam `src/`, então podem correr em paralelo com `feat/style-base`. A fase 5 mexe em `src/` e começa depois do merge da base de estilos.

## Como funciona, por tela

### Dados e métricas (base de tudo)

- Tabelas: `channels` (id, título, handle, país, idioma, criado em, avatar, tópicos), `channel_snapshots` (canal, data, inscritos, views totais, nº de vídeos), `videos` (id, canal, título, publicado em, duração, thumbnail, tags), `video_snapshots` (vídeo, data, views, likes, comentários), `collections`, `collection_items`, `favorites`, `history`, `alerts`, `my_channels`, `models`, `jobs`, `quota_log`, `cache` (resposta bruta por URL com expiração).
- Métricas por canal, todas com função pura testada:
  - média de views por vídeo (dos últimos N vídeos, N = 30 por padrão);
  - views em 30 dias: soma das views dos vídeos publicados nos últimos 30 dias; quando houver duas capturas com 30 dias de distância, passa a ser a diferença de views totais. A tela diz qual dos dois está mostrando;
  - frequência: vídeos por semana nos últimos 90 dias;
  - idade do canal em dias;
  - disparidade: média de views por vídeo dividida por inscritos;
  - score de oportunidade de 0 a 100, soma ponderada e explicada de disparidade, canal novo, catálogo pequeno e atividade recente. Pesos em `data/config.json`, com a decomposição visível no painel;
  - receita estimada: views em 30 dias × faixa de RPM que o usuário define por nicho e idioma (padrão vazio: sem RPM, sem receita). Sempre rotulada "estimativa".
- Outlier de vídeo: views divididas pela mediana dos últimos 30 vídeos do mesmo canal; mostra "+X% acima da média" e views por dia desde a publicação.
- Medidor de cota no topo: unidades gastas hoje (registradas em `quota_log`) e o custo previsto de cada ação antes de rodar.

### Visão geral

KPIs: canais na base, outliers detectados (últimos 7 dias), canais novos (< 90 dias), oportunidades (score ≥ limiar). Lista do que mudou desde a última visita (alertas do monitoramento) e atalhos para os recortes.

### Minerar canais

- Busca por palavra-chave (`search.list type=channel` e também `type=video`, juntando os canais dos vídeos achados, que pega canais novos melhor) e importação por colagem de URLs, handles ou IDs.
- Filtros locais (sem custo de cota): idioma, país, inscritos, views em 30 dias, criado em, frequência, nº de vídeos, categoria/nicho, com ou sem rosto (marcação manual do usuário), só favoritos, incluir indefinidos.
- Recortes como presets de filtro e ordem:
  - Pra você espelhar: score alto, catálogo enxuto, ativo;
  - Canais novos: menos de 90 dias;
  - Muita view, pouco inscrito: disparidade alta;
  - Fábrica de vídeo: frequência alta;
  - Catálogo enxuto: menos de 30 vídeos;
  - Postou esta semana;
  - Por categoria;
  - Tudo.
- Visão tabela (#, canal com bandeira, nicho, inscritos, views 30d, média por vídeo, frequência, score, Analisar) e visão cartões (avatar, selo NOVA, 3 thumbnails com views, média por vídeo, US$/mês estimado, inscritos, views/mês, vídeos, último vídeo, atualizado há X). Ordenação por qualquer coluna.

### Minerar vídeos

Busca de vídeos por palavra-chave, com filtros de data, duração, idioma e views. Ordena por views por dia ou por múltiplo de outlier. Cada vídeo leva ao canal.

### Outliers

Lista de vídeos com múltiplo acima do limiar, dos canais da base. Filtros: nicho, idade do vídeo, múltiplo mínimo. Ação: adicionar à coleção, abrir no Modelar.

### Painel do canal (lateral)

- Visão geral: inscritos, views 30d, média por vídeo, vídeos recentes, idade, frequência, score com decomposição, receita estimada.
- Vídeos: todos os vídeos guardados, com views, views por dia, múltiplo e nota de 0 a 100.
- Análise: padrão de títulos (comprimento, palavras recorrentes, números, perguntas), duração típica, dia e hora de publicação, gráfico de crescimento a partir das capturas (texto "histórico começa em <data>" quando curto) e, sob demanda, um resumo pelo LLM.
- Concorrentes: canais da base com mais sobreposição de palavras de título e tópicos.
- Ações: visitar canal, favoritar, adicionar à coleção, monitorar, modelar.

### Nichos

Agrupa canais da base por tópicos do YouTube e por palavras de título em comum (sem LLM). Para cada nicho mostra o número de canais, a média de score, os outliers e os "nichos vizinhos" (dobras): grupos que dividem palavras com este. Um botão pede ao LLM sugestões de subnichos a partir dos títulos outliers.

### Concorrentes

Os canais que o usuário marcou como concorrentes de cada um dos Meus canais. Comparativo lado a lado e os vídeos novos deles.

### Coleções e Favoritos

Listas nomeadas de canais e vídeos, com nota livre. Favoritos é uma coleção fixa.

### Monitoramento

O usuário marca canais para seguir. Um botão "Atualizar agora" e, com o app aberto, uma atualização diária automática: `playlistItems.list` da playlist de uploads e `videos.list`/`channels.list`. Custa cerca de 2 a 3 unidades por canal. Gera capturas e alertas (vídeo novo, vídeo que passou do limiar de outlier, salto de inscritos). O sino no topo mostra os alertas.

### Histórico

Buscas feitas (termo, filtros, data, unidades gastas), canais abertos e jobs. Refazer uma busca usa o cache enquanto ele valer (padrão 24 h).

### Modelar

- Entrada: canal âncora (e opcionalmente outros canais do mesmo nicho).
- O app junta os títulos, views, durações e thumbnails dos vídeos do âncora e agrupa em subtemas que já performaram.
- O LLM (`prompts/modelagem.md`) devolve 3 conceitos de canal derivado, cada um com:
  - subtema e o que o âncora já provou (views no âncora, com os vídeos de base listados);
  - estrutura de título (molde com lacunas, não títulos copiados);
  - estilo de thumbnail;
  - prompts de imagem;
  - estilo visual do repo sugerido;
  - plano dos primeiros 30 dias (temas e cadência).
- Cada conceito pode virar um dos Meus canais com um clique.

### Meus canais

Perfil por canal: nome, nicho, idioma, formato (longo 16:9 por padrão), estilo de `src/styles/`, voz Kokoro, ritmo da fala, duração alvo e tolerância, música (opcional, com licença registrada), canal âncora, concorrentes, modelos de título e de descrição. Também guarda a lista de vídeos gerados.

### Gerar vídeo

Assistente em etapas. Cada etapa grava o seu resultado e pode ser refeita sozinha.

1. **Canal e pauta:** escolhe um dos Meus canais. O app carrega o perfil e sugere temas a partir dos outliers dos concorrentes e do plano de 30 dias. O usuário escolhe ou escreve o tema, define duração alvo ± tolerância e pode trocar o estilo.
2. **Fontes:** busca na Wikipedia e aceita links colados. O usuário marca as fontes que valem.
3. **Roteiro:** o LLM escreve por capítulos em blocos. A meta de palavras é minutos × palavras por minuto da voz, medida no Kokoro. Cada frase com fato aponta para uma fonte. O app confere a contagem e regenera blocos curtos ou longos até caber na tolerância. Sai `episode.json` (formato que `narrate.mjs` já lê: capítulos, planos, narração) e `roteiro.md`.
4. **Narração:** `scripts/narrate.mjs` (cache por frase) gera `narration.wav` e `timing.json`. A duração real é mostrada contra a alvo.
5. **Cenas:** cada plano recebe uma cena de um catálogo pequeno de cenas paramétricas (paisagem, céu noturno, mar, floresta, deserto, cidade antiga, interior com vela, mapa), montadas com `src/nature/` e desenhadas pelo estilo do canal, mais o letreiro do capítulo. O LLM escolhe a cena e os parâmetros de cada plano a partir do texto, dentro dessa lista fechada. O usuário vê uma folha de contato e pode trocar a cena de um plano.
6. **Render:** um clipe em loop por plano (ver chamada 2), com `render.mjs`, e a montagem no FFmpeg até a duração da narração.
7. **Mixagem:** `scripts/mix-audio.mjs` (−14 LUFS, cama de ruído e música opcional).
8. **Verificação:** `scripts/verify-video.mjs` e a folha `decoded-sheet.png`. O job só vira "pronto" com arquivo, duração, fps, quadros e áudio conferidos.
9. **Embalagem:** título no molde do canal (3 opções do LLM), descrição com as fontes e capítulos com tempos do `timing.json`, SRT, tags e thumbnail (still de uma cena com texto, por `render.mjs --stills`). Exporta uma pasta pronta para upload manual.

Os geradores das etapas 5 e 6 (a cena paramétrica de episódio e o render por loops) são código novo no motor: hoje o repositório só tem as cenas de fumaça (`fixtures/smoke/`).

## Atualização de 29/10/2026 (posts novos do Rhaj e story em pixel art)

Pedido do usuário: incluir o estilo pixel e "tudo que for melhorar". Isso substitui o que conflitar acima.

- **Pixel art entra como terceiro estilo de vídeo** (`flat`, `watercolor` e `pixel`). A referência é o story de 28/10 (`docs/arquivos/video_2026-10-28_22-17-07.mp4`). Ela mostra:
  - cenário em 320×180 com céu em degradê pontilhado, estrelas, lua com faixas, montanhas, pinheiros e casas com janelas acesas;
  - bonecos sprite com ciclo curto;
  - uma caixa de dados no canto (ano, idade), o nome do lugar e uma etiqueta presa ao personagem;
  - legenda em fonte pixel com a palavra falada destacada;
  - uma ficha de 4 bonecos com 4 poses.

  O objetivo é igualar e superar o exemplo. Tudo continua função do tempo, com personagens iguais entre vídeos, luz e clima animados e custo zero. Não use personagens nem universos de terceiros (o exemplo é Halo, da Microsoft).
- **Cenas por kit, não por estilo** (substitui a chamada 10):
  - Cada cena do catálogo é dado puro: uma composição de primitivas (céu, astros, nuvens, cordilheiras, árvores, construções, chão, água, interior, adereços, mapa, clima, luzes).
  - Cada estilo desenha as primitivas uma vez, à sua maneira.
  - A marca de capacidade `episodeScenes` passa a ser exposta pelo servidor e substitui a lista fixa `EPISODE_STYLES`.
- **Acervo de loops:** cada loop renderizado fica guardado pelo hash de estilo, cena, parâmetros, duração, fps e revisão do código. Um vídeo novo reusa o que já existe (o "acervos 65 de 160" do reel do Rhaj).
- **Texto por cima, fora do loop:** legenda com destaque palavra a palavra, título de capítulo, caixa de dados, nome do lugar e etiqueta de personagem saem num arquivo ASS queimado pelo FFmpeg (libass) na montagem. Assim o loop fica reutilizável. Fontes OFL em `assets/fonts/`: uma pixel para o `pixel` e uma legível para os outros.
- **Transição entre planos** (substitui o crossfade da chamada 11): escurecer e clarear (0,75 s de cada lado). Cada segmento é codificado uma vez e a montagem final usa o concat. Um crossfade de 100 entradas não cabe nesta máquina em 2 h de vídeo.
- **Fase 6 ganha:**
  - a etapa **Revisão**, em que você assiste e aprova antes de exportar;
  - o tempo de cada etapa na tela;
  - a análise do roteiro de um vídeo outlier (legenda automática pelo yt-dlp, depois o Claude extrai gancho, estrutura, ritmo e técnicas como padrão, sem copiar);
  - na Embalagem, 5 conceitos de thumbnail e 15 títulos com o porquê.
- **Depois da fase 6:** métricas do seu canal por importação do CSV do YouTube Studio, com análise local pelo Claude. Sem OAuth.

## Fases de entrega

Cada fase tem o seu plano e termina com algo que se usa de verdade.

1. **Base e Minerar canais:** servidor, banco, configuração, cliente do YouTube com cache e medidor de cota, jobs com SSE, casca da interface, Minerar canais com filtros e recortes e o painel do canal (Visão geral e Vídeos).
2. **Resto da pesquisa:** Minerar vídeos, Outliers, painel (Análise e Concorrentes), Coleções, Favoritos, Histórico, Visão geral.
3. **Monitoramento, Concorrentes e Nichos.**
4. **Modelar e Meus canais.**
5. **Motor de episódio:** kit de cenas em `flat`, `watercolor` e `pixel`, ficha de personagens, render por loops com acervo, texto em ASS, montagem e verificação, tudo testado pela CLI fora do app.
6. **Gerar vídeo e Embalagem** no app, ligando as etapas.

## Deixado ao construtor

- Nomes de arquivos, de rotas da API interna e de colunas, desde que sigam o estilo do repositório.
- Layout visual dentro do que o print do Runner mostra (tema escuro, menu lateral, tabela e cartões, painel à direita).
- Pesos iniciais do score e limiares de outlier, desde que fiquem em configuração e visíveis.
- O conjunto exato das cenas paramétricas da fase 5, começando pelas que o motor `src/nature/` já cobre.
- Como dividir o roteiro em blocos para caber no limite do `claude -p`.
