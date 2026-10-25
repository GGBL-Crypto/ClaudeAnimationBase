// Cartoon TV (exp-tv): o C2 do c01 de sauva-operaria desenhando o quadro F da coreografia comum (exp-estilos.js).
// Camadas paradas desfocadas uma vez (still), as desfocadas que se movem a 1/4 da resolução (lowres), cor por plano em
// soft-light e grão em 4 ladrilhos (finish). Câmera, mundo e atores vêm de F; aqui só o desenho.
(() => {
  const P = STYLE.palette, A = () => NatureArt, c = animationEngine.context;
  const LOOK = { color: P.sauvaHero, dark: mixCol(P.sauvaHero, P.ink, .35) };
  // No subsolo as irmãs clareiam (escuras somem no túnel escuro), sem chegar ao laranja dela.
  const DEEP = { tunnel: { color: mixCol(P.sauva, P.cream, .3) }, garden: { color: mixCol(P.sauva, P.cream, .3) } };
  const EARTH = mixCol(P.wood, P.ground, .2), TRAIL = mixCol(P.wood, P.cream, .7);
  const hand = t => ({ t, k: .6, seed: 5 });
  const LOW = 4, low = document.createElement('canvas'), lowG = low.getContext('2d'); low.width = W / LOW; low.height = H / LOW;
  function lowres(fn) {
    const m = c.getTransform();
    lowG.resetTransform(); lowG.clearRect(0, 0, low.width, low.height);
    lowG.setTransform(m.a / LOW, m.b / LOW, m.c / LOW, m.d / LOW, m.e / LOW, m.f / LOW); Kit.into(lowG, fn);
    c.save(); c.resetTransform(); c.imageSmoothingQuality = 'high'; c.drawImage(low, 0, 0, W, H); c.restore();
  }
  // Camada parada desenhada uma vez no retângulo [x, y, w, h] da camada, a k px por unidade, e desfocada r px no cache;
  // depois é só copiada na transformação atual. draw(x0, x1) desenha no contexto do cache.
  const STILL = new Map();
  function still(name, [x, y, w, h], k, r, draw) {
    const key = name + '|' + k + '|' + r; let cv = STILL.get(key);
    if (!cv) {
      const a = document.createElement('canvas'), g = a.getContext('2d'); a.width = Math.ceil(w * k); a.height = Math.ceil(h * k);
      g.scale(k, k); g.translate(-x, -y); Kit.into(g, () => draw(x, x + w));
      if (r) { cv = document.createElement('canvas'); cv.width = a.width; cv.height = a.height; const b = cv.getContext('2d'); b.filter = `blur(${r}px)`; b.drawImage(a, 0, 0); } else cv = a;
      STILL.set(key, cv);
    }
    c.drawImage(cv, x, y, w, h);
  }
  // Camada de paralaxe f: box = [nome, retângulo] faz dela uma camada parada desfocada; sem box, draw(x0, x1) por quadro.
  function layer(F, f, draw, box) {
    const { cx, cy, z } = F.cam, lx = lerp(960, cx, f);
    Kit.cam(lx, cy, z, 0, hand(F.t));
    if (box) still(box[0], box[1], .5, 2, draw); else draw(lx - W / 2 / z - 200, lx + W / 2 / z + 200);
    Kit.camEnd();
  }
  // Cor por plano (quente na superfície, fria no subsolo: under 0..1) e grão leve, 4 ladrilhos alternados por quadro.
  const GRAIN = [0, 1, 2, 3].map(n => {
    const cv = document.createElement('canvas'), g = cv.getContext('2d'); cv.width = cv.height = 256;
    const id = g.createImageData(256, 256);
    for (let i = 0; i < 65536; i++) { const v = 128 + 120 * (hash(n * 70001 + i * 1.37) - .5); id.data.fill(v, 4 * i, 4 * i + 3); id.data[4 * i + 3] = 255; }
    g.putImageData(id, 0, 0); return c.createPattern(cv, 'repeat');
  });
  function finish(t, under = 0) {
    c.save(); c.resetTransform(); c.globalCompositeOperation = 'soft-light';
    if (under < 1) { c.globalAlpha = .4 * (1 - under); c.fillStyle = '#FFB25C'; c.fillRect(0, 0, W, H); }
    if (under > 0) { c.globalAlpha = .35 * under; c.fillStyle = '#2C4C94'; c.fillRect(0, 0, W, H); }
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = .1; c.fillStyle = GRAIN[Math.round(t * PROJECT.fps) % 4]; c.fillRect(0, 0, W, H);
    c.restore();
  }
  const view = F => [F.cam.cx - W / 2 / F.cam.z - 80, F.cam.cx + W / 2 / F.cam.z + 80];
  // Capim entre x0 e x1 sobre gy; odd = 0/1 desenha só metade (atrás / à frente dos seres).
  function grass(t, x0, x1, gy, step, h0, h1, odd = null, push = [], rad = 60) {
    for (let k = Math.floor(x0 / step); k * step < x1; k++) {
      if (odd !== null && (k & 1) !== odd) continue;
      const x = k * step + .5 * step * hash(k + 3), y = gy(x) + 3;
      A().blade(x, y, h0 + (h1 - h0) * hash(k + 7), bladeBend(t, x, y, push, rad, 3), k & 1 ? P.grass : P.grassDk);
    }
  }
  // Grão de terra que cai do teto de uma câmara de tempos em tempos (vida de fundo).
  function grains(t, x0, x1, top, floor, n, seed) {
    for (let i = 0; i < n; i++) {
      const per = 2.6 + 1.5 * hash(seed + i), u = frac(t / per + hash(seed + i + 9)), x = lerp(x0, x1, hash(seed + i * 3 + Math.floor(t / per + hash(seed + i + 9))));
      if (u < .35) Kit.ellipse(x, lerp(top, floor, u / .35), 4, 4, mixCol(P.wood, P.cream, .25));
    }
  }
  // Capim da frente aberto sob a cabeça da protagonista (não corta o rosto): empurra num raio de .5 BL.
  const front = (t, F, x0, x1) => { const a = F.actors.find(a => a.role === 'hero'), p = a.pose, m = (p.spine[0].x + p.spine.at(-1).x) / 2, hx = m + (p.head.x - m) * (a.flip || 1), g = F.world.front; grass(t, x0, x1, g, 60, 90, 190, null, [[hx, g(hx)]], .5 * p.size); };
  const PATHS = new WeakMap(), pathOf = pts => { let p = PATHS.get(pts); if (!p) PATHS.set(pts, p = makePath(pts)); return p; };

  // Mochila do explorador (gear 'backpack'): bolsa nas costas, entre os membros de lá e o corpo, e a alça por cima da
  // camisa, sob o braço de cá. Presa ao peito e à pelve da pose, inclina com o tronco ao agachar.
  function frameOf(p) {
    const [ch, pe] = p.spine, l = Math.hypot(ch.x - pe.x, ch.y - pe.y) || 1, ux = (ch.x - pe.x) / l, uy = (ch.y - pe.y) / l, f = p.facing;
    return (a, b) => [pe.x + (a * -uy * f + b * ux) * p.size, pe.y + (a * ux * f + b * uy) * p.size];  // a: à frente, b: para cima, em BL
  }
  const inkOf = col => mixCol(col, '#1A0E12', .62);
  const cur = () => { const g = NatureArt.use(c); NatureArt.use(g); return g; };  // contexto atual (Kit.into troca o do NatureArt)
  function blob(pts, col, w) {
    const c = cur(), n = pts.length, m = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    c.beginPath(); c.moveTo(...m(n - 1)); for (let i = 0; i < n; i++) c.quadraticCurveTo(...pts[i], ...m(i)); c.closePath();
    const ys = pts.map(q => q[1]), g = c.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, mixCol(col, P.sun, .4)); g.addColorStop(.5, col); g.addColorStop(1, mixCol(col, P.shade, .35));
    c.lineJoin = 'round'; c.strokeStyle = inkOf(col); c.lineWidth = 2 * w; c.stroke(); c.fillStyle = g; c.fill();
  }
  function pack(p) {
    const q = frameOf(p), w = clamp(p.size * .012, 1.5, STYLE.outline.weight), BAG = mixCol(P.brown, P.olive, .35);
    blob([[-.1, -.02], [-.21, .0], [-.235, .12], [-.22, .26], [-.12, .29], [-.07, .24], [-.07, .03]].map(([a, b]) => q(a, b)), BAG, w);
    blob([[-.08, .29], [-.2, .3], [-.25, .23], [-.22, .17], [-.09, .2]].map(([a, b]) => q(a, b)), mixCol(BAG, P.ink, .25), w);  // aba
    blob([[-.27, .3], [-.27, .35], [-.12, .37], [-.1, .32]].map(([a, b]) => q(a, b)), P.shorts, w);  // saco de dormir enrolado
    Kit.line([q(-.215, .12), q(-.215, .06)], P.gold, 2.4 * w);  // fivela
  }
  function strap(p) {
    const q = frameOf(p), w = clamp(p.size * .012, 1.5, STYLE.outline.weight), pts = [q(-.04, .25), q(.03, .25), q(.08, .15), q(.075, .05)];
    Kit.line(pts, inkOf(P.oliveDk), 4.4 * w); Kit.line(pts, P.oliveDk, 2.6 * w);
  }

  // ---------- Esqueleto desenhado (ExpStyle.parts) ----------
  // Membros, pescoço, pé, mão e cabeça só das juntas da pose (pose.joints), sem deslocamento próprio: macarrão de largura
  // fixa (a do cartoon) com ponta redonda; na junta final (tornozelo, pulso, ponta da pata) o eixo para r antes, então a
  // ponta chega na junta sem passar, e a bota, a mão ou a cabeça cobrem a junta. Pescoço de ponta reta até a base da
  // cabeça. r = meia largura com o contorno (lw do cartoon). pass: 0 macarrão (contornos antes dos recheios, sem emenda
  // nas juntas), 1 por cima (manga, cano da bota), 2 forma fechada no quadro da junta (sapato, mão).
  const lwOf = p => p.size < 28 ? 0 : clamp(p.size * .03, 1.5, STYLE.outline.weight), d2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const short = (a, b, r) => { const k = r / (d2(a, b) || 1); return [b[0] + (a[0] - b[0]) * k, b[1] + (a[1] - b[1]) * k]; };
  const mid = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  function partsOf(p) {
    const J = p.joints, S = p.size, w = lwOf(p), out = [], add = (name, from, to, pts, r, cap, o = {}) => out.push({ name, from, to, pts, r, cap, pass: 0, ...o });
    if (p.spec === 'human') {
      const B = BODY[p.body || 'adult'];
      for (const s of ['L', 'R']) {
        const o = { limb: 'leg' + s, far: p.limbs['leg' + s].far, key: 'skin' }, r = .03 * S + w, kn = J['knee' + s], an = J['ankle' + s];
        add('thigh' + s, 'hip' + s, 'knee' + s, [J['hip' + s], kn], r, 'round', o);
        add('shin' + s, 'knee' + s, 'ankle' + s, [kn, short(kn, an, r)], r, 'round', o);
        add('boot' + s, null, 'ankle' + s, [mid(kn, an, .7), short(kn, an, r + 2)], r + 2, 'round', { ...o, key: 'shoe', pass: 1 });  // cano da bota
        add('foot' + s, 'ankle' + s, null, [an, J['toe' + s]], .3 * B.foot * S + w, 'round', { ...o, key: 'shoe', pass: 2, shape: 'shoe', kh: B.footH / B.foot });
      }
      for (const s of ['L', 'R']) {
        const l = p.limbs['arm' + s], o = { limb: 'arm' + s, far: l.far, key: 'skin' }, r = .025 * S + w, sh = J['shoulder' + s], el = J['elbow' + s], wr = J['wrist' + s];
        add('upperArm' + s, 'shoulder' + s, 'elbow' + s, [sh, el], r, 'round', o);
        add('forearm' + s, 'elbow' + s, 'wrist' + s, [el, short(el, wr, r)], r, 'round', o);
        add('sleeve' + s, 'shoulder' + s, 'elbow' + s, [sh, mid(sh, el, .35)], .044 * S + w, 'round', { ...o, key: 'shirt', pass: 1 });
        add('hand' + s, 'wrist' + s, null, [wr, J['hand' + s]], .4 * B.hand * S + w, 'round', { ...o, pass: 2, shape: l.hand === 'fist' ? 'fist' : 'hand' });
      }
      add('neck', 'neck', 'headBase', [J.neck, J.headBase], .02 * S + w, 'butt', { key: 'skin' });
    } else {
      // Pata de formiga: fêmur e tíbia do cartoon (as de lá mais finas), tarso escuro sem contorno no último terço da tíbia.
      const k = S / 100, j = (n, x) => J[`${n}.${x}`];
      for (const n in p.limbs) {
        const far = p.limbs[n].far, t = far ? .7 : 1, o = { limb: n, far, key: 'color' }, ru = w ? 1.65 * k * t + w : Math.max(.5, .03 * S), rl = w ? 1.3 * k * t + w : ru, rt = Math.max(.6, .9 * k * t), m = j(n, 'mid'), e = j(n, 'end');
        add(`${n}.upper`, `${n}.root`, `${n}.mid`, [j(n, 'root'), m], ru, 'round', o);
        add(`${n}.lower`, `${n}.mid`, `${n}.end`, [m, short(m, e, rl)], rl, 'round', o);
        if (w) add(`${n}.tarsus`, null, `${n}.end`, [mid(m, e, .66), short(m, e, rt)], rt, 'round', { ...o, key: 'dark', ink: false, pass: 1 });
      }
      if (w && p.spec !== 'fly') add('neck', 'neck', 'headBase', [J.neck, J.headBase], 1.6 * k + w, 'butt', { key: 'dark' });  // a mosca: o tórax cobre
    }
    add('head', 'headBase', null, [J.headBase, J.headTop], d2(J.headBase, J.headTop) / 2, 'round');
    return out;
  }
  // Formas fechadas no quadro da junta: a ao longo de pts[0] → pts[1], b de lado (> 0 para a sola ou o dorso da mão), em
  // comprimentos do osso. Sapato: a sola vai de sob o tornozelo (kh = altura do tornozelo / pé) ao dedo, no chão.
  const SHAPES = {
    shoe: kh => [[-.24, .08], [-.14, kh], [.45, .55 * kh], [1, 0], [1.1, -.12], [.88, -.26], [.3, -.28], [-.06, -.32]],
    hand: () => [[-.1, .38], [.5, .42], [.95, .28], [1.02, 0], [.9, -.28], [.62, -.34], [.64, -.62], [.38, -.66], [.2, -.42], [-.1, -.36]],
    fist: () => [0, 1, 2, 3, 4, 5, 6, 7].map(i => [.42 + .48 * Math.cos(i * TAU / 8), .48 * Math.sin(i * TAU / 8)]),
  };
  function drawParts(p, L, list) {
    const g = cur(), w = lwOf(p), hu = p.spec === 'human', line = pts => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); };
    const col = q => !q.far ? L[q.key] : hu ? mixCol(L[q.key], P.ink, .28) : mixCol(L.color, P.skyLow, .4);
    const run = qs => {
      g.lineJoin = 'round';
      if (w) for (const q of qs) if (q.ink !== false) { line(q.pts); g.lineCap = q.cap; g.lineWidth = 2 * q.r; g.strokeStyle = inkOf(col(q)); g.stroke(); }
      for (const q of qs) { line(q.pts); g.lineCap = q.cap; g.lineWidth = 2 * (q.r - (q.ink !== false ? w : 0)); g.strokeStyle = col(q); g.stroke(); }
    };
    for (const n of [0, 1]) run(list.filter(q => q.pass === n));
    for (const q of list.filter(q => q.shape)) {
      const [A, B] = q.pts, u = [B[0] - A[0], B[1] - A[1]], n = [-p.facing * u[1], p.facing * u[0]];
      blob(SHAPES[q.shape](q.kh).map(([a, b]) => [A[0] + a * u[0] + b * n[0], A[1] + a * u[1] + b * n[1]]), col(q), w);
    }
  }
  // Humano: as peças de membro e pescoço do cartoon saem e entram as partes; cabeça, cabelo, orelha e chapéu (presos
  // juntos na cabeça) são levados por uma semelhança para o círculo da pose: centro da caixa da peça head (2, -8,5; meia
  // altura 24 unidades, sem a orelha) em joints.head e meia altura = |headBase → headTop| / 2. Mochila e alça por cima.
  const HP = CARTOON_PARTS.human.side, AP = CARTOON_PARTS.ant.side, HD = NatureArt.decor.human, AD = NatureArt.decor.ant, human0 = HD.build, ant0 = AD.build;
  const LIMB = new Set([HP.thigh, HP.shin, HP.shoe, HP.upperArm, HP.forearm, HP.hand, HP.handPoint, HP.handFist, HP.neck, AP.femur, AP.tibia, AP.tarsus]), HEADS = new Set([HP.head, HP.hair, HP.ear, HP.hat]);
  const noLimbs = G => G.filter(g => !g.list || !g.list.every(s => LIMB.has(s.q)));
  HD.build = (p, L) => {
    const G = noLimbs(human0(p, L)), Q = partsOf(p), hs = G.flatMap(g => g.list || []).filter(s => HEADS.has(s.q)), h = hs.find(s => s.q === HP.head);
    const m = h.m, c0 = [m[0] * 2 - m[2] * 8.5 + m[4], m[1] * 2 - m[3] * 8.5 + m[5]], c1 = p.joints.head, k = d2(p.joints.headBase, p.joints.headTop) / 2 / 24 / h.k;
    for (const s of hs) { const [a, b, cc, e, x, y] = s.m; s.m = [k * a, k * b, k * cc, k * e, c1[0] + k * (x - c0[0]), c1[1] + k * (y - c0[1])]; s.k *= k; }
    for (const [n, l] of Object.entries(p.limbs)) G.push({ z: (l.foot ? 4 : 8) - (l.far ? 10 : 0), draw: () => drawParts(p, L, Q.filter(q => q.limb === n)) });
    G.push({ z: 5.3, draw: () => drawParts(p, L, Q.filter(q => q.name === 'neck')) });
    if (L.pack) G.push({ z: 1.5, draw: () => pack(p) }, { z: 5.45, draw: () => strap(p) });
    return G;
  };
  // Formiga: as patas e o pescoço (o segundo talo, do tórax à cabeça) vêm das partes; a cintura fica.
  AD.build = (p, L) => {
    const G = noLimbs(ant0(p, L)), Q = partsOf(p);
    for (const g of G) if (g.list?.[0]?.q === AP.stalk) g.list = g.list.slice(0, 1);
    for (const [n, l] of Object.entries(p.limbs)) G.push({ z: l.far ? -8 : 2, draw: () => drawParts(p, L, Q.filter(q => q.limb === n)) });
    G.push({ z: 2.9, draw: () => drawParts(p, L, Q.filter(q => q.name === 'neck')) });
    return G;
  };
  // Formiga pequena (< 28 px: a forma chapada do cartoon), das mesmas partes: patas, segmentos e cabeça sem contorno.
  function tiny(p, look) {
    const L = { ...AD.look, ...look }, Q = partsOf(p), h = Q.find(q => q.name === 'head');
    drawParts(p, { ...L, color: L.dark }, Q.filter(q => q.limb));
    for (const g of p.spine) Kit.ellipse(g.x, g.y, g.r * 1.3, g.r, L.color, { rot: g.angle, stroke: false });
    Kit.ellipse(...p.joints.head, h.r, h.r, L.color, { stroke: false });
  }

  // Ator: some se hidden; alpha ao entrar e sair de túnel; flip em torno do meio do corpo; a folha atrás de quem a leva
  // (a folha é maior que a formiga: por cima, a escondia inteira no túnel).
  function actor(a) {
    if (a.hidden || (a.alpha ?? 1) <= 0) return;
    let p = a.pose;
    c.save(); c.globalAlpha = a.alpha ?? 1;
    if (a.flip) { const m = (p.spine[0].x + p.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
    if (p.carry) { const l = p.carry; A().leafPiece(l.x, l.y, l.w, l.h, l.angle, P.leaf); p = { ...p, carry: null }; }
    const e = a.kind === 'human' && p.emote; if (e) p = { ...p, emote: null };
    const look = a.role === 'hero' ? LOOK : a.kind === 'human' ? { pack: a.gear?.includes('backpack') } : DEEP[a.role] || {};
    if (a.kind === 'ant' && p.size < 28) tiny(p, look); else A().creature(p, look);
    if (e) bang(p, e);
    c.restore();
  }
  // Emote do explorador ('?', '!'): grosso, com borda creme, à frente e acima do rosto (sobre a copa, a câmera fechada do
  // susto o cortava), do tamanho de antes (r = .15 BL); entra na mola (e.k passa de 1) e cresce mais um pouco no pico, um pop.
  function bang(p, e) {
    const k = Math.min(e.k, ease(e.a)); if (k <= 0) return;
    const r = .15 * p.size, sz = 2, x = p.joints.head[0] + p.facing * .2 * p.size, y = p.joints.head[1] - .17 * p.size;
    c.save(); c.translate(x, y); c.scale(1.15 * k, 1.15 * k); c.rotate(p.facing * .12);
    c.font = `900 ${r * sz}px "Arial Black", "Segoe UI", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = .34 * r; c.strokeStyle = P.cloud; c.strokeText(e.sym, 0, 0);
    c.lineWidth = .12 * r; c.strokeStyle = P.line; c.strokeText(e.sym, 0, 0); c.fillStyle = P.line; c.fillText(e.sym, 0, 0);
    c.restore();
  }
  // Atores da camada f. Plano aberto: a protagonista (40 px) com halo creme, para não se perder entre as irmãs. Trilha
  // do H: a fila com um contorno escuro grosso em volta da silhueta, para ler as formigas pequenas na terra clara.
  function actors(F, f) {
    const L = F.actors.filter(a => a.layer === f);
    if (F.shot === 'wide') return L.forEach(a => a.role === 'hero' ? stamp([a], 'rgba(255,246,214,.95)', 9, 3) : actor(a));
    if (F.shot === 'trail') { L.filter(a => a.role !== 'line').forEach(actor); return stamp(L.filter(a => a.role === 'line'), 'rgba(23,23,28,.95)', 3, 3); }
    L.forEach(actor);
  }
  // Desenha os atores num canvas à parte (só no retângulo que ocupam na tela) e cola n vezes com sombra col de blur px:
  // a sombra contorna a silhueta inteira por fora, sem marcar as peças por dentro.
  const ST = document.createElement('canvas'), stG = ST.getContext('2d'); ST.width = W; ST.height = H;
  function stamp(list, col, blur, n) {
    list = list.filter(a => !a.hidden && (a.alpha ?? 1) > 0); if (!list.length) return;
    const m = c.getTransform(); let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const { pose: p } of list) for (const q of [p.spine[0], p.spine.at(-1)]) {
      const sx = m.a * q.x + m.c * q.y + m.e, sy = m.b * q.x + m.d * q.y + m.f, r = 1.3 * p.size * m.a;
      x0 = Math.min(x0, sx - r); y0 = Math.min(y0, sy - r); x1 = Math.max(x1, sx + r); y1 = Math.max(y1, sy + r);
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    if (x1 <= x0 || y1 <= y0) return;
    const w = x1 - x0, h = y1 - y0;
    stG.resetTransform(); stG.clearRect(x0, y0, w, h); stG.setTransform(m); Kit.into(stG, () => list.forEach(actor));
    c.save(); c.resetTransform(); c.shadowColor = col; c.shadowBlur = blur;
    for (let i = 0; i < n; i++) c.drawImage(ST, x0, y0, w, h, x0, y0, w, h);
    c.restore();
  }

  // Capim gigante enevoado (raízes em root) e o chão da camada .35, parados e desfocados.
  function mist(F, box) {
    const { root, prof } = F.world.mist, col = mixCol(P.grassDk, P.skyLow, .5);
    layer(F, .35, (a, b) => {
      for (let i = Math.floor(a / 70); i * 70 < b; i++) { const x = i * 70 + 40 * hash(i + 200); A().blade(x, root, 220 + 280 * hash(i + 201), .12 * Math.sin(i), mixCol(P.grass, P.skyLow, .55)); }
      A().ground(prof, a, b, col);
    }, box);
  }
  // Fundo macro (.7): as irmãs com folhas numa trilha de trás e capim gigante na frente delas.
  function back(F) {
    const gb = F.world.back.ground;
    layer(F, .7, (a, b) => {
      actors(F, .7);
      for (let i = Math.floor(a / 150); i * 150 < b; i++) { const x = i * 150 + 80 * hash(i + 3); A().blade(x, gb(x) + 30, 260 + 300 * hash(i), .14 * wind(F.t, x, 5), mixCol(P.grassDk, P.skyLow, .25)); }
    });
  }

  // Primeiro plano dos closes: dois tufos quase pretos nos cantos de baixo, desfocados (lowres), em tela.
  const fg = t => lowres(() => { const col = mixCol(P.leafDk, P.ink, .8); A().tuft(70, 1150, 520, t, 3, col); A().tuft(1870, 1160, 430, t, 8, col); });

  // Subsolo parado, desenhado uma vez (still, 1,4 px por unidade): três faixas de valor de ondas largas, seixos em grupos
  // em volta das câmaras e em poucos bolsões, depois túneis e câmaras por cima.
  const SOIL_AT = [-300, 846, 2700, 1300];
  const soilArt = w => () => {
    const [bx, by, bw, bh] = SOIL_AT, x2 = bx + bw, y2 = by + bh, cols = [.2, .36, .52].map(k => mixCol(P.wood, P.ink, k));
    Kit.poly([[bx, by], [x2, by], [x2, y2], [bx, y2]], cols[0], { stroke: false });
    [[150, 0], [560, 2]].forEach(([dy, sd], i) => {
      const edge = []; for (let x = bx; x <= x2; x += 40) edge.push([x, by + dy + 40 * Math.sin(x * .0023 + sd) + 14 * Math.sin(x * .0071 + sd)]);
      Kit.poly([...edge, [x2, y2], [bx, y2]], cols[i + 1], { stroke: false });
      Kit.line(edge, mixCol(cols[i + 1], P.ink, .3), 3);
    });
    const peb = (x, y, r, sd) => { Kit.ellipse(x, y, 1.3 * r, r, mixCol(P.stone, P.wood, .45 + .3 * hash(sd)), { rot: hash(sd + 1) - .5 }); Kit.ellipse(x - .35 * r, y - .35 * r, .45 * r, .3 * r, mixCol(P.stone, P.cloud, .3)); };
    const groups = [...w.chambers.map(([x, y, cw, ch]) => [x, y - ch / 2, .62 * cw, .75 * ch, 16]), [1250, 1000, 120, 60, 7], [120, 1250, 140, 70, 8], [2050, 1350, 130, 70, 7], [1400, 1900, 160, 70, 9]];
    groups.forEach(([x, y, rx, ry, n], g) => { for (let i = 0; i < n; i++) { const a = TAU * hash(g * 31 + i), d = .85 + .4 * hash(g * 17 + i); peb(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 4 + 9 * hash(g * 7 + i), g * 50 + i); } });
    for (const p of w.tunnels) A().tunnel(pathOf(p), 34);
    for (const [x, y, cw, ch, sd] of w.chambers) A().chamber(x, y, cw, ch, sd);
  };
  // Fungo: uma massa esponjosa de borda em gomos redondos (respira devagar com t), clara em cima e terrosa embaixo, com dobras
  // e poros.
  function sponge(x, y, w, h, t, sd) {
    const pts = [], n = 30;
    for (let i = 0; i <= n; i++) { const u = i / n, a = Math.PI * (1 + u), b = .9 + .12 * Math.abs(Math.sin(u * Math.PI * 7 + sd)) + .012 * Math.sin(t * 1.2 + i); pts.push([x + Math.cos(a) * w / 2 * b, y + 4 + Math.sin(a) * h * b]); }
    pts.push([x + .45 * w, y + 6], [x - .45 * w, y + 6]);
    const g = c.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, mixCol(P.cream, P.cloud, .7)); g.addColorStop(.55, P.cream); g.addColorStop(1, mixCol(P.cream, P.wood, .45));
    Kit.poly(pts, g, { smooth: true, weight: 4 });
    for (let i = 0; i < 5; i++) Kit.ellipse(x + (i - 2) * .17 * w, y - (.55 + .2 * Math.cos((i - 2) * .7)) * h, .07 * w, .045 * w, mixCol(P.cream, P.cloud, .8), { alpha: .7 });  // luz de cima nos gomos
    for (let i = 0; i < 9; i++) {  // dobras: arcos curtos de tinta
      const u = 2 * hash(sd + i * 3.3) - 1, v = .25 + .6 * hash(sd + i * 5.1), px = x + u * .38 * w * Math.sqrt(1 - v * v), py = y - v * .8 * h, r = (.05 + .04 * hash(sd + i)) * w;
      Kit.line([[px - r, py], [px, py - .5 * r], [px + r, py]], mixCol(P.cream, P.wood, .6), Math.max(2, .012 * w), { alpha: .7 });
    }
    for (let i = 0; i < 26; i++) {  // poros
      const u = 2 * hash(sd + i * 1.7) - 1, v = .08 + .8 * hash(sd + i * 2.9), r = (.008 + .012 * hash(sd + i * 4.3)) * w;
      Kit.ellipse(x + u * .44 * w * Math.sqrt(1 - v * v), y - v * .85 * h, r, .8 * r, mixCol(P.cream, P.wood, .6));
    }
  }

  // ---------- A: close, plano aberto, nome ----------
  function close(F) {
    const t = F.t, W_ = F.world, [x0, x1] = view(F);
    Kit.gradient();
    mist(F, ['mist-close', [-1000, 560, 9000, 460]]);
    back(F);
    Kit.cam(F.cam.cx, F.cam.cy, F.cam.z, 0, hand(t));
    A().ground(W_.ground, x0, x1);
    A().props(x => W_.ground(x) + 10, x0, x1, 8, 2.4, 0, 'sm');
    actors(F, 1);
    lowres(() => front(t, F, x0, x1));
    Kit.camEnd();
    fg(t);
    finish(t);
  }
  function wide(F) {
    const t = F.t, w = F.world, g = w.ground, [x0, x1] = view(F);
    Kit.gradient();
    layer(F, w.clouds.f, () => w.clouds.list.forEach(([x, y, s, sd]) => A().cloud(x, y, s, sd)));
    layer(F, w.far.f, (a, b) => A().ground(w.far.prof, a, b, mixCol(P.foliage, P.skyLow, .4)), ['hills1', [-700, 450, 3400, 650]]);
    layer(F, w.hill.f, (a, b) => {
      for (let k = Math.floor(a / 160); k * 160 < b; k++) if (hash(k + 70) < .6) { const x = k * 160 + 60 * hash(k + 71); A().tree(x, w.hill.prof(x) + 10, 120 + 90 * hash(k + 72), .05 * wind(t, x), k + 30, .3); }
      A().ground(w.hill.prof, a, b, mixCol(P.leafDk, P.skyLow, .2));
    });
    Kit.cam(F.cam.cx, F.cam.cy, F.cam.z, 0, hand(t));
    A().tree(w.tree.x, g(w.tree.x) + 10, w.tree.h, .04 * wind(t, w.tree.x), 4);
    A().ground(g, x0, x1);
    // Corte do solo: terra, túneis, câmaras, raízes, fungo, depois quem mora lá.
    still('soil', SOIL_AT, 1.4, 0, soilArt(w));
    A().roots(w.roots.x, w.roots.y, w.roots.h, 1, 5);
    for (const [x, y, fw, fh, sd] of w.fungus) sponge(x, y, fw, fh, t, sd);
    const [gx, gy, gw, gh] = w.chambers[0]; grains(t, gx - .35 * gw, gx + .35 * gw, gy - gh + 10, gy, 3, 21);
    grass(t, x0, x1, g, 18, 16, 34, 0);
    const hero = F.actors.find(a => a.role === 'hero').pose;
    actors(F, 1);
    const N = w.nest;
    Kit.poly([[N - 70, g(N) + 8], [N - 30, g(N) - 20], [N + 25, g(N) - 24], [N + 75, g(N) + 8]], EARTH, { smooth: true, weight: 4 });
    Kit.ellipse(N + 5, g(N) - 6, 22, 7, P.line);
    lowres(() => grass(t, x0, x1, g, 18, 16, 34, 1, [[hero.head.x, hero.head.y]]));
    Kit.camEnd();
    finish(t, F.under);
  }
  function name(F) {
    const t = F.t, w = F.world, [x0, x1] = view(F);
    Kit.gradient();
    mist(F, ['mist-name', [-1000, 500, 3500, 500]]);
    back(F);
    Kit.cam(F.cam.cx, F.cam.cy, F.cam.z, 0, hand(t));
    A().ground(w.ground, x0, x1);
    A().rock(...w.rock, 2); A().props(x => w.ground(x) + 10, x0, x1, 8, 2.4, 0, 'sm');
    actors(F, 1);
    lowres(() => front(t, F, x0, x1));
    Kit.camEnd();
    fg(t);
    finish(t);
  }

  // ---------- H: o explorador na trilha das formigas ----------
  // Morros e árvores ao fundo, gramado, a trilha de terra clara onde a fila anda (antGround) e capim atrás dele.
  const farH = x => 600 + 50 * Math.sin(x * .002 + 2) + 20 * Math.sin(x * .006), hillH = x => 720 + 24 * Math.sin(x * .003 + 4);
  function trail(F) {
    const t = F.t, w = F.world, g = w.ground, ag = w.antGround, [x0, x1] = view(F);
    Kit.gradient();
    layer(F, .1, () => [[300 + 6 * t, 170, .8, 1], [1500 + 4 * t, 120, .6, 2]].forEach(([x, y, s, sd]) => A().cloud(x, y, s, sd)));
    layer(F, .3, (a, b) => A().ground(farH, a, b, mixCol(P.foliage, P.skyLow, .4)), ['farH', [-600, 380, 3200, 800]]);
    layer(F, .6, (a, b) => {
      for (let k = Math.floor(a / 160); k * 160 < b; k++) if (hash(k + 90) < .55) { const x = k * 160 + 60 * hash(k + 91); A().tree(x, hillH(x) + 10, 140 + 100 * hash(k + 92), .05 * wind(t, x), k + 50, .3); }
      A().ground(hillH, a, b, mixCol(P.leafDk, P.skyLow, .2));
    });
    Kit.cam(F.cam.cx, F.cam.cy, F.cam.z, 0, hand(t));
    A().ground(g, x0, x1);
    // Trilha: faixa de terra batida de g + 18 a g + 80, com borda escura e pedrinhas.
    const top = [], bot = []; for (let x = x0; x <= x1 + 20; x += 20) { top.push([x, ag(x) - 26 + 3 * Math.sin(x * .05)]); bot.push([x, ag(x) + 30 + 4 * Math.sin(x * .031)]); }
    Kit.poly([...top, ...bot.reverse()], TRAIL, { weight: 3 });
    A().props(x => g(x) + 4, x0, x1, 5, 2, 0, 'sf');  // nada na trilha nem laranja perto dela: as formigas são o que se lê ali
    grass(t, x0, x1, g, 22, 18, 40, 0);
    actors(F, 1);
    Kit.camEnd();
    finish(t);
  }

  window.ExpStyle = {
    parts: (a, F) => partsOf(a.pose).map(q => ({ actor: a.id, ...q })),
    draw(F) {
      ({ close, wide, name, trail })[F.shot](F);
      for (const s of F.texts) Kit.text(s.text, s.x, s.y, s.size, P.ink, { k: s.k });
    },
  };
})();
