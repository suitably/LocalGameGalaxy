// Starts a Jules session with nothing but the issue title + body.
// Keys rotate by issue number; on failure the next key is tried. The key name used is
// stored in the session comment so the watcher queries with the same account.
const loadKeys = require('./jules-keys.cjs');

module.exports = async ({ github, context, core }) => {
  const keys = loadKeys();
  if (keys.length === 0) {
    core.setFailed('No JULES_API_KEY / JULES_API_KEY_* secret configured.');
    return;
  }
  const { owner, repo } = context.repo;
  const issueNumber = Number(process.env.ISSUE_NUMBER);
  const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: issueNumber });

  const body = JSON.stringify({
    prompt: `# ${issue.title}\n\n${issue.body || ''}`,
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
    const res = await fetch('https://jules.googleapis.com/v1alpha/sessions', {
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
    const id = String(session.id || session.name || '').split('/').pop();
    // Label first: if it fails the run turns red and no unwatched session link exists.
    await github.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: ['jules:active'] });
    await github.rest.issues.createComment({
      owner, repo, issue_number: issueNumber,
      body: `<!-- jules-key:${key.name} -->\n🤖 Jules gestartet: https://jules.google.com/task/${id}`,
    });
    return;
  }
  core.setFailed(`All Jules keys failed. Last: ${lastError}`);
};
