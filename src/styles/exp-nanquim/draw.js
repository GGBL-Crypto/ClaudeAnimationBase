// Nanquim (exp/estilos): caneta e nanquim no caderno. Tudo é desenhado em pixels de tela (a caneta tem largura fixa no
// papel): cada ponto do mundo passa pela câmera da sua camada antes do traço. Tom só por hachura (luz do alto à
// esquerda); cor aguada só nos acentos. Boil: B troca a cada 3 quadros; o fundo usa B % 3 (3 versões em cache).
(() => {
  const P = STYLE.palette, INK = P.ink, LS = [.55, .835];  // LS: direção da sombra (oposta à luz)
  const HA = [Math.cos(-1), Math.sin(-1)], HB = [Math.cos(.55), Math.sin(.55)];  // hachura e contra-hachura
  const TH = [[.1, .34, .22, .44], [.55, .72, .63, .8]];  // tom mínimo de cada fileira (ciclo de 4): densidade pelo tom
  const FONT = '"Ink Free", "Segoe Print", "Comic Sans MS", cursive';
  let c, B = 0, bv = 0, pat, paper;
  const pats = new WeakMap(), pool = [];
  const rs = (s, i = 0) => hash(s * 7.31 + i * 1.97);              // sorteio fixo
  const rb = (s, i = 0) => hash(s * 7.31 + i * 1.97 + bv * 3.17);  // sorteio que ferve (bv = versão do boil)
  const sub = (pts, close) => { pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); if (close) c.closePath(); };
  const path = (pts, close) => { c.beginPath(); sub(pts, close); };
  const ellPoly = (x, y, rx, ry, a = 0, n = 26) => Array.from({ length: n }, (_, i) => {
    const t = i / n * TAU, u = rx * Math.cos(t), v = ry * Math.sin(t); return [x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a)];
  });
  const segD = (x, y, [x0, y0], [x1, y1]) => { const dx = x1 - x0, dy = y1 - y0, u = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1)); return Math.hypot(x - x0 - u * dx, y - y0 - u * dy); };
  const sidOf = id => { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 997; return h; };
  // Aguada (marcador/aquarela rápida): multiplica sobre o papel e a tinta, borda irregular que ferve e acumula pigmento.
  const wash = (pts, col, dx = 0, dy = 0) => {
    let mx = 0, my = 0; for (const [x, y] of pts) { mx += x / pts.length; my += y / pts.length; }
    c.globalCompositeOperation = 'multiply'; path(pts.map(([x, y], i) => { const k = 1 + .07 * noise1(77 + bv * 5, i * .7); return [mx + (x - mx) * k + dx, my + (y - my) * k + dy]; }), true);
    c.fillStyle = c.strokeStyle = col; c.fill(); c.lineWidth = 2.5; c.stroke(); c.globalCompositeOperation = 'source-over';
  };

  // Papel de caderno (uma vez por worker): creme, manchas largas, grão fino, fibras, pautas azuis e margem vermelha.
  function makePaper() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
    const sm = document.createElement('canvas'); sm.width = 24; sm.height = 14; const gs = sm.getContext('2d');
    for (let i = 0; i < 24 * 14; i++) { const v = hash(i * 3.7 + 1); gs.fillStyle = `rgba(${v > .5 ? '255,252,240' : '150,120,70'},${.2 * Math.abs(v - .5)})`; gs.fillRect(i % 24, Math.floor(i / 24), 1, 1); }
    g.drawImage(sm, 0, 0, W, H);
    const im = g.getImageData(0, 0, W, H), d = im.data, k0 = STYLE.texture.grain || 12;
    for (let i = 0, n = W * H; i < n; i++) { const v = (hash(i * .7131) - .5) * k0; d[i * 4] += v; d[i * 4 + 1] += v; d[i * 4 + 2] += v * 1.15; }
    g.putImageData(im, 0, 0);
    g.lineWidth = .8;
    for (let i = 0; i < 600; i++) {  // fibras
      const x = hash(i * 1.3) * W, y = hash(i * 2.9 + 4) * H, a = hash(i * 5.1) * TAU, l = 5 + 18 * hash(i * 7.7);
      g.strokeStyle = i % 3 ? 'rgba(130,105,60,.13)' : 'rgba(255,255,250,.4)';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * .5 * Math.cos(a + .6), y + l * .5 * Math.sin(a + .6), x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke();
    }
    g.strokeStyle = P.rule; g.lineWidth = 1.6;
    for (let y = 132; y < H; y += 52) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + .8); g.stroke(); }
    g.strokeStyle = P.margin; g.lineWidth = 2; g.beginPath(); g.moveTo(196, 0); g.lineTo(197, H); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.moveTo(202, 0); g.lineTo(203, H); g.stroke();
    const rg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .62);  // bordas manuseadas
    rg.addColorStop(0, 'rgba(120,90,40,0)'); rg.addColorStop(1, 'rgba(120,90,40,.16)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    return cv;
  }
  const patOf = g => { if (!pats.has(g)) pats.set(g, g.createPattern(paper, 'no-repeat')); return pats.get(g); };

  // Traço de caneta: polilinha subdividida, tremor suave que ferve (bv), sobra nas pontas e pressão (cheio no meio,
  // fino nas pontas; o.tip = só a ponta final afina). Um fill por traço. o.ov = sobra (px), o.j = tremor (px).
  function pen(pts, w, s, o = {}) {
    const n0 = pts.length; if (n0 < 2 || !(w > 0)) return;
    const ov = o.ov ?? w * (.6 + 1.8 * rs(s, 1)), src = pts.slice();
    const ext = (a, b, k) => { const dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1; return [a[0] + dx / l * k, a[1] + dy / l * k]; };
    if (ov) { src[0] = ext(pts[0], pts[1], ov * rs(s, 2)); src[n0 - 1] = ext(pts[n0 - 1], pts[n0 - 2], ov * rs(s, 3)); }
    const q = [];
    for (let i = 0; i + 1 < n0; i++) {
      const [x0, y0] = src[i], [x1, y1] = src[i + 1], k = Math.min(12, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 9)) || 1;
      for (let j = 0; j < k; j++) q.push([lerp(x0, x1, j / k), lerp(y0, y1, j / k)]);
    }
    q.push(src[n0 - 1]);
    const n = q.length, L = [0];
    for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const len = L[n - 1] || 1, tl = Math.min(len * .3, 5 * w + 8), j = o.j ?? .35 + .2 * w, sd = s * 3.1 + bv * 17.3, R = [];
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const e = Math.sqrt(clamp((o.tip ? len - L[i] : Math.min(L[i], len - L[i])) / tl)), hw = w / 2 * (.18 + .82 * e) * (1 + .25 * noise1(s + 5, L[i] / 50)), d = j * noise1(sd, L[i] / 30);
      c.lineTo(q[i][0] + nx * (d + hw), q[i][1] + ny * (d + hw)); R.push([q[i][0] + nx * (d - hw), q[i][1] + ny * (d - hw)]);
    }
    for (let i = n - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.fillStyle = o.col || INK; c.fill();
  }
  // Contorno à mão de um polígono fechado: começa em ponto sorteado e passa do início, abrindo para fora (cruzamento).
  function ring(poly, w, s) {
    const n = poly.length, i0 = Math.floor(rs(s, 4) * n), extra = Math.max(2, Math.round(n * (.06 + .1 * rs(s, 5))));
    let mx = 0, my = 0; for (const [x, y] of poly) { mx += x / n; my += y / n; }
    pen(Array.from({ length: n + extra }, (_, i) => {
      const [x, y] = poly[(i0 + i) % n], k = i < n ? 1 : 1 + .012 * (i - n + 1) * (1 + rs(s, 6)); return [mx + (x - mx) * k, my + (y - my) * k];
    }), w, s, { ov: w });
  }
  // Contorno de um tubo (membro, tronco): lados a ±r do osso, com tampas redondas.
  function tube(b, r) {
    const n = b.length, Lf = [], Rt = [], nr = [];
    for (let i = 0; i < n; i++) {
      const a = b[Math.max(0, i - 1)], e = b[Math.min(n - 1, i + 1)], dx = e[0] - a[0], dy = e[1] - a[1], l = Math.hypot(dx, dy) || 1, ri = r[i] ?? r.at(-1);
      nr.push([-dy / l, dx / l]); Lf.push([b[i][0] - dy / l * ri, b[i][1] + dx / l * ri]); Rt.push([b[i][0] + dy / l * ri, b[i][1] - dx / l * ri]);
    }
    const cap = (i, sg) => Array.from({ length: 5 }, (_, k) => {
      const t = Math.PI * (k + 1) / 6, [nx, ny] = nr[i], ri = (r[i] ?? r.at(-1)) * sg;
      return [b[i][0] + ri * (Math.cos(t) * nx + Math.sin(t) * ny), b[i][1] + ri * (Math.cos(t) * ny - Math.sin(t) * nx)];
    });
    return [...Lf, ...cap(n - 1, 1), ...Rt.reverse(), ...cap(0, -1)];
  }
  // Tom de uma peça: base + amt pelo lado da sombra (projeção em LS: 0 do lado da luz, 1 do lado da sombra).
  function shade(poly, base, amt) {
    let lo = 1e9, hi = -1e9;
    for (const [x, y] of poly) { const v = x * LS[0] + y * LS[1]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    return (x, y) => base + amt * clamp((x * LS[0] + y * LS[1] - lo) / (hi - lo || 1)) ** 1.6;
  }
  // Tom de um tubo: através do osso (lado da sombra de cada trecho), não ao longo dele.
  function tubeShade(b, r, base, amt) {
    return (x, y) => {
      let best = 1e9, k = 0;
      for (let i = 0; i + 1 < b.length; i++) {
        const [x0, y0] = b[i], dx = b[i + 1][0] - x0, dy = b[i + 1][1] - y0, u = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1));
        const px = x - x0 - u * dx, py = y - y0 - u * dy, d = px * px + py * py;
        if (d < best) { best = d; k = (px * LS[0] + py * LS[1]) / (r[i] || 1); }
      }
      return base + amt * clamp(.5 + .5 * k) ** 1.6;
    };
  }
  // Hachura: fileiras paralelas (2 direções) cortadas no polígono; cada fileira só entra quando o tom passa do seu
  // limiar, e os trechos seguem o tom ao longo dela, quebrados em lances curtos. Âncora presa ao objeto.
  function hatch(poly, tone, o) {
    const sp = o.sp || 5, [ax, ay] = o.anchor || [0, 0], s = o.seed || 0;
    c.beginPath();
    [HA, HB].forEach((d, ps) => {
      if (ps && o.max !== undefined && o.max < TH[1][0]) return;
      const nx = -d[1], ny = d[0], av = ax * nx + ay * ny;
      let v0 = 1e9, v1 = -1e9;
      for (const [x, y] of poly) { const v = x * nx + y * ny; v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      for (let k = Math.ceil((v0 - av) / sp); av + k * sp < v1; k++) {
        const th = TH[ps][(k % 4 + 4) % 4], v = av + k * sp + .8 * (rb(s + k, ps) - .5), us = [], lmax = 40 + 100 * rs(s + k, 7 + ps);
        for (let i = 0, m = poly.length; i < m; i++) {
          const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % m], e0 = x0 * nx + y0 * ny - v, e1 = x1 * nx + y1 * ny - v;
          if ((e0 < 0) !== (e1 < 0)) { const f = e0 / (e0 - e1); us.push((x0 + (x1 - x0) * f) * d[0] + (y0 + (y1 - y0) * f) * d[1]); }
        }
        us.sort((a, b) => a - b);
        const line = (a, b) => {
          a += 2.5 * (rb(s + k, a) - .5); b += 2.5 * (rb(s + k, b + 1) - .5);
          if (b - a > 2) { c.moveTo(a * d[0] + v * nx, a * d[1] + v * ny); c.lineTo(b * d[0] + v * nx, b * d[1] + v * ny); }
        };
        for (let i = 0; i + 1 < us.length; i += 2) {
          const ub = us[i + 1]; let r0 = null;
          for (let u = us[i]; ; u += 6) {
            const end = u >= ub, uc = end ? ub : u, on = !end && tone(uc * d[0] + v * nx, uc * d[1] + v * ny) >= th;
            if (on && r0 === null) r0 = uc;
            if (r0 !== null && (!on || uc - r0 > lmax)) { line(r0, uc); r0 = on ? uc + 3 + 5 * rs(s + k, uc) : null; }
            if (end) break;
          }
        }
      }
    });
    c.lineWidth = o.w || 1.2; c.lineCap = 'round'; c.strokeStyle = P.hatch; c.stroke();
  }
  // Peça: papel por baixo (esconde o que está atrás), hachura pelo tom e contorno de caneta.
  function part(poly, tone, w, o, s) {
    path(poly, true); c.fillStyle = o.fill || pat; c.fill();
    if (tone) hatch(poly, tone, o);
    if (w) ring(poly, w, s);
  }

  // ---------- fundo ----------
  // Camadas (perfil por coluna de 4 px), hachura do céu à terra numa passada só, linhas dos perfis, capim, árvore,
  // raízes, nuvens, pedra, túneis, câmaras e fungo. Desenhado com a versão de boil bv = B % 3.
  function backdrop(F) {
    const { cx, cy, z } = F.cam, w = F.world, sx = (x, f) => (x - lerp(960, cx, f)) * z + 960, sy = y => (y - cy) * z + 540;
    const wx = (X, f) => (X - 960) / z + lerp(960, cx, f), wy = Y => (Y - 540) / z + cy, S1 = (x, y) => [sx(x, 1), sy(y)];
    const far = w.far || (F.scene === 'H' && { f: .3, prof: x => 650 + 34 * Math.sin(x * .0021 + 1) + 12 * Math.sin(x * .007) }), L = [];
    if (far) L.push({ f: far.f, prof: far.prof, tone: .1, w: 1.3 });
    if (w.mist) L.push({ f: w.mist.f, prof: w.mist.prof, tone: .1, w: 1.2 });
    if (w.hill) L.push({ f: w.hill.f, prof: w.hill.prof, tone: .2, w: 1.7 });
    if (w.back) L.push({ f: w.back.f, prof: w.back.ground, tone: .16, w: 1.8 });
    if (w.nest) L.push({ f: 1, prof: x => w.ground(x) - 30 * Math.max(0, 1 - ((x - w.nest) / 140) ** 2) ** 1.5, tone: .3, w: 2.2, x0: w.nest - 150, x1: w.nest + 150 });
    L.push({ f: 1, prof: w.ground, tone: -1, w: 2.8 });
    for (const l of L) l.ys = Float32Array.from({ length: 482 }, (_, i) => sy(l.prof(wx(i * 4, l.f))));
    // Buracos (túneis e câmaras): papel por dentro, borda escura na terra em volta.
    const TW = 19, tun = w.tunnels || [], ch = w.chambers || [];
    const dome = (x, y, [px, py, pw, ph]) => { const u = (x - px) / (pw / 2), v = (y - py) / ph; return v < 0 ? u * u + v * v : 9; };
    const tunD = (x, y) => { let d = 1e9; for (const t of tun) for (let i = 0; i + 1 < t.length; i++) d = Math.min(d, segD(x, y, t[i], t[i + 1])); return d; };
    const soil = (X, Y, yg) => {
      const x = wx(X, 1), y = wy(Y);
      if (tun.length && y > 800) {
        const dc = Math.min(...ch.map(q => dome(x, y, q))), dt = tunD(x, y);
        if (dc < 1 || dt < TW) return 0;
        if (dc < 1.15 || dt < TW + 8) return .9;
      }
      return .26 + .45 * clamp((Y - yg) / z / 600) + .1 * noise1(11 + Math.floor(y / 70), x / 160);
    };
    const tone = (X, Y) => {
      const i = clamp(Math.round(X / 4), 0, 481);
      for (let k = L.length - 1; k >= 0; k--) if (Y > L[k].ys[i]) return L[k].tone < 0 ? soil(X, Y, L[k].ys[i]) : L[k].tone;
      return 0;
    };
    // Toque de azul no céu (aguada), atrás das nuvens.
    const sky = F.scene === 'H' ? [[700, 260, 1]] : F.shot === 'wide' ? w.clouds.list.slice(0, 1) : [];
    for (const [x0, y0, k] of sky) { const X = sx(x0, .1), Y = sy(y0), r = 60 * k * z; wash(ellPoly(X - .6 * r, Y - .7 * r, 3.4 * r, .9 * r, -.08, 36), P.sky); }
    hatch([[-10, -10], [W + 10, -10], [W + 10, H + 10], [-10, H + 10]], tone, { sp: 5, w: 1.15, anchor: S1(0, 0), seed: 5 });
    // Pontilhado na crista da camada mais distante.
    { const l = L[0], ox = frac(sx(0, l.f) / 7) * 7; c.beginPath();
      for (let X = ox - 7; X < W; X += 7) { const yl = l.ys[clamp(Math.round(X / 4), 0, 481)]; for (let j = 0; j < 9; j++) { const Y = yl + j * 7 + 3, i = Math.round((X - ox) / 7) * 31 + j; if (rs(i + Math.round(sx(0, l.f) / 7) * 31, 8) < .55 - j * .06) c.rect(X + 2 * rb(i, 9), Y, 1.7, 1.7); } }
      c.fillStyle = INK; c.fill(); }
    // Linhas dos perfis, em lances de 300 a 550 px (ninguém traça a tela inteira de uma vez).
    L.forEach((l, li) => {
      const pts = [];
      for (let X = -24; X <= W + 24; X += 16) { if (l.x0 !== undefined) { const x = wx(X, 1); if (x < l.x0 || x > l.x1) continue; } pts.push([X, l.ys[clamp(Math.round(X / 4), 0, 481)]]); }
      for (let i = 0, k = 0; i < pts.length - 1; k++) { const n = 18 + Math.floor(16 * rs(li * 9 + k, 2)); pen(pts.slice(i, i + n + 1), l.w, li * 31 + k * 7); i += n; }
    });
    // Capim curto ao longo do chão, preso ao mundo.
    const G = { close: 18, wide: 7, name: 16 }[F.shot] || 14, xa = wx(-20, 1), xb = wx(W + 20, 1);
    c.beginPath();
    for (let x = Math.ceil(xa / G) * G; x < xb; x += G) {
      const i = Math.round(x / G), h = G * (.6 + 1.1 * rs(i, 1)), lean = G * (rs(i, 2) - .35) * .8, [X, Y] = S1(x + G * .4 * rs(i, 3), w.ground(x));
      c.moveTo(X, Y + 1); c.quadraticCurveTo(X + lean * z * .3, Y - h * z * .6, X + lean * z + 2 * (rb(i, 4) - .5), Y - h * z);
    }
    c.lineWidth = 1.4; c.lineCap = 'round'; c.strokeStyle = INK; c.stroke();
    const o = { sp: 5, w: 1.15, seed: 9 };
    if (w.tree) {  // árvore: tronco em tubo, copa de laços (sombra comum à copa toda)
      const { x, h } = w.tree, by = w.ground(x) + 4, b = [[x, by + 6], [x + 6, by - .3 * h], [x - 4, by - .55 * h]].map(([u, v]) => S1(u, v)), r = [26, 18, 12].map(v => v * z);
      o.anchor = b[0]; part(tube(b, r), tubeShade(b, r, .15, .55), 2.4, o, 101);
      const lobes = [[-95, .7, 80], [90, .68, 78], [0, .86, 95], [-45, .6, 70], [55, .58, 72], [5, .72, 88]].map(([dx, k, rr], i) => ellPoly(...S1(x + dx, by - k * h), rr * z * (1 + .1 * rs(i, 3)), rr * z * .85, 0, 22));
      const all = shade(lobes.flat(), .04, .62); lobes.forEach((p, i) => part(p, all, 2.2, o, 110 + i));
    }
    if (w.roots) {  // raízes: traços que afinam, com ramos
      const { x, y, h } = w.roots;
      for (let i = 0; i < 5; i++) {
        let a = Math.PI / 2 + (i - 2) * .45 + .2 * rs(i, 1), px = x + (i - 2) * 8, py = y; const pts = [S1(px, py)];
        for (let k = 0; k < 6; k++) { a += .5 * (rs(i * 7 + k, 2) - .5); const l = h * (.08 + .06 * rs(i, 4)) * (1 - .1 * k); px += l * Math.cos(a); py += l * Math.sin(a); pts.push(S1(px, py)); }
        pen(pts, clamp(4.5 * z, 1.5, 6), 120 + i, { tip: 1 });
        for (const k of [2, 4]) { const [X, Y] = pts[k], b2 = a + (rs(i * 3 + k, 5) - .5) * 2.4, l = h * .1 * z; pen([[X, Y], [X + l * Math.cos(b2), Y + l * Math.sin(b2)], [X + 1.8 * l * Math.cos(b2 + .3), Y + 1.8 * l * Math.sin(b2 + .3)]], clamp(2.5 * z, 1, 3.5), 130 + i * 3 + k, { tip: 1 }); }
      }
    }
    for (const [x0, y0, k, s] of w.clouds?.list || []) {  // nuvens: corcovas por cima, base reta, sombra embaixo
      const X = sx(x0, w.clouds.f), Y = sy(y0), r = 60 * k * z, bumps = [[-1.4, .7], [-.5, 1.05], [.5, .95], [1.4, .68]], top = [];
      if (X < -4 * r || X > W + 4 * r || Y < -3 * r || Y > H + r) continue;
      for (let i = 0; i <= 30; i++) { const u = (i / 30 * 2 - 1) * 2.05; top.push([X + u * r, Y - r * Math.max(.05, ...bumps.map(([bx, br]) => Math.sqrt(Math.max(0, br * br - (u - bx) ** 2))))]); }
      const poly = [...top, [X + 2.05 * r, Y], [X - 2.05 * r, Y]]; o.anchor = [X, Y];
      part(poly, shade(poly, -.1, .5), 1.8, o, 140 + s);
    }
    if (w.rock) {  // pedra: contorno irregular, sombra forte, uma rachadura
      const [x, y, r] = w.rock, poly = Array.from({ length: 22 }, (_, i) => { const a = i / 22 * TAU, k = 1 + .12 * noise1(77, i * .7); return S1(x + 1.3 * r * k * Math.cos(a), y + .75 * r * k * Math.min(.6, Math.sin(a))); });
      o.anchor = poly[0]; part(poly, shade(poly, .12, .7), 2.6, o, 150);
      pen([S1(x - .3 * r, y - .55 * r), S1(x - .1 * r, y - .2 * r), S1(x + .15 * r, y - .1 * r)], 1.6, 151);
    }
    // Túneis: bordas de caneta (fora das câmaras e do ar); câmaras: abóbada e chão.
    for (const [ti, t] of tun.entries()) for (const sg of [1, -1]) {
      const runs = [[]];
      for (let i = 0; i + 1 < t.length; i++) {
        const [x0, y0] = t[i], [x1, y1] = t[i + 1], l = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / l, ny = (x1 - x0) / l;
        for (let e = 0; e < l; e += 10) {
          const x = x0 + (x1 - x0) * e / l + sg * nx * TW, y = y0 + (y1 - y0) * e / l + sg * ny * TW;
          if (ch.some(q => dome(x, y, q) < 1) || y < w.ground(x) + 4 || tunD(x, y) < TW - 1) { if (runs.at(-1).length) runs.push([]); } else runs.at(-1).push(S1(x, y));
        }
      }
      runs.forEach((r, k) => pen(r, 2.2, 160 + ti * 20 + k + (sg > 0 ? 10 : 0)));
    }
    ch.forEach((q, i) => {
      const [px, py, pw, ph] = q, runs = [[]];
      for (let k = 0; k <= 40; k++) { const a = Math.PI + Math.PI * k / 40, x = px + pw / 2 * Math.cos(a), y = py + ph * Math.sin(a); if (tunD(x, y) < TW + 2) { if (runs.at(-1).length) runs.push([]); } else runs.at(-1).push(S1(x, y)); }
      runs.forEach((r, k) => pen(r, 2.4, 200 + i * 9 + k));
      pen([S1(px - pw / 2 - 6, py + 2), S1(px + pw / 2 + 6, py + 2)], 2.6, 220 + i);
    });
    for (const [fx, fy, fw, fh, fs] of w.fungus || []) {  // fungo: esponja de bolhas sobre aguada ocre que vaza
      const poly = Array.from({ length: 31 }, (_, i) => { const a = Math.PI + Math.PI * i / 30, r = 1 + .05 * Math.abs(Math.sin(i * .9 + fs)); return S1(fx + fw / 2 * r * Math.cos(a), fy - 2 + fh * r * Math.sin(a)); });
      wash(poly, P.fungus, 5 + 3 * rb(fs, 1), -4);
      c.beginPath();
      for (let y = fy - fh; y < fy; y += 7) for (let x = fx - fw / 2; x < fx + fw / 2; x += 7) {
        const i = Math.round(x / 7) * 131 + Math.round(y / 7), u = (x - fx) / (fw / 2 * .95), v = (y - fy) / (fh * .95);
        if (u * u + v * v > 1 || rs(i, 1) < .25) continue;
        const [X, Y] = S1(x + 4 * rs(i, 2), y + 4 * rs(i, 3)), r = (1.6 + 1.4 * rs(i, 4)) * z, a = rb(i, 5) * TAU;
        c.moveTo(X + r * Math.cos(a), Y + r * Math.sin(a)); c.arc(X, Y, r, a, a + 4.2);
      }
      c.lineWidth = 1; c.strokeStyle = P.hatch; c.stroke();
      ring(poly, 2, 230 + fs);
    }
    if (w.antGround) {  // H: a trilha batida das formigas, em pontinhos
      c.beginPath();
      for (let x = Math.floor(xa / 9) * 9; x < xb; x += 9) { const i = Math.round(x / 9); if (rs(i, 1) < .45) continue; const [X, Y] = S1(x + 5 * rs(i, 2), w.antGround(x) + 4 + 10 * rs(i, 3)); c.rect(X, Y, 2, 2); }
      c.fillStyle = INK; c.fill();
    }
  }
  // 3 versões do fundo (B % 3), refeitas só quando a chave (plano, câmera, nuvens) muda.
  function backdropCached(F) {
    const { cx, cy, z } = F.cam, key = `${F.scene}${F.shot}|${cx.toFixed(2)}|${cy.toFixed(2)}|${z.toFixed(4)}|${F.world.clouds?.list.map(q => q[0].toFixed(1))}`;
    const e = pool[B % 3] || (pool[B % 3] = { cv: Object.assign(document.createElement('canvas'), { width: W, height: H }), key: null });
    if (e.key !== key) {
      const keep = c; c = e.cv.getContext('2d'); pat = patOf(c); c.drawImage(paper, 0, 0); bv = B % 3;
      backdrop(F); c = keep; pat = patOf(c); bv = B; e.key = key;
    }
    c.drawImage(e.cv, 0, 0);
  }

  // ---------- seres ----------
  // Mundo → tela de um ator: virada (flip) em torno do meio do corpo, achatar/esticar (sq) a partir do chão, câmera da camada.
  function mapper(F, a) {
    const { cx, cy, z } = F.cam, ox = 960 - lerp(960, cx, a.layer) * z, oy = 540 - cy * z, p = a.pose;
    const m = (p.spine[0].x + p.spine.at(-1).x) / 2, sq = p.sq || 0, gy = sq ? (a.ground ? a.ground(m) : p.spine[0].y) : 0, kx = (a.flip ?? 1) * (1 + .5 * sq), ky = 1 - sq;
    return (x, y) => [(m + (x - m) * kx) * z + ox, (gy + (y - gy) * ky) * z + oy];
  }
  // Sombra de contato: elipse só de hachura cruzada.
  const contact = (M, x, y, rx, ry, o) => hatch(ellPoly(x, y, rx, ry, 0, 18).map(([u, v]) => M(u, v)), () => .75, o);

  // Folha (pedaço cortado): borda de fora serrilhada, corte reto, nervuras; aguada verde que vaza da linha.
  function leaf(L, M, w, o, mini, hero) {
    const co = Math.cos(L.angle), si = Math.sin(L.angle), at = (u, v) => M(L.x + co * u - si * v, L.y + si * u + co * v), pts = [];
    for (let i = 0; i <= 26; i++) { const k = i / 26; pts.push(at((k - .5) * L.w, -L.h * .62 * Math.sqrt(Math.max(0, 1 - (2 * k - 1) ** 2)) * (1 + .05 * Math.abs(Math.sin(i * 1.6))))); }
    for (let i = 6; i >= 1; i--) { const k = i / 7; pts.push(at((k - .5) * L.w, L.h * (.16 * Math.sqrt(1 - (2 * k - 1) ** 2) + (i % 2) * .06))); }
    if (mini) { path(pts, true); c.fillStyle = pat; c.fill(); c.lineWidth = .8; c.strokeStyle = INK; c.stroke(); c.globalCompositeOperation = 'multiply'; c.fillStyle = P.leafMini; c.fill(); c.globalCompositeOperation = 'source-over'; return; }
    part(pts, shade(pts, 0, .3), w * .8, o, o.seed + 70);
    pen([at(-.5 * L.w, 0), at(.45 * L.w, -.1 * L.h)], w * .6, o.seed + 71);
    for (const u of [-.25, 0, .22]) pen([at(u * L.w, -.03 * L.h), at((u + .14) * L.w, -.42 * L.h)], w * .45, o.seed + 72 + u * 10);
    wash(pts, hero ? P.leaf : P.leafMini, (rb(o.seed, 30) - .3) * .08 * L.h * 2, (rb(o.seed, 31) - .6) * .08 * L.h * 2);
  }

  // Formiga: segmentos hachurados (irmãs escuras; a protagonista clara, com aguada laranja), patas, antenas e folha.
  function ant(a, M, z, sid) {
    const p = a.pose, s = p.size, S = s * z, hero = a.role === 'hero', f = p.facing, sp = p.spine, hd = p.head, hr = SPECS.ant.head.r * s;
    const lp = (q, ang, u, v) => M(q.x + Math.cos(ang) * u - Math.sin(ang) * v * f, q.y + Math.sin(ang) * u + Math.cos(ang) * v * f);
    const el = (q, ang, rx, ry) => ellPoly(q.x, q.y, rx, ry, ang, S < 150 ? 16 : 30).map(([x, y]) => M(x, y));
    const body = [el(sp[2], sp[2].angle, 1.15 * sp[2].r, .9 * sp[2].r), el(sp[1], sp[1].angle, 1.3 * sp[1].r, .9 * sp[1].r), el(sp[0], sp[0].angle, 1.4 * sp[0].r, .82 * sp[0].r), el(hd, hd.angle, 1.08 * hr, .95 * hr)];
    const legs = Object.values(p.limbs), ants = ['antennaL', 'antennaR'].map((k, i) => ({ pts: p.appendages[k].map(([x, y]) => M(x, y)), far: (i ? -1 : 1) * f < 0 }));
    if (S < 60) {  // miúda: silhueta cheia (a protagonista em laranja com contorno)
      const lw = Math.max(.8, S * .028); c.beginPath();
      for (const l of legs) sub([l.root, l.mid, l.end].map(([x, y]) => M(x, y)));
      for (const an of ants) sub(an.pts);
      c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = c.lineCap = 'round'; c.stroke();
      if (p.carry) leaf(p.carry, M, 1, {}, true);
      c.beginPath(); body.forEach(b => sub(b, true)); c.fillStyle = hero ? P.heroSolid : INK; c.fill();
      if (hero) { c.lineWidth = 1.2; c.stroke(); }
      return;
    }
    const w = clamp(S * .0055, 1.1, 4), o = { sp: clamp(S * .012, 3, 5.5), w: clamp(S * .0022, .8, 1.5), anchor: M(sp[0].x, sp[0].y), seed: sid }, big = S > 170;
    const base = hero ? .06 : .42, amt = hero ? .5 : .45, washed = [];
    if (hero) contact(M, sp[0].x, a.ground ? a.ground(sp[0].x) : sp[0].y + .17 * s, .45 * s, .045 * s, o);
    if (p.carry) leaf(p.carry, M, w, o, false, hero);
    const limb = (l, k) => {
      const q = [l.root, l.mid, l.end].map(([x, y]) => M(x, y));
      if (!big) return pen(q, w * (l.far ? 1 : 1.3), sid + k, { col: l.far ? P.hatch : INK });
      const r = [.02, .016, .01].map(v => v * S), tp = tube(q, r); if (!l.far) washed.push(tp); part(tp, tubeShade(q, r, base + (l.far ? .25 : 0), amt), w * (l.far ? .7 : .9), o, sid + k);
    };
    legs.forEach((l, k) => l.far && limb(l, k));
    ants.forEach((an, k) => an.far && pen(an.pts, w * .7, sid + 40 + k, { col: P.hatch }));
    body.forEach((b, k) => part(b, shade(b, base, amt), w, o, sid + 20 + k));
    const g = sp[2], grx = 1.15 * g.r, gry = .9 * g.r, t0 = sp[0], trx = 1.4 * t0.r, tr = .82 * t0.r;
    for (const u0 of [-.35, .12]) pen(Array.from({ length: 7 }, (_, i) => { const v = (i / 3 - 1) * .85 * gry * Math.sqrt(1 - u0 * u0); return lp(g, g.angle, (u0 + .2 * (1 - (v / gry) ** 2)) * grx, v); }), w * .55, sid + 50 + u0 * 10);
    for (const [u, du] of [[.35, .3], [-.1, .25], [-.5, .2]]) pen([lp(t0, t0.angle, u * trx, -.85 * tr), lp(t0, t0.angle, (u - du * .5) * trx, -(1.3 + du) * tr)], w * .7, sid + 60 + u * 10, { tip: 1 });
    const [ex, ey] = lp(hd, hd.angle, .4 * hr, -.2 * hr), er = .17 * hr * z;
    c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(ex - .35 * er, ey - .35 * er, .3 * er, 0, TAU); c.fillStyle = P.paper; c.fill();
    pen([lp(hd, hd.angle, .75 * hr, .35 * hr), lp(hd, hd.angle, 1.22 * hr, .42 * hr), lp(hd, hd.angle, 1.1 * hr, .7 * hr)], w * 1.1, sid + 70, { ov: 0 });
    legs.forEach((l, k) => !l.far && limb(l, k));
    ants.forEach((an, k) => !an.far && pen(an.pts, w * .9, sid + 40 + k));
    if (hero) {  // aguada laranja: um pouco maior e deslocada, por cima de tudo (multiplica: a tinta continua preta)
      const dx = (rb(sid, 31) - .3) * .015 * S, dy = (rb(sid, 32) - .6) * .015 * S;
      c.globalCompositeOperation = 'multiply'; c.beginPath();
      for (const b of washed) sub(b, true);
      c.fillStyle = P.hero; c.fill(); c.beginPath();  // patas à parte: o sentido do tubo cancelaria a união com o corpo
      for (const b of body) { let mx = 0, my = 0; b.forEach(([x, y]) => { mx += x / b.length; my += y / b.length; }); sub(b.map(([x, y]) => [mx + (x - mx) * 1.07 + dx, my + (y - my) * 1.07 + dy]), true); }
      c.fillStyle = P.hero; c.fill(); c.globalCompositeOperation = 'source-over';
    }
  }

  // Forídea: corcunda escura e hachurada, olho grande, asas em laço (sem papel: transparentes) que batem, pernas penduradas.
  function fly(a, M, z, sid) {
    const p = a.pose, s = p.size, S = s * z, f = p.facing, sp = p.spine, hd = p.head, hr = SPECS.fly.head.r * s, t0 = sp[0], ang = t0.angle;
    const lw = (u, v) => [t0.x + Math.cos(ang) * u - Math.sin(ang) * v * f, t0.y + Math.sin(ang) * u + Math.cos(ang) * v * f];
    const flap = .5 + .5 * Math.cos(p.wings.phase * TAU), w = clamp(S * .006, .9, 3.2), o = { sp: clamp(S * .012, 3, 5), w: clamp(S * .0022, .8, 1.4), anchor: M(t0.x, t0.y), seed: sid };
    const wing = b => {
      const r0 = lw(-.02 * s, -.11 * s), tip = lw((-.02 - .55 * Math.cos(b)) * s, (-.11 - .55 * Math.sin(b)) * s), mid = [(r0[0] + tip[0]) / 2, (r0[1] + tip[1]) / 2];
      const poly = ellPoly(mid[0], mid[1], .29 * s, .085 * s, Math.atan2(tip[1] - r0[1], tip[0] - r0[0]), 20).map(([x, y]) => M(x, y));
      ring(poly, w * .7, sid + b * 10);
      if (S > 45) pen([M(...r0), M(...tip)], w * .4, sid + 3 + b * 10);
    };
    const el = (q, an, rx, ry) => ellPoly(q.x, q.y, rx, ry, an, S < 60 ? 14 : 24).map(([x, y]) => M(x, y));
    const body = [el(sp[1], sp[1].angle, 1.25 * sp[1].r, .85 * sp[1].r), el(t0, ang, 1.05 * t0.r, .95 * t0.r), el(hd, hd.angle, .95 * hr, .9 * hr)];
    wing(.65 + 1.15 * flap);
    if (S < 45) { c.beginPath(); body.forEach(b => sub(b, true)); c.fillStyle = INK; c.fill(); wing(.35 + 1.15 * flap); return; }
    for (const [k, i] of [[.06, 0], [-.01, 1], [-.08, 2]]) { const sw = .03 * noise1(sid + i, a.pose.wings.phase * 2 + i); pen([lw(k * s, .1 * s), lw((k - .06) * s, .21 * s), lw((k - .02 + sw) * s, .32 * s)].map(q => M(...q)), w * .7, sid + 80 + i, { tip: 1 }); }
    body.forEach((b, k) => part(b, shade(b, .45, .4), w, o, sid + 20 + k));
    for (const [u, v] of [[.05, -.12], [-.04, -.13], [-.12, -.1]]) pen([M(...lw(u * s, v * s)), M(...lw((u - .03) * s, (v - .06) * s))], w * .6, sid + 90 + u * 100, { tip: 1 });
    const hx = hd.x + f * .3 * hr, hy = hd.y - .1 * hr, [ex, ey] = M(hx, hy), er = .5 * hr * z;
    c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(ex - .35 * er, ey - .35 * er, .25 * er, 0, TAU); c.fillStyle = P.paper; c.fill();
    wing(.35 + 1.15 * flap);
  }

  // Explorador: tubos (pernas, braços, tronco), botas, mochila com saco de dormir, cabeça grande com rosto e chapéu.
  function human(a, M, z, sid) {
    const p = a.pose, s = p.size, S = s * z, f = p.facing, C = p.spine[0], Pv = p.spine[1], Lm = p.limbs, gear = a.gear || [];
    const w = clamp(S * .0072, 1.3, 4), o = { sp: 5, w: clamp(S * .0026, .9, 1.5), anchor: M(C.x, C.y), seed: sid };
    let ux = C.x - Pv.x, uy = C.y - Pv.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;  // eixo do tronco (para cima)
    const fx = -uy * f, fy = ux * f, T = (u, v) => [C.x + (fx * u + ux * v) * s, C.y + (fy * u + uy * v) * s], TM = (u, v) => M(...T(u, v));
    const Ms = pts => pts.map(([x, y]) => M(x, y)), R = r => r.map(v => v * S);
    contact(M, Pv.x + f * .02 * s, (a.ground ? a.ground(Pv.x) : Pv.y + .48 * s) + .005 * s, .2 * s, .022 * s, o);
    const limb = (l, r, k) => { const b = Ms([l.root, l.mid, l.end]), rr = R(r); part(tube(b, rr), tubeShade(b, rr, .06 + (l.far ? .3 : 0), .5), w * (l.far ? .8 : 1), o, sid + k); return b; };
    const leg = (l, k) => {
      limb({ ...l, end: [l.end[0], l.end[1] - .06 * s] }, [.058, .05, .043], k);
      const [x, y] = l.end, Bt = (u, v) => M(x + f * u * s, y + v * s), poly = [Bt(-.04, -.09), Bt(.035, -.09), Bt(.05, -.05), Bt(.1, -.032), Bt(.118, -.008), Bt(.1, .006), Bt(-.045, .006), Bt(-.052, -.03)];
      part(poly, shade(poly, .35 + (l.far ? .2 : 0), .45), w, o, sid + 80 + k); pen([Bt(-.05, .002), Bt(.11, .002)], w * 1.3, sid + 85 + k);
    };
    const arm = (l, k) => {
      const b = limb(l, [.036, .031, .027], k), [mx, my] = b[1], [ex, ey] = b[2], dx = ex - mx, dy = ey - my, dl = Math.hypot(dx, dy) || 1, r = .036 * S;
      pen([[mx + dx * .18 - dy / dl * r, my + dy * .18 + dx / dl * r], [mx + dx * .18 + dy / dl * r, my + dy * .18 - dx / dl * r]], w * .7, sid + k + 5);  // manga dobrada
      const hand = ellPoly(ex + dx / dl * .02 * S, ey + dy / dl * .02 * S, .034 * S, .03 * S, Math.atan2(dy, dx), 14); part(hand, shade(hand, 0, .35), w * .9, o, sid + k + 7);
    };
    const [aF, aN] = Lm.armL.far ? [Lm.armL, Lm.armR] : [Lm.armR, Lm.armL], [lF, lN] = Lm.legL.far ? [Lm.legL, Lm.legR] : [Lm.legR, Lm.legL];
    arm(aF, 1);
    if (gear.includes('backpack')) {  // mochila nas costas, bolso, aba e saco de dormir enrolado em cima
      const rr = (u0, u1, v0, v1, r) => [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, .5], [u0 + r, v0 + r, 1], [u1 - r, v0 + r, 1.5]].flatMap(([cu, cv, a0]) => Array.from({ length: 5 }, (_, i) => { const t = (a0 + i / 8) * Math.PI; return TM(cu + r * Math.cos(t), cv + r * Math.sin(t)); }));
      const bag = rr(-.29, -.08, -.21, .08, .045); part(bag, shade(bag, .3, .45), w, o, sid + 30);
      const pk = rr(-.32, -.24, -.16, -.03, .02); part(pk, shade(pk, .4, .4), w * .8, o, sid + 31);
      pen([TM(-.29, .0), TM(-.18, -.03), TM(-.08, .0)], w * .7, sid + 32);
      const roll = ellPoly(...T(-.18, .12), .13 * s, .048 * s, Math.atan2(fy, fx), 18).map(([x, y]) => M(x, y)); part(roll, shade(roll, .12, .4), w, o, sid + 33);
      for (const u of [-.25, -.11]) pen([TM(u, .165), TM(u + .01, .075)], w * .7, sid + 34 + u * 10);
    }
    leg(lF, 2); leg(lN, 3);
    const tb = Ms([T(0, .1), [C.x, C.y], [Pv.x - ux * .03 * s, Pv.y - uy * .03 * s]]), tr = R([.075, .105, .096]);
    part(tube(tb, tr), tubeShade(tb, tr, .05, .5), w, o, sid + 40);
    const bc = [Pv.x + fx * .09 * s, Pv.y + fy * .09 * s];
    pen([M(Pv.x - fx * .094 * s, Pv.y - fy * .094 * s), M(...bc)], w * 1.2, sid + 41);  // cinto e fivela
    c.fillStyle = INK; const [bx, by] = M(...bc); c.fillRect(bx - .012 * S, by - .012 * S, .016 * S, .024 * S);
    pen([TM(.015, .035), TM(.07, .035), TM(.072, -.025), TM(.017, -.027), TM(.015, .035)], w * .55, sid + 42);  // bolso
    pen([TM(-.03, .1), TM(.025, .055), TM(.06, .095)], w * .7, sid + 43);  // gola
    if (gear.includes('backpack')) { const st = Ms([T(-.085, .075), T(.02, .1), T(.075, .01), T(.05, -.11)]), sr = R([.017, .017, .017, .017]); part(tube(st, sr), tubeShade(st, sr, .3, .4), w * .8, o, sid + 44); }
    // Cabeça: 1,45× a da pose (rosto que lê), presa ao pescoço; quadro local da cabeça: x para a frente, y para baixo.
    const hd = p.head, Nk = T(0, .1), rh = SPECS.human.head.r * s * 1.45, Hc = [hd.x + (hd.x - Nk[0]) * .3, hd.y + (hd.y - Nk[1]) * .3];
    const th = f > 0 ? hd.angle : Math.PI - hd.angle, co = Math.cos(th), si = Math.sin(th);
    const hw = (lx, ly) => [Hc[0] + f * (lx * co - ly * si) * rh, Hc[1] + (lx * si + ly * co) * rh], hl = (lx, ly) => M(...hw(lx, ly));
    const nb = Ms([Nk, hw(-.1, .75)]), nr = R([.034, .03]); part(tube(nb, nr), tubeShade(nb, nr, .15, .5), w * .9, o, sid + 45);
    const head = Array.from({ length: 28 }, (_, i) => { const t = i / 28 * TAU; return hl(.92 * Math.cos(t) + .12 * Math.max(0, Math.cos(t)) * Math.max(0, Math.sin(t)), 1.03 * Math.sin(t)); });
    part(head, shade(head, -.05, .35), w, o, sid + 46);
    const ear = Array.from({ length: 12 }, (_, i) => { const t = i / 12 * TAU; return hl(-.14 + .13 * Math.cos(t), .1 + .19 * Math.sin(t)); }); part(ear, null, w * .8, o, sid + 47);
    pen([hl(-.1, .02), hl(-.17, .1), hl(-.1, .17)], w * .6, sid + 48);
    const dh = [Hc[0] - hd.x, Hc[1] - hd.y];
    pen(p.appendages.hair.map(([x, y]) => M(x + dh[0], y + dh[1])), w * .8, sid + 49, { tip: 1 });
    for (const [i, q] of [[[-.55, -.4], [-.86, -.05], [-.8, .28]], [[-.38, -.45], [-.72, -.02], [-.66, .22]]].entries()) pen(q.map(v => hl(...v)), w * .7, sid + 50 + i, { tip: 1 });
    c.beginPath(); for (let i = 0; i < 16; i++) { const [x, y] = hl(.25 + .5 * rs(sid + i, 1), .45 + .4 * rs(sid + i, 2)); c.rect(x, y, 1.6, 1.6); } c.fillStyle = INK; c.fill();  // barba por fazer
    const e = p.face.expression, closed = p.face.blink > .5, E = { curious: [.08, .12, .03], surprised: [.15, .17, 0] }[e] || [.07, .1, 0];
    [[.36, -.05, 1], [.76, -.08, .75]].forEach(([x, y, k], i) => {
      const [X, Y] = hl(x, y + E[2]), rx = E[0] * rh * z * k, ry = E[1] * rh * z * k;
      if (closed) return pen([hl(x - .09 * k, y), hl(x, y + .04), hl(x + .09 * k, y)], w * .8, sid + 55 + i);
      if (e === 'surprised') {
        const ey = ellPoly(X, Y, rx, ry, 0, 16); path(ey, true); c.fillStyle = pat; c.fill(); ring(ey, w * .6, sid + 57 + i);
        c.beginPath(); c.arc(X + f * .2 * rx, Y, .4 * rx, 0, TAU); c.fillStyle = INK; c.fill();
      } else { c.beginPath(); c.ellipse(X, Y, rx, ry, 0, 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(X - .3 * rx, Y - .35 * ry, .3 * rx, 0, TAU); c.fillStyle = P.paper; c.fill(); }
    });
    const BR = { curious: [[.18, -.42, .52, -.52], [.64, -.3, .88, -.33]], surprised: [[.16, -.52, .52, -.6], [.62, -.57, .9, -.52]] }[e] || [[.2, -.3, .52, -.33], [.64, -.33, .88, -.3]];
    BR.forEach(([x0, y0, x1, y1], i) => pen([hl(x0, y0), hl((x0 + x1) / 2, Math.min(y0, y1) - .06), hl(x1, y1)], w * 1.1, sid + 60 + i));
    pen([hl(.86, -.12), hl(1.13, .15), hl(.9, .24)], w * .9, sid + 62);
    if (e === 'surprised') { const [X, Y] = hl(.66, .58), m = ellPoly(X, Y, .1 * rh * z, .16 * rh * z, 0, 14); path(m, true); c.fillStyle = INK; c.fill(); }
    else pen(e === 'curious' ? [hl(.56, .53), hl(.66, .49), hl(.75, .55)] : [hl(.5, .5), hl(.66, .55), hl(.8, .47)], w * .8, sid + 63);
    if (gear.includes('hat')) {  // chapéu de explorador: aba, copa com afundado, fita escura, beirada da aba por cima
      const brim = Array.from({ length: 26 }, (_, i) => { const t = i / 26 * TAU; return hl(.05 + 1.48 * Math.cos(t), -.46 + .2 * Math.sin(t)); });
      part(brim, shade(brim, .1, .4), w, o, sid + 64);
      const crown = [...Array.from({ length: 15 }, (_, i) => { const t = Math.PI + Math.PI * i / 14; return hl(.9 * Math.cos(t), -.5 + .86 * Math.sin(t) * (1 - .08 * Math.cos(t) ** 2)); })];
      part(crown, shade(crown, .03, .5), w, o, sid + 65);
      const band = [hl(-.9, -.5), hl(-.88, -.68), hl(0, -.7), hl(.88, -.66), hl(.9, -.5), hl(0, -.48)]; part(band, () => .85, w * .7, o, sid + 66);
      pen([hl(-.32, -1.22), hl(0, -1.12), hl(.32, -1.2)], w * .6, sid + 67);
      pen(Array.from({ length: 12 }, (_, i) => { const t = .12 * TAU + i / 11 * .76 * Math.PI; return hl(.05 + 1.48 * Math.cos(t), -.46 + .2 * Math.sin(t)); }), w * 1.1, sid + 68);
    }
    arm(aN, 4);
    if (p.emote && p.emote.a > 0) {  // emote a caneta: ? ou ! com traços de susto
      const { sym, k, a: al } = p.emote, [X, Y] = hl(1.05, -1.85), sz = 1.5 * rh * z * Math.max(0, k);
      c.save(); c.globalAlpha *= al; c.font = `bold ${sz}px ${FONT}`; c.textAlign = 'center'; c.fillStyle = INK; c.translate(X, Y); c.rotate(.12 * (rb(sid, 70) - .5)); c.fillText(sym, 0, 0); c.restore();
      if (sym === '!') { c.save(); c.globalAlpha *= al; for (const [i, [x0, y0, x1, y1]] of [[-.75, -1.5, -1.05, -1.95], [-.1, -1.62, -.14, -2.15], [.5, -1.56, .74, -2.02]].entries()) pen([hl(x0, y0), hl(lerp(x0, x1, k), lerp(y0, y1, k))], w, sid + 71 + i); c.restore(); }
    }
  }

  // Capim do primeiro plano: lâminas de tinta cheia, balançando devagar.
  function frontGrass(F) {
    const fr = F.world.front; if (!fr) return;
    const { cx, cy, z } = F.cam, xa = (-80 - 960) / z + cx, xb = (W + 80 - 960) / z + cx;
    for (let x = Math.floor(xa / 60) * 60; x < xb; x += 60) {
      const i = Math.round(x / 60); if (rs(i, 9) < .35) continue;
      for (let j = 0; j < 4; j++) {
        const bx = x + 14 * j + 10 * rs(i, j), h = 45 + 65 * rs(i * 5 + j, 2), lean = (rs(i * 5 + j, 3) - .5) * 60 + 14 * noise1(i * 5 + j, F.t * .5);
        pen([0, .35, .7, 1].map(k => [(bx + lean * k * k - cx) * z + 960, (fr(bx) - h * k - cy) * z + 540]), 5.5, i * 13 + j, { ov: 0, tip: 1 });
      }
    }
  }
  // Letra de mão a caneta: cada letra com seu tremor (ferve), escrita da esquerda para a direita conforme k, e sublinhado.
  function texts(F) {
    for (const s of F.texts) {
      if (!(s.k > 0)) continue;
      c.font = `${s.size}px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = INK;
      const ch = [...s.text], ws = ch.map(l => c.measureText(l).width), tw = ws.reduce((a, b) => a + b, 0), shown = s.k * (ch.length + 3);
      let x = s.x - tw / 2;
      ch.forEach((l, i) => {
        const al = clamp(shown - i);
        if (al > 0) { c.save(); c.globalAlpha = al; c.translate(x + ws[i] / 2, s.y + 3 * (rb(i, 21) - .5)); c.rotate(.08 * (rb(i, 22) - .5)); c.fillText(l, -ws[i] / 2, 0); c.fillText(l, -ws[i] / 2 + .9, .4); c.restore(); }
        x += ws[i];
      });
      const u = clamp(shown - ch.length);
      if (u > 0) pen([[s.x - tw / 2 - 10, s.y + 16], [s.x - tw / 2 - 10 + (tw + 34) * u, s.y + 11]], 3, 77);
    }
  }

  window.ExpStyle = {
    draw(F) {
      c = animationEngine.context; c.resetTransform(); B = Math.floor(Math.round(F.t * 30) / 3); bv = B;
      if (!paper) paper = makePaper();
      pat = patOf(c); c.lineJoin = 'round';
      backdropCached(F);
      for (const a of F.actors) {
        if (a.hidden || a.alpha === 0) continue;
        const M = mapper(F, a), z = F.cam.z, sid = sidOf(a.id);
        c.globalAlpha = a.alpha ?? 1;
        if (a.kind === 'human') human(a, M, z, sid); else if (a.kind === 'fly') fly(a, M, z, sid); else ant(a, M, z, sid);
        c.globalAlpha = 1;
      }
      frontGrass(F); texts(F);
    },
  };
})();
