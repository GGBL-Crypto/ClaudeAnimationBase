import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function catalog() {
  const context = vm.createContext({});
  for (const file of ['src/platform.js', ...readdirSync(join(ROOT, 'src/styles')).filter(name => existsSync(join(ROOT, 'src/styles', name, 'config.js'))).map(name => `src/styles/${name}/config.js`), 'src/config.js']) vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), context, { filename: file });
  return context.AnimationPlatform;
}
export function sourceSnapshot() {
  const hash = createHash('sha256'), files = {};
  const walk = dir => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.js$/.test(entry.name) ? [`${dir}/${entry.name}`] : []);
  for (const path of [...walk('src'), 'studio.html', 'package-lock.json', 'render.mjs', 'scripts/render-lib.mjs'].sort()) {
    const bytes = readFileSync(join(ROOT, path));
    hash.update(path); hash.update(bytes); files[path] = createHash('sha256').update(bytes).digest('hex');
  }
  return { hash: hash.digest('hex'), files };
}
export const sourceHash = () => sourceSnapshot().hash;
export function assertSourceHash(expected) {
  if (sourceHash() !== expected) throw new Error('Código mudou durante o render; saída não promovida. Renderize novamente com a revisão estável.');
}
export function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) throw new Error(`Argumento inválido: ${arg}`);
    const at = arg.indexOf('='); args[arg.slice(2, at < 0 ? undefined : at)] = at < 0 ? true : arg.slice(at + 1);
  }
  return args;
}
export function number(value, name, { min = 0, max = Infinity, integer = false } = {}) {
  const n = typeof value === 'boolean' || value === '' ? NaN : Number(value);
  if (!Number.isFinite(n) || n < min || n > max || integer && !Number.isInteger(n)) throw new Error(`${name} inválido: ${value}`);
  return n;
}
export function interval(value, duration) {
  const range = value === undefined ? [0, duration] : String(value).split(':').map(v => number(v, 'range'));
  if (range.length !== 2 || range[1] <= range[0] || range[1] > duration) throw new Error('Use --range=início:fim dentro da duração');
  return range;
}
export function run(cmd, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'] });
    let out = '', err = '';
    if (capture) { child.stdout.on('data', data => { out += data; }); child.stderr.on('data', data => { err += data; }); }
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(out) : reject(new Error(`${cmd} terminou com código ${code}: ${err.trim()}`)));
  });
}
export async function launchBrowser(args = {}) {
  const caches = [join(homedir(), '.cache/ms-playwright'), join(homedir(), 'AppData/Local/ms-playwright')];
  const cached = caches.flatMap(dir => existsSync(dir) ? readdirSync(dir).filter(n => /^chromium-\d+$/.test(n)).sort().reverse().flatMap(n => ['chrome-linux64/chrome', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe'].map(rel => join(dir, n, rel))) : []);
  const chrome = [args.chrome, process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', ...cached].find(path => typeof path === 'string' && existsSync(path));
  if (!chrome) throw new Error('Chrome não encontrado; informe --chrome=<caminho> ou CHROME_PATH');
  const angle = { vulkan: ['--use-angle=vulkan', '--enable-features=Vulkan'], 'gl-egl': ['--use-angle=gl-egl'] };
  if (args['gpu-angle'] && !angle[args['gpu-angle']]) throw new Error('--gpu-angle deve ser vulkan ou gl-egl');
  const gpu = args['soft-gl'] ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : args['gpu-angle'] ? angle[args['gpu-angle']] : [process.platform === 'win32' ? '--use-angle=d3d11' : process.platform === 'darwin' ? '--use-angle=metal' : '--use-gl=angle'];
  return puppeteer.launch({ executablePath: chrome, headless: true, protocolTimeout: 180000, args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), '--allow-file-access-from-files', '--ignore-gpu-blocklist', ...gpu, '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
}
export async function openPage(browser, args = {}, { preview = false } = {}) {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const query = new URLSearchParams(preview ? {} : { render: '' });
  for (const key of ['project', 'style', 'loop']) if (args[key]) query.set(key, args[key]);
  await page.goto(pathToFileURL(join(ROOT, 'studio.html')).href + '?' + query, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready || window.bootError', { timeout: 60000 });
  const error = await page.evaluate(() => window.bootError);
  if (error || errors.length) { await page.close(); throw new Error(error || errors.join('\n')); }
  page.renderErrors = errors;
  return page;
}
export async function frameOf(page, t, type = 'image/png') {
  const url = await page.evaluate((t, type) => renderAt(t, type, .95), t, type);
  if (page.renderErrors.length) throw new Error(page.renderErrors.join('\n'));
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}
export async function verifyVideo(path, expected = {}, reviewDir = path + '.review') {
  if (!existsSync(path) || statSync(path).size < 1000) throw new Error(`Vídeo ausente ou vazio: ${path}`);
  const probe = JSON.parse(await run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', path], { capture: true }));
  const video = probe.streams.find(stream => stream.codec_type === 'video');
  if (!video || video.codec_name !== 'h264') throw new Error('MP4 sem vídeo H.264 válido');
  const [a, b] = video.avg_frame_rate.split('/').map(Number), fps = a / b, frames = Number(video.nb_read_frames), duration = Number(video.duration ?? probe.format.duration);
  for (const [key, actual] of Object.entries({ width: video.width, height: video.height, frames })) if (expected[key] !== undefined && expected[key] !== actual) throw new Error(`Vídeo inválido: ${key}=${actual}; esperado ${expected[key]}`);
  if (expected.fps && Math.abs(fps - expected.fps) > .001 || expected.duration && Math.abs(duration - expected.duration) > 1 / fps + .001) throw new Error('FPS ou duração do vídeo divergem do render');
  await run('ffmpeg', ['-v', 'error', '-xerror', '-i', path, '-map', '0:v:0', '-f', 'null', '-'], { capture: true });
  mkdirSync(reviewDir, { recursive: true });
  const indices = [...new Set([0, .12, .25, .4, .55, .68, .82, .94, 1].map(k => Math.min(frames - 1, Math.floor((frames - 1) * k))))];
  const select = indices.map(n => `eq(n\\,${n})`).join('+');
  await run('ffmpeg', ['-y', '-v', 'error', '-i', path, '-vf', `select='${select}',scale=480:-1:flags=neighbor,tile=3x3`, '-frames:v', '1', '-update', '1', join(reviewDir, 'decoded-sheet.png')], { capture: true });
  for (const [i, k] of [.4, .55, .82].entries()) await run('ffmpeg', ['-y', '-v', 'error', '-i', path, '-vf', `select=eq(n\\,${Math.floor((frames - 1) * k)})`, '-frames:v', '1', '-update', '1', join(reviewDir, `detail-${i + 1}.png`)], { capture: true });
  const report = { status: 'decoded-and-verified', visualReview: 'pending', file: resolve(path), bytes: statSync(path).size, codec: video.codec_name, width: video.width, height: video.height, fps, frames, duration, audio: probe.streams.some(s => s.codec_type === 'audio'), sampledFrames: indices, reviewDir: resolve(reviewDir) };
  writeFileSync(join(reviewDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
