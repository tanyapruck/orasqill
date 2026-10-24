import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const load=name=>JSON.parse(readFileSync(path.join(root,'.agent-workflow/profiles',name+'.json'),'utf8'));
const profiles=['openai-orchestrator','claude-orchestrator'];
const stages=['triage','plan','implement','complex_implement','review','critical_review','final_report'];
const roles=['orchestrator','implementer','reviewer'];
const efforts=new Set(['low','medium','high','xhigh','max']);
const models={
  'gpt-6.1-sol':'codex','gpt-6-astra':'codex','gpt-6-luna':'codex',
  'claude-opus-5-5':'claude-code','claude-sonnet-5-5':'claude-code','claude-haiku-5-5':'claude-code'
};
const modelCandidate=(choice)=>{
  assert.ok(choice && typeof choice==='object','candidate must be an object');
  assert.equal(models[choice.model],choice.runtime,`unrecognized model or runtime: ${choice.model}`);
  assert.ok(efforts.has(choice.effort),`unknown effort: ${choice.effort}`);
};
const resolvedStage=(p,stage)=>{
  const x=p.stage_preferences[stage];
  assert.ok(x && typeof x.role==='string');
  return x.model?x:p.routing[x.role].preferred[0];
};

for(const name of profiles){
  test(`${name}: safe, non-executing role preset`,()=>{
    const p=load(name);
    assert.equal(p.version,1);
    assert.equal(p.setup.profile,name);
    assert.equal(p.setup.status,'unconfirmed');
    assert.equal(p.setup.authority,'user');
    assert.deepEqual(Object.keys(p.routing).sort(),roles.slice().sort());
    for(const role of roles){
      const x=p.routing[role];
      assert.equal(x.preferred.length,1);
      modelCandidate(x.preferred[0]);
      assert.deepEqual(x.fallback,[]);
    }
    assert.equal(p.routing.orchestrator.automatic_switching,false);
    assert.equal(p.routing.reviewer.require_independent_author,true);
    assert.deepEqual(p.workers,{});
    assert.deepEqual(p.runtimes,{});
    assert.deepEqual(p.delegation,{max_depth:1,max_parallel_workers:1});
    assert.deepEqual(p.task_execution,{mode:'sequential_children',max_active_child_tasks:1});
  });

  test(`${name}: complete model/effort stages and independent code reviewer`,()=>{
    const p=load(name);
    assert.deepEqual(Object.keys(p.stage_preferences).sort(),stages.slice().sort());
    for(const stage of stages)modelCandidate(resolvedStage(p,stage));
    for(const stage of ['plan','implement','review']){
      const x=p.stage_preferences[stage];
      assert.equal(x.model,undefined);
      assert.equal(x.runtime,undefined);
    }
    assert.equal(p.stage_preferences.plan.role,'orchestrator');
    assert.equal(p.stage_preferences.implement.role,'implementer');
    assert.equal(p.stage_preferences.review.role,'reviewer');
    assert.equal(p.stage_preferences.critical_review.role,'reviewer');
    const critical=resolvedStage(p,'critical_review');
    assert.equal(critical.effort,name==='claude-orchestrator'?'max':'xhigh');
    if(name==='claude-orchestrator')assert.equal(critical.requested_mode,'ultra');
    else assert.equal(critical.requested_mode,undefined);
    assert.notDeepEqual(resolvedStage(p,'implement'),resolvedStage(p,'review'));
    assert.notDeepEqual(resolvedStage(p,'complex_implement'),resolvedStage(p,'critical_review'));
  });
}

test('Claude-led profile uses Claude for planning, Codex for code and independent review',()=>{
  const p=load('claude-orchestrator');
  assert.deepEqual(p.routing.orchestrator.preferred[0],{runtime:'claude-code',model:'claude-opus-5-5',effort:'high'});
  assert.deepEqual(p.routing.implementer.preferred[0],{runtime:'codex',model:'gpt-6.1-sol',effort:'medium'});
  assert.deepEqual(p.routing.reviewer.preferred[0],{runtime:'codex',model:'gpt-6.1-sol',effort:'xhigh'});
  assert.deepEqual(p.stage_preferences.critical_review,{role:'reviewer',runtime:'codex',model:'gpt-6.1-sol',effort:'max',requested_mode:'ultra'});
  assert.equal(p.stage_preferences.complex_implement.model,'claude-sonnet-5-5');
  assert.equal(p.routing.orchestrator.automatic_switching,false);
  assert.equal(p.delegation.max_parallel_workers,1);
  assert.deepEqual(p.runtimes,{});
  assert.deepEqual(p.workers,{});
});

test('OpenAI-led profile uses Codex for planning and Claude for independent review',()=>{
  const p=load('openai-orchestrator');
  assert.deepEqual(p.routing.orchestrator.preferred[0],{runtime:'codex',model:'gpt-6.1-sol',effort:'high'});
  assert.deepEqual(p.routing.reviewer.preferred[0],{runtime:'claude-code',model:'claude-opus-5-5',effort:'high'});
  assert.equal(p.stage_preferences.complex_implement.model,'gpt-6-astra');
});

test('portable install documentation copies both profiles without enabling runtime access',()=>{
  const read=p=>readFileSync(path.join(root,p),'utf8');
  const guide=read('README.md');
  const setup=read('.agents/skills/agent-workflow-orchestrator/references/setup-routing.md');
  const ignore=read('.gitignore');
  for(const name of profiles){
    assert.match(guide,new RegExp(name+'\\.json'));
    assert.match(setup,new RegExp(name+'\\.json'));
  }
  assert.match(guide,/cp -R .*\.agent-workflow\/profiles/);
  assert.match(guide,/Copy-Item -Recurse .*\.agent-workflow\\profiles/);
  assert.match(guide,/setup\.status = "unconfirmed"/);
  assert.match(setup,/never.*launch|not a runtime dispatcher/i);
  assert.match(ignore,/^\.agent-workflow\/config\.json$/m);
  const base=JSON.parse(read('.agent-workflow/config.example.json'));
  assert.equal(base.setup.status,'unconfirmed');
  assert.deepEqual(base.routing.orchestrator.preferred,[]);
});
