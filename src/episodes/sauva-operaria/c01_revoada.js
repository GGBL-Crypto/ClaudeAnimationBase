// c01_revoada.js: capítulo 1 de sauva-operaria (A revoada), planos c1s01–c1s09.
// Gramado e trilha → corte do solo com o fungo; ela na trilha; revoada ao fim da tarde; voo nupcial; pouso e pássaro;
// a rainha perde as asas e cava; câmara de fundação (fungo, ovos, CO2) até as três primeiras operárias e a íris.
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
  const DUSK = () => Kit.gradient(mixCol(P.skyTop, P.wingAccent, .35), mixCol(P.skyLow, P.sun, .5));
  const EARTH = mixCol(P.wood, P.ground, .2), EARTH_DK = mixCol(P.wood, P.ink, .35);
  // Camada de fundo com paralaxe só horizontal (f): a vertical acompanha a câmera, para o fundo sair do quadro quando
  // ela desce para o solo ou sobe para o céu. draw(x0, x1) recebe a faixa visível em coordenadas da camada.
  function layer(cx, cy, zoom, f, t, draw) {
    const lx = lerp(960, cx, f);
    Kit.cam(lx, cy, zoom, 0, hand(t)); draw(lx - W / 2 / zoom - 200, lx + W / 2 / zoom + 200); Kit.camEnd();
  }
  const view = (cx, zoom) => [cx - W / 2 / zoom - 80, cx + W / 2 / zoom + 80];
  const toScreen = (x, y, [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
  // Capim entre x0 e x1 sobre gy; odd = 0/1 desenha só metade (atrás / à frente dos seres).
  function grass(t, x0, x1, gy, step, h0, h1, odd = null, push = [], skip = null) {
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      if (odd !== null && (k & 1) !== odd) continue;
      const x = k * step + .5 * step * hash(k + 3), y = gy(x) + 3;
      if (skip && skip(x)) continue;
      A().blade(x, y, h0 + (h1 - h0) * hash(k + 7), bladeBend(t, x, y, push, 60, 3), k & 1 ? P.grass : P.grassDk);
    }
  }
  // Move a cabeça (e as antenas) depois de creaturePose; da > 0 baixa o olhar (o mesmo nod() de teste-movimento).
  function nod(p, dx, dy, da) {
    const hx = p.head.x + p.facing * dx * p.size, hy = p.head.y + dy * p.size, a = p.facing * da, co = Math.cos(a), si = Math.sin(a);
    const move = ([x, y]) => { x += hx - p.head.x; y += hy - p.head.y; return [hx + (x - hx) * co - (y - hy) * si, hy + (x - hx) * si + (y - hy) * co]; };
    for (const ap of SPECS[p.spec].appendages) if (ap.attach === 'head') p.appendages[ap.name] = p.appendages[ap.name].map(move);
    p.head = { x: hx, y: hy, angle: p.head.angle + a };
    return p;
  }
  // Poeira das pisadas do último meio segundo (dust() de teste-movimento).
  function dust(spec, sOf, poseAt, t, seed) {
    const gait = GAITS[spec.gait], vary = { ...ORGANIC, ...spec.organic }.vary;
    for (const lb of spec.limbs) if (lb.foot) for (const te of stepEvents(sOf, t - .5, t, gait.offsets[lb.key || lb.name], spec.stride, gait.duty, vary, seed + 501)) {
      const f = poseAt(te).limbs[lb.name].end; A().dust(f[0], f[1], (t - te) / .5, Math.floor(f[0]));
    }
  }
  // Grão de terra que cai do teto de uma câmara de tempos em tempos (vida de fundo).
  function grains(t, x0, x1, top, floor, n, seed) {
    for (let i = 0; i < n; i++) {
      const per = 2.6 + 1.5 * hash(seed + i), u = frac(t / per + hash(seed + i + 9)), x = lerp(x0, x1, hash(seed + i * 3 + Math.floor(t / per + hash(seed + i + 9))));
      if (u < .35) Kit.ellipse(x, lerp(top, floor, u / .35), 4, 4, mixCol(P.wood, P.cream, .25));
    }
  }
  // Seres com asas em close: bater devagar, senão vira zumbido a 30 fps.
  const FLY = { ...SPECS.fly, flyer: { ...SPECS.fly.flyer, freq: 4 } };
  const ALATE = { ...SPECS.alate, flyer: { ...SPECS.alate.flyer, freq: 5 } };
  const QUEEN = { ...SPECS.queen, flyer: { ...SPECS.queen.flyer, freq: 4 } };
  // Laço achatado no chão de uma câmara (centro, raios): quem anda nele passa atrás (metade de cima) e na frente.
  // dir = 1: na frente anda para a direita; -1: o sentido oposto. d = 0 é o ponto da frente.
  const loopPath = (cx, cy, rx, ry, dir = 1) => makePath(Array.from({ length: 33 }, (_, k) => { const a = Math.PI / 2 - dir * k * TAU / 32; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }));

  // ---------- c1s01: gramado, trilha, mosca; a câmera desce ao ninho ----------
  const g1 = x => 820 + 14 * Math.sin(x * .004 + 1) + 6 * Math.sin(x * .013);
  const NEST1 = 1500, T1 = makePath([[-500, 820], [NEST1 + 20, 820]]), HL1 = makePath([[-400, 834], [2600, 834]]), AS1 = 40;
  const TUN1 = [
    [[NEST1, 840], [1470, 1000], [1300, 1180], [1080, 1300], [930, 1385]],
    [[1470, 1000], [1640, 1200], [1720, 1420], [1700, 1620]],
    [[650, 1440], [470, 1560], [390, 1760]],
  ].map(makePath);
  const CH1 = [[860, 1500, 460, 240, 1], [1700, 1700, 330, 180, 2], [390, 1860, 320, 170, 3]];
  const heroX1 = t => 640 + 60 * t;
  // Abertura em close (até CUT1): a cabeça dela e a forídea pairando enquanto soa "desta formiga"; a câmera recua
  // depressa e corta, no mesmo movimento, para a trilha em plano aberto.
  const FLY_IN = rd('c1s01', 0) + .1, OUT1 = rd('c1s01', 0) + 3.3, CUT1 = OUT1 + .55;
  const gC = x => 900 + 10 * Math.sin(x * .003), HSC = 1300, HPC = makePath([[-3000, 900], [12000, 900]]), FSC = 300;
  // A folha dela, em pé na mandíbula e inclinada para a frente, para não esconder a cabeça (close e plano aberto).
  function leaf1(p, S) {
    const a = -Math.PI / 2 + .35 * p.facing, w = .95 * S, bx = p.head.x + p.facing * .13 * S, by = p.head.y + .03 * S;
    return { x: bx + w / 2 * Math.cos(a), y: by + w / 2 * Math.sin(a), w, h: .42 * S, angle: a, top: [bx + w * Math.cos(a), by + w * Math.sin(a)] };
  }
  const drawLeaf = l => A().leafPiece(l.x, l.y, l.w, l.h, l.angle, P.leaf);
  function close1(t) {
    const hp = her({ path: HPC, s: (3000 + 700) / HSC + 1.1 * t, size: HSC, ground: x => gC(x) + 60, t }), lf = leaf1(hp, HSC);
    const z = lerp(1, 1.06, ease(seg(t, 0, OUT1))) * lerp(1, .25, easeIn(seg(t, OUT1, CUT1))), cx = hp.head.x - 120, cy = hp.head.y - 110;
    Kit.gradient();
    // Fundo macro (como c1s02): capim gigante enevoado e irmãs com folhas numa trilha de trás.
    layer(cx, cy, z, .35, t, (a, b) => {
      for (let i = Math.floor(a / 70); i * 70 < b; i++) { const x = i * 70 + 40 * hash(i + 200); A().blade(x, 700, 220 + 280 * hash(i + 201), .12 * wind(t, x, 7), mixCol(P.grass, P.skyLow, .55)); }
      A().ground(x => 690 + 12 * Math.sin(x * .004), a, b, mixCol(P.grassDk, P.skyLow, .5));
    });
    layer(cx, cy, z, .7, t, (a, b) => {
      const gb = x => 770 + 8 * Math.sin(x * .004), SIS = makePath([[a - 600, 0], [b + 600, 0]]);
      for (const s of crowd(SIS, t, 8, 8, { speed: 120, spacing: 420, carryEvery: 1, sizeVar: .1 })) { const sz = 150 * s.size; A().creature(creaturePose(SPECS.ant, { path: SIS, s: s.s / sz, size: sz, ground: gb, t, seed: s.seed, carry: { w: 1.1, h: .7 } })); }
      for (let i = Math.floor(a / 150); i * 150 < b; i++) { const x = i * 150 + 80 * hash(i + 3); A().blade(x, gb(x) + 30, 260 + 300 * hash(i), .14 * wind(t, x, 5), mixCol(P.grassDk, P.skyLow, .25)); }
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    const [x0, x1] = view(cx, z);
    A().ground(gC, x0, x1);
    A().props(x => gC(x) + 10, x0, x1, 8, 2.4, 0, 'sm');
    drawLeaf(lf);
    A().creature(hp, LOOK);
    // Forídea (asas lentas no close): chega de cima e paira sobre a cabeça dela, derivando um pouco.
    if (t > FLY_IN) {
      const hx = hp.head.x - .06 * HSC + 30 * noise1(41, t * 1.1), hy = hp.head.y - .3 * HSC + 20 * noise1(42, t * 1.3);
      const path = makePath([[hx + 700, hy - 450], [hx + 250, hy - 100], [hx, hy]]);
      A().creature(creaturePose(FLY, { path, s: easeOut(seg(t, FLY_IN, FLY_IN + .8)) * path.length / FSC, size: FSC, t, seed: 4, gait: 'fly' }));
    }
    grass(t, x0, x1, x => gC(x) + 140, 60, 120, 260, null);
    Kit.camEnd();
  }
  function c1s01(t) {
    if (t < CUT1) return close1(t);
    const cam = kf(t, [[CUT1, [heroX1(CUT1), 800, 3.8]], [5.8, [980, 780, 2.6]], [8.6, [1150, 1330, .85]], [9.9, [1100, 1330, .85]], [12.3, [880, 1420, 1.7]], [14.1, [880, 1425, 1.78]]]);
    const [cx, cy, z] = cam, [x0, x1] = view(cx, z);
    Kit.gradient();
    layer(cx, cy, z, .1, t, () => { A().cloud(380 + 6 * t, 160, .8, 1); A().cloud(1450 + 4 * t, 110, .6, 2); A().cloud(2300 + 5 * t, 220, .7, 3); });
    layer(cx, cy, z, .3, t, (a, b) => A().ground(x => 640 + 40 * Math.sin(x * .002 + 1) + 18 * Math.sin(x * .006), a, b, mixCol(P.foliage, P.skyLow, .4)));
    layer(cx, cy, z, .6, t, (a, b) => {
      const hill = x => 740 + 20 * Math.sin(x * .0035 + 2);
      for (let k = Math.floor(a / 160); k * 160 < b; k++) if (hash(k + 70) < .6) { const x = k * 160 + 60 * hash(k + 71); A().tree(x, hill(x) + 10, 120 + 90 * hash(k + 72), .05 * wind(t, x), k + 30, .3); }
      A().ground(hill, a, b, mixCol(P.leafDk, P.skyLow, .2));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    A().tree(260, g1(260) + 10, 420, .04 * wind(t, 260), 4);
    A().ground(g1, x0, x1);
    // Corte do solo: terra, túneis, câmaras, raízes, depois quem mora lá.
    A().soil(x0, 846, x1 - x0, 1300, 11);
    for (const p of TUN1) A().tunnel(p, 34);
    for (const [x, y, w, h, sd] of CH1) A().chamber(x, y, w, h, sd);
    A().roots(260, 850, 420, 1, 5);
    A().fungus(860, 1500, 360, 200, t, 3);
    A().fungus(1700, 1700, 250, 140, t, 4);
    A().fungus(390, 1860, 240, 130, t, 5);
    grains(t, 700, 1020, 1390, 1500, 3, 21);
    TUN1.forEach((p, i) => { for (const a of crowd(p, t, 4, 40 + i, { speed: 26, spacing: p.length / 4, carryEvery: 2, sizeVar: .1 })) { const sz = 26 * a.size; A().creature(creaturePose(SPECS.ant, { path: p, s: a.s / sz, size: sz, t, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null })); } });
    const garden = loopPath(860, 1500, 170, 30);
    for (let j = 0; j < 2; j++) { const d = frac(.04 * t + j / 2) * garden.length, sz = 36; A().creature(creaturePose(SPECS.ant, { path: garden, s: d / sz, size: sz, ground: () => 1500, t, seed: 60 + j })); }
    // Superfície: capim atrás, trilha, ela com a mosca, capim à frente, monte da entrada.
    grass(t, x0, x1, g1, 18, 16, 34, 0);
    for (const a of crowd(T1, t, 14, 3, { speed: 60, spacing: 150, sizeVar: .1 })) {
      if (Math.abs(T1.at(a.s).x - heroX1(t)) < 75) continue;  // a irmã que a encobriria sai da fila
      const sz = AS1 * a.size; A().creature(creaturePose(SPECS.ant, { path: T1, s: a.s / sz, size: sz, ground: g1, t, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null }));
    }
    const hp = her({ path: HL1, s: (heroX1(t) + 400) / AS1, size: AS1, ground: x => g1(x) + 14, t });
    drawLeaf(leaf1(hp, AS1));
    A().creature(hp, LOOK);
    // Forídea: continua pairando sobre a cabeça dela depois do corte e some para o alto.
    const hx = hp.head.x - .06 * AS1, hy = hp.head.y - .3 * AS1, tl = CUT1 + .6;
    if (t < tl + .7) {
      const FS = 16, path = t < tl ? makePath([[hx + 1, hy], [hx, hy]]) : makePath([[hx, hy], [hx - 120, hy - 160], [hx - 200, hy - 800]]);
      A().creature(creaturePose(FLY, { path, s: t < tl ? 1 / FS : easeIn(seg(t, tl, tl + .7)) * path.length / FS, size: FS, t, seed: 4 }));
    }
    Kit.poly([[NEST1 - 70, g1(NEST1) + 8], [NEST1 - 30, g1(NEST1) - 20], [NEST1 + 25, g1(NEST1) - 24], [NEST1 + 75, g1(NEST1) + 8]], EARTH, { smooth: true, weight: 4 });
    Kit.ellipse(NEST1 + 5, g1(NEST1) - 6, 22, 7, P.line);
    grass(t, x0, x1, g1, 18, 16, 34, 1, [[hp.head.x, hp.head.y]]);
    Kit.camEnd();
  }

  // ---------- c1s02: ela para, olha para trás e varre o ar; nome e cheiro de limão ----------
  const g2 = x => 860 + 10 * Math.sin(x * .003), HS2 = 620, HP2 = makePath([[-3000, 860], [6000, 860]]), S2 = (980 + 3000) / HS2;
  const t2 = at('c1s02'), HK2 = [[t2 - 2, S2 - 3.2], [t2 + 1.6, S2], [t2 + 11.4, S2], [t2 + 15.4, S2 + 4]], HO2 = { start: .5, stop: .9, seed: 21 };
  const SIS2 = makePath([[-600, 0], [2800, 0]]);
  function c1s02(t, lt) {
    const m = travel(t, HK2, HO2), thx = -3000 + m.s * HS2, cx = 960 + .6 * (thx - 980), z = 1 + .08 * ease(seg(lt, 2, 12));
    Kit.gradient();
    // Fundo macro: capim gigante enevoado e as irmãs com folhas numa trilha de trás.
    layer(cx, 540, z, .35, t, (a, b) => {
      for (let i = Math.floor(a / 70); i * 70 < b; i++) { const x = i * 70 + 40 * hash(i + 200); A().blade(x, 640, 220 + 280 * hash(i + 201), .12 * wind(t, x, 7), mixCol(P.grass, P.skyLow, .55)); }
      A().ground(x => 630 + 12 * Math.sin(x * .004), a, b, mixCol(P.grassDk, P.skyLow, .5));
    });
    layer(cx, 540, z, .7, t, (a, b) => {
      const gb = x => 720 + 8 * Math.sin(x * .004);
      for (const s of crowd(SIS2, t, 7, 8, { speed: 110, spacing: 480, carryEvery: 1, sizeVar: .1 })) { const sz = 150 * s.size; A().creature(creaturePose(SPECS.ant, { path: SIS2, s: s.s / sz, size: sz, ground: gb, t, seed: s.seed, carry: { w: 1.1, h: .7 } })); }
      for (let i = Math.floor(a / 150); i * 150 < b; i++) { const x = i * 150 + 80 * hash(i + 3); A().blade(x, gb(x) + 30, 260 + 300 * hash(i), .14 * wind(t, x, 5), mixCol(P.grassDk, P.skyLow, .25)); }
    });
    Kit.cam(cx, 540, z, 0, hand(t));
    A().ground(g2, cx - W / z, cx + W / z);
    A().rock(1650, g2(1650) + 40, 70, 2); A().props(x => g2(x) + 10, cx - W / z, cx + W / z, 8, 2.4, 0, 'sm');
    // Para, ergue a cabeça, antenas varrendo; vira para olhar para trás (espelho rápido) e volta a seguir.
    const up = anticipate(t, t2 + 2, .12, .2) * (1 - ease(seg(t, t2 + 11, t2 + 11.6)));
    let p = her({ path: HP2, s: m.s, size: HS2, ground: g2, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'explore', sq: .05 * (spring(t, t2 + 1.6, 6, 14) + spring(t, t2 + 5.6, 7, 16) + spring(t, t2 + 10.9, 7, 16)) });
    p = nod(p, .01 * up, -.02 * up, -.25 * up + .12 * up * Math.sin(t * 2.3));
    const k1 = ease(seg(t, t2 + 5.2, t2 + 5.55)), k2 = ease(seg(t, t2 + 10.6, t2 + 10.95)), sx = 1 - 2 * k1 + 2 * k2, sxk = Math.sign(sx || 1) * Math.max(.18, Math.abs(sx));
    const c = animationEngine.context, mid = (p.spine[0].x + p.spine.at(-1).x) / 2;
    c.save(); c.translate(mid, 0); c.scale(sxk, 1); c.translate(-mid, 0);
    A().creature(p, LOOK);
    c.restore();
    const hx = mid + (p.head.x - mid) * sxk, hy = p.head.y;
    // Cheiro de limão: fios dourados que sobem da cabeça e um limão no alto.
    const sk = ease(seg(t, rd('c1s02', 2), rd('c1s02', 2) + .6)) * (1 - ease(seg(t, t2 + 13.2, t2 + 13.8)));
    if (sk > 0) {
      for (let i = 0; i < 3; i++) {
        const pts = Array.from({ length: 9 }, (_, j) => [hx + (i - 1) * 40 + 22 * Math.sin(j * .9 - t * 3 + i * 2), hy - 60 - j * 34 * sk]);
        Kit.line(pts, P.mustard, 9, { alpha: .8 * sk });
      }
      const lk = sk * backOut(seg(t, rd('c1s02', 2) + .5, rd('c1s02', 2) + .9)), ly = hy - 400 + 10 * Math.sin(t * 2);
      if (lk > .02) { Kit.ellipse(hx + 20, ly, 52 * lk, 36 * lk, P.gold, { stroke: true, rot: -.3 }); Kit.ellipse(hx + 20 + 48 * lk * Math.cos(-.3), ly + 48 * lk * Math.sin(-.3), 10 * lk, 8 * lk, P.gold, { stroke: true, rot: -.3 }); Kit.ellipse(hx + 6, ly - 10, 14 * lk, 8 * lk, P.cream, { rot: -.3 }); }
    }
    grass(t, cx - W / z, cx + W / z, x => g2(x) + 140, 60, 120, 260, null);
    Kit.camEnd();
    const nk = Math.min(seg(t, rd('c1s02', 1), rd('c1s02', 1) + .4), 1 - seg(t, rd('c1s02', 2) - .3, rd('c1s02', 2)));
    const [tx, ty] = toScreen(980, 300, [cx, 540, z]);
    Kit.text('Saúva-limão (Atta sexdens)', tx, ty, 62, P.ink, { k: nk });
  }

  // ---------- c1s03: fim de tarde, monte do ninho; os alados sobem em espiral ----------
  const g3 = x => 880 + 10 * Math.sin(x * .005);
  const M3 = x => g3(x) - 170 * Math.exp(-(((x - 960) / 330) ** 2)) - 40 * Math.exp(-(((x - 1280) / 170) ** 2));
  const HOLES = [880, 1010, 1130, 770];
  const t3 = at('c1s03'), LAUNCH = Array.from({ length: 16 }, (_, i) => i < 4 ? rd('c1s03', 0) + .3 + .9 * i : rd('c1s03', 1) + (i - 4) * .26);
  const SPIRAL = LAUNCH.map((_, i) => {
    const hx = HOLES[i % 4], hy = M3(hx) - 6, a0 = TAU * hash(i + 300), dir = i & 1 ? 1 : -1;
    return makePath(Array.from({ length: 26 }, (_, k) => { const a = a0 + dir * k * .7, r = 10 + 10 * k; return [hx + r * Math.cos(a), hy - 62 * k + 16 * Math.sin(a)]; }));
  });
  const MOUND = []; for (let x = 470; x <= 1550; x += 30) MOUND.push([x, M3(x)]);
  const MOUND_FILL = [...MOUND, ...MOUND.slice().reverse().map(([x]) => [x, g3(x) + 2])];
  const MW3 = makePath([[640, 0], [1340, 0]]);
  function c1s03(t, lt) {
    const cy = kf(t, [[t3, 600], [rd('c1s03', 1), 590], [t3 + 8.5, -120], [t3 + 9.1, -140]]), z = kf(t, [[t3, 1.05], [t3 + 8.5, .92]]), cx = 960 + 30 * ease(lt / 9);
    const [x0, x1] = view(cx, z);
    DUSK();
    layer(cx, cy, z, .05, t, () => Kit.ellipse(1560, 700, 90, 90, P.sun));
    layer(cx, cy, z, .1, t, () => { A().cloud(300 + 5 * t - 140, 260, .9, 1); A().cloud(1300 + 4 * t - 110, -120, 1.1, 2); A().cloud(500 + 3 * t - 80, -520, 1.2, 3); A().cloud(1600 + 6 * t - 170, -700, .9, 4); });
    layer(cx, cy, z, .3, t, (a, b) => A().ground(x => 700 + 30 * Math.sin(x * .002 + 1), a, b, mixCol(P.foliage, P.wingAccent, .25)));
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g3, x0, x1);
    A().tree(180, g3(180) + 10, 380, .05 * wind(t, 180), 4);
    Kit.poly(MOUND_FILL, EARTH, { stroke: false }); Kit.line(MOUND, P.line, 4);
    for (const h of HOLES) Kit.ellipse(h, M3(h) - 2, 22, 8, P.line);
    grass(t, x0, x1, g3, 18, 16, 34, null, [], x => x > 520 && x < 1500);
    // Operárias de guarda andando no monte entre os buracos.
    for (const a of crowd(MW3, t, 5, 9, { speed: 30, spacing: 140, carryEvery: 99, sizeVar: .1 })) { const sz = 24 * a.size; A().creature(creaturePose(SPECS.ant, { path: MW3, s: a.s / sz, size: sz, ground: M3, t, seed: a.seed })); }
    SPIRAL.forEach((path, i) => {
      const dt = t - LAUNCH[i], sz = 72 + 20 * hash(i + 5);
      if (dt < 0) return;
      const p = creaturePose(ALATE, { path, s: (90 * dt + 140 * dt * dt / (1 + dt)) / sz, size: sz, t, seed: 10 + i, gait: 'fly' });
      if (p.head.y > cy - H / z) A().creature(p);
    });
    Kit.camEnd();
  }

  // ---------- c1s04: céu aberto; a rainha cruza com machos que a seguem e se afastam ----------
  const t4 = at('c1s04'), QPTS = [[-400, 620], [300, 520], [900, 600], [1500, 480], [2100, 560], [2900, 500]], QP = makePath(QPTS), QS4 = 220;
  const MALES = Array.from({ length: 6 }, (_, i) => ({ off: [-90 - 120 * i, (i & 1 ? -1 : 1) * (60 + 40 * i)], lag: 120 + 70 * i, peel: i ? rd('c1s04', 1) + .7 + .55 * i : rd('c1s04', 0) + 2.3, dir: i & 1 ? -1 : 1 }));
  MALES.forEach(m => { m.path = makePath(QPTS.map(([x, y]) => [x + m.off[0], y + m.off[1]])); });
  const FAR4 = makePath([[-300, 300], [700, 260], [1500, 340], [2400, 280]]);
  function c1s04(t, lt) {
    const dq = 300 + 290 * lt, q = QP.at(dq), cx = 960 + .4 * (q.x - 960), cy = 540 + .3 * (q.y - 560), z = 1.05;
    Kit.gradient(mixCol(P.skyTop, P.wingAccent, .25), mixCol(P.skyLow, P.sun, .5));
    layer(cx, cy, z, .15, t, () => { A().cloud(200 - 3 * t, 820, 1.6, 1); A().cloud(1500 - 2 * t, 900, 1.9, 2); A().cloud(900 - 4 * t, 150, .7, 3); });
    layer(cx, cy, z, .5, t, () => { for (let i = 0; i < 9; i++) { const sz = 18, a = frac(.03 * t + i / 9) * FAR4.length; A().creature(creaturePose(ALATE, { path: FAR4, s: a / sz, size: sz, t, seed: 80 + i, gait: 'fly' })); } });
    Kit.cam(cx, cy, z, 0, hand(t));
    const c = animationEngine.context;
    for (const [i, m] of MALES.entries()) {
      // Seguem a rainha; o primeiro chega junto dela (acasala) e sai antes. Ao sair, ficam para trás e caem para o lado.
      const near = i === 0 ? 1 - ease(seg(t, rd('c1s04', 0), rd('c1s04', 0) + .8)) * (1 - ease(seg(t, m.peel - .4, m.peel))) : 1;
      const pk = seg(t, m.peel, m.peel + 2.2), sz = 105 + 15 * hash(i + 40);
      const d = dq - lerp(110, m.lag, near) - 220 * pk * pk, dy = m.dir * 420 * pk * pk + (1 - near) * (-60 - m.off[1]), dx = (1 - near) * -m.off[0];
      c.save(); c.translate(dx, dy);
      A().creature(creaturePose(ALATE, { path: m.path, s: d / sz, size: sz, t, seed: 20 + i, gait: 'fly' }));
      c.restore();
    }
    A().creature(creaturePose(QUEEN, { path: QP, s: dq / QS4, size: QS4, t, seed: 2, gait: 'fly' }));
    Kit.camEnd();
    layer(cx, cy, z, 1.4, t, () => A().cloud(2200 - 60 * lt, 1000, 2.4, 6));
  }

  // ---------- c1s05: rainhas pousam; o pássaro chega, bica e elas fogem; "1 em 40" ----------
  const t5 = at('c1s05'), g5 = x => 850 + 12 * Math.sin(x * .004 + 2), QS5 = 165, LX5 = [420, 650, 930, 1070, 1260];
  const LAND5 = LX5.map((_, i) => rd('c1s05', 0) - .1 + .24 * i), SCARE5 = rd('c1s05', 1) + .85, BS5 = 330;
  const B_IN = makePath([[2500, 160], [2150, 470], [1840, g5(1840) - .3 * BS5]]), B_G = makePath([[1840, 0], [-2000, 0]]), BV = 1.3 / .9;
  function bird5(t) {
    const o = { size: BS5, t, seed: 7, ground: g5, ...mood(t, [[t5, 'neutral'], [SCARE5, 'angry']], 7) };
    o.sq = .25 * spring(t, rd('c1s05', 1) - .5, 7, 16);
    if (t < rd('c1s05', 1) - .5) return creaturePose(SPECS.bird, { ...o, path: B_IN, s: easeOut(seg(t, rd('c1s05', 1) - 1.4, rd('c1s05', 1) - .5)) * B_IN.length / BS5, gait: 'fly' });
    const T0 = rd('c1s05', 1) - .3, mv = travel(t, [[T0, 0], [T0 + .8, 1.3], [SCARE5 + 1.2, 1.3], [SCARE5 + 2, 2.6]], { start: .1, stop: .1 });
    const peck = Math.max(0, Math.sin(2 * TAU * seg(t, SCARE5 - .3, SCARE5 + .2))) + Math.max(0, Math.sin(2 * TAU * seg(t, SCARE5 + 2.2, SCARE5 + 2.7)));
    return nod(creaturePose(SPECS.bird, { ...o, path: B_G, s: mv.s, moving: mv.moving }), .05 * peck, .1 * peck, .8 * peck);
  }
  function queen5(t, i) {
    const lx = LX5[i], tl = LAND5[i], o = { size: QS5, t, seed: 30 + i, ground: g5 };
    if (t < tl) {
      const path = makePath([[lx - 600, 120 + 60 * i], [lx - 200, g5(lx) - 180], [lx, g5(lx) - .17 * QS5]]);
      return creaturePose(QUEEN, { ...o, path, s: easeOut(seg(t, tl - 1.2, tl)) * path.length / QS5, gait: 'fly' });
    }
    const ts = SCARE5 + .15 + .08 * i, fl = anticipate(t, SCARE5 + .05 * i, .05, .3, SPRING.bouncy) * (1 - ease(seg(t, ts + .2, ts + .5)));
    const md = mood(t, [[tl, 'neutral'], [SCARE5 + .05 * i, 'scared', '!']], 30 + i), sq = .15 * spring(t, tl, 6, 16) + md.sq;
    if (t < ts) return creaturePose(QUEEN, { ...o, path: makePath([[lx - 1000, 0], [lx + 1000, 0]]), s: 1000 / QS5, moving: 0, flinch: fl, sq, expression: md.expression, blink: md.blink, emote: md.emote });
    if (i === 2) { const path = makePath([[lx, g5(lx) - .17 * QS5], [lx - 200, 500], [lx - 500, -200]]); return creaturePose(QUEEN, { ...o, path, s: easeIn(seg(t, ts, ts + 1.6)) * path.length / QS5, gait: 'fly', emote: md.emote }); }
    const v = 2.2 + .5 * hash(i + 9), mv = travel(t, [[ts, 1000 / QS5], [ts + 8, 1000 / QS5 + 8 * v]], { start: .25, stop: 0 });
    return creaturePose(SPECS.queen, { ...o, path: makePath([[lx + 1000, 0], [lx - 4000, 0]]), s: mv.s, moving: mv.moving, lean: mv.lean, expression: md.expression, blink: md.blink, emote: md.emote });
  }
  function c1s05(t, lt) {
    const z = 1.25 + .05 * ease(lt / 7), cx = 1000 + 40 * ease(lt / 7), cy = 600, [x0, x1] = view(cx, z);
    DUSK();
    layer(cx, cy, z, .1, t, () => { A().cloud(400 + 6 * t - 250, 170, .8, 1); A().cloud(1500 + 4 * t - 180, 120, .6, 2); });
    layer(cx, cy, z, .4, t, (a, b) => {
      const hill = x => 700 + 26 * Math.sin(x * .0035 + 2);
      for (let k = Math.floor(a / 140); k * 140 < b; k++) if (hash(k + 90) < .6) { const x = k * 140 + 60 * hash(k + 91); A().tree(x, hill(x) + 10, 110 + 80 * hash(k + 92), .05 * wind(t, x), k + 50, .3); }
      A().ground(hill, a, b, mixCol(P.leafDk, P.wingAccent, .2));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g5, x0, x1);
    A().props(g5, x0, x1, 12, 1.2, 0, 'sf');
    const qs = LX5.map((_, i) => queen5(t, i)), bp = t > SCARE5 - .4 && t < SCARE5 + .3 ? smear(bird5, t) : bird5(t);
    grass(t, x0, x1, g5, 16, 14, 30, 0);
    for (const q of qs) A().creature(q);
    if (t > rd('c1s05', 1) - 1.4) A().creature(bp);
    grass(t, x0, x1, g5, 16, 14, 30, 1, [[bp.head.x, bp.head.y + 60]]);
    Kit.camEnd();
    const [tx, ty] = toScreen(LX5[1] + 60, 500, [cx, cy, z]);
    Kit.text('1 em 40', tx, ty, 86, P.ink, { k: seg(t, rd('c1s05', 1), rd('c1s05', 1) + .4) });
  }

  // ---------- c1s06: close da rainha: pousa, perde as asas, anda e cava; leva o fungo na boca ----------
  const t6 = at('c1s06'), g6 = x => 860 + 8 * Math.sin(x * .004), QS6 = 480, L6 = makePath([[-1000, 0], [5000, 0]]), Q0 = (700 + 1000) / QS6;
  const LAND6 = rd('c1s06', 0) + 1.2, SHED6 = rd('c1s06', 0) + 2.3, DIG6 = rd('c1s06', 0) + 4;
  const QK6 = [[LAND6, Q0], [SHED6 + .7, Q0], [DIG6 - .1, Q0 + .9]], QO6 = { start: .4, stop: .5, seed: 61 };
  const q6s = t => travel(t, QK6, QO6).s;
  function queen6(t) {
    const o = { size: QS6, t, seed: 3, ground: g6 };
    if (t < LAND6) {
      const path = makePath([[-400, 420], [300, 640], [700, g6(700) - .17 * QS6]]);
      return creaturePose(QUEEN, { ...o, path, s: easeOut(seg(t, t6, LAND6)) * path.length / QS6, gait: 'fly' });
    }
    const m = travel(t, QK6, QO6), dig = ease(seg(t, DIG6, DIG6 + .6)), bob = dig * (.5 + .5 * Math.sin(TAU * 2.2 * (t - DIG6)));
    const p = creaturePose(SPECS.queen, { ...o, path: L6, s: m.s, moving: m.moving, lean: m.lean, drag: m.drag, antennae: dig ? 'tap' : 'explore', sq: .12 * spring(t, LAND6, 6, 16) + .08 * spring(t, SHED6, 8, 18) });
    return nod(p, .04 * dig, .03 * dig + .025 * bob, .45 * dig + .2 * bob);
  }
  function c1s06(t, lt) {
    const p = queen6(t), thx = p.spine[0].x, holeX = thx + .42 * QS6;
    const zc = kf(t, [[t6, 1], [rd('c1s06', 1), 1.08], [rd('c1s06', 1) + .9, 2.2], [rd('c1s06', 1) + 2.8, 2.25], [t6 + 9.4, 1.25]]);
    const close = seg(zc, 1.08, 2.2), cx = lerp(560 + .55 * (thx - 560), p.head.x, close), cy = lerp(600, p.head.y + 20, close), [x0, x1] = view(cx, zc);
    DUSK();
    layer(cx, cy, zc, .3, t, (a, b) => {
      for (let i = Math.floor(a / 80); i * 80 < b; i++) { const x = i * 80 + 40 * hash(i + 200); A().blade(x, 660, 200 + 260 * hash(i + 201), .12 * wind(t, x, 7), mixCol(P.grass, P.sun, .45)); }
      A().ground(x => 650 + 12 * Math.sin(x * .004), a, b, mixCol(P.grassDk, P.wingAccent, .3));
    });
    Kit.cam(cx, cy, zc, 0, hand(t));
    A().ground(g6, x0, x1);
    A().rock(260, g6(260) + 40, 80, 3);
    // Terra cavada atrás dela cresce; o buraco abre à frente.
    const dg = seg(t, DIG6, t6 + 10.4);
    if (dg > 0) {
      const bx = thx - .9 * QS6, hgt = 20 + 110 * dg;
      Kit.poly([[bx - 160, g6(bx - 160) + 6], [bx - 60, g6(bx) - .8 * hgt], [bx + 40, g6(bx) - hgt], [bx + 140, g6(bx + 140) + 6]], EARTH, { smooth: true, weight: 4 });
      Kit.ellipse(holeX, g6(holeX) + 4, 30 + 90 * ease(dg * 2), 12 + 18 * ease(dg * 2), P.line);
    }
    // Asas soltas: caem, rolam na poeira e param.
    if (t > SHED6) for (const s of [0, 1]) {
      const b = queen6(SHED6).spine[1], f = flutter(t, SHED6 + .15 * s, [b.x - (40 + 60 * s), b.y - 50], g6(b.x) - 8, 70 + s), tland = (g6(b.x) - 8 - (b.y - 50)) / 90 + SHED6 + .15 * s;
      const roll = ease(seg(t, tland, tland + 1.2)), x = f.x - 160 * roll * (1 + s), y = f.landed ? f.y - 10 : f.y;
      A().wing(x, y, .55 * QS6, f.landed ? Math.PI - .08 - .1 * s + .6 * Math.sin(TAU * roll) * (1 - roll) : Math.PI + f.angle + .3 * s);
      if (f.landed) A().dust(x, f.y + 6, seg(t, tland, tland + .7), 40 + s);
    }
    A().creature(p, { wings: t < SHED6 ? undefined : false, jaws: .35 });
    // Fungo trazido do ninho, na boca.
    const fx = p.head.x + p.facing * .12 * QS6, fy = p.head.y + .05 * QS6;
    Kit.ellipse(fx, fy, .045 * QS6, .038 * QS6, P.cream, { stroke: true });
    Kit.ellipse(fx - .012 * QS6, fy - .01 * QS6, .012 * QS6, .009 * QS6, P.cloud);
    if (t > LAND6) dust(SPECS.queen, q6s, queen6, t, 3);
    if (t > LAND6 - .05) A().dust(p.spine[0].x, g6(p.spine[0].x), seg(t, LAND6 - .05, LAND6 + .6), 77);
    // Torrões jogados para trás a cada cavada.
    if (dg > 0) for (let j = 0; j < 6; j++) {
      const u = frac(1.4 * (t - DIG6) + j / 6), dst = [thx - (.7 + .5 * hash(j)) * QS6, g6(thx) - 10], k = seg(u, 0, .85);
      const [px, py] = arcPt([holeX - 20, g6(holeX) - 10], dst, 120 + 60 * hash(j + 3), k);
      if (u < .85) Kit.ellipse(px, py, 13 + 6 * hash(j), 11, EARTH, { stroke: true });
      else A().dust(dst[0], dst[1] + 8, (u - .85) / .15, j);
    }
    grass(t, x0, x1, g6, 26, 30, 60, null, [[p.head.x, p.head.y + 60], [p.spine.at(-1).x, p.spine.at(-1).y + 60]], x => Math.abs(x - holeX) < 140 && dg > 0);
    Kit.camEnd();
  }

  // ---------- c1s07–c1s09: a câmara de fundação ----------
  const SURF = x => 140 + 6 * Math.sin(x * .005), FLOOR = 860, QS7 = 300, QX7 = 600, CHX = 820;
  const TUN7 = makePath([[1250, 150], [1235, 330], [1130, 500], [1020, 620]]);
  const QPATH7 = makePath([[QX7 - 1000, 0], [QX7 + 1000, 0]]);
  const EGGX = [728, 758, 790, 822], FUNG = [990, FLOOR, 260, 180];
  const t7 = at('c1s07'), t8 = at('c1s08'), t9 = at('c1s09');
  const SPIT = rd('c1s07', 0) + 1.1, EGG_T = EGGX.map((_, j) => rd('c1s07', 0) + 2.6 + .5 * j), HATCH = EGGX.map((_, j) => t8 + 5.6 + .5 * j);
  const PUPA = rd('c1s09', 0), BIRTH = [0, 1, 2].map(j => PUPA + .9 + .85 * j);
  const RINGS = [1, -1, 1].map(dir => loopPath(CHX + 60, FLOOR, 300, 60, dir)), WS9 = 110, WV9 = [1.25, 1, .7];
  // Operária j: nasce em BIRTH[j] no lugar da pupa, fica um instante e passa a rodear a rainha e o fungo.
  function worker9(t, j) {
    const RING = RINGS[j], L = RING.length, x0 = EGGX[j] - 8 - (CHX + 60), d0 = j === 1 ? -x0 : (L + x0) % L;  // nasce onde estava a pupa
    const mv = travel(t, [[BIRTH[j] + .6, 0], [BIRTH[j] + 12, 11.4 * WV9[j]]], { start: .5, stop: 0, seed: 90 + j });
    const d = (d0 + mv.s * WS9) % L, y = RING.at(d).y;
    const md = mood(t, [[BIRTH[j], 'surprised', j === 0 ? '!' : null], [BIRTH[j] + 1, 'neutral']], 90 + j);
    return { j, y, pose: creaturePose(SPECS.ant, { path: RING, s: d / WS9, size: WS9, ground: () => FLOOR + .15 * (y - FLOOR), t, seed: 90 + j, moving: mv.moving, sq: .2 * spring(t, BIRTH[j], 6, 16), antennae: 'explore', expression: md.expression, blink: md.blink, emote: md.emote }) };
  }
  function nest(t, cam) {
    const [cx, cy, z] = cam, [x0, x1] = view(cx, z);
    DUSK();
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(SURF, x0, x1);
    A().tree(330, SURF(330) + 6, 420, .04 * wind(t, 330), 4);
    grass(t, x0, x1, SURF, 18, 16, 32, null, [], x => Math.abs(x - 1250) < 40);
    A().soil(x0, 168, x1 - x0, 1400, 17);
    A().tunnel(TUN7, 50);
    A().chamber(CHX, FLOOR, 900, 290, 6);
    A().roots(330, 172, 330, 1, 9); A().roots(1650, 172, 300, 1, 12);
    Kit.ellipse(1250, SURF(1250) + 2, 26, 9, P.line);
    grains(t, 470, 1170, 590, FLOOR, 4, 31);
    // Fungo: cuspido em SPIT, cresce aos poucos pelos três planos.
    const grow = .55 * ease(seg(t, SPIT + .35, SPIT + 2.2)) + .25 * ease(seg(t, t8, t9)) + .2 * ease(seg(t, t9, t9 + 8));
    const ws = t > t9 ? [0, 1, 2].map(j => worker9(t, j)) : [];
    for (const w of ws) if (t >= BIRTH[w.j] && w.y < FLOOR) A().creature(w.pose);
    A().fungus(...FUNG, t, 3, grow);
    // Cria: ovos (aparecem um a um), larvas depois de eclodir, pupas em c1s09 e as três primeiras operárias.
    EGGX.forEach((x, j) => {
      if (t < EGG_T[j]) return;
      const pupa = j < 3 && t >= PUPA, born = j < 3 && t >= BIRTH[j];
      if (born) return;
      if (pupa) { const k = backOut(seg(t, PUPA + .1 * j, PUPA + .1 * j + .35)); A().pupa(x - 8, FLOOR, 46 * k + 8, t, 50 + j); return; }
      const h = seg(t, HATCH[j], HATCH[j] + 1);
      if (h < 1) A().egg(x, FLOOR, 11 * backOut(seg(t, EGG_T[j], EGG_T[j] + .3)), t, 40 + j, h);
      else A().larva(x, FLOOR, 16 + 34 * backOut(seg(t, HATCH[j] + 1, HATCH[j] + 1.3)), t, 40 + j, j & 1 ? 1 : -1);
    });
    // Rainha: parada; cospe o fungo, põe os ovos, toca-os com as antenas; no ar pesado quase não se move.
    const tap = anticipate(t, rd('c1s07', 1), .12, .2) * (1 - ease(seg(t, t8 + .5, t8 + 1.5))), look = ease(seg(t, BIRTH[0] + .3, BIRTH[0] + 1.2));
    const sq = EGG_T.reduce((v, te) => v + .05 * spring(t, te, 7, 16), 0) + .06 * spring(t, SPIT, 7, 16);
    const q = nod(creaturePose(SPECS.queen, { path: QPATH7, s: 1000 / QS7, size: QS7, ground: () => FLOOR, t, seed: 3, moving: 0, sq, age: .8 * ease(seg(t, t8, t8 + 6)) * (1 - .6 * look), antennae: tap > .1 ? 'tap' : 'explore' }),
      .02 * tap, .03 * tap, .4 * tap - .15 * look);
    A().creature(q, { wings: false, jaws: .3 });
    // Pedaço de fungo: na boca até SPIT, depois voa até o canteiro.
    const mx = q.head.x + .12 * QS7, my = q.head.y + .05 * QS7;
    if (t < SPIT + .35) { const [px, py] = arcPt([mx, my], [FUNG[0] - 40, FLOOR - 10], 60, seg(t, SPIT, SPIT + .35)); Kit.ellipse(px, py, .045 * QS7, .038 * QS7, P.cream, { stroke: true }); }
    for (const w of ws) if (t >= BIRTH[w.j] && w.y >= FLOOR) A().creature(w.pose);
    Kit.camEnd();
    return q;
  }
  const dark = t => .45 * ease(seg(t, rd('c1s08', 0), t8 + 7.5)) - .15 * ease(seg(t, rd('c1s09', 1), rd('c1s09', 1) + 2));
  function c1s07(t) {
    const cam = kf(t, [[t7, [1250, 300, 1.5]], [t7 + .5, [1240, 330, 1.5]], [t7 + 1.8, [820, 720, 1.4]], [t8, [770, 750, 1.55]]]);
    nest(t, cam);
  }
  function c1s08(t, lt) {
    const cam = [770 - 40 * ease(lt / 10), 750 + 25 * ease(lt / 10), 1.55 + .25 * ease(lt / 10)];
    nest(t, cam);
    Kit.flash(dark(t), P.shade);
    const [tx, ty] = toScreen(800, 640, cam);
    Kit.text('CO2 ~20%', tx, ty, 72, P.cream, { k: seg(t, rd('c1s08', 1), rd('c1s08', 1) + .4) });
  }
  function c1s09(t, lt) {
    const cam = [kf(t, [[t9, 730], [t9 + 3, 820]]), kf(t, [[t9, 775], [t9 + 3, 760]]), kf(t, [[t9, 1.8], [t9 + 3, 1.4], [t9 + 9, 1.5]])];
    const q = nest(t, cam);
    Kit.flash(dark(t), P.shade);
    const [ix, iy] = toScreen(q.head.x, q.head.y, cam);
    Kit.iris(ix, iy, 2300 * (1 - ease(seg(t, rd('c1s09', 1) + 2.4, rd('c1s09', 1) + 4))));
  }

  shotsById({ c1s01, c1s02, c1s03, c1s04, c1s05, c1s06, c1s07, c1s08, c1s09 });
})();
