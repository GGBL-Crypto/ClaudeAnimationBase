import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { startStudioServer } from '../scripts/studio-server.mjs';
test('loopback server only serves explicit routes, rejects raw/encoded traversal and external links', async () => {
  const temp=await mkdtemp(join(tmpdir(),'animation-server-')), root=join(temp,'studio');
  await mkdir(join(root,'src'),{recursive:true});
  await writeFile(join(root,'studio.html'),'<p>studio</p>');await writeFile(join(root,'src','ok.js'),'window.ok=1;');
  await writeFile(join(temp,'private.js'),'private');
  await mkdir(join(temp,'external'));await writeFile(join(temp,'external','three.module.js'),'private dependency');
  await mkdir(join(root,'node_modules','three'),{recursive:true});
  await symlink(join(temp,'external'),join(root,'node_modules','three','build'),process.platform==='win32'?'junction':'dir');
  // Directory junctions work without Windows developer mode; file symlinks are checked when available.
  await symlink(temp,join(root,'src','escape'),process.platform==='win32'?'junction':'dir');
  let linkAvailable=true;
  try {await symlink(join(temp,'private.js'),join(root,'src','linked.js'),'file');}catch(e){if(e.code!=='EPERM')throw e;linkAvailable=false;}
  const server=await startStudioServer({root});
  const get=(path,method='GET',host=new URL(server.origin).host)=>new Promise((ok,bad)=>{
    const req=request(server.origin,{path,method,headers:{Host:host}},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>ok({status:res.statusCode,body,headers:res.headers}));});req.on('error',bad);req.end();
  });
  try {
    assert.equal(server.address.address,'127.0.0.1');
    assert.equal((await get('/studio.html')).status,200);
    const js=await get('/src/ok.js?x=1');assert.equal(js.status,200);assert.match(js.headers['content-type'],/javascript/);
    assert.equal((await get('/src/ok.js','HEAD')).body,'');
    for(const path of ['/../private.js','/src/../studio.html','/src/./ok.js','//studio.html','/src//ok.js','/%2e%2e/private.js','/src/%2e%2e/studio.html','/src/%252e%252e/ok.js','/src%2fok.js','/src%5cok.js','/src\\ok.js','/src/ok.js%00','/src/ok.js:stream','/.git/config','/package-lock.json','/out/secret','/src/escape/private.js','/node_modules/three/package.json']) {
      const r=await get(path);assert.ok([403,404].includes(r.status),path);assert.ok(!r.body.includes('private'),path);
    }
    if(linkAvailable)assert.equal((await get('/src/linked.js')).status,403);
    assert.equal((await get('/node_modules/three/build/three.module.js')).status,403,'Uma rota permitida não pode escapar pela junction');
    assert.equal((await get('/studio.html','POST')).status,405);
    assert.equal((await get('/studio.html','GET','attacker.example')).status,403);
  }finally{await server.close();await rm(temp,{recursive:true,force:true});}
});
