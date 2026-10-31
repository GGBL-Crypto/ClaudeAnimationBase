import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const ctx = vm.createContext({});
vm.runInContext(readFileSync('src/styles/pixel/sprites.js', 'utf8') + '\nthis.S = { PIXEL_SPRITES, PIXEL_SPRITES5, spriteCells, rampOf, headVariant, hairOf, familyOf };', ctx);
const { PIXEL_SPRITES: PS, spriteCells, rampOf, headVariant, hairOf, familyOf } = ctx.S;
const cfg = vm.createContext({ AnimationPlatform: { registerStyle: s => (cfg.style = s) } });
vm.runInContext(readFileSync('src/styles/pixel/config.js', 'utf8'), cfg);
const style = cfg.style;
const all = (o, out = []) => { if (o && Array.isArray(o.rows)) out.push(o); else if (o && typeof o === 'object') Object.values(o).forEach(v => all(v, out)); return out; };
test('every sprite is well formed', () => {
  for (const s of all(PS)) {
    assert.equal(s.rows.length, s.h);
    for (const r of s.rows) { assert.equal(r.length, s.w); for (const ch of r) assert.ok(ch in PS.LEGEND, ch); }
    assert.ok(s.ax >= 0 && s.ax < s.w && s.ay >= 0 && s.ay < s.h);
  }
});
test('mirrors around the anchor', () => {
  const h = PS.heads.short.level, a = spriteCells(h, false), b = spriteCells(h, true);
  assert.equal(a.length, b.length);
  for (const c of a) assert.ok(b.some(d => d.x === -c.x && d.y === c.y && d.ch === c.ch));
});
test('ramps stay ordered for extreme cast colors', () => {
  const pal = ['#000000', '#29304A', '#3A2A1E', '#6B4A33', '#C68A62', '#E0B48E', '#F6E8C3', '#D8D4CC', '#8A8F9C', '#3F6E9A', '#B1D9E8'];
  const lum = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).reduce((s, v, i) => s + v * [.3, .59, .11][i], 0);
  for (const c of ['#3A2A1E', '#D8D4CC', '#111111', '#C68A62']) {
    const [d, m, l] = rampOf(c, pal);
    assert.ok([d, m, l].every(x => pal.includes(x)));
    assert.ok(lum(d) <= lum(m) && lum(m) <= lum(l));
  }
});
test('head variant and hair are stable', () => {
  assert.equal(headVariant(-.6), 'up'); assert.equal(headVariant(0), 'level'); assert.equal(headVariant(.4), 'down');
  assert.equal(hairOf({ id: 'x', hair: 'bun' }), 'bun');
  assert.equal(hairOf({ id: 'viajante', pose: { body: 'adult' } }), hairOf({ id: 'viajante', pose: { body: 'adult' } }));
});
test('palette carries 15 five-tone ramps, dark to light', () => {
  const { ramps, palette } = style.config, lum = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).reduce((s, v, i) => s + v * [.3, .59, .11][i], 0);
  assert.equal(Object.keys(ramps).length, 15);
  for (const [f, r] of Object.entries(ramps)) { assert.equal(r.length, 5); r.forEach((h, i) => { assert.equal(palette[f + i], h); if (i) assert.ok(lum(h) > lum(r[i - 1]), f + i); }); }
  assert.doesNotThrow(() => style.validate(style.config));
  assert.equal(style.config.texture.scale, 4);
});
test('validate caps the palette at 128 colors', () => {
  const big = { ...style.config, palette: { ...style.config.palette } };
  for (let i = 0; i < 80; i++) big.palette['x' + i] = '#' + (0x100000 + i * 997).toString(16).slice(-6);
  assert.throws(() => style.validate(big), /128/);
});
test('familyOf maps cast colors', () => {
  const R = style.config.ramps;
  assert.equal(familyOf('#5a3a28', 'skin', R), 'skinD'); assert.equal(familyOf('#c68a62', 'skin', R), 'skinM');
  assert.equal(familyOf('#111111', 'hair', R), 'hairBlack'); assert.equal(familyOf('#d8d4cc', 'hair', R), 'grey'); assert.equal(familyOf('#3a2a1e', 'hair', R), 'hairBrown');
  assert.equal(familyOf('#3f6e9a', 'cloth', R), 'blue'); assert.equal(familyOf('#e0b040', 'cloth', R), 'yellow'); assert.equal(familyOf('#2e5a46', 'cloth', R), 'green');
});
const S5 = ctx.S.PIXEL_SPRITES5, tonal = /^[.0-4]+$/;
test('sprite set is complete and well formed', () => {
  for (const h of ['short', 'long', 'spiky', 'bun', 'hood', 'helmet']) assert.ok(S5.hair[h], h);
  for (const k of ['fist', 'relax', 'point', 'open', 'hold']) assert.ok(S5.hands[k], k);
  for (const e of ['neutral', 'curious', 'surprised', 'happy', 'blink']) assert.ok(S5.eyes[e], e);
  for (const m of ['none', 'm', 'e', 'a', 'o', 'grin']) assert.ok(S5.mouths[m], m);
  const maps = [...Object.values(S5.hair), S5.hat], tones = [...Object.values(S5.hands), S5.boot, S5.ear];
  for (const s of [...maps, ...tones]) { const w = s.rows[0].length; for (const r of s.rows) assert.equal(r.length, w); assert.ok(s.ax >= 0 && s.ax < w && s.ay >= 0 && s.ay < s.rows.length); }
  for (const s of maps) for (const r of s.rows) for (const ch of r) assert.ok(ch === '.' || s.locks.includes(ch), ch);
  for (const s of tones) for (const r of s.rows) assert.match(r, tonal);
});
test('hair leaves the face free', () => {
  for (const [name, s] of Object.entries(S5.hair)) for (let y = 0; y <= 6; y++) for (let x = 2; x <= 9; x++)
    assert.equal((s.rows[s.ay + y] || '')[s.ax + x] || '.', '.', `${name} cobre o rosto em ${x},${y}`);
});
test('happy eyes read as arcs, not as a closed line', () => {
  const n = S5.eyes.happy.near; assert.ok(n.length >= 2 && n[0].includes('K') && /K.*\.+.*K/.test(n[n.length - 1]));
});
