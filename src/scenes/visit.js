// Shared choreography only. Drawing belongs to each style's VisitArt port.
(() => {
  function pose(t) {
    const u = STYLE.character.unit, x = 800, y = 850;
    const reaction = take(t, 2.65, .16);
    const sq = .012 * Math.sin(t * 3) + reaction.sq, dy = reaction.dy;
    const squint = Math.max(0, 1 - Math.abs(t - 1.35) / .12, 1 - Math.abs(t - 3.1) / .14);
    const actor = { x, y, u, sq, dy, squint, eyes: t < 1.35 ? 'normal' : t < 3.1 ? 'wide' : 'happy',
      lookX: kf(t, [[0, 0], [.8, .8], [2.3, 0]]), lookY: -.55,
      aL: t < 4.4 ? -.35 : lerp(-.35, 1.15 + .3 * Math.sin((t - 4.4) * 13), ease(seg(t, 4.4, 4.65))), aR: -.6 };
    const head = [x, y + dy * u - STYLE.character.height * u * (1 - sq)];
    let butterfly;
    if (t < 1.6) butterfly = arcPt([1930, 360], [1120, 410], 125, ease(seg(t, .45, 1.6)));
    else if (t < 2.4) butterfly = arcPt([1120, 410], [head[0], head[1] - 8], 120, ease(seg(t, 1.6, 2.4)));
    else if (t < 3.7) butterfly = [head[0], head[1] - 8];
    else butterfly = arcPt([head[0], head[1] - 8], [2030, 170], 230, ease(seg(t, 3.7, 4.65)));
    // Integrate the two wing speeds analytically so landing/takeoff never reset phase.
    const phase = t < 2.4 ? t * 16 : t < 3.7 ? 2.4 * 16 + (t - 2.4) * 5 : 2.4 * 16 + 1.3 * 5 + (t - 3.7) * 16;
    return { actor, head, butterfly, flap: .3 + .7 * Math.abs(Math.sin(phase)), perched: t >= 2.4 && t < 3.7 };
  }
  window.visitPose = pose;
  function scene(t) {
    const state = pose(t);
    VisitArt.background(t);
    VisitArt.actor(state.actor);
    VisitArt.butterfly(...state.butterfly, state.flap);
    const d = STYLE.effects.transition;
    const openness = d > 0 ? Math.min(ease(seg(t, 0, d)), 1 - ease(seg(t, DUR - d - .08, DUR - .08))) : 1;
    if (openness < 1) VisitArt.iris(800, 680, 1700 * openness);
    window.frameDiagnostics = { time: t, head: state.head, butterfly: state.butterfly, perched: state.perched };
  }
  shots([[0, scene], [3, scene]]);
})();
