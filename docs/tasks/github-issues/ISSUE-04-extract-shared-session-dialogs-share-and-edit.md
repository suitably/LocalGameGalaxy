---
title: "[Modularization] Extract Shared Multi-Player Session Dialogs (ShareSessionLinksDialog & EditSessionDialog)"
labels: ["refactor", "modularization", "sharing", "ui"]
assignees: []
---

## Summary
There are 5 separate implementations of QR Code and Link sharing modals across the app, with GuessArt and Storyteller sharing nearly 500 lines of almost identical code. Both games also implement near-identical session editing modals.

## Problem Details
1. **Share Dialog Duplication:**
   [`guessart/components/SharePlayerLinksDialog.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/SharePlayerLinksDialog.tsx) (243 lines) and [`storyteller/components/ShareStoryLinksDialog.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/storyteller/components/ShareStoryLinksDialog.tsx) (257 lines) are **~90% identical clones**:
   - Both compress session snapshots with `LZString.compressToEncodedURIComponent`.
   - Both resolve relay URLs via `gameRelayStorage.getEffectiveRelay`.
   - Both render `PushNotificationBanner`, QR codes (`QRCodeSVG`), copy button with 2500ms timeout feedback, and `navigator.share`.
   - `wordle/components/WordleDuelModal.tsx` and `garticphone/components/GarticHeader.tsx` duplicate the same QR + Copy patterns.
2. **Edit Session Dialog Duplication:**
   [`guessart/components/EditGameDialog.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/guessart/components/EditGameDialog.tsx) (279 lines) and [`storyteller/components/EditStoryDialog.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/storyteller/components/EditStoryDialog.tsx) (99 lines) duplicate game renaming, player renaming, and validation logic.

## Proposed Solution (SOLID: Open/Closed & Single Responsibility)
1. **Create `src/components/sharing/ShareSessionLinksDialog.tsx`:**
   A generic sharing dialog that accepts:
   - `gameId: string`
   - `players: Array<{ id: string; name: string; isRemote?: boolean; relayUrl?: string }>`
   - `createShareUrl: (player: Player) => string`
   - `onToggleRemote?: (playerId: string) => void`
   - `showPushBanner?: boolean`
2. **Create `src/components/common/EditSessionDialog.tsx`:**
   A reusable dialog for updating session title, local aliases, and player names.
3. Refactor `guessart` and `storyteller` to consume these shared dialogs.

## Affected Files
- New: `src/components/sharing/ShareSessionLinksDialog.tsx`
- New: `src/components/common/EditSessionDialog.tsx`
- Refactor: `src/games/guessart/components/SharePlayerLinksDialog.tsx`
- Refactor: `src/games/storyteller/components/ShareStoryLinksDialog.tsx`
- Refactor: `src/games/guessart/components/EditGameDialog.tsx`
- Refactor: `src/games/storyteller/components/EditStoryDialog.tsx`

## Acceptance Criteria
- [ ] Deletion of ~450 lines of duplicate dialog code.
- [ ] QR code generation, clipboard feedback, and native Web Share behavior are identical across all games.
- [ ] Storyteller gains game alias support automatically through the unified Edit dialog.
