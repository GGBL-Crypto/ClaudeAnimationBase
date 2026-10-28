import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULTS, loadConfig, saveConfig, publicConfig } from '../scripts/app/config.mjs';

const tmp = join(mkdtempSync(join(tmpdir(), 'app-cfg-')), 'data');

test('loadConfig returns defaults without file', () => { assert.deepEqual(loadConfig(tmp), DEFAULTS); });
test('saveConfig merges and keeps key when patch key is empty', () => {
  saveConfig(tmp, { apiKey: 'AIzaTESTKEY1234' }); const c = saveConfig(tmp, { apiKey: '', cacheHours: 12 });
  assert.equal(c.apiKey, 'AIzaTESTKEY1234'); assert.equal(c.cacheHours, 12); assert.equal(loadConfig(tmp).cacheHours, 12);
});
test('publicConfig never exposes the key', () => {
  const p = publicConfig({ ...DEFAULTS, apiKey: 'AIzaTESTKEY1234' });
  assert.equal(p.apiKey, undefined); assert.equal(p.apiKeyHint, '…1234'); assert.ok(!JSON.stringify(p).includes('AIzaTEST'));
});
