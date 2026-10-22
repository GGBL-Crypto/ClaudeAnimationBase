// 30 s motion test: a person and a dog walk, stop and point at an ant trail; macro ants and a spider; a bird lands and
// flees the dog; rain makes everyone react; a fish swims under the rain. Shots 1, 2, 4 and the first half of 5 share one
// park world (same timelines, different cameras); the macro and the lake are worlds of their own.
(() => {
  const P = STYLE.palette, A = () => NatureArt;

  // Distance (BL) from velocity keys [[t, v BL/s], ...]: v linear between keys, held outside them; exact integral of v,
  // so s(t) is a pure function and speed changes stay smooth (no snapping feet).
  function run(t, keys, s0 = 0) {
    let s = s0 + keys[0][1] * Math.min(0, t - keys[0][0]), v = keys[0][1];
    for (let i = 1; i < keys.length && t > keys[i - 1][0]; i++) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i], u = Math.min(t, b) - a;
      v = va + (vb - va) * u / (b - a); s += (va + v) / 2 * u;
    }
    const [tl, vl] = keys[keys.length - 1];
    if (t > tl) { v = vl; s += vl * (t - tl); }
    return { s, speed: v, moving: clamp(Math.abs(v) / .3) };
  }
  // Moves the head (and what hangs from it) after creaturePose: looking down, sniffing, pecking. da > 0 lowers the gaze.
  function nod(p, dx, dy, da) {
    const hx = p.head.x + p.facing * dx * p.size, hy = p.head.y + dy * p.size, a = p.facing * da, co = Math.cos(a), si = Math.sin(a);
    const move = ([x, y]) => { x += hx - p.head.x; y += hy - p.head.y; return [hx + (x - hx) * co - (y - hy) * si, hy + (x - hx) * si + (y - hy) * co]; };
    for (const ap of SPECS[p.spec].appendages) if (ap.attach === 'head') p.appendages[ap.name] = p.appendages[ap.name].map(move);
    p.head = { x: hx, y: hy, angle: p.head.angle + a };
    return p;
  }
  const rainK = t => ease(seg(t, 20.2, 20.8));
  const feet = p => Object.values(p.limbs).filter(l => l.foot).map(l => l.end);
  // Splash ring plus two droplets on arcs, scaled by s.
  function splash(x, y, k, s) {
    const c = animationEngine.context; c.save(); c.translate(x, y); c.scale(s, s); A().ripple(0, 0, k);
    for (const j of [-1, 1]) { const [px, py] = arcPt([0, 0], [j * 26, 4], 22, k), r = 3 * (1 - k) + .5; Kit.ellipse(px, py, r, r, P.water); }
    c.restore();
  }
  // Drops falling from top to land(x, id) between x0 and x1, ramped in by rainK at each drop's birth.
  function showers(t, x0, x1, top, rate, seed, r, land, s) {
    for (const d of rain(t, { x: x0, y: top, w: x1 - x0, h: 0 }, rate, seed)) {
      const age = d.splash ? .6 + .35 * d.splash : .6 * d.k;
      if (hash(seed + d.id * 1.37) >= rainK(t - age)) continue;
      const y1 = land(d.x, d.id);
      if (d.splash) splash(d.x, y1, d.splash, s); else A().drop(d.x, lerp(top, y1, d.k), r);
    }
  }
  // Dust puffs from the footfalls of the last .5 s: stepEvents finds each stance start; the pose at that instant gives the foot.
  function dust(spec, sOf, poseAt, t) {
    const gait = GAITS[spec.gait];
    for (const lb of spec.limbs) if (lb.foot) for (const te of stepEvents(sOf, t - .5, t, gait.offsets[lb.key || lb.name], spec.stride, gait.duty)) {
      const f = poseAt(te).limbs[lb.name].end; A().dust(f[0], f[1], (t - te) / .5, Math.floor(f[0]));
    }
  }

  // ---------- park world ----------
  const gy = x => 840 + 18 * Math.sin(x * .0045 + 1) + 9 * Math.sin(x * .013);  // irregular ground
  const LANE = makePath([[-1000, 840], [6000, 840]]);  // straight lane; creaturePose puts the feet on gy
  const HS = 340, DS = 200, BS = 110, ANTS_AT = [2150, gy(2150)];
  // Human stops at 1754 px with frac(s / stride) = .8: right foot planted, left at mid swing beside it; lift scales with
  // moving, so at rest the left foot is on the ground too and the feet stand together under the body.
  const HV = [[0, .85], [5, .85], [6.2, 0], [21.3, 0], [21.9, 1.1]], HSTOP = 10.8 * .75, HS0 = HSTOP - run(6.2, HV).s;
  const DV = [[0, 1.445], [5.2, 1.445], [6, 0], [17.2, 0], [17.5, 1.8], [18.6, 1.8], [19, 0], [21.7, 0], [22.1, 1.8]], DS0 = 15.25 - run(6, DV).s;
  const face = t => t < 6.45 ? 'happy' : t < 15 ? 'surprised' : t < 18.5 ? 'happy' : t < 20 ? 'surprised' : t < 20.95 ? 'neutral' : 'scared';

  function human(t) {
    const m = run(t, HV, HS0), o = { path: LANE, s: m.s, size: HS, ground: gy, t, seed: 1, moving: m.moving, expression: face(t) };
    const point = ease(seg(t, 6.9, 7.3)) * (t < 10), cover = ease(seg(t, 20.95, 21.25)), look = ease(seg(t, 6.2, 6.5)) * (t < 10);
    let p = creaturePose(SPECS.human, o);
    if (point) p = creaturePose(SPECS.human, { ...o, gesture: { limb: 'armL', target: [ANTS_AT[0], ANTS_AT[1] + 8 * Math.sin(t * 5)], k: point } });
    if (cover) {  // near arm by gesture, far arm by its own IK: both hands over the head
      const top = (dx, dy) => [p.head.x + dx * HS, p.head.y + dy * HS], lb = SPECS.human.limbs[3], r = p.limbs.armR;
      p = creaturePose(SPECS.human, { ...o, gesture: { limb: 'armL', target: top(.03, -.07), k: cover } });
      const end = r.end.map((v, i) => lerp(v, top(-.03, -.06)[i], cover)), q = ik2(r.root, end, lb.l1 * HS, lb.l2 * HS, lb.bend * p.facing);
      p.limbs.armR = { ...p.limbs.armR, mid: q.mid, end: q.end };
    }
    return nod(p, .01 * look, .012 * (look + cover), .32 * look + .2 * cover);
  }
  function dog(t) {
    const m = run(t, DV, DS0), p = creaturePose(SPECS.dog, { path: LANE, s: m.s, size: DS, ground: gy, t, seed: 2, moving: m.moving });
    const sniff = ease(seg(t, 6, 6.4)) * (1 - ease(seg(t, 16.5, 16.8))), up = ease(seg(t, 18.55, 18.9)) * (1 - ease(seg(t, 20.6, 21)));
    return nod(p, .05 * sniff, (.24 + .015 * Math.sin(t * TAU * 3.5)) * sniff - .04 * up, .6 * sniff - .35 * up);
  }
  const dogS = t => run(t, DV, DS0).s, humanS = t => run(t, HV, HS0).s;

  // Bird: glides in (fly), lands, three hops (s ends at 1.3: frac(1.3 / .4) = .25 < duty .45, feet down), pecks,
  // flinches when the dog closes in, then takes off away from it.
  const B_IN = makePath([[3450, 250], [3100, 470], [2800, gy(2800) - .3 * BS]]);
  const B_GROUND = makePath([[2800, 0], [800, 0]]), B_X = 2800 - 1.3 * BS, BV = 1.3 / .9;
  const B_OUT = makePath([[B_X, gy(B_X) - .3 * BS], [2950, 520], [3350, 200], [3700, -80]]);
  function bird(t) {
    if (t < 15 || t > 19.6) return null;
    const o = { size: BS, t, seed: 7, ground: gy };
    if (t < 16.2) return creaturePose(SPECS.bird, { ...o, path: B_IN, s: easeOut(seg(t, 15, 16.2)) * B_IN.length / BS, gait: 'fly' });
    if (t >= 18.45) { const k = seg(t, 18.45, 19.6); return creaturePose(SPECS.bird, { ...o, path: B_OUT, s: (.25 * k + .75 * k * k) * B_OUT.length / BS, gait: 'fly' }); }
    const m = run(t, [[16.55, 0], [16.65, BV], [17.45, BV], [17.55, 0]]), peck = Math.max(0, Math.sin(2 * TAU * seg(t, 17.7, 18.1)));
    return nod(creaturePose(SPECS.bird, { ...o, path: B_GROUND, s: m.s, moving: m.moving, flinch: ease(seg(t, 18.2, 18.3)) }), .05 * peck, .1 * peck, .8 * peck);
  }
  const TRAIL = makePath([[2450, 0], [1900, 0]]), TREES = [[900, 520, 1], [1450, 430, 2], [3200, 600, 3]];

  function park(t, cx, cy, zoom) {
    const rk = rainK(t), x0 = cx - W / 2 / zoom - 80, x1 = cx + W / 2 / zoom + 80, top = cy - H / 2 / zoom - 40;
    Kit.gradient(mixCol(P.skyTop, P.stone, .75 * rk), mixCol(P.skyLow, P.stone, .6 * rk));
    const c = animationEngine.context; c.save(); c.globalAlpha = 1 - .7 * rk;  // clouds dissolve into the rain sky
    A().cloud(320 + 7 * t, 130, .8, 1); A().cloud(1450 + 5 * t, 90, .6, 2); c.restore();
    Kit.cam(cx, cy, zoom);
    for (const [x, h, sd] of TREES) A().tree(x, gy(x) + 12, h, .05 * wind(t, x) + rk * .12 * noise1(sd, t * 2.5), sd);
    A().ground(gy, x0, x1);
    const hp = human(t), dp = dog(t), bp = bird(t), push = [...feet(hp), ...feet(dp)];
    const blades = odd => { for (let k = Math.floor(x0 / 18); k * 18 < x1; k++) if ((k & 1) === odd) {
      const x = k * 18 + 9 * hash(k), y = gy(x) + 3;
      A().blade(x, y, 16 + 16 * hash(k + 7), bladeBend(t, x, y, push, 45, 3) + rk * .5 * noise1(k, t * 4), odd ? P.grass : P.grassDk);
    } };
    blades(0);
    dust(SPECS.human, humanS, human, t); dust(SPECS.dog, dogS, dog, t);
    for (const a of crowd(TRAIL, t, 10, 4, { speed: 11, spacing: 60, sizeVar: .1 })) A().creature(creaturePose(SPECS.ant, { path: TRAIL, s: a.s / (14 * a.size), size: 14 * a.size, ground: gy, t, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null }));
    A().creature(dp); A().creature(hp); if (bp) A().creature(bp);
    blades(1);
    showers(t, x0, x1, top, 90, 11, 8, (x, id) => gy(x) + 10 + 150 * hash(id + 9), 1);
    Kit.camEnd();
  }

  // ---------- macro world (ant scale) ----------
  const gm = x => 690 + 22 * Math.sin(x * .0028 + .5) + 10 * Math.sin(x * .009 + 2), AS = 170, SS = 230;
  const MTRAIL = makePath([[-400, 690], [2500, 690]]), ANT = { speed: .9 * AS, spacing: 2900 / 8, carryEvery: 99, sizeVar: .1 };
  const ANT_T = (1360 - crowd(MTRAIL, 0, 8, 5, ANT)[0].s) / ANT.speed - 12.5;  // the leaf carrier is mid-frame at 12.5 s
  const SPATH = makePath([[2500, 0], [-800, 0]]);
  // The person's shoe at ant scale: her standing pose at 3000 px BL, shifted so the front foot sits at x = 170.
  const GIANT = 3000, G0 = creaturePose(SPECS.human, { path: makePath([[0, 0], [1e5, 0]]), s: HSTOP, size: GIANT, ground: gm, moving: 0 });
  const GPATH = makePath([[170 - Math.max(...feet(G0).map(f => f[0])), 0], [1e5, 0]]);
  // Hero drops [time of impact, x], each landing just ahead of the ant nearest a chosen x: nearby ants are pushed away
  // from the splash (after it) and flinch.
  const HERO = [[23, 760], [23.55, 1320], [24.1, 1000]].map(([te, x]) => {
    const ax = crowd(MTRAIL, te + ANT_T, 8, 5, ANT).map(a => MTRAIL.at(a.s).x).reduce((b, v) => Math.abs(v - x) < Math.abs(b - x) ? v : b);
    return [te, ax + .55 * AS];
  });
  function antReaction(x, t) {
    let ds = 0, fl = 0;
    for (const [te, hx] of HERO) {
      if (t < te) continue;
      const d = x - ANT.speed * (t - te) - hx, near = 1 - Math.abs(d) / 400;  // distance measured at the impact
      if (near <= 0) continue;
      ds += Math.sign(d) * 1.2 * AS * near * ease(seg(t, te + .06, te + .5));
      if (t > te + .06) fl = Math.max(fl, near * Math.exp(-4 * (t - te - .06)));
    }
    return { ds, fl };
  }

  function macro(t, zoom = 1) {
    const rk = rainK(t);
    Kit.gradient(mixCol(P.skyTop, P.stone, .75 * rk), mixCol(P.skyLow, P.stone, .6 * rk));
    Kit.cam(960, 540, zoom);
    for (let i = 0; i < 15; i++) { const x = i * 150 + 60 * hash(i + 3); A().blade(x, gm(x) + 20, 300 + 400 * hash(i), .12 * wind(t, x, 5) + rk * .3 * noise1(i, t * 3), P.grassDk); }
    A().ground(gm, -200, W + 200);
    A().rock(1520, gm(1520) + 70, 75, 2); A().rock(430, gm(430) + 45, 45, 5);
    for (const a of crowd(MTRAIL, t + ANT_T, 8, 5, ANT)) {
      const sz = AS * a.size, r = antReaction(MTRAIL.at(a.s).x, t);
      A().creature(creaturePose(SPECS.ant, { path: MTRAIL, s: (a.s + r.ds) / sz, size: sz, ground: gm, t, seed: a.seed, flinch: r.fl, carry: a.carry ? { w: 1.1, h: .7 } : null }));
    }
    A().creature(creaturePose(SPECS.human, { path: GPATH, s: HSTOP, size: GIANT, ground: gm, t, seed: 1, moving: 0 }));
    const sp = run(t, [[10.3, 2.2]]);
    A().creature(creaturePose(SPECS.spider, { path: SPATH, s: sp.s, size: SS, ground: x => gm(x) + 150, t, seed: 4, moving: sp.moving }));
    for (let i = 0; i < 7; i++) { const x = i * 300 + 120 * hash(i + 40); A().blade(x, gm(x) + 300, 200 + 150 * hash(i + 41), .1 * wind(t, x, 6) + rk * .3 * noise1(i + 50, t * 3), P.grass); }
    showers(t, -100, W + 100, -150, 22, 21, 14, (x, id) => gm(x) + 20 + 260 * hash(id + 9), 2.5);
    for (const [te, hx] of HERO) {
      const y = gm(hx) + 30;
      if (t > te - .35 && t < te) A().drop(hx, lerp(-150, y, seg(t, te - .35, te)), 16);
      else if (t >= te) splash(hx, y, seg(t, te, te + .45), 3.5);
    }
    Kit.camEnd();
  }

  // ---------- lake ----------
  const FS = 300, FPATH = makePath([[-500, 650], [200, 600], [800, 690], [1400, 610], [2000, 660], [2600, 630]]);
  function lake(t, lt) {
    Kit.gradient(mixCol(P.skyTop, P.stone, .75), mixCol(P.skyLow, P.stone, .6));
    const bank = x => 300 + 14 * Math.sin(x * .006);
    A().ground(bank, 0, W);
    for (let k = 0; k < 110; k++) { const x = k * 18 + 9 * hash(k + 300); A().blade(x, bank(x) + 3, 16 + 14 * hash(k + 301), .35 * wind(t, x) + .4 * noise1(k, t * 4), k & 1 ? P.grass : P.grassDk); }
    A().water(0, 345, W, t);
    const floor = x => 1000 + 25 * Math.sin(x * .005);
    for (let i = 0; i < 14; i++) { const x = 60 + i * 140 + 50 * hash(i + 60); A().blade(x, floor(x) + 10, 110 + 130 * hash(i + 61), .25 * noise1(i + 62, t * .7) + .1 * Math.sin(t * 1.6 + i), P.leafDk); }
    A().ground(floor, 0, W);
    A().rock(380, floor(380) + 20, 70, 8); A().rock(1350, floor(1350) + 15, 55, 9);
    const f = run(t, [[25, 1.2]], 1.9), fish = creaturePose(SPECS.fish, { path: FPATH, s: f.s, size: FS, t, seed: 6, moving: f.moving });
    A().creature(fish);
    showers(t, 0, W, -40, 45, 31, 6, () => 348, 1.6);
    Kit.iris(fish.head.x, fish.head.y, 2300 * (1 - ease(seg(lt, 3.6, 4.8))));
  }

  shots([
    [0, t => park(t, 960, 540, 1)],
    [5, (t, lt) => { const k = easeIn(seg(lt, 4.45, 5)); park(t, lerp(1800, ANTS_AT[0], k), lerp(650, ANTS_AT[1], k), lerp(1.45, 4, k)); }],
    [10, (t, lt) => macro(t, lerp(1.35, 1, easeOut(seg(lt, 0, .7))))],
    [15, t => park(t, 2350, 544, 1.15)],
    [20, (t, lt) => lt < 2.5 ? park(t, 2300, 540, 1) : macro(t)],
    [25, lake],
  ]);
})();
