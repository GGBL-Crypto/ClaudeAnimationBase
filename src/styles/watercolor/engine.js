let watercolorInstance=null,watercolorOutput=null,watercolorDisposed=false;
window.animationEngine = {
  init: () => new Promise((resolve,reject) => { window.watercolorReady = () => {
    try{
      for(const item of window.assetSession?.items.values()||[])item.prepare();
      if(STYLE.output.height!==1080){watercolorOutput=document.createElement('canvas');watercolorOutput.width=1280;watercolorOutput.height=720;}
      resolve();
    }catch(error){reject(error);}
  }; const originalSetup=window.setup;window.setup=async()=>{try{await originalSetup();}catch(error){reject(error);}};p5.instance=null;watercolorInstance=new p5(); }),
  async render(t) { if(watercolorDisposed)throw Error('Motor descartado');T = t; await redraw(); composite(t);if(watercolorOutput)watercolorOutput.getContext('2d').drawImage(outC,0,0,1280,720); },
  afterScene() { CAM = null; flushLetters(); },
  get canvas() { return watercolorOutput||outC; },
  worldToScreen: (x, y) => toScreen(x, y, LAST_CAM).map(v=>v*STYLE.output.height/1080),
  releaseActorImage(img){const textures=watercolorInstance?._renderer?.textures,texture=textures?.get(img);if(!texture)return false;texture.remove();textures.delete(img);return true;},
  dispose(){if(watercolorDisposed)return;watercolorDisposed=true;window.assetSession?.dispose();for(const g of [paperG,letG,glowTex])g?.remove();watercolorInstance?.remove();if(watercolorOutput)watercolorOutput.width=watercolorOutput.height=0;},
  info() { const gl = drawingContext, ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }
};

// Port for the cross-style test film; the original clawd/demo APIs remain available.
window.VisitArt = {
  background(t) {
    boilSeed('visit sky');
    paint(rectPts(-40, -40, W + 80, H + 80), { wash: PAL.cream, ink: null });
    paint(ellPts(960, 160, 1150, 460, 32, 3), { fill: PAL.sky, fillOp: 115, bleed: .12, tex: .65, ink: null });
    boilSeed('visit ground');
    paint(ellPts(960, 1340, 1800, 530, 44, 2), { wash: PAL.sap, fill: PAL.teal, fillOp: 35, ink: null });
    for (let i = 0; i < 9; i++) {
      const x = 180 + i * 195, y = 930 + hash(i) * 100, sway = Math.sin(t * 2 + i) * 5;
      boilSeed('visit grass ' + i);
      inkLine([[x - 12, y - 20], [x, y], [x + 13 + sway, y - 34]], .65, PAL.teal, 'inkfine');
    }
    boilSeed('visit sprig');
    inkLine([[1510, 845], [1495, 740], [1520, 640]], 1.1, PAL.teal);
    paint(ellPts(1469, 735, 34, 14, 16, 1, .4), { wash: PAL.teal, ink: null });
    paint(ellPts(1536, 693, 34, 15, 16, 1, -.55), { wash: PAL.sap, ink: null });
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + t * .025; paint(ellPts(1520 + Math.cos(a) * 23, 634 + Math.sin(a) * 23, 20, 17, 14), { wash: PAL.rose, ink: null }); }
    paint(ellPts(1520, 634, 14, 14, 14), { wash: PAL.ochre, ink: null });
  },
  actor(p) { clawd(p.x, p.y, p.u, { ...p, sx: STYLE.character.width / 10, sy: STYLE.character.height / 8, mouth: p.eyes === 'happy' ? 'smile' : null, boilKey: 'visit hero' }); },
  butterfly(x, y, flap) {
    boilSeed('visit butterfly');
    for (const side of [-1, 1]) {
      paint(ellPts(x + side * 27 * flap, y - 26, 32 * flap, 36, 20, .8, side * -.25), { wash: PAL.ochre, fill: PAL.rose, fillOp: 55, ink: PAL.ink, sw: .6 });
      paint(ellPts(x + side * 19 * flap, y - 1, 23 * flap, 21, 18), { wash: PAL.rose, ink: PAL.ink, sw: .5 });
    }
    paint(ellPts(x, y - 16, 5, 24, 12), { wash: PAL.ink, ink: null });
    inkLine([[x - 12, y - 51], [x, y - 37], [x + 13, y - 51]], .45, PAL.ink);
  },
  iris
};

// ---------- brush wipe ----------
// A transition: fat paint strokes sweep across to cover the frame (p 0 → .5), then drag off (p .5 → 1).
// Cut to the next shot at p = .5, under full cover. Call it last in both shots, in screen space (outside a camera):
//   end of shot A:   if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6);
//   start of shot B: if (lt < .3) brushWipe(.5 + lt / .6);
function brushWipe(p, cols = [PAL.clayDk, PAL.clay]) {
  if (p <= 0 || p >= 1) return;
  const [c1, c2] = cols, n = 5, bh = (H + 420) / n + 40;
  push(); translate(W / 2, H / 2); rotate(-.1); translate(-W / 2, -H / 2);
  for (let i = 0; i < n; i++) {
    const y0 = -230 + i * (H + 420) / n, d = [0, .14, .06, .18, .1][i];
    const q = p < .5 ? easeOut(clamp((p * 2 - d) / (1 - d))) : ease(clamp(((p - .5) * 2 - d) / (1 - d)));
    const x0 = p < .5 ? -300 : lerp(-300, W + 400, q), x1 = p < .5 ? lerp(-300, W + 400, q) : W + 400;
    if (x1 - x0 < 30) continue;
    const pts = [], rag = k => 40 + 50 * hash(i * 31 + k) + jit(12);
    for (let k = 0; k <= 8; k++) pts.push([lerp(x0, x1, k / 8), y0 + Math.sin(k * .9 + i) * 14 + jit(5)]);
    for (let k = 1; k < 9; k++) pts.push([x1 + rag(k) - 40, y0 + bh * k / 9]);
    for (let k = 8; k >= 0; k--) pts.push([lerp(x0, x1, k / 8), y0 + bh + Math.sin(k * .8 + i * 2) * 14 + jit(5)]);
    if (p >= .5) for (let k = 8; k > 0; k--) pts.push([x0 - rag(k + 20) + 40, y0 + bh * k / 9]);
    paint(pts, { wash: i % 2 ? c1 : c2, washOp: 255, fill: i % 2 ? c2 : c1, fillOp: 70, bleed: .05, tex: .8, border: .6, ink: null,
      hatch: { d: 44, a: 0, o: { rand: .6, gradient: .5 }, b: 'charcoal', c: i % 2 ? c2 : PAL.cream, w: .8 } });
  }
  pop();
}
