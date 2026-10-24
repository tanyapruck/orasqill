# External Skill Prerequisites — provenance and activation

The canonical `../SKILL.md` is the authority. This document records **external sources and activation conditions**, not installation consent, tool capabilities, or expanded task scope. `config.example.json` is not proof of a working runtime. No external skill is bundled, copied, vendored, or automatically installed by Orasqill.

## Prerequisite table

| External Skill | Activates for | Gate |
|---|---|---|
| **`karpathy-guidelines`** (project compatibility label: `karpathy-guidelines@1`) | **Every code-writing stage**, including DIRECT coding, SURGICAL change, bug fix, tests changed as code, and refactor | **REQUIRED**: the *actual coding agent* must load the exact Skill before modifying files or dispatching a coding worker |
| `grill-with-docs` (which calls `grilling` + `domain-modeling`) | User explicitly requests a deep interview/documented plan, or accepts an offer to resolve consequential design ambiguity before plan lock | **CONDITIONAL/OPT-IN**: requires all three Skills only when invoked; not a blocker for routine planning |
| `to-spec`, `to-tickets`, `tdd`, `diagnosing-bugs`, `code-review` | Only when separately selected for the appropriate task; see `planning-interview.md` | **OPTIONAL**: do not auto-install, create extra tickets, invoke extra agents or widen the plan |

`karpathy-guidelines@1` is a **local compatibility identifier**, not a claim that upstream publishes a version `1` package. Verify the current upstream `name: karpathy-guidelines` identity and applicable runtime installation.

## Verified upstream sources (checked 2026-10-24)

- Karpathy guidelines: [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills), exact source file [`skills/karpathy-guidelines/SKILL.md`](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/skills/karpathy-guidelines/SKILL.md). Upstream README currently documents Claude Code commands:

  ```text
  /plugin marketplace add forrestchang/andrej-karpathy-skills
  /plugin install andrej-karpathy-skills@karpathy-skills
  ```

  The marketplace identifier and canonical source repository are not identical. **Do not guess another provider's install command.** Verify actual Skill discovery in the selected runtime after user-authorized installation.

- Matt Pocock: [mattpocock/skills](https://github.com/mattpocock/skills); [`skills/engineering/grill-with-docs/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md) calls separate Skills named `grilling` and `domain-modeling`. Source paths: [`skills/productivity/grilling/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md) and [`skills/engineering/domain-modeling/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md). Use the upstream README's runtime-specific installation instructions after authorization.

## Pre-execution / worker readiness gate

1. Identify the current **planned code-editing step**, the actual executor runtime, and the external Skill it requires. Checking Orchestrator's installation **does not prove** the delegated implementer's installation.
2. Verify the exact name is discoverable **and actually loadable** by that executor; a config entry, local directory, prior install message or an Orchestrator's summary alone is insufficient. Check that the loaded instructions are the intended Skill and can be followed within the existing plan.
3. If a REQUIRED or activated CONDITIONAL Skill is absent, report `SETUP_REQUIRED: dependency_unavailable` with precise Skill, executing runtime and verified provenance. You may inspect/report/plan but **must not write code, delegate coding or pretend the Skill ran**. Installation requires explicit applicable user/organization/environment permission.
4. After authorized installation, re-verify in the *same executing runtime*, then resume the unchanged original plan. If installing or creating documentation would extend the locked task scope, log a Finding and obtain the required separate approval first.
5. Optional Matt skills that were not activated have **no readiness requirement** and must never block bounded work.

This dependency gate does not grant merge/deploy, protected-file edits, additional reviewers, or runtime switching.
