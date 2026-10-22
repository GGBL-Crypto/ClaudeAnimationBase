# Adicionar um estilo ou motor

O quarto estilo segue o [plano Three.js low poly](LOWPOLY_3D_PLAN.md); a implementação e suas evidências estão no [relatório do motor](LOWPOLY_3D_REPORT.md).

1. Crie `src/styles/<id>/config.js`, `engine.js`, `GUIDE.md` e `AGENTS.md`.
2. Registre `{ id, name, backend, scripts, config, validate? }` via `AnimationPlatform.registerStyle`. `config` tem cinco grupos: `palette`, `texture`, `outline`, `character` (unit/width/height positivos) e `effects`. Declare os controles que o motor realmente usa; valide restrições específicas.
3. Inclua apenas o script de registro em `studio.html`. As dependências listadas em `scripts` serão carregadas somente quando esse estilo for escolhido. O catálogo Node encontra automaticamente diretórios de estilo.
4. Instale `window.animationEngine` com o contrato abaixo. `init` pode ser assíncrono e deve aguardar imagens, fontes, shaders e demais assets. Erros rejeitam, nunca fingem prontidão.
5. Registre um projeto compatível, um storyboard e scripts de cena. Implemente a porta artística usada pela coreografia compartilhada ou escreva uma cena específica. Não declare suporte a cenas que usam recursos ausentes.
6. Rode testes, capture os mesmos tempos fora de ordem/em outra página e revise PNGs e um MP4 curto extraído do arquivo final.

```js
window.animationEngine = {
  async init() { /* preparar recursos */ },
  async render(t, options) { /* quadro completo; options é opcional */ },
  canvas, // HTMLCanvasElement em 1920×1080, capturável por toDataURL
  worldToScreen(x, y) { return [x, y]; }, // câmera do último quadro para --crop-at
  info() { return 'nome e versão do backend'; }, // ou objeto JSON sem ciclos
  dispose() { /* opcional; obrigatório para motores que alocam recursos GPU */ }
};
```

O runtime oferece `renderAt`, `renderSheet`, `projectInfo` e seleção de projeto; o CLI trata captura, workers, áudio, sequência e MP4. O motor não chama FFmpeg. `render(t)` chama `drawWorld(t)` quando utiliza a timeline comum. Sempre feche transformações e limpe profundidade/cor quando houver WebGL.

## Extensões futuras

| Estilo | O que permanece comum | O que o módulo deverá implementar |
|---|---|---|
| Anime | tempo, storyboard, revisão, render | modelo, poses, linha, cel shading, efeitos e acting específicos |
| Motion graphics | tempo, easing, storyboard, exportação | tipografia, composição, formas, transições e regras de marca |
| 3D | tempo, cortes, revisão, captura, MP4 | engine WebGL, cena, câmera/projeção, materiais, luzes, assets e animação por tempo absoluto |

`worldToScreen(x,y,z=0)` em 3D projeta o ponto pela câmera do último quadro. `--crop-at=x,y,z,w,h` só é aceito por estilos com `dimensions:3`; quatro valores legados continuam válidos. Low poly 3D está implementado; anime e motion graphics continuam futuros. A arquitetura não obriga 3D a usar `paint`, paletas sem preto, pixelização ou vistas 2D.

Estilos podem declarar `scripts: [{src:'...',type:'module'}]`: o loader aguarda o grafo ES via HTTP loopback, enquanto strings continuam scripts clássicos. Declare `preview:true` somente se `render(t,{preview:true})` suporta o perfil leve. O runtime chama `dispose()` ao sair/trocar de projeto e em falhas de boot. O motor deve liberar recursos uma única vez e recusar render após descarte. Novos assets/rotas/dependências precisam entrar no inventário e na lista explícita do servidor.

As três implementações atuais são APIs artísticas próprias. O contrato comum exporta quadros; não promete converter automaticamente uma cena arbitrária entre mídias.
