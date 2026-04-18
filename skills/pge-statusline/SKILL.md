Toggle the PGE status line in the Claude Code status bar.

Parse the user's argument:
- "on" or no argument → call `pge_statusline_on` tool from the `pge-orchestrator` MCP server
- "off" → call `pge_statusline_off` tool from the `pge-orchestrator` MCP server
- "status" or "?" → call `pge_status` to show current state

After the tool call, show the result and remind the user to restart Claude Code if the setting changed.

Example usage:
  /pge-statusline       → enable
  /pge-statusline on    → enable
  /pge-statusline off   → disable
  /pge-statusline status → show current state
