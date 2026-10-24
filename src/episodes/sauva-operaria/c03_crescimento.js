// c03_crescimento.js: capítulo 3 de sauva-operaria (Do ovo à operária), planos c3s01–c3s07.
// Câmara de cria: o ovo dela eclode, a larva é alimentada pelas jardineiras, vira pupa (avanço rápido) e nasce;
// close das mandíbulas; fila jardineira–média–soldada; a soldada assusta; ela entra num de três túneis.
// Metamorfose sem morph no motor: larva → pupa e pupa → adulta são fusões curtas (alpha) sobre um tremor, feitas aqui.
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

  // ---------- ajudas do capítulo (as de c01, locais) ----------
  const hand = t => ({ t, k: .5, seed: 5 });
  const view = (cx, zoom) => [cx - W / 2 / zoom - 80, cx + W / 2 / zoom + 80];
  const toScreen = (x, y, [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
  const c = () => animationEngine.context;
  // Move a cabeça (e as antenas) depois de creaturePose; da > 0 baixa o olhar.
  function nod(p, dx, dy, da) {
    const hx = p.head.x + p.facing * dx * p.size, hy = p.head.y + dy * p.size, a = p.facing * da, co = Math.cos(a), si = Math.sin(a);
    const move = ([x, y]) => { x += hx - p.head.x; y += hy - p.head.y; return [hx + (x - hx) * co - (y - hy) * si, hy + (x - hx) * si + (y - hy) * co]; };
    for (const ap of SPECS[p.spec].appendages) if (ap.attach === 'head') p.appendages[ap.name] = p.appendages[ap.name].map(move);
    p.head = { x: hx, y: hy, angle: p.head.angle + a };
    return p;
  }
  // Antenas que tremem (recém-nascida): cada antena gira um pouco em torno da base, por ruído rápido.
  function tremble(p, k, t) {
    if (k <= 0) return p;
    for (const [i, n] of ['antennaL', 'antennaR'].entries()) {
      const pts = p.appendages[n], [bx, by] = pts[0], a = k * .14 * noise1(80 + i, t * 9), co = Math.cos(a), si = Math.sin(a);
      p.appendages[n] = pts.map(([x, y]) => [bx + (x - bx) * co - (y - by) * si, by + (x - bx) * si + (y - by) * co]);
    }
    return p;
  }
  // Poeira das pisadas do último meio segundo.
  function dust(spec, sOf, poseAt, t, seed) {
    const gait = GAITS[spec.gait], vary = { ...ORGANIC, ...spec.organic }.vary;
    for (const lb of spec.limbs) if (lb.foot) for (const te of stepEvents(sOf, t - .5, t, gait.offsets[lb.key || lb.name], spec.stride, gait.duty, vary, seed + 501)) {
      const f = poseAt(te).limbs[lb.name].end; A().dust(f[0], f[1], (t - te) / .5, Math.floor(f[0]));
    }
  }
  // Grão de terra que cai do teto de tempos em tempos (vida de fundo).
  function grains(t, x0, x1, top, floor, n, seed) {
    for (let i = 0; i < n; i++) {
      const per = 2.6 + 1.5 * hash(seed + i), u = frac(t / per + hash(seed + i + 9)), x = lerp(x0, x1, hash(seed + i * 3 + Math.floor(t / per + hash(seed + i + 9))));
      if (u < .35) Kit.ellipse(x, lerp(top, floor, u / .35), 3, 3, mixCol(P.wood, P.cream, .25));
    }
  }
  // Laço achatado no chão (centro, raios): quem anda nele passa atrás (metade de cima) e na frente. d = 0 é a frente.
  const loopPath = (cx, cy, rx, ry, dir = 1) => makePath(Array.from({ length: 33 }, (_, k) => { const a = Math.PI / 2 - dir * k * TAU / 32; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }));
  const BROOD = mixCol(P.cream, P.cloud, .4);  // a cor da cria no motor (ovo, larva, pupa e as cascas)
  // Ponto de comida (secreção) ou ovo trófico na boca de uma jardineira.
  function food(p, egg) {
    const x = p.head.x + p.facing * .15 * p.size, y = p.head.y + .07 * p.size, r = .09 * p.size, ry = egg ? 1.35 * r : .85 * r, rot = egg ? .4 * p.facing : 0;
    Kit.ellipse(x, y, r + 3, ry + 3, P.line, { rot }); Kit.ellipse(x, y, r, ry, egg ? BROOD : P.cloud, { rot });
  }

  // ---------- a câmara de cria (c3s01–c3s06) ----------
  // Mundo: chão plano em FLOOR; a cria dela fica em BX; operária média = HS px/BL, jardineira = JS.
  const FLOOR = 760, BX = 1010, HS = 200, JS = 90, SOIL = mixCol(P.wood, P.ink, .35), RIM = mixCol(P.wood, P.ink, .6);
  const FAR = { color: mixCol(P.sauva, P.wood, .45), dark: mixCol(P.sauvaDk, P.wood, .45) };  // irmãs ao fundo, mais apagadas
  const SIDE_T = [makePath([[-600, FLOOR - 34], [330, FLOOR - 34]]), makePath([[1590, FLOOR - 34], [2600, FLOOR - 34]])];
  const TOP_T = makePath([[1520, -500], [1500, 200], [1400, 470]]);
  const BACK = makePath([[-600, FLOOR - 10], [2600, FLOOR - 10]]);
  // Irmãs da cria (x, tipo, tamanho, semente).
  const SIB = [[760, 'larva', 48, 11], [815, 'egg', 13, 12], [1190, 'egg', 14, 13], [1250, 'larva', 52, 14], [1350, 'pupa', 140, 15]];
  const FLOOR_PTS = Array.from({ length: 25 }, (_, i) => [-800 + 150 * i, FLOOR + 3 * Math.sin(i * 1.7)]);
  // Pinta a câmara sob a câmera cam = [cx, cy, z] e deixa a câmera aberta (o plano desenha os seres e fecha).
  // tb: tempo do fundo (acelerado no avanço rápido); o.brood = false tira as irmãs da cria; o.back = false tira as irmãs que passam.
  function room(t, cam, o = {}) {
    const [cx, cy, z] = cam, [x0, x1] = view(cx, z), tb = o.tb ?? t;
    Kit.cam(cx, cy, z, 0, hand(t));
    A().soil(x0, cy - H / 2 / z - 100, x1 - x0, H / z + 200, 23);
    for (const p of SIDE_T) A().tunnel(p, 70);
    A().tunnel(TOP_T, 60);
    A().chamber(960, FLOOR + 140, 1600, 720, 8);
    Kit.poly([...FLOOR_PTS, [2800, FLOOR + 400], [-800, FLOOR + 400]], SOIL, { stroke: false }); Kit.line(FLOOR_PTS, RIM, 5, { smooth: false });
    // Jardim de fungo ao fundo, atrás da cria (a cria vive no jardim); depois uma névoa escura empurra o fundo para trás.
    // Só o que está no quadro; k > 1 desenha o fungo k× menor e amplia (menos bolhas, bem mais barato em close).
    const fg = (x, y, w, h, sd, k = 1) => {
      if (x + w / 2 < x0 || x - w / 2 > x1) return;
      const g = c(); g.save(); g.translate(x, y); g.scale(k, k); A().fungus(0, 0, w / k, h / k, tb, sd); g.restore();
    };
    fg(BX - 130, FLOOR - 30, 760, 330, 5, 2);
    fg(BX + 430, FLOOR - 24, 540, 260, 6, 2);
    for (const a of crowd(TOP_T, tb, 3, 51, { speed: 40, spacing: 330, carryEvery: 99, sizeVar: .1 })) { const sz = 110 * a.size; A().creature(creaturePose(SPECS.ant, { path: TOP_T, s: a.s / sz, size: sz, t: tb, seed: a.seed }), FAR); }
    Kit.camEnd();
    Kit.flash(.2, P.shade);
    Kit.cam(cx, cy, z, 0, hand(t));
    fg(540, FLOOR, 400, 240, 3);
    grains(tb, 560, 1450, FLOOR - 560, FLOOR, 5, 33);
    // Irmãs adultas passam ao fundo, entrando e saindo pelos túneis dos lados.
    if (o.back !== false) for (const a of crowd(BACK, tb, 4, 52, { speed: 55, spacing: 800, carryEvery: 99, sizeVar: .08 })) {
      const sz = 130 * a.size, x = BACK.at(a.s).x;
      if (x > x0 - 200 && x < x1 + 200) A().creature(creaturePose(SPECS.ant, { path: BACK, s: a.s / sz, size: sz, ground: () => FLOOR - 12, t: tb, seed: a.seed }), FAR);
    }
    if (o.brood !== false) for (const [x, k, sz, sd] of SIB) {
      if (x < x0 - 100 || x > x1 + 100) continue;
      if (k === 'egg') A().egg(x, FLOOR, sz, tb, sd);
      else if (k === 'larva') A().larva(x, FLOOR, sz, tb, sd, x < BX ? -1 : 1);
      else A().pupa(x, FLOOR, sz, tb, sd, -1);
    }
    return [x0, x1];
  }
  const LINE = makePath([[-3000, FLOOR], [5000, FLOOR]]), LINE_L = makePath([[5000, FLOOR], [-3000, FLOOR]]);
  const sAt = (x, size) => (x + 3000) / size, sAtL = (x, size) => (5000 - x) / size;  // s (BL) na linha do chão com o corpo em x
  const flat = () => FLOOR;
  // Jardineira (mínima) de pé no chão, parada, olhando para x; tap = 0..1 baixa a cabeça e toca com as antenas.
  function nurse(t, x, facing, seed, tap = 0, m = { s: null, moving: 0 }) {
    const path = facing > 0 ? LINE : LINE_L, s = m.s ?? (facing > 0 ? sAt(x, JS) : sAtL(x, JS));
    const p = creaturePose(SPECS.minima, { path, s, size: JS, ground: flat, t, seed, moving: m.moving, lean: m.lean, antennae: tap > .3 ? 'tap' : 'explore' });
    return nod(p, .02 * tap, .04 * tap, .35 * tap + .08 * tap * Math.sin(TAU * 1.6 * t + seed));
  }
  // A larva dela (semente 7): size, tempo do respirar (congelado = parada) e saída do ovo.
  const larvaHer = (x, size, tl) => A().larva(x, FLOOR, size, tl, SEED, 1);
  // Metamorfose (o motor não tem morph): a forma velha achata até sumir em [t0 − .18, t0] e a nova salta do chão
  // (backOut) em [t0, t0 + .35], sob uma nuvem de poeira; rot gira as duas em torno da base (tremor).
  function swap(t, t0, x, rot, oldDraw, newDraw) {
    const g = c(), a = seg(t, t0 - .18, t0), b = backOut(seg(t, t0, t0 + .35));
    g.save(); g.translate(x, FLOOR); g.rotate(rot);
    if (t < t0) g.scale(1 + .35 * a, Math.max(.04, 1 - .96 * a)); else g.scale(1 + .25 * (1 - b), Math.max(.04, b));
    g.translate(-x, -FLOOR); (t < t0 ? oldDraw : newDraw)(); g.restore();
    if (t > t0 - .15 && t < t0 + .6) A().dust(x - 30, FLOOR, seg(t, t0 - .15, t0 + .6), Math.floor(t0));
  }

  // ---------- c3s01: close do ovo; balança, eclode; sai a larva; jardineiras chegam e tocam ----------
  const t1 = at('c3s01'), hatch = t => clamp((t - at('c3s01')) / 3), POP = t1 + 3, ER = 16;
  const BACK1 = rd('c3s01', 1);  // "Sai uma larva": a câmera recua e as jardineiras chegam
  const N1 = [{ x0: 640, x1: 950, f: 1, sd: 61, t0: BACK1 + .3 }, { x0: 1420, x1: 1085, f: -1, sd: 62, t0: BACK1 + .9 }];
  function nurse1(t, n) {
    const sz = JS, s0 = n.f > 0 ? sAt(n.x0, sz) : sAtL(n.x0, sz), s1 = n.f > 0 ? sAt(n.x1, sz) : sAtL(n.x1, sz);
    const m = travel(t, [[n.t0, s0], [n.t0 + 2.2, s1]], { start: .4, stop: .6, seed: n.sd });
    return nurse(t, 0, n.f, n.sd, ease(seg(t, n.t0 + 2.3, n.t0 + 2.8)), m);
  }
  function c3s01(t) {
    const cam = kf(t, [[t1, [BX - 50, FLOOR - 32, 7]], [POP, [BX - 45, FLOOR - 34, 7.4]], [BACK1, [BX - 30, FLOOR - 36, 7.2]], [BACK1 + 1.8, [BX, FLOOR - 75, 3.9]], [end('c3s01'), [BX + 10, FLOOR - 75, 4.1]]]);
    room(t, cam);
    const ns = N1.map(n => nurse1(t, n));
    // Casca aberta fica; a larva sai dela, rola um pouco para a direita e se ajeita.
    const ex = BX - 50, out = ease(seg(t, POP, POP + .9));
    A().egg(ex, FLOOR, ER, t, SEED, hatch(t));
    if (t >= POP) larvaHer(ex + 60 * out, 60 * backOut(seg(t, POP, POP + .45)), t);
    for (const p of ns) if (t > N1[0].t0 - .1) A().creature(p);
    Kit.camEnd();
    Kit.vignette(.2);
    const [tx, ty] = toScreen(ex, FLOOR - 66, cam);
    Kit.text('3–4 semanas', tx, ty, 64, P.ink, { k: Math.min(seg(t, rd('c3s01', 0), rd('c3s01', 0) + .4), 1 - seg(t, BACK1 - .3, BACK1)) });
  }

  // ---------- c3s02: as jardineiras vão e voltam entre o fungo e a larva, com comida na boca ----------
  const t2 = at('c3s02'), LOOP2 = loopPath(800, FLOOR, 165, 18), EGGS2 = rd('c3s02', 1);
  const LX = BX + 10;  // a larva depois de sair do ovo (c3s01 termina com ela aqui)
  function nurses2(t, tb, speed = 85) {
    const L = LOOP2.length, out = [];
    for (let j = 0; j < 4; j++) {
      const d = frac((speed * tb) / L + j / 4) * L, u = d / L, y = LOOP2.at(d).y;
      const p = creaturePose(SPECS.minima, { path: LOOP2, s: d / JS, size: JS, ground: () => FLOOR + .2 * (y - FLOOR), t: tb, seed: 70 + j, antennae: 'explore' });
      // Vão para a larva pela frente (do fungo à larva) com comida; voltam por trás sem nada.
      const going = u < .25 || u > .75, egg = (j & 1) && t > EGGS2 + (j === 1 ? .3 : 1.2);
      out.push({ p, y, going, egg });
    }
    return out;
  }
  function drawNurses(ns, back) {
    for (const n of ns) if ((n.y < FLOOR) === back) { A().creature(n.p); if (n.going) food(n.p, n.egg); }
  }
  function c3s02(t, lt, dur) {
    const cam = kf(t, [[t2, [760, FLOOR - 140, 2.1]], [EGGS2 - .5, [820, FLOOR - 120, 2.4]], [EGGS2 + 1, [960, FLOOR - 90, 3.3]], [end('c3s02'), [990, FLOOR - 85, 3.5]]]);
    room(t, cam);
    const ns = nurses2(t, t);
    drawNurses(ns, true);
    larvaHer(LX, 60 + 16 * ease(lt / dur), t);
    drawNurses(ns, false);
    Kit.camEnd();
    Kit.vignette(.2);
  }

  // ---------- c3s03: avanço rápido; a larva cresce, para, vira pupa; contagem de semanas ----------
  const t3 = at('c3s03'), FF = 7, tf = t => t3 + FF * (t - t3);  // fundo 7× mais rápido
  const TOPUPA = rd('c3s03', 0) + 2.7, STILL = TOPUPA - .9, LS = 76;
  function c3s03(t, lt) {
    const cam = kf(t, [[t3, [LX - 30, FLOOR - 95, 2.9]], [TOPUPA, [LX - 10, FLOOR - 80, 3.4]], [rd('c3s03', 1), [LX - 60, FLOOR - 85, 3.2]], [end('c3s03'), [LX - 5, FLOOR - 70, 4.4]]]);
    room(t, cam, { tb: tf(t) });
    const ns = nurses2(t, tf(t), 60);
    drawNurses(ns, true);
    // Larva: cresce no avanço rápido (respira rápido), para em STILL (respirar congelado) e treme; vira pupa em TOPUPA.
    // A pupa fica quieta e, perto do fim, treme cada vez mais (vai nascer).
    const size = lerp(LS, 120, ease(seg(t, t3, STILL))), rot = t < TOPUPA ? .05 * seg(t, STILL, TOPUPA) * Math.sin(TAU * 7 * t) : .03 * seg(t, end('c3s03') - 2.5, end('c3s03')) * Math.sin(TAU * 5 * t);
    swap(t, TOPUPA, LX, rot, () => larvaHer(LX, size, Math.min(tf(t), tf(STILL))), () => A().pupa(LX, FLOOR, HS, t, SEED, 1));
    drawNurses(ns, false);
    Kit.camEnd();
    Kit.vignette(.2);
    const [tx, ty] = toScreen(LX + 20, FLOOR - 150, cam);
    Kit.text('3–4 semanas', tx, ty, 64, P.ink, { k: Math.min(seg(t, rd('c3s03', 0), rd('c3s03', 0) + .4), 1 - seg(t, rd('c3s03', 1) - .3, rd('c3s03', 1))) });
    Kit.text('+ 3–4 semanas', tx, ty, 64, P.ink, { k: seg(t, rd('c3s03', 1), rd('c3s03', 1) + .4) });
  }

  // ---------- c3s04: a pupa se desfaz, ela fica de pé e dá os primeiros passos ----------
  const t4 = BORN, CRACK = t4 + .5, UP = t4 + 1.2, STEPS = rd('c3s04', 1) + .1, S4 = sAt(LX, HS);
  const HK4 = [[STEPS, S4], [end('c3s04') + .6, S4 + 1.5]], HO4 = { start: .9, stop: 0, seed: 41 };
  const FLAKES = Array.from({ length: 6 }, (_, i) => ({ from: [LX - 70 + 26 * i, FLOOR - 40 - 14 * hash(i + 1)], to: [LX - 150 + 60 * i + 40 * hash(i + 2), FLOOR - 4], t0: CRACK + .08 * i, r: 13 + 6 * hash(i + 3) }));
  function pose4(t) {
    const m = travel(t, HK4, HO4), alive = ease(seg(t, UP, UP + 1.1));
    const md = mood(t, [[t4, 'neutral'], [UP + 1.1, 'surprised'], [UP + 2.4, 'neutral']], SEED);
    const p = her({ path: LINE, s: m.s, size: HS, ground: flat, t, alive, moving: m.moving * .7, lean: m.lean + .15 * noise1(43, t * 1.7) * seg(t, STEPS, STEPS + 1), drag: m.drag,
      antennae: 'explore', sq: .12 * spring(t, UP + 1.1, 6, 12), expression: md.expression, blink: md.blink, emote: md.emote });
    return tremble(p, alive, t);
  }
  const s4 = t => travel(t, HK4, HO4).s;
  function c3s04(t) {
    const hx = HS * s4(t) - 3000;
    const cam = kf(t, [[t4, [LX - 5, FLOOR - 70, 4.4]], [UP + 1, [LX + 10, FLOOR - 66, 4.2]], [STEPS, [LX + 20, FLOOR - 66, 4.2]]]);
    cam[0] += .8 * Math.max(0, hx - LX);
    room(t, cam);
    // Jardineira à esquerda: espera, chega perto e toca a recém-nascida.
    const tapT = rd('c3s04', 0) + 3;
    const nm = travel(t, [[tapT - 1.2, sAt(LX - 300, JS)], [tapT, sAt(LX - 175, JS)]], { start: .4, stop: .6, seed: 63 });
    A().creature(nurse(t, 0, 1, 63, ease(seg(t, tapT, tapT + .4)) * (1 - ease(seg(t, tapT + 2.2, tapT + 2.6))), nm));
    // Cascas da pupa: saltam no tremor, caem num arco e ficam no chão.
    for (const f of FLAKES) if (t >= f.t0) { const [x, y] = arcPt(f.from, f.to, 40, easeIn(seg(t, f.t0, f.t0 + .5))); const rot = 3 * hash(f.r) + 4 * seg(t, f.t0, f.t0 + .5); Kit.ellipse(x, y, f.r + 2.5, .55 * f.r + 2.5, P.line, { rot }); Kit.ellipse(x, y, f.r, .55 * f.r, BROOD, { rot }); }
    // A pupa treme mais e mais, a pele se rompe (cascas) e sai ela, ainda dobrada; depois se ergue.
    swap(t, CRACK, LX, t < CRACK ? .05 * Math.sin(TAU * 6 * t) : 0, () => A().pupa(LX, FLOOR, HS, t, SEED, 1), () => A().creature(pose4(t), LOOK));
    if (t > STEPS) dust(SPECS.ant, s4, pose4, t, SEED);
    Kit.camEnd();
    Kit.vignette(.2);
    const p = pose4(t), [tx, ty] = toScreen(p.head.x + 10, p.head.y - 110, cam);
    Kit.text('cabeça > 2 mm', tx, ty, 58, P.ink, { k: Math.min(seg(t, rd('c3s04', 0) + 3.4, rd('c3s04', 0) + 3.8), 1 - seg(t, STEPS - .3, STEPS)) });
  }

  // ---------- c3s04b: close extremo da cabeça; mandíbulas abrem e fecham; brilho nos dentes ----------
  const t5 = at('c3s04b'), HC = 1900, SNAP = rd('c3s04b', 1) + .5, GLINTS = [t5 + 1.4, rd('c3s04b', 0) + 2.6, rd('c3s04b', 0) + 4.6, SNAP + .35];
  function jaw5(t) {
    if (t < SNAP) return .5 - .5 * Math.cos(TAU * (t - t5) / 3.2);
    return clamp(.9 * (1 - anticipate(t, SNAP, .18, .25)) + .1);  // abre mais, fecha de vez e assenta
  }
  // Ponto k (0..1) ao longo do fio da mandíbula de p (vista lateral, virada para a direita).
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
  function c3s04b(t, lt) {
    // Fundo: a câmara de perto, esmaecida por trás da cabeça (irmãs passam).
    const bc = [BX + 60 + 30 * lt, FLOOR - 120, 3.2];
    room(t, bc, { brood: false }); Kit.camEnd();
    Kit.flash(.3, P.shade);
    const jaw = jaw5(t), sn = anticipate(t, SNAP, .18, .25);
    let p = her({ path: LINE, s: sAt(0, HC), size: HC, ground: () => 1500, t, moving: 0, antennae: 'explore' });
    p = nod(p, 0, -.004 * sn, -.06 * sn + .07 * noise1(44, t * .45));
    // Câmera: abre na cabeça inteira e avança até a mandíbula (os dentes) ao longo do plano.
    const k = ease(seg(t, t5 + .5, SNAP - .3)), z = lerp(.88, 1.3, k) + .05 * ease(seg(t, SNAP, end('c3s04b'))), cx = p.head.x + lerp(-60, 130, k), cy = p.head.y + lerp(90, 110, k);
    Kit.cam(cx, cy, z, 0, hand(t));
    A().creature(p, { ...LOOK, jaws: jaw });
    for (const g0 of GLINTS) {
      const k = seg(t, g0, g0 + .7);
      if (k <= 0 || k >= 1) continue;
      const e = easeOut(k), [x, y] = edge(p, jaw, e), r = 95 * Math.sin(Math.PI * k);
      Kit.line(Array.from({ length: 6 }, (_, i) => edge(p, jaw, Math.max(0, e - .3 + .06 * i))), P.cloud, 16, { alpha: .85 * Math.sin(Math.PI * k) });
      sparkle(x, y, r, P.cloud);
    }
    Kit.camEnd();
    Kit.vignette(.3);
  }

  // ---------- c3s05: fila de perfil: jardineira, ela (média) e a soldada; tamanhos ----------
  const t6 = at('c3s05'), SS = 280, MX = 700, HX5 = 930, SX = 1230;
  const LINE5 = [[SPECS.minima, JS, MX, 66], [SPECS.ant, HS, HX5, SEED], [SPECS.soldier, SS, SX, 67]];
  function lineup(t) {
    return LINE5.map(([spec, sz, x, sd], i) => {
      const m = travel(t, [[t6, sAt(x - 120, sz)], [t6 + 1.6 + .3 * i, sAt(x, sz)]], { start: .3, stop: .6, seed: sd });
      const o = { path: LINE, s: m.s, size: sz, ground: flat, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'explore' };
      return sd === SEED ? her(o) : creaturePose(spec, { ...o, seed: sd });
    });
  }
  function c3s05(t) {
    const r1 = rd('c3s05', 1), r2 = rd('c3s05', 2);
    const cam = kf(t, [[t6, [960, FLOOR - 165, 1.9]], [r1 - .1, [960, FLOOR - 160, 2]], [r1 + .9, [MX + 20, FLOOR - 62, 4.4]], [r2 - .2, [MX + 30, FLOOR - 64, 4.5]], [r2 + .8, [SX + 10, FLOOR - 110, 3]], [end('c3s05'), [980, FLOOR - 150, 2.1]]]);
    room(t, cam, { brood: false, back: false });
    const [mp, hp, sp] = lineup(t), jw = clamp(anticipate(t, r2 + .4, .15, .3));
    A().creature(mp, { jaws: .3 + .2 * noise1(68, t) });
    A().creature(hp, LOOK);
    A().creature(sp, { jaws: .15 + .85 * jw });
    Kit.camEnd();
    Kit.vignette(.2);
    const lab = (p, str, k, dy) => { const [x, y] = toScreen(p.head.x, p.head.y - dy, cam); Kit.text(str, x, y, 60, P.ink, { k }); };
    lab(mp, '~1 mm', seg(t, r1 + .6, r1 + 1), .5 * JS);
    lab(sp, '> 3 mm', seg(t, r2 + .5, r2 + .9), .42 * SS);
  }

  // ---------- c3s06: a soldada vira e avança; ela recua num susto ----------
  const t7 = at('c3s06'), STEP = rd('c3s06', 0) + .7, FL = STEP + .45, SNAP6 = rd('c3s06', 1) + .2, HX6 = 880, SX6 = 1300;
  const sm6 = t => travel(t, [[STEP, sAtL(SX6, SS)], [STEP + .55, sAtL(SX6 - 110, SS)]], { start: .2, stop: .5, seed: 67 });
  const soldier6 = (t, o = {}) => { const m = sm6(t); return creaturePose(SPECS.soldier, { path: LINE_L, s: m.s, size: SS, ground: flat, t, seed: 67, moving: m.moving, lean: m.lean, drag: m.drag, ...o }); };
  function c3s06(t, lt) {
    const cam = kf(t, [[t7, [1060, FLOOR - 140, 2.6]], [STEP + .8, [1010, FLOOR - 130, 2.75]], [SNAP6, [980, FLOOR - 125, 2.8]], [end('c3s06'), [900, FLOOR - 105, 3.4]]]);
    room(t, cam, { brood: false });
    // Soldada: virada para a frente (direita) como na fila, gira para ela e dá um passo, mandíbulas abertas.
    const sm = sm6(t);
    const jaw = .15 + .85 * clamp(anticipate(t, STEP - .1, .12, .3)) * (1 - .8 * Math.max(0, Math.sin(TAU * 1.6 * Math.max(0, t - SNAP6))) * (t < SNAP6 + 1.25 ? 1 : 0));
    const sp = soldier6(t, { antennae: 'explore', sq: .08 * spring(t, STEP + .55, 7, 16) });
    const turn = ease(seg(lt, .25, .6)), sx = -1 + 2 * turn, sxk = Math.sign(sx || 1) * Math.max(.18, Math.abs(sx)), mid = (sp.spine[0].x + sp.spine.at(-1).x) / 2, g = c();
    // Ela: o susto vem depois do passo (flinch com antecipação, emote '!'), recua e fica de antenas baixas.
    const hm = travel(t, [[FL, sAt(HX6, HS)], [FL + .5, sAt(HX6 - 70, HS)]], { start: .05, stop: .6, seed: 45 });
    const fl = anticipate(t, FL, .05, .3, SPRING.bouncy) * (1 - ease(seg(t, FL + .9, FL + 1.6)));
    const md = mood(t, [[t7, 'neutral'], [FL, 'scared', '!'], [SNAP6 + .1, 'scared']], SEED);
    let hp = her({ path: LINE, s: hm.s, size: HS, ground: flat, t, facing: 1, moving: hm.moving, flinch: fl, antennae: 'explore', expression: md.expression, blink: md.blink, sq: md.sq });
    const low = ease(seg(t, SNAP6 + .2, SNAP6 + .8));
    hp = nod(hp, -.01 * low, .01 * low, .25 * low);
    A().creature(hp, LOOK);
    // O '!' do motor sai do tamanho da cabeça (pequeno demais aqui): o mesmo emote, maior, sobre a cabeça.
    if (md.emote) Kit.text('!', hp.head.x + 20, hp.head.y - .38 * HS, .42 * HS, P.ink, { k: Math.min(clamp(md.emote.k), md.emote.a) });
    g.save(); g.translate(mid, 0); g.scale(sxk, 1); g.translate(-mid, 0);
    A().creature(sp, { jaws: jaw });
    g.restore();
    Kit.camEnd();
    Kit.vignette(.2);
  }

  // ---------- c3s07: túnel que se divide em três; ela hesita e entra no de baixo ----------
  const t8 = at('c3s07'), FX = 1100, FY = 560, H7 = 200;
  const BR7 = [
    [[FX, FY], [1300, 450], [1500, 260], [1680, -300]],
    [[FX, FY], [1450, FY - 10], [1900, FY + 10], [2600, FY]],
    [[FX, FY], [1290, 660], [1480, 850], [1640, 1100], [1720, 1600]],
  ].map(makePath);
  const MAIN7 = makePath([[-1400, FY], [FX, FY]]), PATH7 = makePath([[-1400, FY], [-700, FY], [0, FY], [600, FY], [FX - 50, FY + 5], [1290, 660], [1480, 850], [1640, 1100], [1720, 1600]]);  // pontos espaçados por igual: Catmull-Rom não dá laço
  const ARRIVE = rd('c3s07', 0) + 1.6, GO = rd('c3s07', 1) + 1.4, SF = (1400 + FX - 150) / H7;
  const HK7 = [[t8, SF - 3.2], [ARRIVE, SF], [GO, SF], [end('c3s07') + 1, SF + 4.2]], HO7 = { start: .5, stop: .7, seed: 47 };
  const LOOKS7 = [[ARRIVE + .3, -.45], [ARRIVE + 1.3, 0], [ARRIVE + 2.3, .5], [ARRIVE + 3.1, .45]];  // olhar: alto, reto, baixo
  function pose7(t) {
    const m = travel(t, HK7, HO7);
    const p = her({ path: PATH7, s: m.s, size: H7, t, moving: m.moving, lean: m.lean, drag: m.drag, antennae: 'explore' });
    const hz = seg(t, ARRIVE, GO), look = t < ARRIVE + .3 ? 0 : kf(t, LOOKS7) * (1 - ease(seg(t, GO - .2, GO + .3)));
    const sway = hz * (1 - ease(seg(t, GO, GO + .5)));
    return nod(p, .01 * sway, 0, .7 * look * hz + .1 * Math.sin(TAU * .9 * t) * sway);
  }
  function c3s07(t, lt) {
    const p = pose7(t), cx = Math.min(p.spine[0].x + 230, 1350), cy = lerp(FY - 30, p.spine[0].y - 40, ease(seg(t, GO, GO + 1.5)) * .9);
    const z = kf(t, [[t8, 2.7], [ARRIVE, 2.35], [GO, 2.3], [end('c3s07'), 2.6]]), cam = [cx, cy, z], [x0, x1] = view(cx, z);
    Kit.cam(cx, cy, z, 0, hand(t));
    A().soil(x0, cy - H / 2 / z - 100, x1 - x0, H / z + 200, 29);
    A().roots(1500, -300, 520, 1, 14);
    A().tunnel(MAIN7, 96);
    for (const b of BR7) A().tunnel(b, 96);
    Kit.ellipse(FX, FY, 70, 58, mixCol(P.wood, P.ink, .15));
    grains(t, FX - 300, FX + 400, FY - 60, FY + 40, 3, 37);
    // Irmãs: uma desce pelo túnel do alto e segue para o do meio; outra sai do de baixo para trás de nós.
    for (const [i, path] of [makePath([[1680, -300], [1500, 260], [1300, 450], [FX, FY], [1450, FY - 10], [1900, FY + 10], [2600, FY]]), makePath([[1720, 1600], [1640, 1100], [1480, 850], [1290, 660], [FX, FY], [600, FY], [0, FY], [-700, FY]])].entries()) {
      const d = frac(.035 * t + .5 * i) * path.length, sz = 170;
      const q = path.at(d);
      if (Math.hypot(q.x - p.spine[0].x, q.y - p.spine[0].y) > 260) A().creature(creaturePose(SPECS.ant, { path, s: d / sz, size: sz, t, seed: 90 + i }));
    }
    A().creature(p, LOOK);
    Kit.camEnd();
    Kit.vignette(.25);
  }

  shotsById({ c3s01, c3s02, c3s03, c3s04, c3s04b, c3s05, c3s06, c3s07 });
})();
