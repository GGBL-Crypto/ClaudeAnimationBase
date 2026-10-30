// Arame: chão, linhas do mundo e o esqueleto de cada ator (pose.joints/bones), na câmera de cada camada. Mostra também os
// adereços de P e N (banco, flor, lago, respingos, ondas, plantas) e o rosto em texto (expressão, boca).
// Cena K (kit de episódio, src/episode/kit.js) em contorno: fundo pela mood, céu (f = 0), camadas pela paralaxe,
// interior, mapa, clima e luzes; o livro de quem lê entre as mãos.
const MOOD = { dawn: '#f4e2d4', day: '#e8f0f4', dusk: '#ecd6cc', night: '#c4cad8', interior: '#e4d6c0' };
const GROUND = { grass: '#4a8a3a', sand: '#b08a40', stone: '#707070', snow: '#8098b0' };
function drawK(c, F, cam, line, ring) {
  const K = F.world.kit, S = K.sky, z = F.cam.z, WOOD = '#705848', LEAF = '#3a7a4a';
  const prof = (f, col, w) => { const pts = []; for (let x = -200; x <= 2120; x += 20) pts.push([x, f(x)]); line(pts, col, w); };
  const box = (x, y, w, h, col, lw = 2, fill) => { if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); } c.strokeStyle = col; c.lineWidth = lw / z; c.strokeRect(x, y, w, h); };
  const oval = (x, y, rx, ry, col, a0 = 0, a1 = TAU) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, a0, a1); c.strokeStyle = col; c.lineWidth = 2 / z; c.stroke(); };
  const flame = (x, y, h, col = '#e07020') => line([[x - h * .3, y], [x, y - h], [x + h * .3, y], [x - h * .3, y]], col, 2);
  const roof = b => {
    const { x, w } = b, y = b.y - b.h;
    if (b.roof === 'gable') line([[x - w / 2, y], [x, y - .4 * w], [x + w / 2, y]], WOOD, 2);
    else if (b.roof === 'tower') line([[x - w / 2, y], [x, y - .8 * w], [x + w / 2, y]], WOOD, 2);
    else if (b.roof === 'dome') oval(x, y, w / 2, w / 3, WOOD, Math.PI, TAU);
    else if (b.roof === 'temple') { line([[x - w / 2, y], [x, y - .18 * w], [x + w / 2, y]], WOOD, 2); for (let i = 0; i < 6; i++) { const cx = x - w * .4 + w * .16 * i; line([[cx, y + 10], [cx, b.y]], WOOD, 2); } }
  };
  const prop = o => {
    const { x, y, s } = o;
    if (o.kind === 'ship') { line([[x - s * .6, y], [x + s * .6, y], [x + s * .4, y + s * .2], [x - s * .4, y + s * .2], [x - s * .6, y]], WOOD, 2); line([[x, y], [x, y - s]], WOOD, 2); line([[x, y - s], [x + s * .4, y - s * .2], [x, y - s * .2]], '#a0a0a0', 1.5); }
    else if (o.kind === 'camel') { oval(x, y - s * .7, s * .45, s * .22, WOOD); line([[x + s * .4, y - s * .7], [x + s * .6, y - s * (1 + .08 * o.k)]], WOOD, 2); for (const d of [-.3, .3]) line([[x + d * s, y - s * .55], [x + d * s, y]], WOOD, 1.5); }
    else if (o.kind === 'column') box(x - 14, y - s, 28, s, '#908070');
    else if (o.kind === 'fire') { flame(x, y, s * (.7 + .3 * o.k)); line([[x - s * .5, y], [x + s * .5, y]], WOOD, 3); }
    else if (o.kind === 'rock') oval(x, y, s * 1.1, s, '#707070', Math.PI, TAU);
    else if (o.kind === 'fence') { for (const k of [.35, .75]) line([[o.x0, o.y - k * o.h], [o.x1, o.y - k * o.h]], WOOD, 2); for (let px = o.x0; px <= o.x1; px += 60) line([[px, o.y], [px, o.y - o.h]], WOOD, 3); }
    else if (o.kind === 'bush') oval(x, y, s * .8, s, LEAF, Math.PI, TAU);
    else if (o.kind === 'post') { line([[x, y], [x, y - o.h]], WOOD, 3); box(x - 9, y - o.h - 18, 18, 18, WOOD); }
    else if (o.kind === 'cart') { box(x - s, y - .95 * s, 1.5 * s, .45 * s, WOOD); for (const d of [-.6, .1]) ring(x + d * s, y - .3 * s, .3 * s, WOOD); line([[x + .5 * s, y - .8 * s], [x + s, y - .5 * s]], WOOD, 2); }
    else if (o.kind === 'boat') line([[x - s / 2, y - .3 * s], [x + s / 2, y - .3 * s], [x + .35 * s, y], [x - .35 * s, y], [x - s / 2, y - .3 * s]], WOOD, 2);
    else if (o.kind === 'tuft') line([[x - .4 * s, y - s], [x, y], [x, y - s], [x, y], [x + .4 * s, y - s]], LEAF, 1.5);
  };
  const win = K.interior && K.interior.window, clip = () => { cam(1); c.save(); c.beginPath(); c.rect(win.x, win.y, win.w, win.h); c.clip(); };
  if (win) clip(); else cam(0);  // no interior, céu e clima pela câmera da janela (f = 1), recortados por ela
  for (const s of S.stars) ring(s.x, s.y, s.r * (.6 + .6 * s.tw), '#606880', 1);
  if (S.celestial) { const o = S.celestial, sun = o.kind === 'sun'; ring(o.x, o.y, o.r, sun ? '#d08020' : '#6070a0', 3); ring(o.x, o.y, o.r * (1.3 + .5 * o.glow), sun ? '#e0b070' : '#9098c0', 1); }
  for (const o of S.clouds) oval(o.x, o.y, o.w / 2, o.h / 2, '#8090a0');
  if (S.meteor && S.meteor.k > 0 && S.meteor.k < 1) { const m = S.meteor, x = lerp(m.x0, m.x1, m.k), y = lerp(m.y0, m.y1, m.k); line([[x - .25 * (m.x1 - m.x0), y - .25 * (m.y1 - m.y0)], [x, y]], '#a06020', 3); }
  if (win) c.restore();
  for (const l of K.layers) {
    cam(l.f);
    if (l.kind === 'ridge' || l.kind === 'dunes' || l.kind === 'ground') prof(l.prof, l.kind === 'ground' ? GROUND[l.surface] : l.kind === 'dunes' ? '#b09050' : '#708070', l.kind === 'ground' ? 4 : 2);
    else if (l.kind === 'treeline') for (const tr of l.trees) { line([[tr.x, tr.y], [tr.x, tr.y - tr.h]], WOOD, 3); if (tr.kind === 'pine') line([[tr.x - tr.h * .22, tr.y - tr.h * .25], [tr.x, tr.y - tr.h], [tr.x + tr.h * .22, tr.y - tr.h * .25], [tr.x - tr.h * .22, tr.y - tr.h * .25]], LEAF, 2); else ring(tr.x, tr.y - tr.h * .7, tr.h * (tr.kind === 'palm' ? .2 : .3), LEAF); }
    else if (l.kind === 'buildings') for (const b of l.items) { box(b.x - b.w / 2, b.y - b.h, b.w, b.h, WOOD); roof(b); for (const w of b.windows) box(w.x, w.y, w.w, w.h, WOOD, 1, w.lit ? `rgba(240,190,60,${w.lit})` : null); }
    else if (l.kind === 'sea') { line([[-200, l.y], [2120, l.y]], '#2a70c0', 3); for (const w of l.waves) line([[w.x - w.len / 2, w.y], [w.x, w.y - 4 - 6 * w.k], [w.x + w.len / 2, w.y]], '#4a90d0', 1.5); }
    else if (l.kind === 'props') l.items.forEach(prop);
  }
  cam(1);
  if (K.interior) {
    const I = K.interior, wn = I.window;
    line([[-200, I.floorY], [2120, I.floorY]], WOOD, 4); box(wn.x, wn.y, wn.w, wn.h, WOOD, 4);
    for (const o of I.props) {
      const { x, y, s } = o;
      if (o.kind === 'table') { box(x - o.w / 2, y - s, o.w, 14, WOOD); for (const d of [-.42, .42]) line([[x + d * o.w, y - s + 14], [x + d * o.w, y]], WOOD, 3); }
      else if (o.kind === 'shelf') box(x - o.w / 2, y - s, o.w, s, WOOD);
      else if (o.kind === 'candle') { box(x - 7, y - s, 14, s, '#a09070'); flame(x, y - s, o.flame.h); }
      else if (o.kind === 'book') box(x - s / 2, y - 12, s, 12, '#8a3a2a');
      else if (o.kind === 'scroll') oval(x, y - 8, s / 2, 8, '#a08050');
      else if (o.kind === 'chair') { line([[x - .3 * s, y - s], [x + .3 * s, y - s]], WOOD, 4); for (const d of [-.3, .3]) line([[x + d * s, y - s], [x + d * s, y]], WOOD, 2); line([[x - o.dir * .3 * s, y - s], [x - o.dir * .3 * s, y - 2.4 * s]], WOOD, 3); }
    }
  }
  if (K.map) {
    const M = K.map, pp = M.paper; box(pp.x, pp.y, pp.w, pp.h, '#a08050', 4, '#efe4c8');
    if (M.border) box(pp.x + 14, pp.y + 14, pp.w - 28, pp.h - 28, '#a08050', 2);
    for (const co of M.coasts) line([...co, co[0]], '#506070', 2);
    for (const w of M.waves) line([[w.x - 12, w.y], [w.x - 6, w.y - 5], [w.x, w.y], [w.x + 6, w.y - 5], [w.x + 12, w.y]], '#4a90d0', 1.5);
    for (const o of M.peaks) line([[o.x - .6 * o.s, o.y], [o.x, o.y - o.s], [o.x + .6 * o.s, o.y]], '#706050', 2);
    for (const o of M.woods) { ring(o.x, o.y - .6 * o.s, .35 * o.s, LEAF); line([[o.x, o.y], [o.x, o.y - .25 * o.s]], WOOD, 2); }
    { const { x, y, r } = M.compass; ring(x, y, r, '#506070'); line([[x, y - r], [x, y + r]], '#506070', 2); line([[x - r, y], [x + r, y]], '#506070', 2); line([[x - 8, y - r + 16], [x, y - r], [x + 8, y - r + 16]], '#802020', 3); }
    for (const m of M.marks) ring(m.x, m.y, 10, '#802020', 3);
    if (M.route) {  // trecho da rota até a fração k do comprimento
      const P = M.route.pts, d = P.slice(1).map((q, i) => Math.hypot(q[0] - P[i][0], q[1] - P[i][1])); let left = M.route.k * d.reduce((a, b) => a + b, 0); const pts = [P[0]];
      for (let i = 0; i < d.length && left > 0; i++) { const u = Math.min(1, left / d[i]); pts.push([lerp(P[i][0], P[i + 1][0], u), lerp(P[i][1], P[i + 1][1], u)]); left -= d[i]; }
      line(pts, '#c03020', 4);
    }
  }
  for (const l of K.lights) { cam(l.f); ring(l.x, l.y, l.r * (.2 + .3 * l.k), '#e0a020', 1); }
  if (win) clip(); else cam(1);
  for (const d of K.weather.drops) if (K.weather.kind === 'rain') line([[d.x, d.y], [d.x - 3, d.y - 26 * d.k]], '#5070a0', 1.5); else ring(d.x, d.y, 2 + 2 * d.k, '#7080a0', 1.5);
  if (K.weather.fog) { c.fillStyle = `rgba(255,255,255,${.5 * K.weather.fog})`; if (win) c.fillRect(win.x, win.y, win.w, win.h); else { c.resetTransform(); c.fillRect(0, 0, W, H); } }
  if (win) c.restore();
  c.resetTransform();
}
window.ExpStyle = {
  draw(F) {
    const c = animationEngine.context, { cx, cy, z } = F.cam, cam = f => { c.setTransform(z, 0, 0, z, (lerp(960, cx, f) * -z) + 960, -cy * z + 540); };
    c.fillStyle = F.under ? '#d8c8b0' : F.world.kit ? MOOD[F.world.kit.mood] : '#e8f0f4'; c.fillRect(0, 0, W, H);
    const line = (pts, col, w) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = col; c.lineWidth = w / z; c.stroke(); };
    const ring = (x, y, r, col, w = 2) => { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, TAU); c.strokeStyle = col; c.lineWidth = w / z; c.stroke(); };
    if (F.world.kit) drawK(c, F, cam, line, ring);
    cam(1); const x0 = cx - W / z, x1 = cx + W / z, Wd = F.world, g = Wd.ground, gl = [];
    for (let x = x0; x <= x1; x += 20) gl.push([x, g(x)]);
    if (!Wd.kit) line(gl, '#4a8a3a', 3);  // o kit desenha o próprio chão
    if (Wd.lake) { const L = Wd.lake; line([[Math.max(L.x0, x0), L.waterY], [Math.min(L.x1, x1), L.waterY]], '#2a70c0', 3); }
    for (const p of Wd.tunnels || []) line(p, '#8a6a4a', 2);
    for (const [x, y, w, h] of Wd.chambers || []) { c.strokeStyle = '#8a6a4a'; c.lineWidth = 2 / z; c.strokeRect(x - w / 2, y - h, w, h); }
    for (const tr of Wd.trees || []) line([[tr.x, tr.y], [tr.x, tr.y - tr.h]], '#7a9a6a', 6);
    for (const pl of Wd.plants || []) line([[pl.x, pl.y], [pl.x, pl.y - pl.h]], '#5aa04a', 3);
    if (Wd.log) { const L = Wd.log, pts = []; for (let x = L.x0; x <= L.x1; x += 10) pts.push([x, L.top(x)]); line(pts, '#8a5a2a', 3); }
    if (Wd.bench) { const b = Wd.bench, l = b.x - b.w / 2, r = b.x + b.w / 2; line([[l, b.seatY], [r, b.seatY]], '#8a5a2a', 6); for (const x of [l + 10, r - 10]) line([[x, b.seatY], [x, g(x)]], '#8a5a2a', 4); if (b.back) line([[b.x + b.back * b.w / 2, b.seatY - b.backH], [b.x + b.back * b.w / 2, b.seatY]], '#8a5a2a', 4); else line([[l, b.seatY - b.backH], [r, b.seatY - b.backH]], '#8a5a2a', 4); }
    if (Wd.item) ring(Wd.item.x, Wd.item.y, Wd.item.r, '#e04090', 4);
    for (const e of [...(Wd.splashes || []), ...(Wd.ripples || [])]) { const a = F.t - e.t0; ring(e.x, e.y, e.r * (.3 + a), '#2a70c0'); }
    const ink = a => a.role === 'hero' ? '#e0352b' : a.air ? '#2050c0' : '#202020';
    for (const a of F.actors) {
      if (a.hidden) continue;
      cam(a.layer); const P = a.pose, col = ink(a), J = P.joints;
      if (a.flip) { const m = (P.spine[0].x + P.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
      c.globalAlpha = a.alpha ?? 1;
      if (J) {
        for (const b of P.bones) if (b.name !== 'head') line([J[b.a], J[b.b]], /thigh|shin|foot|upper$|lower$|tip$/.test(b.name) && P.limbs[b.name.replace(/(thigh|shin|foot)([LR])/, 'leg$2').split('.')[0]]?.stance ? '#209040' : col, b.name.includes('spine') ? 4 : 2);
        const r = Math.hypot(J.headTop[0] - J.headBase[0], J.headTop[1] - J.headBase[1]) / 2; ring(J.head[0], J.head[1], r, col);
      } else line(P.spine.map(q => [q.x, q.y]), col, 4);
      for (const ap of Object.values(P.appendages)) line(ap, col, 1.5);
      if (P.wings) { const s = P.size * .5 * (P.wings.open ? Math.cos(TAU * P.wings.phase) : .3); line([[P.spine[0].x, P.spine[0].y], [P.spine[0].x - P.facing * .2 * P.size, P.spine[0].y - s]], '#2050c0', 2); }
      if (a.holds === 'book' && J) { const [x, y] = [(J.handL[0] + J.handR[0]) / 2, (J.handL[1] + J.handR[1]) / 2], s = .08 * P.size; c.strokeStyle = '#8a3a2a'; c.lineWidth = 2 / z; c.strokeRect(x - s, y - s * .7, 2 * s, s * .7); }
      if (P.carry) { c.save(); c.translate(P.carry.x, P.carry.y); c.rotate(P.carry.angle); c.strokeStyle = '#3a9a3a'; c.strokeRect(-P.carry.w / 2, -P.carry.h / 2, P.carry.w, P.carry.h); c.restore(); }
      if (a.kind === 'human' && J) { c.fillStyle = '#000'; c.font = `${14 / z}px sans-serif`; c.fillText(`${P.face.expression[0]}${P.face.mouth || ''}${P.face.blink > .5 ? '-' : ''}`, J.headTop[0], J.headTop[1] - 6 / z); }
      c.globalAlpha = 1; c.resetTransform();
    }
    c.resetTransform(); c.fillStyle = '#000'; c.font = '28px sans-serif';
    c.fillText(`${F.shot} t=${F.t.toFixed(2)}`, 20, 40);
    for (const s of F.texts) if (s.k > 0) { c.globalAlpha = s.k; c.font = `${s.size}px sans-serif`; c.fillText(s.text, s.x - 300, s.y); c.globalAlpha = 1; }
  },
  // O que draw desenha de cada ser (contrato em check-motion.mjs): ossos em traço reto (butt) e a cabeça em círculo.
  parts(a, F) {
    const P = a.pose, J = P.joints, z = F.cam.z;
    if (!J) return [];
    return [...P.bones.filter(b => b.name !== 'head').map(b => ({ actor: a.id, name: b.name, from: b.a, to: b.b, pts: [J[b.a], J[b.b]], r: (b.name.includes('spine') ? 2 : 1) / z, cap: 'butt' })),
      { actor: a.id, name: 'head', from: 'headBase', to: null, pts: [J.headBase, J.headTop], r: Math.hypot(J.headTop[0] - J.headBase[0], J.headTop[1] - J.headBase[1]) / 2, cap: 'round' }];
  },
};
