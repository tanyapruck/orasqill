---
name: configure-models
description: >
  Interactive, user-invoked AI model mapping configuration interview for Orasqill.
  Use when the user calls $configure-models (Codex) or /configure-models (Claude Code)
  to select Claude-led, OpenAI-led or custom roles, models, effort and reviewer rules.
---

# Configure Models — interactive routing interview

**This is an opt-in configuration assistant, not an agent launcher.** Run only after the user invokes this Skill or explicitly asks to configure mapping. A Slash/Skill call **starts an interview**, not permission to write config, enable workers, change accounts, switch runtimes, or merge code.

## 1. Inspect before asking

If model config is absent in the current workspace, initialize it alongside the code index with the separate user-invoked `oranit` workflow (or read the neutral template for a preview). Do not assume an initialized workspace means models or providers are active.

- Determine the active repository root and whether `.agent-workflow/config.json`, `.agent-workflow/config.example.json`, `.agent-workflow/profiles/claude-orchestrator.json` and `.agent-workflow/profiles/openai-orchestrator.json` exist. Never assume HoroOne-specific settings.
- Read current config **if present**; summarize its existing role mappings and `stage_preferences`. Do not print credentials, secrets or arbitrary unrelated config values.
- Read `.agents/skills/agent-workflow-orchestrator/references/setup-routing.md` when available, especially the Ultra vs API effort distinction.
- Optional read-only commands:
  - `node .agent-workflow/bin/model-config.mjs preview claude-orchestrator`
  - `node .agent-workflow/bin/model-config.mjs preview openai-orchestrator`
  - `node .agent-workflow/bin/model-config.mjs validate .agent-workflow/config.json`
- Missing prerequisites: explain `SETUP_REQUIRED` and the install instructions; do not guess file contents or write into an unknown repo.

## 2. Interview, one decision at a time

Reuse choices already provided in this conversation or the existing config. Ask **only consequential missing questions**, with a brief proposed default. The user may say `defaults` to accept the displayed preset, or `cancel` at any time.

1. **Profile**: Claude-led, OpenAI-led or custom; choose whom the user authorizes as Orchestrator. If already named, skip this question.
2. **Runtime availability**: identify what is actually installed/available (Claude Code, Codex or another user-specified runtime); never claim availability from profile JSON.
3. **Role mapping**: Orchestrator, Implementer and independent Reviewer; then stage-specific triage, scoped code fixes (Terra only for OpenAI-led), visual/computer-use (Terra candidate), complex implementation, HIGH_RISK review and final report. Inherit normal stages from their role unless the user explicitly wants overrides.
4. **Effort**: low / medium / high / xhigh / max, **only if the chosen runtime supports it**. Keep special client `Ultra` separately as `requested_mode: "ultra"`, not `reasoning.effort: "ultra"`. In the Claude-led reference preset, critical review has `effort:"max"` plus `requested_mode:"ultra"` pending runtime support.
5. **Review independence and protected actions**: a different model label does not prove a different eligible author/session. Reviewer must be independent; HIGH_RISK also requires actual verification, acceptance evidence and protected-operation authorization.
6. **Operation**: inspect current setup, preview a draft, or prepare a change. Do not force a write just because the command was called.

Do not grill for already-known facts, ask unrelated preferences, or invent a model catalog. Model identifiers in sample profiles are candidate labels; verify availability and supported effort against the user's actual runtime when possible. Unknown availability is recorded as **unconfirmed**, not silently replaced.

## 3. Propose before making changes

- Show a compact **Before → After** table with role, model, runtime, effort and optional `requested_mode`; flag unavailable, unknown or unsafe choices clearly.
- Present the **exact file path** and scope of changes. For a new config, start with one of the checked-in profiles or `config.example.json`; for an existing config, **edit only requested keys** and preserve unrelated fields, user additions, worker settings and comments outside JSON. JSON cannot preserve inline comments; warn if encountering nonstandard JSON.
- Keep `version:1`, `setup.status:"unconfirmed"`, `automatic_switching:false`, `routing.reviewer.require_independent_author:true`, `fallback:[]` unless the user separately authorizes and the runtime enforces additional capabilities. Do not enable parallel workers, provider switching or launch a subagent as a side effect of model selection.
- Never write credentials into the JSON. Ensure `.agent-workflow/config.json` is ignored by Git; don't accidentally stage or commit a local user config.
- Request explicit approval for the **proposed write**: “บันทึกค่าที่แสดงลง `.agent-workflow/config.json` หรือไม่?” This confirmation is separate from invoking `/configure-models`.
- If the user declines or cancels, provide the proposed mapping without editing files.

## 4. Apply only after approval; verify honestly

- Write only `.agent-workflow/config.json` within the verified intended project; **do not modify the shared example/presets** to change a single user's choices.
- Validate with `node .agent-workflow/bin/model-config.mjs validate .agent-workflow/config.json`. If validation fails, report it and do not mark setup confirmed. Validation is structural only; check model access/effort and actual Skill loadability separately.
- Provide a final mapping summary, the file path (or no-write state), remaining `SETUP_REQUIRED` items, and explicit fact that **no models were launched and no runtime mapping was activated** merely by creating JSON.
- Configuration edits are not permission to commit, push, merge, deploy, or start workers.

**Complete when:** the user has a reviewed mapping and, only if explicitly approved, a validated local config while the setup status correctly reflects actual runtime readiness.
