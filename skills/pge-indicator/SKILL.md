Open a live agent activity indicator in a new Terminal window for the current project.

Call the `pge_indicator` tool from the `pge-orchestrator` MCP server.
Pass the current working directory as `cwd` if known.
Show the result to the user.

The indicator displays real-time pipeline state: which agent is active, current sprint, evaluator mode, and pass/fail status. It polls pge-workspace/pge_state.json automatically.

Example usage:
  /pge-indicator        → open indicator for current project
