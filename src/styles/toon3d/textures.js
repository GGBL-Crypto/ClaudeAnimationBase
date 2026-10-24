// Texturas procedurais do kit toon3d: desenhadas uma vez em canvas 2D e embrulhadas em CanvasTexture.
// Tudo determinístico: hash(seed, contador), nunca Math.random. Depende de motion.js (hash, clamp, lerp, TAU, mixCol).
const TOON_TEX = new Map();
// tipo: [w, h, desenho, contorno, emenda]; helpers e desenhos ficam no escopo da função para não poluir o global
const [TOON_KINDS, toonOutline] = (() => {
const R = (s, o) => { let i = 0; return (a = 0, b = 1) => lerp(a, b, hash(s * 977 + o * 31.7 + i++)); };
// repete o desenho do outro lado da borda para a textura emendar (x, y, rad = alcance do elemento)
const wrapT = (g, w, h, x, y, rad, f) => {
  for (const dx of [0, ...(x < rad ? [w] : []), ...(x > w - rad ? [-w] : [])]) for (const dy of [0, ...(y < rad ? [h] : []), ...(y > h - rad ? [-h] : [])]) {
    g.save(); g.translate(dx, dy); f(); g.restore();
  }
};
const blob = (g, x, y, r, c, a) => {
  const k = g.createRadialGradient(x, y, 0, x, y, r); k.addColorStop(0, c); k.addColorStop(1, c + '00');
  g.globalAlpha = a; g.fillStyle = k; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
};
const ell = (g, x, y, rx, ry, a, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU); g.fill(); };
// contorno externo: silhueta do alpha deslocada em círculo, pintada de cor
const outline = (c, col, rad) => {
  const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d');
  for (let a = 0; a < 16; a++) g.drawImage(c, Math.cos(a * TAU / 16) * rad, Math.sin(a * TAU / 16) * rad);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over'; g.drawImage(c, 0, 0); return o;
};
// lâmina: base embaixo no centro, ponta em cima. L/Rt = meia largura (fração de w) à esquerda/direita em s 0..1
const blade = (w, h, m, L, Rt) => {
  const p = new Path2D(), Y = s => h - m - (h - 2 * m) * s;
  for (let i = 0; i <= 48; i++) p[i ? 'lineTo' : 'moveTo'](w / 2 + Rt(i / 48) * w, Y(i / 48));
  for (let i = 48; i >= 0; i--) p.lineTo(w / 2 - L(i / 48) * w, Y(i / 48));
  p.closePath(); return [p, Y];
};
// borda mais clara: traços de largura decrescente recortados pela forma
const rim = (g, p, col, wd, a) => {
  g.save(); g.clip(p); g.strokeStyle = col; g.globalAlpha = a;
  for (let k = 0; k < 6; k++) { g.lineWidth = wd * (1 - k / 6); g.stroke(p); }
  g.restore();
};
const line = (g, pts, col, wd, a = 1) => {
  g.strokeStyle = col; g.lineWidth = wd; g.globalAlpha = a; g.lineCap = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke(); g.globalAlpha = 1;
};
const grainy = (g, w, h, r, n, cols, a, sz) => {
  for (let i = 0; i < n; i++) { g.globalAlpha = a; g.fillStyle = cols[r() < .5 ? 0 : 1]; const x = r(0, w), y = r(0, h), s = r(sz[0], sz[1]); wrapT(g, w, h, x, y, s, () => g.fillRect(x, y, s, s)); }
  g.globalAlpha = 1;
};

const leaf = (g, w, h, s) => {
  const r = R(s, 1), q = r(.75, 1.15), W = r(.42, .48), as = r(-.04, .04), m = 6;
  const pr = t => Math.pow(Math.sin(Math.PI * Math.pow(t, .756)), q), hw = t => (W + as) * pr(t);
  const [p, Y] = blade(w, h, m, t => (W + as) * pr(t), t => (W - as) * pr(t));
  g.fillStyle = '#2f6a22'; g.fill(p); rim(g, p, '#a9cc4a', 46, .22);
  g.save(); g.clip(p);
  const base = g.createLinearGradient(0, Y(0), 0, Y(.5)); base.addColorStop(0, 'rgba(15,45,12,.55)'); base.addColorStop(1, 'rgba(15,45,12,0)');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 320; i++) { g.globalAlpha = .07; g.fillStyle = r() < .5 ? '#d8e88a' : '#143a10'; g.fillRect(r(0, w), r(0, h), r(1, 3), r(1, 5)); }
  for (let i = 0, n = 4 + (r() * 3 | 0); i < n; i++) { const t = r(.15, .85); g.globalAlpha = .22; ell(g, w / 2 + r(-.7, .7) * hw(t) * w, Y(t), r(5, 12), r(4, 9), r(0, 3), r() < .6 ? '#c9c24a' : '#1c4a1a'); }
  g.globalAlpha = 1;
  const nv = 6 + (r() * 4 | 0);
  for (let i = 0; i < nv; i++) for (const sd of [-1, 1]) {
    const t0 = .06 + .84 * i / nv, t1 = Math.min(t0 + .2, .97), x1 = w / 2 + sd * hw(t1) * w * .92;
    g.strokeStyle = '#b4cf6c'; g.globalAlpha = .8; g.lineWidth = 2.4 * (1 - t0) + .8; g.beginPath(); g.moveTo(w / 2, Y(t0));
    g.quadraticCurveTo(w / 2 + sd * hw(t1) * w * .6, Y(t0 + .03), x1, Y(t1)); g.stroke();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 24; i++) line(g, [[w / 2, Y(i / 24)], [w / 2, Y((i + 1) / 24)]], '#c6dc84', 5 * (1 - i / 24) + 1);
  const f = s ? r(.1, .25) : .12, tip = g.createLinearGradient(0, Y(1 - f * 1.5), 0, Y(1));
  tip.addColorStop(0, 'rgba(190,170,70,0)'); tip.addColorStop(.5, 'rgba(190,160,80,.7)'); tip.addColorStop(1, 'rgba(130,90,45,1)');
  g.fillStyle = tip; g.fillRect(0, 0, w, h); g.restore();
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  for (let i = 0, n = 1 + (r() * 3 | 0); i < n; i++) {
    const t = r(.25, .7), sd = r() < .5 ? -1 : 1, rad = i < 2 ? r(14, 22) : r(5, 8), x = w / 2 + sd * hw(t) * w * (i < 2 ? 1 : .5);
    g.beginPath(); g.arc(x, Y(t), rad, 0, TAU); if (i < 2) g.arc(x - sd * rad * .5, Y(t + .02), rad * .6, 0, TAU); g.fill();
  }
  // semente >= 10: folha seca (serapilheira), puxada para o marrom sem perder as nervuras
  if (s >= 10) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .62; g.fillStyle = '#A8662A'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; }
  g.globalCompositeOperation = 'source-over';
};
const petal = (g, w, h, s) => {
  const r = R(s, 2), W = r(.4, .45), pr = t => Math.pow(Math.sin(Math.PI * Math.pow(t, 1.1)), .75), m = 4;
  const [p, Y] = blade(w, h, m, t => W * pr(t), t => W * pr(t));
  g.fillStyle = '#f0e9e6'; g.fill(p); rim(g, p, '#ffffff', 22, .35);
  g.save(); g.clip(p);
  const b = g.createLinearGradient(0, Y(0), 0, Y(.4)); b.addColorStop(0, 'rgba(225,210,110,.9)'); b.addColorStop(1, 'rgba(225,210,110,0)');
  g.fillStyle = b; g.fillRect(0, 0, w, h);
  for (let i = 0, n = 5 + (r() * 5 | 0); i < n; i++) {
    const u = i / (n - 1) * 2 - 1; g.strokeStyle = 'rgba(140,100,110,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w / 2, Y(0));
    g.quadraticCurveTo(w / 2 + u * W * w * .3, Y(.5), w / 2 + u * W * w * pr(.85) * .9, Y(.88)); g.stroke();
  }
  g.restore();
};
const wing = (g, w, h, s) => {
  const r = R(s, 3), pr = t => Math.pow(Math.sin(Math.PI * Math.pow(t, .85)), .6), m = 5, L = t => .26 * pr(t), Rt = t => .44 * pr(t);
  const [p, Y] = blade(w, h, m, L, Rt), k = g.createLinearGradient(0, 0, w, 0);
  k.addColorStop(0, 'rgba(215,230,255,.42)'); k.addColorStop(1, 'rgba(255,225,170,.36)'); g.fillStyle = k; g.fill(p);
  const V = 'rgb(95,58,32)';
  g.save(); g.clip(p);
  for (let i = 0; i < 6; i++) {
    const e = [.97, .93, .85, .72, .62, .52][i], xf = lerp(-.8, .9, i / 5), xe = w / 2 + xf * (xf < 0 ? L(e) : Rt(e)) * w * .95;
    const cx = w / 2 + xf * .15 * w, cy = Y(e * .5), px = lerp(lerp(w / 2, cx, .6), lerp(cx, xe, .6), .6), py = lerp(lerp(Y(0), cy, .6), lerp(cy, Y(e), .6), .6);
    g.strokeStyle = V; g.globalAlpha = .8; g.lineWidth = 1.4; g.beginPath(); g.moveTo(w / 2, Y(0)); g.quadraticCurveTo(cx, cy, xe, Y(e)); g.stroke();
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + (xf > 0 ? 8 : -8) * r(.6, 1.2), py - r(10, 18)); g.stroke();
  }
  g.restore(); g.globalAlpha = 1;
  const edge = []; for (let i = 0; i <= 24; i++) edge.push([w / 2 - L(i / 24) * w, Y(i / 24)]);
  line(g, edge, V, 3.5, .85);
  ell(g, w / 2 - L(.84) * w + 4, Y(.84), 3.5, 9, 0, 'rgba(60,30,14,.9)');
};
const fern = (g, w, h, s) => {
  const r = R(s, 4), Y = t => h - 4 - (h - 8) * t, X = t => w / 2 + Math.sin(t * 2.2) * 6, n = 12 + (r() * 5 | 0);
  const st = []; for (let i = 0; i <= 30; i++) st.push([X(i / 30), Y(i / 30)]);
  line(g, st, '#3b6a2a', 3);
  const pin = (x, y, a, L, c) => {
    const dx = Math.sin(a), dy = -Math.cos(a), wd = L * .2, tx = x + dx * L, ty = y + dy * L - L * .12, mx = (x + tx) / 2, my = (y + ty) / 2;
    g.fillStyle = c; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx - dy * wd, my + dx * wd, tx, ty); g.quadraticCurveTo(mx + dy * wd, my - dx * wd, x, y); g.fill();
    line(g, [[x, y], [mx, my - L * .04], [tx, ty]], '#a8cf6a', 1, .8);
  };
  for (let i = 0; i < n; i++) {
    const t = .05 + .9 * i / n, L = 52 * Math.pow(1 - t * .85, .9) * r(.92, 1.05);
    for (const sd of [-1, 1]) pin(X(t), Y(t), sd * lerp(1.25, .6, t) + r(-.05, .05), L, mixCol('#2c6122', '#76ad3c', clamp(t * .6 + r(0, .4))));
  }
  pin(X(1), Y(.985), 0, 24, '#6fa83a');
};
const bark = (g, w, h, s) => {
  const r = R(s, 5), N = 12;
  g.fillStyle = '#6b4a2f'; g.fillRect(0, 0, w, h);
  const wig = (x0, am, m, ph) => { const o = []; for (let y = 0; y <= h; y += 8) o.push([x0 + Math.sin(y / h * TAU * m) * am, y]); return o; };
  for (let pass = 0; pass < 2; pass++) { const rr = R(s, 50); for (let k = 0; k < N; k++) {
    const x0 = (k + rr(-.3, .3)) * w / N, am = rr(2, 6), m = 1 + (rr() * 2 | 0), pts = wig(x0 + (pass ? 0 : w / N / 2), am, m), wd = rr(3, 6);
    wrapT(g, w, h, x0, h / 2, 14, () => { if (!pass) line(g, pts, '#9b7248', wd * 2, .4); else { line(g, pts.map(([x, y]) => [x + 3, y]), '#a07a50', 1.5, .3); line(g, pts, '#2a1a10', wd, .85); } });
  } }
  for (let i = 0; i < 40; i++) { const x = r(0, w), y = r(0, h), l = r(6, 18), d = r(-2, 2); wrapT(g, w, h, x, y, l, () => line(g, [[x, y], [x + l, y + d]], '#2a1a10', 1.4, .5)); }
  grainy(g, w, h, r, 1500, ['#2a1a10', '#b08a5c'], .12, [1, 2.2]);
  for (let i = 0; i < 6; i++) {
    const x = r(0, w), y = r(0, h * .8), c = r(4, 8) | 0, o = Array.from({ length: c }, () => [r(-16, 16), r(-14, 14), r(5, 11), r(4, 8), r(0, 3)]);
    wrapT(g, w, h, x, y, 40, () => { g.globalAlpha = .5; o.forEach((e, j) => ell(g, x + e[0], y + e[1], e[2], e[3], e[4], j % 3 ? '#9fae8a' : '#c3cba8')); g.globalAlpha = 1; });
  }
  for (let i = 0; i < 26; i++) { const x = r(0, w), y = h * r(.82, .97), rx = r(6, 12), ry = r(4, 8); wrapT(g, w, h, x, y, 14, () => { g.globalAlpha = .8; ell(g, x, y, rx, ry, 0, i % 2 ? '#4f7a2e' : '#3b6422'); g.globalAlpha = 1; }); }
};
const soil = (g, w, h, s) => {
  const r = R(s, 6);
  g.fillStyle = '#6a4a30'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { const x = r(0, w), y = r(0, h), d = r(30, 90), c = ['#7d5a3a', '#4e3422', '#8a6a44'][i % 3]; wrapT(g, w, h, x, y, d, () => blob(g, x, y, d, c, .35)); }
  grainy(g, w, h, r, 2200, ['#3a2616', '#a98660'], .6, [1, 2.4]);
  for (let i = 0; i < 45; i++) {
    const x = r(0, w), y = r(0, h), rx = r(3, 8), a = r(0, 3), c = mixCol('#7a746a', '#a8896a', r());
    wrapT(g, w, h, x, y, 10, () => { ell(g, x + 1, y + 2, rx, rx * .7, a, 'rgba(30,18,10,.4)'); ell(g, x, y, rx, rx * .7, a, c); ell(g, x - rx * .3, y - rx * .25, rx * .35, rx * .2, a, 'rgba(255,255,255,.35)'); });
  }
  for (let i = 0; i < 8; i++) {
    const x = r(0, w), y = r(0, h), a = r(0, TAU), l = r(14, 30), q = [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]];
    wrapT(g, w, h, x, y, 32, () => { line(g, q, '#4a3320', 2.5); line(g, q.map(([u, v]) => [u - 1, v - 1]), '#8d6b45', 1, .7); });
  }
  for (let i = 0; i < 12; i++) {
    const x = r(0, w), y = r(0, h), a = r(0, 3), c = Math.cos(a) * 7, d = Math.sin(a) * 7;
    wrapT(g, w, h, x, y, 10, () => { ell(g, x, y, 8, 3.5, a, i % 2 ? '#a8642c' : '#8a5a28'); line(g, [[x - c, y - d], [x + c, y + d]], '#4a2c14', 1, .7); });
  }
};
const stone = (g, w, h, s) => {
  const r = R(s, 7);
  g.fillStyle = '#8d877b'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 24; i++) { const x = r(0, w), y = r(0, h), d = r(30, 70); wrapT(g, w, h, x, y, d, () => blob(g, x, y, d, i % 2 ? '#a39d90' : '#6f695f', .4)); }
  grainy(g, w, h, r, 1500, ['#4a463f', '#c4beb0'], .45, [1, 2]);
  for (let i = 0; i < 5; i++) {
    let x = r(0, w), y = r(0, h), a = r(0, TAU); const q = [[x, y]];
    for (let j = 0; j < 7; j++) { a += r(-.8, .8); x += Math.cos(a) * 9; y += Math.sin(a) * 9; q.push([x, y]); }
    wrapT(g, w, h, q[0][0], q[0][1], 70, () => { line(g, q.map(([u, v]) => [u + 1, v + 1]), '#b9b3a6', 1, .35); line(g, q, '#2f2b26', 1.4, .8); });
  }
  for (let i = 0; i < 8; i++) {
    const x = r(0, w), y = r(0, h), o = Array.from({ length: 8 }, () => [r(-9, 9), r(-9, 9), r(2, 5), r(2, 4)]);
    wrapT(g, w, h, x, y, 20, () => { g.globalAlpha = .6; o.forEach((e, j) => ell(g, x + e[0], y + e[1], e[2], e[3], 0, ['#b6bf6a', '#c9c58a', '#7f9a58'][j % 3])); g.globalAlpha = 1; });
  }
};
// Quitina natural (multiplica a cor da peça): base clara com tom que varia em manchas largas, pontinhos (poros) e
// fibrinhas curtas de feltro; nada de faixas lisas que pareçam plástico.
const chitin = (g, w, h, s) => {
  const r = R(s, 8), k = g.createLinearGradient(0, 0, 0, h); k.addColorStop(0, '#f4f1ec'); k.addColorStop(1, '#c4beb6');
  g.fillStyle = k; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { const x = r(0, w), y = r(0, h), d = r(24, 70); wrapT(g, w, h, x, y, d, () => blob(g, x, y, d, i % 3 ? '#8a8078' : '#ffffff', .16)); }
  grainy(g, w, h, r, 2600, ['#5a524c', '#ffffff'], .1, [1, 1.8]);
  for (let i = 0; i < 900; i++) { const x = r(0, w), y = r(0, h), a = r(0, TAU), l = r(2, 5); wrapT(g, w, h, x, y, 6, () => line(g, [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], i % 2 ? '#6a625a' : '#fffaf0', .8, .14)); }
};
const facets = (g, w, h, s) => {
  const r = R(s, 9), N = 18, cw = w / N, R0 = cw / Math.sqrt(3), rh = cw * .866;
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h);
  for (let j = 0; j * rh < h + rh; j++) for (let i = 0; i < N; i++) {
    const x = (i + (j % 2 ? 1 : .5)) * cw, y = j * rh, v = r(.9, 1);
    wrapT(g, w, h, x, y, R0, () => {
      const k = g.createRadialGradient(x - R0 * .2, y - R0 * .25, 0, x, y, R0 * 1.1); k.addColorStop(0, '#fff'); k.addColorStop(1, mixCol('#c0c0c0', '#ffffff', (v - .9) * 10));
      g.beginPath(); for (let a = 0; a < 6; a++) g[a ? 'lineTo' : 'moveTo'](x + Math.cos(a * TAU / 6 + TAU / 12) * R0, y + Math.sin(a * TAU / 6 + TAU / 12) * R0);
      g.closePath(); g.fillStyle = k; g.fill(); g.strokeStyle = '#6e6e6e'; g.lineWidth = 2; g.stroke();
    });
  }
  const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, 'rgba(0,0,0,0)'); d.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = d; g.fillRect(0, 0, w, h);
};

return [{
  leaf: [256, 512, leaf, ['#24401A', 3]], petal: [128, 256, petal, ['#8A7A70', 2]], wing: [128, 256, wing], fern: [128, 512, fern, ['#24401A', 1.5]],
  bark: [256, 512, bark, 0, 1], soil: [512, 512, soil, 0, 1], stone: [256, 256, stone, 0, 1], chitin: [256, 256, chitin, 0, 1], facets: [256, 256, facets, 0, 1],
}, outline];
})();
// toonTexture(THREE, kind, seed = 0): THREE.CanvasTexture em cache por `${kind}:${seed}`.
function toonTexture(THREE, kind, seed = 0) {
  const key = `${kind}:${seed}`, k = TOON_KINDS[kind];
  if (!k) throw new Error(`Textura desconhecida: ${kind}`);
  if (TOON_TEX.has(key)) return TOON_TEX.get(key);
  const [w, h, paint, ol, tile] = k, c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h, seed);
  const tex = new THREE.CanvasTexture(ol ? toonOutline(c, ol[0], ol[1]) : c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  if (tile) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  TOON_TEX.set(key, tex); return tex;
}
