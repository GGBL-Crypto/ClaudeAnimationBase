// Famílias de 5 tons, do escuro ao claro; entram em palette como <família><0..4>. Volume do boneco: pele, cabelo e roupa.
const ramps = {
  skinL: ['#6a3a4a', '#b06a62', '#e8a882', '#f8cca4', '#fff0d8'], skinM: ['#5a2f45', '#9a5450', '#d08a65', '#f0b48a', '#ffdcb0'], skinD: ['#2a1420', '#4a2630', '#6e3e36', '#925a44', '#b47a58'],
  hairBrown: ['#24142a', '#45202e', '#6e3a30', '#9a5a38', '#c8864a'], hairBlack: ['#0e0a16', '#1c1628', '#2c2440', '#3e3a5c', '#5a5a80'], hairBlond: ['#6a4020', '#a8702c', '#d8a848', '#f0d070', '#fff0b0'],
  grey: ['#3a3848', '#6a6878', '#9a98a4', '#c8c8d0', '#f0f0f4'], blue: ['#1a1a48', '#22388a', '#2c62b8', '#4896d8', '#8cd0f0'], red: ['#3a0e26', '#781a2e', '#b82e30', '#e45a3a', '#ff9a64'],
  green: ['#122a26', '#1e4a30', '#2e6e36', '#58963c', '#9cc452'], yellow: ['#5a341c', '#9a6a1e', '#d8a830', '#ffe070', '#fff8c0'], purple: ['#1e1236', '#3a2058', '#5a3480', '#8058a8', '#a888d0'],
  cream: ['#5a4a6a', '#9a8aa0', '#cfc3b8', '#ece2cc', '#fff8e8'], brown: ['#24162e', '#43263a', '#643a3c', '#8a5644', '#ad7650'], leather: ['#1c1022', '#3a1e28', '#5c3230', '#80503a', '#a66e48'],
};
AnimationPlatform.registerStyle({
  id: 'pixel', name: 'Pixel art', backend: 'Canvas2D / 480×270', scripts: ['src/styles/pixel/engine.js', 'src/styles/pixel/sprites.js', 'src/styles/pixel/draw.js'],
  validate(config) {
    if (!Number.isInteger(config.texture.scale) || config.texture.scale < 1 || 1920 % config.texture.scale || 1080 % config.texture.scale) throw new Error('Escala de pixel precisa dividir 1920×1080');
    if (!Number.isInteger(config.outline.weight) || config.outline.weight < 1) throw new Error('Contorno de pixel precisa ter espessura inteira positiva');
    if (new Set(Object.values(config.palette).map(x => x.toUpperCase())).size > 128) throw new Error('Paleta de pixel passa de 128 cores');
    for (const [mood, ramp] of Object.entries(config.moods)) for (const [role, key] of Object.entries(ramp)) if (!config.palette[key]) throw new Error(`Rampa ${mood}.${role} fora da paleta: ${key}`);
  },
  config: {
    // Paleta fechada (46 + 75 das rampas + blush): as 10 do VisitArt, as rampas do kit de episódio e as famílias de 5 tons do boneco. Degradê só por pontilhado entre duas delas.
    ramps,
    palette: {
      sky: '#B1D9E8', cloud: '#F6E8C3', ground: '#82A96B', foliage: '#48775C', ink: '#29304A', body: '#E58A59', shadow: '#B75445', light: '#F4B979', wing: '#F5CC61', wingAccent: '#D96262', eye: '#F6E8C3',
      black: '#12101E', night0: '#141734', night1: '#222A5A', night2: '#36427C', nightFar: '#282C50', nightMid: '#1B1D38', nightGround: '#1C2A2C',
      duskTop: '#3A1E4E', duskMid: '#8E3A5E', duskLow: '#E8743A', duskFar: '#6A3C6C', duskMid2: '#47285A', duskNear: '#2A1838', duskGround: '#2E2030',
      dawnTop: '#46508E', dawnMid: '#B87494', dawnFar: '#8C7FAE', dawnMid2: '#5D5C8C', dawnNear: '#3B4268', dawnGround: '#4E6448',
      dayTop: '#3C86C8', dayMid: '#72B2E0', dayFar: '#93B8C6', dayMid2: '#6E9C8E',
      wood: '#7A4A30', woodDk: '#4A2C22', flame: '#FFF3B0', stone: '#9A94A0', stoneDk: '#5E5868', sand: '#E6C88E', sandDk: '#B8905A',
      snow: '#EEF2F8', snowShade: '#A9BAD0', sea: '#2E6AA8', seaDk: '#1F3F78', blush: '#f08878',
      ...Object.fromEntries(Object.entries(ramps).flatMap(([f, r]) => r.map((h, i) => [f + i, h]))),
    },
    // Rampa por clima de luz (nomes de cores da paleta): céu de cima, do meio e de baixo, nuvem, longe, meio, perto, chão, luz, sombra, brilho.
    moods: {
      dawn: { skyTop: 'dawnTop', skyMid: 'dawnMid', skyLow: 'light', cloud: 'cloud', cloudDk: 'dawnFar', far: 'dawnFar', mid: 'dawnMid2', near: 'dawnNear', ground: 'dawnGround', light: 'light', shadow: 'ink', glow: 'wing' },
      day: { skyTop: 'dayTop', skyMid: 'dayMid', skyLow: 'sky', cloud: 'cloud', cloudDk: 'snowShade', far: 'dayFar', mid: 'dayMid2', near: 'foliage', ground: 'ground', light: 'cloud', shadow: 'ink', glow: 'wing' },
      dusk: { skyTop: 'duskTop', skyMid: 'duskMid', skyLow: 'duskLow', cloud: 'body', cloudDk: 'duskMid2', far: 'duskFar', mid: 'duskMid2', near: 'duskNear', ground: 'duskGround', light: 'wing', shadow: 'black', glow: 'wing' },
      night: { skyTop: 'night0', skyMid: 'night1', skyLow: 'night2', cloud: 'nightFar', cloudDk: 'nightMid', far: 'nightFar', mid: 'nightMid', near: 'black', ground: 'nightGround', light: 'cloud', shadow: 'black', glow: 'wing' },
      interior: { skyTop: 'night0', skyMid: 'night1', skyLow: 'night2', cloud: 'nightFar', cloudDk: 'nightMid', far: 'woodDk', mid: 'duskNear', near: 'black', ground: 'wood', light: 'flame', shadow: 'black', glow: 'wing' },
    },
    episodeScenes: ['campo', 'ceu-noturno', 'mar', 'floresta', 'deserto', 'cidade-antiga', 'interior-vela', 'mapa'],
    texture: { scale: 4, dither: true }, outline: { weight: 1 }, character: { unit: 40, width: 10, height: 8, headScale: 1.7 }, effects: { shadow: true, transition: .5 }
  }
});
