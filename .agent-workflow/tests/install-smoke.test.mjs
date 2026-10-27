import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const commandGuide = readFileSync(path.join(source, 'docs/command-reference.md'), 'utf8');
const readme = readFileSync(path.join(source, 'README.md'), 'utf8');

function destination(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'orasqill-install-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', dir]);
  mkdirSync(path.join(dir, '.agents/skills'), { recursive: true });
  mkdirSync(path.join(dir, '.agent-workflow'), { recursive: true });
  mkdirSync(path.join(dir, '.claude/skills'), { recursive: true });
  // Exact required paths named in README: canonical Skill, CLI, and the provenance registry.
  cpSync(path.join(source, '.agents/skills/agent-workflow-orchestrator'),
    path.join(dir, '.agents/skills/agent-workflow-orchestrator'), { recursive: true });
  cpSync(path.join(source, '.agents/skills/delegate-tree'),
    path.join(dir, '.agents/skills/delegate-tree'), {recursive:true});
  cpSync(path.join(source, '.claude/skills/delegate-tree'),
    path.join(dir, '.claude/skills/delegate-tree'), {recursive:true});
  cpSync(path.join(source, '.agents/skills/oranit'),
    path.join(dir, '.agents/skills/oranit'), {recursive:true});
  cpSync(path.join(source, '.claude/skills/oranit'),
    path.join(dir, '.claude/skills/oranit'), {recursive:true});
  cpSync(path.join(source, '.agents/skills/configure-models'),
    path.join(dir, '.agents/skills/configure-models'), {recursive:true});
  cpSync(path.join(source, '.claude/skills/configure-models'),
    path.join(dir, '.claude/skills/configure-models'), {recursive:true});
  cpSync(path.join(source, '.agent-workflow/bin'),
    path.join(dir, '.agent-workflow/bin'), { recursive: true });
  cpSync(path.join(source, '.agent-workflow/external-skills.lock.json'),
    path.join(dir, '.agent-workflow/external-skills.lock.json'));
  cpSync(path.join(source, '.agent-workflow/LICENSE.orasqill.txt'),
    path.join(dir, '.agent-workflow/LICENSE.orasqill.txt'));
  cpSync(path.join(source, '.agent-workflow/config.example.json'),
    path.join(dir, '.agent-workflow/config.example.json'));
  cpSync(path.join(source, '.agent-workflow/profiles'),
    path.join(dir, '.agent-workflow/profiles'), {recursive:true});
  cpSync(path.join(source, '.agent-workflow/examples'),
    path.join(dir, '.agent-workflow/examples'), {recursive:true});
  return dir;
}

test('developer command reference documents manual install, helpers, registry and ignore rules', () => {
  assert.match(commandGuide, /cp -R .*\.agents\/skills\/agent-workflow-orchestrator/);
  assert.match(commandGuide, /cp -R .*\.agents\/skills\/configure-models/);
  assert.match(commandGuide, /cp -R .*\.agents\/skills\/oranit/);
  assert.match(commandGuide, /cp -R .*\.agents\/skills\/delegate-tree/);
  assert.match(commandGuide, /cp -R .*\.agent-workflow\/examples/);
  assert.match(commandGuide, /\.claude\/skills\/configure-models/);
  assert.match(commandGuide, /cp -R .*\.agent-workflow\/bin/);
  assert.match(commandGuide, /cp .*\.agent-workflow\/external-skills\.lock\.json/);
  assert.match(commandGuide, /cp -n .*\.agent-workflow\/LICENSE\.orasqill\.txt/);
  assert.match(commandGuide, /Copy-Item .*\.agent-workflow\\LICENSE\.orasqill\.txt/);
  assert.match(commandGuide, /cp .*\.agent-workflow\/config\.example\.json/);
  assert.match(commandGuide, /cp -R .*\.agent-workflow\/profiles/);
  assert.match(commandGuide, /\.agent-workflow\/state\//);
  assert.match(commandGuide, /\.agent-workflow\/routing\//);
  assert.match(commandGuide, /orasqill models resolve claude-code/);
  assert.match(commandGuide, /orasqill models resolve codex/);
  assert.match(commandGuide, /git check-ignore \.agent-workflow\/state\/install-check\/plan\.json/);
  assert.match(commandGuide, /merge.*\.gitignore|add.*\.gitignore/i);
});

test('fresh destination can list source-pinned third-party skills without application files', t => {
  const dest = destination(t);
  const out = execFileSync(process.execPath, ['.agent-workflow/bin/external-skills.mjs', 'list'], {
    cwd: dest, encoding: 'utf8'
  });
  assert.match(out, /karpathy-guidelines\s+required\s+multica-ai\/andrej-karpathy-skills/);
  assert.match(out, /grill-with-docs\s+conditional\s+mattpocock\/skills/);
  assert.match(out, /ponytail-review\s+optional\s+dietrichgebert\/ponytail/);
  assert.equal(out.trimEnd().split('\n').length, 18);
  assert.ok(existsSync(path.join(dest, '.agents/skills/agent-workflow-orchestrator/SKILL.md')));
  assert.ok(existsSync(path.join(dest, '.agent-workflow/bin/plan-ledger.mjs')));
  assert.ok(existsSync(path.join(dest, '.agents/skills/configure-models/SKILL.md')));
  assert.ok(existsSync(path.join(dest, '.agents/skills/oranit/SKILL.md')));
  assert.ok(existsSync(path.join(dest, '.agents/skills/delegate-tree/SKILL.md')));
  assert.ok(existsSync(path.join(dest, '.claude/skills/delegate-tree/SKILL.md')));
  assert.ok(existsSync(path.join(dest, '.agent-workflow/bin/nested-delegation.mjs')));
  assert.ok(existsSync(path.join(dest, '.agent-workflow/examples/nested-tree.example.json')));
  assert.ok(existsSync(path.join(dest, '.claude/skills/oranit/SKILL.md')));
  assert.ok(existsSync(path.join(dest, '.agent-workflow/bin/oranit.mjs')));
  assert.equal(
    readFileSync(path.join(dest,'.agent-workflow/LICENSE.orasqill.txt'),'utf8'),
    readFileSync(path.join(source,'LICENSE'),'utf8')
  );
  assert.ok(existsSync(path.join(dest, '.claude/skills/configure-models/SKILL.md')));
  const presetResult=JSON.parse(execFileSync(process.execPath,['.agent-workflow/bin/model-config.mjs','preview','claude-orchestrator'],{cwd:dest,encoding:'utf8'}));
  assert.equal(presetResult.validation.valid,true);
  assert.equal(presetResult.config.setup.status,'unconfirmed');
  assert.equal(existsSync(path.join(dest,'.agent-workflow/config.json')),false);
  const candidateConfig=JSON.parse(readFileSync(path.join(dest, '.agent-workflow/config.example.json'),'utf8'));
  assert.equal(candidateConfig.setup.status,'unconfirmed');
  for(const name of ['openai-orchestrator','claude-orchestrator']){
    const profile=JSON.parse(readFileSync(path.join(dest,'.agent-workflow/profiles',name+'.json'),'utf8'));
    assert.equal(profile.setup.status,'unconfirmed');
    assert.equal(profile.setup.profile,name);
    assert.equal(profile.routing.orchestrator.automatic_switching,false);
  }
  // F1 regression: leaving out the registry makes installed provenance commands fail.
  rmSync(path.join(dest, '.agent-workflow/external-skills.lock.json'));
  const missing = spawnSync(process.execPath, ['.agent-workflow/bin/external-skills.mjs', 'list'], {
    cwd: dest, encoding: 'utf8'
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /ENOENT|no such file|EXTERNAL_SKILL_ERROR/i);
});

test('fresh destination must explicitly ignore local task state to prevent accidental commits', t => {
  const dest = destination(t);
  const candidate = '.agent-workflow/state/install-check/plan.json';
  const check = () => spawnSync('git', ['check-ignore', candidate], { cwd: dest, encoding: 'utf8' });
  // F2 regression: without destination ignore, the local task state is unprotected.
  assert.notEqual(check().status, 0);
  writeFileSync(path.join(dest, '.gitignore'), '.agent-workflow/state/\n');
  const ignored = check();
  assert.equal(ignored.status, 0);
  assert.equal(ignored.stdout.trim(), candidate);
});

test('fresh destination preflight prevents an unborn HEAD and then starts a real locked plan', t => {
  const dest = destination(t);
  writeFileSync(path.join(dest, '.gitignore'), '.agent-workflow/state/\n');
  const run = args => spawnSync(process.execPath, ['.agent-workflow/bin/plan-ledger.mjs', ...args], {
    cwd: dest, encoding: 'utf8'
  });
  const argv = ['start', 'install-demo', '--goal', 'Verify installed plan startup',
    '--step', 'Check installed tools', '--accept', 'Installed CLI works'];
  assert.notEqual(spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: dest }).status, 0);
  const premature = run(argv);
  assert.notEqual(premature.status, 0);
  assert.ok(!existsSync(path.join(dest, '.agent-workflow/state/install-demo/plan.json')));
  writeFileSync(path.join(dest, 'base.txt'), 'project baseline\n');
  execFileSync('git', ['add', '.gitignore', 'base.txt'], { cwd: dest });
  execFileSync('git', ['-c', 'user.email=smoke@example.invalid', '-c', 'user.name=Smoke',
    'commit', '-qm', 'initial baseline'], { cwd: dest });
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: dest, encoding: 'utf8' }).trim();
  assert.ok(branch, 'named branch must exist');
  const started = run(argv);
  assert.equal(started.status, 0, started.stderr);
  const plan = JSON.parse(readFileSync(path.join(dest, '.agent-workflow/state/install-demo/plan.json'), 'utf8'));
  assert.equal(plan.steps[0].id, 'S1');
  assert.equal(plan.acceptance[0], 'Installed CLI works');
  assert.equal(plan.startBranch, branch);
  assert.equal(spawnSync('git', ['check-ignore', '.agent-workflow/state/install-demo/plan.json'], { cwd: dest }).status, 0);
});


test('fresh consumer can follow the documented end-to-end plan, acceptance and finish flow', t => {
  const dest = destination(t);
  writeFileSync(path.join(dest, '.gitignore'), '.agent-workflow/state/\n');
  writeFileSync(path.join(dest, 'README.md'), 'Before\n');
  const git = (...args) => execFileSync('git', args, { cwd: dest, encoding: 'utf8' });
  assert.notEqual(spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: dest }).status, 0);
  git('add', '.');
  git('-c', 'user.email=fixture@example.invalid', '-c', 'user.name=Fixture', 'commit', '-qm', 'Initial commit');
  assert.ok(git('rev-parse', '--verify', 'HEAD').trim());
  assert.ok(git('branch', '--show-current').trim());
  const cli = (...args) => execFileSync(process.execPath,
    ['.agent-workflow/bin/plan-ledger.mjs', ...args], { cwd: dest, encoding: 'utf8' });
  cli('start', 'docs-demo', '--goal', 'Improve an agreed README sentence',
    '--step', 'Make the agreed README edit', '--step', 'Inspect the diff',
    '--accept', 'The agreed README sentence is correct');
  writeFileSync(path.join(dest, 'README.md'), 'After\n');
  cli('step', 'docs-demo', '--step', 'S1', '--evidence', 'Inspected the modified README');
  git('diff', '--check');
  cli('step', 'docs-demo', '--step', 'S2', '--evidence', 'git diff --check and diff inspection completed');
  cli('check', 'docs-demo', '--status', 'pass', '--accept', 'A1',
    '--result', 'Checked the requested README sentence and diff');
  cli('report', 'docs-demo');
  cli('finish', 'docs-demo');
  const stateDir = path.join(dest, '.agent-workflow/state/docs-demo');
  const task = JSON.parse(readFileSync(path.join(stateDir, 'task.json'), 'utf8'));
  assert.equal(task.status, 'finished');
  assert.match(readFileSync(path.join(stateDir, 'final-report.md'), 'utf8'), /PLAN COMPLETE/);
  assert.doesNotMatch(git('status', '--short'), /\.agent-workflow\/state\//);
});

test('public README stays short and links to the complete command reference',()=>{
  assert.match(readme,/\[Command Reference\]\(docs\/command-reference\.md\)/);
  assert.match(readme,/\[Model Routing\]\(docs\/model-routing\.md\)/);
  assert.match(readme,/\[Developer Notes\]\(docs\/developer-notes\.md\)/);
  assert.equal((readme.match(/^\`\`\`/gm)||[]).length,2);
  assert.ok(readme.split(/\r?\n/).length<160);
});
