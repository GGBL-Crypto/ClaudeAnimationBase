import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// hash vem de motion.js no navegador; aqui vai a mesma fórmula.
const ctx = vm.createContext({ hash: i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); } });
vm.runInContext(readFileSync('src/styles/pixel/figure.js', 'utf8') + '\nthis.F = { ellipsePart, capsulePart, quadPart, polyPart, spritePart, figureLayer, lockTone, scaleRows, flipCells, rotateCells, canopyParts };', ctx);
const { ellipsePart, quadPart, figureLayer, lockTone, scaleRows, flipCells, rotateCells, canopyParts } = ctx.F;
const R = { m: ['#000001', '#000002', '#000003', '#000004', '#000005'] }, tone = c => R.m.indexOf(c);
const box = { W: 24, H: 24, OX: 12, OY: 12 }, ink = '#ffffff', at = (L, x, y) => L.cells[y * L.W + x];

test('layer is deterministic', () => {
  const p = [ellipsePart([0, 0], 6, 6, 'm')];
  assert.deepEqual(figureLayer(p, box, { ramps: R, ink }).cells, figureLayer(p, box, { ramps: R, ink }).cells);
});
test('light comes from the top left', () => {
  const L = figureLayer([ellipsePart([0, 0], 8, 8, 'm')], box, { ramps: R, ink });
  assert.ok(tone(at(L, 8, 8)) > tone(at(L, 16, 16)));
});
test('outline closes the silhouette', () => {
  const L = figureLayer([ellipsePart([0, 0], 6, 6, 'm')], box, { ramps: R, ink });
  for (let k = 0; k < L.cells.length; k++) {
    const x = k % L.W, y = k / L.W | 0, c = L.cells[k]; if (!c || c === ink || c === R.m[0]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.ok(at(L, x + dx, y + dy), 'recheio encosta no vazio');
  }
});
test('inner line darkens the back part where the front part touches', () => {
  const L = figureLayer([ellipsePart([-3, 0], 5, 5, 'm', { g: 'a' }), ellipsePart([3, 0], 5, 5, 'm', { g: 'b' })], box, { ramps: R, ink });
  assert.ok(tone(at(L, 12 + 3 - 5 - 1, 12)) <= 1);  // a coluna da peça de trás logo à esquerda da borda da da frente
});
test('rim lights the edge away from the light', () => {
  const a = figureLayer([quadPart([0, -8], [0, 8], 3, 3, 'm')], box, { ramps: R, ink, rim: true });
  const b = figureLayer([quadPart([0, -8], [0, 8], 3, 3, 'm')], box, { ramps: R, ink, rim: true, light: [.55, -.7, .5] });
  assert.equal(tone(at(a, 14, 12)), 2); assert.equal(tone(at(b, 9, 12)), 2);
});
test('lock shading lights the top of each lock', () => {
  const s = { ax: 0, ay: 0, locks: 'ab', rows: ['aaab', 'aaab', 'aabb', 'abbb'] };
  assert.equal(lockTone(s.rows, 0, 0, 'a'), 4); assert.equal(lockTone(s.rows, 3, 3, 'b'), 0);
});
test('flip mirrors around the origin and rotate is lossless', () => {
  const L = figureLayer([ellipsePart([3, -2], 2, 2, 'm')], box, { ramps: R, ink }), F = flipCells(L);
  for (let k = 0; k < L.cells.length; k++) { const x = k % L.W, y = k / L.W | 0; assert.equal(F.cells[y * L.W + (2 * L.OX - 1 - x)], L.cells[k]); }
  let Q = L; for (let i = 0; i < 4; i++) Q = rotateCells(Q, 1); assert.deepEqual(Q.cells, L.cells);
});
test('scaleRows is nearest neighbour', () => {
  assert.deepEqual([...scaleRows(['ab', 'cd'], 2)], ['aabb', 'aabb', 'ccdd', 'ccdd']);
  assert.equal(scaleRows(['abc'], 1.35)[0].length, 4);
});
test('shift lowers every tone by one', () => {
  const p = [ellipsePart([0, 0], 6, 6, 'm')], a = figureLayer(p, box, { ramps: R, ink }), b = figureLayer(p, box, { ramps: R, ink, shift: 1 });
  assert.equal(tone(b.cells[12 * 24 + 12]), Math.max(0, tone(a.cells[12 * 24 + 12]) - 1));
});
test('lock highlight lifts the pixel two rows below the top when hash allows', () => {
  const rows = ['aa.a', 'aaaa', 'aaaa', 'aaaa', 'aaaa', 'aaaa', 'aaaa', 'aaaa'];
  assert.equal(lockTone(rows, 2, 3, 'a'), 4); assert.equal(lockTone(rows, 1, 2, 'a'), 2);  // hash(43) = .56, hash(27) = .49
});
test('rotate turns clockwise around the origin pixel', () => {
  const L = { W: 8, H: 8, OX: 4, OY: 4, cells: Array(64).fill(null) }; L.cells[4 * 8 + 4] = 'o'; L.cells[4 * 8 + 6] = 'r';
  const Q = rotateCells(L, 1); assert.equal(Q.cells[4 * 8 + 4], 'o'); assert.equal(Q.cells[6 * 8 + 4], 'r');
  assert.deepEqual([...rotateCells(Q, -1).cells], L.cells); assert.throws(() => rotateCells({ ...L, W: 4, cells: Array(32).fill(null) }, 1));
});
test('canopy is stable per seed', () => {
  assert.deepEqual(canopyParts(9, 5, 9, 7, -9), canopyParts(9, 5, 9, 7, -9));
  assert.notDeepEqual(canopyParts(9, 5, 9, 7, -9), canopyParts(9, 6, 9, 7, -9));
});
