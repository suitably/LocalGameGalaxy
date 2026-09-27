/**
 * Jules Label Lifecycle & Mutex Manager
 * Enforces strict Single-Label rule: At any given moment, strictly ONE jules:* label exists on an issue.
 * If targetLabel is null, all jules:* and trigger labels are removed.
 */

async function setSingleJulesLabel(github, context, issueNumber, targetLabel) {
  try {
    const { data: issue } = await github.rest.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber
    });
    const currentLabels = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name);

    // Identify all existing jules:* labels (and legacy triggers) to remove.
    // Standard issue labels (e.g. bug, enhancement, frontend) are ALWAYS preserved!
    const julesLabelsToRemove = currentLabels.filter(name => {
      const lower = name.toLowerCase();
      if (targetLabel && lower === targetLabel.toLowerCase()) return false;
      if (lower.startsWith('jules:') || lower === 'jules') return true;
      // If setting a new Jules label, also clean up trigger shortcut labels
      if (targetLabel && ['plan', 'send-messages', 'send', 'approved', 'approve', 'yolo'].includes(lower)) return true;
      return false;
    });

    for (const name of julesLabelsToRemove) {
      try {
        await github.rest.issues.removeLabel({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: issueNumber,
          name
        });
      } catch (e) {}
    }

    if (targetLabel) {
      const hasTarget = currentLabels.some(l => l.toLowerCase() === targetLabel.toLowerCase());
      if (!hasTarget) {
        await github.rest.issues.addLabels({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: issueNumber,
          labels: [targetLabel]
        });
      }
    }
  } catch (err) {
    console.warn(`Failed to setSingleJulesLabel (${targetLabel}) for issue #${issueNumber}:`, err.message);
  }
}

module.exports = { setSingleJulesLabel };
