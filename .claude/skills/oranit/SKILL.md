---
name: oranit
description: >
  Initialize a workspace with Orasqill source index and model configuration,
  or locate source symbols. Use /oranit, /oranit status, /oranit locate
  and /oranit refresh on the requested workspace.
disable-model-invocation: true
user-invocable: true
argument-hint: "[status|locate|refresh] [workspace]"
---

# /oranit — Workspace init and code navigation

Read `../../../.agents/skills/oranit/SKILL.md` and follow its user-owned, safe workspace command flow. Invoking the Slash Skill is not itself permission to overwrite existing config or launch agents. With no subcommand, initialize the shared code index and neutral config plus separate local Claude Code/Codex routing candidates; preserve existing settings. `--profile claude-led` affects only Claude's route. Model changes after initialization go through `/configure-models` with separate approval. Use the current source files, not index hints alone, before code edits.
