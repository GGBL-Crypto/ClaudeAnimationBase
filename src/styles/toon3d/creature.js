// creature.js (toon3d, exp/visual-rico): ser 3D de qualquer espécie a partir das SPECS de src/nature e de um visual em
// LOOKS3D (proporções 3D, cores, rosto, antenas, asas, pelos e padrões). Puro: creature3d devolve a pose em pontos do
// mundo; drawCreature3d manda primitivas ao emissor E do palco (stage.js; nos testes, um contador). Trilho: track(d) =
// {p: chão, f: frente, u: cima}, com d em unidades do mundo; track.h(x, z), opcional, é a altura do chão para os pés.
// S = comprimento do corpo (BL) em unidades do mundo; os números das SPECS e de LOOKS3D estão em BL.
const V3 = (() => {
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), unit = a => mul(a, 1 / (len(a) || 1)), mix = (a, b, k) => add(a, mul(sub(b, a), k));
  const rot = (v, axis, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c))); };
  // Soma de termos v·k: frame(o, [f, a], [u, b]) = o + f·a + u·b.
  const comb = (o, ...terms) => terms.reduce((p, [v, k]) => add(p, mul(v, k)), o);
  return { add, sub, mul, dot, cross, len, unit, mix, rot, comb };
})();

// Trilho no chão por pontos [x, z] e altura h(x, z); frente com a inclinação do relevo, cima perpendicular a ela (o
// corpo inclina com o chão).
function track3d(points, h) {
  const path = makePath(points), { unit, sub } = V3;
  const at = d => { const q = path.at(d), e = d - Math.max(0, Math.min(path.length, d)); return [q.x + e * Math.cos(q.angle), q.y + e * Math.sin(q.angle)]; };
  const fr = d => { const [x, z] = at(d), [x2, z2] = at(d + .05), p = [x, h(x, z), z], f = unit(sub([x2, h(x2, z2), z2], p)); return { p, f, u: up3(f) }; };
  Object.defineProperty(fr, 'length', { value: path.length }); fr.h = h; fr.pts = points; return fr;  // length de função é só leitura
}
// Cima perpendicular à frente f, o mais perto de +Y (vira para o lado só em subidas quase verticais).
function up3(f) { const u = V3.sub([0, 1, 0], V3.mul(f, f[1])); return V3.len(u) > 1e-3 ? V3.unit(u) : [1, 0, 0]; }
// Trilho por pontos 3D (voo, túnel, câmara): makePath3; o chão é o plano perpendicular a cima (up3), sem relevo.
function track3(points) {
  const path = makePath3(points), fr = d => { const e = d - Math.max(0, Math.min(path.length, d)), q = path.at(d); return { p: V3.add(q.p, V3.mul(q.f, e)), f: q.f, u: up3(q.f) }; };
  Object.defineProperty(fr, 'length', { value: path.length }); fr.pts = points; return fr;
}

// Visuais 3D por nome. spec: chave em SPECS (padrão = o nome). hex: cor base (o.hex troca); colors[i]/head: cor por
// segmento; tone[i]: quanto o segmento escurece para ink (gradiente do corpo); seg[i]/head: semieixos (frente, cima, lado)
// em raios da SPECS; sink: quanto o corpo desce (BL); legK: escala de l1/l2 (as pernas 3D abrem para os lados); legR:
// grossura; links: bolas de ligação [i, j, k, r]; antenna: base [f, u, l] e segmentos [f, u, l, comprimento] na cabeça;
// wings: [{at, len, w, tilt}] no segmento 0; hairs: [{seg, n, len}]; pattern: [{seg, type, n, hex}] com type stripes,
// spots, seam ou ribs; face: ver face.js. Uma espécie nova é uma entrada aqui (e a SPECS, se ainda não houver).
var LOOKS3D = {
  ant: {
    hex: '#A9472C', ink: '#3A160C', tone: [0, .08, .12], seg: [[1.6, .94, .88], [1, 1, 1], [1.23, .92, .96]], head: [1.38, 1.22, 1.5],
    sink: .03, bob: .012, legK: [1.3, 1.43], legR: 1, links: [[1, 2, .4, .04]], spines: 1, mandibles: .05,
    antenna: { at: [.05, .06, .04], segs: [[.35, .8, .45, .16], [.9, -.15, .25, .11], [.9, -.5, .25, .1]], club: .016 },
    hairs: [{ seg: 2, n: 18, len: .022, hex: '#E8B07A' }],
    face: { eyes: [.62, .26, .5], r: .5, forward: .85, iris: '#6B3E1C', brow: true, mouth: [.98, -.2, .3] },
  },
  // Rainha e alado: a formiga com tórax de voo e dois pares de asas; pousados, as asas ficam no dorso (o.wings = false
  // depois de perdê-las).
  queen: {
    hex: '#9A3E26', ink: '#34140A', tone: [0, .08, .14], seg: [[1.35, .95, .9], [1, 1, 1], [1.2, .9, .95]], head: [1.3, 1.15, 1.4],
    sink: .03, bob: .012, legK: [1.25, 1.35], legR: 1.05, links: [[1, 2, .4, .05]], mandibles: .06,
    antenna: { at: [.05, .06, .045], segs: [[.35, .8, .45, .16], [.9, -.15, .25, .11], [.9, -.5, .25, .1]], club: .016 },
    wings: [{ at: [-.02, .1, .05], len: .95, w: .3, tilt: -.45 }, { at: [-.06, .09, .05], len: .7, w: .22, tilt: -.2 }], flap: 9,
    hairs: [{ seg: 2, n: 16, len: .02, hex: '#E8B07A' }],
    face: { eyes: [.62, .26, .5], r: .48, forward: .85, iris: '#5A3018', brow: true, mouth: [.98, -.2, .3] },
  },
  alate: {
    hex: '#4A2A1C', ink: '#1A0C06', tone: [0, .06, .1], seg: [[1.3, .95, .9], [1, 1, 1], [1.15, .85, .9]], head: [1.1, 1, 1.25],
    sink: .03, bob: .012, legK: [1.25, 1.35], legR: .9, links: [[1, 2, .4, .035]], mandibles: .03,
    antenna: { at: [.05, .06, .04], segs: [[.4, .8, .45, .15], [.9, -.1, .25, .12], [.9, -.4, .25, .11]], club: .012 },
    wings: [{ at: [-.02, .1, .05], len: .95, w: .3, tilt: -.45 }, { at: [-.06, .09, .05], len: .7, w: .22, tilt: -.2 }], flap: 11,
    face: { eyes: [.5, .3, .62], r: .6, forward: .55, iris: '#2A1A10', brow: false, mouth: null },
  },
  // Pássaro (SPECS.bird): corpo e cauda de penas, bico, asas dobradas nos flancos (pattern fold); salta (hop).
  bird: {
    hex: '#8A6440', ink: '#2A1A0E', colors: ['#8A6440', '#6E4E30'], headHex: '#6A4A2E', seg: [[1.2, 1, .95], [1.6, .55, .7]], head: [1.05, 1, 1],
    sink: 0, bob: 0, legK: [1.4, 1.45], legR: .7, links: [[0, 1, .5, .14]], legHex: '#C89060', beak: [.14, .035, '#E0A040'],
    pattern: [{ seg: 0, type: 'fold', hex: '#5A3E24' }, { seg: 0, type: 'bib', hex: '#E8D8B8' }],
    face: { eyes: [.35, .28, .78], r: .3, forward: .35, iris: '#1E120A', brow: true, browHex: '#3A2614', mouth: null },
  },
  fly: {
    hex: '#4A3328', ink: '#1E120C', colors: ['#5A4434', '#8A6A44'], head: [.85, 1, 1.15], seg: [[1.15, 1.05, .95], [1.45, .85, .85]],
    legR: .55, dangle: 3, bob: 0, proboscis: .12, links: [],
    antenna: { at: [.06, .05, .03], segs: [[.6, .5, .5, .04], [.7, .3, .4, .06]], club: .012 },
    wings: [{ at: [-.02, .1, .05], len: .78, w: .34, tilt: -.55 }], flap: 7, hex2: '#FFFFFF',
    hairs: [{ seg: 0, n: 16, len: .07 }, { seg: 1, n: 10, len: .05 }],
    pattern: [{ seg: 1, type: 'stripes', n: 3, hex: '#3A2418' }],
    face: { eyes: [.25, .18, .7], r: .78, forward: .2, compound: '#A0301C', iris: '#A0301C', mouth: null },
  },
  ladybug: {
    spec: 'beetle', hex: '#D8352A', ink: '#1E1210', colors: ['#221614', '#D8352A'], headHex: '#221614', seg: [[.9, .7, 1.05], [1.12, .64, 1]], head: [.9, .9, 1.1],
    sink: 0, legK: [1.02, 1.08], legR: .9, links: [], mandibles: 0, legHex: '#1E1210',
    antenna: { at: [.05, .04, .045], segs: [[.8, .4, .6, .05], [.9, .1, .4, .04]], club: .014 },
    pattern: [{ seg: 1, type: 'spots', n: 7, hex: '#1E1210' }, { seg: 1, type: 'seam', hex: '#1E1210' }, { seg: 0, type: 'spots', n: 2, hex: '#F4EEDC' }],
    face: { eyes: [.55, .3, .6], r: .42, forward: .6, iris: '#3B2A20', brow: false, mouth: [.97, -.35, .3] },
  },
  beetle: {
    hex: '#2F6A44', ink: '#14261A', colors: ['#2C5E3E', '#3E8050'], headHex: '#2A5438', tone: [0, .05], seg: [[1.05, .7, 1.05], [1.15, .64, .98]], head: [1, .9, 1.15],
    sink: 0, legK: [1.05, 1.1], legR: 1.25, links: [], mandibles: .075, legHex: '#3A2A1C',
    antenna: { at: [.06, .04, .05], segs: [[.8, .35, .6, .09], [.9, .1, .45, .08], [.9, -.2, .35, .07]], club: .02 },
    hairs: [{ seg: 0, n: 8, len: .03 }],
    pattern: [{ seg: 1, type: 'ribs', n: 3, hex: '#1E4A2C' }, { seg: 1, type: 'seam', hex: '#173A22' }],
    face: { eyes: [.55, .34, .6], r: .44, forward: .6, iris: '#C9A23A', brow: true, mouth: [.97, -.38, .3] },
  },
};

// Pose: o = {moving, seed, up (ergue a cabeça), look (vira a cabeça), sweep (antenas varrem), fly (voa; quem tem
// gait 'fly' voa sempre)}. Pés plantados pela marcha (footAt) no trilho; joelho por ik2 no plano vertical raiz–pé.
function creature3d(name, track, s, S, t, o = {}) {
  const L = LOOKS3D[name]; if (!L) throw new Error(`Ser 3D desconhecido: ${name}`);
  const spec = SPECS[L.spec || name], { add, sub, mul, dot, cross, len, unit, mix, rot, comb } = V3;
  const { moving = 1, seed = 0, up = 0, look = 0, sweep = 0, hover = 1 } = o, flying = spec.gait === 'fly' || !!o.fly;
  const gait = flying ? null : typeof spec.gait === 'string' ? GAITS[spec.gait] : spec.gait;
  const vary = ORGANIC.vary, sd = seed + 501, gp = gait ? gaitPhase(s, spec.stride, vary, sd) : 0, beat = (1 + Math.cos(2 * TAU * gp)) / 2;
  const frame = d => { const F = track(d); return { ...F, l: cross(F.u, F.f) }; };
  // No voo o corpo é rígido em torno do ponto do trilho e paira por ruído (flyer.hover × o.hover). Saltador (spec.hop):
  // o corpo sobe junto com os pés no balanço (todos na mesma fase), então fica no ar de verdade.
  const F0 = frame(s * S), hk = flying && spec.flyer?.hover ? .5 * spec.flyer.hover * S * hover : 0, hov = hk ? comb([0, 0, 0], [F0.u, hk * noise1(seed + 71, t * .9)], [F0.l, hk * noise1(seed + 72, t * 1.3)]) : [0, 0, 0];
  const foot0 = gait && spec.limbs.find(lb => lb.foot), hop = spec.hop && foot0 ? footAt(s, gait.offsets[foot0.key || foot0.name], { stride: spec.stride, duty: gait.duty, lift: spec.lift * S, moving, plant: () => [0, 0], vary, seed: sd }).lift : 0;
  const place = (off, h, k) => {
    const F = flying ? { ...F0, p: add(F0.p, mul(F0.f, -off * S)) } : frame((s - off) * S);
    return { ...F, c: add(add(F.p, mul(F.u, (h - (L.sink || 0) - (L.bob ?? .012) * moving * beat) * S + hop)), hov), ax: k };
  };
  const segs = spec.spine.map((g, i) => place(g.offset, g.h || 0, (L.seg[i] || [1, 1, 1]).map(v => v * g.r * S)));
  const th = segs[0], hd = place(spec.head.offset, spec.head.h || 0, (L.head || [1, 1, 1]).map(v => v * spec.head.r * S));
  const legs = [], [k1, k2] = L.legK || [1, 1];
  if (!flying) for (const lb of spec.limbs.filter(lb => lb.foot)) {
    const g = spec.spine[lb.attach], lat = lb.side * (g.r * .5 + lb.rest[1]), B = segs[lb.attach];
    const plant = sA => [(sA - g.offset + lb.along + lb.rest[0]) * S, lat * S];
    const st = footAt(s, gait.offsets[lb.key || lb.name], { stride: spec.stride, duty: gait.duty, lift: spec.lift * S, moving, plant, vary, seed: sd });
    if (hop) st.stance = false;
    const F = frame(st.pos[0]); let foot = add(add(F.p, mul(F.l, st.pos[1])), mul(F.u, st.lift));
    if (track.h) foot = [foot[0], track.h(foot[0], foot[2]) + st.lift, foot[2]];
    const root = comb(B.c, [B.f, lb.along * S], [B.l, lb.side * g.r * .5 * S]);
    const D = sub(foot, root), dv = dot(D, B.u), Dh = sub(D, mul(B.u, dv)), dh = len(Dh), e1 = dh > 1e-9 ? mul(Dh, 1 / dh) : mul(B.l, lb.side);
    const k = ik2([0, 0], [dh, dv], lb.l1 * k1 * S, lb.l2 * k2 * S, 1), to3 = q => comb(root, [e1, q[0]], [B.u, q[1]]);
    const mid = to3(k.mid), end = to3(k.end);
    legs.push({ name: lb.name, root, mid, tar: add(mix(mid, end, .72), mul(B.u, .03 * S)), end, foot, stance: st.stance, k: st.k, u: st.u });
  } else for (let i = 0; i < (L.dangle || spec.limbs.length / 2); i++) for (const sg of [1, -1]) {  // pernas soltas no voo
    const w = .03 * noise1(seed + i * 3 + sg, t * 2), root = comb(th.c, [th.f, (.06 - .07 * i) * S], [th.l, sg * th.ax[2] * .45], [th.u, -th.ax[1] * .5]);
    const mid = comb(root, [th.l, sg * .12 * S], [th.u, (-.06 + w) * S], [th.f, (.06 - .06 * i) * S]), end = comb(mid, [th.u, -.16 * S], [th.f, (.03 - .09 * i + w) * S], [th.l, sg * .03 * S]);
    legs.push({ name: (sg > 0 ? 'L' : 'R') + (i + 1), root, mid, tar: mix(mid, end, .72), end, foot: end, stance: false });
  }
  // Cabeça: ergue (up) e vira (look) em torno do pescoço.
  const hf = rot(rot(hd.f, hd.l, -up), hd.u, look), hl = rot(hd.l, hd.u, look), hu = cross(hf, hl);
  const neck = add(th.c, mul(th.f, spec.spine[0].r * S)), head = { c: add(neck, rot(rot(sub(hd.c, neck), hd.l, -up), hd.u, look)), f: hf, u: hu, l: hl, ax: hd.ax };
  // Antenas segmentadas: varrem (sweep) e balançam por ruído em torno do eixo de cima da cabeça; o.touch = {k, side}
  // (encontro) aponta as duas para o lado de quem está ao lado e um pouco para baixo, tocando em batidas curtas.
  const tk = o.touch ? o.touch.k : 0, tside = o.touch ? o.touch.side : 0;
  const antennae = !L.antenna ? [] : [1, -1].map(sg => {
    const A = L.antenna, tap = tk * .18 * Math.sin(TAU * 4 * t + sg);
    const a = (1 - tk) * (.25 * noise1(seed * 7 + sg, t * 1.7) + sweep * Math.sin(t * 3.1 + sg)) + tk * tside * (sg === tside ? .75 : .35), b = (1 - tk) * .2 * noise1(seed * 7 + sg + 3, t * 2.3) - tk * .25 + tap;
    const pts = [comb(head.c, [hf, A.at[0] * S], [hu, A.at[1] * S], [hl, sg * A.at[2] * S])];
    A.segs.forEach(([df, du, dl, l], j) => pts.push(add(pts[j], mul(rot(unit(comb([0, 0, 0], [hf, df], [hu, du + (j ? b : 0)], [hl, sg * dl])), hu, a), l * S))));
    return pts;
  });
  // Asas: batem por t no voo (flap Hz); pousado, ficam deitadas no dorso.
  const wings = [];
  for (const w of o.wings === false ? [] : L.wings || []) for (const sg of [1, -1]) {
    const flap = flying ? .9 * Math.sin(TAU * (L.flap || spec.flyer.freq) * t + seed) + .25 : 0, b = comb(th.c, [th.f, w.at[0] * S], [th.u, th.ax[1] * .8], [th.l, sg * w.at[2] * S]);
    const Y = flying ? unit(comb([0, 0, 0], [th.l, sg * Math.cos(flap)], [th.u, Math.sin(flap)], [th.f, w.tilt])) : unit(comb([0, 0, 0], [th.f, -1], [th.l, sg * .22], [th.u, .12]));
    const n = flying ? unit(cross(Y, th.f)) : th.u, X = unit(cross(Y, n));
    wings.push({ b, X: mul(X, w.w * S), Y: mul(Y, w.len * S), Z: mul(n, .01 * S) });
  }
  return { name, spec, look: L, S, t, seed, flying, air: flying || hop > 0, segs, head, legs, antennae, wings };
}

// Ponto na superfície do elipsoide g: x ao longo da frente (−1..1), phi a partir do topo (0 = cima, ±PI/2 = lados).
function shellPoint(g, x, phi, k = 1.01) {
  const q = Math.sqrt(Math.max(0, 1 - x * x)) * k;
  return V3.comb(g.c, [g.f, x * g.ax[0] * k], [g.u, Math.cos(phi) * q * g.ax[1]], [g.l, Math.sin(phi) * q * g.ax[2]]);
}

// Fuso de a até b (perna, antena, cerda, sobrancelha): elipsoide que se sobrepõe nas juntas, sem tubo nem tampa.
function spindle(E, a, b, r, hex, pool = 'shell') {
  const { sub, mul, unit, cross } = V3, d = sub(b, a), l = V3.len(d); if (l < 1e-6) return;
  const f = mul(d, 1 / l), u = unit(cross(f, Math.abs(f[1]) < .9 ? [0, 1, 0] : [1, 0, 0]));
  E.ovoid(V3.mix(a, b, .5), f, u, .58 * l, r, r, hex, pool);
}

// Desenho. o = {hex, mood, expression, lookAt}. E: ovoid(pos, f, u, a, b, c, hex, pool), ball(pos, r, hex, pool),
// rod(p0, p1, r, hex, pool), quad(pool, pos, X, Y, Z, hex), px(pos, size) = tamanho em px na tela, eye = câmera.
function drawCreature3d(E, P, o = {}) {
  // Tom: cada indivíduo um pouco mais claro ou escuro (semente), para a multidão não sair de fôrma.
  if (E.visible && !E.visible(P.segs[0].c, 1.5 * P.S)) return;  // fora do quadro
  const { look: L, S, segs, head } = P, { add, sub, mul, unit, cross, comb } = V3, base = mixCol(o.hex || L.hex, hash(P.seed * 1.7) < .5 ? '#000000' : '#FFFFFF', .08 * hash(P.seed * 3.3));
  const segHex = i => mixCol(L.colors?.[i] || base, L.ink, L.tone?.[i] || 0), headHex = L.headHex || (L.colors ? base : segHex(0));
  const legHex = L.legHex || mixCol(base, L.ink, .45), px = E.px ? E.px(head.c, S) : 1e3, fine = px > 60, R = (L.legR || 1) * S;
  segs.forEach((g, i) => E.ovoid(g.c, g.f, g.u, ...g.ax, segHex(i), 'shell'));
  for (const [i, j, k, r] of L.links || []) E.ball(V3.mix(segs[i].c, segs[j].c, k), r * S, segHex(i), 'shell');
  E.ovoid(head.c, head.f, head.u, ...head.ax, headHex, 'shell');
  // Padrões: listras (anéis), manchas (simétricas), sutura dos élitros e estrias (linhas ao comprido).
  for (const p of L.pattern || []) {
    const g = segs[p.seg], line = phi => { let a = shellPoint(g, -.88, phi); for (let x = -.6; x <= .9; x += .3) { const b = shellPoint(g, x, phi); E.rod(a, b, .012 * S, p.hex, 'shell'); a = b; } };
    if (p.type === 'stripes') for (let j = 0; j < p.n; j++) { const x = -.7 + .8 * (j + .5) / p.n, q = Math.sqrt(1 - x * x) * 1.02; E.ovoid(add(g.c, mul(g.f, x * g.ax[0])), g.f, g.u, .1 * g.ax[0], q * g.ax[1], q * g.ax[2], p.hex, 'shell'); }
    if (p.type === 'seam') line(0);
    if (p.type === 'fold') for (const sg of [1, -1]) {  // asa dobrada: elipsoide achatado no flanco, ponta para trás
      const c = comb(shellPoint(g, -.15, sg * 1.1, .92), [g.f, -.35 * g.ax[0]]), n = unit(sub(c, g.c)), f = unit(sub(g.f, mul(n, V3.dot(g.f, n))));
      E.ovoid(c, f, n, .95 * g.ax[0], .14 * g.ax[1], .55 * g.ax[2], p.hex, 'shell');
    }
    if (p.type === 'bib') E.ovoid(comb(g.c, [g.f, .45 * g.ax[0]], [g.u, -.25 * g.ax[1]]), g.f, g.u, .62 * g.ax[0], .78 * g.ax[1], .9 * g.ax[2], p.hex, 'shell');
    if (p.type === 'ribs' && fine) for (let j = 1; j <= p.n; j++) for (const sg of [1, -1]) line(sg * j * .38);
    if (p.type === 'spots') for (let j = 0; j < p.n; j++) {  // pares simétricos; com n ímpar, a última fica no meio
      const m = j >> 1, mid = p.n % 2 && j === p.n - 1, x = mid ? .7 : .5 - 1.1 * hash(m * 3.1 + p.seg * 7), phi = mid ? 0 : (j % 2 ? 1 : -1) * (.45 + .6 * hash(m * 5.3 + p.seg * 7));
      const c = shellPoint(g, x, phi, 1), n = unit(sub(c, g.c)), f = unit(sub(g.f, mul(n, V3.dot(g.f, n))));
      E.ovoid(c, f, n, .2 * g.ax[2], .05 * g.ax[1], .2 * g.ax[2], p.hex, 'shell');
    }
  }
  if (L.spines) for (const sg of [1, -1]) { const g = segs[0]; E.rod(add(g.c, mul(g.u, .05 * S)), comb(g.c, [g.u, .11 * S], [g.f, -.04 * S], [g.l, sg * .03 * S]), .012 * S, segHex(0), 'shell'); }
  if (L.mandibles) for (const sg of [1, -1]) {
    const h = head, f = unit(comb([0, 0, 0], [h.f, 1], [h.l, -sg * .45])), c = comb(h.c, [h.f, h.ax[0] * .92], [h.l, sg * h.ax[2] * .32], [h.u, -h.ax[1] * .42]);
    E.ovoid(c, f, h.u, L.mandibles * S, .32 * L.mandibles * S, .45 * L.mandibles * S, legHex, 'shell');
  }
  if (L.proboscis) { const h = head, a = comb(h.c, [h.f, h.ax[0] * .5], [h.u, -h.ax[1] * .6]), b = comb(a, [h.f, .4 * L.proboscis * S], [h.u, -L.proboscis * S]); spindle(E, a, b, .011 * S, legHex); E.ovoid(b, h.f, h.u, .022 * S, .015 * S, .024 * S, legHex, 'shell'); }
  if (L.beak) { const [bl, br, bh] = L.beak, h = head, a = comb(h.c, [h.f, h.ax[0] * .85], [h.u, -h.ax[1] * .12]); E.ovoid(add(a, mul(h.f, .5 * bl * S)), h.f, h.u, .6 * bl * S, br * S, 1.1 * br * S, bh, 'shell'); }
  const bone = (a, b, r) => spindle(E, a, b, r, legHex);
  for (const l of P.legs) { bone(l.root, l.mid, .024 * R); bone(l.mid, l.tar, .018 * R); bone(l.tar, l.end, .012 * R); }
  for (const q of P.antennae) { q.slice(1).forEach((p, j) => bone(q[j], p, (j ? .01 : .013) * S)); E.ball(q[q.length - 1], L.antenna.club * S, legHex, 'shell'); }
  for (const w of P.wings) E.quad('wing', w.b, w.X, w.Y, w.Z, L.hex2 || '#FFFFFF');
  // Pelos e cerdas: pontos fixos por segmento (hash), voltados para trás; só de perto.
  if (fine) for (const hr of L.hairs || []) for (let j = 0; j < hr.n; j++) {
    const g = segs[hr.seg], x = .8 - 1.5 * hash(j * 7.1 + hr.seg), phi = 1.6 * (hash(j * 3.7 + hr.seg * 2) - .5) * (j % 2 ? 1 : -1), a = shellPoint(g, x, phi, .98);
    spindle(E, a, add(a, mul(unit(add(sub(a, g.c), mul(g.f, -.35 * Math.hypot(...g.ax)))), hr.len * S)), .004 * S, hr.hex || L.ink);
  }
  drawFace(E, { ...head, hex: headHex }, L.face, faceState(P.t, { seed: P.seed, mood: o.mood, expression: o.expression }), { t: P.t, seed: P.seed, target: o.lookAt });
}
