// Caminho Catmull-Rom parametrizado por comprimento de arco (64 amostras por segmento).
function makePath(points) {
  if (!points || points.length < 2) throw new Error('makePath precisa de ao menos 2 pontos');
  const N = 64, P = i => points[Math.max(0, Math.min(points.length - 1, i))];
  const samples = [{ x: points[0][0], y: points[0][1], d: 0 }];
  for (let s = 0; s < points.length - 1; s++) {
    const p0 = P(s - 1), p1 = P(s), p2 = P(s + 1), p3 = P(s + 2);
    for (let j = 1; j <= N; j++) {
      const u = j / N, u2 = u * u, u3 = u2 * u;
      const c = k => .5 * (2 * p1[k] + (p2[k] - p0[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * u3);
      const x = c(0), y = c(1), a = samples[samples.length - 1];
      samples.push({ x, y, d: a.d + Math.hypot(x - a.x, y - a.y) });
    }
  }
  const length = samples[samples.length - 1].d;
  function at(d) {
    d = Math.max(0, Math.min(length, d));
    let lo = 0, hi = samples.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (samples[m].d <= d) lo = m; else hi = m; }
    const a = samples[lo], b = samples[hi], k = b.d > a.d ? (d - a.d) / (b.d - a.d) : 0;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  return { length, at };
}
// Deslocamento s(t) por keyframes; speed = derivada central, moving = 0..1 (0 parado).
// Sem o, cada trecho é suavizado por kf. Com o = {start, stop, vary = .08, seed = 0}: trechos com velocidade constante;
// partindo do repouso (primeira chave ou após uma pausa) a velocidade sobe com ease em `start` s, e ao parar desce em
// `stop` s, sem mudar as chaves. A velocidade oscila por noise1 até ±vary. Devolve também lean (antecipação antes da
// partida e assentamento com overshoot após a parada, em unidades da inclinação de marcha) e drag (sobreposição para
// cauda, orelhas, cabelo e chapéu: uma mola frouxa segue a velocidade; drag = 2 · (mola − velocidade) fica > 0 quando o
// corpo freia, passa do ponto depois da parada e assenta em alguns segundos).
const LAG = { w: 5, z: .15 };  // mola frouxa do drag: ~.8 Hz, passa bem do ponto
function travel(t, keys, o) {
  const h = 1 / 48;
  if (!o) { const s = kf(t, keys), speed = (kf(t + h, keys) - kf(t - h, keys)) / (2 * h); return { s, speed, moving: clamp(Math.abs(speed) / .3) }; }
  const { start = .6, stop = .6, vary = .08, seed = 0 } = o, n = keys.length, I = x => x * x * x - x * x * x * x / 2;  // ∫ ease
  const still = i => i < 0 || i >= n - 1 || keys[i + 1][1] === keys[i][1];
  const S = t => {
    if (t <= keys[0][0]) return keys[0][1];
    let i = 0; while (i < n - 1 && t >= keys[i + 1][0]) i++;
    if (i === n - 1) return keys[i][1];
    const [a, sa] = keys[i], [b, sb] = keys[i + 1], d = b - a;
    if (sa === sb) return sa;
    let ra = still(i - 1) ? start : 0, rb = still(i + 1) ? stop : 0;
    if (ra + rb > d) { const k = d / (ra + rb); ra *= k; rb *= k; }
    // Ruído de ritmo: o tempo do trecho é deformado (zero nas pontas), limitado para |velocidade − 1| ≤ vary.
    const f = .7, A = vary / (Math.PI * f + Math.PI / d), w = Math.sin(Math.PI * (t - a) / d);
    const u = clamp(t - a + A * w * w * noise1(seed, t * f), 0, d), V = 1 / (d - ra / 2 - rb / 2);
    const x = u < ra ? ra * I(u / ra) : u > d - rb ? d - ra / 2 - rb / 2 - rb * I((d - u) / rb) : u - ra / 2;
    return lerp(sa, sb, V * x);
  };
  const s = S(t), speed = (S(t + h) - S(t - h)) / (2 * h);
  let lean = 0, drag = 0;
  for (let i = 0; i < n - 1; i++) {
    const [a, sa] = keys[i], [b, sb] = keys[i + 1];
    if (sa === sb) continue;
    if (still(i - 1)) lean += .8 * ease(seg(t, a - .35, a)) * (1 - ease(seg(t, a, a + start)));  // inclina antes do 1º passo
    if (still(i + 1)) lean += 1.2 * spring(t, b - .1, 5, 10);  // o tronco passa do ponto e volta
  }
  // springTrack sobre a velocidade amostrada a cada .1 s nos últimos 4 s, numa grade absoluta (igual em qualquer quadro).
  const v = u => (S(u + h) - S(u - h)) / (2 * h), k = Math.floor(t * 10), track = [];
  for (let j = k - 40; j <= k; j++) track.push([j / 10, v(j / 10)]);
  drag = 2 * (springTrack(t, track, LAG) - speed);
  return { s, speed, moving: clamp(Math.abs(speed) / .3), lean, drag };
}
