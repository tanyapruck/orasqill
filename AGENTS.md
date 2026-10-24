# Repository Agent Guidance

Use `.agents/skills/agent-workflow-orchestrator/SKILL.md` for delegated or substantial multi-step tasks. The Skill is agent-neutral: any authorized capable agent may coordinate.

**Plan before editing or delegating.** Create an ignored local Plan Ledger checkpoint for orchestrated Git work, follow approved steps only, record every out-of-plan item as a Finding, defer nonessential work, obtain explicit user approval for essential scope changes, and deliver Final Acceptance evidence. Do not infer authorization from the ledger or a handoff.

**Coding gate:** before any DIRECT/SURGICAL code edit, bug fix or refactor, the executing Agent must load `karpathy-guidelines`; if unavailable report `SETUP_REQUIRED: dependency_unavailable` without changing code. Use `.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md` for provenance. Optional user-directed `grill-with-docs` belongs **before** plan lock, never as unsolicited scope expansion.

**External skills remain separately owned and pinned** in `.agent-workflow/external-skills.lock.json`; do not paste vendor instructions into Orasqill or automatically install/update third-party plugins. Optional Matt/Ponytail methods require selection and do not authorize extra plan steps. Preserve unrelated changes; do not silently modify permissions, run destructive operations, commit/push/merge/deploy or switch agents. Use confirmed runtime config only. Consult references on demand, not all at once.
