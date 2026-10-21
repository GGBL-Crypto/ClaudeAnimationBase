# Adicionar um estilo ou motor

Para o quarto estilo, consulte o [plano Three.js low poly](LOWPOLY_3D_PLAN.md): inclui prova de carregamento, contrato, transporte HTTP, dependências e critérios de aceite. É planejamento para revisão, não um motor disponível.

1. Crie `src/styles/<id>/config.js`, `engine.js`, `GUIDE.md` e `AGENTS.md`.
2. Registre `{ id, name, backend, scripts, config, validate? }` via `AnimationPlatform.registerStyle`. `config` tem cinco grupos: `palette`, `texture`, `outline`, `character` (unit/width/height positivos) e `effects`. Declare os controles que o motor realmente usa; valide restrições específicas.
3. Inclua apenas o script de registro em `studio.html`. As dependências listadas em `scripts` serão carregadas somente quando esse estilo for escolhido. O catálogo Node encontra automaticamente diretórios de estilo.
4. Instale `window.animationEngine` com o contrato abaixo. `init` pode ser assíncrono e deve aguardar imagens, fontes, shaders e demais assets. Erros rejeitam, nunca fingem prontidão.
5. Registre um projeto compatível, um storyboard e scripts de cena. Implemente a porta artística usada pela coreografia compartilhada ou escreva uma cena específica. Não declare suporte a cenas que usam recursos ausentes.
6. Rode testes, capture os mesmos tempos fora de ordem/em outra página e revise PNGs e um MP4 curto extraído do arquivo final.

```js
window.animationEngine = {
  async init() { /* preparar recursos */ },
  async render(t) { /* limpar e desenhar o quadro completo em canvas */ },
  canvas, // HTMLCanvasElement em 1920×1080, capturável por toDataURL
  worldToScreen(x, y) { return [x, y]; }, // câmera do último quadro para --crop-at
  info() { return 'nome e versão do backend'; }
};
```

O runtime oferece `renderAt`, `renderSheet`, `projectInfo` e seleção de projeto; o CLI trata captura, workers, áudio, sequência e MP4. O motor não chama FFmpeg. `render(t)` chama `drawWorld(t)` quando utiliza a timeline comum. Sempre feche transformações e limpe profundidade/cor quando houver WebGL.

## Extensões futuras

| Estilo | O que permanece comum | O que o módulo deverá implementar |
|---|---|---|
| Anime | tempo, storyboard, revisão, render | modelo, poses, linha, cel shading, efeitos e acting específicos |
| Motion graphics | tempo, easing, storyboard, exportação | tipografia, composição, formas, transições e regras de marca |
| 3D | tempo, cortes, revisão, captura, MP4 | engine WebGL, cena, câmera/projeção, materiais, luzes, assets e animação por tempo absoluto |

`worldToScreen` em 3D deve projetar o ponto no plano/câmera adequado; estenda o formato de recorte explicitamente se precisar de Z. Nenhum dos três motores futuros está implementado. A arquitetura atual não obriga 3D a usar `paint`, paletas sem preto, pixelização ou vistas 2D.

As três implementações atuais são APIs artísticas próprias. O contrato comum exporta quadros; não promete converter automaticamente uma cena arbitrária entre mídias.
