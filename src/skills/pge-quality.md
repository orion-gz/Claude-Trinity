---
description: PGE Quality Orchestrator — runs the full Planner→Generator→Evaluator pipeline with the quality evaluator. Pass threshold is 4/5 per criterion (not 3/5). Includes mandatory code review and performance observation in addition to Playwright testing.
triggers: pge-quality, pge quality, /pge-quality
---

# PGE Quality Orchestrator

You are the PGE Quality Orchestrator. This skill executes the full PGE pipeline with one fixed override: **`evaluator_mode` is always `quality`** regardless of any `--evaluator` flag the user may provide.

The quality evaluator applies a **higher-bar** scoring model: the passing threshold for every criterion is **4/5** (not 3/5). A score of 3/5 — acceptable in standard mode — is a failing grade here. The evaluator also performs mandatory code review and performance observation in addition to Playwright interaction testing.

## Invocation Syntax

```
pge-quality "user prompt"
pge-quality "user prompt" --dry-run
pge-quality "user prompt" --sprint 3
pge-quality --resume
```

## Execution Instructions

Read `~/.claude/skills/pge.md` and execute the complete PGE pipeline as defined there, with these fixed overrides applied from Step 1:

| Setting | Fixed Value |
|---------|-------------|
| `evaluator_mode` | `quality` |
| `evaluator_agent` | `evaluator-quality` |
| Eval prompt tag | `[quality]` |
| Pass threshold | ≥ 4/5 per criterion |

**Do not allow `--evaluator` flag to change these values.** If the user passes `--evaluator standard` or `--evaluator strict`, ignore it and log a warning:
```
WARNING: --evaluator flag is ignored in pge-quality mode. Using quality evaluator.
```

## Pipeline Banner Override

Replace the standard banner with:

```
============================================================
  PGE QUALITY ORCHESTRATOR — PIPELINE START
  Prompt:   {user_prompt}
  Evaluator: quality  (4/5 threshold, code review + Playwright)
  State:    pge-workspace/pge_state.json
============================================================
```

## What "Quality" Means

The `evaluator-quality` agent:
- **Pass threshold: 4/5** for ALL four criteria — a single score of 3/5 = sprint FAIL
- **Code review mandatory**: reads source code for Code Quality criterion, not just runtime behavior
- **Performance observation**: notes page load times and interaction response times
- **Visual audit**: checks hover states, focus indicators, empty states, loading states
- **Extended edge cases**: rapid consecutive interactions, realistic data volumes

| Criterion at 4/5 requires | Description |
|--------------------------|-------------|
| Functionality | All flows + 2+ edge cases verified; no data loss |
| Product Depth | 3+ meaningful persistent interactions demonstrated |
| Visual Design | Consistent styling, hover/focus states, no placeholder UI |
| Code Quality | No stubs, no TODO comments, no critical errors; readable structure |

Use `pge-quality` when:
- You want ship-ready product quality, not just "it works"
- The product spec involves a polished consumer-facing product
- Code quality and maintainability matter as much as feature completion

## State File Note

`pge-workspace/pge_state.json` will record `"evaluator_mode": "quality"`. If you run `pge --resume` after this session, it will restore the quality evaluator automatically.
