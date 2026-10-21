// Universal timing and motion, extracted unchanged from the original engine.
const PROJECT = globalThis.projectConfig || globalThis.PROJECT;
const STYLE = PROJECT.styleConfig || globalThis.STYLE;
const W = 1920, H = 1080;
const BPM = PROJECT.bpm, BEAT = 60 / BPM, OFF = PROJECT.offset || 0, DUR = PROJECT.duration;
const TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const backOut = x => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const bpOf = t => (t - OFF) / BEAT;
// ---------- timing helpers (everything is a pure function of t; no state survives between frames) ----------
const seg = (t, a, b) => clamp((t - a) / (b - a));                 // 0..1 progress of t through [a, b]
const frac = x => x - Math.floor(x);
const beatN = t => Math.floor(bpOf(t));                            // integer beat index
const pulse = (t, k = 6) => Math.exp(-frac(bpOf(t)) * k);          // 1 exactly on each beat, decays after
const pulse2 = (t, k = 6) => Math.exp(-frac(bpOf(t) * 2) * k);     // same on eighth notes
const wob = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);
const easeIn = x => Math.pow(clamp(x), 3);
const elasticOut = x => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (TAU / 3)) + 1; };
// keyframes: kf(t, [[t0, v0], [t1, v1], ...], easeFn). Values may be numbers or arrays of numbers.
function kf(t, keys, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((t - a) / (b - a));
      return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
    }
  }
  return keys[keys.length - 1][1];
}
// hex color mix
function mixCol(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), c = i => Math.round(lerp((pa >> i) & 255, (pb >> i) & 255, clamp(k)));
  return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
}
// small deterministic camera shake, changes at 24 fps
const shakeXY = (t, amt) => { const f = Math.floor(t * 24); return [(hash(f * 1.7) - .5) * 2 * amt, (hash(f * 2.3 + 9) - .5) * 2 * amt]; };

// ---------- motion principles, as pure functions of t ----------
// Damped spring kicked at t0: 0 before, then a wobble that dies away. Use it for secondary motion and settles: a body
// after landing, a hat that jiggles, a stack that sways, a tail that drags. k = damping, w = wobble speed (rad/s).
const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
const ring = (t, evs, k = 6, w = 18) => evs.reduce((s, e) => s + spring(t, e, k, w), 0);    // one kick per event time
// Hold each drawing for two frames (12 drawings a second), like hand-drawn animation "on twos". Wrap a shot's t in it.
const onTwos = t => Math.floor(t * 12 + 1e-6) / 12;
// Point on a thrown or jumping arc from p0 to p1, peaking h px above the straight line; k = 0..1 along the flight.
const arcPt = (p0, p1, h, k) => [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - h * 4 * k * (1 - k)];
// A hop that takes off at t0 and lands at t1, h body units high: crouch (anticipation), stretch on takeoff,
// round at the top, squash on landing and spring back. Returns { dy, sq } to spread into clawd().
function jump(t, t0, t1, h = 3) {
  if (t < t0 - .12) return { dy: 0, sq: 0 };
  if (t < t0) return { dy: 0, sq: .18 * ease(seg(t, t0 - .12, t0)) };
  if (t < t1) { const k = (t - t0) / (t1 - t0); return { dy: -h * 4 * k * (1 - k), sq: -.16 * Math.abs(1 - 2 * k) }; }
  const a = t - t1; return { dy: 0, sq: .22 * Math.exp(-8 * a) * Math.cos(20 * a) };
}
// A surprise "take" peaking at t0: a quick squash, then a big stretch up that springs back. amt scales it.
function take(t, t0, amt = 1) {
  if (t < t0 - .1) return { sq: 0, dy: 0 };
  if (t < t0) return { sq: .12 * amt * ease(seg(t, t0 - .1, t0)), dy: 0 };
  const a = t - t0; return { sq: -.26 * amt * Math.exp(-6 * a) * Math.cos(16 * a), dy: -1.2 * amt * Math.exp(-7 * a) * Math.max(0, Math.cos(9 * a)) };
}
// Walk from x0 to x1 (px) between t0 and t1, for a character of unit u: eases in and out, faces the way it's
// going in 3/4 view, and faces front when it stops. Returns { x, walk, view, flip, dy } for clawd().
function stroll(t, t0, t1, x0, x1, u) {
  const x = lerp(x0, x1, ease(seg(t, t0, t1))), d = Math.abs(x - x0) / (4 * u), moving = t > t0 && t < t1;
  return { x, walk: d, view: moving ? 'q' : 'front', flip: x1 < x0, dy: moving ? -Math.abs(Math.sin(d * Math.PI)) * .5 : 0 };
}
