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
    echo "[SKIP] Not found: $CMD_FILE"
  fi
done

# 2. Remove legacy skill files if present
for skill in pge pge-strict pge-quality pge-ultra pge-premium; do
  SKILL_FILE="$HOME/.claude/skills/${skill}.md"
  if [ -f "$SKILL_FILE" ]; then
    rm "$SKILL_FILE"
    echo "[OK] Removed legacy skill: $SKILL_FILE"
  fi
done

# 3. Restore base agents from backup, or remove if no backup exists
for agent in planner generator evaluator; do
  AGENT_FILE="$AGENTS_DIR/${agent}.md"
  BACKUP_FILE="${AGENT_FILE}.bak"

  if [ -f "$BACKUP_FILE" ]; then
    mv "$BACKUP_FILE" "$AGENT_FILE"
    echo "[OK] Restored ${agent}.md from backup"
  elif [ -f "$AGENT_FILE" ]; then
    rm "$AGENT_FILE"
    echo "[OK] Removed agent: $AGENT_FILE"
  else
    echo "[SKIP] Not found: $AGENT_FILE"
  fi
done

# 4. Remove evaluator variants and orchestrator
for variant in evaluator-standard evaluator-strict evaluator-quality evaluator-premium pge-orchestrator; do
  AGENT_FILE="$AGENTS_DIR/${variant}.md"
  if [ -f "$AGENT_FILE" ]; then
    rm "$AGENT_FILE"
    echo "[OK] Removed agent: $AGENT_FILE"
  else
    echo "[SKIP] Not found: $AGENT_FILE"
  fi
done

echo ""
echo "=== Uninstall complete ==="
