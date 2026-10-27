---
name: delegate-tree
description: >
  Recommend bounded nested orchestration for a user-requested complex task with
  independent workstreams, or run a user-invoked $delegate-tree request.
  Prepare plan-locked Root -> Sub-Orchestrator -> Worker packets; never self-authorize workers.
---

# Delegate Tree — Nested Orchestration

A child agent may become an **Orchestrator of its own delegated packet**, up to the
user-authorized depth. This is a capability and planning workflow, not a new source
of authority. Suggest it when there are **multiple substantial subtasks**, natural
non-overlapping file ownership, expensive work worth delegation, and a runtime
that can actually spawn bounded subagents. Do not recommend it for tiny changes,
one-file fixes, tightly shared state, or a runtime without delegation support.

## User invocation or agent suggestion

- Direct: `$delegate-tree` (Codex) / `/delegate-tree` (Claude Code).
- Agent suggestion: explain in one sentence why a tree would help (scope, complexity,
  independent owners, available tools). Present the proposed structure and ask
  for user authorization before **creating child tasks or using provider tools**.
  Suggesting is not approval. A typed `approved` field in a file is not proof.
- User may choose direct/surgical work instead. Keep ordinary sequential workflow
  as default.

## Procedure

1. **Read the root locked plan** from `.agent-workflow/state/<task-id>/plan.json`,
   and inspect the fresh `oranit` code index then real relevant source. No valid
   locked plan? Form and obtain agreement on that plan **before delegation**.
2. Identify one **next pending root step**. Describe child orchestrators and workers
   in `nested-tree.json` using `.agent-workflow/examples/nested-tree.example.json`.
   Root objective **exactly matches** the locked step text. Each node specifies
   ID, parentId, kind, objective, risk, read/write scope, budget, and verifiable acceptance.
   Each child inherits a **subset** of its parent's scope; sum of sibling budgets is
   bounded by the parent's budget. Nodes must have no overlapping sibling write ownership.
3. Show the tree and run:
   `node .agent-workflow/bin/nested-delegation.mjs plan nested-tree.json --locked-plan .agent-workflow/state/<task-id>/plan.json`.
   A specific child packet is obtained read-only via:
   `node .agent-workflow/bin/nested-delegation.mjs packet nested-tree.json <node-id> --locked-plan .agent-workflow/state/<task-id>/plan.json`.
   Pass `--config .agent-workflow/config.json` to preview actual local *candidate* limits.
4. Treat any output `DEPTH_APPROVAL_REQUIRED`, `CAPACITY_APPROVAL_REQUIRED`,
   `SETUP_REQUIRED`, or `RUNTIME_VERIFICATION_REQUIRED` as a **real stop for
   dispatch**. Verify permitted depth (Root→Child→Grandchild = 2), global
   concurrency across **all** branches (not per-parent), runtime's actual
   subagent interface and quota, owner isolation, independent review eligibility,
   and the external `karpathy-guidelines` Skill **in each coding worker's session**.
   Only an eligible authorized runtime can invoke real subagents after explicit
   user approval. The CLI never enables concurrency, launches workers, or changes config.
5. Each child orchestrator creates its *own internal child plan* contained in its
   assigned packet. It may delegate further only while depth/budget/scope remain.
   It cannot amend the root plan or authorize production, Git merge/push,
   migrations or other protected actions. Unplanned work becomes a Finding sent to
   the parent. No child is its own independent reviewer.
6. Collect each child's changed paths, checked acceptance, current branch/HEAD,
   diff and unresolved findings; run **one integrated validation pass** at the root,
   then a truly independent HIGH_RISK review. Parent marks its plan step complete
   only after evidence from all children. Root integration owner alone closes the
   original locked plan. If execution is unavailable, give a **PLAN_ONLY** result
   rather than pretending any subagent ran.

This is not a fallback/silent provider switch. Keep the original writer's
ownership and preserve unknown dirty files. Respect `references/delegation.md`
and `references/role-assignment.md` of the canonical Orchestrator Skill.

**Done:** the user has a validated bounded tree proposal, and any live execution
uses a separately verified runtime, explicit user authorization and truthful
integrated evidence — never just a plausible model or a JSON packet.
