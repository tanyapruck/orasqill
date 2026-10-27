---
name: configure-models
description: >
  Interactive, user-invoked AI model mapping configuration interview for Orasqill.
  Use when the user calls $configure-models (Codex) or /configure-models (Claude Code)
  to select Claude-led, OpenAI-led or Other Model/custom roles, runtime/provider/model IDs, effort and reviewer rules.
---

# Configure Models — interactive routing interview

**This is an opt-in configuration assistant, not an agent launcher.** Run only after the user invokes this Skill or explicitly asks to configure mapping. A Slash/Skill call **starts an interview**, not permission to write config, enable workers, change accounts, switch runtimes, or merge code.

## 1. Inspect before asking

If model config is absent in the current workspace, initialize it alongside the code index with the separate user-invoked `oranit` workflow (or read the neutral template for a preview). Do not assume an initialized workspace means models or providers are active.

- Determine the active repository root and the **actual invoking agent** (`claude-code` or `codex`) from trusted runtime context. For **Other Model**, require an explicit user-selected `other` target instead of guessing an agent identity. Read `.agent-workflow/routing/claude-code.json`, `.agent-workflow/routing/codex.json`, or the explicitly selected `.agent-workflow/routing/other.json` only for the target, plus `.agent-workflow/config.json` for shared limits. A model label or config filename is not proof of agent identity. Never assume HoroOne-specific settings.
- Read the invoking agent's resolved route (prefer the agent-local file, otherwise a matching legacy config or matching bundled preset). Do not take the other agent's route as the default. Summarize relevant role mappings and `stage_preferences`, not credentials or unrelated settings.
- Read `.agents/skills/agent-workflow-orchestrator/references/setup-routing.md` when available, especially the Ultra vs API effort distinction.
- Optional read-only commands:
  - `node .agent-workflow/bin/model-config.mjs preview claude-orchestrator`
  - `node .agent-workflow/bin/model-config.mjs preview openai-orchestrator`
  - `node .agent-workflow/bin/model-config.mjs validate .agent-workflow/config.json`
  - `node .agent-workflow/bin/model-config.mjs resolve claude-code|codex|other --workspace .` (choose exactly one; `other` requires explicit user selection)
- Missing prerequisites: explain `SETUP_REQUIRED` and the install instructions; do not guess file contents or write into an unknown repo.

## 2. Interview, one decision at a time

Reuse choices already provided in this conversation or the existing config. Ask **only consequential missing questions**, with a brief proposed default. The user may say `defaults` to accept the displayed preset, or `cancel` at any time.

1. **Target**: if invoked in Claude Code, configure `claude-code` by default; if invoked in Codex, configure `codex` by default. If the user explicitly selects **Other Model**, target `other` at `.agent-workflow/routing/other.json` instead. Never infer a switch from Claude to Codex or Other; an explicit target and write approval are required.
2. **Runtime availability**: identify what is actually installed/available (Claude Code, Codex or another user-specified runtime); never claim availability from profile JSON.
3. **Role mapping**: Orchestrator, Implementer and independent Reviewer; then stage-specific triage, scoped code fixes, visual/computer-use, complex implementation, HIGH_RISK review and final report. For Other Model, ask which **provider**, **runtime/adapter ID**, and **actual model IDs** the user has. Do not invent any default for these or claim a provider adapter is installed. Inherit normal stages from their role unless the user explicitly wants overrides.
4. **Effort**: low / medium / high / xhigh / max, **only if the chosen runtime supports it**. For an external runtime that has no equivalent reasoning-effort control, omit `effort` (do not guess one). Keep special client `Ultra` separately as `requested_mode: "ultra"`, not `reasoning.effort: "ultra"`. In the Claude-led reference preset, critical review has `effort:"max"` plus `requested_mode:"ultra"` pending runtime support.
5. **Review independence and protected actions**: a different model label does not prove a different eligible author/session. Reviewer must be independent; HIGH_RISK also requires actual verification, acceptance evidence and protected-operation authorization.
6. **Operation**: inspect current setup, preview a draft, or prepare a change. Do not force a write just because the command was called.

Do not grill for already-known facts, ask unrelated preferences, or invent a model catalog. Model identifiers in sample profiles are candidate labels; verify availability and supported effort against the user's actual runtime when possible. Unknown availability is recorded as **unconfirmed**, not silently replaced.

## 3. Propose before making changes

- Show a compact **Before → After** table with role, model, runtime, effort and optional `requested_mode`; flag unavailable, unknown or unsafe choices clearly.
- Present the **exact agent-local target**: `.agent-workflow/routing/claude-code.json` for Claude Code, `.agent-workflow/routing/codex.json` for Codex, or `.agent-workflow/routing/other.json` for an explicitly chosen Other Model. Use the matching preset when absent, or preserve the resolved matching legacy config as a migration source. Edit only requested keys and preserve unrelated fields. **Do not overwrite the workspace-shared `.agent-workflow/config.json` to switch agent models.** JSON cannot preserve inline comments; warn about nonstandard JSON.
- Keep `version:1`, `setup.status:"unconfirmed"`, `automatic_switching:false`, `routing.reviewer.require_independent_author:true`, `fallback:[]` unless the user separately authorizes and the runtime enforces additional capabilities. Do not enable parallel workers, provider switching or launch a subagent as a side effect of model selection.
- Never write credentials into JSON. Ensure `.agent-workflow/config.json` and `.agent-workflow/routing/` are ignored by Git. Do not stage agent-local model choices.
- Request explicit approval for the **specific target's proposed write** (name its full `.agent-workflow/routing/<agent>.json` path). Approval for Claude's route does not authorize changes to Codex or to shared task settings.
- If the user declines or cancels, provide the proposed mapping without editing files.

## 4. Apply only after approval; verify honestly

- Write only the **approved agent-local** `.agent-workflow/routing/claude-code.json`, `.agent-workflow/routing/codex.json`, or `.agent-workflow/routing/other.json` in the verified workspace. Do not edit the other agent's mapping, shared config or checked-in example/presets.
- Validate with `node .agent-workflow/bin/model-config.mjs validate .agent-workflow/routing/<agent>.json`; then preview the **same agent** using `model-config.mjs resolve <agent> --workspace .`. If invalid, stop. Validation is structural only; independently check model access, effort and Skill readiness.
- Provide a final mapping summary, the file path (or no-write state), remaining `SETUP_REQUIRED` items, and explicit fact that **no models were launched and no runtime mapping was activated** merely by creating JSON.
- Configuration edits are not permission to commit, push, merge, deploy, or start workers.

**Complete when:** the selected target has a reviewed, agent-local mapping (or no-write preview), unrelated routes remain unchanged, and the setup status reflects actual runtime readiness.
