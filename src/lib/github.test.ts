import { describe, it, expect, beforeEach } from 'vitest';
import { hasGitHubPAT, resolveGitHubConfig } from './github';
import { storage, STORAGE_KEYS } from './storage';

describe('github.ts', () => {
    beforeEach(() => {
        storage.clear();
    });

    describe('hasGitHubPAT', () => {
        it('returns false when GITHUB_TOKEN is not set', () => {
            expect(hasGitHubPAT()).toBe(false);
        });

        it('returns false when GITHUB_TOKEN is empty or whitespace-only', () => {
            storage.set(STORAGE_KEYS.GITHUB_TOKEN, '   ');
            expect(hasGitHubPAT()).toBe(false);
        });

        it('returns true when a valid non-empty GITHUB_TOKEN is set', () => {
            storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_token123');
            expect(hasGitHubPAT()).toBe(true);
        });
    });

    describe('resolveGitHubConfig', () => {
        it('precedence 1: returns local config when GITHUB_TOKEN is set with default owner and repo', () => {
            storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_secret_token');

            const result = resolveGitHubConfig();

            expect(result).toEqual({
                config: {
                    owner: 'suitably',
                    repo: 'LocalGameGalaxy',
                    token: 'ghp_secret_token',
                },
                source: 'local',
            });
        });

        it('precedence 1: returns local config with custom owner and repo when specified in storage', () => {
            storage.set(STORAGE_KEYS.GITHUB_TOKEN, 'ghp_secret_token');
            storage.set(STORAGE_KEYS.GITHUB_OWNER, 'my-org');
            storage.set(STORAGE_KEYS.GITHUB_REPO, 'my-repo');

            const result = resolveGitHubConfig();

            expect(result).toEqual({
                config: {
                    owner: 'my-org',
                    repo: 'my-repo',
                    token: 'ghp_secret_token',
                },
                source: 'local',
            });
        });

        it('precedence 2: returns server source when GITHUB_TOKEN is missing but helper is active', () => {
            storage.setHelperActive(true);

            const result = resolveGitHubConfig();

            expect(result).toEqual({
                config: null,
                source: 'server',
            });
        });

        it('precedence 3: returns none source when GITHUB_TOKEN is missing and helper is inactive', () => {
            storage.setHelperActive(false);

            const result = resolveGitHubConfig();

            expect(result).toEqual({
                config: null,
                source: 'none',
            });
        });
    });
});
