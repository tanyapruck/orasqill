# Executable Helper Catalog

All helpers use built-in Node.js modules and Git. They operate on the **current repository root** when invoked through CLI. They do not call models, switch agents, modify Git, prove user approval or grant protected permissions.

- `plan-ledger.mjs start <task-id> --goal "..." --step "..." --accept "..."` — initial locked plan and handoff checkpoint.
- `plan-ledger.mjs step <task-id> --step S1 --evidence "..."` — complete the **next** step only.
- `plan-ledger.mjs finding <task-id> --description "..." --impact "..." --reason "..." --necessary yes|no` — record out-of-plan issue first; essential => approval-required.
- `plan-ledger.mjs amend <task-id> --finding F1 --step "..." [--before S2] --approvalref "..."` — add steps after **actual user approval independently verified by the agent**. `--approvalref` alone grants no rights.
- `plan-ledger.mjs check <task-id> --status pass|fail|blocked --accept A1 [--accept A2] --result "..."` — record latest acceptance-linked validation status (A1, A2... correspond to `start --accept` order); FAIL/BLOCKED/missing acceptance prevents finish. Old string checks remain unverified history; fresh structured PASS per acceptance is required for legacy recovery.
- `plan-ledger.mjs review <task-id> --reviewer "..." --independent yes --result pass|fail --evidence "..."` — record reported independent review; required for HIGH_RISK finish. Identity/evidence still require human verification.
- `plan-ledger.mjs report <task-id>` — create a Final Acceptance draft.
- `plan-ledger.mjs finish <task-id>` — shared completion gates, finalize plan and report, then close handoff.
- `manual-handoff.mjs resume` — find unique unfinished task on current branch and refresh a handoff, no provider launch.
- `manual-handoff.mjs export|finish|checkpoint|start <task-id> ...` — legacy/manual checkpoint commands; direct finish cannot bypass a locked plan.
- `task-planner.mjs <scheduler-tasks.json> [--locked-plan <.agent-workflow/state/task-id/plan.json>]` — output an **advisory** schedule; the scheduler `tasks` graph is NOT the locked ledger’s `steps` schema. Use `--locked-plan` to reject tasks not mapped to distinct pending Plan step IDs and exact objectives, to block skipped pending steps, and to require explicit dependencies matching the locked step order. Task risk flags must be recognized; unknown flags fail closed. See `.agent-workflow/examples/task-plan.example.json`. Does not run workers or enforce ownership.

- `node .agent-workflow/bin/model-config.mjs preview claude-orchestrator|openai-orchestrator` — **read-only** inspect a proposed profile; no model launched or file written.
- `node .agent-workflow/bin/model-config.mjs validate .agent-workflow/config.json` — **read-only** structural check for a user-approved local model mapping; not proof of available models, permissions or runtime setup. The separate `$configure-models` / `/configure-models` Skill conducts an opt-in interview and requires explicit approval before writing.

- `oranit init [--workspace <dir>] [--profile blank|claude-led|openai-led] [--dry-run]` — safe workspace bootstrap: missing Skills, model routing template (unconfirmed) and generated code index. Node alternative: `node .agent-workflow/bin/oranit.mjs init`.
- `oranit status|refresh [--workspace <dir>]` — detect code/index drift and refresh generated locator, never model config.
- `oranit locate "<symbol-or-feature>" [--workspace <dir>]` — ranked path/line hints only, stale index blocks navigation; inspect live source.

- `node .agent-workflow/bin/nested-delegation.mjs plan <tree.json> --locked-plan <plan.json> [--config <config.json>]` — read-only validate Root→Child→Grandchild packets against the next locked step; no agent launch.
- `node .agent-workflow/bin/nested-delegation.mjs packet <tree.json> <node-id> --locked-plan <plan.json> [--config <config.json>]` — read-only bounded handoff packet; capability blockers remain visible.

Tests: `node --test .agent-workflow/tests/*.test.mjs`.

## Third-party skill provenance (read-only)

- `node .agent-workflow/bin/external-skills.mjs list` — list the original authors, exact source paths and activation for each external Skill from `../external-skills.lock.json`.
- `node .agent-workflow/bin/external-skills.mjs verify-file <id> <path-to-installed-SKILL.md>` — compare the installed Skill file's Git blob fingerprint to the reviewed upstream blob.
- `node .agent-workflow/bin/external-skills.mjs verify-reference <id> <upstream-path> <local-reference.md>` — independently verify tracked sibling references (for example, `writing-for-agents/SKILL-MECHANICS.md`); neither fingerprint proves an Agent loaded the material.
- `node .agent-workflow/bin/external-skills.mjs check-updates [--source matt|ponytail|karpathy]` — read-only GitHub commit/tree lookup, with per-Skill and tracked reference-file `unchanged`, `changed` or `missing_upstream`; API errors return `unknown`. No downloading, installing, vendoring, source edits or automatic lockfile bump.

External skills are third-party-owned; use `.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md` and `.agent-workflow/external-skills.lock.json` rather than inlining their instructions into the canonical Orchestrator.
