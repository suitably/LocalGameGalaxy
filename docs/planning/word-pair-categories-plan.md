# Word Pair Categories Implementation Plan

## Goal Description

Add category assignments to the word pairs in `wordPairs_de.ts` and `wordPairs_en.ts` so they can be used to seed the local database. Word pairs should support being assigned to multiple categories. The data from these files will be used for fast UI loading.

## Current Architecture

The imposter game currently uses:
- `words.ts`: `CATEGORIES` array with individual words (not pairs!) having `{en, de, hint}` structure
- `types.ts`: `Category` interface with localized names and words array
- `wordPairs_de.ts` / `wordPairs_en.ts`: Raw arrays of word pairs without structure

## Proposed Changes

### Logic Layer

#### [MODIFY] [wordPairs_de.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/wordPairs_de.ts)

Transform from simple array to structured export with:
1. `WORD_PAIR_CATEGORIES` - List of category definitions with `id` and German name
2. `WORD_PAIRS` - Array of word pair objects:
   ```ts
   interface WordPair {
     words: [string, string];  // German pair
     categoryIds: string[];     // Multiple categories
   }
   ```

#### [MODIFY] [wordPairs_en.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/wordPairs_en.ts)

Mirror structure with:
1. `WORD_PAIR_CATEGORIES` - Category definitions with English names
2. `WORD_PAIRS` - Word pairs with English words and same category assignments

---

#### [NEW] [wordPairCategories.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/wordPairCategories.ts)

Single source of truth for category IDs shared between both language files:
```ts
export const WORD_PAIR_CATEGORY_IDS = [
  'food',
  'technology', 
  'entertainment',
  'sports',
  'nature',
  'brands',
  'places',
  'people',
  'games',
  'general'
] as const;
```

## User Review Required

> [!IMPORTANT]
> You need to provide the specific categories you want for your word pairs. Based on the content I see in the files, I suggest these categories:
> - **Food & Drinks** - Pizza/Burger, Coffee/Tea, Beer/Wine, etc.
> - **Technology** - Apple/Microsoft, iPhone/Samsung, ChatGPT/Gemini, etc.
> - **Entertainment** - Movies, TV shows, music, video games
> - **Sports** - Football/Basketball, Tennis/Badminton, etc.
> - **Nature & Animals** - Dog/Cat, Sun/Moon, Beach/Mountain, etc.
> - **Brands & Companies** - Adidas/Nike, McDonalds/KFC, etc.
> - **Places** - Cities, landmarks, countries
> - **Famous People** - Einstein/Newton, Messi/Ronaldo, etc.
> - **Games** - Board games, video games
> - **General** - Catch-all category

**Please confirm these categories or provide your own list before I proceed.**

## Verification Plan

### Manual Verification
- Build the project with `npm run build` 
- Verify TypeScript compiles without errors
- Check that imports work correctly in the codebase

Since these are static data files used to seed a database, no runtime testing is needed - the TypeScript compiler will catch any structural errors.
