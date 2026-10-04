// Discovers and dispatches scheduled agents from .github/agents/*.md
const fs = require('node:fs');
const path = require('node:path');
const startJules = require('./jules-start.cjs');

const AGENTS_DIR = path.resolve(__dirname, '../../.github/agents');
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseAgentFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const rawMeta = match[1];
  const prompt = match[2].trim();
  const meta = {};
  for (const line of rawMeta.split('\n')) {
    const kv = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (kv) {
      let val = kv[2].trim();
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      meta[kv[1]] = val;
    }
  }
  return { ...meta, prompt, file: path.basename(filePath) };
}

module.exports = async ({ github, context, core }) => {
  const targetAgent = process.env.AGENT_TARGET || 'all';
  const today = DAYS[new Date().getDay()];

  if (!fs.existsSync(AGENTS_DIR)) {
    console.log('No .github/agents directory found. Skipping.');
    return;
  }

  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const agents = files.map((f) => parseAgentFile(path.join(AGENTS_DIR, f))).filter(Boolean);

  console.log(`Discovered ${agents.length} agent definition(s). Today is ${today}. Target filter: ${targetAgent}`);

  const toRun = agents.filter((agent) => {
    if (targetAgent !== 'all') {
      return agent.id === targetAgent || agent.file === targetAgent || agent.file === `${targetAgent}.md`;
    }
    if (!agent.enabled) return false;
    const schedule = (agent.schedule || '').toLowerCase();
    return schedule === 'daily' || schedule === today;
  });

  if (toRun.length === 0) {
    console.log('No agents scheduled for execution.');
    return;
  }

  const { owner, repo } = context.repo;
  const dateStr = new Date().toISOString().slice(0, 10);

  for (const agent of toRun) {
    console.log(`▶ Starting agent: ${agent.name || agent.id} (${agent.id})`);
    
    // Create tracking issue for the audit run
    const issueTitle = `[Audit] ${agent.name || agent.id} (${dateStr})`;
    const issueBody = [
      `### 🤖 Scheduled Agent Audit: ${agent.name || agent.id}`,
      '',
      `**Agent ID:** \`${agent.id}\``,
      `**Date:** ${dateStr}`,
      '',
      '---',
      '#### Agent Instructions:',
      agent.prompt,
    ].join('\n');

    const issue = await github.rest.issues.create({
      owner,
      repo,
      title: issueTitle,
      body: issueBody,
    });

    console.log(`Created tracking issue #${issue.data.number} for agent ${agent.id}`);

    // Set ISSUE_NUMBER and dispatch Jules
    process.env.ISSUE_NUMBER = String(issue.data.number);
    await startJules({ github, context, core });
  }
};
