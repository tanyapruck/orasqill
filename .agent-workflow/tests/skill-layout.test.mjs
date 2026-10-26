import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=name=>readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
const skill=read('.agents/skills/agent-workflow-orchestrator/SKILL.md');
const guide=read('README.md');
const names=['plan-execution.md','role-assignment.md','setup-routing.md','delegation.md','review-validation.md','manual-handoff.md','token-budget.md','DEPENDENCIES.md','planning-interview.md','index-navigation.md'];
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
  assert.match(skill,/including DIRECT coding and test-source edits/);
  assert.match(skill,/discoverable and loadable in that agent's runtime/);
  assert.match(skill,/do not modify code or dispatch a coding worker/);
  assert.match(skill,/dependency_unavailable/);
  assert.match(deps,/every code-writing stage/i);
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
  assert.match(skill,/Optional Matt\/Ponytail Skills are activated only/);
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
  assert.match(guide,/External Skills and update tracking/);
  assert.match(guide,/not vendored or copied/);
});


test('frontmatter describes orchestration triggers instead of listing vendor integrations',()=>{
  const frontmatter=skill.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(frontmatter);
  const pointer=frontmatter[1];
  for(const trigger of ['multi-step','delegated','surgical changes','handoffs','scope approval']){
    assert.match(pointer,new RegExp(trigger));
  }
  assert.doesNotMatch(pointer,/Karpathy|Ponytail|grill-with-docs/);
  assert.match(pointer,/description: >/);
});

test('core is progressively disclosed but never hides plan, approval or high-risk gates',()=>{
  assert.ok(skill.length<8500,'always-read SKILL.md should remain below 8.5KB');
  for(const phase of ['PLAN first','CHECKPOINT before changes','EXECUTE only the next authorized step','VALIDATE the integrated result','CLOSE honestly']) {
    assert.ok(skill.includes(phase),`missing lifecycle phase ${phase}`);
  }
  assert.equal((skill.match(/Complete when:/g)||[]).length,5,'each lifecycle phase needs an explicit completion bound');
  for(const floor of ['HIGH_RISK','independent review','approval-required','explicit user approval','karpathy-guidelines','SETUP_REQUIRED','Final Acceptance']) {
    assert.match(skill,new RegExp(floor,'i'));
  }
  assert.match(skill,/Read references only when their condition applies/);
  assert.match(skill,/references\/plan-execution\.md/);
  assert.match(skill,/references\/DEPENDENCIES\.md/);
});

test('README uses one authoritative provenance pointer and describes complete install smoke',()=>{
  // The README is human-facing distribution documentation, not always-loaded model context.
  for(const section of ['## Install in another Git repository','## Quick start','## Tests, limitations and sharing']) assert.ok(guide.includes(section));
  assert.equal((guide.match(/not vendored or copied/gi)||[]).length,1);
  assert.match(guide,/external-skills\.lock\.json registry is required/);
  assert.match(guide,/git check-ignore \.agent-workflow\/state\/install-check\/plan\.json/);
  assert.match(guide,/Verify the installation/);
  const entry=read('AGENTS.md');
  assert.match(entry,/\.agents\/skills\/agent-workflow-orchestrator\/SKILL\.md/);
  assert.match(entry,/\.agent-workflow\/external-skills\.lock\.json/);
});


test('Claude discovery description leads with the actual orchestration invocation branches',()=>{
  const adapter=read('.claude/skills/agent-workflow-orchestrator/SKILL.md');
  const fm=adapter.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(fm,'Claude adapter needs skill frontmatter');
  for(const trigger of ['multi-step','delegated','plan-locked','handoffs','scope approval']){
    assert.match(fm[1],new RegExp(trigger));
  }
  assert.match(adapter,/\.agents\/skills\/agent-workflow-orchestrator\/SKILL\.md/);
});

test('agent document editing has an explicit upstream writing guidance route',()=>{
  const deps=read('.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md');
  assert.match(skill,/Editing SKILL\.md, AGENTS\.md, CLAUDE\.md or agent instructions/);
  assert.match(deps,/OPTIONAL agent-document edits/);
  assert.match(deps,/SKILL-MECHANICS\.md/);
  assert.match(deps,/verify-reference writing-for-agents/);
  assert.match(read('.agent-workflow/external-skills.lock.json'),/SKILL-MECHANICS\.md/);
});

test('core lifecycle commands include mandatory task IDs',()=>{
  for(const cmd of ['check','review','report','finish']){
    assert.match(skill,new RegExp('plan-ledger\\.mjs '+cmd+' <task-id>'));
  }
  assert.match(read('.agent-workflow/bin/README.md'),/verify-reference <id>/);
});

test('configure-models is a real, explicit slash Skill with a portable Codex entry',()=>{
  const core=read('.agents/skills/configure-models/SKILL.md');
  const shim=read('.claude/skills/configure-models/SKILL.md');
  const entry=read('AGENTS.md');
  const setup=read('.agents/skills/agent-workflow-orchestrator/references/setup-routing.md');
  assert.match(core,/^---\nname: configure-models/m);
  assert.match(shim,/^---\nname: configure-models/m);
  assert.match(shim,/disable-model-invocation: true/);
  assert.match(shim,/user-invocable: true/);
  assert.match(shim,/\.agents\/skills\/configure-models\/SKILL\.md/);
  assert.match(entry,/\$configure-models/);
  assert.match(setup,/\/configure-models/);
  assert.match(core,/explicit approval/);
  assert.match(core,/no models were launched/i);
  assert.match(read('README.md'),/cp -R .*\.agents\/skills\/configure-models/);
  assert.ok(existsSync(path.join(root,'.agent-workflow/bin/model-config.mjs')));
});
