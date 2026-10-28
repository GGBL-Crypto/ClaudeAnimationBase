// Flat vetorial de divulgação científica: formas geométricas sem contorno, gradientes suaves, brilho aditivo
// nas luzes, sombras longas do sol e camadas que esfriam com a distância. Canvas2D puro, sem o kit cartoon.
AnimationPlatform.registerStyle({
  id: 'flat', name: 'Flat vetorial (ciência)', backend: 'Canvas2D', scripts: ['src/styles/cartoon/engine.js', 'src/styles/flat/draw.js'],
  config: {
    palette: {
      skyTop: '#2E6E96', skyLow: '#F4E3BE', haze: '#BFDCD8', sun: '#FFE7A8', cloud: '#FBF6EA', cloudDk: '#D9E6E6',
      far: '#7FAFB4', mid: '#5E9C84', grass: '#5FAE6B', grassLt: '#9BD48A', grassDk: '#2F7A5A',
      soil: '#A8643C', soilDk: '#3A2A3E', soilLt: '#C98A58', cave: '#2A1D2C', fungus: '#EFE9D2', fungusDk: '#C9C1A4',
      ant: '#A0442C', antDk: '#62281F', antLt: '#D27A52', hero: '#FF7A1F', heroDk: '#C24A12', heroLt: '#FFC56A',
      leaf: '#6CC06A', leafDk: '#3E8F4E', leafLt: '#B8E68E', fly: '#3D3340', flyLt: '#7C6A80', wing: '#E4F4FF',
      skin: '#F0B48A', skinDk: '#D08A64', shirt: '#E9A83A', shirtDk: '#B97A1E', pants: '#3D5A73', pantsDk: '#2A3F52',
      hat: '#D9C08A', hatDk: '#A88E58', pack: '#D8603E', packDk: '#A8402A', boot: '#5A3A2E', hair: '#4A3026', ink: '#1F2430', path: '#D8B98A',
    },
    texture: {}, outline: { weight: 0 }, character: { unit: 40, width: 10, height: 8 }, effects: { glow: true, longShadow: .9 },
  },
});
