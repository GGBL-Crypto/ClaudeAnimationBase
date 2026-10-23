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

// Vida orgânica (valores padrão; spec.organic sobrepõe), em BL ou radianos: vary = variação de cada passada;
// bob = descida do corpo em cada contato (2 por ciclo); lean = inclinação do tronco em marcha (cresce com a altura do
// segmento); twist = contra-rotação ombros × quadris; nod/flex = aceno da cabeça e flexão da coluna no ritmo das patas;
// breath = subida do peito (período 3–4 s, sempre ativo); idle = micro-ajustes da cabeça; stab = fração do balanço
// que a cabeça compensa; follow = rad por BL/s² de o.drag nos apêndices (atraso e overshoot ao frear).
var ORGANIC = { vary: .05, bob: .012, lean: .08, twist: .015, nod: 0, flex: 0, breath: .006, idle: .03, stab: .5, follow: .3 };

// Piscar periódico por semente: uma piscada de .14 s em ponto sorteado de cada janela de `period` s. 1 = fechado.
function blink(t, seed = 0, period = 3.6) {
  const i = Math.floor(t / period), t0 = (i + .1 + .7 * hash(seed * 31 + i + .5)) * period;
  return clamp(1 - Math.abs(t - t0 - .07) / .07);
}

// Troca de expressão com take, em vez de trocar de uma vez. keys = [[t, expressão, emote?], ...]; emote: '!', '?',
// 'sweat', 'note', 'zzz'. Na troca os olhos fecham (a expressão muda com eles fechados) e o corpo achata (sq > 0)
// e solta numa mola (SPRING.bouncy: passa a esticar, sq < 0, e assenta). O emote entra numa mola (k passa de 1 e
// assenta) e some depois de 1,6 s.
// Devolve {expression, take, sq, blink, emote: null | {sym, k, a}}; take = 0..1 do achatamento.
function mood(t, keys, seed = 0) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [t0, expression, sym] = keys[i], next = keys[i + 1], key = next && next[0] - t < .12 ? next[0] : i ? t0 : null;
  let take = 0, eyes = 0;
  if (key !== null) {
    const d = t - key;
    take = d < 0 ? ease(seg(d, -.12, 0)) : 1 - springStep(d, SPRING.bouncy);
    eyes = 1 - seg(Math.abs(d), .05, .12);
  }
  const age = t - t0, emote = sym && age >= 0 && age < 1.6 ? { sym, k: springStep(age - .05, SPRING.bouncy), a: 1 - seg(age, 1.3, 1.6) } : null;
  return { expression, take: Math.max(0, take), sq: .12 * take, blink: Math.max(eyes, blink(t, seed)), emote };
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
  // Vida orgânica: fase da marcha gp (ciclos, com a variação por passada), beat = 1 em cada contato (2 por ciclo).
  const org = { ...ORGANIC, ...spec.organic }, walk = sv && !air, m = moving * ageK * life;
  const foot0 = spec.limbs.find(lb => lb.foot), gp = gait && foot0 ? gaitPhase(s, spec.stride, org.vary, seed + 501) + gait.offsets[foot0.key || foot0.name] : 0;
  const beat = (1 + Math.cos(2 * TAU * gp)) / 2, low = Math.min(...spec.spine.map(g => g.h || 0));
  const lean = walk ? org.lean * (moving + (o.lean || 0)) * life : 0, twist = walk && gait ? org.twist * size * m * Math.cos(TAU * gp) : 0;
  const breath = sv ? org.breath * size * life * Math.sin(TAU * t / (3 + hash(seed * 3.7 + 1))) : 0;
  // path.at limita d a [0, length]; aqui o caminho continua reto pela tangente das pontas, senão o corpo se amassa nelas.
  const at = d => { const c = clamp(d, 0, path.length), p = path.at(c), e = d - c; return e ? { x: p.x + e * Math.cos(p.angle), y: p.y + e * Math.sin(p.angle), angle: p.angle } : p; };
  const dir = sv ? o.facing || (Math.cos(at(sB * size).angle) < 0 ? -1 : 1) : 1;
  const groundAt = p => sv && !air ? (o.ground ? o.ground(p.x) : p.y) : p.y;
  // Desloca p em BL: dx à frente; dy para baixo na vista lateral, para a direita do ser na vista superior.
  const local = (p, a, dx, dy) => sv ? [p[0] + dir * dx * size, p[1] + dy * size]
    : [p[0] + (Math.cos(a) * dx - Math.sin(a) * dy) * size, p[1] + (Math.sin(a) * dx + Math.cos(a) * dy) * size];
  // O tronco inclina à frente (mais quanto mais alto o segmento); os ombros (attach 0) giram contra os quadris.
  const place = (back, h) => { const p = at((sB - back) * size), gy = groundAt(p); return { x: p.x + (lean ? dir * lean * size * (h - low + .1) : 0), y: sv && !air ? gy - h * size : p.y, a: p.angle, gy }; };
  const rootOf = (lb, g) => sv ? local([g.x + dir * lb.side * (lb.attach ? 1 : -1) * twist, g.y], 0, lb.along, -(lb.h || 0)) : local([g.x, g.y], g.a, lb.along, -lb.side * spec.spine[lb.attach].r * .5);

  // Coluna; nadadores ondulam numa onda viajante que cresce da cabeça para a cauda. A onda é lateral: inteira na vista
  // superior, quase nada na lateral (sw.side), onde quem bate é a nadadeira caudal.
  const n = spec.spine.length, sw = spec.swimmer;
  const segs = spec.spine.map((g, i) => {
    const q = place(g.offset, g.h || 0);
    if (sw) {
      const u = n > 1 ? i / (n - 1) : 0, w = sw.amp * (sv ? sw.side : 1) * size * (.2 + .8 * u) * (.4 + .6 * moving) * ageK * life * Math.sin(TAU * (t * sw.freq - u * sw.wave));
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
    const f = footAt(s, ph, { stride: spec.stride, duty: gait.duty, lift: spec.lift * size * ageK, moving, plant, vary: org.vary, seed: seed + 501 });
    if (sv && !f.stance) f.pos = [f.pos[0], groundAt({ x: f.pos[0], y: f.pos[1] }) - f.lift];
    steps[lb.name] = f;
  }
  // Saltadores sobem junto com os pés; depois o corpo baixa até cada pé (contínuo: pés no ar pedem menos).
  let shift = 0, drop = 0;
  if (sv && !air && legs.length) {
    const hop = spec.hop ? Math.max(...legs.map(lb => steps[lb.name].lift)) : 0;
    for (const lb of legs) {
      const r = rootOf(lb, segs[lb.attach]), f = steps[lb.name].pos, R = .97 * (lb.l1 + lb.l2) * size, dx = f[0] - r[0];
      if (Math.abs(dx) < R) drop = Math.max(drop, f[1] - (r[1] - hop) - Math.sqrt(R * R - dx * dx));
    }
    shift = drop - hop;
  }
  // Peso: o corpo desce mais em cada contato (bob), a coluna flexiona, o peito respira; a cabeça compensa parte do
  // balanço (stab), acena no ritmo das patas (nod) e faz micro-ajustes que param entre um e outro (idle).
  const bob = walk && legs.length ? org.bob * size * m * beat : 0, wave = org.flex * size * m * Math.sin(2 * TAU * gp);
  // Morte: o corpo deita no chão (segmentos altos caem para trás, como um humano de costas).
  const settle = (q, h, r, dy) => ({ ...q, x: sv ? q.x - dir * (h - low) * size * dead : q.x, y: sv ? lerp(q.y + dy, q.gy - r * size, dead) : q.y });
  const body = segs.map((q, i) => settle(q, spec.spine[i].h || 0, spec.spine[i].r, shift + bob + (i && i < n - 1 ? wave : 0) - (i ? 0 : breath)));
  const head = settle(place(spec.head.offset, spec.head.h || 0), spec.head.h || 0, spec.head.r, shift + bob - org.stab * (drop + bob) + org.nod * size * m * beat - .6 * breath);
  head.y -= .05 * size * flinch * life;
  const micro = org.idle * life * noise1(seed * 7 + 3, Math.floor(t * .8) + ease(frac(t * .8) * 4));
  const tilt = -.35 * flinch + .7 * dead + micro, headAngle = sv ? (dir > 0 ? tilt : Math.PI - tilt) : head.a + micro;  // tilt < 0 ergue
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
    if (sv) a0 -= org.follow * (o.drag || 0) * life * Math.sin(a0);  // inércia: ao frear, a ponta segue para a frente
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
    face: { expression: o.expression || 'neutral', blink: o.blink ?? blink(t, seed) }, sq: o.sq || 0, emote: o.emote || null, ...(spec.flyer && { wings: { phase: flying ? frac(t * spec.flyer.freq) : 0, open: flying ? 1 : 0 } }), carry,
  };
}
