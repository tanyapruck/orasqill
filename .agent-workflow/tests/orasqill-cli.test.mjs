import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execute} from '../bin/oranit.mjs';
import {run,parseCommand} from '../bin/orasqill.mjs';
import {configureRouting,parseConfigureArgs} from '../bin/configure-routing.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const oranit=path.join(repo,'.agent-workflow/bin/oranit.mjs');
const orasqill=path.join(repo,'.agent-workflow/bin/orasqill.mjs');
function workspace(t){
  const root=mkdtempSync(path.join(tmpdir(),'orasqill-cli-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(path.join(root,'src'),{recursive:true});
  writeFileSync(path.join(root,'src/example.ts'),'export function example() { return 1 }\n');
  return root;
}
const scripted=answers=>async()=>{assert.ok(answers.length,'No more scripted interview answers');return answers.shift();};

test('CLI contract exposes init-only oranit and all utilities through orasqill',()=>{
  const pkg=JSON.parse(readFileSync(path.join(repo,'package.json'),'utf8'));
  assert.equal(pkg.bin.oranit,'./.agent-workflow/bin/oranit.mjs');
  assert.equal(pkg.bin.orasqill,'./.agent-workflow/bin/orasqill.mjs');
  assert.deepEqual(parseCommand(['status']).args,['status']);
  assert.deepEqual(parseCommand(['locate','keyword']).args,['locate','keyword']);
  assert.deepEqual(parseCommand(['refresh']).args,['refresh']);
  assert.equal(parseCommand(['configure']).command,'configure');
  assert.deepEqual(parseCommand(['configure','--agent','codex']).args,['--agent','codex']);
  assert.throws(()=>parseCommand(['--configure']),/UNKNOWN_COMMAND/);
  assert.throws(()=>parseCommand(['oranit','--configure']),/INIT_ONLY/);
  assert.equal(parseCommand(['deps','list']).tool,'external-skills.mjs');
  assert.equal(parseCommand(['plan','report','task']).tool,'plan-ledger.mjs');
  assert.equal(parseCommand(['models','resolve','codex']).tool,'model-config.mjs');
  assert.throws(()=>parseCommand(['oranit']),/INIT_ONLY/);
  assert.throws(()=>parseCommand(['init']),/UNKNOWN_COMMAND/);
  assert.throws(()=>parseCommand(['init','--dry-run']),/UNKNOWN_COMMAND/);
  assert.throws(()=>parseCommand(['init','status']),/UNKNOWN_COMMAND/);
  assert.throws(()=>parseCommand(['init','--configure']),/UNKNOWN_COMMAND/);
  assert.throws(()=>parseCommand(['unknown']),/UNKNOWN_COMMAND/);
  assert.throws(()=>parseCommand(['help','unexpected']),/UNKNOWN_OPTION/);
});

test('oranit executable refuses navigation while orasqill navigates the index',async t=>{
  const dir=workspace(t);
  const removedInit=spawnSync(process.execPath,[orasqill,'init','--workspace',dir],{encoding:'utf8'});
  assert.equal(removedInit.status,2);
  assert.match(removedInit.stderr,/UNKNOWN_COMMAND/);
  const removedConfigure=spawnSync(process.execPath,[orasqill,'--configure','--workspace',dir],{encoding:'utf8'});
  assert.equal(removedConfigure.status,2);
  assert.match(removedConfigure.stderr,/UNKNOWN_COMMAND/);
  const help=spawnSync(process.execPath,[orasqill,'help'],{encoding:'utf8'});
  assert.equal(help.status,0,help.stderr);
  assert.match(help.stdout,/orasqill configure/);
  assert.doesNotMatch(help.stdout,/orasqill init|orasqill --configure/);
  const setup=spawnSync(process.execPath,[oranit,'--workspace',dir],{encoding:'utf8'});
  assert.equal(setup.status,0,setup.stderr);
  for(const subcommand of ['status','refresh','locate']){
    const out=spawnSync(process.execPath,[oranit,subcommand,'--workspace',dir],{encoding:'utf8'});
    assert.equal(out.status,2);
    assert.match(out.stderr,/INIT_ONLY/);
  }
  const status=JSON.parse(spawnSync(process.execPath,[orasqill,'status','--workspace',dir],{encoding:'utf8'}).stdout);
  assert.equal(status.stale,false);
  const locate=JSON.parse(spawnSync(process.execPath,[orasqill,'locate','example','--workspace',dir],{encoding:'utf8'}).stdout);
  assert.equal(locate.matches[0].path,'src/example.ts');
  writeFileSync(path.join(dir,'src/example.ts'),'export function example() { return 2 }\n');
  const stale=spawnSync(process.execPath,[orasqill,'locate','example','--workspace',dir],{encoding:'utf8'});
  assert.equal(stale.status,2);
  assert.match(stale.stderr,/INDEX_STALE/);
  const refresh=JSON.parse(spawnSync(process.execPath,[orasqill,'refresh','--workspace',dir],{encoding:'utf8'}).stdout);
  assert.equal(refresh.command,'refresh');
  assert.equal((await run(['status','--workspace',dir])).stale,false);
});

test('configure preview, explicit confirmation and agent-isolation',async t=>{
  const dir=workspace(t);
  execute(['--workspace',dir]);
  const target=path.join(dir,'.agent-workflow/routing/codex.json');
  const other=path.join(dir,'.agent-workflow/routing/claude-code.json');
  const shared=path.join(dir,'.agent-workflow/config.json');
  const otherBefore=readFileSync(other,'utf8'),sharedBefore=readFileSync(shared,'utf8');
  const original=readFileSync(target,'utf8');
  assert.equal(parseCommand(['configure','--agent','codex','--workspace',dir]).command,'configure');
  const denied=await configureRouting(['--workspace',dir,'--agent','codex'],{
    ask:scripted(['orchestrator','','gpt-6.1-sol-alternative','high','done','no'])
  });
  assert.equal(denied.written,false);
  assert.equal(readFileSync(target,'utf8'),original);
  const accepted=await run(['configure','--workspace',dir,'--agent','codex'],{
    ask:scripted(['orchestrator','','gpt-6.1-sol-alternative','high','done','yes']),
    print:()=>{}
  });
  assert.equal(accepted.written,true);
  const changed=JSON.parse(readFileSync(target,'utf8'));
  assert.equal(changed.routing.orchestrator.preferred[0].model,'gpt-6.1-sol-alternative');
  assert.equal(changed.routing.orchestrator.preferred[0].effort,'high');
  assert.equal(changed.setup.status,'unconfirmed');
  assert.equal(readFileSync(other,'utf8'),otherBefore);
  assert.equal(readFileSync(shared,'utf8'),sharedBefore);
});

test('opt-in Other Model accepts custom provider without effort',async t=>{
  const dir=workspace(t);
  execute(['--workspace',dir,'--profile','other']);
  const out=await configureRouting(['--workspace',dir,'--agent','other'],{
    ask:scripted(['orchestrator','local-provider','example-model','example-provider','none','done','yes'])
  });
  assert.equal(out.written,true);
  const c=JSON.parse(readFileSync(path.join(dir,'.agent-workflow/routing/other.json'),'utf8'));
  assert.deepEqual(c.routing.orchestrator.preferred[0],{
    runtime:'local-provider',model:'example-model',provider:'example-provider'
  });
  assert.equal(c.setup.status,'unconfirmed');
  assert.equal(existsSync(path.join(dir,'.agent-workflow/routing/codex.json')),false);
});

test('configure command requires explicit workspace setup and disallows unexpected writes',async t=>{
  const dir=workspace(t);
  assert.throws(()=>parseConfigureArgs(['--agent','__proto__']),/AGENT_REQUIRED/);
  assert.throws(()=>parseConfigureArgs(['--change','anything']),/Usage:/);
  await assert.rejects(()=>configureRouting(['--workspace',dir,'--agent','codex'],{ask:scripted([])}),/SETUP_REQUIRED/);
  execute(['--workspace',dir,'--profile','claude-led']);
  const result=await configureRouting(['--workspace',dir,'--agent','codex'],{
    ask:scripted(['done'])
  });
  assert.equal(result.written,false);
  assert.equal(existsSync(path.join(dir,'.agent-workflow/routing/codex.json')),false);
});

test('helper invocation is allowlisted and propagates status',async()=>{
  const invocations=[];
  const r=await run(['deps','list'],{spawn:(tool,args)=>{
    invocations.push({tool,args});
    return {status:7};
  }});
  assert.equal(r.exitCode,7);
  assert.deepEqual(invocations,[{tool:'external-skills.mjs',args:['list']}]);
});
