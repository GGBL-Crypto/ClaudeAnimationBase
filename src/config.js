// Projetos registrados. Hoje só as cenas de fumaça (fixtures/smoke/): 2 s, um ser andando num chão, para os testes e o
// test:visual de cada estilo. Não são exemplos nem filmes.
// duration = seconds; bpm/offset = shared rhythm; fps = export rate.
const SMOKE_NATURE = ['noise', 'path', 'gait', 'creature', 'specs', 'skeleton', 'env', 'crowd', 'actors'].map(f => `src/nature/${f}.js`);
const smokeBoard = event => [{ id: 'walk', start: 0, end: 2, event, transition: 'corte', reads: [{ start: 0, end: 2, text: 'Um ser anda no chão' }] }];
AnimationPlatform.registerProject({
  id: 'smoke-2d', title: 'Fumaça 2D', story: 'Um explorador anda num chão ondulado (quadro F de ExpStyle.draw).',
  duration: 2, fps: 30, bpm: 60, offset: 0, style: 'debug', compatibleStyles: ['debug', 'cartoon', 'stick', 'watercolor', 'flat', 'paper', 'ink', 'silhouette'],
  scripts: [...SMOKE_NATURE, 'fixtures/smoke/walker-2d.js'], reviewTimes: [0, .5, 1, 1.5],
  storyboard: smokeBoard('Um explorador de chapéu e mochila anda da esquerda para a direita.')
});
AnimationPlatform.registerProject({
  id: 'smoke-visit', title: 'Fumaça VisitArt', story: 'Clawd anda no jardim pela porta VisitArt (motores clássicos).',
  duration: 2, fps: 24, bpm: 60, offset: 0, style: 'watercolor-classic', compatibleStyles: ['watercolor-classic', 'cartoon', 'pixel'],
  scripts: [...SMOKE_NATURE, 'fixtures/smoke/walker-visit.js'], reviewTimes: [0, .5, 1, 1.5],
  storyboard: smokeBoard('Clawd anda no jardim, com o passo da marcha.')
});
AnimationPlatform.registerProject({
  id: 'smoke-3d', title: 'Fumaça 3D (toon3d)', story: 'Um besouro do kit toon3d anda no chão da mata.',
  duration: 2, fps: 24, bpm: 60, offset: 0, style: 'lowpoly-3d', compatibleStyles: ['lowpoly-3d'], styleOptions: { 'lowpoly-3d': { effects: { shadowSize: 1024 } } },
  scripts: [...SMOKE_NATURE, ...['creature', 'face', 'textures', 'flora', 'stage', 'ambient'].map(f => `src/styles/toon3d/${f}.js`), 'fixtures/smoke/walker-3d.js'], reviewTimes: [0, .5, 1, 1.5],
  storyboard: smokeBoard('Um besouro anda no chão da mata.')
});
