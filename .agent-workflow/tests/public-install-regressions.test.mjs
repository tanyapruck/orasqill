import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
import {installUserCommands} from '../bin/user-commands.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const bin=path.join(repo,'.agent-workflow/bin');
function temp(t){const dir=mkdtempSync(path.join(tmpdir(),'orasqill-regression-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
test('symlinked npm-style bin entrypoints execute instead of exiting silently',t=>{
  const dir=temp(t);
  for(const name of ['oranit','orasqill']){
    const linked=path.join(dir,name);
    try{symlinkSync(path.join(bin,name+'.mjs'),linked,'file');}
    catch(e){if(process.platform==='win32'&&['EPERM','EACCES'].includes(e.code)){t.skip('symlink privilege unavailable');return;}throw e;}
    const r=spawnSync(process.execPath,[linked,'--help'],{encoding:'utf8'});
    assert.notEqual(r.stdout.trim()+r.stderr.trim(),'','CLI must not exit silently');
  }
  const help=spawnSync(process.execPath,[path.join(dir,'orasqill'),'help'],{encoding:'utf8'});
  assert.equal(help.status,0,help.stderr);
  assert.match(help.stdout,/orasqill configure/);
});
test('deps command works through the facade and its direct entrypoint',()=>{
  for(const argv of [
    [path.join(bin,'orasqill.mjs'),'deps','list'],
    [path.join(bin,'external-skills.mjs'),'list']
  ]){
    const result=spawnSync(process.execPath,argv,{cwd:repo,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/karpathy-guidelines\t/, 'expected dependency metadata');
  }
});
test('global plan command writes only to the current initialized project',t=>{
  const project=temp(t);
  execFileSync('git',['init','-q',project]);
  execFileSync('git',['-C',project,'config','user.email','test@example.test']);
  execFileSync('git',['-C',project,'config','user.name','Orasqill Test']);
  writeFileSync(path.join(project,'README.md'),'Project\n');
  execFileSync('git',['-C',project,'add','README.md']);
  execFileSync('git',['-C',project,'commit','-qm','init']);
  const init=spawnSync(process.execPath,[path.join(bin,'oranit.mjs'),'--workspace',project],{encoding:'utf8'});
  assert.equal(init.status,0,init.stderr);
  const run=spawnSync(process.execPath,[path.join(bin,'orasqill.mjs'),'plan','start','my-test','--goal','G','--step','S','--accept','A'],{cwd:project,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const task=path.join(project,'.agent-workflow/state/my-test/plan.json');
  assert.ok(existsSync(task),'state must be in invoking project');
  const plan=JSON.parse(readFileSync(task,'utf8'));
  assert.equal(plan.taskId,'my-test');
  assert.equal(realpathSync.native(plan.repo).toLowerCase(),realpathSync.native(project).toLowerCase());
  const handoff=spawnSync(process.execPath,[path.join(bin,'orasqill.mjs'),'handoff','start','handoff-test','--goal','G'],{cwd:project,encoding:'utf8'});
  assert.equal(handoff.status,0,handoff.stderr);
  const handoffState=path.join(project,'.agent-workflow/state/handoff-test/task.json');
  assert.ok(existsSync(handoffState),'Handoff state must belong to the invoking project');
  const state=JSON.parse(readFileSync(handoffState,'utf8'));
  assert.equal(realpathSync.native(state.repo).toLowerCase(),realpathSync.native(project).toLowerCase());
  assert.equal(state.startHead,execFileSync('git',['-C',project,'rev-parse','HEAD'],{encoding:'utf8'}).trim());
});
test('global plan command refuses an uninitialized project instead of modifying checkout',t=>{
  const project=temp(t);
  execFileSync('git',['init','-q',project]);
  const run=spawnSync(process.execPath,[path.join(bin,'orasqill.mjs'),'plan','start','my-test','--goal','G','--step','S','--accept','A'],{cwd:project,encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/WORKSPACE_NOT_INITIALIZED/);
});
test('user-level command installation preserves existing content and never installs orchestrator globally',t=>{
  const home=temp(t);
  const preview=installUserCommands({home,dryRun:true});
  assert.equal(preview.actions.length,4);
  assert.ok(preview.actions.every(x=>x.operation==='install'));
  assert.equal(existsSync(path.join(home,'.agents')),false);
  const result=installUserCommands({home});
  assert.ok(result.actions.every(x=>x.operation==='install'));
  assert.ok(existsSync(path.join(home,'.claude/skills/oranit/SKILL.md')));
  assert.ok(existsSync(path.join(home,'.agents/skills/configure-models/SKILL.md')));
  assert.equal(existsSync(path.join(home,'.agents/skills/agent-workflow-orchestrator')),false);
  const custom=path.join(home,'.agents/skills/oranit/SKILL.md');
  writeFileSync(custom,'Custom user content\n');
  const again=installUserCommands({home});
  assert.equal(again.actions.find(x=>x.file==='.agents/skills/oranit/SKILL.md').operation,'preserved');
  assert.equal(readFileSync(custom,'utf8'),'Custom user content\n');
  const refreshed=installUserCommands({home,refresh:true});
  assert.equal(refreshed.actions.find(x=>x.file==='.agents/skills/oranit/SKILL.md').operation,'update');
  assert.notEqual(readFileSync(custom,'utf8'),'Custom user content\n');
});
