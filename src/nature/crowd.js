// Multidão com regras físicas, função pura de t, sem desenho (o 2D e o 3D usam). Cada agente nasce no começo do
// caminho da sua faixa e some no fim (as pontas ficam fora do quadro ou dentro de um túnel ou obstáculo: lane.hide);
// nunca há loop por módulo. Progresso s(t) contínuo e monotônico: o relógio do agente anda em velocidade própria e para
// nas pausas com rampa de cosseno (partida e parada suaves). Fila na mesma faixa, na ordem de nascimento:
// s_i = smin(s_livre_i, s_{i−1} − gap), mínimo suave (nunca passa do mínimo, aceleração limitada). Encontros: quando
// dois agentes vêm de frente em faixas vizinhas, os dois param 0,5–1 s com as cabeças lado a lado (tocam as antenas)
// e seguem; os encontros saem de uma varredura determinística na construção, nunca de estado entre quadros.
// Unidades: caminhos e posições no mundo; speed, gap, reach, near e k em BL (lane.S = BL em unidades do mundo).

// Caminho 3D Catmull-Rom por comprimento de arco: at(d) → {p: [x, y, z], f: frente unitária}.
function makePath3(points) {
  if (!points || points.length < 2) throw new Error('makePath3 precisa de ao menos 2 pontos');
  const N = 32, P = i => points[Math.max(0, Math.min(points.length - 1, i))], S = [{ p: points[0].slice(), d: 0 }];
  for (let s = 0; s < points.length - 1; s++) {
    const p0 = P(s - 1), p1 = P(s), p2 = P(s + 1), p3 = P(s + 2);
    for (let j = 1; j <= N; j++) {
      const u = j / N, u2 = u * u, u3 = u2 * u, a = S[S.length - 1].p;
      const p = [0, 1, 2].map(k => .5 * (2 * p1[k] + (p2[k] - p0[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * u3));
      S.push({ p, d: S[S.length - 1].d + Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) });
    }
  }
  const length = S[S.length - 1].d;
  function at(d) {
    d = Math.max(0, Math.min(length, d));
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].d <= d) lo = m; else hi = m; }
    const a = S[lo], b = S[hi], k = b.d > a.d ? (d - a.d) / (b.d - a.d) : 0, l = b.d - a.d || 1;
    return { p: [0, 1, 2].map(i => a.p[i] + (b.p[i] - a.p[i]) * k), f: [0, 1, 2].map(i => (b.p[i] - a.p[i]) / l) };
  }
  return { length, at };
}
// Chaikin: arredonda cantos de uma polilinha (qualquer dimensão), mantendo as pontas; n passadas.
function chaikin(pts, n = 2) {
  for (let r = 0; r < n; r++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; out.push(a.map((v, k) => .75 * v + .25 * b[k]), a.map((v, k) => .25 * v + .75 * b[k])); }
    out.push(pts[pts.length - 1]); pts = out;
  }
  return pts;
}
// Reamostra uma polilinha (qualquer dimensão) a passos iguais de comprimento: o Catmull-Rom com pontos muito desiguais
// faz laços e bicos (Chaikin deixa pontos colados nas pontas).
function resample(pts, step) {
  const out = [pts[0]]; let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(...a.map((v, k) => b[k] - v));
    for (let d = step - carry; d < l; d += step) out.push(a.map((v, k) => v + (b[k] - v) * d / l));
    carry = l ? (carry + l) % step : carry;
  }
  out.push(pts[pts.length - 1]); return out;
}
// Polilinha deslocada para o lado (+ = esquerda de quem anda de a para b), em [x, z] ou [x, y].
function offsetPts(pts, side) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] + side * dy / l, p[1] - side * dx / l];
  });
}
// Cápsulas {a, b, r} ao longo de um caminho (makePath: [x, y]; makePath3: [x, z]) para as zonas livres do espalhamento.
function pathZones(path, r, step = .4) {
  const xz = d => { const q = path.at(d); return q.p ? [q.p[0], q.p[2]] : [q.x, q.y]; }, out = [];
  for (let d = 0; d < path.length; d += step) out.push({ a: xz(d), b: xz(Math.min(path.length, d + step)), r });
  return out;
}

// Pausa [ta, dur] com rampas de r s: tempo que o relógio do agente perdeu até t (integral de 1 − fator de velocidade).
function pauseLost(t, ta, dur, r) {
  const u = t - ta;
  if (u <= 0) return 0;
  if (u < r) return r * (u / r / 2 - Math.sin(Math.PI * u / r) / (2 * Math.PI));
  if (u < r + dur) return r / 2 + u - r;
  if (u < 2 * r + dur) { const w = (u - r - dur) / r; return r / 2 + dur + r * (w / 2 + Math.sin(Math.PI * w) / (2 * Math.PI)); }
  return dur + r;
}
// Mínimo suave: ≤ min(a, b), contínuo com derivada contínua; k = largura da transição.
function smin(a, b, k) { const d = Math.abs(a - b); return Math.min(a, b) - (d > 30 * k ? 0 : k * Math.log1p(Math.exp(-d / k))); }

// Queda analítica com arrasto: velocidade terminal vt (unidades/s) e constante tau (s); balança de lado (sway) e para
// no chão floorY. from = [x, y, z] (y para cima). Devolve {p, landed, age, spin}.
function fall(t, t0, from, floorY, o = {}) {
  const { vt = .6, tau = .25, sway = 0, seed = 0 } = o, y = a => from[1] - vt * (a - tau * (1 - Math.exp(-a / tau)));
  // Instante do pouso por bisseção num intervalo fixo (y é monotônica), igual em qualquer quadro.
  let lo = 0, hi = (from[1] - floorY) / vt + 10 * tau; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (y(m) > floorY) lo = m; else hi = m; }
  const landed = t - t0 >= hi, a = Math.min(Math.max(0, t - t0), hi);
  const w = sway * Math.min(1, a / (2 * tau));
  return { p: [from[0] + w * (noise1(seed, a * .7) - noise1(seed, 0)), Math.max(floorY, y(a)), from[2] + .5 * w * (noise1(seed + 9, a * .6) - noise1(seed + 9, 0))], landed, age: a, spin: noise1(seed + 3, a * .9) };
}
// Arco balístico de a até b em dur s, gravidade constante g (o ápice sobe g · dur² / 8). Puro.
function toss(t, t0, a, b, dur, g = 9.8) {
  const u = Math.max(0, Math.min(dur, t - t0)), k = u / dur;
  return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k) + .5 * g * u * (dur - u), lerp(a[2], b[2], k)], landed: u >= dur, k };
}

// lanes: [{path (makePath ou makePath3, no sentido da marcha), S, speed (BL/s), gap (BL), rate (agentes/s), seed,
// t0, t1 (janela em que a faixa precisa estar povoada), vary (±fração da velocidade), carry (fração que carrega),
// hide: [início, fim] (trechos escondidos, em unidades do caminho)}]. o: {meet (probabilidade de parar num encontro),
// reach (BL da cabeça à frente do centro), near (BL de distância lateral máxima), pause: [mín, máx] s, ramp s, cool s
// (intervalo mínimo entre encontros do mesmo agente), k (BL, suavidade da fila)}.
function makeCrowd(lanes, o = {}) {
  const { meet = .5, reach = .22, near = 1.2, pause = [.5, 1], ramp = .6, cool = 4, k: kq = .3 } = o;
  const P3 = (path, s) => { const q = path.at(s); return q.p ? q : { p: [q.x, 0, q.y], f: [Math.cos(q.angle), 0, Math.sin(q.angle)] }; };
  const agents = lanes.map((ln, li) => {
    const { S, speed, rate, seed = li, t0 = 0, t1 = 60, vary = .12, carry = 0 } = ln, L = ln.path.length, n = Math.ceil((t1 - t0 + L / (speed * S * (1 - vary))) * rate);
    return Array.from({ length: n }, (_, i) => {
      const h = j => hash(seed * 7.31 + i * 1.97 + j), v = speed * S * (1 + vary * (2 * h(1) - 1));
      return { id: `${ln.id ?? li}:${i}`, lane: li, i, ts: t0 - L / v + (i + .8 * h(2)) / rate, v, seed: Math.floor(seed * 1000 + i), carry: h(3) < carry, pauses: [] };
    });
  });
  const clock = (a, t) => t - a.ts - a.pauses.reduce((s, [ta, dur]) => s + pauseLost(t, ta, dur, ramp), 0);
  // Fila: s de cada agente da faixa, na ordem de nascimento; free = s sem fila.
  const laneAt = (li, t) => { const ln = lanes[li], gap = (ln.gap ?? 1) * ln.S, k = kq * ln.S; let prev = Infinity; return agents[li].map(a => { const free = a.v * clock(a, t), s = prev === Infinity ? free : smin(free, prev - gap, k); prev = s; return { a, s, free }; }); };
  // Varredura de encontros: cruzamentos (a cabeça de B passa pela de A, de frente, a menos de near) em ordem de tempo;
  // aceitar um muda o movimento depois dele, então a varredura recomeça dali.
  const T0 = Math.min(...lanes.map(l => l.t0 ?? 0)), T1 = Math.max(...lanes.map(l => l.t1 ?? 60)), h = 1 / 15, seen = new Set(), last = new Map();
  const live = (st, ln) => st.s >= (ln.hide?.[0] ?? 0) && st.s <= ln.path.length - (ln.hide?.[1] ?? 0);
  const heads = t => lanes.flatMap((ln, li) => laneAt(li, t).filter(st => live(st, ln)).map(st => { const q = P3(ln.path, st.s); return { ...st, ln, c: q.p, f: q.f, hd: q.p.map((v, j) => v + q.f[j] * reach * ln.S) }; }));
  const scan = from => {
    const out = []; let prev = null;
    for (let t = from; t <= T1; t += h) {
      const cur = new Map(heads(t).map(x => [x.a.id, x]));
      if (prev) for (const A of cur.values()) for (const B of cur.values()) {
        if (A.a.id >= B.a.id || seen.has(A.a.id + '|' + B.a.id)) continue;
        const pA = prev.get(A.a.id), pB = prev.get(B.a.id); if (!pA || !pB) continue;
        if (A.f[0] * B.f[0] + A.f[1] * B.f[1] + A.f[2] * B.f[2] > -.7) continue;
        const q = X => (X.B.hd[0] - X.A.hd[0]) * X.A.f[0] + (X.B.hd[1] - X.A.hd[1]) * X.A.f[1] + (X.B.hd[2] - X.A.hd[2]) * X.A.f[2], q0 = q({ A: pA, B: pB }), q1 = q({ A, B });
        if (q0 > 0 && q1 <= 0) {
          const d = [0, 1, 2].map(j => B.hd[j] - A.hd[j] - A.f[j] * q1), lat = Math.hypot(...d), S = Math.min(A.ln.S, B.ln.S);
          if (lat < near * S) out.push({ t: t - h * q1 / (q1 - q0), A: A.a, B: B.a, side: Math.sign(d[0] * A.f[2] - d[2] * A.f[0]) || 1 });
        }
      }
      prev = cur; if (out.length) break;  // o mais cedo primeiro
    }
    return out.sort((x, y) => x.t - y.t);
  };
  for (let from = T0, guard = 0; guard < 400; guard++) {
    const found = scan(from); if (!found.length) break;
    let changed = false;
    for (const c of found) {
      seen.add(c.A.id + '|' + c.B.id);
      const ta = c.t - ramp / 2, dur = lerp(pause[0], pause[1], hash(c.A.seed * .37 + c.B.seed * .61));
      const free = x => { const st = laneAt(x.lane, ta).find(y => y.a === x); return st.free - st.s < .02 * lanes[x.lane].S; };
      if (hash(c.A.seed * 1.3 + c.B.seed * 2.9) >= meet || [c.A, c.B].some(x => (last.get(x.id) ?? -1e9) > ta - cool || !free(x))) continue;
      c.A.pauses.push([ta, dur, c.B.id, c.side]); c.B.pauses.push([ta, dur, c.A.id, -c.side]); last.set(c.A.id, ta + dur); last.set(c.B.id, ta + dur);
      from = c.t; changed = true; break;
    }
    if (!changed) from = found[0].t + h / 2;
  }
  // Por quadro: agentes vivos (0 ≤ s ≤ comprimento), com velocidade, encontro (k 0..1, quem, de que lado) e hidden.
  function at(t) {
    const out = [], e = 1 / 60;
    lanes.forEach((ln, li) => {
      const now = laneAt(li, t), b = laneAt(li, t - e), c = laneAt(li, t + e);
      now.forEach((st, j) => {
        if (st.s < 0 || st.s > ln.path.length) return;
        const a = st.a, speed = (c[j].s - b[j].s) / (2 * e) / ln.S, m = a.pauses.find(([ta, dur]) => t > ta && t < ta + 2 * ramp + dur);
        const meetK = m ? Math.min(1, (t - m[0]) / ramp, (m[0] + 2 * ramp + m[1] - t) / ramp) : 0;
        out.push({ id: a.id, lane: li, seed: a.seed, s: st.s, speed, moving: clamp(speed / (a.v / ln.S)), carry: a.carry, hidden: !live(st, ln), meet: m ? { k: ease(meetK), other: m[2], side: m[3] } : null });
      });
    });
    return out;
  }
  return { lanes, agents, at };
}
