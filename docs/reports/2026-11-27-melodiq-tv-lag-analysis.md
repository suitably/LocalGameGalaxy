---
type: Report
title: 'Melodiq TV: why the TV lags and stutters'
description: 'Code analysis of the host → TV sync path in Melodiq (GAME_STATE stream, passive session, drift correction, YouTube background): ranked causes of lag and stutter with the fix for each.'
tags: [melodiq, tv, sync, performance, youtube, presentation-api]
status: draft
generated:
  at: 2026-11-27T23:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-27
  method: 'Code read with grep/sed (useScoringEngine.ts, usePlaybackReporting.ts, useHostGameUpdate.ts, useTVMode.ts, useTVReceiver.ts, usePassiveSync.ts, useLocalMediaSync.ts, createYouTubeVideoAdapter.ts, PersistentSessionLayer.tsx, mediaDrift.ts). Not measured: no profiler run, the sizes below are estimates.'
sources:
  - 'src/games/melodiq/gameplay/hooks/useScoringEngine.ts'
  - 'src/games/melodiq/gameplay/hooks/usePassiveSync.ts'
---

# Melodiq TV: why the TV lags and stutters

**Short answer:** the async transport itself (BroadcastChannel, PresentationConnection, WebRTC) is not the problem; its latency is a few ms and `remoteClock.ts` already filters jitter. The lag comes from **how much** is synced and **how often**, and from drift corrections that the YouTube player cannot carry out. All findings are from reading the code; nothing was profiled.

## How the stream works today

1. The host's scoring loop runs on every animation frame (`useScoringEngine.ts`, `updateLoop`) and calls `onPlaybackUpdate` with the full player state, including `sungSegments` (every segment sung so far).
2. `usePlaybackReporting.handlePlaybackUpdate` → `useHostGameUpdate` → `useTVMode.sendGameUpdate` (throttled to 15 ms, i.e. ~60/s) → `sendMessage('GAME_STATE')`: once on the BroadcastChannel (structured clone) **and** once as `JSON.stringify` over the PresentationConnection. The same state goes to every phone over WebRTC every 50 ms.
3. The TV (`useTVReceiver`) parses it, calls `setPassiveState(state)` **and** dispatches `melodiq_tv_game_state`; `usePassiveSync` applies it (scores, segments, clock, drift correction).

## Causes, ranked by expected impact

| #   | Cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Effect                                                                                      | Fix                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The payload grows over the song.** `sungSegments` holds every segment of every player from the start (`useScoringEngine.ts` pushes one per hit note) and is sent in full ~60×/s. Estimate: a few hundred segments × ~80 bytes × players → tens of KB per message, several MB/s of JSON at the end of a song, stringified on the host and parsed on the TV each time (plus 20×/s per phone over WebRTC).                                                                                                                     | Lag **increases during the song**; worst near the end, with more singers and on weak TVs.   | Send only changes: the segment(s) touched since the last message (or the active segment plus newly closed ones); the TV appends. Full snapshot only on join/resync. Limit `GAME_STATE` to ~20–30/s for the TV. |
| 2   | **The TV re-renders the whole session ~60×/s.** `useTVReceiver` calls `setPassiveState` on every `GAME_STATE`; `MelodiqTV` passes it to `MelodiqSession`, so the whole tree (stage, lyrics, visualizer) renders per message, although `usePassiveSync` already gets the data through the window event and refs.                                                                                                                                                                                                               | Dropped frames on the TV, stutter in lyrics and pitch bars.                                 | Keep the high-frequency state out of React: store it in a ref, call `setPassiveState` only when a rendered field changes (`isFinished`, `isPausedForScore`, lyrics settings, consent, roster).                 |
| 3   | **YouTube drift correction cannot work.** `useLocalMediaSync` corrects video drift with `playbackRate` 0.95/1.05 (`VIDEO_DRIFT_POLICY`), but the YouTube adapter rounds to the supported rates `[0.25 … 2]`, i.e. back to 1 (`createYouTubeVideoAdapter.ts`). The rate never changes, the drift grows to `seekAboveSec` (0.5 s) and is fixed with a `seekTo`, which rebuffers. The setter is also called every frame, because the getter keeps returning 1 ≠ 1.05: one `setPlaybackRate` postMessage to the iframe per frame. | Periodic video jumps/rebuffering on the TV (and the host); iframe IPC load.                 | For YouTube: no rate correction, only seeks with a larger threshold (~0.3–0.5 s) and a cooldown; skip the setter when the rounded rate equals the current one.                                                 |
| 4   | **Every follower seek also seeks the video.** `usePassiveSync.seekAll` sets `currentTime` on audio **and** video when the TV's audio is > 0.25 s off the host clock. For YouTube this is a `seekTo` → rebuffer, though the video only needs to follow the TV's own audio.                                                                                                                                                                                                                                                     | Video stutter after every audio resync.                                                     | Seek only the audio in `seekAll`; let `useLocalMediaSync` move the video after the audio.                                                                                                                      |
| 5   | **The host keeps rendering the hidden session.** With a TV, the host session stays mounted with `visibility: hidden` (`PersistentSessionLayer.tsx`), still decodes the background video (incl. the YouTube iframe) and draws the stage on every frame, while the host's audio is muted. With a popup TV window both run on the **same machine**, so video is decoded twice.                                                                                                                                                   | CPU/GPU load on the host → its rAF loop slows → `GAME_STATE` arrives irregularly at the TV. | With `hasTv`, the host does not mount the background video / stage visuals; only audio clock + scoring keep running.                                                                                           |
| 6   | **The TV's audio follows a remote clock with seeks.** `FOLLOWER_DRIFT_POLICY` seeks above 0.25 s (cooldown 1.5 s). After a host hiccup (tab in background, GC pause from #1) the TV seeks its audio — audible as a jump.                                                                                                                                                                                                                                                                                                      | Audible jumps, mostly as a follow-on of #1 and #5.                                          | Goes away mostly with #1/#5; then consider a larger seek threshold for short spikes.                                                                                                                           |
| 7   | **Host loop in a background tab.** The loop is `requestAnimationFrame`; a hidden/minimized host tab gets no frames, so no `GAME_STATE` is sent and the TV freezes or resyncs with seeks.                                                                                                                                                                                                                                                                                                                                      | TV freezes while the host window is minimized or covered.                                   | Send the TV stream from a timer (or keep it on rAF but add a `setInterval` fallback when `document.hidden`).                                                                                                   |

## Not a cause

- **"Asynchronous" transport:** BroadcastChannel and PresentationConnection deliver in order with low latency; the TV derives a smooth host clock from the timestamps (`createRemoteClock`). Asynchrony adds a constant delay, which the drift policy absorbs. The problem is the volume per message and the work on both ends.

## Status

- #3 done: the YouTube adapter skips `setPlaybackRate` when the rounded rate is unchanged (no iframe call per frame); the drift is then fixed by seeks, at least 2 s apart (`useLocalMediaSync.ts`).
- #4 done: `usePassiveSync.seekAll` seeks audio and vocal stem only; the video follows the screen's own audio.
- #1 done: `useTVMode.sendGameUpdate` sends ~30/s (33 ms, play/stop changes never dropped; `createTvStateStream`) and encodes sung segments as deltas with a full keyframe every 2 s and on `TV_READY` / `PONG` (`logic/tvStateStream.ts`, `createSegmentDeltaEncoder`); `usePassiveSync` merges them (`applySungSegments`). Phones still get the full state.
- #2 done: `useTVReceiver` dispatches every `GAME_STATE` as the window event but calls `setPassiveState` only when a rendered value changes or after 1 s (`shouldRenderTvState`).
- #7 done: `useScoringEngine` runs its loop from `startSteadyTicker` (33 ms) when the host gets no animation frame for 50 ms (minimized or covered window); one pending frame at most (`scheduleNextFrame`).
- Open: #5 (host keeps rendering the hidden session), #6 only if jumps remain.
- Related: `safePlay` and `handlePassiveUnblock` no longer wait for the video's `play()`, so audio, lyrics and scoring start without it.

## Suggested order

1. #3 + #4 (small, YouTube only, no protocol change).
2. #2 (TV only).
3. #1 (protocol change: delta segments; phones and TV).
4. #5, then #7.

Before #1, measure: log the `JSON.stringify(state).length` of `GAME_STATE` at the start and end of a song, and record a Performance profile on the TV.
