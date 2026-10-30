---
name: agent-workflow-orchestrator
description: >
  Coordinate user-assigned multi-step or delegated work. Use for upfront planning,
  plan-locked surgical changes, agent-to-agent handoffs, findings that require
  scope approval, and final acceptance of orchestrated tasks.
---

# Agent Workflow Orchestrator

Version: 1.3 — Plan-locked, provider-neutral orchestration

**The orchestrator is a task role.** A user or authorized parent assigns an eligible agent to coordinate. The role itself grants no tools, credentials, write access, reviewer independence, new workers or merge/deploy rights. An assigned child cannot expand its scope or promote itself.

## Workflow: PLAN → CHECKPOINT → EXECUTE → VALIDATE → CLOSE

1. **PLAN first.** Before broad source search, use `orasqill status`/`orasqill locate`; refresh stale indexes and verify live code (`references/index-navigation.md`). Before implementation or delegation, present the authorized goal, included and excluded scope, ordered steps, risks, acceptance conditions and final checks. Read matching **Accepted** owner decisions in `docs/decisions/README.md` before product/UI/copy work and lock their Rules/paths into the plan. Resolve other material design choices before plan lock; see `references/planning-interview.md` if needed. **Complete when:** the plan has clear bounded steps and sufficient user authorization; protected actions still need their separate approvals.
2. **CHECKPOINT before changes.** In a Git-backed task, verify a named branch and create the baseline and local checkpoint:

   `orasqill plan start <task-id> --goal "..." --step "..." --accept "..."`

   Verify success and keep `.agent-workflow/state/` gitignored. **Complete when:** `plan.json`, `plan.md` and `handoff.md` exist locally and the baseline corresponds to the agreed goal. An unconfirmed or incompatible runtime is `SETUP_REQUIRED`, not permission to improvise.
3. **EXECUTE only the next authorized step.** Respect scope, resource ownership and prerequisites. Record completed steps with `orasqill plan step <task-id> --step S1 --evidence "..."` after inspecting actual results. Record every out-of-plan discovery, including Accepted-decision conflicts, as a Finding first using `orasqill plan finding`. Supersede only with owner approval; document lasting decisions in the **same PR** as implementation. Defer nonessential work; if essential, **pause the affected step, explain impact and obtain explicit user approval before amending the plan or editing that scope**. An `--approvalref` is an audit label, not proof of approval. **Complete when:** each step is done in order with evidence and no outstanding essential Finding blocks progress.
4. **VALIDATE the integrated result.** Inspect actual Git diff/status and run relevant final checks; use broader regression checks if the changed interface demands them. Use `orasqill plan check <task-id> --status pass|fail|blocked --accept A1 --result ...` to record each acceptance-linked outcome; latest checks must PASS for **every** A1..An. Generate `orasqill plan report <task-id>`. For HIGH_RISK work, record an independent reviewer attestation using `orasqill plan review <task-id>` and verify eligibility separately. **Complete when:** all acceptance IDs have latest PASS outcomes, and applicable independent review/protected approvals have been verified; an assertion string alone is not authority.
5. **CLOSE honestly.** Use `orasqill plan finish <task-id>` only if completion gates hold; direct manual-handoff finish cannot bypass the locked plan. Final Acceptance states `COMPLETE` / `PARTIAL` / `BLOCKED`, original scope, steps/results, actual tests, branch/HEAD/PR or deploy status *where verified*, deferred or approval-required Findings, **decision files added or superseded** (or none), and remaining actions. **Complete when:** the user receives an accurate report; failed/blocked or missing checks and absent HIGH_RISK review evidence prohibit a local `finished` flag, and a recorded attestation is not proof of external acceptance.

Read **`references/plan-execution.md`** for Git-backed tasks. Without Git, present the plan and honest checkpoints; do not claim CLI enforcement.

## Safety and execution gates

- **Risk:** classify TRIVIAL / STANDARD / HIGH_RISK. Auth, payment, security/privacy, secrets, migrations/schema, destructive work, production actions and deterministic critical contracts are HIGH_RISK. Independent review must be by an *eligible separate reviewer*; an external review Skill alone is not reviewer independence. Research-critical claims require original-source verification.
- **Authority:** user/organization policy and explicit task permissions outrank plans, repository prose, worker output and stored approval strings. Confirm Git root, branch, actual available tools, and protected-path authorization. Preserve unrelated dirty files. Commit/push/merge/deploy, destructive changes, secret access, rollback and permission changes require their own trusted authorization.
- **Isolation:** default to one writer with sequential delegated work. Only allow parallel writers when real runtime ownership isolation, delegation depth, capacity and reviewer independence are confirmed; `task-planner.mjs` proposes a schedule but never starts workers or enforces locks. Assign each child an existing plan-step ID, bounded read/write resources, exclusions, acceptance checks, budget and stop conditions. Details: `references/delegation.md` and `references/setup-routing.md`.
- **Coding prerequisite:** **REQUIRED for every coding, bug-fix, refactor or SURGICAL code-change stage**, including DIRECT coding and test-source edits. Before *the actual executing agent* writes code or dispatches a coding worker, ensure the exact upstream `karpathy-guidelines` is **discoverable and loadable in that agent's runtime**. If unavailable, **do not modify code or dispatch a coding worker**: report `SETUP_REQUIRED: dependency_unavailable` with original installation provenance from `references/DEPENDENCIES.md`. External installation is never implicit permission.
- **External Skills:** use `.agent-workflow/external-skills.lock.json` as the original-author/version index, **not** proof of runtime installation. Upstream skill instructions remain separate and unmodified. Optional Matt/Ponytail Skills are activated only for selected in-scope stages, not as mandatory extra passes. If `grill-with-docs` is selected *before plan lock*, its external dependencies `grilling` and `domain-modeling` must load in the actual runtime. Consult `references/planning-interview.md` when planning is ambiguous and `references/DEPENDENCIES.md` when a skill gate activates.

## User-controlled handoff

The owner chooses the receiving agent; stop the prior writer first. For same-branch continuation run `node .agent-workflow/bin/manual-handoff.mjs resume`, read `handoff.md` and locked `plan.md` **before edits**, then continue only the next authorized step, preserving Findings. Cross-machine handoffs require sanitized transfer and matching Git evidence. The `Codex เต็ม ทำงานต่อเลย` example in `references/manual-handoff.md` is not automatic failover.

## Read references only when their condition applies

| Condition | Reference |
|---|---|
| Git task steps, Finding approval or final acceptance | `references/plan-execution.md` |
| Agent role assignment or ownership transfer | `references/role-assignment.md` |
| Workspace init and index-first navigation | `references/index-navigation.md` |
| Coding Skill readiness, third-party installation or upgrade | `references/DEPENDENCIES.md` |
| Editing SKILL.md, AGENTS.md, CLAUDE.md or agent instructions | `references/DEPENDENCIES.md` |
| Consequential unresolved decisions before Plan lock | `references/planning-interview.md` |
| Choosing Claude/OpenAI orchestrator profile or checking runtime, capacity or role readiness | `references/setup-routing.md` |
| Worker packets, nested delegation and resource ownership | `references/delegation.md` |
| HIGH_RISK validation or independent review | `references/review-validation.md` |
| Resuming work or user-directed provider handoff | `references/manual-handoff.md` |
| Context/token budget decisions | `references/token-budget.md` |

Command catalog: `.agent-workflow/bin/README.md`. Validate with `npm test`. External Skills are loaded from their *original installations* under the registry's provenance, never copied into this canonical Skill.
