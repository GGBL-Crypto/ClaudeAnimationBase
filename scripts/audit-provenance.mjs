// Reproduce the historical whitespace discrepancy without modifying any source or prior deliverable.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
const digest = value => createHash('sha256').update(value).digest('hex');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.js$/.test(e.name) ? [`${dir}/${e.name}`] : []);
const files = [...walk('src'), 'studio.html', 'package-lock.json', 'render.mjs', 'scripts/render-lib.mjs'].sort();
const snapshot = Object.fromEntries(files.map(file => [file, readFileSync(file)]));
function hash(extraNewline = false) {
  const h = createHash('sha256');
  for (const [file, bytes] of Object.entries(snapshot)) {
    h.update(file); h.update(bytes);
    if (extraNewline && file === 'src/timeline.js') h.update('\r\n');
  }
  return h.digest('hex');
}
const current = hash(), withOldTrailingBlankLine = hash(true);
const videos = ['watercolor', 'cartoon', 'pixel'].map(style => {
  const file = `out/visit/${style}/video.mp4`, report = JSON.parse(readFileSync(file + '.review/report.json', 'utf8'));
  const videoSha256 = digest(readFileSync(file));
  assert.equal(videoSha256, report.videoSha256, `Vídeo histórico alterado: ${style}`);
  return { style, file, sourceHash: report.sourceHash, videoSha256, matchesCurrent: report.sourceHash === current, matchesOldTrailingBlankLine: report.sourceHash === withOldTrailingBlankLine };
});
const out = `out/audit/provenance-${current.slice(0, 12)}.json`;
mkdirSync('out/audit', { recursive: true });
writeFileSync(out, JSON.stringify({ capturedAt: new Date().toISOString(), sourceHash: current, withOldTrailingBlankLine, sourceFiles: Object.fromEntries(Object.entries(snapshot).map(([file, bytes]) => [file, digest(bytes)])), videos }, null, 2) + '\n');
console.log(out); console.log(JSON.stringify({ current, withOldTrailingBlankLine, videos }, null, 2));
