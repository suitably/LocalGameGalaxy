# TV Song End Fix Plan [ID: PLAN-TV-SONG-END-FIX-001]

Fix the TV Mode integration by notifying the host machine when a song finishes on the TV.

## Goal Description
When a song finishes playing on the TV Mode, the session on the TV ends, but the Host is left waiting indefinitely in a muted/paused playback control state. Autoplay is completely non-functional when using TV Mode, requiring manual user intervention on the Host machine to skip/start every song.
The goal is to update the session end sequence so that when running in TV Mode, the TV sends a `SONG_ENDED` signal to the Host via `BroadcastChannel` and `PresentationConnection`. This will allow the Host to automatically advance to the next song in the queue.

## Proposed Changes

### Gameplay hooks
#### [MODIFY] [src/games/melodiq/gameplay/hooks/useSessionEnd.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/hooks/useSessionEnd.ts)
- Accept `isTVMode?: boolean` in `UseSessionEndProps`.
- Destructure `isTVMode` in the hook.
- Inside `handleSongEnd`, if `isTVMode` is true:
  - Broadcast `SONG_ENDED` event using `BroadcastChannel('melodiq_tv_control')`.
  - Send the same message to all active `PresentationConnection`s of `navigator.presentation.receiver` if present.

### MelodiqSession component
#### [MODIFY] [src/games/melodiq/gameplay/MelodiqSession.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx)
- Pass `isTVMode` to both calls/instantiations of `useSessionEnd`.

## Verification Plan

### Automated Verification
- Run `npm run lint` and `npm run build` to verify there are no TypeScript or bundling compiler errors.

### Manual Verification
- Verify that `SONG_ENDED` is posted when `handleSongEnd` runs with `isTVMode === true`.
