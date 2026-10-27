import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPreset,validateConfiguration,validateCandidate,resolveAgentRouting,run} from '../bin/model-config.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cli=path.join(repo,'.agent-workflow/bin/model-config.mjs');
const clone=x=>structuredClone(x);

test('both installed presets preview without modifying local config',()=>{
  for(const name of ['claude-orchestrator','openai-orchestrator']){
    const preset=loadPreset(name);
    assert.equal(preset.setup.status,'unconfirmed');
    assert.equal(preset.setup.profile,name);
    const shown=JSON.parse(run(['preview',name]));
    assert.deepEqual(shown.config,preset);
    assert.equal(shown.validation.valid,true);
    const child=spawnSync(process.execPath,[cli,'preview',name],{cwd:repo,encoding:'utf8'});
    assert.equal(child.status,0,child.stderr);
    assert.equal(JSON.parse(child.stdout).profile,name);
  }
  // The command has no writes; do not assume an ignored local config is absent on a developer machine.
  assert.equal(typeof run(['preview','claude-orchestrator']),'string');
});

test('read-only validate works on a user config, preserving bytes',t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'orasqill-config-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'config.json');
  const raw=JSON.stringify(loadPreset('claude-orchestrator'),null,2)+'\n';
  writeFileSync(file,raw);
  const out=JSON.parse(run(['validate',file]));
  assert.equal(out.validation.setupStatus,'unconfirmed');
  assert.equal(out.validation.checkedStages,9);
  assert.match(out.validation.warning,/Structural validation only/);
  const child=spawnSync(process.execPath,[cli,'validate',file],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);
  assert.equal(readFileSync(file,'utf8'),raw);
});

test('reject API effort ultra; distinguish requested mode from API effort',()=>{
  assert.throws(()=>validateCandidate({runtime:'codex',model:'gpt-6.1-sol',effort:'ultra'}),/Ultra is not an API effort/);
  assert.throws(()=>validateCandidate({runtime:'codex',model:'gpt-6.1-sol',effort:'xhigh',requested_mode:'ultra'}),/ULTRA_REQUIRES_RUNTIME/);
  assert.equal(validateCandidate({runtime:'codex',model:'gpt-6.1-sol',effort:'max',requested_mode:'ultra'}),true);
});

test('cannot disable independence or enable automatic switching',()=>{
  const p=loadPreset('claude-orchestrator');
  let edit=clone(p);
  edit.routing.reviewer.require_independent_author=false;
  assert.throws(()=>validateConfiguration(edit),/INDEPENDENT_REVIEW_REQUIRED/);
  edit=clone(p);edit.routing.orchestrator.automatic_switching=true;
  assert.throws(()=>validateConfiguration(edit),/AUTOMATIC_SWITCHING_DISABLED/);
});

test('cannot silently enable parallel workers',()=>{
  const p=clone(loadPreset('openai-orchestrator'));
  p.delegation.max_parallel_workers=3;
  assert.throws(()=>validateConfiguration(p),/PARALLEL_SETUP_REQUIRED/);
});

test('optional nested candidate setup can carry explicit global parallel limit but never proves real runtime support',()=>{
  const p=structuredClone(loadPreset('openai-orchestrator'));
  p.setup.status='confirmed';
  p.delegation.max_depth=2;
  p.delegation.max_parallel_workers=3;
  assert.throws(()=>validateConfiguration(p),/PARALLEL_SETUP_REQUIRED/);
  p.delegation.runtime_capabilities={
    supportsConcurrentWorkers:true,enforcesOwnership:true,enforcesIsolation:true
  };
  p.task_execution={mode:'bounded_parallel',max_active_child_tasks:3};
  assert.equal(validateConfiguration(p).valid,true);
  assert.match(validateConfiguration(p).warning,/Structural validation only/);
  p.delegation.runtime_capabilities.enforcesIsolation=false;
  assert.throws(()=>validateConfiguration(p),/PARALLEL_SETUP_REQUIRED/);
});

test('fails closed on unknown profiles, malformed candidates and stage routing',()=>{
  assert.throws(()=>loadPreset('../config'),/PROFILE_REQUIRED/);
  assert.throws(()=>run(['preview','../../config.json']),/PROFILE_REQUIRED/);
  assert.throws(()=>validateCandidate({runtime:'codex',model:'gpt-6.1-sol',effort:'unknown'}),/EFFORT_REQUIRED/);
  let c=clone(loadPreset('claude-orchestrator'));
  c.stage_preferences.review={role:'missing-role'};
  assert.throws(()=>validateConfiguration(c),/STAGES_REQUIRED/);
  c=clone(loadPreset('claude-orchestrator'));
  c.stage_preferences.review={role:'reviewer',model:'fake',effort:'high'};
  assert.throws(()=>validateConfiguration(c),/MODEL_REQUIRED/);
});

test('invalid JSON exits nonzero without changing files',t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'orasqill-config-bad-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'config.json');
  writeFileSync(file,'{ invalid }');
  const child=spawnSync(process.execPath,[cli,'validate',file],{encoding:'utf8'});
  assert.equal(child.status,2);
  assert.match(child.stderr,/MODEL CONFIG BLOCKED/);
  assert.equal(readFileSync(file,'utf8'),'{ invalid }');
});

test('skill can be explicitly invoked but cannot treat invocation as write permission',()=>{
  const read=p=>readFileSync(path.join(repo,p),'utf8');
  const core=read('.agents/skills/configure-models/SKILL.md');
  const shim=read('.claude/skills/configure-models/SKILL.md');
  assert.match(core,/^---\nname: configure-models/m);
  assert.match(shim,/^---\nname: configure-models/m);
  assert.match(shim,/disable-model-invocation: true/);
  assert.match(shim,/user-invocable: true/);
  assert.match(shim,/\.agents\/skills\/configure-models\/SKILL\.md/);
  assert.match(core,/explicit approval/);
  assert.match(core,/existing config/);
  assert.match(core,/\.agent-workflow\/config\.json/);
  assert.match(core,/setup\.status:"unconfirmed"/);
  assert.match(core,/no models were launched/i);
});

test('portability: installer includes both skill forms and validator',()=>{
  const guide=readFileSync(path.join(repo,'README.md'),'utf8');
  assert.match(guide,/cp -R .*\.agents\/skills\/configure-models/);
  assert.match(guide,/Copy-Item -Recurse .*\.agents\\skills\\configure-models/);
  assert.match(guide,/\.claude\/skills\/configure-models/);
  assert.match(guide,/\/configure-models/);
  assert.match(guide,/\$configure-models/);
  assert.match(guide,/model-config\.mjs validate/);
  assert.match(guide,/not.*auto/i);
});

test('resolve selects agent by explicit invoking runtime, independent of global legacy profile',t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'orasqill-routing-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const c=JSON.parse(run(['resolve','codex','--workspace',dir]));
  const a=JSON.parse(run(['resolve','claude-code','--workspace',dir]));
  assert.equal(c.config.routing.orchestrator.preferred[0].runtime,'codex');
  assert.equal(a.config.routing.orchestrator.preferred[0].runtime,'claude-code');
  assert.equal(a.source,'bundled-candidate');
  assert.equal(c.executionAuthorized,false);
  assert.throws(()=>run(['resolve','guess','--workspace',dir]),/AGENT_REQUIRED/);
  assert.throws(()=>run(['resolve','codex','--workspace','../','unknown']),/Usage:/);
  const child=spawnSync(process.execPath,[cli,'resolve','claude-code','--workspace',dir],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);
  assert.equal(JSON.parse(child.stdout).agent,'claude-code');
  assert.equal(JSON.parse(child.stdout).executionAuthorized,false);
});
