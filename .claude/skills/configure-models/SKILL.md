---
name: configure-models
description: >
  Start a user-controlled Orasqill model/effort configuration interview. Use
  /configure-models to select Claude-led, OpenAI-led or custom orchestration,
  agents, independent review levels and local config.
disable-model-invocation: true
user-invocable: true
argument-hint: "[claude-led|openai-led|custom]"
---

# /configure-models — Claude Code command

Read `../../../.agents/skills/configure-models/SKILL.md` and perform its interactive, user-approved interview. If an argument names a profile, use it as the starting proposal and avoid asking that choice again. Without one, inspect the existing configuration and ask only for missing consequential information.

Invoking this command **does not authorize writing files**, activating runtimes, installing models, launching workers or changing Git state. Show the proposed mapping and obtain explicit approval before touching `.agent-workflow/config.json`.
