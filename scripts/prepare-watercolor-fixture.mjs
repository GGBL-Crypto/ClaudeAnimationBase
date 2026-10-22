import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {launchBrowser,closeBrowser} from './render-lib.mjs';
import {sha256} from './asset-catalog.mjs';
import {importAsset} from './import-assets.mjs';
const source=readFileSync('src/scenes/watercolor-actor-fixture.js','utf8'),ctx=vm.createContext({});vm.runInContext(source,ctx);const fixture=JSON.parse(JSON.stringify(ctx.WatercolorFixture));
const version=fixture.identity.modelVersion,inbox='checkpoints/watercolor-fixture-inbox-'+version;mkdirSync(inbox,{recursive:true});
if(existsSync('assets/packs/iara-watercolor-fixture/'+version))throw Error('Fixture version already published');
const browser=await launchBrowser();const files=[];const descriptor=(path,bytes)=>({path,bytes:bytes.length,sha256:sha256(bytes)});
try{
 const page=await browser.newPage();
 for(const [name,art]of Object.entries(fixture.art)){
  const url=await page.evaluate(art=>{
   const c=document.createElement('canvas');[c.width,c.height]=art.size;const x=c.getContext('2d');x.lineCap=x.lineJoin='round';
   for(const s of art.shapes){x.beginPath();s.points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.strokeStyle='#59454D';x.lineWidth=s.line?2.8:1.8;
    if(!s.line){x.closePath();x.fillStyle=s.color;x.fill();x.stroke();
     x.save();x.clip();x.fillStyle='#F3EBDC';for(let i=0;i<270;i++){const a=(i*97%997)/997*c.width,b=(i*193%991)/991*c.height;x.globalAlpha=.05+(i%5)*.015;x.fillRect(a,b,1+(i%3),1+(i%2));}x.restore();
    }else x.stroke();
   }return c.toDataURL();
  },art);
  const bytes=Buffer.from(url.split(',')[1],'base64'),path=name+'.png';writeFileSync(inbox+'/'+path,bytes);files.push(descriptor(path,bytes));
 }
 const terms=Buffer.from('Original technical fixture authored by Codex for ClaudeAnimationBase, 2026-10-22. Original code-native polygons, no external references, image model or third-party character assets. Released under the repository MIT license; commercial use permitted. Artistic quality remains pending.\n'+readFileSync('LICENSE','utf8'));
 writeFileSync(inbox+'/terms.txt',terms);writeFileSync(inbox+'/original-fixture.js',source);
 const master=await page.evaluate(async files=>{const c=document.createElement('canvas');c.width=1000;c.height=800;const x=c.getContext('2d');let i=0;for(const f of files){const img=new Image();img.src=f;await img.decode();const a=i%4*250,b=Math.floor(i/4)*260;x.drawImage(img,a,b);i++;}return c.toDataURL();},files.map(f=>'data:image/png;base64,'+readFileSync(inbox+'/'+f.path).toString('base64')));
 const original=Buffer.from(master.split(',')[1],'base64');writeFileSync(inbox+'/original-sheet.png',original);
 const evidence=[descriptor('terms.txt',terms),descriptor('original-fixture.js',Buffer.from(source)),descriptor('original-sheet.png',original)];
 const manifest={schemaVersion:1,id:'iara-watercolor-fixture',version,profile:'layered-2d',style:'watercolor',entry:'torso.png',origin:{kind:'original',author:'Codex for ClaudeAnimationBase',source:'local code-native technical fixture',date:'2026-10-22'},license:{identifier:'MIT',url:'local:terms.txt',commercial:true,reviewedBy:'Codex: original fixture source review',reviewedAt:'2026-10-22',evidence:['terms.txt']},identity:fixture.identity,actor:fixture.actor,available:{views:['front'],poses:['greeting'],expressions:['neutral','smile','blinkNeutral','blinkSmile']},files,evidence,derivations:files.map(f=>({path:f.path,source:'original-fixture.js',sourceSha256:evidence[1].sha256,tool:'Canvas2D / prepare-watercolor-fixture.mjs',operation:'Explicit authored part rendered to transparent RGBA PNG; master sheet assembled from same source',parameters:{scale:1,background:'transparent'},operator:'Codex'}))};
 writeFileSync(inbox+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(importAsset(inbox+'/manifest.json')));
}finally{await closeBrowser(browser);}
