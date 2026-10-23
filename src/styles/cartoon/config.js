AnimationPlatform.registerStyle({
  id: 'cartoon', name: 'Cartoon vetorial', backend: 'Canvas2D / paths', scripts: ['src/styles/cartoon/engine.js', 'src/styles/cartoon/kit.js', 'src/styles/cartoon/parts.js', 'src/styles/cartoon/nature.js'],
  config: {
    palette: { sky: '#C3E8EC', cloud: '#FFF9EA', ground: '#81AE7E', foliage: '#527E69', ink: '#253445', body: '#ED8660', shadow: '#C66048', light: '#FFC89C', wing: '#F4BD4F', wingAccent: '#E97864', eye: '#FFF9EA', groundDk: '#5F8C60', grass: '#6FA86A', grassDk: '#4F8552', leaf: '#5E9A62', leafDk: '#3F7448', water: '#6FB7D6', skyTop: '#7CC3E3', skyLow: '#F3EDD4', skin: '#F2B58D', skinDk: '#D08F69', hair: '#5A3A2E', cloth: '#4F8FC0', clothDk: '#376A94', fur: '#C9935A', furDk: '#9C6A3A', chitin: '#6B4A7A', chitinDk: '#4A3258', wood: '#9A6B45', stone: '#9AA3A8', sun: '#FFF0C4', shade: '#3B4272', blush: '#F08A7A', line: '#17171C', hero: '#E0352B', olive: '#8F8C38', oliveDk: '#5F5D22', mustard: '#F4B42E', shorts: '#3E8C5C', boot: '#7B4A2B', bootDk: '#43271A', cream: '#F7E7C0', patch: '#8A5230', gold: '#F6C833' },
    texture: { speckles: false }, outline: { weight: 6 }, character: { unit: 40, width: 10, height: 8, radius: 24 }, effects: { shadow: true, transition: .5 }
  }
});
