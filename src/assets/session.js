import {ASSET_LIMITS} from './format.js';
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
export async function prepareAssets(refs,adapter){
 if(location.protocol!=='http:'||location.hostname!=='127.0.0.1')throw Error('Assets exigem HTTP local em 127.0.0.1');
 const controller=new AbortController(),items=new Map(),files={},urls=new Set();let disposed=false,total=0;
 const session={hash:null,items,disposed:false,bytes:0,estimatedTextureBytes:0,
  info(){return {assetHash:this.hash,count:items.size,bytes:this.bytes,estimatedTextureBytes:this.estimatedTextureBytes,disposed:this.disposed};},
  dispose(){if(disposed)return;disposed=true;this.disposed=true;controller.abort();for(const item of items.values())item.dispose?.();items.clear();for(const url of urls)URL.revokeObjectURL(url);urls.clear();}
 };
 // Assign before first await: pagehide/boot failure can cancel partially loaded sessions.
 window.assetSession=session;
 const fetchBytes=async url=>{const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('Falha de asset HTTP '+response.status);let n=0;const chunks=[];for await(const b of response.body){n+=b.length;if(n>ASSET_LIMITS.fileBytes)throw Error('Asset excede limite');chunks.push(b);}const bytes=new Uint8Array(n);let i=0;for(const b of chunks){bytes.set(b,i);i+=b.length;}return bytes;};
 try{
  const index=JSON.parse(new TextDecoder().decode(await fetchBytes('/assets/index.json')));
  for(const ref of refs){
   const meta=index.entries.find(a=>a.id===ref.id&&a.version===ref.version&&a.manifestSha256===ref.manifestSha256);if(!meta)throw Error('Asset não fixado/ausente');
   const buffers=new Map(),blobs=new Map(),base=new URL('/assets/packs/'+ref.id+'/'+ref.version+'/',location.origin).href;
   for(const file of meta.files){const bytes=await fetchBytes(base+file.path);if(bytes.length!==file.bytes||await digest(bytes)!==file.sha256)throw Error('Hash de asset divergente');total+=bytes.length;if(total>ASSET_LIMITS.totalBytes)throw Error('Sessão excede memória');buffers.set(file.path,bytes);const url=URL.createObjectURL(new Blob([bytes]));urls.add(url);blobs.set(new URL(file.path,base).href,url);}
   Object.assign(files,meta.snapshotFiles);session.estimatedTextureBytes+=meta.estimatedTextureBytes;if(session.estimatedTextureBytes>ASSET_LIMITS.decodedBytes)throw Error('Memória de texturas da sessão excedida');
   if(typeof adapter!=='function')throw Error('Este estilo não possui adaptador de assets implementado');
   const item=await adapter({meta,buffers,blobs,base,signal:controller.signal});if(disposed){item.dispose?.();throw Error('Sessão cancelada');}items.set(ref.id,item);
  }
  session.bytes=total;session.hash=await digest(new TextEncoder().encode(JSON.stringify(Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b))))));return session;
 }catch(error){session.dispose();throw error;}
}
