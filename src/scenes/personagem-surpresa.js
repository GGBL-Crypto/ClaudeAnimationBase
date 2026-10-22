(() => {
 const item=()=>assetSession.items.get('menina-aquarela');
 const plate=expression=>item().draw(960,540,1,{view:'illustration',pose:'plate',expression});
 const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 function establish(t,lt){
  camBegin(960,540,1+.025*smooth(lt/1.5));plate('calm');camEnd();
 }
 function observe(t,lt){
  const q=smooth(lt/1.25);camBegin(810+5*q,320,1.70+.035*q);plate('calm');camEnd();
 }
 function react(t,lt){
  if(PROJECT.id==='personagem-camera'){
   camBegin(815,320,1.735+.025*smooth(lt/1.75));plate('calm');camEnd();
  }else{
   // Whole supplied illustration in its own shot, never a face pasted on a body.
   const q=smooth(lt/.75);camBegin(960,540,1.025-.025*q);plate('surprised');camEnd();
  }
 }
 shots([[0,establish],[1.5,observe],[2.75,react]]);
})();
