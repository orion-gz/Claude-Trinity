#!/usr/bin/env node
'use strict';

/**
 * pge-usage-guard.cjs
 *
 * Background process that monitors Claude Code token usage.
 * When usage crosses the configured threshold, writes .pause-signal
 * to pge-workspace/ so the PGE orchestrator pauses at the next
 * phase boundary.
 *
 * Usage: node pge-usage-guard.cjs [cwd]
 */

const fs           = require('fs');
const path         = require('path');
const os           = require('os');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(os.homedir(), '.claude', 'pge-limit-config.json');
const PID_FILE    = '/tmp/pge-usage-guard.pid';
const POLL_MS     = 60 * 1000; // 1 minute

// Write PID for cleanup
try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch {}

// ── Config ─────────────────────────────────────────────────────────────────────
function loadConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (!cfg.enabled) return null;
    return cfg;
  } catch { return null; }
}

// ── Token counting from Claude Code JSONL files ────────────────────────────────
function getWindowMs(type) {
  return type === 'weekly'
    ? 7 * 24 * 60 * 60 * 1000
    : 5 * 60 * 60 * 1000;
}

function readTokensFromJSONL(type) {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(projectsDir)) return 0;

  const cutoff = Date.now() - getWindowMs(type);
  let total = 0;

  try {
    for (const proj of fs.readdirSync(projectsDir)) {
      const projPath = path.join(projectsDir, proj);
      try {
        if (!fs.statSync(projPath).isDirectory()) continue;
        for (const file of fs.readdirSync(projPath).filter(f => f.endsWith('.jsonl'))) {
          try {
            const lines = fs.readFileSync(path.join(projPath, file), 'utf8').split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const entry = JSON.parse(line);
                const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;
                if (ts < cutoff) continue;
                // Usage can be at top level or nested in message
                const u = entry.usage || entry.message?.usage;
                if (!u) continue;
                total += (u.input_tokens                || 0)
                       + (u.output_tokens               || 0)
                       + (u.cache_read_input_tokens     || 0)
                       + (u.cache_creation_input_tokens || 0);
              } catch {}
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}

  return total;
}

// ── ccusage fallback ───────────────────────────────────────────────────────────
function tryGetCcusagePct() {
  try {
    const out = execSync('ccusage blocks --json 2>/dev/null', {
      encoding: 'utf8', timeout: 5000,
    });
    const data = JSON.parse(out);
    // Try common ccusage output shapes
    if (typeof data.limitPct      === 'number') return data.limitPct;
    if (typeof data.usagePct      === 'number') return data.usagePct;
    if (data.usage && typeof data.usage.pct === 'number') return data.usage.pct;
  } catch {}
  return null;
}

// ── Usage percentage ───────────────────────────────────────────────────────────
function getUsagePct(config) {
  const { type = '5h', maxTokens } = config;

  if (maxTokens) {
    const tokens = readTokensFromJSONL(type);
    return { pct: (tokens / maxTokens) * 100, tokens };
  }

  // No maxTokens — try ccusage
  const pct = tryGetCcusagePct();
  if (pct !== null) return { pct, tokens: null };

  return null; // Cannot determine
}

// ── Pause signal ───────────────────────────────────────────────────────────────
function writePauseSignal(cwd, config, pct, tokens) {
  const workspaceDir = path.join(cwd, 'pge-workspace');
  if (!fs.existsSync(workspaceDir)) return false;
  fs.writeFileSync(
    path.join(workspaceDir, '.pause-signal'),
    JSON.stringify({
      triggeredAt  : new Date().toISOString(),
      usageTokens  : tokens  || 0,
      usagePct     : Number(pct.toFixed(2)),
      threshold    : config.threshold,
      type         : config.type || '5h',
    }, null, 2),
  );
  return true;
}

function notify(pct, threshold) {
  try {
    execSync(
      `osascript -e 'display notification "Usage ${pct.toFixed(1)}% — PGE pausing to preserve tokens" `
      + `with title "PGE Usage Limit" subtitle "Threshold: ${threshold}%" sound name "Basso"'`,
      { stdio: 'ignore', timeout: 3000 },
    );
  } catch {}
}

// ── Pipeline state check ───────────────────────────────────────────────────────
function isPipelineActive(cwd) {
  const stateFile = path.join(cwd, 'pge-workspace', 'pge_state.json');
  if (!fs.existsSync(stateFile)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return !['DONE', 'PAUSED', 'ESCALATED'].includes(state.phase);
  } catch { return false; }
}

// ── Main poll loop ─────────────────────────────────────────────────────────────
function check(cwd) {
  const config = loadConfig();
  if (!config) {
    console.log('[pge-usage-guard] Config disabled or missing. Exiting.');
    process.exit(0);
  }

  if (!isPipelineActive(cwd)) {
    // Nothing running — keep watching in case a pipeline starts
    return;
  }

  const result = getUsagePct(config);
  if (!result) {
    console.log('[pge-usage-guard] Cannot determine usage %. Set --max <tokens> or install ccusage.');
    return;
  }

  const { pct, tokens } = result;
  console.log(`[pge-usage-guard] ${new Date().toISOString()} usage=${pct.toFixed(1)}% threshold=${config.threshold}%`);

  if (pct >= config.threshold) {
    console.log('[pge-usage-guard] Threshold reached — writing pause signal.');
    if (writePauseSignal(cwd, config, pct, tokens)) {
      notify(pct, config.threshold);
      console.log('[pge-usage-guard] Pause signal written. PGE will stop at next phase boundary.');
    }
    process.exit(0);
  }
}

const cwd = process.argv[2] || process.cwd();
console.log(`[pge-usage-guard] Started. Watching: ${cwd}`);

check(cwd);
setInterval(() => check(cwd), POLL_MS);
