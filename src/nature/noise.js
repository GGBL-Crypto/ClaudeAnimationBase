// Ruído de valor 1D determinístico: função pura de (seed, x), sem estado entre quadros.
function noise1(seed, x) {
  const i = Math.floor(x), f = (1 - Math.cos((x - i) * Math.PI)) / 2;
  const v = k => hash(seed * 1013 + k) * 2 - 1;
  return v(i) + (v(i + 1) - v(i)) * f;
}
function fbm1(seed, x, octaves = 3) {
  let sum = 0, amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += amp * noise1(seed + o * 17, x * (1 << o)); norm += amp; amp /= 2; }
  return sum / norm;
}
