import { imposterDb } from './db';
import type { DbCategory, DbWordPair } from './types';

export const getImposterCategories = async (): Promise<DbCategory[]> => {
    return imposterDb.imposter_categories.toArray();
};

export const getWordPairsByCategories = async (categoryIds: string[]): Promise<DbWordPair[]> => {
    return imposterDb.imposter_word_pairs
        .where('categoryIds')
        .anyOf(categoryIds)
        .toArray() as Promise<DbWordPair[]>;
};

export const countCategories = async (): Promise<number> => {
    return imposterDb.imposter_categories.count();
};

export const countWordPairs = async (): Promise<number> => {
    return imposterDb.imposter_word_pairs.count();
};

export const seedCategories = async (categories: any[]): Promise<any> => {
    return imposterDb.imposter_categories.bulkPut(categories);
};

export const seedWordPairs = async (pairs: any[]): Promise<any> => {
    return imposterDb.imposter_word_pairs.bulkAdd(pairs);
};
