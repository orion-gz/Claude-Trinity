Start a macOS notification watcher for the current PGE pipeline run.

Call the `pge_notify` tool from the `pge-orchestrator` MCP server.
Pass the current working directory as `cwd` if known.
Show the result to the user.

The watcher runs in the background and sends macOS system notifications when sprints complete (PASS/FAIL) or when the pipeline finishes.

Example usage:
  /pge-notify           → start notification watcher for current project
