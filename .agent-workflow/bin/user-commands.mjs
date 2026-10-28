/** Install only explicitly user-invoked skills. Never enable orchestrators globally. */
import {existsSync,lstatSync,mkdirSync,readFileSync,writeFileSync,realpathSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const files=[
  '.agents/skills/oranit/SKILL.md',
  '.agents/skills/configure-models/SKILL.md',
  '.claude/skills/oranit/SKILL.md',
  '.claude/skills/configure-models/SKILL.md'
];
export function installUserCommands({home=os.homedir(),refresh=false,dryRun=false}={}){
  const actual=realpathSync(home),info=lstatSync(actual);
  if(!info.isDirectory()||info.isSymbolicLink())throw Error('UNSAFE_HOME');
  const actions=[];
  for(const rel of files){
    const src=path.join(root,rel),dst=path.join(actual,rel);
    const content=readFileSync(src);
    let parent=actual;
    for(const part of path.dirname(rel).split('/')){
      parent=path.join(parent,part);
      if(existsSync(parent)){
        const st=lstatSync(parent);
        if(!st.isDirectory()||st.isSymbolicLink())throw Error('UNSAFE_SKILL_DIRECTORY: '+parent);
      }
    }
    let operation='install';
    if(existsSync(dst)){
      const st=lstatSync(dst);
      if(!st.isFile()||st.isSymbolicLink())throw Error('UNSAFE_SKILL_FILE: '+dst);
      if(readFileSync(dst).equals(content))operation='unchanged';
      else operation=refresh?'update':'preserved';
    }
    actions.push({file:rel,operation});
  }
  if(!dryRun){
    for(const item of actions){
      if(!['install','update'].includes(item.operation))continue;
      const dst=path.join(actual,item.file),dir=path.dirname(dst);
      mkdirSync(dir,{recursive:true,mode:0o700});
      writeFileSync(dst,readFileSync(path.join(root,item.file)),{mode:0o600,flag:item.operation==='install'?'wx':'w'});
    }
  }
  return {home:actual,dryRun,actions,note:'Only explicit user-invoked commands installed; restart your agent session to discover them. Existing differing files are preserved unless --refresh is specified.'};
}
export function run(argv){
  let refresh=false,dryRun=false;
  for(const a of argv){if(a==='--refresh')refresh=true;else if(a==='--dry-run')dryRun=true;else throw Error('Usage: orasqill install-commands [--dry-run] [--refresh]');}
  return installUserCommands({refresh,dryRun});
}
