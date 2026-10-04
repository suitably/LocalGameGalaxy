// Polls all Jules sessions linked in open issues and posts new agent output once.
const SESSION_RE = /https:\/\/jules\.google\.com\/task\/([A-Za-z0-9_-]+)/;
const MARKER_RE = /<!-- jules:([^ ]+) -->/g;
const KEY_RE = /<!-- jules-key:(\S+) -->/;
const loadKeys = require('./jules-keys.cjs');
const LABEL = 'jules:active';
const API = 'https://jules.googleapis.com/v1alpha/sessions';

function activityText(a) {
  if (a.agentMessaged) return a.agentMessaged.agentMessage || '';
  if (a.planGenerated) {
    const steps = a.planGenerated.plan?.steps || [];
    return steps.map((s, i) => `${i + 1}. ${s.title || ''}`).join('\n');
  }
  if (a.sessionCompleted) return 'Session abgeschlossen.';
  if (a.sessionFailed) return `Session fehlgeschlagen: ${a.sessionFailed.reason || ''}`;
  return '';
}

module.exports = async ({ github, context, core }) => {
  const keys = loadKeys();
  if (keys.length === 0) {
    core.setFailed('No JULES_API_KEY / JULES_API_KEY_* secret configured.');
    return;
  }
  const { owner, repo } = context.repo;

  const issues = await github.paginate(github.rest.issues.listForRepo, {
    owner, repo, state: 'open', labels: LABEL, per_page: 100,
  });

  const failures = [];
  const processIssue = async (issue) => {
    if (issue.pull_request) return;
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner, repo, issue_number: issue.number, per_page: 100,
    });
    const bodies = comments.map((c) => c.body || '');
    const sessionId = [...bodies].reverse().map((b) => b.match(SESSION_RE)?.[1]).find(Boolean);
    if (!sessionId) return;

    const keyName = [...bodies].reverse().map((b) => b.match(KEY_RE)?.[1]).find(Boolean);
    const key = keys.find((k) => k.name === keyName) || keys[issue.number % keys.length];
    const headers = { 'X-Goog-Api-Key': key.value };

    const seen = new Set();
    for (const b of bodies) for (const m of b.matchAll(MARKER_RE)) seen.add(m[1]);
    if (seen.has(`done-${sessionId}`)) return;

    const sessRes = await fetch(`${API}/${sessionId}`, { headers });
    if (!sessRes.ok) {
      throw new Error(`session ${sessionId} -> HTTP ${sessRes.status}`);
    }
    const session = await sessRes.json();
    const actRes = await fetch(`${API}/${sessionId}/activities?pageSize=50`, { headers });
    const activities = actRes.ok ? (await actRes.json()).activities || [] : [];
    activities.sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''));

    for (const a of activities) {
      const id = a.id || String(a.name || '').split('/').pop();
      const text = activityText(a);
      if (!id || !text || a.originator === 'USER' || seen.has(id)) continue;
      await github.rest.issues.createComment({
        owner, repo, issue_number: issue.number,
        body: `<!-- jules:${id} -->\n🤖 **Jules:**\n\n${text}`,
      });
    }

    const prUrl = (session.outputs || []).map((o) => o.pullRequest?.url).find(Boolean);
    if (prUrl && !seen.has(`pr-${sessionId}`)) {
      await github.rest.issues.createComment({
        owner, repo, issue_number: issue.number,
        body: `<!-- jules:pr-${sessionId} -->\n🔀 Pull Request: ${prUrl}`,
      });
      // Safety net: ensure PR description links to this issue
      const prMatch = prUrl.match(/pull\/(\d+)/);
      if (prMatch && github.rest.pulls) {
        try {
          const prNumber = Number(prMatch[1]);
          const pr = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
          const currentBody = pr.data?.body || '';
          if (!new RegExp(`\\b(?:fixes|closes|resolves)\\s+#${issue.number}\\b`, 'i').test(currentBody)) {
            await github.rest.pulls.update({
              owner, repo, pull_number: prNumber,
              body: `Fixes #${issue.number}\n\n${currentBody}`,
            });
          }
        } catch (e) {
          core.warning(`Could not update PR body: ${e.message}`);
        }
      }
    }
    if (prUrl || session.state === 'COMPLETED' || session.state === 'FAILED') {
      if (!seen.has(`done-${sessionId}`)) {
        await github.rest.issues.createComment({
          owner, repo, issue_number: issue.number,
          body: `<!-- jules:done-${sessionId} -->\nJules-Session beendet: ${session.state || 'COMPLETED'}`,
        });
      }
      try {
        await github.rest.issues.removeLabel({ owner, repo, issue_number: issue.number, name: LABEL });
      } catch (e) {
        /* label may already be removed */
      }
    }
  };

  for (const issue of issues) {
    try {
      await processIssue(issue);
    } catch (e) {
      failures.push(`#${issue.number}: ${e.message}`);
      core.warning(`Issue #${issue.number}: ${e.message}`);
    }
  }
  if (failures.length) core.setFailed(`Watcher failed for ${failures.join('; ')}`);
};
