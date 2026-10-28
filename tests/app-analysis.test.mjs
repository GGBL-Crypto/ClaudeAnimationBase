import test from 'node:test';
import assert from 'node:assert/strict';
import { titleWords, topicName, analyzeChannel, similarChannels } from '../scripts/app/analysis.mjs';

test('titleWords drops stopwords in pt, en and es, short tokens and numbers', () => {
  assert.deepEqual(titleWords('The History of Rome: 10 Facts'), ['history', 'rome', 'facts']);
  assert.deepEqual(titleWords('A história do Império e los años'), ['historia', 'imperio', 'anos']);
});
test('topicName decodes the last wikipedia segment', () => {
  assert.equal(topicName('https://en.wikipedia.org/wiki/Lifestyle_(sociology)'), 'Lifestyle (sociology)');
  assert.equal(topicName('https://en.wikipedia.org/wiki/Hist%C3%B3ria'), 'História');
});
test('analyzeChannel', () => {
  const vids = [
    { title: 'Why Rome Fell?', durationS: 3600, publishedAt: '2026-10-25T20:00:00Z', views: 100 },
    { title: '10 Rome Facts', durationS: 600, publishedAt: '2026-10-18T20:30:00Z', views: 50 },
    { title: 'Sleep Story Rome', durationS: 120, publishedAt: '2026-10-21T08:00:00Z', views: 10 },
  ];
  const a = analyzeChannel(vids, [{ at: '2026-10-27T12:00:00Z', subs: 10, views: 160, videos: 3 }]);
  assert.equal(a.count, 3); assert.equal(a.titles.avgChars, 14); assert.equal(a.titles.avgWords, 3);
  assert.equal(a.titles.withNumber, 0.33); assert.equal(a.titles.withQuestion, 0.33); assert.deepEqual(a.titles.topWords, [{ word: 'rome', count: 3 }]);
  assert.deepEqual(a.duration, { medianS: 600, short: 1, medium: 1, long: 1 });
  assert.equal(a.publish.topWeekday, 0); assert.equal(a.publish.topHour, 20); assert.equal(a.publish.weekday[3], 1);
  assert.deepEqual(a.growth, { points: [{ at: '2026-10-27T12:00:00Z', subs: 10, views: 160 }], since: '2026-10-27T12:00:00Z', enough: false });
});
test('analyzeChannel of an empty channel has nulls and no NaN', () => {
  const a = analyzeChannel([], []);
  assert.equal(a.count, 0); assert.equal(a.titles.avgChars, null); assert.equal(a.duration.medianS, null); assert.equal(a.publish.topWeekday, null);
  assert.deepEqual(a.growth, { points: [], since: null, enough: false }); assert.ok(!/NaN|Infinity/.test(JSON.stringify(a)));
});
test('similarChannels mixes title words and topics', () => {
  const t = { id: 'A', title: 'A', topics: ['https://en.wikipedia.org/wiki/History'], titles: ['Rome history facts', 'Rome empire'] };
  const others = [t, { id: 'B', title: 'B', topics: ['https://en.wikipedia.org/wiki/History'], titles: ['Rome sleep story'] }, { id: 'C', title: 'C', topics: null, titles: ['Cooking pasta'] }];
  const r = similarChannels(t, others);
  assert.deepEqual(r, [{ id: 'B', title: 'B', score: 42, sharedWords: ['rome'], sharedTopics: ['History'] }]);
  assert.deepEqual(similarChannels(t, []), []);
});
test('similarChannels uses words only when neither side has topics', () => {
  const t = { id: 'A', title: 'A', topics: null, titles: ['Rome empire'] };
  const r = similarChannels(t, [{ id: 'B', title: 'B', topics: [], titles: ['Rome empire fall'] }]);
  assert.equal(r[0].score, 67);
});
