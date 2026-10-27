# Repository Agent Entry

**Orchestrated work:** for user-assigned multi-step tasks, scoped delegation, or agent handoff, read `.agents/skills/agent-workflow-orchestrator/SKILL.md`. Any capable, authorized agent can coordinate; the role adds no permissions.

**Index before broad code exploration.** For source tasks use `node .agent-workflow/bin/oranit.mjs status` then `locate "<feature-or-symbol>"`; if absent/stale, `oranit`/`refresh` on the intended workspace. The generated index is only a map; verify actual source, imports, callers and tests. See `references/index-navigation.md` in the canonical Orchestrator Skill. `$oranit` (Codex) and `/oranit` (Claude Code) initialize the workspace and unconfirmed model config.

**Plan before editing or delegating.** Use the canonical Plan Ledger, follow locked steps, record each out-of-plan discovery as a Finding, defer nonessential work and request explicit user approval before essential changes. Close with actual validation and Final Acceptance evidence.

**Coding gate:** the actual executing agent loads `karpathy-guidelines` before coding, SURGICAL edits, bug fixes or refactors; if unavailable report `SETUP_REQUIRED: dependency_unavailable` and pause that code-writing stage. Original source/versions and readiness: `references/DEPENDENCIES.md` under the canonical Skill, plus `.agent-workflow/external-skills.lock.json`.

**Nested delegation recommendation:** When a substantial locked task has independently scoped subsystems, consider `.agents/skills/delegate-tree/SKILL.md` and suggest `$delegate-tree` (Codex) or `/delegate-tree` (Claude Code). Show a bounded Root → Sub-Orchestrator → Worker plan, then request explicit approval before invoking subagents. Default to direct/sequential work; a plan-only CLI packet is not an executed worker.

**User-invoked model mapping:** for `$configure-models` or a request to configure agent models/effort, read `.agents/skills/configure-models/SKILL.md`. A guided preview is not authorization to write config or launch agents; request explicit consent before changing `.agent-workflow/config.json`.

**Optional deep planning:** load original upstream `grill-with-docs` only for selected pre-plan design clarification; see `references/planning-interview.md`. External Skills stay separately owned and versioned, never blended into this Skill.

Preserve unrelated changes. Verify actual tools, delegated ownership and explicit authorization for protected actions, Git pushes, merges, deploys or destructive operations. Read additional references only for the active task branch.
