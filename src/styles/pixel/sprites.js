// Sprites do boneco do pixel, desenhados em código (script clássico, sem import; draw.js usa). Sprite = {w, h, ax, ay,
// rows}: rows.length = h, cada linha com w caracteres da LEGEND; (ax, ay) é a célula que cai sobre a junta âncora. Todo
// sprite olha para a direita; facing < 0 espelha em x em torno de ax. Tom 0 = escuro, 1 = médio, 2 = claro (rampOf).
// Cabeça: âncora em headBase (pescoço), face = a célula do rosto (olhos e boca usam a mesma âncora). Tronco: âncora no
// pescoço. Mão: âncora no meio. Bota: âncora no tornozelo.
var PIXEL_SPRITES = (() => {
  const sp = (ax, ay, rows, more) => ({ w: rows[0].length, h: rows.length, ax, ay, rows, ...more });
  const LEGEND = { '.': null, o: ['ink'], 1: ['skin', 0], 2: ['skin', 1], 3: ['skin', 2], 4: ['hair', 0], 5: ['hair', 1], 6: ['hair', 2],
    a: ['shirt', 0], b: ['shirt', 1], c: ['shirt', 2], d: ['pants', 0], e: ['pants', 1], f: ['pants', 2], g: ['shoe', 0], h: ['shoe', 1],
    x: ['accent', 0], y: ['accent', 1], w: ['eye'], '#': ['black'], m: ['skin', 0] };
  // Cabeça adulta 13 × 13, de três quartos: cabelo em cima e atrás com mechas e franja, orelha, queixo. up: rosto 1 px acima,
  // a nuca 1 px abaixo e o queixo à mostra; down: rosto 1 px abaixo, mais cabelo em cima.
  const short = {
    level: sp(5, 12, [
      '...ooooooo...',
      '..o5665665o..',
      '.o556556655o.',
      'o45565565565o',
      'o44545545455o',
      'o44455353333o',
      'o44442333332o',
      'o44422333332o',
      'o44412333332o',
      'o44122333332o',
      '.o4122233332o',
      '..o11222221o.',
      '...oooooooo..'], { face: [8, 9] }),
    up: sp(5, 12, [
      '..ooooooo....',
      '.o5665665o...',
      'o556556655o..',
      'o4565565565o.',
      'o4445535333o.',
      'o44442333332o',
      'o44422333332o',
      'o44412333332o',
      'o44122333332o',
      'o44122233332o',
      '.o4122222222o',
      '.o411111111o.',
      '..ooooooooo..'], { face: [8, 8] }),
    down: sp(5, 12, [
      '...ooooooo...',
      '..o5665665o..',
      '.o556556655o.',
      'o45565565565o',
      'o44555665555o',
      'o44545555455o',
      'o44455353333o',
      'o44442333332o',
      'o44422333332o',
      'o44412333332o',
      '.o4122333332o',
      '..o122222221o',
      '...ooooooooo.'], { face: [8, 10] }),
  };
  // Rosto: olhos (sobrancelha, 2 linhas de olho, linha do nariz) e boca (linha do nariz vazia, boca embaixo), na âncora face.
  const eye = rows => sp(2, 3, rows), mouth = rows => sp(1, 0, ['...', ...rows]);
  const faces = {
    eyes: { neutral: eye(['44.44', 'w#.w#', 'w#.w#', '...1.']), curious: eye(['44.44', 'w#.w#', 'ww.ww', '...1.']), surprised: eye(['ww.ww', 'w#.w#', 'ww.ww', '...1.']),
      happy: eye(['44.44', '##.##', '.....', '...1.']), blink: eye(['44.44', '.....', '##.##', '...1.']) },
    mouths: { none: mouth(['.mm']), m: mouth(['mmm']), e: mouth(['mwm']), a: mouth(['.##', '.##']), o: mouth(['.#.', '.#.']) },
  };
  // Tronco adulto 9 × 11: jaqueta (camisa do elenco) com a frente clara, cinto com fivela, quadril na cor da calça.
  const torsos = { adult: sp(4, 1, [
    '.ooooooo.',
    'oabbbbcco',
    'oabbbbcbo',
    'oaabbbcbo',
    'oaabbbcbo',
    'oaabbbcbo',
    'oaaabbcbo',
    'oddddxddo',
    'oddeeeeeo',
    'oddeeeeeo',
    '.ooooooo.']) };
  // Mãos de 3 px (o contorno vem em volta no desenho); point com o dedo à frente.
  const hands = { open: sp(1, 1, ['332', '222', '12.']), point: sp(1, 1, ['3222', '22..', '12..']), fist: sp(1, 1, ['.32', '322', '12.']) };
  const boots = sp(2, 1, ['ohhhoo.', 'ohhhhho', 'ogggggo', '.ooooo.']);
  return { LEGEND, heads: { short }, hats: {}, faces, torsos, hands, boots };
})();

// Células opacas do sprite em coordenadas relativas à âncora; flip espelha em x em torno dela.
function spriteCells(s, flip) {
  const out = [];
  s.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') out.push({ x: flip ? s.ax - x : x - s.ax, y: y - s.ay, ch }); }));
  return out;
}

// [escuro, médio, claro] da paleta: médio = a mais próxima; escuro = mais escura que o médio, com a luminância mais perto da
// cor escurecida 35% para #000010; claro = mais clara, perto da clareada 30% para #FFF4E0. Nos extremos a distância soma o
// croma (rgb − luminância) da cor pedida: o tom não troca de matiz (cabelo castanho não ganha luz cinza, nem a jaqueta azul
// luz lilás). Sem tom do lado, repete o médio.
function rampOf(hex, colors) {
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), lum = h => { const [r, g, b] = rgb(h); return .3 * r + .59 * g + .11 * b; };
  const mix = (a, b, k) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
  const cr = h => rgb(h).map(v => v - lum(h)), c0 = cr(hex);
  const near = (ok, e) => { let best = null, d = Infinity; for (const q of colors) if (ok(q) && e(q) < d) { d = e(q); best = q; } return best; };
  const m = near(() => true, q => rgb(q).reduce((s, v, i) => s + (v - rgb(hex)[i]) ** 2, 0));
  const tone = (t, ok) => near(ok, q => cr(q).reduce((s, v, i) => s + (v - c0[i]) ** 2, 0) + (lum(q) - lum(t)) ** 2) || m;
  return [tone(mix(hex, '#000010', .35), q => lum(q) < lum(m)), m, tone(mix(hex, '#FFF4E0', .3), q => lum(q) > lum(m))];
}

// Família de rampa mais próxima (distância RGB até o tom mais próximo) entre as permitidas pelo papel: pele só skin*, cabelo só hair* e grey, roupa o resto.
function familyOf(hex, role, ramps) {
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), c = rgb(hex), d = h => rgb(h).reduce((s, v, i) => s + (v - c[i]) ** 2, 0);
  const ok = f => role === 'skin' ? /^skin/.test(f) : role === 'hair' ? /^hair|^grey$/.test(f) : !/^skin|^hair/.test(f);
  let best = null, bd = Infinity;
  for (const f in ramps) if (ok(f)) { const q = Math.min(...ramps[f].map(d)); if (q < bd) { bd = q; best = f; } }
  return best;
}

// Variante da cabeça pela inclinação (+ para baixo, − para cima).
function headVariant(tilt) { return tilt < -.25 ? 'up' : tilt > .25 ? 'down' : 'level'; }

// Cabelo: actor.hair, ou sorteio estável pelo id (o idoso entre bald e short).
function hairOf(a) {
  if (a.hair) return a.hair;
  const n = [...a.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7), old = a.pose && a.pose.body === 'elder';
  return old ? ['bald', 'short'][n % 2] : ['short', 'long', 'spiky'][n % 3];
}
