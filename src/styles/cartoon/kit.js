// General Canvas2D drawing kit for nature/creature scenes. Pure functions of their arguments; no state between calls.
(() => {
  const c = window.animationEngine.context, P = STYLE.palette;
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
  window.Kit = {
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
    gradient(top = P.skyTop, bottom = P.skyLow) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, W, H); },
    text(str, x, y, size, color = P.ink, o = {}) {
      const { k = 1, align = 'center' } = o, s = backOut(k);
      if (s < .02) return;
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
    }
  };
})();
