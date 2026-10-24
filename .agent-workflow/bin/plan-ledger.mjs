/** Plan-locked local ledger. State is untrusted evidence, not approval authority. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_REPO, options, one, gitFacts, taskDir, readJSON, assertSafeFile, atomic, saveJSON, clean, bullets } from './common.mjs';
import { run as handoff, assertPlanCompletion } from './manual-handoff.mjs';
const START=['--goal','--step','--accept','--allowed','--forbidden','--owner','--risk'];
const ALL=[...START,'--evidence','--description','--impact','--reason','--necessary','--finding','--approvalref','--before','--result'];

function render(plan) {
  const status=plan.status==='finished'?'COMPLETE':plan.findings.some(x=>x.status==='approval-required')?'BLOCKED_AWAITING_APPROVAL':plan.steps.every(x=>x.status==='done')?'READY_FOR_FINAL_CHECKS':'IN_PROGRESS';
  return `# Locked execution plan: ${clean(plan.taskId)} — ${status}\n\nThis is user/agent reported evidence, **not authorization**. Never implement out-of-plan work.\n\n`+
    `## Goal\n\n${clean(plan.goal)}\n\n## Ordered steps\n\n${bullets(plan.steps,s=>`- [${s.status==='done'?'x':' '}] ${s.id}: ${clean(s.text)}${s.evidence?` (evidence: ${clean(s.evidence)})`:''}`)}\n\n`+
    `## Acceptance\n\n${bullets(plan.acceptance)}\n\n## Findings outside plan\n\n`+
    bullets(plan.findings,x=>`- ${x.id} [${x.status}]: ${clean(x.description)}; impact ${clean(x.impact)}; reason ${clean(x.reason)}; reported approval ${clean(x.approvalRef??'none')} (verify against user message)${x.amendment?`; inserted ${x.amendment.addedStepIds.join(', ')} before ${x.amendment.beforeStepId??'end'}`:''}`)+'\n\n'+
    `## Validation (reported)\n\n${bullets(plan.checks)}\n\n## Git identity\n\n- Branch: ${clean(plan.startBranch)}\n- Start HEAD: ${clean(plan.startHead)}\n`;
}
function load(repo,id) {
  const dir=taskDir(repo,id);
  const planFile=path.join(dir,'plan.json');
  if(!assertSafeFile(planFile))throw Error('PLAN_REQUIRED: create locked plan before work');
  const plan=readJSON(planFile);
  const task=readJSON(path.join(dir,'task.json'));
  if(plan.schemaVersion!==1||plan.taskId!==id||path.resolve(plan.repo)!==path.resolve(repo)||!Array.isArray(plan.steps)||!Array.isArray(plan.findings)||task.taskId!==id||task.startBranch!==plan.startBranch||task.status==='finished')throw Error('invalid or closed plan checkpoint');
  const facts=gitFacts(repo);
  if(!facts.branch||facts.branch!==plan.startBranch)throw Error('BRANCH_MISMATCH: use the original named branch');
  return {plan,dir};
}
function persist(repo,id,plan) {
  const dir=taskDir(repo,id);
  saveJSON(path.join(dir,'plan.json'),plan);
  atomic(path.join(dir,'plan.md'),render(plan));
  handoff(['export',id],repo); // Incoming agent can discover plan and finding state.
  return path.join(dir,'plan.md');
}
function summary(repo) {
  const git=gitFacts(repo);
  return `- Branch: ${git.branch}\n- HEAD: ${git.head}\n- Status (filenames only):\n${bullets(git.status.slice(0,80))}\n`;
}
function report(repo,id,plan,complete=false) {
  const dir=taskDir(repo,id);
  const blocked=plan.findings.some(x=>x.status==='approval-required');
  const state=complete?'PLAN COMPLETE (reported; verify independently)':blocked?'BLOCKED_AWAITING_APPROVAL':plan.steps.every(x=>x.status==='done')&&plan.checks.length?'PLAN_COMPLETE_REQUIRES_REVIEW':'INCOMPLETE';
  const file=path.join(dir,'final-report.md');
  atomic(file,`# Final Acceptance Report: ${id}\n\n**${state}**\n\n${render(plan)}\n\n## Live Git status at report time\n\n${summary(repo)}\n## Required user-facing conclusion\n\nReport original goal, completed step IDs, actual test commands/outcomes, deferred findings, approval-pending findings, original and current SHA, PR/merge/deploy state where verified, and blockers. This file cannot grant approval or prove tests passed.\n`);
  return file;
}
function nextStep(plan,id) {
  const next=plan.steps.find(s=>s.status==='pending');
  if(!next||next.id!==id)throw Error(`OUT_OF_PLAN_OR_ORDER: next permitted step is ${next?.id??'(none)'}`);
  if(plan.findings.some(x=>x.status==='approval-required'))throw Error('APPROVAL_REQUIRED: record user decision before proceeding');
  return next;
}
export function runPlan(argv,repo=DEFAULT_REPO) {
  const [command,id,...args]=argv;
  const opts=options(args,ALL);
  if(command==='start') {
    for(const key of Object.keys(opts))if(!START.includes(key))throw Error(`unsupported start option ${key}`);
    const goal=one(opts,'--goal'),steps=opts['--step'];
    if(!steps?.length||steps.length>40)throw Error('PLAN_REQUIRED: enter 1-40 plan steps');
    if(!opts['--accept']?.length)throw Error('PLAN_REQUIRED: enter acceptance criteria');
    const facts=gitFacts(repo);
    if(!facts.branch)throw Error('DETACHED_HEAD: select named branch before creating plan');
    const dir=taskDir(repo,id);
    if(assertSafeFile(path.join(dir,'plan.json')))throw Error('plan already exists');
    const handoffArgs=['start',id,'--goal',goal];
    for(const [key,values] of Object.entries(opts)){
      if(key==='--goal'||key==='--step')continue;
      for(const value of values)handoffArgs.push(key,value);
    }
    handoffArgs.push('--next',`S1: ${steps[0]}`);
    handoff(handoffArgs,repo); // Create checkpoint BEFORE implementation/delegation.
    const plan={schemaVersion:1,taskId:id,repo:path.resolve(repo),startBranch:facts.branch,startHead:facts.head,status:'active',goal,acceptance:opts['--accept'],steps:steps.map((text,i)=>({id:`S${i+1}`,text,status:'pending',evidence:null})),findings:[],checks:[],createdAt:new Date().toISOString()};
    return persist(repo,id,plan);
  }
  const {plan}=load(repo,id);
  if(command==='step') {
    if(Object.keys(opts).some(k=>!['--step','--evidence'].includes(k)))throw Error('unsupported step option');
    const s=nextStep(plan,one(opts,'--step'));
    s.status='done';s.evidence=one(opts,'--evidence');
    const next=plan.steps.find(x=>x.status==='pending');
    handoff(['checkpoint',id,'--done',`${s.id}: ${s.text}`,'--next',next?`${next.id}: ${next.text}`:'Run final validation'],repo);
  } else if(command==='finding') {
    if(Object.keys(opts).some(k=>!['--description','--impact','--reason','--necessary'].includes(k)))throw Error('unsupported finding option');
    const necessary=one(opts,'--necessary');
    if(!['yes','no'].includes(necessary))throw Error('--necessary must be yes or no');
    plan.findings.push({id:`F${plan.findings.length+1}`,description:one(opts,'--description'),impact:one(opts,'--impact'),reason:one(opts,'--reason'),status:necessary==='yes'?'approval-required':'deferred',approvalRef:null});
  } else if(command==='amend') {
    if(Object.keys(opts).some(k=>!['--finding','--step','--approvalref','--before'].includes(k)))throw Error('unsupported amend option');
    const finding=plan.findings.find(x=>x.id===one(opts,'--finding'));
    if(!finding || finding.status!=='approval-required')throw Error('APPROVAL_REQUIRED: no eligible pending finding');
    const steps=opts['--step'];
    if(!steps?.length||steps.length>10)throw Error('amend requires 1-10 user-approved steps');
    const before=one(opts,'--before',false);
    const index=before?plan.steps.findIndex(x=>x.id===before):plan.steps.length;
    if(index<0||(before&&plan.steps[index].status==='done'))throw Error('--before must identify an unfinished step');
    const ids=[];
    const max=Math.max(...plan.steps.map(x=>Number(x.id.slice(1))));
    const added=steps.map((text,i)=>{const id=`S${max+i+1}`;ids.push(id);return {id,text,status:'pending',evidence:null};});
    plan.steps.splice(index,0,...added);
    finding.status='reported-approved';finding.approvalRef=one(opts,'--approvalref');finding.amendment={beforeStepId:before??null,addedStepIds:ids};
    // This string is an audit reference, NOT verification of user approval.
  } else if(command==='check') {
    if(Object.keys(opts).some(k=>k!=='--result'))throw Error('unsupported check option');
    plan.checks.push(one(opts,'--result'));
  } else if(command==='report') {
    if(Object.keys(opts).length)throw Error('report takes no options');
    return report(repo,id,plan);
  } else if(command==='finish') {
    if(Object.keys(opts).length)throw Error('finish takes no options');
    assertPlanCompletion(plan); // Shared with manual finish; do not drift.
    plan.status='finished';
    const location=persist(repo,id,plan); // Persist finalized plan FIRST.
    report(repo,id,plan,true); // Write actual report before checkpoint close.
    handoff(['finish',id],repo);
    return location;
  } else throw Error('Usage: plan-ledger start|step|finding|amend|check|report|finish <task-id>');
  return persist(repo,id,plan);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(runPlan(process.argv.slice(2)));}catch(e){console.error(`PLAN BLOCKED: ${e.message}`);process.exitCode=2;}
}
