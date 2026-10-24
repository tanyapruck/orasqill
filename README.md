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

## Install in another Git repository

Clone Orasqill somewhere you can access, then copy its reusable files into your project. **The destination is your project; do not overwrite existing agent instructions.**

### macOS, Linux or Git Bash

```sh
git clone https://github.com/tanyapruckp-pan/orasqill.git /path/to/orasqill
cd /path/to/your-project
mkdir -p .agents/skills .agent-workflow
cp -R /path/to/orasqill/.agents/skills/agent-workflow-orchestrator .agents/skills/
cp -R /path/to/orasqill/.agent-workflow/bin .agent-workflow/
cp /path/to/orasqill/.agent-workflow/external-skills.lock.json .agent-workflow/
cp /path/to/orasqill/.agent-workflow/config.example.json .agent-workflow/
```

### Windows PowerShell

```powershell
$src = 'C:\path\to\orasqill'
New-Item -ItemType Directory -Force '.agents\skills', '.agent-workflow' | Out-Null
Copy-Item -Recurse (Join-Path $src '.agents\skills\agent-workflow-orchestrator') '.agents\skills\'
Copy-Item -Recurse (Join-Path $src '.agent-workflow\bin') '.agent-workflow\'
Copy-Item (Join-Path $src '.agent-workflow\external-skills.lock.json') '.agent-workflow\'
Copy-Item (Join-Path $src '.agent-workflow\config.example.json') '.agent-workflow\'
```

**Connect your agent.** Add a short pointer to your existing `AGENTS.md` (or create it if absent):

```md
For multi-step, delegated or agent-handoff tasks, read
`.agents/skills/agent-workflow-orchestrator/SKILL.md` before editing.
```

For Claude Code, optionally copy [its discovery adapter](.claude/skills/agent-workflow-orchestrator/SKILL.md) to the equivalent destination path. If your Claude setup supports `@AGENTS.md` in `CLAUDE.md`, use it only after checking for existing instructions. For Codex or any other agent, explicitly request that it load the canonical Skill if automatic discovery is unavailable. **Installing Orasqill does not install its external prerequisite Skills.**

**Keep task checkpoints private.** Merge this line into the destination project's `.gitignore`:

```gitignore
.agent-workflow/state/
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
