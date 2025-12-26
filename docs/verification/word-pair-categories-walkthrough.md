# Word Pair Categories Walkthrough

## Changes Made

Added category support to the Imposter game's word pairs, enabling filtering by category. Each pair can belong to multiple categories.

### New Files Created

| File | Description |
|------|-------------|
| [wordPairCategories.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/wordPairCategories.ts) | Shared category definitions and TypeScript types |
| [wordPairs_de.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/wordPairs_de.ts) | ~280 German word pairs with category assignments |
| [wordPairs_en.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/wordPairs_en.ts) | ~280 English word pairs with category assignments |

### Categories

10 categories were created:

| ID | English | German |
|----|---------|--------|
| `food_drinks` | Food & Drinks | Essen & Trinken |
| `technology` | Technology | Technologie |
| `entertainment` | Entertainment | Unterhaltung |
| `sports` | Sports | Sport |
| `nature_animals` | Nature & Animals | Natur & Tiere |
| `brands` | Brands & Companies | Marken & Unternehmen |
| `places` | Places | Orte |
| `famous_people` | Famous People | Berühmte Personen |
| `games` | Games | Spiele |
| `general` | General | Allgemein |

### Data Structure

```ts
// Category definition
interface WordPairCategory {
    id: WordPairCategoryId;
    name: { en: string; de: string; };
}

// Word pair with multi-category support
interface WordPair {
    words: [string, string];
    categoryIds: WordPairCategoryId[];
}
```

Example usage:
```ts
{ words: ['Pizza', 'Burger'], categoryIds: ['food_drinks'] }
{ words: ['Apple', 'Microsoft'], categoryIds: ['technology', 'brands'] }
```

## Verification

- ✅ TypeScript compilation successful for all new files
- ✅ No lint errors in new word pair files
- ⚠️ Pre-existing errors in `words.ts` (unrelated to this change)

## Next Steps

The word pair files are now ready to seed a local database. To integrate them into the game UI:
1. Import `WORD_PAIRS_DE`/`WORD_PAIRS_EN` and `CATEGORIES` from the new files
2. Build category filtering UI
3. Persist user category selections
