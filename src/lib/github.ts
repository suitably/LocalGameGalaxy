/**
 * GitHub API Client [ID: LIB-GITHUB]
 *
 * Provides direct GitHub API access from the frontend using a locally stored PAT,
 * with fallback to the Nexumia Server proxy for backward compatibility.
 *
 * Security Note: The PAT is stored in localStorage. This is acceptable for a
 * local-first, offline-first party game app running on the user's own device.
 * The token never leaves the device except for direct GitHub API calls.
 */
import { storage, STORAGE_KEYS } from './storage';

const GITHUB_API = 'https://api.github.com';

export interface GitHubConfig {
    owner: string;
    repo: string;
    token: string;
}

export type GitHubSource = 'local' | 'server' | 'none';

/**
 * Checks if a GitHub Personal Access Token (PAT) is stored.
 */
export function hasGitHubPAT(): boolean {
    return Boolean(storage.get(STORAGE_KEYS.GITHUB_TOKEN)?.trim());
}

/**
 * Resolves the best available GitHub configuration.
 * Priority: 1) Local PAT → 2) Server proxy → 3) None
 */
export function resolveGitHubConfig(): { config: GitHubConfig | null; source: GitHubSource } {
    // 1. Try locally stored PAT
    const localToken = storage.get(STORAGE_KEYS.GITHUB_TOKEN);
    const localOwner = storage.get(STORAGE_KEYS.GITHUB_OWNER, 'suitably');
    const localRepo = storage.get(STORAGE_KEYS.GITHUB_REPO, 'LocalGameGalaxy');

    if (localToken) {
        return {
            config: { owner: localOwner, repo: localRepo, token: localToken },
            source: 'local',
        };
    }

    // 2. Server proxy (check if helper is active)
    if (storage.isHelperActive()) {
        return { config: null, source: 'server' };
    }

    return { config: null, source: 'none' };
}

/**
 * Calls the GitHub API directly using a local PAT token.
 */
async function githubApiFetch(
    path: string,
    token: string,
    options: RequestInit = {},
): Promise<Response> {
    return fetch(`${GITHUB_API}${path}`, {
        ...options,
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'LocalGameGalaxy-Client',
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> | undefined),
        },
    });
}

/**
 * Tests if a GitHub token is valid by fetching repository info.
 */
export async function testGitHubToken(config: GitHubConfig): Promise<{
    valid: boolean;
    repoName?: string;
    error?: string;
}> {
    try {
        const res = await githubApiFetch(`/repos/${config.owner}/${config.repo}`, config.token);
        if (res.ok) {
            const data = await res.json();
            return { valid: true, repoName: data.full_name };
        }
        const data = await res.json();
        return { valid: false, error: data.message || `HTTP ${res.status}` };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return { valid: false, error: message };
    }
}

/**
 * Creates a GitHub issue directly via the API.
 */
export async function createGitHubIssue(
    config: GitHubConfig,
    issue: { title: string; body: string; labels?: string[] },
): Promise<{ success: boolean; issueUrl?: string; number?: number; error?: string }> {
    try {
        const res = await githubApiFetch(
            `/repos/${config.owner}/${config.repo}/issues`,
            config.token,
            {
                method: 'POST',
                body: JSON.stringify({
                    title: issue.title,
                    body: issue.body,
                    labels: issue.labels || ['user-feedback'],
                }),
            },
        );

        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.message || 'Failed to create issue' };
        }
        return { success: true, issueUrl: data.html_url, number: data.number };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, error: message };
    }
}

/**
 * Creates or updates a Pull Request with a file update via the GitHub API.
 * If an open PR already exists for the branchPrefix, it commits to that branch
 * and updates the PR description instead of creating duplicate PRs. (Fixes #124)
 */
export async function createGitHubPR(
    config: GitHubConfig,
    pr: {
        filePath: string;
        fileContent: string;
        branchPrefix: string;
        commitMessage: string;
        prTitle: string;
        prBody: string;
    },
): Promise<{ success: boolean; prUrl?: string; prNumber?: number; branch?: string; updated?: boolean; error?: string }> {
    const { owner, repo, token } = config;

    try {
        // 1. Get default branch
        const repoRes = await githubApiFetch(`/repos/${owner}/${repo}`, token);
        const repoData = await repoRes.json();
        if (!repoRes.ok) {
            return { success: false, error: repoData.message || 'Failed to fetch repo info' };
        }
        const defaultBranch = repoData.default_branch || 'main';

        // 2. Check if an open PR already exists for this branchPrefix
        let existingPR: { number: number; html_url: string; head: { ref: string } } | null = null;
        try {
            const openPullsRes = await githubApiFetch(`/repos/${owner}/${repo}/pulls?state=open&per_page=30`, token);
            if (openPullsRes.ok) {
                const openPulls = await openPullsRes.json();
                if (Array.isArray(openPulls)) {
                    existingPR = openPulls.find(
                        (p: { head?: { ref?: string } }) => p.head?.ref && p.head.ref.startsWith(pr.branchPrefix),
                    ) || null;
                }
            }
        } catch (err) {
            console.warn('[GitHub] Could not query open PRs, falling back to new PR creation:', err);
        }

        // Scenario A: Existing open PR found -> update file on existing branch and update PR body
        if (existingPR && existingPR.head?.ref) {
            const targetBranch = existingPR.head.ref;

            // Fetch current file SHA on the target branch
            let fileSha: string | undefined;
            const branchFileRes = await githubApiFetch(
                `/repos/${owner}/${repo}/contents/${pr.filePath}?ref=${targetBranch}`,
                token,
            );
            if (branchFileRes.ok) {
                const fileData = await branchFileRes.json();
                fileSha = fileData.sha;
            }

            // Commit updated file to existing branch
            const commitRes = await githubApiFetch(
                `/repos/${owner}/${repo}/contents/${pr.filePath}`,
                token,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        message: pr.commitMessage,
                        content: btoa(unescape(encodeURIComponent(pr.fileContent))),
                        branch: targetBranch,
                        ...(fileSha ? { sha: fileSha } : {}),
                    }),
                },
            );
            if (!commitRes.ok) {
                const data = await commitRes.json();
                return { success: false, error: data.message || 'Failed to update file on existing branch' };
            }

            // Update PR title and body
            await githubApiFetch(
                `/repos/${owner}/${repo}/pulls/${existingPR.number}`,
                token,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        title: pr.prTitle,
                        body: pr.prBody,
                    }),
                },
            );

            return {
                success: true,
                prUrl: existingPR.html_url,
                prNumber: existingPR.number,
                branch: targetBranch,
                updated: true,
            };
        }

        // Scenario B: No open PR -> create new branch and PR
        // 2. Get latest commit SHA
        const refRes = await githubApiFetch(
            `/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
            token,
        );
        const refData = await refRes.json();
        if (!refRes.ok) {
            return { success: false, error: refData.message || 'Failed to fetch branch ref' };
        }
        const baseCommitSha = refData.object.sha;

        // 3. Get current file SHA (if file exists in default branch)
        let fileSha: string | undefined;
        const fileRes = await githubApiFetch(
            `/repos/${owner}/${repo}/contents/${pr.filePath}?ref=${defaultBranch}`,
            token,
        );
        if (fileRes.ok) {
            const fileData = await fileRes.json();
            fileSha = fileData.sha;
        }

        // 4. Create branch
        const branchName = `${pr.branchPrefix}-${Date.now()}`;
        const createRefRes = await githubApiFetch(
            `/repos/${owner}/${repo}/git/refs`,
            token,
            {
                method: 'POST',
                body: JSON.stringify({
                    ref: `refs/heads/${branchName}`,
                    sha: baseCommitSha,
                }),
            },
        );
        if (!createRefRes.ok) {
            const data = await createRefRes.json();
            return { success: false, error: data.message || 'Failed to create branch' };
        }

        // 5. Commit file
        const commitRes = await githubApiFetch(
            `/repos/${owner}/${repo}/contents/${pr.filePath}`,
            token,
            {
                method: 'PUT',
                body: JSON.stringify({
                    message: pr.commitMessage,
                    content: btoa(unescape(encodeURIComponent(pr.fileContent))),
                    branch: branchName,
                    ...(fileSha ? { sha: fileSha } : {}),
                }),
            },
        );
        if (!commitRes.ok) {
            const data = await commitRes.json();
            return { success: false, error: data.message || 'Failed to commit file' };
        }

        // 6. Create PR
        const prRes = await githubApiFetch(
            `/repos/${owner}/${repo}/pulls`,
            token,
            {
                method: 'POST',
                body: JSON.stringify({
                    title: pr.prTitle,
                    head: branchName,
                    base: defaultBranch,
                    body: pr.prBody,
                }),
            },
        );
        const prData = await prRes.json();
        if (!prRes.ok) {
            return { success: false, error: prData.message || 'Failed to create PR' };
        }

        return {
            success: true,
            prUrl: prData.html_url,
            prNumber: prData.number,
            branch: branchName,
            updated: false,
        };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, error: message };
    }
}
