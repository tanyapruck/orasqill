# Agent Workflow Orchestrator

Portable, **provider-neutral** orchestration Skill, extracted and generalized from HoroOne's v10.17 design. This repository contains **only** the reusable Skill, opt-in discovery shims, local checkpoint/plan scripts, example routing config, tests and CI. It contains no application code, original project's model bindings, secrets or history archives.

## What it does

The active agent must **show an ordered plan before doing orchestrated work**, create a local gitignored checkpoint, execute approved steps **in order**, record out-of-plan discoveries as **Findings**, defer optional findings, request **user approval before necessary expansions**, validate the real integrated result and issue a **Final Acceptance Report**. Manual handoff lets a user select a different orchestrator without losing the original plan. No automatic provider switch or runtime/model invocation is included.

## How to install into another Git repository

Copy the following, preserving paths relative to the repository root:

- `.agents/skills/agent-workflow-orchestrator/` — canonical Skill and references.
- `.agent-workflow/bin/` — Node.js (20+) no-dependency helpers.
- `.agent-workflow/config.example.json` — optionally copy to `config.json` and confirm real runtime candidates **with the user** before allowing delegation.
- `AGENTS.md` (or merge its small entrypoint into your existing root instructions). For Claude Code also copy `.claude/skills/agent-workflow-orchestrator/SKILL.md` and add `@AGENTS.md` in root `CLAUDE.md` if no conflicting instructions exist.

The `.agent-workflow/state/` directory is ignored, **must not be committed** and stays local to the working tree. The root Skill can be read directly even in an agent that does not auto-discover skills. Do not blindly overwrite an existing destination `AGENTS.md` or `CLAUDE.md`; merge pointers deliberately.

## External skill prerequisites

- **Required for coding, including surgical bug fixes/refactors:** install and verify the exact [`karpathy-guidelines`](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/skills/karpathy-guidelines/SKILL.md) Skill in the **agent that actually writes code**. Until discoverable and loadable, coding stops with `SETUP_REQUIRED: dependency_unavailable`; the Orchestrator may still inspect, plan and report. Installation is never automatic.
- **Optional for complex planning:** Matt Pocock's [`grill-with-docs`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md) can help resolve important design decisions **before** locking a Plan. It requires `grilling` and `domain-modeling`. Don't run it for routine surgical changes, or append ADRs and glossary files without authorization.
- Other optional Matt skills (`to-spec`, `to-tickets`, `tdd`, `diagnosing-bugs`, `code-review`) have targeted use cases, not mandatory process steps.

Install instructions, provenance and worker gates: `.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md`; decision guidance: `.agents/skills/agent-workflow-orchestrator/references/planning-interview.md`. External skills are linked, **not vendored or copied**.

## Example user invocation

> Use `agent-workflow-orchestrator` for this task. Show the plan first. Execute only its authorized steps. Record new discoveries as findings, ask my approval before necessary scope changes, and report actual validation results when done.

### Start a task in a Git repository

```sh
node .agent-workflow/bin/plan-ledger.mjs start demo-1 --goal "Apply the requested change" --step "Implement only the requested change" --step "Run focused checks" --accept "Requested behavior is verified"
```

After each step use `plan-ledger.mjs step ... --evidence ...`; for new findings use `plan-ledger.mjs finding ... --necessary yes|no`; close using `check`, `report`, `finish`. See `.agents/skills/agent-workflow-orchestrator/references/plan-execution.md` for examples and the full user approval contract. The tools **record progress**; they do not independently prove that an AI stayed in scope or that a given user really approved a change. Human authority and actual Git diff inspection remain essential.

## Tests

```sh
npm test
```

Node.js >=20, Git executable available. GitHub Actions runs Node 22 and 24 on Linux and Windows. CI/test runner uses temporary Git repositories and does **not** need provider API keys or connected agent accounts.

## Licensing and provenance

Standalone adaptation of a user-owned internal workflow. It is intended as an independent project, not a live dependency of HoroOne. No automatic syncing with its original repository. No standalone license has been selected. This private repository should not be republished under an open-source license without the owner choosing one.
