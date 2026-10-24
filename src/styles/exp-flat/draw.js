// Flat vetorial: céu em gradiente, camadas de paralaxe que clareiam e esfriam com a distância, solo em estratos, seres em
// formas geométricas sem contorno (crescente de sombra embaixo à direita, realce em cima à esquerda), sombras longas
// chapadas do sol (alto à esquerda, atrás dos seres: a sombra vem para a frente e para a direita) e brilho aditivo nas luzes.
window.ExpStyle = (() => {
  const P = STYLE.palette, MAIN = animationEngine.context, SHX = STYLE.effects.longShadow;
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
  function cloud(x, y, s) {
    const parts = (dx, dy, col) => { c.fillStyle = col; c.beginPath(); c.roundRect(x - 160 * s + dx, y - 30 * s + dy, 320 * s, 60 * s, 30 * s); c.fill(); for (const [u, v, r] of [[-70, -32, 52], [10, -58, 72], [92, -28, 48]]) ell(x + u * s + dx, y + v * s + dy, r * s, r * s, 0, col); };
    parts(8 * s, 12 * s, P.cloudDk); parts(0, 0, P.cloud);
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
  // Tufos de capim no perfil (camada f): três folhas que balançam devagar.
  function tufts(f, prof, step, hgt, col, t, seed) {
    at(f); const [x0, x1] = span(f);
    for (let x = Math.floor(x0 / step) * step; x < x1; x += step) {
      const i = Math.round(x / step), q = hash(seed + i); if (q < .35) continue;
      const bx = x + step * hash(seed + i * 7), by = prof(bx), hh = hgt * (.6 + .6 * hash(seed + i * 3)), sw = .18 * noise1(seed + i, t * .5 + i * .1);
      c.beginPath();
      for (const a of [-.35, 0, .3]) { const tx = bx + hh * Math.sin(a + sw), ty = by - hh * Math.cos(a + sw) * (a ? .75 : 1); c.moveTo(bx - hh * .07, by); c.quadraticCurveTo(bx + (tx - bx) * .3, by - (by - ty) * .6, tx, ty); c.quadraticCurveTo(bx + (tx - bx) * .5, by - (by - ty) * .4, bx + hh * .07, by); }
      c.fillStyle = col; c.fill();
    }
  }
  // Pedra: polígono baixo com faceta clara virada para o sol.
  function rock([x, y, r]) {
    const pts = [...Array(7)].map((_, i) => { const a = Math.PI + i / 6 * Math.PI, k = .8 + .3 * hash(11 + i); return [x + Math.cos(a) * r * 1.3 * k, y + Math.sin(a) * r * .9 * k]; });
    c.beginPath(); pts.forEach(([u, v], i) => i ? c.lineTo(u, v) : c.moveTo(u, v)); c.closePath(); c.fillStyle = '#6F7D86'; c.fill();
    c.beginPath(); c.moveTo(...pts[0]); for (let i = 1; i < 4; i++) c.lineTo(...pts[i]); c.lineTo(x + .1 * r, y - .2 * r); c.closePath(); c.fillStyle = '#A9B6BC'; c.fill();
  }

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
  // Quadro local da cabeça: x para a frente, y para baixo, nos dois sentidos.
  const local = (x, y, a, dir, fn) => { c.save(); c.translate(x, y); c.rotate(a); c.scale(1, dir); fn(); c.restore(); };
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
  function ant(p, K) {
    const S = p.size, dir = p.facing, hr = SPECS[p.spec].head.r * S, [th, pe, ga] = p.spine, L = Object.values(p.limbs);
    const leg = (l, col, w) => { line([l.root, l.mid], col, w); line([l.mid, l.end], col, .7 * w); ell(l.end[0], l.end[1], .45 * w, .45 * w, 0, col); };  // afila para o pé
    for (const l of L) if (l.far) leg(l, K.far, .02 * S);
    blob(ga.x, ga.y, ga.r * 1.28, ga.r * .95, ga.angle, K);
    blob(pe.x, pe.y, pe.r * 1.2, pe.r, pe.angle, K, false);
    blob(th.x, th.y, th.r * 1.45, th.r * .82, th.angle, K);
    blob(p.head.x, p.head.y, hr * 1.06, hr * .92, p.head.angle, K);
    local(p.head.x, p.head.y, p.head.angle, dir, () => {
      c.beginPath(); c.moveTo(.75 * hr, .2 * hr); c.lineTo(1.3 * hr, .5 * hr); c.lineTo(.8 * hr, .62 * hr); c.closePath(); c.fillStyle = K.dk; c.fill();
      ell(.42 * hr, -.18 * hr, .2 * hr, .2 * hr, 0, K.eye);
      if (hr * cam.z > 6) ell(.36 * hr, -.25 * hr, .07 * hr, .07 * hr, 0, '#FFFFFF');
    });
    for (const l of L) if (!l.far) leg(l, K.leg, .025 * S);
    if (p.carry) leaf(p.carry, K);
    for (const ap of Object.values(p.appendages)) { line(ap, K.leg, .013 * S); const e = ap.at(-1); ell(e[0], e[1], .016 * S, .016 * S, 0, K.leg); }
  }
  function fly(p, K) {
    const S = p.size, dir = p.facing, [th, ab] = p.spine, w = p.wings || { phase: 0, open: 0 }, mono = K === MONO;
    const wing = (k, a0) => {  // asa translúcida presa no alto do tórax
      const a = (dir > 0 ? Math.PI : 0) + dir * (-.35 - k * .9 * w.open * Math.sin(w.phase * TAU) + a0), bx = th.x, by = th.y - th.r * .7;
      ell(bx + Math.cos(a) * .28 * S, by + Math.sin(a) * .28 * S, .3 * S, .09 * S, a, rgba(P.wing, .55));
    };
    if (!mono) wing(1, -.15);
    for (const k of [-1, 0, 1]) line([[th.x + k * .07 * S, th.y + .1 * S], [th.x + k * .09 * S + dir * .03 * S, th.y + .26 * S]], K.leg || P.fly, .018 * S);
    blob(ab.x, ab.y, ab.r * 1.3, ab.r * .85, ab.angle, K);
    blob(th.x, th.y - .03 * S, th.r * 1.1, th.r * 1.05, th.angle, K);
    const hr = SPECS.fly.head.r * S;
    blob(p.head.x, p.head.y + .02 * S, hr, hr * .95, 0, K, false);
    ell(p.head.x + dir * .3 * hr, p.head.y - .05 * hr, .45 * hr, .5 * hr, 0, mono ? K.dk : '#9A3B2E');
    if (!mono) wing(1.2, .2);
  }
  const FLYK = { body: P.fly, dk: mixCol(P.fly, P.ink, .5), lt: P.flyLt, leg: mixCol(P.fly, P.ink, .4) };
  // Explorador em cápsulas: perna e braço de lá, mochila, perna de cá, tronco, cabeça com rosto e chapéu, braço de cá.
  function human(p, K) {
    const S = p.size, dir = p.facing, [ch, pv] = p.spine, R = .1 * S, mono = K === MONO, Ls = Object.values(p.limbs);
    const leg = (l, far) => {
      line([l.root, l.mid, l.end], far ? K.pantsDk : K.pants, .095 * S);
      ell(l.end[0] + dir * .035 * S, l.end[1] - .012 * S, .065 * S, .032 * S, 0, far ? mixCol(K.boot, P.ink, .4) : K.boot);
    };
    const arm = (l, far) => {
      line([l.root, l.mid], far ? K.shirtDk : K.shirt, .072 * S); line([l.mid, l.end], far ? K.skinDk : K.skin, .052 * S);
      ell(l.end[0], l.end[1], .034 * S, .034 * S, 0, far ? K.skinDk : K.skin);
    };
    for (const l of Ls) if (l.far) (l.foot ? leg : arm)(l, true);
    // mochila nas costas
    local(ch.x, ch.y, 0, 1, () => {
      c.beginPath(); c.roundRect(-dir * .2 * S - .08 * S, -.06 * S, .16 * S, .28 * S, .045 * S); c.fillStyle = K.packDk; c.fill();
      c.beginPath(); c.roundRect(-dir * .2 * S - .07 * S - dir * .01 * S, -.07 * S, .15 * S, .26 * S, .04 * S); c.fillStyle = K.pack; c.fill();
      c.beginPath(); c.roundRect(-dir * .2 * S - .05 * S, .07 * S, .1 * S, .08 * S, .02 * S); c.fillStyle = K.packDk; c.fill();
    });
    for (const l of Ls) if (!l.far && l.foot) leg(l, false);
    line([[pv.x, pv.y], [ch.x, ch.y]], K.shirtDk, .21 * S); line([[pv.x - .01 * S, pv.y - .01 * S], [ch.x - .012 * S, ch.y - .012 * S]], K.shirt, .18 * S);
    ell(pv.x, pv.y + .03 * S, .1 * S, .065 * S, 0, K.pants);
    line([[pv.x - .1 * S, pv.y - .025 * S], [pv.x + .1 * S, pv.y - .025 * S]], K.boot, .022 * S);
    line([[ch.x + dir * .04 * S, ch.y - .1 * S], [ch.x - dir * .06 * S, ch.y + .12 * S]], K.packDk, .024 * S);  // alça
    line([[ch.x, ch.y - .1 * S], [p.head.x, p.head.y]], K.skinDk, .06 * S);
    if (p.appendages.hair) line(p.appendages.hair, K.hair, .05 * S);
    local(p.head.x, p.head.y, p.head.angle, dir, () => {
      ell(0, 0, R, R, 0, K.skinDk); ell(-.05 * R, -.06 * R, R * .93, R * .93, 0, K.skin);
      ell(-.2 * R, .08 * R, .15 * R, .2 * R, 0, K.skinDk);  // orelha
      if (!mono) face(p, R);
      // chapéu de explorador: copa, faixa e aba
      c.beginPath(); c.ellipse(-.05 * R, -.5 * R, .98 * R, .85 * R, 0, Math.PI, TAU); c.fillStyle = K.hat; c.fill();
      c.beginPath(); c.ellipse(-.05 * R, -.5 * R, .98 * R, .26 * R, 0, Math.PI, TAU); c.fillStyle = K.pants; c.fill();
      ell(.05 * R, -.5 * R, 1.42 * R, .19 * R, 0, K.hatDk);
      if (!mono) ell(-.45 * R, -1.02 * R, .3 * R, .14 * R, -.4, '#F2E2B8');
    });
    for (const l of Ls) if (!l.far && !l.foot) arm(l, false);
    if (p.emote && !mono) emote(p, R);
  }
  // Rosto no quadro local da cabeça (x para a frente): olhos de ponto, sobrancelhas, nariz, bochecha e boca por expressão.
  function face(p, R) {
    const e = p.face.expression, b = clamp(p.face.blink), sur = e === 'surprised', cur = e === 'curious';
    ell(.95 * R, .14 * R, .13 * R, .12 * R, 0, P.skinDk);  // nariz
    ell(.55 * R, .3 * R, .14 * R, .1 * R, 0, rgba('#F08A7A', .45));
    for (const [ex, ey, k, near] of [[.4 * R, -.06 * R, 1, true], [.78 * R, -.08 * R, .78, false]]) {
      if (b > .7) line([[ex - .08 * R * k, ey], [ex + .08 * R * k, ey]], P.ink, .045 * R);
      else if (sur) { ell(ex, ey, .14 * R * k, .17 * R * k * (1 - b), 0, '#FFFFFF'); ell(ex + .03 * R, ey, .065 * R * k, .075 * R * k * (1 - b), 0, P.ink); }
      else ell(ex, ey, .075 * R * k, .1 * R * k * (1 - b), 0, P.ink);
      const lift = sur ? .2 : cur && near ? .15 : 0, tilt = cur && near ? -.06 : sur ? -.03 : .02;
      line([[ex - .11 * R * k, -.3 * R - lift * R + tilt * R], [ex + .11 * R * k, -.32 * R - lift * R - tilt * R]], P.hair, .055 * R);
    }
    if (sur) ell(.6 * R, .5 * R, .1 * R, .14 * R, 0, '#6A2B2B');
    else if (cur) ell(.62 * R, .48 * R, .06 * R, .05 * R, 0, '#6A2B2B');
    else { c.beginPath(); c.moveTo(.45 * R, .45 * R); c.quadraticCurveTo(.6 * R, .52 * R, .72 * R, .44 * R); c.strokeStyle = '#6A2B2B'; c.lineWidth = .05 * R; c.stroke(); }
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
  // Um ator: câmera da camada, sombra (mono), virada, achatar/esticar a partir dos pés.
  function actor(a, F, mono) {
    const p = a.pose; at(a.layer);
    c.save();
    if (mono) skew(a.gy);
    if (a.flip) { const m = (p.spine[0].x + p.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
    if (p.sq) { const fs = Object.values(p.limbs).filter(l => l.foot), x = (p.spine[0].x + p.spine.at(-1).x) / 2, y = fs.length ? Math.max(...fs.map(l => l.end[1])) : p.spine[0].y; c.translate(x, y); c.scale(1 + .5 * p.sq, 1 - p.sq); c.translate(-x, -y); }
    c.globalAlpha = a.alpha ?? 1;
    if (a.kind === 'human') human(p, mono ? MONO : P);
    else if (a.kind === 'fly') fly(p, mono ? MONO : a.layer < 1 ? hazed(FLYK, .3) : FLYK);
    else {
      const under = a.role === 'tunnel' || a.role === 'garden';
      ant(p, mono ? MONO : antPal(a.role === 'hero', under ? P.cave : P.haze, under ? .12 : Math.round((1 - a.layer) * 10) / 10 * .7));
    }
    c.restore();
  }
  // Grupo de atores: sombras longas de quem pisa o chão, depois os corpos.
  function group(F, list) {
    list = list.filter(a => !a.hidden);
    const cast = list.filter(a => a.kind !== 'fly' && a.ground && a.role !== 'tunnel' && a.role !== 'garden');
    for (const a of cast) { const p = a.pose; a.gy = a.ground((p.spine[0].x + p.spine.at(-1).x) / 2); }
    if (cast.length) shade(cast.map(a => () => actor(a, F, true)));
    for (const a of list) actor(a, F, false);
  }

  // Partículas: pólen no ar e esporos no subsolo, com brilho; posição pura de t e da câmera (paralaxe por partícula).
  function motes(F) {
    c.resetTransform(); const { cx, cy, z } = cam, gy = F.world.ground ? (F.world.ground(cx) - cy) * z + 540 : H;
    for (let i = 0; i < 46; i++) {
      const pf = .5 + .7 * hash(i + 400), X = ((hash(i) * 2300 + 16 * F.t * (1 + hash(i + 7)) + 70 * noise1(i, F.t * .22) - cx * z * pf * .5) % 2300 + 2300) % 2300 - 190;
      const Y = ((hash(i + 3) * 1400 - 9 * F.t + 50 * noise1(i + 50, F.t * .27) - cy * z * pf * .5) % 1400 + 1400) % 1400 - 160, spore = Y > gy + 30;
      if (!spore && Y > gy - 10) continue;
      const r = (1.6 + 2.6 * hash(i + 9)) * (.6 + .6 * pf), tw = .55 + .45 * Math.sin(F.t * 1.6 + i * 2.3);
      glow(X, Y, r * 7, spore ? '#FFE9B0' : '#FFF2C0', .3 * tw); ell(X, Y, r, r, 0, rgba(spore ? '#FFF4D6' : '#FFFBEA', .75 * tw));
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

  // Perfis do plano H (o mundo dele só traz o chão).
  const farH = x => 600 + 55 * Math.sin(x * .0021 + .3) + 18 * Math.sin(x * .007), midH = x => 770 + 28 * Math.sin(x * .0042 + 1.7) + 9 * Math.sin(x * .013);

  return {
    draw(F) {
      cam = F.cam; const w = F.world, sh = F.shot, back = F.actors.filter(a => a.layer < 1), fore = F.actors.filter(a => a.layer >= 1);
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
