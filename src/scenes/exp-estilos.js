// exp-estilos.js (exp/estilos): coreografia comum da competição de estilos 2D. Movimento, câmera e geometria como
// função pura de t, sem desenho: cada estilo (src/styles/exp-<id>/) define ExpStyle.draw(F) e desenha F = EST.frame(cena, t).
// A: 0–20 s do c01 de sauva-operaria, com os planos e tempos do piloto 2D e as multidões de crowd.js no lugar do loop
// por módulo. H: 8 s sem narração; um explorador anda na trilha, para, se agacha e olha uma fila de formigas, surpreso.
// P: 30 s, pessoas numa praça (aperto de mão, abraço, conversa, banco, criança que acha uma flor). N: 30 s, bichos na
// beira de um lago (raposa que bebe, peixe que salta, pássaro que pousa, borboleta, besouro, formigas).
// Mundo em px, y para baixo; tela: X = (x − cx)·z + 960, Y = (y − cy)·z + 540. Camada de paralaxe f: cx vira lerp(960, cx, f).
var EST = (() => {
  // Tempos do storyboard de sauva-operaria (fixos aqui: o projeto H não tem esses planos).
  const T2 = 14.066666666666666, READ0 = 1.25, NAME = 17.89166666666667, LEMON = 21.716666666666672;
  const FLY_IN = READ0 + .1, OUT1 = READ0 + 3.3, CUT1 = OUT1 + .55, LEAF = { w: 1.1, h: .7 };
  const FLY = { ...SPECS.fly, flyer: { ...SPECS.fly.flyer, freq: 4 } };  // asas lentas: a 30 fps o normal vira zumbido
  // Faixa de makeCrowd em px: speed em BL/s, spacing em BL (o gap da fila é 1 BL); hide = trechos escondidos nas pontas.
  const lane = (pts, S, speed, spacing, o = {}) => ({ path: makePath(pts), S, speed, gap: 1, rate: speed / spacing, t0: 0, t1: 20, ...o });
  // Chão de quem anda no próprio caminho (túneis): y do caminho no x pedido, perto da distância d (só o verificador usa).
  // Raízes de path.at(e).x = x por troca de sinal e bisseção numa janela de ±80 px; vale a mais perto de d.
  const pathGround = (path, d) => x => {
    let best = null;
    for (let e = d - 80; e < d + 80; e += 4) {
      let a = e, b = e + 4; const sa = Math.sign(path.at(a).x - x); if (sa === Math.sign(path.at(b).x - x)) continue;
      for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (Math.sign(path.at(m).x - x) === sa) a = m; else b = m; }
      if (best === null || Math.abs(a - d) < Math.abs(best - d)) best = a;
    }
    return path.at(best ?? d).y;
  };
  // Atores de uma multidão: alpha some em .6 BL perto dos trechos escondidos (entrada de túnel ou ninho).
  function people(crowd, t) {
    return crowd.at(t).map(a => {
      const ln = crowd.lanes[a.lane], S = ln.S, L = ln.path.length, [h0, h1] = ln.hide || [0, 0];
      const pose = creaturePose(SPECS.ant, { path: ln.path, s: a.s / S, size: S, ground: ln.ground, t, seed: a.seed, moving: a.moving, carry: a.carry ? LEAF : null, antennae: a.meet ? 'tap' : undefined });
      const alpha = h0 || h1 ? clamp(Math.min(h0 ? (a.s - h0) / (.6 * S) : 1, h1 ? (L - h1 - a.s) / (.6 * S) : 1)) : 1;
      return { id: a.id, kind: 'ant', role: ln.role, layer: ln.layer ?? 1, depth: ln.depth ?? 0, pose, track: ln.path.at(a.s), ground: ln.ground || pathGround(ln.path, a.s), hidden: a.hidden, alpha };
    });
  }
  // Aceno depois de creaturePose: gira pescoço (dn) e cabeça (dh), > 0 baixa o olhar; os ossos não esticam (skeleton.js).
  const nod = (p, dn, dh) => turnHead(p, dn, dh);
  // Progresso com parada (o modelo de pausa de crowd.js): anda a v BL/s desde t0 e para em ta, com rampa de r s.
  const stopAt = (t, s0, t0, v, ta, r) => s0 + v * (Math.max(t, t0) - t0) - v * pauseLost(t, ta, 1e4, r);
  const speedOf = (f, t) => (f(t + 1 / 60) - f(t - 1 / 60)) * 30;
  // A folha da protagonista: em pé na mandíbula, inclinada para a frente, para não esconder a cabeça (leaf1 do c01).
  function leaf(p) {
    const S = p.size, a = -Math.PI / 2 + .35 * p.facing, w = .95 * S, bx = p.head.x + p.facing * .13 * S, by = p.head.y + .03 * S;
    return { x: bx + w / 2 * Math.cos(a), y: by + w / 2 * Math.sin(a), w, h: .42 * S, angle: a };
  }
  const hero = (path, s, S, ground, t, o = {}) => creaturePose(SPECS.ant, { path, s, size: S, ground, t, seed: 7, ...o });

  // ---------- A ----------
  const gC = x => 900 + 10 * Math.sin(x * .003), HSC = 1300, HPC = makePath([[-3000, 900], [12000, 900]]), FSC = 300;
  const gbC = x => 770 + 8 * Math.sin(x * .004), mistC = x => 690 + 12 * Math.sin(x * .004);
  const g1 = x => 820 + 14 * Math.sin(x * .004 + 1) + 6 * Math.sin(x * .013), NEST1 = 1500, AS1 = 40, heroX1 = t => 640 + 60 * t;
  const HL1 = makePath([[-400, 834], [2600, 834]]), far1 = x => 640 + 40 * Math.sin(x * .002 + 1) + 18 * Math.sin(x * .006), hill1 = x => 740 + 20 * Math.sin(x * .0035 + 2);
  // Túneis com no máximo ~55° de inclinação (na vista lateral, mais íngreme dobra as patas além do possível): ninho →
  // câmara grande; câmara grande → câmara da direita; câmara grande → câmara funda, entrando pela parede esquerda.
  const TUN1 = [
    [[NEST1, 840], [1440, 920], [1300, 1060], [1120, 1220], [980, 1330], [930, 1385]],
    [[1090, 1490], [1250, 1560], [1400, 1620], [1545, 1680]],
    [[630, 1480], [520, 1560], [400, 1640], [300, 1720], [250, 1790]],
  ];
  const CH1 = [[860, 1500, 460, 240, 1], [1700, 1700, 330, 180, 2], [390, 1860, 320, 170, 3]];
  const FUNGUS1 = [[860, 1500, 360, 200, 3], [1700, 1700, 250, 140, 4], [390, 1860, 240, 130, 5]];
  const g2 = x => 860 + 10 * Math.sin(x * .003), HS2 = 620, HP2 = makePath([[-3000, 860], [6000, 860]]), S2 = (980 + 3000) / HS2;
  const gb2 = x => 720 + 8 * Math.sin(x * .004), mist2 = x => 630 + 12 * Math.sin(x * .004);
  // Multidões. Fundo macro (camada .7): irmãs com folhas. Trilha: entram no ninho (fim escondido). Túneis: entre o ninho e
  // as câmaras. Jardim: atravessam o chão da câmara grande.
  const BACK_C = makeCrowd([lane([[-4000, 0], [10000, 0]], 150, .8, 2.8, { id: 'back', ground: gbC, layer: .7, role: 'back', carry: 1, seed: 8, t1: CUT1 })]);
  const BACK_2 = makeCrowd([lane([[-1600, 0], [3600, 0]], 150, .73, 3.2, { id: 'back2', ground: gb2, layer: .7, role: 'back', carry: 1, seed: 8, t0: T2 })]);
  const TRAIL = makeCrowd([lane([[-500, 820], [NEST1 + 20, 820]], AS1, 1.5, 3.75, { id: 'trail', ground: g1, role: 'trail', carry: 1 / 3, seed: 3, t0: CUT1, t1: T2, hide: [0, AS1] })]);
  const TUNNELS = makeCrowd([
    ...TUN1.map((pts, i) => lane(pts, 26, 1, 5, { id: 'tun' + i, depth: i === 1 ? 12 : 0, role: 'tunnel', carry: .5, seed: 40 + i, t0: CUT1, t1: T2, hide: [30, 30] })),
    lane([[640, 1500], [1080, 1500]], 30, .6, 4, { id: 'garden', ground: () => 1500, role: 'garden', seed: 60, t0: CUT1, t1: T2, hide: [30, 30] }),
  ]);
  // Protagonista. Close: anda a 1,1 BL/s; plano aberto: x = 640 + 60 t; c1s02: chega e para em S2 (rampa de .9 s).
  const s2 = t => stopAt(t, S2 - 3.2, T2 - 2, 1, T2 + .75, .9);
  function frameA(t) {
    const F = { scene: 'A', t, actors: [], texts: [] };
    if (t < CUT1) {  // close: a cabeça dela e a forídea; a câmera recua depressa e corta para a trilha
      const hp = hero(HPC, 3700 / HSC + 1.1 * t, HSC, x => gC(x) + 60, t);
      hp.carry = leaf(hp);
      const z = lerp(1, 1.06, ease(seg(t, 0, OUT1))) * lerp(1, .25, easeIn(seg(t, OUT1, CUT1)));
      Object.assign(F, { shot: 'close', lt: t, cam: { cx: hp.head.x - 120, cy: hp.head.y - 110, z }, world: { ground: gC, mist: { f: .35, root: 700, prof: mistC }, back: { f: .7, ground: gbC }, front: x => gC(x) + 140 } });
      F.actors.push(...people(BACK_C, t));
      F.actors.push({ id: 'hero', kind: 'ant', role: 'hero', layer: 1, depth: 0, pose: hp, track: HPC.at(hp.size * (3700 / HSC + 1.1 * t)), ground: x => gC(x) + 60 });
      if (t > FLY_IN) {  // forídea: chega de cima, de fora do quadro, e paira sobre a cabeça dela
        const hx = hp.head.x - .06 * HSC + 30 * noise1(41, t * 1.1), hy = hp.head.y - .3 * HSC + 20 * noise1(42, t * 1.3);
        const path = makePath([[hx + 1300, hy - 700], [hx + 350, hy - 140], [hx, hy]]), s = ease(seg(t, FLY_IN, FLY_IN + 1)) * path.length;
        F.actors.push({ id: 'fly', kind: 'fly', role: 'fly', layer: 1, depth: 1, pose: creaturePose(FLY, { path, s: s / FSC, size: FSC, t, seed: 4, gait: 'fly' }), track: path.at(s), air: true });
      }
    } else if (t < T2) {  // plano aberto: trilha, ela com a mosca; a câmera desce ao corte do solo
      const [cx, cy, z] = kf(t, [[CUT1, [heroX1(CUT1), 800, 3.8]], [5.8, [980, 780, 2.6]], [8.6, [1150, 1330, .85]], [9.9, [1100, 1330, .85]], [12.3, [880, 1420, 1.7]], [14.1, [880, 1425, 1.78]]]);
      Object.assign(F, { shot: 'wide', lt: t - CUT1, cam: { cx, cy, z }, under: seg(cy, 900, 1250), world: {
        ground: g1, nest: NEST1, soilTop: 846, tunnels: TUN1, chambers: CH1, fungus: FUNGUS1, tree: { x: 260, h: 420 }, roots: { x: 260, y: 850, h: 420 },
        clouds: { f: .1, list: [[380 + 6 * t, 160, .8, 1], [1450 + 4 * t, 110, .6, 2], [2300 + 5 * t, 220, .7, 3]] }, far: { f: .3, prof: far1 }, hill: { f: .6, prof: hill1 },
      } });
      F.actors.push(...people(TUNNELS, t), ...people(TRAIL, t));
      const sH = (heroX1(t) + 400) / AS1, hg = x => g1(x) + 14, hp = hero(HL1, sH, AS1, hg, t);
      hp.carry = leaf(hp);
      F.actors.push({ id: 'hero', kind: 'ant', role: 'hero', layer: 1, depth: 14, pose: hp, track: HL1.at(sH * AS1), ground: hg });
      // Forídea: segue pairando sobre ela depois do corte e sai para o alto (acelera em u²).
      const hx = hp.head.x - .06 * AS1, hy = hp.head.y - .3 * AS1, tl = CUT1 + .6, FS = 16;
      if (t < tl + 2.2) {
        const path = t < tl ? makePath([[hx + .6, hy + .8], [hx, hy]]) : makePath([[hx, hy], [hx - 120, hy - 160], [hx - 200, hy - 450]]), s = t < tl ? 1 : seg(t, tl, tl + 2.2) ** 2 * path.length;
        F.actors.push({ id: 'fly', kind: 'fly', role: 'fly', layer: 1, depth: 15, pose: creaturePose(FLY, { path, s: s / FS, size: FS, t, seed: 4, gait: 'fly' }), track: path.at(s), air: true });
      }
    } else {  // c1s02: ela para, ergue a cabeça, varre o ar e vira para olhar para trás; o nome entra
      const lt = t - T2, s = s2(t), v = speedOf(s2, t), thx = -3000 + s * HS2, cx = 960 + .6 * (thx - 980), z = 1 + .08 * ease(seg(lt, 2, 12));
      Object.assign(F, { shot: 'name', lt, cam: { cx, cy: 540, z }, world: { ground: g2, rock: [1650, g2(1650) + 40, 70], mist: { f: .35, root: 640, prof: mist2 }, back: { f: .7, ground: gb2 }, front: x => g2(x) + 140 } });
      F.actors.push(...people(BACK_2, t));
      const up = anticipate(t, T2 + 2, .12, .2), lean = 1.2 * spring(t, T2 + 1.55, 5, 10), sq = .05 * (spring(t, T2 + 1.6, 6, 14) + spring(t, T2 + 5.6, 7, 16));
      let p = hero(HP2, s, HS2, g2, t, { moving: clamp(v), lean, drag: -1.5 * spring(t, T2 + 1.4, 3, 6), antennae: 'explore', sq });
      p = nod(p, -.15 * up, -.2 * up + .12 * up * Math.sin(t * 2.3));
      const k1 = ease(seg(t, T2 + 5.2, T2 + 5.55)), sx = 1 - 2 * k1;
      F.actors.push({ id: 'hero', kind: 'ant', role: 'hero', layer: 1, depth: 0, pose: p, track: HP2.at(s * HS2), ground: g2, flip: Math.sign(sx || 1) * Math.max(.18, Math.abs(sx)) });
      const nk = Math.min(seg(t, NAME, NAME + .4), 1 - seg(t, LEMON - .3, LEMON));
      F.texts.push({ text: 'Saúva-limão (Atta sexdens)', x: (980 - cx) * z + 960, y: (300 - 540) * z + 540, size: 62, k: nk });
    }
    return F;
  }

  // ---------- H ----------
  // Explorador (1 BL = 500 px de altura) entra pela esquerda a .7 BL/s, para (3,4 s), se agacha (3,7–4,6 s), olha para
  // baixo e leva o susto (5,3 s). A fila de formigas anda para a esquerda, à frente dele, a vida toda do plano.
  const gH = x => 905 + 8 * Math.sin(x * .0035 + .5), gA = x => gH(x) + 45, HSH = 500, HPH = makePath([[-800, 0], [3200, 0]]);
  const ANTS_H = makeCrowd([lane([[2400, 0], [-500, 0]], 34, 1.1, 2.2, { id: 'line', ground: gA, role: 'line', carry: .4, seed: 90, t1: 8, depth: 45 })]);
  const sHum = t => stopAt(t, 1, 0, .7, 2.63, .8), crouch = t => ease(seg(t, 3.7, 4.6)) + .06 * spring(t, 4.6, 6, 12);
  const MOOD = [[0, 'neutral'], [3.2, 'curious', '?'], [5.3, 'surprised', '!']];
  function human(t, gesture) {
    // Agachar: pelve, peito e cabeça descem juntos (.3 BL) e o tronco inclina ~45°; os joelhos dobram na IK e a cabeça segue o pescoço.
    const k = crouch(t), m = mood(t, MOOD, 3), spec = lowered(humanSpec('adult'), .3 * k);
    const s = sHum(t), v = speedOf(sHum, t) / .7;
    return creaturePose(spec, { path: HPH, s, size: HSH, ground: gH, t, seed: 3, moving: clamp(v), lean: 6 * k, expression: m.expression, blink: m.blink, emote: m.emote, sq: m.sq, gesture });
  }
  function frameH(t) {
    const look = ease(seg(t, 4.3, 5)), k = crouch(t);
    // Antes de agachar, o pé de trás dá um passo para junto do da frente (senão o joelho dele desce abaixo do chão); mão no
    // joelho ao agachar: segunda passada com o pulso no joelho da primeira (a mão sai do pulso, por cima dele).
    let p = human(t);
    const kS = ease(seg(t, 3.35, 3.75)), x1 = p.joints.ankleL[0] - .06 * HSH, lift = .05 * HSH * Math.sin(Math.PI * kS);
    p = human(t, [{ limb: 'armL', target: p.limbs.legL.mid, k: clamp(1.2 * k) }, { limb: 'legR', target: [x1, gH(x1) - BODY.adult.footH * HSH - lift], k: kS }]);
    p = nod(p, .25 * look, .4 * look - .1 * ease(seg(t, 5.3, 5.5)) * (1 - ease(seg(t, 6.2, 7))));
    const [cx, cy, z] = kf(t, [[3, [960, 540, 1]], [6.5, [960, 700, 1.45]]]);
    const F = { scene: 'H', shot: 'trail', t, lt: t, cam: { cx, cy, z }, world: { ground: gH, antGround: gA }, texts: [] };
    F.actors = [...people(ANTS_H, t), { id: 'human', kind: 'human', role: 'explorer', gear: ['hat', 'backpack'], layer: 1, depth: 0, pose: p, track: HPH.at(sHum(t) * HSH), ground: gH }];
    return F;
  }


  // ---------- P ----------
  // Praça (30 s, sem narração). 1 BL = altura da pessoa (adulto 400 px no mundo); chão plano em GP. Planos: praca (aberto:
  // todos entram, a moça senta no banco, o corredor passa ao fundo), encontro (João chega, aperto de mão, passo, abraço,
  // conversa), achado (a criança acha uma flor no chão e mostra ao avô), banco (a moça levanta e anda; a câmera a segue
  // até a conversa). depth = ordem de desenho e também a distância z (px) do verificador de atravessamento: corredor −300,
  // banco −150, par 0, avô e criança 200.
  const GP = 900, gP = () => GP, TP = { encontro: 6, achado: 17, banco: 24 }, lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  // Deslocamento com partidas e paradas (pauseLost de crowd.js): cada trecho [t0, t1, v, r] parte do repouso em t0 e para
  // em t1 com rampas de cosseno de r s, andando v · (t1 − t0) BL; t0 < 0 = já entra andando.
  const go = (t, legs) => legs.reduce((s, [t0, t1, v, r = .7]) => s + v * (pauseLost(t, t0, 1e4, r) - pauseLost(t, t1, 1e4, r)), 0);
  const span = (t, a, b, r = .3) => ease(seg(t, a, a + r)) * (1 - ease(seg(t, b - r, b)));  // 0 → 1 → 0 em [a, b]
  // Pessoa: tipo de corpo, altura (px), sentido (1 = para a direita), trechos e ref [t, x] (pelve em x no instante t).
  // mood = chaves de mood(); talk = [[t0, t1], ...] em que fala (talk() dá a boca).
  function person(id, type, size, dir, legs, ref, o = {}) {
    const spec = o.spec || humanSpec(type), x0 = ref[1] - dir * size * go(ref[0], legs);
    return { id, type, size, dir, legs, spec, path: makePath([[x0, GP], [x0 + dir * 2e4, GP]]), v: Math.max(...legs.map(l => Math.abs(l[2]))), talk: [], ...o };
  }
  // Pose da pessoa em t: s dos trechos (ou o.s), corpo abaixado o.d BL, inclinação o.lean, gestos e mãos; rosto por mood e talk.
  function pose(c, t, o = {}) {
    const s = o.s ?? go(t, c.legs), m = mood(t, c.mood, c.seed), mouth = c.talk.map(([a, b]) => talk(t, c.seed, a, b)).find(x => x) || null;
    const moving = o.moving ?? clamp(Math.abs(speedOf(u => go(u, c.legs), t)) / c.v);
    return creaturePose(lowered(c.spec, o.d || 0), { path: c.path, s, size: c.size, ground: gP, t, seed: c.seed, moving, lean: o.lean || 0, gesture: o.gesture, hands: o.hands, expression: m.expression, blink: m.blink, emote: m.emote, sq: m.sq, mouth });
  }
  const actorP = (c, p, s, o = {}) => ({ id: c.id, kind: 'human', role: c.role, layer: 1, depth: c.depth, pose: p, track: c.path.at(s * c.size), ground: gP, ...o });
  // Fala com as mãos: nos trechos de fala, as pontas das duas mãos passeiam à frente do peito (ruído por semente).
  function talkHands(c, p, t) {
    const k = Math.max(0, ...c.talk.map(([a, b]) => span(t, a, b, .35))), S = c.size;
    if (!k) return [];
    return ['armL', 'armR'].map((limb, i) => {
      const r = p.limbs[limb].root, M = [r[0] + c.dir * (.17 + .06 * noise1(c.seed + i, t * 1.7)) * S, r[1] + (.24 - .08 * Math.max(0, noise1(c.seed + 3 + i, t * 1.3))) * S];
      return { limb, target: handTo(p, c.spec, limb, M), k, hand: i ? 'open' : noise1(c.seed + 9, t) > .3 ? 'point' : 'open' };
    });
  }

  // Corredor: passada longa (bipedRun, sem duplo apoio: no voo nenhum pé apoia, a.air), braços dobrados à frente.
  const RUN = (() => { const R = humanSpec('adult'); return { ...R, gait: 'bipedRun', stride: 1.3, lift: .13, limbs: R.limbs.map(l => l.foot ? l : { ...l, rest: [.07, .19] }) }; })();
  const RUNNER = person('corredor', 'adult', 400, -1, [[-6, 60, 2.2]], [0, 3300], { spec: RUN, seed: 41, depth: -300, role: 'runner', mood: [[0, 'neutral']] });
  // Par: Marta espera (de frente para a direita); João chega pela direita, aperta a mão dela (9–11 s), os dois dão um passo
  // (11,2–12 s), se abraçam (12–14,3 s), recuam um passo (de costas, 14,4–15,2 s) e conversam (fala alternada com as mãos).
  const B = person('marta', 'heavy', 380, 1, [[11.2, 11.6, .214, .4], [14.4, 14.8, -.21, .4]], [0, 1385], { seed: 22, depth: 0, role: 'greeter',
    mood: [[0, 'neutral'], [2.5, 'curious', '?'], [7.4, 'happy', '!']], talk: [[16.4, 18.4], [20.6, 22.4], [24.8, 26.6], [28.8, 30.5]] });
  const A = person('joao', 'adult', 400, -1, [[3.6, 8.2, .75], [11.2, 11.6, .203, .4], [14.4, 14.8, -.2, .4]], [9, 1615], { seed: 21, depth: 0, role: 'greeter',
    mood: [[0, 'neutral'], [7.8, 'happy', '!']], talk: [[14.4, 16.2], [18.6, 20.4], [22.6, 24.6], [26.8, 28.6]] });
  const SHAKE = [9, 9.5, 10.6, 11], HUG = [12, 12.6, 13.7, 14.3];
  // M do aperto de mão (pontas das duas mãos direitas), dos ombros da primeira passada.
  const shakeAt = (a0, b0, t) => { const sa = a0.joints.shoulderR, sb = b0.joints.shoulderR, sh = .022 * 390 * Math.sin(TAU * 3 * (t - SHAKE[1])) * span(t, SHAKE[1], SHAKE[2], .2); return [(sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2 + .2 * 390 + sh]; };
  function pairP(t) {
    const hs = ease(seg(t, SHAKE[0], SHAKE[1])) * (1 - ease(seg(t, SHAKE[2], SHAKE[3]))), hg = ease(seg(t, HUG[0], HUG[1])) * (1 - ease(seg(t, HUG[2], HUG[3])));
    const o = { lean: 1.3 * hg }, a0 = pose(A, t, o), b0 = pose(B, t, o), ga = talkHands(A, a0, t), gb = talkHands(B, b0, t);
    let front = false;
    if (hs) {  // mãos direitas: as duas pontas no mesmo ponto M, que sacode 3 vezes por segundo
      const M = shakeAt(a0, b0, t);
      ga.push({ limb: 'armR', target: handTo(a0, A.spec, 'armR', M), k: hs }); gb.push({ limb: 'armR', target: handTo(b0, B.spec, 'armR', M), k: hs });
    }
    if (hg) {  // abraço: as mãos dele nas costas dela, perto dos ombros; as dela nas costas dele, mais baixo
      const back = (p, c, dy) => [p.joints.chest[0] - c.dir * .5 * BODY[c.type].girth * c.size, p.joints.chest[1] + dy * c.size];
      ga.push(...['armR', 'armL'].map((limb, i) => ({ limb, target: handTo(a0, A.spec, limb, back(b0, B, .01 + .07 * i)), k: hg })));
      gb.push(...['armL', 'armR'].map((limb, i) => ({ limb, target: handTo(b0, B.spec, limb, back(a0, A, .14 + .08 * i)), k: hg })));
      front = hg > .5;
    }
    // Quem ouve acena devagar; no abraço as cabeças baixam um pouco (sem encostar).
    const nodOf = (c, other) => .12 * Math.max(0, Math.sin(TAU * .7 * t + c.seed)) * Math.max(0, ...other.talk.map(([a, b]) => span(t, a, b, .4)));
    const pa = turnHead(pose(A, t, { ...o, gesture: ga }), nodOf(A, B), .12 * hg), pb = turnHead(pose(B, t, { ...o, gesture: gb }), nodOf(B, A), .12 * hg);
    return [actorP(A, pa, go(t, A.legs), front ? { front: ['armR'] } : {}), actorP(B, pb, go(t, B.legs), front ? { front: ['armL'] } : {})];
  }

  // Moça do banco (magra): entra pela esquerda e para (3,7 s) com o banco atrás dela; o pé de trás dá um passo para junto do
  // da frente (3,75–4,15 s); senta (4,1–5,3 s: a pelve vai para trás e desce até o assento, os pés ficam plantados, o tronco
  // inclina e as mãos vão aos joelhos), fica sentada com as mãos nas coxas, levanta (24,4–25,6 s), o pé do passo volta
  // ao lugar da passada (25,6–26 s) e ela anda até perto da criança e do avô (para em 28,5 s).
  const LIA = person('lia', 'thin', 410, 1, [[-3, 3, .7], [26, 27.8, .6]], [3.7, -560], { seed: 31, depth: -150, role: 'sitter',
    mood: [[0, 'neutral'], [12.4, 'happy'], [25.8, 'neutral']] });
  const sitK = t => ease(seg(t, 4.1, 5.3)) * (1 - ease(seg(t, 24.4, 25.6))), LEAN_SEAT = 1.2, STEP = [3.75, 4.15, 25.6, 26];
  const SIT = (() => {
    const c = LIA, b = BODY[c.type], S = c.size, sStop = go(10, c.legs), p0 = pose(c, 4, { s: sStop, moving: 0 }), ank = ['L', 'R'].map(k => p0.joints['ankle' + k]);
    const back = ank[0][0] * c.dir < ank[1][0] * c.dir ? 0 : 1, xs = ank[1 - back][0] - c.dir * .06 * S;
    ank[back] = [xs, GP - b.footH * S];
    const px = (ank[0][0] + ank[1][0]) / 2 - c.dir * .95 * b.thigh * S, py = GP - (b.footH + .985 * b.shin) * S;
    return { sStop, ank, back: 'leg' + 'LR'[back], front: 'leg' + 'LR'[1 - back], xs, d: c.spec.spine[1].h - (GP - py) / S, shift: (c.path.at(sStop * S).x - px) * c.dir / S + .016 * LEAN_SEAT };
  })();
  function lia(t) {
    const k = sitK(t), c = LIA, S = c.size, kS = ease(seg(t, STEP[0], STEP[1])) * (1 - ease(seg(t, STEP[2], STEP[3])));
    if (!k) {  // de pé: só o passo (pé de trás junto do da frente) e a volta dele para a passada
      const p0 = pose(c, t), g = kS ? [stepTo(p0, c.spec, SIT.back, SIT.xs, gP, kS)] : undefined;
      return actorP(c, g ? pose(c, t, { gesture: g }) : p0, go(t, c.legs));
    }
    // Senta: a pelve recua antes de descer; levanta: vai à frente (sobre os pés) antes de subir.
    const s = SIT.sStop - SIT.shift * (t > 10 ? k * k : ease(clamp(1.25 * k))), o = { s, moving: 0, d: SIT.d * k, lean: LEAN_SEAT * k + 3.2 * Math.sin(Math.PI * k) };
    const legs = SIT.ank.map((a, i) => ({ limb: 'leg' + 'LR'[i], target: a, k: 1 })), p1 = pose(c, t, { ...o, gesture: legs });
    const arms = ['L', 'R'].map(sd => { const q = lerp2(p1.joints['hip' + sd], p1.joints['knee' + sd], .62); return { limb: 'arm' + sd, target: [q[0], q[1] - .035 * S], k: clamp(1.6 * k) }; });
    const p = turnHead(pose(c, t, { ...o, gesture: [...legs, ...arms] }), .06 * noise1(c.seed, t * .3), -.08 * k * Math.max(0, noise1(c.seed + 1, t * .25)));
    return actorP(c, p, s, { seated: k });
  }
  // Banco de perfil (assento visto de lado, encosto atrás dela): o assento fica .05 BL abaixo da pelve sentada (a coxa, de
  // meia largura ~.05 BL, apoia nele).
  const BENCH = (() => {
    const p = lia(10).pose, c = LIA, S = c.size, x = p.joints.pelvis[0] + c.dir * .05 * S;
    return { x, seatY: p.joints.pelvis[1] + .05 * S, w: .3 * S, back: -c.dir, backH: .3 * S, depth: -150 };
  })();

  // Avô (idoso) e criança: o avô chega pela direita devagar e espera; a criança entra pela esquerda, vê a flor no chão,
  // agacha e pega (18,6–20,2 s), anda até ele e mostra (21,6 s em diante); ele baixa a cabeça para olhar e estende a mão.
  const ELDER = person('avo', 'elder', 370, -1, [[-6, 5, .35]], [6, 420], { seed: 51, depth: 200, role: 'elder',
    mood: [[0, 'neutral'], [22.2, 'surprised'], [22.9, 'happy']], talk: [[22.9, 24.2]] });
  const KID = person('bia', 'child', 250, 1, [[14, 18.2, .9], [20.3, 21.1, .85]], [19, 30], { seed: 61, depth: 200, role: 'child',
    mood: [[0, 'neutral'], [17.8, 'curious', '?'], [19.7, 'happy', '!']], talk: [[21.2, 21.9], [24.3, 25.2]] });
  const ITEM = { kind: 'flower', x: 30 + .3 * 250, r: 10 };  // flor caída, .3 BL à frente da pelve parada da criança
  const crouchK = t => ease(seg(t, 18.6, 19.3)) * (1 - ease(seg(t, 19.6, 20.2))), GRAB = 19.4;
  function kidP(t) {
    const c = KID, S = c.size, k = crouchK(t), o = { d: .2 * k, lean: 9 * k }, p0 = pose(c, t, o), rest = [ITEM.x, GP - ITEM.r], g = [];
    if (t < GRAB) {  // estende a mão até a flor
      const kr = ease(seg(t, 18.8, GRAB)); if (kr) g.push({ limb: 'armL', target: handTo(p0, c.spec, 'armL', rest), k: kr });
    } else {  // segura: depois de pegar, a flor sobe com a mão; para mostrar, a mão vai à frente e para cima
      const kh = 1 - ease(seg(t, GRAB + .2, 20.1)), ks = ease(seg(t, 21.6, 22.2)), r = p0.limbs.armL.root;
      if (kh) g.push({ limb: 'armL', target: handTo(p0, c.spec, 'armL', rest), k: kh });
      if (ks) g.push({ limb: 'armL', target: handTo(p0, c.spec, 'armL', [r[0] + .24 * S, r[1] - .1 * S + .01 * S * Math.sin(TAU * 1.3 * t)]), k: ks, hand: 'fist' });
    }
    const p = turnHead(pose(c, t, { ...o, gesture: g, hands: t >= GRAB ? { armL: 'fist' } : undefined }), .25 * ease(seg(t, 17.8, 18.4)) * (1 - ease(seg(t, 19.6, 20))) - .15 * ease(seg(t, 21.6, 22.1)), 0);
    const item = t < GRAB ? { ...ITEM, y: rest[1], held: false } : { ...ITEM, x: p.joints.handL[0], y: p.joints.handL[1], held: true, by: c.id, limb: 'armL' };
    return { actor: actorP(c, p, go(t, c.legs), t >= GRAB ? { holds: 'item' } : {}), item };
  }
  function elderP(t, kid) {
    const c = ELDER, p0 = pose(c, t), ke = ease(seg(t, 22.3, 22.9)), look = ease(seg(t, 21.8, 22.4));
    const g = ke ? [{ limb: 'armR', target: handTo(p0, c.spec, 'armR', [kid.item.x + .07 * c.size, kid.item.y + .03 * c.size]), k: ke }] : [];
    return actorP(c, turnHead(pose(c, t, { gesture: g }), .3 * look, .35 * look), go(t, c.legs));
  }

  function frameP(t) {
    const shot = t < TP.encontro ? 'praca' : t < TP.achado ? 'encontro' : t < TP.banco ? 'achado' : 'banco';
    const cam = shot === 'praca' ? { cx: lerp(880, 960, t / TP.encontro), cy: 180, z: .5 } : shot === 'encontro' ? { cx: 1500, cy: 900 - 410 / 1.1, z: lerp(1.1, 1.22, ease(seg(t, 6, 17))) }
      : shot === 'achado' ? { cx: 260, cy: 900 - 420 / 1.25, z: 1.25 } : { cx: kf(t, [[24, -560], [26, -560], [30, 700]]), cy: 900 - 400 / 1.05, z: 1.05 };
    const kid = kidP(t);
    const F = { scene: 'P', shot, t, lt: t - (TP[shot] || 0), cam, texts: [], world: {
      ground: gP, bench: BENCH, item: kid.item, fountain: { x: 2350, y: GP, r: 260, depth: -400 },
      trees: [[-1250, 520, 1], [520, 560, 2], [3000, 600, 3]].map(([x, h, seed]) => ({ x, y: GP, h, seed, depth: -500 })),
      lamps: [[-260, 3], [2050, 4]].map(([x, seed]) => ({ x, y: GP, h: 700, seed, depth: -450 })),
    } };
    const run = pose(RUNNER, t);
    F.actors = [...(t < 7 ? [actorP(RUNNER, run, go(t, RUNNER.legs), { air: !Object.values(run.limbs).some(l => l.foot && l.stance) })] : []), lia(t), ...pairP(t), kid.actor, elderP(t, kid)];
    return F;
  }


  // ---------- N ----------
  // Beira de lago (30 s, sem narração). Margem quase plana à esquerda; depois de x = 1150 o chão desce devagar até o fundo
  // do lago (gN continua sob a água); água em WY a partir de LAKE.x0 (≈ 1440). Planos: margem (aberto: a raposa chega trotando e fareja o chão, a borboleta voa, um
  // peixe salta, besouro e formigas no chão), bebe (a raposa para na beirada e bebe; um peixe salta perto e ela ergue a
  // cabeça), chao (rente ao chão: um pássaro pousa e saltita, bica o chão; o besouro passa; a fila de formigas; a borboleta).
  // depth (ordem e z do verificador): plantas −200, formigas −100, raposa e peixes 0, pássaro 100, borboleta 150, besouro 160.
  const WY = 940, gN = x => 900 + 6 * Math.sin(x * .004) + 180 * ease(clamp((x - 1150) / 900)), TN = { bebe: 9, chao: 19 };
  const LAKE = { waterY: WY, x0: (() => { let a = 1150, b = 2050; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (gN(m) < WY) a = m; else b = m; } return a; })(), x1: 6000 };
  const lineN = (x0, dir) => makePath([[x0, 0], [x0 + dir * 2e4, 0]]);
  const at0 = (legs, ref, size, dir) => lineN(ref[1] - dir * size * go(ref[0], legs), dir);
  const actorN = (id, kind, p, track, o = {}) => ({ id, kind, role: kind, layer: 1, depth: 0, pose: p, track, ground: gN, ...o });
  // Cópia rasa de uma pose para girar a cabeça sem mexer na original (turnHead troca juntas e apêndices, não os edita).
  const clonePose = p => ({ ...p, joints: { ...p.joints }, appendages: { ...p.appendages }, head: { ...p.head }, angles: { ...p.angles } });

  // Raposa (SPECS.dog com pescoço mais longo e mais solto: limits = pescoço 1,7 e cabeça .9 rad; os estilos podem desenhar
  // cão ou raposa): trota, para e fareja o chão (3,6–6,9 s), trota até a beirada (para em 10,3 s) e bebe (10,2–14,4 s:
  // a ponta do focinho, joints.headTop, vai à linha d'água e lambe 2,5 vezes por segundo, com uma onda a cada lambida);
  // o salto do peixe (13,6 s) faz ela erguer a cabeça e olhar.
  const DOG = { ...SPECS.dog, stride: .9, lift: .1, neck: { at: [.1, -.04] }, head: { ...SPECS.dog.head, offset: -.32, h: .66 }, limits: { neck: 1.7, head: .9 } };
  const FOX = { size: 320, legs: [[-3, 3, 1.4], [7.6, 9.6, 1.4]], seed: 71 };
  FOX.path = at0(FOX.legs, [12, 1440], FOX.size, 1);  // patas da frente na água rasa da beirada
  const LAPS = { t0: 10.9, t1: 13.9, f: 2.5 };
  // Mergulho da cabeça até a ponta do focinho ficar em y: bisseção em u (pescoço 1,7u, cabeça .9u), monotônica no alcance.
  function dipTo(p, y) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (turnHead(clonePose(p), 1.7 * m, .9 * m, DOG).joints.headTop[1] < y) lo = m; else hi = m; }
    return lo;
  }
  function fox(t) {
    const c = FOX, s = go(t, c.legs), sniff = span(t, 3.6, 6.9, .6), drink = span(t, 10.2, 14.4, .5), look = span(t, 13.95, 30, .5);
    let p = creaturePose(lowered(DOG, .08 * drink), { path: c.path, s, size: c.size, ground: gN, t, seed: c.seed, gait: 'trot', moving: clamp(Math.abs(speedOf(u => go(u, c.legs), t)) / 1.4), expression: t > 13.9 ? 'surprised' : 'neutral' });
    if (sniff) p = turnHead(p, (1.1 + .1 * noise1(c.seed, t * 2)) * sniff, .5 * sniff, DOG);
    if (drink) { const lap = t > LAPS.t0 && t < LAPS.t1 ? 7 * Math.max(0, Math.sin(TAU * LAPS.f * (t - LAPS.t0))) : 0, u = dipTo(p, WY - lap); p = turnHead(p, 1.7 * u * drink, .9 * u * drink, DOG); }
    if (look) p = turnHead(p, -.25 * look, -.2 * look, DOG);
    return actorN('raposa', 'dog', p, c.path.at(s * c.size), { role: 'fox' });
  }

  // Peixe que salta: nada escondido sob a água, sobe na direção da saída, sai em xa no instante tj, faz o arco balístico
  // (toss, ápice ap px acima da água) até xb em dur s e mergulha. Caminho = subida + arco amostrado + descida; s por
  // tabela de distâncias (velocidade contínua na saída e na entrada). Respingo na saída e na entrada; ondas depois.
  function jumper(id, xa, xb, tj, dur, ap, size, seed) {
    const g = 8 * ap / (dur * dur), vx = (xb - xa) / dur, vy = g * dur / 2, v0 = Math.hypot(vx, vy), T = 1.2, n = 30;
    const arc = Array.from({ length: n + 1 }, (_, i) => toss(tj + i * dur / n, tj, [xa, WY, 0], [xb, WY, 0], dur, -g).p.slice(0, 2));
    const d = [0]; for (let i = 1; i <= n; i++) d.push(d[i - 1] + Math.hypot(arc[i][0] - arc[i - 1][0], arc[i][1] - arc[i - 1][1]));
    // Pontos a passos iguais (resample): o Catmull-Rom com espaçamento desigual faz bicos.
    const La = v0 * T, A = [xa - vx / v0 * La, WY + vy / v0 * La], Bp = [xb + vx / v0 * La, WY + vy / v0 * La], path = makePath(resample([A, ...arc, Bp], 8));
    const sOf = t => { const u = t - tj; if (u < 0) return Math.max(0, La + v0 * u); if (u < dur) { const f = u / dur * n, i = Math.min(n - 1, Math.floor(f)); return La + lerp(d[i], d[i + 1], f - i); } return La + d[n] + Math.min(La, v0 * (u - dur)); };
    return { id, size, seed, path, sOf, tj, dur, xa, xb };
  }
  const FISH = [jumper('peixe1', 2000, 2280, 5.8, .95, 230, 140, 81), jumper('peixe2', 1720, 1960, 13.6, .9, 210, 140, 82)];
  const fish = (f, t) => {
    const s = f.sOf(t), p = creaturePose(SPECS.fish, { path: f.path, s: s / f.size, size: f.size, t, seed: f.seed, moving: 1 });
    const hidden = [...p.spine.map(q => q.y - q.r), p.joints.headTop[1], p.joints.headBase[1]].every(y => y > WY);
    return actorN(f.id, 'fish', p, f.path.at(s), { air: true, hidden, role: 'fish' });
  };

  // Pássaro: voa (gait 'fly') de cima à direita e pousa em x = 700 às 21,1 s (desacelera até parar; nos últimos .4 s as
  // pernas descem até os pés do pouso); depois saltita para a esquerda (pés juntos, hop), para, bica o chão e olha o besouro que chega.
  const BIRD = { size: 120, seed: 91, land: 21.1, fly0: 19.3, legs: [[21.8, 22.6, 1.2], [23.6, 24.2, 1.2]] };
  BIRD.path = lineN(700, -1);
  BIRD.W = creaturePose(SPECS.bird, { path: BIRD.path, s: 0, size: BIRD.size, ground: gN, t: BIRD.land, seed: BIRD.seed, moving: 0 });
  BIRD.fly = (() => { const [x, y] = BIRD.W.joints.spine0; return makePath([[x + 1300, y - 700], [x + 750, y - 330], [x + 380, y - 50], [x + 150, y - 4], [x, y]]); })();  // chega na horizontal
  function bird(t) {
    const c = BIRD, S = c.size;
    if (t < c.land) {
      const u = seg(t, c.fly0, c.land), sp = c.fly.length * (1 - (1 - u) ** 2), kl = ease(seg(t, c.land - .4, c.land));
      const gesture = kl ? ['legL', 'legR'].map(l => ({ limb: l, target: c.W.limbs[l].end, k: kl })) : undefined;
      return actorN('passaro', 'bird', creaturePose(SPECS.bird, { path: c.fly, s: sp / S, size: S, t, seed: c.seed, gait: 'fly', gesture }), c.fly.at(sp), { air: true, depth: 100 });
    }
    const s = go(t, c.legs), peck = Math.max(span(t, 24.6, 25.1, .12), span(t, 25.4, 25.9, .12), span(t, 27.9, 28.4, .12));
    const p = turnHead(creaturePose(SPECS.bird, { path: c.path, s, size: S, ground: gN, t, seed: c.seed, moving: clamp(Math.abs(speedOf(u => go(u, c.legs), t)) / 1.2) }), .6 * peck, .5 * peck);
    const q = c.path.at(s * S);  // trilho na altura do corpo pousado (contínuo com o fim do voo)
    return actorN('passaro', 'bird', p, { ...q, y: c.W.joints.spine0[1] + gN(q.x) - gN(700) }, { air: !Object.values(p.limbs).some(l => l.foot && l.stance), depth: 100 });
  }

  // Borboleta (variante local de voador, kind 'butterfly'; asas por pose.wings, como a forídea): voa devagar por um caminho
  // que passa pelas flores, pairando (flyer.hover); entra pela esquerda e volta pelo chão da margem no fim.
  const BFLY = { id: 'butterfly', gait: 'fly', flyer: { freq: 3.2, hover: .35 }, views: ['side'], stride: 0, lift: 0,
    spine: [{ offset: 0, r: .1 }, { offset: .3, r: .07 }], head: { offset: -.15, r: .07 }, limbs: [],
    appendages: [1, -1].map(side => ({ name: side > 0 ? 'antennaL' : 'antennaR', attach: 'head', side, at: [.04, -.04], angle: -1, lengths: [.16, .06], motion: { amp: .12, freq: 1.1 } })) };
  const FLUT = { size: 80, seed: 95, path: makePath([[-1300, 450], [-600, 600], [-100, 520], [400, 660], [900, 560], [1300, 420], [1800, 330], [2300, 380], [2200, 560], [1600, 640],
    [1100, 600], [700, 720], [350, 640], [0, 720], [-500, 600], [-1300, 520]]) };
  function butterfly(t) {
    const c = FLUT, sp = c.path.length * (t + 1) / 33;
    return actorN('borboleta', 'butterfly', creaturePose(BFLY, { path: c.path, s: sp / c.size, size: c.size, t, seed: c.seed, gait: 'fly' }), c.path.at(sp), { air: true, depth: 150 });
  }

  // Besouro: anda devagar para a direita pela margem, para um pouco (12–14 s) e segue. Corpo um pouco mais alto que o de
  // SPECS.beetle (élitros h .23 em vez de .15): de lado, o círculo dos élitros (r .21) não entra no chão.
  const BEETLE_N = { ...SPECS.beetle, spine: [{ ...SPECS.beetle.spine[0], h: .16 }, { ...SPECS.beetle.spine[1], h: .23 }], head: { ...SPECS.beetle.head, h: .15 } };
  const BEETLE = { size: 90, seed: 97, legs: [[-5, 12, .45], [14, 60, .45]] };
  BEETLE.path = at0(BEETLE.legs, [0, -700], BEETLE.size, 1);
  const beetle = t => { const c = BEETLE, s = go(t, c.legs), p = creaturePose(BEETLE_N, { path: c.path, s, size: c.size, ground: gN, t, seed: c.seed, moving: clamp(Math.abs(speedOf(u => go(u, c.legs), t)) / .45) }); return actorN('besouro', 'beetle', p, c.path.at(s * c.size), { depth: 160 }); };
  // Formigas: fila de fundo para a esquerda (makeCrowd, como em H), algumas com pedacinhos de folha.
  // Saem do formigueiro (NEST, os primeiros 40 px escondidos).
  const NEST = { x: 1100, y: gN(1100), r: 60, depth: -100 }, ANTS_N = makeCrowd([lane([[1100, 0], [-1600, 0]], 30, 1.1, 2.4, { id: 'fila', ground: gN, role: 'line', carry: .4, seed: 99, t1: 30, depth: -100, hide: [40, 0] })]);

  const PLANTS = [[-1000, 'tree', 560], [-520, 'flower', 70], [-180, 'grass', 50], [130, 'flower', 80], [520, 'grass', 45], [960, 'flower', 65], [1180, 'reed', 190], [1225, 'reed', 230], [1490, 'reed', 170], [1530, 'reed', 210]]
    .map(([x, kind, h], i) => ({ x, y: gN(x), kind, h, seed: i + 1, depth: -200 }));
  function frameN(t) {
    const shot = t < TN.bebe ? 'margem' : t < TN.chao ? 'bebe' : 'chao';
    const cam = shot === 'margem' ? { cx: lerp(650, 760, t / TN.bebe), cy: 427, z: .55 } : shot === 'bebe' ? { cx: 1450, cy: 682, z: 1.25 } : { cx: lerp(470, 400, seg(t, 19, 30)), cy: 740, z: 2 };
    // Respingos (1,2 s) na saída e na entrada de cada salto; ondas (3 s) nos mesmos pontos e a cada lambida da raposa.
    const splashes = FISH.flatMap(f => [[f.xa, f.tj], [f.xb, f.tj + f.dur]]).filter(([, t0]) => t >= t0 && t - t0 < 1.2).map(([x, t0]) => ({ x, y: WY, t0, r: 70 }));
    const laps = []; for (let i = 0; LAPS.t0 + (i + .25) / LAPS.f < LAPS.t1; i++) laps.push(LAPS.t0 + (i + .25) / LAPS.f);
    const ripples = [...FISH.flatMap(f => [[f.xa, f.tj, 120], [f.xb, f.tj + f.dur, 120]]), ...laps.map(t0 => [FOX_SNOUT, t0, 40])].filter(([, t0]) => t >= t0 && t - t0 < 3).map(([x, t0, r]) => ({ x, y: WY, t0, r }));
    const F = { scene: 'N', shot, t, lt: t - (TN[shot] || 0), cam, texts: [], world: { ground: gN, lake: LAKE, nest: NEST, splashes, ripples, plants: PLANTS } };
    F.actors = [...people(ANTS_N, t), beetle(t), fox(t), ...FISH.map(f => fish(f, t)), ...(t >= BIRD.fly0 ? [bird(t)] : []), butterfly(t)];
    return F;
  }
  const FOX_SNOUT = fox(12).pose.joints.headTop[0];

  // Quadro F: {scene, shot, t, lt (t no plano), cam: {cx, cy, z}, under?, world, actors, texts}. actors em ordem de desenho:
  // layer (paralaxe) e depth (maior = mais à frente). texts = [{text, x, y (tela), size, k (0..1 entra e sai)}].
  // actor = {id, kind, role, layer, depth, pose (creaturePose: joints, bones, limbs, spine, head, appendages, face, wings?,
  // carry?), track, ground (x → y do chão sob o ator), hidden?, alpha?, flip? (escala x em torno do meio do corpo: olhar
  // para trás; só em A), air? (no ar: voando, peixe, voo da passada ou do salto), ...campos por kind abaixo}.
  // Desenhe todo ser só por pose.joints/bones (pose.spec pode ser variante da cena: EST.specs.butterfly | dog | beetle | runner).
  // kind:
  //   ant (A, H, N): formiga de multidão (people); pose.carry = folha {x, y, w, h, angle}; role trail | tunnel | garden |
  //     back | line | hero. fly (A): forídea, voa (pose.wings).
  //   human (H, P): pose.body = adult | child | elder | heavy | thin (BODY[body].girth = meia largura do tronco); rosto em
  //     pose.face {expression: neutral | curious | surprised | happy, blink 0..1, mouth: null | m | e | a | o} e pose.emote;
  //     pose.limbs.armX.hand = open | point | fist. gear? (H: hat, backpack).
  //     P, por id/role: corredor (runner, adulto; passada longa, braços dobrados; air no voo da passada, nenhum pé no chão),
  //     marta (greeter, heavy) e joao (greeter, adult): aperto de mão (joints.handR dos dois no mesmo ponto), abraço
  //     (actor.front = membros que passam por cima do outro: desenhe esse braço depois dos dois corpos), conversa;
  //     lia (sitter, thin): actor.seated 0..1 (1 = sentada no banco: joints.pelvis .05 BL acima de bench.seatY, coxas
  //     sobre o assento, pés no chão); bia (child): actor.holds = 'item' depois de pegar a flor (mão armL, fist);
  //     avo (elder): estende armR para a flor e baixa a cabeça.
  //   dog (N): raposa (role fox; pose.spec 'dog', variante EST.specs.dog de pescoço longo e pose.limits; desenhe como cão
  //     ou raposa); bebe com joints.headTop (ponta do focinho) na linha d'água; pose.face.expression neutral | surprised.
  //   fish (N): peixe que salta (air sempre; hidden = corpo todo sob a água; visível só no salto). Desenhe a água por
  //     cima da parte do peixe abaixo de lake.waterY.
  //   bird (N): pássaro; voa (air, pose.wings.open = 1, phase 0..1) e pousa; no chão saltita (pés juntos; air no voo do
  //     salto, wings.open = 0 = asas dobradas).
  //   butterfly (N): borboleta (pose.spec 'butterfly', EST.specs.butterfly: tórax, abdome, cabeça, antenas antennaL/R;
  //     sem pernas); air sempre; asas por pose.wings (phase 0..1 do batimento, freq 3,2 Hz).
  //   beetle (N): besouro (EST.specs.beetle = SPECS.beetle com o corpo mais alto); spine[0] pronoto, spine[1] élitros.
  // world (além de ground: x → y do chão):
  //   A, H: ver frameA/frameH (nest, tunnels, chambers, fungus, tree, roots, clouds, far, hill, mist, back, front, rock, antGround).
  //   P: bench {x (meio do assento), seatY (topo do assento), w (largura do assento, de perfil), back (−1: encosto à
  //     esquerda do assento, em x − w/2; +1 à direita), backH (altura do encosto acima do assento), depth};
  //     item {kind: 'flower', x, y (centro), r, held, by?, limb?}: no chão (y = chão − r) até ser pega; depois x, y = ponta
  //     da mão (joints.handL de bia) em todo quadro; fountain {x, y (chão), r, depth}; trees [{x, y, h, seed, depth}];
  //     lamps [{x, y, h, seed, depth}] (postes).
  //   N: lake {waterY, x0 (beirada: daí para a direita é água; o chão, gN, segue como fundo sob ela), x1};
  //     nest {x, y, r, depth} (formigueiro de onde sai a fila); splashes [{x, y, t0, r}] (respingo, vivo por 1,2 s:
  //     idade = F.t − t0); ripples [{x, y, t0, r}] (onda circular, viva por 3 s; r = raio final); plants [{x, y, kind:
  //     tree | flower | grass | reed, h, seed, depth}].
  function frame(scene, t) {
    const F = scene === 'H' ? frameH(t) : scene === 'P' ? frameP(t) : scene === 'N' ? frameN(t) : frameA(t);
    F.actors.sort((a, b) => a.layer - b.layer || a.depth - b.depth);
    return F;
  }
  return { frame, times: { CUT1, T2, FLY_IN, NAME, P: { ...TP, shake: SHAKE, hug: HUG, grab: GRAB, seated: [5.3, 24.4] }, N: { ...TN, drink: [10.7, 13.9], laps: LAPS } }, specs: { butterfly: BFLY, dog: DOG, beetle: BEETLE_N, runner: RUN } };
})();
// Os planos chamam o estilo; fora do navegador (verificador de movimento) não há timeline.
if (typeof shotsById === 'function') shotsById(Object.fromEntries(PROJECT.storyboard.map(s => [s.id, t => ExpStyle.draw(EST.frame(({ 'estilos-h': 'H', 'estilos-p': 'P', 'estilos-n': 'N' })[PROJECT.id] || 'A', t))])));
