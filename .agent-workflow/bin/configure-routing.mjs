/** Interactive, explicit-approval model routing editor. Never launches agents or activates a model. */
import {existsSync,lstatSync,mkdirSync,readFileSync,writeFileSync,renameSync,unlinkSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {agentProfiles,resolveAgentRouting,validateConfiguration,validateCandidate} from './model-config.mjs';

const roles=['orchestrator','implementer','reviewer'];
const stages=['triage','plan','implement','scoped_implement','complex_implement','computer_use','review','critical_review','final_report'];
const effortLevels=['low','medium','high','xhigh','max'];
const safeText=v=>typeof v==='string'&&!!v.trim()&&!/[\x00-\x1f]/.test(v);
function ensure(ok,message){if(!ok)throw Error(message);}

export function parseConfigureArgs(argv){
  let workspace=process.cwd(),agent;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--workspace'){ensure(safeText(argv[i+1]),'WORKSPACE_REQUIRED: supply a workspace directory');workspace=argv[++i];}
    else if(argv[i]==='--agent'){ensure(Object.hasOwn(agentProfiles,argv[i+1]),'AGENT_REQUIRED: claude-code|codex|other');agent=argv[++i];}
    else throw Error('Usage: orasqill oranit --configure [--agent claude-code|codex|other] [--workspace <directory>]');
  }
  return {workspace,agent};
}

export function setMapping(config,choice,candidate){
  const draft=structuredClone(config);
  validateCandidate(candidate);
  ensure(roles.includes(choice)||stages.includes(choice),'MAPPING_REQUIRED: choose a role or valid stage');
  if(roles.includes(choice)){
    draft.routing[choice].preferred=[candidate];
  } else {
    const current=draft.stage_preferences?.[choice]??{};
    draft.stage_preferences??={};
    const role=roles.includes(current.role)?current.role:'implementer';
    draft.stage_preferences[choice]={role,...candidate};
  }
  // The structural schema does not prove that a provider/model is actually available.
  draft.setup.status='unconfirmed';
  validateConfiguration(draft);
  return draft;
}

function candidateFor(config,choice){
  if(roles.includes(choice))return config.routing[choice].preferred[0]??{};
  return config.stage_preferences?.[choice]??{};
}

function preview(candidate){
  const out={runtime:candidate.runtime??'',model:candidate.model??''};
  if(candidate.provider)out.provider=candidate.provider;
  if(candidate.effort)out.effort=candidate.effort;
  if(candidate.requested_mode)out.requested_mode=candidate.requested_mode;
  return out;
}

function validateWriteLocation(root,target){
  const rootStat=lstatSync(root);
  ensure(rootStat.isDirectory()&&!rootStat.isSymbolicLink(),'UNSAFE_WORKSPACE_ROOT');
  let current=root;
  for(const seg of path.relative(root,path.dirname(target)).split(path.sep)){
    current=path.join(current,seg);
    if(!existsSync(current))continue;
    const st=lstatSync(current);
    ensure(st.isDirectory()&&!st.isSymbolicLink(),'UNSAFE_CONFIG_PATH: unsafe directory');
  }
  if(existsSync(target)){
    const st=lstatSync(target);
    ensure(st.isFile()&&!st.isSymbolicLink(),'UNSAFE_CONFIG_PATH: unsafe routing file');
  }
}

export async function configureRouting(argv,{ask,print=()=>{}}={}){
  const parsed=parseConfigureArgs(argv);
  const root=path.resolve(parsed.workspace);
  ensure(existsSync(root),'WORKSPACE_REQUIRED: run oranit to initialize this workspace first');
  const stat=lstatSync(root);
  ensure(stat.isDirectory()&&!stat.isSymbolicLink(),'UNSAFE_WORKSPACE_ROOT');
  const workspace=realpathSync(root);
  const shared=path.join(workspace,'.agent-workflow/config.json');
  ensure(existsSync(shared),'SETUP_REQUIRED: run oranit in this workspace before configuring');
  validateWriteLocation(workspace,shared);
  validateConfiguration(JSON.parse(readFileSync(shared,'utf8')));

  let reader;
  if(!ask){
    ensure(stdin.isTTY&&stdout.isTTY,'INTERACTIVE_REQUIRED: run in a terminal, or use the /configure-models or $configure-models Skill');
    reader=createInterface({input:stdin,output:stdout});
    ask=q=>reader.question(q);
  }
  try{
    let agent=parsed.agent;
    if(!agent){
      agent=(await ask('Choose route [claude-code/codex/other] (or cancel): ')).trim();
      if(agent==='cancel')return {written:false,cancelled:true};
      ensure(Object.hasOwn(agentProfiles,agent),'AGENT_REQUIRED: claude-code|codex|other');
    }
    const existing=resolveAgentRouting(agent,workspace);
    const file=path.join(workspace,agentProfiles[agent].file);
    validateWriteLocation(workspace,file);
    let draft=structuredClone(existing.config),changes=[];
    print('Editing '+agent+' ('+existing.source+'); only '+agentProfiles[agent].file+' can change.');
    print('Nothing is activated; use role or stage names to edit, then type done.');
    for(let n=0;n<30;n++){
      const choice=(await ask('Edit [orchestrator/implementer/reviewer/stage name/done/cancel]: ')).trim();
      if(choice==='cancel')return {written:false,cancelled:true,agent};
      if(choice==='done')break;
      ensure(roles.includes(choice)||stages.includes(choice),'MAPPING_REQUIRED: unknown role or stage');
      const before=candidateFor(draft,choice);
      print('Current '+choice+': '+JSON.stringify(preview(before)));
      const runtime=(await ask('Runtime ID (e.g. codex, claude-code, external adapter; blank keeps current): ')).trim()||before.runtime;
      const model=(await ask('Model ID (blank keeps current): ')).trim()||before.model;
      ensure(safeText(runtime)&&safeText(model),'MODEL_REQUIRED: runtime and model ID required');
      let provider=before.provider;
      if(!['claude-code','codex'].includes(runtime)){
        const entered=(await ask('Provider (optional; blank keeps current): ')).trim();
        if(entered)provider=entered;
      } else {
        provider=undefined;
      }
      let effort=before.effort;
      const entered=(await ask('Effort [low/medium/high/xhigh/max/none] (blank keeps current): ')).trim();
      if(entered==='none')effort=undefined;
      else if(entered)effort=entered;
      if(['claude-code','codex'].includes(runtime)&&effort===undefined){
        effort='medium';
        print('Using medium effort for Claude Code/Codex (validate against your runtime).');
      }
      ensure(effort===undefined||effortLevels.includes(effort),'EFFORT_REQUIRED: invalid effort');
      const candidate={runtime,model};
      if(provider)candidate.provider=provider;
      if(effort)candidate.effort=effort;
      if(before.requested_mode==='ultra'&&effort==='max'&&runtime===before.runtime&&model===before.model){
        candidate.requested_mode='ultra';
      }
      draft=setMapping(draft,choice,candidate);
      changes.push({choice,before:preview(before),after:preview(candidate)});
      print('Draft '+choice+': '+JSON.stringify(preview(candidate)));
      if(n===29)throw Error('EDIT_LIMIT: maximum 30 edits per session');
    }
    if(!changes.length)return {agent,written:false,reason:'no_changes',file};
    print('Proposed changes: '+JSON.stringify(changes,null,2));
    print('Will set setup.status=unconfirmed. This does not activate the chosen models.');
    const approval=(await ask('Write ONLY '+agentProfiles[agent].file+'? Type yes to confirm: ')).trim();
    if(approval!=='yes')return {agent,written:false,cancelled:true,file};
    // Re-read before any write: do not clobber a changed config.
    const current=resolveAgentRouting(agent,workspace);
    ensure(current.source===existing.source&&
      JSON.stringify(current.config)===JSON.stringify(existing.config),
      'CONCURRENT_CONFIG_CHANGE: routing changed during interview');
    validateConfiguration(draft);
    validateWriteLocation(workspace,file);
    const parent=path.dirname(file);
    if(!existsSync(parent))mkdirSync(parent,{recursive:true,mode:0o700});
    validateWriteLocation(workspace,file);
    const temp=file+'.'+process.pid+'.tmp';
    ensure(!existsSync(temp),'CONCURRENT_CONFIG_WRITE: temporary file already exists');
    try{
      writeFileSync(temp,JSON.stringify(draft,null,2)+'\n',{mode:0o600,flag:'wx'});
      renameSync(temp,file);
    }finally{if(existsSync(temp))unlinkSync(temp);}
    return {agent,file,written:true,changes:changes.length,validation:validateConfiguration(draft),modelRuntimeReady:false};
  }finally{await reader?.close();}
}
