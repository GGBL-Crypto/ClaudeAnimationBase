# Uso do catálogo local

Incremento de ilustrações opacas: `profile:'illustration-2d'`, restrito à aquarela, usa o mesmo contrato de uma camada raiz e variantes da composição inteira. PNG RGBA8 com papel integralmente opaco; sem rig inferido. O [piloto da menina](PERSONAGEM_PILOT_REPORT.md) registra os fontes privados por caminho/hash sem duplicar os JPEGs grandes. É admitido uso `local-pilot` explícito de imagens geradas fornecidas pelo usuário com `license.status:'unverified'`, `commercial:null`, `publication:'unverified'` e evidência da solicitação local. Essa exceção não declara licença comercial e não se estende a packs 3D ou em camadas transparentes. Provedor/modelo/prompt desconhecidos ficam explícitos. A política histórica de admissão comercial descrita abaixo continua para os outros casos.

Incremento articulado: manifesto `profile:"articulated"`, estilo `lowpoly-3d`, `identity.rigVersion` e entrada GLB. Capacidades são extraídas dos buffers e nomes em `available.expressions` devem existir nos morph targets. O perfil padrão permanece estático. `item.createActor(art, options)` clona skeletons e registra ownership; `actor.apply(t, atuação)` avalia clips/expressões por tempo absoluto. Orçamentos, pins selecionados, fontes e limites estão no [relatório](ARTICULATED_ACTOR_REPORT.md). As descrições históricas abaixo sobre ausência de rigging pertencem ao primeiro piloto estático.

Fluxo: candidato local e provas → validação → pack imutável → pin de projeto → sessão assíncrona → adaptador → motor atual. O contrato `animationEngine` não mudou. `assetHash` fixa os bytes de produção, manifesto e comprovantes; `sourceHash` fixa código, servidor e dependências. Projetos sem `assetRefs` mantêm `assetHash:null` e o carregamento legado.

O importador não baixa recursos nem cria imagens. Prepare uma pasta local com o manifesto e todos os arquivos referidos, seguindo o [manifesto do piloto](../assets/packs/kenney-space-speeder/1.0.0/manifest.json). Execute:

```powershell
rtk node scripts/import-assets.mjs C:\candidatos\personagem\manifest.json
```

O comando valida hashes/tamanhos reais, origem/licença/evidências, formatos/caminhos, dependências glTF e limites. Copia para staging, revalida e publica em `assets/packs/<id>/<versão>/`; recusa sobrescrever versão existente. O índice `assets/catalog.json` armazena o SHA-256 do manifesto. A admissão é uma operação local individual; não há editor, banco de dados ou serviço remoto. A declaração de revisão humana é obrigatória e não verifica por si a autenticidade jurídica de uma alegação.

Campos mínimos: `schemaVersion`, `id`, `version`, `identity`, `style`, `entry`, `origin`, `license`, `available`, `files`, `evidence`. Cada arquivo tem `path`, `bytes` e `sha256`. `available` registra vistas, expressões e poses **revisadas**; `capabilities` servido ao navegador é calculado a partir dos arquivos e não presume animabilidade por nome. Arquivos podem representar uma folha inteira ou recortes explícitos, identificados em metadados adicionais; os adaptadores 2D não estão presentes.

Para `origin.kind:'generated'`, registre:

```json
{
  "kind": "generated",
  "author": "operador informado",
  "source": "importação manual local",
  "generation": {
    "provider": "provedor informado",
    "model": "modelo/versão informados",
    "prompt": "prompt integral utilizado",
    "negativePrompt": null,
    "parameters": null,
    "seed": null,
    "jobId": null,
    "references": []
  }
}
```

`null` significa não disponibilizado/conhecido, sem inventar parâmetros. Cada referência utilizada declara `path`, `sha256`, `purpose`, `source`, `usageReviewed:true` e aparece em `evidence`. `license` registra identificador das condições, URL, `commercial:true`, `reviewedBy`, `reviewedAt` e caminhos das provas. Inclua snapshot das condições aplicáveis. Guarde originais/prompts/referências como evidência privada e derivados de produção em `files`. Metadados de operações podem registrar arquivos/hashes de entrada, ferramenta, parâmetros e responsável. Gerado não equivale a CC0.

O servidor escuta apenas `127.0.0.1`, exige Host exato e GET/HEAD, recusa caminhos codificados e travessia antes da normalização. Não publica pastas, inbox, docs, manifestos privados ou comprovantes. Cada arquivo servido tem bytes conferidos contra o hash e realpath limitado ao pack. `/assets/index.json` contém apenas dados técnicos e hashes do inventário, sem prompts ou texto das provas. Não é um editor público do catálogo.

## Limites comprovados

- PNG/JPG: assinatura, estrutura inicial/dimensões e hash; dimensão máxima 2048. Ter canal alpha não comprova fundo realmente transparente. Ainda exige revisão artística; não há separação automática de camadas.
- GLB/glTF 2.0: meshes triangulares estáticos, PBR ou unlit, PNG/JPG e BIN locais registrados. Antes do loader, as imagens usadas são decodificadas explicitamente; um erro não se torna mapa nulo silencioso.
- Recusa URLs externas/data, dependências ausentes, skins/clips/morphs, extensões/decoders fora da lista e hierarquia cíclica. Limites estruturais evitam JSON pequeno solicitando grafos ou buffers enormes. Não é um substituto integral do validador oficial glTF.
- 16 MiB por arquivo, 32 MiB de bytes por pack/sessão, 64 arquivos por pack e 64 MiB estimados de mapas RGBA/mips. Até 8 pins por projeto. O 3D mantém orçamento de cena e perfil de assets opt-in.
- Carga e hash terminam antes de init/primeiro quadro/ready. Cada sessão possui suas instâncias e buffers; não há cache GPU compartilhado entre projetos. Após adoção, o engine possui os recursos, inclusive os retirados da árvore. Texturas/bitmaps, geometria, materiais, targets, renderer e contexto têm descarte explícito.
- PNG/JPG de fontes geradas podem ser catalogados; nenhum dos três motores 2D ganhou um adaptador nesta entrega. Imagem de conceito 3D continua conceito, até existir modelagem/exportação/rig próprio.

## Extensões seguintes, sem implementar agora

1. **Aquarela:** um personagem original com partes RGBA limpas, duas expressões e pivôs; testar brush/oclusão/alpha e amplitudes extremas antes de vídeo de 2 s.
2. **Cartoon:** SVG real sanitizado com grupos/anchors e articulações; aceitar raster apenas em perfil declarado. Não converter aparência vetorial de PNG em SVG por suposição.
3. **Pixel:** atlas/tiles revisados, frames retangulares explícitos, trim/anchor estáveis, paleta e grade, sem suavização; verificar ciclo andando e parada.
4. **3D com rig:** avaliar um GLB de Mini Characters junto do colormap real; admitir skins/clips somente após ownership de Skeleton/boneTexture, clones independentes e seek absoluto do AnimationMixer. Testar ida/fim/volta ao início, dois atores, root motion e descarte. Morph/expressão exige targets reais; os 32 clips inspecionados não provam rosto expressivo.

Cada etapa mantém P0/P1/P2 comparáveis e regressões antigas. O compilador JSON poderá consumir os mesmos pins/capacidades; ainda não foi implementado.
# Extensão de aquarela: layered-2d

O perfil opcional `layered-2d` é descrito no [relatório e contrato](WATERCOLOR_ASSET_ACTOR_REPORT.md). Reutiliza os mesmos IDs, pins, importador manual, provas privadas, rotas e sessão; acrescenta rig 2D explícito e PNG RGBA8 completamente decodificado na admissão. A origem pode ser uma geração externa documentada, mas não há integração com provedores. `derivations` é obrigatório para ligar cada parte ao fonte/hash privado. O orçamento considera Canvas + textura; recursos são preparados antes de ready e liberados no descarte.

As seções anteriores de primeiro adaptador 3D estático são históricas. Cartoon SVG e pixel spritesheets permanecem planejados.
