# Optional upstream Skills — stage selection and safe integration boundaries

This is a **router**, not a modified copy of anyone else's Skill. Original instructions remain at the exact repository paths/SHAs in `.agent-workflow/external-skills.lock.json`. The Orchestrator selects an approved external capability; the third-party provider owns its own method and upgrades. **Do not blend or restate upstream prompts into our canonical Skill.**

## Pre-plan interviewing: Matt Pocock

- **Bounded Surgical Change or clear acceptance:** skip interviewing. Investigate facts yourself, show the short plan and use the required Karpathy coding prerequisite at execution time.
- If the user asks for `grill-with-docs`, or accepts a narrowly offered deep interview about consequential unresolved decisions, verify all three external skill IDs: `grill-with-docs`, `grilling`, and `domain-modeling`. Load their **original instructions** from the runtime. They remain separate external Skills, not new Orasqill rules.
- Any documentation output (glossary, ADR, ticket/spec) is a separate filesystem or tracker mutation. **Do not create these files without plan inclusion or separate authorization.** Interviewing alone cannot authorize them.
- **After plan lock:** invoke no new planning method as a way to reopen decisions. **Unplanned requirements become Findings**; defer what is unnecessary, and ask for explicit approval before an essential amendment. No new interview may silently change scope.

## Other Matt Pocock Skills — optional, original owner retained

| External skill | Select when user-authorized | Orasqill boundary |
|---|---|---|
| `to-spec` | Decisions are settled and a durable specification is needed | Writing/publishing specifications is scoped work, not automatic |
| `to-tickets` | Larger approved plan needs dependency-aware executable tickets | Issue creation and graph changes require user authorization |
| `tdd` | An approved coding step benefits from test-first feedback | The **required** Karpathy coding gate still applies |
| `diagnosing-bugs` | A complex bug merits reproduction and diagnosis | Diagnostic scope is a planned step; new fixes become findings |
| `code-review` | An approved PR review needs two axes: standards and specification | Its parallel-subagent workflow must yield to confirmed ownership, capacity and reviewer independence |
| `writing-for-agents` | Explicitly editing SKILL.md, AGENTS.md, CLAUDE.md and agent instructions | Read the original upstream Skill, not locally rephrased versions |
| `triage` | User wants issue/PR readiness triage | Do not move labels, close issues, or write tracker artifacts without authorized scope |
| `retro` | User requests a post-task retrospective | Suggested follow-up changes are Findings or a separate approved task, not automatic edits |
| `codebase-design` | User approves architectural interface/test-seam planning | Original upstream discipline is used only for the authorized design phase |
| `wayfinder` | A multi-session goal needs iterative design decisions before locking a build plan | Issue-tracker maps and tickets require explicit authorization; never reopen a locked execution plan |

None of these Skills is necessary for a straightforward bounded code edit, and none is an automatic phase of all Orchestrator work.

## Ponytail — focused audit/review, not blended coding instructions

- `ponytail-review` is a useful **read-only** review of a specified diff/PR; `ponytail-audit` is a separately authorized audit of a larger codebase; `ponytail-debt` reports deferrals explicitly marked in source.
- Review findings are **not automatically implementation orders**. If a proposed fix is outside the locked plan, first create a Finding, defer it when nonessential or request specific approval when necessary.
- These optional reviewing Skills do **not** create an independent reviewer. High-risk review independence requires a genuinely independent eligible reviewer, as well as the chosen reviewing method.
- `ponytail` main Skill/plugin can install hooks and inject session-wide behavior. It overlaps the **required** Karpathy coding prerequisite; leave it disabled by default and use only after explicit user selection. Never copy its `AGENTS.md` over Orasqill or enable automatic hooks as a side effect of Orchestrator setup.
- If Matt `code-review` and Ponytail `ponytail-review` are both offered, prefer **one targeted review path** for the task rather than duplicate review passes that do not add new evidence.

All IDs, original authors, source paths, pinned revisions and Git blob fingerprints are in the independent registry. No third-party source is bundled or vendored.
