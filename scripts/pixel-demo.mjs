// Protótipo do boneco de pixel (fora do motor), em duas versões lado a lado: v3 (volumes sombreados, rampas de 5 tons,
// linhas internas, contorno seletivo) e v4 (mais detalhe de roupa e rosto, luz de borda, cachecol e cabelo com mola,
// cenário em camadas). Cada quadro é função pura de t, desenhado a 12/s.
// Uso: node scripts/pixel-demo.mjs [--top=3 --bottom=4] --video=out/x.mp4 | --at=4.2,6 --out=out/x.png
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

// Rampas escuro → claro: a sombra puxa para roxo/azul, a luz para amarelo.
const R = {
  skin: ['#5a2f45', '#9a5450', '#d08a65', '#f0b48a', '#ffdcb0'],
  hair: ['#24142a', '#45202e', '#6e3a30', '#9a5a38', '#c8864a'],
  jacket: ['#1a1a48', '#22388a', '#2c62b8', '#4896d8', '#8cd0f0'],
  shirt: ['#5a4a6a', '#9a8aa0', '#cfc3b8', '#ece2cc', '#fff8e8'],
  pants: ['#24162e', '#43263a', '#643a3c', '#8a5644', '#ad7650'],
  boot: ['#1c1022', '#3a1e28', '#5c3230', '#80503a', '#a66e48'],
  gold: ['#5a341c', '#9a6a1e', '#d8a830', '#ffe070', '#fff8c0'],
  scarf: ['#3a0e26', '#781a2e', '#b82e30', '#e45a3a', '#ff9a64'],
  leaf: ['#122a26', '#1e4a30', '#2e6e36', '#58963c', '#9cc452'],
  bark: ['#1e1220', '#3a2428', '#5a3a30', '#7c5838', '#9c7646'],
  cloud: ['#8aa6c8', '#b2cae0', '#d8e8f2', '#f2f8fa', '#ffffff'],
  grass: ['#1a3428', '#2a5432', '#467a34', '#74a23e', '#acd25a'],
  dirt: ['#1e1218', '#38222a', '#5a3a34', '#7a5640'],
};
const INK = '#140c1c', WHITE = '#fff8e8', BLUSH = '#f08878';
const L = (() => { const v = [-.55, -.7, .5], n = Math.hypot(...v); return v.map(c => c / n); })();
const band = s => s > .8 ? 4 : s > .5 ? 3 : s > .15 ? 2 : s > -.25 ? 1 : 0;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y, k) => k * 16 > BAYER[(y & 3) * 4 + (x & 3)] + .5;
const lerp = (a, b, k) => a + (b - a) * k;
const snap = v => Math.round(v * 2) / 2;

const E = (c, rx, ry, mat, o = {}) => ({ k: 'e', c, rx, ry, mat, ...o });
const C = (a, b, ra, rb, mat, o = {}) => ({ k: 'c', a, b, ra, rb, mat, ...o });

// Normal (nx, ny, nz) no pixel (x, y) se ele cai dentro da forma; elipse = esfera achatada, cápsula afinada = cilindro.
function sample(s, x, y) {
  if (s.k === 'p') {
    // polígono com bisel: centro plano (luz chapada), borda inclinada para fora; dá planos duros em vez de cilindros
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

// Pinta as formas em ordem (depois = na frente) e devolve a grade de cores: limpeza de tom isolado, linhas internas,
// luz de borda (rim, v4) no lado da sombra e contorno seletivo (outline: false nas nuvens).
function layer(parts, W, H, OX, OY, { rim = false, outline = true } = {}) {
  const cell = new Array(W * H).fill(null);
  parts.forEach((s, i) => {
    if (s.k === 'sp') return spriteCells(s, i, cell, W, H, OX, OY);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x + .5 - OX, py = y + .5 - OY, n = sample(s, px, py);
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
      if (n && n.i > c.i && n.g !== c.g) return n.mat === c.mat ? Math.max(0, t - 2) : 0;
    }
    if (rim && t <= 1 && !at(k % W + 1, k / W | 0) && at(k % W - 1, k / W | 0)) return 2;
    return t;
  });
  return cell.map((c, k) => {
    if (c) return R[c.mat][tone[k]];
    if (!outline) return null;
    const x = k % W, y = k / W | 0;
    const lit = at(x + 1, y) || at(x, y + 1), dark = at(x - 1, y) || at(x, y - 1);
    return dark ? INK : lit ? R[lit.mat][0] : null;
  });
}

// Sprite desenhado à mão: dígitos 0–4 são o tom do material; com locks, cada letra é uma mecha que se sombreia sozinha
// (luz no alto e à esquerda da mecha, sombra embaixo e à direita) e ganha linha interna contra a mecha da frente.
function spriteCells(s, i, cell, W, H, OX, OY) {
  const x0 = Math.floor(s.at[0]) - s.ax + OX, y0 = Math.floor(s.at[1]) - s.ay + OY;
  s.rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const x = x0 + c, y = y0 + r;
    if (ch === '.' || x < 0 || y < 0 || x >= W || y >= H) return;
    let t = +ch, ii = i, g = s.g ?? i;
    if (s.locks) { t = lockTone(s.rows, c, r, ch) + (s.lockBias?.[ch] || 0); ii = i + s.locks.indexOf(ch) / 100; g = 'lock' + ch; }
    cell[y * W + x] = { i: ii, g, mat: s.mat, t: Math.max(0, Math.min(4, t + (s.bias < 0 ? -1 : 0))) };
  }));
}
function lockTone(rows, c, r, ch) {
  const has = (cc, rr) => (rows[rr] || '')[cc] === ch;
  let t = !has(c, r - 1) ? 4 : !has(c, r - 2) ? 3 : 2;
  if (t === 2 && !has(c - 1, r)) t = 3;
  const dn = !has(c, r + 1), rt = !has(c + 1, r);
  if (dn && rt) t = 0; else if (dn || rt) t = Math.min(t, 1);
  else if (t === 2 && (c + r) % 4 === 0 && hash(c * 7 + r * 13) > .35) t = 1;
  return t;
}

// Cabelo v5 (âncora = centro da cabeça na coluna 14, linha 15): mechas penteadas para trás, franja em três pontas que
// deixam a testa, as sobrancelhas e os olhos livres. Ordem de trás para a frente em locks.
const HAIR5 = { ax: 14, ay: 15, locks: 'efdabchig', lockBias: { e: -1, f: -1 }, rows: [
  '.....a.......b............',
  '.....aa......bb...........',
  '......aa.....bbb.....c....',
  '......aaa...bbbb....cc....',
  '..d....aaa.bbbbb...ccc....',
  '..dd...aaaabbbbbb.cccc....',
  '...ddd.aaaabbbbbbccccc....',
  '...dddddaaaabbbbbcccccg...',
  '..dddddddaaabbbbbccccggg..',
  '.edddddddddabbbbbcccgggg..',
  'eeeddddddddddbbbhhcgggggg.',
  'eeeedddddddddhhhhhiigggggg',
  '.eeeddddddddhhhhh.iii.ggg.',
  '..eedddddddd.hh....ii..gg.',
  '...eddddddd..h......i.....',
  '...fdddddd................',
  '...ffddddd................',
  '...ffdddd.................',
  '....ffddd.................',
  '....ffdd..................',
  '.....fff..................',
  '......f...................'] };
// Mãos v5 em tons de pele, olhando para a direita; âncora no meio da palma.
const HANDS5 = {
  fist: { ax: 2, ay: 2, rows: ['.343.', '34432', '33321', '32211', '.211.'] },
  relax: { ax: 2, ay: 1, rows: ['.43.', '4332', '3332', '3321', '2321', '.21.'] },
  point: { ax: 2, ay: 2, rows: ['.343.......', '34434444432', '33322222221', '3321.......', '.211.......'] },
  open: { ax: 3, ay: 3, rows: ['.4.4.4', '.3.3.3', '.3.3.3', '433332', '333321', '.2221.'] },
};
// Bota v5: cano dobrado claro, vinco, bico com brilho e sola; âncora no tornozelo.
const BOOT5 = { ax: 2, ay: 3, rows: ['.4443.....', '.1111.....', '.3322.....', '.33221....', '4332222331', '3222222221', '0000000000'] };
const quad = (a, b, ra, rb, mat, o = {}) => {
  const L0 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L0, uy = (b[1] - a[1]) / L0, nx = -uy, ny = ux;
  const A = [a[0] - ux * ra * .6, a[1] - uy * ra * .6], B = [b[0] + ux * rb * .6, b[1] + uy * rb * .6];
  return { k: 'p', pts: [[A[0] + nx * ra, A[1] + ny * ra], [B[0] + nx * rb, B[1] + ny * rb], [B[0] - nx * rb, B[1] - ny * rb], [A[0] - nx * ra, A[1] - ny * ra]],
    bev: Math.min(ra, rb) * .9, mat, ...o };
};

// ---------------------------------------------------------------- pose

// Dois ossos: devolve [meio, ponta]; a ponta é puxada para o alcance; bend +1 dobra para +x (joelho), −1 para −x.
function ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.max(.5, Math.min(Math.hypot(dx, dy), l1 + l2 - .01)), ang = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const k1 = [a[0] + l1 * Math.cos(ang + al), a[1] + l1 * Math.sin(ang + al)], k2 = [a[0] + l1 * Math.cos(ang - al), a[1] + l1 * Math.sin(ang - al)];
  return [(k1[0] - k2[0]) * bend >= 0 ? k1 : k2, [a[0] + Math.cos(ang) * d, a[1] + Math.sin(ang) * d]];
}

// Alvos de cada trecho, relativos à raiz (chão sob o quadril): mãos, tornozelos, b (corpo desce/sobe), expressão.
const SEG = [
  [0, t => {
    const th = 2 * Math.PI * ((t * 1.5) % 1), sF = Math.sin(th), sB = -sF, b = Math.abs(sF) < .5 ? -1 : 0;
    return { b, x: 36 + t * 34,
      hF: [-4 - 3.4 * sF, -14.8 + b + Math.max(0, -sF) * .8], hB: [4.6 - 3.4 * sB, -15 + b + Math.max(0, -sB) * .8], bendF: -1, bendB: -1, handF: 'fist', handB: 'fist',
      aF: [-1.6 + 4.6 * sF, -3.2 - Math.max(0, Math.cos(th)) * 2.2], aB: [1.6 + 4.6 * sB, -3.2 - Math.max(0, -Math.cos(th)) * 2.2],
      face: 'neutral', mouth: 'm', wind: 1 };
  }],
  [3.2, t => {
    const b = (t % 1.6) < .8 ? 0 : 1;
    return { b, x: 145, hF: [-5.8, -14.4 + b], hB: [6, -14.6 + b], bendF: -1, bendB: 1, handF: 'relax', handB: 'relax', aF: [-2.8, -3.2], aB: [3, -3.2], face: 'neutral', mouth: 'm' };
  }],
  [5, t => {
    const b = (t % 1.6) < .8 ? 0 : 1;
    return { b, x: 145, hF: [-4.8, -16.6 + b], hB: [13.4, -23.2 + b], bendF: -1, bendB: 1, handF: 'fist', handB: 'point', aF: [-4.4, -3.2], aB: [4.6, -3.2],
      point: 1, face: 'neutral', mouth: ['a', 'm', 'o', 'e', 'm', 'a', 'm', 'm'][Math.floor(t * 6) % 8] };
  }],
  [7.5, t => {
    const u = ((t - 7.5) / .7) % 1, h = Math.sin(Math.PI * u) * 7, w = Math.sin(t * 14) * 1.2, tuck = Math.min(2.4, h * .4);
    return { b: h < 1 ? 1 : 0, x: 145, y: -h, hF: [-12 + w * .5, -28.6 - w], hB: [12.8 - w * .5, -28.2 + w], bendF: -1, bendB: 1, handF: 'open', handB: 'open',
      aF: [-3.6, -3.2 - tuck], aB: [4.6, -3.4 - tuck], face: 'happy', mouth: 'grin', wind: -1 };
  }],
];

function poseAt(t) {
  t = Math.floor(t * 12 + 1e-6) / 12;
  let i = SEG.length - 1; while (SEG[i][0] > t) i--;
  let p = SEG[i][1](t);
  const k = i ? (t - SEG[i][0]) / .25 : 1;
  if (k < 1) {
    const q = SEG[i - 1][1](SEG[i][0] - 1e-3), e = k * k * (3 - 2 * k), mix = (a, b) => [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];
    p = { ...p, x: lerp(q.x, p.x, e), b: Math.round(lerp(q.b, p.b, e)), hF: mix(q.hF, p.hF), hB: mix(q.hB, p.hB), aF: mix(q.aF, p.aF), aB: mix(q.aB, p.aB) };
  }
  const b = p.b, S = pt => pt.map(snap);
  const shF = [-4.2, -23 + b], shB = [4.2, -23 + b], hipF = [-2.3, -14 + b], hipB = [2.3, -14 + b];
  const [eF, hF] = ik(shF, p.hF, 5, 4.6, p.bendF), [eB, hB] = ik(shB, p.hB, 5, 4.6, p.bendB);
  const [kF, aF] = ik(hipF, p.aF, 6, 5.4, 1), [kB, aB] = ik(hipB, p.aB, 6, 5.4, 1);
  return { ...p, t, x: Math.round(p.x), y: Math.round(p.y || 0), blink: p.face !== 'happy' && (t % 2.3) < .12,
    armF: [shF, eF, hF].map(S), armB: [shB, eB, hB].map(S), legF: [hipF, kF, aF].map(S), legB: [hipB, kB, aB].map(S) };
}

// ---------------------------------------------------------------- boneco

const FIG = { W: 72, H: 74, OX: 34, OY: 70 };
function figure(P, ver) {
  const v4 = ver >= 4, v5 = ver >= 5;
  const b = P.b, up = ([x, y]) => [x, y], hx = 1, hy = -34 + b, t = P.t;
  const midStrip = x => x > .3 && x < 2.8;
  const torsoMat = v4
    ? (x, y) => midStrip(x) ? (y < -17.6 + b ? 'shirt' : y < -16 + b ? (x > .6 && x < 2.4 ? 'gold' : 'boot') : 'pants') : y < -14.8 + b ? 'jacket' : 'pants'
    : (x, y) => y > -16 + b ? 'pants' : y > -17.6 + b ? (midStrip(x) ? 'gold' : 'boot') : midStrip(x) ? 'shirt' : 'jacket';
  // v4: barra escura da jaqueta, borda da lapela e bolso.
  const torsoTn = v4 ? (x, y, tn) => {
    if (midStrip(x) || y >= -14.8 + b) return tn;
    if (y > -15.8 + b || (x > 2.8 && x < 3.8) || (x > -4.6 && x < -2 && y > -19.6 + b && y < -18.8 + b)) return Math.min(tn, 1);
    return tn;
  } : null;
  const arm = ([s, e, h], g, bias, point, hand) => v5 ? [
    quad(s, e, 2.4, 2.1, 'jacket', { g, bias }), E(e, 2, 2, 'jacket', { g, bias }), quad(e, h, 2.1, 1.8, 'jacket', { g, bias }),
    E([lerp(e[0], h[0], .8), lerp(e[1], h[1], .8)], 1.7, 1.7, 'shirt', { g: g + 'cuff', bias }),
    { k: 'sp', at: h, ...HANDS5[hand], mat: 'skin', bias }] : [
    C(s, e, 2.4, 2.1, 'jacket', { g, bias }), C(e, h, 2.1, 1.8, 'jacket', { g, bias }),
    ...(v4 ? [E([lerp(e[0], h[0], .8), lerp(e[1], h[1], .8)], 1.7, 1.7, 'shirt', { g: g + 'cuff', bias })] : []),
    E(h, 2.2, 2.2, 'skin', { bias }), ...(point && !v5 ? [C(h, [h[0] + 2.6, h[1]], 1, .8, 'skin', { g: 'hand', bias })] : [])];
  const leg = ([hp, kn, an], g, bias) => v5 ? [
    quad(hp, kn, 2.9, 2.5, 'pants', { g, bias }), E(kn, 2.4, 2.4, 'pants', { g, bias }), quad(kn, an, 2.5, 2.2, 'pants', { g, bias }),
    { k: 'sp', at: an, ...BOOT5, mat: 'boot', bias }] : [
    C(hp, kn, 2.9, 2.5, 'pants', { g, bias }), C(kn, an, 2.5, 2.2, 'pants', { g, bias }),
    C(an, [an[0] + 1.8, an[1] + .7], 2.7, 2.5, 'boot', { bias, tn: v4 ? (x, y, tn) => y < an[1] - 1.4 ? tn + 1 : y > an[1] + 2.4 ? 0 : tn : null })];
  const H = (dx, dy) => [hx + dx, hy + dy];
  // v4: as pontas do cabelo balançam com uma mola analítica (seno amortecido por trecho).
  const sway = v4 ? Math.sin(t * 7) * .8 * (P.wind || .4) : 0;
  const hair = (a, c, ra, rb, k = 0) => C(H(...a), H(c[0] + sway * k, c[1] + Math.abs(sway) * k * .3), ra, rb, 'hair');
  const wv = v4 ? Math.sin(t * 9) : 0, wind = P.wind || 0;
  const scarf = v4
    ? [C(up([-1, -25 + b]), [-5.4, -23.6 + b + wv * .8], 2.2, 1.6, 'scarf', { g: 'tail' }), C([-5.4, -23.6 + b + wv * .8], [-9.8 - wind, -22.4 + b - wv * 1.2], 1.6, .8, 'scarf', { g: 'tail' })]
    : [C([-1, -25 + b], [-8, -21.5 + b + wind], 2.2, 1, 'scarf')];
  const head = v4 ? [E(H(0, 0), 7.8, 7.6, 'skin', { g: 'head' }), E(H(1.6, 3.4), 6.2, 4.7, 'skin', { g: 'head' })]
    : [E(H(0, 0), 7.6, 7.4, 'skin', { g: 'head' }), E(H(1.6, 3.4), 6, 4.6, 'skin', { g: 'head' })];
  const parts = [
    ...scarf,
    ...arm(P.armB, 'armB', v4 ? -.55 : -.35, P.point, P.handB),
    ...leg(P.legB, 'legB', v4 ? -.55 : -.35),
    v5 ? { k: 'p', pts: [[-4.6, -28], [5.2, -28], [6.6, -24.6], [5.8, -17.5], [6.2, -12], [-5.2, -12], [-5.4, -17.5], [-6.2, -24.6]].map(([x, y]) => [x, y + b]),
      bev: 2.2, mat: torsoMat, tn: torsoTn } : C([0, -24 + b], [.5, -17 + b], 6, 6.2, torsoMat, { tn: torsoTn }),
    ...leg(P.legF, 'legF', 0),
    E([.8, -25.4 + b], 5.6, 2.3, 'scarf'),
    ...head, E(H(7.4, 1.8), 1.2, 1.1, 'skin', { g: 'head' }),
    ...(v5 ? [{ k: 'sp', at: H(0, 0), ...HAIR5, mat: 'hair' }, { k: 'sp', at: H(-3.2, 1.8), ax: 1, ay: 2, rows: ['.43.', '4321', '3211', '321.', '.21.'], mat: 'skin', g: 'head' }] : [
    hair([-3, -2], [-5, 1], 6, 4.5), hair([-8, -1], [-10.5, 4], 2.6, .8, 1),
    ...(v4 ? [hair([-2, -6], [-7, -10.5], 3, .6, 1), hair([1.5, -6.5], [-1.5, -11.5], 2.8, .6, .8), hair([4, -6], [5, -9.5], 2.2, .5, .5)]
      : [hair([-1, -6], [-4, -11], 3, .6, 1), hair([2, -6], [3.5, -11], 2.6, .6, .6)]),
    hair([-4, -4], [-9.5, -7.5], 2.6, .6, 1), hair([0, -6], [-2, -6.5], 5, 3.6),
    E(H(-1.4, 1.6), 1.7, 2.2, 'skin', { g: 'ear' }),
    hair([0, -4.6], [1.4, -1.2], 2.4, .8), hair([3.2, -5.2], [5.6, -1.8], 2.4, .7), hair([5.8, -5.2], [8.6, -3.2], 1.8, .5, .4)]),
    ...arm(P.armF, 'armF', 0, false, P.handF),
  ];
  return layer(v4 ? parts.map(s => scaled(s, K4)) : parts, FIG.W, FIG.H, FIG.OX, FIG.OY, { rim: v4 });
}

// v4 desenha o mesmo esqueleto 25% maior (mais pixels para rosto e roupa); mat e tn recebem coordenadas sem escala.
const K4 = 1.25;
function scaled(s, k) {
  const m = p => p.map(v => v * k), un = f => typeof f === 'function' ? (x, y, ...r) => f(x / k, y / k, ...r) : f;
  if (s.k === 'sp') return { ...s, at: m(s.at) };
  if (s.k === 'p') return { ...s, pts: s.pts.map(m), bev: s.bev * k, mat: un(s.mat), tn: un(s.tn) };
  return s.k === 'e' ? { ...s, c: m(s.c), rx: s.rx * k, ry: s.ry * k, mat: un(s.mat), tn: un(s.tn) }
    : { ...s, a: m(s.a), b: m(s.b), ra: s.ra * k, rb: s.rb * k, mat: un(s.mat), tn: un(s.tn) };
}

// Rosto em padrões fixos na âncora da cabeça. K tinta, W branco, B sobrancelha, S boca fechada, T língua, P bochecha.
const FACES = {
  v3: { neutral: { near: ['KW', 'KK', 'KK'], far: ['K', 'K', 'K'], brow: 0 }, happy: { near: ['.K.', 'K.K'], far: ['K.', '.K'], brow: -1, dy: 1 },
    blink: { near: ['..', 'KK', '..'], far: ['.', 'K', '.'], brow: 0 } },
  v4: { neutral: { near: ['.KK', 'WKW', 'WKK', '.KK'], far: ['K', 'K', 'K', 'K'], brow: 0, blush: 1 }, happy: { near: ['.KK.', 'K..K'], far: ['KK', '..'], brow: -1, dy: 1, blush: 1 },
    blink: { near: ['....', '....', 'KKK.', '....'], far: ['.', '.', 'K', '.'], brow: 0, blush: 1 } },
};
const MOUTHS = {
  v3: { m: ['SS'], a: ['KK', 'KT'], o: ['K', 'K'], e: ['KK'], grin: ['KKK', 'KTT'] },
  v4: { m: ['SS'], a: ['KK', 'KT'], o: ['.K', 'KK', '.K'], e: ['KKK', '.T.'], grin: ['KKKK', '.TT.'] },
};
function paintFace(grid, P, ver) {
  const v4 = ver >= 4;
  const k = v4 ? K4 : 1, set = v4 ? 'v4' : 'v3', hx = 1 * k, hy = (-34 + P.b) * k;
  const put = (x, y, ch) => {
    const col = { K: INK, W: WHITE, B: R.hair[0], S: R.skin[1], T: R.scarf[3], P: BLUSH }[ch];
    const gx = Math.floor(x) + FIG.OX, gy = Math.floor(y) + FIG.OY;
    if (col && gx >= 0 && gx < FIG.W && gy >= 0 && gy < FIG.H) grid[gy * FIG.W + gx] = col;
  };
  const stamp = (rows, x, y) => rows.forEach((r, j) => [...r].forEach((ch, i) => put(x + i, y + j, ch)));
  const F = FACES[set][P.blink ? 'blink' : P.face], dy = F.dy || 0, ex = v4 ? 2.4 : 1.5, fx = v4 ? 7.2 : 5.5;
  stamp(F.near, hx + ex, hy + dy); stamp(F.far, hx + fx, hy + dy);
  stamp(v4 ? ['BBB'] : ['BB'], hx + ex, hy - 2 + F.brow); stamp(['B'], hx + fx, hy - 2 + F.brow);
  if (F.blush) { stamp(['PP'], hx + 1.6, hy + 5); stamp(['P'], hx + 8.2, hy + 5); }
  const M = MOUTHS[set][P.mouth];
  stamp(M, hx + (M[0].length > 2 ? 3.5 : 4.5) * k + (v4 ? .6 : 0), hy + 4.5 * k + (v4 ? .5 : 0));
}

// ---------------------------------------------------------------- cenário

const W = 320, BH = 90, GY = 80;
const put = (grid, x, y, c) => { if (c && x >= 0 && x < W && y >= 0 && y < BH * 2) grid[y * W + x] = c; };
const blit = (grid, src, sw, x0, y0, top, bot) => src.forEach((c, k) => {
  const x = x0 + k % sw, y = y0 + (k / sw | 0);
  if (c && x >= 0 && x < W && y >= top && y < bot) grid[y * W + x] = c;
});

function sky(grid, y0, cols, seams) {
  for (let y = 0; y < GY; y++) for (let x = 0; x < W; x++) {
    const i = seams.filter(s => y >= s).length, f = (y - seams[i - 1] + 1) / 4;
    put(grid, x, y0 + y, i && f < 1 ? (dith(x, y, f) ? cols[i] : cols[i - 1]) : cols[i]);
  }
}
function pines(grid, y0, n, seed, hMin, hVar, lit, dark, edge) {
  for (let j = 0; j < n; j++) {
    const cx = 4 + Math.round(j * W / n + hash(seed * 31 + j) * 8), h = hMin + Math.round(hash(seed + j * 7) * hVar);
    for (let r = 0; r < h; r++) {
      const w = Math.floor((r % 6) * .55 + r * .2), y = GY - h + r;
      for (let dx = -w; dx <= w; dx++) put(grid, cx + dx, y0 + y, edge && dx === -w && r % 6 ? edge : dx < 0 ? lit : dark);
    }
  }
}
function ground(grid, y0, t, v4) {
  const G = R.grass, D = R.dirt;
  for (let y = GY; y < BH; y++) for (let x = 0; x < W; x++) {
    const d = y - GY;
    put(grid, x, y0 + y, d < 1 ? G[3] : d < 3 ? G[2] : d < 5 ? (dith(x, y, .5) ? G[1] : G[2]) : d < 6 ? G[0]
      : hash(x * 13 + y * 7) > .93 ? D[3] : dith(x, y, .25) ? D[1] : D[2]);
  }
  for (let x = 0; x < W; x++) {
    const hgt = hash(x * 3.1) > .55 ? 1 + (hash(x) > .7) : 0;
    for (let k = 1; k <= hgt; k++) put(grid, x, y0 + GY - k, k === hgt ? G[4] : G[3]);
    if (hash(x * 7.7) > .8) put(grid, x, y0 + GY + 2, G[1]);
    if (v4 && hash(x * 9.3 + 2) > .94) {
      const fl = ['#f8e070', BLUSH, WHITE][Math.floor(hash(x * 4.4) * 3)], fy = y0 + GY - 2 - (hash(x * 2) > .5);
      put(grid, x, fy, fl); put(grid, x, fy + 1, G[1]);
    }
  }
}
// Copa em tufos: cada tufo uma esfera com linha interna e contorno; o tronco usa a mesma camada.
function canopy(n, seed, rx, ry, cy) {
  const parts = [];
  for (let j = 0; j < n; j++) {
    const a = hash(seed + j * 3.3) * Math.PI * 2, d = Math.sqrt(hash(seed + j * 1.7)), r = 3.6 + hash(seed + j) * 3;
    parts.push(E([Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d], r, r * .9, 'leaf'));
  }
  return parts.sort((p, q) => p.c[1] - q.c[1]);
}

function backgroundV3(grid, y0) {
  sky(grid, y0, ['#5d9ad0', '#8cc4e4', '#c8ecec'], [GY - 40, GY - 28]);
  for (let x = 0; x < W; x++) {
    const ridge = GY - 22 + Math.round(3 * Math.sin(x * .08 + 1) + 2 * Math.sin(x * .21));
    for (let y = ridge; y < GY; y++) put(grid, x, y0 + y, y === ridge ? '#b4dcd8' : '#94c0c4');
  }
  pines(grid, y0, 26, 1, 14, 10, '#5c8e7c', '#467468');
  ground(grid, y0, 0, false);
  blit(grid, layer(canopy(9, 5, 9, 7, -9), 32, 22, 16, 21), 32, 270, y0 + GY - 20, y0, y0 + BH);
}

const PEAKS = [[20, 8], [70, 14], [118, 9], [170, 16], [222, 10], [268, 15], [318, 9]];
function backgroundV4(grid, y0, t) {
  sky(grid, y0, ['#4a86c8', '#6fa8dc', '#9cd0e8', '#cdeee8'], [GY - 62, GY - 48, GY - 36]);
  // nuvens em tufos, sem contorno, derivando devagar
  for (let j = 0; j < 3; j++) {
    const parts = [];
    for (let q = 0; q < 6; q++) parts.push(E([(q - 2.5) * 4.2, -2 - Math.sin(q * 1.3 + j) * 2.2 - (q > 1 && q < 4) * 2], 4.4, 3.2, 'cloud'));
    const cx = Math.round((j * 120 + 40 + t * (2 + j)) % (W + 60)) - 30;
    blit(grid, layer(parts, 40, 14, 20, 12, { outline: false }), 40, cx - 20, y0 + 8 + j * 9 - 12, y0, y0 + GY - 30);
  }
  // serra com face clara à esquerda e neve nos picos
  for (let x = 0; x < W; x++) {
    // picos em triângulo: face esquerda clara, direita escura, neve serrilhada no alto
    let r = GY, pk = null;
    for (const [px, ph] of PEAKS) { const y = GY - 22 - ph + Math.abs(x - px) * .8; if (y < r) { r = y; pk = [px, ph]; } }
    r = Math.round(r + (hash(x * 1.9) > .7 ? 1 : 0));
    const snowTo = GY - 22 - pk[1] + 4 + Math.round(hash(x * 3.7) * 2);
    for (let y = r; y < GY; y++) put(grid, x, y0 + y, y < snowTo && pk[1] > 10 ? (x < pk[0] ? '#f4fafc' : '#c8dcec') : x < pk[0] ? '#94b8d0' : '#7398b8');
    const hill = GY - 16 + Math.round(2.5 * Math.sin(x * .05 + 2) + 1.5 * Math.sin(x * .13));
    for (let y = hill; y < GY; y++) put(grid, x, y0 + y, y < hill + 2 && dith(x, y, .5) ? '#8cb8a8' : '#78a698');
  }
  pines(grid, y0, 30, 1, 10, 8, '#6a9a88', '#578a7a');
  pines(grid, y0, 18, 4, 16, 12, '#3e7060', '#2e5648', '#5a8c72');
  ground(grid, y0, t, true);
  // árvore grande à esquerda e arbusto à direita
  const tree = [C([0, 0], [0, -30], 3.4, 2.6, 'bark'), C([0, -22], [6, -30], 1.6, 1, 'bark'), C([0, -26], [-6, -33], 1.6, 1, 'bark'),
    ...canopy(30, 11, 19, 10, -42)];
  blit(grid, layer(tree, 64, 64, 32, 62, { rim: true }), 64, 18 - 32, y0 + GY + 1 - 62, y0, y0 + BH);
  blit(grid, layer(canopy(9, 5, 9, 7, -9), 32, 22, 16, 21, { rim: true }), 32, 270, y0 + GY - 20, y0, y0 + BH);
}

function band2(grid, y0, t, ver) {
  if (ver >= 4) backgroundV4(grid, y0, t); else backgroundV3(grid, y0);
  const P = poseAt(t), gx = P.x, air = -P.y;
  for (let x = -8 + Math.ceil(air / 2); x <= 9 - Math.ceil(air / 2); x++) if (Math.abs(x) < 8 - air / 2 || dith(x, 0, .5)) put(grid, gx + x, y0 + GY + 1, R.grass[1]);
  const fig = figure(P, ver);
  paintFace(fig, P, ver);
  blit(grid, fig, FIG.W, gx - FIG.OX, y0 + GY + 1 + P.y - FIG.OY, y0, y0 + BH);
  for (let x = gx - 10; x < gx + 12; x++) if (hash(x * 5.3) > .6) put(grid, x, y0 + GY, R.grass[hash(x) > .5 ? 4 : 3]);
}

function frame(t) {
  const grid = new Array(W * BH * 2).fill(INK);
  band2(grid, 0, t, TOP);
  band2(grid, BH, t, BOTTOM);
  for (let x = 0; x < W; x++) put(grid, x, BH, INK);
  return grid;
}

// ---------------------------------------------------------------- saída

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toRGB = grid => { const b = Buffer.alloc(grid.length * 3); grid.forEach((h, k) => b.set(rgb(h), k * 3)); return b; };
function savePng(path, grids, S) {
  const w = W * grids.length, h = BH * 2, ow = w * S, oh = h * S, raw = Buffer.alloc((ow * 3 + 1) * oh);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const gi = (x / S | 0) / W | 0, c = rgb(grids[gi][(y / S | 0) * W + (x / S | 0) % W]), o = y * (ow * 3 + 1) + 1 + x * 3;
    raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2];
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4);
    len.writeUInt32BE(data.length); c.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(ow, 0); ihdr.writeUInt32BE(oh, 4); ihdr[8] = 8; ihdr[9] = 2;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const TOP = +(arg('top') || 3), BOTTOM = +(arg('bottom') || 4);
if (arg('video')) {
  const out = arg('video'), raw = [];
  for (let f = 0; f < 240; f++) raw.push(toRGB(frame(f / 24)));
  mkdirSync(dirname(out), { recursive: true });
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${BH * 2}`, '-r', '24', '-i', '-',
    '-vf', 'scale=1920:1080:flags=neighbor', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', out], { input: Buffer.concat(raw), maxBuffer: 1 << 30 });
  if (r.status) throw Error(String(r.stderr));
  console.log(out);
} else {
  const ts = (arg('at') || '1,4,6,8').split(',').map(Number), out = arg('out') || 'out/check/sprites/demo.png';
  savePng(out, ts.map(frame), +(arg('scale') || 3));
  console.log(out);
}
