// O farol que nadava. Choreography belongs to this film; no backend changes.
(() => {
  let world;
  window.oceanPose=t=>({
    submarine:{
      position:[kf(t,[[0,-2.7],[3,-.7],[3.8,-.65],[4.7,-1.12],[5.4,-1.12],[8,.65]]),1.55+.04*Math.sin(t*2)+.5*ease(seg(t,5.5,8)),0],
      rotation:[kf(t,[[0,0],[3.6,0],[4.1,.2],[4.8,-.08],[5.4,-.08],[6.6,-.22],[8,-.16]]),Math.PI/2-.18*ease(seg(t,6,8)),.035*Math.sin(t*1.4)],
      propellerPhase:LowpolyComponents.phaseAt(t,[[0,15],[3,5],[3.8,-6],[4.8,0],[5.5,12]])
    },
    creature:{position:[1.75+1.15*ease(seg(t,5.4,8)),1.22+.12*Math.sin(t*2.5)+.85*ease(seg(t,3.6,4.35))+.35*ease(seg(t,5.4,8)),-.2-.55*ease(seg(t,5.4,8))],rotation:[0,0,.09*Math.sin(t*1.8)],phase:t*3,brightness:.3+.7*ease(seg(t,1.9,3))},
    camera:t<3?{from:[2,3.4,9.8],to:[1.5,3.1,8.8],target:[-.45,1.1,0],amount:ease(seg(t,0,3))}:
      t<5.4?{from:[2.9,2.7,7.4],to:[2.6,2.9,7.6],target:[.35,1.5,0],amount:ease(seg(t,3,5.4))}:
      {from:[3.6,3.5,9],to:[4.8,4.1,10],target:[.95,1.55,-.2],amount:ease(seg(t,5.4,8))}
  });
  window.buildLowpolyScene=art=>{
    const C=LowpolyComponents,kit=C.createKit(art);
    C.underwaterLight(kit);C.ground(kit,40,.25);
    C.rockField(kit,[
      {position:[-5,.8,-3.7],scale:[2.2,1.3,1.8]},
      {position:[0,.5,-4.5],scale:[2,.8,1.4]},
      {position:[5,1,-3.5],scale:[2.4,1.7,1.5]}
    ],'ridge');
    C.rockField(kit,[
      {position:[1.75,.28,-.4],scale:[.9,.45,.7]},
      {position:[-3.6,.2,1.8],scale:[.7,.35,.5]},
      {position:[4.2,.3,1.7],scale:[.8,.5,.7]},
      {position:[-1,.12,-1.8],scale:[.4,.2,.3]},
      {position:[3.4,.16,-1.8],scale:[.5,.25,.4]}
    ]);
    const kelp=C.createKelp(kit,[{position:[-3.7,0,-.8],height:2,phase:1},{position:[-4.3,0,-1.6],height:2.5,phase:2},{position:[4,0,-1],height:2.3,phase:3},{position:[4.6,0,-1.7],height:1.8,phase:4}]);
    const bubbles=C.createBubbles(kit,Array.from({length:6},(_,i)=>({position:[-4+i*1.7,(i*.77)%4,-1.2-i%2],size:.035+(i%3)*.012})));
    const submarine=C.createSubmarine(kit),creature=C.createJellyfish(kit);
    world={pose(t){
      const p=oceanPose(t);submarine.apply(p.submarine);creature.apply(p.creature);kelp.apply(t);bubbles.apply(t);
      C.cameraMove(art,p.camera.from,p.camera.to,p.camera.target,p.camera.amount);
      window.oceanDiagnostics={t,submarine:p.submarine,creature:p.creature,camera:p.camera};
    }};
  };
  window.disposeLowpolyScene=()=>{world=null;};
  shots([[0,t=>world.pose(t)],[3,t=>world.pose(t)],[5.4,t=>world.pose(t)]]);
})();
