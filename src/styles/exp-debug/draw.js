// Arame: chão, linhas do mundo e o esqueleto de cada ator (creaturePose), na câmera de cada camada.
window.ExpStyle = {
  draw(F) {
    const c = animationEngine.context, { cx, cy, z } = F.cam, cam = f => { c.setTransform(z, 0, 0, z, (lerp(960, cx, f) * -z) + 960, -cy * z + 540); };
    c.fillStyle = F.under ? '#d8c8b0' : '#e8f0f4'; c.fillRect(0, 0, W, H);
    const line = (pts, col, w) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = col; c.lineWidth = w / z; c.stroke(); };
    cam(1); const x0 = cx - W / z, x1 = cx + W / z, g = F.world.ground, gl = [];
    for (let x = x0; x <= x1; x += 20) gl.push([x, g(x)]);
    line(gl, '#4a8a3a', 3);
    for (const p of F.world.tunnels || []) line(p, '#8a6a4a', 2);
    for (const [x, y, w, h] of F.world.chambers || []) { c.strokeStyle = '#8a6a4a'; c.lineWidth = 2 / z; c.strokeRect(x - w / 2, y - h, w, h); }
    for (const a of F.actors) {
      if (a.hidden) continue;
      cam(a.layer); const P = a.pose, col = a.role === 'hero' ? '#e0352b' : a.kind === 'fly' ? '#2050c0' : '#202020';
      if (a.flip) { const m = (P.spine[0].x + P.spine.at(-1).x) / 2; c.translate(m, 0); c.scale(a.flip, 1); c.translate(-m, 0); }
      c.globalAlpha = a.alpha ?? 1;
      line(P.spine.map(q => [q.x, q.y]), col, 4);
      for (const l of Object.values(P.limbs)) line([l.root, l.mid, l.end], l.stance ? '#209040' : col, 2);
      for (const ap of Object.values(P.appendages)) line(ap, col, 1.5);
      c.beginPath(); c.arc(P.head.x, P.head.y, SPECS[P.spec].head.r * P.size, 0, TAU); c.strokeStyle = col; c.lineWidth = 2 / z; c.stroke();
      if (P.carry) { c.save(); c.translate(P.carry.x, P.carry.y); c.rotate(P.carry.angle); c.strokeStyle = '#3a9a3a'; c.strokeRect(-P.carry.w / 2, -P.carry.h / 2, P.carry.w, P.carry.h); c.restore(); }
      c.globalAlpha = 1; c.resetTransform();
    }
    c.resetTransform(); c.fillStyle = '#000'; c.font = '28px sans-serif';
    c.fillText(`${F.shot} t=${F.t.toFixed(2)} ${F.actors[F.actors.length - 1]?.pose.face?.expression || ''}`, 20, 40);
    for (const s of F.texts) if (s.k > 0) { c.globalAlpha = s.k; c.font = `${s.size}px sans-serif`; c.fillText(s.text, s.x - 300, s.y); c.globalAlpha = 1; }
  },
};
