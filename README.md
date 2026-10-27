# Orasqill

**Plan, navigate and review AI-assisted coding work in your workspace.**

Orasqill combines reusable Skills for Codex and Claude Code with small local Node.js tools for code indexing, model configuration, task checkpoints and optional delegation.

## Customer Guide

### What is Orasqill?

A toolkit for developers and teams who work with AI coding agents. Orasqill helps you keep project context and track work across different agents.

| Feature | What you get |
|---|---|
| **One-command setup** | Prepare your coding workspace with Skills, an index and starter model options |
| **Codebase index** | Find files and functions without repeatedly searching a whole repository |
| **Model configuration** | Separate routing for Claude Code, Codex and an optional custom Other Model |
| **Task tracking** | Keep a plan, recorded progress and test results together |
| **Agent handoff** | Continue unfinished work with another compatible agent |
| **Nested task planning** | Divide large features into manageable workstreams |

### Get started

1. Have **Git**, **Node.js 20+**, and access to the Orasqill repository.
2. Open your coding project.
3. Follow the [workspace setup commands](#1-set-up-a-workspace). The setup command is simply **`oranit`**.
4. Use the [agent command table](#2-commands-inside-claude-code-and-codex) to configure models or request nested delegation.

On a new workspace, Orasqill prepares one shared code index and neutral task config, alongside independent Claude Code and Codex model candidates. Existing model settings and agent instructions are preserved.

**Important:** Orasqill helps coordinate AI coding work; it does not host AI models or automatically launch subagents. Execution capabilities depend on your Codex/Claude Code setup.

## Developer Guide

### Requirements

- Node.js 20+ and Git, with an initial commit and named branch in your project.
- Access to an agent that supports Skills and local CLI tools.
- The original [Karpathy guidelines](https://github.com/multica-ai/andrej-karpathy-skills) Skill for the agent writing code. Third-party Skills are **not vendored or copied** by Orasqill.

The Orasqill repository is currently private, so you must have access to clone it.

### Project structure

| Directory | Purpose |
|---|---|
| `.agents/skills/` | Portable Orasqill Skills |
| `.claude/skills/` | Claude Code adapters |
| `.agent-workflow/bin/` | Local Node.js tools |
| `.agent-workflow/profiles/` | Read-only Claude, Codex and Other Model presets |
| `.agent-workflow/routing/` | Local, Git-ignored model choices per invoking agent |
| `.agent-workflow/examples/` | Example task plans and delegation trees |
| `.agent-workflow/tests/` | Tests |
| `.agent-workflow/external-skills.lock.json` | External Skill source registry |

### Command Reference

All commands in one place: run CLI commands in a terminal, and Skill commands inside Codex or Claude Code. Start workspace setup with **`oranit`**.

#### 1. Set up a workspace

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

#### 2. Commands inside Claude Code and Codex

| Goal | Claude Code | Codex |
|---|---|---|
| Initialize workspace | `/oranit` | `$oranit` |
| Review or change model/effort roles | `/configure-models` | `$configure-models` |
| Propose bounded multi-level delegation | `/delegate-tree` | `$delegate-tree` |

To start with a preset in Claude Code, use `/configure-models claude-led`. Agent execution depends on your connected runtime.

#### 3. Inspect model config (read-only)

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

#### 4. Plan Ledger: execute and review an approved task

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

For acceptance checks, see [Plan execution](.agents/skills/agent-workflow-orchestrator/references/plan-execution.md).

#### 5. Nested delegation, task scheduling and handoffs

Use the Delegate Tree Skill, customize the [example tree](.agent-workflow/examples/nested-tree.example.json) to your task and preview the proposed plan.

```sh
node .agent-workflow/bin/nested-delegation.mjs plan nested-tree.json --locked-plan .agent-workflow/state/<task-id>/plan.json
node .agent-workflow/bin/nested-delegation.mjs packet nested-tree.json otp --locked-plan .agent-workflow/state/<task-id>/plan.json
node .agent-workflow/bin/task-planner.mjs <scheduler-tasks.json> --locked-plan .agent-workflow/state/<task-id>/plan.json
```

These commands prepare task proposals; execution depends on your connected agent runtime.

#### 6. Verify installation, external Skills and tests

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

#### 7. Manual installation (only when not using `oranit`)

The commands below are alternatives to `oranit` when you need manual installation. Compare files before replacing them.

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
Copy-Item (Join-Path $src '.agent-workflow\config.example.json') '.agent-workflow\'
Copy-Item -Recurse (Join-Path $src '.agent-workflow\profiles') '.agent-workflow\'
Copy-Item -Recurse (Join-Path $src '.agent-workflow\examples') '.agent-workflow\'
```

To install Claude Code commands manually, copy the [Orchestrator adapter](.claude/skills/agent-workflow-orchestrator/SKILL.md) and the command adapters into `.claude/skills/`:

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

### Model mapping

**Independent model routes, one workspace:**

| Shared | Claude Code | Codex |
|---|---|---|
| Code index, task plan, workspace limits | `.agent-workflow/routing/claude-code.json` | `.agent-workflow/routing/codex.json` |

An **optional third route** `.agent-workflow/routing/other.json` supports custom models from another provider/runtime without altering the two existing routes. It is created only when you choose `oranit --profile other`.

Run `model-config.mjs resolve claude-code`, `resolve codex`, or `resolve other` to inspect the selected mapping. Other Model requires an explicit user choice; it is never silently substituted. Agent identity must come from the actual runtime rather than an arbitrary filename.

You can customize model/effort assignments per agent. Bundled profiles are suggested starting points:

| Stage | OpenAI orchestrates (`openai-orchestrator.json`) | Claude orchestrates (`claude-orchestrator.json`) |
|---|---|---|
| Orchestrator / plan | GPT-6.1 Sol — high | Claude Opus 5.5 — high |
| Triage / reconnaissance | GPT-6 Luna — low | Claude Haiku 5.5 — low |
| Implementation | GPT-6.1 Sol — medium | Claude Sonnet 5.5 — medium (Claude Code) |
| Scoped code fixes | GPT-6.1 Terra — high | Claude Sonnet 5.5 — medium (inherits Implementer) |
| Complex implementation | GPT-6 Astra — high | Claude Sonnet 5.5 — high |
| Visual QA / computer use | GPT-6.1 Terra — medium | GPT-6.1 Terra — medium (Codex specialist) |
| Independent review | Claude Opus 5.5 — high | GPT-6.1 Sol — xhigh |
| HIGH_RISK review | Claude Opus 5.5 — xhigh | GPT-6.1 Sol — Ultra (requested review mode; API effort max) |
| Final report | GPT-6 Luna — low | Claude Haiku 5.5 — low |

**Other Model:** Start with `oranit --profile other`, then use `$configure-models` or `/configure-models` to explicitly target **other**. Fill in a real provider, installed runtime/adapter ID and model identifier for each role you want enabled. If the external runtime has no equivalent reasoning-effort control, omit `effort`. No external provider is bundled, verified or launched by this selection.

The agent-local profiles default to `setup.status = "unconfirmed"` until you configure each runtime. If an existing workspace has a legacy Claude-led (or OpenAI-led) shared config, `oranit` preserves it; the corresponding agent can retain its matching mapping without changing the other agent. Terra is a specialist for scoped implementation in OpenAI-led mode and for computer-use tasks in either mode. In the Claude-led high-risk reviewer profile, Ultra is a *requested client mode*, not an API effort level.

Details: [Model routing and setup](.agents/skills/agent-workflow-orchestrator/references/setup-routing.md).

### Install in another Git repository

Use the [workspace setup](#1-set-up-a-workspace) commands above, or choose [manual installation](#7-manual-installation-only-when-not-using-oranit). Add Orasqill to existing project instructions without overwriting your own `AGENTS.md`.

### Verify the installation

After setup, use the [installation checks](#6-verify-installation-external-skills-and-tests) to confirm that Git, the local CLI and the external Skill registry are accessible.

### External Skills and update tracking

| Integration | Purpose |
|---|---|
| [Karpathy guidelines](https://github.com/multica-ai/andrej-karpathy-skills) | Guidelines for coding agents |
| [Matt Pocock's Skills](https://github.com/mattpocock/skills) | Optional planning, specs, testing and reviews |
| [Ponytail](https://github.com/dietrichgebert/ponytail) | Optional code review and analysis |

Upstream Skills are installed separately. You can see their registered sources in [External dependencies](.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md).

### Quick start: a complete documentation-only task

After creating an agreed plan, see the [Plan Ledger example](#4-plan-ledger-execute-and-review-an-approved-task). It shows starting a task, recording completed steps and tests, producing a report and closing the task.

### Troubleshooting

| Problem | Check |
|---|---|
| Command not found | Link `oranit` or use the Node.js entrypoint |
| Index is out of date | Refresh the code index |
| Model cannot be selected | Check actual provider support |
| Task cannot be closed | Review outstanding steps and acceptance checks |
| Handoff cannot resume | Check the branch and local task state |
| Git preflight fails | Check the initial commit and branch |

Detailed CLI errors are documented in the [helper catalog](.agent-workflow/bin/README.md).

### Tests, limitations and sharing

Run the [test command](#6-verify-installation-external-skills-and-tests) in the Orasqill source checkout. Consumer installations do not include tests.

Orasqill provides Skills and local tools, not a sandbox or hosted execution platform. The repository is private and no standalone open-source license has been selected.

## AI Guide

This section helps a coding agent discover the correct Orasqill Skill. **Follow the authoritative instructions in [AGENTS.md](AGENTS.md) and the relevant Skill; README is an overview, not a replacement for those instructions.**

| Task | Use |
|---|---|
| Plan or coordinate a multi-step change | [Orchestrator Skill](.agents/skills/agent-workflow-orchestrator/SKILL.md) |
| Locate code before an edit | [Index-first navigation](.agents/skills/agent-workflow-orchestrator/references/index-navigation.md) |
| Initialize the current workspace | [Oranit Skill](.agents/skills/oranit/SKILL.md) |
| Review model choices | [Configure Models Skill](.agents/skills/configure-models/SKILL.md) |
| Suggest or plan multi-level delegation | [Delegate Tree Skill](.agents/skills/delegate-tree/SKILL.md) |
| Check external prerequisites | [Dependencies reference](.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md) |

### Suggested workflow for agents

1. Read the relevant Skill and establish the user-approved task.
2. Use the code index to find candidate files, then inspect actual source and related tests.
3. Make changes within the planned scope; ask for a decision when material new work is discovered.
4. Suggest nested delegation only for sizable work that splits cleanly into independent parts.
5. Report what changed, what was tested and what remains.

All executable commands are in the [Command Reference](#command-reference). Detailed orchestration, review and handoff procedures are maintained in the Skills and their references, not duplicated in this README.
