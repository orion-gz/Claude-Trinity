#!/usr/bin/env node
'use strict';

/**
 * PGE Eval Backend Manager
 * Reads and writes the evaluator backend config for PGE pipelines.
 *
 * Usage:
 *   node pge-eval-backend.cjs show [cwd]
 *   node pge-eval-backend.cjs set <backend> [--global] [cwd]
 *   node pge-eval-backend.cjs clear [cwd]
 *   node pge-eval-backend.cjs get [cwd]       <- machine-readable: prints backend name only
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawnSync } = require('child_process');

const VALID_BACKENDS = ['claude', 'codex', 'gemini'];
const GLOBAL_CONFIG  = path.join(os.homedir(), '.claude', 'pge-eval-backend');

function projectConfig(cwd) {
  return path.join(cwd, 'pge-workspace', '.eval-backend');
}

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8').trim(); } catch { return null; }
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content + '\n', 'utf8');
}

// Returns the active backend: project > global > 'claude'
function getActive(cwd) {
  const proj   = readFile(projectConfig(cwd));
  const global = readFile(GLOBAL_CONFIG);
  if (proj   && VALID_BACKENDS.includes(proj))   return { value: proj,    source: 'project' };
  if (global && VALID_BACKENDS.includes(global)) return { value: global,  source: 'global'  };
  return { value: 'claude', source: 'default' };
}

function checkPrereq(backend) {
  const warnings = [];
  if (backend === 'claude') return warnings;

  const hasTmux = spawnSync('which', ['tmux']).status === 0;
  if (!hasTmux) warnings.push('tmux not found — required for external backends (brew install tmux)');

  const hasCli = spawnSync('which', [backend]).status === 0;
  if (!hasCli) {
    const installHint = backend === 'codex'
      ? 'npm install -g @openai/codex  (or https://github.com/openai/codex)'
      : 'npm install -g @google/gemini-cli  (or https://github.com/google-gemini/gemini-cli)';
    warnings.push(`${backend} CLI not found in PATH — install: ${installHint}`);
  }

  const agentsDir  = path.join(os.homedir(), '.claude', 'agents');
  const agentFile  = path.join(agentsDir, `evaluator-${backend}.md`);
  if (!fs.existsSync(agentFile)) {
    warnings.push(`evaluator-${backend}.md not installed — run /pge-update to install`);
  }

  return warnings;
}

// ── Commands ──────────────────────────────────────────────────────────────────

function cmdShow(cwd) {
  const active = getActive(cwd);
  const projVal  = readFile(projectConfig(cwd)) || '(not set)';
  const globalVal = readFile(GLOBAL_CONFIG) || '(not set)';

  const sourceLabel = {
    project: `← project-level  (${projectConfig(cwd)})`,
    global:  `← global default  (~/.claude/pge-eval-backend)`,
    default: '← built-in default',
  }[active.source];

  const lines = [
    'PGE Eval Backend',
    '─────────────────────────────────────────────────────',
    `  Active backend : ${active.value}  ${sourceLabel}`,
    '',
    `  Project config : pge-workspace/.eval-backend  →  ${projVal}`,
    `  Global config  : ~/.claude/pge-eval-backend   →  ${globalVal}`,
    '',
    '  Available backends:',
    '    claude  — full Playwright + code review  [default]',
    '    codex   — static code review via Codex CLI + tmux',
    '    gemini  — static code review via Gemini CLI + tmux',
    '',
    '  Commands:',
    '    /pge-eval-backend codex            set project-level backend',
    '    /pge-eval-backend codex --global   set global default',
    '    /pge-eval-backend --clear          remove project-level override',
    '─────────────────────────────────────────────────────',
  ];
  console.log(lines.join('\n'));
}

function cmdGet(cwd) {
  console.log(getActive(cwd).value);
}

function cmdSet(backend, isGlobal, cwd) {
  if (!VALID_BACKENDS.includes(backend)) {
    console.error(`ERROR: Unknown backend "${backend}". Valid options: ${VALID_BACKENDS.join(', ')}`);
    process.exit(1);
  }

  const warnings = checkPrereq(backend);

  if (isGlobal) {
    writeFile(GLOBAL_CONFIG, backend);
    console.log(`[OK] Global eval backend set to: ${backend}`);
    console.log(`     Config: ~/.claude/pge-eval-backend`);
  } else {
    writeFile(projectConfig(cwd), backend);
    console.log(`[OK] Project eval backend set to: ${backend}`);
    console.log(`     Config: pge-workspace/.eval-backend`);
    console.log(`     (Overrides global default for this project only)`);
  }

  if (warnings.length > 0) {
    console.log('');
    warnings.forEach(w => console.log(`WARNING: ${w}`));
  }

  if (backend !== 'claude') {
    console.log('');
    console.log(`NOTE: ${backend} backend uses static code-review evaluation (no Playwright).`);
    console.log(`      To restore full Playwright evaluation: /pge-eval-backend claude`);
  }
}

function cmdClear(cwd) {
  const p = projectConfig(cwd);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    const active = getActive(cwd);
    console.log(`[OK] Project-level eval backend cleared.`);
    console.log(`     Active backend is now: ${active.value}  (${active.source})`);
  } else {
    console.log('[INFO] No project-level override found. Nothing to clear.');
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

const [,, command, ...rest] = process.argv;
const globalFlag = rest.includes('--global');
const args       = rest.filter(a => a !== '--global');

// Last non-flag arg that looks like a path is the cwd; otherwise use process.cwd()
const cwdArg = args.find(a => a.startsWith('/') || a.startsWith('.') || a.startsWith('~'));
const cwd    = cwdArg ? path.resolve(cwdArg.replace(/^~/, os.homedir())) : process.cwd();

switch (command) {
  case 'show':
    cmdShow(cwd);
    break;
  case 'get':
    cmdGet(cwd);
    break;
  case 'set': {
    const backend = args.find(a => VALID_BACKENDS.includes(a));
    if (!backend) {
      console.error(`ERROR: Specify a backend: ${VALID_BACKENDS.join(', ')}`);
      process.exit(1);
    }
    cmdSet(backend, globalFlag, cwd);
    break;
  }
  case 'clear':
    cmdClear(cwd);
    break;
  default:
    // Called with backend directly (e.g. node pge-eval-backend.cjs codex)
    if (command && VALID_BACKENDS.includes(command)) {
      cmdSet(command, globalFlag, cwd);
    } else if (!command) {
      cmdShow(cwd);
    } else {
      console.error(`Unknown command: ${command}`);
      console.error(`Usage: pge-eval-backend [show|get|set|clear|claude|codex|gemini] [--global] [cwd]`);
      process.exit(1);
    }
}
