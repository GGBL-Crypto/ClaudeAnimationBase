import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, truncateSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { acervoKey, segmentArgs, concatList, assembleArgs } from '../scripts/episode-lib.mjs';
import { runEpisode } from '../scripts/episode.mjs';
import { ROOT, sourceSnapshot } from '../scripts/render-lib.mjs';

test('acervo key changes with style, params, L and source; not with episode id', () => {
  const base = { style: 'pixel', styleConfig: {}, scene: 'mar', params: { time: 'night' }, castUsed: [], actors: [], L: 12, fps: 24, sourceHash: 'h' };
  const k = acervoKey(base); assert.match(k, /^[0-9a-f]{64}$/);
  for (const patch of [{ style: 'flat' }, { params: { time: 'day' } }, { L: 14 }, { sourceHash: 'h2' }]) assert.notEqual(acervoKey({ ...base, ...patch }), k);
  assert.equal(acervoKey({ ...base, id: 'outro-episodio' }), k);
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
test('source hash ignores src/episodes.js', () => {
  // Só acrescenta e depois corta no tamanho original (sem apagar): o catalog() de outros testes lê o arquivo em paralelo e vê sempre JS válido.
  // Se o arquivo não existia, fica vazio (fora do git; o catalog() carrega um arquivo vazio sem efeito).
  const file = join(ROOT, 'src/episodes.js'), size = existsSync(file) ? statSync(file).size : 0, h = sourceSnapshot().hash;
  try { appendFileSync(file, '\n// teste\n'); assert.equal(sourceSnapshot().hash, h); }
  finally { truncateSync(file, size); }
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
  shots: [{ id: 's1', chapter: 'c1', start: 1.5, end: 10, speech: [{ start: 1.75, end: 3, text: 'Um farol.' }] }, { id: 's2', chapter: 'c2', start: 10, end: 14.5, speech: [] }, { id: 's3', chapter: 'c2', start: 14.5, end: 16, speech: [] }] };

// O run falso grava os comandos e cria as saídas esperadas (render: --out; ffmpeg: último argumento; verify: devolve o relatório).
function fakeRun({ failOn } = {}) {
  const calls = [];
  const run = async (cmd, args) => {
    calls.push([cmd, ...args]);
    if (failOn && args.includes(failOn)) throw new Error(`${failOn} falhou`);
    const out = args.find(a => a.startsWith('--out='))?.slice(6) ?? (cmd === 'ffmpeg' ? args.at(-1) : null);
    if (out) { mkdirSync(dirname(join(ROOT, out)), { recursive: true }); writeFileSync(join(ROOT, out), 'x'); }
    if (args[0] === 'scripts/verify-video.mjs') return JSON.stringify({ width: 1920, height: 1080, fps: 24, frames: 384, duration: timing.duration, audio: true });
    return '';
  };
  return { run, calls };
}
const OUT = 'out/tmp/test-episode-assemble', DIR = `${OUT}/ep`;
function setup() {
  rmSync(join(ROOT, OUT), { recursive: true, force: true }); mkdirSync(join(ROOT, DIR), { recursive: true });
  writeFileSync(join(ROOT, DIR, 'episode.json'), JSON.stringify(ep)); writeFileSync(join(ROOT, DIR, 'timing.json'), JSON.stringify(timing));
}
const steps = ['loops', 'segments', 'assemble', 'verify'];

test('runEpisode renders each acervo key once and skips existing', async () => {
  setup();
  try {
    const first = fakeRun(), lines = [];
    await runEpisode(join(ROOT, DIR), { steps, out: OUT, run: first.run, log: l => lines.push(JSON.parse(l)) });
    const renders = first.calls.filter(c => c[1] === 'render.mjs'), ff = first.calls.filter(c => c[0] === 'ffmpeg');
    assert.equal(renders.length, 2);  // mar (s1 e s2) e campo
    assert.ok(renders.every(c => c.includes('--clip') && c.includes('--project=ep-teste-montagem') && c.some(a => /^--loop=(mar|campo)-[0-9a-f]{8}$/.test(a))));
    assert.ok(lines.some(l => l.step === 'validate' && /s1 e s2/.test(l.message)));
    // Segmentos: um por plano, somam a duração; o primeiro começa em 0 (abertura); s3 (< 2 s) sem fade.
    const segs = ff.filter(c => c.includes('-stream_loop')), t = c => Number(c[c.indexOf('-t') + 1]);
    assert.equal(segs.length, 3);
    assert.ok(Math.abs(segs.reduce((a, c) => a + t(c), 0) - timing.duration) <= 1 / 24);
    assert.deepEqual(segs.map(c => c.join(' ').includes('fade')), [true, true, false]);
    assert.equal(readFileSync(join(ROOT, OUT, 'episodes/teste-montagem/concat.txt'), 'utf8').split('\n').filter(Boolean).length, 3);
    assert.ok(existsSync(join(ROOT, OUT, 'episodes/teste-montagem/subs.ass')));
    const index = JSON.parse(readFileSync(join(ROOT, OUT, 'acervo/index.json'), 'utf8'));
    assert.deepEqual(Object.values(index).map(e => e.scene).sort(), ['campo', 'mar']);
    for (const c of ff) assert.ok(!/\\|C:/.test(c.join(' ')), c.join(' '));  // caminhos relativos com /
    // Segunda execução: nada a renderizar nem a cortar.
    const second = fakeRun();
    await runEpisode(join(ROOT, DIR), { steps, out: OUT, run: second.run, log: () => {} });
    assert.equal(second.calls.filter(c => c[1] === 'render.mjs').length, 0);
    assert.equal(second.calls.filter(c => c.includes('-stream_loop')).length, 0);
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
