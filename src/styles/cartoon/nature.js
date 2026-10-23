// Cartoon NatureArt: creatures drawn from creaturePose (src/nature/creature.js) and environment pieces. Pure functions of
// their arguments; no state between calls. Creatures: far limbs, body (one inked silhouette), near limbs, then the
// species decorator (NatureArt.decor[spec]) adds faces, fins, wings and markings. Below 28 px a flat simplified form.
(() => {
  const c = window.animationEngine.context, P = STYLE.palette, PI2 = Math.PI / 2;
  const dark = (col, k = .3) => mixCol(col, P.ink, k);
  // Warm side light from the upper left (LX, LY points at it): every shape gets a lit rim there, its base colour and a
  // shadow band on the far side. Outlines are the dark tone of their own fill, never plain ink.
  const LX = -.6, LY = -.8, lit = col => mixCol(col, P.sun, .4), shd = col => mixCol(col, P.shade, .3), edge = col => mixCol(col, P.ink, .6);
  const pale = col => mixCol(col, P.skyLow, .4);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // Tapered bone: half circles around b (radius rb) and a (radius ra), joined by their tangents.
  function bone(a, ra, b, rb) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    c.moveTo(b[0] + rb * Math.cos(ang - PI2), b[1] + rb * Math.sin(ang - PI2));
    c.arc(b[0], b[1], rb, ang - PI2, ang + PI2); c.arc(a[0], a[1], ra, ang + PI2, ang + 3 * PI2); c.closePath();
  }
  // Adds one part to the current path: ellipse {e}, bone {b} or polygon {poly} (smooth: curves through midpoints).
  function shape(p, e) {
    if (p.e) { const [x, y, rx, ry, rot = 0] = p.e, a = Math.max(.1, rx + e), b = Math.max(.1, ry + e); c.moveTo(x + a * Math.cos(rot), y + a * Math.sin(rot)); c.ellipse(x, y, a, b, rot, 0, TAU); }
    else if (p.b) bone(p.b[0], Math.max(.1, p.b[1] + e), p.b[2], Math.max(.1, p.b[3] + e));
    else if (p.smooth) { const q = wound(shrunk(p, e)), n = q.length, m = i => [(q[i % n][0] + q[(i + 1) % n][0]) / 2, (q[i % n][1] + q[(i + 1) % n][1]) / 2]; c.moveTo(...m(n - 1)); for (let i = 0; i < n; i++) c.quadraticCurveTo(q[i][0], q[i][1], ...m(i)); c.closePath(); }
    else { const q = wound(shrunk(p, e)); c.moveTo(q[0][0], q[0][1]); q.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); }
  }
  // Polygon points pulled toward their centroid so the thinnest side moves in by about -e px (e < 0 only).
  const shrunk = (p, e) => { if (e >= 0) return p.poly; const q = p.poly, n = q.length, k = Math.max(0, 1 + e / thick(p)), x = q.reduce((s, v) => s + v[0], 0) / n, y = q.reduce((s, v) => s + v[1], 0) / n; return q.map(([u, v]) => [x + (u - x) * k, y + (v - y) * k]); };
  // Polygons turn the same way as arcs (mirroring flips them), so overlapping parts never cancel in a nonzero union.
  const wound = q => q.reduce((s, [x, y], i) => s + x * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * y, 0) < 0 ? [...q].reverse() : q;
  const trace = (p, e) => { c.beginPath(); shape(p, e); };
  // Thickness of a part (px): sets how far its light and shadow bands reach.
  const thick = p => { if (p.e) return Math.min(p.e[2], p.e[3]); if (p.b) return (p.b[1] + p.b[3]) / 2; const xs = p.poly.map(q => q[0]), ys = p.poly.map(q => q[1]); return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2; };
  // Each part moved by k times its thickness toward the light (k < 0: away from it).
  const moved = (list, R, k, fn) => list.forEach((p, i) => { c.save(); c.translate(LX * k * R[i], LY * k * R[i]); fn(p, i); c.restore(); });
  // Parts share one silhouette: every outline (inflated by lw, in the fill's dark tone) first, then the fills, pass by
  // pass so seams inside the silhouette stay hidden: lit tone everywhere; shadow tone on each part moved away from the
  // light (leaves the lit rim); base tone on each part moved toward the light (leaves the shadow band). Ellipses and
  // bones (and convex polygons, pulled toward their centroid) shrink by more than they move, so every layer stays inside
  // its part without clipping (clips are slow on the GPU canvas); concave parts clip to the silhouette instead. Thin forms stay flat.
  function parts(list, lw) {
    c.lineWidth = 2 * lw; c.lineJoin = 'round';
    if (lw > 0) for (const p of list) { c.fillStyle = c.strokeStyle = edge(p.fill); trace(p, p.poly ? 0 : lw); if (p.poly) c.stroke(); else c.fill(); }
    const R = list.map(thick);
    if (Math.max(...R) < 5) { for (const p of list) { trace(p, 0); c.fillStyle = p.fill; c.fill(); } return; }
    if (!list.some(p => p.concave)) {
      for (const p of list) { trace(p, 0); c.fillStyle = lit(p.fill); c.fill(); }
      moved(list, R, -.07, (p, i) => { trace(p, (p.poly ? -.12 : -.08) * R[i]); c.fillStyle = shd(p.fill); c.fill(); });
      moved(list, R, .18, (p, i) => { trace(p, (p.poly ? -.4 : -.32) * R[i]); c.fillStyle = p.fill; c.fill(); });
      return;
    }
    c.save(); c.beginPath(); for (const p of list) shape(p, 0); c.clip();
    for (const p of list) { trace(p, 0); c.fillStyle = lit(p.fill); c.fill(); }
    moved(list, R, -.16, p => { trace(p, 0); c.fillStyle = shd(p.fill); c.fill(); });
    c.beginPath(); moved(list, R, -.16, p => shape(p, 0)); c.clip();
    moved(list, R, .42, p => { trace(p, 0); c.fillStyle = p.fill; c.fill(); });
    c.restore();
  }
  // Short crease across the a→b line at fraction k (clothing folds, cuffs): half length len px, slightly curved.
  function crease(a, b, k, len, col, w, bow = .35) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(ang), ny = Math.cos(ang), x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k);
    const dx = Math.cos(ang) * len * bow;
    stroke([[x - nx * len, y - ny * len], [x + dx, y + Math.sin(ang) * len * bow], [x + nx * len, y + ny * len]], w, col);
  }
  // Small glossy highlight (chitin, eyes, wet noses) toward the light from (x, y).
  const gloss = (x, y, r, a = .75) => { c.save(); c.globalAlpha = a; c.beginPath(); c.ellipse(x + LX * r * .9, y + LY * r * .9, r * .5, r * .26, Math.atan2(LY, LX) + PI2, 0, TAU); c.fillStyle = P.eye; c.fill(); c.restore(); };
  // Chain of points as tapered bones, radius r0 at the base down to r1 at the tip.
  const chainParts = (pts, r0, r1, fill) => pts.slice(1).map((q, i) => ({ b: [pts[i], lerp(r0, r1, i / (pts.length - 1)), q, lerp(r0, r1, (i + 1) / (pts.length - 1))], fill }));
  const limbParts = (l, w, fill) => [{ b: [l.root, w[0], l.mid, w[1]], fill }, { b: [l.mid, w[1], l.end, w[2]], fill }];
  const clipTo = (list, fn) => { c.save(); c.beginPath(); for (const p of list) shape(p, 0); c.clip(); try { fn(); } finally { c.restore(); } };
  const stroke = (pts, w, col = P.ink, smooth = true) => Kit.line(pts, col, w, { smooth });
  const dot = (x, y, r, col) => { c.beginPath(); c.ellipse(x, y, r, r, 0, 0, TAU); c.fillStyle = col; c.fill(); };

  // Local frame (units of BL, +x forward; +y down in side view, to the creature's right in top view) around (x, y).
  function frame(p, x, y, a) {
    const S = p.size, side = p.view === 'side', f = side ? p.facing : 1, r = side ? (f > 0 ? a : Math.PI - a) : a, co = Math.cos(r), si = Math.sin(r);
    return (dx, dy) => [x + f * (dx * co - dy * si) * S, y + (dx * si + dy * co) * S];
  }
  const headFrame = p => frame(p, p.head.x, p.head.y, p.head.angle);
  const segFrame = (p, i) => { const g = p.spine[i]; return frame(p, g.x, g.y, p.view === 'side' ? (p.facing > 0 ? g.angle : Math.PI - g.angle) : g.angle); };
  const spineParts = (p, fill, stretch = 1.3) => p.spine.map((g, i) => ({ e: [g.x, g.y, g.r * (Array.isArray(stretch) ? stretch[i] : stretch), g.r, g.angle], fill }));
  const headR = p => SPECS[p.spec].head.r * p.size;
  // Appendage points are far (behind the body) when their side faces away from the camera in side view.
  const far = (p, name) => { const ap = SPECS[p.spec].appendages.find(a => a.name === name); return p.view === 'side' && (ap.side || 0) * p.facing < 0; };

  // Human eyes, brows and mouth per expression. lid: open fraction; brow [inner, outer] dy; mouth [kind, curve].
  const FACES = {
    neutral: { eye: 'dot', lid: 1, brow: [0, 0], mouth: ['line', 0] },
    happy: { eye: 'arc', lid: 1, brow: [-.012, -.008], mouth: ['smile', .022] },
    sad: { eye: 'dot', lid: .7, look: .006, brow: [-.016, .006], mouth: ['line', -.014] },
    scared: { eye: 'wide', lid: 1, brow: [-.026, -.006], mouth: ['wavy', 0] },
    angry: { eye: 'dot', lid: .65, slant: 1, brow: [.014, -.012], mouth: ['line', -.01] },
    surprised: { eye: 'wide', lid: 1, brow: [-.032, -.03], mouth: ['o', 0] },
    tired: { eye: 'dot', lid: .4, brow: [.002, .01], mouth: ['line', -.004] },
    dead: { eye: 'x', lid: 1, brow: null, mouth: ['wavy', 0] },
  };
  // Profile face: one eye, brow, mouth and blush toward the front of the head (R = head radius in BL).
  function humanFace(p, L, hf, R) {
    const F = FACES[p.face.expression] || FACES.neutral, S = p.size, w = Math.max(1.5, .007 * S), ink = edge(L.skin), wide = F.eye === 'wide', lid = F.lid * (1 - (p.face.blink || 0));
    const pt = (dx, dy) => hf(.52 * R + dx, -.1 * R + dy), rx = .13 * R * S, ry = (wide ? .27 : .22) * R * S, top = -(wide ? .27 : .22) * R;
    const [bx, by] = hf(.42 * R, .3 * R); c.save(); c.globalAlpha = .35; c.beginPath(); c.ellipse(bx, by, .17 * R * S, .1 * R * S, 0, 0, TAU); c.fillStyle = P.blush; c.fill(); c.restore();
    if (F.eye === 'x') { stroke([pt(-.12 * R, -.12 * R), pt(.12 * R, .12 * R)], w, P.ink, false); stroke([pt(-.12 * R, .12 * R), pt(.12 * R, -.12 * R)], w, P.ink, false); }
    else if (F.eye === 'arc') stroke([pt(-.15 * R, .06 * R), pt(0, -.12 * R), pt(.15 * R, .06 * R)], w * 1.2, P.ink);
    else {
      const [x, y] = pt(0, 0); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = P.eye; c.fill(); c.strokeStyle = ink; c.lineWidth = w * .6; c.stroke();
      const [px, py] = pt(.05 * R, .03 * R + (F.look || 0)); dot(px, py, (wide ? .075 : .1) * R * S, P.ink); dot(px - .03 * R * S, py - .04 * R * S, .03 * R * S, P.eye);
      if (lid < 1) {  // upper lid in skin, slanting down toward the nose when angry
        const yIn = top + (1 - lid) * -2 * top + (F.slant ? .08 * R : 0), yOut = top + (1 - lid) * -2 * top - (F.slant ? .08 * R : 0), a = pt(.2 * R, yIn), b = pt(-.2 * R, yOut);
        c.save(); c.beginPath(); c.ellipse(x, y, rx + w * .3, ry + w * .3, 0, 0, TAU); c.clip();
        c.beginPath(); c.moveTo(...pt(.3 * R, top - .1 * R)); c.lineTo(...pt(-.3 * R, top - .1 * R)); c.lineTo(...b); c.lineTo(...a); c.closePath(); c.fillStyle = L.skin; c.fill(); c.restore();
        stroke([a, b], w, ink, false);
      }
    }
    if (F.brow) stroke([pt(-.2 * R, top - .12 * R + F.brow[1]), pt(.2 * R, top - .12 * R + F.brow[0])], w * 1.3, edge(L.hair), false);
    const [kind, k] = F.mouth, m = (dx, dy) => hf(.6 * R + dx, .5 * R + dy);
    if (kind === 'o') { const [x, y] = m(0, .004); c.beginPath(); c.ellipse(x, y, .09 * R * S, .14 * R * S, 0, 0, TAU); c.fillStyle = ink; c.fill(); }
    else if (kind === 'wavy') stroke([m(-.14 * R, 0), m(-.07 * R, -.05 * R), m(0, 0), m(.07 * R, -.05 * R), m(.14 * R, 0)], w, ink, false);
    else if (kind === 'smile') { c.beginPath(); c.moveTo(...m(-.15 * R, -.004)); c.quadraticCurveTo(...m(0, 2 * k), ...m(.17 * R, -.004)); c.closePath(); c.fillStyle = ink; c.fill(); }
    else stroke([m(-.13 * R, -k), m(0, k), m(.13 * R, -k)], w, ink);
  }

  // Species decorators. look: default colors and limb widths (BL). legsBehind: near feet go behind the body (human hem;
  // ant and spider, so head, thorax and abdomen read clearly).
  // body(p, L) returns the silhouette parts; back/front draw behind the body and over everything.
  const decor = {
    human: {
      look: { color: P.cloth, skin: P.skin, hair: P.hair, shirt: P.cloth, pants: P.clothDk, legs: [.052, .04, .032], arms: [.032, .027, .023] },
      legsBehind: true, headScale: 1.4,
      limb(p, L, l, name, isFar) {
        const k = isFar ? .28 : 0, S = p.size, f = p.facing;
        if (name.startsWith('leg')) {
          const w = L.legs.map(v => v * S), q = (dx, dy) => [l.end[0] + f * dx * S, l.end[1] + dy * S], shoe = mixCol(P.wood, P.ink, .45 + k), a = q(0, -.05);
          const d = Math.atan2(a[1] - l.mid[1], a[0] - l.mid[0]), hem = (along, side) => [a[0] + Math.cos(d) * along * S - Math.sin(d) * side * w[2], a[1] + Math.sin(d) * along * S + Math.cos(d) * side * w[2]];
          return [[{ smooth: true, poly: [q(-.034, .002), q(.072, .002), q(.08, -.014), q(.05, -.034), q(.008, -.046), q(-.036, -.036)], fill: shoe },  // shoe, then the trouser with its hem over it
            { poly: [q(-.03, .002), q(.074, .002), q(.074, -.008), q(-.03, -.008)], fill: dark(shoe, .45) }],
            [{ b: [l.root, w[0], l.mid, w[1]], fill: dark(L.pants, k) }, { b: [l.mid, w[1], hem(-.04, 0), w[2] * 1.05], fill: dark(L.pants, k) },
              { poly: [hem(.015, 1.3), hem(.015, -1.3), hem(-.06, -1.08), hem(-.06, 1.08)], fill: dark(L.pants, k) }]];  // flat, flared hem
        }
        const w = L.arms.map(v => v * S);
        return [{ b: [l.root, w[0], l.mid, w[1]], fill: dark(L.shirt, k) }, { b: [l.mid, w[1], l.end, w[2]], fill: dark(L.skin, k) }, { e: [l.end[0], l.end[1], .028 * S, .028 * S], fill: dark(L.skin, k) }];
      },
      // Folds: knee creases and the trouser hem; the sleeve cuff above the elbow.
      detail(p, L, l, name, isFar) {
        const S = p.size, w = clamp(.006 * S, 1, 3.5), k = isFar ? .28 : 0;
        if (S < 60) return;
        if (name.startsWith('leg')) { const col = edge(dark(L.pants, k)), hem = [l.end[0], l.end[1] - .05 * S]; crease(l.mid, l.root, .12, .02 * S, col, w); crease(l.mid, hem, .2, .018 * S, col, w); crease(l.mid, hem, .88, .036 * S, col, w, .1); }
        else crease(l.root, l.mid, .85, .028 * S, edge(dark(L.shirt, k)), w, .15);
      },
      body(p, L) {
        const S = p.size, [ch, pe] = p.spine, hf = headFrame(p), r = headR(p) * this.headScale, R = r / S;
        return [
          { e: [pe.x, pe.y, .072 * S, .072 * S], fill: L.pants },
          { b: [[ch.x, ch.y - .1 * S], .032 * S, [p.head.x, p.head.y], .032 * S], fill: L.skin },
          { b: [[ch.x, ch.y - .06 * S], .09 * S, [pe.x, pe.y - .03 * S], .076 * S], fill: L.shirt },
          { e: [...hf(.98 * R, .05 * R), .17 * R * S, .14 * R * S], fill: L.skin },
          { e: [...hf(.4 * R, .45 * R), .48 * R * S, .42 * R * S], fill: L.skin },
          { e: [p.head.x, p.head.y, r * .94, r, 0], fill: L.skin },
        ];
      },
      back(p, L) { const h = p.appendages.hair; if (h) parts(chainParts(h, .036 * p.size, .018 * p.size, L.hair), lw(p)); },
      // Shirt folds and hem, over the body and under the near arm.
      over(p, L) {
        const S = p.size, [ch, pe] = p.spine, fw = clamp(.006 * S, 1, 3.5);
        if (S >= 60) clipTo([{ b: [[ch.x, ch.y - .06 * S], .09 * S, [pe.x, pe.y - .03 * S], .076 * S] }], () => {
          const col = edge(L.shirt), q = (dx, dy) => [pe.x + p.facing * dx * S, pe.y + dy * S];
          stroke([q(-.08, .035), q(0, .05), q(.08, .035)], fw * 1.2, col); stroke([q(.02, -.02), q(.045, .01)], fw, col); stroke([q(-.03, -.05), q(-.01, -.015)], fw, col);
        });
      },
      front(p, L) {
        const S = p.size, hf = headFrame(p), r = headR(p) * this.headScale, R = r / S, w = lw(p), fw = clamp(.006 * S, 1, 3.5);
        // Hair cap: volume over the crown and the back of the head, hairline with two bangs over the forehead.
        const cap = [[-1.1, .4], [-1.2, -.3], [-.85, -.98], [-.1, -1.2], [.66, -1.02], [1.04, -.46], [.86, -.3], [.6, -.52], [.36, -.36], [.1, -.56], [-.22, -.34], [-.42, .1], [-.66, .62], [-1, .66]];
        parts([{ smooth: true, concave: true, poly: cap.map(([x, y]) => hf(x * R, y * R)), fill: L.hair }], w);
        if (S >= 60) for (const [a, b] of [[[-.7, -.7], [-.95, .1]], [[-.2, -.95], [-.55, -.45]]]) stroke([hf(a[0] * R, a[1] * R), hf(lerp(a[0], b[0], .5) * R - .05 * R, lerp(a[1], b[1], .5) * R), hf(b[0] * R, b[1] * R)], fw, edge(L.hair));
        parts([{ e: [...hf(-.3 * R, .14 * R), .17 * R * S, .24 * R * S], fill: L.skin }], w * .6);  // ear
        if (S >= 60) stroke([hf(-.26 * R, .06 * R), hf(-.36 * R, .14 * R), hf(-.28 * R, .24 * R)], fw, edge(L.skin));
        humanFace(p, L, hf, R);
      },
    },
    dog: {
      look: { color: P.fur, dark: P.furDk, limb: [.048, .034, .03] },
      limb(p, L, l, name, isFar) {
        const col = isFar ? L.dark : L.color, w = L.limb.map(v => v * p.size), f = p.view === 'side' ? p.facing : 0;
        return [...(f ? limbParts(l, w, col) : [{ b: [l.root, w[0], l.end, w[2]], fill: col }]), { e: [l.end[0] + f * .02 * p.size, l.end[1] - .012 * p.size, .045 * p.size, .028 * p.size], fill: col }]; },
      body(p, L) {
        const hf = headFrame(p), S = p.size, top = p.view !== 'side';
        return [
          { b: [[p.spine.at(-1).x, p.spine.at(-1).y], .13 * S, [p.spine[0].x, p.spine[0].y], .14 * S], fill: L.color },
          ...spineParts(p, L.color, 1.25),
          { b: [[p.spine[0].x, p.spine[0].y], .1 * S, [p.head.x, p.head.y], .075 * S], fill: L.color },
          { e: [p.head.x, p.head.y, .12 * S, (top ? .09 : .105) * S, p.head.angle], fill: L.color },
          { b: [hf(.05, top ? 0 : .025), .07 * S, hf(.2, top ? 0 : .045), .052 * S], fill: L.color },
        ];
      },
      back(p, L) {
        const S = p.size, w = lw(p), A = p.appendages;
        parts(chainParts(A.tail, .035 * S, .014 * S, L.color), w);
        for (const e of ['earL', 'earR']) if (p.view === 'top' || far(p, e)) parts(chainParts(A[e], .04 * S, .028 * S, L.dark), w);
      },
      front(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side', body = this.body(p, L).slice(0, 4);
        clipTo(body, () => { const g = p.spine[1], f = segFrame(p, 1); c.globalAlpha = .65; c.beginPath(); c.ellipse(...f(-.05, top ? 0 : -.13), .24 * S, .12 * S, g.angle, 0, TAU); c.fillStyle = L.dark; c.fill(); });  // saddle
        const nose = hf(.205, top ? 0 : .02); dot(nose[0], nose[1], .03 * S, edge(L.dark)); gloss(nose[0], nose[1], .02 * S, .6);
        for (const side of top ? [-1, 1] : [1]) { const [x, y] = hf(.05, top ? .055 * side : -.035); if (p.face.blink > .5) stroke([[x - .022 * S, y], [x + .022 * S, y]], Math.max(1.5, .008 * S)); else { dot(x, y, .02 * S, P.ink); dot(x + .006 * S, y - .007 * S, .007 * S, P.eye); } }
        if (!top) { stroke([hf(.2, .07), hf(.13, .075)], Math.max(1.5, .008 * S), edge(L.color)); for (const e of ['earL', 'earR']) if (!far(p, e)) parts(chainParts(p.appendages[e], .04 * S, .028 * S, L.dark), lw(p)); }
      },
    },
    ant: {
      // Head, thorax and gaster are separate inked forms joined by a thin neck and the petiole node, with chitin gloss.
      // Far legs and antennae are thinner and paler so the side view does not tangle.
      look: { color: P.chitin, dark: P.chitinDk, limb: [.022, .016, .012] }, legsBehind: true,
      limb(p, L, l, name, isFar) { return limbParts(l, L.limb.map(v => v * p.size * (isFar ? .7 : 1)), isFar ? pale(L.color) : L.color); },
      body(p, L) {
        const S = p.size, hf = headFrame(p), f = segFrame(p, 0), top = p.view !== 'side', [th, pe] = p.spine, sp = spineParts(p, L.color, [1.45, 1.2, 1.25]);
        const spines = top ? [-1, 1].map(s => ({ b: [f(-.05, .03 * s), .014 * S, f(-.11, .06 * s), .003 * S], fill: L.color })) : [{ b: [f(-.05, -.04), .016 * S, f(-.1, -.1), .003 * S], fill: L.color }];
        return [[sp[2]], [{ b: [[pe.x, pe.y], .014 * S, [th.x, th.y], .014 * S], fill: L.dark }, { e: [pe.x, pe.y - (top ? 0 : .025 * S), .03 * S, .04 * S, pe.angle], fill: L.color }],
          [...spines, sp[0]], [{ b: [[th.x, th.y], .016 * S, [p.head.x, p.head.y], .016 * S], fill: L.dark }],
          [{ e: [p.head.x, p.head.y, .095 * S, (top ? .085 : .078) * S, p.head.angle], fill: L.color },
            ...(top ? [-1, 1].map(s => ({ b: [hf(.07, .035 * s), .02 * S, hf(.14, .012 * s), .007 * S], fill: L.dark })) : [{ b: [hf(.07, .035), .02 * S, hf(.145, .055), .007 * S], fill: L.dark }])]];
      },
      back(p, L) { for (const a of ['antennaL', 'antennaR']) if (far(p, a)) stroke(p.appendages[a], Math.max(1, .011 * p.size), pale(L.color), false); },
      front(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side';
        for (const a of ['antennaL', 'antennaR']) if (!far(p, a)) stroke(p.appendages[a], Math.max(1.5, .016 * p.size), edge(L.color), false);
        for (const s of top ? [-1, 1] : [0]) { const [x, y] = hf(top ? .01 : .025, top ? .07 * s : -.02); c.beginPath(); c.ellipse(x, y, .026 * S, .02 * S, p.head.angle, 0, TAU); c.fillStyle = P.ink; c.fill(); dot(x + .006 * S, y - .006 * S, .006 * S, P.eye); }
        clipTo(spineParts(p, 0, [1.45, 1.2, 1.25]).slice(2), () => { const f = segFrame(p, 2); for (const k of [-.05, .04]) stroke([f(k, -.2), f(k - .03, .2)], Math.max(1.5, .012 * S), edge(L.color), false); });  // gaster bands
        if (S >= 40) { const [th, , ga] = p.spine; gloss(p.head.x, p.head.y, .06 * S); gloss(th.x, th.y, .06 * S); gloss(ga.x, ga.y, .1 * S); }
      },
    },
    spider: {
      look: { color: P.wood, dark: mixCol(P.wood, P.ink, .4), limb: [.034, .026, .016] }, legsBehind: true,
      limb(p, L, l, name, isFar) { return limbParts(l, L.limb.map(v => v * p.size * (isFar ? .7 : 1)), isFar ? pale(L.color) : L.color); },
      // Abdomen, cephalothorax and the head bump with its fangs are three inked forms.
      body(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side', sp = spineParts(p, L.color, [1.15, 1.2]);
        return [[sp[1]], [sp[0]], [{ e: [p.head.x, p.head.y, .09 * S, .08 * S, p.head.angle], fill: L.color },
          ...(top ? [-1, 1].map(s => ({ b: [hf(.06, .03 * s), .025 * S, hf(.11, .03 * s), .012 * S], fill: L.dark })) : [{ b: [hf(.05, .03), .028 * S, hf(.09, .09), .012 * S], fill: L.dark }])]];
      },
      back(p, L) { for (const a of ['palpL', 'palpR']) if (far(p, a)) parts(chainParts(p.appendages[a], .016 * p.size, .011 * p.size, pale(L.color)), lw(p) * .7); },
      front(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side', ab = spineParts(p, 0, [1.15, 1.2])[1];
        clipTo([ab], () => { const f = segFrame(p, 1); c.beginPath(); for (const k of [0, .09, .18]) { c.moveTo(...f(.05 - k, top ? -.09 : -.24)); c.lineTo(...f(-.03 - k, top ? 0 : -.15)); c.lineTo(...f(.05 - k, top ? .09 : -.24 + .18)); } c.strokeStyle = L.dark; c.lineWidth = .025 * S; c.lineCap = 'round'; c.stroke(); });
        for (const a of ['palpL', 'palpR']) if (!far(p, a)) parts(chainParts(p.appendages[a], .022 * S, .016 * S, L.color), lw(p));
        const eyes = top ? [[.07, -.03, .022], [.07, .03, .022], [.045, -.06, .013], [.045, .06, .013], [.025, -.035, .012], [.025, .035, .012]] : [[.06, -.035, .024], [.02, -.06, .015], [.045, -.065, .013]];
        for (const [dx, dy, r] of eyes) { const [x, y] = hf(dx, dy); dot(x, y, r * S, P.ink); dot(x + .3 * r * S, y - .3 * r * S, .35 * r * S, P.eye); }
        if (S >= 40) { const [ce, abd] = p.spine; gloss(ce.x, ce.y, .1 * S); gloss(abd.x, abd.y, .16 * S); }
      },
    },
    bird: {
      look: { color: P.cloth, dark: P.clothDk, belly: P.cloud, beak: P.wing, limb: [.018, .014, .012] },
      limb(p, L, l, name, isFar) {
        const w = L.limb.map(v => v * p.size), col = isFar ? dark(L.beak) : L.beak, f = p.view === 'side' ? p.facing : 1, S = p.size;
        return [...limbParts(l, w, col), { b: [l.end, w[2], [l.end[0] + f * .07 * S, l.end[1]], w[2] * .8], fill: col }, { b: [l.end, w[2], [l.end[0] - f * .04 * S, l.end[1]], w[2] * .8], fill: col }];
      },
      body(p, L) {
        const S = p.size, hf = headFrame(p);
        return [{ b: [[p.spine[0].x, p.spine[0].y], .12 * S, [p.head.x, p.head.y], .08 * S], fill: L.color }, ...spineParts(p, L.color, [1.2, 1.3]),
          { e: [p.head.x, p.head.y, .1 * S, .1 * S], fill: L.color }, { poly: [hf(.07, -.035), hf(.2, .005), hf(.07, .035)], fill: L.beak }];
      },
      // Wing as a tapered bone from the shoulder: folded along the back, or flapping by wings.phase.
      wing(p, L, s, fill) {
        const S = p.size, f = segFrame(p, 0), w = p.wings, top = p.view !== 'side', fl = Math.sin(TAU * (w ? w.phase : 0));
        const tip = w && w.open ? (top ? f(-.12, s * .5 * (.35 + .65 * Math.abs(Math.cos(TAU * w.phase)))) : f(-.15, -.45 * fl + .05)) : top ? f(-.3, s * .1) : f(-.32, -.02);
        parts([{ b: [top ? f(.02, s * .1) : f(.05, -.04), .09 * S, tip, .035 * S], fill }], lw(p));
      },
      back(p, L) {
        const S = p.size, t = p.appendages.tail, [a, b] = t, ang = Math.atan2(b[1] - a[1], b[0] - a[0]), n = [-Math.sin(ang), Math.cos(ang)];
        parts([{ poly: [[a[0] + n[0] * .03 * S, a[1] + n[1] * .03 * S], [b[0] + n[0] * .06 * S, b[1] + n[1] * .06 * S], [b[0] - n[0] * .06 * S, b[1] - n[1] * .06 * S], [a[0] - n[0] * .03 * S, a[1] - n[1] * .03 * S]], fill: L.dark }], lw(p));
        if (p.view === 'side' && p.wings && p.wings.open) this.wing(p, L, -1, dark(L.dark));
      },
      front(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side';
        if (!top) clipTo([spineParts(p, 0, [1.2, 1.3])[0]], () => { c.beginPath(); c.ellipse(...segFrame(p, 0)(.06, .1), .14 * S, .1 * S, 0, 0, TAU); c.fillStyle = L.belly; c.fill(); });
        for (const s of top ? [-1, 1] : [1]) this.wing(p, L, s, L.dark);
        for (const s of top ? [-1, 1] : [0]) { const [x, y] = hf(.04, top ? .06 * s : -.025); dot(x, y, .022 * S, P.ink); dot(x + .007 * S, y - .007 * S, .007 * S, P.eye); }
      },
    },
    fish: {
      look: { color: P.wing, dark: mixCol(P.wing, P.wingAccent, .45), fin: P.wingAccent },
      // One smooth outline from the snout around the spine radii to the tail; narrower from above.
      body(p, L) {
        const hf = headFrame(p), k = p.view === 'side' ? 1 : .6, S = p.size, n = p.spine.length;
        const edge = s => p.spine.map((g, i) => segFrame(p, i)(0, s * k * g.r / S));
        return [{ smooth: true, poly: [hf(.14, 0), hf(.06, -.09 * k), ...edge(-1), segFrame(p, n - 1)(-.05, 0), ...edge(1).reverse(), hf(.06, .09 * k)], fill: L.color }];
      },
      back(p, L) {
        const S = p.size, w = lw(p), [a, m, b] = p.appendages.caudal, ang = Math.atan2(b[1] - m[1], b[0] - m[0]), n = [-Math.sin(ang), Math.cos(ang)];
        const spread = p.view === 'side' ? .13 : .05, q = k => [b[0] + n[0] * k * S, b[1] + n[1] * k * S];
        parts([{ poly: [a, q(spread), [lerp(m[0], b[0], .55), lerp(m[1], b[1], .55)], q(-spread)], fill: L.fin }], w);
        if (p.view === 'side') { const f1 = segFrame(p, 1), f3 = segFrame(p, 3); parts([{ poly: [f1(.08, -.1), f1(-.16, -.29), f3(.04, -.05)], fill: L.fin }, { poly: [f3(.06, .06), f3(-.05, .16), f3(-.09, .04)], fill: L.fin }], w); }
      },
      front(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side', pc = p.appendages.pectoral, w = lw(p);
        clipTo(this.body(p, L), () => { const f = segFrame(p, 1); c.beginPath(); c.ellipse(...f(0, top ? 0 : -.08), .2 * S, .06 * S, p.spine[1].angle, 0, TAU); c.fillStyle = L.dark; c.fill(); });
        stroke([hf(-.04, -.07), hf(-.065, 0), hf(-.04, .07)], Math.max(1.5, .012 * S), edge(L.color));  // gill
        const fin = (base, tip) => { const ang = Math.atan2(tip[1] - base[1], tip[0] - base[0]), mid = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2]; parts([{ e: [mid[0], mid[1], Math.hypot(tip[0] - base[0], tip[1] - base[1]) / 2 + .01 * S, .03 * S, ang], fill: L.fin }], w); };
        if (top) { const f = segFrame(p, 1), da = Math.atan2(pc[1][1] - pc[0][1], pc[1][0] - pc[0][0]) - p.spine[1].angle; for (const s of [-1, 1]) fin(f(.03, s * .1), f(-.06, s * (.17 + .05 * Math.sin(da)))); }
        else fin(pc[0], pc[1]);
        for (const s of top ? [-1, 1] : [0]) { const [x, y] = hf(.05, top ? .07 * s : -.02); dot(x, y, .032 * S, P.eye); dot(x + .008 * S, y, .018 * S, P.ink); }
        if (!top) stroke([hf(.115, .035), hf(.09, .04)], Math.max(1.5, .008 * S), edge(L.color));
      },
    },
  };
  const lw = p => clamp(p.size * .022, 1.5, STYLE.outline.weight);

  // Flat crowd form: no outline or face; limbs as thin lines.
  function simple(p, D, L) {
    const S = p.size, col = L.shirt || L.color, w = Math.max(1, .06 * S), r = headR(p) * (D.headScale || 1);
    for (const l of Object.values(p.limbs)) stroke([l.root, l.mid, l.end], w, l.far ? dark(L.pants || L.dark || col) : L.pants || L.dark || col, false);
    if (p.spec === 'human') stroke([[p.spine[0].x, p.spine[0].y - .06 * S], [p.spine[1].x, p.spine[1].y]], .17 * S, col);
    else for (const g of p.spine) { c.beginPath(); c.ellipse(g.x, g.y, g.r * 1.3, g.r, g.angle, 0, TAU); c.fillStyle = col; c.fill(); }
    dot(p.head.x, p.head.y, Math.max(1, r), L.skin || col);
  }

  // Contact shadow: a soft cool ellipse under the body on the ground (side view) or a drop shadow (top view). Fliers and
  // swimmers cast none.
  function contact(p) {
    const S = p.size, feet = Object.values(p.limbs).filter(l => l.foot);
    if (!feet.length || p.wings?.open) return;
    c.save(); c.fillStyle = rgba(P.shade, .3); c.beginPath();
    if (p.view === 'side') {
      const xs = [...p.spine.map(g => g.x), p.head.x, ...feet.map(l => l.end[0])], y = Math.max(...feet.map(l => l.end[1]));
      const x0 = Math.min(...xs), x1 = Math.max(...xs), ry = clamp(.022 * S, 2, 14);
      c.ellipse((x0 + x1) / 2 + .02 * S, y + ry * .3, (x1 - x0) / 2 + .03 * S, ry, 0, 0, TAU);
      for (const l of feet) if (l.stance) { c.moveTo(l.end[0] + .035 * S, l.end[1]); c.ellipse(l.end[0], l.end[1] + ry * .2, .035 * S, ry * .6, 0, 0, TAU); }
    } else for (const g of p.spine) { c.moveTo(g.x + .05 * S + g.r * 1.3, g.y + .07 * S); c.ellipse(g.x + .05 * S, g.y + .07 * S, g.r * 1.3, g.r, g.angle, 0, TAU); }
    c.fill(); c.restore();
  }

  // Emote perto da cabeça ('!', '?', 'sweat', 'note', 'zzz'): surge com backOut e encolhe ao sumir (k = min(k, a)).
  function emote(p) {
    const e = p.emote, r = headR(p), f = p.view === 'side' ? p.facing : 1, k = Math.min(e.k, e.a);
    if (k <= 0) return;
    if (e.sym === 'sweat') {
      const s = backOut(k) * r * .3, x = p.head.x - f * r * .2, y = p.head.y - r * .5 + r * .5 * (1 - e.a);
      Kit.poly([[x - s * .7, y - s * .2], [x, y - s * 1.9], [x + s * .7, y - s * .2]], P.water, { stroke: false }); Kit.ellipse(x, y, s * .72, s * .8, P.water);
    } else Kit.text({ note: '♪', zzz: 'z z z' }[e.sym] || e.sym, p.head.x + f * r * 1.2, p.head.y - r * 1.9, Math.max(14, r * 1.6), P.ink, { k });
  }

  function creature(p, look = {}) {
    const D = decor[p.spec]; if (!D) throw new Error(`Sem desenho para o ser ${p.spec}`);
    const L = { ...D.look, ...look }, side = p.view === 'side', w = lw(p), limbs = Object.entries(p.limbs), sq = p.sq || 0;
    if (sq) {  // squash (sq > 0) e stretch (sq < 0) a partir do chão sob o corpo, preservando o volume
      const fs = Object.values(p.limbs).filter(l => l.foot), x = (p.spine[0].x + p.spine.at(-1).x) / 2, y = fs.length ? Math.max(...fs.map(l => l.end[1])) : p.spine[0].y;
      c.save(); c.translate(x, y); c.scale(1 + .5 * sq, 1 - sq); c.translate(-x, -y);
    }
    try {
      contact(p);
      if (p.size < 28) simple(p, D, L);
      else {
        const draw = ([name, l]) => { const g = D.limb(p, L, l, name, l.far); for (const q of Array.isArray(g[0]) ? g : [g]) parts(q, w); D.detail?.(p, L, l, name, l.far); };
        const behind = ([, l]) => l.far || !side || (D.legsBehind && l.foot);
        limbs.filter(behind).sort(([, a], [, b]) => b.far - a.far).forEach(draw);
        D.back?.(p, L);
        const B = D.body(p, L); for (const g of Array.isArray(B[0]) ? B : [B]) parts(g, w);
        D.over?.(p, L);
        limbs.filter(e => !behind(e)).forEach(draw);
        D.front?.(p, L);
      }
      if (p.carry) NatureArt.leafPiece(p.carry.x, p.carry.y, p.carry.w, p.carry.h, p.carry.angle, P.leaf);
    } finally { if (sq) c.restore(); }
    if (p.emote) emote(p);
  }

  // Paper grain tile: speckle plus short horizontal fibres, built once from hash() and reused on every frame.
  let PAPER = null;
  function paper() {
    if (PAPER) return PAPER;
    const n = 256, tile = canvas(n, n), g = tile.getContext('2d'), im = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, v = .6 * hash(i * .731 + 3) + .4 * hash(y * 97.3 + (x >> 3) * 13.1 + 7) - .5, k = 4 * i;
      im.data[k] = im.data[k + 1] = im.data[k + 2] = v > 0 ? 255 : 40; im.data[k + 3] = Math.round(Math.abs(v) * 16);
    }
    g.putImageData(im, 0, 0);
    PAPER = canvas(W, H); const f = PAPER.getContext('2d'); f.scale(2, 2); f.fillStyle = f.createPattern(tile, 'repeat'); f.fillRect(0, 0, W, H);  // one full frame (drawImage is far cheaper than a pattern fill), scaled up and soft: cheap to encode
    return PAPER;
  }
  const canvas = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
  // Dry and wet skies per sun position, built once (the radial glow costs a lot to fill); rain crossfades them.
  const SKY = {};

  window.NatureArt = {
    creature, decor,
    // Ground below profile(x) between x0 and x1, filled to the bottom: darker with depth, a lit band under a darker top
    // edge. With color: a flat distant layer (hills) with a faint edge.
    ground(profile, x0 = 0, x1 = W, color = null) {
      const edgeLine = (dy, col, w) => { c.beginPath(); for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), profile(Math.min(x, x1)) + dy); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
      let top = Infinity; c.beginPath(); c.moveTo(x0, H * 4);
      for (let x = x0; x <= x1 + 15; x += 16) { const y = profile(Math.min(x, x1)); top = Math.min(top, y); c.lineTo(Math.min(x, x1), y); }
      c.lineTo(x1, H * 4); c.closePath();
      if (color) { c.fillStyle = color; c.fill(); edgeLine(1.5, mixCol(color, P.ink, .12), 3); return; }
      const g = c.createLinearGradient(0, top, 0, top + 700); g.addColorStop(0, P.ground); g.addColorStop(1, mixCol(P.ground, P.shade, .28));
      c.fillStyle = g; c.fill(); edgeLine(14, lit(P.ground), 12); edgeLine(3, P.groundDk, 6);
    },
    // Sky in screen space: gradient and the warm glow of the sun at (sx, sy); rain (0..1) greys it and hides the sun.
    sky(rain = 0, sx = 330, sy = 160) {
      const sky = wet => {
        const key = `${wet},${sx},${sy}`; if (SKY[key]) return SKY[key];
        const cv = SKY[key] = canvas(W, H), k = cv.getContext('2d'), lin = k.createLinearGradient(0, 0, 0, H);
        lin.addColorStop(0, mixCol(P.skyTop, P.stone, .75 * wet)); lin.addColorStop(1, mixCol(P.skyLow, P.stone, .6 * wet)); k.fillStyle = lin; k.fillRect(0, 0, W, H);
        if (!wet) { const g = k.createRadialGradient(sx, sy, 0, sx, sy, 900); g.addColorStop(0, rgba(P.sun, 1)); g.addColorStop(.08, rgba(P.sun, .9)); g.addColorStop(.3, rgba(P.sun, .35)); g.addColorStop(1, rgba(P.sun, 0)); k.fillStyle = g; k.fillRect(0, 0, W, H); }
        return cv;
      };
      c.save(); c.resetTransform();
      if (rain < 1) c.drawImage(sky(0), 0, 0);
      if (rain > 0) { c.globalAlpha = rain; c.drawImage(sky(1), 0, 0); }
      c.restore();
    },
    // Tuft of big dark blades for the foreground frame; sways gently with t.
    tuft(x, y, h, t = 0, seed = 0, color = mixCol(P.leafDk, P.ink, .5)) {
      for (let i = 0; i < 7; i++) { const a = (i - 3) * .2 + .2 * (hash(seed + i) - .5) + .05 * Math.sin(t * 1.3 + i + seed); this.blade(x + (i - 3) * h * .035, y, h * (.55 + .45 * hash(seed + i + 9)), a, i & 1 ? color : mixCol(color, P.ink, .25)); }
    },
    // Screen-space finish: climate grade (rain 0..1 turns it colder and darker; the dry look stays warm from the sky and
    // the lit tones) and a subtle paper grain
    // whose pattern is generated once from hash() and reused on every frame.
    grade(rain = 0) {
      c.save(); c.resetTransform();
      if (rain > 0) { c.globalCompositeOperation = 'multiply'; c.fillStyle = mixCol('#FFFFFF', '#8A9CBC', rain); c.fillRect(0, 0, W, H); }
      c.globalCompositeOperation = 'source-over'; c.drawImage(paper(), 0, 0); c.restore();
    },
    // Grass blade rooted at (x, y), height h, leaning by bend radians (bladeBend).
    blade(x, y, h, bend, color = P.grass) {
      const tx = x + Math.sin(bend) * h, ty = y - Math.cos(bend) * h, mx = x + Math.sin(bend * .5) * h * .55, my = y - Math.cos(bend * .5) * h * .55, b = Math.max(1.5, h * .07);
      c.beginPath(); c.moveTo(x - b, y); c.quadraticCurveTo(mx - b * .6, my, tx, ty); c.quadraticCurveTo(mx + b * .6, my, x + b, y); c.closePath(); c.fillStyle = color; c.fill();
    },
    // Rock resting on y (flat base), radius r; the outline varies by seed.
    rock(x, y, r, seed = 0) {
      const pts = []; for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8, k = .8 + .3 * hash(seed * 31 + i); pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * .75 * k]); }
      pts[0][1] = pts[8][1] = y; pts.push([x, y + r * .1]); parts([{ smooth: true, poly: pts, fill: P.stone }], clamp(r * .04, 1.5, STYLE.outline.weight / 2));
    },
    // Tree rooted at (x, y), height h; bend (wind) leans the crown. The seed picks the kind (round, tall or pine), the
    // branches and the leaf masses; haze (0..1) fades it toward the sky for distant layers (no outline past .3).
    tree(x, y, h, bend = 0, seed = 0, haze = 0) {
      const kind = Math.floor(hash(seed * 5 + 1) * 3), hz = col => mixCol(col, P.skyLow, haze), wgt = haze > .3 ? 0 : clamp(h * .02, 2, STYLE.outline.weight);
      const lean = Math.sin(bend) * h, at = k => [x + lean * k * k, y - h * k], j = i => hash(seed * 7 + i), wood = hz(P.wood);
      if (kind === 2) {  // pine: thin trunk, four tiers
        parts([{ b: [[x, y], h * .035, at(.95), h * .012], fill: wood }], wgt);
        parts([0, 1, 2, 3].map(i => { const k = .2 + i * .19, [cx, cy] = at(k), [tx, ty] = at(k + .34), w = h * (.3 - i * .055) * (.9 + .2 * j(i)); return { poly: [[cx - w, cy], [tx, ty], [cx + w, cy], [cx, cy - h * .03]], fill: hz(P.leafDk) }; }), wgt);
        return;
      }
      const tall = kind === 1, [cx, cy] = at(.56), trunk = [{ b: [[x, y], h * .05, at(.56), h * .026], fill: wood }];
      for (const s of [-1, 1]) { const [bx, by] = at(.2 + .1 * j(s + 5)); trunk.push({ b: [[bx, by], h * .02, [bx + s * h * (tall ? .08 : .17) + lean * .3, by - h * (.2 + .06 * j(s + 8))], h * .009], fill: wood }); }
      parts(trunk, wgt);
      const masses = tall ? [[0, .06, .16], [-.07, -.08, .15], [.07, -.18, .14], [-.03, -.3, .13], [.02, -.41, .1]] : [[0, -.1, .27], [-.21, .02, .19], [.21, 0, .2], [-.1, -.28, .2], [.13, -.25, .19], [-.3, -.12, .13]];
      const blobs = masses.map(([dx, dy, r], i) => ({ e: [cx + (dx + .04 * (j(i) - .5)) * h + lean * .1, cy + dy * h, r * h * (.85 + .3 * j(i + 20)), r * h * .85], fill: hz(P.leaf) }));
      parts(blobs, wgt);
      c.beginPath(); for (const { e: [bx, by, rx, ry] } of blobs.slice(1)) { c.moveTo(bx + Math.cos(.2) * rx * .7, by + Math.sin(.2) * ry * .7); c.ellipse(bx, by, rx * .7, ry * .7, 0, .2, 1.6); }
      c.strokeStyle = shd(hz(P.leaf)); c.lineWidth = Math.max(1.5, h * .01); c.lineCap = 'round'; c.stroke();  // leaf clusters
    },
    // Leaf centred at (x, y), w long and h wide, rotated by angle; cut (0..1) bites a half circle out of one edge.
    leafPiece(x, y, w, h, angle = 0, color = P.leaf, cut = 0) {
      c.save(); c.translate(x, y); c.rotate(angle);
      if (cut > 0) { c.beginPath(); c.rect(-w, -h * 2, w * 2, h * 4); c.arc(w * .1, -h * .5, cut * h * .9, 0, TAU, true); c.clip('evenodd'); }
      c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, -h, w / 2, 0); c.quadraticCurveTo(0, h, -w / 2, 0); c.closePath();
      c.fillStyle = color; c.fill(); c.strokeStyle = edge(color); c.lineWidth = clamp(h * .12, 1.5, 4); c.lineJoin = 'round'; c.stroke();
      c.beginPath(); c.moveTo(-w * .45, 0); c.lineTo(w * .4, 0); c.strokeStyle = dark(color); c.lineWidth = Math.max(1, h * .06); c.stroke(); c.restore();
    },
    // Rain drop with its round end at (x, y).
    drop(x, y, r) {
      c.beginPath(); c.moveTo(x, y - r * 2.6); c.quadraticCurveTo(x + r * 1.1, y - r * .6, x + r, y); c.arc(x, y, r, 0, Math.PI); c.quadraticCurveTo(x - r * 1.1, y - r * .6, x, y - r * 2.6);
      c.fillStyle = P.water; c.fill(); dot(x - r * .35, y - r * .3, r * .3, P.cloud);
    },
    // Splash ring on water or ground; k 0..1 grows and fades.
    ripple(x, y, k) { if (k <= 0 || k >= 1) return; c.save(); c.globalAlpha = 1 - k; c.beginPath(); c.ellipse(x, y, 6 + 40 * k, (6 + 40 * k) * .3, 0, 0, TAU); c.strokeStyle = P.cloud; c.lineWidth = 4 * (1 - k) + 1; c.stroke(); c.restore(); },
    // Dust puff at a footstep; k 0..1 spreads and fades.
    dust(x, y, k, seed = 0) {
      if (k <= 0 || k >= 1) return; c.save(); c.globalAlpha = .7 * (1 - k);
      for (let i = 0; i < 5; i++) { const a = Math.PI + (i + .5) * Math.PI / 5, d = 8 + 30 * k * (.6 + .5 * hash(seed + i)); dot(x + Math.cos(a) * d, y + Math.sin(a) * d * .4, (4 + 9 * k) * (.7 + .5 * hash(seed + i + 9)), mixCol(P.ground, P.cloud, .55)); }
      c.restore();
    },
    // Water from the surface y down to the bottom, between x0 and x1; the surface waves with t.
    water(x0, y, x1, t) {
      const surf = x => y + 5 * Math.sin(x * .012 + t * 2) + 3 * Math.sin(x * .031 - t * 1.3);
      c.beginPath(); c.moveTo(x0, H); for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), surf(Math.min(x, x1))); c.lineTo(x1, H); c.closePath();
      const g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, P.water); g.addColorStop(1, mixCol(P.water, P.shade, .45)); c.fillStyle = g; c.fill();
      c.beginPath(); for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), surf(Math.min(x, x1))); c.strokeStyle = P.cloud; c.lineWidth = 5; c.stroke();
      for (let i = 0; i < Math.ceil((x1 - x0) / 220); i++) { const hx = x0 + ((i * 220 + 30 * t) % (x1 - x0)), hy = y + 30 + 60 * hash(i + 3); stroke([[hx, hy], [hx + 50, hy]], 4, mixCol(P.water, P.cloud, .4)); }
    },
    // Puffy cloud centred at (x, y), scale s.
    cloud(x, y, s = 1, seed = 0) { parts([[-80, 10, 50], [-25, -15, 62], [40, -5, 55], [85, 15, 40], [0, 22, 70]].map(([dx, dy, r], i) => ({ e: [x + dx * s, y + dy * s, r * s * (.9 + .2 * hash(seed + i)), r * s * .7], fill: P.cloud })), 0); },
    // Soil cross-section with pebbles.
    soil(x, y, w, h, seed = 0) {
      c.fillStyle = mixCol(P.wood, P.ink, .35); c.fillRect(x, y, w, h);
      const n = Math.round(w * h / 9000); for (let i = 0; i < n; i++) { const px = x + w * hash(seed + i * 3), py = y + h * hash(seed + i * 3 + 1), r = 3 + 7 * hash(seed + i * 3 + 2); c.beginPath(); c.ellipse(px, py, r * 1.3, r, hash(seed + i) * 3, 0, TAU); c.fillStyle = i % 3 ? mixCol(P.wood, P.ink, .5) : P.stone; c.fill(); }
    },
    // Tunnel dug along a makePath path, width px wide.
    tunnel(path, width) {
      const pts = []; for (let d = 0; d <= path.length; d += 12) { const q = path.at(d); pts.push([q.x, q.y]); }
      const q = path.at(path.length); pts.push([q.x, q.y]);
      stroke(pts, width + 10, mixCol(P.wood, P.ink, .6)); stroke(pts, width, mixCol(P.wood, P.ink, .15));
    },
  };
})();
