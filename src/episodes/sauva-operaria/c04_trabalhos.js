// c04_trabalhos.js: capítulo 4 de sauva-operaria (Os primeiros trabalhos), planos c4s01–c4s05.
// Ela leva lixo pelo túnel até a câmara de lixo, solta a bolinha e sai; o corte do solo recua até mostrar a câmara funda;
// jardim de fungo com as jardineiras, de perto e de longe; o Escovopsis cresce, ela se assusta; as irmãs o vencem.
(() => {
  const P = STYLE.palette, A = () => NatureArt;
  // Protagonista: mesmas constantes em todos os capítulos (copie sem mudar).
  const at = id => PROJECT.storyboard.find(s => s.id === id).start;
  const SEED = 7, LOOK = { color: P.sauvaHero, dark: mixCol(P.sauvaHero, P.ink, .35) };
  const BORN = at('c3s04'), DIES = at('c8s01'), age = t => clamp((t - BORN) / (DIES - BORN));
  const her = o => creaturePose(SPECS.ant, { seed: SEED, age: age(o.t), ...o });
  // Início da fala j do plano: os momentos-chave caem aqui.
  const rd = (id, j) => PROJECT.storyboard.find(s => s.id === id).reads[j].start;

  // ---------- ajudas do capítulo ----------
  const hand = t => ({ t, k: .6, seed: 5 });
  const c = animationEngine.context;
  const SOIL = mixCol(P.wood, P.ink, .35), PEB = mixCol(P.wood, P.ink, .5), CAVE = mixCol(P.wood, P.ink, .15), RIM = mixCol(P.wood, P.ink, .6);
  const BALL = mixCol(P.wood, P.ink, .62), MOLD = mixCol(P.leafDk, P.ink, .68), MOLD2 = mixCol(MOLD, P.wood, .35);
  const REFUSE = [mixCol(P.wood, P.ink, .6), mixCol(P.stone, P.ink, .35), mixCol(P.leafDk, P.ink, .55), mixCol(P.cream, P.wood, .5)];
  const view = (cx, zoom) => [cx - W / 2 / zoom - 80, cx + W / 2 / zoom + 80];
  const toScreen = (x, y, [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
  // Capim entre x0 e x1 sobre gy (o grass() de c01).
  function grass(t, x0, x1, gy, step, h0, h1) {
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      const x = k * step + .5 * step * hash(k + 3), y = gy(x) + 3;
      A().blade(x, y, h0 + (h1 - h0) * hash(k + 7), bladeBend(t, x, y, [], 60, 3), k & 1 ? P.grass : P.grassDk);
    }
  }
  // Move a cabeça (e as antenas) depois de creaturePose; da > 0 baixa o olhar (o nod() de c01).
  function nod(p, dx, dy, da) {
    const hx = p.head.x + p.facing * dx * p.size, hy = p.head.y + dy * p.size, a = p.facing * da, co = Math.cos(a), si = Math.sin(a);
    const move = ([x, y]) => { x += hx - p.head.x; y += hy - p.head.y; return [hx + (x - hx) * co - (y - hy) * si, hy + (x - hx) * si + (y - hy) * co]; };
    for (const ap of SPECS[p.spec].appendages) if (ap.attach === 'head') p.appendages[ap.name] = p.appendages[ap.name].map(move);
    p.head = { x: hx, y: hy, angle: p.head.angle + a };
    return p;
  }
  // Poeira das pisadas do último meio segundo (dust() de c01).
  function dust(spec, sOf, poseAt, t, seed) {
    const gait = GAITS[spec.gait], vary = { ...ORGANIC, ...spec.organic }.vary;
    for (const lb of spec.limbs) if (lb.foot) for (const te of stepEvents(sOf, t - .5, t, gait.offsets[lb.key || lb.name], spec.stride, gait.duty, vary, seed + 501)) {
      const f = poseAt(te).limbs[lb.name].end; A().dust(f[0], f[1], (t - te) / .5, Math.floor(f[0]));
    }
  }
  // Grão de terra que cai do teto de tempos em tempos (o grains() de c01, com raio r).
  function grains(t, x0, x1, top, floor, n, seed, r = 4) {
    for (let i = 0; i < n; i++) {
      const per = 2.6 + 1.5 * hash(seed + i), u = frac(t / per + hash(seed + i + 9)), x = lerp(x0, x1, hash(seed + i * 3 + Math.floor(t / per + hash(seed + i + 9))));
      if (u < .35) Kit.ellipse(x, lerp(top, floor, u / .35), r, r, mixCol(P.wood, P.cream, .25));
    }
  }
  // Terra em ladrilhos fixos no mundo (tile px, sc = escala das pedrinhas): as pedrinhas não nadam quando a câmera anda.
  // Longe (z pequeno), menos pedrinhas por ladrilho.
  function soil(x0, x1, y0, y1, tile, sc, z, seed) {
    c.fillStyle = SOIL; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    const n = z < .5 ? 14 : 40;
    for (let i = Math.floor(x0 / tile); i * tile < x1; i++) for (let j = Math.floor(y0 / tile); j * tile < y1; j++) for (let k = 0; k < n; k++) {
      const h = seed + i * 73.1 + j * 19.7 + k * 3.3, px = (i + hash(h)) * tile, py = (j + hash(h + .5)) * tile, r = (3 + 7 * hash(h + .9)) * sc;
      if (py < y0 + r || r * z < 1) continue;
      c.beginPath(); c.ellipse(px, py, r * 1.3, r, hash(h + .2) * 3, 0, TAU); c.fillStyle = k % 3 ? PEB : P.stone; c.fill();
    }
  }
  // Bolinha de lixo (na boca de p, ou solta em x, y): contorno em proporção, sem o traço fixo do Kit.
  const mouth = p => [p.head.x + p.facing * .17 * p.size, p.head.y + .07 * p.size];
  function ball(x, y, r) {
    Kit.ellipse(x, y, r * 1.18, r * 1.08, P.line);
    Kit.ellipse(x, y, r, .9 * r, BALL);
    Kit.ellipse(x - .3 * r, y - .3 * r, .22 * r, .16 * r, REFUSE[3]);
  }
  // Escovopsis: mancha escura de raio R em (x, y) sobre o fungo: borrões irregulares, fios finos (hifas) em volta e
  // esporos claros; respira devagar.
  function mold(x, y, R, t, seed) {
    if (R < 2) return;
    for (let i = 0; i < 18; i++) {
      const a = TAU * hash(seed + i * 1.3), r0 = .45 * R * hash(seed + i * 2.1), L = R * (.45 + .55 * hash(seed + i * 3.7));
      Kit.line(Array.from({ length: 4 }, (_, j) => { const u = j / 3, b = a + .5 * noise1(seed + i, t * .5 + u * 3); return [x + Math.cos(a) * r0 + Math.cos(b) * L * u, y + (Math.sin(a) * r0 + Math.sin(b) * L * u) * .8]; }), MOLD, Math.max(1.5, .022 * R), { alpha: .85 });
    }
    for (let i = 0; i < 15; i++) {
      const a = i * 2.4, d = R * .75 * Math.sqrt(hash(seed + i * 7.1)), r = R * (.16 + .18 * hash(seed + i * 4.3)) * (1 + .05 * Math.sin(t * 1.7 + i));
      Kit.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, r, .8 * r, i % 3 ? MOLD : MOLD2, { rot: a });
    }
    for (let i = 0; i < 10; i++) Kit.ellipse(x + R * .9 * (hash(seed + i) - .5), y + R * .7 * (hash(seed + i + 9) - .5), R * .045, R * .045, mixCol(MOLD, P.cloud, .55));
  }
  // Fundo de uma câmara vista de dentro, em close: terra nos cantos, a cavidade e o chão reto em fy.
  function cave(cx, cy, z, fy, seed) {
    const [x0, x1] = view(cx, z), y0 = cy - H / 2 / z - 80, y1 = cy + H / 2 / z + 80;
    soil(x0, x1, y0, y1, 900, 3, z, seed);
    A().chamber(cx * .3 + 840, fy + 300, 3400, 1500, seed);
    // Parede do fundo: manchas e torrões apagados, fixos no mundo.
    for (let i = Math.floor(x0 / 260); i * 260 < x1; i++) { const x = (i + hash(i + seed)) * 260, y = lerp(y0 + 60, fy - 60, hash(i * 1.7 + seed)), r = 20 + 50 * hash(i * 2.3 + seed); Kit.ellipse(x, y, 1.4 * r, r, RIM, { alpha: .18, rot: hash(i + 4) * 3 }); }
    const fl = []; for (let x = x0; x <= x1 + 40; x += 40) fl.push([x, fy + 6 * Math.sin(x * .01 + seed)]);
    Kit.poly([...fl, [x1 + 40, y1 + 200], [x0, y1 + 200]], mixCol(P.wood, P.ink, .3), { stroke: false });
    Kit.line(fl, RIM, 10);
  }

  // ---------- mundo do corte do solo (c4s01 aberto, c4s02b, c4s03b) ----------
  const SN = x => 10 * Math.sin(x * .004), HN = 100;
  const FA = [-250, 900, 1000, 420], FB = [1300, 1250, 1100, 450], FC = [2900, 950, 1000, 420], WC = [1500, 4000, 1500, 650];
  const TUNN = [
    [[900, 0], [880, 300], [700, 600], [400, 800], [-80, 860]],
    [[700, 600], [1000, 660], [1240, 820]],
    [[1830, 1160], [2300, 1020], [2450, 920]],
    [[-120, 880], [-350, 1500], [-550, 2300], [-650, 2850], [-450, 3100], [200, 3450], [800, 3786]],
    [[2200, 3620], [2500, 3300], [2650, 2600], [2900, 1900], [2950, 960]],
  ];
  const TUNP = TUNN.map(makePath);
  // Chão do túnel do lixo (o caminho dela): a linha do meio baixada, e dentro da câmara até o monte.
  // Chão (borda de baixo) de uma câmara do corte, pela elipse de chamber(); na de lixo, o monte de chamber(..., 1).
  const floorOf = ([x, y, w, h]) => gx => Math.min(y, y - h / 2 + .96 * h / 2 * Math.sqrt(Math.max(0, 1 - ((gx - x) / (w / 2)) ** 2)));
  const gFB = floorOf(FB), gW = x => Math.min(floorOf(WC)(x), WC[1] - .45 * WC[3] * (1 - ((x - WC[0]) / (.42 * WC[2])) ** 2));
  const PW_T = [[-650, 2880], [-450, 3128], [200, 3478], [800, 3812]], PW_H = Array.from({ length: 11 }, (_, i) => [830 + 27 * i, gW(830 + 27 * i) + 4]);
  const PW = makePath([...PW_T, ...PW_H]), PW_END = PW.length, PW_IN = makePath(PW_T).length, PWR = makePath([...PW_T, ...PW_H].reverse());
  // Desenha o corte inteiro; beings(x0, x1) pinta os seres de cada plano por cima do escuro.
  function nest(t, [cx, cy, z], beings) {
    const [x0, x1] = view(cx, z), y0 = cy - H / 2 / z - 80, y1 = cy + H / 2 / z + 80;
    Kit.gradient();
    Kit.cam(cx, cy, z, 0, hand(t));
    if (y0 < 60) { A().ground(SN, x0, x1); grass(t, Math.max(x0, -3000), x1, SN, 22 / Math.max(z, .3), 18, 40); }
    soil(x0, x1, Math.max(y0, 40), y1, 600, 1, z, 11);
    for (const p of TUNP) A().tunnel(p, 80);
    for (const [x, y, w, h] of [FA, FB, FC]) A().chamber(x, y, w, h, x);
    A().chamber(...WC, 4, 1);
    if (y0 < 400) { A().roots(-900, 30, 520, 1, 5); A().roots(2150, 30, 420, 1, 8); }
    A().fungus(FA[0], FA[1], 700, 280, t, 3); A().fungus(FB[0], FB[1], 760, 300, t, 22); A().fungus(FC[0], FC[1], 680, 270, t, 5);
    grains(t, 900, 2100, 3420, 3990, 3, 41, 5); grains(t, 1000, 1600, 840, 1240, 2, 47, 5);
    // Fundo: irmãs pequenas nos túneis de cima (forma simples de longe).
    [0, 1, 2].forEach(i => { const p = TUNP[i]; for (const a of crowd(p, t, 3, 50 + i, { speed: 40, spacing: p.length / 3, carryEvery: 2, sizeVar: .1 })) { const sz = 60 * a.size; A().creature(creaturePose(SPECS.ant, { path: p, s: a.s / sz, size: sz, t, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null })); } });
    // Subsolo escuro (GUIA c4); os seres do plano ficam por cima, legíveis.
    Kit.poly([[x0, 40], [x1, 40], [x1, y1], [x0, y1]], P.shade, { stroke: false, alpha: .25 });
    if (beings) beings(x0, x1);
    Kit.camEnd();
  }

  // ---------- c4s01: no túnel, ela leva a bolinha; recua e corta para a câmara de lixo ----------
  const t1 = at('c4s01'), HS1 = 760, CUT1 = rd('c4s01', 1) - .25, OUT1 = CUT1 - .6;
  const gT = x => 700 + .25 * x + 14 * Math.sin(x * .006), topT = x => gT(x) - 540 + 30 * Math.sin(x * .004 + 1);
  const HP1 = makePath([[-3000, 0], [9000, 0]]), HK1 = [[t1 - 1, 4.2], [CUT1 + .5, 4.2 + 1.6 * (CUT1 + 1.5 - t1)]], HO1 = { start: .3, stop: 0, seed: 41 };
  const hs1 = t => travel(t, HK1, HO1).s;
  const PASS1 = t1 + 4;  // a irmã que sobe cruza com ela
  function hero1(t) {
    const m = travel(t, HK1, HO1), hitch = spring(t, t1 + 5.8, 7, 14);
    const greet = Math.max(0, 1 - Math.abs(t - PASS1) / .6);
    return nod(her({ path: HP1, s: m.s, size: HS1, ground: gT, t, moving: m.moving, lean: m.lean, antennae: greet > .1 ? 'tap' : 'explore', sq: .05 * hitch }), 0, .02 * greet, .15 * greet);
  }
  function close1(t) {
    const p = hero1(t), hx = p.head.x;
    const z = lerp(1, .32, easeIn(seg(t, OUT1, CUT1))), cx = hx + 120, cy = gT(hx) - 330;
    const [x0, x1] = view(cx, z), y0 = cy - H / 2 / z - 80, y1 = cy + H / 2 / z + 80;
    Kit.cam(cx, cy, z, 0, hand(t));
    soil(x0, x1, y0, y1, 900, 3, z, 13);
    for (let k = Math.floor(x0 / 1400); k * 1400 < x1; k++) { const rx = k * 1400 + 500 * hash(k + 5); A().roots(rx, topT(rx) - 700, 560, 1, k + 20); }
    const top = [], bot = []; for (let x = x0; x <= x1 + 40; x += 40) { top.push([x, topT(x)]); bot.push([x, gT(x) + 30]); }
    Kit.poly([...top, ...bot.slice().reverse()], CAVE, { stroke: false });
    Kit.line(top, RIM, 18); Kit.line(bot, RIM, 18);
    for (let i = 0; i < 4; i++) { const per = 2.3 + hash(i + 60), u = frac(t / per + hash(i + 61)), gx = hx - 600 + 1500 * hash(i + 62 + Math.floor(t / per + hash(i + 61))); if (u < .4) Kit.ellipse(gx, lerp(topT(gx) + 10, gT(gx) + 20, u / .4), 9, 9, mixCol(P.wood, P.cream, .25)); }
    // A irmã que vem de baixo, um pouco atrás dela.
    const sx = hs1(PASS1) * HS1 - 3000 - 1.1 * HS1 * (t - PASS1), SP = makePath([[9000, 0], [-3000, 0]]);
    if (Math.abs(sx - cx) < W / z) A().creature(nod(creaturePose(SPECS.ant, { path: SP, s: (9000 - sx) / 520, size: 520, ground: x => gT(x) - 75, t, seed: 33, antennae: Math.abs(t - PASS1) < .6 ? 'tap' : 'explore' }), 0, 0, .1));
    A().creature(p, LOOK);
    ball(...mouth(p), .075 * HS1);
    dust(SPECS.ant, hs1, hero1, t, SEED);
    Kit.camEnd();
    Kit.flash(.25, P.shade);
  }
  const HK1W = [[CUT1 - 1, (PW_IN - 520) / HN], [t1 + 13.3, PW_END / HN]];
  function c4s01(t) {
    if (t < CUT1) return close1(t);
    const k = ease(seg(t, CUT1, CUT1 + 2.4)), cam = [lerp(560, 1160, k), lerp(3580, 3700, k), lerp(1.8, 1.35, k) + .05 * ease(seg(t, CUT1 + 2.4, t1 + 14))];
    nest(t, cam, () => {
      // Irmãs do lixo: uma solta a sua bolinha no monte, outra sobe pelo túnel da direita.
      const DROP = rd('c4s01', 1) + 2.3, SPW = makePath([[2300, 0], [1300, 0]]);
      const ms = travel(t, [[t1, 0], [DROP - .2, 7.6]], { start: .3, stop: .5, seed: 5 });
      const sp = nod(creaturePose(SPECS.ant, { path: SPW, s: ms.s, size: HN, ground: gW, t, seed: 44, moving: ms.moving, antennae: 'tap' }), 0, .02 * ease(seg(t, DROP - .5, DROP)), .3 * ease(seg(t, DROP - .5, DROP)));
      A().creature(sp);
      const m0 = mouth(sp);
      if (t < DROP) ball(...m0, 7.5); else { const u = seg(t, DROP, DROP + .35); ball(m0[0] + 10 * u, lerp(m0[1], gW(m0[0] + 10) - 6, easeIn(u)), 7.5); }
      for (const a of crowd(TUNP[4], t, 2, 61, { speed: 45, spacing: TUNP[4].length / 2, carryEvery: 99 })) A().creature(creaturePose(SPECS.ant, { path: TUNP[4], s: a.s / HN, size: HN, t, seed: a.seed }));
      const m = travel(t, HK1W, { start: .2, stop: .6, seed: 42 }), p = her({ path: PW, s: m.s, size: HN, t, moving: m.moving, lean: m.lean });
      A().creature(p, LOOK);
      ball(...mouth(p), 7.5);
    });
  }

  // ---------- c4s02: dentro da câmara de lixo; solta a bolinha e sai correndo; os restos ----------
  const t2 = at('c4s02'), FL2 = 940, HS2 = 560;
  const heap = x => FL2 - 330 * Math.exp(-(((x - 1900) / 1000) ** 2)) - 25 * Math.sin(x * .011) * Math.exp(-(((x - 1900) / 1200) ** 2));
  const HP2 = makePath([[-3000, 0], [6000, 0]]), HP2R = makePath([[6000, 0], [-3000, 0]]);
  const STOP2 = t2 + .7, DROP2 = t2 + 1.35, TURN2 = t2 + 2.1, RUN2 = TURN2 + .22, X2 = 640;
  const HK2 = [[t2 - 1.2, (X2 + 3000) / HS2 - 1.6], [STOP2, (X2 + 3000) / HS2]], RK2 = [[RUN2, (6000 - X2) / HS2], [RUN2 + 2.4, (6000 - X2) / HS2 + 10]];
  const DEAD2 = 1500, OLD2 = 2150, LEAF2 = 2720;
  function hero2(t) {
    if (t >= RUN2) { const m = travel(t, RK2, { start: .15, stop: 0, seed: 52 }); return her({ path: HP2R, s: m.s, size: HS2, ground: heap, t, moving: m.moving, lean: m.lean, drag: m.drag, sq: .12 * spring(t, RUN2, 7, 14) }); }
    const m = travel(t, HK2, { start: .3, stop: .4, seed: 51 }), low = anticipate(t, STOP2 + .05, .12, .2) * (1 - ease(seg(t, DROP2 + .15, DROP2 + .5)));
    return nod(her({ path: HP2, s: m.s, size: HS2, ground: heap, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'tap', sq: .08 * spring(t, DROP2, 8, 16) }), .03 * low, .06 * low, .45 * low);
  }
  const hs2 = t => travel(t, RK2, { start: .15, stop: 0, seed: 52 }).s;
  function c4s02(t, lt) {
    const cx = kf(t, [[t2, 860], [rd('c4s02', 1) - .3, 900], [rd('c4s02', 1) + .7, DEAD2 + 60], [rd('c4s02', 1) + 2, OLD2 + 60], [rd('c4s02', 1) + 3.3, LEAF2], [t2 + 9, LEAF2 + 80]]);
    const cy = 600, z = 1.05, [x0, x1] = view(cx, z);
    Kit.cam(cx, cy, z, 0, hand(t));
    cave(cx, cy, z, FL2, 17);
    // Monte de lixo com os restos espalhados.
    const hp = []; for (let x = x0; x <= x1 + 40; x += 40) hp.push([x, heap(x)]);
    Kit.poly([...hp, [x1 + 40, 1600], [x0, 1600]], mixCol(P.wood, P.ink, .45), { stroke: false });
    Kit.line(hp, RIM, 8);
    for (let k = Math.floor(x0 / 37); k * 37 < x1; k++) { const x = k * 37 + 30 * hash(k + 1), y = lerp(heap(x) + 14, FL2 + 120, hash(k + 2) ** 2), r = 6 + 12 * hash(k + 3); Kit.ellipse(x, y, r, .8 * r, REFUSE[k % 4], { rot: hash(k + 4) * 3 }); }
    grains(t, x0, x1, 0, 700, 4, 71, 7);
    // Formiga morta (deitada, sem olhos), fungo velho (bolhas murchas e pardas), restos de folha secos.
    const DP = makePath([[DEAD2 - 1000, 0], [DEAD2 + 1000, 0]]);
    A().creature(creaturePose(SPECS.ant, { path: DP, s: 1000 / 300, size: 300, ground: x => heap(x) + 12, t, seed: 72, alive: 0, moving: 0 }), { eyes: false });
    for (let i = 0; i < 9; i++) { const x = OLD2 - 170 + 340 * hash(i + 80), r = 40 + 34 * hash(i + 81), y = heap(x) + 10 - .6 * r * hash(i + 82); Kit.ellipse(x, y, r + 4, .8 * r + 4, P.line); Kit.ellipse(x, y, r, .8 * r, i % 3 ? mixCol(P.cream, P.wood, .55) : mixCol(P.stone, P.wood, .5)); Kit.ellipse(x + .3 * r, y, .15 * r, .12 * r, mixCol(P.wood, P.ink, .4)); }
    [[-150, -.5, 260, P.wood], [20, .4, 220, mixCol(P.leafDk, P.wood, .5)], [170, -.2, 240, mixCol(P.leaf, P.wood, .6)], [300, .8, 180, P.wood]].forEach(([dx, a, w, col], i) => A().leafPiece(LEAF2 + dx, heap(LEAF2 + dx) - 30 - 20 * i % 50, w, .45 * w, a + .04 * Math.sin(t * 1.3 + i), col));
    // Irmã do lixo trabalhando no monte (vida de fundo).
    const wx = 3200, work = .5 + .5 * Math.sin(TAU * .7 * t);
    A().creature(nod(creaturePose(SPECS.ant, { path: makePath([[wx + 1000, 0], [wx - 1000, 0]]), s: 1000 / 480, size: 480, ground: heap, t, seed: 73, moving: 0, antennae: 'tap' }), .02 * work, .05 * work, .4 * work), { jaws: work });
    // Ela: solta a bolinha à frente, vira num estalo e sai correndo pela esquerda.
    const turn = ease(seg(t, TURN2, RUN2)), p = t > RUN2 - .02 && t < RUN2 + .7 ? smear(hero2, t) : hero2(t);
    if (t < RUN2) {
      const ax = -3000 + travel(t, HK2, { start: .3, stop: .4, seed: 51 }).s * HS2, sx = 1 - 2 * turn;
      c.save(); c.translate(ax, 0); c.scale(Math.sign(sx || 1) * Math.max(.15, Math.abs(sx)), 1); c.translate(-ax, 0);
      A().creature(p, LOOK);
      c.restore();
    } else { A().creature(p, LOOK); dust(SPECS.ant, hs2, hero2, t, SEED); }
    const q = hero2(DROP2), [mx, my] = mouth(q), bx = mx + 30, r = .075 * HS2;
    if (t < DROP2) ball(...mouth(p), r);
    else { const u = seg(t, DROP2, DROP2 + .3), by = heap(bx) - .8 * r + 10; ball(lerp(mx, bx, u), lerp(my, by, easeIn(u)) - 22 * Math.max(0, Math.sin(Math.PI * seg(t, DROP2 + .3, DROP2 + .55))), r); if (u >= 1) A().dust(bx, by + r, seg(t, DROP2 + .3, DROP2 + .9), 9); }
    Kit.camEnd();
    Kit.flash(.25, P.shade);
  }

  // ---------- c4s02b: o corte recua até a superfície; a câmara de lixo bem funda; "3 a 4 m" ----------
  const t2b = at('c4s02b'), RULE = rd('c4s02b', 0) + 3.6, RX = 3800;
  function c4s02b(t, lt) {
    const k = ease(seg(t, t2b, t2b + 3.4)), push = ease(seg(t, RULE + .4, t2b + 7.5)), z = Math.exp(lerp(Math.log(1.1), Math.log(.232), k)) * (1 + .1 * push);
    const cam = [lerp(1300, 1550, k) + 250 * push, lerp(3680, 1960, k) + 250 * push, z];
    nest(t, cam, () => {
      const m = travel(t, [[t2b - .5, 0], [t2b + 8, 15]], { start: .2, stop: 0, seed: 43 });
      A().creature(her({ path: PWR, s: m.s, size: HN, t, moving: m.moving, lean: m.lean }), LOOK);
      // Régua da profundidade: da superfície até a altura da câmara de lixo.
      const g = ease(seg(t, RULE - .8, RULE)), w = 6 / z, yb = lerp(0, 3700, g);
      if (g > 0) {
        Kit.line([[RX, 0], [RX, yb]], P.cream, w);
        Kit.line([[RX - 90, 0], [RX + 90, 0]], P.cream, w);
        if (g >= 1) { Kit.line([[RX - 90, 3700], [RX + 90, 3700]], P.cream, w); for (let x = 2300; x < RX - 60; x += 160) Kit.line([[x, 3700], [x + 80, 3700]], P.cream, .6 * w, { alpha: .8 }); }
      }
    });
    const [tx, ty] = toScreen(RX + 380, 1850, cam);
    Kit.text('3 a 4 m', tx, ty, 84, P.cream, { k: seg(t, RULE - .1, RULE + .3) });
  }

  // ---------- jardim de fungo em close (c4s03, c4s04, c4s05) ----------
  const FLG = 860, FX = 1300, FW = 1600, FH = 600, HSG = 520, MS = .45 * HSG;
  const gG = x => FLG + 30 + 5 * Math.sin(x * .007);
  const fTop = x => FLG - .86 * FH * Math.sqrt(Math.max(0, 1 - ((x - FX) / (FW / 2 - 40)) ** 2));
  const TOP = makePath(Array.from({ length: 41 }, (_, i) => { const x = FX - FW / 2 + 60 + i * (FW - 120) / 40; return [x, fTop(x) + 14]; }));
  const TOPR = makePath(Array.from({ length: 41 }, (_, i) => { const x = FX + FW / 2 - 60 - i * (FW - 120) / 40; return [x, fTop(x) + 14]; }));
  const HPG = makePath([[-3000, 0], [6000, 0]]), HPGR = makePath([[6000, 0], [-3000, 0]]), sAt = x => (x + 3000) / HSG;
  const MX = 1830, MY = 660;  // a mancha do parasita, na borda direita do fungo
  function garden(t, cam, back) {
    const [cx, cy, z] = cam, [x0, x1] = view(cx, z);
    Kit.cam(cx, cy, z, 0, hand(t));
    cave(cx, cy, z, FLG + 10, 23);
    grains(t, x0, x1, 0, FLG, 4, 81, 7);
    // Irmã que passa ao fundo, no túnel do outro lado da câmara.
    if (back) back(x0, x1);
    A().fungus(FX, FLG + 10, FW, FH, t, 12);
    Kit.camEnd();
  }
  // Jardineira (mínima) andando no alto do fungo: d0 em px no caminho, v px/s, até parar em d1.
  function gardener(t, path, d0, d1, v, t0, seed, tend = 0) {
    const d = Math.min(d1, d0 + Math.max(0, t - t0) * v), mv = d < d1 && t > t0 ? 1 : 0, work = tend * (.5 + .5 * Math.sin(TAU * .8 * t + seed));
    return nod(creaturePose(SPECS.minima, { path, s: d / MS, size: MS, t, seed, moving: mv, antennae: 'tap' }), .02 * work, .04 * work, .35 * work);
  }
  const warm = () => { Kit.flash(.2, P.shade); Kit.flash(.12, P.sun); Kit.vignette(.35); };

  // ---------- c4s03: ela entre as jardineiras; toca e alisa o fungo com as antenas ----------
  const t3 = at('c4s03'), TAP3 = t3 + 1.6, STEP3 = rd('c4s03', 1) + .8;
  const HK3 = [[t3 - 1, sAt(470) - 2], [t3 + 1.3, sAt(470)], [STEP3, sAt(470)], [STEP3 + .9, sAt(600)]];
  function c4s03(t, lt) {
    const cam = [lerp(800, 860, ease(lt / 9)), lerp(640, 680, ease(lt / 9)), lerp(1.2, 1.34, ease(lt / 9))];
    garden(t, cam, () => { const u = frac(.05 * t + .3), x = lerp(2600, -300, u); A().creature(creaturePose(SPECS.ant, { path: HPGR, s: (6000 - x) / 300, size: 300, ground: () => FLG - 40, t, seed: 91 }), { color: mixCol(P.sauva, P.wood, .4), dark: mixCol(P.sauvaDk, P.wood, .4) }); });
    Kit.cam(...cam, 0, hand(t));
    A().creature(gardener(t, TOP, 260, 620, 80, t3, 101, 1));
    A().creature(gardener(t, TOPR, 120, 120, 0, t3, 102, 1));
    A().creature(gardener(t, TOP, 150, 420, 110, rd('c4s03', 1) - .3, 103, 1));
    // Ela: chega, baixa a cabeça e toca o fungo; alisa (a cabeça varre de um lado a outro); ergue, dá um passo, toca de novo.
    const m = travel(t, HK3, { start: .3, stop: .5, seed: 31 });
    const tap = anticipate(t, TAP3, .12, .2) * (1 - ease(seg(t, STEP3 - .4, STEP3))) + anticipate(t, STEP3 + 1.1, .12, .2);
    const sweep = Math.sin(TAU * .55 * (t - TAP3 - .8)) * ease(seg(t, TAP3 + .8, TAP3 + 1.4)) * (1 - ease(seg(t, STEP3 - .6, STEP3 - .2))) + .7 * Math.sin(TAU * .55 * (t - STEP3 - 2)) * ease(seg(t, STEP3 + 2, STEP3 + 2.6));
    const p = nod(her({ path: HPG, s: m.s, size: HSG, ground: gG, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: tap > .3 ? 'tap' : 'explore' }), .04 * tap + .03 * sweep, .07 * tap + .02 * sweep, .35 * tap + .1 * sweep);
    A().creature(p, LOOK);
    Kit.camEnd();
    warm();
  }

  // ---------- c4s03b: a câmara de fungo de longe; médias e mínimas lado a lado; recua: longe do céu ----------
  const t3b = at('c4s03b'), FAR3 = rd('c4s03b', 1);
  // Operárias em fila diante do fungo de FB: [x, tamanho, para onde olha, semente]; ela é a terceira.
  const ROW = [[1010, HN, 1, 111], [1080, .45 * HN, 1, 112], [1180, 0, 1, 0], [1300, .45 * HN, -1, 113], [1400, HN, -1, 114], [1490, .45 * HN, -1, 115], [1580, HN, -1, 116]];
  function c4s03b(t, lt) {
    const k = ease(seg(t, FAR3 - .2, FAR3 + 2.4)), z = Math.exp(lerp(Math.log(1.4 + .3 * ease(lt / 5.3)), Math.log(.62), k));
    const cam = [lerp(1220 + 110 * ease(lt / 5.3), 1250, k), lerp(1090, 640, k), z];
    nest(t, cam, () => {
      Kit.ellipse(FB[0], FB[1] - 170, 560, 260, P.sun, { alpha: .14 });
      // Uma média chega com um pedaço de folha para o jardim e para junto ao fungo.
      const mc = travel(t, [[t3b + .6, 0], [t3b + 5.4, 8]], { start: .3, stop: .6, seed: 117 }), CP = makePath([[1760, 0], [700, 0]]);
      A().creature(creaturePose(SPECS.ant, { path: CP, s: mc.s, size: HN, ground: x => gFB(x) - 18, t, seed: 117, moving: mc.moving, lean: mc.lean, carry: { w: 1.1, h: .7 } }));
      for (const [i, [x, sz, f, sd]] of ROW.entries()) {
        const work = .5 + .5 * Math.sin(TAU * (.5 + .1 * hash(i)) * t + 3 * hash(i + 1)), shuffle = 14 * Math.sin(TAU * .13 * t + i);
        const size = sz || HN, X = x + shuffle, path = f > 0 ? makePath([[X - 1000, 0], [X + 1000, 0]]) : makePath([[X + 1000, 0], [X - 1000, 0]]);
        const o = { path, s: 1000 / size, size, ground: gFB, t, moving: .4 * Math.abs(Math.cos(TAU * .13 * t + i)), antennae: 'tap' };
        if (sz) A().creature(nod(creaturePose(sz < HN ? SPECS.minima : SPECS.ant, { ...o, seed: sd }), .02 * work, .05 * work, .4 * work));
        else A().creature(nod(her(o), .02 * work, .05 * work, .4 * work), LOOK);
      }
      for (let j = 0; j < 2; j++) { const tp = makePath(Array.from({ length: 21 }, (_, i) => { const x = FB[0] - 330 + 33 * i * (j ? -1 : 1) + (j ? 660 : 0); return [x, FB[1] - 270 * Math.sqrt(Math.max(0, 1 - ((x - FB[0]) / 360) ** 2)) + 6]; })); A().creature(creaturePose(SPECS.minima, { path: tp, s: frac(.06 * t + .5 * j) * tp.length / (.45 * HN), size: .45 * HN, t, seed: 120 + j })); }
    });
  }

  // ---------- c4s04: a mancha escura cresce na borda do fungo; ela para e se assusta ----------
  const t4 = at('c4s04'), GROW4 = t4 + .6, NAME4 = rd('c4s04', 0) + 2, SCARE4 = t4 + 3.5, MR = 150;
  const HK4 = [[t4 - 1, sAt(1150) - 1.4], [t4 + 2.6, sAt(1500)]];
  const moldR = t => MR * ease(seg(t, GROW4, SCARE4 + 1.2)) * (1 + .12 * ease(seg(t, SCARE4 + 1.2, t4 + 6.8))) * (1 - ease(seg(t, rd('c4s05', 1) + .2, rd('c4s05', 1) + 2.8)));
  function hero4(t) {
    const m = travel(t, HK4, { start: .3, stop: .6, seed: 34 }), md = mood(t, [[t4, 'neutral'], [SCARE4, 'scared', '!']], SEED);
    const fl = anticipate(t, SCARE4, .08, .3, SPRING.bouncy) * (1 - .5 * ease(seg(t, SCARE4 + .7, SCARE4 + 1.6)));
    const tap = t < SCARE4 ? .5 + .5 * Math.sin(TAU * .9 * t) : 0;
    return nod(her({ path: HPG, s: m.s, size: HSG, ground: gG, t, moving: m.moving, lean: m.lean, drag: m.drag, flinch: fl, antennae: t < SCARE4 ? 'tap' : 'explore', expression: md.expression, blink: md.blink, emote: md.emote, sq: md.sq }), .02 * tap, .03 * tap, .2 * tap);
  }
  function c4s04(t, lt) {
    const p = hero4(t), k = ease(seg(t, SCARE4 - .4, SCARE4 + 1.4));
    const cam = [lerp(p.head.x + 120, (p.head.x + MX) / 2, k), lerp(560, 600, k), lerp(1, 1.18, k)];
    garden(t, cam);
    Kit.cam(...cam, 0, hand(t));
    mold(MX, MY, moldR(t), t, 4);
    A().creature(gardener(t, TOP, 200, 520, 70, t4, 101, 1));
    A().creature(p, LOOK);
    // O '!' do susto: o emote de mood() não aparece nas formigas neste motor, então vai desenhado aqui.
    const ek = seg(t, SCARE4 + .05, SCARE4 + .35) * (1 - seg(t, SCARE4 + 1.4, SCARE4 + 1.7));
    Kit.text('!', p.head.x + .1 * HSG, p.head.y - .42 * HSG, 150, P.ink, { k: ek });
    Kit.camEnd();
    warm();
    const [tx, ty] = toScreen(MX + 60, MY - 290, cam);
    Kit.text('Escovopsis', tx, ty, 72, P.cream, { k: seg(t, NAME4, NAME4 + .4) });
  }

  // ---------- c4s05: as irmãs cercam a mancha; as bactérias ajudam; ela encolhe até sumir ----------
  const t5 = at('c4s05'), BAC5 = rd('c4s05', 1);
  // Irmãs que chegam pela direita, pelo chão: [x de parada, chegada, tamanho, semente].
  const SIS5 = [[2230, t5 + .3, 470, 131], [2600, t5 + 1, 440, 132]];
  function c4s05(t, lt) {
    const cam = [1880 + 30 * ease(lt / 7), 590, .86 + .05 * ease(lt / 7)];
    garden(t, cam);
    Kit.cam(...cam, 0, hand(t));
    mold(MX, MY, moldR(t), t, 4);
    const work = i => .5 + .5 * Math.sin(TAU * .9 * t + 2 * i), heads = [];
    // Jardineiras descem pelo alto do fungo até a mancha.
    for (const [i, [path, d0, d1, t0, sd]] of [[TOPR, 0, 170, t5 + .2, 141], [TOP, 900, 1120, t5 + .8, 142]].entries()) { const g = gardener(t, path, d0, d1, 150, t0, sd, t > t0 + 1.6 ? 1 : 0); A().creature(g); heads.push(g.head); }
    for (const [i, [xs, ta, sz, sd]] of SIS5.entries()) {
      const m = travel(t, [[ta - 1, (6000 - xs) / sz - 2.5], [ta + 1.2, (6000 - xs) / sz]], { start: .3, stop: .5, seed: sd }), wk = t > ta + 1.2 ? work(i) : 0;
      const p = nod(creaturePose(SPECS.ant, { path: HPGR, s: m.s, size: sz, ground: x => gG(x) - 12 * i, t, seed: sd, moving: m.moving, lean: m.lean, antennae: 'tap' }), .02 * wk, .05 * wk, .35 * wk);
      A().creature(p, { jaws: wk }); heads.push(p.head);
    }
    // Ela: passa do susto ao trabalho, dá um passo até a mancha e ajuda.
    const m = travel(t, [[t5 + .4, sAt(1500)], [t5 + 1.4, sAt(1610)]], { start: .4, stop: .5, seed: 35 }), wk = t > t5 + 1.6 ? work(5) : 0;
    const md = mood(t, [[t5 - 2, 'scared'], [t5 + .3, 'neutral']], SEED);
    const p = nod(her({ path: HPG, s: m.s, size: HSG, ground: gG, t, moving: m.moving, lean: m.lean, antennae: t > t5 + .3 ? 'tap' : 'explore', expression: md.expression, blink: md.blink }), .02 * wk, .05 * wk, .35 * wk);
    A().creature(p, { ...LOOK, jaws: wk }); heads.push(p.head);
    // Bactérias: pontinhos claros que vão das irmãs até a mancha enquanto ela encolhe.
    const bk = seg(t, BAC5, BAC5 + .4) * (1 - seg(t, BAC5 + 2.6, BAC5 + 3.1));
    if (bk > 0) heads.forEach((h, i) => { for (let j = 0; j < 6; j++) { const u = frac(.8 * t + j / 6 + hash(i)), [x, y] = arcPt([h.x, h.y], [MX + 40 * noise1(i * 4 + j, t), MY + 30 * noise1(i * 4 + j + 50, t)], 50, u); Kit.ellipse(x, y, 12, 12, P.cloud, { alpha: .95 * bk * Math.sin(Math.PI * u) }); } });
    Kit.camEnd();
    warm();
  }

  shotsById({ c4s01, c4s02, c4s02b, c4s03, c4s03b, c4s04, c4s05 });
})();
