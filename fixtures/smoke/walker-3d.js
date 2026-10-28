// Cena de fumaça 3D (kit toon3d sobre lowpoly-3d): um besouro anda 2 s no chão da mata. Bioma, ser, rosto, vida de
// fundo e palco vêm do kit; aqui só relevo, trilho e câmera.
(() => {
  const h = (x, z) => .12 * Math.sin(x * .5) + .08 * Math.sin(z * .7 + x * .3), S = .6;
  const track = track3d([[-6, -.6], [-3, -1.2], [0, -.8], [3, -1.4], [6, -1]], h), KEYS = [[0, 0], [2, 1]];
  let St, world, ambient;
  window.buildLowpolyScene = art => {
    St = toonStage(art, { sun: [-.5, .3], sky: ['#4E86B8', '#9CC4D8', '#BFD6B0', '#9DB888'], groundLight: '#5A4A2C', key: 2.1 });
    world = toonBiome(St, 'forest', { area: { x0: -9, x1: 9, z0: -16, z1: 1.5 }, ground: h, free: [{ a: [-7, -1], b: [7, -1], r: .35 }], seed: 8 });
    ambient = toonAmbient(St, { area: { x0: -6, x1: 6, z0: -7, z1: -2.2 }, ground: h, dust: 400, gnats: 4, butterflies: 0, clouds: 0 });
    St.ground({ x0: -9, x1: 9, z0: -40, z1: 1.5, h, color: () => ['#E8C8A0', 1], rep: 1.4, seg: [2, 4] });
  };
  function walk(t) {
    St.begin(t);
    const m = travel(t, KEYS, { start: .3, stop: .3, seed: 3 }), P = creature3d('beetle', track, (1.2 + m.s) / S, S, t, { seed: 4, moving: m.moving });
    const c = P.head.c;
    St.camera([c[0] - .2, c[1] - .02, c[2]], 1.5, .16, .4);
    world.draw(t, St.E); ambient(t, St.E);
    drawCreature3d(St.E, P, { mood: mood(t, [[0, 'neutro']], 4) });
    St.end();
  }
  shotsById({ walk });
})();
