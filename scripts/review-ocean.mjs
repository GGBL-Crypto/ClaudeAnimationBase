import {mkdirSync,writeFileSync} from 'node:fs';
import {startStudioServer} from './studio-server.mjs';
import {parseArgs,launchBrowser,closeBrowser,openPage,frameOf,sourceHash} from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),out=args.out||'out/generalization/ocean-review';mkdirSync(out,{recursive:true});
const server=await startStudioServer(),browser=await launchBrowser(args);
try{
  const page=await openPage(browser,{...args,project:'ocean-encounter',origin:server.origin}),info=await page.evaluate(()=>projectInfo());
  const sheet=async(name,times,cols=4,width=480,at=null)=>{
    const result=await page.evaluate((times,cols,width,at)=>renderSheet(times,cols,width,null,at),times,cols,width,at);
    writeFileSync(out+'/'+name+'.jpg',Buffer.from(result.url.split(',')[1],'base64'));
  };
  await sheet('storyboard',info.reviewTimes);
  await sheet('discovery',[2.5,3,3.5,3.75,4,4.25,4.5,5]);
  await sheet('follow',[5.3,5.4,5.8,6.2,6.6,7,7.4,7.95]);
  const scale=info.width/1920;
  // Track the actual actor, rather than cropping a fixed world point during travel.
  for(const [name,actor,times,cw,ch]of [['vehicle','submarine',[0,3,4,4.6,6.2,7.95],760,650],['creature','creature',[2,3.6,4,4.6,6.2,7.95],650,850]]){
    const url=await page.evaluate(async(actor,times,cw,ch)=>{
      const canvas=document.createElement('canvas'),width=480,height=Math.round(width*ch/cw);canvas.width=width*3;canvas.height=height*2;const ctx=canvas.getContext('2d');
      for(const [i,t]of times.entries()){
        await renderAt(t);const position=oceanPose(t)[actor].position,[x,y]=animationEngine.worldToScreen(...position),dx=i%3*width,dy=Math.floor(i/3)*height;
        const sx=Math.max(0,Math.min(animationEngine.canvas.width-cw,x-cw/2)),sy=Math.max(0,Math.min(animationEngine.canvas.height-ch,y-ch/2));
        ctx.drawImage(animationEngine.canvas,sx,sy,cw,ch,dx,dy,width,height);
        ctx.fillStyle='#1b1820';ctx.fillRect(dx,dy,80,23);ctx.fillStyle='white';ctx.font='14px sans-serif';ctx.fillText(t.toFixed(2)+'s',dx+6,dy+16);
      }return canvas.toDataURL('image/jpeg',.92);
    },actor,times,cw*scale,ch*scale);
    writeFileSync(out+'/'+name+'.jpg',Buffer.from(url.split(',')[1],'base64'));
  }
  for(const [name,t]of [['begin',0],['middle',4],['end',8-1/24]])writeFileSync(out+'/'+name+'.png',await frameOf(page,t));
  writeFileSync(out+'/manifest.json',JSON.stringify({sourceHash:sourceHash(),project:info,engine:await page.evaluate(()=>animationEngine.info()),times:info.reviewTimes},null,2)+'\n');
  console.log('Inspeção: '+out);
}finally{await closeBrowser(browser);await server.close();}
