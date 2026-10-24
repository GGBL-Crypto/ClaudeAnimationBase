// c07_dentes.js: capítulo 7 de sauva-operaria (Dentes gastos), planos c7s01–c7s05.
// Close das mandíbulas (eco de c3s04b, agora na trilha nublada); o fio cega e ela quase não corta; fileira de
// cortadoras (metade devagar, -44%); a irmã corta e ela só carrega; chuva na trilha e ela mais lenta; corte do solo
// (velhas na chuva, jovens no ninho seco); ela parada na boca do túnel.
// Sem "mandíbula gasta" no motor: o desgaste (ponta romba, lascas, fio sem brilho) é desenhado aqui por cima da peça.
(() => {
  const P = STYLE.palette, A = () => NatureArt;
  // Protagonista: mesmas constantes em todos os capítulos (copie sem mudar).
  const at = id => PROJECT.storyboard.find(s => s.id === id).start;
  const SEED = 7, LOOK = { color: P.sauvaHero, dark: mixCol(P.sauvaHero, P.ink, .35) };
  const BORN = at('c3s04'), DIES = at('c8s01'), age = t => clamp((t - BORN) / (DIES - BORN));
  const her = o => creaturePose(SPECS.ant, { seed: SEED, age: age(o.t), ...o });
  // Início da fala j do plano: os momentos-chave caem aqui.
  const rd = (id, j) => PROJECT.storyboard.find(s => s.id === id).reads[j].start;
  const end = id => PROJECT.storyboard.find(s => s.id === id).end;

  // ---------- ajudas do capítulo (as de c01/c03, locais) ----------
  const hand = t => ({ t, k: .5, seed: 5 });
  const view = (cx, zoom) => [cx - W / 2 / zoom - 80, cx + W / 2 / zoom + 80];
  const toScreen = (x, y, [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
  // Camada de fundo com paralaxe só horizontal (f); draw(x0, x1) recebe a faixa visível em coordenadas da camada.
  function layer(cx, cy, zoom, f, t, draw) {
    const lx = lerp(960, cx, f);
    Kit.cam(lx, cy, zoom, 0, hand(t)); draw(lx - W / 2 / zoom - 200, lx + W / 2 / zoom + 200, lx); Kit.camEnd();
  }
  // Capim entre x0 e x1 sobre gy; odd = 0/1 desenha só metade; rk (chuva) agita as folhas.
  function grass(t, x0, x1, gy, step, h0, h1, odd = null, rk = 0) {
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      if (odd !== null && (k & 1) !== odd) continue;
      const x = k * step + .5 * step * hash(k + 3), y = gy(x) + 3;
      A().blade(x, y, h0 + (h1 - h0) * hash(k + 7), bladeBend(t, x, y, [], 60, 3) + rk * .4 * noise1(k, t * 4), k & 1 ? P.grass : P.grassDk);
    }
  }
  // Move a cabeça (e as antenas) depois de creaturePose; da > 0 baixa o olhar.
  function nod(p, dx, dy, da) {
    const hx = p.head.x + p.facing * dx * p.size, hy = p.head.y + dy * p.size, a = p.facing * da, co = Math.cos(a), si = Math.sin(a);
    const move = ([x, y]) => { x += hx - p.head.x; y += hy - p.head.y; return [hx + (x - hx) * co - (y - hy) * si, hy + (x - hx) * si + (y - hy) * co]; };
    for (const ap of SPECS[p.spec].appendages) if (ap.attach === 'head') p.appendages[ap.name] = p.appendages[ap.name].map(move);
    p.head = { x: hx, y: hy, angle: p.head.angle + a };
    return p;
  }
  // Ponto k (0..1) ao longo do fio da mandíbula de p (vista lateral, virada para a direita), como em c3s04b.
  function edge(p, jaw, k) {
    const u = p.size / 100, ha = p.head.angle, ma = ha + .6 - .5 * jaw;
    const rx = p.head.x + u * (12.6 * Math.cos(ha) - 7.8 * Math.sin(ha)), ry = p.head.y + u * (12.6 * Math.sin(ha) + 7.8 * Math.cos(ha));
    const lx = lerp(.5, 9.2, k), ly = lerp(-1.4, 1.4, k * k);
    return [rx + u * (lx * Math.cos(ma) - ly * Math.sin(ma)), ry + u * (lx * Math.sin(ma) + ly * Math.cos(ma))];
  }
  function sparkle(x, y, r, col) {
    const pts = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i & 1 ? .25 : 1; pts.push([x + r * q * Math.cos(a), y + r * q * Math.sin(a)]); }
    Kit.poly(pts, col, { weight: 3 });
  }
  // Brilho que corre pelo fio (k 0..1); dull = fio cego: o brilho sai cinza, curto, e morre no meio.
  function glint(p, jaw, k, r, dull = false) {
    if (k <= 0 || k >= 1) return;
    const e = (dull ? .5 : 1) * easeOut(k), s = Math.sin(Math.PI * k), col = dull ? P.stone : P.cloud;
    Kit.line(Array.from({ length: 6 }, (_, i) => edge(p, jaw, Math.max(0, e - .3 + .06 * i))), col, r * .17, { alpha: (dull ? .5 : .85) * s });
    const [x, y] = edge(p, jaw, e); sparkle(x, y, (dull ? .35 : 1) * r * s, col);
  }
  // Mandíbula gasta (k 0..1): ponta romba e arredondada, três lascas no fio. Por cima da peça do motor.
  function wear(p, jaw, k, col = LOOK.dark) {
    if (k <= 0) return;
    const u = p.size / 100, [tx, ty] = edge(p, jaw, .9), r = 1.55 * u * k, w = Math.max(1.2, .55 * u);
    Kit.ellipse(tx, ty, r + w, r + w, P.line); Kit.ellipse(tx, ty, r, r, col);
    for (const q of [.4, .58, .74]) {
      const [ax, ay] = edge(p, jaw, q - .03), [bx, by] = edge(p, jaw, q + .03), [mx, my] = edge(p, jaw, q), l = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / l, ny = (bx - ax) / l;
      Kit.line([[mx + nx * .9 * u * k, my + ny * .9 * u * k], [mx - nx * .5 * u * k, my - ny * .5 * u * k]], P.line, w, { smooth: false });
    }
  }
  // Folha de pé (brota do chão, o pé fica escondido pelo chão desenhado de novo por cima) com a mordida centrada no
  // ponto J (onde a mandíbula trabalha). leafPiece morde a borda de cima em (w·.1, −h/2); a borda de cima olha para ela.
  // cut0: mordida de referência; a folha recua para o fundo dessa mordida ficar na mandíbula.
  function leafAt(J, S, th = .35, wf = 2.2, hf = 1, cut0 = 0) {
    const w = wf * S, h = hf * S, a = -Math.PI / 2 + th, d = [Math.cos(a), Math.sin(a)], n = [Math.sin(a), -Math.cos(a)], b = .5 * h - .75 * cut0 * h * .9;
    return { x: J[0] - .1 * w * d[0] - b * n[0], y: J[1] - .1 * w * d[1] - b * n[1], w, h, a };
  }
  const drawLeaf = (l, cut, col = P.leaf) => A().leafPiece(l.x, l.y, l.w, l.h, l.a, col, cut);
  // Cortadora trabalhando de pé diante da folha (virada para a direita): wk 0..1 é o ciclo de morder.
  function cutter(p, wk, st = 1) { return nod(p, .02 * st * wk, -.03 + .02 * st * wk, .02 + .12 * st * wk - .12 * (1 - st)); }

  // ---------- mundo da trilha nublada (c7s02–c7s04b) ----------
  const gT = x => 820 + 12 * Math.sin(x * .004 + 1) + 5 * Math.sin(x * .013);
  const LT = makePath([[-3000, 820], [5000, 820]]), LT_L = makePath([[5000, 820], [-3000, 820]]);
  const sAt = (x, size) => (x + 3000) / size, sAtL = (x, size) => (5000 - x) / size;  // s (BL) com o corpo em x
  const BACKT = makePath([[5000, 790], [-3000, 790]]);
  const FAR = { color: mixCol(P.sauva, P.stone, .35), dark: mixCol(P.sauvaDk, P.stone, .35) };  // irmãs ao fundo, apagadas
  // Céu nublado, nuvens, morro, árvores e chão; irmãs voltando com folhas ao fundo. Deixa a câmera aberta.
  function outdoors(t, cam, rk, o = {}) {
    const [cx, cy, z] = cam;
    A().sky(rk);
    layer(cx, cy, z, .1, t, (a, b, lx) => { for (let i = 0; i < 5; i++) A().cloud(lx + (frac(hash(i + 90) + (.006 + .002 * i) * t) - .5) * (W / z + 900), cy - 330 / z + 60 * hash(i + 91), .8 + .3 * hash(i + 92), i); });
    layer(cx, cy, z, .3, t, (a, b) => A().ground(x => 650 + 40 * Math.sin(x * .002 + 1) + 18 * Math.sin(x * .006), a, b, mixCol(P.foliage, P.stone, .45)));
    layer(cx, cy, z, .6, t, (a, b) => {
      const hill = x => 750 + 20 * Math.sin(x * .0035 + 2);
      for (let k = Math.floor(a / 170); k * 170 < b; k++) if (hash(k + 70) < .6) { const x = k * 170 + 60 * hash(k + 71); A().tree(x, hill(x) + 10, 130 + 90 * hash(k + 72), .05 * wind(t, x) + rk * .1 * noise1(k, t * 2.5), k + 30, .35); }
      A().ground(hill, a, b, mixCol(P.leafDk, P.stone, .3));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    const [x0, x1] = view(cx, z);
    A().ground(gT, x0, x1);
    A().props(gT, x0, x1, 17, 1.2, 0, 'sm');
    if (o.back !== false) for (const s of crowd(BACKT, t, 10, 71, { speed: 120, spacing: 420, carryEvery: 1, sizeVar: .1 })) {
      const sz = 150 * s.size, x = BACKT.at(s.s).x;
      if (x > x0 - 200 && x < x1 + 200) A().creature(creaturePose(SPECS.ant, { path: BACKT, s: s.s / sz, size: sz, ground: x => gT(x) - 30, t, seed: s.seed, carry: { w: 1.1, h: .7 } }), FAR);
    }
    return [x0, x1];
  }
  // Chuva: intensidade por t (nublado até c7s04; cai em c7s04, forte em c7s04b, garoa que some em c7s05).
  const T4 = at('c7s04'), T6 = at('c7s05');
  const rainK = t => t < T6 ? clamp((t - T4 - .5) / 4) : .35 * (1 - seg(t, T6, T6 + 4));
  const skyK = t => Math.max(.8, rainK(t));
  function splash(x, y, k, s) {
    const g = animationEngine.context; g.save(); g.translate(x, y); g.scale(s, s); A().ripple(0, 0, k);
    for (const j of [-1, 1]) { const [px, py] = arcPt([0, 0], [j * 26, 4], 22, k), r = 3 * (1 - k) + .5; Kit.ellipse(px, py, r, r, P.water); }
    g.restore();
  }
  // Gotas de top até land(x, id) entre x0 e x1, ligadas por rainK no nascimento de cada gota (showers() de teste-movimento).
  function showers(t, x0, x1, top, rate, seed, r, land, s) {
    for (const d of rain(t, { x: x0, y: top, w: x1 - x0, h: 0 }, rate, seed)) {
      const ag = d.splash ? .6 + .35 * d.splash : .6 * d.k;
      if (hash(seed + d.id * 1.37) >= rainK(t - ag)) continue;
      const y1 = land(d.x, d.id);
      if (d.splash) splash(d.x, y1, d.splash, s); else A().drop(d.x, lerp(top, y1, d.k), r);
    }
  }

  // ---------- c7s01: close de perfil da cabeça na trilha; mandíbulas abrem e fecham; brilho no fio ----------
  // Mesmo enquadramento de c3s04b (HC, câmera que avança da cabeça aos dentes); as semanas passam nas nuvens.
  const t1 = at('c7s01'), HC = 1900, G1 = 1500, L1 = makePath([[-3000, G1], [5000, G1]]);
  const GL1 = [rd('c7s01', 1) + 1.5, rd('c7s01', 1) + 3.2];
  function c7s01(t, lt) {
    const jaw = .5 - .5 * Math.cos(TAU * (t - t1) / 3.2);
    const p = nod(her({ path: L1, s: sAt(900, HC), size: HC, ground: () => G1, t, moving: 0, antennae: 'explore' }), 0, 0, .07 * noise1(44, t * .45));
    const k = ease(seg(t, t1 + 1.2, end('c7s01') - .8)), z = lerp(.88, 1.3, k), cx = p.head.x + lerp(-60, 130, k), cy = p.head.y + lerp(90, 110, k), hy = 900;
    A().sky(.3);
    // Nuvens correndo (o tempo passa), capim gigante enevoado e irmãs com folhas numa trilha de trás.
    layer(cx, cy, z, .1, t, (a, b, lx) => { for (let i = 0; i < 4; i++) A().cloud(lx + (frac(hash(i + 50) + .05 * lt * (1 + .2 * i)) - .5) * (W / z + 900), hy - 380 + 90 * hash(i + 51), 1.1, i); });
    layer(cx, cy, z, .35, t, (a, b) => {
      for (let i = Math.floor(a / 70); i * 70 < b; i++) { const x = i * 70 + 40 * hash(i + 200); A().blade(x, hy + 220, 220 + 280 * hash(i + 201), .12 * wind(t, x, 7), mixCol(P.grass, P.stone, .5)); }
      A().ground(x => hy + 210 + 12 * Math.sin(x * .004), a, b, mixCol(P.grassDk, P.stone, .45));
    });
    layer(cx, cy, z, .7, t, (a, b) => {
      const gb = x => hy + 300 + 8 * Math.sin(x * .004), SIS = makePath([[b + 600, 0], [a - 600, 0]]);
      for (const s of crowd(SIS, t, 8, 8, { speed: 140, spacing: 420, carryEvery: 1, sizeVar: .1 })) { const sz = 150 * s.size; A().creature(creaturePose(SPECS.ant, { path: SIS, s: s.s / sz, size: sz, ground: gb, t, seed: s.seed, carry: { w: 1.1, h: .7 } }), FAR); }
      for (let i = Math.floor(a / 150); i * 150 < b; i++) { const x = i * 150 + 80 * hash(i + 3); A().blade(x, gb(x) + 30, 260 + 300 * hash(i), .14 * wind(t, x, 5), mixCol(P.grassDk, P.stone, .3)); }
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    const [x0, x1] = view(cx, z);
    A().ground(() => G1, x0, x1);
    A().creature(p, { ...LOOK, jaws: jaw });
    for (const g0 of GL1) glint(p, jaw, seg(t, g0, g0 + .7), 95);
    Kit.camEnd();
    A().grade(.3);
    Kit.vignette(.3);
  }

  // ---------- c7s02: o fio cega (close); ela morde a folha e quase não avança; pausa, suor; "2,5×" ----------
  const t2 = at('c7s02'), S2 = 520, BX2 = 760, DULL = rd('c7s02', 0) + 1.2, PAUSE = rd('c7s02', 1) + 3.5, RESUME = PAUSE + 2.1;
  const strain2 = t => t < PAUSE ? 1 : 1 - ease(seg(t, PAUSE, PAUSE + .4)) + ease(seg(t, RESUME - .3, RESUME));
  function pose2(t, wk, st) {
    return cutter(her({ path: LT, s: sAt(BX2, S2), size: S2, ground: gT, t, moving: 0, antennae: 'tap', sq: .04 * st * wk }), wk, st);
  }
  let J2 = null;
  const j2 = () => J2 || (J2 = edge(pose2(t2, .5, 1), .5, .85));
  function c7s02(t, lt) {
    const st = strain2(t), wk = .5 + .5 * Math.sin(TAU * .8 * (t - t2)), jaw = lerp(.85, .15 + .7 * wk, st), J = j2();
    const p = pose2(t, wk, st), lf = leafAt(J, S2, .35, 2.2, .7, .3), cut = .27 + .05 * seg(t, t2, PAUSE) + .02 * seg(t, RESUME, end('c7s02'));
    const zk = ease(seg(t, DULL + .9, DULL + 2.6)), pk = ease(seg(t, PAUSE, PAUSE + 1));
    const cam = [lerp(J[0] - 20, J[0] - .3 * S2, zk) + 20 * pk, lerp(J[1], J[1] - .15 * S2, zk) - 20 * pk, lerp(3, 1.6, zk) + .2 * pk];
    outdoors(t, cam, .8);
    const [x0, x1] = view(cam[0], cam[2]);
    drawLeaf(lf, cut);
    A().ground(gT, x0, x1);
    A().creature(p, { ...LOOK, jaws: jaw });
    wear(p, jaw, ease(seg(t, DULL - .5, DULL + .3)));
    glint(p, jaw, seg(t, DULL - .1, DULL + .6), 60, true);
    // Mordida: lascas verdes saltam devagar a cada fechada (pouco avanço).
    if (st > .5 && wk > .85) Kit.ellipse(J[0] + 6, J[1] - 4, 5, 3, P.leafDk);
    // Suor: a gota aparece na pausa e escorre pela cabeça.
    const sk = seg(t, PAUSE + .3, PAUSE + .5) * (1 - seg(t, RESUME, RESUME + .3));
    if (sk > 0) { const r = .028 * S2 * sk; A().drop(p.head.x - .04 * S2, p.head.y - .16 * S2 + .1 * S2 * ease(seg(t, PAUSE + .5, PAUSE + 1.8)), r); }
    grass(t, x0, x1, x => gT(x) + 60, 34, 40, 90, 1);
    Kit.camEnd();
    A().grade(.3);
    const [tx, ty] = toScreen(J[0] + .1 * S2, J[1] - .62 * S2, cam);
    Kit.text('2,5×', tx, ty, 110, P.ink, { k: seg(t, PAUSE + .1, PAUSE + .5) });
  }

  // ---------- c7s02b: fileira de cortadoras; metade corta devagar; "-44%" ----------
  const t3 = at('c7s02b'), S3 = 250, ROW = [0, 1, 2, 3, 4, 5].map(i => 330 + 250 * i), HERO3 = 3, TXT3 = rd('c7s02b', 0) + 6.6;
  const slow3 = i => i & 1;
  function pose3(i, t, wk) {
    const o = { path: LT, s: sAt(ROW[i], S3), size: S3, ground: gT, t, moving: 0, antennae: 'tap', sq: .04 * wk };
    return cutter(i === HERO3 ? her(o) : creaturePose(SPECS.ant, { ...o, seed: 80 + i }), wk);
  }
  const J3 = [];
  const j3 = i => J3[i] || (J3[i] = edge(pose3(i, t3, .5), .5, .85));
  function c7s02b(t, lt) {
    const cam = kf(t, [[t3, [ROW[1] + 60, 690, 2]], [t3 + 4.5, [1000, 640, 1.3]], [end('c7s02b'), [ROW[3] - 60, 665, 1.55]]]);
    outdoors(t, cam, .8);
    const [x0, x1] = view(cam[0], cam[2]), K = seg(t, t3, end('c7s02b')), ps = [];
    ROW.forEach((x, i) => {
      const sl = slow3(i), wk = .5 + .5 * Math.sin(TAU * (sl ? .5 : 1.6) * (t - t3) + 1.3 * i);
      ps.push([pose3(i, t, wk), sl ? lerp(.3, .7, wk) : .15 + .7 * wk]);
      drawLeaf(leafAt(j3(i), S3, .3 + .08 * hash(i + 4), 2.1, .7, .4), sl ? .3 + .05 * K : .3 + .35 * K);
    });
    A().ground(gT, x0, x1);
    ps.forEach(([p, jaw], i) => {
      A().creature(p, i === HERO3 ? { ...LOOK, jaws: jaw } : { jaws: jaw });
      if (slow3(i)) wear(p, jaw, 1, i === HERO3 ? LOOK.dark : P.sauvaDk);
      else glint(p, jaw, frac((t - t3) / 2.4 + .37 * i) / .3, 40);  // mandíbulas novas: brilham de tempos em tempos
    });
    grass(t, x0, x1, x => gT(x) + 60, 30, 34, 80, 1);
    Kit.camEnd();
    A().grade(.3);
    const [tx, ty] = toScreen(ROW[2] + 140, 420, cam);
    Kit.text('-44%', tx, ty, 150, P.ink, { k: seg(t, TXT3, TXT3 + .4) });
  }

  // ---------- c7s03: a irmã jovem corta e solta o pedaço; ela pega e carrega ----------
  const t4 = at('c7s03'), S4 = 290, SX4 = 760, HS4 = 320, DROP = t4 + 2.9, PICK = rd('c7s03', 0) + 4.5, LIFT = PICK + .45;
  const sister4 = (t, wk) => cutter(creaturePose(SPECS.ant, { path: LT, s: sAt(SX4, S4), size: S4, ground: gT, t, seed: 91, moving: 0, antennae: 'tap', sq: .04 * wk }), wk);
  let J4 = null, PX4 = null;
  const j4 = () => J4 || (J4 = edge(sister4(t4, .5), .5, .85));
  const piece4 = t => flutter(t, DROP, j4(), gT(j4()[0]) + 4, 92);
  const px4 = () => PX4 ?? (PX4 = piece4(DROP + 8).x);
  // Ela vem da direita (para o ninho), para com a cabeça sobre o pedaço, pega e segue para a esquerda, devagar.
  const keys4 = () => [[t4 + .2, sAtL(px4() + 1150, HS4)], [PICK - .5, sAtL(px4() + .5 * HS4, HS4)], [LIFT + .4, sAtL(px4() + .5 * HS4, HS4)], [end('c7s03') + 3, sAtL(px4() - 700, HS4)]];
  function hero4(t) {
    const m = travel(t, keys4(), { start: .4, stop: .6, seed: 47 }), dn = ease(seg(t, PICK - .5, PICK)) * (1 - ease(seg(t, LIFT, LIFT + .4)));
    return nod(her({ path: LT_L, s: m.s, size: HS4, ground: x => gT(x) + 26, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'explore', carry: t >= LIFT ? { w: .85, h: .5 } : null }), .03 * dn, .06 * dn, .45 * dn);
  }
  function c7s03(t, lt) {
    const hp = hero4(t), cam = [lerp(1000, 820, ease(seg(t, LIFT, end('c7s03') + 1))), 660, 1.5];
    outdoors(t, cam, .8);
    const [x0, x1] = view(cam[0], cam[2]), J = j4();
    const wk = .5 + .5 * Math.sin(TAU * 1.6 * (t - t4)), sp = sister4(t, wk);
    drawLeaf(leafAt(J, S4, .3, 2.2, .7, .4), .2 + .4 * ease(seg(t, t4 + .2, DROP)));
    A().ground(gT, x0, x1);
    A().creature(sp, { jaws: .15 + .7 * wk });
    glint(sp, .15 + .7 * wk, frac((t - t4) / 2.2) / .3, 45);
    // O pedaço: cai rodando até o chão; ao ser pego, sobe até a mandíbula dela (depois é a carga dela).
    if (t >= DROP && t < LIFT) {
      const f = piece4(t), lk = ease(seg(t, PICK, LIFT)), tgt = [hp.head.x - .2 * HS4, hp.head.y - .1 * HS4];
      A().leafPiece(lerp(f.x, tgt[0], lk), lerp(f.y - (f.landed ? 8 : 0), tgt[1], lk), .85 * HS4 * lerp(.85, 1, lk), .5 * HS4, f.landed ? lerp(.08, 0, lk) : f.angle, P.leaf);
    }
    A().creature(hp, LOOK);
    grass(t, x0, x1, x => gT(x) + 70, 34, 40, 90, 1);
    Kit.camEnd();
    A().grade(.3);
  }

  // ---------- c7s04: começa a chover na trilha; ela anda mais devagar que as outras ----------
  const S5 = 380, HIT = rd('c7s04', 1) + 2;
  const keys5 = [[T4, sAtL(1500, S5)], [HIT, sAtL(1500, S5) + .32 * (HIT - T4)], [HIT + .9, sAtL(1500, S5) + .32 * (HIT - T4) + .1], [end('c7s04') + 1, sAtL(1500, S5) + .32 * (end('c7s04') + 1 - T4)]];
  const MID5 = makePath([[5000, 805], [-3000, 805]]);
  function c7s04(t, lt) {
    const m = travel(t, keys5, { start: .2, stop: .3, seed: 48 }), fl = anticipate(t, HIT + .05, .05, .3, SPRING.bouncy) * (1 - ease(seg(t, HIT + .6, HIT + 1.3)));
    const hp = her({ path: LT_L, s: m.s, size: S5, ground: x => gT(x) + 26, t, moving: m.moving, lean: m.lean, drag: m.drag, flinch: .5 * fl, antennae: 'explore', carry: { w: .9, h: .5 } });
    const rk = rainK(t), hx = hp.spine[0].x, cam = [hx - 100, 640, 1.3];
    outdoors(t, cam, skyK(t), { back: false });
    const [x0, x1] = view(cam[0], cam[2]);
    // As irmãs da trilha passam por ela (mais depressa), na faixa de trás.
    for (const s of crowd(MID5, t, 12, 72, { speed: 260, spacing: 520, carryEvery: 1, sizeVar: .08 })) {
      const sz = 250 * s.size, x = MID5.at(s.s).x;
      if (x > x0 - 300 && x < x1 + 300) A().creature(creaturePose(SPECS.ant, { path: MID5, s: s.s / sz, size: sz, ground: x => gT(x) - 6, t, seed: s.seed, carry: { w: 1.1, h: .7 } }));
    }
    A().creature(hp, LOOK);
    // Uma gota grande cai na folha dela: ela se encolhe e quase para.
    if (t > HIT - .5 && t < HIT + .45) {
      const top = hp.carry.y - .2 * S5, k = seg(t, HIT - .5, HIT);
      if (k < 1) A().drop(hp.carry.x, lerp(top - 700, top, easeIn(k)), 16); else splash(hp.carry.x, top, seg(t, HIT, HIT + .45), 1.6);
    }
    grass(t, x0, x1, x => gT(x) + 70, 34, 40, 90, 1, rk);
    showers(t, x0, x1, cam[1] - H / 2 / cam[2] - 60, 90, 11, 8, (x, id) => gT(x) + 10 + 140 * hash(id + 9), 1);
    Kit.camEnd();
    A().grade(Math.max(.25, .8 * rk));
  }

  // ---------- c7s04b: corte: em cima, as velhas na chuva; embaixo, o ninho seco com jardineiras jovens ----------
  const t6 = at('c7s04b'), CH6 = [960, 1420, 1300, 440], LOOP6 = (() => { const [cx, cy] = CH6; return makePath(Array.from({ length: 33 }, (_, k) => { const a = Math.PI / 2 - k * TAU / 32; return [cx + 430 * Math.cos(a), cy - 6 + 22 * Math.sin(a)]; })); })();
  const TUN6 = makePath([[1560, 830], [1520, 980], [1400, 1130], [1300, 1250]]);
  function c7s04b(t, lt) {
    const cam = kf(t, [[t6, [1180, 680, 1.7]], [t6 + 1.6, [1100, 690, 1.55]], [t6 + 4.6, [980, 1090, .72]], [end('c7s04b'), [980, 1060, .86]]]);
    outdoors(t, cam, 1, { back: false });
    const [x0, x1] = view(cam[0], cam[2]);
    // Em cima: as velhas voltam com folhas na chuva (ela entre elas).
    for (const s of crowd(BACKT, t, 18, 73, { speed: 110, spacing: 430, carryEvery: 1, sizeVar: .08 })) {
      const sz = 170 * s.size, x = BACKT.at(s.s).x;
      if (x > x0 - 200 && x < x1 + 200) A().creature(creaturePose(SPECS.ant, { path: BACKT, s: s.s / sz, size: sz, ground: x => gT(x) - 4, t, seed: s.seed, carry: { w: 1.1, h: .7 } }));
    }
    const m = sAtL(1300, 190) + .35 * (t - t6);
    A().creature(her({ path: LT_L, s: m, size: 190, ground: x => gT(x) + 10, t, moving: 1, antennae: 'explore', carry: { w: .9, h: .5 } }), LOOK);
    grass(t, x0, x1, x => gT(x) + 26, 30, 30, 80, 1, 1);
    showers(t, x0, x1, cam[1] - H / 2 / cam[2] - 60, 110, 12, 8, (x, id) => gT(x) + 4 + 18 * hash(id + 9), 1);
    Kit.camEnd();
    A().grade(.8);
    // Embaixo (depois do clima, para ficar quente e seco): solo, túnel, câmara, fungo e as jovens.
    Kit.cam(cam[0], cam[1], cam[2], 0, hand(t));
    A().soil(x0, 846, x1 - x0, 1500, 31);
    A().tunnel(TUN6, 60);
    A().chamber(...CH6, 6);
    A().fungus(CH6[0], CH6[1] - 4, 700, 260, t, 6);
    for (let j = 0; j < 4; j++) { const d = frac(.03 * t + j / 4) * LOOP6.length, sz = 80; A().creature(creaturePose(SPECS.minima, { path: LOOP6, s: d / sz, size: sz, ground: () => CH6[1] - 6, t, seed: 110 + j })); }
    for (let j = 0; j < 2; j++) { const x = 820 + 260 * j, sz = 70; A().creature(nod(creaturePose(SPECS.minima, { path: LT, s: sAt(x, sz), size: sz, ground: () => CH6[1] - 150 - 20 * j, t, seed: 120 + j, moving: 0, antennae: 'tap' }), .02, .03, .35 + .15 * Math.sin(TAU * .7 * t + j)), { jaws: .5 + .5 * Math.sin(TAU * 1.2 * t + j) }); }
    Kit.camEnd();
  }

  // ---------- c7s05: entrada do ninho; ela parada na boca do túnel e as outras passando ----------
  const S7 = 300, MX7 = 1000, OUT7 = makePath([[560, 1700], [700, 1330], [860, 1030], [960, 872], [1060, 824], [4200, 824]]);
  const IN7 = makePath([[4200, 812], [1080, 812], [980, 860], [880, 1010], [720, 1310], [580, 1700]]);
  function c7s05(t, lt) {
    const k = ease(seg(t, T6, end('c7s05'))), cam = [lerp(1250, 1330, k), lerp(760, 720, k), lerp(1.2, 1.45, k)];
    outdoors(t, cam, skyK(t), { back: false });
    const [x0, x1] = view(cam[0], cam[2]);
    A().soil(x0, 846, x1 - x0, 1200, 41);
    A().tunnel(OUT7, 70);
    for (const s of crowd(IN7, t, 6, 74, { speed: 80, spacing: IN7.length / 6, carryEvery: 1, sizeVar: .08 })) { const sz = 170 * s.size; A().creature(creaturePose(SPECS.ant, { path: IN7, s: s.s / sz, size: sz, t, seed: s.seed, carry: { w: 1.1, h: .7 } })); }
    for (const s of crowd(OUT7, t, 6, 75, { speed: 95, spacing: OUT7.length / 6, carryEvery: 99, sizeVar: .08 })) { const sz = 170 * s.size; A().creature(creaturePose(SPECS.ant, { path: OUT7, s: s.s / sz, size: sz, t, seed: s.seed })); }
    // Ela: parada, olhando para fora; levanta a cabeça para a trilha (como quem vai sair) e desiste.
    const look = anticipate(t, T6 + 2.4, .2, .4) * (1 - ease(seg(t, T6 + 3.6, T6 + 4.4)));
    const hp = nod(her({ path: LT, s: sAt(1330, S7), size: S7, ground: () => 836, t, moving: 0, antennae: 'explore', sq: .03 * Math.sin(TAU * .4 * t) }), 0, -.01 * look, .2 - .3 * look);
    A().creature(hp, LOOK);
    grass(t, x0, x1, x => gT(x) + 40, 34, 40, 90, 1, rainK(t));
    showers(t, x0, x1, cam[1] - H / 2 / cam[2] - 60, 60, 13, 7, (x, id) => Math.min(gT(x) + 10 + 30 * hash(id + 9), 850), 1);
    Kit.camEnd();
    A().grade(Math.max(.25, .8 * rainK(t)));
  }

  shotsById({ c7s01, c7s02, c7s02b, c7s03, c7s04, c7s04b, c7s05 });
})();
