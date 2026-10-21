// Generate repeatable visual evidence; these images still need to be opened and inspected.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, launchBrowser, openPage } from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)), browser=await launchBrowser(args);
const steps=(a,b,fps=24)=>Array.from({length:Math.floor((b-a)*fps+1e-6)+1},(_,i)=>a+i/fps);
try {
  for(const style of args.style?[args.style]:['watercolor','cartoon','pixel']) {
    const page=await openPage(browser,{...args,project:'visit',style}),dir=join('out','visit',style,'review');mkdirSync(dir,{recursive:true});
    const sheets=[
      ['storyboard',[.35,.9,1.6,2.35,2.8,2.96,3.04,3.35,3.9,4.4,4.9,5.4],4,480,null],
      ['landing',steps(1.9,2.7),5,300,[550,330,720,330]],
      ['departure',steps(3.6,4.5),6,320,null],
      ['seam',steps(2.9,3.15),6,320,null],
      ['transitions',[...steps(0,.5),...steps(5.45,5.95)],6,240,null],
      ['faces',[1.3,2.5,2.8,3.35,4.7,5.2],3,400,[550,440,530,430]]
    ];
    for(const[name,times,cols,w,crop]of sheets){const sheet=await page.evaluate((ts,c,w,crop)=>renderSheet(ts,c,w,crop),times,cols,w,crop);writeFileSync(join(dir,name+'.jpg'),Buffer.from(sheet.url.split(',')[1],'base64'));console.log(style+' / '+name+' · '+times.length+' quadros');}
    await page.close();
  }
} finally {await browser.close();}
