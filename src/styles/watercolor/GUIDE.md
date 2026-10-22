# Aquarela

Ilustrações opacas fornecidas pelo usuário: `illustration-2d` reutiliza catálogo, sessão e `item.draw` do adaptador, com uma única camada inteira e PNG RGBA8 opaco completamente decodificado. Não exige nem inventa recorte de personagem. As variantes trocam a composição inteira em planos separados; não são substituições faciais. [Piloto, inventário e limites](../../../docs/PERSONAGEM_PILOT_REPORT.md). A exceção de admissão `usage.scope:'local-pilot'` registra licença comercial desconhecida explicitamente e só se aplica a imagens geradas fornecidas pelo usuário para aquarela local. Não atribui direitos ou altera a política dos packs anteriores.

Perfil opcional para ilustração preparada: [contrato, limites e piloto](../../../docs/WATERCOLOR_ASSET_ACTOR_REPORT.md). Use `assetRefs` com pack `layered-2d`; `assetSession.items.get(id).draw(x,y,escala,{view,pose,expression,transforms})` respeita câmera, ordem da cena, tint/blend e grain. Exige partes PNG RGBA8 não entrelaçadas com transparência real, pivôs/parents e versões de identidade. Vista/pose ausente falha: não reconstruir ou espelhar automaticamente. O personagem original `clawd()` permanece padrão e inalterado.

`styleOptions.watercolor.output.height` aceita 720 ou 1080, padrão 1080. A pintura continua interna em 1920×1080; 720 é redução da saída final. Não equivale a diminuir a resolução interna do brush. O bootstrap reserva o auto-start do p5 até o init explícito; assets são preparados como `p5.Image` depois do setup e antes de ready.

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
