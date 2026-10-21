# Cartoon vetorial

Backend: Canvas2D. A arte é construída por formas vetoriais e rasterizada no canvas final a 1920×1080. A exportação atual é PNG/JPEG/MP4; não há exportação SVG.

Configuração independente em `config.js`: `palette` (céu, chão, personagem, sombras, asas e olhos), `texture.speckles` (pontilhado opcional do cenário), `outline.weight` (pixels de contorno), `character` (unidade, largura, altura e raio dos cantos), `effects.shadow` e `effects.transition`.

Use silhuetas limpas, cores planas, curvas deliberadas, contornos de espessura consistente e sombras em blocos. Não acrescente pigmento, fervura ou pixelização. O personagem do teste tem quatro pernas, duas pequenas hastes de braços e olhos bem espaçados. Preserve esse modelo entre planos.

Movimento é calculado no tempo contínuo. Antecipe mudanças de expressão com fechamento dos olhos; aceno e asas têm frequências diferentes. Contatos usam a mesma transformação de squash do personagem. Desenhe planos completos e restaure estado do contexto após cada transformação.

`animationEngine.context` expõe o contexto nativo para novas cenas. `VisitArt` é apenas a porta artística da história de demonstração: acrescente os objetos que uma nova história realmente precisa. Não tente traduzir chamadas de p5.brush para cartoon implicitamente.

Validação: ausência de bibliotecas p5 na página, curvas sem serrilhado indevido, olhos legíveis, contornos uniformes, determinismo e dimensões estáveis.
