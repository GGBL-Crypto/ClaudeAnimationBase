// Browser + Node: no rendering library or artistic rules.
(() => {
  const styles = Object.create(null), projects = Object.create(null);
  const fail = message => { throw new Error(message); };
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  function register(table, item) {
    if (!/^[a-z][a-z0-9-]*$/.test(item.id) || table[item.id]) fail(`ID inválido ou duplicado: ${item.id}`);
    table[item.id] = freeze(item);
  }
  function validateStoryboard(project) {
    const { duration, fps, bpm, storyboard } = project;
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isInteger(fps) || fps < 1 || fps > 120 || !Number.isFinite(bpm) || bpm <= 0) fail('Duração, fps ou bpm inválidos');
    if (!Array.isArray(storyboard) || !storyboard.length) fail('Storyboard obrigatório');
    let end = 0; const ids = new Set();
    for (const shot of storyboard) {
      if (Object.hasOwn(shot, 'style') || Object.hasOwn(shot, 'styleOptions')) fail('Defina o estilo no projeto inteiro, nunca por plano');
      if (!shot.id || ids.has(shot.id)) fail('Planos precisam de IDs únicos');
      ids.add(shot.id);
      if (shot.start !== end || !Number.isFinite(shot.end) || shot.end <= shot.start || shot.end > duration) fail(`Intervalo inválido no plano ${shot.id}`);
      if (!shot.event || !shot.transition || !shot.reads?.length) fail(`Faltam evento, transição ou leituras: ${shot.id}`);
      let readEnd = shot.start;
      for (const read of shot.reads) {
        if (!Number.isFinite(read.start) || !Number.isFinite(read.end) || read.start < readEnd || read.end <= read.start || read.start < shot.start || read.end > shot.end || !read.text) fail(`Leituras sobrepostas ou inválidas: ${shot.id}`);
        readEnd = read.end;
      }
      end = shot.end;
    }
    if (end !== duration) fail('Storyboard deve cobrir toda a duração');
    for (const t of project.reviewTimes || []) if (!Number.isFinite(t) || t < 0 || t >= duration) fail('Tempo de revisão fora do vídeo');
    return project;
  }
  function mergeConfig(base, overrides = {}, path = 'styleOptions') {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) fail(`Configuração inválida: ${path}`);
    const result = { ...base };
    for (const [key, value] of Object.entries(overrides)) {
      if (!Object.hasOwn(base, key)) fail(`Configuração desconhecida: ${path}.${key}`);
      if (base[key] && typeof base[key] === 'object') result[key] = mergeConfig(base[key], value, `${path}.${key}`);
      else {
        if (typeof value !== typeof base[key] || typeof value === 'number' && !Number.isFinite(value)) fail(`Tipo inválido: ${path}.${key}`);
        if (path.endsWith('palette') && !/^#[\da-f]{6}$/i.test(value)) fail(`Cor inválida: ${key}`);
        result[key] = value;
      }
    }
    return result;
  }
  function resolveProject(id = 'demo', styleId) {
    const source = projects[id]; if (!source) fail(`Projeto desconhecido: ${id}`);
    const style = styles[styleId || source.style]; if (!style) fail(`Estilo desconhecido: ${styleId || source.style}`);
    if (!source.compatibleStyles.includes(style.id)) fail(`O projeto ${id} não é compatível com ${style.id}`);
    const config = mergeConfig(style.config, source.styleOptions?.[style.id]);
    for (const group of ['texture', 'outline', 'character', 'effects']) for (const [key, value] of Object.entries(config[group])) if (typeof value === 'number' && value < 0) fail(`Valor negativo: ${group}.${key}`);
    if (config.character.unit <= 0 || config.character.width <= 0 || config.character.height <= 0) fail('Dimensões do personagem devem ser positivas');
    style.validate?.(config);
    return freeze({ ...validateStoryboard(source), style: style.id, styleConfig: config });
  }
  globalThis.AnimationPlatform = { styles, projects, freeze, registerStyle: item => register(styles, item), registerProject: item => register(projects, validateStoryboard(item)), validateStoryboard, resolveProject };
})();
