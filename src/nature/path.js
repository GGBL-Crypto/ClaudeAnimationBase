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
function travel(t, keys) {
  const h = 1 / 48, s = kf(t, keys), speed = (kf(t + h, keys) - kf(t - h, keys)) / (2 * h);
  return { s, speed, moving: clamp(Math.abs(speed) / .3) };
}
