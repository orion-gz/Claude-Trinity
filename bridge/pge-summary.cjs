#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const C = {
  r: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m', mag: '\x1b[35m',
};

const workDir = process.argv[2] || process.cwd();
const wsDir   = path.join(workDir, 'pge-workspace');
const stateF  = path.join(wsDir, 'pge_state.json');

if (!fs.existsSync(wsDir)) {
  console.log(`${C.yellow}No pge-workspace found in ${workDir}${C.r}`);
  process.exit(1);
}

// Read state
let state = {};
try { state = JSON.parse(fs.readFileSync(stateF, 'utf8')); } catch {}

const {
  mode = '?', phase = '?',
  sprint_num: sn = 0, total_sprints: st = 0,
  sprint_results = {}, sprint_modes = {},
} = state;

const W = 56;
const hr = '─'.repeat(W);

function row(label, value) {
  const l = `  ${C.gray}${label.padEnd(12)}${C.r}`;
  return `${l}${value}`;
}

console.log('');
console.log(`${C.b}${C.cyan}┌${hr}┐${C.r}`);
console.log(`${C.cyan}│${C.r} ${C.b}PGE Pipeline Summary${C.r}${' '.repeat(W - 20)}${C.cyan}│${C.r}`);
console.log(`${C.cyan}├${hr}┤${C.r}`);
console.log(row('Mode',   `${C.b}${mode}${C.r}`));
console.log(row('Phase',  `${C.b}${phase}${C.r}`));
console.log(row('Sprints', `${C.b}${sn}${C.r}${C.gray} / ${st}${C.r}`));
console.log(`${C.cyan}├${hr}┤${C.r}`);

// Sprint breakdown
const passIcon = `${C.green}PASS${C.r}`;
const failIcon = `${C.red}FAIL${C.r}`;

for (let i = 1; i <= (st || sn); i++) {
  const result    = sprint_results[String(i)];
  const sprintMode = sprint_modes[String(i)] || mode;
  const resultStr = result === 'PASS' ? passIcon : result === 'FAIL' ? failIcon : `${C.gray}...${C.r}`;
  const isCurrent = i === sn && phase !== 'DONE';

  const evalFile = path.join(wsDir, `sprint_${i}_evaluation.md`);
  let scores = '';

  // Try to extract scores from evaluation file
  if (fs.existsSync(evalFile)) {
    const txt = fs.readFileSync(evalFile, 'utf8');
    const match = txt.match(/\*\*Overall\*\*[:\s]+(\d+)\s*\/\s*5/i)
      || txt.match(/Overall[:\s]+(\d+)\s*\/\s*5/i);
    if (match) scores = `  ${C.gray}(${match[1]}/5 overall)${C.r}`;
  }

  const curr = isCurrent ? ` ${C.yellow}← current${C.r}` : '';
  console.log(`  ${C.gray}Sprint ${i}${C.r}  ${resultStr}  ${C.d}evaluator-${sprintMode}${C.r}${scores}${curr}`);
}

console.log(`${C.cyan}└${hr}┘${C.r}`);

// Print pge_summary.md if it exists
const summaryF = path.join(wsDir, 'pge_summary.md');
if (fs.existsSync(summaryF)) {
  console.log('');
  console.log(`${C.b}Final Report${C.r}  ${C.gray}(pge_summary.md)${C.r}`);
  console.log(`${C.gray}${'─'.repeat(W)}${C.r}`);
  const txt = fs.readFileSync(summaryF, 'utf8');
  // Print first 60 lines
  const lines = txt.split('\n').slice(0, 60);
  console.log(lines.join('\n'));
  if (txt.split('\n').length > 60) {
    console.log(`\n${C.gray}... (truncated — open pge-workspace/pge_summary.md for full report)${C.r}`);
  }
}

console.log('');
