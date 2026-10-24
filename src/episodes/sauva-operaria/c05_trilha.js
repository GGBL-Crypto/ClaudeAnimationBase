// c05_trilha.js: capítulo 5 de sauva-operaria (A trilha), planos c5s01–c5s05.
// Ela sobe o túnel até a luz; na saída, um pássaro pousa e ela se encolhe; a trilha longa de 60 m em perspectiva;
// close de cima no corte que vibra e chama as irmãs; ergue o pedaço e volta; corta e pausa enquanto anoitece;
// a trilha de outra colônia à noite, em silhueta; ao entardecer ela entra na fila de carregadoras.
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
  const T0 = at('c5s01');
  // Primeira luz forte: céu saturado e verdes vivos.
  const DAY = () => Kit.gradient(mixCol(P.skyTop, P.cloth, .3), mixCol(P.skyLow, P.sky, .55));
  const DUSK = () => Kit.gradient(mixCol(P.skyTop, P.wingAccent, .35), mixCol(P.skyLow, P.sun, .5));
  const EARTH = mixCol(P.wood, P.ground, .2), TRAIL = mixCol(P.wood, P.ground, .45);
  // Camada de fundo com paralaxe só horizontal (f) (layer() de c01).
  function layer(cx, cy, zoom, f, t, draw) {
    const lx = lerp(960, cx, f);
    Kit.cam(lx, cy, zoom, 0, hand(t)); draw(lx - W / 2 / zoom - 200, lx + W / 2 / zoom + 200); Kit.camEnd();
  }
  const view = (cx, zoom) => [cx - W / 2 / zoom - 80, cx + W / 2 / zoom + 80];
  const toScreen = (x, y, [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
  // Capim entre x0 e x1 sobre gy; odd = 0/1 desenha só metade (atrás / à frente dos seres).
  function grass(t, x0, x1, gy, step, h0, h1, odd = null, push = [], skip = null, tone = null) {
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      if (odd !== null && (k & 1) !== odd) continue;
      const x = k * step + .5 * step * hash(k + 3), y = gy(x) + 3;
      if (skip && skip(x)) continue;
      A().blade(x, y, h0 + (h1 - h0) * hash(k + 7), bladeBend(t, x, y, push, 60, 3), tone || (k & 1 ? P.grass : P.grassDk));
    }
  }
  // Move a cabeça (e as antenas) depois de creaturePose; da > 0 baixa o olhar (nod() de c01).
  function nod(p, dx, dy, da) {
    const hx = p.head.x + p.facing * dx * p.size, hy = p.head.y + dy * p.size, a = p.facing * da, co = Math.cos(a), si = Math.sin(a);
    const move = ([x, y]) => { x += hx - p.head.x; y += hy - p.head.y; return [hx + (x - hx) * co - (y - hy) * si, hy + (x - hx) * si + (y - hy) * co]; };
    for (const ap of SPECS[p.spec].appendages) if (ap.attach === 'head') p.appendages[ap.name] = p.appendages[ap.name].map(move);
    p.head = { x: hx, y: hy, angle: p.head.angle + a };
    return p;
  }
  // Céu, nuvens, morros com árvores: o fundo dos planos de superfície. hill = linha dos morros perto (y).
  function backdrop(cx, cy, z, t, hill, tint = P.skyLow) {
    const u = t - T0;
    layer(cx, cy, z, .1, t, () => { A().cloud(300 + 6 * u, hill - 480, .8, 1); A().cloud(1400 + 4 * u, hill - 560, .6, 2); A().cloud(2200 + 5 * u, hill - 400, .7, 3); });
    layer(cx, cy, z, .3, t, (a, b) => A().ground(x => hill - 90 + 30 * Math.sin(x * .002 + 1) + 14 * Math.sin(x * .006), a, b, mixCol(P.foliage, tint, .4)));
    layer(cx, cy, z, .6, t, (a, b) => {
      const hl = x => hill + 18 * Math.sin(x * .0035 + 2);
      for (let k = Math.floor(a / 170); k * 170 < b; k++) if (hash(k + 70) < .55) { const x = k * 170 + 60 * hash(k + 71); A().tree(x, hl(x) + 10, 120 + 90 * hash(k + 72), .05 * wind(t, x), k + 30, .3); }
      A().ground(hl, a, b, mixCol(P.leafDk, tint, .2));
    });
  }
  // Pedaço de folha na mandíbula: up = 0 deitado à frente, 1 em pé e inclinado para a frente (leaf1() de c01).
  function held(p, S, w, up) {
    const flat = p.facing > 0 ? .1 : Math.PI - .1, high = p.facing > 0 ? -Math.PI / 2 + .35 : 1.5 * Math.PI - .35, a = lerp(flat, high, up);
    const bx = p.head.x + p.facing * .13 * S, by = p.head.y + .03 * S;
    return { x: bx + w / 2 * Math.cos(a), y: by + w / 2 * Math.sin(a), w, h: .45 * w, angle: a };
  }
  const drawLeaf = (l, color = P.leaf) => A().leafPiece(l.x, l.y, l.w, l.h, l.angle, color);
  // Tremor do corpo que vibra: muda a cada quadro, puro em t (30 fps).
  const buzz = (t, k, seed) => [k * (hash(Math.floor(t * 30) * 3 + seed) - .5), k * (hash(Math.floor(t * 30) * 3 + seed + 1) - .5)];
  // Onda redonda (vista de cima) que sai do corte e corre pela folha.
  function ring(x, y, r, k) {
    if (k <= 0 || k >= 1) return;
    const c = animationEngine.context; c.save(); c.globalAlpha = .8 * (1 - k); c.beginPath(); c.ellipse(x, y, 20 + r * k, 20 + r * k, 0, 0, TAU);
    c.strokeStyle = P.cloud; c.lineWidth = 10 * (1 - k) + 2; c.stroke(); c.restore();
  }
  function shifted(dx, dy, fn) { const c = animationEngine.context; c.save(); c.translate(dx, dy); fn(); c.restore(); }

  // ---------- c5s01: o túnel sobe até a luz; ela sai entre o capim ----------
  const t1 = at('c5s01'), gS1 = x => 432 + 8 * Math.sin(x * .004 + 1), HS1 = 420;
  const HP1 = makePath([[-500, 1640], [300, 1400], [800, 1150], [1250, 900], [1550, 660], [1690, 420], [1760, 318], [1880, 345], [2050, 436], [3200, 432]]);
  const TN1 = makePath([[-500, 1500], [300, 1260], [800, 1010], [1250, 760], [1550, 530], [1700, 330]]);
  const TN1b = makePath([[300, 1260], [80, 1000], [-200, 860]]);
  const EXIT1 = 1740, HK1 = [[t1, 700 / HS1], [t1 + 9.8, 2700 / HS1]], HO1 = { start: .6, stop: .3, seed: 51 };
  const SIS1 = [t1 + 1.6, t1 + 4.6, t1 + 7.2];
  const DN1 = makePath([[1760, 300], [1550, 640], [1250, 880], [800, 1130], [300, 1380], [-500, 1620]].map(([x, y]) => [x, y - 45]));
  function c5s01(t, lt) {
    const m = travel(t, HK1, HO1);
    const hp = her({ path: HP1, s: m.s, size: HS1, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'explore' });
    const out = ease(seg(lt, 7.4, 9.6)), z = lerp(1.3, .95, out), cx = hp.head.x - 120 + 160 * out, cy = lerp(hp.head.y + 30, 420, out), [x0, x1] = view(cx, z);
    DAY();
    backdrop(cx, cy, z, t, 360);
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(gS1, x0, x1);
    A().tree(900, gS1(900) + 8, 460, .04 * wind(t, 900), 4);
    grass(t, x0, x1, gS1, 22, 30, 64, 0, [], x => Math.abs(x - EXIT1) < 60);
    A().soil(x0, 446, x1 - x0, 1600, 13);
    A().tunnel(TN1b, 160); A().tunnel(TN1, 290);
    A().roots(900, 450, 380, 1, 6);
    // Monte de terra da entrada, por cima da boca do túnel.
    Kit.poly([[1440, 446], [1600, 330], [1700, 300], [1820, 302], [1930, 340], [2080, 446]], EARTH, { smooth: true, weight: 5 });
    Kit.ellipse(1760, 306, 60, 14, P.line);
    // Luz que entra pela boca do túnel e desce pela rampa.
    const lk = .25 + .15 * ease(seg(lt, 2, 8));
    Kit.poly([[EXIT1 - 90, 320], [EXIT1 + 30, 330], [1250, 900], [900, 1000]], P.sun, { stroke: false, alpha: lk });
    Kit.ellipse(EXIT1 - 30, 330, 120, 70, P.sun, { alpha: lk + .2 });
    // Grão de terra que cai do teto do túnel.
    for (let i = 0; i < 3; i++) { const per = 2.4 + hash(i + 60), u = frac(t / per + hash(i + 61)), x = lerp(500, 1500, hash(i * 7 + Math.floor(t / per + hash(i + 61)))); if (u < .3) Kit.ellipse(x, TN1.at(clamp((x + 500) / 2400) * TN1.length).y - 120 + 260 * u / .3, 6, 6, mixCol(P.wood, P.cream, .25)); }
    // Irmãs descendo pelo túnel (do lado de lá, um pouco menores) cruzam com ela.
    for (const [i, ts] of SIS1.entries()) {
      const d = 2600 - 300 * (t - ts), sz = 300;
      if (d > 0 && d < 2700) A().creature(creaturePose(SPECS.ant, { path: DN1, s: (d < 2600 ? 2600 - d : 0) / sz, size: sz, t, seed: 70 + i, carry: i === 1 ? { w: 1.1, h: .7 } : null }));
    }
    A().creature(hp, LOOK);
    grass(t, x0, x1, gS1, 22, 30, 64, 1, [[hp.head.x, hp.head.y]], x => Math.abs(x - EXIT1) < 40 && hp.head.x < EXIT1 + 300);
    Kit.camEnd();
    const [tx, ty] = toScreen(hp.head.x + 40, hp.head.y - 260, [cx, cy, z]), r1 = rd('c5s01', 1);
    Kit.text('4ª semana', tx, ty, 70, P.cream, { k: Math.min(seg(t, r1 + .2, r1 + .6), 1 - seg(t, r1 + 3.6, r1 + 4)) });
    Kit.flash(.35 * Math.max(0, 1 - Math.abs(lt - 9.6) / .5), P.sun);
  }

  // ---------- c5s01b: na saída ela para na luz; um pássaro pousa no capim e bica; ela se encolhe e segue ----------
  const t1b = at('c5s01b'), g1b = x => 870 + 10 * Math.sin(x * .004 + 2), HS1b = 600, HOLE = 420;
  const HP1b = makePath([[-3000, 0], [9000, 0]]), S1b = (700 + 3000) / HS1b;
  const LAND1b = rd('c5s01b', 1) + .1, PECK1b = LAND1b + 1.35, SCARE1b = PECK1b + .15, GO1b = SCARE1b + 1.5;
  const HK1b = [[t1b - 1, S1b - 1.6], [t1b + 1, S1b], [GO1b, S1b], [GO1b + 3, S1b + 3]], HO1b = { start: .5, stop: .5, seed: 53 };
  const gB = x => 700 + 8 * Math.sin(x * .004), BS1b = 200, BX = 1450;
  const B_IN = makePath([[2300, 120], [1800, 420], [BX, gB(BX) - .3 * BS1b]]), B_G = makePath([[BX, 0], [-3000, 0]]);
  function bird1b(t) {
    const o = { size: BS1b, t, seed: 9, ground: gB, ...mood(t, [[t1b, 'neutral']], 9) };
    o.sq = .25 * spring(t, LAND1b, 7, 16);
    if (t < LAND1b) return creaturePose(SPECS.bird, { ...o, path: B_IN, s: easeOut(seg(t, LAND1b - 1.1, LAND1b)) * B_IN.length / BS1b, gait: 'fly' });
    const mv = travel(t, [[LAND1b + .3, 0], [LAND1b + .9, 1.1], [GO1b, 1.1], [GO1b + 1, 2.2]], { start: .1, stop: .1 });
    const peck = Math.max(0, Math.sin(2 * TAU * seg(t, PECK1b - .2, PECK1b + .3))) + Math.max(0, Math.sin(2 * TAU * seg(t, GO1b + 1.3, GO1b + 1.8)));
    return nod(creaturePose(SPECS.bird, { ...o, path: B_G, s: mv.s, moving: mv.moving }), .05 * peck, .1 * peck, .8 * peck);
  }
  function c5s01b(t, lt) {
    const cx = 900 + 60 * ease(lt / 8), cy = 560, z = 1 + .06 * ease(lt / 8), [x0, x1] = view(cx, z);
    DAY();
    layer(cx, cy, z, .05, t, () => { Kit.ellipse(1640, 170, 110, 110, P.sun, { alpha: .5 }); Kit.ellipse(1640, 170, 80, 80, P.sun); });
    backdrop(cx, cy, z, t, 620);
    // Plano de trás: o pássaro no capim, irmãs voltando com folhas.
    layer(cx, cy, z, .8, t, (a, b) => {
      const SIS = makePath([[b + 600, 0], [a - 600, 0]]);
      for (const s of crowd(SIS, t, 6, 12, { speed: 70, spacing: 420, carryEvery: 1, sizeVar: .1 })) { const sz = 120 * s.size; A().creature(creaturePose(SPECS.ant, { path: SIS, s: s.s / sz, size: sz, ground: gB, t, seed: s.seed, carry: { w: 1.1, h: .7 } })); }
      A().ground(gB, a, b, mixCol(P.grass, P.skyLow, .25));
      const bp = t > PECK1b - .3 && t < PECK1b + .4 ? smear(bird1b, t) : bird1b(t);
      grass(t, a, b, gB, 20, 30, 70, 0, [], null, mixCol(P.grassDk, P.skyLow, .2));
      if (t > LAND1b - 1.1) A().creature(bp);
      grass(t, a, b, gB, 20, 30, 70, 1, [[bp.head.x, bp.head.y + 40]], null, mixCol(P.grass, P.skyLow, .2));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g1b, x0, x1);
    A().props(x => g1b(x) + 10, x0, x1, 5, 2, 0, 'sr');
    // Monte e boca do ninho.
    Kit.poly([[HOLE - 200, g1b(HOLE - 200) + 8], [HOLE - 90, g1b(HOLE) - 60], [HOLE + 90, g1b(HOLE) - 64], [HOLE + 220, g1b(HOLE + 220) + 8]], EARTH, { smooth: true, weight: 5 });
    Kit.ellipse(HOLE, g1b(HOLE) - 40, 70, 18, P.line);
    const m = travel(t, HK1b, HO1b);
    const md = mood(t, [[t1b, 'surprised'], [t1b + 2.4, 'neutral'], [SCARE1b, 'scared', '!'], [GO1b + .6, 'neutral']], 53);
    const fl = anticipate(t, SCARE1b, .05, .3, SPRING.bouncy) * (1 - ease(seg(t, GO1b - .4, GO1b + .2)));
    let p = her({ path: HP1b, s: m.s, size: HS1b, ground: g1b, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'explore', flinch: fl, expression: md.expression, blink: md.blink, emote: md.emote, sq: .06 * spring(t, t1b + 1, 6, 14) + md.sq });
    // Ergue a cabeça para a luz; depois do susto baixa e segue.
    const up = ease(seg(lt, .4, 1.4)) * (1 - ease(seg(t, SCARE1b - .1, SCARE1b + .3)));
    p = nod(p, 0, -.02 * up, -.3 * up + .06 * up * Math.sin(t * 2.1));
    A().creature(p, LOOK);
    grass(t, x0, x1, x => g1b(x) + 120, 50, 80, 200, null, [[p.head.x, p.head.y + 200]]);
    Kit.camEnd();
  }

  // ---------- c5s02: plano aberto e baixo; a trilha curva até o horizonte, vai e vem das irmãs; "60 m" ----------
  const t2 = at('c5s02'), HZ2 = 548;
  const PTS2 = [[-400, 960], [300, 930], [900, 830], [1180, 730], [1020, 655], [1280, 605], [1720, 573], [2400, 556]];
  const sc2 = y => lerp(.06, 1, clamp((y - HZ2) / 400) ** 1.3);   // escala da perspectiva pela altura no quadro
  const OUT2 = makePath(PTS2.map(([x, y]) => [x, y - 40 * sc2(y)])), BACK2 = makePath(PTS2.map(([x, y]) => [x, y + 40 * sc2(y)]).reverse());
  // Distância no caminho ↔ distância no mundo (perto, 1 px = 1; longe, encolhe): passos iguais no mundo.
  function warp(path) {
    const tab = []; let w = 0;
    for (let d = 0; d <= path.length; d += 6) { tab.push([w, d]); w += 6 / sc2(path.at(d).y); }
    return { length: w, d: wv => { let lo = 0, hi = tab.length - 1; while (hi - lo > 1) { const mi = (lo + hi) >> 1; if (tab[mi][0] < wv) lo = mi; else hi = mi; } const [w0, d0] = tab[lo], [w1, d1] = tab[hi]; return lerp(d0, d1, clamp((wv - w0) / ((w1 - w0) || 1))); } };
  }
  const WO2 = warp(OUT2), WB2 = warp(BACK2), AS2 = 230;
  const BAND2 = [...PTS2.map(([x, y]) => [x, y - 130 * sc2(y)]), ...PTS2.slice().reverse().map(([x, y]) => [x, y + 110 * sc2(y)])];
  function c5s02(t, lt) {
    const cx = 940 + 70 * ease(lt / 7), cy = 610, z = 1 + .05 * ease(lt / 7), [x0, x1] = view(cx, z);
    DAY();
    backdrop(cx, cy, z, t, HZ2 - 6, P.skyLow);
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(x => HZ2 + 4 * Math.sin(x * .01), x0, x1);
    Kit.poly(BAND2, TRAIL, { smooth: true, weight: 3 });
    const ants = [];
    for (const a of crowd(WO2, t, 26, 21, { speed: 160, spacing: WO2.length / 26, carryEvery: 99, sizeVar: .1 })) { const d = WO2.d(a.s), y = OUT2.at(d).y; ants.push({ y, path: OUT2, d, sz: AS2 * sc2(y) * a.size, seed: a.seed, carry: null }); }
    for (const a of crowd(WB2, t, 26, 23, { speed: 140, spacing: WB2.length / 26, carryEvery: 2, sizeVar: .1 })) { const d = WB2.d(a.s), y = BACK2.at(d).y; ants.push({ y, path: BACK2, d, sz: AS2 * sc2(y) * a.size, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null }); }
    // Ela entra pela frente, na pista de ida, e segue as irmãs.
    const hm = travel(t, [[rd('c5s02', 1) - .7, 330], [t2 + 7.2, 330 + 2.6 * AS2]], { start: .4, stop: 0, seed: 55 });
    const hd = WO2.d(hm.s), hy = OUT2.at(hd).y;
    ants.push({ y: hy + .1, path: OUT2, d: hd, sz: AS2 * 1.35 * sc2(hy), hero: true, moving: hm.moving });
    // Capim em tufos ao lado da trilha, também em perspectiva.
    for (let k = 0; k < 70; k++) { const y = lerp(HZ2 + 8, 960, hash(k + 400) ** 1.6), x = lerp(-200, 2200, hash(k + 401)); ants.push({ y, tuft: [x, y, (70 + 110 * hash(k + 402)) * sc2(y)] }); }
    ants.sort((a, b) => a.y - b.y);
    for (const a of ants) {
      if (a.tuft) { const [x, y, h] = a.tuft; A().blade(x, y, h, .25 * wind(t, x, 4), P.grassDk); A().blade(x + .2 * h, y, .8 * h, .25 * wind(t, x + 30, 4), P.grass); continue; }
      if (a.hero) { if (t > rd('c5s02', 1) - .7) A().creature(her({ path: a.path, s: a.d / a.sz, size: a.sz, t, moving: a.moving, antennae: 'explore' }), LOOK); continue; }
      if (!a.hero && t > rd('c5s02', 1) - .7 && Math.abs(a.path.at(a.d).x - OUT2.at(hd).x) < .9 * a.sz && a.path === OUT2) continue;  // a irmã que a encobriria
      A().creature(creaturePose(SPECS.ant, { path: a.path, s: a.d / a.sz, size: a.sz, t, seed: a.seed, carry: a.carry }));
    }
    Kit.camEnd();
    const r0 = rd('c5s02', 0), [tx, ty] = toScreen(1520, 470, [cx, cy, z]);
    Kit.text('60 m', tx, ty, 96, P.ink, { k: Math.min(seg(t, r0 + .3, r0 + .7), 1 - seg(t, rd('c5s02', 1) - .4, rd('c5s02', 1))) });
  }

  // ---------- c5s03 e começo de c5s04: de cima, ela corta a borda da folha e vibra; ondas correm, irmãs chegam ----------
  const t3 = at('c5s03'), t4 = at('c5s04');
  const LF = { x: 900, y: 690, w: 2300, h: 1000, a: -.06 };
  const lfAt = (u, v) => [LF.x + Math.cos(LF.a) * u - Math.sin(LF.a) * v, LF.y + Math.sin(LF.a) * u + Math.cos(LF.a) * v];
  const BITE = lfAt(LF.w * .1, -LF.h * .5), HS3 = 520;
  const UPP = makePath([[BITE[0] + 60, BITE[1] + 3000], [BITE[0], BITE[1] - 3000]]);
  const CUT_T = rd('c5s03', 0) + .2;
  const cutK = t => .14 * ease(seg(t, CUT_T, t3 + 7.8)) + .6 * ease(seg(t, t4 + .2, t4 + 3.6));
  // Irmãs que chegam: de onde vêm, onde param, quando.
  const SIS3 = [
    [[-400, 1100], [BITE[0] - 360, BITE[1] + 230], rd('c5s03', 1) + .3],
    [[2400, 1250], [BITE[0] + 380, BITE[1] + 250], rd('c5s03', 1) + 1.3],
    [[200, -300], [BITE[0] - 320, BITE[1] - 40], rd('c5s03', 1) + 2.4],
  ].map(([a, b, ts]) => ({ path: makePath([a, b, [b[0] + (b[0] - a[0]) * .01, b[1] + (b[1] - a[1]) * .01]]), stop: makePath([a, b]).length, ts }));
  function topLeaf(t, cam) {
    const [cx, cy, z] = cam, c = animationEngine.context;
    Kit.gradient(mixCol(P.ground, P.wood, .25), mixCol(P.ground, P.wood, .35));
    Kit.cam(cx, cy, z, 0, hand(t));
    // Chão visto de cima: pedrinhas e capim que balança nas bordas.
    for (let i = 0; i < 26; i++) Kit.ellipse(-300 + 2500 * hash(i + 500), -300 + 1700 * hash(i + 501), 14 + 26 * hash(i + 502), 10 + 18 * hash(i + 503), i % 3 ? mixCol(P.ground, P.ink, .2) : P.stone, { rot: hash(i) * 3 });
    A().leafPiece(LF.x, LF.y, LF.w, LF.h, LF.a, P.leaf, cutK(t));
    for (const s of [-1, 1]) for (let j = 1; j < 5; j++) { const u = -LF.w * .4 + j * LF.w * .17; Kit.line([lfAt(u, 0), lfAt(u + LF.w * .1, s * LF.h * .3)], P.leafDk, 6); }
    // Sombra de uma folha de capim passando por cima, ao vento.
    const sx = 1700 + 220 * wind(t, 3, 3);
    Kit.poly([[sx - 40, -400], [sx + 40, -400], [sx - 260, 1500], [sx - 340, 1500]], P.ink, { stroke: false, alpha: .12 });
    for (let k = 0; k < 9; k++) { const x = k < 5 ? -200 + 120 * k : 1500 + 140 * (k - 5), y = k < 5 ? 1250 - 40 * k : -150 + 60 * (k - 5), b = .4 * wind(t, x, 5); Kit.line([[x, y], [x + 60 + 160 * b, y - 260], [x + 120 + 300 * b, y - 520]], k & 1 ? P.grass : P.grassDk, 26); }
    return { c, z };
  }
  // Ela de cima, cabeça no corte; vib 0..1 = intensidade da vibração.
  function heroTop(t, vib, look = LOOK) {
    const p = her({ path: UPP, s: 3000 / HS3 + .2, size: HS3, t, view: 'top', moving: 0, antennae: 'explore' });
    const [jx, jy] = buzz(t, 7 * vib, 3);
    shifted(BITE[0] - p.head.x + jx, BITE[1] + .08 * HS3 - p.head.y + jy, () => A().creature(p, { ...look, jaws: .5 + .5 * vib * Math.sin(TAU * 7 * t) }));
  }
  function sisTop(t, i, cut) {
    const S = SIS3[i], sz = 430 + 40 * hash(i + 80), mv = travel(t, [[S.ts, 0], [S.ts + 2.2, S.stop / sz]], { start: .3, stop: .5, seed: 80 + i });
    if (t < S.ts - .1) return null;
    const p = creaturePose(SPECS.ant, { path: S.path, s: mv.s, size: sz, t, seed: 80 + i, view: 'top', moving: mv.moving, antennae: mv.moving > .5 ? 'explore' : 'tap' });
    const [jx, jy] = buzz(t, 6 * cut, 10 + i);
    shifted(jx, jy, () => A().creature(p, { jaws: .4 + .4 * cut * Math.sin(TAU * 6 * t + i) }));
    return p;
  }
  function waves(t, from, n, R) { for (let i = 0; i < n; i++) ring(BITE[0], BITE[1], R, frac((t - from) * .7 + i / n) * (t > from ? 1 : 0)); }
  function c5s03(t, lt) {
    const zk = ease(seg(t, rd('c5s03', 1) - .4, rd('c5s03', 1) + 1.4));
    const cam = [lerp(BITE[0], 960, zk), lerp(BITE[1] + 120, 560, zk), lerp(2.3 + .1 * ease(lt / 3), .95, zk)];
    topLeaf(t, cam);
    const vib = t > CUT_T ? .6 + .4 * Math.sin(t * 3) : 0;
    waves(t, CUT_T, 4, 1000 * (.4 + .6 * zk));
    for (let i = 0; i < 3; i++) sisTop(t, i, 0);
    heroTop(t, vib);
    Kit.camEnd();
    Kit.vignette(.25);
  }

  // ---------- c5s04: termina o recorte (de cima); corte para o lado: ergue o pedaço e volta para a trilha ----------
  const SIDE4 = rd('c5s04', 0) + 3.9, g4 = x => 880 + 8 * Math.sin(x * .004), HS4 = 600;
  const HP4 = makePath([[3000, 0], [-6000, 0]]), S4 = (3000 - 1180) / HS4, WALK4 = rd('c5s04', 1) + 1.6;
  const HK4 = [[WALK4, S4], [WALK4 + 4, S4 + 3.6]], HO4 = { start: .7, stop: 0, seed: 57 };
  const g4b = x => 760 + 6 * Math.sin(x * .004), TR4 = makePath([[3200, 0], [-3000, 0]]);
  function c5s04(t, lt) {
    if (t < SIDE4) {
      const cam = [lerp(BITE[0], 1000, .3), BITE[1] + 260, 1.35 + .1 * ease(lt / 4)];
      topLeaf(t, cam);
      waves(t, t4 - 3, 4, 900);
      for (let i = 0; i < 3; i++) sisTop(t, i, i === 1 ? 0 : seg(t, t4 + .5, t4 + 1));
      // O pedaço solto: sobe com a cabeça dela nos últimos instantes.
      heroTop(t, t < SIDE4 - .5 ? .8 : 0);
      Kit.camEnd();
      Kit.vignette(.2);
      return;
    }
    const m = travel(t, HK4, HO4), lift = anticipate(t, SIDE4 + .15, .12, .25);
    const p = her({ path: HP4, s: m.s, size: HS4, ground: g4, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'explore', sq: .1 * spring(t, SIDE4 + .2, 6, 14) });
    nod(p, 0, -.03 * lift, -.2 * lift);
    const hx = p.head.x, cx = Math.min(1000, hx + 260), cy = 560, z = 1 - .08 * ease(seg(t, WALK4, WALK4 + 3)), [x0, x1] = view(cx, z);
    DAY();
    backdrop(cx, cy, z, t, 640);
    // Trilha de trás: carregadoras voltando para o ninho (da direita para a esquerda).
    layer(cx, cy, z, .8, t, (a, b) => {
      A().ground(g4b, a, b, mixCol(P.grass, P.skyLow, .2));
      for (const s of crowd(TR4, t, 12, 31, { speed: 75, spacing: 520, carryEvery: 1, sizeVar: .1 })) { const sz = 150 * s.size; A().creature(creaturePose(SPECS.ant, { path: TR4, s: s.s / sz, size: sz, ground: g4b, t, seed: s.seed, carry: { w: 1.1, h: .7 } })); }
      grass(t, a, b, g4b, 24, 40, 90, null, [], null, mixCol(P.grassDk, P.skyLow, .15));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g4, x0, x1);
    // A folha no chão, com a mordida; as irmãs cortando nela, vibrando (as companheiras que ela chamou).
    A().leafPiece(1500, g4(1500) - 10, 1100, 90, 0, P.leaf);
    Kit.ellipse(1340, g4(1340) - 46, 70, 26, mixCol(P.ground, P.wood, .3));
    for (const [i, x] of [[0, 1750], [1, 1980]]) {
      const sp = nod(creaturePose(SPECS.ant, { path: makePath([[x + 1000, 0], [x - 1000, 0]]), s: 1000 / 380, size: 380, ground: () => g4(x) - 40, t, seed: 90 + i, moving: 0, antennae: 'tap' }), .02, .05, .5 + .1 * Math.sin(TAU * 3 * t + i));
      const [jx, jy] = buzz(t, 6, 20 + i);
      shifted(jx, jy, () => A().creature(sp, { jaws: .5 + .4 * Math.sin(TAU * 6 * t + i) }));
      for (let k = 0; k < 3; k++) A().ripple(sp.head.x - 30, g4(x) - 40, frac(t * 1.2 + k / 3 + i * .5));
    }
    drawLeaf(held(p, HS4, .6 * HS4, clamp(.2 + .8 * lift)));
    A().creature(p, LOOK);
    grass(t, x0, x1, x => g4(x) + 130, 60, 120, 260, null, [[p.head.x, p.head.y + 120]]);
    Kit.camEnd();
  }

  // ---------- c5s04b: outra folha num talo; corta com esforço, pausa, corta de novo; o céu escurece ----------
  const t4b = at('c5s04b'), g4c = x => 900 + 8 * Math.sin(x * .004 + 1), HS4b = 620, HX4b = 820;
  const B1 = [t4b + .3, t4b + 1.9], B2 = [rd('c5s04b', 0) + 2.1, rd('c5s04b', 1) + 2.4];
  const work = t => Math.max(seg(t, B1[0] - .1, B1[0] + .2) * (1 - seg(t, B1[1] - .1, B1[1] + .2)), seg(t, B2[0] - .1, B2[0] + .2) * (1 - seg(t, B2[1] - .1, B2[1] + .2)));
  function c5s04b(t, lt) {
    const nk = ease(seg(t, rd('c5s04b', 1), at('c5s04c') - .1));
    const cx = 960 + 40 * ease(lt / 7), cy = 520, z = 1.08 + .07 * ease(lt / 7), [x0, x1] = view(cx, z);
    Kit.gradient(mixCol(mixCol(P.skyTop, P.cloth, .3), P.shade, .85 * nk), mixCol(mixCol(P.skyLow, P.sun, .4 * nk), P.shade, .55 * nk));
    layer(cx, cy, z, .05, t, () => Kit.ellipse(1600, lerp(170, 640, nk), 80, 80, mixCol(P.sun, P.wingAccent, nk)));
    backdrop(cx, cy, z, t, 650, mixCol(P.skyLow, P.shade, .5 * nk));
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g4c, x0, x1);
    // Talo e folha: a borda de baixo fica na altura da cabeça dela; a mordida cresce só enquanto ela corta.
    const done = .15 + .25 * seg(t, B1[0], B1[1]) + .3 * seg(t, B2[0], B2[1]);
    const w = work(t), sway = .03 * wind(t, 1, 3) + .015 * w * Math.sin(TAU * 7 * t);
    const md = mood(t, [[t4b, 'angry'], [B1[1] + .1, 'neutral'], [B2[0], 'angry'], [B2[0] + 1.2, 'angry', 'sweat'], [B2[1] + .1, 'neutral']], 61);
    const SP = makePath([[2600, 0], [-800, 0]]), sd = 1300 + 120 * (t - t4b);
    A().creature(creaturePose(SPECS.ant, { path: SP, s: sd / 220, size: 220, ground: x => g4c(x) - 120, t, seed: 95, carry: { w: 1, h: .4 } }));
    const p = her({ path: makePath([[HX4b - 1000, 0], [HX4b + 1000, 0]]), s: 1000 / HS4b, size: HS4b, ground: g4c, t, moving: 0, antennae: w > .5 ? 'tap' : 'explore',
      emote: md.emote, blink: md.blink, sq: .05 * Math.sin(TAU * .8 * t) * (1 - w) + .07 * spring(t, B2[0], 6, 14) + md.sq, expression: md.expression });
    // Talo e folha: a mordida fica na mandíbula dela (centro = mordida − deslocamento da mordida na folha girada).
    const lx = p.head.x + .12 * HS4b + 32, ly = p.head.y - .1 * HS4b - 125;
    Kit.line([[lx + 420, g4c(lx + 420)], [lx + 330, ly + 220], [lx + 200, ly - 40]], P.leafDk, 16);
    A().leafPiece(lx, ly, 620, 230, Math.PI - .25 + sway, P.leaf, done);
    const bob = w * Math.sin(TAU * 4 * t);
    nod(p, .04, -.07 * w - .01 * bob, -.75 * w + .08 * bob - .1 * (1 - w) * Math.sin(t * 1.7));
    const [jx, jy] = buzz(t, 5 * w, 30);
    shifted(jx, jy, () => A().creature(p, { ...LOOK, jaws: .5 + .5 * w * Math.sin(TAU * 6 * t) }));
    if (w > .3) for (let k = 0; k < 3; k++) A().ripple(p.head.x + 80, p.head.y - 60, frac(t * 1.2 + k / 3));
    grass(t, x0, x1, x => g4c(x) + 130, 60, 120, 260, null, [[p.head.x, p.head.y + 120]]);
    Kit.camEnd();
    Kit.flash(.32 * nk, P.shade);
  }

  // ---------- c5s04c: noite; a trilha ao luar, carregadoras em silhueta (outra colônia) ----------
  const t4c = at('c5s04c'), gN = x => 760 + 20 * Math.sin(x * .0025) + 8 * Math.sin(x * .009), NIGHT = { color: P.ink, dark: P.line };
  const TRN = makePath([[4000, 0], [-4000, 0]]);
  function c5s04c(t, lt) {
    const back = ease(seg(t, rd('c5s04c', 1) - .3, rd('c5s04c', 1) + 2.2));
    const cx = 1100 - 45 * lt, cy = lerp(640, 560, back), z = lerp(1.25, .75, back), [x0, x1] = view(cx, z);
    Kit.gradient(mixCol(P.skyTop, P.shade, .8), mixCol(P.skyLow, P.shade, .62));
    for (let i = 0; i < 40; i++) { const x = 1920 * hash(i + 600), y = 600 * hash(i + 601) ** 1.4; Kit.ellipse(x, y, 3, 3, P.cloud, { alpha: .5 + .5 * Math.sin(t * (1 + 2 * hash(i + 602)) + 7 * hash(i)) }); }
    layer(cx, cy, z, .05, t, () => Kit.ellipse(1450, 260, 190, 190, P.sun, { alpha: .25 }));
    // Morros longe, baixos: as carregadoras da crista ficam recortadas contra o céu.
    layer(cx, cy, z, .3, t, (a, b) => A().ground(x => 800 + 30 * Math.sin(x * .002 + 1), a, b, mixCol(P.foliage, P.shade, .6)));
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(gN, x0, x1, mixCol(P.groundDk, P.shade, .4));
    grass(t, x0, x1, gN, 26, 10, 28, 0, [], null, P.ink);
    for (const s of crowd(TRN, t, 26, 43, { speed: 120, spacing: 420, carryEvery: 1, sizeVar: .12 })) {
      const x = TRN.at(s.s).x; if (x < x0 - 200 || x > x1 + 200) continue;
      const sz = 210 * s.size;
      A().creature(creaturePose(SPECS.ant, { path: TRN, s: s.s / sz, size: sz, ground: gN, t, seed: s.seed, carry: { w: 1.1, h: .7 } }), NIGHT);
    }
    grass(t, x0, x1, x => gN(x) + 160, 70, 120, 280, null, [], null, P.ink);
    Kit.camEnd();
    Kit.flash(.55, P.shade);
    // Lua por cima do escuro.
    layer(cx, cy, z, .05, t, () => { Kit.ellipse(1450, 260, 110, 110, P.sun); Kit.ellipse(1420, 240, 22, 18, mixCol(P.sun, P.stone, .4)); Kit.ellipse(1490, 300, 14, 12, mixCol(P.sun, P.stone, .4)); });
    layer(cx, cy, z, .1, t, () => A().cloud(1100 + 8 * lt, 330, .9, 5));
  }

  // ---------- c5s05: entardecer; ela ergue o pedaço e entra na fila de volta; a câmera acompanha e abre ----------
  const t5 = at('c5s05'), g5 = x => 860 + 10 * Math.sin(x * .004 + 2), HS5 = 420, TR5 = makePath([[6000, 0], [-6000, 0]]);
  const LIFT5 = rd('c5s05', 0) + .5, ENTER5 = LIFT5 + 1.9, HX5 = 1150;
  const C5 = { speed: 160, spacing: 560, carryEvery: 1, sizeVar: .08 };
  const HK5 = [[ENTER5, (6000 - HX5) / HS5], [t5 + 9, (6000 - HX5 + C5.speed * (t5 + 9 - ENTER5 - .25)) / HS5]], HO5 = { start: .5, stop: 0, seed: 59 };
  const lane5 = x => g5(x) + 34 * clamp((x - (HX5 - 380)) / 360);
  const GAP5 = new Set(crowd(TR5, ENTER5 + 1, 30, 61, C5).filter(a => Math.abs(TR5.at(a.s).x - (HX5 - C5.speed * .75)) < .62 * C5.spacing).map(a => a.seed));
  function c5s05(t, lt) {
    const m = travel(t, HK5, HO5), lift = anticipate(t, LIFT5, .12, .25);
    const p = her({ path: TR5, s: m.s, size: HS5, ground: lane5, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'explore', sq: .1 * spring(t, LIFT5 + .2, 6, 14) });
    nod(p, 0, -.03 * lift, -.15 * lift);
    const open = ease(seg(t, rd('c5s05', 1) - .3, rd('c5s05', 1) + 2.6));
    const cx = lerp(Math.min(1060, p.head.x + 120), p.head.x - 500, open), cy = lerp(700, 470, open), z = lerp(1.35, .6, open), [x0, x1] = view(cx, z);
    DUSK();
    layer(cx, cy, z, .05, t, () => Kit.ellipse(1500, 560, 100, 100, P.sun));
    backdrop(cx, cy, z, t, 680, mixCol(P.skyLow, P.sun, .5));
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g5, x0, x1);
    A().props(x => g5(x) + 10, x0, x1, 15, 1.5, 0, 'srf');
    grass(t, x0, x1, g5, 20, 26, 54, 0);
    for (const a of crowd(TR5, t, 30, 61, C5)) {
      const x = TR5.at(a.s).x; if (x < x0 - 300 || x > x1 + 300 || GAP5.has(a.seed)) continue;
      const sz = HS5 * a.size, rideOn = a.seed % 4 === 1, q = creaturePose(SPECS.ant, { path: TR5, s: a.s / sz, size: sz, ground: g5, t, seed: a.seed, carry: rideOn ? { w: 1, h: .4 } : { w: 1.1, h: .7 } });
      A().creature(q); if (rideOn) A().rider(q, t, a.seed);
    }
    drawLeaf(held(p, HS5, .75 * HS5, clamp(lift)));
    A().creature(p, LOOK);
    grass(t, x0, x1, g5, 20, 26, 54, 1, [[p.head.x, p.head.y]]);
    grass(t, x0, x1, x => g5(x) + 150, 60, 100, 220, null);
    Kit.camEnd();
  }

  shotsById({ c5s01, c5s01b, c5s02, c5s03, c5s04, c5s04b, c5s04c, c5s05 });
})();
