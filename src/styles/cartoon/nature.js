// Cartoon NatureArt: creatures drawn from creaturePose (src/nature/creature.js) and environment pieces. Pure functions of
// their arguments; no state between calls. Creatures: far limbs, body (one inked silhouette), near limbs, then the
// species decorator (NatureArt.decor[spec]) adds faces, fins, wings and markings. Below 28 px a flat simplified form.
(() => {
  const c = window.animationEngine.context, P = STYLE.palette, PI2 = Math.PI / 2;
  const dark = (col, k = .3) => mixCol(col, P.ink, k);

  // Tapered bone: half circles around b (radius rb) and a (radius ra), joined by their tangents.
  function bone(a, ra, b, rb) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    c.moveTo(b[0] + rb * Math.cos(ang - PI2), b[1] + rb * Math.sin(ang - PI2));
    c.arc(b[0], b[1], rb, ang - PI2, ang + PI2); c.arc(a[0], a[1], ra, ang + PI2, ang + 3 * PI2); c.closePath();
  }
  // Adds one part to the current path: ellipse {e}, bone {b} or polygon {poly} (smooth: curves through midpoints).
  function shape(p, e) {
    if (p.e) { const [x, y, rx, ry, rot = 0] = p.e; c.moveTo(x + (rx + e) * Math.cos(rot), y + (rx + e) * Math.sin(rot)); c.ellipse(x, y, rx + e, ry + e, rot, 0, TAU); }
    else if (p.b) bone(p.b[0], p.b[1] + e, p.b[2], p.b[3] + e);
    else if (p.smooth) { const q = p.poly, n = q.length, m = i => [(q[i % n][0] + q[(i + 1) % n][0]) / 2, (q[i % n][1] + q[(i + 1) % n][1]) / 2]; c.moveTo(...m(n - 1)); for (let i = 0; i < n; i++) c.quadraticCurveTo(q[i][0], q[i][1], ...m(i)); c.closePath(); }
    else { const q = p.poly; c.moveTo(q[0][0], q[0][1]); q.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); }
  }
  const trace = (p, e) => { c.beginPath(); shape(p, e); };
  // Parts share one silhouette: every outline (inflated by lw) first, then every fill in order.
  function parts(list, lw) {
    c.fillStyle = P.ink; c.strokeStyle = P.ink; c.lineWidth = 2 * lw; c.lineJoin = 'round';
    if (lw > 0) for (const p of list) { trace(p, p.poly ? 0 : lw); if (p.poly) c.stroke(); else c.fill(); }
    for (const p of list) { trace(p, 0); c.fillStyle = p.fill; c.fill(); }
  }
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
  function humanFace(p, L, hf0) {
    const F = FACES[p.face.expression] || FACES.neutral, S = p.size, w = Math.max(1.5, .007 * S), mid = .036, hf = (dx, dy) => hf0(dx, dy + .01);
    for (const ex of [.014, .058]) {
      const [x, y] = hf(ex, -.012), inner = ex < mid ? 1 : -1, rx = .017 * S, ry = (F.eye === 'wide' ? .026 : .021) * S;
      const pt = (dx, dy) => hf(ex + dx, -.012 + dy);
      if (F.eye === 'x') { stroke([pt(-.014, -.014), pt(.014, .014)], w, P.ink, false); stroke([pt(-.014, .014), pt(.014, -.014)], w, P.ink, false); }
      else if (F.eye === 'arc') stroke([pt(-.016, .006), pt(0, -.016), pt(.016, .006)], w * 1.2);
      else {
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = P.eye; c.fill(); c.strokeStyle = P.ink; c.lineWidth = w * .6; c.stroke();
        const [px, py] = hf(ex + .005, -.008 + (F.look || 0)); dot(px, py, (F.eye === 'wide' ? .0075 : .0105) * S, P.ink);
        if (F.lid < 1) {  // upper lid in skin, slanting down toward the nose when angry
          const top = -.012 - .024, yIn = top + (1 - F.lid) * .048 + (F.slant ? .008 : 0), yOut = top + (1 - F.lid) * .048 - (F.slant ? .008 : 0);
          const a = pt(.02 * inner, yIn + .012), b = pt(-.02 * inner, yOut + .012);
          c.save(); c.beginPath(); c.ellipse(x, y, rx + w * .3, ry + w * .3, 0, 0, TAU); c.clip();
          c.beginPath(); c.moveTo(...pt(.03 * inner, top - .01)); c.lineTo(...pt(-.03 * inner, top - .01)); c.lineTo(...b); c.lineTo(...a); c.closePath(); c.fillStyle = L.skin; c.fill(); c.restore();
          stroke([a, b], w, P.ink, false);
        }
      }
      if (F.brow) stroke([pt(.013 * inner, -.04 + F.brow[0]), pt(-.017 * inner, -.04 + F.brow[1])], w * 1.15, P.ink, false);
    }
    const [kind, k] = F.mouth, m = (dx, dy) => hf(.046 + dx, .045 + dy);
    if (kind === 'o') { const [x, y] = m(0, .004); c.beginPath(); c.ellipse(x, y, .011 * S, .016 * S, 0, 0, TAU); c.fillStyle = P.ink; c.fill(); }
    else if (kind === 'wavy') stroke([m(-.018, 0), m(-.009, -.006), m(0, 0), m(.009, -.006), m(.018, 0)], w, P.ink, false);
    else if (kind === 'smile') { c.beginPath(); c.moveTo(...m(-.02, -.004)); c.quadraticCurveTo(...m(0, 2 * k), ...m(.02, -.004)); c.closePath(); c.fillStyle = P.ink; c.fill(); }
    else stroke([m(-.016, -k), m(0, k), m(.016, -k)], w);
  }

  // Species decorators. look: default colors and limb widths (BL). legsBehind: near feet go behind the body (human hem).
  // body(p, L) returns the silhouette parts; back/front draw behind the body and over everything.
  const decor = {
    human: {
      look: { color: P.cloth, skin: P.skin, hair: P.hair, shirt: P.cloth, pants: P.clothDk, legs: [.05, .036, .03], arms: [.03, .026, .022] },
      legsBehind: true, headScale: 1.5,
      limb(p, L, l, name, isFar) {
        const k = isFar ? .28 : 0, S = p.size;
        if (name.startsWith('leg')) {
          const shoe = { e: [l.end[0] + p.facing * .022 * S, l.end[1] - .016 * S, .042 * S, .02 * S], fill: mixCol(P.wood, P.ink, .45 + k) };
          return [...limbParts(l, L.legs.map(v => v * S), dark(L.pants, k)), shoe];
        }
        const w = L.arms.map(v => v * S);
        return [{ b: [l.root, w[0], l.mid, w[1]], fill: dark(L.shirt, k) }, { b: [l.mid, w[1], l.end, w[2]], fill: dark(L.skin, k) }, { e: [l.end[0], l.end[1], .028 * S, .028 * S], fill: dark(L.skin, k) }];
      },
      body(p, L) {
        const S = p.size, [ch, pe] = p.spine, hf = headFrame(p), r = headR(p) * this.headScale;
        return [
          { e: [pe.x, pe.y, .07 * S, .07 * S], fill: L.pants },
          { b: [[ch.x, ch.y - .1 * S], .032 * S, [p.head.x, p.head.y], .032 * S], fill: L.skin },
          { b: [[ch.x, ch.y - .05 * S], .085 * S, [pe.x, pe.y - .03 * S], .078 * S], fill: L.shirt },
          { e: [...hf(.086, .012), .02 * S, .02 * S], fill: L.skin },
          { e: [p.head.x, p.head.y, r * .94, r, 0], fill: L.skin },
        ];
      },
      back(p, L) { const h = p.appendages.hair; if (h) parts(chainParts(h, .034 * p.size, .016 * p.size, L.hair), lw(p)); },
      front(p, L) {
        const S = p.size, hf = headFrame(p), r = headR(p) * this.headScale, hx = p.head.x, hy = p.head.y;
        c.save(); c.beginPath(); c.ellipse(hx, hy, r * .94, r, 0, 0, TAU); c.clip();  // hair cap inside the head outline
        c.beginPath(); for (const [dx, dy, rx, ry] of [[-.075, 0, .065, .11], [-.01, -.1, .11, .036]]) { const [x, y] = hf(dx, dy); c.moveTo(x + rx * S, y); c.ellipse(x, y, rx * S, ry * S, 0, 0, TAU); }
        c.fillStyle = L.hair; c.fill(); c.restore();
        c.beginPath(); c.ellipse(hx, hy, r * .94, r, 0, 0, TAU); c.strokeStyle = P.ink; c.lineWidth = lw(p); c.stroke();
        parts([{ e: [...hf(-.03, .012), .015 * S, .021 * S], fill: L.skin }], lw(p) * .6);  // ear
        humanFace(p, L, hf);
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
        clipTo(body, () => { const g = p.spine[1], f = segFrame(p, 1); c.beginPath(); c.ellipse(...f(-.05, top ? 0 : -.13), .24 * S, .12 * S, g.angle, 0, TAU); c.fillStyle = L.dark; c.fill(); });  // saddle
        const nose = hf(.205, top ? 0 : .02); dot(nose[0], nose[1], .03 * S, P.ink);
        for (const side of top ? [-1, 1] : [1]) { const [x, y] = hf(.05, top ? .055 * side : -.035); dot(x, y, .02 * S, P.ink); dot(x + .006 * S, y - .007 * S, .007 * S, P.eye); }
        if (!top) { stroke([hf(.2, .07), hf(.13, .075)], Math.max(1.5, .008 * S)); for (const e of ['earL', 'earR']) if (!far(p, e)) parts(chainParts(p.appendages[e], .04 * S, .028 * S, L.dark), lw(p)); }
      },
    },
    ant: {
      look: { color: P.chitin, dark: P.chitinDk, limb: [.022, .016, .012] },
      limb(p, L, l, name, isFar) { return limbParts(l, L.limb.map(v => v * p.size), isFar ? L.dark : L.color); },
      body(p, L) {
        const S = p.size, hf = headFrame(p), f = segFrame(p, 0), top = p.view !== 'side', [th, pe] = p.spine;
        const spines = top ? [-1, 1].map(s => ({ b: [f(-.05, .03 * s), .014 * S, f(-.11, .06 * s), .003 * S], fill: L.color })) : [{ b: [f(-.05, -.04), .016 * S, f(-.1, -.1), .003 * S], fill: L.color }];
        return [
          ...spines, { b: [[th.x, th.y], .03 * S, [p.head.x, p.head.y], .03 * S], fill: L.color },
          ...spineParts(p, L.color, [1.45, 1.2, 1.25]), { e: [pe.x, pe.y - (top ? 0 : .025 * S), .03 * S, .04 * S, pe.angle], fill: L.color },
          { e: [p.head.x, p.head.y, .095 * S, (top ? .085 : .078) * S, p.head.angle], fill: L.color },
          ...(top ? [-1, 1].map(s => ({ b: [hf(.07, .035 * s), .02 * S, hf(.14, .012 * s), .007 * S], fill: L.dark })) : [{ b: [hf(.07, .035), .02 * S, hf(.145, .055), .007 * S], fill: L.dark }]),
        ];
      },
      back(p, L) { for (const a of ['antennaL', 'antennaR']) if (far(p, a)) stroke(p.appendages[a], Math.max(1.5, .016 * p.size), dark(L.dark, .2), false); },
      front(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side';
        for (const a of ['antennaL', 'antennaR']) if (!far(p, a)) stroke(p.appendages[a], Math.max(1.5, .016 * p.size), P.ink, false);
        for (const s of top ? [-1, 1] : [0]) { const [x, y] = hf(top ? .01 : .025, top ? .07 * s : -.02); c.beginPath(); c.ellipse(x, y, .026 * S, .02 * S, p.head.angle, 0, TAU); c.fillStyle = P.ink; c.fill(); dot(x + .006 * S, y - .006 * S, .006 * S, P.eye); }
        clipTo(spineParts(p, 0, [1.45, 1.2, 1.25]).slice(2), () => { const f = segFrame(p, 2); for (const k of [-.05, .04]) stroke([f(k, -.2), f(k - .03, .2)], Math.max(1.5, .012 * S), L.dark, false); });  // gaster bands
      },
    },
    spider: {
      look: { color: P.wood, dark: mixCol(P.wood, P.ink, .4), limb: [.034, .026, .016] },
      limb(p, L, l, name, isFar) { return limbParts(l, L.limb.map(v => v * p.size), isFar ? L.dark : L.color); },
      body(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side';
        return [...spineParts(p, L.color, [1.15, 1.2]), { e: [p.head.x, p.head.y, .09 * S, .08 * S, p.head.angle], fill: L.color },
          ...(top ? [-1, 1].map(s => ({ b: [hf(.06, .03 * s), .025 * S, hf(.11, .03 * s), .012 * S], fill: L.dark })) : [{ b: [hf(.05, .03), .028 * S, hf(.09, .09), .012 * S], fill: L.dark }])];
      },
      back(p, L) { for (const a of ['palpL', 'palpR']) if (far(p, a)) parts(chainParts(p.appendages[a], .022 * p.size, .016 * p.size, L.dark), lw(p)); },
      front(p, L) {
        const S = p.size, hf = headFrame(p), top = p.view !== 'side', ab = spineParts(p, 0, [1.15, 1.2])[1];
        clipTo([ab], () => { const f = segFrame(p, 1); c.beginPath(); for (const k of [0, .09, .18]) { c.moveTo(...f(.05 - k, top ? -.09 : -.24)); c.lineTo(...f(-.03 - k, top ? 0 : -.15)); c.lineTo(...f(.05 - k, top ? .09 : -.24 + .18)); } c.strokeStyle = L.dark; c.lineWidth = .025 * S; c.lineCap = 'round'; c.stroke(); });
        for (const a of ['palpL', 'palpR']) if (!far(p, a)) parts(chainParts(p.appendages[a], .022 * S, .016 * S, L.color), lw(p));
        const eyes = top ? [[.07, -.03, .022], [.07, .03, .022], [.045, -.06, .013], [.045, .06, .013], [.025, -.035, .012], [.025, .035, .012]] : [[.06, -.035, .024], [.02, -.06, .015], [.045, -.065, .013]];
        for (const [dx, dy, r] of eyes) { const [x, y] = hf(dx, dy); dot(x, y, r * S, P.ink); dot(x + .3 * r * S, y - .3 * r * S, .35 * r * S, P.eye); }
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
        stroke([hf(-.04, -.07), hf(-.065, 0), hf(-.04, .07)], Math.max(1.5, .012 * S), L.dark);  // gill
        const fin = (base, tip) => { const ang = Math.atan2(tip[1] - base[1], tip[0] - base[0]), mid = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2]; parts([{ e: [mid[0], mid[1], Math.hypot(tip[0] - base[0], tip[1] - base[1]) / 2 + .01 * S, .03 * S, ang], fill: L.fin }], w); };
        if (top) { const f = segFrame(p, 1), da = Math.atan2(pc[1][1] - pc[0][1], pc[1][0] - pc[0][0]) - p.spine[1].angle; for (const s of [-1, 1]) fin(f(.03, s * .1), f(-.06, s * (.17 + .05 * Math.sin(da)))); }
        else fin(pc[0], pc[1]);
        for (const s of top ? [-1, 1] : [0]) { const [x, y] = hf(.05, top ? .07 * s : -.02); dot(x, y, .032 * S, P.eye); dot(x + .008 * S, y, .018 * S, P.ink); }
        if (!top) stroke([hf(.115, .035), hf(.09, .04)], Math.max(1.5, .008 * S));
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

  function creature(p, look = {}) {
    const D = decor[p.spec]; if (!D) throw new Error(`Sem desenho para o ser ${p.spec}`);
    const L = { ...D.look, ...look }, side = p.view === 'side', w = lw(p), limbs = Object.entries(p.limbs);
    if (p.size < 28) simple(p, D, L);
    else {
      const draw = ([name, l]) => parts(D.limb(p, L, l, name, l.far), w);
      const behind = ([, l]) => l.far || !side || (D.legsBehind && l.foot);
      limbs.filter(behind).sort(([, a], [, b]) => b.far - a.far).forEach(draw);
      D.back?.(p, L);
      parts(D.body(p, L), w);
      limbs.filter(e => !behind(e)).forEach(draw);
      D.front?.(p, L);
    }
    if (p.carry) NatureArt.leafPiece(p.carry.x, p.carry.y, p.carry.w, p.carry.h, p.carry.angle, P.leaf);
  }

  window.NatureArt = {
    creature, decor,
    // Ground below profile(x) between x0 and x1, filled to the bottom, with a darker top edge.
    ground(profile, x0 = 0, x1 = W) {
      c.beginPath(); c.moveTo(x0, H);
      for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), profile(Math.min(x, x1)));
      c.lineTo(x1, H); c.closePath(); c.fillStyle = P.ground; c.fill();
      c.beginPath(); for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), profile(Math.min(x, x1)) + 3); c.strokeStyle = P.groundDk; c.lineWidth = 6; c.stroke();
    },
    // Grass blade rooted at (x, y), height h, leaning by bend radians (bladeBend).
    blade(x, y, h, bend, color = P.grass) {
      const tx = x + Math.sin(bend) * h, ty = y - Math.cos(bend) * h, mx = x + Math.sin(bend * .5) * h * .55, my = y - Math.cos(bend * .5) * h * .55, b = Math.max(1.5, h * .07);
      c.beginPath(); c.moveTo(x - b, y); c.quadraticCurveTo(mx - b * .6, my, tx, ty); c.quadraticCurveTo(mx + b * .6, my, x + b, y); c.closePath(); c.fillStyle = color; c.fill();
    },
    // Rock resting on y (flat base), radius r; the outline varies by seed.
    rock(x, y, r, seed = 0) {
      const pts = []; for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8, k = .8 + .3 * hash(seed * 31 + i); pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * .75 * k]); }
      pts[0][1] = pts[8][1] = y; Kit.poly(pts, P.stone, { smooth: true, weight: clamp(r * .08, 2, STYLE.outline.weight) });
      Kit.ellipse(x - r * .25, y - r * .45, r * .25, r * .1, P.cloud, { rot: -.3, alpha: .45 });
    },
    // Tree rooted at (x, y), height h; bend (wind) leans the crown.
    tree(x, y, h, bend = 0, seed = 0) {
      const top = [x + Math.sin(bend) * h * .55, y - h * .55], wgt = clamp(h * .02, 2, STYLE.outline.weight);
      parts([{ b: [[x, y], h * .05, top, h * .03], fill: P.wood }], wgt);
      const blobs = [[0, -.12, .28], [-.2, 0, .2], [.2, -.02, .21], [-.08, -.3, .2], [.12, -.26, .19]].map(([dx, dy, r], i) => ({ e: [top[0] + (dx + .03 * hash(seed * 7 + i)) * h + Math.sin(bend) * h * .1, top[1] + dy * h, r * h * (.9 + .2 * hash(seed + i)), r * h * .85], fill: i % 2 ? P.leafDk : P.leaf }));
      parts(blobs, wgt);
    },
    // Leaf centred at (x, y), w long and h wide, rotated by angle; cut (0..1) bites a half circle out of one edge.
    leafPiece(x, y, w, h, angle = 0, color = P.leaf, cut = 0) {
      c.save(); c.translate(x, y); c.rotate(angle);
      if (cut > 0) { c.beginPath(); c.rect(-w, -h * 2, w * 2, h * 4); c.arc(w * .1, -h * .5, cut * h * .9, 0, TAU, true); c.clip('evenodd'); }
      c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, -h, w / 2, 0); c.quadraticCurveTo(0, h, -w / 2, 0); c.closePath();
      c.fillStyle = color; c.fill(); c.strokeStyle = P.ink; c.lineWidth = clamp(h * .12, 1.5, 4); c.lineJoin = 'round'; c.stroke();
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
      c.fillStyle = P.water; c.fill();
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
