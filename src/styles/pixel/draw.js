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
  // Linha de pontilhado: a ou b por px conforme o limiar Bayer (k = fração de b), em trechos contínuos; ox prende o padrão ao mundo.
  function dither(y, x0, x1, a, b, k, ox = 0) {
    let run = x0, cur = null;
    for (let x = x0; x <= x1; x++) { const q = x < x1 ? (bay(x - ox, y) < k ? b : a) : null; if (q !== cur) { if (cur) rect(run, y, x - run, 1, cur); cur = q; run = x; } }
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
  // Nuvem: base do vão dos três tufos com pontas redondas (os tufos ficam dentro). top = topo da base; need = o topo
  // mínimo para os tufos caberem no quadro.
  function cloudShape(V, o) {
    const x = V.x(o.x), w = o.w * V.k, h = o.h * V.k, bh = h * .4, xs = x - w * .2, xe = x + w * .2;
    const lumps = [0, 1, 2].map(i => ({ x: xs + w * .2 * i, r: h * (.3 + .12 * hash(o.seed + i + 7)), up: h * (.1 + .15 * hash(o.seed + i)) }));  // r > metade do vão: tufos se tocam
    return { xs, xe, bh, lumps, seed: o.seed, top: V.y(o.y) - h * .1, need: 2 + Math.max(...lumps.map(l => l.up + l.r)) };
  }
  // Por linha, o vão da base e dos tufos com as pontas em degraus de 2 px e serrilhadas ±1 px por hash estável (sem disco
  // perfeito); 1 px de luz no topo de cada coluna, 1 de sombra (cloudDk) no pé dela e 1 de pontilhado acima. A luz é a cor de cima da rampa.
  function cloud(q, top) {
    const by = top + q.bh / 2, yb = Math.round(top + q.bh), ya = Math.round(Math.min(...q.lumps.map(l => top - l.up - l.r))), rows = {};
    for (let y = ya; y < yb; y++) {
      const yc = y + .5, hw = (cy, r) => Math.abs(yc - cy) < r ? Math.sqrt(r * r - (yc - cy) ** 2) : -1;
      let l = Infinity, r = -Infinity; const b = hw(by, q.bh / 2);
      if (b >= 0) { l = q.xs - b; r = q.xe + b; }
      for (const u of q.lumps) { const d = hw(top - u.up, u.r); if (d >= 0) { l = Math.min(l, u.x - d); r = Math.max(r, u.x + d); } }
      if (l > r) continue;
      const j = hash(q.seed * 13.1 + y * .71), x0 = Math.round(q.xs);  // degraus presos à nuvem: a forma não muda quando ela balança
      rows[y] = [x0 + 2 * Math.round((l - q.xs) / 2) - (j < .3 ? 1 : 0), x0 + 2 * Math.round((r - q.xs) / 2) + (j > .7 ? 1 : 0)];
    }
    const base = col('cloud'), dk = col('cloudDk'), hi = P[UP[R.cloud]] || base, inside = (x, y) => rows[y] && x >= rows[y][0] && x < rows[y][1];
    for (const y in rows) {
      const gy = +y, [l, r] = rows[y]; let run = l, cur = null;
      for (let x = l; x <= r; x++) { const q = x < r ? (!inside(x, gy + 1) ? dk : !inside(x, gy - 1) ? hi : !inside(x, gy + 2) && bay(x - l, gy) < .5 ? dk : base) : null; if (q !== cur) { if (cur) rect(run, gy, x - run, 1, cur); cur = q; run = x; } }
    }
  }
  // As nuvens descem juntas o necessário para nenhuma sair pelo topo: a disposição do kit se mantém, sem empilhar as altas numa faixa.
  function clouds(V, list) {
    const qs = list.map(o => cloudShape(V, o)), dy = Math.max(0, ...qs.map(q => q.need - q.top));
    for (const q of qs) cloud(q, q.top + dy);
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
    // Faixas de tom: a cor do chão em cima, pontilhado de 25 e 50% e o escuro embaixo (padrão preso ao mundo).
    const y0 = Math.min(...top), b1 = Math.max(Math.max(...top) + 2, y0 + Math.round((GH - y0) * .4)), b2 = y0 + Math.round((GH - y0) * .75);
    for (let gy = b1; gy < GH; gy++) dither(gy, 0, GW, base, dark, gy < b1 + 2 ? .25 : gy < b2 ? .5 : gy < b2 + 2 ? .75 : 1, ox);
    // Caminho de terra quando alguém anda: 3 a 4 linhas sob a linha dos pés, borda de baixo serrilhada.
    const path = l.surface === 'grass' && F0.actors.some(a => a.role === 'walk') && (lit() ? [P.sandDk, P.wood] : K.mood === 'dusk' ? [P.woodDk, P.duskNear] : [P.nightFar, P.nightMid]);
    if (path) for (let gx = 0; gx < GW; gx++) { const d = 3 + (hash((gx - ox) * 5.3 + K.seed) < .35 ? 1 : 0); rect(gx, top[gx] + 1, 1, d, path[0]); if (hash((gx - ox) * 9.1 + K.seed) < .12) px(gx, top[gx] + 1 + (gx & 1) + 1, path[1]); }
    // Pontilhado estático: pares de px escuros, pedrinhas de 2 px, tufos em v (claros na faixa escura) e alguns px claros.
    const peb = lit() ? P.stone : col('far');
    for (let gx = 0; gx < GW; gx++) for (let gy = top[gx] + (path ? 6 : 2); gy < GH; gy++) {
      const h = hash((gx - ox) * 7.13 + gy * 131.7 + K.seed * 17.3), deep = gy >= b2;
      if (h < .02) { px(gx, gy, deep ? base : dark); if (h < .008) px(gx + 1, gy, deep ? base : dark); }
      else if (h < .028 && l.surface !== 'snow') { const q = deep ? base : dark; px(gx, gy, q); px(gx - 1, gy - 1, q); px(gx + 1, gy - 1, q); }
      else if (h > .997 && gy < b1) rect(gx, gy, 2, 1, peb);  // pedrinhas e px claros só na faixa de cima: o pontilhado e o escuro ficam calmos
      else if (h > .994 && gy < b1 && lit()) px(gx, gy, P.light);
    }
    if (l.surface === 'grass') for (let gx = 0; gx < GW; gx++) if (hash((gx - ox) * 3.7 + K.seed) < .22) px(gx, top[gx] - 1, dark);  // tufos da borda
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
  const woods = () => K.mood === 'night' ? [P.woodDk, P.black] : [P.wood, P.woodDk];  // madeira do primeiro plano
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
    } else if (o.kind === 'fence') {  // mourões de 2 px a cada 60 px do mundo, duas travessas com sombra embaixo
      const [wc, wd] = woods(), x0 = Math.round(V.x(o.x0)), x1 = Math.round(V.x(o.x1)), h = Math.max(4, Math.round(o.h * V.k));
      for (const k of [.35, .75]) { const ry = y - Math.round(k * h); rect(x0, ry, x1 - x0, 1, wc); rect(x0, ry + 1, x1 - x0, 1, wd); }
      for (let wx = o.x0; wx <= o.x1 + 1e-6; wx += 60) { const p0 = Math.round(V.x(wx)) - 1; rect(p0, y - h, 2, h, wc); rect(p0 + 1, y - h + 1, 1, h - 1, wd); }
    } else if (o.kind === 'bush') {  // tufos em disco com a calota de cima clara, do mais baixo ao mais alto; sombra de 1 px no pé
      const [base, hi, dk] = lit() ? [P.foliage, P.ground, P.ink] : [col('near'), col('far'), P.black];  // far: a calota não some no morro do meio atrás
      // 5 tufos de alturas pela semente sobre uma base cheia (sem vão embaixo entre os tufos de fora).
      const L = [0, 1, 2, 3, 4].map(i => { const r = s * (.26 + .1 * hash(o.seed * 3 + i)); return { x: x + (i - 2) * s * .27 + (hash(o.seed * 5 + i) - .5) * 2, r, y: y - r - (i % 4 ? s * (.12 + .25 * hash(o.seed * 7 + i)) : 0) }; });
      rect(x - s * .6, y - s * .45, s * 1.2, s * .45, base);
      L.sort((a, b) => b.y - a.y).forEach(l => disc(l.x, l.y, l.r, dy => dy < -l.r * .55 ? hi : base));
      rect(x - s * .7, y - 1, s * 1.4, 1, dk);
    } else if (o.kind === 'post') {  // poste de 2 px e lanterna 4 × 6 com telhado; o vidro acende ao entardecer e à noite
      const h = Math.round(o.h * V.k), pc = lit() ? P.ink : P.black, on = K.time === 'dusk' || K.time === 'night', yl = y - h;
      rect(x - 1, yl, 2, h, pc); rect(x - 2, y - 1, 4, 1, pc);
      rect(x - 2, yl - 5, 4, 5, pc); rect(x - 1, yl - 4, 2, 3, on ? P.flame : P.snowShade); if (on) rect(x - 1, yl - 2, 2, 1, P.wing);
      rect(x - 3, yl - 6, 6, 1, pc); rect(x - 1, yl - 7, 2, 1, pc);
    } else if (o.kind === 'cart') {  // caixa de tábuas, varal e duas rodas com raios
      const [wc, wd] = woods(), rim = lit() ? P.sandDk : P.wood, bx = Math.round(x - s), bw = Math.round(1.5 * s), by = Math.round(y - .95 * s), bh = Math.round(.45 * s);
      seg([x + .5 * s, y - .8 * s], [x + s, y - .5 * s], 1, wd, 0);
      rect(bx, by, bw, bh, wc); rect(bx, by, bw, 1, rim); for (let r = 2; r < bh - 1; r += 2) rect(bx, by + r, bw, 1, wd); rect(bx, by + bh - 1, bw, 1, wd);
      for (const d of [-.6, .1]) { const cx = Math.round(x + d * s), cy = Math.round(y - .3 * s), r = .3 * s; disc(cx, cy, r, wd); disc(cx, cy, r - 1.2, wc); rect(cx - r + 1, cy, 2 * r - 1, 1, wd); rect(cx, cy - r + 1, 1, 2 * r - 1, wd); }
    } else if (o.kind === 'boat') {  // casco em linhas (borda clara, tábuas a cada 3) e sombra na areia
      const L = o.s * V.k, hh = Math.max(3, Math.round(.3 * L)), [wc, wd] = woods(), rim = lit() ? P.sandDk : P.wood;
      for (let r = 0; r < hh; r++) { const hw = Math.round(lerp(L / 2, .35 * L, r / hh)); rect(x - hw, y - hh + r, 2 * hw, 1, r === 0 ? rim : r % 3 === 2 ? wd : wc); }
      rect(x - .4 * L, y, .8 * L, 1, lit() ? P.sandDk : col('near'));
    } else if (o.kind === 'tuft') {  // três folhas de alturas diferentes; flor de 1 px em parte deles no capim
      const h = Math.max(1, Math.round(o.s * V.k)), surf = (K.layers.find(l => l.kind === 'ground') || {}).surface, fl = hash(o.seed * 7.7) > .7 && surf === 'grass' && K.mood !== 'night';
      const c0 = surf === 'sand' ? (lit() ? P.wood : P.woodDk) : surf === 'snow' ? P.snowShade : lit() ? P.foliage : K.mood === 'night' ? P.dawnGround : col('near'), sd = hash(o.seed * 3.3) < .5 ? 1 : -1;
      rect(x, y - h, 1, h, c0); if (h > 1) rect(x - sd, y - h + 1, 1, h - 1, c0); if (h > 2) rect(x + sd, y - h + 2, 1, h - 2, c0);
      if (surf === 'snow') px(x, y - h, P.snow);
      if (fl) px(x, y - h - 1, [P.wingAccent, P.wing, P.cloud][Math.floor(hash(o.seed * 9.1) * 3)]);
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
    // Mesa de tábuas; pergaminho creme com borda gasta (pontilhado de areia nas 2 px de fora) e moldura dupla; mar azul
    // claro pontilhado dentro dela, espuma de 1 px em volta das terras.
    rect(0, 0, GW, GH, P.woodDk); for (let gy = 8; gy < GH; gy += 9) rect(0, gy, GW, 1, P.black);
    const x = Math.round(V.x(M.paper.x)), y = Math.round(V.y(M.paper.y)), w = Math.round(M.paper.w * V.k), h = Math.round(M.paper.h * V.k);
    rect(x + 2, y + 2, w, h, P.black); rect(x - 1, y - 1, w + 2, h + 2, P.sandDk); rect(x, y, w, h, P.cloud);
    for (let gy = y; gy < y + h; gy++) { const e = gy - y < 2 || y + h - gy <= 2; dither(gy, x, x + w, P.cloud, P.sand, e ? .5 : 0); if (!e) { dither(gy, x, x + 2, P.cloud, P.sand, .5); dither(gy, x + w - 2, x + w, P.cloud, P.sand, .5); } }
    const frame = (i, color) => { rect(x + i, y + i, w - 2 * i, 1, color); rect(x + i, y + h - 1 - i, w - 2 * i, 1, color); rect(x + i, y + i, 1, h - 2 * i, color); rect(x + w - 1 - i, y + i, 1, h - 2 * i, color); };
    if (M.border) { frame(3, P.wood); frame(5, P.wood); }
    const m = M.border ? 6 : 2;
    for (let gy = y + m; gy < y + h - m; gy++) dither(gy, x + m, x + w - m, P.sky, P.cloud, .25);  // mar no papel
    for (const co of M.coasts) { const pts = co.map(V.p); pts.forEach((a, i) => seg(a, pts[(i + 1) % pts.length], 3, P.cloud)); }
    for (const co of M.coasts) { const pts = co.map(V.p); poly(pts, P.sand); pts.forEach((a, i) => seg(a, pts[(i + 1) % pts.length], 1, P.wood, 0)); }
    for (const o of M.waves || []) { const wx = Math.round(V.x(o.x)), wy = Math.round(V.y(o.y)); [[-2, 0], [-1, -1], [0, 0], [1, -1], [2, 0]].forEach(([dx, dy]) => px(wx + dx, wy + dy, P.dayTop)); }
    for (const o of M.peaks || []) {  // monte: face clara à esquerda, escura à direita, neve no topo, contorno
      const ax = V.x(o.x), ay = V.y(o.y), s = o.s * V.k, top = [ax, ay - s];
      poly([[ax - .6 * s, ay], top, [ax, ay]], P.sandDk); poly([top, [ax + .6 * s, ay], [ax, ay]], P.wood); poly([[ax - .2 * s, ay - .67 * s], top, [ax + .2 * s, ay - .67 * s]], P.cloud);
      seg([ax - .6 * s, ay], top, 1, P.woodDk, 0); seg(top, [ax + .6 * s, ay], 1, P.woodDk, 0);
    }
    for (const o of M.woods || []) {  // árvore: copa redonda com luz em cima à esquerda, tronco de 1 px
      const ax = Math.round(V.x(o.x)), ay = Math.round(V.y(o.y)), s = o.s * V.k, r = Math.max(2, .35 * s);
      rect(ax, ay - Math.round(.3 * s), 1, Math.round(.3 * s), P.woodDk); disc(ax, ay - .6 * s, r + 1, P.ink); disc(ax, ay - .6 * s, r, P.foliage); disc(ax - r * .35, ay - .6 * s - r * .35, r * .4, P.ground);
    }
    if (M.compass) {  // rosa dos ventos: anel, pontas leste/oeste em madeira, norte vermelho (metade clara), sul em tinta, N em cima
      const cx = Math.round(V.x(M.compass.x)), cy = Math.round(V.y(M.compass.y)), r = Math.max(5, Math.round(M.compass.r * V.k));
      disc(cx, cy, r, P.wood); disc(cx, cy, r - 1, P.cloud);
      poly([[cx - r + 1, cy + .5], [cx + .5, cy - 1], [cx + .5, cy + 2]], P.wood); poly([[cx + r, cy + .5], [cx + .5, cy - 1], [cx + .5, cy + 2]], P.woodDk);
      poly([[cx + .5, cy - r - 1], [cx - 1.5, cy + .5], [cx + .5, cy + .5]], P.wingAccent); poly([[cx + .5, cy - r - 1], [cx + .5, cy + .5], [cx + 2.5, cy + .5]], P.shadow);
      poly([[cx + .5, cy + r + 2], [cx - 1.5, cy + .5], [cx + .5, cy + .5]], P.stoneDk); poly([[cx + .5, cy + r + 2], [cx + .5, cy + .5], [cx + 2.5, cy + .5]], P.ink);
      ['X..X', 'XX.X', 'X.XX', 'X..X'].forEach((row, j) => [...row].forEach((ch, i) => ch === 'X' && px(cx - 1 + i, cy - r - 7 + j, P.ink)));
    }
    if (M.route) {
      const pts = M.route.pts.map(V.p), d = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])); let left = M.route.k * d.reduce((a, b) => a + b, 0), s = 0;
      for (let i = 0; i < d.length && left > 0; left -= d[i], i++) for (let u = 0; u <= Math.min(d[i], left); u++, s++) if (s % 3 < 2) rect(Math.round(lerp(pts[i][0], pts[i + 1][0], u / d[i])) - 1, Math.round(lerp(pts[i][1], pts[i + 1][1], u / d[i])) - 1, 2, 2, P.wingAccent);
    }
    for (const m of M.marks) { const mx = Math.round(V.x(m.x)), my = Math.round(V.y(m.y)); rect(mx - 2, my - 2, 5, 5, P.ink); rect(mx - 1, my - 1, 3, 3, P.shadow); }
  }

  // ---------- bonecos ----------
  // Peças do boneco em ordem de desenho (o lado longe da câmera antes do corpo, o perto depois), w em px da grade.
  const TORSO = { adult: 7, child: 6, elder: 7, heavy: 8, thin: 6 };  // largura em px da grade a z = 1 (1 px a mais de cada lado que na fase 5: tronco largo como o do story)
  const HS = STYLE.character.headScale || 1;
  function pieces(a, z) {
    const P0 = a.pose, far = P0.facing > 0 ? 'R' : 'L', near = far === 'R' ? 'L' : 'R', lw = Math.max(3, Math.round((P0.body === 'heavy' ? 4 : 3) * z)), tw = Math.round(TORSO[P0.body] * z);
    const leg = s => [['thigh' + s, 'hip' + s, 'knee' + s, lw, 'pants'], ['shin' + s, 'knee' + s, 'ankle' + s, lw, 'pants'], ['foot' + s, 'ankle' + s, 'toe' + s, lw, 'shoe']];
    const arm = s => [['upperArm' + s, 'shoulder' + s, 'elbow' + s, lw, 'shirt'], ['forearm' + s, 'elbow' + s, 'wrist' + s, lw, 'shirt'], ['hand' + s, 'wrist' + s, 'hand' + s, lw, 'skin']];
    return [arm(far), leg(far), [['spine', 'pelvis', 'chest', tw, 'shirt'], ['upperSpine', 'chest', 'neck', tw, 'shirt']], leg(near), arm(near)];
  }
  // Cabeça em bloco escalada por headScale e crescendo para cima pelo eixo headBase → headTop: o pé dela fica 1,5 px abaixo
  // de headBase como na escala 1, e o pescoço continua ligado. top = o alto da cabeça em px do mundo (para o check-motion).
  function headBox(a, V) {
    const J = a.pose.joints, b = V.p(J.headBase), t = V.p(J.headTop), L = Math.hypot(t[0] - b[0], t[1] - b[1]) || 1, u = [(t[0] - b[0]) / L, (t[1] - b[1]) / L];
    const hh = Math.max(4, Math.round(L * HS + 3)), hw = hh - (a.pose.body === 'thin' ? 2 : 1), k = hh / 2 - 1.5, f = (hh - 1.5) / L;
    // A inclinação desloca só 40% em x (a cabeça grande não sai de cima do pescoço); tilt (+ para baixo, − para cima) vai para o olho.
    return { x: Math.round(b[0] + u[0] * k * .4 - hw / 2), y: Math.round(b[1] + u[1] * k - hh / 2), w: hw, h: hh, tilt: u[0] * a.pose.facing, top: J.headBase.map((v, i) => v + (J.headTop[i] - v) * f) };
  }
  // Mão desenhada no máximo 1 px além do pulso (em px da grade): a mão caída do look-up não vira uma faixa de pele no tronco.
  const short = (W, H) => { const dx = H[0] - W[0], dy = H[1] - W[1], L = Math.hypot(dx, dy); return L > 1 ? [W[0] + dx / L, W[1] + dy / L] : H; };
  // Braço de perto cuja mão cairia dentro da cabeça grande (o point põe o pulso na altura do rosto): o braço inteiro gira no
  // ombro, sem mudar os comprimentos, o menor ângulo (de preferência para baixo, à frente) que tira pulso, mão e dedo 1 px
  // para fora da cabeça, contados o bloco e o contorno. O point ganha um dedo de 1 px na direção da mão. Devolve os pontos
  // desenhados em px da grade (S, E, W, H, D → tip do dedo, rot = girou) ou null.
  function reach(a, V, hb, lw) {
    const J = a.pose.joints, n = a.pose.facing > 0 ? 'L' : 'R', S0 = V.p(J['shoulder' + n]), pt = a.role === 'point', m = lw / 2 + 2;
    const hit = (q, d) => q[0] > hb.x - d && q[0] < hb.x + hb.w + d && q[1] > hb.y - d && q[1] < hb.y + hb.h + d;
    const arm = t => {
      const rot = q => { const dx = q[0] - S0[0], dy = q[1] - S0[1], c = Math.cos(t), s = Math.sin(t); return [S0[0] + dx * c - dy * s, S0[1] + dx * s + dy * c]; };
      const [E, W, H0] = ['elbow', 'wrist', 'hand'].map(k => rot(V.p(J[k + n]))), H = short(W, H0);
      const d = Math.hypot(H[0] - W[0], H[1] - W[1]) > .5 ? [H[0] - W[0], H[1] - W[1]] : [W[0] - E[0], W[1] - E[1]], L = Math.hypot(...d) || 1, u = [d[0] / L, d[1] / L];
      const q = { n, S: S0, E, W, H, rot: t !== 0, ...(pt && { D: [H[0] + u[0] * (lw / 2 + .5), H[1] + u[1] * (lw / 2 + .5)], tip: [H[0] + u[0] * (lw / 2 + 2), H[1] + u[1] * (lw / 2 + 2)] }) };
      q.clear = !hit(W, m) && !hit(H, m) && !(pt && hit(q.tip, 2.5));  // o braço de cima e o cotovelo podem encostar no queixo
      return q;
    };
    const q0 = arm(0);
    if (q0.clear) return pt ? q0 : null;
    for (let k = 1; k <= 24; k++) for (const sg of [a.pose.facing, -a.pose.facing]) { const q = arm(sg * k * .1); if (q.clear) return q; }
    return pt ? q0 : null;
  }
  // Cores do elenco levadas à paleta aqui (o engine.js quantiza de novo, sem mudança) e o tom de sombra de cada uma
  // (a cor mais próxima da versão escura, mais escura que ela), para o braço e a perna do lado de longe.
  const pal = hex => nearest(hex), dim = q => nearest(mixCol(q, '#000010', .35), x => x !== q && lum(x) < lum(q)) || q;
  function doll(F, a) {
    // Contorno em ink; à noite em stoneDk, um tom mais claro que o fundo (ink some nos morros e no chão escuros).
    const V = view(F, a.layer), J = a.pose.joints, ink = K.mood === 'night' ? P.stoneDk : P.ink, z = F.cam.z, cc = { skin: P.body, hair: P.woodDk, shirt: P.sea, pants: P.ink, ...(a.colors || {}) };
    // Cabelo: a cor da paleta mais próxima que fique longe da pele e não seja bem mais saturada que a pedida (cabelo branco
    // vira cinza-azulado, não creme sobre pele clara nem azul-céu).
    const dist = (p, q) => { const [r, g, b] = rgb(p), [x, y, w] = rgb(q); return Math.hypot(r - x, g - y, b - w); }, sat = h => (Math.max(...rgb(h)) - Math.min(...rgb(h))) / 255, skin = pal(cc.skin);
    const C = { skin, hair: nearest(cc.hair, q => dist(q, skin) > 70 && sat(q) - sat(cc.hair) < .15) || pal(cc.hair), shirt: pal(cc.shirt), pants: pal(cc.pants), shoe: P.black };
    Object.assign(C, { shirtDk: dim(C.shirt), pantsDk: dim(C.pants), skinDk: dim(C.skin), hairDk: dim(C.hair) });
    const fc = a.pose.facing, gear = a.gear || [], groups = pieces(a, z), hb = headBox(a, V), back = fc > 0 ? hb.x : hb.x + hb.w - 1, rc = reach(a, V, hb, groups[4][0][3]);
    const O = rc ? { ['elbow' + rc.n]: rc.E, ['wrist' + rc.n]: rc.W, ['hand' + rc.n]: rc.H } : {}, g = n => O[n] || V.p(J[n]);
    for (const s of 'LR') O['hand' + s] = short(g('wrist' + s), g('hand' + s));  // mão curta: o bloco não vira uma faixa de pele no tronco
    const finger = out => rc && rc.D && seg(rc.D, rc.tip, out ? 3 : 1, out ? ink : C.skin, out ? -1.5 : -.5);  // dedo de 1 px (2 de comprido) do point
    const ch = g('chest'), pw = Math.max(2, Math.round(3 * z)), ph = Math.round(7 * z), bx = Math.round(ch[0] - fc * (groups[2][0][3] / 2 + pw / 2 + .5)) - (pw >> 1), hat = gear.includes('hat');
    const draw = (list, out, dk) => { for (const [name, j0, j1, w, part] of list) seg(g(j0), g(j1), w + (out ? 2 : 0), out ? ink : C[part + (dk && part !== 'shoe' ? 'Dk' : '')], name.startsWith('foot') ? -w - (out ? 1 : 0) : undefined); };
    // Contorno de 1 px da silhueta inteira primeiro; depois o recheio do longe para o perto (por dentro, só o braço de perto).
    groups.slice(0, 4).forEach(list => draw(list, true));  // o do braço de perto vem depois do tronco (uma vez só)
    rect(hb.x - 1, hb.y, hb.w + 2, hb.h, ink); rect(hb.x, hb.y - 1, hb.w, hb.h + 2, ink);  // contorno sem os cantos: cabeça menos quadrada
    if (gear.includes('backpack')) rect(bx - 1, ch[1] - 1, pw + 2, ph + 2, ink);
    const up = hb.tilt < -.25, hx = up ? -fc : 0, hy = up ? -1 : 0;  // olhando para cima: o chapéu vai 1 px para trás e para cima
    if (hat) { const cr = hb.h >= 10 ? 3 : 2, d = hb.h >= 10 ? 1 : 0; rect(hb.x - 3 + hx, hb.y - 2 + hy, hb.w + 6, 3, ink); rect(hb.x - 1 + d + hx, hb.y - 2 - cr + hy, hb.w + 2 - 2 * d, cr + 1, ink); }
    draw(groups[0], false, true); draw(groups[1], false, true);
    if (gear.includes('backpack')) { rect(bx, ch[1], pw, ph, P.wood); rect(bx, ch[1] + ph - 1, pw, 1, P.woodDk); }
    draw(groups[3], false); draw(groups[2], false);  // perna de perto antes do tronco: a camisa cobre o alto da coxa
    // Sombra de 1 px no lado do tronco longe da luz (o astro; no interior, ou sem astro, a primeira luz; sem nenhuma, luz à esquerda).
    const src = (!K.interior && K.sky.celestial) || K.lights[0], side = src ? (ch[0] >= view(F, src.f || 0).x(src.x) ? 1 : -1) : 1;
    for (const [, j0, j1, w] of groups[2]) { const [x0, y0] = g(j0), [x1, y1] = g(j1), n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) rect(Math.round(lerp(x0, x1, i / n) - w / 2) + (side > 0 ? w - 1 : 0), Math.round(lerp(y0, y1, i / n) - w / 2), 1, w, C.shirtDk); }
    // Cabeça em bloco, cabelo em cima e atrás (mais grosso na cabeça grande), olho do lado para onde olha (fecha quando pisca).
    // Contorno do braço de perto (e do dedo) sobre o tronco; o braço não entra na cabeça (reach). À noite, no tom escuro da
    // manga: o contorno claro da silhueta, por dentro do corpo, viraria fios de cabelo.
    if (K.mood === 'night') { const sl = groups[4].map(p => [...p]); for (const [name, j0, j1, w, part] of sl) seg(g(j0), g(j1), w + 2, part === 'skin' ? C.skinDk : C.shirtDk); } else draw(groups[4], true);
    finger(true);
    rect(hb.x, hb.y, hb.w, hb.h, C.skin);
    const hood = gear.includes('hood'), helmet = gear.includes('helmet'), hairC = hood ? C.shirt : helmet ? P.stone : C.hair, big = hb.h >= 10, hr = Math.max(2, Math.round(hb.h * .22));
    const bw = big ? 2 : 1, bx0 = fc > 0 ? back : back - bw + 1, bh = hood ? hb.h : Math.round(hb.h * .7);
    rect(hb.x, hb.y, hb.w, helmet ? hr + 1 : hr, hairC); rect(bx0, hb.y, bw, bh, hairC);
    // Cabelo de tom perto da pele: 1 px do tom escuro dele onde encontra o rosto (embaixo da franja e na frente da nuca).
    if (!hood && !helmet && Math.abs(lum(C.hair) - lum(C.skin)) < 50) { const fx = fc > 0 ? bx0 + bw : hb.x; rect(fx, hb.y + hr - 1, hb.w - bw, 1, C.hairDk); rect(fc > 0 ? bx0 + bw - 1 : bx0, hb.y + hr, 1, bh - hr, C.hairDk); }
    if (hood) rect(hb.x - 1, hb.y - 1, hb.w + 2, 1, C.shirt);
    if (helmet) rect(hb.x, hb.y + hr, hb.w, 1, P.stoneDk);
    if (hat) { const cr = big ? 3 : 2; rect(hb.x - 2 + hx, hb.y - 1 + hy, hb.w + 4, 1, P.woodDk); rect(hb.x + (big ? 1 : 0) + hx, hb.y - 1 - cr + hy, hb.w - (big ? 2 : 0), cr, P.sandDk); }
    draw(groups[4], false); finger(false);  // braço de perto por cima, com o contorno próprio (lê sobre o tronco)
    if (a.holds === 'book') { const [x, y] = [(g('handL')[0] + g('handR')[0]) / 2, (g('handL')[1] + g('handR')[1]) / 2]; rect(x - 3, y - 3, 6, 4, ink); rect(x - 2, y - 2, 4, 2, P.shadow); rect(x - 2, y - 2, 4, 1, P.cloud); }
    // Olho em black por último (nada o cobre), sobe quando olha para cima; olhando para cima, a boca abre (1 px na frente, embaixo).
    const ex = fc > 0 ? hb.x + hb.w - (big ? 3 : 2) : hb.x + (big ? 2 : 1);
    if (a.pose.face.blink < .5) rect(ex, Math.max(hb.y + hr, hb.y + Math.round(hb.h * (.5 + .45 * hb.tilt)) - (big ? 1 : 0)), 1, big ? 2 : 1, P.black);
    if (up && big) rect(fc > 0 ? hb.x + hb.w - 2 : hb.x, hb.y + Math.round(hb.h * .7), 2, 1, P.black);
  }

  function drawK(F) {
    K = F.world.kit; R = STYLE.moods[K.mood]; F0 = F; clip = null;
    const V0 = view(F, 0), V1 = view(F, 1), I = K.interior, win = I && I.window;
    if (K.map) map(V1, K.map);
    else if (I) {
      // Interior: parede e chão; a janela mostra o céu da hora (K.time) pela câmera de f = 1, recortado por ela.
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
      // Com reach, o braço desenhado é o girado: o braço de cima sai do ombro com o mesmo comprimento; antebraço e mão (mais o
      // dedo do point) vão como traço do ombro pelos pontos desenhados (to = null: já não estão sobre o osso).
      const V = view(F, a.layer), hb = headBox(a, V), groups = pieces(a, z), rc = reach(a, V, hb, groups[4][0][3]), w = q => [V.wx(q[0]), V.wy(q[1])];
      const out = groups.flat().map(([name, from, to, lw]) => {
        const p = { actor: a.id, name, from, to, pts: [J[from], name.startsWith('hand') ? w(short(V.p(J[from]), V.p(J[to]))) : J[to]], r: lw * S / z / 2, cap: 'butt' };
        if (!rc) return p;
        const sh = 'shoulder' + rc.n, path = [J[sh], w(rc.E), w(rc.W)];
        if (rc.rot && name === 'upperArm' + rc.n) p.pts = [J[sh], w(rc.E)];
        if (rc.rot && name === 'forearm' + rc.n) Object.assign(p, { from: sh, to: null, pts: path });
        if ((rc.rot || rc.tip) && name === 'hand' + rc.n) Object.assign(p, { from: sh, to: null, pts: [...path, w(rc.H), ...(rc.tip ? [w(rc.tip)] : [])] });
        return p;
      });
      return [...out, { actor: a.id, name: 'head', from: 'headBase', to: null, pts: [J.headBase, hb.top], r: hb.w * S / z / 2, cap: 'round' }];
    },
  };
})();
