Show a sprint-by-sprint results summary for the current PGE pipeline run.

Call the `pge_summary` tool from the `pge-orchestrator` MCP server.
Pass the current working directory as `cwd` if known.
Show the full output to the user.

The summary displays each sprint's status (PASS/FAIL), scores, evaluator mode, and round counts from pge-workspace/.

Example usage:
  /pge-summary          → show sprint results for current project
