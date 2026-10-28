import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDb } from '../scripts/app/db.mjs';
import { DEFAULTS } from '../scripts/app/config.mjs';
import { createYouTube } from '../scripts/app/youtube.mjs';
import { parseChannelInput, ingestChannels, mineKeyword, importChannels, refreshChannel } from '../scripts/app/mine.mjs';

// Fixtures (tests/fixtures/youtube): canais UCfixture1/2/…a/…b; vídeos vidfixture1-3 só em UUfixture1 (canal UCfixture1).
const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/youtube/${n}.json`, import.meta.url), 'utf8'));
const now = Date.parse('2026-10-27T12:00:00Z'), at = '2026-10-27T12:00:00Z';
const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
const report = () => {};
// fetch falso que filtra por id/handle/playlist. gone = playlists 404; quota = playlists que dão 403; edit = muda a fixture
function fake({ gone = [], quota = [], edit = {} } = {}) {
  const f = async url => {
    const u = new URL(url), m = u.pathname.split('/').pop(), p = k => u.searchParams.get(k);
    (f.calls[m] ??= []).push(p('playlistId') ?? p('id') ?? p('q'));
    if (m === 'search') return res(200, fx(p('type') === 'video' ? 'search-video' : 'search-channel'));
    if (m === 'channels') {
      const all = fx('channels').items;
      const items = p('id') ? all.filter(c => p('id').split(',').includes(c.id)) : all.filter(c => p('forHandle') ? c.snippet.customUrl === '@' + p('forHandle').replace('@', '') : false);
      return res(200, { items: items.map(c => edit.channel?.(c) ?? c) });
    }
    if (m === 'playlistItems') {
      const id = p('playlistId');
      if (quota.includes(id)) return res(403, fx('quota-exceeded'));
      if (gone.includes(id)) return res(404, fx('playlist-not-found'));
      return res(200, id === 'UUfixture1' ? fx('playlistItems') : { items: [] });
    }
    const ids = p('id').split(',');
    return res(200, { items: fx('videos').items.filter(v => ids.includes(v.id)).map(v => edit.video?.(v) ?? v) });
  };
  f.calls = {};
  return f;
}
const mk = opts => { const db = openDb(':memory:'), f = fake(opts); return { db, f, yt: createYouTube({ key: 'K', db, cfg: DEFAULTS, fetch: f, now: () => now }) }; };

test('parseChannelInput accepts urls, handles and ids', () => {
  const r = parseChannelInput('https://www.youtube.com/@sleepfacts\nUCfixture00000000000000a, @hist\nhttps://youtube.com/channel/UCfixture00000000000000b\n/c/old\nlixo');
  assert.deepEqual(r.items, [{ handle: '@sleepfacts' }, { id: 'UCfixture00000000000000a' }, { handle: '@hist' }, { id: 'UCfixture00000000000000b' }]);
  assert.deepEqual(r.invalid, ['/c/old', 'lixo']);
});
test('parseChannelInput handles /user, duplicates, bad ids and foreign hosts', () => {
  const r = parseChannelInput('youtube.com/user/old\n@x,@x\nUCshort\nhttps://evil.com/@x\nhttps://youtube.com/c/x\nhttps://youtube.com/channel/UCshort');
  assert.deepEqual(r.items, [{ username: 'old' }, { handle: '@x' }]);
  assert.deepEqual(r.invalid, ['UCshort', 'https://evil.com/@x', 'https://youtube.com/c/x', 'https://youtube.com/channel/UCshort']);
});
test('mineKeyword stores channels, videos and snapshots', async () => {
  const { db, yt } = mk();
  await mineKeyword(yt, db, 'sleep history', report, at);
  const rows = db.channelRows(now, DEFAULTS); assert.equal(rows.length, 4); assert.ok(rows.every(r => r.updatedAt === at));
  assert.equal(db.channel('UCfixture1', now, DEFAULTS).avgViews, Math.round((30000 + 15000 + 5000) / 3));
  assert.equal(db.channelVideos('UCfixture1').length, 3);
  const h = db.raw.prepare("SELECT payload FROM history WHERE kind='mine'").all();
  assert.deepEqual(h.map(x => JSON.parse(x.payload)), [{ q: 'sleep history', found: 4 }]);
});
test('hostile title is stored as plain text', async () => {
  const { db, yt } = mk();
  await ingestChannels(yt, db, ['UCfixture1'], report, at);
  assert.ok(db.channelVideos('UCfixture1').some(v => v.title === '<img src=x onerror=alert(1)>'));
});
test('channel with missing uploads playlist is kept without videos', async () => {
  const { db, yt } = mk({ gone: ['UUfixture1'] });
  const r = await ingestChannels(yt, db, ['UCfixture1'], report, at);
  assert.deepEqual(r, { ok: ['UCfixture1'], failed: [] });
  const c = db.channel('UCfixture1', now, DEFAULTS); assert.equal(c.avgViews, null); assert.equal(c.title, 'Fixture One'); assert.equal(c.videoCount, 3);
});
test('channel without videos at all is kept with null metrics', async () => {
  const { db, yt } = mk();
  await ingestChannels(yt, db, ['UCfixture00000000000000b'], report, at);
  const c = db.channel('UCfixture00000000000000b', now, DEFAULTS); assert.equal(c.avgViews, null); assert.equal(c.disparity, null); assert.equal(c.lastPublished, null);
});
test('quota exhaustion mid-run keeps saved channels and rethrows', async () => {
  const { db, f, yt } = mk({ quota: ['UUfixture2'] });
  await assert.rejects(ingestChannels(yt, db, ['UCfixture1', 'UCfixture2', 'UCfixture00000000000000a'], report, at), /Cota do YouTube esgotada hoje/);
  assert.equal(db.channel('UCfixture1', now, DEFAULTS).avgViews, 16667);
  assert.equal(f.calls.playlistItems.length, 2); // não repete nem segue para o terceiro canal
  assert.equal(db.channel('UCfixture00000000000000a', now, DEFAULTS), null);
});
test('hidden subscribers become null', async () => {
  const { db, yt } = mk();
  await ingestChannels(yt, db, ['UCfixture2'], report, at);
  const r = db.channel('UCfixture2', now, DEFAULTS); assert.equal(r.subs, null); assert.equal(r.disparity, null);
});
test('language: defaultLanguage, else most common audio prefix, else null', async () => {
  const noLang = c => { const x = structuredClone(c); delete x.snippet.defaultLanguage; return x; };
  const audio = { vidfixture1: 'pt-BR', vidfixture2: 'pt', vidfixture3: 'en' };
  const withAudio = v => { const x = structuredClone(v); x.snippet.defaultAudioLanguage = audio[x.id]; return x; };
  const a = mk(); await ingestChannels(a.yt, a.db, ['UCfixture1'], report, at); assert.equal(a.db.channel('UCfixture1', now, DEFAULTS).lang, 'en');
  const b = mk({ edit: { channel: noLang, video: withAudio } }); await ingestChannels(b.yt, b.db, ['UCfixture1'], report, at); assert.equal(b.db.channel('UCfixture1', now, DEFAULTS).lang, 'pt');
  const c = mk(); await ingestChannels(c.yt, c.db, ['UCfixture2'], report, at); assert.equal(c.db.channel('UCfixture2', now, DEFAULTS).lang, null);
});
test('mixed paste mines the valid ones and lists the invalid ones', async () => {
  const { db, yt } = mk();
  const text = 'https://www.youtube.com/@fixturea\nhttps://youtube.com/channel/UCfixture00000000000000b, @fixtureone\nUCfixture2\n@ghost\nyoutube.com/user/olduser\n/c/old\nlixo';
  const r = await importChannels(yt, db, text, report, at);
  assert.deepEqual(r.ok.sort(), ['UCfixture00000000000000a', 'UCfixture00000000000000b', 'UCfixture1']);
  assert.deepEqual(r.failed, []);
  assert.deepEqual(r.invalid, ['UCfixture2', '/c/old', 'lixo', '@ghost', 'olduser']); // UCfixture2 não tem 22 caracteres
  assert.equal(db.channelRows(now, DEFAULTS).length, 3);
});
test('refreshChannel adds a new snapshot; unknown id fails without throwing', async () => {
  const { db, yt } = mk();
  await refreshChannel(yt, db, 'UCfixture1', report, at);
  const r2 = await refreshChannel(yt, db, 'UCfixture1', report, '2026-10-28T12:00:00Z');
  assert.deepEqual(r2.ok, ['UCfixture1']); assert.equal(db.channelSnapshots('UCfixture1').length, 2);
  const g = await refreshChannel(yt, db, 'UCghost', report, at);
  assert.deepEqual(g, { ok: [], failed: [{ id: 'UCghost', error: 'Canal não encontrado' }] });
});
test('report gets progress per channel', async () => {
  const { db, yt } = mk(); const seen = [];
  await ingestChannels(yt, db, ['UCfixture1', 'UCfixture2'], (msg, done, total) => seen.push([done, total]), at);
  assert.deepEqual(seen, [[1, 2], [2, 2]]);
});
