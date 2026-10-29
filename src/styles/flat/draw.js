// Flat vetorial: céu em gradiente, camadas de paralaxe que clareiam e esfriam com a distância, solo em estratos, seres em
// formas geométricas sem contorno (crescente de sombra embaixo à direita, realce em cima à esquerda), sombras longas
// chapadas do sol (alto à esquerda, atrás dos seres: a sombra vem para a frente e para a direita) e brilho aditivo nas luzes.
window.ExpStyle = (() => {
  const P = STYLE.palette, MAIN = animationEngine.context;
  let SHX = STYLE.effects.longShadow;  // a cena K vira a sombra para o lado oposto ao sol e a alonga no sol baixo
  let c = MAIN, cam = { cx: 960, cy: 540, z: 1 };
  // Câmera da camada de paralaxe f; faixa x visível e fundo da tela nessa camada.
  const at = f => { const { cx, cy, z } = cam; c.setTransform(z, 0, 0, z, 960 - lerp(960, cx, f) * z, 540 - cy * z); };
  const span = (f, pad = 120) => { const lx = lerp(960, cam.cx, f), w = 960 / cam.z + pad; return [lx - w, lx + w]; };
  const ybot = () => cam.cy + 600 / cam.z;
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  const ell = (x, y, rx, ry, a, col) => { c.beginPath(); c.ellipse(x, y, Math.max(rx, .01), Math.max(ry, .01), a, 0, TAU); c.fillStyle = col; c.fill(); };
  const line = (pts, col, w) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = col; c.lineWidth = w; c.lineCap = c.lineJoin = 'round'; c.stroke(); };
  const vgrad = (y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };

  // Brilho: sprite radial em cache por cor, somado com 'lighter'.
  const SPR = new Map();
  function glow(x, y, r, col, a = 1) {
    if (a <= 0 || c !== MAIN) return;
    let s = SPR.get(col);
    if (!s) {
      s = document.createElement('canvas'); s.width = s.height = 128; const g = s.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, rgba(col, 1)); r.addColorStop(.22, rgba(col, .42)); r.addColorStop(1, rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 128, 128); SPR.set(col, s);
    }
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.drawImage(s, x - r, y - r, 2 * r, 2 * r); c.restore();
  }

  // Sombras longas: silhuetas chapadas numa tela à parte (sem somar onde as peças se cruzam), coladas com alfa uma vez.
  const SC = document.createElement('canvas'); SC.width = W; SC.height = H;
  const SCX = SC.getContext('2d'), MONO = new Proxy({}, { get: () => '#16304A' });
  let SHY = .2;
  function shade(fns, a = .26) {
    c = SCX; c.resetTransform(); c.clearRect(0, 0, W, H);
    try { fns.forEach(f => f()); } finally { c = MAIN; }
    c.resetTransform(); c.globalAlpha = a; c.drawImage(SC, 0, 0); c.globalAlpha = 1;
  }
  // Projeta no chão gy: altura d acima do chão vira (+SHX·d, +SHY·d), para a frente e para a direita.
  const skew = gy => { c.translate(0, gy); c.transform(1, 0, -SHX, -SHY, 0, 0); c.translate(0, -gy); };

  // ---------- cenário ----------
  // Faixa de perfil: de prof(x) até o pé da tela, na camada f.
  function band(f, prof, fill) {
    at(f); const [x0, x1] = span(f), st = 14 / cam.z, yb = ybot();
    c.beginPath(); c.moveTo(x0, yb); for (let x = x0; x <= x1 + st; x += st) c.lineTo(x, prof(x)); c.lineTo(x1 + st, yb); c.closePath(); c.fillStyle = fill; c.fill();
  }
  const edge = (f, prof, col, w) => { at(f); const [x0, x1] = span(f), st = 14 / cam.z, pts = []; for (let x = x0; x <= x1 + st; x += st) pts.push([x, prof(x)]); line(pts, col, w / Math.sqrt(cam.z)); };
  function sky(gy) {
    const { cy, z } = cam, hy = (gy - cy) * z + 540;
    c.resetTransform(); c.fillStyle = vgrad(hy - 1100, hy, [P.skyTop, mixCol(P.skyTop, P.haze, .55), P.skyLow]); c.fillRect(0, 0, W, H);
    const sx = 330 - (cam.cx - 960) * .02 * z, sy = hy - 560;  // sol no alto à esquerda, quase parado
    glow(sx, sy, 1100, '#FFD27A', .22); glow(sx, sy, 420, P.sun, .6); ell(sx, sy, 62, 62, 0, '#FFF6DC');
  }
  function cloud(x, y, s, K = P) {
    const parts = (dx, dy, col) => { c.fillStyle = col; c.beginPath(); c.roundRect(x - 160 * s + dx, y - 30 * s + dy, 320 * s, 60 * s, 30 * s); c.fill(); for (const [u, v, r] of [[-70, -32, 52], [10, -58, 72], [92, -28, 48]]) ell(x + u * s + dx, y + v * s + dy, r * s, r * s, 0, col); };
    parts(8 * s, 12 * s, K.cloudDk); parts(0, 0, K.cloud);
  }
  const DECO = [[150, 240, .9], [820, 150, .65], [1500, 270, .8], [2200, 170, .6], [-500, 200, .7]];
  function clouds(F) {
    at(.1); const list = F.world.clouds?.list || DECO.map(([x, y, s]) => [x + 5 * F.t, y, s]);
    for (const [x, y, s] of list) cloud(x, y, s);
  }
  // Árvore geométrica: tronco afilado e copa de círculos em três tons. K = cores (névoa já misturada).
  function tree(x, gy, h, K, seed) {
    c.beginPath(); c.moveTo(x - .045 * h, gy); c.lineTo(x - .02 * h, gy - .62 * h); c.lineTo(x + .02 * h, gy - .62 * h); c.lineTo(x + .045 * h, gy); c.fillStyle = K.trunk; c.fill();
    line([[x, gy - .45 * h], [x + .12 * h, gy - .62 * h]], K.trunk, .025 * h);
    const cs = [...Array(7)].map((_, i) => { const a = i / 7 * TAU + seed, d = .14 * h * (.6 + .4 * hash(seed + i)); return [x + d * Math.cos(a) * 1.2, gy - .76 * h + d * Math.sin(a) * .8, h * (.15 + .06 * hash(seed + i * 3))]; });
    for (const [u, v, r] of cs) ell(u + .03 * h, v + .035 * h, r, r, 0, K.dk);
    for (const [u, v, r] of cs) ell(u, v, r * .94, r * .94, 0, K.base);
    for (const [u, v, r] of cs) if (u < x && v < gy - .74 * h) ell(u - .3 * r, v - .35 * r, .4 * r, .3 * r, -.5, K.lt);
  }
  const TREE = { trunk: '#6E4A36', dk: P.grassDk, base: P.grass, lt: P.grassLt };
  const hazed = (K, k, to = P.haze) => Object.fromEntries(Object.entries(K).map(([n, v]) => [n, mixCol(v, to, k)]));
  // Tufos de capim no perfil (camada f): três folhas que balançam devagar (ph = fase do loop da cena K: balanço periódico).
  function tufts(f, prof, step, hgt, col, t, seed, ph) {
    at(f); const [x0, x1] = span(f);
    for (let x = Math.floor(x0 / step) * step; x < x1; x += step) {
      const i = Math.round(x / step), q = hash(seed + i); if (q < .35) continue;
      const bx = x + step * hash(seed + i * 7), by = prof(bx), hh = hgt * (.6 + .6 * hash(seed + i * 3)), sw = .18 * (ph === undefined ? noise1(seed + i, t * .5 + i * .1) : Math.sin(TAU * (2 * ph + hash(seed + i * 5))));
      c.beginPath();
      for (const a of [-.35, 0, .3]) { const tx = bx + hh * Math.sin(a + sw), ty = by - hh * Math.cos(a + sw) * (a ? .75 : 1); c.moveTo(bx - hh * .07, by); c.quadraticCurveTo(bx + (tx - bx) * .3, by - (by - ty) * .6, tx, ty); c.quadraticCurveTo(bx + (tx - bx) * .5, by - (by - ty) * .4, bx + hh * .07, by); }
      c.fillStyle = col; c.fill();
    }
  }
  // Pedra: polígono baixo com faceta clara virada para o sol.
  function rock([x, y, r], K = ROCKK) {
    const pts = [...Array(7)].map((_, i) => { const a = Math.PI + i / 6 * Math.PI, k = .8 + .3 * hash(11 + i); return [x + Math.cos(a) * r * 1.3 * k, y + Math.sin(a) * r * .9 * k]; });
    c.beginPath(); pts.forEach(([u, v], i) => i ? c.lineTo(u, v) : c.moveTo(u, v)); c.closePath(); c.fillStyle = K.base; c.fill();
    c.beginPath(); c.moveTo(...pts[0]); for (let i = 1; i < 4; i++) c.lineTo(...pts[i]); c.lineTo(x + .1 * r, y - .2 * r); c.closePath(); c.fillStyle = K.lt; c.fill();
  }
  const ROCKK = { base: '#6F7D86', lt: '#A9B6BC' };

  // Solo em corte (plano aberto): turfa, estratos, seixos, raízes, túneis, câmaras com fungo e o monte do ninho.
  const ROOTS = new Map();
  function roots({ x, y, h }) {
    let rs = ROOTS.get(x);
    if (!rs) {  // geometria parada, calculada uma vez
      rs = [...Array(6)].map((_, k) => { let a = Math.PI / 2 + (k - 2.5) * .38, px = x, py = y; const pts = [[px, py]], L = h * (.45 + .5 * hash(k + 70)), n = 12;
        for (let i = 0; i < n; i++) { a += .25 * noise1(k + 80, i * .4); px += L / n * Math.cos(a); py += L / n * Math.sin(a); pts.push([px, py]); } return pts; });
      ROOTS.set(x, rs);
    }
    for (const pts of rs) for (let i = 1; i < pts.length; i++) line([pts[i - 1], pts[i]], '#7A4E34', 16 * (1 - i / pts.length) + 2);
  }
  function soil(F) {
    const w = F.world, g = w.ground, top = x => g(x) + 22, [x0, x1] = span(1), y0 = cam.cy - 600 / cam.z, y1 = ybot();
    band(1, top, vgrad(860, 2150, [P.soil, mixCol(P.soil, P.soilDk, .55), P.soilDk]));
    for (let i = 0; i < 5; i++) band(1, x => 990 + 230 * i + 22 * Math.sin(x * .004 + i * 2) + 9 * Math.sin(x * .011 + i), rgba(P.soilDk, .13));
    at(1);
    for (let gx = Math.floor(x0 / 70); gx * 70 < x1; gx++) for (let k = 0; k < 2; k++) {  // seixos por semente da célula
      const s = gx * 7 + k * 131, px = gx * 70 + 70 * hash(s), py = 880 + 1250 * hash(s + 1), r = 4 + 10 * hash(s + 2);
      if (py < y0 - 20 || py > y1 + 20 || py < top(px) + 8) continue;
      const col = mixCol(P.soilLt, P.soilDk, seg(py, 880, 2200) * .8);
      ell(px + .2 * r, py + .2 * r, r, .7 * r, 0, mixCol(col, P.soilDk, .4)); ell(px, py, r * .9, .62 * r, 0, col);
    }
    if (w.roots) roots(w.roots);
    for (const pts of w.tunnels || []) { line(pts, mixCol(P.soil, P.soilLt, .5), 44); }
    for (const [x, y, cw, ch] of w.chambers || []) dome(x, y, cw, ch, 9, mixCol(P.soil, P.soilLt, .5));
    for (const pts of w.tunnels || []) line(pts, P.cave, 32);
    for (const [x, y, cw, ch] of w.chambers || []) dome(x, y, cw, ch, 0, vgrad(y - ch, y + 8, [P.cave, mixCol(P.cave, P.soil, .35)]));
    for (const fg of w.fungus || []) fungus(fg, F.t);
    // Turfa: faixa verde sobre o corte, borda clara e capim.
    c.beginPath(); const st = 14 / cam.z; c.moveTo(x0, top(x0)); for (let x = x0; x <= x1 + st; x += st) c.lineTo(x, top(x)); for (let x = x1 + st; x >= x0; x -= st) c.lineTo(x, g(x)); c.closePath(); c.fillStyle = P.grass; c.fill();
    edge(1, g, P.grassLt, 5);
    if (w.nest) mound(w.nest, g(w.nest));
  }
  // Câmara: cavidade em cúpula sobre o chão plano y (e = margem da borda).
  const dome = (x, y, w, h, e, fill) => { c.beginPath(); c.ellipse(x, y, w / 2 + e, h + e, 0, Math.PI, TAU); c.ellipse(x, y, w / 2 + e, 10 + e, 0, 0, Math.PI); c.fillStyle = fill; c.fill(); };
  // Jardim de fungo: monte de esferas creme, com brilho quente e respiração lenta.
  function fungus([x, y, w, h, seed], t) {
    c.beginPath(); c.ellipse(x, y, w / 2, h * .62, 0, Math.PI, TAU); c.fillStyle = P.fungusDk; c.fill();
    const n = 15, bs = [...Array(n)].map((_, i) => { const u = (i + .5) / n * 2 - 1, hh = h * Math.sqrt(1 - u * u); return [x + u * w * .44, y - hh * (.3 + .45 * hash(seed * 9 + i)), w * (.07 + .05 * hash(seed * 5 + i)) * (1 + .03 * Math.sin(t * 1.3 + i))]; });
    for (const [u, v, r] of bs) ell(u + .15 * r, v + .2 * r, r, r, 0, P.fungusDk);
    for (const [u, v, r] of bs) ell(u, v, r * .9, r * .9, 0, P.fungus);
    for (const [u, v, r] of bs) ell(u - .3 * r, v - .35 * r, .25 * r, .18 * r, -.5, '#FFFFFF');
    glow(x, y - h * .45, w * .75, '#FFE9B0', .22 + .04 * Math.sin(t * 1.1 + seed));
  }
  // Monte de terra escavada na entrada do ninho, com grânulos e o buraco.
  function mound(x, gy) {
    c.beginPath(); c.ellipse(x, gy + 6, 150, 48, 0, Math.PI, TAU); c.fillStyle = mixCol(P.soilLt, P.soil, .35); c.fill();
    c.beginPath(); c.ellipse(x + 30, gy + 6, 105, 34, 0, Math.PI * 1.45, TAU); c.lineTo(x + 30, gy + 6); c.fillStyle = rgba(P.soilDk, .18); c.fill();
    for (let i = 0; i < 14; i++) { const a = Math.PI + Math.PI * hash(300 + i), d = .6 + .35 * hash(320 + i); ell(x + Math.cos(a) * 140 * d, gy + 6 + Math.sin(a) * 44 * d, 6, 5, 0, i % 2 ? P.soilLt : mixCol(P.soilLt, P.soil, .6)); }
    ell(x, gy + 2, 18, 8, 0, P.cave);
  }

  // ---------- seres ----------
  const PAL = new Map();
  // Cores de formiga (protagonista em laranja vivo), misturadas com névoa ou escuro do subsolo por k.
  function antPal(hero, to, k) {
    const key = hero + to + k; let K = PAL.get(key);
    if (!K) {
      const b = hero ? { body: P.hero, dk: P.heroDk, lt: P.heroLt } : { body: P.ant, dk: P.antDk, lt: P.antLt };
      K = hazed({ ...b, leg: mixCol(b.dk, P.ink, .25), far: mixCol(b.dk, P.ink, .5), eye: P.ink, leaf: P.leaf, leafDk: P.leafDk, leafLt: P.leafLt }, k, to);
      PAL.set(key, K);
    }
    return K;
  }
  // Volume com crescente de sombra embaixo à direita e realce em cima à esquerda.
  function blob(x, y, rx, ry, a, K, spec = true) {
    ell(x, y, rx, ry, a, K.dk); ell(x - .06 * ry, y - .12 * ry, rx * .9, ry * .82, a, K.body);
    if (spec) ell(x - .25 * ry, y - .42 * ry, rx * .42, ry * .2, a, K.lt);
  }
  // Geometria dos seres (ExpStyle.parts, contrato de check-motion.mjs): eixo, meia largura e ponta de cada parte, só das
  // juntas de pose.joints. O desenho usa esta mesma lista. Ponta 'butt' nas juntas finais (tornozelo, pulso, base da
  // cabeça, <membro>.end): o pé, a mão, a cabeça ou o disco da pata cobrem a junta.
  const d2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]), unit2 = (a, b) => { const d = d2(a, b) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
  const mid = ([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // Larguras em BL por tipo de ser: pescoço, cabeça (fração da meia altura dela) e pata [coxa, canela, pé] (as de lá ×.82;
  // hind = traseiras do cão, mais grossas).
  const KW = {
    ant: { neck: .03, head: .92, leg: [.011, .0077, .0099] }, fly: { neck: .0225, head: .95 }, beetle: { neck: .03, head: .9, leg: [.015, .01, .012] },
    dog: { neck: .062, head: 1.1, leg: [.045, .026, .019], hind: [.06, .028, .019] }, bird: { neck: .07, head: 1, leg: [.024, .011, .01] },
    fish: { neck: .09, head: .9 }, butterfly: { neck: .03, head: 1 },
  };
  // Ponta redonda que termina no dedo, com a sola rente: recua r no eixo e sobe r na normal de cima.
  const sole = (a, b, r) => { const u = unit2(a, b); let n = [u[1], -u[0]]; if (n[1] > 0) n = [-n[0], -n[1]]; return [b[0] - r * (u[0] - n[0]), b[1] - r * (u[1] - n[1])]; };
  function partsOf(a) {
    const p = a.pose, J = p.joints, S = p.size, out = [], part = (name, from, to, pts, r, cap) => out.push({ actor: a.id, name, from, to, pts, r, cap });
    const hl = d2(J.headBase, J.headTop) / 2;
    if (a.kind === 'human') {
      const g = BODY[p.body || 'adult'].girth, k = clamp(Math.sqrt(g / .11), .85, 1.25);  // corpo largo, braços e pernas mais grossos
      part('torso', 'pelvis', 'chest', [J.pelvis, J.chest], g * S, 'butt');  // o ombro (disco de raio r no peito) chega à base do pescoço
      part('neck', 'neck', 'headBase', [J.neck, J.headBase], .028 * S, 'butt');
      const hs = STYLE.character.headScale || 1;  // cabeça maior, crescendo para cima a partir de headBase (pescoço ligado)
      part('head', 'headBase', null, [J.headBase, lerp2(J.headBase, J.headTop, hs)], hs * hl, 'round');
      for (const s of ['L', 'R']) {
        const j = k => J[k + s], hr = .028 * S, hu = unit2(j('wrist'), j('hand')), fr = .032 * S;
        part('upperArm' + s, 'shoulder' + s, 'elbow' + s, [j('shoulder'), j('elbow')], .036 * k * S, 'round');
        part('forearm' + s, 'elbow' + s, 'wrist' + s, [j('elbow'), j('wrist')], .026 * k * S, 'butt');
        part('hand' + s, 'wrist' + s, null, [j('wrist'), [j('hand')[0] - hr * hu[0], j('hand')[1] - hr * hu[1]]], hr, 'round');  // a ponta redonda termina na ponta da mão
        part('thigh' + s, 'hip' + s, 'knee' + s, [j('hip'), j('knee')], .046 * k * S, 'round');
        part('shin' + s, 'knee' + s, 'ankle' + s, [j('knee'), j('ankle')], .036 * k * S, 'butt');
        part('foot' + s, 'ankle' + s, null, [j('ankle'), sole(j('ankle'), j('toe'), fr)], fr, 'round');
      }
      return out;
    }
    const W = KW[a.kind] || KW.ant;
    part('neck', 'neck', 'headBase', [J.neck, J.headBase], W.neck * S, 'butt');
    part('head', 'headBase', null, [J.headBase, J.headTop], W.head * hl, 'round');
    if (W.leg) for (const [name, l] of Object.entries(p.limbs)) {  // pata: afila para o pé; as de lá mais finas
      const j = k => `${name}.${k}`, [w1, w2, w3] = (W.hind && /H$/.test(name) ? W.hind : W.leg).map(v => v * S * (l.far ? .82 : 1));
      if (!J[j('root')]) continue;
      part(j('upper'), j('root'), j('mid'), [J[j('root')], J[j('mid')]], w1, 'round');
      part(j('lower'), j('mid'), j('end'), [J[j('mid')], J[j('end')]], w2, 'butt');
      if (J[j('toe')]) part(j('tip'), j('end'), j('toe'), [J[j('end')], sole(J[j('end')], J[j('toe')], w3)], w3, 'round');
      else part(j('foot'), j('end'), null, [J[j('end')]], w3, 'round');
    }
    return out;
  }
  const byName = a => Object.fromEntries(partsOf(a).map(q => [q.name, q]));
  // Desenha uma parte com a ponta dela; um ponto só é um disco. k afina o traço (realce por dentro).
  function stroke(q, col, k = 1, dx = 0, dy = 0) {
    if (q.pts.length < 2) return ell(q.pts[0][0] + dx, q.pts[0][1] + dy, q.r * k, q.r * k, 0, col);
    c.beginPath(); q.pts.forEach(([x, y], i) => i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy)); c.strokeStyle = col; c.lineWidth = 2 * q.r * k; c.lineCap = q.cap; c.lineJoin = 'round'; c.stroke();
  }
  // Cabeça oval da parte: centro no meio do eixo base → topo, semieixo = metade dele, meia largura r.
  const headBlob = (q, K, spec) => { const [x, y] = mid(q.pts), [a, b] = q.pts; blob(x, y, d2(a, b) / 2, q.r, Math.atan2(b[1] - a[1], b[0] - a[0]), K, spec); };
  // Quadro local da cabeça: x para a frente, y para baixo, nos dois sentidos.
  const local =(x, y, a, dir, fn) => { c.save(); c.translate(x, y); c.rotate(a); c.scale(1, dir); fn(); c.restore(); };
  function leaf({ x, y, w, h, angle }, K) {
    c.save(); c.translate(x, y); c.rotate(angle); const a = w / 2, b = h / 2;
    c.beginPath(); c.moveTo(-a, 0); c.bezierCurveTo(-a * .4, -b * 1.3, a * .45, -b * 1.15, a, 0); c.closePath(); c.fillStyle = K.leaf; c.fill();
    c.beginPath(); c.moveTo(-a, 0); c.bezierCurveTo(-a * .3, b * 1.25, a * .55, b * 1.05, a, 0); c.closePath(); c.fillStyle = K.leafDk; c.fill();
    if (w > 6) {
      line([[-a, 0], [a * .95, 0]], K.leafLt, .055 * h);
      for (let i = 1; i < 5; i++) { const u = -a + i / 5 * 2 * a; line([[u, 0], [u + .22 * a, -b * .62]], K.leafLt, .03 * h); line([[u, 0], [u + .22 * a, b * .58]], K.leaf, .03 * h); }
    }
    c.restore();
  }
  function ant(a, K) {
    const p = a.pose, S = p.size, dir = p.facing, Q = byName(a), hr = d2(...Q.head.pts) / 2, [th, pe, ga] = p.spine, L = Object.entries(p.limbs);
    const leg = (n, col) => { for (const k of ['upper', 'lower', 'foot']) stroke(Q[`${n}.${k}`], col); };
    for (const [n, l] of L) if (l.far) leg(n, K.far);  // lado de lá: atrás do corpo e mais escuras
    blob(ga.x, ga.y, ga.r * 1.28, ga.r * .95, ga.angle, K);
    blob(pe.x, pe.y, pe.r * 1.2, pe.r, pe.angle, K, false);
    for (const [n, l] of L) if (!l.far) leg(n, K.leg);  // lado de cá: nascem sob o tórax
    stroke(Q.neck, K.dk);
    blob(th.x, th.y, th.r * 1.45, th.r * .82, th.angle, K);
    headBlob(Q.head, K);
    local(p.head.x, p.head.y, p.head.angle, dir, () => {
      c.beginPath(); c.moveTo(.75 * hr, .2 * hr); c.lineTo(1.3 * hr, .5 * hr); c.lineTo(.8 * hr, .62 * hr); c.closePath(); c.fillStyle = K.dk; c.fill();
      if (hr * cam.z > 6) {  // olho grande: elipse clara, pupila voltada para a frente, brilho
        ell(.34 * hr, -.16 * hr, .3 * hr, .34 * hr, -.2, K === MONO ? K.dk : '#FFF4E4');
        ell(.44 * hr, -.14 * hr, .17 * hr, .2 * hr, -.2, K.eye); ell(.38 * hr, -.24 * hr, .06 * hr, .06 * hr, 0, K === MONO ? K.dk : '#FFFFFF');
        line([[.08 * hr, -.5 * hr], [.55 * hr, -.56 * hr]], K.dk, .07 * hr);
      } else ell(.42 * hr, -.18 * hr, .2 * hr, .2 * hr, 0, K.eye);
    });
    if (p.carry) leaf(p.carry, K);
    for (const ap of Object.values(p.appendages)) { line(ap, K.leg, .013 * S); const e = ap.at(-1); ell(e[0], e[1], .016 * S, .016 * S, 0, K.leg); }
  }
  function fly(a, K) {
    const p = a.pose, S = p.size, dir = p.facing, [th, ab] = p.spine, w = p.wings || { phase: 0, open: 0 }, mono = K === MONO, Q = byName(a);
    const wing = (k, a0) => {  // asa translúcida presa no alto do tórax
      const a = (dir > 0 ? Math.PI : 0) + dir * (-.35 - k * .9 * w.open * Math.sin(w.phase * TAU) + a0), bx = th.x, by = th.y - th.r * .7;
      ell(bx + Math.cos(a) * .28 * S, by + Math.sin(a) * .28 * S, .3 * S, .09 * S, a, rgba(P.wing, .55));
    };
    if (!mono) wing(1, -.15);
    for (const k of [-1, 0, 1]) line([[th.x + k * .07 * S, th.y + .1 * S], [th.x + k * .09 * S + dir * .03 * S, th.y + .26 * S]], K.leg || P.fly, .018 * S);
    blob(ab.x, ab.y, ab.r * 1.3, ab.r * .85, ab.angle, K);
    stroke(Q.neck, K.dk);
    blob(th.x, th.y - .03 * S, th.r * 1.1, th.r * 1.05, th.angle, K);
    const hr = d2(...Q.head.pts) / 2, [hx, hy] = mid(Q.head.pts);
    headBlob(Q.head, K, false);
    ell(hx + dir * .3 * hr, hy - .05 * hr, .45 * hr, .5 * hr, 0, mono ? K.dk : '#9A3B2E');
    if (!mono) wing(1.2, .2);
  }
  const FLYK = { body: P.fly, dk: mixCol(P.fly, P.ink, .5), lt: P.flyLt, leg: mixCol(P.fly, P.ink, .4) };
  // Normal "de cima" do eixo u de uma cabeça ou corpo de perfil (dir = para onde olha).
  const upN = (u, dir) => dir > 0 ? [u[1], -u[0]] : [-u[1], u[0]];
  // Raposa (kind dog): patas de lá, cauda cheia de ponta branca, tronco em cápsula com peito claro, patas de cá (meia
  // preta), pescoço e cabeça em gota: crânio perto da base e focinho que termina na ponta (joints.headTop), orelhas em pé.
  const FOXK = { body: '#D9662B', dk: '#A8461E', lt: '#F2A061', white: '#FBF3E4', sock: '#3E2A24', far: '#8E3C1C', eye: P.ink };
  function dog(a, K) {
    const p = a.pose, S = p.size, dir = p.facing, Q = byName(a), J = p.joints, mono = K === MONO, L = Object.entries(p.limbs), sp = p.spine;
    // Pata: coxa e canela afinando (dentro do r de cada parte), meia escura na metade de baixo da canela e pata pequena.
    const taper = (A, B, ra, rb, col) => { const u = unit2(A, B), nn = [-u[1] * ra, u[0] * ra], mm = [-u[1] * rb, u[0] * rb]; c.beginPath(); c.moveTo(A[0] + nn[0], A[1] + nn[1]); c.lineTo(B[0] + mm[0], B[1] + mm[1]); c.lineTo(B[0] - mm[0], B[1] - mm[1]); c.lineTo(A[0] - nn[0], A[1] - nn[1]); c.closePath(); c.fillStyle = col; c.fill(); };
    const leg = (n, far) => {
      const up = Q[n + '.upper'], lo = Q[n + '.lower'], [R0, M] = up.pts, E = lo.pts[1], col = far ? K.far : K.body, sock = far ? mixCol(K.sock, P.ink, .3) : K.sock, S0 = lerp2(M, E, .45);
      ell(R0[0], R0[1], up.r, up.r, 0, col); taper(R0, M, up.r, lo.r, col); ell(M[0], M[1], lo.r, lo.r, 0, col);
      taper(M, S0, lo.r, .8 * lo.r, col); taper(S0, E, .8 * lo.r, .62 * lo.r, sock); stroke(Q[n + '.tip'], sock);
    };
    for (const [n, l] of L) if (l.far) leg(n, true);
    const tail = p.appendages.tail;
    if (tail) { line(tail, K.dk, .1 * S); line(tail.slice(0, -1), K.body, .085 * S); line(tail.slice(-2), K.white, .075 * S); }
    const pts = sp.map(q => [q.x, q.y]);
    line(pts, K.dk, 2 * sp[1].r); line(pts.map(([x, y]) => [x - .01 * S, y - .015 * S]), K.body, 1.75 * sp[1].r);
    if (!mono) line(pts.map(([x, y]) => [x - .02 * S, y - .07 * S]).slice(0, 2), K.lt, .05 * S);
    for (const [n, l] of L) if (!l.far) leg(n, false);
    // Pescoço na cor do corpo: um cone do peito (largura do tronco) à base da cabeça, sem costura no ombro; garganta clara.
    const s0 = [sp[0].x, sp[0].y], hb = Q.head.pts[0], nu = unit2(s0, hb), dn = upN(nu, dir), gm = lerp2(s0, hb, .5);
    stroke(Q.neck, K.body); taper(s0, hb, .85 * sp[0].r, Q.neck.r, K.body);
    ell(gm[0] - .45 * Q.neck.r * dn[0], gm[1] - .45 * Q.neck.r * dn[1], .32 * d2(s0, hb), .55 * Q.neck.r, Math.atan2(nu[1], nu[0]), K.white);
    const [B, T] = Q.head.pts, hl = d2(B, T) / 2, u = unit2(B, T), n = upN(u, dir), r = Q.head.r, at2 = (s, h) => [B[0] + s * u[0] + h * n[0], B[1] + s * u[1] + h * n[1]];
    const sk = at2(.42 * hl, 0), ear = (k, col) => { c.beginPath(); c.moveTo(...at2(.05 * hl + k, .7 * r)); c.lineTo(...at2(.05 * hl + k, 1.75 * r)); c.lineTo(...at2(.8 * hl + k, .75 * r)); c.closePath(); c.fillStyle = col; c.fill(); };
    ear(-.25 * hl, K.far);
    c.beginPath(); c.arc(sk[0], sk[1], r, 0, TAU); c.fillStyle = K.dk; c.fill();
    c.beginPath(); c.moveTo(...at2(.45 * hl, .95 * r)); c.quadraticCurveTo(...at2(1.4 * hl, .6 * r), ...T); c.quadraticCurveTo(...at2(1.3 * hl, -.55 * r), ...at2(.45 * hl, -.98 * r)); c.closePath(); c.fillStyle = K.body; c.fill();
    c.beginPath(); c.arc(sk[0], sk[1], .9 * r, 0, TAU); c.fillStyle = K.body; c.fill();
    c.beginPath(); c.moveTo(...at2(.55 * hl, -.85 * r)); c.quadraticCurveTo(...at2(1.4 * hl, -.45 * r), ...T); c.quadraticCurveTo(...at2(1.3 * hl, -.1 * r), ...at2(.7 * hl, -.15 * r)); c.closePath(); c.fillStyle = K.white; c.fill();  // focinho e bochecha brancos
    ear(0, K.body); if (!mono) { const e = at2(.3 * hl, 1.05 * r); ell(e[0], e[1], .2 * r, .12 * r, Math.atan2(u[1], u[0]), K.sock); }  // miolo da orelha
    const nose = at2(2 * hl - .13 * r, .02 * r); ell(nose[0], nose[1], .13 * r, .11 * r, 0, K.sock);  // a ponta do nariz fica em headTop
    if (!mono) {
      const e = at2(.95 * hl, .35 * r), b = clamp(p.face.blink), sur = p.face.expression === 'surprised';
      if (b > .7) line([[e[0] - .14 * r, e[1]], [e[0] + .14 * r, e[1]]], K.eye, .06 * r);
      else { ell(e[0], e[1], (sur ? .2 : .16) * r, (sur ? .22 : .13) * r * (1 - b), Math.atan2(u[1], u[0]), K.eye); ell(e[0] - .04 * r, e[1] - .05 * r, .05 * r, .05 * r, 0, '#FFFFFF'); }
    }
  }
  // Pássaro: pernas finas com dedos, cauda em leque, corpo em gota, asa (dobrada no dorso ou batendo no voo), pescoço,
  // cabeça redonda com bico à frente (quadro do rosto, pose.head.angle) e olho.
  const BIRDK = { body: '#3E7FB0', dk: '#285C86', lt: '#8CC2E2', belly: '#F4E3BE', wing: '#22506F', beak: '#F2A23A', leg: '#C9773A', eye: P.ink };
  function bird(a, K) {
    const p = a.pose, S = p.size, dir = p.facing, Q = byName(a), L = Object.entries(p.limbs), [b0, b1] = p.spine, w = p.wings || { phase: 0, open: 0 }, mono = K === MONO;
    const leg = (n, far) => { for (const k of ['upper', 'lower', 'tip']) stroke(Q[`${n}.${k}`], far ? mixCol(K.leg, P.ink, .35) : K.leg); };
    for (const [n, l] of L) if (l.far) leg(n, true);
    const tail = p.appendages.tail;
    if (tail) { const [t0, t1] = [tail[0], tail.at(-1)], u = unit2(t0, t1), n = [-u[1], u[0]], s = .05 * S; c.beginPath(); c.moveTo(t0[0], t0[1]); c.lineTo(t1[0] + n[0] * s, t1[1] + n[1] * s); c.lineTo(t1[0] - n[0] * s, t1[1] - n[1] * s); c.closePath(); c.fillStyle = K.wing; c.fill(); }
    const flap = (k, col) => {  // asa aberta: elipse que gira no ombro com a fase do batimento
      const ang = -Math.PI / 2 - dir * (.3 + 1.1 * Math.cos(TAU * w.phase)) + k, bx = b0.x - dir * .02 * S, by = b0.y - .08 * S, Lw = .42 * S;
      ell(bx + Math.cos(ang) * Lw / 2 - dir * .08 * S, by + Math.sin(ang) * Lw / 2, Lw / 2, .09 * S, ang, col);
    };
    if (w.open && !mono) flap(.15, K.dk);
    blob(b1.x, b1.y, b1.r * 1.25, b1.r * .9, b1.angle, K, false);
    blob(b0.x, b0.y, b0.r * 1.1, b0.r * .95, b0.angle, K);
    if (!mono) ell(b0.x + dir * .05 * S, b0.y + .07 * S, b0.r * .75, b0.r * .55, 0, K.belly);
    if (w.open) flap(0, K.wing); else ell(b0.x - dir * .07 * S, b0.y - .02 * S, .17 * S, .08 * S, dir * -.25, K.wing);  // asa dobrada no dorso
    for (const [n, l] of L) if (!l.far) leg(n, false);
    stroke(Q.neck, K.dk); stroke(Q.neck, K.body, .85);
    const [hx, hy] = mid(Q.head.pts), r = Q.head.r;
    blob(hx, hy, r, r, 0, K);
    local(hx, hy, p.head.angle, dir, () => {
      c.beginPath(); c.moveTo(.75 * r, -.25 * r); c.lineTo(1.65 * r, .05 * r); c.lineTo(.8 * r, .3 * r); c.closePath(); c.fillStyle = K.beak; c.fill();
      if (!mono) { const b = clamp(p.face.blink); if (b > .7) line([[.15 * r, -.15 * r], [.45 * r, -.15 * r]], K.eye, .08 * r); else { ell(.3 * r, -.15 * r, .16 * r, .16 * r * (1 - b), 0, K.eye); ell(.25 * r, -.21 * r, .05 * r, .05 * r, 0, '#FFFFFF'); } }
    });
  }
  // Peixe: contorno pelos raios da coluna (dorso escuro, ventre claro), nadadeira caudal em V, peitoral, cabeça oval com olho.
  const FISHK = { body: '#7FAEC0', dk: '#3F6E86', lt: '#D8ECF0', belly: '#E8F2EE', fin: '#5E8FA6', eye: P.ink };
  function fish(a, K) {
    const p = a.pose, S = p.size, dir = p.facing, Q = byName(a), sp = p.spine, mono = K === MONO, ap = p.appendages;
    if (ap.caudal) { const [t0, t1] = [ap.caudal[0], ap.caudal.at(-1)], u = unit2(t0, t1), n = [-u[1], u[0]], s = .13 * S; c.beginPath(); c.moveTo(t0[0], t0[1]); c.lineTo(t1[0] + n[0] * s + u[0] * .04 * S, t1[1] + n[1] * s + u[1] * .04 * S); c.lineTo(t1[0] - .03 * S * u[0], t1[1] - .03 * S * u[1]); c.lineTo(t1[0] - n[0] * s + u[0] * .04 * S, t1[1] - n[1] * s + u[1] * .04 * S); c.closePath(); c.fillStyle = K.fin; c.fill(); }
    const side = k => sp.map((q, i) => { const A = sp[i - 1] || q, B = sp[i + 1] || q, u = unit2([B.x, B.y], [A.x, A.y]), nn = upN(u, 1); return [q.x + k * q.r * nn[0], q.y + k * q.r * nn[1]]; });
    const hull = (k, col, dy = 0) => { const top = side(k), bot = side(-k).reverse(); c.beginPath(); [...top, ...bot].forEach(([x, y], i) => i ? c.lineTo(x, y + dy) : c.moveTo(x, y + dy)); c.closePath(); c.fillStyle = col; c.fill(); for (const q of sp) ell(q.x, q.y + dy, q.r * k, q.r * k, 0, col); };
    hull(1, K.dk); hull(.88, K.body, .02 * S);
    if (!mono) { const bl = side(-.55); line(bl.slice(0, 4), K.belly, .09 * S); line(side(.45).slice(0, 4), K.lt, .03 * S); }
    if (ap.pectoral) line(ap.pectoral, K.fin, .05 * S);
    stroke(Q.neck, K.dk);
    headBlob(Q.head, K, !mono);
    if (!mono) { const [B, T] = Q.head.pts, u = unit2(B, T), n = upN(u, dir), hl = d2(B, T) / 2, e = [B[0] + 1.25 * hl * u[0] + .3 * Q.head.r * n[0], B[1] + 1.25 * hl * u[1] + .3 * Q.head.r * n[1]]; ell(e[0], e[1], .22 * Q.head.r, .22 * Q.head.r, 0, '#FFFFFF'); ell(e[0] + .04 * hl * u[0], e[1] + .04 * hl * u[1], .12 * Q.head.r, .12 * Q.head.r, 0, K.eye); }
  }
  // Borboleta: asa de lá, corpo fino (tórax e abdome em cápsula), pescoço, cabeça, antenas com ponta, asa de cá; as asas
  // giram no tórax com a fase do batimento (pose.wings).
  const BFLYK = { body: '#3A3346', dk: '#241F2E', lt: '#6E6680', wing: '#4FA3D9', wingDk: '#2B6E9E', spot: '#F4E3BE', far: '#3B7FAE' };
  function butterfly(a, K) {
    const p = a.pose, S = p.size, dir = p.facing, Q = byName(a), [th, ab] = p.spine, w = p.wings || { phase: 0, open: 1 }, mono = K === MONO;
    const wing = (col, edge, k) => {
      const ang = -Math.PI / 2 - dir * (.15 + .75 * Math.cos(TAU * w.phase)) + dir * k, s = .55 * S;
      for (const [L, wd, off, cl] of [[s, .3 * S, 0, col], [.7 * s, .24 * S, .55, edge]]) {
        const a2 = ang - dir * off, cx = th.x + Math.cos(a2) * L / 2, cy = th.y + Math.sin(a2) * L / 2;
        ell(cx, cy, L / 2, wd / 2, a2, cl);
        if (!mono && cl === col) { ell(cx + Math.cos(a2) * L * .28, cy + Math.sin(a2) * L * .28, .07 * S, .05 * S, a2, K.wingDk); ell(cx + Math.cos(a2) * L * .3, cy + Math.sin(a2) * L * .3, .03 * S, .03 * S, 0, K.spot); }
      }
    };
    wing(mono ? K.dk : K.far, mono ? K.dk : K.wingDk, .25);
    line([[th.x, th.y], [ab.x, ab.y]], K.body, .1 * S); ell(th.x, th.y, th.r, th.r * .9, 0, K.body);
    stroke(Q.neck, K.body); headBlob(Q.head, K, false);
    for (const ap of Object.values(p.appendages)) { line(ap, K.dk, .015 * S); const e = ap.at(-1); ell(e[0], e[1], .025 * S, .025 * S, 0, K.dk); }
    wing(K.wing, K.wingDk, 0);
  }
  // Besouro: patas de lá, élitros em cúpula (costura e realce), pronoto, patas de cá, pescoço, cabeça e antenas.
  const BEETK = { body: '#2F6E5A', dk: '#1B3F36', lt: '#8FD4B0', leg: '#1F2430', far: '#141820', eye: '#E8F2EE' };
  function beetle(a, K) {
    const p = a.pose, S = p.size, Q = byName(a), [pr, el] = p.spine, L = Object.entries(p.limbs), mono = K === MONO;
    const leg = (n, col) => { for (const k of ['upper', 'lower', 'foot']) stroke(Q[`${n}.${k}`], col); };
    for (const [n, l] of L) if (l.far) leg(n, K.far);
    blob(el.x, el.y, el.r * 1.15, el.r * .85, el.angle, K);
    if (!mono) line([[el.x - Math.cos(el.angle) * el.r, el.y - Math.sin(el.angle) * el.r - .05 * S], [el.x + Math.cos(el.angle) * el.r, el.y + Math.sin(el.angle) * el.r - .05 * S]], K.dk, .012 * S);
    for (const [n, l] of L) if (!l.far) leg(n, K.leg);
    stroke(Q.neck, K.dk);
    blob(pr.x, pr.y, pr.r * 1.2, pr.r * .9, pr.angle, K);
    headBlob(Q.head, K, false);
    if (!mono) { const [hx, hy] = mid(Q.head.pts); ell(hx + p.facing * .3 * Q.head.r, hy - .2 * Q.head.r, .22 * Q.head.r, .22 * Q.head.r, 0, K.eye); }
    for (const ap of Object.values(p.appendages)) line(ap, K.leg, .012 * S);
  }
  // Roupas de cada pessoa de P (o explorador de H usa a paleta); shorts = canela de pele; hair = cor do cabelo.
  const OUTFIT = {
    corredor: { shirt: '#3E8FB0', shirtDk: '#2A6A86', pants: '#2A3F52', pantsDk: '#1E2E3C', boot: '#E9E4D8', skin: '#C68A5E', skinDk: '#A06A44', hair: '#2A1E1A', shorts: 1 },
    marta: { shirt: '#B5536B', shirtDk: '#8A3A50', pants: '#6F6292', pantsDk: '#564A78', boot: '#2A2224', skin: '#8D5A3B', skinDk: '#6E4229', hair: '#1E1614' },
    joao: { shirt: '#5E9C84', shirtDk: '#3F7A64', pants: '#3D5A73', pantsDk: '#2A3F52', boot: '#5A3A2E', skin: '#F0B48A', skinDk: '#D08A64', hair: '#7A4A2A' },
    lia: { shirt: '#E8D29A', shirtDk: '#C2A866', pants: '#946AA0', pantsDk: '#755084', boot: '#4A3226', skin: '#F3C9A5', skinDk: '#D6A07A', hair: '#B5652E' },
    bia: { shirt: '#E07A5F', shirtDk: '#B85A42', pants: '#3D5A73', pantsDk: '#2A3F52', boot: '#D8603E', skin: '#C68A5E', skinDk: '#A06A44', hair: '#2A1E1A' },
    avo: { shirt: '#8C9DA6', shirtDk: '#677A84', pants: '#5A4A3E', pantsDk: '#45382E', boot: '#3A2A22', skin: '#F0B48A', skinDk: '#D08A64', hair: '#E8E4DC' },
  };
  const OK = new Map(), outfit = id => { if (!OK.has(id)) OK.set(id, { ...P, ...OUTFIT[id] }); return OK.get(id); };
  // Cena K: as cores do elenco (actor.colors, parciais) no lugar da roupa padrão, com os tons escuros derivados, e tudo
  // escurecido para a sombra da rampa do clima de luz (dim).
  const CP = new Map();
  function castPal(a, mood) {
    const o = a.colors || {}, key = mood + JSON.stringify(o);
    if (!CP.has(key)) {
      const R = STYLE.moods[mood], dk = n => o[n] && { [n + 'Dk']: mixCol(o[n], P.ink, .24) };
      CP.set(key, hazed({ ...P, ...o, ...dk('skin'), ...dk('shirt'), ...dk('pants') }, R.dim, R.shadow));
    }
    return CP.get(key);
  }
  // Pessoa em cápsulas: perna e braço de lá, mochila, perna de cá, quadril, tronco, pescoço, cabeça com rosto e cabelo (ou
  // chapéu), braço de cá. mode: 'all' (sombra), 'body' (sem os membros de actor.front) ou 'front' (só eles, por cima do outro).
  function human(a, K, mode = 'all') {
    const p = a.pose, S = p.size, dir = p.facing, J = p.joints, Q = byName(a), R = Q.head.r, [hx, hy] = mid(Q.head.pts), mono = K === MONO, Ls = Object.entries(p.limbs);
    const ch = { x: J.chest[0], y: J.chest[1] }, pv = { x: J.pelvis[0], y: J.pelvis[1] }, gear = a.gear || [], T = Q.torso, g = T.r, hat = gear.includes('hat'), hood = gear.includes('hood'), helm = gear.includes('helmet');
    // Perna: pé, canela e, por cima, a coxa com contorno mais escuro: o fim redondo dela sobre a canela marca o joelho.
    const leg = (s, far) => {
      const pc = far ? K.pantsDk : K.pants, th = Q['thigh' + s];
      stroke(Q['foot' + s], far ? mixCol(K.boot, P.ink, .4) : K.boot); stroke(Q['shin' + s], K.shorts ? (far ? K.skinDk : K.skin) : pc);
      stroke(th, mixCol(pc, P.ink, .35), 1 + .1 * Math.min(1, 30 / th.r)); stroke(th, pc);
    };
    const arm = (s, far) => { stroke(Q['upperArm' + s], far ? K.shirtDk : K.shirt); stroke(Q['forearm' + s], far ? K.skinDk : K.skin); hand(Q['hand' + s], p.limbs['arm' + s].hand, far ? K.skinDk : K.skin, far ? mixCol(K.skinDk, P.ink, .25) : K.skinDk); };
    const front = new Set(mode === 'all' ? [] : a.front || []);
    if (mode === 'front') { for (const n of front) arm(n.slice(-1), p.limbs[n].far); return; }
    for (const [n, l] of [...Ls].sort((u, v) => u[1].foot - v[1].foot)) if (l.far && !front.has(n)) (l.foot ? leg : arm)(n.slice(-1), true);  // o braço de lá fica atrás da perna de lá
    const ta = Math.atan2(ch.y - pv.y, ch.x - pv.x) + Math.PI / 2;  // quadro do tronco: x para a frente (dir), y desce para a pelve
    if (gear.includes('backpack')) local(ch.x, ch.y, ta, 1, () => {  // colada às costas, do ombro à cintura: a borda da frente entra sob o tronco
      const bx = -dir * (g + .045 * S), L = d2(J.chest, J.pelvis);
      c.beginPath(); c.roundRect(bx - .075 * S, -.04 * S, .15 * S, L + .02 * S, .045 * S); c.fillStyle = K.packDk; c.fill();
      c.beginPath(); c.roundRect(bx - .07 * S - dir * .012 * S, -.05 * S, .14 * S, L, .04 * S); c.fillStyle = K.pack; c.fill();
      c.beginPath(); c.roundRect(bx - dir * .03 * S - .04 * S, .45 * L, .08 * S, .08 * S, .02 * S); c.fillStyle = K.packDk; c.fill();
    });
    for (const [n, l] of Ls) if (!l.far && l.foot) leg(n.slice(-1), false);
    // Quadril: meia elipse da calça sob a pelve (o tronco cobre a metade de cima; embaixo para rente à coxa e ao assento).
    local(pv.x, pv.y, ta, 1, () => ell(0, 0, .92 * g, .05 * S, 0, K.pants));
    // Tronco: faixa do peito à pelve com o ombro redondo em cima (disco de raio r no peito), sombra e cor por dentro.
    stroke(T, K.shirtDk); ell(ch.x, ch.y, g, g, 0, K.shirtDk);
    if (!gear.length) local(pv.x, pv.y, ta, 1, () => ell(0, -.01 * S, g, .06 * S, 0, K.shirtDk));  // barra solta e redonda
    stroke(T, K.shirt, .86, -.011 * S, -.011 * S); ell(ch.x - .011 * S, ch.y - .011 * S, .86 * g, .86 * g, 0, K.shirt);
    if (!gear.length) local(pv.x - .011 * S, pv.y - .011 * S, ta, 1, () => ell(0, -.016 * S, .86 * g, .045 * S, 0, K.shirt));
    else local(pv.x, pv.y, ta, 1, () => line([[-.9 * g, -.012 * S], [.9 * g, -.012 * S]], K.pantsDk, .022 * S));  // cinto
    if (gear.includes('backpack')) local(ch.x, ch.y, ta, 1, () => {  // alça sobre o ombro, da mochila ao peito
      c.beginPath(); c.moveTo(-dir * .7 * g, -.04 * S); c.quadraticCurveTo(-dir * .1 * g, -1.05 * g, dir * .55 * g, -.4 * g); c.quadraticCurveTo(dir * .8 * g, .3 * g, dir * .5 * g, 1.1 * g);
      c.strokeStyle = K.packDk; c.lineWidth = .026 * S; c.lineCap = 'round'; c.stroke();
    });
    stroke(Q.neck, K.skinDk);
    if (p.appendages.hair) line(p.appendages.hair, K.hair, .05 * S);
    local(hx, hy, p.head.angle, dir, () => {
      ell(0, 0, R, R, 0, K.skinDk); ell(-.05 * R, -.06 * R, R * .93, R * .93, 0, K.skin);
      if (hood) {  // capuz: calota larga atrás e em cima, aberta no rosto
        c.beginPath(); c.arc(0, 0, R * 1.22, Math.PI * .42, Math.PI * 1.8); c.quadraticCurveTo(.2 * R, -.7 * R, -.05 * R, -.2 * R); c.quadraticCurveTo(-.15 * R, .45 * R, .1 * R, 1.1 * R); c.closePath();
        c.fillStyle = K.shirtDk; c.fill();
      } else if (!hat && !helm) {  // cabelo: calota atrás e em cima, com franja curta
        c.beginPath(); c.arc(0, 0, R * 1.04, Math.PI * .62, Math.PI * 1.72); c.quadraticCurveTo(.2 * R, -.55 * R, -.25 * R, -.35 * R); c.quadraticCurveTo(-.45 * R, .1 * R, -.42 * R, .7 * R); c.closePath();
        c.fillStyle = K.hair; c.fill();
      }
      if (!hood) ell(-.2 * R, .08 * R, .15 * R, .2 * R, 0, K.skinDk);  // orelha
      if (!mono) face(p, R, K);
      if (helm) {  // capacete: cúpula com aba curta e realce em cima à esquerda
        c.beginPath(); c.ellipse(-.06 * R, -.1 * R, 1.1 * R, 1.02 * R, 0, Math.PI, TAU); c.fillStyle = mono ? K.hat : '#7E8A96'; c.fill();
        ell(0, -.1 * R, 1.22 * R, .14 * R, 0, mono ? K.hat : '#5E6874');
        if (!mono) ell(-.45 * R, -.75 * R, .3 * R, .14 * R, -.4, '#C2CCD4');
      }
      if (!hat) return;
      // chapéu de explorador: copa, faixa e aba
      const jolt = p.face.expression === 'surprised' ? clamp(p.emote ? p.emote.k : 1, 0, 1.3) : 0;  // susto: o chapéu salta e inclina para trás
      c.translate(-.6 * R, -(.5 + .35 * jolt) * R); c.rotate(-.32 * jolt); c.translate(.6 * R, .5 * R);
      c.beginPath(); c.ellipse(-.05 * R, -.5 * R, .98 * R, .85 * R, 0, Math.PI, TAU); c.fillStyle = K.hat; c.fill();
      c.beginPath(); c.ellipse(-.05 * R, -.5 * R, .98 * R, .26 * R, 0, Math.PI, TAU); c.fillStyle = K.pants; c.fill();
      ell(.05 * R, -.5 * R, 1.42 * R, .19 * R, 0, K.hatDk);
      if (!mono) ell(-.45 * R, -1.02 * R, .3 * R, .14 * R, -.4, '#F2E2B8');
    });
    for (const [n, l] of Ls) if (!l.far && !l.foot && !front.has(n)) arm(n.slice(-1), false);
    if (p.emote && !mono) emote(p, .1 * S);  // selo no tamanho de antes da cabeça do esqueleto
  }
  // Mão (parte hand: eixo do pulso até r antes da ponta): open = luva com polegar; fist = punho redondo e cheio;
  // point = palma curta e o indicador fino até a ponta.
  function hand(q, kind, col, dk) {
    const [a, b] = q.pts, u = unit2(a, b), L = d2(a, b), at3 = k => [a[0] + k * L * u[0], a[1] + k * L * u[1]];
    if (kind === 'fist') { const m = at3(.55); ell(m[0], m[1], .45 * L + q.r, 1.15 * q.r, Math.atan2(u[1], u[0]), col); ell(m[0] + .3 * q.r * u[1], m[1] - .3 * q.r * u[0], .3 * L, .35 * q.r, Math.atan2(u[1], u[0]), dk); return; }
    if (kind === 'point') { stroke({ ...q, pts: [a, at3(.45)], r: 1.05 * q.r }, col); stroke({ ...q, pts: [at3(.4), b], r: .42 * q.r }, col); return; }
    stroke(q, col);
  }
  // Rosto no quadro local da cabeça (x para a frente): olhos de ponto, sobrancelhas, nariz, bochecha e boca por expressão;
  // na fala, a boca da sílaba (pose.face.mouth: m fechada, e pequena, a aberta, o redonda). happy = olhos em arco.
  function face(p, R, K) {
    const e = p.face.expression, b = clamp(p.face.blink), shock = e === 'surprised' && p.emote?.sym === '!', joy = e === 'surprised' && !shock;
    const sur = shock, cur = e === 'curious', hap = e === 'happy' || joy, mo = p.face.mouth, lip = '#6A2B2B';
    ell(.95 * R, .14 * R, .13 * R, .12 * R, 0, K.skinDk);  // nariz
    ell(.55 * R, .3 * R, .14 * R, .1 * R, 0, rgba('#F08A7A', hap ? .7 : .45));
    for (const [ex, ey, k, near] of [[.4 * R, -.06 * R, 1, true], [.78 * R, -.08 * R, .78, false]]) {
      if (b > .7) line([[ex - .08 * R * k, ey], [ex + .08 * R * k, ey]], P.ink, .045 * R);
      else if (sur) { ell(ex, ey - .04 * R, .2 * R * k, .25 * R * k * (1 - b), 0, '#FFFFFF'); ell(ex + .04 * R, ey - .04 * R, .07 * R * k, .08 * R * k * (1 - b), 0, P.ink); }
      else if (joy) { ell(ex, ey - .02 * R, .1 * R * k, .12 * R * k * (1 - b), 0, P.ink); ell(ex - .03 * R, ey - .06 * R, .035 * R, .035 * R, 0, '#FFFFFF'); }
      else if (hap) { c.beginPath(); c.moveTo(ex - .1 * R * k, ey + .03 * R); c.quadraticCurveTo(ex, ey - .12 * R, ex + .1 * R * k, ey + .03 * R); c.strokeStyle = P.ink; c.lineWidth = .055 * R; c.lineCap = 'round'; c.stroke(); }
      else ell(ex, ey, .075 * R * k, .1 * R * k * (1 - b), 0, P.ink);
      const lift = sur ? .36 : joy ? .26 : hap ? .1 : cur && near ? .15 : 0, tilt = cur && near ? -.06 : sur ? -.03 : .02;
      line([[ex - .11 * R * k, -.3 * R - lift * R + tilt * R], [ex + .11 * R * k, -.32 * R - lift * R - tilt * R]], mixCol(K.hair, P.ink, .45), .055 * R);
    }
    const mx = .6 * R, my = .47 * R;
    if (mo === 'm') line([[mx - .1 * R, my], [mx + .1 * R, my]], lip, .05 * R);
    else if (mo === 'e') ell(mx, my, .13 * R, .05 * R, 0, lip);
    else if (mo === 'a') { ell(mx, my + .02 * R, .12 * R, .13 * R, 0, lip); ell(mx, my + .09 * R, .07 * R, .04 * R, 0, '#E07A7A'); }
    else if (mo === 'o') ell(mx, my + .01 * R, .07 * R, .09 * R, 0, lip);
    else if (sur) ell(mx, my + .03 * R, .1 * R, .14 * R, 0, lip);
    else if (cur) { c.beginPath(); c.moveTo(mx - .1 * R, my - .01 * R); c.quadraticCurveTo(mx + .02 * R, my + .07 * R, mx + .12 * R, my - .04 * R); c.strokeStyle = lip; c.lineWidth = .05 * R; c.lineCap = 'round'; c.stroke(); }
    else if (hap) { c.beginPath(); c.moveTo(mx - .17 * R, my - .04 * R); c.quadraticCurveTo(mx, my + .26 * R, mx + .15 * R, my - .05 * R); c.closePath(); c.fillStyle = lip; c.fill(); }
    else { c.beginPath(); c.moveTo(mx - .15 * R, my - .02 * R); c.quadraticCurveTo(mx, my + .05 * R, mx + .12 * R, my - .03 * R); c.strokeStyle = lip; c.lineWidth = .05 * R; c.lineCap = 'round'; c.stroke(); }
  }
  // Emote em selo redondo chapado ao lado do chapéu, com mola de escala.
  function emote(p, R) {
    const { sym, k, a } = p.emote; if (!(k > 0) || a <= 0) return;
    const x = p.head.x + p.facing * 1.3 * R, y = p.head.y - 2.6 * R, r = .95 * R * k;
    c.save(); c.globalAlpha *= a;
    glow(x, y, r * 3, sym === '!' ? '#FFB38A' : '#FFE08A', .35 * a);
    ell(x + .08 * r, y + .1 * r, r, r, 0, rgba(P.ink, .18)); ell(x, y, r, r, 0, sym === '!' ? P.pack : P.shirt);
    c.fillStyle = '#FFFFFF'; c.font = `700 ${1.3 * r}px "Segoe UI", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sym, x, y + .06 * r);
    c.restore();
  }
  // Um ator: câmera da camada, sombra (mono), virada (só A). O corpo não se deforma por pose.sq (mudaria os ossos).
  // front = só os membros de actor.front, por cima de quem está à frente.
  const BEAST = { dog: [dog, FOXK], bird: [bird, BIRDK], fish: [fish, FISHK], butterfly: [butterfly, BFLYK], beetle: [beetle, BEETK] };
  function actor(a, F, mono, front = false) {
    const p = a.pose; at(a.layer);
    c.save();
    if (mono) skew(a.gy);
    if (a.flip) { const m = (p.spine[0].x + p.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
    c.globalAlpha = a.alpha ?? 1;
    if (a.kind === 'human') human(a, mono ? MONO : F.scene === 'K' ? castPal(a, F.world.kit.mood) : OUTFIT[a.id] ? outfit(a.id) : P, front ? 'front' : mono ? 'all' : 'body');
    else if (a.kind === 'fly') fly(a, mono ? MONO : a.layer < 1 ? hazed(FLYK, .3) : FLYK);
    else if (BEAST[a.kind]) BEAST[a.kind][0](a, mono ? MONO : BEAST[a.kind][1]);
    else {
      const under = a.role === 'tunnel' || a.role === 'garden';
      ant(a, mono ? MONO : antPal(a.role === 'hero', under ? P.cave : P.haze, under ? .12 : Math.round((1 - a.layer) * 10) / 10 * .7));
    }
    c.restore();
  }
  // Grupo de atores: sombras longas de quem pisa o chão (e dos adereços), depois corpos e adereços por profundidade (o
  // adereço antes do ator de mesma profundidade) e, por último, os braços de actor.front. prop = {depth, draw, shadow?, gy?}.
  function group(F, list, props = []) {
    list = list.filter(a => !a.hidden);
    const cast = list.filter(a => a.ground && a.kind !== 'fly' && a.kind !== 'fish' && a.kind !== 'butterfly' && !(a.kind === 'bird' && a.air) && a.role !== 'tunnel' && a.role !== 'garden');
    for (const a of cast) { const p = a.pose; a.gy = a.ground((p.spine[0].x + p.spine.at(-1).x) / 2); }
    const sh = [...props.filter(q => q.shadow).map(q => () => { at(1); skew(q.gy); q.shadow(); }), ...cast.map(a => () => actor(a, F, true))];
    if (sh.length) shade(sh);
    const items = [...props.map(q => ({ layer: 1, depth: q.depth, draw: () => { at(1); q.draw(); } })), ...list.map(a => ({ layer: a.layer ?? 1, depth: a.depth || 0, draw: () => actor(a, F, false) }))];
    items.sort((u, v) => u.layer - v.layer || u.depth - v.depth).forEach(i => i.draw());
    for (const a of list) if (a.front) actor(a, F, false, true);
  }
  // Partículas (1/3 da densidade antiga): pólen só junto do capim da superfície; esporos só dentro e em volta das
  // câmaras. Posição pura de t e da câmera.
  // Na cena K, deriva, sobe e desce e cintila pela fase do loop (frequências inteiras), sem sair do lugar.
  function motes(F) {
    const { cx, cy, z } = cam, g = F.world.ground, k = F.world.kit, wide = F.shot === 'wide' || !!k, cyc = (m, h) => Math.sin(TAU * (m * k.phase + h));
    c.resetTransform();
    for (let i = 0; i < 16; i++) {
      const pf = .8 + .4 * hash(i + 400), X = k ? ((hash(i) * 2300 + 60 * cyc(1, hash(i + 7)) - cx * z * pf * .5) % 2300 + 2300) % 2300 - 190
        : ((hash(i) * 2300 + 16 * F.t * (1 + hash(i + 7)) + 70 * noise1(i, F.t * .22) - cx * z * pf * .5) % 2300 + 2300) % 2300 - 190;
      const hgt = wide ? 8 + 80 * hash(i + 3) : -150 + 280 * hash(i + 3), Y = (g((X - 960) / z + cx) - hgt - cy) * z + 540 + 18 * (k ? cyc(2, hash(i + 50)) : noise1(i + 50, F.t * .27)) * z;
      const r = (1.4 + 2.2 * hash(i + 9)) * Math.min(1.4, Math.sqrt(z)), tw = .55 + .45 * (k ? cyc(3 + i % 3, hash(i + 60)) : Math.sin(F.t * 1.6 + i * 2.3));
      glow(X, Y, r * 6, '#FFF2C0', .26 * tw); ell(X, Y, r, r, 0, rgba('#FFFBEA', .7 * tw));
    }
    if (!F.world.chambers) return;
    at(1);
    for (const [x, y, w, h, sd] of F.world.chambers) for (let k = 0; k < 5; k++) {
      const s = sd * 31 + k, px = x + (hash(s) - .5) * w * 1.1 + 14 * noise1(s, F.t * .3), py = y - ((hash(s + 1) * h * 1.3 + 9 * F.t) % (h * 1.3)), tw = .55 + .45 * Math.sin(F.t * 1.3 + s);
      glow(px, py, 16, '#FFE9B0', .3 * tw); ell(px, py, 2.4, 2.4, 0, rgba('#FFF4D6', .75 * tw));
    }
  }
  function title(s) {
    const k = ease(s.k), [nm, sci] = s.text.split(' ('), f1 = `600 ${s.size}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`, f2 = `italic 400 ${.7 * s.size}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
    c.resetTransform(); c.font = f1; const w1 = c.measureText(nm).width; c.font = f2; const t2 = sci ? '(' + sci : '', w2 = c.measureText(t2).width, gap = .3 * s.size;
    const x0 = s.x - (w1 + gap + w2) / 2, y = s.y + 24 * (1 - k);
    c.globalAlpha = s.k; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    for (const [dx, col] of [[3, rgba('#16304A', .35)], [0, '#FFFFFF']]) { c.fillStyle = col; c.font = f1; c.fillText(nm, x0 + dx, y + dx); c.font = f2; c.fillText(t2, x0 + w1 + gap + dx, y + dx); }
    c.beginPath(); c.roundRect(x0, y + .28 * s.size, (w1 + gap + w2) * k, 6, 3); c.fillStyle = P.heroLt; c.fill();
    c.globalAlpha = 1;
  }

  // ---------- P (praça) e N (lago) ----------
  const SHK = new Proxy({}, { get: () => '#16304A' });  // sombra chapada dos adereços
  // Cidade ao longe (camada f): blocos chapados na névoa com janelas em grade, por semente da coluna.
  function city(f, base) {
    at(f); const [x0, x1] = span(f), col = mixCol(P.far, P.haze, .5), win = mixCol(P.haze, '#FFFFFF', .4);
    for (let i = Math.floor(x0 / 150); i * 150 < x1; i++) {
      const w = 95 + 50 * hash(i * 3 + 1), h = 150 + 260 * hash(i * 5 + 2), x = i * 150 + 30 * hash(i);
      c.fillStyle = col; c.fillRect(x, base - h, w, h + 300);
      c.fillStyle = win; for (let y = base - h + 22; y < base - 30; y += 36) for (let u = x + 14; u < x + w - 16; u += 28) c.fillRect(u, y, 10, 16);
    }
  }
  // Poste: base, haste, braço curvo e luminária com luz quente (fonte de luz: brilho fraco de dia).
  function lamp({ x, y, h, seed }, K) {
    c.fillStyle = K.post; c.beginPath(); c.roundRect(x - .022 * h, y - .05 * h, .044 * h, .05 * h, 4); c.fill();
    c.fillRect(x - .009 * h, y - h, .018 * h, h);
    c.beginPath(); c.moveTo(x, y - h); c.quadraticCurveTo(x, y - 1.06 * h, x + .08 * h, y - 1.05 * h); c.strokeStyle = K.post; c.lineWidth = .014 * h; c.lineCap = 'round'; c.stroke();
    c.beginPath(); c.moveTo(x + .05 * h, y - 1.06 * h); c.lineTo(x + .13 * h, y - 1.06 * h); c.lineTo(x + .115 * h, y - 1.02 * h); c.lineTo(x + .065 * h, y - 1.02 * h); c.closePath(); c.fill();
    if (K === SHK) return;
    ell(x + .09 * h, y - 1.01 * h, .025 * h, .014 * h, 0, '#FFE7A8'); glow(x + .09 * h, y - 1.0 * h, .12 * h, '#FFD27A', .25);
  }
  const LAMPK = { post: '#3D4756' };
  // Banco de frente: encosto de duas ripas atrás do assento em toda a largura (seatY − backH até seatY), assento de ripa
  // com topo em seatY e pés de ferro até o chão.
  function bench(b, gy, K) {
    const x0 = b.x - b.w / 2, th = .08 * b.w, pw = .05 * b.w, bh = .16 * b.backH;
    c.fillStyle = K.iron;
    for (const lx of [x0 + .06 * b.w, x0 + .94 * b.w]) c.fillRect(lx - pw / 2, b.seatY - b.backH, pw, b.backH + th);  // postes do encosto
    for (const lx of [x0 + .1 * b.w, x0 + .9 * b.w]) c.fillRect(lx - pw / 2, b.seatY, pw, gy - b.seatY);
    c.fillStyle = K.wood;
    for (const k of [.15, .55]) { c.beginPath(); c.roundRect(x0, b.seatY - b.backH * (1 - k), b.w, bh, bh / 2); c.fill(); }  // ripas do encosto
    c.beginPath(); c.roundRect(x0 - .03 * b.w, b.seatY, 1.06 * b.w, th, th / 2); c.fill();
    if (K === SHK) return;
    c.fillStyle = K.woodLt; c.fillRect(x0, b.seatY + .012 * b.w, b.w, .02 * b.w);
    for (const k of [.15, .55]) c.fillRect(x0, b.seatY - b.backH * (1 - k) + .15 * bh, b.w, .2 * bh);
  }
  const BENCHK = { iron: '#3D4756', wood: '#B07A4A', woodLt: '#D8A26A' };
  // Chafariz: bacia de pedra, água na bacia, pedestal com prato e jatos em arco; gotas descem pelo arco (puras de t).
  function fountain({ x, y, r }, t, K) {
    const st = K.stone, top = y - .32 * r;
    if (K !== SHK) { c.fillStyle = 'rgba(143,208,224,.9)'; c.fillRect(x - .9 * r, top - .03 * r, 1.8 * r, .06 * r); }
    c.fillStyle = st; c.fillRect(x - .07 * r, y - .78 * r, .14 * r, .5 * r);
    c.beginPath(); c.ellipse(x, y - .78 * r, .3 * r, .1 * r, 0, 0, Math.PI); c.fill();
    if (K !== SHK) {
      const jet = (sd, s) => { c.beginPath(); c.moveTo(x, y - .86 * r); c.quadraticCurveTo(x + s * .35 * r, y - 1.25 * r, x + s * .72 * r, top); c.strokeStyle = 'rgba(200,236,244,.85)'; c.lineWidth = .03 * r; c.stroke();
        for (let i = 0; i < 5; i++) { const u = frac(t * .9 + i / 5 + sd), q = 1 - u, px = q * q * x + 2 * q * u * (x + s * .35 * r) + u * u * (x + s * .72 * r), py = q * q * (y - .86 * r) + 2 * q * u * (y - 1.25 * r) + u * u * top; ell(px, py, .022 * r, .022 * r, 0, '#E8F8FC'); } };
      jet(0, 1); jet(.5, -1);
      line([[x, y - .86 * r], [x, y - (1.15 + .05 * Math.sin(t * 3)) * r]], 'rgba(220,244,250,.9)', .05 * r);
    }
    c.fillStyle = st; c.beginPath(); c.roundRect(x - r, top, 2 * r, .32 * r, .05 * r); c.fill();
    if (K === SHK) return;
    c.fillStyle = K.stoneLt; c.fillRect(x - r, top, 2 * r, .05 * r);
    c.fillStyle = K.stoneDk; c.fillRect(x + .55 * r, top + .05 * r, .45 * r, .27 * r);
  }
  const STONEK = { stone: '#B4BEC2', stoneLt: '#DCE3E4', stoneDk: '#97A3A8' };
  // Tronco caído (N): corpo do topo (log.top) ao chão, casca em riscos e anel do corte na ponta da direita.
  function fallen(Lg, g, K) {
    const n = 24, top = [], bot = [];
    for (let i = 0; i <= n; i++) { const x = Lg.x0 + (Lg.x1 - Lg.x0) * i / n; top.push([x, Lg.top(x)]); bot.push([x, g(x) + 3]); }
    c.fillStyle = K.bark; c.beginPath(); [...top, ...bot.reverse()].forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill();
    if (K === SHK) return;
    line(top, K.barkLt, 6);
    for (let i = 1; i < 10; i++) { const x = Lg.x0 + (Lg.x1 - Lg.x0 - 60) * (i + .4 * hash(i + 40)) / 10, y0 = Lg.top(x), y1 = g(x); line([[x, y0 + .25 * (y1 - y0)], [x + 16 + 14 * hash(i + 50), y0 + (.45 + .2 * hash(i + 60)) * (y1 - y0)]], K.barkDk, 3.5); }
    const xm = Lg.x1 - 60, ym = (Lg.top(xm) + g(xm)) / 2, rr = (g(xm) - Lg.top(xm)) / 2;
    ell(xm, ym, rr * .6, rr * .98, 0, K.barkDk); ell(xm + 3, ym, rr * .5, rr * .86, 0, K.cut); ell(xm + 3, ym, rr * .3, rr * .52, 0, K.cutDk); ell(xm + 3, ym, rr * .1, rr * .18, 0, K.cut);
  }
  const LOGK = { bark: '#6B4A32', barkLt: '#8A6446', barkDk: '#4A3222', cut: '#D9B98A', cutDk: '#B8935F' };
  // Flor: no chão, deitada (caule para trás); na mão, o punho segura o caule e a flor sobe acima dele (k de 0 a 1 em .3 s).
  function flower(it, t, grab) {
    const r = it.r, k = it.held ? ease(seg(t, grab, grab + .3)) : 0, bx = it.x, by = it.y - 2.2 * r * k, e = lerp2([it.x - 1.8 * r, it.y + r], [it.x + .2 * r, it.y + 1.1 * r], k);
    line([[bx, by], e], P.leafDk, .3 * r);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .3; ell(bx + Math.cos(a) * .55 * r, by + Math.sin(a) * .55 * r, .5 * r, .5 * r, 0, '#E86A9A'); }
    ell(bx, by, .38 * r, .38 * r, 0, '#FFD45A');
  }
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  // Plantas da margem: árvore, flor, capim e taboa (caule, folhas e espiga), balançando por ruído.
  const FLOWC = ['#F2C14E', '#E86A9A', '#FBF6EA', '#B98BE0'];
  function plant(q, t) {
    const { x, y, h, seed } = q, sw = .07 * noise1(seed, t * .6);
    if (q.kind === 'tree') return tree(x, y + 4, h, TREE, seed);
    const blade = (a, hh, col, w) => { const tx = x + hh * Math.sin(a + sw), ty = y - hh * Math.cos(a + sw); c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x + (tx - x) * .3, y - (y - ty) * .6, tx, ty); c.quadraticCurveTo(x + (tx - x) * .5, y - (y - ty) * .4, x + w, y); c.fillStyle = col; c.fill(); };
    if (q.kind === 'grass') { for (const [a, k] of [[-.4, .7], [-.12, 1], [.2, .85], [.45, .6]]) blade(a, h * k, mixCol(P.grassDk, P.grass, .25), .07 * h); return; }
    const tip = [x + h * Math.sin(sw), y - h * Math.cos(sw)];
    if (q.kind === 'reed') {
      blade(-.25, .75 * h, P.grassDk, .04 * h); blade(.3, .6 * h, mixCol(P.grassDk, P.grass, .3), .04 * h);
      line([[x, y], tip], '#6E8F4E', .025 * h);
      const u = [Math.sin(sw), -Math.cos(sw)]; ell(x + u[0] * .8 * h, y + u[1] * .8 * h, .09 * h, .03 * h, Math.atan2(u[1], u[0]), '#7A4A2A');
      return;
    }
    blade(-.5, .35 * h, P.leafDk, .06 * h); blade(.45, .3 * h, P.leaf, .06 * h);
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + .1 * h, y - .5 * h, ...tip); c.strokeStyle = P.leafDk; c.lineWidth = .04 * h; c.stroke();
    const col = FLOWC[seed % 4];
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ell(tip[0] + Math.cos(a) * .1 * h, tip[1] + Math.sin(a) * .1 * h, .09 * h, .09 * h, 0, col); }
    ell(tip[0], tip[1], .07 * h, .07 * h, 0, '#F2A23A');
  }
  // Água do lago por cima de tudo que está abaixo de waterY à direita da beirada (peixe submerso, patas na água rasa): da
  // superfície ao fundo (o chão segue sob ela), com a margem de areia molhada no fundo.
  function water(L, g, t) {
    at(1); const [x0, x1] = span(1), xa = Math.max(L.x0, x0), xb = Math.min(L.x1, x1), st = 14 / cam.z;
    if (xb <= xa) return;
    const bed = []; for (let x = xa; x <= xb + st; x += st) bed.push([x, Math.max(L.waterY, g(x))]);
    line(bed, mixCol(P.path, P.grassDk, .35), 10);
    c.beginPath(); c.moveTo(xa, L.waterY); for (const [x, y] of bed) c.lineTo(x, y); c.lineTo(bed.at(-1)[0], L.waterY); c.closePath();
    c.globalAlpha = .85; c.fillStyle = vgrad(L.waterY, L.waterY + 160, ['#62B2C4', '#3A86A0', '#2A6A84']); c.fill(); c.globalAlpha = 1;
    c.fillStyle = 'rgba(214,240,242,.35)'; c.fillRect(xa, L.waterY, xb - xa, 10);
    line([[xa, L.waterY], [xb, L.waterY]], '#D6F0F2', 4);
    for (let i = Math.floor(xa / 190); i * 190 < xb; i++) {  // reflexos: traços claros que vão e voltam
      const u = i * 190 + 60 * hash(i * 7) + 18 * Math.sin(t * .8 + i), v = L.waterY + 18 + 70 * hash(i * 3 + 1);
      if (u > L.x0 + 20) line([[u, v], [u + 40 + 30 * hash(i), v]], 'rgba(214,240,242,.45)', 3);
    }
  }
  function ripples(list, t) {
    for (const q of list) {
      const k = clamp((t - q.t0) / 3), rx = q.r * (.15 + .85 * (1 - (1 - k) ** 2));
      for (const f of [1, .6]) { c.beginPath(); c.ellipse(q.x, q.y + 2, rx * f, .2 * rx * f, 0, 0, TAU); c.strokeStyle = `rgba(232,246,248,${(.85 * (1 - k)).toFixed(3)})`; c.lineWidth = 3; c.stroke(); }
    }
  }
  function splashes(list, t) {
    for (const q of list) {
      const age = t - q.t0, k = age / 1.2, s = q.r;
      if (k < .45) { c.beginPath(); c.moveTo(q.x - .5 * s, q.y); c.lineTo(q.x - .3 * s, q.y - s * Math.sin(Math.PI * k / .45)); c.lineTo(q.x, q.y - .2 * s); c.lineTo(q.x + .3 * s, q.y - .9 * s * Math.sin(Math.PI * k / .45)); c.lineTo(q.x + .5 * s, q.y); c.closePath(); c.fillStyle = 'rgba(232,246,248,.85)'; c.fill(); }
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * .32 + .2 * (hash(q.t0 * 13 + i) - .5), v = s * (2.2 + hash(q.t0 * 7 + i)), px = q.x + Math.cos(a) * v * age, py = q.y + Math.sin(a) * v * age + 2.6 * s * age * age;
        if (py < q.y + 4) ell(px, py, (1 - k) * .07 * s + 1.5, (1 - k) * .07 * s + 1.5, 0, '#E8F6F8');
      }
    }
  }
  const farP = x => 690 + 30 * Math.sin(x * .0019 + 1) + 10 * Math.sin(x * .006), midP = x => 840 + 14 * Math.sin(x * .004 + .4);
  const farN = x => 700 + 60 * Math.sin(x * .0016 + 2) + 16 * Math.sin(x * .007), midN = x => 880 + 16 * Math.sin(x * .0045 + 1.2);
  function drawP(F) {
    const w = F.world, g = w.ground, GY = g(cam.cx), far = mixCol(P.far, P.haze, .3);
    SHY = .2; sky(GY - 30); clouds(F);
    city(.25, 790); band(.35, farP, vgrad(640, 900, [mixCol(far, P.haze, .2), far]));
    at(.6); for (const [x, s] of [[-900, 1], [-200, .8], [700, 1.1], [1500, .9], [2400, 1]]) tree(x, midP(x) + 6, 300 * s, hazed(TREE, .35), x);
    band(.6, midP, vgrad(800, 1000, [mixCol(P.mid, P.haze, .25), mixCol(P.mid, P.haze, .1)]));
    band(1, x => g(x) - 40, vgrad(GY - 40, GY, [P.grass, P.grassDk]));
    tufts(1, x => g(x) - 40, 40, 18, P.grassDk, F.t, 17);
    // Calçada: pedra clara com juntas em perspectiva (raios a partir do centro da câmera) e faixas que se afastam.
    band(1, g, vgrad(GY, GY + 500, ['#E2D7C2', '#C9BBA2']));
    at(1); const [x0, x1] = span(1);
    for (let x = Math.floor(x0 / 140) * 140; x < x1; x += 140) line([[x, GY], [x + (x - cam.cx) * .9, GY + 600]], 'rgba(150,132,104,.35)', 2.5);
    for (const d of [26, 70, 140, 250, 420]) line([[x0, GY + d], [x1, GY + d]], 'rgba(150,132,104,.3)', 2.5);
    line([[x0, GY], [x1, GY]], '#F2EADA', 4);
    const props = [...w.trees.map(q => ({ depth: q.depth, draw: () => tree(q.x, q.y + 4, q.h, TREE, q.seed) })),
      ...w.lamps.map(q => ({ depth: q.depth, gy: q.y, draw: () => lamp(q, LAMPK), shadow: () => lamp(q, SHK) })),
      { depth: w.fountain.depth, gy: w.fountain.y, draw: () => fountain(w.fountain, F.t, STONEK), shadow: () => fountain(w.fountain, F.t, SHK) },
      { depth: w.bench.depth, gy: g(w.bench.x), draw: () => bench(w.bench, g(w.bench.x), BENCHK), shadow: () => bench(w.bench, g(w.bench.x), SHK) }];
    group(F, F.actors, props);
    if (w.item) { at(1); flower(w.item, F.t, EST.times.P.grab); }
  }
  function drawN(F) {
    const w = F.world, g = w.ground, L = w.lake, far = mixCol(P.far, P.haze, .3);
    SHY = .2; sky(L.waterY - 60); clouds(F);
    band(.3, farN, vgrad(620, 900, [mixCol(far, P.haze, .15), far]));
    at(.6); for (const [x, s] of [[-700, 1], [100, .8], [900, 1.1], [1700, .9], [2500, 1], [3300, .85]]) tree(x, midN(x) + 6, 260 * s, hazed(TREE, .35), x);
    band(.6, midN, vgrad(840, 1000, [mixCol(P.mid, P.haze, .25), mixCol(P.mid, P.haze, .1)]));
    band(.6, x => L.waterY - 34, vgrad(L.waterY - 40, L.waterY, [mixCol('#62B2C4', P.haze, .35), '#62B2C4']));  // o lago ao longe, sob a outra margem
    const GY = g(cam.cx);
    band(1, g, vgrad(GY, GY + 400, [P.grass, P.grassDk]));
    at(1); const [x0, x1] = span(1), pts = []; for (let x = x0; x <= Math.min(x1, L.x0); x += 14) pts.push([x, g(x)]);
    if (pts.length > 1) line(pts, P.grassLt, 5 / Math.sqrt(cam.z));
    tufts(1, x => x < L.x0 - 60 ? g(x) : 1e5, 44, 18, mixCol(P.grassDk, P.grass, .3), F.t, 23);
    if (w.nest) { const k = w.nest.r / 150; c.save(); c.translate(w.nest.x, w.nest.y); c.scale(k, k); mound(0, 0); c.restore(); }
    const Lg = w.log, props = w.plants.map(q => ({ depth: q.depth, draw: () => plant(q, F.t) }));
    if (Lg) props.push({ depth: Lg.depth, gy: g((Lg.x0 + Lg.x1) / 2), draw: () => fallen(Lg, g, LOGK), shadow: () => fallen(Lg, g, SHK) });
    group(F, F.actors, props);
    water(L, g, F.t); at(1); ripples(w.ripples, F.t); splashes(w.splashes, F.t);
  }

  // Perfis do plano H (o mundo dele só traz o chão).
  const farH = x => 600 + 55 * Math.sin(x * .0021 + .3) + 18 * Math.sin(x * .007), midH = x => 770 + 28 * Math.sin(x * .0042 + 1.7) + 9 * Math.sin(x * .013);

  // ---------- K (kit de episódio, src/episode/kit.js) ----------
  // Cores pela rampa do mood (STYLE.moods): cada camada f tem o tom de far → mid → near; adereços e prédios levam a cor
  // própria escurecida por dim e misturada ao tom da camada, mais quanto mais longe. Tudo é função de kit.phase.
  const SURF = { sand: '#E4C48C', stone: '#B8B0A2', snow: '#EEF3F8' };
  const KC = { trunk: '#6E4A36', leaf: '#4E9A5E', wall: '#DCCAA6', roof: '#B0583E', dome: '#5E8C8A', sea: '#3A86A0', wood: '#7A4A32', sail: '#F2E8D4', camel: '#C49A64', stone: '#D8CDB4', paper: '#EDE0BE', land: '#D2B77E', mark: '#B5452E' };
  function drawK(F) {
    const K = F.world.kit, R = STYLE.moods[K.mood], S = K.sky, I = K.interior, M = K.map, sx = SHX;
    const lc = f => f <= .5 ? mixCol(R.far, R.mid, f / .5) : mixCol(R.mid, R.near, (f - .5) / .5);
    const tint = (col, f) => mixCol(mixCol(col, R.shadow, R.dim), lc(f), .25 + .4 * (1 - f));
    const poly = (pts, col) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = col; c.fill(); };
    const gl = .35 + 1.2 * R.dim;  // força do brilho: fraco de dia, forte à noite
    // Céu (f = 0 fora; dentro, pela câmera f = 1 e só na janela), com a rampa da janela no interior.
    const skyK = (Rs, x, y, w, h) => {
      c.fillStyle = vgrad(y, y + h, [Rs.skyTop, mixCol(Rs.skyTop, Rs.skyLow, .55), Rs.skyLow]); c.fillRect(x, y, w, h);
      for (const s of S.stars) { ell(s.x, s.y, s.r, s.r, 0, rgba('#FFFFFF', .35 + .6 * s.tw)); if (s.r > 1.8) glow(s.x, s.y, 8 * s.r, '#CFE0FF', .25 * s.tw); }
      const o = S.celestial;
      if (o && o.kind === 'sun') { glow(o.x, o.y, 9 * o.r, Rs.glow, .2 + .25 * o.glow); glow(o.x, o.y, 3.5 * o.r, '#FFF6DC', .55); ell(o.x, o.y, o.r, o.r, 0, '#FFF6DC'); }
      else if (o) { glow(o.x, o.y, 6 * o.r, '#CFE0FF', .3 * o.glow); ell(o.x, o.y, o.r, o.r, 0, '#F2EEDC'); for (const [u, v, q] of [[-.3, -.2, .22], [.25, .2, .16], [.1, -.45, .1]]) ell(o.x + u * o.r, o.y + v * o.r, q * o.r, q * o.r, 0, '#D8D2BE'); }
      const wet = K.weather.kind === 'rain' || K.weather.kind === 'snow', cl = mixCol(mixCol(mixCol(P.cloud, Rs.light, .25), '#8C96A0', wet ? .4 : 0), Rs.shadow, Rs.dim * 1.1);
      const CK = { cloud: cl, cloudDk: mixCol(cl, Rs.skyTop, .35) };
      for (const o of S.clouds) cloud(o.x, o.y, o.w / 320, CK);
      const m = S.meteor;
      if (m && m.k > 0 && m.k < 1) { const x = lerp(m.x0, m.x1, m.k), y = lerp(m.y0, m.y1, m.k), a = Math.sin(Math.PI * m.k); line([[x - .22 * (m.x1 - m.x0), y - .22 * (m.y1 - m.y0)], [x, y]], rgba('#FFF6DC', .7 * a), 3); glow(x, y, 40, '#FFF6DC', .6 * a); }
    };
    const weather = () => {
      at(1);
      for (const d of K.weather.drops) if (K.weather.kind === 'rain') line([[d.x, d.y], [d.x, d.y - 28 * d.k]], rgba(R.light, .28 + .3 * d.k), 2); else ell(d.x, d.y, 2 + 2.5 * d.k, 2 + 2.5 * d.k, 0, rgba('#FFFFFF', .55 + .35 * d.k));
    };
    const fog = (k, x, y, w, h, col) => { if (k > 0) { c.fillStyle = vgrad(y, y + h, [rgba(col, .2 * k), rgba(col, .85 * k)]); c.fillRect(x, y, w, h); } };
    // Sombras longas para o lado oposto à luz principal (sol, lua ou a vela), mais longas no sol baixo.
    const src = I ? K.lights[0] : S.celestial;
    SHX = (src && src.x > 960 ? -1 : 1) * (src && src.kind === 'sun' && src.y > 400 ? 1.7 : STYLE.effects.longShadow); SHY = .2;
    c.resetTransform();
    if (M) {  // mapa sobre a mesa: papel com sombra, terras com borda escura deslocada, cidades e a rota até a fração k
      c.fillStyle = vgrad(0, H, ['#6A4E3A', '#4A3428']); c.fillRect(0, 0, W, H); at(1);
      const pp = M.paper; c.fillStyle = rgba(R.shadow, .35); c.fillRect(pp.x + 14, pp.y + 18, pp.w, pp.h);
      c.fillStyle = vgrad(pp.y, pp.y + pp.h, [KC.paper, mixCol(KC.paper, '#C8B48A', .6)]); c.fillRect(pp.x, pp.y, pp.w, pp.h);
      c.fillStyle = rgba('#7FAFB4', .35); c.fillRect(pp.x + 30, pp.y + 30, pp.w - 60, pp.h - 60);
      const ink = '#7A5A3A';
      if (M.border) { c.strokeStyle = ink; c.lineWidth = 4; c.strokeRect(pp.x + 14, pp.y + 14, pp.w - 28, pp.h - 28); c.lineWidth = 1.5; c.strokeRect(pp.x + 22, pp.y + 22, pp.w - 44, pp.h - 44); }
      for (const w of M.waves) { c.beginPath(); c.moveTo(w.x - 14, w.y); c.quadraticCurveTo(w.x - 7, w.y - 7, w.x, w.y); c.quadraticCurveTo(w.x + 7, w.y - 7, w.x + 14, w.y); c.strokeStyle = rgba('#3A6E80', .6); c.lineWidth = 3; c.lineCap = 'round'; c.stroke(); }
      for (const co of M.coasts) { c.save(); c.translate(5, 7); poly(co, mixCol(KC.land, '#6A4E3A', .45)); c.restore(); poly(co, KC.land); }
      for (const o of M.peaks) { const pk = mixCol(KC.land, '#6A4E3A', .5); poly([[o.x - .6 * o.s, o.y], [o.x, o.y - o.s], [o.x + .6 * o.s, o.y]], pk); poly([[o.x - .6 * o.s, o.y], [o.x, o.y - o.s], [o.x - .1 * o.s, o.y]], mixCol(pk, KC.paper, .35)); poly([[o.x - .2 * o.s, o.y - .67 * o.s], [o.x, o.y - o.s], [o.x + .2 * o.s, o.y - .67 * o.s]], KC.paper); }
      for (const o of M.woods) { c.fillStyle = '#6E4A36'; c.fillRect(o.x - .05 * o.s, o.y - .3 * o.s, .1 * o.s, .3 * o.s); ell(o.x + .04 * o.s, o.y - .6 * o.s, .34 * o.s, .34 * o.s, 0, mixCol(KC.leaf, '#2F5A3A', .4)); ell(o.x, o.y - .63 * o.s, .3 * o.s, .3 * o.s, 0, KC.leaf); }
      if (M.compass) {  // rosa dos ventos: anel e estrela de quatro pontas em facetas, norte em vermelho
        const { x, y, r } = M.compass; c.beginPath(); c.arc(x, y, r, 0, TAU); c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
        for (const [ux, uy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const tip = [x + ux * r, y + uy * r], s = [x - uy * .2 * r, y + ux * .2 * r], t = [x + uy * .2 * r, y - ux * .2 * r], n = uy < 0;
          poly([[x, y], tip, s], n ? KC.mark : ink); poly([[x, y], tip, t], n ? mixCol(KC.mark, KC.paper, .4) : mixCol(ink, KC.paper, .45)); }
        ell(x, y, .08 * r, .08 * r, 0, KC.paper);
      }
      if (M.route) {
        const Pt = M.route.pts, d = Pt.slice(1).map((q, i) => d2(Pt[i], q)); let left = M.route.k * d.reduce((u, v) => u + v, 0); const pts = [Pt[0]];
        for (let i = 0; i < d.length && left > 0; i++) { const u = Math.min(1, left / d[i]); pts.push(lerp2(Pt[i], Pt[i + 1], u)); left -= d[i]; }
        c.setLineDash([22, 14]); line(pts, KC.mark, 7); c.setLineDash([]); const e = pts.at(-1); ell(e[0], e[1], 9, 9, 0, KC.mark);
      }
      for (const m of M.marks) { ell(m.x + 3, m.y + 4, 15, 15, 0, rgba(R.shadow, .3)); ell(m.x, m.y, 15, 15, 0, KC.mark); ell(m.x - 2, m.y - 2, 6, 6, 0, '#FBF6EA'); }
      SHX = sx; c.resetTransform(); return;
    }
    if (I) {  // parede e piso; a janela mostra o céu e o clima da hora (K.time)
      const wn = I.window, WR = STYLE.moods[K.time]; at(1); const [x0, x1] = span(1), yb = ybot();
      c.fillStyle = vgrad(I.wall.y0, I.wall.y1, [R.skyTop, R.skyLow]); c.fillRect(x0, cam.cy - 700, x1 - x0, I.floorY - cam.cy + 700);
      c.fillStyle = R.far; c.fillRect(x0, I.floorY - 70, x1 - x0, 70); c.fillStyle = mixCol(R.far, R.light, .2); c.fillRect(x0, I.floorY - 70, x1 - x0, 6);
      c.fillStyle = vgrad(I.floorY, I.floorY + 260, [R.ground, mixCol(R.ground, R.shadow, .5)]); c.fillRect(x0, I.floorY, x1 - x0, yb - I.floorY);
      for (const d of [16, 48, 100, 180]) line([[x0, I.floorY + d], [x1, I.floorY + d]], rgba(R.shadow, .25), 3);
      c.save(); c.beginPath(); c.rect(wn.x, wn.y, wn.w, wn.h); c.clip();
      skyK(WR, wn.x, wn.y, wn.w, wn.h); weather(); fog(K.weather.fog, wn.x, wn.y, wn.w, wn.h, WR.skyLow);
      c.restore(); at(1);
      const fr = R.near, fl = mixCol(R.near, R.light, .25);
      c.fillStyle = fr; for (const [x, y, w, h] of [[wn.x - 16, wn.y - 16, wn.w + 32, 16], [wn.x - 16, wn.y + wn.h, wn.w + 32, 16], [wn.x - 16, wn.y, 16, wn.h], [wn.x + wn.w, wn.y, 16, wn.h], [wn.x + wn.w / 2 - 6, wn.y, 12, wn.h], [wn.x, wn.y + wn.h * .45 - 6, wn.w, 12]]) c.fillRect(x, y, w, h);
      c.fillStyle = fl; c.fillRect(wn.x - 30, wn.y + wn.h + 10, wn.w + 60, 14);
      for (const o of I.props) {
        const { x, y, s } = o, wd = R.mid, wk = R.near, wl = mixCol(R.mid, R.light, .3);
        if (o.kind === 'shelf') {
          c.fillStyle = wk; c.fillRect(x - o.w / 2, y - s, o.w, s); c.fillStyle = wl; c.fillRect(x - o.w / 2, y - s, o.w, 5);
          for (const u of [-.38, .38]) poly([[x + u * o.w - 10, y], [x + u * o.w + 10, y], [x + u * o.w, y + 40]], wk);
          for (let i = 0, bx = x - o.w / 2 + 16; bx < x + o.w / 2 - 30; i++) { const bw = 18 + 14 * hash(i + K.seed), bh = 50 + 40 * hash(i * 3 + K.seed); c.fillStyle = tint(['#8A3A2A', '#3D5A73', '#5E9C84', '#C9A040'][i % 4], .8); c.fillRect(bx, y - s - bh, bw, bh); bx += bw + 4; }
        } else if (o.kind === 'table') {
          for (const u of [-.42, .42]) { c.fillStyle = wk; c.fillRect(x + u * o.w - 9, y - s, 18, s); }
          c.fillStyle = wk; c.fillRect(x - o.w / 2, y - s, o.w, 20); c.fillStyle = wd; c.fillRect(x - o.w / 2, y - s, o.w, 14); c.fillStyle = wl; c.fillRect(x - o.w / 2, y - s, o.w, 4);
        } else if (o.kind === 'candle') {
          c.fillStyle = '#E8DCC0'; c.fillRect(x - 8, y - s, 16, s); c.fillStyle = '#F8F0DC'; c.fillRect(x - 8, y - s, 6, s); ell(x, y, 22, 6, 0, wk);
          const fh = o.flame.h, sw = (o.flame.flick - .5) * .25 * fh, fy = y - s - 2;
          poly([[x - .3 * fh, fy], [x + sw, fy - fh], [x + .3 * fh, fy]], '#FF9E3A'); ell(x, fy - .1 * fh, .3 * fh, .3 * fh, 0, '#FF9E3A');
          poly([[x - .16 * fh, fy - .05 * fh], [x + .7 * sw, fy - .7 * fh], [x + .16 * fh, fy - .05 * fh]], '#FFE7A8'); ell(x, fy - .15 * fh, .16 * fh, .16 * fh, 0, '#FFE7A8');
        } else if (o.kind === 'book') { c.fillStyle = '#6A2A20'; c.fillRect(x - s / 2, y - 14, s, 14); c.fillStyle = '#F2E8D0'; c.fillRect(x - s / 2 + 4, y - 11, s - 8, 6); }
        else if (o.kind === 'scroll') { c.fillStyle = '#E8D8B0'; c.fillRect(x - s / 2, y - 16, s, 16); for (const u of [-.5, .5]) ell(x + u * s, y - 8, 7, 9, 0, '#B89A62'); }
        else if (o.kind === 'chair') {
          const b = x - o.dir * .32 * s; c.fillStyle = wk;
          c.fillRect(b - 6, y - 2.4 * s, 12, 2.4 * s); c.fillRect(x + o.dir * .3 * s - 6, y - s, 12, s);
          c.fillStyle = wd; c.fillRect(x - .38 * s, y - s, .76 * s, 12); c.fillStyle = wl; c.fillRect(x - .38 * s, y - s, .76 * s, 4);
        }
      }
    } else {
      at(0); const [x0, x1] = span(0); skyK(R, x0, cam.cy - 600 / cam.z - 60, x1 - x0, 1300 / cam.z);
    }
    // Luzes de uma faixa de camadas (f0, f1]: as de fundo logo depois da camada delas, as do chão por cima dos atores.
    const lights = (f0, f1) => { for (const l of K.lights) if (l.f > f0 && l.f <= f1) {
      at(l.f);
      if (l.r <= 12) { glow(l.x, l.y, 6 * l.r, R.glow, .9 * l.k); ell(l.x, l.y, 2.6, 2.6, 0, rgba('#FFF6C0', l.k)); }
      else { glow(l.x, l.y, l.r, R.glow, gl * l.k); glow(l.x, l.y, .3 * l.r, '#FFF2C8', .5 * gl * l.k); }
    } };
    let stage = 0, lf = -1;
    K.layers.forEach((l, li) => {
      const f = l.f, col = lc(f);
      // Névoa em dois véus: antes das camadas do meio e antes do chão; o que está perto fica mais nítido.
      while (!I && K.weather.fog && stage < 2 && f >= (stage ? 1 : .5)) { c.resetTransform(); fog(K.weather.fog * (stage ? .45 : .6), 0, 0, W, H, R.skyLow); stage++; }
      if (l.kind === 'ridge') band(f, l.prof, vgrad(l.prof(960) - 160, l.prof(960) + 260, [mixCol(col, R.skyLow, .22), col]));
      else if (l.kind === 'dunes') { const d = tint(SURF.sand, f); band(f, l.prof, vgrad(l.prof(960) - 100, l.prof(960) + 200, [mixCol(d, R.light, .3), d])); }
      else if (l.kind === 'ground') {
        const gc = SURF[l.surface] ? tint(SURF[l.surface], 1) : R.ground, gy = l.prof(cam.cx);
        band(1, l.prof, vgrad(gy, gy + 260, [gc, mixCol(gc, R.shadow, .35)])); edge(1, l.prof, mixCol(gc, R.light, .3), 5);
        if (l.surface === 'grass') tufts(1, l.prof, 40, 18, mixCol(gc, R.shadow, .3), 0, K.seed, K.phase);
        if (l.surface === 'stone') { at(1); const [a, b] = span(1); for (const d of [24, 64, 130]) line([[a, gy + d], [b, gy + d]], rgba(R.shadow, .18), 3); }
      } else if (l.kind === 'sea') {
        const sc = tint(KC.sea, f); band(f, () => l.y, vgrad(l.y, l.y + 260, [mixCol(sc, R.skyLow, .35), sc]));
        at(f); const [a, b] = span(f); line([[a, l.y], [b, l.y]], rgba(R.light, .5), 3);
        for (const w of l.waves) line([[w.x - w.len / 2, w.y], [w.x, w.y - 2 - 4 * w.k], [w.x + w.len / 2, w.y]], rgba(R.light, .2 + .35 * w.k), 3);
        const o = S.celestial; if (o) for (let i = 0; i < 6; i++) line([[o.x - 40 + 8 * i, l.y + 14 + 22 * i], [o.x + 40 - 6 * i, l.y + 14 + 22 * i]], rgba(R.glow, .35 - .05 * i), 4);
      } else if (l.kind === 'treeline') {
        at(f); const TK = { trunk: tint(KC.trunk, f), base: tint(KC.leaf, f) }; TK.dk = mixCol(TK.base, R.shadow, .3); TK.lt = mixCol(TK.base, R.light, .3);
        for (const tr of l.trees) {
          const { x, y, h } = tr;
          if (tr.kind === 'broad') tree(x, y, h, TK, tr.seed);
          else if (tr.kind === 'palm') {
            line([[x, y], [x + .1 * h, y - .5 * h], [x + .05 * h, y - h]], TK.trunk, .05 * h);
            for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .6; ell(x + .05 * h + Math.cos(a) * .2 * h, y - h + Math.sin(a) * .08 * h + .06 * h, .22 * h, .05 * h, a + Math.PI / 2 * Math.sign(i - 2) * .4, i % 2 ? TK.dk : TK.base); }
          } else {  // pinheiro: três andares em triângulo, face clara à esquerda (sol)
            c.fillStyle = TK.trunk; c.fillRect(x - .03 * h, y - .2 * h, .06 * h, .2 * h);
            for (let i = 0; i < 3; i++) {
              const y0 = y - .14 * h - i * .26 * h, w = .3 * h * (1 - .2 * i), top = y0 - .42 * h;
              poly([[x - w + .02 * h, y0 + .02 * h], [x + .02 * h, top + .02 * h], [x + w + .02 * h, y0 + .02 * h]], TK.dk);
              poly([[x - w, y0], [x, top], [x + w, y0]], TK.base); poly([[x - w, y0], [x, top], [x - .3 * w, y0]], TK.lt);
            }
          }
        }
      } else if (l.kind === 'buildings') {
        at(f); const wc = tint(KC.wall, f), ws = mixCol(wc, R.shadow, .25), rc = tint(KC.roof, f), dc = tint(KC.dome, f), wo = mixCol(wc, R.shadow, .5);
        for (const bd of l.items) {
          const { x, y, w, h } = bd, l0 = x - w / 2, top = y - h;
          c.fillStyle = wc; c.fillRect(l0, top, w, h + 4); c.fillStyle = ws; if (w < 600) c.fillRect(x + .28 * w, top, .22 * w, h + 4);  // face da sombra à direita (a muralha não)
          if (bd.roof === 'gable') poly([[l0 - 10, top], [x, top - .4 * w], [x + w / 2 + 10, top]], rc);
          else if (bd.roof === 'tower') poly([[l0 - 6, top], [x, top - .8 * w], [x + w / 2 + 6, top]], rc);
          else if (bd.roof === 'dome') { c.beginPath(); c.ellipse(x, top, w / 2, w / 3, 0, Math.PI, TAU); c.fillStyle = dc; c.fill(); ell(x - .18 * w, top - .17 * w, .1 * w, .05 * w, -.4, mixCol(dc, R.light, .35)); }
          else if (bd.roof === 'temple') {
            c.fillStyle = wo; c.fillRect(l0 + .06 * w, top + 30, .88 * w, h - 30);
            c.fillStyle = wc; for (let i = 0; i < 6; i++) c.fillRect(x - .42 * w + i * .168 * w, top + 30, .07 * w, h - 30);
            c.fillRect(l0 - 10, top, w + 20, 30); poly([[l0 - 14, top], [x, top - .18 * w], [x + w / 2 + 14, top]], mixCol(wc, R.light, .2));
          } else { c.fillStyle = ws; c.fillRect(l0 - 6, top - 12, w + 12, 12); if (w > 600) for (let u = l0; u < x + w / 2; u += 64) c.fillRect(u, top - 34, 32, 22); }
          for (const wi of bd.windows) { c.fillStyle = wi.lit ? mixCol(wo, R.glow, wi.lit) : wo; c.fillRect(wi.x, wi.y, wi.w, wi.h); }
        }
      } else if (l.kind === 'props') {
        at(f);
        for (const o of l.items) {
          const { x, y, s } = o;
          if (o.kind === 'rock') { const b = tint('#6F7D86', f); rock([x, y, s / .95], { base: b, lt: mixCol(b, R.light, .35) }); }
          else if (o.kind === 'ship') {
            c.save(); c.translate(x, y); c.rotate((o.k - .5) * .08);
            const hc = tint(KC.wood, f), sl = tint(KC.sail, f);
            poly([[-.65 * s, -.1 * s], [.7 * s, -.1 * s], [.45 * s, .18 * s], [-.45 * s, .18 * s]], hc); c.fillStyle = mixCol(hc, R.light, .3); c.fillRect(-.65 * s, -.1 * s, 1.35 * s, .04 * s);
            c.fillStyle = hc; c.fillRect(-.02 * s, -1.05 * s, .04 * s, .95 * s);
            poly([[.04 * s, -s], [.5 * s, -.2 * s], [.04 * s, -.2 * s]], sl); poly([[-.04 * s, -.9 * s], [-.45 * s, -.22 * s], [-.04 * s, -.22 * s]], mixCol(sl, R.shadow, .15));
            c.restore();
          } else if (o.kind === 'camel') {
            const cc = tint(KC.camel, f), cd = mixCol(cc, R.shadow, .3), hy = y - s * (1.05 + .08 * o.k);
            for (const [u, col] of [[-.3, cd], [.22, cd], [-.2, cc], [.32, cc]]) line([[x + u * s, y - .6 * s], [x + u * s, y]], col, .08 * s);
            ell(x, y - .72 * s, .45 * s, .2 * s, 0, cc); ell(x - .05 * s, y - .9 * s, .2 * s, .16 * s, 0, cc);
            line([[x + .38 * s, y - .75 * s], [x + .55 * s, hy]], cc, .1 * s); ell(x + .62 * s, hy, .1 * s, .06 * s, 0, cc);
          } else if (o.kind === 'column') {
            const cc = tint(KC.stone, f), cs = mixCol(cc, R.shadow, .25), top = y - s, cut = hash(o.seed * 7) > .5;
            c.fillStyle = cc; c.fillRect(x - 15, top, 30, s); c.fillStyle = cs; c.fillRect(x + 5, top, 10, s); c.fillRect(x - 22, y - 12, 44, 12);
            if (cut) poly([[x - 15, top], [x - 4, top - 14], [x + 6, top - 4], [x + 15, top - 10], [x + 15, top + 1], [x - 15, top + 1]], cc);
            else { c.fillStyle = cc; c.fillRect(x - 24, top - 12, 48, 12); }
          } else if (o.kind === 'fire') {
            const fh = s * (.75 + .3 * o.k), sw = (o.k - .5) * .2 * fh;
            line([[x - .5 * s, y], [x + .4 * s, y - .14 * s]], '#4A3226', .12 * s); line([[x + .5 * s, y], [x - .4 * s, y - .14 * s]], '#5A3A2A', .12 * s);
            poly([[x - .32 * fh, y - .08 * s], [x + sw, y - fh], [x + .32 * fh, y - .08 * s]], '#FF7A2A'); ell(x, y - .2 * fh, .32 * fh, .2 * fh, 0, '#FF7A2A');
            poly([[x - .17 * fh, y - .08 * s], [x + .7 * sw, y - .65 * fh], [x + .17 * fh, y - .08 * s]], '#FFD27A');
          } else if (o.kind === 'fence') {  // duas travessas e mourões de ponta chanfrada, face clara em cima
            const wc = tint(KC.wood, f), wd = mixCol(wc, R.shadow, .3), wl = mixCol(wc, R.light, .3), h = o.h;
            for (const k of [.35, .75]) { c.fillStyle = wd; c.fillRect(o.x0, o.y - k * h, o.x1 - o.x0, 10); c.fillStyle = wl; c.fillRect(o.x0, o.y - k * h, o.x1 - o.x0, 3); }
            for (let px = o.x0; px <= o.x1 + 1; px += 60) { poly([[px - 7, o.y + 4], [px - 7, o.y - h + 6], [px, o.y - h], [px + 7, o.y - h + 6], [px + 7, o.y + 4]], wc); c.fillStyle = wd; c.fillRect(px + 2, o.y - h + 4, 5, h); }
          } else if (o.kind === 'bush') {  // copa de círculos em três tons, larga ~1,6·s
            const lb = tint(KC.leaf, f), BK = { dk: mixCol(lb, R.shadow, .35), base: lb, lt: mixCol(lb, R.light, .3) };
            const cs = [...Array(6)].map((_, i) => { const u = (i + .5) / 6 * 2 - 1, r = s * (.3 + .1 * hash(o.seed + i)); return [x + u * .55 * s, y - r * (.9 + .5 * (1 - Math.abs(u))) - .05 * s, r]; });
            for (const [u, v, r] of cs) ell(u + .05 * s, v + .04 * s, r, r, 0, BK.dk);
            for (const [u, v, r] of cs) ell(u, v, .94 * r, .94 * r, 0, BK.base);
            for (const [u, v, r] of cs) if (u < x) ell(u - .3 * r, v - .35 * r, .38 * r, .26 * r, -.5, BK.lt);
          } else if (o.kind === 'post') {  // poste de madeira com lanterna; o vidro acende à noite (o brilho vem de lights)
            const wc = tint('#3D4756', f), on = K.time === 'dusk' || K.time === 'night', top = y - o.h;
            c.fillStyle = wc; c.fillRect(x - 5, top, 10, o.h); c.beginPath(); c.roundRect(x - 10, y - 14, 20, 16, 3); c.fill();
            c.fillRect(x - 11, top - 3, 22, 5); poly([[x - 12, top - 26], [x, top - 38], [x + 12, top - 26]], wc);
            c.fillStyle = on ? '#FFE7A8' : mixCol(wc, R.light, .35); c.fillRect(x - 8, top - 25, 16, 22);
            c.fillStyle = wc; c.fillRect(x - 1.5, top - 25, 3, 22);
          } else if (o.kind === 'cart') {  // carroça: caixa, varal e duas rodas com cubo
            const wc = tint(KC.wood, f), wd = mixCol(wc, R.shadow, .35), wl = mixCol(wc, R.light, .3);
            line([[x + .45 * s, y - .72 * s], [x + s, y - .45 * s]], wd, .07 * s);
            c.fillStyle = wd; c.fillRect(x - s, y - .95 * s, 1.5 * s, .45 * s); c.fillStyle = wc; c.fillRect(x - s, y - .95 * s, 1.5 * s, .36 * s);
            c.fillStyle = wl; c.fillRect(x - s, y - .95 * s, 1.5 * s, .06 * s); c.fillStyle = wd; for (const u of [-.5, 0]) c.fillRect(x + u * s, y - .95 * s, .04 * s, .45 * s);
            for (const u of [-.6, .1]) { const wx = x + u * s, wy = y - .3 * s; ell(wx, wy, .3 * s, .3 * s, 0, wd); ell(wx, wy, .21 * s, .21 * s, 0, mixCol(wc, R.shadow, .1)); for (const a of [0, Math.PI / 3, 2 * Math.PI / 3]) line([[wx - .2 * s * Math.cos(a), wy - .2 * s * Math.sin(a)], [wx + .2 * s * Math.cos(a), wy + .2 * s * Math.sin(a)]], wd, .035 * s); ell(wx, wy, .06 * s, .06 * s, 0, wl); }
          } else if (o.kind === 'boat') {  // barco a remo virado de lado na areia: casco, borda clara e banco
            const hc = tint(KC.wood, f), hd = mixCol(hc, R.shadow, .35);
            poly([[x - s / 2, y - .3 * s], [x + s / 2, y - .3 * s], [x + .35 * s, y], [x - .35 * s, y]], hc);
            poly([[x - .42 * s, y - .15 * s], [x + .42 * s, y - .15 * s], [x + .35 * s, y], [x - .35 * s, y]], hd);
            c.fillStyle = mixCol(hc, R.light, .35); c.fillRect(x - s / 2, y - .3 * s, s, .04 * s);
            c.fillStyle = tint('#C9A040', f); c.fillRect(x - .4 * s, y - .245 * s, .8 * s, .035 * s);
          } else if (o.kind === 'tuft') {  // tufo de três folhas (cor pelo chão: seco na areia, claro na neve) e, às vezes, flor
            const sf = K.layers.find(q => q.kind === 'ground')?.surface, col = tint(sf === 'sand' ? '#B89A58' : sf === 'snow' ? '#C8D4DC' : '#3E8F4E', f);
            c.beginPath();
            for (const a of [-.4, 0, .35]) { const tx = x + s * Math.sin(a), ty = y - s * Math.cos(a) * (a ? .75 : 1); c.moveTo(x - .12 * s, y); c.quadraticCurveTo(x + (tx - x) * .3, y - (y - ty) * .6, tx, ty); c.quadraticCurveTo(x + (tx - x) * .5, y - (y - ty) * .4, x + .12 * s, y); }
            c.fillStyle = col; c.fill();
            if (sf === 'grass' && hash(o.seed * 3) > .7) ell(x + .1 * s, y - s, .22 * s, .22 * s, 0, tint(hash(o.seed * 5) > .5 ? '#F2E8D4' : '#E8A83A', f));
          }
        }
      }
      if (f < 1 && K.layers[li + 1]?.f !== f) { lights(lf, f); lf = f; }  // no fim das camadas de mesmo f
    });
    group(F, F.actors);
    for (const a of F.actors) if (a.holds === 'book' && !a.hidden) {  // livro aberto entre as mãos
      const J = a.pose.joints, [x, y] = mid([J.handL, J.handR]), s = .1 * a.pose.size; at(a.layer);
      c.fillStyle = tint('#6A2A20', 1); c.fillRect(x - s, y - .5 * s, 2 * s, .7 * s);
      c.fillStyle = tint('#F4ECD8', 1); c.fillRect(x - .94 * s, y - .62 * s, .9 * s, .64 * s); c.fillStyle = tint('#FFF8E8', 1); c.fillRect(x + .04 * s, y - .62 * s, .9 * s, .64 * s);
    }
    lights(lf, 1);
    if (!I) { weather(); if (K.mood !== 'night' && K.weather.kind === 'clear') motes(F); }
    SHX = sx; c.resetTransform();
  }

  return {
    parts: a => partsOf(a),
    draw(F) {
      cam = F.cam;
      if (F.scene === 'K') return drawK(F);
      if (F.scene === 'P' || F.scene === 'N') { (F.scene === 'P' ? drawP : drawN)(F); motes(F); c.resetTransform(); return; }
      const w = F.world, sh = F.shot, back = F.actors.filter(a => a.layer < 1), fore = F.actors.filter(a => a.layer >= 1);
      SHY = sh === 'wide' ? .05 : .2;
      sky(w.ground(cam.cx) - 30); clouds(F);
      const far = mixCol(P.far, P.haze, .3);
      if (sh === 'wide') {
        band(w.far.f, w.far.prof, vgrad(600, 900, [far, mixCol(far, P.mid, .3)]));
        band(w.hill.f, w.hill.prof, vgrad(700, 1000, [mixCol(P.mid, P.haze, .2), P.mid]));
      } else if (sh === 'trail') {
        band(.3, farH, vgrad(560, 900, [far, mixCol(far, P.mid, .3)]));
        at(.6); for (const [x, s] of [[-300, 1], [420, .8], [1500, 1.1], [2300, .9]]) tree(x, midH(x) + 6, 260 * s, hazed(TREE, .3), x);
        band(.6, midH, vgrad(740, 1000, [mixCol(P.mid, P.haze, .15), P.mid]));
      } else {
        band(w.mist.f, w.mist.prof, vgrad(w.mist.root - 80, w.mist.root + 300, [far, mixCol(far, P.mid, .35)]));
        band(w.back.f, w.back.ground, vgrad(740, 1000, [mixCol(P.grass, P.haze, .3), mixCol(P.grassDk, P.haze, .2)]));
        tufts(w.back.f, w.back.ground, 34, 22, mixCol(P.grassDk, P.haze, .3), F.t, 5);
      }
      SHY = .2; group(F, back); SHY = sh === 'wide' ? .05 : .2;
      // camada 1: chão
      if (sh === 'wide') {
        at(1); tree(w.tree.x, w.ground(w.tree.x) + 4, w.tree.h, TREE, 3);
        soil(F);
        tufts(1, w.ground, 30, 16, P.grassDk, F.t, 9);
      } else {
        band(1, w.ground, vgrad(w.ground(cam.cx), w.ground(cam.cx) + 500, [P.grass, P.grassDk]));
        edge(1, w.ground, P.grassLt, 5);
        if (sh === 'trail') {  // trilha de terra batida onde passa a fila
          band(1, x => w.antGround(x) - 22 + 4 * Math.sin(x * .01), vgrad(w.antGround(cam.cx) - 30, w.antGround(cam.cx) + 60, [P.path, mixCol(P.path, P.soil, .35)]));
          band(1, x => w.antGround(x) + 36 + 5 * Math.sin(x * .008 + 1), vgrad(w.antGround(cam.cx) + 30, w.antGround(cam.cx) + 400, [P.grass, P.grassDk]));
          tufts(1, x => w.antGround(x) + 40, 46, 30, P.grassDk, F.t, 21);
        }
        tufts(1, w.ground, 40, sh === 'close' ? 26 : 20, mixCol(P.grassDk, P.grass, .3), F.t, 13);
        if (w.rock) { at(1); shade([() => { at(1); skew(w.rock[1]); rock(w.rock); }]); at(1); rock(w.rock); }
      }
      group(F, fore);
      if (w.front) tufts(1, w.front, 30, 150, mixCol(P.grassDk, P.ink, .25), F.t, 31);
      motes(F);
      for (const s of F.texts) if (s.k > 0) title(s);
      c.resetTransform();
    },
  };
})();
