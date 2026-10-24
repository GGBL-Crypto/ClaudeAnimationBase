// Teatro de sombras (exp-silhueta): desenha o quadro F da coreografia comum (exp-estilos.js) como bonecos recortados
// contra uma tela de papel iluminada por trás. Fundo e fibra em cache; camadas paradas desfocadas uma vez (still), a de
// trás que se move a 1/2 da resolução (soft). Mais longe = sombra mais clara e mais mole. Só Canvas2D, sem kit.
(() => {
  const P = STYLE.palette, main = animationEngine.context, FX = STYLE.effects;
  let c = main, Z = 1;
  // Tom atual: ink = sombra da camada, far = membros do lado de lá, lite = luz que passa pelos vazados, rich = detalhe fino.
  const T = { ink: P.ink, far: P.ink, lite: '#fff', rich: true };
  const into = (g, fn) => { const o = c; c = g; try { fn(); } finally { c = o; } };
  const canvas = (w, h) => { const a = document.createElement('canvas'); a.width = w; a.height = h; return a; };
  const lamp = F => P[F.scene === 'H' ? 'lampH' : 'lampA'];

  // ---------- tela: luz, papel, fibra ----------
  // Luz da lanterna (gradiente radial, centro quente) com manchas de espessura do papel; uma por cena, em cache.
  const BG = {};
  function screen(key) {
    if (BG[key]) return BG[key];
    const a = canvas(W, H), g = a.getContext('2d'), [c0, c1, c2] = P['lamp' + key], r = g.createRadialGradient(960, 460, 30, 960, 540, 1180);
    r.addColorStop(0, c0); r.addColorStop(.3, mixCol(c0, c1, .55)); r.addColorStop(.62, c1); r.addColorStop(1, c2); g.fillStyle = r; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {  // papel mais grosso escurece, mais fino clareia
      const x = W * hash(i * 3.1 + 1), y = H * hash(i * 5.7 + 2), R = 50 + 220 * hash(i + 9), m = g.createRadialGradient(x, y, 0, x, y, R);
      m.addColorStop(0, hash(i + 4) < .5 ? 'rgba(70,25,0,.09)' : 'rgba(255,250,225,.1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(x - R, y - R, 2 * R, 2 * R);
    }
    return BG[key] = a;
  }
  // Fibra do papel e vinheta, aplicadas por cima de tudo em multiply: aparecem só onde passa luz.
  const FIB = (() => {
    const a = canvas(W, H), g = a.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.lineCap = 'round';
    for (let i = 0; i < STYLE.texture.fibers; i++) {
      const x = W * hash(i * 1.31 + 7), y = H * hash(i * 2.17 + 3), l = 18 + 80 * hash(i * .7 + 1), a0 = TAU * hash(i * 3.3 + 5), b = (hash(i + 11) - .5) * .9;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2 * Math.cos(a0 + b), y + l / 2 * Math.sin(a0 + b), x + l * Math.cos(a0), y + l * Math.sin(a0));
      g.strokeStyle = `rgba(110,70,40,${.06 + .16 * hash(i + 13)})`; g.lineWidth = .6 + 1.6 * hash(i + 17); g.stroke();
    }
    const v = g.createRadialGradient(960, 500, 320, 960, 540, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,6,2,.8)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return a;
  })();

  // ---------- câmera e camadas ----------
  const cam = (F, f) => { const { cx, cy, z } = F.cam; c.setTransform(z, 0, 0, z, 960 - lerp(960, cx, f) * z, 540 - cy * z); };
  const span = (F, f) => { const { cx, z } = F.cam, lx = lerp(960, cx, f); return [lx - 960 / z - 150, lx + 960 / z + 150]; };
  // Tom de uma camada a distância k (0 = colada na tela, 1 = some na luz).
  function tone(F, k, fn) {
    const o = { ...T }, m = lamp(F)[1];
    Object.assign(T, { ink: mixCol(P.ink, m, k), far: mixCol(P.ink, m, k + .12), rich: k < .1 });
    try { fn(); } finally { Object.assign(T, o); }
  }
  // Camada parada desenhada uma vez no retângulo [x, y, w, h] (unidades da camada), a k px por unidade, desfocada r px
  // no cache; depois só copiada na transformação atual. draw(x0, x1) desenha no contexto do cache.
  const STILL = new Map();
  function still(key, [x, y, w, h], k, r, draw) {
    let cv = STILL.get(key);
    if (!cv) {
      const a = canvas(Math.ceil(w * k), Math.ceil(h * k)), g = a.getContext('2d');
      g.scale(k, k); g.translate(-x, -y); into(g, () => draw(x, x + w));
      if (r) { cv = canvas(a.width, a.height); const b = cv.getContext('2d'); b.filter = `blur(${r}px)`; b.drawImage(a, 0, 0); } else cv = a;
      STILL.set(key, cv);
    }
    c.drawImage(cv, x, y, w, h);
  }
  // Camada que se move (atores do fundo): desenhada a 1/2 da resolução e ampliada, o que já a desfoca.
  const LOW = 2, low = canvas(W / LOW, H / LOW), lowG = low.getContext('2d');
  function soft(F, f, draw) {
    const { cx, cy, z } = F.cam;
    lowG.resetTransform(); lowG.clearRect(0, 0, low.width, low.height);
    lowG.setTransform(z / LOW, 0, 0, z / LOW, (960 - lerp(960, cx, f) * z) / LOW, (540 - cy * z) / LOW);
    into(lowG, () => draw(...span(F, f)));
    c.save(); c.resetTransform(); c.imageSmoothingQuality = 'high'; c.drawImage(low, 0, 0, W, H); c.restore();
  }

  // ---------- recortes de cenário ----------
  const path = pts => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
  // Massa de terra do perfil gy até bottom (número ou perfil), com a borda serrilhada de capim ao vento.
  function soil(t, gy, x0, x1, bottom, step, hmax, seed = 0) {
    const B = typeof bottom === 'function' ? bottom : () => bottom;
    c.beginPath(); c.moveTo(x0, B(x0));
    for (let k = Math.floor(x0 / step); k * step <= x1 + step; k++) {
      const x = k * step, y = gy(x), h = hmax * (.2 + .8 * hash(k * 1.7 + seed)) * (hash(k * 3.1 + seed) < .12 ? 2.4 : 1), b = .6 * wind(t, x, seed) * h;
      c.lineTo(x, y); c.lineTo(x + step * .5 + b, y - h);
    }
    for (let x = x1 + step; x >= x0 - 40; x -= 40) c.lineTo(x, B(x));
    c.closePath(); c.fillStyle = T.ink; c.fill();
  }
  // Folha de capim: lâmina curva e afilada de base w, inclinada a.
  function blade(x, y, h, a, w) {
    const tx = x + Math.sin(a) * h, ty = y - Math.cos(a) * h, mx = x + Math.sin(a) * h * .3, my = y - h * .55;
    c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(mx - w * .5, my, tx, ty); c.quadraticCurveTo(mx + w * .5, my, x + w, y); c.fill();
  }
  // Moita/copa recortada: nuvem de folhas pontudas em volta de (x, y), raio r; holes = vazados decorativos.
  function canopy(x, y, r, seed, holes = 0) {
    c.fillStyle = T.ink;
    for (let i = 0; i < 26; i++) {
      const a = TAU * hash(seed + i * 1.3), d = r * Math.sqrt(hash(seed + i * 2.9)), lx = x + d * Math.cos(a) * 1.2, ly = y + d * Math.sin(a) * .8, s = r * (.28 + .18 * hash(seed + i));
      leafShape(lx, ly, s * 1.6, s, a + .6 * (hash(seed + i * 5) - .5)); c.fill();
    }
    c.beginPath(); c.ellipse(x, y, r * 1.05, r * .72, 0, 0, TAU); c.fill();
    if (!holes) return;
    c.save(); c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < holes; i++) {
      const a = TAU * hash(seed + i * 7.1), d = r * .55 * Math.sqrt(hash(seed + i * 4.3)), s = r * (.07 + .05 * hash(seed + i * 3));
      leafShape(x + d * Math.cos(a) * 1.2, y + d * Math.sin(a) * .7, s * 2, s, a); c.fill();
    }
    c.restore();
  }
  // Folha serrilhada (caminho só) de comprimento w e largura h, ponta em +x, girada a.
  function leafShape(x, y, w, h, a, n = 28) {
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const u = i / n * TAU, k = i & 1 ? .9 : 1, px = w / 2 * Math.cos(u) * k, py = h / 2 * Math.sin(u) * (1 - .4 * Math.max(0, Math.cos(u))) * k;
      const X = x + px * Math.cos(a) - py * Math.sin(a), Y = y + px * Math.sin(a) + py * Math.cos(a);
      i ? c.lineTo(X, Y) : c.moveTo(X, Y);
    }
    c.closePath();
  }
  // Nuvem de papel: arcos recortados sobre uma base reta.
  function cloud(seed) {
    c.fillStyle = T.ink; c.beginPath(); c.moveTo(-220, 40);
    for (let i = 0; i < 6; i++) { const x = -190 + i * 76, r = 46 + 40 * hash(seed + i) * Math.sin(Math.PI * (i + .5) / 6); c.arc(x, 40 - r * .55, r, Math.PI * .9, Math.PI * .1 + TAU); }
    c.lineTo(220, 40); c.closePath(); c.fill();
  }
  // Árvore recortada: tronco afilado, galhos e copa de folhas com vazados.
  function tree(x, y, h, seed) {
    c.fillStyle = T.ink; path([[x - h * .06, y], [x - h * .03, y - h * .55], [x + h * .03, y - h * .55], [x + h * .07, y]]); c.fill();
    for (let i = 0; i < 4; i++) { const s = i & 1 ? 1 : -1, by = y - h * (.3 + .08 * i); path([[x, by], [x + s * h * (.22 + .05 * i), by - h * (.2 + .02 * i)], [x + s * h * .2, by - h * .2 - 8], [x, by - 14]]); c.fill(); }
    canopy(x - h * .12, y - h * .7, h * .22, seed, 9); canopy(x + h * .14, y - h * .68, h * .2, seed + 40, 8); canopy(x, y - h * .86, h * .24, seed + 80, 10);
  }

  // ---------- bonecos ----------
  // Quadro local de um osso: +x à frente do ser, −y para cima, nos dois sentidos de facing.
  const at = (x, y, a, f, fn) => { c.save(); c.translate(x, y); c.rotate(a); c.scale(1, f); fn(); c.restore(); };
  // Peça: preenche; seam > 0 deixa uma fresta de luz em volta (peça de cá sobre a de lá); edge = borda escura (papel tingido).
  function piece(build, fill, o = {}) {
    c.beginPath(); build();
    if (o.seam) { c.lineWidth = o.seam; c.strokeStyle = T.lite; c.lineJoin = 'round'; c.stroke(); }
    c.fillStyle = fill; c.fill();
    if (o.edge) { c.lineWidth = o.edge; c.strokeStyle = P.ink; c.lineJoin = 'round'; c.stroke(); }
  }
  // Osso afilado de a até b (larguras w0, w1), pontas redondas: a peça rígida de um membro.
  function bone(a, b, w0, w1) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, an = Math.atan2(dy, dx);
    c.moveTo(a[0] + nx * w0, a[1] + ny * w0); c.lineTo(b[0] + nx * w1, b[1] + ny * w1); c.arc(b[0], b[1], w1, an + Math.PI / 2, an - Math.PI / 2, true);
    c.lineTo(a[0] - nx * w0, a[1] - ny * w0); c.arc(a[0], a[1], w0, an - Math.PI / 2, an + Math.PI / 2, true); c.closePath();
  }
  // Pino da junta: anel de luz com o rebite escuro no meio.
  function rivet(x, y, r) {
    if (!T.rich) return;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = T.lite; c.fill();
    c.beginPath(); c.arc(x, y, r * .5, 0, TAU); c.fillStyle = P.ink; c.fill();
  }
  const hole = (x, y, rx, ry, a = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, TAU); c.fillStyle = T.lite; c.fill(); };

  // Formiga: folha atrás, membros de lá, gáster, pecíolo, tórax com espinhos, membros de cá, cabeça com mandíbula e olho
  // vazado, antenas e pinos. A protagonista leva janelas de couro tingido (laranja translúcido) no corpo e brilha quando pequena.
  function ant(p, hero, det) {
    const S = p.size, f = p.facing, hr = SPECS.ant.head.r * S, lw = .024 * S, [th, pe, ga] = p.spine, rich = T.rich && det > 160, ink = T.ink;
    const panel = (rx, ry, x = 0) => { if (!hero) return; c.beginPath(); c.ellipse(x, 0, rx, ry, 0, 0, TAU); c.fillStyle = P.hero; c.fill(); };
    if (hero && det < 170) { c.shadowColor = P.glow; c.shadowBlur = 16; }
    if (p.carry) leaf(p, hero, det);
    const leg = (l, col, o = {}) => piece(() => { bone(l.root, l.mid, lw * 1.25, lw); bone(l.mid, l.end, lw, lw * .55); bone(l.end, [l.end[0] + f * .05 * S, l.end[1] + .01 * S], lw * .5, lw * .3); }, col, o);
    for (const l of Object.values(p.limbs)) if (l.far) leg(l, T.far);
    at(ga.x, ga.y, ga.angle, f, () => {
      const r = ga.r;
      if (rich) piece(() => { for (let i = 0; i < 9; i++) { const u = -2.7 + i * .25, x = 1.1 * r * Math.cos(u), y = .9 * r * Math.sin(u); c.moveTo(x - .04 * r, y); c.lineTo(x * 1.14, y * 1.14); c.lineTo(x + .04 * r, y); } }, ink);  // pelos
      piece(() => c.ellipse(-.05 * r, 0, 1.12 * r, .9 * r, 0, 0, TAU), ink);
      panel(.86 * r, .68 * r, -.08 * r);
      if (rich || hero) { c.lineWidth = .07 * r; c.strokeStyle = hero ? ink : T.lite; for (const x of [-.25, -.62]) { c.beginPath(); c.ellipse(x * r, 0, .18 * r, .62 * r, 0, -1.2, 1.2); c.stroke(); } }
    });
    piece(() => { c.ellipse(pe.x, pe.y, pe.r * 1.35, pe.r * 1.05, pe.angle, 0, TAU); }, ink);
    at(th.x, th.y, th.angle, f, () => {
      const r = th.r;
      piece(() => { for (const [a, tx, ty, d] of [[-1, -1.25, -1.05, -.6], [-.1, .05, -1.3, .35], [.7, 1.05, -1, 1.2]]) { c.moveTo(a * r, -.4 * r); c.lineTo(tx * r, ty * r); c.lineTo(d * r, -.5 * r); } }, ink);  // espinhos
      piece(() => c.ellipse(0, 0, 1.45 * r, .85 * r, 0, 0, TAU), ink);
      panel(1.08 * r, .55 * r);
    });
    piece(() => bone([th.x + Math.cos(th.angle) * th.r, th.y + Math.sin(th.angle) * th.r], [p.head.x, p.head.y], .3 * th.r, .3 * th.r), ink);
    const seam = rich ? 2.5 / Z : 0;
    for (const l of Object.values(p.limbs)) if (!l.far) leg(l, ink, { seam });
    at(p.head.x, p.head.y, p.head.angle, f, () => {
      piece(() => { c.moveTo(-.55 * hr, -.7 * hr); c.lineTo(-.95 * hr, -1.15 * hr); c.lineTo(-.25 * hr, -.85 * hr); }, ink);  // espinhos da nuca
      piece(() => path([[.5, .2], [1.2, .32], [1.48, .62], [1.28, .6], [1.2, .72], [1.07, .63], [.96, .74], [.82, .62], [.45, .6]].map(([x, y]) => [x * hr, y * hr])), ink, { seam });  // mandíbula
      piece(() => c.ellipse(0, 0, 1.05 * hr, .95 * hr, 0, 0, TAU), ink, { seam });
      panel(.72 * hr, .62 * hr, -.12 * hr);
      if (det > 40) { hole(.38 * hr, -.2 * hr, .22 * hr, .16 * hr, -.2); c.beginPath(); c.arc(.48 * hr, -.19 * hr, .08 * hr, 0, TAU); c.fillStyle = ink; c.fill(); }
    });
    c.lineCap = 'round'; c.strokeStyle = ink; c.lineWidth = lw * .75;
    for (const k of ['antennaL', 'antennaR']) { const ap = p.appendages[k]; if (!ap) continue; path(ap); c.stroke(); const e = ap.at(-1); c.beginPath(); c.arc(e[0], e[1], lw * .8, 0, TAU); c.fillStyle = ink; c.fill(); }
    c.shadowBlur = 0;
    if (rich) { for (const l of Object.values(p.limbs)) if (!l.far) rivet(...l.mid, lw * .4); rivet(pe.x, pe.y, lw * .45); }
  }
  // Folha carregada: talo até a mandíbula e a folha serrilhada; nas irmãs, veias vazadas; na protagonista, papel verde.
  function leaf(p, hero, det) {
    const L = p.carry, hr = SPECS.ant.head.r * p.size, mx = p.head.x + p.facing * hr * 1.2, my = p.head.y + hr * .4;
    c.lineWidth = Math.max(.03 * L.h, 1 / Z); c.strokeStyle = P.ink; path([[mx, my], [L.x, L.y]]); c.stroke();
    piece(() => leafShape(L.x, L.y, L.w, L.h, L.angle, 40), hero ? P.heroLeaf : T.ink, hero ? { edge: Math.max(.03 * L.h, 1.2 / Z) } : {});
    if (det < 60 || !T.rich) return;
    at(L.x, L.y, L.angle, 1, () => {
      c.strokeStyle = hero ? mixCol(P.heroLeaf, P.ink, .55) : T.lite; c.lineWidth = .035 * L.h; c.lineCap = 'round';
      path([[-.42 * L.w, 0], [.4 * L.w, 0]]); c.stroke();
      for (let i = 0; i < 4; i++) { const x = (-.3 + .18 * i) * L.w; for (const s of [-1, 1]) { path([[x, 0], [x + .12 * L.w, s * .28 * L.h]]); c.stroke(); } }
    });
  }
  // Forídea: asa de lá, corpo corcunda, cabeça com olho vazado, patas penduradas, asa de cá (papel fino translúcido).
  function fly(p, det) {
    const S = p.size, f = p.facing, [th, ab] = p.spine, hr = SPECS.fly.head.r * S, wa = Math.sin((p.wings?.phase || 0) * TAU);
    const wing = (da, col) => at(th.x, th.y, th.angle, f, () => {
      c.translate(0, -.7 * th.r); c.rotate(-2.55 + .75 * wa + da);
      c.beginPath(); c.ellipse(.27 * S, 0, .27 * S, .085 * S, 0, 0, TAU); c.fillStyle = col; c.fill();
      c.lineWidth = Math.max(.008 * S, .8 / Z); c.strokeStyle = T.ink; c.stroke();
      if (det > 60) { path([[0, 0], [.5 * S, -.01 * S]]); c.stroke(); path([[.12 * S, 0], [.42 * S, .05 * S]]); c.stroke(); }
    });
    wing(.3, `rgba(${T.ink === P.ink ? '60,40,30' : '90,70,60'},.55)`);
    c.fillStyle = T.ink; c.lineCap = 'round'; c.lineWidth = .025 * S; c.strokeStyle = T.ink;
    at(th.x, th.y, th.angle, f, () => { for (const x of [-.3, 0, .3]) { path([[x * th.r, .5 * th.r], [x * th.r + .06 * S, 1.3 * th.r], [x * th.r - .02 * S, 2.1 * th.r]]); c.stroke(); } });
    at(ab.x, ab.y, ab.angle, f, () => { c.beginPath(); c.ellipse(-.15 * ab.r, 0, 1.25 * ab.r, .85 * ab.r, 0, 0, TAU); c.fill(); });
    at(th.x, th.y, th.angle, f, () => {
      c.beginPath(); c.ellipse(0, -.2 * th.r, 1.15 * th.r, 1.05 * th.r, 0, 0, TAU); c.fill();
      if (det > 120) for (let i = 0; i < 7; i++) { const u = -2.6 + i * .3; path([[Math.cos(u) * th.r, Math.sin(u) * th.r - .2 * th.r], [1.3 * Math.cos(u) * th.r, 1.3 * Math.sin(u) * th.r - .2 * th.r]]); c.lineWidth = .012 * S; c.stroke(); }
    });
    at(p.head.x, p.head.y, p.head.angle, f, () => { c.beginPath(); c.ellipse(0, 0, hr, .9 * hr, 0, 0, TAU); c.fill(); if (det > 40) hole(.25 * hr, -.15 * hr, .45 * hr, .4 * hr); });
    wing(0, 'rgba(255,240,215,.45)');
  }

  // Explorador: boneco de couro de perfil, pregado no peito, ombros, cotovelos, quadris e joelhos. Chapéu com faixa vazada,
  // mochila com ornamento vazado, olho vazado com sobrancelha recortada; a expressão vem da cabeça, do corpo e do emote.
  function human(a, det) {
    const p = a.pose, S = p.size, f = p.facing, [ch, pe] = p.spine, L = p.limbs, hr = SPECS.human.head.r * S * 1.2, rich = det > 150;
    const l = Math.hypot(ch.x - pe.x, ch.y - pe.y) || 1, ux = (ch.x - pe.x) / l, uy = (ch.y - pe.y) / l;
    const q = (a, b) => [pe.x + (-uy * f * a + ux * b) * S, pe.y + (ux * f * a + uy * b) * S];  // a à frente, b para cima, em BL
    const poly = pts => () => { pts.forEach(([a, b], i) => i ? c.lineTo(...q(a, b)) : c.moveTo(...q(a, b))); c.closePath(); };
    const seam = rich ? 3 / Z : 0;
    const arm = (m, col, s) => {
      piece(() => { bone(m.root, m.mid, .04 * S, .033 * S); bone(m.mid, m.end, .032 * S, .026 * S); }, col, { seam: s });
      piece(() => c.ellipse(m.end[0], m.end[1], .034 * S, .03 * S, 0, 0, TAU), col);
    };
    const leg = (m, col, s) => piece(() => {
      bone(m.root, m.mid, .06 * S, .048 * S); bone(m.mid, m.end, .046 * S, .034 * S);
      const [x, y] = m.end; c.moveTo(x - f * .04 * S, y - .06 * S); c.lineTo(x + f * .05 * S, y - .045 * S); c.quadraticCurveTo(x + f * .11 * S, y - .03 * S, x + f * .11 * S, y + .005 * S); c.lineTo(x - f * .045 * S, y + .005 * S); c.closePath();  // bota
    }, col, { seam: s });
    for (const k of ['armL', 'armR']) if (L[k].far) arm(L[k], T.far, 0);
    for (const k of ['legL', 'legR']) if (L[k].far) leg(L[k], T.far, 0);
    // Mochila: fresta de luz em volta, aba e ornamento vazados; saco de dormir enrolado em cima.
    piece(poly([[-.09, -.01], [-.2, .0], [-.235, .12], [-.225, .26], [-.12, .29], [-.07, .24], [-.07, .03]]), T.ink, { seam });
    piece(() => { const [x, y] = q(-.165, .31); c.ellipse(x, y, .085 * S, .038 * S, Math.atan2(ux * f, -uy * f), 0, TAU); }, T.ink, { seam });
    if (rich) {
      const [ox, oy] = q(-.155, .12); c.lineWidth = .007 * S; c.strokeStyle = T.lite;
      c.beginPath(); c.arc(ox, oy, .035 * S, 0, TAU); c.stroke();
      for (let i = 0; i < 6; i++) hole(ox + .055 * S * Math.cos(i * TAU / 6), oy + .055 * S * Math.sin(i * TAU / 6), .007 * S, .007 * S);
      path([q(-.21, .2), q(-.075, .21)]); c.stroke();  // aba
      const [rx, ry] = q(-.165, .31); c.beginPath(); c.arc(rx, ry, .014 * S, 0, 5); c.stroke();  // rolo
    }
    // Tronco (camisa e calção) e pescoço.
    piece(poly([[.055, -.11], [.08, .0], [.095, .14], [.09, .22], [.045, .265], [-.02, .275], [-.08, .25], [-.095, .16], [-.09, .04], [-.065, -.11]]), T.ink);
    if (rich) { c.lineWidth = .008 * S; c.strokeStyle = T.lite; path([q(-.085, 0), q(.078, 0)]); c.stroke(); hole(...q(.0, 0), .012 * S, .009 * S); path([q(.02, .262), q(.06, .2), q(.085, .235)]); c.stroke(); }  // cinto, fivela e gola
    piece(() => bone(q(0, .26), [p.head.x - f * .2 * hr, p.head.y + .4 * hr], .028 * S, .028 * S), T.ink);
    // Cabeça de perfil com chapéu (no quadro da cabeça).
    const e = p.face?.expression || 'neutral', bl = p.face?.blink || 0;
    at(p.head.x, p.head.y, p.head.angle, f, () => {
      const R = hr, P2 = pts => () => pts.forEach(([x, y], i) => i ? c.lineTo(x * R, y * R) : c.moveTo(x * R, y * R));
      piece(() => { c.arc(0, 0, R, Math.PI * .62, Math.PI * 1.72); P2([[.62, -.78], [.9, -.32], [1.0, -.12], [1.32, .14], [1.0, .26], [1.06, .4], [.98, .5], [1.04, .62], [.9, .82], [.5, .95], [-.2, .98]])(); c.closePath(); }, T.ink);
      if (e === 'surprised') hole(1.0 * R, .52 * R, .1 * R, .08 * R);
      if (det > 60) {
        const ry = (e === 'surprised' ? .17 : e === 'curious' ? .12 : .09) * (1 - .9 * bl), rx = e === 'surprised' ? .17 : .15;
        hole(.55 * R, -.12 * R, rx * R, ry * R, -.1);
        if (ry > .03) { c.beginPath(); c.arc(.62 * R, -.11 * R, Math.min(ry, .07) * R, 0, TAU); c.fillStyle = P.ink; c.fill(); }
        const by = e === 'surprised' ? -.5 : e === 'curious' ? -.38 : -.33, tilt = e === 'curious' ? -.12 : 0;
        c.lineWidth = .07 * R; c.strokeStyle = T.lite; c.lineCap = 'round'; path([[.36 * R, (by + .04 - tilt) * R], [.62 * R, by * R], [.78 * R, (by + .06 + tilt) * R]]); c.stroke();
        c.lineWidth = .05 * R; c.beginPath(); c.arc(-.12 * R, .05 * R, .14 * R, .9, TAU - .9); c.stroke();  // orelha
      }
      // Chapéu: aba larga, copa com mossa e faixa de losangos vazados.
      piece(() => { P2([[-1.45, -.5], [-.9, -.66], [.9, -.66], [1.55, -.5], [1.5, -.42], [.9, -.5], [-.9, -.5], [-1.4, -.4]])(); c.closePath(); }, T.ink, { seam: seam * .7 });
      piece(() => { P2([[-.85, -.58], [-.72, -1.35], [-.3, -1.5], [0, -1.38], [.3, -1.52], [.7, -1.38], [.88, -.58]])(); c.closePath(); }, T.ink);
      if (rich) for (let i = 0; i < 5; i++) { const x = (-.56 + .28 * i) * R, y = -.8 * R, s = .08 * R; path([[x - s, y], [x, y - s], [x + s, y], [x, y + s]]); c.closePath(); c.fillStyle = T.lite; c.fill(); }
    });
    for (const k of ['legL', 'legR']) if (!L[k].far) leg(L[k], T.ink, seam);
    for (const k of ['armL', 'armR']) if (!L[k].far) arm(L[k], T.ink, seam);
    if (rich) {
      for (const k of ['legL', 'legR', 'armL', 'armR']) if (!L[k].far) { rivet(...L[k].root, .012 * S); rivet(...L[k].mid, .011 * S); }
      rivet(...q(0, .26), .01 * S);
    }
    emote(p, hr);
  }
  // Emote recortado (? !): letra escura com fresta de luz, mola de escala k e opacidade a.
  function emote(p, hr) {
    const e = p.emote; if (!e) return;
    const k = Math.min(e.k, ease(e.a)); if (k <= 0) return;
    c.save(); c.translate(p.head.x + p.facing * hr * 2.7, p.head.y - hr * 1.7); c.scale(k, k); c.globalAlpha *= clamp(e.a);
    c.font = `bold ${hr * 2.4}px "Palatino Linotype", "Book Antiqua", Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = hr * .14; c.strokeStyle = T.lite; c.lineJoin = 'round'; c.strokeText(e.sym, 0, 0); c.fillStyle = P.ink; c.fillText(e.sym, 0, 0);
    c.restore();
  }

  // Ator: some se hidden; alpha ao entrar e sair de túnel; flip em torno do meio do corpo; sq achata sobre os pés.
  function actor(a) {
    if (a.hidden || (a.alpha ?? 1) <= 0) return;
    const p = a.pose, m = (p.spine[0].x + p.spine.at(-1).x) / 2;
    c.save(); c.globalAlpha *= a.alpha ?? 1;
    if (a.flip) { c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
    if (p.sq) { const gy = Math.max(...Object.values(p.limbs).map(l => l.end[1]), p.spine[0].y); c.translate(m, gy); c.scale(1 + .5 * p.sq, 1 - p.sq); c.translate(-m, -gy); }
    const det = p.size * Z;
    if (a.kind === 'human') human(a, det); else if (a.kind === 'fly') fly(p, det); else ant(p, a.role === 'hero', det);
    c.restore();
  }
  const actors = (F, f) => F.actors.filter(a => a.layer === f).forEach(actor);
  const heroOf = F => F.actors.find(a => a.role === 'hero');

  // ---------- A: close e nome (macro, capim gigante) ----------
  function macro(F) {
    const w = F.world, t = F.t, hero = heroOf(F), hg = hero.ground, [x0, x1] = span(F, 1);
    // Névoa (.35): capim gigante e chão, claros e moles, em cache.
    cam(F, w.mist.f);
    tone(F, .55, () => still('mist-' + F.shot, [-1500, 0, 10500, 1300], .4, FX.blur, (a, b) => {
      c.fillStyle = T.ink;
      for (let i = Math.floor(a / 70); i * 70 < b; i++) blade(i * 70 + 40 * hash(i + 200), w.mist.root + 10, 220 + 320 * hash(i + 201), .14 * Math.sin(i * 1.7), 9 + 8 * hash(i + 202));
      soil(0, w.mist.prof, a, b, 1300, 30, 26, 5);
    }));
    // Fundo (.7): irmãs com folhas e capim alto na frente delas, mais escuros que a névoa, a 1/2 da resolução.
    tone(F, .32, () => soft(F, w.back.f, (a, b) => {
      const gb = w.back.ground; soil(t, x => gb(x) + 6, a, b, 2400, 24, 30, 9);
      actors(F, w.back.f);
      c.fillStyle = T.ink;
      for (let i = Math.floor(a / 150); i * 150 < b; i++) { const x = i * 150 + 80 * hash(i + 3); blade(x, gb(x) + 40, 260 + 300 * hash(i), .14 * wind(t, x, 5), 14); }
    }));
    cam(F, 1);
    if (w.rock) { const [x, y, r] = w.rock; c.fillStyle = T.ink; path([[x - 1.3 * r, y + r], [x - r, y - .2 * r], [x - .4 * r, y - .8 * r], [x + .5 * r, y - .7 * r], [x + 1.2 * r, y], [x + 1.4 * r, y + r]]); c.fill(); canopy(x - .6 * r, y - .7 * r, .35 * r, 31); }
    soil(t, hg, x0, x1, 5000, 16, 40, 1);
    actors(F, 1);
    // Capim da frente, nítido e preto, aberto em volta da cabeça dela.
    const p = hero.pose, mid = (p.spine[0].x + p.spine.at(-1).x) / 2, hx = mid + (p.head.x - mid) * (hero.flip || 1);
    c.fillStyle = P.ink;
    for (let i = Math.floor(x0 / 90); i * 90 < x1; i++) {
      const x = i * 90 + 60 * hash(i + 77); if (Math.abs(x - hx) < .6 * p.size) continue;
      blade(x, w.front(x) + 30, 120 + 160 * hash(i + 78), .2 * wind(t, x, 2) + .2 * (hash(i + 79) - .5), 12);
    }
  }

  // ---------- A: plano aberto (trilha e corte do solo) ----------
  // Luz fria do subsolo: só aparece pelos vazados da terra.
  function underLight(F, x0, x1) {
    const [u0, u1, u2] = P.lampU, g = c.createRadialGradient(950, 1520, 60, 950, 1560, 1300);
    g.addColorStop(0, u0); g.addColorStop(.5, u1); g.addColorStop(1, u2); c.fillStyle = g; c.fillRect(x0, F.world.soilTop - 4, x1 - x0, 2400);
  }
  // Terra: massa preta com capim curto, monte do ninho, raízes e seixos vazados, túneis e câmaras recortados e o jardim
  // de fungo (esponja furada, mais clara). Desenhada numa folha à parte para os recortes não furarem o fundo.
  const SCR = canvas(W, H), sg = SCR.getContext('2d');
  function earth(F, x0, x1) {
    const w = F.world, t = F.t;
    sg.resetTransform(); sg.clearRect(0, 0, W, H);
    into(sg, () => {
      cam(F, 1);
      soil(t, x => w.ground(x) - 26 * Math.exp(-(((x - w.nest) / 60) ** 2)), x0, x1, 2600, 5, 5, 3);
      c.globalCompositeOperation = 'destination-out'; c.lineCap = c.lineJoin = 'round';
      for (const pts of w.tunnels) { c.lineWidth = 36; path(pts.map(([x, y]) => [x, y - 11])); c.stroke(); }
      for (const [x, y, cw, ch, s] of w.chambers) {
        c.beginPath();
        for (let i = 0; i <= 40; i++) { const u = Math.PI + Math.PI * i / 40, r = 1 + .06 * noise1(s, i * .5); c.lineTo(x + cw / 2 * Math.cos(u) * r, y + 8 + ch * Math.sin(u) * r); }
        c.closePath(); c.fill();
      }
      const { x: rx, y: ry, h: rh } = w.roots;  // raízes: filigrana vazada que afina
      for (let i = 0; i < 7; i++) {
        let x = rx + (i - 3) * 14, y = ry, a = Math.PI / 2 + (i - 3) * .28;
        for (let k = 0; k < 9; k++) { const nx = x + Math.cos(a) * rh * .07, ny = y + Math.sin(a) * rh * .07; c.lineWidth = 5 - k * .5; path([[x, y], [nx, ny]]); c.stroke(); x = nx; y = ny; a += .35 * noise1(i * 9 + 1, k * .7); }
      }
      c.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) { const x = lerp(-300, 2500, hash(i * 1.9 + 4)), y = lerp(900, 2200, hash(i * 2.3 + 8)); c.beginPath(); c.ellipse(x, y, 6 + 10 * hash(i + 3), 4 + 6 * hash(i + 5), hash(i + 7) * 3, 0, TAU); c.stroke(); }
      c.globalCompositeOperation = 'source-over';
      for (const [x, y, fw, fh, s] of w.fungus) {
        const col = mixCol(P.ink, P.lampU[1], .4);
        c.fillStyle = col; c.beginPath();
        for (let i = 0; i < 9; i++) { const u = i / 8, bx = x + (u - .5) * fw * .9, r = fh * (.22 + .12 * hash(s + i)) * Math.sin(Math.PI * (.15 + .7 * u)); c.moveTo(bx + r, y - r * .9); c.arc(bx, y - r * .9, r, 0, TAU); }
        c.rect(x - fw * .4, y - fh * .2, fw * .8, fh * .2); c.fill();
        c.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(x + (hash(s * 50 + i) - .5) * fw * .85, y - fh * .75 * hash(s * 50 + i + .5), 2.5 + 4 * hash(s * 7 + i), 0, TAU); c.fill(); }
        c.globalCompositeOperation = 'source-over';
      }
    });
    c.save(); c.resetTransform(); c.drawImage(SCR, 0, 0); c.restore();
  }
  function wide(F) {
    const w = F.world, [x0, x1] = span(F, 1);
    cam(F, w.clouds.f);
    tone(F, .7, () => { for (const [x, y, s, seed] of w.clouds.list) { c.save(); c.translate(x, y); c.scale(s, s); still('cloud' + seed, [-300, -180, 600, 280], .5, 4, () => cloud(seed)); c.restore(); } });
    cam(F, w.far.f);
    tone(F, .74, () => still('far', [-1500, 300, 6500, 800], .4, FX.blur, (a, b) => { soil(0, w.far.prof, a, b, 1100, 26, 18, 11); for (let x = a; x < b; x += 230) tree(x + 90 * hash(x), w.far.prof(x) + 6, 150 + 90 * hash(x + 1), x); }));
    cam(F, w.hill.f);
    tone(F, .56, () => still('hill', [-1500, 300, 6500, 800], .5, FX.blur * .7, (a, b) => { soil(0, w.hill.prof, a, b, 1100, 12, 14, 13); for (let x = a; x < b; x += 410) canopy(x + 150 * hash(x + 2), w.hill.prof(x) - 10, 40 + 30 * hash(x + 3), x); }));
    cam(F, 1);
    underLight(F, x0, x1);
    still('tree', [-60, 300, 640, 580], 1.5, 0, () => tree(w.tree.x, w.ground(w.tree.x) + 4, w.tree.h, 21));
    earth(F, x0, x1);
    actors(F, 1);
  }

  // ---------- H: trilha do explorador ----------
  // Ao fundo, morros e uma fileira de árvores (desfocados, em cache); o chão dele é uma faixa fina, e a terra da frente,
  // onde anda a fila, fica abaixo de uma fresta de luz para as formigas lerem em preto.
  function trail(F) {
    const w = F.world, t = F.t, [x0, x1] = span(F, 1);
    cam(F, .2);
    tone(F, .66, () => still('h-far', [-400, 300, 2720, 800], .4, FX.blur, (a, b) => soil(0, x => 720 + 50 * fbm1(3, x * .003) + 20 * Math.sin(x * .004), a, b, 1100, 20, 10, 21)));
    cam(F, .5);
    tone(F, .46, () => still('h-mid', [-400, 400, 2720, 700], .5, FX.blur * .8, (a, b) => {
      const prof = x => 860 + 14 * Math.sin(x * .005 + 1);
      soil(0, prof, a, b, 1100, 10, 14, 23);
      for (let x = a; x < b; x += 260) { const h = 180 + 160 * hash(x * .01 + 4); if (hash(x * .01) < .55) tree(x + 100 * hash(x + 5), prof(x) + 4, h, x); else canopy(x + 60, prof(x) - 26, 50 + 30 * hash(x), x); }
    }));
    cam(F, 1);
    c.fillStyle = mixCol(lamp(F)[0], lamp(F)[1], .5); c.globalAlpha = .45; path([...[x0, x1].map(x => [x, w.ground(x)]), [x1, w.antGround(x1) + 4], [x0, w.antGround(x0) + 4]]); c.fill(); c.globalAlpha = 1;  // luz que vaza sob o trilho dele
    soil(t, w.ground, x0, x1, x => w.ground(x) + 16, 10, 22, 4);
    soil(t, w.antGround, x0, x1, 2000, 6, 4, 6);
    actors(F, 1);
  }

  // Texto em letras escuras sobre a luz, com sombra mole (papel afastado) e faixa ornamental vazada embaixo.
  function texts(F) {
    for (const s of F.texts) {
      if (s.k <= 0) continue;
      c.save(); c.resetTransform(); c.globalAlpha = clamp(s.k); c.translate(s.x, s.y); const k = .94 + .06 * easeOut(s.k); c.scale(k, k);
      c.font = `bold ${s.size}px "Palatino Linotype", "Book Antiqua", Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const tw = c.measureText(s.text).width;
      c.shadowColor = 'rgba(30,8,0,.35)'; c.shadowBlur = 14; c.shadowOffsetY = 8; c.fillStyle = P.ink; c.fillText(s.text, 0, 0);
      c.fillRect(-tw / 2, s.size * .62, tw, s.size * .14); c.shadowColor = 'transparent';
      for (let x = -tw / 2 + s.size * .3; x < tw / 2 - s.size * .2; x += s.size * .45) { const y = s.size * .69, r = s.size * .045; path([[x - r, y], [x, y - r], [x + r, y], [x, y + r]]); c.closePath(); c.fillStyle = lamp(F)[0]; c.fill(); }
      c.restore();
    }
  }

  window.ExpStyle = {
    draw(F) {
      c = main; Z = F.cam.z; T.lite = lamp(F)[0]; T.ink = T.far = P.ink; T.rich = true;
      c.resetTransform(); c.drawImage(screen(F.scene === 'H' ? 'H' : 'A'), 0, 0);
      T.far = mixCol(P.ink, lamp(F)[1], .16);
      if (F.scene === 'H') trail(F); else if (F.shot === 'wide') wide(F); else macro(F);
      texts(F);
      // Fibra e vinheta em multiply e o tremor da chama da lanterna.
      c.resetTransform(); c.globalAlpha = 1; c.globalCompositeOperation = 'multiply'; c.drawImage(FIB, 0, 0);
      c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(0,0,0,${FX.flicker * (1.2 + noise1(5, F.t * 3))})`; c.fillRect(0, 0, W, H);
    },
  };
})();
