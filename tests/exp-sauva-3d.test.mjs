import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { catalog } from '../scripts/render-lib.mjs';

// Variante E (exp/visual-rico): a saúva 3D anda pela marcha de src/nature; o pé de apoio não desliza e a perna alcança o pé.
const platform = catalog(), ctx = vm.createContext({ AnimationPlatform: platform, projectConfig: platform.resolveProject('sauva-exp-e'), window: {} });
for (const file of ['src/motion.js', 'src/timeline.js', 'src/nature/noise.js', 'src/nature/path.js', 'src/nature/gait.js', 'src/nature/creature.js', 'src/nature/specs.js', 'src/nature/env.js', 'src/scenes/exp-sauva-3d.js'])
  vm.runInContext(readFileSync(file, 'utf8'), ctx, { filename: file });
const { antPose, MAIN, TRACKS } = ctx.window.expSauva3d;

test('stance feet stay put and every leg reaches its foot', () => {
  for (const [track, S, speed] of [[MAIN, .4, .6], [TRACKS[1], .26, .26]]) {
    let held = 0;
    for (let i = 0; i < 600; i++) {
      const t = i / 120, a = antPose(track, 2 + speed * t / S, S, t, { seed: 3 }), b = antPose(track, 2 + speed * (t + 1 / 120) / S, S, t + 1 / 120, { seed: 3 });
      a.legs.forEach((l, j) => {
        assert.ok(Math.hypot(...l.end.map((v, k) => v - l.foot[k])) < 1e-6, 'perna não alcança o pé');
        if (l.stance && b.legs[j].stance) { held++; assert.ok(Math.hypot(...l.foot.map((v, k) => v - b.legs[j].foot[k])) < 1e-9, 'pé de apoio deslizou'); }
      });
    }
    assert.ok(held > 1000);
  }
});
