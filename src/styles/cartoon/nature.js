// Cartoon NatureArt: creatures drawn from creaturePose (src/nature/creature.js) and environment pieces. Pure functions of
// their arguments; no state between calls. Creatures are cut-out puppets: each piece of parts.js (or of an imported
// character, look.rig) is pinned to a bone of the pose (NatureArt.decor[spec].build lists them in groups by layer) and
// drawn as one flat silhouette per group with a thick black outline (2000s TV cartoon: flat colour, no gradient, no
// paper grain). Below 28 px a flat simplified form.
(() => {
  let c = window.animationEngine.context;  // swapped by Kit.into (drawing into an offscreen canvas)
  const P = STYLE.palette, PI2 = Math.PI / 2, PARTS = CARTOON_PARTS;
  const dark = (col, k = .3) => mixCol(col, P.ink, k);
  const pale = col => mixCol(col, P.skyLow, .4);
  const BROOD = mixCol(P.cream, P.cloud, .4);  // eggs, larvae and pupae
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  // Rich look: outlines in the object's own colour family (never black), light from the top left.
  const inkOf = col => mixCol(col, '#1A0E12', .62), lightOf = col => mixCol(col, P.sun, .45), shadeOf = col => mixCol(col, P.shade, .38);
  // Radial light, base, shadow fill for a form centred (x, y) with half sizes rx, ry, in the current space.
  function vol(x, y, rx, ry, col) {
    const r = Math.max(rx, ry), g = c.createRadialGradient(x - .35 * rx, y - .4 * ry, .05 * r, x, y, 1.15 * r);
    g.addColorStop(0, lightOf(col)); g.addColorStop(.55, col); g.addColorStop(1, shadeOf(col)); return g;
  }
  // Specular glint on the lit top of a round form (polished chitin), r its smaller half size.
  const glint = (x, y, r, a = .25) => { c.beginPath(); c.ellipse(x - .3 * r, y - .45 * r, .42 * r, .2 * r, -.3, 0, TAU); c.fillStyle = `rgba(255,255,255,${a})`; c.fill(); };

  // Ellipses {e} and polygons {poly} (smooth: curves through midpoints) as one inked silhouette (rocks, clouds):
  // outlines first, then the flat fills.
  function shape(p) {
    c.beginPath();
    if (p.e) { const [x, y, rx, ry, rot = 0] = p.e; c.ellipse(x, y, rx, ry, rot, 0, TAU); }
    else if (p.smooth) { const q = p.poly, n = q.length, m = i => [(q[i % n][0] + q[(i + 1) % n][0]) / 2, (q[i % n][1] + q[(i + 1) % n][1]) / 2]; c.moveTo(...m(n - 1)); for (let i = 0; i < n; i++) c.quadraticCurveTo(q[i][0], q[i][1], ...m(i)); c.closePath(); }
    else { c.moveTo(...p.poly[0]); p.poly.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); }
  }
  const extent = p => { if (p.e) return p.e; const xs = p.poly.map(q => q[0]), ys = p.poly.map(q => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys); return [(x0 + Math.max(...xs)) / 2, (y0 + Math.max(...ys)) / 2, (Math.max(...xs) - x0) / 2, (Math.max(...ys) - y0) / 2]; };
  function parts(list, lw) {
    c.lineWidth = 2 * lw; c.lineJoin = 'round';
    if (lw > 0) for (const p of list) { shape(p); c.strokeStyle = inkOf(p.fill); c.stroke(); }
    for (const p of list) { const [x, y, rx, ry] = extent(p); shape(p); c.fillStyle = vol(x, y, rx, ry, p.fill); c.fill(); }
  }
  const stroke = (pts, w, col = P.ink, smooth = true) => Kit.line(pts, col, w, { smooth });
  const dot = (x, y, r, col) => { c.beginPath(); c.ellipse(x, y, r, r, 0, 0, TAU); c.fillStyle = col; c.fill(); };

  // ---------- cut-out pieces ----------
  // Path2D per path string and the box of each part (centre and half extents, in its units), both built once.
  const PATHS = new Map(), BOXES = new Map(), SOIL = new Map();  // SOIL: soil() patterns by (height, seed), never by time
  const path = d => { let p = PATHS.get(d); if (!p) PATHS.set(d, p = new Path2D(d)); return p; };
  function box(q) {
    let b = BOXES.get(q.d); if (b) return b;
    const n = q.d.match(/-?\d*\.?\d+/g).map(Number), xs = n.filter((_, i) => !(i & 1)), ys = n.filter((_, i) => i & 1), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    BOXES.set(q.d, b = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: (x1 - x0) / 2, hh: (y1 - y0) / 2 }); return b;
  }
  // Part q with its pivot on a and its bone (len units along q.angle) along a → b; b a number: at that angle, unstretched.
  // u = px per unit, f = -1 mirrors (side view facing left; the angle is then measured in the mirrored, facing-right
  // space), wy scales the thickness (< 0 flips the part across its bone). Returns the placed piece {q, m, k, fill}.
  function place(q, a, b, u, f = 1, wy = 1, fill = P.ink) {
    const al = q.angle || 0; let th, kx;
    if (typeof b === 'number') { th = b; kx = u; } else { const dx = (b[0] - a[0]) * f, dy = b[1] - a[1]; th = Math.atan2(dy, dx); kx = Math.max(.2 * u, Math.hypot(dx, dy) / q.len); }
    const ky = u * wy, ct = Math.cos(th), st = Math.sin(th), ca = Math.cos(al), sa = Math.sin(al);
    const A = f * (kx * ct * ca + ky * st * sa), C = f * (kx * ct * sa - ky * st * ca), B = kx * st * ca - ky * ct * sa, E = kx * st * sa + ky * ct * ca, [px, py] = q.pivot;
    return { q, fill, k: Math.sqrt(Math.abs(A * E - B * C)), m: [A, B, C, E, a[0] - A * px - C * py, a[1] - B * px - E * py] };
  }
  // Screen angle ↔ the creature's facing-right space (the same flip both ways).
  const turn = (p, a) => p.view === 'side' && p.facing < 0 ? Math.PI - a : a;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  // Piece on a pose: b a point or a screen angle; o = {L (look), dk (darken), col (fill override), wy, sc (scale)}. An imported
  // piece with face variants shows the one for the blink or the expression.
  function pin(p, q, a, b, o) {
    if (q.faces) q = (p.face.blink > .5 && q.faces.blink) || q.faces[p.face.expression] || q;
    const f = p.view === 'side' ? p.facing : 1, col = o.col || dark(o.L[q.fill], o.dk || 0), s = place(q, a, typeof b === 'number' ? turn(p, b) : b, p.size / 100 * (o.sc || 1), f, o.wy || 1, col);
    if (q.spots) s.spots = q.spots.map(sp => [path(sp.d), o.col ? dark(col, .25) : dark(o.L[sp.fill], o.dk || 0)]);
    if (q.art) s.tint = o.col ? v => mixCol(v, o.col, .6) : o.dk ? v => dark(v, o.dk) : null;
    return s;
  }
  // Pieces of a pose by name: the authored side (and top) pieces, replaced by name by the imported character look.rig.
  function pieces(p, L) {
    const A = PARTS[kind(p.spec)], R = L.rig && PARTS.rigs[L.rig], top = p.view !== 'side';
    if (L.rig && !R) throw new Error(`Personagem não carregado: ${L.rig} (chame NatureArt.load('${L.rig}') ao carregar a cena)`);
    if (R && R.spec !== p.spec) throw new Error(`O personagem ${L.rig} é ${R.spec}, não ${p.spec}`);
    return { ...A.side, ...(top && A.top), ...(R && R.side), ...(top && R && R.top) };
  }
  const at = (s, x, y) => [s.m[0] * x + s.m[2] * y + s.m[4], s.m[1] * x + s.m[3] * y + s.m[5]];
  const ORIGIN = { d: 'M 0 0 Z', pivot: [0, 0], len: 1 };
  const frameAt = (p, x, y, a) => pin(p, ORIGIN, [x, y], a, { col: P.ink });  // local frame in BL / 100 (at(frame, dx, dy))
  // Draws inside a placed piece's frame; fn gets px → units.
  const inside = (s, fn) => { c.save(); c.transform(...s.m); try { fn(1 / s.k); } finally { c.restore(); } };

  // Imported art in its piece's frame (px of the part image, from its pivot q.origin; q.u px per unit): the SVG paths,
  // tinted like the authored fills (far side, pale), or the PNG bitmap as it is.
  function art(s) {
    const q = s.q;
    c.scale(1 / q.u, 1 / q.u); c.translate(-q.origin[0], -q.origin[1]);
    if (!q.art.paths) { c.drawImage(q.art, 0, 0); return; }
    for (const v of q.art.paths) { c.translate(v.x, v.y); c.fillStyle = s.tint ? s.tint(v.fill) : v.fill; c.fill(path(v.d)); c.translate(-v.x, -v.y); }
  }
  // Placed pieces as one flat inked silhouette: every black outline first (lw px outside the shape), then the flat
  // fills, then markings and inner lines, so overlapping joints show no seam. Imported pieces bring their own ink.
  // fw: inner line width in px (0: none); ink: outline and inner line colour.
  // Rich look: each piece lit in its own frame (round forms: radial light toward the top left of the screen, with a
  // glint when ink is not given, i.e. on creatures; long ones: linear across their thickness), outlines and inner lines
  // in the piece's colour family (ink overrides it). Glass pieces (wings): translucent fill, thin outline and veins.
  function litFill(s) {
    const b = box(s.q), [A, B, C, E] = s.m, det = A * E - B * C, col = s.fill;
    const loc = (dx, dy) => { const x = (E * dx - C * dy) / det, y = (-B * dx + A * dy) / det, n = Math.hypot(x, y) || 1; return [x / n, y / n]; };
    const [lx, ly] = loc(-.6, -.8), r = Math.max(b.hw, b.hh);
    let g;
    if (Math.min(b.hw, b.hh) / r < .45) {
      const th = Math.min(b.hw, b.hh), sx = b.hw < b.hh ? Math.sign(lx || 1) * th : 0, sy = b.hw < b.hh ? 0 : Math.sign(ly || 1) * th;
      g = c.createLinearGradient(b.cx + sx, b.cy + sy, b.cx - sx, b.cy - sy);
    } else g = c.createRadialGradient(b.cx + .4 * r * lx, b.cy + .4 * r * ly, .05 * r, b.cx, b.cy, 1.15 * r);
    g.addColorStop(0, lightOf(col)); g.addColorStop(.5, col); g.addColorStop(1, shadeOf(col)); return g;
  }
  function glass(s, lw) {
    inside(s, u => {
      const b = box(s.q), g = c.createLinearGradient(b.cx - b.hw, 0, b.cx + b.hw, 0), p = path(s.q.d);
      g.addColorStop(0, rgba(lightOf(s.fill), .72)); g.addColorStop(.6, rgba(s.fill, .42)); g.addColorStop(1, rgba(P.cloud, .22));
      c.fillStyle = g; c.fill(p); c.strokeStyle = rgba(inkOf(s.fill), .7); c.lineWidth = Math.max(1, .5 * lw) * u; c.stroke(p);
      c.lineWidth = Math.max(.7, .25 * lw) * u; c.strokeStyle = rgba(inkOf(s.fill), .45); for (const d of s.q.lines || []) c.stroke(path(d));
    });
  }
  function cut(list, lw, fw = 0, ink) {
    c.lineJoin = 'round'; c.lineCap = 'round';
    const solid = list.filter(s => !s.q.glass);
    if (lw > 0) for (const s of solid) if (!s.q.art) inside(s, u => { c.strokeStyle = ink || inkOf(s.fill); c.lineWidth = 2 * lw * u; c.stroke(path(s.q.d)); });
    for (const s of solid) inside(s, () => { if (s.q.art) art(s); else { c.fillStyle = litFill(s); c.fill(path(s.q.d)); } });
    for (const s of solid) if (s.spots || fw && s.q.lines) inside(s, u => {
      for (const [p, col] of s.spots || []) { c.fillStyle = col; c.fill(p); }
      if (fw && s.q.lines) { c.strokeStyle = ink || inkOf(s.fill); c.lineWidth = fw * u; for (const d of s.q.lines) c.stroke(path(d)); }
    });
    if (!ink) for (const s of solid) {
      const b = box(s.q), rm = Math.min(b.hw, b.hh) * s.k;
      if (!s.q.art && rm > 3 && Math.min(b.hw, b.hh) / Math.max(b.hw, b.hh) >= .45) glint(...at(s, b.cx, b.cy), rm);
    }
    for (const s of list) if (s.q.glass) glass(s, lw);
  }
  // Group of pieces at the layer of its first piece (far side of a side view: 10 layers back).
  const grp = (list, back = false) => ({ z: list[0].q.layer - (back ? 10 : 0), list });
  // Outline: STYLE.outline.weight px on a main character (BL ≥ 200 px), thinner on small ones; inner lines half of it.
  // Variants (queen, soldier...) draw with the pieces and decor of the creature they are like (spec.like).
  const kind = id => decor[id] ? id : SPECS[id]?.like || id;
  const lw = p => clamp(p.size * .03, 1.5, STYLE.outline.weight), fwOf = p => p.size < 60 ? 0 : .5 * lw(p);
  const headR = p => SPECS[p.spec].head.r * p.size * (decor[kind(p.spec)].headScale || 1);  // drawn head radius (Lia's is big)
  // Appendage points are far (behind the body) when their side faces away from the camera in side view.
  const far = (p, name) => { const ap = SPECS[p.spec].appendages.find(a => a.name === name); return p.view === 'side' && (ap.side || 0) * p.facing < 0; };
  const pt = g => [g.x, g.y];
  // Foot rocking with the shin (heel strike lifts the toe, push-off the heel), as a screen angle.
  const rock = (p, l, k = .25) => turn(p, k * (turn(p, ang(l.mid, l.end)) - PI2));

  // Lia's face in head units: two big white eyes (the far one smaller, toward the nose) with small pupils, lids
  // (expression × blink) and brows, then mouth and blush, all in black ink.
  function humanFace(p, L, hs) {
    const F = PARTS.human.face, E = F[p.face.expression] || F.neutral, lid = E.lid * (1 - (p.face.blink || 0)), [ex, ey] = F.eye.at, [fx, fy, fk] = F.eye.far;
    inside(hs, u => {
      const w = Math.max(1.5, .012 * p.size) * u;
      c.save(); c.globalAlpha = .35; c.fillStyle = P.blush; c.fill(path(F.blush)); c.restore();
      c.lineCap = c.lineJoin = 'round'; c.strokeStyle = P.line;
      for (const [dx, dy, k] of [[fx, fy, fk], [0, 0, 1]]) {
        c.save(); c.translate(ex + dx, ey + dy); c.scale(k, k); c.translate(-ex, -ey);
        if (E.eye === 'x' || E.eye === 'arc') { c.lineWidth = w * 1.2 / k; c.stroke(path(F.eye[E.eye])); }
        else {
          const wide = E.eye === 'wide', eye = path(F.eye[E.eye]), ry = F.eye.ry[E.eye], top = ey - ry;
          c.fillStyle = P.eye; c.fill(eye);
          const r = wide ? 1.3 : 1.7;
          c.beginPath(); c.ellipse(ex + 2.6, ey + 1 + 2 * (E.look || 0), r, r * 1.2, 0, 0, TAU); c.fillStyle = P.line; c.fill();
          if (lid < 1) {  // upper lid in skin, slanting down toward the nose when angry
            const y = top + (1 - lid) * 2 * ry, s = E.slant ? 1.6 : 0, a = [ex + 8, y + s], b = [ex - 8, y - s];
            c.save(); c.clip(eye); c.beginPath(); c.moveTo(ex + 8, top - 2); c.lineTo(ex - 8, top - 2); c.lineTo(...b); c.lineTo(...a); c.closePath(); c.fillStyle = L.skin; c.fill(); c.restore();
            c.beginPath(); c.moveTo(...b); c.lineTo(...a); c.lineWidth = w / k; c.stroke();
          }
          c.lineWidth = w / k; c.stroke(eye);
        }
        if (E.brow) { c.lineWidth = w * 1.3 / k; c.stroke(path(E.brow)); }
        c.restore();
      }
      const M = F.mouths[p.face.mouth] || E.mouth;  // a talking or reacting shape replaces the expression's mouth
      if (M.fill) { c.fillStyle = mixCol(P.line, P.blush, .3); c.fill(path(M.d)); c.lineWidth = w * .8; c.stroke(path(M.d)); } else { c.lineWidth = w; c.stroke(path(M.d)); }
    });
  }
  // Round white eye with a small pupil looking forward at local (x, y) of a frame (units), inked w px; blink closes it
  // to a line.
  function eyeAt(s, x, y, r, blink, w) {
    inside(s, u => {
      c.lineWidth = Math.max(1.5, w) * u; c.strokeStyle = inkOf(s.fill); c.lineCap = 'round';
      if (blink > .5) { c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.stroke(); return; }
      // Socket shade, sclera with a soft cream gradient, pupil and two catchlights.
      c.beginPath(); c.ellipse(x, y + .12 * r, r * 1.12, r * 1.27, 0, 0, TAU); c.fillStyle = shadeOf(s.fill); c.fill();
      const g = c.createRadialGradient(x - .3 * r, y - .35 * r, .05 * r, x, y, 1.2 * r); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, mixCol(P.eye, P.shade, .18));
      c.beginPath(); c.ellipse(x, y, r, r * 1.15, 0, 0, TAU); c.fillStyle = g; c.fill(); c.stroke();
      c.beginPath(); c.ellipse(x + .38 * r, y + .1 * r, .3 * r, .36 * r, 0, 0, TAU); c.fillStyle = P.line; c.fill();
      dot(x + .28 * r, y - .06 * r, .12 * r, '#FFFFFF'); dot(x + .5 * r, y + .28 * r, .05 * r, rgba(P.cloud, .8));
    });
  }

  // Species decorators: look (default colours; fill keys of parts.js) and build(p, L) → [{z, list} | {z, draw}], drawn in z
  // order. The side view draws the far limbs 10 layers back, so each side keeps a fixed layer order: far limbs, body,
  // head, near limbs, accessories. Lia: far legs and arms (-6, -2), scarf tail 2, near legs 4, body 5, neck 5.3, scarf
  // 5.5, head 6.2 (ear, hair, face to 6.5), near arm 8, hand 8.6, hat 9.4: an arm passes in front of the head, never
  // under the face. Bento: far legs, tail, near legs under the body (they come from beneath it), body and neck 5, head
  // 5.2 (its own outline over the neck), collar 6, near ear 8. Pieces come from
  // pieces(p, L) (an imported character replaces them by name); an imported head brings its own face, so the drawn
  // eyes and mouth are skipped.
  const HANDS = { open: 'hand', point: 'handPoint', fist: 'handFist' };  // limb.hand → glove piece
  const decor = {
    human: {
      look: { color: P.mustard, skin: P.skin, hair: P.hair, shirt: P.mustard, pants: P.shorts, shoe: P.boot, sole: P.bootDk, scarf: P.hero, hat: P.olive, hatBand: P.oliveDk },
      // The head pieces are drawn at HEAD of their units and neck units above the pose's head (emotes follow), so head and hat are
      // about 1/3 of her height and a short neck shows between the chin and the scarf.
      headScale: 2.4, emoteAt: [1.8, 2.6, 1.6], neck: 9,  // drawn head radius .16 BL, neck units above the pose's head; the emote beside the hat crown
      build(p, L) {
        const Q = pieces(p, L), G = [], [ch, pe] = p.spine, o = { L }, h = p.appendages.hair, HEAD = .64, NECK = decor.human.neck, oh = { L, sc: HEAD };
        for (const [name, l] of Object.entries(p.limbs)) {
          const k = { L, dk: l.far ? .28 : 0 };
          if (name.startsWith('leg')) { G.push(grp([pin(p, Q.shoe, l.end, rock(p, l), k)], l.far), grp([pin(p, Q.thigh, l.root, l.mid, k), pin(p, Q.shin, l.mid, l.end, k)], l.far)); }
          else G.push(grp([pin(p, Q.upperArm, l.root, l.mid, k), pin(p, Q.forearm, l.mid, l.end, k)], l.far), grp([pin(p, Q[HANDS[l.hand]] || Q.hand, l.end, ang(l.mid, l.end), k)], l.far));  // the hand alone, over its forearm
        }
        const torso = pin(p, Q.torso, pt(pe), pt(ch), o), hd = at(frameAt(p, p.head.x, p.head.y, p.head.angle), 0, -NECK);
        const head = pin(p, Q.head, hd, p.head.angle, oh), hair = pin(p, Q.hair, hd, p.head.angle, oh);
        G.push(grp([pin(p, Q.pelvis, pt(pe), pt(ch), o), torso]), grp([pin(p, Q.neck, at(torso, .8, -26), at(head, 1, 10), o)]), grp([pin(p, Q.scarf, pt(pe), pt(ch), o)]), grp([head]));
        // Scarf tail: from the back of the neck, trailing with the hair chain but hanging lower.
        if (h) G.push(grp([pin(p, Q.scarfTail, at(torso, -7, -30), turn(p, turn(p, ang(h[0], h[3])) - .35), o)]));
        // The hat rides the same spring as the hair (p.lag): it tips forward when she stops and rocks back.
        G.push(grp([pin(p, Q.ear, at(head, -2, -3.2), p.head.angle, oh)]), grp([hair]), grp([pin(p, Q.hat, hd, p.head.angle + p.facing * .35 * (p.lag || 0), oh)]));
        if (!head.q.art) G.push({ z: 6.5, draw: () => humanFace(p, L, head) });
        return G;
      },
    },
    dog: {
      look: { color: P.cream, dark: P.patch, nose: P.line, collar: P.hero, tag: P.gold },
      build(p, L) {
        const top = p.view !== 'side', Q = pieces(p, L), G = [], o = { L }, A = p.appendages, hd = [p.head.x, p.head.y];
        for (const [name, l] of Object.entries(p.limbs)) {
          const k = l.far ? { L, col: mixCol(L.color, P.furDk, .45) } : { L }, front = name.endsWith('F');  // far legs: warm darker cream
          G.push(grp([pin(p, front ? Q.armUpper : Q.hipUpper, l.root, l.mid, k), pin(p, Q.legLower, l.mid, l.end, k), pin(p, Q.paw, l.end, top ? ang(l.mid, l.end) : rock(p, l, .2), k)], l.far || top));
        }
        const t = A.tail;
        G.push(grp([pin(p, Q.tailSeg, t[0], t[1], o), pin(p, Q.tailSeg, t[1], t[2], { L, wy: .85 }), pin(p, Q.tailTip, t[2], t[3], o)]));
        for (const e of ['earL', 'earR']) { const back = !top && far(p, e); G.push({ ...grp([pin(p, Q.ear, A[e][0], A[e].at(-1), { L, dk: back ? .2 : 0, wy: top && e === 'earR' ? -1 : 1 })]), z: back ? 2 : 8 }); }
        const neck = [pt(p.spine[0]), hd], head = pin(p, Q.head, hd, p.head.angle, o);
        G.push(grp([pin(p, Q.body, pt(p.spine.at(-1)), pt(p.spine[0]), o), pin(p, Q.neck, ...neck, o)]), grp([head]));  // the head's own outline marks the jaw over the neck
        const collar = pin(p, Q.collar, ...neck, o);
        G.push(grp([collar, ...(top ? [] : [pin(p, Q.tag, at(collar, 11.4, 11.2), PI2, o)])]));
        // Eyes: from above both, the patched one on the left; in profile the far eye peeks over the snout, then the
        // near one inside the patch, with its brow.
        if (!head.q.art) G.push({ z: 6.2, draw: () => {
          const w = Math.max(1.5, 1.4 * fwOf(p));
          if (top) for (const s of [-1, 1]) eyeAt(head, 6.6, 6.4 * s, 5.6, p.face.blink, w);
          else {
            eyeAt(head, 16, -12.5, 6.5, p.face.blink, w); eyeAt(head, 4.8, -8, 7.5, p.face.blink, w);
            inside(head, u => { c.beginPath(); c.moveTo(-2, -19.8); c.quadraticCurveTo(4.8, -23.6, 11, -20.2); c.lineWidth = w * u; c.strokeStyle = P.line; c.stroke(); });
          }
        } });
        return G;
      },
    },
    ant: {
      // Head, mesosoma, petiole and gaster are separate inked forms on a thin waist; far legs and antennae are
      // thinner and paler so the side view does not tangle. All legs go behind the body. Variants (spec.like = 'ant')
      // scale each form by their segment or head radius against the worker's. Winged specs (flyer) carry two pale wings:
      // folded along the back while walking, beating by wings.phase in flight (the far one behind the body).
      // Look options: wings (false: shed, a queen after the nuptial flight), jaws (0..1, mandibles open), eyes (false: none).
      look: { color: P.sauva, dark: P.sauvaDk, wing: mixCol(P.cloud, P.water, .25) },
      build(p, L) {
        const top = p.view !== 'side', Q = pieces(p, L), G = [], o = { L }, [th, pe, ga] = p.spine, hd = [p.head.x, p.head.y], S = p.size;
        const Z = SPECS[p.spec], A = SPECS.ant, sc = i => ({ L, sc: Z.spine[i].r / A.spine[i].r }), kh = Z.head.r / A.head.r;
        // Three segments: femur, tibia and tarsus (the last third of the pose's shin, bent toward the ground).
        for (const l of Object.values(p.limbs)) { const k = l.far ? { L, col: pale(L.color), wy: .7 } : o, ts = [lerp(l.mid[0], l.end[0], .66), lerp(l.mid[1], l.end[1], .66) - .012 * S]; G.push({ ...grp([pin(p, Q.femur, l.root, l.mid, k), pin(p, Q.tibia, l.mid, ts, k), pin(p, Q.tarsus, ts, l.end, k)], l.far), z: l.far ? -8 : 2 }); }
        const antenna = (a, back) => () => { const pts = p.appendages[a], w = Math.max(1.2, (back ? .011 : .016) * S), col = back ? pale(L.color) : inkOf(L.color); stroke(pts, w, col, false); dot(...pts.at(-1), w * 1.1, col); };
        for (const a of ['antennaL', 'antennaR']) G.push({ z: far(p, a) ? 1 : 7, draw: antenna(a, far(p, a)) });
        G.push(grp([pin(p, Q.stalk, pt(th), pt(ga), o), pin(p, Q.stalk, pt(th), hd, { L, wy: .9 })]));
        const gaster = pin(p, Q.gaster, pt(ga), ga.angle, sc(2)), meso = pin(p, Q.mesosoma, pt(th), th.angle, sc(0)), head = pin(p, Q.head, hd, p.head.angle, { L, sc: kh });
        G.push(grp([gaster]), grp([pin(p, Q.petiole, pt(pe), pe.angle, sc(1))]), grp([meso, ...(top ? [] : [pin(p, Q.spines, pt(th), th.angle, sc(0))])]), grp([head]));
        const ha = turn(p, p.head.angle), jaw = L.jaws || 0, mk = { L, sc: (1 + .5 * (kh - 1)) * (Z.jaws || 1) };  // jaws grow slower than the head
        G.push(grp(top ? [-1, 1].map(s => pin(p, Q.mandible, at(head, 12.6, 5 * s), turn(p, ha + (.35 + .55 * jaw) * s), { ...mk, wy: s })) : [pin(p, Q.mandible, at(head, 12.6, 7.8), turn(p, ha + .6 - .5 * jaw), { ...mk, wy: .8 })]));
        if (Z.flyer && L.wings !== false) {
          const w = p.wings, F = frameAt(p, th.x, th.y, th.angle), fl = Math.sin(TAU * w.phase), r0 = Z.spine[0].r * 100, g = Z.spine[2];
          const back = (g.offset + g.r) * 100 + 4, rise = ((g.h || 0) - (Z.spine[0].h || 0)) * 100 + .85 * g.r * 100;  // folded tip: past the gaster, on its back
          const wing = (s, dk) => pin(p, Q.wing, top ? at(F, 0, s * r0 * .4) : at(F, -2, -.9 * r0),
            w.open ? (top ? at(F, -16, s * 55 * (.35 + .65 * Math.abs(Math.cos(TAU * w.phase)))) : at(F, -20, -52 * fl - 4)) : top ? at(F, -back, s * 9) : at(F, -back, -rise), { L, dk, wy: top ? -s : w.open ? 1 : .55 });
          if (!top && w.open) G.push({ z: 2.5, list: [wing(-1, .2)] });
          for (const s of top ? [-1, 1] : [1]) G.push({ z: 7, list: [wing(s, 0)] });
        }
        if (!head.q.art && L.eyes !== false) G.push({ z: 6.5, draw: () => {
          const w = Math.max(1.5, 1.4 * fwOf(p));  // big white eyes: both from above; in profile the far one toward the jaw
          if (top) for (const s of [-1, 1]) eyeAt(head, 5, 7 * s, 4.4, p.face.blink, w);
          else { eyeAt(head, 11, -6.5, 4.6, p.face.blink, w); eyeAt(head, 4, -5, 5.6, p.face.blink, w); }
        } });
        return G;
      },
    },
    spider: {
      look: { color: P.brown, dark: mixCol(P.brown, P.ink, .4), mark: mixCol(P.brown, P.cloud, .5) },
      build(p, L) {
        const Q = pieces(p, L), top = p.view !== 'side', G = [], o = { L }, [ce, ab] = p.spine, hd = [p.head.x, p.head.y];
        for (const l of Object.values(p.limbs)) { const k = l.far ? { L, col: pale(L.color), wy: .7 } : o; G.push({ ...grp([pin(p, Q.femur, l.root, l.mid, k), pin(p, Q.tibia, l.mid, l.end, k)], l.far), z: l.far ? -8 : 2 }); }
        for (const a of ['palpL', 'palpR']) { const pp = p.appendages[a], back = far(p, a); G.push({ ...grp([pin(p, Q.palp, pp[0], pp.at(-1), back ? { L, col: pale(L.color), wy: .8 } : o)]), z: back ? 1 : 7 }); }
        const abd = pin(p, Q.abdomen, pt(ab), ab.angle, o), head = pin(p, Q.head, hd, p.head.angle, o), ha = turn(p, p.head.angle);
        const ceph = pin(p, Q.cephalo, pt(ce), ce.angle, o);
        G.push(grp([abd]), grp([ceph]));  // two balls: the head piece only anchors the fangs
        G.push(grp((top ? [-1, 1] : [1]).map(s => pin(p, Q.fang, at(head, 6, top ? 3 * s : 4), turn(p, ha + PI2 - .4 - (top ? 1.1 : 0)), { L, wy: top ? s : 1 }))));
        if (!head.q.art) G.push({ z: 6.5, draw: () => {
          const w = Math.max(1.5, 1.4 * fwOf(p));  // two big white eyes on the front ball
          if (top) for (const s of [-1, 1]) eyeAt(ceph, 9, 5.5 * s, 4.6, p.face.blink, w);
          else { eyeAt(ceph, 11, -8, 5, p.face.blink, w); eyeAt(ceph, 4.5, -7, 6.2, p.face.blink, w); }
        } });
        return G;
      },
    },
    bird: {
      look: { color: P.cloth, dark: P.clothDk, belly: P.cloud, beak: P.wing },
      build(p, L) {
        const top = p.view !== 'side', Q = pieces(p, L), G = [], o = { L }, [fr, re] = p.spine, hd = [p.head.x, p.head.y];
        for (const l of Object.values(p.limbs)) { const k = { L, dk: l.far ? .3 : 0 }; G.push({ ...grp([pin(p, Q.shank, l.root, l.mid, k), pin(p, Q.shank, l.mid, l.end, k), pin(p, Q.toes, l.end, top ? ang(l.mid, l.end) : turn(p, 0), k)]), z: l.far ? 1.5 : 2 }); }
        G.push(grp([pin(p, Q.tail, ...p.appendages.tail, o)]));
        // Wing from the shoulder: folded along the back, or flapping by wings.phase (the far one behind the body).
        const w = p.wings, F = frameAt(p, fr.x, fr.y, fr.angle), fl = Math.sin(TAU * (w ? w.phase : 0));
        const wing = (s, k) => {
          const tip = w && w.open ? (top ? at(F, -12, s * 50 * (.35 + .65 * Math.abs(Math.cos(TAU * w.phase)))) : at(F, -15, -45 * fl + 5)) : top ? at(F, -30, s * 10) : at(F, -32, -2);
          return pin(p, Q.wing, top ? at(F, 2, s * 10) : at(F, 5, -4), tip, { L, dk: k, wy: top ? -s : 1 });
        };
        if (!top && w && w.open) G.push({ z: 2.5, list: [wing(-1, .3)] });
        const head = pin(p, Q.head, hd, p.head.angle, o);
        G.push(grp([pin(p, Q.body, pt(re), pt(fr), o), pin(p, Q.neck, pt(fr), hd, o), head]), grp([pin(p, Q.beak, hd, p.head.angle, o)]));
        for (const s of top ? [-1, 1] : [1]) G.push({ z: 7, list: [wing(s, 0)] });
        if (!head.q.art) G.push({ z: 6.5, draw: () => {
          const w = Math.max(1.5, 1.4 * fwOf(p));
          if (top) for (const s of [-1, 1]) eyeAt(head, 5, 6.5 * s, 3.8, p.face.blink, w);
          else { eyeAt(head, 8.6, -4.2, 3.8, p.face.blink, w); eyeAt(head, 3.4, -3.2, 4.6, p.face.blink, w); }
        } });
        return G;
      },
    },
    fish: {
      // Cut-out body in three pieces along the waving spine (peduncle, mid, fore); narrower from above.
      look: { color: P.orange, dark: P.orangeDk, fin: P.wing, belly: P.wing },
      build(p, L) {
        const Q = pieces(p, L), top = p.view !== 'side', G = [], o = { L, wy: top ? .6 : 1 }, sp = p.spine, hd = [p.head.x, p.head.y], A = p.appendages;
        G.push(grp([pin(p, Q.caudal, A.caudal[0], A.caudal[2], { L, wy: top ? .35 : 1 })]));
        if (!top) G.push(grp([pin(p, Q.dorsal, pt(sp[3]), pt(sp[1]), o)]), grp([pin(p, Q.anal, pt(sp[3]), pt(sp[1]), o)]));
        const fore = pin(p, Q.fore, pt(sp[1]), hd, o);
        G.push(grp([pin(p, Q.peduncle, pt(sp[4]), pt(sp[3]), o), pin(p, Q.mid, pt(sp[3]), pt(sp[1]), o), fore]));
        G.push(grp(top ? [-1, 1].map(s => pin(p, Q.pectoral, at(fore, 16, 14 * s), turn(p, sp[1].angle + s * (2.3 + .25 * Math.sin(ang(...A.pectoral) - sp[1].angle))), { L, wy: -s })) : [pin(p, Q.pectoral, ...A.pectoral, o)]));
        if (!fore.q.art) G.push({ z: 6.5, draw: () => { for (const s of top ? [-1, 1] : [0]) inside(fore, u => { const x = 35, y = top ? 11 * s : -3, r = top ? 4.6 : 6.2; c.beginPath(); c.ellipse(x, y, r, r / o.wy, 0, 0, TAU); c.fillStyle = P.eye; c.fill(); c.lineWidth = Math.max(1.5, fwOf(p)) * u; c.strokeStyle = P.line; c.stroke(); c.beginPath(); c.ellipse(x + .38 * r, y + .1 * r, .3 * r, .36 * r / o.wy, 0, 0, TAU); c.fillStyle = P.line; c.fill(); }); } });
        return G;
      },
    },
    fly: {
      // Phorid fly: humped thorax and striped abdomen in one silhouette, small head with one big eye, legs dangling as ink
      // lines, wings beating by wings.phase like the bird's (the far one behind the body).
      look: { color: mixCol(P.brown, P.ink, .45), dark: P.line, wing: mixCol(P.cloud, P.water, .25) },
      build(p, L) {
        const Q = pieces(p, L), G = [], o = { L }, [th, ab] = p.spine, w = p.wings, F = frameAt(p, th.x, th.y, th.angle), fl = Math.sin(TAU * (w ? w.phase : 0));
        const wing = dk => pin(p, Q.wing, at(F, -2, -11), w && w.open ? at(F, -14, -34 * fl - 6) : at(F, -30, -10), { L, dk });
        G.push({ z: 2.5, list: [wing(.25)] });
        G.push({ z: 3, draw: () => { for (const dx of [7, 0, -7]) stroke([at(F, dx, 8), at(F, dx + 5, 17), at(F, dx - 1, 25)], Math.max(1, .022 * p.size), L.dark, false); } });
        const head = pin(p, Q.head, [p.head.x, p.head.y], p.head.angle, o);
        G.push(grp([pin(p, Q.abdomen, pt(ab), ab.angle, o), pin(p, Q.thorax, pt(th), th.angle, o)]), grp([head]), { z: 7, list: [wing(0)] });
        if (!head.q.art) G.push({ z: 6.5, draw: () => eyeAt(head, 3, -1.5, 5.6, p.face.blink, Math.max(1.2, 1.4 * fwOf(p))) });
        return G;
      },
    },
  };

  // Flat crowd form: no outline or face; limbs as thin lines.
  function simple(p, D, L) {
    const S = p.size, col = L.shirt || L.color, w = Math.max(1, .06 * S), r = headR(p);
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
      const x0 = Math.min(...xs), x1 = Math.max(...xs), ry = clamp(.022 * S, 2, 14), g = c.createRadialGradient((x0 + x1) / 2, y, 0, (x0 + x1) / 2, y, (x1 - x0) / 2 + .05 * S);
      g.addColorStop(0, rgba(P.shade, .5)); g.addColorStop(.7, rgba(P.shade, .25)); g.addColorStop(1, rgba(P.shade, 0)); c.fillStyle = g;  // soft occlusion
      c.ellipse((x0 + x1) / 2 + .02 * S, y + ry * .3, (x1 - x0) / 2 + .03 * S, ry, 0, 0, TAU);
      for (const l of feet) if (l.stance) { c.moveTo(l.end[0] + .035 * S, l.end[1]); c.ellipse(l.end[0], l.end[1] + ry * .2, .035 * S, ry * .6, 0, 0, TAU); }
    } else for (const g of p.spine) { c.moveTo(g.x + .05 * S + g.r * 1.3, g.y + .07 * S); c.ellipse(g.x + .05 * S, g.y + .07 * S, g.r * 1.3, g.r, g.angle, 0, TAU); }
    c.fill(); c.restore();
  }

  // Emote perto da cabeça ('!', '?', 'sweat', 'note', 'zzz'): entra numa mola (e.k passa de 1 e assenta) e encolhe ao
  // sumir (e.a).
  function emote(p) {
    const e = p.emote, r = headR(p), f = p.view === 'side' ? p.facing : 1, k = Math.min(e.k, ease(e.a));
    if (k <= 0) return;
    if (e.sym === 'sweat') {
      const s = k * r * .3, x = p.head.x - f * r * .7, y = p.head.y - r * .5 + r * .5 * (1 - e.a) - (decor[kind(p.spec)].neck || 0) * p.size / 100;
      Kit.poly([[x - s * .7, y - s * .2], [x, y - s * 1.9], [x + s * .7, y - s * .2]], P.water, { stroke: false }); Kit.ellipse(x, y, s * .72, s * .8, P.water);
    } else {  // emoteAt = [ahead, up, size] in head radii
      const D = decor[kind(p.spec)], [ex, ey, es] = D.emoteAt || [1.2, 1.9, 1.6];
      c.save(); c.translate(p.head.x + f * r * ex, p.head.y - r * ey - (D.neck || 0) * p.size / 100); c.scale(k, k); Kit.text({ note: '♪', zzz: 'z z z' }[e.sym] || e.sym, 0, 0, Math.max(14, r * es), P.ink, { plain: true }); c.restore();
    }
  }

  // p.smear (smear() in creature.js): the earlier poses of a fast move drawn first, in full colour and ink, so the
  // limbs that moved repeat behind the drawing (2000s TV smear); the parts that stayed hide under it.
  function creature(p, look = {}, ghost = false) {
    const D = decor[kind(p.spec)]; if (!D) throw new Error(`Sem desenho para o ser ${p.spec}`);
    if (p.smear && !ghost) for (const q of [...p.smear].reverse()) creature(q, look, true);
    const L = { ...D.look, ...look }, sq = p.sq || 0;
    if (sq) {  // squash (sq > 0) e stretch (sq < 0) a partir do chão sob o corpo, preservando o volume
      const fs = Object.values(p.limbs).filter(l => l.foot), x = (p.spine[0].x + p.spine.at(-1).x) / 2, y = fs.length ? Math.max(...fs.map(l => l.end[1])) : p.spine[0].y;
      c.save(); c.translate(x, y); c.scale(1 + .5 * sq, 1 - sq); c.translate(-x, -y);
    }
    try {
      if (!ghost) contact(p);
      if (p.size < 28) simple(p, D, L);
      else { const w = lw(p), fw = fwOf(p); for (const g of D.build(p, L).sort((a, b) => a.z - b.z)) if (g.draw) g.draw(); else cut(g.list, w, fw); }
      if (p.carry) NatureArt.leafPiece(p.carry.x, p.carry.y, p.carry.w, p.carry.h, p.carry.angle, P.leaf);
    } finally { if (sq) c.restore(); }
    if (p.emote && !ghost) emote(p);
  }

  // Scenery silhouettes from parts.js as pieces (pivot at the root, 100 units = full size), built once per path.
  const SCENE = new Map(), scene = d => { let q = SCENE.get(d); if (!q) SCENE.set(d, q = { d, pivot: [0, 0], len: 100 }); return q; };

  // Imported characters being loaded (animationEngine.init waits for them before the first frame).
  const loading = [];

  window.NatureArt = {
    creature, decor, loading,
    use(g) { const o = c; c = g; return o; },  // Kit.into: draw into another context
    // Loads the imported character assets/characters/<name>/ (call while the scene script loads); then
    // creature(pose, {rig: name}) uses its pieces in place of the authored ones of the same name.
    load(name, root) { const job = PARTS.load(name, root); loading.push(job); return job; },
    // Ground below profile(x) between x0 and x1, filled flat to the bottom under a darker edge. With color: a flat
    // distant layer (hills) with a thin black edge.
    ground(profile, x0 = 0, x1 = W, color = null) {
      const edgeLine = (dy, col, w) => { c.beginPath(); for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), profile(Math.min(x, x1)) + dy); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
      let top = Infinity;
      c.beginPath(); c.moveTo(x0, H * 4);
      for (let x = x0; x <= x1 + 15; x += 16) { const y = profile(Math.min(x, x1)); top = Math.min(top, y); c.lineTo(Math.min(x, x1), y); }
      c.lineTo(x1, H * 4); c.closePath();
      // Lit rim fading down into the base colour (aerial perspective on hills: paler toward the sky at the top).
      const fade = (col, lit, depth) => { const g = c.createLinearGradient(0, top, 0, top + depth); g.addColorStop(0, lit); g.addColorStop(.25, col); g.addColorStop(1, shadeOf(col)); return g; };
      if (color) {
        // Clumps of bushes along the rim (authored silhouettes), seeded by the layer's own profile so they stay put as
        // the camera moves; drawn first, so the hill hides their lower half.
        const B = PARTS.scenery.bush, sd = Math.round(profile(0)), tone = mixCol(color, P.ink, .14);  // the layer's second tone
        c.save();
        for (let k = Math.floor(x0 / 150) - 1; k * 150 < x1 + 150; k++) {
          if (hash(k * 1.3 + sd) > .6) continue;
          const s = .5 + .6 * hash(k * 2.1 + sd), bx = k * 150 + 70 * hash(k + sd * .7), q = scene(B[Math.floor(hash(k * 3.7 + sd) * B.length)]);
          const s2 = place(q, [bx, profile(bx) + 5 * s], 0, s, hash(k + sd + .5) < .5 ? -1 : 1, 1, tone);
          inside(s2, u => { const p = path(q.d); c.fillStyle = litFill(s2); c.fill(p); c.lineWidth = 3 * u; c.strokeStyle = inkOf(tone); c.stroke(p); });
        }
        c.restore();
        c.beginPath(); c.moveTo(x0, H * 4);
        for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), profile(Math.min(x, x1)));
        c.lineTo(x1, H * 4); c.closePath(); c.fillStyle = fade(color, mixCol(color, P.skyLow, .35), 500); c.fill(); edgeLine(0, inkOf(color), 2.5); return;
      }
      c.fillStyle = fade(P.ground, lightOf(P.ground), 420); c.fill(); edgeLine(0, P.groundDk, STYLE.outline.weight);  // no black here: the grass blades over it would dash it
    },
    // Ground props along profile between x0 and x1, about one per 130 · s px and fixed by seed as the camera moves:
    // stones, flowers, a fence run, stumps and mushrooms (kinds: letters of 'sfwtm'). Two flat tones each (base and its
    // shaded side), a thinner outline than the characters and haze (0..1) toward the sky on far layers, so the characters
    // keep the strongest contrast in the frame.
    props(profile, x0, x1, seed = 0, s = 1, haze = 0, kinds = 'sfwtm') {
      const hz = col => mixCol(col, P.skyLow, haze), sh = col => hz(mixCol(col, P.ink, .25)), w = haze > .3 ? 1 : clamp(1.6 * s, 1, 2.5), step = 130 * s;
      const ink = col => mixCol(inkOf(col), P.skyLow, .6 * haze);
      const draw = (list, lw = w) => { c.lineWidth = 2 * lw; c.lineJoin = 'round'; if (lw) for (const p of list) { shape(p); c.strokeStyle = ink(p.fill); c.stroke(); } for (const p of list) { shape(p); c.fillStyle = p.fill; c.fill(); } };
      for (let k = Math.floor(x0 / step) - 1; k * step < x1 + step; k++) {
        if (hash(k * 1.7 + seed) > .5) continue;
        const kind = kinds[Math.floor(hash(k * 2.9 + seed) * kinds.length)], x = k * step + .6 * step * hash(k + seed * .3), y = profile(x) + 3 * s, r = hash(k * 4.1 + seed), f = r < .5 ? -1 : 1;
        if (kind === 's') {  // stone: shaded body, lit top
          const a = (12 + 14 * r) * s;
          draw([{ smooth: true, poly: [[x - a, y], [x - .8 * a, y - .7 * a], [x + .1 * a, y - .9 * a], [x + a, y - .4 * a], [x + 1.1 * a, y]], fill: sh(P.stone) }]);
          draw([{ smooth: true, poly: [[x - .7 * a, y - .25 * a], [x - .6 * a, y - .65 * a], [x + .1 * a, y - .78 * a], [x + .55 * a, y - .45 * a]], fill: hz(P.stone) }], 0);
        } else if (kind === 'f') for (let i = 0; i < 3; i++) {  // three flowers: five petals around a darker heart
          const fx = x + (i - 1) * 9 * s + 4 * s * hash(k + i), fh = (16 + 12 * hash(k * 3 + i)) * s, col = [P.cloud, P.wing, P.light][Math.floor(hash(k + i * 5 + seed) * 3)], hx = fx + f * 2 * s, hy = y - fh;
          stroke([[fx, y], [hx, hy]], Math.max(1.5, 2 * s), hz(P.leafDk), false);
          draw([0, 1, 2, 3, 4].map(j => ({ e: [hx + Math.cos(j * 1.257) * 4 * s, hy + Math.sin(j * 1.257) * 4 * s, 3.4 * s, 3.4 * s], fill: hz(col) })), Math.min(w, 1.2));
          dot(hx, hy, 2.4 * s, sh(P.mustard));
        } else if (kind === 'w') {  // a fence run: two posts and two shaded rails
          const len = 70 * s, ph = 34 * s, xa = x - len / 2, xb = x + len / 2, ya = profile(xa) + 3 * s, yb = profile(xb) + 3 * s;
          draw([.75, .4].map(v => ({ poly: [[xa, ya - v * ph], [xb, yb - v * ph], [xb, yb - (v - .15) * ph], [xa, ya - (v - .15) * ph]], fill: sh(P.wood) })));
          for (const [px, py] of [[xa, ya], [xb, yb]]) draw([{ poly: [[px - 3.5 * s, py], [px - 3.5 * s, py - ph], [px, py - ph - 4 * s], [px + 3.5 * s, py - ph], [px + 3.5 * s, py]], fill: hz(P.wood) }]);
        } else if (kind === 't') {  // stump with a lighter cut top
          const a = (14 + 8 * r) * s, h = (18 + 10 * hash(k + 7)) * s;
          draw([{ poly: [[x - a * 1.2, y], [x - a, y - h], [x + a, y - h], [x + a * 1.2, y]], fill: sh(P.wood) }, { e: [x, y - h, a, a * .32], fill: hz(mixCol(P.wood, P.cloud, .45)) }]);
        } else if (kind === 'm') for (let i = 0; i < 2; i++) {  // two mushrooms: pale stem, orange cap with its shaded rim
          const mx = x + i * 14 * s * f, mh = (12 + 8 * hash(k + i)) * s * (1 - .3 * i), cw = (9 + 4 * r) * s * (1 - .3 * i);
          draw([{ poly: [[mx - .3 * cw, y], [mx - .25 * cw, y - mh], [mx + .25 * cw, y - mh], [mx + .3 * cw, y]], fill: hz(P.cloud) }, { smooth: true, poly: [[mx - cw, y - mh], [mx, y - mh - 1.1 * cw], [mx + cw, y - mh], [mx, y - mh + .3 * cw]], fill: hz(P.orange) }]);
          draw([{ e: [mx, y - mh + .02 * cw, .85 * cw, .16 * cw], fill: sh(P.orange) }], 0);
          dot(mx - .3 * cw, y - mh - .5 * cw, .14 * cw, hz(P.cloud)); dot(mx + .35 * cw, y - mh - .35 * cw, .1 * cw, hz(P.cloud));
        }
      }
    },
    // Flat sky in screen space; rain (0..1) greys it. (sx, sy), the old sun glow, are kept for the callers and unused.
    sky(rain = 0, sx = 330, sy = 160) {
      c.save(); c.resetTransform(); c.fillStyle = mixCol(P.skyTop, P.stone, .7 * rain); c.fillRect(0, 0, W, H); c.restore();
    },
    // Tuft of big dark leaves for the foreground frame (authored silhouettes, picked and mirrored by seed); sways gently with t.
    tuft(x, y, h, t = 0, seed = 0, color = mixCol(P.leafDk, P.ink, .5)) {
      const L = PARTS.scenery.leaf;
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * .2 + .2 * (hash(seed + i) - .5) + .05 * Math.sin(t * 1.3 + i + seed), f = hash(seed + i + 17) < .5 ? -1 : 1;
        cut([place(scene(L[Math.floor(hash(seed + i + 31) * L.length)]), [x + (i - 3) * h * .035, y], f * a, h * (.55 + .45 * hash(seed + i + 9)) / 100, f, 1, i & 1 ? color : mixCol(color, P.ink, .25))], 0);
      }
    },
    // Screen-space finish: climate grade (rain 0..1 turns it colder and darker). No paper grain: the TV look is flat.
    grade(rain = 0) {
      if (rain <= 0) return;
      c.save(); c.resetTransform(); c.globalCompositeOperation = 'multiply'; c.fillStyle = mixCol('#FFFFFF', '#8A9CBC', rain); c.fillRect(0, 0, W, H); c.restore();
    },
    // Grass blade rooted at (x, y), height h, leaning by bend radians (bladeBend).
    // Dark root to lit tip (drawOrganicGrassLayer), a thin outline in the blade's family on tall blades.
    blade(x, y, h, bend, color = P.grass) {
      const tx = x + Math.sin(bend) * h, ty = y - Math.cos(bend) * h, mx = x + Math.sin(bend * .5) * h * .55, my = y - Math.cos(bend * .5) * h * .55, b = Math.max(1.5, h * .07);
      const g = c.createLinearGradient(x, y, tx, ty); g.addColorStop(0, shadeOf(color)); g.addColorStop(.45, color); g.addColorStop(1, lightOf(color));
      c.beginPath(); c.moveTo(x - b, y); c.quadraticCurveTo(mx - b * .6, my, tx, ty); c.quadraticCurveTo(mx + b * .6, my, x + b, y); c.closePath(); c.fillStyle = g; c.fill();
      if (h > 60) { c.strokeStyle = inkOf(color); c.lineWidth = Math.max(1, h * .006); c.lineJoin = 'round'; c.stroke(); }
    },
    // Rock resting on y (flat base), radius r; the outline varies by seed.
    rock(x, y, r, seed = 0) {
      const pts = []; for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8, k = .8 + .3 * hash(seed * 31 + i); pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * .75 * k]); }
      pts[0][1] = pts[8][1] = y; pts.push([x, y + r * .1]); parts([{ smooth: true, poly: pts, fill: P.stone }], clamp(r * .06, 1.5, STYLE.outline.weight));
    },
    // Tree rooted at (x, y), height h; bend (wind) sways it from the root, the crown more than the trunk. The seed picks
    // the kind (round, tall or pine), the authored silhouette and its mirror; haze (0..1) fades it toward the sky for
    // distant layers (thinner outline past .3, also hazed).
    tree(x, y, h, bend = 0, seed = 0, haze = 0) {
      const S = PARTS.scenery, kind = ['round', 'tall', 'pine'][Math.floor(hash(seed * 5 + 1) * 3)], pick = (l, i) => l[Math.floor(hash(seed * 7 + i) * l.length)];
      const hz = col => mixCol(col, P.skyLow, haze), ink = mixCol(P.line, P.skyLow, .6 * haze), wgt = haze > .3 ? 2 : clamp(h * .02, 2, STYLE.outline.weight), f = hash(seed * 3 + 2) < .5 ? -1 : 1, u = h / 100;
      const crown = place(scene(pick(S[kind], 2)), [x, y], f * .5 * bend, u, f, 1, hz(kind === 'pine' ? P.leafDk : P.leaf));
      const sg = c.createRadialGradient(x, y, 0, x, y, .45 * h); sg.addColorStop(0, rgba(P.shade, .3 * (1 - haze))); sg.addColorStop(1, rgba(P.shade, 0));
      c.beginPath(); c.ellipse(x, y + .01 * h, .45 * h, .07 * h, 0, 0, TAU); c.fillStyle = sg; c.fill();  // cast shadow on the grass
      const trunk = place(scene(kind === 'pine' ? S.pineTrunk : pick(S.trunk, 1)), [x, y], f * .35 * bend, u, f, 1, hz(P.wood));
      cut([trunk], wgt, 0, mixCol(inkOf(P.wood), P.skyLow, .6 * haze));
      cut([crown], wgt, 0, mixCol(inkOf(crown.fill), P.skyLow, .6 * haze));
      if (kind !== 'pine') inside(crown, k => {  // leaf clusters: short ink arcs on three masses
        const b = box(crown.q);
        for (const [dx, dy] of [[-.42, -.25], [.36, .05], [-.05, .42]]) {  // lit top of each leaf mass
          const r = .4 * Math.min(b.hw, b.hh), cx = b.cx + dx * b.hw - .3 * r, cy = b.cy + dy * b.hh - .3 * r, g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, rgba(lightOf(crown.fill), .55)); g.addColorStop(1, rgba(lightOf(crown.fill), 0)); c.fillStyle = g; c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        }
        c.beginPath();
        for (const [dx, dy] of [[-.42, -.25], [.36, .05], [-.05, .42]]) { const r = .24 * Math.min(b.hw, b.hh), cx = b.cx + dx * b.hw, cy = b.cy + dy * b.hh; c.moveTo(cx + Math.cos(.2) * r, cy + Math.sin(.2) * r); c.arc(cx, cy, r, .2, 1.7); }
        c.strokeStyle = mixCol(inkOf(crown.fill), P.skyLow, .6 * haze); c.lineWidth = .6 * wgt * k; c.lineCap = 'round'; c.stroke();
      });
    },
    // Leaf centred at (x, y), w long and h wide, rotated by angle; cut (0..1) bites a half circle out of one edge.
    leafPiece(x, y, w, h, angle = 0, color = P.leaf, cut = 0) {
      c.save(); c.translate(x, y); c.rotate(angle);
      if (cut > 0) { c.beginPath(); c.rect(-w, -h * 2, w * 2, h * 4); c.arc(w * .1, -h * .5, cut * h * .9, 0, TAU, true); c.clip('evenodd'); }
      c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, -h, w / 2, 0); c.quadraticCurveTo(0, h, -w / 2, 0); c.closePath();
      const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, lightOf(color)); g.addColorStop(.5, color); g.addColorStop(1, shadeOf(color));
      c.fillStyle = g; c.fill(); c.strokeStyle = inkOf(color); c.lineWidth = clamp(h * .12, 1.5, 4); c.lineJoin = 'round'; c.stroke();
      // Light midrib with side veins.
      c.beginPath(); c.moveTo(-w * .45, 0); c.quadraticCurveTo(0, -h * .08, w * .4, 0);
      for (let i = 1; i < 5; i++) { const vx = -w * .4 + i * w * .17; c.moveTo(vx, -h * .04); c.lineTo(vx + w * .08, -h * .42); c.moveTo(vx, h * .02); c.lineTo(vx + w * .08, h * .38); }
      c.strokeStyle = rgba(mixCol(color, P.cloud, .5), .8); c.lineWidth = Math.max(1, h * .045); c.lineCap = 'round'; c.stroke(); c.restore();
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
    // Puffy cloud centred at (x, y), scale s (drawStylizedCloud): a cool shaded underside, then the lit body, no outline.
    cloud(x, y, s = 1, seed = 0) {
      const E = [[-80, 10, 50], [-25, -15, 62], [40, -5, 55], [85, 15, 40], [0, 22, 70]].map(([dx, dy, r], i) => [x + dx * s, y + dy * s, r * s * (.9 + .2 * hash(seed + i)), r * s * .7]);
      const puffs = dy => { c.beginPath(); for (const [ex, ey, rx, ry] of E) { c.moveTo(ex + rx, ey + dy); c.ellipse(ex, ey + dy, rx, ry, 0, 0, TAU); } };
      puffs(8 * s); c.fillStyle = mixCol(P.cloud, P.skyTop, .35); c.fill();
      const g = c.createLinearGradient(0, y - 70 * s, 0, y + 50 * s); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, mixCol(P.cloud, P.skyTop, .12));
      puffs(0); c.fillStyle = g; c.fill();
    },
    // Soil cross-section (drawUndergroundCrossSection): a world-anchored pattern of a periodic 1024 px tile with a
    // gradient from the crust down, wavy geological bands and lit pebbles, built once per (h, seed) at 2× (the camera
    // zooms in to ~1.8). The pebbles stay put as the camera moves.
    soil(x, y, w, h, seed = 0) {
      const key = h + '|' + seed;
      let pat = SOIL.get(key);
      if (!pat) {
        const TW = 1024, K = 2, cv = document.createElement('canvas'); cv.width = TW * K; cv.height = Math.ceil(h * K);
        const g = cv.getContext('2d'); g.scale(K, K);
        const top = mixCol(P.wood, P.ink, .22), mid = mixCol(P.wood, P.ink, .4), deep = mixCol(P.wood, P.ink, .62), gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, top); gr.addColorStop(.3, mid); gr.addColorStop(1, deep); g.fillStyle = gr; g.fillRect(0, 0, TW, h);
        for (let b = 0; b < 4; b++) {  // bands: periodic in x so the tile repeats seamlessly
          const by = h * (.12 + .22 * b), k1 = 2 + b, k2 = 5 + 2 * b, ph = TAU * hash(seed + b);
          g.beginPath(); g.moveTo(0, by);
          for (let px = 0; px <= TW; px += 16) g.lineTo(px, by + 18 * Math.sin(px * TAU * k1 / TW + ph) + 7 * Math.sin(px * TAU * k2 / TW));
          g.lineTo(TW, h); g.lineTo(0, h); g.closePath(); g.fillStyle = b === 1 ? rgba(mixCol(P.wood, P.mustard, .35), .16) : `rgba(20,8,4,${.12 + .05 * b})`; g.fill();
        }
        for (let i = 0, n = Math.round(TW * h / 7000); i < n; i++) {
          const px = TW * hash(seed + i * 3), py = h * hash(seed + i * 3 + 1), r = 3 + 8 * hash(seed + i * 3 + 2), col = i % 3 ? mixCol(P.wood, P.ink, .5) : mixCol(P.stone, P.wood, .3), a = hash(seed + i) * 3;
          for (const ox of [-TW, 0, TW]) {
            g.beginPath(); g.ellipse(px + ox, py, r * 1.3, r, a, 0, TAU); g.fillStyle = col; g.fill(); g.strokeStyle = inkOf(col); g.lineWidth = 1.2; g.stroke();
            g.beginPath(); g.ellipse(px + ox - .3 * r, py - .35 * r, .5 * r, .25 * r, -.3, 0, TAU); g.fillStyle = rgba(lightOf(col), .5); g.fill();
          }
        }
        SOIL.set(key, pat = c.createPattern(cv, 'repeat')); pat.setTransform(new DOMMatrix().scale(1 / K));
      }
      c.save(); c.translate(0, y); c.fillStyle = pat; c.fillRect(x, 0, w, h); c.restore();
    },
    // Tunnel dug along a makePath path, width px wide: dark rim, shaded inside, a lit floor and a dark ceiling line.
    tunnel(path, width) {
      const pts = []; for (let d = 0; d <= path.length; d += 12) { const q = path.at(d); pts.push([q.x, q.y]); }
      const q = path.at(path.length); pts.push([q.x, q.y]);
      stroke(pts, width + 10, mixCol(P.wood, P.ink, .7)); stroke(pts, width, mixCol(P.wood, P.ink, .32));
      stroke(pts.map(([x, y]) => [x, y + .18 * width]), .45 * width, mixCol(P.wood, P.ink, .16));
      stroke(pts.map(([x, y]) => [x, y - .3 * width]), .18 * width, mixCol(P.wood, P.ink, .5));
    },
    // Nest chamber dug in soil(): a cavity with its flat floor at y, w wide and h high around x, with the dark rim and the
    // lit inside of tunnel(). waste (0..1) heaps dark refuse on the floor (the waste chamber).
    chamber(x, y, w, h, seed = 0, waste = 0) {
      const pts = []; for (let i = 0; i < 14; i++) { const a = i * TAU / 14, k = .9 + .18 * hash(seed + i * 2.3); pts.push([x + Math.cos(a) * w / 2 * k, Math.min(y + 6, y - h / 2 + Math.sin(a) * h / 2 * k)]); }
      // Dark vault, warm lit floor: a radial gradient from the floor's centre.
      const g = c.createRadialGradient(x, y - .15 * h, .05 * w, x, y - .3 * h, .6 * w); g.addColorStop(0, mixCol(P.wood, P.sun, .12)); g.addColorStop(.55, mixCol(P.wood, P.ink, .25)); g.addColorStop(1, mixCol(P.wood, P.ink, .55));
      shape({ smooth: true, poly: pts }); c.lineJoin = 'round'; c.lineWidth = 10; c.strokeStyle = mixCol(P.wood, P.ink, .7); c.stroke(); c.fillStyle = g; c.fill();
      if (waste <= 0) return;
      const hw = .42 * w, top = u => y - waste * .45 * h * (1 - u * u), cols = [mixCol(P.wood, P.ink, .6), mixCol(P.stone, P.ink, .35), mixCol(P.leafDk, P.ink, .55), mixCol(P.cream, P.wood, .5)];
      const mound = []; for (let i = 0; i <= 12; i++) { const u = i / 6 - 1; mound.push([x + u * hw, i % 12 ? top(u) : y + 4]); }
      Kit.poly(mound, mixCol(P.wood, P.ink, .45), { stroke: false, smooth: true });
      for (let i = 0, n = Math.round(waste * w / 5); i < n; i++) { const u = 2 * hash(seed + i * 1.7) - 1, py = lerp(y, top(u), hash(seed + i * 2.9)); dot(x + u * hw, py, 2.5 + 4 * hash(seed + i * 3.3), cols[i % 4]); }
    },
    // Roots from (x, y) down into the soil, len px long when grown; grow (0..1) extends them tip first (map t to it). Each
    // root wanders by noise and forks twice, thinner each time: one pale silhouette with an ink edge.
    roots(x, y, len, grow = 1, seed = 0) {
      const lines = [];
      const root = (px, py, a, L, w, d, k, sd) => {
        if (k <= 0) return;
        const n = 10, m = n * Math.min(1, k), pts = [[px, py]], forks = [];
        for (let i = 1; i <= Math.ceil(m); i++) {
          const f = Math.min(1, m - i + 1); a += .25 * noise1(sd, i * .4); px += f * Math.cos(a) * L / n; py += f * Math.sin(a) * L / n; pts.push([px, py]);
          if (!d && (i === 3 || i === 6) && f === 1) forks.push([px, py, a + (i === 3 ? 1 : -1) * (.6 + .4 * hash(sd + i)), (k - i / n) / .55]);
        }
        lines.push([pts, w]);
        for (const [fx, fy, fa, fk] of forks) root(fx, fy, fa, L * .55, w * .6, d + 1, fk, sd * 1.7 + fa);
      };
      for (let j = 0; j < 3; j++) root(x + (j - 1) * len * .04, y, PI2 + (j - 1) * .4 + .3 * (hash(seed + j) - .5), len * (.7 + .3 * hash(seed + j + 5)), clamp(len * .03, 4, 14), 0, grow, seed * 3 + j + 1);
      const rc = mixCol(P.wood, P.cream, .45);
      for (const [pts, w] of lines) stroke(pts, w + 5, inkOf(rc));
      for (const [pts, w] of lines) stroke(pts, w, rc);
      for (const [pts, w] of lines) stroke(pts.map(([x, y]) => [x - .2 * w, y - .2 * w]), .35 * w, lightOf(rc));  // lit edge
    },
    // Fungus garden: a pale sponge of bubbles heaped on the floor at (x, y), up to w wide and h high, with pores; grow
    // (0..1) raises it from the floor, the bubbles breathe slowly with t; parasite (0..1) spreads a dark Escovopsis patch.
    fungus(x, y, w, h, t, seed = 0, grow = 1, parasite = 0) {
      if (grow <= 0) return;
      const n = Math.round(clamp(w * h / 1500, 12, 90)), B = [], base = mixCol(P.cream, P.cloud, .5), tone = mixCol(P.cream, P.wood, .18), pore = mixCol(P.cream, P.wood, .5);
      for (let i = 0; i < n; i++) {
        const u = 2 * hash(seed + i * 3.1) - 1, v = hash(seed + i * 5.7) * Math.sqrt(1 - u * u), r = (.07 + .05 * hash(seed + i * 1.9)) * Math.min(w, 1.6 * h) * (1 + .03 * Math.sin(t * 1.3 + i)) * grow;
        B.push({ e: [x + u * (w / 2 - r), y - (v * (h - r) + .8 * r) * grow, r, .85 * r], fill: i % 4 ? base : tone, i });
      }
      B.sort((a, b) => a.e[1] - b.e[1]);  // the lower bubbles in front
      parts(B, clamp(w * .005, 1.5, 3.5));
      for (const { e: [bx, by, r], i } of B) { dot(bx + .3 * r * Math.cos(i), by + .25 * r * Math.sin(i * 1.7), .12 * r, pore); if (i % 2) dot(bx - .35 * r, by + .3 * r, .08 * r, pore); }
      if (parasite <= 0) return;
      const s = B[Math.floor(hash(seed + 99) * B.length)].e, R = parasite * .22 * Math.min(w, h) * grow, mold = mixCol(P.leafDk, P.ink, .5);
      for (let i = 0; i < 9; i++) { const a = i * 2.4, d = R * .6 * hash(seed + i * 7.1); dot(s[0] + Math.cos(a) * d, s[1] + Math.sin(a) * d * .8, R * (.35 + .3 * hash(seed + i * 4.3)), mold); }
      for (let i = 0; i < 5; i++) dot(s[0] + R * .7 * (hash(seed + i) - .5), s[1] + R * .6 * (hash(seed + i + 9) - .5), R * .08, mixCol(mold, P.cloud, .5));
    },
    // Egg (about 0.04 BL of the worker) standing on y, r its half width: it rocks on its base by noise; hatch (0..1) cracks
    // it across, then tips the cap open.
    egg(x, y, r, t, seed = 0, hatch = 0) {
      const ry = 1.4 * r, cy = y - ry, w = clamp(r * .16, 1, 3), zy = -.25, u0 = Math.asin(zy);
      c.save(); c.translate(x, y); c.rotate(.18 * noise1(seed, t * .7)); c.translate(-x, -y);
      const arc = (a0, a1) => Array.from({ length: 13 }, (_, i) => { const u = a0 + (a1 - a0) * i / 12; return [x + r * Math.cos(u), cy + ry * Math.sin(u)]; });
      const zig = Array.from({ length: 7 }, (_, i) => [x - r * Math.cos(u0) + 2 * r * Math.cos(u0) * i / 6, cy + ry * (zy + (i & 1 ? -.1 : .1))]);  // left to right
      if (hatch < .3) {
        parts([{ e: [x, cy, r, ry], fill: BROOD }], w); dot(x + .35 * r, cy - .45 * ry, .18 * r, P.cloud);
        if (hatch > 0) stroke(zig.slice(0, 1 + Math.round(6 * hatch / .3)), w, P.line, false);
      } else {
        const L = zig[0], k = (hatch - .3) / .7;
        parts([{ poly: [...arc(u0, Math.PI - u0), ...zig], fill: BROOD }], w);
        c.save(); c.translate(L[0], L[1] - .3 * ry * k); c.rotate(-1.3 * k); c.translate(-L[0], -L[1]);
        parts([{ poly: [...arc(Math.PI - u0, TAU + u0), ...zig.slice().reverse()], fill: BROOD }], w); c.restore();
      }
      c.restore();
    },
    // Larva lying on y, size = its length in px (about 0.3 BL of the worker): a C of five segments opening toward facing,
    // with a small head at the top end; it curls and stretches by a sine (breathing) and the head nods by noise.
    larva(x, y, size, t, seed = 0, facing = 1) {
      const th = 2.5 + .45 * Math.sin(TAU * t / 2.4 + seed), R = size / th, rs = [.15, .2, .22, .2, .16].map(v => v * size);
      const segs = rs.map((r, i) => { const a = Math.PI - th / 2 + th * i / 4; return [Math.cos(a), Math.sin(a), r]; });
      const cy = y - Math.max(...segs.map(([, s, r]) => R * s + r)), on = a => [x + facing * R * Math.cos(a), cy + R * Math.sin(a)];
      const hp = on(Math.PI + th / 2 + .38 + .15 * noise1(seed, t * .8)), lw = clamp(size * .03, 1.2, 4);
      parts([...segs.map(([cx, sy, r]) => ({ e: [x + facing * R * cx, cy + R * sy, r, r], fill: BROOD })), { e: [...hp, .12 * size, .11 * size], fill: mixCol(BROOD, P.wood, .35) }], lw);
      for (let i = 0; i < 4; i++) {  // segment rings across the body
        const a = Math.PI - th / 2 + th * (i + .5) / 4, r = .63 * (rs[i] + rs[i + 1]) / 2, m = on(a), d = [facing * Math.cos(a), Math.sin(a)];
        stroke([[m[0] - d[0] * r, m[1] - d[1] * r], [m[0] + d[0] * r, m[1] + d[1] * r]], .5 * lw, P.line, false);
      }
      dot(hp[0] + facing * .05 * size, hp[1] + .03 * size, .025 * size, P.line);
    },
    // Pupa: the worker's pose folded (alive 0: legs under the body), pale and without eyes; still, but it twitches.
    pupa(x, y, size, t, seed = 0, facing = 1) {
      const path = makePath([[x - facing * 1e3, y], [x + facing * 1e3, y]]);
      c.save(); c.translate(x, y); c.rotate(.06 * noise1(seed, t * .6)); c.translate(-x, -y);
      creature(creaturePose(SPECS.ant, { path, s: 1e3 / size, size, ground: () => y, alive: 0, moving: 0, t, seed }), { color: BROOD, dark: mixCol(BROOD, P.wood, .3), eyes: false });
      c.restore();
    },
    // Minima riding the leaf a carrier holds (p.carry): it stands on the leaf's top edge, still; only its antennae and
    // mandibles move. k: its size relative to the carrier's.
    rider(p, t, seed = 0, k = .3) {
      const C = p.carry; if (!C) return;
      const a = p.view === 'side' ? (p.facing < 0 ? Math.PI : 0) : C.angle, ca = Math.cos(a), sa = Math.sin(a), size = k * p.size;
      const x = C.x - ca * .12 * C.w, y = C.y - sa * .12 * C.w, ground = gx => { const u = clamp((gx - C.x) / C.w + .5); return C.y - 2 * C.h * u * (1 - u); };
      const path = makePath([[x - ca * 1e3, y - sa * 1e3], [x + ca * 1e3, y + sa * 1e3]]);
      creature(creaturePose(SPECS.minima, { path, s: 1e3 / size, size, view: p.view, ground, moving: 0, t, seed }), { jaws: .5 + .5 * noise1(seed + 9, t * 1.4) });
    },
    // A shed wing (queen after the nuptial flight), its base at (x, y), len px long, at angle; flutter() makes it fall.
    wing(x, y, len, angle = 0, color = decor.ant.look.wing) {
      const q = PARTS.ant.side.wing; cut([place(q, [x, y], angle, len / q.len, 1, 1, color)], clamp(len * .03, 1.2, 3), clamp(len * .015, .8, 2));
    },
  };
})();
