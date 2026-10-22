# Diagnóstico e próximos passos — 22/10/2026

O próximo incremento recomendado é **animar corporalmente a menina ilustrada, com câmera fixa, aproveitando o sistema de camadas existente**. A base técnica já permite articulação 2D e 3D. O gargalo imediato é preparar arte compatível com movimento e demonstrar qualidade artística. O objetivo maior, produzir vídeos para um canal, ainda exige roteiro editorial, áudio, montagem e operação de publicação.

## Escopo e evidência desta análise

Foram inventariados código, scripts, testes, documentação, projetos e packs; examinados os caminhos centrais de registro → carga → pose → desenho → captura → verificação; extraído o PDF de 160 páginas e confrontadas suas decisões, especialmente a correção final das páginas 158–160, com o estado atual. Inspeção estática direcionada do Eidoverse local em `C:\Projetos\yt\eidoverse-video-main`, incluindo instruções, documentação, configuração e caminhos de atualização de personagens/renderização. Não foi executado o Eidoverse.

Esta é uma revisão de arquitetura, capacidades e prioridades. Não é auditoria exaustiva de cada linha, de todas as combinações possíveis ou de todos os vídeos históricos. Não foram revalidadas as alegações sobre serviços externos, monetização ou quotas presentes no PDF.

Verificações novas:

- `rtk npm test`: **26/26 passaram**.
- `rtk npm run test:visual`: **passou**, incluindo três estilos 2D, determinismo, segunda página, contato, grade/paleta, demo histórica e controles da prévia. Os sete arquivos históricos que esse script sobrescreve foram preservados e restaurados; a cópia da execução está em `tmp/repository-review-20261022/`.
- `node --check`: **100 arquivos** de src/scripts/tests e renderizador sem erro sintático.
- Catálogo carregado e validado: **4 estilos, 15 IDs de projeto e 8 entradas versionadas de assets**. Entradas não equivalem a oito personagens diferentes: incluem versões da fixture e recursos de teste.
- Os **59 arquivos** em `sourceFiles` do relatório final da menina coincidem com o disco. `sourceHash` atual: `ae28d4f0c361e12098a4e3b705ecd8bfbd8397fda7ab0c6df2e0915b3b0e416b`.
- MP4 da menina: hash coincide; FFprobe confirmou H.264, 1280×720, 12 FPS, 4,5 s, 54 quadros. Nova decodificação integral por FFmpeg terminou com código zero. Sem áudio.
- Abertos: folha decodificada e detalhe da expressão da menina, folha de contato das seis fontes, comparativo de gesto da fixture Iara e página 159 renderizada do PDF.

Não houve mudança de código de produção, instalação, preparação de novas imagens ou renderização de novo filme. Testes em navegador geraram apenas evidências. O aviso `MODULE_TYPELESS_PACKAGE_JSON` é manutenção secundária; não impediu os testes. A árvore Git já tinha muitas alterações e arquivos novos e foi preservada.

## O que está implementado

| Área | Estado confirmado | Limite relevante |
|---|---|---|
| Registro/configuração | Projeto imutável, estilo único, storyboard com intervalos e leituras | Cenas ainda escritas em JavaScript |
| Aquarela | Motor original e adaptador PNG | Qualidade da atuação depende do pack preparado |
| Cartoon | Desenho Canvas2D e atuação procedural | Sem adaptador de personagens SVG/raster preparados |
| Pixel | Buffer de baixa resolução, paleta e ampliação sem suavização | Sem importador de atlas/tiles animados |
| 3D | Three.js/WebGL2, GLB estático, materiais, clips, esqueletos e morphs | Catálogo limitado; não é sistema universal de atuação/IK |
| Camadas 2D | Hierarquia, pivôs, ordenação, limites, variantes e transforms absolutos | Sem geração de partes ocultas ou deformação por malha |
| Assets | Pins por versão/hash, admissão, limites, preparo e descarte | Metadados não comprovam qualidade artística |
| Renderização | Captura, workers, retomada, manifestos e verificação de MP4 | Um resultado técnico válido pode ter atuação insuficiente |
| Áudio | Mux de arquivo fornecido via `--audio`/projeto | Sem pipeline de narração, mix editorial, legendas ou sincronização labial |
| Automação | Agente escreve projetos e cenas; estúdio revisa | Compilador JSON, geração autônoma e publicação não implementados |

Referências de implementação: `src/platform.js`, `src/runtime.js`, `src/assets/{session,layered,articulated}.js`, adaptadores em `src/styles/`, `scripts/asset-catalog.mjs`, `render.mjs` e `scripts/render-lib.mjs`.

## Por que a menina não se move

`src/scenes/personagem-surpresa.js` desenha uma composição inteira em cada plano. As variações temporais estão em `camBegin`; a troca `calm` → `surprised` substitui a ilustração completa. Não há transforms independentes de cabeça ou braço.

O pack `menina-aquarela@1.0.1` usa `illustration-2d`. Em `src/assets/layered.js`, esse perfil exige uma única camada e faixa de rotação zero. Renomear o perfil ou adicionar movimento global não prepara uma personagem articulada.

Em contrapartida, `src/scenes/watercolor-actor.js` já movimenta torso, cabeça, braços, mãos e cabelo individualmente com `layered-2d`. A comparação visual de Iara confirma mudanças relativas entre as peças, mas mostra formas simples e juntas segmentadas. É prova técnica, não o acabamento ilustrado desejado.

As seis fontes da menina são JPEGs opacos. A folha de contato mostra vestido isolado, duas mangas com mãos, cabeça neutra com gola/cabelo, busto surpreso e corpo inteiro. O rosto neutro e o surpreso têm diferenças de desenho/enquadramento; o vestido não contém toda a anatomia escondida. Essas imagens são candidatas a preparação, não peças prontas para encaixe automático.

O piloto anterior seguiu a alternativa de ilustração com câmera permitida pelo prompt reproduzido nas páginas 151–155. A observação posterior do usuário altera o critério de sucesso: **movimento relativo entre partes com a câmera parada**. Polir zooms e papel lateral não atende mais à prioridade principal.

## Próxima entrega: prova artística de atuação

**Escopo proposto:** novo projeto `menina-gesto`, aquarela, plano médio contínuo, 3 segundos, 720p/12 FPS, câmera fixa e sem áudio. Preservar o projeto anterior como controle. O ID é proposta, ainda não registrado.

1. Fixar uma imagem mestre de identidade. Comparar peças em escala equivalente e preparar uma montagem estática antes de animar. Começar pelo busto e um braço; pernas, caminhada e viradas não são necessárias para essa prova.
2. Preparar PNGs RGBA com máscaras revisadas, bordas claras preservadas, sobreposição no pescoço/ombro e regiões ocultas suficientes para a amplitude escolhida. Não eliminar pixels apenas por serem brancos. Primeiro demonstrar uma junta bem feita.
3. Usar o braço como peça única em um gesto curto se isso preservar a manga. Separar cotovelo/pulso somente se houver desenho suficiente para dobrá-los sem costura evidente. Cabeça pode inicialmente levar o cabelo junto; movimento independente de cabelo é uma etapa posterior.
4. Reutilizar `layeredPose` e o adaptador de aquarela. Criar um pack imutável e uma cena própria; não construir outro motor, editor de rigs ou sistema físico.
5. Se máscara, encaixe ou cobertura falharem, registrar exatamente qual peça precisa ser redesenhada/completada e qual amplitude ela deve suportar. A análise atual não demonstra que todas as peças podem ser recuperadas só por recorte. Geração/retoque adicional é uma decisão de produção separada.

Storyboard sugerido:

| Tempo | Ação visível | Leitura |
|---|---|---|
| 0–0,5 s | Pose inicial, respiração discreta | Identidade e referência imóvel |
| 0,5–1,2 s | Cabeça inclina em relação ao tronco | Atenção |
| 1,2–2,2 s | Braço levanta em relação ao ombro | Gesto corporal perceptível |
| 2,2–3 s | Gesto acomoda e sustenta | Peso e conclusão |

Critérios de aprovação: gesto legível sem zoom/corte; articulações sem buracos e duplicação; nenhum papel residual acompanhando o braço; rosto/roupa preservados; ausência de saltos ou halos nos extremos; todos os 36 quadros do MP4 inspecionados em tiras e recortes; testes de tempo fora de ordem/segunda página e regressões pertinentes; MP4 decodificado e revisão registrada. Só depois avançar a 1080p/24 FPS e expressões adicionais.

### Condição concreta de admissão

`scripts/asset-catalog.mjs` só admite a exceção de origem/direitos desconhecidos para `illustration-2d` com uso `local-pilot`. `layered-2d` exige os metadados/evidências previstos no catálogo. A licença da menina está registrada como desconhecida, sem comprovação comercial.

Para o pack articulado, recuperar os dados reais de geração/condições quando disponíveis; caso o objetivo permaneça experimento local com informações incompletas, definir explicitamente uma extensão restrita da política de admissão. Não marcar `commercial:true` para fazer o teste passar, nem enfraquecer a validação global. Isso é uma questão do contrato atual do software, não uma conclusão jurídica sobre as imagens.

## O papel do Eidoverse

O Eidoverse local oferece repertório maior de ferramentas 3D, personagens VRM, locomoção, áudio e revisão. Seus arquivos consultados usam Deno/WebGPU e Three 0.184.0; este projeto usa Node/Chrome/WebGL2 e Three 0.186.1. O caminho de personagens consultado trabalha com modelos/esqueletos, não prepara automaticamente os JPEGs da menina para cutout.

Há diferença temporal concreta: em `eidoverse/render_scene.mjs`, mixers e VRMs avançam por `update(dt)`; `character_controller.js` chama `world.step()`. Aqui, `createAnimatedActor.apply(t)` restaura poses/ações/morphs e amostra tempos atribuídos com `update(0)`. Copiar um controlador incremental não preservaria automaticamente o requisito de quadros fora de ordem.

Recomendação: manter a arquitetura atual e consultar o Eidoverse para diagnósticos de contato/enquadramento, vocabulário de atuação e organização do áudio quando essas tarefas chegarem. Nenhuma execução local comprovou seu desempenho nesta máquina. O arquivo LICENSE local identifica AGPLv3; nesta revisão não foi copiado código nem feita análise jurídica de incorporação.

A auditoria antiga `EIDOVERSE_TECHNICAL_REVIEW.md` é histórica: sua prioridade de GLB articulado já foi implementada. Suas afirmações de ausência de skins/clips/importador 2D não descrevem o estado atual. O mesmo cuidado vale para trechos antigos de `ARCHITECTURE.md` e `ART_ASSETS_PLAN.md`.

## Sequência depois da prova corporal

| Ordem | Entrega | Critério para avançar |
|---|---|---|
| 1 | Menina articulada, câmera fixa | Qualidade artística e movimento aprovados |
| 2 | Segunda micro-história com o mesmo pack | Outra intenção/ação, sem mexer no motor |
| 3 | Piloto editorial de 30–60 s | Público/tema definidos, roteiro original, narração e som, começo/meio/fim |
| 4 | Pequena biblioteca de ações e dados | Automatizar apenas ações já demonstradas em produções distintas |
| 5 | Produção repetível | Medir tempo de preparo, correções e render; manter identidade e qualidade |
| 6 | Publicação e acompanhamento | Pacote editorial pronto, revisão e operação do canal definidas |

Não há evidência no repositório de que o canal já esteja criado, de qual nicho final foi escolhido ou de audiência validada. A menina é um teste visual; não determina por si o público do canal. Essas decisões devem orientar o primeiro piloto editorial antes de ampliar o elenco.

Para o áudio, reaproveitar primeiro o mux existente com narração fornecida e timing definido pelo áudio. Quando essa fase começar, acrescentar hash dos inputs sonoros e verificar também o stream de áudio: hoje a checagem principal conta/decodifica vídeo e apenas registra a presença de áudio. Escolha de serviço de voz e suas condições precisam de avaliação própria na ocasião.

Manutenção útil, sem bloquear o piloto: consolidar uma matriz de capacidades atuais; separar instruções operacionais dos planos históricos; registrar um checkpoint revisável das alterações acumuladas; organizar o índice de entregas e caminhos de saída. Não apagar `out` ou mover arquivos como parte desta análise. Evitar abrir simultaneamente novas frentes de SVG, atlas, VRM, física, Remotion ou compilador universal.

**Decisão recomendada:** investir o próximo ciclo na ponte entre ilustração e movimento. O resultado precisa ser uma menina que atua com a câmera parada; o motor necessário para iniciar essa prova já existe.
