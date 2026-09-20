import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasGitHubPAT, resolveGitHubConfig } from './github';
import { storage, STORAGE_KEYS } from './storage';

describe('github lib', () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  describe('hasGitHubPAT', () => {
    it('returns true when a valid non-empty token is stored', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_1234567890abcdef');
      expect(hasGitHubPAT()).toBe(true);
    });

    it('returns false when no token is stored', () => {
      expect(hasGitHubPAT()).toBe(false);
    });

    it('returns false when empty string is stored', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, '');
      expect(hasGitHubPAT()).toBe(false);
    });

    it('returns false when token contains only whitespace', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, '   \t\n  ');
      expect(hasGitHubPAT()).toBe(false);
    });
  });

  describe('resolveGitHubConfig', () => {
    it('returns local config when local PAT is configured', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_secrettoken');
      storage.set(STORAGE_KEYS.GITHUB_OWNER, 'my-org');
      storage.set(STORAGE_KEYS.GITHUB_REPO, 'my-repo');

      const result = resolveGitHubConfig();
      expect(result).toEqual({
        config: {
          owner: 'my-org',
          repo: 'my-repo',
          token: 'ghp_secrettoken',
        },
        source: 'local',
      });
    });

    it('uses default fallback owner and repo if not explicitly set in storage', () => {
      storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_secrettoken');

      const result = resolveGitHubConfig();
      expect(result).toEqual({
        config: {
          owner: 'suitably',
          repo: 'LocalGameGalaxy',
          token: 'ghp_secrettoken',
        },
        source: 'local',
      });
    });

    it('returns server proxy source when no local PAT is set and helper is active', () => {
      storage.setHelperActive(true);

      const result = resolveGitHubConfig();
      expect(result).toEqual({
        config: null,
        source: 'server',
      });
    });

    it('returns none source when no local PAT is set and helper is not active', () => {
      storage.setHelperActive(false);

      const result = resolveGitHubConfig();
      expect(result).toEqual({
        config: null,
        source: 'none',
      });
    });
  });
});
