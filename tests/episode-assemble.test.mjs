import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { acervoKey, segmentArgs, concatList, assembleArgs } from '../scripts/episode-lib.mjs';
import { runEpisode } from '../scripts/episode.mjs';
import { ROOT, sourceSnapshot } from '../scripts/render-lib.mjs';

test('acervo key changes with style, params, L and source; not with episode id', () => {
  const base = { style: 'pixel', styleConfig: {}, scene: 'mar', params: { time: 'night' }, castUsed: [], actors: [], L: 12, fps: 24, sourceHash: 'h' };
  const k = acervoKey(base); assert.match(k, /^[0-9a-f]{64}$/);
  for (const patch of [{ style: 'flat' }, { params: { time: 'day' } }, { L: 14 }, { sourceHash: 'h2' }]) assert.notEqual(acervoKey({ ...base, ...patch }), k);
  assert.equal(acervoKey({ ...base, id: 'outro-episodio' }), k);
  // A mesma cena escrita de outro jeito (params vazios ou com os padrões, chaves em outra ordem) tem a mesma chave.
  const bare = { ...base, params: {} }, spelled = { ...base, params: { extras: [], framing: 'wide', seed: 0, weather: 'clear', time: 'day' } };
  assert.equal(acervoKey(bare), acervoKey(spelled));
});
test('segment args: fades, loop, no windows paths', () => {
  const a = segmentArgs('out/acervo/k.mp4', 30, 'out/episodes/x/seg/k-30.mp4').join(' ');
  // O FFmpeg recusa "d=.75" ("Unable to parse option value"); o brief pede .75, a forma aceita é 0.75.
  assert.match(a, /-stream_loop -1/); assert.match(a, /fade=t=out:st=29\.25:d=0\.75/); assert.ok(!/\\|C:/.test(a));
  assert.ok(!/fade/.test(segmentArgs('a.mp4', 1.5, 'b.mp4').join(' ')));
});
test('concat list quotes relative paths and escapes quotes', () => {
  assert.equal(concatList(['seg/a-1.5.mp4', "seg/it's.mp4"]), "file 'seg/a-1.5.mp4'\nfile 'seg/it'\\''s.mp4'\n");
});
test('assemble args burn subtitles with relative fontsdir and copy audio', () => {
  const a = assembleArgs({ list: 'out/episodes/x/concat.txt', ass: 'out/episodes/x/subs.ass', audio: 'out/episodes/x/mix.m4a', out: 'out/episodes/x/video.mp4' }).join(' ');
  assert.match(a, /subtitles=out\/episodes\/x\/subs\.ass:fontsdir=assets\/fonts/); assert.match(a, /-c:a copy/); assert.match(a, /-f concat/);
});
// Sem mexer no arquivo: com src/episodes.js presente (build-episode o gera), ele não entra no snapshot.
test('source hash ignores src/episodes.js', { skip: !existsSync(join(ROOT, 'src/episodes.js')) && 'sem src/episodes.js' }, () => {
  const { files } = sourceSnapshot();
  assert.ok(!('src/episodes.js' in files)); assert.ok('src/episode/player.js' in files);
});

// Episódio de teste: capítulo de um plano só, a mesma cena em planos seguidos (s1, s2), plano sem fala (s2) e plano curto (s3, 1,5 s).
const mar = { id: 'mar', params: { time: 'night', weather: 'clear', seed: 7, framing: 'wide', extras: ['lighthouse'] } };
const ep = {
  id: 'teste-montagem', title: 'Teste', style: 'pixel', fps: 24, sources: [{ url: 'https://pt.wikipedia.org/wiki/Farol', title: 'Farol', accessed: '2026-10-29' }],
  cast: [{ id: 'a', body: 'adult' }],
  chapters: [
    { id: 'c1', title: 'Um', shots: [{ id: 's1', narration: 'Um farol.', scene: mar, actors: [{ cast: 'a', action: 'stand', at: .4, dir: 1 }] }] },
    { id: 'c2', title: 'Dois', shots: [{ id: 's2', scene: mar, actors: [{ cast: 'a', action: 'stand', at: .4, dir: 1 }] }, { id: 's3', hold: 1.5, scene: { id: 'campo', params: { time: 'day' } } }] },
  ],
};
const timing = { id: ep.id, fps: 24, duration: 16, chapters: [{ id: 'c1', title: 'Um', start: 0, end: 10 }, { id: 'c2', title: 'Dois', start: 10, end: 16 }],
  shots: [{ id: 's1', chapter: 'c1', start: 1.5, end: 10.013, speech: [{ start: 1.75, end: 3, text: 'Um farol.' }] }, { id: 's2', chapter: 'c2', start: 10.013, end: 14.49, speech: [] }, { id: 's3', chapter: 'c2', start: 14.49, end: 16, speech: [] }] };

// O run falso grava os comandos e cria as saídas esperadas (render: --out; ffmpeg: último argumento; mix: mix.m4a; verify e ffprobe: o relatório).
function fakeRun({ failOn } = {}) {
  const calls = [];
  const run = async (cmd, args) => {
    calls.push([cmd, ...args]);
    if (failOn && args.includes(failOn)) throw new Error(`${failOn} falhou`);
    const out = args.find(a => a.startsWith('--out='))?.slice(6) ?? (cmd === 'ffmpeg' ? args.at(-1) : null);
    if (out) { mkdirSync(dirname(join(ROOT, out)), { recursive: true }); writeFileSync(join(ROOT, out), 'x'); }
    if (args[0] === 'scripts/mix-audio.mjs') writeFileSync(join(ROOT, E, 'mix.m4a'), 'x');
    if (cmd === 'ffprobe') return 'aac\n';
    if (args[0] === 'scripts/verify-video.mjs') return JSON.stringify({ width: 1920, height: 1080, fps: 24, frames: 384, duration: timing.duration, audio: true });
    return '';
  };
  return { run, calls };
}
const OUT = 'out/tmp/test-episode-assemble', DIR = `${OUT}/ep`, E = `${OUT}/episodes/teste-montagem`;
function setup() {
  rmSync(join(ROOT, OUT), { recursive: true, force: true }); mkdirSync(join(ROOT, DIR), { recursive: true });
  writeFileSync(join(ROOT, DIR, 'episode.json'), JSON.stringify(ep)); writeFileSync(join(ROOT, DIR, 'timing.json'), JSON.stringify(timing));
  mkdirSync(join(ROOT, E), { recursive: true }); writeFileSync(join(ROOT, E, 'narration.wav'), 'narração');
}
const steps = ['loops', 'segments', 'mix', 'assemble', 'verify'];

test('runEpisode renders each acervo key once and skips existing', async () => {
  setup();
  try {
    const first = fakeRun(), lines = [];
    await runEpisode(join(ROOT, DIR), { steps, out: OUT, run: first.run, log: l => lines.push(JSON.parse(l)) });
    const renders = first.calls.filter(c => c[1] === 'render.mjs'), ff = first.calls.filter(c => c[0] === 'ffmpeg');
    assert.equal(renders.length, 2);  // mar (s1 e s2) e campo
    assert.ok(renders.every(c => c.includes('--clip') && c.includes('--project=ep-teste-montagem') && c.some(a => /^--loop=(mar|campo)-[0-9a-f]{8}$/.test(a))));
    assert.ok(lines.some(l => l.step === 'validate' && /s1 e s2/.test(l.message)));
    // Segmentos: um por plano, em quadros inteiros que somam a duração exata (limites fora da grade); o primeiro começa em 0; s3 (< 2 s) sem fade.
    const segs = ff.filter(c => c.includes('-stream_loop')), t = c => Number(c[c.indexOf('-t') + 1]);
    assert.equal(segs.length, 3);
    assert.ok(segs.every(c => Math.abs(t(c) * 24 - Math.round(t(c) * 24)) < 1e-9)); assert.equal(segs.reduce((a, c) => a + Math.round(t(c) * 24), 0), 16 * 24);
    assert.deepEqual(segs.map(c => c.join(' ').includes('fade')), [true, true, false]);
    assert.equal(readFileSync(join(ROOT, OUT, 'episodes/teste-montagem/concat.txt'), 'utf8').split('\n').filter(Boolean).length, 3);
    assert.ok(existsSync(join(ROOT, OUT, 'episodes/teste-montagem/subs.ass')));
    const index = JSON.parse(readFileSync(join(ROOT, OUT, 'acervo/index.json'), 'utf8'));
    assert.deepEqual(Object.values(index).map(e => e.scene).sort(), ['campo', 'mar']);
    for (const c of ff) assert.ok(!/\\|C:/.test(c.join(' ')), c.join(' '));  // caminhos relativos com /
    const mixes = r => r.calls.filter(c => c[1] === 'scripts/mix-audio.mjs').length, assembles = r => r.calls.filter(c => c.includes('concat')).length;
    assert.equal(mixes(first), 1); assert.equal(assembles(first), 1);
    // Segunda execução: nada a renderizar, cortar, mixar nem montar; o verify roda sempre.
    const second = fakeRun();
    await runEpisode(join(ROOT, DIR), { steps, out: OUT, run: second.run, log: () => {} });
    assert.equal(second.calls.filter(c => c[1] === 'render.mjs').length, 0);
    assert.equal(second.calls.filter(c => c.includes('-stream_loop')).length, 0);
    assert.equal(mixes(second), 0); assert.equal(assembles(second), 0);
    assert.equal(second.calls.filter(c => c[1] === 'scripts/verify-video.mjs').length, 1);
    // Narração nova (narrate regrava o wav): mixa e monta de novo.
    writeFileSync(join(ROOT, E, 'narration.wav'), 'outra narração');
    const third = fakeRun();
    await runEpisode(join(ROOT, DIR), { steps, out: OUT, run: third.run, log: () => {} });
    assert.equal(mixes(third), 1); assert.equal(assembles(third), 1);
  } finally { rmSync(join(ROOT, OUT), { recursive: true, force: true }); }
});

test('runEpisode reports a failing step as JSON and exit code', async () => {
  setup();
  try {
    const { run } = fakeRun({ failOn: 'render.mjs' }), lines = [];
    await assert.rejects(runEpisode(join(ROOT, DIR), { steps, out: OUT, run, log: l => lines.push(JSON.parse(l)) }), /render\.mjs falhou/);
    assert.equal(lines.at(-1).step, 'loops'); assert.match(lines.at(-1).error, /render\.mjs falhou/);
    const verify = fakeRun(), bad = [];  // duração fora de ± 1 quadro
    await assert.rejects(runEpisode(join(ROOT, DIR), { steps: ['verify'], out: OUT, run: async (c, a) => (await verify.run(c, a)).replace('"duration":16', '"duration":16.2'), log: l => bad.push(JSON.parse(l)) }));
    assert.equal(bad.at(-1).step, 'verify');
    const cli = spawnSync(process.execPath, ['scripts/episode.mjs', `${OUT}/nao-existe`], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(cli.status, 1); assert.ok(JSON.parse(cli.stdout.trim().split('\n').at(-1)).error);
  } finally { rmSync(join(ROOT, OUT), { recursive: true, force: true }); }
});

test('runEpisode rejects an episode folder outside the repository', async () => {
  const lines = [];
  await assert.rejects(runEpisode(tmpdir(), { steps, log: l => lines.push(JSON.parse(l)) }), /dentro do repositório/);
  assert.match(lines.at(-1).error, /dentro do repositório/);
});
test('segment cache name carries the ffmpeg args template', async () => {
  setup();
  try {
    const a = fakeRun(); await runEpisode(join(ROOT, DIR), { steps: ['loops', 'segments'], out: OUT, run: a.run, log: () => {} });
    const names = readdirSync(join(ROOT, E, 'seg')).filter(n => !n.includes('partial'));
    assert.equal(names.length, 3); assert.ok(names.every(n => /-[0-9a-f]{6}\.mp4$/.test(n)), names.join());
  } finally { rmSync(join(ROOT, OUT), { recursive: true, force: true }); }
});
