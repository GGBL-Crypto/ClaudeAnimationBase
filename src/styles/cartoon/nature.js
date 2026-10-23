// Cartoon NatureArt: creatures drawn from creaturePose (src/nature/creature.js) and environment pieces. Pure functions of
// their arguments; no state between calls. Creatures are cut-out puppets: each piece of parts.js (or of an imported
// character, look.rig) is pinned to a bone of the pose (NatureArt.decor[spec].build lists them in groups by layer) and
// drawn as one flat silhouette per group with a thick black outline (2000s TV cartoon: flat colour, no gradient, no
// paper grain). Below 28 px a flat simplified form.
(() => {
  const c = window.animationEngine.context, P = STYLE.palette, PI2 = Math.PI / 2, PARTS = CARTOON_PARTS;
  const dark = (col, k = .3) => mixCol(col, P.ink, k);
  const pale = col => mixCol(col, P.skyLow, .4);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // Ellipses {e} and polygons {poly} (smooth: curves through midpoints) as one inked silhouette (rocks, clouds):
  // outlines first, then the flat fills.
  function shape(p) {
    c.beginPath();
    if (p.e) { const [x, y, rx, ry, rot = 0] = p.e; c.ellipse(x, y, rx, ry, rot, 0, TAU); }
    else if (p.smooth) { const q = p.poly, n = q.length, m = i => [(q[i % n][0] + q[(i + 1) % n][0]) / 2, (q[i % n][1] + q[(i + 1) % n][1]) / 2]; c.moveTo(...m(n - 1)); for (let i = 0; i < n; i++) c.quadraticCurveTo(q[i][0], q[i][1], ...m(i)); c.closePath(); }
    else { c.moveTo(...p.poly[0]); p.poly.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); }
  }
  function parts(list, lw) {
    c.lineWidth = 2 * lw; c.lineJoin = 'round'; c.strokeStyle = P.line;
    if (lw > 0) for (const p of list) { shape(p); c.stroke(); }
    for (const p of list) { shape(p); c.fillStyle = p.fill; c.fill(); }
  }
  const stroke = (pts, w, col = P.ink, smooth = true) => Kit.line(pts, col, w, { smooth });
  const dot = (x, y, r, col) => { c.beginPath(); c.ellipse(x, y, r, r, 0, 0, TAU); c.fillStyle = col; c.fill(); };

  // ---------- cut-out pieces ----------
  // Path2D per path string and the box of each part (centre and half extents, in its units), both built once.
  const PATHS = new Map(), BOXES = new Map();
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
    const A = PARTS[p.spec], R = L.rig && PARTS.rigs[L.rig], top = p.view !== 'side';
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
  function cut(list, lw, fw = 0, ink = P.line) {
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = ink;
    if (lw > 0) for (const s of list) if (!s.q.art) inside(s, u => { c.lineWidth = 2 * lw * u; c.stroke(path(s.q.d)); });
    for (const s of list) inside(s, () => { if (s.q.art) art(s); else { c.fillStyle = s.fill; c.fill(path(s.q.d)); } });
    for (const s of list) if (s.spots || fw && s.q.lines) inside(s, u => {
      for (const [p, col] of s.spots || []) { c.fillStyle = col; c.fill(p); }
      if (fw && s.q.lines) { c.lineWidth = fw * u; for (const d of s.q.lines) c.stroke(path(d)); }
    });
  }
  // Group of pieces at the layer of its first piece (far side of a side view: 10 layers back).
  const grp = (list, back = false) => ({ z: list[0].q.layer - (back ? 10 : 0), list });
  // Outline: STYLE.outline.weight px on a main character (BL ≥ 200 px), thinner on small ones; inner lines half of it.
  const lw = p => clamp(p.size * .03, 1.5, STYLE.outline.weight), fwOf = p => p.size < 60 ? 0 : .5 * lw(p);
  const headR = p => SPECS[p.spec].head.r * p.size * (decor[p.spec].headScale || 1);  // drawn head radius (Lia's is big)
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
      c.lineWidth = Math.max(1.5, w) * u; c.strokeStyle = P.line; c.lineCap = 'round';
      if (blink > .5) { c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.stroke(); return; }
      c.beginPath(); c.ellipse(x, y, r, r * 1.15, 0, 0, TAU); c.fillStyle = P.eye; c.fill(); c.stroke();
      c.beginPath(); c.ellipse(x + .38 * r, y + .1 * r, .3 * r, .36 * r, 0, 0, TAU); c.fillStyle = P.line; c.fill();
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
      // Head, mesosoma, petiole and gaster are separate inked forms on a thin dark waist; far legs and antennae are
      // thinner and paler so the side view does not tangle. All legs go behind the body.
      look: { color: P.purple, dark: P.purpleDk },
      build(p, L) {
        const top = p.view !== 'side', Q = pieces(p, L), G = [], o = { L }, [th, pe, ga] = p.spine, hd = [p.head.x, p.head.y], S = p.size;
        for (const l of Object.values(p.limbs)) { const k = l.far ? { L, col: pale(L.color), wy: .7 } : o; G.push({ ...grp([pin(p, Q.femur, l.root, l.mid, k), pin(p, Q.tibia, l.mid, l.end, k)], l.far), z: l.far ? -8 : 2 }); }
        const antenna = (a, back) => () => { const pts = p.appendages[a], w = Math.max(1.2, (back ? .011 : .016) * S), col = back ? pale(L.color) : P.line; stroke(pts, w, col, false); dot(...pts.at(-1), w * 1.1, col); };
        for (const a of ['antennaL', 'antennaR']) G.push({ z: far(p, a) ? 1 : 7, draw: antenna(a, far(p, a)) });
        G.push(grp([pin(p, Q.stalk, pt(th), pt(ga), o), pin(p, Q.stalk, pt(th), hd, { L, wy: .9 })]));
        const gaster = pin(p, Q.gaster, pt(ga), ga.angle, o), meso = pin(p, Q.mesosoma, pt(th), th.angle, o), head = pin(p, Q.head, hd, p.head.angle, o);
        G.push(grp([gaster]), grp([pin(p, Q.petiole, pt(pe), pe.angle, o)]), grp([meso]), grp([head]));
        const ha = turn(p, p.head.angle);
        G.push(grp(top ? [-1, 1].map(s => pin(p, Q.mandible, at(head, 12.6, 5 * s), turn(p, ha + .35 * s), { L, wy: s })) : [pin(p, Q.mandible, at(head, 12.6, 7.8), turn(p, ha + .6), { L, wy: .8 })]));
        if (!head.q.art) G.push({ z: 6.5, draw: () => {
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
      const x0 = Math.min(...xs), x1 = Math.max(...xs), ry = clamp(.022 * S, 2, 14);
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
      const s = k * r * .3, x = p.head.x - f * r * .7, y = p.head.y - r * .5 + r * .5 * (1 - e.a) - (decor[p.spec].neck || 0) * p.size / 100;
      Kit.poly([[x - s * .7, y - s * .2], [x, y - s * 1.9], [x + s * .7, y - s * .2]], P.water, { stroke: false }); Kit.ellipse(x, y, s * .72, s * .8, P.water);
    } else {  // emoteAt = [ahead, up, size] in head radii
      const [ex, ey, es] = decor[p.spec].emoteAt || [1.2, 1.9, 1.6];
      c.save(); c.translate(p.head.x + f * r * ex, p.head.y - r * ey - (decor[p.spec].neck || 0) * p.size / 100); c.scale(k, k); Kit.text({ note: '♪', zzz: 'z z z' }[e.sym] || e.sym, 0, 0, Math.max(14, r * es), P.ink); c.restore();
    }
  }

  // p.smear (smear() in creature.js): the earlier poses of a fast move drawn first, in full colour and ink, so the
  // limbs that moved repeat behind the drawing (2000s TV smear); the parts that stayed hide under it.
  function creature(p, look = {}, ghost = false) {
    const D = decor[p.spec]; if (!D) throw new Error(`Sem desenho para o ser ${p.spec}`);
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
    // Loads the imported character assets/characters/<name>/ (call while the scene script loads); then
    // creature(pose, {rig: name}) uses its pieces in place of the authored ones of the same name.
    load(name, root) { const job = PARTS.load(name, root); loading.push(job); return job; },
    // Ground below profile(x) between x0 and x1, filled flat to the bottom under a darker edge. With color: a flat
    // distant layer (hills) with a thin black edge.
    ground(profile, x0 = 0, x1 = W, color = null) {
      const edgeLine = (dy, col, w) => { c.beginPath(); for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), profile(Math.min(x, x1)) + dy); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
      c.beginPath(); c.moveTo(x0, H * 4);
      for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), profile(Math.min(x, x1)));
      c.lineTo(x1, H * 4); c.closePath();
      if (color) {
        // Clumps of bushes along the rim (authored silhouettes), seeded by the layer's own profile so they stay put as
        // the camera moves; drawn first, so the hill hides their lower half.
        const B = PARTS.scenery.bush, sd = Math.round(profile(0)), tone = mixCol(color, P.ink, .14);  // the layer's second tone
        c.save();
        for (let k = Math.floor(x0 / 150) - 1; k * 150 < x1 + 150; k++) {
          if (hash(k * 1.3 + sd) > .6) continue;
          const s = .5 + .6 * hash(k * 2.1 + sd), bx = k * 150 + 70 * hash(k + sd * .7), q = scene(B[Math.floor(hash(k * 3.7 + sd) * B.length)]);
          inside(place(q, [bx, profile(bx) + 5 * s], 0, s, hash(k + sd + .5) < .5 ? -1 : 1, 1, tone), u => { const p = path(q.d); c.fillStyle = tone; c.fill(p); c.lineWidth = 3 * u; c.strokeStyle = P.line; c.stroke(p); });
        }
        c.restore();
        c.beginPath(); c.moveTo(x0, H * 4);
        for (let x = x0; x <= x1 + 15; x += 16) c.lineTo(Math.min(x, x1), profile(Math.min(x, x1)));
        c.lineTo(x1, H * 4); c.closePath(); c.fillStyle = color; c.fill(); edgeLine(0, P.line, 3); return;
      }
      c.fillStyle = P.ground; c.fill(); edgeLine(0, P.groundDk, STYLE.outline.weight);  // no black here: the grass blades over it would dash it
    },
    // Ground props along profile between x0 and x1, about one per 130 · s px and fixed by seed as the camera moves:
    // stones, flowers, a fence run, stumps and mushrooms (kinds: letters of 'sfwtm'). Two flat tones each (base and its
    // shaded side), a thinner outline than the characters and haze (0..1) toward the sky on far layers, so the characters
    // keep the strongest contrast in the frame.
    props(profile, x0, x1, seed = 0, s = 1, haze = 0, kinds = 'sfwtm') {
      const hz = col => mixCol(col, P.skyLow, haze), sh = col => hz(mixCol(col, P.ink, .25)), w = haze > .3 ? 1 : clamp(1.6 * s, 1, 2.5), step = 130 * s;
      const ink = mixCol(P.line, P.skyLow, .6 * haze);
      const draw = (list, lw = w) => { c.lineWidth = 2 * lw; c.lineJoin = 'round'; c.strokeStyle = ink; if (lw) for (const p of list) { shape(p); c.stroke(); } for (const p of list) { shape(p); c.fillStyle = p.fill; c.fill(); } };
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
    blade(x, y, h, bend, color = P.grass) {
      const tx = x + Math.sin(bend) * h, ty = y - Math.cos(bend) * h, mx = x + Math.sin(bend * .5) * h * .55, my = y - Math.cos(bend * .5) * h * .55, b = Math.max(1.5, h * .07);
      c.beginPath(); c.moveTo(x - b, y); c.quadraticCurveTo(mx - b * .6, my, tx, ty); c.quadraticCurveTo(mx + b * .6, my, x + b, y); c.closePath(); c.fillStyle = color; c.fill();
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
      cut([place(scene(kind === 'pine' ? S.pineTrunk : pick(S.trunk, 1)), [x, y], f * .35 * bend, u, f, 1, hz(P.wood))], wgt, 0, ink);
      cut([crown], wgt, 0, ink);
      if (kind !== 'pine') inside(crown, k => {  // leaf clusters: short ink arcs on three masses
        const b = box(crown.q); c.beginPath();
        for (const [dx, dy] of [[-.42, -.25], [.36, .05], [-.05, .42]]) { const r = .24 * Math.min(b.hw, b.hh), cx = b.cx + dx * b.hw, cy = b.cy + dy * b.hh; c.moveTo(cx + Math.cos(.2) * r, cy + Math.sin(.2) * r); c.arc(cx, cy, r, .2, 1.7); }
        c.strokeStyle = ink; c.lineWidth = .6 * wgt * k; c.lineCap = 'round'; c.stroke();
      });
    },
    // Leaf centred at (x, y), w long and h wide, rotated by angle; cut (0..1) bites a half circle out of one edge.
    leafPiece(x, y, w, h, angle = 0, color = P.leaf, cut = 0) {
      c.save(); c.translate(x, y); c.rotate(angle);
      if (cut > 0) { c.beginPath(); c.rect(-w, -h * 2, w * 2, h * 4); c.arc(w * .1, -h * .5, cut * h * .9, 0, TAU, true); c.clip('evenodd'); }
      c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, -h, w / 2, 0); c.quadraticCurveTo(0, h, -w / 2, 0); c.closePath();
      c.fillStyle = color; c.fill(); c.strokeStyle = P.line; c.lineWidth = clamp(h * .12, 1.5, 4); c.lineJoin = 'round'; c.stroke();
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
