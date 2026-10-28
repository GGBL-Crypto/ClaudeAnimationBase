// Arame: chão, linhas do mundo e o esqueleto de cada ator (pose.joints/bones), na câmera de cada camada. Mostra também os
// adereços de P e N (banco, flor, lago, respingos, ondas, plantas) e o rosto em texto (expressão, boca).
window.ExpStyle = {
  draw(F) {
    const c = animationEngine.context, { cx, cy, z } = F.cam, cam = f => { c.setTransform(z, 0, 0, z, (lerp(960, cx, f) * -z) + 960, -cy * z + 540); };
    c.fillStyle = F.under ? '#d8c8b0' : '#e8f0f4'; c.fillRect(0, 0, W, H);
    const line = (pts, col, w) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = col; c.lineWidth = w / z; c.stroke(); };
    const ring = (x, y, r, col, w = 2) => { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, TAU); c.strokeStyle = col; c.lineWidth = w / z; c.stroke(); };
    cam(1); const x0 = cx - W / z, x1 = cx + W / z, Wd = F.world, g = Wd.ground, gl = [];
    for (let x = x0; x <= x1; x += 20) gl.push([x, g(x)]);
    line(gl, '#4a8a3a', 3);
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
      if (P.carry) { c.save(); c.translate(P.carry.x, P.carry.y); c.rotate(P.carry.angle); c.strokeStyle = '#3a9a3a'; c.strokeRect(-P.carry.w / 2, -P.carry.h / 2, P.carry.w, P.carry.h); c.restore(); }
      if (a.kind === 'human' && J) { c.fillStyle = '#000'; c.font = `${14 / z}px sans-serif`; c.fillText(`${P.face.expression[0]}${P.face.mouth || ''}${P.face.blink > .5 ? '-' : ''}`, J.headTop[0], J.headTop[1] - 6 / z); }
      c.globalAlpha = 1; c.resetTransform();
    }
    c.resetTransform(); c.fillStyle = '#000'; c.font = '28px sans-serif';
    c.fillText(`${F.shot} t=${F.t.toFixed(2)}`, 20, 40);
    for (const s of F.texts) if (s.k > 0) { c.globalAlpha = s.k; c.font = `${s.size}px sans-serif`; c.fillText(s.text, s.x - 300, s.y); c.globalAlpha = 1; }
  },
};
