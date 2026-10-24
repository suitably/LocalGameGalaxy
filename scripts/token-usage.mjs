#!/usr/bin/env node
/**
 * Token usage and cost estimate for one Claude Code session, split into main session and subagents.
 * Reads the local transcripts (~/.claude/projects/<project>/<session>.jsonl and <session>/subagents/).
 *
 *   node scripts/token-usage.mjs                 # newest session of this project
 *   node scripts/token-usage.mjs <session-id>    # a specific session
 *   node scripts/token-usage.mjs --list          # sessions of this project, newest first
 *   node scripts/token-usage.mjs --json          # machine-readable output (for PR descriptions or tracking)
 *
 * Costs are estimates from list prices (USD per million tokens, checked 2026-10-24); subscription plans bill differently,
 * so compare sessions by the relative numbers, not the absolute dollars.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// USD per million tokens. Cache writes: 5-minute TTL 1.25x input, 1-hour TTL 2x input.
const PRICES = {
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 1 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  // Prompts above 100K tokens are billed at the long-context rate.
  'claude-haiku-5-5': {
    input: 0.1,
    output: 0.5,
    cacheRead: 0.01,
    long: { above: 100_000, input: 0.5, output: 2.5, cacheRead: 0.05 },
  },
};

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const sessionArg = args.find((a) => !a.startsWith('--'));
const projectsRoot = path.join(os.homedir(), '.claude', 'projects');
const projectDir = path.join(projectsRoot, process.cwd().replace(/[/.]/g, '-'));

function sessionsByAge() {
  if (!fs.existsSync(projectDir)) return [];
  return fs
    .readdirSync(projectDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ id: f.slice(0, -6), mtime: fs.statSync(path.join(projectDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

function readJsonl(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function emptyTotals() {
  return {
    calls: 0,
    input: 0,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
    cacheRead: 0,
    output: 0,
    maxPrompt: 0,
    cost: 0,
    unpriced: 0,
  };
}

function costOf(model, u, prompt) {
  const base = PRICES[model];
  if (!base) return null;
  const p = base.long && prompt > base.long.above ? { ...base, ...base.long } : base;
  const perToken = (rate) => rate / 1_000_000;
  return (
    u.input * perToken(p.input) +
    u.cacheWrite5m * perToken(p.input * 1.25) +
    u.cacheWrite1h * perToken(p.input * 2) +
    u.cacheRead * perToken(p.cacheRead) +
    u.output * perToken(p.output)
  );
}

/** Sums usage per model; a streamed message repeats its usage on several lines, so count each message id once. */
function summarize(file) {
  const byModel = {};
  const seen = new Set();
  for (const entry of readJsonl(file)) {
    const msg = entry.message;
    if (!msg?.usage || !msg.model || seen.has(msg.id)) continue;
    seen.add(msg.id);
    const raw = msg.usage;
    const write1h = raw.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    const u = {
      input: raw.input_tokens ?? 0,
      cacheWrite1h: write1h,
      cacheWrite5m: (raw.cache_creation_input_tokens ?? 0) - write1h,
      cacheRead: raw.cache_read_input_tokens ?? 0,
      output: raw.output_tokens ?? 0,
    };
    const prompt = u.input + u.cacheWrite1h + u.cacheWrite5m + u.cacheRead;
    const t = (byModel[msg.model] ??= emptyTotals());
    t.calls += 1;
    for (const key of Object.keys(u)) t[key] += u[key];
    t.maxPrompt = Math.max(t.maxPrompt, prompt);
    const cost = costOf(msg.model, u, prompt);
    if (cost === null) t.unpriced += 1;
    else t.cost += cost;
  }
  return byModel;
}

function sourcesFor(sessionId) {
  const main = path.join(projectDir, `${sessionId}.jsonl`);
  if (!fs.existsSync(main)) throw new Error(`No transcript ${main}`);
  const sources = [{ name: 'main', label: 'main session', file: main }];
  const subDir = path.join(projectDir, sessionId, 'subagents');
  if (fs.existsSync(subDir)) {
    for (const f of fs
      .readdirSync(subDir)
      .filter((n) => n.endsWith('.jsonl'))
      .sort()) {
      const metaFile = path.join(subDir, f.replace(/\.jsonl$/, '.meta.json'));
      const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
      sources.push({
        name: f.slice(0, -6),
        label: `${meta.agentType ?? 'agent'}: ${meta.description ?? ''}`.trim(),
        file: path.join(subDir, f),
      });
    }
  }
  return sources;
}

const k = (n) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(1)}k`
      : String(n);

function printReport(sessionId, rows) {
  const lines = [
    ['source', 'model', 'calls', 'input', 'write', 'read', 'output', 'max ctx', 'est. $'],
  ];
  const total = { cost: 0, unpriced: 0 };
  for (const row of rows) {
    for (const [model, t] of Object.entries(row.byModel)) {
      total.cost += t.cost;
      total.unpriced += t.unpriced;
      const cost = t.unpriced ? `${t.cost.toFixed(2)}+?` : t.cost.toFixed(2);
      lines.push(
        [
          row.label.slice(0, 40),
          model,
          t.calls,
          k(t.input),
          k(t.cacheWrite5m + t.cacheWrite1h),
          k(t.cacheRead),
          k(t.output),
          k(t.maxPrompt),
          cost,
        ].map(String),
      );
    }
  }
  const widths = lines[0].map((_, i) => Math.max(...lines.map((l) => l[i].length)));
  console.log(`Session ${sessionId}\n`);
  for (const l of lines)
    console.log(
      l.map((cell, i) => (i < 2 ? cell.padEnd(widths[i]) : cell.padStart(widths[i]))).join('  '),
    );
  console.log(
    `\nTotal est. $${total.cost.toFixed(2)}${total.unpriced ? ` (+${total.unpriced} calls on unpriced models)` : ''}`,
  );
}

if (args.includes('--list')) {
  for (const s of sessionsByAge()) console.log(`${new Date(s.mtime).toISOString()}  ${s.id}`);
  process.exit(0);
}

const sessionId = sessionArg ?? sessionsByAge()[0]?.id;
if (!sessionId) {
  console.error(`No sessions found in ${projectDir}`);
  process.exit(1);
}

const rows = sourcesFor(sessionId).map((s) => ({ ...s, byModel: summarize(s.file) }));
if (asJson) {
  console.log(
    JSON.stringify(
      { sessionId, sources: rows.map(({ name, label, byModel }) => ({ name, label, byModel })) },
      null,
      2,
    ),
  );
} else {
  printReport(sessionId, rows);
}
