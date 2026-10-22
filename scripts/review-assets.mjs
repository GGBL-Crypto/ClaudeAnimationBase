import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {sourceHash,launchBrowser,closeBrowser,run} from './render-lib.mjs';
const root='out/asset-pilot/revisions/'+sourceHash().slice(0,12),out=root+'/comparison';mkdirSync(out,{recursive:true});
const browser=await launchBrowser({});
try{
 const page=await browser.newPage();const data=['p0','p1','p2'].map(p=>'data:image/png;base64,'+readFileSync(root+'/720p-12fps/hardware/'+p+'/inspection/t1_00.png').toString('base64'));
 const url=await page.evaluate(async data=>{
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=394;const ctx=canvas.getContext('2d');ctx.fillStyle='#1b1820';ctx.fillRect(0,0,1920,394);
  for(let i=0;i<data.length;i++){const image=new Image();image.src=data[i];await image.decode();ctx.drawImage(image,i*640,34,640,360);ctx.fillStyle='white';ctx.font='18px sans-serif';ctx.fillText(['P0 · procedural','P1 · GLB / original PBR','P2 · same GLB / refined lighting'][i],i*640+16,24);}return canvas.toDataURL();
 },data);writeFileSync(out+'/p0-p1-p2.png',Buffer.from(url.split(',')[1],'base64'));
}finally{await closeBrowser(browser);}
await run('ffmpeg',['-y','-v','error','-i',root+'/720p-12fps/hardware/p2/video.mp4','-vf','scale=480:-1:flags=neighbor,tile=6x4','-frames:v','1','-update','1',out+'/p2-all-24-frames.png'],{capture:true});
console.log(out);
