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
  function paintSky() {
    const band = (y0, y1, sd) => [...Array.from({ length: 13 }, (_, i) => [-60 + i * 170, y0 + 30 * Math.sin(i * 1.3 + sd)]), ...Array.from({ length: 13 }, (_, i) => [W + 60 - i * 170, y1 + 45 * Math.sin(i * .9 + sd)])];
    wc(band(-80, 640, 1), P.skyTop, 140, .25, .6);
    wc(band(-80, 300, 2), dk(P.skyTop, .12), 70, .3, .6);
    wc(band(700, H + 80, 3), P.skyLow, 120, .25, .5);
  }
  // Terreno de uma camada: base chapada clara, mancha que vaza, veladura mais escura abaixo da crista, manchinhas de
  // granulação e a crista em nanquim leve e quebrado (ink = espessura; 0 no distante).
  const terrain = (prof, col, o = {}) => (x0, x1, yb) => {
    const top = []; for (let x = x0 - 40; x <= x1 + 80; x += 30) top.push([x, prof(x)]);
    const below = (d, amp = 14) => [...top.map(([x, y]) => [x, y + d + (d ? amp * Math.sin(x * .011 + d) : 0)]), [x1 + 80, yb + 20], [x0 - 40, yb + 20]];
    flat(below(5), mixCol(col, '#FFFFFF', .45));
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
      const x = k * step + step * hash(k * 1.3 + sd), h = lerp(h0, h1, hash(k * 2.7 + sd)) * (hash(k * .7 + sd) < (o.gap || 0) ? .3 : 1);
      blade(x, gy(x) + (o.dy || 3), h, .5 * (hash(k * 5.1 + sd) - .5) + (o.wind ?? .12) * noise1(sd + 3, T * .6 + x * .002), k & 1 ? col : (o.col2 || col), rim, (o.a ?? .85) * A);
    }
    c.globalAlpha = 1;
  }
  // Nuvem: papel reservado (a máscara abre o céu em branco) com a sombra cinza-azulada só por baixo.
  const CLOUD = [[-80, 10, 50], [-25, -15, 62], [40, -5, 55], [85, 15, 40], [0, 22, 70]];
  function cloud(x, y, s, sd) {
    c.save(); c.translate(x, y);
    still('cloud' + sd, [-170 * s, -110 * s, 340 * s, 220 * s], 1, () => CLOUD.forEach(([dx, dy, r], i) => wc(ell(dx * s, (dy + 18) * s, .9 * r * s, .5 * r * s, 16, sd * 9 + i), mixCol(P.skyTop, P.far, .5), 90, .25, .5)),
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
  function limb(pts, w, col, lw, rim = dk(col, .4)) {
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineCap = c.lineJoin = 'round';
    c.globalAlpha = .7 * A; c.strokeStyle = rim; c.lineWidth = w + 2 * lw; c.stroke();
    c.globalAlpha = .95 * A; c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.globalAlpha = 1;
  }
  function taper(pts, ws, col, lw) {
    const L = [], R = [];
    pts.forEach(([x, y], i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = ws[i] / 2;
      L.push([x - dy / d * w, y + dx / d * w]); R.push([x + dy / d * w, y - dx / d * w]);
    });
    c.beginPath(); [...L, ...R.reverse()].forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.lineJoin = 'round';
    c.globalAlpha = .55 * A; c.fillStyle = col; c.fill(); c.globalAlpha = .75 * A; c.strokeStyle = dk(col, .45); c.lineWidth = lw; c.stroke(); c.globalAlpha = 1;
  }
  function line(pts, w, col, a = 1) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineCap = c.lineJoin = 'round'; c.globalAlpha = a * A; c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.globalAlpha = 1; }
  // Quadro local da cabeça: x à frente, y para baixo, girado pela inclinação (sem virar de cabeça para baixo à esquerda).
  function headFrame(p) { c.translate(p.head.x, p.head.y); c.scale(p.facing, 1); c.rotate(p.facing > 0 ? p.head.angle : Math.PI - p.head.angle); }

  function ant(a) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, hero = a.role === 'hero', px = S * cam.z;
    const col = hero ? P.hero : a.role === 'back' ? mixCol(P.ant, P.far, .4) : a.role === 'tunnel' || a.role === 'garden' ? mixCol(P.ant, P.soil, .15) : P.ant;
    const lw = Math.max(1 / cam.z, .01 * S), legW = (l, k) => Math.max(1.1 / cam.z, k * S), farAnt = f > 0 ? 'antennaR' : 'antennaL';
    // Pata: fita que afina da raiz à ponta em dois segmentos, aguada transparente com a borda acumulando pigmento.
    const legs = far => { for (const l of Object.values(p.limbs)) if (l.far === far) taper([l.root, l.mid, l.end], [legW(l, .045), legW(l, .03), legW(l, .012)], far ? dk(col, .4) : dk(col, .15), lw * .8); };
    const antenna = n => p.appendages[n] && line(p.appendages[n], Math.max(1 / cam.z, .016 * S), dk(col, n === farAnt ? .45 : .25));
    legs(true); legs(false); antenna(farAnt);
    if (p.carry) leaf(p.carry, sd, a.role === 'back' ? mixCol(P.leaf, P.far, .4) : P.leaf, lw);
    const [th, pt, gs] = p.spine;
    blot(oval(gs.x, gs.y, 1.2 * gs.r, .95 * gs.r, gs.angle, sd), col, lw, { light: px > 25 });
    blot(oval(pt.x, pt.y, 1.4 * pt.r, .8 * pt.r, pt.angle, sd + 20, 10), col, lw, { shade: false });
    blot(oval(th.x, th.y, 1.5 * th.r, .85 * th.r, th.angle, sd + 40), col, lw, { light: px > 25 });
    const R = SPECS.ant.head.r * S;
    if (px > 150) for (const u of [-.6, -.05]) line([[th.x + f * u * th.r, th.y - .7 * th.r], [th.x + f * (u - .35) * th.r, th.y - 1.25 * th.r]], .18 * th.r, dk(col, .3));  // espinhos do tórax
    c.save(); headFrame(p);
    limb([[.75 * R, .3 * R], [1.25 * R, .55 * R], [1.05 * R, .7 * R]], .12 * R, dk(col, .5), lw * .5);  // mandíbula
    blot(oval(0, 0, 1.05 * R, .95 * R, 0, sd + 60), col, lw, { light: px > 25 });
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
  function fly(a) {
    const p = a.pose, S = p.size, sd = sid(a.id), lw = Math.max(1 / cam.z, .012 * S), [th, ab] = p.spine, R = SPECS.fly.head.r * S;
    const wing = (far) => {
      const w = p.wings || { phase: 0, open: 0 }, ang = -.5 - 1.1 * w.open * (.5 + .5 * Math.sin(w.phase * TAU)) + (far ? .25 : 0), L = .62 * S;
      c.save(); c.translate(th.x - p.facing * .05 * S, th.y - .6 * th.r); c.scale(-p.facing, 1); c.rotate(ang);
      blot(oval(L / 2, 0, L / 2, .2 * S, 0, sd + (far ? 7 : 9), 12), P.wing, 1.6 * lw, { a: far ? .45 : .6, shade: false, rim: dk(P.wing, .55) });
      line([[0, 0], [.85 * L, -.03 * S]], lw, dk(P.wing, .5), .6); c.restore();
    };
    wing(true);
    blot(oval(ab.x, ab.y, 1.25 * ab.r, .9 * ab.r, ab.angle, sd), P.fly, lw);
    blot(oval(th.x, th.y, 1.1 * th.r, 1.05 * th.r, th.angle, sd + 20), P.fly, lw);
    c.save(); headFrame(p); blot(oval(0, 0, R, .9 * R, 0, sd + 40), mixCol(P.fly, P.soil, .3), lw, { shade: false });
    c.beginPath(); c.arc(.3 * R, -.15 * R, .35 * R, 0, TAU); c.globalAlpha = .9 * A; c.fillStyle = '#7A2E22'; c.fill(); c.restore(); c.globalAlpha = 1;
    wing(false);
  }

  // Explorador de chapéu e mochila, de perfil; 1 BL = altura. O rosto atua (neutral, curious, surprised) e pisca.
  function human(a) {
    const p = a.pose, S = p.size, sd = sid(a.id), f = p.facing, [ch, pe] = p.spine, L = p.limbs, lw = Math.max(1.1 / cam.z, .004 * S);
    const gy = Math.max(L.legL.end[1], L.legR.end[1]), sq = p.sq || 0, ta = Math.atan2(ch.y - pe.y, ch.x - pe.x);
    c.save(); c.translate(pe.x, gy); c.scale(1 + .5 * sq, 1 - sq); c.translate(-pe.x, -gy);
    const leg = (l, far) => {
      const cl = far ? dk(P.pants, .3) : P.pants;
      limb([l.root, l.mid], .085 * S, cl, lw); limb([l.mid, l.end], .07 * S, cl, lw);
      blot(oval(l.end[0] + f * .035 * S, l.end[1] - .02 * S, .065 * S, .032 * S, 0, sd + (far ? 3 : 5), 10), far ? dk(P.boot, .3) : P.boot, lw);
    };
    const arm = (l, far) => {
      limb([l.root, l.mid], .062 * S, far ? dk(P.shirt, .3) : P.shirt, lw); limb([l.mid, l.end], .045 * S, far ? dk(P.skin, .25) : P.skin, lw);
      blot(oval(l.end[0], l.end[1], .03 * S, .028 * S, 0, sd + (far ? 11 : 13), 9), far ? dk(P.skin, .25) : P.skin, lw, { shade: false });
    };
    const fl = Object.entries(L).filter(([, l]) => l.far), nr = Object.entries(L).filter(([, l]) => !l.far);
    for (const [n, l] of fl) n.startsWith('leg') ? leg(l, true) : arm(l, true);
    // Mochila nas costas, com o saco de dormir enrolado em cima.
    const bx = ch.x - f * .14 * S, by = ch.y + .02 * S;
    blot(oval(bx, by, .085 * S, .14 * S, ta + Math.PI / 2, sd + 21), P.pack, lw);
    blot(oval(bx - f * .005 * S, by - .15 * S, .07 * S, .035 * S, 0, sd + 23, 10), mixCol(P.pants, P.paper, .3), lw);
    line([[bx - f * .02 * S, by - .02 * S], [bx + f * .05 * S, by - .02 * S]], .012 * S, dk(P.pack, .4), .8);
    // Tronco: camisa do quadril ao ombro; calça no quadril.
    for (const [n, l] of nr) if (n.startsWith('leg')) leg(l, false);
    const d = Math.hypot(ch.x - pe.x, ch.y - pe.y);
    // Camisa: do quadril (estreito) ao peito e ombros (mais largos), no eixo pelve → peito.
    const ux = (ch.x - pe.x) / (d || 1), uy = (ch.y - pe.y) / (d || 1), tq = (al, ac) => [pe.x + ux * al - uy * ac * f * S, pe.y + uy * al + ux * ac * f * S];
    blot([[-.03, .085], [.45, .088], [1, .1], [1.12, .075], [1.22, .02], [1.2, -.06], [1.05, -.1], [.45, -.092], [-.03, -.088]].map(([al, ac]) => tq(al * d, ac)), P.shirt, lw);
    blot(oval(pe.x, pe.y + .02 * S, .1 * S, .07 * S, ta, sd + 33, 12), P.pants, lw, { light: false });
    line([[pe.x - .09 * S, pe.y - .035 * S], [pe.x + .09 * S, pe.y - .035 * S]], .015 * S, P.band, .8);  // cinto
    line([[ch.x + f * .02 * S, ch.y - .1 * S], [ch.x + f * .055 * S, ch.y + .1 * S]], .016 * S, dk(P.pack, .3), .9);  // alça
    // Pescoço e cabeça.
    line([[ch.x + f * .01 * S, ch.y - .1 * S], [p.head.x - f * .005 * S, p.head.y + .04 * S]], .045 * S, dk(P.skin, .1));
    c.save(); headFrame(p); head(p, .075 * S, sd, lw); c.restore();
    for (const [n, l] of nr) if (!n.startsWith('leg')) arm(l, false);
    c.restore();
    if (p.emote) emote(p, S);
  }
  function head(p, R, sd, lw) {
    const F = p.face || {}, ex = F.expression || 'neutral', shut = (F.blink || 0) > .5;
    blot(oval(-.55 * R, -.15 * R, .5 * R, .5 * R, 0, sd + 51, 10), P.hair, lw, { shade: false });
    blot(oval(0, 0, .95 * R, 1.05 * R, 0, sd + 53), P.skin, lw);
    blot(oval(.97 * R, .12 * R, .2 * R, .17 * R, 0, sd + 55, 9), P.skin, lw, { shade: false });  // nariz
    blot(oval(-.15 * R, .1 * R, .17 * R, .23 * R, 0, sd + 57, 9), dk(P.skin, .12), lw, { shade: false });  // orelha
    trace(oval(.4 * R, .38 * R, .2 * R, .13 * R, 0, sd + 59, 9)); c.globalAlpha = .25 * A; c.fillStyle = P.red; c.fill(); c.globalAlpha = 1;  // bochecha
    // Olho, sobrancelha e boca por expressão, em nanquim sépia (olho grande o bastante para atuar).
    const eye = [.45 * R, .02 * R], ink = P.ink, stroke = (w, a = .9) => { c.globalAlpha = a * A; c.strokeStyle = ink; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); };
    if (shut) { c.beginPath(); c.arc(eye[0], eye[1] - .1 * R, .2 * R, .35, Math.PI - .35); stroke(.08 * R); }
    else if (ex === 'surprised') {
      trace(oval(eye[0], eye[1] - .04 * R, .27 * R, .36 * R, 0, sd + 61, 10)); c.globalAlpha = A; c.fillStyle = '#FFFDF6'; c.fill(); stroke(.06 * R);
      c.beginPath(); c.arc(eye[0] + .06 * R, eye[1], .11 * R, 0, TAU); c.globalAlpha = A; c.fillStyle = ink; c.fill();
    } else {
      const k = ex === 'curious' ? 1.2 : 1; trace(oval(eye[0], eye[1], .17 * R * k, .24 * R * k, 0, sd + 61, 8)); c.globalAlpha = A; c.fillStyle = ink; c.fill();
      c.beginPath(); c.arc(eye[0] - .04 * R, eye[1] - .08 * R, .06 * R * k, 0, TAU); c.fillStyle = '#FFFDF6'; c.fill();
    }
    const brow = { neutral: [[.24, -.24], [.45, -.28], [.66, -.24]], curious: [[.22, -.3], [.45, -.42], [.68, -.34]], surprised: [[.22, -.42], [.46, -.56], [.7, -.46]] }[ex] || [];
    c.beginPath(); brow.forEach(([u, v], i) => i ? c.lineTo(u * R, v * R) : c.moveTo(u * R, v * R)); stroke(.1 * R);
    if (ex === 'surprised') { trace(oval(.62 * R, .6 * R, .17 * R, .26 * R, 0, sd + 63, 10)); c.globalAlpha = A; c.fillStyle = '#5A2420'; c.fill(); stroke(.05 * R); trace(oval(.62 * R, .74 * R, .1 * R, .07 * R, 0, sd + 64, 8)); c.globalAlpha = .8 * A; c.fillStyle = '#C8664E'; c.fill(); }
    else if (ex === 'curious') { trace(oval(.68 * R, .56 * R, .09 * R, .1 * R, 0, sd + 63, 8)); c.globalAlpha = A; c.fillStyle = '#5A2420'; c.fill(); stroke(.04 * R); }
    else { c.beginPath(); c.moveTo(.5 * R, .52 * R); c.quadraticCurveTo(.66 * R, .58 * R, .8 * R, .5 * R); stroke(.06 * R, .8); }
    c.globalAlpha = 1;
    // Nanquim leve: nuca e queixo.
    c.globalAlpha = .5 * A; c.strokeStyle = P.ink; c.lineWidth = lw; c.beginPath(); c.ellipse(0, 0, .97 * R, 1.07 * R, 0, 1.9, 2.9); c.stroke(); c.beginPath(); c.ellipse(0, 0, .97 * R, 1.07 * R, 0, .5, 1.2); c.stroke(); c.globalAlpha = 1;
    // Chapéu de explorador: copa, fita e aba.
    blot([[-.78, -.62], [-.72, -1.17], [-.45, -1.42], [.1, -1.48], [.55, -1.32], [.74, -1.02], [.8, -.62]].map(([u, v]) => [u * R, v * R]), P.hat, lw);
    blot([[-.78, -.62], [-.76, -.84], [.78, -.84], [.8, -.62]].map(([u, v]) => [u * R, v * R]), P.band, lw, { shade: false });
    blot(oval(.05 * R, -.64 * R, 1.6 * R, .17 * R, -.04, sd + 65, 16, .05), dk(P.hat, .08), lw, { light: false });
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
  // Atores da camada pedida (layer < 1 ou = 1), fora do quadro pulados; alpha e flip aplicados.
  function actors(F, front) {
    for (const a of F.actors) {
      if (a.hidden || (a.layer >= 1) !== front) continue;
      const p = a.pose, lx = lerp(960, cam.cx, a.layer), sx = (p.spine[0].x - lx) * cam.z + 960, sy = (p.spine[0].y - cam.cy) * cam.z + 540, m = 1.6 * p.size * cam.z + 40;
      if (sx < -m || sx > W + m || sy < -m || sy > H + m) continue;
      at(a.layer); A = a.alpha ?? 1;
      if (a.flip) { const mx = (p.spine[0].x + p.spine.at(-1).x) / 2; c.translate(mx, 0); c.scale(a.flip, 1); c.translate(-mx, 0); }
      (a.kind === 'human' ? human : a.kind === 'fly' ? fly : ant)(a);
      A = 1;
    }
    c.globalAlpha = 1;
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
    draw(F) {
      c = X; cam = F.cam; T = F.t; A = 1;
      c.resetTransform(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
      still('sky', [0, 0, W, H], .5, paintSky);
      ({ close, wide, name, trail })[F.shot](F);
      c.resetTransform(); c.globalAlpha = 1;
      for (const s of F.texts) if (s.k > 0) title(s);
      if (!PAPER) PAPER = makePaper();
      c.globalCompositeOperation = 'multiply'; c.drawImage(PAPER, 0, 0); c.globalCompositeOperation = 'source-over';
    },
  };
})();
