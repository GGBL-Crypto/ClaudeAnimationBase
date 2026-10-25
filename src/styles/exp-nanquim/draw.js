// Nanquim (exp/estilos): caneta e nanquim no caderno. Tudo é desenhado em pixels de tela (a caneta tem largura fixa no
// papel): cada ponto do mundo passa pela câmera da sua camada antes do traço. Tom só por hachura (luz do alto à
// esquerda); cor aguada só nos acentos. Boil: B troca a cada 3 quadros; o fundo usa B % 3 (3 versões em cache).
(() => {
  const P = STYLE.palette, INK = P.ink, LS = [.55, .835];  // LS: direção da sombra (oposta à luz)
  const HA = [Math.cos(-1), Math.sin(-1)], HB = [Math.cos(.55), Math.sin(.55)];  // hachura e contra-hachura
  const TH = [[.1, .34, .22, .44], [.55, .72, .63, .8]];  // tom mínimo de cada fileira (ciclo de 4): densidade pelo tom
  const FONT = '"Ink Free", "Segoe Print", "Comic Sans MS", cursive';
  let c, B = 0, bv = 0, pat, paper, blank;
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
    const rg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .62);  // bordas manuseadas
    rg.addColorStop(0, 'rgba(120,90,40,0)'); rg.addColorStop(1, 'rgba(120,90,40,.16)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    blank = Object.assign(document.createElement('canvas'), { width: W, height: H }); blank.getContext('2d').drawImage(cv, 0, 0);  // papel sem pauta: recheio dos seres
    g.strokeStyle = P.rule; g.lineWidth = 1.6;
    for (let y = 132; y < H; y += 52) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + .8); g.stroke(); }
    g.strokeStyle = P.margin; g.lineWidth = 2; g.beginPath(); g.moveTo(196, 0); g.lineTo(197, H); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.moveTo(202, 0); g.lineTo(203, H); g.stroke();
    return cv;
  }
  const patOf = g => { if (!pats.has(g)) pats.set(g, g.createPattern(blank, 'no-repeat')); return pats.get(g); };

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
  // Contorno à mão de um polígono fechado: começa em ponto sorteado (ou em poly.i0) e passa do início, abrindo para fora
  // (cruzamento).
  function ring(poly, w, s) {
    const n = poly.length, i0 = poly.i0 ?? Math.floor(rs(s, 4) * n), extra = Math.max(2, Math.round(n * (.06 + .1 * rs(s, 5))));
    let mx = 0, my = 0; for (const [x, y] of poly) { mx += x / n; my += y / n; }
    pen(Array.from({ length: n + extra }, (_, i) => {
      const [x, y] = poly[(i0 + i) % n], k = i < n ? 1 : 1 + .012 * (i - n + 1) * (1 + rs(s, 6)); return [mx + (x - mx) * k, my + (y - my) * k];
    }), w, s, { ov: w });
  }
  // Contorno de um tubo (membro, tronco): lados a ±r do osso; tampas redondas ou retas ('butt', na junta final). O
  // contorno começa no meio da tampa da raiz (i0): o cruzamento do fecho sobra para lá, nunca para a ponta.
  function tube(b, r, end = 'round', root = 'round') {
    const n = b.length, Lf = [], Rt = [], nr = [];
    for (let i = 0; i < n; i++) {
      const a = b[Math.max(0, i - 1)], e = b[Math.min(n - 1, i + 1)], dx = e[0] - a[0], dy = e[1] - a[1], l = Math.hypot(dx, dy) || 1, ri = r[i] ?? r.at(-1);
      nr.push([-dy / l, dx / l]); Lf.push([b[i][0] - dy / l * ri, b[i][1] + dx / l * ri]); Rt.push([b[i][0] + dy / l * ri, b[i][1] - dx / l * ri]);
    }
    const cap = (i, sg, k) => k === 'butt' ? [] : Array.from({ length: 5 }, (_, k) => {
      const t = Math.PI * (k + 1) / 6, [nx, ny] = nr[i], ri = (r[i] ?? r.at(-1)) * sg;
      return [b[i][0] + ri * (Math.cos(t) * nx + Math.sin(t) * ny), b[i][1] + ri * (Math.cos(t) * ny - Math.sin(t) * nx)];
    });
    const out = [...Lf, ...cap(n - 1, 1, end), ...Rt.reverse(), ...cap(0, -1, root)];
    if (root !== 'butt') out.i0 = out.length - 3;
    return out;
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
    const sp = o.sp || 5, [ax, ay] = o.anchor || [0, 0], s = o.seed || 0, TT = o.th || TH, ro = o.rot || 0;
    c.beginPath();
    [HA, HB].forEach((d0, ps) => {
      const d = ro ? [d0[0] * Math.cos(ro) - d0[1] * Math.sin(ro), d0[0] * Math.sin(ro) + d0[1] * Math.cos(ro)] : d0;
      const nx = -d[1], ny = d[0], av = ax * nx + ay * ny;
      let v0 = 1e9, v1 = -1e9;
      for (const [x, y] of poly) { const v = x * nx + y * ny; v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      for (let k = Math.ceil((v0 - av) / sp); av + k * sp < v1; k++) {
        const th = TT[ps][(k % 4 + 4) % 4], v = av + k * sp + sp * .4 * (rs(s + k, 11 + ps) - .5) + .8 * (rb(s + k, ps) - .5), us = [], lmax = 40 + 100 * rs(s + k, 7 + ps);
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
    // Fundo distante por cena: morros em H e N, telhados da cidade em P.
    const FAR = { H: x => 650 + 34 * Math.sin(x * .0021 + 1) + 12 * Math.sin(x * .007), N: x => 640 + 40 * Math.sin(x * .0017 + 2) + 15 * Math.sin(x * .006), P: x => { const i = Math.floor(x / 170); return 600 + 140 * hash(i * 3.1 + 7) * (hash(i * 1.7) > .3 ? 1 : .25); } };
    const far = w.far || (FAR[F.scene] && { f: .3, prof: FAR[F.scene] }), L = [];
    if (far) L.push({ f: far.f, prof: far.prof, tone: .1, w: 1.3 });
    if (w.mist) L.push({ f: w.mist.f, prof: w.mist.prof, tone: .1, w: 1.2 });
    if (w.hill) L.push({ f: w.hill.f, prof: w.hill.prof, tone: .2, w: 1.7 });
    if (w.back) L.push({ f: w.back.f, prof: w.back.ground, tone: .16, w: 1.8 });
    const nx = w.nest?.x ?? w.nest, nk = (w.nest?.r ?? 60) / 60;  // ninho: x (A) ou {x, r} (N)
    if (w.nest) L.push({ f: 1, prof: x => w.ground(x) - 30 * nk * Math.max(0, 1 - ((x - nx) / (140 * nk)) ** 2) ** 1.5, tone: .3, w: 2.2, x0: nx - 150 * nk, x1: nx + 150 * nk });
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
      const tn = .1 + .5 * clamp((Y - yg) / z / 650) + .2 * noise1(11 + Math.floor(y / 90), x / 210);
      return w.lake && x > w.lake.x0 ? Math.min(.3, tn) : tn;  // fundo do lago: lodo claro, sem contra-hachura sob a água
    };
    const tone = (X, Y) => {
      const i = clamp(Math.round(X / 4), 0, 481);
      for (let k = L.length - 1; k >= 0; k--) if (Y > L[k].ys[i]) return L[k].tone < 0 ? soil(X, Y, L[k].ys[i]) : -L[k].tone;
      return 0;
    };  // < 0: camada distante (só pontilhado)
    // Toque de azul no céu (aguada), atrás das nuvens.
    const sky = F.scene === 'H' || F.scene === 'P' || F.scene === 'N' ? [[700, 260, 1]] : F.shot === 'wide' ? w.clouds.list.slice(0, 1) : [];
    for (const [x0, y0, k] of sky) { const X = sx(x0, .1), Y = sy(y0), r = 60 * k * z; wash(ellPoly(X - .6 * r, Y - .7 * r, 3.4 * r, .9 * r, -.08, 36), P.sky); }
    // Terra: hachura em faixas (estratos de 240 px do mundo), cada uma com ângulo e espaçamento próprios; contra-hachura
    // só nas sombras fundas. Céu e camadas distantes: papel, com pontilhado leve que adensa na crista.
    const top = Math.min(...L.at(-1).ys), y0 = wy(Math.max(0, top)), ST = 240, SOIL = [[.12, .36, .24, .48], [.66, .82, .74, .9]];
    for (let b = Math.floor(y0 / ST); sy(b * ST) < H; b++) {
      const Y0 = Math.max(top - 2, sy(b * ST)), Y1 = Math.min(H + 10, sy((b + 1) * ST) + 1), q = ((b % 3) + 3) % 3;
      if (Y1 > Y0) hatch([[-10, Y0], [W + 10, Y0], [W + 10, Y1], [-10, Y1]], (X, Y) => Math.max(0, tone(X, Y)), { sp: [5, 6.5, 5.6][q], rot: [0, .38, -.3][q], th: SOIL, w: 1.15, anchor: S1(0, b * ST), seed: 5 + b * 13 });
    }
    { const ox = frac(sx(0, .5) / 6) * 6, oi = Math.round(sx(0, .5) / 6); c.beginPath();
      for (let X = ox - 6; X < W; X += 6) for (let Y = 2, j = 0; Y < Math.min(H, top + 40); Y += 6, j++) {
        const t2 = -tone(X, Y); if (t2 <= 0) continue;
        const i = clamp(Math.round(X / 4), 0, 481), l = L.find((m, k) => Y > m.ys[i] && !(L[k + 1] && Y > L[k + 1].ys[i])), cr = l ? 1.9 - 1.2 * clamp((Y - l.ys[i]) / 110) : 1, n = (Math.round((X - ox) / 6) - oi) * 131 + j;
        if (rs(n, 8) < t2 * 2.2 * cr) c.rect(X + 3 * rs(n, 9), Y + 3 * rs(n, 10), 1.6, 1.6);
      }
      c.fillStyle = INK; c.fill(); }
    // Linhas dos perfis, em lances de 300 a 550 px (ninguém traça a tela inteira de uma vez).
    L.forEach((l, li) => {
      const pts = [];
      for (let X = -24; X <= W + 24; X += 16) { if (l.x0 !== undefined) { const x = wx(X, 1); if (x < l.x0 || x > l.x1) continue; } pts.push([X, l.ys[clamp(Math.round(X / 4), 0, 481)]]); }
      for (let i = 0, k = 0; i < pts.length - 1; k++) { const n = 18 + Math.floor(16 * rs(li * 9 + k, 2)); pen(pts.slice(i, i + n + 1), l.w, li * 31 + k * 7); i += n; }
    });
    // Capim curto ao longo do chão, preso ao mundo (não na praça calçada nem sob a água); na praça, juntas do calçamento.
    const G = { close: 18, wide: 7, name: 16 }[F.shot] || 14, xa = wx(-20, 1), xb = wx(W + 20, 1), lake = w.lake;
    c.beginPath();
    if (F.scene === 'P') for (let x = Math.ceil(xa / 90) * 90; x < xb; x += 90) { const [X, Y] = S1(x + 20 * rs(Math.round(x / 90), 1), w.ground(x)); c.moveTo(X, Y + 3); c.lineTo(X - 4 * z, Y + 34 * z); }
    else for (let x = Math.ceil(xa / G) * G; x < xb; x += G) {
      if (lake && x > lake.x0 - 6) break;
      const i = Math.round(x / G), h = G * (.6 + 1.1 * rs(i, 1)), lean = G * (rs(i, 2) - .35) * .8, [X, Y] = S1(x + G * .4 * rs(i, 3), w.ground(x));
      c.moveTo(X, Y + 1); c.quadraticCurveTo(X + lean * z * .3, Y - h * z * .6, X + lean * z + 2 * (rb(i, 4) - .5), Y - h * z);
    }
    c.lineWidth = 1.4; c.lineCap = 'round'; c.strokeStyle = INK; c.stroke();
    if (F.scene === 'P') { const ys = [-24, W + 24].map(X => S1(wx(X, 1), w.ground(wx(X, 1)) + 34)); pen(ys, 1.6, 97); }  // meio-fio
    const o = { sp: 5, w: 1.15, seed: 9 };
    // Árvore: tronco em tubo, copa de laços (sombra comum à copa toda); h = altura (o desenho original tem 420), green =
    // aguada verde nas folhas (P e N).
    const treeAt = (x, by, h, sd = 0, green) => {
      const k = h / 420, b = [[x, by + 6], [x + 6 * k, by - .3 * h], [x - 4 * k, by - .55 * h]].map(([u, v]) => S1(u, v)), r = [26, 18, 12].map(v => v * z * k);
      o.anchor = b[0]; part(tube(b, r), tubeShade(b, r, .15, .55), 2.4, o, 101 + 20 * sd);
      const lobes = [[-95, .7, 80], [90, .68, 78], [0, .86, 95], [-45, .6, 70], [55, .58, 72], [5, .72, 88]].map(([dx, kk, rr], i) => ellPoly(...S1(x + dx * k, by - kk * h), rr * z * k * (1 + .1 * rs(i + 7 * sd, 3)), rr * z * k * .85, 0, 22));
      const all = shade(lobes.flat(), .04, .62); lobes.forEach((p, i) => part(p, all, 2.2, o, 110 + i + 20 * sd));
      if (green) wash(lobes.flat().filter((_, i) => i % 2), P.leafMini);
    };
    if (w.tree) treeAt(w.tree.x, w.ground(w.tree.x) + 4, w.tree.h);
    for (const tr of w.trees || []) treeAt(tr.x, tr.y + 4, tr.h, tr.seed, true);
    for (const l of w.lamps || []) {  // poste: haste, braço curvo e lanterna hachurada
      const q = (u, v) => S1(l.x + u, l.y - v), b = [q(0, -4), q(0, l.h - 60)], r = [9 * z, 6 * z];
      o.anchor = b[0]; part(tube(b, r), tubeShade(b, r, .2, .5), 2.2, o, 400 + l.seed);
      pen([q(0, l.h - 60), q(10, l.h - 30), q(36, l.h - 26), q(52, l.h - 40)], 2.6, 401 + l.seed);
      const lan = [q(38, l.h - 44), q(66, l.h - 44), q(72, l.h - 90), q(32, l.h - 90)]; part(lan, shade(lan, .25, .4), 2, o, 402 + l.seed);
      part([q(28, l.h - 90), q(76, l.h - 90), q(52, l.h - 108)], () => .7, 2, o, 403 + l.seed);
      part([q(-16, 0), q(16, 0), q(12, 30), q(-12, 30)], () => .45, 2, o, 404 + l.seed);
    }
    if (w.fountain) {  // chafariz: bacia de pedra com água, coluna, taça e quedas d'água que fervem com o traço
      const { x, y, r } = w.fountain, q = (u, v) => S1(x + u * r, y - v * r);
      const bowl = [q(-.4, 1), q(.4, 1), q(.14, .88), q(-.14, .88)], col = [q(0, .3), q(0, .9)], cr = [.07 * r * z, .05 * r * z];
      o.anchor = q(0, 0); part(tube(col, cr), tubeShade(col, cr, .15, .5), 2.2, o, 420);
      for (const sg of [-1, 1]) for (const k of [0, 1, 2]) pen(Array.from({ length: 7 }, (_, i) => { const u = i / 6; return q(sg * (.38 + .5 * u + .04 * k), 1.0 + .08 * u - (.66 + .04 * k) * u * u); }), 1.4, 421 + k + (sg > 0 ? 5 : 0), { col: P.hatch, ov: 0 });
      pen([q(0, 1), q(.02, 1.18), q(0, 1.3)], 1.6, 430, { col: P.hatch });
      part(bowl, shade(bowl, .15, .5), 2.2, o, 431);
      const basin = [q(-1, .32), q(1, .32), q(.92, 0), q(-.92, 0)]; part(basin, shade(basin, .15, .55), 2.6, o, 432);
      const lip = [q(-1.04, .36), q(1.04, .36), q(1.04, .3), q(-1.04, .3)]; part(lip, () => .2, 2.2, o, 433);
      wash([q(-.98, .36), q(.98, .36), q(.9, .4), q(-.9, .4)], P.water);
    }
    for (const pl of w.plants || []) {  // N: árvore, junco com taboa, flor com aguada, tufo de capim
      const { x, y, kind, h, seed: sd } = pl, q = (u, v) => S1(x + u, y - v), ln = (rs(sd, 1) - .5) * .25 * h;
      if (kind === 'tree') treeAt(x, y + 4, h, sd, true);
      else if (kind === 'reed') {
        pen([q(0, -2), q(ln * .3, .5 * h), q(ln, h)], 2.4, 500 + sd, { tip: 1 });
        for (const k of [-1, 1]) pen([q(0, -2), q(k * .12 * h, .35 * h), q(k * .3 * h, .55 * h)], 1.8, 502 + sd + k, { tip: 1 });
        const cat = ellPoly(...q(ln * .82, .78 * h), 5 * z, .09 * h * z, Math.atan2(ln, h) * -1, 12); o.anchor = cat[0]; part(cat, () => .75, 1.8, o, 505 + sd);
      } else if (kind === 'flower') {
        pen([q(0, -2), q(ln * .5, .5 * h), q(ln, h)], 1.8, 510 + sd, { ov: 0 });
        pen([q(ln * .3, .3 * h), q(ln * .3 + .25 * h, .42 * h), q(ln * .3 + .1 * h, .32 * h)], 1.4, 511 + sd);
        const fc = q(ln, h), pet = Array.from({ length: 5 }, (_, i) => { const a = i / 5 * TAU; return ellPoly(fc[0] + .14 * h * z * Math.cos(a), fc[1] + .14 * h * z * Math.sin(a), .11 * h * z, .07 * h * z, a, 10); });
        pet.forEach((pp, i) => part(pp, null, 1.4, o, 512 + sd + i)); wash(pet.flat(), sd % 2 ? P.rose : P.wing);
      } else for (let i = 0; i < 5; i++) pen([q(4 * i - 8, -2), q(4 * i - 8 + (i - 2) * .08 * h, .5 * h), q((i - 2) * .3 * h, (.7 + .3 * rs(sd + i, 2)) * h)], 1.5, 520 + sd * 5 + i, { tip: 1 });
    }
    if (w.nest && w.nest.r) { const { x, r } = w.nest, [X, Y] = S1(x, w.ground(x) - .45 * r); c.beginPath(); c.ellipse(X, Y, .25 * r * z, .1 * r * z, 0, 0, TAU); c.fillStyle = INK; c.fill(); }  // boca do formigueiro
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
  // Peças dos seres só a partir das juntas (contrato do verificador, px do mundo): {actor, name, from, to, pts, r, cap}.
  // O desenho usa esta lista. Peça que acaba em junta final (canela, antebraço, pescoço) tem tampa reta e para antes
  // dela o contorno da caneta (meia largura + tremor); pé, mão e cabeça cobrem a junta.
  const d2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]), back = (A, B, k) => { const l = d2(A, B) || 1; return [B[0] - (B[0] - A[0]) / l * k, B[1] - (B[1] - A[1]) / l * k]; };
  // Miúdo (silhueta cheia de tinta) abaixo de miniS px; a fila de formigas de N fica cheia até maior e com traço mais
  // grosso, para ler de longe. legK = peso das patas (o besouro é mais forte).
  const miniS = a => a.kind === 'fly' ? 45 : a.role === 'line' ? 120 : 60, miniW = (a, S) => a.role === 'line' ? Math.max(1.4, S * .036) : Math.max(.8, S * .028);
  const legK = a => a.kind === 'beetle' ? 1.5 : 1;
  const penW = (a, S) => a.kind === 'human' ? clamp(S * .0095, 2, 5.5) : a.kind === 'fly' ? clamp(S * .006, .9, 3.2) : clamp(S * .0055, 1.1, 4);
  function parts(a, F) {
    const p = a.pose, J = p.joints, s = p.size, z = F.cam.z, S = s * z, w = penW(a, S), out = [], hr = d2(J.headBase, J.headTop) / 2;
    const add = (name, from, to, pts, r, cap = 'round') => out.push({ actor: a.id, name, from, to, pts, r, cap }), e = (.7 * w + .35) / z;
    if (a.kind === 'human') {
      const g = BODY[p.body || 'adult'].girth, gk = (.7 + .3 * g / .11) * s;  // membros engrossam com o tronco (pesada, magra)
      add('torso', 'pelvis', 'neck', [J.pelvis, J.chest, J.neck], g * s);
      add('neck', 'neck', 'headBase', [J.neck, back(J.neck, J.headBase, e)], .03 * gk, 'butt');
      add('head', 'headBase', null, [J.headBase, J.headTop], hr);
      for (const k of 'LR') {
        add('thigh' + k, 'hip' + k, 'knee' + k, [J['hip' + k], J['knee' + k]], .055 * gk);
        add('shin' + k, 'knee' + k, 'ankle' + k, [J['knee' + k], back(J['knee' + k], J['ankle' + k], e)], .046 * gk, 'butt');
        add('foot' + k, 'ankle' + k, null, [J['ankle' + k], J['toe' + k]], .045 * s);
        add('upperArm' + k, 'shoulder' + k, 'elbow' + k, [J['shoulder' + k], J['elbow' + k]], .034 * gk);
        add('forearm' + k, 'elbow' + k, 'wrist' + k, [J['elbow' + k], back(J['elbow' + k], J['wrist' + k], e)], .029 * gk, 'butt');
        add('hand' + k, 'wrist' + k, null, [J['wrist' + k], back(J['wrist' + k], J['hand' + k], .03 * s)], .03 * s);  // a tampa redonda acaba na ponta
      }
      return out;
    }
    // Raposa (cão) e ave: pescoço (tampa reta antes da base da cabeça), cabeça no eixo base → topo (na raposa o topo é a
    // ponta do focinho) e patas de três ossos: coxa, canela (reta antes do tornozelo; na ave o traço segue nos dedos) e pé.
    if (a.kind === 'dog' || a.kind === 'bird') {
      const D = a.kind === 'dog', R = D ? [.075, .04, .034, .05] : [.025, .011, .011, .055];  // coxa, canela, pé, pescoço (BL)
      add('neck', 'neck', 'headBase', [J.neck, back(J.neck, J.headBase, D ? e : .02 * hr)], R[3] * s, 'butt');
      add('head', 'headBase', null, [J.headBase, J.headTop], D ? .6 * hr : hr);
      for (const n of Object.keys(p.limbs)) {
        add(n + '.upper', n + '.root', n + '.mid', [J[n + '.root'], J[n + '.mid']], R[0] * s);
        add(n + '.lower', n + '.mid', n + '.end', [J[n + '.mid'], D ? back(J[n + '.mid'], J[n + '.end'], e) : J[n + '.end']], R[1] * s, 'butt');
        add(n + '.tip', n + '.end', null, [J[n + '.end'], D ? back(J[n + '.end'], J[n + '.toe'], R[2] * s) : J[n + '.toe']], R[2] * s, D ? 'round' : 'butt');
      }
      return out;
    }
    // Formiga, forídea, besouro, borboleta e peixe: pescoço curto (some sob o tórax), cabeça no eixo base → topo, patas de
    // dois ossos (traço de pena que afina até o pé).
    const mini = S < miniS(a), lw = mini ? miniW(a, S) : w;
    add('neck', 'neck', 'headBase', [J.neck, J.headBase], lw / 2 / z, 'butt');
    add('head', 'headBase', null, [J.headBase, J.headTop], .95 * hr);
    for (const [n, l] of Object.entries(p.limbs)) {
      const r = (mini ? lw / 2 : 1.25 * w * legK(a) * (S > 170 ? 2.6 : 1.3) * (l.far ? .75 : 1) / 2) / z;
      add(n + '.upper', n + '.root', n + '.mid', [J[n + '.root'], J[n + '.mid']], r);
      add(n + '.lower', n + '.mid', n + '.end', [J[n + '.mid'], J[n + '.end']], r, 'butt');
    }
    return out;
  }
  // Mundo → tela de um ator: virada (flip, só em A) em torno do meio do corpo e câmera da camada. Sem achatar o corpo
  // (pose.sq mudaria o tamanho dos ossos desenhados).
  function mapper(F, a) {
    const { cx, cy, z } = F.cam, ox = 960 - lerp(960, cx, a.layer ?? 1) * z, oy = 540 - cy * z, p = a.pose, kx = a.flip ?? 1;
    const m = p ? (p.spine[0].x + p.spine.at(-1).x) / 2 : 0;
    return (x, y) => [(m + (x - m) * kx) * z + ox, y * z + oy];
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

  // Cabeça (elipse com o eixo base → topo como diâmetro, meia largura r) de um inseto, da peça Q.head.
  const bugHead = (Q, M, n) => { const [B, T] = Q.head.pts; return ellPoly((B[0] + T[0]) / 2, (B[1] + T[1]) / 2, d2(B, T) / 2, Q.head.r, Math.atan2(T[1] - B[1], T[0] - B[0]), n).map(([x, y]) => M(x, y)); };
  // Formiga: segmentos hachurados (irmãs escuras; a protagonista clara, com aguada laranja), patas, antenas e folha.
  function ant(a, M, z, sid, Q) {
    const p = a.pose, s = p.size, S = s * z, hero = a.role === 'hero', f = p.facing, sp = p.spine, hd = p.head, hr = d2(...Q.head.pts) / 2;
    const lp = (q, ang, u, v) => M(q.x + Math.cos(ang) * u - Math.sin(ang) * v * f, q.y + Math.sin(ang) * u + Math.cos(ang) * v * f);
    const el = (q, ang, rx, ry) => ellPoly(q.x, q.y, rx, ry, ang, S < 150 ? 16 : 30).map(([x, y]) => M(x, y));
    const body = [el(sp[2], sp[2].angle, 1.15 * sp[2].r, .9 * sp[2].r), el(sp[1], sp[1].angle, 1.3 * sp[1].r, .9 * sp[1].r), el(sp[0], sp[0].angle, 1.4 * sp[0].r, .82 * sp[0].r), bugHead(Q, M, S < 150 ? 16 : 30)];
    const legs = Object.entries(p.limbs).map(([n, l]) => ({ far: l.far, q: [...Q[n + '.upper'].pts, Q[n + '.lower'].pts[1]].map(([x, y]) => M(x, y)) })), neck = Q.neck.pts.map(([x, y]) => M(x, y)), ants = ['antennaL', 'antennaR'].map((k, i) => ({ pts: p.appendages[k].map(([x, y]) => M(x, y)), far: (i ? -1 : 1) * f < 0 }));
    if (S < miniS(a)) {  // miúda: silhueta cheia (a protagonista em laranja com contorno)
      const lw = miniW(a, S); c.beginPath();
      for (const l of legs) sub(l.q);
      sub(neck);
      c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'butt'; c.stroke();  // tampa reta: a pata para no pé
      c.beginPath(); for (const an of ants) sub(an.pts); c.lineCap = 'round'; c.stroke();
      if (p.carry) leaf(p.carry, M, 1, {}, true);
      c.beginPath(); body.forEach(b => sub(b, true)); c.fillStyle = hero ? P.heroSolid : INK; c.fill();
      if (hero) { c.lineWidth = 1.2; c.stroke(); }
      return;
    }
    const w = clamp(S * .0055, 1.1, 4), o = { sp: clamp(S * .012, 3, 5.5), w: clamp(S * .0022, .8, 1.5), anchor: M(sp[0].x, sp[0].y), seed: sid }, big = S > 170;
    const base = hero ? .06 : .42, amt = hero ? .5 : .45;
    if (hero) contact(M, sp[0].x, a.ground ? a.ground(sp[0].x) : sp[0].y + .17 * s, .45 * s, .045 * s, o);
    if (p.carry) leaf(p.carry, M, w, o, false, hero);
    const limb = (l, k) => pen(l.q, w * (big ? 2.6 : 1.3) * (l.far ? .75 : 1), sid + k, { col: l.far ? P.hatch : INK, tip: 1, ov: 0 });  // traço de pena que afina até o pé
    pen(neck, w, sid + 19, { ov: 0 });
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
      for (const b of body) { let mx = 0, my = 0; b.forEach(([x, y]) => { mx += x / b.length; my += y / b.length; }); sub(b.map(([x, y]) => [mx + (x - mx) * 1.07 + dx, my + (y - my) * 1.07 + dy]), true); }
      c.fillStyle = P.hero; c.fill(); c.globalCompositeOperation = 'source-over';
    }
  }

  // Forídea: corcunda escura e hachurada, olho grande, asas em laço (sem papel: transparentes) que batem, pernas penduradas.
  function fly(a, M, z, sid, Q) {
    const p = a.pose, s = p.size, S = s * z, f = p.facing, sp = p.spine, hd = p.head, hr = d2(...Q.head.pts) / 2, t0 = sp[0], ang = t0.angle;
    const lw = (u, v) => [t0.x + Math.cos(ang) * u - Math.sin(ang) * v * f, t0.y + Math.sin(ang) * u + Math.cos(ang) * v * f];
    const flap = .5 + .5 * Math.cos(p.wings.phase * TAU), w = clamp(S * .006, .9, 3.2), o = { sp: clamp(S * .012, 3, 5), w: clamp(S * .0022, .8, 1.4), anchor: M(t0.x, t0.y), seed: sid };
    const wing = b => {
      const r0 = lw(-.02 * s, -.11 * s), tip = lw((-.02 - .55 * Math.cos(b)) * s, (-.11 - .55 * Math.sin(b)) * s), mid = [(r0[0] + tip[0]) / 2, (r0[1] + tip[1]) / 2];
      const poly = ellPoly(mid[0], mid[1], .29 * s, .085 * s, Math.atan2(tip[1] - r0[1], tip[0] - r0[0]), 20).map(([x, y]) => M(x, y));
      ring(poly, w * .7, sid + b * 10);
      if (S > 45) pen([M(...r0), M(...tip)], w * .4, sid + 3 + b * 10);
    };
    const el = (q, an, rx, ry) => ellPoly(q.x, q.y, rx, ry, an, S < 60 ? 14 : 24).map(([x, y]) => M(x, y));
    const body = [el(sp[1], sp[1].angle, 1.25 * sp[1].r, .85 * sp[1].r), el(t0, ang, 1.05 * t0.r, .95 * t0.r), bugHead(Q, M, S < 60 ? 14 : 24)], neck = Q.neck.pts.map(([x, y]) => M(x, y));
    wing(.65 + 1.15 * flap);
    if (S < 45) { c.beginPath(); sub(neck); c.lineWidth = 2 * Q.neck.r * z; c.lineCap = 'butt'; c.strokeStyle = INK; c.stroke(); c.beginPath(); body.forEach(b => sub(b, true)); c.fillStyle = INK; c.fill(); wing(.35 + 1.15 * flap); return; }
    pen(neck, w, sid + 19, { ov: 0 });
    for (const [k, i] of [[.06, 0], [-.01, 1], [-.08, 2]]) { const sw = .03 * noise1(sid + i, a.pose.wings.phase * 2 + i); pen([lw(k * s, .1 * s), lw((k - .06) * s, .21 * s), lw((k - .02 + sw) * s, .32 * s)].map(q => M(...q)), w * .7, sid + 80 + i, { tip: 1 }); }
    body.forEach((b, k) => part(b, shade(b, .45, .4), w, o, sid + 20 + k));
    for (const [u, v] of [[.05, -.12], [-.04, -.13], [-.12, -.1]]) pen([M(...lw(u * s, v * s)), M(...lw((u - .03) * s, (v - .06) * s))], w * .6, sid + 90 + u * 100, { tip: 1 });
    const hx = hd.x + f * .3 * hr, hy = hd.y - .1 * hr, [ex, ey] = M(hx, hy), er = .5 * hr * z;
    c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(ex - .35 * er, ey - .35 * er, .25 * er, 0, TAU); c.fillStyle = P.paper; c.fill();
    wing(.35 + 1.15 * flap);
  }

  // ---------- bichos de N ----------
  // Quadro local de um ponto da coluna: u à frente (ao longo do segmento), v para baixo (com a virada do ser).
  const local = (q, f) => (u, v) => [q.x + Math.cos(q.angle) * u - Math.sin(q.angle) * v * f, q.y + Math.sin(q.angle) * u + Math.cos(q.angle) * v * f];
  const bugO = (S, M, q, sid) => ({ sp: clamp(S * .012, 3, 5), w: clamp(S * .0022, .8, 1.4), anchor: M(q.x, q.y), seed: sid });

  // Raposa (kind dog): tronco em tubo pelas juntas da coluna, pescoço, cabeça em cunha do crânio (headBase) à ponta do
  // focinho (headTop), orelhas em ponta, cauda farta de ponta branca, pernas cheias (coxa laranja, canela de meia escura,
  // pata em tinta) que saem de baixo do corpo; aguada laranja (acento) no corpo, na cauda e no alto da cabeça.
  function dog(a, M, z, sid, Q) {
    const p = a.pose, J = p.joints, s = p.size, S = s * z, f = p.facing, w = penW(a, S), sp = p.spine, Ms = pts => pts.map(([x, y]) => M(x, y));
    const o = { ...bugO(S, M, sp[0], sid), rot: .3 };
    if (a.ground) contact(M, sp[1].x, a.ground(sp[1].x), .5 * s, .03 * s, o);
    const leg = (n, far, k) => {
      const up = Q[n + '.upper'], lo = Q[n + '.lower'], tp = Q[n + '.tip'], b = Ms([...up.pts, lo.pts[1]]), rr = [up.r, lo.r, .9 * lo.r].map(v => v * z);
      part(tube(b, rr, 'butt'), tubeShade(b, rr, .25 + (far ? .2 : 0), .6), w * (far ? .8 : 1), o, sid + k);
      wash(tube(b.slice(0, 2), rr), P.hero); wash(tube(b.slice(1), rr.slice(1), 'butt'), far ? P.sockFar : P.sock);
      const pb = Ms(tp.pts), pr = [tp.r * z, tp.r * z]; part(tube(pb, pr, 'round', 'butt'), null, w * .9, { ...o, fill: INK }, sid + k + 10);
    };
    const names = Object.keys(p.limbs);
    // Cauda: tubo que engorda e afina, ponta branca (sem hachura nem aguada).
    const tl = Ms(p.appendages.tail), trr = [.035, .075, .085, .055].map(v => v * S), tip = tl.at(-1), tpoly = tube(tl, trr), tsh = tubeShade(tl, trr, .05, .6);
    part(tpoly, (x, y) => Math.hypot(x - tip[0], y - tip[1]) < .07 * S ? 0 : tsh(x, y), w, o, sid + 1);
    wash(tube(tl.slice(0, 3), trr), P.hero);
    names.filter(n => p.limbs[n].far).forEach((n, i) => leg(n, true, 10 + i));
    names.filter(n => !p.limbs[n].far).forEach((n, i) => leg(n, false, 20 + i));  // antes do corpo: a coxa nasce de baixo dele
    const bb = Ms([sp.at(-1), ...sp.slice(1, -1), sp[0]].map(q => [q.x, q.y])), br = [sp.at(-1), ...sp.slice(1, -1), sp[0]].map(q => .8 * q.r * z), body = tube(bb, br);
    part(body, tubeShade(bb, br, -.15, .7), w, o, sid + 2); wash(body, P.hero);
    const nq = Q.neck, nb = Ms(nq.pts), nr = [nq.r * z, nq.r * z]; const neck = tube(nb, nr, 'butt'); part(neck, tubeShade(nb, nr, -.1, .6), w * .9, o, sid + 3); wash(neck, P.hero);
    // Cabeça: u da base (0) à ponta do focinho (1), v para cima, em comprimentos da cabeça.
    const [HB, HT] = Q.head.pts, L = d2(HB, HT), ua = [(HT[0] - HB[0]) / L, (HT[1] - HB[1]) / L], nu = [f * ua[1], -f * ua[0]];
    const hd = (u, v) => M(HB[0] + (ua[0] * u + nu[0] * v) * L, HB[1] + (ua[1] * u + nu[1] * v) * L), H = q => q.map(([u, v]) => hd(u, v));
    const earF = H([[.1, .28], [.04, .8], [.3, .33]]); part(earF, () => .6, w * .8, o, sid + 4);
    const head = H([[-.06, .05], [0, .27], [.18, .36], [.38, .3], [.6, .17], [.82, .09], [.97, .05], [1, 0], [.95, -.05], [.75, -.09], [.5, -.15], [.3, -.24], [.1, -.27], [-.04, -.15]]);
    part(head, shade(head, -.2, .5), w, o, sid + 5);
    wash(H([[-.06, .05], [0, .27], [.18, .36], [.38, .3], [.6, .17], [.82, .09], [.9, .05], [.6, .01], [.3, -.05], [.05, -.1]]), P.hero);
    const earN = H([[.2, .3], [.2, .84], [.44, .27]]); part(earN, shade(earN, 0, .4), w * .9, o, sid + 6); pen(H([[.25, .38], [.24, .66]]), w * .5, sid + 7);
    const surprised = p.face.expression === 'surprised', [ex, ey] = hd(.42, .13), er = (surprised ? .07 : .045) * L * z;
    if (p.face.blink > .5) pen(H([[.36, .13], [.42, .1], [.48, .13]]), w * .8, sid + 8);
    else { c.beginPath(); c.ellipse(ex, ey, er * 1.3, er, Math.atan2(ua[1], ua[0]), 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(ex - .3 * er, ey - .3 * er, .35 * er, 0, TAU); c.fillStyle = P.paper; c.fill(); }
    const [nx, ny] = hd(.96, .02); c.beginPath(); c.arc(nx, ny, .055 * L * z, 0, TAU); c.fillStyle = INK; c.fill();  // focinho
    pen(H([[.95, -.04], [.74, -.08], [.64, -.05]]), w * .7, sid + 9);
  }

  // Ave: pernas finas (coxa, canela e dedos num traço só), cauda em leque, asa (aberta batendo no voo; dobrada no corpo),
  // corpo em gota, pescoço, cabeça redonda com bico e olho; aguada azul (acento) no corpo.
  function bird(a, M, z, sid, Q) {
    const p = a.pose, J = p.joints, s = p.size, S = s * z, f = p.facing, w = penW(a, S), sp = p.spine, Ms = pts => pts.map(([x, y]) => M(x, y)), o = bugO(S, M, sp[0], sid);
    Object.keys(p.limbs).forEach((n, i) => { const up = Q[n + '.upper'], lo = Q[n + '.lower'], tp = Q[n + '.tip']; pen(Ms([...up.pts, lo.pts[1], tp.pts[1]]), 2 * lo.r * z, sid + i, { ov: 0, col: p.limbs[n].far ? P.hatch : INK }); });
    const tl = p.appendages.tail, [t0, t1] = tl, td = [t1[0] - t0[0], t1[1] - t0[1]], tn = [-td[1] * .35, td[0] * .35], fan = Ms([t0, [t1[0] + tn[0], t1[1] + tn[1]], [t1[0] + .2 * td[0], t1[1] + .2 * td[1]], [t1[0] - tn[0], t1[1] - tn[1]]]);
    part(fan, shade(fan, .2, .5), w * .8, o, sid + 3);
    const open = p.wings && p.wings.open, th = open ? 1.2 * Math.cos(TAU * p.wings.phase) : 0;
    const wing = (far, k) => {  // aberta: do ombro sobe (ou desce) com o batimento; a envergadura de frente encurta
      const sh = [sp[0].x - f * .02 * s, sp[0].y - .06 * s], tip = [sh[0] - f * (.32 + .05 * far) * s, sh[1] - .55 * s * Math.sin(th) * (far ? .85 : 1)], bk = [sh[0] - f * .2 * s, sh[1] + .02 * s];
      const lead = [lerp(sh[0], tip[0], .5) + f * .04 * s, lerp(sh[1], tip[1], .5) - .03 * s];
      const fe = [0, 1, 2].map(i => { const q = (i + 1) / 4; return [lerp(tip[0], bk[0], q) - f * .03 * s * (i % 2), lerp(tip[1], bk[1], q) + .04 * s * Math.cos(th)]; });
      const poly = Ms([sh, lead, tip, ...fe, bk]); part(poly, shade(poly, far ? .35 : .1, .5), w * (far ? .75 : .9), o, sid + k);
    };
    if (open) wing(1, 4);
    const q0 = sp[0], q1 = sp[1], ang = Math.atan2(q0.y - q1.y, q0.x - q1.x), ln = Math.hypot(q0.x - q1.x, q0.y - q1.y), mx = (q0.x + q1.x) / 2, my = (q0.y + q1.y) / 2;
    const body = ellPoly(mx, my, ln / 2 + .7 * (q0.r + q1.r) / 2, .85 * q0.r, ang, 24).map(([x, y]) => M(x, y));
    part(body, shade(body, -.1, .55), w, o, sid + 5); wash(body, P.bird);
    const nq = Q.neck, nb = Ms(nq.pts), nr = [nq.r * z, nq.r * z]; const neck = tube(nb, nr, 'butt'); part(neck, tubeShade(nb, nr, -.1, .5), w * .9, o, sid + 6); wash(neck, P.bird);
    const [HB, HT] = Q.head.pts, hr = d2(HB, HT) / 2, ua = [(HT[0] - HB[0]) / (2 * hr), (HT[1] - HB[1]) / (2 * hr)], fa = [-f * ua[1], f * ua[0]], hc = J.head;
    const hl = (u, v) => M(hc[0] + (fa[0] * u + ua[0] * v) * hr, hc[1] + (fa[1] * u + ua[1] * v) * hr);  // u à frente, v para cima
    const beak = [hl(.7, .3), hl(1.75, -.05), hl(.75, -.3)]; part(beak, () => .3, w * .7, o, sid + 7);
    const head = ellPoly(hc[0], hc[1], hr, hr, 0, 20).map(([x, y]) => M(x, y)); part(head, shade(head, -.15, .5), w, o, sid + 8); wash(head, P.bird);
    const [ex, ey] = hl(.35, .22), er = .17 * hr * z;
    if (p.face.blink > .5) pen([hl(.2, .22), hl(.5, .22)], w * .7, sid + 9); else { c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(ex - .3 * er, ey - .3 * er, .35 * er, 0, TAU); c.fillStyle = P.paper; c.fill(); }
    if (open) wing(0, 10);
    else {  // asa dobrada sobre o corpo, com as penas de voo para trás
      const lb = local({ x: mx, y: my, angle: ang }, f), wp = [[.1, -.07], [.02, -.11], [-.12, -.08], [-.3, .0], [-.12, .05], [.06, .04]].map(([u, v]) => M(...lb(u * s, v * s)));
      part(wp, shade(wp, .3, .5), w * .85, o, sid + 11); wash(wp, P.bird);
      for (const k of [0, 1]) pen([lb(-.02 * s, (-.04 + .04 * k) * s), lb(-.24 * s, (.0 + .015 * k) * s)].map(q => M(...q)), w * .5, sid + 12 + k);
    }
  }

  // Peixe: corpo alto do focinho rombudo (headTop) à cauda pelas juntas, dorso escuro e barriga clara (hachura pelo lado
  // do dorso), aguada dourada-oliva, nadadeiras (caudal bifurcada e peitoral da pose, dorsal com raios), boca, opérculo,
  // linha lateral e olho; a água (overlay) cobre o que está abaixo da linha d'água.
  function fish(a, M, z, sid, Q) {
    const p = a.pose, J = p.joints, s = p.size, S = s * z, f = p.facing, w = penW(a, S) * 1.2, sp = p.spine, Ms = pts => pts.map(([x, y]) => M(x, y)), o = bugO(S, M, sp[1], sid);
    const [HB, HT] = Q.head.pts, hr = d2(HB, HT) / 2, up = q => { const l = local(q, f); const [x0, y0] = l(0, 0), [x1, y1] = l(0, -1); return [x1 - x0, y1 - y0]; };
    const cd = p.appendages.caudal, ce = cd.at(-1), cv = [ce[0] - cd[0][0], ce[1] - cd[0][1]], cl = Math.hypot(...cv) || 1, cn = [-cv[1] / cl * .15 * s, cv[0] / cl * .15 * s];
    const tail = Ms([cd[0], [ce[0] + cn[0] + .3 * cv[0], ce[1] + cn[1] + .3 * cv[1]], [cd[1][0] + .1 * cv[0], cd[1][1] + .1 * cv[1]], [ce[0] - cn[0] + .3 * cv[0], ce[1] - cn[1] + .3 * cv[1]]]);
    part(tail, () => .45, w * .8, o, sid + 1); wash(tail, P.fish);
    const u1 = up(sp[1]), u2 = up(sp[2]), dp = [[sp[1], u1], [sp[2], u2]].map(([q, u]) => [q.x + u[0] * q.r * 1.02, q.y + u[1] * q.r * 1.02]);
    const peak = [dp[0][0] + u1[0] * .13 * s - f * .02 * s, dp[0][1] + u1[1] * .13 * s], rear = [dp[1][0] + u2[0] * .05 * s - f * .05 * s, dp[1][1] + u2[1] * .05 * s], dor = Ms([dp[0], peak, rear, dp[1]]);
    part(dor, () => .35, w * .7, o, sid + 2); wash(dor, P.fish);
    for (let i = 1; i < 4; i++) { const k = i / 4; pen(Ms([[lerp(dp[0][0], dp[1][0], k), lerp(dp[0][1], dp[1][1], k)], [lerp(peak[0], rear[0], k), lerp(peak[1], rear[1], k)]]), w * .4, sid + 30 + i, { ov: 0 }); }  // raios
    const b = Ms([HT, J.head, ...sp.map(q => [q.x, q.y])]), rr = [.5 * hr, 1.05 * hr, ...sp.map(q => 1.12 * q.r)].map(v => v * z), body = tube(b, rr), uS = up(sp[1]);
    // Dorso escuro, barriga clara: o tom cresce do lado de cima da linha do corpo (projeção no "para cima" do peixe).
    const back = (x, y) => { let best = 1e9, k = 0; for (let i = 0; i + 1 < b.length; i++) { const [x0, y0] = b[i], dx = b[i + 1][0] - x0, dy = b[i + 1][1] - y0, u = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1)), px = x - x0 - u * dx, py = y - y0 - u * dy, d = px * px + py * py; if (d < best) { best = d; k = (px * uS[0] + py * uS[1]) / (rr[i] || 1); } } return .12 + .7 * clamp(.5 + .9 * k) ** 1.5; };
    part(body, back, w, o, sid + 3); wash(body, P.fish);
    pen(Ms(sp.slice(0, 4).map(q => { const u = up(q); return [q.x + u[0] * .1 * q.r, q.y + u[1] * .1 * q.r]; })), w * .5, sid + 7, { ov: 0 });  // linha lateral
    pen(Ms(p.appendages.pectoral), w * 1.3, sid + 4, { tip: 1 });
    const hu = up(sp[0]); pen(Ms([[HB[0] + hu[0] * .85 * hr, HB[1] + hu[1] * .85 * hr], [HB[0] + (HT[0] - HB[0]) * .12, HB[1] + (HT[1] - HB[1]) * .12], [HB[0] - hu[0] * .8 * hr, HB[1] - hu[1] * .8 * hr]]), w * .8, sid + 5);  // opérculo
    pen(Ms([[HT[0] - hu[0] * .1 * hr, HT[1] - hu[1] * .1 * hr], [HT[0] - (HT[0] - HB[0]) * .2 - hu[0] * .08 * hr, HT[1] - (HT[1] - HB[1]) * .2 - hu[1] * .08 * hr]]), w * .8, sid + 8, { ov: 0 });  // boca
    const ec = [J.head[0] + (HT[0] - HB[0]) * .18 + hu[0] * .3 * hr, J.head[1] + (HT[1] - HB[1]) * .18 + hu[1] * .3 * hr], [ex, ey] = M(...ec), er = .32 * hr * z;
    const eye = ellPoly(ex, ey, er, er, 0, 12); path(eye, true); c.fillStyle = pat; c.fill(); ring(eye, w * .55, sid + 6); c.beginPath(); c.arc(ex + f * .15 * er, ey, .55 * er, 0, TAU); c.fillStyle = INK; c.fill();
  }

  // Borboleta: asas (anterior e posterior) que sobem e descem no batimento (a altura delas encurta e vira, de lado), com
  // borda hachurada, pintas e aguada amarela; corpo fino, cabeça, antenas de ponta grossa.
  function butterfly(a, M, z, sid, Q) {
    const p = a.pose, s = p.size, S = s * z, f = p.facing, w = penW(a, S), sp = p.spine, t0 = sp[0], lw = local(t0, f), o = bugO(S, M, t0, sid);
    const k = Math.cos(Math.PI * .9 * (.5 - .5 * Math.cos(TAU * (p.wings ? p.wings.phase : 0))));  // 1 = asas no alto, < 0 = embaixo
    const FW = ellPoly(.05, -.4, .17, .38, .25, 18), HW = ellPoly(-.13, -.22, .14, .2, -.35, 14);  // lobos em BL: u à frente, v para baixo
    const wing = (sh, far, n) => {  // borda escura (tom cresce para fora do centro da asa), aguada amarela por cima
      const kk = k * (far ? .9 : 1), poly = sh.map(([u, v]) => M(...lw((u + (far ? .03 : 0)) * s, v * kk * s)));
      let mx = 0, my = 0, rm = 0; for (const [x, y] of poly) { mx += x / poly.length; my += y / poly.length; } for (const [x, y] of poly) rm = Math.max(rm, Math.hypot(x - mx, y - my));
      part(poly, (x, y) => (far ? .3 : 0) + .9 * clamp((Math.hypot(x - mx, y - my) / (rm || 1) - .5) * 2.4), w * (far ? 1 : 1.3), { ...o, sp: Math.max(2.4, o.sp * .7) }, sid + n); wash(poly, P.wing); return poly;
    };
    wing(HW, 1, 1); wing(FW, 1, 2);
    const bb = Ms2(M, [[sp[1].x, sp[1].y], [t0.x, t0.y]]), br = [.35 * sp[1].r * z, .45 * t0.r * z]; part(tube(bb, br), () => .85, w, o, sid + 3);
    pen(Q.neck.pts.map(([x, y]) => M(x, y)), w, sid + 19, { ov: 0 });
    const hd = bugHead(Q, M, 12); part(hd, () => .7, w, o, sid + 4);
    for (const [i, nm] of ['antennaL', 'antennaR'].entries()) { const an = Ms2(M, p.appendages[nm]); pen(an, w * .8, sid + 5 + i, { ov: 0 }); const [x, y] = an.at(-1); c.beginPath(); c.arc(x, y, Math.max(1.8, .03 * S), 0, TAU); c.fillStyle = INK; c.fill(); }
    wing(HW, 0, 7); const fw = wing(FW, 0, 8), [bx0, by0] = M(t0.x, t0.y);
    for (const q of [3, 6, 9]) pen([[bx0, by0], fw[q]].map(([x, y], i) => i ? [lerp(bx0, x, .85), lerp(by0, y, .85)] : [x, y]), w * .6, sid + 50 + q, { ov: 0 });  // nervuras
    if (S > 30) { c.beginPath(); for (const q of [.35, .55]) { const [x, y] = fw[Math.floor(fw.length / 4)].map((v, i) => lerp(fw[0][i], v, q)), r = Math.max(1.6, .035 * S); c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } c.fillStyle = INK; c.fill(); }
  }
  const Ms2 = (M, pts) => pts.map(([x, y]) => M(x, y));

  // Besouro: élitros em cúpula (escura, com um brilho sem hachura e a sutura), pronoto, cabeça, patas de pena e antenas;
  // aguada verde-azulada (acento). Miúdo: silhueta cheia.
  function beetle(a, M, z, sid, Q) {
    const p = a.pose, s = p.size, S = s * z, f = p.facing, sp = p.spine, w = penW(a, S), big = S > 170, mini = S < miniS(a), o = bugO(S, M, sp[1], sid), wo = w * 1.5;
    const legs = Object.entries(p.limbs).map(([n, l]) => ({ far: l.far, q: [...Q[n + '.upper'].pts, Q[n + '.lower'].pts[1]].map(([x, y]) => M(x, y)) })), neck = Ms2(M, Q.neck.pts);
    const e1 = sp[1], l1 = local(e1, f), dome = Array.from({ length: 28 }, (_, i) => { const t = i / 28 * TAU, v = Math.sin(t); return M(...l1(1.05 * e1.r * Math.cos(t), (v < 0 ? .95 : .45) * e1.r * v)); });
    const pro = ellPoly(sp[0].x, sp[0].y, 1.1 * sp[0].r, .8 * sp[0].r, sp[0].angle, 18).map(([x, y]) => M(x, y)), hd = bugHead(Q, M, 16);
    if (mini) {
      const lw = miniW(a, S); c.beginPath(); for (const l of legs) sub(l.q); sub(neck);
      c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'butt'; c.stroke();
      c.beginPath(); [dome, pro, hd].forEach(b => sub(b, true)); c.fillStyle = INK; c.fill(); return;
    }
    const limb = (l, i) => pen(l.q, w * legK(a) * (big ? 2.6 : 1.3) * (l.far ? .75 : 1), sid + i, { col: l.far ? P.hatch : INK, tip: 1, ov: 0 });
    if (a.ground) contact(M, e1.x, a.ground(e1.x), .45 * s, .04 * s, o);
    pen(neck, w, sid + 19, { ov: 0 });
    legs.forEach((l, i) => l.far && limb(l, i));
    for (const [i, nm] of ['antennaL', 'antennaR'].entries()) pen(Ms2(M, p.appendages[nm]), w * 1.1, sid + 40 + i, { ov: 0, col: i ? P.hatch : INK });
    const hl = M(...l1(.2 * e1.r, -.55 * e1.r)), dsh = shade(dome, .6, .4), od = { ...o, sp: Math.max(2.6, o.sp * .75) };
    part(dome, (x, y) => Math.hypot(x - hl[0], y - hl[1]) < .1 * S ? 0 : dsh(x, y), wo, od, sid + 20); wash(dome, P.beetle);
    pen([l1(.95 * e1.r, -.3 * e1.r), l1(0, -.95 * e1.r), l1(-1.0 * e1.r, -.15 * e1.r)].map(q => M(...q)), w, sid + 21);  // sutura
    part(pro, shade(pro, .7, .3), wo, od, sid + 22); part(hd, shade(hd, .7, .3), wo, od, sid + 23);
    legs.forEach((l, i) => !l.far && limb(l, i));
  }

  // Cabelo, aguada da roupa (o acento de cor de cada um) e detalhes do rosto por pessoa (id); o explorador usa chapéu.
  // pants = aguada e tom das pernas (shorts: só a coxa); dress = saia ou vestido até a fração da coxa (cor própria ou a da
  // blusa); waist = cintura do tronco em relação ao peito (< 1 afina, > 1 barriga); coat = casaco de botões.
  const LOOK = {
    human: { beard: 1 },
    corredor: { hair: 'short', tone: .45, shirt: P.hero, band: 1, pants: P.pants, legT: .3, shorts: 1, waist: .82 },
    marta: { hair: 'bun', tone: .5, shirt: P.lilac, dress: .82, pants: P.pants, legT: .15, waist: 1.04 },
    joao: { hair: 'short', tone: .52, shirt: P.blue, beard: 1, pants: P.jeans, legT: .3, waist: .84 },
    lia: { hair: 'pony', tone: .3, shirt: P.leaf, dress: .62, skirt: P.skirt, pants: P.pants, legT: .05, waist: .8 },
    bia: { hair: 'pigtail', tone: .42, shirt: P.rose, dress: .7, pants: P.pants, legT: .05, waist: .9 },
    avo: { hair: 'bald', tone: 0, shirt: P.fungus, glasses: 1, stache: 1, pants: P.brown, legT: .35, waist: .96, coat: 1 },
  };
  // Envoltória convexa (cadeia monótona): a saia/vestido sobre a cintura e as duas coxas.
  const hull = pts => {
    const q = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
    for (const v of q) { while (lo.length > 1 && cr(lo.at(-2), lo.at(-1), v) <= 0) lo.pop(); lo.push(v); }
    for (const v of q.reverse()) { while (hi.length > 1 && cr(hi.at(-2), hi.at(-1), v) <= 0) hi.pop(); hi.push(v); }
    return [...lo.slice(0, -1), ...hi.slice(0, -1)];
  };
  // Flor (P): miolo e 5 pétalas com aguada rosa. Na mão: o caule passa pela ponta da mão (it.x, it.y) e a flor fica acima
  // dela; no chão: deitada, com o miolo em (x, y).
  function flower(it, M, w, o, f = 1) {
    const r = it.r, [cx, cy] = it.held ? [it.x + .4 * r * f, it.y - 2.6 * r] : [it.x, it.y];
    pen(it.held ? [M(it.x - .1 * r * f, it.y + 1.1 * r), M(it.x, it.y), M(cx, cy)] : [M(it.x - 2.2 * r, it.y + .9 * r), M(it.x - .8 * r, it.y + .6 * r), M(cx, cy)], w * .7, 301, { ov: 0 });
    const pet = Array.from({ length: 5 }, (_, i) => { const a = i / 5 * TAU + .3; return ellPoly(cx + .62 * r * Math.cos(a), cy + .62 * r * Math.sin(a), .5 * r, .34 * r, a, 12).map(([x, y]) => M(x, y)); });
    pet.forEach((q, i) => part(q, null, w * .6, o, 310 + i));
    wash(pet.flat(), P.rose);
    const ce = ellPoly(cx, cy, .3 * r, .3 * r, 0, 10).map(([x, y]) => M(x, y)); part(ce, () => .8, w * .6, o, 316);
  }

  // Pessoa: tubos (pernas, braços, tronco), botas, cabeça com rosto (expressão, piscar, boca da fala), cabelo e aguada da
  // roupa; o explorador com mochila e chapéu. Braços em a.front (abraço) saem na lista devolvida: desenhados depois de todos.
  function human(a, M, z, sid, Q, F) {
    const p = a.pose, J = p.joints, s = p.size, S = s * z, f = p.facing, C = p.spine[0], Pv = p.spine[1], Lm = p.limbs, gear = a.gear || [], lk = LOOK[a.id] || {};
    const w = penW(a, S), o = { sp: 4.5, rot: .5, w: clamp(S * .0024, .9, 1.4), anchor: M(C.x, C.y), seed: sid }, later = [];
    let ux = C.x - Pv.x, uy = C.y - Pv.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;  // eixo do tronco (para cima)
    const fx = -uy * f, fy = ux * f, T = (u, v) => [C.x + (fx * u + ux * v) * s, C.y + (fy * u + uy * v) * s], TM = (u, v) => M(...T(u, v));
    const Ms = pts => pts.map(([x, y]) => M(x, y)), R = r => r.map(v => v * S);
    if (!a.seated) contact(M, Pv.x + f * .02 * s, (a.ground ? a.ground(Pv.x) : Pv.y + .48 * s) + .005 * s, .2 * s, .022 * s, o);
    // Membro: um tubo de raiz → meio → ponta (tampa reta na junta final) com as peças de cima e de baixo.
    const limb = (up, lo, far, k, base = -.3) => { const b = Ms([...up.pts, lo.pts[1]]), rr = [up.r, lo.r, .87 * lo.r].map(v => v * z); part(tube(b, rr, 'butt'), tubeShade(b, rr, base + (far ? .25 : 0), .85), w * (far ? .8 : 1), o, sid + k); return [b, rr]; };
    // Bota no quadro do osso do pé: desenhada de lado em repouso (BL, tornozelo na origem, dedo no chão) e girada com o
    // osso tornozelo → dedo; o comprimento acompanha o osso.
    const BD = BODY[p.body || 'adult'], restA = Math.atan2(BD.footH, f * Math.sqrt(BD.foot ** 2 - BD.footH ** 2));
    const leg = (k, far, n) => {
      const [lb, lr] = limb(Q['thigh' + k], Q['shin' + k], far, n, lk.legT ?? -.3);
      if (lk.pants) wash(lk.shorts ? tube(lb.slice(0, 2), lr.slice(0, 2)) : tube(lb, lr, 'butt'), lk.pants);  // calça (ou short) cheia
      const [A, T] = Q['foot' + k].pts, u = d2(A, T) / BD.foot, ro = Math.atan2(T[1] - A[1], T[0] - A[0]) - restA, co = Math.cos(ro), si = Math.sin(ro);
      const Bt = (x, y) => { const X = f * x * u, Y = y * u; return M(A[0] + X * co - Y * si, A[1] + X * si + Y * co); };
      const poly = [Bt(-.048, -.07), Bt(.042, -.07), Bt(.055, -.028), Bt(.1, -.006), Bt(.135, .01), Bt(.15, .03), Bt(.14, .042), Bt(-.045, .042), Bt(-.056, .002)];
      part(poly, shade(poly, .35 + (far ? .2 : 0), .45), w, o, sid + 80 + n); pen([Bt(-.052, .039), Bt(.142, .039)], w * 1.3, sid + 85 + n);
    };
    // Braço: manga dobrada, mão em luva da junta do pulso à ponta (punho: vinco dos dedos); a flor segura entra antes da mão.
    const arm = (k, far, n) => {
      const [b, br] = limb(Q['upperArm' + k], Q['forearm' + k], far, n), [mx, my] = b[1], [ex, ey] = b[2], dx = ex - mx, dy = ey - my, dl = Math.hypot(dx, dy) || 1, r = Q['forearm' + k].r * 1.16 * z;
      pen([[mx + dx * .18 - dy / dl * r, my + dy * .18 + dx / dl * r], [mx + dx * .18 + dy / dl * r, my + dy * .18 - dx / dl * r]], w * .7, sid + n + 5);  // manga dobrada
      if (lk.shirt) wash(tube([b[0], [mx + dx * .18, my + dy * .18]], [br[0], br[1]]), lk.shirt);  // manga da blusa
      const it = F.world.item; if (a.holds && it && it.limb === 'arm' + k) flower(it, M, w, o, f);
      const h = Q['hand' + k], hb = Ms(h.pts), hr = [h.r * z, h.r * z], hand = tube(hb, hr, 'round', 'butt'); part(hand, tubeShade(hb, hr, 0, .35), w * .9, o, sid + n + 7);
      if (Lm['arm' + k].hand === 'fist') { const [qx, qy] = hb[1], [px, py] = hb[0], l = Math.hypot(qx - px, qy - py) || 1, nx = -(qy - py) / l * hr[0], ny = (qx - px) / l * hr[0]; pen([[qx - nx * .8, qy - ny * .8], [qx + nx * .2, qy + ny * .2]], w * .6, sid + n + 9); }
    };
    const armOr = (k, far, n) => (a.front || []).includes('arm' + k) ? later.push(() => arm(k, far, n)) : arm(k, far, n);
    const [aF, aN] = Lm.armL.far ? 'LR' : 'RL', [lF, lN] = Lm.legL.far ? 'LR' : 'RL';
    // Cabeça: quadro local x para a frente, y para baixo (y = 1 na base, −1 no topo), centro na junta head, raio meio osso.
    const [HB, HT] = Q.head.pts, rh = d2(HB, HT) / 2, Hc = J.head, ua = [(HT[0] - HB[0]) / (2 * rh), (HT[1] - HB[1]) / (2 * rh)], fa = [-f * ua[1], f * ua[0]];
    const hw = (lx, ly) => [Hc[0] + (fa[0] * lx - ua[0] * ly) * rh, Hc[1] + (fa[1] * lx - ua[1] * ly) * rh], hl = (lx, ly) => M(...hw(lx, ly));
    if (lk.hair === 'pony' || lk.hair === 'pigtail') {  // rabo de cavalo: o cabelo da pose (corrente com gravidade) a partir da nuca
      const hp = p.appendages.hair, b0 = hw(-.8, -.45), k = lk.hair === 'pony' ? 1.6 : 1.1;
      const tb = Ms(hp.map(([x, y]) => [b0[0] + (x - hp[0][0]) * k, b0[1] + (y - hp[0][1]) * k])), tr = [.2, .26, .2, .1].map(v => v * rh * z * (lk.hair === 'pony' ? 1 : .8));
      part(tube(tb, tr), tubeShade(tb, tr, lk.tone - .2, .4), w * .8, o, sid + 29);
      if (lk.hair === 'pigtail') { const bw = ellPoly(...hw(-.86, -.42), .18 * rh, .11 * rh, 1, 10).map(([x, y]) => M(x, y)); part(bw, null, w * .6, o, sid + 28); wash(bw, P.rose); }
    }
    if (lk.hair === 'bun') { const bn = ellPoly(...hw(-.82, -.62), .34 * rh, .3 * rh, 0, 16).map(([x, y]) => M(x, y)); part(bn, () => lk.tone, w * .9, o, sid + 29); }
    armOr(aF, true, 1);
    const BP = (u, v) => TM(-.09 + (u + .09) * .8, v * .8);  // mochila .8 da do desenho original (equilíbrio com a cabeça)
    if (gear.includes('backpack')) {  // mochila nas costas, bolso, aba e saco de dormir enrolado em cima
      const rr = (u0, u1, v0, v1, r) => [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, .5], [u0 + r, v0 + r, 1], [u1 - r, v0 + r, 1.5]].flatMap(([cu, cv, a0]) => Array.from({ length: 5 }, (_, i) => { const t = (a0 + i / 8) * Math.PI; return BP(cu + r * Math.cos(t), cv + r * Math.sin(t)); }));
      const bag = rr(-.29, -.08, -.21, .08, .045); part(bag, shade(bag, .3, .45), w, o, sid + 30);
      const pk = rr(-.32, -.24, -.16, -.03, .02); part(pk, shade(pk, .4, .4), w * .8, o, sid + 31);
      pen([BP(-.29, .0), BP(-.18, -.03), BP(-.08, .0)], w * .7, sid + 32);
      const [rx0, ry0] = T(-.09 - .09 * .8, .12 * .8), roll = ellPoly(rx0, ry0, .104 * s, .04 * s, Math.atan2(fy, fx), 18).map(([x, y]) => M(x, y)); part(roll, shade(roll, .12, .4), w, o, sid + 33);
      for (const u of [-.25, -.11]) pen([BP(u, .165), BP(u + .01, .075)], w * .7, sid + 34 + u * 10);
    }
    leg(lF, true, 2); leg(lN, false, 3);
    // Tronco: base do pescoço, peito, cintura (entre peito e pelve, afina ou faz barriga) e pelve.
    const tq = Q.torso, [Jp, Jc, Jn] = tq.pts, wa = [lerp(Jp[0], Jc[0], .45), lerp(Jp[1], Jc[1], .45)], tb = Ms([Jn, Jc, wa, Jp]), tr = [.07 * s, tq.r, (lk.waist ?? .9) * tq.r, .92 * tq.r].map(v => Math.min(tq.r, v) * z), torso = tube(tb, tr);
    if (lk.dress) {  // saia ou vestido: da cintura até dress da coxa, por cima das duas pernas
      const pts = [[wa[0] + fx * .95 * tq.r, wa[1] + fy * .95 * tq.r], [wa[0] - fx * .95 * tq.r, wa[1] - fy * .95 * tq.r]];
      for (const k of 'LR') { const [A, K] = Q['thigh' + k].pts, h = [lerp(A[0], K[0], lk.dress), lerp(A[1], K[1], lk.dress)], l = d2(A, K) || 1, nx = -(K[1] - A[1]) / l, ny = (K[0] - A[0]) / l, r = 1.55 * Q['thigh' + k].r; pts.push([h[0] + nx * r, h[1] + ny * r], [h[0] - nx * r, h[1] - ny * r]); }
      const dr = Ms(hull(pts)); part(dr, shade(dr, .05, .5), w, o, sid + 39); wash(dr, lk.skirt || lk.shirt);
    }
    part(torso, tubeShade(tb, tr, -.3, .85), w, o, sid + 40);
    if (lk.shirt) wash(torso, lk.shirt);
    if (lk.coat) { pen([TM(.1, .07), TM(.105, -.12), TM(.1, -.27)], w * .7, sid + 37); c.beginPath(); for (const v of [.02, -.07, -.16]) { const [x, y] = TM(.075, v); c.moveTo(x + .008 * S, y); c.arc(x, y, .008 * S, 0, TAU); } c.fillStyle = INK; c.fill(); }  // casaco de botões
    const bc = [Pv.x + fx * .09 * s, Pv.y + fy * .09 * s];
    pen([M(Pv.x - fx * .094 * s, Pv.y - fy * .094 * s), M(...bc)], w * 1.2, sid + 41);  // cinto e fivela
    c.fillStyle = INK; const [bx, by] = M(...bc); c.fillRect(bx - .012 * S, by - .012 * S, .016 * S, .024 * S);
    pen([TM(.015, .035), TM(.07, .035), TM(.072, -.025), TM(.017, -.027), TM(.015, .035)], w * .55, sid + 42);  // bolso
    pen([TM(-.03, .1), TM(.025, .055), TM(.06, .095)], w * .7, sid + 43);  // gola
    if (gear.includes('backpack')) { const st = Ms([T(-.085, .075), T(.02, .1), T(.075, .01), T(.05, -.11)]), sr = R([.017, .017, .017, .017]); part(tube(st, sr), tubeShade(st, sr, .3, .4), w * .8, o, sid + 44); }
    // Pescoço (tampa reta antes da base da cabeça), cabeça, orelha, cabelo e rosto.
    const nq = Q.neck, nb = Ms(nq.pts), nr = [nq.r * z, nq.r * z]; part(tube(nb, nr, 'butt'), tubeShade(nb, nr, .15, .5), w * .9, o, sid + 45);
    const head = Array.from({ length: 28 }, (_, i) => { const t = i / 28 * TAU; return hl(.92 * Math.cos(t) + .12 * Math.max(0, Math.cos(t)) * Math.max(0, Math.sin(t)), Math.sin(t)); });
    part(head, shade(head, -.25, .55), w, o, sid + 46);
    const ear = Array.from({ length: 12 }, (_, i) => { const t = i / 12 * TAU; return hl(-.14 + .13 * Math.cos(t), .1 + .19 * Math.sin(t)); }); part(ear, null, w * .8, o, sid + 47);
    pen([hl(-.1, .02), hl(-.17, .1), hl(-.1, .17)], w * .6, sid + 48);
    if (gear.includes('hat')) {
      pen(p.appendages.hair.map(([x, y]) => M(x, y)), w * .8, sid + 49, { tip: 1 });
      for (const [i, q] of [[[-.55, -.4], [-.86, -.05], [-.8, .28]], [[-.38, -.45], [-.72, -.02], [-.66, .22]]].entries()) pen(q.map(v => hl(...v)), w * .7, sid + 50 + i, { tip: 1 });
    } else if (lk.hair === 'bald') {  // calvo: franja branca em cachos atrás e do lado
      for (const [i, q] of [[[-.45, -.72], [-.82, -.45], [-.97, -.08]], [[-.98, -.05], [-.9, .25], [-.7, .42]], [[-.3, -.5], [-.62, -.3], [-.7, .05]]].entries()) pen(q.map(v => hl(...v)), w * .7, sid + 50 + i, { tip: 1 });
    } else if (lk.hair) {  // touca de cabelo no topo e atrás, hachurada pelo tom; linha do cabelo na testa
      const cap = [...Array.from({ length: 12 }, (_, i) => { const t = -Math.PI / 2 + .8 - i / 11 * (Math.PI / 2 + 1.25); return hl(1.07 * .92 * Math.cos(t), 1.07 * Math.sin(t)); }), hl(-.8, .32), hl(-.5, -.1), hl(-.08, -.46), hl(.4, -.62)];
      part(cap, () => lk.tone, w * .9, o, sid + 50);
      if (lk.band) { const bd = [hl(-.95, -.3), hl(-.5, -.82), hl(.2, -.98), hl(.62, -.82), hl(.55, -.66), hl(.15, -.8), hl(-.45, -.64), hl(-.9, -.14)]; part(bd, null, w * .7, o, sid + 51); wash(bd, P.hero); }
    }
    if (lk.beard) { c.beginPath(); for (let i = 0; i < 16; i++) { const [x, y] = hl(.25 + .5 * rs(sid + i, 1), .45 + .4 * rs(sid + i, 2)); c.rect(x, y, 1.6, 1.6); } c.fillStyle = INK; c.fill(); }  // barba por fazer
    // Rosto grande (enche a frente da cabeça): olhos, sobrancelhas, nariz e boca com traço forte.
    const e = p.face.expression, closed = p.face.blink > .5, E = { curious: [.12, .18, .03], surprised: [.2, .23, 0] }[e] || [.11, .16, 0], fw = Math.max(w * 1.2, 2);
    const EY = [[.26, -.02, 1], [.7, -.06, .8]];
    EY.forEach(([x, y, k], i) => {
      const [X, Y] = hl(x, y + E[2]), rx = E[0] * rh * z * k, ry = E[1] * rh * z * k;
      if (closed) return pen([hl(x - .14 * k, y), hl(x, y + .06), hl(x + .14 * k, y)], fw, sid + 55 + i);
      if (e === 'happy') return pen([hl(x - .14 * k, y + .04), hl(x, y - .09), hl(x + .14 * k, y + .04)], fw * 1.1, sid + 55 + i);  // olhos sorrindo
      if (e === 'surprised') {
        const ey = ellPoly(X, Y, rx, ry, 0, 16); path(ey, true); c.fillStyle = pat; c.fill(); ring(ey, w * .6, sid + 57 + i);
        c.beginPath(); c.arc(X + f * .2 * rx, Y, .4 * rx, 0, TAU); c.fillStyle = INK; c.fill();
      } else { c.beginPath(); c.ellipse(X, Y, rx, ry, 0, 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(X - .3 * rx, Y - .35 * ry, .3 * rx, 0, TAU); c.fillStyle = P.paper; c.fill(); }
    });
    if (lk.glasses) { EY.forEach(([x, y, k], i) => ring(ellPoly(...hl(x, y), .24 * k * rh * z, .2 * k * rh * z, 0, 14), w * .7, sid + 90 + i)); pen([hl(.5, -.06), hl(.52, -.1)], w * .6, sid + 92); }
    const BR = { curious: [[.08, -.46, .46, -.58], [.58, -.34, .9, -.38]], surprised: [[.06, -.56, .46, -.66], [.56, -.62, .92, -.56]], happy: [[.1, -.4, .46, -.46], [.58, -.46, .9, -.4]] }[e] || [[.1, -.34, .46, -.38], [.58, -.38, .9, -.34]];
    BR.forEach(([x0, y0, x1, y1], i) => pen([hl(x0, y0), hl((x0 + x1) / 2, Math.min(y0, y1) - .07), hl(x1, y1)], fw * (lk.hair === 'bald' ? .9 : 1.15), sid + 60 + i));
    pen([hl(.84, -.06), hl(1.14, .2), hl(.86, .3)], fw * .9, sid + 62);
    if (e === 'happy' && lk.shirt) wash(ellPoly(...hl(.16, .3), .15 * rh * z, .09 * rh * z, 0, 12), P.rose);  // bochecha
    if (lk.stache) pen([hl(.52, .44), hl(.74, .36), hl(.98, .44)], fw * 1.5, sid + 93, { ov: 0 });
    // Boca: a da fala (m fechada, e pequena, a aberta, o redonda) ou a da expressão.
    const mo = p.face.mouth, mouthAt = (rx, ry) => { const [X, Y] = hl(.62, .6), m = ellPoly(X, Y, rx * rh * z, ry * rh * z, 0, 14); path(m, true); c.fillStyle = INK; c.fill(); };
    if (mo === 'a') mouthAt(.16, .18); else if (mo === 'e') mouthAt(.18, .08); else if (mo === 'o') mouthAt(.1, .12);
    else if (mo === 'm') pen([hl(.4, .56), hl(.62, .6), hl(.84, .55)], fw, sid + 63);
    else if (e === 'surprised') mouthAt(.14, .2);
    else pen(e === 'curious' ? [hl(.46, .58), hl(.62, .52), hl(.76, .6)] : e === 'happy' ? [hl(.34, .46), hl(.62, .72), hl(.88, .44)] : [hl(.38, .54), hl(.62, .62), hl(.84, .52)], fw, sid + 63);
    if (gear.includes('hat')) {  // chapéu de explorador: aba, copa com afundado, fita escura, beirada da aba por cima
      const brim = Array.from({ length: 26 }, (_, i) => { const t = i / 26 * TAU; return hl(.05 + 1.48 * Math.cos(t), -.46 + .2 * Math.sin(t)); });
      part(brim, shade(brim, .1, .4), w, o, sid + 64);
      const crown = [...Array.from({ length: 15 }, (_, i) => { const t = Math.PI + Math.PI * i / 14; return hl(.9 * Math.cos(t), -.5 + .86 * Math.sin(t) * (1 - .08 * Math.cos(t) ** 2)); })];
      part(crown, shade(crown, .03, .5), w, o, sid + 65);
      const band = [hl(-.9, -.5), hl(-.88, -.68), hl(0, -.7), hl(.88, -.66), hl(.9, -.5), hl(0, -.48)]; part(band, () => .85, w * .7, o, sid + 66);
      pen([hl(-.32, -1.22), hl(0, -1.12), hl(.32, -1.2)], w * .6, sid + 67);
      pen(Array.from({ length: 12 }, (_, i) => { const t = .12 * TAU + i / 11 * .76 * Math.PI; return hl(.05 + 1.48 * Math.cos(t), -.46 + .2 * Math.sin(t)); }), w * 1.1, sid + 68);
    }
    armOr(aN, false, 4);
    if (p.emote && p.emote.a > 0) {  // emote a caneta: ? ou ! com traços de susto
      const { sym, k, a: al } = p.emote, [X, Y] = hl(1.05, -1.85), sz = 1.5 * rh * z * Math.max(0, k);
      c.save(); c.globalAlpha *= al; c.font = `bold ${sz}px ${FONT}`; c.textAlign = 'center'; c.fillStyle = INK; c.translate(X, Y); c.rotate(.12 * (rb(sid, 70) - .5)); c.fillText(sym, 0, 0); c.restore();
      if (sym === '!') { c.save(); c.globalAlpha *= al; for (const [i, [x0, y0, x1, y1]] of [[-.75, -1.5, -1.05, -1.95], [-.1, -1.62, -.14, -2.15], [.5, -1.56, .74, -2.02]].entries()) pen([hl(x0, y0), hl(lerp(x0, x1, k), lerp(y0, y1, k))], w, sid + 71 + i); c.restore(); }
    }
    return later;
  }

  // Banco de praça de perfil (P): encosto do lado b.back, pés até o chão e assento com o topo em seatY; madeira hachurada.
  // Desenhado na ordem de profundidade dele (atrás da moça sentada, na frente do corredor).
  function bench(b, F) {
    const M = mapper(F, {}), g = F.world.ground, w = clamp(2.4 * F.cam.z, 1.6, 4), o = { sp: 4.5, rot: .8, w: 1.1, anchor: M(b.x, b.seatY), seed: 450 };
    const box = (x0, y0, x1, y1, s, t) => { const q = [M(x0, y0), M(x1, y0), M(x1, y1), M(x0, y1)]; part(q, shade(q, t, .45), w, o, s); };
    const th = .1 * b.w, xb = b.x + b.back * b.w / 2, pw = .06 * b.w;
    box(xb - pw * .6, b.seatY - b.backH, xb + pw * .6, g(xb), 451, .35);
    for (const [i, y] of [b.seatY - b.backH + .05 * b.w, b.seatY - .5 * b.backH].entries()) box(xb - b.back * pw * .6 - b.back * .02 * b.w, y, xb - b.back * pw * .6 + b.back * .07 * b.w, y + .18 * b.w, 452 + i, .5);  // ripas do encosto, de topo
    for (const u of [-.38, .38]) { const x = b.x + u * b.w; box(x - pw / 2, b.seatY + th, x + pw / 2, g(x), 455 + u * 10, .4); }
    box(b.x - b.w / 2 - .04 * b.w, b.seatY, b.x + b.w / 2 + .04 * b.w, b.seatY + th, 458, .25);
  }

  // Lago (N), por cima dos seres: abaixo da linha d'água, papel translúcido (o submerso esmaece), aguada azul, riscos de
  // água presos ao mundo e a linha da superfície; depois ondas (círculos achatados que abrem e somem) e respingos (gotas em
  // arco balístico e a coroa que sobe e cai na saída e na entrada do peixe).
  function water(F) {
    const L = F.world.lake; if (!L) return;
    const { cx, cy, z } = F.cam, M = mapper(F, {}), [X0, Y0] = M(L.x0, L.waterY), t = F.t;
    if (X0 < W && Y0 < H) {
      const x0 = Math.max(-10, X0), g = F.world.ground;  // água só entre a superfície e o fundo (o chão continua sob ela)
      c.save(); c.beginPath(); c.moveTo(X0, Y0); c.lineTo(W + 10, Y0);
      for (let X = W + 10; X > X0 - 8; X -= 8) { const x = Math.max(L.x0, (X - 960) / z + cx); c.lineTo(...M(x, Math.max(L.waterY, g(x)))); }
      c.closePath(); c.clip();
      c.globalAlpha = .72; c.fillStyle = pat; c.fill(); c.globalAlpha = 1;
      c.globalCompositeOperation = 'multiply'; c.fillStyle = P.water; c.fill(); c.globalCompositeOperation = 'source-over';
      c.beginPath();
      const xa = (x0 - 960) / z + cx, xb = (W - 960) / z + cx;
      for (let r = 1; Y0 + r * 16 * z < H; r++) for (let x = Math.floor(xa / 70) * 70; x < xb; x += 70) {
        const i = Math.round(x / 70) * 131 + r; if (rs(i, 1) < .4 + .03 * r) continue;
        const [X, Y] = M(x + 40 * rs(i, 2), L.waterY + r * 16), l = (14 + 30 * rs(i, 3)) * z * Math.max(.3, 1 - .05 * r);
        c.moveTo(X, Y + 1.2 * (rb(i, 4) - .5)); c.lineTo(X + l, Y + 1.2 * (rb(i, 5) - .5));
      }
      c.lineWidth = 1.2; c.lineCap = 'round'; c.strokeStyle = P.hatch; c.stroke();
      c.restore();
      const xe = Math.min(W + 30, M(L.x1, 0)[0]), n = Math.max(2, Math.ceil((xe - x0) / 380));
      for (let k = 0; k < n; k++) pen([[lerp(X0, xe, k / n) - 6, Y0], [lerp(X0, xe, (k + 1) / n) + 6, Y0 + .6]], 2.2, 600 + k);
    }
    for (const e of F.world.ripples || []) {
      const k = clamp((t - e.t0) / 3), rr = e.r * (.15 + .85 * Math.sqrt(k)) * z, [X, Y] = M(e.x, e.y);
      c.save(); c.globalAlpha = 1 - k;
      ring(ellPoly(X, Y, rr, .18 * rr, 0, 24), 2.2 * (1 - k) + .5, 610 + e.t0 * 7);
      if (k > .15) ring(ellPoly(X, Y, .6 * rr, .11 * rr, 0, 20), 1.6 * (1 - k) + .4, 611 + e.t0 * 7);
      c.restore();
    }
    for (const e of F.world.splashes || []) {
      const ag = t - e.t0, G = 9 * e.r, sd = Math.round(e.x);
      if (ag < .45) for (const sg of [-1, 0, 1]) { const hgt = e.r * (sg ? .9 : 1.3) * Math.sin(Math.PI * ag / .45); if (hgt > 2) pen([M(e.x + sg * .25 * e.r, e.y), M(e.x + sg * (.3 + .5 * ag) * e.r, e.y - .6 * hgt), M(e.x + sg * (.4 + .9 * ag) * e.r, e.y - hgt)], 2, 620 + sg, { tip: 1 }); }
      c.beginPath();
      for (let i = 0; i < 9; i++) {
        const th = -Math.PI / 2 + (i / 8 - .5) * 2 + .2 * (rs(sd + i, 1) - .5), v = e.r * (2.4 + 1.2 * rs(sd + i, 2)), x = e.x + Math.cos(th) * v * ag, y = e.y + Math.sin(th) * v * ag + .5 * G * ag * ag;
        if (y > e.y) continue;
        const [X, Y] = M(x, y), r = Math.max(1.5, .07 * e.r * z * (1 - .4 * ag)), vy = Math.sin(th) * v + G * ag, a = Math.atan2(vy, Math.cos(th) * v);
        sub(ellPoly(X, Y, 1.5 * r, r, a, 10), true);
      }
      c.fillStyle = pat; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
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
    parts,
    draw(F) {
      c = animationEngine.context; c.resetTransform(); B = Math.floor(Math.round(F.t * 30) / 3); bv = B;
      if (!paper) paper = makePaper();
      pat = patOf(c); c.lineJoin = 'round';
      backdropCached(F);
      // Ordem de desenho: camada e profundidade; adereços (banco, flor no chão) antes dos seres da mesma profundidade.
      const Wd = F.world, it = Wd.item, z = F.cam.z, later = [], list = [];
      if (Wd.bench) list.push({ depth: Wd.bench.depth ?? -150, draw: () => bench(Wd.bench, F) });
      if (it && !it.held) list.push({ depth: (F.actors.find(a => a.role === 'child')?.depth ?? 200) - .01, draw: () => flower(it, mapper(F, {}), clamp(2.4 * z, 1.6, 4), { sp: 4, w: 1, seed: 3 }) });
      list.push(...F.actors.map(a => ({ a, depth: a.depth ?? 0, layer: a.layer ?? 1 })));
      list.sort((u, v) => (u.layer ?? 1) - (v.layer ?? 1) || u.depth - v.depth);
      const DRAW = { human, fly, dog, bird, fish, butterfly, beetle };
      for (const e of list) {
        if (e.draw) { e.draw(); continue; }
        const a = e.a; if (a.hidden || a.alpha === 0) continue;
        const M = mapper(F, a), sid = sidOf(a.id), Q = Object.fromEntries(parts(a, F).map(q => [q.name, q]));
        c.globalAlpha = a.alpha ?? 1;
        const r = (DRAW[a.kind] || ant)(a, M, z, sid, Q, F); if (r) later.push(...r);
        c.globalAlpha = 1;
      }
      later.forEach(fn => fn());  // braços do abraço por cima dos dois corpos
      water(F);
      frontGrass(F); texts(F);
    },
  };
})();
