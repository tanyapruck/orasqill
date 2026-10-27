/** Read-only validation and preview for Orasqill's interactive model mapping Skill. */
import {readFileSync, lstatSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const knownProfiles=new Set(['claude-orchestrator','openai-orchestrator']);
export const agentProfiles=Object.freeze({
  'claude-code':{preset:'claude-orchestrator',file:'.agent-workflow/routing/claude-code.json'},
  codex:{preset:'openai-orchestrator',file:'.agent-workflow/routing/codex.json'}
});
const efforts=new Set(['low','medium','high','xhigh','max']);
const stages=['triage','plan','implement','scoped_implement','complex_implement','computer_use','review','critical_review','final_report'];
const roles=['orchestrator','implementer','reviewer'];

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function requireValid(ok,message){if(!ok)throw Error(message);}
function text(x){return typeof x==='string'&&!!x.trim()&&!/[\u0000-\u001f]/.test(x);}

export function validateConfiguration(config) {
  requireValid(object(config)&&config.version===1,'CONFIG_VERSION_REQUIRED: expected version 1');
  requireValid(object(config.setup)&&['unconfirmed','confirmed'].includes(config.setup.status),'SETUP_REQUIRED: setup.status must be unconfirmed or confirmed');
  requireValid(object(config.routing),'ROUTING_REQUIRED: missing routing');
  for(const role of roles){
    const entry=config.routing[role];
    requireValid(object(entry)&&Array.isArray(entry.preferred)&&Array.isArray(entry.fallback),'ROUTING_REQUIRED: invalid '+role);
    requireValid(entry.preferred.length<=16&&entry.fallback.length<=16,'ROUTING_REQUIRED: too many model candidates');
    for(const candidate of [...entry.preferred,...entry.fallback])validateCandidate(candidate);
  }
  requireValid(config.routing.orchestrator.automatic_switching===false,'AUTOMATIC_SWITCHING_DISABLED: profile must not activate automatic switching');
  requireValid(config.routing.reviewer.require_independent_author===true,'INDEPENDENT_REVIEW_REQUIRED: independent reviewer gate must stay true');

  if(config.stage_preferences!==undefined){
    requireValid(object(config.stage_preferences),'STAGES_REQUIRED: stage_preferences must be an object');
    for(const [stage,value] of Object.entries(config.stage_preferences)){
      requireValid(stages.includes(stage)&&object(value)&&text(value.role),'STAGES_REQUIRED: invalid stage '+stage);
      if(value.model!==undefined||value.runtime!==undefined||value.effort!==undefined||value.requested_mode!==undefined){
        validateCandidate(value);
      } else {
        requireValid(roles.includes(value.role),'STAGES_REQUIRED: role-only stage must inherit a defined routing role');
      }
    }
  }
  if(config.delegation){
    const d=config.delegation;
    const depth=d.max_depth??1; // Historical user configs without this optional field remain valid.
    requireValid(object(d)&&Number.isSafeInteger(depth)&&depth>=1&&depth<=6&&
      Number.isSafeInteger(d.max_parallel_workers)&&d.max_parallel_workers>=1&&d.max_parallel_workers<=16,
      'DELEGATION_REQUIRED: depth 1-6 and workers 1-16 required');
    if(d.max_parallel_workers>1){
      const c=d.runtime_capabilities;
      requireValid(config.setup.status==='confirmed'&&object(c)&&
        c.supportsConcurrentWorkers===true&&c.enforcesOwnership===true&&
        c.enforcesIsolation===true&&
        config.task_execution?.mode==='bounded_parallel'&&
        config.task_execution.max_active_child_tasks>=d.max_parallel_workers,
        'PARALLEL_SETUP_REQUIRED: confirmed candidate capabilities, ownership/isolation and global worker limit required');
    }
  }
  requireValid(object(config.workers??{})&&object(config.runtimes??{}),'SETUP_REQUIRED: workers and runtimes must be objects');
  return {valid:true,setupStatus:config.setup.status,checkedRoles:roles.length,checkedStages:Object.keys(config.stage_preferences??{}).length,warning:'Structural validation only: runtime/model availability, reviewer identity, effort support and skill loadability remain unverified.'};
}

export function validateCandidate(candidate){
  requireValid(object(candidate)&&text(candidate.model)&&text(candidate.runtime),'MODEL_REQUIRED: runtime and model must be nonempty strings');
  requireValid(efforts.has(candidate.effort),'EFFORT_REQUIRED: use low|medium|high|xhigh|max; Ultra is not an API effort');
  if(candidate.requested_mode!==undefined){
    requireValid(candidate.requested_mode==='ultra'&&candidate.effort==='max','ULTRA_REQUIRES_RUNTIME: use effort max plus requested_mode ultra (manual client verification)');
  }
  return true;
}

export function loadPreset(name){
  requireValid(knownProfiles.has(name),'PROFILE_REQUIRED: choose claude-orchestrator or openai-orchestrator');
  const file=path.join(root,'.agent-workflow/profiles',name+'.json');
  const data=JSON.parse(readFileSync(file,'utf8'));
  validateConfiguration(data);
  requireValid(data.setup.profile===name&&data.setup.status==='unconfirmed','PROFILE_REQUIRED: preset must be unconfirmed and match its file');
  return data;
}

function readConfig(file){
  const stat=lstatSync(file);
  requireValid(stat.isFile()&&!stat.isSymbolicLink(),'UNSAFE_CONFIG_PATH: regular file required');
  return JSON.parse(readFileSync(file,'utf8'));
}

/** Resolve one invoking agent's candidate mapping without ever using the other agent's config.
 * Missing routes use the matching legacy profile only, otherwise the built-in unconfirmed preset.
 * Source files and candidate values remain read-only; this never switches the actual model. */
export function resolveAgentRouting(agent, workspace=process.cwd()){
  const spec=agentProfiles[agent];
  requireValid(spec,'AGENT_REQUIRED: explicit claude-code or codex identity required');
  const rootDir=path.resolve(workspace);
  requireValid(existsSync(rootDir)&&lstatSync(rootDir).isDirectory()&&!lstatSync(rootDir).isSymbolicLink(),
    'WORKSPACE_REQUIRED: real directory required');
  const localFile=path.join(rootDir,spec.file);
  const legacyFile=path.join(rootDir,'.agent-workflow/config.json');
  function verifyPath(file){
    let current=rootDir;
    for(const segment of path.relative(rootDir,file).split(path.sep)){
      current=path.join(current,segment);
      if(!existsSync(current))return false;
      const st=lstatSync(current);
      requireValid(!st.isSymbolicLink(),'UNSAFE_CONFIG_PATH: symlink component');
      if(current!==file)requireValid(st.isDirectory(),'UNSAFE_CONFIG_PATH: directory expected');
    }
    return true;
  }
  if(verifyPath(localFile)){
    const config=readConfig(localFile);
    validateConfiguration(config);
    requireValid(config.setup.profile===spec.preset,'ROUTING_AGENT_MISMATCH: wrong owner profile in agent route');
    return {agent,source:'agent-local',file:localFile,config,validation:validateConfiguration(config),executionAuthorized:false};
  }
  if(verifyPath(legacyFile)){
    const legacy=readConfig(legacyFile);
    validateConfiguration(legacy);
    if(legacy.setup.profile===spec.preset){
      return {agent,source:'matching-legacy',file:legacyFile,config:legacy,
        validation:validateConfiguration(legacy),executionAuthorized:false};
    }
  }
  const config=loadPreset(spec.preset);
  return {agent,source:'bundled-candidate',file:null,config,
    validation:validateConfiguration(config),executionAuthorized:false};
}

export function run(argv){
  const [command,arg,...rest]=argv;
  if(command==='resolve'){
    requireValid(rest.length===0||(rest.length===2&&rest[0]==='--workspace'&&text(rest[1])),
      'Usage: model-config.mjs resolve claude-code|codex [--workspace <directory>]');
    return JSON.stringify(resolveAgentRouting(arg,rest.length?rest[1]:process.cwd()),null,2);
  }
  requireValid(rest.length===0,'Usage: model-config.mjs preview <profile> | validate <path> | resolve claude-code|codex [--workspace <directory>]');
  if(command==='preview'){
    const preset=loadPreset(arg);
    return JSON.stringify({profile:arg,config:preset,validation:validateConfiguration(preset)},null,2);
  }
  if(command==='validate'){
    requireValid(text(arg),'Usage: model-config.mjs validate <path>');
    const file=path.resolve(arg);
    const data=readConfig(file);
    return JSON.stringify({file,validation:validateConfiguration(data)},null,2);
  }
  throw Error('Usage: model-config.mjs preview <profile> | validate <path> | resolve claude-code|codex [--workspace <directory>]');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(run(process.argv.slice(2)));}
  catch(e){console.error('MODEL CONFIG BLOCKED: '+e.message);process.exitCode=2;}
}
