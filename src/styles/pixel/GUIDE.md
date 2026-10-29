# Pixel art

Backend: framebuffer Canvas2D de 320×180 ampliado 6× para 1920×1080. Sprites são compostos de retângulos e segmentos discretos; não são a aquarela reduzida por filtro.

Configuração própria em `config.js`: `palette`, `texture.scale` (fator inteiro que divide as duas dimensões), `texture.dither` (pontilhado estático do chão), `outline.weight` (pixels inteiros positivos), `character` (unidade e proporções), `effects.shadow` e `effects.transition`.

A paleta é fechada: 45 cores distintas (até 48; os tokens `cloud` e `eye` compartilham uma), as dez do `VisitArt` e as rampas do kit de episódio. O framebuffer é quantizado à paleta antes da ampliação. Sem blur, gradientes, transparências intermediárias ou suavização na escala final. O MP4 H.264 usa compressão e subamostragem de cor; use PNG para conferir a paleta exata.

As poses são calculadas a 12 desenhos/s e exportadas a 24 fps. A câmera do teste fica fixa na grade. Dê forma a curvas com degraus intencionais, poucos highlights e boa silhueta. Movimento de um pixel já é visível; não simule microjitter de tinta.

Novas cenas podem usar `animationEngine.context` na resolução de `animationEngine.buffer`, ou uma porta artística que converta coordenadas de mundo explicitamente. Use posições arredondadas. Um futuro movimento de câmera precisa ser aplicado antes da quantização e alinhado à grade.

Validação automática: nenhum RGB fora da paleta no framebuffer e nenhum bloco de ampliação com cores inconsistentes. Validação visual: olhos legíveis, braços reconhecíveis, contato de pés/objetos, ausência de pixels isolados acidentais e continuidade das poses.

## Kit de episódio (cena K)

`draw.js` define `ExpStyle.draw(F)` para `F.scene === 'K'` (contrato em `src/styles/AGENTS.md`) e desenha direto em `animationEngine.context`, na grade de 320×180: mundo dividido por `texture.scale` (e multiplicado por `cam.z`), deslocamento de cada camada de paralaxe arredondado a px inteiro antes do desenho. O `engine.js` e o `VisitArt` não mudam; o quantizador continua no fim de cada quadro. As cenas que não são K não existem no pixel.

- **Rampas:** `moods` em `config.js` dá, por clima de luz (`dawn`, `day`, `dusk`, `night`, `interior`), o nome da cor da paleta para céu de cima, do meio e de baixo, nuvem, longe, meio, perto, chão, luz, sombra e brilho. O `validate` recusa rampa fora da paleta e paleta com mais de 48 cores.
- **Degradê:** só pontilhado Bayer 4×4 entre duas cores da paleta, em 8 degraus (céu em três cores, faixa do mar, sombra das dunas, papel do mapa). Nunca mistura.
- **Luz e névoa:** trocam cada cor do buffer pela de cima na rampa de luz (`UP` em `draw.js`). As luzes do kit somam k·(1 − d/r), com r limitado a 40 px da grade, e o pontilhado decide 0, 1 ou 2 degraus; o brilho do sol e da lua usa o mesmo passe no céu. A névoa clareia um degrau inteiro tudo o que já está desenhado antes das camadas de f ≥ .3 e f ≥ .5 (só .5 na neblina baixa): o longe clareia em blocos e o perto fica nítido. No interior, céu, clima e névoa valem só na janela (câmera de f = 1, recorte pelo retângulo).
- **Cenário:** estrelas de 1 px (cintilam entre claro, apagado e cruz nas grandes), sol e lua em disco com faixas horizontais na metade de baixo, morros em até 3 tons que esfriam com a distância, pinheiros serrilhados em camadas, casas com telhado, tábuas e janelas acesas com borda de 1 px, calçamento em fiadas na pedra, pontilhado estático preso ao mundo nos outros chões, reflexo do sol ou da lua no mar.
- **Bonecos:** pelas juntas de `pose.joints`, membros de 2 px (3 no pesado), tronco de 3 a 5 px, cabeça em bloco com cabelo em cima e atrás, olho de 1 px, contorno de 1 px em `ink` em volta da silhueta inteira e, por dentro, só em volta do braço de perto (para ler sobre o tronco). As cores do elenco viram a cor mais próxima da paleta; braço e perna do lado de longe usam o tom mais escuro dela. Pé assentado na linha do chão. Boneco de pé: de 26 a 34 px de altura na grade no enquadramento `wide`; no `mid` a altura escala por `cam.z` (z = 1,35: de 35 a 46 px). `ExpStyle.parts` devolve os mesmos traços para o `check-motion`.
