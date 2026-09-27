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
        let planText = pg.plan?.steps ? `Plan generated with ${pg.plan.steps.length} steps` : (pg.title || 'Plan generated');
        if (pg.plan?.steps && Array.isArray(pg.plan.steps)) {
          planText += '\n\n**Proposed Plan:**\n';
          pg.plan.steps.forEach((step, i) => {
            planText += `${i+1}. **${step.title || 'Step'}**\n`;
            if (step.description) planText += `   ${step.description}\n`;
          });
          planText += '\n*Do you approve this plan?*';
        }
        text = planText;
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

  function extractRecentDiscussion(comments) {
    let lastJulesIndex = -1;
    for (let i = comments.length - 1; i >= 0; i--) {
      const c = comments[i];
      const isBot = c.user?.type === 'Bot' || c.user?.login === 'github-actions' || c.user?.login?.includes('[bot]');
      const body = c.body || '';
      const isJulesPost = body.includes('https://jules.google.com/task/') ||
                          body.includes('🤖 Jules') ||
                          body.includes('🤖 **Google Jules Dispatched**') ||
                          body.includes('**Discussion forwarded to Jules.**') ||
                          body.includes('**Message sent to Jules.**') ||
                          body.includes('**Plan approved.**') ||
                          body.includes('**YOLO mode activated.**');
      if (isJulesPost || isBot) {
        lastJulesIndex = i;
        break;
      }
    }

    const recentLines = [];
    const startIndex = lastJulesIndex >= 0 ? lastJulesIndex + 1 : 0;

    for (let i = startIndex; i < comments.length; i++) {
      const c = comments[i];
      const isBot = c.user?.type === 'Bot' || c.user?.login === 'github-actions' || c.user?.login?.includes('[bot]');
      if (isBot) continue;

      let body = (c.body || '').trim();
      // Remove triggering slash command if this comment was the slash command itself
      const replaced = body.replace(/^\/(?:jules\s+)?(?:send-messages|send|reply|approve|approve-plan|continue)\b[^\n]*/i, '').trim();
      if (!replaced) {
        const inlineMatch = body.match(/^\/(?:jules\s+)?(?:send-messages|send|reply|approve|approve-plan|continue)\s+(.+)$/is);
        if (inlineMatch && inlineMatch[1]) {
          body = inlineMatch[1].trim();
        } else {
          body = '';
        }
      } else {
        body = replaced;
      }

      if (body) {
        recentLines.push(`${c.user.login}: ${body}`);
      }
    }

    if (recentLines.length === 0) return '';
    return `Here is the discussion since your last message:\n\n${recentLines.join('\n')}`;
  }

  // 4. Handle approve-plan, yolo, continue, send-messages, and reply
  const yoloPrompt = `⚡ YOLO MODE ENGAGED ⚡
  You are authorized with 100% full autonomy.
  CRITICAL DIRECTIVES:
  1. DO NOT ask any further questions, confirmations, or approvals at any point.
  2. Make all architectural and decomposition decisions yourself immediately (e.g. splitting any component >250 lines into sub-components or custom hooks to strictly follow AGENTS.md).
  3. Create a feature branch from 'main', implement the solution, run all Vitest tests and quality gates, and open a Pull Request targeting 'main'.
  4. Proceed immediately to completion without waiting for human input.`;

  const recentDiscussion = extractRecentDiscussion(commentsRes.data || []);
  const promptToSend = recentDiscussion || targetText;

  if (!promptToSend && action !== 'approve-plan' && action !== 'yolo') {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body: `⚠️ **No new discussion found since Jules' last message.**\n\nAdd your comments to the issue first, then comment \`/send\` or add label \`jules:send-messages\` to forward them.`
    });
    return;
  }

  const endpoint = action === 'approve-plan'
    ? `https://jules.googleapis.com/v1alpha/sessions/${sessionId}:approvePlan`
    : `https://jules.googleapis.com/v1alpha/sessions/${sessionId}:sendMessage`;

  const payload = action === 'approve-plan' ? {} : { prompt: isYoloAction ? yoloPrompt : promptToSend };

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
      try {
        await github.rest.issues.removeLabel({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, name: 'jules:waiting-approval' });
        await github.rest.issues.removeLabel({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, name: 'jules:waiting-input' });
        await github.rest.issues.addLabels({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, labels: ['jules:in-progress'] });
      } catch (e) {}

      // Send discussion (if any) and strict autonomy directive to prevent intermediate pauses during coding
      const autonomyDirective = `⚡ PLAN APPROVED — AUTONOMOUS IMPLEMENTATION ENGAGED ⚡
You are authorized with 100% full autonomy to implement this approved plan.
CRITICAL DIRECTIVES:
1. Proceed immediately with implementation on a feature branch.
2. DO NOT pause to ask any confirmation questions or PR creation confirmations.
3. Make all necessary architectural and code decisions yourself according to AGENTS.md.
4. Run all tests and verification gates, and create the Pull Request targeting 'main'.
5. Finish the task autonomously.`;

      const messageOnApproval = recentDiscussion ? `${recentDiscussion}\n\n${autonomyDirective}` : autonomyDirective;

      for (const key of keys) {
        try {
          await fetch(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}:sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': key
            },
            body: JSON.stringify({ prompt: messageOnApproval })
          });
          break;
        } catch (e) {}
      }

      const commentSuffix = recentDiscussion ? `\n\n> ${recentDiscussion.replace(/\n/g, '\n> ')}` : '';
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `✅ **Plan approved.** (Session: \`${sessionId}\`)\nJules is implementing autonomously on a feature branch. A PR against \`main\` will be opened once complete.${commentSuffix}`
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
        body: `⚡ **YOLO mode activated.** (Session: \`${sessionId}\`)\nFull autonomy engaged — Jules will implement on a feature branch and open a PR against \`main\`.`
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
        body: `▶️ **Continuing.** (Session: \`${sessionId}\`)\nJules is proceeding on the feature branch. A PR against \`main\` will be opened once implementation and tests pass.`
      });
    } else if (action === 'send-messages') {
      try {
        await github.rest.issues.removeLabel({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, name: 'jules:waiting-input' });
        await github.rest.issues.addLabels({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, labels: ['jules:in-progress'] });
      } catch (e) {}

      for (const l of ['jules:send-messages', 'jules:send', 'send-messages', 'send']) {
        try {
          await github.rest.issues.removeLabel({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issueNumber, name: l });
        } catch (e) {}
      }

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `💬 **Discussion forwarded to Jules.** (Session: \`${sessionId}\`)\n\n> ${promptToSend.replace(/\n/g, '\n> ')}`
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
        body: `💬 **Message sent to Jules.** (Session: \`${sessionId}\`)\n> "${targetText}"\nJules received your instructions and will continue.`
      });
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
