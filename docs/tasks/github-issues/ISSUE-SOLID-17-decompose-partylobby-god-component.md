---
title: "[Refactor][SRP] Decompose PartyLobby.tsx (623 lines) into focused sub-components"
labels: ["refactoring", "srp", "react", "party", "priority:medium"]
assignees: []
---

## Summary
`src/features/party/PartyLobby.tsx` (623 lines) is a God Component combining:
1. Room connection state and lifecycle
2. Player roster management (add/remove/kick)
3. Share link and QR code modal triggers
4. Game catalogue selector and launch actions
5. Host settings and chat/status messages

Per `AGENTS.md` (Section 4), components exceeding ~250 lines must be split into custom hooks and sub-components. Furthermore, Section 4.1 requires checking the shared catalog (`src/modules/player-management`) to reuse existing components rather than reinventing player management.

## Problem Details & Exact Code Locations
- File: [`src/features/party/PartyLobby.tsx:1-623`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/features/party/PartyLobby.tsx#L1)
- Mixes network synchronization calls with DOM styling and layout rendering.

## Dependencies & Preconditions
- **Dependencies:** None. Can be worked on in parallel.

## Step-by-Step Implementation Instructions
1. Audit reuse of `src/modules/player-management`:
   - Check if `<PlayerManagerCard />` or `useLobbyPlayers` can handle the player roster instead of redundant inline lobby logic.
2. Extract party lobby lifecycle hook:
   Create `src/features/party/hooks/usePartyLobbyController.ts`
   - Encapsulates room state, host checks, player joining/leaving events, and game launching.
3. Extract sub-components under `src/features/party/components/`:
   - `PartyRoomHeader.tsx` (room code, status badge, copy link button)
   - `PartyGamePicker.tsx` (grid of available party games with launch buttons)
   - `PartyShareModal.tsx` (delegates to shared `ShareSessionLinksDialog` from `src/modules/sharing`)
4. Refactor `PartyLobby.tsx` to compose these pieces (< 180 lines).

## Affected Files
- `src/features/party/PartyLobby.tsx`
- `src/features/party/hooks/usePartyLobbyController.ts` (new)
- `src/features/party/components/PartyRoomHeader.tsx` (new)
- `src/features/party/components/PartyGamePicker.tsx` (new)

## Acceptance Criteria & Verification
- [ ] `PartyLobby.tsx` is under 200 lines.
- [ ] Party creation, player joining, QR sharing, and game launching work seamlessly.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
