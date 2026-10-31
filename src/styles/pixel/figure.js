// Núcleo de rasterização do boneco do pixel (script clássico, sem import; usa hash de motion.js). Portado de
// scripts/pixel-demo.mjs (ramo v5): volumes sombreados por normal, rampas de 5 tons (escuro → claro), linhas internas,
// luz de borda e contorno seletivo. Coordenadas das peças em px da grade, relativas à origem (OX, OY) da caixa.
// Formas: elipse = esfera achatada, cápsula afinada = cilindro, quadrilátero e polígono com bisel = planos duros, sprite.
// o = { g (grupo: peças do mesmo grupo não fazem linha interna entre si), bias (soma no n·L), tn(x, y, t) (corrige o tom) };
// mat = nome da rampa em opts.ramps ou função (x, y) -> nome.
function ellipsePart(c, rx, ry, mat, o = {}) { return { k: 'e', c, rx, ry, mat, ...o }; }
function capsulePart(a, b, ra, rb, mat, o = {}) { return { k: 'c', a, b, ra, rb, mat, ...o }; }
function polyPart(pts, bev, mat, o = {}) { return { k: 'p', pts, bev, mat, ...o }; }
// Quadrilátero ao longo de a → b, estendido .6·r nas pontas, bisel .9·min(ra, rb).
function quadPart(a, b, ra, rb, mat, o = {}) {
  const L0 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L0, uy = (b[1] - a[1]) / L0, nx = -uy, ny = ux;
  const A = [a[0] - ux * ra * .6, a[1] - uy * ra * .6], B = [b[0] + ux * rb * .6, b[1] + uy * rb * .6];
  return polyPart([[A[0] + nx * ra, A[1] + ny * ra], [B[0] + nx * rb, B[1] + ny * rb], [B[0] - nx * rb, B[1] - ny * rb], [A[0] - nx * ra, A[1] - ny * ra]], Math.min(ra, rb) * .9, mat, o);
}
// Sprite desenhado à mão, sprite = { ax, ay, rows, locks?, lockBias? }: dígitos 0–4 são o tom; com locks, cada letra é uma
// mecha que se sombreia sozinha (lockTone) e ganha linha interna contra a mecha da frente. (ax, ay) cai sobre at.
function spritePart(at, sprite, mat, o = {}) { return { k: 'sp', at, ...sprite, mat, ...o }; }

// Normal (nx, ny, nz) no ponto (x, y) se ele cai dentro da forma, senão false.
function partNormal(s, x, y) {
  if (s.k === 'p') {
    // polígono com bisel: centro plano (luz chapada), borda inclinada para fora (fator .85)
    const Q = s.pts; let inside = false, best = Infinity, nx = 0, ny = 0;
    for (let i = 0, j = Q.length - 1; i < Q.length; j = i++) {
      const [xi, yi] = Q[i], [xj, yj] = Q[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      const vx = xi - xj, vy = yi - yj, t = Math.max(0, Math.min(1, ((x - xj) * vx + (y - yj) * vy) / (vx * vx + vy * vy || 1)));
      const ex = x - xj - vx * t, ey = y - yj - vy * t, d = Math.hypot(ex, ey);
      if (d < best) { best = d; nx = -ex / (d || 1); ny = -ey / (d || 1); }
    }
    if (!inside) return false;
    const k = Math.max(0, 1 - best / s.bev) * .85;
    return [nx * k, ny * k, Math.sqrt(1 - k * k)];
  }
  let dx, dy;
  if (s.k === 'e') { dx = (x - s.c[0]) / s.rx; dy = (y - s.c[1]) / s.ry; }
  else {
    const [ax, ay] = s.a, vx = s.b[0] - ax, vy = s.b[1] - ay, l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2)), r = s.ra + (s.rb - s.ra) * t;
    dx = (x - ax - vx * t) / r; dy = (y - ay - vy * t) / r;
  }
  const u = dx * dx + dy * dy;
  return u <= 1 && [dx, dy, Math.sqrt(1 - u)];
}

// Tom da mecha ch na célula (c, r): luz no alto e à esquerda, sombra embaixo e à direita, um ou outro pixel escuro no
// meio; o pixel 2 linhas abaixo do topo, com pelo menos 3 linhas da mecha abaixo, ganha brilho 4 quando hash deixa.
function lockTone(rows, c, r, ch) {
  const has = (cc, rr) => (rows[rr] || '')[cc] === ch;
  let t = !has(c, r - 1) ? 4 : !has(c, r - 2) ? 3 : 2;
  if (t === 2 && !has(c - 1, r)) t = 3;
  const dn = !has(c, r + 1), rt = !has(c + 1, r);
  if (dn && rt) t = 0; else if (dn || rt) t = Math.min(t, 1);
  else if (t === 2 && (c + r) % 4 === 0 && hash(c * 7 + r * 13) > .35) t = 1;
  if (t === 2 && !has(c, r - 3) && has(c, r + 1) && has(c, r + 2) && has(c, r + 3) && hash(c * 5 + r * 11) > .5) t = 4;
  return t;
}

// Pinta o sprite na grade: cada mecha tem i próprio (ordem de locks) e grupo 'lock' + letra.
function spriteFill(s, i, cell, W, H, OX, OY) {
  const x0 = Math.floor(s.at[0]) - s.ax + OX, y0 = Math.floor(s.at[1]) - s.ay + OY;
  s.rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const x = x0 + c, y = y0 + r;
    if (ch === '.' || x < 0 || y < 0 || x >= W || y >= H) return;
    let t = +ch, ii = i, g = s.g ?? i;
    if (s.locks) { t = lockTone(s.rows, c, r, ch) + (s.lockBias?.[ch] || 0); ii = i + s.locks.indexOf(ch) / 100; g = 'lock' + ch; }
    const mat = typeof s.mat === 'function' ? s.mat(x + .5 - OX, y + .5 - OY) : s.mat;
    cell[y * W + x] = { i: ii, g, mat, t: Math.max(0, Math.min(4, t + (s.bias < 0 ? -1 : 0))) };
  }));
}

// Pinta as peças em ordem (depois = na frente) e devolve { W, H, OX, OY, cells } com cores de opts.ramps[mat][t] ou
// opts.ink. Passes: limpeza de tom isolado, linha interna (peça de trás encostada numa da frente de outro grupo: mesmo
// material −2 tons, outro material tom 0), luz de borda (rim: tom ≤ 1 com vazio do lado oposto à luz e cheio do outro
// vira 2), shift (desce tons: noite e interior) e contorno seletivo (outline: false nas nuvens).
function figureLayer(parts, { W, H, OX, OY }, { ramps, light = [-.55, -.7, .5], rim = false, outline = true, ink, shift = 0 }) {
  const n0 = Math.hypot(...light), L = light.map(c => c / n0), side = L[0] > 0 ? -1 : 1;
  const band = s => s > .8 ? 4 : s > .5 ? 3 : s > .15 ? 2 : s > -.25 ? 1 : 0;
  const cell = new Array(W * H).fill(null);
  parts.forEach((s, i) => {
    if (s.k === 'sp') return spriteFill(s, i, cell, W, H, OX, OY);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x + .5 - OX, py = y + .5 - OY, n = partNormal(s, px, py);
      if (!n) continue;
      const mat = typeof s.mat === 'function' ? s.mat(px, py) : s.mat;
      let t = band(n[0] * L[0] + n[1] * L[1] + n[2] * L[2] + (s.bias || 0));
      if (s.tn) t = Math.max(0, Math.min(4, s.tn(px, py, t)));
      cell[y * W + x] = { i, g: s.g ?? i, mat, t };
    }
  });
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H ? cell[y * W + x] : null;
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let tone = cell.map((c, k) => {
    if (!c) return 0;
    const same = NB.map(([dx, dy]) => at(k % W + dx, (k / W | 0) + dy)).filter(n => n && n.i === c.i);
    if (same.length < 3 || same.some(n => n.t === c.t)) return c.t;
    const cnt = {}; same.forEach(n => cnt[n.t] = (cnt[n.t] || 0) + 1);
    const [t, m] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    return m >= 2 ? +t : c.t;
  });
  tone = tone.map((t, k) => {
    const c = cell[k]; if (!c) return t;
    for (const [dx, dy] of NB) {
      const n = at(k % W + dx, (k / W | 0) + dy);
      if (n && n.i > c.i && n.g !== c.g) return Math.max(0, (n.mat === c.mat ? t - 2 : 0) - shift);
    }
    if (rim && t <= 1 && !at(k % W + side, k / W | 0) && at(k % W - side, k / W | 0)) t = 2;
    return Math.max(0, t - shift);
  });
  const cells = cell.map((c, k) => {
    if (c) return ramps[c.mat][tone[k]];
    if (!outline) return null;
    const x = k % W, y = k / W | 0;
    const lit = at(x + 1, y) || at(x, y + 1), dark = at(x - 1, y) || at(x, y - 1);
    return dark ? ink : lit ? ramps[lit.mat][0] : null;
  });
  return { W, H, OX, OY, cells };
}

// Amplia por vizinho mais próximo para round(w·k) × round(h·k).
function scaleRows(rows, k) {
  const h = rows.length, w = rows[0].length, H2 = Math.round(h * k), W2 = Math.round(w * k);
  return Array.from({ length: H2 }, (_, r) => Array.from({ length: W2 }, (_, c) => rows[(r + .5) * h / H2 | 0][(c + .5) * w / W2 | 0]).join(''));
}
// Espelha em x em torno da origem: x' = 2·OX − 1 − x; o que sai da grade se perde.
function flipCells(F) {
  const cells = new Array(F.W * F.H).fill(null);
  F.cells.forEach((c, k) => { const x = 2 * F.OX - 1 - k % F.W; if (c && x >= 0 && x < F.W) cells[(k / F.W | 0) * F.W + x] = c; });
  return { ...F, cells };
}
// Gira 90° (dir = 1 horário, −1 anti-horário) em torno do pixel (OX, OY), que fica no lugar. Exige grade quadrada; o que
// sai da grade se perde (sem perda com a origem no meio e as peças longe da borda).
function rotateCells(F, dir) {
  if (F.W !== F.H) throw new Error('rotateCells exige grade quadrada');
  const cells = new Array(F.W * F.H).fill(null);
  F.cells.forEach((c, k) => {
    const dx = k % F.W - F.OX, dy = (k / F.W | 0) - F.OY, x = F.OX - dy * dir, y = F.OY + dx * dir;
    if (c && x >= 0 && y >= 0 && x < F.W && y < F.H) cells[y * F.W + x] = c;
  });
  return { ...F, cells };
}
