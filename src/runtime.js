// Common capture API: backends own their drawing context and expose a canvas.
(() => {
  let rendering = false;
  const load = loadAnimationScript;
  window.renderAt = async (t, type = 'image/png', quality = .92, options) => {
    if (!Number.isFinite(t) || t < 0 || t > (window.LOOP?.len || PROJECT.duration)) throw new Error(`Tempo fora do vídeo: ${t}`);
    if (rendering) throw new Error('Um quadro já está sendo renderizado nesta página');
    rendering = true;
    try { await animationEngine.render(t, options); return animationEngine.canvas.toDataURL(type, quality); }
    finally { rendering = false; }
  };
  window.renderSheet = async (times, cols = 3, width = 640, crop = null, at = null) => {
    if (!times.length || !Number.isInteger(cols) || cols < 1 || !Number.isInteger(width) || width < 1) throw new Error('Folha de contato inválida');
    if (at && crop) throw new Error('Escolha crop ou crop-at');
    const dimensions = { W: animationEngine.canvas.width, H: animationEngine.canvas.height };
    if (at?.length === 5) {
      if (AnimationPlatform.styles[PROJECT.style].dimensions !== 3) throw new Error('Recorte XYZ exige um motor 3D');
      at = at.map(value => CropMath.expression(value, dimensions));
      CropMath.rectangle([at[0], at[1], at[3], at[4]], dimensions);
    } else if (at) at = CropMath.rectangle(at, dimensions);
    if (crop) crop = CropMath.rectangle(crop, dimensions);
    const [cw, ch] = (at || crop || [0, 0, dimensions.W, dimensions.H]).slice(-2);
    if (!(cw > 0 && ch > 0)) throw new Error('Recorte inválido');
    const height = Math.round(width * ch / cw), sheet = document.createElement('canvas');
    sheet.width = cols * width; sheet.height = Math.ceil(times.length / cols) * height;
    const ctx = sheet.getContext('2d'), ms = []; ctx.imageSmoothingEnabled = PROJECT.style !== 'pixel';
    for (const [i, t] of times.entries()) {
      const start = performance.now(); await renderAt(t); ms.push(Math.round(performance.now() - start));
      const [cx, cy] = at ? animationEngine.worldToScreen(...at.slice(0, at.length - 2)).map((v, j) => v - (j ? ch : cw) / 2) : crop || [0, 0];
      const x = i % cols * width, y = Math.floor(i / cols) * height;
      ctx.drawImage(animationEngine.canvas, cx, cy, cw, ch, x, y, width, height);
      ctx.fillStyle = '#1b1820'; ctx.fillRect(x, y, 80, 23); ctx.fillStyle = '#ffffff'; ctx.font = '14px sans-serif'; ctx.fillText(`${t.toFixed(2)}s`, x + 6, y + 16);
    }
    return { url: sheet.toDataURL('image/jpeg', .92), ms };
  };
  window.gpuInfo = () => animationEngine.info();
  window.projectInfo = () => ({ ...PROJECT, width: animationEngine.canvas.width, height: animationEngine.canvas.height, duration: window.LOOP?.len || PROJECT.duration, engine: animationEngine.info() });
  window.disposeAnimation = () => { window.stopPreview?.(); window.animationEngine?.dispose?.(); window.ready = false; };
  addEventListener('pagehide', () => disposeAnimation());
  addEventListener('animationerror', event => { window.ready=false;window.stopPreview?.();document.getElementById('error').textContent=event.detail; });
  async function boot() {
    const params = new URLSearchParams(location.search);
    // p5 installs a PROJECT='square' drawing constant on window. Keep film settings lexical.
    window.projectConfig = AnimationPlatform.resolveProject(params.get('project') || 'demo', params.get('style') || undefined);
    if (AnimationPlatform.styles[projectConfig.style].dimensions !== 3 && ['resolution', 'projection', 'shadows'].some(key => params.has(key))) throw new Error('Resolução/projeção/sombras opcionais são exclusivas de motores 3D');
    await load('src/motion.js'); await load('src/timeline.js');
    for (const src of AnimationPlatform.styles[PROJECT.style].scripts) await load(src);
    for (const src of PROJECT.scripts) await load(src);
    validateShots();
    if (params.has('loop')) {
      window.LOOP = LOOPS[params.get('loop')]; if (!window.LOOP) throw new Error(`Loop indisponível neste estilo: ${params.get('loop')}`);
    }
    await animationEngine.init(); window.ready = true;
    if (!params.has('render')) initPreview();
  }
  boot().catch(error => {
    disposeAnimation();
    window.bootError = error.message;
    document.getElementById('error').textContent = `Falha ao abrir o projeto: ${error.message}. Revise a configuração e recarregue.`; console.error(error);
  });
})();
