import test from 'node:test';
import assert from 'node:assert/strict';
import {openDb,FAV} from '../scripts/app/db.mjs';
import {DEFAULTS} from '../scripts/app/config.mjs';
const now=Date.parse('2026-10-27T12:00:00Z');
test('snapshots accumulate and channelRows computes metrics',()=>{
 const db=openDb(':memory:');
 db.upsertChannel({id:'UC1',title:'A',createdAt:'2026-09-01T00:00:00Z',hiddenSubs:0});
 db.addChannelSnapshot('UC1','2026-10-26T00:00:00Z',{subs:100,views:1000,videos:2});
 db.upsertVideo({id:'v1',channelId:'UC1',title:'<img src=x onerror=alert(1)>',publishedAt:'2026-10-20T00:00:00Z',duration:'PT5M'});
 db.addVideoSnapshot('v1','2026-10-26T00:00:00Z',{views:500});
 const [r]=db.channelRows(now,DEFAULTS);
 assert.equal(r.subs,100);assert.equal(r.avgViews,500);assert.equal(r.views30dSource,'videos');
 assert.equal(db.videoRows('UC1',now)[0].title,'<img src=x onerror=alert(1)>');
 assert.equal(db.channel('UC1',now,DEFAULTS).snapshots.length,1);assert.equal(db.channel('nope',now,DEFAULTS),null);
});
test('channelVideos: newest first, views from latest snapshot',()=>{
 const db=openDb(':memory:');db.upsertChannel({id:'UC1',title:'A'});
 db.upsertVideo({id:'old',channelId:'UC1',publishedAt:'2026-01-01T00:00:00Z'});db.upsertVideo({id:'new',channelId:'UC1',publishedAt:'2026-10-01T00:00:00Z',tags:['x']});
 db.addVideoSnapshot('new','2026-10-10T00:00:00Z',{views:1});db.addVideoSnapshot('new','2026-10-20T00:00:00Z',{views:9});
 const v=db.channelVideos('UC1');assert.deepEqual(v.map(x=>x.id),['new','old']);assert.equal(v[0].views,9);assert.deepEqual(v[0].tags,['x']);
});
test('upsertChannel keeps manual tag',()=>{
 const db=openDb(':memory:');db.upsertChannel({id:'UC1',title:'A'});db.setChannelTag('UC1',{tag:'historia',faceless:true});
 db.upsertChannel({id:'UC1',title:'A2'});const c=db.channel('UC1',now,DEFAULTS);assert.equal(c.tag,'historia');assert.equal(c.faceless,true);assert.equal(c.title,'A2');
});
test('hidden subs snapshot keeps null subs',()=>{
 const db=openDb(':memory:');db.upsertChannel({id:'UC1',title:'A',hiddenSubs:1});
 db.addChannelSnapshot('UC1','2026-10-26T00:00:00Z',{subs:null,views:5,videos:0});
 assert.equal(db.channelSnapshots('UC1')[0].subs,null);assert.equal(db.channelRows(now,DEFAULTS)[0].subs,null);
});
test('quota and cache',()=>{
 const db=openDb(':memory:');db.logQuota('2026-10-27',100,'search');db.logQuota('2026-10-27',1,'channels');
 assert.equal(db.quotaUsed('2026-10-27'),101);assert.equal(db.quotaUsed('2026-10-26'),0);
 db.cacheSet('u','{"a":1}',now+1000);assert.equal(db.cacheGet('u',now),'{"a":1}');assert.equal(db.cacheGet('u',now+2000),null);assert.equal(db.cacheGet('x',now),null);
});
test('history, jobs and raw',()=>{
 const db=openDb(':memory:');db.addHistory('mine',{n:1});
 db.saveJob({id:'j1',kind:'mine',status:'running',createdAt:'a'});db.saveJob({id:'j1',kind:'mine',status:'error',createdAt:'a',finishedAt:'b',error:'x'});
 assert.equal(db.raw.prepare('select count(*) n from jobs').get().n,1);assert.equal(db.raw.prepare('select status from jobs').get().status,'error');
 assert.equal(JSON.parse(db.raw.prepare('select payload from history').get().payload).n,1);
 assert.equal(db.raw.prepare('pragma foreign_keys').get().foreign_keys,1);db.close();
});
test('videos.channel_id is indexed',()=>{
 const db=openDb(':memory:');
 assert.ok(db.raw.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND tbl_name='videos' AND sql LIKE '%channel_id%'").get());
});
const seed=db=>{
 db.upsertChannel({id:'UC1',title:'Hist',createdAt:'2026-09-01T00:00:00Z',hiddenSubs:0,topics:['https://en.wikipedia.org/wiki/History']});
 for(const[id,views,d]of[['v1',100,'2026-10-20'],['v2',900,'2026-10-21'],['v3',200,'2026-10-22']]){
  db.upsertVideo({id,channelId:'UC1',title:'Roma '+id,publishedAt:d+'T00:00:00Z',duration:'PT5M'});db.addVideoSnapshot(id,'2026-10-26T00:00:00Z',{views});
 }
};
test('videoRowsAll and video carry channel fields and the multiple',()=>{
 const db=openDb(':memory:');seed(db);
 const rows=db.videoRowsAll(now);assert.equal(rows.length,3);assert.equal(rows[0].channelTitle,'Hist');assert.equal(rows[0].capturedAt,'2026-10-26T00:00:00Z');
 assert.equal(db.video('v2',now).multiple,4.5);assert.equal(db.video('nope',now),null);
 assert.deepEqual(db.channelTexts(),[{id:'UC1',title:'Hist',topics:['https://en.wikipedia.org/wiki/History'],titles:['Roma v3','Roma v2','Roma v1']}]);
});
test('favorites exist and are fixed; names are unique without case',()=>{
 const db=openDb(':memory:');
 assert.deepEqual(db.collections(),[{id:1,name:'Favoritos',fixed:true,count:0}]);
 const id=db.createCollection('Roma');assert.equal(db.createCollection('roma'),null);
 assert.equal(db.renameCollection(FAV,'x'),false);assert.equal(db.deleteCollection(FAV),false);
 assert.equal(db.renameCollection(id,'Favoritos'),false);assert.equal(db.renameCollection(id,'Grécia'),true);
 assert.deepEqual(db.collection(id),{id,name:'Grécia',fixed:false});assert.equal(db.collection(99),null);
 assert.equal(db.renameCollection(99,'z'),false);assert.equal(db.deleteCollection(99),false);
});
test('items keep notes, cascade on delete and report memberships',()=>{
 const db=openDb(':memory:');seed(db);const id=db.createCollection('Roma');
 db.addItem(id,'video','v1','ver depois');db.addItem(id,'video','v1');db.addItem(FAV,'video','v1');
 assert.equal(db.collectionItems(id)[0].note,'ver depois');assert.deepEqual(db.memberships('video','v1'),[1,id]);
 assert.equal(db.collections().find(c=>c.id===id).count,1);
 assert.throws(()=>db.addItem(id,'playlist','x'));
 db.deleteCollection(id);assert.deepEqual(db.memberships('video','v1'),[1]);
 db.removeItem(FAV,'video','v1');assert.deepEqual(db.collectionItems(FAV),[]);
});
test('history newest first and jobs list without result',()=>{
 const db=openDb(':memory:');assert.equal(db.lastHistory(),null);db.addHistory('mine',{q:'a'});db.addHistory('open',{id:'UC1'});
 assert.deepEqual(db.history().map(e=>e.kind),['open','mine']);assert.deepEqual(db.lastHistory().payload,{id:'UC1'});
 db.saveJob({id:'j1',kind:'mine',status:'done',createdAt:'2026-10-27T00:00:00Z',result:{big:1}});
 assert.deepEqual(db.jobsList(),[{id:'j1',kind:'mine',status:'done',createdAt:'2026-10-27T00:00:00Z',finishedAt:null,error:null}]);
});

test('watch defaults, partial updates and list', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  assert.deepEqual(db.watch('UC1'), { monitor: false, competitor: false, since: null, lastRun: null });
  db.setWatch('UC1', { monitor: true }); db.setWatch('UC1', { competitor: true });
  const w = db.watch('UC1'); assert.equal(w.monitor, true); assert.equal(w.competitor, true); assert.ok(w.since);
  db.setWatch('UC1', { monitor: false }); assert.deepEqual(db.watchList().map(x => [x.channelId, x.monitor, x.competitor]), [['UC1', false, true]]);
  db.setWatchRun('UC1', '2026-10-28T10:00:00Z'); assert.equal(db.watch('UC1').lastRun, '2026-10-28T10:00:00Z');
});
test('alerts are unique per kind and ref, and can be marked seen', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: '<img src=x onerror=alert(1)>' });
  const a = { at: '2026-10-28T10:00:00Z', kind: 'newVideo', ref: 'vid00000001', channelId: 'UC1', videoId: 'vid00000001', payload: { title: 't' } };
  assert.equal(db.addAlerts([a, a]), 1); assert.equal(db.addAlerts([a]), 0);
  assert.equal(db.unseenAlerts(), 1); assert.equal(db.alerts()[0].channelTitle, '<img src=x onerror=alert(1)>');
  db.markAlertsSeen('all'); assert.equal(db.unseenAlerts(), 0);
});
test('lastHistoryOf', () => { const db = openDb(':memory:'); db.addHistory('monitor', { status: 'done' }); db.addHistory('mine', {}); assert.equal(db.lastHistoryOf('monitor').payload.status, 'done'); assert.equal(db.lastHistoryOf('x'), null); });
test('alerts order newest first, payload round-trips, mark seen by ids', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  db.addAlerts([{ at: '2026-10-28T10:00:00Z', kind: 'outlier', ref: 'v1', channelId: 'UC1', videoId: 'v1', payload: { m: 3 } }, { at: '2026-10-28T11:00:00Z', kind: 'subsJump', ref: 'UC1@x', channelId: 'UC1' }]);
  const l = db.alerts(); assert.deepEqual(l.map(x => x.kind), ['subsJump', 'outlier']); assert.deepEqual(l[1].payload, { m: 3 }); assert.equal(l[0].seen, false); assert.equal(l[0].videoId, null);
  db.markAlertsSeen([l[0].id]); assert.equal(db.unseenAlerts(), 1); assert.equal(db.alerts().find(x => x.id === l[0].id).seen, true);
  db.markAlertsSeen([]); assert.equal(db.unseenAlerts(), 1);
});
test('lastHistoryOf filters by payload status', () => {
  const db = openDb(':memory:'); db.addHistory('monitor', { status: 'done', n: 1 }); db.addHistory('monitor', { status: 'error' });
  assert.equal(db.lastHistoryOf('monitor').payload.status, 'error'); assert.equal(db.lastHistoryOf('monitor', ['done', 'skipped']).payload.n, 1);
  assert.equal(db.lastHistoryOf('monitor', ['skipped']), null); assert.equal(db.lastHistoryOf('mine', ['done']), null);
});
