# Instruções para Claude Code

Este repositório é uma base de estilos e motor de animação em código, sem filmes, para vídeos de um canal do YouTube feitos de forma automatizada e sem custos com serviços pagos. Claude Code substitui o Codex como agente principal. `AGENTS.md` é legado do Codex. Em caso de conflito, vale este arquivo.

## Prioridades atuais (27/10/2026)

1. Base de estilos e motor: todos os estilos em `src/styles/` testáveis pela cena de fumaça (`fixtures/smoke/`), movimento em `src/motion.js`, `src/timeline.js` e `src/nature/`, voz e mixagem (`docs/VOICE.md`).
2. Em seguida: webapp interativo sobre esta base (outra sessão).
3. Pausados, sem apagar: catálogo de assets e GLB articulado. Não abra trabalho nessas frentes sem pedido explícito.

## Ambiente

- Windows 10, Ryzen 5 3600, 16 GB de RAM, Radeon R9 200 (GPU antiga; WebGPU não disponível de forma confiável).
- Node 24, Python 3.11, FFmpeg/FFprobe no PATH, Chrome local.
- Os comandos de shell já passam pelo hook RTK. Não prefixe manualmente.

## Leitura antes de trabalhar

- Sempre: este arquivo e `ANIMATION_GUIDE.md`.
- Ao mexer em um estilo: `GUIDE.md`, `AGENTS.md` ou `STYLE.md` da pasta `src/styles/<estilo>/`.
- Ao mexer no quadro F dos estilos 2D: `src/styles/AGENTS.md`.
- Não leia os documentos históricos de `docs/` (planos e catálogo) salvo quando a tarefa pedir. Vários estão desatualizados.

## Regras de código

- Cada quadro é função pura do tempo `t`. Proibido: `Math.random()`, relógio de parede, estado entre quadros, física incremental. Use `hash()`, `noise1()` e sementes estáveis por objeto. O render roda fora de ordem e com vários workers.
- `src/motion.js`, `src/timeline.js` e `src/nature/` são independentes de estilo: só matemática e geometria, nada de desenho.
- O desenho fica em `src/styles/<estilo>/`. Os estilos 2D usam Canvas2D. p5 só no `watercolor-classic`; p5.brush só na aquarela.
- `src/core.js`, `src/clawd.js` e `src/sheets.js` são o motor original da aquarela (estilo `watercolor-classic`). Preserve as APIs.
- Nunca leia `window.PROJECT` (o p5 ocupa esse nome). Use o `const PROJECT` de `motion.js`.
- Reaproveite dependências instaladas. Não adicione dependências npm sem necessidade clara.
- Escreva código como o que já existe ao redor: mesmo estilo, nomes e densidade de comentários.

## Licenças

- Base ClaudeAnimationBase: MIT (manter `LICENSE`).
- PDoomVideo não tem licença: use só como referência de método. Não copie código, cenas ou música.
- Eidoverse é AGPLv3: aproveite ideias e reescreva. Não copie código.
- Piper TTS é GPL e é usado só como ferramenta externa (subprocesso). Confirme a licença de cada voz no model card antes de publicar.
- Fatos de qualquer roteiro precisam de fonte registrada. Não invente números.
- Nunca envie e-mail, nome ou outro dado pessoal do usuário a serviços externos (APIs de pesquisa, Unpaywall, formulários). Quando um serviço exigir e-mail, pare e pergunte.

## Estilo de sessão

- Skills: `caveman` (respostas curtas), `ponytail` (menor mudança completa, reusar o que existe), `superpowers` (planos, TDD, verificação).
- Subagentes recebem só a própria tarefa, as Global Constraints e as interfaces de que dependem. Declare modelo e effort em cada chamada, conforme a tabela do plano.
- Um escritor por arquivo. Revisores só leem.
- Ao retomar, confira arquivos e `git log`; não confie em resumos.
- Falhou duas vezes no mesmo ponto: pare e reporte.

## Fluxo de trabalho

1. Tarefa de implementação: siga o plano ativo, com TDD (`node --test`) para a lógica pura.
2. Estilo: mude e confira na cena de fumaça (`smoke-2d`, `smoke-visit` ou `smoke-3d`) com folha de contato aberta com Read e `check-motion` com 0 violações.
3. Commits pequenos e frequentes, mensagens em inglês no formato `feat:`, `fix:`, `docs:`, `test:`.

## Validação proporcional

- Rascunho e iteração: `npm test` e uma folha de contato (`--sheet` ou `--strip`) aberta e olhada de verdade.
- Alteração em estilo, motor, timeline ou prévia: também `npm run test:visual`.
- Entrega de vídeo: `render.mjs --encode` com áudio, verificação automática do MP4 e inspeção de `<vídeo>.review/decoded-sheet.png`. Registre uma entrada curta em `docs/VALIDATION.md`.
- Nunca diga que um vídeo terminou só porque o processo imprimiu uma mensagem. Confirme arquivo, duração, fps, contagem de quadros e áudio.
- Não crie novos relatórios, catálogos, manifestos ou sistemas de governança sem pedido.

## Comandos úteis

```sh
npm test
npm run studio                      # prévia em http://127.0.0.1:8080/studio.html?project=<id>
npm run test:visual                 # todos os estilos nas cenas de fumaça
node render.mjs --project=smoke-2d --style=<id> --sheet=0,1,1.9 --cols=3 --w=640 --out=out/check/a.jpg
node render.mjs --project=<id> --strip=0.5:1.3 --cols=6 --w=320 --out=out/check/b.jpg
node scripts/check-motion.mjs --project=smoke-2d --2d --style=<id>
node render.mjs --project=<id> --frames --workers=4
node render.mjs --project=<id> --encode --audio=<mix.m4a> --out=out/<id>/video.mp4
```
