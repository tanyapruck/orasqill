import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readme = readFileSync(path.join(source, 'README.md'), 'utf8');

function destination(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'orasqill-install-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', dir]);
  mkdirSync(path.join(dir, '.agents/skills'), { recursive: true });
  mkdirSync(path.join(dir, '.agent-workflow'), { recursive: true });
  // Exact required paths named in README: canonical Skill, CLI, and the provenance registry.
  cpSync(path.join(source, '.agents/skills/agent-workflow-orchestrator'),
    path.join(dir, '.agents/skills/agent-workflow-orchestrator'), { recursive: true });
  cpSync(path.join(source, '.agent-workflow/bin'),
    path.join(dir, '.agent-workflow/bin'), { recursive: true });
  cpSync(path.join(source, '.agent-workflow/external-skills.lock.json'),
    path.join(dir, '.agent-workflow/external-skills.lock.json'));
  return dir;
}

test('documented install includes original Skill, helpers, registry and destination ignore rule', () => {
  assert.match(readme, /cp -R .*\.agents\/skills\/agent-workflow-orchestrator/);
  assert.match(readme, /cp -R .*\.agent-workflow\/bin/);
  assert.match(readme, /cp .*\.agent-workflow\/external-skills\.lock\.json/);
  assert.match(readme, /\.agent-workflow\/state\//);
  assert.match(readme, /git check-ignore \.agent-workflow\/state\/install-check\/plan\.json/);
  assert.match(readme, /merge.*\.gitignore|add.*\.gitignore/i);
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
