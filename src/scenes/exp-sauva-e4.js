// exp-sauva-e4.js: variante E4 do experimento visual (branch exp/visual-rico): os 0–20 s do c01 de sauva-operaria com o
// kit 3D genérico (src/styles/toon3d). Mesmo mundo do E3 (exp-sauva-3d.js, que fica como base de comparação): 1 unidade
// = 100 px do plano aberto do 2D, X para a direita, Y para cima (o chão da trilha é 0), Z para a câmera; o corte do solo
// é a face Z = 0 de um bloco. Aqui fica só o que é desta história: relevo, trilhas, túneis, câmaras, o corte, o elenco
// e a câmera. Seres, rosto, plantas, céu e vida de fundo vêm do kit. Cada quadro é função pura de t.
(() => {
  const C = AnimationPlatform.styles.cartoon.config.palette, { add, mul, mix, unit } = V3;
  const at = id => PROJECT.storyboard.find(s => s.id === id).start;
  const rd = (id, j) => AnimationPlatform.projects['sauva-operaria'].storyboard.find(s => s.id === id).reads[j].start;
  const X3 = x => (x - 960) / 100, Y3 = y => -(y - 820) / 100;
  const N = { hero: '#D8652B', sauva: '#A9472C', root: '#B98457', grain: '#D2A26E' };

  // ---------- terreno, trilhas e túneis (do E3) ----------
  const hT = (x, z) => .1 * Math.sin(x * .45 + 1) + .04 * Math.sin(x * 1.3) + .05 * Math.sin(z * .8 + x * .2) + (z < -14 ? .25 * (-14 - z) : 0);
  const TRAIL = -1, BACK = -3.5, X0 = -14, X1 = 18, YB = -14, ZT = -.25, TW = .34;
  const MAIN = track3d([[X0, TRAIL], [X1 + 4, TRAIL]], hT), REAR = track3d([[X0, BACK], [X1 + 4, BACK]], hT);
  const ringPath = (cx, y, cz, rx, rz) => {  // laço no chão de uma câmara
    const path = makePath(Array.from({ length: 33 }, (_, k) => { const a = Math.PI / 2 - k * TAU / 32; return [cx + rx * Math.cos(a), cz + rz * Math.sin(a)]; }));
    return d => { const q = path.at(((d % path.length) + path.length) % path.length); return { p: [q.x, y, q.y], f: [Math.cos(q.angle), 0, Math.sin(q.angle)], u: [0, 1, 0] }; };
  };
  const TUN = [
    [[1500, 840], [1470, 1000], [1300, 1180], [1080, 1300], [930, 1385]],
    [[1470, 1000], [1640, 1200], [1720, 1420], [1700, 1620]],
    [[650, 1440], [470, 1560], [390, 1760]],
  ].map(pts => pts.map(([x, y]) => [X3(x), Y3(y)]));
  const tunnel = pts => {  // trilho no plano Z = ZT; o chão é a parede do lado de n
    const path = makePath(pts), sg = Math.sign(pts.slice(1).reduce((s, q, i) => s + Math.cos(Math.atan2(q[1] - pts[i][1], q[0] - pts[i][0])), 0)) || 1;
    const fr = d => { const q = path.at(d), n = mul([-Math.sin(q.angle), Math.cos(q.angle), 0], sg); return { p: add([q.x, q.y, ZT], mul(n, -.4 * TW)), f: [Math.cos(q.angle), Math.sin(q.angle), 0], u: n }; };
    fr.length = path.length; return fr;
  };
  const TRACKS = TUN.map(tunnel), CH = [[860, 1500, 460, 240, 1], [1700, 1700, 330, 180, 2], [390, 1860, 320, 170, 3]];
  const ROOTS = [];
  for (let r = 0; r < 13; r++) {
    let x = X0 + 1.5 + (X1 - X0 - 3) * hash(r * 3.7 + 1), y = hT(x, 0) - .05, a = -Math.PI / 2;
    const pts = [[x, y]], L = 1 + 2.6 * hash(r * 6.1 + 4);
    for (let k = 1; k <= 9; k++) { a = clamp(a + .45 * (hash(r * 11 + k) - .5), -Math.PI * .85, -Math.PI * .15); x += L / 9 * Math.cos(a); y += L / 9 * Math.sin(a); pts.push([x, y]); }
    ROOTS.push(pts);
    const b = pts[3 + Math.floor(3 * hash(r * 2.3))], ba = a + (hash(r) < .5 ? .9 : -.9);
    ROOTS.push(Array.from({ length: 5 }, (_, k) => [b[0] + k * L / 12 * Math.cos(ba + .2 * k), b[1] + k * L / 12 * Math.sin(ba + .2 * k)]));
  }

  // ---------- construção ----------
  let St, E, world, ambient, label;
  window.buildLowpolyScene = art => {
    const THREE = art.THREE;
    St = toonStage(art, { sun: [-.45, .27], bloom: true, gobo: true, sunVisible: tgt => tgt[1] > -1 }); E = St.E;
    const free = [{ a: [X0 - 1, TRAIL], b: [X1 + 1, TRAIL], r: .24 }, { a: [X0 - 1, BACK], b: [X1 + 1, BACK], r: .24 }, { a: [X3(1500), TRAIL], r: .9 }];
    world = toonBiome(St, 'meadow', { area: { x0: X0, x1: X1, z0: -24, z1: 0 }, ground: hT, free, seed: 3, gobo: true });
    ambient = toonAmbient(St, { area: { x0: X0, x1: X1, z0: -7.5, z1: -1.8 }, ground: hT, gnats: 8, butterflies: 2, clouds: 12 });
    // Chão: trilhas batidas (terra clara no meio), o resto capim com manchas de barro.
    const color = (x, z) => {
      const dz = Math.min(Math.abs(z - TRAIL), Math.abs(z - BACK)), k = clamp(1 - (dz - .2) / .35), m = .5 + .5 * noise1(9, x * .7 + z * .3);
      return [k > .6 ? '#F4D2B0' : mixCol('#7FB04A', '#B7C860', m * .5), Math.max(k, .25 * m)];
    };
    St.ground({ x0: X0, x1: X1, z0: -4.5, z1: 0, h: hT, rep: 1.2, seg: [2, 6], color });  // fino perto das trilhas
    St.ground({ x0: X0, x1: X1, z0: -50, z1: -4.3, h: hT, rep: 1.2, seg: .5, color, dy: -.005 });
    // O corte do solo: face com os furos dos túneis e das câmaras (textura com alfa) e a parede do fundo, 0,8 atrás.
    const K = 64, YT = .5, cv = document.createElement('canvas'); cv.width = (X1 - X0) * K; cv.height = (YT - YB) * K;
    const g = cv.getContext('2d'), px = (x, y) => [(x - X0) * K, (YT - y) * K];
    const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, '#B4703F'); gr.addColorStop(.3, '#93532F'); gr.addColorStop(1, '#6A3824'); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    for (let b = 0; b < 4; b++) { g.beginPath(); for (let x = 0; x <= cv.width; x += 16) g.lineTo(x, (1.4 + 3.2 * b) * K + 18 * Math.sin(x * .004 + b) + 7 * Math.sin(x * .013)); g.lineTo(cv.width, cv.height); g.lineTo(0, cv.height); g.fillStyle = b === 1 ? 'rgba(235,175,95,.16)' : `rgba(90,30,12,${.12 + .04 * b})`; g.fill(); }
    g.globalAlpha = .35; g.fillStyle = g.createPattern(St.tex('soil').image, 'repeat'); g.fillRect(0, 0, cv.width, cv.height); g.globalAlpha = 1;  // grãos da terra do kit
    for (let i = 0; i < 700; i++) { const r = 3 + 6 * hash(i * 3 + 2); g.beginPath(); g.ellipse(cv.width * hash(i * 3), cv.height * hash(i * 3 + 1), 1.3 * r, r, hash(i) * 3, 0, TAU); g.fillStyle = i % 3 ? '#7B4529' : '#D2A574'; g.fill(); }
    const tunnelPath = pts => { const p = makePath(pts); g.beginPath(); for (let d = 0; d <= p.length; d += .1) { const q = p.at(d); g.lineTo(...px(q.x, q.y)); } };
    const chamberPts = ([x, y, w, h, sd]) => Array.from({ length: 14 }, (_, i) => { const a = i * TAU / 14, k = .9 + .18 * hash(sd + i * 2.3); return px(X3(x + Math.cos(a) * w / 2 * k), Y3(Math.min(y + 6, y - h / 2 + Math.sin(a) * h / 2 * k))); });
    const holes = (wd, style) => {
      g.lineCap = g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = style;
      for (const pts of TUN) { tunnelPath(pts); g.lineWidth = wd; g.stroke(); }
      for (const c of CH) { g.beginPath(); chamberPts(c).forEach(q => g.lineTo(...q)); g.closePath(); g.lineWidth = wd - TW * K; g.fill(); g.stroke(); }
    };
    holes(TW * K + 12, '#4A2414'); g.globalCompositeOperation = 'destination-out'; holes(TW * K, '#000'); g.globalCompositeOperation = 'source-over';
    const tex = art.own(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    tex.repeat.set(1 / (X1 - X0), 1 / (YT - YB)); tex.offset.set(-X0 / (X1 - X0), -YB / (YT - YB));
    const shape = new THREE.Shape(); shape.moveTo(X0, YB); for (let x = X0; x <= X1; x += 1) shape.lineTo(x, hT(x, 0)); shape.lineTo(X1, YB); shape.closePath();
    const face = new THREE.Mesh(art.own(new THREE.ShapeGeometry(shape)), St.toon({ map: tex, alphaTest: .5 })); face.castShadow = face.receiveShadow = true; St.scene.add(face);
    const wall = new THREE.Mesh(art.own(new THREE.PlaneGeometry(X1 - X0, -.3 - YB)), St.toon({ map: St.tex('soil'), color: '#C08060' })); wall.position.set((X0 + X1) / 2, (YB - .3) / 2, -.8);
    wall.receiveShadow = true; St.scene.add(wall);
    // Luz quente vazando pela entrada do ninho.
    const lc = document.createElement('canvas'); lc.width = 128; lc.height = 144; const lg = lc.getContext('2d'), f = lg.createRadialGradient(64, 8, 0, 64, 8, 120);
    f.addColorStop(0, 'rgba(255,255,255,1)'); f.addColorStop(.4, 'rgba(255,255,255,.35)'); f.addColorStop(1, 'rgba(255,255,255,0)'); lg.fillStyle = f; lg.fillRect(0, 0, 128, 144);
    const lt = art.own(new THREE.CanvasTexture(lc)); lt.colorSpace = THREE.SRGBColorSpace;
    const leak = new THREE.Mesh(art.own(new THREE.PlaneGeometry(3.2, 3.6)), art.own(new THREE.MeshBasicMaterial({ map: lt, color: '#FFB866', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    leak.position.set(X3(1500), Y3(840) - 1.6, .03); St.scene.add(leak);
    const engine = animationEngine, render = engine.render.bind(engine);
    engine.render = async (t, o) => { await render(t, o); if (label) caption(engine.canvas.getContext('2d'), ...label); };
  };
  function caption(c, str, k) {
    const s = backOut(k), size = 62; if (s < .02) return;
    c.save(); c.translate(W / 2, 110); c.scale(s, s); c.globalAlpha = clamp(k * 3);
    c.font = `700 ${size}px "Segoe UI", "Trebuchet MS", sans-serif`; const w = c.measureText(str).width + 1.2 * size, h = 1.5 * size;
    c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, .45 * size); c.fillStyle = 'rgba(16,20,30,.62)'; c.fill(); c.strokeStyle = 'rgba(255,240,200,.25)'; c.lineWidth = 2; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.cloud; c.fillText(str, 0, 0); c.restore();
  }

  // ---------- quadro ----------
  // Formiga do kit, com a folha cortada (textura com mordidas) em pé na mandíbula.
  function ant(track, s, S, t, o, hex, leaf, look) {
    const P = creature3d('ant', track, s, S, t, o); drawCreature3d(E, P, { hex, ...look });
    if (leaf) { const h = P.head, b = add(add(h.c, mul(h.f, .13 * S)), mul(h.u, .02 * S)), ax = unit(add(mul(h.u, Math.cos(.35)), mul(h.f, Math.sin(.35)))); E.quad(o.seed % 2 ? 'leaf2' : 'leaf', b, mul(unit(V3.cross(ax, h.l)), .38 * S), mul(ax, 1.0 * S), mul(h.l, .2 * S), '#FFFFFF'); }
    return P;
  }
  function backdrop(t) {
    for (let i = 0; i < 6; i++) E.quad('far', [-30 + 14 * i + 5 * hash(i), -2, -38 - 6 * hash(i + 3)], [9 + 3 * hash(i + 5), 0, 0], [0, 4 + 2 * hash(i + 7), 0], [0, 0, 6], i % 2 ? '#6E9E4A' : '#82AE55');
    for (let i = 0; i < 22; i++) { const x = X0 + 1.5 * i + .8 * hash(i + 40), z = -15 - 2 * hash(i + 41), h = 1.2 + 1.2 * hash(i + 42); E.ball([x, hT(x, z) + h, z], .6 * h, ['#4F9A3A', '#3B7E34', '#6FA843'][i % 3], 'far'); E.rod([x, hT(x, z), z], [x, hT(x, z) + h, z], .07, C.wood); }
    const tx = X3(260), tz = -2.6, ty = hT(tx, tz), sw = .05 * wind(t, 260);
    E.rod([tx, ty - .1, tz], [tx + sw, ty + 3.2, tz], .17, C.wood);
    for (let i = 0; i < 6; i++) E.ball([tx + sw + 1.1 * Math.cos(i * 1.1) * (i ? 1 : 0), ty + 3.6 + .5 * Math.sin(i * 1.7), tz + .7 * Math.sin(i * 1.1) * (i ? 1 : 0)], 1.05 + .2 * hash(i + 9), i % 2 ? '#4C9638' : '#6AAA42');
    const nx = X3(1500); E.ovoid([nx, hT(nx, TRAIL) - .05, TRAIL], [1, 0, 0], [0, 1, 0], .7, .28, .6, '#A8643C'); E.ovoid([nx + .05, hT(nx, TRAIL) + .2, TRAIL], [1, 0, 0], [0, 1, 0], .2, .05, .16, '#3A1C10');
    world.draw(t, E); ambient(t, E);
    // Joaninha (o besouro do kit com outro visual) andando atrás da trilha.
    drawCreature3d(E, creature3d('ladybug', track3d([[6.4, -2.1], [11, -1.8]], hT), (.4 + .13 * t) / .32, .32, t, { seed: 9 }), { expression: 'alegre' });
    // Jardim de fungo nas câmaras, raízes no corte e grãos caindo do teto.
    CH.forEach(([x, y, w, h, sd], c) => {
      const n = Math.round(clamp(w * h / 3500, 10, 32)), cx = X3(x), fy = Y3(y);
      for (let i = 0; i < n; i++) {
        const u = 2 * hash(sd + i * 3.1) - 1, v = hash(sd + i * 5.7) * Math.sqrt(1 - u * u), r = (.07 + .05 * hash(sd + i * 1.9)) * Math.min(w, 1.6 * h) / 100 * (1 + .03 * Math.sin(t * 1.3 + i));
        E.ball([cx + u * (.36 * w / 100 - r), fy + (v * (.75 * h / 100 - r) + .8 * r), -.25 - .35 * hash(sd + i * 7.3)], r, i % 4 ? C.cream : '#E7D2A8');
      }
      for (let j = 0; j < 4; j++) { const s = c * 4 + j, u = frac(.42 * t + hash(s * 3.1)), top = fy + .88 * h / 100, bot = fy + .3 * h / 100; E.ball([cx + .6 * (hash(s * 5.7) - .5) * w / 100, top - (top - bot) * u * u, -.2], .022, N.grain); }
    });
    ROOTS.forEach((pts, r) => pts.slice(1).forEach((q, k) => E.rod([...pts[k], .03], [...q, .03], (r % 2 ? .025 : .05) * (1 - .8 * k / pts.length), N.root)));
  }
  function sisters(t, heroX) {
    for (const a of crowd({ length: X3(1520) - X0 }, t, 14, 3, { speed: .6, spacing: 1.5, sizeVar: .1 })) {
      if (Math.abs(X0 + a.s - heroX) < .75) continue;
      const S = .4 * a.size; ant(MAIN, a.s / S, S, t, { seed: a.seed }, N.sauva, a.carry);
    }
    for (const a of crowd({ length: X1 - X0 }, t, 16, 8, { speed: 1.1, spacing: 2, carryEvery: 1, sizeVar: .1 })) { const S = .4 * a.size; ant(REAR, a.s / S, S, t, { seed: a.seed }, N.sauva, true); }
  }
  function underground(t) {
    TRACKS.forEach((tr, i) => { for (const a of crowd(tr, t, 4, 40 + i, { speed: .26, spacing: tr.length / 4, carryEvery: 2, sizeVar: .1 })) { const S = .26 * a.size; ant(tr, a.s / S, S, t, { seed: a.seed }, N.sauva, a.carry); } });
    const ring = ringPath(X3(860), Y3(1500), -.45, 1.7, .25);
    for (let j = 0; j < 2; j++) ant(ring, (frac(.04 * t + j / 2) * 10.9) / .36, .36, t, { seed: 60 + j }, N.sauva, false);
  }
  // Forídea do kit: rosto com olhos compostos, asas com nervuras; voa num ponto, de frente entre a formiga e a câmera.
  function fly(pos, t, target) {
    const f = unit(mix(unit([target[0] - pos[0], 0, target[2] - pos[2]]), unit([E.eye[0] - pos[0], 0, E.eye[2] - pos[2]]), .55));
    drawCreature3d(E, creature3d('fly', () => ({ p: pos, f, u: [0, 1, 0] }), 0, .2, t, { seed: 5 }), { lookAt: target, expression: 'curioso' });
  }
  const DZ = z => 9.6 / z / Math.tan(Math.atan(Math.tan(20 * Math.PI / 180) * 16 / 9));
  const heroX = t => X3(640 + 60 * t);
  const FLY_IN = rd('c1s01', 0) + .1, OUT1 = rd('c1s01', 0) + 3.3, CUT1 = OUT1 + .55;
  // Humor da heroína: neutra, leva um susto com a mosca, fica curiosa; no c1s02 fareja curiosa e depois vira cansada.
  const t2 = at('c1s02'), MOOD = [[0, 'neutro'], [FLY_IN + .7, 'susto'], [FLY_IN + 1.7, 'curioso'], [CUT1, 'neutro'], [t2 + 2, 'curioso'], [t2 + 11.5, 'alegre']];

  function c1s01(t) {
    St.begin(t); label = null;
    const hs = (heroX(t) - X0) / .4, hh0 = creature3d('ant', MAIN, hs, .4, t, { seed: 7 }).head.c, hh = add(hh0, [-.06 * .4, .3 * .4, 0]), drift = [.03 * noise1(41, t * 1.1), .02 * noise1(42, t * 1.3), 0];
    const flyAt = t < CUT1 ? (t > FLY_IN ? add(mix(add(hh, [.6, .5, .3]), hh, easeOut(seg(t, FLY_IN, FLY_IN + .8))), drift) : null)
      : t < CUT1 + 1.3 ? add(add(hh, drift), mul([-.5, 2.2, 0], easeIn(seg(t, CUT1 + .6, CUT1 + 1.3)))) : null;
    if (PROJECT.id === 'sauva-exp-e4c' && t > 3 && t < 4) St.camera(t < 3.5 ? add(hh0, [.01, -.01, 0]) : flyAt, t < 3.5 ? .3 : .26, t < 3.5 ? .12 : .05, t < 3.5 ? .95 : .55);  // close de revisão
    else if (t < CUT1) {  // a câmera vem antes do desenho: rostos e detalhes dependem dela
      const d = lerp(.62, .58, ease(seg(t, 0, OUT1))) * lerp(1, 4, easeIn(seg(t, OUT1, CUT1)));
      St.camera(add(hh0, [.02, .09, 0]), d, .1, .45);
    } else {
      const k = kf(t, [[CUT1, [X3(640 + 60 * CUT1), .25, TRAIL, DZ(3.8), .26]], [5.8, [X3(980), .4, TRAIL, DZ(2.6), .3]], [8.6, [X3(1150), Y3(1330), 0, DZ(.85), .02]], [9.9, [X3(1100), Y3(1330), 0, DZ(.85), .02]], [12.3, [X3(880), Y3(1420), 0, DZ(1.7), .05]], [14.1, [X3(880), Y3(1425), 0, DZ(1.78), .05]]]);
      St.camera([k[0], k[1], k[2]], k[3], k[4], .12 * (1 - seg(t, 5.8, 8.6)));
    }
    backdrop(t); sisters(t, heroX(t)); underground(t);
    ant(MAIN, hs, .4, t, { seed: 7 }, N.hero, true, { mood: mood(t, MOOD, 7), lookAt: flyAt || undefined });
    if (flyAt) fly(flyAt, t, hh0);
    St.end();
  }
  // c1s02: ela anda, para, ergue a cabeça e varre o ar com as antenas; no fim vira a cabeça para trás.
  const S2X = 9, HK2 = [[t2 - 2, -3.2], [t2 + 1.6, 0], [t2 + 11.4, 0], [t2 + 15.4, 4]], HO2 = { start: .5, stop: .9, seed: 21 };
  function c1s02(t, lt) {
    St.begin(t);
    const m = travel(t, HK2, HO2), S = .4, hx = S2X + m.s * S;
    const upK = anticipate(t, t2 + 2, .12, .2) * (1 - ease(seg(t, t2 + 11, t2 + 11.6)));
    const look = 2.2 * ease(seg(t, t2 + 5.2, t2 + 5.55)) * (1 - ease(seg(t, t2 + 10.6, t2 + 10.95)));
    const z = 1 + .08 * ease(seg(lt, 2, 12)), cx = S2X + .6 * (hx - S2X);
    St.camera([cx + .05, hT(cx, TRAIL) + .1, TRAIL], DZ(z) * S / 6.2 * .7, .22, .15);
    backdrop(t); sisters(t, hx);
    ant(MAIN, (hx - X0) / S, S, t, { seed: 7, moving: m.moving, up: .35 * upK, look, sweep: .5 * upK }, N.hero, false, { mood: mood(t, MOOD, 7) });
    const nk = Math.min(seg(t, rd('c1s02', 1), rd('c1s02', 1) + .4), 1 - seg(t, rd('c1s02', 2) - .3, rd('c1s02', 2)));
    label = nk > 0 ? ['Saúva-limão (Atta sexdens)', nk] : null;
    St.end();
  }
  shotsById({ c1s01, c1s02 });
})();
