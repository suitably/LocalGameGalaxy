import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publishCatalogueToGit } from './catalogueManager';
import { DEFAULT_CATEGORIES, DEFAULT_WORDS } from './lexicon';
import type { CategoryItem, WordItem } from './types';

vi.mock('./db', () => import('./memoryDb.testUtils'));

const githubMock = vi.hoisted(() => ({
  resolveGitHubConfig: vi.fn(),
  createGitHubPR: vi.fn(),
}));
vi.mock('../../../lib/github', () => githubMock);

const category = (id: string, fields: Partial<CategoryItem> = {}): CategoryItem =>
  ({ id, name: id, translations: [], ...fields }) as CategoryItem;

const word = (id: string, fields: Partial<WordItem> = {}): WordItem =>
  ({
    id,
    categoryId: 'cat_custom',
    word: id,
    difficulty: 2,
    translations: {},
    ...fields,
  }) as WordItem;

beforeEach(() => {
  githubMock.resolveGitHubConfig.mockReset();
  githubMock.createGitHubPR.mockReset();
});

describe('publishCatalogueToGit', () => {
  const ghConfig = { owner: 'o', repo: 'r', token: 't' };
  const added = [category('cat_new', { translations: [{ languageCode: 'de', name: 'Neu' }] })];
  const newWords = [
    word('w_new', {
      categoryId: 'cat_new',
      translations: {
        en: { canonical: 'New', synonyms: [] },
        de: { canonical: 'Neu', synonyms: [] },
      },
    }),
  ];

  it('requires a locally stored token', async () => {
    githubMock.resolveGitHubConfig.mockReturnValue({ config: null, source: 'none' });
    await expect(
      publishCatalogueToGit({ categories: DEFAULT_CATEGORIES, words: DEFAULT_WORDS }),
    ).rejects.toThrow(/Personal Access Token/);
    githubMock.resolveGitHubConfig.mockReturnValue({ config: ghConfig, source: 'server' });
    await expect(
      publishCatalogueToGit({ categories: DEFAULT_CATEGORIES, words: DEFAULT_WORDS }),
    ).rejects.toThrow(/Personal Access Token/);
    expect(githubMock.createGitHubPR).not.toHaveBeenCalled();
  });

  it('builds the PR with a change summary and returns its data', async () => {
    githubMock.resolveGitHubConfig.mockReturnValue({ config: ghConfig, source: 'local' });
    githubMock.createGitHubPR.mockResolvedValue({
      success: true,
      prUrl: 'https://example.test/pr/1',
      prNumber: 1,
      branch: 'guessart/catalogue-update-1',
      updated: false,
    });
    const result = await publishCatalogueToGit({
      categories: [...DEFAULT_CATEGORIES, ...added],
      words: [...DEFAULT_WORDS, ...newWords],
      userNote: '  please merge ',
    });
    expect(result).toEqual({
      success: true,
      prUrl: 'https://example.test/pr/1',
      prNumber: 1,
      branch: 'guessart/catalogue-update-1',
      updated: false,
    });
    const [config, pr] = githubMock.createGitHubPR.mock.calls[0];
    expect(config).toEqual(ghConfig);
    expect(pr.filePath).toBe('src/games/guessart/logic/lexicon.ts');
    expect(pr.prTitle).toBe('[GuessArt] Update Word & Category Catalogue');
    expect(pr.fileContent).toContain('cat_new');
    expect(pr.prBody).toContain('> please merge');
    expect(pr.prBody).toContain('- **Categories:** 1 added, 0 modified, 0 deleted');
    expect(pr.prBody).toContain('- **Words:** 1 added, 0 modified, 0 deleted');
    expect(pr.prBody).toContain('- `cat_new`:  (DE: Neu)');
    expect(pr.prBody).toContain('- **New** (DE: Neu, Category: `cat_new`, Difficulty: 2)');
  });

  it('lists at most 20 modified words and honours a custom title', async () => {
    githubMock.resolveGitHubConfig.mockReturnValue({ config: ghConfig, source: 'local' });
    githubMock.createGitHubPR.mockResolvedValue({
      success: true,
      prUrl: 'u',
      prNumber: 2,
      branch: 'b',
    });
    const modified = DEFAULT_WORDS.slice(0, 25).map((w) => ({ ...w, difficulty: 9 }) as WordItem);
    await publishCatalogueToGit({
      categories: DEFAULT_CATEGORIES,
      words: [...modified, ...DEFAULT_WORDS.slice(25)],
      prTitle: 'Custom',
    });
    const pr = githubMock.createGitHubPR.mock.calls[0][1];
    expect(pr.prTitle).toBe('Custom');
    expect(pr.prBody).toContain('#### Modified Words (25):');
    expect(pr.prBody).toContain('- ...and 5 more');
  });

  it('throws the API error when the PR could not be created', async () => {
    githubMock.resolveGitHubConfig.mockReturnValue({ config: ghConfig, source: 'local' });
    githubMock.createGitHubPR.mockResolvedValue({ success: false, error: 'rate limited' });
    await expect(
      publishCatalogueToGit({ categories: DEFAULT_CATEGORIES, words: DEFAULT_WORDS }),
    ).rejects.toThrow('rate limited');
    githubMock.createGitHubPR.mockResolvedValue({ success: false });
    await expect(
      publishCatalogueToGit({ categories: DEFAULT_CATEGORIES, words: DEFAULT_WORDS }),
    ).rejects.toThrow('Failed to publish catalogue via GitHub API');
  });
});
