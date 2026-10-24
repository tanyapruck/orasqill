import { test } from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync,mkdirSync,renameSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runPlan} from '../bin/plan-ledger.mjs';
import {run as handoff,findCurrentTask} from '../bin/manual-handoff.mjs';

function setup(t) {
  const repo=mkdtempSync(path.join(tmpdir(),'orchestrator-test-'));
  t.after(()=>rmSync(repo,{recursive:true,force:true}));
  execFileSync('git',['init','-q',repo]);
  writeFileSync(path.join(repo,'.gitignore'),'.agent-workflow/state/\n');
  writeFileSync(path.join(repo,'file.txt'),'baseline\n');
  execFileSync('git',['-C',repo,'add','.']);
  execFileSync('git',['-C',repo,'-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','initial']);
  mkdirSync(path.join(repo,'.agent-workflow'),{recursive:true});
  const call=(...args)=>runPlan(args,repo);
  const state=()=>JSON.parse(readFileSync(path.join(repo,'.agent-workflow/state/t1/task.json'),'utf8'));
  const plan=()=>JSON.parse(readFileSync(path.join(repo,'.agent-workflow/state/t1/plan.json'),'utf8'));
  const file=(name)=>path.join(repo,'.agent-workflow/state/t1',name);
  const start=()=>call('start','t1','--goal','Fix targeted behavior','--step','Implement target','--step','Validate target','--accept','Target behaves correctly');
  const steps=()=>{call('step','t1','--step','S1','--evidence','diff inspected');call('step','t1','--step','S2','--evidence','tests observed');};
  return {repo,call,state,plan,file,start,steps};
}

test('initial plan and checkpoint are ignored and preserve clean Git status',t=>{
  const f=setup(t);const result=f.start();
  assert.match(result,/plan\.md$/);assert.equal(f.state().status,'active');
  assert.equal(f.plan().steps.length,2);
  assert.equal(execFileSync('git',['-C',f.repo,'status','--porcelain'],{encoding:'utf8'}).trim(),'');
  assert.match(readFileSync(f.file('handoff.md'),'utf8'),/Locked execution plan/);
});

test('start requires steps and acceptance without creating checkpoint',t=>{
  const f=setup(t);
  assert.throws(()=>f.call('start','t1','--goal','no steps','--accept','yes'),/PLAN_REQUIRED/);
  assert.throws(()=>f.call('start','t1','--goal','no acceptance','--step','one'),/PLAN_REQUIRED/);
  assert.equal(existsSync(f.file('task.json')),false);
});

test('step order and evidence are required',t=>{
  const f=setup(t);f.start();
  assert.throws(()=>f.call('step','t1','--step','S2','--evidence','not yet'),/OUT_OF_PLAN_OR_ORDER/);
  assert.throws(()=>f.call('step','t1','--step','S1'),/missing --evidence/);
  f.call('step','t1','--step','S1','--evidence','checked');
  assert.equal(f.plan().steps[0].status,'done');
  assert.throws(()=>f.call('step','t1','--step','S1','--evidence','repeat'),/OUT_OF_PLAN_OR_ORDER/);
});

test('deferred findings are recorded without blocking planned work',t=>{
  const f=setup(t);f.start();f.call('finding','t1','--description','Optional cleanup','--impact','Low','--reason','Unrelated','--necessary','no');
  assert.equal(f.plan().findings[0].status,'deferred');
  f.steps();f.call('check','t1','--status','pass','--accept','A1','--result','node --test: passed');f.call('finish','t1');
  assert.match(readFileSync(f.file('final-report.md'),'utf8'),/Optional cleanup/);
  assert.equal(f.state().status,'finished');
});

test('essential finding pauses further step completion pending approval',t=>{
  const f=setup(t);f.start();f.call('finding','t1','--description','Required API','--impact','Blocks target','--reason','Prerequisite','--necessary','yes');
  assert.equal(f.plan().findings[0].status,'approval-required');
  assert.throws(()=>f.call('step','t1','--step','S1','--evidence','attempt'),/APPROVAL_REQUIRED/);
  assert.match(readFileSync(f.call('report','t1'),'utf8'),/BLOCKED_AWAITING_APPROVAL/);
  assert.throws(()=>f.call('finish','t1'),/PLAN_INCOMPLETE/);
});

test('approved prerequisite can be inserted before unfinished baseline step',t=>{
  const f=setup(t);f.start();
  f.call('step','t1','--step','S1','--evidence','target encountered missing prerequisite');
  f.call('finding','t1','--description','API prerequisite','--impact','Blocking S2','--reason','Needed now','--necessary','yes');
  assert.throws(()=>f.call('amend','t1','--finding','F1','--step','Add API','--before','S2'),/missing --approvalref/);
  f.call('amend','t1','--finding','F1','--step','Approved API','--before','S2','--approvalref','User explicitly approved F1');
  assert.deepEqual(f.plan().steps.map(x=>x.id),['S1','S3','S2']);
  assert.throws(()=>f.call('step','t1','--step','S2','--evidence','too soon'),/OUT_OF_PLAN_OR_ORDER/);
  f.call('step','t1','--step','S3','--evidence','API implemented');
  f.call('step','t1','--step','S2','--evidence','smoke checked');
  f.call('check','t1','--status','pass','--accept','A1','--result','test passed');f.call('finish','t1');
  assert.equal(f.state().status,'finished');
  assert.match(readFileSync(f.file('final-report.md'),'utf8'),/Approved API/);
});

test('manual finish cannot bypass incomplete plan and leaves task visible to resume',t=>{
  const f=setup(t);f.start();
  f.call('finding','t1','--description','Missing API','--impact','Blocked','--reason','Required','--necessary','yes');
  assert.throws(()=>handoff(['finish','t1'],f.repo),/PLAN_INCOMPLETE/);
  assert.equal(f.state().status,'active');
  assert.equal(f.plan().status,'active');
  assert.equal(findCurrentTask(f.repo),'t1');
  assert.equal(existsSync(f.file('final-report.md')),false);
});

test('manual finish rejects approval-required finding with completed steps',t=>{
  const f=setup(t);f.start();f.steps();f.call('check','t1','--status','pass','--accept','A1','--result','PASS');
  f.call('finding','t1','--description','Additional required','--impact','Needed','--reason','scope','--necessary','yes');
  assert.throws(()=>handoff(['finish','t1'],f.repo),/APPROVAL_REQUIRED/);
  assert.equal(f.state().status,'active');
});

test('manual finish cannot close a plan without finalization and report',t=>{
  const f=setup(t);f.start();f.steps();
  assert.throws(()=>handoff(['finish','t1'],f.repo),/VALIDATION_REQUIRED/);
  f.call('check','t1','--status','pass','--accept','A1','--result','tests: PASS');
  f.call('report','t1'); // Draft only.
  assert.throws(()=>handoff(['finish','t1'],f.repo),/PLAN_NOT_FINALIZED/);
  assert.equal(f.state().status,'active');
  f.call('finish','t1');
  assert.equal(f.state().status,'finished');assert.equal(f.plan().status,'finished');
  assert.match(readFileSync(f.file('final-report.md'),'utf8'),/PLAN COMPLETE/);
  assert.doesNotThrow(()=>handoff(['finish','t1'],f.repo));
  assert.throws(()=>handoff(['resume'],f.repo),/NO_HANDOFF/);
});

test('cannot spoof finalized plan without report',t=>{
  const f=setup(t);f.start();f.steps();f.call('check','t1','--status','pass','--accept','A1','--result','PASS');
  writeFileSync(f.file('plan.json'),JSON.stringify({...f.plan(),status:'finished'}));
  assert.throws(()=>handoff(['finish','t1'],f.repo),/FINAL_REPORT_REQUIRED/);
  assert.equal(f.state().status,'active');
});

test('resume surfaces locked plan and pending user approval',t=>{
  const f=setup(t);f.start();f.call('finding','t1','--description','API','--impact','Blocked','--reason','Needed','--necessary','yes');
  const p=handoff(['resume'],f.repo);const text=readFileSync(p,'utf8');
  assert.match(text,/Locked execution plan/);assert.match(text,/Pending approvals: 1/);
});

test('branch mismatch fails closed',t=>{
  const f=setup(t);f.start();execFileSync('git',['-C',f.repo,'checkout','-qb','another']);
  assert.throws(()=>f.call('report','t1'),/BRANCH_MISMATCH/);
});

test('detached HEAD fails before state is created',t=>{
  const f=setup(t);execFileSync('git',['-C',f.repo,'checkout','--detach','-q']);
  assert.throws(()=>f.start(),/DETACHED_HEAD/);
  assert.equal(existsSync(f.file('task.json')),false);
});

test('symlink or junction on state directory blocked',t=>{
  const f=setup(t);f.start();const out=mkdtempSync(path.join(tmpdir(),'orchestrator-out-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
  const dir=path.join(f.repo,'.agent-workflow/state/t1');
  const backup=path.join(out,'task');renameSync(dir,backup);
  symlinkSync(backup,dir,process.platform==='win32'?'junction':'dir');
  assert.throws(()=>f.call('report','t1'),/unsafe state path/);
});

test('dangling symlinked plan is blocked',t=>{
  if(process.platform==='win32'){t.skip('Creating file symlinks requires Windows Developer Mode; junction coverage above');return;}
  const f=setup(t);f.start();unlinkSync(f.file('plan.json'));symlinkSync('/not/a/real/plan.json',f.file('plan.json'));
  assert.throws(()=>f.call('report','t1'),/unsafe state file/);
});

test('legacy handoff without plan still supports finish',t=>{
  const f=setup(t);handoff(['start','t1','--goal','legacy'],f.repo);
  handoff(['finish','t1'],f.repo);assert.equal(f.state().status,'finished');
});

// F6: completion needs structured, acceptance-linked, latest passing evidence.
test('failed or blocked checks cannot close a fully completed plan', t=>{
  const f=setup(t);f.start();f.steps();
  for (const status of ['fail','blocked']) {
    f.call('check','t1','--status',status,'--accept','A1','--result',`npm test: ${status}`);
    assert.throws(()=>f.call('finish','t1'),/VALIDATION_REQUIRED.*A1/);
    assert.equal(f.state().status,'active');
  }
  f.call('check','t1','--status','pass','--accept','A1','--result','npm test: 59/59 pass after fix');
  assert.doesNotThrow(()=>f.call('finish','t1'));
});

test('each acceptance must have a latest passing check and no failures can be hidden',t=>{
  const f=setup(t);
  f.call('start','t1','--goal','Check multi-acceptance gates','--step','Implement','--step','Test','--accept','Behavior','--accept','Regression');
  f.steps();
  assert.throws(()=>f.call('check','t1','--result','PASS'),/missing --status/);
  assert.throws(()=>f.call('check','t1','--status','pass','--accept','A3','--result','wrong id'),/VALIDATION_REQUIRED/);
  f.call('check','t1','--status','pass','--accept','A1','--result','behavior passes');
  assert.throws(()=>f.call('finish','t1'),/VALIDATION_REQUIRED.*A2/);
  f.call('check','t1','--status','pass','--accept','A2','--result','regression passes');
  f.call('check','t1','--status','fail','--accept','A1','--result','behavior regressed');
  assert.throws(()=>handoff(['finish','t1'],f.repo),/VALIDATION_REQUIRED.*A1/);
  assert.throws(()=>f.call('finish','t1'),/VALIDATION_REQUIRED.*A1/);
  f.call('check','t1','--status','pass','--accept','A1','--result','retest after correction passes');
  f.call('finish','t1');assert.equal(f.state().status,'finished');
});

test('legacy free text validation evidence fails closed until replaced by structured checks', t=>{
  const f=setup(t);f.start();f.steps();
  writeFileSync(f.file('plan.json'),JSON.stringify({...f.plan(),checks:['old unstructured validation']}));
  assert.throws(()=>f.call('finish','t1'),/VALIDATION_MIGRATION_REQUIRED/);
  assert.equal(f.state().status,'active');
});

// F8: both finish entrypoints require an independent reviewer attestation for HIGH_RISK.
test('high risk finish requires independent positive review evidence',t=>{
  const f=setup(t);
  f.call('start','t1','--goal','Security critical change','--risk','HIGH_RISK','--owner','Implementer','--step','Implement','--step','Validate','--accept','Security check');
  f.steps();f.call('check','t1','--status','pass','--accept','A1','--result','actual security test observed pass');
  assert.throws(()=>f.call('finish','t1'),/INDEPENDENT_REVIEW_REQUIRED/);
  assert.throws(()=>handoff(['finish','t1'],f.repo),/INDEPENDENT_REVIEW_REQUIRED/);
  assert.throws(()=>f.call('review','t1','--reviewer','Reviewer','--evidence','PR comment','--independent','no','--result','pass'),/INDEPENDENT_REVIEW_REQUIRED/);
  f.call('review','t1','--reviewer','Implementer','--evidence','self-review','--independent','yes','--result','pass');
  assert.throws(()=>f.call('finish','t1'),/INDEPENDENT_REVIEW_REQUIRED/);
  f.call('review','t1','--reviewer','Reviewer','--evidence','PR #123 review signed by eligible reviewer','--independent','yes','--result','fail');
  assert.throws(()=>f.call('finish','t1'),/INDEPENDENT_REVIEW_REQUIRED/);
  f.call('review','t1','--reviewer','Reviewer','--evidence','PR #123 approved by eligible independent reviewer','--independent','yes','--result','pass');
  f.call('finish','t1');
  assert.equal(f.state().status,'finished');
  assert.match(readFileSync(f.file('final-report.md'),'utf8'),/PR #123 approved/);
});

test('HIGH_RISK legacy handoff cannot bypass missing plan or reviewer evidence',t=>{
  const f=setup(t);
  handoff(['start','t1','--goal','Legacy risky migration','--risk','HIGH_RISK'],f.repo);
  assert.throws(()=>handoff(['finish','t1'],f.repo),/PLAN_REQUIRED/);
  assert.equal(f.state().status,'active');
});
