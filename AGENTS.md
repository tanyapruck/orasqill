# Repository Agent Entry

**Orchestrated work:** for user-assigned multi-step tasks, scoped delegation, or agent handoff, read `.agents/skills/agent-workflow-orchestrator/SKILL.md`. Any capable, authorized agent can coordinate; the role adds no permissions.

**Plan before editing or delegating.** Use the canonical Plan Ledger, follow locked steps, record each out-of-plan discovery as a Finding, defer nonessential work and request explicit user approval before essential changes. Close with actual validation and Final Acceptance evidence.

**Coding gate:** the actual executing agent loads `karpathy-guidelines` before coding, SURGICAL edits, bug fixes or refactors; if unavailable report `SETUP_REQUIRED: dependency_unavailable` and pause that code-writing stage. Original source/versions and readiness: `references/DEPENDENCIES.md` under the canonical Skill, plus `.agent-workflow/external-skills.lock.json`.

**Optional deep planning:** load original upstream `grill-with-docs` only for selected pre-plan design clarification; see `references/planning-interview.md`. External Skills stay separately owned and versioned, never blended into this Skill.

Preserve unrelated changes. Verify actual tools, delegated ownership and explicit authorization for protected actions, Git pushes, merges, deploys or destructive operations. Read additional references only for the active task branch.
