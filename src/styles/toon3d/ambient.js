// ambient.js (toon3d, exp/visual-rico): vida de fundo de qualquer cena ao ar livre. Sombra de folhas em movimento (gobo,
// usada pelo look do palco), poeira e pólen que brilham contra o sol, insetos voando em rotas que são função de t
// (mosquitinhos e borboletas) e nuvens. Tudo pelo tempo do palco (St.TIME) e por sementes; nada guarda estado.
const AMBIENT_GOBO = {
  vert: `  vec4 gw = vec4(transformed, 1.);
#ifdef USE_INSTANCING
  gw = instanceMatrix * gw;
#endif
  vGobo = (modelMatrix * gw).xz;`,
  frag: `
  vec2 gq = vGobo * 3.4;
  float gf = sin(gq.x * 1.9 + 1.4 * sin(gq.y * 1.3 + uTime * .6)) * sin(gq.y * 2.3 + 1.2 * sin(gq.x * 1.1 - uTime * .45)) + .45 * sin((gq.x - gq.y) * 3.7 + uTime * .9);
  outgoingLight *= mix(vec3(1.), vec3(.62, .66, .88), smoothstep(.3, .42, gf) * smoothstep(-.3, .3, sin(vGobo.x * .9 + 1.)));`,
};

// Rota de voo de um inseto i: laço de Lissajous dentro da área, altura h, função pura de t.
function flightPath(t, i, area, h = [.4, 1.6]) {
  const s = k => hash(i * 7.7 + k), cx = lerp(area.x0, area.x1, s(1)), cz = lerp(area.z0, area.z1, s(2)), rx = .6 + 2 * s(3), rz = .4 + 1.2 * s(4), w = .25 + .35 * s(5);
  const at = u => [cx + rx * Math.sin(u * w + 6 * s(6)), lerp(h[0], h[1], s(7)) + .25 * Math.sin(u * 1.7 * w + s(8) * 9) + .06 * Math.sin(u * 7 + i), cz + rz * Math.sin(u * w * 1.3 + 6 * s(9))];
  const p = at(t), q = at(t + .05); return { p, f: V3.unit(V3.sub(q, p)) };
}

// o = {area, ground: h(x, z), dust: n, gnats: n, butterflies: n, clouds: n, cloudZ}. Devolve draw(t, E).
function toonAmbient(St, o) {
  const { THREE } = St, { area, ground: hAt, dust = 2600, gnats = 10, butterflies = 2, clouds = 12, cloudZ = -34 } = o, { add, mul, cross, unit } = V3;
  if (dust) {
    const pos = new Float32Array(3 * dust), sd = new Float32Array(dust);
    for (let i = 0; i < dust; i++) { const x = lerp(area.x0, area.x1, hash(i * 1.37 + 5)), z = lerp(area.z1, area.z0, hash(i * 2.11 + 9)); pos.set([x, hAt(x, z) + .06 + 2.4 * Math.pow(hash(i * 3.7 + 1), 1.5), z], 3 * i); sd[i] = hash(i * 4.9 + 2); }
    const pg = St.own(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
    const uSun = { value: new THREE.Vector3(-.4, .1, -.9) };
    const pts = new THREE.Points(pg, St.own(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: St.TIME, uSun },
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
    pts.frustumCulled = false; pts.onBeforeRender = () => St.sunDir && uSun.value.set(...St.sunDir); St.scene.add(pts);
  }
  const bcol = [['#F3A632', '#E8742E'], ['#8FC8F0', '#5C9AD8'], ['#FFF2A8', '#F2C84A']];
  return function draw(t, E) {
    // Mosquitinhos: corpo escuro e duas asas que batem rápido (fase por inseto).
    for (let i = 0; i < gnats; i++) {
      const { p, f } = flightPath(t, i, area), l = unit(cross([0, 1, 0], f)), b = .5 * Math.sin(TAU * 9 * t + i * 2.1);
      E.ovoid(p, f, [0, 1, 0], .025, .014, .014, '#2A1C14', 'sph');
      for (const sg of [1, -1]) { const Y = unit(add(mul(l, sg * Math.cos(b)), [0, Math.sin(b), 0])), n = unit(cross(Y, f)); E.quad('wing', p, mul(unit(cross(Y, n)), .025), mul(Y, .05), mul(n, .002), '#FFFFFF'); }
    }
    // Borboletas: quatro asas de pétala tingida, batida lenta; o corpo sobe e desce com a batida.
    for (let i = 0; i < butterflies; i++) {
      const { p, f } = flightPath(t * .8, 100 + i, area, [.8, 1.8]), l = unit(cross([0, 1, 0], f)), flap = .95 * Math.sin(TAU * 3.2 * t + i), [c1, c2] = bcol[i % bcol.length];
      E.rod(add(p, mul(f, -.1)), add(p, mul(f, .09)), .018, '#3A2418', 'limb'); E.ball(add(p, mul(f, .1)), .026, '#3A2418', 'limb');
      for (const sg of [1, -1]) {
        const span = add(mul(l, sg * Math.cos(flap)), [0, Math.sin(flap), 0]);
        for (const [tilt, L, Wd, hex] of [[.4, .32, .3, c1], [-.35, .24, .24, c2]]) { const Y = unit(add(span, mul(f, tilt))), Z = unit(cross(Y, f)); E.quad('petal', p, mul(cross(Y, Z), Wd), mul(Y, L), mul(Z, .05), hex); }
      }
    }
    // Nuvens: grupos de bolas brancas que derivam devagar.
    for (let i = 0; i < clouds / 4; i++) for (let j = 0; j < 4; j++)
      E.ovoid([lerp(area.x0, area.x1, (i + .5) * 4 / clouds) + .3 * t + 1.2 * j, 7 + i % 2 + .3 * hash(i * 4 + j), cloudZ], [1, 0, 0], [0, 1, 0], 1.3 + .4 * hash(j + i), .7, .9, '#FFFFFF', 'far');
  };
}
