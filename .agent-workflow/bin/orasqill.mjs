#!/usr/bin/env node
/** Orasqill command facade: Oranit initializes; all workspace utilities run here. */
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execute} from './oranit.mjs';
import {configureRouting} from './configure-routing.mjs';

const binDir=path.dirname(fileURLToPath(import.meta.url));
const commands=Object.freeze({
  deps:'external-skills.mjs',
  models:'model-config.mjs',
  plan:'plan-ledger.mjs',
  handoff:'manual-handoff.mjs',
  delegate:'nested-delegation.mjs',
  schedule:'task-planner.mjs'
});
const usage=`Orasqill commands:
  oranit [--profile blank|claude-led|openai-led|other] [--workspace <dir>] [--dry-run]  Initialize workspace
  orasqill status|locate "keyword"|refresh [--workspace <dir>]
  orasqill configure [--agent claude-code|codex|other] [--workspace <dir>]
  orasqill models preview|resolve|validate ...
  orasqill deps list|check-updates|verify-file|verify-reference ...
  orasqill plan|handoff|delegate|schedule <helper-arguments>
  orasqill help

No subagents or models are launched by these utilities.`;

export function parseCommand(argv){
  const [command,...args]=argv;
  if(!command||command==='help'||command==='--help'){
    if(args.length)throw Error('UNKNOWN_OPTION: help has no options');
    return {command:'help',args:[]};
  }
  if(['status','locate','refresh'].includes(command))return {command:'navigation',args:[command,...args]};
  if(command==='configure')return {command:'configure',args};
  if(command==='oranit')throw Error('INIT_ONLY: use the standalone oranit command for workspace initialization');
  if(Object.hasOwn(commands,command))return {command:'helper',tool:commands[command],args};
  throw Error('UNKNOWN_COMMAND: '+command+'\n'+usage);
}

export async function run(argv,options={}){
  const parsed=parseCommand(argv);
  if(parsed.command==='help')return {help:usage};
  if(parsed.command==='navigation')return execute(parsed.args);
  if(parsed.command==='configure')return await configureRouting(parsed.args,options);
  // No shell, no string evaluation; only allowlisted bundled helpers.
  if(options.spawn){
    const result=options.spawn(parsed.tool,parsed.args);
    return {exitCode:result.status??1};
  }
  const proc=spawnSync(process.execPath,[path.join(binDir,parsed.tool),...parsed.args],
    {stdio:'inherit',shell:false,cwd:process.cwd()});
  if(proc.error)throw proc.error;
  return {exitCode:proc.status??1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const result=await run(process.argv.slice(2));
    if(result.help)process.stdout.write(result.help);
    else if(result.exitCode!==undefined)process.exitCode=result.exitCode;
    else process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }catch(e){console.error('ORASQILL BLOCKED: '+e.message);process.exitCode=2;}
}
