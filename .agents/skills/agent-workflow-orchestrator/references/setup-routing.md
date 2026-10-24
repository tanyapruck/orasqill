# Runtime Confirmation and Routing

`config.example.json` is a **template only**; its unconfirmed state cannot authorize a worker. Copy to `.agent-workflow/config.json` in a consuming repo, configure candidate runtimes/models, then obtain explicit user confirmation of real available tools, per-provider quotas, permissions, reviewer availability and delegation depth. No script in this package launches providers or validates credentials.

Default safely to one orchestrator and sequential subtasks. A worker must pass an actual bounded interaction before treating it as ready. Routing fallback arrays describe possible eligible candidates; **never** switch providers automatically or because quota is low. Ask for user instruction and verify original task owner stopped.

Verify required external Skill readiness **per executing worker**, especially `karpathy-guidelines` for code changes, using `DEPENDENCIES.md`. A confirmed model mapping is not proof of Skill loadability. The optional pre-plan `grill-with-docs` interview requires explicit activation and its two upstream sub-skills.

High-risk tasks need separate independent review and any extra protected-action approval. Do not use a child reviewer who is the sole author as an independent reviewer. The scheduler is advisory only: it cannot prove isolation, budget or authorization. Treat missing confirmation as `SETUP_REQUIRED`.
