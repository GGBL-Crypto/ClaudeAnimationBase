// Sprites do boneco do pixel, desenhados à mão (script clássico, sem import). Todos olham para a direita; o boneco espelha a
// camada pronta (flipCells). PIXEL_SPRITES5 entra em spritePart (figure.js):
// - cabelo e chapéu: mapas de mechas { ax, ay, locks, lockBias?, rows }, âncora no centro da cabeça; cada letra é uma mecha
//   (ordem de trás para a frente em locks), sombreada por lockTone. Rosto livre em x 2..9, y 0..6 da âncora.
// - mãos, bota e orelha: { ax, ay, rows } com dígitos 0–4 (tom da rampa); mão no meio da palma, bota no tornozelo.
// - olho: { near, far, brow, dy?, blush? }; boca: rows. Glifos do rosto: K tinta, W olho, B sobrancelha (tom 0 do cabelo),
//   S boca fechada (tom 1 da pele), T língua (red3), P blush, . vazio. Posições na Task 4 (draw.js), relativas ao centro.
var PIXEL_SPRITES5 = (() => {
  // Cabelos de 24 colunas com a âncora na coluna 12 (spiky = HAIR5 do protótipo, 26 colunas, âncora na 14); a linha da
  // âncora varia com o alto do sprite.
  const hair = {
    short: { ax: 12, ay: 11, locks: 'abcde', lockBias: { a: -1 }, rows: [
      '........bb..ccc.........',
      '......bbbbbcccccdd......',
      '....abbbbbccccccddd.....',
      '...aabbbbbcccccdddde....',
      '..aaabbbbcccccddddeee...',
      '.aaaabbbbccccdddddeeee..',
      '.aaabbbbcccccddddeeeeee.',
      'aaaabbbbccccdddd.eeeeee.',
      'aaaabbbcccc.ddd...eeee..',
      'aaaabbbccc..........ee..',
      'aaaabbbcc...............',
      '.aaabbb.................',
      '.aaabb..................',
      '..aab...................',
      '..aa....................'] },
    long: { ax: 12, ay: 11, locks: 'abcde', lockBias: { a: -1 }, rows: [
      '........bb..ccc.........',
      '......bbbbbcccccdd......',
      '....abbbbbccccccddd.....',
      '...aabbbbbcccccdddde....',
      '..aaabbbbcccccddddeee...',
      '.aaaabbbbccccdddddeeee..',
      '.aaabbbbcccccddddeeeeee.',
      'aaaabbbbccccdddd.eeeeee.',
      'aaaabbbbccc.ddd...eeee..',
      'aaaabbbbcc..........ee..',
      'aaaabbbbc...............',
      'aaaabbbb................',
      'aaaabbbb................',
      'aaaabbbb................',
      'aaaabbbb................',
      'aaaabbbbb...............',
      'aaaabbbbb...............',
      '.aaaabbbb...............',
      '..aaabbbb...............',
      '.aaa.bbb................',
      'aaa..bb.................',
      'aa..bb..................',
      'a...b...................'] },
    bun: { ax: 12, ay: 14, locks: 'fabcde', lockBias: { a: -1 }, rows: [
      '...ffff.................',
      '..ffffff................',
      '..ffffff................',
      '..ffffff................',
      '..ffffffbbbcccc.........',
      '...ffffbbbbccccdd.......',
      '....abbbbbccccccddd.....',
      '...aabbbbbcccccdddde....',
      '..aaabbbbcccccddddeee...',
      '.aaaabbbbccccdddddeeee..',
      '.aaabbbbcccccddddeeeeee.',
      'aaaabbbbccccdddd.eeeeee.',
      'aaaabbbcccc.ddd...eeee..',
      'aaaabbbccc..........ee..',
      'aaaabbbcc...............',
      '.aaabbb.................',
      '.aaabb..................',
      '..aab...................',
      '..aa....................'] },
    spiky: { ax: 14, ay: 15, locks: 'efdabchig', lockBias: { e: -1, f: -1 }, rows: [
      '.....a.......b............',
      '.....aa......bb...........',
      '......aa.....bbb.....c....',
      '......aaa...bbbb....cc....',
      '..d....aaa.bbbbb...ccc....',
      '..dd...aaaabbbbbb.cccc....',
      '...ddd.aaaabbbbbbccccc....',
      '...dddddaaaabbbbbcccccg...',
      '..dddddddaaabbbbbccccggg..',
      '.edddddddddabbbbbcccgggg..',
      'eeeddddddddddbbbhhcgggggg.',
      'eeeedddddddddhhhhhiigggggg',
      '.eeeddddddddhhhhh.iii.ggg.',
      '..eedddddddd.hh....ii..gg.',
      '...eddddddd..h......i.....',
      '...fdddddd................',
      '...ffddddd................',
      '...ffdddd.................',
      '....ffddd.................',
      '....ffdd..................',
      '.....fff..................',
      '......f...................'] },
    // Capuz: caimento atrás (a), alto (b) e a borda (c) que emoldura o rosto e desce pela bochecha até o queixo.
    hood: { ax: 12, ay: 12, locks: 'abc', lockBias: { a: -1 }, rows: [
      '.......bbbbbbbb.........',
      '.....bbbbbbbbbbbbb......',
      '...abbbbbbbbbbbbbbbc....',
      '..aabbbbbbbbbbbbbbccc...',
      '.aaabbbbbbbbbbbbbcccccc.',
      '.aaabbbbbbbbbbbbccccccc.',
      'aaaabbbbbbbbbbbcccccccc.',
      'aaaabbbbbbbbbbccccccccc.',
      'aaaabbbbbbbbbccccccccccc',
      'aaaabbbbbbbbcccccccccccc',
      'aaaabbbbbbbccc..........',
      'aaaabbbbbbccc...........',
      'aaaabbbbbbccc...........',
      'aaaabbbbbbccc...........',
      'aaaabbbbbbccc...........',
      'aaaabbbbbbccc...........',
      'aaaabbbbbbccc...........',
      'aaaabbbbbbccc...........',
      'aaaabbbbbbbccc..........',
      '.aaabbbbbbbbccc.........',
      '..aabbbbbbbbbbcc........',
      '...........bbbbb........'] },
    // Capacete: calota (a), aba com nuca (b) e um rebite (r) de 2 × 2; a última linha vazia é a da âncora.
    helmet: { ax: 12, ay: 11, locks: 'abr', rows: [
      '........aaaaaa..........',
      '......aaaaaaaaaa........',
      '....aaaaaaaaaaaaaa......',
      '...aaaaaaaaaaarraaa.....',
      '..aaaaaaaaaaaarraaaa....',
      '..aaaaaaaaaaaaaaaaaaa...',
      '.aaaaaaaaaaaaaaaaaaaa...',
      '.aaaaaaabbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbb.................',
      '.bbbbb..................',
      '........................'] },
  };
  // Chapéu sobre o cabelo: copa (a), fita (c) e aba (b); as linhas vazias levam a âncora ao centro da cabeça.
  const hat = { ax: 12, ay: 15, locks: 'acb', rows: [
    '........aaaaaaa.........',
    '.......aaaaaaaaa........',
    '......aaaaaaaaaaa.......',
    '......aaaaaaaaaaa.......',
    '......aaaaaaaaaaa.......',
    '......ccccccccccc.......',
    '......ccccccccccc.......',
    '..bbbbbbbbbbbbbbbbbbbb..',
    'bbbbbbbbbbbbbbbbbbbbbbbb',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................'] };
  // Mãos v5 em tons de pele; âncora no meio da palma. hold: mão em C, de lado, fechando sobre o que segura.
  const hands = {
    fist: { ax: 2, ay: 2, rows: ['.343.', '34432', '33321', '32211', '.211.'] },
    relax: { ax: 2, ay: 1, rows: ['.43.', '4332', '3332', '3321', '2321', '.21.'] },
    point: { ax: 2, ay: 2, rows: ['.343.......', '34434444432', '33322222221', '3321.......', '.211.......'] },
    open: { ax: 3, ay: 3, rows: ['.4.4.4', '.3.3.3', '.3.3.3', '433332', '333321', '.2221.'] },
    hold: { ax: 1, ay: 2, rows: ['.3443.', '342211', '32....', '32....', '332221', '.2211.'] },
  };
  // Bota v5: cano dobrado claro, vinco, bico com brilho e sola; âncora no tornozelo. Orelha v5: âncora no meio.
  const boot = { ax: 2, ay: 3, rows: ['.4443.....', '.1111.....', '.3322.....', '.33221....', '4332222331', '3222222221', '0000000000'] };
  const ear = { ax: 1, ay: 2, rows: ['.43.', '4321', '3211', '321.', '.21.'] };
  // Olhos: neutral e blink da v4; happy em arco (os cantos descem), dy desce o olho, brow sobe (−) a sobrancelha.
  const eyes = {
    neutral: { near: ['.KK', 'WKW', 'WKK', '.KK'], far: ['K', 'K', 'K', 'K'], brow: 0, blush: true },
    curious: { near: ['.KK', 'WKK', 'WWW', '.WW'], far: ['K', 'K', 'W', '.'], brow: -1, blush: true },
    surprised: { near: ['.WW.', 'WKKW', 'WKKW', '.WW.'], far: ['K', 'K', 'K', 'K'], brow: -1 },
    happy: { near: ['.KK.', 'K..K'], far: ['K.', '.K'], brow: -1, dy: 1, blush: true },
    blink: { near: ['....', '....', 'KKK.', '....'], far: ['.', '.', 'K', '.'], brow: 0, blush: true },
  };
  // Bocas da v4; none = boca fechada de 1 px.
  const mouths = { none: ['S'], m: ['SS'], a: ['KK', 'KT'], o: ['.K', 'KK', '.K'], e: ['KKK', '.T.'], grin: ['KKKK', '.TT.'] };
  return { hair, hat, hands, boot, ear, eyes, mouths };
})();

// legado: sai na Task 4 (draw.js ainda usa PIXEL_SPRITES, LEGEND, heads, torsos e rampOf).
// Sprite = {w, h, ax, ay, rows}: rows.length = h, cada linha com w caracteres da LEGEND; (ax, ay) é a célula que cai sobre a
// junta âncora. facing < 0 espelha em x em torno de ax. Tom 0 = escuro, 1 = médio, 2 = claro (rampOf). Cabeça: âncora em
// headBase (pescoço), face = a célula do rosto (olhos e boca usam a mesma âncora). Tronco: âncora no pescoço. Mão: âncora no
// meio. Bota: âncora no tornozelo.
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

// legado: sai na Task 4.
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
