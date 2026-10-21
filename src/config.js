// Projects and executable storyboards. Add a new entry for each film.
// duration = seconds; bpm/offset = shared rhythm; fps = export rate.
AnimationPlatform.registerProject({
  id: 'demo', title: 'A estrela caída · original', story: 'Clawd devolve uma estrela ao céu.',
  duration: 11, fps: 24, bpm: 120, offset: 0, style: 'watercolor', compatibleStyles: ['watercolor'],
  scripts: ['src/scenes/demo.js'], reviewTimes: [.5, 2.5, 4.4, 5.7, 7.6, 10.6],
  storyboard: [
    { id: 'fall', start: 0, end: 4.4, event: 'A estrela cai; Clawd acorda e a segue.', transition: 'Íris de entrada; pincel na saída', reads: [{ start: 0, end: 1.9, text: 'A queda' }, { start: 1.9, end: 4.4, text: 'Surpresa, ideia e caminhada' }] },
    { id: 'return', start: 4.4, end: 11, event: 'Clawd devolve a estrela e se despede.', transition: 'Pincel; íris de saída', reads: [{ start: 4.4, end: 7.1, text: 'Encontrar, erguer e lançar' }, { start: 7.1, end: 8.35, text: 'Voo e chegada' }, { start: 8.35, end: 11, text: 'Reação e despedida' }] }
  ]
});
AnimationPlatform.registerProject({
  id: 'visit', title: 'Uma visita', story: 'Uma borboleta pousa na cabeça de Clawd; a surpresa vira alegria e uma despedida.',
  duration: 6, fps: 24, bpm: 100, offset: 0, style: 'watercolor', compatibleStyles: ['watercolor', 'cartoon', 'pixel'],
  scripts: ['src/scenes/visit.js'], reviewTimes: [.35, .9, 1.6, 2.35, 2.8, 3.35, 3.9, 4.4, 4.9, 5.4, 5.7, 5.95], styleOptions: { watercolor: { outline: { weight: .65 } } },
  storyboard: [
    { id: 'arrival', start: 0, end: 3, event: 'A visitante chega e pousa.', transition: 'Íris de entrada', reads: [
      { start: 0, end: .5, text: 'O jardim' }, { start: .5, end: 1.3, text: 'A borboleta chega' }, { start: 1.3, end: 2, text: 'Clawd percebe a visitante' }, { start: 2, end: 2.6, text: 'O pouso' }, { start: 2.6, end: 3, text: 'Contato e surpresa' }
    ] },
    { id: 'goodbye', start: 3, end: 6, event: 'A borboleta parte e Clawd acena.', transition: 'Continuidade de pose; íris de saída', reads: [
      { start: 3, end: 3.7, text: 'Alegria' }, { start: 3.7, end: 4.4, text: 'A partida' }, { start: 4.4, end: 5.4, text: 'O aceno' }, { start: 5.4, end: 6, text: 'Despedida e fechamento' }
    ] }
  ]
});
