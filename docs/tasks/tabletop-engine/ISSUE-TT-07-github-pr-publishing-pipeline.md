---
title: "[Feature][Tabletop] Community 1-Click GitHub PR Publishing Pipeline"
labels: ["tabletop", "github", "community", "feature", "priority:medium"]
assignees: []
---

## Summary
Implement a 1-click publishing dialog that allows players to contribute locally created or imported tabletop games back to the LocalGameGalaxy community repository via the GitHub REST API (`src/lib/github.ts`), matching the workflow established in GuessArt word catalogues.

## Architectural Context & Guidelines
- **GitHub Integration Reuse (Section 3 & 5 in docs/tech/architecture.md)**:
  - Reuse `createGitHubPR`, `hasGitHubPAT`, `resolveGitHubConfig` from `src/lib/github.ts`.
  - Store game JSON definitions in `public/games/tabletop/<slug>.json`.
  - Do NOT duplicate GitHub API logic or token handling.
- **Dialogs & Modals**:
  - Use MUI `<Dialog>` (never native dialogs).
  - Target component size: < 200 lines.
- **i18n**:
  - Full translation for all steps (`form`, `validating`, `creating_pr`, `success`, `error`).

## Dependencies & Preconditions
- **Depends on:** `ISSUE-TT-02` (Storage & Games Manager)

## File Paths to Create
- `src/games/tabletop/components/publisher/PublishTabletopGameDialog.tsx`: Modal dialog guiding the user through metadata review and PR submission.
- `src/games/tabletop/components/publisher/PublishFormFields.tsx`: Sub-component for editing public title, description, category, and author tags.
- `src/games/tabletop/logic/publishValidator.ts`: Pre-flight check ensuring game passes sanity checks before PR creation.

## Step-by-Step Implementation Instructions

1. **Implement Pre-Flight Check (`publishValidator.ts`)**:
   - Sanitize slug: `game.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')`.
   - Validate game definition:
     - Title at least 3 characters.
     - Description provided.
     - At least 1 widget.
     - Mode declared (`supportedModes.length > 0`).
     - JSON payload reasonable (< 2 MB).

2. **Build Dialog (`PublishTabletopGameDialog.tsx`)**:
   - Step 1: Check GitHub PAT status via `hasGitHubPAT()`. If missing, offer link to `/settings?tab=general&sub=feedback`.
   - Step 2: Form fields (Game Name, English Description, German Description, Author Name, License: MIT/CC0).
   - Step 3: Call `createGitHubPR` with:
     ```typescript
     const slug = sanitizeSlug(game.name);
     const res = await createGitHubPR(config, {
       filePath: `public/games/tabletop/${slug}.json`,
       fileContent: JSON.stringify(game, null, 2),
       branchPrefix: `tabletop/add-${slug}`,
       commitMessage: `feat(tabletop): add community game ${game.name}`,
       prTitle: `[Tabletop Game] Add ${game.name}`,
       prBody: `### New Community Tabletop Game\n\n- **Name:** ${game.name}\n- **Author:** ${author}\n- **Description:** ${description}\n\nSubmitted automatically via LocalGameGalaxy In-App Tabletop Publisher.`,
     });
     ```
   - Step 4: Display success state with direct clickable link to the created GitHub PR (`res.prUrl`).

3. **Integrate Publish Button**:
   - In `GameCardItem.tsx` (from `ISSUE-TT-02`), the "Publish / Als PR einreichen" button opens `PublishTabletopGameDialog`.

## Verification & Quality Gates
```bash
npm run check:architecture:diff
npm run check:budget
npm run lint
npm test -- src/games/tabletop
npm run build
```
