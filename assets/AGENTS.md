# Catálogo local de assets

- Leia `docs/ART_ASSETS_PLAN.md` e `docs/ASSET_SOURCES.md`. Não use `docs/imgs` como assets.
- Origem não define capacidade: PNG/JPG gerado externamente continua raster. Não presuma alpha, SVG, atlas correto, geometria, rig ou clips.
- Importe manualmente com `node scripts/import-assets.mjs caminho/local/manifest.json`. O diretório de origem é uma inbox privada; nenhum recurso é baixado pelo importador.
- Registre origem, autor, condições comerciais, evidências locais e SHA-256. Para geração registre provedor/modelo/prompt/parâmetros, referências e direitos; campos desconhecidos são explícitos. Sem prova/revisão, não publique.
- IDs/versões publicados são imutáveis. Nunca edite um pack para corrigir um arquivo: publique outra versão e atualize o pin do projeto. Preserve versões/vídeos anteriores.
- Somente `files` do manifesto são públicos por HTTP. Originais de referência, prompts e comprovantes ficam em `evidence`, não nas rotas do estúdio. O projeto fixa ID, versão e hash do manifesto.
- O primeiro adaptador é 3D estático; não anuncie importação animável nos motores 2D, rigging, clips ou morphs antes dos testes correspondentes. Não automatize provedores de imagem nem adicione API paga.
- Incremento autorizado posterior: aquarela admite `layered-2d` com partes PNG RGBA8, hierarquia e variantes explícitas; consulte `docs/WATERCOLOR_ASSET_ACTOR_REPORT.md`. Não estenda essa capacidade a cartoon ou pixel. Origens geradas continuam importação manual, com fontes/derivados/condições registrados. Não invente áreas escondidas ou vistas faltantes.
