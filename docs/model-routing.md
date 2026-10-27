# Model routing

[Back to Orasqill](../README.md) · [Command Reference](command-reference.md)

Claude Code and Codex can use the same project while retaining separate model preferences. **Other Model** is an optional third route for a user-chosen provider and runtime. This page describes candidate mappings; it does not install providers or launch models.


**Independent model routes, one workspace:**

| Shared | Claude Code | Codex |
|---|---|---|
| Code index, task plan, workspace limits | `.agent-workflow/routing/claude-code.json` | `.agent-workflow/routing/codex.json` |

An **optional third route** `.agent-workflow/routing/other.json` supports custom models from another provider/runtime without altering the two existing routes. It is created only when you choose `oranit --profile other`.

Run `orasqill models resolve claude-code`, `orasqill models resolve codex`, or `orasqill models resolve other` to inspect the selected mapping. Other Model requires an explicit user choice; it is never silently substituted. Agent identity must come from the actual runtime rather than an arbitrary filename.

You can customize model/effort assignments per agent. Bundled profiles are suggested starting points:

| Stage | OpenAI orchestrates (`openai-orchestrator.json`) | Claude orchestrates (`claude-orchestrator.json`) |
|---|---|---|
| Orchestrator / plan | GPT-6.1 Sol — high | Claude Opus 5.5 — high |
| Triage / reconnaissance | GPT-6 Luna — low | Claude Haiku 5.5 — low |
| Implementation | GPT-6.1 Sol — medium | Claude Sonnet 5.5 — medium (Claude Code) |
| Scoped code fixes | GPT-6.1 Terra — high | Claude Sonnet 5.5 — medium (inherits Implementer) |
| Complex implementation | GPT-6 Astra — high | Claude Sonnet 5.5 — high |
| Visual QA / computer use | GPT-6.1 Terra — medium | GPT-6.1 Terra — medium (Codex specialist) |
| Independent review | Claude Opus 5.5 — high | GPT-6.1 Sol — xhigh |
| HIGH_RISK review | Claude Opus 5.5 — xhigh | GPT-6.1 Sol — Ultra (requested review mode; API effort max) |
| Final report | GPT-6 Luna — low | Claude Haiku 5.5 — low |

**Other Model:** Start with `oranit --profile other`, then use `orasqill configure --agent other` (interactive, approval-gated), or `$configure-models` or `/configure-models` to explicitly target **other**. Fill in a real provider, installed runtime/adapter ID and model identifier for each role you want enabled. If the external runtime has no equivalent reasoning-effort control, omit `effort`. No external provider is bundled, verified or launched by this selection.

The agent-local profiles default to `setup.status = "unconfirmed"` until you configure each runtime. `orasqill configure` changes only one explicitly selected route, does not enable model calls and requires a final `yes` approval. If an existing workspace has a legacy Claude-led (or OpenAI-led) shared config, `oranit` preserves it; the corresponding agent can retain its matching mapping without changing the other agent. Terra is a specialist for scoped implementation in OpenAI-led mode and for computer-use tasks in either mode. In the Claude-led high-risk reviewer profile, Ultra is a *requested client mode*, not an API effort level.

Details: [Model routing and setup](../.agents/skills/agent-workflow-orchestrator/references/setup-routing.md).

