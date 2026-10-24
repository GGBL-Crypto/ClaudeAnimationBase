// exp-toon3d-b.js: cena B do kit toon3d (exp/visual-rico). Um besouro atravessa o chão da mata, para, olha para a câmera
// e segue; 10 s sem narração. Tudo vem do kit: bioma, ser, rosto, vida de fundo, palco. Aqui só relevo, trilho e câmera.
(() => {
  const h = (x, z) => .12 * Math.sin(x * .5) + .08 * Math.sin(z * .7 + x * .3) + (z < -9 ? .3 * (-9 - z) : 0);
  const PATH = [[-6, -.6], [-3, -1.2], [0, -.8], [3, -1.4], [6, -1]], track = track3d(PATH, h), S = .6;
  const KEYS = [[0, 0], [4, 1.6], [6.6, 1.6], [10, 3.2]];  // anda, para (olha), anda; s em unidades do mundo
  const MOOD = [[0, 'neutro'], [4.3, 'curioso'], [5.6, 'alegre'], [7.2, 'neutro']];
  let St, world, ambient;
  window.buildLowpolyScene = art => {
    St = toonStage(art, { sun: [-.5, .3], bloom: true, gobo: true, sky: ['#4E86B8', '#9CC4D8', '#BFD6B0', '#9DB888'], groundLight: '#5A4A2C', key: 2.1 });
    const free = [{ a: [-7, -1], b: [7, -1], r: .35 }, { a: [.6, -.9], r: .7 }];
    world = toonBiome(St, 'forest', { area: { x0: -9, x1: 9, z0: -16, z1: 1.5 }, ground: h, free, seed: 8, gobo: true });
    ambient = toonAmbient(St, { area: { x0: -6, x1: 6, z0: -7, z1: -2.2 }, ground: h, dust: 1800, gnats: 12, butterflies: 1, clouds: 0 });
    const color = (x, z) => { const m = .5 + .5 * noise1(4, x * .5 + z * .4); return [m > .62 ? '#7FA048' : '#E8C8A0', m > .62 ? .3 : 1]; };  // terra com manchas de musgo
    St.ground({ x0: -9, x1: 9, z0: -4, z1: 1.5, h, color, rep: 1.4, seg: [2, 4] });
    St.ground({ x0: -9, x1: 9, z0: -40, z1: -3.8, h, color, rep: 1.4, seg: .5, dy: -.005 });
  };
  function b1(t) {
    St.begin(t);
    const m = travel(t, KEYS, { start: .5, stop: .8, seed: 3 }), look = .9 * ease(seg(t, 4.2, 4.7)) * (1 - ease(seg(t, 6.3, 6.8)));
    const P = creature3d('beetle', track, (1.2 + m.s) / S, S, t, { seed: 4, moving: m.moving, look, up: .25 * look });
    const c = P.head.c;
    St.camera([c[0] - .2, c[1] - .02, c[2]], 1.5 - .35 * ease(seg(t, 3, 5.5)), .16, .4 + .12 * Math.sin(t * .3));
    world.draw(t, St.E); ambient(t, St.E);
    drawCreature3d(St.E, P, { mood: mood(t, MOOD, 4), lookAt: look > .5 ? St.E.eye : undefined });
    St.end();
  }
  shotsById({ b1 });
})();
