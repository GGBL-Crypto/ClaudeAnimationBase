// flora.js (toon3d, exp/visual-rico): espalhamento com zonas livres e plantas de qualquer bioma (capim, flores, folhas
// no chão, samambaias, pedras, gravetos, cogumelos, troncos). scatter e zoneDist são puros; o resto desenha pelo palco.
// Zona livre = cápsula {a: [x, z], b: [x, z], r} (trilha, clareira, lugar do personagem); b omitido = círculo.
function zoneDist(x, z, zones) {
  let d = Infinity;
  for (const { a, b = a, r } of zones) {
    const ux = b[0] - a[0], uz = b[1] - a[1], L2 = ux * ux + uz * uz, k = L2 ? clamp(((x - a[0]) * ux + (z - a[1]) * uz) / L2) : 0;
    d = Math.min(d, Math.hypot(x - a[0] - k * ux, z - a[1] - k * uz) - r);
  }
  return d;
}
// n pontos em area {x0, x1, z0, z1} fora das zonas livres; d = distância até a zona mais perto (para encolher perto
// dela), k = sorteio estável do ponto. o.zpow > 1 adensa perto de z1 (a frente). Determinístico pela semente.
function scatter(n, seed, area, o = {}) {
  const { free = [], zpow = 1, tries = 8 * n } = o, out = [];
  for (let i = 0; out.length < n && i < tries; i++) {
    const x = lerp(area.x0, area.x1, hash(seed * 7.13 + i * 1.71 + 3)), z = lerp(area.z1, area.z0, Math.pow(hash(seed * 3.31 + i * 2.93 + 5), zpow)), d = zoneDist(x, z, free);
    if (d > 0) out.push({ x, z, d, k: hash(seed * 1.9 + i * 6.7) });
  }
  return out;
}

// Capim fixo e instanciado: lâmina afinando em 3 segmentos, raiz escura e ponta clara; o vento entra no vertex shader.
function grassField(St, pts, o = {}) {
  const { THREE } = St, { h = p => .08 + .32 * p.k, colors = ['#6FA83E', '#86B443', '#5C9A3A', '#A3BC4E', '#78A844'], fade = '#F3E4C0', far = 24 } = o;
  const bg = new THREE.BufferGeometry(), bv = [], bc = [], bi = [], root = new THREE.Color(.36, .38, .26), tip = new THREE.Color(1.55, 1.45, .95);
  for (let j = 0; j <= 3; j++) { const y = j / 3, w = .5 * (1 - y) + .02; bv.push(-w * .06, y, 0, w * .06, y, 0); const c = root.clone().lerp(tip, y); bc.push(c.r, c.g, c.b, c.r, c.g, c.b); }
  for (let j = 0; j < 3; j++) bi.push(2 * j, 2 * j + 1, 2 * j + 2, 2 * j + 1, 2 * j + 3, 2 * j + 2);
  bg.setAttribute('position', new THREE.Float32BufferAttribute(bv, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); bg.setIndex(bi); bg.computeVertexNormals();
  const sway = function sway(sh) {
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 ip = vec3(instanceMatrix[3]);
  float w = .55 * sin(uTime * 1.3 + ip.x * .7 + ip.z * .4) + .3 * sin(uTime * 2.3 + ip.x * 1.9);
  transformed.x += w * position.y * position.y * .35; transformed.z += .3 * w * position.y * position.y * .35;`);
  };
  const mat = St.toon({ vertexColors: true, side: THREE.DoubleSide }, { gobo: o.gobo }, sway), gm = new THREE.InstancedMesh(St.own(bg), mat, pts.length);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), m = new THREE.Matrix4(), c = new THREE.Color();
  pts.forEach((p, i) => {
    const hh = h(p); gm.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, o.ground(p.x, p.z) - .01, p.z), q.setFromEuler(e.set(0, p.k * 977 % TAU, .15 * (frac(p.k * 31) - .5))), new THREE.Vector3(hh * 1.2, hh, hh)));
    gm.setColorAt(i, c.set(colors[Math.floor(frac(p.k * 13) * colors.length)]).lerp(new THREE.Color(fade), .2 * clamp(-p.z / far)));
  });
  gm.receiveShadow = true; St.scene.add(gm); return gm;
}

// Flor ao vento (por quadro): caule, duas folhas texturizadas, miolo e 5–7 pétalas texturizadas tingidas.
function flower(E, f, t) {
  const { add, mul, unit, cross } = V3, g = [f.x, f.y - .02, f.z], w = wind(t, f.x * 100, 3);
  const top = add(g, [.2 * f.h * w + .015 * Math.sin(t * 2.3 + f.i), f.h, .07 * f.h * Math.sin(t * 1.4 + f.i)]);
  E.rod(g, top, .012, '#4E8A34');
  for (const [k, da] of [[.35, 1.3], [.55, -1.6]]) {
    const la = f.a + da, ly = unit([Math.cos(la), .7 + .3 * w, Math.sin(la)]), lz = unit(cross([-Math.sin(la), 0, Math.cos(la)], ly));
    E.quad(k > .4 ? 'leaf2' : 'leaf', V3.mix(g, top, k), mul(cross(ly, lz), .1), mul(ly, .16 * f.h + .06), mul(lz, .1), '#FFFFFF');
  }
  E.ball(top, .3 * f.r, f.center || '#F2B33A', 'sph');
  const n = f.n || 6;
  for (let k = 0; k < n; k++) {
    const a = f.a + k * TAU / n, Y = unit([Math.cos(a), .25 + .25 * w, Math.sin(a)]), Z = unit(cross([-Math.sin(a), 0, Math.cos(a)], Y));
    E.quad('petal', top, mul(cross(Y, Z), .55 * f.r), mul(Y, 1.1 * f.r), mul(Z, .4 * f.r), f.c);
  }
}
// Samambaia (por quadro): frondes em leque que arqueiam e balançam.
function fern(E, f, t) {
  const { mul, unit, cross } = V3, w = wind(t, f.x * 100, 5);
  for (let k = 0; k < (f.n || 7); k++) {
    const a = f.a + k * TAU / (f.n || 7) + .2 * hash(f.i + k), Y = unit([Math.cos(a), 1.3 + .3 * hash(k + f.i * 3) + .15 * w, Math.sin(a) + .1 * w]), Z = unit(cross([-Math.sin(a), 0, Math.cos(a)], Y));
    E.quad('fern', [f.x, f.y, f.z], mul(cross(Y, Z), .28 * f.h), mul(Y, f.h * (.8 + .3 * hash(k * 7 + f.i))), mul(Z, f.h), k % 3 ? '#FFFFFF' : '#E6F0B8');
  }
}

// Bioma: chão, plantas fixas e uma função draw(t) para o que balança. o = {area, ground: h(x, z), free: zonas, seed,
// color(x, z): cor do chão}. 'meadow' = campo (capim, flores, folhas caídas, pedrinhas); 'forest' = chão de mata
// (serapilheira densa, musgo, samambaias, gravetos, pedras, cogumelos e troncos ao fundo).
function toonBiome(St, name, o) {
  const { area, ground: hAt, free = [], seed = 1 } = o, { THREE } = St, { mul, unit, cross } = V3, forest = name === 'forest';
  if (!['meadow', 'forest'].includes(name)) throw new Error(`Bioma desconhecido: ${name}`);
  const flat = (p, a, l, w, lift = .006, tilt = 0) => {  // folha deitada no chão, rumo a, inclinação tilt
    const Y = unit([Math.cos(a), tilt, Math.sin(a)]), X = unit(cross(Y, [0, 1, 0])), Z = cross(X, Y);
    return [[p.x, hAt(p.x, p.z) + lift, p.z], mul(X, w), mul(Y, l), mul(Z, l), p.c];
  };
  const leafCols = forest ? ['#FFFFFF', '#F0D8A0', '#E8C090', '#D8E0A0'] : ['#FFFFFF', '#E9E2A0', '#D8B070'];  // a metade seca da mata usa a folha seca (semente 13)
  const litter = scatter(forest ? 2600 : 500, seed + 11, area, { free: free.map(z => ({ ...z, r: z.r * .3 })), zpow: 1.3 }).map((p, i) => ({ ...p, c: leafCols[i % leafCols.length] }));
  const half = Math.floor(litter.length / 2), leafMat = k => St.cut('leaf', k);
  St.fixed(St.quadGeo(.12, -.05), leafMat(0), litter.slice(0, half).map(p => flat(p, p.k * 97, .12 + .14 * frac(p.k * 7), .09 + .1 * frac(p.k * 7), .004 + .004 * frac(p.k * 3), .15)));
  St.fixed(St.quadGeo(.12, -.05), leafMat(forest ? 13 : 3), litter.slice(half).map(p => flat(p, p.k * 97, .1 + .12 * frac(p.k * 7), .08 + .09 * frac(p.k * 7), .006, .2)));
  // Pedras e pedrinhas (textura de pedra) e gravetos (casca).
  const rocks = scatter(forest ? 40 : 60, seed + 21, area, { free, zpow: 1.2 }), rk = St.toon({ map: St.tex('stone') }, { rim: true });
  St.fixed(new THREE.IcosahedronGeometry(1, 1), rk, rocks.map(p => { const r = .04 + (forest ? .25 : .1) * p.k * p.k; return [[p.x, hAt(p.x, p.z) + .2 * r, p.z], [1.3 * r, 0, 0], [0, .6 * r, 0], [0, 0, r], ['#E8DDD0', '#D6CBB8', '#F0E4D2'][Math.floor(p.k * 3)]]; }), true);
  const twigs = scatter(forest ? 70 : 15, seed + 31, area, { free }), bark = St.toon({ map: St.tex('bark') }, { rim: true });
  St.fixed(new THREE.CylinderGeometry(1, .7, 1, 6, 1), bark, twigs.map(p => { const a = p.k * 51, L = .3 + .8 * p.k, Y = [Math.cos(a) * L, .02, Math.sin(a) * L], X = unit(cross(Y, [0, 1, 0])); return [[p.x, hAt(p.x, p.z) + .02, p.z], mul(X, .018), Y, mul(unit(cross(X, Y)), .018), '#C8A880']; }), true);
  // Capim: no campo, denso e baixo perto das zonas livres; na mata, ralo.
  const grass = scatter(forest ? 2500 : 14000, seed + 41, area, { free: free.map(z => ({ ...z, r: z.r * .55 })), zpow: 1.6 });
  grassField(St, grass, { ground: hAt, gobo: o.gobo, h: p => (.08 + .32 * p.k) * (p.d < 1.5 ? .2 + .8 * (p.d / 1.5) ** 2 : 1) * (forest ? .7 : 1 + .6 * clamp(-p.z / 20)),
    colors: forest ? ['#5C8A36', '#6E9A3A', '#4E7A30', '#7FA040'] : undefined });
  const flowers = scatter(forest ? 0 : 120, seed + 51, { ...area, z0: Math.max(area.z0, -8) }, { free: free.map(z => ({ ...z, r: z.r + .2 })), zpow: 1.4 }).map((p, i) => ({
    ...p, y: hAt(p.x, p.z), i, h: .22 + .32 * p.k, r: .08 + .05 * frac(p.k * 9), a: p.k * TAU * 7, c: ['#FFFFFF', '#F7D33C', '#F29AC8', '#B48CE0', '#FFFFFF', '#FF9A5C'][i % 6], n: 5 + i % 3,
  }));
  const ferns = scatter(forest ? 34 : 0, seed + 61, area, { free: free.map(z => ({ ...z, r: z.r + .3 })) }).map((p, i) => ({ ...p, y: hAt(p.x, p.z), i, h: .35 + .45 * p.k, a: p.k * 40 }));
  // Mata: musgo (bolas achatadas), cogumelos e troncos com casca, mais copas ao longe.
  const moss = forest ? scatter(160, seed + 71, area, { free }) : [], shrooms = forest ? scatter(16, seed + 81, area, { free: free.map(z => ({ ...z, r: z.r + .2 })) }) : [];
  const trunks = forest ? scatter(14, seed + 91, { ...area, z1: area.z0 + (area.z1 - area.z0) * .7 }, { free: free.map(z => ({ ...z, r: z.r + 1.5 })) }) : [];
  const bushes = forest ? scatter(60, seed + 95, { ...area, z1: area.z0 + (area.z1 - area.z0) * .35 }, {}) : [];
  if (trunks.length) St.fixed(new THREE.CylinderGeometry(1, 1.25, 1, 12, 1), bark, trunks.map(p => { const r = .25 + .35 * p.k; return [[p.x, hAt(p.x, p.z) + 4, p.z], [r, 0, 0], [0, 8.4, 0], [0, 0, r], '#D8BFA0']; }), true);
  return {
    draw(t, E) {
      for (const f of flowers) flower(E, f, t);
      for (const f of ferns) fern(E, f, t);
      for (const p of moss) for (let j = 0; j < 4; j++) {  // musgo: tufos de bolinhas
        const a = p.k * 40 + j * 1.9, r = (.04 + .07 * p.k) * (1 - .15 * j), x = p.x + Math.cos(a) * .06 * j, z = p.z + Math.sin(a) * .05 * j;
        E.ball([x, hAt(x, z) + .3 * r, z], r, ['#4E7A2E', '#5E8A34', '#3E6A28'][(j + Math.floor(p.k * 3)) % 3], 'sph');
      }
      for (const p of shrooms) {
        const g = [p.x, hAt(p.x, p.z), p.z], h = .08 + .12 * p.k, top = [p.x + .01 * wind(t, p.x * 100), g[1] + h, p.z];
        E.rod(g, top, .02 + .02 * p.k, '#F4ECDA', 'cyl'); E.ovoid(top, [1, 0, 0], [0, 1, 0], .07 + .06 * p.k, .045 + .03 * p.k, .07 + .06 * p.k, p.k > .5 ? '#D8352A' : '#C98A4A', 'sph');
        if (p.k > .5) for (let j = 0; j < 5; j++) { const a = j * 1.3 + p.k * 9; E.ball(V3.add(top, [Math.cos(a) * .06, .035 + .01 * (j % 2), Math.sin(a) * .06]), .012, '#FFF8EC', 'sph'); }
      }
      for (const p of bushes) for (let j = 0; j < 3; j++) E.ball([p.x + .5 * j - .5, hAt(p.x, p.z) + .5 + .4 * p.k + .2 * j % 2, p.z - .3 * j], .7 + .6 * p.k, ['#3E6E2C', '#4E7E30', '#335E26'][(j + Math.floor(p.k * 3)) % 3], 'far');
      for (const p of trunks) for (let j = 0; j < 4; j++) E.ball([p.x + 1.4 * Math.cos(j * 1.7 + p.k), hAt(p.x, p.z) + 8 + .8 * Math.sin(j * 2.1), p.z + 1.2 * Math.sin(j * 1.7 + p.k)], 1.6 + .5 * hash(j + p.k * 9), ['#3B7E34', '#4F9A3A', '#2E6A2E'][j % 3], 'far');
    },
  };
}
