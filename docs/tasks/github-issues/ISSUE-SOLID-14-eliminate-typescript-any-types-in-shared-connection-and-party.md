---
title: "[TypeScript][Type-Safety] Eliminate any types in shared Connection, Party, and Imposter logic"
labels: ["typescript", "type-safety", "connection", "party", "priority:medium"]
assignees: []
---

## Summary
Several shared and game-level modules utilize the `any` type in method signatures, state objects, and catch blocks.
Per `AGENTS.md` (Section 4.6), typed interfaces and discriminated unions must be used to ensure compiler safety across modules.

## Problem Details & Exact Code Locations
1. `src/components/connection/DeviceConnection.tsx`:
   - Line 14: `peers: any[]`
   - Line 34: `renderPeerExtra?: (peer: any) => React.ReactNode`
   - Line 221: `connectedPreviewPeers.map((peer: any) => ...)`
2. `src/components/connection/QRScannerDialog.tsx`:
   - Line 70: `} catch (err: any) {`
3. `src/components/connection/ServerConnection.tsx`:
   - Line 128: `} catch (err: any) {`
4. `src/features/party/logic/universalPartyManager.ts`:
   - Line 276: `mailboxService.subscribeToGame(topic, async (incoming: any) => {`
   - Line 376: `state as any`
5. `src/features/settings/settingsNav.ts`:
   - Line 26: `locationState: any`
6. `src/games/imposter/logic/imposterRepository.ts`:
   - Line 23: `export const seedCategories = async (categories: any[]): Promise<any> => {`
   - Line 27: `export const seedWordPairs = async (pairs: any[]): Promise<any> => {`

## Dependencies & Preconditions
- **Dependencies:** None. Can be worked on in parallel.

## Step-by-Step Implementation Instructions
1. In `src/components/connection/DeviceConnection.tsx`:
   - Define or import `WebRTCPeerInfo` or `ConnectedPeer` type representing connected peer instances.
   - Replace `peers: any[]` and `peer: any` with the strongly typed interface.
2. In `QRScannerDialog.tsx` and `ServerConnection.tsx`:
   - Replace `catch (err: any)` with `catch (err: unknown)` and extract error message safely via `err instanceof Error ? err.message : String(err)`.
3. In `src/features/party/logic/universalPartyManager.ts`:
   - Define a discriminated union for party incoming messages (e.g. `PartySyncEnvelope`).
   - Replace `incoming: any` with this union.
4. In `src/features/settings/settingsNav.ts`:
   - Type `locationState` as `Record<string, unknown> | null | undefined`.
5. In `src/games/imposter/logic/imposterRepository.ts`:
   - Import `Category` and `WordPair` from `./types.ts` and use them in `seedCategories` and `seedWordPairs`.

## Affected Files
- `src/components/connection/DeviceConnection.tsx`
- `src/components/connection/QRScannerDialog.tsx`
- `src/components/connection/ServerConnection.tsx`
- `src/features/party/logic/universalPartyManager.ts`
- `src/features/settings/settingsNav.ts`
- `src/games/imposter/logic/imposterRepository.ts`

## Acceptance Criteria & Verification
- [ ] No `: any` in the affected files.
- [ ] Verification command:
  ```bash
  grep -rn ": any\b" src/components/connection/ src/features/party/ src/features/settings/ src/games/imposter/
  ```
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
