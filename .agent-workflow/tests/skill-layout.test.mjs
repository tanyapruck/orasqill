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
  assert.match(read('docs/developer-notes.md'),/External Skills and update tracking/);
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

test('README is human-friendly and points to complete technical documentation',()=>{
  const commandGuide=read('docs/command-reference.md');
  assert.ok(guide.length<7500,'landing README must be concise');
  assert.equal((guide.match(/^\`\`\`/gm)||[]).length,2,'show just one installation example');
  for(const section of ['## Customer Guide','## Developer Guide','## AI Guide']) assert.ok(guide.includes(section));
  for(const link of ['docs/command-reference.md','docs/model-routing.md','docs/developer-notes.md']) assert.ok(guide.includes(link));
  assert.equal((guide.match(/not vendored or copied/gi)||[]).length,1);
  assert.match(commandGuide,/external-skills\.lock\.json registry is required/);
  assert.match(commandGuide,/git check-ignore \.agent-workflow\/state\/install-check\/plan\.json/);
  assert.match(read('docs/developer-notes.md'),/Verify the installation/);
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

test('nested delegation is independently invokable and optionally suggested without auto-dispatch',()=>{
  const canonical=read('.agents/skills/delegate-tree/SKILL.md');
  const claude=read('.claude/skills/delegate-tree/SKILL.md');
  const ref=read('.agents/skills/agent-workflow-orchestrator/references/delegation.md');
  const entry=read('AGENTS.md');
  assert.match(canonical,/^---\nname: delegate-tree/m);
  assert.match(claude,/^---\nname: delegate-tree/m);
  assert.match(canonical,/Recommend bounded nested orchestration/);
  assert.match(ref,/Root.*Child Orchestrator.*Worker/);
  assert.match(entry,/suggest.*\$delegate-tree/);
  assert.match(guide,/\/delegate-tree/);
  assert.ok(existsSync(path.join(root,'.agent-workflow/bin/nested-delegation.mjs')));
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
  assert.match(read('docs/command-reference.md'),/cp -R .*\.agents\/skills\/configure-models/);
  assert.ok(existsSync(path.join(root,'.agent-workflow/bin/model-config.mjs')));
});

test('routing separation is explicit in workspace agents and model configuration Skills',()=>{
  const agent=read('AGENTS.md');
  const config=read('.agents/skills/configure-models/SKILL.md');
  const bootstrap=read('.agents/skills/oranit/SKILL.md');
  const setup=read('.agents/skills/agent-workflow-orchestrator/references/setup-routing.md');
  for(const doc of [agent,config,bootstrap,setup]){
    assert.match(doc,/routing\/claude-code\.json/);
    assert.match(doc,/routing\/codex\.json/);
  }
  assert.match(read('.agent-workflow/bin/README.md'),/resolve claude-code\|codex/);
  assert.match(read('.gitignore'),/^\.agent-workflow\/routing\/$/m);
});

test('README has three focused guides; deep CLI docs retain all seven command categories',()=>{
  const landing=read('README.md'),commands=read('docs/command-reference.md');
  const headings=landing.split(/\r?\n/).filter(line=>/^## /.test(line));
  assert.deepEqual(headings,['## Customer Guide','## Developer Guide','## AI Guide']);
  assert.ok(landing.length<7500);
  assert.ok(landing.split(/\r?\n/).length<160);
  assert.equal((landing.match(/^\`\`\`/gm)||[]).length,2);
  assert.equal((commands.match(/^## [1-7]\. /gm)||[]).length,7);
  for(const cmd of ['/oranit','$oranit','/configure-models','$configure-models','/delegate-tree','$delegate-tree','oranit status','oranit refresh']){
    assert.ok(commands.includes(cmd),cmd);
  }
  assert.doesNotMatch(landing,/oranit(?:\.mjs)? init\b/);
  assert.match(landing,/\[AGENTS\.md\]\(AGENTS\.md\)/);
  assert.match(landing,/\[Orchestrator Skill\]\(\.agents\/skills\/agent-workflow-orchestrator\/SKILL\.md\)/);
});

test('public README exposes model choices, dependency commands and the MIT license',()=>{
  const readme=read('README.md');
  const license=read('LICENSE');
  const packageInfo=JSON.parse(read('package.json'));
  assert.match(readme,/### Model mapping/);
  for(const model of ['GPT-6.1 Sol','GPT-6.1 Terra','GPT-6 Astra','Claude Opus 5.5','Claude Sonnet 5.5']){
    assert.ok(readme.includes(model),model);
  }
  for(const command of ['oranit status','oranit refresh','oranit locate "keyword"',
    'external-skills.mjs list','external-skills.mjs check-updates']){
    assert.ok(readme.includes(command),command);
  }
  assert.match(readme,/### Dependencies/);
  assert.match(readme,/Karpathy guidelines/);
  assert.match(readme,/\[MIT License\]\(LICENSE\)/);
  assert.match(readme,/repository must also be made public/);
  assert.match(license,/^MIT License\nCopyright \(c\) 2026 tanyapruckp-pan/m);
  assert.match(license,/Permission is hereby granted, free of charge/);
  assert.match(license,/The above copyright notice and this permission notice shall be included/);
  assert.equal(packageInfo.license,'MIT');
  assert.equal(packageInfo.private,true);
});
