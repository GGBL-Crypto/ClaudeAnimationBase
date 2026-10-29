// Aquarela de livro ilustrado: fundos parados pintados uma vez em p5.brush (canvas WebGL2 fora da página, como o D do c01)
// e guardados por nome; entram em multiply sobre branco, com máscara do perfil quando precisam cobrir o que está atrás.
// Os seres são pintados por quadro em Canvas2D: aguada, veladura de sombra, luz do papel e borda com mais pigmento, com o
// contorno irregular fixo por ator (hash do id e do índice, nunca do quadro). No fim, o papel (fibra, manchas, grão) em
// multiply por cima de tudo.
window.ExpStyle = (() => {
  const P = STYLE.palette, X = animationEngine.context;
  let c = X, cam = { cx: 960, cy: 540, z: 1 }, A = 1, T = 0;
  const at = f => { const { cx, cy, z } = cam; c.setTransform(z, 0, 0, z, 960 - lerp(960, cx, f) * z, 540 - cy * z); };
  const span = (f, pad = 0) => { const lx = lerp(960, cam.cx, f), w = 960 / cam.z + pad; return [lx - w, lx + w]; };
  const sid = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h; };
  const DK = new Map(), dk = (col, k = .4) => { const key = col + k; let v = DK.get(key); if (!v) DK.set(key, v = mixCol(col, P.ink, k)); return v; };

  // ---------- caches pintados em p5.brush ----------
  // O brush desenha num canvas WebGL2 de 4096×2048 (origem no centro); brushInto copia o retângulo box, pintado a k px por
  // unidade, para o contexto g do cache. Sempre sobre branco opaco: em multiply, o branco não muda nada.
  let BR = null;
  const BW = 4096, BH = 2048, STILL = new Map();
  function brushInto(g, [x, y, w, h], k, fn, seed) {
    if (!BR) {
      BR = brush.createCanvas(BW, BH, { parent: null });
      brush.add('ink', { type: 'default', weight: 5, scatter: .25, sharpness: .8, grain: 40, opacity: 235, spacing: .2, pressure: [1.15, .75], rotate: 'natural', noise: .15 });
    }
    brush.clear('#FFFFFF');
    brush.seed(seed); brush.noiseSeed(7); brush.push(); brush.translate(-BW / 2, -BH / 2); brush.scale(k); brush.translate(-x, -y);
    try { fn(); } finally { brush.pop(); brush.render(); }
    g.drawImage(BR, 0, 0, Math.ceil(w * k), Math.ceil(h * k), x, y, w, h);
  }
  // Camada parada no retângulo box da transformação atual. mask() traça o caminho do que ela cobre: ali o quadro vira
  // branco e a pintura entra em multiply, recortada pelo mesmo caminho (o branco do canvas WebGL não é exato).
  function still(key, [x, y, w, h], k, paint, mask, seed = key) {
    let cv = STILL.get(key);
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
      const g = cv.getContext('2d'); g.scale(k, k); g.translate(-x, -y); brushInto(g, [x, y, w, h], k, paint, seed); STILL.set(key, cv);
    }
    c.save(); if (mask) { c.beginPath(); mask(); c.fillStyle = '#FFFFFF'; c.fill(); c.clip(); }
    c.globalCompositeOperation = 'multiply'; c.drawImage(cv, x, y, w, h); c.restore();
  }
  // Faixa da camada f de x0 a x1, em pedaços de até 3600 px pintados só quando aparecem. Cada pedaço pinta a lista
  // inteira com a mesma semente, então não há emenda. prof = perfil de cima (máscara); a máscara pode crescer (more).
  function band(name, f, x0, x1, y0, y1, k, paint, prof, more) {
    at(f); const [v0, v1] = span(f, 40), cw = 3600 / k;
    for (let i = 0, x = x0; x < x1; i++, x += cw) {
      const w = Math.min(cw, x1 - x); if (x > v1 || x + w < v0) continue;
      still(name + i, [x, y0, w, y1 - y0], k, () => paint(x0, x1, y1), prof && (() => {
        c.moveTo(x, y1); for (let u = x; u <= x + w + 8; u += 8) c.lineTo(u, prof(u) + 3); c.lineTo(x + w, y1); c.closePath();
        if (more) more();
      }), name);
    }
  }
  // Pincéis: aguada chapada, mancha que vaza (borda com pigmento e textura do papel) e nanquim.
  function flat(pts, col) { brush.noStroke(); brush.noFill(); brush.noHatch(); brush.wash(col, 255); brush.polygon(pts); brush.noWash(); }
  function wc(pts, col, op = 170, bleed = .15, tex = .5) { brush.noStroke(); brush.noHatch(); brush.noWash(); brush.fill(col, op); brush.fillBleed(bleed); brush.fillTexture(tex, .35); brush.polygon(pts); }
  function nib(pts, w, col = P.ink) { brush.noFill(); brush.noWash(); brush.noHatch(); brush.set('ink', col, w); brush.spline(pts, .5); }
  // Nanquim quebrado: só os trechos de n pontos cujo hash passa de 1 − keep.
  function nibBroken(pts, w, sd, keep = .55, n = 5, col = P.ink) {
    for (let i = 0; i + 1 < pts.length; i += n) if (hash(sd + i * 1.7) < keep) nib(pts.slice(i, i + n + 1), w, col);
  }
  const ell = (x, y, rx, ry, n = 18, sd = 0) => Array.from({ length: n }, (_, i) => { const a = i * TAU / n, k = .92 + .16 * hash(sd + i); return [x + rx * k * Math.cos(a), y + ry * k * Math.sin(a)]; });
  // Polilinha suavizada (Chaikin) e a fita de largura w em volta dela (túneis, troncos, raízes).
  function chaikin(p, n = 2) {
    for (let k = 0; k < n; k++) p = [p[0], ...p.slice(0, -1).flatMap(([x, y], i) => { const [u, v] = p[i + 1]; return [[.75 * x + .25 * u, .75 * y + .25 * v], [.25 * x + .75 * u, .25 * y + .75 * v]]; }), p.at(-1)];
    return p;
  }
  function ribbon(p, w0, w1 = w0) {
    const L = [], R = [];
    p.forEach(([x, y], i) => {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (p.length - 1)) / 2;
      L.push([x - dy / d * w, y + dx / d * w]); R.push([x + dy / d * w, y - dx / d * w]);
    });
    return [...L, ...R.reverse()];
  }

  // ---------- fundos ----------
  // Céu (tela inteira, sem paralaxe): faixas de aguada do cerúleo ao creme, o papel branco perto do horizonte.
  function paintSky(M = P, op = 140) {
    const band = (y0, y1, sd) => [...Array.from({ length: 13 }, (_, i) => [-60 + i * 170, y0 + 30 * Math.sin(i * 1.3 + sd)]), ...Array.from({ length: 13 }, (_, i) => [W + 60 - i * 170, y1 + 45 * Math.sin(i * .9 + sd)])];
    wc(band(-80, 640, 1), M.skyTop, op, .25, .6);
    wc(band(-80, 300, 2), dk(M.skyTop, .12), op / 2, .3, .6);
    wc(band(700, H + 80, 3), M.skyLow, 120, .25, .5);
  }
  // Terreno de uma camada: base chapada clara, mancha que vaza, veladura mais escura abaixo da crista, manchinhas de
  // granulação e a crista em nanquim leve e quebrado (ink = espessura; 0 no distante).
  // o.dense (cena K): fundo do polígono em pontos a cada 40 px (a borda longa reta vaza em dentes no brush); o.light =
  // quanto de branco na base chapada.
  const terrain = (prof, col, o = {}) => (x0, x1, yb) => {
    const top = []; for (let x = x0 - 40; x <= x1 + 80; x += 30) top.push([x, prof(x)]);
    const floor = o.dense ? Array.from({ length: Math.ceil((x1 - x0 + 120) / 40) + 1 }, (_, i) => [Math.max(x0 - 40, x1 + 80 - 40 * i), yb + 20]) : [[x1 + 80, yb + 20], [x0 - 40, yb + 20]];
    const below = (d, amp = 14) => [...top.map(([x, y]) => [x, y + d + (d ? amp * Math.sin(x * .011 + d) : 0)]), ...floor];
    flat(o.dense ? below(-12, 0) : below(5), mixCol(col, '#FFFFFF', o.light ?? .45));  // dense: a base sobe até a máscara (sem fresta branca na crista)
    wc(below(0), col, 180, .12, .55);
    wc(below(o.glaze ?? 50, 20), dk(col, .2), 80, .2, .6);
    const n = Math.round((x1 - x0) / (o.dots ?? 160));
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, hash(i * 3.1 + 5)), y = prof(x) + 20 + (o.deep ?? 120) * hash(i * 7.3 + 1), r = 6 + 16 * hash(i * 1.9); wc(ell(x, y, 1.6 * r, r, 10, i), dk(col, .3), 55, .1, .4); }
    if (o.ink) nibBroken(top, o.ink, 3, .45, 3, dk(col, .5));
    if (o.extra) o.extra(x0, x1, yb);
  };
  // Capim (por quadro): folha estreita e curva, aguada com um pouco de pigmento na borda, dobrando com o vento.
  function blade(x, y, h, bend, col, rim, a) {
    const tx = x + bend * h, ty = y - h * (1 - .3 * Math.abs(bend)), mx = x + .35 * bend * h, my = y - .55 * h, bw = Math.max(.05 * h, 1.4 / cam.z);
    c.beginPath(); c.moveTo(x - bw, y); c.quadraticCurveTo(mx - .5 * bw, my, tx, ty); c.quadraticCurveTo(mx + .5 * bw, my, x + bw, y); c.closePath();
    c.globalAlpha = a; c.fillStyle = col; c.fill();
    if (rim) { c.globalAlpha = .45 * a; c.strokeStyle = rim; c.lineWidth = Math.max(.8 / cam.z, .12 * bw); c.stroke(); }
  }
  function grass(f, gy, step, h0, h1, col, o = {}) {
    at(f); const [x0, x1] = span(f, h1), sd = o.seed || 0, rim = o.rim === false ? null : dk(col, .35);
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      const x = k * step + step * hash(k * 1.3 + sd); if (x > (o.xmax ?? Infinity)) continue;
      const h = lerp(h0, h1, hash(k * 2.7 + sd)) * (hash(k * .7 + sd) < (o.gap || 0) ? .3 : 1);
      // o.loop = fase do loop (cena K): vento periódico, um balanço por loop.
      const wind = o.loop === undefined ? noise1(sd + 3, T * .6 + x * .002) : Math.sin(TAU * o.loop + x * .004);
      blade(x, gy(x) + (o.dy || 3), h, .5 * (hash(k * 5.1 + sd) - .5) + (o.wind ?? .12) * wind, k & 1 ? col : (o.col2 || col), rim, (o.a ?? .85) * A);
    }
    c.globalAlpha = 1;
  }
  // Nuvem: papel reservado (a máscara abre o céu em branco) com a sombra cinza-azulada só por baixo.
  const CLOUD = [[-80, 10, 50], [-25, -15, 62], [40, -5, 55], [85, 15, 40], [0, 22, 70]];
  // mood (cena K): o corpo ganha uma aguada clara do céu de baixo e a sombra vai para a sombra da rampa.
  function cloud(x, y, s, sd, mood) {
    const M = mood && STYLE.moods[mood];
    c.save(); c.translate(x, y);
    still((M ? `Kcloud|${mood}|` : 'cloud') + sd, [-170 * s, -110 * s, 340 * s, 220 * s], 1, () => {
      if (M) CLOUD.forEach(([dx, dy, r], i) => wc(ell(dx * s, dy * s, r * s, .78 * r * s, 16, sd * 7 + i), mixCol(M.skyLow, '#FFFFFF', .55), 110, .2, .5));
      CLOUD.forEach(([dx, dy, r], i) => wc(ell(dx * s, (dy + 18) * s, .9 * r * s, .5 * r * s, 16, sd * 9 + i), M ? mixCol(M.skyTop, M.shade, .35) : mixCol(P.skyTop, P.far, .5), 90, .25, .5));
    },
      () => { for (const [dx, dy, r] of CLOUD) { c.moveTo(dx * s + r * s, dy * s); c.ellipse(dx * s, dy * s, r * s, .8 * r * s, 0, 0, TAU); } });
    c.restore();
  }

  // ---------- seres (por quadro) ----------
  // Contorno irregular fixo: raio variando por hash da semente do ator e do índice do ponto.
  function oval(x, y, rx, ry, a, sd, n = 14, j = .08) {
    const co = Math.cos(a), si = Math.sin(a);
    return Array.from({ length: n }, (_, i) => { const t = i * TAU / n, k = 1 + j * (hash(sd + i * 3.3) - .5) * 2, u = rx * k * Math.cos(t), v = ry * k * Math.sin(t); return [x + u * co - v * si, y + u * si + v * co]; });
  }
  function trace(p) {
    c.beginPath(); const n = p.length, m = i => [(p[i % n][0] + p[(i + 1) % n][0]) / 2, (p[i % n][1] + p[(i + 1) % n][1]) / 2];
    c.moveTo(...m(0)); for (let i = 1; i <= n; i++) c.quadraticCurveTo(p[i % n][0], p[i % n][1], ...m(i)); c.closePath();
  }
  // Mancha de um ser: aguada, veladura de sombra embaixo (cor sobre cor), luz do papel em cima e a borda escura.
  function blot(p, col, lw, o = {}) {
    trace(p); c.globalAlpha = (o.a ?? .92) * A; c.fillStyle = col; c.fill();
    if (o.shade !== false) {
      const [x0, y0, x1, y1] = box(p), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dy = .22 * (y1 - y0);
      trace(p.map(([x, y]) => [cx + .8 * (x - cx), cy + dy + .7 * (y - cy)])); c.globalAlpha = .3 * A; c.fillStyle = dk(col, .3); c.fill();
      if (o.light !== false) { trace(p.map(([x, y]) => [cx - .1 * (x1 - x0) + .35 * (x - cx), cy - dy + .3 * (y - cy)])); c.globalAlpha = .28 * A; c.fillStyle = P.paper; c.fill(); }
    }
    trace(p); c.globalAlpha = .6 * A; c.strokeStyle = o.rim || dk(col, .4); c.lineWidth = lw; c.lineJoin = 'round'; c.stroke();
    c.globalAlpha = 1;
  }
  const box = p => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
  // Traço de membro: o pigmento escuro por baixo um pouco mais largo, a aguada por cima.
  function limb(pts, w, col, lw, rim = dk(col, .4), cap = 'round') {
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineCap = cap; c.lineJoin = 'round';
    c.globalAlpha = .7 * A; c.strokeStyle = rim; c.lineWidth = w + 2 * lw; c.stroke();
    c.globalAlpha = .95 * A; c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.globalAlpha = 1;
  }
  function taper(pts, ws, col, lw, a = .55) {
    const L = [], R = [];
    pts.forEach(([x, y], i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = ws[i] / 2;
      L.push([x - dy / d * w, y + dx / d * w]); R.push([x + dy / d * w, y - dx / d * w]);
    });
    c.beginPath(); [...L, ...R.reverse()].forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.lineJoin = 'round';
    c.globalAlpha = a * A; c.fillStyle = col; c.fill(); c.globalAlpha = .75 * A; c.strokeStyle = dk(col, .45); c.lineWidth = lw; c.stroke(); c.globalAlpha = 1;
  }
  function line(pts, w, col, a = 1) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineCap = c.lineJoin = 'round'; c.globalAlpha = a * A; c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.globalAlpha = 1; }
  // Quadro local da cabeça: x à frente, y para baixo, girado pela inclinação (sem virar de cabeça para baixo à esquerda).
  function headFrame(p) { c.translate(p.head.x, p.head.y); c.scale(p.facing, 1); c.rotate(p.facing > 0 ? p.head.angle : Math.PI - p.head.angle); }
  // Eixo de uma parte de dois pontos: meio, comprimento e ângulo (cabeça, mão, pé).
  const axis = ({ pts: [A0, B0] }) => ({ m: [(A0[0] + B0[0]) / 2, (A0[1] + B0[1]) / 2], L: Math.hypot(B0[0] - A0[0], B0[1] - A0[1]), a: Math.atan2(B0[1] - A0[1], B0[0] - A0[0]) });
  // Para d antes de B (no eixo A → B): a ponta redonda de raio d termina na junta, sem passar dela.
  const short = (A0, B0, d) => { const k = Math.max(0, 1 - d / (Math.hypot(B0[0] - A0[0], B0[1] - A0[1]) || 1)); return [A0[0] + (B0[0] - A0[0]) * k, A0[1] + (B0[1] - A0[1]) * k]; };
  // Partes desenhadas de um ser (contrato do verificador, scripts/check-motion.mjs): eixo pts em px do mundo, meia largura
  // r já com a borda de pigmento, ponta cap; tudo sai das juntas da pose (pose.joints) e o desenho usa só isto. O flip do
  // ator (só em A) transforma o ser inteiro, juntas e partes juntas.
  // Bichos: [borda lw, meia largura do pescoço, meia largura da cabeça (× raio do eixo), larguras da pata na raiz, no
  // joelho e na ponta, meia largura do pé ou da mão (osso tip)], em BL.
  const LOOK = { ant: [.01, .025, .95, [.045, .03, .012]], fly: [.012, .025, .9], dog: [.008, .055, 1.05, [.07, .05, .035], .028], bird: [.01, .035, .95, [.05, .02, .016], .012],
    beetle: [.01, .035, .9, [.045, .032, .014]], butterfly: [.012, .02, .9], fish: [.008, .05, 1] };
  function parts(a, F) {
    const p = a.pose, J = p.joints, S = p.size, z = F.cam.z, out = [], Rh = Math.hypot(J.headTop[0] - J.headBase[0], J.headTop[1] - J.headBase[1]) / 2;
    const part = (name, from, to, r, cap, pts = [J[from], J[to]], o) => out.push({ actor: a.id, name, from, to, pts, r, cap, ...o });
    if (a.kind === 'human') {
      // Braços e pernas engrossam com o tipo de corpo (raiz da girth em relação à do adulto).
      const lw = Math.max(1.1 / z, .004 * S), g = Math.sqrt((BODY[p.body] || BODY.adult).girth / .11), r = k => k * g * S + lw;
      part('neck', 'neck', 'headBase', .0225 * g * S + lw, 'butt');
      part('head', 'headBase', null, .95 * Rh / 1.05 + lw / 2, 'round', [J.headBase, J.headTop]);
      for (const s of 'LR') {
        part('upperArm' + s, 'shoulder' + s, 'elbow' + s, r(.031), 'round');
        part('forearm' + s, 'elbow' + s, 'wrist' + s, r(.0225), 'round', [J['elbow' + s], short(J['elbow' + s], J['wrist' + s], r(.0225))]);
        part('hand' + s, 'wrist' + s, null, .028 * S + lw / 2, 'round', [J['wrist' + s], J['hand' + s]]);
        part('thigh' + s, 'hip' + s, 'knee' + s, r(.0425), 'round');
        part('shin' + s, 'knee' + s, 'ankle' + s, r(.035), 'round', [J['knee' + s], short(J['knee' + s], J['ankle' + s], r(.035))]);
        part('foot' + s, 'ankle' + s, null, .04 * S + lw / 2, 'round', [J['ankle' + s], J['toe' + s]]);
      }
      return out;
    }
    // Bichos: pescoço (coberto pelo corpo ou pela cabeça), cabeça e cada pata em fita que afina (w = larguras da aguada por
    // ponto; a borda é .8 lw, então o eixo para .4 lw antes da ponta) e, se o membro tem pé, o pé da ponta ao dedo.
    const [lk, nk, hk, legs, tk] = LOOK[a.kind] || LOOK.ant, lw = Math.max(1 / z, lk * S), legW = k => Math.max(1.1 / z, k * S);
    part('neck', 'neck', 'headBase', nk * S + .5 * lw, 'butt');
    part('head', 'headBase', null, hk * Rh + lw / 2, 'round', [J.headBase, J.headTop]);
    if (legs) for (const n of Object.keys(p.limbs)) {
      const j = k => J[`${n}.${k}`], w = legs.map(legW);
      part(n + '.upper', n + '.root', n + '.mid', w[0] / 2 + .4 * lw, 'butt', undefined, { w: w.slice(0, 2) });
      part(n + '.lower', n + '.mid', n + '.end', w[1] / 2 + .4 * lw, 'butt', [j('mid'), short(j('mid'), j('end'), .4 * lw)], { w: w.slice(1) });
      if (j('toe')) part(n + '.tip', n + '.end', null, tk * S + lw / 2, 'round', [j('end'), j('toe')]);
    }
    return out;
  }

  function ant(a, Q) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, hero = a.role === 'hero', px = S * cam.z, q = n => Q.find(x => x.name === n);
    const col = hero ? P.hero : a.role === 'back' ? mixCol(P.ant, P.far, .4) : a.role === 'tunnel' || a.role === 'garden' ? mixCol(P.ant, P.soil, .15) : P.ant;
    const lw = Math.max(1 / cam.z, .01 * S), farAnt = f > 0 ? 'antennaR' : 'antennaL';
    // Pata: fita que afina da raiz à ponta em dois segmentos, aguada transparente com a borda acumulando pigmento.
    const legs = far => { for (const [n, l] of Object.entries(p.limbs)) if (l.far === far) { const u = q(n + '.upper'), v = q(n + '.lower'); taper([...u.pts, v.pts[1]], [...u.w, v.w[1]], far ? dk(col, .4) : dk(col, .15), lw * .8); } };
    const antenna = n => p.appendages[n] && line(p.appendages[n], Math.max(1 / cam.z, .016 * S), dk(col, n === farAnt ? .45 : .25));
    legs(true); legs(false); antenna(farAnt);
    if (p.carry) leaf(p.carry, sd, a.role === 'back' ? mixCol(P.leaf, P.far, .4) : P.leaf, lw);
    const [th, pt, gs] = p.spine, nk = q('neck');
    blot(oval(gs.x, gs.y, 1.2 * gs.r, .95 * gs.r, gs.angle, sd), col, lw, { light: px > 25 });
    blot(oval(pt.x, pt.y, 1.4 * pt.r, .8 * pt.r, pt.angle, sd + 20, 10), col, lw, { shade: false });
    limb(nk.pts, 2 * (nk.r - .5 * lw), dk(col, .3), .5 * lw, undefined, nk.cap);
    blot(oval(th.x, th.y, 1.5 * th.r, .85 * th.r, th.angle, sd + 40), col, lw, { light: px > 25 });
    const R = SPECS.ant.head.r * S, hq = q('head'), h = axis(hq);
    if (px > 150) for (const u of [-.6, -.05]) line([[th.x + f * u * th.r, th.y - .7 * th.r], [th.x + f * (u - .35) * th.r, th.y - 1.25 * th.r]], .18 * th.r, dk(col, .3));  // espinhos do tórax
    c.save(); headFrame(p); limb([[.75 * R, .3 * R], [1.25 * R, .55 * R], [1.05 * R, .7 * R]], .12 * R, dk(col, .5), lw * .5); c.restore();  // mandíbula
    blot(oval(h.m[0], h.m[1], h.L / 2, hq.r - lw / 2, h.a, sd + 60), col, lw, { light: px > 25 });
    c.save(); headFrame(p);
    trace(oval(.4 * R, -.14 * R, .42 * R, .36 * R, -.2, sd + 80, 9)); c.globalAlpha = .95 * A; c.fillStyle = mixCol(P.ink, col, .15); c.fill();
    c.globalAlpha = .8 * A; c.strokeStyle = P.ink; c.lineWidth = Math.max(lw, .05 * R); c.stroke();
    if (px > 30) { c.beginPath(); c.arc(.28 * R, -.26 * R, .12 * R, 0, TAU); c.globalAlpha = .9 * A; c.fillStyle = P.paper; c.fill(); }
    if (px > 300) {  // nanquim leve na nuca e na fronte (só de perto)
      c.globalAlpha = .55 * A; c.strokeStyle = P.ink; c.lineWidth = 1.6 / cam.z; c.beginPath(); c.arc(0, 0, 1.02 * R, 3.6, 4.6); c.stroke(); c.beginPath(); c.arc(0, 0, 1.02 * R, 5.2, 5.8); c.stroke();
    }
    c.restore(); c.globalAlpha = 1;
    antenna(f > 0 ? 'antennaL' : 'antennaR');
  }
  // Pedaço de folha cortado em meia-lua: aguada verde, nervura e a borda mais escura.
  function leaf({ x, y, w, h, angle }, sd, col, lw) {
    c.save(); c.translate(x, y); c.rotate(angle);
    const p = Array.from({ length: 16 }, (_, i) => { const t = i * TAU / 16, k = 1 + .1 * (hash(sd + i * 5.7) - .5); return [w / 2 * k * Math.cos(t), h / 2 * k * Math.sin(t) * (Math.sin(t) > 0 ? .8 : 1.1)]; });
    blot(p, col, lw, { a: .85 }); line([[-.45 * w, .05 * h], [.42 * w, -.05 * h]], Math.max(lw * .8, .02 * h), dk(col, .3), .7);
    c.restore();
  }
  function fly(a, Q) {
    const p = a.pose, S = p.size, sd = sid(a.id), lw = Math.max(1 / cam.z, .012 * S), [th, ab] = p.spine, R = SPECS.fly.head.r * S, [nk, hq] = Q, h = axis(hq);
    const wing = (far) => {
      const w = p.wings || { phase: 0, open: 0 }, ang = -.5 - 1.1 * w.open * (.5 + .5 * Math.sin(w.phase * TAU)) + (far ? .25 : 0), L = .62 * S;
      c.save(); c.translate(th.x - p.facing * .05 * S, th.y - .6 * th.r); c.scale(-p.facing, 1); c.rotate(ang);
      blot(oval(L / 2, 0, L / 2, .2 * S, 0, sd + (far ? 7 : 9), 12), P.wing, 1.6 * lw, { a: far ? .45 : .6, shade: false, rim: dk(P.wing, .55) });
      line([[0, 0], [.85 * L, -.03 * S]], lw, dk(P.wing, .5), .6); c.restore();
    };
    wing(true);
    blot(oval(ab.x, ab.y, 1.25 * ab.r, .9 * ab.r, ab.angle, sd), P.fly, lw);
    limb(nk.pts, 2 * (nk.r - .5 * lw), dk(P.fly, .3), .5 * lw, undefined, nk.cap);
    blot(oval(th.x, th.y, 1.1 * th.r, 1.05 * th.r, th.angle, sd + 20), P.fly, lw);
    blot(oval(h.m[0], h.m[1], h.L / 2, hq.r - lw / 2, h.a, sd + 40), mixCol(P.fly, P.soil, .3), lw, { shade: false });
    c.save(); headFrame(p); c.beginPath(); c.arc(.3 * R, -.15 * R, .35 * R, 0, TAU); c.globalAlpha = .9 * A; c.fillStyle = '#7A2E22'; c.fill(); c.restore(); c.globalAlpha = 1;
    wing(false);
  }

  // Pessoa de perfil; 1 BL = altura. Roupa e cabelo por id (WEAR): camisa, calça, sapato, pele, cabelo e penteado (short |
  // bun | tail | pigtails | bald); shorts = bermuda (canela de pele), dress = vestido (saia por cima das coxas). Chapéu e
  // mochila só com actor.gear. O tronco alarga com a girth do tipo de corpo. O rosto atua (expressão, piscada, boca da fala).
  const WEAR = {
    human: { shirt: P.shirt, pants: P.pants, shoe: P.boot, skin: P.skin, hair: P.hair, style: 'short' },
    corredor: { shirt: '#5D8DAF', pants: '#3E4C5E', shoe: '#E6DFD0', skin: '#C08A64', hair: '#2B211C', style: 'short', shorts: true, band: '#C8462E' },
    marta: { shirt: '#B9566C', pants: '#4D5876', shoe: '#5A3A2E', skin: '#9C6B4E', hair: '#2E211B', style: 'bun' },
    joao: { shirt: '#7E9F68', pants: '#5E4B3A', shoe: '#3E2E26', skin: '#EDB48E', hair: '#4A3426', style: 'short' },
    lia: { shirt: '#E2B54E', pants: '#5B6D8C', shoe: '#7A4A30', skin: '#F0C6A4', hair: '#8E4A28', style: 'tail' },
    bia: { shirt: '#D8735C', pants: '#D8735C', shoe: '#B8402E', skin: '#D39A72', hair: '#3E2A1E', style: 'pigtails', dress: true },
    avo: { shirt: '#8D7C69', pants: '#4C4B48', shoe: '#3A2E28', skin: '#E8B490', hair: '#E9E4DA', style: 'bald' },
  };
  // Bota no eixo tornozelo → dedo: (fração do pé, fração da meia largura para o lado do chão); o calcanhar desce até o chão.
  const BOOT = [[-.12, -.9], [.35, -.75], [.85, -.35], [1, .15], [.9, .85], [.3, 1], [-.15, 1], [-.2, .1]];
  // Membros que passam por cima de outro ser (actor.front, abraço): pintados depois de todos os atores da camada.
  let LATE = [];
  function human(a, Q) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, J = p.joints, [ch, pe] = p.spine, L = p.limbs, lw = Math.max(1.1 / cam.z, .004 * S), q = n => Q.find(x => x.name === n);
    const Wr = { ...(WEAR[a.id] || WEAR.human), ...a.colors }, gear = a.gear || [], gk = (BODY[p.body] || BODY.adult).girth / .11, ta = Math.atan2(ch.y - pe.y, ch.x - pe.x), front = a.front || [];
    const bone = (n, col) => { const x = q(n); limb(x.pts, 2 * (x.r - lw), col, lw, undefined, x.cap); };
    // Membro de uma peça só: primeiro as bordas de todos os ossos, depois as aguadas opacas por cima (sem discos nem emendas
    // nas juntas); a borda some num disco em volta da raiz (ombro, quadril), onde o membro sai do tronco.
    const stroke = (pts, w, col, cap, al) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineCap = cap; c.lineJoin = 'round'; c.globalAlpha = al * A; c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.globalAlpha = 1; };
    const chain = (list, root) => {
      const xs = list.map(([n, col]) => [q(n), col]), r0 = xs[0][0].r + lw;
      c.save(); c.beginPath(); c.rect(-1e5, -1e5, 2e5, 2e5); c.moveTo(root[0] + r0, root[1]); c.arc(root[0], root[1], r0, 0, TAU); c.clip('evenodd');
      for (const [x, col] of xs) stroke(x.pts, 2 * x.r, dk(col, .4), x.cap, .75);
      c.restore();
      for (const [x, col] of xs) stroke(x.pts, 2 * (x.r - lw), col, x.cap, 1);
    };
    const leg = (s, far) => {
      const k = far ? .3 : 0, cl = dk(Wr.dress ? Wr.skin : Wr.pants, k), ft = q('foot' + s), [A0] = ft.pts, h = axis(ft), w = ft.r - lw / 2, u = [Math.cos(h.a), Math.sin(h.a)], n = [-f * u[1], f * u[0]];
      chain([['thigh' + s, cl], ['shin' + s, Wr.shorts ? dk(Wr.skin, k) : cl]], J['hip' + s]);
      blot(BOOT.map(([b, m]) => [A0[0] + u[0] * b * h.L + n[0] * m * w, A0[1] + u[1] * b * h.L + n[1] * m * w]), dk(Wr.shoe, k), lw);
    };
    const arm = (s, far) => {
      const hd = q('hand' + s), h = axis(hd), sk = dk(Wr.skin, far ? .25 : 0);
      chain([['upperArm' + s, dk(Wr.shirt, far ? .3 : 0)], ['forearm' + s, sk]], J['shoulder' + s]);
      blot(oval(h.m[0], h.m[1], h.L / 2, hd.r - lw / 2, h.a, sd + (far ? 11 : 13), 9), sk, lw, { shade: false });
    };
    const armOrLate = (s, far) => { if (!front.includes('arm' + s)) return arm(s, far); const la = a.layer, al = A; LATE.push(() => { at(la); A = al; arm(s, far); A = 1; }); };
    const fl = Object.entries(L).filter(([, l]) => l.far), nr = Object.entries(L).filter(([, l]) => !l.far);
    for (const [n] of fl) n.startsWith('leg') ? leg(n.slice(-1), true) : armOrLate(n.slice(-1), true);
    // Eixo do tronco: pelve → base do pescoço (1,2 d); tq(al px ao longo, ac BL à frente). Mochila, camisa, cinto e alça vão nele.
    const d = Math.hypot(J.neck[0] - pe.x, J.neck[1] - pe.y) / 1.2, dc = Math.hypot(ch.x - pe.x, ch.y - pe.y);
    const ux = (J.neck[0] - pe.x) / (1.2 * d || 1), uy = (J.neck[1] - pe.y) / (1.2 * d || 1), tq = (al, ac) => [pe.x + ux * al - uy * ac * f * S, pe.y + uy * al + ux * ac * f * S];
    if (gear.includes('backpack')) {  // mochila nas costas, com o saco de dormir enrolado em cima
      const [bx, by] = tq(dc - .02 * S, -.14);
      blot(oval(bx, by, .085 * S, .14 * S, ta + Math.PI / 2, sd + 21), P.pack, lw);
      blot(oval(...tq(dc + .13 * S, -.145), .07 * S, .035 * S, ta + Math.PI / 2, sd + 23, 10), mixCol(P.pants, P.paper, .3), lw);
      line([tq(dc, -.16), tq(dc, -.09)], .012 * S, dk(P.pack, .4), .8);
    }
    // Rabo de cavalo: fita pelo apêndice hair (balança com a cabeça), atrás da cabeça e do tronco.
    if (Wr.style === 'tail' && p.appendages.hair) blot(ribbon(chaikin([[p.head.x, p.head.y], ...p.appendages.hair]), .1 * S, .025 * S), Wr.hair, lw, { shade: false });
    for (const [n] of nr) if (n.startsWith('leg')) leg(n.slice(-1), false);
    // Camisa: do quadril (estreito) ao peito e ombros (mais largos), na largura do tipo de corpo; cobre a base do pescoço.
    blot([[-.03, .085], [.45, .088], [1, .1], [1.12, .075], [1.22, .02], [1.2, -.06], [1.05, -.1], [.45, -.092], [-.03, -.088]].map(([al, ac]) => tq(al * d, ac * gk)), Wr.shirt, lw, { a: 1 });
    if (Wr.dress) blot([[.25, .095], [.12, .14], [-.32, .2], [-.36, 0], [-.32, -.17], [.12, -.12], [.25, -.095]].map(([al, ac]) => tq(al * d, ac * gk)), dk(Wr.shirt, .06), lw, { a: 1 });  // saia
    else {
      line([tq(.035 * S, -.09 * gk), tq(.035 * S, .09 * gk)], .015 * S, P.band, .8);  // cinto
    }
    if (gear.includes('backpack')) line([tq(dc + .1 * S, .02), tq(dc - .1 * S, .055)], .016 * S, dk(P.pack, .3), .9);  // alça
    // Cabeça no eixo base → topo (o rosto em y < 0); o eixo inteiro mede 2,1 R.
    bone('neck', dk(Wr.skin, .1));
    const h = axis(q('head'));
    c.save(); c.translate(...h.m); c.rotate(h.a + Math.PI / 2); c.scale(f, 1); head(p, h.L / 2.1, sd, lw, Wr, gear); c.restore();
    for (const [n] of nr) if (!n.startsWith('leg')) armOrLate(n.slice(-1), false);
    if (a.holds === 'book') {  // livro aberto entre as mãos (cena K): capa vermelha e as páginas do papel
      const bx = (J.handL[0] + J.handR[0]) / 2, by = (J.handL[1] + J.handR[1]) / 2, s = .07 * S;
      blot([[bx - 1.1 * s, by - .2 * s], [bx, by + .1 * s], [bx + 1.1 * s, by - .2 * s], [bx + 1.1 * s, by + .45 * s], [bx, by + .7 * s], [bx - 1.1 * s, by + .45 * s]], '#8A3A2A', lw, { shade: false });
      blot([[bx - .95 * s, by - .3 * s], [bx, by], [bx + .95 * s, by - .3 * s], [bx + .95 * s, by + .3 * s], [bx, by + .55 * s], [bx - .95 * s, by + .3 * s]], P.paper, lw, { shade: false, rim: dk(P.paper, .35) });
    }
    if (p.emote) emote(p, S);
  }
  // Cabelo no quadro da cabeça (R): calota de trás e do alto e o penteado; o careca só tem a franja de trás.
  const CAP = [[.55, -.72], [.3, -1.06], [-.3, -1.1], [-.82, -.78], [-1.02, -.2], [-.96, .3], [-.6, .38], [-.42, -.05], [-.05, -.55], [.32, -.58]];
  // Gear da cabeça: hat (chapéu), hood (capuz na cor da camisa, aberto no rosto), helmet (calota de metal).
  function head(p, R, sd, lw, Wr, gear) {
    const hat = gear.includes('hat'), hood = gear.includes('hood'), helm = gear.includes('helmet');
    const F = p.face || {}, ex = F.expression || 'neutral', shut = (F.blink || 0) > .5, sk = Wr.skin, hr = Wr.hair, st = Wr.style;
    const pts = a => a.map(([u, v]) => [u * R, v * R]);
    // Queixo e garganta por baixo do rosto: cobrem o topo do pescoço (que para na base da cabeça), mesmo com a cabeça inclinada.
    blot(oval(0, .9 * R, .55 * R, .45 * R, 0, sd + 49, 10, .04), sk, lw, { shade: false });
    if (hood) blot(oval(-.22 * R, -.12 * R, 1.22 * R, 1.3 * R, 0, sd + 41, 14), dk(Wr.shirt, .12), lw);  // capuz por trás da cabeça
    else if (hat || helm || st === 'bald') blot(oval(-.55 * R, -.1 * R, .48 * R, .48 * R, 0, sd + 51, 10), hr, lw, { shade: false });
    if (st === 'bun' && !hood) blot(oval(-.88 * R, -.78 * R, .36 * R, .34 * R, 0, sd + 47, 10), hr, lw);
    if (st === 'pigtails' && !hood) for (const v of [-.35, .3]) blot(oval(-1.05 * R, v * R, .26 * R, .32 * R, .3, sd + 45 + v, 9), hr, lw, { shade: false });
    blot(oval(0, 0, .95 * R, 1.05 * R, 0, sd + 53), sk, lw);
    blot(oval(.97 * R, .12 * R, .2 * R, .17 * R, 0, sd + 55, 9), sk, lw, { shade: false });  // nariz
    if (!hood) blot(oval(-.15 * R, .1 * R, .17 * R, .23 * R, 0, sd + 57, 9), dk(sk, .12), lw, { shade: false });  // orelha
    trace(oval(.4 * R, .38 * R, .2 * R, .13 * R, 0, sd + 59, 9)); c.globalAlpha = (ex === 'happy' ? .42 : .25) * A; c.fillStyle = P.red; c.fill(); c.globalAlpha = 1;  // bochecha
    // Olho, sobrancelha e boca por expressão, em nanquim sépia (olho grande o bastante para atuar).
    const eye = [.45 * R, .02 * R], ink = P.ink, stroke = (w, a = .9) => { c.globalAlpha = a * A; c.strokeStyle = ink; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); };
    if (shut) { c.beginPath(); c.arc(eye[0], eye[1] - .1 * R, .2 * R, .35, Math.PI - .35); stroke(.08 * R); }
    else if (ex === 'surprised') {
      trace(oval(eye[0], eye[1] - .04 * R, .27 * R, .36 * R, 0, sd + 61, 10)); c.globalAlpha = A; c.fillStyle = '#FFFDF6'; c.fill(); stroke(.06 * R);
      c.beginPath(); c.arc(eye[0] + .06 * R, eye[1], .11 * R, 0, TAU); c.globalAlpha = A; c.fillStyle = ink; c.fill();
    } else {
      const k = ex === 'curious' ? 1.2 : 1; trace(oval(eye[0], eye[1], .17 * R * k, .24 * R * k, 0, sd + 61, 8)); c.globalAlpha = A; c.fillStyle = ink; c.fill();
      c.beginPath(); c.arc(eye[0] - .04 * R, eye[1] - .08 * R, .06 * R * k, 0, TAU); c.fillStyle = '#FFFDF6'; c.fill();
      if (ex === 'happy') { c.beginPath(); c.arc(eye[0], eye[1] + .36 * R, .24 * R, -2.3, -.84); c.globalAlpha = A; c.strokeStyle = sk; c.lineWidth = .14 * R; c.stroke(); }  // pálpebra de baixo sobe: olho sorri
    }
    const brow = { neutral: [[.24, -.24], [.45, -.28], [.66, -.24]], happy: [[.24, -.27], [.45, -.33], [.66, -.27]], curious: [[.22, -.3], [.45, -.42], [.68, -.34]], surprised: [[.22, -.42], [.46, -.56], [.7, -.46]] }[ex] || [];
    c.beginPath(); brow.forEach(([u, v], i) => i ? c.lineTo(u * R, v * R) : c.moveTo(u * R, v * R)); stroke((st === 'bald' ? .07 : .1) * R);
    if (st === 'bald') { c.beginPath(); c.moveTo(.5 * R, .4 * R); c.quadraticCurveTo(.7 * R, .34 * R, .9 * R, .42 * R); c.globalAlpha = A; c.strokeStyle = hr; c.lineWidth = .1 * R; c.lineCap = 'round'; c.stroke(); }  // bigode
    // Boca: a da fala (m fechada, e pequena, a aberta, o redonda) ou a da expressão.
    const M = F.mouth || (ex === 'surprised' ? 'o' : null), mouthOpen = (rx, ry) => { trace(oval(.64 * R, .6 * R, rx * R, ry * R, 0, sd + 63, 9)); c.globalAlpha = A; c.fillStyle = '#5A2420'; c.fill(); stroke(.045 * R); };
    if (M === 'a') { mouthOpen(.15, .14); trace(oval(.64 * R, .68 * R, .09 * R, .05 * R, 0, sd + 64, 8)); c.globalAlpha = .8 * A; c.fillStyle = '#C8664E'; c.fill(); }
    else if (M === 'o') mouthOpen(ex === 'surprised' ? .17 : .1, ex === 'surprised' ? .24 : .12);
    else if (M === 'e') mouthOpen(.13, .06);
    else if (M === 'm') { c.beginPath(); c.moveTo(.52 * R, .58 * R); c.lineTo(.78 * R, .57 * R); stroke(.06 * R, .8); }
    else if (ex === 'curious') mouthOpen(.09, .1);
    else if (ex === 'happy') { c.beginPath(); c.moveTo(.46 * R, .48 * R); c.quadraticCurveTo(.64 * R, .72 * R, .84 * R, .46 * R); stroke(.07 * R); }
    else { c.beginPath(); c.moveTo(.5 * R, .52 * R); c.quadraticCurveTo(.66 * R, .58 * R, .8 * R, .5 * R); stroke(.06 * R, .8); }
    c.globalAlpha = 1;
    // Nanquim leve: nuca e queixo.
    c.globalAlpha = .5 * A; c.strokeStyle = P.ink; c.lineWidth = lw; c.beginPath(); c.ellipse(0, 0, .97 * R, 1.07 * R, 0, 1.9, 2.9); c.stroke(); c.beginPath(); c.ellipse(0, 0, .97 * R, 1.07 * R, 0, .5, 1.2); c.stroke(); c.globalAlpha = 1;
    if (hood) blot(pts([[.55, -.92], [.15, -1.3], [-.55, -1.25], [-1.12, -.6], [-1.15, .35], [-.75, .98], [-.3, 1.0], [-.42, .35], [-.4, -.35], [-.05, -.78], [.42, -.72]]), Wr.shirt, lw, { shade: false });  // borda do capuz em volta do rosto
    else if (helm) {  // capacete: calota de metal com a luz do papel e a aba
      blot(pts([[-.98, -.12], [-.95, -.72], [-.5, -1.18], [.12, -1.25], [.62, -1.0], [.9, -.48], [.95, -.22]]), '#8E959A', lw);
      blot(oval(0, -.2 * R, 1.02 * R, .12 * R, -.03, sd + 67, 14, .04), dk('#8E959A', .2), lw, { shade: false });
    } else if (hat) {  // chapéu de explorador: copa, fita e aba
      blot(pts([[-.78, -.62], [-.72, -1.17], [-.45, -1.42], [.1, -1.48], [.55, -1.32], [.74, -1.02], [.8, -.62]]), P.hat, lw);
      blot(pts([[-.78, -.62], [-.76, -.84], [.78, -.84], [.8, -.62]]), P.band, lw, { shade: false });
      blot(oval(.05 * R, -.64 * R, 1.6 * R, .17 * R, -.04, sd + 65, 16, .05), dk(P.hat, .08), lw, { light: false });
    } else if (st !== 'bald') {
      blot(pts(CAP), hr, lw, { light: st !== 'short' });
      if (Wr.band) line(pts([[.62, -.62], [-.95, -.42]]), .16 * R, Wr.band, .9);  // faixa do corredor
    }
  }
  // Emote (? ou !) pintado sobre a cabeça: borrão amarelo-pálido por baixo e a letra em vermelho-terra com borda.
  function emote(p, S) {
    const { sym, k, a } = p.emote, x = p.head.x + p.facing * .06 * S, y = p.head.y - .27 * S, s = .13 * S * k;
    if (a <= 0 || k <= 0) return;
    c.save(); c.translate(x, y); A = a;
    blot(oval(0, -.05 * s, .5 * s, .55 * s, .2, 501, 12, .12), '#F3D98A', Math.max(1 / cam.z, .03 * s), { a: .55, shade: false });
    c.font = `bold ${s}px Georgia, "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.globalAlpha = .65 * a; c.strokeStyle = dk(P.red, .4); c.lineWidth = .06 * s; c.strokeText(sym, 0, 0);
    c.globalAlpha = .92 * a; c.fillStyle = P.red; c.fillText(sym, 0, 0);
    c.restore(); A = 1;
  }
  // Pontos de uma parte de dois pontos em (k ao longo do eixo, em frações do comprimento; m para baixo do ser, em frações de r).
  const onAxis = (x, f, r) => { const h = axis(x), u = [Math.cos(h.a), Math.sin(h.a)], n = [-f * u[1], f * u[0]], [A0] = x.pts; return ([k, m]) => [A0[0] + u[0] * k * h.L + n[0] * m * r, A0[1] + u[1] * k * h.L + n[1] * m * r]; };
  // Pata em fita (raiz → joelho → ponta, larguras w das partes) e, se houver, o pé da ponta ao dedo.
  function legsOf(a, Q, far, col, lw, foot) {
    const q = n => Q.find(x => x.name === n);
    for (const [n, l] of Object.entries(a.pose.limbs)) if (l.far === far) {
      const u = q(n + '.upper'), v = q(n + '.lower'), t = q(n + '.tip'), cl = far ? dk(col, .35) : col;
      taper([...u.pts, v.pts[1]], [...u.w, v.w[1]], cl, lw * .8, .95);
      if (t && foot) foot(t, cl, n);
    }
  }
  // Raposa (kind dog): silhueta única de lombo, peito e garupa no eixo quadril → peito,
  // pernas finas com meias escuras, cauda em escova com a ponta creme, babador creme do queixo ao peito. Cabeça grande em
  // gota no eixo base → ponta (joints.headTop é a ponta do focinho); o crânio passa para trás da base e cobre o pescoço.
  const FOXC = { col: '#C66A32', cream: '#F2E6CF', dark: '#4A3328' };
  const FOXB = [[-.3, -.1], [-.12, -.82], [.3, -.95], [.7, -.9], [1.02, -1.02], [1.3, -.62], [1.36, .1], [1.2, .78], [.85, .72], [.45, .45], [.12, .72], [-.2, .55]];
  const HEADF = [[-.42, -.15], [-.3, -.85], [0, -1.05], [.32, -.85], [.56, -.45], [.82, -.24], [1, -.07], [1.02, .06], [.86, .2], [.55, .36], [.22, .62], [-.15, .66], [-.4, .35]];
  function dog(a, Q) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, lw = Math.max(1 / cam.z, .008 * S), q = n => Q.find(x => x.name === n), [s0, , s2] = p.spine, tail = p.appendages.tail;
    const body = onAxis({ pts: [[s2.x, s2.y], [s0.x, s0.y]] }, f, .13 * S);
    const paw = (t, cl, n) => { const h = axis(t); blot(oval(h.m[0], h.m[1], h.L / 2, t.r - lw / 2, h.a, sd + n.length * 3, 9), mixCol(cl, FOXC.dark, .8), lw, { shade: false }); };
    // Perna: fita da cor do corpo (a raiz some sob o corpo), canela com a meia escura e a pata.
    const legs = far => {
      for (const [n, l] of Object.entries(p.limbs)) if (l.far === far) {
        const u = q(n + '.upper'), v = q(n + '.lower'), t = q(n + '.tip'), cl = far ? dk(FOXC.col, .3) : FOXC.col;
        taper([...u.pts, v.pts[1]], [...u.w, v.w[1]], cl, lw * .8, 1);
        taper(v.pts, v.w, mixCol(cl, FOXC.dark, .45), lw * .8, 1);
        if (t) paw(t, cl, n);
      }
    };
    legs(true); legs(false);  // as quatro antes do corpo: a raiz de cada perna some sob a silhueta
    if (tail) {  // cauda em escova: larga no meio, a ponta creme
      const tp = chaikin(tail), Lp = [], Rp = [];
      tp.forEach(([x, y], i) => { const A0 = tp[Math.max(0, i - 1)], B0 = tp[Math.min(tp.length - 1, i + 1)], dx = B0[0] - A0[0], dy = B0[1] - A0[1], d = Math.hypot(dx, dy) || 1, w = S * (.025 + .05 * Math.sin(Math.PI * (.1 + .75 * i / (tp.length - 1)))); Lp.push([x - dy / d * w, y + dx / d * w]); Rp.push([x + dy / d * w, y - dx / d * w]); });
      const e = tail.at(-1), e0 = tail.at(-2) || [s2.x, s2.y];
      blot([...Lp, ...Rp.reverse()], FOXC.col, lw);
      blot(oval(e[0], e[1], .075 * S, .06 * S, Math.atan2(e[1] - e0[1], e[0] - e0[0]), sd + 7, 9), FOXC.cream, lw, { shade: false });
    }
    blot(FOXB.map(body), FOXC.col, lw);
    const nk = q('neck'), hq = q('head'), on = onAxis(hq, f, hq.r - lw / 2), ear = (k, col) => blot([[-.12 + k, -.78], [-.3 + k, -1.9], [.18 + k, -.92]].map(on), col, lw, { shade: false });
    // Pescoço: o osso por baixo e, por cima, uma cunha sem borda do lombo e do peito até a base da cabeça (emenda corpo e cabeça).
    limb(nk.pts, 2 * (nk.r - lw), FOXC.col, lw, FOXC.col, nk.cap);
    { const [hb] = hq.pts, hh = axis(hq), w = .75 * hq.r, nx = -Math.sin(hh.a) * w, ny = Math.cos(hh.a) * w; blot([body([.85, -.98]), [hb[0] - nx, hb[1] - ny], [hb[0] + nx, hb[1] + ny], body([1.3, .35])], FOXC.col, lw, { shade: false, rim: FOXC.col }); }
    blot([[.95, .1], [1.34, .05], [1.22, .66], [.98, .72], [.9, .35]].map(body), FOXC.cream, lw, { shade: false });  // babador no peito
    ear(-.16, dk(FOXC.col, .3));
    blot(HEADF.map(on), FOXC.col, lw);
    blot([[.15, .12], [.6, .1], [.98, .08], [.86, .22], [.52, .38], [.15, .6], [-.25, .58]].map(on), FOXC.cream, lw, { shade: false });  // bochecha e queixo
    ear(.04, FOXC.col);
    const [nx, ny] = hq.pts[1], [ex, ey] = on([.36, -.4]), R = hq.r, sur = p.face && p.face.expression === 'surprised';
    c.beginPath(); c.arc(nx, ny, .14 * R, 0, TAU); c.globalAlpha = A; c.fillStyle = P.ink; c.fill();  // nariz na ponta
    if (sur) { c.beginPath(); c.arc(ex, ey, .19 * R, 0, TAU); c.fillStyle = '#FFFDF6'; c.fill(); c.strokeStyle = P.ink; c.lineWidth = lw; c.stroke(); }
    c.beginPath(); c.arc(ex, ey, (sur ? .1 : .12) * R, 0, TAU); c.fillStyle = P.ink; c.fill(); c.globalAlpha = 1;
  }
  // Pássaro: cinza-azulado de peito creme, bico ocre, pernas finas com dedos (o de trás também); asas por pose.wings: no voo a
  // asa de longe e a de perto batem (altura aparente pelo cosseno da fase); pousado, a asa fica dobrada no flanco.
  const BIRDC = { col: '#7A8DA3', belly: '#EBDDBE', beak: '#D9A441', leg: '#8A5A3A' };
  function bird(a, Q) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, lw = Math.max(1 / cam.z, .01 * S), q = n => Q.find(x => x.name === n), [s0, s1] = p.spine, Wg = p.wings || { phase: 0, open: 0 };
    const toes = (t, cl) => { const h = axis(t), w = 2 * (t.r - lw / 2); line(t.pts, w, cl); line([t.pts[0], [t.pts[0][0] - .45 * h.L * Math.cos(h.a), t.pts[0][1] + .2 * h.L]], w * .8, cl); };
    const ba = Math.atan2(s0.y - s1.y, s0.x - s1.x), bl = Math.hypot(s0.x - s1.x, s0.y - s1.y) / 2, bx = (s0.x + s1.x) / 2, by = (s0.y + s1.y) / 2;
    const wing = far => {
      const col = far ? dk(BIRDC.col, .3) : dk(BIRDC.col, .1);
      if (!Wg.open) { if (!far) blot(oval(bx - f * .03 * S, by - .03 * S, bl + .06 * S, .08 * S, ba + f * .12, sd + 31, 12), col, lw, { light: false }); return; }
      const k = Math.cos(Wg.phase * TAU), ky = Math.sign(k || 1) * Math.max(.12, Math.abs(k)) * (far ? .85 : 1);
      c.save(); c.translate(s0.x - f * .03 * S, s0.y - .06 * S); c.scale(f, ky);
      blot([[.06, 0], [-.04, -.14], [-.22, -.4], [-.46, -.5], [-.34, -.26], [-.2, -.04]].map(([u, v]) => [u * S, v * S]), col, lw / Math.abs(ky), { light: false });
      c.restore();
    };
    wing(true); legsOf(a, Q, true, BIRDC.leg, lw, toes);
    if (p.appendages.tail) blot(ribbon([[s1.x, s1.y], ...p.appendages.tail], .07 * S, .06 * S), dk(BIRDC.col, .25), lw, { shade: false });
    blot(oval(bx, by, bl + .17 * S, .15 * S, ba, sd), BIRDC.col, lw);
    blot(oval(s0.x + f * .04 * S, s0.y + .06 * S, .12 * S, .09 * S, ba, sd + 9, 10), BIRDC.belly, lw, { shade: false });  // peito
    legsOf(a, Q, false, BIRDC.leg, lw, toes);
    const nk = q('neck'), hq = q('head'), h = axis(hq), R = h.L / 2;
    limb(nk.pts, 2 * (nk.r - lw), BIRDC.col, lw, undefined, nk.cap);
    c.save(); headFrame(p); blot([[.7, -.28], [1.75, .02], [.7, .3]].map(([u, v]) => [u * R, v * R]), BIRDC.beak, lw, { shade: false }); c.restore();  // bico (sob a cabeça)
    blot(oval(h.m[0], h.m[1], R, hq.r - lw / 2, h.a, sd + 40), BIRDC.col, lw);
    c.save(); headFrame(p); c.beginPath(); c.arc(.3 * R, -.18 * R, .2 * R, 0, TAU); c.globalAlpha = A; c.fillStyle = P.ink; c.fill(); c.beginPath(); c.arc(.24 * R, -.25 * R, .07 * R, 0, TAU); c.fillStyle = P.paper; c.fill(); c.restore(); c.globalAlpha = 1;
    wing(false);
  }
  // Borboleta: asas azul-cerúleo com a borda escura e uma pinta clara; batem juntas (altura aparente pelo cosseno da fase).
  const BFC = { wing: '#7FA8C9', edge: '#3E5E7A', body: '#3B302B', spot: '#F1E3B8' };
  function butterfly(a, Q) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, lw = Math.max(1 / cam.z, .012 * S), q = n => Q.find(x => x.name === n), [th, ab] = p.spine, Wg = p.wings || { phase: 0 };
    const k = Math.cos(Wg.phase * TAU), wing = far => {
      const ky = Math.sign(k || 1) * Math.max(.1, Math.abs(k)) * (far ? .88 : 1), col = far ? dk(BFC.wing, .3) : BFC.wing, s = ([u, v]) => [u * S, v * S];
      c.save(); c.translate(th.x, th.y - .4 * th.r); c.scale(f, ky);
      const lk = lw / Math.abs(ky), hind = [[.02, 0], [-.1, -.3], [-.42, -.62], [-.62, -.5], [-.5, -.18], [-.12, .02]], fore = [[.06, 0], [.14, -.5], [.4, -1], [.72, -.9], [.6, -.42], [.16, .02]];
      const inner = (pts, k) => pts.map(([u, v]) => [k * u + (1 - k) * pts[0][0], k * v + (1 - k) * pts[0][1]]);
      const vein = (a0, b0) => { c.beginPath(); c.moveTo(a0[0] * S, a0[1] * S); c.lineTo(b0[0] * S, b0[1] * S); c.globalAlpha = .45 * A; c.strokeStyle = BFC.edge; c.lineWidth = lk * .7; c.stroke(); c.globalAlpha = 1; };
      blot(hind.map(s), BFC.edge, 1.4 * lk, { shade: false, rim: dk(BFC.edge, .3), a: .95 });  // asa de trás: borda escura e o miolo
      blot(inner(hind, .78).map(s), dk(col, .06), lk * .6, { shade: false, rim: col });
      if (!far) { blot(oval(-.42 * S, -.44 * S, .06 * S, .06 * S, 0, sd + 5, 8), '#D9A441', lk * .6, { shade: false }); c.beginPath(); c.arc(-.42 * S, -.44 * S, .025 * S, 0, TAU); c.globalAlpha = A; c.fillStyle = BFC.body; c.fill(); c.globalAlpha = 1; }
      blot(fore.map(s), BFC.edge, 1.4 * lk, { shade: false, rim: dk(BFC.edge, .3), a: .95 });
      blot(inner(fore, .8).map(s), col, lk * .6, { shade: false, rim: col });
      blot(inner(fore, .45).map(s), mixCol(col, P.paper, .35), lk * .5, { shade: false, rim: col, a: .7 });
      for (const e of [[.4, -.98], [.62, -.72], [.5, -.4]]) vein([.08, -.02], e);
      for (const e of [[-.4, -.6], [-.5, -.3]]) vein([0, 0], e);
      if (!far) for (const [u, v, r] of [[.55, -.88, .035], [.66, -.78, .028], [.68, -.62, .025]]) { c.beginPath(); c.arc(u * S, v * S, r * S, 0, TAU); c.globalAlpha = A; c.fillStyle = BFC.spot; c.fill(); c.globalAlpha = 1; }
      c.restore();
    };
    wing(true);
    const ant = n => p.appendages[n] && line(p.appendages[n], Math.max(1 / cam.z, .015 * S), BFC.body, .9);
    ant(f > 0 ? 'antennaR' : 'antennaL');
    blot(oval(ab.x, ab.y, 1.9 * ab.r, .85 * ab.r, ab.angle, sd), mixCol(BFC.body, BFC.wing, .25), lw, { shade: false });
    blot(oval(th.x, th.y, 1.1 * th.r, .95 * th.r, th.angle, sd + 20), BFC.body, lw, { shade: false });
    const nk = q('neck'), hq = q('head'), h = axis(hq);
    limb(nk.pts, 2 * (nk.r - .5 * lw), BFC.body, .5 * lw, undefined, nk.cap);
    blot(oval(h.m[0], h.m[1], h.L / 2, hq.r - lw / 2, h.a, sd + 40), BFC.body, lw, { shade: false });
    ant(f > 0 ? 'antennaL' : 'antennaR');
    wing(false);
  }
  // Besouro: élitros verde-bronze em cúpula com a luz do papel, pronoto mais escuro, patas e antenas quase pretas.
  const BTC = { shell: '#45604E', dark: '#2C2824' };
  function beetle(a, Q) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, lw = Math.max(1 / cam.z, .01 * S), q = n => Q.find(x => x.name === n), [pr, el] = p.spine;
    const ant = n => p.appendages[n] && line(p.appendages[n], Math.max(1 / cam.z, .014 * S), BTC.dark, .9);
    legsOf(a, Q, true, BTC.dark, lw); ant(f > 0 ? 'antennaR' : 'antennaL');
    const nk = q('neck'), hq = q('head'), h = axis(hq);
    limb(nk.pts, 2 * (nk.r - .5 * lw), BTC.dark, .5 * lw, undefined, nk.cap);
    blot(oval(h.m[0], h.m[1], h.L / 2, hq.r - lw / 2, h.a, sd + 40), BTC.dark, lw, { shade: false });
    blot(oval(pr.x, pr.y, .95 * pr.r, .75 * pr.r, pr.angle, sd + 20), dk(BTC.shell, .25), lw);
    blot(oval(el.x, el.y, 1.12 * el.r, .78 * el.r, el.angle, sd), BTC.shell, lw);
    legsOf(a, Q, false, BTC.dark, lw); ant(f > 0 ? 'antennaL' : 'antennaR');
  }
  // Peixe: contorno do focinho (headTop) pela cabeça e pelos segmentos (raio de cada um) até a cauda; dorso escuro, barriga
  // clara, nadadeira caudal em leque pelo apêndice. A água (lake) entra por cima depois dos atores.
  const FISHC = { side: '#9DB4B8', back: '#4F6B74', belly: '#E4E2D2', fin: '#7C969C' };
  function fish(a, Q) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, lw = Math.max(1 / cam.z, .008 * S), q = n => Q.find(x => x.name === n), J = p.joints, nk = q('neck'), hq = q('head'), h = axis(hq);
    const ch = [[...hq.pts[1], .02 * S], [...J.head, .95 * h.L / 2], ...p.spine.map(s => [s.x, s.y, s.r])], top = [], bot = [];
    ch.forEach(([x, y, r], i) => { const A0 = ch[Math.max(0, i - 1)], B0 = ch[Math.min(ch.length - 1, i + 1)], dx = B0[0] - A0[0], dy = B0[1] - A0[1], d = Math.hypot(dx, dy) || 1; top.push([x - dy / d * r * f, y + dx / d * r * f]); bot.push([x + dy / d * r * f, y - dx / d * r * f]); });
    const cd = p.appendages.caudal, pc = p.appendages.pectoral;
    if (cd) blot(ribbon(cd, .05 * S, .26 * S), FISHC.fin, lw, { shade: false });
    limb(nk.pts, 2 * (nk.r - .5 * lw), FISHC.side, .5 * lw, undefined, nk.cap);
    const tail = p.spine.at(-1);
    blot([...top, [tail.x, tail.y], ...bot.reverse()], FISHC.side, lw);
    blot([...top.slice(1), [tail.x, tail.y], ...ch.slice(1).reverse().map(([x, y]) => [x, y])], FISHC.back, lw, { shade: false, a: .55 });  // dorso
    blot(oval(h.m[0], h.m[1], h.L / 2, hq.r - lw / 2, h.a, sd + 40), mixCol(FISHC.side, FISHC.belly, .3), lw, { shade: false, a: .6 });
    if (pc) line(pc, .03 * S, dk(FISHC.fin, .1), .8);
    const R = h.L / 2;
    c.save(); headFrame(p); c.beginPath(); c.arc(-.35 * R, .05 * R, .6 * R, -.9, .9); c.globalAlpha = .6 * A; c.strokeStyle = dk(FISHC.side, .45); c.lineWidth = lw; c.stroke();
    c.beginPath(); c.arc(.25 * R, -.2 * R, .2 * R, 0, TAU); c.globalAlpha = A; c.fillStyle = '#FFFDF6'; c.fill(); c.beginPath(); c.arc(.28 * R, -.2 * R, .11 * R, 0, TAU); c.fillStyle = P.ink; c.fill(); c.restore(); c.globalAlpha = 1;
  }
  // Atores da camada pedida (layer < 1 ou = 1), fora do quadro pulados; alpha e flip aplicados. props = adereços da camada
  // da frente, [{depth, draw}], intercalados pela profundidade (vai antes do ator de depth igual ou maior). Por fim os
  // membros que passam por cima de outro ser (LATE).
  const KIND = { human, fly, dog, bird, butterfly, beetle, fish };
  function actors(F, front, props = []) {
    const pr = [...props].sort((a, b) => a.depth - b.depth); let i = 0;
    const flush = d => { while (i < pr.length && pr[i].depth <= d) { at(1); A = 1; pr[i++].draw(); } };
    for (const a of F.actors) {
      if ((a.layer >= 1) !== front) continue;
      if (front) flush(a.depth);
      if (a.hidden) continue;
      const p = a.pose, lx = lerp(960, cam.cx, a.layer), sx = (p.spine[0].x - lx) * cam.z + 960, sy = (p.spine[0].y - cam.cy) * cam.z + 540, m = 1.6 * p.size * cam.z + 40;
      if (sx < -m || sx > W + m || sy < -m || sy > H + m) continue;
      at(a.layer); A = a.alpha ?? 1;
      if (a.flip) { const mx = (p.spine[0].x + p.spine.at(-1).x) / 2; c.translate(mx, 0); c.scale(a.flip, 1); c.translate(-mx, 0); }
      (KIND[a.kind] || ant)(a, parts(a, F));
      A = 1;
    }
    if (front) flush(Infinity);
    for (const fn of LATE) fn();
    LATE = []; c.globalAlpha = 1;
  }

  // ---------- planos ----------
  const greenFar = mixCol(P.hill, P.skyLow, .45), greenMist = mixCol(P.grass, P.skyLow, .55);
  function close(F) {
    const w = F.world;
    band('c-mist', w.mist.f, -3600, 8000, 300, 3000, .3, terrain(w.mist.prof, greenFar, { glaze: 80 }), w.mist.prof);
    grass(w.mist.f, () => w.mist.root, 70, 220, 500, mixCol(P.grass, P.skyLow, .6), { seed: 200, rim: false, a: .55, wind: .06 });
    band('c-back', w.back.f, -3600, 10600, 700, 3000, .3, terrain(w.back.ground, greenMist, { glaze: 60 }), w.back.ground);
    grass(w.back.f, x => w.back.ground(x) + 30, 150, 260, 560, mixCol(P.grassDk, P.skyLow, .3), { seed: 3, a: .7, wind: .1 });
    actors(F, false);
    band('c-ground', 1, -1000, 14000, 860, 3000, .45, terrain(w.ground, P.grass, { glaze: 90, ink: .9, dots: 300, deep: 400 }), w.ground);
    grass(1, w.ground, 60, 40, 120, P.grassDk, { seed: 9, col2: P.grass, wind: .1 });
    actors(F, true);
    grass(1, w.front, 60, 120, 260, dk(P.grassDk, .25), { seed: 31, rim: false, a: .45, wind: .15, gap: .4 });
  }
  function wide(F) {
    const w = F.world;
    at(w.clouds.f); for (const [x, y, s, sd] of w.clouds.list) cloud(x, y, s, sd);
    band('w-far', w.far.f, -700, 2800, 450, 1150, .5, terrain(w.far.prof, mixCol(P.far, P.skyLow, .2), { glaze: 70 }), w.far.prof);
    band('w-hill', w.hill.f, -700, 3000, 600, 1150, .6, terrain(w.hill.prof, greenFar, { glaze: 50 }), w.hill.prof);
    actors(F, false);
    const T0 = w.tree, gx = w.ground(T0.x), crown = [[-90, -.72, 95], [10, -.86, 120], [95, -.7, 95], [-30, -.55, 90], [55, -.52, 80]].map(([dx, k, r]) => [T0.x + dx, gx + k * T0.h, r]);
    const mound = x => 26 * Math.max(0, 1 - ((x - w.nest) / 110) ** 2), top = x => w.ground(x) - mound(x);
    band('w-soil', 1, -300, 2500, 370, 2000, 1.15, terrain(top, P.grass, { glaze: 12, ink: .35, dots: 1e9, extra: soil(w, top, crown) }), top, () => {
      for (const [x, y, r] of crown) { c.moveTo(x + r * 1.02, y); c.ellipse(x, y, r * 1.02, r * .85, 0, 0, TAU); }
      c.rect(T0.x - 18, gx - .6 * T0.h, 36, .6 * T0.h + 10);
    });
    grass(1, top, 9, 9, 22, P.grassDk, { seed: 5, col2: P.grass, wind: .15, a: .8 });
    actors(F, true);
  }
  // Corte do solo: estratos, pedrinhas, raízes, túneis, câmaras com o fungo, o monte do ninho e a árvore.
  const soil = (w, top, crown) => (x0, x1, yb) => {
    const g = []; for (let x = x0 - 40; x <= x1 + 80; x += 30) g.push([x, top(x) + 28 + 6 * Math.sin(x * .03)]);
    flat([...g, [x1 + 80, yb + 20], [x0 - 40, yb + 20]], mixCol(P.soil, '#FFFFFF', .2));
    wc([...g, [x1 + 80, yb + 20], [x0 - 40, yb + 20]], P.soil, 160, .1, .6);
    for (let b = 0; b < 5; b++) {
      const yb0 = w.soilTop + 140 + 220 * b, wave = []; for (let x = x0 - 40; x <= x1 + 80; x += 60) wave.push([x, yb0 + 30 * Math.sin(x * .004 + b) + 10 * Math.sin(x * .013 + b)]);
      wc([...wave, [x1 + 80, yb + 20], [x0 - 40, yb + 20]], b % 2 ? dk(P.soil, .12 + .08 * b) : mixCol(dk(P.soil, .06 * b), P.path, .3), 120, .2, .6);
    }
    // Três aguadas largas e inclinadas por cima (cor sobre cor) e flores de água (backruns): miolo claro, borda escura.
    for (let b = 0; b < 3; b++) {
      const y0 = w.soilTop + 60 + 260 * b, sl = b % 2 ? -.08 : .08, up = [], dn = []; for (let x = x0 - 40; x <= x1 + 80; x += 70) { up.push([x, y0 + sl * (x - x0) + 40 * Math.sin(x * .006 + b)]); dn.push([x, y0 + 190 + sl * (x - x0) + 50 * Math.sin(x * .005 + 2 * b)]); }
      wc([...up, ...dn.reverse()], b === 1 ? mixCol(P.soil, P.red, .2) : dk(P.soil, .2), 90, .3, .7);
    }
    for (let i = 0; i < 26; i++) {
      const x = lerp(x0, x1, hash(i * 9.3 + 2)), y = lerp(w.soilTop + 80, yb - 80, hash(i * 4.1 + 7)), r = 50 + 90 * hash(i * 6.7);
      const o = Array.from({ length: 24 }, (_, j) => { const a = j * TAU / 24, k = .75 + .4 * hash(i * 31 + j) + .15 * Math.sin(a * 5 + i); return [x + 1.4 * r * k * Math.cos(a), y + r * k * Math.sin(a)]; });
      wc(o, dk(P.soil, .3), 60, .35, .7); wc(o.map(([u, v]) => [x + .82 * (u - x), y + .82 * (v - y)]), mixCol(P.soil, P.paper, .55), 110, .3, .6);
    }
    for (let i = 0; i < 40; i++) {  // seixos com contorno a sépia
      const x = lerp(x0, x1, hash(i * 2.9 + 11)), y = lerp(w.soilTop + 50, yb, hash(i * 6.1 + 3)), r = 8 + 14 * hash(i * 1.3 + 5), e = ell(x, y, 1.3 * r, r, 10, i + 300);
      wc(e, mixCol(P.stone, P.soil, .3), 200, .05, .4); nibBroken([...e, e[0]], .3, i * 5, .8, 4, dk(P.soil, .65));
    }
    for (let i = 0; i < 110; i++) { const x = lerp(x0, x1, hash(i * 3.7)), y = lerp(w.soilTop + 60, yb, hash(i * 5.3 + 1)), r = 4 + 10 * hash(i * 2.1); wc(ell(x, y, 1.4 * r, r, 9, i), i % 3 ? dk(P.soil, .35) : P.stone, 150, .05, .3); }
    // Raízes da árvore: fios de nanquim que descem e se abrem.
    const R0 = w.roots;
    for (let i = 0; i < 7; i++) {
      const pts = [[R0.x, R0.y - 10]]; let x = R0.x, y = R0.y - 10, a = Math.PI / 2 + 1.3 * (hash(i * 9.1) - .5);
      for (let j = 0; j < 7; j++) { a += .5 * (hash(i * 13 + j) - .5); x += Math.cos(a) * R0.h / 7 * (.6 + .5 * hash(i + j)); y += Math.sin(a) * R0.h / 7 * (.5 + .4 * hash(i * 2 + j)); pts.push([x, y]); }
      wc(ribbon(chaikin(pts), 16 - i, 3), dk(P.soil, .45), 120, .05, .4); nib(chaikin(pts), .35, dk(P.soil, .7));
    }
    // Túneis: fita escura com o chão mais claro e as paredes a nanquim.
    for (const t of w.tunnels) {
      const p = chaikin(t, 3);
      flat(ribbon(p, 40), mixCol(P.cave, P.soil, .25)); wc(ribbon(p, 44), P.cave, 220, .08, .45); wc(ribbon(p.map(([x, y]) => [x, y + 8]), 22), mixCol(P.cave, P.soil, .35), 140, .1, .5);
      nibBroken(ribbon(p, 46).slice(0, p.length), .22, 11, .6, 4); nibBroken(ribbon(p, 46).slice(p.length), .22, 13, .6, 4);
    }
    for (const [x, y, cw, ch, sd] of w.chambers) {
      const dome = [...Array.from({ length: 15 }, (_, i) => { const a = Math.PI + i * Math.PI / 14, k = .92 + .14 * hash(sd + i * 2.3); return [x + Math.cos(a) * cw / 2 * k, y + Math.sin(a) * ch * k]; }), [x + cw / 2, y + 10], [x - cw / 2, y + 10]];
      flat(dome.map(([u, v]) => [x + .97 * (u - x), y + .97 * (v - y)]), mixCol(P.cave, P.soil, .25)); wc(dome, P.cave, 220, .08, .5);
      wc(ell(x, y - .35 * ch, .4 * cw, .4 * ch, 16, sd), mixCol(P.cave, P.path, .35), 120, .3, .5);
      nibBroken(dome, .3, sd * 7, .75, 3);
    }
    // Fungo: esponja creme de bolhas sobrepostas, sombra ocre por baixo e pontinhos.
    for (const [x, y, fw, fh, sd] of w.fungus) {
      for (let i = 0; i < 9; i++) { const u = (i + .5) / 9, r = fh * (.3 + .18 * hash(sd * 7 + i)) * (1 - .5 * Math.abs(u - .5)), cx = x + (u - .5) * fw * .9, cy = y - r * .9 - .25 * fh * (1 - 2 * Math.abs(u - .5)); const b = ell(cx, cy, r * 1.05, r, 14, sd * 31 + i); wc(b, P.fungus, 230, .12, .4); nibBroken([...b.slice(9), ...b.slice(0, 2)], .18, sd + i, .7, 2, mixCol(P.fungus, P.ink, .5)); }
      wc(ell(x, y - .15 * fh, .48 * fw, .18 * fh, 16, sd), mixCol(P.fungus, P.soil, .4), 90, .25, .6);
      for (let i = 0; i < 30; i++) { const px = x + fw * .42 * (hash(sd + i * 3.1) - .5) * 2, py = y - fh * .75 * hash(sd + i * 4.3); wc(ell(px, py, 4, 4, 6, i), mixCol(P.fungus, P.soil, .6), 120, .05, .2); }
    }
    // Monte de terra solta e a boca do ninho.
    wc([...Array.from({ length: 12 }, (_, i) => { const x = w.nest - 120 + i * 20; return [x, top(x) - 2]; }), [w.nest + 130, w.ground(w.nest + 130) + 20], [w.nest - 130, w.ground(w.nest - 130) + 20]], mixCol(P.soil, P.path, .4), 200, .12, .6);
    wc(ell(w.nest + 15, top(w.nest + 15) + 4, 26, 10, 12, 3), P.cave, 230, .05, .3);
    // Árvore: tronco em fita, galhos a nanquim e a copa em bolhas de verde com a veladura escura por baixo.
    const T0 = w.tree, gx = w.ground(T0.x);
    wc(ribbon([[T0.x, gx + 15], [T0.x + 4, gx - .3 * T0.h], [T0.x - 6, gx - .62 * T0.h]], 34, 16), mixCol(P.soilDk, P.stone, .3), 220, .05, .5);
    nib([[T0.x - 15, gx + 10], [T0.x - 13, gx - .55 * T0.h]], .5); nib([[T0.x, gx - .4 * T0.h], [T0.x + 60, gx - .62 * T0.h]], .45);
    for (const [x, y, r] of crown) wc(ell(x, y, r, .82 * r, 16, x), P.tree, 190, .15, .55);
    for (const [x, y, r] of crown) wc(ell(x + 5, y + .3 * r, .8 * r, .45 * r, 14, y), dk(P.tree, .3), 90, .2, .6);
    nibBroken(crown.flatMap(([x, y, r]) => ell(x, y, r, .82 * r, 12, x).slice(7, 12)), .45, 21, .5, 3);
  };
  function name(F) {
    const w = F.world, [rx, ry, rr] = w.rock, top = x => Math.min(w.ground(x), Math.abs(x - rx) < rr ? ry - .75 * Math.sqrt(rr * rr - (x - rx) ** 2) : 1e9);
    band('n-mist', w.mist.f, -1000, 2600, 400, 1300, .5, terrain(w.mist.prof, greenFar, { glaze: 80 }), w.mist.prof);
    grass(w.mist.f, () => w.mist.root, 70, 220, 500, mixCol(P.grass, P.skyLow, .6), { seed: 200, rim: false, a: .55, wind: .06 });
    band('n-back', w.back.f, -1400, 2600, 650, 1300, .6, terrain(w.back.ground, greenMist, { glaze: 60 }), w.back.ground);
    grass(w.back.f, x => w.back.ground(x) + 30, 150, 260, 560, mixCol(P.grassDk, P.skyLow, .3), { seed: 3, a: .7, wind: .1 });
    actors(F, false);
    band('n-ground', 1, -1800, 2800, 760, 1250, .78, terrain(top, P.grass, { glaze: 70, ink: .6, extra: () => {
      wc(ell(rx, ry - .3 * rr, rr, .75 * rr, 16, 5).filter(([, y]) => y < ry + 10), P.stone, 220, .08, .6); wc(ell(rx + .2 * rr, ry - .1 * rr, .7 * rr, .35 * rr, 12, 6), dk(P.stone, .25), 100, .15, .6);
      nibBroken(ell(rx, ry - .3 * rr, rr, .75 * rr, 16, 5).slice(8, 16), .6, 9, .8, 3);
    } }), top);
    grass(1, w.ground, 40, 30, 90, P.grassDk, { seed: 9, col2: P.grass, wind: .1 });
    actors(F, true);
    grass(1, w.front, 60, 120, 260, dk(P.grassDk, .25), { seed: 31, rim: false, a: .45, wind: .15, gap: .4 });
  }
  // H: céu, serra ao longe, linha de copas, o campo com a trilha de terra onde passa a fila.
  function trail(F) {
    const w = F.world, far = x => 640 + 40 * Math.sin(x * .0025 + 1) + 15 * Math.sin(x * .007), crowns = x => 760 + 18 * Math.sin(x * .003) - 60 * Math.abs(Math.sin(x * .008 + 1.3)) - 20 * Math.abs(Math.sin(x * .021));
    band('h-far', .3, -700, 2700, 450, 1150, .5, terrain(far, mixCol(P.far, P.skyLow, .2), { glaze: 70 }), far);
    band('h-trees', .6, -700, 2700, 600, 1150, .6, terrain(crowns, mixCol(P.tree, P.skyLow, .3), { glaze: 40, dots: 90, deep: 60 }), crowns);
    band('h-ground', 1, -400, 2400, 820, 1300, 1.25, terrain(w.ground, P.grass, { glaze: 120, ink: .35, dots: 220, deep: 300, extra: (x0, x1) => {
      const e = (d, s) => { const p = []; for (let x = x0 - 40; x <= x1 + 80; x += 40) p.push([x, w.antGround(x) + d + 6 * Math.sin(x * .02 + s)]); return p; };
      wc([...e(-30, 1), ...e(32, 2).reverse()], P.path, 200, .12, .6); wc([...e(8, 3), ...e(32, 2).reverse()], dk(P.path, .15), 80, .2, .6);
      for (let i = 0; i < 40; i++) { const x = lerp(x0, x1, hash(i * 7.7)), y = w.antGround(x) - 25 + 55 * hash(i * 3.3), r = 3 + 6 * hash(i); wc(ell(x, y, 1.4 * r, r, 8, i), P.stone, 180, .05, .3); }
    } }), w.ground);
    grass(1, w.ground, 14, 18, 46, P.grassDk, { seed: 5, col2: P.grass, wind: .12, a: .8 });
    actors(F, true);
    grass(1, x => w.antGround(x) + 40, 34, 12, 30, P.grassDk, { seed: 15, col2: P.grass, wind: .1, a: .75, gap: .5 });
  }

  // ---------- praça (P) e lago (N) ----------
  // Adereços pintados uma vez em p5.brush (cada um no seu cache, sem máscara: a aguada é transparente sobre o fundo).
  function paintTree(x, y, h, sd) {
    const crown = [[-.17, -.7, .19], [.02, -.84, .23], [.18, -.68, .18], [-.06, -.55, .17], [.11, -.52, .15]].map(([dx, k, r]) => [x + dx * h, y + k * h, r * h]);
    const bark = mixCol(P.soilDk, P.stone, .35), trunk = [[x, y + 8], [x + .01 * h, y - .3 * h], [x - .012 * h, y - .62 * h]], rb = ribbon(trunk, .07 * h, .032 * h), n = trunk.length;
    flat(rb, mixCol(bark, P.paper, .25)); wc(rb, bark, 150, .01, .4); wc(ribbon(trunk.map(([u, v]) => [u + .012 * h, v]), .03 * h, .012 * h), dk(bark, .25), 110, .01, .4);  // sombra do lado direito
    nib(rb.slice(0, n), .3, dk(bark, .45)); nib(rb.slice(n), .3, dk(bark, .45));
    for (const [u, v, dx, dy] of [[0, -.42, .12, -.2], [-.006, -.5, -.1, -.16]]) wc(ribbon([[x + u * h, y + v * h], [x + (u + dx) * h, y + (v + dy) * h]], .022 * h, .008 * h), bark, 200, .01, .4);  // galhos
    for (const [cx, cy, r] of crown) wc(ell(cx, cy, r, .82 * r, 16, cx + sd), P.tree, 190, .15, .55);
    for (const [cx, cy, r] of crown) wc(ell(cx + 5, cy + .3 * r, .8 * r, .45 * r, 14, cy + sd), dk(P.tree, .3), 90, .2, .6);
  }
  function paintLamp(x, y, h) {
    const col = '#4E4E46', top = y - h;
    flat(ribbon([[x, y], [x, top + 30]], 12, 8), col); wc(ell(x, y - 6, 22, 9, 10, x), col, 220, .05, .4);
    wc([[x - 26, top + 34], [x + 26, top + 34], [x + 18, top - 14], [x - 18, top - 14]], '#F3E2A0', 200, .1, .4);
    nib([[x - 26, top + 34], [x - 18, top - 14], [x + 18, top - 14], [x + 26, top + 34], [x - 26, top + 34]], .4, col);
    wc([[x - 30, top - 12], [x + 30, top - 12], [x, top - 40]], col, 230, .05, .4); nib([[x, top + 30], [x, y - 10]], .45, dk(col, .3));
  }
  function paintFountain(x, y, r) {
    const st = P.stone, wt = '#9CC0D2';
    wc([[x - r, y - 80], [x + r, y - 80], [x + r - 14, y], [x - r + 14, y]], st, 220, .08, .6);
    wc(ell(x, y - 82, r + 8, 16, 24, 3), mixCol(st, P.paper, .35), 220, .05, .5); wc(ell(x, y - 84, r - 14, 9, 20, 4), wt, 200, .1, .5);
    wc(ribbon([[x, y - 84], [x, y - 205]], 46, 34), dk(st, .1), 220, .05, .5);
    wc([[x - 95, y - 205], [x + 95, y - 205], [x + 42, y - 172], [x - 42, y - 172]], st, 220, .05, .5); wc(ell(x, y - 206, 92, 9, 16, 5), wt, 200, .1, .5);
    for (const s of [-1, 1]) wc(ribbon([[x, y - 228], [x + s * 60, y - 250], [x + s * 115, y - 190], [x + s * 140, y - 100]], 10, 5), wt, 120, .15, .5);
    wc(ribbon([[x, y - 205], [x, y - 262]], 9, 4), wt, 130, .15, .5);
    nibBroken([[x - r, y - 80], [x - r + 14, y], [x + r - 14, y], [x + r, y - 80]], .5, 5, .8, 1); nibBroken(ell(x, y - 82, r + 8, 16, 24, 3).slice(0, 13), .4, 7, .7, 3);
  }
  // Banco de frente: encosto de duas tábuas em toda a largura (de seatY − backH a seatY), assento (topo em seatY) e dois pés até o chão.
  function benchPolys(b, gy) {
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, s = b.seatY, ys = [s - b.backH + 14, s - .45 * b.backH];
    return [...[x0 + 10, x1 - 10].map(x => ribbon([[x, s], [x, s - b.backH]], 9)), ...ys.map(y => ribbon([[x0, y], [x1, y]], 24)),
      ...[x0 + .1 * b.w, x1 - .1 * b.w].map(x => ribbon([[x, s + 10], [x, gy]], 11)), ribbon([[x0 - 6, s + 7], [x1 + 6, s + 7]], 14)];
  }
  // Tronco caído (N): corpo do topo (log.top) ao chão, sombra embaixo, riscos de casca e o anel do corte na ponta da direita.
  function logPaint(Lg, g) {
    const n = 24, top = [], bot = [], bark = '#7A5638';
    for (let i = 0; i <= n; i++) { const x = lerp(Lg.x0, Lg.x1, i / n); top.push([x, Lg.top(x)]); bot.push([x, g(x)]); }
    wc([...top, ...bot.slice().reverse()], bark, 235, .05, .5);
    wc([...top.map(([x, y], i) => [x, lerp(y, bot[i][1], .55)]), ...bot.slice().reverse()], dk(bark, .25), 130, .08, .6);
    for (let i = 1; i < 9; i++) { const x = lerp(Lg.x0, Lg.x1, (i + .3 * hash(i + 40)) / 9.5), y0 = Lg.top(x), y1 = g(x); nib([[x - 14, lerp(y0, y1, .3)], [x + 6, lerp(y0, y1, .45)], [x + 20, lerp(y0, y1, .6)]], .4, dk(bark, .5)); }
    nib(top, .6, dk(bark, .55));
    const xm = Lg.x1 - 60, ym = (Lg.top(xm) + g(xm)) / 2, rr = (g(xm) - Lg.top(xm)) / 2;
    wc(ell(xm, ym, rr * .55, rr * .95, 16, 7), '#D9B98A', 240, .03, .4); nib([...ell(xm, ym, rr * .55, rr * .95, 16, 7), ell(xm, ym, rr * .55, rr * .95, 16, 7)[0]], .45, dk(bark, .5));
    nib([...ell(xm, ym, rr * .25, rr * .45, 12, 8), ell(xm, ym, rr * .25, rr * .45, 12, 8)[0]], .3, dk('#D9B98A', .45));
  }
  // Flor de cinco pétalas (rosa, miolo amarelo): no chão o caule deita; na mão (held) ele pende do punho.
  function flower(it) {
    const { x, y, r } = it, lw = Math.max(1 / cam.z, .08 * r);
    line(it.held ? [[x, y], [x - .3 * r, y + 1.6 * r], [x - .2 * r, y + 2.8 * r]] : [[x, y], [x + 1.2 * r, y + .5 * r], [x + 2.6 * r, y + .8 * r]], .22 * r, '#5E8A45', .95);
    const lf = it.held ? [x - .25 * r, y + 1.7 * r] : [x + 1.4 * r, y + .6 * r]; blot([[lf[0], lf[1]], [lf[0] + .9 * r, lf[1] - .5 * r], [lf[0] + 1.3 * r, lf[1] - .1 * r], [lf[0] + .5 * r, lf[1] + .2 * r]], '#6E9A4E', lw, { shade: false });  // folha
    for (let i = 0; i < 5; i++) {
      const t = i * TAU / 5 - Math.PI / 2, u = [Math.cos(t), Math.sin(t)], v = [-u[1], u[0]], at2 = (a0, b0) => [x + (u[0] * a0 + v[0] * b0) * r, y + (u[1] * a0 + v[1] * b0) * r];
      blot([at2(.15, 0), at2(.45, -.38), at2(.95, -.3), at2(1.12, 0), at2(.95, .3), at2(.45, .38)], i % 2 ? '#E07A9A' : '#E8899F', lw, { shade: false, rim: '#A84466' });
      line([at2(.25, 0), at2(.85, 0)], .06 * r, '#B8506E', .6);  // nervura
    }
    c.beginPath(); c.arc(x, y, .32 * r, 0, TAU); c.globalAlpha = A; c.fillStyle = '#F0C74E'; c.fill(); c.strokeStyle = '#B88A2A'; c.lineWidth = lw; c.stroke();
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + .15 * r * Math.cos(i * 2.4), y + .15 * r * Math.sin(i * 2.4), .05 * r, 0, TAU); c.fillStyle = '#9A6A22'; c.fill(); }
    c.globalAlpha = 1;
  }
  function plaza(F) {
    const w = F.world, GY = w.ground(0), b = w.bench;
    at(.15); for (const [x, y, s, sd] of [[-500, 120, 1.3, 11], [700, 40, 1.1, 12], [1900, 160, 1.5, 13], [3000, 70, 1.2, 14]]) cloud(x, y, s, sd);
    const town = x => GY - 170 - 110 * hash(Math.floor(x / 150) + .5) - (Math.floor(x / 150) % 4 ? 0 : 60), park = x => GY - 120 - 45 * Math.abs(Math.sin(x * .006)) - 25 * Math.abs(Math.sin(x * .017));
    band('p-far', .3, -1300, 3200, GY - 420, GY + 250, .6, terrain(town, mixCol(P.far, P.skyLow, .25), { glaze: 60, dots: 1e9 }), town);
    band('p-mid', .6, -1400, 3200, GY - 300, GY + 250, .8, terrain(park, mixCol(P.tree, P.skyLow, .3), { glaze: 40, dots: 120, deep: 60 }), park);
    band('p-ground', 1, -2000, 3800, GY - 20, GY + 430, 1.25, terrain(w.ground, P.path, { glaze: 40, ink: .4, dots: 1e9, extra: (x0, x1) => {
      flat([[x0 - 40, GY - 6], [x1 + 80, GY - 6], [x1 + 80, GY + 10], [x0 - 40, GY + 10]], mixCol(P.grass, P.path, .3));  // faixa de grama no fundo
      for (let j = 0; j < 7; j++) {  // juntas do calçamento: fiadas que se abrem para a frente
        const y0 = GY + 16 + 8 * j * j + 20 * j, y1 = GY + 16 + 8 * (j + 1) ** 2 + 20 * (j + 1), st = 110 + 30 * j;
        nibBroken([[x0 - 40, y0], [x1 + 80, y0]], .3, j * 13, .5, 1, dk(P.path, .4));
        for (let x = x0 - 40 + st * hash(j + .5); x < x1 + 80; x += st) if (hash(x * .13 + j) < .7) nib([[x, y0 + 2], [x + .1 * (x - 900) * (y1 - y0) / 600, y1 - 2]], .25, dk(P.path, .35));
      }
      for (let i = 0; i < 26; i++) { const x = lerp(x0, x1, hash(i * 5.3 + 1)), y = GY + 40 + 340 * hash(i * 2.7), r = 30 + 60 * hash(i * 1.9); wc(ell(x, y, 2.2 * r, .5 * r, 14, i), dk(P.path, .15), 50, .3, .6); }
    } }), w.ground);
    at(1);
    for (const tr of w.trees) still('p-tree' + tr.seed, [tr.x - .45 * tr.h, tr.y - 1.1 * tr.h, .9 * tr.h, 1.15 * tr.h], 1.25, () => paintTree(tr.x, tr.y, tr.h, tr.seed));
    for (const l of w.lamps) still('p-lamp' + l.seed, [l.x - 50, l.y - l.h - 50, 100, l.h + 60], 1.25, () => paintLamp(l.x, l.y, l.h));
    const fo = w.fountain; still('p-fountain', [fo.x - fo.r - 40, fo.y - 280, 2 * fo.r + 80, 300], 1.25, () => paintFountain(fo.x, fo.y, fo.r));
    grass(1, () => GY - 2, 26, 10, 24, P.grassDk, { seed: 17, col2: P.grass, wind: .1, a: .7 });
    const polys = benchPolys(b, GY), wood = '#9A6B45';
    const props = [{ depth: b.depth, draw: () => still('p-bench', [b.x - b.w / 2 - 40, b.seatY - b.backH - 40, b.w + 80, GY - b.seatY + b.backH + 60], 1.25,
      () => { for (const q of polys) { wc(q, wood, 230, .05, .5); nib([...q, q[0]], .35, dk(wood, .5)); } }, () => { for (const q of polys) { c.moveTo(...q[0]); for (const v of q) c.lineTo(...v); c.closePath(); } }) }];
    if (w.item) props.push({ depth: w.item.held ? 200.5 : 199, draw: () => flower(w.item) });
    actors(F, true, props);
  }
  // Lago: morros ao longe, mata da outra margem, a água (por trás: o corpo do lago; pela frente, em multiply depois dos
  // atores: tinge o que está submerso, o peixe e as patas da raposa), a margem com o formigueiro e as plantas.
  function paintPlant(pl) {
    const { x, y, h, seed: sd } = pl, gr = mixCol(P.grassDk, P.grass, .4);
    if (pl.kind === 'tree') return paintTree(x, y, h, sd);
    if (pl.kind === 'reed') for (let i = 0; i < 3; i++) { const dx = (i - 1) * 9, hh = h * (1 - .15 * i), tx = x + dx + 10 * (hash(sd + i) - .5); wc(ribbon([[x + dx, y + 4], [tx, y - hh]], 5, 2), gr, 200, .05, .4); if (i < 2) wc(ell(tx, y - hh + .14 * h, 6, .1 * h, 8, sd + i), P.soilDk, 220, .05, .4); }
    else if (pl.kind === 'grass') for (let i = 0; i < 7; i++) { const a = (i - 3) * .22, hh = h * (.6 + .4 * hash(sd + i)); wc([[x - 3 + 2 * i, y + 3], [x + 2 * i + Math.sin(a) * hh, y - hh * Math.cos(a)], [x + 3 + 2 * i, y + 3]], i % 2 ? gr : P.grass, 200, .05, .4); }
    else {
      const col = ['#E07A9A', '#F0C74E', '#A58BD0'][sd % 3], tx = x + 6 * (hash(sd) - .5);
      nib([[x, y + 3], [tx, y - h]], .4, dk(gr, .3));
      for (const sg of [1, -1]) { const ly = y - (sg > 0 ? .3 : .5) * h; wc([[x, ly], [x + sg * 10, ly - 7], [x + sg * 18, ly - 3], [x + sg * 8, ly + 3]], gr, 210, .02, .4); }
      for (let i = 0; i < 6; i++) {
        const t = i * TAU / 6 + sd, u = [Math.cos(t), Math.sin(t)], v = [-u[1], u[0]], q = (a0, b0) => [tx + u[0] * a0 + v[0] * b0, y - h + u[1] * a0 + v[1] * b0], pet = [q(2, 0), q(6, -4.5), q(12, -3.5), q(14, 0), q(12, 3.5), q(6, 4.5)];
        wc(pet, col, 220, .02, .35); nib([...pet, pet[0]], .15, dk(col, .45));
      }
      wc(ell(tx, y - h, 4.5, 4.5, 8, sd), '#F0C74E', 235, .02, .3); nib(ell(tx, y - h, 4.5, 4.5, 8, sd), .15, dk('#F0C74E', .45));
    }
  }
  const PLANT_BOX = { tree: [.45, 1.1, 1.15], reed: [40, 30, 40], grass: [40, 10, 20], flower: [30, 20, 30] };
  function lake(F) {
    const w = F.world, L = w.lake, g = w.ground, WY = L.waterY, X1 = Math.min(L.x1, 2900), sh = F.shot, ns = w.nest;
    const [k, y0, y1, x0, x1] = { margem: [.55, 280, 1420, -1500, 3000], bebe: [1.25, 230, 1150, 600, 2300], chao: [1.6, 340, 1050, -600, 2700] }[sh];
    const mound = x => 30 * Math.max(0, 1 - ((x - ns.x) / (1.6 * ns.r)) ** 2), top = x => g(x) - mound(x);
    at(.15); for (const [x, y, s, sd] of [[-200, 260, 1.2, 21], [1000, 180, 1.4, 22], [2300, 280, 1.1, 23]]) cloud(x, y, s, sd);
    const hills = x => 690 + 45 * Math.sin(x * .0022 + 2) + 18 * Math.sin(x * .006), wood = x => 880 - 22 * Math.abs(Math.sin(x * .007)) - 14 * Math.abs(Math.sin(x * .019 + 1));
    if (sh !== 'chao') band('n-far', .3, -1500, 3200, 450, 1350, .6, terrain(hills, mixCol(P.far, P.skyLow, .45), { glaze: 70 }), hills);
    band('n-mid', .6, -1500, 3200, 650, 1350, .8, terrain(wood, mixCol(P.tree, P.skyLow, .35), { glaze: 30, dots: 90, deep: 40 }), wood);
    at(1);
    const water = '#7FA8C0', wx = L.x0 - 40, ww = X1 - wx;
    still('n-water-b', [wx, WY, ww, 600], .6, () => { wc([[wx, WY], [X1, WY], [X1, WY + 600], [wx, WY + 600]], mixCol(water, P.skyLow, .35), 200, .01, .5); wc([[wx, WY + 30], [X1, WY + 20], [X1, WY + 600], [wx, WY + 600]], water, 120, .02, .6); }, () => c.rect(wx, WY, ww, 600));
    band('n-ground-' + sh, 1, x0, x1, y0, y1, k, terrain(top, P.grass, { glaze: 90, ink: .5, dots: 300, deep: 300, extra: (a0, a1) => {
      const bank = [], kb = x => clamp((x - 1050) / 300); for (let x = Math.max(a0, 1050); x <= a1 + 80; x += 30) bank.push([x, top(x) - 2]);
      if (bank.length > 1) { wc([...bank, ...bank.slice().reverse().map(([x, y]) => [x, y + 70 * kb(x)])], mixCol(P.soil, P.path, .5), 200, .01, .5); wc([...bank.map(([x, y]) => [x, y + 30 * kb(x)]), ...bank.slice().reverse().map(([x, y]) => [x, y + 400 * kb(x) ** 2])], dk(P.soil, .15), 120, .01, .6); }
      wc(ell(ns.x, top(ns.x) - 6, 1.5 * ns.r, 22, 16, 5), mixCol(P.soil, P.path, .3), 200, .1, .5); wc(ell(ns.x + 8, top(ns.x + 8) + 2, 18, 7, 10, 6), P.cave, 230, .05, .3);
    } }), top);
    for (const pl of w.plants) {
      const [bx, bt, bb] = PLANT_BOX[pl.kind], half = pl.kind === 'tree' ? bx * pl.h : bx, up = pl.kind === 'tree' ? bt * pl.h : pl.h + bt, dn = pl.kind === 'tree' ? .05 * pl.h : bb - bt + 10;
      const [v0, v1] = span(1, half); if (pl.x + half < v0 || pl.x - half > v1) continue;
      const kp = sh === 'chao' ? 2 : sh === 'bebe' ? 1.25 : .6;
      still(`n-plant${pl.seed}-${kp}`, [pl.x - half, pl.y - up, 2 * half, up + dn], pl.kind === 'tree' ? Math.min(kp, 1) : kp, () => paintPlant(pl));
    }
    grass(1, top, 22, 14, 40, P.grassDk, { seed: 7, col2: P.grass, wind: .12, a: .8, xmax: L.x0 - 20 });
    const Lg = w.log, ty = Array.from({ length: 12 }, (_, i) => Lg.top(lerp(Lg.x0, Lg.x1, i / 11))), gy = Array.from({ length: 12 }, (_, i) => g(lerp(Lg.x0, Lg.x1, i / 11))), ly = Math.min(...ty) - 20;
    actors(F, true, [{ depth: Lg.depth, draw: () => still('n-log', [Lg.x0 - 20, ly, Lg.x1 - Lg.x0 + 40, Math.max(...gy) + 30 - ly], 1.25, () => logPaint(Lg, g)) }]);
    // Água pela frente: multiply sobre o que está abaixo da linha d'água; brilhos do papel, ondas e respingos por quadro.
    at(1); still('n-water-f', [wx, WY - 1, ww, 600], .6, () => { wc([[wx, WY], [X1, WY], [X1, WY + 600], [wx, WY + 600]], mixCol(water, '#FFFFFF', .2), 150, .01, .4); nibBroken([[wx + 40, WY], [X1, WY]], .35, 41, .6, 2, dk(water, .4)); });
    const lw = Math.max(1.2 / cam.z, 1.5);
    for (let i = 0; i < 40; i++) { const x = lerp(L.x0 + 30, X1, hash(i * 3.7 + 9)), y = WY + 6 + 120 * hash(i * 1.3) ** 2, l = 20 + 50 * hash(i * 7.1); line([[x, y], [x + l, y]], lw * 1.4, P.paper, .55); }
    for (const e of w.ripples) {
      const u = (F.t - e.t0) / 3, rx = e.r * (.15 + .85 * Math.sqrt(u));
      for (const s of [1, .6]) { c.beginPath(); c.ellipse(e.x, e.y + 2, rx * s, .16 * rx * s, 0, 0, TAU); c.globalAlpha = .7 * (1 - u); c.strokeStyle = dk(water, .35); c.lineWidth = lw * (2 - u); c.stroke(); }
    }
    for (const e of w.splashes) {
      const t = F.t - e.t0, G = 6 * e.r, kc = Math.sin(Math.PI * clamp(t / .5));
      if (kc > 0) blot(oval(e.x, e.y - .35 * e.r * kc, .22 * e.r, .4 * e.r * kc + 1, 0, e.x, 10), mixCol(water, P.paper, .55), lw, { shade: false, a: .75 });
      for (let i = 0; i < 12; i++) {
        const an = -Math.PI / 2 + 1.7 * (hash(e.x * .37 + i * 7.1) - .5), v = e.r * (2.4 + 1.6 * hash(i * 3.3 + e.x)), x = e.x + Math.cos(an) * v * t, y = e.y + Math.sin(an) * v * t + .5 * G * t * t, s = .07 * e.r * (1 - .4 * t);
        if (y < e.y + 2) blot(oval(x, y, s, 1.3 * s, an, i, 7), mixCol(water, P.paper, .4), lw * .7, { shade: false, a: .85 });
      }
    }
    c.globalAlpha = 1;
  }

  // ---------- cena K (kit de episódio, src/episode/kit.js) ----------
  // O que não se move (céu, camadas, cômodo, mapa) é pintado uma vez em p5.brush e guardado por cena + parâmetros + mood
  // (a chave sai só do quadro: cena, mood, semente e o que muda com os extras e o clima). O que se move é pintado por
  // quadro em Canvas2D: estrelas, astro, nuvens, janelas acesas, ondas, adereços, chama, atores, luzes e clima.
  const SURF = { grass: P.grass, sand: '#D9B47A', stone: '#B3A898', snow: '#EEF0EE' }, WALL = '#D9C29A', ROOF = '#A65A3C', BARK = mixCol(P.soilDk, P.stone, .35);
  const tintOf = (M, f) => f < .3 ? M.far : f < .7 ? M.mid : M.near;
  const kOf = f => .55 + .55 * f;  // px de pincel por px do mundo: o perto mais nítido
  // Polígono com pontos a cada s px nas bordas (borda longa reta vaza em dentes no brush).
  const dense = (p, s = 40) => p.flatMap((a, i) => { const b = p[(i + 1) % p.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / s)); return Array.from({ length: n }, (_, j) => [lerp(a[0], b[0], j / n), lerp(a[1], b[1], j / n)]); });
  const skyK = M => () => { flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], M.skyLow); paintSky(M, 200); };
  // Faixa de perfil (serra, duna, chão) na tela inteira da camada.
  function profBand(key, l, paint) {
    let y0 = 1e9; for (let x = -240; x <= 2160; x += 20) y0 = Math.min(y0, l.prof(x));
    band(key, l.f, -240, 2160, y0 - 50, 1160, kOf(l.f), paint, l.prof);
  }
  // Prédio: corpo e telhado (x = meio da base, y = base); os mesmos polígonos pintam e mascaram.
  function bpolys(b) {
    // O pé desce 34 px (some atrás do chão), menos na torre (o farol fica na água).
    const l = b.x - b.w / 2, r = b.x + b.w / 2, t = b.y - b.h, w = b.w, ft = b.y + (b.roof === 'tower' ? 8 : 34), body = [[l, ft], [l, t], [r, t], [r, ft]];
    const roof = b.roof === 'gable' ? [[l - .08 * w, t + 2], [b.x, t - .4 * w], [r + .08 * w, t + 2]]
      : b.roof === 'tower' ? [[l - .1 * w, t + 2], [b.x, t - .8 * w], [r + .1 * w, t + 2]]
      : b.roof === 'dome' ? Array.from({ length: 13 }, (_, i) => [b.x - .46 * w * Math.cos(i * Math.PI / 12), t + 2 - w / 3 * Math.sin(i * Math.PI / 12)])
      : b.roof === 'temple' ? [[l - .05 * w, t + 4], [l - .05 * w, t - .06 * w], [b.x, t - .2 * w], [r + .05 * w, t - .06 * w], [r + .05 * w, t + 4]]
      : [[l - 5, t + 5], [l - 5, t - 10], [r + 5, t - 10], [r + 5, t + 5]];  // flat: parapeito
    return [body, roof];
  }
  function paintBuildings(items, tint, ink, sd) {
    items.forEach((b, i) => {
      const [body, roof] = bpolys(b).map(p => dense(p)), wall = mixCol(WALL, tint, .4), l = b.x - b.w / 2, t = b.y - b.h;
      flat(body, mixCol(wall, '#FFFFFF', .35)); wc(body, wall, 200, .08, .55);
      wc(dense([[l, b.y + 8], [l, t + .55 * b.h], [l + b.w, t + .7 * b.h], [l + b.w, b.y + 8]]), dk(wall, .15), 70, .15, .6);  // sombra de baixo
      if (b.roof === 'temple') for (let k = 0; k < 6; k++) { const x = l + b.w * (.12 + .152 * k); wc([[x, t + .14 * b.h], [x + .07 * b.w, t + .14 * b.h], [x + .07 * b.w, b.y], [x, b.y]], dk(wall, .35), 160, .05, .4); }  // vãos entre as colunas
      flat(roof, mixCol(b.roof === 'temple' || b.roof === 'flat' ? wall : ROOF, tint, .35)); wc(roof, dk(mixCol(b.roof === 'temple' || b.roof === 'flat' ? wall : ROOF, tint, .35), .1), 150, .1, .5);
      for (const w of b.windows) wc([[w.x, w.y], [w.x + w.w, w.y], [w.x + w.w, w.y + w.h], [w.x, w.y + w.h]], dk(wall, .55), 210, .04, .3);
      if (ink) { nibBroken([...body, body[0]], ink, sd + i * 9, .6, 1, dk(wall, .55)); nibBroken([...roof, roof[0]], ink, sd + i * 9 + 5, .7, 1, dk(wall, .6)); }
    });
  }
  function paintTrees(trees, tint, ink) {
    const leaf = mixCol(P.tree, tint, .45), pine = mixCol('#4E7458', tint, .45), bark = mixCol(BARK, tint, .4);
    for (const tr of trees) {
      const { x, y, h, seed: sd } = tr;
      if (tr.kind === 'pine') {
        wc(ribbon([[x, y + 4], [x, y - .35 * h]], .05 * h, .03 * h), bark, 200, .03, .4);
        for (let i = 0; i < 3; i++) {
          const yb = y - .2 * h - .25 * h * i, w = h * [.32, .25, .17][i], ap = [x + .04 * h * (hash(sd + i) - .5), yb - .3 * h - (i === 2 ? .05 * h : 0)];
          const tier = [[x - w, yb], ap, [x + w, yb], [x + .35 * w, yb + .05 * h], [x - .4 * w, yb + .04 * h]];
          wc(tier, i ? pine : dk(pine, .12), 200, .1, .5);
          if (ink) nibBroken([[x - w, yb], ap, [x + w, yb]], ink, sd * 3 + i, .6, 1, dk(pine, .45));
        }
      } else if (tr.kind === 'palm') {
        const top = [x + .12 * h, y - h];
        wc(ribbon(chaikin([[x, y + 4], [x + .06 * h, y - .5 * h], top]), .05 * h, .03 * h), bark, 200, .03, .4);
        for (let i = 0; i < 6; i++) { const a = Math.PI * (1.05 + .9 * i / 5), e = [top[0] + .38 * h * Math.cos(a), top[1] + .38 * h * Math.sin(a) + .18 * h]; wc(ribbon(chaikin([top, [(top[0] + e[0]) / 2, top[1] - .06 * h], e]), .07 * h, .01 * h), leaf, 200, .08, .5); }
      } else {
        wc(ribbon([[x, y + 4], [x + .02 * h, y - .55 * h]], .07 * h, .035 * h), bark, 200, .03, .4);
        const crown = [[-.2, -.62, .26], [.05, -.8, .3], [.22, -.6, .22], [0, -.5, .24]];
        for (const [dx, k, r] of crown) wc(ell(x + dx * h, y + k * h, r * h, .82 * r * h, 16, sd + dx), leaf, 190, .15, .55);
        for (const [dx, k, r] of crown) wc(ell(x + dx * h + 4, y + (k + .1 * r) * h, .8 * r * h, .45 * r * h, 14, sd + k), dk(leaf, .3), 80, .2, .6);
      }
    }
  }
  function paintSea(l, col) {
    const R = dense([[-260, l.y], [2180, l.y], [2180, 1180], [-260, 1180]]);
    flat(R, mixCol(col, '#FFFFFF', .4)); wc(R, col, 190, .1, .55);
    wc(dense([[-260, l.y + 90], [2180, l.y + 60], [2180, 1180], [-260, 1180]]), dk(col, .15), 90, .2, .6);
    for (let i = 0; i < 12; i++) { const x = lerp(-200, 2100, hash(i * 3.7 + 1)), y = l.y + 20 + 260 * hash(i * 1.9 + 2) ** 2, r = 80 + 200 * hash(i * 5.3); wc(ell(x, y, 2.5 * r, .12 * r, 14, i), dk(col, .2), 60, .3, .6); }
  }
  // Adereço de camada (por quadro): k = movimento próprio, contínuo na emenda.
  function propK(o, M, tint) {
    const { x, y, s } = o, lw = Math.max(1.2 / cam.z, .012 * s), sd = sid(o.kind + o.seed + Math.round(x));
    if (o.kind === 'ship') {
      const wood = mixCol('#6B4A34', tint, .3), sail = mixCol(P.paper, tint, .2);
      c.save(); c.translate(x, y); c.rotate(.06 * (o.k - .5));
      line([[0, -.1 * s], [0, -1.05 * s]], .03 * s, dk(wood, .2));
      blot([[.04 * s, -.98 * s], [.5 * s, -.3 * s], [.04 * s, -.24 * s]], sail, lw, { shade: false });
      blot([[-.04 * s, -.85 * s], [-.04 * s, -.26 * s], [-.4 * s, -.3 * s]], dk(sail, .08), lw, { shade: false });
      blot([[-.62 * s, -.16 * s], [.66 * s, -.16 * s], [.44 * s, .1 * s], [-.46 * s, .1 * s]], wood, lw);
      c.restore();
    } else if (o.kind === 'camel') {
      const col = mixCol('#B98A55', tint, .35), dkc = dk(col, .3), hy = y - (1 + .08 * o.k) * s;
      for (const [d, far] of [[-.28, 1], [.3, 1], [-.2, 0], [.38, 0]]) line([[x + d * s, y - .62 * s], [x + (d + .03) * s, y]], .055 * s, far ? dkc : dk(col, .12));
      line([[x + .32 * s, y - .72 * s], [x + .55 * s, hy]], .09 * s, col);
      blot(oval(x, y - .72 * s, .42 * s, .19 * s, 0, sd), col, lw);
      blot(oval(x - .04 * s, y - .88 * s, .17 * s, .12 * s, 0, sd + 5, 10), col, lw, { shade: false });
      blot(oval(x + .62 * s, hy, .1 * s, .06 * s, .2, sd + 9, 9), col, lw, { shade: false });
    } else if (o.kind === 'column') {
      const col = mixCol(P.stone, tint, .35), w = 15, top = y - s;
      blot([[x - w, y], [x - w, top + 6], [x - 5, top - 9 * hash(sd)], [x + 4, top + 7], [x + w, top - 6 * hash(sd + 1)], [x + w, y]], col, lw, { light: false });
      line([[x + 4, y - 4], [x + 4, top + 12]], 3, dk(col, .25), .6);
      blot(oval(x, y - 6, w + 9, 8, 0, sd + 3, 10), dk(col, .1), lw, { shade: false });
    } else if (o.kind === 'fire') {
      const h = s * (.7 + .3 * o.k), wood = dk(BARK, .2);
      line([[x - .5 * s, y], [x + .45 * s, y - .12 * s]], .1 * s, wood); line([[x - .45 * s, y - .12 * s], [x + .5 * s, y]], .1 * s, dk(wood, .2));
      blot([[x, y - h], [x + .32 * h, y - .4 * h], [x + .22 * h, y - .05 * h], [x - .22 * h, y - .05 * h], [x - .3 * h, y - .45 * h]], '#E2783A', lw, { shade: false, a: .9 });
      blot([[x + .03 * h, y - .66 * h], [x + .16 * h, y - .3 * h], [x, y - .1 * h], [x - .15 * h, y - .3 * h]], '#F6D46A', lw, { shade: false, a: .95, rim: '#E8A040' });
    } else if (o.kind === 'rock') blot(oval(x, y - .45 * s, 1.15 * s, .55 * s, 0, sd, 14, .1), mixCol(P.stone, tint, .3), lw);
  }
  // Céu por quadro na câmera da camada f: astro com o brilho, estrelas que cintilam, nuvens que balançam e o meteoro.
  function skyItems(S, mood, f) {
    const M = STYLE.moods[mood]; at(f);
    const lw = Math.max(1 / cam.z, 1.2), o = S.celestial;
    for (const s of S.stars) { c.beginPath(); c.arc(s.x, s.y, s.r * (.7 + .5 * s.tw), 0, TAU); c.globalAlpha = .35 + .6 * s.tw; c.fillStyle = '#FFF8E6'; c.fill(); }
    c.globalAlpha = 1;
    if (o) {
      const sun = o.kind === 'sun', R = o.r * (sun ? 2.6 + 2 * o.glow : 3), g = c.createRadialGradient(o.x, o.y, o.r * .8, o.x, o.y, R), gc = sun ? M.glow : '#E8ECF5';
      g.addColorStop(0, gc); g.addColorStop(1, gc + '00'); c.globalCompositeOperation = 'screen'; c.globalAlpha = (sun ? .55 : .35) * (.5 + .5 * o.glow); c.fillStyle = g; c.fillRect(o.x - R, o.y - R, 2 * R, 2 * R);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      const col = sun ? mixCol('#FFE9B0', M.glow, .3) : '#F2EEDF';
      blot(oval(o.x, o.y, o.r, o.r, 0, 77, 20, .03), col, lw, { shade: false, light: false, rim: dk(col, .2) });
      if (!sun) for (const [u, v, r] of [[-.3, -.2, .22], [.25, .15, .16], [-.05, .4, .12]]) { c.beginPath(); c.arc(o.x + u * o.r, o.y + v * o.r, r * o.r, 0, TAU); c.globalAlpha = .35; c.fillStyle = dk(col, .2); c.fill(); }
      c.globalAlpha = 1;
    }
    for (const cl of S.clouds) cloud(cl.x, cl.y, cl.w / 320, cl.seed, mood);
    const m = S.meteor;
    if (m && m.k > 0 && m.k < 1) {
      const x = lerp(m.x0, m.x1, m.k), y = lerp(m.y0, m.y1, m.k), dx = m.x1 - m.x0, dy = m.y1 - m.y0;
      for (let i = 0; i < 4; i++) line([[x - dx * .07 * i, y - dy * .07 * i], [x - dx * .07 * (i + 1), y - dy * .07 * (i + 1)]], 3.2 - .6 * i, '#FFF8E6', .9 - .22 * i);
    }
  }
  // Clima na câmera do chão; win = janela do interior (já recortada por quem chama).
  function weatherK(Wt, M, win) {
    at(1);
    if (Wt.kind === 'rain') { c.beginPath(); for (const d of Wt.drops) { c.moveTo(d.x, d.y); c.lineTo(d.x - 3, d.y - 14 - 22 * d.k); } c.globalAlpha = .45; c.strokeStyle = M.light; c.lineWidth = 1.6; c.lineCap = 'round'; c.stroke(); }
    else if (Wt.kind === 'snow') { c.fillStyle = '#FFFDF6'; for (const d of Wt.drops) { c.beginPath(); c.arc(d.x, d.y, 1.6 + 2.6 * d.k, 0, TAU); c.globalAlpha = .55 + .4 * d.k; c.fill(); } }
    c.globalAlpha = 1;
    if (!Wt.fog) return;
    const col = mixCol(M.skyLow, '#FFFFFF', .35);
    if (win) { c.globalAlpha = .55 * Wt.fog; c.fillStyle = col; c.fillRect(win.x, win.y, win.w, win.h); c.globalAlpha = 1; return; }
    c.resetTransform(); const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col + '40'); g.addColorStop(.6, col + 'b0'); g.addColorStop(1, col + 'd0');
    c.globalAlpha = Wt.fog; c.fillStyle = g; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  }
  // Luzes somam (screen): janelas, vela, fogueira, farol e o miolo dos vaga-lumes.
  function lightsK(list, M) {
    c.globalCompositeOperation = 'screen';
    for (const l of list) {
      if (l.k <= 0) continue;
      at(l.f ?? 1); const R = l.r < 20 ? 4 * l.r : l.r, g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, R);
      g.addColorStop(0, M.glow); g.addColorStop(1, M.glow + '00'); c.globalAlpha = (l.r < 20 ? .7 : .45) * l.k; c.fillStyle = g; c.fillRect(l.x - R, l.y - R, 2 * R, 2 * R);
      if (l.r < 20) { c.beginPath(); c.arc(l.x, l.y, .3 * l.r, 0, TAU); c.globalAlpha = l.k; c.fillStyle = '#FFF6C0'; c.fill(); }
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  // Cômodo (parado): parede com manchas, lambri, assoalho e os móveis fixos (estante, mesa, vela, livro, rolo).
  const paintRoom = (I, M) => () => {
    const fy = I.floorY, rect = (x0, y0, x1, y1) => dense([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), wall = rect(-260, -160, 2180, fy + 4), wood = M.near;
    flat(wall, mixCol(M.far, '#FFFFFF', .35)); wc(wall, M.far, 170, .04, .6);
    for (let i = 0; i < 16; i++) { const x = lerp(-200, 2100, hash(i * 5.1 + 3)), y = lerp(-100, fy - 120, hash(i * 2.3 + 1)), r = 90 + 160 * hash(i * 7.7); wc(ell(x, y, 1.5 * r, r, 16, i), dk(M.far, .12), 45, .35, .7); }
    wc(rect(-260, fy - 170, 2180, fy + 4), M.mid, 150, .04, .5);
    const hz = y => Array.from({ length: 25 }, (_, i) => [-260 + i * 100, y + 2 * Math.sin(i * 1.7 + y)]);
    const floor = rect(-260, fy, 2180, 1300); flat(floor, mixCol(M.ground, '#FFFFFF', .3)); wc(floor, M.ground, 200, .04, .5);
    for (let j = 1; j < 7; j++) nibBroken(hz(fy + 14 * j * j), .3, j * 7, .6, 2, dk(M.ground, .45));
    for (const o of I.props) {
      const { x, y, s } = o;
      if (o.kind === 'shelf') {
        wc(rect(x - o.w / 2, y - s, x + o.w / 2, y), wood, 220, .05, .4); nibBroken([[x - o.w / 2, y - s], [x + o.w / 2, y - s]], .35, 3, .8, 1, dk(wood, .5));
        for (let i = 0, bx = x - o.w / 2 + 14; i < 10 && bx < x + o.w / 2 - 30; i++) { const bw = 18 + 14 * hash(i * 3.1), bh = 60 + 40 * hash(i * 1.7), col = ['#8A3A2A', '#3F5E7A', '#7A6A3A', '#5E7A4A'][i % 4]; wc(rect(bx, y - s - bh, bx + bw, y - s), col, 210, .05, .4); bx += bw + 3; }
      } else if (o.kind === 'table') {
        wc(ell(x, y + 16, .6 * o.w, 14, 16, 3), M.shade, 60, .3, .6);
        for (const d of [-.42, .42]) wc(ribbon([[x + d * o.w, y - s + 10], [x + d * o.w, y]], 16, 12), dk(wood, .15), 220, .04, .4);
        const top = rect(x - o.w / 2 - 12, y - s - 4, x + o.w / 2 + 12, y - s + 14); wc(top, wood, 230, .05, .5); nibBroken([...top, top[0]], .4, 9, .7, 1, dk(wood, .55));
      } else if (o.kind === 'candle') {
        wc(ell(x, y - 3, 24, 7, 12, 5), '#9A8A6A', 220, .05, .4); wc(rect(x - 9, y - s, x + 9, y - 3), '#EFE6CC', 230, .05, .4); nib([[x, y - s], [x + 1, y - s - 7]], .3, P.ink);
      } else if (o.kind === 'book') {
        wc(rect(x - s / 2, y - 16, x + s / 2, y), '#8A3A2A', 220, .05, .4); wc(rect(x - s / 2 + 4, y - 12, x + s / 2 - 2, y - 4), '#EFE6CC', 200, .03, .3);
      } else if (o.kind === 'scroll') {
        wc(ell(x, y - 9, s / 2, 9, 14, 7), '#E2CFA0', 220, .05, .4); for (const d of [-1, 1]) wc(ell(x + d * s / 2, y - 9, 7, 11, 10, 8 + d), dk('#E2CFA0', .2), 220, .05, .4);
      }
    }
  };
  function chairK(o, wood, lw) {
    const { x, y, s, dir } = o, top = y - s;
    for (const d of [-.5, .5]) limb([[x + d * s, top], [x + d * s, y]], .1 * s, dk(wood, .15), lw);
    limb([[x - dir * .5 * s, top], [x - dir * .55 * s, top - 1.5 * s]], .12 * s, wood, lw);
    limb([[x - .62 * s, top], [x + .62 * s, top]], .14 * s, wood, lw);
  }
  // Mapa (parado): papel sobre a mesa, mar, terras, costa a nanquim e as cidades; a rota é por quadro.
  const paintMap = Mp => () => {
    const { x, y, w, h } = Mp.paper, R = dense([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    flat(R, '#EFE3C6'); wc(R, '#9FBBB9', 150, .2, .6);
    for (let i = 0; i < 10; i++) { const u = x + w * hash(i * 4.3 + 1), v = y + h * hash(i * 2.9 + 3), r = 60 + 140 * hash(i * 6.1); wc(ell(u, v, 1.4 * r, r, 16, i), '#C9B98E', 50, .35, .7); }
    Mp.coasts.forEach((co, i) => {
      const cx = co.reduce((a, p) => a + p[0], 0) / co.length, cy = co.reduce((a, p) => a + p[1], 0) / co.length;
      for (let j = 0; j < co.length; j += 2) { const [u, v] = co[j], d = Math.hypot(u - cx, v - cy) || 1, e = 1 + 30 / d, a = Math.atan2(v - cy, u - cx) + Math.PI / 2; nib([[cx + e * (u - cx) - 9 * Math.cos(a), cy + e * (v - cy) - 9 * Math.sin(a)], [cx + e * (u - cx) + 9 * Math.cos(a), cy + e * (v - cy) + 9 * Math.sin(a)]], .35, '#5E7E86'); }
      flat(co, '#E6D6A8'); wc(co, '#CDB377', 200, .1, .5); wc(co.map(([u, v]) => [cx + .72 * (u - cx), cy + .72 * (v - cy)]), '#9FAE70', 150, .3, .6);
      nibBroken([...co, co[0]], .55, i * 11, .85, 4, '#5A4632');
    });
    for (const [i, m] of Mp.marks.entries()) { wc(ell(m.x, m.y, 9, 9, 10, i), '#8A3A2A', 230, .05, .3); nib([...ell(m.x, m.y, 16, 16, 12, i + 4), ell(m.x, m.y, 16, 16, 12, i + 4)[0]], .35, '#5A2E22'); }
    nibBroken([...R, R[0]], .6, 4, .8, 1, '#7A5A3A');
  };
  let KBASE = null;
  function kitScene(F) {
    const K = F.world.kit, S = K.sky, I = K.interior, M = STYLE.moods[K.mood], base = `K|${F.shot}|${K.mood}|${K.seed}`;
    // Cena nova (cena + mood + semente): os caches K da anterior saem (10 a 40 MB por cena); o quadro não muda, só o tempo.
    if (base !== KBASE) { for (const key of STILL.keys()) if (key[0] === 'K') STILL.delete(key); KBASE = base; }
    if (K.map) {
      const Pp = K.map.paper, r = K.map.route;
      at(1); still('Kdesk', [-140, -100, W + 280, H + 200], .4, () => { const R = dense([[-200, -160], [W + 200, -160], [W + 200, H + 160], [-200, H + 160]], 80); flat(R, '#C9A27A'); wc(R, '#A87A52', 150, .2, .6); for (let j = 0; j < 22; j++) wc(ell(W * hash(j * 3.3), 30 + 48 * j, 500 + 500 * hash(j * 1.7), 9 + 8 * hash(j), 24, j), '#8A6040', 70, .2, .6); });
      at(1); still(`Kmap|${K.seed}`, [Pp.x - 20, Pp.y - 20, Pp.w + 40, Pp.h + 40], 1, paintMap(K.map), () => c.rect(Pp.x, Pp.y, Pp.w, Pp.h));
      if (r) {  // trecho da rota até a fração k do comprimento, tracejado em vermelho-terra
        const d = r.pts.slice(1).map((q, i) => Math.hypot(q[0] - r.pts[i][0], q[1] - r.pts[i][1])); let left = r.k * d.reduce((a, b) => a + b, 0); const pts = [r.pts[0]];
        for (let i = 0; i < d.length && left > 0; i++) { const u = Math.min(1, left / d[i]); pts.push([lerp(r.pts[i][0], r.pts[i + 1][0], u), lerp(r.pts[i][1], r.pts[i + 1][1], u)]); left -= d[i]; }
        c.setLineDash([18, 12]); line(pts, 5, '#9A3A2A', .85); c.setLineDash([]);
        const [hx, hy] = pts.at(-1); c.beginPath(); c.arc(hx, hy, 7, 0, TAU); c.fillStyle = '#9A3A2A'; c.fill();
      }
      return;
    }
    if (I) {  // no interior, céu e clima pela câmera da janela (f = 1), recortados por ela; a hora sai do astro e da luz da janela
      const w = I.window, wm = S.celestial ? 'night' : K.lights.some(l => l.x === w.x + w.w / 2 && l.k >= .6) ? 'day' : 'dusk';
      at(1); c.save(); c.beginPath(); c.rect(w.x, w.y, w.w, w.h); c.clip();
      still('Kwin|' + wm, [w.x, w.y, w.w, w.h], .5, skyK(STYLE.moods[wm]));
      skyItems(S, wm, 1); weatherK(K.weather, STYLE.moods[wm], w); c.restore();
      at(1); still(`Kroom|${K.seed}|` + I.props.filter(o => o.kind !== 'chair').map(o => o.kind + o.x + ',' + o.y).join(';'), [-240, -120, 2400, I.floorY + 360], .6, paintRoom(I, M),
        () => { c.rect(-240, -120, 2400, I.floorY + 360); c.moveTo(w.x, w.y); c.lineTo(w.x, w.y + w.h); c.lineTo(w.x + w.w, w.y + w.h); c.lineTo(w.x + w.w, w.y); c.closePath(); });
      const lw = Math.max(1.2 / cam.z, 1.5), fr = [[w.x, w.y], [w.x + w.w, w.y], [w.x + w.w, w.y + w.h], [w.x, w.y + w.h], [w.x, w.y]];
      limb([[w.x + w.w / 2, w.y], [w.x + w.w / 2, w.y + w.h]], 9, M.near, lw); limb([[w.x, w.y + .45 * w.h], [w.x + w.w, w.y + .45 * w.h]], 9, M.near, lw);
      limb(fr, 16, M.near, lw); limb([[w.x - 24, w.y + w.h + 10], [w.x + w.w + 24, w.y + w.h + 10]], 16, dk(M.near, .1), lw);
      for (const o of I.props) {
        if (o.kind === 'chair') chairK(o, M.near, lw);
        if (o.flame) { const h = o.flame.h, x = o.x, y = o.y - o.s - 4; blot([[x, y - h], [x + .3 * h, y - .35 * h], [x, y], [x - .3 * h, y - .35 * h]], '#F2A93B', lw, { shade: false, rim: '#D9782E' }); blot([[x, y - .6 * h], [x + .14 * h, y - .25 * h], [x, y - .05 * h], [x - .14 * h, y - .25 * h]], '#FFF1B0', lw, { shade: false, rim: '#F6C860' }); }
      }
    } else {
      c.resetTransform(); still('Ksky|' + K.mood, [0, 0, W, H], .5, skyK(M));
      skyItems(S, K.mood, 0);
    }
    for (const l of K.layers) {
      const tint = tintOf(M, l.f), ink = l.f >= .45 ? .2 + .4 * l.f : 0, key = `${base}|${l.kind}|${l.f}`, tk = { dense: true, light: K.mood === 'night' ? .08 : .3 };
      if (l.kind === 'ridge') profBand(key, l, terrain(l.prof, tint, { ...tk, glaze: 40 + 40 * l.f, ink, dots: 200, deep: 80 }));
      else if (l.kind === 'dunes') profBand(key, l, terrain(l.prof, mixCol(SURF.sand, tint, .4), { ...tk, glaze: 40, ink, dots: 260, deep: 80 }));
      else if (l.kind === 'ground') {
        const col = l.surface === 'grass' ? M.ground : mixCol(SURF[l.surface], M.ground, .4);
        profBand(key + l.surface, l, terrain(l.prof, col, { ...tk, glaze: 70, ink: .6, dots: 220, deep: 200 }));
        if (l.surface === 'grass') grass(1, l.prof, 16, 10, 28, dk(col, .25), { seed: K.seed, col2: col, loop: K.phase, a: .75 });
      } else if (l.kind === 'treeline') {
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const t of l.trees) { x0 = Math.min(x0, t.x - .45 * t.h); x1 = Math.max(x1, t.x + .45 * t.h); y0 = Math.min(y0, t.y - 1.1 * t.h); y1 = Math.max(y1, t.y + 12); }
        at(l.f); still(key, [x0, y0, x1 - x0, y1 - y0], kOf(l.f), () => paintTrees(l.trees, tint, ink));
      } else if (l.kind === 'buildings') {
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const b of l.items) for (const p of bpolys(b)) for (const [x, y] of p) { x0 = Math.min(x0, x - 20); x1 = Math.max(x1, x + 20); y0 = Math.min(y0, y - 20); y1 = Math.max(y1, y + 20); }
        at(l.f); still(key + '|' + l.items.map(b => b.x + b.roof).join(), [x0, y0, x1 - x0, y1 - y0], Math.min(kOf(l.f), 3800 / (x1 - x0)), () => paintBuildings(l.items, tint, ink, K.seed),
          () => { for (const b of l.items) for (const p of bpolys(b)) { c.moveTo(...p[0]); for (const v of p) c.lineTo(...v); c.closePath(); } });
        c.fillStyle = mixCol(M.glow, '#FFFFFF', .2);
        for (const b of l.items) for (const w of b.windows) if (w.lit > 0) { c.globalAlpha = .9 * w.lit; c.fillRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4); }
        c.globalAlpha = 1;
      } else if (l.kind === 'sea') {
        const col = mixCol('#6F9DB8', tint, .35);
        at(l.f); still(key, [-260, l.y - 4, 2440, 1184 - l.y], .7, () => paintSea(l, col), () => c.rect(-260, l.y, 2440, 1180 - l.y));
        for (const wv of l.waves) line([[wv.x - wv.len / 2, wv.y - 3 * wv.k], [wv.x + wv.len / 2, wv.y - 3 * wv.k]], 2.4, M.light, .2 + .5 * wv.k);
      } else if (l.kind === 'props') { at(l.f); for (const o of l.items) propK(o, M, tint); }
    }
    actors(F, false); actors(F, true);
    if (I) {  // o cômodo escurece longe da vela (multiply), mais à noite
      const L0 = K.lights[0], wm = S.celestial ? .6 : .3, g = c.createRadialGradient(L0.x, L0.y, .25 * L0.r, L0.x, L0.y, 1.7 * L0.r);
      at(1); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, M.shade); c.globalCompositeOperation = 'multiply'; c.globalAlpha = wm; c.fillStyle = g; c.fillRect(-300, -200, 2520, 1500);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    lightsK(K.lights, M);
    if (!I) weatherK(K.weather, M, null);
  }

  // ---------- papel e texto ----------
  // Papel: cor, manchas largas, fibras e grão por pixel; uma vez, entra em multiply sobre o quadro pronto.
  let PAPER = null;
  function makePaper() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
    const id = g.getImageData(0, 0, W, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = rnd() < .5 ? 1 - .14 * rnd() * rnd() : 1; d[i] *= v; d[i + 1] *= v; d[i + 2] *= v * .995; }
    g.putImageData(id, 0, 0);
    for (let i = 0; i < 70; i++) { const x = rnd() * W, y = rnd() * H, r = 120 + rnd() * 380, gr = g.createRadialGradient(x, y, 0, x, y, r), a = .05 * rnd(); gr.addColorStop(0, `rgba(160,125,80,${a})`); gr.addColorStop(1, 'rgba(160,125,80,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    g.lineWidth = 1;
    for (let i = 0; i < 2200; i++) { const x = rnd() * W, y = rnd() * H, l = 6 + rnd() * 26, a = rnd() * TAU; g.strokeStyle = `rgba(110,88,60,${.04 + rnd() * .07})`; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    const v = g.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(150,120,90,.25)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    return cv;
  }
  // Título: faixa de aguada amarelo-limão pintada uma vez e a letra em nanquim sépia, por baixo do papel.
  function title(s) {
    c.setTransform(1, 0, 0, 1, s.x, s.y); c.globalAlpha = s.k;
    still('title', [-560, -90, 1120, 180], 1, () => { wc(ell(0, 6, 470, 52, 24, 4), mixCol(P.leaf, '#F3E27A', .6), 120, .3, .6); wc(ell(-40, 14, 380, 30, 20, 8), mixCol(P.leaf, '#F3E27A', .3), 60, .3, .6); });
    c.globalAlpha = s.k; c.font = `italic 600 ${s.size}px Georgia, "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = P.ink; c.fillText(s.text, 0, 0); c.globalAlpha = 1; c.resetTransform();
  }

  return {
    parts,
    draw(F) {
      c = X; cam = F.cam; T = F.t; A = 1;
      c.resetTransform(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
      if (F.scene === 'K') kitScene(F);
      else {
        still('sky', [0, 0, W, H], .5, paintSky);
        ({ close, wide, name, trail, praca: plaza, encontro: plaza, achado: plaza, banco: plaza, margem: lake, bebe: lake, chao: lake })[F.shot](F);
      }
      c.resetTransform(); c.globalAlpha = 1;
      for (const s of F.texts) if (s.k > 0) title(s);
      if (!PAPER) PAPER = makePaper();
      c.globalCompositeOperation = 'multiply'; c.drawImage(PAPER, 0, 0); c.globalCompositeOperation = 'source-over';
    },
  };
})();
