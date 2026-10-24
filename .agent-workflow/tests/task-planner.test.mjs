import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resource,conflicts,validatePlan,makeSchedule} from '../bin/task-planner.mjs';
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
