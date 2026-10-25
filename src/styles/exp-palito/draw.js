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
    const sd = (o.seed ?? 1) * 7.3 + boil * 13.7, pr = o.pr ?? .22, t0 = o.t0 ?? .35, t1 = o.t1 ?? .35, wob = (o.wob ?? .7) / z, acc = [0];
    for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
    const len = acc[n - 1] || 1, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let bend = 0;
      if (i > 0 && i < n - 1) { const a1 = Math.atan2(s[i][1] - a[1], s[i][0] - a[0]), a2 = Math.atan2(b[1] - s[i][1], b[0] - s[i][0]); bend = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))); }
      const u = acc[i] / len, tp = Math.max(.12, (t0 ? ease(u / t0) : 1) * (t1 ? ease((1 - u) / t1) : 1));
      const hw = w / z / 2 * tp * (1 + pr * noise1(sd, u * 3)) * (1 + Math.min(.6, 2.2 * bend));
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
    if (w <= 0) return;
    brush(pts, w, { raw: true, t0: .08, t1: .12, seed: o.seed, col: o.col, pr: o.pr });
    if (o.half) brush([[x - rx, y], [x + rx, y]], w, { seed: o.seed + 1, t0: .1, t1: .1, col: o.col, pr: o.pr });
  }
  function tuft(x, y, s, sd, w, col = P.ink) {
    for (let i = -1; i <= 1; i++) {
      const h = s * (.75 + .5 * hash(sd + i)) * (i ? .8 : 1.1), lean = (i * .45 + .2 * (hash(sd + 9) - .5)) * s;
      brush([[x + i * .08 * s, y], [x + i * .12 * s + lean * .4, y - h * .55], [x + lean, y - h]], w, { seed: sd + i, t0: 0, t1: .8, col });
    }
  }

  // ---------- Geometria dos seres (ExpStyle.parts) ----------
  // Tudo o que é osso sai de pose.joints: eixo reto de junta a junta, traço de pincel sem tampa (a ponta fica rente à
  // junta final; pé, mão e cabeça cobrem a junta). O desenho usa estas partes (mesma fonte que o verificador lê).
  // Parte: {actor, name, from, to, pts, r, cap} + w (largura do traço em px de tela).
  const d2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]), ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const line = (a, b, n = 6) => { const o = []; for (let i = 0; i <= n; i++) o.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); return o; };
  const mk = (a, J) => (name, from, to, w, end = to) => ({ actor: a.id, name, from, to, pts: line(J[from], J[end]), r: w / z / 2, cap: 'butt', w });
  const headPart = (a, J, r) => ({ actor: a.id, name: 'head', from: 'headBase', to: null, pts: [J.headBase, J.headTop], r, cap: 'round' });
  // Humano: tronco e pescoço num traço só (pelve → peito → base do pescoço → base da cabeça; o tronco engrossa com a
  // girth do tipo de corpo), pernas e braços de dois ossos, pé (tornozelo → dedo) e mão (pulso → ponta) em traço grosso que afina, cabeça oval um pouco larga.
  function humanParts(a) {
    const p = a.pose, J = p.joints, w = lw(p.size * z) * 1.1, add = mk(a, J), R = d2(J.headBase, J.headTop) / 2, wt = w * 1.35 * (BODY[p.body || 'adult'].girth / .11) ** .8;
    const out = [add('spine', 'pelvis', 'chest', wt), add('upperSpine', 'chest', 'neck', wt), add('neck', 'neck', 'headBase', Math.min(wt, w * 1.35)), headPart(a, J, 1.12 * R)];
    for (const s of 'LR') {
      out.push(add('thigh' + s, 'hip' + s, 'knee' + s, w), add('shin' + s, 'knee' + s, 'ankle' + s, w), add('foot' + s, 'ankle' + s, null, w * 1.7, 'toe' + s),
        add('upperArm' + s, 'shoulder' + s, 'elbow' + s, w), add('forearm' + s, 'elbow' + s, 'wrist' + s, w), add('hand' + s, 'wrist' + s, null, w * 1.5, 'hand' + s));
    }
    return out;
  }
  // Formiga: cada perna em dois ossos (raiz → meio → ponta), pescoço (tórax → base da cabeça, sob as bolinhas) e cabeça.
  const antW = (a, k) => Math.max(lw(a.pose.size * z) * (a.role === 'hero' ? 1.2 : 1), 1.4 + 1.2 * k);
  function antParts(a) {
    if (a.hidden) return [];
    const p = a.pose, J = p.joints, k = clamp((90 - p.size * z) / 45), w = antW(a, k), add = mk(a, J), R = d2(J.headBase, J.headTop) / 2;
    const out = [add('neck', 'neck', 'headBase', w * .8), headPart(a, J, .9 * R * (1 + .35 * k))];
    for (const [n, l] of Object.entries(p.limbs)) { const lw2 = w * (l.far ? .8 : 1) * (a.role === 'hero' ? 1.7 : 1.2); out.push(add(n + '.upper', n + '.root', n + '.mid', lw2), add(n + '.lower', n + '.mid', n + '.end', lw2)); }
    return out;
  }
  const flyParts = a => [headPart(a, a.pose.joints, d2(a.pose.joints.headBase, a.pose.joints.headTop) / 2)];
  // Bichos de N: pescoço (spine0 → neck → base da cabeça), pernas de dois ossos e, onde há pé, a ponta (tornozelo → dedo);
  // o tronco (body = largura do traço da coluna, se houver) dos que não têm corpo de contorno. Peixe, borboleta e besouro: pescoço (sob o corpo) e cabeça.
  // Larguras em múltiplos do traço do ser; head = meia largura da cabeça em r (o eixo base → topo é sempre 2r).
  const BEAST = { dog: { w: 1, neck: 2.4, leg: 2.2, tip: 2.4, head: .58 }, bird: { w: .8, neck: 1.6, leg: .75, tip: .85, head: 1 },
    beetle: { w: 1, neck: .8, leg: 1.1, head: .9 }, fish: { w: 1, neck: .8, head: 1 }, butterfly: { w: .8, neck: .8, head: 1 } };
  function beastParts(a) {
    if (a.hidden) return [];
    const p = a.pose, J = p.joints, B = BEAST[a.kind], w = lw(p.size * z) * B.w, add = mk(a, J), R = d2(J.headBase, J.headTop) / 2, out = [];
    if (B.body) for (let i = p.spine.length - 1; i > 0; i--) out.push(add(`spine${i - 1}-${i}`, 'spine' + i, 'spine' + (i - 1), w * B.body));
    if (p.bones.some(b => b.name === 'upperSpine')) out.push(add('upperSpine', 'spine0', 'neck', w * B.neck));
    out.push(add('neck', 'neck', 'headBase', w * B.neck), headPart(a, J, B.head * R));
    for (const n of Object.keys(p.limbs)) {
      out.push(add(n + '.upper', n + '.root', n + '.mid', w * B.leg), add(n + '.lower', n + '.mid', n + '.end', w * B.leg));
      if (J[n + '.toe']) out.push(add(n + '.tip', n + '.end', null, w * B.tip, n + '.toe'));
    }
    return out;
  }
  const partsOf = a => a.kind === 'ant' ? antParts(a) : a.kind === 'fly' ? flyParts(a) : a.kind === 'human' ? humanParts(a) : beastParts(a);
  const byName = ps => Object.fromEntries(ps.map(q => [q.name, q]));
  // Traço contínuo pelas partes (sem repetir a junta do meio).
  const stroke = (ps, o) => brush(ps.flatMap((q, i) => i ? q.pts.slice(1) : q.pts), ps[0].w, { raw: true, ...o });

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
      const TW = 13, wt = 4.2;  // contorno de pincel com pressão forte: o solo não pode parecer planta de CAD
      for (const pts of Wd.tunnels) { c.beginPath(); pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineWidth = 2 * TW; c.lineCap = c.lineJoin = 'round'; c.strokeStyle = P.paper; c.stroke(); }
      Wd.tunnels.forEach((pts, i) => {
        const s = smooth(pts);
        for (const sg of [-1, 1]) brush(s.map((q, j) => { const a = s[Math.max(0, j - 1)], b = s[Math.min(s.length - 1, j + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [q[0] - sg * TW * (b[1] - a[1]) / d, q[1] + sg * TW * (b[0] - a[0]) / d]; }), wt, { raw: true, seed: 40 + i * 2 + sg, t0: .05, t1: .05, pr: .55 });
      });
      for (const [x, y, w, h, sd] of Wd.chambers) blob(x, y, w / 2, h, a => 1 + .03 * Math.sin(a * 5 + sd), wt * 1.3, { half: true, fill: P.paper, seed: 60 + sd, pr: .55 });
      for (const [x, y, w, h, sd] of Wd.fungus) {  // fungo: nuvem de laços sobre o chão da câmara
        blob(x, y, w / 2 * .92, h * .8, a => 1 + .16 * Math.abs(Math.sin(a * 6 + sd)), 0, { half: true, fill: P.paper, seed: 80 + sd });
        for (let i = 0; i < 11; i++) {
          const a = Math.PI * (1.04 + .92 * i / 10), r = w * (.07 + .03 * hash(sd + i)), row = i % 2 ? .55 : 1;
          loop(x + Math.cos(a) * w / 2 * .85 * row, y + Math.sin(a) * h * .72 * row + r * .5, r, r * .9, 0, i % 2 ? 2.4 : 3.4, { fill: P.paper, seed: sd * 20 + i, col: i % 2 ? mid : P.ink });
        }
        brush([[x - w / 2 * .95, y], [x + w / 2 * .95, y]], wt, { seed: 81 + sd, t0: .1, t1: .1 });
      }
    }
    if (Wd.tree) tree(Wd.tree.x, g(Wd.tree.x), Wd.tree.h, 0, P.ink);
    // P: árvores e postes ao fundo e o chafariz, em tinta clara (fundo distante não ganha cor nova); N: plantas
    for (const T of Wd.trees || []) tree(T.x, T.y, T.h, T.seed, mid);
    for (const L of Wd.lamps || []) lamp(L, mid);
    if (Wd.fountain) fountain(Wd.fountain, F.t, mid);
    for (const q of Wd.plants || []) plant(q, mid);
    if (Wd.nest) {  // boca do ninho: montinho e o buraco
      const x = Wd.nest.x ?? Wd.nest, y = g(x), k = (Wd.nest.r || 60) / 60;  // A: x; N: {x, y, r}
      brush([[x - 80 * k, g(x - 80 * k)], [x - 35 * k, y - 20 * k], [x + 35 * k, y - 20 * k], [x + 80 * k, g(x + 80 * k)]], 3, { seed: 25, t0: .3, t1: .3 });
      c.beginPath(); c.ellipse(x, y - 14 * k, 15 * k, 6 * k, 0, 0, TAU); c.fillStyle = P.ink; c.fill();
    }
    if (Wd.rock) {
      const [x, y, r] = Wd.rock, gy = g(x);
      blob(x, gy, r * 1.3, Math.max(r - (y - gy), .5 * r), a => 1 + .05 * Math.sin(a * 3), lw(r * z) * .9, { half: true, fill: P.paper, seed: 27 });
      brush([[x - .2 * r, gy - .35 * r], [x, gy - .15 * r], [x - .1 * r, gy]], lw(r * z) * .5, { seed: 28 });
    }
    brush(gp, 3.6, { raw: true, t0: 0, t1: 0, seed: 3, wob: 1.2 });
    if (Wd.antGround) profile(F, 1, Wd.antGround, 2.4, mid);  // trilha das formigas, à frente
    const T = TUFT[F.shot] || 40, st = T * 6, wet = Wd.lake ? Wd.lake.x0 - T : Infinity;  // sem tufo dentro d'água
    for (let i = Math.floor(x0 / st); i <= x1 / st; i++) if (hash(i) > .45) { const x = (i + hash(i + .5)) * st; if (x < wet) tuft(x, g(x), T * (.7 + .6 * hash(i + 2)), i, lw(T * z) * .55); }
  }
  // Árvore de palito: tronco de um traço, galho, copa num contorno de nuvem.
  function tree(x, y, h, sd, col) {
    brush([[x - 6, y], [x + 6, y - .3 * h], [x - 4, y - .62 * h]], 9, { seed: 21 + sd * 7, t0: 0, t1: .3, col });
    brush([[x + 2, y - .45 * h], [x + .14 * h, y - .58 * h]], 4, { seed: 22 + sd * 7, t0: 0, t1: .8, col });
    blob(x, y - .8 * h, .3 * h, .22 * h, a => 1 + .16 * Math.abs(Math.sin(a * 4 + 1 + sd)), 4, { fill: P.paper, seed: 23 + sd * 7, col });
  }
  // Poste: haste de um traço e a lanterna em gota com a cobertura.
  function lamp(L, col) {
    const { x, y, h, seed: sd } = L;
    brush([[x, y], [x + 2, y - .55 * h], [x - 1, y - .92 * h]], 7, { seed: 110 + sd, t0: 0, t1: .2, col });
    brush([[x - 1, y - .92 * h], [x + .06 * h, y - .97 * h], [x + .1 * h, y - .9 * h]], 4, { seed: 111 + sd, t0: .1, t1: .3, col });
    loop(x + .1 * h, y - .86 * h, .025 * h, .04 * h, 0, 3.4, { fill: P.paper, col, seed: 112 + sd });
    brush([[x - .02 * h, y - .005 * h], [x + .02 * h, y - .005 * h]], 8, { seed: 113 + sd, t0: .2, t1: .2, col });
  }
  // Chafariz: bacia larga, coluna, prato de cima e dois arcos d'água que fervem com o tempo.
  function fountain(Fo, t, col) {
    const { x, y, r } = Fo, k = Math.floor(t * 6);
    brush([[x - r, y - .2 * r], [x - .85 * r, y], [x + .85 * r, y], [x + r, y - .2 * r]], 3.4, { seed: 121, t0: .05, t1: .05, col });  // bacia
    brush([[x - 1.03 * r, y - .2 * r], [x + 1.03 * r, y - .2 * r]], 3, { seed: 120, t0: .1, t1: .1, col });
    brush([[x, y - .2 * r], [x, y - .7 * r]], 7, { seed: 122, t0: 0, t1: 0, col });
    brush([[x - .35 * r, y - .72 * r], [x, y - .64 * r], [x + .35 * r, y - .72 * r]], 3.4, { seed: 123, t0: .1, t1: .1, col });
    for (const sg of [-1, 1]) brush([[x, y - .78 * r], [x + sg * .3 * r, y - 1.05 * r], [x + sg * .55 * r, y - .7 * r], [x + sg * .7 * r, y - .3 * r]], 2.2, { seed: 124 + sg + k, t0: .2, t1: .6, col: mixCol(col, P.paper, .4) });
  }
  // Plantas de N: árvore, flor (haste e laço), capim (tufo) e taboa (haste alta e espiga cheia).
  function plant(q, col) {
    const { x, y, h, seed: sd } = q;
    if (q.kind === 'tree') return tree(x, y, h, sd, col);
    if (q.kind === 'grass') return tuft(x, y, h, 200 + sd, 2.4, col);
    const lean = (hash(sd + 3) - .5) * .25 * h, tip = [x + lean, y - h];
    brush([[x, y], [x + lean * .3, y - .5 * h], tip], q.kind === 'reed' ? 3.4 : 2.4, { seed: 210 + sd, t0: 0, t1: .5, col });
    if (q.kind === 'flower') { loop(tip[0], tip[1], .13 * h, .11 * h, 0, 2.4, { fill: P.paper, col, seed: 220 + sd }); dot(tip[0], tip[1], .045 * h, col); brush([[x + lean * .2, y - .3 * h], [x + lean * .2 + .14 * h, y - .42 * h]], 2.2, { seed: 230 + sd, t0: 0, t1: .8, col }); }
    else loop(lerp(x, tip[0], .78), y - .78 * h, .035 * h, .12 * h, Math.atan2(lean, h), 2.4, { fill: col, col, seed: 240 + sd });  // espiga da taboa
  }
  // Banco de perfil (P): assento, pés e encosto. O assento encosta no traço da coxa de quem senta: seatY fica .05 BL
  // abaixo da pelve (meia largura de uma coxa grossa); aqui sobe até a meia largura do traço de palito (w = .3 BL).
  function bench(B, F) {
    const S = B.w / .3, top = B.seatY - .05 * S + lw(S * z) * 1.1 / z / 2, x0 = B.x - B.w / 2, x1 = B.x + B.w / 2, bk = B.back < 0 ? x0 : x1, gy = F.world.ground(B.x), wd = lw(B.w * z) * .9;
    brush([[x0 - .03 * B.w, top + .02 * B.w], [x1 + .03 * B.w, top + .02 * B.w]], wd * 1.5, { seed: 130, t0: .05, t1: .05 });
    [x0 + .08 * B.w, x1 - .08 * B.w].forEach((xx, i) => brush([[xx, top + .03 * B.w], [xx, gy]], wd, { seed: 131 + i, t0: 0, t1: 0 }));
    brush([[bk, top], [bk - B.back * .06 * B.w, top - B.backH]], wd, { seed: 133, t0: 0, t1: .1 });
    brush([[bk - B.back * .02 * B.w, top - .55 * B.backH], [bk - B.back * .08 * B.w, top - B.backH]], wd * 2.2, { seed: 134, t0: .1, t1: .1 });
  }
  // Flor (P, world.item): pétalas na cor de destaque em volta do miolo de tinta, maior que r (legível no plano aberto).
  // No chão: deitada sobre o chão (y + r), haste no chão; na mão: a haste passa pela ponta da mão (x, y), a flor acima.
  function flower(I) {
    const { x, y, r } = I, w = lw(5 * r * z) * .8, k = 1.5 * r, [hx, hy] = I.held ? [x + .4 * k, y - 2.2 * k] : [x, y + r - 1.25 * k];
    brush(I.held ? [[x - .15 * k, y + .9 * k], [x, y], [hx, hy]] : [[x - 2.6 * k, y + r], [x - 1.2 * k, y + r - .1 * k], [hx, hy]], w, { seed: 170, t0: 0, t1: .2 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .3; loop(hx + Math.cos(a) * .6 * k, hy + Math.sin(a) * .6 * k, .5 * k, .36 * k, a, w * .7, { fill: P.accent, seed: 171 + i }); }
    dot(hx, hy, .3 * k);
  }
  // Lago (N), por cima dos seres: água em papel acinzentado quase opaca da linha d'água ao fundo (cobre o que está
  // submerso: o peixe, as patas da raposa), riscos d'água, a linha d'água, ondas e respingos.
  function lake(F) {
    const Lk = F.world.lake, g = F.world.ground, [x0v, x1v] = span(F, 1), xa = Math.max(Lk.x0, x0v), xb = Math.min(Lk.x1, x1v), y = Lk.waterY; if (xa >= xb) return;
    const pts = []; for (let x = xa; x <= xb + 14 / z; x += 14 / z) pts.push([x, y]);
    c.beginPath(); c.moveTo(xa, y); for (const [x] of pts) c.lineTo(x, Math.max(y, g(x))); c.lineTo(pts.at(-1)[0], y); c.closePath();
    c.globalAlpha = .88; c.fillStyle = mixCol(P.paper, P.ink, .06); c.fill(); c.globalAlpha = 1;
    const st = 90; for (let i = Math.ceil(xa / st); i * st < xb; i++) { const x = i * st + 40 * hash(i + 9), d = 14 + 40 * hash(i + 3); if (g(x) > y + d + 6) brush([[x, y + d], [x + 34 + 30 * hash(i), y + d]], 1.8, { seed: 140 + i, t0: .4, t1: .4, col: mixCol(P.ink, P.paper, .7) }); }
    brush(pts, 3, { raw: true, t0: 0, t1: 0, seed: 141, wob: 1 });
    for (const R of F.world.ripples) {  // onda: elipse rasa que abre e some em 3 s
      const u = (F.t - R.t0) / 3;
      for (const k of [0, .35]) { const v = clamp((u - k * .4) * 1.3), e = .15 + .85 * ease(v); if (v > 0) loop(R.x, R.y, R.r * e, R.r * .12 * e, 0, 2.6 * (1 - u), { seed: 150 + k * 10, col: mixCol(P.ink, P.paper, .3 + .5 * u) }); }
    }
    for (const Sp of F.world.splashes) {  // respingo: gotas em arco balístico que caem e somem em 1,2 s
      const u = (F.t - Sp.t0) / 1.2;
      for (let i = 0; i < 9; i++) {
        const vx = (i - 4) / 4 * Sp.r * (.8 + .4 * hash(i + Sp.x)), vy = Sp.r * (1.6 + .9 * hash(i + 2 + Sp.x)) * (1 - Math.abs(i - 4) / 7), x = Sp.x + vx * u, yy = y - vy * 4 * u * (1 - u) * .9;
        if (yy < y) { c.globalAlpha = 1 - u; dot(x, yy, (5 - 3 * u) * (.7 + .5 * hash(i)), P.ink); }
      }
      c.globalAlpha = 1;
      if (u < .4) for (const sg of [-1, 1]) brush([[Sp.x + sg * .15 * Sp.r, y], [Sp.x + sg * .35 * Sp.r, y - .5 * Sp.r * (1 - u * 2)]], 3, { seed: 160 + sg, t0: .1, t1: .7 });
    }
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
    const p = a.pose, J = p.joints, hero = a.role === 'hero', back = a.role === 'back', sd = sid(a.id) * 10, G = byName(antParts(a));
    const k = clamp((90 - p.size * z) / 45), small = k > .5, w = antW(a, k), ink = back ? P.faint : P.ink, far = back ? mixCol(P.faint, P.paper, .4) : mixCol(P.ink, P.paper, .45);
    const [th, pe, ga] = p.spine, limbs = Object.keys(p.limbs).map(n => ({ n, far: p.limbs[n].far })), hd = G.head, hr = d2(...hd.pts) / 2, ha = ang(...hd.pts);
    const leg = (l, col, m, i) => stroke([G[l.n + '.upper'], G[l.n + '.lower']], { col, seed: sd + i, t0: .12, t1: .6 });
    if (hero) speed(a, F, ga.x - p.facing * ga.r * 1.5, [th.y, ga.y - .3 * ga.r, ga.y + .4 * ga.r], w * .7);
    limbs.forEach((l, i) => l.far && leg(l, far, .8, i));
    brush(p.appendages.antennaR || [], w * (hero ? 1.1 : .7), { col: far, seed: sd + 8, t0: .1, t1: .6 });
    // Pequena na tela vira bolinhas cheias de tinta (contorno vazio viraria borrão), em transição suave com o tamanho.
    // Pequenas (túneis, fila) engordam um pouco: silhueta preta legível. A protagonista: papel, aguada laranja parcial
    // deslocada (não chapada) e o contorno de pincel por cima.
    const fb = hero ? P.paper : mixCol(P.paper, ink, k), g = 1 + .35 * k;
    const bub = (q, rx, ry, a, m, s) => {
      rx *= g; ry *= g;
      if (!hero) return loop(q.x, q.y, rx, ry, a, w * m * (1 - .5 * k), { fill: fb, col: ink, seed: sd + s });
      loop(q.x, q.y, rx, ry, a, 0, { fill: P.paper, seed: sd + s });
      const co = Math.cos(a), si = Math.sin(a), ox = -.14 * rx, oy = -.12 * ry;
      c.globalAlpha *= .85; loop(q.x + ox * co - oy * si, q.y + ox * si + oy * co, rx * .78, ry * .72, a + .1, 0, { fill: P.accent, seed: sd + s + 5 }); c.globalAlpha = a0;
      loop(q.x, q.y, rx, ry, a, w * m, { col: ink, seed: sd + s });
    }, a0 = c.globalAlpha;
    stroke([G.neck], { col: ink, seed: sd + 7, t0: 0, t1: 0 });  // pescoço: fica sob o tórax e a cabeça
    bub(ga, ga.r * 1.25, ga.r * .95, ga.angle, 1, 11); bub(pe, pe.r * 1.2, pe.r * .9, pe.angle, .8, 12);
    bub(th, th.r * 1.4, th.r * .8, th.angle, 1, 13);
    limbs.forEach((l, i) => !l.far && leg(l, ink, 1, i));  // pernas de cá antes da cabeça: não cruzam o olho
    bub(p.head, hr / g, hd.r / g, ha, 1, 14);  // cabeça: eixo base → topo = 2r (sem engordar), largura hd.r
    if (!small) {
      c.save(); c.translate(...J.head); c.rotate(ha); c.scale(1, p.facing);
      brush([[.75 * hr, .3 * hr], [1.15 * hr, .4 * hr], [1.05 * hr, .62 * hr]], w * .8, { col: ink, seed: sd + 15, t0: .2, t1: .7 });  // mandíbula
      if (hero) { loop(.38 * hr, -.18 * hr, .34 * hr, .38 * hr, 0, w * .6, { fill: P.paper, col: ink, seed: sd + 16 }); dot(.5 * hr, -.16 * hr, .15 * hr); dot(.45 * hr, -.24 * hr, .05 * hr, P.paper); }
      else dot(.4 * hr, -.18 * hr, .17 * hr, ink);
      c.restore();
    }
    brush(p.appendages.antennaL || [], w * (hero ? 1.3 : .8), { col: ink, seed: sd + 9, t0: .1, t1: .6 });
    if (p.carry) leaf(p.carry, w, P.paper, hero ? mixCol(P.ink, P.paper, .45) : ink, sd + 20);
  }
  // Folha cortada: gota de contorno com a nervura; gira pelo ângulo do pedaço.
  function leaf(L, w, fill, col, sd) {
    const co = Math.cos(L.angle), si = Math.sin(L.angle), to = ([u, v]) => [L.x + u * co - v * si, L.y + u * si + v * co], top = [], bot = [];
    for (let i = 0; i <= 12; i++) { const u = -1 + 2 * i / 12, v = L.h / 2 * (1 - u * u) ** .7 * (1 + .25 * u); top.push(to([u * L.w / 2, -v])); bot.push(to([u * L.w / 2, v])); }
    const pts = [...top, ...bot.reverse()];
    c.beginPath(); for (const q of pts) c.lineTo(q[0], q[1]); c.closePath(); c.fillStyle = fill; c.fill();
    if (L.w * z > 60) for (let i = 1; i < 12; i++) {  // hachura leve, inclinada, de borda a borda
      const u = -1 + 2 * i / 12, v = L.h / 2 * (1 - u * u) ** .7 * (1 + .25 * u) * .8;
      brush([to([u * L.w / 2 - .08 * L.w, -v]), to([u * L.w / 2 + .04 * L.w, v])], w * .35, { col: mixCol(col, P.paper, .4), seed: sd + 3 + i, t0: .3, t1: .3 });
    }
    brush(pts, w * .85, { raw: true, col, seed: sd, t0: .05, t1: .05 });
    brush([to([-L.w / 2, 0]), to([0, -.04 * L.h]), to([.38 * L.w, 0])], w * .5, { col, seed: sd + 1 });
  }

  // ---------- Forídea ----------
  // Rabisco de corpo (laçadas do tórax ao abdome), cabeça de bolinha e duas asas em gota que batem pela fase.
  function fly(a) {
    const p = a.pose, S = p.size, f = p.facing, w = lw(S * z) * .9, [th, ab] = p.spine;
    const fl = p.wings ? Math.sin(p.wings.phase * TAU) : 0;
    for (const [k, col, fill] of [[-.45, mixCol(P.ink, P.paper, .55), mixCol(P.paper, P.ink, .06)], [0, P.ink, P.paper]]) {
      const ang = -Math.PI / 2 - f * (.55 + k) + f * .8 * fl, bx = th.x, by = th.y - th.r * .5;
      loop(bx + Math.cos(ang) * .3 * S, by + Math.sin(ang) * .3 * S, .32 * S, .1 * S, ang, w * .7, { fill, col, seed: 50 + k * 10 });
    }
    for (let i = 0; i < 3; i++) { const x = th.x + f * (i - 1) * .06 * S, y = th.y + th.r * .5; brush([[x, y], [x - f * .03 * S, y + .1 * S], [x - f * .01 * S, y + .18 * S]], w * .5, { seed: 60 + i, t0: 0, t1: .8 }); }
    const pts = [], N = 16;
    for (let i = 0; i <= N; i++) { const u = i / N, r = lerp(th.r * 1.1, ab.r * .9, u), x = lerp(th.x + f * th.r * .2, ab.x - f * ab.r * .5, u), y = lerp(th.y, ab.y, u), q = u * TAU * 2.6 + 1; pts.push([x + r * Math.cos(q), y + r * .85 * Math.sin(q)]); }
    brush(pts, w, { seed: 64, t0: .1, t1: .4 });
    const hc = p.joints.head, hr = flyParts(a)[0].r;  // cabeça: círculo no eixo base → topo
    loop(hc[0], hc[1], hr, hr, 0, w * .8, { fill: P.paper, seed: 66 });
    dot(hc[0] + f * .35 * hr, hc[1] - .1 * hr, .32 * hr);
  }

  // ---------- Bichos de N ----------
  // Cabeça de bicho no quadro local: x à frente pelo eixo headBase → headTop (o focinho ou o bico ficam em headTop),
  // y para baixo (espelhado pelo facing). Contorno de mão; hero = papel com aguada da cor de destaque.
  const wash = (fn, k = .85) => { const a0 = c.globalAlpha; c.globalAlpha *= k; fn(); c.globalAlpha = a0; };
  // Contorno fechado em volta de um eixo (cauda, corpo): meia largura rf(u), u = 0..1 ao longo de pts suavizados.
  function tube(pts, rf) {
    const s = smooth(pts), n = s.length, L = [], Rr = [];
    s.forEach((q, i) => { const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)], d = d2(a, b) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, r = rf(i / (n - 1)); L.push([q[0] + nx * r, q[1] + ny * r]); Rr.push([q[0] - nx * r, q[1] - ny * r]); });
    return [...L, ...Rr.reverse()];
  }
  const fillPts = (pts, col) => { c.beginPath(); for (const [x, y] of pts) c.lineTo(x, y); c.closePath(); c.fillStyle = col; c.fill(); };
  function beastHead(J, R, r, rot, f, w, o, face) {
    const hero = o.hero, sd = o.seed;
    c.save(); c.translate(...J.head); c.rotate(rot); c.scale(1, f);
    if (o.behind) o.behind();
    if (o.snout) {  // gota deitada: nuca redonda, focinho que afina até headTop (x = R)
      const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, k = Math.max(0, Math.cos(a)); pts.push([R * Math.cos(a), r * Math.sin(a) * (1 - o.snout * k ** 1.6) * (1 + .25 * (1 - k))]); }
      const fill = (q, col) => { c.beginPath(); for (const [x, y] of q) c.lineTo(x, y); c.closePath(); c.fillStyle = col; c.fill(); };
      fill(pts, P.paper); if (hero) wash(() => fill(pts.map(([x, y]) => [x * .82 - .14 * R, y * .72 - .1 * r]), P.accent));
      brush([...pts, pts[1]], w, { raw: true, seed: sd, t0: .05, t1: .05, col: o.col });
    } else {
      loop(0, 0, R, r, 0, 0, { fill: o.fill || P.paper, seed: sd });
      if (hero) wash(() => loop(-.12 * R, -.12 * r, .8 * R, .7 * r, .05, 0, { fill: P.accent, seed: sd + 5 }));
      loop(0, 0, R, r, 0, w, { col: o.col || P.ink, seed: sd });
    }
    if (face) face();
    c.restore();
  }

  // Raposa (kind dog): tronco de um traço grosso, pescoço, pernas de três ossos com a pata, cauda cheia na cor de destaque
  // e cabeça comprida (focinho em headTop, na linha d'água quando bebe), orelhas em pé, olho que arregala no susto.
  function dog(a) {
    const p = a.pose, J = p.joints, f = p.facing, G = byName(beastParts(a)), hd = G.head, R = d2(...hd.pts) / 2, w = lw(p.size * z), sd = sid(a.id) * 10;
    const far = mixCol(P.ink, P.paper, .45), sur = p.face.expression === 'surprised', b = p.face.blink || 0;
    const leg = (n, col, i) => {  // perna com peso: coxa laranja, canela e pata de meia escura
      stroke([G[n + '.upper'], G[n + '.lower']], { col, seed: sd + i, t0: .02, t1: .02, pr: .1 });
      if (col === P.ink) wash(() => stroke([G[n + '.upper']], { col: P.accent, seed: sd + i, t0: .02, t1: .4, pr: .1 }), .9);
      stroke([G[n + '.tip']], { col, seed: sd + i + 10, t0: 0, t1: .45 });
    };
    const legs = Object.keys(p.limbs);
    legs.forEach((n, i) => p.limbs[n].far && leg(n, far, i));
    const S = p.size, tail = p.appendages.tail, [s0, , s2] = p.spine.map(q => [q.x, q.y]);
    if (tail) {  // cauda cheia: engrossa e afina na ponta clara; papel, aguada laranja e contorno
      const prof = u => S * (.015 + .075 * Math.sin(Math.PI * u) ** .7 * (u < .6 ? 1 : 1 - .3 * (u - .6)));  // fina na raiz e na ponta
      const tp = tube(tail, prof);
      fillPts(tp, P.paper); wash(() => fillPts(tube(tail.slice(0, -1).concat([lerp2(tail.at(-2), tail.at(-1), .4)]), u => .85 * prof(u * .8)), P.accent), .95);
      brush([...tp, tp[0]], w, { raw: true, seed: sd + 21, t0: .05, t1: .05 });
    }
    stroke([G.upperSpine, G.neck], { seed: sd + 31, t0: .1, t1: 0 });
    const L = d2(s0, s2), bc = lerp2(s0, s2, .45), ba = ang(s2, s0);  // corpo: feijão preso no peito e no quadril
    loop(bc[0], bc[1], L / 2 + .13 * S, .12 * S, ba, 0, { fill: P.paper, seed: sd + 30 });
    wash(() => loop(bc[0] - .02 * S, bc[1] - .02 * S, L / 2 + .06 * S, .085 * S, ba + .03, 0, { fill: P.accent, seed: sd + 32 }));
    loop(lerp(bc[0], s0[0], .7), lerp(bc[1], s0[1], .7) + .06 * S, .1 * S, .055 * S, ba, 0, { fill: P.paper, seed: sd + 33 });  // peito branco
    loop(bc[0], bc[1], L / 2 + .13 * S, .12 * S, ba, w * 1.2, { seed: sd + 30 });
    legs.forEach((n, i) => !p.limbs[n].far && leg(n, P.ink, i));
    const r = hd.r;
    beastHead(J, R, r, ang(...hd.pts), f, w * 1.1, { hero: true, snout: .75, seed: sd + 40, behind: () => {
      for (const k of [1, 0]) {  // orelhas grandes em pé, laranja com a ponta escura; no susto, mais altas
        const x0 = (-.6 + .32 * k) * R, hgt = (sur ? 1.25 : 1) * (1.25 - .2 * k) * R, tip = [x0 + .05 * R, -r - hgt];
        const pts = [[x0 - .26 * R, -.5 * r], tip, [x0 + .3 * R, -.45 * r]];
        fillPts(pts, k ? mixCol(P.accent, P.paper, .35) : P.accent);
        fillPts([tip, lerp2(tip, pts[0], .35), lerp2(tip, pts[2], .35)], P.ink);
        brush(pts, w * .9, { col: k ? far : P.ink, seed: sd + 45 + k, t0: .1, t1: .1 });
      }
    } }, () => {
      fillPts([[.98 * R, .08 * r], [.4 * R, .62 * r], [-.25 * R, .8 * r], [-.3 * R, .3 * r], [.3 * R, .12 * r]], P.paper);  // focinho e bochecha brancos
      dot(.93 * R, -.05 * r, .2 * r);  // ponta do nariz
      brush([[.9 * R, .3 * r], [.55 * R, .5 * r], [.3 * R, .42 * r]], w * .7, { seed: sd + 50, t0: .2, t1: .6 });
      if (sur) { loop(-.1 * R, -.32 * r, .2 * r, .24 * r, 0, w * .6, { fill: P.paper, seed: sd + 51 }); dot(-.06 * R, -.32 * r, .08 * r); }
      else if (b > .55) brush([[-.22 * R, -.3 * r], [-.08 * R, -.24 * r], [.04 * R, -.3 * r]], w * .7, { seed: sd + 52, t0: .2, t1: .2 });
      else { c.beginPath(); c.ellipse(-.1 * R, -.3 * r, .1 * r, .16 * r * (1 - b), 0, 0, TAU); c.fillStyle = P.ink; c.fill(); }
    });
  }

  // Pássaro: corpo de ovo preso em spine0–spine1, cauda, asas (abertas batendo pela fase no voo, dobradas no corpo
  // pousado), pescoço, cabeça redonda com bico em headTop, pernas finas com dedos.
  function bird(a) {
    const p = a.pose, J = p.joints, f = p.facing, G = byName(beastParts(a)), hd = G.head, R = d2(...hd.pts) / 2, w = lw(p.size * z) * .8, sd = sid(a.id) * 10, [s0, s1] = p.spine;
    const far = mixCol(P.ink, P.paper, .45), leg = (n, col, i) => { stroke([G[n + '.upper'], G[n + '.lower']], { col, seed: sd + i, t0: .1, t1: .05 }); stroke([G[n + '.tip']], { col, seed: sd + i + 10, t0: 0, t1: .4 }); };
    const W = p.wings || { open: 0, phase: 0 }, fl = Math.sin(W.phase * TAU), bc = lerp2([s0.x, s0.y], [s1.x, s1.y], .45), ba = ang([s1.x, s1.y], [s0.x, s0.y]), L = d2([s0.x, s0.y], [s1.x, s1.y]);
    const wing = (k, col, fill) => {  // asa aberta: gota que sai do ombro e sobe ou desce com a batida
      const an = -Math.PI / 2 - f * (.35 + k) + f * 1.1 * fl, rx = .42 * p.size, cx = s0.x + Math.cos(an) * rx * .85, cy = s0.y - .2 * s0.r + Math.sin(an) * rx * .85;
      loop(cx, cy, rx, .11 * p.size, an, w, { fill, col, seed: sd + 60 + k * 10 });
    };
    Object.keys(p.limbs).forEach((n, i) => p.limbs[n].far && leg(n, far, i));
    if (W.open) wing(-.5, far, mixCol(P.paper, P.ink, .08));
    if (p.appendages.tail) brush([[s1.x, s1.y], ...p.appendages.tail.slice(1)], w * 2.6, { seed: sd + 20, t0: .2, t1: .4 });
    stroke([G.upperSpine, G.neck], { seed: sd + 31, t0: 0, t1: 0 });
    loop(bc[0], bc[1], L / 2 + s0.r * .95, s0.r * .9, ba, w * 1.2, { fill: P.paper, seed: sd + 30 });
    if (!W.open) loop(bc[0] - f * .02 * p.size, bc[1] - .1 * s0.r, L / 2 + .3 * s0.r, .45 * s0.r, ba + f * .12, w * .8, { fill: mixCol(P.paper, P.ink, .08), seed: sd + 32 });  // asa dobrada
    Object.keys(p.limbs).forEach((n, i) => !p.limbs[n].far && leg(n, P.ink, i));
    beastHead(J, R, hd.r, ang(...hd.pts), f, w * 1.1, { seed: sd + 40 }, () => {
      const bk = [[.8 * R, -.28 * R], [1.6 * R, .02 * R], [.8 * R, .28 * R]];  // bico depois do topo da cabeça
      c.beginPath(); for (const q of bk) c.lineTo(...q); c.closePath(); c.fillStyle = P.ink; c.fill();
      if ((p.face.blink || 0) > .55) brush([[.05 * R, -.2 * R], [.3 * R, -.2 * R]], w * .7, { seed: sd + 41, t0: .2, t1: .2 });
      else { dot(.2 * R, -.22 * R, .16 * R); dot(.24 * R, -.27 * R, .05 * R, P.paper); }
    });
    if (W.open) wing(0, P.ink, P.paper);
  }

  // Peixe: contorno fechado pelas juntas (topo da cabeça → coluna → cauda, meia altura = raio de cada segmento), nadadeira
  // caudal em forquilha, peitoral, escamas em meia-lua e olho; o pescoço fica sob o corpo. A água vem por cima depois.
  function fish(a) {
    const p = a.pose, J = p.joints, f = p.facing, G = byName(beastParts(a)), hd = G.head, R = d2(...hd.pts) / 2, w = lw(p.size * z), sd = sid(a.id) * 10;
    const ax = [J.headTop, J.head, ...p.spine.map(q => [q.x, q.y])], rs = [.35 * R, .95 * R, ...p.spine.map(q => q.r)], top = [], bot = [];
    ax.forEach((q, i) => { const A = ax[Math.max(0, i - 1)], B = ax[Math.min(ax.length - 1, i + 1)], d = d2(A, B) || 1, nx = -(B[1] - A[1]) / d * f, ny = (B[0] - A[0]) / d * f; top.push([q[0] - nx * rs[i], q[1] - ny * rs[i]]); bot.push([q[0] + nx * rs[i] * .85, q[1] + ny * rs[i] * .85]); });
    const cd = p.appendages.caudal, pc = p.appendages.pectoral;
    if (cd) {  // forquilha: da base da cauda a duas pontas que abrem para os lados do último osso
      const [b0, , b2] = cd, e = b2 || cd[1], u = [e[0] - b0[0], e[1] - b0[1]], n = [-u[1] * .55, u[0] * .55], fin = [b0, [e[0] + n[0], e[1] + n[1]], [lerp(b0[0], e[0], .7), lerp(b0[1], e[1], .7)], [e[0] - n[0], e[1] - n[1]]];
      fillPts(fin, mixCol(P.ink, P.paper, .35));
      brush([...fin, b0], w, { seed: sd + 5, t0: .05, t1: .05 });
    }
    stroke([G.neck], { seed: sd + 6, t0: 0, t1: 0 });
    const out = [...smooth(top), ...smooth(bot).reverse()];
    fillPts(out, mixCol(P.ink, P.paper, .5));  // corpo cheio: destaca na água clara
    for (let i = 2; i < ax.length - 1; i++) for (const k of [-.3, .25]) {  // escamas: meias-luas ao longo do corpo
      const q = lerp2(ax[i], ax[i + 1], .5), r = rs[i] * .32, an = ang(ax[i + 1], ax[i]);
      brush([0, 1, 2].map(j => { const t = an + Math.PI / 2 + (j - 1) * 1.1; return [q[0] + Math.cos(an + Math.PI / 2) * k * rs[i] * f + Math.cos(t) * r * .3 - Math.cos(an) * r * (j === 1 ? 0 : .6), q[1] + Math.sin(an + Math.PI / 2) * k * rs[i] * f + Math.sin(t) * r * .3 - Math.sin(an) * r * (j === 1 ? 0 : .6)]; }), w * .5, { seed: sd + 10 + i, t0: .3, t1: .3, col: P.paper });
    }
    brush(out, w * 1.1, { raw: true, seed: sd + 7, t0: .04, t1: .04 });
    if (pc) brush(pc, w * 1.4, { seed: sd + 8, t0: 0, t1: .7 });
    const ha = ang(...hd.pts), ex = J.head[0] + Math.cos(ha) * .15 * R + Math.sin(ha) * f * .3 * R, ey = J.head[1] + Math.sin(ha) * .15 * R - Math.cos(ha) * f * .3 * R;
    loop(ex, ey, .26 * R, .26 * R, 0, w * .6, { fill: P.paper, seed: sd + 9 }); dot(ex + Math.cos(ha) * .06 * R, ey + Math.sin(ha) * .06 * R, .12 * R);
  }

  // Borboleta: asas de gota (de trás em tinta clara, a da frente com pintas da cor de destaque) que batem pela fase,
  // tórax, abdome, pescoço sob eles, cabeça e antenas.
  function butterfly(a) {
    const p = a.pose, J = p.joints, f = p.facing, G = byName(beastParts(a)), hd = G.head, R = d2(...hd.pts) / 2, w = lw(p.size * z) * .8, S = p.size, sd = sid(a.id) * 10, [th, ab] = p.spine;
    const fl = Math.sin((p.wings ? p.wings.phase : 0) * TAU), far = mixCol(P.ink, P.paper, .5);
    const wing = (k, col, fill, spots) => {
      const open = .35 + .65 * Math.abs(fl), an = -Math.PI / 2 - f * (.15 + k) + f * .5 * fl, L = .9 * S * open;
      for (const [m, s] of [[1, 0], [.7, 1]]) {  // asa de cima (à frente) e a de baixo (atrás), gotas compridas
        const a2 = an - f * (s ? -.85 : .1), cx = th.x + Math.cos(a2) * L * m * .5, cy = th.y + Math.sin(a2) * L * m * .5;
        loop(cx, cy, L * m * .5, .22 * S * m * (.4 + .6 * open), a2, w, { fill, col, seed: sd + 60 + k * 10 + s });
        if (spots) wash(() => dot(cx + Math.cos(a2) * L * m * .18, cy + Math.sin(a2) * L * m * .18, .09 * S * m, P.accent), .9);
      }
    };
    wing(-.35, far, mixCol(P.paper, P.ink, .07), false);
    brush(p.appendages.antennaR || [], w * .6, { col: far, seed: sd + 8, t0: .1, t1: .6 });
    stroke([G.neck], { seed: sd + 6, t0: 0, t1: 0 });
    brush([[th.x, th.y], [ab.x, ab.y], [ab.x + (ab.x - th.x) * .5, ab.y + (ab.y - th.y) * .5]], 2.2 * ab.r * z, { seed: sd + 5, t0: .1, t1: .7 });  // abdome
    loop(th.x, th.y, th.r, th.r * .85, 0, w, { fill: P.ink, seed: sd + 4 });
    beastHead(J, R, hd.r, ang(...hd.pts), f, w, { seed: sd + 40, fill: P.ink });
    brush(p.appendages.antennaL || [], w * .7, { seed: sd + 9, t0: .1, t1: .6 });
    wing(0, P.ink, P.paper, true);
  }

  // Besouro: como a formiga, de bolinhas de contorno, mas cheio de tinta (casca escura) com um brilho de papel nos
  // élitros; pernas de dois ossos, antenas.
  function beetle(a) {
    const p = a.pose, J = p.joints, f = p.facing, G = byName(beastParts(a)), hd = G.head, R = d2(...hd.pts) / 2, w = lw(p.size * z), sd = sid(a.id) * 10, [pr, el] = p.spine;
    const far = mixCol(P.ink, P.paper, .45), leg = (n, col, i) => stroke([G[n + '.upper'], G[n + '.lower']], { col, seed: sd + i, t0: .12, t1: .6 });
    const legs = Object.keys(p.limbs);
    legs.forEach((n, i) => p.limbs[n].far && leg(n, far, i));
    brush(p.appendages.antennaR || [], w * .7, { col: far, seed: sd + 8, t0: .1, t1: .6 });
    stroke([G.neck], { seed: sd + 6, t0: 0, t1: 0 });
    loop(el.x, el.y, el.r * 1.15, el.r * .82, el.angle, w, { fill: P.ink, seed: sd + 11 });
    brush([[el.x - f * .6 * el.r, el.y - .45 * el.r], [el.x, el.y - .62 * el.r], [el.x + f * .5 * el.r, el.y - .5 * el.r]], w * .8, { col: P.paper, seed: sd + 12, t0: .3, t1: .5 });  // brilho
    loop(pr.x, pr.y, pr.r * 1.1, pr.r * .85, pr.angle, w, { fill: P.ink, seed: sd + 13 });
    legs.forEach((n, i) => !p.limbs[n].far && leg(n, P.ink, i));
    beastHead(J, R, hd.r, ang(...hd.pts), f, w, { seed: sd + 40, fill: P.ink }, () => dot(.35 * R, -.3 * hd.r, .2 * hd.r, P.paper));
    brush(p.appendages.antennaL || [], w * .8, { seed: sd + 9, t0: .1, t1: .6 });
  }

  // Linhas de movimento atrás de quem anda (x da traseira, alturas ys): velocidade pelo quadro de 0,1 s antes, no mesmo
  // plano (função pura de t). O quadro anterior é calculado uma vez por quadro (vários seres o consultam).
  let prevF = null;
  function speed(a, F, x, ys, w) {
    if (!prevF || prevF.scene !== F.scene || prevF.t !== F.t) prevF = { scene: F.scene, t: F.t, F: EST.frame(F.scene, F.t - .1) };
    const q = prevF.F.actors.find(b => b.id === a.id), S = a.pose.size, f = a.pose.facing;
    const mk = q && q.pose.size === S ? clamp(Math.abs(a.track.x - q.track.x) / .1 / S / .55) : 0;
    if (mk > .05) ys.forEach((y, i) => {
      const x0 = x - f * .05 * i * S, l = (.22 + .12 * hash(i + boil)) * S * mk;
      c.globalAlpha = mk * .8 * (a.alpha ?? 1); brush([[x0, y], [x0 - f * l, y]], w, { seed: 70 + i, t0: .05, t1: .9 });
    });
    c.globalAlpha = a.alpha ?? 1;
  }

  // ---------- Pessoas ----------
  // Corpo de palito só das juntas (humanParts): tronco (grosso conforme a girth) e pescoço, cabeça oval no osso da cabeça
  // com rosto que atua, pé e mão de traço grosso. Barriga (heavy), cabelo por pessoa, chapéu e mochila (gear) presos nas
  // juntas. late: só os braços de actor.front (abraço), desenhados depois de todos os corpos.
  function human(a, F, late) {
    const p = a.pose, J = p.joints, S = p.size, f = p.facing, G = byName(humanParts(a)), w = G.thighL.w, R = d2(J.headBase, J.headTop) / 2, sd = 500 + sid(a.id);
    const { chest, pelvis, neck } = J, hc = J.head, far = mixCol(P.ink, P.paper, .74), [fs, ns] = f > 0 ? ['R', 'L'] : ['L', 'R'], gear = a.gear || [], front = a.front || [];
    const leg = (s, col, i) => { stroke([G['thigh' + s], G['shin' + s]], { col, seed: sd + i, t0: .08, t1: .08 }); stroke([G['foot' + s]], { col, seed: sd + i + 10, t0: 0, t1: .35 }); };
    const arm = (s, col, i) => {
      if (front.includes('arm' + s) !== !!late) return;
      stroke([G['upperArm' + s], G['forearm' + s]], { col, seed: sd + i, t0: .08, t1: .3 });
      const h = G['hand' + s];
      if (p.limbs['arm' + s].hand === 'fist') { stroke([h], { col, seed: sd + i + 20, t0: 0, t1: .25 }); dot(...h.pts.at(-1), h.r * .75, col); }  // punho: ponta cheia
      else stroke([h], { col, seed: sd + i + 20, t0: 0, t1: .6 });
    };
    if (late) { arm(fs, far, 2); arm(ns, P.ink, 4); return; }
    speed(a, F, pelvis[0] - f * .16 * S, [chest[1] - .05 * S, lerp(chest[1], pelvis[1], .6) - .05 * S, pelvis[1] - .05 * S], w * .55);
    leg(fs, far, 1); arm(fs, far, 2);
    let ux = neck[0] - pelvis[0], uy = neck[1] - pelvis[1]; const ud = Math.hypot(ux, uy) || 1; ux /= ud; uy /= ud;
    const bx = -f * -uy, by = -f * ux;  // para trás, perpendicular ao tronco
    if (gear.includes('backpack')) {  // mochila: caixa de linha nas costas, alça por cima do ombro
      const pk = [lerp(pelvis[0], chest[0], .7) + bx * .065 * S, lerp(pelvis[1], chest[1], .7) + by * .065 * S];
      loop(pk[0], pk[1], .042 * S, .085 * S, Math.atan2(uy, ux) + Math.PI / 2, w * .9, { fill: P.paper, sq: .45, seed: sd + 30 });
      brush([[pk[0] - bx * .02 * S + ux * .08 * S, pk[1] - by * .02 * S + uy * .08 * S], [chest[0] + ux * .07 * S, chest[1] + uy * .07 * S], [chest[0] - bx * .05 * S, chest[1] - by * .05 * S]], w * .6, { seed: sd + 31 });
    }
    stroke([G.spine, G.upperSpine], { seed: sd + 32, t0: .15, t1: .12 });
    stroke([G.neck], { seed: sd + 33, t0: 0, t1: 0 });
    if (p.body === 'heavy') {  // tronco redondo e cheio, da pelve ao peito, à frente do traço da coluna
      const gi = BODY.heavy.girth * S, L = d2(pelvis, neck), q = lerp2(pelvis, neck, .44);
      loop(q[0] - bx * .25 * gi, q[1] - by * .25 * gi, .56 * L, gi, Math.atan2(uy, ux), w * 1.1, { fill: mixCol(P.ink, P.paper, .55), sq: .75, seed: sd + 34 });  // tronco cheio de tinta média: o braço de cá aparece por cima
    }
    leg(ns, P.ink, 3);
    head(a, p, J, R, G.head.r, w, F);
    arm(ns, P.ink, 4);
    const em = p.emote, Re = 1.7 * R;  // emote na escala de uma cabeça grande: legível no plano aberto
    if (em && em.a > 0) {  // emote ?/! à mão, na cor de destaque, acima e à frente da cabeça; no susto, linhas de impacto
      const a0 = p.head.angle, fx = Math.cos(a0), fy = Math.sin(a0), upx = f * Math.sin(a0), upy = -f * Math.cos(a0), ks = Math.max(0, em.k);
      c.globalAlpha = em.a * (a.alpha ?? 1);
      emote(em.sym, hc[0] + upx * 1.7 * Re + fx * 1.7 * Re, hc[1] + upy * 1.7 * Re + fy * 1.7 * Re, Re * 1.3 * ks, w * 1.8);
      if (em.sym === '!') for (let i = 0; i < 7; i++) {
        const an = -Math.PI * (.05 + i * .15), d0 = 1.6 * R, d1 = d0 + .8 * Re * Math.min(1.2, ks);
        brush([[hc[0] + Math.cos(an) * d0, hc[1] + Math.sin(an) * d0], [hc[0] + Math.cos(an) * d1, hc[1] + Math.sin(an) * d1]], w * .8, { seed: 90 + i, t0: .05, t1: .7 });
      }
      c.globalAlpha = a.alpha ?? 1;
    }
  }
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  // Cabeça no quadro local (x à frente, y para baixo, −y = eixo headBase → headTop), oval de meia altura R e meia largura
  // RX centrada em joints.head; rosto por expressão (neutral, curious, surprised, happy), piscar, boca da fala
  // (pose.face.mouth: m, e, a, o), cabelo por pessoa e chapéu (gear; pula no susto de H).
  function head(a, p, J, R, RX, w, F) {
    const e = p.face.expression, b = p.face.blink || 0, em = p.emote, pop = e === 'surprised' && em ? clamp(em.k, 0, 1.4) : e === 'surprised' ? 1 : 0;
    const f = p.facing, ux = (J.headTop[0] - J.headBase[0]) / (2 * R), uy = (J.headTop[1] - J.headBase[1]) / (2 * R), sd = sid(a.id), hair = mixCol(P.ink, P.paper, .15);
    c.save(); c.translate(...J.head); c.rotate(Math.atan2(f * ux, -f * uy)); c.scale(1, f);
    const Rp = pts => pts.map(([x, y]) => [x * RX, y * R]);
    // Cabelo cheio por pessoa (silhueta legível no plano aberto): mancha de tinta contornada, presa na cabeça.
    const mass = (pts, s2) => { const q = smooth(Rp(pts)); fillPts(q, hair); brush([...q, q[1]], w * .7, { raw: true, seed: sd + s2, t0: .05, t1: .05 }); };
    const hatless = !(a.gear || []).includes('hat');
    // atrás da cabeça: coque e cachos (heavy), maria-chiquinha com laço (child), cabelo comprido até o ombro (thin)
    if (p.body === 'heavy') { loop(-.78 * RX, -.82 * R, .36 * R, .33 * R, 0, w * .8, { fill: hair, seed: sd + 1 }); for (let i = 0; i < 6; i++) { const an = -Math.PI * (.35 + .13 * i); loop(Math.cos(an) * .98 * RX, Math.sin(an) * .98 * R, .3 * R, .27 * R, 0, w * .6, { fill: hair, seed: sd + 20 + i }); } }
    if (p.body === 'child') for (const [x, y, s2] of [[-1.05, -.4, 2], [-.9, .15, 3]]) { loop(x * RX, y * R, .3 * R, .22 * R, .6, w * .7, { fill: hair, seed: sd + s2 }); dot(x * RX + .2 * R, y * R - .12 * R, .11 * R, P.accent); }
    if (p.body === 'thin') mass([[.5, -.82], [.1, -1.12], [-.5, -1.08], [-1.02, -.62], [-1.16, .2], [-1.05, .95], [-.78, 1.3], [-.52, 1.02], [-.66, .4], [-.6, -.3], [-.2, -.66], [.3, -.62]], 4);
    loop(0, 0, RX, R, 0, w * .85, { fill: P.paper, seed: 510 + sd });
    // por cima: cabelo curto e faixa (corredor), cabelo curto e cavanhaque (adulto sem chapéu), boné de aba e cabelo
    // branco de lado (idoso), franja (heavy, child)
    if (a.id === 'corredor') { mass([[.4, -.78], [0, -1.08], [-.6, -1], [-1.02, -.5], [-.88, -.25], [-.5, -.62], [0, -.74]], 5); brush(Rp([[-.98, -.42], [0, -.6], [.98, -.44]]), w * 1.5, { seed: sd + 6, t0: .05, t1: .05, col: P.accent }); }
    else if (p.body === 'adult' && hatless) { mass([[.55, -.75], [.2, -1.1], [-.4, -1.07], [-.92, -.7], [-1.1, -.1], [-.88, .18], [-.75, -.22], [-.52, -.56], [0, -.72], [.42, -.6]], 5); mass([[.22, .6], [.5, .92], [.82, .66], [.72, .58], [.5, .72], [.3, .55]], 7); }
    else if (p.body === 'elder') {
      for (const k of [0, 1]) brush(Rp([[-1.02, .25 - .25 * k], [-.86, -.15 - .2 * k], [-.66, -.35 - .2 * k]]), w * 1.1, { seed: sd + 7 + k, t0: .2, t1: .5, col: P.faint });
      mass([[-.98, -.42], [-.85, -.98], [-.1, -1.18], [.62, -1.0], [.92, -.58], [.3, -.55], [-.4, -.5]], 8);
      brush(Rp([[.4, -.56], [1.05, -.6], [1.45, -.5]]), w * 1.8, { seed: sd + 9, t0: .05, t1: .3 });  // aba do boné
    }
    else if (p.body === 'heavy' || p.body === 'child') mass([[.62, -.7], [.3, -1.06], [-.4, -1.06], [-.9, -.62], [-.6, -.55], [-.2, -.78], [.3, -.62]], 10);
    const eyes = [[.3, -.05, 1], [.7, -.08, .8]];
    if (pop > 0) for (const [ex, ey, s] of eyes) {  // olhos saltando: brancos enormes, pupila pequena, passam do contorno
      const er = R * (.15 + .12 * pop) * s, x = (ex + .1 * pop) * R;
      loop(x, ey * R, er, er * 1.1, 0, w * .7, { fill: P.paper, seed: 520 + s * 10 }); dot(x + .03 * R, ey * R - .02 * R, .055 * R);
    }
    else for (const [ex, ey, s] of eyes) {
      const big = e === 'curious' ? 1.25 : 1;
      if (b > .55) brush([[(ex - .08) * R, ey * R], [ex * R, (ey + .05) * R], [(ex + .08) * R, ey * R]], w * .7, { seed: 530 + s * 10, t0: .2, t1: .2 });
      else if (e === 'happy') brush([[(ex - .08) * R, (ey + .03) * R], [ex * R, (ey - .06) * R], [(ex + .08) * R, (ey + .03) * R]], w * .8, { seed: 535 + s * 10, t0: .2, t1: .2 });  // olho sorrindo
      else { c.beginPath(); c.ellipse(ex * R, ey * R, .09 * R * s * big, .14 * R * s * big * (1 - b), 0, 0, TAU); c.fillStyle = P.ink; c.fill(); }
    }
    if (p.body === 'elder') { for (const [ex, ey, s2] of eyes) loop(ex * R, ey * R, .2 * R * s2, .18 * R * s2, 0, w * .5, { seed: 570 + s2 * 10 }); brush([[.5 * R, -.07 * R], [.54 * R, -.08 * R]], w * .5, { seed: 575 }); brush([[.1 * R, -.06 * R], [-.5 * R, -.15 * R]], w * .45, { seed: 576 }); }  // óculos redondos e haste
    const BROW = {
      neutral: [[[.16, -.34], [.42, -.38]], [[.58, -.38], [.8, -.34]]],
      happy: [[[.14, -.38], [.3, -.46], [.44, -.4]], [[.58, -.42], [.72, -.48], [.84, -.4]]],
      curious: [[[.12, -.5], [.3, -.66], [.46, -.56]], [[.58, -.34], [.82, -.4]]],
      surprised: [[[.1, -.62], [.3, -.84], [.5, -.7]], [[.6, -.7], [.76, -.86], [.92, -.68]]],
    }[e] || [];
    BROW.forEach((br, i) => brush(br.map(([x, y]) => [x * R, (y - (e === 'surprised' ? .1 * (pop - 1) : 0)) * R]), w * .8, { seed: 540 + i, t0: .2, t1: .5 }));
    if (p.body === 'elder') brush([[.28 * R, .32 * R], [.52 * R, .22 * R], [.78 * R, .32 * R]], w * 1.6, { seed: 578, t0: .4, t1: .4 });  // bigode
    const m = p.face.mouth, mx = .52 * R, my = .46 * R;
    if (m === 'm') brush([[mx - .1 * R, my], [mx + .1 * R, my]], w * .7, { seed: 552, t0: .2, t1: .2 });
    else if (m) { const [rx, ry] = { e: [.13, .06], a: [.13, .17], o: [.08, .11] }[m] || [.1, .1]; c.beginPath(); c.ellipse(mx, my, rx * R, ry * R, 0, 0, TAU); c.fillStyle = P.ink; c.fill(); }
    else if (e === 'surprised') { c.beginPath(); c.ellipse(.5 * R, .5 * R, .15 * R, .24 * R * Math.max(.4, pop), 0, 0, TAU); c.fillStyle = P.ink; c.fill(); }
    else if (e === 'curious') loop(.6 * R, .45 * R, .06 * R, .07 * R, 0, w * .6, { seed: 550 });
    else if (e === 'happy') { c.beginPath(); c.moveTo(.3 * R, .34 * R); c.quadraticCurveTo(.52 * R, .78 * R, .76 * R, .32 * R); c.closePath(); c.fillStyle = P.ink; c.fill(); }  // sorriso aberto
    else brush([[.36 * R, .38 * R], [.52 * R, .47 * R], [.68 * R, .37 * R]], w * .7, { seed: 551, t0: .2, t1: .3 });
    if ((a.gear || []).includes('hat')) {  // chapéu de explorador: copa em domo e aba; no susto de H pula num arco e gira
      const u = F.scene === 'H' ? seg(F.t, 5.3, 6.05) : 0, lift = 4 * u * (1 - u) * 1.7 * R;
      c.translate(0, -lift); c.rotate(-.5 * Math.sin(Math.PI * u));
      const crown = [[-.72 * R, -.62 * R], [-.6 * R, -1.15 * R], [0, -1.38 * R], [.6 * R, -1.15 * R], [.74 * R, -.62 * R]];
      c.beginPath(); for (const q of smooth(crown)) c.lineTo(q[0], q[1]); c.closePath(); c.fillStyle = P.paper; c.fill();
      brush(crown, w, { seed: 560, t0: .1, t1: .1 });
      brush([[-.7 * R, -.78 * R], [0, -.8 * R], [.72 * R, -.78 * R]], w * 1.4, { seed: 561, t0: .1, t1: .1, col: P.accent });
      brush([[-1.2 * R, -.56 * R], [-.3 * R, -.66 * R], [.5 * R, -.66 * R], [1.3 * R, -.5 * R]], w * 1.1, { seed: 562, t0: .15, t1: .2 });
    }
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
    parts(a, F) { z = F.cam.z; return partsOf(a); },  // o que draw desenha de cada ser (contrato em check-motion.mjs)
    draw(F) {
      c = animationEngine.context; z = F.cam.z; boil = 0;
      c.resetTransform(); c.fillStyle = P.paper; c.fillRect(0, 0, W, H);
      world(F);
      boil = Math.floor(F.t * 12);  // o traço dos seres ferve a 12 qps; o cenário fica parado
      let B = F.world.bench;
      const DRAW = { ant, fly, dog, bird, fish, butterfly, beetle, human };
      for (const a of F.actors) {
        if (B && a.depth >= B.depth) { cam(F, 1); bench(B, F); B = null; }  // banco atrás de quem tem a mesma profundidade
        if (a.hidden) continue;
        cam(F, a.layer); const P0 = a.pose;
        if (a.flip) { const m = (P0.spine[0].x + P0.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
        c.globalAlpha = a.alpha ?? 1;
        DRAW[a.kind](a, F);
        c.globalAlpha = 1;
      }
      if (B) { cam(F, 1); bench(B, F); }
      if (F.world.item) { cam(F, 1); flower(F.world.item); }
      for (const a of F.actors) if (a.front && !a.hidden) { cam(F, a.layer); c.globalAlpha = a.alpha ?? 1; human(a, F, true); c.globalAlpha = 1; }  // abraço: braço por cima do outro corpo
      boil = 0;
      if (F.world.lake) { cam(F, 1); lake(F); }
      front(F);
      texts(F);
      c.resetTransform();
    },
  };
})();
