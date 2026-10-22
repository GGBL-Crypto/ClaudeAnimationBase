# Generalização 3D — plano anterior à implementação

Estado inicial preservado em `out/generalization/baseline/`. A remoção já existente de `ClaudeAnimationBase.zip` no workspace pertence ao estado encontrado e não será revertida. Nenhuma instalação é necessária.

## Fronteira de reutilização

| Código de Marte | Destino |
|---|---|
| Instalação do motor, captura, recursos e projeção | `engine.js` permanece byte a byte igual. |
| Mesh com posição/escala, materiais e primitivas compartilhadas | Kit de construção no catálogo 3D. |
| Construção e aplicação da pose do robô | Componente procedural de personagem; sem relógio ou duração de filme. |
| Plataforma e posicionamento de rochas | Componentes de cenário/objetos com posições recebidas. |
| Luz local, ambientação e interpolação da câmera | Funções de staging reutilizáveis. |
| Tempos da caminhada, reação à pedra e composição de Marte | Continuam específicos de `mars-discovery.js`. |
| Submarino, água-viva, algas e propulsão flutuante | Novos componentes usados pelo segundo filme. |

O catálogo usa funções, grupos e dados de pose; não cria ECS, árvore de plugins ou linguagem de cenas. Todos os recursos passam pelo ownership do motor existente. O módulo é carregado pelo registro de estilo, sem acrescentar regras ao runtime ou à timeline. Uma história chama fábricas e aplica poses absolutas; não depende de outra história.

Prova de compatibilidade: PNGs de Marte iguais à sequência 1080p anterior; hashes dos quatro motores e núcleo compartilhado iguais à baseline. A nova página não pode carregar nem referenciar `mars-discovery.js`, `marsPose`, `marsDiagnostics` ou o modelo de robô. Testar ordem, páginas independentes, prévia e descarte. Reexecutar os testes existentes dos quatro estilos.

## Segundo filme: “O farol que nadava”

Projeto `ocean-encounter`, 8 s, inicialmente 720p/12 fps (96 quadros), seguido de 1080p/24 fps (192 quadros). Submarino amarelo de exploração, janelas azuladas e propulsor visível, em cânion de rochas e algas. Uma água-viva emite luz própria, sobe e muda de direção. O submarino freia/recuará, inclina-se e a acompanha. Sem legendas explicando a ação.

| Plano | Intervalo | Evento e leitura |
|---|---|---|
| Explorar | 0–3 s | Travelling revela fundo marinho; veículo avança e ilumina o percurso; um brilho surge entre rochas. |
| Encontrar | 3–5,4 s | A câmera se aproxima; a criatura sobe; o submarino percebe, para e recua ao movimento dela. |
| Acompanhar | 5,4–8 s | A criatura faz um arco e o veículo inclina-se para segui-la; abertura do enquadramento oferece uma direção de saída. |

Manter estado do mundo contínuo nos cortes; cada quadro é calculado independentemente. Animar tentáculos, propulsor, bolhas e algas sem física. Câmera em trilhos com alvo/posição explícitos e poses de reação específicas do veículo. Cor e iluminação oceânicas pertencem aos overrides do projeto, não aos defaults de Marte.

## Validação e entrega

1. Extrair componentes e comparar Marte, antes de construir o segundo filme.
2. Storyboard, stills e tiras oceânicas em 720p; corrigir contatos/oclusões/expressões por quadros reais.
3. MP4 720p/12 fps verificado e inspecionado, depois MP4 1080p/24 fps. Medir o processo inteiro com um job por vez; separar aumento de resolução de dobro de quadros na interpretação.
4. Regressão dos quatro motores, determinismo por backend e documentação das capacidades efetivamente exercitadas. Preservar todos os vídeos anteriores e registrar revisão de produção.
5. Proposta futura de prompt → intenção dramática → bíblia visual → storyboard estruturado → capacidades/encenação → revisão → render nos quatro motores. Não implementar interface nem serviço de geração.
