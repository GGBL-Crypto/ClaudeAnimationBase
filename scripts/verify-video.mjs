import { verifyVideo } from './render-lib.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
try {
  if (!process.argv[2]) throw new Error('Uso: node scripts/verify-video.mjs caminho/video.mp4');
  const file = process.argv[2], reportPath = join(file + '.review', 'report.json');
  const previous = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : null;
  const videoSha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  const report = await verifyVideo(file);
  // Rechecking a video cannot establish its source revision. Preserve it only for identical bytes.
  if (previous?.videoSha256 === videoSha256) {
    for (const key of ['project', 'style', 'sourceHash', 'sourceFiles', 'startedAt', 'elapsedMs', 'environment', 'arguments']) {
      if (previous[key] !== undefined) report[key] = previous[key];
    }
  }
  report.videoSha256 = videoSha256; report.verifiedAt = new Date().toISOString();
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
