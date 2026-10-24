// exp-sauva-3d.js: variante E do experimento visual (branch exp/visual-rico): os 0–20 s do c01 de sauva-operaria em 3D
// toon, pelo motor lowpoly-3d. Mundo: 1 unidade = 100 px do plano aberto do 2D; X para a direita (x 960 do 2D é 0), Y para
// cima (o chão da trilha, y 820, é 0) e Z para a câmera; o corte do solo é a face Z = 0 de um bloco. Cada quadro é função
// pura de t: drawWorld reescreve todas as instâncias, a câmera, a luz e o vento a partir de t.
(() => {
  const C = AnimationPlatform.styles.cartoon.config.palette;  // as cores do episódio
  const at = id => PROJECT.storyboard.find(s => s.id === id).start;
  // Falas pelo storyboard do episódio inteiro (o deste projeto corta em 20 s e perde a 3ª fala do c1s02).
  const rd = (id, j) => AnimationPlatform.projects['sauva-operaria'].storyboard.find(s => s.id === id).reads[j].start;
  const X3 = x => (x - 960) / 100, Y3 = y => -(y - 820) / 100;
  // Variante pelo projeto: E (1), E2 com cores de natureza (2), E3 com E2 e o mundo vivo (3). Q(cor do E, cor do E2).
  const V = { 'sauva-exp-e2': 2, 'sauva-exp-e3': 3 }[PROJECT.id] || 1, Q = (e, n) => V > 1 ? n : e;
  // Paleta do E2/E3 (Vida de Inseto): sombra puxa para azul-violeta, luz para o amarelo; nada de cinza nem preto chapado.
  const N = { hero: '#D8652B', sauva: '#A9472C', legInk: '#3A160C', eye: '#24100A', leaf: '#62AC3C', horizon: '#F3E4C0',
    grass: ['#6FA83E', '#86B443', '#5C9A3A', '#A3BC4E', '#78A844'], earth: '#9A5A38', root: '#B98457', grain: '#D2A26E' };
  const SUN = [-.42, .12, -.9].map(v => v / Math.hypot(-.42, .12, -.9));  // E3: sol baixo, atrás e à esquerda

  // ---------- vetores (arrays [x, y, z]) ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), unit = a => mul(a, 1 / (len(a) || 1)), mix = (a, b, k) => add(a, mul(sub(b, a), k));
  const rot = (v, axis, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c))); };

  // ---------- terreno e trilhos ----------
  const hT = (x, z) => .1 * Math.sin(x * .45 + 1) + .04 * Math.sin(x * 1.3) + .05 * Math.sin(z * .8 + x * .2) + (z < -14 ? .25 * (-14 - z) : 0);
  const TRAIL = -1, BACK = -3.5, X0 = -14, X1 = 18, YB = -14;  // trilha dela, trilha de trás, bloco de X0 a X1 até YB
  // Trilho: frame(d) = {p: chão, f: frente, u: cima}; a esquerda do ser é u × f.
  const surface = (xs, z) => d => {
    const x = xs + d, p = [x, hT(x, z), z], q = [x + .05, hT(x + .05, z), z];
    return { p, f: unit(sub(q, p)), u: [0, 1, 0] };
  };
  const ringPath = (cx, y, cz, rx, rz) => {  // laço no chão de uma câmara (loopPath do 2D, de verdade em XZ)
    const path = makePath(Array.from({ length: 33 }, (_, k) => { const a = Math.PI / 2 - k * TAU / 32; return [cx + rx * Math.cos(a), cz + rz * Math.sin(a)]; }));
    return d => { const q = path.at(((d % path.length) + path.length) % path.length); return { p: [q.x, y, q.y], f: [Math.cos(q.angle), 0, Math.sin(q.angle)], u: [0, 1, 0] }; };
  };
  // Túnel do corte (pontos do 2D em px), no plano Z = ZT; o chão é a parede do lado de n (constante por túnel).
  const ZT = -.25, TW = .34;
  const TUN = [
    [[1500, 840], [1470, 1000], [1300, 1180], [1080, 1300], [930, 1385]],
    [[1470, 1000], [1640, 1200], [1720, 1420], [1700, 1620]],
    [[650, 1440], [470, 1560], [390, 1760]],
  ].map(pts => pts.map(([x, y]) => [X3(x), Y3(y)]));
  const tunnel = pts => {
    const path = makePath(pts), sg = Math.sign(pts.slice(1).reduce((s, q, i) => s + Math.cos(Math.atan2(q[1] - pts[i][1], q[0] - pts[i][0])), 0)) || 1;
    const fr = d => { const q = path.at(d), n = mul([-Math.sin(q.angle), Math.cos(q.angle), 0], sg); return { p: add([q.x, q.y, ZT], mul(n, -.4 * TW)), f: [Math.cos(q.angle), Math.sin(q.angle), 0], u: n }; };
    fr.length = path.length; return fr;
  };
  const TRACKS = TUN.map(tunnel);
  const CH = [[860, 1500, 460, 240, 1], [1700, 1700, 330, 180, 2], [390, 1860, 320, 170, 3]];

  // ---------- saúva de primitivas ----------
  // Marcha: footAt (src/nature/gait.js) com a âncora em [distância no trilho, deslocamento lateral]; no apoio o pé fica
  // na âncora, um ponto fixo do mundo, então não desliza. Pernas mais longas que as do 2D (vista lateral): em 3D elas
  // abrem para os lados. Joelho por ik2 no plano vertical que passa pela raiz e pelo pé.
  const SPEC = SPECS.ant, GAIT = GAITS.tripod, L1 = .22, L2 = .3, HB = .12;
  function antPose(track, s, S, t, o = {}) {
    const { moving = 1, seed = 0, up = 0, look = 0, sweep = 0 } = o, vary = ORGANIC.vary, sd = seed + 501;
    const gp = gaitPhase(s, SPEC.stride, vary, sd), beat = (1 + Math.cos(2 * TAU * gp)) / 2;
    const frame = d => { const F = track(d); return { ...F, l: cross(F.u, F.f) }; };
    const seg = (off, h) => { const F = frame((s - off) * S); return { ...F, c: add(F.p, mul(F.u, (h - .012 * moving * beat) * S)) }; };
    const th = seg(0, HB), pe = seg(.17, HB + .01), ga = seg(.32, HB + .03), hd = seg(-.16, HB + .02);
    const legs = SPEC.limbs.map(lb => {
      const g = SPEC.spine[lb.attach], lat = lb.side * (g.r * .5 + lb.rest[1]);
      const plant = sA => [(sA - g.offset + lb.along + lb.rest[0]) * S, lat * S];
      const st = footAt(s, GAIT.offsets[lb.name], { stride: SPEC.stride, duty: GAIT.duty, lift: SPEC.lift * S, moving, plant, vary, seed: sd });
      const F = frame(st.pos[0]), foot = add(add(F.p, mul(F.l, st.pos[1])), mul(F.u, st.lift));
      const root = add(add(th.c, mul(th.f, lb.along * S)), mul(th.l, lb.side * g.r * .5 * S));
      const D = sub(foot, root), dv = dot(D, th.u), Dh = sub(D, mul(th.u, dv)), dh = len(Dh), e1 = dh > 1e-9 ? mul(Dh, 1 / dh) : mul(th.l, lb.side);
      const k = ik2([0, 0], [dh, dv], L1 * S, L2 * S, 1), to3 = q => add(add(root, mul(e1, q[0])), mul(th.u, q[1]));
      const mid = to3(k.mid), end = to3(k.end), tar = add(mix(mid, end, .72), mul(th.u, .03 * S));
      return { name: lb.name, root, mid, tar, end, foot, stance: st.stance };
    });
    // Cabeça: ergue (up) e vira (look) em torno do pescoço; antenas varrem (sweep) e balançam por ruído.
    const hf = rot(rot(hd.f, hd.l, -up), hd.u, look), hl = rot(hd.l, hd.u, look), hu = cross(hf, hl);
    const neck = add(th.c, mul(th.f, .08 * S)), head = add(neck, rot(rot(sub(hd.c, neck), hd.l, -up), hd.u, look));
    const antennae = [1, -1].map(sg => {
      const base = add(add(head, mul(hf, .05 * S)), add(mul(hu, .06 * S), mul(hl, sg * .04 * S)));
      const a = .25 * noise1(seed * 7 + sg, t * 1.7) + sweep * Math.sin(t * 3.1 + sg), b = .2 * noise1(seed * 7 + sg + 3, t * 2.3);
      const sc = unit(add(add(mul(hf, .35), mul(hu, .8)), mul(hl, sg * .45))), e = add(base, mul(rot(sc, hu, a), .16 * S));
      const fn = unit(add(add(mul(hf, .9), mul(hu, -.15 + b)), mul(hl, sg * .25))), m = add(e, mul(rot(fn, hu, a), .11 * S));
      return [base, e, m, add(m, mul(rot(unit(add(fn, mul(hu, -.35))), hu, a), .1 * S))];
    });
    return { S, th, pe, ga, head, hf, hl, hu, legs, antennae };
  }

  // ---------- cena ----------
  let THREE, P = {}, OUT, scene, key, hemi, grassMat, label, eye = [0, 0, 0];
  const TIME = { value: 0 }, sky = {}, FLOWERS = [], ROOTS = [];  // E2/E3
  const colors = new Map(), col = hex => { let c = colors.get(hex); if (!c) colors.set(hex, c = new THREE.Color(hex)); return c; };
  const M = () => new THREE.Matrix4();
  let m4;
  function put(pool, pos, X, Y, Z, hex) {
    if (pool.i >= pool.n) return;
    m4.set(X[0], Y[0], Z[0], pos[0], X[1], Y[1], Z[1], pos[1], X[2], Y[2], Z[2], pos[2], 0, 0, 0, 1);
    pool.m.setMatrixAt(pool.i, m4); pool.m.setColorAt(pool.i, col(hex)); pool.i++;
  }
  const ball = (pos, r, hex, pool = P.sph) => put(pool, pos, [r, 0, 0], [0, r, 0], [0, 0, r], hex);
  // Elipsoide de semieixos a (frente f), b (cima u), c (lado); base sempre destra: com determinante negativo o three não
  // inverte as faces de uma instância, e a casca do contorno cobriria a peça.
  const ovoid = (pos, f, u, a, b, c, hex) => put(P.sph, pos, mul(f, a), mul(u, b), mul(unit(cross(f, u)), c), hex);
  function rod(p0, p1, r, hex, pool = P.cyl) {
    const ax = sub(p1, p0), L = len(ax); if (L < 1e-6) return;
    const y = mul(ax, 1 / L), x = unit(Math.abs(y[1]) < .9 ? cross(y, [0, 1, 0]) : cross(y, [1, 0, 0])), z = cross(x, y);
    put(pool, mul(add(p0, p1), .5), mul(x, r), ax, mul(z, r), hex);
  }
  const dark = (hex, k, to = C.line) => '#' + new THREE.Color(hex).lerp(new THREE.Color(to), k).getHexString();
  function drawAnt(a, hex, leaf = false) {
    const { S, th, pe, ga, head, hf, hl, hu } = a, legC = V > 1 ? dark(hex, .45, N.legInk) : dark(hex, .3);
    ovoid(th.c, th.f, th.u, .13 * S, .075 * S, .07 * S, hex);
    for (const sg of [1, -1]) rod(add(th.c, mul(th.u, .05 * S)), add(add(th.c, mul(th.u, .11 * S)), add(mul(th.f, -.04 * S), mul(th.l, sg * .03 * S))), .012 * S, hex);  // espinhos
    ball(pe.c, .035 * S, hex); ball(mix(pe.c, ga.c, .4), .04 * S, hex);
    ovoid(ga.c, ga.f, ga.u, .16 * S, .12 * S, .125 * S, hex);
    ovoid(head, hf, hu, .1 * S, .085 * S, .11 * S, hex);
    for (const sg of [1, -1]) {
      ball(add(add(head, mul(hf, .04 * S)), add(mul(hl, sg * .09 * S), mul(hu, .025 * S))), .024 * S, Q(C.line, N.eye));
      ovoid(add(add(head, mul(hf, .1 * S)), add(mul(hl, sg * .035 * S), mul(hu, -.035 * S))), hf, hu, .05 * S, .02 * S, .025 * S, legC);
    }
    for (const l of a.legs) {
      rod(l.root, l.mid, .02 * S, legC); rod(l.mid, l.tar, .015 * S, legC); rod(l.tar, l.end, .011 * S, legC);
      ball(l.mid, .021 * S, legC); ball(l.tar, .016 * S, legC);
    }
    for (const q of a.antennae) { rod(q[0], q[1], .01 * S, legC); rod(q[1], q[2], .009 * S, legC); rod(q[2], q[3], .009 * S, legC); ball(q[3], .016 * S, legC); }
    if (leaf) {  // a folha em pé na mandíbula, inclinada para a frente (leaf1 do 2D)
      const base = add(add(head, mul(hf, .13 * S)), mul(hu, .02 * S)), ax = unit(add(mul(hu, Math.cos(.35)), mul(hf, Math.sin(.35)))), wd = unit(cross(ax, hl));
      if (P.leaf.i < P.leaf.n) put(P.leaf, base, mul(wd, .42 * S), mul(ax, .95 * S), mul(hl, .03 * S), Q(C.leaf, N.leaf));
    }
  }

  window.buildLowpolyScene = art => {
    THREE = art.THREE; scene = art.scene; m4 = M();
    const own = x => art.own(x);
    // E2/E3: rampa de 4 degraus com cor (sombra violeta, meia-luz azulada, luz creme, brilho amarelo); o three só lê o .r
    // do gradientMap, então look() troca a função. look() também põe a luz de contorno (rim) e, no E3, a sombra de folhas.
    const grad = own(V > 1 ? new THREE.DataTexture(new Uint8Array([70, 58, 128, 255, 132, 128, 186, 255, 236, 222, 196, 255, 255, 243, 205, 255]), 4, 1, THREE.RGBAFormat)
      : new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat)); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
    const look = (m, { rim = false, gobo = false }, wrap = sh => sh) => {
      m.customProgramCacheKey = () => `look${+rim}${+gobo}${wrap.name}`;
      m.onBeforeCompile = sh => {
        sh.uniforms.uTime = TIME; wrap(sh);
        sh.fragmentShader = (gobo ? 'uniform float uTime; varying vec2 vGobo;\n' : '') + sh.fragmentShader.replace('#include <gradientmap_pars_fragment>', `uniform sampler2D gradientMap;
vec3 getGradientIrradiance(vec3 normal, vec3 lightDirection) { return texture2D(gradientMap, vec2(dot(normal, lightDirection) * .5 + .5, .5)).rgb; }`)
          .replace('#include <opaque_fragment>', (rim ? `
  outgoingLight += vec3(1., .78, .46) * .55 * smoothstep(.5, .64, 1. - abs(dot(normal, geometryViewDir))) * smoothstep(-.25, .35, dot(normal.xy, vec2(-.6, .8)));` : '') + (gobo ? `
  vec2 gq = vGobo * 3.4;
  float gf = sin(gq.x * 1.9 + 1.4 * sin(gq.y * 1.3 + uTime * .6)) * sin(gq.y * 2.3 + 1.2 * sin(gq.x * 1.1 - uTime * .45)) + .45 * sin((gq.x - gq.y) * 3.7 + uTime * .9);
  outgoingLight *= mix(vec3(1.), vec3(.62, .66, .88), smoothstep(.3, .42, gf) * smoothstep(-.3, .3, sin(vGobo.x * .9 + 1.)));` : '') + '\n#include <opaque_fragment>');
        if (gobo) sh.vertexShader = 'varying vec2 vGobo;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  vec4 gw = vec4(transformed, 1.);
#ifdef USE_INSTANCING
  gw = instanceMatrix * gw;
#endif
  vGobo = (modelMatrix * gw).xz;`);
      };
    };
    const toon = (o = {}, fx = {}) => { const m = own(new THREE.MeshToonMaterial({ gradientMap: grad, ...o })); if (V > 1) look(m, fx); return m; };
    // Contorno: casca invertida (BackSide) empurrada ao longo da normal projetada, em px de tela (igual a qualquer distância),
    // esmaecida pela neblina. Serve a malhas comuns e instanciadas. E2/E3: mais fino e na cor escura da própria peça (own).
    OUT = own(new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { px: { value: Q(2.4, 1.6) }, own: { value: Q(0, 1) }, res: { value: new THREE.Vector2(1920, 1080) }, ink: { value: new THREE.Color(dark(C.sauvaDk, .5)) }, fogColor: { value: new THREE.Color(Q(C.skyLow, N.horizon)) }, fogNear: { value: 10 }, fogFar: { value: 60 } },
      vertexShader: `uniform float px; uniform vec2 res; uniform float own; uniform vec3 ink; varying float vDepth; varying vec3 vInk;
void main() {
  vInk = ink;
#ifdef USE_INSTANCING_COLOR
  vInk = mix(ink, pow(instanceColor, vec3(1.3)) * .16, own);
#endif
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = m * instanceMatrix;
#endif
  vec4 wp = m * vec4(position, 1.0);
  vec3 wn = normalize(mat3(m) * normal);
  vec4 cp = projectionMatrix * viewMatrix * wp, cq = projectionMatrix * viewMatrix * vec4(wp.xyz + wn * 0.01, 1.0);
  vec2 dir = cq.xy / cq.w - cp.xy / cp.w; float l = length(dir);
  if (l > 1e-7) cp.xy += dir / l * px * 2.0 / res * cp.w;
  vDepth = -(viewMatrix * wp).z; gl_Position = cp;
}`,
      fragmentShader: `uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; varying float vDepth; varying vec3 vInk;
void main() {
  gl_FragColor = vec4(mix(vInk, fogColor, smoothstep(fogNear, fogFar, vDepth)), 1.0);
#include <colorspace_fragment>
}`,
    }));
    const pool = (geo, mat, n, outline, shadow = true) => {
      own(geo); const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true;
      m.setColorAt(0, new THREE.Color()); m.count = 0; scene.add(m);
      let o = null; if (outline) { o = new THREE.InstancedMesh(geo, OUT, n); o.instanceMatrix = m.instanceMatrix; if (V > 1) o.instanceColor = m.instanceColor; o.frustumCulled = false; o.count = 0; scene.add(o); }
      return { m, o, n, i: 0 };
    };
    P.sph = pool(new THREE.IcosahedronGeometry(1, 1), toon({}, { rim: true }), V > 2 ? 2600 : 1400, true);
    P.cyl = pool(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), toon({}, { rim: true }), V > 2 ? 2400 : 1200, true);
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(.62, .4, 0, 1); leaf.quadraticCurveTo(-.62, .4, 0, 0);
    const lg = new THREE.ExtrudeGeometry(leaf, { depth: 1, bevelEnabled: false, curveSegments: 6 }); lg.translate(0, 0, -.5);
    P.leaf = pool(lg, toon({ side: THREE.DoubleSide }, { rim: true }), V > 2 ? 1200 : 40, true);
    P.wing = pool(new THREE.CircleGeometry(1, 10), own(new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false })), 4, false, false);
    P.far = pool(new THREE.IcosahedronGeometry(1, 1), toon({ flatShading: true }), 60, false, false);  // morros, copas ao longe, nuvens
    // Capim instanciado: lâmina afinando em 3 segmentos, raiz escura e ponta clara; o vento entra no vertex shader.
    // E2/E3: a cor do vértice é só luz (raiz escura, ponta acima de 1, mais clara e amarelada) sobre a cor da instância.
    const bg = new THREE.BufferGeometry(), bv = [], bc = [], bi = [];
    const root = V > 1 ? new THREE.Color(.36, .38, .26) : new THREE.Color(C.grassDk).multiplyScalar(.6), tip = V > 1 ? new THREE.Color(1.55, 1.45, .95) : new THREE.Color(C.grass).lerp(new THREE.Color(C.sun), .35);
    for (let j = 0; j <= 3; j++) { const y = j / 3, w = .5 * (1 - y) + .02; bv.push(-w * .06, y, 0, w * .06, y, 0); const c = root.clone().lerp(tip, y); bc.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    for (let j = 0; j < 3; j++) bi.push(2 * j, 2 * j + 1, 2 * j + 2, 2 * j + 1, 2 * j + 3, 2 * j + 2);
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bv, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); bg.setIndex(bi); bg.computeVertexNormals();
    grassMat = own(new THREE.MeshToonMaterial({ gradientMap: grad, vertexColors: true, side: THREE.DoubleSide }));
    const sway = function sway(sh) {
      sh.uniforms.uTime = grassMat.userData.time = { value: 0 };
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 ip = vec3(instanceMatrix[3]);
  float w = .55 * sin(uTime * 1.3 + ip.x * .7 + ip.z * .4) + .3 * sin(uTime * 2.3 + ip.x * 1.9);
  transformed.x += w * position.y * position.y * .35; transformed.z += .3 * w * position.y * position.y * .35;`);
    };
    if (V > 1) look(grassMat, { gobo: V > 2 }, sway); else grassMat.onBeforeCompile = sway;
    const blades = [];
    for (let i = 0; blades.length < 14000 && i < 40000; i++) {
      const x = X0 + (X1 - X0) * hash(i * 1.71 + 3), z = -24 * Math.pow(hash(i * 2.93 + 5), 1.6), dz = Math.min(Math.abs(z - TRAIL), Math.abs(z - BACK));
      if (dz < .24 || Math.hypot(x - X3(1500), z - TRAIL) < .9) continue;
      const h = (.08 + .32 * hash(i * 4.1)) * (dz < 2 ? .2 + .8 * (dz / 2) ** 2 : 1) * (1 + .6 * clamp(-z / 20));  // baixo junto das trilhas
      blades.push([x, z, h, hash(i * 6.7) * TAU, hash(i * 8.3)]);
    }
    const gm = new THREE.InstancedMesh(own(bg), grassMat, blades.length), q = new THREE.Quaternion(), e = new THREE.Euler();
    blades.forEach(([x, z, h, a, k], i) => {
      gm.setMatrixAt(i, M().compose(new THREE.Vector3(x, hT(x, z) - .01, z), q.setFromEuler(e.set(0, a, .15 * (k - .5))), new THREE.Vector3(h * 1.2, h, h)));
      gm.setColorAt(i, V > 1 ? new THREE.Color(N.grass[Math.floor(5 * k)]).lerp(new THREE.Color(N.horizon), .2 * clamp(-z / 24))
        : new THREE.Color(C.grass).lerp(new THREE.Color(C.olive), .3 * k).lerp(new THREE.Color(C.skyLow), .35 * clamp(-z / 24)));
    });
    gm.receiveShadow = true; scene.add(gm);
    // Terreno (de Z = 0 a -50) e o bloco do corte: face com os furos dos túneis e câmaras (textura com alfa) e a parede do
    // fundo das cavidades, 0,8 atrás.
    const tg = new THREE.PlaneGeometry(X1 - X0, 50, 32, 25); tg.rotateX(-Math.PI / 2); tg.translate((X0 + X1) / 2, 0, -25);
    const tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) tp.setY(i, hT(tp.getX(i), tp.getZ(i))); tg.computeVertexNormals();
    let earth = null;
    if (V > 1) {  // terra marrom-avermelhada com manchas (barro, areia, musgo) e as trilhas batidas, mais claras; UV: x e z
      const ec = document.createElement('canvas'); ec.width = 1024; ec.height = 1600;
      const e = ec.getContext('2d'), ez = z => (50 + z) / 50 * 1600;
      e.fillStyle = '#6F9A3E'; e.fillRect(0, 0, 1024, 1600); e.filter = 'blur(6px)';
      for (let i = 0; i < 900; i++) {
        const r = 6 + 26 * hash(i * 2.7 + 1); e.beginPath(); e.ellipse(1024 * hash(i * 3.1), ez(-26 * Math.pow(hash(i * 5.3 + 2), 1.3)), 1.6 * r, r, 0, 0, TAU);
        e.fillStyle = [N.earth, '#5E8A36', '#86522F', '#8FA845', '#7E452B'][i % 5]; e.globalAlpha = .6; e.fill();
      }
      e.globalAlpha = .85; e.fillStyle = N.earth; for (const z of [TRAIL, BACK]) e.fillRect(0, ez(z - .45), 1024, ez(z + .45) - ez(z - .45));
      e.globalAlpha = .7; e.fillStyle = '#B97A4E'; for (const z of [TRAIL, BACK]) e.fillRect(0, ez(z - .22), 1024, ez(z + .22) - ez(z - .22));
      earth = own(new THREE.CanvasTexture(ec)); earth.colorSpace = THREE.SRGBColorSpace; earth.anisotropy = 4;
    }
    const terrain = new THREE.Mesh(own(tg), V > 1 ? toon({ map: earth }, { gobo: V > 2 }) : toon({ color: C.ground })); terrain.receiveShadow = true; scene.add(terrain);
    const K = 64, YT = .5, cv = document.createElement('canvas'); cv.width = (X1 - X0) * K; cv.height = (YT - YB) * K;
    const g = cv.getContext('2d'), px = (x, y) => [(x - X0) * K, (YT - y) * K];
    // E2/E3: subsolo em tons terrosos quentes (ocre, ferrugem, siena), pedras quentes e nenhum preto chapado.
    const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, Q('#8C6440', '#B4703F')); gr.addColorStop(.3, Q('#74512F', '#93532F')); gr.addColorStop(1, Q('#4A3220', '#6A3824')); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    for (let b = 0; b < 4; b++) { g.beginPath(); for (let x = 0; x <= cv.width; x += 16) g.lineTo(x, (1.4 + 3.2 * b) * K + 18 * Math.sin(x * .004 + b) + 7 * Math.sin(x * .013)); g.lineTo(cv.width, cv.height); g.lineTo(0, cv.height); g.fillStyle = b === 1 ? Q('rgba(200,150,70,.12)', 'rgba(235,175,95,.16)') : Q(`rgba(20,8,4,${.1 + .04 * b})`, `rgba(90,30,12,${.12 + .04 * b})`); g.fill(); }
    for (let i = 0; i < 700; i++) { const r = 3 + 6 * hash(i * 3 + 2); g.beginPath(); g.ellipse(cv.width * hash(i * 3), cv.height * hash(i * 3 + 1), 1.3 * r, r, hash(i) * 3, 0, TAU); g.fillStyle = i % 3 ? Q('#5A3E28', '#7B4529') : Q('#8E8A80', '#D2A574'); g.fill(); }
    const tunnelPath = pts => { const p = makePath(pts); g.beginPath(); for (let d = 0; d <= p.length; d += .1) { const q = p.at(d); g.lineTo(...px(q.x, q.y)); } };
    const chamberPts = ([x, y, w, h, sd]) => Array.from({ length: 14 }, (_, i) => { const a = i * TAU / 14, k = .9 + .18 * hash(sd + i * 2.3); return px(X3(x + Math.cos(a) * w / 2 * k), Y3(Math.min(y + 6, y - h / 2 + Math.sin(a) * h / 2 * k))); });
    const holes = (wd, style) => {
      g.lineCap = g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = style;
      for (const pts of TUN) { tunnelPath(pts); g.lineWidth = wd; g.stroke(); }
      for (const c of CH) { g.beginPath(); chamberPts(c).forEach(q => g.lineTo(...q)); g.closePath(); g.lineWidth = wd - TW * K; g.fill(); g.stroke(); }
    };
    holes(TW * K + 12, Q('#2B1A10', '#4A2414'));  // borda escura em volta dos furos
    g.globalCompositeOperation = 'destination-out'; holes(TW * K, '#000'); g.globalCompositeOperation = 'source-over';
    const tex = own(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    tex.repeat.set(1 / (X1 - X0), 1 / (YT - YB)); tex.offset.set(-X0 / (X1 - X0), -YB / (YT - YB));
    const shape = new THREE.Shape(); shape.moveTo(X0, YB); for (let x = X0; x <= X1; x += 1) shape.lineTo(x, hT(x, 0)); shape.lineTo(X1, YB); shape.closePath();
    const face = new THREE.Mesh(own(new THREE.ShapeGeometry(shape)), toon({ map: tex, alphaTest: .5 })); face.castShadow = face.receiveShadow = true; scene.add(face);
    const wall = new THREE.Mesh(own(new THREE.PlaneGeometry(X1 - X0, -.3 - YB)), toon({ color: Q('#3A2618', '#6B3A22') })); wall.position.set((X0 + X1) / 2, (YB - .3) / 2, -.8);
    wall.receiveShadow = true; scene.add(wall);  // o topo fica abaixo do chão
    // Céu em gradiente (fundo em espaço de tela), neblina, luzes do motor ajustadas (sol quente e céu frio).
    const sk = document.createElement('canvas'); sk.width = 4; sk.height = 256; const sg = sk.getContext('2d'), sgr = sg.createLinearGradient(0, 0, 0, 256);
    if (V > 1) { sgr.addColorStop(0, '#3D8BD4'); sgr.addColorStop(.55, '#8CC4EA'); sgr.addColorStop(.84, '#E2E6CC'); sgr.addColorStop(1, N.horizon); }  // clareia e esquenta no horizonte
    else { sgr.addColorStop(0, '#5FAFDC'); sgr.addColorStop(.6, C.skyTop); sgr.addColorStop(1, C.skyLow); }
    sg.fillStyle = sgr; sg.fillRect(0, 0, 4, 256);
    scene.background = own(new THREE.CanvasTexture(sk)); scene.background.colorSpace = THREE.SRGBColorSpace;
    scene.fog = new THREE.Fog(Q(C.skyLow, N.horizon), 10, 60);
    for (const o of scene.children) { if (o.isDirectionalLight) key = o; if (o.isHemisphereLight) hemi = o; }
    key.color.set('#FFE7C2'); key.intensity = 2.3; hemi.color.set('#D6ECF7'); hemi.groundColor.set('#6E5A3C'); hemi.intensity = 1.25;
    if (V > 1) { key.color.set('#FFD49A'); key.intensity = 2.4; hemi.color.set('#96BEF2'); hemi.groundColor.set('#8A5634'); hemi.intensity = 1.4; }  // sol quente, céu azulado, chão terroso
    key.shadow.camera.far = 90; scene.add(key.target);
    if (V > 2) alive(art, own);
    // Legenda do plano c1s02 (Kit.text no 2D): desenhada no canvas de saída depois do render.
    const engine = animationEngine, render = engine.render.bind(engine);
    engine.render = async (t, o) => { await render(t, o); if (label) caption(engine.canvas.getContext('2d'), ...label); };
  };
  // E3, o mundo vivo: sol baixo com raios, pólen que brilha contra o sol, luz quente vazando pela entrada do ninho, dados
  // das flores e das raízes, e o pós-processo (bloom suave, que só o sol e o pólen
  // passam). Tudo em função de t: TIME, a câmera do quadro (eye) e sementes por objeto.
  function alive(art, own) {
    const basic = o => own(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, ...o }));
    const glow = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d')); const t = own(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t; };
    sky.sun = new THREE.Mesh(own(new THREE.CircleGeometry(1.7, 32)), basic({ color: new THREE.Color('#FFF2CC').multiplyScalar(4), transparent: false }));
    sky.rays = new THREE.Mesh(own(new THREE.PlaneGeometry(26, 26)), basic({ blending: THREE.AdditiveBlending, opacity: .1, color: '#FFD9A0', map: glow(256, 256, g => {
      for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + .2 * hash(i), w = .05 + .06 * hash(i + 7); g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 128, a - w, a + w); g.fillStyle = `rgba(255,255,255,${.35 + .65 * hash(i + 3)})`; g.fill(); }
      const f = g.createRadialGradient(128, 128, 0, 128, 128, 128); f.addColorStop(0, '#fff'); f.addColorStop(.25, 'rgba(255,255,255,.6)'); f.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalCompositeOperation = 'destination-in'; g.fillStyle = f; g.fillRect(0, 0, 256, 256);
    }) }));
    sky.sun.renderOrder = -1; scene.add(sky.sun, sky.rays);
    // Luz quente vazando pela entrada (topo do túnel 1, sob o monte), somada à face do corte.
    const leak = new THREE.Mesh(own(new THREE.PlaneGeometry(3.2, 3.6)), basic({ blending: THREE.AdditiveBlending, opacity: .55, color: '#FFB866', map: glow(128, 144, g => {
      const f = g.createRadialGradient(64, 8, 0, 64, 8, 120); f.addColorStop(0, 'rgba(255,255,255,1)'); f.addColorStop(.4, 'rgba(255,255,255,.35)'); f.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = f; g.fillRect(0, 0, 128, 144);
    }) }));
    leak.position.set(X3(1500), Y3(840) - 1.6, .03); scene.add(leak);
    // Pólen e poeira: pontos fixos no mundo que derivam e piscam; brilham mais quando estão contra o sol (espalhamento
    // para a frente), e esses passam do limiar do bloom.
    const n = 2600, pos = new Float32Array(3 * n), sd = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = X0 + (X1 - X0) * hash(i * 1.37 + 5), z = .6 - 7.5 * hash(i * 2.11 + 9); pos.set([x, hT(x, z) + .06 + 2.4 * Math.pow(hash(i * 3.7 + 1), 1.5), z], 3 * i); sd[i] = hash(i * 4.9 + 2); }
    const pg = own(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
    const dust = new THREE.Points(pg, sky.dust = own(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: TIME, uSun: { value: new THREE.Vector3(...SUN) } },
      vertexShader: `uniform float uTime; uniform vec3 uSun; attribute float seed; varying float vB;
void main() {
  float s = seed * 40.;
  vec3 p = position + vec3(.18 * sin(uTime * .31 + s), .12 * sin(uTime * .23 + 1.7 * s), .14 * sin(uTime * .27 + 2.3 * s));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float fw = pow(max(dot(normalize(p - cameraPosition), uSun), 0.), 5.);
  vB = (.18 + 2.6 * fw) * (.55 + .45 * sin(uTime * (2. + 3. * seed) + s));
  gl_PointSize = clamp(.012 * 1080. * 1.37 / -mv.z, 1.5, 6.);
  gl_Position = projectionMatrix * mv;
}`,
      fragmentShader: `varying float vB;
void main() {
  float a = smoothstep(.5, .1, length(gl_PointCoord - .5));
  gl_FragColor = vec4(vec3(1., .86, .58) * vB * a, 1.);
#include <colorspace_fragment>
}`,
    })));
    dust.frustumCulled = false; scene.add(dust);
    // Flores (caule, folha e pétalas de folha) e raízes no corte; desenhadas a cada quadro pelos pools, com contorno.
    for (let i = 0; FLOWERS.length < 120 && i < 4000; i++) {
      const x = X0 + 1 + (X1 - X0 - 2) * hash(i * 3.3 + 11), z = -.5 - 7 * Math.pow(hash(i * 5.1 + 2), 1.4);
      if (Math.min(Math.abs(z - TRAIL), Math.abs(z - BACK)) < .4 || Math.hypot(x - X3(1500), z - TRAIL) < 1.1) continue;
      FLOWERS.push({ x, z, h: .22 + .32 * hash(i * 7.7), r: .07 + .05 * hash(i * 9.1), c: ['#FFFFFF', '#F7D33C', '#E58AC8', '#B48CE0', '#FFFFFF'][Math.floor(5 * hash(i * 2.2))], a: hash(i * 4.4) * TAU, k: i });
    }
    for (let r = 0; r < 13; r++) {
      let x = X0 + 1.5 + (X1 - X0 - 3) * hash(r * 3.7 + 1), y = hT(x, 0) - .05, a = -Math.PI / 2;
      const pts = [[x, y]], L = 1 + 2.6 * hash(r * 6.1 + 4);
      for (let k = 1; k <= 9; k++) { a += .45 * (hash(r * 11 + k) - .5); a = clamp(a, -Math.PI * .85, -Math.PI * .15); x += L / 9 * Math.cos(a); y += L / 9 * Math.sin(a); pts.push([x, y]); }
      ROOTS.push(pts);
      const b = pts[3 + Math.floor(3 * hash(r * 2.3))], ba = a + (hash(r) < .5 ? .9 : -.9);
      ROOTS.push(Array.from({ length: 5 }, (_, k) => [b[0] + k * L / 12 * Math.cos(ba + .2 * k), b[1] + k * L / 12 * Math.sin(ba + .2 * k)]));
    }
    // Pós-processo: os módulos do three/examples/jsm chegam antes do primeiro quadro (o motor espera art.post). Só o bloom
    // suave: o desfoque do fundo (passe por profundidade) estourou o orçamento de 2x o tempo do E e foi cortado.
    const mods = Promise.all(['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'OutputPass'].map(m => import(`three/addons/postprocessing/${m}.js`)));
    let composer;
    art.post = async (renderer, cam) => {
      if (!composer) {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await mods, sz = renderer.getSize(new THREE.Vector2());
        composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(sz.x, sz.y, { type: THREE.HalfFloatType, samples: 4 }));
        composer.addPass(new RenderPass(scene, cam)); composer.addPass(new UnrealBloomPass(sz.clone(), .5, .55, 1.15)); composer.addPass(new OutputPass());
      }
      composer.render();
    };
  }
  // Por quadro (E3): o sol fica preso no canto de cima à esquerda do quadro (o lado da luz de contorno), longe como um céu;
  // some quando a câmera desce para o corte.
  function skyAt(tgt) {
    const fw = unit(sub(tgt, eye)), rt = unit(cross(fw, [0, 1, 0])), up = cross(rt, fw), dir = unit(add(fw, add(mul(rt, -.45), mul(up, .27))));
    sky.sun.visible = sky.rays.visible = tgt[1] > -1;
    sky.sun.position.set(...add(eye, mul(dir, 60))); sky.sun.lookAt(...eye);
    sky.rays.position.set(...add(eye, mul(dir, 14))); sky.rays.lookAt(...eye);
    sky.dust.uniforms.uSun.value.set(...dir);
  }
  function meadow(t) {
    for (const f of FLOWERS) {
      const g = [f.x, hT(f.x, f.z) - .02, f.z], w = wind(t, f.x * 100, 3), top = add(g, [.2 * f.h * w + .015 * Math.sin(t * 2.3 + f.k), f.h, .07 * f.h * Math.sin(t * 1.4 + f.k)]);
      rod(g, top, .012, '#4E8A34');
      const lf = add(g, mul(sub(top, g), .4)), la = f.a + 1.3, ly = unit([Math.cos(la), .9 + .3 * w, Math.sin(la)]), lz = unit(cross([-Math.sin(la), 0, Math.cos(la)], ly));
      put(P.leaf, lf, mul(cross(ly, lz), .09), mul(ly, .2 * f.h + .04), mul(lz, .01), N.leaf);
      ball(top, .3 * f.r, '#F2B33A');
      for (let k = 0; k < 5; k++) {
        const a = f.a + k * TAU / 5, Y = unit([Math.cos(a), .3 + .25 * w, Math.sin(a)]), Z = unit(cross([-Math.sin(a), 0, Math.cos(a)], Y));
        put(P.leaf, top, mul(cross(Y, Z), .6 * f.r), mul(Y, f.r), mul(Z, .015), f.c);
      }
    }
  }
  // Insetos de fundo: uma borboleta (asas de folha) atravessa o campo; uma joaninha anda atrás da trilha.
  function critters(t) {
    const p = [-7 + .95 * t + .4 * Math.sin(t * .7), 1.15 + .35 * Math.sin(t * 1.9) + .12 * Math.sin(t * 4.3), -3.2 + .8 * Math.sin(t * .45)];
    const f = unit([.95 + .28 * Math.cos(t * .7), 0, .36 * Math.cos(t * .45)]), u = [0, 1, 0], l = cross(u, f), flap = .95 * Math.sin(t * TAU * 3.2);
    rod(add(p, mul(f, -.1)), add(p, mul(f, .09)), .022, '#3A2418'); ball(add(p, mul(f, .1)), .03, '#3A2418');
    for (const sg of [1, -1]) {
      const span = add(mul(l, sg * Math.cos(flap)), mul(u, Math.sin(flap)));
      for (const [tilt, L, W, hex] of [[.35, .34, .3, '#F3A632'], [-.3, .25, .24, '#E8742E']]) {
        const Y = unit(add(span, mul(f, tilt))), Z = unit(cross(Y, f));
        put(P.leaf, p, mul(cross(Y, Z), W), mul(Y, L), mul(Z, .01), hex);
      }
    }
    const x = 6.9 + .13 * t, z = -2 + .25 * Math.sin(t * .4), g = [x, hT(x, z), z], lf = unit([.13, 0, .1 * Math.cos(t * .4)]), ll = cross(u, lf), c = add(g, [0, .075, 0]);
    ovoid(c, lf, u, .13, .08, .11, '#D8352A'); ball(add(add(g, [0, .055, 0]), mul(lf, .12)), .055, '#2A1410');
    for (const [th, ph] of [[.6, .9], [.6, -.9], [1.3, 1.2], [1.3, -1.2], [1.9, .8], [1.9, -.8], [1.2, 0]]) ball(add(add(c, mul(lf, .13 * Math.cos(th))), add(mul(u, .08 * Math.sin(th) * Math.cos(ph)), mul(ll, .11 * Math.sin(th) * Math.sin(ph)))), .024, '#2A1410');
    for (let k = 0; k < 3; k++) for (const sg of [1, -1]) { const b = add(add(g, [0, .04, 0]), add(mul(lf, .06 * (k - 1)), mul(ll, sg * .07))); rod(b, add(add(g, mul(ll, sg * .12)), mul(lf, .06 * (k - 1) + .03 * Math.sin(t * 9 + 2 * k + sg))), .008, '#2A1410'); }
  }
  // Subsolo: raízes no corte e grãos caindo do teto das câmaras.
  function burrow(t) {
    ROOTS.forEach((pts, r) => pts.slice(1).forEach((q, k) => rod([...pts[k], .03], [...q, .03], (r % 2 ? .025 : .05) * (1 - .8 * k / pts.length), N.root)));
    CH.forEach(([x, y, w, h], c) => {
      for (let j = 0; j < 4; j++) {
        const s = c * 4 + j, u = frac(.42 * t + hash(s * 3.1)), top = Y3(y) + .88 * h / 100, bot = Y3(y) + .3 * h / 100;  // a câmara sobe do piso (y) até y - h
        ball([X3(x) + .6 * (hash(s * 5.7) - .5) * w / 100, top - (top - bot) * u * u, -.2], .022, N.grain);
      }
    });
  }
  function caption(c, str, k) {
    const s = backOut(k), size = 62; if (s < .02) return;
    c.save(); c.translate(W / 2, 110); c.scale(s, s); c.globalAlpha = clamp(k * 3);
    c.font = `700 ${size}px "Segoe UI", "Trebuchet MS", sans-serif`; const w = c.measureText(str).width + 1.2 * size, h = 1.5 * size;
    c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, .45 * size); c.fillStyle = 'rgba(16,20,30,.62)'; c.fill(); c.strokeStyle = 'rgba(255,240,200,.25)'; c.lineWidth = 2; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.cloud; c.fillText(str, 0, 0); c.restore();
  }

  // ---------- quadro ----------
  // Câmera: alvo, distância, elevação e giro; a distância vem do zoom do 2D (largura visível 19,2 / zoom unidades).
  const DZ = z => 9.6 / z / Math.tan(Math.atan(Math.tan(20 * Math.PI / 180) * 16 / 9));
  function camera(art, tgt, d, elev, yaw = 0) {
    const pos = add(tgt, [d * Math.cos(elev) * Math.sin(yaw), d * Math.sin(elev), d * Math.cos(elev) * Math.cos(yaw)]);
    art.cameraPose(pos, tgt); eye = pos;
    if (V > 2) skyAt(tgt);
    const half = Math.max(2.5, .75 * d);
    const dir = unit([-3, 7, 5]), lp = add(tgt, mul(dir, 40));
    key.position.set(...lp); key.target.position.set(...tgt);
    Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 5, far: 90 }); key.shadow.camera.updateProjectionMatrix();
    scene.fog.near = d + 6; scene.fog.far = d + 55; OUT.uniforms.fogNear.value = d + 6; OUT.uniforms.fogFar.value = d + 55;
  }
  function begin(t) { for (const p of Object.values(P)) p.i = 0; grassMat.userData.time && (grassMat.userData.time.value = t); TIME.value = t; label = null; }
  function end() {
    for (const p of Object.values(P)) {
      p.m.count = p.i; p.m.instanceMatrix.needsUpdate = true; if (p.m.instanceColor) p.m.instanceColor.needsUpdate = true;
      if (p.o) p.o.count = p.i;
    }
  }
  // Cenário fixo de fundo: morros, fila de árvores, a árvore grande, nuvens, monte do ninho e o jardim de fungo.
  function backdrop(t) {
    for (let i = 0; i < 6; i++) put(P.far, [-30 + 14 * i + 5 * hash(i), -2, -38 - 6 * hash(i + 3)], [9 + 3 * hash(i + 5), 0, 0], [0, 4 + 2 * hash(i + 7), 0], [0, 0, 6], i % 2 ? Q('#7FA46A', '#6E9E4A') : Q('#93B07A', '#82AE55'));
    for (let i = 0; i < 22; i++) { const x = X0 + 1.5 * i + .8 * hash(i + 40), z = -15 - 2 * hash(i + 41), h = 1.2 + 1.2 * hash(i + 42); put(P.far, [x, hT(x, z) + h, z], [.9 * h * .6, 0, 0], [0, .8 * h * .6, 0], [0, 0, .9 * h * .6], V > 1 ? ['#4F9A3A', '#3B7E34', '#6FA843'][i % 3] : i % 3 ? C.foliage : C.leafDk); rod([x, hT(x, z), z], [x, hT(x, z) + h, z], .07, C.wood); }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) put(P.far, [-12 + 13 * i + (V > 2 ? .4 : .12) * t + 1.2 * j, 7 + i % 2 + .3 * hash(i * 4 + j), -34], [1.3 + .4 * hash(j + i), 0, 0], [0, .7, 0], [0, 0, .9], '#FFFFFF');
    const tx = X3(260), tz = -2.6, ty = hT(tx, tz), sw = .05 * wind(t, 260);
    rod([tx, ty - .1, tz], [tx + sw, ty + 3.2, tz], .17, C.wood);
    for (let i = 0; i < 6; i++) ball([tx + sw + 1.1 * Math.cos(i * 1.1) * (i ? 1 : 0), ty + 3.6 + .5 * Math.sin(i * 1.7), tz + .7 * Math.sin(i * 1.1) * (i ? 1 : 0)], 1.05 + .2 * hash(i + 9), i % 2 ? Q(C.foliage, '#4C9638') : Q(C.leaf, '#6AAA42'));
    const nx = X3(1500); ovoid([nx, hT(nx, TRAIL) - .05, TRAIL], [1, 0, 0], [0, 1, 0], .7, .28, .6, Q('#8C6440', '#A8643C')); ovoid([nx + .05, hT(nx, TRAIL) + .2, TRAIL], [1, 0, 0], [0, 1, 0], .2, .05, .16, Q(C.line, '#3A1C10'));
    if (V > 2) { meadow(t); critters(t); }
    CH.forEach(([x, y, w, h, sd], c) => {
      const n = Math.round(clamp(w * h / 3500, 10, 32)), cx = X3(x), fy = Y3(y);
      for (let i = 0; i < n; i++) {
        const u = 2 * hash(sd + i * 3.1) - 1, v = hash(sd + i * 5.7) * Math.sqrt(1 - u * u), r = (.07 + .05 * hash(sd + i * 1.9)) * Math.min(w, 1.6 * h) / 100 * (1 + .03 * Math.sin(t * 1.3 + i));
        ball([cx + u * (.36 * w / 100 - r), fy + (v * (.75 * h / 100 - r) + .8 * r), -.25 - .35 * hash(sd + i * 7.3)], r, i % 4 ? C.cream : '#E7D2A8');
      }
    });
  }
  // Irmãs: trilha principal (com a folha) e a de trás; nos túneis; no jardim.
  const MAIN = surface(X0, TRAIL), REAR = surface(X0, BACK), HERO = Q('#FF6A1F', N.hero), SAUVA = Q(C.sauva, N.sauva);
  function sisters(t, heroX, rear = true) {
    for (const a of crowd({ length: X3(1520) - X0 }, t, 14, 3, { speed: .6, spacing: 1.5, sizeVar: .1 })) {
      if (heroX !== null && Math.abs(X0 + a.s - heroX) < .75) continue;
      const S = .4 * a.size; drawAnt(antPose(MAIN, a.s / S, S, t, { seed: a.seed }), SAUVA, a.carry);
    }
    if (rear) for (const a of crowd({ length: X1 - X0 }, t, 16, 8, { speed: 1.1, spacing: 2, carryEvery: 1, sizeVar: .1 })) { const S = .4 * a.size; drawAnt(antPose(REAR, a.s / S, S, t, { seed: a.seed }), SAUVA, true); }
  }
  function underground(t) {
    TRACKS.forEach((tr, i) => { for (const a of crowd(tr, t, 4, 40 + i, { speed: .26, spacing: tr.length / 4, carryEvery: 2, sizeVar: .1 })) { const S = .26 * a.size; drawAnt(antPose(tr, a.s / S, S, t, { seed: a.seed }), SAUVA, a.carry); } });
    const ring = ringPath(X3(860), Y3(1500), -.45, 1.7, .25);
    for (let j = 0; j < 2; j++) { const S = .36; drawAnt(antPose(ring, (frac(.04 * t + j / 2) * 10.9) / S, S, t, { seed: 60 + j }), SAUVA); }
    if (V > 2) burrow(t);
  }
  // Forídea: corpo de três bolas escuras e duas asas batendo devagar (como no close do 2D).
  function fly(pos, t, S = .09) {
    const f = [1, 0, 0], u = [0, 1, 0], l = [0, 0, -1], body = '#4A3328';
    ovoid(pos, f, u, .32 * S, .26 * S, .26 * S, body); ovoid(add(pos, mul(f, -.42 * S)), f, u, .38 * S, .24 * S, .26 * S, '#7A5A3A'); ball(add(pos, mul(f, .34 * S)), .2 * S, body);
    const flap = .6 * Math.sin(t * TAU * 6);
    for (const sg of [1, -1]) { const ax = unit(add(mul(l, sg), mul(u, .5 + flap))), c = add(add(pos, mul(ax, .55 * S)), mul(f, -.25 * S)); put(P.wing, c, mul(f, .45 * S), mul(ax, .55 * S), mul(cross(f, ax), .5 * S), '#FFFFFF'); }
  }
  const heroX = t => X3(640 + 60 * t);
  const FLY_IN = rd('c1s01', 0) + .1, OUT1 = rd('c1s01', 0) + 3.3, CUT1 = OUT1 + .55;

  function c1s01(t) {
    begin(t);
    const art = window.Lowpoly, hs = (heroX(t) - X0) / .4, hero = antPose(MAIN, hs, .4, t, { seed: 7 });
    backdrop(t); sisters(t, heroX(t)); underground(t);
    drawAnt(hero, HERO, true);
    const hh = add(hero.head, [-.06 * .4, .3 * .4, 0]), drift = [.03 * noise1(41, t * 1.1), .02 * noise1(42, t * 1.3), 0];
    if (t < CUT1) {
      if (t > FLY_IN) fly(add(mix(add(hh, [.6, .5, .3]), hh, easeOut(seg(t, FLY_IN, FLY_IN + .8))), drift), t);
      const d = lerp(.62, .58, ease(seg(t, 0, OUT1))) * lerp(1, 4, easeIn(seg(t, OUT1, CUT1)));
      camera(art, add(hero.head, [.02, .09, 0]), d, .1, .45);
    } else {
      const tl = CUT1 + .6; if (t < tl + .7) fly(add(add(hh, drift), mul([-.5, 2.2, 0], easeIn(seg(t, tl, tl + .7)))), t);
      const k = kf(t, [[CUT1, [X3(640 + 60 * CUT1), .25, TRAIL, DZ(3.8), .26]], [5.8, [X3(980), .4, TRAIL, DZ(2.6), .3]], [8.6, [X3(1150), Y3(1330), 0, DZ(.85), .02]], [9.9, [X3(1100), Y3(1330), 0, DZ(.85), .02]], [12.3, [X3(880), Y3(1420), 0, DZ(1.7), .05]], [14.1, [X3(880), Y3(1425), 0, DZ(1.78), .05]]]);
      camera(art, [k[0], k[1], k[2]], k[3], k[4], .12 * (1 - seg(t, 5.8, 8.6)));
    }
    end();
  }
  // c1s02: ela anda, para, ergue a cabeça e varre o ar com as antenas; no fim vira a cabeça para trás (no 2D o corpo
  // inteiro espelha; aqui só a cabeça gira, para os pés de apoio não deslizarem).
  const t2 = at('c1s02'), S2X = 9, HK2 = [[t2 - 2, -3.2], [t2 + 1.6, 0], [t2 + 11.4, 0], [t2 + 15.4, 4]], HO2 = { start: .5, stop: .9, seed: 21 };
  function c1s02(t, lt) {
    begin(t);
    const art = window.Lowpoly, m = travel(t, HK2, HO2), S = .4, hx = S2X + m.s * S;
    const upK = anticipate(t, t2 + 2, .12, .2) * (1 - ease(seg(t, t2 + 11, t2 + 11.6)));
    const look = 2.2 * ease(seg(t, t2 + 5.2, t2 + 5.55)) * (1 - ease(seg(t, t2 + 10.6, t2 + 10.95)));
    const hero = antPose(MAIN, (hx - X0) / S, S, t, { seed: 7, moving: m.moving, up: .35 * upK, look, sweep: .5 * upK });
    backdrop(t); sisters(t, hx); drawAnt(hero, HERO, false);
    const z = 1 + .08 * ease(seg(lt, 2, 12)), cx = S2X + .6 * (hx - S2X);
    camera(art, [cx + .05, hT(cx, TRAIL) + .1, TRAIL], DZ(z) * S / 6.2 * .7, .22, .15);  // ela perto dos 620 px de 1920 do 2D (corpo 3D mais curto que o BL)
    const nk = Math.min(seg(t, rd('c1s02', 1), rd('c1s02', 1) + .4), 1 - seg(t, rd('c1s02', 2) - .3, rd('c1s02', 2)));
    if (nk > 0) label = ['Saúva-limão (Atta sexdens)', nk];
    end();
  }
  shotsById({ c1s01, c1s02 });
  window.expSauva3d = { antPose, MAIN, TRACKS };  // para tests/exp-sauva-3d.test.mjs
})();
