/**
 * Shared category IDs for word pairs.
 * Word pairs can belong to multiple categories.
 */
export const WORD_PAIR_CATEGORY_IDS = [
    'food_drinks',
    'technology',
    'entertainment',
    'sports',
    'nature_animals',
    'brands',
    'places',
    'famous_people',
    'games',
    'general'
] as const;

export type WordPairCategoryId = typeof WORD_PAIR_CATEGORY_IDS[number];

export interface WordPairCategory {
    id: WordPairCategoryId;
    name: {
        en: string;
        de: string;
    };
}

export interface WordPair {
    words: [string, string];
    categoryIds: WordPairCategoryId[];
}

export const CATEGORIES: WordPairCategory[] = [
    { id: 'food_drinks', name: { en: 'Food & Drinks', de: 'Essen & Trinken' } },
    { id: 'technology', name: { en: 'Technology', de: 'Technologie' } },
    { id: 'entertainment', name: { en: 'Entertainment', de: 'Unterhaltung' } },
    { id: 'sports', name: { en: 'Sports', de: 'Sport' } },
    { id: 'nature_animals', name: { en: 'Nature & Animals', de: 'Natur & Tiere' } },
    { id: 'brands', name: { en: 'Brands & Companies', de: 'Marken & Unternehmen' } },
    { id: 'places', name: { en: 'Places', de: 'Orte' } },
    { id: 'famous_people', name: { en: 'Famous People', de: 'Berühmte Personen' } },
    { id: 'games', name: { en: 'Games', de: 'Spiele' } },
    { id: 'general', name: { en: 'General', de: 'Allgemein' } },
];
