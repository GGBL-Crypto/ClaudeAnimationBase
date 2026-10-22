# Relatório de análise — referência, estado do projeto e próximos passos

Data: 22/10/2026. Autor: Claude Code (Opus 5.5), a pedido do usuário.

Objetivo do usuário: gerar vídeos completos para um canal dark do YouTube, de forma automática e sem custo, com os três motores 2D (aquarela, cartoon, pixel). O 3D fica para depois.

---

## 1. Resumo executivo

1. **O vídeo de referência (`Ns1N1L_qIw0`) não é o render do PDoomVideo.** É uma reinterpretação de outro autor, com outra personagem e outro estilo. O render original do PDoomVideo está em `https://youtu.be/8j-hR4fJywU`. As duas obras são úteis, mas por razões diferentes (seção 2).
2. **A sensação de "movimento perfeito" no vídeo de referência vem principalmente da montagem e não de animação corporal.** Há cortes no tempo da música, câmera que empurra e afasta, poses fortes mantidas por vários quadros, tipografia cinética e uma paleta curta e consistente. Personagem com esqueleto completo quase não aparece. Essa técnica é barata e serve para o seu hardware.
3. **O projeto atual tem muita infraestrutura e pouco filme.** São cerca de 419 KB de documentação, 48 scripts e 15 projetos registrados. O vídeo mais longo tem 11 s. Todo o código de cenas soma cerca de 930 linhas. Para comparar, o PDoomVideo tem cerca de 7.500 linhas de cenas para 156 s de vídeo. É isso que dá a sensação de que o Codex está "enrolando".
4. **Só a aquarela é um motor completo hoje.** Cartoon e pixel não têm API de desenho geral. Eles têm apenas o objeto `VisitArt`, que desenha só a história "Uma visita" (fundo, Clawd, borboleta e íris). Para fazer qualquer outro vídeo nesses estilos, é preciso escrever a arte do zero. Esse é o bloqueio número 1 para o seu objetivo.
5. **Do Eidoverse, vale copiar ideias, não código.** As partes úteis são o pipeline de áudio (narração, alinhamento de letra/fala com Whisper, envelope de boca) e o método de revisão. O renderizador WebGPU, VRM, física Rapier e geração de música por ComfyUI não servem para o seu hardware nem para o seu objetivo atual. A licença é AGPLv3.
6. **Do PDoomVideo, vale copiar o método, não o código.** O repositório não tem arquivo LICENSE (verificado no clone de 22/10/2026), portanto o código não tem permissão de reuso. Grande parte do método já está no ClaudeAnimationBase (MIT, mesmo autor): `move`, `dancer`, `kf`, `pulse`, `jump`, `take`, `stroll`, `onTwos`, câmera e emoções.
7. **Próximo passo recomendado:** pausar a frente da menina articulada, dos assets e do 3D. Dar a cartoon e pixel um kit de desenho geral, depois criar uma timeline guiada por áudio e produzir o primeiro vídeo completo de 60–90 s. Detalhes nas seções 6 e 7.

---

## 2. Análise do vídeo de referência

### 2.1 O que foi verificado

Metadados obtidos com `yt-dlp --write-info-json`:

| Campo | Valor |
|---|---|
| Título | Claude AI Made This Music Video \| UPPING MY P(DOOM) |
| Canal | INXANITY |
| Duração | 142 s |
| Publicação | 24/09/2026 |
| Visualizações / curtidas | 46.614 / 666 (no momento da consulta) |
| Créditos na descrição | Vídeo: `x.com/ishuagra02/status/2102788371114246177`; letra: `youtu.be/uEB5E67vcPA` |
| Formato | 1280×720 (versão baixada), 30 fps, AV1 |

O download completo falhou (HTTP 403). O trecho parcial permitiu decodificar aproximadamente os primeiros 45 s. Foram inspecionados:

- uma folha com um quadro a cada 2 s (0–45 s);
- duas tiras densas, com todos os quadros de 18–20 s e 30–32 s.

Limite desta análise: o trecho entre 45 s e 142 s não foi visto. As conclusões abaixo valem para a primeira terça parte do vídeo.

### 2.2 Não é o PDoomVideo

O PDoomVideo usa Clawd (o mascote laranja quadrado), um Pesquisador humano, um palco com cortinas e aquarela de p5.brush. O vídeo `Ns1N1L_qIw0` mostra outra coisa:

- uma personagem feminina estilo anime, com cabelo laranja em forma de flor (Claude personificado) e headset;
- estética de risografia/serigrafia: creme, laranja, rosa-choque, azul-marinho e amarelo, com textura de papel;
- gráficos de "loss" e de "time horizon", datas no canto superior direito e legendas em caixa de papel.

A descrição credita o vídeo a outra conta do X. A afirmação de que foi feito com o PDoomVideo não se confirma pelo que aparece na tela. No máximo, a letra e a ideia são as mesmas. A arte da personagem tem nível de ilustração difícil de gerar só com código p5. É provável que existam ilustrações-chave feitas por fora (desenho ou geração de imagem) e montadas por código. Isso é uma inferência visual, não um fato confirmado.

### 2.3 Por que o movimento parece perfeito

Observado nas tiras quadro a quadro:

1. **Animação limitada, pose a pose.** A mesma ilustração fica na tela por vários quadros. A mudança de expressão é a troca de um desenho inteiro (boca, olhos), não uma deformação contínua.
2. **Câmera faz o trabalho pesado.** A personagem ganha vida com aproximação, afastamento e reenquadramento (por exemplo, 30–32 s: plano aberto, salto para close, close mais fechado, volta para plano aberto). Cada mudança cai em uma batida.
3. **Cortes na batida.** Cada linha da letra tem um plano novo. Os planos duram cerca de 1,5–4 s, como no PDoomVideo.
4. **Tipografia cinética.** Palavras entram uma por uma no ritmo ("PLEASE / DON'T / EAT / ME"; "I'M"), ocupam metade do quadro e fazem parte da composição.
5. **Morph de forma simples.** O smiley vira um sorriso com dentes por interpolação da boca. Depois a câmera entra na boca e ela vira uma transição para o próximo plano (18–20 s).
6. **Paleta fixa e textura constante.** Cinco cores e papel em todos os planos. Isso dá unidade, mesmo com cortes rápidos.
7. **Motivos recorrentes.** Medidor de P(doom), gráficos, datas, legenda em caixa e personagem em grupo com variações de cor.

### 2.4 O que isso significa para você

- Para conseguir esse efeito, você **não precisa** de personagem com esqueleto e juntas perfeitas. Precisa de poses-chave fortes, câmera com intenção, cortes na batida, texto animado e uma paleta disciplinada.
- Seu hardware aguenta isso com folga nos estilos cartoon e pixel (medição na seção 4.3).
- A frente atual da "menina articulada" tenta resolver o problema mais difícil (articulação de ilustrações) antes do problema que mais rende (montagem guiada por áudio).

---

## 3. O PDoomVideo: o que vale aprender

Repositório clonado em 22/10/2026 (`--depth 1`). Estrutura principal:

| Parte | Função |
|---|---|
| `src/ch/c01…c09` | Nove capítulos, um arquivo cada, cerca de 500–900 linhas por arquivo |
| `src/core.js` | Pintura (`paint`, `inkLine`), câmera, letras, efeitos de tela cheia |
| `src/clawd.js`, `src/cast.js`, `src/props.js` | Personagens com parâmetros de pose e rosto, elenco e cenário recorrente |
| `src/timeline.js` | Registro de capítulos e planos, cortina de pincel nas viradas, karaokê, medidor |
| `src/lyrics.js` | Letra com `[início, fim, texto]` |
| `ANIMATION_GUIDE.md` | Briefing que o Opus escreveu para subagentes paralelos |
| `STORYBOARD.md` | Plano por plano: tempo, linha da letra, ação e transição de saída |

### 3.1 Técnicas que explicam a qualidade

- **Uma regra por plano: algo acontece.** Toda linha da letra tem uma ação visual: algo quebra, cai, persegue ou se transforma.
- **Ritmo como eixo do tempo.** O BPM (88) e o deslocamento da primeira batida estão no código. `pulse(t)` dá 1 em cada batida. Os acertos de ação caem em `0,21 + n × 0,682 s`.
- **Transições motivadas.** Dentro de um capítulo, a ação leva ao próximo plano (boca que fecha sobre a câmera, foguete, queda, zoom pelo olho). Entre capítulos, uma cortina de pinceladas.
- **Emoções nunca trocam de uma vez.** `mood()` fecha os olhos, faz um squash-stretch e mostra um emote antes do novo rosto.
- **Biblioteca de movimentos sincronizados.** `move(style, t)` retorna pose de dança no ritmo: bounce, hop, sway, spin, stomp etc.
- **Paleta por capítulo** e um arco de cores ao longo do vídeo.
- **Produção paralela.** O agente principal escreveu o guia e o storyboard. Subagentes pintaram um capítulo cada, cada um só no seu arquivo. A verificação era feita com folhas de contato (`--sheet`) abertas pelo próprio agente.
- **Orçamento de desempenho explícito:** até 2,5 s por quadro, poucas formas grandes em vez de milhares de pequenas.

### 3.2 O que já existe no seu projeto

O ClaudeAnimationBase é a base "mais geral" do mesmo autor, sob licença MIT. Já contém em `src/motion.js`, `src/timeline.js` e `src/clawd.js`: `kf`, `pulse`, `pulse2`, `seg`, `easeOut`, `backOut`, `elasticOut`, `spring`, `ring`, `onTwos`, `arcPt`, `jump`, `take`, `stroll`, `move`, `dancer`, `shots`, `LOOPS` e câmera.

Falta, em relação ao PDoomVideo:

- capítulos (`chapter(nome, início, fim, planos)`) e um vídeo de vários minutos;
- letra/legenda sincronizada (`lyrics.js` + `karaoke`);
- cortina de pincel entre capítulos;
- elenco e cenário recorrente para uma série;
- áudio como fonte de tempo.

### 3.3 Restrição de licença

O PDoomVideo não tem arquivo LICENSE. Sem licença, o padrão legal é "todos os direitos reservados". Não copie arquivos nem trechos de código dele. Use como referência de método, como o `AGENTS.md` já diz. As ideias de técnica (ritmo, transições, briefing de subagentes) não dependem de copiar código.

---

## 4. Estado atual do projeto

### 4.1 Números (medidos em 22/10/2026)

| Item | Valor |
|---|---|
| Código em `src/` | cerca de 2.680 linhas |
| Código de cenas em `src/scenes/` | cerca de 930 linhas |
| Scripts em `scripts/` | 48 arquivos, cerca de 1.870 linhas |
| Documentação Markdown (`docs/` e raiz) | cerca de 419 KB |
| Testes | 10 arquivos, 337 linhas |
| Projetos registrados em `src/config.js` | 15 IDs |
| Maior duração de projeto | 11 s (`demo`) |
| Alterações não commitadas | 87 entradas no `git status` |

### 4.2 Situação por motor

| Motor | Situação real | O que falta para produzir vídeos |
|---|---|---|
| Aquarela | Motor completo do autor original: `paint`, `inkLine`, Clawd com poses, emoções, chapéus, câmera e letras | Elenco além do Clawd, cenários reutilizáveis, capítulos, legenda e áudio |
| Cartoon | Só `VisitArt`, específico de "Uma visita" (cerca de 60 linhas) | Kit de desenho geral: formas, personagem com pose, cenário, texto, transições |
| Pixel | Só `VisitArt`, específico de "Uma visita" (cerca de 60 linhas); quantização de paleta funciona | O mesmo kit, em grade de 320×180 |
| 3D low poly | Funciona e foi validado | Pausado por decisão do usuário |

### 4.3 Desempenho medido nesta máquina

Comando: `node render.mjs --project=visit --style=<estilo> --sheet=1,2,3,4,5,5.5` (Ryzen 5 3600, 16 GB, Radeon R9 200).

| Estilo | ms por quadro (6 quadros) | Estimativa para 3 min a 24 fps (4.320 quadros), 1 worker |
|---|---|---|
| Aquarela | 493–804 | cerca de 45–60 min; cenas cheias como as do PDoomVideo podem chegar a 2–3 h |
| Cartoon | 15–92 | cerca de 2 min |
| Pixel | 16–83 | cerca de 2 min |

Com `onTwos` (12 desenhos por segundo), a aquarela cai pela metade. Conclusão: o custo de render não é o gargalo. O gargalo é escrever as cenas.

### 4.4 Por que o desenvolvimento perdeu ritmo

1. **Governança acima do produto.** Hashes por arquivo, manifestos de cache, catálogo de assets com admissão de licença, revisões com ID, quarentena e relatórios de validação. Isso é útil para um estúdio com muitas pessoas. Para um canal de uma pessoa, na fase atual, cada entrega custa mais tempo em papelada do que em filme.
2. **Regras do `AGENTS.md` que multiplicam o trabalho.** Toda entrega exige storyboard, tiras, recortes, revisão, registro em `docs/VALIDATION.md` e verificação completa do MP4. Para um teste de 3 s, isso é desproporcional.
3. **Frentes em paralelo.** 3D, assets 3D, menina em aquarela por camadas, fixture Iara, entrega articulada e benchmark de 1080p, todas abertas antes de um único vídeo completo.
4. **Pilotos curtos demais.** Pilotos de 2–8 s não mostram os problemas reais de um vídeo longo: ritmo, variedade, continuidade, áudio e legendas.
5. **Documentos históricos contraditórios.** O próprio `NEXT_STEPS_REVIEW.md` avisa que `EIDOVERSE_TECHNICAL_REVIEW.md`, `ARCHITECTURE.md` e `ART_ASSETS_PLAN.md` têm trechos desatualizados. Um agente que lê tudo isso no início de cada tarefa gasta contexto e se confunde.

O trabalho feito não está perdido. O renderizador com workers, a retomada, a verificação de MP4 e o determinismo são bons e servem para vídeos longos.

---

## 5. Eidoverse: o que aproveitar

Base: README, `requirements-local.txt`, `align_lyrics.py`, `lipsync.py`, `generate_song.py` e lista de guias em `tools-guides/`. O Eidoverse não foi executado.

### 5.1 Aproveitar (como ideia ou reimplementação curta)

| Recurso | Por que serve | Custo |
|---|---|---|
| Alinhamento de letra/fala (`align_lyrics.py`: Whisper com timestamps por palavra, cortes em silêncios, casamento com o texto conhecido) | Gera automaticamente o `[início, fim, texto]` de cada frase. É a base da timeline guiada por áudio e das legendas | Grátis, CPU; o modelo `small` ou `base` roda no seu PC |
| Envelope de boca (`lipsync.py`: energia por faixa de frequência por quadro) | Abre e fecha a boca do personagem 2D com a voz, sem rig | Grátis, CPU |
| Narração local | O Eidoverse usa `edge-tts`. Alternativa 100% local: Piper TTS | Grátis |
| `synthkit/` (síntese de música procedural em Python) | Trilha sem direitos autorais de terceiros | Grátis, CPU; qualidade a avaliar |
| Guias `motion-graphics.md` e `render-review.md` | Vocabulário de tipografia, gráficos e método de revisão | Só leitura |

Sobre o `edge-tts`: ele usa um serviço online da Microsoft sem API oficial e pode parar de funcionar. Piper é local e estável. Avalie as condições de uso de qualquer voz antes de monetizar.

### 5.2 Não aproveitar agora

- **Renderizador Deno + WebGPU + TSL.** A Radeon R9 200 é de 2013 e provavelmente não tem suporte adequado a WebGPU no Chrome. Isso não foi testado. Também exigiria uma segunda plataforma.
- **VRM, Rapier e controladores de locomoção.** São incrementais (`update(dt)`, `world.step()`), o que conflita com a regra "cada quadro é função pura do tempo".
- **Música por ComfyUI/MiniMax e SFX por Stable Audio.** Exigem GPU moderna.
- **Código copiado.** A licença é AGPLv3. Copiar código obriga a distribuir o projeto inteiro sob AGPL. Reescreva a ideia em poucas linhas.

---

## 6. Formato recomendado para o canal

Com custo zero e o seu hardware, os formatos mais viáveis são:

1. **Videoclipe animado** de música livre de direitos ou gerada localmente: o mesmo modelo do PDoomVideo e do vídeo de referência.
2. **História narrada** (2–8 min): narração TTS local, legendas grandes, planos de 2–5 s, personagem recorrente com poses-chave, câmera e tipografia.

Os dois usam a mesma peça central: **uma timeline derivada do áudio.** A escolha do nicho é sua e muda o roteiro, não a técnica. O repositório não tem registro do nicho escolhido.

Pipeline alvo:

```
ideia → roteiro (texto) → áudio (TTS ou música) → alinhamento (Whisper)
     → timeline.json (frases, batidas, capítulos) → storyboard → cenas
     → render (workers) → MP4 com áudio e legendas → revisão → upload
```

---

## 7. Próximos passos

Cada fase termina com um MP4 que você assiste. Não abra a fase seguinte sem aprovar o vídeo da anterior.

### Fase 0 — Limpar a mesa (1 sessão)

1. Fazer commit do estado atual, para ter um ponto de retorno.
2. Declarar pausados em um parágrafo do `README.md`: 3D, catálogo de assets, menina articulada e fixture Iara. Não apagar nada.
3. Reduzir o `AGENTS.md`. Para testes e rascunhos, exigir só `npm test` mais uma folha de contato aberta. Exigir a verificação completa só para o vídeo final de cada fase.
4. Mover relatórios históricos para `docs/historico/`, para o agente não lê-los em toda tarefa.

### Fase 1 — Kit de desenho para cartoon e pixel (2–3 sessões)

Hoje cartoon e pixel só sabem desenhar "Uma visita". Crie em cada estilo um kit com os **mesmos nomes de função**, cada um com a sua aparência:

- formas: retângulo arredondado, elipse, polígono, linha, gradiente/fundo;
- personagem: aceitar o mesmo objeto de pose do Clawd da aquarela (`dy`, `sq`, `rot`, `flip`, `aL`, `aR`, `walk`, `eyes`, `mouth`, `lookX`, `blush`, `emote`), para que `move`, `mood`, `jump`, `take` e `stroll` funcionem nos três estilos;
- texto: letra grande com pop e saída, legenda inferior;
- transições: íris, cortina, flash e corte com zoom.

Isso não é conversão automática de cenas entre estilos. A coreografia é comum e o desenho é de cada estilo, como em `visit.js`.

Critério de aceite: uma cena de 10 s nova, diferente de "Uma visita", renderizada nos três estilos sem código de arte específico da cena.

### Fase 2 — Timeline guiada por áudio (1–2 sessões)

1. Script Python curto: áudio + texto conhecido → `timeline.json` com `[início, fim, texto]` por frase (Whisper). Reescrito, não copiado do Eidoverse.
2. Detecção de BPM e da primeira batida para música, ou entrada manual de `bpm`/`offset` no projeto.
3. Envelope de boca por quadro em JSON, lido pela cena.
4. Legenda inferior padrão (como o karaokê do PDoomVideo) em cada estilo.
5. O `render.mjs` já faz mux de áudio (`--audio`). Acrescentar a verificação do stream de áudio no relatório.

Critério de aceite: 30 s de narração TTS local com legenda sincronizada e boca do personagem acompanhando a voz.

### Fase 3 — Primeiro vídeo completo (60–90 s)

1. Escolher um estilo (cartoon é o mais rápido de renderizar).
2. Escrever o storyboard no formato do PDoomVideo: uma linha por plano, com tempo, texto, ação, câmera e transição de saída. Regra: algo acontece em todo plano.
3. Organizar em capítulos de 15–30 s, um arquivo cada.
4. Revisar com folhas de contato por capítulo e assistir ao MP4 final inteiro.

Critério de aceite: você assiste até o fim sem achar que está parado ou repetitivo.

### Fase 4 — Mesma história nos outros dois estilos e vídeo de 3–5 min

- Portar a Fase 3 para aquarela e pixel, para provar que os três motores produzem vídeos completos.
- Fazer um vídeo de 3–5 min com capítulos escritos em paralelo por subagentes, cada um no próprio arquivo, com um guia de animação no estilo do `ANIMATION_GUIDE.md` do PDoomVideo (escrito do zero para este projeto).

### Fase 5 — Automação

- Prompt → roteiro → áudio → timeline → storyboard → capítulos → render → revisão, com intervenção humana só na aprovação do roteiro e do vídeo final.
- Biblioteca de cenários, props e ações já usados em vídeos aprovados. Não criar biblioteca antes de usar.
- Thumbnail gerada pelo próprio motor (`--stills`).
- Upload: manual no início. A API do YouTube e o "aquecimento" de conta ficam para quando houver 5–10 vídeos prontos.

### Fase 6 — Retomar 3D e ilustração articulada (opcional)

Só quando o canal tiver um ritmo de publicação. O motor 3D já está validado e não se perde.

---

## 8. Como pedir ao agente (Codex ou Claude)

Problemas da forma atual de pedir: pedidos amplos, com muitas exigências de auditoria, levam a mais documentos e menos vídeo. Sugestões:

- Uma fase por pedido, com entrega definida como "MP4 de X segundos que mostra Y".
- Proibir explicitamente novos relatórios, novos sistemas de catálogo ou manifestos, salvo pedido.
- Limitar a leitura inicial: `AGENTS.md`, `ANIMATION_GUIDE.md`, o guia do estilo e os arquivos da tarefa.
- Pedir a folha de contato e o MP4, não um relatório.

Exemplo de pedido para a Fase 1:

> Leia AGENTS.md, ANIMATION_GUIDE.md, src/motion.js, src/timeline.js, src/scenes/visit.js e os engines de cartoon e pixel. Hoje cartoon e pixel só têm `VisitArt`. Crie em cada um um kit de desenho geral com os mesmos nomes de função (formas, personagem com o mesmo objeto de pose do clawd da aquarela, texto com pop, legenda inferior, íris e flash). Mantenha `VisitArt` funcionando. Depois crie o projeto `kit-demo`, 10 s, em que o personagem entra caminhando, vê um objeto, reage com `take`, dança 2 compassos com `move` e sai. Renderize nos três estilos. Não crie novos documentos de relatório nem altere o catálogo de assets. Entregue: os três MP4s, uma folha de contato por estilo e a lista de arquivos alterados.

---

## 9. Evidências desta análise

- Clone do PDoomVideo: pasta de rascunho da sessão (`scratchpad/ext/PDoomVideo`), não incluída no repositório.
- Metadados e quadros do vídeo de referência: `scratchpad/yt/` (`v.info.json`, `sheet1.jpg`, `strip18.jpg`, `strip30.jpg`), fora do repositório.
- Medições de render: folhas de contato `bench-<estilo>.jpg` no rascunho da sessão.
- PDF da conversa (`docs/conversa/Relatório Canal Dark Automático.pdf`, 160 páginas): extraído para texto e lido por amostragem (início, fim e buscas por hardware, nicho, áudio e Eidoverse). Não foi lido integralmente.
- Não foram executados: `npm test`, `npm run test:visual`, Eidoverse, PDoomVideo. Nenhum arquivo de código foi alterado.
