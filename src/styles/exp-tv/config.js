// Cartoon TV (exp/estilos): o C2 do c01 de sauva-operaria polido, com o kit e a paleta do cartoon.
AnimationPlatform.registerStyle({
  id: 'exp-tv', name: 'Cartoon TV (C2 polido)', backend: 'Canvas2D / paths', scripts: ['src/styles/cartoon/engine.js', 'src/styles/cartoon/kit.js', 'src/styles/cartoon/parts.js', 'src/styles/cartoon/nature.js', 'src/styles/exp-tv/draw.js'],
  config: {
    palette: { sky: '#C3E8EC', cloud: '#FFF9EA', ground: '#7DBA62', foliage: '#3F8A4F', ink: '#253445', body: '#ED8660', shadow: '#C66048', light: '#FFC89C', wing: '#F4BD4F', wingAccent: '#E97864', eye: '#FFF9EA', groundDk: '#4C8F44', grass: '#68B05A', grassDk: '#3F8A43', leaf: '#52A250', leafDk: '#2F7A3C', water: '#6FB7D6', skyTop: '#7CC3E3', skyLow: '#F3EDD4', skin: '#F2B58D', skinDk: '#D08F69', hair: '#5A3A2E', cloth: '#4F8FC0', clothDk: '#376A94', fur: '#C9935A', furDk: '#9C6A3A', chitin: '#6B4A7A', chitinDk: '#4A3258', wood: '#9A6B45', stone: '#9AA3A8', sun: '#FFF0C4', shade: '#3B4272', blush: '#F08A7A', line: '#17171C', hero: '#E0352B', olive: '#8F8C38', oliveDk: '#5F5D22', mustard: '#F4B42E', shorts: '#3E8C5C', boot: '#7B4A2B', bootDk: '#43271A', cream: '#F7E7C0', patch: '#8A5230', gold: '#F6C833', purple: '#8A55C4', purpleDk: '#5C3590', sauva: '#B4452B', sauvaDk: '#7A2A1C', sauvaHero: '#FF6A1F', orange: '#F28A2C', orangeDk: '#C9601C', brown: '#9C5E34' },
    texture: { speckles: false }, outline: { weight: 6 }, character: { unit: 40, width: 10, height: 8, radius: 24 }, effects: { shadow: true, transition: .5 }
  }
});
