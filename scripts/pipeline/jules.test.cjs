// Run with: node --test scripts/pipeline  (no dependencies, no install needed)
const test = require('node:test');
const assert = require('node:assert/strict');

const loadKeys = require('./jules-keys.cjs');
const start = require('./jules-start.cjs');

function setEnv(env) {
  for (const k of Object.keys(process.env)) if (k.startsWith('JULES_API_KEY')) delete process.env[k];
  Object.assign(process.env, env);
}

function mockGithub({ issue = { number: 7, title: 'T', body: 'B' }, comments = [], issues = [] } = {}) {
  const calls = { comments: [], pulls: [] };
  const github = {
    paginate: async (fn) => (fn === 'issues' ? issues : comments),
    rest: {
      issues: {
        get: async () => ({ data: issue }),
        createComment: async (a) => calls.comments.push(a.body),
      },
      pulls: {
        get: async () => ({ data: { body: 'initial' } }),
        update: async (a) => calls.pulls.push(a),
      },
    },
  };
  const core = { failed: null, warnings: [], setFailed(m) { this.failed = m; }, warning(m) { this.warnings.push(m); } };
  return { github, core, calls, context: { repo: { owner: 'o', repo: 'r' } } };
}

test('loadKeys returns JULES_API_KEY* sorted, ignores others and empty values', () => {
  setEnv({ JULES_API_KEY_2: 'b', JULES_API_KEY: 'z', JULES_API_KEY_1: 'a', JULES_API_KEY_3: '', OTHER: 'x' });
  assert.deepEqual(loadKeys().map((k) => k.name), ['JULES_API_KEY', 'JULES_API_KEY_1', 'JULES_API_KEY_2']);
});

test('start dispatches session, streams activities and completes on PR creation', async () => {
  setEnv({ JULES_API_KEY_1: 'k1', JULES_API_KEY_2: 'k2', ISSUE_NUMBER: '7' });
  let postCount = 0;
  global.fetch = async (url, init = {}) => {
    if (init.method === 'POST') {
      postCount++;
      return postCount === 1
        ? { ok: false, status: 500, text: async () => 'error' }
        : { ok: true, status: 200, text: async () => JSON.stringify({ name: 'sessions/abc' }) };
    }
    if (url.includes('/activities')) {
      return {
        ok: true,
        json: async () => ({
          activities: [
            { id: 'act-1', createTime: '1', agentMessaged: { agentMessage: 'Analyzing code' } },
          ],
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        state: 'COMPLETED',
        outputs: [{ pullRequest: { url: 'https://github.com/o/r/pull/42' } }],
      }),
    };
  };

  const m = mockGithub();
  const res = await start({ ...m, pollIntervalMs: 10, maxDurationMs: 1000 });

  assert.equal(postCount, 2);
  assert.equal(res.status, 'COMPLETED');
  assert.equal(res.prUrl, 'https://github.com/o/r/pull/42');
  assert.ok(m.calls.comments.some((c) => c.includes('jules.google.com/task/abc')));
  assert.ok(m.calls.comments.some((c) => c.includes('<!-- jules:act-1 -->')));
  assert.ok(m.calls.comments.some((c) => c.includes('Pull Request: https://github.com/o/r/pull/42')));
  assert.ok(m.calls.comments.some((c) => c.includes('COMPLETED (PR erstellt)')));
  assert.equal(m.calls.pulls.length, 1);
  assert.match(m.calls.pulls[0].body, /Fixes #7/);
  assert.equal(m.core.failed, null);
});

test('start fails when all keys fail to start', async () => {
  setEnv({ JULES_API_KEY: 'k', ISSUE_NUMBER: '7' });
  global.fetch = async () => ({ ok: false, status: 403, text: async () => 'forbidden' });
  const m = mockGithub();
  await start({ ...m, pollIntervalMs: 10, maxDurationMs: 1000 });
  assert.match(m.core.failed, /All Jules keys failed/);
  assert.equal(m.calls.comments.length, 0);
});

const agentRunner = require('./jules-agent-runner.cjs');

test('agentRunner discovers agent and dispatches issue + streaming jules session', async () => {
  setEnv({ JULES_API_KEY: 'k', AGENT_TARGET: 'security' });
  const createdIssues = [];
  global.fetch = async (url, init = {}) => {
    if (init.method === 'POST') {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ name: 'sessions/aud123' }),
      };
    }
    if (url.includes('/activities')) {
      return { ok: true, json: async () => ({ activities: [] }) };
    }
    return { ok: true, json: async () => ({ state: 'COMPLETED' }) };
  };

  const m = mockGithub();
  m.github.rest.issues.create = async (a) => {
    createdIssues.push(a);
    return { data: { number: 42 } };
  };

  await agentRunner(m);
  assert.equal(createdIssues.length, 1);
  assert.match(createdIssues[0].title, /\[Audit\] Security & Vulnerability Auditor/);
  assert.match(createdIssues[0].body, /Role: Security & Vulnerability Auditor/);
  assert.ok(m.calls.comments.some((c) => c.includes('jules.google.com/task/aud123')));
});
