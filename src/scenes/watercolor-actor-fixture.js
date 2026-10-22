// Original technical fixture authored for this pilot. Not professional illustration.
(() => {
 const ell=(x,y,rx,ry,n=32)=>Array.from({length:n},(_,i)=>[x+Math.cos(i/n*Math.PI*2)*rx,y+Math.sin(i/n*Math.PI*2)*ry]);
 const skin='#DCA17D',ink='#59454D',teal='#659B96',hair='#70515A',cream='#EBDAB9';
 const polygon=(points,color)=>({points,color}),line=points=>({points,color:ink,line:true});
 const art={
  torso:{size:[240,300],shapes:[polygon([[64,16],[99,2],[140,2],[180,25],[211,90],[226,260],[196,286],[37,286],[15,257],[29,89]],teal),polygon([[85,6],[156,6],[148,54],[122,73],[91,53]],cream),line([[121,82],[118,267]])]},
  head:{size:[200,220],shapes:[polygon([[82,179],[118,179],[119,216],[80,216]],skin),polygon(ell(100,105,80,96),skin),polygon(ell(29,118,15,22),skin),polygon(ell(171,118,15,22),skin)]},
  hairBack:{size:[240,250],shapes:[polygon([[26,230],[13,136],[20,55],[57,16],[123,3],[180,22],[222,72],[223,167],[205,240],[177,227],[147,244],[110,225],[68,241]],hair)]},
  hairFront:{size:[220,120],shapes:[polygon([[17,85],[23,43],[64,7],[118,2],[174,21],[204,62],[208,104],[172,72],[155,43],[127,67],[89,83],[58,76],[32,104]],hair),line([[55,57],[91,46],[120,23]])]},
  lock:{size:[60,190],shapes:[polygon([[8,16],[37,6],[49,60],[40,118],[52,168],[27,181],[14,145],[16,88]],hair)]},
  upper:{size:[90,160],shapes:[polygon(ell(45,74,31,69),teal)]},
  lower:{size:[76,140],shapes:[polygon(ell(38,69,24,64),teal),polygon([[15,111],[61,111],[61,130],[15,130]],cream)]},
  hand:{size:[72,85],shapes:[polygon(ell(36,43,22,33),skin),polygon(ell(14,36,10,16),skin),line([[31,18],[31,38]]),line([[43,17],[43,37]])]},
  neutral:{size:[140,100],shapes:[line([[22,24],[38,21],[49,25]]),line([[91,25],[105,21],[119,24]]),polygon(ell(36,39,4,7),ink),polygon(ell(105,39,4,7),ink),line([[65,39],[61,56],[70,59]]),line([[55,76],[84,76]])]},
  smile:{size:[140,100],shapes:[line([[22,24],[38,21],[49,25]]),line([[91,25],[105,21],[119,24]]),polygon(ell(36,39,4,7),ink),polygon(ell(105,39,4,7),ink),line([[65,39],[61,56],[70,59]]),line([[50,70],[60,79],[73,81],[87,72]])]},
  blinkNeutral:{size:[140,100],shapes:[line([[22,24],[38,21],[49,25]]),line([[91,25],[105,21],[119,24]]),line([[25,40],[36,44],[47,40]]),line([[94,40],[105,44],[116,40]]),line([[65,39],[61,56],[70,59]]),line([[55,76],[84,76]])]},
  blinkSmile:{size:[140,100],shapes:[line([[22,24],[38,21],[49,25]]),line([[91,25],[105,21],[119,24]]),line([[25,40],[36,44],[47,40]]),line([[94,40],[105,44],[116,40]]),line([[65,39],[61,56],[70,59]]),line([[50,70],[60,79],[73,81],[87,72]])]}
 };
 const part=(id,image,parent,pivot,offset,z,rotation=[-.3,.3])=>({id,image:image+'.png',parent,pivot,offset,z,rotation});
 const parts=[
  part('torso','torso',null,[120,280],[0,0],5,[-.05,.05]),
  part('head','head','torso',[100,190],[0,-260],10,[-.12,.12]),
  part('hairBack','hairBack','head',[120,205],[0,0],0,[-.08,.08]),
  part('upperLeft','upper','torso',[45,30],[-95,-222],2,[-.3,.3]),
  part('lowerLeft','lower','upperLeft',[38,20],[0,110],3,[-.3,.3]),
  part('handLeft','hand','lowerLeft',[36,20],[0,100],4,[-.3,.3]),
  part('upperRight','upper','torso',[45,30],[95,-222],2,[-.9,.2]),
  part('lowerRight','lower','upperRight',[38,20],[0,110],6,[-1.3,.2]),
  part('handRight','hand','lowerRight',[36,20],[0,100],7,[-.4,.4]),
  {...part('face','neutral','head',[70,50],[0,-70],12,[0,0]),variants:{neutral:'neutral.png',smile:'smile.png',blinkNeutral:'blinkNeutral.png',blinkSmile:'blinkSmile.png'}},
  part('hairFront','hairFront','head',[110,70],[0,-140],14,[-.08,.08]),
  part('lock','lock','head',[30,20],[-76,-100],13,[-.12,.12])
 ];
 parts.find(p=>p.id==='head').anchors={eyes:[0,-81],neck:[0,0]};
 globalThis.WatercolorFixture={art,actor:{schemaVersion:1,size:[500,500],composition:'scene-order-paper-grain',views:{front:{poses:{greeting:{parts}}}}},identity:{name:'Iara — fixture técnica original',modelVersion:'1.0.2',paletteVersion:'1.0.0',proportionsVersion:'1.0.0',palette:[skin,ink,teal,hair,cream]}};
})();
