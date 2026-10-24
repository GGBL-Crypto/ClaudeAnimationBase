// Boneco palito expressivo (exp/estilos): traço de pincel de peso variável sobre papel liso, poucos elementos e uma cor
// de destaque (a protagonista, a folha dela, o texto, os emotes). Desenha F = EST.frame(cena, t) com Canvas2D puro.
(() => {
  const P = STYLE.palette;
  let c, z = 1, boil = 0;  // contexto, zoom e fervura do traço do quadro atual (valem só durante draw)
  const xy = q => Array.isArray(q) ? q : [q.x, q.y];
  const sid = s => [...String(s)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7);  // semente estável por id
  const lw = px => clamp(.4 * Math.sqrt(px), 1, 15);  // peso do traço (px de tela) para um ser de px de tela

  // Catmull-Rom com n subdivisões por trecho; 2 pontos viram uma reta subdividida.
  function smooth(pts, n = 5) {
    pts = pts.map(xy);
    if (pts.length < 3) { const [a, b] = [pts[0], pts.at(-1)], out = []; for (let i = 0; i <= 8; i++) out.push([lerp(a[0], b[0], i / 8), lerp(a[1], b[1], i / 8)]); return out; }
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 1; k <= n; k++) {
        const u = k / n, u2 = u * u, u3 = u2 * u;
        out.push([0, 1].map(j => .5 * (2 * p1[j] + (p2[j] - p0[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * u3)));
      }
    }
    return out;
  }

  // Traço de pincel: largura w (px de tela) que afina nas pontas (t0, t1 = fração do comprimento; 0 = ponta cega),
  // engrossa nas curvas e varia de pressão por semente; o eixo treme wob px. raw = pontos já densos (não suaviza).
  function brush(pts, w, o = {}) {
    const s = o.raw ? pts : smooth(pts), n = s.length;
    if (n < 2) return;
    const sd = (o.seed ?? 1) * 7.3 + boil * 13.7, t0 = o.t0 ?? .35, t1 = o.t1 ?? .35, wob = (o.wob ?? .7) / z, acc = [0];
    for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
    const len = acc[n - 1] || 1, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let bend = 0;
      if (i > 0 && i < n - 1) { const a1 = Math.atan2(s[i][1] - a[1], s[i][0] - a[0]), a2 = Math.atan2(b[1] - s[i][1], b[0] - s[i][0]); bend = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))); }
      const u = acc[i] / len, tp = Math.max(.12, (t0 ? ease(u / t0) : 1) * (t1 ? ease((1 - u) / t1) : 1));
      const hw = w / z / 2 * tp * (1 + .22 * noise1(sd, u * 3)) * (1 + Math.min(.6, 2.2 * bend));
      const off = wob * noise1(sd + 5, acc[i] * z / 60), x = s[i][0] - dy * off, y = s[i][1] + dx * off;
      L.push([x - dy * hw, y + dx * hw]); R.push([x + dy * hw, y - dx * hw]);
    }
    c.beginPath(); for (const q of L) c.lineTo(q[0], q[1]); for (let i = n - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.closePath(); c.fillStyle = o.col || P.ink; c.fill();
  }

  // Contorno à mão de uma elipse (x, y, rx, ry, rot): começa num ângulo por semente e passa um pouco do início, como
  // quem fecha o círculo de uma vez. o.fill pinta por dentro antes; o.sq < 1 deixa a forma mais quadrada.
  function loop(x, y, rx, ry, rot, w, o = {}) {
    const sd = o.seed ?? 1, a0 = hash(sd) * TAU, co = Math.cos(rot), si = Math.sin(rot), e = o.sq ?? 1, pts = [];
    const n = Math.round(clamp(Math.max(rx, ry) * z / 3, 12, 56));
    const at = (a, k) => { const ca = Math.cos(a), sa = Math.sin(a), px = rx * k * Math.sign(ca) * Math.abs(ca) ** e, py = ry * k * Math.sign(sa) * Math.abs(sa) ** e; return [x + px * co - py * si, y + px * si + py * co]; };
    if (o.fill) { c.beginPath(); for (let i = 0; i < n; i++) { const q = at(i / n * TAU, 1); c.lineTo(q[0], q[1]); } c.closePath(); c.fillStyle = o.fill; c.fill(); }
    if (w <= 0) return;
    for (let i = 0; i <= n * 1.1; i++) { const a = a0 + i / n * TAU; pts.push(at(a, 1 + .035 * noise1(sd + boil, a * 1.5) - .04 * i / n)); }
    brush(pts, w, { raw: true, t0: .1, t1: .18, seed: sd, wob: o.wob ?? .4, col: o.col });
  }
  const dot = (x, y, r, col = P.ink) => { c.beginPath(); c.ellipse(x, y, r, r, 0, 0, TAU); c.fillStyle = col; c.fill(); };
  const cam = (F, f) => { const { cx, cy } = F.cam; c.setTransform(z, 0, 0, z, 960 - lerp(960, cx, f) * z, 540 - cy * z); };
  const span = (F, f) => { const m = lerp(960, F.cam.cx, f); return [m - 1000 / z, m + 1000 / z]; };
  const profile = (F, f, prof, w, col) => {
    cam(F, f); const [x0, x1] = span(F, f), pts = [];
    for (let x = x0; x <= x1 + 14 / z; x += 14 / z) pts.push([x, prof(x)]);
    brush(pts, w, { raw: true, t0: 0, t1: 0, seed: f * 10, wob: 1, col });
  };
  // Formas fechadas por uma função de raio: base = [x, y], rx, ry, k(θ) multiplica o raio; meia = só a metade de cima.
  function blob(x, y, rx, ry, k, w, o = {}) {
    const pts = [], n = 48, a0 = o.half ? Math.PI : 0, a1 = o.half ? TAU : TAU * 1.06;
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), r = k(a); pts.push([x + rx * r * Math.cos(a), y + ry * r * Math.sin(a) * (o.flat && Math.sin(a) > 0 ? .35 : 1)]); }
    if (o.fill) { c.beginPath(); for (const q of pts) c.lineTo(q[0], q[1]); c.closePath(); c.fillStyle = o.fill; c.fill(); }
    brush(pts, w, { raw: true, t0: .08, t1: .12, seed: o.seed, col: o.col });
    if (o.half) brush([[x - rx, y], [x + rx, y]], w, { seed: o.seed + 1, t0: .1, t1: .1, col: o.col });
  }
  function tuft(x, y, s, sd, w, col = P.ink) {
    for (let i = -1; i <= 1; i++) {
      const h = s * (.75 + .5 * hash(sd + i)) * (i ? .8 : 1.1), lean = (i * .45 + .2 * (hash(sd + 9) - .5)) * s;
      brush([[x + i * .08 * s, y], [x + i * .12 * s + lean * .4, y - h * .55], [x + lean, y - h]], w, { seed: sd + i, t0: 0, t1: .8, col });
    }
  }

  // ---------- Mundo ----------
  const TUFT = { close: 70, wide: 11, name: 38, trail: 40 }, BLADE = { close: 190, name: 95 };
  function world(F) {
    const Wd = F.world, faint = mixCol(P.ink, P.paper, .72), mid = mixCol(P.ink, P.paper, .5);
    if (Wd.clouds) for (const [x, y, s, sd] of Wd.clouds.list) {
      cam(F, Wd.clouds.f);
      blob(x, y, 110 * s, 42 * s, a => 1 + .22 * Math.abs(Math.sin(a * 3 + sd)), 2.6, { seed: sd, flat: true, col: faint, fill: P.paper });
    }
    if (Wd.far) profile(F, Wd.far.f, Wd.far.prof, 2, faint);
    if (Wd.hill) profile(F, Wd.hill.f, Wd.hill.prof, 2.6, mid);
    if (Wd.mist) profile(F, Wd.mist.f, Wd.mist.prof, 2, faint);
    if (Wd.back) {
      profile(F, Wd.back.f, Wd.back.ground, 2.6, mid);
      const [x0, x1] = span(F, Wd.back.f), st = 260;
      for (let i = Math.floor(x0 / st); i <= x1 / st; i++) if (hash(i + 70) > .5) { const x = (i + hash(i)) * st; tuft(x, Wd.back.ground(x), 26, i + 70, 2.2, mid); }
    }
    cam(F, 1);
    const g = Wd.ground, [x0, x1] = span(F, 1), gp = [];
    for (let x = x0; x <= x1 + 14 / z; x += 14 / z) gp.push([x, g(x)]);
    if (Wd.soilTop) {  // solo em tom de papel mais escuro; túneis e câmaras escavados em papel, contornados a pincel
      c.beginPath(); for (const q of gp) c.lineTo(q[0], q[1]); c.lineTo(x1 + 50, 6000); c.lineTo(x0 - 50, 6000); c.closePath(); c.fillStyle = P.soil; c.fill();
      if (Wd.roots) { const { x, y, h } = Wd.roots; for (let i = 0; i < 4; i++) { const a = .5 + i * .7 + .3 * hash(i + 3), l = h * (.25 + .15 * hash(i)); brush([[x, y], [x + Math.cos(a) * l * .5, y + .4 * l], [x + Math.cos(a) * l, y + Math.sin(a) * .5 * l + .5 * l]], 3, { seed: 30 + i, t0: 0, t1: .9, col: mid }); } }
      const TW = 13, wt = 2.4;
      for (const pts of Wd.tunnels) { c.beginPath(); pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineWidth = 2 * TW; c.lineCap = c.lineJoin = 'round'; c.strokeStyle = P.paper; c.stroke(); }
      Wd.tunnels.forEach((pts, i) => {
        const s = smooth(pts);
        for (const sg of [-1, 1]) brush(s.map((q, j) => { const a = s[Math.max(0, j - 1)], b = s[Math.min(s.length - 1, j + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [q[0] - sg * TW * (b[1] - a[1]) / d, q[1] + sg * TW * (b[0] - a[0]) / d]; }), wt, { raw: true, seed: 40 + i * 2 + sg, t0: .05, t1: .05 });
      });
      for (const [x, y, w, h, sd] of Wd.chambers) blob(x, y, w / 2, h, a => 1 + .03 * Math.sin(a * 5 + sd), wt * 1.2, { half: true, fill: P.paper, seed: 60 + sd });
      for (const [x, y, w, h, sd] of Wd.fungus) {  // fungo: couve-flor de contorno com espirais dentro
        blob(x, y, w / 2 * .8, h * .55, a => 1 + .14 * Math.abs(Math.sin(a * 6 + sd)), wt, { half: true, fill: P.paper, seed: 80 + sd });
        for (let i = 0; i < 4; i++) { const px = x + (hash(sd + i) - .5) * w * .5, py = y - h * (.12 + .2 * hash(sd + i + 5)), r = w * .045, sp = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * TAU * 1.6; sp.push([px + r * (1 - k / 20) * Math.cos(a), py + r * (1 - k / 20) * Math.sin(a)]); } brush(sp, 1.6, { raw: true, seed: sd + i, col: mid }); }
      }
    }
    if (Wd.tree) {  // árvore de palito: tronco de um traço, copa num contorno de nuvem
      const { x, h } = Wd.tree, y = g(x);
      brush([[x - 6, y], [x + 6, y - .3 * h], [x - 4, y - .62 * h]], 9, { seed: 21, t0: 0, t1: .3 });
      brush([[x + 2, y - .45 * h], [x + .14 * h, y - .58 * h]], 4, { seed: 22, t0: 0, t1: .8 });
      blob(x, y - .8 * h, .3 * h, .22 * h, a => 1 + .16 * Math.abs(Math.sin(a * 4 + 1)), 4, { fill: P.paper, seed: 23 });
    }
    if (Wd.nest) {  // boca do ninho: montinho e o buraco
      const x = Wd.nest, y = g(x);
      brush([[x - 80, g(x - 80)], [x - 35, y - 20], [x + 35, y - 20], [x + 80, g(x + 80)]], 3, { seed: 25, t0: .3, t1: .3 });
      c.beginPath(); c.ellipse(x, y - 14, 15, 6, 0, 0, TAU); c.fillStyle = P.ink; c.fill();
    }
    if (Wd.rock) {
      const [x, y, r] = Wd.rock, gy = g(x);
      blob(x, gy, r * 1.3, Math.max(r - (y - gy), .5 * r), a => 1 + .05 * Math.sin(a * 3), lw(r * z) * .9, { half: true, fill: P.paper, seed: 27 });
      brush([[x - .2 * r, gy - .35 * r], [x, gy - .15 * r], [x - .1 * r, gy]], lw(r * z) * .5, { seed: 28 });
    }
    brush(gp, 3.6, { raw: true, t0: 0, t1: 0, seed: 3, wob: 1.2 });
    if (Wd.antGround) profile(F, 1, Wd.antGround, 2.4, mid);  // trilha das formigas, à frente
    const T = TUFT[F.shot] || 40, st = T * 6;
    for (let i = Math.floor(x0 / st); i <= x1 / st; i++) if (hash(i) > .45) { const x = (i + hash(i + .5)) * st; tuft(x, g(x), T * (.7 + .6 * hash(i + 2)), i, lw(T * z) * .55); }
  }
  // Capim da frente (close e nome): lâminas grandes sobre a linha front(x), por cima dos atores.
  function front(F) {
    const fr = F.world.front, B = BLADE[F.shot]; if (!fr || !B) return;
    cam(F, 1); const [x0, x1] = span(F, 1), st = B * 1.4;
    for (let i = Math.floor(x0 / st); i <= x1 / st; i++) if (hash(i + 300) > .55) { const x = (i + hash(i + 301)) * st; tuft(x, fr(x), B * (.7 + .5 * hash(i + 302)), i + 300, lw(B * z) * .7); }
  }

  // ---------- Formiga ----------
  // Bolinhas de contorno (cabeça, tórax, pecíolo, gáster), 6 pernas de linha, antenas e a folha. A protagonista é cheia na cor
  // de destaque; as do fundo, em tinta clara.
  function ant(a, F) {
    const p = a.pose, S = p.size, hero = a.role === 'hero', back = a.role === 'back', sd = sid(a.id) * 10;
    const w = lw(S * z) * (hero ? 1.2 : 1), ink = back ? P.faint : P.ink, far = back ? mixCol(P.faint, P.paper, .4) : mixCol(P.ink, P.paper, .45);
    const fill = hero ? P.accent : P.paper, hr = SPECS[p.spec].head.r * S, [th, pe, ga] = p.spine, limbs = Object.values(p.limbs);
    const leg = (l, col, k, i) => brush([l.root, l.mid, l.end], w * k * 1.2, { col, seed: sd + i, t0: .12, t1: .6 });
    if (hero) speed(a, F, ga.x - p.facing * ga.r * 1.5, [th.y, ga.y - .3 * ga.r, ga.y + .4 * ga.r], w * .7);
    limbs.forEach((l, i) => l.far && leg(l, far, .8, i));
    brush(p.appendages.antennaR || [], w * .7, { col: far, seed: sd + 8, t0: .1, t1: .6 });
    // Pequena na tela vira bolinhas cheias de tinta (contorno vazio viraria borrão), em transição suave com o tamanho.
    const k = clamp((90 - S * z) / 45), small = k > .5, fb = hero ? fill : mixCol(P.paper, ink, k);
    const bub = (q, rx, ry, a, m, s) => loop(q.x, q.y, rx, ry, a, w * m * (1 - .5 * k), { fill: fb, col: ink, seed: sd + s });
    bub(ga, ga.r * 1.25, ga.r * .95, ga.angle, 1, 11); bub(pe, pe.r * 1.2, pe.r * .9, pe.angle, .8, 12);
    bub(th, th.r * 1.4, th.r * .8, th.angle, 1, 13);
    limbs.forEach((l, i) => !l.far && leg(l, ink, 1, i));  // pernas de cá antes da cabeça: não cruzam o olho
    bub(p.head, hr, hr * .9, p.head.angle, 1, 14);
    if (!small) {
      c.save(); c.translate(p.head.x, p.head.y); c.rotate(p.head.angle); c.scale(1, p.facing);
      brush([[.75 * hr, .3 * hr], [1.15 * hr, .4 * hr], [1.05 * hr, .62 * hr]], w * .8, { col: ink, seed: sd + 15, t0: .2, t1: .7 });  // mandíbula
      if (hero) { loop(.38 * hr, -.18 * hr, .34 * hr, .38 * hr, 0, w * .6, { fill: P.paper, col: ink, seed: sd + 16 }); dot(.5 * hr, -.16 * hr, .15 * hr); dot(.45 * hr, -.24 * hr, .05 * hr, P.paper); }
      else dot(.4 * hr, -.18 * hr, .17 * hr, ink);
      c.restore();
    }
    brush(p.appendages.antennaL || [], w * .8, { col: ink, seed: sd + 9, t0: .1, t1: .6 });
    if (p.carry) leaf(p.carry, w, hero ? mixCol(P.accent, P.paper, .6) : P.paper, ink, sd + 20);
  }
  // Folha cortada: gota de contorno com a nervura; gira pelo ângulo do pedaço.
  function leaf(L, w, fill, col, sd) {
    const co = Math.cos(L.angle), si = Math.sin(L.angle), to = ([u, v]) => [L.x + u * co - v * si, L.y + u * si + v * co], top = [], bot = [];
    for (let i = 0; i <= 12; i++) { const u = -1 + 2 * i / 12, v = L.h / 2 * (1 - u * u) ** .7 * (1 + .25 * u); top.push(to([u * L.w / 2, -v])); bot.push(to([u * L.w / 2, v])); }
    const pts = [...top, ...bot.reverse()];
    c.beginPath(); for (const q of pts) c.lineTo(q[0], q[1]); c.closePath(); c.fillStyle = fill; c.fill();
    brush(pts, w * .85, { raw: true, col, seed: sd, t0: .05, t1: .05 });
    brush([to([-L.w / 2, 0]), to([0, -.04 * L.h]), to([.38 * L.w, 0])], w * .5, { col, seed: sd + 1 });
  }

  // ---------- Forídea ----------
  // Rabisco de corpo (laçadas do tórax ao abdome), cabeça de bolinha e duas asas em gota que batem pela fase.
  function fly(a) {
    const p = a.pose, S = p.size, f = p.facing, w = lw(S * z) * .9, [th, ab] = p.spine, hr = SPECS.fly.head.r * S;
    const fl = p.wings ? Math.sin(p.wings.phase * TAU) : 0;
    for (const [k, col, fill] of [[-.45, mixCol(P.ink, P.paper, .55), mixCol(P.paper, P.ink, .06)], [0, P.ink, P.paper]]) {
      const ang = -Math.PI / 2 - f * (.55 + k) + f * .8 * fl, bx = th.x, by = th.y - th.r * .5;
      loop(bx + Math.cos(ang) * .3 * S, by + Math.sin(ang) * .3 * S, .32 * S, .1 * S, ang, w * .7, { fill, col, seed: 50 + k * 10 });
    }
    for (let i = 0; i < 3; i++) { const x = th.x + f * (i - 1) * .06 * S, y = th.y + th.r * .5; brush([[x, y], [x - f * .03 * S, y + .1 * S], [x - f * .01 * S, y + .18 * S]], w * .5, { seed: 60 + i, t0: 0, t1: .8 }); }
    const pts = [], N = 16;
    for (let i = 0; i <= N; i++) { const u = i / N, r = lerp(th.r * 1.1, ab.r * .9, u), x = lerp(th.x + f * th.r * .2, ab.x - f * ab.r * .5, u), y = lerp(th.y, ab.y, u), q = u * TAU * 2.6 + 1; pts.push([x + r * Math.cos(q), y + r * .85 * Math.sin(q)]); }
    brush(pts, w, { seed: 64, t0: .1, t1: .4 });
    loop(p.head.x, p.head.y, hr, hr, 0, w * .8, { fill: P.paper, seed: 66 });
    dot(p.head.x + f * .35 * hr, p.head.y - .1 * hr, .32 * hr);
  }

  // Linhas de movimento atrás de quem anda (x da traseira, alturas ys): velocidade pelo quadro de 0,1 s antes, no mesmo
  // plano (função pura de t).
  function speed(a, F, x, ys, w) {
    const q = EST.frame(F.scene, F.t - .1).actors.find(b => b.id === a.id), S = a.pose.size, f = a.pose.facing;
    const mk = q && q.pose.size === S ? clamp(Math.abs(a.track.x - q.track.x) / .1 / S / .55) : 0;
    if (mk > .05) ys.forEach((y, i) => {
      const x0 = x - f * .05 * i * S, l = (.22 + .12 * hash(i + boil)) * S * mk;
      c.globalAlpha = mk * .8 * (a.alpha ?? 1); brush([[x0, y], [x0 - f * l, y]], w, { seed: 70 + i, t0: .05, t1: .9 });
    });
    c.globalAlpha = a.alpha ?? 1;
  }

  // ---------- Explorador ----------
  // Corpo de palito com cabeça grande (2,3× a da pose) e rosto que atua; chapéu e mochila de linha. Achata em torno dos pés.
  function human(a, F) {
    const p = a.pose, S = p.size, f = p.facing, w = lw(S * z) * 1.1, r = SPECS.human.head.r * S, R = 2.3 * r, sd = 500;
    const [chest, pelvis] = p.spine.map(xy), L = p.limbs, far = mixCol(P.ink, P.paper, .4);
    const neck = [lerp(chest[0], p.head.x, .45), lerp(chest[1], p.head.y, .45)];
    let hx = p.head.x - neck[0], hy = p.head.y - neck[1]; const hd = Math.hypot(hx, hy) || 1;
    const hc = [neck[0] + hx / hd * R * .92, neck[1] + hy / hd * R * .92];
    speed(a, F, pelvis[0] - f * .16 * S, [chest[1] - .05 * S, lerp(chest[1], pelvis[1], .6) - .05 * S, pelvis[1] - .05 * S], w * .55);
    const gx = (L.legL.end[0] + L.legR.end[0]) / 2, gy = Math.max(L.legL.end[1], L.legR.end[1]), k = 2.5 * (p.sq || 0);
    c.save(); c.translate(gx, gy); c.scale(1 + .5 * k, 1 - k); c.translate(-gx, -gy);
    const limb = (l, col, i) => {
      brush([l.root, l.mid, l.end], w, { col, seed: sd + i, t0: .08, t1: l.foot ? .08 : .3 });
      if (l.foot) brush([l.end, [l.end[0] + f * .08 * S, l.end[1] + .005 * S]], w * 1.7, { col, seed: sd + i + 10, t0: 0, t1: .35 });
      else loop(l.end[0], l.end[1], .022 * S, .022 * S, 0, w * .6, { fill: P.paper, col, seed: sd + i + 20 });
    };
    limb(f > 0 ? L.legR : L.legL, far, 1); limb(f > 0 ? L.armR : L.armL, far, 2);
    // mochila: caixa de linha nas costas, alça por cima do ombro
    let ux = neck[0] - pelvis[0], uy = neck[1] - pelvis[1]; const ud = Math.hypot(ux, uy) || 1; ux /= ud; uy /= ud;
    const bx = -f * -uy, by = -f * ux, pk = [lerp(pelvis[0], chest[0], .7) + bx * .085 * S, lerp(pelvis[1], chest[1], .7) + by * .085 * S];
    loop(pk[0], pk[1], .055 * S, .11 * S, Math.atan2(uy, ux) + Math.PI / 2, w * .9, { fill: P.paper, sq: .45, seed: sd + 30 });
    brush([[pk[0] - bx * .02 * S + ux * .1 * S, pk[1] - by * .02 * S + uy * .1 * S], [chest[0] + ux * .07 * S, chest[1] + uy * .07 * S], [chest[0] - bx * .05 * S, chest[1] - by * .05 * S]], w * .6, { seed: sd + 31 });
    brush([pelvis, chest, neck], w * 1.35, { seed: sd + 32, t0: .15, t1: .1 });
    limb(f > 0 ? L.legL : L.legR, P.ink, 3);
    head(p, hc, R, w, F);
    limb(f > 0 ? L.armL : L.armR, P.ink, 4);
    c.restore();
    const em = p.emote;
    if (em && em.a > 0) {  // emote ?/! à mão, na cor de destaque, acima e à frente da cabeça; no susto, linhas de impacto
      const a0 = p.head.angle, fx = Math.cos(a0), fy = Math.sin(a0), upx = f * Math.sin(a0), upy = -f * Math.cos(a0), ks = Math.max(0, em.k);
      c.globalAlpha = em.a;
      emote(em.sym, hc[0] + upx * 1.7 * R + fx * 1.7 * R, hc[1] + upy * 1.7 * R + fy * 1.7 * R, R * 1.3 * ks, w * 1.8);
      if (em.sym === '!') for (let i = 0; i < 7; i++) {
        const an = -Math.PI * (.05 + i * .15), d0 = 1.35 * R, d1 = d0 + .8 * R * Math.min(1.2, ks);
        brush([[hc[0] + Math.cos(an) * d0, hc[1] + Math.sin(an) * d0], [hc[0] + Math.cos(an) * d1, hc[1] + Math.sin(an) * d1]], w * .8, { seed: 90 + i, t0: .05, t1: .7 });
      }
      c.globalAlpha = 1;
    }
  }
  // Cabeça no quadro local (x à frente, y para baixo), rosto por expressão, piscar e chapéu (pula no susto).
  function head(p, hc, R, w, F) {
    const e = p.face.expression, b = p.face.blink || 0, em = p.emote, pop = e === 'surprised' && em ? clamp(em.k, 0, 1.4) : e === 'surprised' ? 1 : 0;
    c.save(); c.translate(hc[0], hc[1]); c.rotate(p.head.angle); c.scale(1, p.facing);
    loop(0, 0, R, R * .97, 0, w * 1.1, { fill: P.paper, seed: 510 });
    const eyes = [[.3, -.05, 1], [.7, -.08, .8]];
    if (pop > 0) for (const [ex, ey, s] of eyes) {  // olhos saltando: brancos enormes, pupila pequena, passam do contorno
      const er = R * (.15 + .12 * pop) * s, x = (ex + .1 * pop) * R;
      loop(x, ey * R, er, er * 1.1, 0, w * .7, { fill: P.paper, seed: 520 + s * 10 }); dot(x + .03 * R, ey * R - .02 * R, .055 * R);
    }
    else for (const [ex, ey, s] of eyes) {
      const big = e === 'curious' ? 1.25 : 1;
      if (b > .55) brush([[(ex - .08) * R, ey * R], [ex * R, (ey + .05) * R], [(ex + .08) * R, ey * R]], w * .7, { seed: 530 + s * 10, t0: .2, t1: .2 });
      else { c.beginPath(); c.ellipse(ex * R, ey * R, .075 * R * s * big, .12 * R * s * big * (1 - b), 0, 0, TAU); c.fillStyle = P.ink; c.fill(); }
    }
    const BROW = {
      neutral: [[[.16, -.34], [.42, -.38]], [[.58, -.38], [.8, -.34]]],
      curious: [[[.12, -.5], [.3, -.66], [.46, -.56]], [[.58, -.34], [.82, -.4]]],
      surprised: [[[.1, -.62], [.3, -.84], [.5, -.7]], [[.6, -.7], [.76, -.86], [.92, -.68]]],
    }[e] || [];
    BROW.forEach((br, i) => brush(br.map(([x, y]) => [x * R, (y - (e === 'surprised' ? .1 * (pop - 1) : 0)) * R]), w * .8, { seed: 540 + i, t0: .2, t1: .5 }));
    if (e === 'surprised') { c.beginPath(); c.ellipse(.5 * R, .5 * R, .15 * R, .24 * R * Math.max(.4, pop), 0, 0, TAU); c.fillStyle = P.ink; c.fill(); }
    else if (e === 'curious') loop(.6 * R, .45 * R, .06 * R, .07 * R, 0, w * .6, { seed: 550 });
    else brush([[.36 * R, .38 * R], [.52 * R, .47 * R], [.68 * R, .37 * R]], w * .7, { seed: 551, t0: .2, t1: .3 });
    // chapéu de explorador: copa em domo e aba; no susto pula num arco e gira
    const u = F.scene === 'H' ? seg(F.t, 5.3, 6.05) : 0, lift = 4 * u * (1 - u) * 1.7 * R;
    c.translate(0, -lift); c.rotate(-.5 * Math.sin(Math.PI * u));
    const crown = [[-.72 * R, -.62 * R], [-.6 * R, -1.15 * R], [0, -1.38 * R], [.6 * R, -1.15 * R], [.74 * R, -.62 * R]];
    c.beginPath(); for (const q of smooth(crown)) c.lineTo(q[0], q[1]); c.closePath(); c.fillStyle = P.paper; c.fill();
    brush(crown, w, { seed: 560, t0: .1, t1: .1 });
    brush([[-.7 * R, -.78 * R], [0, -.8 * R], [.72 * R, -.78 * R]], w * 1.4, { seed: 561, t0: .1, t1: .1, col: P.accent });
    brush([[-1.2 * R, -.56 * R], [-.3 * R, -.66 * R], [.5 * R, -.66 * R], [1.3 * R, -.5 * R]], w * 1.1, { seed: 562, t0: .15, t1: .2 });
    c.restore();
  }
  // ? e ! de pincel, centrados em (x, y), altura ~s.
  function emote(sym, x, y, s, w) {
    if (s <= 0) return;
    const P2 = pts => pts.map(([u, v]) => [x + u * s, y + v * s]);
    if (sym === '!') brush(P2([[.02, -.62], [0, -.2], [-.01, .18]]), w * 1.4, { seed: 95, t0: 0, t1: .8, col: P.accent });
    else brush(P2([[-.3, -.38], [-.12, -.6], [.2, -.6], [.32, -.36], [.05, -.1], [0, .18]]), w, { seed: 96, t0: .1, t1: .5, col: P.accent });
    dot(x, y + .42 * s, w * .9 / z, P.accent);
  }

  // ---------- Texto ----------
  // Nome à mão: comum na cor de destaque, científico em tinta, menor; um risco de pincel se desenha por baixo com k.
  function texts(F) {
    c.resetTransform(); z = 1;
    for (const s of F.texts) if (s.k > 0) {
      const [main, sci] = s.text.split(' ('), k = s.k, sc = .85 + .15 * backOut(k);
      c.save(); c.globalAlpha = clamp(k * 1.5); c.translate(s.x, s.y); c.scale(sc, sc); c.rotate(-.02);
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.font = `${Math.round(s.size * 1.6)}px "Ink Free", "Segoe Print", cursive`; c.fillStyle = c.strokeStyle = P.accent; c.lineWidth = s.size * .05; c.lineJoin = 'round'; c.strokeText(main, 0, 0); c.fillText(main, 0, 0);
      const tw = c.measureText(main).width, n = Math.max(2, Math.round(12 * ease(k))), ln = [];
      for (let i = 0; i < n; i++) { const u = i / 11; ln.push([-tw / 2 + u * tw * 1.05, .22 * s.size - .1 * s.size * u + .05 * s.size * Math.sin(u * 5)]); }
      brush(ln, s.size * .16, { seed: 99, t0: .1, t1: .6 });
      if (sci) { c.font = `italic ${Math.round(s.size * .7)}px "Ink Free", "Segoe Print", cursive`; c.fillStyle = P.ink; c.fillText('(' + sci, 0, s.size * 1.15); }
      c.restore();
    }
  }

  window.ExpStyle = {
    draw(F) {
      c = animationEngine.context; z = F.cam.z; boil = 0;
      c.resetTransform(); c.fillStyle = P.paper; c.fillRect(0, 0, W, H);
      world(F);
      boil = Math.floor(F.t * 12);  // o traço dos seres ferve a 12 qps; o cenário fica parado
      for (const a of F.actors) {
        if (a.hidden) continue;
        cam(F, a.layer); const P0 = a.pose;
        if (a.flip) { const m = (P0.spine[0].x + P0.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
        c.globalAlpha = a.alpha ?? 1;
        if (a.kind === 'ant') ant(a, F); else if (a.kind === 'fly') fly(a); else human(a, F);
        c.globalAlpha = 1;
      }
      boil = 0; front(F);
      texts(F);
      c.resetTransform();
    },
  };
})();
