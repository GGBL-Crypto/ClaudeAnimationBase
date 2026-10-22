# Menina de vestido amarelo — piloto em aquarela

22/10/2026. **Base local reutilizável, com piloto renderizado, decodificado e inspecionado.** A atuação disponível é composição de ilustrações completas e câmera. Nenhuma imagem nova foi gerada por IA, nenhuma API/serviço externo foi usado e nenhuma dependência foi instalada.

## Entrega

- [MP4 final](../out/personagem-pilot/revisions/ae28d4f0c361/final/video.mp4): **876.284 bytes**, H.264, 1280×720, 12 FPS, 4,5 s, 54 quadros, sem áudio.
- [Quadros decodificados](../out/personagem-pilot/revisions/ae28d4f0c361/final/video.mp4.review/decoded-sheet.png), [expressão extraída](../out/personagem-pilot/revisions/ae28d4f0c361/final/video.mp4.review/decoded-expression.png), [storyboard](../out/personagem-pilot/revisions/ae28d4f0c361/storyboard.jpg).
- [Inventário completo](PERSONAGEM_INVENTORY.md), [folha de contato](../out/personagem-pilot/preparation-v2/contact-sheet.png), [storyboard narrativo](storyboards/personagem-surpresa.md).
- [Relatório técnico](../out/personagem-pilot/revisions/ae28d4f0c361/final/video.mp4.review/report.json), [QA](../out/personagem-pilot/revisions/ae28d4f0c361/qa.json), [regressões](../out/personagem-pilot/revisions/ae28d4f0c361/regressions/report.json), [preservação](../out/personagem-pilot/revisions/ae28d4f0c361/preservation.json), [ledger visual](../out/personagem-pilot/revisions/ae28d4f0c361/visual-review.json).

Raiz exata: `C:\Projetos\yt\ClaudeAnimationBase\out\personagem-pilot\revisions\ae28d4f0c361\`. O renderizador encontrado usa `--out` explícito e `out/<projeto>/<estilo>` por padrão, sem configuração de raiz externa. `out` é um diretório existente neste ambiente, sem junction/symlink detectado. Não foi movido ou substituído; nenhum vídeo histórico foi regenerado.

SourceHash: `ae28d4f0c361e12098a4e3b705ecd8bfbd8397fda7ab0c6df2e0915b3b0e416b`.
AssetHash: `bc98149451737b3a704d4973f7d551ccd55d3b9265f8abbc0ae9575342285dc1`.
SHA-256 do MP4: `f34f3a78f01389cb0640b271f535ad6ae580b66fd3b6708f769bc1d6efd722cc`.

## Fontes e estratégia

Todos os seis arquivos são JPEGs opacos, proporção 0,7467. Cinco têm 1792×2400; o vestido tem 896×1200. O inventário detalha nome/caminho, tamanho, hash, fundo e compatibilidade de cada imagem. Os JPEGs de 2400 pixels são fontes privadas; os derivados de produção têm 1920×1080, dentro do limite de texturas de 2048.

| Fonte, identificada pelo início do nome | Função e decisão |
|---|---|
| `Girl_character_illustration_refe…` | Corpo inteiro calmo, usado inteiro; referência de identidade |
| `Generating_surprised_character_h…` | Busto surpreso, usado inteiro em plano separado |
| `Create_character_head_watercolor…` | Cabeça neutra/gola, somente inventário; proporções não justificam substituição facial |
| `Generate_character_left_arm…` | Manga/mão, sem articulação aprovada; escala e encaixe diferem do corpo |
| `Create_isolated_character_right_arm…` | Manga/mão, sem articulação aprovada; não há corpo oculto preparado |
| `6f6faed5-0438-4515-aba2-60896f9960c8.jpg` | Vestido sem membros; referência, não torso completo |

**A — ilustração com câmera:** preserva arte, mas permanece calma e não resolve a surpresa. **B — partes articuladas:** descartada por fundos opacos, geometria diferente e ausência de corpo sob as peças; não houve máscara por branco, reconstrução escondida ou rig artificial. **C — ilustrações/expressões:** escolhida; o busto surpreso é um plano completo, sem colagem de rosto. [Amostra A](../out/personagem-pilot/revisions/ae28d4f0c361/samples/camera/video.mp4) e [amostra C](../out/personagem-pilot/revisions/ae28d4f0c361/samples/surpresa/video.mp4): mesmo intervalo 2,25–3,75 s, 720p/12 FPS, 18 quadros, decodificados e folhas abertas. B foi reprovada nas fontes; não foi renderizado um rig sem sustentação artística.

Papel e personagem ficam juntos. Para preencher 16:9, apenas faixas laterais de 96 pixels de papel vazio são refletidas na proporção original. Corpo: altura 1080, topo 0, centro X 810. Busto: altura 1540, topo −100, centro X 810; sua borda inferior fica fora do plano. Sem máscara, recoloração ou desenho geométrico substituto. `texture.paper:false` e `grain:false` são overrides deste projeto para evitar textura duplicada sobre o papel da imagem; padrões procedurais permanecem.

## Asset reutilizável

Pack ativo: `assets/packs/menina-aquarela/1.0.1/`. Pin do manifesto: `c8a5471b9260d22aa2f6d128d043c7bb595a5975390e4e6667afe05ccdd803d2`.

O perfil restrito `illustration-2d` reutiliza catálogo, importador, pins, rotas, sessão, `validateLayered`, `layeredPose`, adaptador p5, câmera e captura. Uma camada raiz opaca e variantes da composição inteira; nenhuma junta. O decoder PNG conserva transparência obrigatória por padrão. Este perfil pede decode RGBA8 completo sem exigir alpha útil e verifica opacidade integral. Não há um segundo sistema de assets ou rigging.

Manifesto: identidade/paleta/proporções versionadas, fontes/hashes/funções, dimensões, pivô `[960,540]`, offsets, expressões `calm`/`surprised` e limitações. `calm.png`: 3.327.534 bytes; `surprised.png`: 4.057.084; Canvas RGBA + texturas estimados: 33.177.600 bytes. `source-records.json` registra os seis originais por caminho/hash, sem duplicá-los. Apenas os dois PNGs são servidos; evidências ficam privadas. Os bytes dos originais foram reconferidos ao finalizar.

Origem: **fornecidas pelo usuário, geradas previamente por IA**. Provedor, modelo, prompt, parâmetros, seed, job, referências de geração e licença não foram fornecidos. `references:[]` lista apenas referências entregues; não comprova ausência na geração. `commercial:null`, `status:'unverified'`, `usage.scope:'local-pilot'` e `publication:'unverified'` são explícitos. A solicitação autoriza este piloto local, sem comprovar direitos comerciais. Essa exceção de admissão não se estende aos perfis 3D/transparentes.

1.0.0 desta tarefa contém preparação rejeitada com fragmentos de cabelo nas margens; seus arquivos foram preservados, mas a entrada saiu do índice. 1.0.1 é imutável; seu estado interno `prepared-awaiting-visual-review` corresponde à admissão anterior ao render. A validação posterior está no ledger e em `docs/VALIDATION.md`, sem reescrever o manifesto.

## Reutilização e reprodução

Crie outro projeto/ID em `src/config.js`, fixe o mesmo `assetRefs`, declare aquarela e copie os overrides de textura deste piloto. Registre o novo storyboard e use uma cena IIFE:

```js
const menina = assetSession.items.get('menina-aquarela');
camBegin(960, 540, 1.02);
menina.draw(960, 540, 1, {
  view: 'illustration', pose: 'plate', expression: 'surprised'
});
camEnd();
```

`calm` usa o corpo inteiro. As variantes trocam a composição completa em cortes; o papel oculta objetos desenhados atrás. Outro cenário com a menina isolada exige preparação artística adicional. Confira cobertura da composição ao mover a câmera.

No workspace atual, o pack já está admitido: **não reimporte a mesma versão**. `rtk node scripts/prepare-personagem.mjs` refaz somente a preparação/inventário. `--admit` é para uma cópia sem esse pack e recusa sobrescrever versão existente. Não reconstrói provas de licença ausentes.

```powershell
rtk npm test
rtk node scripts/check-personagem.mjs qa
rtk node scripts/check-personagem.mjs regressions
rtk node scripts/check-personagem.mjs preservation
```

O harness inclui `rtk npm run test:visual`, integração, 3D, Marte e lifecycle da aquarela. Guarda evidências novas por revisão e restaura evidências antigas de caminhos fixos. Para outra cópia do vídeo, escolha uma pasta nova:

```powershell
rtk node render.mjs --project=personagem-surpresa --clip --fps=12 --out=out/personagem-pilot/reproduction-01/video.mp4
rtk node render.mjs --project=personagem-surpresa --storyboard --out=out/personagem-pilot/reproduction-01/storyboard.jpg
```

`scripts/render-personagem.mjs samples`/`final` usam a pasta do sourceHash e recusam sobrescrita; já existem nesta revisão. `scripts/finish-personagem.mjs extract` extrai quadros/tiras do MP4 final. Depois de abrir evidências e documentar a revisão em `VALIDATION.md`, `record` grava evidências e hashes.

## Validação e limites

26/26 unitários; seis grupos de regressão aprovados na revisão final, `sourceStable:true`. QA: 54 quadros crescentes, repetidos em ordem inversa e embaralhada; oito tempos em outra página; retorno preview/final idêntico; dois bitmaps fechados e duas imagens/texturas liberadas; descarte repetido; cobertura da composição nos 54 quadros. Radeon R9 200/D3D11, Chrome 155, Node 24.15.0. Não se afirma igualdade entre GPUs ou tempos contínuos não amostrados.

FFprobe confirmou metadados/contagem e FFmpeg decodificou os três MP4s finais integralmente. Render final: cerca de 11,1 s neste ambiente, incluindo inicialização/verificação. Sem 1080p/24 FPS nesta etapa. Foram abertos quadros nativos 0/26/33/53 do MP4, folha, três detalhes, expressão e tiras dos cortes; também storyboard/tiras/recortes da cena. Avaliação por quadros estáticos, sem atribuir aprovação humana ou reprodução visual contínua do vídeo.

Defeitos corrigidos: papel esticado → reflexão na mesma proporção; cabelo repetido → faixa de papel de 256 para 96 pixels; frestas alpha subpixel → base opaca; faixa lisa acima do plano médio → centro vertical da câmera de 260 para 320. A revisão intermediária `d9519c8e33be`, com faixa lisa, permanece no disco e não é a entrega aprovada. Uma regressão intermediária mudou de sourceHash durante esse ajuste: foi invalidada e repetida integralmente com a revisão congelada. Um erro inicial de caminho de restauração também foi corrigido antes da conferência final por hash.

Nos quadros corrigidos não observei buracos, halos acrescentados, roupa/mãos deformadas, dupla face ou mudança de desenho dentro do plano. Cortes mudam escala/enquadramento deliberadamente. Permanecem pequenas diferenças de olhos/mandíbula entre desenhos, repetição do papel refletido em ampliação e suavidade do plano médio, que amplia a primeira composição. Não se afirma model sheet exato ou acabamento de animação quadro a quadro. A próxima melhoria útil é um plano médio preparado diretamente do JPEG original em nova versão, se a história exigir detalhe maior.

## Preservação e mudanças

Git foi conferido antes de escrever: 22 arquivos rastreados modificados e dezenas de arquivos novos de trabalhos anteriores. `checkpoints/personagem-before-20261022/` guarda status, patch, cópia do código, hashes e backup de QA. O status do helper inclui também `scripts/prepare-personagem.mjs`, criado nesta tarefa. Não houve reset, stash, commit ou limpeza em massa.

Dos 1.946 registros iniciais, **1.945 arquivos continuam idênticos**, incluindo os seis originais e vídeos. Exceção esperada: índice `assets/catalog.json`, estendido mantendo os sete pins antigos. Engines dos quatro estilos, core, Clawd, motion, timeline, runtime e render-lib foram comparados ao checkpoint e permanecem byte a byte iguais.

| Arquivos criados/alterados | Motivo |
|---|---|
| `assets/catalog.json`, `assets/packs/menina-aquarela/1.0.1/{manifest.json,calm.png,surprised.png,source-records.json,local-use.txt}` | Registro ativo, derivados e proveniência; 1.0.0 rejeitada preservada fora do índice |
| `scripts/asset-catalog.mjs`, `scripts/png-rgba.mjs`, `src/assets/layered.js`, `src/styles/watercolor/assets.js` | Perfil opaco, admissão local explícita e reutilização do adaptador |
| `src/config.js`, `src/scenes/personagem-surpresa.js` | Projetos novos `personagem-surpresa`/`personagem-camera` e cena |
| `tests/personagem.test.mjs` | Limites do perfil/uso, lineage, opacidade e expressões |
| `scripts/{prepare,check,render,finish}-personagem.mjs` | Preparo, QA/preservação, render e ledger reproduzíveis |
| `docs/PERSONAGEM_INVENTORY.md`, `docs/storyboards/personagem-surpresa.md`, este relatório, `docs/VALIDATION.md`, `docs/ASSET_CATALOG.md`, `src/styles/watercolor/GUIDE.md` | Inventário, decisões, uso e evidências |
| `out/personagem-pilot/`, `checkpoints/personagem-before-20261022/` | Revisões e preservação, sem alterar entregas antigas |

Pronta para novas histórias locais com estas duas ilustrações completas e cortes. Caminhada, piscada, giro, expressão contínua e braços independentes exigem arte preparada adicional e revisão específica. Direitos comerciais/publicação permanecem não verificados.
