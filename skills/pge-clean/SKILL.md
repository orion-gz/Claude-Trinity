Delete the pge-workspace/ directory in the current project to reset pipeline state.

Call the `pge_clean` tool from the `pge-orchestrator` MCP server.
Pass the current working directory as `cwd` if known.
Show the full output to the user.

Use this to start a fresh pipeline run, clearing all sprint state, feedback files, and workspace artifacts.

Example usage:
  /pge-clean            → clean current project workspace
