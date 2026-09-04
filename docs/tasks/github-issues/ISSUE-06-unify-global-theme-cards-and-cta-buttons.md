---
title: "[Global][Design System] Unify Theme Tokens, Card Elevation, and Standardize Primary CTA Buttons"
labels: ["design-system", "ui", "theme", "mui"]
assignees: []
---

## Summary
There is no consistent design system across the 11 games. Over 340 hardcoded hex colors bypass the global MUI theme, cards use 7 different border-radius values, and primary action buttons vary from gradient pill buttons to flat rectangles.

## Problem Details
1. **Typography Configuration Missing:**
   [`src/theme.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/theme.ts#L24-L38) defines only `h1`–`h3`. Levels `h4`, `h5`, `h6`, `subtitle1`, and `subtitle2` are unconfigured. Consequently, every game invents ad-hoc `sx={{ fontWeight: 800, fontSize: ... }}` overrides.
2. **Card & Container Styling Chaos:**
   - Cards Lobby: `borderRadius: 3` (24px), border 2px solid cyan `#00acc1`.
   - Storyteller: `borderRadius: 2` (16px), background `rgba(15, 23, 42, 0.6)`.
   - Imposter / Werewolf: `<Paper>` with `borderRadius: 3` and heavy box shadows (6 / 8).
   - Global Theme: Default MUI Paper (4px radius, `#1e1e1e`).
3. **Call-To-Action (CTA) Start Buttons:**
   - Cards: Pill button (`borderRadius: 50`), vibrant gradient `linear-gradient(90deg, #00acc1, #ab47bc)`.
   - GuessArt: `borderRadius: 3`, elevation 4, font size `1.1rem`.
   - Storyteller: Flat solid `#0284c7`, `borderRadius: 1`.
   - Werewolf: Standard theme button with `color="secondary"` (pink).
4. **Hardcoded Color Silos:**
   More than 340 hardcoded hex strings exist in game components rather than using theme palette tokens (`primary.main`, `secondary.main`, `background.paper`, `text.secondary`).

## Proposed Solution (SOLID: Single Responsibility & Consistency)
1. **Expand `src/theme.ts`:**
   - Configure complete typography tokens for `h4`, `h5`, `h6`, `subtitle1`, and `subtitle2` with `fontWeight: 700`.
   - Add default component styles for `MuiCard` and `MuiPaper`:
     ```ts
     MuiCard: {
       styleOverrides: {
         root: {
           borderRadius: 16,
           border: '1px solid rgba(255, 255, 255, 0.08)',
           backgroundImage: 'none',
         },
       },
     },
     ```
   - Standardize button shape (`borderRadius: 10` or `12`).
2. **Create a Standard `<GameSetupLayout>` Shell:**
   A layout component that unifies container maxWidth, padding, title presentation, and bottom CTA button positioning.
3. Replace hardcoded Tailwind/Slate colors with MUI theme palette references.

## Affected Files
- `src/theme.ts`
- All game lobby files: `CardsLobby.tsx`, `GameSetup.tsx` (GuessArt, Imposter, Werewolf), `StoryLobby.tsx`

## Acceptance Criteria
- [ ] Global theme defines typography and card defaults.
- [ ] All game lobby setup cards share the same border radius and elevation.
- [ ] Primary start/launch buttons in all games follow a single consistent design language.
