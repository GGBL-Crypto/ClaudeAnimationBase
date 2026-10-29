// Player de episódio: lê PROJECT.episode (montado por scripts/build-episode.mjs) e registra os planos (shotsById, para a
// prévia e o --storyboard), um LOOPS por cena distinta (a chave vem pronta em shot.key) e LOOPS.elenco (ficha do elenco).
// Depende de motion.js, timeline.js, src/nature/, kit.js e do ExpStyle.draw do estilo.
(() => {
  const E = PROJECT.episode, spec = s => ({ scene: s.scene, params: s.params, actors: s.actors, cast: E.cast });
  // Plano: o loop da cena em lt; F.t volta a ser o tempo do vídeo.
  shotsById(Object.fromEntries(E.shots.map(s => [s.id, (t, lt) => ExpStyle.draw({ ...kitFrame(spec(s), lt, s.loopLen), t })])));
  for (const s of E.shots) if (!LOOPS[s.key]) { LOOPS[s.key] = t => ExpStyle.draw(kitFrame(spec(s), t, s.loopLen)); LOOPS[s.key].len = s.loopLen; }

  // Ficha do elenco: uma coluna por pessoa (até 4), uma linha por pose (stand, walk em 4 tempos, point, sit), sobre um
  // kit neutro (dia, sem camadas nem clima) que todo estilo desenha. Cada linha tem o próprio chão.
  const ROWS = [['stand'], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['point'], ['sit']], Z = .55, CX = 960, CY = 540, COL = 640, ROW = 270;
  // Desloca em x tudo que é coordenada da pose: pares [x, y] e objetos com x.
  const shiftX = (v, dx) => Array.isArray(v) ? (v.length === 2 && typeof v[0] === 'number' ? [v[0] + dx, v[1]] : v.map(e => shiftX(e, dx)))
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, e]) => [k, k === 'x' && typeof e === 'number' ? e + dx : shiftX(e, dx)])) : v;
  const sheet = t => {
    const cast = E.cast.slice(0, 4), lt = t % 2, actors = [], rocks = [];
    cast.forEach((m, i) => ROWS.forEach(([action, beat], r) => {
      const gy = CY - 540 / Z + ROW * (r + 1) - 15, ground = () => gy, colX = CX + (i - (cast.length - 1) / 2) * COL;
      // O walk atravessa a tela (X vem da fase): escolho a fase que cai a 1/8 de passada por tempo (a pose se repete a cada meia passada) e deslocamos para a coluna.
      const walk = action === 'walk', X = 960 + (beat || 0) * .125 * humanSpec(m.body).stride * 180, phase = walk ? (X + 200) / 2320 : lt / 2;
      const a = castActor(m, action, .5, 1, phase, 12, ground, walk ? phase * 12 : lt), dx = colX - X;
      actors.push({ ...shiftX({ ...a, ground: null }, dx), ground, depth: actors.length });
      if (a.seated) rocks.push({ kind: 'rock', x: colX, y: gy, s: .25 * a.pose.size, k: 0, seed: 1 });
    }));
    const kit = { mood: 'day', seed: 0, phase: 0, sky: { stars: [], celestial: null, clouds: [] }, layers: rocks.length ? [{ kind: 'props', f: 1, items: rocks }] : [], interior: null, map: null, weather: { kind: 'clear', drops: [], fog: 0 }, lights: [] };
    return { scene: 'K', shot: 'elenco', t, lt, cam: { cx: CX, cy: CY, z: Z }, under: null, world: { ground: () => CY + 1080, kit }, actors, texts: [] };
  };
  LOOPS.elenco = t => ExpStyle.draw(sheet(t)); LOOPS.elenco.len = 2;
})();
