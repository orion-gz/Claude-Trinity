#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

// ── ANSI helpers ────────────────────────────────────────────────────────────
const C = {
  r:  '\x1b[0m',  b:  '\x1b[1m',  d:  '\x1b[2m',
  gray:    '\x1b[90m', white: '\x1b[37m',
  cyan:    '\x1b[36m', bCyan:    '\x1b[96m',
  green:   '\x1b[32m', bGreen:   '\x1b[92m',
  yellow:  '\x1b[33m', bYellow:  '\x1b[93m',
  red:     '\x1b[31m', bRed:     '\x1b[91m',
  blue:    '\x1b[34m', mag:      '\x1b[35m',
};

function vis(s)      { return s.replace(/\x1b\[[0-9;]*m/g, ''); }
function pad(s, n)   { return s + ' '.repeat(Math.max(0, n - vis(s).length)); }

// ── Layout ──────────────────────────────────────────────────────────────────
const IW = 52; // inner width (between │ and │)

function row(content) {
  return `${C.gray}│${C.r} ${pad(content, IW - 1)}${C.gray}│${C.r}`;
}

function divider(l = '├', r = '┤') {
  return `${C.gray}${l}${'─'.repeat(IW + 1)}${r}${C.r}`;
}

function progressBar(done, total, w = 22) {
  const f = total > 0 ? Math.min(Math.round((done / total) * w), w) : 0;
  return `${C.bGreen}${'█'.repeat(f)}${C.gray}${'░'.repeat(w - f)}${C.r}`;
}

// ── Domain mappings ─────────────────────────────────────────────────────────
const PHASE_INFO = {
  PLANNING:     { label: 'Planning',     col: C.blue    },
  CONTRACTING:  { label: 'Contracting',  col: C.cyan    },
  IMPLEMENTING: { label: 'Implementing', col: C.bGreen  },
  EVALUATING:   { label: 'Evaluating',   col: C.yellow  },
  FIXING:       { label: 'Fixing',       col: C.bRed    },
  DONE:         { label: 'Done',         col: C.green   },
  ESCALATED:    { label: 'Escalated',    col: C.red     },
};

const MODE_COL = {
  standard:              C.cyan,
  strict:                C.bRed,
  quality:               C.blue,
  ultra:                 C.mag,
  orchestrator:          C.bCyan,
  idontcaretokenanymore: C.bYellow,
  god:                   C.bYellow,
};

const MODE_LABEL = {
  standard:              'standard',
  strict:                'strict',
  quality:               'quality',
  ultra:                 'ultra',
  orchestrator:          'orchestrator (adaptive)',
  idontcaretokenanymore: 'idontcaretokenanymore',
  god:                   'god',
};

// Derive the active agent label from pipeline state
function activeAgent(state) {
  const { mode = 'standard', phase = '', sprint_num = 1, sprint_modes = {} } = state;

  if (phase === 'PLANNING')    return 'planner';
  if (phase === 'IMPLEMENTING' || phase === 'FIXING') return 'generator';
  if (phase === 'DONE')        return '—';
  if (phase === 'ESCALATED')   return 'human';

  if (phase === 'CONTRACTING') {
    return 'generator  →  evaluator';
  }

  if (phase === 'EVALUATING') {
    if (mode === 'ultra')                 return 'evaluator-standard + strict + quality';
    if (mode === 'idontcaretokenanymore') return 'evaluator-quality  ×5 (unanimous)';
    if (mode === 'god')                   return 'evaluator-godmode  ×10 (unanimous)';
    if (mode === 'orchestrator') {
      const sprintMode = sprint_modes[String(sprint_num)] || 'standard';
      return `evaluator-${sprintMode}  (sprint ${sprint_num})`;
    }
    return `evaluator-${mode}`;
  }

  return '?';
}

// ── Renderers ────────────────────────────────────────────────────────────────
function render(state) {
  const {
    mode = 'standard',
    phase = '?',
    sprint_num: sn = 0,
    total_sprints: st = 0,
    fail_count: fc = 0,
    max_retries: mr = 3,
    last_checkpoint,
  } = state;

  const pi  = PHASE_INFO[phase] || { label: phase, col: C.gray };
  const mc  = MODE_COL[mode]    || C.cyan;
  const ml  = MODE_LABEL[mode]  || mode;
  const agent = activeAgent(state);

  const sprintPct = st > 0 ? `${Math.round(((sn - 1) / st) * 100)}%` : '';
  const ts = last_checkpoint
    ? new Date(last_checkpoint).toLocaleTimeString()
    : '';

  const out = [
    '',
    `${C.gray}┌${'─'.repeat(IW + 1)}┐${C.r}`,
    row(`${C.b}PGE Orchestrator${C.r}   ${mc}${C.b}${ml}${C.r}`),
    divider(),
    row(`Sprint   ${C.b}${sn > 0 ? sn : '—'}${C.r}${C.gray}${st > 0 ? ` / ${st}` : ''}${C.r}  ${progressBar(sn > 0 ? sn - 1 : 0, st || 1)}  ${C.d}${sprintPct}${C.r}`),
    row(`Phase    ${pi.col}${C.b}${pi.label}${C.r}`),
    row(`Agent    ${pi.col}● ${agent}${C.r}`),
    ...(fc > 0
      ? [row(`Retries  ${C.red}${C.b}${fc}${C.r}${C.gray} / ${mr}${C.r}`)]
      : []),
    ...(ts
      ? [row(`Updated  ${C.d}${ts}${C.r}`)]
      : []),
    `${C.gray}└${'─'.repeat(IW + 1)}┘${C.r}`,
    `${C.d}  watching pge-workspace/pge_state.json  ·  ctrl+c to exit${C.r}`,
    '',
  ].join('\n');

  process.stdout.write('\x1b[2J\x1b[H' + out);
}

function renderIdle() {
  const out = [
    '',
    `${C.gray}┌${'─'.repeat(IW + 1)}┐${C.r}`,
    row(`${C.b}PGE Orchestrator${C.r}   ${C.gray}no active pipeline${C.r}`),
    `${C.gray}└${'─'.repeat(IW + 1)}┘${C.r}`,
    `${C.d}  start a pipeline with /pge "your prompt"${C.r}`,
    `${C.d}  watching for pge-workspace/pge_state.json ...${C.r}`,
    '',
  ].join('\n');

  process.stdout.write('\x1b[2J\x1b[H' + out);
}

// ── State file watcher ───────────────────────────────────────────────────────
const workDir   = process.argv[2] || process.cwd();
const stateFile = path.join(workDir, 'pge-workspace', 'pge_state.json');
const watchDir  = path.dirname(stateFile);

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch { return null; }
}

let debounce = null;
function refresh() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const s = readState();
    s ? render(s) : renderIdle();
  }, 80);
}

// Initial render
refresh();

// Watch pge-workspace/ directory for state file changes
let watcher = null;
function startWatcher() {
  if (watcher || !fs.existsSync(watchDir)) return;
  try {
    watcher = fs.watch(watchDir, refresh);
  } catch {}
}
startWatcher();

// Poll every 1.5 s: handles directory creation + acts as fallback
let prevDirExists = fs.existsSync(watchDir);
setInterval(() => {
  const exists = fs.existsSync(watchDir);
  if (!prevDirExists && exists) startWatcher();
  prevDirExists = exists;
  refresh();
}, 1500);

// Restore cursor on exit
process.on('SIGINT', () => {
  process.stdout.write('\x1b[?25h\n');
  process.exit(0);
});
