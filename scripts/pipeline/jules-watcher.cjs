const { setSingleJulesLabel } = require('./jules-label-manager.cjs');

module.exports = async ({ github, context, core }) => {
  const targetIssueNumber = process.env.ISSUE_NUMBER ? Number(process.env.ISSUE_NUMBER) : null;
  const initialSessionId = process.env.SESSION_ID || null;
  const maxWaitSeconds = process.env.MAX_WAIT_SECONDS ? Number(process.env.MAX_WAIT_SECONDS) : 1;
  const pollIntervalMs = 5000;

  // Gather Jules API keys
  const keys = [
    process.env.JULES_API_KEY_1,
    process.env.JULES_API_KEY_2,
    process.env.JULES_API_KEY_3,
    process.env.JULES_API_KEY_4,
    process.env.JULES_API_KEY_5,
    process.env.JULES_API_KEY
  ].filter(Boolean);

  if (keys.length === 0) {
    console.log('No Jules API keys configured. Skipping watcher.');
    return;
  }

  function getApiKey(issueNum) {
    const idx = (issueNum || 1) % keys.length;
    return keys[idx];
  }

  function parseActivity(a) {
    if (!a) return { time: '', tag: 'SYSTEM', text: '' };
    const time = a.createTime ? new Date(a.createTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
    let tag = (a.originator || a.type || 'AGENT').toUpperCase();
    let text = '';

    if (a.agentMessaged) {
      const am = a.agentMessaged;
      text = am.agentMessage || am.message || am.text || am.prompt || am.content || '';
    } else if (a.userMessaged) {
      const um = a.userMessaged;
      text = um.userMessage || um.message || um.text || um.prompt || um.content || '';
    } else if (a.progressUpdated) {
      const pu = a.progressUpdated;
      text = pu.title || pu.description || pu.message || '';
    } else if (a.planGenerated) {
      tag = 'PLAN';
      const pg = a.planGenerated;
      let planText = pg.plan?.steps ? `### 📋 Proposed Plan (${pg.plan.steps.length} steps)` : (pg.title || '### 📋 Proposed Plan');
      if (pg.plan?.steps && Array.isArray(pg.plan.steps)) {
        planText += '\n\n';
        pg.plan.steps.forEach((step, i) => {
          planText += `${i + 1}. **${step.title || 'Step'}**\n`;
          if (step.description) planText += `   ${step.description}\n`;
        });
      }
      text = planText;
    } else if (a.sessionCompleted) {
      tag = 'COMPLETED';
      text = 'Task completed successfully 🎉';
    } else if (a.sessionFailed) {
      tag = 'FAILED';
      text = `Task failed: ${a.sessionFailed.reason || ''}`;
    }

    if (!text && typeof a.message === 'string' && a.message) text = a.message;
    if (!text && typeof a.title === 'string' && a.title) text = a.title;
    if (!text && typeof a.description === 'string' && a.description) text = a.description;
    if (!text && typeof a.summary === 'string' && a.summary) text = a.summary;

    return { time, tag, text: text.trim() };
  }

  async function checkIssueSession(issueNumber, explicitSessionId = null) {
    console.log(`Checking issue #${issueNumber}...`);

    // 1. Get comments to find session ID and seen activities
    let comments = [];
    try {
      const commentsRes = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        per_page: 100
      });
      comments = commentsRes.data || [];
    } catch (e) {
      console.warn(`Could not fetch comments for issue #${issueNumber}:`, e.message);
      return false;
    }

    let sessionId = explicitSessionId;
    if (!sessionId) {
      for (let i = comments.length - 1; i >= 0; i--) {
        const body = comments[i].body || '';
        const match = body.match(/https:\/\/jules\.google\.com\/task\/([a-zA-Z0-9_\-]+)/);
        if (match) {
          sessionId = match[1];
          break;
        }
      }
    }

    if (!sessionId) {
      console.log(`No active Jules session found on issue #${issueNumber}.`);
      return false;
    }

    // Extract all previously posted activity markers to avoid duplicate comments
    const postedMarkers = new Set();
    for (const c of comments) {
      const body = c.body || '';
      const markerMatches = body.matchAll(/<!-- jules-(?:activity|marker):([a-zA-Z0-9_\-]+) -->/g);
      for (const m of markerMatches) {
        postedMarkers.add(m[1]);
      }
    }

    // 2. Query Jules API
    const apiKey = getApiKey(issueNumber);
    let sessionData = null;
    let activitiesData = null;

    try {
      const sessRes = await fetch(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, {
        headers: { 'X-Goog-Api-Key': apiKey }
      });
      if (sessRes.ok) {
        sessionData = await sessRes.json();
      } else {
        console.warn(`Failed to fetch session ${sessionId}: status ${sessRes.status}`);
        return false;
      }

      const actRes = await fetch(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}/activities?pageSize=30`, {
        headers: { 'X-Goog-Api-Key': apiKey }
      });
      if (actRes.ok) {
        activitiesData = await actRes.json();
      }
    } catch (e) {
      console.warn(`Error querying Jules API for session ${sessionId}:`, e.message);
      return false;
    }

    const state = sessionData?.state || 'UNKNOWN';
    console.log(`Session ${sessionId} (Issue #${issueNumber}) state: ${state}`);

    const rawActivities = activitiesData?.activities || [];
    // Sort chronologically
    rawActivities.sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''));

    // Calculate if activities contain code or PR
    let hasPrOrCode = false;
    for (const a of rawActivities) {
      if ((a.artifacts && a.artifacts.length > 0) || a.changeSet || a.pullRequest || /pull\/\d+|created pull request|gitPatch/i.test(JSON.stringify(a))) {
        hasPrOrCode = true;
      }
    }

    // 3. First, check if a Pull Request already exists for this issue
    let prUrl = null;
    let prNumber = null;
    try {
      const pullsRes = await github.rest.pulls.list({
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: 'all',
        per_page: 30
      });
      for (const pr of pullsRes.data || []) {
        const branch = pr.head?.ref || '';
        const body = pr.body || '';
        const title = pr.title || '';
        if (branch.includes(`issue-${issueNumber}`) || 
            branch.includes(`issue${issueNumber}`) ||
            branch.startsWith('jules/') ||
            new RegExp(`#${issueNumber}\\b`).test(body) ||
            new RegExp(`#${issueNumber}\\b`).test(title)) {
          prUrl = pr.html_url;
          prNumber = pr.number;
          break;
        }
      }
    } catch (e) {}

    // If PR was created or session completed with code, finalize immediately!
    if (prUrl || (state === 'COMPLETED' && hasPrOrCode)) {
      const completionMarker = `completed-${sessionId}`;
      if (!postedMarkers.has(completionMarker)) {
        try {
          await setSingleJulesLabel(github, context, issueNumber, null);

          // Find branch to construct preview link
          let prBranch = '';
          for (const pr of pullsRes.data || []) {
            if (pr.number === prNumber) {
              prBranch = pr.head?.ref || '';
              break;
            }
          }
          const sanitizedBranch = prBranch.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const previewUrl = sanitizedBranch ? `https://${sanitizedBranch}.nexumia.de/` : '';
          const previewLine = previewUrl ? `\n🌐 **Cloudflare Preview:** [${previewUrl}](${previewUrl})` : '';

          const prLinkText = prUrl ? `\n\n👉 **Pull Request:** [#${prNumber} - Jules PR](${prUrl})` : '';
          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issueNumber,
            body: `<!-- jules-marker:${completionMarker} -->\n🎉 **Jules hat die Aufgabe erfolgreich abgeschlossen!**${prLinkText}${previewLine}\n\nDer Pull Request wurde erstellt und die Verifikation läuft.`
          });
          console.log(`Marked issue #${issueNumber} as completed (PR: ${prNumber || 'found'}).`);

          // Update PR body if missing preview URL
          if (prNumber && previewUrl) {
            try {
              const prRes = await github.rest.pulls.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: prNumber
              });
              const currentBody = prRes.data?.body || '';
              if (!currentBody.includes('nexumia.de')) {
                await github.rest.pulls.update({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  pull_number: prNumber,
                  body: `> 🚀 **Cloudflare Preview:** [${previewUrl}](${previewUrl})\n\n${currentBody}`
                });
              }
            } catch (e) {}
          }

          return true;
        } catch (e) {}
      }
      return false; // Already handled
    }

    // 4. Check chronologically for unposted plan or question (only if no PR exists yet)
    for (let i = rawActivities.length - 1; i >= 0; i--) {
      const act = rawActivities[i];
      if (act.originator === 'USER' || act.userMessaged) continue;

      const actId = act.id || `act-${i}`;
      if (postedMarkers.has(actId)) {
        continue;
      }

      const parsed = parseActivity(act);
      if (!parsed.text) continue;

      // Detect if this activity represents a genuine implementation plan
      const isPlan = Boolean(act.planGenerated) || 
        parsed.tag === 'PLAN' || 
        parsed.text.includes('### 📋 Proposed Plan') ||
        /^\s*###?\s*📋?\s*proposed plan/i.test(parsed.text) ||
        /\b(proposed implementation plan|here is the proposed plan)\b/i.test(parsed.text);

      const isAgentMessage = Boolean(act.agentMessaged);

      // Skip internal progress updates that do not represent direct messages to the user
      if (!isPlan && !isAgentMessage && state !== 'AWAITING_USER_FEEDBACK' && state !== 'AWAITING_USER_INPUT' && !parsed.text.includes('?')) {
        continue;
      }

      if (isPlan) {
        const planComment = [
          `<!-- jules-activity:${actId} -->`,
          `## 🤖 Jules Implementation Plan`,
          '',
          parsed.text,
          '',
          '---',
          '👉 **Nächste Schritte:**',
          '- Diskutiert frei im Issue über den Plan.',
          '- Schreibt **`/send`** (oder fügt Label `jules:send-messages` hinzu), wenn ihr bereit seid:',
          '  - Enthält eure Diskussion eine Freigabe („go“, „passt“, „approved“), startet Jules sofort die Umsetzung!',
          '  - Stellt ihr Fragen, antwortet Jules und verfeinert den Plan.'
        ].join('\n');

        try {
          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issueNumber,
            body: planComment
          });
          console.log(`Posted plan (activity ${actId}) to issue #${issueNumber}`);
          postedMarkers.add(actId);

          await setSingleJulesLabel(github, context, issueNumber, 'jules:waiting');
          return true; // Action taken
        } catch (err) {
          console.warn(`Failed to post plan comment:`, err.message);
        }
      } else if (isAgentMessage || state === 'AWAITING_USER_FEEDBACK' || state === 'AWAITING_USER_INPUT' || parsed.text.includes('?')) {
        // Direct response or question from Jules
        const isQuestion = parsed.text.includes('?') || /frage|question|wie soll|soll ich/i.test(parsed.text);
        const heading = isQuestion ? '### ❓ Jules Rückfrage / Feedback benötigt' : '### 💬 Jules Antwort / Rückmeldung';
        const questionComment = [
          `<!-- jules-activity:${actId} -->`,
          heading,
          '',
          `> ${parsed.text.replace(/\n/g, '\n> ')}`,
          '',
          '---',
          '👉 **Antworte direkt hier im Issue:**',
          '- Diskutiert eure Antwort und sendet sie mit **`/send`** (oder Label `jules:send-messages`) an Jules.'
        ].join('\n');

        try {
          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issueNumber,
            body: questionComment
          });
          console.log(`Posted message/question (activity ${actId}) to issue #${issueNumber}`);
          postedMarkers.add(actId);

          await setSingleJulesLabel(github, context, issueNumber, 'jules:waiting');
          return true; // Action taken
        } catch (err) {
          console.warn(`Failed to post question comment:`, err.message);
        }
      }
      break; // Only handle the most recent unhandled activity
    }

    if (state === 'FAILED') {
      const failureMarker = `failed-${sessionId}`;
      if (!postedMarkers.has(failureMarker)) {
        try {
          await setSingleJulesLabel(github, context, issueNumber, 'jules:failed');

          const reason = sessionData.failureReason || 'Unbekannter Fehler bei der Ausführung.';
          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issueNumber,
            body: `<!-- jules-marker:${failureMarker} -->\n❌ **Jules Task fehlgeschlagen:**\n\`\`\`\n${reason}\n\`\`\``
          });
          return true;
        } catch (e) {}
      }
    }

    return false;
  }

  // Execution:
  // If targetIssueNumber is specified (Fast-Path right after /plan dispatch):
  if (targetIssueNumber) {
    console.log(`Starting fast-path watcher for Issue #${targetIssueNumber} (max ${maxWaitSeconds}s)...`);
    const startTime = Date.now();
    const maxDurationMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxDurationMs) {
      const handled = await checkIssueSession(targetIssueNumber, initialSessionId);
      if (handled) {
        console.log(`Fast-path successfully resolved for Issue #${targetIssueNumber}.`);
        return;
      }
      if (Date.now() - startTime + pollIntervalMs >= maxDurationMs) break;
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
    console.log(`Fast-path wait window concluded for Issue #${targetIssueNumber}. Scheduled watcher will monitor remaining progress.`);
    return;
  }

  // Cron Mode: Scan all active issues
  console.log('Running scheduled scan for active Jules issues...');
  const issuesToScan = new Map();

  // 1. Scan issues with any jules-related label
  const activeLabels = [
    'jules:in-progress',
    'jules:waiting',
    'jules:waiting-approval',
    'jules:waiting-input'
  ];

  for (const label of activeLabels) {
    try {
      const res = await github.rest.issues.listForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: 'open',
        labels: label,
        per_page: 20
      });
      for (const issue of res.data || []) {
        if (!issue.pull_request) {
          issuesToScan.set(issue.number, issue);
        }
      }
    } catch (e) {
      console.warn(`Could not list issues for label ${label}:`, e.message);
    }
  }

  // 2. Also check recently updated open issues (fallback if labels were stripped)
  try {
    const recentRes = await github.rest.issues.listForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
      state: 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: 25
    });
    for (const issue of recentRes.data || []) {
      if (!issue.pull_request && !issuesToScan.has(issue.number)) {
        const labels = issue.labels || [];
        const hasJulesMarker = labels.some(l => {
          const name = (typeof l === 'string' ? l : l.name || '').toLowerCase();
          return name.includes('jules') || name === 'plan' || name === 'fix';
        });
        if (hasJulesMarker) {
          issuesToScan.set(issue.number, issue);
        }
      }
    }
  } catch (e) {
    console.warn('Could not scan recently updated issues:', e.message);
  }

  console.log(`Found ${issuesToScan.size} active Jules issue(s) to check.`);
  for (const [issueNum] of issuesToScan) {
    await checkIssueSession(issueNum);
  }
};
