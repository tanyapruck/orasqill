import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadLock, validateLock, gitBlobSha, verifyLocalSkill, checkUpstream} from '../bin/external-skills.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lock = loadLock();
const byId = id => lock.skills.find(x=>x.id===id);

test('registry pins 3 named upstream owners, immutable commits, and 18 exact skill blobs',()=>{
  assert.equal(lock.schemaVersion,1);
  assert.equal(lock.skills.length,18);
  assert.deepEqual(Object.keys(lock.sources).sort(),['karpathy','matt','ponytail']);
  assert.equal(lock.sources.ponytail.repository,'dietrichgebert/ponytail');
  assert.equal(lock.sources.matt.repository,'mattpocock/skills');
  assert.equal(lock.sources.karpathy.repository,'multica-ai/andrej-karpathy-skills');
  assert.equal(validateLock(lock),lock);
});

test('external skill content is not vendored, installed or auto-updated',()=>{
  assert.equal(lock.policy.vendoring,false);
  assert.equal(lock.policy.autoInstall,false);
  assert.equal(lock.policy.autoUpdate,false);
  for(const s of lock.skills) assert.equal(existsSync(path.join(root,'.agents/skills',s.id,'SKILL.md')),false);
});

test('Karpathy is the only required coding prerequisite; Ponytail not always on',()=>{
  const required=lock.skills.filter(s=>s.activation==='required');
  assert.deepEqual(required.map(s=>s.id),['karpathy-guidelines']);
  assert.equal(byId('ponytail').activation,'opt_in');
  assert.equal(byId('ponytail-review').activation,'optional');
});

test('grill-with-docs explicitly tracks its two same-source dependencies',()=>{
  assert.deepEqual(byId('grill-with-docs').dependsOn,['grilling','domain-modeling']);
  assert.equal(byId('grill-with-docs').activation,'conditional');
});

test('missing source, duplicate IDs, wrong blobs and broken dependencies are rejected',()=>{
  const clone=()=>JSON.parse(JSON.stringify(lock));
  let l=clone();l.skills[0].source='intruder';assert.throws(()=>validateLock(l),/Invalid external skill/);
  l=clone();l.skills[1].id=l.skills[0].id;assert.throws(()=>validateLock(l),/Duplicate/);
  l=clone();l.skills[0].upstreamBlobSha='not-a-sha';assert.throws(()=>validateLock(l),/Invalid external skill/);
  l=clone();l.skills[1].dependsOn=['missing'];assert.throws(()=>validateLock(l),/Missing\/cyclic/);
});

test('Git blob fingerprint detects exact original bytes and local modifications',()=>{
  const text='test original bytes\n';
  const sha=gitBlobSha(text);
  assert.match(sha,/^[0-9a-f]{40}$/);
  assert.notEqual(sha,gitBlobSha(text+'extra'));
  assert.notEqual(sha,gitBlobSha(text.replace('\n','\r\n')));
});

test('verify-file operates read-only on explicitly selected file; does not claim loadability',()=>{
  const local=path.join(root,'.agents/skills/agent-workflow-orchestrator/SKILL.md');
  const report=verifyLocalSkill(lock,'karpathy-guidelines',local);
  assert.equal(report.matchesPinnedBlob,false);
  assert.equal(report.source,'multica-ai/andrej-karpathy-skills');
  assert.throws(()=>verifyLocalSkill(lock,'does-not-exist',local),/Unknown external skill/);
});

test('remote checker distinguishes repository changes from modifications to tracked skills',async()=>{
  const upstream={matt:lock.sources.matt};
  const tree=lock.skills.filter(s=>s.source==='matt').map(x=>({type:'blob',path:x.upstreamPath,sha:x.upstreamBlobSha}));
  const fetchImpl=async(url)=>({ok:true,json:async()=>url.includes('/commits/')?{sha:'f'.repeat(40)}:{tree,truncated:false}});
  const [result]=await checkUpstream({...lock,sources:upstream,skills:lock.skills.filter(s=>s.source==='matt')},{fetchImpl});
  assert.equal(result.repositoryChanged,true);
  assert.ok(result.skills.every(s=>s.status==='unchanged'));
  const changed=tree.map(x=>x.path==='skills/engineering/code-review/SKILL.md'?{...x,sha:'e'.repeat(40)}:x);
  const modified=async url=>({ok:true,json:async()=>url.includes('/commits/')?{sha:'f'.repeat(40)}:{tree:changed,truncated:false}});
  const [r2]=await checkUpstream({...lock,sources:upstream,skills:lock.skills.filter(s=>s.source==='matt')},{fetchImpl:modified});
  assert.equal(r2.skills.find(x=>x.id==='code-review').status,'changed');
});

test('remote checks fail to UNKNOWN rather than claiming an unverified upgrade',async()=>{
  const fail=async()=>({ok:false,status:403});
  const [r]=await checkUpstream(lock,{sourceFilter:'ponytail',fetchImpl:fail});
  assert.equal(r.status,'unknown');
  assert.match(r.reason,/403/);
});

test('registry and README document independent review and no permission expansion',()=>{
  const read=name=>readFileSync(path.join(root,name),'utf8');
  const skill=read('.agents/skills/agent-workflow-orchestrator/SKILL.md');
  const deps=read('.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md');
  const guide=read('README.md');
  assert.match(skill,/karpathy-guidelines/);
  assert.match(skill,/DEPENDENCIES.md/);
  assert.match(deps,/external-skills.lock.json/);
  assert.match(deps,/no vendoring/i);
  assert.match(guide,/external-skills\.mjs check-updates/);
  assert.match(deps,/ponytail-review/);
});
