# Role Assignment and Coordination Ownership

**Orchestrator is a task role, not a vendor or a model.** Codex, Claude or any other agent may coordinate **only when chosen by the user or explicitly delegated within a parent orchestrator's authorization**. Model/runtime labels in a project config are candidate names, not exclusive owners. No agent can grant itself tools, new models, extra context, depth, independent-review status or merge/deploy permission.

Before coordinating verify: authorized objective, plan, risk, actual Git/working-tree access, configured agent readiness, allowed resources, write ownership, acceptable depth and final integration owner. If the actual runtime is not confirmed, use bounded direct work or report `SETUP_REQUIRED` rather than pretending workers are available.

An authorized parent may delegate a *bounded sub-orchestrator* packet specifying original plan-step ID, objective, allowed/forbidden paths, validation evidence, budget, depth and stop conditions. The child must report out-of-plan discoveries as findings; it cannot expand the packet. Only the designated integration owner handles final integration and reviewer gates.

For a human-controlled handoff, verify predecessor inactivity and actual branch/HEAD/status/diff. Read the same locked plan. Resume the next unfinished step rather than appointing a new root or opening a second task. Agent/provider availability changing during work does not automatically reassign ownership.
