// Run with: node --test scripts/pipeline  (no dependencies, no install needed)
const test = require('node:test');
const assert = require('node:assert/strict');

const loadKeys = require('./jules-keys.cjs');
const start = require('./jules-start.cjs');
const watch = require('./jules-watch.cjs');

function setEnv(env) {
  for (const k of Object.keys(process.env)) if (k.startsWith('JULES_API_KEY')) delete process.env[k];
  Object.assign(process.env, env);
}

function mockGithub({ issue = { number: 7, title: 'T', body: 'B' }, comments = [], issues = [] } = {}) {
  const calls = { comments: [], labels: [], removed: [], pulls: [] };
  const github = {
    paginate: async (fn) => (fn === 'issues' ? issues : comments),
    rest: {
      issues: {
        get: async () => ({ data: issue }),
        listForRepo: 'issues',
        listComments: 'comments',
        createComment: async (a) => calls.comments.push(a.body),
        addLabels: async (a) => calls.labels.push(...a.labels),
        removeLabel: async (a) => calls.removed.push(a.name),
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

test('start sends title + body + PR instructions, falls back to next key, labels before commenting', async () => {
  setEnv({ JULES_API_KEY_1: 'k1', JULES_API_KEY_2: 'k2', ISSUE_NUMBER: '7' });
  const seen = [];
  global.fetch = async (url, init) => {
    seen.push({ key: init.headers['X-Goog-Api-Key'], body: JSON.parse(init.body) });
    return seen.length === 1
      ? { ok: false, status: 500, text: async () => 'boom' }
      : { ok: true, status: 200, text: async () => JSON.stringify({ name: 'sessions/abc' }) };
  };
  const m = mockGithub();
  await start(m);
  assert.equal(seen.length, 2);
  assert.match(seen[0].body.prompt, /Task: Fix GitHub Issue #7: T/);
  assert.match(seen[0].body.prompt, /Fixes #7/);
  assert.equal(seen[1].body.requirePlanApproval, false);
  assert.deepEqual(m.calls.labels, ['jules:active']);
  assert.match(m.calls.comments[0], /jules-key:JULES_API_KEY_\d/);
  assert.match(m.calls.comments[0], /jules\.google\.com\/task\/abc/);
  assert.equal(m.core.failed, null);
});

test('start fails when all keys fail', async () => {
  setEnv({ JULES_API_KEY: 'k', ISSUE_NUMBER: '7' });
  global.fetch = async () => ({ ok: false, status: 403, text: async () => 'no' });
  const m = mockGithub();
  await start(m);
  assert.match(m.core.failed, /All Jules keys failed/);
  assert.equal(m.calls.comments.length, 0);
});

function julesFetch(session, activities) {
  return async (url) =>
    url.includes('/activities')
      ? { ok: true, json: async () => ({ activities }) }
      : { ok: true, json: async () => session };
}

test('watch posts new agent messages once and finishes the session', async () => {
  setEnv({ JULES_API_KEY: 'k' });
  global.fetch = julesFetch(
    { state: 'COMPLETED', outputs: [{ pullRequest: { url: 'https://github.com/o/r/pull/1' } }] },
    [
      { id: 'a1', createTime: '1', agentMessaged: { agentMessage: 'neu' } },
      { id: 'a2', createTime: '2', agentMessaged: { agentMessage: 'alt' } },
    ],
  );
  const m = mockGithub({
    issues: [{ number: 7 }],
    comments: [
      { body: 'https://jules.google.com/task/abc' },
      { body: '<!-- jules:a2 -->\nalt' },
    ],
  });
  await watch(m);
  assert.equal(m.calls.comments.filter((c) => c.includes('<!-- jules:a1 -->')).length, 1);
  assert.ok(!m.calls.comments.some((c) => c.includes('<!-- jules:a2 -->')));
  assert.ok(m.calls.comments.some((c) => c.includes('pull/1')));
  assert.ok(m.calls.comments.some((c) => c.includes('jules:done-abc')));
  assert.deepEqual(m.calls.removed, ['jules:active']);
});

test('watch skips finished sessions and reports API errors without aborting others', async () => {
  setEnv({ JULES_API_KEY: 'k' });
  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const m = mockGithub({
    issues: [{ number: 1 }, { number: 2 }],
    comments: [{ body: 'https://jules.google.com/task/abc' }],
  });
  await watch(m);
  assert.equal(m.core.warnings.length, 2);
  assert.match(m.core.failed, /#1.*#2/);
});
