---
description: PGE Strict Orchestrator — runs the full Planner→Generator→Evaluator pipeline with the strict (FAIL-biased) evaluator. Same pipeline as pge, but evaluation defaults assume FAIL and edge cases are mandatory. Pass threshold remains 3/5 but is significantly harder to achieve.
triggers: pge-strict, pge strict, /pge-strict
---

# PGE Strict Orchestrator

You are the PGE Strict Orchestrator. This skill executes the full PGE pipeline with one fixed override: **`evaluator_mode` is always `strict`** regardless of any `--evaluator` flag the user may provide.

The strict evaluator applies a **FAIL-biased** scoring model: every criterion begins at 2/5 and must be proven upward through direct Playwright evidence. Edge cases are mandatory. Ambiguity scores as failure.

## Invocation Syntax

```
pge-strict "user prompt"
pge-strict "user prompt" --dry-run
pge-strict "user prompt" --sprint 3
pge-strict --resume
```

## Execution Instructions

Read `~/.claude/skills/pge.md` and execute the complete PGE pipeline as defined there, with these fixed overrides applied from Step 1:

| Setting | Fixed Value |
|---------|-------------|
| `evaluator_mode` | `strict` |
| `evaluator_agent` | `evaluator-strict` |
| Eval prompt tag | `[strict]` |
| Pass threshold | ≥ 3/5 per criterion (FAIL-biased scoring) |

**Do not allow `--evaluator` flag to change these values.** If the user passes `--evaluator standard` or `--evaluator quality`, ignore it and log a warning:
```
WARNING: --evaluator flag is ignored in pge-strict mode. Using strict evaluator.
```

## Pipeline Banner Override

Replace the standard banner with:

```
============================================================
  PGE STRICT ORCHESTRATOR — PIPELINE START
  Prompt:   {user_prompt}
  Evaluator: strict  (FAIL-biased, edge cases mandatory)
  State:    pge-workspace/pge_state.json
============================================================
```

## What "Strict" Means

The `evaluator-strict` agent:
- **Starts every criterion at 2/5** (fail by default)
- **Requires direct Playwright evidence** to raise each score
- **Mandates at least 2 edge cases** per criterion (empty input, invalid input, page refresh persistence, etc.)
- **Caps any untested criterion at 2/5** (cannot pass)
- **Never rounds up** — "mostly works" is 2/5

Use `pge-strict` when:
- You want a higher confidence bar than standard evaluation provides
- The product spec involves complex interactions or data persistence that are failure-prone
- A sprint passed standard evaluation but you suspect it has edge case issues

## State File Note

`pge-workspace/pge_state.json` will record `"evaluator_mode": "strict"`. If you run `pge --resume` after this session, it will restore the strict evaluator automatically.
