module.exports = async ({ github, context, core }) => {
  const issueNumber = Number(process.env.ISSUE_NUMBER);
  const action = process.env.ACTION;
  const targetText = process.env.TARGET_TEXT;
  const isYoloAction = action === 'yolo';

  // 1. Find the latest Jules session URL in comments
  const commentsRes = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
    per_page: 100
  });

  let sessionId = null;
  for (let i = (commentsRes.data || []).length - 1; i >= 0; i--) {
    const body = commentsRes.data[i].body || '';
    const match = body.match(/https:\/\/jules\.google\.com\/task\/([a-zA-Z0-9_\-]+)/);
    if (match) {
      sessionId = match[1];
      break;
    }
  }

  if (!sessionId) {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body: `⚠️ **No active Jules session found.**\nNo Jules task link (\`https://jules.google.com/task/...\`) was found on Issue #${issueNumber}.`
    });
    core.setFailed('No active Jules session found on issue');
    return;
  }

  // 2. Gather Jules API keys
  const keys = [
    process.env.JULES_API_KEY_1,
    process.env.JULES_API_KEY_2,
    process.env.JULES_API_KEY_3,
    process.env.JULES_API_KEY_4,
    process.env.JULES_API_KEY_5,
    process.env.JULES_API_KEY
  ].filter(Boolean);

  if (keys.length === 0) {
    core.setFailed('No Jules API keys configured in repository secrets');
    return;
  }

  // 3. Handle /status query
  if (action === 'status') {
    let sessData = null;
    let actData = null;
    for (const key of keys) {
      try {
        const sRes = await fetch(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, {
          headers: { 'X-Goog-Api-Key': key }
        });
        if (sRes.ok) {
          sessData = await sRes.json();
          const aRes = await fetch(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}/activities?pageSize=20`, {
            headers: { 'X-Goog-Api-Key': key }
          });
          if (aRes.ok) actData = await aRes.json();
          break;
        }
      } catch (e) {}
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
        const pg = a.planGenerated;
        text = pg.plan?.steps ? `Plan generated with ${pg.plan.steps.length} steps` : (pg.title || 'Plan generated');
      } else if (a.sessionCompleted) {
        text = 'Task completed successfully 🎉';
      } else if (a.sessionFailed) {
        text = `Task failed: ${a.sessionFailed.reason || ''}`;
      }

      // Check artifacts for code modifications
      if (!text && a.artifacts && a.artifacts.length > 0) {
        tag = 'CODE';
        const files = new Set();
        for (const art of a.artifacts) {
          const patch = art.changeSet?.gitPatch?.unidiffPatch || '';
          const matches = patch.matchAll(/diff --git a\/(\S+) b\/(\S+)/g);
          for (const m of matches) {
            const fname = m[2].split('/').pop();
            files.add(fname);
          }
        }
        if (files.size > 0) {
          text = '🛠️ Code changes in: ' + Array.from(files).map(f => '`' + f + '`').join(', ');
        }
      }

      if (!text && typeof a.message === 'string' && a.message) text = a.message;
      if (!text && typeof a.title === 'string' && a.title) text = a.title;
      if (!text && typeof a.description === 'string' && a.description) text = a.description;
      if (!text && typeof a.summary === 'string' && a.summary) text = a.summary;

      return { time, tag, text: text.trim() || 'Activity executed' };
    }

    const state = sessData?.state || 'UNKNOWN';
    const rawActivities = actData?.activities || [];
    const activities = rawActivities.slice(-6);
    const actLines = activities.map(a => {
      const p = parseActivity(a);
      const prefix = p.time ? `\`${p.time}\` ` : '';
      const maxLen = 120;
      const truncated = p.text.length > maxLen ? p.text.slice(0, maxLen).replace(/\n/g, ' ') + '...' : p.text.replace(/\n/g, ' ');
      return `- ${prefix}**[${p.tag}]** ${truncated}`;
    }).join('\n');

    // Extract last question if waiting for feedback
    let pendingQuestion = '';
    for (let i = rawActivities.length - 1; i >= 0; i--) {
      const act = rawActivities[i];
      if (act.agentMessaged?.agentMessage) {
        pendingQuestion = act.agentMessaged.agentMessage;
        break;
      }
      const p = parseActivity(act);
      if (p.tag === 'AGENT' && (p.text.includes('?') || p.text.toLowerCase().includes('proceed') || p.text.toLowerCase().includes('approach'))) {
        pendingQuestion = p.text;
        break;
      }
    }

    let statusBody = `📊 **Jules Task Status (Session: \`${sessionId}\`):**\n\n- **Status:** \`${state}\`\n- **Web UI:** https://jules.google.com/task/${sessionId}\n\n`;

    if ((state === 'AWAITING_USER_FEEDBACK' || state === 'AWAITING_USER_INPUT') && pendingQuestion) {
      statusBody += `### ⚠️ Jules is waiting for your feedback:\n> ${pendingQuestion.replace(/\n/g, '\n> ')}\n\n👉 **Reply here with:**\n- \`/yolo\` — full autonomy, no further questions\n- \`/continue\` — proceed with suggested approach\n- \`/jules reply <your instructions>\` — send custom feedback\n\n---\n`;
    }

    statusBody += `**Recent Activities:**\n${actLines || '- No activities available.'}\n\n---\n*Tip: Comment with \`/yolo\` for full autonomy, \`/continue\` to proceed, or \`/jules reply <text>\` to respond.*`;

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body: statusBody
    });
    return;
  }

  // 4. Handle approve-plan, yolo, continue, and reply
  const yoloPrompt = `⚡ YOLO MODE ENGAGED ⚡
  You are authorized with 100% full autonomy.
  CRITICAL DIRECTIVES:
  1. DO NOT ask any further questions, confirmations, or approvals at any point.
  2. Make all architectural and decomposition decisions yourself immediately (e.g. splitting any component >250 lines into sub-components or custom hooks to strictly follow AGENTS.md).
  3. Implement the solution, execute Vitest tests, verify all quality gates, and create the Pull Request targeting 'dev'.
  4. Proceed immediately to completion without waiting for human input.`;

  const endpoint = action === 'approve-plan'
    ? `https://jules.googleapis.com/v1alpha/sessions/${sessionId}:approvePlan`
    : `https://jules.googleapis.com/v1alpha/sessions/${sessionId}:sendMessage`;

  const payload = action === 'approve-plan' ? {} : { prompt: isYoloAction ? yoloPrompt : targetText };

  let success = false;
  let lastError = '';

  for (const key of keys) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        success = true;
        break;
      } else {
        const txt = await res.text();
        lastError = `Status ${res.status}: ${txt}`;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  if (success) {
    if (action === 'approve-plan') {
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `✅ **Jules plan approved.** (Session: \`${sessionId}\`)\nJules is now proceeding with implementation on \`dev\`.`
      });
    } else if (action === 'yolo') {
      try {
        await github.rest.issues.removeLabel({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, name: 'jules:waiting-input' });
        await github.rest.issues.addLabels({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, labels: ['jules:in-progress'] });
      } catch (e) {}

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `⚡ **YOLO mode activated.** (Session: \`${sessionId}\`)\nFull autonomy engaged — no further questions, direct implementation and PR against \`dev\`.`
      });
    } else if (action === 'continue') {
      try {
        await github.rest.issues.removeLabel({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, name: 'jules:waiting-input' });
        await github.rest.issues.addLabels({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, labels: ['jules:in-progress'] });
      } catch (e) {}

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `▶️ **Continuation approved.** (Session: \`${sessionId}\`)\nJules is proceeding autonomously on \`dev\`. PR will be opened once implementation and tests pass.`
      });
    } else {
      try {
        await github.rest.issues.removeLabel({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, name: 'jules:waiting-input' });
        await github.rest.issues.addLabels({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, labels: ['jules:in-progress'] });
      } catch (e) {}

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `💬 **Feedback sent to Jules.** (Session: \`${sessionId}\`)\n> "${targetText}"\nJules received your instructions and is continuing on \`dev\`.`
      });
    }

    // Re-attach the live bridge to proactively relay Jules' next response!
    if (action !== 'status') {
      console.log('Re-attaching live bridge to monitor Jules response...');
      process.env.SESSION_ID = sessionId;
      const liveBridge = require('./jules-live-bridge.js');
      await liveBridge({ github, context, core });
    }
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body: `❌ **Failed to send message to Jules:**\n\`\`\`\n${lastError}\n\`\`\``
    });
    core.setFailed(`Failed to send to Jules: ${lastError}`);
  }
};
