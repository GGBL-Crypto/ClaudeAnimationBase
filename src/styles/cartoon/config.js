AnimationPlatform.registerStyle({
  id: 'cartoon', name: 'Cartoon vetorial', backend: 'Canvas2D / paths', scripts: ['src/styles/cartoon/engine.js'],
  config: {
    palette: { sky: '#C3E8EC', cloud: '#FFF9EA', ground: '#81AE7E', foliage: '#527E69', ink: '#253445', body: '#ED8660', shadow: '#C66048', light: '#FFC89C', wing: '#F4BD4F', wingAccent: '#E97864', eye: '#FFF9EA' },
    texture: { speckles: false }, outline: { weight: 7 }, character: { unit: 40, width: 10, height: 8, radius: 24 }, effects: { shadow: true, transition: .5 }
  }
});
