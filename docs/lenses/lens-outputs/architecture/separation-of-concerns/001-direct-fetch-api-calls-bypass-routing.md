---
title: "[CRITICAL] Inline Fetch Calls Bypass WebRTC API Routing Abstraction"
severity: critical
type: reliability-bug
domain: Architecture
lens: separation-of-concerns
labels:
  - "audit:architecture/separation-of-concerns"
---

## Summary
Direct `fetch` API calls are used inside presentation components (`YouTubeSearchDialog.tsx`, `SongActionDialogs.tsx`, and `PlaybackManager.tsx`) to communicate with the external helper server, rather than utilizing the application's unified WebRTC-aware API layer (`melodiqFetch` defined in `src/games/melodiq/api/melodiqFetch.ts`).

## Impact
This creates a critical reliability issue for the application's WebRTC-based local multiplayer capability (Client Mode):
1. **Bypassed proxying/routing**: In client mode, secondary devices (e.g., player smartphones) connect to the host session over a WebRTC data channel. They do not have direct network access to the host's REST helper server (often hosted on localhost or a private local IP). Bypassing `melodiqFetch` means these clients attempt to hit the helper server directly, causing network failures for essential gameplay features like YouTube searching, video downloading, auto-syncing, and song management.
2. **Implementation leakage**: UI components are coupled to specific API endpoint URLs, authentication header structures, and error-handling routines.
3. **Redundant code**: Retrieval and sanitization of `melodiq_helper_url` and `melodiq_helper_token` from `localStorage` is duplicated across multiple component files.

## Evidence
- **YouTubeSearchDialog**: Direct REST fetch for searching YouTube videos.
  - [YouTubeSearchDialog.tsx:L87-89](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/YouTubeSearchDialog.tsx#L87-L89)
  ```typescript
  const res = await fetch(`${helperUrl}/api/youtube/search?q=${encodeURIComponent(q)}&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
  });
  ```
- **SongActionDialogs**: Direct REST fetches for deleting songs, starting USDB downloads, and initiating AI audio separator jobs.
  - [SongActionDialogs.tsx:L86-89](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/SongActionDialogs.tsx#L86-L89)
  ```typescript
  const res = await fetch(`${helperUrl}/api/songs/${selectedSongForQueue.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
  });
  ```
  - [SongActionDialogs.tsx:L110-115](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/SongActionDialogs.tsx#L110-L115)
  ```typescript
  const res = await fetch(`${helperUrl}/api/usdb/download`, {
      method: 'POST',
      headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      },
  ```
  - [SongActionDialogs.tsx:L155-160](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/SongActionDialogs.tsx#L155-L160)
  ```typescript
  const res = await fetch(`${helperUrl}/api/separator/job`, {
      method: 'POST',
      headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      },
  ```
- **PlaybackManager**: Direct REST fetches to trigger and poll AI auto-sync separator jobs.
  - [PlaybackManager.tsx:L110-115](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/PlaybackManager.tsx#L110-L115)
  ```typescript
  const res = await fetch(`${helperUrl}/api/separator/job`, {
      method: 'POST',
      headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      },
  ```
  - [PlaybackManager.tsx:L154-156](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/PlaybackManager.tsx#L154-L156)
  ```typescript
  const res = await fetch(`${helperUrl}/api/separator/status/${syncJobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
  });
  ```

## Recommended Fix
1. Replace all direct browser `fetch` calls in the affected files with calls to `melodiqFetch`.
2. Clean up redundant `localStorage` reads (`melodiq_helper_url`, `melodiq_helper_token`) and request header assemblies, as `melodiqFetch` handles these automatically.
3. Extract these API queries into custom hooks or services (e.g., `useSongSearch`, `useAutoSync`) to isolate the presentation components from network protocols entirely.

Example refactoring for `YouTubeSearchDialog.tsx`:
```typescript
import { melodiqFetch } from '../api/melodiqFetch';

// ...
try {
    const data = await melodiqFetch(`/api/youtube/search?q=${encodeURIComponent(q)}&limit=5`);
    setResults(data);
} catch (err: any) {
    setError(err.message);
}
```

## References
- React Architecture Best Practices: Separation of Concerns (Presentation vs. Network Layer)
- Project Guidelines on Single Responsibility Principle (SRP) in [AGENTS.md](file:///home/deck/Projects/LocalGameGalaxy/AGENTS.md)

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: Application is running in Client Mode with secondary devices attempting to perform YouTube searches, song deletions, or auto-sync operations.
- proof_anchors:
  - `src/games/melodiq/components/YouTubeSearchDialog.tsx:87`
  - `src/games/melodiq/components/SongActionDialogs.tsx:86`
  - `src/games/melodiq/components/PlaybackManager.tsx:110`
- suggested_validation: grep -rn "fetch(\`\${helperUrl}" src/games/melodiq/components/
