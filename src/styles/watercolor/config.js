AnimationPlatform.registerStyle({
  id: 'watercolor', name: 'Aquarela', backend: 'p5.brush / WebGL',
  assetModule:'src/styles/watercolor/assets.js',
  validate(config){if(![720,1080].includes(config.output.height))throw Error('Aquarela: output.height deve ser 720 ou 1080');},
  scripts: ['node_modules/p5/lib/p5.min.js', 'src/styles/watercolor/bootstrap.js', 'node_modules/p5.brush/dist/p5.brush.js', 'src/core.js', 'src/clawd.js', 'src/styles/watercolor/engine.js', 'src/sheets.js'],
  config: {
    palette: { paper: '#F3EBDC', ink: '#2B2233', clay: '#D97757', clayDk: '#A84D33', clayLt: '#F2A283', night: '#1F2550', indigo: '#2F3C7A', rose: '#E27A92', ochre: '#E8AA38', sap: '#6E9F58', teal: '#3A9C98', violet: '#7B5CA8', cream: '#FFF5E2', sky: '#8EC3E6' },
    texture: { paper: true, grain: true, boil: 12, jitter: 1 },
    outline: { weight: 1 }, character: { unit: 40, width: 10, height: 8 }, effects: { glow: true, transition: .5 }, output:{height:1080}
  }
});
