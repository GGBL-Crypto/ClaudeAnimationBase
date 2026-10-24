// exp-toon3d-b2.js: cena B2 do kit toon3d (exp/visual-rico), a do besouro refeita só com dados (toonSet): besouro
// maior no quadro, sol escondido atrás da copa (luz filtrada pelas folhas), nada claro em primeiro plano. 10 s.
(() => {
  const h = (x, z) => .12 * Math.sin(x * .5) + .08 * Math.sin(z * .7 + x * .3) + (z < -9 ? .3 * (-9 - z) : 0);
  const PATH = [[-6, -.6], [-3, -1.2], [0, -.8], [3, -1.4], [6, -1]], S = .7;
  const KEYS = [[0, .9], [4, 2.5], [6.6, 2.5], [10, 4.1]];  // anda, para (olha para a câmera), anda; s em unidades do mundo
  const at0 = s => { const p = makePath(PATH).at(s); return [p.x, h(p.x, p.y), p.y]; };
  let draw;
  window.buildLowpolyScene = art => {
    const St = toonStage(art, { sun: [-.5, .3], bloom: true, gobo: true, sky: ['#4E86B8', '#9CC4D8', '#BFD6B0', '#9DB888'], groundLight: '#5A4A2C', key: 1.9 });
    draw = toonSet(St, {
      area: { x0: -9, x1: 9, z0: -16, z1: 1.5 }, ground: h, biome: 'forest', seed: 8,
      free: [{ a: [-4, .6], b: [4, .9], r: 1.1 }],  // primeiro plano limpo
      color: (x, z) => { const m = .5 + .5 * noise1(4, x * .5 + z * .4); return [m > .62 ? '#7FA048' : '#C8A880', m > .62 ? .3 : 1]; },
      fine: [{ x0: -9, x1: 9, z0: -4, z1: 1.5, seg: [1.5, 3] }],
      ambient: { area: { x0: -6, x1: 6, z0: -7, z1: -2.2 }, dust: 1800, gnats: 12, butterflies: 1, clouds: 0 },
      shots: {
        b1: {
          t0: 0, t1: 10, sun: false, mood: { sky: ['#4E86B8', '#9CC4D8', '#BFD6B0', '#9DB888'], key: 1.9, keyHex: '#FFD9A8', ambient: 1.3, keyDir: [-2, 9, -1] },
          cast: [{ id: 'beetle', look: 'beetle', S, seed: 4, legs: [{ t0: 0, walk: PATH, keys: KEYS, start: .5, stop: .8 }],
            mood: [[0, 'neutro'], [4.3, 'curioso'], [5.6, 'alegre'], [7.2, 'neutro']], turn: [[4.2, 0], [4.7, .9], [6.3, .9], [6.8, 0]], up: [[4.2, 0], [4.7, .22], [6.3, .22], [6.8, 0]],
            lookAt: (t, A) => t > 4.5 && t < 6.5 ? 'eye' : undefined }],
          // Copa baixa por cima do quadro (esconde o sol) e duas árvores atrás.
          trees: [[-1.2, -2.6, 2.1, 1.5, 21], [3.4, -5.5, 3.2, 1.6, 22], [-4.8, -6.5, 3.6, 1.7, 23]],
          camera: (t, A) => { const P = A('beetle'), c = P ? P.head.c : at0(1.2); return [[c[0] - .25, c[1] + .02, c[2]], 1.15 - .25 * ease(seg(t, 3, 5.5)), .14, .4 + .12 * Math.sin(t * .3)]; },
        },
      },
    }).b1;
  };
  shotsById({ b1: (t, lt) => draw(t, lt) });
})();
