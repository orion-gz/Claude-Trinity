#!/usr/bin/env node
'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const C = {
  r: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', gray: '\x1b[90m',
};

const force    = process.argv.includes('--force');
const workDir  = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]) || process.cwd();
const wsDir    = path.join(workDir, 'pge-workspace');

if (!fs.existsSync(wsDir)) {
  console.log(`${C.gray}No pge-workspace found in ${workDir}${C.r}`);
  process.exit(0);
}

// Count files
const files = fs.readdirSync(wsDir);
console.log(`\n${C.b}PGE Clean${C.r}`);
console.log(`  Directory : ${wsDir}`);
console.log(`  Files     : ${files.length}`);
console.log('');

function doClean() {
  fs.rmSync(wsDir, { recursive: true, force: true });
  console.log(`${C.green}✓ Removed pge-workspace/${C.r}\n`);
}

if (force) {
  doClean();
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`${C.yellow}Delete pge-workspace/? This cannot be undone. [y/N] ${C.r}`, (ans) => {
    rl.close();
    if (ans.trim().toLowerCase() === 'y') doClean();
    else console.log(`${C.gray}Aborted.${C.r}\n`);
  });
}
