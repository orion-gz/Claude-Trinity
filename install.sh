#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
AGENTS_DIR="$HOME/.claude/agents"

echo "=== PGE Orchestrator Plugin — Install (v2.2.0) ==="
echo ""

# 1. Create skills directory if needed
if [ ! -d "$SKILLS_DIR" ]; then
  mkdir -p "$SKILLS_DIR"
  echo "[OK] Created $SKILLS_DIR"
else
  echo "[OK] Skills directory exists: $SKILLS_DIR"
fi

# 2. Install skills
for skill in pge pge-strict pge-quality pge-ultra; do
  cp "$SCRIPT_DIR/src/skills/${skill}.md" "$SKILLS_DIR/${skill}.md"
  echo "[OK] Installed skill: $SKILLS_DIR/${skill}.md"
done

# 3. Patch base agents (append PGE Mode section to existing agent files)
for agent in planner generator evaluator; do
  AGENT_FILE="$AGENTS_DIR/${agent}.md"
  PATCH_FILE="$SCRIPT_DIR/src/agents/${agent}.patch"

  if [ ! -f "$AGENT_FILE" ]; then
    echo "[SKIP] Agent file not found: $AGENT_FILE"
    continue
  fi

  if grep -q "## PGE Mode" "$AGENT_FILE"; then
    echo "[SKIP] PGE Mode already present in ${agent}.md — replacing with updated patch"
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
  fi

  echo "" >> "$AGENT_FILE"
  cat "$PATCH_FILE" >> "$AGENT_FILE"
  echo "[OK] Patched ${agent}.md with PGE Mode section"
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

# 5. Clean up old renamed files if present (v2.0.0 → v2.1.0 migration)
for old_file in "$SKILLS_DIR/pge-premium.md" "$AGENTS_DIR/evaluator-premium.md"; do
  if [ -f "$old_file" ]; then
    rm "$old_file"
    echo "[OK] Removed renamed file: $old_file"
  fi
done

echo ""
echo "=== Installation complete (v2.2.0) ==="
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
