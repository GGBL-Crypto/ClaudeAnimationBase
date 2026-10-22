(() => {
 const fixture=WatercolorFixture,assetMode=PROJECT.id.includes('-assets-');
 const ease01=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 window.watercolorActorPose=t=>{
  const up=ease01((t-1.2)/.55),down=ease01((t-2.05)/.45),gesture=up*(1-down),smile=t>=.625;
  // Expression drawings switch only while the eyes are closed, avoiding a double face.
  const blink=t>=.50&&t<.75;
  return {view:'front',pose:'greeting',expression:blink?(smile?'blinkSmile':'blinkNeutral'):(smile?'smile':'neutral'),transforms:{
   torso:{sy:1+.008*Math.sin(t*Math.PI*1.8),sx:1-.003*Math.sin(t*Math.PI*1.8)},
   head:{rotation:.045*Math.sin(t*2.5)-.035*ease01((t-.75)/.55)},
   upperLeft:{rotation:.035*Math.sin(t*2+.4)},lowerLeft:{rotation:.025*Math.sin(t*2-.3)},
   upperRight:{rotation:-.62*gesture+.025*Math.sin(t*2)},lowerRight:{rotation:-1.05*gesture},
   handRight:{rotation:gesture*.16*Math.sin((t-1.5)*12)},
   lock:{rotation:.065*Math.sin(t*3-.8)+.035*gesture},hairBack:{rotation:.02*Math.sin(t*3-1)},hairFront:{rotation:.008*Math.sin(t*3-.5)}
  }};
 };
 function drawProcedural(parts){
  flushBrush();push();translate(960,910);scale(1.12);
  for(const p of parts){push();applyMatrix(...p.matrix);translate(-p.pivot[0],-p.pivot[1]);boilSeed('fixture '+p.id);
   for(const shape of fixture.art[p.file.replace('.png','')].shapes){if(shape.line)inkLine(shape.points,.6,shape.color);else paint(shape.points,{wash:shape.color,ink:'#59454D',sw:.35});}
   pop();
  }pop();
 }
 window.watercolorPilotDraw=parts=>drawProcedural(parts);
 shots([[0,t=>{
  const pose=watercolorActorPose(t);camBegin(960,650,1.10+.015*t/2.5);
  VisitArt.background(t);
  boilSeed('fixture shadow');paint(ellPts(960,941,270,32,32),{fill:PAL.teal,fillOp:42,ink:null});
  let parts;
  if(assetMode){const item=assetSession.items.get('iara-watercolor-fixture');parts=item.draw(960,910,1.12,pose);}
  else {parts=window.sampleWatercolorFixture(pose);drawProcedural(parts);}
  // Foreground pigment after PNGs proves scene ordering; rear grass remains behind them.
  boilSeed('fixture foreground');inkLine([[1190,1000],[1178,889],[1210,835]],.8,PAL.teal);
  paint(ellPts(1191,883,29,10,20,0,-.5),{wash:PAL.sap,ink:null});
  camEnd();window.watercolorActorDiagnostics={pose,parts,camera:LAST_CAM};
 }]]);
})();
