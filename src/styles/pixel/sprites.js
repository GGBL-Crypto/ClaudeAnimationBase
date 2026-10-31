// Sprites do boneco do pixel, desenhados à mão (script clássico, sem import). Todos olham para a direita; o boneco espelha a
// camada pronta (flipCells). PIXEL_SPRITES5 entra em spritePart (figure.js):
// - cabelo e chapéu: mapas de mechas { ax, ay, locks, lockBias?, rows }, âncora no centro da cabeça; cada letra é uma mecha
//   (ordem de trás para a frente em locks), sombreada por lockTone. Rosto livre em x 2..9, y 0..6 da âncora.
// - mãos, bota e orelha: { ax, ay, rows } com dígitos 0–4 (tom da rampa); mão no meio da palma, bota no tornozelo.
// - olho: { near, far, brow, dy?, blush? }; boca: rows. Glifos do rosto: K tinta, W olho, B sobrancelha (tom 0 do cabelo),
//   S boca fechada (tom 1 da pele), T língua (red3), P blush, . vazio. Posições em facePlan, relativas ao centro.
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

// Rosto e mãos em px locais (olhando para a direita), relativos ao px do centro da cabeça: posições do protótipo (paintFace,
// s = 1,25) vezes k = s / 1,25, glifos sem escala; happy desce o olho 1 px, up sobe o rosto 1 px. P = { face, mouth, up?,
// hands: [[x, y, mão = 'open']] } (mão na âncora, com floor como o spritePart, retângulo pelo tamanho do sprite, escalado como no boneco).
// Retângulos { x0, y0, x1, y1 } com x1 e y1 inclusos; os do rosto levam rows (glifos de PIXEL_SPRITES5) para pintar.
function facePlan(P, s) {
  const S5 = PIXEL_SPRITES5, k = s / 1.25, E = S5.eyes[P.face] || S5.eyes.neutral, M = S5.mouths[P.mouth] || S5.mouths.none, up = P.up ? -1 : 0;
  const at = (x, y, rows, dy = 0) => { const x0 = Math.round(x * k), y0 = Math.round(y * k) + dy + up; return { x0, y0, x1: x0 + Math.max(...rows.map(r => r.length)) - 1, y1: y0 + rows.length - 1, rows }; };
  const sc = Math.abs(k - 1) > .1 ? k : 1, hands = (P.hands || []).map(([x, y, kind = 'open']) => {
    const h = S5.hands[kind] || S5.hands.open, x0 = Math.floor(x) - Math.round(h.ax * sc), y0 = Math.floor(y) - Math.round(h.ay * sc);
    return { x0, y0, x1: x0 + Math.round(h.rows[0].length * sc) - 1, y1: y0 + Math.round(h.rows.length * sc) - 1 };
  });
  return { eyeNear: at(2.4, 0, E.near, E.dy), eyeFar: at(7.2, 0, E.far, E.dy), browNear: at(2.4, -2, ['BBB'], E.brow), browFar: at(7.2, -2, ['B'], E.brow),
    blush: E.blush ? [at(1.6, 5, ['PP']), at(8.2, 5, ['P'])] : [], mouth: at((M[0].length > 2 ? 3.5 : 4.5) * 1.25 + .6, 6.125, M), hands };
}

// Família de rampa mais próxima (distância RGB até o tom mais próximo) entre as permitidas pelo papel: pele só skin*, cabelo só hair* e grey, roupa o resto.
function familyOf(hex, role, ramps) {
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), c = rgb(hex), d = h => rgb(h).reduce((s, v, i) => s + (v - c[i]) ** 2, 0);
  const ok = f => role === 'skin' ? /^skin/.test(f) : role === 'hair' ? /^hair|^grey$/.test(f) : !/^skin|^hair/.test(f);
  let best = null, bd = Infinity;
  for (const f in ramps) if (ok(f)) { const q = Math.min(...ramps[f].map(d)); if (q < bd) { bd = q; best = f; } }
  return best;
}

// Pinta o rosto do facePlan na camada de figureLayer (antes do flip), com o centro da cabeça em c (px locais) e col = cor
// por glifo: só nas células da cabeça (grupo 'head') e do cabelo ou chapéu ('lock…'); braço, punho e mão por cima ficam.
function paintFace(L, plan, c, col) {
  const cx = Math.floor(c[0]) + L.OX, cy = Math.floor(c[1]) + L.OY;
  for (const q of [plan.browNear, plan.browFar, plan.eyeNear, plan.eyeFar, ...plan.blush, plan.mouth]) q.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    const x = cx + q.x0 + i, y = cy + q.y0 + j, g = x >= 0 && y >= 0 && x < L.W && y < L.H && L.groups[y * L.W + x];
    if (col[ch] && (g === 'head' || typeof g === 'string' && g.startsWith('lock'))) L.cells[y * L.W + x] = col[ch];
  }));
}

// Rampa do elenco: a família de familyOf deslocada para guardar o valor da cor pedida. d = (índice do tom da família mais
// perto dela) − 2; tom t → família[clamp(t + d, 0, 4)] (calça escura continua escura no volume, que mora nos tons 2 e 3).
function rampFor(hex, role, ramps) {
  const f = ramps[familyOf(hex, role, ramps)], rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), c = rgb(hex), e = h => rgb(h).reduce((s, v, i) => s + (v - c[i]) ** 2, 0);
  const d = f.reduce((b, h, i) => e(h) < e(f[b]) ? i : b, 0) - 2;
  return f.map((_, t) => f[Math.max(0, Math.min(4, t + d))]);
}

// Variante da cabeça pela inclinação (+ para baixo, − para cima).
function headVariant(tilt) { return tilt < -.25 ? 'up' : tilt > .25 ? 'down' : 'level'; }

// Cabelo: actor.hair, ou sorteio estável pelo id (o idoso entre bald e short).
function hairOf(a) {
  if (a.hair) return a.hair;
  const n = [...a.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7), old = a.pose && a.pose.body === 'elder';
  return old ? ['bald', 'short'][n % 2] : ['short', 'long', 'spiky'][n % 3];
}
