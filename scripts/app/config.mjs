// Configuração local do webapp: data/config.json (fora do git).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULTS = { apiKey: '', cacheHours: 24, quotaLimit: 10000, weights: { disparidade: 40, novo: 20, enxuto: 20, ativo: 20 }, rpm: {} };

export function loadConfig(dir) {
  const f = join(dir, 'config.json');
  const saved = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  return { ...structuredClone(DEFAULTS), ...saved };
}

export function saveConfig(dir, patch) {
  const cfg = { ...loadConfig(dir), ...patch };
  if (!patch.apiKey) cfg.apiKey = loadConfig(dir).apiKey; // chave vazia não apaga a existente
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(cfg, null, 2));
  return cfg;
}

export function publicConfig(cfg) {
  const { apiKey, ...rest } = cfg;
  return { ...rest, apiKeyHint: apiKey ? '…' + apiKey.slice(-4) : '' };
}
