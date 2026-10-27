import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateNestedTree,previewNestedTree,run} from '../bin/nested-delegation.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const example=JSON.parse(readFileSync(path.join(repo,'.agent-workflow/examples/nested-tree.example.json'),'utf8'));
const exampleConfig=JSON.parse(readFileSync(path.join(repo,'.agent-workflow/config.example.json'),'utf8'));
const plan={schemaVersion:1,taskId:'feature-123',status:'active',findings:[],steps:[{id:'S1',status:'pending',text:'Implement the approved feature'},{id:'S2',status:'pending',text:'Integrate feature'}]};
const clone=x=>structuredClone(x);
function bad(mutator,error){
  const t=clone(example);
  mutator(t);
  assert.throws(()=>validateNestedTree(t,plan,'win32'),error);
}
const node=(t,id)=>t.nodes.find(n=>n.id===id);

test('example produces a bounded 2-level tree of Root / sub-orchestrators / workers',()=>{
  const data=validateNestedTree(example,plan,'win32');
  assert.equal(data.depth.get('root'),0);
  assert.equal(data.depth.get('auth'),1);
  assert.equal(data.depth.get('otp'),2);
  const preview=previewNestedTree(example,plan,exampleConfig,'win32');
  assert.equal(preview.mode,'NESTED_PLAN_ONLY');
  assert.equal(preview.nodeCount,5);
  assert.equal(preview.packets.length,4);
  assert.equal(preview.readyToDispatch,false);
  assert.equal(preview.agentsLaunched,0);
  assert.ok(preview.blockers.some(x=>x.includes('DEPTH_APPROVAL_REQUIRED')));
  assert.ok(preview.blockers.some(x=>x.includes('CAPACITY_APPROVAL_REQUIRED')));
  assert.ok(preview.blockers.some(x=>x.includes('RUNTIME_VERIFICATION_REQUIRED')));
  const otp=preview.packets.find(p=>p.id==='otp');
  assert.deepEqual(otp.write,['src/auth/otp.ts']);
  assert.equal(otp.remainingDepth,0);
  assert.equal(otp.parentId,'auth');
  assert.equal(otp.executionAuthorized,false);
});

test('locked plan must exist, be next pending and match root objective exactly',()=>{
  assert.throws(()=>validateNestedTree(example,{},'win32'),/LOCKED_PLAN_REQUIRED/);
  const wrongTask=clone(plan);wrongTask.taskId='another-task';
  assert.throws(()=>validateNestedTree(example,wrongTask,'win32'),/LOCKED_PLAN_REQUIRED/);
  const completed=clone(plan);completed.status='finished';
  assert.throws(()=>validateNestedTree(example,completed,'win32'),/LOCKED_PLAN_REQUIRED/);
  const pendingApproval=clone(plan);pendingApproval.findings=[{id:'F1',status:'approval-required'}];
  assert.throws(()=>validateNestedTree(example,pendingApproval,'win32'),/APPROVAL_REQUIRED/);
  bad(t=>{t.planStepId='S2';},/OUT_OF_PLAN/);
  bad(t=>{node(t,'root').objective='Close something else';},/OUT_OF_PLAN/);
  const withDone=clone(plan);withDone.steps[0].status='done';
  assert.throws(()=>validateNestedTree(example,withDone,'win32'),/OUT_OF_PLAN/);
});

test('fails closed on child scope escalation, path traversal and case-alias overlap',()=>{
  bad(t=>{node(t,'otp').resources.write=['src/payment/charge.ts'];},/SCOPE_EXCEEDED/);
  bad(t=>{node(t,'otp').resources.read=['src/other'];},/SCOPE_EXCEEDED/);
  bad(t=>{node(t,'otp').resources.write=['../secrets'];},/unsafe resource path/);
  bad(t=>{node(t,'payment').resources.write=['SRC/AUTH'];},/RESOURCE_CONFLICT|SCOPE_EXCEEDED/);
  bad(t=>{node(t,'payment').resources.write=['src/auth'];},/RESOURCE_CONFLICT/);
});

test('budget is additive across siblings and depth cannot exceed parent entitlement',()=>{
  bad(t=>{node(t,'auth').budget=750;},/BUDGET_EXCEEDED/);
  bad(t=>{node(t,'otp').budget=501;},/BUDGET_EXCEEDED/);
  bad(t=>{t.limits.maxDepth=1;},/DEPTH_EXCEEDED/);
  bad(t=>{t.limits.maxDepth=0;},/DEPTH_INVALID/);
  bad(t=>{t.limits.maxActiveWorkers=17;},/CAPACITY_INVALID/);
});

test('cycles, forged/missing parent IDs and worker-as-parent are rejected',()=>{
  bad(t=>{node(t,'auth').parentId='otp';},/PARENT_CYCLE|PARENT_REQUIRED/);
  bad(t=>{node(t,'otp').parentId='nonexistent';},/PARENT_REQUIRED/);
  bad(t=>{node(t,'root').parentId='auth';},/ROOT_REQUIRED/);
  bad(t=>{
    node(t,'otp').kind='orchestrator';
    node(t,'stripe').parentId='otp';
    node(t,'stripe').resources.write=['src/auth/otp.ts'];
    node(t,'stripe').resources.read=['src/auth/otp.ts'];
  },/SCOPE_EXCEEDED|BUDGET_EXCEEDED|DEPTH_EXCEEDED|PARENT_REQUIRED/);
});

test('child cannot downgrade high-risk parent and independent gate is preserved',()=>{
  const t=clone(example);
  node(t,'root').risk='HIGH_RISK';
  assert.throws(()=>validateNestedTree(t,plan,'win32'),/RISK_DOWNGRADE/);
  for(const n of t.nodes)n.risk='HIGH_RISK';
  const p=previewNestedTree(t,plan,exampleConfig,'win32');
  assert.equal(p.requiredIndependentReview,true);
  assert.ok(p.blockers.some(s=>s.includes('HIGH_RISK')));
  assert.equal(p.integrated,false);
});

test('dependencies are sibling-only, cycle checked and optional',()=>{
  const t=clone(example);
  node(t,'payment').dependsOn=['auth'];
  assert.doesNotThrow(()=>validateNestedTree(t,plan,'win32'));
  bad(t=>{node(t,'payment').dependsOn=['otp'];},/DEPENDENCY_SCOPE/);
  bad(t=>{node(t,'payment').dependsOn=['payment'];},/DEPENDENCY_SCOPE/);
  bad(t=>{
    node(t,'payment').dependsOn=['auth'];
    node(t,'auth').dependsOn=['payment'];
  },/DEPENDENCY_CYCLE/);
  bad(t=>{node(t,'root').dependsOn=['otp'];},/DEPENDENCY_SCOPE/);
});

test('unconfirmed runtime cannot be treated as executable even with raised candidate limits',()=>{
  const c=clone(exampleConfig);
  c.delegation.max_depth=2;
  const r=previewNestedTree({...example,limits:{maxDepth:2,maxActiveWorkers:1}},plan,c,'win32');
  assert.equal(r.configuredMaxDepth,2);
  assert.equal(r.readyToDispatch,false);
  assert.equal(r.agentsLaunched,0);
  assert.ok(r.blockers.some(s=>s.includes('SETUP_REQUIRED')));
});

test('CLI plan and packet work without writing evidence or activating agents',t=>{
  const folder=mkdtempSync(path.join(tmpdir(),'orasqill-nested-'));
  t.after(()=>rmSync(folder,{force:true,recursive:true}));
  const treePath=path.join(folder,'tree.json'),planPath=path.join(folder,'plan.json');
  writeFileSync(treePath,JSON.stringify(example,null,2));
  writeFileSync(planPath,JSON.stringify(plan,null,2));
  const cli=path.join(repo,'.agent-workflow/bin/nested-delegation.mjs');
  const options=['--locked-plan',planPath,'--config',path.join(repo,'.agent-workflow/config.example.json')];
  const result=spawnSync(process.execPath,[cli,'plan',treePath,...options],{encoding:'utf8',cwd:repo});
  assert.equal(result.status,0,result.stderr);
  const data=JSON.parse(result.stdout);
  assert.equal(data.mode,'NESTED_PLAN_ONLY');
  const packet=spawnSync(process.execPath,[cli,'packet',treePath,'otp',...options],{encoding:'utf8',cwd:repo});
  assert.equal(packet.status,0,packet.stderr);
  assert.equal(JSON.parse(packet.stdout).packet.id,'otp');
  assert.equal(JSON.parse(packet.stdout).readyToDispatch,false);
  assert.equal(readFileSync(treePath,'utf8'),JSON.stringify(example,null,2));
  const broken=spawnSync(process.execPath,[cli,'packet',treePath,'unassigned',...options],{encoding:'utf8',cwd:repo});
  assert.equal(broken.status,2);
  assert.match(broken.stderr,/PACKET_NOT_FOUND/);
});

test('user-invokable and model-suggested skills contain clear approval gates',()=>{
  const read=p=>readFileSync(path.join(repo,p),'utf8');
  const canonical=read('.agents/skills/delegate-tree/SKILL.md');
  const adapter=read('.claude/skills/delegate-tree/SKILL.md');
  const orchestration=read('.agents/skills/agent-workflow-orchestrator/references/delegation.md');
  const readme=read('README.md');
  assert.match(canonical,/^---\nname: delegate-tree/m);
  assert.match(adapter,/^---\nname: delegate-tree/m);
  assert.doesNotMatch(canonical,/disable-model-invocation:\s*true/);
  assert.doesNotMatch(adapter,/disable-model-invocation:\s*true/);
  assert.match(canonical,/ask.*user authorization/i);
  assert.match(canonical,/RUNTIME_VERIFICATION_REQUIRED/);
  assert.match(orchestration,/delegate-tree/);
  assert.match(readme,/\/delegate-tree/);
  assert.match(readme,/\$delegate-tree/);
});
