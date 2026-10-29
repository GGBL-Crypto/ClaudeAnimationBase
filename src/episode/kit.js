// Kit de cenas de episódio: 8 cenários com parâmetros (hora, clima, semente, enquadramento, extras) e o elenco em ações,
// como quadro F da cena K (contrato em src/styles/AGENTS.md). Sem desenho. Cada cena é função da fase do loop
// (phase = (lt mod L) / L) e tudo que se move tem frequência múltipla inteira de 1/L, então F(t) = F(t + L).
// Depende de motion.js e de src/nature/ (noise, path, gait, creature, specs, skeleton).
var { KIT_SCENES, kitFrame, castActor } = (() => {
  const TIMES = ['dawn', 'day', 'dusk', 'night'], WEATHERS = ['clear', 'rain', 'snow', 'fog'], FRAMINGS = ['wide', 'mid'];
  const ACTIONS = ['stand', 'walk', 'sit', 'read', 'point', 'look-up'], GEAR = ['hat', 'backpack', 'hood', 'helmet'], COLORS = ['skin', 'hair', 'shirt', 'pants'];
  const DEFAULTS = { time: 'day', weather: 'clear', seed: 0, framing: 'wide', extras: [] };
  // Altura de pé (px = BL) por corpo: adulto 180 (30 px na grade 6 do pixel); todos entre 156 e 204 (26 a 34 na grade).
  const HEIGHT = { adult: 180, child: 160, elder: 174, heavy: 178, thin: 186 };
  const SEAT = .25, PELVIS = .33;  // sentado: altura do assento e do centro da pelve (BL acima do chão)
  const rnd = (s, i) => hash(s * 13.37 + i * .7071 + .123);
  const cyc = (phase, m, h = 0) => Math.sin(TAU * (m * phase + h));  // m inteiro: período L / m
  const per = (L, sec) => Math.max(1, Math.round(L / sec));          // ciclos inteiros por loop, período perto de sec s
  const has = (p, x) => p.extras.includes(x);
  const hills = (seed, base, amp, scale) => x => base - amp * (.5 + .5 * fbm1(seed, x / scale));
  const dunes = (seed, base, amp, scale) => x => base - amp * (.5 + .5 * Math.sin(x / scale + 6 * rnd(seed, 0))) * (.75 + .25 * noise1(seed, x / (2 * scale)));
  const flat = (seed, base, amp = 8) => x => base + amp * noise1(seed, x / 400);
  const spotsOf = (g, ats) => ats.map(at => ({ at, x: at * 1920, y: g(at * 1920) }));
  const camOf = (p, phase) => ({ cx: 960 + 8 * cyc(phase, 1), cy: p.framing === 'mid' ? 610 : 540, z: p.framing === 'mid' ? 1.35 : 1 });
  const groundLayer = (p, prof, surface) => ({ kind: 'ground', f: 1, prof, surface: p.weather === 'snow' && surface === 'grass' ? 'snow' : surface });
  const trees = (seed, n, x0, x1, prof, h0, h1, kinds) => Array.from({ length: n }, (_, i) => {
    const x = lerp(x0, x1, (i + .2 + .6 * rnd(seed, i)) / n);
    return { x, y: prof(x) + 4, h: lerp(h0, h1, rnd(seed, i + 40)), kind: kinds[Math.floor(rnd(seed, i + 80) * kinds.length)], seed: seed * 17 + i };
  });
  // Prédio: x = meio da base, y = base; janelas {x, y, w, h} (canto de cima à esquerda), lit 0..1 (0 = apagada; tremula).
  // home: casa habitada, com ao menos uma janela acesa (escolhida pela semente) fora do dia.
  function building(p, phase, L, x, y, w, h, roof, i, home = false) {
    const on = p.time === 'night' || p.time === 'dusk', cols = Math.max(1, Math.floor(w / 46)), rows = Math.max(1, Math.floor((h - 30) / 60)), windows = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = i * 50 + r * 7 + c;
      windows.push({ x: x - w / 2 + (c + .5) * w / cols - 9, y: y - h + 24 + r * 60, w: 18, h: 26, lit: on && rnd(p.seed, k + 3000) > .45 ? .75 + .25 * cyc(phase, per(L, 6), rnd(p.seed, k + 3100)) : 0 });
    }
    if (home && p.time !== 'day' && !windows.some(q => q.lit)) { const j = Math.floor(rnd(p.seed, i * 50 + 3200) * windows.length); windows[j].lit = .75 + .25 * cyc(phase, per(L, 6), rnd(p.seed, i * 50 + j + 3100)); }
    return { x, y, w, h, roof, windows };
  }
  const glow = (lights, items, f) => { for (const b of items) for (const w of b.windows) if (w.lit) lights.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 50, k: w.lit, f }); };

  // Céu (sem paralaxe): estrelas cintilam (tw), nuvens balançam no lugar (até 40 px, 1 ciclo por loop); o = {area, stars, clouds, celestial}.
  const SUN = { dawn: { x: 360, y: 600, r: 70, glow: .9 }, day: { x: 1420, y: 170, r: 58, glow: .5 }, dusk: { x: 1560, y: 620, r: 78, glow: 1 } };
  function sky(p, phase, o = {}) {
    const { time, seed, weather } = p, A = o.area || { x: 0, y: 0, w: 1920, h: 560 }, stars = [], clouds = [];
    const n = Math.round((o.stars ?? 70) * (time === 'night' ? 1 : time === 'day' ? 0 : .25));
    for (let i = 0; i < n; i++) stars.push({ x: A.x + rnd(seed, i) * A.w, y: A.y + rnd(seed, i + 500) * A.h, r: .8 + 1.8 * rnd(seed, i + 900) ** 3, tw: .5 + .5 * cyc(phase, 1 + i % 3, rnd(seed, i + 1300)) });
    const nc = o.clouds ?? (weather === 'clear' ? 3 : weather === 'fog' ? 5 : 7) - (time === 'night' ? 1 : 0);
    for (let i = 0; i < nc; i++) { const w = 220 + 220 * rnd(seed, i + 1700); clouds.push({ x: -100 + 2120 * rnd(seed, i + 1600) + 40 * cyc(phase, 1, rnd(seed, i + 1900)), y: 70 + 280 * rnd(seed, i + 1800), w, h: .36 * w, seed: seed * 31 + i }); }
    const celestial = 'celestial' in o ? o.celestial : time === 'night' ? { kind: 'moon', x: 1480, y: 180, r: 44, glow: .6 } : { kind: 'sun', ...SUN[time] };
    return { stars, celestial, clouds };
  }
  // Clima: partículas com tempo módulo L (laps voltas inteiras por loop) e índice fixo, na área A; fog 0..1.
  function weatherOf(kind, phase, L, seed, A = { x: -80, y: -80, w: 2080, h: 1240 }, fog = 0) {
    const drops = [];
    if (kind === 'rain' || kind === 'snow') {
      const rain = kind === 'rain', n = Math.max(12, Math.round((rain ? 170 : 130) * A.w * A.h / 2.6e6)), laps = Math.max(1, Math.round((rain ? 1400 : 80) * L / A.h)), sway = per(L, 4);
      for (let i = 0; i < n; i++) drops.push({ x: A.x + rnd(seed, i + 2100) * A.w + (rain ? 0 : 16 * cyc(phase, sway, rnd(seed, i + 2300))), y: A.y + frac(rnd(seed, i + 2000) + laps * phase) * A.h, k: .4 + .6 * rnd(seed, i + 2200) });
    }
    return { kind, drops, fog: kind === 'fog' ? .6 : fog };
  }
  const outside = (p, phase, L, layers, g, lights, ats, o = {}) => ({ kit: { sky: sky(p, phase, o.sky), layers, interior: null, map: null, weather: weatherOf(p.weather, phase, L, p.seed, undefined, o.fog), lights }, ground: g, cam: camOf(p, phase), spots: spotsOf(g, ats) });

  const KIT_SCENES = {
    campo: { extras: ['fireflies', 'farm'], exterior: true, build(p, phase, L) {
      const s = p.seed, g = flat(s + 1, 885, 10), far = hills(s + 2, 700, 150, 700), near = hills(s + 3, 800, 80, 380), lights = [];
      const layers = [{ kind: 'ridge', f: .2, prof: far }, { kind: 'ridge', f: .45, prof: near }, { kind: 'treeline', f: .45, trees: trees(s + 4, 7, -100, 2020, near, 90, 150, ['broad', 'broad', 'pine']) }];
      if (has(p, 'farm')) { const b = [building(p, phase, L, 1420, near(1420) + 6, 200, 130, 'gable', 0, true), building(p, phase, L, 1580, near(1580) + 6, 80, 170, 'tower', 1)]; layers.push({ kind: 'buildings', f: .45, items: b }); glow(lights, b, .45); }
      if (has(p, 'fireflies')) for (let i = 0; i < 14; i++) lights.push({ x: 100 + 1720 * rnd(s, i + 4000) + 40 * cyc(phase, 1, rnd(s, i + 4100)), y: 640 + 200 * rnd(s, i + 4200) + 18 * cyc(phase, 2, rnd(s, i + 4300)), r: 10, k: Math.max(0, cyc(phase, per(L, 2.5), rnd(s, i + 4400))) ** 2, f: 1 });
      layers.push(groundLayer(p, g, 'grass'));
      return outside(p, phase, L, layers, g, lights, [.25, .5, .75]);
    } },
    'ceu-noturno': { extras: ['moon', 'meteor'], exterior: true, build(p, phase, L) {
      const s = p.seed, g = flat(s + 1, 905, 6), k = seg(phase, .46, .54), x0 = 300 + 700 * rnd(s, 6000), y0 = 80 + 160 * rnd(s, 6001);
      const out = outside(p, phase, L, [{ kind: 'ridge', f: .3, prof: hills(s + 2, 860, 140, 360) }, groundLayer(p, g, 'grass')], g, [], [.3, .5, .7],
        { sky: { stars: 240, area: { x: 0, y: 0, w: 1920, h: 780 }, ...(p.time === 'night' && !has(p, 'moon') && { celestial: null }), ...(p.weather === 'clear' && { clouds: 0 }) } });
      // Meteoro de (x0, y0) a (x1, y1); k = progresso (desenhe só com 0 < k < 1).
      out.kit.sky.meteor = has(p, 'meteor') ? { x0, y0, x1: x0 + 520, y1: y0 + 240, k } : null;
      return out;
    } },
    mar: { extras: ['lighthouse', 'ship'], exterior: true, build(p, phase, L) {
      const s = p.seed, seaY = 770, g = flat(s + 1, 940, 6), lights = [];
      const coast = x => seaY - 90 * clamp((760 - x) / 520) * (.6 + .4 * (.5 + .5 * fbm1(s + 2, x / 200)));
      const waves = Array.from({ length: 26 }, (_, i) => { const r = rnd(s, i + 5000); return { x: 1920 * rnd(s, i + 5100), y: seaY + 12 + 140 * r * r, len: 40 + 120 * r, k: .5 + .5 * cyc(phase, per(L, 3), rnd(s, i + 5200)) }; });
      const layers = [{ kind: 'ridge', f: .15, prof: coast }, { kind: 'sea', f: .5, y: seaY, waves }];
      if (has(p, 'lighthouse')) { layers.push({ kind: 'buildings', f: .5, items: [{ x: 1640, y: seaY + 10, w: 64, h: 250, roof: 'tower', windows: [{ x: 1628, y: seaY - 226, w: 24, h: 24, lit: 1 }] }] }); lights.push({ x: 1640, y: seaY - 214, r: 260, k: .55 + .45 * cyc(phase, per(L, 4)), f: .5 }); }
      if (has(p, 'ship')) layers.push({ kind: 'props', f: .5, items: [{ kind: 'ship', x: 520, y: seaY + 4 + 3 * cyc(phase, per(L, 3)), s: 120, k: .5 + .5 * cyc(phase, per(L, 3), .25), seed: s }] });
      layers.push(groundLayer(p, g, 'sand'));
      return outside(p, phase, L, layers, g, lights, [.25, .5, .75]);
    } },
    floresta: { extras: ['mist', 'campfire'], exterior: true, build(p, phase, L) {
      const s = p.seed, g = flat(s + 1, 900, 8), far = hills(s + 2, 640, 130, 600), mid = hills(s + 3, 800, 60, 380), lights = [];
      const layers = [{ kind: 'ridge', f: .2, prof: far }, { kind: 'treeline', f: .2, trees: trees(s + 4, 22, -60, 1980, far, 110, 180, ['pine']) },
        { kind: 'ridge', f: .5, prof: mid }, { kind: 'treeline', f: .5, trees: trees(s + 5, 11, -100, 2020, mid, 260, 400, ['pine', 'pine', 'broad']) }, groundLayer(p, g, 'grass')];
      if (has(p, 'campfire')) {
        const x = 1250, fl = .5 + .3 * cyc(phase, per(L, .5)) + .2 * cyc(phase, per(L, .31), .3);  // tremor 0..1
        layers.push({ kind: 'props', f: 1, items: [{ kind: 'fire', x, y: g(x), s: 70, k: fl, seed: s }] }); lights.push({ x, y: g(x) - 40, r: 320, k: .7 + .3 * fl, f: 1 });
      }
      return outside(p, phase, L, layers, g, lights, [.2, .45, .8], { fog: has(p, 'mist') ? .45 : 0 });
    } },
    deserto: { extras: ['ruins', 'caravan'], exterior: true, build(p, phase, L) {
      const s = p.seed, g = flat(s + 1, 915, 10), d1 = dunes(s + 2, 730, 100, 520), d2 = dunes(s + 3, 830, 70, 360), layers = [{ kind: 'dunes', f: .3, prof: d1 }];
      // Caravana parada no alto da duna (k = balanço da cabeça); ruínas = colunas quebradas.
      if (has(p, 'caravan')) layers.push({ kind: 'props', f: .3, items: Array.from({ length: 4 }, (_, i) => ({ kind: 'camel', x: 300 + 95 * i, y: d1(300 + 95 * i) + 2, s: 60, k: .5 + .5 * cyc(phase, per(L, 3), .2 * i), seed: s + i })) });
      layers.push({ kind: 'dunes', f: .6, prof: d2 });
      if (has(p, 'ruins')) layers.push({ kind: 'props', f: .6, items: Array.from({ length: 5 }, (_, i) => { const x = 1150 + 120 * i; return { kind: 'column', x, y: d2(x) + 4, s: 120 + 180 * rnd(s, i + 7000), k: 0, seed: s + i }; }) });
      layers.push(groundLayer(p, g, 'sand'));
      return outside(p, phase, L, layers, g, [], [.25, .5, .75]);
    } },
    'cidade-antiga': { extras: ['temple', 'wall'], exterior: true, build(p, phase, L) {
      const s = p.seed, g = flat(s + 1, 905, 4), base = 840, lights = [], roofs = ['flat', 'gable', 'dome', 'tower', 'flat'];
      let items = Array.from({ length: 9 }, (_, i) => building(p, phase, L, 60 + 225 * i, base, 120 + 90 * rnd(s, i + 8000), 150 + 170 * rnd(s, i + 8100), roofs[Math.floor(rnd(s, i + 8200) * roofs.length)], i));
      if (has(p, 'temple')) items = [...items.filter(b => Math.abs(b.x - 960) > 300), { x: 960, y: base, w: 460, h: 230, roof: 'temple', windows: [] }];
      const layers = [{ kind: 'ridge', f: .2, prof: hills(s + 2, 660, 120, 600) }, { kind: 'buildings', f: .5, items }]; glow(lights, items, .5);
      if (has(p, 'wall')) layers.push({ kind: 'buildings', f: .8, items: [{ x: 960, y: 880, w: 2300, h: 80, roof: 'flat', windows: [] }] });
      layers.push(groundLayer(p, g, 'stone'));
      return outside(p, phase, L, layers, g, lights, [.2, .5, .8]);
    } },
    // Interior: parede, janela (o céu e o clima valem só nela), chão e móveis; props {kind, x (meio), y (base), s (altura), w?}.
    'interior-vela': { extras: ['book', 'scroll'], exterior: false, build(p, phase, L) {
      const s = p.seed, floorY = 860, g = () => floorY, win = { x: 1260, y: 200, w: 300, h: 360 }, top = floorY - 85;  // tampo da mesa a .47 BL do adulto (altura de cotovelo de quem senta)
      const fl = .5 + .3 * cyc(phase, per(L, .45)) + .2 * cyc(phase, per(L, .27), .4);  // tremor da vela 0..1
      const props = [{ kind: 'shelf', x: 420, y: 430, s: 24, w: 380 }, { kind: 'table', x: 1050, y: floorY, s: 85, w: 400 }, { kind: 'candle', x: 1150, y: top, s: 46, flame: { h: 22 + 8 * fl, flick: fl } }];
      if (has(p, 'book')) props.push({ kind: 'book', x: 990, y: top, s: 70 });
      if (has(p, 'scroll')) props.push({ kind: 'scroll', x: 900, y: top, s: 90 });
      const lights = [{ x: 1150, y: top - 60, r: 460, k: .7 + .3 * fl, f: 1 }];
      if (p.time !== 'night') lights.push({ x: win.x + win.w / 2, y: win.y + win.h / 2, r: 380, k: p.time === 'day' ? .6 : .35, f: 1 });
      const celestial = p.time === 'night' ? { kind: 'moon', x: win.x + .7 * win.w, y: win.y + .25 * win.h, r: 22, glow: .5 } : null;
      return { kit: { sky: sky(p, phase, { area: win, stars: 18, clouds: 0, celestial }), layers: [], interior: { wall: { y0: 0, y1: floorY }, window: win, floorY, props }, map: null, weather: weatherOf(p.weather, phase, L, s, win), lights },
        ground: g, cam: camOf(p, phase), spots: spotsOf(g, [.42, .8]) };
    } },
    // Mapa: papel, costas (polígonos fechados), cidades (marks) e a rota que vai e volta (k = .5 − .5 cos 2πφ).
    mapa: { extras: ['route'], exterior: false, build(p, phase) {
      const s = p.seed, g = () => 1080;
      const land = (cx, cy, R, j) => Array.from({ length: 48 }, (_, i) => { const a = TAU * i / 48; let r = 1; for (let m = 2; m <= 5; m++) r += .14 / (m - 1) * Math.sin(m * a + TAU * rnd(s, j * 10 + m)); return [cx + R * r * Math.cos(a), cy + .8 * R * r * Math.sin(a)]; });
      const marks = [[560, 430], [1240, 640], [1350, 260]].map(([x, y], i) => [x + 40 * (rnd(s, i + 9000) - .5), y + 40 * (rnd(s, i + 9100) - .5)]);
      const route = has(p, 'route') ? { pts: [marks[0], [900, 500 + 80 * (rnd(s, 9200) - .5)], marks[1], [1330, 450], marks[2]], k: .5 - .5 * Math.cos(TAU * phase) } : null;
      return { kit: { sky: { stars: [], celestial: null, clouds: [] }, layers: [], interior: null, map: { paper: { x: 200, y: 100, w: 1520, h: 880 }, coasts: [land(640, 480, 300, 1), land(1260, 620, 260, 2), land(1340, 270, 120, 3)], route, marks: marks.map(([x, y]) => ({ x, y })) },
        weather: { kind: 'clear', drops: [], fog: 0 }, lights: [] }, ground: g, cam: camOf(p, phase), spots: [] };
    } },
  };

  function checkParams(scene, params = {}) {
    const p = { ...DEFAULTS, ...params }, bad = k => { throw new Error(`Parâmetro inválido em ${scene}: ${k}`); };
    for (const k of Object.keys(params)) if (!(k in DEFAULTS)) bad(k);
    if (!TIMES.includes(p.time)) bad('time');
    if (!WEATHERS.includes(p.weather)) bad('weather');
    if (!Number.isInteger(p.seed) || p.seed < 0 || p.seed > 9999) bad('seed');
    if (!FRAMINGS.includes(p.framing)) bad('framing');
    if (!Array.isArray(p.extras) || p.extras.some((x, i) => !KIT_SCENES[scene].extras.includes(x) || p.extras.indexOf(x) !== i)) bad('extras');
    return p;
  }
  function checkCast(cast) {
    if (!Array.isArray(cast) || cast.length > 6) throw new Error('Elenco: lista de até 6 pessoas');
    for (const m of cast) {
      if (!m || typeof m.id !== 'string' || !m.id || !HEIGHT[m.body] || cast.filter(x => x.id === m.id).length > 1) throw new Error(`Elenco inválido: ${m && m.id} (id único, body ${Object.keys(HEIGHT).join('|')})`);
      if (m.gear && (!Array.isArray(m.gear) || m.gear.some(x => !GEAR.includes(x)))) throw new Error(`Elenco inválido: gear de ${m.id}`);
      if (m.colors && Object.entries(m.colors).some(([k, v]) => !COLORS.includes(k) || !/^#[\da-f]{6}$/i.test(v))) throw new Error(`Elenco inválido: colors de ${m.id}`);
    }
  }

  // Pessoa do elenco numa ação, sem desenho. at 0..1 → x = at · 1920 (o walk ignora at e atravessa a tela: começa fora em
  // φ = 0 e termina fora em φ = 1); t = tempo do loop (lt mod L). Respiração e piscada com período que divide L.
  function castActor(member, action, at, dir, phase, L, ground, t) {
    const spec0 = humanSpec(member.body), size = HEIGHT[member.body], seed = [...member.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
    const X = action === 'walk' ? (dir > 0 ? lerp(-200, 2120, phase) : lerp(2120, -200, phase)) : at * 1920;
    const path = makePath(dir > 0 ? [[-1200, 0], [3200, 0]] : [[3200, 0], [-1200, 0]]), s = (dir > 0 ? X + 1200 : 3200 - X) / size;
    // ponytail: o micro-ajuste da cabeça e o cabelo de creaturePose usam noise1(t) e não fecham em φ = 1 (salto de ~1 px no topo da cabeça
    // na emenda); para zerar, dar a creaturePose um tempo periódico (o.loop) em src/nature/creature.js.
    const Pb = 3 + hash(seed * 3.7 + 1), tp = phase * per(L, Pb) * Pb;  // creaturePose respira com período Pb: tp fecha o ciclo em φ = 1
    const o = { path, s, size, ground, t: tp, seed, moving: action === 'walk' ? 1 : 0, blink: blink(t, seed, L / per(L, 3.6)) };
    const seated = action === 'sit' || action === 'read';
    let spec = spec0, pose;
    if (seated) {
      // Pelve no assento; pés à frente (gesto das pernas, k = 1: continuam apoiados); mãos nos joelhos ou no livro.
      spec = lowered(spec0, spec0.spine[1].h - PELVIS);
      const legs = ['legL', 'legR'].map((limb, i) => stepTo({ size }, spec, limb, X + dir * (.25 + .04 * i) * size, ground, 1, 0)), p1 = creaturePose(spec, { ...o, gesture: legs });
      const J = p1.joints, arms = ['armL', 'armR'].map((limb, i) => {
        const M = action === 'read' ? [X + dir * (.24 + .03 * i) * size, J.chest[1] + .1 * size] : [J['knee' + 'LR'[i]][0], J['knee' + 'LR'[i]][1] - .03 * size];
        return { limb, target: handTo(p1, spec, limb, M), k: 1 };
      });
      pose = creaturePose(spec, { ...o, gesture: [...legs, ...arms] });
      if (action === 'read') turnHead(pose, .35, .25);
    } else if (action === 'point') {
      const p0 = creaturePose(spec, o), limb = dir > 0 ? 'armL' : 'armR', r = p0.limbs[limb].root;  // o braço do lado da câmera
      const M = [r[0] + dir * .36 * size, r[1] - (.14 + .01 * cyc(phase, per(L, 4))) * size];
      pose = creaturePose(spec, { ...o, gesture: [{ limb, target: handTo(p0, spec, limb, M), k: 1, hand: 'point' }] });
    } else {
      pose = creaturePose(spec, o);
      if (action === 'look-up') turnHead(pose, -.6, -.5);
    }
    return { id: member.id, kind: 'human', role: action, layer: 1, depth: 0, pose, track: path.at(s * size), ground, gear: member.gear || [], colors: member.colors || null, seated: seated ? 1 : 0, ...(action === 'read' && { holds: 'book' }) };
  }

  // Quadro F da cena K no tempo de loop t (F.t = F.lt = t mod L; quem monta o vídeo pode trocar F.t pelo tempo do vídeo).
  function kitFrame({ scene, params, actors = [], cast = [] }, t, L = 12) {
    const K = KIT_SCENES[scene];
    if (!K) throw new Error(`Cena desconhecida: ${scene}`);
    if (!(L >= 10 && L <= 20)) throw new Error(`L fora de 10 a 20 s: ${L}`);
    const p = checkParams(scene, params); checkCast(cast);
    if (!Array.isArray(actors) || actors.length > 3) throw new Error(`Até 3 atores por plano: ${scene}`);
    if (scene === 'mapa' && actors.length) throw new Error('A cena mapa não tem atores');
    for (const a of actors) {
      if (!cast.some(m => m.id === a.cast)) throw new Error(`Elenco sem ${a.cast}`);
      if (!ACTIONS.includes(a.action)) throw new Error(`Ação inválida em ${scene}: ${a.action}`);
      if (a.action === 'walk' && !K.exterior) throw new Error(`A ação walk só vale em cena de exterior, não em ${scene}`);
      if (a.at !== undefined && !(a.at >= 0 && a.at <= 1) || a.dir !== undefined && a.dir !== 1 && a.dir !== -1) throw new Error(`Ator inválido em ${scene}: ${a.cast} (at 0..1, dir 1|-1)`);
      if (actors.filter(b => b.cast === a.cast).length > 1) throw new Error(`Ator repetido em ${scene}: ${a.cast}`);
    }
    const lt = (t % L + L) % L, phase = lt / L, { kit, ground, cam } = K.build(p, phase, L);
    const list = actors.map((a, i) => ({ ...castActor(cast.find(m => m.id === a.cast), a.action, a.at ?? .5, a.dir ?? 1, phase, L, ground, lt), depth: i }));
    // Assento sob quem senta: cadeira no interior (dir = para onde a pessoa olha), pedra fora.
    const rocks = [];
    for (const a of list) if (a.seated) {
      const x = a.track.x, y = ground(x), sh = SEAT * a.pose.size, dir = a.pose.facing;
      if (kit.interior) kit.interior.props.push({ kind: 'chair', x: x - dir * .04 * a.pose.size, y, s: sh, dir }); else rocks.push({ kind: 'rock', x, y, s: sh, k: 0, seed: p.seed });
    }
    if (rocks.length) kit.layers.push({ kind: 'props', f: 1, items: rocks });
    kit.layers.sort((a, b) => a.f - b.f);  // estável: dentro do mesmo f, a ordem de montagem
    return { scene: 'K', shot: scene, t: lt, lt, cam, under: null, world: { ground, kit: { mood: scene === 'interior-vela' ? 'interior' : p.time, seed: p.seed, phase, ...kit } }, actors: list, texts: [] };
  }
  return { KIT_SCENES, kitFrame, castActor };
})();
