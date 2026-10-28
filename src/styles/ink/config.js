// Nanquim: caneta e nanquim sobre papel de caderno pautado, hachura e aguada só nos acentos.
AnimationPlatform.registerStyle({
  id: 'ink', name: 'Nanquim (caneta no caderno)', backend: 'Canvas2D', scripts: ['src/styles/cartoon/engine.js', 'src/styles/ink/draw.js'],
  config: {
    palette: { ink: '#1c1a26', hatch: 'rgba(28,26,38,.82)', paper: '#f2ead3', rule: 'rgba(120,160,205,.55)', margin: 'rgba(208,80,74,.7)', hero: 'rgba(240,122,36,.72)', heroSolid: '#ee7a26', leaf: 'rgba(120,170,70,.55)', leafMini: 'rgba(120,170,70,.4)', sky: 'rgba(110,160,215,.26)', fungus: 'rgba(230,186,90,.6)',
      lilac: 'rgba(170,105,185,.42)', blue: 'rgba(85,130,205,.4)', rose: 'rgba(228,88,118,.5)', bird: 'rgba(90,140,205,.45)', wing: 'rgba(245,175,45,.55)', beetle: 'rgba(60,150,140,.5)', water: 'rgba(120,170,220,.4)', fish: 'rgba(185,150,60,.5)', sock: 'rgba(45,32,28,.55)', sockFar: 'rgba(45,32,28,.4)', pants: 'rgba(55,60,85,.5)', jeans: 'rgba(60,95,160,.5)', brown: 'rgba(125,90,55,.5)', skirt: 'rgba(70,75,120,.45)' },
    texture: { grain: 14 }, outline: { weight: 3 }, character: { unit: 40, width: 10, height: 8 }, effects: {},
  },
});
