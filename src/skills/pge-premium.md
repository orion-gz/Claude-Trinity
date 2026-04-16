---
description: PGE Premium Orchestrator — runs the full Planner→Generator→Evaluator pipeline with the premium evaluator. Pass threshold is 4/5 per criterion (not 3/5). Includes mandatory code review and performance observation in addition to Playwright testing.
triggers: pge-premium, pge premium, /pge-premium
---

# PGE Premium Orchestrator

You are the PGE Premium Orchestrator. This skill executes the full PGE pipeline with one fixed override: **`evaluator_mode` is always `premium`** regardless of any `--evaluator` flag the user may provide.

The premium evaluator applies a **higher-bar** scoring model: the passing threshold for every criterion is **4/5** (not 3/5). A score of 3/5 — acceptable in standard mode — is a failing grade here. The evaluator also performs mandatory code review and performance observation in addition to Playwright interaction testing.

## Invocation Syntax

```
pge-premium "user prompt"
pge-premium "user prompt" --dry-run
pge-premium "user prompt" --sprint 3
pge-premium --resume
```

## Execution Instructions

Read `~/.claude/skills/pge.md` and execute the complete PGE pipeline as defined there, with these fixed overrides applied from Step 1:

| Setting | Fixed Value |
|---------|-------------|
| `evaluator_mode` | `premium` |
| `evaluator_agent` | `evaluator-premium` |
| Eval prompt tag | `[premium]` |
| Pass threshold | ≥ 4/5 per criterion |

**Do not allow `--evaluator` flag to change these values.** If the user passes `--evaluator standard` or `--evaluator strict`, ignore it and log a warning:
```
WARNING: --evaluator flag is ignored in pge-premium mode. Using premium evaluator.
```

## Pipeline Banner Override

Replace the standard banner with:

```
============================================================
  PGE PREMIUM ORCHESTRATOR — PIPELINE START
  Prompt:   {user_prompt}
  Evaluator: premium  (4/5 threshold, code review + Playwright)
  State:    pge-workspace/pge_state.json
============================================================
```

## What "Premium" Means

The `evaluator-premium` agent:
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

Use `pge-premium` when:
- You want ship-ready product quality, not just "it works"
- The product spec involves a polished consumer-facing product
- Code quality and maintainability matter as much as feature completion

## State File Note

`pge-workspace/pge_state.json` will record `"evaluator_mode": "premium"`. If you run `pge --resume` after this session, it will restore the premium evaluator automatically.
