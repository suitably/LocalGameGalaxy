import { STORE_CATALOGUES, STORE_METADATA, clearStore, getByKey, putItem } from './db';
import { DEFAULT_CATEGORIES, DEFAULT_WORDS } from './defaultLexicon';
import { normalizeLanguageCode } from './hintResolver';
import { resolveGitHubConfig, createGitHubPR } from '../../../lib/github';
import type {
  CatalogueDiffSummary,
  CategoryItem,
  MasterCatalogue,
  PublishCatalogueResult,
  WordItem,
} from './types';

const METADATA_KEY_MASTER_CATALOGUE = 'master_catalogue';

export interface CachedCatalogue {
  language: string;
  downloadedAt: string;
  categories: CategoryItem[];
  wordsByCategory: Record<string, WordItem[]>;
}

export const getMasterCatalogue = async (): Promise<MasterCatalogue> => {
  const meta = await getByKey<{ key: string; catalogue: MasterCatalogue }>(
    STORE_METADATA,
    METADATA_KEY_MASTER_CATALOGUE,
  );
  if (meta?.catalogue) {
    return meta.catalogue;
  }

  const initial: MasterCatalogue = {
    id: 'master',
    version: 1,
    updatedAt: new Date().toISOString(),
    categories: [...DEFAULT_CATEGORIES],
    words: [...DEFAULT_WORDS],
  };

  return initial;
};

export const saveMasterCatalogue = async (
  categories: CategoryItem[],
  words: WordItem[],
): Promise<MasterCatalogue> => {
  const master: MasterCatalogue = {
    id: 'master',
    version: 1,
    updatedAt: new Date().toISOString(),
    categories,
    words,
  };

  await putItem(STORE_METADATA, {
    key: METADATA_KEY_MASTER_CATALOGUE,
    catalogue: master,
  });

  // Clear cached per-language entries so ensureCatalogueEntry re-indexes with new master data
  await clearStore(STORE_CATALOGUES);

  return master;
};

export const resetMasterCatalogue = async (): Promise<MasterCatalogue> => {
  return saveMasterCatalogue([...DEFAULT_CATEGORIES], [...DEFAULT_WORDS]);
};

export const ensureCatalogueEntry = async (lang: string): Promise<CachedCatalogue> => {
  const normalized = normalizeLanguageCode(lang || 'en');
  const existing = await getByKey<CachedCatalogue>(STORE_CATALOGUES, normalized);
  if (existing) {
    return existing;
  }

  const master = await getMasterCatalogue();
  const wordsByCategory: Record<string, WordItem[]> = {};

  master.categories.forEach((cat) => {
    wordsByCategory[String(cat.id)] = [];
  });

  master.words.forEach((word) => {
    const catId = String(word.categoryId || 'cat_objects');
    if (!wordsByCategory[catId]) {
      wordsByCategory[catId] = [];
    }
    wordsByCategory[catId].push(word);
  });

  const fresh: CachedCatalogue = {
    language: normalized,
    downloadedAt: new Date().toISOString(),
    categories: master.categories,
    wordsByCategory,
  };

  await putItem(STORE_CATALOGUES, fresh);
  return fresh;
};

export const getCachedCatalogue = async (lang: string): Promise<CachedCatalogue> => {
  return ensureCatalogueEntry(lang);
};

export const listCategories = async (lang: string): Promise<CategoryItem[]> => {
  const catalogue = await ensureCatalogueEntry(lang);
  return catalogue.categories || [];
};

export const listWordsForCategory = async (
  categoryId: string | number,
  lang: string,
): Promise<WordItem[]> => {
  const catalogue = await ensureCatalogueEntry(lang);
  const key = String(categoryId);
  return catalogue.wordsByCategory?.[key] || [];
};

export const getCategoryName = (category: CategoryItem, lang: string): string => {
  const normalized = normalizeLanguageCode(lang);
  const translation = category.translations?.find((t) => t.languageCode === normalized);
  return translation?.name || category.name || String(category.id);
};

export const getWordDisplay = (word: WordItem, lang: string): string => {
  const normalized = normalizeLanguageCode(lang);
  if (word.translations && word.translations[normalized]?.canonical) {
    return word.translations[normalized].canonical;
  }
  if (word.translations) {
    const firstTranslation = Object.values(word.translations)[0];
    if (firstTranslation?.canonical) {
      return firstTranslation.canonical;
    }
  }
  return word.word || '???';
};

/**
 * Calculates a structured difference summary between the provided categories/words and the default lexicon.
 */
export const calculateCatalogueDiff = (
  categories: CategoryItem[],
  words: WordItem[],
): CatalogueDiffSummary => {
  const defaultCategoryMap = new Map(DEFAULT_CATEGORIES.map((c) => [String(c.id), c]));
  const defaultWordMap = new Map(DEFAULT_WORDS.map((w) => [String(w.id), w]));

  const addedCategories: CategoryItem[] = [];
  const modifiedCategories: CategoryItem[] = [];
  const deletedCategories: CategoryItem[] = [];

  const addedWords: WordItem[] = [];
  const modifiedWords: WordItem[] = [];
  const deletedWords: WordItem[] = [];

  const currentCategoryMap = new Map(categories.map((c) => [String(c.id), c]));
  const currentWordMap = new Map(words.map((w) => [String(w.id), w]));

  // Check categories
  for (const cat of categories) {
    const catKey = String(cat.id);
    if (!defaultCategoryMap.has(catKey)) {
      addedCategories.push(cat);
    } else {
      const original = defaultCategoryMap.get(catKey)!;
      if (JSON.stringify(original) !== JSON.stringify(cat)) {
        modifiedCategories.push(cat);
      }
    }
  }

  for (const defaultCat of DEFAULT_CATEGORIES) {
    if (!currentCategoryMap.has(String(defaultCat.id))) {
      deletedCategories.push(defaultCat);
    }
  }

  // Check words
  for (const word of words) {
    const wordKey = String(word.id);
    if (!defaultWordMap.has(wordKey)) {
      addedWords.push(word);
    } else {
      const original = defaultWordMap.get(wordKey)!;
      if (JSON.stringify(original) !== JSON.stringify(word)) {
        modifiedWords.push(word);
      }
    }
  }

  for (const defaultWord of DEFAULT_WORDS) {
    if (!currentWordMap.has(String(defaultWord.id))) {
      deletedWords.push(defaultWord);
    }
  }

  const totalChanges =
    addedCategories.length +
    modifiedCategories.length +
    deletedCategories.length +
    addedWords.length +
    modifiedWords.length +
    deletedWords.length;

  return {
    addedCategories,
    modifiedCategories,
    deletedCategories,
    addedWords,
    modifiedWords,
    deletedWords,
    totalChanges,
  };
};

/**
 * Generates formatted TypeScript source code for defaultLexicon.ts.
 */
export const generateLexiconTsCode = (
  categories: CategoryItem[],
  words: WordItem[],
): string => {
  const categoriesJson = JSON.stringify(categories, null, 2);
  const wordsJson = JSON.stringify(words, null, 2);

  return `import type { CategoryItem, WordItem } from './types';

export const DEFAULT_CATEGORIES: CategoryItem[] = ${categoriesJson};

export const DEFAULT_WORDS: WordItem[] = ${wordsJson};
`;
};

/**
 * Publishes the catalogue changes to GitHub.
 * Strategy: Try direct GitHub API (local PAT) first, fall back to server proxy.
 */
export const publishCatalogueToGit = async (options: {
  baseUrl: string;
  token?: string;
  categories: CategoryItem[];
  words: WordItem[];
  userNote?: string;
  prTitle?: string;
}): Promise<PublishCatalogueResult> => {
  const diff = calculateCatalogueDiff(options.categories, options.words);
  const tsContent = generateLexiconTsCode(options.categories, options.words);

  let summaryMarkdown = `## GuessArt Lexicon Update\n\n`;
  if (options.userNote?.trim()) {
    summaryMarkdown += `**Note from Contributor:**\n> ${options.userNote.trim()}\n\n`;
  }

  summaryMarkdown += `### Summary of Changes:\n`;
  summaryMarkdown += `- **Categories:** ${diff.addedCategories.length} added, ${diff.modifiedCategories.length} modified, ${diff.deletedCategories.length} deleted\n`;
  summaryMarkdown += `- **Words:** ${diff.addedWords.length} added, ${diff.modifiedWords.length} modified, ${diff.deletedWords.length} deleted\n\n`;

  if (diff.addedCategories.length > 0) {
    summaryMarkdown += `#### Added Categories:\n`;
    diff.addedCategories.forEach((c) => {
      const de = c.translations?.find((t) => t.languageCode === 'de')?.name || '';
      const en = c.translations?.find((t) => t.languageCode === 'en')?.name || '';
      summaryMarkdown += `- \`${c.id}\`: ${en} (DE: ${de})\n`;
    });
    summaryMarkdown += `\n`;
  }

  if (diff.addedWords.length > 0) {
    summaryMarkdown += `#### Added Words:\n`;
    diff.addedWords.forEach((w) => {
      const deCanonical = w.translations?.de?.canonical || '';
      const enCanonical = w.translations?.en?.canonical || '';
      summaryMarkdown += `- **${enCanonical || w.word}** (DE: ${deCanonical}, Category: \`${w.categoryId}\`, Difficulty: ${w.difficulty || 2})\n`;
    });
    summaryMarkdown += `\n`;
  }

  if (diff.modifiedWords.length > 0) {
    summaryMarkdown += `#### Modified Words (${diff.modifiedWords.length}):\n`;
    diff.modifiedWords.slice(0, 20).forEach((w) => {
      summaryMarkdown += `- \`${w.id}\`: ${w.word}\n`;
    });
    if (diff.modifiedWords.length > 20) {
      summaryMarkdown += `- ...and ${diff.modifiedWords.length - 20} more\n`;
    }
    summaryMarkdown += `\n`;
  }

  const prTitle = options.prTitle || '[GuessArt] Update Word & Category Catalogue';
  const prBody = summaryMarkdown + '\n---\n*Created automatically via LocalGameGalaxy In-Game Catalogue Editor.*';

  // Strategy 1: Try direct GitHub API with local PAT
  const { config: ghConfig, source } = resolveGitHubConfig();

  if (source === 'local' && ghConfig) {
    const result = await createGitHubPR(ghConfig, {
      filePath: 'src/games/guessart/logic/defaultLexicon.ts',
      fileContent: tsContent,
      branchPrefix: 'guessart/catalogue-update',
      commitMessage: 'feat(guessart): update word and category catalogue',
      prTitle,
      prBody,
    });

    if (result.success && result.prUrl && result.prNumber !== undefined && result.branch) {
      return {
        success: true,
        prUrl: result.prUrl,
        prNumber: result.prNumber,
        branch: result.branch,
      };
    }
    // If direct fails and no server is available, throw error
    if (!options.baseUrl) {
      throw new Error(result.error || 'Failed to publish catalogue via GitHub API');
    }
  }

  // Strategy 2: Fall back to server proxy
  const cleanBaseUrl = options.baseUrl.replace(/\/$/, '');
  const response = await fetch(`${cleanBaseUrl}/api/guessart/publish-catalogue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify({
      content: tsContent,
      summary: summaryMarkdown,
      prTitle,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to publish catalogue to Git repository');
  }

  return {
    success: true,
    prUrl: data.prUrl,
    prNumber: data.prNumber,
    branch: data.branch,
  };
};

