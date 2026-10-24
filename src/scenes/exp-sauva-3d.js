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
  let THREE, P = {}, OUT, scene, key, hemi, grassMat, label;
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
  const dark = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(C.line), k).getHexString();
  function drawAnt(a, hex, leaf = false) {
    const { S, th, pe, ga, head, hf, hl, hu } = a, legC = dark(hex, .3);
    ovoid(th.c, th.f, th.u, .13 * S, .075 * S, .07 * S, hex);
    for (const sg of [1, -1]) rod(add(th.c, mul(th.u, .05 * S)), add(add(th.c, mul(th.u, .11 * S)), add(mul(th.f, -.04 * S), mul(th.l, sg * .03 * S))), .012 * S, hex);  // espinhos
    ball(pe.c, .035 * S, hex); ball(mix(pe.c, ga.c, .4), .04 * S, hex);
    ovoid(ga.c, ga.f, ga.u, .16 * S, .12 * S, .125 * S, hex);
    ovoid(head, hf, hu, .1 * S, .085 * S, .11 * S, hex);
    for (const sg of [1, -1]) {
      ball(add(add(head, mul(hf, .04 * S)), add(mul(hl, sg * .09 * S), mul(hu, .025 * S))), .024 * S, C.line);
      ovoid(add(add(head, mul(hf, .1 * S)), add(mul(hl, sg * .035 * S), mul(hu, -.035 * S))), hf, hu, .05 * S, .02 * S, .025 * S, legC);
    }
    for (const l of a.legs) {
      rod(l.root, l.mid, .02 * S, legC); rod(l.mid, l.tar, .015 * S, legC); rod(l.tar, l.end, .011 * S, legC);
      ball(l.mid, .021 * S, legC); ball(l.tar, .016 * S, legC);
    }
    for (const q of a.antennae) { rod(q[0], q[1], .01 * S, legC); rod(q[1], q[2], .009 * S, legC); rod(q[2], q[3], .009 * S, legC); ball(q[3], .016 * S, legC); }
    if (leaf) {  // a folha em pé na mandíbula, inclinada para a frente (leaf1 do 2D)
      const base = add(add(head, mul(hf, .13 * S)), mul(hu, .02 * S)), ax = unit(add(mul(hu, Math.cos(.35)), mul(hf, Math.sin(.35)))), wd = unit(cross(ax, hl));
      if (P.leaf.i < P.leaf.n) put(P.leaf, base, mul(wd, .42 * S), mul(ax, .95 * S), mul(hl, .03 * S), C.leaf);
    }
  }

  window.buildLowpolyScene = art => {
    THREE = art.THREE; scene = art.scene; m4 = M();
    const own = x => art.own(x);
    const grad = own(new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat)); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
    const toon = (o = {}) => own(new THREE.MeshToonMaterial({ gradientMap: grad, ...o }));
    // Contorno: casca invertida (BackSide) empurrada ao longo da normal projetada, em px de tela (igual a qualquer distância),
    // esmaecida pela neblina. Serve a malhas comuns e instanciadas.
    OUT = own(new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { px: { value: 2.4 }, res: { value: new THREE.Vector2(1920, 1080) }, ink: { value: new THREE.Color(dark(C.sauvaDk, .5)) }, fogColor: { value: new THREE.Color(C.skyLow) }, fogNear: { value: 10 }, fogFar: { value: 60 } },
      vertexShader: `uniform float px; uniform vec2 res; varying float vDepth;
void main() {
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
      fragmentShader: `uniform vec3 ink; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; varying float vDepth;
void main() {
  gl_FragColor = vec4(mix(ink, fogColor, smoothstep(fogNear, fogFar, vDepth)), 1.0);
#include <colorspace_fragment>
}`,
    }));
    const pool = (geo, mat, n, outline, shadow = true) => {
      own(geo); const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true;
      m.setColorAt(0, new THREE.Color()); m.count = 0; scene.add(m);
      let o = null; if (outline) { o = new THREE.InstancedMesh(geo, OUT, n); o.instanceMatrix = m.instanceMatrix; o.frustumCulled = false; o.count = 0; scene.add(o); }
      return { m, o, n, i: 0 };
    };
    P.sph = pool(new THREE.IcosahedronGeometry(1, 1), toon(), 1400, true);
    P.cyl = pool(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), toon(), 1200, true);
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(.62, .4, 0, 1); leaf.quadraticCurveTo(-.62, .4, 0, 0);
    const lg = new THREE.ExtrudeGeometry(leaf, { depth: 1, bevelEnabled: false, curveSegments: 6 }); lg.translate(0, 0, -.5);
    P.leaf = pool(lg, toon({ side: THREE.DoubleSide }), 40, true);
    P.wing = pool(new THREE.CircleGeometry(1, 10), own(new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false })), 4, false, false);
    P.far = pool(new THREE.IcosahedronGeometry(1, 1), toon({ flatShading: true }), 60, false, false);  // morros, copas ao longe, nuvens
    // Capim instanciado: lâmina afinando em 3 segmentos, raiz escura e ponta clara; o vento entra no vertex shader.
    const bg = new THREE.BufferGeometry(), bv = [], bc = [], bi = [], root = new THREE.Color(C.grassDk).multiplyScalar(.6), tip = new THREE.Color(C.grass).lerp(new THREE.Color(C.sun), .35);
    for (let j = 0; j <= 3; j++) { const y = j / 3, w = .5 * (1 - y) + .02; bv.push(-w * .06, y, 0, w * .06, y, 0); const c = root.clone().lerp(tip, y); bc.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    for (let j = 0; j < 3; j++) bi.push(2 * j, 2 * j + 1, 2 * j + 2, 2 * j + 1, 2 * j + 3, 2 * j + 2);
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bv, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); bg.setIndex(bi); bg.computeVertexNormals();
    grassMat = toon({ vertexColors: true, side: THREE.DoubleSide });
    grassMat.onBeforeCompile = sh => {
      sh.uniforms.uTime = grassMat.userData.time = { value: 0 };
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 ip = vec3(instanceMatrix[3]);
  float w = .55 * sin(uTime * 1.3 + ip.x * .7 + ip.z * .4) + .3 * sin(uTime * 2.3 + ip.x * 1.9);
  transformed.x += w * position.y * position.y * .35; transformed.z += .3 * w * position.y * position.y * .35;`);
    };
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
      gm.setColorAt(i, new THREE.Color(C.grass).lerp(new THREE.Color(C.olive), .3 * k).lerp(new THREE.Color(C.skyLow), .35 * clamp(-z / 24)));
    });
    gm.receiveShadow = true; scene.add(gm);
    // Terreno (de Z = 0 a -50) e o bloco do corte: face com os furos dos túneis e câmaras (textura com alfa) e a parede do
    // fundo das cavidades, 0,8 atrás.
    const tg = new THREE.PlaneGeometry(X1 - X0, 50, 32, 25); tg.rotateX(-Math.PI / 2); tg.translate((X0 + X1) / 2, 0, -25);
    const tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) tp.setY(i, hT(tp.getX(i), tp.getZ(i))); tg.computeVertexNormals();
    const terrain = new THREE.Mesh(own(tg), toon({ color: C.ground })); terrain.receiveShadow = true; scene.add(terrain);
    const K = 64, YT = .5, cv = document.createElement('canvas'); cv.width = (X1 - X0) * K; cv.height = (YT - YB) * K;
    const g = cv.getContext('2d'), px = (x, y) => [(x - X0) * K, (YT - y) * K];
    const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, '#8C6440'); gr.addColorStop(.3, '#74512F'); gr.addColorStop(1, '#4A3220'); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    for (let b = 0; b < 4; b++) { g.beginPath(); for (let x = 0; x <= cv.width; x += 16) g.lineTo(x, (1.4 + 3.2 * b) * K + 18 * Math.sin(x * .004 + b) + 7 * Math.sin(x * .013)); g.lineTo(cv.width, cv.height); g.lineTo(0, cv.height); g.fillStyle = b === 1 ? 'rgba(200,150,70,.12)' : `rgba(20,8,4,${.1 + .04 * b})`; g.fill(); }
    for (let i = 0; i < 700; i++) { const r = 3 + 6 * hash(i * 3 + 2); g.beginPath(); g.ellipse(cv.width * hash(i * 3), cv.height * hash(i * 3 + 1), 1.3 * r, r, hash(i) * 3, 0, TAU); g.fillStyle = i % 3 ? '#5A3E28' : '#8E8A80'; g.fill(); }
    const tunnelPath = pts => { const p = makePath(pts); g.beginPath(); for (let d = 0; d <= p.length; d += .1) { const q = p.at(d); g.lineTo(...px(q.x, q.y)); } };
    const chamberPts = ([x, y, w, h, sd]) => Array.from({ length: 14 }, (_, i) => { const a = i * TAU / 14, k = .9 + .18 * hash(sd + i * 2.3); return px(X3(x + Math.cos(a) * w / 2 * k), Y3(Math.min(y + 6, y - h / 2 + Math.sin(a) * h / 2 * k))); });
    const holes = (wd, style) => {
      g.lineCap = g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = style;
      for (const pts of TUN) { tunnelPath(pts); g.lineWidth = wd; g.stroke(); }
      for (const c of CH) { g.beginPath(); chamberPts(c).forEach(q => g.lineTo(...q)); g.closePath(); g.lineWidth = wd - TW * K; g.fill(); g.stroke(); }
    };
    holes(TW * K + 12, '#2B1A10');  // borda escura em volta dos furos
    g.globalCompositeOperation = 'destination-out'; holes(TW * K, '#000'); g.globalCompositeOperation = 'source-over';
    const tex = own(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    tex.repeat.set(1 / (X1 - X0), 1 / (YT - YB)); tex.offset.set(-X0 / (X1 - X0), -YB / (YT - YB));
    const shape = new THREE.Shape(); shape.moveTo(X0, YB); for (let x = X0; x <= X1; x += 1) shape.lineTo(x, hT(x, 0)); shape.lineTo(X1, YB); shape.closePath();
    const face = new THREE.Mesh(own(new THREE.ShapeGeometry(shape)), toon({ map: tex, alphaTest: .5 })); face.castShadow = face.receiveShadow = true; scene.add(face);
    const wall = new THREE.Mesh(own(new THREE.PlaneGeometry(X1 - X0, -.3 - YB)), toon({ color: '#3A2618' })); wall.position.set((X0 + X1) / 2, (YB - .3) / 2, -.8);
    wall.receiveShadow = true; scene.add(wall);  // o topo fica abaixo do chão
    // Céu em gradiente (fundo em espaço de tela), neblina, luzes do motor ajustadas (sol quente e céu frio).
    const sk = document.createElement('canvas'); sk.width = 4; sk.height = 256; const sg = sk.getContext('2d'), sgr = sg.createLinearGradient(0, 0, 0, 256);
    sgr.addColorStop(0, '#5FAFDC'); sgr.addColorStop(.6, C.skyTop); sgr.addColorStop(1, C.skyLow); sg.fillStyle = sgr; sg.fillRect(0, 0, 4, 256);
    scene.background = own(new THREE.CanvasTexture(sk)); scene.background.colorSpace = THREE.SRGBColorSpace;
    scene.fog = new THREE.Fog(C.skyLow, 10, 60);
    for (const o of scene.children) { if (o.isDirectionalLight) key = o; if (o.isHemisphereLight) hemi = o; }
    key.color.set('#FFE7C2'); key.intensity = 2.3; hemi.color.set('#D6ECF7'); hemi.groundColor.set('#6E5A3C'); hemi.intensity = 1.25;
    key.shadow.camera.far = 90; scene.add(key.target);
    // Legenda do plano c1s02 (Kit.text no 2D): desenhada no canvas de saída depois do render.
    const engine = animationEngine, render = engine.render.bind(engine);
    engine.render = async (t, o) => { await render(t, o); if (label) caption(engine.canvas.getContext('2d'), ...label); };
  };
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
    art.cameraPose(pos, tgt);
    const half = Math.max(2.5, .75 * d);
    const dir = unit([-3, 7, 5]), lp = add(tgt, mul(dir, 40));
    key.position.set(...lp); key.target.position.set(...tgt);
    Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 5, far: 90 }); key.shadow.camera.updateProjectionMatrix();
    scene.fog.near = d + 6; scene.fog.far = d + 55; OUT.uniforms.fogNear.value = d + 6; OUT.uniforms.fogFar.value = d + 55;
  }
  function begin(t) { for (const p of Object.values(P)) p.i = 0; grassMat.userData.time && (grassMat.userData.time.value = t); label = null; }
  function end() {
    for (const p of Object.values(P)) {
      p.m.count = p.i; p.m.instanceMatrix.needsUpdate = true; if (p.m.instanceColor) p.m.instanceColor.needsUpdate = true;
      if (p.o) p.o.count = p.i;
    }
  }
  // Cenário fixo de fundo: morros, fila de árvores, a árvore grande, nuvens, monte do ninho e o jardim de fungo.
  function backdrop(t) {
    for (let i = 0; i < 6; i++) put(P.far, [-30 + 14 * i + 5 * hash(i), -2, -38 - 6 * hash(i + 3)], [9 + 3 * hash(i + 5), 0, 0], [0, 4 + 2 * hash(i + 7), 0], [0, 0, 6], i % 2 ? '#7FA46A' : '#93B07A');
    for (let i = 0; i < 22; i++) { const x = X0 + 1.5 * i + .8 * hash(i + 40), z = -15 - 2 * hash(i + 41), h = 1.2 + 1.2 * hash(i + 42); put(P.far, [x, hT(x, z) + h, z], [.9 * h * .6, 0, 0], [0, .8 * h * .6, 0], [0, 0, .9 * h * .6], i % 3 ? C.foliage : C.leafDk); rod([x, hT(x, z), z], [x, hT(x, z) + h, z], .07, C.wood); }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) put(P.far, [-12 + 13 * i + .12 * t + 1.2 * j, 7 + i % 2 + .3 * hash(i * 4 + j), -34], [1.3 + .4 * hash(j + i), 0, 0], [0, .7, 0], [0, 0, .9], '#FFFFFF');
    const tx = X3(260), tz = -2.6, ty = hT(tx, tz), sw = .05 * wind(t, 260);
    rod([tx, ty - .1, tz], [tx + sw, ty + 3.2, tz], .17, C.wood);
    for (let i = 0; i < 6; i++) ball([tx + sw + 1.1 * Math.cos(i * 1.1) * (i ? 1 : 0), ty + 3.6 + .5 * Math.sin(i * 1.7), tz + .7 * Math.sin(i * 1.1) * (i ? 1 : 0)], 1.05 + .2 * hash(i + 9), i % 2 ? C.foliage : C.leaf);
    const nx = X3(1500); ovoid([nx, hT(nx, TRAIL) - .05, TRAIL], [1, 0, 0], [0, 1, 0], .7, .28, .6, '#8C6440'); ovoid([nx + .05, hT(nx, TRAIL) + .2, TRAIL], [1, 0, 0], [0, 1, 0], .2, .05, .16, C.line);
    CH.forEach(([x, y, w, h, sd], c) => {
      const n = Math.round(clamp(w * h / 3500, 10, 32)), cx = X3(x), fy = Y3(y);
      for (let i = 0; i < n; i++) {
        const u = 2 * hash(sd + i * 3.1) - 1, v = hash(sd + i * 5.7) * Math.sqrt(1 - u * u), r = (.07 + .05 * hash(sd + i * 1.9)) * Math.min(w, 1.6 * h) / 100 * (1 + .03 * Math.sin(t * 1.3 + i));
        ball([cx + u * (.36 * w / 100 - r), fy + (v * (.75 * h / 100 - r) + .8 * r), -.25 - .35 * hash(sd + i * 7.3)], r, i % 4 ? C.cream : '#E7D2A8');
      }
    });
  }
  // Irmãs: trilha principal (com a folha) e a de trás; nos túneis; no jardim.
  const MAIN = surface(X0, TRAIL), REAR = surface(X0, BACK), HERO = '#FF6A1F';
  function sisters(t, heroX, rear = true) {
    for (const a of crowd({ length: X3(1520) - X0 }, t, 14, 3, { speed: .6, spacing: 1.5, sizeVar: .1 })) {
      if (heroX !== null && Math.abs(X0 + a.s - heroX) < .75) continue;
      const S = .4 * a.size; drawAnt(antPose(MAIN, a.s / S, S, t, { seed: a.seed }), C.sauva, a.carry);
    }
    if (rear) for (const a of crowd({ length: X1 - X0 }, t, 16, 8, { speed: 1.1, spacing: 2, carryEvery: 1, sizeVar: .1 })) { const S = .4 * a.size; drawAnt(antPose(REAR, a.s / S, S, t, { seed: a.seed }), C.sauva, true); }
  }
  function underground(t) {
    TRACKS.forEach((tr, i) => { for (const a of crowd(tr, t, 4, 40 + i, { speed: .26, spacing: tr.length / 4, carryEvery: 2, sizeVar: .1 })) { const S = .26 * a.size; drawAnt(antPose(tr, a.s / S, S, t, { seed: a.seed }), C.sauva, a.carry); } });
    const ring = ringPath(X3(860), Y3(1500), -.45, 1.7, .25);
    for (let j = 0; j < 2; j++) { const S = .36; drawAnt(antPose(ring, (frac(.04 * t + j / 2) * 10.9) / S, S, t, { seed: 60 + j }), C.sauva); }
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
