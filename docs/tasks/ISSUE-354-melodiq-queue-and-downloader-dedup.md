## Context & Problem

In Melodiq, `useQueue.ts` (415 lines) and `useSongDownloader.ts` have accumulated severe duplication and untyped code:

1. `useQueue.ts` lines 152–168 (`addToQueue`) and lines 249–265 (`addNext`) contain an identical 17-line clone that enriches active sessions and profiles (`enrichedSession`).
2. `useSongDownloader.ts` contains duplicate `POST /api/usdb/download` request calls between `handleDownloadOnly` and `handleDownloadAndQueue`, uses `any` throughout, and swallows errors silently with `console.error` without user feedback.

## Branch

`refactor/melodiq-queue-downloader-dry`

## Target Files

- `src/games/melodiq/hooks/useQueue.ts`
- `src/games/melodiq/hooks/useSongDownloader.ts`
- New helper: `src/games/melodiq/logic/queueParticipantUtils.ts` (or pure functions in `useQueue.ts`)
- Associated unit tests: `src/games/melodiq/logic/queueParticipantUtils.test.ts`

## Implementation Steps

1. **Deduplicate `useQueue.ts`**:
   - Extract the participant enrichment logic into a pure, testable function `enrichQueueParticipants(activeSession: unknown[], storedProfiles: MelodiqProfile[]): MelodiqParticipant[]`.
   - Add unit tests for `enrichQueueParticipants` verifying bot handling, missing profile fallback, and remote flags.
   - Reuse `enrichQueueParticipants` across both `addToQueue` and `addNext`.
2. **Refactor & Type `useSongDownloader.ts`**:
   - Replace all `any` types with strict types (`UsdbSongItem`, `SongMeta`).
   - Extract a single reusable async helper `triggerSongDownload(song: UsdbSongItem, videoMode?: string): Promise<string[] | null>`.
   - Implement both `handleDownloadOnly` and `handleDownloadAndQueue` using this helper.
   - When download fails or succeeds, emit user feedback via `setFeedbackMessage` (including error states).

## Acceptance Criteria

- [ ] Zero code clones between `addToQueue` and `addNext` (`npm run check:duplicates` passes).
- [ ] Zero `any` types in `useSongDownloader.ts`.
- [ ] Unit tests for participant enrichment pass.
- [ ] Queue functionality remains intact (reorder, add, remove, remote sync).

## Verification

```bash
npm run check:duplicates
npm test
npm run check:architecture:diff
npm run lint
```
