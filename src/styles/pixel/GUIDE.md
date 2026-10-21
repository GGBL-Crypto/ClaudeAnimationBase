# Pixel art

Backend: framebuffer Canvas2D de 320×180 ampliado 6× para 1920×1080. Sprites são compostos de retângulos e segmentos discretos; não são a aquarela reduzida por filtro.

Configuração própria em `config.js`: `palette`, `texture.scale` (fator inteiro que divide as duas dimensões), `texture.dither` (pontilhado estático do chão), `outline.weight` (pixels inteiros positivos), `character` (unidade e proporções), `effects.shadow` e `effects.transition`.

O padrão limita a arte a dez cores distintas (os tokens `cloud` e `eye` compartilham uma cor). O framebuffer é quantizado à paleta antes da ampliação. Sem blur, gradientes, transparências intermediárias ou suavização na escala final. O MP4 H.264 usa compressão e subamostragem de cor; use PNG para conferir a paleta exata.

As poses são calculadas a 12 desenhos/s e exportadas a 24 fps. A câmera do teste fica fixa na grade. Dê forma a curvas com degraus intencionais, poucos highlights e boa silhueta. Movimento de um pixel já é visível; não simule microjitter de tinta.

Novas cenas podem usar `animationEngine.context` na resolução de `animationEngine.buffer`, ou uma porta artística que converta coordenadas de mundo explicitamente. Use posições arredondadas. Um futuro movimento de câmera precisa ser aplicado antes da quantização e alinhado à grade.

Validação automática: nenhum RGB fora da paleta no framebuffer e nenhum bloco de ampliação com cores inconsistentes. Validação visual: olhos legíveis, braços reconhecíveis, contato de pés/objetos, ausência de pixels isolados acidentais e continuidade das poses.
