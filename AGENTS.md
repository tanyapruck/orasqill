# Repository Agent Entry

**Orchestrated work:** for user-assigned multi-step tasks, scoped delegation, or agent handoff, read `.agents/skills/agent-workflow-orchestrator/SKILL.md`. Any capable, authorized agent can coordinate; the role adds no permissions.

**Index before broad code exploration.** For source tasks use `orasqill status` then `orasqill locate "keyword"`; if absent/stale, `oranit`/`orasqill refresh` on the intended workspace. The generated index is only a map; verify actual source, imports, callers and tests. See `references/index-navigation.md` in the canonical Orchestrator Skill. `$oranit` (Codex) and `/oranit` (Claude Code) initialize the workspace and unconfirmed model config.

**Owner decisions:** Before changing product behavior, UI, layout or copy, read the applicable Accepted decisions indexed in `docs/decisions/README.md`. A conflict needs an owner-approved Finding; record lasting owner decisions in the same PR as implementation. Never infer decisions from private agent memory.

**Plan before editing or delegating.** Use the canonical Plan Ledger, follow locked steps, record each out-of-plan discovery as a Finding, defer nonessential work and request explicit user approval before essential changes. Close with actual validation and Final Acceptance evidence.

**Coding gate:** the actual executing agent loads `karpathy-guidelines` before coding, SURGICAL edits, bug fixes or refactors; if unavailable report `SETUP_REQUIRED: dependency_unavailable` and pause that code-writing stage. Original source/versions and readiness: `references/DEPENDENCIES.md` under the canonical Skill, plus `.agent-workflow/external-skills.lock.json`.

**Nested delegation recommendation:** When a substantial locked task has independently scoped subsystems, consider `.agents/skills/delegate-tree/SKILL.md` and suggest `$delegate-tree` (Codex) or `/delegate-tree` (Claude Code). Show a bounded Root → Sub-Orchestrator → Worker plan, then request explicit approval before invoking subagents. Default to direct/sequential work; a plan-only CLI packet is not an executed worker.

**Agent-local model mapping:** Resolve the verified invoking agent via `orasqill models resolve claude-code|codex|other --workspace .` (choose the real runtime; `other` is opt-in only on explicit user request), never by assuming the shared `.agent-workflow/config.json` declares a global leader. Claude Code uses `.agent-workflow/routing/claude-code.json`, Codex uses `.agent-workflow/routing/codex.json`; all routes share index and plan state, **not** their model assignments. For a user-selected external model, use `.agent-workflow/routing/other.json` and obtain verified runtime/provider/model details before proposing execution. For `$configure-models` or `/configure-models`, read `.agents/skills/configure-models/SKILL.md`; request user approval before writing the selected target's local file. Terminal users may use `orasqill configure` to preview and approve an agent-local mapping.

**Optional deep planning:** load original upstream `grill-with-docs` only for selected pre-plan design clarification; see `references/planning-interview.md`. External Skills stay separately owned and versioned, never blended into this Skill.

Preserve unrelated changes. Verify actual tools, delegated ownership and explicit authorization for protected actions, Git pushes, merges, deploys or destructive operations. Read additional references only for the active task branch.
