// Recorte de papel e colagem (exp/estilos): papéis com fibra e grão procedurais, bordas rasgadas ou cortadas à tesoura,
// sombra projetada entre camadas e bonecos articulados em 2 quadros. Canvas2D puro, sem o kit cartoon.
AnimationPlatform.registerStyle({
  id: 'exp-papel', name: 'Recorte de papel', backend: 'Canvas2D', scripts: ['src/styles/cartoon/engine.js', 'src/styles/exp-papel/draw.js'],
  config: {
    palette: {
      core: '#F7F2E6', sky: '#BFDCE0', sun: '#F6C445', cloud: '#FBF8EF', far: '#9DBFB0', hill: '#6FA36A', back: '#5E9650',
      grass: '#4C8E3E', grassDk: '#3A7432', soil: '#A86E46', soilDk: '#8A5536', soilDp: '#6E432C', cave: '#3A2822', stone: '#9A8C7C',
      fungus: '#EDE3C2', fungusDk: '#CDBF98', trunk: '#7A5236', canopy: '#3F8540', path: '#D7B98A',
      ant: '#7E3220', antDk: '#5A2216', antLt: '#B0603A', hero: '#FF7417', heroDk: '#C9500C', leaf: '#62B34A', leafDk: '#3F8A36',
      fly: '#4A4038', wing: '#E8F1F2', eye: '#FFFDF5', ink: '#2A221D', lid: '#D99A70',
      skin: '#E9B48A', skinDk: '#C98E66', hair: '#3A2A20', shirt: '#3F8F8A', shirtDk: '#2F6E6A', pants: '#C8A86A', pantsDk: '#A58750',
      hat: '#9A7240', hatDk: '#6E5030', pack: '#C0442E', packDk: '#923222', boot: '#4A3326', label: '#FBF6E4', line: '#9CC3DA', margin: '#E07A70',
    },
    texture: {}, outline: { weight: 0 }, character: { unit: 40, width: 10, height: 8 }, effects: {},
  },
});
