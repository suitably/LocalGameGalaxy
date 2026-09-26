module.exports = async ({ github, context, core }) => {
  const fs = require('fs');
  const path = require('path');
  const sessionId = process.env.SESSION_ID;
  const issueNumber = Number(process.env.ISSUE_NUMBER);

  const keys = [
    process.env.JULES_API_KEY_1,
    process.env.JULES_API_KEY_2,
    process.env.JULES_API_KEY_3,
    process.env.JULES_API_KEY_4,
    process.env.JULES_API_KEY_5,
    process.env.JULES_API_KEY
  ].filter(Boolean);

  if (!sessionId || keys.length === 0) {
    console.log('Skipping live bridge: missing session ID or API keys');
    return;
  }

  const apiKey = keys[0];
  const seenActivityIds = new Set();
  const transcriptEntries = [];

  console.log(`Starting live bridge watcher for Jules session ${sessionId}...`);

  const startTime = Date.now();
  const maxDurationMs = 20 * 60 * 1000; // max 20 minutes monitoring
  const pollIntervalMs = 15 * 1000;    // check every 15 seconds

  let finalState = 'UNKNOWN';

  while (Date.now() - startTime < maxDurationMs) {
    try {
      // 1. Fetch activities
      const actRes = await fetch(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}/activities?pageSize=50`, {
        headers: { 'X-Goog-Api-Key': apiKey }
      });

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

      if (actRes.ok) {
        const actData = await actRes.json();
        const activities = actData.activities || [];

        // Sort chronologically if createTime present
        activities.sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''));

        for (const act of activities) {
          if (seenActivityIds.has(act.id)) continue;
          seenActivityIds.add(act.id);

          const parsed = parseActivity(act);
          transcriptEntries.push({
            id: act.id,
            time: parsed.time || act.createTime || new Date().toISOString(),
            originator: parsed.tag,
            description: parsed.text
          });

          // Relay agent messages or questions directly into the GitHub Issue
          if (parsed.tag === 'AGENT' && parsed.text) {
            if (parsed.text.length > 20 || parsed.text.includes('?')) {
              const commentBody = [
                '### 🤖 Jules Update',
                '',
                `> ${parsed.text.replace(/\n/g, '\n> ')}`,
                '',
                '---',
                '`/yolo` — full autonomy | `/continue` — proceed | `/jules reply <text>` — respond'
              ].join('\n');

              try {
                await github.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: issueNumber,
                  body: commentBody
                });
                console.log(`Relayed agent message ${act.id} to issue #${issueNumber}`);
              } catch (cErr) {
                console.warn('Failed to post comment for activity:', cErr.message);
              }
            }
          }
        }
      }

      // 2. Fetch session status
      const sessRes = await fetch(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, {
        headers: { 'X-Goog-Api-Key': apiKey }
      });

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        finalState = sessData.state || 'IN_PROGRESS';
        console.log(`Session ${sessionId} state: ${finalState}`);

        if (finalState === 'COMPLETED' || finalState === 'FAILED') {
          break;
        }
      }
    } catch (err) {
      console.warn('Error polling Jules API:', err.message);
    }

    // Sleep 15s
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  console.log(`Live bridge concluded with state: ${finalState}. Generating transcript...`);

  // 3. Save transcript to repository
  try {
    const transcriptsDir = path.join(process.cwd(), '.pipeline-memory', 'jules-transcripts');
    if (!fs.existsSync(transcriptsDir)) {
      fs.mkdirSync(transcriptsDir, { recursive: true });
    }

    const transcriptFile = path.join(transcriptsDir, `issue-${issueNumber}-session-${sessionId}.md`);
    const markdown = [
      `# Jules Session Transcript: Issue #${issueNumber}`,
      `- **Session ID:** \`${sessionId}\``,
      `- **Final State:** \`${finalState}\``,
      `- **Archived At:** ${new Date().toISOString()}`,
      '',
      '## Activity & Message Timeline',
      ''
    ];

    for (const entry of transcriptEntries) {
      markdown.push(`### [${entry.time}] ${entry.originator.toUpperCase()}`);
      if (entry.description) markdown.push(`*${entry.description}*`);
      if (entry.agentMessage) markdown.push(`\n\`\`\`\n${entry.agentMessage}\n\`\`\`\n`);
      markdown.push('');
    }

    fs.writeFileSync(transcriptFile, markdown.join('\n'), 'utf8');
    console.log(`Transcript written to ${transcriptFile}`);

    // Commit transcript to dev branch
    const { execSync } = require('child_process');
    execSync('git config user.name "github-actions[bot]"');
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    execSync('git fetch origin dev');
    execSync('git checkout dev');
    execSync('git pull origin dev --rebase');
    execSync(`git add "${transcriptFile}"`);
    const diff = execSync('git diff --cached --name-only').toString().trim();
    if (diff) {
      execSync(`git commit -m "docs(jules): archive transcript for issue #${issueNumber} [skip ci]"`);
      execSync('git push origin dev');
      console.log('Transcript pushed to origin/dev');
    }
  } catch (err) {
    console.warn('Failed to commit transcript:', err.message);
  }
};
