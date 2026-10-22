import {validateLayered,layeredPose} from '../../assets/layered.js';
import {ASSET_LIMITS} from '../../assets/format.js';
window.prepareStyleAsset=async({meta,buffers,signal})=>{
 if(!['layered-2d','illustration-2d'].includes(meta.profile))throw Error('Aquarela exige perfil layered-2d ou illustration-2d');
 AnimationPlatform.freeze(meta.actor);AnimationPlatform.freeze(meta.identity);
 const rig=validateLayered({style:'watercolor',...meta},meta.capabilities),images=new Map(),bitmaps=new Map();let disposed=false,closed=0,releasedTextures=0;
 const item={actor:meta.actor,identity:meta.identity,
  prepare(){
   if(disposed)throw Error('Ator descartado');
   try{for(const [path,b]of bitmaps){const img=createImage(b.width,b.height);img.drawingContext.drawImage(b,0,0);img.setModified(true);images.set(path,img);b.close();closed++;}bitmaps.clear();}
   catch(error){item.dispose();throw error;}
  },
  sample:options=>{if(disposed)throw Error('Ator descartado');return layeredPose(meta.actor,options);},
  draw(x,y,scaleFactor,options){
   if(disposed||images.size!==rig.partsFiles.length)throw Error('Ator não preparado');
   if(![x,y,scaleFactor].every(Number.isFinite)||scaleFactor<=0||scaleFactor>4)throw Error('Transform global inválido');
   const parts=item.sample(options);flushBrush();push();translate(x,y);scale(scaleFactor);blendMode(BLEND);noTint();imageMode(CORNER);
   try{for(const p of parts){push();applyMatrix(...p.matrix);image(images.get(p.file),-p.pivot[0],-p.pivot[1]);pop();}}
   finally{pop();}
   return parts;
  },
  info(){return {disposed,images:images.size,bitmaps:bitmaps.size,closedBitmaps:closed,releasedTextures,estimatedResidentBytes:disposed?0:rig.partsFiles.reduce((n,p)=>n+meta.capabilities[p].width*meta.capabilities[p].height*2,0)*4};},
  dispose(){if(disposed)return;disposed=true;for(const b of bitmaps.values()){b.close();closed++;}bitmaps.clear();
   for(const img of images.values()){
    // p5 2.3.3 owns a Map keyed by image; remove both GPU texture and its cache entry.
    if(animationEngine.releaseActorImage(img))releasedTextures++;
    img.canvas.width=img.canvas.height=0;
   }images.clear();
  }
 };
 try{
  // RGBA canvas + p5 texture, no retained decoder copy after prepare.
  const resident=rig.partsFiles.reduce((n,p)=>n+meta.capabilities[p].width*meta.capabilities[p].height*8,0);if(resident>ASSET_LIMITS.decodedBytes)throw Error('Memória de partes excedida');
  for(const path of rig.partsFiles){
   if(signal.aborted)throw Error('Carga cancelada');const b=await createImageBitmap(new Blob([buffers.get(path)],{type:'image/png'}));bitmaps.set(path,b);
   if(signal.aborted)throw Error('Carga cancelada');const info=meta.capabilities[path];if(b.width!==info.width||b.height!==info.height)throw Error('Dimensões PNG divergentes');
   const c=document.createElement('canvas');c.width=b.width;c.height=b.height;const ctx=c.getContext('2d');ctx.drawImage(b,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let clear=0,visible=0,soft=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;else visible++;if(data[i]>0&&data[i]<255)soft++;}c.width=c.height=0;if(!visible||meta.profile==='layered-2d'&&!clear)throw Error('PNG sem transparência real');if(meta.profile==='illustration-2d'&&(clear||soft))throw Error('Ilustração exige papel opaco');
  }
  return item;
 }catch(error){item.dispose();throw error;}
};
