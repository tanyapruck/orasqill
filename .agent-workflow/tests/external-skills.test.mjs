import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadLock, validateLock, gitBlobSha, verifyLocalSkill, verifyLocalReference, checkUpstream} from '../bin/external-skills.mjs';

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

test('Matt writing-for-agents pins its original Skill and sibling mechanics source',()=>{
  assert.equal(byId('writing-for-agents').upstreamBlobSha,'a37608daf6e835e767deecfb498facecaaba82ba');
  assert.deepEqual(byId('writing-for-agents').referenceFiles,[{
    upstreamPath:'skills/productivity/writing-for-agents/SKILL-MECHANICS.md',
    upstreamBlobSha:'9cdbdb22aadc438755392216e75ad9a14cc9832e'
  }]);
});

test('missing source, duplicate IDs, wrong blobs and broken dependencies are rejected',()=>{
  const clone=()=>JSON.parse(JSON.stringify(lock));
  let l=clone();l.skills[0].source='intruder';assert.throws(()=>validateLock(l),/Invalid external skill/);
  l=clone();l.skills[1].id=l.skills[0].id;assert.throws(()=>validateLock(l),/Duplicate/);
  l=clone();l.skills[0].upstreamBlobSha='not-a-sha';assert.throws(()=>validateLock(l),/Invalid external skill/);
  l=clone();l.skills[1].dependsOn=['missing'];assert.throws(()=>validateLock(l),/Missing\/cyclic/);
  l=clone();
  let refs=l.skills.find(x=>x.id==='writing-for-agents').referenceFiles;
  refs[0].upstreamBlobSha='not-sha';assert.throws(()=>validateLock(l),/Invalid external reference/);
  l=clone();refs=l.skills.find(x=>x.id==='writing-for-agents').referenceFiles;
  refs[0].upstreamPath='skills/productivity/another/SKILL-MECHANICS.md';
  assert.throws(()=>validateLock(l),/Invalid external reference/);
  l=clone();refs=l.skills.find(x=>x.id==='writing-for-agents').referenceFiles;
  refs.push({...refs[0]});assert.throws(()=>validateLock(l),/Invalid external reference/);
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

test('supplementary source verification matches bytes and rejects changes and unknown references',t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'orasqill-provenance-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'SKILL-MECHANICS.md'),localText='original reference bytes\\n';
  writeFileSync(file,localText);
  const clone=JSON.parse(JSON.stringify(lock));
  const ref=clone.skills.find(x=>x.id==='writing-for-agents').referenceFiles[0];
  ref.upstreamBlobSha=gitBlobSha(localText);
  const valid=verifyLocalReference(clone,'writing-for-agents',ref.upstreamPath,file);
  assert.equal(valid.matchesPinnedBlob,true);
  writeFileSync(file,localText+'changed');
  assert.equal(verifyLocalReference(clone,'writing-for-agents',ref.upstreamPath,file).matchesPinnedBlob,false);
  assert.throws(()=>verifyLocalReference(clone,'writing-for-agents','other.md',file),/Unknown external reference/);
});

test('verify-reference CLI exits nonzero for changed bytes and unknown paths',t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'orasqill-cli-ref-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const ref=byId('writing-for-agents').referenceFiles[0];
  const local=path.join(dir,'SKILL-MECHANICS.md');
  writeFileSync(local,'not the pinned upstream content\\n');
  const cli=fileURLToPath(new URL('../bin/external-skills.mjs',import.meta.url));
  const exec=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  const changed=exec(['verify-reference','writing-for-agents',ref.upstreamPath,local]);
  assert.equal(changed.status,2,changed.stderr);
  const report=JSON.parse(changed.stdout);
  assert.equal(report.matchesPinnedBlob,false);
  assert.equal(report.referencePath,ref.upstreamPath);
  const unknown=exec(['verify-reference','writing-for-agents','unknown.md',local]);
  assert.equal(unknown.status,1);
  assert.match(unknown.stderr,/Unknown external reference/);
});

test('remote checker distinguishes repository changes from modifications to tracked skills',async()=>{
  const upstream={matt:lock.sources.matt};
  const tree=lock.skills.filter(s=>s.source==='matt').flatMap(x=>[
    {type:'blob',path:x.upstreamPath,sha:x.upstreamBlobSha},
    ...(x.referenceFiles??[]).map(r=>({type:'blob',path:r.upstreamPath,sha:r.upstreamBlobSha}))
  ]);
  const fetchImpl=async(url)=>({ok:true,json:async()=>url.includes('/commits/')?{sha:'f'.repeat(40)}:{tree,truncated:false}});
  const [result]=await checkUpstream({...lock,sources:upstream,skills:lock.skills.filter(s=>s.source==='matt')},{fetchImpl});
  assert.equal(result.repositoryChanged,true);
  assert.ok(result.skills.every(s=>s.status==='unchanged'));
  const changed=tree.map(x=>x.path==='skills/engineering/code-review/SKILL.md'?{...x,sha:'e'.repeat(40)}:x);
  const modified=async url=>({ok:true,json:async()=>url.includes('/commits/')?{sha:'f'.repeat(40)}:{tree:changed,truncated:false}});
  const [r2]=await checkUpstream({...lock,sources:upstream,skills:lock.skills.filter(s=>s.source==='matt')},{fetchImpl:modified});
  assert.equal(r2.skills.find(x=>x.id==='code-review').status,'changed');
  const mechanics='skills/productivity/writing-for-agents/SKILL-MECHANICS.md';
  const changedReference=tree.map(x=>x.path===mechanics?{...x,sha:'d'.repeat(40)}:x);
  const fetchRef=async url=>({ok:true,json:async()=>url.includes('/commits/')?{sha:'f'.repeat(40)}:{tree:changedReference,truncated:false}});
  const [r3]=await checkUpstream({...lock,sources:upstream,skills:lock.skills.filter(s=>s.source==='matt')},{fetchImpl:fetchRef});
  const writing=r3.skills.find(x=>x.id==='writing-for-agents');
  assert.equal(writing.primaryStatus,'unchanged');
  assert.equal(writing.status,'changed');
  assert.equal(writing.references[0].status,'changed');
  const withoutReference=tree.filter(x=>x.path!==mechanics);
  const fetchMissing=async url=>({ok:true,json:async()=>url.includes('/commits/')?{sha:'f'.repeat(40)}:{tree:withoutReference,truncated:false}});
  const [r4]=await checkUpstream({...lock,sources:upstream,skills:lock.skills.filter(s=>s.source==='matt')},{fetchImpl:fetchMissing});
  assert.equal(r4.skills.find(x=>x.id==='writing-for-agents').status,'missing_upstream');
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
  assert.match(deps,/No external skill is bundled, copied, vendored/);
  assert.match(guide,/orasqill deps check-updates/);
  assert.ok(lock.skills.some(s=>s.id==='ponytail-review'&&s.source==='ponytail'));
  assert.match(deps,/Ponytail review\/audit\/debt/);
});
