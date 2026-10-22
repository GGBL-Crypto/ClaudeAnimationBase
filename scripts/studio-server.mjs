// Static, explicit studio routes only. Never expose out/, Git, docs or arbitrary node_modules.
import { createServer } from 'node:http';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCatalog, sha256 } from './asset-catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEPENDENCY_ROUTES = Object.freeze([
  'node_modules/p5/lib/p5.min.js', 'node_modules/p5.brush/dist/p5.brush.js',
  'node_modules/three/build/three.module.js', 'node_modules/three/build/three.core.js',
  'node_modules/three/examples/jsm/loaders/GLTFLoader.js',
  'node_modules/three/examples/jsm/environments/RoomEnvironment.js',
  'node_modules/three/examples/jsm/utils/BufferGeometryUtils.js',
  'node_modules/three/examples/jsm/utils/SkeletonUtils.js'
]);
const within = (root, file) => { const rel = relative(root, file); return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel); };
export async function startStudioServer({ port = 0, root = ROOT } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Porta inválida');
  root = await realpath(root);
  const routes = new Map([['/studio.html', resolve(root, 'studio.html')]]);
  const assets=loadCatalog(root),assetRoutes=new Map();
  if(assets.length){
    routes.set('/assets/index.json',null);
    for(const asset of assets)for(const file of asset.manifest.files){
      const route='/'+asset.prefix+'/'+file.path;
      routes.set(route,resolve(asset.packRoot,file.path));assetRoutes.set(route,{...file,root:asset.packRoot});
    }
  }
  async function walk(dir) {
    for (const entry of await readdir(resolve(root, dir), { withFileTypes: true })) {
      const name = dir + '/' + entry.name;
      // Do not follow directory junctions/symlinks while building the public inventory.
      if (entry.isDirectory()) await walk(name);
      else if (/\.js$/.test(name)) routes.set('/' + name, resolve(root, name));
    }
  }
  await walk('src');
  for (const file of DEPENDENCY_ROUTES) routes.set('/' + file, resolve(root, file));
  let authority;
  const server = createServer(async (req, res) => {
    const reject = status => { res.writeHead(status, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' }); res.end('Recurso indisponível'); };
    if (req.headers.host !== authority) return reject(403);
    if (req.method !== 'GET' && req.method !== 'HEAD') return reject(405);
    const raw = (req.url || '').split('?')[0];
    // Reject encoded paths altogether, before URL normalization: includes double encoding and encoded separators.
    if (!/^\/[A-Za-z0-9_./-]+$/.test(raw) || raw.split('/').slice(1).some(p => !p || p === '.' || p === '..')) return reject(403);
    if (!routes.has(raw)) return reject(404);
    const file = routes.get(raw);
    try {
      if(raw==='/assets/index.json'){
        const bytes=Buffer.from(JSON.stringify({schemaVersion:1,entries:assets.map(a=>a.public)}));
        res.writeHead(200,{'Content-Type':'application/json','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:bytes);return;
      }
      const actual = await realpath(file),asset=assetRoutes.get(raw);
      if (!within(root, actual)) return reject(403);
      if(asset&&!within(asset.root,actual))return reject(403);
      // Open the verified target itself, so a swapped source symlink is not followed again.
      const bytes = await readFile(actual);
      if(asset&&(bytes.length!==asset.bytes||sha256(bytes)!==asset.sha256))return reject(409);
      const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',glb:'model/gltf-binary',gltf:'model/gltf+json',bin:'application/octet-stream',html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8'};
      res.writeHead(200, { 'Content-Type': mime[raw.split('.').pop()]||'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch { reject(404); }
  });
  await new Promise((ok, bad) => { server.once('error', bad); server.listen(port, '127.0.0.1', ok); });
  authority = '127.0.0.1:' + server.address().port;
  return { origin: 'http://' + authority, address: server.address(), close: () => new Promise((ok, bad) => { server.close(error => error ? bad(error) : ok()); server.closeAllConnections(); }) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const arg = process.argv.slice(2);
  if (arg.length > 1 || arg[0] && !/^--port=\d+$/.test(arg[0])) throw new Error('Uso: node scripts/studio-server.mjs [--port=8080]');
  const studio = await startStudioServer({ port: arg[0] ? Number(arg[0].split('=')[1]) : 8080 });
  console.log('Estúdio: ' + studio.origin + '/studio.html');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await studio.close(); process.exit(0); });
}
