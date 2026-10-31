// Folha de conferência dos sprites do boneco do pixel (PIXEL_SPRITES5) em 8×: cada cabelo (e o chapéu sobre o short) numa
// cabeça neutra olhando para a direita e, embaixo, para a esquerda (flipCells da direita, como o boneco faz); cada olho e
// cada boca num rosto; cada mão e a bota. Cabeça da v5 do protótipo em k = 1 (s = 1,25), centro em (.25, .5) do px.
// Uso: node scripts/pixel-sheet.mjs --out=out/check/sprites/sheet.png
import vm from 'node:vm';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { encodeRgb } from './png-rgba.mjs';

const ctx = vm.createContext({ hash: i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }, AnimationPlatform: { registerStyle: s => (ctx.style = s) } });
for (const f of ['config', 'sprites', 'figure']) vm.runInContext(readFileSync(`src/styles/pixel/${f}.js`, 'utf8'), ctx);
vm.runInContext('this.X = { PIXEL_SPRITES5, figureLayer, spritePart, ellipsePart, polyPart, flipCells }', ctx);
const { PIXEL_SPRITES5: S5, figureLayer, spritePart, ellipsePart, polyPart, flipCells } = ctx.X, { ramps, palette: P } = ctx.style.config;
const ink = P.black, opts = { ramps, rim: true, ink }, HEAD = { W: 32, H: 38, OX: 15, OY: 20 }, SMALL = { W: 32, H: 16, OX: 15, OY: 8 };
const HAIR_MAT = { hood: 'blue', helmet: 'grey' };

// Cabeça neutra com cabelo, orelha (o capuz cobre) e chapéu opcional; rosto pintado por cima como o protótipo (paintFace).
function head(hair, { eye = 'neutral', mouth = 'm', hat = false } = {}) {
  const c = [.25, .5], at = (dx, dy) => [c[0] + dx, c[1] + dy], mat = HAIR_MAT[hair] || 'hairBrown';
  const parts = [polyPart([[-7, 7.5], [5.25, 7.5], [7, 11.75], [6.5, 17], [-6.5, 17], [-7.75, 11.75]], 2.75, 'blue'),
    ellipsePart(c, 9.75, 9.5, 'skinM', { g: 'head' }), ellipsePart(at(2, 4.25), 7.75, 5.875, 'skinM', { g: 'head' }), ellipsePart(at(9.25, 2.25), 1.5, 1.375, 'skinM', { g: 'head' }),
    spritePart(c, S5.hair[hair], mat), ...(hair === 'hood' ? [] : [spritePart(at(-4, 2.25), S5.ear, 'skinM', { g: 'head' })]), ...(hat ? [spritePart(c, S5.hat, 'leather')] : [])];
  const L = figureLayer(parts, HEAD, opts), F = S5.eyes[eye], dy = F.dy || 0;
  const col = { K: ink, W: P.cream4, B: ramps[mat][0], S: ramps.skinM[1], T: P.red3, P: P.blush };
  const stamp = (rows, x, y) => rows.forEach((r, j) => [...r].forEach((ch, i) => { const gx = Math.floor(x) + i + HEAD.OX, gy = Math.floor(y) + j + HEAD.OY; if (col[ch]) L.cells[gy * HEAD.W + gx] = col[ch]; }));
  const [hx, hy] = c;
  stamp(F.near, hx + 2.4, hy + dy); stamp(F.far, hx + 7.2, hy + dy);
  stamp(['BBB'], hx + 2.4, hy - 2 + F.brow); stamp(['B'], hx + 7.2, hy - 2 + F.brow);
  if (F.blush) { stamp(['PP'], hx + 1.6, hy + 5); stamp(['P'], hx + 8.2, hy + 5); }
  const M = S5.mouths[mouth]; stamp(M, hx + (M[0].length > 2 ? 3.5 : 4.5) + .6, hy + 4.5 + .5);
  return L;
}
const piece = (s, mat) => figureLayer([spritePart([0, 0], s, mat)], SMALL, opts);

const hairs = Object.keys(S5.hair), right = [...hairs.map(h => head(h)), head('short', { hat: true })];
const rows = [right, right.map(flipCells), Object.keys(S5.eyes).map(e => head('short', { eye: e })), Object.keys(S5.mouths).map(m => head('short', { mouth: m })),
  [...Object.values(S5.hands).map(s => piece(s, 'skinM')), piece(S5.boot, 'leather')]];
// Grade: células lado a lado com 1 px de vão, fundo claro; depois amplia 8×.
const Z = 8, GAP = 1, BG = [0xb1, 0xd9, 0xe8], SEP = [0x93, 0xb8, 0xc6], cw = 32 + GAP;
const GW = Math.max(...rows.map(r => r.length)) * cw + GAP, GH = rows.reduce((s, r) => s + r[0].H + GAP, GAP);
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), grid = Array.from({ length: GW * GH }, () => SEP);
let y0 = GAP;
for (const r of rows) {
  r.forEach((L, i) => { for (let k = 0; k < L.W * L.H; k++) grid[(y0 + (k / L.W | 0)) * GW + GAP + i * cw + k % L.W] = L.cells[k] ? rgb(L.cells[k]) : BG; });
  y0 += r[0].H + GAP;
}
const W = GW * Z, H = GH * Z, buf = new Uint8Array(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) buf.set(grid[(y / Z | 0) * GW + (x / Z | 0)], (y * W + x) * 3);
const out = (process.argv.find(a => a.startsWith('--out=')) || '--out=out/check/sprites/sheet.png').slice(6);
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, encodeRgb(W, H, buf));
console.log(out);
