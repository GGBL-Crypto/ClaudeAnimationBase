// exp-estilos.js (exp/estilos): coreografia comum da competição de estilos 2D. Movimento, câmera e geometria como
// função pura de t, sem desenho: cada estilo (src/styles/exp-<id>/) define ExpStyle.draw(F) e desenha F = EST.frame(cena, t).
// A: 0–20 s do c01 de sauva-operaria, com os planos e tempos do piloto 2D e as multidões de crowd.js no lugar do loop
// por módulo. H: 8 s sem narração; um explorador anda na trilha, para, se agacha e olha uma fila de formigas, surpreso.
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
  // Move a cabeça (e o que está preso nela) depois de creaturePose; da > 0 baixa o olhar (nod() do c01).
  function nod(p, dx, dy, da) {
    const hx = p.head.x + p.facing * dx * p.size, hy = p.head.y + dy * p.size, a = p.facing * da, co = Math.cos(a), si = Math.sin(a);
    const move = ([x, y]) => { x += hx - p.head.x; y += hy - p.head.y; return [hx + (x - hx) * co - (y - hy) * si, hy + (x - hx) * si + (y - hy) * co]; };
    for (const ap of SPECS[p.spec].appendages) if (ap.attach === 'head') p.appendages[ap.name] = p.appendages[ap.name].map(move);
    p.head = { x: hx, y: hy, angle: p.head.angle + a };
    return p;
  }
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
      p = nod(p, .01 * up, -.02 * up, -.25 * up + .12 * up * Math.sin(t * 2.3));
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
  const ANTS_H = makeCrowd([lane([[2400, 0], [-500, 0]], 26, 1.3, 2.2, { id: 'line', ground: gA, role: 'line', carry: .4, seed: 90, t1: 8, depth: 45 })]);
  const sHum = t => stopAt(t, 1, 0, .7, 2.63, .8), crouch = t => ease(seg(t, 3.7, 4.6)) + .06 * spring(t, 4.6, 6, 12);
  const MOOD = [[0, 'neutral'], [3.2, 'curious', '?'], [5.3, 'surprised', '!']];
  function human(t, gesture) {
    const k = crouch(t), m = mood(t, MOOD, 3), drop = [.21, .21], H = SPECS.human;
    const spec = { ...H, spine: H.spine.map((g, i) => ({ ...g, h: g.h - k * drop[i] })), head: { ...H.head, h: H.head.h - k * .23 } };
    const s = sHum(t), v = speedOf(sHum, t) / .7;
    return creaturePose(spec, { path: HPH, s, size: HSH, ground: gH, t, seed: 3, moving: clamp(v), lean: 1.4 * k, expression: m.expression, blink: m.blink, emote: m.emote, sq: m.sq, gesture });
  }
  function frameH(t) {
    const look = ease(seg(t, 4.3, 5)), k = crouch(t);
    // Mãos nos joelhos ao agachar: segunda passada com o gesto apontando para o joelho da primeira.
    let p = human(t);
    const knee = p.limbs.legL.mid;
    p = human(t, { limb: 'armL', target: [knee[0] + .02 * HSH, knee[1] - .02 * HSH], k: clamp(1.2 * k) });
    p = nod(p, .03 * look, .02 * look, .45 * look - .1 * ease(seg(t, 5.3, 5.5)) * (1 - ease(seg(t, 6.2, 7))));
    const [cx, cy, z] = kf(t, [[3, [960, 540, 1]], [6.5, [960, 700, 1.45]]]);
    const F = { scene: 'H', shot: 'trail', t, lt: t, cam: { cx, cy, z }, world: { ground: gH, antGround: gA }, texts: [] };
    F.actors = [...people(ANTS_H, t), { id: 'human', kind: 'human', role: 'explorer', gear: ['hat', 'backpack'], layer: 1, depth: 0, pose: p, track: HPH.at(sHum(t) * HSH), ground: gH }];
    return F;
  }

  // Quadro F: {scene, shot, t, lt, cam: {cx, cy, z}, under?, world, actors, texts}. actors em ordem de desenho: layer
  // (paralaxe) e depth (maior = mais à frente). actor = {id, kind: ant | fly | human, role, layer, depth, pose
  // (creaturePose; pose.carry = folha {x, y, w, h, angle}), track, ground, hidden?, alpha?, flip? (escala x em torno do
  // meio do corpo: olhar para trás), gear?}. texts = [{text, x, y (tela), size, k (0..1 entra e sai)}].
  function frame(scene, t) {
    const F = scene === 'H' ? frameH(t) : frameA(t);
    F.actors.sort((a, b) => a.layer - b.layer || a.depth - b.depth);
    return F;
  }
  return { frame, times: { CUT1, T2, FLY_IN, NAME } };
})();
// Os planos chamam o estilo; fora do navegador (verificador de movimento) não há timeline.
if (typeof shotsById === 'function') shotsById(Object.fromEntries(PROJECT.storyboard.map(s => [s.id, t => ExpStyle.draw(EST.frame(PROJECT.id === 'estilos-h' ? 'H' : 'A', t))])));
