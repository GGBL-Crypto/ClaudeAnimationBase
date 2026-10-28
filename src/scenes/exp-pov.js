// exp-pov.js (exp/estilos): "POV: você é uma saúva operária", 73 s narrados. Coreografia sem desenho, função pura de t;
// o estilo (paper) desenha F = EST.frame('POV', t). Câmera na altura da formiga, em perspectiva: o mundo tem y para
// baixo (chão em y = 0) e profundidade wz (distância à frente, no sentido da marcha). Cada plano tem a sua origem; a câmera
// está em wz = cz e a tela é X = (x − cx)·k + 960, Y = (y − cy)·k + 540, k = FOCAL / (wz − cz). Para o verificador, um ator
// em wz tem depth = W0 − wz e cam.z = FOCAL / (W0 − cz): a câmera de frente dele dá a mesma projeção.
// Sobreposições em px de tela (pov): as suas antenas, as mandíbulas, a folha carregada, a carona e o rosto da irmã.
var EST = (() => {
  const FOCAL = 540 / Math.tan(20 * Math.PI / 180), W0 = 6000, S = 40, EH = 16, V = .8 * S;  // BL da protagonista; olho a 16 px; .8 BL/s
  const FLY = { ...SPECS.fly, flyer: { ...SPECS.fly.flyer, freq: 4 } }, LEAF = { w: 1.1, h: .7 }, FS = 22;  // asas lentas: a 30 fps o normal vira zumbido
  // Planos (tempos do timing.json de episodes/exp-pov) e momentos das falas.
  const T = { p2: 8.9, p3: 20.566667, p4: 26.833333, p5: 34.633333, p6: 39.4, p7: 59.266667, end: 73.333333 };
  const FACE = [22.45, 24.75], STOP3 = [21.2, 3.3], LIFT = [33.4, 34.6], SPOT = 39.65, FLY_IN = 40.3, RECOIL = 40.55, DIVE = 44.6, RIDE = 48.9, GO = 56.73, BACK = 57.2;
  const R = .6;  // rampa das paradas (s)
  // Distância andada desde t0 a V, menos as paradas [ta, dur] (pauseLost de crowd.js); m = fator de velocidade 0..1.
  const walk = (t, t0, stops = [], v = V) => v * (Math.max(0, t - t0) - stops.reduce((s, [ta, dur]) => s + pauseLost(t, ta, dur, R), 0));
  const vel = f => t => (f(t + 1 / 60) - f(t - 1 / 60)) * 30, speedOf = f => t => vel(f)(t) / V;  // px/s; em V

  // ---------- cenário fixo (por semente) ----------
  // Capim gigante dos dois lados da trilha: lâminas [wz, x, altura, largura, inclinação, semente].
  const blades = (n, w0, w1, seed) => Array.from({ length: n }, (_, i) => {
    const h = j => hash(seed + i * 3.17 + j * .91), side = i % 2 ? 1 : -1;
    return { wz: lerp(w0, w1, (i + h(1)) / n), x: side * (48 + 220 * h(2) ** 1.4), h: 500 + 1400 * h(3), w: 14 + 22 * h(4), lean: side * (.05 + .25 * h(5)) + (h(6) - .5) * .1, seed: seed + i };
  });
  // Anéis do túnel (terra rasgada com a boca elíptica): wz, centro x, meia largura e meia altura da boca.
  const rings = (w0, w1, st, seed) => Array.from({ length: Math.floor((w1 - w0) / st) + 1 }, (_, i) => ({ wz: w0 + i * st, x: 9 * noise1(seed, i * .6), rx: 44 + 6 * hash(seed + i), ry: 32 + 4 * hash(seed + i * 1.3), seed: seed + i }));
  const TUN1 = rings(30, 330, 42, 11), EXIT1 = 345, TUN7 = rings(25, 250, 42, 71), CH7 = 270;
  const OUT2 = blades(64, -10, 1400, 21), OUT5 = blades(90, -10, 2000, 51), OUT3 = blades(30, 60, 900, 31);
  // Jardim de fungo da câmara final: massas claras [wz, x, raio, altura, semente]; o teto e as paredes são do estilo.
  const FUNGUS = Array.from({ length: 16 }, (_, i) => ({ wz: 330 + 34 * i + 18 * hash(i + 3), x: (i % 2 ? 1 : -1) * (50 + 170 * hash(i + 7)) * (i < 4 ? 1.4 : 1), r: 36 + 34 * hash(i + 9), h: 46 + 60 * hash(i + 11), seed: 900 + i }));
  FUNGUS.push({ wz: 700, x: -20, r: 150, h: 120, seed: 990 });  // o monte grande ao fundo, no meio

  // ---------- multidões (crowd.js) ----------
  // Faixa lateral: anda em x (dir = +1 da esquerda para a direita) no chão y = ground, na profundidade wz. Começa e acaba
  // fora do quadro mesmo com a câmera no ponto mais distante (D) do plano. meet: 0 (faixas em profundidades diferentes).
  const lane = (id, wz, D, dir, speed, spacing, o = {}) => {
    const X = .65 * D + 2.2 * (o.S || S), y = o.y || 0;
    return { id, wz, path: makePath(dir > 0 ? [[-X, y], [X, y]] : [[X, y], [-X, y]]), S: o.S || S, speed, gap: 1, rate: speed / spacing, t0: o.t0 ?? 0, t1: o.t1 ?? 80, seed: o.seed ?? wz, carry: o.carry ?? 0, role: o.role, ground: () => y };
  };
  const crowd = lanes => makeCrowd(lanes, { meet: 0 });
  const C2 = [crowd([lane('t2a', 290, 290, 1, 1.4, 2.6, { carry: .5, t0: 8.9, t1: 21 })]), crowd([lane('t2b', 520, 520, -1, 1.2, 3, { carry: .6, t0: 8.9, t1: 21 })]), crowd([lane('t2c', 760, 760, 1, 1.5, 2.4, { carry: .4, t0: 8.9, t1: 21 })])];
  const C5 = [crowd([lane('t5a', 320, 320, -1, 1.3, 2.8, { carry: .7, t0: 34.6, t1: 60 })]), crowd([lane('t5b', 480, 480, 1, 1.2, 3.2, { carry: .6, t0: 34.6, t1: 60 })])];
  const C7 = [crowd([lane('g7a', 430, 430, 1, .5, 3, { S: 30, role: 'garden', t0: 59, t1: 74 })]), crowd([lane('g7b', 560, 560, -1, .45, 3.4, { S: 30, role: 'garden', t0: 59, t1: 74 })])];
  function people(list, t) {
    return list.flatMap(cr => cr.at(t).map(a => {
      const ln = cr.lanes[a.lane];
      const pose = creaturePose(SPECS.ant, { path: ln.path, s: a.s / ln.S, size: ln.S, ground: ln.ground, t, seed: a.seed, moving: a.moving, carry: a.carry ? LEAF : null });
      return { id: a.id, kind: 'ant', role: ln.role, layer: 1, depth: W0 - ln.wz, wz: ln.wz, pose, track: ln.path.at(a.s), ground: ln.ground };
    }));
  }
  // Ator solo num caminho reto em x, com progresso s (px) dado.
  const solo = (id, path, s, wz, t, o = {}) => {
    const g = o.ground || (() => 0), pose = creaturePose(SPECS.ant, { path, s: s / S, size: S, ground: g, t, seed: o.seed ?? 3, moving: o.moving ?? 1, carry: o.carry ? LEAF : null, antennae: o.antennae });
    return { id, kind: 'ant', role: o.role, layer: 1, depth: W0 - wz, wz, pose, track: path.at(s), ground: g };
  };

  // ---------- a protagonista (câmera e sobreposições) ----------
  // Balanço da marcha de 6 patas: a fase da trípode (gaitPhase, passo do SPECS.ant) dá o rolamento (1 por ciclo, as duas
  // trípodes alternam o lado) e o sobe e desce (2 por ciclo); a amplitude segue a velocidade. Respiração lenta por cima.
  function camera(t, cz, m, o = {}) {
    const gp = gaitPhase(cz / S, SPECS.ant.stride, ORGANIC.vary, 501);
    const roll = .004 * m * Math.cos(TAU * gp) + .002 * noise1(7, t * .3), bob = .5 * m * (1 + Math.cos(2 * TAU * gp)) / 2, breath = Math.sin(TAU * t / 3.6);
    return { cx: (o.cx || 0) + 1.2 * noise1(5, t * .2), cy: -EH - bob - .25 * breath + (o.dy || 0), z: FOCAL / (W0 - cz), roll, breath, cz };
  }
  // Antenas (px de tela): a base fica no alto, perto do meio e fora do quadro; o escapo sobe para fora até o cotovelo,
  // perto do canto, e o funículo desce em curva para a frente até a ponta (aim ± 420 px, 170 px acima). Varrem por ruído e batem (tap 0..1).
  function antenna(side, t, aim, o = {}) {
    const sw = o.sweep ?? 1, tap = o.tap || 0, bx = 960 + side * 230, by = -150;
    const ex = 960 + side * (700 + 40 * sw * noise1(21 + side, t * .5)), ey = 30 + 30 * sw * noise1(25 + side, t * .4);
    const ax = aim[0] + side * (o.spread ?? 420) + sw * 70 * noise1(31 + side, t * .7), ay = aim[1] - 170 + sw * 50 * noise1(41 + side, t * .6) - tap * 60 * Math.max(0, Math.sin(TAU * (o.tapHz || 2.2) * t + (side > 0 ? 1.2 : 0)));
    return [[bx, by], [ex, ey], [lerp(ex, ax, .45) + side * 90, lerp(ey, ay, .55) - 60], [ax, ay]];
  }
  const antennae = (t, aim, o) => ({ L: antenna(-1, t, aim, o), R: antenna(1, t, aim, o) });

  // ---------- planos ----------
  function frameP1(t) {  // túnel escuro; a saída se abre no fundo
    const cz = walk(t, 0), m = speedOf(u => walk(u, 0))(t);
    return { shot: 'p1', cam: camera(t, cz, m), world: { kind: 'tunnel', rings: TUN1, exit: EXIT1, light: ease(seg(t, 2, 8.9)) }, actors: [],
      pov: { ant: antennae(t, [960, 560], { sweep: 1.3 }), fadeIn: seg(t, 0, 1.4) } };
  }
  function frameP2(t) {  // a luz e o capim; irmãs cruzam a trilha
    const w2 = u => walk(u, T.p2, [], .5 * S), cz = w2(t), m = speedOf(w2)(t);  // devagar: as irmãs ficam grandes
    return { shot: 'p2', cam: camera(t, cz, m), world: { kind: 'out', blades: OUT2, flash: 1 - seg(t, T.p2, T.p2 + .9) }, actors: people(C2, t),
      pov: { ant: antennae(t, [960, 600]) } };
  }
  // P3: uma irmã vem pela direita, para na frente e vira o rosto; close de frente (antenas com antenas); ela segue.
  const W3 = 160, P3 = makePath([[300, 0], [-400, 0]]), s3 = t => walk(t, 17.3, [[21.9, 2.9]], 1.5 * S);  // ≤ 1,5 BL/s: mais rápido, a trípode passa de .2 ciclo por quadro
  function frameP3(t) {
    const cz = walk(t, T.p3, [STOP3]), m = speedOf(u => walk(u, T.p3, [STOP3]))(t);
    if (t >= FACE[0] && t < FACE[1]) {
      const k = ease(seg(t, FACE[0], FACE[0] + .35)) * (1 - ease(seg(t, FACE[1] - .3, FACE[1]))), tap = seg(t, 22.85, 23.1) * (1 - seg(t, 24.3, 24.6));
      return { shot: 'p3face', cam: camera(t, cz, 0), world: { kind: 'out', blades: OUT3, blur: 1 }, actors: [],
        pov: { ant: antennae(t, [960, 470], { sweep: .3, tap, tapHz: 2.6, spread: 190 }), face: { k, tap, t } } };
    }
    const sis = solo('irma', P3, s3(t), W3, t, { seed: 5, moving: clamp(vel(s3)(t) / (1.5 * S)), antennae: t > 21.6 ? 'tap' : undefined });
    return { shot: t < FACE[0] ? 'p3' : 'p3b', cam: camera(t, cz, m), world: { kind: 'out', blades: OUT3 }, actors: [sis],
      pov: { ant: antennae(t, t < FACE[0] ? [960, 560] : [960, 600], { sweep: .8 }) } };
  }
  // P4: em pé na borda de uma folha. A folha é um plano de frente (wz = LW) com a borda de cima em y = LY, contra o sol:
  // as mandíbulas cortam um arco (u 0..1) e o pedaço se solta e sobe. Duas irmãs chegam pela borda, chamadas pelo chiado.
  const LW = 96, LY = -4, CUT = { x: 0, r: 24 }, P4L = makePath([[-140, LY], [140, LY]]), P4R = makePath([[140, LY], [-140, LY]]);
  const sL = t => walk(t, 29.9, [[31.6, 30]], 1.1 * S), sR = t => walk(t, 30.6, [[32.3, 30]], 1 * S);
  function frameP4(t) {
    const cz = walk(t, T.p4, [[T.p4 + .3, 30]], .6 * S), u = ease(seg(t, 27.6, 33.3)), cut = Math.min(1, u * 1.02);
    const bite = .5 + .5 * Math.sin(TAU * 2.2 * t), vib = seg(t, 27.4, 27.8) * (1 - seg(t, 33.2, 33.5));
    const [a0, a1] = [Math.PI * .98, Math.PI * .02], ang = lerp(a0, a1, cut), tip = [CUT.x + CUT.r * Math.cos(ang), LY + CUT.r * Math.sin(ang) * .9];
    const g = () => LY, actors = [];
    if (t > 29.9) actors.push(solo('rec1', P4L, sL(t), LW - 3, t, { seed: 8, moving: clamp(vel(sL)(t) / (1.1 * S)), ground: g }));
    if (t > 30.6) actors.push(solo('rec2', P4R, sR(t), LW - 6, t, { seed: 9, moving: clamp(vel(sR)(t) / S), ground: g }));
    const lift = ease(seg(t, LIFT[0], LIFT[1]));
    return { shot: 'p4', cam: camera(t, cz, 0, { dy: 8 - 2 * lift }), world: { kind: 'leaf', blades: OUT3, leaf: { wz: LW, y: LY, cut: { ...CUT, y: LY, u: cut, lift }, tip } }, actors,
      pov: { ant: antennae(t, [960 + 120 * Math.cos(ang), 720], { sweep: .5 }), mand: { show: ease(seg(t, 27, 27.5)), open: vib ? .25 + .55 * bite : .5, vib, aim: tip, lift } } };
  }
  // P5–P6: de volta pela trilha com a folha acima da cabeça (sombra no chão à frente). Na mosca: recuo curto e parada; a
  // carona (uma irmã mínima) aparece em cima da folha; a mosca vai embora e a marcha volta.
  const STOP6 = [RECOIL, BACK - RECOIL];
  const cz56 = t => walk(t, T.p5, [STOP6]) - 12 * ease(seg(t, RECOIL, RECOIL + .3)) * (1 - ease(seg(t, BACK, BACK + 1)));
  const WF = 350;  // profundidade da mosca e da irmã atacada (D ≈ 170 na parada)
  const P6S = makePath([[-150, 0], [1200, 0]]), s6 = t => walk(t, 41.4, [], 1 * S);
  // Mosca: perto da câmera (WN, grande no quadro) e, no ataque, no plano da irmã (WF). O alvo é dado em px de tela e
  // convertido para o mundo na profundidade atual dela; pairar por ruído. Devolve [x, y, wz].
  const WN = 255;
  function flyAt(t, cz, sis) {
    const cam = camera(t, cz, 0), scr = (p, wz) => { const k = FOCAL / (wz - cz); return [960 + (p[0] - cam.cx) * k, 540 + (p[1] - cam.cy) * k]; };
    const hk = ease(seg(t, 41.3, 42.3)), keys = [[FLY_IN, [1950, -250]], [41.3, [1250, 400]], [DIVE, [1150, 430]]];
    let p = kf(t, keys); p = [p[0] + 70 * hk * noise1(81, t * .8), p[1] + 45 * hk * noise1(82, t * .9)];
    const on = sis ? ease(seg(t, DIVE, DIVE + .4)) * (1 - ease(seg(t, 45.9, 46.6))) : 0, wz = lerp(WN, WF, on);
    if (on > 0) { const hd = scr([sis.pose.head.x + .05 * S + 2 * noise1(83, t * 6), sis.pose.head.y - .5 * S + 2 * noise1(84, t * 7)], WF); p = [lerp(p[0], hd[0], on), lerp(p[1], hd[1], on)]; }
    const up = ease(seg(t, 45.9, 47)), ride = ease(seg(t, RIDE - .4, RIDE + .8)), go = Math.max(0, (t - GO) / 1.6) ** 2;  // go sem teto: segue acelerando fora do quadro
    p = [lerp(p[0], 1120 + 60 * noise1(85, t * .7), up), lerp(p[1], 420 + 40 * noise1(86, t * .8), up)];
    p = [lerp(p[0], 1060 + 90 * Math.sin(t * 1.7) + 30 * noise1(87, t), ride), lerp(p[1], 360 + 40 * Math.sin(t * 2.3) + 20 * noise1(88, t), ride)];  // tenta chegar à folha
    p = [lerp(p[0], 200, go), lerp(p[1], -600, go)];
    const k = FOCAL / (wz - cz); return [cam.cx + (p[0] - 960) / k, cam.cy + (p[1] - 540) / k, wz];
  }
  function frameP56(t) {
    const cz = cz56(t), m = clamp(speedOf(cz56)(t)), actors = people(C5, t), p6 = t >= T.p6;
    if (p6 && t > 41.4) actors.push(solo('alvo', P6S, s6(t), WF, t, { seed: 12, carry: true }));
    if (p6 && t > FLY_IN) {
      const p = flyAt(t, cz, actors.find(a => a.id === 'alvo'));
      const path = makePath([[p[0] + 10, p[1]], p]);  // de frente para a esquerda sempre; o caminho só dá a pose
      actors.push({ id: 'mosca', kind: 'fly', role: 'fly', layer: 1, depth: W0 - p[2], wz: p[2], pose: creaturePose(FLY, { path, s: path.length / FS, size: FS, t, seed: 4, gait: 'fly' }), track: path.at(path.length), air: true });
    }
    const see = p6 ? seg(t, SPOT, SPOT + .6) * (1 - seg(t, GO + .6, GO + 1.4)) : 0, ride = p6 ? ease(seg(t, RIDE - .3, RIDE + .9)) : 0;
    const fly = actors.find(a => a.id === 'mosca'), aim = fly ? [960 + (fly.pose.head.x - camera(t, cz, 0).cx) * FOCAL / (fly.wz - cz), 540 + (fly.pose.head.y + EH) * FOCAL / (fly.wz - cz)] : [960, 600];
    return { shot: p6 ? 'p6' : 'p5', cam: camera(t, cz, m, { dy: -3 * ride }), world: { kind: 'out', blades: OUT5, shade: 1 }, actors,
      pov: { ant: antennae(t, [lerp(960, aim[0], .5 * see), lerp(600, aim[1], .4 * see)], { sweep: 1 - .5 * see }), carry: { k: p6 ? 1 : ease(seg(t, T.p5, T.p5 + 1.2)), low: ride, sway: noise1(91, t * .5) },
        mand: { show: 1, open: .12, vib: 0, hold: 1 }, rider: ride > 0 ? rider(t, ride, fly) : null } };
  }
  // Carona: operária mínima de pé na borda da folha (px de tela, BL 170), virada para a mosca; empina quando ela chega perto.
  function rider(t, k, fly) {
    const y = lerp(150, 300, k) - 2, path = makePath([[760, y], [1160, y]]), alert = fly ? seg(t, RIDE, RIDE + .6) * (1 - seg(t, GO + .3, GO + 1)) : 0;
    let p = creaturePose(SPECS.ant, { path, s: 1.2, size: 170, ground: () => y, t, seed: 21, moving: 0, antennae: alert > .2 ? 'explore' : undefined, lean: .4 * alert });
    p = turnHead(p, -.25 * alert, -.2 * alert);
    return { pose: p, k };
  }
  // P7: o túnel de novo, que se abre na câmara do jardim de fungo; a câmera desacelera até parar e o quadro some no preto.
  const D7 = [64.2, 4.6], cz7 = t => walk(t, T.p7) - V * (t > D7[0] ? (Math.min(t, D7[0] + D7[1]) - D7[0]) ** 2 / (2 * D7[1]) + Math.max(0, t - D7[0] - D7[1]) : 0);
  function frame7(t) {
    const cz = cz7(t), m = speedOf(cz7)(t);
    return { shot: 'p7', cam: camera(t, cz, m), world: { kind: 'chamber', rings: TUN7, chamber: CH7, fungus: FUNGUS, light: ease(seg(t, 61.6, 64.8)), dark: ease(seg(t, T.p7, T.p7 + 1.2)) }, actors: people(C7, t),
      pov: { ant: antennae(t, [960, 600], { sweep: .8 * (1 - seg(t, 67, 70)) + .2 }), carry: { k: 1, low: 0, sway: noise1(91, t * .5) * m }, mand: { show: 1, open: .12, vib: 0, hold: 1 }, rider: rider(t, 1, null), fadeOut: seg(t, 71.9, T.end - 1 / 30) } };
  }

  // ---------- contrato (estilo e verificador) ----------
  // F = {scene, t, shot, cam: {cx, cy, z, roll, breath, cz}, W0, FOCAL, world, actors, pov, texts}
  // world.kind: tunnel (rings [{wz, x, rx, ry, seed}], exit = wz da boca de saída, light 0..1) | out (blades [{wz, x, h,
  //   w, lean, seed}], flash 0..1 = clarão ao sair, blur = fundo do close, shade =
  //   sombra da folha carregada no chão) | leaf (out + leaf {wz, y: borda de cima, cut {x, y, r, u, lift}, tip}) | chamber
  //   (rings, chamber = wz onde o túnel abre na câmara, fungus [{wz, x, r, h, seed}], light, dark).
  // actor.wz = profundidade (depth = W0 − wz), zoom = px por unidade nela; formigas de lado (creaturePose), mosca no ar.
  // pov (px de tela): ant {L, R} (4 pontos: base, cotovelo, meio, ponta); mand {show, open 0..1, vib, aim, lift, hold};
  //   carry {k (folha erguida), low (folha mais baixa no quadro: a carona aparece), sway}; rider {pose (px de tela), k};
  //   face {k, tap, t} (close de frente da irmã); fadeIn, fadeOut 0..1.
  function frame(scene, t) {
    const F = t < T.p2 ? frameP1(t) : t < T.p3 ? frameP2(t) : t < T.p4 ? frameP3(t) : t < T.p5 ? frameP4(t) : t < T.p7 ? frameP56(t) : frame7(t);
    Object.assign(F, { scene, t, W0, FOCAL, texts: [] });
    for (const a of F.actors) a.zoom = FOCAL / (a.wz - F.cam.cz);  // px por unidade do mundo na profundidade do ator
    F.actors.sort((a, b) => b.wz - a.wz);
    return F;
  }
  return { frame, FOCAL, times: T };
})();
if (typeof shotsById === 'function') shotsById(Object.fromEntries(PROJECT.storyboard.map(s => [s.id, t => ExpStyle.draw(EST.frame('POV', t))])));
