# Optional Deep Planning Interview — Matt Pocock Skill Interoperability

**Default remains Plan First, then Execute exactly that Plan.** This reference describes an *optional pre-plan* thinking aid, **not** a replacement orchestrator, mandatory questionnaire or authorization for extra work. These third-party Skills are linked and activated through the user's runtime; no upstream source content is copied into this repository.

## Decision: use a deep interview or proceed directly?

1. **Bounded Surgical Change or clear acceptance:** research facts yourself, state a short plan and proceed. Do **not** block with a "grill" round or turn every simple task into a lengthy spec. `karpathy-guidelines` remains REQUIRED when coding starts.
2. **Consequential unresolved decisions:** briefly identify the *specific decision(s)* that would materially change the intended solution. Offer a planning interview only when the user has not already resolved them. The user can decline, in which case keep the known scope and treat genuinely missing authority as a blocker.
3. **User explicitly requests `grill-with-docs`, `grill me with docs`, or equivalent:** when the external Skills are available and the user authorizes that interview, invoke upstream [`grill-with-docs`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md). It is a wrapper over `grilling` plus `domain-modeling`; verify all of them via `DEPENDENCIES.md`. If missing, report the setup dependency and offer concise native planning rather than claiming an external Skill ran.

## While interviewing (only *before* locking a baseline plan)

- Examine the repo and documentation to answer factual questions yourself; ask the user to decide **tradeoffs and behavior**, not facts the agent can verify. Group questions by prerequisite decisions; do not ask downstream questions before their blockers are resolved.
- Propose a recommendation for each unresolved decision. Avoid re-asking settled choices, repetitive yes/no polls, or an unbounded conversation on a small task.
- When helpful and explicitly included in scope, record stable domain vocabulary in `GLOSSARY.md` and meaningful architectural decisions as ADRs. **Do not create these files without plan inclusion or separate authorization.**
- Conclude with a concrete **Plan Candidate**: original goal, exclusions, accepted decisions, ordered steps/dependency edges, acceptance tests, risks and unresolved blockers. Get any needed user decisions, **then show and lock the baseline Plan** via the normal Orchestrator Plan Ledger.
- **After plan lock:** no new interview may silently change scope. Unplanned requirements become Findings; nonessential deferred, essential needs explicit user approval before a plan amendment.

## Other Matt Pocock skills worth *selectively* reusing

| External Skill | When useful | Interaction with Orasqill |
|---|---|---|
| [`to-spec`](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md) | Larger new features whose agreed decisions need a durable spec | **Optional pre-plan** synthesis, not an automatic issue-creation mandate; creating tracker artifacts requires authorization |
| [`to-tickets`](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md) | Multiple independently verifiable vertical slices with dependencies | Optional inputs to an already **approved** Plan/task DAG; does not authorize parallel execution or change scope |
| [`tdd`](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md) | Planned code behavior that benefits from red-green feedback | Optional test method *after* required `karpathy-guidelines`; respect existing plan and available test seam |
| [`diagnosing-bugs`](https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnosing-bugs/SKILL.md) | Reproducible complex bugs where diagnosis is an approved plan step | Optional structured diagnosis; any follow-on fix outside scope is a Finding |
| [`code-review`](https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md) | Pre-merge Standards-vs-Spec review for substantial diffs | Optional; its parallel-subagent workflow must yield to **actual runtime concurrency and independent-review gates** |

None of these Skills is necessary for a straightforward bounded code edit. Do not install them all by default, treat their specific orchestration semantics as superior to the canonical Skill, or auto-run additional interviews on each task.
