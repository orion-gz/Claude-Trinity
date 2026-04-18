#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os   = require('os');

const C = {
  r: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', gray: '\x1b[90m',
};

function ok(msg)   { console.log(`  ${C.green}✓${C.r}  ${msg}`); }
function fail(msg, hint) {
  console.log(`  ${C.red}✗${C.r}  ${msg}`);
  if (hint) console.log(`     ${C.gray}→ ${hint}${C.r}`);
}
function warn(msg, hint) {
  console.log(`  ${C.yellow}!${C.r}  ${msg}`);
  if (hint) console.log(`     ${C.gray}→ ${hint}${C.r}`);
}

function run(cmd) {
  try { return execSync(cmd, { stdio: 'pipe' }).toString().trim(); }
  catch { return null; }
}

console.log(`\n${C.b}PGE Pre-flight Check${C.r}\n`);

// 1. Claude Code
const claudeVer = run('claude --version');
if (claudeVer) ok(`Claude Code found  ${C.gray}(${claudeVer})${C.r}`);
else           fail('Claude Code not found', 'Install from https://claude.ai/download');

// 2. Node.js
const nodeVer = run('node --version');
if (nodeVer) ok(`Node.js ${nodeVer}`);
else         fail('Node.js not found', 'Required to run PGE bridge scripts');

// 3. Git
const gitVer = run('git --version');
if (gitVer) ok(`Git found  ${C.gray}(${gitVer})${C.r}`);
else        fail('Git not found', 'Required for sprint checkpoints');

// 4. Git repo in cwd
const gitRoot = run('git rev-parse --git-dir');
if (gitRoot) ok('Working directory is a git repository');
else         warn('Not a git repo', 'Run `git init` before starting a pipeline');

// 5. Playwright MCP
const settingsFiles = [
  path.join(os.homedir(), '.claude', 'settings.json'),
  path.join(process.cwd(), '.claude', 'settings.json'),
  path.join(process.cwd(), '.mcp.json'),
  path.join(os.homedir(), '.claude', '.mcp.json'),
];

let playwrightFound = false;
for (const f of settingsFiles) {
  try {
    const raw = fs.readFileSync(f, 'utf8');
    if (raw.includes('playwright')) { playwrightFound = true; break; }
  } catch {}
}

if (playwrightFound) ok('Playwright MCP detected in config');
else                 fail('Playwright MCP not found', 'Add to MCP config: npx @playwright/mcp@latest');

// 6. PGE agents installed
const agentsDir = path.join(os.homedir(), '.claude', 'agents');
const required  = ['planner', 'generator', 'evaluator'];
const missing   = required.filter(a => !fs.existsSync(path.join(agentsDir, `${a}.md`)));

if (missing.length === 0) ok('PGE agents installed  (planner, generator, evaluator)');
else                      fail(`Missing agents: ${missing.join(', ')}`, 'Run /plugin install pge-orchestrator');

// 7. PGE skills installed
const commandsDir = path.join(os.homedir(), '.claude', 'commands');
const pgeInstalled = fs.existsSync(path.join(commandsDir, 'pge.md'));

if (pgeInstalled) ok('PGE skills installed  (/pge, /pge-strict, /pge-quality ...)');
else              fail('PGE skills not found', 'Run /plugin install pge-orchestrator');

console.log('');
if (missing.length === 0 && pgeInstalled && playwrightFound && gitVer) {
  console.log(`${C.green}${C.b}All checks passed. Ready to run /pge.${C.r}\n`);
} else {
  console.log(`${C.yellow}Fix the issues above before starting a pipeline.${C.r}\n`);
  process.exit(1);
}
