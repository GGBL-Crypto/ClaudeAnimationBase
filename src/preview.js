function initPreview() {
  const $ = id => document.getElementById(id), params = new URLSearchParams(location.search);
  const project = $('project'), style = $('style'), scrub = $('scrub'), play = $('play'), save = $('save');
  const duration = window.LOOP?.len || PROJECT.duration;
  let busy = false, wanted = null, playing = false, time = 0;
  function stop() { playing = false; play.textContent = 'Reproduzir'; }
  async function render() {
    if (busy) return;
    busy = true; save.disabled = true;
    try {
      while (wanted !== null) {
        const t = wanted; wanted = null; const start = performance.now();
        await renderAt(t); time = t; scrub.value = t;
        $('tt').textContent = t.toFixed(2) + ' / ' + duration.toFixed(2) + ' s · ' + Math.round(performance.now() - start) + ' ms/quadro';
        document.querySelectorAll('#shots button').forEach((button, i) => button.setAttribute('aria-current', String(t >= PROJECT.storyboard[i].start && t < PROJECT.storyboard[i].end)));
      }
      $('error').textContent = '';
    } catch (error) { stop(); $('error').textContent = 'Falha no quadro: ' + error.message + '. Ajuste a cena e recarregue.'; }
    finally { busy = false; save.disabled = false; }
  }
  function seek(t) { wanted = clamp(t, 0, duration - 1 / PROJECT.fps); return render(); }
  for (const item of Object.values(AnimationPlatform.projects)) project.add(new Option(item.title, item.id));
  project.value = PROJECT.id;
  for (const id of PROJECT.compatibleStyles) style.add(new Option(AnimationPlatform.styles[id].name, id));
  style.value = PROJECT.style;
  project.onchange = () => { params.set('project', project.value); params.delete('style'); params.delete('loop'); params.delete('t'); location.search = params; };
  style.onchange = () => { params.set('style', style.value); params.delete('loop'); location.search = params; };
  scrub.max = duration - 1 / PROJECT.fps; scrub.step = 1 / PROJECT.fps;
  scrub.oninput = () => { stop(); seek(+scrub.value); };
  play.onclick = async () => {
    if (playing) { stop(); return; }
    if (time >= duration - 1 / PROJECT.fps) time = 0;
    playing = true; play.textContent = 'Pausar';
    // Advance one frame per completed draw: heavy watercolor previews may play below real time.
    while (playing) {
      await seek(time + 1 / PROJECT.fps);
      if (time >= duration - 1 / PROJECT.fps - 1e-6) stop();
      await new Promise(resolve => setTimeout(resolve, 1000 / PROJECT.fps));
    }
  };
  save.onclick = () => { const a = document.createElement('a'); a.href = animationEngine.canvas.toDataURL('image/png'); a.download = PROJECT.id + '-' + PROJECT.style + '-' + time.toFixed(2) + '.png'; a.click(); };
  $('story').textContent = PROJECT.story;
  if (!window.LOOP) PROJECT.storyboard.forEach(shot => {
    const li = document.createElement('li'), button = document.createElement('button'), detail = document.createElement('p');
    button.textContent = shot.start + '–' + shot.end + ' s · ' + shot.event;
    button.onclick = () => { stop(); seek(shot.start + .1); };
    detail.textContent = shot.transition + '. ' + shot.reads.map(read => read.start + '–' + read.end + ': ' + read.text).join(' · ');
    li.append(button, detail); $('shots').append(li);
  });
  for (const el of [project, style, scrub, play, save]) el.disabled = false;
  seek(Number(params.get('t') ?? Math.min(.8, duration / 2)));
}
