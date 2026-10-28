// Atores de cena sem desenho: deslocamento com partidas e paradas, pessoas (skeleton.js + creaturePose), mãos na fala e
// multidões de crowd.js em poses. Tudo função pura de t. Depende de path, gait, creature, specs, skeleton e crowd.

// Progresso com parada (o modelo de pausa de crowd.js): anda a v BL/s desde t0 e para em ta, com rampa de r s.
const stopAt = (t, s0, t0, v, ta, r) => s0 + v * (Math.max(t, t0) - t0) - v * pauseLost(t, ta, 1e4, r);
const speedOf = (f, t) => (f(t + 1 / 60) - f(t - 1 / 60)) * 30;
// Deslocamento com partidas e paradas: cada trecho [t0, t1, v, r] parte do repouso em t0 e para em t1 com rampas de
// cosseno de r s, andando v · (t1 − t0) BL; t0 < 0 = já entra andando.
function go(t, legs) { return legs.reduce((s, [t0, t1, v, r = .7]) => s + v * (pauseLost(t, t0, 1e4, r) - pauseLost(t, t1, 1e4, r)), 0); }
const span = (t, a, b, r = .3) => ease(seg(t, a, a + r)) * (1 - ease(seg(t, b - r, b)));  // 0 → 1 → 0 em [a, b]

// Chão de quem anda no próprio caminho (túneis): y do caminho no x pedido, perto da distância d.
// Raízes de path.at(e).x = x por troca de sinal e bisseção numa janela de ±80 px; vale a mais perto de d.
const pathGround = (path, d) => x => {
  let best = null;
  for (let e = d - 80; e < d + 80; e += 4) {
    let a = e, b = e + 4; const sa = Math.sign(path.at(a).x - x); if (sa === Math.sign(path.at(b).x - x)) continue;
    for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (Math.sign(path.at(m).x - x) === sa) a = m; else b = m; }
    if (best === null || Math.abs(a - d) < Math.abs(best - d)) best = a;
  }
  return path.at(best ?? d).y;
};

// Pessoa: tipo de corpo, altura (px), sentido (1 = para a direita), trechos e ref [t, x] (pelve em x no instante t).
// o.y = altura do caminho; o.ground = chão (x → y, padrão plano em o.y); mood = chaves de mood(); talk = [[t0, t1], ...].
function person(id, type, size, dir, legs, ref, o = {}) {
  const spec = o.spec || humanSpec(type), x0 = ref[1] - dir * size * go(ref[0], legs), y = o.y ?? 0;
  return { id, type, size, dir, legs, spec, path: makePath([[x0, y], [x0 + dir * 2e4, y]]), v: Math.max(...legs.map(l => Math.abs(l[2]))), talk: [], ground: () => y, ...o };
}
// Pose da pessoa em t: s dos trechos (ou o.s), corpo abaixado o.d BL, inclinação o.lean, gestos e mãos; rosto por mood e talk.
function personPose(c, t, o = {}) {
  const s = o.s ?? go(t, c.legs), m = mood(t, c.mood, c.seed), mouth = c.talk.map(([a, b]) => talk(t, c.seed, a, b)).find(x => x) || null;
  const moving = o.moving ?? clamp(Math.abs(speedOf(u => go(u, c.legs), t)) / c.v);
  return creaturePose(lowered(c.spec, o.d || 0), { path: c.path, s, size: c.size, ground: c.ground, t, seed: c.seed, moving, lean: o.lean || 0, gesture: o.gesture, hands: o.hands, expression: m.expression, blink: m.blink, emote: m.emote, sq: m.sq, mouth });
}
// Fala com as mãos: nos trechos de fala, as pontas das duas mãos passeiam à frente do peito (ruído por semente).
function talkHands(c, p, t) {
  const k = Math.max(0, ...c.talk.map(([a, b]) => span(t, a, b, .35))), S = c.size;
  if (!k) return [];
  return ['armL', 'armR'].map((limb, i) => {
    const r = p.limbs[limb].root, M = [r[0] + c.dir * (.17 + .06 * noise1(c.seed + i, t * 1.7)) * S, r[1] + (.24 - .08 * Math.max(0, noise1(c.seed + 3 + i, t * 1.3))) * S];
    return { limb, target: handTo(p, c.spec, limb, M), k, hand: i ? 'open' : noise1(c.seed + 9, t) > .3 ? 'point' : 'open' };
  });
}
// Multidão de makeCrowd em atores: pose de creaturePose(spec) por membro, alpha nos trechos escondidos das pontas (hide).
// carry = carga de quem carrega ({w, h} em BL).
function crowdActors(crowd, t, spec = SPECS.ant, kind = 'ant', carry = { w: 1.1, h: .7 }) {
  return crowd.at(t).map(a => {
    const ln = crowd.lanes[a.lane], S = ln.S, L = ln.path.length, [h0, h1] = ln.hide || [0, 0];
    const pose = creaturePose(spec, { path: ln.path, s: a.s / S, size: S, ground: ln.ground, t, seed: a.seed, moving: a.moving, carry: a.carry ? carry : null, antennae: a.meet ? 'tap' : undefined });
    const alpha = h0 || h1 ? clamp(Math.min(h0 ? (a.s - h0) / (.6 * S) : 1, h1 ? (L - h1 - a.s) / (.6 * S) : 1)) : 1;
    return { id: a.id, kind, role: ln.role, layer: ln.layer ?? 1, depth: ln.depth ?? 0, pose, track: ln.path.at(a.s), ground: ln.ground || pathGround(ln.path, a.s), hidden: a.hidden, alpha };
  });
}
