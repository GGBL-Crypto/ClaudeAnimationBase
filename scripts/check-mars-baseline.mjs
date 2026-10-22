import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {startStudioServer} from './studio-server.mjs';
import {launchBrowser,closeBrowser,openPage,frameOf,sourceHash} from './render-lib.mjs';
const base='out/generalization/baseline',out='out/generalization/mars-regression';mkdirSync(out,{recursive:true});
// Asset hooks intentionally extend the backend; the historical 36 PNGs remain the behavior oracle.
assert.equal(JSON.parse(readFileSync(base+'/source.json','utf8')).files['src/styles/lowpoly-3d/engine.js'],'bd48003f9c8817de8e7c544536ba2b80c28e3922d25c09e7995ef491f7962b4f','historical baseline changed');
const server=await startStudioServer(),browser=await launchBrowser({});
try{
  const page=await openPage(browser,{project:'mars-discovery',resolution:'1080p',origin:server.origin});
  for(let i=0;i<36;i++){
    const png=await frameOf(page,i/12),name='f'+String(i).padStart(5,'0')+'.png';
    assert.deepEqual(png,readFileSync('out/mars-discovery/revisions/3e985d01ffc0/1080p/hardware/frames/'+name),'Mars differs at '+i);
    if([0,18,35].includes(i))writeFileSync(out+'/'+name,png);
  }
  writeFileSync(out+'/report.json',JSON.stringify({sourceHash:sourceHash(),baseline:JSON.parse(readFileSync(base+'/source.json','utf8')).hash,engineExtendedForAssets:true,framesEqual:36,device:await page.evaluate(()=>animationEngine.info())},null,2)+'\n');
  console.log('Marte: 36/36 PNGs idênticos à revisão anterior; hooks de assets sem alteração visual');
}finally{await closeBrowser(browser);await server.close();}
