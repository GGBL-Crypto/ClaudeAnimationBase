# Three.js low poly — plano das Etapas 2–5

Data: 21/10/2026. **Status: planejamento; Etapa 3 depende de aprovação expressa do usuário.** A auditoria/correção dos estilos atuais está em [AUDIT_STAGE1.md](AUDIT_STAGE1.md). Nenhum estilo 3D, projeto de Marte ou servidor de produção foi registrado nesta etapa.

## Compatibilidade confirmada

Foram lidos `AGENTS.md`, `ARCHITECTURE.md`, `docs/ADDING_STYLES.md`, `src/platform.js`, `src/runtime.js`, `src/motion.js`, `src/timeline.js`, `src/config.js`, `studio.html`, `render.mjs`, o guia universal, os testes e os utilitários de render. O desenho pertence a cada motor; timeline, storyboard e exportação já são independentes de p5.

| Componente atual | Decisão para o 3D |
|---|---|
| Registro e configuração congelada em `platform.js` | Reutilizar. O estilo declara `dimensions: 3`; sua própria função `validate` verifica câmera, luzes e geometria. |
| `motion.js`: easing, interpolação, sementes e tempo | Reutilizar `kf` com vetores de três números, `ease`, `seg`, `hash`, `spring`. `W/H` continuam sendo pixels da saída. |
| Helpers `arcPt`, `stroll`, `jump`, `take` | São convenções 2D/Y para baixo. Não converter globalmente; escrever a pose 3D na cena com Y para cima. |
| `timeline.js`: `shots`/`drawWorld(t)` | Reutilizar sem alterações; cenas 3D atribuem o estado do mundo selecionado pela timeline. |
| `runtime.js`: boot e captura | Acrescentar importação ES assíncrona e opções de prévia; preservar o caminho de scripts clássicos. |
| `studio.html`/`preview.js` | Mesmo estúdio, seletores, scrub, storyboard e salvar PNG. Acrescentar import map e modo leve somente para estilos que o declarem. |
| `render.mjs`, FFmpeg e FFprobe | Mesma CLI, sequências, manifestos, MP4 e verificação. Acrescentar origem HTTP local para estilos ES e recorte com Z. |
| Aquarela, cartoon, pixel, `demo` e `visit` | Permanecem nos motores atuais, em 1920×1080, sem conversão para Three.js. Os projetos existentes não declaram compatibilidade 3D. |

### Prova de integração realizada

Pacote npm oficial `three@0.186.1`, MIT, baixado com `npm pack` **somente em `out/audit/three-probe/`**, sem `npm install` e sem alterar `package.json`, lockfile ou `node_modules`. Integridade SHA-512 conferida contra o registro npm:

`sha512-blFeqb49wRCSGUGj7gtpfnSGHy2lwDk94RhUmS1c/hTby70kvChbWpkJ4Pm1390LqzzvTmzgXKHPEafJwCb8jA==`

Um servidor temporário `node:http`, limitado a `127.0.0.1` e encerrado ao final, serviu o **estúdio existente**, injetando o import map apenas na resposta de diagnóstico. Após o boot de cartoon, um módulo importou Three.js e GLTFLoader; leu os identificadores lexicais `PROJECT`, `W`, `H`; criou WebGLRenderer; renderizou um fundo 16×16; capturou PNG após espera assíncrona e conferiu o pixel RGBA `[170,85,34,255]`. GLTFLoader fez `parseAsync` de uma cena glTF 2.0 mínima, vazia. Nenhuma API `animationEngine` nova foi instalada.

Passou em Chrome 155.0.8059.85 com ANGLE/D3D11/Radeon R9 200 e também com ANGLE/SwiftShader via `--soft-gl`. [Relatório do teste](../out/audit/three-probe/report.json), [script do diagnóstico](../out/audit/three-probe/probe.mjs).

Isso confirma carregamento, interoperabilidade, WebGL2 e captura básica neste ambiente. Não mede desempenho de uma cena animada nem valida assets glTF complexos. Não é um render 3D do filme solicitado.

## Carregamento e dependências

Adicionar **uma única dependência de execução: `three`, versão exata `0.186.1`**, com lockfile. O pacote consultado não declara dependências de execução transitivas. Instalar somente após aprovação, com `npm install --save-exact three@0.186.1`, preservando as dependências e a licença existentes. Chrome/Puppeteer, Node, FFmpeg e FFprobe já atendem ao restante.

O [manual oficial de instalação](https://threejs.org/manual/pages/installation.html) documenta módulos, import maps e servidor local. A proposta aplica esse mecanismo a arquivos locais do pacote npm:

```html
<script type="importmap">
{"imports": {
  "three": "./node_modules/three/build/three.module.js",
  "three/addons/": "./node_modules/three/examples/jsm/"
}}
</script>
```

Inserir antes de qualquer módulo. O mapa sozinho não baixa nada. Apenas selecionar `lowpoly-3d` dispara o import do motor. Sem CDN no render, bundler, Vite, React, Remotion, Express ou nova plataforma.

Registro proposto: `scripts: [{src:'src/styles/lowpoly-3d/engine.js', type:'module'}]`. `load` mantém strings como scripts clássicos e usa `await import(new URL(src, document.baseURI).href)` para descritores de módulo; erros de importação ou inicialização chegam a `bootError`. A configuração do estilo continua um script clássico, legível pelo catálogo Node/VM sem DOM ou Three.js. As cenas podem continuar scripts clássicos, carregados em sequência após o módulo do motor.

Os módulos ES devem usar HTTP. Adicionar um pequeno servidor estático com `node:http` em `scripts/studio-server.mjs`, com MIME correto, raiz restrita, validação do caminho resolvido e bind em loopback. Reutilizá-lo em `npm run studio` e no CLI: uma origem/porta por processo de render, compartilhada pelos workers, encerrada em `finally`. `openPage` recebe uma origem opcional; para os estilos atuais, o caminho `file://` continua funcionando. Sob HTTP, todos usam o mesmo `studio.html`. Ao selecionar 3D em `file://`, mostrar instrução concreta de executar `npm run studio`; não depender de flags de segurança do Chrome para uso manual.

O servidor e o novo transporte entram no inventário de `sourceHash`; o lockfile identifica a versão do pacote. Arquivos externos de assets deverão entrar no inventário quando forem introduzidos. Na primeira cena, a geometria é procedural e sua origem está nos scripts já inventariados.

## Contrato do motor

```text
projeto/configuração congelada
       ↓
runtime → init() → cena + geometria + materiais + luzes + câmeras
       ↓
renderAt(t) → animationEngine.render(t) → drawWorld(t) → pose absoluta
       ↓
WebGLRenderer → canvas de saída → PNG / folhas / sequências → FFmpeg → validação
```

| Membro | Responsabilidade |
|---|---|
| `async init()` | Criar uma única cena e recursos estáticos; montar câmera/luzes e rig; aguardar recursos e pré-compilação de shaders antes de `ready`. Falhas reais devem rejeitar. |
| `render(t)` | Restaurar/atribuir todo estado animável, chamar `drawWorld(t)`, atualizar matrizes e projeção e desenhar um quadro completo. Nenhum loop próprio ou integração por delta. |
| `canvas` | Canvas público `#out`, 1920×1080, estável e capturável. O WebGL interno é copiado para ele no mesmo render. |
| `worldToScreen(x,y,z=0)` | Projetar ponto do mundo pela câmera do último quadro; retornar `[pixelX,pixelY]` em coordenadas da saída. Rejeitar ponto atrás da câmera ou fora da profundidade válida. |
| `info()` | Informação serializável sobre Three revision, WebGL/ANGLE/dispositivo, perfil, tamanho interno, projeção e sombras. Não incluir cena, DOM, objetos cíclicos ou relógio. |

`WebGLRenderer` exige WebGL2; configurar pixel ratio 1, limpar cor/profundidade por quadro e definir explicitamente espaço sRGB e tone mapping. Começar com `preserveDrawingBuffer: true`, já exercitado na prova, para captura previsível; otimizar somente se medições justificarem. A aplicação não usará `setAnimationLoop` porque o runtime já determina cada tempo de captura. [Documentação oficial de WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).

A perda do contexto WebGL, falha de shader ou indisponibilidade de WebGL2 devem gerar erro visível, não um PNG preto aceito como sucesso. Liberar geometria, materiais e renderer ao descartar o motor. Nenhum contexto será compartilhado com p5.

## Estado tridimensional e configuração

Usar unidades de mundo próprias: **Y para cima, solo em Y=0, X para deslocamento lateral, Z para profundidade, rotações em radianos**. Definir a frente local do robô e mantê-la no guia. Não reinterpretar as coordenadas 2D existentes.

O robô será uma hierarquia `Group`/`Mesh`: raiz, tronco, cabeça, braços e pernas com pivôs simples. `position`, `rotation`/`quaternion` e `scale` são atribuídos a partir da pose absoluta. Não usar `rotateY(delta)` nem incrementar posição a cada quadro. Para interpolação entre orientações, usar quaternions com extremos fixos, evitando acumulação. [Object3D](https://threejs.org/docs/pages/Object3D.html).

`kf` já interpola arrays numéricos de qualquer comprimento, portanto pode animar `[x,y,z]` sem alteração. Para a caminhada, derivar fase da distância percorrida; sustentar o pé de apoio no chão e finalizar o passo antes de parar. Cabeça percebe a pedra antes da inclinação do corpo e da reação. Toda visibilidade, pose, emissão e câmera deve ser definida para qualquer `t`, inclusive ao voltar no tempo ou atravessar cortes.

Configuração proposta, usando objetos `{x,y,z}` nos dados congelados: o merge atual não preserva arrays como arrays. Arrays de keyframes ficam no código da cena, onde são adequados.

| Grupo | Controles iniciais |
|---|---|
| `palette` | Céu empoeirado, solo terracota, pedra escura, carcaça clara, visor escuro, emissão turquesa. |
| `texture` | Sem bitmaps; facetas por geometria/normais. Parâmetros fixos de tesselação e semente. |
| `outline` | Desativado; silhueta e luz separam os volumes. Valores diferentes rejeitados enquanto não suportados. |
| `character` | `unit`, `width`, `height` positivos para o contrato atual; proporções fixas do robô e amplitude de passos. |
| `effects` | Sombras opcionais; intensidade/pulso da pedra. Sem pós-processamento. |
| `camera` | Tipo, posição, alvo, FOV, plano near/far e altura ortográfica. |
| `lighting` | Luz hemisférica + uma direcional; cores/intensidades e direção; opcional point light curta na pedra. |
| `materials` | Cor sólida, facetas, emissão; sem mapas PBR ou reflexão complexa. |
| `preview` | Escala interna 0,5 e sombras desativadas no modo leve; apenas o estilo 3D declara esse recurso. |

`validate` específico deve rejeitar tipos desconhecidos, números não finitos, escala/dimensões inválidas, FOV fora da faixa, `near <= 0`, `far <= near`, câmera coincidente com alvo e orçamentos excessivos. `mergeConfig` e `freeze` já servem; não generalizar o esquema dos três estilos por causa de posições 3D negativas.

### Câmera, luz e materiais

- `PerspectiveCamera` para o filme, com aproximação suave e alvo interpolado por tempo absoluto. `OrthographicCamera` como segunda projeção do motor, validada com uma folha própria; não trocar projeção no meio do vídeo sem decisão de storyboard. Atualizar matrizes após qualquer mudança de projeção. [Perspectiva](https://threejs.org/docs/pages/PerspectiveCamera.html), [ortográfica](https://threejs.org/docs/pages/OrthographicCamera.html).
- Projetar com `Vector3.project(camera)` e converter NDC para pixels: `x=(ndc.x+1)*W/2`, `y=(1-ndc.y)*H/2`, após atualizar a câmera. [Vector3](https://threejs.org/docs/pages/Vector3.html).
- Ampliar `--crop-at` para aceitar **4 valores legados** `x,y,w,h` ou **5 valores 3D** `x,y,z,w,h`. Cinco valores só são válidos para `dimensions:3`. Usar o parser aritmético seguro; nenhuma expressão JavaScript. Largura/altura continuam em pixels, mesmo com perspectiva.
- Geometria: caixas, cilindros com poucos segmentos, icosaedros e terreno triangulado simples, criados uma vez. Começar com orçamento indicativo de até 10 mil triângulos e cerca de 50 draw calls; registrar o observado e simplificar se necessário.
- Preferir `MeshLambertMaterial` com `flatShading` para superfícies sólidas. A pedra usa emissão; um pequeno point light pode tingir o entorno, com limite de alcance. Não depende de bloom para ser legível. O modelo Lambert é mais simples que os materiais físicos. [MeshLambertMaterial](https://threejs.org/docs/pages/MeshLambertMaterial.html).
- Uma shadow map direcional pequena (512 ou 1024), opcional, frustum restrito e ajuste de bias após inspeção dos pés. Sem sombras de point light, SSAO, DOF, ray tracing, HDRI ou física.

### GLTFLoader: fronteira futura

O addon pertence ao mesmo pacote `three`: `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'`. Foi importado e exercitado no diagnóstico, mas **não será carregado pelo primeiro filme procedural**. Não há motivo para instalar Draco, Meshopt ou KTX2 agora. Quando um asset local for necessário, `init` aguardará `loadAsync`, manifestos incluirão os bytes do asset e seus recursos, e erros de carregamento rejeitarão a inicialização. [GLTFLoader oficial](https://threejs.org/docs/pages/GLTFLoader.html).

Clips glTF futuros precisarão de avaliação absoluta e testes de ida/volta; `AnimationMixer.setTime(t)` oferece seek, mas pesos/ações/loops também terão de ser reiniciados deterministicamente. Não presumir determinismo só porque existe `setTime`. [AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html).

## Prévia leve e captura

O canvas público e os outros estilos permanecem em **1920×1080**. Somente o buffer WebGL do 3D usará **960×540** na prévia leve, ampliado para o canvas de saída. Isso mantém layout e coordenadas de revisão.

Extensão opcional compatível: `render(t, {preview:false} = {})`, encaminhada por um quarto argumento opcional de `renderAt(t, mime, qualidadeDaImagem, opçõesDoMotor)`. Chamar só `render(t)` continua válido e significa qualidade final. `renderSheet`, CLI e workers usam sempre final. A prévia solicita modo leve apenas quando o registro do estilo o declara. O botão de PNG solicita um quadro final nesse estilo antes de salvar; a prévia seguinte retorna ao modo leve. Os motores anteriores continuam no caminho atual. Identificar o modo leve na interface e oferecer comparação em qualidade final.

A resolução de exportação continua **1920×1080 a 12 fps**, 3 segundos, 36 quadros. Não diminuir `W/H`, o fps de `visit`/`demo` ou o comportamento de playback deles. A redução de custo principal vem dos 36 quadros, da cena simples e do buffer menor durante edição. Começar com um worker 3D; usar `--soft-gl` como caminho de software. GPU dedicada será opcional; WebGL2 funcional, inclusive em software, continua obrigatório.

## Filme experimental proposto

Novo projeto **`mars-discovery`**, título **“Um sinal na poeira”**, somente `lowpoly-3d`, 3 s/12 fps, silencioso. Mundo original: um robô explorador pequeno, de carcaça clara e visor escuro, encontra um fragmento turquesa no solo vermelho. Ele interrompe a caminhada, examina o brilho e inclina a cabeça com surpresa satisfeita.

Um único plano em três leituras, câmera em três quartos e aproximação discreta; evita gastar os três segundos com transições. Pedra visível desde o início para preparar a descoberta. O robô segue da esquerda para a direita; cenário esparso mantém silhueta e foco. Sem títulos cobrindo a ação.

| Tempo / quadros | Leitura | Atuação e câmera |
|---|---|---|
| 0–1,0 s / 0–11 | Explorar | Dois passos curtos sobre solo plano; pedra à frente; câmera acompanha suavemente. |
| 1,0–1,75 s / 12–20 | Perceber | Pedra intensifica emissão; olhos/cabeça voltam; pé termina apoio e corpo para. |
| 1,75–3,0 s / 21–35 | Descobrir | Inclinação curiosa, pequeno recuo de surpresa, mãos se abrem e cabeça inclina; breve sustentação final. |

Storyboard de inspeção: quadros 0, 6, 11, 12, 17, 20, 21, 26, 30 e 35. Tiras adicionais para troca de apoio, desaceleração e reação. Detalhes dos pés, visor e pedra. O último quadro exportado será `35/12 ≈ 2,9167 s`; `t=3` é limite da timeline e não um 37º quadro.

O storyboard executável e o guia artístico serão registrados **depois da aprovação**; esta tabela é a proposta revisável.

## Arquivos previstos após aprovação

| Arquivo | Mudança |
|---|---|
| `src/styles/lowpoly-3d/config.js` | Registro, capacidades e configuração validada. |
| `src/styles/lowpoly-3d/engine.js` | Módulo Three.js, contrato, recursos 3D, câmera e captura. |
| `src/styles/lowpoly-3d/GUIDE.md`, `AGENTS.md` | Facetas, paleta, luz, escala, atuação, determinismo, desempenho e QA. |
| `src/scenes/mars-discovery.js` | Construção procedural específica do filme e pose pura por tempo; registro dos planos. |
| `src/config.js` | Novo projeto, leituras e tempos de revisão; entradas existentes preservadas. |
| `src/runtime.js`, `src/crop.js` | Módulos ES, opções de prévia e recorte XYZ seguro. |
| `studio.html`, `src/preview.js` | Import map, registro do estilo, transporte HTTP orientado e prévia opt-in. |
| `scripts/studio-server.mjs`, `scripts/render-lib.mjs` | Servidor loopback e origem por sessão/worker; inventário atualizado. |
| `render.mjs` | Recorte com Z e inicialização/finalização do transporte; restante da CLI reaproveitado. |
| `package.json`, `package-lock.json` | `three@0.186.1` exato e comando `studio`, sem outras instalações. |
| `tests/`, `scripts/check-visuals.mjs` ou teste 3D dedicado | Contrato, projeções, determinismo, qualidade, HTTP e regressões. |
| Guias/README/validação/storyboard do filme | Comandos, resultados, tempo medido, limitações e links reais. |

Não há mudança planejada na matemática comum, na timeline ou na arte dos três motores existentes.

## Sequência de implementação e critérios de aceite

1. **Integração mínima:** instalar a versão fixa, servidor/import map/carregador; inicialização e falhas testadas; três estilos anteriores passando em file e HTTP. Não considerar o motor disponível só por importar Three.js.
2. **Motor e rig:** projeções perspectiva/ortográfica, transformações XYZ, materiais, iluminação, sombra opcional, cenário/robô simples. Capturar PNG final e prévia leve; confirmar dimensões e pixels não vazios.
3. **História:** implementar o storyboard aprovado, gerar folhas/tiras/recortes e corrigir defeitos observados. Registrar contato dos pés, ausência de interpenetração e visibilidade da pedra/visor.
4. **Determinismo:** renderizar os mesmos tempos em sequência, em ordem embaralhada, após o final e numa página nova; comparar PNGs exatos no mesmo backend/perfil. Incluir os dois tipos de câmera e sombras ligadas/desligadas. Hardware e software têm baselines separados; não exigir igualdade binária entre drivers distintos.
5. **Exportação:** 36 PNGs e MP4 de 3 s a 12 fps/1920×1080; FFprobe, contagem, duração e decodificação completa. Inspecionar quadros extraídos do próprio MP4, incluindo começo/meio/fim; relatório começa `pending` e só muda após inspeção real.
6. **Custo real:** medir com relógio monotônico desde a abertura do processo até fechar recursos; discriminar inicialização, desenho/captura, encode e verificação quando possível. Registrar CPU, RAM, SO, Node, Chrome, Three, FFmpeg, flags, dispositivo WebGL, perfil, sombras e workers. Um render final de referência deve rodar isolado. Não estimar tempo real a partir do diagnóstico 16×16.
7. **Regressão e entrega:** `npm test`, `npm run test:visual`, `node scripts/check-render.mjs`; snapshots da demo e isolamento de p5/Three; vídeos antigos permanecem intactos. Verificar `sourceHash` ao terminar, versão e hashes dos arquivos; publicar o relatório local e links.

## Limitações previstas

- Procedural low poly, rig simples e paleta fixa; não é editor 3D, sistema de física, importador geral de assets ou conversor automático de estilos.
- A emissão da pedra não cria halo óptico sem pós-processamento; a leitura virá de contraste, cor e iluminação local.
- SwiftShader permite operar sem placa dedicada neste Chrome, mas poderá ser lento e variar por instalação/política do navegador. Não há fallback 2D silencioso caso WebGL2 falhe.
- A prova atual valida somente um fundo e uma cena glTF vazia; não demonstra desempenho do robô, sombras ou animação. Esses itens pertencem às Etapas 3–5.
- Não se promete identidade binária de WebGL entre máquinas/GPUs. A garantia testada será determinismo por tempo no ambiente registrado.
- Documentos de planejamento não entram no hash de render. Código, lockfile e o transporte usado precisam entrar; futuras mudanças de assets exigirão ampliar o inventário.

**Próxima ação autorizável:** implementar a Etapa 3 segundo este plano e então produzir/validar o filme das Etapas 4–5. A solicitação atual manda parar antes disso.
