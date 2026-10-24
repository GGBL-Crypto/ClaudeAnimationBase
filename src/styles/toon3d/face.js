// face.js (toon3d, exp/visual-rico): rosto cartoon de qualquer ser. Olhos grandes (esclera, íris, pupila e brilho
// voltado para a câmera) ou compostos (cúpula facetada com pupila), pálpebra que pisca por blink(t, semente), sobrancelha
// e boca simples. A espécie diz em LOOKS3D.face onde os olhos encaixam: eyes = [frente, cima, lado] em semieixos da
// cabeça, r = raio do olho em semieixos laterais, forward = 0 (olho voltado para o lado, como peixe) a 1 (para a frente).
// Expressão por mood (src/nature/creature.js) ou pelo nome. lid = altura da borda da pálpebra em graus acima do eixo do
// olho; brow = [sobe, inclina (+ = ponta de dentro sobe)]; smile −1..1; open 0..1; pupil = escala.
const FACES = {
  neutro: { lid: 32, brow: [0, 0], smile: .3, open: 0, pupil: 1 },
  curioso: { lid: 50, brow: [.5, -.3], smile: .1, open: .3, pupil: 1.12 },
  susto: { lid: 80, brow: [1, .4], smile: -.3, open: 1, pupil: .62 },
  alegre: { lid: 28, brow: [.35, .15], smile: 1, open: .4, pupil: 1.05 },
  cansado: { lid: 4, brow: [-.25, .45], smile: -.35, open: 0, pupil: 1 },
};

// Estado do rosto em t: a expressão e quanto o olho está fechado (0 aberto, 1 fechado). Puro.
function faceState(t, { seed = 0, mood = null, expression = 'neutro' } = {}) {
  const ex = FACES[mood ? mood.expression : expression] || FACES.neutro;
  return { ...ex, close: mood ? mood.blink : blink(t, seed) };
}

// h = cabeça {c, f, u, l, ax, hex}; F = LOOKS3D[...].face; st = faceState; o = {t, seed, target}. O olhar segue
// o.target (padrão: a câmera), limitado a um cone em torno do eixo do olho, com sacadas por ruído em degraus.
function drawFace(E, h, F, st, o = {}) {
  if (!F) return;
  const { add, sub, mul, dot, cross, unit, comb } = V3, cam = E.eye || add(h.c, mul(h.f, 10)), t = o.t || 0, sd = o.seed || 0;
  for (const sg of [1, -1]) {
    const c = comb(h.c, [h.f, F.eyes[0] * h.ax[0]], [h.u, F.eyes[1] * h.ax[1]], [h.l, sg * F.eyes[2] * h.ax[2]]), R = F.r * h.ax[2];
    const e = unit(add(mul(unit(sub(c, h.c)), 1 - F.forward), mul(h.f, F.forward))), ue = unit(sub(h.u, mul(e, dot(h.u, e))));
    const px = E.px ? E.px(c, R) : 99;
    if (px < 2.5) { E.ball(c, R, '#140A06', 'eye'); continue; }  // de longe, um ponto escuro
    // Olhar: alvo, preso a um cone de .6 rad; sacadas pequenas.
    let g = unit(sub(o.target || cam, c)); const d = dot(g, e), M = .6;
    if (d < Math.cos(M)) g = add(mul(e, Math.cos(M)), mul(unit(sub(g, mul(e, d))), Math.sin(M)));
    g = unit(comb(g, [h.u, .07 * noise1(sd * 5 + 1, Math.floor(t * 1.4))], [h.l, .09 * noise1(sd * 5 + 2, Math.floor(t * 1.4))]));
    const gu = unit(sub(h.u, mul(g, dot(h.u, g)))), p = st.pupil;
    if (F.compound) {  // olho composto: cúpula facetada; a pupila cartoon por cima dá a expressão
      E.ball(c, R, F.compound, 'facet');
      E.ovoid(add(c, mul(g, R * .9)), g, gu, .14 * R, .3 * R * p, .3 * R * p, '#120806', 'eye');
    } else {
      E.ball(c, R, F.sclera || '#FFFBF0', 'eye');
      E.ovoid(add(c, mul(g, R * .74)), g, gu, .32 * R, .6 * R, .6 * R, F.iris, 'eye');
      E.ovoid(add(c, mul(g, R * .88)), g, gu, .2 * R, .36 * R * p, .36 * R * p, '#120806', 'eye');
    }
    if (px < 6) continue;
    // Brilho especular fixo: entre o olho e a câmera, deslocado para cima e para o lado da luz.
    const k = unit(sub(cam, c)), side = unit(cross(k, [0, 1, 0])), gl = unit(comb(k, [[0, 1, 0], .55], [side, .35]));
    E.ball(add(c, mul(gl, R * .97)), .16 * R, '#FFFFFF', 'glint'); E.ball(add(c, mul(unit(comb(k, [[0, 1, 0], -.3], [side, -.4])), R * .97)), .07 * R, '#FFFFFF', 'glint');
    // Pálpebra: meia esfera da cor da cabeça; a borda sobe e desce entre lid (aberta) e −90° (fechada).
    const phi = lerp(90 - st.lid, 180, st.close) * Math.PI / 180, n = unit(add(mul(e, -Math.cos(phi)), mul(ue, Math.sin(phi))));
    const X = unit(cross(n, h.l)), Z = cross(X, n);
    E.quad('lid', c, mul(X, 1.07 * R), mul(n, 1.07 * R), mul(Z, 1.07 * R), h.hex);
    if (F.brow) {  // sobrancelha: bastão acima do olho, ponta de dentro e de fora
      const b = comb(c, [ue, R * (.9 + .2 * st.brow[0])], [e, R * .52]), lat = mul(unit(cross(e, ue)), sg * R * .55), tilt = mul(ue, R * .22 * st.brow[1]);  // rente ao olho
      spindle(E, add(sub(b, lat), tilt), sub(add(b, lat), tilt), .09 * R, F.browHex || '#2A140C');
    }
  }
  if (!F.mouth || (E.px && E.px(h.c, h.ax[2]) < 14)) return;
  // Boca: curva de dois bastões (cantos sobem com smile) ou, aberta, uma elipse escura.
  const [mf, mu, mw] = F.mouth, w = mw * h.ax[2], m = comb(h.c, [h.f, mf * h.ax[0]], [h.u, mu * h.ax[1]]), ink = '#3A1408';
  if (st.open > .25) E.ovoid(m, h.f, h.u, .12 * w, .55 * st.open * w, .55 * w, ink, 'eye');
  else for (const sg of [1, -1]) spindle(E, add(m, mul(h.f, .02 * w)), comb(m, [h.l, sg * w], [h.u, .35 * st.smile * w], [h.f, -h.ax[0] * (1 - Math.sqrt(Math.max(0, 1 - (w / h.ax[2]) ** 2)))]), .08 * w, ink, 'eye');
}
