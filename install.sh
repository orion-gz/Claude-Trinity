#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMANDS_DIR="$HOME/.claude/commands"
AGENTS_DIR="$HOME/.claude/agents"

echo "=== PGE Orchestrator Plugin — Install (v2.3.0) ==="
echo ""

# 1. Create directories if needed
if [ ! -d "$COMMANDS_DIR" ]; then
  mkdir -p "$COMMANDS_DIR"
  echo "[OK] Created $COMMANDS_DIR"
else
  echo "[OK] Commands directory exists: $COMMANDS_DIR"
fi

if [ ! -d "$AGENTS_DIR" ]; then
  mkdir -p "$AGENTS_DIR"
  echo "[OK] Created $AGENTS_DIR"
else
  echo "[OK] Agents directory exists: $AGENTS_DIR"
fi

# 2. Install slash commands (~/.claude/commands/ — Claude Code native)
for skill in pge pge-strict pge-quality pge-ultra; do
  cp "$SCRIPT_DIR/src/skills/${skill}.md" "$COMMANDS_DIR/${skill}.md"
  echo "[OK] Installed command: $COMMANDS_DIR/${skill}.md"
done

# 3. Install base agents (planner, generator, evaluator)
for agent in planner generator evaluator; do
  SRC_FILE="$SCRIPT_DIR/src/agents/${agent}.md"
  DEST_FILE="$AGENTS_DIR/${agent}.md"

  if [ ! -f "$SRC_FILE" ]; then
    echo "[SKIP] Source file not found: $SRC_FILE"
    continue
  fi

  if [ -f "$DEST_FILE" ]; then
    cp "$DEST_FILE" "${DEST_FILE}.bak"
    echo "[BACKUP] ${agent}.md → ${agent}.md.bak"
  fi

  cp "$SRC_FILE" "$DEST_FILE"
  echo "[OK] Installed agent: $DEST_FILE"
done

# 4. Install standalone evaluator agents and orchestrator agent
for variant in evaluator-standard evaluator-strict evaluator-quality pge-orchestrator; do
  SRC_FILE="$SCRIPT_DIR/src/agents/${variant}.md"
  DEST_FILE="$AGENTS_DIR/${variant}.md"

  if [ ! -f "$SRC_FILE" ]; then
    echo "[SKIP] Source file not found: $SRC_FILE"
    continue
  fi

  cp "$SRC_FILE" "$DEST_FILE"
  echo "[OK] Installed agent: $DEST_FILE"
done

# 5. Clean up legacy files from old install locations
for old_file in \
  "$HOME/.claude/skills/pge.md" \
  "$HOME/.claude/skills/pge-strict.md" \
  "$HOME/.claude/skills/pge-quality.md" \
  "$HOME/.claude/skills/pge-ultra.md" \
  "$HOME/.claude/skills/pge-premium.md" \
  "$COMMANDS_DIR/pge-premium.md" \
  "$AGENTS_DIR/evaluator-premium.md"; do
  if [ -f "$old_file" ]; then
    rm "$old_file"
    echo "[OK] Removed legacy file: $old_file"
  fi
done

echo ""
echo "=== Installation complete (v2.3.0) ==="
echo ""
echo "Commands:"
echo '  pge "idea"                               — standard evaluator (≥3/5)'
echo '  pge "idea" --evaluator strict            — FAIL-biased strict evaluator'
echo '  pge "idea" --evaluator quality           — quality evaluator (≥4/5)'
echo '  pge-strict "idea"                        — strict pipeline (shortcut)'
echo '  pge-quality "idea"                       — quality pipeline (shortcut)'
echo '  pge-ultra "idea"                         — all 3 evaluators, majority consensus'
echo '  pge-ultra "idea" --mode unanimous        — all 3 must agree'
echo '  pge-ultra "idea" --rounds 2              — each evaluator runs 2×'
echo '  pge-ultra "idea" --evaluator strict --rounds 3   — strict evaluator × 3 rounds'
echo '  pge-ultra "idea" --evaluator quality --rounds 3  — quality evaluator × 3 rounds'
echo '  pge --resume                             — resume any interrupted session'
echo '  pge "idea" --dry-run                     — plan + contracts only, no code'
echo ''
echo 'Adaptive orchestrator (auto-selects evaluator per sprint):'
echo '  pge-orchestrator "idea"                  — auto complexity analysis, adaptive mode'
echo '  pge-orchestrator "idea" --mode quality   — force base mode (still adapts per sprint)'
echo '  pge-orchestrator --resume                — resume adaptive session'
echo '  (also callable as subagent_type: "pge-orchestrator" from other agents)'
