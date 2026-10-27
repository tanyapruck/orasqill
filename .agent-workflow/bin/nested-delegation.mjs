/** Nested delegation packet validator and read-only plan preview. Never launches agents. */
import {readFileSync,lstatSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resource} from './task-planner.mjs';
import {validateConfiguration} from './model-config.mjs';

const RISK=['TRIVIAL','STANDARD','HIGH_RISK'];
const validName=x=>typeof x==='string'&&/^[a-zA-Z][\w-]{0,63}$/.test(x);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=4000;
function requireOk(value,message){if(!value)throw Error(message);}
function within(child,parent,platform){
  const a=resource(child),b=resource(parent);
  const x=platform==='win32'?a.toLowerCase():a;
  const y=platform==='win32'?b.toLowerCase():b;
  if(x.startsWith('res:')||y.startsWith('res:'))return x===y;
  return x===y||x.startsWith(y+'/');
}
function overlap(a,b,platform){return within(a,b,platform)||within(b,a,platform);}
function subset(values,allowed,platform){return values.every(v=>allowed.some(a=>within(v,a,platform)));}
function positiveInteger(x){return Number.isSafeInteger(x)&&x>=1;}

export function validateNestedTree(tree,lockedPlan,platform=process.platform){
  requireOk(tree&&tree.version===1&&validName(tree.rootTaskId)&&validName(tree.planStepId),
    'TREE_SCHEMA_REQUIRED: rootTaskId, planStepId and version 1');
  requireOk(lockedPlan?.schemaVersion===1&&Array.isArray(lockedPlan.steps)&&lockedPlan.steps.length,
    'LOCKED_PLAN_REQUIRED: use plan-ledger plan.json');
  const next=lockedPlan.steps.find(s=>s.status==='pending');
  requireOk(next&&next.id===tree.planStepId,'OUT_OF_PLAN: only next pending locked step may be delegated');
  requireOk(Array.isArray(tree.nodes)&&tree.nodes.length>=2&&tree.nodes.length<=100,
    'TREE_SCHEMA_REQUIRED: tree must have 2-100 nodes');
  requireOk(positiveInteger(tree.limits?.maxDepth)&&tree.limits.maxDepth<=6,
    'DEPTH_INVALID: requested depth must be 1-6');
  requireOk(positiveInteger(tree.limits?.maxActiveWorkers)&&tree.limits.maxActiveWorkers<=16,
    'CAPACITY_INVALID: requested concurrent worker count must be 1-16');
  const map=new Map();
  for(const n of tree.nodes){
    requireOk(validName(n?.id)&&!map.has(n.id),'NODE_ID_REQUIRED: unique safe IDs');
    requireOk(['orchestrator','worker'].includes(n.kind)&&text(n.objective),
      'NODE_REQUIRED: kind and bounded objective');
    requireOk(RISK.includes(n.risk),'RISK_REQUIRED: TRIVIAL|STANDARD|HIGH_RISK');
    requireOk(positiveInteger(n.budget),'BUDGET_REQUIRED: positive integer budget');
    requireOk(Array.isArray(n.acceptance)&&n.acceptance.length>0&&n.acceptance.every(text),
      'ACCEPTANCE_REQUIRED: node-level acceptance');
    requireOk(Array.isArray(n.resources?.write)&&n.resources.write.length>0&&
      Array.isArray(n.resources?.read),'SCOPE_REQUIRED: explicit read/write resources');
    for(const key of ['read','write']){
      requireOk(n.resources[key].length<=40,'SCOPE_REQUIRED: resources limit exceeded');
      for(const v of n.resources[key])resource(v);
    }
    requireOk(Array.isArray(n.dependsOn??[])&&(n.dependsOn??[]).every(validName),
      'DEPENDENCY_REQUIRED: valid dependency IDs');
    map.set(n.id,n);
  }
  requireOk(map.has('root')&&map.get('root').parentId===null&&
    map.get('root').kind==='orchestrator','ROOT_REQUIRED: root orchestrator with parentId null');
  requireOk(tree.nodes.filter(n=>n.parentId===null).length===1,
    'ROOT_REQUIRED: exactly one root');
  requireOk((map.get('root').dependsOn??[]).length===0,'DEPENDENCY_SCOPE: root has no sibling dependencies');
  requireOk(map.get('root').objective===next.text,
    'OUT_OF_PLAN: root objective must exactly match next pending locked step');
  requireOk(tree.nodes.every(n=>n.id==='root'||validName(n.parentId)&&map.has(n.parentId)),
    'PARENT_REQUIRED: every child references a valid parent');
  const depth=new Map([['root',0]]),active=new Set();
  function compute(id){
    if(depth.has(id))return depth.get(id);
    requireOk(!active.has(id),'PARENT_CYCLE');
    active.add(id);
    const n=map.get(id),p=map.get(n.parentId);
    requireOk(p?.kind==='orchestrator','PARENT_REQUIRED: a worker cannot orchestrate children');
    const d=compute(p.id)+1;
    requireOk(d<=tree.limits.maxDepth,'DEPTH_EXCEEDED: child depth exceeds requested limit');
    depth.set(id,d);active.delete(id);return d;
  }
  for(const id of map.keys())compute(id);
  for(const n of tree.nodes){
    if(n.id==='root')continue;
    const p=map.get(n.parentId);
    requireOk(subset(n.resources.write,p.resources.write,platform)&&
      subset(n.resources.read,[...p.resources.read,...p.resources.write],platform),
      'SCOPE_EXCEEDED: child resources must be contained within parent');
    requireOk(n.budget<=p.budget,'BUDGET_EXCEEDED: child budget exceeds parent');
    requireOk(RISK.indexOf(n.risk)>=RISK.indexOf(p.risk),
      'RISK_DOWNGRADE: child cannot lower parent risk');
  }
  for(const p of tree.nodes){
    const children=tree.nodes.filter(n=>n.parentId===p.id);
    requireOk(!children.length||p.kind==='orchestrator','PARENT_REQUIRED: leaf worker expected');
    requireOk(children.reduce((sum,n)=>sum+n.budget,0)<=p.budget,
      'BUDGET_EXCEEDED: child budgets must sum to at most parent budget');
    const peers=new Map(children.map(n=>[n.id,n]));
    for(const n of children){
      requireOk((n.dependsOn??[]).every(id=>id!==n.id&&peers.has(id)),
        'DEPENDENCY_SCOPE: dependencies must be distinct siblings');
      for(const other of children){
        if(other.id===n.id)continue;
        requireOk(!n.resources.write.some(w=>other.resources.write.some(y=>overlap(w,y,platform))),
          'RESOURCE_CONFLICT: sibling write scopes must not overlap');
      }
    }
    const visiting=new Set(),seen=new Set();
    function checkCycle(id){
      if(seen.has(id))return;
      requireOk(!visiting.has(id),'DEPENDENCY_CYCLE');
      visiting.add(id);
      for(const d of peers.get(id).dependsOn??[])checkCycle(d);
      visiting.delete(id);seen.add(id);
    }
    for(const n of children)checkCycle(n.id);
  }
  return {map,depth,next};
}

export function previewNestedTree(tree,lockedPlan,config,platform=process.platform){
  const {map,depth}=validateNestedTree(tree,lockedPlan,platform);
  validateConfiguration(config);
  const allowance=config.delegation??{max_depth:1,max_parallel_workers:1};
  const blockers=[];
  if(config.setup.status!=='confirmed')blockers.push('SETUP_REQUIRED: model runtimes not confirmed');
  if(tree.limits.maxDepth>allowance.max_depth)blockers.push('DEPTH_APPROVAL_REQUIRED: requested depth exceeds config');
  if(tree.limits.maxActiveWorkers>allowance.max_parallel_workers)
    blockers.push('CAPACITY_APPROVAL_REQUIRED: requested concurrency exceeds config');
  const packets=tree.nodes.filter(n=>n.id!=='root').map(n=>({
    id:n.id,parentId:n.parentId,depth:depth.get(n.id),kind:n.kind,objective:n.objective,
    planStepId:tree.planStepId,read:n.resources.read,write:n.resources.write,
    acceptance:n.acceptance,risk:n.risk,budget:n.budget,
    remainingDepth:tree.limits.maxDepth-depth.get(n.id),
    stopConditions:['Outside scope -> Finding to parent','Budget exceeded -> stop','Failed tests -> report evidence','Missing runtime authority -> stop'],
    executionAuthorized:false
  }));
  const highRisk=tree.nodes.some(n=>n.risk==='HIGH_RISK');
  if(highRisk)blockers.push('HIGH_RISK: independent review and protected-action approval required');
  blockers.push('RUNTIME_VERIFICATION_REQUIRED: agent spawning, budgets and isolation not executable here');
  return {
    mode:'NESTED_PLAN_ONLY',rootTaskId:tree.rootTaskId,planStepId:tree.planStepId,
    requestedMaxDepth:tree.limits.maxDepth,requestedMaxActiveWorkers:tree.limits.maxActiveWorkers,
    configuredMaxDepth:allowance.max_depth,configuredMaxActiveWorkers:allowance.max_parallel_workers,
    nodeCount:tree.nodes.length,treeDepth:Math.max(...depth.values()),packets,
    requiredIndependentReview:highRisk,blockers,agentsLaunched:0,
    readyToDispatch:false,integrated:false,
    note:'A proposal only. Explicit trusted delegation approval and runtime capability proof are required; no code is executed.'
  };
}
function safeRead(file){
  const stats=lstatSync(file);
  requireOk(stats.isFile()&&!stats.isSymbolicLink(),'UNSAFE_INPUT: ordinary file required');
  return JSON.parse(readFileSync(file,'utf8'));
}
export function run(args){
  const [action,input,...tail]=args;
  requireOk(['plan','packet'].includes(action)&&input,'Usage: nested-delegation.mjs plan|packet <tree.json> [node-id] --locked-plan <plan.json> [--config <config.json>]');
  let packetId,locked,config;
  for(let i=0;i<tail.length;i++){
    if(action==='packet'&&!packetId&&!tail[i].startsWith('--'))packetId=tail[i];
    else if(tail[i]==='--locked-plan'&&tail[i+1])locked=tail[++i];
    else if(tail[i]==='--config'&&tail[i+1])config=tail[++i];
    else throw Error('UNKNOWN_OPTION: '+tail[i]);
  }
  requireOk(locked&& (action!=='packet'||packetId),'LOCKED_PLAN_REQUIRED: provide --locked-plan and packet node ID');
  const tree=safeRead(path.resolve(input)),plan=safeRead(path.resolve(locked));
  const configPath=config?path.resolve(config):path.resolve('.agent-workflow/config.example.json');
  const settings=safeRead(configPath);
  const proposal=previewNestedTree(tree,plan,settings);
  if(action==='packet'){
    const found=proposal.packets.find(x=>x.id===packetId);
    requireOk(found,'PACKET_NOT_FOUND');
    return {packet:found,blockers:proposal.blockers,readyToDispatch:false,agentsLaunched:0};
  }
  return proposal;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(run(process.argv.slice(2)),null,2));}
  catch(e){console.error('NESTED DELEGATION BLOCKED: '+e.message);process.exitCode=2;}
}
