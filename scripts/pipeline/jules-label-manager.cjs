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

    // Identify all existing jules:* labels + trigger labels to remove
    const julesLabelsToRemove = currentLabels.filter(name => {
      const lower = name.toLowerCase();
      if (targetLabel && lower === targetLabel.toLowerCase()) return false;
      return lower.startsWith('jules:') || ['jules', 'plan', 'send-messages', 'send', 'approved', 'approve', 'yolo'].includes(lower);
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
