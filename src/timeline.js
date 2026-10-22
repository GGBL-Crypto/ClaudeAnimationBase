// timeline.js: engine-independent shot list and standalone loops.
//
// shots([[t0, fn], [t1, fn], ...]) registers shots in time order. Each fn(t, lt, dur) is called with t = video time,
// lt = time since the shot started, dur = the shot's length. It paints the WHOLE frame, background included, and must be
// a pure function of t: frames render in parallel and out of order, so nothing may carry over from one frame to the next.

const SHOTS = [];
function shots(list) {
  for (const entry of list) {
    if (!Array.isArray(entry) || entry.length !== 2 || !Number.isFinite(entry[0]) || entry[0] < 0 || entry[0] >= DUR || typeof entry[1] !== 'function') throw new Error('Plano inválido');
    if (SHOTS.some(shot => shot[0] === entry[0])) throw new Error(`Dois planos começam em ${entry[0]}`);
    SHOTS.push(entry);
  }
  SHOTS.sort((a, b) => a[0] - b[0]);
}
// shotsById({id: fn}): como shots(), mas o início vem do storyboard pelo ID do plano.
function shotsById(map) {
  shots(Object.entries(map).map(([id, fn]) => {
    const shot = PROJECT.storyboard.find(s => s.id === id);
    if (!shot) throw new Error(`Plano desconhecido: ${id}`);
    return [shot.start, fn];
  }));
}
function validateShots() {
  if (SHOTS.length !== PROJECT.storyboard.length || SHOTS.some((shot, i) => shot[0] !== PROJECT.storyboard[i].start)) throw new Error('Cenas e storyboard têm cortes diferentes');
}

// Standalone loops (model sheets, GIFs, tests), outside the main timeline: window.LOOP = LOOPS[name] swaps the whole
// frame for that function, called with loop time. Give each a length: LOOPS.x = t => { ... }; LOOPS.x.len = 4;
const LOOPS = {};

function drawWorld(t) {
  if (window.LOOP) window.LOOP(t);
  else if (!SHOTS.length) throw new Error('Nenhuma cena registrada');
  else {
    let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++;
    const t0 = SHOTS[i][0], end = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : DUR;
    SHOTS[i][1](t, t - t0, end - t0);
  }
  animationEngine.afterScene?.();
}
