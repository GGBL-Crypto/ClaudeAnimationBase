import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';import {sourceSnapshot,run,launchBrowser,closeBrowser} from './render-lib.mjs';
const height=Number(process.argv[2]||720);if(![720,1080].includes(height))throw Error('720 or 1080');
const backends=process.argv[3]?[process.argv[3]]:['hardware','swiftshader'];if(backends.some(b=>!['hardware','swiftshader'].includes(b)))throw Error('hardware or swiftshader');
const root=`out/watercolor-actor/revisions/${sourceSnapshot().hash.slice(0,12)}`,out=`${root}/${height}p/comparison`,fps=height===720?12:24;mkdirSync(out,{recursive:true});
const browser=await launchBrowser();
try{const page=await browser.newPage();
 for(const backend of backends){
  for(const [name,times,rect]of [['breath',[0,.1667,.3333,.4167],[520,180,300,430]],['face',[.4167,.5,.5833,.6667,.75,.9],[555,180,180,240]],['hair',[.75,1,1.25,1.5,1.75,2],[520,170,280,290]],['gesture',[1.2,1.4,1.6,1.8,2.1,2.4],[520,340,450,300]]]){
   const paths=[];for(const variant of ['procedural','assets']){
    const path=`${out}/${backend}-${variant}-${name}.png`,[x,y,w,h]=rect.map(n=>Math.round(n*height/720)),indices=[...new Set(times.map(t=>Math.floor(t*fps)))],select=indices.map(i=>`eq(n\\,${i})`).join('+');
    await run('ffmpeg',['-y','-v','error','-i',`${root}/${height}p/${backend}/${variant}/video.mp4`,'-vf',`select='${select}',crop=${w}:${h}:${x}:${y},tile=3x2`,'-frames:v','1','-update','1',path],{capture:true});paths.push(path);
   }
   const urls=paths.map(p=>'data:image/png;base64,'+readFileSync(p).toString('base64'));
   const url=await page.evaluate(async urls=>{const images=await Promise.all(urls.map(async url=>{const i=new Image();i.src=url;await i.decode();return i;})),c=document.createElement('canvas');c.width=images[0].width;c.height=images[0].height*2;const x=c.getContext('2d');images.forEach((im,i)=>x.drawImage(im,0,i*im.height));return c.toDataURL();},urls);
   writeFileSync(`${out}/${backend}-${name}-ab.png`,Buffer.from(url.split(',')[1],'base64'));
  }
 }
}finally{await closeBrowser(browser);}
console.log(out);
