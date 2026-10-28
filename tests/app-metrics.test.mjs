import test from 'node:test';
import assert from 'node:assert/strict';
import {isoDuration,disparity,views30d,scoreParts,score,outlierMultiple,videoRow,revenue,channelRow,avgViews,frequency,ageDays} from '../scripts/app/metrics.mjs';
import {DEFAULTS} from '../scripts/app/config.mjs';
const now=Date.parse('2026-10-27T12:00:00Z');
test('isoDuration',()=>{assert.equal(isoDuration('PT1H2M3S'),3723);assert.equal(isoDuration('P1DT1S'),86401);assert.equal(isoDuration('x'),0);});
test('disparity is null for hidden or zero subs',()=>{assert.equal(disparity(500,null),null);assert.equal(disparity(500,0),null);assert.equal(disparity(null,10),null);assert.equal(disparity(500,1000),.5);});
test('views30d prefers snapshots 30+ days apart, else sums recent videos',()=>{
 const vids=[{publishedAt:'2026-10-20T00:00:00Z',views:100},{publishedAt:'2026-08-01T00:00:00Z',views:900}];
 assert.deepEqual(views30d([{at:'2026-10-26T00:00:00Z',views:5000}],vids,now),{value:100,source:'videos'});
 assert.deepEqual(views30d([{at:'2026-09-20T00:00:00Z',views:4000},{at:'2026-10-26T00:00:00Z',views:5000}],vids,now),{value:1000,source:'snapshots'});
 assert.deepEqual(views30d([],[],now),{value:null,source:null});
});
test('score of a hidden-subs channel is finite',()=>{
 const p=scoreParts({disparity:null,ageDays:30,videoCount:10,daysSinceLast:2});
 assert.deepEqual(p,{disparidade:0,novo:1,enxuto:1,ativo:1});
 assert.equal(score(p,{disparidade:40,novo:20,enxuto:20,ativo:20}),60);
});
test('scoreParts decay',()=>{
 const p=scoreParts({disparity:3,ageDays:90+275/2,videoCount:30+35,daysSinceLast:7+23/2});
 assert.deepEqual(p,{disparidade:1,novo:.5,enxuto:.5,ativo:.5});
 assert.deepEqual(scoreParts({disparity:.2,ageDays:999,videoCount:999,daysSinceLast:null}),{disparidade:.2,novo:0,enxuto:0,ativo:0});
});
test('outlier multiple and nota',()=>{
 const vids=[{views:100},{views:200},{views:300}];
 assert.equal(outlierMultiple(600,vids),3);assert.equal(outlierMultiple(5,[{views:0}]),null);assert.equal(outlierMultiple(5,[]),null);
 assert.equal(videoRow({views:400,publishedAt:'2026-10-23T12:00:00Z',duration:'PT10M'},vids,now).nota,100);
 const r=videoRow({views:400,publishedAt:'2026-10-23T12:00:00Z',duration:'PT10M'},vids,now);
 assert.equal(r.durationS,600);assert.equal(r.viewsPerDay,100);assert.equal(r.multiple,2);
});
test('revenue needs rpm for tag and language',()=>{
 assert.equal(revenue(100000,'historia','en',{}),null);assert.equal(revenue(null,'historia','en',{'historia|en':[2,5]}),null);
 assert.deepEqual(revenue(100000,'historia','en',{'historia|en':[2,5]}),[200,500]);
});
test('avgViews, frequency, ageDays',()=>{
 assert.equal(avgViews([]),null);assert.equal(avgViews([{views:10},{views:20},{views:90}],2),15);
 assert.equal(frequency([{publishedAt:'2026-10-20T00:00:00Z'},{publishedAt:'2026-01-01T00:00:00Z'}],now),.08);
 assert.equal(ageDays('2026-10-01T00:00:00Z',now),26);
});
test('channelRow with no videos has null metrics and no NaN',()=>{
 const r=channelRow({id:'UC1',title:'t',createdAt:'2026-10-01T00:00:00Z',hiddenSubs:0},[{at:'2026-10-26T00:00:00Z',subs:10,views:0,videos:0}],[],now,DEFAULTS);
 assert.equal(r.avgViews,null);assert.equal(r.lastPublished,null);assert.ok(!JSON.stringify(r).includes('NaN'));
});
test('channelRow hidden subs and full data',()=>{
 const vids=[1,2,3,4].map(i=>({id:'v'+i,thumb:'t'+i,views:i*100,publishedAt:`2026-10-${20+i}T00:00:00Z`}));vids.reverse();
 const r=channelRow({id:'UC2',title:'t',createdAt:'2026-10-01T00:00:00Z',hiddenSubs:1,tag:'historia',lang:'en'},[{at:'2026-10-26T00:00:00Z',subs:999,views:1000,videos:4}],vids,now,{...DEFAULTS,rpm:{'historia|en':[1,2]}});
 assert.equal(r.subs,null);assert.equal(r.disparity,null);assert.equal(r.scoreParts.disparidade,0);
 assert.equal(r.updatedAt,'2026-10-26T00:00:00Z');assert.equal(r.avgViews,250);assert.equal(r.views30dSource,'videos');
 assert.deepEqual(r.topThumbs.map(t=>t.id),['v4','v3','v2']);assert.equal(r.lastPublished,vids[0].publishedAt);assert.equal(r.daysSinceLast,3);
 assert.deepEqual(r.revenue,[1,2]);assert.ok(Number.isFinite(r.score));assert.ok(!JSON.stringify(r).includes('NaN'));
});
