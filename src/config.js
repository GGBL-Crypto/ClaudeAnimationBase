// Projects and executable storyboards. Add a new entry for each film.
// duration = seconds; bpm/offset = shared rhythm; fps = export rate.
AnimationPlatform.registerProject({
  id:'ocean-encounter',title:'O farol que nadava',story:'Lume explora o fundo do oceano, confunde uma água-viva com um farol e recua quando ela se move; a curiosidade o faz acompanhá-la.',
  duration:8,fps:12,bpm:90,offset:0,style:'lowpoly-3d',compatibleStyles:['lowpoly-3d'],scripts:['src/scenes/ocean-encounter.js'],
  reviewTimes:[0,.8,1.8,2.8,3,3.6,4,4.6,5.3,5.4,6.2,7,7.7],
  styleOptions:{'lowpoly-3d':{
    palette:{sky:'#092E42',ground:'#28676C',sand:'#438E87',ridge:'#174953',rock:'#235560',body:'#DDA746',joint:'#273F51',visor:'#64B9CA',glow:'#88F3D9',accent:'#D66B50'},
    lighting:{ambient:1.1,key:2,position:{x:-4,y:8,z:3},stone:1.3},
    effects:{shadows:false},camera:{position:{x:2,y:3.4,z:9.8},endPosition:{x:4.8,y:4.1,z:10},target:{x:-.45,y:1.1,z:0}}
  }},
  storyboard:[
    {id:'explore',start:0,end:3,event:'Lume avança entre rochas e algas e avista um brilho.',transition:'Travelling de aproximação; corte para a descoberta',reads:[{start:0,end:1,text:'O explorador e o fundo do oceano'},{start:1,end:2.3,text:'Exploração'},{start:2.3,end:3,text:'Um farol parece acender'}]},
    {id:'encounter',start:3,end:5.4,event:'A água-viva sobe; o submarino freia e recua.',transition:'Corte motivado pelo movimento',reads:[{start:3,end:3.7,text:'Localizar o brilho'},{start:3.7,end:4.3,text:'O farol está vivo!'},{start:4.3,end:5.4,text:'Recuo e hesitação'}]},
    {id:'follow',start:5.4,end:8,event:'A criatura se afasta; Lume inclina a proa e a acompanha.',transition:'Câmera abre para os dois viajantes',reads:[{start:5.4,end:6.2,text:'A água-viva convida pelo movimento'},{start:6.2,end:7.3,text:'Curiosidade vence o susto'},{start:7.3,end:8,text:'Dois exploradores seguem juntos'}]}
  ]
});
AnimationPlatform.registerProject({
  id:'mars-discovery',title:'Um sinal na poeira',story:'Um pequeno robô explora Marte, encontra uma pedra luminosa e reage à descoberta.',
  duration:3,fps:12,bpm:96,offset:0,style:'lowpoly-3d',compatibleStyles:['lowpoly-3d'],scripts:['src/scenes/mars-discovery.js'],
  reviewTimes:[0,.5,11/12,1,17/12,20/12,21/12,26/12,2.5,35/12],
  storyboard:[{id:'discovery',start:0,end:3,event:'O robô caminha, percebe o brilho e se encanta.',transition:'Plano contínuo; aproximação suave',reads:[
    {start:0,end:1,text:'Explorar: dois passos no solo de Marte'},
    {start:1,end:1.75,text:'Perceber: parar e examinar a pedra'},
    {start:1.75,end:3,text:'Descobrir: surpresa e curiosidade'}
  ]}]
});
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
