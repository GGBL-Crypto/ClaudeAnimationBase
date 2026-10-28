// Cena de fumaça dos motores com a porta VisitArt (watercolor-classic, cartoon, pixel): Clawd anda pelo jardim. O passo
// vem de creaturePose (footAt e skeleton.js): x da pelve e o sobe-desce dela viram x e dy do ator.
(() => {
  const S = 240, PATH = makePath([[0, 850], [4000, 850]]), ground = () => 850;
  const at = t => creaturePose(humanSpec('adult'), { path: PATH, s: 2.4 + .8 * t, size: S, ground, t, seed: 5, moving: 1 }).joints.pelvis;
  const rest = at(0)[1];
  function scene(t) {
    const u = STYLE.character.unit, [x, y] = at(t);
    VisitArt.background(t);
    VisitArt.actor({ x, y: 850, u, sq: 0, dy: (y - rest) / u, squint: 0, eyes: 'normal', lookX: .8, lookY: 0, aL: -.35 + .3 * Math.sin(t * 6), aR: -.6 - .3 * Math.sin(t * 6) });
    window.frameDiagnostics = { time: t, pelvis: [x, y] };
  }
  shots([[0, scene]]);
})();
