# Instruções para Claude Code

Este repositório produz vídeos animados longos para um canal do YouTube, de forma automatizada e sem custos com serviços pagos. Claude Code substitui o Codex como agente principal. `AGENTS.md` é legado do Codex. Em caso de conflito, vale este arquivo.

## Prioridades atuais (22/10/2026)

1. Vídeos longos narrados em português, de qualquer tema (humanos, animais, natureza, história), com seres em movimento realista e ambiente que reage, em cartoon (primeiro) e aquarela (depois). Design: `docs/superpowers/specs/2026-10-22-documentarios-animados-design.md`. Plano: `docs/superpowers/plans/2026-10-22-documentarios-animados.md`.
2. Entregar MP4s assistíveis. Um vídeo pronto vale mais do que um relatório.
3. Pausados, sem apagar: motor 3D, catálogo de assets, menina articulada, fixture Iara. Não abra trabalho nessas frentes sem pedido explícito.

## Ambiente

- Windows 10, Ryzen 5 3600, 16 GB de RAM, Radeon R9 200 (GPU antiga; WebGPU não disponível de forma confiável).
- Node 24, Python 3.11, FFmpeg/FFprobe no PATH, Chrome local.
- Os comandos de shell já passam pelo hook RTK. Não prefixe manualmente.

## Leitura antes de trabalhar

- Sempre: este arquivo e `ANIMATION_GUIDE.md`.
- Ao mexer em um estilo: `src/styles/<estilo>/GUIDE.md` e `src/styles/<estilo>/AGENTS.md`.
- Ao mexer em cenas: `src/scenes/AGENTS.md`.
- Não leia relatórios históricos de `docs/` (auditorias, pilotos, Eidoverse) salvo quando a tarefa pedir. Vários estão desatualizados.

## Regras de código

- Cada quadro é função pura do tempo `t`. Proibido: `Math.random()`, relógio de parede, estado entre quadros, física incremental. Use `hash()`, `noise1()` e sementes estáveis por objeto. O render roda fora de ordem e com vários workers.
- `src/motion.js`, `src/timeline.js` e `src/nature/` são independentes de estilo: só matemática e geometria, nada de desenho.
- O desenho fica em `src/styles/<estilo>/`. Cartoon usa Canvas2D. Não importe p5/p5.brush fora da aquarela.
- `src/core.js`, `src/clawd.js` e `src/sheets.js` são o motor original da aquarela. Preserve as APIs e a demo.
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
2. Cena ou capítulo: storyboard primeiro, depois código, depois folha de contato aberta com Read.
3. Capítulos de um episódio podem ser escritos em paralelo por subagentes, um arquivo por capítulo. Cada subagente só edita o próprio arquivo e recebe o guia do episódio.
4. Commits pequenos e frequentes, mensagens em inglês no formato `feat:`, `fix:`, `docs:`, `test:`.

## Validação proporcional

- Rascunho e iteração: `npm test` e uma folha de contato (`--sheet` ou `--strip`) aberta e olhada de verdade.
- Alteração em motor, timeline ou prévia: também `npm run test:visual`.
- Entrega final de episódio: `render.mjs --encode` com áudio, verificação automática do MP4 e inspeção de `<vídeo>.review/decoded-sheet.png`. Registre uma entrada curta em `docs/VALIDATION.md`.
- Nunca diga que um vídeo terminou só porque o processo imprimiu uma mensagem. Confirme arquivo, duração, fps, contagem de quadros e áudio.
- Não crie novos relatórios, catálogos, manifestos ou sistemas de governança sem pedido.

## Comandos úteis

```sh
npm test
npm run studio                      # prévia em http://127.0.0.1:8080/studio.html?project=<id>
node render.mjs --project=<id> --sheet=1,5,9 --cols=3 --w=640 --out=out/check/a.jpg
node render.mjs --project=<id> --strip=10:11 --cols=6 --w=320 --out=out/check/b.jpg
node render.mjs --project=<id> --frames --workers=4
node render.mjs --project=<id> --encode --audio=<mix.m4a> --out=out/episodes/<id>/video.mp4
```
