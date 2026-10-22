// Especificações de seres para creaturePose. Tudo em BL (humano: altura; animais: comprimento do corpo).
// spine[i] = {offset atrás de s, r, h altura do centro na vista lateral}; spine[0] é o segmento da frente.
// limbs: attach (índice da coluna), along (à frente da raiz), side (1 esquerda, -1 direita), l1/l2, rest [dx, dy]
// (dy: para baixo na lateral, para fora na superior), bend (lado do joelho voltado para a direita), foot, key (fase na
// marcha; padrão = name), swing (perna cujo balanço o braço espelha), h (altura extra da raiz).
// appendages: attach ('head' ou índice), at [dx, dy], angle (voltado para a direita), lengths, motion, side.

// Antena geniculada da formiga: escapo, cotovelo e funículo. o.antennae = 'explore' (varre devagar) ou 'tap' (toca o chão).
function antennaMotion(t, seed, o, k) {
  const tap = o.antennae === 'tap';
  const sweep = tap ? .3 * Math.max(0, Math.sin(t * TAU * 3 + seed)) : .45 * noise1(seed, t * .8);
  return [sweep * k, (tap ? 1.6 : 1.1) + .15 * k * noise1(seed + 5, t * 1.3), .12, .1];
}

var SPECS = {
  human: {
    id: 'human', gait: 'bipedWalk', views: ['side'], stride: .75, lift: .07,
    spine: [{ offset: 0, r: .11, h: .68 }, { offset: 0, r: .1, h: .48 }],  // peito e pelve, empilhados
    head: { offset: 0, r: .065, h: .915 },
    limbs: [
      { name: 'legL', key: 'L', foot: true, attach: 1, along: 0, side: 1, l1: .25, l2: .25, rest: [0, .5], bend: -1 },
      { name: 'legR', key: 'R', foot: true, attach: 1, along: 0, side: -1, l1: .25, l2: .25, rest: [0, .5], bend: -1 },
      { name: 'armL', swing: 'legL', attach: 0, along: 0, h: .1, side: 1, l1: .17, l2: .16, rest: [0, .3], bend: 1 },
      { name: 'armR', swing: 'legR', attach: 0, along: 0, h: .1, side: -1, l1: .17, l2: .16, rest: [0, .3], bend: 1 },
    ],
    appendages: [{ name: 'hair', attach: 'head', at: [-.03, -.04], angle: Math.PI - .4, lengths: [.04, .04, .04], motion: { lag: .2, amp: .12, freq: 1, gravity: .45 } }],
    carry: { attach: 0, at: [.14, .02] },
  },
  dog: {
    id: 'dog', gait: 'quadWalk', views: ['side', 'top'], stride: .6, lift: .08,
    spine: [{ offset: 0, r: .15, h: .46 }, { offset: .25, r: .14, h: .46 }, { offset: .5, r: .14, h: .47 }],
    head: { offset: -.2, r: .11, h: .64 },
    limbs: [
      { name: 'LF', foot: true, attach: 0, along: .03, side: 1, l1: .25, l2: .27, rest: [0, .12], bend: 1 },
      { name: 'RF', foot: true, attach: 0, along: .03, side: -1, l1: .25, l2: .27, rest: [0, .12], bend: 1 },
      { name: 'LH', foot: true, attach: 2, along: -.03, side: 1, l1: .26, l2: .27, rest: [0, .12], bend: 1 },
      { name: 'RH', foot: true, attach: 2, along: -.03, side: -1, l1: .26, l2: .27, rest: [0, .12], bend: 1 },
    ],
    appendages: [
      { name: 'tail', attach: 2, at: [-.12, -.06], angle: Math.PI + .7, lengths: [.1, .1, .08], motion: { lag: .3, amp: .3, freq: 1.8, gravity: .08 } },
      { name: 'earL', attach: 'head', side: 1, at: [-.03, -.07], angle: 2.1, lengths: [.06, .05], motion: { lag: .3, amp: .15, freq: 1.2, gravity: .4 } },
      { name: 'earR', attach: 'head', side: -1, at: [-.04, -.07], angle: 2.1, lengths: [.06, .05], motion: { lag: .3, amp: .15, freq: 1.2, gravity: .4 } },
    ],
    carry: { attach: 'head', at: [.1, .03] },
  },
  ant: {
    id: 'ant', gait: 'tripod', views: ['side', 'top'], stride: .25, lift: .05,
    spine: [{ offset: 0, r: .08, h: .15 }, { offset: .17, r: .035, h: .16 }, { offset: .32, r: .13, h: .18 }],  // tórax, pecíolo, gáster
    head: { offset: -.16, r: .085, h: .17 },
    limbs: [
      { name: 'L1', foot: true, attach: 0, along: .05, side: 1, l1: .17, l2: .21, rest: [.2, .2], bend: -1 },
      { name: 'R1', foot: true, attach: 0, along: .05, side: -1, l1: .17, l2: .21, rest: [.2, .2], bend: -1 },
      { name: 'L2', foot: true, attach: 0, along: 0, side: 1, l1: .17, l2: .21, rest: [0, .24], bend: -1 },
      { name: 'R2', foot: true, attach: 0, along: 0, side: -1, l1: .17, l2: .21, rest: [0, .24], bend: -1 },
      { name: 'L3', foot: true, attach: 0, along: -.05, side: 1, l1: .17, l2: .21, rest: [-.22, .22], bend: 1 },
      { name: 'R3', foot: true, attach: 0, along: -.05, side: -1, l1: .17, l2: .21, rest: [-.22, .22], bend: 1 },
    ],
    appendages: [
      { name: 'antennaL', attach: 'head', side: 1, at: [.06, -.04], angle: -.7, lengths: [.14, .05, .05, .05], motion: antennaMotion },
      { name: 'antennaR', attach: 'head', side: -1, at: [.05, -.04], angle: -.7, lengths: [.14, .05, .05, .05], motion: antennaMotion },
    ],
    carry: { attach: 'head', at: [.02, -.2] },
  },
  spider: {
    id: 'spider', gait: 'spider', views: ['side', 'top'], stride: .4, lift: .1,
    spine: [{ offset: 0, r: .17, h: .3 }, { offset: .36, r: .24, h: .34 }],  // cefalotórax, abdome
    head: { offset: -.13, r: .07, h: .3 },
    limbs: [1, 2, 3, 4].flatMap(i => [1, -1].map(side => ({
      name: (side > 0 ? 'L' : 'R') + i, foot: true, attach: 0, along: [.08, .03, -.03, -.08][i - 1], side, l1: .42, l2: .5,
      rest: [[.5, .5], [.22, .6], [-.12, .6], [-.42, .5]][i - 1], bend: i < 3 ? -1 : 1,
    }))),
    appendages: [
      { name: 'palpL', attach: 'head', side: 1, at: [.04, .03], angle: .7, lengths: [.06, .05], motion: { lag: .3, amp: .25, freq: 2.5 } },
      { name: 'palpR', attach: 'head', side: -1, at: [.03, .03], angle: .7, lengths: [.06, .05], motion: { lag: .3, amp: .25, freq: 2.5 } },
    ],
  },
  bird: {
    // Salta com os dois pés juntos (hop: o corpo sobe com os pés); o.gait = 'fly' voa pelo caminho com wings.phase.
    id: 'bird', gait: { duty: .45, offsets: { L: 0, R: 0 } }, hop: true, flyer: { freq: 6 }, views: ['side', 'top'], stride: .4, lift: .12,
    spine: [{ offset: 0, r: .17, h: .3 }, { offset: .22, r: .12, h: .32 }],
    head: { offset: -.2, r: .1, h: .46 },
    limbs: [
      { name: 'legL', key: 'L', foot: true, attach: 0, along: -.04, side: 1, l1: .15, l2: .16, rest: [0, .3], bend: 1 },
      { name: 'legR', key: 'R', foot: true, attach: 0, along: -.04, side: -1, l1: .15, l2: .16, rest: [0, .3], bend: 1 },
    ],
    appendages: [{ name: 'tail', attach: 1, at: [-.1, -.02], angle: Math.PI + .3, lengths: [.16], motion: { amp: .12, freq: 1.5 } }],
  },
  fish: {
    // Sem pernas: a coluna ondula numa onda viajante (amp em BL na cauda, freq em Hz, wave = comprimentos de onda no corpo).
    id: 'fish', gait: null, swimmer: { amp: .07, freq: 2, wave: .6 }, views: ['side', 'top'], stride: 0, lift: 0,
    spine: [{ offset: 0, r: .12 }, { offset: .2, r: .15 }, { offset: .4, r: .13 }, { offset: .6, r: .09 }, { offset: .78, r: .05 }],
    head: { offset: -.12, r: .1 },
    limbs: [],
    appendages: [
      { name: 'caudal', attach: 4, at: [-.03, 0], angle: Math.PI, lengths: [.1, .08], motion: { lag: .3, amp: .25, freq: 2 } },
      { name: 'pectoral', attach: 1, at: [0, .06], angle: 2.4, lengths: [.08], motion: { amp: .3, freq: 1.5 } },
    ],
  },
};
