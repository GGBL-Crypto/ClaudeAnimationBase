# Fontes avaliadas para o piloto — 21/10/2026

Consulta e aquisição registradas em UTC em 22/10 (noite de 21/10 em São Paulo). Primeiro foram lidas as páginas oficiais e a licença; os ZIPs foram para `out/assets-stage/quarantine/`. Somente depois da inspeção dos arquivos reais foi publicado um modelo, mantendo os comprovantes e seus hashes no pack. Nenhuma das quatro referências de `docs/imgs` entrou no catálogo.

| Fonte | Evidência real | Decisão e custo |
|---|---|---|
| [Kenney Mini Characters](https://kenney.nl/assets/mini-characters) | Página CC0; ZIP de 2.403.059 bytes; 26 GLB, 26 FBX, 26 OBJ/MTL, PNGs/preview. `character-male-a.glb`: 246.916 bytes, dois skins, dois meshes, 32 clips nomeados, `KHR_texture_transform`, `Textures/colormap.png` externo. O arquivo de licença declara uso comercial. Não foi comprovada expressão facial/morph. | Não incorporado em produção: exige o próximo adaptador com rig. GLB é compatível em princípio com GLTFLoader, mas esqueleto, clips, recursos externos e custo precisam de teste próprio. FBX/OBJ não são formatos admitidos pelo adaptador atual. |
| [Kenney Space Kit](https://kenney.nl/assets/space-kit) | ZIP de 6.677.531 bytes; 153 arquivos por formato GLB/DAE/FBX/OBJ/MTL/STL, 772 PNGs de vistas/preview. Página informa 1.0; `License.txt` do ZIP identifica **Space Kit 2.0**, CC0 e uso comercial. | Selecionado apenas `craft_speederA.glb`: 20.496 bytes, glTF 2.0, um mesh fonte/quatro primitivas, 280 triângulos, quatro materiais PBR, nenhum bitmap, skin, clip ou morph. Sem decoder adicional. A declaração global `KHR_materials_unlit` existe no JSON, mas os quatro materiais inspecionados usam PBR metálico; não recebem conversão para Lambert. |
| [Poly Haven Concrete Floor](https://polyhaven.com/a/concrete_floor) | A página apresenta mapas PNG/JPG/EXR, normal GL e DX, AO/roughness/metal, diffuse e displacement; opções 1K–8K e downloads glTF/ZIP/Blend/MaterialX. A [licença oficial](https://polyhaven.com/license) cobre os assets por CC0, inclusive uso comercial. | Avaliado, **não baixado nem catalogado**. Não há necessidade de mapas de concreto neste teste rígido. Uma importação futura deve inspecionar o pacote escolhido, suas URIs e dimensões reais. PNG/JPG e normal GL cabem no caminho mínimo; EXR/Blend/MaterialX e displacement não estão implementados. |

Hashes de aquisição:

- Mini Characters ZIP: `9e1d48e6d7b8479ebbe84df71eb5bd8e1b3f0da546dea641890dccc8a02d0999`.
- Space Kit ZIP: `d5d7cdf2635ed5a43a9187deaf409b6f47484e402321128341d3c3698e9ef4d9`.
- GLB escolhido, sem edição dos bytes: `dc48652fa5c59088a5e3902abce7598199f32e0dcb8c91bac25e17bb8ce15876`.

O primeiro download do Space Kit excedeu 120 segundos e não foi promovido. A repetição controlada terminou; os hashes são do ZIP completo. A rotulagem da página não substitui a versão e os bytes inspecionados. A versão interna do catálogo é `1.0.0`, própria desta publicação, sem renomear a edição original do fornecedor.

Licença CC0: [resumo oficial](https://creativecommons.org/publicdomain/zero/1.0/). É necessário distinguir o asset de textos, marcas, miniaturas e outros conteúdos do site. O HTML da página Kenney é guardado como comprovante privado, não como arte utilizável no filme. Nenhum conteúdo do site Poly Haven foi tratado como CC0 automaticamente.

## Compatibilidade e hardware

GLTFLoader e RoomEnvironment pertencem ao Three.js **0.186.1 já instalado**; foram acrescentadas somente rotas explícitas e importações ES, sem instalação npm. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) admite glTF 2.0 e exige cuidado com o descarte de ImageBitmap. A aplicação admite um subconjunto menor: GLB/glTF estático, PNG/JPG/BIN locais e as extensões `KHR_texture_transform`/`KHR_materials_unlit`; recusa rigs, clips, morphs, URLs remotas e decoders não instalados.

PBR não obriga GPU dedicada. WebGL2 continua obrigatório, com erro explícito se indisponível. O ambiente de reflexão de P2 é gerado localmente uma vez, em 128 pixels por face, usando RoomEnvironment/PMREM; não é HDRI baixado, ray tracing ou pós-processamento por quadro. A medição em SwiftShader registra o custo real do caminho por software.

Estimativa de mapas RGBA8 com mipmaps: uma imagem 1024² custa cerca de 5,33 MiB; três mapas, cerca de 16 MiB. Três mapas 2048² chegam a cerca de 64 MiB. Esses números são estimativas de alocação, não consumo medido do driver; mapas de mesma imagem e targets adicionais precisam de contabilização própria. O limite inicial é 2048 pixels por dimensão, 16 MiB por arquivo, 32 MiB de bytes por sessão e 64 MiB estimados para mapas. O piloto importado tem **zero bytes de mapas**.
