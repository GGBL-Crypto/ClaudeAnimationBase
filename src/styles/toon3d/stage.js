// stage.js (toon3d, exp/visual-rico): o palco 3D toon de qualquer cena sobre o motor lowpoly-3d. Rampa de luz com cor
// (sombra violeta, luz creme), luz de contorno, brilho de verniz na quitina, contorno em px de tela na cor escura da
// peça, céu em gradiente com sol, neblina, bloom e pools instanciados que a cena reescreve a cada quadro pelo emissor E
// (ver creature.js). Nada aqui conhece uma história: a cena chama toonStage(art, o) no buildLowpolyScene e, por quadro,
// St.begin(t), desenha, St.camera(...) e St.end(). o = {sun: direção da tela [direita, cima], bloom, gobo, sky: [cores]}.
function toonStage(art, o = {}) {
  const THREE = art.THREE, scene = art.scene, own = x => art.own(x), { add, sub, mul, unit, cross, len } = V3;
  const TIME = { value: 0 }, P = {}, colors = new Map(), m4 = new THREE.Matrix4();
  const col = hex => { let c = colors.get(hex); if (!c) colors.set(hex, c = new THREE.Color(hex)); return c; };
  const tex = (kind, seed) => toonTexture(THREE, kind, seed);
  const grad = own(new THREE.DataTexture(new Uint8Array([70, 58, 128, 255, 132, 128, 186, 255, 236, 222, 196, 255, 255, 243, 205, 255]), 4, 1, THREE.RGBAFormat));
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  // look: rampa com cor (o three só lê o .r do gradientMap, então troca a função), contorno (rim), verniz (gloss) e a
  // sombra de folhas em movimento (gobo, de ambient.js). wrap(sh) mexe no vertex shader (vento).
  const look = (m, { rim = false, gobo = false, gloss = 0, glow = 0 }, wrap = sh => sh) => {
    m.customProgramCacheKey = () => `t3${+rim}${+gobo}${gloss}${glow}${wrap.name}`;
    m.onBeforeCompile = sh => {
      sh.uniforms.uTime = TIME; wrap(sh);
      sh.fragmentShader = (gobo ? 'uniform float uTime; varying vec2 vGobo;\n' : '') + sh.fragmentShader.replace('#include <gradientmap_pars_fragment>', `uniform sampler2D gradientMap;
vec3 getGradientIrradiance(vec3 normal, vec3 lightDirection) { return texture2D(gradientMap, vec2(dot(normal, lightDirection) * .5 + .5, .5)).rgb; }`)
        .replace('#include <opaque_fragment>', (rim ? `
  outgoingLight += vec3(1., .78, .46) * .5 * smoothstep(.5, .64, 1. - abs(dot(normal, geometryViewDir))) * smoothstep(-.25, .35, dot(normal.xy, vec2(-.6, .8)));` : '') + (gloss ? `
#if NUM_DIR_LIGHTS > 0
  float gS = max(dot(normal, normalize(directionalLights[0].direction + geometryViewDir)), 0.);
  outgoingLight += vec3(1., .96, .86) * (.6 * smoothstep(.968, .982, gS) + .07 * smoothstep(.75, .96, gS)) * ${gloss.toFixed(2)};
#endif` : '') + (glow ? `
  outgoingLight = mix(outgoingLight, diffuseColor.rgb, ${glow.toFixed(2)});` : '') + (gobo ? AMBIENT_GOBO.frag : '') + '\n#include <opaque_fragment>');
      if (gobo) sh.vertexShader = 'varying vec2 vGobo;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + AMBIENT_GOBO.vert);
    };
    return m;
  };
  const toon = (opt = {}, fx = {}, wrap) => look(own(new THREE.MeshToonMaterial({ gradientMap: grad, ...opt })), fx, wrap);
  // Contorno: casca invertida empurrada ao longo da normal projetada, em px de tela, na cor escura da própria peça.
  const OUT = own(new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { px: { value: o.outline ?? 1.6 }, res: { value: new THREE.Vector2(1920, 1080) }, fogColor: { value: new THREE.Color(o.horizon || '#F3E4C0') }, fogNear: { value: 10 }, fogFar: { value: 60 } },
    vertexShader: `uniform float px; uniform vec2 res; varying float vDepth; varying vec3 vInk;
void main() {
  vInk = vec3(.1, .05, .03);
#ifdef USE_INSTANCING_COLOR
  vInk = pow(instanceColor, vec3(1.3)) * .16;
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
  const instanced = (geo, mat, n, outline, shadow = true) => {
    const m = new THREE.InstancedMesh(own(geo), mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true;
    m.setColorAt(0, new THREE.Color()); scene.add(m);
    let ol = null; if (outline) { ol = new THREE.InstancedMesh(geo, OUT, n); ol.instanceMatrix = m.instanceMatrix; ol.instanceColor = m.instanceColor; ol.frustumCulled = false; scene.add(ol); }
    return { m, o: ol };
  };
  const pool = (geo, mat, n, outline, shadow) => { const p = { ...instanced(geo, mat, n, outline, shadow), n, i: 0 }; p.m.count = 0; if (p.o) p.o.count = 0; return p; };
  function put(p, pos, X, Y, Z, hex) {
    if (p.i >= p.n) return;
    m4.set(X[0], Y[0], Z[0], pos[0], X[1], Y[1], Z[1], pos[1], X[2], Y[2], Z[2], pos[2], 0, 0, 0, 1);
    p.m.setMatrixAt(p.i, m4); p.m.setColorAt(p.i, col(hex)); p.i++;
  }
  // Fixos: instâncias que não mudam (folhas no chão, pedras, troncos), escritas uma vez.
  function fixed(geo, mat, items, outline = false) {
    const { m } = instanced(geo, mat, Math.max(1, items.length), outline);
    items.forEach(([pos, X, Y, Z, hex], i) => { m4.set(X[0], Y[0], Z[0], pos[0], X[1], Y[1], Z[1], pos[1], X[2], Y[2], Z[2], pos[2], 0, 0, 0, 1); m.setMatrixAt(i, m4); m.setColorAt(i, col(hex)); });
    return m;
  }
  // Quadro de folha: x de −.5 a .5, y de 0 a 1 (base no pé), curvo na nervura e caído na ponta.
  const quadGeo = (bend = .18, droop = .1) => {
    const g = new THREE.PlaneGeometry(1, 1, 4, 6); g.translate(0, .5, 0); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, bend * 4 * x * x - droop * y * y); }
    g.computeVertexNormals(); return g;
  };
  // Recortes (folha, pétala, samambaia): sem luz de contorno, que em lâminas finas vistas de raspão as deixava brancas.
  const cut = (kind, seed = 0, glow = 0) => toon({ map: tex(kind, seed), alphaTest: .5, side: THREE.DoubleSide }, { gobo: o.gobo, glow });
  const sphere = new THREE.SphereGeometry(1, 16, 10), chitin = toon({ map: tex('chitin') }, { rim: true, gloss: 1 });
  Object.assign(P, {
    sph: pool(new THREE.IcosahedronGeometry(1, 1), toon({}, { rim: true }), 1600, true),
    cyl: pool(new THREE.CylinderGeometry(1, 1, 1, 7, 1, true), toon({}, { rim: true }), 1600, true),
    far: pool(new THREE.IcosahedronGeometry(1, 1), toon({ flatShading: true }), 90, false, false),
    shell: pool(sphere, chitin, 4600, true),
    lid: pool(new THREE.SphereGeometry(1, 12, 5, 0, TAU, 0, Math.PI / 2), chitin, 500, true),
    limb: pool(new THREE.CylinderGeometry(1, 1, 1, 8, 1), toon({}, { rim: true, gloss: .7 }), 4200, true),
    eye: pool(sphere, toon({}, { gloss: 1.2, glow: .5 }), 1600, true),
    facet: pool(sphere, toon({ map: tex('facets') }, { gloss: 1.1 }), 40, true),
    glint: pool(new THREE.SphereGeometry(1, 8, 6), own(new THREE.MeshBasicMaterial({ fog: false })), 800, false, false),
    wing: pool(quadGeo(.04, 0), own(new THREE.MeshBasicMaterial({ map: tex('wing'), transparent: true, side: THREE.DoubleSide, depthWrite: false })), 80, false, false),
    leaf: pool(quadGeo(), cut('leaf', 0), 1200, false), leaf2: pool(quadGeo(), cut('leaf', 3), 600, false),
    petal: pool(quadGeo(.12, -.15), cut('petal', 0, .3), 1600, false), fern: pool(quadGeo(.06, .25), cut('fern'), 500, false),
  });
  // Céu em gradiente, neblina na cor do horizonte, sol quente e céu azulado.
  const sky = o.sky || ['#3D8BD4', '#8CC4EA', '#E2E6CC', '#F3E4C0'], sk = document.createElement('canvas'); sk.width = 4; sk.height = 256;
  const sg = sk.getContext('2d'), sgr = sg.createLinearGradient(0, 0, 0, 256); sky.forEach((c, i) => sgr.addColorStop([0, .55, .84, 1][i], c));
  sg.fillStyle = sgr; sg.fillRect(0, 0, 4, 256); scene.background = own(new THREE.CanvasTexture(sk)); scene.background.colorSpace = THREE.SRGBColorSpace;
  scene.fog = new THREE.Fog(sky[3], 10, 60);
  let key, hemi; for (const c of scene.children) { if (c.isDirectionalLight) key = c; if (c.isHemisphereLight) hemi = c; }
  key.color.set('#FFD49A'); key.intensity = o.key ?? 2.4; hemi.color.set('#96BEF2'); hemi.groundColor.set(o.groundLight || '#8A5634'); hemi.intensity = o.ambient ?? 1.4;
  key.shadow.camera.far = 90; scene.add(key.target);
  const E = { eye: [0, 0, 0], focal: 1080 / (2 * Math.tan(20 * Math.PI / 180)) };
  Object.assign(E, {
    quad: (pool, pos, X, Y, Z, hex) => put(P[pool], pos, X, Y, Z, hex),
    ball: (pos, r, hex, pool = 'sph') => put(P[pool], pos, [r, 0, 0], [0, r, 0], [0, 0, r], hex),
    // Elipsoide de semieixos a (frente f), b (cima u), c (lado); base destra (com determinante negativo o three não
    // inverte as faces de uma instância, e a casca do contorno cobriria a peça).
    ovoid: (pos, f, u, a, b, c, hex, pool = 'sph') => put(P[pool], pos, mul(f, a), mul(u, b), mul(unit(cross(f, u)), c), hex),
    rod(p0, p1, r, hex, pool = 'cyl') {
      const ax = sub(p1, p0), L = len(ax); if (L < 1e-6) return;
      const y = mul(ax, 1 / L), x = unit(Math.abs(y[1]) < .9 ? cross(y, [0, 1, 0]) : cross(y, [1, 0, 0])), z = cross(x, y);
      put(P[pool], mul(add(p0, p1), .5), mul(x, r), ax, mul(z, r), hex);
    },
    px: (pos, size) => size * E.focal / Math.max(1e-3, len(sub(pos, E.eye))),  // tamanho na tela em px
  });
  const St = { THREE, scene, P, E, TIME, look, toon, cut, quadGeo, fixed, tex, OUT, key, hemi, own, sky: {} };
  // Sol preso a um canto do quadro, longe como um céu, com raios; o bloom (pós) faz o sol e o pólen brilharem.
  if (o.sun) {
    const basic = x => own(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, ...x }));
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + .2 * hash(i), w = .05 + .06 * hash(i + 7); g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 128, a - w, a + w); g.fillStyle = `rgba(255,255,255,${.35 + .65 * hash(i + 3)})`; g.fill(); }
    const f = g.createRadialGradient(128, 128, 0, 128, 128, 128); f.addColorStop(0, '#fff'); f.addColorStop(.25, 'rgba(255,255,255,.6)'); f.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = f; g.fillRect(0, 0, 256, 256);
    const rt = own(new THREE.CanvasTexture(c)); rt.colorSpace = THREE.SRGBColorSpace;
    St.sky.sun = new THREE.Mesh(own(new THREE.CircleGeometry(1.7, 32)), basic({ color: new THREE.Color('#FFF2CC').multiplyScalar(4), transparent: false }));
    St.sky.rays = new THREE.Mesh(own(new THREE.PlaneGeometry(26, 26)), basic({ blending: THREE.AdditiveBlending, opacity: .1, color: '#FFD9A0', map: rt }));
    St.sky.sun.renderOrder = -1; scene.add(St.sky.sun, St.sky.rays);
  }
  if (o.bloom) {
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
  // Chão: relevo h(x, z) e color(x, z) = [cor, terra 0..1]: com terra 1 a textura (terra) tingida de leve pela cor; com 0
  // a cor lisa, só modulada pelo claro e escuro da textura (capim, musgo). Sombra de folhas (gobo).
  const soil = function soil(sh) {
    sh.vertexShader = 'attribute float soil; varying float vSoil;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSoil = soil;');
    sh.fragmentShader = 'varying float vSoil;\n' + sh.fragmentShader.replace('#include <color_fragment>', `vec3 tx = diffuseColor.rgb; float lum = dot(tx, vec3(.3, .59, .11));
  vec3 vc = vColor.rgb; diffuseColor.rgb = mix(vc * (.72 + 1.1 * lum), tx * mix(vec3(1.), vc, .35), vSoil);`);
  };
  // seg = vértices por unidade, [em x, em z] (o motor limita os triângulos da cena: chão fino só onde a câmera chega).
  St.ground = ({ x0, x1, z0, z1, h, color, map = 'soil', rep = 6, seg = 1, dy = 0 }) => {
    const [sx, sz] = [].concat(seg, seg), g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.ceil((x1 - x0) * sx), Math.ceil((z1 - z0) * sz)); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = g.attributes.position, cs = [], ks = [], uv = g.attributes.uv, c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), [hex, k] = color(x, z); p.setY(i, h(x, z) + dy); c.set(hex); cs.push(c.r, c.g, c.b); ks.push(k); uv.setXY(i, x / rep, -z / rep); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3)); g.setAttribute('soil', new THREE.Float32BufferAttribute(ks, 1)); g.computeVertexNormals();
    const mesh = new THREE.Mesh(own(g), toon({ map: tex(map), vertexColors: true }, { gobo: o.gobo }, soil)); mesh.receiveShadow = true; scene.add(mesh); return mesh;
  };
  // Por quadro. camera: alvo, distância, elevação e giro; ajusta a caixa da sombra, a neblina e o sol.
  St.begin = t => { for (const p of Object.values(P)) p.i = 0; TIME.value = t; };
  St.end = () => {
    for (const p of Object.values(P)) {
      p.m.count = p.i; p.m.instanceMatrix.needsUpdate = true; if (p.m.instanceColor) p.m.instanceColor.needsUpdate = true;
      if (p.o) p.o.count = p.i;
    }
  };
  St.camera = (tgt, d, elev, yaw = 0) => {
    const pos = add(tgt, [d * Math.cos(elev) * Math.sin(yaw), d * Math.sin(elev), d * Math.cos(elev) * Math.cos(yaw)]);
    art.cameraPose(pos, tgt); E.eye = pos;
    const half = Math.max(2.5, .75 * d), lp = add(tgt, mul(unit([-3, 7, 5]), 40));
    key.position.set(...lp); key.target.position.set(...tgt);
    Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 5, far: 90 }); key.shadow.camera.updateProjectionMatrix();
    scene.fog.near = OUT.uniforms.fogNear.value = d + 6; scene.fog.far = OUT.uniforms.fogFar.value = d + 55;
    if (St.sky.sun) {
      const fw = unit(sub(tgt, pos)), rt = unit(cross(fw, [0, 1, 0])), up = cross(rt, fw), [sx, sy] = o.sun, dir = unit(add(fw, add(mul(rt, sx), mul(up, sy))));
      St.sky.sun.visible = St.sky.rays.visible = o.sunVisible ? o.sunVisible(tgt) : true;
      St.sky.sun.position.set(...add(pos, mul(dir, 60))); St.sky.sun.lookAt(...pos);
      St.sky.rays.position.set(...add(pos, mul(dir, 14))); St.sky.rays.lookAt(...pos);
      St.sunDir = dir;
    }
  };
  return St;
}
