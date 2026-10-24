/** Pure advisory scheduler. It cannot launch workers, verify ownership, or grant permissions. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const RISK=new Set(['TRIVIAL','STANDARD','HIGH_RISK']);
const FLAGS=new Set(['security_sensitive','schema_change','migration','destructive','irreversible','production_sensitive']);
export function resource(value) {
  if(typeof value!=='string'||!value.trim())throw Error('resource must be nonempty string');
  const p=value.trim().replaceAll('\\','/');
  if(p.startsWith('res:')) {if(!/^res:[\w.:-]+$/.test(p))throw Error('invalid logical resource');return p;}
  if(p.startsWith('/')||/^[a-z]:\//i.test(p)||p.includes('*')||p.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('unsafe resource path');
  return p;
}
const overlaps=(a,b,platform)=>{
  if(a.startsWith('res:')||b.startsWith('res:'))return a===b;
  const x=platform==='win32'?a.toLowerCase():a,y=platform==='win32'?b.toLowerCase():b;
  return x===y||x.startsWith(y+'/')||y.startsWith(x+'/');
};
export function conflicts(a,b,platform=process.platform) {
  const aw=a.resources.write.map(resource),bw=b.resources.write.map(resource);
  const ar=(a.resources.read??[]).map(resource),br=(b.resources.read??[]).map(resource);
  return aw.some(x=>[...bw,...br].some(y=>overlaps(x,y,platform))) || bw.some(x=>ar.some(y=>overlaps(x,y,platform)));
}
export function validatePlan(plan) {
  if(!Array.isArray(plan?.tasks)||!plan.tasks.length)throw Error('SCHEDULER_SCHEMA_REQUIRED: expected tasks array, not plan-ledger steps; use a separate scheduler-tasks.json');
  const seen=new Set();
  for(const t of plan.tasks){
    if(typeof t?.id!=='string'||!/^[\w-]+$/.test(t.id)||seen.has(t.id))throw Error('duplicate/invalid task ID');seen.add(t.id);
    if(typeof t.objective!=='string'||!t.objective.trim())throw Error('task objective must be nonempty text');
    if(!RISK.has(t.risk??'STANDARD'))throw Error('invalid risk');
    if(!Array.isArray(t.dependsOn??[]))throw Error('invalid dependencies');
    if(!Array.isArray(t.resources?.read??[])||!Array.isArray(t.resources?.write)||!t.resources.write.length)throw Error('each task needs resource arrays and scoped writable resource');
    for(const key of ['read','write'])for(const item of t.resources?.[key]??[])resource(item);
    if(!Array.isArray(t.flags??[]))throw Error('invalid risk flags');
    for(const f of t.flags??[])if(!FLAGS.has(f))throw Error('unknown risk flag');
  }
  const visiting=new Set(),visited=new Set(),lookup=new Map(plan.tasks.map(t=>[t.id,t]));
  function walk(id){if(visiting.has(id))throw Error('dependency cycle');if(visited.has(id))return;visiting.add(id);for(const dep of lookup.get(id).dependsOn??[]){if(!lookup.has(dep))throw Error('missing dependency');walk(dep);}visiting.delete(id);visited.add(id);}
  for(const id of lookup.keys())walk(id);
  return plan;
}
/** Advisory binding: scheduling never amends/authorizes steps outside the locked ledger. */
export function validateSchedulerBinding(graph, lockedPlan) {
  validatePlan(graph);
  if (!lockedPlan || !Array.isArray(lockedPlan.steps) || lockedPlan.schemaVersion !== 1) {
    throw Error('LOCKED_PLAN_REQUIRED: use a plan-ledger plan.json');
  }
  const seen=new Set();
  for (const task of graph.tasks) {
    const step=lockedPlan.steps.find(x=>x.id===task.planStepId);
    if (!step || step.status!=='pending' || seen.has(task.planStepId) || task.objective!==step.text) {
      throw Error(`OUT_OF_PLAN: scheduler task ${task.id} must match a distinct pending locked step ID and objective`);
    }
    seen.add(task.planStepId);
  }
  // A locked ledger completes its steps in order. A schedule may cover a
  // contiguous prefix of remaining steps, never bypass an earlier pending step.
  let previousPending=null;
  for(const step of lockedPlan.steps){
    if(step.status!=='pending')continue;
    const current=graph.tasks.find(t=>t.planStepId===step.id);
    if(current&&previousPending){
      const predecessor=graph.tasks.find(t=>t.planStepId===previousPending);
      if(!predecessor||!current.dependsOn.includes(predecessor.id)){
        throw Error(`OUT_OF_ORDER: ${step.id} requires the preceding pending step ${previousPending}`);
      }
    }
    previousPending=step.id;
  }
  return graph;
}
export function makeSchedule(plan,limits={},platform=process.platform) {
  validatePlan(plan);
  const highRisk=plan.tasks.some(t=>t.risk==='HIGH_RISK'||(t.flags??[]).some(f=>FLAGS.has(f)));
  const requested=limits.maxWorkers??1,available=limits.runtime?.maxWorkers??1;
  if(!Number.isSafeInteger(requested)||requested<1||!Number.isSafeInteger(available)||available<1)throw Error('invalid worker limit');
  const capped=Math.min(requested,available);
  const canParallel=!!(limits.allowParallel&&limits.runtime?.supportsConcurrentWorkers&&limits.runtime?.enforcesOwnership&&limits.runtime?.enforcesIsolation&&capped>1&&!highRisk);
  const workerCount=canParallel?capped:1;
  const remaining=new Map(plan.tasks.map(t=>[t.id,t])),done=new Set(),waves=[];
  while(remaining.size){
    const wave=[];
    for(const [id,task] of remaining){
      if(!(task.dependsOn??[]).every(d=>done.has(d)))continue;
      if(wave.some(x=>conflicts(task,remaining.get(x),platform)))continue;
      if(wave.length>=workerCount)break;
      wave.push(id);
    }
    if(!wave.length)throw Error('no schedulable tasks');
    for(const id of wave){remaining.delete(id);done.add(id);}
    waves.push(wave);
  }
  return {mode:plan.tasks.length===1?'SURGICAL':canParallel?'ADAPTIVE_PARALLEL':'SEQUENTIAL',workerCount,waves,requiresIndependentReview:highRisk,requiresPreActionAuthority:highRisk,finalValidation:'ONCE_AFTER_INTEGRATION',integrationReady:false,enforcesOwnership:false,enforcesIsolation:false};
}
const isCLI=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCLI){
  try {
    const [input,flag,lockedPath,...extras]=process.argv.slice(2);
    if (!input || extras.length || (flag && (flag!=='--locked-plan' || !lockedPath))) {
      throw Error('Usage: node task-planner.mjs <scheduler-tasks.json> [--locked-plan <locked-plan.json>]');
    }
    const graph=JSON.parse(readFileSync(input,'utf8'));
    if (lockedPath) validateSchedulerBinding(graph,JSON.parse(readFileSync(lockedPath,'utf8')));
    console.log(JSON.stringify(makeSchedule(graph,{},process.platform),null,2));
  } catch(e) {console.error(`PLANNER BLOCKED: ${e.message}`);process.exitCode=2;}
}
