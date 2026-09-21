import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  testGitHubToken,
  hasGitHubPAT,
  resolveGitHubConfig,
  createGitHubIssue,
  createGitHubPR,
  type GitHubConfig,
} from './github';
import { storage, STORAGE_KEYS } from './storage';

describe('GitHub Client Service (src/lib/github.ts)', () => {
  const dummyConfig: GitHubConfig = {
    owner: 'test-owner',
    repo: 'test-repo',
    token: 'ghp_dummy1234567890',
  };

  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hasGitHubPAT', () => {
    it('returns false when no token is stored in localStorage', () => {
      expect(hasGitHubPAT()).toBe(false);
    });

    it('returns false when token is empty or whitespace', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, '   ');
      expect(hasGitHubPAT()).toBe(false);
    });

    it('returns true when a valid token exists in storage', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_validtoken');
      expect(hasGitHubPAT()).toBe(true);
    });
  });

  describe('resolveGitHubConfig', () => {
    it('returns local config when GITHUB_TOKEN is stored', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_local123');
      storage.set(STORAGE_KEYS.GITHUB_OWNER, 'my-owner');
      storage.set(STORAGE_KEYS.GITHUB_REPO, 'my-repo');

      const resolved = resolveGitHubConfig();
      expect(resolved.source).toBe('local');
      expect(resolved.config).toEqual({
        owner: 'my-owner',
        repo: 'my-repo',
        token: 'ghp_local123',
      });
    });

    it('uses default owner and repo if omitted when local token is present', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_local123');

      const resolved = resolveGitHubConfig();
      expect(resolved.source).toBe('local');
      expect(resolved.config).toEqual({
        owner: 'suitably',
        repo: 'LocalGameGalaxy',
        token: 'ghp_local123',
      });
    });

    it('returns server source when no local token and helper is active', () => {
      storage.setHelperActive(true);
      const resolved = resolveGitHubConfig();
      expect(resolved.source).toBe('server');
      expect(resolved.config).toBeNull();
    });

    it('returns none source when no local token and helper is inactive', () => {
      storage.setHelperActive(false);
      const resolved = resolveGitHubConfig();
      expect(resolved.source).toBe('none');
      expect(resolved.config).toBeNull();
    });
  });

  describe('testGitHubToken', () => {
    it('returns valid: true and repoName when API fetch succeeds with 200 OK', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ full_name: 'test-owner/test-repo' }),
      };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const result = await testGitHubToken(dummyConfig);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token ghp_dummy1234567890',
          }),
        }),
      );
      expect(result).toEqual({ valid: true, repoName: 'test-owner/test-repo' });
    });

    it('returns valid: false and error message when API responds with non-ok status and message JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({ message: 'Bad credentials' }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const result = await testGitHubToken(dummyConfig);

      expect(result).toEqual({ valid: false, error: 'Bad credentials' });
    });

    it('returns valid: false and HTTP status fallback when API responds with non-ok status without error message in JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: async () => ({}),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const result = await testGitHubToken(dummyConfig);

      expect(result).toEqual({ valid: false, error: 'HTTP 404' });
    });

    it('returns valid: false and error string when fetch throws an Error instance (network error)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'));

      const result = await testGitHubToken(dummyConfig);

      expect(result).toEqual({ valid: false, error: 'Failed to fetch' });
    });

    it('returns valid: false and "Unknown error" when fetch throws a non-Error throw object', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue('String exception');

      const result = await testGitHubToken(dummyConfig);

      expect(result).toEqual({ valid: false, error: 'Unknown error' });
    });
  });

  describe('createGitHubIssue', () => {
    it('successfully creates an issue', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({ html_url: 'https://github.com/test-owner/test-repo/issues/42', number: 42 }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const result = await createGitHubIssue(dummyConfig, {
        title: 'Test Issue',
        body: 'Issue description',
      });

      expect(result).toEqual({
        success: true,
        issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
        number: 42,
      });
    });

    it('handles issue creation failure from API response', async () => {
      const mockResponse = {
        ok: false,
        status: 422,
        json: async () => ({ message: 'Validation Failed' }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const result = await createGitHubIssue(dummyConfig, {
        title: '',
        body: '',
      });

      expect(result).toEqual({
        success: false,
        error: 'Validation Failed',
      });
    });

    it('handles issue creation exception / network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection error'));

      const result = await createGitHubIssue(dummyConfig, {
        title: 'Test Issue',
        body: 'Body',
      });

      expect(result).toEqual({
        success: false,
        error: 'Connection error',
      });
    });
  });

  describe('createGitHubPR', () => {
    it('creates a new PR when no existing open PR is found', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url.toString();

        // 1. Get default branch
        if (urlStr.endsWith('/repos/test-owner/test-repo')) {
          return { ok: true, json: async () => ({ default_branch: 'main' }) } as Response;
        }
        // 2. Query open PRs
        if (urlStr.includes('/pulls?state=open')) {
          return { ok: true, json: async () => [] } as Response;
        }
        // 3. Get ref
        if (urlStr.includes('/git/ref/heads/main')) {
          return { ok: true, json: async () => ({ object: { sha: 'base-commit-sha' } }) } as Response;
        }
        // 4. Get current file
        if (urlStr.includes('/contents/test.txt?ref=main')) {
          return { ok: true, json: async () => ({ sha: 'existing-file-sha' }) } as Response;
        }
        // 5. Create branch
        if (urlStr.includes('/git/refs')) {
          return { ok: true, json: async () => ({}) } as Response;
        }
        // 6. Commit file
        if (urlStr.includes('/contents/test.txt')) {
          return { ok: true, json: async () => ({}) } as Response;
        }
        // 7. Create PR
        if (urlStr.endsWith('/pulls')) {
          return { ok: true, json: async () => ({ html_url: 'https://github.com/pr/1', number: 101 }) } as Response;
        }

        return { ok: false, json: async () => ({ message: 'Not found' }) } as Response;
      });

      const result = await createGitHubPR(dummyConfig, {
        filePath: 'test.txt',
        fileContent: 'hello world',
        branchPrefix: 'feature-test',
        commitMessage: 'add test file',
        prTitle: 'Add test file',
        prBody: 'PR details',
      });

      expect(result.success).toBe(true);
      expect(result.prUrl).toBe('https://github.com/pr/1');
      expect(result.prNumber).toBe(101);
      expect(result.updated).toBe(false);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('updates an existing PR if an open PR with matching branchPrefix exists', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url.toString();

        if (urlStr.endsWith('/repos/test-owner/test-repo')) {
          return { ok: true, json: async () => ({ default_branch: 'main' }) } as Response;
        }
        if (urlStr.includes('/pulls?state=open')) {
          return {
            ok: true,
            json: async () => [
              {
                number: 55,
                html_url: 'https://github.com/pr/55',
                head: { ref: 'feature-test-12345' },
              },
            ],
          } as Response;
        }
        if (urlStr.includes('/contents/test.txt?ref=feature-test-12345')) {
          return { ok: true, json: async () => ({ sha: 'branch-file-sha' }) } as Response;
        }
        if (urlStr.includes('/contents/test.txt')) {
          return { ok: true, json: async () => ({}) } as Response;
        }
        if (urlStr.includes('/pulls/55')) {
          return { ok: true, json: async () => ({}) } as Response;
        }

        return { ok: false, json: async () => ({ message: 'Not found' }) } as Response;
      });

      const result = await createGitHubPR(dummyConfig, {
        filePath: 'test.txt',
        fileContent: 'updated content',
        branchPrefix: 'feature-test',
        commitMessage: 'update file',
        prTitle: 'Updated PR Title',
        prBody: 'Updated PR Body',
      });

      expect(result).toEqual({
        success: true,
        prUrl: 'https://github.com/pr/55',
        prNumber: 55,
        branch: 'feature-test-12345',
        updated: true,
      });
    });

    it('returns failure when default branch fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Repository not found' }),
      } as Response);

      const result = await createGitHubPR(dummyConfig, {
        filePath: 'test.txt',
        fileContent: 'hello',
        branchPrefix: 'feature',
        commitMessage: 'msg',
        prTitle: 'title',
        prBody: 'body',
      });

      expect(result).toEqual({
        success: false,
        error: 'Repository not found',
      });
    });

    it('returns failure on network exception', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

      const result = await createGitHubPR(dummyConfig, {
        filePath: 'test.txt',
        fileContent: 'hello',
        branchPrefix: 'feature',
        commitMessage: 'msg',
        prTitle: 'title',
        prBody: 'body',
      });

      expect(result).toEqual({
        success: false,
        error: 'Network offline',
      });
    });
  });
});
