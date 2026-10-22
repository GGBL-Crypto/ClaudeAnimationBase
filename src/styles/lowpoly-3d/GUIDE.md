# Direção artística — low poly

Volumes simples, facetas grandes, cores sólidas e silhuetas legíveis. Modelos procedurais têm identidade definida por proporção, paleta e pivôs fixos. Não tente reproduzir tinta, sprites ou contornos do cartoon.

## Mundo e câmera

Y é altura, solo em zero, +Z é a frente local do personagem. Rotação em radianos; câmera em três quartos para mostrar profundidade e expressão. Perspective é a projeção do filme; ortográfica fica disponível para composição/inspeção. Uma única ação principal deve dominar cada leitura.

## Cor e luz

Cada filme congela sua própria bíblia visual; a paleta padrão não obriga novas histórias a parecerem Marte. No primeiro filme: chão terracota, céu empoeirado claro, robô marfim e pedra turquesa. Em `ocean-encounter`: água azul profunda, solo/algas verdes, casco dourado e criatura ciano luminosa. A névoa marca profundidade; emissão discreta preserva a cor do casco sob luz azul.

O brilho é contraste/emissão e luz local; não depende de bloom. Uma hemisférica e uma direcional modelam volumes. Sombras são opcionais por projeto; o filme submarino as desliga. Sem pós-processamento pesado.

## Atuação e construção

Geometrias com poucos segmentos. O robô usa rig de grupos e duas pernas articuladas; seu apoio deve permanecer estável. O submarino usa hélice, inclinação da proa e recuo; a água-viva usa pulsação e tentáculos. Não imponha rig humanoide a todos os personagens. Prepare mudanças, deixe espaço para a reação e uma pausa de leitura. Não acrescente tremor contínuo que pareça ruído.

O motor oferece cena, geometrias, materiais, grupos e câmera; cada filme constrói seu elenco e aplica poses por tempo. Importe modelos glTF só quando houver um asset real a justificar, com recursos locais e inventariados.

Consulte [catálogo de componentes](../../../docs/COMPONENTS_3D.md) antes de construir outro ator, cenário ou câmera. Use `LowpolyComponents` no filme, sem alterar `engine.js`. Trajetórias, horários, cortes e acontecimentos ficam na cena; componentes não importam filmes. Só extraia parâmetros úteis para variações concretas.

## Revisão

Inspecione começo/meio/fim, contornos do visor, oclusão da pedra, contatos do pé, interpenetração das pernas, linhas de horizonte, facetas e shadow acne. Abra as tiras de apoio/parada/reação. PNGs e MP4 podem ter cores diferentes por compressão. Não confunda prévia ampliada com captura final.

Em personagens aquáticos, revise também separação das silhuetas, hélice no FPS real, tentáculos, trajeto dos dois atores e continuidade nos cortes. Recortes devem seguir os atores em movimento e permanecer dentro do canvas.
