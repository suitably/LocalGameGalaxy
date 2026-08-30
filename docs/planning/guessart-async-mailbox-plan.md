# GuessArt Store-and-Forward Async Mailbox Implementation Plan

## Goal Description
Provide true, serverless asynchronous multiplayer for GuessArt with minimal server footprint and auto-cleanup:
1. **Store-and-Forward Ephemeral Mailbox (MQTT Retained + Auto-Delete)**:
   - When a player submits a drawing or a guess, the turn payload (compressed with LZ-string) is published as a retained message to topic `lgg/guessart/{gameId}` on secure public MQTT brokers (e.g. HiveMQ / EMQX over WSS).
   - When the other player opens the game or has the tab open in the background, the broker immediately delivers the retained message.
   - Upon pickup, the receiver imports the full game snapshot & drawing into local IndexedDB and publishes an empty retained message to immediately purge the server cache (0 bytes leftover).
2. **One-Time Share Link & URL State Fallback**:
   - Sharing a game link (`?gameId=UUID&data=...`) embeds the initial/latest snapshot so even if network relays are completely blocked, opening the link directly unpacks the game into the recipient's local IndexedDB.
   - After joining once, players never need to share new links manually; all further turns sync automatically via the mailbox.
3. **Turn Notifications**:
   - Display a browser notification when a new turn arrives ("Du bist dran zum Raten / Zeichnen!").

## Proposed Changes

### 1. Mailbox Service (`src/games/guessart/logic/mailboxService.ts`)
- Connects to secure WebSocket MQTT broker (`wss://broker.hivemq.com:8884/mqtt` with fallback to `wss://broker.emqx.io:8084/mqtt`).
- `publishGameTurn(gameId: string, snapshot: any)`: Compresses JSON with `lz-string` and publishes with `retain: true, qos: 1`.
- `subscribeGameTurn(gameId: string, onReceive: (snapshot: any) => Promise<void>)`: Subscribes to topic, on message unpacks and calls handler, then publishes `{}` with `retain: true` to clear the broker cache.
- `closeMailbox(gameId?: string)`: Cleanly disconnects and frees resources.

### 2. Integration in `useGuessArtGame.ts` & `GuessArtGame.tsx`
- In `useGuessArtGame.ts`:
  - Whenever `submitDrawing`, `submitGuess`, or `selectWord` finishes, call `publishGameTurn(gameId, fullSnapshot)`.
  - Listen for remote updates via `subscribeGameTurn(gameId, ...)` and merge changes into IndexedDB / state.
- In `GuessArtGame.tsx`:
  - When loading from URL (`?gameId=UUID` or `?data=...`), if payload is present in URL, immediately import into local IndexedDB.
  - Generate share links containing both `gameId` and the initial compressed state fallback.

### 3. Local Engine & Repository Support (`src/games/guessart/logic/`)
- Ensure `LocalGameEngine.importRemoteSnapshot(snapshot)` safely upserts the remote game and round records into IndexedDB without race conditions.

## Verification Plan
1. **Unit Tests**: Run `npm test` (`vitest run`) to verify local engine, diffing, and snapshot logic.
2. **ESLint**: Run `npm run lint` (0 errors).
3. **Build**: Run `npm run build` (`tsc -b && vite build`) for clean compilation.
4. **Functional Testing**: Test publishing and receiving turn snapshots via the mailbox and URL unpack.
