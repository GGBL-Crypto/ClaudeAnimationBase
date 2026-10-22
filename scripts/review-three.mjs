import { mkdirSync, writeFileSync } from 'node:fs';
import { startStudioServer } from './studio-server.mjs';
import { parseArgs, launchBrowser, closeBrowser, openPage, frameOf, sourceHash } from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),studio=await startStudioServer(),browser=await launchBrowser(args);
const out=args.out||'out/mars-discovery/review';mkdirSync(out,{recursive:true});
try {
  const page=await openPage(browser,{...args,project:'mars-discovery',origin:studio.origin});
  const sheet=async(name,times,cols=6,width=320,at=null)=>{
    const result=await page.evaluate((times,cols,width,at)=>renderSheet(times,cols,width,null,at),times,cols,width,at);
    writeFileSync(out+'/'+name+'.jpg',Buffer.from(result.url.split(',')[1],'base64'));
  };
  const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>(i+a)/12);
  const info=await page.evaluate(()=>projectInfo()),scale=info.width/1920;
  await sheet('storyboard',info.reviewTimes,3,480);
  await sheet('walk',range(0,12));await sheet('stop',range(9,18));await sheet('reaction',range(18,35));
  await sheet('feet',range(0,12),6,320,[-.9,.35,0,900*scale,600*scale]);
  await sheet('face',[1,1.5,1.75,2,2.5,35/12],3,480,[-.55,1.6,0,600*scale,480*scale]);
  await sheet('stone',[0,1,1.5,2,2.5,35/12],3,360,[.95,.2,0,450*scale,350*scale]);
  for(const [name,t]of [['begin',0],['middle',1.5],['end',35/12]])writeFileSync(out+'/'+name+'.png',await frameOf(page,t));
  writeFileSync(out+'/manifest.json',JSON.stringify({sourceHash:sourceHash(),project:info,files:['storyboard','walk','stop','reaction','feet','face','stone','begin','middle','end']},null,2)+'\n');
  await page.evaluate(()=>disposeAnimation());console.log('Folhas e PNGs de inspeção: '+out);
}finally{await closeBrowser(browser);await studio.close();}
