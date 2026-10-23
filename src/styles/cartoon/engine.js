// Clean vector paths. No p5, pigment, noise or pixel-grid dependency.
(() => {
  const canvas = document.getElementById('out'), c = canvas.getContext('2d'), P = STYLE.palette;
  function shape(fill, draw, stroke = true, weight = STYLE.outline.weight) {
    c.beginPath(); draw();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = P.ink; c.lineWidth = weight; c.lineJoin = c.lineCap = 'round'; c.stroke(); }
  }
  const rect = (x,y,w,h,r,fill,stroke = true) => shape(fill, () => c.roundRect(x,y,w,h,r), stroke);
  const ellipse = (x,y,rx,ry,fill,stroke = false) => shape(fill, () => c.ellipse(x,y,rx,ry,0,0,TAU), stroke);
  const line = (points, color = P.ink, width = STYLE.outline.weight) => { c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.strokeStyle = color; c.lineWidth = width; c.lineJoin = c.lineCap = 'round'; c.stroke(); };
  window.animationEngine = {
    canvas, context: c, async init() { await Promise.all(window.NatureArt?.loading || []); }, worldToScreen: (x,y) => [x,y], info: () => 'Canvas2D · vector paths',
    render(t) { c.resetTransform(); c.clearRect(0,0,W,H); c.save(); try { drawWorld(PROJECT.onTwos === true ? twosTime(t) : t); } finally { c.restore(); } }  // on ones unless the project opts into twos
  };
  window.VisitArt = {
    background(t) {
      c.fillStyle = P.sky; c.fillRect(0,0,W,H);
      for (const [x,y,s] of [[230,220,1],[1480,180,.8]]) {
        c.save(); c.translate(x + 10 * Math.sin(t * .2),y); c.scale(s,s);
        rect(-130,-25,300,75,38,P.cloud,false); ellipse(-35,-40,60,52,P.cloud); ellipse(55,-25,65,62,P.cloud); c.restore();
      }
      shape(P.ground, () => { c.moveTo(0,880); c.bezierCurveTo(550,760,1250,830,W,825); c.lineTo(W,H); c.lineTo(0,H); c.closePath(); }, false);
      for (let i=0;i<12;i++) { const x=90+i*165,y=960+hash(i)*65; line([[x-13,y-19],[x,y],[x+16+3*Math.sin(t*2+i),y-24]],P.foliage,5); }
      line([[1490,847],[1502,740],[1518,641]],P.foliage,9);
      ellipse(1472,748,36,16,P.foliage); ellipse(1533,706,37,17,P.foliage);
      for(let i=0;i<5;i++){const a=i*TAU/5; ellipse(1518+Math.cos(a)*25,633+Math.sin(a)*25,23,22,P.cloud);}
      ellipse(1518,633,18,18,P.wing);
      if (STYLE.texture.speckles) for(let i=0;i<70;i++) ellipse(hash(i)*W,890+hash(i+99)*180,2,2,P.foliage);
    },
    actor(p) {
      const {x,y,u,sq,dy} = p, width=STYLE.character.width/10, height=STYLE.character.height/8;
      if(STYLE.effects.shadow) ellipse(x,y+8,215,26,P.foliage);
      c.save(); c.translate(x,y+dy*u); c.scale((1+sq*.6)*width,(1-sq)*height);
      for (const [side, angle] of [[-1,p.aL],[1,p.aR]]) {
        c.save(); c.translate(side*4.9*u,-4.5*u); c.rotate(side<0?angle:-angle);
        rect(side<0?-2.2*u:0,-.45*u,2.2*u,.9*u,16,P.body); c.restore();
      }
      for(const lx of [-4,-2,1,3]) rect(lx*u,-2.5*u,u,2.5*u,8,P.shadow);
      rect(-5*u,-8*u,10*u,6*u,STYLE.character.radius,P.body);
      shape(P.shadow,()=>{c.moveTo(-5*u,-3.35*u); c.lineTo(5*u,-3.35*u); c.lineTo(5*u,-2.5*u); c.quadraticCurveTo(5*u,-2*u,4.5*u,-2*u); c.lineTo(-4.5*u,-2*u); c.quadraticCurveTo(-5*u,-2*u,-5*u,-2.5*u); c.closePath();},false);
      shape(null, () => c.roundRect(-5*u,-8*u,10*u,6*u,STYLE.character.radius));
      line([[-4.2*u,-7.25*u],[-1.1*u,-7.25*u]],P.light,12);
      for(const side of [-1,1]) {
        const ex=side*2.5*u+p.lookX*15,ey=-6*u,close=p.squint;
        if(close>.75) line([[ex-23,ey+12],[ex+23,ey+12]],P.ink,9);
        else if(p.eyes==='happy') line([[ex-23,ey+12],[ex,ey+12-22*(1-close)],[ex+23,ey+12]],P.ink,9);
        else { ellipse(ex,ey,22,(p.eyes==='wide'?51:38)*(1-close),P.ink); ellipse(ex-6,ey-14*(1-close),7,10*(1-close),P.eye); }
      }
      if(p.eyes==='happy') shape(null,()=>{c.moveTo(-31,-4.4*u);c.quadraticCurveTo(0,-3.9*u,31,-4.4*u);},true,7);
      c.restore();
    },
    butterfly(x,y,flap) {
      for(const side of [-1,1]) { ellipse(x+side*30*flap,y-28,34*flap,37,P.wing,true); ellipse(x+side*23*flap,y,25*flap,21,P.wingAccent,true); ellipse(x+side*36*flap,y-34,8*flap,11,P.cloud); }
      rect(x-5,y-41,10,49,5,P.ink,false); line([[x-14,y-55],[x,y-38],[x+14,y-55]],P.ink,4);
    },
    iris(x,y,r) { c.fillStyle=P.ink; c.beginPath(); c.rect(0,0,W,H); c.arc(x,y,Math.max(0,r),0,TAU,true); c.fill('evenodd'); }
  };
})();
