import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalog, ROOT, parseArgs, interval, number, run, sourceSnapshot, assertSourceHash } from '../scripts/render-lib.mjs';

test('project/style resolution is immutable and validates compatibility', () => {
  const p = catalog();
  for (const style of ['watercolor','cartoon','pixel']) {
    const project = p.resolveProject('visit',style);
    assert.equal(project.style,style); assert.ok(Object.isFrozen(project.styleConfig.palette));
    assert.throws(()=>{project.styleConfig.palette.ink='#ffffff';},TypeError);
  }
  assert.equal(p.resolveProject().duration,11);
  assert.throws(()=>p.resolveProject('demo','pixel'),/compatível/);
  assert.throws(()=>p.resolveProject('unknown'),/desconhecido/);
  assert.throws(()=>p.resolveProject('visit','3d'),/desconhecido/);
});
test('storyboard rejects gaps, overlap, duplicate IDs and incomplete films',()=>{
  const p=catalog(), source=p.projects.visit;
  const copy=()=>JSON.parse(JSON.stringify(source));
  let film=copy();film.storyboard[1].start=3.2;assert.throws(()=>p.validateStoryboard(film),/Intervalo/);
  film=copy();film.storyboard[0].reads[1].start=.2;assert.throws(()=>p.validateStoryboard(film),/sobrepostas/);
  film=copy();film.storyboard[1].id='arrival';assert.throws(()=>p.validateStoryboard(film),/únicos/);
  film=copy();film.duration=7;assert.throws(()=>p.validateStoryboard(film),/duração/);
  film=copy();film.storyboard[1].style='pixel';assert.throws(()=>p.validateStoryboard(film),/projeto inteiro/);
});
test('style overrides are scoped, validated and do not change defaults',()=>{
  const p=catalog();
  const register=(id,styleOptions)=>p.registerProject({...JSON.parse(JSON.stringify(p.projects.visit)),id,styleOptions});
  register('blue',{cartoon:{palette:{body:'#527E69'}}});
  assert.equal(p.resolveProject('blue','cartoon').styleConfig.palette.body,'#527E69');
  assert.equal(p.resolveProject('visit','cartoon').styleConfig.palette.body,'#ED8660');
  register('typo',{cartoon:{palette:{boody:'#FFFFFF'}}});assert.throws(()=>p.resolveProject('typo','cartoon'),/desconhecida/);
  register('bad-grid',{pixel:{texture:{scale:7}}});assert.throws(()=>p.resolveProject('bad-grid','pixel'),/dividir/);
  register('bad-color',{cartoon:{palette:{body:'red'}}});assert.throws(()=>p.resolveProject('bad-color','cartoon'),/Cor inválida/);
});
test('motion preserves anticipation, arc endpoints and order-independent choreography',()=>{
  const project=catalog().resolveProject('visit','cartoon'), context=vm.createContext({PROJECT:project,STYLE:project.styleConfig,window:{}});
  for(const file of ['src/motion.js','src/timeline.js','src/scenes/visit.js'])vm.runInContext(readFileSync(join(ROOT,file),'utf8'),context);
  assert.equal(vm.runInContext('jump(.8,1,2).dy',context),0);
  assert.ok(vm.runInContext('jump(.95,1,2).sq > 0',context));
  assert.equal(vm.runInContext('jump(1.5,1,2,3).dy',context),-3);
  assert.equal(vm.runInContext('JSON.stringify(arcPt([0,0],[10,20],30,1))',context),'[10,20]');
  const first=JSON.stringify(context.window.visitPose(2.8)); context.window.visitPose(5.9);
  assert.equal(JSON.stringify(context.window.visitPose(2.8)),first);
  const p=context.window.visitPose(2.8);assert.equal(p.butterfly[0],p.head[0]);assert.equal(p.butterfly[1]+8,p.head[1]);
  for(const t of [2.4,3.7])assert.ok(Math.abs(context.window.visitPose(t-1e-7).flap-context.window.visitPose(t+1e-7).flap)<1e-5,'Asas mudaram de fase');
  vm.runInContext('validateShots()',context);
  assert.throws(()=>vm.runInContext('shots([[3,()=>{}]])',context),/Dois planos/);
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
