# GuessArt Catalogue Editor & Git PR Publisher Plan [ID: PLAN-GUESSART-CATALOGUE-001]

Implement an in-game editor for GuessArt categories and words with multi-language support (German & English) and an automated GitHub Pull Request publishing pipeline via the helper server backend.

## Goal Description
1. **Local Catalogue Management**: Allow users to browse, create, edit, and delete categories and words locally in IndexedDB. Word items support difficulty ratings (1-3), canonical terms, and synonyms for each language (`de`, `en`).
2. **Game Integration**: Seamlessly reflect catalogue updates in GuessArt gameplay (e.g. `WordSelector`, hint generators, guess evaluation).
3. **Automated Git PR Publishing**: Reuse and extend the existing helper server GitHub integration (`/api/feedback` config) with a dedicated endpoint (`POST /api/guessart/publish-catalogue`) that creates a feature branch, commits the updated `defaultLexicon.ts`, and opens a GitHub Pull Request with a formatted changelog for repository admins to review and merge or reject.

## Proposed Changes

### Backend Helper Server
#### [MODIFY] [server/src/routes/index.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/routes/index.js)
- Register `POST /api/guessart/publish-catalogue` endpoint in the helper server router.

#### [MODIFY] [server/src/controllers/configController.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/controllers/configController.js)
- Add `publishGuessArtCatalogue(req, res)` handler:
  - Validates GitHub token, owner, and repository from existing config (`config.githubToken`, `config.githubOwner`, `config.githubRepo`).
  - Queries GitHub API to get default branch and base commit SHA.
  - Creates a new git branch `guessart-lexicon-<timestamp>`.
  - Commits updated `src/games/guessart/logic/defaultLexicon.ts` file.
  - Opens a Pull Request with title `[GuessArt] Update Word & Category Catalogue` and a detailed markdown diff description of added/modified categories and words.
  - Returns `{ success: true, prUrl, prNumber }`.

### GuessArt Logic Layer
#### [MODIFY] [src/games/guessart/logic/catalogueManager.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/logic/catalogueManager.ts)
- Add functions to:
  - Read master catalogue (`getMasterCatalogue`).
  - Save full catalogue (`saveMasterCatalogue`).
  - Reset catalogue to default lexicon (`resetMasterCatalogue`).
  - Add/Update/Delete Category and Word.
  - Generate TypeScript code for `defaultLexicon.ts` (`generateLexiconTsCode`).
  - Calculate change summary / diff against default lexicon.

#### [MODIFY] [src/games/guessart/logic/types.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/logic/types.ts)
- Add interfaces for catalogue change summaries and publish payloads.

### UI Components (SOLID Architecture < 250 LOC)
#### [CREATE] [src/games/guessart/components/catalogue/CatalogueEditorDialog.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/catalogue/CatalogueEditorDialog.tsx)
- Main container dialog with tabs:
  - Categories (`CategoryEditorTab`)
  - Words (`WordEditorTab`)
  - Publish to Git (`PublishCatalogueTab`)

#### [CREATE] [src/games/guessart/components/catalogue/CategoryEditorTab.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/catalogue/CategoryEditorTab.tsx)
- Listing of categories with inline edit / delete and "Add Category" modal.

#### [CREATE] [src/games/guessart/components/catalogue/WordEditorTab.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/catalogue/WordEditorTab.tsx)
- Category filter, search box, word list with difficulty indicators, and "Add / Edit Word" form with multi-language inputs.

#### [CREATE] [src/games/guessart/components/catalogue/PublishCatalogueTab.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/catalogue/PublishCatalogueTab.tsx)
- Displays difference summary (new/edited items), user note, and triggers helper server `/api/guessart/publish-catalogue` with direct PR link upon success.

#### [MODIFY] [src/games/guessart/components/GameSetup.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/GameSetup.tsx)
- Add "Wortkatalog bearbeiten" button in header.

#### [MODIFY] [src/games/guessart/components/WordSelector.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/WordSelector.tsx)
- Add edit catalogue shortcut button.

#### [MODIFY] [src/games/guessart/GuessArtGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/GuessArtGame.tsx)
- Manage `catalogueEditorOpen` state and render `CatalogueEditorDialog`.

### Localization (i18n)
#### [MODIFY] [public/locales/de/translation.json](file:///home/deck/Projects/LocalGameGalaxy/public/locales/de/translation.json)
- Add German translation keys for catalogue editor, category/word editing, and PR publishing.

#### [MODIFY] [public/locales/en/translation.json](file:///home/deck/Projects/LocalGameGalaxy/public/locales/en/translation.json)
- Add English translation keys for catalogue editor, category/word editing, and PR publishing.

## Verification Plan

### Automated Tests
- Add unit tests in `src/games/guessart/logic/guessart.test.ts` for catalogue manager CRUD operations and `defaultLexicon.ts` code generator.
- Run `npx vitest run` to ensure all tests pass.
- Run `npm run lint` and `npm run build` to verify clean build without TypeScript or lint errors.

### Manual Testing
- Open Catalogue Editor from GameSetup and WordSelector.
- Add a new category and a new word with German and English translations and synonyms.
- Play a round in GuessArt and verify the newly added word appears and is evaluated properly.
- Open the "Publish" tab, verify change summary, and test the PR creation flow with backend helper server.
