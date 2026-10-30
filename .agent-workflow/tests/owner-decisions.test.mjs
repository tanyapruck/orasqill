import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,existsSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execute} from '../bin/oranit.mjs';

const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const file=(folder,relative)=>path.join(folder,relative);
const read=(folder,relative)=>readFileSync(file(folder,relative),'utf8');
function project(t){
  const dir=mkdtempSync(path.join(tmpdir(),'owner-decisions-'));
  t.after(()=>rmSync(dir,{force:true,recursive:true}));
  writeFileSync(file(dir,'sample.txt'),'keep');
  return dir;
}

test('dry-run reports decision scaffold and agent pointer without writing any files',t=>{
  const dir=project(t);
  const result=execute(['--workspace',dir,'--dry-run']);
  assert.equal(result.dryRun,true);
  assert.deepEqual(result.decisionScaffold,[
    {file:'docs/decisions/README.md',status:'would_create'},
    {file:'docs/decisions/TEMPLATE.md',status:'would_create'}
  ]);
  assert.equal(result.ownerDecisionPointer.status,'would_create_with_pointer');
  assert.equal(existsSync(file(dir,'docs/decisions')),false);
  assert.equal(existsSync(file(dir,'AGENTS.md')),false);
  assert.equal(existsSync(file(dir,'.agent-workflow')),false);
});

test('bootstrap installs decisions and AGENTS pointer exactly once without discarding edits',t=>{
  const dir=project(t);
  const start=execute(['--workspace',dir]);
  assert.ok(start.decisionScaffold.every(x=>x.status==='created'));
  assert.equal(start.ownerDecisionPointer.status,'created_with_pointer');
  const guide=read(dir,'docs/decisions/README.md');
  const template=read(dir,'docs/decisions/TEMPLATE.md');
  const agents=read(dir,'AGENTS.md');
  assert.match(guide,/## Decision index/);
  assert.match(guide,/## Rules/);
  assert.match(guide,/## Example/);
  assert.match(template,/Status:.*Accepted/);
  assert.match(template,/Applies to:/);
  assert.match(agents,/## Owner decisions/);
  assert.match(agents,/docs\/decisions\/README\.md/);
  assert.equal(guide,read(source,'docs/decisions/README.md'));
  // Local owners can edit the scaffold, and rerunning init never replaces it.
  writeFileSync(file(dir,'docs/decisions/README.md'),guide+'\nOwner-specific note\n');
  const again=execute(['--workspace',dir]);
  assert.deepEqual(again.decisionScaffold,[
    {file:'docs/decisions/README.md',status:'preserved'},
    {file:'docs/decisions/TEMPLATE.md',status:'preserved'}
  ]);
  assert.equal(again.ownerDecisionPointer.status,'already_present');
  assert.match(read(dir,'docs/decisions/README.md'),/Owner-specific note/);
  assert.equal(read(dir,'AGENTS.md'),agents);
});

test('existing AGENTS remains unchanged and receives a suggested pointer, even in dry-run',t=>{
  const dir=project(t);
  writeFileSync(file(dir,'AGENTS.md'),'Existing owner instructions\n');
  const before=read(dir,'AGENTS.md');
  const preview=execute(['--workspace',dir,'--dry-run']);
  assert.equal(preview.ownerDecisionPointer.status,'suggested_for_existing_file');
  assert.match(preview.ownerDecisionPointer.suggestedSection,/docs\/decisions\/README\.md/);
  assert.equal(read(dir,'AGENTS.md'),before);
  const result=execute(['--workspace',dir]);
  assert.equal(result.ownerDecisionPointer.status,'suggested_for_existing_file');
  assert.equal(read(dir,'AGENTS.md'),before);
  assert.ok(existsSync(file(dir,'docs/decisions/README.md')));
  assert.ok(existsSync(file(dir,'docs/decisions/TEMPLATE.md')));
});

test('existing decision files are preserved and missing template is safely created',t=>{
  const dir=project(t);
  mkdirSync(file(dir,'docs/decisions'),{recursive:true});
  writeFileSync(file(dir,'docs/decisions/README.md'),'Custom decisions index\n');
  const preview=execute(['--workspace',dir,'--dry-run']);
  assert.deepEqual(preview.decisionScaffold,[
    {file:'docs/decisions/README.md',status:'preserved'},
    {file:'docs/decisions/TEMPLATE.md',status:'would_create'}
  ]);
  const result=execute(['--workspace',dir]);
  assert.equal(result.decisionScaffold[0].status,'preserved');
  assert.equal(result.decisionScaffold[1].status,'created');
  assert.equal(read(dir,'docs/decisions/README.md'),'Custom decisions index\n');
});

test('owner decision conventions are visible to every agent without promoting memory to authority',()=>{
  const entry=read(source,'AGENTS.md');
  const claude=read(source,'CLAUDE.md');
  const orchestrator=read(source,'.agents/skills/agent-workflow-orchestrator/SKILL.md');
  const plan=read(source,'.agents/skills/agent-workflow-orchestrator/references/plan-execution.md');
  const bootstrap=read(source,'.agents/skills/oranit/SKILL.md');
  assert.equal(claude,'@AGENTS.md\n');
  assert.match(entry,/docs\/decisions\/README\.md/);
  assert.match(orchestrator,/Accepted.*owner decisions/);
  assert.match(orchestrator,/same PR/);
  assert.match(orchestrator,/decision files added or superseded/);
  assert.match(plan,/decision ID, Rule and affected paths/);
  assert.match(bootstrap,/suggestedSection/);
  assert.match(read(source,'docs/decisions/README.md'),/private model memory/);
});
