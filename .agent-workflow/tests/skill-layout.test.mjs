import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=name=>readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
const skill=read('.agents/skills/agent-workflow-orchestrator/SKILL.md');
const guide=read('README.md');
const names=['plan-execution.md','role-assignment.md','setup-routing.md','delegation.md','review-validation.md','manual-handoff.md','token-budget.md'];
for(const name of names) test(`optional reference is discoverable: ${name}`,()=>{
  assert.match(skill,new RegExp(`references/${name.replaceAll('.','\\.')}`));
  const file=path.join(root,'.agents/skills/agent-workflow-orchestrator/references',name);
  assert.ok(existsSync(file));assert.ok(readFileSync(file,'utf8').length>300);
});
test('plan-first and findings approval are canonical',()=>{
  for(const text of [skill,read('AGENTS.md')]){
    assert.match(text,/plan.*before/i);assert.match(text,/Finding/i);assert.match(text,/approval/i);
  }
  assert.match(skill,/Final Acceptance/);
});
test('root Claude shares AGENTS rules without duplicate copy',()=>{
  assert.equal(read('CLAUDE.md'),'@AGENTS.md\n');
  const shim=read('.claude/skills/agent-workflow-orchestrator/SKILL.md');
  assert.match(shim,/\.agents\/skills\/agent-workflow-orchestrator\/SKILL\.md/);
  assert.ok(shim.length<1100);
});
test('no project HoroOne runtime mappings or domain source leak',()=>{
  const json=JSON.parse(read('.agent-workflow/config.example.json'));
  assert.equal(json.setup.status,'unconfirmed');
  assert.deepEqual(json.routing.orchestrator.preferred,[]);
  assert.deepEqual(json.workers,{});
  assert.doesNotMatch(guide,/horoone\.net|cloud run secret manager/i);
});
test('tool catalog points to actual scripts and tests',()=>{
  const cat=read('.agent-workflow/bin/README.md');
  for(const name of ['plan-ledger','manual-handoff','task-planner']){
    assert.match(cat,new RegExp(name));
    assert.ok(existsSync(path.join(root,'.agent-workflow/bin',name+'.mjs')));
  }
  assert.ok(existsSync(path.join(root,'.agent-workflow/tests/plan-ledger.test.mjs')));
});
test('advisory planner cannot grant integration authority or launch agents',()=>{
  const code=read('.agent-workflow/bin/task-planner.mjs');
  assert.match(code,/integrationReady:false/);
  assert.doesNotMatch(code,/spawnSync\(|spawn\(|https:\/\//);
});
