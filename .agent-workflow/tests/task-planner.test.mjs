import {test} from 'node:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {resource,conflicts,validatePlan,validateSchedulerBinding,makeSchedule} from '../bin/task-planner.mjs';
const task=(id,p=`${id}.ts`,extras={})=>({id,risk:'STANDARD',objective:id,dependsOn:[],resources:{read:[],write:[p]},...extras});
const trusted={allowParallel:true,maxWorkers:5,runtime:{maxWorkers:5,supportsConcurrentWorkers:true,enforcesOwnership:true,enforcesIsolation:true}};
test('resource sanitization rejects absolute paths, traversal and globs',()=>{
  for(const p of ['../bad','/abs','C:\\root','a//b','*.ts','a/./b',''])assert.throws(()=>resource(p));
  assert.equal(resource('src\\good.js'),'src/good.js');
});
test('logical resources are exact, not filesystem path aliases',()=>{
  assert.equal(conflicts(task('a','res:DB'),task('b','res:db'),'win32'),false);
  assert.equal(conflicts(task('a','res:DB'),task('b','res:DB'),'win32'),true);
});
test('Windows case alias writes conflict, including parent folder',()=>{
  assert.equal(conflicts(task('a','src/Same.ts'),task('b','SRC/same.TS'),'win32'),true);
  assert.equal(conflicts(task('a','src'),task('b','SRC/same.TS'),'win32'),true);
  assert.equal(conflicts(task('a','src/Same.ts'),task('b','SRC/same.TS'),'linux'),false);
});
test('standard tasks remain sequential without actual confirmed isolation',()=>{
  const s=makeSchedule({tasks:[task('a'),task('b')]});
  assert.equal(s.mode,'SEQUENTIAL');assert.equal(s.workerCount,1);assert.equal(s.integrationReady,false);
});
test('safe independent tasks can receive advisory parallel wave under trusted limits',()=>{
  const s=makeSchedule({tasks:[task('a'),task('b')]},trusted,'linux');
  assert.equal(s.mode,'ADAPTIVE_PARALLEL');assert.deepEqual(s.waves,[['a','b']]);assert.equal(s.integrationReady,false);
});
test('dependency cannot execute in same wave as its prerequisite',()=>{
  const s=makeSchedule({tasks:[task('a'),task('b','b.ts',{dependsOn:['a']})]},trusted,'linux');
  assert.deepEqual(s.waves,[['a'],['b']]);
});
test('high-risk flags elevate STANDARD task risk and require independent review and authority',()=>{
  for(const flag of ['security_sensitive','schema_change','migration','destructive','irreversible','production_sensitive']){
    const s=makeSchedule({tasks:[task('a','a.ts',{flags:[flag]}),task('b')]},trusted);
    assert.equal(s.requiresIndependentReview,true,flag);
    assert.equal(s.requiresPreActionAuthority,true,flag);
    assert.equal(s.mode,'SEQUENTIAL',flag);
  }
});
test('dependency cycles and duplicate task identifiers reject',()=>{
  assert.throws(()=>validatePlan({tasks:[task('a'),task('a')]}),/duplicate/);
  assert.throws(()=>validatePlan({tasks:[task('a','a',{dependsOn:['b']}),task('b','b',{dependsOn:['a']})]}),/cycle/);
});

test('scheduler graph and locked ledger are different schemas',()=>{
  const locked={schemaVersion:1,steps:[{id:'S1',text:'Implement approved scope',status:'pending'},{id:'S2',text:'Run tests',status:'pending'}]};
  assert.throws(()=>validatePlan(locked),/SCHEDULER_SCHEMA_REQUIRED/);
  const graph={tasks:[
    task('change','src/example.js',{planStepId:'S1',objective:'Implement approved scope'}),
    task('test','tests/example.test.js',{planStepId:'S2',objective:'Run tests',dependsOn:['change']})
  ]};
  assert.doesNotThrow(()=>validateSchedulerBinding(graph,locked));
  assert.deepEqual(makeSchedule(graph).waves,[['change'],['test']]);
  assert.throws(()=>validateSchedulerBinding({tasks:[task('bad','bad.js',{planStepId:'S3',objective:'Add unrelated feature'})]},locked),/OUT_OF_PLAN/);
  assert.throws(()=>validateSchedulerBinding({tasks:[task('bad','bad.js',{planStepId:'S1',objective:'Wrong objective'})]},locked),/OUT_OF_PLAN/);
  assert.throws(()=>validateSchedulerBinding({tasks:[task('a','a.js',{planStepId:'S1',objective:'Implement approved scope'}),task('b','b.js',{planStepId:'S1',objective:'Implement approved scope'})]},locked),/OUT_OF_PLAN/);
  locked.steps[0].status='done';
  assert.throws(()=>validateSchedulerBinding(graph,locked),/OUT_OF_PLAN/);
});


test('task-planner CLI rejects ledger steps as input and validates a distinct task graph against them',t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'orasqill-scheduler-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const locked={schemaVersion:1,steps:[{id:'S1',text:'Implement approved scope',status:'pending'}]};
  const graph={tasks:[task('change','src/a.js',{planStepId:'S1',objective:'Implement approved scope'})]};
  const lockedPath=path.join(dir,'plan.json'),tasksPath=path.join(dir,'scheduler-tasks.json');
  writeFileSync(lockedPath,JSON.stringify(locked));
  writeFileSync(tasksPath,JSON.stringify(graph));
  const script=fileURLToPath(new URL('../bin/task-planner.mjs',import.meta.url));
  const run=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
  assert.match(run([lockedPath]).stderr,/SCHEDULER_SCHEMA_REQUIRED/);
  const good=run([tasksPath,'--locked-plan',lockedPath]);
  assert.equal(good.status,0,good.stderr);
  assert.deepEqual(JSON.parse(good.stdout).waves,[['change']]);
  const mismatched={tasks:[task('add-feature','src/new.js',{planStepId:'S100',objective:'New work'})]};
  writeFileSync(tasksPath,JSON.stringify(mismatched));
  assert.match(run([tasksPath,'--locked-plan',lockedPath]).stderr,/OUT_OF_PLAN/);
});
