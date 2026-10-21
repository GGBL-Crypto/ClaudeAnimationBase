AnimationPlatform.registerStyle({
  id: 'pixel', name: 'Pixel art', backend: 'Canvas2D / 320×180', scripts: ['src/styles/pixel/engine.js'],
  validate(config) {
    if (!Number.isInteger(config.texture.scale) || config.texture.scale < 1 || 1920 % config.texture.scale || 1080 % config.texture.scale) throw new Error('Escala de pixel precisa dividir 1920×1080');
    if (!Number.isInteger(config.outline.weight) || config.outline.weight < 1) throw new Error('Contorno de pixel precisa ter espessura inteira positiva');
  },
  config: {
    palette: { sky: '#B1D9E8', cloud: '#F6E8C3', ground: '#82A96B', foliage: '#48775C', ink: '#29304A', body: '#E58A59', shadow: '#B75445', light: '#F4B979', wing: '#F5CC61', wingAccent: '#D96262', eye: '#F6E8C3' },
    texture: { scale: 6, dither: true }, outline: { weight: 1 }, character: { unit: 40, width: 10, height: 8 }, effects: { shadow: true, transition: .5 }
  }
});
