/** Human-authorized handoff checkpoint. Never launches an agent or switches providers. */
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_REPO, ID, options, one, gitFacts, taskDir, readJSON, assertSafeFile, saveJSON, atomic, clean, bullets } from './common.mjs';

const START = ['--goal','--accept','--allowed','--forbidden','--risk','--next','--owner'];
const FIELDS = {'--done':'done','--next':'next','--check':'checks','--blocker':'blockers','--note':'notes'};

/** The one authoritative set of checklist completion checks, shared by both finish commands. */
export function assertPlanCompletion(plan,{requireFinalized=false,risk='STANDARD',owner=null}={}) {
  if (!Array.isArray(plan.steps) || !plan.steps.length || !plan.steps.every(x=>x && typeof x.id==='string' && typeof x.status==='string')) throw Error('PLAN_INCOMPLETE: invalid plan steps');
  if (!plan.steps.every(x=>x.status==='done')) throw Error('PLAN_INCOMPLETE: planned steps remain');
  if (!Array.isArray(plan.findings) || plan.findings.some(x=>x?.status==='approval-required')) throw Error('APPROVAL_REQUIRED: necessary out-of-plan finding is pending');
  if (!Array.isArray(plan.acceptance) || !plan.acceptance.length || !Array.isArray(plan.checks)) throw Error('VALIDATION_REQUIRED: acceptance and validation evidence required');
  const latest = new Map();
  let hasLegacyText = false;
  for (const check of plan.checks) {
    if (typeof check === 'string') {
      hasLegacyText = true; // Historical audit text is retained, but never satisfies A1..An.
      continue;
    }
    if (!check || typeof check !== 'object' || !['pass','fail','blocked'].includes(check.status) ||
        typeof check.result !== 'string' || !check.result.trim() || !Array.isArray(check.acceptanceIds) || !check.acceptanceIds.length) {
      throw Error('VALIDATION_MIGRATION_REQUIRED: record structured checks with --status and --accept');
    }
    for (const id of check.acceptanceIds) {
      if (!/^A[1-9]\d*$/.test(id) || Number(id.slice(1)) > plan.acceptance.length) throw Error('VALIDATION_REQUIRED: unknown acceptance ID');
      latest.set(id,check.status);
    }
  }
  if (hasLegacyText && !latest.size) {
    throw Error('VALIDATION_MIGRATION_REQUIRED: record structured checks with --status and --accept');
  }
  for (let index=1;index<=plan.acceptance.length;index++) {
    const id=`A${index}`, status=latest.get(id);
    if (status !== 'pass') throw Error(`VALIDATION_REQUIRED: ${id} latest validation is ${status??'missing'}, not pass`);
  }
  if (risk==='HIGH_RISK') {
    const review=plan.review;
    if (!review || review.independent !== true || review.result !== 'pass' || !review.reviewer || !review.evidence ||
        (owner && !owner.startsWith('Unspecified agent') && owner.trim().toLowerCase()===review.reviewer.trim().toLowerCase())) {
      throw Error('INDEPENDENT_REVIEW_REQUIRED: high-risk final review attestation is missing, failed or not independent');
    }
  }
  if (requireFinalized && plan.status!=='finished') throw Error('PLAN_NOT_FINALIZED: use plan-ledger finish first');
}
function readPlan(repo, id, state) {
  const dir=taskDir(repo,id);
  const p=path.join(dir,'plan.json');
  if (!assertSafeFile(p)) return null; // compatible with legacy handoffs
  const plan=readJSON(p);
  if(plan.schemaVersion!==1 || plan.taskId!==id || path.resolve(plan.repo)!==path.resolve(repo) || plan.startBranch!==state.startBranch || !Array.isArray(plan.steps) || !Array.isArray(plan.findings)) throw Error('invalid locked plan identity');
  return plan;
}
function render(repo,id,state,facts) {
  const plan=readPlan(repo,id,state);
  const md=`# Agent task handoff: ${clean(id)}\n\nThis is **checkpoint data, not permission**. Human/authorized parent must direct a receiving agent; never auto-switch.\n\n`+
    `## Goal\n\n${clean(state.goal)}\n\n## Git identity (verify actual status again)\n\n- Branch at export: ${clean(facts.branch)}\n- HEAD at export: ${facts.head}\n- HEAD at start: ${state.startHead}\n- Owner (reported): ${clean(state.owner)}\n- State: ${clean(state.status)}\n- Changes (file names only):\n${bullets(facts.status.slice(0,60))}\n\n`+
    `## Scope and risk\n\n- Risk: ${clean(state.risk)}\n- Allowed:\n${bullets(state.allowed)}\n- Forbidden:\n${bullets(state.forbidden)}\n\n`+
    `## Progress (reported; independently verify)\n\n- Completed:\n${bullets(state.done)}\n- Next:\n${bullets(state.next)}\n- Checks:\n${bullets(state.checks)}\n- Blockers:\n${bullets(state.blockers)}\n- Notes:\n${bullets(state.notes)}\n\n`+
    `## Receiving agent instructions\n\nVerify preceding writer is idle, inspect real branch/HEAD/diff, follow active skill and original scope, then validate and report. No approval is inferred from this file.\n`;
  if (!plan) return md;
  return md+`\n## Locked execution plan\n\nRead ".agent-workflow/state/${id}/plan.md" first. Continue only next unfinished planned step. Do not implement out-of-plan findings. Ask user approval for an essential amendment.\n\n- Total steps: ${plan.steps.length}\n- Completed: ${plan.steps.filter(x=>x.status==='done').length}\n- Pending approvals: ${plan.findings.filter(x=>x.status==='approval-required').length}\n`;
}
function finishGuard(repo,id,state) {
  const plan=readPlan(repo,id,state);
  if (!plan) {
    if (state.risk==='HIGH_RISK') throw Error('PLAN_REQUIRED: high-risk legacy tasks need a locked plan and review attestation');
    return; // legacy unplanned ordinary task
  }
  const facts=gitFacts(repo);
  if (facts.branch!==plan.startBranch) throw Error('BRANCH_MISMATCH: locked plan belongs to a different branch');
  assertPlanCompletion(plan,{requireFinalized:true,risk:state.risk,owner:state.owner});
  const report=path.join(taskDir(repo,id),'final-report.md');
  if (!assertSafeFile(report)) throw Error('FINAL_REPORT_REQUIRED: plan must have final acceptance report before manual finish');
}
function exportTask(repo,id) {
  const dir=taskDir(repo,id);
  const state=readJSON(path.join(dir,'task.json'));
  if (state.schemaVersion!==1 || state.taskId!==id || path.resolve(state.repo)!==path.resolve(repo)) throw Error('task state mismatch');
  const content=render(repo,id,state,gitFacts(repo));
  const out=path.join(dir,'handoff.md');
  atomic(out,content);
  return out;
}
export function findCurrentTask(repo=DEFAULT_REPO) {
  const facts=gitFacts(repo);
  if (!facts.branch) throw Error('DETACHED_HEAD: select named branch before resume');
  const root=path.join(repo,'.agent-workflow/state');
  try {if (lstatSync(root).isSymbolicLink()) throw Error('unsafe state directory');} catch(e) {if(e.code==='ENOENT')throw Error('NO_HANDOFF');throw e;}
  const ids=[];
  const entries=readdirSync(root,{withFileTypes:true});
  if(entries.length>250) throw Error('too many task directories');
  for(const item of entries){
    if(!item.isDirectory() || !ID.test(item.name)) continue;
    const dir=taskDir(repo,item.name);
    if(!assertSafeFile(path.join(dir,'task.json'))) continue;
    const state=readJSON(path.join(dir,'task.json'));
    if(state.schemaVersion!==1||state.taskId!==item.name||path.resolve(state.repo)!==path.resolve(repo)) throw Error('invalid task metadata');
    let branch=state.startBranch;
    if(!branch){
      const snapshot=path.join(dir,'handoff.md');
      if(assertSafeFile(snapshot)) branch=readFileSync(snapshot,'utf8').match(/^- Branch at export: ([^\r\n]+)$/m)?.[1];
    }
    if(branch===facts.branch && state.status!=='finished') ids.push(item.name);
  }
  if(!ids.length) throw Error('NO_HANDOFF: no unfinished task on this branch');
  if(ids.length>1) throw Error(`AMBIGUOUS_HANDOFF: ${ids.join(', ')}`);
  return ids[0];
}
export function run(argv, repo=DEFAULT_REPO) {
  const [action,id,...arguments_]=argv;
  if(action==='resume') {
    if(argv.length!==1)throw Error('Usage: manual-handoff resume');
    return exportTask(repo,findCurrentTask(repo));
  }
  if(!['start','checkpoint','export','finish'].includes(action)||!ID.test(id??''))throw Error('Usage: manual-handoff start|checkpoint|export|finish <task-id>');
  const dir=taskDir(repo,id,action==='start');
  const stateFile=path.join(dir,'task.json');
  if(action==='start') {
    if(assertSafeFile(stateFile))throw Error('task already exists');
    const opts=options(arguments_,START);
    const goal=one(opts,'--goal');
    const risk=one(opts,'--risk',false)??'STANDARD';
    if(!['TRIVIAL','STANDARD','HIGH_RISK'].includes(risk))throw Error('invalid risk');
    const facts=gitFacts(repo);
    if(!facts.branch)throw Error('DETACHED_HEAD: select named branch before starting');
    const state={schemaVersion:1,taskId:id,repo:path.resolve(repo),startBranch:facts.branch,startHead:facts.head,status:'active',goal,owner:one(opts,'--owner',false)??'Unspecified agent (user-managed)',risk,acceptance:opts['--accept']??[],allowed:opts['--allowed']??[],forbidden:opts['--forbidden']??[],done:[],next:opts['--next']??[],checks:[],blockers:[],notes:[],updatedAt:new Date().toISOString()};
    saveJSON(stateFile,state);return exportTask(repo,id);
  }
  const state=readJSON(stateFile);
  if(state.taskId!==id||path.resolve(state.repo)!==path.resolve(repo))throw Error('task state mismatch');
  if(action==='finish') {
    if(arguments_.length)throw Error('finish takes no options');
    finishGuard(repo,id,state);
    if(state.status!=='finished'){state.status='finished';state.updatedAt=new Date().toISOString();saveJSON(stateFile,state);}
  } else if(action==='checkpoint') {
    if(state.status==='finished')throw Error('already finished');
    const opts=options(arguments_,Object.keys(FIELDS));
    if(!Object.keys(opts).length)throw Error('checkpoint requires progress');
    for(const [key,values] of Object.entries(opts)){
      const field=FIELDS[key];
      state[field]=field==='next'?values:[...new Set([...state[field],...values])];
    }
    state.updatedAt=new Date().toISOString();saveJSON(stateFile,state);
  } else if(arguments_.length) throw Error('export takes no options');
  return exportTask(repo,id);
}
if (process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {console.log(run(process.argv.slice(2)));}catch(e){console.error(`HANDOFF BLOCKED: ${e.message}`);process.exitCode=2;}
}
