import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const ctx = vm.createContext({});
vm.runInContext(readFileSync('src/styles/cartoon/parts.js', 'utf8') + '\nthis.PARTS = CARTOON_PARTS;', ctx);
const PARTS = ctx.PARTS;
// Subpaths of an absolute M/L/C/Q/Z path as point lists (control points included: enough for area sign and box).
const subpaths = d => d.split('M').filter(s => s.trim()).map(s => s.replace(/[LCQZ]/g, ' ').trim().split(/[\s,]+/).map(Number).reduce((a, v, i, l) => i % 2 ? a : [...a, [v, l[i + 1]]], []));
const area = q => q.reduce((s, [x, y], i) => { const [u, v] = q[(i + 1) % q.length]; return s + x * v - u * y; }, 0) / 2;
const pieces = Object.entries(PARTS).filter(([, s]) => s.side).flatMap(([spec, s]) => ['side', 'top'].flatMap(v => Object.entries(s[v] || {}).map(([n, q]) => [`${spec}.${v}.${n}`, q])));

test('cada espécie tem peças laterais; cão, formiga e ave têm vista superior', () => {
  for (const spec of ['human', 'dog', 'ant', 'spider', 'bird', 'fish']) assert.ok(Object.keys(PARTS[spec].side).length >= 4, spec);
  for (const spec of ['dog', 'ant', 'bird']) assert.ok(PARTS[spec].top, spec);
});

test('peças: caminho absoluto M/L/C/Q/Z em sentido horário, pivô, comprimento, camada e cor', () => {
  for (const [name, q] of pieces) {
    assert.match(q.d, /^M[-\d.\sMLCQZ]+$/, name);
    for (const sp of subpaths(q.d)) { assert.ok(sp.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), name); assert.ok(area(sp) > 0, `${name} anti-horário`); }
    assert.ok(q.pivot.length === 2 && q.len > 0 && Number.isFinite(q.layer) && typeof q.fill === 'string', name);
    for (const s of q.spots || []) { assert.match(s.d, /^M[-\d.\sMLCQZ]+$/, name); assert.ok(area(subpaths(s.d)[0]) > 0, `${name} mancha anti-horária`); }
  }
});

test('rosto humano: as 8 expressões com olho conhecido, sobrancelha e boca', () => {
  const F = PARTS.human.face;
  for (const e of ['neutral', 'happy', 'sad', 'scared', 'angry', 'surprised', 'tired', 'dead']) {
    assert.ok(F.eye[F[e].eye], e); assert.ok(F[e].lid > 0 && F[e].lid <= 1, e); assert.match(F[e].mouth.d, /^M/, e);
    assert.ok(F[e].brow === null || /^M/.test(F[e].brow), e);
  }
});

test('cenário: variantes de copa, arbusto e folha em sentido horário', () => {
  const S = PARTS.scenery;
  for (const k of ['round', 'tall', 'pine', 'bush', 'leaf']) { assert.ok(S[k].length >= 2, k); for (const d of S[k]) for (const sp of subpaths(d)) assert.ok(area(sp) > 0, k); }
  for (const d of [...S.trunk, S.pineTrunk]) for (const sp of subpaths(d)) assert.ok(area(sp) > 0, 'trunk');
});

// vtracer output: absolute paths placed by translate, one colour each.
const SVG = `<?xml version="1.0"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="40" height="20">
<path d="M0 0 C5 0 5 10 0 10 Z " fill="#F2B58D" transform="translate(12.5,3)"/>
<path d="M0 0 L4 4 Z" fill="#000000"/>
</svg>`;

test('importado: SVG do vtracer vira caminhos com cor e deslocamento', () => {
  const s = PARTS.parseSvg(SVG);
  assert.equal(s.w, 40); assert.equal(s.h, 20); assert.equal(s.paths.length, 2);
  assert.deepEqual({ ...s.paths[0] }, { d: 'M0 0 C5 0 5 10 0 10 Z', fill: '#F2B58D', x: 12.5, y: 3 });
  assert.deepEqual([s.paths[1].x, s.paths[1].y], [0, 0]);
});

test('importado: rig.json em px vira peças em BL/100 com padrões da peça desenhada e variantes de rosto', () => {
  const rig = { name: 'teste', spec: 'human', unit: 4, parts: {
    'head@happy': { file: 'b.png', size: [80, 80], pivot: [40, 40], len: 48 },
    head: { file: 'a.png', size: [80, 80], pivot: [40, 40], len: 48, layer: null },
    thigh: { file: 'c.png', size: [40, 120], pivot: [20, 20], len: 100, angle: 1.5, layer: 9 },
    body: { file: 'd.png', size: [40, 40], pivot: [0, 0], len: 8, view: 'top' } } };
  const art = { head: 'A', 'head@happy': 'B', thigh: 'C', body: 'D' }, R = PARTS.rigPieces(rig, art), H = PARTS.human.side;
  assert.equal(R.spec, 'human');
  assert.deepEqual([...R.side.head.pivot], [0, 0]); assert.deepEqual([...R.side.head.origin], [40, 40]); assert.equal(R.side.head.len, 12); assert.equal(R.side.head.u, 4);
  assert.equal(R.side.head.layer, H.head.layer); assert.equal(R.side.head.angle, 0); assert.equal(R.side.head.art, 'A');
  assert.equal(R.side.head.faces.happy.art, 'B');
  assert.equal(R.side.thigh.angle, 1.5); assert.equal(R.side.thigh.layer, 9); assert.equal(R.side.thigh.len, 25);
  assert.equal(R.top.body.art, 'D'); assert.equal(R.side.body, undefined);
  assert.throws(() => PARTS.rigPieces({ ...rig, parts: { 'head@sad': rig.parts.head } }, { 'head@sad': 'X' }), /Variante head@sad sem a peça head/);
  assert.throws(() => PARTS.rigPieces({ ...rig, spec: 'dragon' }, art), /Espécie desconhecida/);
  assert.throws(() => PARTS.rigPieces(rig, { head: 'A' }), /Arte ausente/);
});
