# GuessArt Store-and-Forward Async Mailbox Walkthrough

## Summary of Changes
Implemented a resilient Store-and-Forward Async Mailbox architecture for GuessArt that allows asynchronous turn-based play across multiple devices without requiring users to be simultaneously online or constantly share new links:

1. **Ephemeral MQTT Mailbox (`src/games/guessart/logic/mailboxService.ts`)**:
   - Uses secure WebSocket MQTT brokers (`wss://broker.hivemq.com:8884/mqtt` / `wss://broker.emqx.io:8084/mqtt`).
   - Publishes turn snapshots compressed with `lz-string` as retained messages (`retain: true`, `qos: 1`).
   - Receiver subscribes to `lgg/guessart/v1/{gameId}`. Upon receiving a turn, the snapshot is unpacked, saved to local IndexedDB, and an empty message is immediately published to purge the broker's cache (Zero leftover server footprint).
2. **One-Time Share Link & URL State Fallback**:
   - `GameHeader.tsx` embeds the initial game snapshot in the share URL (`&data=...`).
   - When opened on a new device, `GuessArtGame.tsx` automatically decompresses the snapshot and imports it into IndexedDB, establishing the local game record.
   - After joining once, all subsequent rounds and turns synchronize automatically via the background mailbox.
3. **Engine & Hook Integration**:
   - `LocalGameEngine.importSnapshot` safely upserts remote games and rounds in IndexedDB.
   - `useGuessArtGame` automatically broadcasts state after word selection, drawing submission, and guesses.

## Verification Results
- **Vitest Unit Tests**: `17/17 tests passing` (`npm test`)
- **ESLint**: `0 errors` (`npm run lint`)
- **TypeScript & Vite Build**: Clean build with code 0 (`npm run build`)
