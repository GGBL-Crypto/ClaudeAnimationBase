// Boneco palito expressivo (exp/estilos): traço de pincel de peso variável sobre papel liso e uma cor de destaque.
AnimationPlatform.registerStyle({
  id: 'exp-palito', name: 'Palito expressivo', backend: 'Canvas2D', scripts: ['src/styles/cartoon/engine.js', 'src/styles/exp-palito/draw.js'],
  config: { palette: { paper: '#F6F1E5', soil: '#ECE3D2', ink: '#221E1B', faint: '#B4AC9E', accent: '#F0561E' }, texture: {}, outline: { weight: 3 }, character: { unit: 40, width: 10, height: 8 }, effects: {} },
});
