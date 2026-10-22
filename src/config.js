// Projects and executable storyboards. Add a new entry for each film.
// duration = seconds; bpm/offset = shared rhythm; fps = export rate.
for(const variant of ['surpresa','camera'])AnimationPlatform.registerProject({
 id:'personagem-'+variant,title:variant==='surpresa'?'Algo além da página':'Controle — câmera na ilustração',
 story:'Uma menina tranquila percebe algo fora do enquadramento e se surpreende. Piloto local de ilustrações fornecidas pelo usuário.',
 duration:4.5,fps:12,bpm:80,offset:0,style:'watercolor',compatibleStyles:['watercolor'],scripts:['src/scenes/personagem-surpresa.js'],
 assetRefs:[{id:'menina-aquarela',version:'1.0.1',manifestSha256:'c8a5471b9260d22aa2f6d128d043c7bb595a5975390e4e6667afe05ccdd803d2'}],
 styleOptions:{watercolor:{output:{height:720},palette:{paper:'#FAF9F4'},texture:{paper:false,grain:false,boil:12,jitter:0}}},
 reviewTimes:[0,.75,17/12,1.5,2.25,32/12,2.75,3,3.75,53/12],
 storyboard:[
  {id:'calma',start:0,end:1.5,event:'Apresentar corpo inteiro e tranquilidade.',transition:'Aproximação leve; corte para plano médio',reads:[{start:0,end:.75,text:'Identidade e roupa'},{start:.75,end:1.5,text:'Calma e direção do olhar'}]},
  {id:'percebe',start:1.5,end:2.75,event:'Enquadrar a atenção sugerida para fora da página.',transition:'Corte motivado para reação; olhar original fixo',reads:[{start:1.5,end:2.25,text:'Atenção fora de quadro'},{start:2.25,end:2.75,text:'Pausa antes da reação'}]},
  {id:'reage',start:2.75,end:4.5,event:variant==='surpresa'?'Busto surpreso original.':'Controle permanece na ilustração calma.',transition:'Recuo delicado e sustentação final',reads:[{start:2.75,end:3.5,text:variant==='surpresa'?'Ler olhos e boca surpresos':'Controle sem expressão nova'},{start:3.5,end:4.5,text:'Registrar a reação e sustentar'}]}
 ]
});
for(const height of [720,1080])for(const variant of ['procedural','assets'])AnimationPlatform.registerProject({
 id:`watercolor-actor-${variant}-${height}`,title:`Um cumprimento no jardim · ${variant} · ${height}p`,story:'Iara percebe uma visita, sorri e faz um pequeno cumprimento. Fixture técnica original.',
 duration:2.5,fps:height===720?12:24,bpm:90,offset:0,style:'watercolor',compatibleStyles:['watercolor'],
 scripts:['src/scenes/watercolor-actor-fixture.js',{src:'src/scenes/watercolor-actor-sample.js',type:'module'},'src/scenes/watercolor-actor.js'],
 ...(variant==='assets'?{assetRefs:[{id:'iara-watercolor-fixture',version:'1.0.2',manifestSha256:'57a2ad291b66fbcde8ff72e738b95a5118da6eb05b10a1eabba13b784d7f40cc'}]}:{}),
 styleOptions:{watercolor:{output:{height},outline:{weight:.65}}},reviewTimes:[0,.25,.5,.625,.75,1.1,1.4,1.75,2,2.25,2.4583333333333335],
 storyboard:[{id:'greeting',start:0,end:2.5,event:'Respiração, piscada, sorriso e cumprimento com acomodação do cabelo.',transition:'Plano contínuo; sustentações no início e fim',reads:[{start:0,end:.5,text:'Respiração'},{start:.5,end:.75,text:'Piscada e sorriso'},{start:.75,end:1.2,text:'Cabeça acompanha'},{start:1.2,end:2.05,text:'Cumprimento'},{start:2.05,end:2.5,text:'Acomodação'}]}]
});
for(const variant of ['a','b'])AnimationPlatform.registerProject({
 id:'articulated-delivery-'+variant,title:'Entrega inesperada · '+variant.toUpperCase(),story:'Um robô caminha até uma caixa; uma luz salta dela e ele reage com surpresa e reprovação.',
 duration:8,fps:24,bpm:90,offset:0,style:'lowpoly-3d',compatibleStyles:['lowpoly-3d'],scripts:['src/scenes/articulated-delivery.js'],reviewTimes:[0,.6,1.2,2.4,2.875,3.4,3.9,4,4.6,5.6,6.5,7.9],
 assetRefs:[{id:'expressive-robot',version:'1.0.1',manifestSha256:'c70805c1f8f2a0f24e045bc4d2af60890a1af8430ebdeb506bf3cbf2d3f4e244'}],
 styleOptions:{'lowpoly-3d':{palette:{sky:'#182C3B',ridge:'#355567'},lighting:{ambient:2.4,key:3.2,position:{x:5,y:6,z:7}},assets:{enabled:true,toneMapping:'aces',exposure:1},effects:{shadows:true,shadowSize:512}}},
 storyboard:[
  {id:'approach',start:0,end:4,event:'O robô se aproxima da caixa; o sinal salta dela.',transition:'Corte motivado para a reação',reads:[{start:0,end:1,text:'Robô e encomenda'},{start:1,end:2.875,text:'Caminhada'},{start:2.875,end:3.3,text:'Parada'},{start:3.3,end:4,text:'O sinal inesperado'}]},
  {id:'reaction',start:4,end:8,event:'O robô se assusta, nega com a cabeça e volta ao neutro.',transition:'Sustentação final',reads:[{start:4,end:5.2,text:'Surpresa'},{start:5.2,end:7,text:'Reprovação'},{start:7,end:8,text:'Retorno ao neutro'}]}
 ]
});
for(const variant of ['p0','p1','p2'])AnimationPlatform.registerProject({
  id:'quality-space-'+variant,title:'Bancada orbital · '+variant.toUpperCase(),story:'Um veículo de exploração paira sobre a bancada e gira lentamente para inspeção de sua construção.',
  duration:2,fps:12,bpm:90,offset:0,style:'lowpoly-3d',compatibleStyles:['lowpoly-3d'],scripts:['src/scenes/quality-space.js'],reviewTimes:[0,.5,1,1.5,23/12],
  ...(variant==='p0'?{}:{assetRefs:[{id:'kenney-space-speeder',version:'1.0.0',manifestSha256:'b743a500b483d0e9e43b2f830ff9e097093d47f25d456fad486427d55d275d07'}]}),
  styleOptions:{'lowpoly-3d':{palette:{sky:'#101D29',ridge:'#263C48'},lighting:{ambient:1.7,key:2.8},texture:{bitmaps:variant!=='p0'},assets:{enabled:variant!=='p0',toneMapping:variant==='p2'?'aces':'none',exposure:1},effects:{shadows:true,shadowSize:512}}},
  storyboard:[{id:'presentation',start:0,end:2,event:'O veículo paira e apresenta seus volumes em um arco de rotação de 28 graus.',transition:'Plano contínuo de inspeção',reads:[{start:0,end:.6,text:'Silhueta e construção'},{start:.6,end:1.4,text:'Materiais e detalhes durante a rotação'},{start:1.4,end:2,text:'Estabilização e leitura final'}]}]
});
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
