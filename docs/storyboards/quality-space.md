# Bancada orbital — piloto estático importado

2 segundos, 1280×720, 12 FPS, 24 quadros, sem áudio. Um veículo de exploração paira sobre uma bancada circular e gira em um arco lento. Não há personagem com esqueleto, física ou clip importado.

| Tempo | Leitura | Movimento |
|---|---|---|
| 0–0,6 s | Silhueta e construção | Início suave de giro; câmera fixa em três quartos. |
| 0,6–1,4 s | Materiais e detalhes | Leve elevação; giro contínuo por tempo absoluto. |
| 1,4–2 s | Estabilização | Retorno à altura inicial e desaceleração. |

P0 usa primitivas do backend atual como bloqueio do novo veículo. P1 substitui o ator pelo `craft_speederA.glb` CC0, preservando seus quatro materiais PBR. P2 usa exatamente o mesmo modelo/transforms/câmera e acrescenta ambiente de reflexão procedural de 128 pixels, luzes de recorte/preenchimento e tone mapping ACES. Não altera a malha ou os materiais importados. O pedestal, solo e anel são iguais nos três.

Máxima extensão normalizada: 2,4 unidades. P0 aproxima o envelope, sem fingir reproduzir todos os contornos do asset. Comparar quadros em 0, 1 e 23/12 s. O arco é pequeno para evitar uma comparação favorecida por mudanças de enquadramento. Este ensaio testa importação rígida e acabamento; não comprova atuação de personagens nem o nível artístico das quatro referências.

720p precede a revisão do usuário; 1080p/24 FPS somente após aprovação do piloto inicial.
