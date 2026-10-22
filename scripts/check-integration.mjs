// Must pass before implementing a new engine: old pixels, both transports and native ES loading.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startStudioServer } from './studio-server.mjs';
import { ROOT, launchBrowser, closeBrowser, openPage, frameOf, sourceHash } from './render-lib.mjs';
const studio=await startStudioServer(),browser=await launchBrowser(),report=[];
let fixture, temp;
try {
  for(const style of ['watercolor','cartoon','pixel']) {
    const file=await openPage(browser,{project:'visit',style});
    const http=await openPage(browser,{project:'visit',style,origin:studio.origin});
    for(const t of [0,2.5,5.2])assert.ok((await frameOf(file,t)).equals(await frameOf(http,t)),style+': HTTP alterou pixels em '+t);
    const baseline=await readFile(join(ROOT,'out/checks',style+'-contact.png')).catch(()=>null);
    if(baseline)assert.ok(baseline.equals(await frameOf(file,2.5)),style+': mudou desde a referência auditada');
    assert.equal(await http.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('/three/'))),false);
    await assert.rejects(file.evaluate(()=>loadAnimationScript({src:'unused.js',type:'module'})),/npm run studio/);
    await file.close();await http.close();report.push({style,fileEqualsHTTP:true,baselineCompared:!!baseline,threeLoaded:false});
  }
  temp=await mkdtemp(join(tmpdir(),'animation-modules-'));await mkdir(join(temp,'src'));
  await writeFile(join(temp,'studio.html'),'<script src="src/loader.js"></script>');
  await writeFile(join(temp,'src/loader.js'),await readFile(join(ROOT,'src/loader.js')));
  await writeFile(join(temp,'src/classic.js'),'const CLASSIC_VALUE=31;');
  await writeFile(join(temp,'src/module.js'),'window.moduleValue=CLASSIC_VALUE+1; export const loaded=true;');
  await writeFile(join(temp,'src/broken.js'),'throw new Error("module-dependency-failure");');
  fixture=await startStudioServer({root:temp});const page=await browser.newPage();await page.goto(fixture.origin+'/studio.html');
  assert.equal(await page.evaluate(async()=>{await loadAnimationScript('src/classic.js');await loadAnimationScript({src:'src/module.js',type:'module'});return window.moduleValue;}),32);
  await assert.rejects(page.evaluate(()=>loadAnimationScript({src:'src/broken.js',type:'module'})),/module-dependency-failure/);
  await page.close();
  await mkdir('out/checks',{recursive:true});await writeFile('out/checks/integration.json',JSON.stringify({status:'passed',sourceHash:sourceHash(),at:new Date().toISOString(),styles:report,classicAndModuleInterop:true,moduleErrorsReject:true},null,2)+'\n');
  console.log('PASS: três estilos idênticos via file/HTTP e à referência; módulos ES sequenciais e falhas explícitas.');
}finally{await closeBrowser(browser);await studio.close();await fixture?.close();if(temp)await rm(temp,{recursive:true,force:true});}
