// Cena de fumaça do kit de episódio (só testes e test:visual): 8 planos de 1 s, um por cena de src/episode/kit.js, com
// as 4 horas, chuva, neve e névoa. Cada plano mostra 1 s do loop de 12 s a partir de 5,5 s (quem anda está no meio da
// tela). Monta o quadro F da cena K, que os estilos com episodeScenes desenham com ExpStyle.draw. LOOPS.kit = o loop
// inteiro do campo à noite, com chuva, vaga-lumes e fazenda, para a emenda.
var EST = (() => {
  const L = 12, OFF = 5.5;
  const cast = [
    { id: 'viajante', body: 'adult', colors: { skin: '#c68a62', hair: '#3a2a1e', shirt: '#3f6e9a', pants: '#4a4036' }, gear: ['backpack'] },
    { id: 'leitor', body: 'elder', colors: { skin: '#e0b48e', hair: '#d8d4cc', shirt: '#8a4a3a', pants: '#3a3a44' }, gear: ['hat'] },
    { id: 'crianca', body: 'child', colors: { skin: '#a8714c', hair: '#1e1a18', shirt: '#e0b040', pants: '#2e5a46' } },
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
  // Plano i em [i, i + 1): o loop da cena no tempo OFF + lt; F.t volta a ser o tempo do vídeo.
  function frame(scene, t) {
    const i = Math.min(SHOTS.length - 1, Math.floor(t + 1e-9));
    return { ...kitFrame(SHOTS[i], OFF + t - i, L), t };
  }
  return { frame, times: {}, specs: {}, SHOTS, LOOP, L };
})();
// Fora do navegador (verificador de movimento) não há timeline.
if (typeof shotsById === 'function') {
  shotsById(Object.fromEntries(EST.SHOTS.map((s, i) => [s.scene, t => ExpStyle.draw(EST.frame('K', t))])));
  LOOPS.kit = t => ExpStyle.draw(kitFrame(EST.LOOP, t, EST.L)); LOOPS.kit.len = EST.L;
}
