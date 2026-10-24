# Agent Workflow Orchestrator (Orasqill)

Portable, provider-neutral plan-locked orchestration with scoped delegation, Findings/approval, handoff and Final Acceptance. Includes local Node.js helpers but no agent runtimes or vendor Skill implementations.

## Install into an existing Git repository

Copy **all three required paths**, preserving their paths relative to the destination repository root (POSIX shell or Git Bash):

```sh
# Run in the destination Git repository; replace /path/to/orasqill.
mkdir -p .agents/skills .agent-workflow
cp -R /path/to/orasqill/.agents/skills/agent-workflow-orchestrator .agents/skills/
cp -R /path/to/orasqill/.agent-workflow/bin .agent-workflow/
cp /path/to/orasqill/.agent-workflow/external-skills.lock.json .agent-workflow/
```

On Windows PowerShell, use equivalent `New-Item` / `Copy-Item` commands. The **external-skills.lock.json registry is required** for `external-skills.mjs list`, source verification and update checks; copying only the Skill and binaries is an incomplete installation. The registry records reviewed upstream versions, **not installed provider Skills**.

Merge the short root `AGENTS.md` instructions into the destination's existing guidance instead of overwriting it. For Claude Code, copy `.claude/skills/agent-workflow-orchestrator/SKILL.md` and add `@AGENTS.md` in `CLAUDE.md` if appropriate for that project. For optional routed delegation, copy `.agent-workflow/config.example.json` as `config.json` and arrange **explicit confirmation** of real providers, permissions and capacity. If using the advisory Task Planner, also copy `.agent-workflow/examples/task-plan.example.json` as a scheduler-schema reference (not as an authorized locked Plan). Its empty mapping alone cannot authorize worker execution.

**Protect checkpoints in the destination repo:** add the following exact line to its `.gitignore` (merge it; do not replace other rules):

```gitignore
.agent-workflow/state/
```

State files can contain local task context, Findings and paths. Keep secrets out of them. They are not committed and **do not transfer automatically** between machines.

### Installation smoke checks and Git preflight

Run from the destination Git repository after copying files and updating `.gitignore`. Before starting a locked plan, **an initial Git commit and named branch** (not detached HEAD) are required:

```sh
git rev-parse --verify HEAD
git branch --show-current
```

A new `git init` checkout has no HEAD commit. Create one using your normal authorized Git process before `plan-ledger.mjs start`; the helper never commits automatically. Verify installation:

```sh
node .agent-workflow/bin/external-skills.mjs list
# Must succeed and list the pinned upstream owners and Skill IDs.
git check-ignore .agent-workflow/state/install-check/plan.json
# Must exit 0 and print the ignored state path, even if the file does not exist.
```

If a preflight or install command fails, fix the missing HEAD/branch, registry or ignore rule **before** creating an orchestrated checkpoint. These checks do not prove external Skills are loadable. The `npm test` suite also tests plan startup in a newly initialized test repository after a baseline commit.

## Use

Assign an authorized agent to orchestrate a task and ask it to **show a bounded Plan before editing**, execute planned steps in order, record outside discoveries as Findings, obtain explicit user approval for indispensable plan amendments, and report actual checks and Git status when done.

```sh
node .agent-workflow/bin/plan-ledger.mjs start task-1 --goal "Bounded change" --step "Implement approved scope" --step "Run relevant checks" --accept "Requested behavior verified"
```

For structured pass/fail checks, acceptance IDs (A1, A2, …), and high-risk reviewer evidence, read `.agents/skills/agent-workflow-orchestrator/references/plan-execution.md` or `.agent-workflow/bin/README.md`. Checkpoints are evidence, not technical enforcement against an unrestricted agent's file edits; actual permissions and diff review remain essential.

## External skill prerequisites and provenance

The actual coding agent must have the upstream `karpathy-guidelines` Skill loadable before DIRECT/SURGICAL code edits, refactors, tests or bug fixes. `grill-with-docs` and other Matt Pocock Skills, and Ponytail audit/review tools, are optional, independently owned integrations. **Third-party instructions are not vendored or copied** into Orasqill. Installation requires applicable authorization and each selected executing agent's readiness must be verified.

For original authors/paths, reviewed commit and blob fingerprints, install/readiness rules, and upgrade policy see `.agent-workflow/external-skills.lock.json` and `.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md`.

```sh
node .agent-workflow/bin/external-skills.mjs list
node .agent-workflow/bin/external-skills.mjs check-updates
node .agent-workflow/bin/external-skills.mjs verify-file karpathy-guidelines /path/to/installed/SKILL.md
```

These helpers **read only**; they never install, execute or update external Skills. Optional stage selection: `references/planning-interview.md` under the canonical Skill. No third-party Skill can widen the approved Plan or grant merge/deploy permissions.

## Testing and supported environment

```sh
npm test
```

Node.js 20+ and Git are required. Tests create temporary local Git repositories and run without provider API keys. GitHub Actions is configured for Linux and Windows with Node 22/24; check actual job results instead of assuming CI passed.

## Ownership and licensing

Adapted as a standalone, private skill from an internal orchestration workflow. No Open Source license has been selected for this repository. It does not auto-sync to the originating application. Each external Skill remains owned, licensed and updated in its own upstream repository; reviewing an upstream update is separate from installing it.
