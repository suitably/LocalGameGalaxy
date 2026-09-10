---
title: "[Refactor][Performance] Split LayoutContext.tsx God Context to prevent unnecessary re-renders"
labels: ["refactoring", "performance", "react", "context", "priority:medium"]
assignees: []
---

## Summary
`src/context/LayoutContext.tsx` holds multiple orthogonal UI states in a single context value:
- `title`
- `headerHidden`
- `customHeaderActions`
- `menuItems`
- `homeAction`
- `isSettingsMode`

Because all fields share one context, whenever the `title` changes (such as on route navigation), every component consuming `useLayoutContext` (e.g. components only checking `isSettingsMode` or `headerHidden`) is forced to re-render.
This violates the Interface Segregation Principle (ISP) at the React context level.

## Problem Details & Exact Code Locations
- File: [`src/context/LayoutContext.tsx:1-170`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/context/LayoutContext.tsx#L1)
- Context consumers across the codebase:
  ```bash
  grep -rn "useLayoutContext" src/
  ```

## Dependencies & Preconditions
- **Dependencies:** None. Can be worked on independently.

## Step-by-Step Implementation Instructions
1. Analyze consumers and group state by update frequency and concern:
   - **`TitleContext`** (`src/context/TitleContext.tsx` - already partially present or extend it):
     `title`, `setTitle`
   - **`HeaderLayoutContext`**:
     `headerHidden`, `setHeaderHidden`, `customHeaderActions`, `setCustomHeaderActions`, `menuItems`, `setMenuItems`, `homeAction`, `setHomeAction`
   - **`SettingsModeContext`**:
     `isSettingsMode`, `setSettingsMode`
2. Update `usePageTitle` hook to consume only `TitleContext`.
3. Keep `LayoutContext.tsx` as a composite provider or maintain a backward-compatible adapter hook `useLayoutContext()` so individual games don't all break at once, while deprecating the combined hook in favor of focused hooks (`useHeaderLayout()`, `useSettingsMode()`, `useTitle()`).
4. Update `GlobalHeader.tsx` to read the split contexts.

## Affected Files
- `src/context/LayoutContext.tsx`
- `src/context/TitleContext.tsx`
- `src/context/HeaderLayoutContext.tsx` (new)
- `src/components/Layout/GlobalHeader.tsx`
- `src/hooks/usePageTitle.ts` (or `LayoutContext.tsx` export)

## Acceptance Criteria & Verification
- [ ] Changing page title does not trigger re-renders in components that only read `isSettingsMode` or `headerHidden`.
- [ ] Navigation, custom header action buttons, and back button behaviors function smoothly.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
