# Developer notes

[Back to Orasqill](../README.md) · [Command Reference](command-reference.md) · [Model routing](model-routing.md)

## Install in another Git repository

Use the [workspace setup](#1-set-up-a-workspace) commands above, or choose [manual installation](#7-manual-installation-only-when-not-using-oranit). Add Orasqill to existing project instructions without overwriting your own `AGENTS.md`.

## Verify the installation

After setup, use the [installation checks](#6-verify-installation-external-skills-and-tests) to confirm that Git, the local CLI and the external Skill registry are accessible.

## External Skills and update tracking

| Integration | Purpose |
|---|---|
| [Karpathy guidelines](https://github.com/multica-ai/andrej-karpathy-skills) | Guidelines for coding agents |
| [Matt Pocock's Skills](https://github.com/mattpocock/skills) | Optional planning, specs, testing and reviews |
| [Ponytail](https://github.com/dietrichgebert/ponytail) | Optional code review and analysis |

Upstream Skills are installed separately. You can see their registered sources in [External dependencies](skills/agent-workflow-orchestrator/references/DEPENDENCIES.md).

## Quick start: a complete documentation-only task

After creating an agreed plan, see the [Plan Ledger example](#4-plan-ledger-execute-and-review-an-approved-task). It shows starting a task, recording completed steps and tests, producing a report and closing the task.

## Troubleshooting

| Problem | Check |
|---|---|
| Command not found | Link `oranit` or use the Node.js entrypoint |
| Index is out of date | Refresh the code index |
| Model cannot be selected | Check actual provider support |
| Task cannot be closed | Review outstanding steps and acceptance checks |
| Handoff cannot resume | Check the branch and local task state |
| Git preflight fails | Check the initial commit and branch |

Detailed CLI errors are documented in the [helper catalog](bin/README.md).

## Tests, limitations and sharing

Run the [test command](#6-verify-installation-external-skills-and-tests) in the Orasqill source checkout. Consumer installations do not include tests.

Orasqill provides Skills and local tools, not a sandbox or hosted execution platform. The repository is private and no standalone open-source license has been selected.

