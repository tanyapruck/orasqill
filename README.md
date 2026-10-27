# Orasqill — Plan-locked orchestration for coding agents

**Orasqill helps an authorized AI agent plan work, stay inside the approved scope, hand work to another agent, and report what was actually checked.** It is a portable, provider-neutral [agent Skill](.agents/skills/agent-workflow-orchestrator/SKILL.md) backed by small local Node.js tools.

```text
PLAN → CHECKPOINT → EXECUTE → VALIDATE → CLOSE
                    ↳ out-of-plan discovery → Finding → defer or request approval
```

Orasqill does **not** launch AI models, provide credentials, authorize Git operations, enforce filesystem permissions, or silently change providers. Its ledger records evidence; the executing agent and authorized humans must still verify changes and approvals.

## Who it is for

- **Developers:** keep AI-assisted bug fixes and surgical changes bounded and reviewable.
- **Teams:** hand an unfinished task between Codex, Claude Code, or another compatible agent without losing its original plan.
- **Reviewers:** distinguish completed steps, failed checks, deferred findings, required independent reviews, and actual Git status.

An eligible agent can coordinate when explicitly authorized; no provider is the permanent owner. Ordinary work defaults to one writer and sequential steps. Parallel work needs real, verified runtime isolation—not merely a scheduling suggestion.

## Requirements

- **Git** and **Node.js 20+**, available in the target project's environment.
- A Git repository with an **initial commit** and **named branch**. Orasqill will not create commits for you.
- An agent able to read the Skill and run allowed local commands.
- For **all coding, bug fixes, refactors, and surgical source/test edits**, the *agent actually writing the code* must be able to load the original external [`karpathy-guidelines`](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/skills/karpathy-guidelines/SKILL.md) Skill. If it cannot, that coding stage stops with `SETUP_REQUIRED: dependency_unavailable`.

Third-party Skills are **not vendored or copied** into Orasqill. Their original owners, paths and reviewed Git fingerprints are recorded in [the independent registry](.agent-workflow/external-skills.lock.json); verify installation and loadability in each agent's runtime. Optional Matt Pocock and Ponytail integrations are never automatic.

## Command Reference

All Orasqill commands are collected **in this section**. Start with **`oranit`** in a target workspace; no `init` subcommand is supported. The **Skill commands** below are entered in an agent chat, while the CLI commands are run in a shell. The helpers do not launch models or bypass authorization gates.

### 1. Set up a workspace

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
| `oranit` | **Initialize** a workspace: install missing Orasqill Skills, create a local code index and unconfirmed model config |
| `oranit --profile claude-led` | Initialize with the Claude-led candidate mapping |
| `oranit --profile openai-led` | Initialize with the OpenAI-led candidate mapping |
| `oranit --workspace /path/to/project` | Target a particular workspace |
| `oranit --dry-run` | Preview changes without writing files |
| `oranit status` | Check whether the index matches current source |
| `oranit locate "verifyOTP"` | Find candidate files, symbols and approximate line numbers |
| `oranit refresh` | Rebuild the index after source changes, leaving model config untouched |

Without `npm link`, call the source CLI directly:

```sh
node /path/to/orasqill/.agent-workflow/bin/oranit.mjs --workspace /path/to/your-workspace
```

### 2. Commands inside Claude Code and Codex

| Goal | Claude Code | Codex |
|---|---|---|
| Initialize workspace | `/oranit` | `$oranit` |
| Review or change model/effort roles | `/configure-models` | `$configure-models` |
| Propose bounded multi-level delegation | `/delegate-tree` | `$delegate-tree` |

For Claude Code, a preset can be suggested with `/configure-models claude-led`. These Skills only start a guided workflow: writing model config, dispatching agents and protected operations still require their own authorization.

### 3. Inspect model config (read-only)

```sh
node .agent-workflow/bin/model-config.mjs preview claude-orchestrator
node .agent-workflow/bin/model-config.mjs preview openai-orchestrator
node .agent-workflow/bin/model-config.mjs validate .agent-workflow/config.json
```

To copy a preset into a **new** local config when there is no existing config to preserve:

```sh
# macOS/Linux/Git Bash — choose ONE
cp .agent-workflow/profiles/claude-orchestrator.json .agent-workflow/config.json
# or
cp .agent-workflow/profiles/openai-orchestrator.json .agent-workflow/config.json
```

```powershell
# Windows PowerShell — choose ONE
Copy-Item '.agent-workflow/profiles/claude-orchestrator.json' '.agent-workflow/config.json'
# or
Copy-Item '.agent-workflow/profiles/openai-orchestrator.json' '.agent-workflow/config.json'
```

Use the interactive Skill for existing configs. A structurally valid file is not proof that a model, requested effort or provider integration is available.

### 4. Plan Ledger: execute and review an approved task

The following example assumes an **approved documentation-only plan**. Actually perform each step and check its evidence before recording a PASS.

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

Acceptance IDs begin at `A1`; the latest check for **every** ID must pass. A typed approval or reviewer identity is not independently verified evidence.

### 5. Nested delegation, task scheduling and handoffs

Start the bounded workflow via the **Skill command in section 2**, then validate the proposed tree against an existing locked plan. Adapt the checked-in `.agent-workflow/examples/nested-tree.example.json` first: its root objective must exactly match the next pending step.

```sh
node .agent-workflow/bin/nested-delegation.mjs plan nested-tree.json --locked-plan .agent-workflow/state/<task-id>/plan.json
node .agent-workflow/bin/nested-delegation.mjs packet nested-tree.json otp --locked-plan .agent-workflow/state/<task-id>/plan.json
node .agent-workflow/bin/task-planner.mjs <scheduler-tasks.json> --locked-plan .agent-workflow/state/<task-id>/plan.json
```

The nested tools are **plan-only**. They never spawn subagents, verify provider authority or enable parallelism. The scheduler graph (`tasks`) differs from the ledger plan (`steps`). On a different machine, transfer state deliberately and without secrets.

### 6. Verify installation, external Skills and tests

After installing files in a **destination** repository, verify Git state, the external source registry and that local task evidence is ignored:

```sh
git rev-parse --verify HEAD                      # an initial commit exists
git branch --show-current                       # a nonempty named branch
node .agent-workflow/bin/external-skills.mjs list
# external-skills.lock.json registry is required for this command.
git check-ignore .agent-workflow/state/install-check/plan.json
# must exit 0: the future local plan file is ignored
```

The external-skills registry is required for provenance verification. To check upstream references without installing them:

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

### 7. Manual installation (only when not using `oranit`)

`oranit` is the recommended installer. These platform-specific commands are kept for teams that need an explicit, reviewable copy process. **Do not overwrite existing project files without comparing them first.**

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

For Claude Code, optionally install the [Orchestrator adapter](.claude/skills/agent-workflow-orchestrator/SKILL.md) and command adapters in `.claude/skills/`. To add `/configure-models` manually:

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
.agent-workflow/index/
```

## How `oranit` works

The bare `oranit` command prepares **both** a codebase locator and an unconfirmed model-configuration starting point. On first use it installs only missing packaged Skills and helper files. It creates `.agent-workflow/index/codebase-map.json` (paths, symbol hints and hashes) and `.agent-workflow/config.json` (candidate mapping); both are ignored by Git.

**Existing Skills, config and agent instructions are preserved.** Missing ignore rules are appended to the destination `.gitignore`. If `AGENTS.md` already exists, it is not replaced—add the [index-first instructions](.agents/skills/agent-workflow-orchestrator/references/index-navigation.md) manually if needed.

The index is a **locator, not verified code truth**. On missing or stale indexes use the [index commands](#1-set-up-a-workspace), then inspect actual code, imports, callers and tests before editing. Partial coverage requires scoped search. Initialization never activates model runtimes or delegates work.

## Install in another Git repository

**Recommended:** use the one-command [workspace setup](#1-set-up-a-workspace). For a controlled copy without a globally installed CLI, use the [manual macOS/Linux and PowerShell instructions](#7-manual-installation-only-when-not-using-oranit) in the same Command Reference.

**Connect your agent.** Add a short pointer to the canonical `.agents/skills/agent-workflow-orchestrator/SKILL.md` in your `AGENTS.md` without overwriting existing instructions. Claude Code needs its own optional discovery adapters; Codex uses the canonical Skills. External prerequisite Skills such as `karpathy-guidelines` are **not installed** automatically.

**Keep checkpoints private.** Task state can include goals, paths, Findings and approval notes. Keep `.agent-workflow/state/`, `.agent-workflow/config.json` and `.agent-workflow/index/` ignored. Ignored files do not travel with Git pushes.

### Verify the installation

Follow the [verification commands](#6-verify-installation-external-skills-and-tests) in the destination repository. An installed provenance registry does **not** prove an external Skill was loaded into the agent. If any check fails, fix the repository, registry or ignore rules before proceeding.

### Interactive Model Mapping Skill (recommended)

Instead of manually editing JSON, invoke the opt-in, user-controlled setup interview **after installing the Skill**:

See the [agent command table](#2-commands-inside-claude-code-and-codex) for both runtimes.

The Skill reads existing configuration and the two saved profiles, asks one consequential question at a time only where details are missing, then shows **Before → After** for every changed role and effort. It does **not** auto-write: invoking the command only begins the interview. It must ask for explicit confirmation before saving `.agent-workflow/config.json`. The file remains `setup.status = "unconfirmed"` until *actual* runtime/model support, user authorization and required external Skills have been checked. Review independence and HIGH_RISK gates are unchanged.

[Read-only profile preview and validation commands](#3-inspect-model-config-read-only):


The preview and validation commands never write config, launch models, install external Skills, or change Git state. Structural validation does **not** verify that the named models or client-specific modes are actually available.

### Choose the model and effort profile

Two included **suggested** profiles are available after installation. This only fills out candidate names and recommended effort; it does not configure credentials or launch agents.

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

To apply a preset without overwriting an existing user config, follow the [profile-selection commands](#3-inspect-model-config-read-only), or use the interactive Skill.



**Terra routing decision:** GPT-6.1 Terra (`gpt-6.1-terra`) is used selectively for **small, scoped, testable code changes** in OpenAI-led workflows and **screen-based UI / computer-use tasks** in either profile. The main Implementer remains Sol (OpenAI-led) or Claude Sonnet (Claude-led); architecture/complex implementation and independent review stay with the more capable assigned models. Luna remains assigned to fast, inexpensive triage and reporting. Escalate a Terra assignment back to the authorized Implementer when changes span services or involve unknown dependencies, security-sensitive logic or repeated failed validations—do not silently switch models. A dedicated `scoped_implement` stage and `computer_use` stage are optional suggested routes and do **not** automatically dispatch agents or override the plan. On the Claude-led preset, choosing the Codex-based `computer_use` stage is a **cross-provider handoff** and needs explicit approval and verified access; it is not the Claude code Implementer. Official model docs: [Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra), [model-selection guide](https://developers.openai.com/api/docs/guides/model-selection). Its standard API token price is lower than Sol's, but end-to-end costs and coding quality depend on the task.

All sample profiles keep `setup.status = "unconfirmed"`, empty runtime/worker registrations, `automatic_switching = false`, and a single sequential worker. The `stage_preferences` entries are recommendations, not executable dispatch rules; a stage with only `role` inherits that role's preferred candidate. Each actual runtime, model/effort control, access and required external Skill **must be verified in its executing environment** and approved before marking setup confirmed. Cross-provider handoff remains manual and independent review is a separate eligible agent/session, not just another model label.

For the Claude-led profile, `critical_review` requests **Ultra** via `requested_mode: "ultra"` and separately specifies **`effort: "max"`** as a valid API reasoning level for GPT-6.1 Sol. Ultra is **not** an OpenAI API `reasoning.effort` value: in supported Codex clients it is a distinct subagent-based mode. This is an explicit **request for runtime selection**, not an active Ultra session; it must be verified and selected by an authorized user. If Ultra is not supported by the actual client, report `SETUP_REQUIRED` and ask for an alternative rather than silently treating Max as Ultra. In particular, the preset still permits **only one sequential worker**, and never dispatches a subagent merely because `requested_mode` is present. Independent review still requires a truly separate agent/session from the work being reviewed.

Provider model identifiers and effort options should be checked against [Anthropic's models](https://platform.claude.com/docs/en/models/overview), [Anthropic effort levels](https://platform.claude.com/docs/en/build-with-claude/effort) and [OpenAI's models](https://developers.openai.com/api/docs/models). These API IDs may not be directly selectable in every Codex/Claude Code interface. Details: [routing and setup](.agents/skills/agent-workflow-orchestrator/references/setup-routing.md).

Treat `.agent-workflow/config.json` as local configuration. Keep passwords/API keys out of it, and add it to your **destination repository's** `.gitignore` alongside task state.

## Quick start: a complete documentation-only task

Ask your agent to use `agent-workflow-orchestrator`, present a locked plan before editing, record out-of-plan Findings, and report only actual acceptance evidence. The [Plan Ledger command example](#4-plan-ledger-execute-and-review-an-approved-task) shows a complete documentation-only run.

The CLI requires the **latest check for every acceptance ID** to be `pass`. Failed/blocked checks, missing evidence, pending essential Findings and incomplete steps block completion. Old free-text checks remain unverified history and cannot substitute for new acceptance-linked PASS results. An unplanned legacy HIGH_RISK handoff stays blocked until separately authorized.

### New requirement during execution?

Use the [Finding command](#4-plan-ledger-execute-and-review-an-approved-task). Nonessential discoveries are deferred. Essential additions pause the affected work until the user explicitly approves an amendment; the tool's `--approvalref` value is only an audit note, **not authenticated consent**. See [the Plan and Findings contract](.agents/skills/agent-workflow-orchestrator/references/plan-execution.md).

### High-risk change?

Authentication, payments, security, migrations, destructive or production changes require separate protected-action permission and a genuinely **independent eligible reviewer**. Use the [independent-review command](#4-plan-ledger-execute-and-review-an-approved-task) only after an actual review. A typed reviewer name does *not* prove independence. Missing or failed review blocks `HIGH_RISK` completion. See [review gates](.agents/skills/agent-workflow-orchestrator/references/review-validation.md).


## Nested Orchestration: delegate a task tree

**`$delegate-tree`** (Codex) or **`/delegate-tree`** (Claude Code) starts an opt-in hierarchical delegation workflow. The agent may also **recommend it** for an approved large task containing substantial independent components; it must show the scope/benefit and request approval before any real worker is spawned. For small or tightly coupled changes, use the ordinary single-agent path.

A nested tree can have **Root Orchestrator → Sub-Orchestrator → Worker** (depth 2). Root owns the master locked plan and integration. Sub-Orchestrators may subdivide only the bounded parent packet; children never independently add scope or lower HIGH_RISK classification. Work is partitioned by non-overlapping write paths and child budgets that sum within the parent. A single **global** concurrency budget applies to all branches.

```text
Root (Codex/Claude; Master Locked Plan)
├── Auth Sub-Orchestrator ── OTP Worker
└── Payment Sub-Orchestrator ── Payment Worker
          ↓ Child findings / validation evidence
Root Integration → Acceptance → Independent HIGH_RISK Review → Close
```

The checked-in example `.agent-workflow/examples/nested-tree.example.json` is a template; adapt `rootTaskId`, `planStepId`, and the root objective **exactly** to the next pending step in your `plan-ledger` file before using the [read-only nested delegation commands](#5-nested-delegation-task-scheduling-and-handoffs).


Add `--config .agent-workflow/config.json` to compare requested and configured depth/capacity. Both commands are **read-only** and return a proposal with `readyToDispatch:false`, `agentsLaunched:0`, and reasons to stop. They never launch subagents or grant approval. The default profile remains **one sequential worker at delegation depth 1**. Depth 2 and higher global concurrency are **opt-in**: the chosen client must actually support subagents, enforce file ownership/isolation and global caps, load required coding Skills in every worker, and receive explicit user permission. Even a `confirmed` config is not proof those conditions hold in a particular session.

Install the Claude command adapter into the destination workspace's `.claude/skills/delegate-tree/SKILL.md` (using the same optional copy process as `/oranit`) or run `oranit` for a fresh installation. `AGENTS.md` in Orasqill contains the conditional recommendation trigger for agents; it does **not** silently delegate. External runtime execution, independent eligible reviewers, test evidence, approvals for protected Git/production actions and merging remain separate human/runtime checks.

## Agent handoff and optional scheduling

- **Continue an unfinished task:** the previous writer stops; the authorized receiver uses the [manual resume command](#4-plan-ledger-execute-and-review-an-approved-task) on the **same named branch and working tree**, reads the generated `handoff.md` plus locked `plan.md`, and resumes only the next authorized step. Different machines require an explicit, sanitized transfer of local state.
- **Advisory Task Planner:** read [the separate scheduler schema](.agent-workflow/examples/task-plan.example.json). Use the [advisory task planner command](#5-nested-delegation-task-scheduling-and-handoffs). A scheduler graph has a `tasks` array with resource and dependency information; it is **not** the ledger's `plan.json`, which has `steps`. With `--locked-plan`, tasks must map to pending, approved steps **in their locked order**: later pending steps cannot bypass earlier ones, and the task graph must express that dependency. Unknown risk flags and malformed worker limits fail closed. The output suggests a sequence; it does not create workers or enforce locks.

## External Skills and update tracking

| Purpose | Upstream owner / Skill | Activation |
|---|---|---|
| Minimal, verified coding changes | [Karpathy guidelines](https://github.com/multica-ai/andrej-karpathy-skills) | **Required for coding** |
| Pre-plan clarification | [Matt Pocock: grill-with-docs](https://github.com/mattpocock/skills) (plus `grilling`, `domain-modeling`) | Conditional, before plan lock |
| Specifications, tests, diagnosis, reviews, agent documents | [Matt Pocock's Skills](https://github.com/mattpocock/skills) | Optional, task-specific |
| Focused diff review, audit and technical-debt inventory | [Dietrich Gebert: Ponytail](https://github.com/dietrichgebert/ponytail) | Optional, independently selected |

Ponytail's session-wide coding mode is **opt-in only**, not automatically combined with required Karpathy rules. External Skill instructions, licenses, install methods and upgrades remain the responsibility of their respective upstream owners.


The [external Skill commands](#6-verify-installation-external-skills-and-tests) are read-only: no installs, copying, upgrades or agent launches. The lockfile records upstream repository commits, per-Skill blob SHAs and separately pinned reference-file SHAs **for traceability**, not proof of what a particular agent actually loaded. When authoring agent Skills with Matt's original `writing-for-agents`, load its sibling `SKILL-MECHANICS.md` as well. See [dependency activation and verification](.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md).

## Troubleshooting

| Message / symptom | What to check |
|---|---|
| `SETUP_REQUIRED: dependency_unavailable` | Required external Skill cannot be loaded by the executing agent; use the upstream owner's instructions and verify again. |
| `DETACHED_HEAD` or `git rev-parse HEAD` fails | Select a named branch and create the initial commit through your normal authorized Git process. |
| `PLAN_REQUIRED`, `OUT_OF_PLAN_OR_ORDER` | Start a checkpoint and follow the next unfinished approved step. |
| `APPROVAL_REQUIRED` | Essential out-of-plan work needs the user's decision; do not infer approval from a note. |
| `VALIDATION_REQUIRED` / `BLOCKED_VALIDATION` | Record a real `pass` for each acceptance ID, and resolve any later `fail` or `blocked` check. |
| `VALIDATION_MIGRATION_REQUIRED` | Keep old text as unverified history; rerun and record structured acceptance-linked PASS checks for every A1..An. Malformed structured records require investigation. |
| `INDEPENDENT_REVIEW_REQUIRED` | Obtain a real separate eligible reviewer and verify the attestation. |
| `SCHEDULER_SCHEMA_REQUIRED` | Pass a scheduler **task graph**, not the ledger's `steps` file. |
| `NO_HANDOFF` / `AMBIGUOUS_HANDOFF` | Check branch, local ignored task state and the number of unfinished tasks. |

## Tests, limitations and sharing

Run the [test command](#6-verify-installation-external-skills-and-tests) in the **Orasqill source checkout** (a minimal consumer installation does not copy test files).


The test suite exercises Git-backed checkpoints, completion gates, external-source tracking and fresh destination installation. Tests run without model API keys. The package targets Node.js 20+ and Git; Linux/Windows automation is configured but a successful workflow is **not** asserted merely because local tests pass.

This is a **Skill + local evidence tools**, not a sandbox, a verified approval service, a reviewer-authentication system, or an agent runtime. An unrestricted agent can still edit outside the plan unless actual permissions and review prevent it.

**Repository access and license:** Orasqill is currently a **private** GitHub repository; sharing the link requires inviting collaborators. **No standalone open-source license has been selected.** Before public redistribution, the repository owner should choose a license and review security, provenance and distribution terms. External Skills are not redistributed here. For improvements, propose a focused issue/PR with actual test evidence and an explicit scope.
