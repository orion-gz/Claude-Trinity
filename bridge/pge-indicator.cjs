#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── ANSI ──────────────────────────────────────────────────────────────────────
const C = {
  r:  '\x1b[0m',  b: '\x1b[1m',   d: '\x1b[2m',
  gray:    '\x1b[90m', white:   '\x1b[97m',
  cyan:    '\x1b[36m', bCyan:   '\x1b[96m',
  green:   '\x1b[32m', bGreen:  '\x1b[92m',
  yellow:  '\x1b[33m', bYellow: '\x1b[93m',
  red:     '\x1b[31m', bRed:    '\x1b[91m',
  blue:    '\x1b[34m', bBlue:   '\x1b[94m',
  mag:     '\x1b[35m',
};

function vis(s)    { return s.replace(/\x1b\[[0-9;]*m/g, ''); }
function pad(s, n) { return s + ' '.repeat(Math.max(0, n - vis(s).length)); }

// ── Box ───────────────────────────────────────────────────────────────────────
const W  = 60;        // total visual width (including border chars)
const CW = W - 4;     // content width  (inside │ sp … sp │)

const BOX = {
  top:  () => `${C.gray}╭${'─'.repeat(W - 2)}╮${C.r}`,
  bot:  () => `${C.gray}╰${'─'.repeat(W - 2)}╯${C.r}`,
  div:  () => `${C.gray}├${'─'.repeat(W - 2)}┤${C.r}`,
  divH: () => `${C.gray}╞${'═'.repeat(W - 2)}╡${C.r}`,
};

function row(content = '') {
  return `${C.gray}│${C.r} ${pad(content, CW)} ${C.gray}│${C.r}`;
}

function splitRow(left, right) {
  const gap = CW - vis(left).length - vis(right).length;
  return `${C.gray}│${C.r} ${left}${' '.repeat(Math.max(1, gap))}${right} ${C.gray}│${C.r}`;
}

const blank = () => row();

// ── Progress bar ──────────────────────────────────────────────────────────────
function bar(done, total, w = 28) {
  const f = total > 0 ? Math.min(Math.round((done / total) * w), w) : 0;
  return `${C.bGreen}${'█'.repeat(f)}${C.gray}${'░'.repeat(w - f)}${C.r}`;
}

// ── Sprint history dots ───────────────────────────────────────────────────────
function sprintDots(state) {
  const { sprint_num: sn = 1, total_sprints: st = 0, sprint_results = {}, phase } = state;
  if (st <= 0) return null;
  const tokens = [];
  for (let i = 1; i <= st; i++) {
    const r = sprint_results[String(i)];
    if      (r === 'PASS')                    tokens.push(`${C.green}✓${C.d}${i}${C.r}`);
    else if (r === 'FAIL')                    tokens.push(`${C.red}✗${C.d}${i}${C.r}`);
    else if (i === sn && phase !== 'DONE')    tokens.push(`${C.bYellow}▸${C.b}${i}${C.r}`);
    else                                      tokens.push(`${C.gray}○${i}${C.r}`);
  }
  return tokens.join('  ');
}

// ── Relative timestamp ────────────────────────────────────────────────────────
function rel(iso) {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
const SPIN = ['◐', '◓', '◑', '◒'];
let spIdx = 0;

// ── Domain mappings ───────────────────────────────────────────────────────────
const MODE = {
  standard:              { col: C.cyan,    label: 'standard'  },
  strict:                { col: C.bRed,    label: 'strict'    },
  quality:               { col: C.bBlue,   label: 'quality'   },
  ultra:                 { col: C.mag,     label: 'ultra'     },
  orchestrator:          { col: C.bCyan,   label: 'adaptive'  },
  idontcaretokenanymore: { col: C.bYellow, label: 'unlimited' },
  god:                   { col: C.bYellow, label: 'god mode'  },
};

const PHASE = {
  PLANNING:     { label: 'Planning',     col: C.bBlue,   spin: true  },
  CONTRACTING:  { label: 'Contracting',  col: C.cyan,    spin: true  },
  IMPLEMENTING: { label: 'Implementing', col: C.bGreen,  spin: true  },
  EVALUATING:   { label: 'Evaluating',   col: C.bYellow, spin: true  },
  FIXING:       { label: 'Fixing',       col: C.bRed,    spin: true  },
  DONE:         { label: 'Done',         col: C.green,   spin: false },
  ESCALATED:    { label: 'Escalated',    col: C.red,     spin: false },
  PAUSED:       { label: 'Paused',       col: C.yellow,  spin: false },
};

function agentLabel(state) {
  const { mode = 'standard', phase = '', sprint_num: sn = 1, sprint_modes = {} } = state;
  if (phase === 'PLANNING')                           return 'planner';
  if (phase === 'IMPLEMENTING' || phase === 'FIXING') return 'generator';
  if (phase === 'CONTRACTING')                        return 'generator → evaluator';
  if (phase === 'EVALUATING') {
    if (mode === 'ultra')                 return 'std + strict + quality  (consensus)';
    if (mode === 'idontcaretokenanymore') return 'evaluator-quality  ×5  (unanimous)';
    if (mode === 'god')                   return 'evaluator-godmode  ×10  (unanimous)';
    if (mode === 'orchestrator')          return `evaluator-${sprint_modes[String(sn)] || 'standard'}`;
    return `evaluator-${mode}`;
  }
  return null;
}

// ── Usage guard check ─────────────────────────────────────────────────────────
function guardActive() {
  try {
    return JSON.parse(fs.readFileSync(
      path.join(os.homedir(), '.claude', 'pge-limit-config.json'), 'utf8',
    )).enabled === true;
  } catch { return false; }
}

// ── Output ────────────────────────────────────────────────────────────────────
function flush(lines) {
  process.stdout.write(
    '\x1b[2J\x1b[H' +
    lines.filter(l => l != null).join('\n') +
    '\n',
  );
}

// ── Header helper ─────────────────────────────────────────────────────────────
function header(mode) {
  const m     = MODE[mode] || { col: C.cyan, label: mode };
  const guard = guardActive() ? `  ${C.yellow}⛨${C.r}` : '';
  const badge = `${m.col}${C.b}${m.label}${C.r}${guard}`;
  return splitRow(`  ${C.b}${C.white}PGE Orchestrator${C.r}`, `${badge}  `);
}

// ── Render: active pipeline ───────────────────────────────────────────────────
function render(state) {
  const {
    mode = 'standard', phase = '?',
    sprint_num: sn = 0, total_sprints: st = 0,
    fail_count: fc = 0, max_retries: mr = 3,
    last_checkpoint,
  } = state;

  if (phase === 'DONE')      return renderDone(state);
  if (phase === 'PAUSED')    return renderPaused(state);
  if (phase === 'ESCALATED') return renderEscalated(state);

  const ph    = PHASE[phase] || { label: phase, col: C.gray, spin: true };
  const agent = agentLabel(state);
  const dots  = sprintDots(state);
  const pct   = st > 0 ? `${Math.round(((sn - 1) / st) * 100)}%` : '';
  const spinCh = ph.spin ? `${ph.col}${SPIN[spIdx % 4]}${C.r}` : `${ph.col}●${C.r}`;

  const phaseStr  = `  ${spinCh}  ${ph.col}${C.b}${ph.label}${C.r}`;
  const sprintStr = sn > 0 ? `Sprint  ${C.b}${sn}${C.r}${C.gray} / ${st}${C.r}` : '';
  const retryStr  = fc > 0 ? `${C.red}${C.b}retry ${fc}/${mr}${C.r}  ${C.gray}·${C.r}  ` : '';

  flush([
    '',
    BOX.top(),
    header(mode),
    BOX.divH(),
    blank(),
    splitRow(phaseStr, sprintStr ? `${sprintStr}  ` : ''),
    agent ? row(`      ${C.d}${agent}${C.r}`) : null,
    blank(),
    st > 0 ? row(`  ${bar(Math.max(0, sn - 1), st)}  ${C.d}${pct}${C.r}`) : null,
    dots   ? row(`  ${dots}`) : null,
    blank(),
    BOX.div(),
    row(`  ${retryStr}${C.d}updated ${rel(last_checkpoint)}  ·  ctrl+c to exit${C.r}`),
    BOX.bot(),
    `  ${C.d}${workDir}${C.r}`,
    '',
  ]);
}

// ── Render: DONE ──────────────────────────────────────────────────────────────
function renderDone(state) {
  const { mode = 'standard', total_sprints: st = 0, sprint_results = {}, last_checkpoint } = state;
  const lines = [
    '',
    BOX.top(),
    header(mode),
    BOX.divH(),
    blank(),
    row(`  ${C.green}${C.b}✓  Pipeline Complete${C.r}    ${C.d}all ${st} sprints passed${C.r}`),
    blank(),
  ];
  for (let i = 1; i <= st; i++) {
    const r    = sprint_results[String(i)];
    const icon = r === 'PASS' ? `${C.green}✓${C.r}` : `${C.gray}·${C.r}`;
    lines.push(row(`     ${icon}  Sprint ${i}`));
  }
  lines.push(
    blank(), BOX.div(),
    row(`  ${C.d}finished ${rel(last_checkpoint)}  ·  ctrl+c to exit${C.r}`),
    BOX.bot(), `  ${C.d}${workDir}${C.r}`, '',
  );
  flush(lines);
}

// ── Render: PAUSED ────────────────────────────────────────────────────────────
function renderPaused(state) {
  const {
    mode = 'standard', sprint_num: sn = 0, total_sprints: st = 0,
    paused_before_phase, last_checkpoint,
  } = state;
  const nextPh = PHASE[paused_before_phase] || { label: paused_before_phase || '?', col: C.gray };
  flush([
    '',
    BOX.top(),
    header(mode),
    BOX.divH(),
    blank(),
    row(`  ${C.yellow}${C.b}⏸  Pipeline Paused${C.r}`),
    row(`     ${C.d}Usage limit reached — waiting for reset${C.r}`),
    blank(),
    row(`  Sprint  ${C.b}${sn}${C.r}${C.gray} / ${st}${C.r}  ${bar(Math.max(0, sn - 1), st || 1, 22)}`),
    paused_before_phase
      ? row(`  Next    ${nextPh.col}${nextPh.label}${C.r}  ${C.d}(resumes here)${C.r}`)
      : null,
    blank(),
    row(`  ${C.d}After limit resets:${C.r}  ${C.b}pge --resume${C.r}`),
    blank(),
    BOX.div(),
    row(`  ${C.d}paused ${rel(last_checkpoint)}  ·  ctrl+c to exit${C.r}`),
    BOX.bot(), `  ${C.d}${workDir}${C.r}`, '',
  ]);
}

// ── Render: ESCALATED ─────────────────────────────────────────────────────────
function renderEscalated(state) {
  const {
    mode = 'standard', sprint_num: sn = 0,
    fail_count: fc = 0, max_retries: mr = 3,
    last_checkpoint,
  } = state;
  flush([
    '',
    BOX.top(),
    header(mode),
    BOX.divH(),
    blank(),
    row(`  ${C.red}${C.b}!  Human Intervention Required${C.r}`),
    row(`     ${C.d}Sprint ${sn} failed ${fc}/${mr} times${C.r}`),
    blank(),
    row(`  ${C.d}Options:${C.r}`),
    row(`     ${C.b}pge --resume${C.r}         ${C.d}after fixing manually${C.r}`),
    row(`     ${C.b}pge --sprint ${sn + 1}${C.r}      ${C.d}skip to next sprint${C.r}`),
    blank(),
    BOX.div(),
    row(`  ${C.d}escalated ${rel(last_checkpoint)}  ·  ctrl+c to exit${C.r}`),
    BOX.bot(), `  ${C.d}${workDir}${C.r}`, '',
  ]);
}

// ── Render: idle ──────────────────────────────────────────────────────────────
function renderIdle() {
  flush([
    '',
    BOX.top(),
    splitRow(`  ${C.b}${C.white}PGE Orchestrator${C.r}`, `${C.gray}idle  `),
    BOX.div(),
    blank(),
    row(`  ${C.d}Start a pipeline:${C.r}  ${C.b}pge "your prompt"${C.r}`),
    row(`  ${C.d}Waiting for pge-workspace/pge_state.json …${C.r}`),
    blank(),
    BOX.bot(), '',
  ]);
}

// ── Watcher ───────────────────────────────────────────────────────────────────
const workDir   = process.argv[2] || process.cwd();
const stateFile = path.join(workDir, 'pge-workspace', 'pge_state.json');
const watchDir  = path.dirname(stateFile);

let lastState = null;

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch { return null; }
}

let debounce = null;
function refresh() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    lastState = readState();
    lastState ? render(lastState) : renderIdle();
  }, 80);
}

// Initial render
refresh();

// fs.watch for instant response to state changes
let watcher = null;
function startWatcher() {
  if (watcher || !fs.existsSync(watchDir)) return;
  try { watcher = fs.watch(watchDir, refresh); } catch {}
}
startWatcher();

// 1.5s polling: fs fallback + spinner animation
let prevDirExists = fs.existsSync(watchDir);
setInterval(() => {
  spIdx = (spIdx + 1) % 4;
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
