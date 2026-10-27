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

### Commands

Use these commands in your project. Slash commands go in the agent chat; `oranit` and `node` commands go in a terminal.

| Task | Claude Code | Codex |
|---|---|---|
| Initialize workspace | `/oranit` | `$oranit` |
| Configure model routing | `/configure-models` | `$configure-models` |
| Plan nested delegation | `/delegate-tree` | `$delegate-tree` |

| Terminal command | What it does |
|---|---|
| `oranit` | Initialize shared project state and the two default agent routes |
| `oranit --profile claude-led` | Create only the missing Claude Code route |
| `oranit --profile openai-led` | Create only the missing Codex route |
| `oranit --profile other` | Add an optional, empty Other Model route |
| `oranit status` / `oranit refresh` | Check or rebuild the code index |
| `oranit locate "keyword"` | Find candidate files and symbols |
| `node .agent-workflow/bin/external-skills.mjs list` | List third-party Skill dependencies and their status |
| `node .agent-workflow/bin/external-skills.mjs check-updates` | Check upstream Skill changes; does not install anything |

See the [Command Reference](docs/command-reference.md) for all advanced commands.

### Model mapping

Orasqill supplies suggested task-specific candidates. **These are not active model connections**; each agent keeps its own local routing configuration.

| Work | OpenAI-led / Codex | Claude-led / Claude Code |
|---|---|---|
| Orchestration / planning | GPT-6.1 Sol · High | Claude Opus 5.5 · High |
| Triage | GPT-6 Luna · Low | Claude Haiku 5.5 · Low |
| Implementation | GPT-6.1 Sol · Medium | Claude Sonnet 5.5 · Medium |
| Scoped code changes | GPT-6.1 Terra · High | Claude Sonnet 5.5 · Medium |
| Complex changes | GPT-6 Astra · High | Claude Sonnet 5.5 · High |
| Computer use / visual QA | GPT-6.1 Terra · Medium | GPT-6.1 Terra · Medium (Codex specialist) |
| Independent review | Claude Opus 5.5 · High | GPT-6.1 Sol · XHigh |
| High-risk review | Claude Opus 5.5 · XHigh | GPT-6.1 Sol · Max (Ultra requested) |
| Final report | GPT-6 Luna · Low | Claude Haiku 5.5 · Low |

**Other Model** starts blank with `oranit --profile other`. You choose its provider, runtime and models explicitly. See [Model Routing](docs/model-routing.md) for full stage-level settings, approvals and client-specific effort notes.

### Dependencies

| Dependency | Required? | Used for |
|---|---|---|
| Git and Node.js 20+ | **Yes** | Workspace setup and local CLI |
| Claude Code or Codex | **For agent features** | Running Skills; other runtimes require their own compatible integration |
| [Karpathy guidelines](https://github.com/multica-ai/andrej-karpathy-skills) | **For code-writing tasks** | Guidance for the agent actually editing code |
| [Matt Pocock's Skills](https://github.com/mattpocock/skills) | Optional | Deep planning, TDD, review, agent documentation |
| [Ponytail](https://github.com/dietrichgebert/ponytail) | Optional | Focused code review and audits |

Third-party Skills are **not vendored or copied** with Orasqill; install required ones separately from their authors. The [dependency guide](.agents/skills/agent-workflow-orchestrator/references/DEPENDENCIES.md) explains activation and source verification.

### Dive deeper

- **[Command Reference](docs/command-reference.md)** — every CLI command, manual installation steps, and examples.
- **[Model Routing](docs/model-routing.md)** — Claude-led, OpenAI-led, and Other Model profiles.
- **[Developer Notes](docs/developer-notes.md)** — verification, troubleshooting, and external Skills.
- **[CLI Helper Catalog](.agent-workflow/bin/README.md)** — low-level utilities and their arguments.

### License

Orasqill is available under the [MIT License](LICENSE). You may use, modify and redistribute it, including commercially, as long as you retain the copyright and license notice. External Skills are licensed separately by their authors.

**To let other people clone it from GitHub, the repository must also be made public** (or they must be granted access). It is currently private.

## AI Guide

If you're an AI coding agent working in a project with Orasqill, **start with [AGENTS.md](AGENTS.md)** and load the relevant Skill. This README is an introduction, not the complete agent instructions.

| Your task | Read this Skill |
|---|---|
| Plan, execute, or hand off a multi-step change | [Orchestrator Skill](.agents/skills/agent-workflow-orchestrator/SKILL.md) |
| Set up or navigate a workspace | [Oranit Skill](.agents/skills/oranit/SKILL.md) |
| Select or review model assignments | [Configure Models Skill](.agents/skills/configure-models/SKILL.md) |
| Propose nested delegation | [Delegate Tree Skill](.agents/skills/delegate-tree/SKILL.md) |

**In short:** understand the task, use the index to find the code, follow the agreed plan, verify actual results, and clearly report what remains. For the detailed rules, follow the Skills linked above.
