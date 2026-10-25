// Esqueleto humano por tipo de corpo: proporções em BL (fração da altura daquela pessoa) e humanSpec(tipo), a
// especificação de creaturePose montada sobre SPECS.human. Os ossos têm comprimento fixo e JOINT_LIMITS (creature.js)
// limita pescoço, cabeça, joelho e cotovelo; turnHead gira pescoço e cabeça de uma pose pronta (aceno), sem esticar nada.
// BODY[tipo]: r (raio da cabeça; cabeça = 2r, de desenho animado: ~6 cabeças de altura, rosto legível), neck, collar (peito → base do pescoço), spine (pelve → peito: o que falta
// para 1 BL), thigh, shin, foot (tornozelo → dedo), footH (altura do tornozelo), upperArm, forearm, hand, girth (meia
// largura do tronco, dica para o desenho: peito r = girth, pelve r = .9 girth), stoop (rad: tronco, pescoço e cabeça
// inclinados à frente no repouso, numa linha só). De pé: footH + .97 (thigh + shin) (joelho mole, como a marcha deixa) +
// spine + collar + neck + 2r = 1 (o idoso curvado fica um pouco abaixo).
var BODY = (() => {
  const B = {
    adult: { r: .085, neck: .05, collar: .11, thigh: .245, shin: .245, foot: .15, footH: .04, upperArm: .17, forearm: .145, hand: .1, girth: .11, stoop: 0 },
    child: { r: .115, neck: .04, collar: .1, thigh: .195, shin: .19, foot: .13, footH: .035, upperArm: .14, forearm: .12, hand: .075, girth: .1, stoop: 0 },
    elder: { r: .085, neck: .045, collar: .11, thigh: .24, shin: .24, foot: .15, footH: .04, upperArm: .165, forearm: .14, hand: .095, girth: .12, stoop: .2 },
    heavy: { r: .088, neck: .045, collar: .115, thigh: .245, shin: .24, foot: .155, footH: .04, upperArm: .17, forearm: .145, hand: .1, girth: .16, stoop: 0 },
    thin: { r: .08, neck: .055, collar: .105, thigh: .25, shin: .25, foot: .15, footH: .04, upperArm: .175, forearm: .15, hand: .1, girth: .08, stoop: 0 },
  };
  for (const b of Object.values(B)) b.spine = 1 - (b.footH + .97 * (b.thigh + b.shin) + b.collar + b.neck + 2 * b.r);
  return B;
})();

// Especificação humana do tipo de corpo (id 'human', body = tipo). Pelve na altura do quadril de pé; peito, base do
// pescoço (collar), base da cabeça (neck) e eixo da cabeça numa linha inclinada stoop; ombros .015 abaixo da base do
// pescoço; braços pendem quase retos, a mão um pouco atrás do meio do corpo (.3 girth: ao lado da coxa, não na
// virilha); passada e altura do pé na escala da perna.
function humanSpec(type = 'adult') {
  const b = BODY[type], H = SPECS.human;
  if (!b) throw new Error(`Tipo de corpo desconhecido: ${type}`);
  const hip = b.footH + .97 * (b.thigh + b.shin), s = Math.sin(b.stoop), c = Math.cos(b.stoop), sh = b.collar - .015, up = b.spine + b.collar + b.neck + b.r;
  const chest = { offset: -b.spine * s, r: b.girth, h: hip + b.spine * c };
  const head = { offset: -up * s, r: b.r, h: hip + up * c, axis: b.stoop - Math.PI / 2 };
  const limb = lb => lb.foot ? { ...lb, l1: b.thigh, l2: b.shin, l3: b.foot, h3: b.footH } : { ...lb, along: sh * s, h: sh * c, l1: b.upperArm, l2: b.forearm, l3: b.hand, rest: [-.3 * b.girth, .92 * (b.upperArm + b.forearm)] };
  return { ...H, body: type, stride: H.stride * (b.thigh + b.shin) / .49, lift: H.lift * (b.thigh + b.shin) / .49, spine: [chest, { offset: 0, r: .9 * b.girth, h: hip }], neck: { at: [b.collar * s, -b.collar * c] }, head, limbs: H.limbs.map(limb) };
}

// Gira pescoço (dn) e cabeça (dh) de uma pose pronta, em rad (> 0 baixa o olhar), dentro dos limites da especificação
// (limitsOf: JOINT_LIMITS + spec.limits): o pescoço na base (joints.neck), a cabeça na base do crânio; leva junto base,
// centro e topo da cabeça e os apêndices presos nela. spec: a da pose (padrão SPECS[p.spec]; variantes da cena passam a sua).
function turnHead(p, dn = 0, dh = 0, spec = SPECS[p.spec]) {
  const L = limitsOf(spec), J = p.joints, an = clamp(p.angles.neck + dn, -L.neck, L.neck), ah = clamp(p.angles.head + dh, -L.head, L.head);
  const spin = (c, r) => ([x, y]) => [c[0] + (x - c[0]) * Math.cos(r) - (y - c[1]) * Math.sin(r), c[1] + (x - c[0]) * Math.sin(r) + (y - c[1]) * Math.cos(r)];
  const names = spec.appendages.filter(ap => ap.attach === 'head').map(ap => ap.name), rn = p.facing * (an - p.angles.neck), rh = p.facing * (ah - p.angles.head);
  for (const [f, keys] of [[spin(J.neck, rn), ['headBase', 'head', 'headTop']], [null, ['head', 'headTop']]]) {
    const g = f || spin(J.headBase, rh);
    for (const k of keys) J[k] = g(J[k]);
    for (const n of names) p.appendages[n] = p.appendages[n].map(g);
  }
  p.head = { x: J.head[0], y: J.head[1], angle: p.head.angle + rn + rh };
  p.angles = { neck: an, head: ah };
  return p;
}

// Corpo abaixado d BL (agachar, sentar): coluna e cabeça descem juntas, as alturas relativas não mudam (ossos iguais); as
// pernas dobram na IK até os pés plantados.
function lowered(spec, d) { return d ? { ...spec, spine: spec.spine.map(g => ({ ...g, h: (g.h || 0) - d })), head: { ...spec.head, h: (spec.head.h || 0) - d } } : spec; }

// Alvo do pulso (gesto de creaturePose, k = 1) para a ponta da mão cair exatamente em M: IK do braço com antebraço e mão
// como um osso só (a mão continua o antebraço); o pulso fica nesse osso, a l2 do cotovelo. p = pose da mesma especificação
// e quadro (a raiz do braço não depende de gesto). M fora do alcance: a mão para no alcance máximo.
function handTo(p, spec, limb, M) {
  const lb = spec.limbs.find(l => l.name === limb), S = p.size, L2 = (lb.l2 + lb.l3) * S;
  const { mid } = limb2(p.limbs[limb].root, M, lb.l1 * S, L2, lb.bend * p.facing, limitsOf(spec).elbow[1]), f = lb.l2 * S / Math.hypot(M[0] - mid[0], M[1] - mid[1]);
  return [mid[0] + (M[0] - mid[0]) * f, mid[1] + (M[1] - mid[1]) * f];
}

// Passo de lado (gesto de pé): leva o tornozelo do membro até ficar h3 acima do chão em x, subindo lift BL no meio (k 0..1);
// no meio do passo o pé está no ar (creaturePose), nas pontas apoiado.
function stepTo(p, spec, limb, x, ground, k, lift = .05) {
  const lb = spec.limbs.find(l => l.name === limb);
  return { limb, target: [x, ground(x) - (lb.h3 || 0) * p.size - lift * p.size * Math.sin(Math.PI * k)], k };
}
