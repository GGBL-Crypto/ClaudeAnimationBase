// Run after changing a renderer: every style on its smoke scene (fixtures/smoke/), true pixels, out-of-order frames,
// workers, isolation and preview controls.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchBrowser, closeBrowser, openPage, frameOf, parseArgs } from './render-lib.mjs';

const args=parseArgs(process.argv.slice(2)), browser=await launchBrowser(args), out='out/checks';
const SMOKE=[...['watercolor-classic','cartoon','pixel'].map(style=>['smoke-visit',style]),...['debug','cartoon','stick','watercolor','flat','paper','ink','silhouette'].map(style=>['smoke-2d',style]),['smoke-3d','lowpoly-3d']];
mkdirSync(out,{recursive:true});const report=[];
try {
  for(const [project,style] of SMOKE) {
    const name=project+'-'+style,page=await openPage(browser,{...args,project,style});
    assert.equal(await page.evaluate(()=>projectInfo().duration),2,name+': metadados sobrescritos pelo motor');
    const a=await frameOf(page,1);await frameOf(page,1.9);const b=await frameOf(page,1);
    assert.ok(a.equals(b),name+': frame depende do histórico');
    assert.ok(!a.equals(await frameOf(page,.5)),name+': o ser não anda');
    if(project==='smoke-visit'&&style==='cartoon'){const f=n=>frameOf(page,n/24),[x,y,z]=[await f(24),await f(23),await f(25)];assert.ok(!x.equals(y)&&!x.equals(z),'cartoon: quadros vizinhos devem diferir (padrão em 1s)');}
    const other=await openPage(browser,{...args,project,style});
    assert.ok(a.equals(await frameOf(other,1)),name+': workers produzem imagens diferentes');await other.close();
    const checks=await page.evaluate(()=>({project:PROJECT.id,style:PROJECT.style,p5:[...document.scripts].map(s=>s.src).filter(src=>/p5\.min\.js|p5\.brush\.js$/.test(src)),immutable:Object.isFrozen(PROJECT.styleConfig)}));
    assert.ok(checks.immutable,name+': configuração mutável');
    if(style!=='watercolor-classic')assert.equal(checks.p5.length,0,name+': carregou p5');
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
    writeFileSync(join(out,name+'-contact.png'),a);
    report.push({...checks,deterministic:true,workersAgree:true});await page.close();
  }
  await assert.rejects(openPage(browser,{...args,project:'smoke-2d',style:'pixel'}),/compatível/);
  await assert.rejects(openPage(browser,{...args,project:'smoke-visit',style:'pixel',loop:'views'}),/Loop indisponível/);
  const preview=await openPage(browser,{...args,project:'smoke-2d',style:'cartoon'},{preview:true});
  await preview.waitForFunction("!document.getElementById('save').disabled");
  await preview.setViewport({width:1440,height:1100});await preview.screenshot({path:join(out,'preview-desktop.png'),fullPage:true});
  await preview.setViewport({width:390,height:844});
  assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Prévia transborda no celular');
  await preview.screenshot({path:join(out,'preview-mobile.png'),fullPage:true});
  await preview.click('#shots li:nth-child(1) button');await preview.waitForFunction("Number(document.getElementById('scrub').value)<.1");
  await preview.click('#play');await preview.waitForFunction("Number(document.getElementById('scrub').value)>.3");await preview.click('#play');
  assert.equal(await preview.$eval('#play',el=>el.textContent),'Reproduzir');
  await preview.select('#style','stick');await preview.waitForFunction("window.ready && PROJECT.style==='stick'");
  assert.equal(preview.renderErrors.length,0);await preview.close();
  writeFileSync(join(out,'checks.json'),JSON.stringify({status:'passed',styles:report,preview:'desktop/mobile, storyboard, play/pause, style selection'},null,2)+'\n');
  console.log(`PASS: ${report.length} estilo×cena, determinismo, workers, isolamento, paleta/grade e prévia. Evidências: `+out);
} finally {await closeBrowser(browser);}
