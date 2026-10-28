// Aquarela de livro ilustrado: fundos parados pintados uma vez em p5.brush (build standalone, sem p5) e seres
// em Canvas2D por quadro, com aguada, borda de pigmento e nanquim leve; o papel entra em multiply por cima de tudo.
AnimationPlatform.registerStyle({
  id: 'watercolor', name: 'Aquarela (livro ilustrado)', backend: 'Canvas2D + p5.brush (caches)',
  scripts: ['node_modules/p5.brush/dist/brush.js', 'src/styles/cartoon/engine.js', 'src/styles/watercolor/draw.js'],
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

// Aquarela clássica: o motor original (core.js, clawd.js, sheets.js) com a porta VisitArt.
AnimationPlatform.registerStyle({
  id: 'watercolor-classic', name: 'Aquarela clássica (Clawd)', backend: 'p5.brush / WebGL',
  assetModule:'src/styles/watercolor/assets.js',
  validate(config){if(![720,1080].includes(config.output.height))throw Error('Aquarela: output.height deve ser 720 ou 1080');},
  scripts: ['node_modules/p5/lib/p5.min.js', 'src/styles/watercolor/bootstrap.js', 'node_modules/p5.brush/dist/p5.brush.js', 'src/core.js', 'src/clawd.js', 'src/styles/watercolor/engine.js', 'src/sheets.js'],
  config: {
    palette: { paper: '#F3EBDC', ink: '#2B2233', clay: '#D97757', clayDk: '#A84D33', clayLt: '#F2A283', night: '#1F2550', indigo: '#2F3C7A', rose: '#E27A92', ochre: '#E8AA38', sap: '#6E9F58', teal: '#3A9C98', violet: '#7B5CA8', cream: '#FFF5E2', sky: '#8EC3E6', ground: '#9DB77A', groundDk: '#6F8A57', grass: '#86AB6B', grassDk: '#5F8450', leaf: '#6E9F58', leafDk: '#4C7A44', water: '#7DB4D6', skyTop: '#6FA9D8', skyLow: '#CFE6EE', skin: '#EDBB99', skinDk: '#C98E6C', hair: '#4A3328', cloth: '#7B5CA8', clothDk: '#574080', fur: '#C79258', furDk: '#98683A', chitin: '#5E4A86', chitinDk: '#3F2F5E', wood: '#9A6B45', stone: '#A9A39A' },
    texture: { paper: true, grain: true, boil: 12, jitter: 1 },
    outline: { weight: 1 }, character: { unit: 40, width: 10, height: 8 }, effects: { glow: true, transition: .5 }, output:{height:1080}
  }
});
