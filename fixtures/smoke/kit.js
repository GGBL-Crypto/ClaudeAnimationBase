// Cena de fumaça do kit de episódio (só testes e test:visual): 8 planos de 1 s, um por cena de src/episode/kit.js, com
// as 4 horas, chuva, neve e névoa. Cada plano mostra 1 s do loop de 12 s a partir de 5,5 s (quem anda está no meio da
// tela). Monta o quadro F da cena K, que os estilos com episodeScenes desenham com ExpStyle.draw. LOOPS.kit = o loop
// inteiro do campo à noite, com chuva, vaga-lumes e fazenda, para a emenda. LOOPS.cast = a prova de elenco (EST.CAST).
var EST = (() => {
  const L = 12, OFF = 5.5;
  const cast = [
    { id: 'viajante', body: 'adult', colors: { skin: '#c68a62', hair: '#3a2a1e', shirt: '#3f6e9a', pants: '#4a4036', accent: '#b82e30' }, gear: ['backpack', 'scarf'], hair: 'short' },
    { id: 'leitor', body: 'elder', colors: { skin: '#e0b48e', hair: '#d8d4cc', shirt: '#8a4a3a', pants: '#3a3a44' }, gear: ['hat'], hair: 'bald' },
    { id: 'crianca', body: 'child', colors: { skin: '#a8714c', hair: '#1e1a18', shirt: '#e0b040', pants: '#2e5a46', accent: '#b82e30' }, hair: 'spiky' },
  ];
  const walk = dir => ({ cast: 'viajante', action: 'walk', dir }), sit = (action, at, dir) => ({ cast: 'leitor', action, at, dir });
  const SHOTS = [
    { scene: 'campo', params: { time: 'dawn', weather: 'clear', seed: 11, framing: 'wide', extras: ['farm'] }, actors: [walk(1), sit('sit', .3, 1)] },
    { scene: 'ceu-noturno', params: { time: 'night', weather: 'clear', seed: 22, framing: 'wide', extras: ['moon', 'meteor'] }, actors: [walk(-1), sit('sit', .72, -1)] },
    { scene: 'mar', params: { time: 'day', weather: 'rain', seed: 33, framing: 'wide', extras: ['lighthouse', 'ship'] }, actors: [walk(1), sit('read', .25, 1)] },
    { scene: 'floresta', params: { time: 'dusk', weather: 'fog', seed: 44, framing: 'mid', extras: ['campfire'] }, actors: [walk(1), sit('sit', .58, -1)] },
    { scene: 'deserto', params: { time: 'day', weather: 'clear', seed: 55, framing: 'wide', extras: ['ruins', 'caravan'] }, actors: [walk(-1), sit('read', .35, 1)] },
    { scene: 'cidade-antiga', params: { time: 'dusk', weather: 'snow', seed: 66, framing: 'wide', extras: ['temple', 'wall'] }, actors: [walk(1), sit('sit', .2, 1)] },
    { scene: 'interior-vela', params: { time: 'night', weather: 'snow', seed: 77, framing: 'wide', extras: ['book', 'scroll'] }, actors: [sit('read', .42, 1), { cast: 'crianca', action: 'point', at: .8, dir: -1 }] },
    { scene: 'mapa', params: { time: 'day', weather: 'clear', seed: 88, framing: 'wide', extras: ['route'] }, actors: [] },
  ].map(s => ({ ...s, cast }));
  const LOOP = { scene: 'campo', params: { time: 'night', weather: 'rain', seed: 11, framing: 'wide', extras: ['fireflies', 'farm'] }, actors: [walk(1), sit('sit', .3, 1)], cast };
  // Prova de elenco (LOOPS.cast): os 5 corpos com chapéu, mochila, capuz e capacete, 3 por plano de 2 s no campo de dia
  // (o último à noite), nas ações do kit. CAST = a lista de planos.
  const crew = [...cast,
    { id: 'ferreira', body: 'heavy', colors: { skin: '#5a3a28', hair: '#111111', shirt: '#7a5a3a', pants: '#3a3a44' }, gear: ['helmet'], hair: 'bun' },
    { id: 'vigia', body: 'thin', colors: { skin: '#e0b48e', hair: '#3a2a1e', shirt: '#6a2e3a', pants: '#2e2a26', accent: '#d8b040' }, gear: ['hood', 'cape'], hair: 'long' }];
  const day = seed => ({ time: 'day', weather: 'clear', seed, framing: 'wide', extras: [] }), A = (c, action, at, dir) => ({ cast: c, action, at, dir });
  const CAST = [
    [day(101), [A('viajante', 'stand', .5, 1), A('leitor', 'sit', .2, 1), A('crianca', 'point', .8, -1)]],
    [day(102), [A('viajante', 'walk', .5, 1), A('ferreira', 'stand', .25, 1), A('vigia', 'look-up', .75, -1)]],
    [day(103), [A('viajante', 'point', .45, 1), A('leitor', 'read', .2, 1), A('crianca', 'look-up', .78, -1)]],
    [day(104), [A('viajante', 'look-up', .3, 1), A('ferreira', 'walk', .5, -1), A('vigia', 'point', .75, -1)]],
    [day(105), [A('viajante', 'stand', .3, -1), A('crianca', 'walk', .5, 1), A('ferreira', 'sit', .8, -1)]],
    [{ ...day(106), time: 'night' }, [A('viajante', 'walk', .5, -1), A('leitor', 'stand', .25, 1), A('vigia', 'read', .8, -1)]],
    [day(107), [A('viajante', 'run', .5, 1), A('crianca', 'cheer', .25, 1), A('leitor', 'talk', .85, -1)]],
    [day(108), [A('ferreira', 'kneel', .25, 1), A('vigia', 'cower', .5, 1), A('leitor', 'lie', .75, -1)]],
  ].map(([params, actors]) => ({ scene: 'campo', params, actors, cast: crew }));
  // Plano i em [i, i + 1): o loop da cena no tempo OFF + lt; F.t volta a ser o tempo do vídeo.
  function frame(scene, t) {
    const i = Math.min(SHOTS.length - 1, Math.floor(t + 1e-9));
    return { ...kitFrame(SHOTS[i], OFF + t - i, L), t };
  }
  return { frame, times: {}, specs: {}, SHOTS, LOOP, CAST, L, OFF };
})();
// Fora do navegador (verificador de movimento) não há timeline.
if (typeof shotsById === 'function') {
  shotsById(Object.fromEntries(EST.SHOTS.map((s, i) => [s.scene, t => ExpStyle.draw(EST.frame('K', t))])));
  LOOPS.kit = t => ExpStyle.draw(kitFrame(EST.LOOP, t, EST.L)); LOOPS.kit.len = EST.L;
  // Plano i em [2i, 2i + 2), mostrado do tempo de loop OFF (quem anda passa pelo meio da tela).
  LOOPS.cast = t => { const i = Math.min(EST.CAST.length - 1, Math.floor(t / 2 + 1e-9)); ExpStyle.draw({ ...kitFrame(EST.CAST[i], EST.OFF + t - 2 * i, EST.L), t }); }; LOOPS.cast.len = 2 * EST.CAST.length;
}
