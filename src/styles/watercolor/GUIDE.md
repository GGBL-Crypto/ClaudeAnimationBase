# Aquarela

Primeiro estilo, baseado no motor original preservado. Backend: p5.js + p5.brush/WebGL. Desenho: 1920×1080. Referência completa da API: [guia original](../../../docs/WATERCOLOR_ORIGINAL.md).

- A cor de papel, pigmento e contorno está em `config.js → palette`.
- `texture.paper`, `grain`, `boil` e `jitter` controlam papel, composição granulada e fervura do traço. Os padrões reproduzem o motor original.
- `outline.weight` multiplica pesos dos contornos. A demo usa 1; “Uma visita” usa 0,65 em seu próprio projeto.
- `character.unit`, `width` e `height` configuram o protagonista da porta `VisitArt`; cenas originais continuam aceitando `clawd(x,y,u,opções)` diretamente.
- `effects.glow` habilita a luz aditiva; `effects.transition` determina a duração das íris do filme de teste.

Pinte por `paint`/`inkLine`, usando `wash` para corpos sólidos e `fill` para pigmento. Evite formas digitais misturadas ao traço. A exceção é `glow`, que soma luz e evita verde/cinza ao sobrepor amarelo ao azul. Use vistas desenhadas de Clawd; perspectiva 3D não pertence a este estilo.

As regras de aquarela incluem paleta suave, pigmento, papel e sementes `boilSeed` por objeto. Use `emotions` e `turn` para a atuação original. `VisitArt` demonstra outra coreografia compartilhada entre estilos, com antecipação de expressão e contato calculado no topo da cabeça.

P5 é carregado somente aqui. `core.js` retém pintura, geometria, câmera, lettering e composição. O adaptador aguarda `setup`, usa `redraw` e expõe o canvas final. Nunca sobrescreva o estado lexical do projeto com constantes globais do p5.

Validação: demo original, vistas e emoções, stills idênticos na mesma GPU, papel/traço visíveis e ausência de jitter em objetos estáveis. Render WebGL em outra GPU pode produzir diferenças; não substitua uma referência visual sem entender a causa.
