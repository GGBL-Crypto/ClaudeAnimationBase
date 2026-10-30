AnimationPlatform.registerStyle({
  id: 'pixel', name: 'Pixel art', backend: 'Canvas2D / 320×180', scripts: ['src/styles/pixel/engine.js', 'src/styles/pixel/sprites.js', 'src/styles/pixel/draw.js'],
  validate(config) {
    if (!Number.isInteger(config.texture.scale) || config.texture.scale < 1 || 1920 % config.texture.scale || 1080 % config.texture.scale) throw new Error('Escala de pixel precisa dividir 1920×1080');
    if (!Number.isInteger(config.outline.weight) || config.outline.weight < 1) throw new Error('Contorno de pixel precisa ter espessura inteira positiva');
    if (new Set(Object.values(config.palette).map(x => x.toUpperCase())).size > 48) throw new Error('Paleta de pixel passa de 48 cores');
    for (const [mood, ramp] of Object.entries(config.moods)) for (const [role, key] of Object.entries(ramp)) if (!config.palette[key]) throw new Error(`Rampa ${mood}.${role} fora da paleta: ${key}`);
  },
  config: {
    // Paleta fechada (45 cores): as 10 do VisitArt e as rampas do kit de episódio. Degradê só por pontilhado entre duas delas.
    palette: {
      sky: '#B1D9E8', cloud: '#F6E8C3', ground: '#82A96B', foliage: '#48775C', ink: '#29304A', body: '#E58A59', shadow: '#B75445', light: '#F4B979', wing: '#F5CC61', wingAccent: '#D96262', eye: '#F6E8C3',
      black: '#12101E', night0: '#141734', night1: '#222A5A', night2: '#36427C', nightFar: '#282C50', nightMid: '#1B1D38', nightGround: '#1C2A2C',
      duskTop: '#3A1E4E', duskMid: '#8E3A5E', duskLow: '#E8743A', duskFar: '#6A3C6C', duskMid2: '#47285A', duskNear: '#2A1838', duskGround: '#2E2030',
      dawnTop: '#46508E', dawnMid: '#B87494', dawnFar: '#8C7FAE', dawnMid2: '#5D5C8C', dawnNear: '#3B4268', dawnGround: '#4E6448',
      dayTop: '#3C86C8', dayMid: '#72B2E0', dayFar: '#93B8C6', dayMid2: '#6E9C8E',
      wood: '#7A4A30', woodDk: '#4A2C22', flame: '#FFF3B0', stone: '#9A94A0', stoneDk: '#5E5868', sand: '#E6C88E', sandDk: '#B8905A',
      snow: '#EEF2F8', snowShade: '#A9BAD0', sea: '#2E6AA8', seaDk: '#1F3F78',
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
    texture: { scale: 6, dither: true }, outline: { weight: 1 }, character: { unit: 40, width: 10, height: 8, headScale: 1.7 }, effects: { shadow: true, transition: .5 }
  }
});
