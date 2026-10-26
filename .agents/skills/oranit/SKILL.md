---
name: oranit
description: >
  Initialize an Orasqill workspace with a generated codebase index and safe,
  unconfirmed model routing; use when the user invokes $oranit (Codex),
  /oranit (Claude Code), or requests workspace indexing/bootstrap.
---

# Oranit — workspace bootstrap and codebase navigation

A **user-invoked workspace setup and locator Skill**, not permission to modify application code, activate model runtimes, or bypass review. For CLI usage, see `.agent-workflow/bin/oranit.mjs`.

## Initialization: ask only what is missing

1. Determine the actual workspace root; verify the user intends changes in this directory. Do not assume the repository is HoroOne or the Orasqill source checkout.
2. When the user requests `oranit init`, initialize both **Index** and **Model Config** with `node .agent-workflow/bin/oranit.mjs init --workspace "<root>"`. If CLI is installed on PATH, `oranit init` is equivalent. Use `--dry-run` first if existing instructions, security, or scope make writes uncertain.
3. Use `--profile claude-led` or `--profile openai-led` only when user selected the named template; otherwise create the neutral `config.example.json` template. All new configs remain `setup.status: "unconfirmed"`. Preserve existing `.agent-workflow/config.json`, existing agent instructions, local changes and prior index. Initialization copies only missing Orasqill bundle files. It adds local `.gitignore` entries for generated index, model config and task state without staging them.
4. The command installs the portable `$configure-models` Skill and Claude's `/configure-models` adapter. After init, offer that interview for customizing roles, model IDs and efforts. Do **not** infer config activation from presence of JSON; writing new candidate mappings requires the interview's separate explicit approval.
5. Initial index is `.agent-workflow/index/codebase-map.json`. It contains **path + approximate symbol names/line hints + hashes**, not source snippets, credentials or a proof of correctness. No vector DB required.

## Index-first code workflow

Before any broad repo search or reading many files:

- Run `node .agent-workflow/bin/oranit.mjs status` (or `oranit status`) from the target workspace.
- Run `oranit locate "<feature, filename, or symbol>"` to get a small ranked candidate list. If missing, run `oranit init`. If `INDEX_STALE`, run `oranit refresh` and query again. Do not trust stale positions. If the index is partial, oversized-file-skipped, or has no matches, fall back to scoped filesystem search and report that it was necessary.
- **Confirm against live code**: read the selected file and relevant imports, callers, config, tests and context (the full relevant file where appropriate) before editing. An index **never** replaces source inspection, approval, type-checks, targeted regression or HIGH_RISK independent review.
- After source edits, refresh the generated index when needed; do not claim fresh index until the real command succeeds. Keep user-provided notes separate from generated facts.

## CLI commands

```sh
oranit init --workspace .                    # install missing Skills and initialize both systems
oranit init --profile claude-led --workspace .
oranit init --dry-run --workspace .          # proposal; no file writes
oranit status --workspace .                   # detect added, changed and removed indexed files
oranit locate "verifyOTP" --workspace .      # precise candidate source paths/symbol hints
oranit refresh --workspace .                  # rebuild generated index, never model config
```

If the PATH command is unavailable, run `node .agent-workflow/bin/oranit.mjs` with the same arguments after installing the Skill. Running the CLI outside the intended workspace requires `--workspace`.

**Complete when:** initialization succeeded or genuinely reported a blocker; the index and unconfirmed model config exist (or existing files were preserved), and the next Agent knows to navigate via a fresh index while inspecting real code before changes. No model is launched, no Git action is authorized.
