// Evidence extraction and explicit post-inspection ledger; never auto-approves a fresh render.
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {sourceSnapshot,run} from './render-lib.mjs';import {sha256} from './asset-catalog.mjs';
const source=sourceSnapshot(),root=`out/personagem-pilot/revisions/${source.hash.slice(0,12)}`,review=root+'/final/video.mp4.review',mode=process.argv[2];
const json=(p,o)=>writeFileSync(p,JSON.stringify(o,null,2)+'\n');
if(mode==='extract'){
 const video=root+'/final/video.mp4';mkdirSync(review,{recursive:true});
 for(const [name,index]of [['start',0],['middle',26],['reaction',33],['end',53]])await run('ffmpeg',['-y','-v','error','-i',video,'-vf',`select=eq(n\\,${index})`,'-frames:v','1','-update','1',review+'/decoded-'+name+'.png'],{capture:true});
 await run('ffmpeg',['-y','-v','error','-i',video,'-vf','select=eq(n\\,33),crop=430:400:390:180','-frames:v','1','-update','1',review+'/decoded-expression.png'],{capture:true});
 for(const [name,a,b]of [['establish-cut',16,19],['reaction-cut',31,35]])await run('ffmpeg',['-y','-v','error','-i',video,'-vf',`select=between(n\\,${a}\\,${b}),scale=480:-1,tile=${b-a+1}x1`,'-frames:v','1','-update','1',review+'/decoded-'+name+'.png'],{capture:true});
 console.log(review);
}else if(mode==='record'){
 const validation=readFileSync('docs/VALIDATION.md','utf8');assert.ok(validation.includes(source.hash)&&validation.includes('ae28d4f0c361/final/video.mp4.review/decoded-sheet.png'),'Write the real inspection record before changing visualReview');
 const qa=JSON.parse(readFileSync(root+'/qa.json')),reg=JSON.parse(readFileSync(root+'/regressions/report.json')),preservation=JSON.parse(readFileSync(root+'/preservation.json'));
 assert.equal(qa.status,'passed');assert.equal(reg.status,'passed');assert.equal(reg.sourceStable,true);assert.equal(preservation.changed.length,0);
 const ledger={sourceHash:source.hash,reviewer:'Codex — actual static frame inspection, not user approval',date:'2026-10-22',strategy:'Complete opaque illustrations with camera and editorial cuts; no inferred rig',limitations:['Fixed gaze, no blink, limbs, walk or continuous facial morph','Drawings differ slightly in face proportions','Reflected side paper repeats at high magnification','No audio; no 1080p or software-backend validation','Commercial rights and external publication unverified'],videos:[]};
 for(const [dir,opened]of [
  ['final',['decoded-sheet.png','detail-1.png','detail-2.png','detail-3.png','decoded-start.png','decoded-middle.png','decoded-reaction.png','decoded-end.png','decoded-expression.png','decoded-establish-cut.png','decoded-reaction-cut.png']],
  ['samples/camera',['decoded-sheet.png']],
  ['samples/surpresa',['decoded-sheet.png','detail-1.png']]
 ]){
  const video=root+'/'+dir+'/video.mp4',reportPath=video+'.review/report.json',report=JSON.parse(readFileSync(reportPath));assert.equal(report.sourceHash,source.hash);assert.equal(report.videoSha256,sha256(readFileSync(video)));
  const evidence=opened.map(name=>{const path=video+'.review/'+name;return {path,sha256:sha256(readFileSync(path))};});
  report.visualReview='performed';report.visualReviewEvidence=evidence;report.visualReviewNotes='Opened listed decoded MP4 evidence; see docs/VALIDATION.md for observations and limits. Agent review, not user approval.';json(reportPath,report);ledger.videos.push({video,bytes:report.bytes,sha256:report.videoSha256,opened:evidence});
 }
 for(const name of ['storyboard.jpg','push.jpg','observe-cut.jpg','reaction-cut.jpg','expression.jpg','hair-paper.jpg'])assert.ok(existsSync(root+'/'+name));
 ledger.sceneEvidence=['storyboard.jpg','push.jpg','observe-cut.jpg','reaction-cut.jpg','expression.jpg','hair-paper.jpg'].map(p=>({path:root+'/'+p,sha256:sha256(readFileSync(root+'/'+p))}));
 json(root+'/visual-review.json',ledger);json(root+'/completion.json',{status:'local-illustration-pilot-reviewed',sourceHash:source.hash,video:root+'/final/video.mp4',asset:'menina-aquarela@1.0.1',qa:root+'/qa.json',regressions:root+'/regressions/report.json',preservation:root+'/preservation.json',visualReview:root+'/visual-review.json',commercialRights:'unverified',readyFor:'New local stories using these two whole illustrations and camera cuts; no articulated acting'});
 const superseded='out/personagem-pilot/revisions/d9519c8e33be/regressions/report.json';if(existsSync(superseded)){const old=JSON.parse(readFileSync(superseded));old.status='superseded-source-changed';old.sourceStable=false;old.note='Camera correction changed source during this intermediate run; final stable regression evidence is '+root+'/regressions/report.json';json(superseded,old);}
 console.log('Recorded actual inspection: '+root+'/completion.json');
}else throw Error('Use extract; inspect evidence; document; then record');
