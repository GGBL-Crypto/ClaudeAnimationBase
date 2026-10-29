import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { thumbUrl, fetchThumbs } from '../scripts/app/thumbs.mjs';

test('thumbUrl only for valid video ids', () => {
  assert.equal(thumbUrl('abcdefghijk'), 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg');
  assert.equal(thumbUrl('../../etc/x'), null); assert.equal(thumbUrl('abc'), null); assert.equal(thumbUrl(42), null);
});
test('fetchThumbs keeps jpeg under 200 KB, skips html and big files, caches', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'thumbs-'));
  try {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]);
    const fake = async url => url.includes('good0000001') ? new Response(jpg, { headers: { 'content-type': 'image/jpeg' } })
      : url.includes('html0000001') ? new Response('<html>', { headers: { 'content-type': 'text/html' } })
      : new Response(Buffer.alloc(200001), { headers: { 'content-type': 'image/jpeg' } });
    const got = await fetchThumbs(['good0000001', 'html0000001', 'big00000001', 'bad id'], dir, { fetch: fake });
    assert.deepEqual(got.map(g => g.id), ['good0000001']); assert.equal(got[0].base64, jpg.toString('base64')); assert.equal(got[0].mediaType, 'image/jpeg');
    assert.deepEqual(readdirSync(dir), ['good0000001.jpg']);
    const again = await fetchThumbs(['good0000001'], dir, { fetch: () => { throw new Error('no network'); } }); assert.equal(again.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('fetchThumbs rejects a big content-length, swallows errors and stops at max', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'thumbs-'));
  try {
    const jpg = Buffer.from([0xff, 0xd8, 0xff]);
    const urls = [];
    const fake = async url => { urls.push(url); if (url.includes('boom0000001')) throw new Error('rede'); return url.includes('len00000001') ? new Response(jpg, { headers: { 'content-type': 'image/jpeg', 'content-length': '999999' } }) : new Response(jpg, { headers: { 'content-type': 'image/jpeg' } }); };
    const got = await fetchThumbs(['boom0000001', 'len00000001', 'ok000000001', 'ok000000002', 'ok000000003'], dir, { fetch: fake, max: 2 });
    assert.deepEqual(got.map(g => g.id), ['ok000000001', 'ok000000002']);
    assert.ok(!urls.some(u => u.includes('ok000000003')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('fetchThumbs uses timeout signal, no redirects, and rejects empty or non-jpeg bodies', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'thumbs-'));
  try {
    const opts = [];
    const fake = async (url, o) => { opts.push(o); return new Response(url.includes('empty000001') ? Buffer.alloc(0) : Buffer.from('<html>nope'), { headers: { 'content-type': 'image/jpeg' } }); };
    const got = await fetchThumbs(['empty000001', 'fake0000001'], dir, { fetch: fake });
    assert.deepEqual(got, []); assert.deepEqual(readdirSync(dir), []);
    assert.equal(opts.length, 2); for (const o of opts) { assert.equal(o.redirect, 'error'); assert.ok(o.signal instanceof AbortSignal); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('fetchThumbs ignores a bad cached file and re-downloads', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'thumbs-'));
  try {
    writeFileSync(path.join(dir, 'bad00000001.jpg'), 'not a jpeg');
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 9]);
    const got = await fetchThumbs(['bad00000001'], dir, { fetch: async () => new Response(jpg, { headers: { 'content-type': 'image/jpeg' } }) });
    assert.equal(got[0].base64, jpg.toString('base64')); assert.deepEqual(readFileSync(path.join(dir, 'bad00000001.jpg')), jpg);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
