// Local raster preparation only: no generation, downloads, segmentation or new dependencies.
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync,copyFileSync,realpathSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {sha256} from './asset-catalog.mjs';
import {launchBrowser,closeBrowser,run} from './render-lib.mjs';
import {importAsset} from './import-assets.mjs';
const stage='out/personagem-pilot/preparation-v2',checkpoint='checkpoints/personagem-before-20261022',source='docs/imgs/personagem';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const json=(path,value)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n');};
if(!existsSync(checkpoint+'/preservation.json')){
 mkdirSync(checkpoint,{recursive:true});
 writeFileSync(checkpoint+'/git-status.txt',await run('git',['status','--short'],{capture:true}));
 writeFileSync(checkpoint+'/tracked.patch',await run('git',['diff','--binary'],{capture:true}));
 const files=[...walk('src'),...walk('scripts'),...walk('tests'),'assets/catalog.json','docs/VALIDATION.md','src/styles/watercolor/GUIDE.md'];
 for(const p of files){mkdirSync(dirname(checkpoint+'/workspace/'+p),{recursive:true});copyFileSync(p,checkpoint+'/workspace/'+p);}
 const prior=[...walk('out'),...walk('assets'),...walk(source)];
 const records=prior.map(path=>{const b=readFileSync(path);return {path,bytes:b.length,sha256:sha256(b)};});
 json(checkpoint+'/preservation.json',{outRoot:realpathSync('out'),files:records});
 // The existing QA scripts write fixed paths. Restore these bytes after saving this run's evidence.
 for(const p of prior.filter(p=>p.startsWith('out/checks/')||p.startsWith('out/generalization/mars-regression/'))){mkdirSync(dirname(checkpoint+'/qa/'+p),{recursive:true});copyFileSync(p,checkpoint+'/qa/'+p);}
}
mkdirSync(stage,{recursive:true});
const notes=[
 ['6f6faed5','vestido isolado, sem cabeça, braços ou pernas','Referência de roupa; não é torso completo articulável','Branco quase liso; escala/desenho diferem do corpo inteiro'],
 ['Create_character_head','cabeça neutra com cabelo e gola','Plano fechado alternativo; sem encaixe facial aprovado','Branco; olhos/mandíbula e gola diferem das outras vistas'],
 ['Create_isolated','braço e mão, manga inteira','Referência; articulação não aprovada','Papel texturizado; ombro isolado sem região de encaixe'],
 ['Generate_character_left','braço e mão, manga inteira','Referência; articulação não aprovada','Papel texturizado; comprimentos e punho distintos do corpo'],
 ['Generating_surprised','busto surpreso, boca aberta, olhos arregalados','Ilustração completa para corte de reação','Papel texturizado; identidade próxima, geometria não idêntica'],
 ['Girl_character','corpo inteiro, sorriso discreto, mãos e sapatos','Estabelecimento e aproximação; referência de identidade','Papel texturizado; paleta e presilha compatíveis com surpresa']
];
const inventory=walk(source).filter(p=>/\.(png|jpe?g)$/i.test(p)).sort().map(path=>{
 const b=readFileSync(path),format=path.split('.').pop().toLowerCase(),n=notes.find(n=>path.split('/').pop().startsWith(n[0]));
 if(format!=='jpg'&&format!=='jpeg')throw Error('Reinspect alpha for newly supplied non-JPEG image');
 return {path,name:path.split('/').pop(),format,bytes:b.length,sha256:sha256(b),alphaChannel:false,realTransparency:false,elements:n?.[1],role:n?.[2],backgroundAndCompatibility:n?.[3]};
});
const browser=await launchBrowser();
try{
 const page=await browser.newPage();
 const inputs=inventory.map(r=>({...r,url:'data:image/jpeg;base64,'+readFileSync(r.path).toString('base64')}));
 const result=await page.evaluate(async inputs=>{
  const images=await Promise.all(inputs.map(async r=>{const im=new Image();im.src=r.url;await im.decode();return im;}));
  inputs.forEach((r,i)=>Object.assign(r,{width:images[i].width,height:images[i].height,aspect:images[i].width/images[i].height}));
  const sheet=document.createElement('canvas');sheet.width=1500;sheet.height=1600;const ctx=sheet.getContext('2d');ctx.fillStyle='#e8e1d5';ctx.fillRect(0,0,1500,1600);
  inputs.forEach((r,i)=>{const x=i%3*500,y=Math.floor(i/3)*800,im=images[i],s=Math.min(460/im.width,690/im.height);ctx.drawImage(im,x+(500-im.width*s)/2,y+12,im.width*s,im.height*s);ctx.fillStyle='#352b28';ctx.font='16px sans-serif';ctx.fillText((i+1)+'. '+r.name.slice(0,42),x+12,y+728);ctx.fillText(r.width+' x '+r.height+' | JPEG opaco',x+12,y+753);ctx.fillText(r.elements.slice(0,52),x+12,y+778);});
  const plates={};
  for(const [name,prefix,h,top,cx] of [['calm','Girl_character',1080,0,810],['surprised','Generating_surprised',1540,-100,810]]){
   const im=images[inputs.findIndex(r=>r.name.startsWith(prefix))],c=document.createElement('canvas');c.width=1920;c.height=1080;const x=c.getContext('2d'),w=h*im.width/im.height,left=cx-w/2;
   x.fillStyle='#faf9f4';x.fillRect(0,0,1920,1080);
   // Reflect blank paper strips at their native aspect ratio. No stretched horizontal grain.
   const s=h/im.height,bw=96*s;
   for(let i=0;left-i*bw>0;i++){x.save();x.translate(left-i*bw,top);x.scale(i%2?s:-s,s);x.drawImage(im,0,0,96,im.height,i%2?-96:0,0,96,im.height);x.restore();}
   for(let i=0;left+w+i*bw<1920;i++){x.save();x.translate(left+w+i*bw,top);x.scale(i%2?s:-s,s);x.drawImage(im,im.width-96,0,96,im.height,i%2?0:-96,0,96,im.height);x.restore();}
   x.drawImage(im,left,top,w,h);
   plates[name]={url:c.toDataURL('image/png'),sourceIndex:inputs.findIndex(r=>r.name.startsWith(prefix)),parameters:{width:1920,height:1080,imageHeight:h,top,centerX:cx,paperExtension:'mirrored outer 96 source columns, same aspect ratio; no character mask'}};
  }
  return {contact:sheet.toDataURL('image/png'),plates,dimensions:inputs.map(({width,height,aspect})=>({width,height,aspect}))};
 },inputs);
 inventory.forEach((r,i)=>Object.assign(r,result.dimensions[i]));
 writeFileSync(stage+'/contact-sheet.png',Buffer.from(result.contact.split(',')[1],'base64'));
 json(stage+'/inventory.json',inventory);
 const md=['# Inventário visual — personagem fornecida','',...inventory.map((r,i)=>`## ${i+1}. ${r.name}\n\n- Caminho: \`${r.path}\`\n- ${r.format}, ${r.width} × ${r.height}, proporção ${r.aspect.toFixed(4)}, ${r.bytes} bytes. Canal alfa: ${r.alphaChannel}; transparência real: ${r.realTransparency}.\n- Elementos: ${r.elements}.\n- Função: ${r.role}.\n- Fundo/compatibilidade: ${r.backgroundAndCompatibility}.\n- SHA-256: \`${r.sha256}\`.\n`)];
 writeFileSync('docs/PERSONAGEM_INVENTORY.md',md.join('\n'));
 const candidate=stage+'/candidate';mkdirSync(candidate,{recursive:true});
 const terms='Imagens fornecidas pelo usuário em docs/imgs/personagem, geradas previamente por IA. O usuário solicitou este piloto local com estes arquivos. Provedor, modelo, prompt, parâmetros e condições de licença não foram fornecidos. Uso comercial e publicação externa NÃO verificados. Admissão restrita ao piloto local; este registro não é uma licença nem comprovação de direitos. Originais preservados por caminho e SHA-256; não são servidos pelo estúdio.';
 writeFileSync(candidate+'/local-use.txt',terms);
 const descriptor=path=>{const b=readFileSync(candidate+'/'+path);return {path,bytes:b.length,sha256:sha256(b)};};
 const derivations=[];
 for(const [name,plate]of Object.entries(result.plates)){
  writeFileSync(candidate+'/'+name+'.png',Buffer.from(plate.url.split(',')[1],'base64'));
  const src=inventory[plate.sourceIndex];derivations.push({path:name+'.png',source:src.path,sourceSha256:src.sha256,tool:'Canvas2D / scripts/prepare-personagem.mjs',operation:'Opaque paper illustration composition; no segmentation, recoloring or face replacement',operator:'Codex',parameters:plate.parameters});
 }
 // Source records are small private evidence; large originals stay intact in their supplied location.
 json(candidate+'/source-records.json',inventory);
 const m={schemaVersion:1,id:'menina-aquarela',version:'1.0.1',profile:'illustration-2d',style:'watercolor',entry:'calm.png',
  usage:{scope:'local-pilot',publication:'unverified'},
  origin:{kind:'generated',userProvided:true,author:'unknown (user supplied files)',source:'local:docs/imgs/personagem',date:'2026-10-22',generation:{provider:'unknown',model:'unknown',prompt:null,parameters:null,seed:null,jobId:null,references:[],unknownFields:['provider','model','prompt','parameters','seed','jobId','license']}},
  license:{identifier:'unknown',url:'local:local-use.txt',commercial:null,status:'unverified',reviewedBy:'Codex: user request for local pilot only; no rights verification',reviewedAt:'2026-10-22',evidence:['local-use.txt']},
  identity:{name:'Menina de vestido amarelo — imagens do usuário',modelVersion:'1.0.1',paletteVersion:'1.0.0',proportionsVersion:'1.0.0',palette:['#F8F6EE','#E4C77E','#795136','#E7BA9E','#53382B']},
  available:{views:['illustration'],poses:['plate'],expressions:['calm','surprised']},
  actor:{schemaVersion:1,size:[1920,1080],composition:'scene-order-paper-grain',views:{illustration:{poses:{plate:{parts:[{id:'illustration',parent:null,image:'calm.png',pivot:[960,540],offset:[0,0],z:0,rotation:[0,0],variants:{calm:'calm.png',surprised:'surprised.png'}}]}}}}},
  visualProfile:{medium:'watercolor on supplied paper',layers:['complete opaque illustration'],joints:[],faceReplacement:false,expressionsAreWholeIllustrations:true},
  validation:{status:'prepared-awaiting-visual-review',limitations:['No independent limbs, eyelids, gaze or head turn','Separate drawings differ in anatomy','Rights unverified; local pilot only']},
  files:['calm.png','surprised.png'].map(descriptor),evidence:['local-use.txt','source-records.json'].map(descriptor),derivations};
 json(candidate+'/manifest.json',m);
 if(process.argv.includes('--admit')){
  // Retire this task's rejected first preparation; retain its immutable files for audit.
  const index=JSON.parse(readFileSync('assets/catalog.json'));
  if(index.entries.some(p=>p.id==='menina-aquarela'&&p.version==='1.0.0'&&p.manifestSha256==='cc57caab1dd4e3fe2d116c19ddbeb4c8f1213e683ea07f1240576c20ce2906f9')){
   index.entries=index.entries.filter(p=>!(p.id==='menina-aquarela'&&p.version==='1.0.0'));json('assets/catalog.json',index);
  }
  const pin=importAsset(resolve(candidate+'/manifest.json'));json(stage+'/pin.json',pin);console.log(JSON.stringify(pin));
 }
 console.log('Prepared '+stage+'; originals untouched. '+inventory.length+' images.');
}finally{await closeBrowser(browser);}
