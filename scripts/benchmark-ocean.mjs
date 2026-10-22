// Run 720p/12 first, inspect it, then run 1080p/24. Separate runs preserve review gates.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs,run,ROOT,sourceHash} from './render-lib.mjs';
const args=parseArgs(process.argv.slice(2)),resolution=args.resolution,fps=Number(args.fps),software=!!args['soft-gl'];
assert.ok((resolution==='720p'&&fps===12)||(resolution==='1080p'&&fps===24),'Use 720p/12 ou 1080p/24');
assert.ok(Object.keys(args).every(k=>['resolution','fps','soft-gl'].includes(k)));
const stamp=sourceHash(),backend=software?'swiftshader':'hardware';
const out=join('out','ocean-encounter','revisions',stamp.slice(0,12),`${resolution}-${fps}fps`,backend,'video.mp4');
assert.ok(!existsSync(out),'Preserve o render existente: '+out);
const started=performance.now();
await run(process.execPath,[join(ROOT,'render.mjs'),'--project=ocean-encounter','--resolution='+resolution,'--fps='+fps,'--clip','--out='+out,...(software?['--soft-gl']:[])],{capture:true});
const externalProcessMs=Math.round(performance.now()-started),path=out+'.review/report.json',report=JSON.parse(readFileSync(path,'utf8'));
assert.equal(report.sourceHash,stamp);assert.equal(report.duration,8);assert.equal(report.fps,fps);assert.equal(report.frames,8*fps);assert.equal(report.height,resolution==='720p'?720:1080);
report.performance={externalProcessMs,backend,scope:'Full Node child process start through exit, including server/browser cleanup; one render at a time'};
writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file:out,externalProcessMs,timing:report.timing,frames:report.frames,bytes:report.bytes,engine:report.environment.engine},null,2));
