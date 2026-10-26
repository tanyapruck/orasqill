---
name: oranit
description: >
  Initialize a workspace with Orasqill source index and model configuration,
  or locate source symbols. Use /oranit init, /oranit status, /oranit locate
  and /oranit refresh on the requested workspace.
disable-model-invocation: true
user-invocable: true
argument-hint: "[init|status|locate|refresh] [workspace]"
---

# /oranit — Workspace init and code navigation

Read `../../../.agents/skills/oranit/SKILL.md` and follow its user-owned, safe workspace command flow. Invoking the Slash Skill is not itself permission to overwrite existing config or launch agents. With `init`, initialize the generated code index **and** unconfirmed Model Config; preserve existing settings. Model changes after initialization go through `/configure-models` with separate approval. Use the current source files, not index hints alone, before code edits.
