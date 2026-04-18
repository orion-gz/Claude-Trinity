Toggle PGE auto-launch (automatically opens an indicator terminal when /pge is invoked).

Parse the user's argument:
- "on" or no argument → call `pge_autolaunch_on` tool from the `pge-orchestrator` MCP server
- "off" → call `pge_autolaunch_off` tool from the `pge-orchestrator` MCP server
- "status" or "?" → call `pge_status` to show current state

After the tool call, show the result and remind the user to restart Claude Code if the setting changed.

Example usage:
  /pge-autolaunch       → enable
  /pge-autolaunch on    → enable
  /pge-autolaunch off   → disable
  /pge-autolaunch status → show current state
