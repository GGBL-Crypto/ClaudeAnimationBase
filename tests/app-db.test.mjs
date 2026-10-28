import test from 'node:test';
import assert from 'node:assert/strict';
import {openDb} from '../scripts/app/db.mjs';
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
