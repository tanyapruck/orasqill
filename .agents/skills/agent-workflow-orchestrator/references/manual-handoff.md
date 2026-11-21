# Manual Agent-to-Agent Handoff

No quota daemon, provider launcher, automatic switch or unapproved ownership transfer. User (or authorized parent with corresponding scope) selects the receiving agent. First writer stops before the receiver edits. From the same named-branch Git worktree (or initialized non-Git workspace):

```sh
orasqill handoff resume
```

The resolver finds **exactly one** unfinished task for the current branch, refreshes its `handoff.md` and reports a path. Read it together with `plan.md`, including pending steps and approval-required findings. Verify actual branch/HEAD/status/diff and source task objective. If ambiguous, ask which task rather than selecting the newest. For another computer/worktree, the local ignored checkpoint does not transfer through Git: deliberately provide a sanitized handoff and the matching Git changes.

Manual CLI also offers `start`, `checkpoint`, `export`, `finish`; on orchestrated work the preferred start and finish go through `orasqill plan`. The two finish entrypoints share Plan Completion Gates so an unfinished plan cannot vanish from `resume`. Legacy unplanned TRIVIAL/STANDARD tasks are closable for compatibility. **Legacy HIGH_RISK handoffs without a locked plan stay blocked**: `orasqill plan start` cannot attach a plan to an existing task ID and must not overwrite historical evidence. Preserve the original checkpoint. If work must continue, obtain explicit user authorization to establish a *new* locked task ID and plan on the verified branch, carrying forward the original scope and unresolved risks. Validate and obtain independent eligible review there. This does not retroactively finish the original legacy handoff.

Example optional user utterance addressed to Claude: `Codex เต็ม ทำงานต่อเลย`. This is **not a global provider preference**; it authorizes taking over an already-authorized Codex task only after the former writer is idle. Load any project-specific Claude L2 supplement if present; this generic package does not auto-install one.

## Non-Git workspaces and pre-edit checks

An `oranit`-initialized workspace **does not need `.git`** to use `orasqill plan start`, `step`, `finding`, `amend`, `check`, `review`, `report`, `finish` or `orasqill handoff resume`. The CLI resolves the nearest initialized `.agent-workflow/` folder when Git is absent and writes `state/<task-id>/{plan.json,plan.md,handoff.md}`. Both task and plan record `git_backed: false` with `startBranch` and `startHead` set to `null`. Handoff and Final Acceptance explicitly state that Git branch, HEAD and diff verification are **unavailable**; the agent must inspect actual source and run tests without claiming Git evidence. Multiple unfinished tasks in one non-Git workspace produce `AMBIGUOUS_HANDOFF` rather than silently choosing a task.

**Before any code edits**, obtain explicit user approval of the bounded plan, run `orasqill plan start ...`, then run `orasqill plan active` from the workspace. The latter is **read-only** and returns failure unless exactly one unfinished plan exists with a matching `plan.md` and `handoff.md`. It verifies checkpoint presence, **not** human approval. A runtime that supports pre-tool hooks can optionally run `orasqill plan active` as a required pre-edit command for file-writing tools (e.g. Write/Edit); hook configuration varies by runtime. Direct filesystem access can bypass this helper: retain human review, step checkpoints and independent review where required. A built-in or private plan is never a substitute for the shared pre-work files.
