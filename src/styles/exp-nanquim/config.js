// Nanquim (exp/estilos): caneta e nanquim sobre papel de caderno pautado, hachura e aguada só nos acentos.
AnimationPlatform.registerStyle({
  id: 'exp-nanquim', name: 'Nanquim (caneta no caderno)', backend: 'Canvas2D', scripts: ['src/styles/cartoon/engine.js', 'src/styles/exp-nanquim/draw.js'],
  config: {
    palette: { ink: '#1c1a26', hatch: 'rgba(28,26,38,.82)', paper: '#f2ead3', rule: 'rgba(120,160,205,.55)', margin: 'rgba(208,80,74,.7)', hero: 'rgba(240,122,36,.72)', heroSolid: '#ee7a26', leaf: 'rgba(120,170,70,.55)', leafMini: 'rgba(120,170,70,.4)', sky: 'rgba(110,160,215,.26)', fungus: 'rgba(230,186,90,.6)' },
    texture: { grain: 14 }, outline: { weight: 3 }, character: { unit: 40, width: 10, height: 8 }, effects: {},
  },
});
