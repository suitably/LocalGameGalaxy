/**
 * Cloudflare Preview Comment & Branch Utilities [ID: SCRIPT-PREVIEW-COMMENT]
 *
 * Used by CI (deploy-cloudflare) and cleanup-preview workflows.
 */

const PREVIEW_MARKER = '<!-- cf-preview -->';
const COMMENT_HEADER = '### 🚀 Cloudflare Preview Deployment';

/**
 * Transliterate and sanitize branch names for Cloudflare preview subdomain compatibility.
 * Matches RFC 1123 DNS subdomain label rules: [a-z0-9-], lowercase, no double dashes, no leading/trailing hyphens.
 *
 * @param {string} name
 * @returns {string}
 */
function sanitizeBranch(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/Ä/g, 'ae').replace(/Ö/g, 'oe').replace(/Ü/g, 'ue')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Upsert or update a sticky PR preview comment using hidden marker and pagination.
 *
 * @param {object} toolkit - GitHub Script toolkit: { github, context, core }
 * @param {object} options
 * @param {'deployed' | 'cleaned-up'} options.status
 * @param {string} [options.deploymentUrl]
 */
async function handlePreviewComment({ github, context, core }, { status = 'deployed', deploymentUrl } = {}) {
  const pr = context.payload?.pull_request;
  if (!pr) {
    if (core && core.info) core.info('No pull request found in event payload. Skipping preview comment.');
    return;
  }

  const rawBranch = pr.head?.ref || '';
  const sanitized = sanitizeBranch(rawBranch);
  const prNumber = pr.number;
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  // Resolve target URL
  const resolvedUrl = deploymentUrl || (sanitized ? `https://${sanitized}.nexumia.de/` : '');

  let commentBody = '';
  if (status === 'deployed') {
    const urlDisplay = resolvedUrl ? `👉 **Preview URL:** [${resolvedUrl}](${resolvedUrl})` : '⚠️ Preview URL unavailable';
    commentBody = `${PREVIEW_MARKER}\n${COMMENT_HEADER}\n\n${urlDisplay}\n\nBranch: \`${rawBranch}\``;
  } else {
    const statusText = pr.merged ? 'Merged & Cleaned Up' : 'Closed & Cleaned Up';
    commentBody = `${PREVIEW_MARKER}\n${COMMENT_HEADER}\n\n🧹 **Status: ${statusText}**\nThe Cloudflare preview environment for branch \`${rawBranch}\` has been deleted.`;
  }

  try {
    // Paginate through all comments to avoid missing existing sticky comment
    const comments = await github.paginate(
      github.rest.issues.listComments,
      {
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100,
      }
    );

    const existingComment = comments.find(
      (c) => c.body?.includes(PREVIEW_MARKER) || c.body?.includes(COMMENT_HEADER)
    );

    if (existingComment) {
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      if (core && core.info) core.info(`Updated existing preview comment (ID: ${existingComment.id})`);
    } else {
      const created = await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
      if (core && core.info) core.info(`Created new preview comment (ID: ${created.data?.id})`);
    }
  } catch (err) {
    if (core && core.warning) {
      core.warning(`Could not post or update PR preview comment: ${err.message}`);
    } else {
      console.warn('Could not post or update PR preview comment:', err.message);
    }
  }
}

module.exports = handlePreviewComment;
module.exports.sanitizeBranch = sanitizeBranch;
module.exports.PREVIEW_MARKER = PREVIEW_MARKER;
module.exports.COMMENT_HEADER = COMMENT_HEADER;
