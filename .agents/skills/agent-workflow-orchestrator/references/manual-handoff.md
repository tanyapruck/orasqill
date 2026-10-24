# Manual Agent-to-Agent Handoff

No quota daemon, provider launcher, automatic switch or unapproved ownership transfer. User (or authorized parent with corresponding scope) selects the receiving agent. First writer stops before the receiver edits. From the same named-branch Git worktree:

```sh
node .agent-workflow/bin/manual-handoff.mjs resume
```

The resolver finds **exactly one** unfinished task for the current branch, refreshes its `handoff.md` and reports a path. Read it together with `plan.md`, including pending steps and approval-required findings. Verify actual branch/HEAD/status/diff and source task objective. If ambiguous, ask which task rather than selecting the newest. For another computer/worktree, the local ignored checkpoint does not transfer through Git: deliberately provide a sanitized handoff and the matching Git changes.

Manual CLI also offers `start`, `checkpoint`, `export`, `finish`; on orchestrated work the preferred start and finish go through `plan-ledger.mjs`. The two finish entrypoints share Plan Completion Gates so an unfinished plan cannot vanish from `resume`. Legacy unplanned TRIVIAL/STANDARD tasks are closable for compatibility. **Legacy HIGH_RISK handoffs without a locked plan stay blocked**: `plan-ledger start` cannot attach a plan to an existing task ID and must not overwrite historical evidence. Preserve the original checkpoint. If work must continue, obtain explicit user authorization to establish a *new* locked task ID and plan on the verified branch, carrying forward the original scope and unresolved risks. Validate and obtain independent eligible review there. This does not retroactively finish the original legacy handoff.

Example optional user utterance addressed to Claude: `Codex เต็ม ทำงานต่อเลย`. This is **not a global provider preference**; it authorizes taking over an already-authorized Codex task only after the former writer is idle. Load any project-specific Claude L2 supplement if present; this generic package does not auto-install one.
