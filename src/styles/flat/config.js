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
    texture: {}, outline: { weight: 0 }, character: { unit: 40, width: 10, height: 8, headScale: 1.25 }, effects: { glow: true, longShadow: .9 },
    // Cena K (kit de episódio): rampa por clima de luz. far/mid/near = camadas por paralaxe (esfriam com a distância),
    // light = realce, shadow = cor da sombra e do escurecimento, glow = brilho aditivo das luzes, dim = quanto pessoas e
    // adereços escurecem para shadow. No interior: skyTop/skyLow = parede, far = rodapé, mid/near = madeira, ground = piso.
    moods: {
      dawn: { skyTop: '#4A5F94', skyLow: '#F6B98A', far: '#9C98B8', mid: '#6E8A90', near: '#4E7468', ground: '#5E8A5A', light: '#FFD9A0', shadow: '#2E3558', glow: '#FFC07A', dim: .18 },
      day: { skyTop: '#2E6E96', skyLow: '#F4E3BE', far: '#9CC3C2', mid: '#6FA68A', near: '#4A9064', ground: '#5FAE6B', light: '#FFF4D6', shadow: '#16304A', glow: '#FFE7A8', dim: 0 },
      dusk: { skyTop: '#3A3466', skyLow: '#F08A5A', far: '#9A7890', mid: '#66607C', near: '#46506A', ground: '#506A56', light: '#FFB070', shadow: '#241C38', glow: '#FF9E5A', dim: .28 },
      night: { skyTop: '#0C1430', skyLow: '#2C3E6A', far: '#34446C', mid: '#273656', near: '#1C2A42', ground: '#1E3238', light: '#A8BCE8', shadow: '#0A0F1E', glow: '#FFD27A', dim: .5 },
      interior: { skyTop: '#4A3430', skyLow: '#8A6448', far: '#5A3E30', mid: '#9A6A44', near: '#6A4630', ground: '#5E4030', light: '#FFD08A', shadow: '#22140E', glow: '#FFB860', dim: .3 },
    },
    episodeScenes: ['campo', 'ceu-noturno', 'mar', 'floresta', 'deserto', 'cidade-antiga', 'interior-vela', 'mapa'],
  },
});
