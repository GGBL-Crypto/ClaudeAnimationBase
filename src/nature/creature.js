// Ser genérico (coluna, membros, apêndices, cabeça) como função pura de (spec, o); especificações em specs.js. Sem desenho.
// Unidades: s, offsets e comprimentos da especificação em BL; o.size = BL em pixels; a pose sai em pixels.

// Cadeia com movimento secundário (antenas, caudas, orelhas, cabelo). Cada junta soma ao ângulo do pai o mesmo ruído
// com atraso de fase `lag` (onda que desce a cadeia); `gravity` (0..1) puxa cada segmento para baixo.
function chain(base, angle0, lengths, t, seed, o = {}) {
  const { lag = .15, amp = .35, freq = 1.5, gravity = 0 } = o, pts = [base];
  let a = angle0, [x, y] = base;
  lengths.forEach((l, i) => {
    a += amp * noise1(seed, t * freq - i * lag);
    a += gravity * Math.atan2(Math.cos(a), Math.sin(a));  // atan2(cos, sin) = diferença angular até PI / 2 (para baixo)
    x += l * Math.cos(a); y += l * Math.sin(a); pts.push([x, y]);
  });
  return pts;
}

// Pose de qualquer ser descrito por uma especificação. Coluna em s − offset do caminho (efeito vagão); pés plantados
// pela marcha (footAt); corpo baixa o bastante para cada pé alcançar o chão, o que dá o balanço vertical da passada.
function creaturePose(spec, o) {
  if (!spec || !o || !o.path) throw new Error('creaturePose precisa de uma especificação e de o.path');
  const { path, s, size, view = 'side', t = 0, seed = 0, moving = 1, age = 0, flinch = 0 } = o;
  if (!spec.views.includes(view)) throw new Error(`O ser ${spec.id} não tem a vista ${view}`);
  const gaitName = o.gait || spec.gait, flying = gaitName === 'fly';
  if (flying && !spec.flyer) throw new Error(`O ser ${spec.id} não voa`);
  const gait = flying ? null : typeof gaitName === 'string' ? GAITS[gaitName] : gaitName;
  if (typeof gaitName === 'string' && !flying && !gait) throw new Error(`Marcha desconhecida: ${gaitName}`);
  const sv = view === 'side', air = flying || !!spec.swimmer, life = clamp(o.alive ?? 1), dead = 1 - life, ageK = 1 - .5 * clamp(age);
  const sB = s - .1 * flinch;  // o susto recua o corpo; os pés plantados ficam onde estão
  // path.at limita d a [0, length]; aqui o caminho continua reto pela tangente das pontas, senão o corpo se amassa nelas.
  const at = d => { const c = clamp(d, 0, path.length), p = path.at(c), e = d - c; return e ? { x: p.x + e * Math.cos(p.angle), y: p.y + e * Math.sin(p.angle), angle: p.angle } : p; };
  const dir = sv ? o.facing || (Math.cos(at(sB * size).angle) < 0 ? -1 : 1) : 1;
  const groundAt = p => sv && !air ? (o.ground ? o.ground(p.x) : p.y) : p.y;
  // Desloca p em BL: dx à frente; dy para baixo na vista lateral, para a direita do ser na vista superior.
  const local = (p, a, dx, dy) => sv ? [p[0] + dir * dx * size, p[1] + dy * size]
    : [p[0] + (Math.cos(a) * dx - Math.sin(a) * dy) * size, p[1] + (Math.sin(a) * dx + Math.cos(a) * dy) * size];
  const place = (back, h) => { const p = at((sB - back) * size), gy = groundAt(p); return { x: p.x, y: sv && !air ? gy - h * size : p.y, a: p.angle, gy }; };
  const rootOf = (lb, g) => sv ? local([g.x, g.y], 0, lb.along, -(lb.h || 0)) : local([g.x, g.y], g.a, lb.along, -lb.side * spec.spine[lb.attach].r * .5);

  // Coluna; nadadores ondulam numa onda viajante que cresce da cabeça para a cauda.
  const n = spec.spine.length, sw = spec.swimmer;
  const segs = spec.spine.map((g, i) => {
    const q = place(g.offset, g.h || 0);
    if (sw) {
      const u = n > 1 ? i / (n - 1) : 0, w = sw.amp * size * (.2 + .8 * u) * (.4 + .6 * moving) * ageK * life * Math.sin(TAU * (t * sw.freq - u * sw.wave));
      q.x -= Math.sin(q.a) * w; q.y += Math.cos(q.a) * w;
    }
    return q;
  });

  // Pés: footAt com a âncora projetada no caminho (e no chão, na vista lateral). Usa s, não sB: o susto não arrasta pés.
  const legs = spec.limbs.filter(lb => lb.foot), steps = {};
  if (!flying) for (const lb of legs) {
    const g = spec.spine[lb.attach], key = lb.key || lb.name, ph = gait.offsets[key], lat = -lb.side * (g.r * .5 + lb.rest[1]);
    if (ph === undefined) throw new Error(`A marcha não tem fase para o membro ${key}`);
    const plant = sA => { const p = at((sA - g.offset + lb.along + lb.rest[0]) * size); return sv ? [p.x, groundAt(p)] : local([p.x, p.y], p.angle, 0, lat); };
    const f = footAt(s, ph, { stride: spec.stride, duty: gait.duty, lift: spec.lift * size * ageK, moving, plant });
    if (sv && !f.stance) f.pos = [f.pos[0], groundAt({ x: f.pos[0], y: f.pos[1] }) - f.lift];
    steps[lb.name] = f;
  }
  // Saltadores sobem junto com os pés; depois o corpo baixa até cada pé (contínuo: pés no ar pedem menos).
  let shift = 0;
  if (sv && !air && legs.length) {
    const hop = spec.hop ? Math.max(...legs.map(lb => steps[lb.name].lift)) : 0;
    let drop = 0;
    for (const lb of legs) {
      const r = rootOf(lb, segs[lb.attach]), f = steps[lb.name].pos, R = .97 * (lb.l1 + lb.l2) * size, dx = f[0] - r[0];
      if (Math.abs(dx) < R) drop = Math.max(drop, f[1] - (r[1] - hop) - Math.sqrt(R * R - dx * dx));
    }
    shift = drop - hop;
  }
  // Morte: o corpo deita no chão (segmentos altos caem para trás, como um humano de costas).
  const low = Math.min(...spec.spine.map(g => g.h || 0));
  const settle = (q, h, r) => ({ ...q, x: sv ? q.x - dir * (h - low) * size * dead : q.x, y: sv ? lerp(q.y + shift, q.gy - r * size, dead) : q.y });
  const body = segs.map((q, i) => settle(q, spec.spine[i].h || 0, spec.spine[i].r));
  const head = settle(place(spec.head.offset, spec.head.h || 0), spec.head.h || 0, spec.head.r);
  head.y -= .05 * size * flinch * life;
  const tilt = -.35 * flinch + .7 * dead, headAngle = sv ? (dir > 0 ? tilt : Math.PI - tilt) : head.a;  // tilt < 0 ergue
  const spine = body.map((q, i) => {
    const A = body[i - 1] || q, B = body[i + 1] || q, d = Math.hypot(A.x - B.x, A.y - B.y);
    return { x: q.x, y: q.y, angle: d > 1e-6 ? Math.atan2(A.y - B.y, A.x - B.x) : sv ? (dir > 0 ? 0 : Math.PI) : q.a, r: spec.spine[i].r * size };
  });

  // Membros: pé, braço com balanço oposto à perna `swing`, dobra na morte, gesto por cima; IK de dois ossos.
  const roots = {}, limbs = {};
  for (const lb of spec.limbs) roots[lb.name] = rootOf(lb, body[lb.attach]);
  for (const lb of spec.limbs) {
    const root = roots[lb.name], a = body[lb.attach].a, Lb = lb.l1 + lb.l2, st = steps[lb.name];
    let target;
    if (lb.foot) target = flying ? local(root, a, -.25 * Lb, .25 * Lb) : st.pos;
    else {
      let [dx, dy] = lb.rest;
      if (lb.swing && steps[lb.swing]) {
        const leg = steps[lb.swing].pos, r = roots[lb.swing], phi = -1.2 * Math.atan2((leg[0] - r[0]) * dir, leg[1] - r[1]) * moving * ageK;
        [dx, dy] = [dx * Math.cos(phi) + dy * Math.sin(phi), dy * Math.cos(phi) - dx * Math.sin(phi)];
      }
      target = sv ? local(root, 0, dx, dy) : local(root, a, dx, -lb.side * dy);
    }
    const fold = sv ? local(root, 0, -.15 * Lb, .3 * Lb) : local(root, a, 0, -lb.side * .25 * Lb), g = o.gesture;
    target = [lerp(target[0], fold[0], dead), lerp(target[1], fold[1], dead)];
    if (g && g.limb === lb.name) target = [lerp(target[0], g.target[0], g.k), lerp(target[1], g.target[1], g.k)];
    const k = ik2(root, target, lb.l1 * size, lb.l2 * size, sv ? lb.bend * dir : lb.bend * lb.side);
    limbs[lb.name] = { root, mid: k.mid, end: k.end, stance: !!(st && st.stance) && !dead, far: sv && lb.side * dir < 0, foot: !!lb.foot };
  }

  // Apêndices em quadro local (voltado para a direita na lateral, girado pelo rumo na superior); `motion` é um objeto
  // de opções de chain ou uma função (t, seed, o, k) => ângulos relativos. k = amplitude (zera na morte, cai com a idade).
  const appendages = {};
  spec.appendages.forEach((ap, i) => {
    const anc = ap.attach === 'head' ? { x: head.x, y: head.y, angle: headAngle } : spine[ap.attach], side = ap.side || 0;
    const base = sv ? local([anc.x, anc.y], 0, ap.at[0], ap.at[1]) : local([anc.x, anc.y], anc.angle, ap.at[0], 0);
    let a0 = sv ? (dir > 0 ? anc.angle : Math.PI - anc.angle) + ap.angle : Math.cos(ap.angle) < 0 ? Math.PI + side * .5 : -side * .5;
    if (sv) a0 += .5 * flinch * Math.atan2(Math.sin(-Math.PI / 2 - a0), Math.cos(-Math.PI / 2 - a0));  // susto ergue
    const m = ap.motion, k = life * ageK, sd = seed * 13 + i + 1, len = ap.lengths.map(l => l * size);
    let pts;
    if (typeof m === 'function') {
      const flip = !sv && side === 1 ? -1 : 1; let a = a0, x = 0, y = 0; pts = [[0, 0]];
      m(t, sd, o, k).forEach((da, j) => { a += da * flip; x += len[j] * Math.cos(a); y += len[j] * Math.sin(a); pts.push([x, y]); });
    } else pts = chain([0, 0], a0, len, t, sd, { ...m, amp: (m.amp ?? .35) * k, gravity: sv ? (m.gravity || 0) * (1 - .6 * flinch) : 0 });
    const c = Math.cos(anc.angle), si = Math.sin(anc.angle);
    appendages[ap.name] = pts.map(([x, y]) => sv ? [base[0] + dir * x, base[1] + y] : [base[0] + c * x - si * y, base[1] + si * x + c * y]);
  });

  let carry = null;
  if (o.carry) {
    if (!spec.carry) throw new Error(`O ser ${spec.id} não sabe carregar`);
    const anc = spec.carry.attach === 'head' ? head : body[spec.carry.attach], [x, y] = local([anc.x, anc.y], anc.a, spec.carry.at[0], sv ? spec.carry.at[1] : 0);
    carry = { x, y, angle: sv ? 0 : anc.a, w: o.carry.w * size, h: o.carry.h * size };
  }
  return {
    spec: spec.id, size, view, facing: dir, spine, limbs, appendages, head: { x: head.x, y: head.y, angle: headAngle },
    face: { expression: o.expression || 'neutral' }, ...(spec.flyer && { wings: { phase: flying ? frac(t * spec.flyer.freq) : 0, open: flying ? 1 : 0 } }), carry,
  };
}
