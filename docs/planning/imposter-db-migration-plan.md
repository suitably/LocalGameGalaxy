# Imposter Word Pairs Database Migration Plan

## Goal Description
Migrate the Imposter game UI to fetch word pairs and categories from a local Dexie database instead of static TypeScript files. This ensures fast UI loading and allows for easier data management.

## Proposed Changes

### Database Layer
#### [MODIFY] [db.ts](file:///home/deck/Projects/LocalGameGalaxy/src/lib/db.ts)
Update the Dexie database schema to include tables for Imposter game:
- `imposter_categories`: `{ id, name_en, name_de }`
- `imposter_word_pairs`: `{ id, word_en_1, word_en_2, word_de_1, word_de_2, categoryIds }` (indexed by `categoryIds`)

### Logic Layer
#### [NEW] [dbSeeder.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/dbSeeder.ts)
- Create a utility to seed the initial data from `wordPairs_de.ts`, `wordPairs_en.ts`, and `wordPairCategories.ts`.
- It will run once on initialization if the tables are empty.

#### [MODIFY] [types.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/types.ts)
- Update `Category` and `GameState` to accommodate the word pair structure.
- Add `WordPair` interface that matches the database record.

### UI Layer
#### [MODIFY] [ImposterGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx)
- Add database initialization (seeding) in a `useEffect`.
- Update `startGame` to fetch a random word pair from the database based on selected categories.

#### [MODIFY] [GameSetup.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/GameSetup.tsx)
- Update to fetch categories from the database.
- Use the new category structure for selection.

#### [MODIFY] [WordEditor.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/WordEditor.tsx)
- Refactor to allow adding/editing/deleting word pairs in the database.

## Verification Plan

### Automated Tests
- No automated tests currently exist for this module. I will rely on manual verification.

### Manual Verification
1.  **Initial Load**: Open the game and verify that categories are loaded into the setup screen.
2.  **Start Game**: Select categories and start the game. Verify that a word and a hint are correctly assigned to players.
3.  **Persistence**: Add a custom word pair/category (if implemented in editor) and refresh to see if it remains.
4.  **Database Inspection**: Use browser dev tools (Application tab -> IndexedDB) to verify `LocalGameGalaxyDB` contains the expected data.
