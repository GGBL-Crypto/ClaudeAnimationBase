# Um sinal na poeira — storyboard

Projeto `mars-discovery`, estilo `lowpoly-3d`, 3 segundos, 12 fps, 36 quadros. Silencioso. Validar primeiro 1280×720 e depois 1920×1080. Filmes existentes permanecem nos projetos anteriores.

Um robô explorador interrompe sua caminhada em Marte ao perceber uma pedra turquesa pulsante. Ele se inclina, recua um pouco surpreso e abre as mãos: a descoberta merece atenção.

Um único plano, câmera de três quartos com aproximação suave. Movimento da esquerda para a direita. Pedra já visível no início; poucos volumes de fundo e bastante espaço para a leitura. Sem transição que consuma tempo da história.

| Intervalo | Leitura | Pose e continuidade |
|---|---|---|
| 0–1 s / 0–11 | Explorar | Dois passos alternados; apoio fixo; braços pequenos contrabalançam. |
| 1–1,75 s / 12–20 | Perceber | O brilho cresce; cabeça vira e inclina; o corpo termina a parada e se aproxima. |
| 1,75–3 s / 21–35 | Descobrir | Pequeno recuo, olhos ampliam, mãos abrem e cabeça inclina; sustenta a descoberta. |

Quadros-chave de inspeção: 0, 6, 11, 12, 17, 20, 21, 26, 30, 35. Revisões adicionais: marcha 0–1 s, parada 0,75–1,5 s, reação 1,5–2,92 s; detalhes dos pés, visor e pedra. Último quadro em 35/12 s. A duração do arquivo é 3 s, sem quadro extra em t=3.

Critérios: robô separado do fundo, pés sem atravessar o chão, pedra sempre localizável, causa antes da reação e identidade visual estável. Caminhada e câmera devem funcionar ao renderizar tempos fora de ordem.
