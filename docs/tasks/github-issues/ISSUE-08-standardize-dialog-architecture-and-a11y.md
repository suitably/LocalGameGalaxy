---
title: "[Global][A11y] Standardize Dialog Architecture (Eliminate HTML <dialog> & Native window.confirm) and Fix Missing Aria-Labels"
labels: ["accessibility", "ui", "dialogs", "best-practices"]
assignees: []
---

## Summary
The codebase currently mixes 5 incompatible modal architectures, including native HTML `<dialog>` with manual `.showModal()` refs, blocking browser `window.confirm()`, and fixed `<div>` overlays. In addition, dozens of action buttons lack accessible labels.

## Problem Details
1. **Native HTML `<dialog>` with Imperative DOM Calls:**
   In [`guessart/components/RoundSuccessModal.tsx:L47-L105`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/RoundSuccessModal.tsx#L47) and [`GameInfoDialog.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/GameInfoDialog.tsx):
   The component uses `<dialog ref={dialogRef}>` and synchronizes `open` state imperatively via `dialogRef.current?.showModal()`. This bypasses MUI's portal tree, breaks focus management, and uses inconsistent ESC-key handling.
2. **Blocking Native `window.confirm()`:**
   In [`MelodiqPlaylists.tsx:L142`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/MelodiqPlaylists.tsx#L142):
   Calls native synchronous `window.confirm()`, which freezes the JavaScript thread and renders an unstyled OS alert on mobile.
3. **Fixed `<div>` Overlays with Extreme z-Index:**
   In `PhoneClientEngine.tsx:L373` and `ScoreBoard.tsx:L117`, fullscreen modals are built using `<div style={{ position: 'fixed', zIndex: 9999 }}>` without focus traps or ARIA roles.
4. **Missing `aria-label` Attributes:**
   IconButtons in `cards` (`OhHellGameView.tsx`, `SchwimmenGameView.tsx`, `UniversalScoreView.tsx`) have no `aria-label`, failing accessibility checks for screen readers.

## Proposed Solution (SOLID: Single Responsibility & Consistency)
1. **Refactor GuessArt modals to MUI `<Dialog>`:**
   Replace native `<dialog>` tags with standard MUI `<Dialog open={open} onClose={onClose}>`.
2. **Standardize Confirmation Modals:**
   Introduce a reusable `<ConfirmDialog open={...} title={...} message={...} onConfirm={...} onCancel={...} />` component. Replace `window.confirm()` in Melodiq.
3. **Add Missing `aria-label` Attributes:**
   Ensure all `<IconButton>` components across all 11 games have descriptive `aria-label` attributes using i18n translation keys.

## Affected Files
- `src/games/guessart/components/RoundSuccessModal.tsx`
- `src/games/guessart/components/GameInfoDialog.tsx`
- `src/games/melodiq/components/MelodiqPlaylists.tsx`
- `src/games/melodiq/PhoneClientEngine.tsx`
- `src/games/cards/components/SchwimmenGameView.tsx`
- `src/games/cards/components/OhHellGameView.tsx`
- `src/games/cards/components/UniversalScoreView.tsx`

## Acceptance Criteria
- [ ] Zero native `<dialog>` tags and zero `window.confirm()` calls in the codebase.
- [ ] All modals use Material-UI `<Dialog>` with proper focus traps and backdrop transitions.
- [ ] Accessibility: All IconButtons have descriptive `aria-label` attributes.
