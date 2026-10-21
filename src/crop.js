// Crop coordinates are arithmetic data, never JavaScript. Shared by browser and tests.
(() => {
  function expression(value, dimensions) {
    const invalid = () => { throw new Error('Expressão de recorte inválida; use números, W, H, +, -, *, / e parênteses'); };
    const finite = n => { if (!Number.isFinite(n)) invalid(); return n; };
    if (typeof value === 'number') return finite(value);
    if (typeof value !== 'string' || value.length > 256 || !value.trim()) return invalid();
    const tokens = value.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_$][\w$]*|\S/g);
    let at = 0, depth = 0;
    function atom() {
      if (++depth > 32) invalid();
      const token = tokens[at++]; let result;
      if (token === '+' || token === '-') result = (token === '-' ? -1 : 1) * atom();
      else if (token === '(') { result = sum(); if (tokens[at++] !== ')') invalid(); }
      else if (token === 'W' || token === 'H') result = dimensions[token];
      else if (token && /^(?:\d|\.\d)/.test(token)) result = Number(token);
      else invalid();
      depth--; return finite(result);
    }
    function product() {
      let result = atom();
      while (tokens[at] === '*' || tokens[at] === '/') {
        const op = tokens[at++], right = atom();
        result = finite(op === '*' ? result * right : result / right);
      }
      return result;
    }
    function sum() {
      let result = product();
      while (tokens[at] === '+' || tokens[at] === '-') {
        const op = tokens[at++], right = product();
        result = finite(op === '+' ? result + right : result - right);
      }
      return result;
    }
    const result = sum(); if (at !== tokens.length) invalid(); return result;
  }
  function rectangle(values, dimensions) {
    if (!Array.isArray(values) || values.length !== 4) throw new Error('Recorte deve ter x,y,largura,altura');
    const rect = values.map(value => expression(value, dimensions));
    if (rect[2] <= 0 || rect[3] <= 0) throw new Error('Dimensões de recorte devem ser positivas');
    return rect;
  }
  globalThis.CropMath = Object.freeze({ expression, rectangle });
})();
