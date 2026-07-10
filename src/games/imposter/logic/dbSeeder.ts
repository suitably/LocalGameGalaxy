import { countCategories, countWordPairs, seedCategories, seedWordPairs } from './imposterRepository';
import { WORD_PAIRS_EN } from './wordPairs_en';
import { WORD_PAIRS_DE } from './wordPairs_de';
import { CATEGORIES, type WordPair, type WordPairCategory } from './wordPairCategories';

/**
 * Seeds the Imposter game database with initial categories and word pairs.
 * Skips if the database is already seeded.
 */
export async function seedImposterDatabase(): Promise<void> {
    const categoryCount = await countCategories();
    const wordPairCount = await countWordPairs();

    if (categoryCount > 0 && wordPairCount > 0) {
        console.log('Imposter database already seeded.');
        return;
    }

    console.log('Seeding Imposter database...');

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
                de: dePair ? dePair.words : enPair.words // Fallback to EN if DE is missing (should not happen)
            },
            categoryIds: enPair.categoryIds
        };
    });

    await seedWordPairs(pairsToSeed);
    console.log(`Seeded ${categoriesToSeed.length} categories and ${pairsToSeed.length} word pairs.`);
}
