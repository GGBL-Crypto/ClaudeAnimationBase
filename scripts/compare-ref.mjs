// Style reference vs our frame, side by side at the same height with a 10 % grid, and the look measured in numbers:
// head proportion, outline thickness and saturation. Idea adapted from cth9191/animate (tools/compare.mjs, MIT; see
// docs/CREDITS.md), rewritten for this repo's render.
//   node scripts/compare-ref.mjs --ref=refs/estilo/cartoon_2.png --ref-crop=x,y,w,h --project=modelos --t=0.5
//     --crop=x,y,w,h [--axis=y|x] [--ref-axis=y|x] [--head=0.38] [--ref-head=0.62] --out=out/check/a.jpg
// Each crop must hold one figure on a plain background (the crop's top-left pixel). --axis: y measures the head from
// the top (upright figures); x from the right (a quadruped facing right). --head / --ref-head: the head end read by eye
// (fraction of the figure from the head end), drawn as the cyan line, when the automatic neck misses.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, launchBrowser, closeBrowser, openPage, frameOf } from './render-lib.mjs';

const HH = 720;  // common height of both panels, px

// RGBA pixels (w × h) of one figure on a plain background → {head, neck, outline, outlinePct, saturation, ink, box}.
// Figure: pixels far from the background colour; ink: dark pixels. outline: median length of the ink runs crossed
// by rows and columns (px), and as % of the figure height. saturation: mean HSV saturation of the coloured (non-ink)
// figure pixels, %. head: along the axis from the head end, the first narrowing (neck) after the widest part of the
// first half (the deepest local minimum under 70 % of it,
// within the first 65 %), as a fraction of the figure's extent; neck: that position in px from the crop's start.
export function measure(px, w, h, axis = 'y') {
  const n = w * h, fg = new Uint8Array(n), ink = new Uint8Array(n), [br, bg, bb] = px;
  let x0 = w, y0 = h, x1 = -1, y1 = -1, sat = 0, col = 0, inks = 0;
  for (let i = 0; i < n; i++) {
    const r = px[4 * i], g = px[4 * i + 1], b = px[4 * i + 2];
    if (Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb) <= 80) continue;
    const x = i % w, y = (i - x) / w;
    fg[i] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    if (.3 * r + .59 * g + .11 * b < 70) { ink[i] = 1; inks++; continue; }
    const mx = Math.max(r, g, b); sat += mx ? (mx - Math.min(r, g, b)) / mx : 0; col++;
  }
  if (x1 < 0) throw new Error('Nenhuma figura no recorte: o fundo é a cor do canto superior esquerdo');
  const fh = y1 - y0 + 1, runs = [];
  // Ink runs with non-ink on both sides (an outline crossed), ignoring solid dark masses (> 5 % of the height).
  const scan = (len, at) => { let k = 0; while (k < len) { if (!ink[at(k)]) { k++; continue; } let e = k; while (e < len && ink[at(e)]) e++; if (k > 0 && e < len && e - k <= .05 * fh) runs.push(e - k); k = e; } };
  for (let y = y0; y <= y1; y++) scan(x1 - x0 + 1, k => y * w + x0 + k);
  for (let x = x0; x <= x1; x++) scan(fh, k => (y0 + k) * w + x);
  runs.sort((a, b) => a - b);
  const outline = runs.length ? runs[runs.length >> 1] : 0;
  // Width profile along the axis from the head end, smoothed over ±1.5 % of the extent.
  const along = axis === 'x' ? x1 - x0 + 1 : fh, prof = new Float64Array(along);
  for (let k = 0; k < along; k++) {
    let c = 0;
    if (axis === 'x') for (let y = y0; y <= y1; y++) c += fg[y * w + x1 - k];
    else for (let x = x0; x <= x1; x++) c += fg[(y0 + k) * w + x];
    prof[k] = c;
  }
  const r = Math.max(1, Math.round(.015 * along)), sm = prof.map((_, k) => { let s = 0, m = 0; for (let j = Math.max(0, k - r); j <= Math.min(along - 1, k + r); j++) { s += prof[j]; m++; } return s / m; });
  let top = 0; for (let k = 1; k < along * .5; k++) if (sm[k] > sm[top]) top = k;
  const r2 = Math.max(1, Math.round(.04 * along)); let neck = along;
  for (let k = top + 1; k < along * .65; k++) {
    if (sm[k] > .7 * sm[top] || neck < along && sm[k] >= sm[neck]) continue;  // the deepest narrowing (a hat brim makes a shallow one)
    let low = true; for (let j = Math.max(0, k - r2); j <= Math.min(along - 1, k + r2); j++) if (sm[j] < sm[k]) { low = false; break; }
    if (low) neck = k;
  }
  return { head: neck / along, neck: axis === 'x' ? x1 - neck : y0 + neck, outline, outlinePct: 100 * outline / fh, saturation: col ? 100 * sat / col : 0, ink: 100 * inks / (inks + col), box: [x0, y0, x1, y1] };
}

const box = (s, name) => { const v = String(s || '').split(',').map(Number); if (v.length !== 4 || v.some(x => !Number.isFinite(x)) || v[2] <= 0 || v[3] <= 0) throw new Error(`${name} deve ser x,y,largura,altura`); return v; };
const dataUrl = file => `data:${/\.jpe?g$/i.test(file) ? 'image/jpeg' : 'image/png'};base64,` + readFileSync(file).toString('base64');
const line = m => [`cabeça ${m.head.toFixed(2)}${m.manual ? ' (manual)' : ''} · contorno ${m.outline} px (${m.outlinePct.toFixed(2)} % da altura)`, `saturação ${m.saturation.toFixed(0)} % · tinta ${m.ink.toFixed(0)} %`];

async function main(argv) {
  const args = parseArgs(argv);
  for (const k of ['ref', 'ref-crop', 'project', 'crop', 'out']) if (!args[k]) throw new Error(`Falta --${k}. Uso: node scripts/compare-ref.mjs --ref=<imagem> --ref-crop=x,y,w,h --project=<id> --t=0.5 --crop=x,y,w,h --out=<saída.jpg>`);
  const rc = box(args['ref-crop'], '--ref-crop'), oc = box(args.crop, '--crop'), t = Number(args.t ?? 0);
  const browser = await launchBrowser(args);
  try {
    const page = await openPage(browser, args), frame = 'data:image/png;base64,' + (await frameOf(page, t)).toString('base64');
    // Both crops scaled to the common height, kept on the page for the composite.
    const cells = await page.evaluate(async (srcs, crops, HH) => {
      window.compareCells = await Promise.all(srcs.map(async (src, i) => {
        const img = new Image(); img.src = src; await img.decode();
        const [x, y, w, h] = crops[i], cw = Math.round(w * HH / h), cv = document.createElement('canvas'); cv.width = cw; cv.height = HH;
        const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, x, y, w, h, 0, 0, cw, HH);
        return cv;
      }));
      return window.compareCells.map(cv => ({ w: cv.width, px: Array.from(cv.getContext('2d').getImageData(0, 0, cv.width, HH).data) }));
    }, [dataUrl(args.ref), frame], [rc, oc], HH);
    const axes = [(args['ref-axis'] ?? args.axis) || 'y', args.axis || 'y'];
    const m = cells.map((c, i) => {
      const q = measure(c.px, c.w, HH, axes[i]), k = i ? args.head : args['ref-head'];
      if (k === undefined) return q;
      // Head read by eye (fraction from the head end): the automatic neck misses under hats and on chibi figures.
      const v = Number(k), [x0, y0, x1, y1] = q.box; if (!(v > 0 && v <= 1)) throw new Error(`--${i ? '' : 'ref-'}head deve estar entre 0 e 1`);
      return { ...q, head: v, manual: true, neck: axes[i] === 'x' ? x1 - v * (x1 - x0 + 1) : y0 + v * (y1 - y0 + 1) };
    });
    // Composite: dark board, the two panels, a 10 % grid, the measured neck (cyan) and figure box, numbers below.
    const url = await page.evaluate((m, texts, labels, axes, HH) => {
      const [a, b] = window.compareCells, GAP = 24, HEAD = 44, FOOT = 60, c = document.createElement('canvas');
      c.width = a.width + b.width + GAP * 3; c.height = HEAD + HH + FOOT; const g = c.getContext('2d');
      g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height); g.font = '600 20px sans-serif';
      [[a, GAP], [b, GAP * 2 + a.width]].forEach(([cv, x0], i) => {
        g.drawImage(cv, x0, HEAD); const w = cv.width, [bx0, by0, bx1, by1] = m[i].box;
        g.strokeStyle = 'rgba(255,0,80,.35)'; g.lineWidth = 1; g.beginPath();
        for (let k = 1; k < 10; k++) { g.moveTo(x0 + w * k / 10 + .5, HEAD); g.lineTo(x0 + w * k / 10 + .5, HEAD + HH); g.moveTo(x0, HEAD + HH * k / 10 + .5); g.lineTo(x0 + w, HEAD + HH * k / 10 + .5); }
        g.stroke();
        g.strokeStyle = 'rgba(0,200,255,.9)'; g.lineWidth = 2; g.strokeRect(x0 + bx0, HEAD + by0, bx1 - bx0, by1 - by0); g.beginPath();
        if (axes[i] === 'x') { g.moveTo(x0 + m[i].neck, HEAD + by0); g.lineTo(x0 + m[i].neck, HEAD + by1); } else { g.moveTo(x0 + bx0, HEAD + m[i].neck); g.lineTo(x0 + bx1, HEAD + m[i].neck); }
        g.stroke();
        g.fillStyle = '#ddd'; g.fillText(labels[i], x0, 30); g.font = '15px sans-serif'; texts[i].forEach((s, j) => g.fillText(s, x0, HEAD + HH + 24 + 20 * j)); g.font = '600 20px sans-serif';
      });
      return c.toDataURL('image/jpeg', .92);
    }, m, m.map(line), ['referência', `nosso · ${args.project} t=${t}s`], axes, HH);
    mkdirSync(dirname(resolve(args.out)), { recursive: true });
    writeFileSync(args.out, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    console.log(args.out); console.log('referência:', line(m[0]).join(' · ')); console.log('nosso     :', line(m[1]).join(' · '));
  } finally { await closeBrowser(browser); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });
