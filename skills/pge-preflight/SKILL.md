Run a pre-flight check for the PGE pipeline in the current project.

Call the `pge_preflight` tool from the `pge-orchestrator` MCP server.
Pass the current working directory as `cwd` if known.
Show the full output to the user.

The pre-flight check verifies:
- Playwright MCP server availability
- Git repository status
- Agent files installed
- Skill files installed

Example usage:
  /pge-preflight        → check current project
