import { countCategories, countWordPairs, seedCategories, seedWordPairs } from './imposterRepository';
import { WORD_PAIRS_EN } from './wordPairs_en';
import { WORD_PAIRS_DE } from './wordPairs_de';
import { CATEGORIES, type WordPair, type WordPairCategory } from './wordPairCategories';

let seedPromise: Promise<void> | null = null;

/**
 * Seeds the Imposter game database with initial categories and word pairs.
 * Skips if the database is already seeded or currently seeding.
 */
export async function seedImposterDatabase(): Promise<void> {
    if (seedPromise) {
        return seedPromise;
    }

    seedPromise = (async () => {
        try {
            const categoryCount = await countCategories();
            const wordPairCount = await countWordPairs();

            if (categoryCount > 0 && wordPairCount > 0) {
                return;
            }

            // Seed categories
            const categoriesToSeed = CATEGORIES.map((cat: WordPairCategory) => ({
                id: cat.id,
                name: cat.name
            }));
            await seedCategories(categoriesToSeed);

            // Seed word pairs (merging EN and DE)
            // We assume they are aligned by index
            const pairsToSeed = WORD_PAIRS_EN.map((enPair: WordPair, index: number) => {
                const dePair: WordPair | undefined = WORD_PAIRS_DE[index];
                return {
                    words: {
                        en: enPair.words,
                        de: dePair ? dePair.words : enPair.words // Fallback to EN if DE is missing
                    },
                    categoryIds: enPair.categoryIds
                };
            });

            await seedWordPairs(pairsToSeed);
        } catch (error) {
            console.error('[Imposter] Failed to seed database:', error);
            seedPromise = null;
            throw error;
        }
    })();

    return seedPromise;
}
