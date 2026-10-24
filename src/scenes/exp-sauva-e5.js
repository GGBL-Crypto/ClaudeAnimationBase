// exp-sauva-e5.js: variante E5 do experimento visual (branch exp/visual-rico): os 0–60 s de sauva-operaria com o kit 3D
// (src/styles/toon3d) e multidões com física (src/nature/crowd.js). Mesmos planos e tempos do piloto 2D.
// Região A (c1s01, c1s02): o mundo do E4 (1 unidade = 100 px do plano aberto do 2D, X para a direita, Y para cima, Z para
// a câmera; o corte do solo é a face Z = 0), agora com faixas de ida e volta, fila, encontros e túneis com voltas pelas
// câmaras. Região B (c1s03–c1s06, ao entardecer, x ≈ 60–92): planos montados por dados com toonSet (shot.js), a partir
// do storyboard do 2D. Cada quadro é função pura de t.
(() => {
  const { add, mul, mix, unit } = V3;
  const at = id => PROJECT.storyboard.find(s => s.id === id).start;
  const rd = (id, j) => AnimationPlatform.projects['sauva-operaria'].storyboard.find(s => s.id === id).reads[j].start;
  const X3 = x => (x - 960) / 100, Y3 = y => -(y - 820) / 100;
  const N = { hero: '#D8652B', sauva: '#A9472C', root: '#D8BFA0', grain: '#D2A26E' };

  // ---------- região A: terreno, trilhas, túneis ----------
  const hT = (x, z) => .1 * Math.sin(x * .45 + 1) + .04 * Math.sin(x * 1.3) + .05 * Math.sin(z * .8 + x * .2) + (z < -14 ? .25 * (-14 - z) : 0);
  const TRAIL = -1, BACK = -3.5, X0 = -14, X1 = 18, YB = -14, TW = .34, NX = X3(1520), S1 = .4, SU = .26;
  const HERO = track3d([[X0, TRAIL + .3], [X1 + 4, TRAIL + .3]], hT);
  const TUN = [
    [[1500, 840], [1470, 1000], [1300, 1180], [1080, 1300], [930, 1385]],
    [[1560, 845], [1640, 1050], [1690, 1350], [1700, 1620]],  // poço próprio do ninho até a câmara 2 (x sempre crescendo: o piso não troca de parede)
    [[650, 1440], [470, 1560], [390, 1760]],
  ].map(pts => pts.map(([x, y]) => [X3(x), Y3(y)]));
  const CH = [[860, 1500, 460, 240, 1], [1700, 1700, 330, 180, 2], [390, 1860, 320, 170, 3]];
  // Volta pelo túnel: entra por trás da parede do fundo (escondida), desce pelo piso do túnel, dá meia-volta no chão da
  // câmara e sobe na outra faixa. zd/zu = profundidade das faixas de descida e subida.
  const tour = (tun, ch, zd, zu, back) => {
    const fy = Y3(ch[1]) + .03, floor = p => [p[0], p[1] - .12];
    const down = tun.map(floor), end = down[down.length - 1], mid = (zd + zu) / 2, r = (zd - zu) / 2;
    const dir = Math.sign(end[0] - down[down.length - 2][0]) || -1, sp = Math.min(1.8, ch[2] / 200 - .3) / 1.8;  // segue o rumo do túnel, cabe na câmara
    // Do fim do túnel desce em diagonal até o chão da câmara, anda e faz a meia-volta em semicírculo de raio r (as
    // pontas arredondadas por Chaikin; o semicírculo fica exato, curvatura 1 / r).
    const slope = z => [[end[0] + dir * .5 * sp, lerp(end[1], fy, .55), z], [end[0] + dir * 1.1 * sp, fy, z], [end[0] + dir * 1.5 * sp, fy, z]], xt = end[0] + dir * 1.8 * sp;
    const turn = Array.from({ length: 31 }, (_, k) => { const a = Math.PI * k / 30; return [xt + dir * r * Math.sin(a), fy, mid + r * Math.cos(a)]; });
    return resample([...chaikin([[down[0][0] + .6, -.15, back], [down[0][0] + .45, down[0][1] + .06, (zd + back) / 2], [down[0][0] + .3, down[0][1] + .1, zd - .25], ...down.map(p => [...p, zd]), ...slope(zd)], 3), ...turn.slice(1, -1),
      ...chaikin([...slope(zu).reverse(), ...down.slice().reverse().map(p => [...p, zu]), [down[0][0] - .3, down[0][1] + .1, zu - .25], [down[0][0] - .45, down[0][1] + .06, (zu + back) / 2], [down[0][0] - .5, -.15, back]], 3)], .03);
  };
  const TOURS = [tour(TUN[0], CH[0], -.1, -.34, -1.1), tour(TUN[1], CH[1], -.44, -.68, -1.5)];
  const ROOTS = [];
  for (let r = 0; r < 13; r++) {
    let x = X0 + 1.5 + (X1 - X0 - 3) * hash(r * 3.7 + 1), y = hT(x, 0) - .05, a = -Math.PI / 2;
    const pts = [[x, y]], L = 1 + 2.6 * hash(r * 6.1 + 4);
    for (let k = 1; k <= 9; k++) { a = clamp(a + .45 * (hash(r * 11 + k) - .5), -Math.PI * .85, -Math.PI * .15); x += L / 9 * Math.cos(a); y += L / 9 * Math.sin(a); pts.push([x, y]); }
    ROOTS.push(pts);
    const b = pts[3 + Math.floor(3 * hash(r * 2.3))], ba = a + (hash(r) < .5 ? .9 : -.9);
    ROOTS.push(Array.from({ length: 5 }, (_, k) => [b[0] + k * L / 12 * Math.cos(ba + .2 * k), b[1] + k * L / 12 * Math.sin(ba + .2 * k)]));
  }
  // Multidões: trilha principal (ida com folhas até o ninho, volta saindo dele), trilha de trás e os túneis.
  const adapt = tr => ({ length: tr.length, at: d => { const F = tr(d); return { p: F.p, f: F.f }; } });
  const lane = (tr, o) => ({ tr, path: adapt(tr), S: S1, speed: 1.5, gap: 1.15, rate: .45, t0: 0, t1: 28, ...o });
  const LANES = [
    lane(track3d(offsetPts([[X0, TRAIL], [NX, TRAIL]], .12), hT), { carry: .85, hide: [0, .35], seed: 1 }),
    lane(track3d(offsetPts([[NX, TRAIL], [X0, TRAIL]], .12), hT), { hide: [.35, 0], seed: 2 }),
    lane(track3d(offsetPts([[X0, BACK], [X1 + 4, BACK]], .12), hT), { carry: 1, speed: 2.2, seed: 3 }),
    lane(track3d(offsetPts([[X1 + 4, BACK], [X0, BACK]], .12), hT), { speed: 2.2, seed: 4 }),
    ...TOURS.map((pts, i) => lane(track3(pts), { S: SU, speed: .9, gap: 1.3, rate: .3, carry: .5, hide: [1.2, 1.2], seed: 5 + i })),
  ];
  const CROWD = makeCrowd(LANES, { meet: .55 });
  const GARDEN = [[CH[1], 0], [CH[2], 1], [CH[2], 2]].map(([c, j]) => ({ c, j, tr: track3([[X3(c[0]) - .4 + .5 * j, Y3(c[1]) + .03, -.15], [X3(c[0]) + .6 + .5 * j, Y3(c[1]) + .03, -.15 - .02 * j]]) }));

  // ---------- região B (c1s03–c1s06): relevo, monte do ninho ----------
  const MOUND = [66, -2], hB = (x, z) => .08 * Math.sin(x * .4 + 2) + .05 * Math.sin(z * .9 + x * .25) + 1.25 * Math.exp(-((x - MOUND[0]) ** 2 + (z - MOUND[1]) ** 2) / 3.2) + (z < -12 ? .3 * (-12 - z) : 0);
  const HOLES = [[65.3, -1.75], [66.2, -2.25], [67, -1.7], [65.8, -2.7]];
  const DUSK = { sky: ['#4C5C9C', '#C48C94', '#F2B286', '#F6D2A2'], key: 1.9, keyHex: '#FFB070', ambient: 1.05, groundLight: '#7A4A3A', sunHex: '#FFD7A0', sunAt: [-.55, .1], keyDir: [-6, 3.5, 3] };

  // ---------- construção ----------
  let St, E, world, ambient, B;
  window.buildLowpolyScene = art => {
    const THREE = art.THREE;
    St = toonStage(art, { sun: [-.45, .27], bloom: true, gobo: true, sunVisible: tgt => tgt[1] > -1 }); E = St.E;
    const free = [...LANES.slice(0, 4).flatMap(l => pathZones(l.path, .18)), ...pathZones(adapt(HERO), .2), { a: [NX, TRAIL], r: .9 }, { a: [X0, TRAIL + .62], b: [X1, TRAIL + .62], r: .3 }];  // faixa entre a heroína e a câmera
    world = toonBiome(St, 'meadow', { area: { x0: X0, x1: X1, z0: -24, z1: 0 }, ground: hT, free, seed: 3, gobo: true });
    ambient = toonAmbient(St, { area: { x0: X0, x1: X1, z0: -7.5, z1: -1.8 }, ground: hT, gnats: 8, butterflies: 2, clouds: 12 });
    // Chão: trilhas batidas (terra clara entre as faixas), o resto capim com manchas de barro.
    const color = (x, z) => {
      const dz = Math.min(Math.abs(z - TRAIL - .08), Math.abs(z - BACK)), k = clamp(1 - (dz - .28) / .3), m = .5 + .5 * noise1(9, x * .7 + z * .3);
      return [k > .6 ? '#F4D2B0' : mixCol('#7FB04A', '#B7C860', m * .5), Math.max(k, .25 * m)];
    };
    St.ground({ x0: X0, x1: X1, z0: -4.5, z1: 0, h: hT, rep: 1.2, seg: [1.5, 4], color });  // fino perto das trilhas
    St.ground({ x0: X0, x1: X1, z0: -50, z1: -4.3, h: hT, rep: 1.2, seg: .4, color, dy: -.005 });
    // O corte do solo: textura de terra do kit em camadas, furos dos túneis e das câmaras (alfa) e a parede do fundo.
    const K = 64, YT = .5, cv = document.createElement('canvas'); cv.width = (X1 - X0) * K; cv.height = (YT - YB) * K;
    const g = cv.getContext('2d'), px = (x, y) => [(x - X0) * K, (YT - y) * K];
    const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, '#B4703F'); gr.addColorStop(.3, '#93532F'); gr.addColorStop(1, '#6A3824'); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    g.globalAlpha = .6; g.globalCompositeOperation = 'multiply'; g.fillStyle = g.createPattern(St.tex('soil').image, 'repeat'); g.fillRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    for (let b = 0; b < 4; b++) { g.beginPath(); for (let x = 0; x <= cv.width; x += 16) g.lineTo(x, (1.4 + 3.2 * b) * K + 18 * Math.sin(x * .004 + b) + 7 * Math.sin(x * .013)); g.lineTo(cv.width, cv.height); g.lineTo(0, cv.height); g.fillStyle = b === 1 ? 'rgba(235,175,95,.14)' : `rgba(90,30,12,${.1 + .04 * b})`; g.fill(); }
    for (let i = 0; i < 900; i++) { const r = 2 + 6 * hash(i * 3 + 2) ** 2; g.beginPath(); g.ellipse(cv.width * hash(i * 3), cv.height * hash(i * 3 + 1), 1.3 * r, r, hash(i) * 3, 0, TAU); g.fillStyle = ['#7B4529', '#D2A574', '#5A3420', '#A8764A'][i % 4]; g.fill(); }
    const tunnelPath = pts => { const p = makePath(pts); g.beginPath(); for (let d = 0; d <= p.length; d += .1) { const q = p.at(d); g.lineTo(...px(q.x, q.y)); } };
    const chamberPts = ([x, y, w, h, sd]) => Array.from({ length: 14 }, (_, i) => { const a = i * TAU / 14, k = .9 + .18 * hash(sd + i * 2.3); return px(X3(x + Math.cos(a) * w / 2 * k), Y3(Math.min(y + 6, y - h / 2 + Math.sin(a) * h / 2 * k))); });
    const holes = (wd, style) => {
      g.lineCap = g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = style;
      for (const pts of TUN) { tunnelPath(pts); g.lineWidth = wd; g.stroke(); }
      for (const c of CH) { g.beginPath(); chamberPts(c).forEach(q => g.lineTo(...q)); g.closePath(); g.lineWidth = wd - TW * K; g.fill(); g.stroke(); }
    };
    holes(TW * K + 12, '#4A2414'); g.globalCompositeOperation = 'destination-out'; holes(TW * K, '#000'); g.globalCompositeOperation = 'source-over';
    const tex = art.own(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    tex.repeat.set(1 / (X1 - X0), 1 / (YT - YB)); tex.offset.set(-X0 / (X1 - X0), -YB / (YT - YB));
    const shape = new THREE.Shape(); shape.moveTo(X0, YB); for (let x = X0; x <= X1; x += 1) shape.lineTo(x, hT(x, 0)); shape.lineTo(X1, YB); shape.closePath();
    const face = new THREE.Mesh(art.own(new THREE.ShapeGeometry(shape)), St.toon({ map: tex, alphaTest: .5 })); face.castShadow = face.receiveShadow = true; St.scene.add(face);
    const wall = new THREE.Mesh(art.own(new THREE.PlaneGeometry(X1 - X0, -.3 - YB)), St.toon({ map: St.tex('soil'), color: '#C08060' })); wall.position.set((X0 + X1) / 2, (YB - .3) / 2, -.8);
    wall.receiveShadow = true; St.scene.add(wall);
    // Luz quente vazando pela entrada do ninho.
    const lc = document.createElement('canvas'); lc.width = 128; lc.height = 144; const lg = lc.getContext('2d'), f = lg.createRadialGradient(64, 8, 0, 64, 8, 120);
    f.addColorStop(0, 'rgba(255,255,255,1)'); f.addColorStop(.4, 'rgba(255,255,255,.35)'); f.addColorStop(1, 'rgba(255,255,255,0)'); lg.fillStyle = f; lg.fillRect(0, 0, 128, 144);
    const lt = art.own(new THREE.CanvasTexture(lc)); lt.colorSpace = THREE.SRGBColorSpace;
    const leak = new THREE.Mesh(art.own(new THREE.PlaneGeometry(3.2, 3.6)), art.own(new THREE.MeshBasicMaterial({ map: lt, color: '#FFB866', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    leak.position.set(X3(1500), Y3(840) - 1.6, .03); St.scene.add(leak);
    B = toonSet(St, REGION_B());
  };

  // ---------- região A, por quadro ----------
  function ant(track, s, S, t, o, hex, carry, look) {
    const P = creature3d('ant', track, s, S, t, o); P.hidden = !!o.hidden; drawCreature3d(E, P, { hex, ...look });
    if (carry) shotCarry(E, P, 'leaf');
    return P;
  }
  function backdrop(t) {
    for (let i = 0; i < 6; i++) E.quad('far', [-30 + 14 * i + 5 * hash(i), -2, -38 - 6 * hash(i + 3)], [9 + 3 * hash(i + 5), 0, 0], [0, 4 + 2 * hash(i + 7), 0], [0, 0, 6], i % 2 ? '#6E9E4A' : '#82AE55');
    for (let i = 0; i < 22; i++) { const x = X0 + 1.5 * i + .8 * hash(i + 40), z = -15 - 2 * hash(i + 41), h = 1.2 + 1.2 * hash(i + 42); tree(E, [x, hT(x, z), z], h, .6 * h, t, i, { clusters: 1, n: 36 }); }
    const tx = X3(260), tz = -2.6; tree(E, [tx, hT(tx, tz), tz], 3.4, 1.2, t, 7, { n: 150 });
    const nx = X3(1500); E.ovoid([nx, hT(nx, TRAIL) - .05, TRAIL], [1, 0, 0], [0, 1, 0], .7, .28, .6, '#A8643C'); E.ovoid([nx + .05, hT(nx, TRAIL) + .2, TRAIL], [1, 0, 0], [0, 1, 0], .2, .05, .16, '#3A1C10');
    world.draw(t, E); ambient(t, E);
    // Joaninha (o besouro do kit com outro visual) andando atrás da trilha.
    drawCreature3d(E, creature3d('ladybug', track3d([[6.4, -2.1], [11, -1.8]], hT), (.4 + .13 * t) / .32, .32, t, { seed: 9, id: 'ladybug' }), { expression: 'alegre' });
  }
  function crowds(t) {
    for (const a of CROWD.at(t)) {
      const ln = LANES[a.lane];
      ant(ln.tr, a.s / ln.S, ln.S, t, { seed: a.seed, moving: a.moving, touch: a.meet && { k: a.meet.k, side: a.meet.side }, id: a.id, hidden: a.hidden }, N.sauva, a.carry);
    }
  }
  function underground(t) {
    // Jardineiras paradas nas câmaras sem trânsito; fungo no fundo das câmaras; grãos que se soltam do teto e ficam no chão.
    for (const q of GARDEN) ant(q.tr, (.4 + .1 * q.j) / SU, SU, t, { seed: 60 + q.j, moving: 0, sweep: .4, up: .15 * Math.sin(t * .7 + q.j), id: 'garden' + q.c[4] + q.j }, N.sauva, false);
    CH.forEach(([x, y, w, h, sd], c) => {
      const n = Math.round(clamp(w * h / 3500, 10, 32)), cx = X3(x), fy = Y3(y);
      for (let i = 0; i < n; i++) {
        const u = 2 * hash(sd + i * 3.1) - 1, v = hash(sd + i * 5.7) * Math.sqrt(1 - u * u), r = (.07 + .05 * hash(sd + i * 1.9)) * Math.min(w, 1.6 * h) / 100 * (1 + .03 * Math.sin(t * 1.3 + i));
        E.ball([cx + u * (.36 * w / 100 - r), fy + (v * (.75 * h / 100 - r) + .8 * r), (c === 1 ? -.08 : -.42) - .3 * hash(sd + i * 7.3)], r, i % 4 ? '#F4ECDA' : '#E7D2A8');
      }
      for (let j = 0; j < 14; j++) {
        const t0 = 8 + j * .45 + .3 * hash(c * 31 + j), from = [cx + .6 * (hash(c * 9 + j * 5.7) - .5) * w / 100, fy + .85 * h / 100, -.15 - .5 * hash(c + j)];
        if (t >= t0) E.ball(fall(t, t0, from, fy + .02, { vt: 1.1, tau: .3, sway: .05, seed: c * 50 + j }).p, .022, N.grain);
      }
    });
    ROOTS.forEach((pts, r) => pts.slice(1).forEach((q, k) => E.rod([...pts[k], .03], [...q, .03], (r % 2 ? .025 : .05) * (1 - .8 * k / pts.length), N.root, 'root')));
  }
  // Forídea: de frente entre a formiga e a câmera; a frente mistura a câmera com o rumo até o alvo no chão (sem
  // normalizar o rumo, que some quando a mosca está bem em cima dele).
  function fly(pos, t, target) {
    const f = unit(add(unit([E.eye[0] - pos[0], 0, E.eye[2] - pos[2]]), mul([target[0] - pos[0], 0, target[2] - pos[2]], 2)));
    drawCreature3d(E, creature3d('fly', () => ({ p: pos, f, u: [0, 1, 0] }), 0, .2, t, { seed: 5, id: 'fly' }), { lookAt: target, expression: 'curioso' });
  }
  const DZ = z => 9.6 / z / Math.tan(Math.atan(Math.tan(20 * Math.PI / 180) * 16 / 9));
  const heroX = t => X3(640 + 60 * t);
  const FLY_IN = rd('c1s01', 0) + .1, OUT1 = rd('c1s01', 0) + 3.3, CUT1 = OUT1 + .55;
  const t2 = at('c1s02'), MOOD = [[0, 'neutro'], [FLY_IN + .7, 'susto'], [FLY_IN + 1.7, 'curioso'], [CUT1, 'neutro'], [t2 + 2, 'curioso'], [t2 + 11.5, 'alegre']];

  function c1s01(t) {
    St.begin(t);
    const hs = (heroX(t) - X0) / S1, hh0 = creature3d('ant', HERO, hs, S1, t, { seed: 7 }).head.c, hh = add(hh0, [-.06 * S1, .3 * S1, 0]), drift = [.03 * noise1(41, t * 1.1), .02 * noise1(42, t * 1.3), 0];
    // Mosca: chega de cima e de lado, paira, e depois do corte sobe e sai pelo alto do quadro (só some lá fora).
    const flyAt = t < CUT1 ? (t > FLY_IN ? add(mix(add(hh, [.6, .5, .3]), hh, easeOut(seg(t, FLY_IN, FLY_IN + .8))), drift) : null)
      : t < CUT1 + 2.6 ? add(add(hh, drift), mul([-.6, 3, 0], easeIn(seg(t, CUT1 + .6, CUT1 + 2.6)))) : null;
    if (t < CUT1) {  // a câmera vem antes do desenho: rostos e detalhes dependem dela
      const d = lerp(.62, .58, ease(seg(t, 0, OUT1))) * lerp(1, 4, easeIn(seg(t, OUT1, CUT1)));
      St.camera(add(hh0, [.02, .09, 0]), d, .1, .45);
    } else {
      const k = kf(t, [[CUT1, [X3(640 + 60 * CUT1), .25, TRAIL, DZ(3.8), .26]], [5.8, [X3(980), .4, TRAIL, DZ(2.6), .3]], [8.6, [X3(1150), Y3(1330), 0, DZ(.85), .02]], [9.9, [X3(1100), Y3(1330), 0, DZ(.85), .02]], [12.3, [X3(880), Y3(1420), 0, DZ(1.7), .05]], [14.1, [X3(880), Y3(1425), 0, DZ(1.78), .05]]]);
      St.camera([k[0], k[1], k[2]], k[3], k[4], .12 * (1 - seg(t, 5.8, 8.6)));
    }
    backdrop(t); crowds(t); underground(t);
    ant(HERO, hs, S1, t, { seed: 7, id: 'hero' }, N.hero, true, { mood: mood(t, MOOD, 7), lookAt: flyAt || undefined });
    if (flyAt) fly(flyAt, t, hh0);
    St.end();
  }
  // c1s02: ela anda, para, ergue a cabeça e varre o ar com as antenas; no fim vira a cabeça para trás.
  const S2X = 9, HK2 = [[t2 - 2, -3.2], [t2 + 1.6, 0], [t2 + 11.4, 0], [t2 + 15.4, 4]], HO2 = { start: .5, stop: .9, seed: 21 };
  function c1s02(t, lt) {
    St.begin(t);
    const m = travel(t, HK2, HO2), hx = S2X + m.s * S1;
    const upK = anticipate(t, t2 + 2, .12, .2) * (1 - ease(seg(t, t2 + 11, t2 + 11.6)));
    const look = 2.2 * ease(seg(t, t2 + 5.2, t2 + 5.55)) * (1 - ease(seg(t, t2 + 10.6, t2 + 10.95)));
    const z = 1 + .08 * ease(seg(lt, 2, 12)), cx = S2X + .6 * (hx - S2X);
    St.camera([cx + .05, hT(cx, TRAIL) + .1, TRAIL + .3], DZ(z) * S1 / 6.2 * .7, .22, .15);
    backdrop(t); crowds(t);
    ant(HERO, (hx - X0) / S1, S1, t, { seed: 7, moving: m.moving, up: .35 * upK, look, sweep: .5 * upK, id: 'hero' }, N.hero, false, { mood: mood(t, MOOD, 7) });
    const nk = Math.min(seg(t, rd('c1s02', 1), rd('c1s02', 1) + .4), 1 - seg(t, rd('c1s02', 2) - .3, rd('c1s02', 2)));
    St.label('Saúva-limão (Atta sexdens)', nk);
    St.end();
  }

  // ---------- região B: planos por dados (do storyboard do 2D) ----------
  function REGION_B() {
    const t3 = at('c1s03'), t4 = at('c1s04'), t5 = at('c1s05'), t6 = at('c1s06'), g = (x, z, dy = 0) => [x, hB(x, z) + dy, z];
    // c1s03: alados sobem em espiral dos buracos do monte; guardas andam entre os buracos; a câmera inclina para cima.
    const LAUNCH = Array.from({ length: 16 }, (_, i) => i < 4 ? rd('c1s03', 0) + .3 + .9 * i : rd('c1s03', 1) + (i - 4) * .26);
    const alates = LAUNCH.map((t0, i) => {
      const [hx, hz] = HOLES[i % 4], a0 = TAU * hash(i + 300), dir = i & 1 ? 1 : -1, y0 = hB(hx, hz);
      const fly = Array.from({ length: 34 }, (_, k) => { const a = a0 + dir * k * .7, r = .02 + .06 * k; return [hx + r * Math.cos(a), y0 - .12 + .5 * k, hz + .6 * r * Math.sin(a)]; });
      return { id: 'alate' + i, look: 'alate', S: .28, seed: 10 + i, legs: [{ t0, t1: t0 + 9.5, fly, ease: 'in2' }] };  // fica lá no alto, fora do quadro
    });
    const cam3 = t => shotLook([66.3, 1.15, 3.4], [66 + .3 * ease(seg(t, t3, t3 + 9)), kf(t, [[t3, 1.35], [rd('c1s03', 1), 1.45], [t3 + 8.5, 7.6], [t3 + 9.1, 7.8]]), -2]);
    // c1s04: a rainha cruza o céu; machos atrás dela, um chega junto (acasala) e todos se afastam; alados ao longe.
    const QY = 25, QP = [[61, QY + .2, -1], [64, QY + .55, -1.2], [67, QY + .1, -.9], [70, QY + .6, -1.1], [73, QY + .25, -1], [76, QY + .55, -1], [80, QY + .3, -1]];
    const QL = makePath3(QP).length;
    const males = Array.from({ length: 6 }, (_, i) => {
      const peel = i ? rd('c1s04', 1) + .7 + .55 * i : rd('c1s04', 0) + 2.3, dir = i & 1 ? -1 : 1, lag = i ? .55 + .45 * i : .28, dy = i ? dir * (.35 + .15 * i) : .46, dz = i ? ((i % 3) - 1) * .35 : 0;
      const xp = lerp(QP[0][0], QP.at(-1)[0], (peel - t4) / (at('c1s05') - t4));
      const fly = QP.map(([x, y, z]) => { const e = Math.min(3, Math.max(0, x - lag - xp)); return [x - lag - .25 * e, y + dy + dir * .5 * e * e, z + dz - .2 * e * (i % 2 ? 1 : -1)]; });
      return { id: 'male' + i, look: 'alate', S: .3, seed: 20 + i, legs: [{ t0: t4, t1: t4 + (t5 - t4) * makePath3(fly).length / QL, fly, ease: 'lin', exit: true }] };  // mesma velocidade da rainha
    });
    const far4 = Array.from({ length: 9 }, (_, i) => {
      const y = QY + .8 + 1.6 * hash(i + 80), z = -6 - .9 * i, dir = i % 2 ? 1 : -1, x0 = dir > 0 ? 57 : 85;
      return { id: 'far' + i, look: 'alate', S: .3, seed: 80 + i, legs: [{ t0: t4 - 4 * hash(i + 82), t1: t4 + 14 + 6 * hash(i + 83), fly: [[x0, y, z], [x0 + dir * 14, y + .6 * Math.sin(i), z + .5], [x0 + dir * 28, y, z]], ease: 'lin', exit: true }] };
    });
    const cloud = (E, c, k, sd) => { for (let j = 0; j < 6; j++) E.ovoid([c[0] + k * (j - 2.5) * .7, c[1] + k * .35 * Math.sin(j * 2.1 + sd), c[2] + k * .3 * Math.cos(j * 1.3)], [1, 0, 0], [0, 1, 0], k * (.7 + .3 * hash(sd + j)), k * .45, k * .6, '#FFF6EE', 'far'); };
    const qx4 = t => QP[0][0] + (QP.at(-1)[0] - QP[0][0]) * seg(t, t4, at('c1s05'));
    // c1s05: rainhas pousam; o pássaro chega saltando, bica, elas fogem (uma voa); "1 em 40".
    const SCARE5 = rd('c1s05', 1) + .85, T0B = rd('c1s05', 1) - .3, LX = [77.6, 78.5, 79.4, 80.1, 80.8], LZ = [-1.7, -2.5, -1.9, -2.7, -2.05];
    const queens5 = LX.map((x, i) => {
      const z = LZ[i], tl = rd('c1s05', 0) - .1 + .24 * i, ts = SCARE5 + .15 + .08 * i, v = (2.2 + .5 * hash(i + 9)) * .45;
      const land = { t0: tl - 2.2, t1: tl, fly: [g(x + 4, z - .6, 2.4), g(x + 2.2, z - .3, .9), g(x + 1.1, z, .03), g(x + .55, z), g(x, z)], ease: 'out', land: true };
      const stand = { t0: tl, walk: [[x, z], [x - 14, z]], keys: i === 2 ? [[tl, 0], [ts + 5, 0]] : [[tl, 0], [ts, 0], [ts + 6, 6 * v]], start: .6, stop: 0, exit: i !== 2 };
      const legs = i === 2 ? [land, stand, { t0: ts, t1: ts + 1.8, fly: [g(x, z), g(x - .5, z, .02), g(x - 1.6, z + .3, .7), g(x - 4.5, z + 1, 4.5)], ease: 'in', exit: true }] : [land, stand];
      return { id: 'queen' + i, look: 'queen', S: .45, seed: 30 + i, legs, mood: [[t5, 'neutro'], [SCARE5 + .05 * i, 'susto']], up: [[SCARE5 + .05 * i, 0], [SCARE5 + .05 * i + .12, .3], [SCARE5 + .05 * i + .5, 0]] };
    });
    const bird = { id: 'bird', look: 'bird', S: .9, seed: 7, mood: [[t5, 'neutro'], [SCARE5, 'curioso']],
      legs: [{ t0: T0B - 1.6, walk: [[84.6, -2.2], [70, -2.2]], keys: [[T0B - 1.6, 0], [T0B + .8, 3.2], [SCARE5 + 1.2, 3.2], [SCARE5 + 2, 3.9]], start: .3, stop: .3 }],
      up: [[SCARE5 - .35, 0], [SCARE5 - .1, -.9], [SCARE5 + .15, 0], [SCARE5 + 2.2, 0], [SCARE5 + 2.45, -.9], [SCARE5 + 2.7, 0]] };
    // c1s06: close lateral da rainha: pousa, perde as asas (caem e deitam na poeira), anda e cava; fungo na boca.
    const LAND6 = rd('c1s06', 0) + 1.2, SHED6 = rd('c1s06', 0) + 2.3, DIG6 = rd('c1s06', 0) + 4, Q6 = [88, -1.6];
    const queen6 = { id: 'queen6', look: 'queen', S: .5, seed: 3, shed: SHED6, dig: [DIG6, DIG6 + 6], carry: { hex: '#F4ECDA', r: .05 }, dust: '#D8B888', mood: [[t6, 'neutro'], [SHED6 - .2, 'curioso'], [DIG6, 'alegre']],
      legs: [{ t0: t6, t1: LAND6, fly: [g(Q6[0] - 5, Q6[1] + .8, 2.6), g(Q6[0] - 2.2, Q6[1] + .3, .7), g(Q6[0] - 1, Q6[1], .03), g(Q6[0] - .5, Q6[1]), g(...Q6)], ease: 'out', land: true },
        { t0: LAND6, walk: [Q6, [Q6[0] + 10, Q6[1]]], keys: [[LAND6, 0], [SHED6 + .7, 0], [DIG6 - .1, .45]], start: .4, stop: .5 }] };
    const cam6 = (t, A) => {
      const p = A('queen6'), head = p ? p.head.c : g(...Q6, .1), close = seg(kf(t, [[t6, 1], [rd('c1s06', 1), 1.08], [rd('c1s06', 1) + .9, 2.2]]), 1.08, 2.2);
      const tgt = mix([Q6[0] + .1, hB(...Q6) + .2, Q6[1]], head, close);
      return [tgt, lerp(1.5, .8, close), .12, .05];
    };
    return {
      area: { x0: 50, x1: 94, z0: -24, z1: 8 }, ground: hB, biome: 'meadow', seed: 13, free: [{ a: [85.5, -.7], b: [91, -.7], r: .65 }],  // c1s06: nada entre a rainha e a câmera
      fine: [{ x0: 60, x1: 72, z0: -5.5, z1: 4, seg: [2, 2] }, { x0: 74, x1: 86, z0: -4.5, z1: 2.5, seg: [1.5, 1.5] }, { x0: 84.5, x1: 92, z0: -3.5, z1: 2.5, seg: [3, 3] }],
      ambient: { area: { x0: 58, x1: 92, z0: -7, z1: -1 }, gnats: 6, butterflies: 1, clouds: 0, dust: 1800 },
      shots: {
        c1s03: { t0: t3, t1: t4, mood: DUSK, camera: cam3, cast: alates, holes: HOLES.map(([x, z]) => [x, z, .13]), trees: [[60.4, -4.2, 3.4, 1.3, 3], [72.5, -6, 2.8, 1.1, 5]],
          crowd: { meet: .6, lanes: [{ walk: [HOLES[0], [66.1, -1.45], HOLES[2]], look: 'ant', S: .3, speed: 1.2, rate: .35, gap: 1.2, both: true, side: .07, dip: [[...HOLES[0], .35, .3], [...HOLES[2], .35, .3]], hide: [.25, .25] }] } },
        c1s04: { t0: t4, t1: t5, mood: { ...DUSK, sky: ['#5A78C0', '#9AB0D8', '#F0C8A0', '#F8DDB8'], key: 2.1, ambient: 1.25 }, cast: [...far4, ...males, { id: 'queenAir', look: 'queen', S: .5, seed: 2, legs: [{ t0: t4, t1: t5, fly: QP, ease: 'lin' }] }],
          camera: t => [[70 + .4 * (qx4(t) - 70), QY + .3, -1], 4.6, -.18, 0],
          props: (t, E) => { for (let i = 0; i < 7; i++) cloud(E, [56 + 5 * i - .2 * t, QY - 1.5 + 4 * hash(i + 3), -12 - 6 * hash(i + 4)], 1.2 + hash(i), i); cloud(E, [86 - .9 * (t - t4), QY - .4, 2.2], .6, 9); } },
        c1s05: { t0: t5, t1: t6, mood: DUSK, cast: [...queens5, bird], labels: [[rd('c1s05', 1), t6, '1 em 40']], trees: [[74.5, -9, 3, 1.2, 8], [84, -10, 3.6, 1.4, 9], [79, -12, 3.2, 1.3, 10]],
          camera: (t, A, lt) => [[79.3 + .4 * ease(lt / 7), hB(79.3, -2.2) + .32, -2.2], 3.7, .2, .12] },
        c1s06: { t0: t6, t1: t6 + 10.4, mood: DUSK, cast: [queen6], camera: cam6, trees: [[85.6, -7, 3, 1.2, 12]] },
      },
    };
  }

  shotsById({ c1s01, c1s02, c1s03: (t, lt) => B.c1s03(t, lt), c1s04: (t, lt) => B.c1s04(t, lt), c1s05: (t, lt) => B.c1s05(t, lt), c1s06: (t, lt) => B.c1s06(t, lt) });
})();
