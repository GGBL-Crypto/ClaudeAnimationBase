// Run after changing a renderer: true pixels, out-of-order frames, contacts and preview controls.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { launchBrowser, closeBrowser, openPage, frameOf, parseArgs } from './render-lib.mjs';

const args=parseArgs(process.argv.slice(2)), browser=await launchBrowser(args), out='out/checks';
mkdirSync(out,{recursive:true});const report=[];
try {
  for(const style of ['watercolor','cartoon','pixel']) {
    const page=await openPage(browser,{...args,project:'visit',style});
    assert.equal(await page.evaluate(()=>projectInfo().duration),6,'Metadados sobrescritos pelo motor');
    const a=await frameOf(page,2.5);await frameOf(page,5.2);const b=await frameOf(page,2.5);
    assert.ok(a.equals(b),style+': frame depende do histórico');
    if(style==='cartoon'){const f=n=>frameOf(page,n/24),[x,y,z]=[await f(61),await f(60),await f(62)];assert.ok(!x.equals(y)&&!x.equals(z),'cartoon: quadros vizinhos devem diferir (padrão em 1s)');}
    const other=await openPage(browser,{...args,project:'visit',style});
    assert.ok(a.equals(await frameOf(other,2.5)),style+': workers produzem imagens diferentes');await other.close();
    const checks=await page.evaluate(()=>{
      const d=frameDiagnostics;
      return {style:PROJECT.style,contact:Math.abs(d.butterfly[1]+8-d.head[1]),libraries:[...document.scripts].map(s=>s.src).filter(src=>src.includes('p5')),immutable:Object.isFrozen(PROJECT.styleConfig)};
    });
    assert.equal(checks.contact,0);assert.ok(checks.immutable);
    if(style!=='watercolor')assert.equal(checks.libraries.length,0);
    if(style==='pixel') {
      const pixels=await page.evaluate(()=>{
        const src=animationEngine.buffer,ctx=src.getContext('2d'),small=ctx.getImageData(0,0,src.width,src.height).data;
        const palette=new Set(Object.values(STYLE.palette).map(x=>x.toUpperCase()));let foreign=0;
        for(let i=0;i<small.length;i+=4){const hex='#'+[small[i],small[i+1],small[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();if(!palette.has(hex))foreign++;}
        const big=animationEngine.canvas.getContext('2d').getImageData(0,0,1920,1080).data,s=STYLE.texture.scale;let mismatch=0;
        for(let y=0;y<1080;y++)for(let x=0;x<1920;x++){const a=(y*1920+x)*4,b=(Math.floor(y/s)*src.width+Math.floor(x/s))*4;for(let k=0;k<3;k++)if(big[a+k]!==small[b+k]){mismatch++;break;}}
        return {foreign,mismatch,width:src.width,height:src.height};
      });
      assert.equal(pixels.foreign,0);assert.equal(pixels.mismatch,0);checks.pixels=pixels;
    }
    await assert.rejects(page.evaluate(()=>renderAt(-1)),/Tempo fora/);
    writeFileSync(join(out,style+'-contact.png'),a);
    report.push({...checks,deterministic:true,workersAgree:true});await page.close();
  }
  const legacy=await openPage(browser,{...args,project:'demo',style:'watercolor'});
  for(const t of [.5,5.7]) {
    const name='t'+t.toFixed(2).replace('.','_')+'.png',baseline=join('out/baseline/stills',name),buf=await frameOf(legacy,t);
    if(existsSync(baseline))assert.ok(buf.equals(readFileSync(baseline)),'Aquarela original mudou em '+t);
  }
  await legacy.close();
  const loop=await openPage(browser,{...args,project:'demo',style:'watercolor',loop:'views'});
  writeFileSync(join(out,'original-views.png'),await frameOf(loop,1));await loop.close();
  await assert.rejects(openPage(browser,{...args,project:'demo',style:'pixel'}),/compatível/);
  await assert.rejects(openPage(browser,{...args,project:'visit',style:'pixel',loop:'views'}),/Loop indisponível/);
  const preview=await openPage(browser,{...args,project:'visit',style:'cartoon'},{preview:true});
  await preview.waitForFunction("!document.getElementById('save').disabled");
  await preview.setViewport({width:1440,height:1100});await preview.screenshot({path:join(out,'preview-desktop.png'),fullPage:true});
  await preview.setViewport({width:390,height:844});
  assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Prévia transborda no celular');
  await preview.screenshot({path:join(out,'preview-mobile.png'),fullPage:true});
  await preview.click('#shots li:nth-child(2) button');await preview.waitForFunction("Number(document.getElementById('scrub').value)>=3");
  await preview.click('#play');await preview.waitForFunction("Number(document.getElementById('scrub').value)>3.2");await preview.click('#play');
  assert.equal(await preview.$eval('#play',el=>el.textContent),'Reproduzir');
  await preview.select('#style','pixel');await preview.waitForFunction("window.ready && PROJECT.style==='pixel'");
  assert.equal(preview.renderErrors.length,0);await preview.close();
  writeFileSync(join(out,'checks.json'),JSON.stringify({status:'passed',styles:report,legacyBaseline:'compared when available',preview:'desktop/mobile, storyboard, play/pause, style selection'},null,2)+'\n');
  console.log('PASS: determinismo, workers, contato, isolamento, paleta/grade, aquarela original, loops e prévia. Evidências: '+out);
} finally {await closeBrowser(browser);}
