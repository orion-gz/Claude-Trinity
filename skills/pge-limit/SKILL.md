---
description: Set or clear a usage-based auto-pause threshold for PGE pipelines. When Claude Code usage reaches the specified percentage of the 5h or weekly limit, PGE saves a checkpoint and stops gracefully. Resume after limit resets with: pge --resume
triggers: pge-limit, /pge-limit
---

# PGE Usage Limit Guard

Configure an automatic pause threshold based on Claude Code token usage.

## Usage

```
/pge-limit <percentage>                   # Set threshold (5h window, auto-detect max)
/pge-limit <percentage> --type weekly     # Weekly window
/pge-limit <percentage> --max <tokens>    # Explicit token limit (e.g. --max 45000000)
/pge-limit off                            # Disable usage guard
/pge-limit status                         # Show current config
```

## Examples

```
/pge-limit 80                             # Pause at 80% of 5h token limit
/pge-limit 75 --type weekly               # Pause at 75% of weekly token limit
/pge-limit 80 --max 45000000             # 45M token max, pause at 80%
/pge-limit off                            # Remove limit guard
```

## What Happens When Limit Is Reached

1. PGE detects the pause signal at the next phase boundary (between sprints/phases)
2. All in-progress work is committed to disk
3. A compact checkpoint is written: `pge-workspace/pge_checkpoint.md`
4. Pipeline state saved as `PAUSED` in `pge_state.json`
5. macOS notification fires
6. Resume after limit resets: `pge --resume` (no re-reading of prior context)

---

## Step 1: Parse Arguments

Parse the user's prompt:

- If input contains `off` or `disable` → jump to **Section: Disable**
- If input contains `status` or `show` → jump to **Section: Status**
- Otherwise extract:
  - `{threshold}` — required number (1–99). Error and stop if missing or out of range.
  - `{type}` — from `--type [5h|weekly]`, default `5h`
  - `{maxTokens}` — from `--max <number>` (optional integer). If omitted, pass null.

## Step 2: Validate

- `{threshold}` must be 1–99 (inclusive). If not, print: `ERROR: threshold must be between 1 and 99.` and stop.
- `{type}` must be `5h` or `weekly`. If not, print: `ERROR: --type must be 5h or weekly.` and stop.

## Step 3: Set Limit

Call the `mcp__pge_orchestrator__pge_set_limit` tool with:
```json
{
  "threshold": {threshold},
  "type": "{type}",
  "maxTokens": {maxTokens or null},
  "cwd": "{current working directory}"
}
```

Print the tool output.

---

## Section: Disable

Call the `mcp__pge_orchestrator__pge_clear_limit` tool (no arguments needed).
Print the tool output.

## Section: Status

Call the `mcp__pge_orchestrator__pge_limit_status` tool (no arguments needed).
Print the tool output.
