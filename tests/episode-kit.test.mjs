import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { natureContext } from './nature-helpers.mjs';

const NATURE = ['noise', 'path', 'gait', 'creature', 'specs', 'skeleton', 'env', 'crowd', 'actors'].map(f => `src/nature/${f}.js`);
const { KIT_SCENES, kitFrame, castActor } = natureContext([...NATURE, 'src/episode/kit.js']);
const P = { time: 'night', weather: 'clear', seed: 1, framing: 'wide', extras: [] };
// Funções (ground, prof) viram seus valores em x = 0, 480, ..., 1920; o resto é comparado como dado.
const strip = v => typeof v === 'function' ? [0, 480, 960, 1440, 1920].map(v) : Array.isArray(v) ? v.map(strip) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, strip(x)])) : v;
const close = (a, b, eps) => typeof a === 'number' ? typeof b === 'number' && Math.abs(a - b) <= eps : Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((x, i) => close(x, b[i], eps))
  : a && typeof a === 'object' ? !!b && typeof b === 'object' && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => close(a[k], b[k], eps)) : a === b;

test('every scene and action is periodic in L', () => {
  for (const id of Object.keys(KIT_SCENES)) for (const action of KIT_SCENES[id].exterior ? ['walk', 'stand', 'point'] : ['read', 'sit']) {
    const spec = { scene: id, params: { time: 'night', weather: 'rain', seed: 7, framing: 'wide', extras: [] }, cast: [{ id: 'a', body: 'adult' }], actors: id === 'mapa' ? [] : [{ cast: 'a', action, at: .4, dir: 1 }] };
    for (const t of [0, 3.1, 11.99]) assert.ok(close(strip(kitFrame(spec, t, 12)), strip(kitFrame(spec, t + 12, 12)), 1e-6), `${id}/${action}@${t}`);
  }
});
// O teste acima passa por construção (kitFrame reduz t mod L); a emenda de verdade é build em φ → 1 contra φ = 0
// (1 − 1e-8: a chuva anda 1400 px/s, então 1e-7 de fase já são 1,7e-3 px).
test('every scene closes at the phase seam (all extras, every weather and time)', () => {
  for (const [id, K] of Object.entries(KIT_SCENES)) for (const weather of ['clear', 'rain', 'snow', 'fog']) for (const time of ['dawn', 'day', 'dusk', 'night']) {
    const p = { time, weather, seed: 7, framing: 'wide', extras: K.extras }, [a, b] = [1 - 1e-8, 0].map(ph => K.build(p, ph, 12));
    for (const x of [a, b]) if (x.kit.sky.meteor) { assert.ok([0, 1].includes(x.kit.sky.meteor.k), 'meteoro fora da tela na emenda'); delete x.kit.sky.meteor.k; }
    assert.ok(close(strip(a), strip(b), 1e-3), `${id}/${weather}/${time}`);
  }
});
test('non-walk actors close at the seam within 1.5 px per joint', () => {
  const g = x => 880 + 10 * Math.sin(x / 300);
  for (const body of ['adult', 'child', 'elder', 'heavy', 'thin']) for (const action of ['stand', 'point', 'look-up', 'sit', 'read']) for (const dir of [1, -1]) {
    const m = { id: `p-${body}`, body }, a = castActor(m, action, .4, dir, 1 - 1e-7, 12, g, 12 * (1 - 1e-7)), b = castActor(m, action, .4, dir, 0, 12, g, 0);
    for (const [k, [x, y]] of Object.entries(a.pose.joints)) { const d = Math.hypot(x - b.pose.joints[k][0], y - b.pose.joints[k][1]); assert.ok(d < 1.5, `${body}/${action}/${dir} ${k}: ${d.toFixed(2)} px`); }
  }
});
test('walkers start and end off screen', () => {
  const f = t => kitFrame({ scene: 'campo', params: P, cast: [{ id: 'a', body: 'adult' }], actors: [{ cast: 'a', action: 'walk', dir: 1 }] }, t, 12).actors[0].track.x;
  assert.ok(f(0) < -100 && f(11.999) > 2020);
});
test('invalid params and actions throw readable errors', () => {
  assert.throws(() => kitFrame({ scene: 'mar', params: { ...P, extras: ['temple'] } }, 0), /Parâmetro inválido em mar: extras/);
  assert.throws(() => kitFrame({ scene: 'interior-vela', params: P, cast: [{ id: 'a', body: 'adult' }], actors: [{ cast: 'a', action: 'walk' }] }, 0), /walk/);
  assert.throws(() => kitFrame({ scene: 'nada', params: P }, 0), /Cena desconhecida/);
});
test('frame shape follows the K contract', () => {
  const F = kitFrame({ scene: 'cidade-antiga', params: { ...P, extras: ['temple'] } }, 1, 12);
  assert.equal(F.scene, 'K'); assert.deepEqual([...F.texts], []); /* cópia: o array do vm é de outro realm */assert.ok(F.world.kit.layers.some(l => l.kind === 'buildings')); assert.equal(typeof F.world.ground, 'function');
  assert.ok(F.world.kit.layers.every((l, i, a) => i === 0 || a[i - 1].f <= l.f));
});
test('no Math.random or Date in kit', () => { assert.doesNotMatch(readFileSync('src/episode/kit.js', 'utf8'), /Math\.random|Date\.now|new Date|performance\.now/); });

// Além do brief: regras R1 e R2 do controlador e o elenco.
test('actors stand on the ground at x = at * 1920, adult ~180 px, cast colors kept', () => {
  const colors = { skin: '#c08a60', hair: '#302010', shirt: '#4060a0', pants: '#303030' };
  const F = kitFrame({ scene: 'campo', params: P, cast: [{ id: 'a', body: 'adult', colors, gear: ['hat'] }], actors: [{ cast: 'a', action: 'stand', at: .3, dir: 1 }] }, 2, 12), a = F.actors[0], J = a.pose.joints;
  assert.equal(a.kind, 'human'); assert.deepEqual({ ...a.colors }, colors); assert.deepEqual([...a.gear], ['hat']);
  assert.ok(Math.abs(J.pelvis[0] - 576) < 2, `pelvis x ${J.pelvis[0]}`);
  const h = Math.max(J.toeL[1], J.toeR[1]) - J.headTop[1]; assert.ok(h > 170 && h < 190, `altura ${h}`);
  assert.ok(Math.abs(J.toeL[1] - F.world.ground(J.toeL[0])) < 1.5, 'pé no chão');
  assert.equal(F.cam.cy, 540); assert.equal(F.cam.z, 1); assert.ok(Math.abs(F.cam.cx - 960) <= 12);
});
// Parado, sem sobra da passada em x: tornozelos juntos (de pé natural ~0-5 px; a passada aberta dava até ~70 px) em qualquer at.
test('standing actors keep their feet together at any at', () => {
  for (const action of ['stand', 'point', 'look-up']) for (const body of ['adult', 'elder', 'child']) for (const dir of [1, -1]) for (const at of [.3, .5, .7]) {
    const J = kitFrame({ scene: 'campo', params: P, cast: [{ id: 'viajante', body }], actors: [{ cast: 'viajante', action, at, dir }] }, 2, 12).actors[0].pose.joints;
    assert.ok(Math.abs(J.ankleL[0] - J.ankleR[0]) < 12, `${action}/${body}/${dir}@${at}: ${Math.abs(J.ankleL[0] - J.ankleR[0]).toFixed(1)} px`);
    assert.ok(Math.abs(J.pelvis[0] - at * 1920) < 2, `${action}@${at}: pelve em ${J.pelvis[0]}`);
  }
});
test('sitters get a seat; the map has no actors; L outside 10..20 is refused', () => {
  const F = kitFrame({ scene: 'interior-vela', params: { ...P, extras: ['book'] }, cast: [{ id: 'a', body: 'elder' }], actors: [{ cast: 'a', action: 'read', at: .4, dir: 1 }] }, 0, 12);
  assert.equal(F.actors[0].seated, 1); assert.equal(F.actors[0].holds, 'book'); assert.ok(F.world.kit.interior.props.some(p => p.kind === 'chair'));
  assert.throws(() => kitFrame({ scene: 'mapa', params: P, cast: [{ id: 'a', body: 'adult' }], actors: [{ cast: 'a', action: 'stand' }] }, 0), /mapa/);
  assert.throws(() => kitFrame({ scene: 'campo', params: P }, 0, 9), /L/);
  assert.throws(() => kitFrame({ scene: 'campo', params: P, actors: [{ cast: 'x', action: 'stand' }] }, 0), /Elenco/);
  assert.equal(typeof castActor, 'function');
});
test('the farm house keeps a lit window outside the day', () => {
  for (const time of ['dawn', 'dusk', 'night']) for (let seed = 0; seed < 40; seed++) {
    const house = KIT_SCENES.campo.build({ ...P, time, seed, extras: ['farm'] }, .3, 12).kit.layers.find(l => l.kind === 'buildings').items[0];
    assert.ok(house.windows.some(w => w.lit > 0), `${time}/${seed}`);
  }
  const day = KIT_SCENES.campo.build({ ...P, time: 'day', extras: ['farm'] }, .3, 12).kit.layers.find(l => l.kind === 'buildings').items[0];
  assert.ok(day.windows.every(w => !w.lit));
});

test('kit.time carries the time param (interior mood is "interior", the window needs the hour)', () => {
  for (const scene of ['interior-vela', 'campo']) for (const time of ['dawn', 'day', 'dusk', 'night']) {
    const k = kitFrame({ scene, params: { time } }, 0, 12).world.kit;
    assert.equal(k.time, time); assert.equal(k.mood, scene === 'interior-vela' ? 'interior' : time);
  }
});
