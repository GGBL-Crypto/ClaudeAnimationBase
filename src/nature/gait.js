// Marchas: fase de cada membro (offset) e fração do ciclo em apoio (duty).
var GAITS = {
  bipedWalk: { duty: .6, offsets: { L: 0, R: .5 } },
  bipedRun: { duty: .35, offsets: { L: 0, R: .5 } },
  quadWalk: { duty: .7, offsets: { RH: 0, RF: .25, LH: .5, LF: .75 } },
  trot: { duty: .5, offsets: { LF: 0, RH: 0, RF: .5, LH: .5 } },
  tripod: { duty: .6, offsets: { L1: 0, R2: 0, L3: 0, R1: .5, L2: .5, R3: .5 } },
  spider: { duty: .6, offsets: { L1: 0, R2: 0, L3: 0, R4: 0, R1: .5, L2: .5, R3: .5, L4: .5 } },
};
// Fase da marcha (ciclos) na distância s. vary > 0: cada passada mede (1 ± vary) stride por ruído estável em s
// (seed), então nenhum ciclo repete o anterior; vary = 0 é o ciclo fixo.
function gaitPhase(s, stride, vary = 0, seed = 0) { const x = s / stride; return vary ? x + vary / 2 * noise1(seed, x) : x; }
// Inversa de gaitPhase: distância em que a fase vale c (ponto fixo; contrai por vary · PI / 2 < .1).
function gaitDist(c, stride, vary = 0, seed = 0) { let x = c; if (vary) for (let i = 0; i < 5; i++) x = c - vary / 2 * noise1(seed, x); return x * stride; }
// Ciclo k do membro na distância s; u = progresso 0..1 dentro do apoio ou do balanço.
function limbCycle(s, offset, stride, duty, vary = 0, seed = 0) {
  const c = gaitPhase(s, stride, vary, seed) + offset, k = Math.floor(c), f = c - k, stance = f < duty;
  return { k, f, stance, u: stance ? f / duty : (f - duty) / (1 - duty) };
}
// Pé preso à âncora do apoio k (o.vary, o.seed: variação por passada, ver gaitPhase); no balanço viaja até a âncora k + 1 e sobe o.lift. Parado (moving → 0), o pé do balanço
// desce sob a raiz (plant(s)) e conta como apoio: o ser fica de pé sobre todos os pés.
function footAt(s, offset, o) {
  const { k, stance, u } = limbCycle(s, offset, o.stride, o.duty, o.vary, o.seed);
  const aK = k => o.vary ? gaitDist(k - offset + o.duty / 2, o.stride, o.vary, o.seed) : (k - offset) * o.stride + o.duty * o.stride / 2, a = o.plant(aK(k));
  if (stance) return { pos: a, stance, lift: 0 };
  const b = o.plant(aK(k + 1)), e = ease(u), m = o.moving ?? 1, w = (1 - m) * Math.sin(Math.PI * u), r = w ? o.plant(s) : a;
  return { pos: [lerp(lerp(a[0], b[0], e), r[0], w), lerp(lerp(a[1], b[1], e), r[1], w)], stance: !m, lift: o.lift * Math.sin(Math.PI * u) * m };
}
// IK de dois ossos pela lei dos cossenos; bend (1 | -1) escolhe o lado do joelho.
function ik2(root, end, l1, l2, bend) {
  const dx = end[0] - root[0], dy = end[1] - root[1], ang = Math.atan2(dy, dx);
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-6, .999 * (l1 + l2));
  const a = ang + bend * Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return { mid: [root[0] + l1 * Math.cos(a), root[1] + l1 * Math.sin(a)], end: [root[0] + d * Math.cos(ang), root[1] + d * Math.sin(ang)] };
}
