// Arame da competição de estilos (exp/estilos): mostra a coreografia comum sem estilo nenhum (chão, câmera e ossos).
AnimationPlatform.registerStyle({
  id: 'exp-debug', name: 'Arame (coreografia)', backend: 'Canvas2D', scripts: ['src/styles/cartoon/engine.js', 'src/styles/exp-debug/draw.js'],
  config: { palette: { ink: '#202020' }, texture: {}, outline: { weight: 2 }, character: { unit: 40, width: 10, height: 8 }, effects: {} },
});
