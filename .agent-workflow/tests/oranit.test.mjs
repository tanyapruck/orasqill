import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execute} from '../bin/oranit.mjs';
import {scanWorkspace,compareIndex,locate} from '../bin/repo-index.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cli=path.join(root,'.agent-workflow/bin/oranit.mjs');
function workspace(t){
  const dir=mkdtempSync(path.join(tmpdir(),'oranit-ws-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  mkdirSync(path.join(dir,'src/auth'),{recursive:true});
  writeFileSync(path.join(dir,'src/auth/otp.ts'),
    'export function verifyOTP(token: string) { return token.length > 3 }\nexport const sendOTP = () => true;\n');
  return dir;
}

test('oranit init bootstraps fresh workspace, code index, ignored config and all agent skills',t=>{
  const dir=workspace(t);
  const r=execute(['init','--workspace',dir,'--profile','claude-led']);
  assert.equal(r.config,'created_unconfirmed');
  assert.equal(r.index,'created');
  assert.equal(r.partial,false);
  assert.ok(r.assetFilesCreated>5);
  const config=JSON.parse(readFileSync(path.join(dir,'.agent-workflow/config.json'),'utf8'));
  assert.equal(config.setup.status,'unconfirmed');
  assert.equal(config.setup.profile,'claude-orchestrator');
  assert.equal(config.routing.reviewer.preferred[0].model,'gpt-6.1-sol');
  assert.equal(config.stage_preferences.critical_review.requested_mode,'ultra');
  for(const p of ['.agents/skills/oranit/SKILL.md','.agents/skills/configure-models/SKILL.md',
    '.agents/skills/agent-workflow-orchestrator/SKILL.md','.claude/skills/oranit/SKILL.md',
    '.claude/skills/configure-models/SKILL.md','.agent-workflow/bin/model-config.mjs',
    '.agent-workflow/bin/repo-index.mjs','.agent-workflow/index/codebase-map.json','AGENTS.md']){
    assert.ok(existsSync(path.join(dir,p)),p);
  }
  const ignore=readFileSync(path.join(dir,'.gitignore'),'utf8');
  assert.match(ignore,/\.agent-workflow\/index\//);
  assert.match(ignore,/\.agent-workflow\/config\.json/);
  const index=JSON.parse(readFileSync(path.join(dir,'.agent-workflow/index/codebase-map.json'),'utf8'));
  assert.equal(index.files.some(x=>x.path==='src/auth/otp.ts'),true);
  assert.equal(execute(['status','--workspace',dir]).stale,false);
  const result=execute(['locate','verifyOTP','--workspace',dir]);
  assert.equal(result.matches[0].path,'src/auth/otp.ts');
  assert.equal(result.matches[0].matchedSymbols[0].line,1);
});

test('safe repeat init preserves manually edited config and index until refresh',t=>{
  const dir=workspace(t);
  execute(['init','--workspace',dir,'--profile','openai-led']);
  const cfg=path.join(dir,'.agent-workflow/config.json');
  const old=JSON.parse(readFileSync(cfg,'utf8'));old.userNotes='retain-me';
  writeFileSync(cfg,JSON.stringify(old));
  const index=path.join(dir,'.agent-workflow/index/codebase-map.json');
  const before=readFileSync(index,'utf8');
  writeFileSync(path.join(dir,'src/auth/otp.ts'),'export function verifyOTPChanged() {}\n');
  const r=execute(['init','--workspace',dir,'--profile','claude-led']);
  assert.equal(r.config,'preserved');
  assert.match(r.index,/stale_preserved/);
  assert.equal(JSON.parse(readFileSync(cfg,'utf8')).userNotes,'retain-me');
  assert.equal(JSON.parse(readFileSync(cfg,'utf8')).setup.profile,'openai-orchestrator');
  assert.equal(readFileSync(index,'utf8'),before);
  assert.equal(execute(['status','--workspace',dir]).stale,true);
  assert.throws(()=>execute(['locate','verifyOTPChanged','--workspace',dir]),/INDEX_STALE/);
  const refresh=execute(['refresh','--workspace',dir]);
  assert.equal(refresh.modelConfigUntouched,true);
  assert.equal(execute(['status','--workspace',dir]).stale,false);
  assert.equal(execute(['locate','verifyOTPChanged','--workspace',dir]).matches[0].path,'src/auth/otp.ts');
  assert.equal(JSON.parse(readFileSync(cfg,'utf8')).userNotes,'retain-me');
});

test('dry-run does not write files, even model config or ignore rules',t=>{
  const dir=workspace(t);
  const r=execute(['init','--workspace',dir,'--dry-run']);
  assert.equal(r.dryRun,true);
  assert.ok(r.assetFilesCreated>0);
  for(const f of ['.agent-workflow/config.json','.agent-workflow/index/codebase-map.json',
   '.gitignore','AGENTS.md','.agents/skills/oranit/SKILL.md']){
    assert.equal(existsSync(path.join(dir,f)),false);
  }
});

test('initialization preserves preexisting AGENTS and .gitignore content',t=>{
  const dir=workspace(t);
  writeFileSync(path.join(dir,'AGENTS.md'),'USER RULES STAY HERE\n');
  writeFileSync(path.join(dir,'.gitignore'),'custom-folder/\n');
  execute(['init','--workspace',dir]);
  assert.equal(readFileSync(path.join(dir,'AGENTS.md'),'utf8'),'USER RULES STAY HERE\n');
  assert.ok(readFileSync(path.join(dir,'.gitignore'),'utf8').startsWith('custom-folder/\n'));
  assert.equal(JSON.parse(readFileSync(path.join(dir,'.agent-workflow/config.json'),'utf8')).setup.profile,'project-specific');
});

test('index detects content and file-set drift, requiring refresh for live lookup',t=>{
  const dir=workspace(t);
  execute(['init','--workspace',dir]);
  const other=path.join(dir,'src/auth/session.ts');
  writeFileSync(other,'export function session() {}');
  assert.deepEqual(execute(['status','--workspace',dir]).added,['src/auth/session.ts']);
  assert.throws(()=>execute(['locate','session','--workspace',dir]),/INDEX_STALE/);
  execute(['refresh','--workspace',dir]);
  assert.equal(execute(['locate','session','--workspace',dir]).matches[0].matchedSymbols[0].name,'session');
  rmSync(other);
  assert.deepEqual(execute(['status','--workspace',dir]).removed,['src/auth/session.ts']);
});

test('scanner ignores secret-looking files, dependencies and symbolic links',t=>{
  const dir=workspace(t);
  mkdirSync(path.join(dir,'node_modules/example'),{recursive:true});
  writeFileSync(path.join(dir,'node_modules/example/index.js'),'export function vendor() {}');
  writeFileSync(path.join(dir,'.env.local'),'SECRET_TOKEN=example');
  writeFileSync(path.join(dir,'src/auth/private-key.pem'),'secret');
  symlinkSync(path.join(dir,'src/auth/otp.ts'),path.join(dir,'src/auth/alias.ts'));
  const idx=scanWorkspace(dir);
  assert.deepEqual(idx.files.map(f=>f.path),['src/auth/otp.ts']);
  assert.ok(!JSON.stringify(idx).includes('SECRET_TOKEN='));
});

test('scanner reports partial coverage and exact current file fingerprints',t=>{
  const dir=workspace(t);
  writeFileSync(path.join(dir,'README.md'),'Main docs\n');
  const small=scanWorkspace(dir,{maxFiles:1});
  assert.equal(small.partial,true);
  const all=scanWorkspace(dir);
  assert.equal(all.partial,false);
  assert.equal(locate(all,'verifyOTP')[0].path,'src/auth/otp.ts');
  assert.equal(compareIndex(all,scanWorkspace(dir)).stale,false);
});

test('rejects path traversal, unknown modes, and attempts to write through workspace symlinks',t=>{
  const dir=workspace(t);
  assert.throws(()=>execute(['init','--workspace',dir,'--profile','secret']),/PROFILE_REQUIRED/);
  assert.throws(()=>execute(['locate','x','--workspace',dir]),/INDEX_MISSING/);
  const external=mkdtempSync(path.join(tmpdir(),'oranit-external-'));
  t.after(()=>rmSync(external,{recursive:true,force:true}));
  symlinkSync(external,path.join(dir,'.agent-workflow'));
  assert.throws(()=>execute(['init','--workspace',dir]),/UNSAFE_WORKSPACE_PATH/);
  assert.equal(existsSync(path.join(external,'config.json')),false);
});

test('CLI entrypoint and package bin expose the literal oranit command',t=>{
  const dir=workspace(t);
  const bin=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')).bin;
  assert.equal(bin.oranit,'./.agent-workflow/bin/oranit.mjs');
  const init=spawnSync(process.execPath,[cli,'init','--workspace',dir],{encoding:'utf8'});
  assert.equal(init.status,0,init.stderr);
  const status=spawnSync(process.execPath,[cli,'status','--workspace',dir],{encoding:'utf8'});
  assert.equal(status.status,0,status.stderr);
  assert.equal(JSON.parse(status.stdout).stale,false);
  const located=spawnSync(process.execPath,[cli,'locate','verifyOTP','--workspace',dir],{encoding:'utf8'});
  assert.equal(located.status,0,located.stderr);
  assert.equal(JSON.parse(located.stdout).matches[0].path,'src/auth/otp.ts');
});
