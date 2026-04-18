---
description: Select the evaluator backend for PGE pipeline — claude (default), codex, or gemini. Setting persists per-project or globally.
triggers: pge-eval-backend, pge eval backend, /pge-eval-backend
---

# PGE Eval Backend Selector

Manage which AI backend runs the evaluation phase of PGE pipelines.

## Invocation Syntax

```
/pge-eval-backend                          → show current backend
/pge-eval-backend claude                   → set project backend to claude (default)
/pge-eval-backend codex                    → set project backend to codex
/pge-eval-backend gemini                   → set project backend to gemini
/pge-eval-backend codex --global           → set global default to codex
/pge-eval-backend gemini --global          → set global default to gemini
/pge-eval-backend --clear                  → remove project-level override (falls back to global/claude)
```

## Backend Comparison

| Backend | Evaluation Type | Playwright Testing | Scoring Threshold | Requires |
|---------|----------------|--------------------|------------------|----------|
| `claude` (default) | Interactive + Code Review | ✅ Full Playwright | Per-mode threshold | Claude Code |
| `codex` | Code Review only | ❌ Static analysis | Per-mode threshold | Codex CLI + tmux |
| `gemini` | Code Review only | ❌ Static analysis | Per-mode threshold | Gemini CLI + tmux |

> **Note:** External backends (codex/gemini) perform static code analysis only — no Playwright browser testing. Use them for fast feedback or when Playwright is unavailable. Use `claude` for full interactive evaluation.

## Step 1: Parse Input

Extract from the user's invocation:
- `{backend}` — one of `claude`, `codex`, `gemini` (or absent for show-only)
- `{global_flag}` — true if `--global` is present
- `{clear_flag}` — true if `--clear` is present
- `{valid_backends}` = `["claude", "codex", "gemini"]`

## Step 2: Determine Config Paths

```bash
PROJECT_CONFIG="pge-workspace/.eval-backend"
GLOBAL_CONFIG="$HOME/.claude/pge-eval-backend"
```

## Step 3: Execute Action

### Show current backend (no backend argument, no --clear):

```bash
PROJECT_CONFIG="pge-workspace/.eval-backend"
GLOBAL_CONFIG="$HOME/.claude/pge-eval-backend"

# Read values
if [ -f "$PROJECT_CONFIG" ]; then
  PROJECT_VAL=$(cat "$PROJECT_CONFIG" | tr -d '[:space:]')
else
  PROJECT_VAL="(not set)"
fi

if [ -f "$GLOBAL_CONFIG" ]; then
  GLOBAL_VAL=$(cat "$GLOBAL_CONFIG" | tr -d '[:space:]')
else
  GLOBAL_VAL="(not set)"
fi

# Determine active backend
if [ -f "$PROJECT_CONFIG" ]; then
  ACTIVE="$PROJECT_VAL  ← project-level"
elif [ -f "$GLOBAL_CONFIG" ]; then
  ACTIVE="$GLOBAL_VAL  ← global default"
else
  ACTIVE="claude  ← built-in default"
fi
```

Print:
```
PGE Eval Backend
─────────────────────────────────────────
  Active backend : {ACTIVE}

  Project config : {PROJECT_CONFIG} → {PROJECT_VAL}
  Global config  : {GLOBAL_CONFIG} → {GLOBAL_VAL}

  Available backends:
    claude  — full Playwright + code review  [default]
    codex   — static code review via Codex CLI
    gemini  — static code review via Gemini CLI

  Commands:
    /pge-eval-backend codex           set project-level
    /pge-eval-backend codex --global  set global default
    /pge-eval-backend --clear         remove project override
─────────────────────────────────────────
```

### Set backend (`--clear` is absent, backend is provided):

1. Validate `{backend}` is one of `claude`, `codex`, `gemini`. If not, print error and stop:
   ```
   ERROR: Unknown backend "{backend}". Valid options: claude, codex, gemini
   ```

2. Check prerequisite for non-claude backends:

   For `codex`:
   ```bash
   if ! command -v tmux >/dev/null 2>&1; then
     echo "WARNING: tmux not found. The codex evaluator requires tmux."
   fi
   if ! command -v codex >/dev/null 2>&1; then
     echo "WARNING: codex CLI not found in PATH. Install it before using this backend."
   fi
   ```

   For `gemini`:
   ```bash
   if ! command -v tmux >/dev/null 2>&1; then
     echo "WARNING: tmux not found. The gemini evaluator requires tmux."
   fi
   if ! command -v gemini >/dev/null 2>&1; then
     echo "WARNING: gemini CLI not found in PATH. Install it before using this backend."
   fi
   ```

3. Write config:

   If `{global_flag}` = true:
   ```bash
   echo "{backend}" > "$HOME/.claude/pge-eval-backend"
   ```
   Print:
   ```
   [OK] Global eval backend set to: {backend}
        Config: ~/.claude/pge-eval-backend
   ```

   Else (project-level):
   ```bash
   mkdir -p pge-workspace
   echo "{backend}" > pge-workspace/.eval-backend
   ```
   Print:
   ```
   [OK] Project eval backend set to: {backend}
        Config: pge-workspace/.eval-backend
        (Overrides global default for this project only)
   ```

4. If `{backend}` is `codex` or `gemini`, print usage note:
   ```
   NOTE: {backend} backend uses static code-review evaluation (no Playwright).
         All pipeline modes (standard/quality/strict) apply the same score thresholds
         but base scoring on code analysis rather than interactive browser testing.

         To run a full Playwright evaluation, switch back:
           /pge-eval-backend claude
   ```

### Clear project override (`--clear`):

```bash
if [ -f "pge-workspace/.eval-backend" ]; then
  rm "pge-workspace/.eval-backend"
  echo "[OK] Project-level eval backend cleared. Using global/default (claude)."
else
  echo "[INFO] No project-level override found. Nothing to clear."
fi
```

## Step 4: Verify Installation for External Backends

If setting `codex` or `gemini`, also check agent files are installed:

```bash
AGENTS_DIR="$HOME/.claude/agents"
BACKEND="{backend}"

if [ ! -f "$AGENTS_DIR/evaluator-$BACKEND.md" ]; then
  echo "WARNING: evaluator-$BACKEND.md not found in $AGENTS_DIR"
  echo "         Run /pge-update or re-run the PGE installer to install it."
fi
```
