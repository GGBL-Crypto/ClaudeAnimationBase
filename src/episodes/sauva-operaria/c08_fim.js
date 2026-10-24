// c08_fim.js: capítulo 8 de sauva-operaria (O fim), planos c8s01–c8s06.
// Íris abre na câmara em luz baixa: ela para, deita e as antenas param; duas irmãs a puxam pelo túnel até o lixo;
// a raiz desce até a câmara de lixo e a câmera sobe por ela até a copa ("11 m"); no jardim as formigas cortam a raiz,
// no lixo outra se ramifica; uma folha cai da copa na trilha e uma operária a leva; a rainha põe um ovo novo
// ("10 a 15 anos"); o corte do solo de c1s01 recua até o gramado ao entardecer, alados sobem e a íris fecha.
(() => {
  const P = STYLE.palette, A = () => NatureArt;
  // Protagonista: mesmas constantes em todos os capítulos (copie sem mudar).
  const at = id => PROJECT.storyboard.find(s => s.id === id).start;
  const SEED = 7, LOOK = { color: P.sauvaHero, dark: mixCol(P.sauvaHero, P.ink, .35) };
  const BORN = at('c3s04'), DIES = at('c8s01'), age = t => clamp((t - BORN) / (DIES - BORN));
  const her = o => creaturePose(SPECS.ant, { seed: SEED, age: age(o.t), ...o });
  // Início da fala j do plano: os momentos-chave caem aqui.
  const rd = (id, j) => PROJECT.storyboard.find(s => s.id === id).reads[j].start;
  // A vida acaba devagar (GUIA): de 1 a 0 entre 3 e 6 s depois do corte de c8s01.
  const alive = t => 1 - ease(seg(t, at('c8s01') + 3, at('c8s01') + 6));

  // ---------- ajudas do capítulo (de c01 e c04) ----------
  const hand = t => ({ t, k: .6, seed: 5 });
  const c = animationEngine.context;
  const DUSK = () => Kit.gradient(mixCol(P.skyTop, P.wingAccent, .35), mixCol(P.skyLow, P.sun, .5));
  const EARTH = mixCol(P.wood, P.ground, .2);
  const SOIL = mixCol(P.wood, P.ink, .35), PEB = mixCol(P.wood, P.ink, .5), CAVE = mixCol(P.wood, P.ink, .15), RIM = mixCol(P.wood, P.ink, .6);
  const HEAP = mixCol(P.wood, P.ink, .45), ROOT = mixCol(P.wood, P.cream, .45);
  const REFUSE = [mixCol(P.wood, P.ink, .6), mixCol(P.stone, P.ink, .35), mixCol(P.leafDk, P.ink, .55), mixCol(P.cream, P.wood, .5)];
  function layer(cx, cy, zoom, f, t, draw) {
    const lx = lerp(960, cx, f);
    Kit.cam(lx, cy, zoom, 0, hand(t)); draw(lx - W / 2 / zoom - 200, lx + W / 2 / zoom + 200); Kit.camEnd();
  }
  const view = (cx, zoom) => [cx - W / 2 / zoom - 80, cx + W / 2 / zoom + 80];
  const toScreen = (x, y, [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
  const line = (x, y, dir = 1) => makePath([[x - dir * 1000, y], [x + dir * 1000, y]]);  // s = 1000 / size põe o ser em x
  // Capim entre x0 e x1 sobre gy; odd = 0/1 desenha só metade (atrás / à frente dos seres).
  function grass(t, x0, x1, gy, step, h0, h1, odd = null, push = [], skip = null) {
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      if (odd !== null && (k & 1) !== odd) continue;
      const x = k * step + .5 * step * hash(k + 3), y = gy(x) + 3;
      if (skip && skip(x)) continue;
      A().blade(x, y, h0 + (h1 - h0) * hash(k + 7), bladeBend(t, x, y, push, 60, 3), k & 1 ? P.grass : P.grassDk);
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
  // Grão de terra que cai do teto de tempos em tempos (o grains() de c04).
  function grains(t, x0, x1, top, floor, n, seed, r = 4) {
    for (let i = 0; i < n; i++) {
      const per = 2.6 + 1.5 * hash(seed + i), u = frac(t / per + hash(seed + i + 9)), x = lerp(x0, x1, hash(seed + i * 3 + Math.floor(t / per + hash(seed + i + 9))));
      if (u < .35) Kit.ellipse(x, lerp(top, floor, u / .35), r, r, mixCol(P.wood, P.cream, .25));
    }
  }
  // Terra em ladrilhos fixos no mundo (o soil() de c04): as pedrinhas não nadam quando a câmera anda.
  function soil(x0, x1, y0, y1, tile, sc, z, seed) {
    c.fillStyle = SOIL; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    const n = z < .5 ? 14 : 40;
    for (let i = Math.floor(x0 / tile); i * tile < x1; i++) for (let j = Math.floor(y0 / tile); j * tile < y1; j++) for (let k = 0; k < n; k++) {
      const h = seed + i * 73.1 + j * 19.7 + k * 3.3, px = (i + hash(h)) * tile, py = (j + hash(h + .5)) * tile, r = (3 + 7 * hash(h + .9)) * sc;
      if (py < y0 + r || r * z < 1) continue;
      c.beginPath(); c.ellipse(px, py, r * 1.3, r, hash(h + .2) * 3, 0, TAU); c.fillStyle = k % 3 ? PEB : P.stone; c.fill();
    }
  }
  // Fundo de uma câmara vista de dentro, em close (o cave() de c04): terra, a cavidade e o chão reto em fy.
  function cave(cx, cy, z, fy, seed) {
    const [x0, x1] = view(cx, z), y0 = cy - H / 2 / z - 80, y1 = cy + H / 2 / z + 80;
    soil(x0, x1, y0, y1, 900, 3, z, seed);
    A().chamber(cx * .3 + 840, fy + 300, 3400, 1500, seed);
    for (let i = Math.floor(x0 / 260); i * 260 < x1; i++) { const x = (i + hash(i + seed)) * 260, y = lerp(y0 + 60, fy - 60, hash(i * 1.7 + seed)), r = 20 + 50 * hash(i * 2.3 + seed); Kit.ellipse(x, y, 1.4 * r, r, RIM, { alpha: .18, rot: hash(i + 4) * 3 }); }
    const fl = []; for (let x = x0; x <= x1 + 40; x += 40) fl.push([x, fy + 6 * Math.sin(x * .01 + seed)]);
    Kit.poly([...fl, [x1 + 40, y1 + 200], [x0, y1 + 200]], mixCol(P.wood, P.ink, .3), { stroke: false });
    Kit.line(fl, RIM, 10);
  }
  // Raiz grossa ao longo de path (do tronco à ponta) até o comprimento len, afinando de w0 a w1: pálida com borda
  // escura, como roots().
  function root(path, len, w0, w1, sway = 0) {
    const pts = []; for (let d = 0; d < len; d += 40) { const q = path.at(d); pts.push([q.x + sway * d / len, q.y]); }
    const q = path.at(len); pts.push([q.x + sway, q.y]);
    const n = pts.length - 1;
    for (const [col, add] of [[P.line, 6], [ROOT, 0]]) for (let i = 0; i < n; i++) Kit.line([pts[i], pts[i + 1]], col, lerp(w0, w1, i / n) + add);
    return pts;
  }
  // Nutrientes: contas claras que andam por path (do ninho para a árvore) a v px/s; k = 0..1 entra e sai.
  function beads(path, t, n, v, r, k, seed) {
    if (k <= 0) return;
    for (let i = 0; i < n; i++) { const q = path.at(frac(v * t / path.length + (i + .4 * hash(seed + i)) / n) * path.length); Kit.ellipse(q.x, q.y, r, r, P.sun, { stroke: true, alpha: k }); }
  }
  // Desvio da cabeça em relação ao ponto do caminho em s, em BL (para encostar uma formiga na outra).
  const HEADK = (() => { const q = creaturePose(SPECS.ant, { path: makePath([[0, 0], [1000, 0]]), s: 5, size: 100, ground: () => 0, t: 0, moving: 0 }); return (q.head.x - 500) / 100; })();
  const loopPath = (cx, cy, rx, ry, dir = 1) => makePath(Array.from({ length: 33 }, (_, k) => { const a = Math.PI / 2 - dir * k * TAU / 32; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }));
  const ALATE = { ...SPECS.alate, flyer: { ...SPECS.alate.flyer, freq: 5 } };

  // ---------- c8s01: íris abre na câmara em luz baixa; ela tenta erguer-se, deita, as antenas param ----------
  const t1 = at('c8s01'), FL1 = 860, HS1 = 560, HX1 = 760, SAY1 = rd('c8s01', 1);
  const SIS1 = makePath([[9000, 0], [-3000, 0]]), SS1 = 470;
  function hero1(t) {
    const al = alive(t), up = Math.sin(Math.PI * seg(t, t1 + .7, t1 + 2)), droop = ease(seg(t, t1 + 2, t1 + 3.3)) * al;
    const p = her({ path: line(HX1, FL1), s: 1000 / HS1, size: HS1, ground: () => FL1, t, moving: 0, alive: al, antennae: 'explore', blink: al < .35 ? 1 : undefined, sq: .04 * up });
    return nod(p, .02 * up, -.03 * up + .03 * droop, -.25 * up + .3 * droop);
  }
  function c8s01(t, lt) {
    const k = ease(seg(t, SAY1 + .9, SAY1 + 3.4)), cam = [lerp(HX1 + 120, 1480, k), lerp(FL1 - 240, FL1 - 210, k), lerp(1.35, .88, k) + .04 * ease(lt / 10)];
    const [x0, x1] = view(cam[0], cam[2]);
    Kit.cam(...cam, 0, hand(t));
    cave(cam[0], cam[1], cam[2], FL1, 29);
    grains(t, x0, x1, 0, FL1, 4, 91, 7);
    // A cria do canto da câmara (ovo, larva, pupa) e a jardineira que cuida dela: a câmera chega nela em "ovo, larva, pupa".
    A().egg(1900, FL1, 22, t, 94);
    A().larva(2080, FL1, 170, t, 95, -1);
    A().pupa(2380, FL1, 380, t, 96, -1);
    { const w = .5 + .5 * Math.sin(TAU * .8 * t); A().creature(nod(creaturePose(SPECS.minima, { path: line(2230, FL1, -1), s: 1000 / 250, size: 250, ground: () => FL1, t, seed: 97, moving: 0, antennae: 'tap' }), .02 * w, .05 * w, .4 * w)); }
    // Uma irmã chega, para junto da cabeça dela e a toca com as antenas.
    const hp = hero1(t), ms = travel(t, [[t1 + 5.4, (9000 - 2700) / SS1], [t1 + 8.2, (9000 - hp.head.x - .25 * HS1 - HEADK * SS1) / SS1]], { start: .3, stop: .7, seed: 98 });
    const sp = creaturePose(SPECS.ant, { path: SIS1, s: ms.s, size: SS1, ground: () => FL1 - 30, t, seed: 98, moving: ms.moving, lean: ms.lean, antennae: ms.moving > .3 ? 'explore' : 'tap' });
    A().creature(nod(sp, 0, .03 * (1 - ms.moving), .25 * (1 - ms.moving)));
    A().creature(hp, LOOK);
    Kit.camEnd();
    Kit.flash(.3, P.shade); Kit.vignette(.35);
    const [ix, iy] = toScreen(hp.head.x, hp.head.y, cam);
    Kit.iris(ix, iy, 2300 * ease(seg(lt, .1, 1.8)));
  }

  // ---------- c8s02: duas irmãs puxam o corpo pelo túnel até a câmara de lixo ----------
  const t2 = at('c8s02'), HS2 = 430, SS2 = 400, X02 = 1300, XE2 = 2950, PU2 = 4.9, F2 = 7 / PU2;
  const fl2 = x => 900 - 300 * Math.exp(-(((x - 3750) / 650) ** 2)) + 5 * Math.sin(x * .01);
  const top2 = x => 900 - Math.max(430 + 25 * Math.sin(x * .004 + 1), 1450 * Math.sqrt(Math.max(0, 1 - ((x - 3750) / 1250) ** 2)));
  const SP2 = makePath([[9000, 0], [-3000, 0]]);
  // A cabeça dela anda aos puxões (velocidade 0 entre um e outro) e para no pé do monte.
  const hx2 = t => { const u = clamp(t - t2, 0, PU2); return X02 + (XE2 - X02) / PU2 * (u - Math.sin(TAU * F2 * u) / (TAU * F2)); };
  // Irmã que puxa andando de ré (s diminui: as patas andam para trás); a cabeça encosta em tx.
  function puller(t, tx, gy, seed, mv) {
    const p = creaturePose(SPECS.ant, { path: SP2, s: (9000 - tx - HEADK * SS2) / SS2, size: SS2, ground: gy, t, seed, moving: mv, antennae: mv > .3 ? 'explore' : 'tap' });
    return nod(p, .02, .06 * mv + .02, .35 * mv + .1);
  }
  function c8s02(t, lt) {
    const hx = hx2(t), mv = 1 - ease(seg(t, t2 + PU2 - .2, t2 + PU2 + .2)), r = ease(seg(t, t2 + 3.6, t2 + 6.2));
    const cam = [lerp(hx + 200, 3150, r), lerp(720, 620, r), lerp(1.25, .9, r)], [x0, x1] = view(cam[0], cam[2]), y0 = cam[1] - H / 2 / cam[2] - 80, y1 = cam[1] + H / 2 / cam[2] + 80;
    Kit.cam(...cam, 0, hand(t));
    soil(x0, x1, y0, y1, 900, 3, cam[2], 13);
    for (let k = Math.floor(x0 / 1400); k * 1400 < x1; k++) { const rx = k * 1400 + 500 * hash(k + 5); if (rx < 2300) A().roots(rx, top2(rx) - 700, 560, 1, k + 20); }
    const top = [], bot = []; for (let x = x0; x <= x1 + 40; x += 40) { top.push([x, top2(x)]); bot.push([x, 940]); }
    Kit.poly([...top, ...bot.slice().reverse()], CAVE, { stroke: false });
    Kit.line(top, RIM, 18);
    // Chão e monte de lixo (como c4s02): restos escuros, fungo velho pardo, pedaços de folha secos.
    const fp = []; for (let x = x0; x <= x1 + 40; x += 40) fp.push([x, fl2(x)]);
    Kit.poly([...fp, [x1 + 40, y1 + 200], [x0, y1 + 200]], HEAP, { stroke: false });
    Kit.line(fp, RIM, 14);
    for (let k = Math.max(Math.floor(x0 / 37), 70); k * 37 < x1; k++) { const x = k * 37 + 30 * hash(k + 1), y = lerp(fl2(x) + 14, 1000, hash(k + 2) ** 2), r = 6 + 12 * hash(k + 3); Kit.ellipse(x, y, r, .8 * r, REFUSE[k % 4], { rot: hash(k + 4) * 3 }); }
    for (let i = 0; i < 8; i++) { const x = 3700 - 200 + 400 * hash(i + 80), r = 36 + 30 * hash(i + 81), y = fl2(x) + 10 - .6 * r * hash(i + 82); Kit.ellipse(x, y, r + 4, .8 * r + 4, P.line); Kit.ellipse(x, y, r, .8 * r, i % 3 ? mixCol(P.cream, P.wood, .55) : mixCol(P.stone, P.wood, .5)); Kit.ellipse(x + .3 * r, y, .15 * r, .12 * r, mixCol(P.wood, P.ink, .4)); }
    [[-150, -.5, 230, P.wood], [20, .4, 200, mixCol(P.leafDk, P.wood, .5)], [170, -.2, 220, mixCol(P.leaf, P.wood, .6)]].forEach(([dx, a, w, col], i) => A().leafPiece(4250 + dx, fl2(4250 + dx) - 24 - 18 * i, w, .45 * w, a + .04 * Math.sin(t * 1.3 + i), col));
    grains(t, x0, x1, top2(cam[0]) + 20, 900, 4, 61, 7);
    // Irmã do lixo trabalhando no alto do monte (vida de fundo).
    { const wk = .5 + .5 * Math.sin(TAU * .7 * t); A().creature(nod(creaturePose(SPECS.ant, { path: line(3950, 0, -1), s: 1000 / 300, size: 300, ground: fl2, t, seed: 63, moving: 0, antennae: 'tap' }), .02 * wk, .05 * wk, .4 * wk), { jaws: wk }); }
    // Ela, deitada e de olhos fechados; as irmãs seguram pela cabeça e pelo pescoço e puxam de ré.
    const hp = her({ path: line(hx - HEADK * HS2, 0), s: 1000 / HS2, size: HS2, ground: x => fl2(x) + 4, t, moving: 0, alive: 0, blink: 1 });
    const jaw = mv > .5 ? .25 : .25 + .4 * ease(seg(t, t2 + PU2, t2 + PU2 + .3));
    A().creature(puller(t, hp.head.x + .3 * HS2, x => fl2(x) - 34, 64, mv), { jaws: jaw });
    A().creature(hp, LOOK);
    A().creature(puller(t, hp.head.x + .12 * HS2, x => fl2(x) + 14, 65, mv), { jaws: jaw });
    Kit.camEnd();
    Kit.flash(.25, P.shade);
  }

  // ---------- c8s03: corte do solo; a raiz desce até o lixo; a câmera sobe por ela até a copa ("11 m") ----------
  const t3 = at('c8s03'), TX3 = -3460, TH3 = 1800, WC3 = [0, 1100, 1000, 420], FC3 = [760, 560, 560, 230];
  const g3 = x => 6 * Math.sin(x * .004 + 1);
  const RP3 = [[TX3 + 40, 30], [TX3 + 300, 250], [TX3 + 900, 460], [-1900, 640], [-1100, 790], [-560, 890], [-230, 1000]];
  const ROOT3 = makePath(RP3), NUT3 = makePath([...RP3.slice().reverse(), [TX3 + 10, -300], [TX3, -1050]]);
  const TUN3 = [[[0, 10], [60, 200], [260, 380], [560, 500]], [[260, 380], [120, 560], [-40, 700]], [[1000, 520], [1300, 700], [1500, 900]]].map(makePath);
  const RULE3 = rd('c8s03', 1) + 2.3, CAM3 = [[t3, [-120, 980, 1.05]], [rd('c8s03', 1) - .3, [-330, 960, .95]], [RULE3 - .2, [-1550, 480, .4]], [t3 + 7.7, [-1700, 430, .38]], [t3 + 9.8, [TX3, -880, .55]], [t3 + 10.8, [TX3, -1050, .6]]];
  const MOUND3 = []; for (let x = -260; x <= 260; x += 26) MOUND3.push([x, g3(x) - 70 * Math.exp(-((x / 130) ** 2))]);
  function c8s03(t) {
    const cam = kf(t, CAM3), [cx, cy, z] = cam, [x0, x1] = view(cx, z), y0 = cy - H / 2 / z - 80, y1 = cy + H / 2 / z + 80;
    DUSK();
    layer(cx, cy, z, .1, t, () => { A().cloud(-1800 + 5 * t - 2600, -900, 1.4, 1); A().cloud(-300 + 4 * t - 2100, -600, 1.1, 2); });
    layer(cx, cy, z, .4, t, (a, b) => {
      const hill = x => -110 + 26 * Math.sin(x * .0035 + 2);
      for (let k = Math.floor(a / 220); k * 220 < b; k++) if (hash(k + 90) < .5) { const x = k * 220 + 80 * hash(k + 91); A().tree(x, hill(x) + 10, 260 + 160 * hash(k + 92), .05 * wind(t, x), k + 50, .3); }
      A().ground(hill, a, b, mixCol(P.leafDk, P.wingAccent, .2));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g3, x0, x1);
    if (y1 > 20) {
      soil(x0, x1, Math.max(y0, 20), y1, 700, 1.2, z, 31);
      for (const p of TUN3) A().tunnel(p, 46);
      A().chamber(...WC3, 4, 1);
      A().chamber(...FC3, 5);
      A().fungus(FC3[0], FC3[1], 420, 170, t, 6);
      A().roots(TX3, 24, 520, 1, 5); A().roots(1700, 24, 380, 1, 8);
      // A raiz que chega ao lixo (a ponta mexe devagar) e ela, pequena, no alto do monte.
      root(ROOT3, ROOT3.length, 60, 22, 10 * noise1(33, t * .5));
      A().creature(her({ path: line(110, 0), s: 1000 / 120, size: 120, ground: x => 1100 - .45 * 420 * (1 - (x / 420) ** 2) + 4, t, moving: 0, alive: 0, blink: 1 }), LOOK);
      grains(t, -400, 400, 700, 1060, 3, 41, 5);
      TUN3.forEach((p, i) => { for (const a of crowd(p, t, 3, 70 + i, { speed: 30, spacing: p.length / 3, carryEvery: 2, sizeVar: .1 })) { const sz = 34 * a.size; A().creature(creaturePose(SPECS.ant, { path: p, s: a.s / sz, size: sz, t, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null })); } });
      // Subsolo em luz baixa (como c4), clareando enquanto a câmera sobe.
      Kit.poly([[x0, 20], [x1, 20], [x1, y1], [x0, y1]], P.shade, { stroke: false, alpha: .25 * (1 - seg(-cy, -900, 300)) });
    }
    Kit.poly(MOUND3, EARTH, { smooth: true, weight: 4 }); Kit.ellipse(0, g3(0) - 8, 20, 7, P.line);
    A().tree(TX3, g3(TX3) + 10, TH3, .04 * wind(t, TX3), 4);
    grass(t, x0, x1, g3, Math.max(18, 18 / z), 16, 34, null, [], x => Math.abs(x) < 240);
    // Nutrientes do lixo sobem pela raiz e pelo tronco.
    beads(NUT3, t, 22, 420, 17, ease(seg(t, rd('c8s03', 1) - .6, rd('c8s03', 1) + .6)), 37);
    // Régua na superfície: do ninho à árvore.
    const g = ease(seg(t, RULE3 - .5, RULE3 + .3)), xr = lerp(0, TX3, g), w = 7 / z;
    if (g > 0) {
      Kit.line([[0, -70], [xr, -70]], P.line, w);
      Kit.line([[0, -130], [0, -10]], P.line, w);
      if (g >= 1) Kit.line([[TX3, -130], [TX3, -10]], P.line, w);
    }
    Kit.camEnd();
    const [tx, ty] = toScreen(TX3 / 2, -230, cam);
    Kit.text('11 m', tx, ty, 84, P.ink, { k: Math.min(seg(t, RULE3 + .2, RULE3 + .6), 1 - seg(t, t3 + 8.2, t3 + 8.6)) });
  }

  // ---------- c8s03b: no jardim, as formigas cortam a raiz; no lixo, outra se ramifica livre ----------
  const t3b = at('c8s03b'), FCB = [1150, 620, 1900, 600], WCB = [1100, 2050, 1900, 650], ASB = 360;
  const floorOf = ([x, y, w, h]) => gx => Math.min(y, y - h / 2 + .96 * h / 2 * Math.sqrt(Math.max(0, 1 - ((gx - x) / (w / 2)) ** 2)));
  const gFB = floorOf(FCB);
  const RB = makePath([[1560, -700], [1420, -320], [1300, 60], [1250, 300], [1236, 515]]), CUTL = RB.length - 170;
  const NOTE_B = t3b + 1.1, CUTB = rd('c8s03b', 0) + 2.6, PANB = rd('c8s03b', 1) - .5;
  const MBP = [[-900, 1050], [-300, 1250], [300, 1380], [800, 1420], [940, 1470]], MAINB = makePath(MBP), MAINR = makePath(MBP.slice().reverse());
  const TUNB = makePath([[2000, 560], [2200, 1000], [2050, 1500], [1880, 1820]]);
  // Pedaço cortado: cai, deita no chão e quica.
  function piece(t) {
    const tip = RB.at(RB.length), cut = RB.at(CUTL), u = easeIn(seg(t, CUTB, CUTB + .45)), fy = gFB(tip.x) - 14;
    const cy0 = (tip.y + cut.y) / 2, cyL = fy, bounce = 20 * Math.max(0, Math.sin(Math.PI * seg(t, CUTB + .45, CUTB + .7)));
    const a = lerp(Math.PI / 2 + .1, .15, ease(seg(t, CUTB + .1, CUTB + .55))), x = tip.x + 40 * ease(seg(t, CUTB, CUTB + .55)), y = lerp(cy0, cyL, u) - bounce;
    return [[x - 80 * Math.cos(a), y - 80 * Math.sin(a)], [x + 80 * Math.cos(a), y + 80 * Math.sin(a)]];
  }
  function cutter(t, x, dir, seed, i) {
    const look = ease(seg(t, NOTE_B + .2 * i, NOTE_B + .5 + .2 * i)) * (1 - ease(seg(t, CUTB + .3, CUTB + .8)));
    const chew = t > NOTE_B + .6 && t < CUTB ? .5 + .5 * Math.sin(TAU * 3 * t + i) : 0, after = ease(seg(t, CUTB + .9, CUTB + 1.4)) * (.5 + .5 * Math.sin(TAU * .9 * t + i));
    const p = creaturePose(SPECS.ant, { path: line(x, 0, dir), s: 1000 / ASB, size: ASB, ground: gFB, t, seed, moving: 0, antennae: look > .3 || after > .1 ? 'tap' : 'explore', sq: .03 * chew });
    return { p: nod(p, .05 * look, -.1 * look + .04 * after, -.6 * look + .35 * after), jaws: look > .3 ? chew : .2 + .3 * after };
  }
  function c8s03b(t, lt) {
    const pan = ease(seg(t, PANB, PANB + 1.3)), shake = t < CUTB && t > NOTE_B + .6 ? 5 * Math.sin(TAU * 6 * t) : 0;
    const cam = [lerp(1240, 1100, pan), lerp(380, 1760, pan), lerp(1.15 + .1 * ease(seg(t, t3b, CUTB)), .9, pan) + .06 * ease(seg(t, PANB + 1.3, t3b + 8.9))];
    const [x0, x1] = view(cam[0], cam[2]), y0 = cam[1] - H / 2 / cam[2] - 80, y1 = cam[1] + H / 2 / cam[2] + 80;
    Kit.cam(...cam, 0, hand(t));
    soil(x0, x1, y0, y1, 900, 2, cam[2], 47);
    A().tunnel(TUNB, 90);
    A().chamber(...FCB, 9);
    A().chamber(...WCB, 10, 1);
    A().fungus(560, FCB[1], 640, 320, t, 9);
    // Jardim: a raiz entra pelo teto e desce; as duas cortam; o pedaço cai.
    const grow = lerp(RB.length - 170, RB.length, ease(seg(t, t3b, t3b + 1.4)));
    root(RB, t < CUTB ? grow : CUTL, 46, 30, shake);
    if (t >= CUTB) root(makePath(piece(t)), 160, 30, 26);
    else if (t > NOTE_B + .6) for (let j = 0; j < 3; j++) { const u = frac(1.6 * t + j / 3), q = RB.at(CUTL); Kit.ellipse(q.x + shake + 40 * (j - 1) * u, q.y + 120 * u * u, 5, 5, ROOT, { alpha: 1 - u }); }
    if (t > CUTB + .45) A().dust(RB.at(RB.length).x + 40, gFB(1236) - 4, seg(t, CUTB + .45, CUTB + 1), 11);
    const L = cutter(t, 1075, 1, 141, 0), R = cutter(t, 1400, -1, 142, 1);
    A().creature(L.p, { jaws: L.jaws }); A().creature(R.p, { jaws: R.jaws });
    grains(t, 400, 1900, 80, 600, 3, 71, 6);
    // Lixo: outra raiz desce por fora e se ramifica sobre o monte; ela continua ali; os nutrientes sobem.
    root(MAINB, MAINB.length, 30, 20);
    A().roots(940, 1470, 560, lerp(.3, 1, ease(seg(t, PANB + .4, t3b + 8.6))), 13);
    A().creature(her({ path: line(1300, 0), s: 1000 / 220, size: 220, ground: x => WCB[1] - .45 * WCB[3] * (1 - ((x - WCB[0]) / (.42 * WCB[2])) ** 2) + 6, t, moving: 0, alive: 0, blink: 1 }), LOOK);
    beads(MAINR, t, 7, 260, 10, ease(seg(t, PANB + .8, PANB + 1.6)), 53);
    for (const a of crowd(TUNB, t, 2, 77, { speed: 50, spacing: TUNB.length / 2, carryEvery: 99 })) A().creature(creaturePose(SPECS.ant, { path: TUNB, s: a.s / 110, size: 110, t, seed: a.seed }));
    Kit.camEnd();
    Kit.flash(lerp(.2, .28, pan), P.shade); Kit.flash(.12 * (1 - pan), P.sun); Kit.vignette(.35);
  }

  // ---------- c8s04: uma folha se solta da copa, rodopia até a trilha; uma operária a pega e leva ----------
  const t4 = at('c8s04'), g4 = x => 860 + 12 * Math.sin(x * .004 + 2), TX4 = 420, TH4 = 1500, WS4 = 150;
  const LEAF0 = [TX4 + 300, g4(TX4) - 1050], LAND4 = [1120, g4(1120) - 10], DROP4 = t4 + .8, LANDT = rd('c8s04', 1) + .45, PICK = LANDT + 1.1;
  const T4R = makePath([[4000, 0], [-3000, 0]]), sAt4 = x => (4000 - x - HEADK * WS4) / WS4;  // a cabeça em x
  const BACK4 = makePath([[3000, 0], [-2000, 0]]), FWD4 = makePath([[-2000, 0], [3000, 0]]);
  const SPIN = t => .5 + 2.6 * (t - DROP4) + .8 * Math.sin(TAU * .7 * (t - DROP4)), FLAT = Math.round(SPIN(LANDT) / Math.PI) * Math.PI;
  function leaf4(t) {
    if (t < DROP4) return [LEAF0[0], LEAF0[1], .5 + .35 * Math.sin(TAU * 2.4 * t) * seg(t, t4 + .1, DROP4)];
    const u = seg(t, DROP4, LANDT), f = 1 - ease(seg(u, .8, 1));
    return [lerp(LEAF0[0], LAND4[0], ease(u)) + 150 * Math.sin(TAU * .55 * (t - DROP4)) * f, lerp(LEAF0[1], LAND4[1], u * (.4 + .6 * u)), lerp(FLAT, SPIN(t), f)];
  }
  const KW4 = [[t4 - 2, sAt4(2400)], [PICK - .55, sAt4(LAND4[0] + 70)], [PICK + .35, sAt4(LAND4[0] + 70)], [t4 + 7.5, sAt4(LAND4[0] + 70) + 5.2]];
  function c8s04(t, lt) {
    const [lx, ly, la] = leaf4(t), e = ease(seg(t, DROP4 + .2, LANDT + .3)), go = ease(seg(t, PICK, t4 + 6.6));
    const cam = [lerp(TX4 + 380, LAND4[0] + 60, e) - 260 * go, lerp(LEAF0[1] + 180, LAND4[1] - 150, e), lerp(.85, 1.7, e)], [cx, cy, z] = cam, [x0, x1] = view(cx, z);
    DUSK();
    layer(cx, cy, z, .05, t, () => Kit.ellipse(1700, 560, 90, 90, P.sun));
    layer(cx, cy, z, .1, t, () => { A().cloud(300 + 5 * t - 2700, -300, .9, 1); A().cloud(1500 + 4 * t - 2200, 120, .7, 2); });
    layer(cx, cy, z, .4, t, (a, b) => {
      const hill = x => 700 + 26 * Math.sin(x * .0035 + 2);
      for (let k = Math.floor(a / 140); k * 140 < b; k++) if (hash(k + 90) < .6) { const x = k * 140 + 60 * hash(k + 91); A().tree(x, hill(x) + 10, 110 + 80 * hash(k + 92), .05 * wind(t, x), k + 50, .3); }
      A().ground(hill, a, b, mixCol(P.leafDk, P.wingAccent, .2));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g4, x0, x1);
    A().props(g4, x0, x1, 12, 1.2, 0, 'sf');
    A().tree(TX4, g4(TX4) + 10, TH4, .04 * wind(t, TX4), 4);
    grass(t, x0, x1, g4, 16, 14, 30, 0);
    // Trilha de trás: as irmãs que voltam com folhas e as que vão sem nada.
    for (const a of crowd(BACK4, t, 8, 5, { speed: 70, spacing: 330, carryEvery: 1, sizeVar: .1 })) { const sz = 100 * a.size; A().creature(creaturePose(SPECS.ant, { path: BACK4, s: a.s / sz, size: sz, ground: x => g4(x) - 30, t, seed: a.seed, carry: { w: 1.1, h: .7 } })); }
    for (const a of crowd(FWD4, t, 5, 6, { speed: 85, spacing: 520, carryEvery: 99, sizeVar: .1 })) { const sz = 95 * a.size; A().creature(creaturePose(SPECS.ant, { path: FWD4, s: a.s / sz, size: sz, ground: x => g4(x) - 40, t, seed: a.seed })); }
    // A operária: vem pela trilha, para, baixa a cabeça, pega a folha e segue para o ninho.
    const m = travel(t, KW4, { start: .3, stop: .5, seed: 44 }), low = Math.sin(Math.PI * seg(t, PICK - .4, PICK + .3));
    const wp = nod(creaturePose(SPECS.ant, { path: T4R, s: m.s, size: WS4, ground: g4, t, seed: 44, moving: m.moving, lean: m.lean, drag: m.drag, antennae: m.moving > .3 ? 'explore' : 'tap', carry: t >= PICK ? { w: 1.1, h: .7 } : null, sq: .1 * spring(t, PICK, 7, 16) }), .04 * low, .08 * low, .6 * low);
    if (t < PICK) A().leafPiece(lx, ly, 170, 76, la, P.leaf);
    A().creature(wp);
    if (t > LANDT) A().dust(LAND4[0], g4(LAND4[0]), seg(t, LANDT, LANDT + .6), 21);
    grass(t, x0, x1, g4, 16, 14, 30, 1, [[wp.head.x, wp.head.y + 40]]);
    Kit.camEnd();
  }

  // ---------- c8s05: câmara real; a rainha põe um ovo novo ("10 a 15 anos") ----------
  const t5 = at('c8s05'), FLR = 860, QS = 600, QX = 900, ER = 13, LAY5 = rd('c8s05', 0) + 1.6, LAY5B = LAY5 + 5.2, NUM5 = rd('c8s05', 1) + 1.4;
  const flR = x => FLR - 430 * (1 - Math.sqrt(Math.max(0, 1 - ((x - QX - 150) / 2100) ** 2)));
  const RING_C = loopPath(QX + 260, FLR, 380, 50, -1);
  const PILE5 = Array.from({ length: 8 }, (_, i) => [QX - 520 - 32 * (i % 4) - 16 * Math.floor(i / 4) + 10 * hash(i + 3), 0]).map(([x], i) => [x, flR(x) - 18 * Math.floor(i / 4)]);
  const EGG5 = [QX - 430, flR(QX - 430) + 4];
  function ringer(t, ring, j, n, sz, spec, v) {
    const d = frac(v * t / ring.length + j / n) * ring.length, y = ring.at(d).y;
    return { y, pose: creaturePose(spec, { path: ring, s: d / sz, size: sz, ground: () => FLR + .15 * (y - FLR), t, seed: 110 + j + sz, antennae: 'explore' }) };
  }
  function c8s05(t, lt, dur) {
    const k = ease(seg(t, LAY5 - 1, LAY5 + 3.5)), cam = [lerp(QX - 60, QX - 220, k), lerp(FLR - 190, FLR - 130, k), lerp(1.1, 1.4, k) + .14 * ease(seg(t, LAY5 + 3.5, t5 + dur))];
    const [x0, x1] = view(cam[0], cam[2]), y0 = cam[1] - H / 2 / cam[2] - 80, y1 = cam[1] + H / 2 / cam[2] + 80;
    Kit.cam(...cam, 0, hand(t));
    soil(x0, x1, y0, y1, 900, 3, cam[2], 53);
    A().tunnel(makePath([[2300, -300], [2200, 200], [2150, 500]]), 140);
    A().chamber(QX + 150, FLR, 4200, 860, 7);
    A().fungus(-260, FLR, 600, 330, t, 11);
    A().fungus(2420, FLR, 520, 280, t, 12);
    grains(t, QX - 600, QX + 900, FLR - 760, FLR, 4, 51, 7);
    const ws = [[RING_C, 2, 130, SPECS.minima, 40]].flatMap(([r, n, sz, sp, v]) => Array.from({ length: n }, (_, j) => ringer(t, r, j, n, sz, sp, v)));
    for (const w of ws) if (w.y < FLR) A().creature(w.pose);
    // Jardineira que vem tocar o ovo novo com as antenas.
    const m = travel(t, [[LAY5 + .6, 0], [LAY5 + 2.8, 2.6]], { start: .5, stop: .6, seed: 151 });
    if (t > LAY5 + .5) A().creature(creaturePose(SPECS.minima, { path: makePath([[EGG5[0] - 420, FLR], [EGG5[0] + 600, FLR]]), s: m.s, size: 130, ground: x => flR(x) - 8, t, seed: 152, moving: m.moving, lean: m.lean, antennae: m.moving > .5 ? 'explore' : 'tap' }));
    PILE5.forEach(([x, y], i) => A().egg(x, y, ER, t, 100 + i));
    if (t >= LAY5) A().egg(EGG5[0], EGG5[1], ER * backOut(seg(t, LAY5, LAY5 + .35)), t, 160);
    if (t >= LAY5B) A().egg(EGG5[0] + 34, flR(EGG5[0] + 34) + 4, ER * backOut(seg(t, LAY5B, LAY5B + .35)), t, 161);
    const q = creaturePose(SPECS.queen, { path: line(QX, FLR), s: 1000 / QS, size: QS, ground: () => FLR, t, seed: 3, moving: 0, antennae: 'explore', age: .5, sq: .08 * (spring(t, LAY5, 7, 16) + spring(t, LAY5B, 7, 16)) + .02 * Math.sin(TAU * t / 3.2) });
    A().creature(q, { wings: false, jaws: .25 });
    for (const w of ws) if (w.y >= FLR) A().creature(w.pose);
    Kit.camEnd();
    Kit.vignette(.3);
    const [tx, ty] = toScreen(QX - 120, FLR - 410, cam);
    Kit.text('10 a 15 anos', tx, ty, 76, P.cream, { k: Math.min(seg(t, NUM5, NUM5 + .4), 1 - seg(t, t5 + dur - .5, t5 + dur - .1)) });
  }

  // ---------- c8s06: o corte de c1s01 recua até o gramado ao entardecer; alados sobem; a íris fecha ----------
  // Mesmo gramado, trilha, ninho e árvore da abertura (c1s01), agora ao fim da tarde.
  const g1 = x => 820 + 14 * Math.sin(x * .004 + 1) + 6 * Math.sin(x * .013);
  const NEST1 = 1500, T1 = makePath([[-500, 820], [NEST1 + 20, 820]]), AS1 = 40;
  const TUN1 = [
    [[NEST1, 840], [1470, 1000], [1300, 1180], [1080, 1300], [930, 1385]],
    [[1470, 1000], [1640, 1200], [1720, 1420], [1700, 1620]],
    [[650, 1440], [470, 1560], [390, 1760]],
  ].map(makePath);
  const CH1 = [[860, 1500, 460, 240, 1], [1700, 1700, 330, 180, 2], [390, 1860, 320, 170, 3]];
  const t6 = at('c8s06'), FLY6 = rd('c8s06', 2) + 2.2, IRIS6 = rd('c8s06', 2) + 5.1;
  const CAM6 = [[t6, [880, 1430, 1.7]], [t6 + 3.4, [980, 1380, 1.15]], [rd('c8s06', 1), [1120, 1120, .8]], [FLY6 - .4, [1120, 720, .9]], [IRIS6 + 2.4, [1330, 660, 1.15]]];
  const SPIRAL6 = [0, 1, 2].map(i => { const hx = NEST1 + 5, hy = g1(NEST1) - 10, a0 = TAU * hash(i + 300), dir = i & 1 ? 1 : -1; return makePath(Array.from({ length: 26 }, (_, k) => { const a = a0 + dir * k * .7, r = 8 + 8 * k; return [hx + r * Math.cos(a), hy - 50 * k + 12 * Math.sin(a)]; })); });
  function c8s06(t, lt) {
    const cam = kf(t, CAM6), [cx, cy, z] = cam, [x0, x1] = view(cx, z), y0 = cy - H / 2 / z - 80, y1 = cy + H / 2 / z + 80;
    DUSK();
    layer(cx, cy, z, .05, t, () => Kit.ellipse(1640, 640, 80, 80, P.sun));
    layer(cx, cy, z, .1, t, () => { A().cloud(380 + 6 * t - 3300, 160, .8, 1); A().cloud(1450 + 4 * t - 2200, 110, .6, 2); A().cloud(2300 + 5 * t - 2800, 220, .7, 3); });
    layer(cx, cy, z, .3, t, (a, b) => A().ground(x => 640 + 40 * Math.sin(x * .002 + 1) + 18 * Math.sin(x * .006), a, b, mixCol(P.foliage, P.wingAccent, .25)));
    layer(cx, cy, z, .6, t, (a, b) => {
      const hill = x => 740 + 20 * Math.sin(x * .0035 + 2);
      for (let k = Math.floor(a / 160); k * 160 < b; k++) if (hash(k + 70) < .6) { const x = k * 160 + 60 * hash(k + 71); A().tree(x, hill(x) + 10, 120 + 90 * hash(k + 72), .05 * wind(t, x), k + 30, .3); }
      A().ground(hill, a, b, mixCol(P.leafDk, P.wingAccent, .2));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    A().tree(260, g1(260) + 10, 420, .04 * wind(t, 260), 4);
    A().ground(g1, x0, x1);
    soil(x0, x1, 846, Math.max(y1, 900), 600, 1, z, 11);
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
    Kit.poly([[x0, 846], [x1, 846], [x1, y1], [x0, y1]], P.shade, { stroke: false, alpha: .15 });
    // Superfície: a trilha continua; o monte da entrada; os alados da próxima revoada sobem dele.
    grass(t, x0, x1, g1, 18, 16, 34, 0);
    for (const a of crowd(T1, t, 14, 3, { speed: 60, spacing: 150, sizeVar: .1 })) { const sz = AS1 * a.size; A().creature(creaturePose(SPECS.ant, { path: T1, s: a.s / sz, size: sz, ground: g1, t, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null })); }
    SPIRAL6.forEach((path, i) => { const dt = t - FLY6 - .55 * i, sz = 46 + 10 * hash(i + 5); if (dt > 0) A().creature(creaturePose(ALATE, { path, s: (70 * dt + 110 * dt * dt / (1 + dt)) / sz, size: sz, t, seed: 10 + i, gait: 'fly' })); });
    Kit.poly([[NEST1 - 70, g1(NEST1) + 8], [NEST1 - 30, g1(NEST1) - 20], [NEST1 + 25, g1(NEST1) - 24], [NEST1 + 75, g1(NEST1) + 8]], EARTH, { smooth: true, weight: 4 });
    Kit.ellipse(NEST1 + 5, g1(NEST1) - 6, 22, 7, P.line);
    grass(t, x0, x1, g1, 18, 16, 34, 1);
    Kit.camEnd();
    const [ix, iy] = toScreen(NEST1 + 5, g1(NEST1) - 30, cam);
    Kit.iris(ix, iy, 3200 * (1 - ease(seg(t, IRIS6, IRIS6 + 2.4))));
  }

  shotsById({ c8s01, c8s02, c8s03, c8s03b, c8s04, c8s05, c8s06 });
})();
