#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMANDS_DIR="$HOME/.claude/commands"
AGENTS_DIR="$HOME/.claude/agents"

echo "=== PGE Orchestrator Plugin — Install (v2.4.0) ==="
echo ""

# 1. Create directories if needed
mkdir -p "$COMMANDS_DIR" "$AGENTS_DIR"
echo "[OK] Directories ready"

# 2. Install slash commands from skills/*/SKILL.md (~/.claude/commands/)
for skill in pge pge-strict pge-quality pge-ultra pge-idontcaretokenanymore pge-god; do
  cp "$SCRIPT_DIR/skills/${skill}/SKILL.md" "$COMMANDS_DIR/${skill}.md"
  echo "[OK] Installed command: $COMMANDS_DIR/${skill}.md"
done

# 3. Install base agents (backup existing files first)
for agent in planner generator evaluator; do
  SRC_FILE="$SCRIPT_DIR/agents/${agent}.md"
  DEST_FILE="$AGENTS_DIR/${agent}.md"

  if [ -f "$DEST_FILE" ]; then
    cp "$DEST_FILE" "${DEST_FILE}.bak"
    echo "[BACKUP] ${agent}.md → ${agent}.md.bak"
  fi

  cp "$SRC_FILE" "$DEST_FILE"
  echo "[OK] Installed agent: $DEST_FILE"
done

# 4. Install evaluator variants and orchestrator
for variant in evaluator-standard evaluator-strict evaluator-quality evaluator-godmode pge-orchestrator; do
  cp "$SCRIPT_DIR/agents/${variant}.md" "$AGENTS_DIR/${variant}.md"
  echo "[OK] Installed agent: $AGENTS_DIR/${variant}.md"
done

# 5. Remove legacy files from old install locations
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
echo "=== Installation complete (v2.4.0) ==="
echo ""
echo "Slash commands (type / in Claude Code):"
echo '  /pge          — standard pipeline (evaluator ≥3/5)'
echo '  /pge-strict   — FAIL-biased strict evaluator'
echo '  /pge-quality  — quality evaluator (≥4/5)'
echo '  /pge-ultra    — all 3 evaluators, majority consensus'
echo '  /pge-idontcaretokenanymore — quality × 5 rounds, unanimous'
echo '  /pge-god      — godmode × 10 rounds, unanimous (≥4.5/5)'
echo ""
echo "Agents (type @ in Claude Code):"
echo '  @planner, @generator, @evaluator'
echo '  @evaluator-standard, @evaluator-strict, @evaluator-quality, @evaluator-godmode'
echo '  @pge-orchestrator'
