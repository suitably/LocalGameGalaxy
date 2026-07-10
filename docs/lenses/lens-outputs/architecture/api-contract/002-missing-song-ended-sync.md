---
title: "[HIGH] Missing SONG_ENDED Sync Signal from TV Mode to Host Leading to Broken Queue Autoplay"
severity: high
type: reliability-bug
domain: TV Mode Sync
lens: architecture/api-contract
labels:
  - "audit:architecture/api-contract"
  - "bug"
---

## Summary
The Host application implements an autoplay/skip queue mechanism that plays the next song in the queue when the currently playing song ends on the TV screen. This is managed via `useMelodiqGlobalEvents.tsx` by listening for the `SONG_ENDED` event on the `melodiq_tv_control` broadcast channel. However, neither `MelodiqTV.tsx` nor the session termination hook `useSessionEnd.ts` ever transmits the `SONG_ENDED` event back to the Host. When a song finishes playing on the TV Mode, the session on the TV ends, but the Host is left waiting indefinitely in a muted/paused playback control state.

## Impact
This breaks the core integration/communication flow of the local multiplayer karaoke mode. Autoplay is completely non-functional when using TV Mode, requiring manual user intervention on the Host machine to skip/start every song, even if there are items queued.

## Evidence
In [useMelodiqGlobalEvents.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useMelodiqGlobalEvents.tsx#L53-L60), the host expects the `SONG_ENDED` event to automatically play the next song:
```typescript
        } else if (lastEvent.type === 'SONG_ENDED') {
            processedEventRef.current = lastEvent.timestamp;
            setRemoteSong(null);
            const nextItem = popNext();
            if (nextItem) {
                console.log('TV Song Ended. Playing next from queue:', nextItem.song.title);
                handleSelectSongRef.current(nextItem.song, true, nextItem.participants);
            }
        }
```

However, a grep search for `SONG_ENDED` across the codebase reveals that this event is never published or dispatched by `MelodiqTV.tsx` or `useSessionEnd.ts`:
```bash
grep -r "SONG_ENDED" src/
```
Output shows that it is only mentioned in:
- `src/games/melodiq/hooks/useTVMode.ts` (defining the case block)
- `src/games/melodiq/hooks/useMelodiqGlobalEvents.tsx` (handling it)
No publishing code exists.

## Recommended Fix
Update `useSessionEnd.ts` to accept an `isTVMode?: boolean` prop and transmit the `SONG_ENDED` signal to the host via the `BroadcastChannel` or custom presentation connection when a song finishes on the TV.

1. Update `UseSessionEndProps` in `useSessionEnd.ts` to include `isTVMode`:
```typescript
interface UseSessionEndProps {
    playersRef: React.RefObject<PlayerRuntime[]>;
    song: Song;
    setResults: React.Dispatch<React.SetStateAction<any[]>>;
    setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isTVMode?: boolean;
}
```

2. Inside `handleSongEnd` in `useSessionEnd.ts`, post the message:
```typescript
        if (isTVMode) {
            try {
                const channel = new BroadcastChannel('melodiq_tv_control');
                channel.postMessage({ type: 'SONG_ENDED' });
                channel.close();
            } catch (e) {
                console.error('Failed to post SONG_ENDED event to broadcast channel:', e);
            }
        }
```

3. Pass `isTVMode` when instantiating `useSessionEnd` in `MelodiqSession.tsx`:
```typescript
    const { handleSongEnd: handleSongEndBound } = useSessionEnd({
        playersRef, song, setResults, setIsFinished, setIsPlaying, videoRef, isTVMode
    });
```

## References
- BroadcastChannel API specifications for same-origin browser contexts
- Presentation API receiver/controller messaging standards

## Validation
- attacker_source — n/a
- missing_guard — absence of event propagation (sender) for the `SONG_ENDED` state change in `useSessionEnd` when running in TV mode
- sink_effect — queue auto-advancement hangs indefinitely, keeping the Host in a waiting state
- preconditions — Host must connect to the TV Mode (via BroadcastChannel or Presentation API), have a song in the queue, start playing a song, and wait for it to end
- proof_anchors — src/games/melodiq/hooks/useMelodiqGlobalEvents.tsx:53-60, src/games/melodiq/gameplay/hooks/useSessionEnd.ts:23-98
- suggested_validation — grep -rn "SONG_ENDED" src/
