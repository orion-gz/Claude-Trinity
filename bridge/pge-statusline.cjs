#!/usr/bin/env node
'use strict';

// Outputs a compact one-liner for Claude Code's statusLine setting.
// Add to ~/.claude/settings.json:
//   "statusLine": { "type": "command", "command": "node /path/to/pge-statusline.cjs" }

const fs   = require('fs');
const path = require('path');

const stateFile = path.join(process.cwd(), 'pge-workspace', 'pge_state.json');

const PHASE_ICON = {
  PLANNING:     '📋',
  CONTRACTING:  '📝',
  IMPLEMENTING: '⚙️ ',
  EVALUATING:   '🔍',
  FIXING:       '🔧',
  DONE:         '✅',
  ESCALATED:    '🚨',
};

function activeAgent(state) {
  const { mode = 'standard', phase = '', sprint_num = 1, sprint_modes = {} } = state;
  if (phase === 'PLANNING')                return 'planner';
  if (phase === 'IMPLEMENTING')            return 'generator';
  if (phase === 'FIXING')                  return 'generator';
  if (phase === 'CONTRACTING')             return 'generator→evaluator';
  if (phase === 'DONE' || phase === 'ESCALATED') return '';
  if (phase === 'EVALUATING') {
    if (mode === 'ultra')                  return 'std+strict+quality';
    if (mode === 'idontcaretokenanymore')  return 'quality×5';
    if (mode === 'god')                    return 'godmode×10';
    if (mode === 'orchestrator') {
      const m = sprint_modes[String(sprint_num)] || 'standard';
      return `evaluator-${m}`;
    }
    return `evaluator-${mode}`;
  }
  return '';
}

try {
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const { mode, phase, sprint_num: sn, total_sprints: st, fail_count: fc } = state;
  const icon  = PHASE_ICON[phase] || '?';
  const agent = activeAgent(state);
  const sprint = st > 0 ? `${sn}/${st}` : `${sn}`;
  const retry  = fc > 0 ? ` ✗${fc}` : '';
  // Check if paused due to usage limit
  const pauseSignalPath = path.join(process.cwd(), 'pge-workspace', '.pause-signal');
  const isPaused = state.phase === 'PAUSED' || fs.existsSync(pauseSignalPath);

  const parts  = [
    isPaused ? '⏸️ ' : icon,
    isPaused ? `PGE PAUSED` : `PGE ${mode}`,
    `sprint ${sprint}`,
    !isPaused && agent,
    !isPaused && retry,
  ].filter(Boolean);
  process.stdout.write(parts.join(' · '));
} catch {
  // No active pipeline — output nothing so the status line stays clean
  process.stdout.write('');
}
