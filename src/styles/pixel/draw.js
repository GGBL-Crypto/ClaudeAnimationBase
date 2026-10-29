// Pixel art no quadro F: a cena K (kit de episódio, src/episode/kit.js) desenhada direto na grade do engine.js (320×180).
// Só retângulos inteiros em cores da paleta; degradê por pontilhado Bayer 4×4 entre duas cores; luz e névoa trocam cada
// cor pela vizinha da rampa (sem mistura). A câmera de cada camada é arredondada à grade antes do desenho. As cores do
// elenco viram a cor mais próxima da paleta; o quantizador do engine.js continua no fim. A pose chega a 12/s (o engine
// passa onTwos(t)).
(() => {
  const c = animationEngine.context, S = STYLE.texture.scale, P = STYLE.palette, GW = W / S, GH = H / S;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16;
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), key = (r, g, b) => r << 16 | g << 8 | b;
  const COLORS = [...new Set(Object.values(P).map(x => x.toUpperCase()))], lum = h => { const [r, g, b] = rgb(h); return .3 * r + .59 * g + .11 * b; };
  const nearest = (hex, ok = () => true) => { const [r, g, b] = rgb(hex); let best = null, d = Infinity; for (const q of COLORS) { if (!ok(q)) continue; const [x, y, z] = rgb(q), e = (x - r) ** 2 + (y - g) ** 2 + (z - b) ** 2; if (e < d) { d = e; best = q; } } return best; };
  // Mapa de troca de cor da paleta (int → [r, g, b]).
  const shiftMap = to => Object.fromEntries(COLORS.map(h => [key(...rgb(h)), rgb(to(h) || h)]));
  // Luz: cada cor sobe um degrau da sua rampa (escuro → claro, puxando para o quente).
  const UP = { black: 'duskNear', duskNear: 'duskMid2', duskMid2: 'duskFar', duskFar: 'duskMid', duskMid: 'shadow', shadow: 'body', body: 'light', light: 'wing', wing: 'flame', wingAccent: 'body', duskTop: 'duskMid2', duskGround: 'duskMid2', duskLow: 'light',
    night0: 'night1', night1: 'night2', night2: 'dawnMid2', nightMid: 'nightFar', nightFar: 'dawnNear', dawnNear: 'dawnMid2', dawnMid2: 'dawnFar', dawnFar: 'dawnMid', dawnMid: 'light', dawnTop: 'dawnMid2',
    ink: 'stoneDk', stoneDk: 'stone', stone: 'snowShade', snowShade: 'snow', woodDk: 'wood', wood: 'sandDk', sandDk: 'sand', sand: 'cloud', cloud: 'flame',
    nightGround: 'dawnGround', dawnGround: 'foliage', foliage: 'ground', ground: 'light', seaDk: 'sea', sea: 'dayMid', dayTop: 'dayMid', dayMid: 'sky', sky: 'snow', dayFar: 'sky', dayMid2: 'ground' };
  const LIFT = shiftMap(h => P[UP[Object.keys(P).find(k => P[k].toUpperCase() === h)]]);

  let clip = null, R = null, K = null, F0 = null;  // recorte em px da grade, rampa, kit e quadro atual (refeitos a cada quadro)
  const col = role => P[R[role]] || P[role];
  function rect(x, y, w, h, color) {
    let x0 = Math.round(x), y0 = Math.round(y), x1 = Math.max(x0 + 1, Math.round(x + w)), y1 = Math.max(y0 + 1, Math.round(y + h));
    if (clip) { x0 = Math.max(x0, clip.x0); y0 = Math.max(y0, clip.y0); x1 = Math.min(x1, clip.x1); y1 = Math.min(y1, clip.y1); }
    if (x1 > x0 && y1 > y0 && w > 0 && h > 0) { c.fillStyle = color; c.fillRect(x0, y0, x1 - x0, y1 - y0); }
  }
  const px = (x, y, color) => rect(x, y, 1, 1, color);
  // Linha de pontilhado: a ou b por px conforme o limiar Bayer (k = fração de b), em trechos contínuos.
  function dither(y, x0, x1, a, b, k) {
    let run = x0, cur = null;
    for (let x = x0; x <= x1; x++) { const q = x < x1 ? (bay(x, y) < k ? b : a) : null; if (q !== cur) { if (cur) rect(run, y, x - run, 1, cur); cur = q; run = x; } }
  }
  function disc(cx, cy, r, color) { cx = Math.round(cx); cy = Math.round(cy); for (let dy = -Math.round(r); dy <= Math.round(r); dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))), q = typeof color === 'function' ? color(dy) : color; if (q) rect(cx - hw, cy + dy, 2 * hw + 1, 1, q); } }
  // Traço em blocos w×w do centro a até b (w inteiro); dy = deslocamento do bloco (pé assentado no chão).
  function seg([x0, y0], [x1, y1], w, color, dy = -w / 2) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) rect(Math.round(lerp(x0, x1, i / n) - w / 2), Math.round(lerp(y0, y1, i / n) + dy), w, w, color);
  }
  // Polígono fechado por linhas de varredura (par-ímpar), no centro de cada px.
  function poly(pts, color) {
    const ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const yc = y + .5, xs = [];
      pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); });
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) { const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]); if (x1 > x0) rect(x0, y, x1 - x0, 1, color); }
    }
  }
  // Troca de cor por px no buffer: n(x, y) passos do mapa (0 = mantém) dentro da caixa (px da grade).
  function shiftPass(map, n, x0 = 0, y0 = 0, x1 = GW, y1 = GH) {
    const b = clip || { x0: 0, y0: 0, x1: GW, y1: GH };
    x0 = Math.max(b.x0, Math.floor(x0)); y0 = Math.max(b.y0, Math.floor(y0)); x1 = Math.min(b.x1, Math.ceil(x1)); y1 = Math.min(b.y1, Math.ceil(y1));
    if (x1 <= x0 || y1 <= y0) return;
    const img = c.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      let k = n(x, y); if (k <= 0) continue;
      const i = ((y - y0) * (x1 - x0) + x - x0) * 4; let q = [d[i], d[i + 1], d[i + 2]];
      while (k-- > 0) q = map[key(...q)] || q;
      d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2];
    }
    c.putImageData(img, x0, y0);
  }
  // Luzes: soma de k·A·(1 − d/r) em cada px; o pontilhado decide quantos passos de luz (até 2) a cor sobe.
  function lightPass(list) {
    if (!list.length) return;
    const n = (x, y) => { let v = 0; for (const l of list) { const d = Math.hypot(x + .5 - l.x, y + .5 - l.y); if (d < l.r) v += l.a * (1 - d / l.r); } return Math.min(2, Math.floor(v + bay(x, y))); };
    shiftPass(LIFT, n, Math.min(...list.map(l => l.x - l.r)), Math.min(...list.map(l => l.y - l.r)), Math.max(...list.map(l => l.x + l.r)), Math.max(...list.map(l => l.y + l.r)));
  }

  // Câmera na grade: tela X = (x − lerp(960, cx, f))·z + 960; o deslocamento de cada camada é arredondado a px inteiro.
  function view(F, f) {
    const { cx, cy, z } = F.cam, k = z / S, ox = Math.round((960 - lerp(960, cx, f) * z) / S), oy = Math.round((540 - cy * z) / S);
    return { k, x: x => x * k + ox, y: y => y * k + oy, wx: gx => (gx - ox) / k, wy: gy => (gy - oy) / k, p: q => [q[0] * k + ox, q[1] * k + oy] };
  }

  // ---------- céu ----------
  // Degradê de cima para baixo em três cores, por world y (0 .. h0), em 8 degraus de pontilhado como o story.
  function skyFill(V, y0w, h0, box) {
    for (let gy = box.y0; gy < box.y1; gy++) {
      const t = clamp((V.wy(gy + .5) - y0w) / h0), lo = t < .5, k = Math.round((lo ? t / .5 : (t - .5) / .5) * 8) / 8;
      dither(gy, box.x0, box.x1, col(lo ? 'skyTop' : 'skyMid'), col(lo ? 'skyMid' : 'skyLow'), k);
    }
  }
  // Nuvem: base do vão dos três tufos com pontas redondas e borda escura de 1 px só embaixo dela (os tufos ficam dentro).
  // top = topo da base; need = o topo mínimo para os tufos caberem no quadro.
  function cloudShape(V, o) {
    const x = V.x(o.x), w = o.w * V.k, h = o.h * V.k, bh = h * .4, xs = x - w * .2, xe = x + w * .2;
    const lumps = [0, 1, 2].map(i => ({ x: xs + w * .2 * i, r: h * (.3 + .12 * hash(o.seed + i + 7)), up: h * (.1 + .15 * hash(o.seed + i)) }));  // r > metade do vão: tufos se tocam
    return { xs, xe, bh, lumps, top: V.y(o.y) - h * .1, need: 2 + Math.max(...lumps.map(l => l.up + l.r)) };
  }
  const cloudBase = (q, y, color) => { rect(q.xs, y, q.xe - q.xs, q.bh, color); disc(q.xs, y + q.bh / 2, q.bh / 2, color); disc(q.xe, y + q.bh / 2, q.bh / 2, color); };
  // Todas as bordas antes de todos os recheios (a borda de uma nuvem não corta a outra). As nuvens descem juntas o
  // necessário para nenhuma sair pelo topo: a disposição do kit se mantém, sem empilhar as altas numa faixa.
  function clouds(V, list) {
    const qs = list.map(o => cloudShape(V, o)), dy = Math.max(0, ...qs.map(q => q.need - q.top));
    for (const q of qs) cloudBase(q, q.top + dy + 1, col('cloudDk'));
    for (const q of qs) { cloudBase(q, q.top + dy, col('cloud')); for (const l of q.lumps) disc(l.x, q.top + dy - l.up, l.r, col('cloud')); }
  }
  function drawSky(F, V, box) {
    const Sk = K.sky; skyFill(V, box.y0w, box.h0, box);
    const o = Sk.celestial;
    if (o) { const r = o.r * V.k; lightPass([{ x: V.x(o.x), y: V.y(o.y), r: r * (2 + 1.2 * o.glow), a: 1.4 * o.glow }]); }
    for (const s of Sk.stars) {
      const x = Math.round(V.x(s.x)), y = Math.round(V.y(s.y)), big = s.r > 1.8;
      if (s.tw > .66 || big) px(x, y, P.cloud); else if (s.tw > .3) px(x, y, P.snowShade);
      if (big && s.tw > .5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(x + dx, y + dy, P.snowShade);
    }
    if (o) {
      const r = o.r * V.k, x = V.x(o.x), y = V.y(o.y), moon = o.kind === 'moon', low = K.mood === 'dawn' || K.mood === 'dusk';
      const base = moon ? P.cloud : low ? P.wing : P.flame, band = moon ? P.snowShade : col('skyLow');
      disc(x, y, r, dy => (moon || low) && dy > 0 && dy % 3 === (dy > r * .6 ? 0 : 1) ? band : base);  // faixas horizontais na metade de baixo
      if (moon) { px(x - r * .4, y - r * .3, P.snowShade); px(x + r * .2, y - r * .5, P.snowShade); }
    }
    const m = Sk.meteor;
    if (m && m.k > 0 && m.k < 1) {
      const hx = V.x(lerp(m.x0, m.x1, m.k)), hy = V.y(lerp(m.y0, m.y1, m.k)), L = Math.hypot(m.x1 - m.x0, m.y1 - m.y0), ux = (m.x1 - m.x0) / L, uy = (m.y1 - m.y0) / L;
      for (let i = 0; i < 14; i++) if (i < 8 || i % 2 === 0) px(hx - ux * i, hy - uy * i, i < 3 ? P.flame : i < 7 ? P.cloud : P.snowShade);
    }
    clouds(V, Sk.clouds);
  }

  // ---------- camadas ----------
  const lit = () => K.mood === 'day' || K.mood === 'dawn';
  const SURF = { grass: () => [col('ground'), col('near')], sand: () => lit() ? [P.sand, P.sandDk] : K.mood === 'dusk' ? [P.sandDk, P.wood] : [P.stoneDk, P.nightFar],
    stone: () => lit() ? [P.stone, P.stoneDk] : [P.stoneDk, col('near')], snow: () => lit() ? [P.snow, P.snowShade] : [P.snowShade, col('far')] };
  // Perfil preenchido até o pé do quadro; topo do chão (top[gx]) volta para os pés e o pontilhado.
  function profile(V, prof, color, edge) {
    const top = [];
    for (let gx = 0; gx < GW; gx++) { const y = Math.round(V.y(prof(V.wx(gx + .5)))); top.push(y); rect(gx, y, 1, GH - y, color); if (edge) px(gx, y, edge); }
    return top;
  }
  function ground(V, l) {
    const [base, dark] = SURF[l.surface](), top = profile(V, l.prof, base, dark), ox = Math.round(V.x(0));
    if (!STYLE.texture.dither) return;
    // Pedra: calçamento em fiadas (mais largas perto). Demais: pontilhado estático preso ao mundo, pares de px escuros e
    // alguns claros (sem mudar entre quadros).
    if (l.surface === 'stone') {
      for (let gy = Math.min(...top) + 3, d = 3, r = 0; gy < GH; gy += d, d++, r++) for (let gx = 0; gx < GW; gx++) {
        if (gy > top[gx]) px(gx, gy, dark);
        if ((gx - ox + r * 5) % (3 * d) === 0) for (let k = 1; k < d && gy - k > top[gx]; k++) px(gx, gy - k, dark);
      }
      return;
    }
    for (let gx = 0; gx < GW; gx++) for (let gy = top[gx] + 2; gy < GH; gy++) {
      const h = hash((gx - ox) * 7.13 + gy * 131.7);
      if (h < .03) { px(gx, gy, dark); if (h < .012) px(gx + 1, gy, dark); } else if (h > .993 && lit()) px(gx, gy, P.light);
    }
    if (l.surface === 'grass') for (let gx = 0; gx < GW; gx++) if (hash((gx - ox) * 3.7) < .22) px(gx, top[gx] - 1, dark);  // tufos
  }
  // Pinheiro serrilhado (camadas que crescem e recuam), árvore larga em bolha, palmeira.
  function tree(V, t, color) {
    const x = Math.round(V.x(t.x)), y = Math.round(V.y(t.y)), h = Math.max(4, Math.round(t.h * V.k));
    if (t.kind === 'pine') {
      const hw = h * .3, tier = Math.max(3, Math.round(h / 4));
      for (let r = 0; r < h - 1; r++) { const w = Math.round(hw * (.35 * (r % tier) / tier + .65 * r / h)); rect(x - w, y - h + r, 2 * w + 1, 1, color); }
      rect(x, y - 2, 1, 2, color);
    } else if (t.kind === 'palm') {
      seg([x, y], [x + h * .15, y - h], 1, color, 0);
      for (const a of [-2.6, -2, -1.1, -.5]) seg([x + h * .15, y - h], [x + h * .15 + Math.cos(a) * h * .35, y - h - Math.sin(-a) * h * .12 + h * .1], 1, color, 0);
    } else { rect(x, y - h * .4, 1, h * .4, color); disc(x, y - h * .62, h * .3, color); disc(x - h * .18, y - h * .5, h * .2, color); disc(x + h * .18, y - h * .52, h * .22, color); }
  }
  const WALL = { dawn: ['sand', 'sandDk'], day: ['sand', 'sandDk'], dusk: ['sandDk', 'wood'], night: ['stoneDk', 'ink'] };
  function building(V, b) {
    const x0 = Math.round(V.x(b.x - b.w / 2)), x1 = Math.round(V.x(b.x + b.w / 2)), yb = Math.round(V.y(b.y)), yt = Math.round(V.y(b.y - b.h)), w = x1 - x0, snow = K.weather.kind === 'snow';
    const farm = b.roof === 'gable', light = b.roof === 'tower' && b.h > 3 * b.w, wallx = b.roof === 'flat' && b.w > 1000;
    const [wc, wd] = farm ? (K.mood === 'night' ? [P.woodDk, P.black] : [P.wood, P.woodDk]) : WALL[K.mood].map(k => P[k]);
    rect(x0, yt, w, yb - yt, wc); rect(x1 - Math.max(1, Math.round(w / 4)), yt, Math.max(1, Math.round(w / 4)), yb - yt, wd);
    if (light) for (let y = yt + 3; y < yb; y += 6) rect(x0, y, w, 3, P.shadow);  // farol listrado
    if (farm) for (let y = yt + 2; y < yb; y += 3) rect(x0, y, w - Math.round(w / 4), 1, wd);  // tábuas
    const cap = (y, xa, xb) => snow && rect(xa, y, xb - xa, 1, P.snow);
    if (b.roof === 'gable' || b.roof === 'tower') {
      const rh = Math.round((b.roof === 'gable' ? .4 : .8) * b.w * V.k), rc = b.roof === 'gable' ? P.shadow : light ? P.shadow : P.wingAccent;
      for (let r = 0; r < rh; r++) { const hw = Math.round((w / 2 + 1) * (r + 1) / rh); rect(x0 + w / 2 - hw, yt - rh + r, 2 * hw, 1, r === rh - 1 ? P.woodDk : rc); if (r < 2) cap(yt - rh + r, x0 + w / 2 - hw, x0 + w / 2 + hw); }
    } else if (b.roof === 'dome') { disc(x0 + w / 2, yt, w / 2, dy => dy < 0 ? (dy < -w / 4 ? P.cloud : P.snowShade) : null); rect(x0 + w / 2, yt - w / 2 - 2, 1, 2, P.wing); }
    else if (b.roof === 'temple') {
      const rh = Math.round(.18 * b.w * V.k);
      for (let r = 0; r < rh; r++) { const hw = Math.round((w / 2 + 2) * (r + 1) / rh); rect(x0 + w / 2 - hw, yt - rh + r, 2 * hw, 1, P.cloud); }
      rect(x0 - 2, yt, w + 4, 2, P.snowShade); cap(yt - rh, x0 + w / 2 - 1, x0 + w / 2 + 1);
      for (let i = 0; i < 6; i++) { const cx = Math.round(x0 + w * (.1 + .16 * i)); rect(cx - 1, yt + 2, 3, yb - yt - 2, P.cloud); rect(cx + 1, yt + 2, 1, yb - yt - 2, P.snowShade); }
    } else if (wallx) {  // muralha: ameias e fiadas de pedra
      for (let x = x0; x < x1; x += 4) rect(x, yt - 2, 2, 2, wc); cap(yt - 2, x0, x1);
      for (let y = yt + 3, r = 0; y < yb; y += 3, r++) { rect(x0, y, w, 1, wd); for (let x = x0 + (r % 2) * 3; x < x1; x += 6) px(x, y - 1, wd); }
    }
    else { rect(x0 - 1, yt - 1, w + 2, 2, wd); cap(yt - 1, x0 - 1, x1 + 1); }
    for (const q of b.windows) {
      let wx = Math.round(V.x(q.x)), wy = Math.round(V.y(q.y)), ww = Math.max(1, Math.round(q.w * V.k)), wh = Math.max(2, Math.round(q.h * V.k));
      if (q.lit && farm) { wx -= 1; ww += 2; wh += 1; }  // janela da casa da fazenda maior, quente como a do story
      if (q.lit) { rect(wx - 1, wy - 1, ww + 2, wh + 2, P.light); rect(wx, wy, ww, wh, q.lit > .9 ? P.flame : P.wing); if (ww >= 3 && wh >= 4) { rect(wx + (ww >> 1), wy, 1, wh, P.woodDk); rect(wx, wy + (wh >> 1), ww, 1, P.woodDk); } }
      else rect(wx, wy, ww, wh, col('shadow'));
    }
  }
  function sea(V, l) {
    const y = Math.round(V.y(l.y)), base = lit() ? P.sea : P.seaDk, hi = lit() ? P.cloud : col('skyLow');
    rect(0, y, GW, GH - y, base);
    for (let r = 0; r < 4; r++) dither(y + r, 0, GW, base, col('skyLow'), (4 - r) / 6);
    const o = K.sky.celestial, V0 = view(F0, 0);
    if (o) for (let r = 4, gy = y + 4; gy < GH; r++, gy += 2) { const w = Math.round(o.r * V0.k * (.6 + .05 * r)), jx = Math.round(2 * Math.sin(TAU * (3 * K.phase + r * .27))); rect(V0.x(o.x) - w / 2 + jx, gy, w, 1, o.kind === 'moon' ? P.snowShade : P.wing); }
    for (const w of l.waves) { const n = Math.max(1, Math.round(w.len * V.k * (.4 + .6 * w.k))); rect(V.x(w.x) - n / 2, V.y(w.y), n, 1, hi); }
  }
  function prop(V, o) {
    const x = Math.round(V.x(o.x)), y = Math.round(V.y(o.y)), s = o.s * V.k, dk = lit() ? P.woodDk : col('near');
    if (o.kind === 'ship') {
      for (let r = 0; r < Math.round(s * .2); r++) rect(x - s * .6 + r, y + r, s * 1.2 - 2 * r, 1, r ? P.woodDk : P.wood);
      rect(x, y - s, 1, s, P.woodDk); const sw = Math.round(s * (.36 + .06 * o.k));
      for (let r = 0; r < s * .75; r++) rect(x + 1, y - s + 1 + r, Math.round(sw * (r + 1) / (s * .75)), 1, r % 4 === 3 ? P.snowShade : P.cloud);
      rect(x, y - s - 2, 3, 1, P.wingAccent);
    } else if (o.kind === 'camel') {
      const c0 = lit() ? P.wood : col('near'); rect(x - s * .45, y - s * .85, s * .9, s * .32, c0); disc(x - s * .1, y - s * .85, s * .16, c0);
      for (const d of [-.35, -.15, .15, .35]) rect(x + d * s, y - s * .55, 1, s * .55, c0);
      const hx = x + s * .5, hy = y - s * (.95 + .1 * o.k); seg([x + s * .4, y - s * .7], [hx, hy], 1, c0, 0); rect(hx, hy, 3, 2, c0);
    } else if (o.kind === 'column') {
      const w = Math.max(3, Math.round(28 * V.k)), [cc, cd] = lit() ? [P.stone, P.stoneDk] : [col('far'), col('mid')], h = Math.round(s);
      rect(x - w / 2, y - h, w, h, cc); rect(x + w / 2 - 1, y - h, 1, h, cd); rect(x - w / 2 - 1, y - 2, w + 2, 2, cd);
      for (let i = 0; i < w; i++) rect(x - w / 2 + i, y - h - 1 - Math.round(2 * hash(o.seed * 9 + i)), 1, 1 + Math.round(2 * hash(o.seed * 9 + i)), cc);  // topo quebrado
    } else if (o.kind === 'fire') {
      seg([x - s * .45, y - 1], [x + s * .45, y - 2], 2, P.woodDk); seg([x - s * .4, y - 2], [x + s * .4, y - 1], 2, P.wood);
      const h = Math.round(s * (.6 + .3 * o.k)), hw = s * .28;
      for (let r = 0; r < h; r++) { const u = r / h, w = Math.round(hw * (1 - u) ** .7), jx = Math.round(Math.sin(r * 1.3 + o.k * 6)); rect(x - w + jx, y - 3 - r, 2 * w + 1, 1, P.duskLow); if (w > 1) rect(x - w + 1 + jx, y - 3 - r, 2 * w - 1, 1, u > .55 ? P.duskLow : P.wing); if (w > 2 && u < .4) rect(x - w + 2 + jx, y - 3 - r, 2 * w - 3, 1, P.flame); }
      if (o.k > .6) px(x + Math.round(3 * Math.sin(o.k * 9)), y - 4 - h, P.wing);
    } else if (o.kind === 'rock') {
      const [rc, rh] = lit() ? [P.stoneDk, P.stone] : [P.ink, col('far')];
      disc(x, y, s * 1.1, dy => dy <= 0 ? (dy < -s * .55 ? rh : rc) : null); rect(x - s * 1.1, y - 1, 2 * s * 1.1, 1, dk);
    }
  }

  // ---------- interior e mapa ----------
  function interior(V, I) {
    const fy = Math.round(V.y(I.floorY));
    rect(0, 0, GW, fy, col('far'));
    for (let x = Math.round(V.x(0)) % 10; x < GW; x += 10) rect(x, 0, 1, fy, col('mid'));  // tábuas da parede
    rect(0, fy, GW, GH - fy, col('ground')); for (let y = fy, d = 2; y < GH; y += d, d++) rect(0, y, GW, 1, P.woodDk);
  }
  function windowFrame(V, wn) {
    const x = Math.round(V.x(wn.x)), y = Math.round(V.y(wn.y)), w = Math.round(wn.w * V.k), h = Math.round(wn.h * V.k);
    rect(x - 2, y - 2, w + 4, 2, P.woodDk); rect(x - 2, y + h, w + 4, 2, P.wood); rect(x - 2, y, 2, h, P.woodDk); rect(x + w, y, 2, h, P.woodDk);
    rect(x + (w >> 1), y, 1, h, P.woodDk); rect(x, y + (h >> 1), w, 1, P.woodDk);
  }
  function iprop(V, o) {
    const x = Math.round(V.x(o.x)), y = Math.round(V.y(o.y)), s = o.s * V.k, w = (o.w || 0) * V.k;
    if (o.kind === 'table') { rect(x - w / 2, y - s, w, 2, P.wood); rect(x - w / 2, y - s, w, 1, P.sandDk); for (const d of [-.42, .42]) rect(x + d * w - 1, y - s + 2, 2, s - 2, P.wood); }  // perna clara: woodDk some na parede escura
    else if (o.kind === 'shelf') {
      rect(x - w / 2, y, w, 2, P.wood); const books = [P.shadow, P.sea, P.foliage, P.sandDk, P.wingAccent];
      for (let bx = x - w / 2 + 1, i = 0; bx < x + w / 2 - 2; i++) { const bw = 1 + Math.round(hash(i * 3.1) * 2), bh = 4 + Math.round(hash(i * 5.7) * 3); rect(bx, y - bh, bw, bh, books[i % books.length]); bx += bw + (hash(i * 9.3) < .2 ? 2 : 0); }
    } else if (o.kind === 'candle') {
      rect(x - 1, y - s, 3, s, P.cloud); rect(x + 1, y - s, 1, s, P.snowShade);
      const h = Math.max(2, Math.round(o.flame.h * V.k)), fx = x + Math.round(o.flame.flick - .5);
      rect(fx, y - s - h, 1, h, P.wing); px(fx, y - s - 1, P.duskLow); px(fx, y - s - h, P.flame); if (h > 3) px(fx, y - s - h + 1, P.flame);
    } else if (o.kind === 'book') { rect(x - s / 2, y - 2, s, 2, P.shadow); rect(x - s / 2 + 1, y - 2, s - 2, 1, P.cloud); }
    else if (o.kind === 'scroll') { rect(x - s / 2, y - 2, s, 2, P.sand); rect(x - s / 2, y - 3, 1, 3, P.sandDk); rect(x + s / 2 - 1, y - 3, 1, 3, P.sandDk); }
    else if (o.kind === 'chair') { rect(x - .3 * s, y - s, .6 * s, 1, P.sandDk); for (const d of [-.3, .3]) rect(x + d * s - 1, y - s + 1, 2, s - 1, P.wood); rect(x - o.dir * .3 * s - 1, y - 2.4 * s, 2, 1.4 * s, P.wood); }
  }
  function map(V, M) {
    rect(0, 0, GW, GH, P.woodDk);
    const x = Math.round(V.x(M.paper.x)), y = Math.round(V.y(M.paper.y)), w = Math.round(M.paper.w * V.k), h = Math.round(M.paper.h * V.k);
    rect(x + 2, y + 2, w, h, P.black); rect(x - 1, y - 1, w + 2, h + 2, P.sandDk);
    for (let gy = y; gy < y + h; gy++) dither(gy, x, x + w, P.cloud, P.snowShade, .22);  // mar no papel
    for (const co of M.coasts) { const pts = co.map(V.p); poly(pts, P.sand); pts.forEach((a, i) => seg(a, pts[(i + 1) % pts.length], 1, P.wood, 0)); }
    if (M.route) {
      const pts = M.route.pts.map(V.p), d = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])); let left = M.route.k * d.reduce((a, b) => a + b, 0), s = 0;
      for (let i = 0; i < d.length && left > 0; left -= d[i], i++) for (let u = 0; u <= Math.min(d[i], left); u++, s++) if (s % 3 < 2) rect(Math.round(lerp(pts[i][0], pts[i + 1][0], u / d[i])) - 1, Math.round(lerp(pts[i][1], pts[i + 1][1], u / d[i])) - 1, 2, 2, P.wingAccent);
    }
    for (const m of M.marks) { const mx = Math.round(V.x(m.x)), my = Math.round(V.y(m.y)); rect(mx - 2, my - 2, 5, 5, P.ink); rect(mx - 1, my - 1, 3, 3, P.shadow); }
  }

  // ---------- bonecos ----------
  // Peças do boneco em ordem de desenho (o lado longe da câmera antes do corpo, o perto depois), w em px da grade.
  const TORSO = { adult: 5, child: 4, elder: 5, heavy: 6, thin: 4 };  // largura em px da grade a z = 1; a silhueta lê na dublagem e no quadro de 30 px do story
  function pieces(a, z) {
    const P0 = a.pose, far = P0.facing > 0 ? 'R' : 'L', near = far === 'R' ? 'L' : 'R', lw = Math.max(3, Math.round((P0.body === 'heavy' ? 4 : 3) * z)), tw = Math.round(TORSO[P0.body] * z);
    const leg = s => [['thigh' + s, 'hip' + s, 'knee' + s, lw, 'pants'], ['shin' + s, 'knee' + s, 'ankle' + s, lw, 'pants'], ['foot' + s, 'ankle' + s, 'toe' + s, lw, 'shoe']];
    const arm = s => [['upperArm' + s, 'shoulder' + s, 'elbow' + s, lw, 'shirt'], ['forearm' + s, 'elbow' + s, 'wrist' + s, lw, 'shirt'], ['hand' + s, 'wrist' + s, 'hand' + s, lw, 'skin']];
    return [arm(far), leg(far), [['spine', 'pelvis', 'chest', tw, 'shirt'], ['upperSpine', 'chest', 'neck', tw, 'shirt']], leg(near), arm(near)];
  }
  function headBox(a, V) {
    const J = a.pose.joints, hh = Math.max(4, Math.round(Math.hypot(J.headTop[0] - J.headBase[0], J.headTop[1] - J.headBase[1]) * V.k) + 3), hw = hh - (a.pose.body === 'thin' ? 2 : 1);
    return { x: Math.round(V.x(J.head[0]) - hw / 2), y: Math.round(V.y(J.head[1]) - hh / 2), w: hw, h: hh };
  }
  // Cores do elenco levadas à paleta aqui (o engine.js quantiza de novo, sem mudança) e o tom de sombra de cada uma
  // (a cor mais próxima da versão escura, mais escura que ela), para o braço e a perna do lado de longe.
  const pal = hex => nearest(hex), dim = q => nearest(mixCol(q, '#000010', .35), x => x !== q && lum(x) < lum(q)) || q;
  function doll(F, a) {
    const V = view(F, a.layer), J = a.pose.joints, ink = P.ink, z = F.cam.z, cc = { skin: P.body, hair: P.woodDk, shirt: P.sea, pants: P.ink, ...(a.colors || {}) };
    const C = { skin: pal(cc.skin), hair: pal(cc.hair), shirt: pal(cc.shirt), pants: pal(cc.pants), shoe: P.black };
    Object.assign(C, { shirtDk: dim(C.shirt), pantsDk: dim(C.pants), skinDk: dim(C.skin) });
    const g = n => V.p(J[n]), fc = a.pose.facing, gear = a.gear || [], groups = pieces(a, z), hb = headBox(a, V), back = fc > 0 ? hb.x : hb.x + hb.w - 1;
    const ch = g('chest'), pw = Math.max(2, Math.round(3 * z)), ph = Math.round(7 * z), bx = Math.round(ch[0] - fc * (groups[2][0][3] / 2 + pw / 2 + .5)) - (pw >> 1), hat = gear.includes('hat');
    const draw = (list, out, dk) => { for (const [name, j0, j1, w, part] of list) seg(g(j0), g(j1), w + (out ? 2 : 0), out ? ink : C[part + (dk && part !== 'shoe' ? 'Dk' : '')], name.startsWith('foot') ? -w - (out ? 1 : 0) : undefined); };
    // Contorno de 1 px da silhueta inteira primeiro; depois o recheio do longe para o perto (por dentro, só o braço de perto).
    groups.forEach(list => draw(list, true));
    rect(hb.x - 1, hb.y - 1, hb.w + 2, hb.h + 2, ink);
    if (gear.includes('backpack')) rect(bx - 1, ch[1] - 1, pw + 2, ph + 2, ink);
    if (hat) { rect(hb.x - 3, hb.y - 2, hb.w + 6, 3, ink); rect(hb.x - 1, hb.y - 4, hb.w + 2, 3, ink); }
    draw(groups[0], false, true); draw(groups[1], false, true);
    if (gear.includes('backpack')) { rect(bx, ch[1], pw, ph, P.wood); rect(bx, ch[1] + ph - 1, pw, 1, P.woodDk); }
    draw(groups[3], false); draw(groups[2], false);  // perna de perto antes do tronco: a camisa cobre o alto da coxa
    // Cabeça em bloco, cabelo em cima e atrás, olho de 1 px do lado para onde olha (fecha quando pisca).
    draw(groups[4], true);  // contorno do braço de perto antes da cabeça: braço erguido não corta o rosto
    rect(hb.x, hb.y, hb.w, hb.h, C.skin);
    const hood = gear.includes('hood'), helmet = gear.includes('helmet'), hairC = hood ? C.shirt : helmet ? P.stone : C.hair;
    rect(hb.x, hb.y, hb.w, helmet ? 3 : 2, hairC); rect(back, hb.y, 1, hood ? hb.h : Math.round(hb.h * .7), hairC);
    if (hood) rect(hb.x - 1, hb.y - 1, hb.w + 2, 1, C.shirt);
    if (helmet) rect(hb.x, hb.y + 2, hb.w, 1, P.stoneDk);
    if (a.pose.face.blink < .5) px(fc > 0 ? hb.x + hb.w - 2 : hb.x + 1, hb.y + Math.round(hb.h * .5), ink);
    if (hat) { rect(hb.x - 2, hb.y - 1, hb.w + 4, 1, P.woodDk); rect(hb.x, hb.y - 3, hb.w, 2, P.sandDk); }
    draw(groups[4], false);  // braço de perto por cima, com o contorno próprio (lê sobre o tronco)
    if (a.holds === 'book') { const [x, y] = [(g('handL')[0] + g('handR')[0]) / 2, (g('handL')[1] + g('handR')[1]) / 2]; rect(x - 3, y - 3, 6, 4, ink); rect(x - 2, y - 2, 4, 2, P.shadow); rect(x - 2, y - 2, 4, 1, P.cloud); }
  }

  function drawK(F) {
    K = F.world.kit; R = STYLE.moods[K.mood]; F0 = F; clip = null;
    const V0 = view(F, 0), V1 = view(F, 1), I = K.interior, win = I && I.window;
    if (K.map) map(V1, K.map);
    else if (I) {
      // Interior: parede e chão; a janela mostra o céu da hora (lua = noite) pela câmera de f = 1, recortado por ela.
      interior(V1, I);
      const x0 = Math.round(V1.x(win.x)), y0 = Math.round(V1.y(win.y)), x1 = Math.round(V1.x(win.x + win.w)), y1 = Math.round(V1.y(win.y + win.h));
      const room = R; R = STYLE.moods[K.time]; clip = { x0, y0, x1, y1 };
      drawSky(F, V1, { x0, y0, x1, y1, y0w: win.y - win.h * .2, h0: win.h * 1.2 }); clip = null; R = room;
      windowFrame(V1, win);
      for (const o of I.props) iprop(V1, o);
    } else drawSky(F, V0, { x0: 0, y0: 0, x1: GW, y1: GH, y0w: 0, h0: 780 });
    // Névoa em profundidade: antes das camadas de f ≥ .3 e ≥ .5 (só .5 na neblina baixa), tudo o que já está no quadro dá
    // um degrau inteiro da rampa de luz (sem pontilhado: o longe clareia em blocos, o perto fica nítido).
    const Wt = K.weather;
    const fogAt = !Wt.fog || win ? [] : Wt.kind === 'fog' ? [.3, .5] : [.5];
    let i = 0; const depth = K.layers.filter(l => l.kind === 'ridge' || l.kind === 'treeline').length, step = () => ['far', 'mid', 'near'][Math.min(2, Math.round(i++ * 2 / Math.max(1, depth - 1)))];
    for (const l of K.layers) {
      while (fogAt.length && l.f >= fogAt[0]) { fogAt.shift(); shiftPass(LIFT, () => 1); }
      const V = view(F, l.f);
      if (l.kind === 'ridge') profile(V, l.prof, col(step()));
      else if (l.kind === 'treeline') { const c0 = col(step()); for (const t of l.trees) tree(V, t, c0); }
      else if (l.kind === 'dunes') { const far = l.f < .5, base = lit() ? (far ? P.light : P.sandDk) : col(far ? 'far' : 'mid'), top = profile(V, l.prof, base); for (let gx = 0; gx < GW; gx++) if (top[gx + 2] > top[gx] + 1 || top[gx + 1] > top[gx]) for (let r = 0; r < 5; r++) if (bay(gx, top[gx] + r) < .5 - r * .1) px(gx, top[gx] + r, lit() ? P.sandDk : col('near')); }
      else if (l.kind === 'buildings') for (const b of l.items) building(V, b);
      else if (l.kind === 'sea') sea(V, l);
      else if (l.kind === 'ground') ground(V, l);
      else if (l.kind === 'props') for (const o of l.items) prop(V, o);
    }
    const A = { night: 2, interior: 1.5, dusk: 1.6, dawn: 1.1, day: .7 }[K.mood];
    // Raio de luz até 40 px da grade: a poça da fogueira ou da vela não sobe pelas copas nem quebra as silhuetas.
    lightPass(K.lights.map(l => { const V = view(F, l.f); return { x: V.x(l.x), y: V.y(l.y), r: Math.min(40, l.r * V.k), a: A * l.k }; }));
    for (const l of K.lights) if (l.r <= 12 && l.k > .3) px(view(F, l.f).x(l.x), view(F, l.f).y(l.y), l.k > .7 ? P.flame : P.wing);  // vaga-lumes
    for (const a of F.actors) if (!a.hidden && a.pose.joints) doll(F, a);
    // Clima por cima de tudo (no interior, só na janela, onde a névoa clareia um degrau): chuva em traço, neve em px.
    const box = win && { x0: Math.round(V1.x(win.x)), y0: Math.round(V1.y(win.y)), x1: Math.round(V1.x(win.x + win.w)), y1: Math.round(V1.y(win.y + win.h)) };
    if (Wt.fog && win) shiftPass(LIFT, () => 1, box.x0, box.y0, box.x1, box.y1);
    clip = box || null;
    for (const d of Wt.drops) { const x = V1.x(d.x), y = V1.y(d.y); if (Wt.kind === 'rain') rect(x, y - 3, 1, d.k > .7 ? 4 : 3, P.snowShade); else rect(x, y, d.k > .85 ? 2 : 1, d.k > .85 ? 2 : 1, d.k > .6 ? P.snow : P.snowShade); }
    clip = null;
  }

  window.ExpStyle = {
    draw(F) { if (F.scene !== 'K') throw new Error(`O pixel só desenha a cena K (kit de episódio), não ${F.scene}`); drawK(F); },
    // O que draw desenha de cada boneco (contrato em check-motion.mjs), em px do mundo: traços em blocos (butt) e a cabeça.
    parts(a, F) {
      const J = a.pose.joints, z = F.cam.z; if (!J) return [];
      const out = pieces(a, z).flat().map(([name, from, to, w]) => ({ actor: a.id, name, from, to, pts: [J[from], J[to]], r: w * S / z / 2, cap: 'butt' }));
      return [...out, { actor: a.id, name: 'head', from: 'headBase', to: null, pts: [J.headBase, J.headTop], r: headBox(a, view(F, a.layer)).w * S / z / 2, cap: 'round' }];
    },
  };
})();
