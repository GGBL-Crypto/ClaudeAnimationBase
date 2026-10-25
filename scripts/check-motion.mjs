// check-motion.mjs (exp/visual-rico): verificador físico genérico das cenas toon3d. Roda a cena em Node (vm, sem
// desenho nem GPU), captura cada ser desenhado (drawCreature3d) e a câmera (St.camera) em todo quadro e reprova:
// corpos que se atravessam, velocidade, aceleração ou giro acima do limite, pé de apoio que desliza mais de 1 px, corpo
// abaixo do chão ou solto sem estar no ar, ser que aparece ou some com o centro dentro do quadro e salto de posição.
// Com --2d (cenas de src/scenes/exp-estilos.js) também verifica o esqueleto (checkSkeleton): ossos que mudam de tamanho,
// partes desenhadas soltas das juntas ou que passam da junta final, juntas dobradas além do limite. --style=<id> carrega o
// estilo e verifica as partes que ele desenha (ExpStyle.parts).
// Uso: node scripts/check-motion.mjs --project=<id> [--2d] [--style=exp-palito] [--range=0:20] [--fps=30] [--out=relatorio.txt] [--append]
import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, catalog, parseArgs } from './render-lib.mjs';

// Limites em BL (comprimento do corpo) por segundo; quem voa tem os seus. Tolerâncias de chão em BL, de pé em px.
export const LIMITS = {
  walk: { speed: 4, accel: 10, turn: 4 }, air: { speed: 30, accel: 150, turn: 15 },
  slip: 1, footPx: 1.5, sink: .02, lift: .12, jump: 3,
};
const W = 1920, H = 1080, FOCAL = H / (2 * Math.tan(20 * Math.PI / 180));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(a[0], a[1], a[2]), unit = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Câmera {pos, tgt} (lookAt com cima +Y, fov vertical 40°, 1920x1080) → {x, y, depth} em px.
export function project(cam, p) {
  const fw = unit(sub(cam.tgt, cam.pos)), rt = unit(cross(fw, [0, 1, 0])), up = cross(rt, fw), d = sub(p, cam.pos), z = dot(d, fw);
  return { x: W / 2 + FOCAL * dot(d, rt) / z, y: H / 2 - FOCAL * dot(d, up) / z, depth: z };
}
const inside = q => q.depth > 0 && q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H;
const camCut = (a, b) => { const r = len(sub(a.pos, a.tgt)); return len(sub(a.pos, b.pos)) > .25 * r || len(sub(a.tgt, b.tgt)) > .25 * r; };

// frames = [{t, shot, cam: {pos, tgt}, agents: [{id, S, air, p, f, parts: [{c, r, bottom}], feet: [{name, pos, stance,
// k, h}], hidden}]}]; p = ponto do trilho (locomoção, sem o balanço), f = frente, bottom/h = altura acima do chão.
export function checkMotion(frames, lim = LIMITS) {
  const out = [], add = (type, f, id, info) => out.push({ type, t: +f.t.toFixed(3), id, info });
  frames.forEach((f, i) => {
    const prev = i && frames[i - 1].shot === f.shot ? frames[i - 1] : null, prev2 = prev && i > 1 && frames[i - 2].shot === f.shot ? frames[i - 2] : null;
    // px por unidade na profundidade do ponto; fora do quadro (com folga de 10%) ou atrás da câmera não aparece (0).
    const cut = prev && camCut(prev.cam, f.cam), dt = prev ? f.t - prev.t : 0;
    const pxPer = c => { const q = project(f.cam, c); return q.depth > .05 && q.x > -.1 * W && q.x < 1.1 * W && q.y > -.1 * H && q.y < 1.1 * H ? FOCAL / q.depth : 0; };
    const byId = fr => fr ? new Map(fr.agents.map(a => [a.id, a])) : new Map(), A0 = byId(prev), A00 = byId(prev2);
    // Atravessamento: partes (esferas) de seres diferentes.
    for (let a = 0; a < f.agents.length; a++) for (let b = a + 1; b < f.agents.length; b++) {
      const P = f.agents[a], Q = f.agents[b];
      if (len(sub(P.p, Q.p)) > 2 * (P.S + Q.S)) continue;
      let gap = Infinity;
      for (const u of P.parts) for (const v of Q.parts) gap = Math.min(gap, len(sub(u.c, v.c)) - u.r - v.r);
      if (gap < 0) add('atravessamento', f, `${P.id}|${Q.id}`, `${(gap / Math.min(P.S, Q.S)).toFixed(3)} BL`);
    }
    for (const a of f.agents) {
      const L = a.air ? lim.air : lim.walk, b = A0.get(a.id), c0 = a.parts[0].c;
      // Chão: partes abaixo dele; pé de apoio fora dele; ninguém apoiado sem estar no ar. Escondido (túnel) não conta.
      if (!a.air && !a.hidden) {
        const low = Math.min(...a.parts.filter(q => pxPer(q.c)).map(q => q.bottom));
        if (low < -lim.sink * a.S) add('abaixo do chão', f, a.id, `${(low / a.S).toFixed(3)} BL`);
        const st = a.feet.filter(x => x.stance);
        for (const x of st) if (Math.abs(x.h) * pxPer(x.pos) > lim.footPx) add(x.h < 0 ? 'abaixo do chão' : 'solto no ar', f, a.id, `pé ${x.name} ${(x.h * pxPer(x.pos)).toFixed(1)} px`);
        // Perna que não alcança o pé plantado: o corpo está alto demais (flutua).
        for (const x of st) if (x.reach * pxPer(x.pos) > lim.footPx) add('solto no ar', f, a.id, `perna ${x.name} não alcança (${(x.reach * pxPer(x.pos)).toFixed(1)} px)`);
        if (a.feet.length && !st.length) add('solto no ar', f, a.id, 'nenhum pé apoiado');
      }
      if (!prev) continue;
      if (!b) { if (!cut && !a.hidden && inside(project(f.cam, c0))) add('aparece no quadro', f, a.id, ''); continue; }
      // Cinemática do ponto do trilho; salto exclui velocidade e aceleração no mesmo par.
      const v = len(sub(a.p, b.p)) / dt / a.S;
      if (v > lim.jump * L.speed) { add('salto', f, a.id, `${(v * dt).toFixed(2)} BL em 1 quadro`); continue; }
      if (v > L.speed) add('velocidade', f, a.id, `${v.toFixed(2)} BL/s`);
      const w = Math.acos(Math.max(-1, Math.min(1, dot(unit(a.f), unit(b.f))))) / dt;
      // Escondido (dentro do túnel ou do buraco, atrás de terra) não conta para giro e aceleração; velocidade e salto sim.
      if (w > L.turn && !a.hidden) add('giro', f, a.id, `${w.toFixed(2)} rad/s`);
      const b2 = A00.get(a.id);
      if (b2 && !a.hidden) {
        const ac = len([a.p[0] - 2 * b.p[0] + b2.p[0], a.p[1] - 2 * b.p[1] + b2.p[1], a.p[2] - 2 * b.p[2] + b2.p[2]]) / (dt * dt) / a.S;
        if (ac > L.accel && len(sub(b.p, b2.p)) / dt / a.S <= lim.jump * L.speed) add('aceleração', f, a.id, `${ac.toFixed(1)} BL/s²`);
      }
      // Pé de apoio: mesmo ciclo nos dois quadros, deslocamento em px na profundidade atual.
      for (const x of a.feet) {
        const y = b.feet.find(q => q.name === x.name);
        if (!x.stance || !y || !y.stance || x.k !== y.k) continue;
        const px = len(sub(x.pos, y.pos)) * pxPer(x.pos);
        if (px > lim.slip) add('pé deslizando', f, a.id, `pé ${x.name} ${px.toFixed(2)} px`);
      }
    }
    if (prev && !cut) for (const [id, b] of A0) if (!f.agents.some(a => a.id === id) && !b.hidden && inside(project(prev.cam, b.parts[0].c))) add('some no quadro', f, id, '');
  });
  return out;
}

// Relatório: contagem por tipo e os primeiros exemplos de cada um.
export function report(v, title, n = 4) {
  const types = [...new Set(v.map(x => x.type))], lines = [`${title}: ${v.length} violações`];
  for (const ty of types) {
    const xs = v.filter(x => x.type === ty), ids = new Set(xs.map(x => x.id));
    lines.push(`  ${ty}: ${xs.length} (${ids.size} seres ou pares)`);
    for (const x of xs.slice(0, n)) lines.push(`    t=${x.t} ${x.id} ${x.info}`);
  }
  return lines.join('\n');
}

// Roda o projeto em Node: carrega a plataforma, motion/timeline e os scripts da cena; troca o palco, o bioma e a vida de
// fundo por stubs (nada desenha), envolve creature3d (para saber trilho, s e opções) e captura drawCreature3d.
// Stub que aceita qualquer uso (document, canvas, THREE, p5): toda leitura, chamada ou new devolve ele mesmo.
const ANY = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : ANY, apply: () => ANY, construct: () => ANY, set: () => true });
export function sampleProject(id, { fps = 30, range } = {}) {
  const platform = catalog(), project = platform.resolveProject(id), win = {};
  const ctx = vm.createContext({ AnimationPlatform: platform, projectConfig: project, window: win, document: ANY, animationEngine: { render: async () => {}, canvas: ANY }, console });
  for (const file of ['src/motion.js', 'src/timeline.js', ...project.scripts]) vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), ctx, { filename: file });
  let cam = null, drawn = [];
  const E = new Proxy({ eye: [0, 0, 10], focal: FOCAL, px: (p, s) => s * FOCAL / Math.max(1e-3, len(sub(p, E.eye))) }, { get: (o, k) => k in o ? o[k] : () => {} });
  const St = new Proxy({
    E, P: {}, TIME: { value: 0 }, THREE: ANY, scene: ANY, sky: {}, own: x => x, begin() {}, end() {},
    camera(tgt, d, elev, yaw = 0) { const pos = [tgt[0] + d * Math.cos(elev) * Math.sin(yaw), tgt[1] + d * Math.sin(elev), tgt[2] + d * Math.cos(elev) * Math.cos(yaw)]; cam = { pos, tgt: [...tgt] }; E.eye = pos; },
  }, { get: (o, k) => k in o ? o[k] : () => ANY });
  ctx.toonStage = () => St; ctx.toonBiome = () => ({ draw() {} }); ctx.toonAmbient = () => () => {};
  const make = ctx.creature3d;
  ctx.creature3d = (name, track, s, S, t, o = {}) => Object.assign(make(name, track, s, S, t, o), { _track: track, _s: s, _o: o });
  ctx.drawCreature3d = (e, P) => drawn.push(P);
  win.buildLowpolyScene({ THREE: ANY, scene: ANY, own: x => x, cameraPose() {} });
  const starts = project.storyboard.map(s => s.start), [t0, t1] = range || [0, project.duration], frames = [];
  for (let i = Math.round(t0 * fps); i < Math.round(t1 * fps); i++) {
    const t = i / fps; drawn = []; cam = null;
    vm.runInContext(`drawWorld(${t})`, ctx);
    const seen = new Map(), agents = drawn.map(P => {
      const o = P._o || {}, base = o.id ?? `${P.name}:${P.seed}`, n = seen.get(base) || 0; seen.set(base, n + 1);
      const g = groundOf(P), air = P.air ?? P.flying;
      return {
        id: n ? `${base}#${n}` : base, S: P.S, air, hidden: !!(P.hidden ?? o.hidden), p: P.segs[0].p, f: P.segs[0].f,
        parts: [...P.segs, P.head].map(q => ({ c: q.c, r: .9 * (q.ax[1] + q.ax[2]) / 2, bottom: air ? 1 : g(q.c) - q.ax[1] })),
        feet: air ? [] : P.legs.map(l => ({ name: l.name, pos: l.foot, stance: l.stance, k: l.k, h: g(l.foot), reach: len(sub(l.end, l.foot)) })),
      };
    });
    frames.push({ t, shot: starts.filter(s => s <= t + 1e-9).length - 1, cam: cam || { pos: [0, 0, 10], tgt: [0, 0, 0] }, agents });
  }
  return frames;
}
// Altura acima do chão: pela função do relevo (track.h) ou, sem ela, no plano do trilho mais perto ao longo do caminho.
function groundOf(P) {
  const tr = P._track;
  if (tr.h) return p => p[1] - tr.h(p[0], p[2]);
  // Quadro do caminho cujo plano normal (perpendicular à frente) contém p, numa janela de ±2 BL em torno do ser: é onde
  // o pé foi plantado (pé = ponto do caminho + lado + cima). Raízes por mudança de sinal e bisseção; vale a de ponto
  // mais perto de p (numa meia-volta fechada vários planos passam perto do pé de dentro). A janela não deixa pular para
  // outro trecho do mesmo caminho (ida e volta lado a lado).
  return p => {
    const s0 = P._s * P.S, w = 2 * P.S, g = d => { const F = tr(d); return dot(sub(p, F.p), unit(F.f)); };
    let best = null;
    for (let i = 0; i < 40; i++) {
      let a = s0 - w + 2 * w * i / 40, b = a + 2 * w / 40, ga = g(a);
      if (Math.sign(ga) === Math.sign(g(b))) continue;
      for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (Math.sign(g(m)) === Math.sign(ga)) a = m; else b = m; }
      if (best === null || len(sub(p, tr(a).p)) < len(sub(p, tr(best).p))) best = a;
    }
    const F = tr(best ?? s0); return dot(sub(p, F.p), unit(F.u));
  };
}

// Adaptador 2D (exp/estilos, --2d): cenas com coreografia sem desenho (EST.frame em src/scenes/exp-estilos.js). O ponto
// 2D (y para baixo) vira [x, −y, depth] e a câmera {cx, cy, z} vira uma câmera de frente a FOCAL / z: 1 unidade = z px,
// como na tela. Cada camada de paralaxe f é verificada à parte, com a sua câmera (cx = lerp(960, cx, f)). No ar = a.air (ave
// ou borboleta voando, peixe, corredor no voo da passada; sem a.air, kind 'fly'): sem chão nem pés. Raio da cabeça = metade
// do osso head (variantes da cena fora de SPECS).
const SCENES = { 'estilos-a': 'A', 'estilos-h': 'H', 'estilos-p': 'P', 'estilos-n': 'N' };
// Carrega motion.js e os scripts da cena; com style, também os do estilo (window = o global; document, canvas e p5 = ANY).
function load2d(id, style) {
  const platform = catalog(), project = platform.resolveProject(id, style), ctx = vm.createContext({ AnimationPlatform: platform, projectConfig: project, window: {}, console });
  if (style) Object.assign(ctx, { window: vm.runInContext('globalThis', ctx), document: ANY, Path2D: ANY, Image: ANY, OffscreenCanvas: ANY, p5: ANY });
  for (const file of ['src/motion.js', ...project.scripts, ...(style ? platform.styles[style].scripts : [])]) vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), ctx, { filename: file });
  return { ctx, project, scene: SCENES[id] || 'A' };
}
export function sampleProject2d(id, { fps = 30, range } = {}) {
  const { ctx, project, scene } = load2d(id), [t0, t1] = range || [0, project.duration], layers = new Map();
  for (let i = Math.round(t0 * fps); i < Math.round(t1 * fps); i++) {
    const t = i / fps, F = ctx.EST.frame(scene, t), byLayer = new Map();
    for (const a of F.actors) {
      const P = a.pose, d = a.depth || 0, X = (x, y) => [x, -y, d], air = !!(a.air ?? a.kind === 'fly'), g = a.ground, J = P.joints, hr = J ? Math.hypot(J.headTop[0] - J.headBase[0], J.headTop[1] - J.headBase[1]) / 2 : ctx.SPECS[P.spec].head.r * P.size;
      const parts = [...P.spine, { ...P.head, r: hr }].map(q => ({ c: X(q.x, q.y), r: .9 * q.r, bottom: air ? 1 : g(q.x) - q.y - q.r }));
      const feet = air ? [] : Object.entries(P.limbs).filter(([, l]) => l.foot).map(([name, l]) => { const e = l.toe || l.end; return { name, pos: X(...e), stance: l.stance, k: 0, h: g(e[0]) - e[1], reach: 0 }; });  // chão no dedo
      const f = a.layer ?? 1; if (!byLayer.has(f)) byLayer.set(f, []);
      byLayer.get(f).push({ id: a.id, S: P.size, air, hidden: !!a.hidden, p: X(a.track.x, a.track.y), f: [Math.cos(a.track.angle), -Math.sin(a.track.angle), 0], parts, feet });
    }
    for (const f of new Set([...layers.keys(), ...byLayer.keys()])) {
      const cx = 960 + (F.cam.cx - 960) * f;
      if (!layers.has(f)) layers.set(f, []);
      layers.get(f).push({ t, shot: F.shot, cam: { pos: [cx, -F.cam.cy, FOCAL / F.cam.z], tgt: [cx, -F.cam.cy, 0] }, agents: byLayer.get(f) || [] });
    }
  }
  return layers;
}

// ---------- Esqueleto ----------
// Faixas (rad) das juntas do humano de lado, com o sinal de quem olha para a direita (facing = −1 espelha): joelho (coxa →
// canela; a canela volta para trás) e cotovelo (braço → antebraço; o antebraço vai à frente) dobram só para um lado;
// pescoço (em relação ao eixo pelve → peito) e cabeça (em relação ao pescoço) giram pouco.
export const JOINT_RANGES = { knee: [0, 2.6], elbow: [0, 2.6], neck: [-.6, .6], head: [-.5, .5] };
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), vec = (J, [a, b]) => [J[b][0] - J[a][0], J[b][1] - J[a][1]];
const turn = (u, v) => Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]);  // giro de u para v (y para baixo)
// [junta, faixa, sinal, osso de entrada, osso de saída]; só valem as juntas presentes (animais ficam de fora).
const ANGLES = [...['L', 'R'].flatMap(s => [[`knee${s}`, 'knee', 1, [`hip${s}`, `knee${s}`], [`knee${s}`, `ankle${s}`]], [`elbow${s}`, 'elbow', -1, [`shoulder${s}`, `elbow${s}`], [`elbow${s}`, `wrist${s}`]]]),
  ['neck', 'neck', 1, ['pelvis', 'chest'], ['neck', 'headBase']], ['head', 'head', 1, ['neck', 'headBase'], ['headBase', 'headTop']]];
// Juntas finais que o traço não pode passar: tornozelo, pulso, base da cabeça e ponta de membro de animal (<membro>.end).
const END = /^(ankle|wrist)[LR]?$|^headBase$|\.end$/;

// frames = [{t, actors: [{id, facing, joints: {nome: [x, y]}, bones: [{name, a, b, len}], limits?, parts?}]}]; limits = pose.limits
// (spec.limits: rad ou [mín, máx] por junta) sobrepõe lim naquele ser. Contrato das partes
// (ExpStyle.parts(actor, F), exatamente o que o estilo desenha): {actor, name, from, to, pts: [[x, y], ...] (eixo do
// traço em px do mundo), r (meia largura), cap: 'round' | 'butt' | 'square'}; from/to = juntas, to = null em parte
// terminal (pé, mão, cabeça). Cabeça: pts = [headBase, headTop], eixo de baixo para cima; o círculo ou a elipse tem esse
// eixo como diâmetro e meia largura r, então a base dela toca headBase; from = 'headBase', to = null.
// Reprova em todo quadro (uma entrada por quadro, ser e regra; tolerância max(1 px, 1% do osso)):
//   osso varia: |joints[b] − joints[a]| difere de len em mais de 1%;
//   parte solta: pts[0] fora de joints[from];
//   ângulo: junta fora de lim (JOINT_RANGES);
//   passa da junta: parte cujo to é junta final (END) com algum ponto, mais a ponta do traço (round: r em todo ponto;
//   square: r à frente e de lado no último; butt: r de lado no último), projetado no eixo from → to além de |to − from|.
// Sem parts, só osso varia e ângulo.
export function checkSkeleton(frames, lim = JOINT_RANGES) {
  const out = [];
  for (const f of frames) for (const x of f.actors) {
    const J = x.joints, fc = x.facing ?? 1, bad = {}, add = (ty, s) => (bad[ty] ||= []).push(s), L = x.limits ? { ...lim, ...Object.fromEntries(Object.entries(x.limits).map(([k, v]) => [k, Array.isArray(v) ? v : [-v, v]])) } : lim;
    for (const b of x.bones) { const e = d2(J[b.a], J[b.b]) / b.len - 1; if (Math.abs(e) > .01) add('osso varia', `${b.name} ${(100 * e).toFixed(1)}%`); }
    for (const [name, key, sg, u, v] of ANGLES) {
      if (![...u, ...v].every(k => J[k])) continue;
      const g = sg * fc * turn(vec(J, u), vec(J, v)), [lo, hi] = L[key];
      if (g < lo - 1e-9 || g > hi + 1e-9) add('ângulo', `${name} ${g.toFixed(2)} rad`);
    }
    for (const p of x.parts || []) {
      if (!p.from) continue;
      const A = J[p.from], B = p.to && J[p.to];
      if (!A || p.to && !B) { add('parte solta', `${p.name}: junta inexistente`); continue; }
      const bone = x.bones.find(b => b.a === p.from && (!p.to || b.b === p.to)), tol = Math.max(1, .01 * (B ? d2(A, B) : bone?.len || 0)), gap = d2(p.pts[0], A);
      if (gap > tol) add('parte solta', `${p.name} ${gap.toFixed(1)} px de ${p.from}`);
      if (!B || !END.test(p.to)) continue;
      const L = d2(A, B), u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = p.pts.length, P = p.pts[n - 1], Q = p.pts[n - 2] || A, dl = d2(P, Q) || 1, w = [(P[0] - Q[0]) / dl, (P[1] - Q[1]) / dl];
      const ext = i => p.cap === 'round' ? p.r : i < n - 1 ? 0 : p.r * (Math.abs(w[0] * u[1] - w[1] * u[0]) + (p.cap === 'square' ? Math.abs(w[0] * u[0] + w[1] * u[1]) : 0));
      const over = Math.max(...p.pts.map((q, i) => (q[0] - A[0]) * u[0] + (q[1] - A[1]) * u[1] + ext(i))) - L;
      if (over > tol) add('passa da junta', `${p.name} ${over.toFixed(1)} px além de ${p.to}`);
    }
    for (const [ty, xs] of Object.entries(bad)) out.push({ type: ty, t: +f.t.toFixed(3), id: x.id, info: xs.slice(0, 3).join(', ') + (xs.length > 3 ? ` (+${xs.length - 3})` : '') });
  }
  return out;
}

// Pose antiga (sem joints/bones; para medir o antes): humano com coluna (spine[0] peito = base do pescoço, spine[1] pelve),
// cabeça (headBase = centro − r·cima, headTop = centro + r·cima, cima = facing·(sen a, −cos a), r = spec.head.r·size) e
// pernas e braços com os nomes novos; outros seres com spine<i>, head e <membro>.root|mid|end. Ossos dos membros: l1/l2
// da especificação; coluna e pescoço (peito → base da cabeça; nos animais spine0 → cabeça): o len em ref (os ossos do
// primeiro quadro amostrado do ser) ou, sem ref, o atual.
export function legacySkeleton(P, spec, ref) {
  const J = { head: [P.head.x, P.head.y] }, bones = [], h = J.head, fc = P.facing ?? 1, r = spec.head.r * P.size, up = [fc * Math.sin(P.head.angle), -fc * Math.cos(P.head.angle)];
  const bone = (name, a, b, len) => bones.push({ name, a, b, len: len ?? ref?.find(q => q.name === name)?.len ?? d2(J[a], J[b]) });
  if (P.spec === 'human') {
    Object.assign(J, { chest: [P.spine[0].x, P.spine[0].y], neck: [P.spine[0].x, P.spine[0].y], pelvis: [P.spine[1].x, P.spine[1].y], headBase: [h[0] - r * up[0], h[1] - r * up[1]], headTop: [h[0] + r * up[0], h[1] + r * up[1]] });
    bone('spine', 'pelvis', 'chest'); bone('neck', 'neck', 'headBase');
  } else { P.spine.forEach((q, i) => J[`spine${i}`] = [q.x, q.y]); bone('neck', 'spine0', 'head'); }
  for (const lb of spec.limbs) {
    const l = P.limbs[lb.name], m = /^(leg|arm)([LR])$/.exec(lb.name); if (!l) continue;
    const [j0, j1, j2] = m ? (m[1] === 'leg' ? ['hip', 'knee', 'ankle'] : ['shoulder', 'elbow', 'wrist']).map(k => k + m[2]) : ['root', 'mid', 'end'].map(k => `${lb.name}.${k}`);
    const [b1, b2] = m ? (m[1] === 'leg' ? ['thigh', 'shin'] : ['upperArm', 'forearm']).map(k => k + m[2]) : [`${lb.name}.1`, `${lb.name}.2`];
    Object.assign(J, { [j0]: l.root, [j1]: l.mid, [j2]: l.end }); bone(b1, j0, j1, lb.l1 * P.size); bone(b2, j1, j2, lb.l2 * P.size);
  }
  return { joints: J, bones };
}

// Esqueleto de cada ser em todo quadro de uma cena 2D: pose.joints/bones (skeleton.js) ou legacySkeleton na pose antiga
// (legacy = algum ser sem joints). Com style, parts = ExpStyle.parts(actor, F); geometry = false se o estilo não as tem.
export function sampleSkeleton2d(id, { fps = 30, range, style } = {}) {
  const { ctx, project, scene } = load2d(id, style), [t0, t1] = range || [0, project.duration], first = new Map(), frames = [], parts = style && ctx.ExpStyle?.parts;
  let legacy = false;
  for (let i = Math.round(t0 * fps); i < Math.round(t1 * fps); i++) {
    const t = i / fps, F = ctx.EST.frame(scene, t);
    frames.push({ t, actors: F.actors.map(a => {
      const P = a.pose, sk = P.joints ? { joints: P.joints, bones: P.bones } : legacySkeleton(P, ctx.SPECS[P.spec], first.get(a.id));
      legacy ||= !P.joints; if (!first.has(a.id)) first.set(a.id, sk.bones);
      return { id: a.id, facing: P.facing, ...sk, ...(P.limits && { limits: P.limits }), ...(parts && { parts: parts(a, F) }) };
    }) });
  }
  return { frames, geometry: !style || !!parts, legacy };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2)), range = args.range && String(args.range).split(':').map(Number), fps = Number(args.fps || 30);
  const runs = args['2d'] ? [...sampleProject2d(args.project, { fps, range })].map(([f, frames]) => [`${args.project} camada ${f}`, frames]) : [[args.project, sampleProject(args.project, { fps, range })]];
  let total = 0, n = 0;
  const emit = (v, title) => { const text = report(v, title); console.log(text); total += v.length; if (args.out) writeFileSync(args.out, text + '\n', { flag: args.append || n++ ? 'a' : 'w' }); };
  for (const [title, frames] of runs) emit(checkMotion(frames), `${title} (${frames.length} quadros, ${frames.reduce((n, f) => Math.max(n, f.agents.length), 0)} seres no máximo)`);
  if (args['2d']) {
    const { frames, geometry, legacy } = sampleSkeleton2d(args.project, { fps, range, style: args.style }), v = checkSkeleton(frames);
    if (!geometry) v.unshift({ type: 'sem geometria', t: 0, id: args.style, info: 'o estilo não tem ExpStyle.parts' });
    emit(v, `${args.project} esqueleto${args.style ? ` ${args.style}` : ''}${legacy ? ' (pose antiga)' : ''} (${frames.length} quadros)`);
  }
  process.exitCode = total ? 1 : 0;
}
