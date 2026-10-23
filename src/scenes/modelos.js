// Model sheet: every creature spec walking in place (the ground scrolls), top views, a small crowd and the human's
// eight expressions (t < 4); then the leafcutter ant pilot elements (t >= 4). Review aid for NatureArt; one shot.
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
  // Page 2 (t >= 4): the leafcutter ant pilot. Above ground: the cut that vibrates, a carrier with a minima riding its
  // leaf and a phorid fly hovering then diving at it, a soldier opening its jaws, a winged queen and alates on a spiral.
  // Below, in soil: roots growing from the tree, the brood chamber (eggs, one hatching, larvae, pupae, the wingless queen
  // and her shed wings falling), the fungus garden with a growing parasite patch and the waste chamber.
  function episode(t) {
    const gy = 330, u = t - 4, labels = [], txt = (s, x, y) => labels.push([s, x, y]);
    Kit.gradient(); A().cloud(1150, 90, .6, 3);
    A().ground(() => gy, 0, W);
    A().soil(0, gy + 14, W, H - gy - 14, 7);
    A().tree(170, gy, 290, .05 * noise1(1, t * .3), 4);
    // Cut on a leaf: ripples spread from the bite (the vibration that calls helpers).
    Kit.line([[430, gy], [438, 215]], P.leafDk, 6);
    A().leafPiece(470, 200, 110, 46, -.25, P.leaf, .5);
    for (let i = 0; i < 3; i++) A().ripple(476, 180, frac(u * 1.2 + i / 3));
    txt('corte · vibração', 450, gy + 40);
    // Carrier with a minima on the leaf; the phorid hovers, dives at the rider and climbs back (2 s cycle).
    const car = walker('ant', 760, gy, 150, .8, { t, carry: { w: 1, h: .4 } });
    A().creature(car.pose); A().rider(car.pose, t, 5);
    const dive = makePath([[905, 120], [860, 160], [795, 222]]), c2 = frac(u / 2), k = c2 < .6 ? 0 : c2 < .75 ? easeIn((c2 - .6) / .15) : 1 - ease((c2 - .75) / .25);
    A().creature(creaturePose(SPECS.fly, { path: dive, s: k * dive.length / 60, size: 60, t, seed: 4 }));
    txt('carregadora + mínima · forídea', 790, gy + 40);
    A().creature(walker('soldier', 1090, gy, 160, .7, { t, seed: 6 }).pose, { jaws: .5 + .5 * Math.sin(TAU * t * .8) });
    txt('soldado', 1080, gy + 40);
    A().creature(walker('queen', 1390, gy, 230, .5, { t, seed: 2 }).pose);
    txt('rainha alada', 1400, gy + 40);
    // Alates (males and young queens) climbing a spiral.
    const spiral = makePath(Array.from({ length: 25 }, (_, i) => { const a = i / 24 * 3 * TAU; return [1720 + 120 * Math.cos(a), 290 - 180 * i / 24 + 25 * Math.sin(a)]; }));
    for (let j = 0; j < 3; j++) { const sz = [70, 60, 80][j]; A().creature(creaturePose(SPECS.alate, { path: spiral, s: (frac(u * .12 + .27 * j) * spiral.length) / sz, size: sz, t, seed: 10 + j, gait: 'fly' })); }
    txt('alados', 1720, 40);

    // Nest: tunnels, then the chambers on them, then the roots poking in.
    for (const pts of [[[640, gy + 4], [620, 420], [520, 500]], [[630, 420], [780, 560], [880, 640]], [[1230, 700], [1380, 740], [1480, 770]]]) A().tunnel(makePath(pts), 34);
    A().chamber(420, 740, 580, 260, 1);
    A().chamber(1000, 820, 560, 330, 2);
    A().chamber(1660, 840, 400, 220, 3, 1);
    A().roots(170, gy + 14, 340, clamp(u / 3), 5);
    // Brood: eggs (one hatching), larvae, pupae, and the queen without wings, her wings falling (flutter) to the floor.
    for (let i = 0; i < 4; i++) A().egg(180 + i * 22 + (i & 1) * 6, 740, 8, t, i, i === 3 ? clamp((u - 1) / 2) : 0);
    A().larva(300, 740, 50, t, 1, 1); A().larva(360, 740, 46, t, 2, -1);
    A().pupa(430, 740, 72, t, 3);
    txt('ovos · larvas · pupa', 320, 775);
    for (const s of [0, 1]) { const f = flutter(t, 4.2 + .3 * s, [560 + 40 * s, 520], 734, 20 + s); A().wing(f.x, f.y, 70, f.landed ? -.05 * s : f.angle + .3 * s); }
    A().creature(walker('queen', 590, 740, 190, .4, { t, seed: 8 }).pose, { wings: false });  // over her shed wings
    txt('rainha sem asas', 590, 775);
    A().fungus(1000, 815, 440, 250, t, 3, 1, clamp(u / 4));
    txt('jardim de fungo + parasita', 1000, 850);
    txt('câmara de lixo', 1660, 870);
    txt('raízes', 120, 700);
    for (const [s, x, y] of labels) Kit.text(s, x, y, 22, P.ink);
  }
  shots([[0, t => (t < 4 ? sheet : episode)(t)]]);
})();
