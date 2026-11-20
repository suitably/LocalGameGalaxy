## Context & Problem

`src/features/party/PartyLobby.tsx` is the single largest component in the entire codebase at **615 lines**. It is an archetypal God Component combining:

1. WebRTC / room connection lifecycle and peer discovery
2. Player roster management (joining, leaving, kicking, host assignment)
3. Share links, room code copying, and QR code generation
4. Party game catalog browsing and game launch dispatch
5. Host settings, snackbars, and chat status

Per `AGENTS.md` (Section 3.1), components must strictly remain under 250 lines (orchestrators target < 160 lines).

## Branch

`refactor/decompose-party-lobby`

## Target Files

- `src/features/party/PartyLobby.tsx` (Current: 615 lines, Target: < 180 lines)
- New custom hook: `src/features/party/hooks/usePartyLobbyController.ts`
- New sub-component: `src/features/party/components/PartyRoomHeader.tsx` (Room code, badges, link copy, QR trigger)
- New sub-component: `src/features/party/components/PartyGamePicker.tsx` (Game catalogue grid, selection, launch action)

## Implementation Steps

1. **Extract Hook (`usePartyLobbyController.ts`)**:
   - Extract room state, host determination, player join/kick logic, and game launch handlers.
2. **Extract Presentation Sub-Components**:
   - `PartyRoomHeader.tsx`: Presentational header displaying connection status, room code, and share triggers.
   - `PartyGamePicker.tsx`: Presentational grid for game selection and launch confirmation.
3. **Reuse Existing Modules**:
   - Use `<ShareSessionLinksDialog>` from `src/modules/sharing` for QR code and join-link sharing instead of bespoke dialog rendering.
   - Ensure player roster presentation aligns with `src/modules/player-management`.
4. **Refactor `PartyLobby.tsx` Orchestrator**:
   - Compose the extracted hook and sub-components.
   - Keep file size strictly under 180 lines.

## Acceptance Criteria

- [x] `PartyLobby.tsx` is under 200 lines (96 after the 2026-10-22 split).
- [x] `npm run check:budget` passes cleanly (baseline entry removed).
- [ ] Party creation, player joining, QR sharing, and game launching all work smoothly.
- [ ] Zero usage of `any`.
- [ ] All user-facing strings use `t('key')`.

## Verification

```bash
npm run check:budget
npm run check:architecture:diff
npm run lint
npm test
```
