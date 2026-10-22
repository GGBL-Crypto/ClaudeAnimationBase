import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {sourceSnapshot,run,launchBrowser,closeBrowser} from './render-lib.mjs';
const resolution=process.argv[2]||'720p',root='out/articulated/revisions/'+sourceSnapshot().hash.slice(0,12)+'/'+resolution,out=root+'/comparison',factor=resolution==='1080p'?1.5:1;mkdirSync(out,{recursive:true});
for(const backend of ['hardware','swiftshader'])for(const variant of ['a','b'])for(const [name,frame]of [['walk',24],['stop',72],['surprise',108],['angry',144],['neutral',191]]){
 const dest=out+'/'+backend+'-'+variant+'-'+name+'.png';await run('ffmpeg',['-y','-v','error','-i',root+'/'+backend+'/'+variant+'/video.mp4','-vf','select=eq(n\\,'+frame+')','-frames:v','1','-update','1',dest],{capture:true});
}
const browser=await launchBrowser({});try{
 const page=await browser.newPage();
 for(const backend of ['hardware','swiftshader'])for(const kind of ['action','face']){
  const names=kind==='action'?['walk','stop','surprise','angry','neutral']:['surprise','angry','neutral'],data=['a','b'].flatMap(variant=>names.map(name=>({label:variant.toUpperCase()+' · '+name,data:'data:image/png;base64,'+readFileSync(out+'/'+backend+'-'+variant+'-'+name+'.png').toString('base64')})));
  const png=await page.evaluate(async({data,cols,kind,factor})=>{const w=kind==='face'?Math.round(380*factor):480,h=kind==='face'?Math.round(300*factor):270,canvas=document.createElement('canvas');canvas.width=cols*w;canvas.height=2*(h+28);const ctx=canvas.getContext('2d');ctx.fillStyle='#18232e';ctx.fillRect(0,0,canvas.width,canvas.height);
   for(let i=0;i<data.length;i++){const img=new Image();img.src=data[i].data;await img.decode();const x=i%cols*w,y=Math.floor(i/cols)*(h+28);if(kind==='face')ctx.drawImage(img,450*factor,130*factor,w,h,x,y+28,w,h);else ctx.drawImage(img,x,y+28,w,h);ctx.fillStyle='white';ctx.font='18px sans-serif';ctx.fillText(data[i].label,x+8,y+21);}return canvas.toDataURL();
  },{data,cols:names.length,kind,factor});writeFileSync(out+'/'+backend+'-'+kind+'-ab.png',Buffer.from(png.split(',')[1],'base64'));
 }
}finally{await closeBrowser(browser);}
console.log(out);
