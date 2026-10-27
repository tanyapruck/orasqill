---
name: oranit
description: Initialize shared workspace and independent Claude Code, Codex and optional Other Model routes.
disable-model-invocation: true
user-invocable: true
argument-hint: "[status|locate|refresh] [workspace]"
---

# Oranit — workspace bootstrap and codebase navigation

A **user-invoked workspace setup and locator Skill**, not permission to modify application code, activate model runtimes, or bypass review. For CLI usage, see `.agent-workflow/bin/oranit.mjs`.

## Initialization: ask only what is missing

1. Determine the actual workspace root; verify the user intends changes in this directory. Do not assume the repository is HoroOne or the Orasqill source checkout.
2. When the user invokes **`oranit` without a subcommand**, initialize the shared **Index/Config** and independent **Agent Routing** files with `node .agent-workflow/bin/oranit.mjs --workspace "<root>"`. If CLI is installed on PATH, `oranit` is equivalent. Use `--dry-run` first if existing instructions, security, or scope make writes uncertain.
3. Default `oranit` creates a neutral shared `.agent-workflow/config.json` and **two independent candidates**: `.agent-workflow/routing/claude-code.json` and `.agent-workflow/routing/codex.json`. `--profile claude-led` creates only Claude's missing route; `--profile openai-led` creates only Codex's missing route. **`--profile other`** creates only `.agent-workflow/routing/other.json`, with **empty model selections** until the user explicitly chooses provider, runtime and model IDs. This third route is optional and does not change Claude or Codex. Neither option overwrites another agent or shared config. Existing legacy global profiles remain preserved; their matching agent route may be copied without overwriting it. All generated model configs are `unconfirmed` unless preserving existing previously configured values. Ignore `.agent-workflow/routing/`, shared config, index and task state in Git.
4. The command installs the portable `$delegate-tree` and `$configure-models` Skills and Claude's `/configure-models` adapter. After setup, offer the model configuration interview for the **invoking agent's route only**. Do **not** infer config activation from presence of JSON; writing new candidate mappings requires the interview's separate explicit approval.
5. Initial index is `.agent-workflow/index/codebase-map.json`. It contains **path + approximate symbol names/line hints + hashes**, not source snippets, credentials or a proof of correctness. No vector DB required.

## Index-first code workflow

Before any broad repo search or reading many files:

- Run `node .agent-workflow/bin/oranit.mjs status` (or `oranit status`) from the target workspace.
- Run `oranit locate "keyword"` to get a small ranked candidate list. If missing, run `oranit`. If `INDEX_STALE`, run `oranit refresh` and query again. Do not trust stale positions. If the index is partial, oversized-file-skipped, or has no matches, fall back to scoped filesystem search and report that it was necessary.
- **Confirm against live code**: read the selected file and relevant imports, callers, config, tests and context (the full relevant file where appropriate) before editing. An index **never** replaces source inspection, approval, type-checks, targeted regression or HIGH_RISK independent review.
- After source edits, refresh the generated index when needed; do not claim fresh index until the real command succeeds. Keep user-provided notes separate from generated facts.

## CLI commands

```sh
oranit --workspace .                    # install missing Skills and initialize both systems
oranit --profile claude-led --workspace .   # Claude route only; Codex remains independent
oranit --profile other --workspace .        # optional Other Model, no models guessed
oranit --dry-run --workspace .          # proposal; no file writes
oranit status --workspace .                   # detect added, changed and removed indexed files
oranit locate "keyword" --workspace .      # precise candidate source paths/symbol hints
oranit refresh --workspace .                  # rebuild generated index, never model config
```

If the PATH command is unavailable, run `node .agent-workflow/bin/oranit.mjs` with the same arguments after installing the Skill. Running the CLI outside the intended workspace requires `--workspace`.

**Complete when:** initialization succeeded or genuinely reported a blocker; the index, shared config and relevant agent-local routing candidates exist (or existing files were preserved), and the next Agent knows to navigate via a fresh index while inspecting real code before changes. No model is launched, no Git action is authorized.
