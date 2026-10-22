# Personagem ilustrado em camadas — aquarela

22/10/2026. Incremento restrito à aquarela 2D. **Qualidade artística profissional pendente:** o piloto usa uma fixture original simples, sem imagens profissionais, modelo gerador ou referência externa incorporada. A infraestrutura não transforma um conceito achatado em um personagem preparado.

**Etapa técnica concluída e validada no hardware disponível. Limite de software:** as camadas PNG isoladas passaram em comparação exata no SwiftShader; a cena pintada completa não passou em igualdade de pixels. Essa variação também foi reproduzida no projeto legado `visit`, sem assets PNG. Os vídeos de software são provas de execução/inspeção, não uma aprovação de determinismo estrito da pintura nesse backend.

## Preservação

Estado anterior: `main`, dois commits à frente de origin, com alterações rastreadas e muitos arquivos novos da entrega 3D. Nenhum reset, stash, limpeza ou commit em massa foi feito.

Checkpoint recuperável: `checkpoints/watercolor-before-20261022-090502/`. `workspace.zip` guarda 151 arquivos de trabalho, incluindo alterações não commitadas, packs, fontes e documentação; `tracked.patch` é um diff binário contra HEAD; `status.txt` registra o estado Git. Não contém node_modules, `.git`, `out` ou o ZIP grande preexistente. `artifacts.json` registra tamanho/hash de 1.668 arquivos anteriores de assets/saídas. `prior-evidence.zip` é uma cópia auxiliar das evidências que scripts históricos podem sobrescrever; não duplica os MP4s. Os MP4s permanecem no lugar, conferidos por hash no fechamento.

Para recuperar: extrair `workspace.zip` em **outro diretório**, instalar/reusar as dependências fixadas no lockfile e comparar com o workspace atual. O patch complementa o ZIP; não o aplique cegamente sobre alterações posteriores. O checkpoint é ignorado pelo Git para impedir inclusão acidental de saídas grandes.

Referência antes das alterações: `npm test` 22/22 e `npm run test:visual` passaram, incluindo os stills históricos da demo nos tempos 0,5 e 5,7 s. A nova suite mantém essa comparação real.

## Contrato implementado

O estilo continua `watercolor`; o desenho procedural original permanece padrão. Projetos ilustrados fixam `assetRefs` por ID, versão e SHA-256 do manifesto. O perfil de pack é `layered-2d`, separado dos perfis `static` e `articulated` do catálogo.

O manifesto existente recebe:

```js
profile: 'layered-2d',
identity: {
  name: '...', modelVersion: '1.0.0', paletteVersion: '1.0.0',
  proportionsVersion: '1.0.0', palette: ['#DCA17D', '#659B96']
},
available: { views: ['front'], poses: ['greeting'], expressions: ['neutral', 'smile'] },
actor: {
  schemaVersion: 1, size: [500, 500], composition: 'scene-order-paper-grain',
  views: { front: { poses: { greeting: { parts: [
    // Exemplo abreviado; rig completo no pack.
    { id: 'torso', parent: null, image: 'torso.png',
      pivot: [120, 280], offset: [0, 0], z: 5, rotation: [-0.05, 0.05] }
  ] } } } }
}
```

Coordenadas em pixels da arte; Y para baixo, rotações em radianos. `pivot` é a origem na imagem da própria parte; `offset` posiciona essa origem no espaço local do pivô do pai. A transformação herda translação/rotação/escala dos ancestrais. `z` ordena desenho independentemente do parentesco; empates usam ID. Uma única raiz, sem ciclos. `anchors` opcionais documentam pontos locais, como olhos/pescoço. `variants` troca o PNG da mesma parte por expressão, com dimensões idênticas; não cria uma segunda face por crossfade.

`item.draw(x, y, escala, {view, pose, expression, transforms})` desenha na transformação/câmera p5 corrente. Overrides locais aceitam rotação dentro da faixa declarada, escala 0,9–1,1 e deslocamentos até 10 pixels. Cada amostra recompõe as matrizes a partir dos dados e do tempo absoluto. Não existe física acumulada, relógio autônomo, IK, deformação de malha ou reconstrução de membros escondidos. Vistas/poses/expressões ausentes e partes inventadas falham explicitamente; não são espelhadas nem adivinhadas.

## Catálogo, preparo e memória

Importação continua manual: `node scripts/import-assets.mjs caminho/local/manifest.json`. A inbox é privada e a versão publicada é imutável. Os PNGs de produção entram em `files`; fontes, folhas originais, prompts e condições ficam em `evidence`, fora das rotas HTTP. Cada derivado registra fonte/hash, ferramenta, operação, parâmetros e responsável em `derivations`.

Origens `original`, `generated`, `licensed` e `cc0` continuam admitidas. Para geração externa, registrar provedor, modelo/versão informados, prompt integral, parâmetros, seed/jobId e referências com direitos/evidências; desconhecidos devem ser explícitos. A licença/condição comercial precisa de evidência e revisão registrada. O teste de metadados de geração usa valores fictícios declarados; **nenhuma imagem do piloto foi gerada por Nano Banana ou por outro modelo**. Nenhuma API paga ou interface externa foi integrada.

Para este perfil: somente PNG RGBA8 não entrelaçado. A admissão verifica assinatura, dimensões, chunks/CRC, zlib limitado, filtros e pixels decodificados. Cada parte deve conter pixels totalmente transparentes e pixels visíveis: canal alpha opaco, imagem vazia e JPEG não servem. Isso não determina se alguém pintou um quadriculado dentro da área visível; ainda exige revisão artística. Variantes faciais devem ter canvas/pivô alinhados. Hash/tamanho são reconferidos no servidor e na sessão.

Limites existentes mantidos: 16 MiB por arquivo, 32 MiB por pack/sessão, 64 arquivos por pack e 2048 pixels por dimensão. Novo rig: até 8 vistas, 16 poses por vista, 32 partes por pose. O orçamento de camadas soma RGBA de Canvas + textura GPU (8 bytes/pixel), com teto agregado de 64 MiB. É estimativa de recursos de imagem, não medição de RAM/VRAM total nem pico de decodificação.

Antes de `ready`: fetch/hash → `createImageBitmap` → validação alpha nativa → criação de `p5.Image` dentro do setup → fechamento dos bitmaps. Nenhuma imagem é carregada durante render. A reserva de inicialização impede que o auto-start do p5 em window.load dispute com o preparo assíncrono. Erros de setup/preparo rejeitam o init. Descarte idempotente remove texturas do cache real do p5, fecha bitmaps pendentes, zera canvases das partes e limpa a sessão; o motor também libera seus Graphics e a instância p5.

O piloto usa `output.height:720` ou `1080` congelado no projeto. A pintura interna continua em 1920×1080; a saída 720p é reduzida depois da composição. Portanto 720p não representa uma redução proporcional do custo de p5.brush. Os quatro motores e a CLI de resolução 3D preservam seus contratos.

## Piloto e comparação

[Storyboard](storyboards/watercolor-asset-actor.md). Quatro IDs novos: `watercolor-actor-{procedural,assets}-{720,1080}`. Duração de 2,5 s; primeiro 720p/12 FPS, depois 1080p/24 FPS. Respiração, piscada, cabeça suave, gesto de mão, neutro→sorriso durante a piscada e atraso analítico do cabelo. Vista frontal e pose greeting apenas. Não há corpo completo, caminhada, giro de vista ou fala.

A/B preservam geometria da fixture, matrizes, enquadramento, duração, cenário e câmera. A versão procedural pinta os contornos com `paint`/`inkLine`; a versão ilustrada usa PNGs preparados. Isso mede a substituição do desenho, sem alegar que uma fixture é uma ilustração profissional. O cenário é o jardim já existente, com papel, pinceladas, sombra, avanço de câmera e ramo em primeiro plano.

Antes de imagens, `flushBrush()` materializa a tinta pendente. Depois delas, pinceladas/props podem cobri-las; outra imagem pode vir por cima. Transforms/tint/blend são restaurados. O grain final existente continua sobre o conjunto. A prova de composição usa fundo escuro e ordem imagem → faixa de tinta → outra imagem, expondo bordas e sobreposição.

## Revisão visual e limites

Defeito encontrado na primeira versão: retângulo do pescoço por cima do queixo, deixando um quadrado aparente. Causas: ordem das formas e transparência interna que deixava a linha escondida transparecer. Correções em versões 1.0.1/1.0.2: pintar pescoço antes do rosto e manter interior opaco, preservando alpha nas bordas e fora das formas. As versões anteriores foram conservadas. `work/neck-corrected.jpg` e os recortes da revisão final foram abertos novamente; o quadrado sobre o queixo desapareceu.

As partes dos braços são volumes simples com linhas de junção visíveis; a silhueta move-se com três articulações, respiração e cabelo independentes, mas ainda conserva aparência segmentada. Não se declara eliminada a impressão de recorte rígido com arte profissional. Essa avaliação permanece pendente com um pack profissional preparado. O cabelo tem mechas rígidas sobrepostas, sem deformação contínua. A troca de boca é discreta e encoberta pela piscada; não é interpolação de anatomia facial. Paleta, olhos, nariz, roupa e proporções permanecem os mesmos entre expressões.

Não foram usadas as referências como assets. Não se afirma equivalência ao desenho de `docs/imgs/aquarela_2d.png`; esta etapa comprova infraestrutura e movimento limitado. São necessários desenhos profissionais com coberturas de juntas, recortes limpos e vistas autorizadas para avaliar esse patamar.

## Código e escopo

Adicionados: `src/assets/layered.js`, `src/styles/watercolor/{bootstrap,assets}.js`, `src/scenes/watercolor-actor{,-fixture,-sample}.js`, `scripts/png-rgba.mjs`, preparação/QA/render/regressão da aquarela e `tests/watercolor-actor.test.mjs`, pack e storyboard.

Alterados sobre o checkpoint: catálogo e seu validador, configuração/projetos, adaptador/configuração da aquarela, `render.mjs` (transporte HTTP também para módulos de cena), `render-lib.mjs` (hash do decoder de admissão), `.gitignore` e documentação. Muitos arquivos já eram mudanças do usuário; o diff contra HEAD inclui trabalho anterior e não deve ser atribuído integralmente a esta etapa.

`src/core.js`, `clawd.js`, `sheets.js`, `motion.js`, `timeline.js`, motores cartoon/pixel/3D, personagens/versões 3D e dependências não foram reescritos. Não foram implementados SVG/cartoon, spritesheets/pixel, recursos 3D ou compilador JSON.

## Resultados finais

Revisão congelada: `70bc9346f90de301b9707b2baa48735c35826304a338fd82e3f8696182bc2981`. Pack final: [manifesto completo](../assets/packs/iara-watercolor-fixture/1.0.2/manifest.json), pin `57a2ad291b66fbcde8ff72e738b95a5118da6eb05b10a1eabba13b784d7f40cc`; assetHash `20f1cd281772fae9c89fc2be5bf1b3dcb492537dbec65a071c7da8885f447b94`. Os 12 PNGs ocupam 69.754 bytes comprimidos. Canvas + texturas das partes: orçamento estimado de 2.407.680 bytes (2,30 MiB); não inclui o motor/cenário, buffers do brush, heap ou memória interna do navegador.

25/25 testes unitários passaram. [Dez etapas de regressão](../out/watercolor-actor/revisions/70bc9346f90d/regressions/report.json) passaram: unitários, visual dos três motores 2D e demo histórica, integração HTTP/arquivo, Three em hardware/software, 36 PNGs de Marte, Oceano em hardware/software e assets 3D em hardware/software. O teste completo do [ator 3D preservado](../out/articulated/revisions/70bc9346f90d/qa/hardware/report.json) também passou: 192 quadros ascendentes/descendentes/embaralhados, workers, preview/final, apoios, skeletons independentes, skinning/morphs e descarte.

[QA aquarela 720p](../out/watercolor-actor/revisions/70bc9346f90d/qa-720/hardware/report.json): 30 tempos por variante, duas permutações completas e quatro amostras em segunda página. [QA 1080p](../out/watercolor-actor/revisions/70bc9346f90d/qa-1080/hardware/report.json): 60 tempos por variante, mesmas permutações/segunda página, mais extremos **individuais** de rotação declarados, composição e três ciclos de substituição da sessão. As comparações são dentro do mesmo backend. Metadado do harness 720p corrigido: duas páginas (`workers:2`) e quatro tempos comparados na segunda (`workerSamples:4`); a execução dos testes não mudou.

[Preservação final](../out/watercolor-actor/revisions/70bc9346f90d/preservation/report.json): os 92 MP4s anteriores e 1.666 arquivos inventariados permanecem byte a byte iguais após restaurar as evidências que os testes históricos escrevem em caminhos fixos. As duas exceções intencionais do inventário são o catálogo (apenas novas entradas) e suas instruções `assets/AGENTS.md`. Todos os pins anteriores permanecem intactos. Contra o ZIP de 151 arquivos, 137 permanecem iguais e as 14 alterações existentes correspondem ao escopo autorizado; motor/atores 3D, cartoon/pixel e arte/matemática/timeline originais estão entre os preservados.

Interseção mínima de alpha ≥128 entre cada peça articulada e seu pai, em coordenadas nativas do pack e nos tempos/extremos amostrados: ombro direito 223 pixels, esquerdo 919, cotovelos 377/379, mãos 745/742 e pescoço 2.667. Limite do teste: 12 pixels. Não mede toda a cobertura de uma junta para todas as combinações possíveis de transformações; a inspeção dos recortes complementa o teste. Não houve buraco observado nas juntas desses recortes.

Na primeira sessão, todas as quatro faces são usadas e 12 texturas são liberadas. Em sessões seguintes com uma expressão, nove texturas efetivamente usadas são liberadas; as 12 imagens preparadas e seus canvases são descartados em todos os ciclos. Zero bitmaps remanescentes, zero imagens preparadas na sessão descartada. O orçamento exibido na sessão é histórico da carga; `item.info().estimatedResidentBytes` chega a zero. Não foi medido pico de RAM/VRAM, nem se declara que contadores de heap comprovam liberação imediata pelo sistema operacional.

[Falhas e prévia](../out/watercolor-actor/revisions/70bc9346f90d/lifecycle-hardware/report.json): arquivo final corrompido fecha os nove bitmaps já abertos; cancelamento fecha o primeiro bitmap; orçamento excedido rejeita antes de decodificar. Prévia reproduz/pausa e troca para o projeto procedural legado sem sessão de assets. A barreira de prontidão foi testada atrasando o PNG do tronco: `ready:false` e nenhum canvas p5 criado durante a espera. Falha HTTP também rejeita sem fallback.

[Teste específico em SwiftShader](../out/watercolor-actor/revisions/70bc9346f90d/qa-software-sample/report.json): quatro tempos (0; 0,5; 0,75; 1,75 s), ordem inversa/embaralhada e duas amostras em segunda página, total de 14 renders. O componente **isolado** (PNGs, câmera, papel/grain estáticos) passou em igualdade exata de PNG, sem tolerância, e liberou suas 11 texturas usadas/12 bitmaps preparados. A cena completa com pinceladas **falhou** nesse requisito. Uma comparação retida apresenta sete pixels diferentes na flor, máximo de dois níveis por canal, fora do personagem; [análise](../out/watercolor-actor/revisions/70bc9346f90d/qa-software-sample/mismatch-analysis.json). Outros ensaios também acusaram diferenças ao repetir o início, inclusive em retângulos que contêm fundo/sombra pintados; recortar ao redor do personagem não garante isolar apenas os PNGs.

[Controle sem PNGs](../out/watercolor-actor/revisions/70bc9346f90d/software-baseline/report.json): `visit` em 2,5 s e o piloto procedural em 1,75 s também produziram hashes diferentes ao repetir o mesmo tempo no SwiftShader. Isso localiza a limitação observada no caminho pintado, mas não identifica causalmente um defeito específico dentro de p5.brush/driver. Não se modificou a pintura original nem se substituiu a comparação global por tolerância para anunciar aprovação. O hardware disponível passou nas permutações completas; recomenda-se esse backend para a entrega validada. Não há promessa de igualdade entre GPUs.

Inspeção efetiva e limites estão no [registro de validação](VALIDATION.md). O aceite desta etapa é técnico com fixture original; a aceitação artística profissional continua pendente.

### Vídeos e evidências

| Saída | Procedural | PNG em camadas |
|---|---|---|
| **1080p/24 · hardware · 60 quadros** | [MP4](../out/watercolor-actor/revisions/70bc9346f90d/1080p/hardware/procedural/video.mp4) | [MP4](../out/watercolor-actor/revisions/70bc9346f90d/1080p/hardware/assets/video.mp4) |
| 720p/12 · hardware · 30 quadros | [MP4](../out/watercolor-actor/revisions/70bc9346f90d/720p/hardware/procedural/video.mp4) | [MP4](../out/watercolor-actor/revisions/70bc9346f90d/720p/hardware/assets/video.mp4) |
| 720p/12 · SwiftShader · 30 quadros | [MP4](../out/watercolor-actor/revisions/70bc9346f90d/720p/swiftshader/procedural/video.mp4) | [MP4](../out/watercolor-actor/revisions/70bc9346f90d/720p/swiftshader/assets/video.mp4) |

Todos têm 2,5 s, H.264/yuv420p, sem áudio. Cada diretório `.review` contém tamanho, SHA-256, codec, resolução, duração, fps, quadros, sourceHash, assetHash, ambiente, tempos, folha decodificada e três detalhes nativos. Não foi produzido vídeo 1080p por software nesta etapa; o avanço a 1080p/24 e suas permutações completas foi validado no hardware disponível.

Comparações extraídas dos MP4s, procedural nas duas linhas superiores e PNG nas duas inferiores: [rosto 1080p](../out/watercolor-actor/revisions/70bc9346f90d/1080p/comparison/hardware-face-ab.png), [gesto/juntas](../out/watercolor-actor/revisions/70bc9346f90d/1080p/comparison/hardware-gesture-ab.png), [respiração](../out/watercolor-actor/revisions/70bc9346f90d/1080p/comparison/hardware-breath-ab.png) e [cabelo/cabeça](../out/watercolor-actor/revisions/70bc9346f90d/1080p/comparison/hardware-hair-ab.png). Células pretas são padding da grade, não frames vazios. [Storyboard final](../out/watercolor-actor/revisions/70bc9346f90d/qa-1080/hardware/assets-storyboard.jpg), [composição/alpha](../out/watercolor-actor/revisions/70bc9346f90d/qa-1080/hardware/alpha-composition.png) e [prévia](../out/watercolor-actor/revisions/70bc9346f90d/lifecycle-hardware/preview.png).

### Custo observado

Ryzen 5 3600 (6 cores), aproximadamente 16 GiB de RAM, Radeon R9 200 Series, driver 27.20.1034.6; Windows 10 Pro 10.0.19045, Node 24.15.0. Hardware usa ANGLE/D3D11; software usa SwiftShader/Subzero/Vulkan 1.3.0. Encoder libx264 em CPU, medium/CRF 18, yuv420p. Uma execução por combinação; não são medianas nem uma avaliação estatística.

| Saída/backend | Variante | Inicialização | Captura | Verificação | Total externo |
|---|---|---:|---:|---:|---:|
| 1080p/24 hardware | Procedural | 3,122 s | 26,956 s | 1,991 s | 33,406 s |
| 1080p/24 hardware | PNG | 3,128 s | 26,307 s | 2,011 s | 33,055 s |
| 720p/12 hardware | Procedural | 3,965 s | 16,874 s | 1,207 s | 24,053 s |
| 720p/12 hardware | PNG | 3,511 s | 16,567 s | 1,338 s | 24,264 s |
| 720p/12 software | Procedural | 10,463 s | 221,494 s | 1,091 s | 234,025 s |
| 720p/12 software | PNG | 10,497 s | 193,845 s | 1,038 s | 206,605 s |

1080p final foi medido com um job de render por vez e sem os testes concorrentes desta tarefa. As prévias 720p coincidiram parcialmente com QA/regressões; seus tempos descrevem essa carga e não sustentam atribuição causal de ganho de desempenho ao perfil. A captura inclui renderização e serialização/cópia PNG, não apenas tempo GPU. O encode em pipeline (27,835/27,085 s em 1080p) sobrepõe captura e espera por frames; não deve ser somado como tempo exclusivo de CPU. Não há medição isolada do encoder.

Heap JS amostrado no início da QA (sem medir pico): 22.295.514/22.401.852 bytes para procedural/PNG 720p e 22.295.966/22.389.300 bytes em 1080p. A proximidade não demonstra ausência de custo de imagem; canvases, GPU e buffers nativos não são integralmente representados nesse número. O cenário p5.brush domina o custo observado; o suporte a PNG por si não torna a aquarela apta a preview em tempo real.

[Fechamento verificável](../out/watercolor-actor/revisions/70bc9346f90d/completion.json) · [ledger visual com hashes das evidências abertas](../out/watercolor-actor/revisions/70bc9346f90d/visual-review.json) · [checkpoint recuperável](../checkpoints/watercolor-before-20261022-090502/workspace.zip). Os seis relatórios individuais foram marcados `performed-by-agent` somente depois da inspeção e do registro em `VALIDATION.md`. A etapa termina aqui: sem expansão para outros adaptadores e com qualidade artística profissional e determinismo global do SwiftShader explicitamente não aprovados.
