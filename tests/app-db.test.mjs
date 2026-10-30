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

test('models round-trip and list by anchor', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  const id = db.addModel({ anchorId: 'UC1', input: { videoIds: ['v1'] }, output: { conceitos: [{ nome: 'X' }, { nome: 'Y' }, { nome: 'Z' }] } });
  assert.deepEqual(db.model(id).input, { videoIds: ['v1'] }); assert.deepEqual(db.modelsOf('UC1')[0].names, ['X', 'Y', 'Z']);
});
test('models: newest first, missing id is null', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  const a = db.addModel({ anchorId: 'UC1', input: {}, output: { conceitos: [{ nome: 'old' }] } }), b = db.addModel({ anchorId: 'UC1', input: {}, output: { conceitos: [{ nome: 'new' }] } });
  assert.deepEqual(db.modelsOf('UC1').map(m => m.id), [b, a]); assert.equal(db.model(99), null); assert.deepEqual(db.modelsOf('nope'), []);
  assert.equal(db.model(a).anchorId, 'UC1'); assert.ok(db.model(a).createdAt);
});
test('my channels: unique name, update, competitors mark watch', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  const p = { name: 'Canal', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3, titleTemplates: ['[x] y'], format: 'long-16:9' };
  const id = db.createMyChannel(p); assert.equal(db.createMyChannel({ ...p, name: 'canal' }), null);
  assert.equal(db.updateMyChannel(id, { ...p, targetMin: 45 }), true); assert.equal(db.myChannel(id).targetMin, 45);
  db.setMyCompetitors(id, ['UC1']); assert.deepEqual(db.myChannel(id).competitors, ['UC1']); assert.equal(db.watch('UC1').competitor, true);
  assert.equal(db.myChannels()[0].competitorCount, 1); assert.equal(db.deleteMyChannel(id), true); assert.equal(db.myChannel(id), null);
});
test('my channels: update conflicts, list order, competitors replace', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' }); db.upsertChannel({ id: 'UC2', title: 'B' });
  const p = { lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3, format: 'long-16:9' };
  const b = db.createMyChannel({ ...p, name: 'b' }), a = db.createMyChannel({ ...p, name: 'a', titleTemplates: ['[x]'], descriptionTemplate: 'd {fontes}', anchorId: 'UC1', conceptIndex: 0 });
  assert.deepEqual(db.myChannels().map(c => c.name), ['a', 'b']);
  assert.equal(db.updateMyChannel(a, { ...p, name: 'B' }), false); assert.equal(db.updateMyChannel(999, { ...p, name: 'z' }), false); assert.equal(db.deleteMyChannel(999), false);
  const m = db.myChannel(a); assert.deepEqual(m.titleTemplates, ['[x]']); assert.equal(m.descriptionTemplate, 'd {fontes}'); assert.equal(m.anchorId, 'UC1'); assert.equal(m.conceptIndex, 0); assert.equal(m.modelId, null); assert.deepEqual(m.competitors, []);
  db.setMyCompetitors(a, ['UC1', 'UC2']); db.setMyCompetitors(a, ['UC2']); db.setMyCompetitors(b, ['UC2']);
  assert.deepEqual(db.myCompetitorIds(a), ['UC2']); assert.equal(db.myChannels()[0].competitorCount, 1); assert.equal(db.watch('UC1').competitor, true);
  db.deleteMyChannel(a); assert.deepEqual(db.myCompetitorIds(a), []); assert.deepEqual(db.myCompetitorIds(b), ['UC2']);
});
test('setWatch competitor:false unlinks my channels; other changes keep the link', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  const id = db.createMyChannel({ name: 'c', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3, format: 'long-16:9' });
  db.setMyCompetitors(id, ['UC1']);
  db.setWatch('UC1', { monitor: true }); db.setWatch('UC1', {}); assert.deepEqual(db.myCompetitorIds(id), ['UC1']);
  db.setWatch('UC1', { competitor: false });
  assert.deepEqual(db.myChannel(id).competitors, []); assert.deepEqual(db.myCompetitorIds(id), []); assert.equal(db.watch('UC1').competitor, false); assert.equal(db.watch('UC1').monitor, true);
});
test('my channel keeps model link and clears it when the model goes', () => {
  const db = openDb(':memory:'); db.upsertChannel({ id: 'UC1', title: 'A' });
  const mid = db.addModel({ anchorId: 'UC1', input: {}, output: { conceitos: [] } });
  const id = db.createMyChannel({ name: 'c', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3, format: 'long-16:9', modelId: mid });
  assert.equal(db.myChannel(id).modelId, mid); db.raw.exec('DELETE FROM models'); assert.equal(db.myChannel(id).modelId, null);
});
test('voiceWpm default is empty', () => { assert.deepEqual(DEFAULTS.voiceWpm, {}); });
// Fase 6: produções, etapas e análises de roteiro.
test('productions: steps default pending, setStep merges, list without result, newest first', () => {
  const db = openDb(':memory:'), my = db.createMyChannel({ name: 'c', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3 });
  const a = db.createProduction({ myId: my, theme: 'Roma', targetMin: 30, toleranceMin: 3, style: 'flat' }), b = db.createProduction({ myId: my, theme: null, targetMin: 20, toleranceMin: 2, style: 'pixel' });
  const p = db.production(a); assert.deepEqual([p.id, p.myId, p.theme, p.targetMin, p.toleranceMin, p.style], [a, my, 'Roma', 30, 3, 'flat']);
  assert.equal(Object.keys(p.steps).length, 9); assert.deepEqual(p.steps.pauta, { status: 'pending', startedAt: null, finishedAt: null, ms: null, result: null, error: null });
  db.setStep(a, 'fontes', { status: 'done', ms: 12, result: { n: [1, 2] } }); db.setStep(a, 'fontes', { error: 'x' });
  assert.deepEqual(db.production(a).steps.fontes, { status: 'done', startedAt: null, finishedAt: null, ms: 12, result: { n: [1, 2] }, error: 'x' });
  db.updateProduction(b, { theme: 'Grécia', targetMin: 25, toleranceMin: 4, style: 'flat' }); assert.equal(db.production(b).theme, 'Grécia');
  const l = db.productions(); assert.deepEqual(l.map(x => x.id), [b, a]); assert.ok(!('result' in l[1].steps.fontes)); assert.equal(l[1].steps.fontes.ms, 12);
  assert.deepEqual(db.productions({ myId: my + 1 }), []); assert.equal(db.production(999), null);
  assert.equal(db.deleteProduction(a), true); assert.equal(db.production(a), null);
  assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM production_steps WHERE prod_id=?').get(a).n, 0);
});
test('deleting a my channel cascades productions', () => {
  const db = openDb(':memory:'), my = db.createMyChannel({ name: 'c', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3 });
  const id = db.createProduction({ myId: my, theme: 'Roma', targetMin: 30, toleranceMin: 3, style: 'flat' }); db.setStep(id, 'pauta', { status: 'done' });
  db.deleteMyChannel(my);
  assert.equal(db.production(id), null); assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM production_steps').get().n, 0);
  assert.throws(() => db.createProduction({ myId: 999, theme: 'x', targetMin: 30, toleranceMin: 3, style: 'flat' })); // FK
});
test('interruptRunning turns running steps into errors', () => {
  const db = openDb(':memory:'), my = db.createMyChannel({ name: 'c', lang: 'pt', style: 'flat', voice: 'kokoro:pm_alex', speed: 1, targetMin: 30, toleranceMin: 3 });
  const id = db.createProduction({ myId: my, theme: 'Roma', targetMin: 30, toleranceMin: 3, style: 'flat' });
  db.setStep(id, 'render', { status: 'running', startedAt: '2026-10-30T10:00:00Z' }); db.setStep(id, 'cenas', { status: 'done' });
  assert.equal(db.interruptRunning(), 1);
  const s = db.production(id).steps; assert.deepEqual([s.render.status, s.render.error, s.cenas.status], ['error', 'Interrompida (servidor reiniciado)', 'done']);
  assert.equal(db.interruptRunning(), 0);
});
test('script analyses are saved per video', () => {
  const db = openDb(':memory:');
  assert.equal(db.scriptAnalysis('abcdefghijk'), null);
  db.saveScriptAnalysis('abcdefghijk', { lang: 'pt', output: { gancho: 'g' } }); db.saveScriptAnalysis('abcdefghijk', { lang: 'en', output: { gancho: 'h' } });
  const a = db.scriptAnalysis('abcdefghijk'); assert.deepEqual([a.videoId, a.lang, a.output], ['abcdefghijk', 'en', { gancho: 'h' }]); assert.ok(a.at);
});
