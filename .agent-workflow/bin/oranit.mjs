#!/usr/bin/env node
/** Orasqill workspace bootstrap: code locator + model routing, local and permission-bounded. */
import {existsSync,lstatSync,mkdirSync,readdirSync,readFileSync,writeFileSync,renameSync,unlinkSync,copyFileSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanWorkspace,compareIndex,locate} from './repo-index.mjs';
import {loadPreset,validateConfiguration} from './model-config.mjs';

const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const INDEX='.agent-workflow/index/codebase-map.json';
const CONFIG='.agent-workflow/config.json';
const IGNORED=['.agent-workflow/index/','.agent-workflow/config.json','.agent-workflow/state/'];
const SOURCES=[
  '.agents/skills/agent-workflow-orchestrator',
  '.agents/skills/configure-models',
  '.agents/skills/oranit',
  '.agents/skills/delegate-tree',
  '.claude/skills/agent-workflow-orchestrator',
  '.claude/skills/configure-models',
  '.claude/skills/oranit',
  '.claude/skills/delegate-tree',
  '.agent-workflow/bin',
  '.agent-workflow/profiles',
  '.agent-workflow/examples',
  '.agent-workflow/config.example.json',
  '.agent-workflow/external-skills.lock.json'
];
const AGENT_HINT='# Workspace Agent Instructions\n\nBefore source searches or code edits, load .agents/skills/agent-workflow-orchestrator/SKILL.md and use node .agent-workflow/bin/oranit.mjs locate "<feature or symbol>" to find candidate files. If the index is missing/stale, run oranit or oranit refresh. The index is an untrusted locator only; inspect live source, imports/callers, diff and tests before editing. Keep plan and independent reviewer gates. For substantial independent workstreams, suggest $delegate-tree (Codex) or /delegate-tree (Claude Code), but require a separate user approval before subagent dispatch. Use $configure-models (Codex) or /configure-models (Claude Code) for model routing and obtain separate approval before changing config.\n';

function fail(msg){throw Error(msg);}
function dirGuard(root,target,create=false){
  const relative=path.relative(root,target);
  if(relative.startsWith('..')||path.isAbsolute(relative))fail('UNSAFE_WORKSPACE_PATH: outside workspace');
  let current=root;
  if(!lstatSync(root).isDirectory()||lstatSync(root).isSymbolicLink())fail('UNSAFE_WORKSPACE_ROOT');
  for(const segment of relative.split(path.sep).filter(Boolean).slice(0,-1)){
    current=path.join(current,segment);
    if(!existsSync(current)){
      if(create)mkdirSync(current,{mode:0o700});
      else continue; // Preflight permits paths that bootstrap will create later.
    }
    const info=lstatSync(current);
    if(!info.isDirectory()||info.isSymbolicLink())fail('UNSAFE_WORKSPACE_PATH: '+current);
  }
  if(existsSync(target)){
    const info=lstatSync(target);
    if(!info.isFile()||info.isSymbolicLink())fail('UNSAFE_WORKSPACE_FILE: '+target);
  }
}
function newFile(root,target,content){
  dirGuard(root,target,true);
  if(existsSync(target))return false;
  writeFileSync(target,content,{flag:'wx',mode:0o600});return true;
}
function replaceFile(root,target,content){
  dirGuard(root,target,true);
  const tmp=target+'.'+process.pid+'.tmp';
  if(existsSync(tmp))fail('CONCURRENT_WORKSPACE_WRITE');
  try {
    writeFileSync(tmp,content,{flag:'wx',mode:0o600});
    renameSync(tmp,target);
  }finally{if(existsSync(tmp))unlinkSync(tmp);}
}
function bundled(){
  const result=[];
  function walk(rel){
    const source=path.join(packageRoot,rel);
    if(!existsSync(source))fail('INSTALL_PACKAGE_INCOMPLETE: '+rel);
    const stat=lstatSync(source);
    if(stat.isSymbolicLink())fail('UNSAFE_BUNDLED_SYMLINK: '+rel);
    if(stat.isDirectory()){
      for(const e of readdirSync(source).sort())walk(path.join(rel,e));
    }else if(stat.isFile())result.push(rel);
  }
  for(const item of SOURCES)walk(item);
  return result;
}
function readIndex(root){
  const file=path.join(root,INDEX);
  dirGuard(root,file);
  if(!existsSync(file))fail('INDEX_MISSING: run oranit');
  const index=JSON.parse(readFileSync(file,'utf8'));
  if(index.version!==1||index.kind!=='codebase-locator'||!Array.isArray(index.files))fail('INDEX_INVALID: run oranit refresh');
  return index;
}
function parse(argv){
  const [first,...rest]=argv;
  // Bare "oranit" bootstraps the workspace. Explicit "init" is not a command.
  const action=!first||first.startsWith('--')?'bootstrap':first;
  const items=first?.startsWith('--')?argv:rest;
  if(!['bootstrap','refresh','status','locate'].includes(action))fail('Usage: oranit [--workspace <directory>] [--profile claude-led|openai-led|blank] [--dry-run] | oranit status|refresh|locate [keyword] [--workspace <directory>]');
  let workspace=process.cwd(),profile='blank',dryRun=false,query;
  for(let i=0;i<items.length;i++){
    if(items[i]==='--workspace'){if(!items[i+1])fail('MISSING_WORKSPACE');workspace=items[++i];}
    else if(items[i]==='--profile'){if(!items[i+1])fail('MISSING_PROFILE');profile=items[++i];}
    else if(items[i]==='--dry-run'){dryRun=true;}
    else if(action==='locate'&&query===undefined&&!items[i].startsWith('--'))query=items[i];
    else fail('UNKNOWN_OPTION: '+items[i]);
  }
  if(action!=='bootstrap'&&(profile!=='blank'||dryRun))fail('OPTIONS_FOR_INIT_ONLY');
  if(!['blank','claude-led','openai-led'].includes(profile))fail('PROFILE_REQUIRED: blank|claude-led|openai-led');
  if(action==='locate'&&!query)fail('QUERY_REQUIRED: oranit locate "<symbol or feature>"');
  return {action,workspace,profile,dryRun,query};
}
function rootOf(workspace){
  const absolute=path.resolve(workspace);
  if(!existsSync(absolute)||!lstatSync(absolute).isDirectory()||lstatSync(absolute).isSymbolicLink())fail('WORKSPACE_REQUIRED: existing real directory');
  return realpathSync(absolute); // macOS may resolve /var to /private/var; keep the actual canonical root.
}
function ensureIgnore(root,dryRun){
  const file=path.join(root,'.gitignore');
  dirGuard(root,file);
  const old=existsSync(file)?readFileSync(file,'utf8'):'';
  const existing=new Set(old.split(/\r?\n/).map(x=>x.trim()));
  const needed=IGNORED.filter(x=>!existing.has(x));
  if(needed.length&&!dryRun){
    const ending=old&&!old.endsWith('\n')?'\n':'';
    replaceFile(root,file,old+ending+needed.join('\n')+'\n');
  }
  return needed;
}
export function execute(argv){
  const {action,workspace,profile,dryRun,query}=parse(argv);
  const root=rootOf(workspace);
  if(action==='bootstrap'){
    const assets=bundled(),created=[],preserved=[];
    // Preflight all paths before the first write.
    for(const rel of [...assets,INDEX,CONFIG,'.gitignore','AGENTS.md'])dirGuard(root,path.join(root,rel));
    const template=profile==='blank'
      ? JSON.parse(readFileSync(path.join(packageRoot,'.agent-workflow/config.example.json'),'utf8'))
      : loadPreset(profile==='claude-led'?'claude-orchestrator':'openai-orchestrator');
    validateConfiguration(template);
    const fresh=scanWorkspace(root);
    const configExists=existsSync(path.join(root,CONFIG));
    if(configExists)validateConfiguration(JSON.parse(readFileSync(path.join(root,CONFIG),'utf8')));
    const indexExists=existsSync(path.join(root,INDEX));
    const ignore=ensureIgnore(root,true);
    if(!dryRun){
      for(const rel of assets){
        const dest=path.join(root,rel);
        if(existsSync(dest)){preserved.push(rel);continue;}
        dirGuard(root,dest,true);
        copyFileSync(path.join(packageRoot,rel),dest,0);
        created.push(rel);
      }
      if(!configExists)newFile(root,path.join(root,CONFIG),JSON.stringify(template,null,2)+'\n');
      if(!existsSync(path.join(root,'AGENTS.md')))newFile(root,path.join(root,'AGENTS.md'),AGENT_HINT);
      ensureIgnore(root,false);
      // Index AFTER bootstrapping: avoid an immediately stale index on a new workspace.
      if(!indexExists)replaceFile(root,path.join(root,INDEX),JSON.stringify(scanWorkspace(root),null,2)+'\n');
    }
    let indexStatus=indexExists?'preserved':'created';
    if(indexExists){
      const old=readIndex(root);
      const drift=compareIndex(old,fresh);
      if(drift.stale)indexStatus='stale_preserved_run_oranit_refresh';
    }
    return {command:'oranit',workspace:root,dryRun,profile:configExists?'existing_preserved':profile,
      config:configExists?'preserved':'created_unconfirmed',index:indexStatus,filesIndexed:fresh.files.length,
      partial:fresh.partial,assetFilesCreated:dryRun?assets.filter(rel=>!existsSync(path.join(root,rel))).length:created.length,
      assetFilesPreserved:dryRun?assets.filter(rel=>existsSync(path.join(root,rel))).length:preserved.length,
      ignoreRulesAdded:ignore,modelRuntimeReady:false,note:'Index is a locator, not verified code truth. Model setup stays unconfirmed. No agents launched.'};
  }
  const index=readIndex(root);
  const current=scanWorkspace(root,{maxFiles:index.limits?.maxFiles??6000,maxTotalBytes:index.limits?.maxTotalBytes??80*1024*1024});
  const drift=compareIndex(index,current);
  if(action==='status')return {command:action,workspace:root,...drift,filesIndexed:index.files.length};
  if(action==='locate'){
    if(drift.stale)fail('INDEX_STALE: run oranit refresh; changes='+[...drift.added,...drift.removed,...drift.changed].slice(0,8).join(','));
    return {command:'locate',query,workspace:root,matches:locate(index,query),note:'Open and verify live source around symbols plus imports/callers before editing.'};
  }
  if(action==='refresh'){
    replaceFile(root,path.join(root,INDEX),JSON.stringify(current,null,2)+'\n');
    return {command:'refresh',workspace:root,filesIndexed:current.files.length,partial:current.partial,previousDrift:drift,modelConfigUntouched:true};
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(execute(process.argv.slice(2)),null,2));}
  catch(e){console.error('ORANIT BLOCKED: '+e.message);process.exitCode=2;}
}
