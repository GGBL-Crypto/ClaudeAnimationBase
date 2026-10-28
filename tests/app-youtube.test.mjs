import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDb } from '../scripts/app/db.mjs';
import { DEFAULTS } from '../scripts/app/config.mjs';
import { createYouTube, quotaDay, estimateMine, estimateMineVideos, YouTubeError, COSTS } from '../scripts/app/youtube.mjs';

// Fixtures (tests/fixtures/youtube): canais UCfixture1/2/…a/…b em channels.json e search-channel.json; vídeos vidfixture1-3 em playlistItems.json e videos.json (canal UCfixture1); uploads = UUfixture1.
const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/youtube/${n}.json`, import.meta.url), 'utf8'));
const now = Date.parse('2026-10-27T12:00:00Z');
const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
// fetch falso: escolhe a fixture pelo método da URL e conta chamadas; guarda as URLs/cabeçalhos
function fake(pick = (m, u) => m === 'search' ? fx(u.searchParams.get('type') === 'video' ? 'search-video' : 'search-channel') : fx(m)) {
  const f = async (url, opts) => { f.calls++; f.urls.push(String(url)); f.opts.push(opts); const u = new URL(url); return pick(u.pathname.split('/').pop(), u); };
  f.calls = 0; f.urls = []; f.opts = [];
  return f;
}
const ok = (m, u) => res(200, m === 'search' ? fx(u.searchParams.get('type') === 'video' ? 'search-video' : 'search-channel') : fx(m));
const mk = (over = {}) => { const db = openDb(':memory:'); const f = over.fetch ?? fake(ok); return { db, f, yt: createYouTube({ key: 'SECRETKEY', db, cfg: DEFAULTS, fetch: f, now: () => now, ...over }) }; };

test('cache hit spends no quota and makes no request', async () => {
  const { db, f, yt } = mk();
  await yt.channels({ ids: ['UCfixture1'] }); await yt.channels({ ids: ['UCfixture1'] });
  assert.equal(f.calls, 1); assert.equal(db.quotaUsed(quotaDay(now)), 1);
});
test('cache expires after cacheHours', async () => {
  let t = now; const { f, yt } = mk({ now: () => t });
  await yt.videos(['vidfixture1']); t += 25 * 36e5; await yt.videos(['vidfixture1']);
  assert.equal(f.calls, 2);
});
test('api key never reaches cache, url or error', async () => {
  const { db, f, yt } = mk();
  await yt.searchIds('sleep', 'video');
  assert.ok(db.raw.prepare('SELECT url FROM cache').all().every(r => !r.url.includes('key=') && !r.url.includes('SECRETKEY')));
  assert.ok(f.urls.every(u => !u.includes('SECRETKEY'))); assert.equal(f.opts[0].headers['x-goog-api-key'], 'SECRETKEY');
  const q = mk({ fetch: fake(() => res(403, fx('quota-exceeded'))) });
  await assert.rejects(q.yt.searchIds('x', 'video'), e => !JSON.stringify([e.message, e.reason, e.status]).includes('SECRETKEY'));
});
test('quotaExceeded raises a readable error and logs the cost', async () => {
  const { db, yt } = mk({ fetch: fake(() => res(403, fx('quota-exceeded'))) });
  await assert.rejects(yt.searchIds('x', 'video'), e => e instanceof YouTubeError && e.reason === 'quotaExceeded' && e.status === 403 && e.message === 'Cota do YouTube esgotada hoje');
  assert.equal(db.quotaUsed(quotaDay(now)), 100);
  assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM cache').get().n, 0); // erro não vai para o cache
});
test('keyInvalid and unknown errors map to readable messages', async () => {
  const bad = (reason, message) => res(400, { error: { code: 400, message, errors: [{ reason }] } });
  await assert.rejects(mk({ fetch: fake(() => bad('keyInvalid', 'API key not valid')) }).yt.videos(['a']), e => e.reason === 'keyInvalid' && e.message === 'Chave da API inválida');
  await assert.rejects(mk({ fetch: fake(() => res(404, { error: { code: 404, message: 'playlist gone', errors: [{ reason: 'playlistNotFound' }] } })) }).yt.uploads('UUx'), e => e.reason === 'playlistNotFound' && e.status === 404 && e.message === 'playlist gone');
  await assert.rejects(mk({ fetch: fake(() => res(500, {})) }).yt.videos(['a']), e => e instanceof YouTubeError && e.status === 500);
});
test('missing key fails before fetch', async () => {
  const f = fake(ok);
  await assert.rejects(createYouTube({ key: '', db: openDb(':memory:'), cfg: DEFAULTS, fetch: f }).videos(['a']), /Configure a chave/);
  assert.equal(f.calls, 0);
});
test('searchIds returns unique channel ids for both types', async () => {
  const { db, yt } = mk();
  assert.deepEqual(await yt.searchIds('sleep', 'video'), ['UCfixture1', 'UCfixture2']);
  assert.deepEqual(await yt.searchIds('sleep', 'channel'), ['UCfixture1', 'UCfixture00000000000000a', 'UCfixture00000000000000b']);
  assert.equal(db.quotaUsed(quotaDay(now)), 2 * COSTS.search);
});
test('channels batches ids by 50 and supports forHandle', async () => {
  const { db, f, yt } = mk();
  const ids = Array.from({ length: 120 }, (_, i) => 'UCx' + i);
  await yt.channels({ ids }); assert.equal(f.calls, 3); assert.equal(db.quotaUsed(quotaDay(now)), 3);
  assert.match(f.urls[0], /part=snippet%2Cstatistics%2CcontentDetails%2CtopicDetails/);
  const r = await yt.channels({ forHandle: '@fixtureone' }); assert.match(f.urls[3], /forHandle=%40fixtureone/); assert.equal(r[0].id, 'UCfixture1');
  assert.deepEqual(await yt.channels({ ids: [] }), []);
});
test('uploads returns video ids and follows pages up to max', async () => {
  const { yt } = mk();
  assert.deepEqual(await yt.uploads('UUfixture1'), ['vidfixture1', 'vidfixture2', 'vidfixture3']);
  const page = (ids, next) => res(200, { items: ids.map(videoId => ({ contentDetails: { videoId } })), ...(next && { nextPageToken: next }) });
  const f = fake((m, u) => u.searchParams.get('pageToken') ? page(['c', 'd']) : page(['a', 'b'], 'T2'));
  const p = mk({ fetch: f }).yt;
  assert.deepEqual(await p.uploads('UUp', 3), ['a', 'b', 'c']); assert.equal(f.calls, 2);
});
test('videos batches by 50', async () => {
  const { f, yt } = mk();
  const r = await yt.videos(Array.from({ length: 51 }, (_, i) => 'v' + i));
  assert.equal(f.calls, 2); assert.equal(r.length, 6);
  assert.deepEqual(await yt.videos([]), []);
});
test('quotaDay uses Pacific time', () => { assert.equal(quotaDay(Date.parse('2026-10-27T05:00:00Z')), '2026-10-26'); assert.equal(quotaDay(Date.parse('2026-10-27T07:30:00Z')), '2026-10-27'); });
test('estimateMine', () => { assert.equal(estimateMine(50), 301); assert.equal(estimateMine(1), 203); });
test('fresh skips cache reads but still writes cache and logs quota', async () => {
  const { db, f, yt } = mk();
  await yt.videos(['vidfixture1']);
  const y2 = createYouTube({ key: 'K', db, cfg: DEFAULTS, fetch: f, now: () => now, fresh: true });
  await y2.videos(['vidfixture1']);
  assert.equal(f.calls, 2); assert.equal(db.quotaUsed(quotaDay(now)), 2);
  await yt.videos(['vidfixture1']); assert.equal(f.calls, 2); // cache segue gravado
});
test('real invalid-key shape maps to keyInvalid and is not charged', async () => {
  const body = { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', errors: [{ reason: 'badRequest' }], details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }] } };
  const { db, yt } = mk({ fetch: fake(() => res(400, body)) });
  await assert.rejects(yt.searchIds('x', 'video'), e => e.reason === 'keyInvalid' && e.message === 'Chave da API inválida');
  assert.equal(db.quotaUsed(quotaDay(now)), 0);
});
test('searchVideos sends filters and shares cache with searchIds when unfiltered', async () => {
  const { f, yt } = mk();
  await yt.searchIds('sleep', 'video'); assert.deepEqual(await yt.searchVideos('sleep'), [{ id: 'vidfixture1', channelId: 'UCfixture1' }, { id: 'vidfixture2', channelId: 'UCfixture2' }, { id: 'vidfixture3', channelId: 'UCfixture1' }]);
  assert.equal(f.calls, 1);
  await yt.searchVideos('sleep', { publishedAfter: '2026-10-01T00:00:00Z', videoDuration: 'long', relevanceLanguage: 'pt' });
  const u = new URL(f.urls.at(-1)); assert.equal(u.searchParams.get('videoDuration'), 'long'); assert.equal(u.searchParams.get('publishedAfter'), '2026-10-01T00:00:00Z'); assert.equal(u.searchParams.get('relevanceLanguage'), 'pt');
});
test('estimateMineVideos', () => { assert.equal(estimateMineVideos(50), 202); });
