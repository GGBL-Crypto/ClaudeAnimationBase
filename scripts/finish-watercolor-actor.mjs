// Manual review ledger: these paths were opened by the agent via view_image, not inferred from render success.
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {sourceSnapshot} from './render-lib.mjs';import {sha256} from './asset-catalog.mjs';
const source=sourceSnapshot(),root=`out/watercolor-actor/revisions/${source.hash.slice(0,12)}`;
assert.equal(source.hash,'70bc9346f90de301b9707b2baa48735c35826304a338fd82e3f8696182bc2981','Review belongs to this exact revision');
const reviewed=[
 'qa-720/hardware/assets-face.jpg','qa-720/hardware/assets-breath.jpg','qa-720/hardware/alpha-composition.png',
 'qa-1080/hardware/assets-storyboard.jpg','qa-1080/hardware/assets-gesture.jpg','qa-1080/hardware/assets-head-hair.jpg','qa-1080/hardware/alpha-composition.png','lifecycle-hardware/preview.png',
 ...['face','gesture','hair'].map(k=>`720p/comparison/hardware-${k}-ab.png`),
 ...['face','gesture'].map(k=>`720p/comparison/swiftshader-${k}-ab.png`),
 ...['face','gesture','breath','hair'].map(k=>`1080p/comparison/hardware-${k}-ab.png`)
];
const videoEvidence={
 '720p/hardware/procedural':['decoded-sheet.png','detail-1.png'],
 '720p/hardware/assets':['decoded-sheet.png','detail-1.png','detail-3.png'],
 '720p/swiftshader/procedural':['decoded-sheet.png','detail-1.png'],
 '720p/swiftshader/assets':['decoded-sheet.png','detail-1.png','detail-2.png','detail-3.png'],
 '1080p/hardware/procedural':['decoded-sheet.png','detail-1.png'],
 '1080p/hardware/assets':['decoded-sheet.png','detail-1.png','detail-3.png']
};
for(const [dir,images]of Object.entries(videoEvidence))for(const file of images)reviewed.push(dir+'/video.mp4.review/'+file);
assert.ok(readFileSync('docs/VALIDATION.md','utf8').includes('Fechamento visual da revisão `70bc9346f90d`'),'Document review before changing review status');
const tests={};for(const name of ['qa-720/hardware','qa-1080/hardware','qa-software-sample','lifecycle-hardware','regressions','preservation']){const report=JSON.parse(readFileSync(root+'/'+name+'/report.json'));assert.equal(report.status,name==='qa-software-sample'?'passed-with-limitations':'passed',name);if(name==='qa-software-sample'){assert.equal(report.isolatedComponentDeterminism,'passed');assert.equal(report.productionSceneDeterminism,'failed');}tests[name]=report;}
const ledger={reviewer:'Codex agent',sourceHash:source.hash,scope:'Sampled sheets and native crops opened with view_image; no user approval, no real-time human playback, no individual review of every native frame',technicalFixtureAcceptance:'passed',professionalArtAcceptance:'pending',findings:['Neck square corrected in pack 1.0.2 and region reopened','No joint gaps observed in sampled gesture crops; segmented arm contours remain','PNG preserves small facial strokes more clearly in this fixture','Paper/camera/foreground ordering retained; no strong white halo on dark alpha composition','Hair is overlapping rigid pieces, not continuous deformation'],opened:reviewed.map(path=>{assert.ok(existsSync(root+'/'+path));return {path:root+'/'+path,sha256:sha256(readFileSync(root+'/'+path))};})};
ledger.technicalFixtureAcceptance='passed on tested hardware';ledger.softwareIsolatedPNGDeterminism='passed';ledger.softwareFullSceneDeterminism='failed; not approved as pixel-exact';
writeFileSync(root+'/visual-review.json',JSON.stringify(ledger,null,2));
const videos=[];
for(const [dir,images]of Object.entries(videoEvidence)){
 const path=root+'/'+dir+'/video.mp4.review/report.json',report=JSON.parse(readFileSync(path)),video=root+'/'+dir+'/video.mp4';
 assert.equal(report.status,'decoded-and-verified');assert.equal(report.sourceHash,source.hash);assert.equal(report.duration,2.5);assert.equal(report.codec,'h264');assert.equal(report.audio,false);assert.equal(report.videoSha256,sha256(readFileSync(video)));assert.equal(report.frames,dir.startsWith('1080')?60:30);assert.equal(report.fps,dir.startsWith('1080')?24:12);
 report.visualReview='performed-by-agent';report.visualReviewEvidence={ledger:root+'/visual-review.json',opened:images.map(n=>root+'/'+dir+'/video.mp4.review/'+n),scope:ledger.scope,professionalArtAcceptance:'pending'};
 writeFileSync(path,JSON.stringify(report,null,2)+'\n');videos.push({path:video,bytes:report.bytes,sha256:report.videoSha256,width:report.width,height:report.height,fps:report.fps,frames:report.frames,duration:report.duration});
}
writeFileSync(root+'/completion.json',JSON.stringify({status:'technical-stage-complete-hardware-validated',professionalArtAcceptance:'pending prepared professional artwork',softwareFullSceneDeterminism:'failed; variation also reproduced in legacy visit without PNGs',softwareIsolatedComponentDeterminism:'passed',sourceHash:source.hash,tests:Object.keys(tests),videos,previousVideosPreserved:tests.preservation.historicalVideos,checkpoint:'checkpoints/watercolor-before-20261022-090502',visualReview:root+'/visual-review.json',limitations:ledger.findings},null,2));console.log('COMPLETE technical layered watercolor: six verified and visually reviewed MP4s; professional artistic quality pending; strict full-scene software determinism not approved');
