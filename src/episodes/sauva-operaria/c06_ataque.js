// c06_ataque.js: capítulo 6 de sauva-operaria (O ataque), planos c6s01–c6s08.
// Trilha de dia, fria: a forídea chega e paira; mergulha sobre ela; em câmera lenta põe o ovo numa irmã grande; a
// formiga morta; a trilha esvazia; a caroneira na folha dela espanta a mosca; mais caronas ao anoitecer; a noite sem
// moscas; a caroneira prepara a folha; de dia de novo, a mosca vai embora e ela some entre as irmãs.
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
  const COLD = () => Kit.gradient(mixCol(P.skyTop, P.stone, .3), P.skyLow);
  // Noite ao luar: silhuetas mais claras que o P.ink de c5s04c, para as caroneiras lerem sobre as folhas.
  const NIGHT = { color: mixCol(P.sauva, P.shade, .55), dark: mixCol(P.sauvaDk, P.ink, .5) }, NIGHT_K = .42;
  // Camada de fundo com paralaxe só horizontal (layer() de c01).
  function layer(cx, cy, zoom, f, t, draw) {
    const lx = lerp(960, cx, f);
    Kit.cam(lx, cy, zoom, 0, hand(t)); draw(lx - W / 2 / zoom - 200, lx + W / 2 / zoom + 200); Kit.camEnd();
  }
  const view = (cx, zoom) => [cx - W / 2 / zoom - 80, cx + W / 2 / zoom + 80];
  const toScreen = (x, y, [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
  // Capim entre x0 e x1 sobre gy; odd = 0/1 desenha só metade (atrás / à frente dos seres) (grass() de c01).
  function grass(t, x0, x1, gy, step, h0, h1, odd = null, push = []) {
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      if (odd !== null && (k & 1) !== odd) continue;
      const x = k * step + .5 * step * hash(k + 3), y = gy(x) + 3;
      A().blade(x, y, h0 + (h1 - h0) * hash(k + 7), bladeBend(t, x, y, push, 60, 3), k & 1 ? P.grass : P.grassDk);
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
  // Elipse chapada com contorno fino em px do mundo (o contorno do Kit engrossa com o zoom nos closes).
  const dot = (x, y, rx, ry, col, rot = 0, lw = 1.2) => { Kit.ellipse(x, y, rx + lw, ry + lw, P.line, { rot }); Kit.ellipse(x, y, rx, ry, col, { rot }); };
  const ring = (x, y, rx, ry, lw, alpha) => Kit.line(Array.from({ length: 25 }, (_, i) => [x + rx * Math.cos(i * TAU / 24), y + ry * Math.sin(i * TAU / 24)]), P.line, lw, { alpha, smooth: false });
  // Capim baixo no primeiro plano, abaixo da trilha.
  const fore = (t, x0, x1) => grass(t, x0, x1, x => g(x) + 80, 30, 18, 50);
  // Forídea com asas lentas (como em c01); fly(x, y) põe o corpo em (x, y), virado para facing.
  const FLY = { ...SPECS.fly, flyer: { ...SPECS.fly.flyer, freq: 4 } };
  const FS = 50;
  function fly(t, x, y, facing, o = {}) {
    const p = creaturePose(FLY, { path: makePath([[x - facing, y], [x, y]]), s: 1 / FS, size: FS, t, seed: 4, gait: 'fly', ...o });
    A().creature(p); return p;
  }
  // Texto de tela legível no celular: auréola clara em volta das letras escuras.
  function label(str, x, y, size, k, col = P.ink, halo = P.cloud) {
    if (k <= 0) return;
    const hw = .29 * size * str.length; x = clamp(x, hw + 40, W - hw - 40); y = clamp(y, .7 * size, 960 - .7 * size);
    for (let i = 0; i < 8; i++) Kit.text(str, x + .07 * size * Math.cos(i * TAU / 8), y + .07 * size * Math.sin(i * TAU / 8), size, halo, { k });
    Kit.text(str, x, y, size, col, { k });
  }
  // Marca de susto ('!') perto da cabeça: o '!' do mood() não sai nas formigas.
  const mark = (t, t0, x, y, size) => { const k = Math.min(seg(t, t0, t0 + .35), 1 - seg(t, t0 + 1.1, t0 + 1.4)); if (k > 0) Kit.text('!', x, y, size, P.ink, { k }); };
  // Folha erguida da mandíbula para trás e para cima (ângulo th), para a cabeça aparecer; vira p.carry (o desenho
  // da criatura pinta a folha, e a caroneira sobe nela).
  function hold(p, th = .45, w = 1, h = .4) {
    const S = p.size, f = p.facing, fx = p.head.x + f * .14 * S, fy = p.head.y + .02 * S;
    p.carry = { x: fx - f * w * S / 2 * Math.cos(th), y: fy - w * S / 2 * Math.sin(th), w: w * S, h: h * S, angle: -f * th };
    return p;
  }
  // Caroneira (rider() de nature.js, aqui com look, mandíbulas, tamanho, olhar e antenas controlados pelo plano).
  function rider(p, t, seed, o = {}) {
    const C = p.carry, k = o.k ?? .3; if (!C || k <= .01) return null;
    const a = p.facing < 0 ? Math.PI : 0, ca = Math.cos(a), size = k * p.size;
    const x = C.x - ca * .12 * C.w, y = C.y, ground = gx => { const u = clamp((gx - C.x) / C.w + .5); return C.y + (gx - C.x) * Math.tan(C.angle) - 2 * C.h * u * (1 - u); };
    const path = makePath([[x - ca * 1e3, y], [x + ca * 1e3, y]]);  // o.along: quanto ela andou para a frente na folha (× largura)
    let q = creaturePose(SPECS.minima, { path, s: (1e3 + (o.along || 0) * C.w) / size, size, ground, moving: o.moving || 0, t, seed, antennae: o.antennae });
    if (o.nod) q = nod(q, ...o.nod);
    A().creature(q, { ...o.look, jaws: o.jaws ?? .5 + .5 * noise1(seed + 9, t * 1.4) });
    return q;
  }

  // ---------- a trilha (mundo comum a todos os planos) ----------
  // A volta ao ninho vai da direita para a esquerda (folhas); a ida, ao fundo, da esquerda para a direita (sem carga).
  const g = x => 820 + 10 * Math.sin(x * .003 + .5) + 5 * Math.sin(x * .011);
  const gb = x => g(x) - 26;
  const LEFT = makePath([[2e4, 0], [-2e4, 0]]), RIGHT = makePath([[-2e4, 0], [2e4, 0]]);
  const BL = 100, V = 1.5 * BL;  // tamanho da operária média (px) e passo da trilha (px/s)
  const sOf = (x, dir, sz) => (dir < 0 ? 2e4 - x : x + 2e4) / sz;
  // Faixa sem fim de formigas: a k-ésima está em k·spacing − speed·t; devolve só as que cabem em [x0, x1].
  function lane(t, x0, x1, o) {
    const { spacing, speed = V, size = BL, sizeVar = .15, seed = 0, dir = -1 } = o, out = [];
    const off = -dir * speed * t, k0 = Math.floor((x0 - 2 * size + off) / spacing) - 1, k1 = Math.ceil((x1 + 2 * size + off) / spacing);
    for (let k = k0; k <= k1; k++) {
      const x = k * spacing + .5 * spacing * hash(seed + k) - off, sz = size * (1 + sizeVar * (2 * hash(seed + k + 55) - 1));
      if (x > x0 - 2 * sz && x < x1 + 2 * sz) out.push({ k, x, sz, seed: seed * 131 + k, h: hash(seed + k + 300) });
    }
    return out;
  }
  function ant(t, a, o = {}) {
    const dir = o.dir ?? -1, p = creaturePose(SPECS.ant, { path: dir < 0 ? LEFT : RIGHT, s: sOf(a.x, dir, a.sz), size: a.sz, ground: o.ground || g, t, seed: a.seed, carry: o.carry === undefined ? { w: 1.1, h: .7 } : o.carry, flinch: o.flinch || 0 });
    A().creature(p, o.look); return p;
  }
  // Irmãs da volta (com folha) e da ida (ao fundo); skip(x) tira quem encobriria o assunto.
  function sisters(t, x0, x1, o = {}) {
    for (const a of lane(t, x0, x1, { spacing: 260, speed: V * .9, seed: 31, dir: 1, size: BL * .9 })) ant(t, a, { dir: 1, ground: gb, carry: null, look: o.look });
    for (const a of lane(t, x0, x1, { spacing: o.spacing || 230, seed: 17 })) {
      if (o.skip && o.skip(a.x)) continue;
      const rk = o.riders ? o.riders(t, a) : 0, p = ant(t, a, { carry: rk ? { w: 1, h: .4 } : undefined, look: o.look });
      if (rk) rider(p, t, a.seed, { k: .3 * rk, look: o.look });
    }
  }
  // Céu, nuvens, morros e árvores com paralaxe; abre a câmera do mundo e o chão. sky() pinta o céu; dk escurece o fundo.
  function world(t, cam, o = {}) {
    const [cx, cy, z] = cam, [x0, x1] = view(cx, z), dk = o.dk || 0, fog = (col, k) => mixCol(mixCol(col, P.skyLow, k), P.shade, dk);
    (o.sky || COLD)();
    if (o.under) o.under();
    layer(cx, cy, z, .1, t, () => { A().cloud(400 + 6 * t - 2400, 150, .8, 1); A().cloud(1500 + 4 * t - 1600, 90, .6, 2); A().cloud(2400 + 5 * t - 2000, 230, .7, 3); });
    layer(cx, cy, z, .3, t, (a, b) => A().ground(x => 640 + 40 * Math.sin(x * .002 + 1) + 18 * Math.sin(x * .006), a, b, fog(P.foliage, .45)));
    layer(cx, cy, z, .6, t, (a, b) => {
      const hill = x => 730 + 20 * Math.sin(x * .0035 + 2);
      for (let k = Math.floor(a / 170); k * 170 < b; k++) if (hash(k + 70) < .55) { const x = k * 170 + 60 * hash(k + 71); A().tree(x, hill(x) + 10, 130 + 90 * hash(k + 72), .05 * wind(t, x), k + 30, .3 + .5 * dk); }
      A().ground(hill, a, b, fog(P.leafDk, .2));
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    A().ground(g, x0, x1);
    A().props(x => g(x) + 12, x0, x1, 23, 1.4, 0, 'sm');
    grass(t, x0, x1, gb, 22, 30, 70, 0);
    return [x0, x1];
  }
  // Fundo macro dos closes (como o close de c01): capim gigante enevoado e uma trilha de irmãs atrás.
  function macro(t, cx, cy, z, o = {}) {
    const dk = o.dk || 0, fog = (col, k) => mixCol(mixCol(col, P.skyLow, k), P.shade, dk);
    (o.sky || COLD)();
    if (o.under) o.under();
    layer(cx, cy, z, .35, t, (a, b) => {
      for (let i = Math.floor(a / 30); i * 30 < b; i++) { const x = i * 30 + 16 * hash(i + 200); A().blade(x, g(x) - 60, 90 + 120 * hash(i + 201), .12 * wind(t, x, 7), fog(P.grass, .55)); }
      A().ground(x => g(x) - 70, a, b, fog(P.grassDk, .5));
    });
    layer(cx, cy, z, .7, t, (a, b) => {
      for (const s of lane(t, a, b, { spacing: 150, speed: V * .8, seed: 8, size: 60 })) ant(t, s, { ground: x => g(x) - 40, look: o.look || (dk > .3 ? NIGHT : undefined) });
      for (let i = Math.floor(a / 60); i * 60 < b; i++) { const x = i * 60 + 30 * hash(i + 3); A().blade(x, g(x) - 22, 100 + 120 * hash(i), .14 * wind(t, x, 5), fog(P.grassDk, .25)); }
    });
    Kit.cam(cx, cy, z, 0, hand(t));
    const [x0, x1] = view(cx, z);
    A().ground(g, x0, x1);
    A().props(x => g(x) + 12, x0, x1, 23, 1.4, 0, 'sm');
    return [x0, x1];
  }

  // ---------- c6s01: a trilha de lado; a forídea entra e paira sobre as carregadoras; o nome ----------
  const t1 = at('c6s01'), FI1 = rd('c6s01', 0) + .2, N1 = rd('c6s01', 1);
  const hx1 = t => 3000 - V * (t - t1);
  function c6s01(t, lt) {
    const hx = hx1(t), z = kf(t, [[t1, 1.8], [FI1 + .8, 1.9], [N1 - .3, 3], [t1 + 8, 3.1]]), cx = hx + kf(t, [[t1, 160], [N1 - .3, 70]]), cy = kf(t, [[t1, 720], [N1 - .3, 735]]), cam = [cx, cy, z];
    const [x0, x1] = world(t, cam);
    sisters(t, x0, x1, { skip: x => Math.abs(x - hx) < 110 });
    const hp = hold(her({ path: LEFT, s: sOf(hx, -1, BL), size: BL, ground: g, t }));
    A().creature(hp, LOOK); rider(hp, t, 77);
    // Chega do alto à direita, paira sobre uma carregadora atrás dela e passa para cima da cabeça dela.
    let fx = hx, fy = 0;
    if (t > FI1) {
      const back = [hx + 230, 650], over = [hp.head.x + 20, hp.head.y - 90], k = ease(seg(t, N1 + 1.3, N1 + 2.3));
      const tgt = [lerp(back[0], over[0], k), lerp(back[1], over[1], k)], ki = easeOut(seg(t, FI1, FI1 + 1.2));
      fx = lerp(hx + 1100, tgt[0], ki); fy = lerp(300, tgt[1], ki);
      fly(t, fx, fy, -1);
    }
    fore(t, x0, x1); grass(t, x0, x1, g, 22, 30, 70, 1, [[hp.head.x, hp.head.y]]);
    Kit.camEnd();
    const [tx, ty] = toScreen(fx, fy - 70, cam);
    label('Neodohrniphora elongata', tx, ty, 84, Math.min(seg(t, N1, N1 + .4), 1 - seg(t, t1 + 7.6, t1 + 7.95)));
  }

  // ---------- c6s02: a mosca mergulha sobre ela várias vezes; ela se assusta e acelera ----------
  const t2 = at('c6s02'), D2 = [rd('c6s02', 0) + .9, rd('c6s02', 1) + .6, rd('c6s02', 1) + 3, rd('c6s02', 2) + .4];
  // Passo dela: V até o primeiro mergulho, depois acelera para 1,6 V (∫ ease, como em travel()).
  const hs2 = t => { const r = t - D2[0] - .1, I = u => u * u * u - u * u * u * u / 2; return 1.5 * (t - t2) + .9 * (r < 0 ? 0 : r < .6 ? .6 * I(r / .6) : r - .3); };
  const hx2 = t => 1600 - BL * hs2(t);
  function c6s02(t, lt) {
    const hx = hx2(t), z = 4.3 + .4 * ease(lt / 12), cam = [hx + 30, 755, z];
    const [x0, x1] = world(t, cam);
    sisters(t, x0, x1, { skip: x => Math.abs(x - hx) < 140 });
    const fl = D2.reduce((v, d, i) => v + anticipate(t, d, .05, .3, SPRING.bouncy) * (1 - ease(seg(t, d + .3, d + .8))) * (i ? .7 : 1), 0);
    const hp = her({ path: LEFT, s: hs2(t) + sOf(1600, -1, BL), size: BL, ground: g, t, flinch: fl, sq: D2.reduce((v, d) => v + .08 * spring(t, d, 7, 16), 0) });
    hold(hp); A().creature(hp, LOOK); rider(hp, t, 77);
    // Mosca: paira à frente e acima da cabeça (a folha cobre as costas); cada mergulho desce até o rosto em .45 s, toca
    // e sobe de volta em .6 s.
    const hov = [hp.head.x - 80, hp.head.y - 75], hit = [hp.head.x - 26, hp.head.y - 8];
    const dk = D2.reduce((v, d) => Math.max(v, t < d ? easeIn(seg(t, d - .45, d)) : 1 - ease(seg(t, d + .15, d + .75))), 0);
    fly(t, lerp(hov[0], hit[0], dk), lerp(hov[1], hit[1], dk), 1);
    for (const d of D2.slice(0, 2)) mark(t, d + .05, hp.head.x + 6, hp.head.y - 34, 24);
    fore(t, x0, x1); grass(t, x0, x1, g, 22, 30, 70, 1, [[hp.head.x, hp.head.y]]);
    Kit.camEnd();
    const [tx, ty] = toScreen(hp.head.x - 75, hp.head.y - 40, cam);
    label('1,5 mm', tx, ty, 92, Math.min(seg(t, rd('c6s02', 1) + .3, rd('c6s02', 1) + .7), 1 - seg(t, rd('c6s02', 2) - .4, rd('c6s02', 2))));
  }

  // ---------- c6s03: câmera lenta: a mosca toca a cabeça de uma irmã grande logo atrás dela e decola ----------
  const t3 = at('c6s03'), SL = .3, TOUCH = rd('c6s03', 0) + 1.6, LIFT = TOUCH + 1.1, BIG = 1.3 * BL;
  const slow = t => t3 + SL * (t - t3);  // tempo da cena em câmera lenta
  const bx3 = t => 900 - V * (slow(t) - t3);
  function c6s03(t, lt) {
    const ts = slow(t), bx = bx3(t), cam = [bx - 100 - 15 * ease(lt / 8), 745, 4.6 + .4 * ease(lt / 8)];
    const [x0, x1] = world(ts, cam);
    for (const a of lane(ts, x0, x1, { spacing: 260, speed: V * .9, seed: 31, dir: 1, size: BL * .9 })) ant(ts, a, { dir: 1, ground: gb, carry: null });
    // Ela vai logo à frente (meio fora do quadro, à esquerda); a irmã grande atrás é a atacada.
    const hp = hold(her({ path: LEFT, s: sOf(bx - 1.25 * BL, -1, BL), size: BL, ground: g, t: ts }));
    A().creature(hp, LOOK); rider(hp, ts, 77);
    const fl = anticipate(t, TOUCH, .1, .25, SPRING.smooth) * (1 - ease(seg(t, LIFT, LIFT + 1.5)));
    const bp = creaturePose(SPECS.ant, { path: LEFT, s: sOf(bx, -1, BIG), size: BIG, ground: g, t: ts, seed: 501, flinch: fl });
    hold(bp, 1.05, 1.1, .6); A().creature(bp);
    // O ovo dentro da cabeça: um ponto claro que pulsa depois do toque e se alonga em larva na segunda fala.
    if (t > TOUCH + .3) {
      const k = backOut(seg(t, TOUCH + .3, TOUCH + .7)), lk = ease(seg(t, rd('c6s03', 1), rd('c6s03', 1) + 1)), pu = 1 + .12 * Math.sin(TAU * .8 * (t - TOUCH));
      dot(bp.head.x + .05 * BIG, bp.head.y - .01 * BIG, (4 + 5 * lk) * k * pu, 3 * k * pu, P.cream, .3 * lk, .9);
    }
    // Mosca: desce devagar, pousa sobre a cabeça (1 s) e decola para o alto à direita.
    const on = [bp.head.x + 6, bp.head.y - .2 * BIG], hov = [bp.head.x + 90, bp.head.y - 140], away = [bp.head.x + 450, bp.head.y - 450];
    const kin = ease(seg(t, t3, TOUCH)), kout = easeIn(seg(t, LIFT, LIFT + 3));
    const fx = t < LIFT ? lerp(hov[0], on[0], kin) : lerp(on[0], away[0], kout), fy = t < LIFT ? lerp(hov[1], on[1], kin) : lerp(on[1], away[1], kout);
    fly(ts, fx, fy, -1);
    if (t > TOUCH) for (let i = 0; i < 2; i++) { const u = seg(t, TOUCH + .35 * i, TOUCH + .35 * i + .9); if (u > 0 && u < 1) ring(on[0] - 4, on[1] + 14, 10 + 40 * u, 4 + 15 * u, 1.5, 1 - u); }
    grass(ts, x0, x1, g, 22, 30, 70, 1, [[bp.head.x, bp.head.y]]);
    Kit.camEnd();
    const [tx, ty] = toScreen(bp.head.x - 95, bp.head.y - 95, cam);
    label('1 segundo', tx, ty, 96, Math.min(seg(t, TOUCH, TOUCH + .4), 1 - seg(t, LIFT + 1.6, LIFT + 2)));
  }

  // ---------- c6s04: corte seco para o chão: uma formiga morta de lado; a pupa entre as mandíbulas ----------
  const t4 = at('c6s04'), PU4 = rd('c6s04', 0) + 2.1, DX4 = 500;
  function c6s04(t, lt) {
    // A câmera desliza devagar do abdômen até a cabeça (onde surge a pupa).
    const cam = [DX4 + 70 - 100 * ease(lt / 4.6), 792, 4.4 + 1.6 * ease(lt / 4.6)];
    const [x0, x1] = macro(t, ...cam, { sky: () => Kit.gradient(mixCol(P.skyTop, P.stone, .5), mixCol(P.skyLow, P.stone, .3)) });
    A().leafPiece(DX4 + 130, g(DX4 + 130) - 3, 70, 26, .12, mixCol(P.leaf, P.wood, .35));
    const dp = creaturePose(SPECS.ant, { path: LEFT, s: sOf(DX4, -1, 1.15 * BL), size: 1.15 * BL, ground: g, t, seed: 501, alive: 0, moving: 0 });
    A().creature(dp, { jaws: .8 });
    // A pupa marrom aparece entre as mandíbulas.
    const k = backOut(seg(t, PU4, PU4 + .5));
    if (k > .01) dot(dp.head.x - .19 * dp.size, dp.head.y + .07 * dp.size, 8 * k, 4.5 * k, P.brown, -.2, .8);
    // Grãos de poeira caindo devagar no ar parado.
    for (let i = 0; i < 4; i++) { const u = frac(.12 * t + hash(i + 40)); Kit.ellipse(x0 + (x1 - x0) * hash(i + 41) + 20 * Math.sin(t + i), lerp(620, 830, u), 1.6, 1.6, P.cream, { alpha: .8 * Math.sin(Math.PI * u) }); }
    grass(t, x0, x1, x => g(x) + 22, 14, 12, 30, null, []);
    Kit.camEnd();
    Kit.flash(.12, P.shade);
  }

  // ---------- c6s05: a trilha esvazia: as grandes largam as folhas e voltam para o ninho; ficam as menores ----------
  const t5 = at('c6s05'), E5 = rd('c6s05', 1) + .5, SP5 = 175;
  const cx5 = t => 1200 - 40 * (t - t5), Z5 = 1.6;
  // A grande que larga a folha mais perto do centro: a câmera fecha nela e na folha largada, depois volta ao geral.
  const F5 = (() => { const rx = view(cx5(E5 + 1), Z5)[1]; let best = null;
    for (const a of lane(E5, cx5(E5) - 600, cx5(E5) + 600, { spacing: SP5, seed: 23, sizeVar: .35 })) {
      if (a.sz < BL) continue; const td = E5 + .9 * a.h, xd = a.x - V * (td - E5);
      if (xd < rx && (!best || Math.abs(xd - cx5(E5) - 80) < Math.abs(best - cx5(E5) - 80))) best = xd; }
    return best ?? cx5(E5); })();
  function c6s05(t, lt) {
    const close = ease(seg(t, rd('c6s05', 1) - .6, E5 + .3)) * (1 - ease(seg(t, E5 + 2.6, E5 + 4)));
    // Antes do close, a câmera desce devagar sobre a trilha (o geral não fica parado).
    const cam = [lerp(cx5(t) + 260 - 260 * ease(seg(lt, 0, 4.6)), F5 - 40, close), lerp(700 + 50 * ease(seg(lt, 0, 4.6)), 775, close), lerp(1.35 + .75 * ease(seg(lt, 0, 4.6)), 3.6, close)];
    const [x0, x1] = world(t, cam);
    for (const a of lane(t, x0, x1, { spacing: 260, speed: V * .9, seed: 31, dir: 1, size: BL * .9 })) ant(t, a, { dir: 1, ground: gb, carry: null });
    const rx = view(cx5(E5 + 1), Z5)[1];
    const ants = lane(t, x0 - 1500, x1, { spacing: SP5, seed: 23, sizeVar: .35 });
    for (const a of ants) {
      if (a.sz < BL) { ant(t, a); continue; }
      // As grandes: largam a folha em td e correm para a esquerda; as que ainda nem entraram no quadro não vêm.
      const td = E5 + .9 * a.h, xd = a.x + V * (t - td);
      if (xd > rx) continue;
      if (t < td) { ant(t, a); continue; }
      const dt = t - td, x = xd - V * dt - 1.6 * V * dt * dt / (1 + dt), lp = creaturePose(SPECS.ant, { path: LEFT, s: sOf(xd, -1, a.sz), size: a.sz, ground: g, t: td, seed: a.seed, carry: { w: 1.1, h: .7 } }).carry;
      const k = easeIn(seg(dt, 0, .35)), ly = lerp(lp.y, g(lp.x) - .1 * a.sz, k);
      A().leafPiece(lp.x, ly, lp.w, lerp(lp.h, .35 * lp.h, k), .15 * k, P.leaf);
      if (x > x0 - 200) ant(t, { ...a, x }, { carry: null, flinch: anticipate(t, td, .05, .3) * (1 - ease(seg(dt, .3, .8))) });
    }
    // A mosca paira sobre a trilha.
    fly(t, cx5(t) + 200 + 100 * Math.sin(.6 * lt), 660 + 25 * Math.sin(1.1 * lt), -1);
    fore(t, x0, x1); grass(t, x0, x1, g, 22, 30, 70, 1);
    Kit.camEnd();
    const [tx, ty] = toScreen(cx5(rd('c6s05', 0)) - 80, 700, cam);
    label('2 a 4 em 100', tx, ty, 100, Math.min(seg(t, rd('c6s05', 0) + .3, rd('c6s05', 0) + .7), 1 - seg(t, rd('c6s05', 1) - .1, rd('c6s05', 1) + .25)));
  }

  // ---------- c6s06: close da folha dela: a caroneira em cima, de antenas erguidas ----------
  const t6 = at('c6s06'), hx6 = t => 2000 - V * (t - t6);
  function c6s06(t, lt) {
    const hx = hx6(t), push = ease(seg(t, rd('c6s06', 1) - .3, rd('c6s06', 1) + 1.2));
    const hp0 = hold(her({ path: LEFT, s: sOf(hx, -1, BL), size: BL, ground: g, t }));
    const cam = [lerp(hx - 10, hp0.carry.x - 4, push), lerp(775, hp0.carry.y - 14, push), lerp(5, 8.5, push) + .2 * ease(lt / 8)];
    const [x0, x1] = macro(t, ...cam);
    A().creature(hp0, LOOK);
    // A caroneira ergue a cabeça e as antenas quando a câmera chega nela, e olha em volta.
    const up = ease(seg(t, rd('c6s06', 1) + .4, rd('c6s06', 1) + 1)), look = Math.sin(TAU * .25 * (t - rd('c6s06', 1)));
    rider(hp0, t, 77, { antennae: 'explore', nod: [0, -.04 * up, -.35 * up + .15 * up * look], jaws: .3 });
    grass(t, x0, x1, x => g(x) + 18, 14, 12, 30, null, [[hp0.head.x, hp0.head.y]]);
    Kit.camEnd();
    Kit.vignette(.25);
  }

  // ---------- c6s07: a mosca desce, a caroneira abre as mandíbulas, a mosca desvia e vai embora (duas vezes) ----------
  const t7 = at('c6s07'), hx7 = t => 1200 - V * (t - t7);
  const ATT7 = [rd('c6s07', 0) + 2, rd('c6s07', 0) + 5.4];  // momento em que a caroneira abre as mandíbulas
  function c6s07(t, lt) {
    const hx = hx7(t), hp = hold(her({ path: LEFT, s: sOf(hx, -1, BL), size: BL, ground: g, t }));
    const cam = [hp.carry.x - 5, hp.carry.y - 8, 7.6 - .4 * ease(lt / 8.5)];
    const [x0, x1] = macro(t, ...cam);
    A().creature(hp, LOOK);
    const jaw = ATT7.reduce((v, a) => Math.max(v, ease(seg(t, a - .15, a)) * (1 - ease(seg(t, a + .6, a + 1)))), 0);
    const r = rider(hp, t, 77, { antennae: 'explore', jaws: .2 + .8 * jaw, nod: [.02 * jaw, -.03 * jaw, -.3 * jaw] });
    // Mosca: cada ataque desce até sobre a caroneira; no susto desvia para o lado e sobe para longe.
    const top = [r.head.x + 14, r.head.y - 24];
    const fp = j => {
      const a = ATT7[j], kin = easeOut(seg(t, a - 1.5, a)), kout = easeIn(seg(t, a + .1, a + 1.3));
      const from = [top[0] + 160, top[1] - 160], away = j ? [top[0] + 300, top[1] - 300] : [top[0] - 150, top[1] - 250];
      return t < a + .1 ? [lerp(from[0], top[0], kin), lerp(from[1], top[1], kin)] : [lerp(top[0], away[0], kout) + 40 * Math.sin(Math.PI * kout) * (j ? -1 : 1), lerp(top[1], away[1], kout)];
    };
    const j = t < ATT7[0] + 1.3 ? 0 : 1, sw = anticipate(t, ATT7[j], .05, .4, SPRING.bouncy);
    if (t > ATT7[j] - 1.5 && t < ATT7[j] + 1.3) { const [fx, fy] = fp(j); fly(t, fx, fy - 10 * sw, t > ATT7[j] + .1 && !j ? -1 : t > ATT7[j] + .1 ? 1 : -1); }
    for (const a of ATT7) mark(t, a, r.head.x - 16, r.head.y - 16, 14);
    grass(t, x0, x1, x => g(x) + 18, 14, 12, 30, null, [[hp.head.x, hp.head.y]]);
    Kit.camEnd();
    Kit.vignette(.2);
  }

  // ---------- c6s07b: ao entardecer, mais caroneiras sobre as folhas; a luz passa do dia para a noite ----------
  const t7b = at('c6s07b'), END7b = at('c6s07c');
  const dusk = t => ease(seg(t, t7b + .5, END7b));
  // Céu do dia frio → fim de tarde → noite; o mesmo céu continua em c6s07c.
  const sky7 = k => () => {
    const top = k < .5 ? mixCol(mixCol(P.skyTop, P.stone, .3), mixCol(P.skyTop, P.wingAccent, .35), 2 * k) : mixCol(mixCol(P.skyTop, P.wingAccent, .35), P.shade, 2 * k - 1);
    const low = k < .5 ? mixCol(P.skyLow, mixCol(P.skyLow, P.sun, .5), 2 * k) : mixCol(mixCol(P.skyLow, P.sun, .5), mixCol(P.shade, P.wingAccent, .2), 2 * k - 1);
    Kit.gradient(top, low);
  };
  const nightLook = k => ({ color: mixCol(P.sauva, NIGHT.color, k), dark: mixCol(P.sauvaDk, NIGHT.dark, k) });
  // Caronas: cada carregadora tem um limiar; quando o limiar cai, a caroneira sobe (entra numa mola).
  const ridersAt = (t0, t1, base, top) => (t, a) => {
    const k = lerp(base, top, ease(seg(t, t0, t1))), on = t0 + (t1 - t0) * clamp((a.h - base) / Math.max(top - base, 1e-3));
    return a.h < base ? 1 : a.h < top ? backOut(seg(t, on, on + .4)) : 0;
  };
  const R7b = ridersAt(t7b + .8, t7b + 5.5, .2, .85);
  function c6s07b(t, lt) {
    const k = dusk(t), cam = [1400 - 60 * lt, 700, 1.5];
    const [x0, x1] = world(t, cam, { sky: sky7(k), dk: .6 * k, under: () => Kit.ellipse(1450, lerp(560, 860, k * 1.6), 70, 70, P.sun) });
    sisters(t, x0, x1, { riders: R7b, look: nightLook(k) });
    fore(t, x0, x1); grass(t, x0, x1, g, 22, 30, 70, 1);
    Kit.camEnd();
    Kit.flash(NIGHT_K * seg(k, .4, 1), P.shade);
    if (k > .6) Kit.ellipse(400, lerp(420, 190, ease(seg(k, .6, 1))), 46, 46, P.sun);
  }

  // ---------- c6s07c: noite: a trilha continua, caroneiras nas folhas, céu escuro sem moscas; "?" ----------
  // A trilha fica no quadro o tempo todo; o céu é só fundo. Batidas: "?" no céu (rd0), a câmera fecha numa carregadora
  // com caroneira (rd1), acompanha a fila até a seguinte e abre de novo no fim.
  const t7c = at('c6s07c');
  const STARS = Array.from({ length: 40 }, (_, i) => [1920 * hash(i + 600), 1080 * hash(i + 601), 2 + 2 * hash(i + 602)]);
  function c6s07c(t, lt) {
    const r1 = rd('c6s07c', 1), base = 1400 - 60 * (t - t7b);
    const [dx, cy, z] = kf(t, [[t7c, [0, 700, 1.5]], [r1 + .2, [-140, 735, 2.1]], [r1 + 1.6, [-160, 770, 3]], [r1 + 3.6, [-260, 772, 3.1]], [r1 + 4.8, [120, 770, 2.7]], [r1 + 6.2, [60, 760, 2.8]], [t7c + 10.6, [0, 720, 1.9]]]);
    const cam = [base + dx, cy, z];
    const [x0, x1] = world(t, cam, { sky: sky7(1), dk: .6 });
    const hz = (600 - cam[1]) * cam[2] + 540;
    sisters(t, x0, x1, { riders: () => 1, look: NIGHT });
    fore(t, x0, x1); grass(t, x0, x1, g, 22, 30, 70, 1);
    Kit.camEnd();
    Kit.flash(NIGHT_K, P.shade);
    // Lua e estrelas por cima da sombra, só acima do horizonte.
    Kit.ellipse(400, Math.min(190, hz - 90), 46, 46, P.sun);
    for (const [x, y, r] of STARS) if (y < hz - 30) Kit.ellipse(x, y, r, r, P.sun, { alpha: .55 + .45 * Math.sin(TAU * (.3 + hash(x)) * t + 7 * hash(y)) });
    label('?', 1180, Math.min(260, hz - 120), 140, Math.min(seg(t, rd('c6s07c', 0) + .2, rd('c6s07c', 0) + .6), 1 - seg(t, at('c6s07d') - .5, at('c6s07d') - .1)), P.sun, P.shade);
  }

  // ---------- c6s07d: close de uma caroneira de cabeça baixa, antenas mexendo sobre a folha ----------
  // Batidas: toca a folha atrás (até W1), anda para a ponta da folha (W1–W2), trabalha a borda com as mandíbulas e as
  // antenas (W2–UP), ergue a cabeça e a câmera abre para a folha inteira e a carregadora (UP–fim).
  const t7d = at('c6s07d'), cx7d = t => 900 - V * (t - t7d), R7d = rd('c6s07d', 0);
  const W1 = R7d + 1.8, W2 = W1 + 1.4, UP7d = W2 + 2.4;
  const TAPS = [R7d + .3, R7d + 1.1, W2 + .2, W2 + .9, W2 + 1.6];
  const ALONG = t => .32 * ease(seg(t, W1, W2));  // fração da largura da folha que ela anda para a frente
  function c6s07d(t, lt) {
    const x = cx7d(t), cp = creaturePose(SPECS.ant, { path: LEFT, s: sOf(x, -1, 1.1 * BL), size: 1.1 * BL, ground: g, t, seed: 812 }); hold(cp, .3, 1.1, .45);
    const C = cp.carry, rs = .3 * cp.size, surf = gx => { const u = clamp((gx - C.x) / C.w + .5); return C.y + (gx - C.x) * Math.tan(C.angle) - 2 * C.h * u * (1 - u); };
    const hx = C.x + .12 * C.w - ALONG(t) * C.w - .35 * rs;  // a cabeça dela (à esquerda do corpo)
    const open = ease(seg(t, UP7d, UP7d + 1.4));
    const cam = [lerp(hx + 10 + 6 * Math.sin(.8 * lt), C.x + .1 * C.w, open), lerp(surf(hx) - 10, C.y + .05 * C.w, open), lerp(15 + .8 * seg(t, W2, UP7d), 6.5, open)];
    const [x0, x1] = macro(t, ...cam, { sky: sky7(1), dk: .6, look: NIGHT });
    Kit.ellipse(1000, 300, 60, 60, P.sun);
    A().creature(cp);
    // Borda trabalhada: marcas claras onde ela já tocou (presas à folha, ficam para trás quando ela anda).
    for (const a of TAPS) if (t > a + .25) { const mx = C.x + .12 * C.w - ALONG(a) * C.w - .45 * rs; dot(mx, surf(mx) + 2, 2.2, 1.2, mixCol(P.leaf, P.cream, .45), 0, .4); }
    const bob = TAPS.reduce((v, a) => v + Math.max(0, Math.sin(Math.PI * seg(t, a, a + .5))), 0), down = 1 - ease(seg(t, UP7d - .2, UP7d + .5)) * .9;
    const walk = seg(t, W1, W2) > 0 && seg(t, W1, W2) < 1 ? 1 : 0;
    const rp = rider(cp, t, 813, { along: ALONG(t), moving: walk, antennae: down > .5 ? 'tap' : 'explore', nod: [.03 * down, (.06 + .02 * bob) * down, (.8 + .2 * bob) * down - .25 * (1 - down)], jaws: .3 + .4 * bob });
    // Ciscos que ela tira da folha a cada toque.
    const tip = rp ? rp.appendages[Object.keys(rp.appendages)[0]].at(-1) : [C.x, C.y];
    for (const a of TAPS) for (let i = 0; i < 3; i++) { const u = seg(t, a + .15, a + .85); if (u > 0 && u < 1) { const [px, py] = arcPt(tip, [tip[0] + (i - 1.5) * 14, tip[1] + 30], 10 + 6 * i, u); Kit.ellipse(px, py, 1.3, 1.3, mixCol(P.leaf, P.cream, .5), { alpha: 1 - u }); } }
    grass(t, x0, x1, x => g(x) + 18, 12, 10, 24, null);
    Kit.camEnd();
    Kit.flash(.3, P.shade);
    Kit.vignette(.35);
  }

  // ---------- c6s08: de dia, a mosca vai embora; ela volta ao ritmo da trilha e some entre as irmãs ----------
  const t8 = at('c6s08'), GO8 = rd('c6s08', 0) + .3, hx8 = t => 1500 - V * (t - t8);
  function c6s08(t, lt) {
    const hx = hx8(t), pull = ease(seg(t, rd('c6s08', 1) - .3, rd('c6s08', 1) + 1.6));
    const cam = [lerp(hx + 20, hx8(rd('c6s08', 1) + 1.6) - 120, pull), lerp(755, 700, pull), lerp(3.8, 1.4, pull)];
    const [x0, x1] = world(t, cam, { sky: () => Kit.gradient() });
    sisters(t, x0, x1, { skip: x => Math.abs(x - hx) < 110 });
    const hp = hold(her({ path: LEFT, s: sOf(hx, -1, BL), size: BL, ground: g, t }));
    A().creature(hp, LOOK); rider(hp, t, 77);
    // A mosca sobe e vai embora para o alto à direita.
    const k = easeIn(seg(t, GO8, GO8 + 1.6));
    if (k < 1) fly(t, lerp(hp.head.x + 110, hp.head.x + 900, k), lerp(hp.head.y - 150, hp.head.y - 900, k), k > 0 ? 1 : -1);
    // Faixa de irmãs da frente: passam por cima dela e ela some entre elas.
    // (a lacuna em volta dela vale para cada formiga pela posição no início do plano: ninguém aparece do nada).
    for (const a of lane(t, x0, x1, { spacing: 190, speed: V * 1.4, seed: 47 })) { const x8 = a.x + 1.4 * V * (t - t8); if (x8 < hx8(t8) - 250 || x8 > hx8(t8) + 150) ant(t, a, { ground: x => g(x) + 22 }); }
    grass(t, x0, x1, x => g(x) + 22, 22, 30, 70, 1);
    Kit.camEnd();
  }

  shotsById({ c6s01, c6s02, c6s03, c6s04, c6s05, c6s06, c6s07, c6s07b, c6s07c, c6s07d, c6s08 });
})();
