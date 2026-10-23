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
const pieces = Object.entries(PARTS).filter(([k]) => k !== 'scenery').flatMap(([spec, s]) => ['side', 'top'].flatMap(v => Object.entries(s[v] || {}).map(([n, q]) => [`${spec}.${v}.${n}`, q])));

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
