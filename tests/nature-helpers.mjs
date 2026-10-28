import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { catalog } from '../scripts/render-lib.mjs';

// Contexto vm com motion.js e os arquivos pedidos (mesmo padrão dos testes de episódio).
export function natureContext(files = []) {
  const ctx = vm.createContext({ projectConfig: catalog().resolveProject('smoke-2d', 'cartoon'), window: {} });
  for (const file of ['src/motion.js', ...files]) vm.runInContext(readFileSync(file, 'utf8'), ctx, { filename: file });
  return ctx;
}
