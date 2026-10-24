// c02_cidade.js: capítulo 2 de sauva-operaria (A cidade), planos c2s01–c2s05.
// Íris abre no ninho de seis anos (corte largo, dezenas de túneis e câmaras); o fungo enche câmaras e a régua marca 6 m;
// a câmara real com a rainha; close do jardim de fungo; uma operária traz a folha; a rainha põe o ovo dela.
(() => {
  const P = STYLE.palette, A = () => NatureArt;
  // Protagonista: mesmas constantes em todos os capítulos (copie sem mudar).
  const at = id => PROJECT.storyboard.find(s => s.id === id).start;
  const SEED = 7, LOOK = { color: P.sauvaHero, dark: mixCol(P.sauvaHero, P.ink, .35) };
  const BORN = at('c3s04'), DIES = at('c8s01'), age = t => clamp((t - BORN) / (DIES - BORN));
  const her = o => creaturePose(SPECS.ant, { seed: SEED, age: age(o.t), ...o });
  // Início da fala j do plano: os momentos-chave caem aqui.
  const rd = (id, j) => PROJECT.storyboard.find(s => s.id === id).reads[j].start;

  // ---------- ajudas do capítulo (de c01) ----------
  const hand = t => ({ t, k: .6, seed: 5 });
  const EARTH = mixCol(P.wood, P.ground, .2);
  function layer(cx, cy, zoom, f, t, draw) {
    const lx = lerp(960, cx, f);
    Kit.cam(lx, cy, zoom, 0, hand(t)); draw(lx - W / 2 / zoom - 200, lx + W / 2 / zoom + 200); Kit.camEnd();
  }
  const view = (cx, zoom) => [cx - W / 2 / zoom - 80, cx + W / 2 / zoom + 80];
  const toScreen = (x, y, [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
  function grass(t, x0, x1, gy, step, h0, h1, odd = null, push = [], skip = null) {
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      if (odd !== null && (k & 1) !== odd) continue;
      const x = k * step + .5 * step * hash(k + 3), y = gy(x) + 3;
      if (skip && skip(x)) continue;
      A().blade(x, y, h0 + (h1 - h0) * hash(k + 7), bladeBend(t, x, y, push, 60, 3), k & 1 ? P.grass : P.grassDk);
    }
  }
  function nod(p, dx, dy, da) {
    const hx = p.head.x + p.facing * dx * p.size, hy = p.head.y + dy * p.size, a = p.facing * da, co = Math.cos(a), si = Math.sin(a);
    const move = ([x, y]) => { x += hx - p.head.x; y += hy - p.head.y; return [hx + (x - hx) * co - (y - hy) * si, hy + (x - hx) * si + (y - hy) * co]; };
    for (const ap of SPECS[p.spec].appendages) if (ap.attach === 'head') p.appendages[ap.name] = p.appendages[ap.name].map(move);
    p.head = { x: hx, y: hy, angle: p.head.angle + a };
    return p;
  }
  function grains(t, x0, x1, top, floor, n, seed, r = 4) {
    for (let i = 0; i < n; i++) {
      const per = 2.6 + 1.5 * hash(seed + i), u = frac(t / per + hash(seed + i + 9)), x = lerp(x0, x1, hash(seed + i * 3 + Math.floor(t / per + hash(seed + i + 9))));
      if (u < .35) Kit.ellipse(x, lerp(top, floor, u / .35), r, r, mixCol(P.wood, P.cream, .25));
    }
  }
  const loopPath = (cx, cy, rx, ry, dir = 1) => makePath(Array.from({ length: 33 }, (_, k) => { const a = Math.PI / 2 - dir * k * TAU / 32; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }));
  const line = (x, y, dir = 1) => makePath([[x - dir * 1000, y], [x + dir * 1000, y]]);  // s = 1000 / size põe o ser em x
  // Bolinha de fungo (gongilídio) na boca de uma operária.
  const mouth = (p, k = .12) => [p.head.x + p.facing * k * p.size, p.head.y + .05 * p.size];
  const ball = (x, y, r) => { Kit.ellipse(x, y, r, .85 * r, P.cream, { stroke: true }); Kit.ellipse(x - .3 * r, y - .3 * r, .3 * r, .22 * r, P.cloud); };

  // ---------- o ninho de seis anos (c2s01, c2s02): mapa fixo por semente ----------
  const SURF = x => 400 + 10 * Math.sin(x * .003 + 1), ROYAL = [2000, 1720, 560, 250], QSW = 120;
  const CH = [];
  for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) {
    const x = 560 + i * 410 + 140 * (hash(i * 13 + j * 7 + 1) - .5), y = 760 + j * 370 + 100 * (hash(i * 5 + j * 17 + 2) - .5);
    if (hash(i * 5 + j * 11 + 3) < .14 || (Math.abs(x - ROYAL[0]) < 520 && Math.abs(y - ROYAL[1]) < 260)) continue;
    CH.push({ i, j, x, y, w: 200 + 130 * hash(i * 3 + j * 19 + 4), h: 85 + 55 * hash(i * 7 + j * 3 + 5), fung: hash(i * 11 + j * 13 + 6) < .5 });
  }
  CH.forEach((c, k) => { c.k = k; c.grow = hash(k + 40); });
  const ROY = { x: ROYAL[0], y: ROYAL[1], w: ROYAL[2], h: ROYAL[3], royal: true };
  const tube = (a, b, sd) => { const mx = (a[0] + b[0]) / 2 + 80 * (hash(sd) - .5), my = (a[1] + b[1]) / 2 + 60 * (hash(sd + 1) - .5); return makePath([a, [mx, my], b]); };
  const TUN = [];
  for (const a of [...CH, ROY]) {
    // Vizinha mais perto à direita (mesma fileira) e abaixo: liga pela parede e pelo chão.
    const right = [...CH, ROY].filter(b => b.x > a.x + 150 && Math.abs(b.y - a.y) < 250).sort((p, q) => p.x - q.x)[0];
    const down = [...CH, ROY].filter(b => b.y > a.y + 200 && b.y < a.y + 600 && Math.abs(b.x - a.x) < 330).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
    if (right) TUN.push(tube([a.x + .4 * a.w, a.y - .3 * a.h], [right.x - .4 * right.w, right.y - .3 * right.h], TUN.length * 3 + 1));
    if (down) TUN.push(tube([a.x + .2 * a.w * (hash(TUN.length) - .5), a.y], [down.x, down.y - down.h + 10], TUN.length * 3 + 2));
  }
  const HOLES = [1180, 1900, 2620, 3300];
  for (const hx of HOLES) { const b = CH.filter(c => c.j === 0).sort((p, q) => Math.abs(p.x - hx) - Math.abs(q.x - hx))[0]; TUN.push(tube([hx, SURF(hx) + 4], [b.x, b.y - b.h + 10], hx)); }
  // Formiga vista de longe (menos de 22 px na tela): três gotas ao longo do túnel, a folha por cima; creaturePose de
  // ~150 formigas por quadro estoura o orçamento no plano geral. q = path.at(d).
  function speck(q, sz, carry, t, seed) {
    const co = Math.cos(q.angle), si = Math.sin(q.angle), bob = .02 * sz * Math.sin(TAU * 3 * t + seed);
    const at = (u, v) => [q.x + co * u * sz - si * v * sz, q.y + si * u * sz + co * v * sz];
    for (const [u, v, rx, ry, col] of [[-.3, -.17, .14, .11, P.sauvaDk], [-.02, -.16, .1, .07, P.sauva], [.17, -.17, .09, .08, P.sauva]]) { const [x, y] = at(u, v); Kit.ellipse(x, y + bob, rx * sz, ry * sz, col, { rot: q.angle }); }
    if (carry) { const [x, y] = at(.15, -.5); Kit.ellipse(x, y + bob, .5 * sz, .3 * sz, P.leaf, { rot: q.angle - .3 }); }
  }
  const NEST_BOT = Math.max(...CH.map(c => c.y)) + 120;
  const MOUND = []; for (let x = 950; x <= 3550; x += 40) MOUND.push([x, SURF(x) - 90 * Math.exp(-(((x - 2250) / 800) ** 2)) - 20 * Math.sin(x * .01) ** 2]);
  const MOUND_FILL = [...MOUND, ...MOUND.slice().reverse().map(([x]) => [x, SURF(x) + 2])];
  const MG = x => x < 950 || x > 3550 ? SURF(x) : SURF(x) - 90 * Math.exp(-(((x - 2250) / 800) ** 2)) - 20 * Math.sin(x * .01) ** 2;
  const TRAIL = makePath([[5200, 0], [-1200, 0]]);  // volta ao ninho: da direita para a esquerda
  // Rainha no corte largo e o anel de operárias em volta dela.
  const ROYRING = loopPath(ROY.x + 30, ROY.y, 200, 25);
  const t21 = at('c2s01'), t22 = at('c2s02');
  const FUNG2 = rd('c2s02', 0) + .2;  // as câmaras de fungo enchem a partir daqui, uma a uma
  function city(t, cam, fungK) {
    const [cx, cy, z] = cam, [x0, x1] = view(cx, z);
    Kit.gradient();
    layer(cx, cy, z, .1, t, () => { A().cloud(500 + 6 * t - 600, -500, 2, 1); A().cloud(2200 + 4 * t - 400, -650, 1.6, 2); A().cloud(3600 + 5 * t - 500, -420, 1.8, 3); });
    layer(cx, cy, z, .4, t, (a, b) => A().ground(x => 250 + 50 * Math.sin(x * .0015 + 1), a, b, mixCol(P.foliage, P.skyLow, .4)));
    Kit.cam(cx, cy, z, 0, hand(t));
    A().tree(500, SURF(500) + 10, 900, .04 * wind(t, 500), 4);
    A().tree(3900, SURF(3900) + 10, 700, .04 * wind(t, 3900), 8);
    A().ground(SURF, x0, x1);
    A().soil(x0, SURF(x0) + 30, x1 - x0, NEST_BOT + 600, 21);
    for (const p of TUN) A().tunnel(p, 30);
    for (const c of CH) A().chamber(c.x, c.y, c.w, c.h, c.k + 3);
    A().chamber(ROY.x, ROY.y, ROY.w, ROY.h, 2);
    A().roots(500, SURF(500) + 30, 700, 1, 5); A().roots(3900, SURF(3900) + 30, 600, 1, 8);
    for (const c of CH) if (c.fung) { const g = fungK(c); if (g > 0) A().fungus(c.x, c.y, .8 * c.w, .85 * c.h, t, c.k, g); }
    // Gente nos túneis (forma simplificada, < 28 px) e no chão das câmaras.
    TUN.forEach((p, i) => {
      const n = 1 + (p.length > 520);
      for (const a of crowd(p, t, n, 60 + i, { speed: 32, spacing: p.length / n, carryEvery: 3, sizeVar: .1 })) {
        const sz = 32 * a.size, q = p.at(a.s); if (q.x < x0 || q.x > x1) continue;
        if (sz * z < 22) speck(q, sz, a.carry, t, a.seed);
        else A().creature(creaturePose(SPECS.ant, { path: p, s: a.s / sz, size: sz, t, seed: a.seed, carry: a.carry ? { w: 1.1, h: .7 } : null }));
      }
    });
    CH.forEach(c => { if (c.k % 3) return; const r = loopPath(c.x, c.y, .3 * c.w, 8, c.k & 1 ? 1 : -1), d = frac(.05 * t + hash(c.k + 7)) * r.length, sz = 24; A().creature(creaturePose(SPECS.ant, { path: r, s: d / sz, size: sz, ground: () => c.y, t, seed: 200 + c.k })); });
    const q = creaturePose(SPECS.queen, { path: line(ROY.x - 30, 0), s: 1000 / QSW, size: QSW, ground: () => ROY.y, t, seed: 3, moving: 0, antennae: 'explore', age: .5 });
    A().creature(q, { wings: false });
    for (let j = 0; j < 3; j++) { const d = frac(.04 * t + j / 3) * ROYRING.length, sz = 34; A().creature(creaturePose(SPECS.ant, { path: ROYRING, s: d / sz, size: sz, ground: () => ROY.y, t, seed: 70 + j })); }
    grains(t, ROY.x - 200, ROY.x + 200, ROY.y - ROY.h + 20, ROY.y, 3, 31, 6);
    // Superfície: o monte do ninho com os olheiros, a trilha voltando e o capim.
    Kit.poly(MOUND_FILL, EARTH, { stroke: false }); Kit.line(MOUND, P.line, 6);
    for (const h of HOLES) Kit.ellipse(h, MG(h) - 2, 30, 10, P.line);
    for (const a of crowd(TRAIL, t, 18, 5, { speed: 70, spacing: 340, carryEvery: 1, sizeVar: .1 })) { const sz = 24 * a.size; A().creature(creaturePose(SPECS.ant, { path: TRAIL, s: a.s / sz, size: sz, ground: MG, t, seed: a.seed, carry: { w: 1.1, h: .7 } })); }
    grass(t, x0, x1, SURF, 40, 30, 70, null, [], x => x > 980 && x < 3520);
    Kit.camEnd();
    return q;
  }

  // ---------- c2s01: íris abre na rainha (como fechou em c1s09) e a câmera recua até a cidade inteira ----------
  function c2s01(t, lt) {
    // Zoom em escala logarítmica (recuo de velocidade constante na tela); o centro sai da rainha para o ninho inteiro.
    const k = ease(seg(t, t21 + .3, at('c2s02'))), cam = [lerp(ROY.x + 30, 2120, k ** .7), lerp(ROY.y - 40, 1450, k ** .7), Math.exp(lerp(Math.log(3.2), Math.log(.46), k))];
    const q = city(t, cam, () => 0);
    const [ix, iy] = toScreen(q.head.x, q.head.y, cam);
    Kit.iris(ix, iy, 2300 * ease(seg(lt, .15, 1.9)));
    // "mil novecentas e vinte câmaras": o número entra perto do ninho, no fim da frase.
    const nk = seg(t, rd('c2s01', 1) + 2, rd('c2s01', 1) + 2.4);
    const [tx, ty] = toScreen(2120, 860, cam);
    Kit.text('+1 920 câmaras', tx, ty, 72, P.cream, { k: nk });
  }

  // ---------- c2s02: o fungo enche câmaras; 5 a 8 milhões; a régua de 6 m ----------
  const RULER = rd('c2s02', 1) + 3.6, RX = 3900;
  function c2s02(t, lt, dur) {
    const cam = [2120 + 60 * ease(lt / dur), 1450 + 90 * ease(lt / dur), .46 - .03 * ease(lt / dur)];
    city(t, cam, c => backOut(seg(t, FUNG2 + 2.6 * c.grow, FUNG2 + 2.6 * c.grow + .6)));
    // Régua de profundidade: desce da superfície até o fundo do ninho.
    const rk = ease(seg(t, RULER, RULER + 1.4)), y0 = SURF(RX), y1 = lerp(y0, NEST_BOT, rk);
    Kit.cam(cam[0], cam[1], cam[2], 0, hand(t));
    if (rk > 0) {
      Kit.line([[RX, y0], [RX, y1]], P.line, 26, { smooth: false }); Kit.line([[RX, y0], [RX, y1]], P.cream, 14, { smooth: false });
      for (let i = 0; i <= 6; i++) { const y = lerp(y0, NEST_BOT, i / 6); if (y <= y1) Kit.line([[RX - 40, y], [RX + 40, y]], P.cream, 12, { smooth: false }); }
    }
    Kit.camEnd();
    const lbl = (s, x, y, k) => { const [tx, ty] = toScreen(x, y, cam); Kit.text(s, tx, ty, 72, P.cream, { k }); };
    lbl('248', 2120, 860, Math.min(seg(t, rd('c2s02', 0) + 1.3, rd('c2s02', 0) + 1.7), 1 - seg(t, rd('c2s02', 1) - .3, rd('c2s02', 1))));
    lbl('5 a 8 milhões', 2120, 860, Math.min(seg(t, rd('c2s02', 1) + 1.9, rd('c2s02', 1) + 2.3), 1 - seg(t, RULER + 1.2, RULER + 1.5)));
    lbl('6 m', RX - 230, lerp(SURF(RX), NEST_BOT, .5), seg(t, RULER + 1.2, RULER + 1.6));
  }

  // ---------- a câmara real em close (c2s02b, c2s05) ----------
  // Chão de chamber(x, y, w, h): a cavidade é uma elipse com o fundo em y, então o chão sobe para as pontas.
  const floorOf = (cx, y, w, h) => x => y - h / 2 * (1 - Math.sqrt(Math.max(0, 1 - ((x - cx) / (w / 2)) ** 2)));
  const FLR = 860, QS = 600, QX = 900, flR = floorOf(QX + 150, FLR, 4200, 860);
  const RING_B = loopPath(QX + 120, FLR, 560, 70, 1), RING_C = loopPath(QX + 260, FLR, 380, 50, -1);
  function queenAt(t, sq = 0) {
    return creaturePose(SPECS.queen, { path: line(QX, FLR), s: 1000 / QS, size: QS, ground: () => FLR, t, seed: 3, moving: 0, antennae: 'explore', age: .5, sq: sq + .02 * Math.sin(TAU * t / 3.2) });
  }
  // Operárias (j) que rodeiam a rainha num laço: as de trás antes dela, as da frente depois.
  function ringer(t, ring, j, n, sz, spec, v) {
    const d = frac(v * t / ring.length + j / n) * ring.length, y = ring.at(d).y;
    return { y, pose: creaturePose(spec, { path: ring, s: d / sz, size: sz, ground: () => FLR + .15 * (y - FLR), t, seed: 110 + j + sz, antennae: 'explore' }) };
  }
  function royalRoom(t, cam, extra = () => {}, rings = [[RING_B, 3, 240, SPECS.ant, 60], [RING_C, 2, 130, SPECS.minima, 40]]) {
    const [cx, cy, z] = cam, [x0, x1] = view(cx, z);
    Kit.cam(cx, cy, z, 0, hand(t));
    A().soil(x0, cy - H / z, x1 - x0, 2.2 * H / z + 200, 41);
    A().tunnel(makePath([[2300, -300], [2200, 200], [2150, 500]]), 140);
    A().chamber(QX + 150, FLR, 4200, 860, 7);
    A().fungus(-260, FLR, 600, 330, t, 11);
    A().fungus(2420, FLR, 520, 280, t, 12);
    grains(t, QX - 600, QX + 900, FLR - 760, FLR, 4, 51, 7);
    const ws = rings.flatMap(([r, n, sz, sp, v]) => Array.from({ length: n }, (_, j) => ringer(t, r, j, n, sz, sp, v)));
    for (const w of ws) if (w.y < FLR) A().creature(w.pose);
    const q = queenAt(t, extra.sq || 0);
    A().creature(q, { wings: false, jaws: .25 });
    extra(q);
    for (const w of ws) if (w.y >= FLR) A().creature(w.pose);
    Kit.camEnd();
    return q;
  }

  // ---------- c2s02b: a câmera passa devagar pela rainha, da cabeça ao gáster ----------
  function c2s02b(t, lt, dur) {
    const q0 = queenAt(t), k = ease(seg(lt, .3, dur - .3));
    const cam = [lerp(q0.head.x + 60, q0.spine.at(-1).x - 40, k), lerp(FLR - 190, FLR - 170, k), 1.65 - .1 * k];
    const q = royalRoom(t, cam);
    Kit.vignette(.3);
    const [tx, ty] = toScreen(q.spine[0].x, q.spine[0].y - .5 * QS, cam);
    Kit.text('2,5 cm', tx, ty, 80, P.cream, { k: seg(t, rd('c2s02b', 1) + 2.9, rd('c2s02b', 1) + 3.3) });
  }

  // ---------- c2s03, c2s04: a câmara do jardim de fungo ----------
  const FF = 900, FUNGC = [960, FF, 1300, 560], flG = floorOf(960, FF, 4400, 1000);
  // Topo aproximado da massa de fungo (medido na folha de contato): onde os cachos de gongilídios assentam.
  const dome = x => FF - 1.02 * FUNGC[3] * Math.max(0, 1 - ((x - FUNGC[0]) / (FUNGC[2] / 2)) ** 2) ** .45;
  const KNOBS = [-.93, -.62, -.25, .15, .55].map((u, i) => { const x = FUNGC[0] + u * FUNGC[2] / 2; return [x, dome(x) + 6, i]; });
  // Cacho de pontas inchadas: bolinhas claras de contorno fino, num talo curto (não pode lembrar olhos).
  function knob(x, y, r, i) {
    const c = animationEngine.context, pts = [[0, 0], [-1.1, -.5], [1.1, -.45], [-.5, -1.25], [.6, -1.2], [0, -1.9]];
    Kit.line([[x, y + 1.2 * r], [x, y]], mixCol(P.cream, P.wood, .35), .5 * r);
    c.lineWidth = 3; c.strokeStyle = P.line;
    for (const [dx, dy] of pts) { c.beginPath(); c.arc(x + dx * r * (1 + .1 * hash(i + dx)), y + dy * r, r, 0, TAU); c.fillStyle = mixCol(P.cream, P.gold, .18); c.fill(); c.stroke(); }
  }
  function garden(t, cam, swell) {
    const [cx, cy, z] = cam, [x0, x1] = view(cx, z);
    A().soil(x0, cy - H / z - 100, x1 - x0, 2 * H / z + 300, 61);
    A().tunnel(makePath([[-1500, 100], [-1150, 450], [-850, 700], [-600, FF - 160]]), 130);
    A().tunnel(makePath([[2500, -200], [2300, 200], [2150, 420]]), 110);
    A().chamber(960, FF, 4400, 1000, 9);
    A().fungus(...FUNGC, t, 21);
    // Gongilídios: cachos de pontas inchadas na superfície do fungo; incham quando a narração fala deles.
    for (const [x, y, i] of KNOBS) if (swell(i) > -1) knob(x, y, (9 + 3 * hash(i)) * (1 + .6 * swell(i)) * (1 + .04 * Math.sin(t * 2 + i)), i);
    grains(t, 300, 1700, FF - 860, FF - 300, 4, 71, 7);
  }
  const GS = 300;
  // Jardineira da direita: parada junto ao fungo, toca-o com as antenas e acena de leve.
  function tapperR(t) {
    const p = creaturePose(SPECS.ant, { path: line(1680, FF, -1), s: 1000 / GS, size: GS, ground: flG, t, seed: 130, moving: 0, antennae: 'tap' });
    return nod(p, 0, .01, .12 + .1 * Math.max(0, Math.sin(TAU * t / 1.9)));
  }

  // c2s03: close do fungo; duas tocam com as antenas; uma cruza na frente com a bolinha; a da esquerda colhe uma.
  const t23 = at('c2s03'), PICK = rd('c2s03', 1) + 1.4, TURN = PICK + .9, ALX = 250;
  function pickerL(t) {
    const tapK = t < PICK - .2 ? .1 + .1 * Math.max(0, Math.sin(TAU * t / 1.6)) : 0, dip = anticipate(t, PICK - .2, .1, .25) * (1 - ease(seg(t, PICK + .3, PICK + .7)));
    if (t < TURN) return { p: nod(creaturePose(SPECS.ant, { path: line(ALX, FF), s: 1000 / GS, size: GS, ground: flG, t, seed: 131, moving: 0, antennae: t < PICK ? 'tap' : 'explore' }), .04 * dip, .03 * dip, tapK + .4 * dip), flip: 1 };
    const m = travel(t, [[TURN + .4, 0], [TURN + 4, 3.2]], { start: .5, stop: 0, seed: 133 });
    const p = creaturePose(SPECS.ant, { path: line(ALX + .2 * GS, FF, -1), s: 1000 / GS + m.s, size: GS, ground: flG, t, seed: 131, moving: m.moving, lean: m.lean, antennae: 'explore' });
    return { p, flip: t < TURN + .35 ? -1 + 2 * ease(seg(t, TURN, TURN + .35)) : 1 };
  }
  const CROSS = makePath([[2600, 0], [-900, 0]]);
  function c2s03(t, lt, dur) {
    const cam = kf(t, [[t23, [1000, 560, 1.05]], [rd('c2s03', 1), [860, 600, 1.1]], [rd('c2s03', 1) + 1.2, [560, 640, 1.4]], [t23 + dur, [500, 650, 1.45]]]);
    const swell = i => i === 0 && t > PICK ? -.4 : backOut(seg(t, rd('c2s03', 1) + .4 + .15 * i, rd('c2s03', 1) + .8 + .15 * i));
    Kit.cam(cam[0], cam[1], cam[2], 0, hand(t));
    garden(t, cam, swell);
    A().creature(tapperR(t));
    const { p, flip } = pickerL(t), c = animationEngine.context;
    // Bolinha colhida: sai do cacho da esquerda e vai à boca.
    if (t > PICK) {
      const [mx, my] = mouth(p);
      const [bx, by] = t < PICK + .35 ? arcPt([KNOBS[0][0], KNOBS[0][1]], [mx, my], 40, ease(seg(t, PICK, PICK + .35))) : [mx, my];
      if (flip < 1) { const mid = (p.spine[0].x + p.spine.at(-1).x) / 2, s = Math.sign(flip || 1) * Math.max(.18, Math.abs(flip)); c.save(); c.translate(mid, 0); c.scale(s, 1); c.translate(-mid, 0); A().creature(p); ball(bx, by, 16); c.restore(); }
      else { A().creature(p); ball(bx, by, 16); }
    } else A().creature(p);
    // Uma operária cruza na frente levando a sua bolinha.
    const m = travel(t, [[t23 + 1.5, 2.2], [t23 + 8.4, (2600 - 250) / 340]], { start: .6, stop: .5, seed: 135 });
    const pc = creaturePose(SPECS.ant, { path: CROSS, s: m.s, size: 340, ground: flG, t, seed: 136, moving: m.moving, lean: m.lean });
    A().creature(pc); ball(...mouth(pc), 18);
    Kit.camEnd();
    Kit.vignette(.3);
  }

  // c2s04: uma operária desce pelo túnel com a folha, deposita-a no fungo e lambe a seiva da borda cortada.
  const t24 = at('c2s04'), LS = 300, LEAF_IN = makePath([[-1500, 100], [-1150, 450], [-850, 700], ...[-600, -450, -300, -150, 0, 180].map(x => [x, flG(x)])]);
  const ARRIVE = rd('c2s04', 0) + 2.4, DEP = ARRIVE + .5, SAP = rd('c2s04', 1) + .2;
  const LEAF_REST = { x: 400, y: 690, angle: -1.0 };
  function leafer(t) {
    const m = travel(t, [[t24, 1.2], [ARRIVE, LEAF_IN.length / LS - .1]], { start: .5, stop: .5, seed: 141 });
    const lift = anticipate(t, DEP - .1, .12, .25) * (1 - ease(seg(t, DEP + .5, DEP + 1))), drink = ease(seg(t, SAP, SAP + .6));
    const p = creaturePose(SPECS.ant, { path: LEAF_IN, s: m.s, size: LS, t, seed: 140, moving: m.moving, lean: m.lean, drag: m.drag, carry: t < DEP ? { w: 1.1, h: .7 } : null, antennae: t > SAP ? 'tap' : 'explore', sq: .06 * spring(t, ARRIVE, 6, 14) });
    return nod(p, .03 * drink, .02 * drink - .03 * lift, -.35 * lift + (.2 + .05 * Math.sin(TAU * t * 1.5)) * drink);
  }
  const SIS4 = makePath([[2700, 0], [-900, 0]]);
  function c2s04(t, lt, dur) {
    const cam = kf(t, [[t24, [-380, 480, .95]], [ARRIVE - .6, [260, 660, 1.15]], [SAP, [300, 690, 1.2]], [t24 + dur, [320, 710, 1.4]]]);
    Kit.cam(cam[0], cam[1], cam[2], 0, hand(t));
    garden(t, cam, () => 0);
    A().creature(tapperR(t));
    const p = leafer(t);
    if (t >= DEP) {
      // A folha sai da boca num arco e assenta no flanco do fungo.
      const c0 = leafer(DEP - .01).carry, k = ease(seg(t, DEP, DEP + .5));
      const [lx, ly] = arcPt([c0.x, c0.y], [LEAF_REST.x, LEAF_REST.y], 60, k);
      A().leafPiece(lx, ly, c0.w, c0.h, lerp(c0.angle, LEAF_REST.angle, k), P.leaf);
    }
    A().creature(p);
    // Seiva: uma gota verde-clara na boca, enquanto ela lambe a borda.
    const dk = backOut(seg(t, SAP + .7, SAP + 1.1));
    if (dk > 0) { const [mx, my] = mouth(p, .15); Kit.ellipse(mx, my + 4, 13 * dk, 15 * dk, mixCol(P.leaf, P.cloud, .55), { stroke: true }); }
    // Jardineiras mínimas passando no chão da câmara.
    for (const a of crowd(SIS4, t, 3, 143, { speed: 90, spacing: 1200, sizeVar: .1 })) { const sz = 130 * a.size; A().creature(creaturePose(SPECS.minima, { path: SIS4, s: a.s / sz, size: sz, ground: flG, t, seed: a.seed })); }
    Kit.camEnd();
  }

  // ---------- c2s05: a rainha imóvel põe ovos; um deles, o dela (seed 7); zoom no ovo ----------
  const t25 = at('c2s05'), ER = 13;
  const LAY = [0, 1, 2, 3].map(i => rd('c2s05', 0) + .5 + 1.15 * i), HERO_T = rd('c2s05', 0) + 5.1;
  const PILE = Array.from({ length: 11 }, (_, i) => [QX - 470 - 32 * (i % 5) - 16 * Math.floor(i / 5) + 10 * hash(i + 3), 0]).map(([x], i) => [x, flR(x) - 18 * Math.floor(i / 5)]);
  const HERO_EGG = [QX - 420, flR(QX - 420) + 4];
  function c2s05(t, lt, dur) {
    const z = Math.exp(lerp(Math.log(1.3 + .25 * ease(seg(t, t25, rd('c2s05', 1) - .1))), Math.log(5.2), ease(seg(t, rd('c2s05', 1) - .1, rd('c2s05', 1) + 2.6)))) * (1 + .03 * ease(seg(t, rd('c2s05', 1) + 2.6, t25 + dur)));
    const kz = seg(z, 1.3, 5.2), cam = [lerp(QX - 200, HERO_EGG[0], kz ** .5), lerp(FLR - 230, HERO_EGG[1] - 18, kz ** .5), z];
    const sq = .06 * [...LAY, HERO_T].reduce((v, te) => v + spring(t, te, 7, 16), 0);
    // Jardineira que vem por trás do monte tocar o ovo novo com as antenas (vida no close final).
    const m = travel(t, [[HERO_T + .4, 0], [HERO_T + 2.6, 2.68]], { start: .5, stop: .6, seed: 151 });
    const g = creaturePose(SPECS.minima, { path: makePath([[HERO_EGG[0] - 420, FLR], [HERO_EGG[0] + 600, FLR]]), s: m.s, size: 130, ground: x => flR(x) - 8, t, seed: 152, moving: m.moving, lean: m.lean, antennae: m.moving > .5 ? 'explore' : 'tap' });
    const extra = q => {
      if (t > HERO_T) A().creature(g);
      // Ovos já postos no monte; cada postura faz um ovo novo saltar junto ao gáster.
      PILE.forEach(([x, y], i) => { const te = i < 7 ? -1 : LAY[i - 7]; if (t >= te) A().egg(x, y, ER * (te < 0 ? 1 : backOut(seg(t, te, te + .3))), t, 100 + i); });
      if (t >= HERO_T) A().egg(HERO_EGG[0], HERO_EGG[1], ER * backOut(seg(t, HERO_T, HERO_T + .35)), t, SEED);
    };
    extra.sq = sq;
    royalRoom(t, cam, extra, [[RING_C, 3, 130, SPECS.minima, 40]]);
    Kit.vignette(.3 * ease(seg(z, 1, 3)));
    const [tx, ty] = toScreen(PILE[2][0] + 60, FLR - 330, cam);
    Kit.text('25 000 ovos por dia', tx, ty, 72, P.cream, { k: Math.min(seg(t, rd('c2s05', 0) + 3.4, rd('c2s05', 0) + 3.8), 1 - seg(t, rd('c2s05', 1) - .4, rd('c2s05', 1))) });
  }

  shotsById({ c2s01, c2s02, c2s02b, c2s03, c2s04, c2s05 });
})();
