#!/usr/bin/env node
'use strict';

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

const SKILLS = ['pge', 'pge-strict', 'pge-quality', 'pge-ultra', 'pge-idontcaretokenanymore', 'pge-god'];
const AGENTS = [
  'planner', 'generator', 'evaluator',
  'evaluator-standard', 'evaluator-strict', 'evaluator-quality', 'evaluator-godmode',
  'pge-orchestrator',
];

function install() {
  const commandsDir = path.join(os.homedir(), '.claude', 'commands');
  const agentsDir = path.join(os.homedir(), '.claude', 'agents');

  fs.mkdirSync(commandsDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });

  for (const skill of SKILLS) {
    const src = path.join(PLUGIN_ROOT, 'skills', skill, 'SKILL.md');
    const dest = path.join(commandsDir, `${skill}.md`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  for (const agent of AGENTS) {
    const src = path.join(PLUGIN_ROOT, 'agents', `${agent}.md`);
    const dest = path.join(agentsDir, `${agent}.md`);
    if (fs.existsSync(src)) {
      if (fs.existsSync(dest)) fs.copyFileSync(dest, `${dest}.bak`);
      fs.copyFileSync(src, dest);
    }
  }
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line.trim()); } catch { return; }
  if (!msg || msg.jsonrpc !== '2.0') return;

  const { id, method } = msg;

  if (method === 'initialize') {
    try { install(); } catch {}
    send({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'pge-orchestrator', version: '2.4.0' },
      },
    });
  } else if (method === 'notifications/initialized') {
    // no response for notifications
  } else if (method === 'tools/list') {
    send({
      jsonrpc: '2.0', id,
      result: {
        tools: [{
          name: 'pge_status',
          description: 'Check PGE Orchestrator installation status',
          inputSchema: { type: 'object', properties: {}, required: [] },
        }],
      },
    });
  } else if (method === 'tools/call') {
    const commandsDir = path.join(os.homedir(), '.claude', 'commands');
    const agentsDir = path.join(os.homedir(), '.claude', 'agents');
    const installedSkills = SKILLS.filter(s => fs.existsSync(path.join(commandsDir, `${s}.md`)));
    const installedAgents = AGENTS.filter(a => fs.existsSync(path.join(agentsDir, `${a}.md`)));
    send({
      jsonrpc: '2.0', id,
      result: {
        content: [{
          type: 'text',
          text: [
            `PGE Orchestrator v2.4.0`,
            `Plugin root: ${PLUGIN_ROOT}`,
            ``,
            `Skills  (${installedSkills.length}/${SKILLS.length}): ${installedSkills.join(', ') || 'none'}`,
            `Agents  (${installedAgents.length}/${AGENTS.length}): ${installedAgents.join(', ') || 'none'}`,
          ].join('\n'),
        }],
      },
    });
  } else if (id !== undefined) {
    send({ jsonrpc: '2.0', id, result: {} });
  }
});
