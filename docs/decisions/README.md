# Owner decisions — shared across coding agents

This directory records **durable project decisions made or explicitly approved by the owner**. It is tracked in Git and read by every agent working on the affected area. It is not a replacement for task-specific plans, a chat history, or private model memory.

## Decision index

Add a row whenever a decision is accepted or superseded. Keep old entries for traceability.

| ID | Area | Decision | Status | Applies to |
| --- | --- | --- | --- | --- |
| *(none yet)* | | | | |

## Rules

1. **Read first.** Before changing product behavior, UI, layout, interactions, or copy, inspect this index and all matching **Accepted** decision files. Match `Applies to` paths against the actual files you intend to change. Where a path is ambiguous, read rather than guess.
2. **Owner authority and conflicts.** Accepted owner decisions constrain agent proposals, prototypes, prior task plans and agent preferences. They do not override current explicit owner instructions, security rules or higher-priority policies. If a task conflicts with an Accepted decision, record an out-of-plan Finding and request owner approval before changing the affected behavior; never silently overwrite a decision.
3. **Record lasting decisions.** When the owner says "always," "never," "from now on," or approves a lasting design/copy choice, document the decision in the **same PR as its implementation**, with the owner's exact words **only when actually available**, and a link to the owner-approved discussion or PR. Do not manufacture quotations or treat agent suggestions as owner decisions.
4. **No history rewriting.** To change an Accepted decision, create a new numbered file with the superseding decision and update the old file's status to `Superseded by NNNN`; preserve its original rationale, quotes and history. Update the index for both. The supersession requires the owner's actual approval.
5. **One area per file.** Use `NNNN-short-title.md` (for example, `0001-checkout-button.md`), choosing a new sequential ID. Include Status, Date, Area, Decided by, Rules, Applies to, Not decided yet, and History. Each rule should be a single verifiable sentence; use repository-relative paths, not absolute paths.
6. **Respect privacy and access.** Record only decisions suitable for the repository's visibility. Do not copy private chats, credentials or personal data into a public repository. If a quote or link cannot be shared safely, note that the owner approved it without inventing or exposing restricted evidence.
7. **No silent enforcement claim.** This is an agent-readable convention; the files do not mechanically restrict filesystem access or grant permission to implement, merge, deploy, or bypass review. Final reports should name any added or superseded decisions.

Start from [TEMPLATE.md](TEMPLATE.md); do not commit the template as an Accepted decision.

## Example (illustrative only — not an actual owner decision)

Suppose the owner approves a loading interaction on a product page. A future `0001-loading-state.md` would contain:

```markdown
# 0001 — Keep the action visible while loading

- Status: Accepted
- Date: YYYY-MM-DD
- Area: Product page / loading interaction
- Decided by: Product owner — "Keep the action visible while loading." (example quote only)
- Applies to: `src/pages/product/**`

## Rules
- The submit action stays visible while its request is loading.
- A loading indicator appears on the existing action rather than replacing the layout.

## Not decided yet
- The exact loading animation.

## History
- PR: (link to the owner's actual approval and implementation)
```

In a real PR, replace the example quote, date and links with **verified** owner evidence, and add an index row. Other agents must load this decision before touching the affected interface.
