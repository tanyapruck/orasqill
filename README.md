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

## Oranit: initialize a workspace with one command

**`oranit` (without subcommands) now sets up both the codebase locator and the model-configuration starting point.** The index helps an AI jump to likely relevant files/symbols before reading actual source; it doesn't replace source inspection or tests. The new model config is intentionally **unconfirmed**, not an active model routing session.

From a local checkout of this (currently private) repository, you can install the command on your PATH using Node.js 20+:

```sh
git clone https://github.com/tanyapruckp-pan/orasqill.git /path/to/orasqill
cd /path/to/orasqill
npm link
cd /path/to/your-workspace
oranit
# Optional: oranit --profile claude-led
# Or use --profile openai-led; no profile creates a neutral, unconfirmed config
```

If you don't want a globally linked command, you can use the same CLI **directly from its source**:

```sh
node /path/to/orasqill/.agent-workflow/bin/oranit.mjs --workspace /path/to/your-workspace
```

On a fresh workspace, it installs the packaged portable Orchestrator, `oranit` and `configure-models` Skills (plus Claude Slash adapters), supporting CLI files, two profiles, the registry, an initial `AGENTS.md` if absent, and appropriate ignore rules. It creates:

- `.agent-workflow/index/codebase-map.json` — generated index of nonsecret code paths, symbols and hashes, ignored by Git.
- `.agent-workflow/config.json` — neutral or explicitly selected model candidate mapping, always `unconfirmed` and ignored by Git.

**Existing Skill files, model config and agent instructions are preserved.** The command only appends missing local ignore rules to an existing `.gitignore`. If `AGENTS.md` already exists, add the index-first instruction there yourself (or use the canonical Orchestrator Skill); it will not be silently replaced. Choosing a model profile doesn't launch models, confirm runtime credentials or grant delegation rights. For a preview with **no writes**, run `oranit --dry-run --workspace .`.

### Index-first workflow

```sh
oranit status                               # detect code drift
oranit locate "verifyOTP"                   # ranked file paths and symbol/line hints
# Read the actual target files, imports, callers and tests before editing.
oranit refresh                              # update index after changed source files
```

If an index is missing, run `oranit`; if stale, `oranit locate` blocks until `oranit refresh`. On partial/oversized/excluded coverage or zero matches, use a scoped code search rather than claiming the index is exhaustive. Hashes detect source changes, but the index is **not a compiler/semantic dependency graph**.

Use **`/oranit`** in Claude Code or **`$oranit`** in Codex to launch the workspace initialization Skill. After bootstrap, use **`/configure-models`** or **`$configure-models`** to review and separately approve adjustments to model roles/efforts. Skill invocation and CLI initialization never count as model-runtime approval.

## Install in another Git repository

Clone Orasqill somewhere you can access, then copy its reusable files into your project. **The destination is your project; do not overwrite existing agent instructions.**

### macOS, Linux or Git Bash

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

### Windows PowerShell

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

**Connect your agent.** Add a short pointer to your existing `AGENTS.md` (or create it if absent):

```md
For multi-step, delegated or agent-handoff tasks, read
`.agents/skills/agent-workflow-orchestrator/SKILL.md` before editing.
```

For Claude Code, optionally copy [its discovery adapter](.claude/skills/agent-workflow-orchestrator/SKILL.md) to the equivalent destination path, **and copy [the model mapping Slash Skill](.claude/skills/configure-models/SKILL.md) to `.claude/skills/configure-models/SKILL.md`** if you want the `/configure-models` command. On macOS/Linux: `mkdir -p .claude/skills && cp -R /path/to/orasqill/.claude/skills/configure-models .claude/skills/`. On PowerShell: `New-Item -ItemType Directory -Force '.claude\skills' | Out-Null; Copy-Item -Recurse (Join-Path $src '.claude\skills\configure-models') '.claude\skills\'`. The canonical `.agents/skills/configure-models/` is also used by Codex as `$configure-models`. For Claude's `/oranit`, additionally copy `.claude/skills/oranit/` to the destination `.claude/skills/` (or use the automatic `oranit` bootstrap); the portable `.agents/skills/oranit/` supports `$oranit` in Codex. If your Claude setup supports `@AGENTS.md` in `CLAUDE.md`, use it only after checking for existing instructions. For Codex or any other agent, explicitly request that it load the canonical Skill if automatic discovery is unavailable. **Installing Orasqill does not install its external prerequisite Skills.**

**Keep task checkpoints private.** Merge this line into the destination project's `.gitignore`:

```gitignore
.agent-workflow/state/
.agent-workflow/config.json
.agent-workflow/index/
```

State can contain goals, paths, findings and user-reported approval notes. Never put secrets in it. Gitignored state does not follow a Git push to another computer.

### Verify the installation

Run in the **destination** repository:

```sh
git rev-parse --verify HEAD                      # an initial commit exists
git branch --show-current                       # a nonempty named branch
node .agent-workflow/bin/external-skills.mjs list
# external-skills.lock.json registry is required for this command.
git check-ignore .agent-workflow/state/install-check/plan.json
# must exit 0: the future local plan file is ignored
```

If these fail, fix the repository setup, copied registry, or ignore rule first. The registry check **does not** establish that an external Skill was loaded into an agent. For optional delegation config, copy the installed `.agent-workflow/config.example.json` to `.agent-workflow/config.json` and confirm real agent capabilities and authority; an example config does not enable workers.

### Interactive Model Mapping Skill (recommended)

Instead of manually editing JSON, invoke the opt-in, user-controlled setup interview **after installing the Skill**:

- **Claude Code:** `/configure-models` or `/configure-models claude-led`
- **Codex:** `$configure-models` and optionally say `use Claude-led`, `OpenAI-led` or `custom`

The Skill reads existing configuration and the two saved profiles, asks one consequential question at a time only where details are missing, then shows **Before → After** for every changed role and effort. It does **not** auto-write: invoking the command only begins the interview. It must ask for explicit confirmation before saving `.agent-workflow/config.json`. The file remains `setup.status = "unconfirmed"` until *actual* runtime/model support, user authorization and required external Skills have been checked. Review independence and HIGH_RISK gates are unchanged.

Read-only preview / validation helpers:

```sh
node .agent-workflow/bin/model-config.mjs preview claude-orchestrator
node .agent-workflow/bin/model-config.mjs preview openai-orchestrator
node .agent-workflow/bin/model-config.mjs validate .agent-workflow/config.json
```

These commands never write config, launch models, install external Skills, or change Git state. Structural validation does **not** verify that the named models or client-specific modes are actually available.

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

Select **one** in the destination repo, **only if there is no existing local config you need to preserve**:

```sh
# macOS/Linux/Git Bash (choose ONE)
cp .agent-workflow/profiles/claude-orchestrator.json .agent-workflow/config.json
# OR
cp .agent-workflow/profiles/openai-orchestrator.json .agent-workflow/config.json
```

```powershell
# Windows PowerShell (choose ONE)
Copy-Item '.agent-workflow/profiles/claude-orchestrator.json' '.agent-workflow/config.json'
# OR
Copy-Item '.agent-workflow/profiles/openai-orchestrator.json' '.agent-workflow/config.json'
```

**Terra routing decision:** GPT-6.1 Terra (`gpt-6.1-terra`) is used selectively for **small, scoped, testable code changes** in OpenAI-led workflows and **screen-based UI / computer-use tasks** in either profile. The main Implementer remains Sol (OpenAI-led) or Claude Sonnet (Claude-led); architecture/complex implementation and independent review stay with the more capable assigned models. Luna remains assigned to fast, inexpensive triage and reporting. Escalate a Terra assignment back to the authorized Implementer when changes span services or involve unknown dependencies, security-sensitive logic or repeated failed validations—do not silently switch models. A dedicated `scoped_implement` stage and `computer_use` stage are optional suggested routes and do **not** automatically dispatch agents or override the plan. On the Claude-led preset, choosing the Codex-based `computer_use` stage is a **cross-provider handoff** and needs explicit approval and verified access; it is not the Claude code Implementer. Official model docs: [Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra), [model-selection guide](https://developers.openai.com/api/docs/guides/model-selection). Its standard API token price is lower than Sol's, but end-to-end costs and coding quality depend on the task.

All sample profiles keep `setup.status = "unconfirmed"`, empty runtime/worker registrations, `automatic_switching = false`, and a single sequential worker. The `stage_preferences` entries are recommendations, not executable dispatch rules; a stage with only `role` inherits that role's preferred candidate. Each actual runtime, model/effort control, access and required external Skill **must be verified in its executing environment** and approved before marking setup confirmed. Cross-provider handoff remains manual and independent review is a separate eligible agent/session, not just another model label.

For the Claude-led profile, `critical_review` requests **Ultra** via `requested_mode: "ultra"` and separately specifies **`effort: "max"`** as a valid API reasoning level for GPT-6.1 Sol. Ultra is **not** an OpenAI API `reasoning.effort` value: in supported Codex clients it is a distinct subagent-based mode. This is an explicit **request for runtime selection**, not an active Ultra session; it must be verified and selected by an authorized user. If Ultra is not supported by the actual client, report `SETUP_REQUIRED` and ask for an alternative rather than silently treating Max as Ultra. In particular, the preset still permits **only one sequential worker**, and never dispatches a subagent merely because `requested_mode` is present. Independent review still requires a truly separate agent/session from the work being reviewed.

Provider model identifiers and effort options should be checked against [Anthropic's models](https://platform.claude.com/docs/en/models/overview), [Anthropic effort levels](https://platform.claude.com/docs/en/build-with-claude/effort) and [OpenAI's models](https://developers.openai.com/api/docs/models). These API IDs may not be directly selectable in every Codex/Claude Code interface. Details: [routing and setup](.agents/skills/agent-workflow-orchestrator/references/setup-routing.md).

Treat `.agent-workflow/config.json` as local configuration. Keep passwords/API keys out of it, and add it to your **destination repository's** `.gitignore` alongside task state.

## Quick start: a complete documentation-only task

Ask your agent:

> Use `agent-workflow-orchestrator`. Show an ordered plan before editing, follow the locked steps only, log anything outside the plan as a Finding, ask before necessary changes, and report the actual checks and Git state.

Once the agreed plan is shown, start a checkpoint. This example assumes permission to edit project documentation; **perform each step before recording it as done**:

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

The CLI requires the **latest check for every acceptance ID** to be `pass`. `fail` or `blocked` results, missing checks, pending essential Findings or incomplete planned steps prevent a successful finish. These results are *recorded claims*, not independently verified test executions. **Legacy checkpoints:** old free-text validation is retained as unverified history and never qualifies as PASS; add fresh structured PASS results for every acceptance ID to finish the original locked task. A legacy HIGH_RISK handoff without a plan stays blocked and requires a separately authorized new locked task, preserving the old checkpoint.

### New requirement during execution?

Use `plan-ledger.mjs finding <task-id> --description "..." --impact "..." --reason "..." --necessary yes|no`. Nonessential discoveries are deferred. Essential additions pause the affected work until the user explicitly approves an amendment; the tool's `--approvalref` value is only an audit note, **not authenticated consent**. See [the Plan and Findings contract](.agents/skills/agent-workflow-orchestrator/references/plan-execution.md).

### High-risk change?

Authentication, payments, security, migrations, destructive or production changes require separate protected-action permission and a genuinely **independent eligible reviewer**. After an actual review, its result can be recorded with `plan-ledger.mjs review <task-id> --reviewer "<actual-reviewer>" --independent yes --result pass --evidence "<verifiable-reference>"`. A typed reviewer name does *not* prove independence. Missing or failed review blocks `HIGH_RISK` completion. See [review gates](.agents/skills/agent-workflow-orchestrator/references/review-validation.md).

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

The checked-in example `.agent-workflow/examples/nested-tree.example.json` is a template; adapt `rootTaskId`, `planStepId`, and the root objective **exactly** to the next pending step in your `plan-ledger` file before running:

```sh
node .agent-workflow/bin/nested-delegation.mjs plan nested-tree.json --locked-plan .agent-workflow/state/<task-id>/plan.json
node .agent-workflow/bin/nested-delegation.mjs packet nested-tree.json otp --locked-plan .agent-workflow/state/<task-id>/plan.json
```

Add `--config .agent-workflow/config.json` to compare requested and configured depth/capacity. Both commands are **read-only** and return a proposal with `readyToDispatch:false`, `agentsLaunched:0`, and reasons to stop. They never launch subagents or grant approval. The default profile remains **one sequential worker at delegation depth 1**. Depth 2 and higher global concurrency are **opt-in**: the chosen client must actually support subagents, enforce file ownership/isolation and global caps, load required coding Skills in every worker, and receive explicit user permission. Even a `confirmed` config is not proof those conditions hold in a particular session.

Install the Claude command adapter into the destination workspace's `.claude/skills/delegate-tree/SKILL.md` (using the same optional copy process as `/oranit`) or run `oranit` for a fresh installation. `AGENTS.md` in Orasqill contains the conditional recommendation trigger for agents; it does **not** silently delegate. External runtime execution, independent eligible reviewers, test evidence, approvals for protected Git/production actions and merging remain separate human/runtime checks.

## Agent handoff and optional scheduling

- **Continue an unfinished task:** the previous writer stops; the authorized receiver runs `node .agent-workflow/bin/manual-handoff.mjs resume` on the **same named branch and working tree**, reads the generated `handoff.md` plus locked `plan.md`, and resumes only the next authorized step. Different machines require an explicit, sanitized transfer of local state.
- **Advisory Task Planner:** read [the separate scheduler schema](.agent-workflow/examples/task-plan.example.json). Run `node .agent-workflow/bin/task-planner.mjs <scheduler-tasks.json> [--locked-plan <plan-ledger-plan.json>]`. A scheduler graph has a `tasks` array with resource and dependency information; it is **not** the ledger's `plan.json`, which has `steps`. With `--locked-plan`, tasks must map to pending, approved steps **in their locked order**: later pending steps cannot bypass earlier ones, and the task graph must express that dependency. Unknown risk flags and malformed worker limits fail closed. The output suggests a sequence; it does not create workers or enforce locks.

## External Skills and update tracking

| Purpose | Upstream owner / Skill | Activation |
|---|---|---|
| Minimal, verified coding changes | [Karpathy guidelines](https://github.com/multica-ai/andrej-karpathy-skills) | **Required for coding** |
| Pre-plan clarification | [Matt Pocock: grill-with-docs](https://github.com/mattpocock/skills) (plus `grilling`, `domain-modeling`) | Conditional, before plan lock |
| Specifications, tests, diagnosis, reviews, agent documents | [Matt Pocock's Skills](https://github.com/mattpocock/skills) | Optional, task-specific |
| Focused diff review, audit and technical-debt inventory | [Dietrich Gebert: Ponytail](https://github.com/dietrichgebert/ponytail) | Optional, independently selected |

Ponytail's session-wide coding mode is **opt-in only**, not automatically combined with required Karpathy rules. External Skill instructions, licenses, install methods and upgrades remain the responsibility of their respective upstream owners.

```sh
node .agent-workflow/bin/external-skills.mjs list
node .agent-workflow/bin/external-skills.mjs check-updates --source matt
node .agent-workflow/bin/external-skills.mjs verify-file karpathy-guidelines /path/to/original/SKILL.md
node .agent-workflow/bin/external-skills.mjs verify-reference writing-for-agents skills/productivity/writing-for-agents/SKILL-MECHANICS.md /path/to/original/SKILL-MECHANICS.md
```

The commands above are read-only: no installs, copying, upgrades or agent launches. The lockfile records upstream repository commits, per-Skill blob SHAs and separately pinned reference-file SHAs **for traceability**, not proof of what a particular agent actually loaded. When authoring agent Skills with Matt's original `writing-for-agents`, load its sibling `SKILL-MECHANICS.md` as well. See [dependency activation and verification](.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md).

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

In the **Orasqill source checkout** (the minimal consumer installation intentionally does not copy test files):

```sh
npm test
```

The test suite exercises Git-backed checkpoints, completion gates, external-source tracking and fresh destination installation. Tests run without model API keys. The package targets Node.js 20+ and Git; Linux/Windows automation is configured but a successful workflow is **not** asserted merely because local tests pass.

This is a **Skill + local evidence tools**, not a sandbox, a verified approval service, a reviewer-authentication system, or an agent runtime. An unrestricted agent can still edit outside the plan unless actual permissions and review prevent it.

**Repository access and license:** Orasqill is currently a **private** GitHub repository; sharing the link requires inviting collaborators. **No standalone open-source license has been selected.** Before public redistribution, the repository owner should choose a license and review security, provenance and distribution terms. External Skills are not redistributed here. For improvements, propose a focused issue/PR with actual test evidence and an explicit scope.
