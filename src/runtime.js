// Common capture API: backends own their drawing context and expose a canvas.
(() => {
  let rendering = false;
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve; script.onerror = () => reject(new Error(`Não foi possível carregar ${src}`)); document.head.append(script);
  });
  window.renderAt = async (t, type = 'image/png', quality = .92) => {
    if (!Number.isFinite(t) || t < 0 || t > (window.LOOP?.len || PROJECT.duration)) throw new Error(`Tempo fora do vídeo: ${t}`);
    if (rendering) throw new Error('Um quadro já está sendo renderizado nesta página');
    rendering = true;
    try { await animationEngine.render(t); return animationEngine.canvas.toDataURL(type, quality); }
    finally { rendering = false; }
  };
  window.renderSheet = async (times, cols = 3, width = 640, crop = null, at = null) => {
    if (!times.length || !Number.isInteger(cols) || cols < 1 || !Number.isInteger(width) || width < 1) throw new Error('Folha de contato inválida');
    if (at && crop) throw new Error('Escolha crop ou crop-at');
    if (at) at = CropMath.rectangle(at, { W, H });
    if (crop) crop = CropMath.rectangle(crop, { W, H });
    const [,, cw, ch] = at || crop || [0, 0, W, H];
    if (!(cw > 0 && ch > 0)) throw new Error('Recorte inválido');
    const height = Math.round(width * ch / cw), sheet = document.createElement('canvas');
    sheet.width = cols * width; sheet.height = Math.ceil(times.length / cols) * height;
    const ctx = sheet.getContext('2d'), ms = []; ctx.imageSmoothingEnabled = PROJECT.style !== 'pixel';
    for (const [i, t] of times.entries()) {
      const start = performance.now(); await renderAt(t); ms.push(Math.round(performance.now() - start));
      const [cx, cy] = at ? animationEngine.worldToScreen(at[0], at[1]).map((v, j) => v - (j ? ch : cw) / 2) : crop || [0, 0];
      const x = i % cols * width, y = Math.floor(i / cols) * height;
      ctx.drawImage(animationEngine.canvas, cx, cy, cw, ch, x, y, width, height);
      ctx.fillStyle = '#1b1820'; ctx.fillRect(x, y, 80, 23); ctx.fillStyle = '#ffffff'; ctx.font = '14px sans-serif'; ctx.fillText(`${t.toFixed(2)}s`, x + 6, y + 16);
    }
    return { url: sheet.toDataURL('image/jpeg', .92), ms };
  };
  window.gpuInfo = () => animationEngine.info();
  window.projectInfo = () => ({ ...PROJECT, width: W, height: H, duration: window.LOOP?.len || PROJECT.duration, engine: animationEngine.info() });
  async function boot() {
    const params = new URLSearchParams(location.search);
    // p5 installs a PROJECT='square' drawing constant on window. Keep film settings lexical.
    window.projectConfig = AnimationPlatform.resolveProject(params.get('project') || 'demo', params.get('style') || undefined);
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
    window.bootError = error.message;
    document.getElementById('error').textContent = `Falha ao abrir o projeto: ${error.message}. Revise a configuração e recarregue.`; console.error(error);
  });
})();
