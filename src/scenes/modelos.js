// Model sheet: every creature spec walking in place (the ground scrolls), top views, a small crowd and the human's
// eight expressions. Review aid for NatureArt; one shot.
(() => {
  const P = STYLE.palette, A = () => NatureArt;
  // A creature walking in place at screen x = X: the path slides back by s, so planted feet move with the ground marks.
  function walker(id, X, y, size, speed, o = {}) {
    const s = 1 + speed * o.t, sPx = s * size, path = makePath([[X - sPx, y], [X - sPx + 8000, y]]);
    const pose = creaturePose(SPECS[id], { path, s, size, ground: () => y, seed: 3, ...o });
    return { pose, mark: k => X - sPx + k }; // mark(d): screen x of the ground point at path distance d
  }
  function sideCell(id, label, X, y, size, speed, t, x0, x1, ly = y + 30) {
    const w = walker(id, X, y, size, speed, { t });
    for (let k = Math.ceil((x0 - w.mark(0)) / 60); w.mark(k * 60) < x1; k++) A().blade(w.mark(k * 60), y + 2, 14 + 12 * hash(k), .2 * noise1(k, t), P.grassDk);
    A().creature(w.pose);
    Kit.text(label, X, ly, 24, P.ink);
  }
  function topCell(id, label, X, y, size, speed, t, marks = true) {
    const w = walker(id, X, y, size, speed, { t, view: 'top' });
    if (marks) for (let k = Math.ceil((X - 230 - w.mark(0)) / 70); w.mark(k * 70) < X + 230; k++) for (const j of [-1, 1]) Kit.ellipse(w.mark(k * 70 + 30 * hash(k + j)), y + j * (70 + 30 * hash(k * 3 + j)), 7, 4, P.groundDk);
    A().creature(w.pose);
    Kit.text(label, X, y - 120, 24, P.ink);
  }
  // Tiny walkers (size < 28 px) in a clipped strip: the simplified crowd form.
  function crowdStrip(id, x0, x1, y, size, n, speed, view, t) {
    const c = animationEngine.context, path = makePath([[x0 - 40, y], [x1 + 40, y]]);
    c.save(); c.beginPath(); c.rect(x0, y - 60, x1 - x0, 90); c.clip();
    for (const a of crowd(path, t, n, 9, { speed, spacing: (path.length / n) * .9, sizeVar: .15 })) {
      const sz = size * a.size;
      A().creature(creaturePose(SPECS[id], { path, s: a.s / sz, size: sz, view, ground: () => y, t, seed: a.seed, carry: id === 'ant' && a.carry ? { w: 1.1, h: .7 } : null }),
        id === 'human' ? { shirt: [P.cloth, P.wingAccent, P.leaf][a.seed % 3] } : {});
    }
    c.restore();
  }

  const EXPRESSIONS = ['neutral', 'happy', 'sad', 'scared', 'angry', 'surprised', 'tired', 'dead'];
  function sheet(t) {
    Kit.gradient();
    A().cloud(300, 120, .8, 1); A().cloud(1500, 90, .6, 2);
    const gy = 380;
    A().ground(() => gy, 0, W);
    sideCell('human', 'human', 150, gy, 250, .9, t, 20, 280);
    sideCell('dog', 'dog', 520, gy, 250, 1.2, t, 290, 700);
    sideCell('bird', 'bird', 800, gy, 150, 1, t, 710, 890);
    sideCell('spider', 'spider', 1040, gy, 150, 1, t, 900, 1170);
    sideCell('ant', 'ant', 1320, gy, 230, 1, t, 1180, 1460);
    const fly = walker('bird', 1040, 170, 130, 1.5, { t, gait: 'fly' }); A().creature(fly.pose); Kit.text('bird · fly', 1040, 250, 22, P.ink);
    crowdStrip('human', 1480, 1900, gy, 24, 9, 30, 'side', t); Kit.text('crowd < 28 px', 1690, gy + 30, 24, P.ink);

    topCell('dog', 'dog · top', 300, 570, 230, 1.2, t);
    topCell('ant', 'ant · top', 720, 570, 230, 1, t);
    crowdStrip('ant', 60, 900, 680, 20, 14, 25, 'top', t);
    A().water(960, 440, W, t);
    sideCell('fish', 'fish', 1210, 580, 220, .8, t, 0, 0, 470);
    topCell('fish', 'fish · top', 1660, 580, 200, .8, t, false);

    // Model band on a plain ground: Lia and Bento standing in profile, then Lia's eight expressions.
    const c = animationEngine.context; c.fillStyle = P.skyLow; c.fillRect(0, 730, W, H - 730); Kit.line([[0, 730], [W, 730]], P.ink, 6);
    // Lia shows the other glove poses (pointing, fist; the expressions keep the open hand) and a talking mouth (a, then o).
    A().creature(walker('human', 120, 1060, 215, 0, { t, moving: 0, seed: 3, hands: { armL: 'point', armR: 'fist' }, mouth: t < 2 ? 'a' : 'o' }).pose); Kit.text('Lia', 22, 1050, 22, P.ink);
    A().creature(walker('dog', 560, 1060, 330, 0, { t, moving: 0, seed: 3 }).pose); Kit.text('Bento', 560, 752, 24, P.ink);
    EXPRESSIONS.forEach((e, i) => {
      const X = 868 + i * 140, w = walker('human', X, 1062, 200, 0, { t, moving: 0, expression: e, seed: 3 });
      A().creature(w.pose); Kit.text(e, X + 10, 752, 22, P.ink);
    });
  }
  shots([[0, sheet]]);
})();
