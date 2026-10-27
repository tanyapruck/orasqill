# Command Reference

All Orasqill commands in one place, for developers who need more than the [quick start](../README.md#developer-guide). Run terminal commands from the intended project folder unless a command explicitly names another workspace.


Start workspace setup with **`oranit`**; enter Skill commands inside Claude Code or Codex, not in a terminal.

## 1. Set up a workspace

From an accessible Orasqill checkout (the repository is currently private):

```sh
git clone https://github.com/tanyapruckp-pan/orasqill.git /path/to/orasqill
cd /path/to/orasqill
npm link
cd /path/to/your-workspace
oranit
```

| CLI command | Purpose |
|---|---|
| `oranit` | **Initialize** shared workspace state and separate Claude Code/Codex model candidates |
| `oranit --profile claude-led` | Create Claude Code's missing candidate only; leave Codex unchanged |
| `oranit --profile openai-led` | Create Codex's missing candidate only; leave Claude unchanged |
| `oranit --profile other` | Create an **optional Other Model** route with no model selected |
| `oranit --workspace /path/to/project` | Target a particular workspace |
| `oranit --dry-run` | Preview changes without writing files |
| `oranit status` | Check whether the index matches current source |
| `oranit locate "keyword"` | Find candidate files, symbols and approximate line numbers |
| `oranit refresh` | Rebuild the index after source changes, leaving model config untouched |

Without `npm link`, call the source CLI directly:

```sh
node /path/to/orasqill/.agent-workflow/bin/oranit.mjs --workspace /path/to/your-workspace
```

## 2. Commands inside Claude Code and Codex

| Goal | Claude Code | Codex |
|---|---|---|
| Initialize workspace | `/oranit` | `$oranit` |
| Review or change model/effort roles | `/configure-models` | `$configure-models` |
| Propose bounded multi-level delegation | `/delegate-tree` | `$delegate-tree` |

To start with a preset in Claude Code, use `/configure-models claude-led`. Agent execution depends on your connected runtime.

## 3. Inspect model config (read-only)

```sh
node .agent-workflow/bin/model-config.mjs preview claude-orchestrator
node .agent-workflow/bin/model-config.mjs preview openai-orchestrator
node .agent-workflow/bin/model-config.mjs preview other-orchestrator
node .agent-workflow/bin/model-config.mjs validate .agent-workflow/config.json
node .agent-workflow/bin/model-config.mjs resolve claude-code --workspace .
node .agent-workflow/bin/model-config.mjs resolve codex --workspace .
node .agent-workflow/bin/model-config.mjs resolve other --workspace .
```

To create an **agent-specific** mapping manually (only if that agent's route does not exist):

```sh
# macOS/Linux/Git Bash
mkdir -p .agent-workflow/routing
cp -n .agent-workflow/profiles/claude-orchestrator.json .agent-workflow/routing/claude-code.json
cp -n .agent-workflow/profiles/openai-orchestrator.json .agent-workflow/routing/codex.json
```

```powershell
# Windows PowerShell
New-Item -ItemType Directory -Force '.agent-workflow/routing' | Out-Null
if (-not (Test-Path '.agent-workflow/routing/claude-code.json')) {
  Copy-Item '.agent-workflow/profiles/claude-orchestrator.json' '.agent-workflow/routing/claude-code.json'
}
if (-not (Test-Path '.agent-workflow/routing/codex.json')) {
  Copy-Item '.agent-workflow/profiles/openai-orchestrator.json' '.agent-workflow/routing/codex.json'
}
```

For an existing workspace, use the model configuration Skill for the **explicitly selected target**. Claude Code edits only `routing/claude-code.json`, Codex only `routing/codex.json`; Other Model uses `routing/other.json` when the user selects it. The shared `.agent-workflow/config.json` is not a model selector. `resolve` previews candidate mappings without activating or switching agents.

## 4. Plan Ledger: execute and review an approved task

Example workflow for an agreed documentation task. Record actual work and test results.

```sh
node .agent-workflow/bin/plan-ledger.mjs start docs-demo \
  --goal "Improve an agreed README sentence" \
  --step "Make the agreed README edit" \
  --step "Inspect the diff" \
  --accept "The agreed README sentence is correct"

# After actually making the approved edit:
node .agent-workflow/bin/plan-ledger.mjs step docs-demo --step S1 --evidence "Inspected the modified README"
# After actually checking git diff:
node .agent-workflow/bin/plan-ledger.mjs step docs-demo --step S2 --evidence "git diff --check and diff inspection completed"
# Record the real result of the acceptance check (A1 refers to the first --accept):
node .agent-workflow/bin/plan-ledger.mjs check docs-demo --status pass --accept A1 --result "Checked the requested README sentence and diff"
node .agent-workflow/bin/plan-ledger.mjs report docs-demo
node .agent-workflow/bin/plan-ledger.mjs finish docs-demo
```

| Additional command | When to use |
|---|---|
| `node .agent-workflow/bin/plan-ledger.mjs finding <task-id> --description "..." --impact "..." --reason "..." --necessary yes\|no` | Log work outside the plan |
| `node .agent-workflow/bin/plan-ledger.mjs amend <task-id> --finding F1 --step "..." --approvalref "..."` | Amend **only after real user approval** |
| `node .agent-workflow/bin/plan-ledger.mjs review <task-id> --reviewer "..." --independent yes --result pass --evidence "..."` | Record an actual independent HIGH_RISK review |
| `node .agent-workflow/bin/manual-handoff.mjs resume` | Continue a unique unfinished authorized task on the current branch |
| `node .agent-workflow/bin/manual-handoff.mjs start\|checkpoint\|export\|finish <task-id> ...` | Legacy/manual handoff commands; cannot bypass locked-plan gates |

For acceptance checks, see [Plan execution](../.agents/skills/agent-workflow-orchestrator/references/plan-execution.md).

## 5. Nested delegation, task scheduling and handoffs

Use the Delegate Tree Skill, customize the [example tree](../.agent-workflow/examples/nested-tree.example.json) to your task and preview the proposed plan.

```sh
node .agent-workflow/bin/nested-delegation.mjs plan nested-tree.json --locked-plan .agent-workflow/state/<task-id>/plan.json
node .agent-workflow/bin/nested-delegation.mjs packet nested-tree.json otp --locked-plan .agent-workflow/state/<task-id>/plan.json
node .agent-workflow/bin/task-planner.mjs <scheduler-tasks.json> --locked-plan .agent-workflow/state/<task-id>/plan.json
```

These commands prepare task proposals; execution depends on your connected agent runtime.

## 6. Verify installation, external Skills and tests

Verify a target project:

```sh
git rev-parse --verify HEAD                      # an initial commit exists
git branch --show-current                       # a nonempty named branch
node .agent-workflow/bin/external-skills.mjs list
# external-skills.lock.json registry is required for this command.
git check-ignore .agent-workflow/state/install-check/plan.json
# must exit 0: the future local plan file is ignored
```

Inspect external Skill references:

```sh
node .agent-workflow/bin/external-skills.mjs list
node .agent-workflow/bin/external-skills.mjs check-updates --source matt
node .agent-workflow/bin/external-skills.mjs verify-file karpathy-guidelines /path/to/original/SKILL.md
node .agent-workflow/bin/external-skills.mjs verify-reference writing-for-agents skills/productivity/writing-for-agents/SKILL-MECHANICS.md /path/to/original/SKILL-MECHANICS.md
```

From the **Orasqill source checkout** (not a minimal destination install), run:

```sh
npm test
```

## 7. Manual installation (only when not using `oranit`)

The commands below are alternatives to `oranit` when you need manual installation. Compare files before replacing them. Keep `.agent-workflow/LICENSE.orasqill.txt` with any copied Orasqill files; the target project's own `LICENSE` must remain untouched.

**macOS, Linux or Git Bash**

```sh
git clone https://github.com/tanyapruckp-pan/orasqill.git /path/to/orasqill
cd /path/to/your-project
mkdir -p .agents/skills .agent-workflow
cp -R /path/to/orasqill/.agents/skills/agent-workflow-orchestrator .agents/skills/
cp -R /path/to/orasqill/.agents/skills/configure-models .agents/skills/
cp -R /path/to/orasqill/.agents/skills/oranit .agents/skills/
cp -R /path/to/orasqill/.agents/skills/delegate-tree .agents/skills/
cp -R /path/to/orasqill/.agent-workflow/bin .agent-workflow/
cp /path/to/orasqill/.agent-workflow/external-skills.lock.json .agent-workflow/
cp -n /path/to/orasqill/.agent-workflow/LICENSE.orasqill.txt .agent-workflow/
cp /path/to/orasqill/.agent-workflow/config.example.json .agent-workflow/
cp -R /path/to/orasqill/.agent-workflow/profiles .agent-workflow/
cp -R /path/to/orasqill/.agent-workflow/examples .agent-workflow/
```

**Windows PowerShell**

```powershell
$src = 'C:\path\to\orasqill'
New-Item -ItemType Directory -Force '.agents\skills', '.agent-workflow' | Out-Null
Copy-Item -Recurse (Join-Path $src '.agents\skills\agent-workflow-orchestrator') '.agents\skills\'
Copy-Item -Recurse (Join-Path $src '.agents\skills\configure-models') '.agents\skills\'
Copy-Item -Recurse (Join-Path $src '.agents\skills\oranit') '.agents\skills\'
Copy-Item -Recurse (Join-Path $src '.agents\skills\delegate-tree') '.agents\skills\'
Copy-Item -Recurse (Join-Path $src '.agent-workflow\bin') '.agent-workflow\'
Copy-Item (Join-Path $src '.agent-workflow\external-skills.lock.json') '.agent-workflow\'
if (-not (Test-Path '.agent-workflow\LICENSE.orasqill.txt')) {
  Copy-Item (Join-Path $src '.agent-workflow\LICENSE.orasqill.txt') '.agent-workflow\'
}
Copy-Item (Join-Path $src '.agent-workflow\config.example.json') '.agent-workflow\'
Copy-Item -Recurse (Join-Path $src '.agent-workflow\profiles') '.agent-workflow\'
Copy-Item -Recurse (Join-Path $src '.agent-workflow\examples') '.agent-workflow\'
```

To install Claude Code commands manually, copy the [Orchestrator adapter](../.agents/skills/agent-workflow-orchestrator/SKILL.md) and the command adapters into `.claude/skills/`:

```sh
mkdir -p .claude/skills
cp -R /path/to/orasqill/.claude/skills/configure-models .claude/skills/
cp -R /path/to/orasqill/.claude/skills/oranit .claude/skills/
cp -R /path/to/orasqill/.claude/skills/delegate-tree .claude/skills/
```

```powershell
New-Item -ItemType Directory -Force '.claude\skills' | Out-Null
Copy-Item -Recurse (Join-Path $src '.claude\skills\configure-models') '.claude\skills\'
Copy-Item -Recurse (Join-Path $src '.claude\skills\oranit') '.claude\skills\'
Copy-Item -Recurse (Join-Path $src '.claude\skills\delegate-tree') '.claude\skills\'
```

Merge these lines into the destination project's `.gitignore` (keep any existing entries):

```gitignore
.agent-workflow/state/
.agent-workflow/config.json
.agent-workflow/routing/
.agent-workflow/index/
```

