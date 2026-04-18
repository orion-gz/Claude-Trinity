#!/usr/bin/env node
'use strict';

const fs           = require('fs');
const path         = require('path');
const os           = require('os');
const { execSync } = require('child_process');

const C = {
  r: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m',
};

function ok(msg)   { console.log(`  ${C.green}✓${C.r}  ${msg}`); }
function fail(msg) { console.log(`  ${C.red}✗${C.r}  ${msg}`); }
function info(msg) { console.log(`  ${C.gray}→${C.r}  ${msg}`); }

function run(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim();
  } catch (e) {
    return null;
  }
}

// ── Locate plugin root ────────────────────────────────────────────────────────
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT
  || path.resolve(__dirname, '..');

console.log(`\n${C.b}${C.cyan}PGE Update${C.r}\n`);
console.log(`  Plugin root: ${C.gray}${PLUGIN_ROOT}${C.r}\n`);

// ── Check git ─────────────────────────────────────────────────────────────────
const isGit = fs.existsSync(path.join(PLUGIN_ROOT, '.git'));
if (!isGit) {
  fail('Plugin directory is not a git repository — cannot auto-update.');
  info('To update manually: git pull && bash install.sh');
  process.exit(1);
}

// ── Current version ───────────────────────────────────────────────────────────
const pkgFile = path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');
let currentVersion = '?';
try {
  currentVersion = JSON.parse(fs.readFileSync(pkgFile, 'utf8')).version || '?';
} catch {}

console.log(`  Current version: ${C.b}${currentVersion}${C.r}`);

// ── Git pull ──────────────────────────────────────────────────────────────────
console.log(`\n  Pulling latest from origin/main ...\n`);
const pullOut = run('git pull --ff-only origin main', PLUGIN_ROOT);
if (pullOut === null) {
  fail('git pull failed. Check network or remote config.');
  process.exit(1);
}

if (pullOut.includes('Already up to date')) {
  ok('Already up to date — no changes.');
} else {
  console.log(pullOut.split('\n').map(l => `  ${C.gray}${l}${C.r}`).join('\n'));
}

// ── New version ───────────────────────────────────────────────────────────────
let newVersion = '?';
try {
  newVersion = JSON.parse(fs.readFileSync(pkgFile, 'utf8')).version || '?';
} catch {}

if (newVersion !== currentVersion) {
  console.log(`\n  ${C.b}${currentVersion}${C.r} ${C.gray}→${C.r} ${C.b}${C.green}${newVersion}${C.r}`);
} else {
  console.log(`\n  Version: ${C.b}${newVersion}${C.r} ${C.gray}(unchanged)${C.r}`);
}

// ── Re-install skills ─────────────────────────────────────────────────────────
console.log('');
const commandsDir = path.join(os.homedir(), '.claude', 'commands');
fs.mkdirSync(commandsDir, { recursive: true });

const SKILLS = ['pge', 'pge-strict', 'pge-quality', 'pge-ultra', 'pge-idontcaretokenanymore', 'pge-god'];
let skillsOk = 0;
for (const skill of SKILLS) {
  const src  = path.join(PLUGIN_ROOT, 'skills', skill, 'SKILL.md');
  const dest = path.join(commandsDir, `${skill}.md`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    skillsOk++;
  }
}
ok(`Skills updated  (${skillsOk}/${SKILLS.length})`);

// ── Re-install agents ─────────────────────────────────────────────────────────
const agentsDir = path.join(os.homedir(), '.claude', 'agents');
fs.mkdirSync(agentsDir, { recursive: true });

const AGENTS = [
  'planner', 'generator', 'evaluator',
  'evaluator-standard', 'evaluator-strict', 'evaluator-quality', 'evaluator-godmode',
  'pge-orchestrator',
];
let agentsOk = 0;
for (const agent of AGENTS) {
  const src  = path.join(PLUGIN_ROOT, 'agents', `${agent}.md`);
  const dest = path.join(agentsDir, `${agent}.md`);
  if (fs.existsSync(src)) {
    if (fs.existsSync(dest)) fs.copyFileSync(dest, `${dest}.bak`);
    fs.copyFileSync(src, dest);
    agentsOk++;
  }
}
ok(`Agents updated  (${agentsOk}/${AGENTS.length})`);

console.log(`\n${C.green}${C.b}Update complete.${C.r} Restart Claude Code to apply changes.\n`);
