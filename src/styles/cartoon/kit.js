// General Canvas2D drawing kit for nature/creature scenes. Pure functions of their arguments; no state between calls.
(() => {
  let c = window.animationEngine.context; const P = STYLE.palette;
  const mids = (pts, closed) => {
    const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) { const s = m(pts[n - 1], pts[0]); c.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const q = m(pts[i], pts[(i + 1) % n]); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } c.closePath(); return; }
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) { const q = m(pts[i], pts[i + 1]); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
    c.lineTo(pts[n - 1][0], pts[n - 1][1]);
  };
  const path = (pts, smooth, closed) => { c.beginPath(); if (smooth && pts.length > 2) mids(pts, closed); else { pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); if (closed) c.closePath(); } };
  const ink = (weight = STYLE.outline.weight) => { c.strokeStyle = P.ink; c.lineWidth = weight; c.lineJoin = c.lineCap = 'round'; c.stroke(); };
  const alpha = (a, fn) => { c.save(); c.globalAlpha = a; try { fn(); } finally { c.restore(); } };
  // Sky (drawAtmosphericSky): gradient and sun halo drawn once per (colours, size) in an offscreen canvas; only the faint
  // sun rays breathe with t (when the caller passes it). SUN is the sun in screen px.
  const SKIES = new Map(), SUN = [.8 * W, .16 * H];
  function skyCanvas(top, bottom) {
    const key = top + bottom + W + 'x' + H; let cv = SKIES.get(key); if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, mixCol(top, P.shade, .25)); gr.addColorStop(.45, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const r = .12 * H, halo = g.createRadialGradient(...SUN, .1 * r, ...SUN, 3 * r);
    halo.addColorStop(0, 'rgba(255,250,220,.95)'); halo.addColorStop(.3, 'rgba(255,224,130,.4)'); halo.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    SKIES.set(key, cv); return cv;
  }
  // Labels queued by text() this frame, drawn by post() over everything in the safe band at the top.
  const LABELS = [];
  window.Kit = {
    // Runs fn with Kit and NatureArt drawing into the context g (offscreen layers), then restores the main one.
    into(g, fn) { const k = c, n = NatureArt.use(g); c = g; try { fn(); } finally { c = k; NatureArt.use(n); } },
    // shake = null | {t, k = 1, seed = 0}: tremor de mão por noise1 (src/nature/noise.js), até 0,3% do quadro com k = 1.
    cam(cx, cy, zoom = 1, rot = 0, shake = null) {
      c.save(); c.translate(W / 2, H / 2);
      if (shake) { const { t, k = 1, seed = 0 } = shake; c.translate(.003 * W * k * noise1(seed, t * .9), .003 * H * k * noise1(seed + 1, t * .8)); }
      c.scale(zoom, zoom); c.rotate(rot); c.translate(-cx, -cy);
    },
    camEnd() { c.restore(); },
    poly(pts, fill, o = {}) {
      const { stroke = true, weight, alpha: a = 1, smooth = false } = o;
      alpha(a, () => { path(pts, smooth, true); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) ink(weight); });
    },
    ellipse(x, y, rx, ry, fill, o = {}) {
      const { stroke = false, rot = 0, alpha: a = 1 } = o;
      alpha(a, () => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) ink(); });
    },
    line(pts, color = P.ink, width = STYLE.outline.weight, o = {}) {
      const { alpha: a = 1, smooth = true } = o;
      alpha(a, () => { path(pts, smooth, false); c.strokeStyle = color; c.lineWidth = width; c.lineJoin = c.lineCap = 'round'; c.stroke(); });
    },
    gradient(top = P.skyTop, bottom = P.skyLow, t = 0) {
      c.drawImage(skyCanvas(top, bottom), 0, 0);
      c.save(); c.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) {  // sun rays, slowly breathing
        const sp = .16 * W, tx = SUN[0] - .35 * W + i * sp + 400 * ((i - 2) * .18 + .02 * Math.sin(t * .3 + i));
        c.fillStyle = `rgba(255,245,200,${.045 + .02 * Math.sin(t * .7 + i * 1.5)})`;
        c.beginPath(); c.moveTo(...SUN); c.lineTo(tx - .4 * sp, H); c.lineTo(tx + .4 * sp, H); c.closePath(); c.fill();
      }
      c.restore();
    },
    // Captions: queued and drawn by post() in a dark rounded box in the top band, where no character passes over them;
    // x and y are kept for the callers and unused. o.plain draws in place as before (emotes).
    text(str, x, y, size, color = P.ink, o = {}) {
      const { k = 1, align = 'center', plain = false } = o, s = backOut(k);
      if (s < .02) return;
      if (!plain) { LABELS.push([str, size, k]); return; }
      c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = clamp(k * 3);
      c.font = `700 ${size}px "Trebuchet MS", sans-serif`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(str, 0, 0); c.restore();
    },
    wipe(p) { if (p > 0) { c.fillStyle = P.ink; c.fillRect(0, 0, W * clamp(p), H); } },
    iris(x, y, r) { c.fillStyle = P.ink; c.beginPath(); c.rect(0, 0, W, H); c.arc(x, y, Math.max(0, r), 0, TAU, true); c.fill('evenodd'); },
    flash(k, color = P.cloud) { if (k > 0) alpha(clamp(k), () => { c.fillStyle = color; c.fillRect(0, 0, W, H); }); },
    vignette(k) {
      if (k <= 0) return;
      const g = c.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, P.ink);
      alpha(clamp(k) * .55, () => { c.fillStyle = g; c.fillRect(0, 0, W, H); });
    },
    // Screen-space finish of every frame (drawPostProcessAtmosphere): pollen and dust drifting by hash (index seeds,
    // positions from t only), a soft vignette, then the queued captions.
    post(t) {
      c.save(); c.resetTransform(); c.globalCompositeOperation = 'screen';
      for (let i = 0; i < 40; i++) {
        const x = frac(hash(i * 3.1) + t * (8 + 6 * hash(i)) / W) * (W + 100) - 50, y = frac(hash(i * 5.3) - t * (5 + 4 * hash(i + 7)) / H) * H + 20 * Math.sin(t * .8 + i);
        const r = 2 + 6 * hash(i * 7.7), a = .12 + .2 * (.5 + .5 * Math.sin(t * 2 + i)), g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,248,210,${a})`); g.addColorStop(1, 'rgba(255,248,210,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      c.globalCompositeOperation = 'multiply';
      const v = c.createRadialGradient(W / 2, H / 2, .38 * H, W / 2, H / 2, .72 * W); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(15,22,30,.38)');
      c.fillStyle = v; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      LABELS.forEach(([str, size, k], i) => {
        const s = backOut(k), y = 110 + i * size * 1.9;
        c.save(); c.translate(W / 2, y); c.scale(s, s); c.globalAlpha = clamp(k * 3);
        c.font = `700 ${size}px "Segoe UI", "Trebuchet MS", sans-serif`; const w = c.measureText(str).width + 1.2 * size, h = 1.5 * size;
        c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, .45 * size); c.fillStyle = 'rgba(16,20,30,.62)'; c.fill();
        c.strokeStyle = 'rgba(255,240,200,.25)'; c.lineWidth = 2; c.stroke();
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P.cloud; c.fillText(str, 0, 0); c.restore();
      });
      LABELS.length = 0; c.restore();
    }
  };
})();
