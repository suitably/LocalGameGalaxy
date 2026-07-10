---
title: "[MEDIUM] Missing Sung Segments History Synced to TV Mode rendering Empty Visual trails"
severity: medium
type: reliability-bug
domain: TV Mode Sync
lens: architecture/api-contract
labels:
  - "audit:architecture/api-contract"
  - "bug"
---

## Summary
The Host application broadcasts game updates to the TV screen via a throttled `GAME_STATE` message (which triggers the `melodiq_tv_game_state` event on the TV). In `MelodiqSession.tsx`, `getGameState()` compiles this state, including each player's `activeSegments`. However, it does not include the player's full `segmentsRef` (which stores the complete history of notes already sung). Furthermore, `usePassiveSync.ts` on the TV side never updates `rt.segmentsRef.current`, leaving it as an empty object. Because `PitchVisualizer.tsx` draws the history of what has been sung from `sungSegmentsRef` (which points to `segmentsRef`), the TV screen never shows the colored filled blocks representing the history of sung notes.

## Impact
This degrades the visual quality of the TV screen rendering. While the active cursor moves up and down correctly, the TV never displays the visual trail (curves/colored blocks) of notes that players have sung. This makes the TV mode display look incomplete and less interactive compared to the Host UI.

## Evidence
In [MelodiqSession.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx#L345-L362), `getGameState` exports the state to be broadcast:
```typescript
        getGameState: () => ({
            isPlaying,
            isFinished,
            isPausedForScore,
            players: playersRef.current.map(p => ({
                config: p.config,
                id: p.config.id,
                name: p.config.name,
                hue: p.config.hue,
                score: p.score,
                trackScores: p.trackScores,
                currentPitch: p.pitchRef.current,
                activeSegments: p.activeSegments,
                combo: p.combo,
                lastHit: p.lastHit
            })),
            currentTime: audioRef.current?.currentTime || 0
        })
```
Note that `segmentsRef.current` is not exported here.

In [usePassiveSync.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/hooks/usePassiveSync.ts#L63-L82), the state update handler applies the incoming properties to the `PlayerRuntime` instances on the TV:
```typescript
            remotePlayers.forEach((pState, idx) => {
                const rt = playersRef.current?.[idx];
                if (rt) {
                    rt.pitchRef.current = pState.currentPitch;
                    rt.activeSegments = pState.activeSegments;
                    rt.trackScores = pState.trackScores;
                    rt.score = pState.score;
                    rt.combo = pState.combo;

                    if (pState.lastHit && (!rt.lastHit || pState.lastHit.timestamp > rt.lastHit.timestamp)) {
                        rt.lastHit = pState.lastHit;
                        scoreDisplayRef.current?.triggerHit(
                            pState.id,
                            pState.lastHit.rating,
                            pState.combo,
                            pState.lastHit.score
                        );
                    }
                }
            });
```
It updates `rt.activeSegments`, but leaves `rt.segmentsRef.current` completely untouched.

In [PitchVisualizer.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/PitchVisualizer.tsx#L240), the visualizer gets the history from the ref:
```typescript
            const sungSegmentsRecord = latestSungSegmentsRef.current.current || {};
```
Because the ref is empty, `sungSegmentsRecord` is `{}` and no historical segments are drawn.

## Recommended Fix
In `usePassiveSync.ts`, update `rt.segmentsRef.current` dynamically by adding/updating segments from `pState.activeSegments`.

Update the loop in `usePassiveSync.ts` to reconstruct the segments history:
```typescript
            remotePlayers.forEach((pState, idx) => {
                const rt = playersRef.current?.[idx];
                if (rt) {
                    rt.pitchRef.current = pState.currentPitch;
                    rt.activeSegments = pState.activeSegments;
                    rt.trackScores = pState.trackScores;
                    rt.score = pState.score;
                    rt.combo = pState.combo;

                    // Reconstruct/update segments history from active segments on TV mode
                    const activeSeg = pState.activeSegments?.[rt.trackIndex];
                    if (activeSeg) {
                        const record = rt.segmentsRef.current;
                        if (record) {
                            if (!record[activeSeg.noteIndex]) record[activeSeg.noteIndex] = [];
                            const existing = record[activeSeg.noteIndex].find(s => s.startBeat === activeSeg.startBeat);
                            if (existing) {
                                existing.endBeat = activeSeg.endBeat;
                            } else {
                                record[activeSeg.noteIndex].push(activeSeg);
                            }
                        }
                    }
```

## References
- React refs and stable mutation behaviors
- Canvas rendering pipelines in web browsers

## Validation
- attacker_source — n/a
- missing_guard — missing state synchronization logic for the player's full `segmentsRef` history in `usePassiveSync`
- sink_effect — TV screen visualizer canvas does not fill sung notes, resulting in blank/empty historical visual feedback
- preconditions — Host must connect to the TV Mode and a player must sing.
- proof_anchors — src/games/melodiq/gameplay/hooks/usePassiveSync.ts:63-82, src/games/melodiq/gameplay/MelodiqSession.tsx:345-362
- suggested_validation — grep -n "segmentsRef" src/games/melodiq/gameplay/hooks/usePassiveSync.ts
