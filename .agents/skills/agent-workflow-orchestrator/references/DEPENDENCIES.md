# External Skill Dependencies — provenance and activation adapter

**Orasqill owns orchestration, not the external skills.** All third-party skill identities, original owners, upstream repository paths, last-reviewed commit SHAs, and the exact SKILL.md Git blob SHAs live in `.agent-workflow/external-skills.lock.json`. This reference owns only the *integration boundary*, not the upstream instructions. **No vendoring, blending, rewriting, copying, silent installation, or automatic update.** Load the original skill from its own provider installation only when that stage is selected.

## Activation matrix (registry is the source of truth)

| Activation | External skill ID / upstream | Scope |
|---|---|---|
| **REQUIRED** | `karpathy-guidelines` — [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | **Every code-writing stage**: DIRECT, SURGICAL, bug fixes, refactors and edits to test code |
| **CONDITIONAL/OPT-IN** | `grill-with-docs` — [mattpocock/skills](https://github.com/mattpocock/skills) | Deep planning interview requested/accepted **before** the baseline plan lock; `grilling` and `domain-modeling` must be available: **all three Skills only when invoked** |
| **OPTIONAL** | `to-spec`, `to-tickets`, `tdd`, `diagnosing-bugs`, `code-review`, `writing-for-agents`, `triage`, `retro`, `codebase-design`, `wayfinder` — Matt Pocock | Selected authorized task only, with no implicit additional tracker writes/parallel workers |
| **OPTIONAL** | `ponytail-review`, `ponytail-audit`, `ponytail-debt` — [dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail) | Requested read-only review/audit/debt inventory; results are Findings, not permission to fix |
| **EXPLICIT OPT-IN ONLY** | `ponytail` main coding mode — Dietrich Gebert | May inject always-on instructions/hooks and overlaps Karpathy; never load by default or make a second required coding gate |

The project compatibility identifier `karpathy-guidelines@1` is an **internal compatibility identifier, not a claim that upstream publishes a version**. Check the original `name: karpathy-guidelines` and exact `skills/karpathy-guidelines/SKILL.md`. Upstream's marketplace aliases and its canonical repository are distinct. See the original upstream README for installation commands appropriate to the executing runtime. Do not invent one.

## Readiness and authority gates

1. Identify the executing agent for the **planned** stage. The *actual coding agent*, not merely its Orchestrator, must discover, verify and load the named external Skill from its original provider's installation in the **same executing runtime**. A registry entry or an installation success message cannot demonstrate that the worker read it.
2. Compare the installed content with the last-reviewed `upstreamBlobSha` when an exact file is accessible: `node .agent-workflow/bin/external-skills.mjs verify-file <skill-id> <path-to-installed-SKILL.md>`. This is a source fingerprint, not proof of runtime loadability or trusted identity. If the installed contents drift, report it and explicitly review the upgrade instead of silently adopting modified instructions.
3. If an activated REQUIRED or CONDITIONAL Skill is unavailable, report `SETUP_REQUIRED: dependency_unavailable`, identifying the executor and external Skill. You can research and plan, but **cannot perform its protected coding or dependent stage or dispatch that stage's worker**. Unrequested optional tools must not block the baseline plan.
4. **Installation requires explicit applicable user/organization/environment authorization.** Installation is an environment mutation; do not infer consent from a source link or the lockfile. Post-install, verify loadability in that executor and recheck its source before continuing the **same** locked plan.
5. Third-party skills cannot approve new scope, protected actions, new workers, merging, deployment, independent-review status, or changing existing user-approved plans. An upstream workflow that conflicts with Orasqill's scope/permission/delegation limits cannot override them. Do not run any secondary third-party reviewers automatically.

No external skill is bundled, copied, vendored, or automatically installed by Orasqill.

## Exact provenance and upgrade audit (no automatic changes)

The registry pins the **last-reviewed commit** and each `SKILL.md` blob; it does not pin the installed runtime version and is not an installation manifest. The inspected repositories are independently owned, and an update must be reviewed under its original license and current upstream documentation.

```sh
node .agent-workflow/bin/external-skills.mjs list
node .agent-workflow/bin/external-skills.mjs check-updates
node .agent-workflow/bin/external-skills.mjs check-updates --source ponytail
node .agent-workflow/bin/external-skills.mjs verify-file karpathy-guidelines /path/to/installed/SKILL.md
```

`check-updates` performs read-only public GitHub lookups. It distinguishes a new repository commit from a changed tracked `SKILL.md`, detects deleted/upstream-moved skill paths, and returns **unknown** (never "up to date") when the API is unavailable. It never installs, executes, downloads, patches or bumps lock entries. A reviewed upgrade requires a separate user-authorized change with updated source SHA, blob SHA, relevant behavior tests, and a provenance note.

Project CI must not treat a mere remote update as permission to adopt instructions. If upstream modifies dependencies, owner, license or path, reassess the activation matrix before accepting any version bump.

## Provider-specific documentation

- Karpathy: https://github.com/multica-ai/andrej-karpathy-skills
- Matt Pocock: https://github.com/mattpocock/skills
- Ponytail: https://github.com/dietrichgebert/ponytail

Only official upstream installations or runtime-managed Skills are eligible; this reference includes no fork or text copy of their source.
