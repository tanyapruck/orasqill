import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=name=>readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
const skill=read('.agents/skills/agent-workflow-orchestrator/SKILL.md');
const guide=read('README.md');
const names=['plan-execution.md','role-assignment.md','setup-routing.md','delegation.md','review-validation.md','manual-handoff.md','token-budget.md','DEPENDENCIES.md','planning-interview.md'];
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


test('all code work requires loadable Karpathy guidelines at the actual executor',()=>{
  const deps=read('.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md');
  assert.match(skill,/REQUIRED for every coding, bug-fix, refactor or SURGICAL code-change stage/);
  assert.match(skill,/This requirement applies to DIRECT coding too/);
  assert.match(skill,/discoverable and loadable in that agent's runtime/);
  assert.match(skill,/do not modify code or dispatch a coding worker/);
  assert.match(skill,/dependency_unavailable/);
  assert.match(deps,/Every code-writing stage/);
  assert.match(deps,/actual coding agent/);
  assert.match(deps,/same executing runtime/);
});

test('dependency provenance links exact Karpathy source but never auto-installs',()=>{
  const deps=read('.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md');
  assert.match(deps,/multica-ai\/andrej-karpathy-skills/);
  assert.match(deps,/skills\/karpathy-guidelines\/SKILL\.md/);
  assert.match(deps,/compatibility identifier.*not a claim/);
  assert.match(deps,/No external skill is bundled, copied, vendored, or automatically installed/);
  assert.match(deps,/Installation requires explicit applicable user/);
  assert.ok(!existsSync(path.join(root,'.agents/skills/karpathy-guidelines/SKILL.md')));
});

test('Matt deep interview is optional and before locked plan only',()=>{
  const reference=read('.agents/skills/agent-workflow-orchestrator/references/planning-interview.md');
  const deps=read('.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md');
  assert.match(skill,/OPTIONAL conditional pre-plan/);
  assert.match(skill,/grill-with-docs/);
  assert.match(skill,/grilling.*domain-modeling/);
  assert.match(reference,/Bounded Surgical Change or clear acceptance/);
  assert.match(reference,/After plan lock/);
  assert.match(reference,/Unplanned requirements become Findings/);
  assert.match(deps,/CONDITIONAL\/OPT-IN/);
  assert.match(deps,/all three Skills only when invoked/);
  assert.match(reference,/Do not create these files without plan inclusion or separate authorization/);
});

test('Matt alternatives are recommendations, not new mandatory stages',()=>{
  const reference=read('.agents/skills/agent-workflow-orchestrator/references/planning-interview.md');
  for(const option of ['to-spec','to-tickets','tdd','diagnosing-bugs','code-review']){
    assert.match(reference,new RegExp(option));
  }
  assert.match(reference,/None of these Skills is necessary for a straightforward bounded code edit/);
  assert.match(reference,/parallel-subagent workflow must yield/);
  assert.match(reference,/never as unsolicited scope expansion|no new interview may silently change scope/i);
});

test('root and install docs expose prerequisite rules without granting authority',()=>{
  const entry=read('AGENTS.md');
  const setup=read('.agents/skills/agent-workflow-orchestrator/references/setup-routing.md');
  assert.match(entry,/karpathy-guidelines/);
  assert.match(entry,/SETUP_REQUIRED: dependency_unavailable/);
  assert.match(entry,/grill-with-docs/);
  assert.match(setup,/per executing worker/);
  assert.match(setup,/not proof of Skill loadability/);
  assert.match(guide,/External skill prerequisites/);
  assert.match(guide,/not vendored or copied/);
});
