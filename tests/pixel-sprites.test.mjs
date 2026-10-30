import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const ctx = vm.createContext({});
vm.runInContext(readFileSync('src/styles/pixel/sprites.js', 'utf8') + '\nthis.S = { PIXEL_SPRITES, spriteCells, rampOf, headVariant, hairOf };', ctx);
const { PIXEL_SPRITES: PS, spriteCells, rampOf, headVariant, hairOf } = ctx.S;
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
