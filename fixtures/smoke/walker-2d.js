// Cena de fumaça 2D (só testes e test:visual): um explorador anda 2 s num chão ondulado, pés pela marcha (footAt, via
// creaturePose) e ossos de skeleton.js. Monta o quadro F que todo estilo 2D desenha com ExpStyle.draw (contrato em
// src/styles/AGENTS.md). Cena 'H' (trilha), a de mundo mais simples: só ground e antGround.
var EST = (() => {
  const g = x => 905 + 8 * Math.sin(x * .0035 + .5), S = 500, PATH = makePath([[-800, 0], [3200, 0]]);
  const s = t => 2.6 + .7 * t;  // BL: anda a .7 BL/s o tempo todo, dentro do quadro
  function frame(scene, t) {
    const pose = creaturePose(humanSpec('adult'), { path: PATH, s: s(t), size: S, ground: g, t, seed: 3, moving: 1 });
    return { scene: 'H', shot: 'trail', t, lt: t, cam: { cx: 960, cy: 540, z: 1 }, world: { ground: g, antGround: x => g(x) + 45 }, texts: [],
      actors: [{ id: 'human', kind: 'human', role: 'explorer', gear: ['hat', 'backpack'], layer: 1, depth: 0, pose, track: PATH.at(s(t) * S), ground: g }] };
  }
  return { frame, times: {}, specs: {} };
})();
// Fora do navegador (verificador de movimento) não há timeline.
if (typeof shotsById === 'function') shotsById({ walk: t => ExpStyle.draw(EST.frame('H', t)) });
