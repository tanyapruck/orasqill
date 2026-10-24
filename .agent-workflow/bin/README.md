# Executable Helper Catalog

All helpers use built-in Node.js modules and Git. They operate on the **current repository root** when invoked through CLI. They do not call models, switch agents, modify Git, prove user approval or grant protected permissions.

- `plan-ledger.mjs start <task-id> --goal "..." --step "..." --accept "..."` — initial locked plan and handoff checkpoint.
- `plan-ledger.mjs step <task-id> --step S1 --evidence "..."` — complete the **next** step only.
- `plan-ledger.mjs finding <task-id> --description "..." --impact "..." --reason "..." --necessary yes|no` — record out-of-plan issue first; essential => approval-required.
- `plan-ledger.mjs amend <task-id> --finding F1 --step "..." [--before S2] --approvalref "..."` — add steps after **actual user approval independently verified by the agent**. `--approvalref` alone grants no rights.
- `plan-ledger.mjs check <task-id> --result "..."` — record actual checks as untrusted evidence.
- `plan-ledger.mjs report <task-id>` — create a Final Acceptance draft.
- `plan-ledger.mjs finish <task-id>` — shared completion gates, finalize plan and report, then close handoff.
- `manual-handoff.mjs resume` — find unique unfinished task on current branch and refresh a handoff, no provider launch.
- `manual-handoff.mjs export|finish|checkpoint|start <task-id> ...` — legacy/manual checkpoint commands; direct finish cannot bypass a locked plan.
- `task-planner.mjs <plan.json>` — output an **advisory** proposed schedule only; does not run workers or enforce ownership.

Tests: `node --test .agent-workflow/tests/*.test.mjs`.

## Third-party skill provenance (read-only)

- `node .agent-workflow/bin/external-skills.mjs list` — list the original authors, exact source paths and activation for each external Skill from `../external-skills.lock.json`.
- `node .agent-workflow/bin/external-skills.mjs verify-file <id> <path-to-installed-SKILL.md>` — compare the installed file's Git blob fingerprint to the last-reviewed upstream blob; **not** proof an Agent loaded it.
- `node .agent-workflow/bin/external-skills.mjs check-updates [--source matt|ponytail|karpathy]` — read-only GitHub commit/tree lookup, with per-Skill `unchanged`, `changed` or `missing_upstream`; API errors return `unknown`. No downloading, installing, vendoring, source edits or automatic lockfile bump.

External skills are third-party-owned; use `.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md` and `.agent-workflow/external-skills.lock.json` rather than inlining their instructions into the canonical Orchestrator.
