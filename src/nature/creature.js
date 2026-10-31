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
// que a cabeça compensa; follow = rad por unidade de o.drag nos apêndices (atraso e overshoot ao frear); rec = atraso do
// ponto mais baixo depois do contato (recuo, em ciclos); lag = atraso da cabeça em relação à pelve (ciclos); arc =
// vaivém da cabeça à frente e atrás (BL), que com o balanço vertical faz um arco.
var ORGANIC = { vary: .05, bob: .024, lean: .16, twist: .015, nod: 0, flex: 0, breath: .006, idle: .03, stab: .5, follow: .5, rec: .075, lag: .07, arc: .012 };

// Esqueleto de ossos fixos (rad): neck = desvio máximo do pescoço em relação ao repouso girado com o tronco (no humano o
// repouso é o eixo pelvis → chest: é o ângulo entre os dois ossos); head = ângulo entre o osso do pescoço e o da cabeça (no
// repouso a cabeça continua o pescoço); knee/elbow = [mín, máx] da dobra (0 = reto), sempre para o lado de bend do membro,
// nos membros com pé ou mão (l3: humano, cão, ave); pata de inseto dobra inteira (túneis íngremes pedem).
// Molas, aceno, balanço e susto só giram pescoço e cabeça nas juntas; nenhum osso estica (pose.angles = desvios usados).
// spec.limits sobrepõe por espécie (ex.: cão que bebe água: pescoço mais solto); limitsOf(spec) = os limites valendo.
var JOINT_LIMITS = { neck: .6, head: .5, knee: [0, 2.6], elbow: [0, 2.6] };
const limitsOf = spec => spec && spec.limits ? { ...JOINT_LIMITS, ...spec.limits } : JOINT_LIMITS;
// IK de dois ossos com dobra limitada: alvo perto demais da raiz vai para a distância da dobra máxima (ik2 limita o alcance).
function limb2(root, target, l1, l2, bend, max) {
  const dx = target[0] - root[0], dy = target[1] - root[1], d = Math.hypot(dx, dy), m = Math.sqrt(Math.max(0, l1 * l1 + l2 * l2 + 2 * l1 * l2 * Math.cos(max)));
  return ik2(root, d >= m ? target : d > 1e-9 ? [root[0] + dx / d * m, root[1] + dy / d * m] : [root[0], root[1] + m], l1, l2, bend);
}
// Nomes de juntas e ossos do humano (os genéricos à esquerda; ver creaturePose).
var HUMAN_NAMES = { spine0: 'chest', spine1: 'pelvis', 'spine0-1': 'spine', ...Object.fromEntries(['L', 'R'].flatMap(s => [
  ['arm' + s, ['shoulder', 'elbow', 'wrist', 'hand'], ['upperArm', 'forearm', 'hand']], ['leg' + s, ['hip', 'knee', 'ankle', 'toe'], ['thigh', 'shin', 'foot']],
].flatMap(([l, j, b]) => [...['root', 'mid', 'end', 'toe'].map((k, i) => [`${l}.${k}`, j[i] + s]), ...['upper', 'lower', 'tip'].map((k, i) => [`${l}.${k}`, b[i] + s])]))) };

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
// Esqueleto: pose.joints (nome → [x, y] px) e pose.bones ([{name, a, b, len}], |joints[b] − joints[a]| = len sempre).
// Juntas: spine0..n (spine0 = frente), neck (base do pescoço), headBase, head (centro), headTop e, por membro,
// `${nome}.root|mid|end|toe` (toe = ponta do pé ou da mão, se o membro tem l3). Ossos: spine{i}-{i+1} (spine{i+1} → spine{i}),
// upperSpine (spine0 → neck, se neck.at ≠ 0), neck, head (headBase → headTop = 2r), `${nome}.upper|lower|tip`.
// O humano troca os nomes por HUMAN_NAMES (pelvis, chest, shoulderL, wristL, handL, ankleL, toeL, thighL, footL, ...).
function creaturePose(spec, o) {
  if (!spec || !o || !o.path) throw new Error('creaturePose precisa de uma especificação e de o.path');
  const { path, s, size, view = 'side', t = 0, seed = 0, moving = 1, age = 0, flinch = 0 } = o;
  if (!spec.views.includes(view)) throw new Error(`O ser ${spec.id} não tem a vista ${view}`);
  const gaitName = o.gait || spec.gait, flying = gaitName === 'fly';
  if (flying && !spec.flyer) throw new Error(`O ser ${spec.id} não voa`);
  const gait = flying ? null : typeof gaitName === 'string' ? GAITS[gaitName] : gaitName;
  if (typeof gaitName === 'string' && !flying && !gait) throw new Error(`Marcha desconhecida: ${gaitName}`);
  const sv = view === 'side', air = flying || !!spec.swimmer, life = clamp(o.alive ?? 1), dead = 1 - life, ageK = 1 - .5 * clamp(age);
  // o.loop (s): o tempo do ruído (micro-ajuste da cabeça, apêndices, pairar) passa a fechar em t = loop: P(f) mistura f(t) com f(t − loop) por t / loop.
  const lp = o.loop, tl = lp ? (t % lp + lp) % lp : t, mix = (a, b, w) => Array.isArray(a) ? a.map((v, i) => mix(v, b[i], w)) : lerp(a, b, w), P = f => lp ? mix(f(tl), f(tl - lp), tl / lp) : f(t);
  const sB = s - .1 * flinch;  // o susto recua o corpo; os pés plantados ficam onde estão
  // Vida orgânica: fase da marcha gp (ciclos, com a variação por passada), beat = 1 em cada contato (2 por ciclo).
  const org = { ...ORGANIC, ...spec.organic }, walk = sv && !air, m = moving * ageK * life;
  const foot0 = spec.limbs.find(lb => lb.foot), gp = gait && foot0 ? gaitPhase(s, spec.stride, org.vary, seed + 501) + gait.offsets[foot0.key || foot0.name] : 0;
  // Poses-chave da passada (2 por ciclo): contato, recuo (o mais baixo, rec depois), passagem e alto; a cabeça segue lag depois.
  const step = d => (1 + Math.cos(2 * TAU * (gp - d))) / 2, beat = step(org.rec), beatH = step(org.rec + org.lag), low = Math.min(...spec.spine.map(g => g.h || 0));
  const lean = walk ? org.lean * (moving + (o.lean || 0)) * life : 0, twist = walk && gait ? org.twist * size * m * Math.cos(TAU * gp) : 0;
  const breath = sv ? org.breath * size * life * Math.sin(TAU * t / (3 + hash(seed * 3.7 + 1))) : 0;
  // path.at limita d a [0, length]; aqui o caminho continua reto pela tangente das pontas, senão o corpo se amassa nelas.
  const at = d => { const c = clamp(d, 0, path.length), p = path.at(c), e = d - c; return e ? { x: p.x + e * Math.cos(p.angle), y: p.y + e * Math.sin(p.angle), angle: p.angle } : p; };
  const dir = sv ? o.facing || (Math.cos(at(sB * size).angle) < 0 ? -1 : 1) : 1;
  const groundAt = p => sv && !air ? (o.ground ? o.ground(p.x) : p.y) : p.y;
  // Desloca p em BL: dx à frente; dy para baixo na vista lateral, para a direita do ser na vista superior.
  const local = (p, a, dx, dy) => sv ? [p[0] + dir * dx * size, p[1] + dy * size]
    : [p[0] + (Math.cos(a) * dx - Math.sin(a) * dy) * size, p[1] + (Math.sin(a) * dx + Math.cos(a) * dy) * size];
  // Pairar: no voo, o corpo inteiro deriva até flyer.hover BL em torno do caminho, por ruído (parado no ar, não fica fixo).
  const hv = flying && spec.flyer.hover ? P(t => [noise1(seed + 71, t * .9), noise1(seed + 72, t * 1.3)]).map(v => v * spec.flyer.hover * size) : [0, 0];
  // O tronco inclina à frente (mais quanto mais alto o segmento); os ombros (attach 0) giram contra os quadris.
  const place = (back, h) => { const p = at((sB - back) * size), gy = groundAt(p); return { x: p.x + hv[0] + (lean ? dir * lean * size * (h - low + .1) : 0), y: (sv && !air ? gy - h * size : p.y) + hv[1], a: p.angle, gy }; };
  // Raiz do membro; na lateral o deslocamento (along, h) gira com o segmento (r: rotação do segmento desde o repouso).
  const turn = (v, r) => r ? [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)] : v;
  const rootOf = (lb, g, r = 0) => { if (!sv) return local([g.x, g.y], g.a, lb.along, -lb.side * spec.spine[lb.attach].r * .5); const v = turn([dir * lb.along * size, -(lb.h || 0) * size], r); return [g.x + dir * lb.side * (lb.attach ? 1 : -1) * twist + v[0], g.y + v[1]]; };

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
      const r = rootOf(lb, segs[lb.attach]), q = steps[lb.name].pos, f = [q[0], q[1] - (lb.h3 || 0) * size], R = .97 * (lb.l1 + lb.l2) * size, dx = f[0] - r[0];
      if (Math.abs(dx) < R) drop = Math.max(drop, f[1] - (r[1] - hop) - Math.sqrt(R * R - dx * dx));
    }
    shift = drop - hop;
  }
  // Peso: o corpo desce mais em cada contato (bob), a coluna flexiona, o peito respira; a cabeça compensa parte do
  // balanço (stab), acena no ritmo das patas (nod) e faz micro-ajustes que param entre um e outro (idle).
  const bob = walk && legs.length ? org.bob * size * m * beat : 0, bobH = walk && legs.length ? org.bob * size * m * beatH : 0, wave = org.flex * size * m * Math.sin(2 * TAU * gp);
  // Morte: o corpo deita no chão (segmentos altos caem para trás, como um humano de costas).
  const settle = (q, h, r, dy) => ({ ...q, x: sv ? q.x - dir * (h - low) * size * dead : q.x, y: sv ? lerp(q.y + dy, q.gy - r * size, dead) : q.y });
  const body = segs.map((q, i) => settle(q, spec.spine[i].h || 0, spec.spine[i].r, shift + bob + (i && i < n - 1 ? wave : 0) - (i ? 0 : breath)));
  // Coluna de ossos fixos: do segmento das patas (hub) para as pontas, cada segmento fica à distância de repouso do
  // vizinho, na direção pedida (inclinação, respiração e flexão viram rotação, nunca esticão). rot = rotação do segmento.
  const G = spec.spine, hub = foot0 ? foot0.attach : 0, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const restV = (i, j) => sv ? [dir * (G[j].offset - G[i].offset) * size, ((G[j].h || 0) - (G[i].h || 0)) * size] : [(G[j].offset - G[i].offset) * size, 0];  // de j até i
  const fix = (i, j) => { const q = body[i], p = body[j], L = Math.hypot(...restV(i, j)), d = Math.hypot(q.x - p.x, q.y - p.y); if (d > 1e-9) { q.x = p.x + (q.x - p.x) * L / d; q.y = p.y + (q.y - p.y) * L / d; } };
  for (let i = hub + 1; i < n; i++) fix(i, i - 1);
  for (let i = hub - 1; i >= 0; i--) fix(i, i + 1);
  const rot = body.map((q, i) => {
    const j = i === hub ? (i ? i - 1 : i + 1) : i > hub ? i - 1 : i + 1, p = body[j], v = p && restV(i, j);
    return sv && p && Math.hypot(...v) > 1e-9 ? wrapA(Math.atan2(q.y - p.y, q.x - p.x) - Math.atan2(v[1], v[0])) : 0;
  });
  const spine = body.map((q, i) => {
    const A = body[i - 1] || q, B = body[i + 1] || q, d = Math.hypot(A.x - B.x, A.y - B.y);
    return { x: q.x, y: q.y, angle: d > 1e-6 ? Math.atan2(A.y - B.y, A.x - B.x) : sv ? (dir > 0 ? 0 : Math.PI) : q.a, r: spec.spine[i].r * size };
  });
  // Pescoço e cabeça de ossos fixos. Base pedida da cabeça = a de repouso girada com o tronco (inclinação e morte vêm
  // daí) mais o movimento da cabeça em relação ao peito (balanço com atraso, estabilização, aceno, arco, respiração, susto); eixo
  // pedido = repouso + tilt. O pescoço gira na base até apontar para o pedido (até JOINT_LIMITS.neck do repouso girado
  // com o tronco) e a cabeça gira na base do crânio (até JOINT_LIMITS.head). Repouso: base em spec.neck.at (BL, a partir
  // do spine0, na lateral) e a cabeça da especificação; head.axis = eixo base → topo voltado para a direita (padrão: a
  // direção base do pescoço → centro, a cabeça continua o pescoço; humano −PI/2: para cima). Centro = headBase + r · eixo;
  // headTop = headBase + 2r · eixo. pose.head.angle segue sendo para onde a cara olha (0 = à frente na lateral).
  const hd = spec.head, hq = place(hd.offset, hd.h || 0);
  const micro = org.idle * life * P(t => noise1(seed * 7 + 3, Math.floor(t * .8) + ease(frac(t * .8) * 4))), tilt = -.35 * flinch + .7 * dead + micro;  // tilt < 0 ergue
  const s0 = spine[0], F = sv ? 0 : s0.angle, fw = (dx, dy) => sv ? [dir * dx * size, dy * size] : turn([dx * size, 0], F), R = hd.r * size;
  const na = spec.neck?.at || [0, 0], nOff = fw(na[0], na[1]), hc = fw(G[0].offset - hd.offset, (G[0].h || 0) - (hd.h || 0));
  const axW = sv && hd.axis !== undefined ? (dir > 0 ? hd.axis : Math.PI - hd.axis) : Math.atan2(hc[1] - nOff[1], hc[0] - nOff[0]), ax = sv ? (dir > 0 ? axW : Math.PI - axW) : 0;
  const nv = [hc[0] - R * Math.cos(axW) - nOff[0], hc[1] - R * Math.sin(axW) - nOff[1]], nL = Math.hypot(...nv), nRest = Math.atan2(nv[1], nv[0]), nRef = nRest + rot[0];
  const no = turn(nOff, rot[0]), nb = [s0.x + no[0], s0.y + no[1]], axD = sv ? (dir > 0 ? ax + tilt : Math.PI - ax - tilt) : hq.a + micro;
  const rv = turn(nv, rot[0]), arc = walk && legs.length ? dir * org.arc * size * m * Math.sin(2 * TAU * (gp - org.rec - org.lag)) : 0;
  const dyH = sv ? life * (bobH - bob - org.stab * (drop + bobH) + org.nod * size * m * beatH + .4 * breath - .05 * size * flinch) : 0, wb = [nb[0] + rv[0] + arc, nb[1] + rv[1] + dyH], L = limitsOf(spec);
  const dN = nL > 1e-9 ? clamp(wrapA(Math.atan2(wb[1] - nb[1], wb[0] - nb[0]) - nRef), -L.neck, L.neck) : 0, aN = nRef + dN, hb = [nb[0] + nL * Math.cos(aN), nb[1] + nL * Math.sin(aN)];
  const dH = clamp(wrapA(axD - aN - (axW - nRest)), -L.head, L.head), aH = aN + axW - nRest + dH;
  const head = { x: hb[0] + R * Math.cos(aH), y: hb[1] + R * Math.sin(aH), a: hq.a }, headTop = [hb[0] + 2 * R * Math.cos(aH), hb[1] + 2 * R * Math.sin(aH)], headAngle = sv ? aH - dir * ax : aH;

  // Membros: pé, braço com balanço oposto à perna `swing`, dobra na morte, gesto por cima; IK de dois ossos com dobra
  // limitada. Pé (l3, h3): o tornozelo fica h3 acima do ponto plantado e o pé vai dele ao dedo, que no apoio toca o chão.
  // Mão (l3): continua o antebraço a partir do pulso (gesto com tipDir [x, y] unitário: o pulso dobra para essa direção).
  const roots = {}, limbs = {};
  // A coluna rígida absorve a respiração do peito ereto; ela aparece nos ombros, que sobem (não são osso do esqueleto).
  for (const lb of spec.limbs) { const r = rootOf(lb, body[lb.attach], rot[lb.attach]); roots[lb.name] = sv && !lb.foot ? [r[0], r[1] - breath] : r; }
  const tipOf = (lb, k, stance, st, g) => {
    const L3 = lb.l3 * size, e = k.end;
    if (!lb.foot) {  // a mão continua o antebraço; gesto com tipDir dobra o pulso até essa direção (misturada por k)
      let dx = e[0] - k.mid[0], dy = e[1] - k.mid[1], d = Math.hypot(dx, dy) || 1;
      if (g && g.tipDir) { dx = lerp(dx / d, g.tipDir[0], g.k); dy = lerp(dy / d, g.tipDir[1], g.k); d = Math.hypot(dx, dy) || 1; }
      return [e[0] + dx / d * L3, e[1] + dy / d * L3];
    }
    if (!sv) return local(e, body[lb.attach].a, lb.l3, 0);
    const run = v => dir * Math.sqrt(L3 * L3 - v * v);
    let v = Math.min(L3, (lb.h3 || 0) * size);
    if (stance && !air) for (let i = 0; i < (o.ground ? 4 : 1); i++) v = clamp((o.ground ? o.ground(e[0] + run(v)) : st.pos[1]) - e[1], -L3, L3);  // no declive, o dedo acha o chão em poucas voltas
    return [e[0] + run(v), e[1] + v];
  };
  for (const lb of spec.limbs) {
    const root = roots[lb.name], a = body[lb.attach].a, Lb = lb.l1 + lb.l2, st = steps[lb.name];
    let target;
    if (lb.foot) target = flying ? local(root, a, -.25 * Lb, .25 * Lb) : sv ? [st.pos[0], st.pos[1] - (lb.h3 || 0) * size] : st.pos;
    else {
      let [dx, dy] = lb.rest;
      if (lb.swing && steps[lb.swing]) {
        const leg = steps[lb.swing].pos, r = roots[lb.swing], phi = -1.2 * Math.atan2((leg[0] - r[0]) * dir, leg[1] - r[1]) * moving * ageK;
        const reach = 1 - .25 * Math.max(0, Math.sin(phi));  // à frente o cotovelo dobra e a mão sobe: arco, não pêndulo reto
        [dx, dy] = [reach * (dx * Math.cos(phi) + dy * Math.sin(phi)), reach * (dy * Math.cos(phi) - dx * Math.sin(phi))];
      }
      target = sv ? local(root, 0, dx, dy) : local(root, a, dx, -lb.side * dy);
    }
    const fold = sv ? local(root, 0, -.15 * Lb, .3 * Lb) : local(root, a, 0, -lb.side * .25 * Lb), g = [].concat(o.gesture || []).find(x => x.limb === lb.name);  // um gesto ou uma lista
    target = [lerp(target[0], fold[0], dead), lerp(target[1], fold[1], dead)];
    if (g) target = [lerp(target[0], g.target[0], g.k), lerp(target[1], g.target[1], g.k)];
    const k = limb2(root, target, lb.l1 * size, lb.l2 * size, sv ? lb.bend * dir : lb.bend * lb.side, lb.l3 ? (lb.foot ? L.knee : L.elbow)[1] : Math.PI), stance = !!(st && st.stance) && !dead && !(g && g.k > 0 && g.k < 1);  // pé num gesto (passo) está no ar
    limbs[lb.name] = { root, mid: k.mid, end: k.end, stance, far: sv && lb.side * dir < 0, foot: !!lb.foot };
    if (lb.l3) limbs[lb.name].toe = tipOf(lb, k, stance, st, g);
    if (!lb.foot) limbs[lb.name].hand = (g && g.k > .5 && g.hand) || o.hands?.[lb.name] || 'open';  // open | point | fist
  }

  // Juntas e ossos (nomes no comentário de creaturePose).
  const joints = { neck: nb, headBase: hb, head: [head.x, head.y], headTop }, bones = [], bone = (name, a, b, len) => bones.push({ name, a, b, len });
  spine.forEach((q, i) => { joints['spine' + i] = [q.x, q.y]; if (i) bone(`spine${i - 1}-${i}`, 'spine' + i, 'spine' + (i - 1), Math.hypot(...restV(i - 1, i))); });
  if (Math.hypot(...nOff) > 1e-9) bone('upperSpine', 'spine0', 'neck', Math.hypot(...nOff));
  bone('neck', 'neck', 'headBase', nL); bone('head', 'headBase', 'headTop', 2 * R);
  for (const lb of spec.limbs) {
    const l = limbs[lb.name], j = k => `${lb.name}.${k}`;
    Object.assign(joints, { [j('root')]: l.root, [j('mid')]: l.mid, [j('end')]: l.end }); bone(j('upper'), j('root'), j('mid'), lb.l1 * size); bone(j('lower'), j('mid'), j('end'), lb.l2 * size);
    if (l.toe) { joints[j('toe')] = l.toe; bone(j('tip'), j('end'), j('toe'), lb.l3 * size); }
  }
  const named = spec.id === 'human' ? k => HUMAN_NAMES[k] || k : k => k;
  const skeleton = { joints: Object.fromEntries(Object.entries(joints).map(([k, v]) => [named(k), v])), bones: bones.map(b => ({ ...b, name: named(b.name), a: named(b.a), b: named(b.b) })), angles: { neck: sv ? dir * dN : dN, head: sv ? dir * dH : dH } };

  // Apêndices em quadro local (voltado para a direita na lateral, girado pelo rumo na superior); `motion` é um objeto
  // de opções de chain ou uma função (t, seed, o, k) => ângulos relativos. k = amplitude (zera na morte, cai com a idade).
  const appendages = {};
  spec.appendages.forEach((ap, i) => {
    const anc = ap.attach === 'head' ? { x: head.x, y: head.y, angle: headAngle } : spine[ap.attach], side = ap.side || 0;
    const base = sv ? local([anc.x, anc.y], 0, ap.at[0], ap.at[1]) : local([anc.x, anc.y], anc.angle, ap.at[0], 0);
    let a0 = sv ? (dir > 0 ? anc.angle : Math.PI - anc.angle) + ap.angle : Math.cos(ap.angle) < 0 ? Math.PI + side * .5 : -side * .5;
    if (sv) a0 -= org.follow * (o.drag || 0) * life * Math.sin(a0);  // inércia: ao frear, a ponta segue para a frente
    if (sv) a0 += (.5 * flinch - 2 * (o.sq || 0)) * Math.atan2(Math.sin(-Math.PI / 2 - a0), Math.cos(-Math.PI / 2 - a0));  // susto e esticão erguem, achatar baixa
    const m = ap.motion, k = life * ageK, sd = seed * 13 + i + 1, len = ap.lengths.map(l => l * size);
    let pts;
    if (typeof m === 'function') {
      const flip = !sv && side === 1 ? -1 : 1;
      pts = P(t => { let a = a0, x = 0, y = 0; const q = [[0, 0]]; m(t, sd, o, k).forEach((da, j) => { a += da * flip; x += len[j] * Math.cos(a); y += len[j] * Math.sin(a); q.push([x, y]); }); return q; });
    } else pts = P(t => chain([0, 0], a0, len, t, sd, { ...m, amp: (m.amp ?? .35) * k, gravity: sv ? (m.gravity || 0) * (1 - .6 * flinch) : 0 }));
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
    spec: spec.id, ...(spec.body && { body: spec.body }), ...(spec.limits && { limits: spec.limits }), size, view, facing: dir, spine, limbs, appendages, head: { x: head.x, y: head.y, angle: headAngle }, ...skeleton,
    face: { expression: o.expression || 'neutral', blink: o.blink ?? blink(t, seed), mouth: o.mouth || null }, sq: o.sq || 0, lag: sv ? org.follow * (o.drag || 0) * life : 0, emote: o.emote || null, ...(spec.flyer && { wings: { phase: flying ? frac(t * spec.flyer.freq) : 0, open: flying ? 1 : 0 } }), carry,
  };
}

// Smear de ação rápida (TV dos anos 2000): se a cabeça ou a ponta de um membro andou mais de min BL desde t − dt,
// p.smear = as poses em t − dt / 2 e t − dt, desenhadas por baixo como membros repetidos. poseAt(t) → pose.
function smear(poseAt, t, dt = 1 / 12, min = .25) {
  const p = poseAt(t), q = poseAt(t - dt), pts = x => [[x.head.x, x.head.y], ...Object.values(x.limbs).map(l => l.end)], b = pts(q);
  if (Math.max(...pts(p).map((v, i) => Math.hypot(v[0] - b[i][0], v[1] - b[i][1]))) > min * p.size) p.smear = [poseAt(t - dt / 2), q];
  return p;
}
// Fala entre t0 e t1: uma forma de boca por sílaba (~6 por segundo, por semente), fechando ('m') de vez em quando;
// null fora da fala (a boca da expressão). Formas: m fechada, e pequena, a aberta, o redonda.
function talk(t, seed, t0, t1) {
  if (t < t0 || t >= t1) return null;
  const i = Math.floor((t - t0) * 6);
  return ['m', 'e', 'a', 'o', 'a', 'e'][Math.floor(hash(seed * 7.3 + i) * 6)];
}
