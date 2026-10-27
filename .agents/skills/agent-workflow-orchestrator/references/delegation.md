# Bounded Delegation and Advisory Scheduling

Select DIRECT for an authorized tiny change, SURGICAL for one scoped fix, and ADAPTIVE_PARALLEL only for substantial *independent* steps when a trusted runtime actually supports ownership locks, worker execution, budgets and isolation. The confirmed portable default is sequential. **Never delegate work outside the locked plan.**

## Nested Orchestration (Root → Child Orchestrator → Worker)

For a **large task with multiple independent workstreams**, the agent may *recommend* `$delegate-tree` (Codex) or `/delegate-tree` (Claude Code) rather than unilaterally spawning a team. Use the separate Skill `.agents/skills/delegate-tree/SKILL.md` with the bounded JSON format `.agent-workflow/examples/nested-tree.example.json`. For the one next pending locked step, ensure the tree root's objective is an **exact match** to that step; each child has smaller read/write scope and a budget; sibling write resources cannot overlap (case-insensitive on Windows). Non-orchestrator workers cannot create grandchildren. Depth 2 = Root→Child Orchestrator→Worker. Count any concurrent worker globally across the whole tree, never per sub-orchestrator. Each child reports validation and Findings to its parent; only Root integrates, approves new scope and completes final gates.

To preview, run `orasqill delegate plan nested-tree.json --locked-plan .agent-workflow/state/<task-id>/plan.json [--config .agent-workflow/config.json]`; to view one child packet, use `packet nested-tree.json <node-id> --locked-plan ...`. These operations are read-only, return `NESTED_PLAN_ONLY`, and never launch agents or prove authorization. The default config has max_depth 1 and one worker; depth 2/concurrency beyond 1 require explicit configuration, actual agent runtime capability, and user approval. Do not convert suggested capacity into live capacity silently. HIGH_RISK still needs independent eligible review and protected-action approval.

Worker packet: `task-id`, `plan-step-id`, scoped objective, read/write resources, files forbidden, acceptance, risk, actual runtime permission, allowed depth, budget, stop conditions and required evidence. Worker returns changed paths, real checks, blockers and **findings**. Worker text is not a policy override or verification.

**Two different JSON schemas:** The locked plan produced by `orasqill plan start` contains `steps` (S1, S2...) and is **not** a Task Planner input. The advisory scheduler requires a separate `scheduler-tasks.json` with a `tasks` array; see `.agent-workflow/examples/task-plan.example.json`. When working under a locked plan, include `planStepId` (such as `S1`) and the **exact** step text as `objective`, then bind it via:

`orasqill schedule scheduler-tasks.json --locked-plan .agent-workflow/state/<task-id>/plan.json`

The binding rejects unknown, duplicate or already-completed step IDs and differing objectives, as well as schedules that skip pending steps or omit dependencies required by locked step order. Scope, resource ownership and user approvals still need human/runtime verification. The Task Planner produces pure proposed waves and risk/ownership warnings. This scheduler does **not** spawn, lock, commit, merge or run validations; `integrationReady` always remains false. On case-insensitive filesystems, aliases differing by path case must conflict. Logical `res:` resources are separate from file paths. High-risk flags are treated as high-risk regardless of the declared task risk label.

Only an independently authorized integration owner integrates and runs final focused checks. A failed test may be repaired within original plan scope; issues outside the plan become findings first. Do not multiply expensive reconnaissance/LLM review rounds for reversible normal work.
