// Ambiente e multidões: vento, capim, chuva, passos, folha caindo e gente. Funções puras de t, sem desenho.
function wind(t, x, seed = 0) { return fbm1(seed, t * .4 - x * .0015); }
// Ângulo do capim: .35 de vento + até .9 rad para longe de cada pusher dentro do raio (queda suave).
function bladeBend(t, x, baseY, pushers, radius, seed = 0) {
  let push = 0;
  for (const [px, py] of pushers) {
    const d = Math.hypot(x - px, baseY - py);
    if (d < radius) push += (x >= px ? 1 : -1) * .9 * ease(1 - d / radius);
  }
  return .35 * wind(t, x, seed) + clamp(push, -.9, .9);
}
// Gota i nasce em (i + hash(seed + i)) / rate; só os índices que podem estar ativas perto de t são avaliadas.
function rain(t, area, rate, seed) {
  const FALL = .6, SPLASH = .35, out = [];
  for (let i = Math.max(0, Math.floor((t - FALL - SPLASH) * rate) - 1); i <= Math.floor(t * rate); i++) {
    const age = t - (i + hash(seed + i)) / rate;
    if (age < 0 || age >= FALL + SPLASH) continue;
    const endY = area.y + area.h * hash(seed + i + 77), k = Math.min(1, age / FALL);
    out.push({ id: i, x: area.x + area.w * hash(seed + i + 33), y: lerp(area.y, endY, k), k, splash: age < FALL ? 0 : (age - FALL) / SPLASH });
  }
  return out;
}
// Tempos de início de apoio (mudança de ciclo do limbCycle), amostrando a 1/120 s.
function stepEvents(sOf, t0, t1, offset, stride, duty) {
  const out = [], h = 1 / 120;
  let prev = limbCycle(sOf(t0), offset, stride, duty);
  for (let t = t0 + h; t <= t1; t += h) {
    const cur = limbCycle(sOf(t), offset, stride, duty);
    if (cur.k > prev.k && cur.stance) out.push(t);
    prev = cur;
  }
  return out;
}
// Folha de t0 em from [x, y] até groundY, balançando com ruído.
function flutter(t, t0, from, groundY, seed) {
  const age = Math.max(0, t - t0), y = Math.min(groundY, from[1] + 90 * age);
  return { x: from[0] + 60 * noise1(seed, age * .8), y, angle: .8 * noise1(seed + 1, age * 1.3), landed: y >= groundY };
}
// n pessoas espaçadas ao longo do caminho, andando em loop; s sempre em [0, length).
function crowd(path, t, n, seed, o = { speed: 1.1, spacing: 1.6, carryEvery: 3, sizeVar: .25 }) {
  const out = [], L = path.length;
  for (let j = 0; j < n; j++) {
    const s0 = j * o.spacing + hash(seed + j) * o.spacing * .5;
    out.push({ s: (((s0 + o.speed * t) % L) + L) % L, size: 1 + o.sizeVar * (hash(seed + j + 55) * 2 - 1), carry: j % o.carryEvery === 0, seed: seed * 131 + j });
  }
  return out;
}
