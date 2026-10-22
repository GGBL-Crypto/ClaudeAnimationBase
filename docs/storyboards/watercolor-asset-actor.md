# Um cumprimento no jardim — piloto técnico

Logline: Iara percebe quem chegou, sorri e faz um pequeno cumprimento.
Mundo: jardim de aquarela existente, papel creme, pigmento suave verde/azul; nenhuma referência externa incorporada.
Elenco: Iara, fixture original simples com rosto, cabelo castanho, casaco teal e punhos creme. Qualidade de ilustração profissional pendente.
Modelo/paleta/proporções: `iara-watercolor-fixture@1.0.2`, congelados; somente frente/pose greeting.

Plano único, 0–2,5 s, câmera de plano médio e avanço de 1,5%. A/B usam exatamente o mesmo estado por tempo, hierarquia, escala e câmera.

| Tempo | Leitura / ação |
|---|---|
| 0–0,50 | Personagem respira; cabelo acompanha com atraso analítico. |
| 0,50–0,75 | Piscada encobre a troca neutro → sorriso (0,625 s). |
| 0,75–1,20 | Pequena inclinação da cabeça sustenta o sorriso. |
| 1,20–2,05 | Braço antecipa/ergue suavemente e mão cumprimenta. |
| 2,05–2,50 | Mão baixa e cabelo acomoda. |

Sem corte ou wipe no plano de teste: é necessário inspecionar a ilustração desde o primeiro frame. Início/fim são sustentações, sem áudio. Versão procedural usa `paint`/`inkLine`, versão assets usa partes RGBA; ambas recebem cenário, câmera, foreground e grain atuais. O teste técnico é de animação de partes, não de uma cena narrativa finalizada.

Revisar storyboard e tiras de respiração, piscada/expressão, cabeça/cabelo e gesto. Recortar ombro/cotovelo/punho/pescoço e rosto, inclusive nas rotações extremas declaradas. Rejeitar vistas ausentes, nunca reconstruí-las.
