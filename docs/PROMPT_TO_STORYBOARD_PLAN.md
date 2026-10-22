# Próxima fase: descrição → storyboard → animação

Proposta somente. Esta etapa não implementa interface, API, modelo ou execução de prompts. O teste de generalização forneceu um catálogo pequeno e um caso real; isso não equivale a suportar qualquer objeto ou história.

## Fluxo proposto

1. **Brief narrativo:** descrição, público, duração, estilo, personagem, desejo, obstáculo, mudança e emoção final. Registrar detalhes que tornem a ideia particular. Se faltarem informações decisivas, perguntar; escolhas menores podem virar suposições explícitas.
2. **Tratamento revisável:** logline, 2–3 alternativas de ação e uma sequência causal selecionada. Exigir antecipação → ação → reação; descrever o que se vê, não apenas o sentimento.
3. **Bíblia visual congelada:** paleta com papéis, proporções/modelos, elenco com IDs estáveis, silhuetas, materiais/texturas, contornos, cenário e regras de luz. Cada projeto tem um estilo. Usar o mesmo asset e suas dimensões em todos os planos.
4. **Storyboard estruturado:** planos temporizados, leituras, blocking, câmera, foco, entradas/saídas, contatos, transições, continuidade e critérios de inspeção. Definir coordenadas no espaço do estilo escolhido, sem fingir que pixels e XYZ são intercambiáveis.
5. **Mapeamento para capacidades reais:** selecionar componentes existentes e indicar os que faltam. Se o catálogo não oferece o objeto/atuação exigido, implementar e validar esse componente separadamente. Não substituir silenciosamente toda ideia por Clawd, robô, pedra ou água-viva.
6. **Compilação controlada:** validar dados, resolver IDs permitidos e construir chamadas às fábricas e curvas temporais. Adaptadores por estilo, preservando `animationEngine`. Usar a timeline e `motion.js`; não acrescentar regras artísticas ao núcleo temporal.
7. **Prévia e correção:** storyboard primeiro; depois tiras de ações, recortes de contatos/expressões e vídeo curto. Validar 720p no 3D e a resolução nativa dos motores 2D. O render final só sucede à revisão das ações decisivas.
8. **Entrega rastreável:** código/configuração congelados, hash dos inputs, manifesto, verificação MP4, quadros decodificados e revisão humana registrada. Correção visual altera o projeto/componente e gera nova revisão; não mistura cache.

## Dados mínimos, antes de criar uma DSL

Usar inicialmente JSON validado com campos conhecidos. Aproveitar o formato atual `registerProject/storyboard/reads`; manter uma seção complementar para assets e poses, sem criar um segundo runtime.

```json
{
  "id": "historia-exemplo", "style": "lowpoly-3d", "duration": 8,
  "premise": {"desire": "...", "obstacle": "...", "change": "..."},
  "visualBible": {"paletteId": "...", "cast": [{"id": "lume", "component": "submarine", "modelVersion": 1}]},
  "shots": [{
    "id": "encounter", "start": 3, "end": 5.4,
    "event": "A luz sobe; o veículo freia e recua",
    "focus": "creature", "camera": {"projection": "perspective", "intent": "revelar que o farol está vivo"},
    "actions": [{"actor": "lume", "verb": "recoil", "trigger": "creature.rise", "start": 3.8, "end": 4.7}],
    "continuity": {"screenDirection": "left-to-right", "preserveWorldPose": true},
    "checks": ["silhuetas separadas", "recuo legível", "sem interseção"]
  }]
}
```

Esse exemplo é um alvo de projeto, não um formato já executável. Curvas e ações exigirão parâmetros próprios por componente. Proibir código livre, `eval`, caminhos arbitrários, imports vindos do prompt, URLs externas e funções embutidas. Validar duração, intervalos, referências, valores finitos, escala, orçamento, compatibilidade e cobertura de todas as leituras antes de renderizar. Uma lista de verbos restrita só pode anunciar ações realmente implementadas.

## Adaptadores dos quatro estilos

| Estilo | Reusar | Tratar explicitamente |
|---|---|---|
| Aquarela | Motor original, poses/Clawd, pincéis e folhas | Recortes de tinta, custo de pintura, contorno delicado, contatos; manter snapshots originais. |
| Cartoon | Canvas2D, modelo vetorial e expressões | Silhueta, espessura de linha, curvas e leitura de olhos/boca. |
| Pixel | Grade 320×180, paleta e captura sem suavização | Snap de coordenadas, poses legíveis em poucos pixels, sem movimentos subpixel de detalhe. |
| Low poly | Catálogo, câmera/luzes existentes, poses XYZ | Proporções 3D, oclusão, direção de tela, profundidade e limites de meshes; WebGL2 obrigatório. |

Compartilhar intenção narrativa, ritmo, IDs e critérios de qualidade. Cada estilo resolve desenho e atuação conforme suas capacidades. Os atores 3D não são assets automaticamente válidos nos três estilos 2D. O catálogo 2D precisa crescer conforme uma produção concreta exigir novos personagens; a adaptação do submarino para esses estilos não foi feita nesta etapa.

## Como evitar cenas genéricas

- Exigir um detalhe de mundo que afete a ação e uma reação com consequência; remover planos que apenas decoram o tema.
- Derivar câmera e duração da descoberta, do contato ou da mudança emocional. Não usar sempre aproximação + surpresa + aceno.
- Comparar alternativas de blocking antes de programar. O mesmo catálogo pode ter encenação, trajetória e ritmo diferentes.
- Validar identidade por projeto, não impor uma única estética a todas as histórias: cores/modelo estáveis dentro do filme, bíblias distintas entre filmes.
- Registrar direção de tela, linhas de olhar, poses nos cortes, posições relativas, contatos e limites de oclusão. Usar recortes móveis dos atores; o primeiro recorte fixo desta experiência cortava o submarino em deslocamento.
- Inspecionar ações no FPS real: a hélice pode sofrer aliasing e uma reação curta pode desaparecer em 12 FPS. Qualidade não se reduz a ausência de erros de código.

## Implementação sugerida em incrementos

Primeiro um validador de storyboard JSON e uma biblioteca limitada de ações temporais com exemplos de aceitação nos quatro estilos. Em seguida um comando local que transforma um brief revisado em proposta de storyboard, ainda sem gerar código livre. Depois o adaptador de um caso narrativo por estilo, com checkpoints e correção humana. Só após resultados variados, discutir interface e eventual provedor opcional; nenhuma API paga é requisito desta proposta.

Critério de sucesso: pelo menos duas novas narrativas com soluções visuais diferentes por estilo, preservação das bíblias e do contrato, renders reproduzíveis fora de ordem, evidências visuais dos momentos decisivos e nenhuma alteração do backend para acomodar a história. Os filmes desta etapa comprovam esse caminho para o backend 3D, com o alcance limitado do catálogo atual.
