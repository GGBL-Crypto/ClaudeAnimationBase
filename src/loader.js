// Sequential classic scripts stay classic; module descriptors await the ES dependency graph.
window.loadAnimationScript = async item => {
  const { src, type = 'classic' } = typeof item === 'string' ? { src: item } : item;
  if (type === 'module') {
    if (location.protocol !== 'http:' || location.hostname !== '127.0.0.1') throw new Error('Este motor usa módulos ES. Execute npm run studio e abra o endereço http://127.0.0.1 informado.');
    return import(new URL(src, document.baseURI).href);
  }
  if (type !== 'classic') throw new Error('Tipo de script inválido: ' + type);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve; script.onerror = () => reject(new Error(`Não foi possível carregar ${src}`)); document.head.append(script);
  });
};
