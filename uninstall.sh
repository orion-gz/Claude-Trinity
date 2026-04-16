#!/usr/bin/env bash
set -euo pipefail

COMMANDS_DIR="$HOME/.claude/commands"
AGENTS_DIR="$HOME/.claude/agents"

echo "=== PGE Orchestrator Plugin — Uninstall ==="
echo ""

# 1. Remove slash command files
for skill in pge pge-strict pge-quality pge-ultra pge-premium; do
  CMD_FILE="$COMMANDS_DIR/${skill}.md"
  if [ -f "$CMD_FILE" ]; then
    rm "$CMD_FILE"
    echo "[OK] Removed command: $CMD_FILE"
  else
    echo "[SKIP] Command not found: $CMD_FILE"
  fi
done

# 2. Remove legacy skill files if present
SKILLS_DIR="$HOME/.claude/skills"
for skill in pge pge-strict pge-quality pge-ultra pge-premium; do
  SKILL_FILE="$SKILLS_DIR/${skill}.md"
  if [ -f "$SKILL_FILE" ]; then
    rm "$SKILL_FILE"
    echo "[OK] Removed legacy skill: $SKILL_FILE"
  fi
done

# 3. Remove PGE Mode sections from patched agent files
for agent in planner generator evaluator; do
  AGENT_FILE="$AGENTS_DIR/${agent}.md"

  if [ ! -f "$AGENT_FILE" ]; then
    echo "[SKIP] Agent file not found: $AGENT_FILE"
    continue
  fi

  if ! grep -q "## PGE Mode" "$AGENT_FILE"; then
    echo "[SKIP] No PGE Mode section in ${agent}.md"
    continue
  fi

  LINE=$(grep -n "^## PGE Mode" "$AGENT_FILE" | head -1 | cut -d: -f1)
  TRIM_LINE=$((LINE - 1))
  ACTUAL=$(sed -n "${TRIM_LINE}p" "$AGENT_FILE")
  if [ -z "$ACTUAL" ]; then
    CUT_AT=$((LINE - 1))
  else
    CUT_AT=$LINE
  fi

  head -n $((CUT_AT - 1)) "$AGENT_FILE" > "${AGENT_FILE}.tmp"
  mv "${AGENT_FILE}.tmp" "$AGENT_FILE"
  echo "[OK] Removed PGE Mode section from ${agent}.md (was at line $LINE)"
done

# 4. Remove standalone evaluator and orchestrator agent files
for variant in evaluator-standard evaluator-strict evaluator-quality evaluator-premium pge-orchestrator; do
  AGENT_FILE="$AGENTS_DIR/${variant}.md"
  if [ -f "$AGENT_FILE" ]; then
    rm "$AGENT_FILE"
    echo "[OK] Removed agent: $AGENT_FILE"
  else
    echo "[SKIP] Agent not found: $AGENT_FILE"
  fi
done

echo ""
echo "=== Uninstall complete ==="
