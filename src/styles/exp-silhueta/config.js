// Teatro de sombras (exp/estilos): recortes pretos com pinos nas juntas sobre uma tela de papel em contraluz.
AnimationPlatform.registerStyle({
  id: 'exp-silhueta', name: 'Teatro de sombras', backend: 'Canvas2D', scripts: ['src/styles/cartoon/engine.js', 'src/styles/exp-silhueta/draw.js'],
  config: {
    // lamp* = [centro, meio, borda] da luz atrás da tela: A superfície, U subsolo, H trilha do explorador.
    palette: { ink: '#140c0a', lampA: ['#fff1c4', '#f0a04a', '#4a1a0c'], lampU: ['#dff6e2', '#5aa892', '#0b2624'], lampH: ['#ffe6b4', '#e4743e', '#36100c'], hero: '#c8461c', heroLeaf: '#86b83a', glow: 'rgba(255,238,180,.95)' },
    texture: { fibers: 2600 }, outline: { weight: 0 }, character: { unit: 40, width: 10, height: 8 }, effects: { blur: 3, flicker: .03 },
  },
});
