import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalog, ROOT, parseArgs, interval, number, run, sourceSnapshot, assertSourceHash, frameTimes } from '../scripts/render-lib.mjs';

test('project/style resolution is immutable and validates compatibility', () => {
  const p = catalog();
  for (const style of ['watercolor-classic','cartoon','pixel']) {
    const project = p.resolveProject('smoke-visit',style);
    assert.equal(project.style,style); assert.ok(Object.isFrozen(project.styleConfig.palette));
    assert.throws(()=>{project.styleConfig.palette.ink='#ffffff';},TypeError);
  }
  assert.equal(p.resolveProject().id,'smoke-2d');
  assert.throws(()=>p.resolveProject('smoke-2d','pixel'),/compatível/);
  assert.throws(()=>p.resolveProject('unknown'),/desconhecido/);
  assert.throws(()=>p.resolveProject('smoke-visit','3d'),/desconhecido/);
});
test('storyboard rejects gaps, overlap, duplicate IDs and incomplete films',()=>{
  const p=catalog(), base=JSON.parse(JSON.stringify(p.projects['smoke-visit'])), [s0]=base.storyboard;
  // Dois planos de 1 s com duas leituras cada, a partir da cena de fumaça.
  const source={...base,storyboard:[{...s0,id:'arrival',end:1,reads:[{start:0,end:.5,text:'a'},{start:.5,end:1,text:'b'}]},{...s0,id:'goodbye',start:1,reads:[{start:1,end:2,text:'c'}]}]};
  p.validateStoryboard(source);const copy=()=>JSON.parse(JSON.stringify(source));
  let film=copy();film.storyboard[1].start=1.2;assert.throws(()=>p.validateStoryboard(film),/Intervalo/);
  film=copy();film.storyboard[0].reads[1].start=.2;assert.throws(()=>p.validateStoryboard(film),/sobrepostas/);
  film=copy();film.storyboard[1].id='arrival';assert.throws(()=>p.validateStoryboard(film),/únicos/);
  film=copy();film.duration=3;assert.throws(()=>p.validateStoryboard(film),/duração/);
  film=copy();film.storyboard[1].style='pixel';assert.throws(()=>p.validateStoryboard(film),/projeto inteiro/);
});
test('style overrides are scoped, validated and do not change defaults',()=>{
  const p=catalog();
  const register=(id,styleOptions)=>p.registerProject({...JSON.parse(JSON.stringify(p.projects['smoke-visit'])),id,styleOptions});
  register('blue',{cartoon:{palette:{body:'#527E69'}}});
  assert.equal(p.resolveProject('blue','cartoon').styleConfig.palette.body,'#527E69');
  assert.equal(p.resolveProject('smoke-visit','cartoon').styleConfig.palette.body,'#ED8660');
  register('typo',{cartoon:{palette:{boody:'#FFFFFF'}}});assert.throws(()=>p.resolveProject('typo','cartoon'),/desconhecida/);
  register('bad-grid',{pixel:{texture:{scale:7}}});assert.throws(()=>p.resolveProject('bad-grid','pixel'),/dividir/);
  register('bad-color',{cartoon:{palette:{body:'red'}}});assert.throws(()=>p.resolveProject('bad-color','cartoon'),/Cor inválida/);
});
test('motion preserves anticipation, arc endpoints and order-independent choreography',()=>{
  const project=catalog().resolveProject('smoke-visit','cartoon'), context=vm.createContext({PROJECT:project,STYLE:project.styleConfig,window:{}});
  for(const file of ['src/motion.js','src/timeline.js'])vm.runInContext(readFileSync(join(ROOT,file),'utf8'),context);
  assert.equal(vm.runInContext('jump(.8,1,2).dy',context),0);
  assert.ok(vm.runInContext('jump(.95,1,2).sq > 0',context));
  assert.equal(vm.runInContext('jump(1.5,1,2,3).dy',context),-3);
  assert.equal(vm.runInContext('JSON.stringify(arcPt([0,0],[10,20],30,1))',context),'[10,20]');
  vm.runInContext('shots([[0,()=>{}]]); validateShots()',context);
  assert.throws(()=>vm.runInContext('shots([[0,()=>{}]])',context),/Dois planos/);
});
test('per-project fps: 30 fps gets 900 frames on a 1/30 grid, 24 fps 720',()=>{
  const p=catalog(),base=JSON.parse(JSON.stringify(p.projects['smoke-2d'])),storyboard=[{...base.storyboard[0],end:30,reads:[{start:0,end:30,text:'a'}]}];
  for(const fps of [24,30])p.registerProject({...base,id:'fps-'+fps,fps,duration:30,reviewTimes:undefined,storyboard});
  const frames=id=>{const project=p.resolveProject(id);return frameTimes(interval(undefined,project.duration),project.fps);},times=frames('fps-30');
  assert.equal(times.length,900);assert.equal(times[1],1/30);assert.equal(times[899],899/30);
  assert.equal(frames('fps-24').length,720);
  assert.deepEqual(frameTimes([1,1.1],30),[1,1+1/30,1+2/30]);
});
test('CLI rejects invalid numeric ranges and keeps equals in paths',()=>{
  assert.equal(parseArgs(['--audio=C:/a=b/song.mp3']).audio,'C:/a=b/song.mp3');
  for(const n of [true,'','NaN','Infinity',0,-1])assert.throws(()=>number(n,'fps',{min:1}));
  for(const range of ['1:0','0:99','0:1:2','a:2'])assert.throws(()=>interval(range,6));
  assert.deepEqual(interval('1:3',6),[1,3]);
});
test('missing tools and failed subprocesses reject instead of reporting success',async()=>{
  await assert.rejects(run('animation-tool-that-does-not-exist',[],{capture:true}));
  await assert.rejects(run(process.execPath,['-e','process.exit(9)'],{capture:true}),/código 9/);
});
test('provenance records individual inputs and rejects a changed revision',()=>{
  const source=sourceSnapshot();
  assert.match(source.files['src/runtime.js'],/^[a-f0-9]{64}$/);
  assert.match(source.files['package-lock.json'],/^[a-f0-9]{64}$/);
  assertSourceHash(source.hash);
  assert.throws(()=>assertSourceHash('previous-revision'),/Código mudou/);
});
