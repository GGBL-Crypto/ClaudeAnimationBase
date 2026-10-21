// Purpose-built block sprites and a palette-quantized low resolution framebuffer.
(() => {
  const canvas=document.getElementById('out'), output=canvas.getContext('2d'), buffer=document.createElement('canvas');
  const scale=STYLE.texture.scale, P=STYLE.palette; buffer.width=W/scale; buffer.height=H/scale;
  const c=buffer.getContext('2d',{willReadFrequently:true}), rgb=Object.values(P).map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
  function box(x,y,w,h,col) { const b=STYLE.outline.weight; rect(x-b,y-b,w+2*b,h+2*b,P.ink); rect(x,y,w,h,col); }
  function segment(x0,y0,x1,y1,col,w=1) {
    const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));
    for(let i=0;i<=n;i++)rect(lerp(x0,x1,i/n),lerp(y0,y1,i/n),w,w,col);
  }
  function quantize() {
    const frame=c.getImageData(0,0,buffer.width,buffer.height), d=frame.data;
    for(let i=0;i<d.length;i+=4){ let best=rgb[0],dist=Infinity; for(const color of rgb){const q=(d[i]-color[0])**2+(d[i+1]-color[1])**2+(d[i+2]-color[2])**2;if(q<dist){dist=q;best=color;}} d[i]=best[0];d[i+1]=best[1];d[i+2]=best[2];d[i+3]=255; }
    c.putImageData(frame,0,0);
  }
  window.animationEngine={
    canvas, buffer, context:c, async init(){}, worldToScreen:(x,y)=>[x,y], info:()=> 'Canvas2D · '+buffer.width+'×'+buffer.height+' · nearest neighbor',
    render(t){c.resetTransform();c.clearRect(0,0,buffer.width,buffer.height);drawWorld(onTwos(t));quantize();output.imageSmoothingEnabled=false;output.drawImage(buffer,0,0,W,H);}
  };
  window.VisitArt={
    background(t){
      rect(0,0,buffer.width,buffer.height,P.sky);
      // Coordinate design at 320×180; changing grid scale still preserves world framing.
      c.save();c.scale(6/scale,6/scale);
      for(const [x,y]of [[34,36],[243,27]]){rect(x-15,y,49,9,P.cloud);rect(x-8,y-5,30,6,P.cloud);rect(x,y-11,12,8,P.cloud);}
      rect(0,141,320,39,P.ground);rect(0,140,68,2,P.foliage);rect(69,139,82,2,P.foliage);rect(152,140,78,2,P.foliage);rect(231,139,89,2,P.foliage);
      if(STYLE.texture.dither)for(let i=0;i<150;i++){const x=Math.floor(hash(i)*320),y=146+Math.floor(hash(i+431)*33);rect(x,y,1,1,P.foliage);if(i%3===0)rect(x+1,y+1,1,1,P.ground);}
      for(let i=0;i<9;i++){const x=15+i*35,y=156+Math.floor(hash(i)*16);segment(x-2,y-3,x,y,P.foliage);segment(x,y,x+2,y-4,P.foliage);}
      segment(250,140,253,107,P.foliage,2);rect(244,121,7,3,P.foliage);rect(254,116,7,3,P.foliage);
      rect(249,103,9,9,P.cloud);rect(246,106,15,3,P.cloud);rect(252,100,3,15,P.cloud);rect(251,105,5,5,P.wing);
      c.restore();
    },
    actor(p){
      const ux=p.u/scale*STYLE.character.width/10*(1+p.sq*.6),uy=p.u/scale*STYLE.character.height/8*(1-p.sq),x=p.x/scale,y=(p.y+p.dy*p.u)/scale;
      if(STYLE.effects.shadow){rect(x-34,y,68,3,P.foliage);rect(x-28,y+3,55,1,P.foliage);}
      for(const [side,a]of [[-1,p.aL],[1,p.aR]]){
        const ax=x+side*4.9*ux,ay=y-4.5*uy,bx=ax+side*Math.cos(a)*2.2*ux,by=ay-Math.sin(a)*2.2*uy;
        segment(ax,ay,bx,by,P.ink,Math.max(3,Math.round(uy)));segment(ax+1,ay+1,bx,by,P.body,Math.max(1,Math.round(uy)-2));
      }
      for(const lx of[-4,-2,1,3])box(x+lx*ux,y-2.3*uy,ux,2.3*uy,P.shadow);
      box(x-5*ux,y-8*uy,10*ux,6*uy,P.body);
      rect(x-5*ux,y-3.4*uy,10*ux,1.4*uy,P.shadow);rect(x-4.6*ux,y-7.6*uy,4*ux,.45*uy,P.light);
      for(const side of[-1,1]){
        const ex=x+side*2.5*ux+p.lookX*2,ey=y-6*uy;
        if(p.squint>.75)rect(ex-3,ey,7,1,P.ink);
        else if(p.eyes==='happy'){const top=ey+1-Math.round(2*(1-p.squint));segment(ex-3,ey+1,ex,top,P.ink,2);segment(ex,top,ex+3,ey+1,P.ink,2);}
        else {const h=(p.eyes==='wide'?2.5:2)*uy*(1-p.squint);rect(ex-.5*ux,ey-h/2,ux,h,P.ink);if(h>4)rect(ex-1,ey-h/2+1,1,2,P.eye);}
      }
      if(p.eyes==='happy'){rect(x-4,y-4.4*uy,1,2,P.ink);rect(x-3,y-4.4*uy+2,6,1,P.ink);rect(x+3,y-4.4*uy,1,2,P.ink);}
    },
    butterfly(x,y,flap){
      const cx=Math.round(x/scale),cy=Math.round(y/scale),f=flap*6/scale,s=6/scale;
      for(const side of[-1,1]){
        const left=side<0?cx-9*f:cx+1;
        box(left,cy-9*s,8*f,6*s,P.wing);rect(side<0?cx-7*f:cx+2*f,cy-10*s,5*f,2*s,P.wing);
        box(side<0?cx-6*f:cx+1,cy-3*s,5*f,4*s,P.wingAccent);rect(side<0?cx-6*f:cx+4*f,cy-8*s,2*f,2*s,P.cloud);
      }
      rect(cx,cy-7*s,1*s,8*s,P.ink);segment(cx,cy-7*s,cx-2*s,cy-10*s,P.ink);segment(cx,cy-7*s,cx+2*s,cy-10*s,P.ink);
    },
    iris(x,y,r){const cx=x/scale,cy=y/scale,rr=r/scale;c.fillStyle=P.ink;for(let yy=0;yy<buffer.height;yy++)for(let xx=0;xx<buffer.width;xx++)if((xx-cx)**2+(yy-cy)**2>rr*rr)c.fillRect(xx,yy,1,1);}
  };
})();
