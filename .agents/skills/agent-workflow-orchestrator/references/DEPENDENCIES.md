# External Skill Dependencies — installation and verification

**Source of truth:** `.agent-workflow/external-skills.lock.json` stores original Skill IDs, author, repository, reviewed upstream commit, exact Git blob SHA, activation and dependencies. This document explains *how* Orasqill uses those records; it does not copy anyone's instructions or authorize installing third-party code. **No external skill is bundled, copied, vendored, or automatically installed.**

## Activation boundaries

- **REQUIRED, every code-writing stage:** `karpathy-guidelines` for DIRECT/SURGICAL implementation, tests, debugging fixes and refactors. The **actual coding agent** must load the Skill in its own runtime before writing or dispatching code work. `karpathy-guidelines@1` is an internal **compatibility identifier, not a claim** that upstream publishes that package version.
- **CONDITIONAL/OPT-IN, before the plan locks:** Matt's `grill-with-docs` for approved deep planning. It relies on external `grilling` plus `domain-modeling`: verify **all three Skills only when invoked**. Routine bounded changes are unaffected.
- **OPTIONAL agent-document edits:** select upstream `writing-for-agents` when authoring or revising `SKILL.md`, `AGENTS.md`, `CLAUDE.md` or documents read by agents. Read its original `SKILL.md`; when editing a Skill also read sibling `SKILL-MECHANICS.md`, verifying both against the reviewed registry fingerprints. The Skill is task-specific rather than an automatic prerequisite for unrelated work.
- **OPTIONAL:** other Matt Skills (specification, tickets, diagnosis, review, retrospectives) and Ponytail review/audit/debt. The main Ponytail coding plugin requires explicit opt-in because it can install session-wide hooks. Check exact IDs in the registry; optional Skills never become required stages merely because they are listed.

## Readiness gate for each executor

1. Resolve which real agent performs the planned stage. Determine the **exact** upstream Skill required, using the registry and that runtime's installation method. An Orchestrator knowing a Skill exists does not prove a child can load it.
2. Verify the named Skill is **discoverable and loadable in the same executing runtime**. When a file is accessible, compare it to the reviewed snapshot:

   `node .agent-workflow/bin/external-skills.mjs verify-file <skill-id> <installed-SKILL.md>`

   A byte fingerprint confirms only matching source, **not** runtime activation, trust or user approval. For `writing-for-agents` Skill-authoring work, also run `node .agent-workflow/bin/external-skills.mjs verify-reference writing-for-agents skills/productivity/writing-for-agents/SKILL-MECHANICS.md <installed-SKILL-MECHANICS.md>`. A mismatch is version drift that must be reviewed; do not silently run changed instructions.
3. If an activated required/conditional Skill is missing, stop the affected stage with `SETUP_REQUIRED: dependency_unavailable`. Planning, inspecting and reporting remain available; coding or invoking that gated stage is blocked. An unrequested Optional Skill is never a blocker.
4. **Installation requires explicit applicable user/organization/environment authorization.** After an approved installation, verify both the original provenance and actual Skill loadability with the *same executor* before resuming the already-authorized plan.

## Original providers and update checks

- Karpathy: [`multica-ai/andrej-karpathy-skills`](https://github.com/multica-ai/andrej-karpathy-skills), `skills/karpathy-guidelines/SKILL.md`. Its README identifies the Claude marketplace alias `forrestchang/andrej-karpathy-skills`; the marketplace alias is not the same as the canonical source repo. Follow original instructions appropriate to the specific runtime.
- Matt Pocock: [`mattpocock/skills`](https://github.com/mattpocock/skills). The wrapper `skills/engineering/grill-with-docs/SKILL.md` calls the two separately owned upstream Skills named above.
- Ponytail: [`dietrichgebert/ponytail`](https://github.com/dietrichgebert/ponytail). Installing its main plugin may activate hooks and injected instructions; review those changes before opt-in.

Run `node .agent-workflow/bin/external-skills.mjs list` or `check-updates [--source matt|ponytail|karpathy]` for **read-only** provenance auditing. Tracked sibling references are checked separately alongside each upstream Skill. An unavailable API returns `unknown`, never a claim that an update is unnecessary. An upgrade requires a separate authorized review of changed instructions/dependencies/license, then an explicit registry update and relevant regression tests. It does not grant scope, reviewer independence, agent capacity, commits or deploy rights.
