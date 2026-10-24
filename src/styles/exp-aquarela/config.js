// Aquarela de livro ilustrado (exp/estilos): fundos parados pintados uma vez em p5.brush (build standalone, sem p5) e seres
// em Canvas2D por quadro, com aguada, borda de pigmento e nanquim leve; o papel entra em multiply por cima de tudo.
AnimationPlatform.registerStyle({
  id: 'exp-aquarela', name: 'Aquarela (livro ilustrado)', backend: 'Canvas2D + p5.brush (caches)',
  scripts: ['node_modules/p5.brush/dist/brush.js', 'src/styles/cartoon/engine.js', 'src/styles/exp-aquarela/draw.js'],
  config: {
    palette: {
      paper: '#F5EEDF', ink: '#3A2C26', skyTop: '#86AFC6', skyLow: '#F2DDB2', far: '#A3B9B4', hill: '#93AD7C', tree: '#6E9A5E',
      grass: '#86A85C', grassDk: '#557E45', soil: '#B98457', soilDk: '#7A4E35', cave: '#3B2620', fungus: '#EDE4C6', path: '#E0C595',
      stone: '#A79C8E', ant: '#963F27', hero: '#EE7424', leaf: '#93B54C', fly: '#4C423D', wing: '#C8D6DA',
      skin: '#EDB48E', hair: '#5E3B2A', shirt: '#CFAA5C', pants: '#6E7B5B', hat: '#DCC48E', band: '#7A4A30', pack: '#A9573B', boot: '#5C3C2B', red: '#C8462E',
    },
    texture: { paper: true }, outline: { weight: 1 }, character: { unit: 40, width: 10, height: 8 }, effects: {},
  },
});
