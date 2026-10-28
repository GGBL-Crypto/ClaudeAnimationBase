# Instruções permanentes para Codex

Consulte `C:\Users\Gabriel\.codex\RTK.md` quando disponível neste ambiente; prefixe comandos de shell com `rtk` conforme essa instrução. Preserve alterações existentes do usuário.

## Entrada e planejamento

1. Leia `ANIMATION_GUIDE.md`, `ARCHITECTURE.md`, o projeto em `src/config.js` e o guia do estilo escolhido.
2. Uma descrição de história é uma solicitação de produção: transforme-a em logline, mundo, elenco, leituras, planos, duração e storyboard antes de programar cenas. Mostre o storyboard ao usuário; continue o trabalho já autorizado, incorporando correções que chegarem.
3. Se o usuário não definiu o estilo, use aquarela e declare a escolha. Registre um novo ID de projeto; preserve demos e vídeos anteriores. Cada vídeo tem um único estilo, com paleta/modelo/configuração congelados.
4. PDoomVideo é referência técnica e artística somente. Não copie suas cenas, música, história ou assets. O código deste repositório pode ser reutilizado.

## Implementação

- `src/motion.js` e `src/timeline.js` são comuns aos motores. Não acrescente regras de tinta, grade, anime ou 3D nesses arquivos.
- `src/core.js`, `src/clawd.js` e `src/sheets.js` são a implementação original da aquarela. São carregados somente por esse estilo. Preserve as APIs ao alterá-los (estilo `watercolor-classic`).
- Novo estilo: siga `docs/ADDING_STYLES.md`. Implemente o contrato `animationEngine` e declare compatibilidades reais. Não anuncie anime, motion graphics ou 3D como disponíveis antes de implementá-los e testá-los.
- Cada quadro é função determinística do tempo: sem `Math.random()`, relógio de parede, acumuladores ou física incremental. Use sementes estáveis por objeto. Render deve funcionar fora de ordem e com vários workers.
- Reutilize dependências instaladas e APIs nativas. Não faça refatorações ou reinstalações desnecessárias.
- Nunca use `window.PROJECT` para ler o filme: p5 reserva esse nome. Use o `const PROJECT` de `motion.js`.

## Validação e entrega obrigatórias

1. Execute `npm test`; execute `npm run test:visual` após alterações em motores, timeline ou prévia.
2. Capture um storyboard, uma tira por movimento/transição importante e um recorte de cada contato/expressão decisivos. Abra as imagens e registre defeitos concretos.
3. Corrija os defeitos e revise novamente as regiões afetadas. Não confunda conformidade geométrica automática com qualidade artística.
4. Renderize com `render.mjs`. Não misture sequências de diferentes revisões, projetos, estilos, intervalos ou fps. Respeite os manifestos de cache.
5. **Nunca afirme que um vídeo terminou somente porque o processo imprimiu uma mensagem.** Verifique o arquivo, codec, duração, fps, tamanho, contagem de quadros e decodificação completa. Abra `video.mp4.review/decoded-sheet.png` e detalhes extraídos do MP4. O renderizador já faz as verificações técnicas; `visualReview: pending` exige inspeção real.
6. Registre a revisão em `docs/VALIDATION.md`, com caminhos e limites reais da inspeção. Só então marque a revisão visual do relatório como realizada, incluindo qual evidência foi aberta.
7. Entregue links aos MP4s, prévias e documentação. Informe se áudio foi incluído e eventuais limitações. Não entregue apenas um plano quando a implementação estiver autorizada.
