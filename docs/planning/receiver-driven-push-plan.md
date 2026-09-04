# Implementation Plan: Receiver-Driven Push Architecture [ID: PLAN-RECEIVER-PUSH-001]

## Goal Description
Shift from a strictly host-centric notification relay to a decentralized, receiver-driven architecture:
1. Prioritize each player's own configured notification relay and ntfy preferences.
2. If a remote player has no own backend (casual guest), automatically fall back to the host's game relay.
3. Automatically stamp player state with local device notification preferences upon claiming/joining a game.
4. Dispatch turn push notifications directly to the next player's target relay/ntfy topic.

## Proposed Changes

### 1. Types & Data Models (`pushTypes.ts`, `src/games/storyteller/types.ts`, `src/games/guessart/logic/types.ts`)
- Add `relayUrl?: string`, `ntfyTopic?: string`, and `notificationMethod?: NotificationMethod` to `StoryPlayer` and `PlayerIdentity`.
- Add `targetRelayUrl?: string` to `PushNotificationPayload`.

### 2. Relay Storage & Push Client (`gameRelayStorage.ts`, `pushClient.ts`)
- `gameRelayStorage.ts`:
  - Add `getEffectiveRelay(gameId: string, playerRelayUrl?: string): string | null`.
- `pushClient.ts`:
  - Support optional `targetRelayUrl` in `sendGamePushNotification` and `preferredRelayUrl` in `registerForGamePush`.
  - Prioritize receiver's target relay when dispatching turn notifications.

### 3. Storyteller & GuessArt Notification Services & Game Engines
- `storyteller/logic/notificationService.ts`:
  - Dispatch turn push using `nextPlayer.relayUrl || gameRelayStorage.getGameRelay(game.id)`.
- `guessart/hooks/useGuessArtGame.ts` & `storyteller/StorytellerGame.tsx`:
  - On URL join or local player claim, stamp player record with local device's `storage.getPushRelayUrl()` and `storage.getNotificationMethod()`.
  - Broadcast updated snapshot to sync player endpoints.

### 4. Internationalization & Documentation
- Document Receiver-Driven Push in `docs/tech/architecture.md`.
- Create verification walkthrough in `docs/verification/receiver-driven-push-walkthrough.md`.

## Verification Plan
1. Run `npm run lint` and `npm run build` to verify type safety and absence of regressions.
2. Verify player stamping logic and fallback resolution.
