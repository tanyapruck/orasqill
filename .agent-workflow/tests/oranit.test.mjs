import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execute} from '../bin/oranit.mjs';
import {resolveAgentRouting,loadPreset} from '../bin/model-config.mjs';
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

test('bare oranit bootstraps fresh workspace, code index, ignored config and all agent skills',t=>{
  const dir=workspace(t);
  const r=execute(['--workspace',dir,'--profile','claude-led']);
  assert.equal(r.config,'created_unconfirmed');
  assert.equal(r.index,'created');
  assert.equal(r.partial,false);
  assert.ok(r.assetFilesCreated>5);
  const config=JSON.parse(readFileSync(path.join(dir,'.agent-workflow/config.json'),'utf8'));
  assert.equal(config.setup.status,'unconfirmed');
  assert.equal(config.setup.profile,'project-specific');
  assert.deepEqual(config.routing.implementer.preferred,[]);
  const claude=resolveAgentRouting('claude-code',dir);
  const codex=resolveAgentRouting('codex',dir);
  assert.equal(claude.source,'agent-local');
  assert.equal(codex.source,'bundled-candidate');
  assert.equal(claude.config.routing.implementer.preferred[0].model,'claude-sonnet-5-5');
  assert.equal(claude.config.stage_preferences.critical_review.requested_mode,'ultra');
  assert.equal(codex.config.routing.implementer.preferred[0].model,'gpt-6.1-sol');
  assert.equal(claude.executionAuthorized,false);
  for(const p of ['.agents/skills/oranit/SKILL.md','.agents/skills/configure-models/SKILL.md',
    '.agents/skills/agent-workflow-orchestrator/SKILL.md','.claude/skills/oranit/SKILL.md',
    '.claude/skills/configure-models/SKILL.md','.agent-workflow/bin/model-config.mjs',
    '.agent-workflow/bin/repo-index.mjs','.agent-workflow/bin/nested-delegation.mjs',
    '.agents/skills/delegate-tree/SKILL.md','.claude/skills/delegate-tree/SKILL.md',
    '.agent-workflow/examples/nested-tree.example.json',
    '.agent-workflow/index/codebase-map.json','.agent-workflow/LICENSE.orasqill.txt','AGENTS.md']){
    assert.ok(existsSync(path.join(dir,p)),p);
  }
  assert.equal(
    readFileSync(path.join(dir,'.agent-workflow/LICENSE.orasqill.txt'),'utf8'),
    readFileSync(path.join(root,'LICENSE'),'utf8')
  );
  const ignore=readFileSync(path.join(dir,'.gitignore'),'utf8');
  assert.match(ignore,/\.agent-workflow\/index\//);
  assert.match(ignore,/\.agent-workflow\/config\.json/);
  assert.match(ignore,/\.agent-workflow\/routing\//);
  const index=JSON.parse(readFileSync(path.join(dir,'.agent-workflow/index/codebase-map.json'),'utf8'));
  assert.equal(index.files.some(x=>x.path==='src/auth/otp.ts'),true);
  assert.equal(execute(['status','--workspace',dir]).stale,false);
  const result=execute(['locate','verifyOTP','--workspace',dir]);
  assert.equal(result.matches[0].path,'src/auth/otp.ts');
  assert.equal(result.matches[0].matchedSymbols[0].line,1);
});

test('repeated oranit preserves manually edited config and index until refresh',t=>{
  const dir=workspace(t);
  execute(['--workspace',dir,'--profile','openai-led']);
  const cfg=path.join(dir,'.agent-workflow/config.json');
  const old=JSON.parse(readFileSync(cfg,'utf8'));old.userNotes='retain-me';
  writeFileSync(cfg,JSON.stringify(old));
  const index=path.join(dir,'.agent-workflow/index/codebase-map.json');
  const before=readFileSync(index,'utf8');
  writeFileSync(path.join(dir,'src/auth/otp.ts'),'export function verifyOTPChanged() {}\n');
  const r=execute(['--workspace',dir,'--profile','claude-led']);
  assert.equal(r.config,'preserved');
  assert.equal(resolveAgentRouting('codex',dir).source,'agent-local');
  assert.equal(resolveAgentRouting('claude-code',dir).source,'agent-local');
  assert.match(r.index,/stale_preserved/);
  assert.equal(JSON.parse(readFileSync(cfg,'utf8')).userNotes,'retain-me');
  assert.equal(JSON.parse(readFileSync(cfg,'utf8')).setup.profile,'project-specific');
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
  const r=execute(['--workspace',dir,'--dry-run']);
  assert.equal(r.dryRun,true);
  assert.ok(r.assetFilesCreated>0);
  for(const f of ['.agent-workflow/config.json','.agent-workflow/routing/claude-code.json',
   '.agent-workflow/routing/codex.json','.agent-workflow/index/codebase-map.json',
   '.gitignore','AGENTS.md','.agents/skills/oranit/SKILL.md']){
    assert.equal(existsSync(path.join(dir,f)),false);
  }
});

test('initialization preserves preexisting AGENTS and .gitignore content',t=>{
  const dir=workspace(t);
  writeFileSync(path.join(dir,'AGENTS.md'),'USER RULES STAY HERE\n');
  writeFileSync(path.join(dir,'.gitignore'),'custom-folder/\n');
  execute(['--workspace',dir]);
  assert.equal(readFileSync(path.join(dir,'AGENTS.md'),'utf8'),'USER RULES STAY HERE\n');
  assert.ok(readFileSync(path.join(dir,'.gitignore'),'utf8').startsWith('custom-folder/\n'));
  assert.equal(JSON.parse(readFileSync(path.join(dir,'.agent-workflow/config.json'),'utf8')).setup.profile,'project-specific');
});

test('index detects content and file-set drift, requiring refresh for live lookup',t=>{
  const dir=workspace(t);
  execute(['--workspace',dir]);
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
  if(process.platform==='win32'){t.skip('File symlinks may require Developer Mode; path guards are separately tested');return;}
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
  assert.throws(()=>execute(['--workspace',dir,'--profile','secret']),/PROFILE_REQUIRED/);
  assert.throws(()=>execute(['locate','x','--workspace',dir]),/INDEX_MISSING/);
  if(process.platform==='win32'){t.skip('Directory symlinks may require Developer Mode');return;}
  const external=mkdtempSync(path.join(tmpdir(),'oranit-external-'));
  t.after(()=>rmSync(external,{recursive:true,force:true}));
  symlinkSync(external,path.join(dir,'.agent-workflow'));
  assert.throws(()=>execute(['--workspace',dir]),/UNSAFE_WORKSPACE_PATH/);
  assert.equal(existsSync(path.join(external,'config.json')),false);
});

test('bare oranit with optional flags bootstraps without any required subcommand',t=>{
  const dir=workspace(t);
  const dry=spawnSync(process.execPath,[cli,'--workspace',dir,'--dry-run'],{cwd:dir,encoding:'utf8'});
  assert.equal(dry.status,0,dry.stderr);
  assert.equal(JSON.parse(dry.stdout).dryRun,true);
  assert.equal(existsSync(path.join(dir,'.agent-workflow/config.json')),false);
  const result=spawnSync(process.execPath,[cli,'--workspace',dir,'--profile','openai-led'],{cwd:dir,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).command,'oranit');
  assert.equal(JSON.parse(readFileSync(path.join(dir,'.agent-workflow/config.json'),'utf8')).setup.profile,'project-specific');
  assert.equal(resolveAgentRouting('codex',dir).source,'agent-local');
  assert.equal(execute(['status','--workspace',dir]).stale,false);
  assert.equal(execute(['locate','verifyOTP','--workspace',dir]).matches[0].path,'src/auth/otp.ts');
  const bad=spawnSync(process.execPath,[cli,'--unknown'],{cwd:dir,encoding:'utf8'});
  assert.equal(bad.status,2);
  assert.match(bad.stderr,/UNKNOWN_OPTION/);
});

test('CLI entrypoint and package bin expose the literal oranit command',t=>{
  const dir=workspace(t);
  const bin=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')).bin;
  assert.equal(bin.oranit,'./.agent-workflow/bin/oranit.mjs');
  const init=spawnSync(process.execPath,[cli],{encoding:'utf8',cwd:dir});
  assert.equal(init.status,0,init.stderr);
  assert.equal(JSON.parse(init.stdout).command,'oranit');
  // Explicit init is intentionally no longer a valid subcommand.
  const rejected=spawnSync(process.execPath,[cli,'init','--workspace',dir],{encoding:'utf8'});
  assert.equal(rejected.status,2);
  assert.match(rejected.stderr,/Usage: oranit/);
  assert.doesNotMatch(rejected.stderr,/Error: ENOENT/);
  assert.equal(execute(['--workspace',dir]).config,'preserved');
  const status=spawnSync(process.execPath,[cli,'status','--workspace',dir],{encoding:'utf8'});
  assert.equal(status.status,2);
  assert.match(status.stderr,/INIT_ONLY/);
  const located=spawnSync(process.execPath,[cli,'locate','verifyOTP','--workspace',dir],{encoding:'utf8'});
  assert.equal(located.status,2);
  assert.match(located.stderr,/INIT_ONLY/);
  const utility=path.join(root,'.agent-workflow/bin/orasqill.mjs');
  const s=spawnSync(process.execPath,[utility,'status','--workspace',dir],{encoding:'utf8'});
  assert.equal(s.status,0,s.stderr);
  assert.equal(JSON.parse(s.stdout).stale,false);
  const l=spawnSync(process.execPath,[utility,'locate','verifyOTP','--workspace',dir],{encoding:'utf8'});
  assert.equal(l.status,0,l.stderr);
  assert.equal(JSON.parse(l.stdout).matches[0].path,'src/auth/otp.ts');
});

test('both agent profiles are installed separately by default and do not overwrite each other',t=>{
  const dir=workspace(t);
  execute(['--workspace',dir]);
  const claude=path.join(dir,'.agent-workflow/routing/claude-code.json');
  const codex=path.join(dir,'.agent-workflow/routing/codex.json');
  const shared=path.join(dir,'.agent-workflow/config.json');
  const c=JSON.parse(readFileSync(claude,'utf8'));
  c.userNotes='CLAUDE ONLY';
  writeFileSync(claude,JSON.stringify(c));
  const prevCodex=readFileSync(codex,'utf8'),prevShared=readFileSync(shared,'utf8');
  execute(['--workspace',dir,'--profile','openai-led']);
  assert.equal(JSON.parse(readFileSync(claude,'utf8')).userNotes,'CLAUDE ONLY');
  assert.equal(readFileSync(codex,'utf8'),prevCodex);
  assert.equal(readFileSync(shared,'utf8'),prevShared);
  assert.equal(resolveAgentRouting('claude-code',dir).config.userNotes,'CLAUDE ONLY');
  assert.equal(resolveAgentRouting('codex',dir).config.routing.orchestrator.preferred[0].runtime,'codex');
});

test('legacy shared Claude-led config is preserved and migrated only for Claude; Codex stays independent',t=>{
  const dir=workspace(t),folder=path.join(dir,'.agent-workflow');
  mkdirSync(folder,{recursive:true});
  const legacy=loadPreset('claude-orchestrator');
  legacy.userNotes='legacy-claude';
  writeFileSync(path.join(folder,'config.json'),JSON.stringify(legacy,null,2));
  execute(['--workspace',dir,'--profile','claude-led']);
  assert.equal(resolveAgentRouting('claude-code',dir).config.userNotes,'legacy-claude');
  assert.equal(resolveAgentRouting('codex',dir).source,'bundled-candidate');
  execute(['--workspace',dir,'--profile','openai-led']);
  assert.equal(resolveAgentRouting('codex',dir).source,'agent-local');
  assert.equal(resolveAgentRouting('codex',dir).config.routing.orchestrator.preferred[0].runtime,'codex');
  assert.equal(JSON.parse(readFileSync(path.join(folder,'config.json'),'utf8')).userNotes,'legacy-claude');
});

test('legacy global custom config never selects a different agent model automatically',t=>{
  const dir=workspace(t),folder=path.join(dir,'.agent-workflow');
  mkdirSync(folder,{recursive:true});
  const legacy=loadPreset('openai-orchestrator');
  legacy.setup.profile='project-specific';
  writeFileSync(path.join(folder,'config.json'),JSON.stringify(legacy));
  assert.equal(resolveAgentRouting('claude-code',dir).source,'bundled-candidate');
  assert.equal(resolveAgentRouting('codex',dir).source,'bundled-candidate');
  execute(['--workspace',dir,'--profile','claude-led']);
  assert.equal(resolveAgentRouting('claude-code',dir).config.routing.orchestrator.preferred[0].runtime,'claude-code');
});

test('agent-specific file cannot impersonate other agent, and symlinked routing directory blocks init and resolve',t=>{
  const dir=workspace(t);
  execute(['--workspace',dir]);
  const file=path.join(dir,'.agent-workflow/routing/claude-code.json');
  writeFileSync(file,JSON.stringify(loadPreset('openai-orchestrator')));
  assert.throws(()=>resolveAgentRouting('claude-code',dir),/ROUTING_AGENT_MISMATCH/);
  assert.throws(()=>execute(['--workspace',dir]),/ROUTING_AGENT_MISMATCH/);
  assert.throws(()=>resolveAgentRouting('anything',dir),/AGENT_REQUIRED/);
  if(process.platform==='win32')return;
  const other=workspace(t),external=mkdtempSync(path.join(tmpdir(),'routing-untrusted-'));
  t.after(()=>rmSync(external,{recursive:true,force:true}));
  mkdirSync(path.join(other,'.agent-workflow'),{recursive:true});
  symlinkSync(external,path.join(other,'.agent-workflow/routing'));
  assert.throws(()=>execute(['--workspace',other]),/UNSAFE_WORKSPACE_PATH/);
  assert.throws(()=>resolveAgentRouting('codex',other),/UNSAFE_CONFIG_PATH/);
});

test('other model is an explicit third option, not an automatic default',t=>{
  const dir=workspace(t);
  const first=execute(['--workspace',dir]);
  assert.deepEqual(first.routing.map(x=>x.agent),['claude-code','codex']);
  const otherFile=path.join(dir,'.agent-workflow/routing/other.json');
  assert.equal(existsSync(otherFile),false);
  const cBefore=readFileSync(path.join(dir,'.agent-workflow/routing/claude-code.json'),'utf8');
  const oBefore=readFileSync(path.join(dir,'.agent-workflow/routing/codex.json'),'utf8');
  const sharedBefore=readFileSync(path.join(dir,'.agent-workflow/config.json'),'utf8');
  const selected=execute(['--workspace',dir,'--profile','other']);
  assert.equal(selected.profile,'other');
  assert.deepEqual(selected.routing.map(x=>x.agent),['other']);
  assert.equal(existsSync(otherFile),true);
  const other=JSON.parse(readFileSync(otherFile,'utf8'));
  assert.equal(other.setup.profile,'other-orchestrator');
  assert.equal(other.setup.status,'unconfirmed');
  assert.deepEqual(other.routing.orchestrator.preferred,[]);
  assert.equal(resolveAgentRouting('other',dir).source,'agent-local');
  assert.equal(readFileSync(path.join(dir,'.agent-workflow/routing/claude-code.json'),'utf8'),cBefore);
  assert.equal(readFileSync(path.join(dir,'.agent-workflow/routing/codex.json'),'utf8'),oBefore);
  assert.equal(readFileSync(path.join(dir,'.agent-workflow/config.json'),'utf8'),sharedBefore);
  assert.equal(execute(['--workspace',dir,'--profile','other']).routing[0].status,'preserved');
});

test('other profile dry run does not create files, and unrelated agent profiles are untouched',t=>{
  const dir=workspace(t);
  const report=execute(['--workspace',dir,'--profile','other','--dry-run']);
  assert.deepEqual(report.routing.map(x=>x.agent),['other']);
  assert.equal(report.routing[0].status,'would_create');
  assert.equal(existsSync(path.join(dir,'.agent-workflow/routing/other.json')),false);
  execute(['--workspace',dir,'--profile','claude-led']);
  assert.equal(existsSync(path.join(dir,'.agent-workflow/routing/codex.json')),false);
  assert.equal(existsSync(path.join(dir,'.agent-workflow/routing/other.json')),false);
  assert.equal(resolveAgentRouting('other',dir).source,'bundled-candidate');
  assert.throws(()=>execute(['--workspace',dir,'--profile','anything']),/PROFILE_REQUIRED/);
});

test('user configured other model is validated, preserved and never executed by Oranit',t=>{
  const dir=workspace(t);
  execute(['--workspace',dir,'--profile','other']);
  const file=path.join(dir,'.agent-workflow/routing/other.json');
  const config=JSON.parse(readFileSync(file,'utf8'));
  config.routing.orchestrator.preferred=[{runtime:'external-runtime',provider:'example',model:'example-ai-model'}];
  config.routing.implementer.preferred=[{runtime:'external-runtime',model:'example-ai-model'}];
  config.userNotes='custom model is user-owned';
  writeFileSync(file,JSON.stringify(config,null,2));
  execute(['--workspace',dir,'--profile','other']);
  assert.equal(JSON.parse(readFileSync(file,'utf8')).userNotes,'custom model is user-owned');
  const resolved=resolveAgentRouting('other',dir);
  assert.equal(resolved.config.routing.orchestrator.preferred[0].model,'example-ai-model');
  assert.equal(resolved.executionAuthorized,false);
  assert.equal(resolveAgentRouting('claude-code',dir).source,'bundled-candidate');
  assert.equal(resolveAgentRouting('codex',dir).source,'bundled-candidate');
});
