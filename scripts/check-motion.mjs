// check-motion.mjs (exp/visual-rico): verificador físico genérico das cenas toon3d. Roda a cena em Node (vm, sem
// desenho nem GPU), captura cada ser desenhado (drawCreature3d) e a câmera (St.camera) em todo quadro e reprova:
// corpos que se atravessam, velocidade, aceleração ou giro acima do limite, pé de apoio que desliza mais de 1 px, corpo
// abaixo do chão ou solto sem estar no ar, ser que aparece ou some com o centro dentro do quadro e salto de posição.
// Uso: node scripts/check-motion.mjs --project=<id> [--range=0:20] [--fps=30] [--out=relatorio.txt]
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
export function sampleProject(id, { fps = 30, range } = {}) {
  const ANY = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : ANY, apply: () => ANY, construct: () => ANY, set: () => true });
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2)), range = args.range && String(args.range).split(':').map(Number);
  const frames = sampleProject(args.project, { fps: Number(args.fps || 30), range }), v = checkMotion(frames);
  const text = report(v, `${args.project} (${frames.length} quadros, ${frames.reduce((n, f) => Math.max(n, f.agents.length), 0)} seres no máximo)`);
  console.log(text);
  if (args.out) writeFileSync(args.out, text + '\n', { flag: args.append ? 'a' : 'w' });
  process.exitCode = v.length ? 1 : 0;
}
