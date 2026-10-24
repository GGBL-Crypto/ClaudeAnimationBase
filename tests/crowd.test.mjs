import test from 'node:test';
import assert from 'node:assert/strict';
import { natureContext } from './nature-helpers.mjs';

// Multidão com física (src/nature/crowd.js): fila, encontro, nascimento nas pontas e queda.
const ctx = natureContext(['src/nature/noise.js', 'src/nature/path.js', 'src/nature/crowd.js']);
const { makeCrowd, makePath, makePath3, fall, toss, pathZones } = ctx;
const series = (C, t0, t1, fps = 30) => { const m = new Map(); for (let i = Math.round(t0 * fps); i <= Math.round(t1 * fps); i++) for (const a of C.at(i / fps)) { if (!m.has(a.id)) m.set(a.id, []); m.get(a.id).push([i / fps, a]); } return m; };

test('queue: one lane, faster agents wait behind; s is continuous, monotonic and starts and ends at the path ends', () => {
  const S = .4, path = makePath([[0, 0], [12, 0]]), C = makeCrowd([{ path, S, speed: 1.5, gap: 1.2, rate: 1.2, seed: 3, t0: 0, t1: 20, vary: .3 }], { meet: 0 });
  for (let i = 0; i <= 600; i++) {
    const xs = C.at(i / 30).sort((a, b) => b.s - a.s);
    for (let j = 1; j < xs.length; j++) assert.ok(xs[j - 1].s - xs[j].s >= 1.2 * S - 1e-9, `fila furada em t=${i / 30}`);
  }
  let born = 0, gone = 0;
  for (const [, pts] of series(C, 0, 20)) {
    for (let j = 1; j < pts.length; j++) {
      const ds = pts[j][1].s - pts[j - 1][1].s;
      assert.ok(ds >= -1e-12 && ds < 3 * 1.5 * S / 30, 'salto ou volta');
      const v0 = j > 1 ? (pts[j - 1][1].s - pts[j - 2][1].s) * 30 : null;
      if (v0 !== null) assert.ok(Math.abs(ds * 30 - v0) * 30 / S < 10, 'aceleração acima do limite');
    }
    if (pts[0][0] > 0) { born++; assert.ok(pts[0][1].s < 1.5 * S / 30 * 1.5, 'nasceu longe da ponta'); }
    if (pts.at(-1)[0] < 20) { gone++; assert.ok(path.length - pts.at(-1)[1].s < 1.5 * S / 30 * 1.5, 'sumiu longe da ponta'); }
  }
  assert.ok(born > 10 && gone > 10);
  const v = C.agents[0].map(a => a.v), slow = C.at(10).some(a => a.moving < .97);
  assert.ok(Math.max(...v) / Math.min(...v) > 1.2 && slow, 'ninguém alcançou ninguém');
  assert.deepEqual(C.at(7.3), makeCrowd([{ path, S, speed: 1.5, gap: 1.2, rate: 1.2, seed: 3, t0: 0, t1: 20, vary: .3 }], { meet: 0 }).at(7.3));
});

test('meeting: opposite lanes stop 0.5 to 1 s with the heads level, then go on', () => {
  const S = .4, pts = [[0, 0], [10, 0]], w = .12, a = makePath(pts.map(([x, z]) => [x, z + w])), b = makePath(pts.slice().reverse().map(([x, z]) => [x, z - w]));
  const C = makeCrowd([{ path: a, S, speed: 1.5, rate: .5, seed: 1, t0: 0, t1: 30 }, { path: b, S, speed: 1.5, rate: .5, seed: 2, t0: 0, t1: 30 }], { meet: 1 });
  const met = C.agents.flat().filter(x => x.pauses.length);
  assert.ok(met.length >= 6, 'poucos encontros');
  for (const x of met) for (const [ta, dur, other] of x.pauses) {
    assert.ok(dur >= .5 && dur <= 1);
    const mid = ta + .6 + dur / 2, me = C.at(mid).find(y => y.id === x.id), them = C.at(mid).find(y => y.id === other);
    assert.ok(me && them && me.speed < .02 && them.speed < .02 && me.meet.k > .99, 'não parou');
    const hx = q => (q.lane ? b : a).at(q.s).x + (q.lane ? -1 : 1) * .22 * S;
    assert.ok(Math.abs(hx(me) - hx(them)) < .06 * S, 'cabeças desalinhadas');
    const after = C.at(ta + 2 * .6 + dur + .6).find(y => y.id === x.id);
    assert.ok(!after || after.speed > .5, 'não seguiu');  // sem after: já saiu pela ponta
  }
});

test('spawn and despawn only at the path ends, hidden inside portals, never by modulo', () => {
  const p = makePath3([[0, 0, 0], [3, -1, 0], [6, -1, 0]]), C = makeCrowd([{ path: p, S: .3, speed: 1, rate: .6, seed: 4, t0: 0, t1: 30, hide: [.5, .5] }], { meet: 0 });
  for (const [, pts] of series(C, 0, 30)) {
    const first = pts[0][1], last = pts.at(-1)[1];
    if (pts[0][0] > 0) assert.ok(first.hidden && first.s < .05);
    if (pts.at(-1)[0] < 30) assert.ok(last.hidden && p.length - last.s < .05);
    for (let j = 1; j < pts.length; j++) assert.ok(pts[j][1].s >= pts[j - 1][1].s);
  }
  assert.ok(C.at(12).some(a => !a.hidden));
  assert.ok(pathZones(p, .3).length > 10);
});

test('fall and toss are analytic: slow drag fall that lands and stays, parabola that ends on the target', () => {
  const at = t => { const r = fall(t, 1, [0, 2, 0], 0, { vt: .5, tau: .3, sway: .2, seed: 3 }); return { ...r, p: [...r.p] }; };
  assert.deepEqual(at(.5).p, [0, 2, 0]);
  let prev = 2; for (let t = 1; t < 6; t += 1 / 30) { const y = at(t).p[1]; assert.ok(y <= prev + 1e-12); prev = y; }
  assert.ok(at(3).p[1] > 0 && !at(3).landed, 'caiu rápido demais');
  assert.ok(at(8).landed && at(8).p[1] === 0);
  assert.deepEqual(at(8).p, at(20).p);
  const tz = t => { const r = toss(t, 0, [0, 0, 0], [1, 0, 0], .5, 4); return { ...r, p: [...r.p] }; }, a = tz(0), m = tz(.25), e = tz(9);
  assert.deepEqual(a.p, [0, 0, 0]); assert.ok(Math.abs(m.p[1] - 4 * .25 / 8 * .5 * 2) < 1e-9); assert.deepEqual(e.p, [1, 0, 0]); assert.ok(e.landed);
});
