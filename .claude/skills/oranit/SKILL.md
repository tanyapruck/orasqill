---
name: oranit
description: >
  Initialize a workspace with Orasqill source index and model configuration,
  using /oranit only. Use the orasqill CLI for navigation and model configuration.
disable-model-invocation: true
user-invocable: true
argument-hint: "[--profile claude-led|openai-led|other] [--workspace <directory>]"
---

# /oranit — Workspace initialization only

Read `../../../.agents/skills/oranit/SKILL.md` and follow its user-owned, safe workspace command flow. Invoking the Slash Skill is not itself permission to overwrite existing config or launch agents. With no subcommand, initialize the shared code index and neutral config plus separate local Claude Code/Codex routing candidates; preserve existing settings. `--profile claude-led` affects only Claude's route; `--profile other` creates an optional empty custom-model route without changing Claude or Codex. Model changes after initialization go through `/configure-models` with separate approval. Use `orasqill status`, `orasqill locate "keyword"`, `orasqill refresh`, and `orasqill --configure` for utilities and local model mapping. Require explicit approval before saving model changes. Verify live source before code edits.
