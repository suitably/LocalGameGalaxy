// Starts a Jules session and streams progress directly to GitHub issue comments.
// Keeps the workflow running until the agent produces a PR, completes, or fails.
const loadKeys = require('./jules-keys.cjs');

const API = 'https://jules.googleapis.com/v1alpha/sessions';
const DEFAULT_POLL_INTERVAL_MS = 15000;
const DEFAULT_MAX_WAIT_MINUTES = 30;

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

async function streamSession({ github, context, core, issueNumber, sessionId, key, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, maxDurationMs }) {
  const { owner, repo } = context.repo;
  const headers = { 'X-Goog-Api-Key': key.value };
  const seenActivities = new Set();
  const startTime = Date.now();
  const limit = maxDurationMs || (DEFAULT_MAX_WAIT_MINUTES * 60 * 1000);

  console.log(`📡 Streaming Jules session ${sessionId} for Issue #${issueNumber}...`);

  while (Date.now() - startTime < limit) {
    const sessRes = await fetch(`${API}/${sessionId}`, { headers });
    if (!sessRes.ok) {
      core.warning(`Jules session status query failed: HTTP ${sessRes.status}`);
    } else {
      const session = await sessRes.json();

      // 1. Fetch activities & stream new messages to issue
      const actRes = await fetch(`${API}/${sessionId}/activities?pageSize=50`, { headers });
      const activities = actRes.ok ? (await actRes.json()).activities || [] : [];
      activities.sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''));

      for (const a of activities) {
        const id = a.id || String(a.name || '').split('/').pop();
        const text = activityText(a);
        if (!id || !text || a.originator === 'USER' || seenActivities.has(id)) continue;
        seenActivities.add(id);

        console.log(`💬 Streaming Jules update (${id}): ${text.slice(0, 80)}...`);
        await github.rest.issues.createComment({
          owner, repo, issue_number: issueNumber,
          body: `<!-- jules:${id} -->\n🤖 **Jules:**\n\n${text}`,
        });
      }

      // 2. Check for created Pull Request
      const prUrl = (session.outputs || []).map((o) => o.pullRequest?.url).find(Boolean);
      if (prUrl) {
        console.log(`🎉 Pull Request created: ${prUrl}`);
        await github.rest.issues.createComment({
          owner, repo, issue_number: issueNumber,
          body: `<!-- jules:pr-${sessionId} -->\n🔀 Pull Request: ${prUrl}`,
        });

        // Ensure PR body has Fixes #issueNumber
        const prMatch = prUrl.match(/pull\/(\d+)/);
        if (prMatch && github.rest.pulls) {
          try {
            const prNumber = Number(prMatch[1]);
            const pr = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
            const currentBody = pr.data?.body || '';
            if (!new RegExp(`\\b(?:fixes|closes|resolves)\\s+#${issueNumber}\\b`, 'i').test(currentBody)) {
              await github.rest.pulls.update({
                owner, repo, pull_number: prNumber,
                body: `Fixes #${issueNumber}\n\n${currentBody}`,
              });
            }
          } catch (e) {
            core.warning(`Could not update PR body: ${e.message}`);
          }
        }

        await github.rest.issues.createComment({
          owner, repo, issue_number: issueNumber,
          body: `<!-- jules:done-${sessionId} -->\nJules-Session beendet: COMPLETED (PR erstellt)`,
        });
        return { status: 'COMPLETED', prUrl };
      }

      // 3. Check termination status
      if (session.state === 'COMPLETED' || session.state === 'FAILED') {
        console.log(`Jules session finished with state: ${session.state}`);
        await github.rest.issues.createComment({
          owner, repo, issue_number: issueNumber,
          body: `<!-- jules:done-${sessionId} -->\nJules-Session beendet: ${session.state}`,
        });
        return { status: session.state };
      }
    }

    if (Date.now() - startTime + pollIntervalMs >= limit) break;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  const timeoutMsg = `Jules-Session Stream Timeout nach ${Math.round((Date.now() - startTime) / 60000)} Minuten erreicht.`;
  core.warning(timeoutMsg);
  await github.rest.issues.createComment({
    owner, repo, issue_number: issueNumber,
    body: `⚠️ ${timeoutMsg} Bitte Status auf https://jules.google.com/task/${sessionId} prüfen.`,
  });
  return { status: 'TIMEOUT' };
}

module.exports = async ({ github, context, core, pollIntervalMs, maxDurationMs }) => {
  const keys = loadKeys();
  if (keys.length === 0) {
    core.setFailed('No JULES_API_KEY / JULES_API_KEY_* secret configured.');
    return;
  }
  const { owner, repo } = context.repo;
  const issueNumber = Number(process.env.ISSUE_NUMBER);
  const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: issueNumber });

  const prompt = [
    `Task: Fix GitHub Issue #${issueNumber}: ${issue.title}`,
    '',
    'Issue Description:',
    issue.body || 'No description provided',
    '',
    `Include "Fixes #${issueNumber}" in the Pull Request body so GitHub links and auto-closes the issue.`,
  ].join('\n');

  const body = JSON.stringify({
    prompt,
    sourceContext: {
      source: `sources/github/${owner}/${repo}`,
      githubRepoContext: { startingBranch: 'main' },
    },
    requirePlanApproval: false,
    automationMode: 'AUTO_CREATE_PR',
  });

  let lastError = '';
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(issueNumber + i) % keys.length];
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key.value },
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      lastError = `${key.name}: HTTP ${res.status} ${text}`;
      core.warning(lastError);
      continue;
    }
    const session = JSON.parse(text);
    const sessionId = String(session.id || session.name || '').split('/').pop();

    await github.rest.issues.createComment({
      owner, repo, issue_number: issueNumber,
      body: `<!-- jules-key:${key.name} -->\n🤖 Jules gestartet: https://jules.google.com/task/${sessionId}\n\n*Streamt Fortschritt live in dieses Issue...*`,
    });

    // Directly stream until completed/PR created
    return await streamSession({
      github,
      context,
      core,
      issueNumber,
      sessionId,
      key,
      pollIntervalMs,
      maxDurationMs,
    });
  }

  core.setFailed(`All Jules keys failed. Last: ${lastError}`);
};
