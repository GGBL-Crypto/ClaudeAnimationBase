import test from 'node:test';
import assert from 'node:assert/strict';
import { closeBrowser } from '../scripts/render-lib.mjs';
test('browser cleanup disposes pages and uses a bounded disconnect for a hung close',async()=>{
  let disposed=0,disconnected=0;
  const normal={process:()=>null,pages:async()=>[{evaluate:async()=>{disposed++;}}],close:async()=>{},disconnect:async()=>{disconnected++;}};
  assert.deepEqual(await closeBrowser(normal,50),{forced:false});assert.equal(disposed,1);assert.equal(disconnected,0);
  const hung={...normal,close:()=>new Promise(()=>{})};
  assert.deepEqual(await closeBrowser(hung,10),{forced:true});assert.equal(disconnected,1);assert.equal(disposed,2);
});
