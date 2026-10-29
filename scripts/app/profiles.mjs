// Perfil de canal próprio: validação e perfil sugerido a partir de um conceito da modelagem.
export const EPISODE_STYLES = ['flat', 'watercolor']; // fase 5 troca pela marca de capacidade dos estilos
export const VOICES = { pt: ['pm_alex', 'pf_dora', 'pm_santa'], en: ['af_heart', 'af_bella', 'am_michael', 'bf_emma', 'bm_george'] };
export const PROFILE_DEFAULTS = { speed: 1, targetMin: 30, toleranceMin: 3, format: 'long-16:9', titleTemplates: [], descriptionTemplate: '' };

const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
const text = (v) => (typeof v === 'string' ? v.trim() : '');
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

export function validateProfile(body) {
  const b = { ...PROFILE_DEFAULTS, ...Object.fromEntries(Object.entries(body ?? {}).filter(([, v]) => v != null)) };
  const name = text(b.name), tag = text(b.tag), descriptionTemplate = text(b.descriptionTemplate);
  if (!name || name.length > 60) throw bad('Nome inválido (1 a 60 caracteres)');
  if (tag.length > 40 || (b.tag != null && typeof b.tag !== 'string')) throw bad('Etiqueta inválida (até 40 caracteres)');
  if (!Object.hasOwn(VOICES, b.lang)) throw bad('Idioma deve ser pt ou en');
  if (!EPISODE_STYLES.includes(b.style)) throw bad('Estilo não suportado para vídeo');
  if (!VOICES[b.lang].some((v) => `kokoro:${v}` === b.voice)) throw bad('Voz não é do idioma escolhido');
  if (typeof b.speed !== 'number' || !(b.speed >= 0.8 && b.speed <= 1.3)) throw bad('Velocidade entre 0,8 e 1,3');
  if (!int(b.targetMin, 10, 120)) throw bad('Duração alvo entre 10 e 120 min');
  if (!int(b.toleranceMin, 1, 15)) throw bad('Tolerância entre 1 e 15 min');
  const titleTemplates = Array.isArray(b.titleTemplates) ? b.titleTemplates.map(text).filter(Boolean) : null;
  if (!titleTemplates || titleTemplates.length > 10 || titleTemplates.some((t) => t.length > 120)) throw bad('Até 10 moldes de título, 120 caracteres cada');
  if (typeof b.descriptionTemplate !== 'string' || descriptionTemplate.length > 2000) throw bad('Descrição até 2000 caracteres');
  if (b.anchorId != null && b.anchorId !== '' && !/^UC[A-Za-z0-9_-]{22}$/.test(b.anchorId)) throw bad('Âncora inválida');
  return {
    name, tag: tag || null, lang: b.lang, style: b.style, voice: b.voice, speed: b.speed, targetMin: b.targetMin, toleranceMin: b.toleranceMin,
    anchorId: b.anchorId || null, modelId: Number.isInteger(b.modelId) ? b.modelId : null, conceptIndex: Number.isInteger(b.conceptIndex) ? b.conceptIndex : null,
    titleTemplates, descriptionTemplate, format: 'long-16:9',
  };
}

// Sugestão para o formulário; o usuário revisa antes de gravar
export function profileFromConcept(model, index, anchorRow) {
  const c = model.output.conceitos[index];
  const lang = Object.hasOwn(VOICES, anchorRow.lang) ? anchorRow.lang : 'pt';
  return {
    ...PROFILE_DEFAULTS, name: c.nome, tag: anchorRow.tag ?? null, lang, style: c.estiloVisual, voice: `kokoro:${VOICES[lang][0]}`,
    titleTemplates: [...(c.moldesTitulo ?? [])], anchorId: model.anchorId, modelId: model.id, conceptIndex: index,
  };
}
