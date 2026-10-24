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
  const HD = NatureArt.decor.human, build0 = HD.build;
  HD.emoteAt = [2.3, 1.5, 2];  // emote à frente do rosto e maior: sobre a copa, a câmera fechada do susto o cortava
  HD.build = (p, L) => { const G = build0(p, L); if (L.pack) G.push({ z: 1.5, draw: () => pack(p) }, { z: 5.45, draw: () => strap(p) }); return G; };
  function frameOf(p) {
    const [ch, pe] = p.spine, l = Math.hypot(ch.x - pe.x, ch.y - pe.y) || 1, ux = (ch.x - pe.x) / l, uy = (ch.y - pe.y) / l, f = p.facing;
    return (a, b) => [pe.x + (a * -uy * f + b * ux) * p.size, pe.y + (a * ux * f + b * uy) * p.size];  // a: à frente, b: para cima, em BL
  }
  const inkOf = col => mixCol(col, '#1A0E12', .62);
  function blob(pts, col, w) {
    const n = pts.length, m = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
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

  // Ator: some se hidden; alpha ao entrar e sair de túnel; flip em torno do meio do corpo; a folha atrás de quem a leva
  // (a folha é maior que a formiga: por cima, a escondia inteira no túnel).
  function actor(a) {
    if (a.hidden || (a.alpha ?? 1) <= 0) return;
    let p = a.pose;
    c.save(); c.globalAlpha = a.alpha ?? 1;
    if (a.flip) { const m = (p.spine[0].x + p.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
    if (p.carry) { const l = p.carry; A().leafPiece(l.x, l.y, l.w, l.h, l.angle, P.leaf); p = { ...p, carry: null }; }
    A().creature(p, a.role === 'hero' ? LOOK : a.kind === 'human' ? { pack: a.gear?.includes('backpack') } : DEEP[a.role] || {});
    c.restore();
  }
  const actors = (F, f) => F.actors.filter(a => a.layer === f).forEach(a => a.role === 'hero' && F.shot === 'wide' ? glow(a) : actor(a));
  // Protagonista pequena no plano aberto: desenhada à parte e colada com um halo creme em volta da silhueta, para não
  // se perder entre as irmãs.
  const HB = document.createElement('canvas'), hbG = HB.getContext('2d'); HB.width = HB.height = 512;
  function glow(a) {
    if (a.hidden) return;
    const p = a.pose, m = c.getTransform(), x = (p.spine[0].x + p.spine.at(-1).x) / 2, y = p.spine[0].y - .3 * p.size;
    const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f;
    if (1.6 * p.size * m.a > 250) return actor(a);
    hbG.resetTransform(); hbG.clearRect(0, 0, 512, 512); hbG.setTransform(m.a, m.b, m.c, m.d, m.e - sx + 256, m.f - sy + 256);
    Kit.into(hbG, () => actor(a));
    c.save(); c.resetTransform(); c.shadowColor = 'rgba(255,246,214,.95)'; c.shadowBlur = 9;
    for (let i = 0; i < 3; i++) c.drawImage(HB, sx - 256, sy - 256); c.restore();
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
    A().soil(x0, w.soilTop, x1 - x0, 1300, 11);
    for (const p of w.tunnels) A().tunnel(pathOf(p), 34);
    for (const [x, y, cw, ch, sd] of w.chambers) A().chamber(x, y, cw, ch, sd);
    A().roots(w.roots.x, w.roots.y, w.roots.h, 1, 5);
    for (const [x, y, fw, fh, sd] of w.fungus) A().fungus(x, y, fw, fh, t, sd);
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
    draw(F) {
      ({ close, wide, name, trail })[F.shot](F);
      for (const s of F.texts) Kit.text(s.text, s.x, s.y, s.size, P.ink, { k: s.k });
    },
  };
})();
