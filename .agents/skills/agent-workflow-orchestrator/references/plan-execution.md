# Locked Plan and Findings Workflow

Load this reference for substantive orchestrated work in a Git-backed repository. The CLI records progress **but does not prevent a model with unrestricted filesystem access from making out-of-plan edits**. Enforce scope with real permissions, human authority, Git diff inspection and independent review where required.

## Before implementation

Show the ordered plan to the user: goal, exclusions, scope, step sequence, acceptance, specific tests, risk and any operations requiring separate consent. The task must have a named Git branch and an initial commit so HEAD can be identified. Then:

```sh
node .agent-workflow/bin/plan-ledger.mjs start task-1 --goal "Make a bounded fix" --step "Implement the authorized edit" --step "Run relevant tests" --accept "Requested behavior works" --allowed "src/"
```

The command creates an ignored checkpoint (`task.json`) and locked baseline (`plan.json`/`plan.md`) before any edits. Initial Git `HEAD` commit and named branch are required: verify `git rev-parse --verify HEAD` and `git branch --show-current` before starting. File locations are `.agent-workflow/state/task-1/`. Do not add source files or start delegated work until the checkpoint succeeds. On duplicate task IDs, missing acceptance, unconfirmed prerequisites or detached HEAD, stop and resolve setup rather than silently creating alternative state.

## Execute only the next step

```sh
node .agent-workflow/bin/plan-ledger.mjs step task-1 --step S1 --evidence "Reviewed actual diff; requested behavior implemented"
```

The CLI rejects out-of-order IDs, skips and completion while any essential out-of-plan finding awaits approval. Evidence text is user/agent-reported, not cryptographic verification. The actual diff/command outputs must be checked before recording completion.

## What to do with out-of-plan discoveries

**Record FIRST; do not silently implement.** Assess if the change is indispensable to finish the approved goal now.

```sh
node .agent-workflow/bin/plan-ledger.mjs finding task-1 --description "Unrelated footer bug" --impact "Visual" --reason "Not required for goal" --necessary no
node .agent-workflow/bin/plan-ledger.mjs finding task-1 --description "Missing API prerequisite" --impact "Blocks S2" --reason "Required to complete original goal" --necessary yes
```

- If `--necessary no`, the finding remains **deferred**. Leave the implementation untouched and include it in the Final Acceptance Report.
- If `--necessary yes`, status becomes **approval-required**. Pause the affected execution path and ask the user **which concrete expansion they approve**, why it is indispensable, impacted files/risks and expected validation. Do not implement or delegate that scope before explicit trusted approval.
- After personally verifying the actual user decision, record an amendment, placing a prerequisite *before* the pending blocked step when necessary:

```sh
node .agent-workflow/bin/plan-ledger.mjs amend task-1 --finding F2 --step "Implement approved prerequisite" --before S2 --approvalref "User approved prerequisite F2 in this chat"
```

The `--approvalref` string is **untrusted audit text only**; it does not authenticate user approval or override high-risk/protected-operation gates. The amendment keeps baseline IDs and their relative order; only approved new steps enter the plan. Rejections remain blockers until the user chooses a safe resolution. Do not treat ambiguity as approval.

## Validate, report and close

```sh
# A1 is the first --accept criterion, A2 the second, and so on.
node .agent-workflow/bin/plan-ledger.mjs check task-1 --status pass --accept A1 --result "node --test: passed 12/12"
# For another acceptance add another check --accept A2 (or repeat --accept to cover multiple).
# A fail/blocked outcome can be superseded only by a later PASS for the same acceptance ID.
# If task risk is HIGH_RISK, after independent eligible review:
node .agent-workflow/bin/plan-ledger.mjs review task-1 --reviewer "Independent Reviewer" --independent yes --result pass --evidence "Verified PR review URL and decision"
node .agent-workflow/bin/plan-ledger.mjs report task-1
node .agent-workflow/bin/plan-ledger.mjs finish task-1
```

Do not claim a command passed if it was not run. `check` now records structured status `pass|fail|blocked` and acceptance IDs; **each** `--accept` from `start` must have a latest `pass`. A `fail`, `blocked`, missing acceptance ID, or legacy free-text-only check blocks completion until replaced by real current evidence. For HIGH_RISK tasks the shared finish guard also requires a positive reviewer attestation with separate claimed identity and evidence. **Attestations are reported, not authenticated**; verify actual independence/authority outside the ledger. `finish` also checks ordered step completion and no approval-required Finding. It writes the finalized plan and Final Acceptance Report **before** closing manual handoff. Direct `manual-handoff.mjs finish` for a planned task requires those exact same gates, a finalized plan and a valid report. It cannot hide unfinished work from `resume`. Legacy unplanned handoffs remain closable.

## Final Acceptance Contract

User-facing report must cover the original authorized objective and scope, status `COMPLETE` / `PARTIAL` / `BLOCKED`, each step ID and its actual outcome, source diff/files, exact test names/results, deferred findings, pending findings needing user approval, evidence of already-approved amendments, branch/HEAD/PR or deployment state **only where verified**, remaining risks and next action. A generated `final-report.md` is a **draft based on local progress evidence**, not external approval or confirmed CI status. Historical checkpoints with string-only `checks` fail closed with `VALIDATION_MIGRATION_REQUIRED`: record new acceptance-linked checks rather than treating legacy text as successful validation.

## Manual successor

Run `node .agent-workflow/bin/manual-handoff.mjs resume` from the same Git worktree *after the previous writer is idle*; read `handoff.md` and `plan.md`. Do not regenerate a new plan as a way around unfinished steps or approvals. Out-of-repository continuation requires deliberate sanitized transfer with matching Git changes. More in `manual-handoff.md`.
