// Recorte de papel (exp-papel): cada forma é um papel com fibra e grão (textura procedural em cache por cor e tom), borda
// rasgada com miolo branco (cenário) ou cortada à tesoura (bonecos), sombra projetada entre camadas. Bonecos de peças
// rígidas nas juntas da pose, em 2 quadros, com leve tremor de recolocação por desenho. Câmera, mundo e atores vêm de F.
window.ExpStyle = (() => {
  const P = STYLE.palette, c = animationEngine.context, SH = 'rgba(40,24,12,.36)';
  let cam = { cx: 960, cy: 540, z: 1 }, Z = 1, DRAW = 0;
  const at = (f, jx = 0, jy = 0) => { const { cx, cy, z } = cam; c.setTransform(z, 0, 0, z, 960 - lerp(960, cx, f) * z + jx, 540 - cy * z + jy); };
  const span = (f, pad = 120) => { const lx = lerp(960, cam.cx, f), w = (960 + pad) / Z; return [lx - w, lx + w]; };
  const ybot = () => cam.cy + 600 / Z;
  const sid = s => typeof s === 'number' ? s : [...String(s)].reduce((a, ch) => a * 1.31 + ch.charCodeAt(0), 7) % 997;

  // ---------- papel ----------
  // Textura de 256 px por cor e tom (v = 0..2: o mesmo papel um pouco mais claro ou escuro): manchas largas, fibras
  // claras e escuras e grão por pixel, tudo por hash (ladrilha sem costura: cada traço é repetido nos vizinhos).
  const TEX = new Map();
  function paper(col, v) {
    const key = col + v; let p = TEX.get(key);
    if (p) return p;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'), S = sid(col) + v * 17;
    g.fillStyle = v ? mixCol(col, v === 1 ? '#ffffff' : '#000000', .07) : col; g.fillRect(0, 0, 256, 256);
    // Repete o traço em (x, y) de alcance r nos ladrilhos vizinhos que ele invade.
    const tile = (x, y, r, fn) => { for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) if (x + dx + r > 0 && x + dx - r < 256 && y + dy + r > 0 && y + dy - r < 256) fn(dx, dy); };
    for (let i = 0; i < 12; i++) {
      const x = hash(S + i * 7.1) * 256, y = hash(S + i * 3.3 + 1) * 256, r = 40 + 70 * hash(S + i * 9.7), a = (hash(S + i * 5.3) - .5) * .05;  // manchas fracas: fortes viram ladrilho sujo
      tile(x, y, r, (dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, a > 0 ? `rgba(255,250,235,${a})` : `rgba(60,40,20,${-a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r); });
    }
    g.lineCap = 'round';
    for (let i = 0; i < 240; i++) {
      const x = hash(S + i * 1.7) * 256, y = hash(S + i * 2.9 + 3) * 256, a = hash(S + i * 4.1) * TAU, l = 5 + 20 * hash(S + i * 6.7), b = (hash(S + i * 8.3) - .5) * 1.2, lt = hash(S + i * .37) > .35;
      g.strokeStyle = lt ? 'rgba(255,252,240,.22)' : 'rgba(50,30,15,.12)'; g.lineWidth = .5 + .8 * hash(S + i * 3.9);
      tile(x, y, l, (dx, dy) => { g.beginPath(); g.moveTo(x + dx, y + dy); g.quadraticCurveTo(x + dx + l / 2 * Math.cos(a + b), y + dy + l / 2 * Math.sin(a + b), x + dx + l * Math.cos(a), y + dy + l * Math.sin(a)); g.stroke(); });
    }
    const im = g.getImageData(0, 0, 256, 256), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const n = (hash(S + i * .0137) - .5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(im, 0, 0);
    p = c.createPattern(cv, 'repeat'); TEX.set(key, p); return p;
  }
  // Preenche o caminho atual com o papel col (tom pela semente), a textura presa em (ox, oy) do mundo e na escala da tela.
  function fillP(col, seed, ox = 0, oy = 0) {
    const p = paper(col, Math.floor(hash(seed * 1.37 + .5) * 3)), m = c.getTransform(), s = 1 / Math.hypot(m.a, m.b);
    p.setTransform(new DOMMatrix([s, 0, 0, s, ox, oy])); c.fillStyle = p; c.fill();
  }
  const poly = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
  // Sombra projetada em px de tela (o canvas não escala sombras): d = deslocamento, b = desfoque.
  const shadow = (d, b, dy = d * 1.25) => { c.shadowColor = SH; c.shadowOffsetX = d; c.shadowOffsetY = dy; c.shadowBlur = b; };
  const noShadow = () => { c.shadowColor = 'rgba(0,0,0,0)'; c.shadowBlur = 0; };
  let SD = 3, SB = 3;  // sombra das peças do ator atual (px de tela; SB > 0 = macia)
  // Sombra projetada sem desfoque do canvas (caro nesta máquina): o mesmo contorno deslocado em px de tela, duas vezes
  // (perto mais escura, longe mais clara) para a borda macia.
  function drop(pts, dx, dy, soft = true) {
    const m = c.getTransform();
    if (soft) { c.setTransform(m.a, m.b, m.c, m.d, m.e + dx * 1.7, m.f + dy * 1.7); poly(pts); c.fillStyle = 'rgba(40,24,12,.12)'; c.fill(); }
    c.setTransform(m.a, m.b, m.c, m.d, m.e + dx, m.f + dy); poly(pts); c.fillStyle = 'rgba(40,24,12,.22)'; c.fill(); c.setTransform(m);
  }
  // Peça: sombra, miolo branco (rim, opcional, por baixo) e o papel.
  function piece(pts, col, seed, rim) {
    if (SD > 0) drop(rim || pts, SD, SD * 1.25, SB > 0);
    if (rim) { poly(rim); c.fillStyle = P.core; c.fill(); }
    poly(pts); fillP(col, seed, pts[0][0], pts[0][1]);
  }
  // Borda rasgada: pontos a cada st ao longo do polígono, deslocados na normal (para fora > 0) por out + ruído estável.
  function torn(pts, seed, st, amp, out = 0) {
    let a2 = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; a2 += x0 * y1 - x1 * y0; }
    const sg = a2 > 0 ? 1 : -1, res = []; let k = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, m = Math.max(1, Math.round(L / st)), nx = sg * dy / L, ny = -sg * dx / L;
      for (let j = 0; j < m; j++) { const d = out + amp * (2 * hash(seed * 7.31 + k++ * .913) - 1); res.push([x0 + dx * j / m + nx * d, y0 + dy * j / m + ny * d]); }
    }
    return res;
  }
  // Papel rasgado: miolo branco para fora e o papel por dentro, do mesmo contorno.
  const ripped = (pts, col, seed, st, amp) => piece(torn(pts, seed, st, amp * .5), col, seed, torn(pts, seed + 1, st, amp, amp * .9));
  // Mapa local → mundo: gira a e espelha y por fy (vista lateral virada para a esquerda: angle = π − tilt, fy = −1).
  const frame = (ox, oy, a, fy = 1) => { const co = Math.cos(a), si = Math.sin(a); return (x, y) => [ox + x * co - y * fy * si, oy + x * si + y * fy * co]; };
  // Recorte à tesoura: elipse em n facetas, raio e ângulo tortos por semente, em coordenadas locais de fr.
  function blob(fr, x, y, rx, ry, n, seed, a = 0, jit = .07) {
    const pts = [], co = Math.cos(a), si = Math.sin(a);
    for (let i = 0; i < n; i++) {
      const u = TAU * (i + (hash(seed + i * 1.9) - .5) * .35) / n, r = 1 + jit * (2 * hash(seed * 3.7 + i) - 1), px = Math.cos(u) * rx * r, py = Math.sin(u) * ry * r;
      pts.push(fr(x + px * co - py * si, y + px * si + py * co));
    }
    return pts;
  }
  // Tira cortada de a até b (mundo), largura w0 → w1, pontas chanfradas; butt: a ponta b é um corte inclinado para dentro,
  // sem passar de b (junta final: canela no tornozelo, antebraço no pulso, pescoço na base da cabeça).
  function strip(a, b, w0, w1 = w0, butt = false) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, e0 = w0 * .35, e1 = w1 * .35;
    const B = butt ? [[b[0] + nx * w1 / 2, b[1] + ny * w1 / 2], [b[0] - ux * e1 - nx * w1 / 2, b[1] - uy * e1 - ny * w1 / 2]]
      : [[b[0] + nx * w1 / 2, b[1] + ny * w1 / 2], [b[0] + ux * e1 + nx * w1 * .25, b[1] + uy * e1 + ny * w1 * .25], [b[0] + ux * e1 - nx * w1 * .3, b[1] + uy * e1 - ny * w1 * .3], [b[0] - nx * w1 / 2, b[1] - ny * w1 / 2]];
    return [[a[0] - ux * e0 + nx * w0 * .3, a[1] - uy * e0 + ny * w0 * .3], [a[0] + nx * w0 / 2, a[1] + ny * w0 / 2], ...B, [a[0] - nx * w0 / 2, a[1] - ny * w0 / 2], [a[0] - ux * e0 - nx * w0 * .25, a[1] - uy * e0 - ny * w0 * .25]];
  }
  const fr0 = (x, y) => [x, y];

  // ---------- cenário ----------
  // Faixa de papel rasgado da camada f: de prof(x) até o pé da tela; o rasgo é preso ao x do mundo (não ferve).
  function band(f, prof, col, seed, o = {}) {
    at(f); const [x0, x1] = span(f), st = o.st ?? 9, amp = o.amp ?? 3, rim = o.rim ?? 3.5, yb = Math.max(ybot(), (o.min ?? 0)), top = [], white = [];
    for (let x = Math.floor(x0 / st) * st; x <= x1 + st; x += st) {
      const y = prof(x); top.push([x, y + amp * (hash(seed * 3.1 + x * .0173) - .5)]); white.push([x, y - rim + 1.6 * amp * (hash(seed * 5.3 + x * .0219) - .5)]);
    }
    // Só o papel desce até o pé da tela; sombra e miolo branco são fitas junto ao rasgo (preencher a tela toda custa caro).
    const close = pts => [...pts, [pts.at(-1)[0], yb + 50], [pts[0][0], yb + 50]], d = 30 / Z, wp = [...(rim ? white : top), ...top.map(([x, y]) => [x, y + d]).reverse()];
    drop(wp, 0, -2.5); drop(wp, 0, -5);  // sombra da camada sobre a de trás: halo acima do rasgo
    if (rim) { poly(wp); c.fillStyle = P.core; c.fill(); }
    poly(close(top)); fillP(col, seed);
  }
  function sky(F) {
    c.resetTransform(); c.fillStyle = paper(P.sky, 0); paper(P.sky, 0).setTransform(new DOMMatrix()); c.fillRect(0, 0, W, H);
    SD = 2; SB = 8; c.resetTransform();
    const sx = 1560 - (cam.cx - 960) * .03, sy = 170;  // sol de papel quase parado
    ripped(blob(fr0, sx, sy, 78, 78, 22, 51, 0, .03), P.sun, 51, 9, 4);
  }
  function cloud(x, y, s, seed) {
    for (const [u, v, r] of [[-90, 10, 50], [-20, -25, 70], [70, 0, 55], [0, 20, 60]])
      ripped(blob(fr0, x + u * s, y + v * s, r * s * 1.3, r * s * .8, 14, seed * 10 + u), P.cloud, seed * 10 + u, 10 * s, 3.5);
  }
  function clouds(F) {
    const cl = F.world.clouds || { f: .1, list: [[300 + 6 * F.t, 190, .8, 1], [1150 + 4 * F.t, 120, .6, 2], [1900 + 5 * F.t, 240, .7, 3]] };
    at(cl.f); SD = 3; SB = 6;
    for (const [x, y, s, seed] of cl.list) cloud(x, y, s, seed);
  }
  // Tufos de capim do primeiro plano: leque de folhas de papel cortadas, na camada 1, com a base em front(x).
  function tufts(front, seed, hgt = 80) {
    at(1); const [x0, x1] = span(1), st = 140;
    SD = 4; SB = 6;
    for (let x = Math.floor(x0 / st) * st; x <= x1 + st; x += st) {
      const k = hash(seed + x * .013), bx = x + 60 * hash(seed + x * .029), by = front(bx);
      if (k < .35) continue;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * .32 + .2 * (hash(bx + i) - .5), l = hgt * (.6 + .5 * hash(bx * .7 + i)), w = hgt * .12;
        piece([[bx - w / 2 + i * 6, by + 10], [bx + i * 6 + l * Math.cos(a), by + l * Math.sin(a)], [bx + w / 2 + i * 6, by + 10]], i % 2 ? P.grass : P.grassDk, bx + i);
      }
    }
  }
  // Árvore: tronco em tira e copa em três papéis rasgados.
  function tree(x, y, h, seed, col = P.canopy) {
    SD = 4; SB = 8;
    piece(strip([x, y + 10], [x + 6, y - h * .55], h * .09, h * .06), P.trunk, seed);
    for (const [u, v, r] of [[-.18, -.62, .3], [.2, -.66, .28], [0, -.85, .33]]) ripped(blob(fr0, x + u * h, y + v * h, r * h, r * h * .85, 16, seed + u * 10), col, seed + u * 10 + v, h * .04, h * .012);
  }
  // Subsolo do plano aberto: camadas de solo, pedras, raízes, túneis, câmaras com fungo e o monte do ninho.
  function underground(w) {
    const g = w.ground, deep = (y0, a, ph) => x => y0 + a * Math.sin(x * .004 + ph) + 10 * Math.sin(x * .017 + ph);
    band(1, x => Math.max(g(x) + 20, w.soilTop + 4), P.soil, 21, { st: 8, amp: 4 });
    band(1, deep(1150, 40, 1), P.soilDk, 22, { st: 10, amp: 5 });
    band(1, deep(1640, 50, 3), P.soilDp, 23, { st: 10, amp: 5 });
    // Pedras e raízes cortadas presas aos rasgos das faixas (quebram as listras vazias); posição por x da grade.
    at(1); const [x0, x1] = span(1);
    for (let x = Math.floor(x0 / 90) * 90; x <= x1 + 90; x += 90) {
      const h1 = hash(x * .0131), h2 = hash(x * .0277 + 3), soil = Math.max(g(x) + 20, w.soilTop + 4);
      SD = 2; SB = 1;
      if (h1 < .45) { const y = [soil + 30, deep(1150, 40, 1)(x), deep(1640, 50, 3)(x)][Math.floor(h2 * 3)], r = 8 + 18 * h2; ripped(blob(fr0, x + 40 * h1, y + r * .3, r * 1.4, r, 9, x), mixCol(P.stone, P.soilDp, .3 * h1), x, 6, 1.5); }
      else if (h1 > .7) { const a = Math.PI / 2 + (h2 - .5), l = 50 + 90 * h2, b = [x + l * Math.cos(a), soil + l * Math.sin(a)]; piece(strip([x, soil - 4], b, 7, 2), P.trunk, x); piece(strip([x + (b[0] - x) * .5, soil + (b[1] - soil) * .5], [b[0] + 30 * (h1 - .85) * 4, b[1] - 10], 3, 1.5), P.trunk, x + 1); }
    }
    at(1); SD = 2; SB = 4;
    for (let i = 0; i < 22; i++) { const x = -200 + 2700 * hash(i * 3.1), y = 950 + 1050 * hash(i * 5.7), r = 6 + 26 * hash(i * 1.3) ** 2; ripped(blob(fr0, x, y, r * 1.4, r, 9, 300 + i), P.stone, 300 + i, 6, 1.5); }
    if (w.roots) { SD = 2; SB = 4; const { x, y, h } = w.roots; for (let i = 0; i < 4; i++) { const a = Math.PI / 2 + (i - 1.5) * .5, b = [x + h * .45 * Math.cos(a), y + h * .45 * Math.sin(a)]; piece(strip([x, y - 10], b, 16, 3), P.trunk, 70 + i); piece(strip(b, [b[0] + 60 * (i - 1.5), b[1] + 70], 4, 2), P.trunk, 80 + i); } }
    SD = 1.5; SB = 0;
    for (const [i, pts] of (w.tunnels || []).entries()) {  // túnel: tira escura do caminho, largura de ~1,2 formiga
      const L = [], R = [];
      pts.forEach((p, j) => { const q = pts[Math.min(j + 1, pts.length - 1)], o = pts[Math.max(j - 1, 0)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy), n = [-dy / l * 17, dx / l * 17]; L.push([p[0] + n[0], p[1] + n[1]]); R.unshift([p[0] - n[0], p[1] - n[1]]); });
      piece(torn([...L, ...R], 400 + i, 7, 2), P.cave, 400 + i);
    }
    for (const [x, y, cw, ch, seed] of w.chambers || []) {  // câmara: chão reto em y e abóbada acima
      const pts = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + Math.PI * i / 14; pts.push([x + cw / 2 * Math.cos(a), y + 8 + (ch + 8) * Math.sin(a)]); }
      piece(torn(pts, 500 + seed, 9, 3), P.cave, 500 + seed);
    }
    SD = 3; SB = 5;
    for (const [x, y, fw, fh, seed] of w.fungus || []) {  // fungo: montes de papel creme sobrepostos, furos de perfurador
      for (let i = 0; i < 6; i++) { const u = (i / 5 - .5) * fw * .8, r = fw * (.16 + .06 * hash(seed + i)), hh = fh * (.5 + .4 * Math.sin(Math.PI * i / 5)); piece(blob(fr0, x + u, y - hh * .5, r, hh * .55, 12, seed * 20 + i), i % 2 ? P.fungus : P.fungusDk, seed * 20 + i); }
      c.fillStyle = 'rgba(90,70,40,.35)';
      for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(x + (hash(seed + i * 2.1) - .5) * fw * .7, y - fh * (.2 + .5 * hash(seed + i * 3.3)), 3, 0, TAU); c.fill(); }
    }
    if (w.nest) {  // monte de terra solta na entrada do ninho
      const x = w.nest, y = g(x); SD = 3; SB = 6;
      ripped(blob(fr0, x - 20, y + 6, 120, 34, 18, 600), P.soilDk, 600, 8, 3);
      piece(blob(fr0, x, y + 2, 26, 10, 10, 601), P.cave, 601);
    }
  }

  // ---------- seres ----------
  const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // Peças rígidas de cada ser (contrato do verificador, a mesma geometria que o desenho usa), só das juntas da pose: eixo
  // pts, meia largura r e ponta. Ossos que terminam em junta final (canela, antebraço, pescoço, pata) têm corte butt para
  // dentro; pé, mão e cabeça são as peças terminais que cobrem a junta. Cabeça: eixo headBase → headTop, raio = metade.
  // Meia largura dos ossos dos membros por espécie, em BL: [coxa, canela, pé/dedos]; pescoço; sem entrada: formiga e besouro,
  // na espessura de traço w (mínimo em px de tela).
  const LEG = { dog: [.045, .032, .036, .075], bird: [.03, .016, .012, .05], fish: [0, 0, 0, .06], butterfly: [0, 0, 0, .03], fly: [0, 0, 0, .03] };
  const girthK = p => Math.sqrt(((typeof BODY !== 'undefined' && BODY[p.body]) || { girth: .11 }).girth / .11);  // braços e pernas pelo tipo de corpo
  function parts(a, F) {
    const p = a.pose, J = p.joints, S = p.size, out = [], add = (name, from, to, r, cap, pts = [J[from], J[to]]) => out.push({ actor: a.id, name, from, to, pts, r, cap });
    const R = d2(J.headBase, J.headTop) / 2, w = Math.max(S * .035, 1.4 / (F.cam?.z || 1)), lg = LEG[p.spec];
    if (p.spec === 'human') {
      const k = girthK(p) * S;
      for (const s of 'LR') {
        add('thigh' + s, 'hip' + s, 'knee' + s, .035 * k, 'square'); add('shin' + s, 'knee' + s, 'ankle' + s, .032 * k, 'butt');
        add('foot' + s, 'ankle' + s, null, d2(J['ankle' + s], J['toe' + s]) * .25, 'butt', [J['ankle' + s], J['toe' + s]]);
        add('upperArm' + s, 'shoulder' + s, 'elbow' + s, .025 * k, 'square'); add('forearm' + s, 'elbow' + s, 'wrist' + s, .023 * k, 'butt');
        add('hand' + s, 'wrist' + s, null, .034 * k, 'round', [J['wrist' + s], J['hand' + s]]);
      }
      add('neck', 'neck', 'headBase', .022 * k, 'butt');
    } else {
      const [r1, r2, r3] = lg ? lg.map(v => v * S) : [w * .95, w * .7, w * .4];
      for (const n of Object.keys(p.limbs)) {
        add(n + '.upper', n + '.root', n + '.mid', r1, 'square'); add(n + '.lower', n + '.mid', n + '.end', r2, 'butt');
        if (J[n + '.toe']) add(n + '.tip', n + '.end', null, r3, 'butt', [J[n + '.end'], J[n + '.toe']]);
      }
      add('neck', 'neck', 'headBase', lg ? lg[3] * S : w * .7, 'butt');
    }
    add('head', 'headBase', null, p.spec === 'human' ? R : .92 * R, 'round', [J.headBase, J.headTop]);
    return out;
  }
  const partsOf = (a, F) => Object.fromEntries(parts(a, F).map(q => [q.name, q]));
  // Tira de uma peça, de 2r até 2r·k na ponta (corte butt quando a peça pede).
  const cut = (q, k, col, seed) => piece(strip(q.pts[0], q.pts[1], 2 * q.r, 2 * q.r * k, q.cap === 'butt'), col, seed);
  const ANT = { hero: [P.hero, P.heroDk], tunnel: [P.antLt, P.ant], garden: [P.antLt, P.ant] };
  // Folha cortada pela formiga: lente com borda serrilhada de tesoura e nervura clara.
  function leaf(cy, seed) {
    const fr = frame(cy.x, cy.y, cy.angle), pts = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16, x = (u - .5) * cy.w, y = -Math.sin(Math.PI * u) * cy.h / 2 * (i % 2 ? .86 : 1); pts.push(fr(x, y)); }
    for (let i = 15; i > 0; i--) { const u = i / 16, x = (u - .5) * cy.w, y = Math.sin(Math.PI * u) * cy.h / 2 * (i % 2 ? .86 : 1); pts.push(fr(x, y)); }
    piece(pts, P.leaf, seed);
    piece(strip(fr(-cy.w * .45, 0), fr(cy.w * .45, 0), cy.h * .07, cy.h * .03), P.leafDk, seed + 1);
  }
  // Olho de papel colado: branco recortado e pupila preta que olha para (lx, ly) local; blink fecha (pálpebra).
  function eye(fr, x, y, rx, ry, lx, ly, pr, blink, seed) {
    piece(blob(fr, x, y, rx, ry * Math.max(.12, 1 - blink), 12, seed, 0, .04), P.eye, seed);
    if (blink < .7) { const l = Math.hypot(lx, ly) || 1, k = Math.max(0, Math.min(rx, ry) - pr) * .8; piece(blob(fr, x + lx / l * k, y + ly / l * k * (1 - blink), pr, pr * (1 - blink), 9, seed + 1, 0, .04), P.ink, seed + 1); }
  }
  // Colchete de latão na junta de um boneco grande: disco dourado com brilho e furo.
  function pin([x, y], r) {
    const sd = SD; SD = 1; piece(blob(fr0, x, y, r, r, 9, x * .1), '#C9A24A', 3); SD = sd;
    c.fillStyle = 'rgba(255,245,200,.7)'; c.beginPath(); c.arc(x - r * .3, y - r * .3, r * .3, 0, TAU); c.fill();
  }
  function ant(a, F) {
    const p = a.pose, S = p.size, [col, dk] = ANT[a.role] || [P.ant, P.antDk], fy = p.facing, seed = sid(a.id), px = S * Z, w = Math.max(S * .035, 1.4 / Z);
    const Q = partsOf(a, F);
    const legs = far => { for (const [n, l] of Object.entries(p.limbs)) if (l.far === far) { cut(Q[n + '.upper'], .74, far ? dk : col, seed + 3); cut(Q[n + '.lower'], .57, far ? dk : col, seed + 4); if (px > 120) pin(l.mid, w * .45); } };
    legs(true); cut(Q.neck, 1, dk, seed + 2);  // pescoço sob o tórax
    const [g, pe, th] = [p.spine[2], p.spine[1], p.spine[0]], n = px > 60 ? 16 : 10;
    piece(blob(frame(g.x, g.y, g.angle, fy), -g.r * .15, 0, g.r * 1.3, g.r * .95, n, seed + 5), col, seed + 5);
    piece(blob(frame(pe.x, pe.y, pe.angle, fy), 0, 0, pe.r * 1.2, pe.r, 7, seed + 6), dk, seed + 6);
    piece(blob(frame(th.x, th.y, th.angle, fy), 0, -th.r * .1, th.r * 1.45, th.r * .8, n, seed + 7, -.12), col, seed + 7);
    legs(false);
    const hr = Q.head.r / .92, hf = frame(p.head.x, p.head.y, p.head.angle, fy);
    piece([hf(hr * .55, hr * .2), hf(hr * 1.35, hr * .45), hf(hr * 1.05, hr * .72), hf(hr * .5, hr * .6)], dk, seed + 8);  // mandíbula
    piece(blob(hf, 0, 0, hr, hr * .92, n, seed + 9), col, seed + 9);
    if (a.role === 'hero' && px > 30) {  // olho de papel: olha para a forídea quando ela está no quadro
      const fly = F.actors.find(b => b.kind === 'fly' && !b.hidden), co = Math.cos(p.head.angle), si = Math.sin(p.head.angle);
      let lx = 1, ly = 0;
      if (fly) { const dx = fly.pose.head.x - p.head.x, dy = fly.pose.head.y - p.head.y; lx = dx * co + dy * si; ly = (-dx * si + dy * co) * fy; }
      eye(hf, hr * .3, -hr * .22, hr * .34, hr * .38, lx, ly, hr * .15, p.face?.blink || 0, seed + 10);
    } else if (px * .085 * Z > 3) { poly(blob(hf, hr * .4, -hr * .2, hr * .2, hr * .2, 7, seed + 10)); c.fillStyle = P.ink; c.fill(); }
    if (p.carry) leaf(p.carry, seed + 12);
    for (const k of ['antennaR', 'antennaL']) { const ap = p.appendages[k]; if (ap) for (let i = 1; i < ap.length; i++) piece(strip(ap[i - 1], ap[i], w * .8, w * .6), k === 'antennaR' ? dk : col, seed + 13 + i); }
  }
  function fly(a, F) {
    const Q = partsOf(a, F), p = a.pose, S = p.size, fy = p.facing, [th, ab] = p.spine, ff = frame(th.x, th.y, th.angle, fy), ph = p.wings?.phase || 0;
    const wing = (k, col) => {  // asa de papel vegetal presa no dorso do tórax, batendo em torno da raiz
      const an = -2.6 + .8 * Math.sin(TAU * ph + k), co = Math.cos(an), si = Math.sin(an), r0 = [-S * .02, -th.r * .6];
      piece(blob(fr0, S * .3, 0, S * .3, S * .09, 12, 70 + k, 0, .03).map(([x, y]) => ff(r0[0] + x * co - y * si, r0[1] + x * si + y * co)), col, 70 + k);
    };
    c.globalAlpha *= .85; wing(1.2, mixCol(P.wing, P.fly, .25)); c.globalAlpha /= .85;
    piece(blob(frame(ab.x, ab.y, ab.angle, fy), 0, 0, ab.r * 1.5, ab.r, 10, 61), P.fly, 61);
    cut(Q.neck, 1, P.fly, 60);
    piece(blob(ff, 0, 0, th.r * 1.2, th.r * 1.05, 10, 62), P.fly, 62);
    const hr = Q.head.r / .92, hf = frame(p.head.x, p.head.y, p.head.angle, fy);
    piece(blob(hf, 0, 0, hr, hr * .92, 9, 63), P.fly, 63);
    poly(blob(hf, hr * .3, -hr * .2, hr * .38, hr * .38, 8, 64)); c.fillStyle = '#8A2A1E'; c.fill();
    c.globalAlpha *= .85; wing(0, P.wing); c.globalAlpha /= .85;
  }
  // Papéis de cada pessoa (por id): camisa, calça (shorts: canela de pele), pele, cabelo e penteado (short | bun | long |
  // tail | bald), sapato. O explorador de H usa a paleta do estilo.
  const LOOK = {
    human: { shirt: P.shirt, pants: P.pants, skin: P.skin, hair: P.hair, style: 'short', shoe: P.boot },
    corredor: { shirt: '#2E8C8A', pants: '#2F3550', skin: '#C98A5E', hair: '#2A1E18', style: 'short', shoe: '#E8E2D0', shorts: true },
    marta: { shirt: '#8A4C96', pants: '#4A3A5C', skin: '#A86E48', hair: '#2A1E18', style: 'bun', shoe: '#3A2A30' },
    joao: { shirt: '#3D6FA8', pants: '#3A4660', skin: '#E3AE84', hair: '#5A3A22', style: 'short', shoe: '#4A3326' },
    lia: { shirt: '#E9B23A', pants: '#4E7A4A', skin: '#F0C29A', hair: '#9A3E1E', style: 'long', shoe: '#7A3A2A' },
    bia: { shirt: '#E07A8E', pants: '#E07A8E', skin: '#D9A07A', hair: '#3A2418', style: 'tail', shoe: '#C0442E', shorts: true },
    avo: { shirt: '#8C6A48', pants: '#6E6A64', skin: '#E2B08C', hair: '#E8E4DC', style: 'bald', shoe: '#3A2E26' },
  };
  const shade = (col, k = .22) => mixCol(col, '#000000', k);
  // Boca de papel preto: a da fala (pose.face.mouth: m e a o) ou a da expressão (sorriso, o, ponto, traço).
  function mouth(hf, hr, face, seed) {
    const m = face.mouth || { happy: 'smile', surprised: 'o', curious: 'dot' }[face.expression] || 'm';
    if (m === 'smile') piece([hf(hr * .36, hr * .4), hf(hr * .58, hr * .5), hf(hr * .8, hr * .36), hf(hr * .62, hr * .62)], P.ink, seed);
    else if (m === 'm') piece(strip(hf(hr * .46, hr * .5), hf(hr * .76, hr * .46), hr * .06), P.ink, seed);
    else { const [rx, ry] = { e: [.15, .06], a: [.14, .2], o: [.11, .15], dot: [.07, .07] }[m] || [.1, .1]; piece(blob(hf, hr * .62, hr * .52, hr * rx, hr * ry, 9, seed, 0, .04), P.ink, seed); }
  }
  // Pessoa: pernas e braços em tiras (peças de parts), tronco na largura do tipo de corpo, cabeça de raio do esqueleto com
  // cabelo, rosto colado que atua e, no explorador (gear), chapéu e mochila. front = só os braços de a.front (abraço: depois
  // dos dois corpos); sem front, esses braços ficam de fora.
  function human(a, F, front = false) {
    const p = a.pose, S = p.size, fy = p.facing, seed = 900 + sid(a.id), L = p.limbs, J = p.joints, Q = partsOf(a, F), lk = LOOK[a.id] || LOOK.joao, gear = a.gear || [];
    const dk = (l, col) => l.far ? shade(col) : col, skip = new Set(a.front || []);
    // Sapato rígido no osso do pé (tornozelo → dedo, em unidades do pé; y para baixo): cano cobre a ponta da canela, sola no dedo.
    const boot = (q, far) => { const l = d2(...q.pts), bf = frame(q.pts[0][0], q.pts[0][1], Math.atan2(q.pts[1][1] - q.pts[0][1], q.pts[1][0] - q.pts[0][0]), fy);
      piece([[-.22, -.2], [.28, -.24], [.7, -.1], [1.02, -.02], [1, .02], [-.18, .32], [-.26, .2]].map(([x, y]) => bf(x * l, y * l)), far ? shade(lk.shoe, .25) : lk.shoe, seed + 3); };
    // Mão no osso da mão (pulso → ponta), cobrindo a ponta do antebraço: luva (open), punho (fist) ou dedo apontado (point).
    const hand = (q, l) => { const n = d2(...q.pts), hf = frame(q.pts[0][0], q.pts[0][1], Math.atan2(q.pts[1][1] - q.pts[0][1], q.pts[1][0] - q.pts[0][0])), col = dk(l, lk.skin);
      if (l.hand === 'fist') piece(blob(hf, n * .3, 0, n * .45, q.r * .95, 9, seed + 4), col, seed + 4);
      else if (l.hand === 'point') { piece(blob(hf, n * .28, 0, n * .4, q.r, 9, seed + 4), col, seed + 4); piece(strip(hf(n * .4, -q.r * .3), [q.pts[1][0], q.pts[1][1]], q.r * .55, q.r * .4), col, seed + 5); }
      else piece(blob(hf, n * .4, 0, n * .55, q.r, 9, seed + 4), col, seed + 4); };
    const arm = s => { const l = L['arm' + s]; cut(Q['upperArm' + s], .92, dk(l, lk.shirt), seed + 1); cut(Q['forearm' + s], .78, dk(l, lk.skin), seed + 2); hand(Q['hand' + s], l); };
    if (front) { for (const k of a.front || []) arm(k.slice(-1)); return; }
    const leg = s => { const l = L['leg' + s]; cut(Q['thigh' + s], .92, dk(l, lk.pants), seed + 1); cut(Q['shin' + s], .86, dk(l, lk.shorts ? lk.skin : lk.pants), seed + 2); boot(Q['foot' + s], l.far); };
    const g = ((typeof BODY !== 'undefined' && BODY[p.body]) || { girth: .11 }).girth * S, heavy = p.body === 'heavy';
    const pv = J.pelvis, ux = J.neck[0] - pv[0], uy = J.neck[1] - pv[1], U = Math.hypot(ux, uy) || 1, ul = d2(J.chest, pv), tf = frame(pv[0], pv[1], Math.atan2(uy, ux), -fy);  // tronco pelve → base do pescoço: x para cima, y para trás
    const hr = Q.head.r, hx = J.head[0], hy = J.head[1], hf = frame(hx, hy, p.head.angle, fy), face = p.face || {};
    // Cabelo comprido ou rabo de cavalo: tira pela corrente do apêndice hair (balança com a cabeça), atrás de tudo.
    const hair = p.appendages.hair;
    if (hair && (lk.style === 'long' || lk.style === 'tail')) { const wl = hr * (lk.style === 'long' ? .9 : .45); for (let i = 1; i < hair.length; i++) piece(strip(i === 1 ? hf(-hr * .55, -hr * .3) : hair[i - 1], hair[i], wl * (1 - .15 * i), wl * (1 - .15 * (i + 1))), shade(lk.hair, .1), seed + 30 + i); }
    if (gear.includes('backpack')) {  // mochila nas costas, com bolso de jornal
      piece(blob(tf, ul * .9, g + S * .01, S * .15, S * .1, 8, seed + 5, 0, .04), P.pack, seed + 5);
      newsPocket(tf(ul * .82, g + S * .04), Math.atan2(uy, ux) + Math.PI / 2, S * .04, seed + 6);
    }
    for (const s of 'LR') { if (L['leg' + s].far) leg(s); if (L['arm' + s].far && !skip.has('arm' + s)) arm(s); }
    piece(blob(fr0, pv[0], pv[1], g * .9, g * .78, 10, seed + 7), lk.pants, seed + 7);
    for (const s of 'LR') if (!L['leg' + s].far) leg(s);
    // Tronco: costas retas, peito e barriga à frente (a pessoa pesada tem barriga que passa do peito).
    piece([tf(-S * .02, .85 * g), tf(U - S * .05, .92 * g), tf(U - S * .01, .2 * g), tf(U - S * .04, -.9 * g), tf(U * .45, heavy ? -1.15 * g : -.9 * g), tf(-S * .02, -.85 * g)], lk.shirt, seed + 8);
    if (gear.includes('backpack')) piece(strip(tf(ul * .9, .6 * g), tf(-S * .01, -.7 * g), S * .02), P.packDk, seed + 9);  // alça
    cut(Q.neck, 1, shade(lk.skin, .15), seed + 10);  // pescoço: base do pescoço → base da cabeça
    if (lk.style === 'long') piece(blob(hf, -hr * .5, hr * .35, hr * .62, hr * 1.05, 10, seed + 25, .1), shade(lk.hair, .08), seed + 25);  // cabelo solto até os ombros
    if (lk.style !== 'bald') piece(blob(hf, -hr * .35, -hr * .2, hr * .78, hr * .72, 10, seed + 11), lk.hair, seed + 11);
    piece(blob(hf, 0, 0, hr, hr * 1.02, 14, seed + 12, 0, .04), lk.skin, seed + 12);
    if (lk.style === 'bald') piece(blob(hf, -hr * .55, hr * .05, hr * .38, hr * .3, 8, seed + 11), lk.hair, seed + 11);  // cabelo branco só dos lados
    else piece(blob(hf, hr * .05, -hr * .72, hr * .82, hr * .3, 9, seed + 21, -.15), lk.hair, seed + 21);  // franja no alto da testa
    if (lk.style === 'bun') piece(blob(hf, -hr * .8, -hr * .62, hr * .32, hr * .3, 9, seed + 22), lk.hair, seed + 22);
    if (lk.style === 'tail') piece(blob(hf, -hr * .7, -hr * .35, hr * .14, hr * .14, 7, seed + 23), '#F0D040', seed + 23);  // elástico
    piece([hf(hr * .85, -hr * .2), hf(hr * 1.2, hr * .15), hf(hr * .88, hr * .22)], lk.skin, seed + 13);  // nariz
    piece(blob(hf, -hr * .24, hr * .1, hr * .13, hr * .18, 7, seed + 14), shade(lk.skin, .12), seed + 14);  // orelha
    const ex = face.expression, sur = ex === 'surprised', cur = ex === 'curious', hap = ex === 'happy', bl = Math.max(face.blink || 0, hap ? .35 : 0);
    eye(hf, hr * .45, -hr * .12, hr * (sur ? .27 : .21), hr * (sur ? .36 : cur ? .3 : .26), cur ? .5 : 1, cur ? .7 : sur ? -.1 : 0, hr * (sur ? .09 : .12), bl, seed + 15);
    const by = sur ? -.6 : cur ? -.52 : hap ? -.5 : -.42, tilt = cur ? -.18 : hap ? -.06 : 0;
    piece(strip(hf(hr * .26, hr * (by + .04)), hf(hr * .7, hr * (by + tilt)), hr * .09, hr * .07), lk.style === 'bald' ? shade(lk.hair, .3) : lk.hair, seed + 16);  // sobrancelha
    if (lk.style === 'bald') piece(strip(hf(hr * .5, hr * .36), hf(hr * .9, hr * .3), hr * .1, hr * .06), lk.hair, seed + 24);  // bigode do avô
    mouth(hf, hr, face, seed + 17);
    if (gear.includes('hat')) {  // chapéu: aba, copa e fita, presos à cabeça
      piece(blob(hf, hr * .05, -hr * .84, hr * 1.6, hr * .16, 10, seed + 18, -.04), P.hatDk, seed + 18);
      piece([hf(-hr * .78, -hr * .84), hf(-hr * .6, -hr * 1.6), hf(hr * .62, -hr * 1.62), hf(hr * .82, -hr * .86)], P.hat, seed + 19);
      piece([hf(-hr * .74, -hr * .94), hf(-hr * .7, -hr * 1.12), hf(hr * .76, -hr * 1.12), hf(hr * .8, -hr * .96)], P.hatDk, seed + 20);
    }
    for (const s of 'LR') if (!L['arm' + s].far && !skip.has('arm' + s)) arm(s);
    if (p.emote && p.emote.a > 0) emote(p.emote, hx + fy * hr * 1.4, hy - hr * 3.2, hr);
  }
  // Retalho de jornal: papel cinza-claro com linhas de "texto" (traços curtos por hash), girado em a.
  function newsPocket([x, y], a, s, seed) {
    const fr = frame(x, y, a), pts = [fr(-s, -s * .8), fr(s, -s * .85), fr(s * .95, s * .8), fr(-s * .9, s * .85)];
    piece(pts, '#E4E0D4', seed);
    c.fillStyle = 'rgba(40,40,40,.55)';
    for (let r = 0; r < 5; r++) for (let x0 = -s * .85; x0 < s * .8;) { const l = s * (.12 + .3 * hash(seed + r * 9 + x0)); poly([fr(x0, -s * .6 + r * s * .24), fr(Math.min(x0 + l, s * .8), -s * .6 + r * s * .24), fr(Math.min(x0 + l, s * .8), -s * .6 + r * s * .24 + s * .07), fr(x0, -s * .6 + r * s * .24 + s * .07)]); c.fill(); x0 += l + s * .08; }
  }
  // Emote recortado: etiqueta de papel claro com o símbolo em papel vermelho, entra numa mola (k) e sai por a.
  function emote(e, x, y, hr) {
    const r = hr * 1.05 * Math.max(.01, e.k), j = (hash(DRAW * 2.3) - .5) * .1;
    c.globalAlpha *= e.a; SD = 3; SB = 4;
    ripped(blob(fr0, x, y, r, r * 1.1, 14, 950, j), P.label, 950, r * .15, r * .05);
    c.save(); c.translate(x, y); c.rotate(j); c.font = `900 ${r * 1.5}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    shadow(2, 2); c.fillStyle = paper('#C0442E', 0); c.fillText(e.sym, 0, r * .08); noShadow(); c.restore();
    c.globalAlpha /= e.a;
  }
  // Corpo de papel ao longo de uma coluna: pontos pts (frente primeiro), meia largura rs, pontas em facetas de tesoura.
  function hull(pts, rs) {
    const N = pts.length, top = [], bot = [], tan = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    const arc = (i, f, n, s) => [60, 30, 0, -30, -60].map(d => { const t = d * Math.PI / 180, p = pts[i], r = rs[i]; return [p[0] + r * (Math.cos(t) * f[0] + s * Math.sin(t) * n[0]), p[1] + r * (Math.cos(t) * f[1] + s * Math.sin(t) * n[1])]; });
    pts.forEach((p, i) => { const [tx, ty] = tan(i); top.push([p[0] + ty * rs[i], p[1] - tx * rs[i]]); bot.push([p[0] - ty * rs[i], p[1] + tx * rs[i]]); });
    const f0 = tan(0), f1 = tan(N - 1);
    return [...top, ...arc(N - 1, [-f1[0], -f1[1]], [f1[1], -f1[0]], 1), ...bot.reverse(), ...arc(0, f0, [-f0[1], f0[0]], 1)];
  }
  // Quadro da peça q (eixo pts[0] → pts[1]): x ao longo do eixo, y para baixo do lado de quem olha (fy).
  const axis = (q, fy = 1) => frame(q.pts[0][0], q.pts[0][1], Math.atan2(q.pts[1][1] - q.pts[0][1], q.pts[1][0] - q.pts[0][0]), fy);
  // Pata: almofada no osso dos dedos (tornozelo → ponta), cobrindo a ponta da canela.
  const paw = (q, col, seed) => { const l = d2(...q.pts); piece(blob(axis(q), l * .3, 0, l * .7, q.r, 8, seed), col, seed); };

  // Raposa (kind dog): patas escuras, corpo laranja com peito creme, cauda cheia de ponta branca; cabeça no eixo do
  // esqueleto (base do crânio → ponta do focinho = headTop, que toca a água quando ela bebe).
  const FOXC = { body: '#D9692B', leg: '#4A2A1C', cream: '#F4EBDC' };
  function fox(a, F) {
    const p = a.pose, S = p.size, J = p.joints, Q = partsOf(a, F), fy = p.facing, seed = sid(a.id), face = p.face || {};
    const legs = far => { for (const n of Object.keys(p.limbs)) if (p.limbs[n].far === far) { const lc = far ? shade(FOXC.leg, .2) : FOXC.leg; cut(Q[n + '.upper'], .8, far ? shade(FOXC.body, .25) : FOXC.body, seed + 1); cut(Q[n + '.lower'], .85, lc, seed + 2); paw(Q[n + '.tip'], lc, seed + 3); } };
    legs(true);
    const tl = p.appendages.tail;
    if (tl) {  // cauda cheia: a corrente da cauda mais um trecho na direção da ponta, ponta creme
      const e = tl.at(-1), q = tl.at(-2), x = [e[0] + (e[0] - q[0]) * 1.3, e[1] + (e[1] - q[1]) * 1.3], m = [lerp(e[0], x[0], .35), lerp(e[1], x[1], .35)];
      piece(hull([...tl, x], [.035, .065, .08, .085, .03].map(v => v * S)), FOXC.body, seed + 4);
      piece(hull([m, x], [S * .07, S * .03]), FOXC.cream, seed + 5);
    }
    const sp = p.spine.map(q => [q.x, q.y]);
    piece(hull(sp, p.spine.map((q, i) => q.r * (i ? 1 : 1.05))), FOXC.body, seed + 6);
    const s0 = p.spine[0]; piece(blob(frame(s0.x, s0.y, s0.angle, fy), s0.r * .35, s0.r * .45, s0.r * .7, s0.r * .5, 9, seed + 7), FOXC.cream, seed + 7);  // peito
    cut(Q.neck, 1, FOXC.body, seed + 8);
    const D = d2(J.headBase, J.headTop), hf = axis(Q.head, fy), H = pts => pts.map(([x, y]) => hf(x * D, y * D));
    piece(H([[.2, -.3], [.3, -.78], [.45, -.32]]), shade(FOXC.body, .3), seed + 9);  // orelha de trás
    piece(H([[-.05, .12], [0, -.3], [.3, -.42], [.55, -.28], [.8, -.1], [1, 0], [.82, .1], [.5, .24], [.15, .32]]), FOXC.body, seed + 10);
    piece(H([[.45, .02], [.97, .02], [.82, .1], [.5, .24], [.3, .22]]), FOXC.cream, seed + 11);  // focinho
    piece(H([[.06, -.28], [.12, -.8], [.36, -.38]]), FOXC.body, seed + 12); piece(H([[.13, -.32], [.15, -.62], [.28, -.38]]), FOXC.leg, seed + 13);  // orelha
    piece(blob(hf, D * .97, -D * .01, D * .07, D * .06, 7, seed + 14), P.ink, seed + 14);  // nariz
    const sur = face.expression === 'surprised';
    eye(hf, D * .5, -D * .15, D * (sur ? .11 : .09), D * (sur ? .1 : .065), 1, 0, D * .045, face.blink || 0, seed + 15);
    legs(false);
  }
  // Peixe: leque da cauda, nadadeira peitoral, corpo pela coluna e cabeça no círculo do esqueleto; listra rosada.
  function fish(a, F) {
    const p = a.pose, S = p.size, J = p.joints, Q = partsOf(a, F), fy = p.facing, seed = sid(a.id), col = '#6E9C8E', cau = p.appendages.caudal, pec = p.appendages.pectoral;
    if (cau) { const e = cau.at(-1), b = cau[0], dx = e[0] - b[0], dy = e[1] - b[1], l = Math.hypot(dx, dy) || 1, n = [-dy / l * S * .12, dx / l * S * .12]; piece([b, [e[0] + n[0], e[1] + n[1]], [e[0] - dx * .25, e[1] - dy * .25], [e[0] - n[0], e[1] - n[1]]], shade(col, .15), seed + 1); }
    cut(Q.neck, 1, col, seed + 2);
    piece(hull([J.head, ...p.spine.map(q => [q.x, q.y])], [Q.head.r / .92 * .9, ...p.spine.map(q => q.r)]), col, seed + 3);
    piece(strip([p.spine[0].x, p.spine[0].y], [p.spine[3].x, p.spine[3].y], S * .06, S * .02), '#D98A6A', seed + 4);
    const R = Q.head.r / .92, hf = frame(J.head[0], J.head[1], p.head.angle, fy);
    piece(blob(hf, 0, 0, R, R * .95, 10, seed + 5), mixCol(col, '#ffffff', .12), seed + 5);
    piece(strip(hf(-R * .45, -R * .6), hf(-R * .35, R * .6), R * .12, R * .08), shade(col, .3), seed + 6);  // guelra
    eye(hf, R * .3, -R * .25, R * .26, R * .26, 1, 0, R * .13, 0, seed + 7);
    if (pec) for (let i = 1; i < pec.length; i++) piece(strip(pec[i - 1], pec[i], S * .07, S * .02), shade(col, .2), seed + 8);
  }
  // Pássaro: patas finas por baixo do corpo, cauda em leque, corpo marrom com peito laranja, cabeça redonda e bico no
  // rumo do olhar; asa aberta batendo em torno do ombro (voo) ou dobrada no flanco.
  const BIRDC = { back: '#7A5A40', breast: '#E07A3A', beak: '#E8B030', leg: '#8A6A4A' };
  function bird(a, F) {
    const p = a.pose, S = p.size, J = p.joints, Q = partsOf(a, F), fy = p.facing, seed = sid(a.id), wg = p.wings || { phase: 0, open: 0 }, s0 = p.spine[0];
    for (const far of [true, false]) for (const n of Object.keys(p.limbs)) if (p.limbs[n].far === far) { const lc = far ? shade(BIRDC.leg) : BIRDC.leg; cut(Q[n + '.upper'], .8, lc, seed + 1); cut(Q[n + '.lower'], 1, lc, seed + 2); cut(Q[n + '.tip'], .5, lc, seed + 3); }
    const tl = p.appendages.tail;
    if (tl) { const b = tl[0], e = tl.at(-1), dx = e[0] - b[0], dy = e[1] - b[1], l = Math.hypot(dx, dy) || 1, n = [-dy / l * S * .07, dx / l * S * .07]; piece([[b[0] + n[0] * .5, b[1] + n[1] * .5], [e[0] + n[0], e[1] + n[1]], [e[0] - n[0], e[1] - n[1]], [b[0] - n[0] * .5, b[1] - n[1] * .5]], shade(BIRDC.back, .15), seed + 4); }
    const bf = frame(s0.x, s0.y, s0.angle, fy);
    const wing = (k, col, sd) => {  // asa no ombro (x à frente, y para baixo); aberta: bate de cima (θ > 0) a baixo
      const th = wg.open ? .95 * Math.sin(TAU * wg.phase + k) : 0, L = S * (wg.open ? .55 : .32), d = [-Math.cos(th), -Math.sin(th)], nn = [-d[1], d[0]];
      if (!wg.open) { piece(blob(bf, -S * .06, -S * .01, S * .17, S * .075, 9, sd, -.1), col, sd); return; }
      piece([[0, -.05], [.5, -.08], [1, 0], [.85, .06], [.7, .03], [.58, .1], [.44, .06], [.3, .11], [0, .07]].map(([u, v]) => bf(-S * .02 + L * (u * d[0] + v * nn[0]), -s0.r * .5 + L * (u * d[1] + v * nn[1]))), col, sd);
    };
    if (wg.open) wing(.25, shade(BIRDC.back, .3), seed + 5);
    piece(hull(p.spine.map(q => [q.x, q.y]), p.spine.map(q => q.r)), BIRDC.back, seed + 6);
    piece(blob(bf, s0.r * .3, s0.r * .4, s0.r * .75, s0.r * .55, 9, seed + 7), BIRDC.breast, seed + 7);
    cut(Q.neck, 1, BIRDC.back, seed + 8);
    const R = Q.head.r / .92, hf = frame(J.head[0], J.head[1], p.head.angle, fy);
    piece([hf(R * .7, -R * .2), hf(R * 1.75, R * .08), hf(R * .7, R * .3)], BIRDC.beak, seed + 9);
    piece(blob(hf, 0, 0, R, R * .95, 10, seed + 10), BIRDC.back, seed + 10);
    eye(hf, R * .35, -R * .2, R * .24, R * .24, 1, 0, R * .14, p.face?.blink || 0, seed + 11);
    wing(0, mixCol(BIRDC.back, '#000000', .1), seed + 12);
  }
  // Borboleta: asas de papel que se fecham sobre o dorso e abrem (a batida, de lado, encurta a asa: k de 1 a −.6), corpo
  // fino escuro, antenas em tiras.
  function butterfly(a, F) {
    const p = a.pose, S = p.size, J = p.joints, Q = partsOf(a, F), fy = p.facing, seed = sid(a.id), s0 = p.spine[0], ph = p.wings?.phase || 0;
    const bf = frame(s0.x, s0.y, s0.angle, fy), FW = [[.02, 0], [.14, .5], [0, .64], [-.2, .56], [-.12, .2]], HW = [[-.04, 0], [-.08, .36], [-.3, .4], [-.33, .2], [-.16, .02]];
    const wings = (k, f, sd) => {
      piece(HW.map(([x, y]) => bf(x * S, -y * S * k)), shade('#E4782A', f), sd);
      piece(FW.map(([x, y]) => bf(x * S, -y * S * k)), shade('#F09A2A', f), sd + 1);
      piece(blob(bf, -S * .02, -S * .52 * k, S * .09, S * .07 * Math.abs(k) + 1, 8, sd + 2), shade('#3A2A20', f), sd + 2);  // ponta escura
    };
    const k = Math.cos(TAU * ph) * .8 + .2;
    wings(k * .92 + .05, .3, seed + 1);
    cut(Q.neck, 1, '#3A2A20', seed + 4);
    piece(hull(p.spine.map(q => [q.x, q.y]), p.spine.map(q => q.r)), '#3A2A20', seed + 5);
    const R = Q.head.r / .92;
    piece(blob(fr0, J.head[0], J.head[1], R, R, 8, seed + 6), '#3A2A20', seed + 6);
    for (const n of ['antennaL', 'antennaR']) { const ap = p.appendages[n]; if (ap) for (let i = 1; i < ap.length; i++) piece(strip(ap[i - 1], ap[i], S * .02, S * .015), '#3A2A20', seed + 7); }
    wings(k, 0, seed + 8);
  }
  // Besouro: patas em tiras, pronoto e élitros em cúpula verde escura com brilho, cabeça redonda.
  function beetle(a, F) {
    const p = a.pose, S = p.size, Q = partsOf(a, F), J = p.joints, fy = p.facing, seed = sid(a.id), col = '#2F5A46', dk = '#1C3328';
    const legs = far => { for (const n of Object.keys(p.limbs)) if (p.limbs[n].far === far) { cut(Q[n + '.upper'], .74, far ? dk : '#24463A', seed + 1); cut(Q[n + '.lower'], .57, far ? dk : '#24463A', seed + 2); } };
    legs(true); cut(Q.neck, 1, dk, seed + 3);
    const [pr, el] = p.spine;
    piece(blob(frame(el.x, el.y, el.angle, fy), 0, -el.r * .1, el.r * 1.15, el.r * .9, 16, seed + 4), col, seed + 4);
    piece(strip(...[[-.9, -.25], [.6, -.45]].map(([x, y]) => frame(el.x, el.y, el.angle, fy)(x * el.r, y * el.r)), el.r * .12, el.r * .06), 'rgba(220,255,235,.35)', seed + 5);  // brilho
    piece(blob(frame(pr.x, pr.y, pr.angle, fy), 0, 0, pr.r * 1.1, pr.r * .85, 10, seed + 6), dk, seed + 6);
    const R = Q.head.r / .92; piece(blob(frame(J.head[0], J.head[1], p.head.angle, fy), 0, 0, R, R * .9, 9, seed + 7), dk, seed + 7);
    for (const n of ['antennaL', 'antennaR']) { const ap = p.appendages[n]; if (ap) for (let i = 1; i < ap.length; i++) piece(strip(ap[i - 1], ap[i], S * .02, S * .015), dk, seed + 8); }
    legs(false);
  }

  // ---------- adereços (P e N) ----------
  // Flor de papel: caule em tira (para baixo do centro), pétalas recortadas e miolo amarelo; centro em (x, y), raio r.
  function flower(x, y, r, seed, stem = r, col = '#E8506A') {
    piece(strip([x, y], [x + r * .1, y + stem], r * .22, r * .16), P.leafDk, seed);
    if (stem > r * 1.5) piece(blob(fr0, x + r * .45, y + stem * .6, r * .5, r * .2, 7, seed + 1, .5), P.leaf, seed + 1);
    for (let i = 0; i < 5; i++) { const u = TAU * i / 5 + seed; piece(blob(fr0, x + Math.cos(u) * r * .55, y + Math.sin(u) * r * .55, r * .5, r * .4, 7, seed + 2 + i, u), col, seed + 2 + i); }
    piece(blob(fr0, x, y, r * .35, r * .35, 7, seed + 8), P.sun, seed + 8);
  }
  function lamp(l) {
    at(1); SD = 4; SB = 6; const { x, y, h } = l;
    piece(strip([x, y + 8], [x, y - h], 18, 12), '#3A3D44', l.seed);
    piece([[x - 40, y - h + 40], [x - 26, y - h - 30], [x + 26, y - h - 30], [x + 40, y - h + 40]], '#F6E3A0', l.seed + 1);
    piece([[x - 50, y - h - 26], [x, y - h - 70], [x + 50, y - h - 26]], '#3A3D44', l.seed + 2);
  }
  // Chafariz: bacia de pedra, coluna, prato e jatos de gotas de papel caindo em parábola (função de t).
  function fountain(f, t) {
    at(1); SD = 4; SB = 8; const { x, y, r } = f, wy = y - .28 * r;
    piece([[x - r, y + 6], [x - r * .95, wy], [x + r * .95, wy], [x + r, y + 6]], P.stone, 701);
    piece(strip([x, wy], [x, y - .78 * r], r * .14, r * .1), P.stone, 702);
    for (let i = 0; i < 12; i++) {
      const u = frac(t * .7 + i / 12), sd = i % 2 ? 1 : -1, px = x + sd * (.3 * r + .6 * r * u), py = y - .8 * r - .3 * r * u + .82 * r * u * u;
      piece(blob(fr0, px, py, r * .035, r * .05, 6, 710 + i), '#9CC9DE', 710 + i);
    }
    piece(blob(fr0, x, y - .78 * r, r * .38, r * .07, 10, 703), mixCol(P.stone, '#ffffff', .15), 703);
    piece([[x - r * .9, wy + 2], [x - r * .88, wy - 10], [x + r * .88, wy - 10], [x + r * .9, wy + 2]], '#7FB6D0', 704);
    piece(strip([x - r * .98, wy], [x + r * .98, wy], 16), mixCol(P.stone, '#ffffff', .2), 705);
  }
  // Banco de perfil: assento (tábua com o topo em seatY), pés até o chão e encosto do lado back.
  function bench(b, g) {
    at(1); SD = 4; SB = 6; const { x, seatY, w, back, backH } = b, th = w * .12, wood = '#9A6A3E', x0 = x - w / 2, x1 = x + w / 2, xb = x + back * w / 2;
    for (const lx of [x0 + w * .12, x1 - w * .12]) piece(strip([lx, seatY + th], [lx, g + 4], w * .08), shade(wood, .25), 721);
    piece(strip([xb, g + 4], [xb, seatY - backH], w * .09, w * .07), shade(wood, .15), 722);
    for (const k of [.3, .75]) piece(strip([xb, seatY - backH * k - th * .4], [xb + back * -w * .08, seatY - backH * k + th * .4], th * 1.4), wood, 723 + k);
    piece([[x0 - 6, seatY], [x1 + 6, seatY], [x1 + 4, seatY + th], [x0 - 4, seatY + th]], wood, 725);
  }
  // Planta da beira do lago: árvore, flor, capim ou taboa (balança devagar por ruído, sem estado).
  function plant(q, t) {
    at(1); SD = 3; SB = 5; const { x, y, h, seed } = q, sw = .06 * noise1(seed * 3.1, t * .6);
    if (q.kind === 'tree') return tree(x, y, h, seed);
    if (q.kind === 'flower') return flower(x + h * sw, y - h, h * .22, seed, h, ['#E8506A', '#F0D040', '#B06AD0'][seed % 3]);
    const n = q.kind === 'reed' ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * (q.kind === 'reed' ? .12 : .3) + sw, l = h * (.7 + .3 * hash(seed + i)), b = [x + i * 6, y + 8], e = [b[0] + l * Math.cos(a), b[1] + l * Math.sin(a)];
      piece(strip(b, e, h * (q.kind === 'reed' ? .05 : .1), 2), i % 2 ? P.grass : P.grassDk, seed + i);
      if (q.kind === 'reed' && i !== 1) piece(strip([lerp(b[0], e[0], .72), lerp(b[1], e[1], .72)], [lerp(b[0], e[0], .92), lerp(b[1], e[1], .92)], h * .07), '#6E4A2E', seed + 10 + i);
    }
  }
  // Água do lago por cima de tudo o que está entre waterY e o fundo (chão): papel azul translúcido, linha d'água clara rasgada.
  function water(F) {
    const L = F.world.lake, [x0, x1] = span(1), xa = Math.max(L.x0, x0), bed = [];
    if (xa > x1) return;
    for (let x = x1; x > xa; x -= 30) bed.push([x, F.world.ground(x) + 6]);
    at(1); c.globalAlpha = .62; poly([[xa, L.waterY], [x1, L.waterY], ...bed, [xa, Math.max(L.waterY, F.world.ground(xa) + 6)]]); fillP('#5E9EC0', 731, 0, 0); c.globalAlpha = 1;
    SD = 0; piece(torn([[L.x0, L.waterY - 3], [Math.min(L.x1, x1 + 40), L.waterY - 3], [Math.min(L.x1, x1 + 40), L.waterY + 4], [L.x0, L.waterY + 4]], 732, 9, 1.5), '#DDEFF2', 732);
    for (const r of F.world.ripples) {  // onda: elipse fina que cresce e some em 3 s
      const k = clamp((F.t - r.t0) / 3), rr = r.r * (.15 + .85 * ease(k));
      c.strokeStyle = `rgba(240,250,252,${.85 * (1 - k)})`; c.lineWidth = 3; c.beginPath(); c.ellipse(r.x, r.y + 2, rr, rr * .16, 0, 0, TAU); c.stroke();
    }
    for (const s of F.world.splashes) {  // respingo: gotas em parábola e coroa no começo
      const u = F.t - s.t0;
      for (let i = 0; i < 7; i++) { const vx = (i - 3) * s.r * .9, vy = s.r * (2.6 + hash(s.x + i) * 1.2), x = s.x + vx * u, y = s.y - vy * u + 4.5 * s.r * u * u; if (y < s.y + 4) piece(blob(fr0, x, y, s.r * .08, s.r * .11, 6, 740 + i), '#DDEFF2', 740 + i); }
      if (u < .45) { const h = s.r * .9 * Math.sin(Math.PI * u / .45); piece([[s.x - s.r * .6, s.y], [s.x - s.r * .35, s.y - h * .8], [s.x - s.r * .15, s.y - h * .3], [s.x, s.y - h], [s.x + s.r * .15, s.y - h * .3], [s.x + s.r * .35, s.y - h * .8], [s.x + s.r * .6, s.y]], '#DDEFF2', 750); }
    }
  }
  // Atores e adereços na ordem de profundidade (adereço antes do ator de mesma profundidade); depois os braços de cima
  // (a.front) e o que está na mão (flor).
  function stage(F, props) {
    const list = [...props.map((q, i) => ({ d: q.depth, o: i - 1e4, fn: q.fn })), ...F.actors.map((a, i) => ({ d: (a.layer - 1) * 1e5 + (a.depth || 0), o: i, fn: () => actor(a, F) }))];
    list.sort((x, y) => x.d - y.d || x.o - y.o).forEach(q => q.fn());
    for (const a of F.actors) if (a.front && !a.hidden) { place(a); human(a, F, true); c.globalAlpha = 1; }
  }
  // Ator: camada, tremor de recolocação do desenho (px de tela, por ator), alpha e flip em torno do meio do corpo.
  function place(a) {
    const s = sid(a.id), jx = (hash(DRAW * 1.7 + s) - .5) * 2.4, jy = (hash(DRAW * 2.9 + s * 1.3) - .5) * 2.4;
    at(a.layer, jx, jy);
    const p = a.pose, px = p.size * Z;
    if (a.flip) { const m = (p.spine[0].x + p.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
    c.globalAlpha = a.alpha ?? 1; SD = clamp(px * .02, .8, 5); SB = clamp(px * .02, .5, 5);
  }
  const KIND = { ant, fly, human, dog: fox, fish, bird, butterfly, beetle };
  function actor(a, F) {
    if (a.hidden) return;
    place(a); (KIND[a.kind] || human)(a, F);
    c.globalAlpha = 1;
  }

  // ---------- texto ----------
  // Etiqueta de papel pautado (linhas azuis e margem vermelha) com as letras recortadas de papel escuro, cada uma torta.
  function label(s) {
    const k = backOut(s.k), fs = s.size;
    c.resetTransform(); c.font = `700 ${fs}px Georgia, serif`;
    const tw = c.measureText(s.text).width, w = tw + fs * 1.4, h = fs * 1.7;
    c.translate(s.x, s.y - (1 - ease(s.k)) * 60); c.rotate(-.025); c.scale(lerp(.7, 1, k), lerp(.7, 1, k)); c.globalAlpha = clamp(s.k * 3);
    SD = 4; SB = 6; ripped([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], P.label, 970, 10, 3);
    c.fillStyle = P.line; for (let y = -h / 2 + fs * .35; y < h / 2 - 6; y += fs * .32) c.fillRect(-w / 2 + 6, y, w - 12, 1.6);
    c.fillStyle = P.margin; c.fillRect(-w / 2 + fs * .45, -h / 2 + 4, 2, h - 8);
    c.textBaseline = 'middle'; let x = -tw / 2;
    for (const [i, ch] of [...s.text].entries()) {
      const cw = c.measureText(ch).width;
      c.save(); c.translate(x + cw / 2, (hash(i * 3.1) - .5) * fs * .1); c.rotate((hash(i * 7.7) - .5) * .12);
      shadow(2, 2); c.fillStyle = paper(P.ink, i % 3); c.textAlign = 'center'; c.fillText(ch, 0, 0); noShadow(); c.restore();
      x += cw;
    }
    c.globalAlpha = 1; c.resetTransform();
  }

  // ---------- planos ----------
  const farH = x => 610 + 40 * Math.sin(x * .002 + 2) + 14 * Math.sin(x * .007), hillH = x => 770 + 22 * Math.sin(x * .0032 + 1);
  function draw(F) {
    F = EST.frame(F.scene, twosTime(F.t));  // 2 quadros: atores e câmera trocam a cada 2 quadros
    cam = F.cam; Z = cam.z; DRAW = Math.round(F.t * PROJECT.fps / 2);
    const w = F.world, A = F.actors, back = A.filter(a => a.layer < 1), front = A.filter(a => a.layer >= 1);
    sky(F); clouds(F);
    if (F.scene === 'P') {
      band(.3, farH, P.far, 61, { st: 12 });
      band(.6, x => 790 + 10 * Math.sin(x * .004), P.hill, 62);  // sebe
      band(1, x => w.ground(x) - 70, P.grass, 63);  // gramado atrás do calçamento
      band(1, x => w.ground(x) - 6, '#D8CCB2', 64, { amp: 2 });  // calçamento da praça
      const it = w.item, props = [...w.trees.map(q => ({ depth: q.depth, fn: () => { at(1); tree(q.x, q.y, q.h, q.seed); } })), ...w.lamps.map(q => ({ depth: q.depth, fn: () => lamp(q) })),
        { depth: w.fountain.depth, fn: () => fountain(w.fountain, F.t) }, { depth: w.bench.depth, fn: () => bench(w.bench, w.ground(w.bench.x)) }];
      if (!it.held) props.push({ depth: 199, fn: () => { at(1); SD = 2; SB = 2; flower(it.x, it.y, it.r * 1.4, 77, it.r) } });
      stage(F, props);
      if (it.held) { const a = A.find(b => b.id === it.by); place(a); flower(it.x, it.y - it.r * .4, it.r * 1.4, 77, it.r * 2.6); c.globalAlpha = 1; }
    } else if (F.scene === 'N') {
      band(.3, farH, P.far, 71, { st: 12 });
      band(.6, x => 800 + 18 * Math.sin(x * .003 + 1), P.hill, 72);
      band(1, w.ground, P.grass, 73, { st: 8 });
      at(1); SD = 0; const mud = [], x0 = w.lake.x0 - 60; for (let x = x0; x <= 6000; x += 30) mud.push([x, w.ground(x) + 6]);  // lodo do fundo: faixa sob a margem molhada
      piece([...mud, ...mud.map(([x, y]) => [x, y + 50 * clamp((x - x0) / 160)]).reverse()], P.soilDk, 74);
      const nest = w.nest, props = [...w.plants.map(q => ({ depth: q.depth, fn: () => plant(q, F.t) })), { depth: nest.depth, fn: () => { at(1); SD = 3; SB = 6; ripped(blob(fr0, nest.x, nest.y + 4, nest.r * 1.6, nest.r * .45, 16, 760), P.soilDk, 760, 8, 3); piece(blob(fr0, nest.x, nest.y, nest.r * .35, nest.r * .14, 9, 761), P.cave, 761); } }];
      stage(F, props);
      water(F);
    } else if (F.scene === 'H') {
      band(.3, farH, P.far, 31, { st: 12 });
      at(.6); for (let x = -600; x < 2600; x += 330) tree(x + 120 * hash(x), hillH(x) + 20, 220 + 90 * hash(x * .3), x, P.canopyLt);  // claras e frias: o boneco quente fica à frente
      band(.6, hillH, P.hill, 32);
      band(1, x => w.ground(x) - 40, P.grass, 33);
      band(1, x => w.ground(x) - 12, P.path, 34, { amp: 5 });
      back.forEach(a => actor(a, F));
      front.forEach(a => actor(a, F));
      band(1, x => w.antGround(x) + 28, P.grassDk, 35, { amp: 5 });
      tufts(x => w.antGround(x) + 40, 36, 70);
    } else if (F.shot === 'wide') {
      band(w.far.f, w.far.prof, P.far, 41, { st: 12 });
      band(w.hill.f, w.hill.prof, P.hill, 42);
      if (w.tree) { at(1); tree(w.tree.x, w.ground(w.tree.x), w.tree.h, 43); }
      band(1, w.ground, P.grass, 44, { st: 7 });
      tufts(x => w.ground(x) + 12, 45, 26);
      underground(w);
      A.forEach(a => actor(a, F));
    } else {
      band(w.mist.f, w.mist.prof, P.far, 51, { st: 12 });
      band(w.back.f, w.back.ground, P.back, 52);
      back.forEach(a => actor(a, F));
      band(1, w.ground, P.grass, 53, { st: 8 });
      band(1, x => w.ground(x) + 70, P.grassDk, 54, { st: 8, amp: 5 });
      if (w.rock) { at(1); SD = 5; SB = 8; const [x, y, r] = w.rock; ripped(blob(fr0, x, y - r * .4, r * 1.5, r, 14, 55), P.stone, 55, 8, 3); }
      front.forEach(a => actor(a, F));
      tufts(x => w.ground(x) + 74, 57, 40);
      tufts(w.front, 56, 90);
    }
    for (const s of F.texts) if (s.k > 0) label(s);
    c.resetTransform();
  }
  return { draw, parts };
})();
