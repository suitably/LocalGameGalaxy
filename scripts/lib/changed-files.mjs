import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolve the git target/base ref across environments (GitHub Actions, GitLab CI, local).
 *
 * @param {string} [explicitBase]
 * @param {string} [cwd]
 * @returns {string} The git ref to compare against (e.g. 'origin/main', 'origin/feature-x')
 */
export function resolveBaseRef(explicitBase, cwd = process.cwd()) {
  if (explicitBase) return explicitBase;

  // 1. GitHub PR: GITHUB_BASE_REF holds the target branch name (e.g. "main")
  if (process.env.GITHUB_BASE_REF) {
    const ghBase = process.env.GITHUB_BASE_REF.trim();
    if (ghBase) {
      // Check if remote tracking ref exists, e.g. origin/main
      if (hasGitRef(`origin/${ghBase}`, cwd)) return `origin/${ghBase}`;
      if (hasGitRef(ghBase, cwd)) return ghBase;
    }
  }

  // 2. GitLab MR: CI_MERGE_REQUEST_TARGET_BRANCH_NAME
  if (process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME) {
    const glBase = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME.trim();
    if (glBase) {
      if (hasGitRef(`origin/${glBase}`, cwd)) return `origin/${glBase}`;
      if (hasGitRef(`gitlab/${glBase}`, cwd)) return `gitlab/${glBase}`;
      if (hasGitRef(glBase, cwd)) return glBase;
    }
  }

  // 3. Fallbacks: origin/main -> main -> HEAD~1
  if (hasGitRef('origin/main', cwd)) return 'origin/main';
  if (hasGitRef('main', cwd)) return 'main';
  if (hasGitRef('HEAD~1', cwd)) return 'HEAD~1';

  return 'HEAD';
}

/**
 * Check if a given git reference or commit exists in the repo.
 */
export function hasGitRef(ref, cwd = process.cwd()) {
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get merge-base between two refs.
 */
export function getMergeBase(base, head = 'HEAD', cwd = process.cwd()) {
  try {
    const output = execFileSync('git', ['merge-base', base, head], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output.trim();
  } catch {
    return null;
  }
}

/**
 * Get changed files compared to base ref, including staged and uncommitted working-tree changes.
 *
 * @param {object} [options]
 * @param {string} [options.base] - Explicit base ref
 * @param {string} [options.cwd] - Working directory (defaults to process.cwd())
 * @param {boolean} [options.includeWorkingTree=true] - Include uncommitted/staged working-tree files
 * @param {boolean} [options.absolute=false] - Return absolute paths instead of repo-relative paths
 * @returns {{ files: string[], baseRef: string, mergeBase: string | null }}
 */
export function getChangedFiles(options = {}) {
  const {
    base,
    cwd = process.cwd(),
    includeWorkingTree = true,
    absolute = false,
  } = options;

  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const resolvedBase = resolveBaseRef(base, cwd);

  let mergeBase = null;
  const changedSet = new Set();

  if (resolvedBase && resolvedBase !== 'HEAD') {
    mergeBase = getMergeBase(resolvedBase, 'HEAD', cwd);
  }

  if (isCI && !mergeBase && resolvedBase && resolvedBase !== 'HEAD') {
    throw new Error(
      `[changed-files] Failed to find git merge-base between base '${resolvedBase}' and HEAD in CI. ` +
      `Ensure full git history is fetched (fetch-depth: 0).`
    );
  }

  // 1. Committed diff vs merge-base or base ref
  const diffTarget = mergeBase || (resolvedBase !== 'HEAD' ? resolvedBase : null);
  if (diffTarget) {
    try {
      const output = execFileSync('git', ['diff', '--name-only', `${diffTarget}...HEAD`], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      for (const line of output.split('\n')) {
        const file = line.trim();
        if (file) changedSet.add(file);
      }
    } catch (err) {
      if (isCI) {
        throw new Error(`[changed-files] git diff against ${diffTarget}...HEAD failed in CI: ${err.message}`);
      }
    }
  }

  // 2. Local uncommitted changes (staged and unstaged)
  if (includeWorkingTree) {
    try {
      // Staged changes
      const staged = execFileSync('git', ['diff', '--name-only', '--cached'], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of staged.split('\n')) {
        const file = line.trim();
        if (file) changedSet.add(file);
      }

      // Unstaged changes in working tree
      const working = execFileSync('git', ['diff', '--name-only'], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of working.split('\n')) {
        const file = line.trim();
        if (file) changedSet.add(file);
      }
    } catch {
      // Ignore if not a git worktree or error
    }
  }

  // Filter existing files only
  const existingFiles = [];
  for (const relativePath of changedSet) {
    const fullPath = path.resolve(cwd, relativePath);
    if (existsSync(fullPath)) {
      existingFiles.push(absolute ? fullPath : relativePath);
    }
  }

  return {
    files: existingFiles,
    baseRef: resolvedBase,
    mergeBase,
  };
}
