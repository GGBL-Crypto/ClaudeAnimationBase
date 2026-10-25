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
      // Patas: coxa e canela de largura fixa por espécie (WID, em BL/100; nos insetos as de lá mais finas e um tarso escuro
      // sem contorno no último terço); cão e ave têm o osso da ponta, do tornozelo ao dedo: almofada (cão) ou dedos (ave).
      const k = S / 100, j = (n, x) => J[`${n}.${x}`], sp = kindOf(p), [wu, wl, key, bug] = WID[sp] || WID.ant;
      for (const n in p.limbs) {
        const far = p.limbs[n].far, t = far && bug ? .7 : 1, o = { limb: n, far, key }, ru = w ? wu * k * t + w : Math.max(.5, .03 * S), rl = w ? wl * k * t + w : ru, rt = Math.max(.6, .9 * k * t), m = j(n, 'mid'), e = j(n, 'end'), toe = j(n, 'toe');
        add(`${n}.upper`, `${n}.root`, `${n}.mid`, [j(n, 'root'), m], ru, 'round', o);
        add(`${n}.lower`, `${n}.mid`, `${n}.end`, [m, short(m, e, rl)], rl, 'round', { ...o, key: sp === 'dog' ? 'sock' : key });
        if (toe && sp === 'dog') add(`${n}.tip`, `${n}.end`, null, [e, toe], 1.25 * rl, 'round', { ...o, key: 'sock', pass: 2, shape: 'paw', kh: .05 / .07 });
        else if (toe) { add(`${n}.tip`, `${n}.end`, null, [e, toe], rl, 'round', o); add(`${n}.hallux`, null, null, [e, mid(e, toe, -.4)], rl, 'round', o); }
        else if (w && bug) add(`${n}.tarsus`, null, `${n}.end`, [mid(m, e, .66), short(m, e, rt)], rt, 'round', { ...o, key: 'dark', ink: false, pass: 1 });
      }
      const nk = NECK[sp];  // a mosca não tem: o tórax cobre
      if (w && nk) add('neck', 'neck', 'headBase', [J.neck, J.headBase], (sp === 'fish' ? SPECS[p.spec].spine[0].r * 100 : nk[0]) * k + w, 'butt', { key: nk[1] });
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
    paw: kh => [[-.45, .2], [-.05, kh], [.55, .45 * kh], [1, 0], [1.1, -.25], [.7, -.6], [.1, -.75], [-.45, -.45]],
  };
  // Largura das patas por espécie [coxa, canela, cor, inseto] e do pescoço [meia largura, cor], em BL/100.
  const WID = { ant: [1.65, 1.3, 'color', true], beetle: [2.6, 2, 'dark', true], dog: [4.2, 2.6, 'color', false], bird: [1.4, 1.4, 'beak', false] };
  const NECK = { ant: [1.6, 'dark'], beetle: [3.5, 'dark'], dog: [5.5, 'color'], bird: [6, 'color'], fish: [12, 'color'], butterfly: [2.5, 'body'] };
  const kindOf = p => SPECS[p.spec]?.like || p.spec;
  function drawParts(p, L, list) {
    const g = cur(), w = lwOf(p), pale = kindOf(p) === 'ant', line = pts => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); };
    const col = q => !q.far ? L[q.key] : pale ? mixCol(L.color, P.skyLow, .4) : mixCol(L[q.key], P.ink, .28);
    const run = qs => {
      g.lineJoin = 'round';
      if (w) for (const q of qs) if (q.ink !== false) { line(q.pts); g.lineCap = q.cap; g.lineWidth = 2 * q.r; g.strokeStyle = inkOf(col(q)); g.stroke(); }
      for (const q of qs) { line(q.pts); g.lineCap = q.cap; g.lineWidth = 2 * (q.r - (q.ink !== false ? w : 0)); g.strokeStyle = col(q); g.stroke(); }
    };
    for (const n of [0, 1]) run(list.filter(q => q.pass === n));
    for (const q of list.filter(q => q.shape)) {
      const [A, B] = q.pts, u = [B[0] - A[0], B[1] - A[1]], n = [-p.facing * u[1], p.facing * u[0]];
      blob(SHAPES[q.shape](q.kh).map(frameAt(A, u, n)), col(q), w);
    }
  }
  const frameAt = (A, u, n) => ([a, b]) => [A[0] + a * u[0] + b * n[0], A[1] + a * u[1] + b * n[1]];
  // Quadro da cabeça: a de headBase (0) a headTop (1), b de lado (> 0 para baixo do focinho), em |headBase → headTop|.
  const headFrame = p => { const A = p.joints.headBase, B = p.joints.headTop, u = [B[0] - A[0], B[1] - A[1]]; return frameAt(A, u, [-p.facing * u[1], p.facing * u[0]]); };
  const ring = (x, y, rx, ry, rot = 0, n = 12) => Array.from({ length: n }, (_, i) => { const a = i * TAU / n, X = rx * Math.cos(a), Y = ry * Math.sin(a); return [x + X * Math.cos(rot) - Y * Math.sin(rot), y + X * Math.sin(rot) + Y * Math.cos(rot)]; });
  // Olho redondo branco com pupila olhando à frente (ou fechado numa linha no piscar), centro (x, y), raio r.
  function eye(p, x, y, r, w) {
    const g = cur(); g.lineWidth = Math.max(1.2, w); g.strokeStyle = P.line; g.lineCap = 'round';
    if (p.face.blink > .5) { g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.stroke(); return; }
    g.beginPath(); g.ellipse(x, y, r, 1.1 * r, 0, 0, TAU); g.fillStyle = P.eye; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(x + p.facing * .35 * r, y + .1 * r, .45 * r, .5 * r, 0, 0, TAU); g.fillStyle = P.line; g.fill();
    g.beginPath(); g.ellipse(x + p.facing * .2 * r, y - .15 * r, .14 * r, .14 * r, 0, 0, TAU); g.fillStyle = '#FFFFFF'; g.fill();
  }
  // Peças do cartoon por espécie: as de membro e pescoço saem (as partes as desenham); as presas na cabeça são levadas por
  // uma semelhança ao círculo da pose (fitHead): centro da caixa da peça head em joints.head e a meia medida maior da caixa
  // (ou box[2]) = |headBase → headTop| / 2. O que se desenha dentro da peça (rosto, olhos) vai junto.
  const CP = CARTOON_PARTS, HP = CP.human.side, AP = CP.ant.side, DP = CP.dog.side, BP = CP.bird.side, FP = CP.fly.side, DEC = NatureArt.decor;
  const LIMB = new Set([HP.thigh, HP.shin, HP.shoe, HP.upperArm, HP.forearm, HP.hand, HP.handPoint, HP.handFist, HP.neck, AP.femur, AP.tibia, AP.tarsus, DP.armUpper, DP.hipUpper, DP.legLower, DP.paw, DP.neck, BP.shank, BP.toes, BP.neck]);
  const without = (G, drop) => G.map(g => g.list ? { ...g, list: g.list.filter(s => !drop.has(s.q)) } : g).filter(g => !g.list || g.list.length);
  const BOX = new Map(), boxOf = q => {
    let b = BOX.get(q);
    if (!b) { const n = q.d.match(/-?\d*\.?\d+/g).map(Number), xs = n.filter((_, i) => !(i & 1)), ys = n.filter((_, i) => i & 1), [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; BOX.set(q, b = [(x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) / 2]); }
    return b;
  };
  function fitHead(p, G, head, set, b = boxOf(head)) {
    const hs = G.flatMap(g => g.list || []).filter(s => set.has(s.q)), h = hs.find(s => s.q === head); if (!h) return;
    const m = h.m, c0 = [m[0] * b[0] + m[2] * b[1] + m[4], m[1] * b[0] + m[3] * b[1] + m[5]], c1 = p.joints.head, k = d2(p.joints.headBase, p.joints.headTop) / 2 / b[2] / h.k;
    for (const s of hs) { const [a, bb, cc, e, x, y] = s.m; s.m = [k * a, k * bb, k * cc, k * e, c1[0] + k * (x - c0[0]), c1[1] + k * (y - c0[1])]; s.k *= k; }
  }
  const limbGroups = (p, L, Q, z) => Object.entries(p.limbs).filter(([n]) => !L.skip?.includes(n)).map(([n, l]) => ({ z: z(l), draw: () => drawParts(p, L, Q.filter(q => q.limb === n)) }));
  const neckGroup = (p, L, Q, z) => ({ z, draw: () => drawParts(p, L, Q.filter(q => q.name === 'neck')) });
  // Humano: cabeça da caixa (2, -8,5; meia altura 24, sem a orelha); tronco, pelve e lenço na largura do tipo de corpo
  // (girth / .1, de lado ao osso); chapéu e lenço só no look que os tem; membros de actor.front ficam para depois dos corpos.
  const human0 = DEC.human.build;
  DEC.human.build = (p, L) => {
    const G = without(human0(p, L), new Set([...LIMB, ...(L.noHat ? [HP.hat] : []), ...(L.noScarf ? [HP.scarf, HP.scarfTail] : [])])), Q = partsOf(p), gk = BODY[p.body || 'adult'].girth / .1;
    fitHead(p, G, HP.head, new Set([HP.head, HP.hair, HP.ear, HP.hat]), [2, -8.5, 24]);
    for (const s of G.flatMap(g => g.list || [])) if (s.q === HP.torso || s.q === HP.pelvis || s.q === HP.scarf) s.m = [s.m[0] * gk, s.m[1] * gk, ...s.m.slice(2)];
    G.push(...limbGroups(p, L, Q, l => (l.foot ? 4 : 8) - (l.far ? 10 : 0)), neckGroup(p, L, Q, 5.3));
    if (L.pack) G.push({ z: 1.5, draw: () => pack(p) }, { z: 5.45, draw: () => strap(p) });
    return G;
  };
  // Formiga: patas e pescoço (o segundo talo, do tórax à cabeça) das partes; a cintura fica; cabeça e mandíbulas no círculo.
  const ant0 = DEC.ant.build;
  DEC.ant.build = (p, L) => {
    const G = without(ant0(p, L), LIMB), Q = partsOf(p);
    for (const g of G) if (g.list?.[0]?.q === AP.stalk) g.list = g.list.slice(0, 1);
    fitHead(p, G, AP.head, new Set([AP.head, AP.mandible]));
    G.push(...limbGroups(p, L, Q, l => l.far ? -8 : 2), neckGroup(p, L, Q, 2.9));
    return G;
  };
  const fly0 = DEC.fly.build;
  DEC.fly.build = (p, L) => { const G = fly0(p, L); fitHead(p, G, FP.head, new Set([FP.head])); return G; };
  // Ave: dedos e canelas das partes; cabeça e bico no círculo; o pescoço por baixo do corpo e da cabeça.
  const bird0 = DEC.bird.build;
  DEC.bird.build = (p, L) => {
    const G = without(bird0(p, L), LIMB), Q = partsOf(p);
    fitHead(p, G, BP.head, new Set([BP.head, BP.beak]));
    G.push(...limbGroups(p, L, Q, l => l.far ? 1.5 : 2), neckGroup(p, L, Q, 0));
    return G;
  };
  // Peixe: as peças do cartoon presas nos segmentos e na cabeça; o pescoço (do tórax à base da cabeça) por baixo delas.
  const fish0 = DEC.fish.build;
  DEC.fish.build = (p, L) => [...fish0(p, L), neckGroup(p, L, partsOf(p), -5)];
  // Raposa (kind dog): corpo e cauda do cão do cartoon em laranja com a ponta da cauda creme; patas de meia escura com
  // almofada no osso da ponta; pescoço das partes; cabeça de raposa no quadro headBase → headTop (o focinho termina em
  // headTop), orelhas em pé, bochecha creme, olho e trufa.
  const dog0 = DEC.dog.build;
  DEC.dog.build = (p, L) => {
    const G = without(dog0(p, L), new Set([...LIMB, DP.head, DP.collar, DP.tag, DP.ear])).filter(g => !g.draw), Q = partsOf(p);
    for (const s of G.flatMap(g => g.list || [])) if (s.q === DP.body) s.m = [s.m[0], s.m[1], .62 * s.m[2], .62 * s.m[3], s.m[4], s.m[5]];  // raposa: corpo esguio
    G.push(...limbGroups(p, L, Q, l => l.far ? -6 : 4), neckGroup(p, L, Q, 5.1), { z: 5.2, draw: () => foxHead(p, L) });
    return G;
  };
  function foxHead(p, L) {
    const f = headFrame(p), w = lwOf(p), R = d2(p.joints.headBase, p.joints.headTop) / 2, ear = (a, dk) => blob([[a - .14, -.3], [a - .2, -.85], [a + .12, -.34]].map(f), mixCol(L.color, P.ink, dk), w);
    ear(.1, .3);
    blob([[-.06, .05], [0, -.3], [.22, -.42], [.5, -.3], [.75, -.15], [.98, -.04], [1, .04], [.8, .14], [.5, .3], [.15, .36]].map(f), L.color, w);
    blob([[.3, .12], [.62, .06], [.95, .03], [.8, .13], [.5, .27], [.25, .3]].map(f), L.dark, 0);  // bochecha e queixo creme
    ear(.3, 0);
    const [ex, ey] = f([.5, -.14]), [nx, ny] = f([.97, 0]), wide = p.face.expression === 'surprised';
    eye(p, ex, ey, (wide ? .17 : .13) * R, .5 * w);
    const g = cur(); g.beginPath(); g.ellipse(nx, ny, .1 * R, .08 * R, 0, 0, TAU); g.fillStyle = P.line; g.fill();
  }
  // Besouro e borboleta (sem peças no cartoon): formas fechadas presas nas juntas, no traço e na luz do blob.
  const roundHead = (p, col) => { const R = d2(p.joints.headBase, p.joints.headTop) / 2; blob(ring(...p.joints.head, R, R), col, lwOf(p)); return R; };
  const antennae = (p, col, club) => () => { for (const a of ['antennaL', 'antennaR']) { const pts = p.appendages[a], wd = Math.max(1.2, .02 * p.size); Kit.line(pts, col, wd); if (club) Kit.ellipse(...pts.at(-1), 1.8 * wd, 1.8 * wd, col); } };
  DEC.beetle = { look: { color: P.chitin, dark: P.chitinDk }, build(p, L) {
    const Q = partsOf(p), [pr, el] = p.spine, w = lwOf(p);
    return [...limbGroups(p, L, Q, l => l.far ? -8 : 2), neckGroup(p, L, Q, 4), { z: 6.5, draw: antennae(p, L.dark) },
      { z: 5, draw: () => {
        blob(ring(pr.x, pr.y, 1.05 * pr.r, .9 * pr.r, pr.angle), L.dark, w);
        blob(ring(el.x, el.y, 1.2 * el.r, .85 * el.r, el.angle), L.color, w);
        const g = cur(), a = el.angle; g.beginPath(); g.moveTo(el.x + Math.cos(a) * 1.1 * el.r, el.y + Math.sin(a) * 1.1 * el.r - .1 * el.r); g.quadraticCurveTo(el.x, el.y - .55 * el.r, el.x - Math.cos(a) * 1.1 * el.r, el.y - Math.sin(a) * 1.1 * el.r);
        g.strokeStyle = inkOf(L.color); g.lineWidth = .6 * w; g.stroke();  // costura dos élitros
        Kit.ellipse(el.x - .3 * el.r * p.facing, el.y - .45 * el.r, .35 * el.r, .14 * el.r, 'rgba(255,255,255,.35)', { rot: -.3 * p.facing });
      } },
      { z: 6, draw: () => { const R = roundHead(p, L.dark), [x, y] = headFrame(p)([.55, -.1]); eye(p, x, y, .3 * R, .5 * w); } }];
  } };
  DEC.butterfly = { look: { color: P.purple, dark: P.purpleDk, body: mixCol(P.ink, P.purpleDk, .3), spot: P.gold }, build(p, L) {
    const Q = partsOf(p), [th, ab] = p.spine, S = p.size, f = p.facing, w = lwOf(p), fl = Math.cos(TAU * p.wings.phase);
    // Asa: anterior e posterior presas no tórax, abertas para cima e batendo (escala vertical fl); a de lá atrás do corpo.
    const wing = (dk, dx) => () => {
      const at = ([a, b]) => [th.x + f * (a + dx) * S, th.y + b * fl * S], col = mixCol(L.color, P.ink, dk);
      blob([[.05, 0], [.2, -.55], [.55, -.8], [.7, -.55], [.35, -.08]].map(at), col, w);
      blob([[-.02, 0], [-.12, -.45], [-.45, -.55], [-.5, -.3], [-.2, -.05]].map(at), mixCol(col, P.ink, .15), w);
      for (const [a, b, r] of [[.5, -.6, .07], [-.32, -.38, .06]]) Kit.ellipse(...at([a, b]), r * S, r * S * Math.max(.2, Math.abs(fl)), mixCol(L.spot, P.ink, dk));
    };
    return [{ z: 1, draw: wing(.3, -.04) }, neckGroup(p, L, Q, 5.5), { z: 6.5, draw: antennae(p, L.body, true) }, { z: 7, draw: wing(0, 0) },
      { z: 5, draw: () => { blob(ring(ab.x, ab.y, 1.9 * ab.r, .8 * ab.r, ab.angle), L.body, w); blob(ring(th.x, th.y, th.r, th.r), L.body, w); } },
      { z: 6, draw: () => { const R = roundHead(p, L.body), [x, y] = headFrame(p)([.55, -.05]); eye(p, x, y, .35 * R, .4 * w); } }];
  } };
  // Formiga pequena (< 28 px: a forma chapada do cartoon), das mesmas partes: patas, segmentos e cabeça sem contorno.
  function tiny(p, look) {
    const L = { ...DEC.ant.look, ...look }, Q = partsOf(p), h = Q.find(q => q.name === 'head');
    drawParts(p, { ...L, color: L.dark }, Q.filter(q => q.limb));
    for (const g of p.spine) Kit.ellipse(g.x, g.y, g.r * 1.3, g.r, L.color, { rot: g.angle, stroke: false });
    Kit.ellipse(...p.joints.head, h.r, h.r, L.color, { stroke: false });
  }

  // Gente da praça (P): roupa, cabelo e pele por id, sem o chapéu e o lenço da exploradora (o avô fica com o chapéu). A
  // cor-herói (laranja) só na criança. Raposa (N) em laranja de raposa, ponta da cauda e bochecha creme, meias escuras.
  const PEOPLE = {
    corredor: { shirt: P.cloth, pants: P.clothDk, hair: P.line, shoe: P.cloud, sole: P.stone, noHat: true, noScarf: true },
    marta: { shirt: P.purple, pants: P.shade, skin: mixCol(P.skinDk, P.wood, .45), hair: P.line, shoe: P.wood, sole: P.bootDk, noHat: true, noScarf: true },
    joao: { shirt: P.water, pants: P.wood, hair: P.hair, noHat: true, noScarf: true },
    lia: { shirt: P.blush, pants: P.shorts, hair: P.gold, shoe: P.cloud, sole: P.stone, noHat: true, noScarf: true },
    bia: { shirt: P.sauvaHero, pants: P.cloth, hair: P.brown, shoe: P.purpleDk, sole: P.line, noHat: true, noScarf: true },
    avo: { shirt: P.olive, pants: P.stone, hair: P.cloud, skin: mixCol(P.skin, P.skinDk, .4), hat: P.wood, hatBand: P.bootDk, noScarf: true },
  };
  const FOX = { color: P.orange, dark: P.cream, sock: mixCol(P.orangeDk, P.ink, .5) };
  const lookOf = a => a.role === 'hero' ? LOOK : a.kind === 'human' ? { pack: a.gear?.includes('backpack'), ...PEOPLE[a.id], ...(a.front && { skip: a.front }) } : a.kind === 'dog' ? FOX : DEEP[a.role] || {};
  // Ator: some se hidden; alpha ao entrar e sair de túnel; flip em torno do meio do corpo; a folha atrás de quem a leva
  // (a folha é maior que a formiga: por cima, a escondia inteira no túnel). Sem achatar o corpo (pose.sq mudaria o
  // tamanho dos ossos desenhados).
  function actor(a) {
    if (a.hidden || (a.alpha ?? 1) <= 0) return;
    let p = { ...a.pose, sq: 0 };
    c.save(); c.globalAlpha = a.alpha ?? 1;
    if (a.flip) { const m = (p.spine[0].x + p.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
    if (p.carry) { const l = p.carry; A().leafPiece(l.x, l.y, l.w, l.h, l.angle, P.leaf); p.carry = null; }
    const e = a.kind === 'human' && p.emote; if (e) p.emote = null;
    if (a.kind === 'ant' && p.size < 28) tiny(p, lookOf(a)); else A().creature(p, lookOf(a));
    if (e) bang(p, e);
    c.restore();
  }
  // Emote ('?', '!'): grosso, com borda creme, à frente e acima da cabeça (fora do chapéu); entra na mola (e.k passa de 1)
  // e cresce mais um pouco no pico, um pop.
  function bang(p, e) {
    const k = Math.min(e.k, ease(e.a)); if (k <= 0) return;
    const R = d2(p.joints.headBase, p.joints.headTop) / 2, r = 1.6 * R, x = p.joints.head[0] + p.facing * 2.6 * R, y = p.joints.head[1] - 2.2 * R;
    c.save(); c.translate(x, y); c.scale(1.15 * k, 1.15 * k); c.rotate(p.facing * .12);
    c.font = `900 ${2 * r}px "Arial Black", "Segoe UI", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = .34 * r; c.strokeStyle = P.cloud; c.strokeText(e.sym, 0, 0);
    c.lineWidth = .12 * r; c.strokeStyle = P.line; c.strokeText(e.sym, 0, 0); c.fillStyle = P.line; c.fillText(e.sym, 0, 0);
    c.restore();
  }
  // Atores da camada f (only: filtro). Plano aberto: a protagonista (40 px) com halo creme, para não se perder entre as
  // irmãs. Trilha do H: a fila com um contorno escuro grosso em volta da silhueta, para ler as formigas pequenas na terra
  // clara. Os membros de actor.front (abraço) por cima de todos os corpos.
  function actors(F, f, only = () => true) {
    const L = F.actors.filter(a => a.layer === f && only(a));
    if (F.shot === 'wide') return L.forEach(a => a.role === 'hero' ? stamp([a], 'rgba(255,246,214,.95)', 9, 3) : actor(a));
    if (F.shot === 'trail') { L.filter(a => a.role !== 'line').forEach(actor); return stamp(L.filter(a => a.role === 'line'), 'rgba(23,23,28,.95)', 3, 3); }
    L.forEach(actor);
    for (const a of L) if (a.front && !a.hidden) drawParts(a.pose, { ...DEC.human.look, ...lookOf(a) }, partsOf(a.pose).filter(q => a.front.includes(q.limb)));
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

  // ---------- P: a praça ----------
  // Prédios baixos enevoados ao fundo (camada parada .3), sebe, árvores e postes da praça, fonte com jato, calçada de
  // pedra com juntas, banco de perfil e a flor (no chão ou na mão da criança, por cima dela).
  const PAVE = mixCol(P.stone, P.cream, .45), hzP = col => mixCol(col, P.skyLow, .5);
  function town(a, b) {
    for (let k = Math.floor(a / 240) - 1; k * 240 < b; k++) {
      const x = k * 240 + 40 * hash(k + 300), w = 150 + 80 * hash(k + 301), h = 180 + 240 * hash(k + 302), y = 905, col = hzP([P.cream, P.blush, P.light, P.stone][Math.floor(hash(k + 303) * 4)]);
      Kit.poly([[x, y], [x, y - h], [x + w, y - h], [x + w, y]], col, { weight: 2 });
      if (hash(k + 304) < .55) Kit.poly([[x - 10, y - h], [x + w / 2, y - h - .28 * w], [x + w + 10, y - h]], hzP(P.brown), { weight: 2 });
      for (let r = 0; r < Math.floor((h - 40) / 62); r++) for (let i = 0; i < Math.floor((w - 20) / 42); i++) Kit.poly([[x + 18 + 42 * i, y - h + 26 + 62 * r], [x + 40 + 42 * i, y - h + 26 + 62 * r], [x + 40 + 42 * i, y - h + 56 + 62 * r], [x + 18 + 42 * i, y - h + 56 + 62 * r]], hzP(P.shade), { stroke: false });
    }
  }
  function lamp({ x, y, h }) {
    const col = mixCol(P.shade, P.ink, .3);
    Kit.line([[x, y], [x, y - h]], col, 12); Kit.line([[x, y - h], [x + 30, y - h - 20], [x + 60, y - h]], col, 8, { smooth: true });
    Kit.poly([[x + 44, y - h], [x + 76, y - h], [x + 70, y - h + 28], [x + 50, y - h + 28]], P.sun, { weight: 3 });
    Kit.poly([[x - 16, y], [x - 10, y - 40], [x + 10, y - 40], [x + 16, y]], col, { weight: 3 });
  }
  function fountain({ x, y, r }, t) {
    const st = P.stone, wt = mixCol(P.water, P.cloud, .3);
    Kit.poly([[x - .1 * r, y - .3 * r], [x - .07 * r, y - .92 * r], [x + .07 * r, y - .92 * r], [x + .1 * r, y - .3 * r]], st, { weight: 3 });
    Kit.poly([[x - .42 * r, y - .98 * r], [x + .42 * r, y - .98 * r], [x + .3 * r, y - .86 * r], [x - .3 * r, y - .86 * r]], st, { weight: 3 });
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {  // jatos: gotas num arco que cai do prato na bacia
      const u = frac(t * .7 + i / 8), px = x + s * (.35 + .5 * u) * r, py = y - .98 * r - .3 * r * Math.sin(Math.PI * Math.min(1, u * 1.6)) + (u > .62 ? (u - .62) * 1.8 * r : 0);
      Kit.ellipse(px, py, 7, 9, wt, { alpha: .9 });
    }
    Kit.poly([[x - r, y], [x - .95 * r, y - .32 * r], [x + .95 * r, y - .32 * r], [x + r, y]], st, { weight: 3 });
    Kit.ellipse(x, y - .32 * r, .9 * r, .06 * r, wt);
  }
  function bench({ x, seatY: y, w, back, backH }, gy) {
    const col = P.wood, dk = mixCol(P.wood, P.ink, .4), xb = x + back * .44 * w;
    for (const s of [-1, 1]) Kit.line([[x + s * .36 * w, y + 10], [x + s * .4 * w, gy]], dk, 10);
    Kit.poly([[xb - 7, y], [xb - 7 + back * 10, y - backH], [xb + 7 + back * 10, y - backH], [xb + 7, y]], col, { weight: 4 });  // encosto
    Kit.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + 14], [x - w / 2, y + 14]], col, { weight: 4 });  // assento: topo em seatY
  }
  // Flor (item): no chão, deitada com o caule para trás; segura, o caule sai da ponta da mão para cima e a flor no alto.
  function flower(it) {
    const { x, y, r } = it, [hx, hy] = it.held ? [x + .4 * r, y - 4.5 * r] : [x, y];
    Kit.line(it.held ? [[x, y], [x + .3 * r, y - 2.2 * r], [hx, hy]] : [[x - 3.6 * r, y + .8 * r], [x - 1.6 * r, y + .5 * r], [x - .5 * r, y + .2 * r]], P.leafDk, Math.max(2, .35 * r));
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + .3; Kit.ellipse(hx + Math.cos(a) * .7 * r, hy + Math.sin(a) * .7 * r, .55 * r, .55 * r, P.blush, { stroke: true }); }
    Kit.ellipse(hx, hy, .45 * r, .45 * r, P.gold);
  }
  function plaza(F) {
    const t = F.t, w = F.world, g = w.ground, gy = g(0), [x0, x1] = view(F), b = w.bench;
    Kit.gradient();
    layer(F, .1, () => [[200 + 5 * t, 150, .9, 1], [1300 + 3 * t, 90, .7, 2], [2500 + 4 * t, 170, .8, 3]].forEach(([x, y, s, sd]) => A().cloud(x, y, s, sd)));
    layer(F, .3, town, ['town', [-2600, 380, 6400, 560]]);
    Kit.cam(F.cam.cx, F.cam.cy, F.cam.z, 0, hand(t));
    A().ground(x => gy - 34 + 6 * Math.sin(x * .01), x0, x1, mixCol(P.leaf, P.skyLow, .15));  // sebe atrás da calçada
    for (const tr of w.trees) A().tree(tr.x, tr.y - 20, tr.h, .04 * wind(t, tr.x), tr.seed);
    w.lamps.forEach(lamp); fountain(w.fountain, t);
    Kit.poly([[x0, gy], [x1, gy], [x1, gy + 2000], [x0, gy + 2000]], PAVE, { weight: 4 });
    const ROWS = [0, 24, 56, 100, 166, 270], jt = mixCol(PAVE, P.ink, .25);  // juntas da calçada: fiadas mais altas para a frente
    ROWS.forEach((dy, i) => {
      if (i) Kit.line([[x0, gy + dy], [x1, gy + dy]], jt, 2.5, { smooth: false });
      const n = ROWS[i + 1], step = 110 + 50 * i; if (n === undefined) return;
      for (let k = Math.floor((x0 - 70 * i) / step); 70 * i + k * step < x1; k++) Kit.line([[70 * i + k * step, gy + dy], [70 * i + k * step, gy + n]], jt, 2.5, { smooth: false });
    });
    actors(F, 1, a => a.depth < b.depth);
    bench(b, gy);
    actors(F, 1, a => a.depth >= b.depth);
    flower(w.item);
    Kit.camEnd();
    finish(t);
  }

  // ---------- N: beira do lago ----------
  // Morros e árvores ao fundo, margem de capim, plantas (juncos, flores, tufos, uma árvore), formigueiro; os seres; a água
  // por cima do que está sob a linha d'água (patas da raposa, peixe entrando e saindo, o fundo), respingos e ondas.
  const farN = x => 560 + 60 * Math.sin(x * .0018 + 1) + 25 * Math.sin(x * .005), hillN = x => 760 + 30 * Math.sin(x * .0026 + 3);
  function reed(x, y, h, t, sd) {
    const b = .05 * wind(t, x, 4), tip = [x + b * h, y - h];
    Kit.line([[x, y], [x + .4 * b * h, y - .5 * h], tip], P.oliveDk, Math.max(3, .025 * h));
    Kit.line([[x - 4, y], [x - .18 * h, y - .45 * h]], P.olive, Math.max(3, .03 * h)); Kit.line([[x + 4, y], [x + .14 * h + b * .4 * h, y - .6 * h]], P.leafDk, Math.max(3, .03 * h));
    Kit.line([[x + .8 * b * h, y - .72 * h], [x + .95 * b * h, y - .9 * h]], P.brown, Math.max(7, .07 * h));  // taboa
  }
  function plant(q, t) {
    if (q.kind === 'tree') A().tree(q.x, q.y + 10, q.h, .04 * wind(t, q.x), q.seed);
    else if (q.kind === 'reed') reed(q.x, q.y, q.h, t, q.seed);
    else if (q.kind === 'grass') for (let i = 0; i < 7; i++) A().blade(q.x + (i - 3) * 7, q.y + 3, q.h * (.6 + .5 * hash(q.seed + i)), bladeBend(t, q.x, q.y, [], 60, 3) + .15 * (i - 3), i & 1 ? P.grass : P.grassDk);
    else flower({ x: q.x, y: q.y, r: q.h / 5.5, held: true });
  }
  function water(L, t, x0, x1) {
    const a = Math.max(L.x0, x0), y = L.waterY; if (a >= x1) return;
    const g = cur(), gr = g.createLinearGradient(0, y, 0, y + 400); gr.addColorStop(0, rgba(mixCol(P.water, P.cloud, .2), .78)); gr.addColorStop(1, rgba(mixCol(P.water, P.shade, .5), .95));
    g.fillStyle = gr; g.fillRect(a, y, x1 - a, 2000);
    Kit.line([[a, y], [x1, y]], P.cloud, 4, { smooth: false });
    for (let i = Math.floor(a / 260); i * 260 < x1; i++) { const hx = i * 260 + 90 * hash(i + 7) + 20 * Math.sin(t * .8 + i), hy = y + 25 + 70 * hash(i + 3); Kit.line([[hx, hy], [hx + 60, hy]], mixCol(P.water, P.cloud, .5), 4, { alpha: .7 }); }
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function splash(s, t) {  // coroa de gotas que sobe e cai em 1,2 s
    const u = (t - s.t0) / 1.2; if (u < 0 || u >= 1) return;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * .3, v = s.r * (1.6 + .6 * hash(i + s.x)), T = u * 1.2, x = s.x + Math.cos(a) * v * T, y = s.y + Math.sin(a) * v * T * 1.3 + 380 * T * T;
      if (y <= s.y + 4) Kit.ellipse(x, y, 6 * (1 - .5 * u), 8 * (1 - .5 * u), mixCol(P.cloud, P.water, .2));
    }
    Kit.ellipse(s.x, s.y, s.r * (.4 + .6 * u), .2 * s.r * (1 - u), P.cloud, { alpha: 1 - u });
  }
  function ripple(q, t) {
    const u = (t - q.t0) / 3; if (u < 0 || u >= 1) return;
    for (const k of [1, .6]) { const r = q.r * Math.sqrt(u) * k, g = cur(); g.save(); g.globalAlpha = (1 - u) * .9; g.beginPath(); g.ellipse(q.x, q.y + 2, r + 4, .22 * r + 2, 0, 0, TAU); g.strokeStyle = P.cloud; g.lineWidth = 3; g.stroke(); g.restore(); }
  }
  function lake(F) {
    const t = F.t, w = F.world, g = w.ground, L = w.lake, [x0, x1] = view(F), N = w.nest;
    Kit.gradient();
    layer(F, .1, () => [[300 + 5 * t, 140, .9, 4], [1500 + 3 * t, 100, .7, 5]].forEach(([x, y, s, sd]) => A().cloud(x, y, s, sd)));
    layer(F, .3, (a, b) => A().ground(farN, a, b, mixCol(P.foliage, P.skyLow, .45)), ['farN', [-1400, 420, 4200, 900]]);
    layer(F, .6, (a, b) => {
      for (let k = Math.floor(a / 170); k * 170 < b; k++) if (hash(k + 120) < .5) { const x = k * 170 + 60 * hash(k + 121); A().tree(x, hillN(x) + 10, 130 + 100 * hash(k + 122), .05 * wind(t, x), k + 70, .3); }
      A().ground(hillN, a, b, mixCol(P.leafDk, P.skyLow, .25));
    });
    Kit.cam(F.cam.cx, F.cam.cy, F.cam.z, 0, hand(t));
    A().ground(g, x0, x1);
    w.plants.forEach(q => plant(q, t));
    Kit.poly([[N.x - 1.3 * N.r, N.y + 6], [N.x - .5 * N.r, N.y - .45 * N.r], [N.x + .5 * N.r, N.y - .5 * N.r], [N.x + 1.3 * N.r, N.y + 6]], EARTH, { smooth: true, weight: 3 });
    Kit.ellipse(N.x, N.y - .12 * N.r, .35 * N.r, .12 * N.r, P.line);
    grass(t, x0, Math.min(x1, L.x0 - 60), g, 26, 14, 30, 0);
    actors(F, 1);
    water(L, t, x0, x1);
    w.ripples.forEach(q => ripple(q, t)); w.splashes.forEach(s => splash(s, t));
    Kit.camEnd();
    finish(t);
  }

  window.ExpStyle = {
    parts: (a, F) => partsOf(a.pose).map(q => ({ actor: a.id, ...q })),
    draw(F) {
      ({ close, wide, name, trail, praca: plaza, encontro: plaza, achado: plaza, banco: plaza, margem: lake, bebe: lake, chao: lake })[F.shot](F);
      for (const s of F.texts) Kit.text(s.text, s.x, s.y, s.size, P.ink, { k: s.k });
    },
  };
})();
