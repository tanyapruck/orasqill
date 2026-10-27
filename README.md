# Orasqill

**Give your coding agents a map, a plan, and a clean handoff.**

Working with AI coding agents is fast—until they search the same files again, lose track of a decision, or pick up a task without knowing what the previous agent finished.

Orasqill adds a lightweight workflow to your existing project. It works with **Claude Code**, **Codex**, and an optional **Other Model** configuration. You keep control of the code and the decisions.

## Customer Guide

### Why Orasqill exists

**“The agent keeps searching my entire project.”**

Orasqill builds a local code index so the agent can find likely files and functions first, then inspect the real source before changing anything.

**“We agreed on a plan, but the work drifted.”**

A task ledger keeps the original goal, completed steps, findings, and verification results together. You can see what changed and what is still unfinished.

**“I switched agents and had to explain everything again.”**

Claude Code and Codex can share project context while keeping their **own model preferences**. Handoffs carry task progress rather than starting from scratch.

**“This feature is too big for one agent.”**

The Delegate Tree Skill helps plan smaller, independently owned workstreams. It proposes a delegation structure without launching workers on its own.

### What you can use

- **`oranit`** — prepare a project with an index and Orasqill Skills.
- **Configure Models** — choose which models handle planning, implementation, and review.
- **Delegate Tree** — propose a breakdown for complex work.
- **Task checkpoints** — keep progress and review evidence with the project.

Orasqill is a toolkit, **not a hosted model service**. Connecting models and running subagents still depends on your coding-agent environment.

## Developer Guide

### Get started

You need **Git**, **Node.js 20+**, and access to this repository (currently private).

Run once to install the CLI, then initialize any project you want to use:

```bash
git clone https://github.com/tanyapruckp-pan/orasqill.git
cd orasqill
npm link
cd /path/to/your-project
oranit
```

That's it. Orasqill creates a local code index and starting model candidates. It preserves existing project instructions and model settings.

### Use it with your agent

| I want to… | Claude Code | Codex |
|---|---|---|
| Prepare this workspace | `/oranit` | `$oranit` |
| Choose models and review roles | `/configure-models` | `$configure-models` |
| Plan work across agents | `/delegate-tree` | `$delegate-tree` |

Useful terminal commands: `oranit status` checks the index, `oranit locate "keyword"` finds candidate code, and `oranit refresh` updates the index.

**Using another provider?** Run `oranit --profile other` to add an optional, initially empty model route. You choose the provider, runtime, and model; Orasqill does not connect to one automatically.

### Dive deeper

- **[Command Reference](docs/command-reference.md)** — every CLI command, manual installation steps, and examples.
- **[Model Routing](docs/model-routing.md)** — Claude-led, OpenAI-led, and Other Model profiles.
- **[Developer Notes](docs/developer-notes.md)** — verification, troubleshooting, and external Skills.
- **[CLI Helper Catalog](.agent-workflow/bin/README.md)** — low-level utilities and their arguments.

Third-party Skills, including [Karpathy guidelines](https://github.com/multica-ai/andrej-karpathy-skills), are **not vendored or copied** with Orasqill. Read the [external dependency guide](.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md) before code-writing tasks.

## AI Guide

If you're an AI coding agent working in a project with Orasqill, **start with [AGENTS.md](AGENTS.md)** and load the relevant Skill. This README is an introduction, not the complete agent instructions.

| Your task | Read this Skill |
|---|---|
| Plan, execute, or hand off a multi-step change | [Orchestrator Skill](.agents/skills/agent-workflow-orchestrator/SKILL.md) |
| Set up or navigate a workspace | [Oranit Skill](.agents/skills/oranit/SKILL.md) |
| Select or review model assignments | [Configure Models Skill](.agents/skills/configure-models/SKILL.md) |
| Propose nested delegation | [Delegate Tree Skill](.agents/skills/delegate-tree/SKILL.md) |

**In short:** understand the task, use the index to find the code, follow the agreed plan, verify actual results, and clearly report what remains. For the detailed rules, follow the Skills linked above.
