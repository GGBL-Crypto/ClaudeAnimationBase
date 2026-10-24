// shot.js (toon3d, exp/visual-rico): planos montados por dados, sem código da história. toonSet(St, set) constrói uma
// região (bioma, chão, vida de fundo) e devolve uma função de desenho por plano. Cada plano diz clima, câmera, elenco
// (pernas de voo e de chão), multidões (faixas com física, src/nature/crowd.js), ações genéricas (perder as asas, cavar,
// levar algo na boca, poeira nos passos), árvores, buracos e legendas. As zonas livres do espalhamento saem dos caminhos
// de todos os agentes de todos os planos da região. Cada quadro é função pura de t.
//
// Ator: {id, look (visual em LOOKS3D), S, seed, hex, legs, mood: [[t, expressão], ...], up/turn/sweep: [[t, v], ...] (erguer, virar
// a cabeça, varrer com as antenas), shed: t (perde as
// asas), carry: {hex, r} (na boca), dig: [t0, t1], dust: cor (poeira nos passos)}. Perna de voo: {t0, t1, fly: [[x, y,
// z], ...], ease: 'io' | 'in' | 'out' | 'lin', land (para de pairar no fim), exit (some depois de t1)}. Perna de chão:
// {t0, walk: [[x, z], ...], keys: [[t, s], ...] (s em unidades do mundo), start, stop, exit}. Antes da primeira perna o
// ator não existe; as pontas das pernas ficam fora do quadro ou dentro do chão (o centro abaixo do chão = escondido).
// Multidão: {meet, lanes: [{walk, look, S, speed, rate, gap, carry, side, both, dip: [[x, z, fundura, raio], ...]}]};
// both = também a faixa de volta, do outro lado; dip = buraco onde a trilha mergulha (nasce e some lá dentro).
const SHOT_EASE = { io: ease, in: easeIn, in2: x => clamp(x) ** 2, out: easeOut, lin: x => clamp(x) };
// Câmera parada em pos olhando para tgt, nos parâmetros de St.camera: [alvo, distância, elevação, giro].
function shotLook(pos, tgt) { const d = V3.sub(pos, tgt), r = V3.len(d); return [tgt, r, Math.asin(d[1] / r), Math.atan2(d[0], d[2])]; }

// Pose de um ator em t, ou null. ground = h(x, z). Os trilhos ficam em cache no próprio ator.
function shotActor(A, t, ground) {
  const legs = A.legs; let i = -1;
  for (let j = 0; j < legs.length; j++) if (t >= legs[j].t0) i = j;
  if (i < 0) return null;
  const g = legs[i], k = v => v && v.length ? kf(t, v) : 0, dig = A.dig ? ease(seg(t, A.dig[0], A.dig[0] + .5)) * (1 - ease(seg(t, A.dig[1], A.dig[1] + .5))) : 0;
  const o = { seed: A.seed, up: k(A.up) - dig * (.4 + .14 * Math.sin(TAU * 2.2 * (t - (A.dig?.[0] || 0)))), look: k(A.turn), sweep: k(A.sweep) + .3 * dig, wings: A.shed !== undefined && t >= A.shed ? false : undefined, id: A.id };
  if (g.fly) {
    if (g.exit && t > g.t1) return null;
    g.tr = g.tr || track3(g.fly);
    const s = (SHOT_EASE[g.ease || 'io'])(seg(t, g.t0, g.t1)) * g.tr.length;
    return creature3d(A.look, g.tr, s / A.S, A.S, t, { ...o, fly: true, hover: g.land ? 1 - seg(t, g.t1 - .6, g.t1) : 1 });
  }
  if (g.exit && t > g.keys[g.keys.length - 1][0]) return null;
  g.tr = g.tr || track3d(g.walk, ground);
  const m = travel(t, g.keys, { start: g.start ?? .5, stop: g.stop ?? .6, seed: A.seed });
  return creature3d(A.look, g.tr, m.s / A.S, A.S, t, { ...o, moving: m.moving });
}

// Folha cortada em pé na mandíbula ou bola (fungo, semente) na boca.
function shotCarry(E, P, c) {
  const { add, mul, unit, cross } = V3, h = P.head, S = P.S;
  if (c === 'leaf') { const b = add(add(h.c, mul(h.f, .13 * S)), mul(h.u, .02 * S)), ax = unit(add(mul(h.u, Math.cos(.35)), mul(h.f, Math.sin(.35)))); E.quad(P.seed % 2 ? 'leaf2' : 'leaf', b, mul(unit(cross(ax, h.l)), .38 * S), mul(ax, S), mul(h.l, .2 * S), '#FFFFFF'); }
  else if (c) E.ovoid(add(add(h.c, mul(h.f, h.ax[0] + c.r * S)), mul(h.u, -.3 * h.ax[1])), h.f, h.u, c.r * S, .85 * c.r * S, c.r * S, c.hex, 'sph');
}
// Nuvem de poeira: k = 0..1 (cresce, sobe e some no fim); pool sem contorno.
function shotPuff(E, p, r, k, hex = '#D8B888') {
  if (k <= 0 || k >= 1) return;
  for (let j = 0; j < 3; j++) E.ball([p[0] + (j - 1) * .8 * r * k, p[1] + r * (.3 + 1.6 * k + .3 * (j % 2)), p[2] + .4 * r * (j - 1)], r * (.5 + .3 * (j % 2)) * Math.sin(Math.PI * k), hex, 'puff');
}

// set = {area, ground: h(x, z), biome, seed, color(x, z) → [cor, terra 0..1], fine: [{x0, x1, z0, z1, seg}], free,
// ambient: opções de toonAmbient, shots: {id: plano}}. Plano = {mood, sun, camera(t, at) → [alvo, d, elev, giro] (at(id)
// = pose de um ator em t), cast, crowd, trees: [[x, z, h, r, semente]], holes: [[x, z, r]], props: (t, E, at) => {},
// labels: [[t0, t1, texto]]}.
function toonSet(St, set) {
  const { area, ground: h, biome = 'meadow', seed = 1, shots } = set, E = St.E, zones = [...(set.free || [])];
  const adapt = tr => ({ length: tr.length, at: d => { const F = tr(d); return { p: F.p, f: F.f }; } });
  const built = {};
  for (const [id, D] of Object.entries(shots)) {
    const lanes = [];
    for (const ln of D.crowd?.lanes || []) {
      const hd = ln.dip ? (x, z) => h(x, z) - ln.dip.reduce((s, [dx, dz, dd, r]) => s + dd * Math.exp(-((x - dx) ** 2 + (z - dz) ** 2) / (r * r)), 0) : h;
      for (const back of ln.both ? [false, true] : [false]) {
        const pts = offsetPts(back ? ln.walk.slice().reverse() : ln.walk, ln.side ?? .3 * ln.S), tr = track3d(pts, hd);
        lanes.push({ ...ln, tr, path: adapt(tr), t0: D.t0, t1: D.t1, seed: (ln.seed ?? 1) * 10 + lanes.length });
        zones.push(...pathZones(adapt(tr), ln.zone ?? .45 * ln.S));
      }
    }
    for (const A of D.cast || []) for (const g of A.legs) if (g.walk) zones.push(...pathZones(makePath(g.walk), .5 * A.S));
    built[id] = { D, crowd: lanes.length ? makeCrowd(lanes, D.crowd) : null, lanes };
  }
  const world = toonBiome(St, biome, { area, ground: h, free: zones, seed, gobo: true });
  const ambient = toonAmbient(St, { area, ground: h, ...set.ambient });
  const color = set.color || ((x, z) => { const m = .5 + .5 * noise1(seed + 9, x * .7 + z * .3); return [mixCol('#7FB04A', '#B7C860', m * .5), .25 * m]; });
  for (const f of set.fine || []) St.ground({ ...f, h, color, rep: 1.2 });
  St.ground({ ...area, h, color, rep: 1.2, seg: .4, dy: -.006 });

  const draw = (id, { D, crowd, lanes }) => (t, lt) => {
    St.begin(t); St.mood(D.mood || {});
    const cache = new Map(), at = aid => { if (!cache.has(aid)) cache.set(aid, shotActor(D.cast.find(A => A.id === aid), t, h)); return cache.get(aid); };
    St.camera(...D.camera(t, at, lt));
    if (St.sky.sun && D.sun === false) St.sky.sun.visible = St.sky.rays.visible = false;
    world.draw(t, E); ambient(t, E);
    for (const [x, z, th, r, sd] of D.trees || []) tree(E, [x, h(x, z), z], th, r, t, sd);
    for (const [x, z, r] of D.holes || []) E.ovoid([x, h(x, z) + .004, z], [1, 0, 0], [0, 1, 0], r, .012, .8 * r, '#24120A', 'far');
    D.props?.(t, E, at);
    const under = P => { const c = P.segs[0].c; return c[1] < h(c[0], c[2]) - .3 * P.segs[0].ax[1]; };
    if (crowd) for (const a of crowd.at(t)) {
      const ln = lanes[a.lane], P = creature3d(ln.look, ln.tr, a.s / ln.S, ln.S, t, { seed: a.seed, moving: a.moving, touch: a.meet && { k: a.meet.k, side: a.meet.side }, id: `${id}:${a.id}` });
      P.hidden = a.hidden || under(P);  // dentro do chão (buraco) ninguém vê
      drawCreature3d(E, P, { hex: ln.hex }); if (a.carry) shotCarry(E, P, ln.carry === true ? 'leaf' : ln.carry);
    }
    for (const A of D.cast || []) {
      const P = at(A.id); if (!P) continue;
      P.hidden = under(P);
      const la = A.lookAt?.(t, at);  // 'eye' = olha para a câmera
      drawCreature3d(E, P, { hex: A.hex, mood: A.mood ? mood(t, A.mood, A.seed) : undefined, lookAt: la === 'eye' ? E.eye : la });
      if (A.carry && !P.air) shotCarry(E, P, A.carry);
      if (A.dust && !P.air) for (const l of P.legs) if (l.stance && l.u < .45) shotPuff(E, l.foot, .035 * A.S, l.u / .45, A.dust);
      if (A.shed !== undefined && t >= A.shed) shotWings(E, A, t, h);
      if (A.dig && t >= A.dig[0]) shotDig(E, A, t, h);
    }
    for (const [t0, t1, text] of D.labels || []) if (t >= t0 && t < t1) St.label(text, Math.min(seg(t, t0, t0 + .4), 1 - seg(t, t1 - .3, t1)));
    St.end();
  };
  return Object.fromEntries(Object.entries(built).map(([id, b]) => [id, draw(id, b)]));
}

// Asas soltas: saem da pose em A.shed, caem devagar (arrasto), deitam no chão enquanto caem e escorregam um pouco.
function shotWings(E, A, t, h) {
  const { add, mul, unit, len } = V3, P = shotActor({ ...A, shed: undefined }, A.shed, h);
  if (!P) return;
  P.wings.forEach((w, j) => {
    const c0 = add(w.b, mul(w.Y, .5)), floor = h(c0[0], c0[2]) + .004, f = fall(t, A.shed + .1 * j, c0, floor, { vt: .32 * A.S * 2, tau: .35, sway: .25 * A.S, seed: A.seed * 7 + j });
    const k = clamp((c0[1] - f.p[1]) / Math.max(1e-6, c0[1] - floor)), flat = v => { const q = [v[0], 0, v[2]]; return mul(unit(len(q) > 1e-6 ? q : [1, 0, 0]), len(v)); };
    const tl = A.shed + .1 * j + f.age, slide = f.landed ? .12 * A.S * ease(seg(t, tl, tl + 1)) : 0, sp = .6 * f.spin * (1 - k);
    const X = V3.mix(w.X, flat(w.X), k), Y = V3.mix(V3.rot(w.Y, unit(w.X), sp), flat(w.Y), k);
    E.quad('wing', add(add(f.p, mul(Y, -.5)), mul(unit(flat(w.Y)), -slide)), X, Y, [0, len(w.Z), 0], '#FFFFFF');
    if (f.landed) shotPuff(E, f.p, .06 * A.S, seg(t, tl, tl + .7));
  });
}
// Cavar: buraco à frente da cabeça que abre, monte de terra atrás que cresce e torrões jogados para trás em arco
// (gravidade), cada um levanta poeira ao cair. Tudo pela pose em A.dig[0].
function shotDig(E, A, t, h) {
  const { add, mul } = V3, P = shotActor(A, A.dig[0], h), S = A.S, f = P.segs[0].f, g = (p, dy = 0) => [p[0], h(p[0], p[2]) + dy, p[2]];
  const k = seg(t, A.dig[0], A.dig[1] + 2), hole = g(add(P.head.c, mul(f, .28 * S))), pile = g(add(P.segs[P.segs.length - 1].c, mul(f, -.75 * S)));
  E.ovoid(add(hole, [0, .004, 0]), f, [0, 1, 0], (.08 + .2 * ease(k * 2)) * S, .01 * S, (.06 + .16 * ease(k * 2)) * S, '#24120A', 'far');
  E.ovoid(pile, f, [0, 1, 0], (.18 + .35 * k) * S, (.04 + .2 * k) * S, (.15 + .28 * k) * S, '#B07A4A', 'sph');
  for (let j = 0; j < 6; j++) {
    const n = Math.floor(1.4 * (t - A.dig[0]) + j / 6), t0 = A.dig[0] + (n - j / 6) / 1.4;
    if (t0 < A.dig[0] || t0 > A.dig[1]) continue;
    const to = g(add(pile, [(hash(n * 6 + j) - .5) * .3 * S, 0, (hash(n * 6 + j + 3) - .5) * .25 * S]), .1 * k * S), q = toss(t, t0, add(hole, [0, .02 * S, 0]), to, .55, 6 * S);
    if (!q.landed) E.ball(q.p, (.03 + .015 * hash(j)) * S, '#9A6A3E', 'sph');
    else shotPuff(E, to, .05 * S, seg(t, t0 + .55, t0 + 1.1));
  }
}
