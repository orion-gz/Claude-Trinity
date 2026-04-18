#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workDir   = process.argv[2] || process.cwd();
const stateFile = path.join(workDir, 'pge-workspace', 'pge_state.json');

function notify(title, body) {
  try {
    execSync(
      `osascript -e 'display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)} sound name "Glass"'`,
      { stdio: 'ignore' }
    );
  } catch {}
}

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch { return null; }
}

let prev = readState();

function check() {
  const cur = readState();
  if (!cur || !prev) { prev = cur; return; }

  // Pipeline done
  if (prev.phase !== 'DONE' && cur.phase === 'DONE') {
    notify('PGE — Pipeline Complete ✅', `All ${cur.total_sprints} sprints passed (${cur.mode} mode)`);
  }

  // Escalated — needs human
  if (prev.phase !== 'ESCALATED' && cur.phase === 'ESCALATED') {
    notify('PGE — Intervention Needed 🚨', `Sprint ${cur.sprint_num} failed ${cur.max_retries} times. Manual fix required.`);
  }

  // Sprint advanced (new sprint started)
  if (cur.sprint_num > prev.sprint_num) {
    const prevResult = (prev.sprint_results || {})[String(prev.sprint_num)];
    if (prevResult === 'PASS') {
      notify(`PGE — Sprint ${prev.sprint_num} Passed ✅`, `Moving to sprint ${cur.sprint_num} / ${cur.total_sprints}`);
    }
  }

  // Sprint failed (fail_count increased)
  if ((cur.fail_count || 0) > (prev.fail_count || 0) && cur.phase === 'FIXING') {
    notify(`PGE — Sprint ${cur.sprint_num} Failed ⚠️`, `Retry ${cur.fail_count} / ${cur.max_retries}`);
  }

  prev = cur;
}

// Poll every 3 s
setInterval(check, 3000);

// Also watch directory
const watchDir = path.dirname(stateFile);
let watcher = null;

function startWatcher() {
  if (watcher || !fs.existsSync(watchDir)) return;
  try { watcher = fs.watch(watchDir, check); } catch {}
}
startWatcher();

let prevDirExists = fs.existsSync(watchDir);
setInterval(() => {
  const exists = fs.existsSync(watchDir);
  if (!prevDirExists && exists) startWatcher();
  prevDirExists = exists;
}, 2000);

console.log(`PGE Notify: watching ${stateFile}`);
console.log('macOS notifications will fire on sprint pass/fail, escalation, and pipeline done.');
console.log('Press Ctrl+C to stop.\n');

process.on('SIGINT', () => process.exit(0));
